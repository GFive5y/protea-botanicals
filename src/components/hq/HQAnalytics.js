// src/components/hq/HQAnalytics.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// HQ ANALYTICS TAB — Phase 2E
//
// Purpose: Business intelligence — cross-shop, supply chain, production,
// distribution, and scan analytics. All read-only. Pulls from every table.
//
// Sub-tabs:
//   Overview     — KPIs: stock value, margins, production output, scan rate
//   Supply Chain — Supplier spend, PO pipeline, inventory health by category
//   Production   — Batch efficiency, yield, cost per unit, completion rates
//   Distribution — Shipment volume, delivery performance, top destinations
//   Scans        — Scan trends, source breakdown, top scanned products
//
// Tables read:
//   inventory_items, suppliers, purchase_orders, purchase_order_items,
//   stock_movements, production_batches, production_inputs,
//   shipments, shipment_items, scans, products, tenants,
//   loyalty_transactions, user_profiles
//
// Design: Cream aesthetic (Section 7 of handover).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  bg: "#faf9f6",
  warmBg: "#f4f0e8",
  primaryDark: "#1b4332",
  primaryMid: "#2d6a4f",
  accentGreen: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#888888",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c0392b",
  blue: "#2c4a6e",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ── Shared styles ─────────────────────────────────────────────────────────
