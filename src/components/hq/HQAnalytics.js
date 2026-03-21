// src/components/hq/HQAnalytics.js v4.3 — Geo tab: GeoAnalyticsDashboard wired in
// v4.1 — WP-THEME-2: Inter font + WorkflowGuide + usePageContext + InfoTooltip + Toast
// v4.0 — WP-THEME: Unified design system applied
// v3.2: Margin fix + po_status fix | v3.1: scan_logs schema

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import { usePageContext } from "../../hooks/usePageContext";
import WorkflowGuide from "../WorkflowGuide";
import InfoTooltip from "../InfoTooltip";
import { ChartCard, ChartTooltip } from "../viz";
import GeoAnalyticsDashboard from "./GeoAnalyticsDashboard";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
  label: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
  },
  kpi: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 24,
    fontWeight: 400,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  body: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 13,
    fontWeight: 400,
  },
  caption: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 11,
    fontWeight: 400,
  },
  data: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 12,
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
  },
};

// Legacy aliases
const C = {
  bg: T.ink050,
  primaryDark: T.accent,
  primaryMid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  text: T.ink900,
  muted: T.ink500,
  border: T.ink150,
  white: "#fff",
  red: T.danger,
  lightRed: T.dangerBg,
  orange: T.warning,
  lightOrange: T.warningBg,
  blue: T.info,
  lightBlue: T.infoBg,
  lightGreen: T.accentLit,
};
const F = { heading: T.fontUi, body: T.fontUi };

const sCard = {
  background: "#fff",
  border: `1px solid ${T.ink150}`,
  borderRadius: "6px",
  padding: "20px",
  boxShadow: T.shadow,
};
const sLabel = {
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
  fontFamily: T.fontUi,
  fontWeight: 700,
};
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "9px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink075}`,
  color: T.ink700,
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
  finished_product: T.success,
  raw_material: T.info,
  terpene: T.accentMid,
  hardware: "#92400E",
  uncategorised: T.ink500,
};

