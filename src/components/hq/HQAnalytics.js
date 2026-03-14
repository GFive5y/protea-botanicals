// src/components/hq/HQAnalytics.js
// v3.2 — March 2026
//
// CHANGES v3.2:
//   - FIX: Potential Margin now filters to finished_product category only.
//          Raw materials have cost_price but sell_price=0 → skewed negative margin.
//   - FIX: Active POs pipeline card uses p.po_status (workflow field) not p.status.
//          p.status is a secondary field; po_status is the source of truth.
//          Also excludes 'complete' (was missing from exclusion list).
//   - FIX: PO Pipeline in Supply Chain uses p.po_status throughout + shows 'complete' status.
//
// CHANGES v3.1:
//   - CRITICAL FIX: scans table → scan_logs (ScanResult v4.1 writes here)
//   - CRITICAL FIX: scan_date → scanned_at throughout
//   - CRITICAL FIX: Realtime subscription now on scan_logs table
//   - CRITICAL FIX: product_id → qr_code_id, source → qr_type
//   - Scans & Loyalty sub-tab: shows QR type, outcome, points, province
//   - Province breakdown + outcome breakdown added to Scans tab
//
// Sub-tabs: Overview · Supply Chain · Production · Distribution · Scans & Loyalty

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";

const C = {
  bg: "#faf9f6",
  primaryDark: "#1b4332",
  primaryMid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#888888",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  orange: "#e67e22",
  lightOrange: "#fef9f0",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  lightGreen: "#eafaf1",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};