const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};
const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accentGreen,
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function HQAnalytics() {
  const [subTab, setSubTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = {};

      // ── Inventory ──────────────────────────────────────────────
      try {
        const r = await supabase
          .from("inventory_items")
          .select(
            "id, name, sku, category, unit, quantity_on_hand, reorder_level, cost_price, sell_price, is_active, supplier_id",
          );
        result.inventory = (r.data || []).filter((i) => i.is_active);
      } catch (e) {
        console.warn("[Analytics] inventory:", e.message);
        result.inventory = [];
      }

      // ── Suppliers ──────────────────────────────────────────────
      try {
        const r = await supabase
          .from("suppliers")
          .select("id, name, country, is_active");
        result.suppliers = (r.data || []).filter((s) => s.is_active);
      } catch (e) {
        console.warn("[Analytics] suppliers:", e.message);
        result.suppliers = [];
      }

      // ── Purchase Orders ────────────────────────────────────────
      try {
        const r = await supabase
          .from("purchase_orders")
          .select(
            "id, po_number, supplier_id, status, subtotal, currency, order_date, received_date, created_at, purchase_order_items(*)",
          );
        result.purchaseOrders = r.data || [];
      } catch (e) {
        console.warn("[Analytics] POs:", e.message);
        result.purchaseOrders = [];
      }

      // ── Production Batches ─────────────────────────────────────
      try {
        const r = await supabase
          .from("production_batches")
          .select(
            "id, batch_code, strain_name, product_type, size_ml, target_quantity, actual_quantity, status, started_at, completed_at, created_at, production_inputs(*)",
          );
        result.batches = r.data || [];
      } catch (e) {
        console.warn("[Analytics] batches:", e.message);
        result.batches = [];
      }

      // ── Shipments ──────────────────────────────────────────────
      try {
        const r = await supabase
          .from("shipments")
          .select(
            "id, shipment_number, destination_name, destination_tenant_id, status, shipped_date, delivered_date, confirmed_date, created_at, shipment_items(*)",
          );
        result.shipments = r.data || [];
      } catch (e) {
        console.warn("[Analytics] shipments:", e.message);
        result.shipments = [];
      }

      // ── Scans ──────────────────────────────────────────────────
      try {
        const r = await supabase
          .from("scans")
          .select("id, product_id, source, scan_date")
          .order("scan_date", { ascending: false });
        result.scans = r.data || [];
      } catch (e) {
        console.warn("[Analytics] scans:", e.message);
        result.scans = [];
      }

      // ── Users ──────────────────────────────────────────────────
      try {
        const r = await supabase
          .from("user_profiles")
          .select("id, role, created_at");
        result.users = r.data || [];
      } catch (e) {
        console.warn("[Analytics] users:", e.message);
        result.users = [];
      }

      // ── Loyalty (only select columns known to exist) ────────
      try {
        const r = await supabase
          .from("loyalty_transactions")
          .select("points, transaction_type");
        if (r.error) {
          console.warn("[Analytics] loyalty error:", r.error.message);
          result.loyalty = [];
        } else {
          result.loyalty = r.data || [];
        }
      } catch (e) {
        console.warn("[Analytics] loyalty:", e.message);
        result.loyalty = [];
      }

      // ── Tenants ────────────────────────────────────────────────
      try {
        const r = await supabase
          .from("tenants")
          .select("id, name, type, is_active");
        result.tenants = r.data || [];
      } catch (e) {
        console.warn("[Analytics] tenants:", e.message);
        result.tenants = [];
      }

      setData(result);
    } catch (err) {
      console.error("[Analytics] Fatal:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const SUB_TABS = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "supply", label: "Supply Chain", icon: "📦" },
    { id: "production", label: "Production", icon: "🔧" },
    { id: "distribution", label: "Distribution", icon: "🚚" },
    { id: "scans", label: "Scans & Loyalty", icon: "📱" },
  ];

  if (error) {
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
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
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
          <span
            style={{
              background: "rgba(82,183,136,0.15)",
              color: C.accentGreen,
              padding: "2px 8px",
              borderRadius: "2px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Phase 2E
          </span>
        </div>
        <p
          style={{
            color: C.muted,
            fontSize: "13px",
            fontWeight: 300,
            margin: 0,
          }}
        >
          Cross-shop business intelligence — revenue, margins, production,
          distribution & scan analytics.
        </p>
      </div>

      {/* Sub-tabs */}
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
          Loading analytics...
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

      {/* Refresh */}
      <div style={{ marginTop: "24px", textAlign: "right" }}>
        <button
          onClick={fetchAll}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            padding: "8px 16px",
            cursor: "pointer",
            fontFamily: F.body,
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          ↻ Refresh Analytics
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW — Top-level KPIs
// ═══════════════════════════════════════════════════════════════════════════
function OverviewAnalytics({ data }) {
  const inv = data.inventory;
  const stockValue = inv.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.sell_price || 0),
    0,
  );
  const stockCost = inv.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.cost_price || 0),
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

  const completedBatches = data.batches.filter((b) => b.status === "completed");
  const totalFilled = completedBatches.reduce(
    (s, b) => s + (b.actual_quantity || 0),
    0,
  );

  const deliveredShipments = data.shipments.filter((s) =>
    ["delivered", "confirmed"].includes(s.status),
  );
  const totalShippedItems = deliveredShipments.reduce(
    (s, sh) =>
      s +
      (sh.shipment_items || []).reduce((is, i) => is + (i.quantity || 0), 0),
    0,
  );

  const totalScans = data.scans.length;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const scans7d = data.scans.filter(
    (s) => new Date(s.scan_date) >= sevenDaysAgo,
  ).length;
  const scans30d = data.scans.filter(
    (s) => new Date(s.scan_date) >= thirtyDaysAgo,
  ).length;

  const totalPointsIssued = data.loyalty
    .filter((t) =>
      ["EARNED", "earned", "EARNED_POINTS", "SCAN"].includes(
        t.transaction_type,
      ),
    )
    .reduce((s, t) => s + (t.points || 0), 0);

  const customers = data.users.filter((u) => u.role === "customer").length;
  const shops = data.tenants.filter(
    (t) => t.type === "shop" && t.is_active,
  ).length;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* KPI Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px",
        }}
      >
        <KPI
          label="Stock Value (Sell)"
          value={`R${stockValue.toLocaleString()}`}
          color={C.primaryDark}
        />
        <KPI
          label="Stock Cost"
          value={`R${stockCost.toLocaleString()}`}
          color={C.blue}
        />
        <KPI
          label="Potential Margin"
          value={`${potentialMargin}%`}
          color={C.accentGreen}
        />
        <KPI label="Active SKUs" value={inv.length} color={C.primaryMid} />
        <KPI
          label="Low Stock"
          value={lowStock.length}
          color={lowStock.length > 0 ? C.gold : C.accentGreen}
        />
        <KPI
          label="Out of Stock"
          value={outOfStock.length}
          color={outOfStock.length > 0 ? C.red : C.accentGreen}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px",
        }}
      >
        <KPI
          label="Batches Completed"
          value={completedBatches.length}
          color={C.accentGreen}
        />
        <KPI
          label="Units Produced"
          value={totalFilled.toLocaleString()}
          color={C.primaryDark}
        />
        <KPI
          label="Shipments Delivered"
          value={deliveredShipments.length}
          color={C.accentGreen}
        />
        <KPI
          label="Items Shipped"
          value={totalShippedItems.toLocaleString()}
          color={C.primaryDark}
        />
        <KPI label="Total Scans" value={totalScans} color={C.blue} />
        <KPI
          label="Scans (7d)"
          value={scans7d}
          sub="last 7 days"
          color={C.accentGreen}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px",
        }}
      >
        <KPI
          label="Scans (30d)"
          value={scans30d}
          sub="last 30 days"
          color={C.blue}
        />
        <KPI label="Customers" value={customers} color={C.primaryMid} />
        <KPI label="Active Shops" value={shops} color={C.gold} />
        <KPI
          label="Points Issued"
          value={totalPointsIssued.toLocaleString()}
          color={C.gold}
        />
        <KPI
          label="Suppliers"
          value={data.suppliers.length}
          color={C.primaryDark}
        />
        <KPI
          label="Purchase Orders"
          value={data.purchaseOrders.length}
          color={C.blue}
        />
      </div>

      {/* Pipeline summary */}
      <div style={sCard}>
        <div style={sLabel}>Full Supply Chain Pipeline</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          <PipelineCard
            stage="Procure"
            icon="📋"
            items={[
              {
                label: "Active POs",
                value: data.purchaseOrders.filter(
                  (p) => !["received", "cancelled"].includes(p.status),
                ).length,
              },
              { label: "Suppliers", value: data.suppliers.length },
            ]}
            color={C.blue}
          />
          <PipelineCard
            stage="Store"
            icon="📦"
            items={[
              { label: "SKUs", value: inv.length },
              { label: "Value", value: `R${stockValue.toLocaleString()}` },
            ]}
            color={C.primaryMid}
          />
          <PipelineCard
            stage="Produce"
            icon="🔧"
            items={[
              {
                label: "Active",
                value: data.batches.filter((b) => b.status === "in_progress")
                  .length,
              },
              { label: "Done", value: completedBatches.length },
            ]}
            color={C.gold}
          />
          <PipelineCard
            stage="Distribute"
            icon="🚚"
            items={[
              {
                label: "In transit",
                value: data.shipments.filter((s) =>
                  ["shipped", "in_transit"].includes(s.status),
                ).length,
              },
              { label: "Delivered", value: deliveredShipments.length },
            ]}
            color={C.accentGreen}
          />
          <PipelineCard
            stage="Scans"
            icon="📱"
            items={[
              { label: "Total", value: totalScans },
              { label: "7-day", value: scans7d },
            ]}
            color={C.primaryDark}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPLY CHAIN — Procurement & inventory analytics
