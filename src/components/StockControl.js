// src/components/StockControl.js v1.5
// WP-GUIDE-C: InfoTooltip injected — shop-visibility on Sell Price column
// v1.4 — Admin PO Detail Modal (OrdersView):
//         - PO cards are now clickable -> opens full detail slide-in panel
//         - Admin has full status control over ALL POs including cancelled
//           (can un-cancel back to any status)
//         - Edit notes, expected_date, supplier_invoice_ref, usd_zar_rate inline
//         - Line items table with qty, unit price, line EXW, landed/unit ZAR
//         - "Open in Procurement" redirect note for shipping management
//         - fetchAll query upgraded to include supplier_products on line items
// v1.3 — Item History Drilldown
// v1.2 — WP-K: Publish to Shop
// v1.1 — WP-I: Document source badge
// v1.0 — Protea Botanicals — Inventory Management System (WP5.1)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "./WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import InfoTooltip from "./InfoTooltip";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  white: "#fff",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  error: "#c0392b",
  red: "#e74c3c",
  blue: "#2c4a6e",
  purple: "#6c3483",
  lightPurple: "#f5eef8",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: "4px",
  fontFamily: F.body,
};
const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background: v === "primary" ? C.green : "transparent",
  color: v === "primary" ? C.white : C.mid,
  border: v === "primary" ? "none" : `1px solid ${C.mid}`,
  borderRadius: "2px",
  fontSize: "10px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: F.body,
  transition: "all 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  fontSize: "13px",
  fontFamily: F.body,
  background: C.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };
const sTable = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
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
};

const CATEGORY_LABELS = {
  finished_product: "Finished Product",
  raw_material: "Raw Material",
  terpene: "Terpene",
  hardware: "Hardware",
};
const CATEGORY_COLORS = {
  finished_product: C.accent,
  raw_material: C.blue,
  terpene: "#9b6b9e",
  hardware: C.gold,
};
const UNIT_LABELS = { pcs: "pcs", ml: "ml", g: "g", bottles: "bottles" };
const MOVEMENT_LABELS = {
  purchase_in: "Purchase In",
  sale_out: "Sale Out",
  adjustment: "Adjustment",
  waste: "Waste",
  transfer: "Transfer",
  production_in: "Production In",
  production_out: "Production Out",
};