const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  padding: "20px",
};
const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: "4px",
  fontFamily: F.body,
};
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "9px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: C.muted,
  borderBottom: `2px solid ${C.border}`,
  fontWeight: 500,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${C.border}`,
  color: C.text,
  verticalAlign: "middle",
  fontSize: "12px",
};
const CATEGORY_LABELS = {
  finished_product: "Finished Product",
  raw_material: "Raw Material",
  terpene: "Terpene",
  hardware: "Hardware",
  uncategorised: "Uncategorised",
};
const CATEGORY_COLORS = {
  finished_product: C.accent,
  raw_material: C.blue,
  terpene: "#9b6b9e",
  hardware: C.gold,
  uncategorised: C.muted,
};

export default function HQAnalytics() {
  const [subTab, setSubTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);
  const subscriptions = useRef([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = {};
      try {
        const r = await supabase
          .from("inventory_items")
          .select(
            "id,name,sku,category,unit,quantity_on_hand,reorder_level,cost_price,sell_price,is_active,supplier_id",
          );
        result.inventory = (r.data || []).filter((i) => i.is_active);
      } catch {
        result.inventory = [];
      }
      try {
        const r = await supabase
          .from("suppliers")
          .select("id,name,country,is_active");
        result.suppliers = (r.data || []).filter((s) => s.is_active);
      } catch {
        result.suppliers = [];
      }
      try {
        const r = await supabase
          .from("purchase_orders")
          .select(
            "id,po_number,supplier_id,po_status,status,subtotal,currency,order_date,received_date,created_at,purchase_order_items(*)",
          );
        result.purchaseOrders = r.data || [];
      } catch {
        result.purchaseOrders = [];
      }
      try {
        const r = await supabase
          .from("production_runs")
          .select(
            "id,run_number,batch_id,status,planned_units,actual_units,started_at,completed_at,notes,created_at,production_run_inputs(*)",
          );
        result.productionRuns = r.data || [];
      } catch (e) {
        console.warn("[HQAnalytics] production_runs:", e.message);
        result.productionRuns = [];
      }
      try {
        const r = await supabase
          .from("batches")
          .select("id,batch_number,product_name,product_type,status");
        result.batches = r.data || [];
      } catch {
        result.batches = [];
      }
      try {
        const r = await supabase
          .from("shipments")
          .select(
            "id,shipment_number,destination_name,status,courier,shipped_date,delivered_date,confirmed_date,estimated_arrival,created_at,shipment_items(*)",
          );
        result.shipments = r.data || [];
      } catch {
        result.shipments = [];
      }

      // FIXED v3.1: scan_logs with scanned_at
      try {
        const r = await supabase
          .from("scan_logs")
          .select(
            "id,qr_code_id,qr_code,user_id,scanned_at,points_awarded,scan_outcome,qr_type,campaign_name,ip_province,ip_city,device_type",
          )
          .order("scanned_at", { ascending: false });
        result.scans = r.data || [];
      } catch (e) {
        console.warn("[HQAnalytics] scan_logs:", e.message);
        result.scans = [];
      }

      try {
        const r = await supabase
          .from("user_profiles")
          .select("id,role,created_at");
        result.users = r.data || [];
      } catch {
        result.users = [];
      }
      try {
        const r = await supabase
          .from("loyalty_transactions")
          .select("points,transaction_type");
        result.loyalty = r.error ? [] : r.data || [];
      } catch {
        result.loyalty = [];
      }
      try {
        const r = await supabase
          .from("tenants")
          .select("id,name,type,is_active");
        result.tenants = r.data || [];
      } catch {
        result.tenants = [];
      }
      try {
        const r = await supabase
          .from("stock_movements")
          .select("id,item_id,quantity,movement_type,reference,created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        result.movements = r.data || [];
      } catch {
        result.movements = [];
      }

      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[HQAnalytics] Fatal:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // FIXED v3.1: subscribe to scan_logs
    const scanSub = supabase
      .channel("hq-scan-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scan_logs" },
        (payload) => {
          const n = payload.new;
          setLiveEvents((prev) =>
            [
              {
                type: "scan",
                icon: "📱",
                msg: `New scan · ${n.qr_type || "QR"} · ${n.ip_city || "—"}`,
                time: new Date(),
                id: n.id,
              },
              ...prev,
            ].slice(0, 10),
          );
          setData((prev) =>
            prev ? { ...prev, scans: [n, ...prev.scans] } : prev,
          );
          setLastUpdated(new Date());
        },
      )
      .subscribe();

    const shipSub = supabase
      .channel("hq-shipments")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shipments" },
        (payload) => {
          const n = payload.new;
          setLiveEvents((prev) =>
            [
              {
                type: "shipment",
                icon: "🚚",
                msg: `${n.shipment_number} → ${n.status}`,
                time: new Date(),
                id: n.id,
              },
              ...prev,
            ].slice(0, 10),
          );
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              shipments: prev.shipments.map((s) =>
                s.id === n.id ? { ...s, ...n } : s,
              ),
            };
          });
          setLastUpdated(new Date());
        },
      )
      .subscribe();

    const runSub = supabase
      .channel("hq-runs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_runs" },
        (payload) => {
          const n = payload.new || {};
          setLiveEvents((prev) =>
            [
              {
                type: "production",
                icon: "🔧",
                msg: `Run ${n.run_number || ""} → ${n.status || "updated"}`,
                time: new Date(),
                id: n.id,
              },
              ...prev,
            ].slice(0, 10),
          );
          setLastUpdated(new Date());
          supabase
            .from("production_runs")
            .select(
              "id,run_number,batch_id,status,planned_units,actual_units,started_at,completed_at,notes,created_at,production_run_inputs(*)",
            )
            .then(({ data: runs }) => {
              if (runs)
                setData((prev) =>
                  prev ? { ...prev, productionRuns: runs } : prev,
                );
            });
        },
      )
      .subscribe();

    subscriptions.current = [scanSub, shipSub, runSub];
    return () => {
      subscriptions.current.forEach((sub) => supabase.removeChannel(sub));
    };
  }, [fetchAll]);

  const SUB_TABS = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "supply", label: "Supply Chain", icon: "📦" },
    { id: "production", label: "Production", icon: "🔧" },
    { id: "distribution", label: "Distribution", icon: "🚚" },
    { id: "scans", label: "Scans & Loyalty", icon: "📱" },
  ];

  if (error)
    return (
      <div style={{ ...sCard, borderLeft: `3px solid ${C.red}` }}>
        <div style={sLabel}>Error</div>
        <p style={{ fontSize: "13px", color: C.red, margin: "8px 0 0" }}>
          {error}
        </p>
        <button
          onClick={fetchAll}
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            background: C.primaryDark,
            color: C.white,
            border: "none",
            borderRadius: "2px",
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );

  return (
    <div style={{ fontFamily: F.body }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2
            style={{
              fontFamily: F.heading,
              fontSize: "22px",
              fontWeight: 300,
              color: C.primaryDark,
              margin: 0,
            }}
          >
            HQ Analytics
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: C.accent,
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: C.muted,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Live
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: C.muted }}>
              Updated{" "}
              {lastUpdated.toLocaleTimeString("en-ZA", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={fetchAll}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: "2px",
              padding: "7px 14px",
              cursor: "pointer",
              fontFamily: F.body,
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {liveEvents.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: C.lightGreen,
            border: `1px solid ${C.accent}`,
            borderRadius: 2,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.primaryDark,
              marginBottom: 8,
            }}
          >
            🔴 Live Feed
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {liveEvents.slice(0, 5).map((ev, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: C.primaryDark,
                  background: C.white,
                  padding: "4px 10px",
                  borderRadius: 2,
                  border: `1px solid ${C.border}`,
                }}
              >
                {ev.icon} {ev.msg} ·{" "}
                <span style={{ color: C.muted }}>
                  {ev.time.toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
            {liveEvents.length > 5 && (
              <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>
                +{liveEvents.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "8px 16px",
              background: subTab === t.id ? C.primaryDark : C.white,
              color: subTab === t.id ? C.white : C.muted,
              border: `1px solid ${subTab === t.id ? C.primaryDark : C.border}`,
              borderRadius: "2px",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: F.body,
              fontWeight: subTab === t.id ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>📈</div>
          Loading analytics…
        </div>
      ) : data ? (
        <>
          {subTab === "overview" && <OverviewAnalytics data={data} />}
          {subTab === "supply" && <SupplyChainAnalytics data={data} />}
          {subTab === "production" && <ProductionAnalytics data={data} />}
          {subTab === "distribution" && <DistributionAnalytics data={data} />}
          {subTab === "scans" && <ScansAnalytics data={data} />}
        </>
      ) : null}

      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }`}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────
