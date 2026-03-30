// StockPricingPanel.js v1.1
// WP-STOCK-PRICING — Bulk sell price setter, live margin preview, batch save
// Visual system: matches HQStock T-token palette exactly (WP-VISUAL-SYSTEM v1.0)
// LL-160: tenantId as PROP — never fetched from user_profiles
// LL-161: full inventory_items column select

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── T Tokens (mirrors HQStock exactly) ──────────────────────────────────────
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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

// ─── Typography tokens (WP-VISUAL-SYSTEM Section 2.1) ────────────────────────
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
    fontFamily: T.mono,
    fontVariantNumeric: "tabular-nums",
  },
};

// ─── Shared table styles (mirrors HQStock sTh / sTd) ─────────────────────────
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  ...Ty.label,
  color: T.ink500,
  borderBottom: `2px solid ${T.ink150}`,
  background: T.ink050,
  whiteSpace: "nowrap",
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink150}`,
  ...Ty.body,
  color: T.ink700,
  verticalAlign: "middle",
};

// ─── Button helpers (WP-VISUAL-SYSTEM Section 3.3) ───────────────────────────
const sBtn = (variant = "primary", disabled = false) => ({
  ...Ty.label,
  padding: "7px 16px",
  borderRadius: 6,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
  transition: "opacity .15s",
  ...(variant === "primary"
    ? { background: T.accentMid, color: "#fff", border: "none" }
    : {}),
  ...(variant === "secondary"
    ? {
        background: "transparent",
        color: T.accentMid,
        border: `1px solid ${T.accentBd}`,
      }
    : {}),
  ...(variant === "ghost"
    ? {
        background: "transparent",
        color: T.ink500,
        border: `1px solid ${T.ink150}`,
      }
    : {}),
});

// ─── LL-161 full column list ──────────────────────────────────────────────────
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

const CATS = [
  { key: "all", label: "All Items", icon: "◈" },
  { key: "flower", label: "Flower", icon: "🌿" },
  { key: "concentrate", label: "Concentrate", icon: "💧" },
  { key: "hash", label: "Hash", icon: "🟤" },
  { key: "finished_product", label: "Vapes", icon: "💨" },
  { key: "edible", label: "Edible", icon: "🍬" },
  { key: "hardware", label: "Equipment", icon: "🔧" },
];

// ─── Margin helpers ───────────────────────────────────────────────────────────
function calcMargin(sell, avco) {
  const sp = parseFloat(sell);
  const ac = parseFloat(avco);
  if (!sp || sp <= 0) return null;
  if (!ac || ac <= 0) return 100;
  return ((sp - ac) / sp) * 100;
}

function marginBadge(margin) {
  if (margin === null) return null;
  if (margin < 20)
    return {
      bg: T.dangerBg,
      bd: T.dangerBd,
      color: T.danger,
      label: `${margin.toFixed(1)}%`,
    };
  if (margin < 40)
    return {
      bg: T.warningBg,
      bd: T.warningBd,
      color: T.warning,
      label: `${margin.toFixed(1)}%`,
    };
  return {
    bg: T.successBg,
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function StockPricingPanel({ tenantId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const searchRef = useRef(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select(FULL_SELECT)
      .eq("tenant_id", tenantId) // LL-160
      .eq("is_active", true)
      .order("category")
      .order("name");
    if (!error && data) setItems(data);
    if (error) console.error("[StockPricingPanel] load:", error.message);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const catCounts = CATS.reduce((acc, c) => {
    acc[c.key] =
      c.key === "all"
        ? items.length
        : items.filter((i) => i.category === c.key).length;
    return acc;
  }, {});

  const filtered = items.filter((item) => {
    if (catFilter !== "all" && item.category !== catFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      (item.variant_value || "").toLowerCase().includes(q) ||
      (item.subcategory || "").toLowerCase().includes(q)
    );
  });

  const changedCount = Object.keys(edits).length;
  const unpricedCount = filtered.filter((i) => {
    const val = edits[i.id] !== undefined ? edits[i.id] : i.sell_price;
    return !val || parseFloat(val) <= 0;
  }).length;

  const getSell = (item) =>
    edits[item.id] !== undefined ? edits[item.id] : (item.sell_price ?? "");
  const getMargin = (item) => calcMargin(getSell(item), item.weighted_avg_cost);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleChange = (id, val) => {
    setEdits((p) => ({ ...p, [id]: val }));
    setResult(null);
  };
  const discard = () => {
    setEdits({});
    setResult(null);
  };

  const saveAll = async () => {
    if (!changedCount || saving) return;
    setSaving(true);
    setResult(null);
    let saved = 0;
    const errors = [];
    for (const [id, raw] of Object.entries(edits)) {
      const num = parseFloat(raw);
      if (isNaN(num) || num < 0) {
        errors.push(`Invalid: ${items.find((i) => i.id === id)?.name ?? id}`);
        continue;
      }
      const { error } = await supabase
        .from("inventory_items")
        .update({ sell_price: num })
        .eq("id", id)
        .eq("tenant_id", tenantId); // LL-160 always guard with tenant
      if (error) errors.push(error.message);
      else saved++;
    }
    await load();
    setEdits({});
    setResult({ saved, errors });
    setSaving(false);
  };

  // Ctrl+S
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (changedCount && !saving) saveAll();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [changedCount, saving, edits]); // eslint-disable-line

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <p style={{ ...Ty.body, color: T.ink300, padding: "32px 0" }}>
        Loading pricing data…
      </p>
    );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: T.font, color: T.ink700 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <p style={{ ...Ty.caption, color: T.ink300, margin: 0 }}>
          {items.length} active items · edit sell prices inline · margin
          calculated live from AVCO
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {changedCount > 0 && (
            <span
              style={{
                ...Ty.label,
                background: T.warningBg,
                border: `1px solid ${T.warningBd}`,
                color: T.warning,
                padding: "4px 10px",
                borderRadius: 4,
              }}
            >
              {changedCount} unsaved
            </span>
          )}
          {changedCount > 0 && (
            <button style={sBtn("ghost")} onClick={discard}>
              Discard
            </button>
          )}
          <button
            style={sBtn("primary", !changedCount || saving)}
            onClick={saveAll}
            disabled={!changedCount || saving}
          >
            {saving
              ? "Saving…"
              : `Save All${changedCount ? ` (${changedCount})` : ""}`}
          </button>
        </div>
      </div>

      {/* ── Result banner ── */}
      {result && (
        <div
          style={{
            background: result.errors.length ? T.dangerBg : T.successBg,
            border: `1px solid ${result.errors.length ? T.dangerBd : T.successBd}`,
            color: result.errors.length ? T.danger : T.success,
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 16,
            ...Ty.body,
          }}
        >
          {result.saved > 0 && (
            <span>
              ✓ {result.saved} price{result.saved !== 1 ? "s" : ""} saved.{" "}
            </span>
          )}
          {result.errors.length > 0 && (
            <span>⚠ {result.errors.join(" · ")}</span>
          )}
        </div>
      )}

      {/* ── Category pills — matches HQStock brand pill style ── */}
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}
      >
        {CATS.map(({ key, label, icon }) => {
          const count = catCounts[key];
          const active = catFilter === key;
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
                border: `1.5px solid ${active ? T.accentMid : T.ink150}`,
                background: active ? T.accentMid : "#fff",
                color: active ? "#fff" : T.ink700,
                cursor: count === 0 && key !== "all" ? "default" : "pointer",
                opacity: count === 0 && key !== "all" ? 0.4 : 1,
              }}
            >
              {icon} {label} <span style={{ opacity: 0.65 }}>×{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search + legend row ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 14,
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
            padding: "8px 12px",
            border: `1px solid ${T.ink150}`,
            borderRadius: 4,
            ...Ty.body,
            background: "#fff",
            outline: "none",
            width: 260,
            boxSizing: "border-box",
            color: T.ink900,
          }}
        />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ ...Ty.label, color: T.ink400 }}>MARGIN</span>
          {[
            { label: "< 20% low", color: T.danger },
            { label: "20–40% ok", color: T.warning },
            { label: "> 40% strong", color: T.success },
          ].map(({ label, color }) => (
            <span key={label} style={{ ...Ty.caption, color }}>
              ● {label}
            </span>
          ))}
        </div>
        <span style={{ ...Ty.caption, color: T.ink400 }}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table — matches HQStock FoodItems table pattern ── */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${T.ink150}`,
          borderRadius: 6,
          overflow: "auto",
          boxShadow: T.shadow,
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
              <th style={sTh}>SKU</th>
              <th style={sTh}>Name</th>
              <th style={sTh}>Category</th>
              <th style={sTh}>Variant</th>
              <th style={{ ...sTh, textAlign: "right" }}>AVCO Cost</th>
              <th style={{ ...sTh, textAlign: "right" }}>Sell Price</th>
              <th style={{ ...sTh, textAlign: "right" }}>Margin</th>
              <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    ...sTd,
                    textAlign: "center",
                    color: T.ink300,
                    padding: 40,
                  }}
                >
                  No items match.{" "}
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
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const focused = focusId === item.id;
                const edited = edits[item.id] !== undefined;
                const margin = getMargin(item);
                const mb = marginBadge(margin);
                const isEven = idx % 2 === 0;
                const rowBg = focused
                  ? T.accentLit
                  : edited
                    ? "#FFFEF5"
                    : isEven
                      ? "#fff"
                      : T.ink050;
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
                    {/* SKU */}
                    <td
                      style={{
                        ...sTd,
                        ...Ty.data,
                        color: T.ink300,
                        minWidth: 100,
                      }}
                    >
                      {item.sku || "—"}
                    </td>

                    {/* Name */}
                    <td style={{ ...sTd, minWidth: 180 }}>
                      <div style={{ fontWeight: 600, color: T.ink700 }}>
                        {item.name}
                      </div>
                      {item.brand && (
                        <div
                          style={{
                            ...Ty.caption,
                            color: T.ink400,
                            marginTop: 2,
                          }}
                        >
                          {item.brand}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td style={sTd}>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 7px",
                          borderRadius: 3,
                          background: T.ink075,
                          color: T.ink500,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        {item.category}
                      </span>
                      {item.subcategory && (
                        <span
                          style={{
                            ...Ty.caption,
                            color: T.ink300,
                            marginLeft: 5,
                          }}
                        >
                          {item.subcategory}
                        </span>
                      )}
                    </td>

                    {/* Variant */}
                    <td style={sTd}>
                      {variantStr(item) ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 7px",
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

                    {/* AVCO Cost */}
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
                        <span style={{ ...Ty.caption, color: T.ink400 }}>
                          R
                        </span>
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
                            border: `1px solid ${focused ? T.accent : edited ? T.accentMid : T.ink150}`,
                            borderRadius: 3,
                            ...Ty.data,
                            color: T.ink900,
                            textAlign: "right",
                            background: "#fff",
                            outline: "none",
                            transition: "border-color .15s",
                          }}
                        />
                      </div>
                    </td>

                    {/* Margin */}
                    <td style={{ ...sTd, textAlign: "right" }}>
                      {mb ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 3,
                            letterSpacing: "0.06em",
                            background: mb.bg,
                            border: `1px solid ${mb.bd}`,
                            color: mb.color,
                          }}
                        >
                          {mb.label}
                        </span>
                      ) : (
                        <span style={{ color: T.ink300 }}>—</span>
                      )}
                    </td>

                    {/* On Hand */}
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ ...Ty.caption, color: T.ink400 }}>
          Showing {filtered.length} of {items.length} items
        </span>
        {unpricedCount > 0 && (
          <span style={{ ...Ty.caption, color: T.danger, fontWeight: 600 }}>
            ⚠ {unpricedCount} item{unpricedCount !== 1 ? "s" : ""} with no sell
            price — hidden from shop
          </span>
        )}
        <span style={{ ...Ty.caption, color: T.ink300 }}>
          Ctrl+S to save all
        </span>
      </div>
    </div>
  );
}
