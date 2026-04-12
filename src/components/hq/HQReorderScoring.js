// src/components/hq/HQReorderScoring.js v1.0 — WP-F + WP-G
// Protea Botanicals · Phase 2 · March 2026
// New file — add to src/components/hq/
//
// WP-F: Reorder Intelligence
//   — Items where quantity_on_hand ≤ reorder_level (and reorder_level > 0)
//   — Days of stock remaining vs reorder point
//   — Suggested order quantity (reorder_level × 3)
//   — One-click "Create PO" link to Procurement tab
//
// WP-G: Supplier Reliability Scoring
//   — Auto-calculated from purchase_orders history
//   — on_time_rate: POs where actual_arrival ≤ expected_arrival
//   — avg_lead_time_days: actual from order_date → actual_arrival
//   — total_orders: count of non-draft POs
//   — reliability_score: weighted composite (0–100)
//   — Saves back to suppliers table

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtZar = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n, dp = 1) => (parseFloat(n) || 0).toFixed(dp);
const daysBetween = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86400000);

// Reliability score formula (0–100):
//   on_time_rate:    40 pts
//   avg_lead_time:   30 pts (≤14d = 30, ≤21d = 20, ≤35d = 10, >35d = 0)
//   order_volume:    20 pts (≥5 orders = 20, ≥3 = 10, ≥1 = 5)
//   completeness:    10 pts (has actual_arrival data)
function calcReliabilityScore(
  onTimeRate,
  avgLeadDays,
  totalOrders,
  completeness,
) {
  const onTimePts = Math.round((onTimeRate / 100) * 40);
  const leadPts =
    avgLeadDays <= 14
      ? 30
      : avgLeadDays <= 21
        ? 20
        : avgLeadDays <= 35
          ? 10
          : 0;
  const volPts =
    totalOrders >= 5 ? 20 : totalOrders >= 3 ? 10 : totalOrders >= 1 ? 5 : 0;
  const compPts = completeness >= 0.5 ? 10 : completeness > 0 ? 5 : 0;
  return Math.min(100, onTimePts + leadPts + volPts + compPts);
}

function scoreColour(score) {
  if (score === null || score === undefined)
    return { color: T.ink500, bg: T.bg, label: "No data" };
  if (score >= 75)
    return { color: T.success, bg: T.successLight, label: "Reliable" };
  if (score >= 50)
    return { color: T.warning, bg: T.warningLight, label: "Average" };
  return { color: T.danger, bg: T.dangerLight, label: "At risk" };
}

function stockColour(qty, reorder) {
  if (reorder <= 0) return { color: T.ink500, bg: T.bg };
  if (qty <= 0) return { color: T.danger, bg: T.dangerLight };
  if (qty <= reorder) return { color: T.danger, bg: T.dangerLight };
  if (qty <= reorder * 1.5) return { color: T.warning, bg: T.warningLight };
  return { color: T.success, bg: T.successLight };
}