const ALL_PO_STATUSES = [
  { id: "draft", label: "Draft", color: C.muted },
  { id: "submitted", label: "Submitted", color: C.blue },
  { id: "confirmed", label: "Confirmed", color: C.accent },
  { id: "shipped", label: "Shipped", color: C.gold },
  { id: "received", label: "Received", color: C.green },
  { id: "complete", label: "Complete", color: "#00695C" },
  { id: "cancelled", label: "Cancelled", color: C.red },
];
const PO_STATUS_COLORS = ALL_PO_STATUSES.reduce((a, s) => {
  a[s.id] = s.color;
  return a;
}, {});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isDocumentSourced(m) {
  if (!m) return false;
  const n = (m.notes || "").toLowerCase(),
    r = (m.reference || "").toLowerCase();
  return (
    n.includes("document") ||
    n.includes("ingested") ||
    n.includes("ai extracted") ||
    UUID_PATTERN.test(r)
  );
}
function buildDocSourceMap(movements) {
  const map = {};
  for (const m of movements) {
    if (isDocumentSourced(m)) {
      const e = map[m.item_id];
      if (!e || new Date(m.created_at) > new Date(e.created_at))
        map[m.item_id] = m;
    }
  }
  return map;
}
function DocumentSourceBadge({ movement }) {
  if (!movement) return null;
  return (
    <span
      title={`Doc ingestion ${new Date(movement.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
      style={{
        fontSize: "9px",
        padding: "1px 6px",
        borderRadius: 20,
        background: C.lightPurple,
        color: C.purple,
        border: `1px solid ${C.purple}`,
        fontWeight: 700,
        letterSpacing: "0.08em",
        fontFamily: F.body,
        whiteSpace: "nowrap",
        cursor: "default",
      }}
    >
      🔬 DOC
    </span>
  );
}
function LiveShopBadge() {
  return (
    <span
      title="Live in customer shop"
      style={{
        fontSize: "9px",
        padding: "2px 7px",
        borderRadius: "20px",
        background: "#d4edda",
        color: C.green,
        border: `1px solid ${C.accent}`,
        fontWeight: 700,
        letterSpacing: "0.08em",
        fontFamily: F.body,
        whiteSpace: "nowrap",
        cursor: "default",
        marginLeft: "6px",
      }}
    >
      🛍 LIVE
    </span>
  );
}
function isLiveInShop(item) {
  return (
    item.category === "finished_product" &&
    parseFloat(item.sell_price || 0) > 0 &&
    parseFloat(item.quantity_on_hand || 0) > 0
  );
}

export default function StockControl() {
  const [subTab, setSubTab] = useState("overview");
  const [items, setItems] = useState([]);
  const ctx = usePageContext("admin-stock", null);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [iR, mR, sR, oR] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("*, suppliers(name)")
          .order("name"),
        supabase
          .from("stock_movements")
          .select("*, inventory_items(name, sku)")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("suppliers").select("*").order("name"),
        supabase
          .from("purchase_orders")
          .select(
            "*, suppliers(name, country, currency), purchase_order_items(*, supplier_products(name, sku, category))",
          )
          .order("created_at", { ascending: false }),
      ]);
      if (iR.error) throw iR.error;
      if (mR.error) throw mR.error;
      if (sR.error) throw sR.error;
      if (oR.error) throw oR.error;
      setItems(iR.data || []);
      setMovements(mR.data || []);
      setSuppliers(sR.data || []);
      setOrders(oR.data || []);
    } catch (err) {
      console.error("[StockControl] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const TABS = [
    { id: "overview", label: "Overview", icon: "◎" },
    { id: "items", label: "Items", icon: "◈" },
    { id: "movements", label: "Movements", icon: "↕" },
    { id: "orders", label: "Purchase Orders", icon: "📋" },
    { id: "suppliers", label: "Suppliers", icon: "🏭" },
  ];

  if (error)
    return (
      <div
        style={{
          ...sCard,
          borderLeft: `3px solid ${C.error}`,
          margin: "20px 0",
        }}
      >
        <div style={sLabel}>Error</div>
        <p style={{ fontSize: "13px", color: C.error }}>{error}</p>
        <button onClick={fetchAll} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );

  return (
    <div>
      <WorkflowGuide
        context={ctx}
        tabId="admin-stock"
        onAction={() => {}}
        defaultOpen={true}
      />
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "8px 16px",
              background: subTab === t.id ? C.green : C.white,
              color: subTab === t.id ? C.white : C.muted,
              border: `1px solid ${subTab === t.id ? C.green : C.border}`,
              borderRadius: "2px",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: F.body,
              fontWeight: subTab === t.id ? 600 : 400,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>◎</div>Loading
          stock data...
        </div>
      ) : (
        <>
          {subTab === "overview" && (
            <OverviewView items={items} movements={movements} orders={orders} />
          )}
          {subTab === "items" && (
            <ItemsView
              items={items}
              suppliers={suppliers}
              movements={movements}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "movements" && (
            <MovementsView
              movements={movements}
              items={items}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "orders" && (
            <OrdersView
              orders={orders}
              suppliers={suppliers}
              items={items}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "suppliers" && (
            <SuppliersView suppliers={suppliers} onRefresh={fetchAll} />
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div
      style={{ ...sCard, borderTop: `3px solid ${color}`, textAlign: "center" }}
    >
      <div
        style={{
          fontSize: "9px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color,
          fontFamily: F.heading,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>
        {sub}
      </div>
    </div>
  );
}

function OverviewView({ items, movements, orders }) {
  const active = items.filter((i) => i.is_active);
  const lowStock = active.filter(
    (i) => i.quantity_on_hand <= i.reorder_level && i.reorder_level > 0,
  );
  const outOfStock = active.filter((i) => i.quantity_on_hand <= 0);
  const totalValue = active.reduce(
    (s, i) => s + i.quantity_on_hand * i.sell_price,
    0,
  );
  const totalCost = active.reduce(
    (s, i) => s + i.quantity_on_hand * i.cost_price,
    0,
  );
  const pendingPOs = orders.filter(
    (o) =>
      !["received", "cancelled", "complete"].includes(o.po_status || o.status),
  );
  const liveCount = active.filter(isLiveInShop).length;
  const catBreak = {};
  active.forEach((i) => {
    if (!catBreak[i.category]) catBreak[i.category] = { count: 0, value: 0 };
    catBreak[i.category].count++;
    catBreak[i.category].value += i.quantity_on_hand * i.sell_price;
  });
  const recent = movements.slice(0, 8);

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Total SKUs"
          value={active.length}
          sub="Active items"
          color={C.accent}
        />
        <StatCard
          label="Stock Value (Sell)"
          value={`R${totalValue.toLocaleString()}`}
          sub="At sell prices"
          color={C.green}
        />
        <StatCard
          label="Stock Cost"
          value={`R${totalCost.toLocaleString()}`}
          sub="At cost prices"
          color={C.blue}
        />
        <StatCard
          label="Low Stock"
          value={lowStock.length}
          sub="Below reorder level"
          color={lowStock.length > 0 ? C.gold : C.accent}
        />
        <StatCard
          label="Out of Stock"
          value={outOfStock.length}
          sub="Zero quantity"
          color={outOfStock.length > 0 ? C.red : C.accent}
        />
        <StatCard
          label="Open POs"
          value={pendingPOs.length}
          sub="Not yet received"
          color={C.blue}
        />
        <StatCard
          label="Live in Shop"
          value={liveCount}
          sub="Customer-facing"
          color={liveCount > 0 ? C.accent : C.muted}
        />
      </div>
      {lowStock.length > 0 && (
        <div style={{ ...sCard, borderLeft: `3px solid ${C.gold}` }}>
          <div style={sLabel}>⚠ Low Stock Alerts</div>
          {lowStock.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>
                  {item.name}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: C.muted,
                    marginLeft: "8px",
                  }}
                >
                  {item.sku}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: item.quantity_on_hand <= 0 ? C.red : C.gold,
                  }}
                >
                  {item.quantity_on_hand} {UNIT_LABELS[item.unit]}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: C.muted,
                    marginLeft: "8px",
                  }}
                >
                  (min: {item.reorder_level})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={sCard}>
        <div style={sLabel}>Stock by Category</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginTop: "12px",
          }}
        >
          {Object.entries(catBreak).map(([cat, d]) => (
            <div
              key={cat}
              style={{
                padding: "12px",
                background: C.cream,
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
                  fontSize: "18px",
                  fontWeight: 600,
                  fontFamily: F.heading,
                }}
              >
                {d.count} items
              </div>
              <div style={{ fontSize: "11px", color: C.muted }}>
                R{d.value.toLocaleString()} value
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={sCard}>
        <div style={sLabel}>Recent Stock Movements</div>
        {recent.length === 0 ? (
          <p style={{ fontSize: "13px", color: C.muted, marginTop: "12px" }}>
            No movements recorded yet.
          </p>
        ) : (
          <table style={{ ...sTable, marginTop: "12px" }}>
            <thead>
              <tr>
                <th style={sTh}>Date</th>
                <th style={sTh}>Item</th>
                <th style={sTh}>Type</th>
                <th style={{ ...sTh, textAlign: "right" }}>Qty</th>
                <th style={sTh}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.id}>
                  <td style={sTd}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td style={sTd}>{m.inventory_items?.name || "—"}</td>
                  <td style={sTd}>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 8px",
                        borderRadius: "2px",
                        background: m.quantity >= 0 ? "#d4edda" : "#fde8e8",
                        color: m.quantity >= 0 ? C.green : C.red,
                      }}
                    >
                      {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                    </span>
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontWeight: 600,
                      color: m.quantity >= 0 ? C.green : C.red,
                    }}
                  >
                    {m.quantity >= 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td style={{ ...sTd, color: C.muted }}>
                    {m.reference || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ItemsView({ items, suppliers, movements, onRefresh }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const docSourceMap = buildDocSourceMap(movements);
  const filtered = items.filter((i) => {
    if (filter !== "all" && i.category !== filter) return false;
    if (
      search &&
      !i.name.toLowerCase().includes(search.toLowerCase()) &&
      !i.sku.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return i.is_active;
  });
  const liveCount = filtered.filter(isLiveInShop).length;
  const margin = (item) => {
    if (!item.cost_price || !item.sell_price) return null;
    return (
      ((item.sell_price - item.cost_price) / item.sell_price) *
      100
    ).toFixed(1);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase
          .from("inventory_items")
          .update(formData)
          .eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert(formData);
        if (error) throw error;
      }
      setShowForm(false);
      setEditItem(null);
      onRefresh();
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };
  const handleDeactivate = async (item) => {
    if (!window.confirm(`Deactivate "${item.name}"?`)) return;
    const { error } = await supabase
      .from("inventory_items")
      .update({ is_active: false })
      .eq("id", item.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    onRefresh();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...sInput, width: "240px" }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...sSelect, width: "180px" }}
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            setEditItem(null);
            setShowForm(true);
          }}
          style={sBtn()}
        >
          + Add Item
        </button>
      </div>
      {showForm && (
        <ItemForm
          item={editItem}
          suppliers={suppliers}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditItem(null);
          }}
          saving={saving}
        />
      )}
      <div style={{ ...sCard, padding: "0", overflow: "auto" }}>
        <table style={sTable}>
          <thead>
            <tr>
              <th style={sTh}>SKU</th>
              <th style={sTh}>Name</th>
              <th style={sTh}>Category</th>
              <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
              <th style={{ ...sTh, textAlign: "right" }}>Reorder</th>
              <th style={{ ...sTh, textAlign: "right" }}>Cost</th>
              <th style={{ ...sTh, textAlign: "right" }}>
                {/* WP-GUIDE-C: shop-visibility tooltip */}
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                  }}
                >
                  Sell <InfoTooltip id="shop-visibility" />
                </span>
              </th>
              <th style={{ ...sTh, textAlign: "right" }}>Margin</th>
              <th style={sTh}>Supplier</th>
              <th style={sTh}>Source</th>
              <th style={sTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan="11"
                  style={{
                    ...sTd,
                    textAlign: "center",
                    color: C.muted,
                    padding: "40px",
                  }}
                >
                  No items found
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isLow =
                  item.reorder_level > 0 &&
                  item.quantity_on_hand <= item.reorder_level;
                const isOut = item.quantity_on_hand <= 0;
                const live = isLiveInShop(item);
                return (
                  <tr key={item.id}>
                    <td
                      style={{
                        ...sTd,
                        fontSize: "11px",
                        fontFamily: "monospace",
                        color: C.muted,
                      }}
                    >
                      {item.sku}
                    </td>
                    <td style={{ ...sTd, fontWeight: 500 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        {item.name}
                        {live && <LiveShopBadge />}
                      </div>
                    </td>
                    <td style={sTd}>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "2px 8px",
                          borderRadius: "2px",
                          background: `${CATEGORY_COLORS[item.category]}18`,
                          color: CATEGORY_COLORS[item.category],
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontWeight: 600,
                        color: isOut ? C.red : isLow ? C.gold : C.text,
                      }}
                    >
                      {item.quantity_on_hand} {UNIT_LABELS[item.unit]}
                      {isOut && <span style={{ marginLeft: "4px" }}>⛔</span>}
                      {isLow && !isOut && (
                        <span style={{ marginLeft: "4px" }}>⚠️</span>
                      )}
                    </td>
                    <td style={{ ...sTd, textAlign: "right", color: C.muted }}>
                      {item.reorder_level}
                    </td>
                    <td style={{ ...sTd, textAlign: "right" }}>
                      R{(item.cost_price || 0).toFixed(2)}
                    </td>
                    <td style={{ ...sTd, textAlign: "right", fontWeight: 500 }}>
                      R{(item.sell_price || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        color: margin(item) ? C.accent : C.muted,
                      }}
                    >
                      {margin(item) ? `${margin(item)}%` : "—"}
                    </td>
                    <td style={{ ...sTd, fontSize: "12px", color: C.muted }}>
                      {item.suppliers?.name || "—"}
                    </td>
                    <td style={sTd}>
                      <DocumentSourceBadge
                        movement={docSourceMap[item.id] || null}
                      />
                    </td>
                    <td style={sTd}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => setHistoryItem(item)}
                          style={{
                            ...sBtn("outline"),
                            padding: "4px 10px",
                            fontSize: "9px",
                            color: C.blue,
                            borderColor: C.blue,
                          }}
                          title="View history"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => {
                            setEditItem(item);
                            setShowForm(true);
                          }}
                          style={{
                            ...sBtn("outline"),
                            padding: "4px 10px",
                            fontSize: "9px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeactivate(item)}
                          style={{
                            ...sBtn("outline"),
                            padding: "4px 10px",
                            fontSize: "9px",
                            color: C.red,
                            borderColor: C.red,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div
        style={{
          fontSize: "11px",
          color: C.muted,
          marginTop: "12px",
          textAlign: "right",
        }}
      >
        Showing {filtered.length} of {items.filter((i) => i.is_active).length}{" "}
        active items
        {liveCount > 0 && (
          <span style={{ marginLeft: 12, color: C.green }}>
            · 🛍 {liveCount} live in shop
          </span>
        )}
        {Object.keys(docSourceMap).length > 0 && (
          <span style={{ marginLeft: 12, color: C.purple }}>
            · 🔬 {Object.keys(docSourceMap).length} via doc ingestion
          </span>
        )}
      </div>
      {historyItem && (
        <ItemHistoryModal
          item={historyItem}
          movements={movements.filter((m) => m.item_id === historyItem.id)}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </div>
  );
}

function ItemHistoryModal({ item, movements, onClose }) {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
  let running = 0;
  const rows = sorted.map((m) => {
    running += parseFloat(m.quantity || 0);
    return { ...m, runningBalance: running };
  });
  const display = [...rows].reverse();
  const totalIn = sorted
    .filter((m) => m.quantity > 0)
    .reduce((s, m) => s + parseFloat(m.quantity), 0);
  const totalOut = sorted
    .filter((m) => m.quantity < 0)
    .reduce((s, m) => s + parseFloat(m.quantity), 0);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(640px, 100vw)",
          height: "100vh",
          background: C.white,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${C.border}`,
            background: C.cream,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ ...sLabel }}>Stock Audit Trail</div>
              <div
                style={{
                  fontFamily: F.heading,
                  fontSize: "22px",
                  fontWeight: 400,
                  color: C.green,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  color: C.muted,
                  marginTop: "2px",
                }}
              >
                {item.sku} · {CATEGORY_LABELS[item.category]} · {item.unit}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: C.muted,
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Current Stock",
                value: `${item.quantity_on_hand} ${item.unit}`,
                color: item.quantity_on_hand <= 0 ? C.red : C.green,
                big: true,
              },
              {
                label: "Total In",
                value: `+${totalIn.toFixed(2)}`,
                color: C.green,
              },
              { label: "Total Out", value: totalOut.toFixed(2), color: C.red },
              { label: "Movements", value: movements.length, color: C.muted },
              {
                label: "Cost Price",
                value: `R${(item.cost_price || 0).toFixed(2)}`,
                color: C.gold,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: "2px",
                  padding: "10px 14px",
                  minWidth: "90px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: C.muted,
                    fontFamily: F.body,
                    marginBottom: "4px",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: s.big ? "20px" : "16px",
                    fontWeight: 600,
                    fontFamily: F.heading,
                    color: s.color,
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {display.length === 0 ? (
            <div
              style={{
                padding: "48px",
                textAlign: "center",
                color: C.muted,
                fontSize: "13px",
              }}
            >
              No movements recorded yet.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                fontFamily: F.body,
              }}
            >
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    background: C.warm,
                    zIndex: 1,
                  }}
                >
                  <th style={{ ...sTh, padding: "10px 16px" }}>Date & Time</th>
                  <th style={{ ...sTh, padding: "10px 8px" }}>Type</th>
                  <th
                    style={{ ...sTh, textAlign: "right", padding: "10px 8px" }}
                  >
                    Qty
                  </th>
                  <th
                    style={{ ...sTh, textAlign: "right", padding: "10px 8px" }}
                  >
                    Balance
                  </th>
                  <th style={{ ...sTh, padding: "10px 8px" }}>Reference</th>
                  <th style={{ ...sTh, padding: "10px 16px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {display.map((m, i) => (
                  <tr
                    key={m.id}
                    style={{ background: i % 2 === 0 ? C.white : "#fafaf8" }}
                  >
                    <td
                      style={{ ...sTd, padding: "10px 16px", fontSize: "11px" }}
                    >
                      <div style={{ color: C.text, fontWeight: 500 }}>
                        {new Date(m.created_at).toLocaleDateString("en-ZA")}
                      </div>
                      <div style={{ fontSize: "10px", color: C.muted }}>
                        {new Date(m.created_at).toLocaleTimeString("en-ZA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td style={{ ...sTd, padding: "10px 8px" }}>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "2px 8px",
                          borderRadius: "2px",
                          background: m.quantity >= 0 ? "#d4edda" : "#fde8e8",
                          color: m.quantity >= 0 ? C.green : C.red,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        padding: "10px 8px",
                        fontWeight: 700,
                        fontSize: "13px",
                        color: m.quantity >= 0 ? C.green : C.red,
                        fontFamily: F.heading,
                      }}
                    >
                      {m.quantity >= 0 ? "+" : ""}
                      {parseFloat(m.quantity).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        padding: "10px 8px",
                        fontWeight: 600,
                        fontSize: "13px",
                        fontFamily: F.heading,
                        color: m.runningBalance <= 0 ? C.red : C.text,
                      }}
                    >
                      {m.runningBalance.toFixed(2)}
                      <span
                        style={{
                          fontSize: "9px",
                          color: C.muted,
                          marginLeft: "3px",
                          fontFamily: F.body,
                          fontWeight: 400,
                        }}
                      >
                        {item.unit}
                      </span>
                    </td>
                    <td
                      style={{
                        ...sTd,
                        padding: "10px 8px",
                        fontSize: "11px",
                        color: C.blue,
                        fontFamily: "monospace",
                      }}
                    >
                      {m.reference || "—"}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        padding: "10px 16px",
                        fontSize: "11px",
                        color: C.muted,
                        maxWidth: "180px",
                      }}
                    >
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={m.notes || ""}
                      >
                        {m.notes || "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${C.border}`,
            background: C.cream,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11px", color: C.muted }}>
            {movements.length} total · balance:{" "}
            <strong>
              {item.quantity_on_hand} {item.unit}
            </strong>
          </span>
          <button onClick={onClose} style={sBtn()}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemForm({ item, suppliers, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    sku: item?.sku || "",
    name: item?.name || "",
    category: item?.category || "finished_product",
    unit: item?.unit || "pcs",
    description: item?.description || "",
    quantity_on_hand: item?.quantity_on_hand || 0,
    reorder_level: item?.reorder_level || 0,
    cost_price: item?.cost_price || 0,
    sell_price: item?.sell_price || 0,
    supplier_id: item?.supplier_id || "",
    batch_number: item?.batch_number || "",
    expiry_date: item?.expiry_date || "",
    strain_id: item?.strain_id || "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const handleSubmit = () => {
    if (!form.sku.trim() || !form.name.trim()) {
      alert("SKU and Name are required.");
      return;
    }
    onSave({
      ...form,
      quantity_on_hand: parseFloat(form.quantity_on_hand) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
      strain_id: form.strain_id || null,
    });
  };
  const fr = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  };
  const lbl = (t) => (
    <label
      style={{
        fontSize: "11px",
        color: C.muted,
        display: "block",
        marginBottom: "4px",
      }}
    >
      {t}
    </label>
  );
  const willBeLive =
    form.category === "finished_product" &&
    parseFloat(form.sell_price || 0) > 0 &&
    parseFloat(form.quantity_on_hand || 0) > 0;
  return (
    <div
      style={{
        ...sCard,
        marginBottom: "20px",
        borderLeft: `3px solid ${C.accent}`,
      }}
    >
      <div style={{ ...sLabel, marginBottom: "16px" }}>
        {item ? "Edit Item" : "Add New Item"}
      </div>
      <div style={fr}>
        <div>
          {lbl("SKU *")}
          <input
            style={sInput}
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="e.g. FP-CART-PE"
          />
        </div>
        <div>
          {lbl("Name *")}
          <input
            style={sInput}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Category")}
          <select
            style={sSelect}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          {lbl("Unit")}
          <select
            style={sSelect}
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
          >
            {Object.entries(UNIT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Quantity On Hand")}
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.quantity_on_hand}
            onChange={(e) => set("quantity_on_hand", e.target.value)}
          />
        </div>
        <div>
          {lbl("Reorder Level")}
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.reorder_level}
            onChange={(e) => set("reorder_level", e.target.value)}
          />
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Cost Price (ZAR)")}
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.cost_price}
            onChange={(e) => set("cost_price", e.target.value)}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Sell Price (ZAR)
            {form.category === "finished_product" && (
              <span style={{ marginLeft: 6, fontSize: "9px", color: C.accent }}>
                ← shown in shop
              </span>
            )}
          </label>
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.sell_price}
            onChange={(e) => set("sell_price", e.target.value)}
          />
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Supplier")}
          <select
            style={sSelect}
            value={form.supplier_id}
            onChange={(e) => set("supplier_id", e.target.value)}
          >
            <option value="">— None —</option>
            {suppliers
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          {lbl("Batch Number")}
          <input
            style={sInput}
            value={form.batch_number}
            onChange={(e) => set("batch_number", e.target.value)}
          />
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Expiry Date")}
          <input
            style={sInput}
            type="date"
            value={form.expiry_date}
            onChange={(e) => set("expiry_date", e.target.value)}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Strain ID
            {form.category === "finished_product" && (
              <span style={{ marginLeft: 6, fontSize: "9px", color: C.accent }}>
                ← links to shop profile
              </span>
            )}
          </label>
          <input
            style={sInput}
            value={form.strain_id}
            onChange={(e) => set("strain_id", e.target.value)}
            placeholder="e.g. pineapple-express"
          />
        </div>
      </div>
      <div style={{ marginBottom: "12px" }}>
        {lbl("Description")}
        <textarea
          style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      {form.category === "finished_product" && (
        <div
          style={{
            background: willBeLive ? "#f0faf5" : "#fdf9f0",
            border: `1px solid ${willBeLive ? C.accent : C.gold}`,
            borderLeft: `4px solid ${willBeLive ? C.accent : C.gold}`,
            borderRadius: "2px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: willBeLive ? C.green : C.gold,
              fontFamily: F.body,
              marginBottom: "8px",
              fontWeight: 700,
            }}
          >
            🛍 Shop Listing
          </div>
          {willBeLive ? (
            <div style={{ fontSize: "13px", fontWeight: 600, color: C.green }}>
              ✓ Will appear in customer shop — R
              {parseFloat(form.sell_price).toLocaleString("en-ZA", {
                minimumFractionDigits: 2,
              })}{" "}
              · {form.quantity_on_hand} {form.unit}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: C.muted }}>
              ⚠ Not yet live — requires: category = finished_product · sell
              price &gt; R0 · stock &gt; 0
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={sBtn("outline")}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} style={sBtn()}>
          {saving ? "Saving..." : item ? "Update Item" : "Create Item"}
        </button>
      </div>
    </div>
  );
}

