// src/components/shop/ShopInventory.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// SHOP INVENTORY — Phase 2F (Task 25)
//
// Read-only inventory view for shop admins. Shows:
//   - Inventory items scoped to tenant_id
//   - quantity_on_hand, category, sku, unit (LL-046)
//   - NO cost_price, NO unit_cost, NO supplier details
//   - Incoming shipments with line items
//
// All queries filtered by tenant_id.
// Design: Cream aesthetic per Section 7 of handover.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  bg: "#faf9f6",
  warmBg: "#f4f0e8",
  primaryDark: "#1b4332",
  primaryMid: "#2d6a4f",
  accentGreen: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#474747",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c0392b",
  blue: "#2c4a6e",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ShopInventory() {
  const { tenantId, tenantName } = useTenant();
  const [items, setItems] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [expandedShipment, setExpandedShipment] = useState(null);
  const [shipmentItems, setShipmentItems] = useState({});
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("inventory"); // 'inventory' | 'shipments'

  // ── Load inventory items (no cost columns) ──────────────────────────
  const loadInventory = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      // Select only non-sensitive columns — NO cost_price, NO unit_cost
      const r = await supabase
        .from("inventory_items")
        .select(
          "id, name, sku, category, quantity_on_hand, unit, reorder_level, is_active, tenant_id",
        )
        .eq("tenant_id", tenantId)
        .order("category")
        .order("name");

      if (r.error) {
        console.error("[ShopInventory] items fetch:", r.error);
      }
      setItems(r.data || []);

      // Shipments TO this shop
      const r2 = await supabase
        .from("shipments")
        .select(
          "id, shipment_number, status, shipped_date, estimated_arrival, delivered_date, courier, tracking_number, notes, created_at",
        )
        .eq("destination_tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (r2.error) {
        console.error("[ShopInventory] shipments fetch:", r2.error);
      }
      setShipments(r2.data || []);
    } catch (err) {
      console.error("[ShopInventory] loadInventory error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // ── Load shipment line items (no cost columns) ──────────────────────
  const loadShipmentItems = async (shipmentId) => {
    if (shipmentItems[shipmentId]) return; // already loaded

    // Select only non-sensitive columns — NO unit_cost, NO total_cost
    const r = await supabase
      .from("shipment_items")
      .select("id, item_name, sku, quantity, unit, notes")
      .eq("shipment_id", shipmentId);

    if (r.error) {
      console.error("[ShopInventory] shipment_items fetch:", r.error);
      return;
    }
    setShipmentItems((prev) => ({ ...prev, [shipmentId]: r.data || [] }));
  };

  const handleExpandShipment = (shipmentId) => {
    if (expandedShipment === shipmentId) {
      setExpandedShipment(null);
      return;
    }
    setExpandedShipment(shipmentId);
    loadShipmentItems(shipmentId);
  };

  // ── Filter items ────────────────────────────────────────────────────
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const filtered = items.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory)
      return false;
    if (
      searchTerm &&
      !item.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  // ── Stock summary ───────────────────────────────────────────────────
  const totalItems = items.length;
  const totalUnits = items.reduce(
    (sum, i) => sum + (i.quantity_on_hand || 0),
    0,
  );
  const lowStock = items.filter(
    (i) =>
      i.reorder_level &&
      i.quantity_on_hand !== null &&
      i.quantity_on_hand <= i.reorder_level,
  ).length;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            border: `3px solid ${C.border}`,
            borderTopColor: C.primaryDark,
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <style>{`@keyframes protea-spin { to { transform: rotate(360deg); } }`}</style>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Loading inventory…
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* ── View Toggle ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "20px",
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          overflow: "hidden",
          width: "fit-content",
        }}
      >
        {["inventory", "shipments"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: view === v ? C.primaryDark : "transparent",
              color: view === v ? C.white : C.primaryDark,
              border: "none",
              padding: "10px 24px",
              cursor: "pointer",
              fontFamily: FONTS.body,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            {v === "inventory"
              ? "Stock on Hand"
              : `Shipments (${shipments.length})`}
          </button>
        ))}
      </div>

      {/* ══════ INVENTORY VIEW ══════ */}
      {view === "inventory" && (
        <>
          {/* Summary bar */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontFamily: FONTS.heading,
                  color: C.primaryDark,
                  fontWeight: 300,
                }}
              >
                {totalItems}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Items
              </span>
            </div>
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontFamily: FONTS.heading,
                  color: C.accentGreen,
                  fontWeight: 300,
                }}
              >
                {totalUnits.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Total Units
              </span>
            </div>
            {lowStock > 0 && (
              <div
                style={{
                  background: "rgba(192,57,43,0.06)",
                  border: `1px solid rgba(192,57,43,0.2)`,
                  borderRadius: "2px",
                  padding: "12px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "20px",
                    fontFamily: FONTS.heading,
                    color: C.red,
                    fontWeight: 300,
                  }}
                >
                  {lowStock}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: C.red,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Low Stock
                </span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "16px",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "2 1 200px" }}>
              <label style={labelStyle}>Search</label>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or SKU…"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={labelStyle}>Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inventory Table */}
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: C.primaryDark }}>
                  {[
                    "Name",
                    "SKU",
                    "Category",
                    "Qty on Hand",
                    "Unit",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: C.white,
                        fontFamily: FONTS.body,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: C.muted,
                      }}
                    >
                      {searchTerm || filterCategory !== "all"
                        ? "No items match your filters"
                        : "No inventory items yet"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, i) => {
                    const isLow =
                      item.reorder_level &&
                      item.quantity_on_hand !== null &&
                      item.quantity_on_hand <= item.reorder_level;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          background: i % 2 === 0 ? C.white : C.bg,
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 14px",
                            fontWeight: 500,
                            color: C.text,
                          }}
                        >
                          {item.name}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontFamily: "monospace",
                            fontSize: "11px",
                            color: C.muted,
                          }}
                        >
                          {item.sku || "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              background: "rgba(27,67,50,0.08)",
                              color: C.primaryDark,
                              padding: "2px 8px",
                              borderRadius: "2px",
                              fontSize: "10px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {item.category || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontWeight: 600,
                            fontFamily: FONTS.heading,
                            fontSize: "18px",
                            color: isLow ? C.red : C.primaryDark,
                          }}
                        >
                          {item.quantity_on_hand ?? 0}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            color: C.muted,
                            fontSize: "12px",
                          }}
                        >
                          {item.unit || "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {isLow ? (
                            <span
                              style={{
                                background: "rgba(192,57,43,0.1)",
                                color: C.red,
                                padding: "2px 8px",
                                borderRadius: "2px",
                                fontSize: "9px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                              }}
                            >
                              Low Stock
                            </span>
                          ) : item.is_active === false ? (
                            <span
                              style={{
                                color: C.muted,
                                fontSize: "9px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                              }}
                            >
                              Inactive
                            </span>
                          ) : (
                            <span
                              style={{
                                color: C.accentGreen,
                                fontSize: "9px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                              }}
                            >
                              ● In Stock
                            </span>
                          )}
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
              marginTop: "12px",
              fontSize: "11px",
              color: C.muted,
              fontStyle: "italic",
            }}
          >
            Read-only view. Contact HQ to adjust stock levels.
          </div>
        </>
      )}

      {/* ══════ SHIPMENTS VIEW ══════ */}
      {view === "shipments" && (
        <div>
          {shipments.length === 0 ? (
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "40px",
                textAlign: "center",
                color: C.muted,
                fontSize: "13px",
              }}
            >
              No shipments received yet
            </div>
          ) : (
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              {shipments.map((sh, idx) => (
                <div
                  key={sh.id}
                  style={{
                    borderBottom:
                      idx < shipments.length - 1
                        ? `1px solid ${C.border}`
                        : "none",
                  }}
                >
                  {/* Shipment header row */}
                  <div
                    onClick={() => handleExpandShipment(sh.id)}
                    style={{
                      padding: "14px 20px",
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 120px 100px 40px",
                      alignItems: "center",
                      cursor: "pointer",
                      background:
                        expandedShipment === sh.id ? C.warmBg : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (expandedShipment !== sh.id)
                        e.currentTarget.style.background = "#fefdfb";
                    }}
                    onMouseLeave={(e) => {
                      if (expandedShipment !== sh.id)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: C.text,
                        }}
                      >
                        {sh.shipment_number}
                      </div>
                      {sh.courier && (
                        <div style={{ fontSize: "11px", color: C.muted }}>
                          {sh.courier}
                          {sh.tracking_number && ` · ${sh.tracking_number}`}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "12px", color: C.muted }}>
                      {fmtDate(sh.shipped_date || sh.created_at)}
                    </span>
                    <span style={{ fontSize: "12px", color: C.muted }}>
                      {sh.estimated_arrival
                        ? `ETA ${fmtDate(sh.estimated_arrival)}`
                        : "—"}
                    </span>
                    <span
                      style={{
                        background:
                          sh.status === "delivered" || sh.status === "confirmed"
                            ? "rgba(82,183,136,0.12)"
                            : sh.status === "shipped" ||
                                sh.status === "in_transit"
                              ? "rgba(181,147,90,0.12)"
                              : "rgba(136,136,136,0.12)",
                        color:
                          sh.status === "delivered" || sh.status === "confirmed"
                            ? C.accentGreen
                            : sh.status === "shipped" ||
                                sh.status === "in_transit"
                              ? C.gold
                              : C.muted,
                        padding: "3px 10px",
                        borderRadius: "2px",
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        textAlign: "center",
                      }}
                    >
                      {sh.status}
                    </span>
                    <span
                      style={{
                        textAlign: "right",
                        color: C.muted,
                        fontSize: "12px",
                        transform:
                          expandedShipment === sh.id ? "rotate(90deg)" : "none",
                        transition: "transform 0.15s",
                        display: "inline-block",
                      }}
                    >
                      ▸
                    </span>
                  </div>

                  {/* Expanded: shipment items */}
                  {expandedShipment === sh.id && (
                    <div
                      style={{
                        background: C.warmBg,
                        padding: "16px 20px",
                        borderTop: `1px solid ${C.border}`,
                      }}
                    >
                      {sh.notes && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: C.muted,
                            fontStyle: "italic",
                            marginBottom: "12px",
                          }}
                        >
                          {sh.notes}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          color: C.muted,
                          marginBottom: "8px",
                        }}
                      >
                        Items
                      </div>

                      {!shipmentItems[sh.id] ? (
                        <span style={{ color: C.muted, fontSize: "12px" }}>
                          Loading…
                        </span>
                      ) : shipmentItems[sh.id].length === 0 ? (
                        <span
                          style={{
                            color: C.muted,
                            fontSize: "12px",
                            fontStyle: "italic",
                          }}
                        >
                          No items recorded
                        </span>
                      ) : (
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "12px",
                            background: C.white,
                            borderRadius: "2px",
                          }}
                        >
                          <thead>
                            <tr>
                              {["Item", "SKU", "Qty", "Unit"].map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    padding: "6px 12px",
                                    textAlign: "left",
                                    fontSize: "9px",
                                    fontWeight: 600,
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    color: C.muted,
                                    borderBottom: `1px solid ${C.border}`,
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {shipmentItems[sh.id].map((si) => (
                              <tr
                                key={si.id}
                                style={{
                                  borderBottom: `1px solid ${C.border}`,
                                }}
                              >
                                <td
                                  style={{
                                    padding: "6px 12px",
                                    fontWeight: 500,
                                  }}
                                >
                                  {si.item_name}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 12px",
                                    fontFamily: "monospace",
                                    fontSize: "10px",
                                    color: C.muted,
                                  }}
                                >
                                  {si.sku || "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 12px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {si.quantity}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 12px",
                                    color: C.muted,
                                  }}
                                >
                                  {si.unit || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared Styles ────────────────────────────────────────────────────────
const labelStyle = {
  display: "block",
  fontFamily: "'Jost', sans-serif",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#888",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #e8e0d4",
  borderRadius: "2px",
  fontFamily: "'Jost', sans-serif",
  fontSize: "13px",
  color: "#1a1a1a",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};
