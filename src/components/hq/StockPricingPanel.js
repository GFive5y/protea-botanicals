// StockPricingPanel.js v1.0
// WP-STOCK-PRICING — Bulk sell price setter with live margin preview + batch save
// LL-160: tenantId passed as PROP — never fetched from user_profiles
// LL-161: full inventory_items column list selected
// LL-162: smart pills pattern for category filtering
// Author: NuAi session March 30, 2026

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = [
  { key: "all", label: "All Items", icon: "◎" },
  { key: "flower", label: "Flower", icon: "🌿" },
  { key: "concentrate", label: "Concentrate", icon: "💧" },
  { key: "hash", label: "Hash", icon: "🟫" },
  { key: "finished_product", label: "Vapes", icon: "💨" },
  { key: "edible", label: "Edibles", icon: "🍬" },
  { key: "hardware", label: "Equipment", icon: "🔧" },
];

// LL-161 — full column select (never use SELECT *)
const FULL_SELECT = `
  id, name, sku, brand, category, subcategory, variant_type, variant_value,
  tags, strain_type, weight_grams, quantity_on_hand, weighted_avg_cost,
  cost_price, sell_price, unit, reorder_level, reorder_qty, max_stock_level,
  supplier_id, expiry_date, batch_lot_number, is_active, tenant_id,
  loyalty_category, pts_override, medium_type, description, created_at
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calcMargin(sellPrice, avco) {
  const sp = parseFloat(sellPrice);
  const ac = parseFloat(avco);
  if (!sp || sp <= 0) return null;
  if (!ac || ac <= 0) return 100;
  return ((sp - ac) / sp) * 100;
}

function marginStyle(margin) {
  if (margin === null)
    return { bg: "#1e293b", color: "#475569", border: "#334155" };
  if (margin < 20)
    return { bg: "#ef444415", color: "#ef4444", border: "#ef444430" };
  if (margin < 40)
    return { bg: "#f59e0b15", color: "#f59e0b", border: "#f59e0b30" };
  return { bg: "#22c55e15", color: "#22c55e", border: "#22c55e30" };
}

function fmt(n) {
  if (n === null || n === undefined || n === "") return "";
  const num = parseFloat(n);
  if (isNaN(num)) return "";
  return num.toFixed(2);
}

function variantDisplay(item) {
  if (item.variant_value) return item.variant_value;
  if (item.weight_grams) return `${item.weight_grams}g`;
  if (item.strain_type) return item.strain_type;
  return "";
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function StockPricingPanel({ tenantId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState({}); // { [id]: string }
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null); // { saved, errors[] }
  const [focusId, setFocusId] = useState(null);
  const searchRef = useRef(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select(FULL_SELECT)
      .eq("tenant_id", tenantId) // LL-160
      .eq("is_active", true)
      .order("category")
      .order("name");

    if (!error && data) setItems(data);
    if (error) console.error("[StockPricingPanel] load error:", error.message);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const filtered = items.filter((item) => {
    if (catFilter !== "all" && item.category !== catFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.variant_value?.toLowerCase().includes(q) ||
      item.subcategory?.toLowerCase().includes(q)
    );
  });

  const changedCount = Object.keys(edits).length;

  const catCounts = CATEGORY_CONFIG.reduce((acc, c) => {
    acc[c.key] =
      c.key === "all"
        ? items.length
        : items.filter((i) => i.category === c.key).length;
    return acc;
  }, {});

  const unpricedCount = filtered.filter((i) => {
    const ep = edits[i.id];
    const val = ep !== undefined ? ep : i.sell_price;
    return !val || parseFloat(val) <= 0;
  }).length;

  // ── Edit handlers ─────────────────────────────────────────────────────────

  const handlePriceChange = (id, val) => {
    setEdits((prev) => ({ ...prev, [id]: val }));
    setSaveResult(null);
  };

  const getSellPrice = (item) =>
    edits[item.id] !== undefined ? edits[item.id] : (item.sell_price ?? "");

  const getMargin = (item) => {
    const sp = edits[item.id] !== undefined ? edits[item.id] : item.sell_price;
    return calcMargin(sp, item.weighted_avg_cost);
  };

  const discardAll = () => {
    setEdits({});
    setSaveResult(null);
  };

  // ── Batch save ────────────────────────────────────────────────────────────

  const handleSaveAll = async () => {
    if (!changedCount || saving) return;
    setSaving(true);
    setSaveResult(null);

    const entries = Object.entries(edits);
    let saved = 0;
    const errors = [];

    for (const [id, rawPrice] of entries) {
      const numPrice = parseFloat(rawPrice);
      if (isNaN(numPrice) || numPrice < 0) {
        const item = items.find((i) => i.id === id);
        errors.push(`"${item?.name ?? id}" — invalid price`);
        continue;
      }
      const { error } = await supabase
        .from("inventory_items")
        .update({ sell_price: numPrice })
        .eq("id", id)
        .eq("tenant_id", tenantId); // LL-160 — never update without tenant guard

      if (error) {
        errors.push(error.message);
      } else {
        saved++;
      }
    }

    await load(); // refresh — clears stale avco/qty
    setEdits({});
    setSaveResult({ saved, errors });
    setSaving(false);
  };

  // ── Keyboard shortcut: Ctrl+S ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (changedCount && !saving) handleSaveAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [changedCount, saving, edits]); // eslint-disable-line

  // ─── STYLES (inline — no CSS file needed) ─────────────────────────────────

  const s = {
    root: {
      padding: "4px 0 48px",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
    header: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 18,
    },
    headerTitle: {
      margin: 0,
      fontSize: 14,
      fontWeight: 700,
      color: "#f1f5f9",
      letterSpacing: "-0.01em",
    },
    headerSub: {
      margin: "3px 0 0",
      fontSize: 12,
      color: "#475569",
      fontFamily: "system-ui, sans-serif",
    },
    headerActions: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexShrink: 0,
    },
    unsavedBadge: {
      background: "#f59e0b18",
      color: "#f59e0b",
      border: "1px solid #f59e0b35",
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "system-ui, sans-serif",
    },
    discardBtn: {
      background: "transparent",
      color: "#64748b",
      border: "1px solid #334155",
      borderRadius: 6,
      padding: "6px 12px",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "system-ui, sans-serif",
    },
    saveBtn: (active) => ({
      background: active ? "#22c55e" : "#1e293b",
      color: active ? "#fff" : "#475569",
      border: `1px solid ${active ? "#22c55e" : "#334155"}`,
      borderRadius: 6,
      padding: "6px 16px",
      fontSize: 12,
      fontWeight: 700,
      cursor: active ? "pointer" : "not-allowed",
      transition: "all 0.15s",
      fontFamily: "system-ui, sans-serif",
    }),
    banner: (isError) => ({
      background: isError ? "#ef444412" : "#22c55e12",
      border: `1px solid ${isError ? "#ef444430" : "#22c55e30"}`,
      borderRadius: 7,
      padding: "9px 14px",
      marginBottom: 14,
      fontSize: 12,
      color: isError ? "#ef4444" : "#22c55e",
      fontFamily: "system-ui, sans-serif",
    }),
    pillRow: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 14,
    },
    pill: (active, count) => ({
      background: active ? "#22c55e" : count === 0 ? "#0f172a" : "#1e293b",
      color: active ? "#fff" : count === 0 ? "#334155" : "#94a3b8",
      border: `1px solid ${active ? "#22c55e60" : "#334155"}`,
      borderRadius: 20,
      padding: "4px 12px",
      fontSize: 11,
      fontWeight: 600,
      cursor: count === 0 && !active ? "default" : "pointer",
      transition: "all 0.12s",
      fontFamily: "system-ui, sans-serif",
      opacity: count === 0 && !active ? 0.4 : 1,
    }),
    searchInput: {
      width: "100%",
      maxWidth: 320,
      background: "#0f172a",
      border: "1px solid #334155",
      borderRadius: 6,
      padding: "7px 12px",
      color: "#f1f5f9",
      fontSize: 12,
      outline: "none",
      boxSizing: "border-box",
      fontFamily: "system-ui, sans-serif",
    },
    legend: {
      display: "flex",
      gap: 14,
      marginBottom: 10,
      alignItems: "center",
      flexWrap: "wrap",
    },
    legendLabel: {
      fontSize: 10,
      color: "#475569",
      letterSpacing: "0.06em",
      fontWeight: 700,
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: {
      padding: "7px 10px",
      fontWeight: 700,
      textAlign: "left",
      color: "#475569",
      fontSize: 10,
      letterSpacing: "0.06em",
      borderBottom: "1px solid #1e293b",
      background: "#080e1a",
      whiteSpace: "nowrap",
    },
    thRight: {
      padding: "7px 10px",
      fontWeight: 700,
      textAlign: "right",
      color: "#475569",
      fontSize: 10,
      letterSpacing: "0.06em",
      borderBottom: "1px solid #1e293b",
      background: "#080e1a",
      whiteSpace: "nowrap",
    },
    td: (focused, edited, isEven) => ({
      padding: "5px 10px",
      background: focused
        ? "#0d2137"
        : edited
          ? "#0d1f14"
          : isEven
            ? "#0c1422"
            : "#080e1a",
      borderBottom: "1px solid #111827",
      transition: "background 0.08s",
    }),
    priceInput: (edited, focused) => ({
      width: 78,
      background: "transparent",
      border: `1px solid ${focused ? "#38bdf8" : edited ? "#22c55e" : "#1e293b"}`,
      borderRadius: 5,
      padding: "4px 7px",
      color: "#f1f5f9",
      fontSize: 12,
      outline: "none",
      textAlign: "right",
      fontFamily: "'JetBrains Mono', monospace",
      transition: "border-color 0.12s",
    }),
    marginBadge: (margin) => {
      const ms = marginStyle(margin);
      return {
        background: ms.bg,
        color: ms.color,
        border: `1px solid ${ms.border}`,
        borderRadius: 4,
        padding: "2px 8px",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.02em",
        fontFamily: "system-ui, sans-serif",
      };
    },
    footer: {
      marginTop: 12,
      color: "#475569",
      fontSize: 11,
      fontFamily: "system-ui, sans-serif",
      display: "flex",
      gap: 16,
      flexWrap: "wrap",
    },
    unpricedWarn: { color: "#ef4444" },
    ctrlHint: { color: "#334155" },
  };

  // ─── LOADING ───────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div
        style={{
          padding: 40,
          color: "#334155",
          textAlign: "center",
          fontSize: 13,
        }}
      >
        Loading {items.length > 0 ? items.length : "…"} items…
      </div>
    );

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={s.root}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h3 style={s.headerTitle}>💰 Bulk Price Setter</h3>
          <p style={s.headerSub}>
            {items.length} active items · edit sell prices inline · margin
            calculated live from AVCO
          </p>
        </div>
        <div style={s.headerActions}>
          {changedCount > 0 && (
            <span style={s.unsavedBadge}>{changedCount} unsaved</span>
          )}
          {changedCount > 0 && (
            <button style={s.discardBtn} onClick={discardAll}>
              Discard
            </button>
          )}
          <button
            style={s.saveBtn(changedCount > 0 && !saving)}
            onClick={handleSaveAll}
            disabled={!changedCount || saving}
          >
            {saving
              ? "⏳ Saving…"
              : `💾 Save All${changedCount ? ` (${changedCount})` : ""}`}
          </button>
        </div>
      </div>

      {/* ── Save result banner ── */}
      {saveResult && (
        <div style={s.banner(saveResult.errors.length > 0)}>
          {saveResult.saved > 0 && (
            <span>
              ✅ {saveResult.saved} price{saveResult.saved !== 1 ? "s" : ""}{" "}
              saved.{" "}
            </span>
          )}
          {saveResult.errors.length > 0 && (
            <span>
              ⚠️ {saveResult.errors.length} error
              {saveResult.errors.length !== 1 ? "s" : ""}:{" "}
              {saveResult.errors.join(" · ")}
            </span>
          )}
        </div>
      )}

      {/* ── Category pills ── */}
      <div style={s.pillRow}>
        {CATEGORY_CONFIG.map(({ key, label, icon }) => (
          <button
            key={key}
            style={s.pill(catFilter === key, catCounts[key])}
            onClick={() => {
              if (catCounts[key] > 0 || key === "all") setCatFilter(key);
            }}
          >
            {icon} {label}
            <span style={{ opacity: 0.6, marginLeft: 4 }}>
              ({catCounts[key]})
            </span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 12 }}>
        <input
          ref={searchRef}
          style={s.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, SKU, brand, variant…"
        />
      </div>

      {/* ── Margin legend ── */}
      <div style={s.legend}>
        <span style={s.legendLabel}>MARGIN</span>
        {[
          { label: "< 20% — low", color: "#ef4444" },
          { label: "20–40% — ok", color: "#f59e0b" },
          { label: "> 40% — strong", color: "#22c55e" },
          { label: "no price", color: "#475569" },
        ].map(({ label, color }) => (
          <span
            key={label}
            style={{ fontSize: 11, color, fontFamily: "system-ui, sans-serif" }}
          >
            ● {label}
          </span>
        ))}
      </div>

      {/* ── Spreadsheet table ── */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 8,
          border: "1px solid #1e293b",
        }}
      >
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>SKU</th>
              <th style={s.th}>NAME</th>
              <th style={s.th}>CATEGORY</th>
              <th style={s.th}>VARIANT</th>
              <th style={s.thRight}>AVCO COST</th>
              <th style={s.thRight}>SELL PRICE</th>
              <th style={s.thRight}>MARGIN</th>
              <th style={s.thRight}>ON HAND</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const edited = edits[item.id] !== undefined;
              const focused = focusId === item.id;
              const margin = getMargin(item);
              const isEven = idx % 2 === 0;
              const tdStyle = s.td(focused, edited, isEven);

              return (
                <tr key={item.id}>
                  {/* SKU */}
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: "#334155",
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                    >
                      {item.sku || "—"}
                    </span>
                  </td>

                  {/* Name */}
                  <td style={{ ...tdStyle, maxWidth: 220 }}>
                    <div
                      style={{
                        color: "#e2e8f0",
                        fontWeight: 600,
                        fontSize: 12,
                        fontFamily: "system-ui, sans-serif",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </div>
                    {item.brand && item.brand !== "Medi Recreational" && (
                      <div
                        style={{
                          color: "#334155",
                          fontSize: 10,
                          fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        {item.brand}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td style={tdStyle}>
                    <span
                      style={{
                        background: "#111827",
                        border: "1px solid #1e293b",
                        borderRadius: 4,
                        padding: "2px 7px",
                        fontSize: 10,
                        color: "#64748b",
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {item.category}
                    </span>
                    {item.subcategory && (
                      <span
                        style={{
                          color: "#334155",
                          fontSize: 10,
                          marginLeft: 5,
                          fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        {item.subcategory}
                      </span>
                    )}
                  </td>

                  {/* Variant */}
                  <td style={{ ...tdStyle }}>
                    <span style={{ color: "#475569", fontSize: 11 }}>
                      {variantDisplay(item) || "—"}
                    </span>
                  </td>

                  {/* AVCO Cost */}
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {item.weighted_avg_cost ? (
                      <span style={{ color: "#64748b" }}>
                        R {fmt(item.weighted_avg_cost)}
                      </span>
                    ) : (
                      <span style={{ color: "#1e293b" }}>—</span>
                    )}
                  </td>

                  {/* Sell Price — editable */}
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 3,
                      }}
                    >
                      <span style={{ color: "#475569", fontSize: 11 }}>R</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={getSellPrice(item)}
                        placeholder="0.00"
                        onFocus={() => setFocusId(item.id)}
                        onBlur={() => setFocusId(null)}
                        onChange={(e) =>
                          handlePriceChange(item.id, e.target.value)
                        }
                        style={s.priceInput(edited, focused)}
                      />
                    </div>
                  </td>

                  {/* Margin badge */}
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {margin !== null ? (
                      <span style={s.marginBadge(margin)}>
                        {margin.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: "#1e293b", fontSize: 11 }}>—</span>
                    )}
                  </td>

                  {/* On Hand */}
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <span
                      style={{
                        color:
                          (item.quantity_on_hand ?? 0) === 0
                            ? "#334155"
                            : "#64748b",
                      }}
                    >
                      {item.quantity_on_hand ?? 0}
                    </span>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: 28,
                    textAlign: "center",
                    color: "#334155",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 13,
                    background: "#080e1a",
                  }}
                >
                  No items match.{" "}
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={{
                        color: "#22c55e",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Clear search
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div style={s.footer}>
        <span>
          Showing {filtered.length} of {items.length} items
        </span>
        {unpricedCount > 0 && (
          <span style={s.unpricedWarn}>
            ⚠️ {unpricedCount} item{unpricedCount !== 1 ? "s" : ""} with no sell
            price
          </span>
        )}
        <span style={s.ctrlHint}>Ctrl+S to save</span>
      </div>
    </div>
  );
}
