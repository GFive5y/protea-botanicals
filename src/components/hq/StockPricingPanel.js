// StockPricingPanel.js v1.3
// WP-STOCK-PRICING — Bulk pricing + full audit trail
// NEW: price_history writes on every save · AuditDrawer per item
//      (price changes + stock movements — who/when/from→to)
// LL-160: tenantId as PROP — never fetched from user_profiles
// LL-161: full inventory_items column select
// Visual: T-token system, matches HQStock (WP-VISUAL-SYSTEM v1.0)

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ClipboardList, Target, X, User, Clock, Package } from "lucide-react";
import { useTenant } from "../../services/tenantService";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";

const Ty = {
  label: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    fontFamily: T.font,
  },
  body: { fontSize: "13px", fontWeight: 400, fontFamily: T.font },
  caption: { fontSize: "11px", fontWeight: 400, fontFamily: T.font },
  data: {
    fontSize: "12px",
    fontWeight: 400,
    fontFamily: T.font,
    fontVariantNumeric: "tabular-nums",
  },
};

const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  ...Ty.label,
  color: T.ink500,
  borderBottom: `2px solid ${T.border}`,
  background: T.surface,
  whiteSpace: "nowrap",
};
const sTd = {
  padding: "9px 12px",
  borderBottom: `1px solid ${T.border}`,
  ...Ty.body,
  color: T.ink700,
  verticalAlign: "middle",
};

const sBtn = (v = "primary", dis = false) => ({
  ...Ty.label,
  padding: "7px 16px",
  borderRadius: 6,
  cursor: dis ? "not-allowed" : "pointer",
  opacity: dis ? 0.45 : 1,
  transition: "opacity .15s",
  ...(v === "primary"
    ? { background: T.accentMid, color: "#fff", border: "none" }
    : {}),
  ...(v === "secondary"
    ? {
        background: "transparent",
        color: T.accentMid,
        border: `1px solid ${T.accentBd}`,
      }
    : {}),
  ...(v === "ghost"
    ? {
        background: "transparent",
        color: T.ink500,
        border: `1px solid ${T.border}`,
      }
    : {}),
  ...(v === "danger"
    ? { background: T.danger, color: "#fff", border: "none" }
    : {}),
});

// ─── LL-161 full column list ───────────────────────────────────────────────────
const FULL_SELECT = [
  "id",
  "name",
  "sku",
  "brand",
  "category",
  "subcategory",
  "variant_type",
  "variant_value",
  "tags",
  "strain_type",
  "weight_grams",
  "quantity_on_hand",
  "weighted_avg_cost",
  "cost_price",
  "sell_price",
  "unit",
  "reorder_level",
  "reorder_qty",
  "max_stock_level",
  "supplier_id",
  "expiry_date",
  "batch_lot_number",
  "is_active",
  "tenant_id",
  "loyalty_category",
  "pts_override",
  "medium_type",
  "description",
  "created_at",
].join(", ");

const HASH_SUBS = [
  "hash",
  "dry_sift",
  "bubble_hash",
  "pressed_hash",
  "charas",
  "temple_ball",
  "lebanese",
  "moroccan",
  "afghani",
  "finger_hash",
  "kief",
  "moon_rock",
  "dry_ice_hash",
];

const CATS = [
  { key: "all", label: "All Items", icon: "◈", match: () => true },
  { key: "flower", label: "Flower", icon: null, match: (i) => i.category === "flower" },
  {
    key: "concentrate",
    label: "Concentrate",
    icon: null,
    match: (i) => i.category === "concentrate" && !HASH_SUBS.includes(i.subcategory),
  },
  {
    key: "hash",
    label: "Hash",
    icon: null,
    match: (i) => i.category === "concentrate" && HASH_SUBS.includes(i.subcategory),
  },
  { key: "finished_product", label: "Vapes", icon: null, match: (i) => i.category === "finished_product" },
  { key: "edible", label: "Edible", icon: null, match: (i) => i.category === "edible" },
  { key: "hardware", label: "Equipment", icon: null, match: (i) => i.category === "hardware" },
];

