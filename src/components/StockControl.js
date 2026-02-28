// src/components/StockControl.js v1.0
// Protea Botanicals — Inventory Management System (WP5.1)
// Sub-views: Overview, Items, Movements, Purchase Orders, Suppliers
// Imported by AdminDashboard.js as a tab component

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

// ── Design tokens (matching tokens.js) ──────────────────────────────────
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
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ── Shared styles ───────────────────────────────────────────────────────
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
const sBtn = (variant = "primary") => ({
  padding: "8px 16px",
  background: variant === "primary" ? C.green : "transparent",
  color: variant === "primary" ? C.white : C.mid,
  border: variant === "primary" ? "none" : `1px solid ${C.mid}`,
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

// ── Category / type labels ──────────────────────────────────────────────
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
const PO_STATUS_COLORS = {
  draft: C.muted,
  submitted: C.blue,
  confirmed: C.accent,
  shipped: C.gold,
  received: C.green,
  cancelled: C.red,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function StockControl() {
  const [subTab, setSubTab] = useState("overview");
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch all data on mount ───────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, movesRes, suppRes, ordersRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("*, suppliers(name)")
          .order("name"),
        supabase
          .from("stock_movements")
          .select("*, inventory_items(name, sku)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("suppliers").select("*").order("name"),
        supabase
          .from("purchase_orders")
          .select("*, suppliers(name), purchase_order_items(*)")
          .order("created_at", { ascending: false }),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (movesRes.error) throw movesRes.error;
      if (suppRes.error) throw suppRes.error;
      if (ordersRes.error) throw ordersRes.error;
      setItems(itemsRes.data || []);
      setMovements(movesRes.data || []);
      setSuppliers(suppRes.data || []);
      setOrders(ordersRes.data || []);
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

  // ── Sub-tab navigation ────────────────────────────────────────────────
  const SUB_TABS = [
    { id: "overview", label: "Overview", icon: "◎" },
    { id: "items", label: "Items", icon: "◈" },
    { id: "movements", label: "Movements", icon: "↕" },
    { id: "orders", label: "Purchase Orders", icon: "📋" },
    { id: "suppliers", label: "Suppliers", icon: "🏭" },
  ];

  if (error) {
    return (
      <div
        style={{
          ...sCard,
          borderLeft: `3px solid ${C.error}`,
          margin: "20px 0",
        }}
      >
        <div style={sLabel}>Error Loading Stock Data</div>
        <p style={{ fontSize: "13px", color: C.error, margin: "8px 0 0" }}>
          {error}
        </p>
        <button onClick={fetchAll} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tab bar */}
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
              transition: "all 0.15s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>◎</div>
          Loading stock data...
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

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW — Dashboard summary
// ═══════════════════════════════════════════════════════════════════════════
function OverviewView({ items, movements, orders }) {
  const activeItems = items.filter((i) => i.is_active);
  const lowStock = activeItems.filter(
    (i) => i.quantity_on_hand <= i.reorder_level && i.reorder_level > 0,
  );
  const outOfStock = activeItems.filter((i) => i.quantity_on_hand <= 0);
  const totalValue = activeItems.reduce(
    (sum, i) => sum + i.quantity_on_hand * i.sell_price,
    0,
  );
  const totalCost = activeItems.reduce(
    (sum, i) => sum + i.quantity_on_hand * i.cost_price,
    0,
  );
  const pendingPOs = orders.filter(
    (o) => !["received", "cancelled"].includes(o.status),
  );

  const categoryBreakdown = {};
  activeItems.forEach((i) => {
    if (!categoryBreakdown[i.category])
      categoryBreakdown[i.category] = { count: 0, value: 0 };
    categoryBreakdown[i.category].count += 1;
    categoryBreakdown[i.category].value += i.quantity_on_hand * i.sell_price;
  });

  const recentMoves = movements.slice(0, 8);

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Total SKUs"
          value={activeItems.length}
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
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div style={{ ...sCard, borderLeft: `3px solid ${C.gold}` }}>
          <div style={sLabel}>⚠ Low Stock Alerts</div>
          <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
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
                  <span
                    style={{ fontSize: "13px", fontWeight: 500, color: C.text }}
                  >
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
                <div style={{ textAlign: "right" }}>
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
        </div>
      )}

      {/* Category breakdown */}
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
          {Object.entries(categoryBreakdown).map(([cat, data]) => (
            <div
              key={cat}
              style={{
                padding: "12px",
                background: C.cream,
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
                  fontSize: "18px",
                  fontWeight: 600,
                  color: C.text,
                  fontFamily: F.heading,
                }}
              >
                {data.count} items
              </div>
              <div style={{ fontSize: "11px", color: C.muted }}>
                R{data.value.toLocaleString()} value
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent movements */}
      <div style={sCard}>
        <div style={sLabel}>Recent Stock Movements</div>
        {recentMoves.length === 0 ? (
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
              {recentMoves.map((m) => (
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
          color: color,
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

// ═══════════════════════════════════════════════════════════════════════════
// ITEMS — Inventory list + add/edit
// ═══════════════════════════════════════════════════════════════════════════
function ItemsView({ items, suppliers, onRefresh }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

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
      console.error("[StockControl] Save error:", err);
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item) => {
    if (
      !window.confirm(
        `Deactivate "${item.name}"? This hides it from stock lists.`,
      )
    )
      return;
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

  const margin = (item) => {
    if (!item.cost_price || !item.sell_price) return null;
    return (
      ((item.sell_price - item.cost_price) / item.sell_price) *
      100
    ).toFixed(1);
  };

  return (
    <div>
      {/* Toolbar */}
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

      {/* Form modal */}
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

      {/* Items table */}
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
              <th style={{ ...sTh, textAlign: "right" }}>Sell</th>
              <th style={{ ...sTh, textAlign: "right" }}>Margin</th>
              <th style={sTh}>Supplier</th>
              <th style={sTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan="10"
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
                    <td style={{ ...sTd, fontWeight: 500 }}>{item.name}</td>
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
                      {isOut && (
                        <span style={{ marginLeft: "4px", fontSize: "10px" }}>
                          ⛔
                        </span>
                      )}
                      {isLow && !isOut && (
                        <span style={{ marginLeft: "4px", fontSize: "10px" }}>
                          ⚠️
                        </span>
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
                      <div style={{ display: "flex", gap: "6px" }}>
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
      </div>
    </div>
  );
}

// ── Item Add/Edit Form ──────────────────────────────────────────────────
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

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = () => {
    if (!form.sku.trim() || !form.name.trim()) {
      alert("SKU and Name are required.");
      return;
    }
    const data = {
      ...form,
      quantity_on_hand: parseFloat(form.quantity_on_hand) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
      strain_id: form.strain_id || null,
    };
    onSave(data);
  };

  const fieldRow = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  };

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

      <div style={fieldRow}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            SKU *
          </label>
          <input
            style={sInput}
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="e.g. FP-CART-PE"
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
            Name *
          </label>
          <input
            style={sInput}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Product name"
          />
        </div>
      </div>

      <div style={fieldRow}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Category
          </label>
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
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Unit
          </label>
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

      <div style={fieldRow}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Quantity On Hand
          </label>
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.quantity_on_hand}
            onChange={(e) => set("quantity_on_hand", e.target.value)}
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
            Reorder Level
          </label>
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.reorder_level}
            onChange={(e) => set("reorder_level", e.target.value)}
          />
        </div>
      </div>

      <div style={fieldRow}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Cost Price (ZAR)
          </label>
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

      <div style={fieldRow}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Supplier
          </label>
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
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Batch Number
          </label>
          <input
            style={sInput}
            value={form.batch_number}
            onChange={(e) => set("batch_number", e.target.value)}
          />
        </div>
      </div>

      <div style={fieldRow}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Expiry Date
          </label>
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
        <label
          style={{
            fontSize: "11px",
            color: C.muted,
            display: "block",
            marginBottom: "4px",
          }}
        >
          Description
        </label>
        <textarea
          style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

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

// ═══════════════════════════════════════════════════════════════════════════
// MOVEMENTS — Stock in/out log + record new
// ═══════════════════════════════════════════════════════════════════════════
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

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

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

      // Insert movement
      const { error: moveErr } = await supabase.from("stock_movements").insert({
        item_id: form.item_id,
        quantity: finalQty,
        movement_type: form.movement_type,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      if (moveErr) throw moveErr;

      // Update quantity on hand
      const item = items.find((i) => i.id === form.item_id);
      if (item) {
        const newQty = (item.quantity_on_hand || 0) + finalQty;
        const { error: updateErr } = await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: newQty })
          .eq("id", form.item_id);
        if (updateErr) throw updateErr;
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
      console.error("[StockControl] Movement error:", err);
      alert("Error recording movement: " + err.message);
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

      {/* Movements table */}
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
// PURCHASE ORDERS — List + create
// ═══════════════════════════════════════════════════════════════════════════
function OrdersView({ orders, suppliers, items, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    expected_date: "",
    notes: "",
    currency: "USD",
    lineItems: [{ item_id: "", quantity_ordered: "", unit_cost: "" }],
  });

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setLine = (idx, key, val) => {
    setForm((p) => {
      const lines = [...p.lineItems];
      lines[idx] = { ...lines[idx], [key]: val };
      return { ...p, lineItems: lines };
    });
  };
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

  const generatePONumber = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const seq = String(orders.length + 1).padStart(3, "0");
    return `PO-${y}${m}-${seq}`;
  };

  const handleCreate = async () => {
    if (!form.supplier_id) {
      alert("Select a supplier.");
      return;
    }
    const validLines = form.lineItems.filter(
      (l) => l.item_id && l.quantity_ordered && l.unit_cost,
    );
    if (validLines.length === 0) {
      alert("Add at least one line item.");
      return;
    }

    setSaving(true);
    try {
      const subtotal = validLines.reduce(
        (sum, l) =>
          sum + parseFloat(l.quantity_ordered) * parseFloat(l.unit_cost),
        0,
      );
      const poNumber = generatePONumber();

      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: poNumber,
          supplier_id: form.supplier_id,
          expected_date: form.expected_date || null,
          notes: form.notes || null,
          currency: form.currency,
          subtotal: subtotal,
          status: "draft",
        })
        .select()
        .single();
      if (poErr) throw poErr;

      const poItems = validLines.map((l) => ({
        po_id: po.id,
        item_id: l.item_id,
        quantity_ordered: parseFloat(l.quantity_ordered),
        unit_cost: parseFloat(l.unit_cost),
      }));
      const { error: lineErr } = await supabase
        .from("purchase_order_items")
        .insert(poItems);
      if (lineErr) throw lineErr;

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
      console.error("[StockControl] PO error:", err);
      alert("Error creating PO: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (po, newStatus) => {
    const { error } = await supabase
      .from("purchase_orders")
      .update({
        status: newStatus,
        ...(newStatus === "received"
          ? { received_date: new Date().toISOString().split("T")[0] }
          : {}),
      })
      .eq("id", po.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }

    // If received, auto-create stock movements for each line item
    if (newStatus === "received" && po.purchase_order_items) {
      for (const line of po.purchase_order_items) {
        await supabase.from("stock_movements").insert({
          item_id: line.item_id,
          quantity: line.quantity_ordered,
          movement_type: "purchase_in",
          reference: po.po_number,
          notes: `Auto-recorded from PO ${po.po_number}`,
        });
        // Update quantity on hand
        const item = items.find((i) => i.id === line.item_id);
        if (item) {
          await supabase
            .from("inventory_items")
            .update({
              quantity_on_hand:
                (item.quantity_on_hand || 0) + line.quantity_ordered,
            })
            .eq("id", line.item_id);
        }
      }
    }
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
          {orders.length} purchase orders
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

      {/* PO list */}
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
          orders.map((po) => (
            <div key={po.id} style={sCard}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
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
                    {po.po_number}
                  </div>
                  <div style={{ fontSize: "12px", color: C.muted }}>
                    {po.suppliers?.name || "Unknown"} · {po.order_date}
                  </div>
                </div>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "3px 10px",
                      borderRadius: "2px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      background: `${PO_STATUS_COLORS[po.status]}18`,
                      color: PO_STATUS_COLORS[po.status],
                      border: `1px solid ${PO_STATUS_COLORS[po.status]}35`,
                    }}
                  >
                    {po.status}
                  </span>
                  {po.status !== "received" && po.status !== "cancelled" && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          handleStatusChange(po, e.target.value);
                      }}
                      style={{ ...sSelect, width: "120px", fontSize: "10px" }}
                    >
                      <option value="">Update...</option>
                      {po.status === "draft" && (
                        <option value="submitted">Submit</option>
                      )}
                      {po.status === "submitted" && (
                        <option value="confirmed">Confirm</option>
                      )}
                      {po.status === "confirmed" && (
                        <option value="shipped">Mark Shipped</option>
                      )}
                      {["submitted", "confirmed", "shipped"].includes(
                        po.status,
                      ) && <option value="received">Mark Received</option>}
                      <option value="cancelled">Cancel</option>
                    </select>
                  )}
                </div>
              </div>

              {po.purchase_order_items &&
                po.purchase_order_items.length > 0 && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: C.muted,
                      marginBottom: "8px",
                    }}
                  >
                    {po.purchase_order_items.length} line item
                    {po.purchase_order_items.length !== 1 ? "s" : ""} ·{" "}
                    {po.currency} {po.subtotal?.toFixed(2)}
                  </div>
                )}

              {po.expected_date && (
                <div style={{ fontSize: "11px", color: C.muted }}>
                  Expected: {po.expected_date}
                </div>
              )}
              {po.notes && (
                <div
                  style={{
                    fontSize: "12px",
                    color: C.muted,
                    fontStyle: "italic",
                    marginTop: "4px",
                  }}
                >
                  {po.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPLIERS — List + add/edit
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

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

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
      data.name = form.name; // keep name

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
      console.error("[StockControl] Supplier save error:", err);
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

      {/* Supplier cards */}
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