// ─── Score Badge ─────────────────────────────────────────────────────────────
function ScoreBadge({ score, large }) {
  const c = scoreColour(score);
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: large ? "10px 20px" : "5px 12px",
        borderRadius: large ? 12 : 20,
        background: c.bg,
      }}
    >
      <span
        style={{
          fontSize: large ? 28 : 15,
          fontWeight: 800,
          color: c.color,
          lineHeight: 1,
        }}
      >
        {score !== null && score !== undefined ? score : "—"}
      </span>
      {large && (
        <span
          style={{
            fontSize: 11,
            color: c.color,
            marginTop: 3,
            fontWeight: 600,
          }}
        >
          {c.label}
        </span>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label }) {
  return (
    <div
      style={{
        padding: "10px 16px",
        background: "#f0ede8",
        fontSize: 11,
        fontWeight: 700,
        color: "#888",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        display: "flex",
        gap: 8,
      }}
    >
      {icon} {label}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function HQReorderScoring({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("reorder");
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [toast, setToast] = useState("");

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("name"),
      supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("purchase_orders")
        .select(
          "id, supplier_id, po_number, order_date, expected_arrival, actual_arrival, po_status, status, landed_cost_zar",
        )
        .order("order_date", { ascending: false }),
    ]);
    setInventory(r1.data || []);
    setSuppliers(r2.data || []);
    setPurchaseOrders(r3.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  // ── WP-F: Reorder alerts ──────────────────────────────────────────────
  const reorderItems = inventory.filter(
    (i) =>
      parseFloat(i.reorder_level) > 0 &&
      parseFloat(i.quantity_on_hand) <= parseFloat(i.reorder_level),
  );
  const watchItems = inventory.filter(
    (i) =>
      parseFloat(i.reorder_level) > 0 &&
      parseFloat(i.quantity_on_hand) > parseFloat(i.reorder_level) &&
      parseFloat(i.quantity_on_hand) <= parseFloat(i.reorder_level) * 1.5,
  );

  // ── WP-G: Score calculation per supplier ─────────────────────────────
  function calcSupplierStats(supplierId) {
    const pos = purchaseOrders.filter(
      (po) => po.supplier_id === supplierId && po.po_status !== "draft",
    );
    if (pos.length === 0) return null;

    const withArrival = pos.filter((po) => po.actual_arrival && po.order_date);
    const onTime = withArrival.filter(
      (po) =>
        po.expected_arrival &&
        new Date(po.actual_arrival) <= new Date(po.expected_arrival),
    );
    const onTimeRate =
      withArrival.length > 0 ? (onTime.length / withArrival.length) * 100 : 0;

    const leadTimes = withArrival
      .map((po) => daysBetween(po.order_date, po.actual_arrival))
      .filter((d) => d > 0);
    const avgLead =
      leadTimes.length > 0
        ? leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length
        : 0;

    const completeness = withArrival.length / pos.length;
    const score = calcReliabilityScore(
      onTimeRate,
      avgLead,
      pos.length,
      completeness,
    );
    const lastOrder = pos[0]?.order_date || null;

    const totalLanded = pos
      .filter((po) => po.landed_cost_zar)
      .reduce((s, po) => s + parseFloat(po.landed_cost_zar || 0), 0);

    return {
      onTimeRate,
      avgLead,
      totalOrders: pos.length,
      score,
      lastOrder,
      completeness,
      totalLanded,
      withArrival: withArrival.length,
    };
  }

  // ── Save scores to suppliers table ────────────────────────────────────
  const handleRecalcScores = async () => {
    setScoring(true);
    for (const supplier of suppliers) {
      const stats = calcSupplierStats(supplier.id);
      if (!stats) continue;
      await supabase
        .from("suppliers")
        .update({
          reliability_score: stats.score,
          avg_lead_time_days: Math.round(stats.avgLead) || null,
          on_time_rate: parseFloat(stats.onTimeRate.toFixed(2)),
          total_orders: stats.totalOrders,
          last_order_date: stats.lastOrder,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplier.id);
    }
    showToast("✅ Supplier scores recalculated and saved");
    setScoring(false);
    fetchAll();
  };

  // ── Styles ────────────────────────────────────────────────────────────
  const card = {
    background: "#fff",
    borderRadius: 6,
    border: `1px solid ${T.border}`,
    overflow: "hidden",
    marginBottom: 16,
    boxShadow: T.shadow.sm,
  };
  const btn = (variant = "primary", extra = {}) => ({
    padding: "8px 16px",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    fontFamily: T.font,
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    ...(variant === "primary" ? { background: T.accent, color: "#fff" } : {}),
    ...(variant === "ghost"
      ? {
          background: "transparent",
          color: T.accentMid,
          border: `1px solid ${T.accentBd}`,
        }
      : {}),
    ...(variant === "small"
      ? {
          background: T.bg,
          color: T.ink500,
          padding: "6px 12px",
          fontSize: 10,
          border: `1px solid ${T.border}`,
        }
      : {}),
    ...(variant === "alert" ? { background: T.danger, color: "#fff" } : {}),
    ...extra,
  });

  const SUB_TABS = [
    { id: "reorder", label: "🔔 Reorder Alerts" },
    { id: "scoring", label: "🏅 Supplier Scoring" },
  ];

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: T.font, color: T.ink900 }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "#2d4a2d",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontFamily: T.font,
              fontWeight: 600,
              color: T.accent,
            }}
          >
            Reorder & Supplier Intelligence
          </h2>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: 14 }}>
            Stock alerts · reorder triggers · supplier reliability scores
          </p>
        </div>
        {activeTab === "scoring" && (
          <button
            style={btn("primary")}
            onClick={handleRecalcScores}
            disabled={scoring}
          >
            {scoring ? "⏳ Calculating…" : "🔄 Recalculate All Scores"}
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #f0ede8",
          marginBottom: 28,
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "10px 16px",
              fontFamily: T.font,
              fontSize: 11,
              fontWeight: activeTab === t.id ? 700 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: activeTab === t.id ? T.accent : T.ink500,
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
          Loading intelligence data…
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              WP-F: REORDER ALERTS
          ══════════════════════════════════════════════════════════ */}
          {activeTab === "reorder" && (
            <div>
              {/* Summary strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "1px",
                  background: T.border,
                  borderRadius: 6,
                  overflow: "hidden",
                  border: `1px solid ${T.border}`,
                  boxShadow: T.shadow.sm,
                  marginBottom: 24,
                }}
              >
                {[
                  {
                    label: "Need to reorder now",
                    value: reorderItems.length,
                    colour: reorderItems.length > 0 ? "#c62828" : "#2E7D32",
                    bg: reorderItems.length > 0 ? "#FFEBEE" : "#E8F5E9",
                    icon: "🚨",
                  },
                  {
                    label: "Approaching reorder",
                    value: watchItems.length,
                    colour: watchItems.length > 0 ? "#E65100" : "#888",
                    bg: watchItems.length > 0 ? "#FFF3E0" : "#f5f5f5",
                    icon: "⚠️",
                  },
                  {
                    label: "Total tracked items",
                    value: inventory.filter(
                      (i) => parseFloat(i.reorder_level) > 0,
                    ).length,
                    colour: "#2d4a2d",
                    bg: "#f0f7f0",
                    icon: "📦",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{ background: "#fff", padding: "16px 18px" }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.ink500,
                        marginBottom: 6,
                        fontFamily: T.font,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 26,
                        fontWeight: 400,
                        color: s.colour,
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── REORDER NOW ── */}
              {reorderItems.length > 0 ? (
                <div style={{ ...card }}>
                  <SectionHeader
                    icon="🚨"
                    label={`Reorder Now — ${reorderItems.length} item${reorderItems.length !== 1 ? "s" : ""}`}
                  />
                  {reorderItems.map((item, idx) => {
                    const supplier = suppliers.find(
                      (s) => s.id === item.supplier_id,
                    );
                    const suggestedQty = Math.max(
                      parseFloat(item.reorder_level) * 3,
                      50,
                    );
                    const sc = stockColour(
                      item.quantity_on_hand,
                      item.reorder_level,
                    );
                    const estCost =
                      suggestedQty * parseFloat(item.cost_price || 0);
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "16px 20px",
                          borderBottom:
                            idx < reorderItems.length - 1
                              ? "1px solid #f5f5f5"
                              : "none",
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                          gap: 16,
                          alignItems: "center",
                        }}
                      >
                        {/* Item info */}
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: "#2d4a2d",
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#aaa",
                              marginTop: 2,
                            }}
                          >
                            {item.sku}
                          </div>
                          {supplier && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#888",
                                marginTop: 3,
                              }}
                            >
                              Supplier: <strong>{supplier.name}</strong>
                              {supplier.avg_lead_time_days &&
                                ` · ~${supplier.avg_lead_time_days}d lead time`}
                            </div>
                          )}
                        </div>

                        {/* Stock level */}
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#aaa",
                              textTransform: "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            In Stock
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: sc.color,
                            }}
                          >
                            {parseFloat(item.quantity_on_hand).toFixed(0)}{" "}
                            {item.unit}
                          </div>
                          <div style={{ fontSize: 10, color: "#aaa" }}>
                            Reorder at{" "}
                            {parseFloat(item.reorder_level).toFixed(0)}
                          </div>
                        </div>

                        {/* Suggested qty */}
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#aaa",
                              textTransform: "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            Suggested Order
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "#2d4a2d",
                            }}
                          >
                            {suggestedQty.toFixed(0)}
                          </div>
                          <div style={{ fontSize: 10, color: "#aaa" }}>
                            {item.unit}
                          </div>
                        </div>

                        {/* Est. cost */}
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#aaa",
                              textTransform: "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            Est. Cost
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#555",
                            }}
                          >
                            {item.cost_price > 0 ? fmtZar(estCost) : "—"}
                          </div>
                        </div>

                        {/* Action */}
                        <div style={{ textAlign: "right" }}>
                          {supplier ? (
                            <button
                              style={btn("alert", {
                                padding: "8px 14px",
                                fontSize: 13,
                              })}
                              onClick={() => {
                                if (onNavigate) onNavigate("procurement");
                                else
                                  showToast(
                                    `Navigate to HQ → Procurement to create PO for ${item.name}`,
                                  );
                              }}
                            >
                              🛒 Create PO
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "#bbb" }}>
                              No supplier linked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    ...card,
                    textAlign: "center",
                    padding: "40px 24px",
                    border: "1px dashed #c8e6c9",
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#2E7D32",
                      marginBottom: 6,
                    }}
                  >
                    All stocked above reorder levels
                  </div>
                  <div style={{ fontSize: 13, color: "#aaa" }}>
                    No urgent reorders needed right now.
                  </div>
                </div>
              )}

              {/* ── WATCH LIST ── */}
              {watchItems.length > 0 && (
                <div style={{ ...card, marginTop: 8 }}>
                  <SectionHeader
                    icon="⚠️"
                    label={`Watch — Approaching Reorder (${watchItems.length})`}
                  />
                  {watchItems.map((item, idx) => {
                    const supplier = suppliers.find(
                      (s) => s.id === item.supplier_id,
                    );
                    const sc = stockColour(
                      item.quantity_on_hand,
                      item.reorder_level,
                    );
                    const pctAbove =
                      ((parseFloat(item.quantity_on_hand) -
                        parseFloat(item.reorder_level)) /
                        parseFloat(item.reorder_level)) *
                      100;
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "14px 20px",
                          borderBottom:
                            idx < watchItems.length - 1
                              ? "1px solid #f5f5f5"
                              : "none",
                          display: "flex",
                          gap: 20,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ flex: 2 }}>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: "#aaa" }}>
                            {item.sku}
                            {supplier ? ` · ${supplier.name}` : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "center", minWidth: 80 }}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: sc.color,
                            }}
                          >
                            {parseFloat(item.quantity_on_hand).toFixed(0)}{" "}
                            {item.unit}
                          </div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>
                            Reorder at{" "}
                            {parseFloat(item.reorder_level).toFixed(0)}
                          </div>
                        </div>
                        {/* Progress bar to reorder */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              height: 8,
                              borderRadius: 4,
                              background: "#f0f0f0",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, 50 + pctAbove * 0.5)}%`,
                                background: sc.color,
                                borderRadius: 4,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: sc.color,
                              marginTop: 3,
                            }}
                          >
                            {fmt(pctAbove, 0)}% above reorder level
                          </div>
                        </div>
                        <button
                          style={btn("small")}
                          onClick={() => {
                            if (onNavigate) onNavigate("procurement");
                            else
                              showToast(
                                `Navigate to HQ → Procurement to pre-order ${item.name}`,
                              );
                          }}
                        >
                          Pre-order
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── ALL TRACKED ITEMS ── */}
              <div style={{ ...card, marginTop: 8 }}>
                <SectionHeader icon="📦" label="All Tracked Inventory" />
                {inventory.filter((i) => parseFloat(i.reorder_level) > 0)
                  .length === 0 ? (
                  <div
                    style={{
                      padding: "24px 20px",
                      color: "#aaa",
                      fontSize: 13,
                    }}
                  >
                    No items have a reorder level set. Set reorder levels in{" "}
                    <strong>Admin → Stock Control</strong>.
                  </div>
                ) : (
                  inventory
                    .filter((i) => parseFloat(i.reorder_level) > 0)
                    .map((item, idx, arr) => {
                      const sc = stockColour(
                        item.quantity_on_hand,
                        item.reorder_level,
                      );
                      const fillPct = Math.min(
                        100,
                        (parseFloat(item.quantity_on_hand) /
                          (parseFloat(item.reorder_level) * 4)) *
                          100,
                      );
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: "12px 20px",
                            borderBottom:
                              idx < arr.length - 1
                                ? "1px solid #f8f6f2"
                                : "none",
                            display: "flex",
                            gap: 16,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ flex: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                              {item.name}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: "#bbb",
                                marginLeft: 8,
                              }}
                            >
                              {item.sku}
                            </span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                height: 6,
                                borderRadius: 3,
                                background: "#f0f0f0",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${fillPct}%`,
                                  background: sc.color,
                                  borderRadius: 3,
                                  transition: "width 0.4s",
                                }}
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              minWidth: 100,
                              textAlign: "right",
                              fontSize: 13,
                              fontWeight: 600,
                              color: sc.color,
                            }}
                          >
                            {parseFloat(item.quantity_on_hand).toFixed(0)} /{" "}
                            {parseFloat(item.reorder_level).toFixed(0)}{" "}
                            {item.unit}
                          </div>
                          <div style={{ minWidth: 70, textAlign: "right" }}>
                            <span
                              style={{
                                fontSize: 11,
                                padding: "3px 8px",
                                borderRadius: 10,
                                background: sc.bg,
                                color: sc.color,
                                fontWeight: 600,
                              }}
                            >
                              {parseFloat(item.quantity_on_hand) <= 0
                                ? "Out"
                                : parseFloat(item.quantity_on_hand) <=
                                    parseFloat(item.reorder_level)
                                  ? "Reorder"
                                  : "OK"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              WP-G: SUPPLIER SCORING
          ══════════════════════════════════════════════════════════ */}
          {activeTab === "scoring" && (
            <div>
              {/* Info */}
              <div
                style={{
                  background: "#f8f9fa",
                  borderRadius: 10,
                  padding: "14px 20px",
                  marginBottom: 24,
                  fontSize: 13,
                  color: "#666",
                  border: "1px solid #e0e0e0",
                }}
              >
                <strong>ℹ️ How scores are calculated</strong> from your PO
                history: On-time delivery rate (40pts) · Lead time accuracy
                (30pts) · Order volume (20pts) · Data completeness (10pts).
                Scores are saved to the suppliers table and update whenever you
                click Recalculate. Scores only appear once you have received POs
                with arrival dates.
              </div>

              {suppliers.length === 0 ? (
                <div
                  style={{ textAlign: "center", padding: 60, color: "#aaa" }}
                >
                  No active suppliers found.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(420px, 1fr))",
                    gap: 20,
                  }}
                >
                  {suppliers.map((supplier) => {
                    const stats = calcSupplierStats(supplier.id);
                    // Use live-calculated or DB-saved score
                    const score = stats
                      ? stats.score
                      : supplier.reliability_score;
                    const sc = scoreColour(score);
                    const supplierPos = purchaseOrders.filter(
                      (po) =>
                        po.supplier_id === supplier.id &&
                        po.po_status !== "draft",
                    );

                    return (
                      <div
                        key={supplier.id}
                        style={{
                          background: "#fff",
                          borderRadius: 12,
                          border: "1px solid #f0ede8",
                          overflow: "hidden",
                        }}
                      >
                        {/* Card header */}
                        <div
                          style={{
                            padding: "20px 24px",
                            borderBottom: "1px solid #f5f5f5",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 17,
                                fontWeight: 700,
                                color: "#2d4a2d",
                              }}
                            >
                              {supplier.name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#aaa",
                                marginTop: 3,
                              }}
                            >
                              {supplier.country} · {supplier.currency}
                              {supplier.payment_terms &&
                                ` · ${supplier.payment_terms}`}
                            </div>
                          </div>
                          <ScoreBadge score={score} large />
                        </div>

                        {/* Metrics */}
                        <div style={{ padding: "16px 24px" }}>
                          {stats ? (
                            <>
                              {/* Score bar */}
                              <div style={{ marginBottom: 16 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: 12,
                                    color: "#888",
                                    marginBottom: 5,
                                  }}
                                >
                                  <span>Reliability Score</span>
                                  <span
                                    style={{ color: sc.color, fontWeight: 700 }}
                                  >
                                    {score}/100 · {sc.label}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    height: 8,
                                    borderRadius: 4,
                                    background: "#f0f0f0",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${score || 0}%`,
                                      background: sc.color,
                                      borderRadius: 4,
                                      transition: "width 0.5s",
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Stats grid */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(2, 1fr)",
                                  gap: 12,
                                  marginBottom: 16,
                                }}
                              >
                                {[
                                  {
                                    label: "On-time rate",
                                    value: `${fmt(stats.onTimeRate)}%`,
                                    highlight:
                                      stats.onTimeRate >= 80
                                        ? "green"
                                        : stats.onTimeRate >= 60
                                          ? "orange"
                                          : "red",
                                  },
                                  {
                                    label: "Avg lead time",
                                    value:
                                      stats.avgLead > 0
                                        ? `${Math.round(stats.avgLead)} days`
                                        : "No data",
                                    highlight: null,
                                  },
                                  {
                                    label: "Total POs",
                                    value: stats.totalOrders,
                                    highlight: null,
                                  },
                                  {
                                    label: "Total landed cost",
                                    value:
                                      stats.totalLanded > 0
                                        ? fmtZar(stats.totalLanded)
                                        : "—",
                                    highlight: null,
                                  },
                                ].map((m) => {
                                  const valColour =
                                    m.highlight === "green"
                                      ? "#2E7D32"
                                      : m.highlight === "orange"
                                        ? "#E65100"
                                        : m.highlight === "red"
                                          ? "#c62828"
                                          : "#333";
                                  return (
                                    <div
                                      key={m.label}
                                      style={{
                                        background: "#fafaf8",
                                        borderRadius: 8,
                                        padding: "10px 14px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: "#aaa",
                                          marginBottom: 3,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.3px",
                                        }}
                                      >
                                        {m.label}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 15,
                                          fontWeight: 700,
                                          color: valColour,
                                        }}
                                      >
                                        {m.value}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Score breakdown */}
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#aaa",
                                  background: "#f8f9fa",
                                  borderRadius: 8,
                                  padding: "10px 14px",
                                }}
                              >
                                <strong style={{ color: "#666" }}>
                                  Score breakdown:{" "}
                                </strong>
                                On-time{" "}
                                {Math.round((stats.onTimeRate / 100) * 40)}pts ·
                                Lead time{" "}
                                {stats.avgLead <= 14
                                  ? 30
                                  : stats.avgLead <= 21
                                    ? 20
                                    : stats.avgLead <= 35
                                      ? 10
                                      : 0}
                                pts · Volume{" "}
                                {stats.totalOrders >= 5
                                  ? 20
                                  : stats.totalOrders >= 3
                                    ? 10
                                    : stats.totalOrders >= 1
                                      ? 5
                                      : 0}
                                pts · Data{" "}
                                {stats.completeness >= 0.5
                                  ? 10
                                  : stats.completeness > 0
                                    ? 5
                                    : 0}
                                pts
                              </div>

                              {/* Last order */}
                              {stats.lastOrder && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#aaa",
                                    marginTop: 10,
                                  }}
                                >
                                  Last order:{" "}
                                  {new Date(stats.lastOrder).toLocaleDateString(
                                    "en-ZA",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "20px 0",
                                color: "#bbb",
                              }}
                            >
                              <div style={{ fontSize: 32, marginBottom: 8 }}>
                                📋
                              </div>
                              <div style={{ fontSize: 13 }}>
                                No completed POs yet for this supplier.
                              </div>
                              <div style={{ fontSize: 12, marginTop: 4 }}>
                                Scores appear after POs are received with
                                arrival dates.
                              </div>
                              {/* Show DB score if it exists from a prior calc */}
                              {supplier.reliability_score !== null && (
                                <div
                                  style={{
                                    marginTop: 12,
                                    fontSize: 13,
                                    color: "#888",
                                  }}
                                >
                                  Last saved score:{" "}
                                  <strong>{supplier.reliability_score}</strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Recent POs */}
                        {supplierPos.length > 0 && (
                          <div
                            style={{
                              borderTop: "1px solid #f5f5f5",
                              padding: "12px 24px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "#aaa",
                                textTransform: "uppercase",
                                fontWeight: 600,
                                marginBottom: 8,
                              }}
                            >
                              Recent POs
                            </div>
                            {supplierPos.slice(0, 3).map((po) => (
                              <div
                                key={po.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: 12,
                                  padding: "4px 0",
                                  color: "#666",
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>
                                  {po.po_number || po.id.slice(0, 8)}
                                </span>
                                <span>{po.po_status || po.status}</span>
                                {po.actual_arrival && po.expected_arrival && (
                                  <span
                                    style={{
                                      color:
                                        new Date(po.actual_arrival) <=
                                        new Date(po.expected_arrival)
                                          ? "#2E7D32"
                                          : "#c62828",
                                    }}
                                  >
                                    {new Date(po.actual_arrival) <=
                                    new Date(po.expected_arrival)
                                      ? "✓ On time"
                                      : "✗ Late"}
                                  </span>
                                )}
                                <span>
                                  {po.landed_cost_zar
                                    ? fmtZar(po.landed_cost_zar)
                                    : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