const DISPENSARY_CATS = [
  { key: "all", label: "All Items", icon: "◈", match: () => true },
  { key: "concentrate", label: "Concentrate", icon: null, match: (i) => i.category === "concentrate" },
  { key: "edible", label: "Edible", icon: null, match: (i) => i.category === "edible" },
  { key: "flower", label: "Flower", icon: null, match: (i) => i.category === "flower" },
  { key: "topical", label: "Topical", icon: null, match: (i) => i.category === "topical" },
  { key: "medical_consumable", label: "Medical", icon: null, match: (i) => i.category === "medical_consumable" },
  { key: "terpene", label: "Terpene", icon: null, match: (i) => i.category === "terpene" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
// Sentinel: item has a sell price but no cost basis yet (AVCO = 0).
// Distinct from null (no sell price) and from a real 100% margin.
// Fix: use Receive Delivery (not Adjust) to set AVCO via DB trigger.
const NO_COST = "NO_COST";

function calcMargin(sell, avco) {
  const sp = parseFloat(sell),
    ac = parseFloat(avco);
  if (!sp || sp <= 0) return null; // no sell price — show —
  if (!ac || ac <= 0) return NO_COST; // priced but no cost — show NO COST
  return ((sp - ac) / sp) * 100;
}
function priceFromMargin(pct, avco) {
  const ac = parseFloat(avco),
    m = parseFloat(pct);
  if (!ac || ac <= 0 || isNaN(m) || m <= 0 || m >= 100) return null;
  return ac / (1 - m / 100);
}
function marginBadge(margin) {
  if (margin === null) return null;
  // NO_COST sentinel: item is priced but AVCO=0 — misleading to show 100%
  // Owner must use Receive Delivery to establish cost basis.
  if (margin === NO_COST)
    return {
      bg: T.bg,
      bd: T.border,
      color: T.ink500,
      label: "NO COST",
      tooltip:
        "Receive a delivery to set cost basis. Margin calculates automatically.",
    };
  if (margin < 20)
    return {
      bg: T.dangerLight,
      bd: T.dangerBd,
      color: T.danger,
      label: `${margin.toFixed(1)}%`,
    };
  if (margin < 40)
    return {
      bg: T.warningLight,
      bd: T.warningBd,
      color: T.warning,
      label: `${margin.toFixed(1)}%`,
    };
  return {
    bg: T.successLight,
    bd: T.successBd,
    color: T.success,
    label: `${margin.toFixed(1)}%`,
  };
}
function variantStr(item) {
  if (item.variant_value) return item.variant_value;
  if (item.weight_grams) return `${item.weight_grams}g`;
  if (item.strain_type) return item.strain_type;
  return "";
}
const fmtR = (n) =>
  n == null
    ? "—"
    : "R " +
      Number(n).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const fmtShort = (n) =>
  n == null
    ? ""
    : Number(n).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ─── Movement type colours ─────────────────────────────────────────────────────
const MOV_COLOR = {
  purchase_in: T.success,
  sale_out: T.danger,
  adjustment: T.warning,
  transfer_in: T.info,
  transfer_out: T.info,
  production_in: T.accentMid,
  production_out: T.accentMid,
  stock_take_adjustment: T.warning,
};

// ─────────────────────────────────────────────────────────────────────────────
// AuditDrawer — slide-in from right
// Shows: price_history (who/when/from→to/source) + stock_movements (full trail)
// ─────────────────────────────────────────────────────────────────────────────
function AuditDrawer({ item, onClose }) {
  const [tab, setTab] = useState("prices");
  const [prices, setPrices] = useState([]);
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!item) return;
    setLoading(true);
    setTab("prices");
    Promise.all([
      supabase
        .from("price_history")
        .select("*")
        .eq("item_id", item.id)
        .order("changed_at", { ascending: false })
        .limit(50),
      supabase
        .from("stock_movements")
        .select("*")
        .eq("item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]).then(([ph, mv]) => {
      setPrices(ph.data || []);
      setMovs(mv.data || []);
      setLoading(false);
    });
  }, [item]);

  if (!item) return null;
  const margin = calcMargin(item.sell_price, item.weighted_avg_cost);
  const mb = marginBadge(margin);

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.18)",
          zIndex: 999,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 480,
          height: "100vh",
          background: "#fff",
          borderLeft: `1px solid ${T.border}`,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.09)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          fontFamily: T.font,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: T.ink900,
                  marginBottom: 2,
                }}
              >
                {item.name}
              </div>
              <div style={{ ...Ty.caption, color: T.ink300 }}>
                {item.sku} · {item.subcategory || item.category}
                {variantStr(item) && ` · ${variantStr(item)}`}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.ink400,
                lineHeight: 1,
                padding: 4,
                marginLeft: 8,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
          {/* KPI strip */}
          <div
            style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
          >
            {[
              {
                label: "Current Price",
                value: item.sell_price ? fmtR(item.sell_price) : "Not set",
                danger: !item.sell_price,
              },
              {
                label: "AVCO Cost",
                value: item.weighted_avg_cost
                  ? fmtR(item.weighted_avg_cost)
                  : "—",
              },
              mb
                ? {
                    label: "Margin",
                    value: mb.label,
                    color: mb.color,
                    bg: mb.bg,
                    bd: mb.bd,
                    tooltip: mb.tooltip,
                  }
                : null,
              {
                label: "On Hand",
                value: `${item.quantity_on_hand ?? 0}${item.unit ? " " + item.unit : ""}`,
                danger: (item.quantity_on_hand ?? 0) <= 0,
              },
            ]
              .filter(Boolean)
              .map((k, i) => (
                <div
                  key={i}
                  title={k.tooltip || undefined}
                  style={{
                    background: k.bg || T.bg,
                    border: `1px solid ${k.bd || T.border}`,
                    borderRadius: 4,
                    padding: "6px 10px",
                    cursor: k.tooltip ? "help" : "default",
                  }}
                >
                  <div style={{ ...Ty.caption, color: k.color || T.ink500 }}>
                    {k.label}
                  </div>
                  <div
                    style={{
                      ...Ty.data,
                      fontWeight: 700,
                      color: k.danger ? T.danger : k.color || T.ink900,
                    }}
                  >
                    {k.value}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
          {[
            { id: "prices", label: `Price History (${prices.length})` },
            { id: "movements", label: `Stock Movements (${movs.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderBottom:
                  tab === t.id
                    ? `2px solid ${T.accentMid}`
                    : "2px solid transparent",
                ...Ty.label,
                color: tab === t.id ? T.accentMid : T.ink500,
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {loading ? (
            <p style={{ ...Ty.body, color: T.ink300, padding: "24px 0" }}>
              Loading audit trail…
            </p>
          ) : tab === "prices" ? (
            prices.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: T.ink300,
                }}
              >
                <div style={{ marginBottom: 8, color: T.ink400 }}><ClipboardList size={32} /></div>
                <div style={{ ...Ty.body }}>No price changes recorded yet.</div>
                <div style={{ ...Ty.caption, color: T.ink500, marginTop: 4 }}>
                  Price changes logged here from v1.3 onwards.
                </div>
              </div>
            ) : (
              prices.map((ph, i) => {
                const delta =
                  ph.old_price != null ? ph.new_price - ph.old_price : null;
                return (
                  <div
                    key={ph.id}
                    style={{
                      padding: "12px 14px",
                      marginBottom: 8,
                      background: i === 0 ? T.accentLight : T.surface,
                      border: `1px solid ${i === 0 ? T.accentBd : T.border}`,
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {ph.old_price != null ? (
                          <span
                            style={{
                              ...Ty.data,
                              color: T.ink500,
                              textDecoration: "line-through",
                            }}
                          >
                            {fmtR(ph.old_price)}
                          </span>
                        ) : (
                          <span style={{ ...Ty.caption, color: T.ink500 }}>
                            First price →
                          </span>
                        )}
                        <span style={{ ...Ty.caption, color: T.ink300 }}>
                          →
                        </span>
                        <span
                          style={{
                            ...Ty.data,
                            fontWeight: 700,
                            color: T.ink900,
                          }}
                        >
                          {fmtR(ph.new_price)}
                        </span>
                        {delta !== null && (
                          <span
                            style={{
                              ...Ty.caption,
                              fontWeight: 700,
                              color: delta > 0 ? T.success : T.danger,
                            }}
                          >
                            {delta > 0 ? "▲" : "▼"} R
                            {Math.abs(delta).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          background:
                            ph.source === "target_margin" ? T.infoLight : T.bg,
                          color:
                            ph.source === "target_margin" ? T.info : T.ink500,
                          border: `1px solid ${ph.source === "target_margin" ? T.infoBd : T.border}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ph.source === "target_margin"
                          ? "Margin Calc"
                          : "Manual"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ ...Ty.caption, color: T.ink500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <User size={10} />{ph.changed_by_email || "Unknown"}
                      </span>
                      <span style={{ ...Ty.caption, color: T.ink400, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Clock size={10} />{fmtDate(ph.changed_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          ) : movs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: T.ink300,
              }}
            >
              <div style={{ marginBottom: 8, color: T.ink400 }}><Package size={32} /></div>
              <div style={{ ...Ty.body }}>No stock movements recorded.</div>
            </div>
          ) : (
            movs.map((m) => {
              const qty = m.quantity || 0;
              const typeColor = MOV_COLOR[m.movement_type] || T.ink500;
              return (
                <div
                  key={m.id}
                  style={{
                    padding: "10px 14px",
                    marginBottom: 6,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${typeColor}`,
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 7px",
                        borderRadius: 3,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        background: T.bg,
                        color: typeColor,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      {(m.movement_type || "").replace(/_/g, " ")}
                    </span>
                    <span
                      style={{
                        ...Ty.data,
                        fontWeight: 700,
                        color: qty >= 0 ? T.success : T.danger,
                      }}
                    >
                      {qty >= 0 ? "+" : ""}
                      {qty}
                      {item.unit ? " " + item.unit : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ ...Ty.caption, color: T.ink400, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Clock size={10} />{fmtDate(m.created_at)}
                    </span>
                    {m.unit_cost > 0 && (
                      <span style={{ ...Ty.caption, color: T.ink500 }}>
                        {fmtR(m.unit_cost)}/unit
                      </span>
                    )}
                    {m.reference && (
                      <span
                        style={{ ...Ty.data, fontSize: 10, color: T.ink500 }}
                      >
                        Ref: {m.reference}
                      </span>
                    )}
                  </div>
                  {m.notes && (
                    <div
                      style={{
                        ...Ty.caption,
                        color: T.ink500,
                        marginTop: 4,
                        fontStyle: "italic",
                      }}
                    >
                      "{m.notes}"
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: `1px solid ${T.border}`,
            background: T.surface,
          }}
        >
          <span style={{ ...Ty.caption, color: T.ink300 }}>
            {prices.length} price change{prices.length !== 1 ? "s" : ""} ·{" "}
            {movs.length} stock movement{movs.length !== 1 ? "s" : ""} · click
            outside to close
          </span>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function StockPricingPanel({ tenantId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [unpricedOnly, setUnpricedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);
  const [saveSource, setSaveSource] = useState("manual");
  const [targetMargin, setTargetMargin] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const searchRef = useRef(null);

  const { industryProfile } = useTenant();
  const activeCats = industryProfile === "cannabis_dispensary" ? DISPENSARY_CATS : CATS;

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select(FULL_SELECT)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");
    if (!error && data) setItems(data);
    if (error) console.error("[StockPricingPanel] load:", error.message);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const catCounts = activeCats.reduce((acc, c) => {
    acc[c.key] = items.filter((i) => c.match(i)).length;
    return acc;
  }, {});
  const activeCat = activeCats.find((c) => c.key === catFilter) || activeCats[0];

  let filtered = items.filter((item) => {
    if (!activeCat.match(item)) return false;
    if (unpricedOnly) {
      const val =
        edits[item.id] !== undefined ? edits[item.id] : item.sell_price;
      if (val && parseFloat(val) > 0) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q) ||
        (item.variant_value || "").toLowerCase().includes(q) ||
        (item.subcategory || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "margin_asc") {
      const ma = calcMargin(edits[a.id] ?? a.sell_price, a.weighted_avg_cost),
        mb2 = calcMargin(edits[b.id] ?? b.sell_price, b.weighted_avg_cost);
      if (ma === null && mb2 === null) return 0;
      if (ma === null) return -1;
      if (mb2 === null) return 1;
      return ma - mb2;
    }
    if (sortBy === "margin_desc") {
      const ma = calcMargin(edits[a.id] ?? a.sell_price, a.weighted_avg_cost),
        mb2 = calcMargin(edits[b.id] ?? b.sell_price, b.weighted_avg_cost);
      if (ma === null && mb2 === null) return 0;
      if (ma === null) return 1;
      if (mb2 === null) return -1;
      return mb2 - ma;
    }
    if (sortBy === "price_asc")
      return (a.sell_price || 0) - (b.sell_price || 0);
    if (sortBy === "stock_asc")
      return (a.quantity_on_hand || 0) - (b.quantity_on_hand || 0);
    return (a.name || "").localeCompare(b.name || "");
  });

  const changedCount = Object.keys(edits).length;
  const allUnpriced = items.filter(
    (i) => !i.sell_price || i.sell_price <= 0,
  ).length;
  const visUnpriced = filtered.filter((i) => {
    const val = edits[i.id] !== undefined ? edits[i.id] : i.sell_price;
    return !val || parseFloat(val) <= 0;
  }).length;
  const getSell = (item) =>
    edits[item.id] !== undefined ? edits[item.id] : (item.sell_price ?? "");
  const getMargin = (item) => calcMargin(getSell(item), item.weighted_avg_cost);

  const handleChange = (id, val) => {
    setSaveSource("manual");
    setEdits((p) => ({ ...p, [id]: val }));
    setResult(null);
  };
  const discard = () => {
    setEdits({});
    setResult(null);
    setSaveSource("manual");
  };

  const applyTargetMargin = () => {
    const pct = parseFloat(targetMargin);
    if (!pct || pct <= 0 || pct >= 100) return;
    const newEdits = { ...edits };
    filtered.forEach((item) => {
      if (!item.weighted_avg_cost) return;
      const price = priceFromMargin(pct, item.weighted_avg_cost);
      if (price !== null) newEdits[item.id] = price.toFixed(2);
    });
    setEdits(newEdits);
    setSaveSource("target_margin");
    setResult(null);
    setCalcOpen(false);
    setTargetMargin("");
  };

  const saveAll = async () => {
    if (!changedCount || saving) return;
    setSaving(true);
    setResult(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userEmail = user?.email || "Unknown";
    const userId = user?.id || null;
    const currentPrices = items.reduce((acc, i) => {
      acc[i.id] = i.sell_price;
      return acc;
    }, {});
    let saved = 0;
    const errors = [];

    for (const [id, raw] of Object.entries(edits)) {
      const num = parseFloat(raw);
      if (isNaN(num) || num < 0) {
        errors.push(`Invalid: ${items.find((i) => i.id === id)?.name ?? id}`);
        continue;
      }

      const { error: uErr } = await supabase
        .from("inventory_items")
        .update({ sell_price: num })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (uErr) {
        errors.push(uErr.message);
        continue;
      }

      // Write audit trail — non-fatal if it fails
      const { error: hErr } = await supabase.from("price_history").insert({
        tenant_id: tenantId || null,
        item_id: id,
        changed_by: userId,
        changed_by_email: userEmail,
        old_price: currentPrices[id] ?? null,
        new_price: num,
        source: saveSource,
      });
      if (hErr)
        console.warn(
          "[StockPricingPanel] price_history write failed:",
          hErr.message,
        );

      saved++;
    }

    await load();
    setEdits({});
    setSaveSource("manual");
    setResult({ saved, errors });
    setSaving(false);
  };

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (changedCount && !saving) saveAll();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [changedCount, saving, edits, saveSource]); // eslint-disable-line

  if (loading)
    return (
      <p style={{ ...Ty.body, color: T.ink300, padding: "32px 0" }}>
        Loading pricing data…
      </p>
    );

  return (
    <div
      style={{
        fontFamily: T.font,
        color: T.ink700,
        paddingBottom: changedCount > 0 ? 72 : 0,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <p style={{ ...Ty.caption, color: T.ink300, margin: 0 }}>
          {items.length} active items · edit inline · margin from AVCO ·{" "}
          <span style={{ color: T.accentMid, fontWeight: 600 }}>
            click any name for audit trail
          </span>
          {allUnpriced > 0 && (
            <span style={{ color: T.danger, fontWeight: 600, marginLeft: 10 }}>
              · {allUnpriced} unpriced
            </span>
          )}
        </p>
        <button
          style={{
            ...sBtn("secondary"),
            fontSize: "11px",
            padding: "5px 12px",
          }}
          onClick={() => setCalcOpen((o) => !o)}
        >
          <Target size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />{calcOpen ? "Close" : "Target Margin"}
        </button>
      </div>

      {/* Result banner */}
      {result && (
        <div
          style={{
            background: result.errors.length ? T.dangerLight : T.successLight,
            border: `1px solid ${result.errors.length ? T.dangerBd : T.successBd}`,
            color: result.errors.length ? T.danger : T.success,
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 14,
            ...Ty.body,
          }}
        >
          {result.saved > 0 && (
            <span>
              ✓ {result.saved} price{result.saved !== 1 ? "s" : ""} saved and
              logged to audit trail.{" "}
            </span>
          )}
          {result.errors.length > 0 && (
            <span>⚠ {result.errors.join(" · ")}</span>
          )}
        </div>
      )}

      {/* Margin Calculator */}
      {calcOpen && (
        <div
          style={{
            background: T.infoLight,
            border: `1px solid ${T.infoBd}`,
            borderRadius: 6,
            padding: "14px 18px",
            marginBottom: 14,
          }}
        >
          <div style={{ ...Ty.label, color: T.info, marginBottom: 10 }}>
            Target Margin Calculator
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ ...Ty.caption, color: T.ink500, marginBottom: 4 }}>
                Target margin %
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  placeholder="e.g. 65"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(e.target.value)}
                  style={{
                    width: 80,
                    padding: "7px 10px",
                    border: `1px solid ${T.infoBd}`,
                    borderRadius: 4,
                    ...Ty.data,
                    color: T.ink900,
                    background: "#fff",
                    outline: "none",
                  }}
                />
                <span style={{ ...Ty.caption, color: T.ink500 }}>%</span>
              </div>
            </div>
            <div>
              <div style={{ ...Ty.caption, color: T.ink500, marginBottom: 4 }}>
                Applies to
              </div>
              <div style={{ ...Ty.body, color: T.info, fontWeight: 600 }}>
                {filtered.filter((i) => i.weighted_avg_cost > 0).length} visible
                items with AVCO
              </div>
            </div>
            {targetMargin &&
              parseFloat(targetMargin) > 0 &&
              parseFloat(targetMargin) < 100 && (
                <div>
                  <div
                    style={{ ...Ty.caption, color: T.ink500, marginBottom: 4 }}
                  >
                    Preview (first 3)
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {filtered
                      .filter((i) => i.weighted_avg_cost > 0)
                      .slice(0, 3)
                      .map((i) => {
                        const price = priceFromMargin(
                          targetMargin,
                          i.weighted_avg_cost,
                        );
                        return price ? (
                          <span
                            key={i.id}
                            style={{ ...Ty.caption, color: T.info }}
                          >
                            {i.name.split(" ").slice(0, 2).join(" ")} → R
                            {price.toFixed(2)}
                          </span>
                        ) : null;
                      })}
                  </div>
                </div>
              )}
            <button
              style={sBtn(
                "primary",
                !targetMargin ||
                  parseFloat(targetMargin) <= 0 ||
                  parseFloat(targetMargin) >= 100,
              )}
              onClick={applyTargetMargin}
              disabled={
                !targetMargin ||
                parseFloat(targetMargin) <= 0 ||
                parseFloat(targetMargin) >= 100
              }
            >
              Apply to {filtered.filter((i) => i.weighted_avg_cost > 0).length}{" "}
              Items
            </button>
            <button
              style={sBtn("ghost")}
              onClick={() => {
                setCalcOpen(false);
                setTargetMargin("");
              }}
            >
              Cancel
            </button>
          </div>
          <p style={{ ...Ty.caption, color: T.ink500, margin: "10px 0 0" }}>
            Formula: sell = AVCO ÷ (1 − margin%). Logged to audit trail as
            "Margin Calc". Items with no AVCO skipped.
          </p>
        </div>
      )}

      {/* Category pills */}
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}
      >
        {activeCats.map(({ key, label, icon }) => {
          const count = catCounts[key],
            active = catFilter === key;
          return (
            <button
              key={key}
              onClick={() => {
                if (count > 0 || key === "all") setCatFilter(key);
              }}
              style={{
                padding: "4px 11px",
                borderRadius: 16,
                ...Ty.caption,
                fontWeight: active ? 700 : 500,
                border: `1.5px solid ${active ? T.accentMid : T.border}`,
                background: active ? T.accentMid : "#fff",
                color: active ? "#fff" : T.ink700,
                cursor: count === 0 && key !== "all" ? "default" : "pointer",
                opacity: count === 0 && key !== "all" ? 0.4 : 1,
              }}
            >
              {icon ? <span style={{ marginRight: 2 }}>{icon}</span> : null}{label} <span style={{ opacity: 0.65 }}>×{count}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          ref={searchRef}
          type="text"
          placeholder="Search name, SKU, brand, variant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "7px 12px",
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            ...Ty.body,
            background: "#fff",
            outline: "none",
            width: 220,
            boxSizing: "border-box",
            color: T.ink900,
          }}
        />
        <button
          onClick={() => setUnpricedOnly((o) => !o)}
          style={{
            ...sBtn(unpricedOnly ? "danger" : "ghost"),
            padding: "7px 12px",
            fontSize: "11px",
          }}
        >
          {unpricedOnly
            ? `✕ Unpriced only (${visUnpriced})`
            : `⚠ Unpriced (${allUnpriced})`}
        </button>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "7px 10px",
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            ...Ty.body,
            background: "#fff",
            color: T.ink700,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="name">Sort: Name A–Z</option>
          <option value="margin_asc">Sort: Margin Low → High</option>
          <option value="margin_desc">Sort: Margin High → Low</option>
          <option value="price_asc">Sort: Price Low → High</option>
          <option value="stock_asc">Sort: On Hand Low → High</option>
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ ...Ty.label, color: T.ink500 }}>MARGIN</span>
          {[
            { l: "< 20%", c: T.danger },
            { l: "20–40%", c: T.warning },
            { l: "> 40%", c: T.success },
          ].map(({ l, c }) => (
            <span key={l} style={{ ...Ty.caption, color: c }}>
              ● {l}
            </span>
          ))}
        </div>
        <span style={{ ...Ty.caption, color: T.ink500 }}>
          {filtered.length} of {items.length}
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          overflow: "auto",
          boxShadow: T.shadow.sm,
          marginBottom: 12,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
            fontFamily: T.font,
          }}
        >
          <thead>
            <tr>
              <th style={{ ...sTh, width: "11%" }}>SKU</th>
              <th style={{ ...sTh, width: "27%" }}>Name</th>
              <th style={{ ...sTh, width: "11%" }}>Category</th>
              <th style={{ ...sTh, width: "10%" }}>Variant</th>
              <th style={{ ...sTh, width: "12%", textAlign: "right" }}>
                AVCO Cost
              </th>
              <th style={{ ...sTh, width: "13%", textAlign: "right" }}>
                Sell Price
              </th>
              <th style={{ ...sTh, width: "8%", textAlign: "right" }}>
                Margin
              </th>
              <th style={{ ...sTh, width: "5%", textAlign: "right" }}>Stock</th>
              <th style={{ ...sTh, width: "3%", textAlign: "center" }}><ClipboardList size={13} /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    ...sTd,
                    textAlign: "center",
                    color: T.ink300,
                    padding: 40,
                  }}
                >
                  {unpricedOnly
                    ? "All visible items are priced."
                    : "No items match."}{" "}
                  {search && (
                    <span
                      style={{
                        color: T.accentMid,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      onClick={() => setSearch("")}
                    >
                      Clear search →
                    </span>
                  )}
                  {unpricedOnly && (
                    <span
                      style={{
                        color: T.accentMid,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      onClick={() => setUnpricedOnly(false)}
                    >
                      Show all →
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const focused = focusId === item.id;
                const edited = edits[item.id] !== undefined;
                const margin = getMargin(item);
                const mb = marginBadge(margin);
                const rowBg = focused
                  ? T.accentLight
                  : edited
                    ? "#FFFEF0"
                    : idx % 2 === 0
                      ? "#fff"
                      : T.surface;
                const lowStock = (item.quantity_on_hand ?? 0) <= 0;

                return (
                  <tr
                    key={item.id}
                    style={{
                      background: rowBg,
                      borderLeft: edited
                        ? `3px solid ${T.accentMid}`
                        : "3px solid transparent",
                    }}
                  >
                    <td
                      style={{
                        ...sTd,
                        ...Ty.data,
                        color: T.ink300,
                        fontSize: "10px",
                      }}
                    >
                      {item.sku || "—"}
                    </td>

                    {/* Name — click to open audit drawer */}
                    <td
                      style={{ ...sTd, cursor: "pointer" }}
                      onClick={() => setDrawerItem(item)}
                      title="Click to view audit trail"
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: T.accentMid,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.name}
                      </div>
                      {item.brand && (
                        <div
                          style={{
                            ...Ty.caption,
                            color: T.ink300,
                            marginTop: 1,
                          }}
                        >
                          {item.brand}
                        </div>
                      )}
                    </td>

                    <td style={sTd}>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 3,
                          background: T.bg,
                          color: T.ink500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        {item.subcategory || item.category}
                      </span>
                    </td>

                    <td style={sTd}>
                      {variantStr(item) ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            background: "#EEF2FF",
                            color: "#3730A3",
                          }}
                        >
                          {variantStr(item)}
                        </span>
                      ) : (
                        <span style={{ color: T.ink300 }}>—</span>
                      )}
                    </td>

                    <td
                      style={{
                        ...sTd,
                        ...Ty.data,
                        textAlign: "right",
                        color: T.ink500,
                      }}
                    >
                      {item.weighted_avg_cost ? (
                        fmtR(item.weighted_avg_cost)
                      ) : (
                        <span style={{ color: T.ink300 }}>—</span>
                      )}
                    </td>

                    {/* Sell Price — editable */}
                    <td style={{ ...sTd, textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 3,
                        }}
                      >
                        <span style={{ ...Ty.caption, color: T.ink500 }}>
                          R
                        </span>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={getSell(item)}
                            placeholder="0.00"
                            onFocus={() => setFocusId(item.id)}
                            onBlur={() => setFocusId(null)}
                            onChange={(e) =>
                              handleChange(item.id, e.target.value)
                            }
                            style={{
                              width: 80,
                              padding: "5px 8px",
                              border: `1px solid ${focused ? T.accent : edited ? T.accentMid : T.border}`,
                              borderRadius: 3,
                              ...Ty.data,
                              color: T.ink900,
                              textAlign: "right",
                              background: "#fff",
                              outline: "none",
                              transition: "border-color .15s",
                              display: "block",
                            }}
                          />
                          {edited &&
                            item.sell_price &&
                            parseFloat(item.sell_price) > 0 && (
                              <div
                                style={{
                                  ...Ty.caption,
                                  color: T.ink300,
                                  textAlign: "right",
                                  marginTop: 2,
                                  fontSize: 9,
                                }}
                              >
                                was {fmtShort(item.sell_price)}
                              </div>
                            )}
                        </div>
                      </div>
                    </td>

                    <td style={{ ...sTd, textAlign: "right" }}>
                      {mb ? (
                        <span
                          title={mb.tooltip || undefined}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 3,
                            letterSpacing: "0.06em",
                            background: mb.bg,
                            border: `1px solid ${mb.bd}`,
                            color: mb.color,
                            cursor: mb.tooltip ? "help" : "default",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {mb.label}
                        </span>
                      ) : (
                        <span style={{ ...Ty.caption, color: T.ink300 }}>
                          —
                        </span>
                      )}
                    </td>

                    <td
                      style={{
                        ...sTd,
                        ...Ty.data,
                        textAlign: "right",
                        color: lowStock ? T.danger : T.ink500,
                      }}
                    >
                      {item.quantity_on_hand ?? 0}
                      {lowStock && (
                        <span
                          style={{
                            display: "block",
                            fontSize: 9,
                            fontWeight: 700,
                            color: T.danger,
                          }}
                        >
                          OUT
                        </span>
                      )}
                    </td>

                    {/* Audit icon */}
                    <td
                      style={{
                        ...sTd,
                        textAlign: "center",
                        padding: "9px 6px",
                      }}
                    >
                      <button
                        onClick={() => setDrawerItem(item)}
                        title="View audit trail"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: T.ink400,
                          padding: 2,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <ClipboardList size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ ...Ty.caption, color: T.ink500 }}>
          {filtered.length} of {items.length} items shown
        </span>
        {visUnpriced > 0 && !unpricedOnly && (
          <button
            onClick={() => setUnpricedOnly(true)}
            style={{
              ...Ty.caption,
              color: T.danger,
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ⚠ {visUnpriced} unpriced in view — click to filter
          </button>
        )}
        <span style={{ ...Ty.caption, color: T.ink300 }}>
          Click any name for audit trail · Ctrl+S to save
        </span>
      </div>

      {/* Sticky save bar */}
      {changedCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            background: "#fff",
            borderTop: `2px solid ${T.accentBd}`,
            boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span
              style={{
                ...Ty.label,
                background: T.warningLight,
                border: `1px solid ${T.warningBd}`,
                color: T.warning,
                padding: "4px 10px",
                borderRadius: 4,
              }}
            >
              {changedCount} unsaved change{changedCount !== 1 ? "s" : ""}
            </span>
            <span style={{ ...Ty.caption, color: T.ink500 }}>
              Ctrl+S · not yet written · audit trail written on save
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={sBtn("ghost")} onClick={discard}>
              Discard All
            </button>
            <button
              style={sBtn("primary", saving)}
              onClick={saveAll}
              disabled={saving}
            >
              {saving ? "Saving…" : `Save All (${changedCount})`}
            </button>
          </div>
        </div>
      )}

      {/* Audit Drawer */}
      <AuditDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </div>
  );
}