export default function HQAnalytics() {
  const ctx = usePageContext("hq-analytics", null);

  const [subTab, setSubTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);
  const subscriptions = useRef([]);

  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = {};
      const safe = async (fn, fallback = []) => {
        try {
          return await fn();
        } catch {
          return fallback;
        }
      };

      result.inventory = (
        await safe(async () => {
          const r = await supabase
            .from("inventory_items")
            .select(
              "id,name,sku,category,unit,quantity_on_hand,reorder_level,cost_price,weighted_avg_cost,sell_price,is_active,supplier_id",
            );
          return r.data || [];
        })
      ).filter((i) => i.is_active);
      result.suppliers = (
        await safe(async () => {
          const r = await supabase
            .from("suppliers")
            .select("id,name,country,is_active");
          return r.data || [];
        })
      ).filter((s) => s.is_active);
      result.purchaseOrders = await safe(async () => {
        const r = await supabase
          .from("purchase_orders")
          .select(
            "id,po_number,supplier_id,po_status,status,subtotal,currency,order_date,received_date,created_at,purchase_order_items(*)",
          );
        return r.data || [];
      });
      result.productionRuns = await safe(async () => {
        const r = await supabase
          .from("production_runs")
          .select(
            "id,run_number,batch_id,status,planned_units,actual_units,started_at,completed_at,notes,created_at,production_run_inputs(*)",
          );
        return r.data || [];
      });
      result.batches = await safe(async () => {
        const r = await supabase
          .from("batches")
          .select("id,batch_number,product_name,product_type,status");
        return r.data || [];
      });
      result.shipments = await safe(async () => {
        const r = await supabase
          .from("shipments")
          .select(
            "id,shipment_number,destination_name,status,courier,shipped_date,delivered_date,confirmed_date,estimated_arrival,created_at,shipment_items(*)",
          );
        return r.data || [];
      });
      result.scans = await safe(async () => {
        const r = await supabase
          .from("scan_logs")
          .select(
            "id,qr_code_id,qr_code,user_id,scanned_at,points_awarded,scan_outcome,qr_type,campaign_name,ip_province,ip_city,device_type",
          )
          .order("scanned_at", { ascending: false });
        return r.data || [];
      });
      result.users = await safe(async () => {
        const r = await supabase
          .from("user_profiles")
          .select("id,role,created_at");
        return r.data || [];
      });
      result.loyalty = await safe(async () => {
        const r = await supabase
          .from("loyalty_transactions")
          .select("points,transaction_type");
        return r.error ? [] : r.data || [];
      });
      result.tenants = await safe(async () => {
        const r = await supabase
          .from("tenants")
          .select("id,name,type,is_active");
        return r.data || [];
      });
      result.movements = await safe(async () => {
        const r = await supabase
          .from("stock_movements")
          .select("id,item_id,quantity,movement_type,reference,created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        return r.data || [];
      });

      // WP-VIZ: orders for revenue trend + channel mix + funnel
      result.orders = await safe(async () => {
        const r = await supabase
          .from("orders")
          .select("id,created_at,total,status,items_count")
          .not("status", "in", '("cancelled","failed")')
          .order("created_at", { ascending: false })
          .limit(500);
        return r.data || [];
      });

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
                msg: `${n.shipment_number} → ${n.status}`,
                time: new Date(),
                id: n.id,
              },
              ...prev,
            ].slice(0, 10),
          );
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  shipments: prev.shipments.map((s) =>
                    s.id === n.id ? { ...s, ...n } : s,
                  ),
                }
              : prev,
          );
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
    { id: "overview", label: "Overview" },
    { id: "supply", label: "Supply Chain" },
    { id: "production", label: "Production" },
    { id: "distribution", label: "Distribution" },
    { id: "scans", label: "Scans & Loyalty" },
    { id: "geo", label: "Geo & Intelligence" },
  ];

  if (error)
    return (
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.dangerBd}`,
          borderLeft: `3px solid ${T.danger}`,
        }}
      >
        <div style={sLabel}>Error</div>
        <p style={{ fontSize: "13px", color: T.danger, margin: "8px 0 0" }}>
          {error}
        </p>
        <button
          onClick={fetchAll}
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            background: T.accent,
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: T.fontUi,
          }}
        >
          Retry
        </button>
      </div>
    );

  return (
    <div style={{ fontFamily: T.fontUi }}>
      {/* WorkflowGuide — always first */}
      <WorkflowGuide
        context={ctx}
        tabId="hq-analytics"
        onAction={() => {}}
        defaultOpen={false}
      />

      {/* Header */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2
              style={{
                fontFamily: T.fontUi,
                fontSize: "22px",
                fontWeight: 300,
                color: T.ink900,
                margin: 0,
              }}
            >
              HQ Analytics
            </h2>
            <InfoTooltip id="hq-analytics-title" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: T.success,
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: T.ink500,
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
            <span style={{ fontSize: 11, color: T.ink500 }}>
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
              border: `1px solid ${T.ink150}`,
              borderRadius: "4px",
              padding: "7px 14px",
              cursor: "pointer",
              fontFamily: T.fontUi,
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.ink500,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Live feed */}
      {liveEvents.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: T.infoBg,
            border: `1px solid ${T.infoBd}`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.info,
              marginBottom: 8,
            }}
          >
            Live Feed
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {liveEvents.slice(0, 5).map((ev, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: T.info,
                  background: "#fff",
                  padding: "4px 10px",
                  borderRadius: 3,
                  border: `1px solid ${T.infoBd}`,
                }}
              >
                {ev.msg} ·{" "}
                <span style={{ color: T.ink400 }}>
                  {ev.time.toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
            {liveEvents.length > 5 && (
              <div style={{ fontSize: 12, color: T.ink400, padding: "4px 0" }}>
                +{liveEvents.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${T.ink150}`,
          marginBottom: "24px",
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom:
                subTab === t.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              fontFamily: T.fontUi,
              fontSize: "11px",
              fontWeight: subTab === t.id ? 700 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: subTab === t.id ? T.accent : T.ink500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: T.ink500 }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: `2px solid ${T.ink150}`,
              borderTopColor: T.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          Loading analytics…
        </div>
      ) : data ? (
        <>
          {subTab === "overview" && <OverviewAnalytics data={data} />}
          {subTab === "supply" && <SupplyChainAnalytics data={data} />}
          {subTab === "production" && <ProductionAnalytics data={data} />}
          {subTab === "distribution" && <DistributionAnalytics data={data} />}
          {subTab === "scans" && <ScansAnalytics data={data} />}
          {subTab === "geo" && <GeoAnalyticsDashboard />}
        </>
      ) : null}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: toast.type === "error" ? T.danger : T.accent,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: T.fontUi,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewAnalytics({ data }) {
  const inv = data.inventory;
  const runs = data.productionRuns;
  const shipments = data.shipments;
  const orders = data.orders || [];
  const scans = data.scans;
  const now = new Date();

  const finishedInv = inv.filter((i) => i.category === "finished_product");
  const stockValue = finishedInv.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.sell_price || 0),
    0,
  );
  const stockCost = finishedInv.reduce(
    (s, i) =>
      s +
      (i.quantity_on_hand || 0) * (i.weighted_avg_cost ?? i.cost_price ?? 0),
    0,
  );
  const potentialMargin =
    stockValue > 0
      ? (((stockValue - stockCost) / stockValue) * 100).toFixed(1)
      : 0;
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
  const scans7d = scans.filter(
    (s) => new Date(s.scanned_at) >= new Date(now - 7 * 86400000),
  ).length;
  const scans30d = scans.filter(
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
  const overdue = shipments.filter(
    (s) =>
      s.estimated_arrival &&
      !["delivered", "confirmed", "cancelled"].includes(s.status) &&
      new Date(s.estimated_arrival) < now,
  );

  const alerts = [];
  if (outOfStock.length > 0)
    alerts.push({
      sem: "danger",
      msg: `${outOfStock.length} item${outOfStock.length > 1 ? "s" : ""} out of stock`,
    });
  if (lowStock.length > 0)
    alerts.push({
      sem: "warning",
      msg: `${lowStock.length} item${lowStock.length > 1 ? "s" : ""} below reorder level`,
    });
  if (inTransit.length > 0)
    alerts.push({
      sem: "info",
      msg: `${inTransit.length} shipment${inTransit.length > 1 ? "s" : ""} in transit`,
    });
  if (activeRuns.length > 0)
    alerts.push({
      sem: "info",
      msg: `${activeRuns.length} run${activeRuns.length > 1 ? "s" : ""} in progress`,
    });
  if (overdue.length > 0)
    alerts.push({
      sem: "danger",
      msg: `${overdue.length} shipment${overdue.length > 1 ? "s" : ""} overdue`,
    });

  const semC = {
    danger: T.danger,
    warning: T.warning,
    info: T.info,
    success: T.success,
  };
  const semBg = {
    danger: T.dangerBg,
    warning: T.warningBg,
    info: T.infoBg,
    success: T.successBg,
  };
  const semBd = {
    danger: T.dangerBd,
    warning: T.warningBd,
    info: T.infoBd,
    success: T.successBd,
  };

  // ── Revenue trend data (Chart #1 — Line via AreaChart fill=none) ──
  const revTrendData = (() => {
    const dayMap = {};
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString("en-ZA", {
        month: "short",
        day: "numeric",
      });
      dayMap[day] = (dayMap[day] || 0) + (parseFloat(o.total) || 0);
    });
    return Object.entries(dayMap)
      .slice(-20)
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }));
  })();

  // ── Grouped Bar: scans current 7d vs prior 7d by qr_type (Chart #4) ──
  const groupedBarData = (() => {
    const d7 = new Date(now - 7 * 86400000);
    const d14 = new Date(now - 14 * 86400000);
    const curr = {},
      prior = {};
    scans.forEach((s) => {
      const t = s.qr_type || "unknown";
      const dt = new Date(s.scanned_at);
      if (dt >= d7) curr[t] = (curr[t] || 0) + 1;
      else if (dt >= d14) prior[t] = (prior[t] || 0) + 1;
    });
    const types = [
      ...new Set([...Object.keys(curr), ...Object.keys(prior)]),
    ].slice(0, 6);
    return types.map((t) => ({
      type: t.replace(/_/g, " "),
      current: curr[t] || 0,
      prior: prior[t] || 0,
    }));
  })();

  // ── Stacked Bar: scan outcomes by week (Chart #6) ──
  const stackedBarData = (() => {
    const weekMap = {};
    const outcomes = new Set();
    scans.forEach((s) => {
      const wk = new Date(s.scanned_at);
      wk.setHours(0, 0, 0, 0);
      wk.setDate(wk.getDate() - wk.getDay()); // start of week
      const key = wk.toLocaleDateString("en-ZA", {
        month: "short",
        day: "numeric",
      });
      const out = s.scan_outcome || "unknown";
      outcomes.add(out);
      weekMap[key] = weekMap[key] || {};
      weekMap[key][out] = (weekMap[key][out] || 0) + 1;
    });
    return Object.entries(weekMap)
      .slice(-8)
      .map(([week, vals]) => ({ week, ...vals }));
  })();
  const stackedOutcomes = [
    ...new Set(scans.map((s) => s.scan_outcome || "unknown")),
  ].slice(0, 4);
  const stackColours = [T.success, T.accentMid, T.warning, T.ink400];

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {alerts.length > 0 && (
        <div style={sCard}>
          <div style={sLabel}>Command Centre — Live Alerts</div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}
          >
            {alerts.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  background: semBg[a.sem],
                  color: semC[a.sem],
                  border: `1px solid ${semBd[a.sem]}`,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: T.fontUi,
                }}
              >
                {a.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI grids */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        <KPI
          label="Finished Stock Value"
          value={`R${stockValue.toLocaleString()}`}
          semantic="success"
        />
        <KPI
          label="Finished Stock Cost"
          value={`R${stockCost.toLocaleString()}`}
          semantic="info"
        />
        <KPI
          label="Potential Margin"
          value={`${potentialMargin}%`}
          semantic="success"
          sub="finished goods only"
        />
        <KPI label="Active SKUs" value={inv.length} semantic={null} />
        <KPI
          label="Low Stock"
          value={lowStock.length}
          semantic={lowStock.length > 0 ? "warning" : "success"}
        />
        <KPI
          label="Out of Stock"
          value={outOfStock.length}
          semantic={outOfStock.length > 0 ? "danger" : "success"}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        <KPI
          label="Runs Completed"
          value={completedRuns.length}
          semantic="success"
        />
        <KPI
          label="Runs Active"
          value={activeRuns.length}
          semantic={activeRuns.length > 0 ? "warning" : null}
        />
        <KPI
          label="Units Produced"
          value={totalUnits.toLocaleString()}
          semantic={null}
        />
        <KPI
          label="Avg Yield"
          value={avgYield !== "—" ? `${avgYield}%` : "—"}
          semantic="success"
        />
        <KPI
          label="Shipments Delivered"
          value={delivered.length}
          semantic="success"
        />
        <KPI
          label="Units Shipped"
          value={unitsShipped.toLocaleString()}
          semantic={null}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        <KPI label="Total Scans" value={scans.length} semantic="info" />
        <KPI
          label="Scans (7d)"
          value={scans7d}
          semantic="info"
          sub="last 7 days"
        />
        <KPI
          label="Scans (30d)"
          value={scans30d}
          semantic="info"
          sub="last 30 days"
        />
        <KPI label="Customers" value={customers} semantic={null} />
        <KPI
          label={
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Points Issued <InfoTooltip id="points-issued" />
            </span>
          }
          value={totalPoints.toLocaleString()}
          semantic={null}
        />
        <KPI label="Suppliers" value={data.suppliers.length} semantic={null} />
      </div>

      {/* ── CHART #1: Revenue Trend — Line (via Area fill=none) ── */}
      {revTrendData.length >= 2 && (
        <ChartCard title="Revenue Trend — Last 30 Days" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revTrendData}
              margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
            >
              <defs>
                <linearGradient id="an-rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal
                vertical={false}
                stroke={T.ink150}
                strokeWidth={0.5}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                axisLine={false}
                tickLine={false}
                dy={6}
                interval="preserveStartEnd"
                maxRotation={0}
              />
              <YAxis
                dataKey="revenue"
                tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(v) =>
                      `R ${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={T.accent}
                strokeWidth={2}
                fill="url(#an-rev-grad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── CHART: Scan Activity Overview ── */}
      {scans.length > 0 &&
        (() => {
          const dayMap = {};
          scans.forEach((s) => {
            const day = new Date(s.scanned_at).toLocaleDateString("en-ZA", {
              month: "short",
              day: "numeric",
            });
            dayMap[day] = (dayMap[day] || 0) + 1;
          });
          const trendData = Object.entries(dayMap)
            .slice(-14)
            .map(([date, count]) => ({ date, count }));
          if (trendData.length < 2) return null;
          return (
            <ChartCard title="Scan Activity — Last 14 Days" height={200}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                >
                  <defs>
                    <linearGradient id="ov-an-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={T.accentMid}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor={T.accentMid}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    horizontal
                    vertical={false}
                    stroke={T.ink150}
                    strokeWidth={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                    interval="preserveStartEnd"
                    maxRotation={0}
                  />
                  <YAxis
                    dataKey="count"
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={(v) => `${v} scans`} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Scans"
                    stroke={T.accentMid}
                    strokeWidth={2}
                    fill="url(#ov-an-grad)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          );
        })()}

      {/* ── CHART #4: Grouped Bar — current vs prior 7d by QR type ── */}
      {groupedBarData.length > 0 && (
        <ChartCard
          title="Scan Volume — Current vs Prior 7 Days by Type"
          height={220}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupedBarData}
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid
                horizontal
                vertical={false}
                stroke={T.ink150}
                strokeWidth={0.5}
              />
              <XAxis
                dataKey="type"
                tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                axisLine={false}
                tickLine={false}
                width={24}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip formatter={(v) => `${v} scans`} />}
              />
              <Legend
                iconSize={8}
                iconType="square"
                formatter={(v) => (
                  <span
                    style={{
                      fontSize: 11,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    {v}
                  </span>
                )}
              />
              <Bar
                dataKey="current"
                name="Current 7d"
                fill={T.accent}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                maxBarSize={24}
              />
              <Bar
                dataKey="prior"
                name="Prior 7d"
                fill={T.accentBd}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── CHART #6: Stacked Bar — scan outcomes by week ── */}
      {stackedBarData.length >= 2 && stackedOutcomes.length > 0 && (
        <ChartCard title="Scan Outcomes by Week — Stacked" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedBarData}
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
              barCategoryGap="25%"
            >
              <CartesianGrid
                horizontal
                vertical={false}
                stroke={T.ink150}
                strokeWidth={0.5}
              />
              <XAxis
                dataKey="week"
                tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                axisLine={false}
                tickLine={false}
                width={24}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconSize={8}
                iconType="square"
                formatter={(v) => (
                  <span
                    style={{
                      fontSize: 11,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    {v.replace(/_/g, " ")}
                  </span>
                )}
              />
              {stackedOutcomes.map((o, i) => (
                <Bar
                  key={o}
                  dataKey={o}
                  name={o}
                  stackId="a"
                  fill={stackColours[i % stackColours.length]}
                  isAnimationActive={false}
                  maxBarSize={36}
                  radius={
                    i === stackedOutcomes.length - 1
                      ? [3, 3, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Donut + Production bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {(() => {
          const catMap = {};
          inv.forEach((i) => {
            const cat = CATEGORY_LABELS[i.category] || i.category || "Other";
            catMap[cat] = (catMap[cat] || 0) + 1;
          });
          const pieData = Object.entries(catMap).map(([name, value]) => ({
            name,
            value,
          }));
          const COLOURS = [T.success, T.info, T.accentMid, "#92400E", T.ink400];
          if (pieData.length < 2) return <div />;
          return (
            <ChartCard title="Inventory by Category" height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    dataKey="value"
                    paddingAngle={3}
                    isAnimationActive={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip formatter={(v) => `${v} items`} />}
                  />
                  <Legend
                    iconSize={8}
                    iconType="square"
                    formatter={(v) => (
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.font,
                        }}
                      >
                        {v}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          );
        })()}
        {(() => {
          const statusMap = {};
          runs.forEach((r) => {
            statusMap[r.status] = (statusMap[r.status] || 0) + 1;
          });
          const barData = Object.entries(statusMap).map(([status, count]) => ({
            status: status.replace("_", " "),
            count,
          }));
          const barColors = {
            completed: T.success,
            in_progress: T.warning,
            planned: T.info,
            cancelled: T.danger,
          };
          if (barData.length === 0) return <div />;
          return (
            <ChartCard title="Production Runs by Status" height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    horizontal
                    vertical={false}
                    stroke={T.ink150}
                    strokeWidth={0.5}
                  />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={(v) => `${v} runs`} />}
                  />
                  <Bar
                    dataKey="count"
                    name="Runs"
                    isAnimationActive={false}
                    maxBarSize={36}
                    radius={[3, 3, 0, 0]}
                  >
                    {barData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          barColors[d.status.replace(" ", "_")] || T.accentMid
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          );
        })()}
      </div>

      {/* Pipeline strip */}
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
            color={T.info}
            items={[
              {
                label: "Active POs",
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
            color={T.accentMid}
            items={[
              { label: "SKUs", value: inv.length },
              { label: "Value", value: `R${stockValue.toLocaleString()}` },
            ]}
          />
          <PipelineCard
            stage="Produce"
            color="#b5935a"
            items={[
              { label: "Active", value: activeRuns.length },
              { label: "Done", value: completedRuns.length },
            ]}
          />
          <PipelineCard
            stage="Distribute"
            color={T.success}
            items={[
              { label: "In Transit", value: inTransit.length },
              { label: "Delivered", value: delivered.length },
            ]}
          />
          <PipelineCard
            stage="Scans"
            color={T.accent}
            items={[
              { label: "Total", value: scans.length },
              { label: "7-day", value: scans7d },
            ]}
          />
        </div>
      </div>

      {/* Recent movements */}
      {data.movements?.length > 0 && (
        <div style={sCard}>
          <div style={sLabel}>Recent Stock Movements</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 12,
              fontSize: 12,
              fontFamily: T.fontUi,
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
                        borderRadius: 3,
                        background:
                          m.movement_type?.includes("out") ||
                          m.movement_type?.includes("Out")
                            ? T.dangerBg
                            : T.successBg,
                        color:
                          m.movement_type?.includes("out") ||
                          m.movement_type?.includes("Out")
                            ? T.danger
                            : T.success,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontWeight: 700,
                      }}
                    >
                      {m.movement_type}
                    </span>
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: T.fontData,
                      fontWeight: 600,
                      color: m.quantity < 0 ? T.danger : T.success,
                    }}
                  >
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: T.fontData,
                      fontSize: 11,
                      color: T.ink500,
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

// ─── Supply Chain ─────────────────────────────────────────────────────────────
function SupplyChainAnalytics({ data }) {
  const inv = data.inventory;
  const pos = data.purchaseOrders;
  const categories = {};
  inv.forEach((i) => {
    const cat = i.category || "uncategorised";
    if (!categories[cat]) categories[cat] = { count: 0, value: 0, cost: 0 };
    categories[cat].count++;
    categories[cat].value += (i.quantity_on_hand || 0) * (i.sell_price || 0);
    categories[cat].cost +=
      (i.quantity_on_hand || 0) * (i.weighted_avg_cost ?? i.cost_price ?? 0);
  });
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
  const poStatusColors = {
    draft: T.ink500,
    ordered: T.info,
    submitted: T.info,
    confirmed: T.success,
    in_transit: "#b5935a",
    received: T.accentMid,
    complete: T.accent,
    cancelled: T.danger,
  };

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
                  background: T.ink075,
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 6,
                  borderLeft: `3px solid ${CATEGORY_COLORS[cat] || T.ink500}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: CATEGORY_COLORS[cat] || T.ink500,
                    marginBottom: 4,
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                  }}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                <div
                  style={{
                    fontFamily: T.fontData,
                    fontSize: 20,
                    fontWeight: 400,
                    color: T.ink900,
                  }}
                >
                  {d.count} items
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink500,
                    marginTop: 4,
                    fontFamily: T.fontUi,
                  }}
                >
                  Value: R{d.value.toLocaleString()} · Margin: {margin}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {Object.keys(categories).length > 0 &&
        (() => {
          const barData = Object.entries(categories).map(([cat, d]) => ({
            name: (CATEGORY_LABELS[cat] || cat).split(" ")[0],
            value: d.count,
            cost: Math.round(d.cost),
          }));
          return (
            <ChartCard title="Inventory Items by Category" height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                >
                  <CartesianGrid
                    horizontal
                    vertical={false}
                    stroke={T.ink150}
                    strokeWidth={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(v, n) =>
                          n === "value"
                            ? `${v} items`
                            : `R${v.toLocaleString("en-ZA")}`
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="value"
                    name="Items"
                    fill={T.accent}
                    isAnimationActive={false}
                    maxBarSize={28}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="cost"
                    name="Cost Value"
                    fill={T.accentMid}
                    isAnimationActive={false}
                    maxBarSize={28}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          );
        })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={sCard}>
          <div style={sLabel}>Purchase Order Pipeline</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
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
              return (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${T.ink075}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: poStatusColors[status] || T.ink500,
                      fontWeight: 700,
                      fontFamily: T.fontUi,
                    }}
                  >
                    {status}
                  </span>
                  <span
                    style={{
                      fontFamily: T.fontData,
                      fontSize: 18,
                      fontWeight: 400,
                      color: poStatusColors[status] || T.ink500,
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
            <p
              style={{
                fontSize: 13,
                color: T.ink500,
                marginTop: 12,
                fontFamily: T.fontUi,
              }}
            >
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
                    borderBottom: `1px solid ${T.ink075}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: T.fontUi,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontFamily: T.fontData,
                      fontSize: 16,
                      fontWeight: 400,
                      color: T.accent,
                    }}
                  >{`R${s.total.toLocaleString()}`}</span>
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
            fontFamily: T.fontUi,
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
                    fontFamily: T.fontData,
                    fontSize: 11,
                    color: T.ink500,
                  }}
                >
                  {i.sku}
                </td>
                <td style={sTd}>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: T.ink075,
                      color: CATEGORY_COLORS[i.category] || T.ink500,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                    }}
                  >
                    {CATEGORY_LABELS[i.category] || i.category}
                  </span>
                </td>
                <td
                  style={{ ...sTd, textAlign: "right", fontFamily: T.fontData }}
                >
                  {i.quantity_on_hand} {i.unit}
                </td>
                <td
                  style={{ ...sTd, textAlign: "right", fontFamily: T.fontData }}
                >
                  R{(i.sell_price || 0).toFixed(2)}
                </td>
                <td
                  style={{
                    ...sTd,
                    textAlign: "right",
                    fontFamily: T.fontData,
                    fontWeight: 600,
                    color: T.accent,
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

// ─── Production ───────────────────────────────────────────────────────────────
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
  const statusC = {
    completed: T.success,
    in_progress: T.warning,
    planned: T.info,
    cancelled: T.danger,
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        <KPI label="Total Runs" value={runs.length} semantic={null} />
        <KPI label="Completed" value={completed.length} semantic="success" />
        <KPI
          label="In Progress"
          value={inProgress.length}
          semantic={inProgress.length > 0 ? "warning" : null}
        />
        <KPI label="Planned" value={planned.length} semantic="info" />
        <KPI
          label="Cancelled"
          value={cancelled.length}
          semantic={cancelled.length > 0 ? "danger" : null}
        />
        <KPI
          label="Yield Rate"
          value={yieldRate !== "—" ? `${yieldRate}%` : "—"}
          semantic="success"
          sub="actual vs planned"
        />
        <KPI
          label="Units Produced"
          value={totalActual.toLocaleString()}
          semantic={null}
        />
        <KPI
          label="Avg Completion"
          value={avgHours !== "—" ? `${avgHours}h` : "—"}
          semantic={null}
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
              fontFamily: T.fontUi,
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
              {[...enriched]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((r) => {
                  const yld =
                    r.planned_units > 0 && r.actual_units != null
                      ? ((r.actual_units / r.planned_units) * 100).toFixed(1)
                      : "—";
                  return (
                    <tr key={r.id}>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.fontData,
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
                          color: T.ink500,
                          fontFamily: T.fontData,
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
                            borderRadius: 3,
                            background: `${statusC[r.status] || T.ink500}18`,
                            color: statusC[r.status] || T.ink500,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            fontWeight: 700,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                        }}
                      >
                        {r.planned_units ?? "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          fontWeight: 600,
                          color: T.success,
                        }}
                      >
                        {r.actual_units ?? "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                        }}
                      >
                        {yld !== "—" ? `${yld}%` : "—"}
                      </td>
                      <td style={{ ...sTd, fontSize: 11, color: T.ink500 }}>
                        {r.started_at
                          ? new Date(r.started_at).toLocaleDateString("en-ZA", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </td>
                      <td style={{ ...sTd, fontSize: 11, color: T.ink500 }}>
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
          style={{
            ...sCard,
            textAlign: "center",
            padding: 40,
            color: T.ink500,
          }}
        >
          No production runs yet.
        </div>
      )}
    </div>
  );
}

// ─── Distribution ─────────────────────────────────────────────────────────────
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
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 6,
            fontSize: 13,
            color: T.danger,
            fontWeight: 600,
            fontFamily: T.fontUi,
          }}
        >
          {overdue.length} shipment{overdue.length > 1 ? "s" : ""} overdue:{" "}
          {overdue.map((s) => s.shipment_number).join(", ")}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        <KPI label="Total Shipments" value={shipments.length} semantic={null} />
        <KPI
          label="Preparing"
          value={statusCounts.preparing || 0}
          semantic={null}
        />
        <KPI
          label="In Transit"
          value={(statusCounts.shipped || 0) + (statusCounts.in_transit || 0)}
          semantic="warning"
        />
        <KPI
          label="Delivered"
          value={(statusCounts.delivered || 0) + (statusCounts.confirmed || 0)}
          semantic="success"
        />
        <KPI
          label="Avg Delivery Time"
          value={avgDelivery !== "—" ? `${avgDelivery}d` : "—"}
          semantic={null}
          sub="days"
        />
        <KPI
          label="Total Value Shipped"
          value={`R${totalShippedValue.toLocaleString()}`}
          semantic={null}
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
              fontFamily: T.fontUi,
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
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.fontData,
                    }}
                  >
                    {d.count}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.fontData,
                      fontWeight: 600,
                    }}
                  >
                    {d.items.toLocaleString()}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.fontData,
                      color: T.accent,
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

// ─── Scans & Loyalty ─────────────────────────────────────────────────────────
function ScansAnalytics({ data }) {
  const scans = data.scans;
  const orders = data.orders || [];
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
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const outcomeMap = {};
  scans.forEach((s) => {
    const o = s.scan_outcome || "unknown";
    outcomeMap[o] = (outcomeMap[o] || 0) + 1;
  });
  const outcomeList = Object.entries(outcomeMap)
    .map(([outcome, count]) => ({ outcome, count }))
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
  const outcomeColor = (o) =>
    o === "points_awarded"
      ? T.success
      : o === "already_claimed"
        ? T.ink400
        : T.warning;

  // ── CHART #14: Conversion Funnel — scan → points awarded → orders ──
  const pointsAwardedCount = scans.filter(
    (s) => s.scan_outcome === "points_awarded",
  ).length;
  const ordersCount = orders.length;
  const funnelStages = [
    { label: "Total Scans", count: scans.length, color: T.accent },
    { label: "Points Awarded", count: pointsAwardedCount, color: T.accentMid },
    { label: "Orders Placed", count: ordersCount, color: T.success },
  ];
  const funnelMax = funnelStages[0].count || 1;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* ── CHART #14: Funnel ── */}
      {scans.length > 0 && (
        <div style={{ ...sCard }}>
          <div style={sLabel}>Conversion Funnel — Scan → Points → Order</div>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {funnelStages.map((stage, i) => {
              const pct = funnelMax > 0 ? (stage.count / funnelMax) * 100 : 0;
              const prevPct =
                i > 0
                  ? funnelStages[i - 1].count > 0
                    ? ((stage.count / funnelStages[i - 1].count) * 100).toFixed(
                        1,
                      )
                    : "0"
                  : null;
              return (
                <div key={stage.label}>
                  {prevPct !== null && (
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 10,
                        color: T.ink400,
                        fontFamily: T.fontUi,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        marginBottom: 4,
                      }}
                    >
                      ↓ {prevPct}% conversion
                    </div>
                  )}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: T.fontUi,
                        color: T.ink500,
                        width: 110,
                        flexShrink: 0,
                      }}
                    >
                      {stage.label}
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      <div
                        style={{
                          height: 32,
                          background: T.ink075,
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: stage.color,
                            borderRadius: 4,
                            transition: "width 0.4s",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 10,
                            boxSizing: "border-box",
                          }}
                        >
                          {pct > 15 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#fff",
                                fontFamily: T.fontUi,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {stage.count.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: stage.color,
                        fontFamily: T.fontUi,
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 60,
                        textAlign: "right",
                      }}
                    >
                      {pct > 15 ? "" : stage.count.toLocaleString()}
                      <span
                        style={{
                          fontSize: 10,
                          color: T.ink400,
                          fontWeight: 400,
                          marginLeft: 4,
                        }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scan Activity Area */}
      {(() => {
        const dayMap = {};
        scans.forEach((s) => {
          const day = new Date(s.scanned_at).toLocaleDateString("en-ZA", {
            month: "short",
            day: "numeric",
          });
          dayMap[day] = dayMap[day] || { date: day, scans: 0, points: 0 };
          dayMap[day].scans++;
          dayMap[day].points += s.points_awarded || 0;
        });
        const trendData = Object.values(dayMap).slice(-20);
        if (trendData.length < 2) return null;
        return (
          <ChartCard title="Scan Activity — Daily Trend" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
              >
                <defs>
                  <linearGradient id="an-scan-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={T.accentMid}
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="95%"
                      stopColor={T.accentMid}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  horizontal
                  vertical={false}
                  stroke={T.ink150}
                  strokeWidth={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                  interval="preserveStartEnd"
                  maxRotation={0}
                />
                <YAxis
                  dataKey="scans"
                  tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                  allowDecimals={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v, n) =>
                        n === "points" ? `${v} pts` : `${v} scans`
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  name="Scans"
                  stroke={T.accentMid}
                  strokeWidth={2}
                  fill="url(#an-scan-grad)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="points"
                  name="Points"
                  stroke={T.info}
                  strokeWidth={1.5}
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                  strokeDasharray="4 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        );
      })()}

      {/* Stacked outcomes by type */}
      {outcomeList.length > 0 &&
        (() => {
          const typeOutcome = {};
          scans.forEach((s) => {
            const t = s.qr_type || "unknown";
            const o = s.scan_outcome || "unknown";
            typeOutcome[t] = typeOutcome[t] || {};
            typeOutcome[t][o] = (typeOutcome[t][o] || 0) + 1;
          });
          const allOutcomes = [
            ...new Set(scans.map((s) => s.scan_outcome || "unknown")),
          ].slice(0, 4);
          const barData = Object.entries(typeOutcome)
            .slice(0, 6)
            .map(([type, outcomes]) => ({
              type: type.replace(/_/g, " "),
              ...outcomes,
            }));
          const barColors = [T.success, T.warning, T.ink400, T.danger];
          if (barData.length < 2) return null;
          return (
            <ChartCard title="Scan Outcomes by QR Type" height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                >
                  <CartesianGrid
                    horizontal
                    vertical={false}
                    stroke={T.ink150}
                    strokeWidth={0.5}
                  />
                  <XAxis
                    dataKey="type"
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconSize={8}
                    iconType="square"
                    formatter={(v) => (
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.font,
                        }}
                      >
                        {v.replace(/_/g, " ")}
                      </span>
                    )}
                  />
                  {allOutcomes.map((o, i) => (
                    <Bar
                      key={o}
                      dataKey={o}
                      name={o}
                      stackId="a"
                      fill={barColors[i % barColors.length]}
                      isAnimationActive={false}
                      maxBarSize={32}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          );
        })()}

      {/* Period KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        {periods.map((p) => (
          <KPI
            key={p.label}
            label={`Scans (${p.label})`}
            value={scans.filter((s) => new Date(s.scanned_at) >= p.from).length}
            semantic="info"
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={sCard}>
          <div style={sLabel}>Scans by QR Type</div>
          {typeList.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: T.ink500,
                marginTop: 12,
                fontFamily: T.fontUi,
              }}
            >
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
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          fontFamily: T.fontUi,
                        }}
                      >
                        {s.qrType}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.fontData,
                        }}
                      >
                        {s.count} ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: T.ink150,
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: T.accent,
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
            <p
              style={{
                fontSize: 13,
                color: T.ink500,
                marginTop: 12,
                fontFamily: T.fontUi,
              }}
            >
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
                    borderBottom: `1px solid ${T.ink075}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        fontWeight: 700,
                        minWidth: 20,
                        fontFamily: T.fontData,
                      }}
                    >
                      #{i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: T.fontData,
                        color: T.ink500,
                      }}
                    >
                      {p.id.slice(0, 12)}…
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: T.fontData,
                      fontSize: 16,
                      fontWeight: 400,
                      color: T.ink900,
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
            <p
              style={{
                fontSize: 13,
                color: T.ink500,
                marginTop: 12,
                fontFamily: T.fontUi,
              }}
            >
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
                          color: T.ink900,
                          fontWeight: 500,
                          fontFamily: T.fontUi,
                        }}
                      >
                        {row.province}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.fontData,
                        }}
                      >
                        {row.count} · {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: T.ink150,
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: T.accentMid,
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
            <p
              style={{
                fontSize: 13,
                color: T.ink500,
                marginTop: 12,
                fontFamily: T.fontUi,
              }}
            >
              No data yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {outcomeList.map((row) => {
                const pct =
                  scans.length > 0
                    ? ((row.count / scans.length) * 100).toFixed(1)
                    : 0;
                const color = outcomeColor(row.outcome);
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
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color,
                          fontFamily: T.fontUi,
                        }}
                      >
                        {row.outcome.replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.fontData,
                        }}
                      >
                        {row.count} · {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: T.ink150,
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
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        <KPI label="Customers" value={customers} semantic={null} />
        <KPI
          label="Points Earned"
          value={totalEarned.toLocaleString()}
          semantic={null}
        />
        <KPI
          label="Points Redeemed"
          value={totalRedeemed.toLocaleString()}
          semantic={null}
        />
        <KPI
          label="Redemption Rate"
          value={
            totalEarned > 0
              ? `${((totalRedeemed / totalEarned) * 100).toFixed(1)}%`
              : "—"
          }
          semantic="info"
        />
        <KPI label="Loyalty Tx" value={data.loyalty.length} semantic={null} />
        <KPI
          label="Avg Pts/Customer"
          value={customers > 0 ? Math.round(totalEarned / customers) : "—"}
          semantic={null}
        />
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function KPI({ label, value, semantic, sub }) {
  const semC = {
    success: T.success,
    warning: T.warning,
    danger: T.danger,
    info: T.info,
  };
  const color = semantic ? semC[semantic] : T.ink900;
  return (
    <div style={{ background: "#fff", padding: "16px 18px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.ink400,
          marginBottom: 6,
          fontFamily: T.fontUi,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.fontData,
          fontSize: "24px",
          fontWeight: 400,
          color,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            color: T.ink500,
            fontSize: 10,
            marginTop: 2,
            fontFamily: T.fontUi,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function PipelineCard({ stage, items, color }) {
  return (
    <div
      style={{
        background: T.ink075,
        border: `1px solid ${T.ink150}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: 14,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color,
          marginBottom: 8,
          fontFamily: T.fontUi,
        }}
      >
        {stage}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 11,
            color: T.ink500,
            marginBottom: 4,
            fontFamily: T.fontUi,
          }}
        >
          {item.label}:{" "}
          <span
            style={{ fontFamily: T.fontData, fontWeight: 600, color: T.ink900 }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
