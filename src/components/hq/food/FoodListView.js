// src/components/hq/food/FoodListView.js
// WP-TABLE-UNIFY Phase 2A.1 -> 2A.6 — dense list view for F&B ingredient library
//
// Presentational component. Receives already-filtered + sorted items from parent.
// 2A.3 additions: sortable headers, checkbox column, column visibility.
// 2A.6 — DS6 compliance pass per NUAI-VISUAL-SPEC.md Part 16 Tier 1:
//   - Card wrapper padding "0 16px" creates "lines stop short" effect
//   - sTh/sTd padding "11px 12px" per spec
//   - Header color T.ink400 + 0.08em spacing per Part 16.2
//   - Row hover T.surfaceHover per Part 10.2
//   - Row zebra T.surface / T.surfaceAlt per Part 16.3
//   - borderBottom moved from <tr> to <td> per StockPricingPanel pattern

import React from "react";
import { T } from "../../../styles/tokens";

const C = {
  surface: T.surface,
  border: T.border,
  ink: T.ink900,
  inkLight: T.ink500,
  accent: T.accentMid,
};

const HEADER_MAP = [
  { key: "ingredient", label: "Ingredient" },
  { key: "category",   label: "Category" },
  { key: "allergens",  label: "Allergens" },
  { key: "haccp",      label: "HACCP" },
  { key: "zone",       label: "Zone" },
  { key: "shelf",      label: "Shelf" },
];

// Map header key to the sortField key used by parent
const SORT_KEY_MAP = {
  ingredient: "name",
  category: "category",
  allergens: "allergens",
  haccp: "haccp",
  zone: "zone",
  shelf: "shelf",
};

export default function FoodListView({
  items,
  compareList,
  onSelect,
  getCategory,
  getAllergenList,
  AllergenBadge,
  HaccpBadge,
  TempBadge,
  sortField,
  sortDir,
  onSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  colVisibility,
}) {
  const vis = colVisibility || {};
  const sel = selectedIds || new Set();

  if (!items || items.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 60,
          color: C.inkLight,
          fontSize: T.text.base,
          border: `1px solid ${C.border}`,
          borderRadius: T.radius.lg,
          background: C.surface,
        }}
      >
        No ingredients match your filters.
      </div>
    );
  }

  const allSelected = items.length > 0 && items.every((i) => sel.has(i.id));

  function chevron(headerKey) {
    const sk = SORT_KEY_MAP[headerKey];
    if (sortField !== sk) return null;
    return (
      <span style={{ marginLeft: 4, fontSize: 10 }}>
        {sortDir === "asc" ? "\u25B2" : "\u25BC"}
      </span>
    );
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: T.radius.lg,
        overflow: "auto",
        padding: "0 16px",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {/* Checkbox header */}
            <th
              style={{
                width: 40,
                textAlign: "center",
                padding: "11px 12px",
                borderBottom: `2px solid ${C.border}`,
                background: C.surface,
              }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleSelectAll && onToggleSelectAll()}
                style={{ cursor: "pointer" }}
              />
            </th>
            {HEADER_MAP.map((h) => {
              if (h.key !== "ingredient" && vis[h.key] === false) return null;
              const sk = SORT_KEY_MAP[h.key];
              return (
                <th
                  key={h.key}
                  style={{
                    textAlign: "left",
                    padding: "11px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.ink400,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    borderBottom: `2px solid ${C.border}`,
                    background: C.surface,
                    whiteSpace: "nowrap",
                    fontFamily: T.font,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSort && onSort(sk)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      fontWeight: "inherit",
                      color: "inherit",
                      letterSpacing: "inherit",
                      textTransform: "inherit",
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {h.label}
                    {chevron(h.key)}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((ing, idx) => {
            const cat = getCategory(ing.category);
            const inCompare = compareList.some((c) => c.id === ing.id);
            const checked = sel.has(ing.id);
            return (
              <tr
                key={ing.id}
                style={{
                  background: checked
                    ? T.accentLight
                    : idx % 2 === 0
                      ? T.surface
                      : T.surfaceAlt,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onClick={() => onSelect(ing)}
                onMouseEnter={(e) => {
                  if (!checked) e.currentTarget.style.background = T.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  if (!checked) {
                    e.currentTarget.style.background = idx % 2 === 0 ? T.surface : T.surfaceAlt;
                  }
                }}
              >
                {/* Checkbox cell */}
                <td
                  style={{
                    width: 40,
                    textAlign: "center",
                    padding: "11px 12px",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleSelect && onToggleSelect(ing.id)}
                    style={{ cursor: "pointer" }}
                  />
                </td>
                {/* Ingredient — always visible */}
                <td style={{
                  padding: "11px 12px",
                  borderBottom: `1px solid ${C.border}`,
                  fontFamily: T.font,
                  verticalAlign: "middle",
                }}>
                  <div
                    style={{
                      fontWeight: T.weight.semibold,
                      fontSize: 13,
                      color: T.ink900,
                    }}
                  >
                    {ing.name}
                  </div>
                  {ing.common_name && (
                    <div style={{ fontSize: T.text.xs, color: C.inkLight, marginTop: 2 }}>
                      {ing.common_name}
                    </div>
                  )}
                  {ing.e_number && (
                    <div style={{ fontSize: T.text.xxs, color: C.inkLight, marginTop: 1, fontFamily: "monospace" }}>
                      {ing.e_number}
                    </div>
                  )}
                  {ing.is_seeded && (
                    <span style={{ fontSize: T.text.xxs, color: C.accent, fontWeight: T.weight.bold, marginTop: 2, display: "block" }}>
                      {"\uD83D\uDCDA"} LIBRARY
                    </span>
                  )}
                  {inCompare && (
                    <span style={{ fontSize: T.text.xxs, color: T.info, fontWeight: T.weight.bold, marginTop: 2, display: "block" }}>
                      {"\u2713"} IN COMPARE
                    </span>
                  )}
                </td>
                {vis.category !== false && (
                  <td style={{
                    padding: "11px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 13,
                    fontFamily: T.font,
                    color: T.ink900,
                    verticalAlign: "middle",
                  }}>
                    <span>{cat.icon} {cat.label}</span>
                  </td>
                )}
                {vis.allergens !== false && (
                  <td style={{
                    padding: "11px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    verticalAlign: "middle",
                  }}>
                    <AllergenBadge flags={ing.allergen_flags} compact />
                  </td>
                )}
                {vis.haccp !== false && (
                  <td style={{
                    padding: "11px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    verticalAlign: "middle",
                  }}>
                    <HaccpBadge level={ing.haccp_risk_level} />
                  </td>
                )}
                {vis.zone !== false && (
                  <td style={{
                    padding: "11px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    verticalAlign: "middle",
                  }}>
                    <TempBadge zone={ing.temperature_zone} />
                  </td>
                )}
                {vis.shelf !== false && (
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}`,
                      fontSize: 13,
                      fontFamily: T.font,
                      color: T.ink400,
                      verticalAlign: "middle",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {ing.shelf_life_days ? `${ing.shelf_life_days}d` : "\u2014"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