// OVERVIEW
// ───────────────────────────────────────────────────────
function OverviewAnalytics({ data }) {
  const inv = data.inventory;
  const runs = data.productionRuns;
  const shipments = data.shipments;

  // v3.2 FIX: Only finished_product items have a meaningful sell_price.
  // Raw materials / hardware have cost_price but sell_price=0 → -777% if included.
  const finishedInv = inv.filter((i) => i.category === "finished_product");
  const stockValue = finishedInv.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.sell_price || 0),
    0,
  );
  const stockCost = finishedInv.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.cost_price || 0),
    0,
  );
  const potentialMargin =
    stockValue > 0
      ? (((stockValue - stockCost) / stockValue) * 100).toFixed(1)
      : 0;

  // Full inv still used for low-stock counts etc.
  const lowStock = inv.filter(
    (i) => i.reorder_level > 0 && i.quantity_on_hand <= i.reorder_level,
  );
  const outOfStock = inv.filter((i) => i.quantity_on_hand <= 0);

  const completedRuns = runs.filter((r) => r.status === "completed");
  const activeRuns = runs.filter((r) => r.status === "in_progress");
  const totalUnits = completedRuns.reduce(
    (s, r) => s + (r.actual_units || 0),
    0,
  );
  const avgYield =
    completedRuns.length > 0
      ? (
          completedRuns.reduce(
            (s, r) =>
              s +
              (r.planned_units > 0
                ? (r.actual_units / r.planned_units) * 100
                : 0),
            0,
          ) / completedRuns.length
        ).toFixed(1)
      : "—";

  const delivered = shipments.filter((s) =>
    ["delivered", "confirmed"].includes(s.status),
  );
  const inTransit = shipments.filter((s) =>
    ["shipped", "in_transit"].includes(s.status),
  );
  const unitsShipped = shipments.reduce(
    (s, sh) =>
      s +
      (sh.shipment_items || []).reduce((is, i) => is + (i.quantity || 0), 0),
    0,
  );

  const now = new Date();
  // FIXED v3.1: scanned_at
  const scans7d = data.scans.filter(
    (s) => new Date(s.scanned_at) >= new Date(now - 7 * 86400000),
  ).length;
  const scans30d = data.scans.filter(
    (s) => new Date(s.scanned_at) >= new Date(now - 30 * 86400000),
  ).length;
  const totalPoints = data.loyalty
    .filter((t) =>
      ["EARNED", "earned", "EARNED_POINTS", "SCAN"].includes(
        t.transaction_type,
      ),
    )
    .reduce((s, t) => s + (t.points || 0), 0);
  const customers = data.users.filter((u) => u.role === "customer").length;

  const alerts = [];
  if (outOfStock.length > 0)
    alerts.push({
      level: "critical",
      icon: "🔴",
      msg: `${outOfStock.length} item${outOfStock.length > 1 ? "s" : ""} out of stock`,
    });
  if (lowStock.length > 0)
    alerts.push({
      level: "warning",
      icon: "🟡",
      msg: `${lowStock.length} item${lowStock.length > 1 ? "s" : ""} below reorder level`,
    });
  if (inTransit.length > 0)
    alerts.push({
      level: "info",
      icon: "🚚",
      msg: `${inTransit.length} shipment${inTransit.length > 1 ? "s" : ""} in transit`,
    });
  if (activeRuns.length > 0)
    alerts.push({
      level: "info",
      icon: "🔧",
      msg: `${activeRuns.length} run${activeRuns.length > 1 ? "s" : ""} in progress`,
    });
  const overdue = shipments.filter(
    (s) =>
      s.estimated_arrival &&
      !["delivered", "confirmed", "cancelled"].includes(s.status) &&
      new Date(s.estimated_arrival) < now,
  );
  if (overdue.length > 0)
    alerts.push({
      level: "critical",
      icon: "⚠",
      msg: `${overdue.length} shipment${overdue.length > 1 ? "s" : ""} overdue`,
    });

  const alertColors = { critical: C.red, warning: C.gold, info: C.blue };
  const alertBgs = {
    critical: C.lightRed,
    warning: "#fef9e7",
    info: C.lightBlue,
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {alerts.length > 0 && (
        <div style={{ ...sCard, borderLeft: `4px solid ${C.red}` }}>
          <div style={{ ...sLabel, color: C.red }}>
            ⚡ Command Centre — Live Alerts
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 10,
            }}
          >
            {alerts.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 14px",
                  borderRadius: 2,
                  background: alertBgs[a.level],
                  color: alertColors[a.level],
                  border: `1px solid ${alertColors[a.level]}40`,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {a.icon} {a.msg}
              </div>
            ))}
          </div>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "12px",
        }}
      >
        <KPI
          label="Finished Stock Value"
          value={`R${stockValue.toLocaleString()}`}
          color={C.primaryDark}
        />
        <KPI
          label="Finished Stock Cost"
          value={`R${stockCost.toLocaleString()}`}
          color={C.blue}
        />
        <KPI
          label="Potential Margin"
          value={`${potentialMargin}%`}
          color={C.accent}
          sub="finished goods only"
        />
        <KPI label="Active SKUs" value={inv.length} color={C.primaryMid} />
        <KPI
          label="Low Stock"
          value={lowStock.length}
          color={lowStock.length > 0 ? C.gold : C.accent}
        />
        <KPI
          label="Out of Stock"
          value={outOfStock.length}
          color={outOfStock.length > 0 ? C.red : C.accent}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "12px",
        }}
      >
        <KPI
          label="Runs Completed"
          value={completedRuns.length}
          color={C.accent}
        />
        <KPI
          label="Runs Active"
          value={activeRuns.length}
          color={activeRuns.length > 0 ? C.gold : C.muted}
        />
        <KPI
          label="Units Produced"
          value={totalUnits.toLocaleString()}
          color={C.primaryDark}
        />
        <KPI
          label="Avg Yield"
          value={avgYield !== "—" ? `${avgYield}%` : "—"}
          color={C.accent}
        />
        <KPI
          label="Shipments Delivered"
          value={delivered.length}
          color={C.accent}
        />
        <KPI
          label="Units Shipped"
          value={unitsShipped.toLocaleString()}
          color={C.primaryDark}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "12px",
        }}
      >
        <KPI label="Total Scans" value={data.scans.length} color={C.blue} />
        <KPI
          label="Scans (7d)"
          value={scans7d}
          color={C.accent}
          sub="last 7 days"
        />
        <KPI
          label="Scans (30d)"
          value={scans30d}
          color={C.blue}
          sub="last 30 days"
        />
        <KPI label="Customers" value={customers} color={C.primaryMid} />
        <KPI
          label="Points Issued"
          value={totalPoints.toLocaleString()}
          color={C.gold}
        />
        <KPI
          label="Suppliers"
          value={data.suppliers.length}
          color={C.primaryDark}
        />
      </div>
      <div style={sCard}>
        <div style={sLabel}>Supply Chain Pipeline — Live Status</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: "12px",
            marginTop: "16px",
          }}
        >
          <PipelineCard
            stage="Procure"
            icon="📋"
            color={C.blue}
            items={[
              {
                label: "Active POs",
                // v3.2 FIX: use po_status (workflow field), exclude complete + received + cancelled + draft
                value: data.purchaseOrders.filter(
                  (p) =>
                    !["received", "complete", "cancelled", "draft"].includes(
                      p.po_status,
                    ),
                ).length,
              },
              { label: "Suppliers", value: data.suppliers.length },
            ]}
          />
          <PipelineCard
            stage="Store"
            icon="📦"
            color={C.primaryMid}
            items={[
              { label: "SKUs", value: inv.length },
              { label: "Value", value: `R${stockValue.toLocaleString()}` },
            ]}
          />
          <PipelineCard
            stage="Produce"
            icon="🔧"
            color={C.gold}
            items={[
              { label: "Active", value: activeRuns.length },
              { label: "Done", value: completedRuns.length },
            ]}
          />
          <PipelineCard
            stage="Distribute"
            icon="🚚"
            color={C.accent}
            items={[
              { label: "In Transit", value: inTransit.length },
              { label: "Delivered", value: delivered.length },
            ]}
          />
          <PipelineCard
            stage="Scans"
            icon="📱"
            color={C.primaryDark}
            items={[
              { label: "Total", value: data.scans.length },
              { label: "7-day", value: scans7d },
            ]}
          />
        </div>
      </div>
      {data.movements?.length > 0 && (
        <div style={sCard}>
          <div style={sLabel}>Recent Stock Movements</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {["Date", "Type", "Qty", "Reference"].map((h) => (
                  <th key={h} style={sTh}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.movements.slice(0, 8).map((m) => (
                <tr key={m.id}>
                  <td style={sTd}>
                    {new Date(m.created_at).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td style={sTd}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 2,
                        background:
                          m.movement_type?.includes("out") ||
                          m.movement_type?.includes("Out")
                            ? "#fdf0ef"
                            : "#eafaf1",
                        color:
                          m.movement_type?.includes("out") ||
                          m.movement_type?.includes("Out")
                            ? C.red
                            : C.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontWeight: 600,
                      }}
                    >
                      {m.movement_type}
                    </span>
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontWeight: 600,
                      color: m.quantity < 0 ? C.red : C.accent,
                    }}
                  >
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: C.muted,
                    }}
                  >
                    {m.reference || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────
// SUPPLY CHAIN
// ───────────────────────────────────────────────────────
function SupplyChainAnalytics({ data }) {
  const inv = data.inventory;
  const pos = data.purchaseOrders;
  const categories = {};
  inv.forEach((i) => {
    const cat = i.category || "uncategorised";
    if (!categories[cat]) categories[cat] = { count: 0, value: 0, cost: 0 };
    categories[cat].count++;
    categories[cat].value += (i.quantity_on_hand || 0) * (i.sell_price || 0);
    categories[cat].cost += (i.quantity_on_hand || 0) * (i.cost_price || 0);
  });

  // v3.2 FIX: use po_status (the actual workflow field) not status (secondary field).
  const poStatuses = {};
  pos.forEach((p) => {
    const s = p.po_status || p.status || "unknown";
    poStatuses[s] = (poStatuses[s] || 0) + 1;
  });

  const supplierSpend = {};
  pos
    .filter((p) => ["received", "complete"].includes(p.po_status))
    .forEach((p) => {
      supplierSpend[p.supplier_id || "unknown"] =
        (supplierSpend[p.supplier_id || "unknown"] || 0) + (p.subtotal || 0);
    });
  const supplierSpendList = Object.entries(supplierSpend)
    .map(([id, total]) => ({
      id,
      total,
      name: data.suppliers.find((s) => s.id === id)?.name || "Unknown",
    }))
    .sort((a, b) => b.total - a.total);
  const topByValue = [...inv]
    .map((i) => ({
      ...i,
      totalValue: (i.quantity_on_hand || 0) * (i.sell_price || 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 8);

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={sCard}>
        <div style={sLabel}>Inventory by Category</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {Object.entries(categories).map(([cat, d]) => {
            const margin =
              d.value > 0
                ? (((d.value - d.cost) / d.value) * 100).toFixed(1)
                : "0";
            return (
              <div
                key={cat}
                style={{
                  padding: 14,
                  background: C.bg,
                  borderRadius: 2,
                  borderLeft: `3px solid ${CATEGORY_COLORS[cat] || C.muted}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: CATEGORY_COLORS[cat] || C.muted,
                    marginBottom: 4,
                  }}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                <div
                  style={{
                    fontFamily: F.heading,
                    fontSize: 20,
                    fontWeight: 600,
                    color: C.text,
                  }}
                >
                  {d.count} items
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  Value: R{d.value.toLocaleString()} · Margin: {margin}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={sCard}>
          <div style={sLabel}>Purchase Order Pipeline</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {/* v3.2 FIX: includes 'complete' status, uses po_status field */}
            {[
              "draft",
              "ordered",
              "submitted",
              "confirmed",
              "in_transit",
              "received",
              "complete",
              "cancelled",
            ].map((status) => {
              const count = poStatuses[status] || 0;
              if (
                count === 0 &&
                !["received", "complete", "cancelled"].includes(status)
              )
                return null;
              const colors = {
                draft: C.muted,
                ordered: C.blue,
                submitted: C.blue,
                confirmed: C.accent,
                in_transit: C.gold,
                received: C.primaryMid,
                complete: C.primaryDark,
                cancelled: C.red,
              };
              return (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: colors[status] || C.muted,
                      fontWeight: 600,
                    }}
                  >
                    {status}
                  </span>
                  <span
                    style={{
                      fontFamily: F.heading,
                      fontSize: 18,
                      fontWeight: 600,
                      color: colors[status] || C.muted,
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={sCard}>
          <div style={sLabel}>Supplier Spend (Received/Complete POs)</div>
          {supplierSpendList.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>
              No received POs yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {supplierSpendList.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 500 }}>
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontFamily: F.heading,
                      fontSize: 16,
                      fontWeight: 600,
                      color: C.primaryDark,
                    }}
                  >
                    R{s.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={sCard}>
        <div style={sLabel}>Top Items by Stock Value</div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 12,
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              {[
                "Item",
                "SKU",
                "Category",
                "On Hand",
                "Sell Price",
                "Total Value",
              ].map((h) => (
                <th
                  key={h}
                  style={
                    ["On Hand", "Sell Price", "Total Value"].includes(h)
                      ? { ...sTh, textAlign: "right" }
                      : sTh
                  }
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topByValue.map((i) => (
              <tr key={i.id}>
                <td style={{ ...sTd, fontWeight: 500 }}>{i.name}</td>
                <td
                  style={{
                    ...sTd,
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: C.muted,
                  }}
                >
                  {i.sku}
                </td>
                <td style={sTd}>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 2,
                      background: `${CATEGORY_COLORS[i.category] || C.muted}15`,
                      color: CATEGORY_COLORS[i.category] || C.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {CATEGORY_LABELS[i.category] || i.category}
                  </span>
                </td>
                <td style={{ ...sTd, textAlign: "right" }}>
                  {i.quantity_on_hand} {i.unit}
                </td>
                <td style={{ ...sTd, textAlign: "right" }}>
                  R{(i.sell_price || 0).toFixed(2)}
                </td>
                <td
                  style={{
                    ...sTd,
                    textAlign: "right",
                    fontWeight: 600,
                    color: C.primaryDark,
                  }}
                >
                  R{i.totalValue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────
// PRODUCTION
// ───────────────────────────────────────────────────────
function ProductionAnalytics({ data }) {
  const runs = data.productionRuns;
  const batches = data.batches;
  const completed = runs.filter((r) => r.status === "completed");
  const inProgress = runs.filter((r) => r.status === "in_progress");
  const planned = runs.filter((r) => r.status === "planned");
  const cancelled = runs.filter((r) => r.status === "cancelled");
  const totalPlanned = completed.reduce(
    (s, r) => s + (r.planned_units || 0),
    0,
  );
  const totalActual = completed.reduce((s, r) => s + (r.actual_units || 0), 0);
  const yieldRate =
    totalPlanned > 0 ? ((totalActual / totalPlanned) * 100).toFixed(1) : "—";
  const durations = completed
    .filter((r) => r.started_at && r.completed_at)
    .map((r) => (new Date(r.completed_at) - new Date(r.started_at)) / 3600000);
  const avgHours =
    durations.length > 0
      ? (durations.reduce((s, d) => s + d, 0) / durations.length).toFixed(1)
      : "—";
  const enriched = runs.map((r) => ({
    ...r,
    batchName: batches.find((b) => b.id === r.batch_id)?.batch_number || "—",
    productName: batches.find((b) => b.id === r.batch_id)?.product_name || "—",
  }));

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        <KPI label="Total Runs" value={runs.length} color={C.primaryDark} />
        <KPI label="Completed" value={completed.length} color={C.accent} />
        <KPI
          label="In Progress"
          value={inProgress.length}
          color={inProgress.length > 0 ? C.gold : C.muted}
        />
        <KPI label="Planned" value={planned.length} color={C.blue} />
        <KPI
          label="Cancelled"
          value={cancelled.length}
          color={cancelled.length > 0 ? C.red : C.muted}
        />
        <KPI
          label="Yield Rate"
          value={yieldRate !== "—" ? `${yieldRate}%` : "—"}
          color={C.accent}
          sub="actual vs planned"
        />
        <KPI
          label="Units Produced"
          value={totalActual.toLocaleString()}
          color={C.primaryDark}
        />
        <KPI
          label="Avg Completion"
          value={avgHours !== "—" ? `${avgHours}h` : "—"}
          color={C.gold}
          sub="hours"
        />
      </div>
      {enriched.length > 0 && (
        <div style={sCard}>
          <div style={sLabel}>All Production Runs</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {[
                  "Run #",
                  "Batch",
                  "Product",
                  "Status",
                  "Planned",
                  "Actual",
                  "Yield",
                  "Started",
                  "Completed",
                ].map((h) => (
                  <th
                    key={h}
                    style={
                      ["Planned", "Actual", "Yield"].includes(h)
                        ? { ...sTh, textAlign: "right" }
                        : sTh
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((r) => {
                  const yld =
                    r.planned_units > 0 && r.actual_units != null
                      ? ((r.actual_units / r.planned_units) * 100).toFixed(1)
                      : "—";
                  const sc = {
                    completed: C.accent,
                    in_progress: C.gold,
                    planned: C.blue,
                    cancelled: C.red,
                  };
                  return (
                    <tr key={r.id}>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: "monospace",
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        {r.run_number}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: 11,
                          color: C.muted,
                          fontFamily: "monospace",
                        }}
                      >
                        {r.batchName}
                      </td>
                      <td style={{ ...sTd, fontWeight: 500 }}>
                        {r.productName}
                      </td>
                      <td style={sTd}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 2,
                            background: `${sc[r.status] || C.muted}20`,
                            color: sc[r.status] || C.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            fontWeight: 700,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ ...sTd, textAlign: "right" }}>
                        {r.planned_units ?? "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontWeight: 600,
                          color: C.accent,
                        }}
                      >
                        {r.actual_units ?? "—"}
                      </td>
                      <td style={{ ...sTd, textAlign: "right" }}>
                        {yld !== "—" ? `${yld}%` : "—"}
                      </td>
                      <td style={{ ...sTd, fontSize: 11, color: C.muted }}>
                        {r.started_at
                          ? new Date(r.started_at).toLocaleDateString("en-ZA", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </td>
                      <td style={{ ...sTd, fontSize: 11, color: C.muted }}>
                        {r.completed_at
                          ? new Date(r.completed_at).toLocaleDateString(
                              "en-ZA",
                              { day: "numeric", month: "short" },
                            )
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
      {runs.length === 0 && (
        <div
          style={{ ...sCard, textAlign: "center", padding: 40, color: C.muted }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>No production
          runs yet.
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────
// DISTRIBUTION
// ───────────────────────────────────────────────────────
function DistributionAnalytics({ data }) {
  const shipments = data.shipments;
  const statusCounts = {};
  shipments.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });
  const destinations = {};
  shipments.forEach((s) => {
    const dest = s.destination_name || "Unknown";
    if (!destinations[dest])
      destinations[dest] = { count: 0, items: 0, value: 0 };
    destinations[dest].count++;
    (s.shipment_items || []).forEach((i) => {
      destinations[dest].items += i.quantity || 0;
      destinations[dest].value += i.total_cost || 0;
    });
  });
  const destList = Object.entries(destinations)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.items - a.items);
  const delivered = shipments.filter((s) => s.delivered_date && s.created_at);
  const deliveryTimes = delivered.map(
    (s) => (new Date(s.delivered_date) - new Date(s.created_at)) / 86400000,
  );
  const avgDelivery =
    deliveryTimes.length > 0
      ? (
          deliveryTimes.reduce((s, d) => s + d, 0) / deliveryTimes.length
        ).toFixed(1)
      : "—";
  const totalShippedValue = shipments.reduce(
    (s, sh) =>
      s +
      (sh.shipment_items || []).reduce((is, i) => is + (i.total_cost || 0), 0),
    0,
  );
  const now = new Date();
  const overdue = shipments.filter(
    (s) =>
      s.estimated_arrival &&
      !["delivered", "confirmed", "cancelled"].includes(s.status) &&
      new Date(s.estimated_arrival) < now,
  );

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {overdue.length > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: C.lightRed,
            border: `1px solid ${C.red}`,
            borderRadius: 2,
            fontSize: 13,
            color: C.red,
            fontWeight: 600,
          }}
        >
          ⚠ {overdue.length} shipment{overdue.length > 1 ? "s" : ""} overdue:{" "}
          {overdue.map((s) => s.shipment_number).join(", ")}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        <KPI
          label="Total Shipments"
          value={shipments.length}
          color={C.primaryDark}
        />
        <KPI
          label="Preparing"
          value={statusCounts.preparing || 0}
          color={C.muted}
        />
        <KPI
          label="In Transit"
          value={(statusCounts.shipped || 0) + (statusCounts.in_transit || 0)}
          color={C.gold}
        />
        <KPI
          label="Delivered"
          value={(statusCounts.delivered || 0) + (statusCounts.confirmed || 0)}
          color={C.accent}
        />
        <KPI
          label="Avg Delivery Time"
          value={avgDelivery !== "—" ? `${avgDelivery}d` : "—"}
          color={C.gold}
          sub="days"
        />
        <KPI
          label="Total Value Shipped"
          value={`R${totalShippedValue.toLocaleString()}`}
          color={C.primaryDark}
        />
      </div>
      {destList.length > 0 && (
        <div style={sCard}>
          <div style={sLabel}>Shipments by Destination</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {["Destination", "Shipments", "Items", "Value"].map((h) => (
                  <th
                    key={h}
                    style={
                      ["Shipments", "Items", "Value"].includes(h)
                        ? { ...sTh, textAlign: "right" }
                        : sTh
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {destList.map((d) => (
                <tr key={d.name}>
                  <td style={{ ...sTd, fontWeight: 500 }}>{d.name}</td>
                  <td style={{ ...sTd, textAlign: "right" }}>{d.count}</td>
                  <td style={{ ...sTd, textAlign: "right", fontWeight: 600 }}>
                    {d.items.toLocaleString()}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      color: C.primaryDark,
                      fontWeight: 600,
                    }}
                  >
                    {d.value > 0 ? `R${d.value.toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────
// SCANS & LOYALTY — FIXED v3.1: scan_logs schema
// ───────────────────────────────────────────────────────
function ScansAnalytics({ data }) {
  const scans = data.scans; // from scan_logs
  const now = new Date();
  const periods = [
    {
      label: "Today",
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    },
    { label: "7 days", from: new Date(now - 7 * 86400000) },
    { label: "30 days", from: new Date(now - 30 * 86400000) },
    { label: "90 days", from: new Date(now - 90 * 86400000) },
    { label: "All time", from: new Date(0) },
  ];

  const typeMap = {};
  scans.forEach((s) => {
    const t = s.qr_type || "unknown";
    typeMap[t] = (typeMap[t] || 0) + 1;
  });
  const typeList = Object.entries(typeMap)
    .map(([qrType, count]) => ({ qrType, count }))
    .sort((a, b) => b.count - a.count);

  const codeMap = {};
  scans.forEach((s) => {
    const id = s.qr_code_id || "unknown";
    codeMap[id] = (codeMap[id] || 0) + 1;
  });
  const topCodes = Object.entries(codeMap)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const provMap = {};
  scans.forEach((s) => {
    if (s.ip_province)
      provMap[s.ip_province] = (provMap[s.ip_province] || 0) + 1;
  });
  const topProvinces = Object.entries(provMap)
    .map(([p, c]) => ({ province: p, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const outcomeMap = {};
  scans.forEach((s) => {
    const o = s.scan_outcome || "unknown";
    outcomeMap[o] = (outcomeMap[o] || 0) + 1;
  });
  const outcomeList = Object.entries(outcomeMap)
    .map(([o, c]) => ({ outcome: o, count: c }))
    .sort((a, b) => b.count - a.count);

  const earned = data.loyalty.filter((t) =>
    ["EARNED", "earned", "EARNED_POINTS", "SCAN"].includes(t.transaction_type),
  );
  const redeemed = data.loyalty.filter((t) =>
    ["REDEEMED", "redeemed", "REDEEMED_POINTS"].includes(t.transaction_type),
  );
  const totalEarned = earned.reduce((s, t) => s + (t.points || 0), 0);
  const totalRedeemed = redeemed.reduce(
    (s, t) => s + Math.abs(t.points || 0),
    0,
  );
  const customers = data.users.filter((u) => u.role === "customer").length;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Period KPIs — FIXED v3.1: scanned_at */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 12,
        }}
      >
        {periods.map((p) => (
          <KPI
            key={p.label}
            label={`Scans (${p.label})`}
            value={scans.filter((s) => new Date(s.scanned_at) >= p.from).length}
            color={C.accent}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={sCard}>
          <div style={sLabel}>Scans by QR Type</div>
          {typeList.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>
              No scan data yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {typeList.map((s) => {
                const pct =
                  scans.length > 0
                    ? ((s.count / scans.length) * 100).toFixed(1)
                    : 0;
                return (
                  <div key={s.qrType}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {s.qrType}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        {s.count} ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: C.border,
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: C.accent,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={sCard}>
          <div style={sLabel}>Top Scanned Codes</div>
          {topCodes.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>
              No scan data yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              {topCodes.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: C.muted,
                        fontWeight: 600,
                        minWidth: 20,
                      }}
                    >
                      #{i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: C.muted,
                      }}
                    >
                      {p.id.slice(0, 12)}…
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: F.heading,
                      fontSize: 16,
                      fontWeight: 600,
                      color: C.primaryDark,
                    }}
                  >
                    {p.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={sCard}>
          <div style={sLabel}>Scans by Province (IP)</div>
          {topProvinces.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>
              No geo data yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {topProvinces.map((row) => {
                const pct =
                  scans.length > 0
                    ? ((row.count / scans.length) * 100).toFixed(1)
                    : 0;
                return (
                  <div key={row.province}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: C.primaryDark,
                          fontWeight: 500,
                        }}
                      >
                        {row.province}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        {row.count} · {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: C.border,
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: C.primaryMid,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={sCard}>
          <div style={sLabel}>Scan Outcomes</div>
          {outcomeList.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>
              No data yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {outcomeList.map((row) => {
                const pct =
                  scans.length > 0
                    ? ((row.count / scans.length) * 100).toFixed(1)
                    : 0;
                const color =
                  row.outcome === "points_awarded"
                    ? C.accent
                    : row.outcome === "already_claimed"
                      ? C.muted
                      : C.orange;
                return (
                  <div key={row.outcome}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color,
                        }}
                      >
                        {row.outcome.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        {row.count} · {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: C.border,
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: color,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        <KPI label="Customers" value={customers} color={C.primaryMid} />
        <KPI
          label="Points Earned"
          value={totalEarned.toLocaleString()}
          color={C.gold}
        />
        <KPI
          label="Points Redeemed"
          value={totalRedeemed.toLocaleString()}
          color={C.accent}
        />
        <KPI
          label="Redemption Rate"
          value={
            totalEarned > 0
              ? `${((totalRedeemed / totalEarned) * 100).toFixed(1)}%`
              : "—"
          }
          color={C.blue}
        />
        <KPI
          label="Loyalty Tx"
          value={data.loyalty.length}
          color={C.primaryDark}
        />
        <KPI
          label="Avg Pts/Customer"
          value={customers > 0 ? Math.round(totalEarned / customers) : "—"}
          color={C.gold}
        />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────
// SHARED COMPONENTS
// ───────────────────────────────────────────────────────
function KPI({ label, value, color, sub }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 2,
        padding: "14px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: F.heading,
          fontSize: 26,
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function PipelineCard({ stage, icon, items, color }) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 2,
        padding: 14,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color,
          marginBottom: 8,
        }}
      >
        {stage}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>
          {item.label}:{" "}
          <span style={{ fontWeight: 600, color: C.text }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