function MovementsView({ movements, items, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    item_id: "",
    quantity: "",
    movement_type: "purchase_in",
    reference: "",
    notes: "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const handleRecord = async () => {
    if (!form.item_id || !form.quantity) {
      alert("Select an item and enter quantity.");
      return;
    }
    setSaving(true);
    try {
      const qty = parseFloat(form.quantity);
      const isOut = ["sale_out", "waste", "production_out"].includes(
        form.movement_type,
      );
      const finalQty = isOut ? -Math.abs(qty) : Math.abs(qty);
      const { error: mE } = await supabase
        .from("stock_movements")
        .insert({
          item_id: form.item_id,
          quantity: finalQty,
          movement_type: form.movement_type,
          reference: form.reference || null,
          notes: form.notes || null,
        });
      if (mE) throw mE;
      const item = items.find((i) => i.id === form.item_id);
      if (item) {
        const { error: uE } = await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: (item.quantity_on_hand || 0) + finalQty })
          .eq("id", form.item_id);
        if (uE) throw uE;
      }
      setShowForm(false);
      setForm({
        item_id: "",
        quantity: "",
        movement_type: "purchase_in",
        reference: "",
        notes: "",
      });
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "11px", color: C.muted }}>
          {movements.length} movements recorded
        </div>
        <button onClick={() => setShowForm(!showForm)} style={sBtn()}>
          {showForm ? "Cancel" : "+ Record Movement"}
        </button>
      </div>
      {showForm && (
        <div
          style={{
            ...sCard,
            marginBottom: "20px",
            borderLeft: `3px solid ${C.accent}`,
          }}
        >
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Record Stock Movement
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Item *
              </label>
              <select
                style={sSelect}
                value={form.item_id}
                onChange={(e) => set("item_id", e.target.value)}
              >
                <option value="">— Select Item —</option>
                {items
                  .filter((i) => i.is_active)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.sku})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Movement Type
              </label>
              <select
                style={sSelect}
                value={form.movement_type}
                onChange={(e) => set("movement_type", e.target.value)}
              >
                {Object.entries(MOVEMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Quantity *
              </label>
              <input
                style={sInput}
                type="number"
                step="0.01"
                placeholder="e.g. 50"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Reference
              </label>
              <input
                style={sInput}
                placeholder="PO number, order #, etc."
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                color: C.muted,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Notes
            </label>
            <input
              style={sInput}
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "16px",
            }}
          >
            <button onClick={handleRecord} disabled={saving} style={sBtn()}>
              {saving ? "Recording..." : "Record Movement"}
            </button>
          </div>
        </div>
      )}
      <div style={{ ...sCard, padding: "0", overflow: "auto" }}>
        <table style={sTable}>
          <thead>
            <tr>
              <th style={sTh}>Date</th>
              <th style={sTh}>Item</th>
              <th style={sTh}>SKU</th>
              <th style={sTh}>Type</th>
              <th style={{ ...sTh, textAlign: "right" }}>Quantity</th>
              <th style={sTh}>Reference</th>
              <th style={sTh}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    ...sTd,
                    textAlign: "center",
                    color: C.muted,
                    padding: "40px",
                  }}
                >
                  No movements recorded yet
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td style={{ ...sTd, fontWeight: 500 }}>
                    {m.inventory_items?.name || "—"}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: C.muted,
                    }}
                  >
                    {m.inventory_items?.sku || "—"}
                  </td>
                  <td style={sTd}>
                    <div
                      style={{ display: "flex", gap: 4, alignItems: "center" }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "2px",
                          background: m.quantity >= 0 ? "#d4edda" : "#fde8e8",
                          color: m.quantity >= 0 ? C.green : C.red,
                        }}
                      >
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                      {isDocumentSourced(m) && (
                        <DocumentSourceBadge movement={m} />
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontWeight: 600,
                      color: m.quantity >= 0 ? C.green : C.red,
                    }}
                  >
                    {m.quantity >= 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td style={{ ...sTd, color: C.muted }}>
                    {m.reference || "—"}
                  </td>
                  <td style={{ ...sTd, color: C.muted, fontSize: "12px" }}>
                    {m.notes || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS — v1.4
// ═══════════════════════════════════════════════════════════════════════════
function OrdersView({ orders, suppliers, items, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [form, setForm] = useState({
    supplier_id: "",
    expected_date: "",
    notes: "",
    currency: "USD",
    lineItems: [{ item_id: "", quantity_ordered: "", unit_cost: "" }],
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setLine = (idx, k, v) =>
    setForm((p) => {
      const l = [...p.lineItems];
      l[idx] = { ...l[idx], [k]: v };
      return { ...p, lineItems: l };
    });
  const addLine = () =>
    setForm((p) => ({
      ...p,
      lineItems: [
        ...p.lineItems,
        { item_id: "", quantity_ordered: "", unit_cost: "" },
      ],
    }));
  const removeLine = (idx) =>
    setForm((p) => ({
      ...p,
      lineItems: p.lineItems.filter((_, i) => i !== idx),
    }));
  const genPONum = () => {
    const d = new Date();
    return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(orders.length + 1).padStart(3, "0")}`;
  };
  const poStatus = (po) => po.po_status || po.status || "draft";

  const handleCreate = async () => {
    if (!form.supplier_id) {
      alert("Select a supplier.");
      return;
    }
    const valid = form.lineItems.filter(
      (l) => l.item_id && l.quantity_ordered && l.unit_cost,
    );
    if (valid.length === 0) {
      alert("Add at least one line item.");
      return;
    }
    setSaving(true);
    try {
      const subtotal = valid.reduce(
        (s, l) => s + parseFloat(l.quantity_ordered) * parseFloat(l.unit_cost),
        0,
      );
      const { data: po, error: pE } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: genPONum(),
          supplier_id: form.supplier_id,
          expected_date: form.expected_date || null,
          notes: form.notes || null,
          currency: form.currency,
          subtotal,
          status: "draft",
        })
        .select()
        .single();
      if (pE) throw pE;
      const { error: lE } = await supabase
        .from("purchase_order_items")
        .insert(
          valid.map((l) => ({
            po_id: po.id,
            item_id: l.item_id,
            quantity_ordered: parseFloat(l.quantity_ordered),
            unit_cost: parseFloat(l.unit_cost),
          })),
        );
      if (lE) throw lE;
      setShowForm(false);
      setForm({
        supplier_id: "",
        expected_date: "",
        notes: "",
        currency: "USD",
        lineItems: [{ item_id: "", quantity_ordered: "", unit_cost: "" }],
      });
      onRefresh();
    } catch (err) {
      alert("Error creating PO: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (po, newStatus) => {
    const updates = {
      status: newStatus,
      po_status: newStatus,
      ...(newStatus === "received"
        ? { received_date: new Date().toISOString().split("T")[0] }
        : {}),
    };
    const { error } = await supabase
      .from("purchase_orders")
      .update(updates)
      .eq("id", po.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    if (newStatus === "received" && po.purchase_order_items) {
      for (const line of po.purchase_order_items) {
        if (!line.item_id) continue;
        await supabase
          .from("stock_movements")
          .insert({
            item_id: line.item_id,
            quantity: line.quantity_ordered,
            movement_type: "purchase_in",
            reference: po.po_number,
            notes: `Auto-recorded from PO ${po.po_number}`,
          });
        const item = items.find((i) => i.id === line.item_id);
        if (item)
          await supabase
            .from("inventory_items")
            .update({
              quantity_on_hand:
                (item.quantity_on_hand || 0) + line.quantity_ordered,
            })
            .eq("id", line.item_id);
      }
    }
    if (selectedPo?.id === po.id)
      setSelectedPo((p) => ({ ...p, status: newStatus, po_status: newStatus }));
    onRefresh();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "11px", color: C.muted }}>
          {orders.length} purchase orders ·{" "}
          <span style={{ color: C.accent }}>
            click any card to view &amp; edit
          </span>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={sBtn()}>
          {showForm ? "Cancel" : "+ Create PO"}
        </button>
      </div>
      {showForm && (
        <div
          style={{
            ...sCard,
            marginBottom: "20px",
            borderLeft: `3px solid ${C.accent}`,
          }}
        >
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            New Purchase Order
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Supplier *
              </label>
              <select
                style={sSelect}
                value={form.supplier_id}
                onChange={(e) => set("supplier_id", e.target.value)}
              >
                <option value="">— Select —</option>
                {suppliers
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Expected Date
              </label>
              <input
                style={sInput}
                type="date"
                value={form.expected_date}
                onChange={(e) => set("expected_date", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Currency
              </label>
              <select
                style={sSelect}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="ZAR">ZAR</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div style={{ ...sLabel, marginBottom: "8px" }}>Line Items</div>
          {form.lineItems.map((line, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr auto",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <select
                style={sSelect}
                value={line.item_id}
                onChange={(e) => setLine(idx, "item_id", e.target.value)}
              >
                <option value="">— Item —</option>
                {items
                  .filter((i) => i.is_active)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </select>
              <input
                style={sInput}
                type="number"
                step="1"
                placeholder="Qty"
                value={line.quantity_ordered}
                onChange={(e) =>
                  setLine(idx, "quantity_ordered", e.target.value)
                }
              />
              <input
                style={sInput}
                type="number"
                step="0.01"
                placeholder="Unit cost"
                value={line.unit_cost}
                onChange={(e) => setLine(idx, "unit_cost", e.target.value)}
              />
              {form.lineItems.length > 1 && (
                <button
                  onClick={() => removeLine(idx)}
                  style={{
                    ...sBtn("outline"),
                    padding: "4px 8px",
                    color: C.red,
                    borderColor: C.red,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addLine}
            style={{ ...sBtn("outline"), fontSize: "9px", marginTop: "4px" }}
          >
            + Add Line
          </button>
          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                color: C.muted,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Notes
            </label>
            <input
              style={sInput}
              placeholder="Optional PO notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "16px",
            }}
          >
            <button onClick={handleCreate} disabled={saving} style={sBtn()}>
              {saving ? "Creating..." : "Create Purchase Order"}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: "12px" }}>
        {orders.length === 0 ? (
          <div
            style={{
              ...sCard,
              textAlign: "center",
              color: C.muted,
              padding: "40px",
            }}
          >
            No purchase orders yet
          </div>
        ) : (
          orders.map((po) => {
            const status = poStatus(po);
            const sc = PO_STATUS_COLORS[status] || C.muted;
            const isCancelled = status === "cancelled";
            return (
              <div
                key={po.id}
                onClick={() => setSelectedPo(po)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(0,0,0,0.09)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.03)")
                }
                style={{
                  ...sCard,
                  cursor: "pointer",
                  borderLeft: `3px solid ${sc}`,
                  opacity: isCancelled ? 0.72 : 1,
                  transition: "box-shadow 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        fontFamily: F.heading,
                        color: isCancelled ? C.muted : C.text,
                      }}
                    >
                      {po.po_number}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: C.muted,
                        marginTop: "2px",
                      }}
                    >
                      {po.suppliers?.name || "Unknown"} ·{" "}
                      {po.order_date || po.created_at?.split("T")[0]}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "3px 10px",
                        borderRadius: "2px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        background: `${sc}18`,
                        color: sc,
                        border: `1px solid ${sc}35`,
                      }}
                    >
                      {status}
                    </span>
                    <select
                      value=""
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.value)
                          handleStatusChange(po, e.target.value);
                      }}
                      style={{ ...sSelect, width: "130px", fontSize: "10px" }}
                    >
                      <option value="">⚙ Set status...</option>
                      {ALL_PO_STATUSES.filter((s) => s.id !== status).map(
                        (s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    marginTop: "10px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: C.muted,
                  }}
                >
                  {po.purchase_order_items?.length > 0 && (
                    <span>
                      {po.purchase_order_items.length} line items ·{" "}
                      {po.currency || "USD"}{" "}
                      {parseFloat(po.subtotal || 0).toFixed(2)}
                    </span>
                  )}
                  {(po.expected_arrival || po.expected_date) && (
                    <span>
                      Expected: {po.expected_arrival || po.expected_date}
                    </span>
                  )}
                  {po.shipping_mode && (
                    <span>
                      ✈️{" "}
                      {po.shipping_mode === "supplier_included"
                        ? "Supplier Incl."
                        : po.shipping_mode === "ddp_air"
                          ? "DDP Air"
                          : po.shipping_mode}
                    </span>
                  )}
                  {po.landed_cost_zar && (
                    <span style={{ color: C.green, fontWeight: 600 }}>
                      Landed: R
                      {parseFloat(po.landed_cost_zar).toLocaleString("en-ZA", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </div>
                {po.notes && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: C.muted,
                      fontStyle: "italic",
                      marginTop: "6px",
                    }}
                  >
                    {po.notes}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "10px",
                    color: C.accent,
                    marginTop: "8px",
                    letterSpacing: "0.04em",
                  }}
                >
                  Click to view details &amp; edit →
                </div>
              </div>
            );
          })
        )}
      </div>
      {selectedPo && (
        <PODetailModal
          po={selectedPo}
          items={items}
          onClose={() => setSelectedPo(null)}
          onStatusChange={(newStatus) =>
            handleStatusChange(selectedPo, newStatus)
          }
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ─── PO Detail Modal ─────────────────────────────────────────────────────
function PODetailModal({ po, items, onClose, onStatusChange, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localPo, setLocalPo] = useState(po);
  const [editForm, setEditForm] = useState({
    notes: po.notes || "",
    expected_arrival: po.expected_arrival || po.expected_date || "",
    supplier_invoice_ref: po.supplier_invoice_ref || "",
    usd_zar_rate: po.usd_zar_rate || "",
  });

  const status = localPo.po_status || localPo.status || "draft";
  const sc = PO_STATUS_COLORS[status] || C.muted;
  const isCancelled = status === "cancelled";
  const lines = localPo.purchase_order_items || [];

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updates = {
        notes: editForm.notes || null,
        expected_arrival: editForm.expected_arrival || null,
        expected_date: editForm.expected_arrival || null,
        supplier_invoice_ref: editForm.supplier_invoice_ref || null,
        ...(editForm.usd_zar_rate
          ? { usd_zar_rate: parseFloat(editForm.usd_zar_rate) }
          : {}),
      };
      const { error } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", localPo.id);
      if (error) throw error;
      setLocalPo((p) => ({ ...p, ...updates }));
      setEditing(false);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSet = async (newStatus) => {
    const updates = {
      status: newStatus,
      po_status: newStatus,
      ...(newStatus === "received"
        ? { received_date: new Date().toISOString().split("T")[0] }
        : {}),
    };
    const { error } = await supabase
      .from("purchase_orders")
      .update(updates)
      .eq("id", localPo.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setLocalPo((p) => ({ ...p, ...updates }));
    onStatusChange(newStatus);
  };

  const row = (label, value, hl) => (
    <div
      style={{
        padding: "10px 0",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontFamily: F.body,
          flexShrink: 0,
          paddingRight: 16,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: hl ? 600 : 400,
          color: hl ? C.green : C.text,
          textAlign: "right",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(680px, 100vw)",
          height: "100vh",
          background: C.white,
          boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${C.border}`,
            background: C.cream,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ ...sLabel }}>Purchase Order — Admin View</div>
              <div
                style={{
                  fontFamily: F.heading,
                  fontSize: "26px",
                  fontWeight: 400,
                  color: isCancelled ? C.muted : C.green,
                }}
              >
                {localPo.po_number}
              </div>
              <div
                style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}
              >
                {localPo.suppliers?.name || "—"}
                {localPo.suppliers?.country
                  ? ` · ${localPo.suppliers.country}`
                  : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "11px",
                  padding: "4px 12px",
                  borderRadius: "2px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: `${sc}18`,
                  color: sc,
                  border: `1px solid ${sc}40`,
                  fontWeight: 600,
                }}
              >
                {status}
              </span>
              <button
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: C.muted,
                }}
              >
                ✕
              </button>
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: "8px",
                fontFamily: F.body,
              }}
            >
              ⚙ Admin — Set Status
              {isCancelled && (
                <span style={{ marginLeft: 8, color: C.red, fontSize: "10px" }}>
                  (select any status below to un-cancel)
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {ALL_PO_STATUSES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStatusSet(s.id)}
                  disabled={s.id === status}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "2px",
                    border: `1px solid ${s.id === status ? s.color : C.border}`,
                    background: s.id === status ? `${s.color}18` : C.white,
                    color: s.id === status ? s.color : C.muted,
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: s.id === status ? 700 : 400,
                    cursor: s.id === status ? "default" : "pointer",
                    fontFamily: F.body,
                  }}
                >
                  {s.id === status ? "✓ " : ""}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ ...sCard, marginBottom: "20px", padding: "0 16px" }}>
            {row("Supplier Invoice Ref", localPo.supplier_invoice_ref)}
            {row(
              "Order Date",
              localPo.order_date || localPo.created_at?.split("T")[0],
            )}
            {row(
              "Expected Arrival",
              localPo.expected_arrival || localPo.expected_date,
            )}
            {row(
              "Actual Arrival",
              localPo.actual_arrival || localPo.received_date,
            )}
            {row(
              "Locked FX Rate",
              localPo.usd_zar_rate
                ? `R${parseFloat(localPo.usd_zar_rate).toFixed(4)}/USD`
                : null,
            )}
            {row(
              "EXW Subtotal",
              localPo.subtotal
                ? `${localPo.currency || "USD"} ${parseFloat(localPo.subtotal).toFixed(2)}`
                : null,
            )}
            {row(
              "Shipping Mode",
              localPo.shipping_mode
                ? {
                    supplier_included: "Supplier Included",
                    ddp_air: "DDP Air (per kg)",
                    standard_air: "Standard Air",
                    sea_freight: "Sea Freight",
                  }[localPo.shipping_mode] || localPo.shipping_mode
                : null,
            )}
            {row(
              "Freight (USD)",
              localPo.shipping_cost_usd != null
                ? `$${parseFloat(localPo.shipping_cost_usd).toFixed(2)}`
                : null,
            )}
            {localPo.clearance_fee_usd > 0 &&
              row(
                "Clearance Fee (USD)",
                `$${parseFloat(localPo.clearance_fee_usd).toFixed(2)}`,
              )}
            {row(
              "Total Landed Cost (ZAR)",
              localPo.landed_cost_zar
                ? `R${parseFloat(localPo.landed_cost_zar).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                : null,
              !!localPo.landed_cost_zar,
            )}
            {localPo.total_weight_kg &&
              row("Total Weight", `${localPo.total_weight_kg} kg`)}
          </div>
          {editing ? (
            <div
              style={{
                ...sCard,
                marginBottom: "20px",
                borderLeft: `3px solid ${C.accent}`,
              }}
            >
              <div style={{ ...sLabel, marginBottom: "14px" }}>
                Edit PO Details
              </div>
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      color: C.muted,
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Notes
                  </label>
                  <textarea
                    style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: C.muted,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Expected Arrival
                    </label>
                    <input
                      type="date"
                      style={sInput}
                      value={editForm.expected_arrival}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          expected_arrival: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: C.muted,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Supplier Invoice Ref
                    </label>
                    <input
                      style={sInput}
                      value={editForm.supplier_invoice_ref}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          supplier_invoice_ref: e.target.value,
                        }))
                      }
                      placeholder="INV-2026-001"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: C.muted,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      USD/ZAR Override{" "}
                      <span style={{ fontSize: "9px", color: C.gold }}>
                        ⚠ affects landed cost
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      style={sInput}
                      value={editForm.usd_zar_rate}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          usd_zar_rate: e.target.value,
                        }))
                      }
                      placeholder="e.g. 16.0000"
                    />
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "14px",
                }}
              >
                <button
                  onClick={() => setEditing(false)}
                  style={sBtn("outline")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  style={sBtn()}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "20px" }}>
              {localPo.notes && (
                <div
                  style={{
                    ...sCard,
                    background: C.cream,
                    fontSize: "13px",
                    fontStyle: "italic",
                    marginBottom: "12px",
                  }}
                >
                  📝 {localPo.notes}
                </div>
              )}
              <button
                onClick={() => setEditing(true)}
                style={{ ...sBtn("outline"), fontSize: "9px" }}
              >
                ✏ Edit Notes / Dates / Invoice Ref / FX Rate
              </button>
            </div>
          )}
          {lines.length > 0 && (
            <div>
              <div style={{ ...sLabel, marginBottom: "10px" }}>
                Line Items ({lines.length})
              </div>
              <div style={{ ...sCard, padding: 0, overflow: "auto" }}>
                <table style={{ ...sTable, fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th style={sTh}>Product</th>
                      <th style={{ ...sTh, textAlign: "right" }}>Qty</th>
                      <th style={{ ...sTh, textAlign: "right" }}>
                        Unit Price (USD)
                      </th>
                      <th style={{ ...sTh, textAlign: "right" }}>Line EXW</th>
                      <th style={{ ...sTh, textAlign: "right" }}>
                        Landed/unit (ZAR)
                      </th>
                      <th style={sTh}>Inv. Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const name =
                        line.supplier_products?.name ||
                        line.notes?.replace(/ \(.*\)$/, "") ||
                        `Item ${idx + 1}`;
                      const unitPrice = parseFloat(
                        line.unit_price_usd || line.unit_cost || 0,
                      );
                      const lineExw =
                        (parseFloat(line.quantity_ordered) || 0) * unitPrice;
                      return (
                        <tr
                          key={line.id || idx}
                          style={{
                            background: idx % 2 === 0 ? C.white : "#fafaf8",
                          }}
                        >
                          <td style={sTd}>
                            <div style={{ fontWeight: 500 }}>{name}</div>
                            {line.supplier_products?.sku && (
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: C.muted,
                                  fontFamily: "monospace",
                                }}
                              >
                                {line.supplier_products.sku}
                              </div>
                            )}
                          </td>
                          <td style={{ ...sTd, textAlign: "right" }}>
                            {line.quantity_ordered}
                          </td>
                          <td style={{ ...sTd, textAlign: "right" }}>
                            ${unitPrice.toFixed(4)}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              textAlign: "right",
                              fontWeight: 500,
                            }}
                          >
                            ${lineExw.toFixed(2)}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              textAlign: "right",
                              color: line.landed_cost_per_unit_zar
                                ? C.green
                                : C.muted,
                              fontWeight: line.landed_cost_per_unit_zar
                                ? 600
                                : 400,
                            }}
                          >
                            {line.landed_cost_per_unit_zar
                              ? `R${parseFloat(line.landed_cost_per_unit_zar).toFixed(2)}`
                              : "—"}
                          </td>
                          <td style={sTd}>
                            {line.item_id ? (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  background: "#d4edda",
                                  color: C.green,
                                }}
                              >
                                ✓ linked
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  background: "#fff3e0",
                                  color: "#E65100",
                                }}
                              >
                                ⚠ none
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: C.cream }}>
                      <td
                        colSpan={3}
                        style={{
                          ...sTd,
                          fontWeight: 600,
                          textAlign: "right",
                          fontSize: "12px",
                        }}
                      >
                        Subtotal (EXW):
                      </td>
                      <td
                        style={{ ...sTd, fontWeight: 700, textAlign: "right" }}
                      >
                        ${parseFloat(localPo.subtotal || 0).toFixed(2)}
                      </td>
                      <td colSpan={2} style={sTd} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          <div
            style={{
              marginTop: "20px",
              background: "#f0f4ff",
              border: "1px solid #c5cae9",
              borderRadius: "2px",
              padding: "14px 16px",
              fontSize: "12px",
              color: "#3949AB",
              fontFamily: F.body,
            }}
          >
            💡 <strong>Shipping &amp; landed cost</strong> is managed in{" "}
            <strong>HQ → Procurement</strong>. Use the "Edit Shipping" button
            there to set weight, freight mode, and update per-item costs.
          </div>
        </div>
        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${C.border}`,
            background: C.cream,
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button onClick={onClose} style={sBtn("outline")}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════════════════════
function SuppliersView({ suppliers, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    country: "",
    website: "",
    notes: "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const openEdit = (s) => {
    setEditSupplier(s);
    setForm({
      name: s.name,
      contact_name: s.contact_name || "",
      email: s.email || "",
      phone: s.phone || "",
      country: s.country || "",
      website: s.website || "",
      notes: s.notes || "",
    });
    setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Supplier name is required.");
      return;
    }
    setSaving(true);
    try {
      const data = { ...form };
      Object.keys(data).forEach((k) => {
        if (data[k] === "") data[k] = null;
      });
      data.name = form.name;
      if (editSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(data)
          .eq("id", editSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(data);
        if (error) throw error;
      }
      setShowForm(false);
      setEditSupplier(null);
      setForm({
        name: "",
        contact_name: "",
        email: "",
        phone: "",
        country: "",
        website: "",
        notes: "",
      });
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "11px", color: C.muted }}>
          {suppliers.filter((s) => s.is_active).length} active suppliers
        </div>
        <button
          onClick={() => {
            setEditSupplier(null);
            setForm({
              name: "",
              contact_name: "",
              email: "",
              phone: "",
              country: "",
              website: "",
              notes: "",
            });
            setShowForm(!showForm);
          }}
          style={sBtn()}
        >
          {showForm ? "Cancel" : "+ Add Supplier"}
        </button>
      </div>
      {showForm && (
        <div
          style={{
            ...sCard,
            marginBottom: "20px",
            borderLeft: `3px solid ${C.accent}`,
          }}
        >
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            {editSupplier ? "Edit Supplier" : "Add New Supplier"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Company Name *
              </label>
              <input
                style={sInput}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Contact Person
              </label>
              <input
                style={sInput}
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Email
              </label>
              <input
                style={sInput}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Phone
              </label>
              <input
                style={sInput}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Country
              </label>
              <input
                style={sInput}
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Website
              </label>
              <input
                style={sInput}
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                color: C.muted,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Notes
            </label>
            <textarea
              style={{ ...sInput, minHeight: "50px", resize: "vertical" }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            <button
              onClick={() => {
                setShowForm(false);
                setEditSupplier(null);
              }}
              style={sBtn("outline")}
            >
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={sBtn()}>
              {saving ? "Saving..." : editSupplier ? "Update" : "Add Supplier"}
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {suppliers
          .filter((s) => s.is_active)
          .map((s) => (
            <div key={s.id} style={sCard}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      fontFamily: F.heading,
                      color: C.text,
                    }}
                  >
                    {s.name}
                  </div>
                  {s.contact_name && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: C.muted,
                        marginTop: "2px",
                      }}
                    >
                      {s.contact_name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEdit(s)}
                  style={{
                    ...sBtn("outline"),
                    padding: "4px 10px",
                    fontSize: "9px",
                  }}
                >
                  Edit
                </button>
              </div>
              <div
                style={{ marginTop: "12px", fontSize: "12px", color: C.muted }}
              >
                {s.country && <div>📍 {s.country}</div>}
                {s.email && <div>✉ {s.email}</div>}
                {s.phone && <div>📞 {s.phone}</div>}
                {s.website && <div>🌐 {s.website}</div>}
              </div>
              {s.notes && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: C.muted,
                    fontStyle: "italic",
                    borderTop: `1px solid ${C.border}`,
                    paddingTop: "8px",
                  }}
                >
                  {s.notes}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