// ═══════════════════════════════════════════════════════════════════════════
function SupplyChainAnalytics({ data }) {
  const inv = data.inventory;
  const pos = data.purchaseOrders;

  // Category breakdown
  const categories = {};
  inv.forEach((i) => {
    const cat = i.category || "uncategorised";
    if (!categories[cat])
      categories[cat] = { count: 0, value: 0, cost: 0, items: [] };
    categories[cat].count++;
    categories[cat].value += (i.quantity_on_hand || 0) * (i.sell_price || 0);
    categories[cat].cost += (i.quantity_on_hand || 0) * (i.cost_price || 0);
    categories[cat].items.push(i);
  });

  // PO status breakdown
  const poStatuses = {};
  pos.forEach((p) => {
    poStatuses[p.status] = (poStatuses[p.status] || 0) + 1;
  });

  // Supplier spend (from PO subtotals)
  const supplierSpend = {};
  pos
    .filter((p) => p.status === "received")
    .forEach((p) => {
      const suppId = p.supplier_id || "unknown";
      supplierSpend[suppId] = (supplierSpend[suppId] || 0) + (p.subtotal || 0);
    });
  const supplierSpendList = Object.entries(supplierSpend)
    .map(([id, total]) => ({
      id,
      name: data.suppliers.find((s) => s.id === id)?.name || "Unknown",
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // Top items by value
  const topByValue = [...inv]
    .map((i) => ({
      ...i,
      totalValue: (i.quantity_on_hand || 0) * (i.sell_price || 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 8);

  const CATEGORY_LABELS = {
    finished_product: "Finished Product",
    raw_material: "Raw Material",
    terpene: "Terpene",
    hardware: "Hardware",
    uncategorised: "Uncategorised",
  };
  const CATEGORY_COLORS = {
    finished_product: C.accentGreen,
    raw_material: C.blue,
    terpene: "#9b6b9e",
    hardware: C.gold,
    uncategorised: C.muted,
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Category breakdown */}
      <div style={sCard}>
        <div style={sLabel}>Inventory by Category</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginTop: "12px",
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
                  padding: "14px",
                  background: C.bg,
                  borderRadius: "2px",
                  borderLeft: `3px solid ${CATEGORY_COLORS[cat] || C.muted}`,
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: CATEGORY_COLORS[cat] || C.muted,
                    marginBottom: "4px",
                  }}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                <div
                  style={{
                    fontFamily: F.heading,
                    fontSize: "20px",
                    fontWeight: 600,
                    color: C.text,
                  }}
                >
                  {d.count} items
                </div>
                <div
                  style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}
                >
                  Value: R{d.value.toLocaleString()} · Cost: R
                  {d.cost.toLocaleString()} · Margin: {margin}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* PO Pipeline */}
        <div style={sCard}>
          <div style={sLabel}>Purchase Order Pipeline</div>
          <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
            {[
              "draft",
              "submitted",
              "confirmed",
              "shipped",
              "received",
              "cancelled",
            ].map((status) => {
              const count = poStatuses[status] || 0;
              const statusColors = {
                draft: C.muted,
                submitted: C.blue,
                confirmed: C.accentGreen,
                shipped: C.gold,
                received: C.primaryDark,
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
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: statusColors[status] || C.muted,
                      fontWeight: 600,
                    }}
                  >
                    {status}
                  </span>
                  <span
                    style={{
                      fontFamily: F.heading,
                      fontSize: "18px",
                      fontWeight: 600,
                      color: statusColors[status] || C.muted,
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Supplier Spend */}
        <div style={sCard}>
          <div style={sLabel}>Supplier Spend (Received POs)</div>
          {supplierSpendList.length === 0 ? (
            <p style={{ fontSize: "13px", color: C.muted, marginTop: "12px" }}>
              No received POs yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
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
                  <span
                    style={{ fontSize: "12px", fontWeight: 500, color: C.text }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontFamily: F.heading,
                      fontSize: "16px",
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

      {/* Top items by value */}
      <div style={sCard}>
        <div style={sLabel}>Top Items by Stock Value</div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "12px",
            fontSize: "12px",
            fontFamily: F.body,
          }}
        >
          <thead>
            <tr>
              <th style={sTh}>Item</th>
              <th style={sTh}>SKU</th>
              <th style={sTh}>Category</th>
              <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
              <th style={{ ...sTh, textAlign: "right" }}>Sell Price</th>
              <th style={{ ...sTh, textAlign: "right" }}>Total Value</th>
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
                    fontSize: "11px",
                    color: C.muted,
                  }}
                >
                  {i.sku}
                </td>
                <td style={sTd}>
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "2px",
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

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION — Batch efficiency & yield
// ═══════════════════════════════════════════════════════════════════════════
function ProductionAnalytics({ data }) {
  const batches = data.batches;
  const completed = batches.filter((b) => b.status === "completed");
  const inProgress = batches.filter((b) => b.status === "in_progress");
  const planned = batches.filter((b) => b.status === "planned");
  const cancelled = batches.filter((b) => b.status === "cancelled");

  const totalTarget = completed.reduce(
    (s, b) => s + (b.target_quantity || 0),
    0,
  );
  const totalActual = completed.reduce(
    (s, b) => s + (b.actual_quantity || 0),
    0,
  );
  const yieldRate =
    totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(1) : "—";

  const totalInputCost = completed.reduce(
    (s, b) =>
      s +
      (b.production_inputs || []).reduce(
        (is, inp) => is + (inp.total_cost || 0),
        0,
      ),
    0,
  );
  const costPerUnit =
    totalActual > 0 ? (totalInputCost / totalActual).toFixed(2) : "—";

  // Strain breakdown
  const strains = {};
  completed.forEach((b) => {
    const name = b.strain_name || "Unknown";
    if (!strains[name])
      strains[name] = { batches: 0, target: 0, actual: 0, cost: 0 };
    strains[name].batches++;
    strains[name].target += b.target_quantity || 0;
    strains[name].actual += b.actual_quantity || 0;
    strains[name].cost += (b.production_inputs || []).reduce(
      (s, inp) => s + (inp.total_cost || 0),
      0,
    );
  });
  const strainList = Object.entries(strains)
    .map(([name, d]) => ({
      name,
      ...d,
      yield: d.target > 0 ? ((d.actual / d.target) * 100).toFixed(1) : "—",
    }))
    .sort((a, b) => b.actual - a.actual);

  // Completion time (avg days from started_at to completed_at)
  const durations = completed
    .filter((b) => b.started_at && b.completed_at)
    .map((b) => (new Date(b.completed_at) - new Date(b.started_at)) / 86400000);
  const avgDuration =
    durations.length > 0
      ? (durations.reduce((s, d) => s + d, 0) / durations.length).toFixed(1)
      : "—";

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
        }}
      >
        <KPI
          label="Total Batches"
          value={batches.length}
          color={C.primaryDark}
        />
        <KPI label="Completed" value={completed.length} color={C.accentGreen} />
        <KPI label="In Progress" value={inProgress.length} color={C.gold} />
        <KPI label="Planned" value={planned.length} color={C.blue} />
        <KPI label="Cancelled" value={cancelled.length} color={C.red} />
        <KPI
          label="Yield Rate"
          value={`${yieldRate}%`}
          sub="actual vs target"
          color={C.accentGreen}
        />
        <KPI
          label="Units Produced"
          value={totalActual.toLocaleString()}
          color={C.primaryDark}
        />
        <KPI
          label="Cost/Unit"
          value={costPerUnit !== "—" ? `R${costPerUnit}` : "—"}
          sub="input cost"
          color={C.blue}
        />
        <KPI
          label="Total Input Cost"
          value={`R${totalInputCost.toLocaleString()}`}
          color={C.primaryMid}
        />
        <KPI
          label="Avg Completion"
          value={avgDuration !== "—" ? `${avgDuration}d` : "—"}
          sub="days"
          color={C.gold}
        />
      </div>

      {/* Strain breakdown */}
      {strainList.length > 0 && (
        <div style={sCard}>
          <div style={sLabel}>Production by Strain</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "12px",
              fontSize: "12px",
              fontFamily: F.body,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Strain</th>
                <th style={{ ...sTh, textAlign: "right" }}>Batches</th>
                <th style={{ ...sTh, textAlign: "right" }}>Target</th>
                <th style={{ ...sTh, textAlign: "right" }}>Actual</th>
                <th style={{ ...sTh, textAlign: "right" }}>Yield</th>
                <th style={{ ...sTh, textAlign: "right" }}>Input Cost</th>
                <th style={{ ...sTh, textAlign: "right" }}>Cost/Unit</th>
              </tr>
            </thead>
            <tbody>
              {strainList.map((s) => (
                <tr key={s.name}>
                  <td style={{ ...sTd, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ ...sTd, textAlign: "right" }}>{s.batches}</td>
                  <td style={{ ...sTd, textAlign: "right" }}>
                    {s.target.toLocaleString()}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontWeight: 600,
                      color: C.accentGreen,
                    }}
                  >
                    {s.actual.toLocaleString()}
                  </td>
                  <td style={{ ...sTd, textAlign: "right" }}>{s.yield}%</td>
                  <td style={{ ...sTd, textAlign: "right" }}>
                    R{s.cost.toLocaleString()}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      color: C.primaryDark,
                      fontWeight: 600,
                    }}
                  >
                    {s.actual > 0 ? `R${(s.cost / s.actual).toFixed(2)}` : "—"}
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

// ═══════════════════════════════════════════════════════════════════════════
// DISTRIBUTION — Shipment analytics
// ═══════════════════════════════════════════════════════════════════════════
function DistributionAnalytics({ data }) {
  const shipments = data.shipments;

  const statusCounts = {};
  shipments.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  // Destination breakdown
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

  // Delivery time (days from created to delivered)
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

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
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
          color={C.blue}
        />
        <KPI
          label="In Transit"
          value={(statusCounts.shipped || 0) + (statusCounts.in_transit || 0)}
          color={C.gold}
        />
        <KPI
          label="Delivered"
          value={(statusCounts.delivered || 0) + (statusCounts.confirmed || 0)}
          color={C.accentGreen}
        />
        <KPI
          label="Avg Delivery Time"
          value={avgDelivery !== "—" ? `${avgDelivery}d` : "—"}
          sub="days"
          color={C.gold}
        />
        <KPI
          label="Total Value Shipped"
          value={`R${totalShippedValue.toLocaleString()}`}
          color={C.primaryDark}
        />
      </div>

      {/* Destination breakdown */}
      {destList.length > 0 && (
        <div style={sCard}>
          <div style={sLabel}>Shipments by Destination</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "12px",
              fontSize: "12px",
              fontFamily: F.body,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Destination</th>
                <th style={{ ...sTh, textAlign: "right" }}>Shipments</th>
                <th style={{ ...sTh, textAlign: "right" }}>Items</th>
                <th style={{ ...sTh, textAlign: "right" }}>Value</th>
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

// ═══════════════════════════════════════════════════════════════════════════
// SCANS & LOYALTY — Engagement analytics
// ═══════════════════════════════════════════════════════════════════════════
function ScansAnalytics({ data }) {
  const scans = data.scans;
  const now = new Date();
  const periods = [
    {
      label: "Today",
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    },
    { label: "7 days", from: new Date(now.getTime() - 7 * 86400000) },
    { label: "30 days", from: new Date(now.getTime() - 30 * 86400000) },
    { label: "90 days", from: new Date(now.getTime() - 90 * 86400000) },
    { label: "All time", from: new Date(0) },
  ];

  // Source breakdown
  const sources = {};
  scans.forEach((s) => {
    const src = s.source || "unknown";
    sources[src] = (sources[src] || 0) + 1;
  });
  const sourceList = Object.entries(sources)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Top scanned products
  const products = {};
  scans.forEach((s) => {
    const pid = s.product_id || "unknown";
    products[pid] = (products[pid] || 0) + 1;
  });
  const topProducts = Object.entries(products)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Loyalty
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
      {/* Scan counts by period */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
        }}
      >
        {periods.map((p) => {
          const count = scans.filter(
            (s) => new Date(s.scan_date) >= p.from,
          ).length;
          return (
            <KPI
              key={p.label}
              label={`Scans (${p.label})`}
              value={count}
              color={C.accentGreen}
            />
          );
        })}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* Source breakdown */}
        <div style={sCard}>
          <div style={sLabel}>Scan Sources</div>
          {sourceList.length === 0 ? (
            <p style={{ fontSize: "13px", color: C.muted, marginTop: "12px" }}>
              No scan data yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
              {sourceList.map((s) => {
                const pct =
                  scans.length > 0
                    ? ((s.count / scans.length) * 100).toFixed(1)
                    : 0;
                return (
                  <div
                    key={s.source}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "2px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: C.text,
                          }}
                        >
                          {s.source}
                        </span>
                        <span style={{ fontSize: "11px", color: C.muted }}>
                          {s.count} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: "4px",
                          background: C.border,
                          borderRadius: "2px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: C.accentGreen,
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top scanned products */}
        <div style={sCard}>
          <div style={sLabel}>Top Scanned Products</div>
          {topProducts.length === 0 ? (
            <p style={{ fontSize: "13px", color: C.muted, marginTop: "12px" }}>
              No scan data yet
            </p>
          ) : (
            <div style={{ display: "grid", gap: "6px", marginTop: "12px" }}>
              {topProducts.map((p, i) => (
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: C.muted,
                        fontWeight: 600,
                        minWidth: "20px",
                      }}
                    >
                      #{i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: C.text,
                        fontFamily: "monospace",
                      }}
                    >
                      {p.id.slice(0, 12)}…
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: F.heading,
                      fontSize: "16px",
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

      {/* Loyalty stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
        }}
      >
        <KPI label="Total Customers" value={customers} color={C.primaryMid} />
        <KPI
          label="Points Earned"
          value={totalEarned.toLocaleString()}
          color={C.gold}
        />
        <KPI
          label="Points Redeemed"
          value={totalRedeemed.toLocaleString()}
          color={C.accentGreen}
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
          label="Loyalty Transactions"
          value={data.loyalty.length}
          color={C.primaryDark}
        />
        <KPI
          label="Avg Points/Customer"
          value={customers > 0 ? Math.round(totalEarned / customers) : "—"}
          color={C.gold}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function KPI({ label, value, color, sub }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: "2px",
        padding: "14px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: F.heading,
          fontSize: "26px",
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: C.muted, fontSize: "10px", marginTop: "2px" }}>
          {sub}
        </div>
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
        borderRadius: "2px",
        padding: "14px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color,
          marginBottom: "8px",
        }}
      >
        {stage}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{ fontSize: "11px", color: C.muted, marginBottom: "2px" }}
        >
          {item.label}:{" "}
          <span style={{ fontWeight: 600, color: C.text }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
