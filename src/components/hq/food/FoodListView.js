// src/components/hq/food/FoodListView.js
// WP-TABLE-UNIFY Phase 2A.1 -> 2A.3 — dense list view for F&B ingredient library
//
// Presentational component. Receives already-filtered + sorted items from parent.
// 2A.3 additions: sortable headers, checkbox column, column visibility.

import React from "react";
import { T } from "../../../styles/tokens";

const C = {
  surface: T.surface,
  border: T.border,
  ink: T.ink900,
  inkLight: T.ink500,
  accent: T.accentMid,
};

// WTU 2A.5 — column rhythm. minWidth per column for consistent breathing.
const COLUMN_WIDTHS = {
  ingredient: 260,
  category:   180,
  allergens:  160,
  haccp:      110,
  zone:       130,
  shelf:      80,
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
        border: `1px solid ${C.border}`,
        borderRadius: T.radius.lg,
        overflow: "hidden",
        background: C.surface,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#FAFAF9" }}>
            {/* Checkbox header */}
            <th
              style={{
                width: 40,
                textAlign: "center",
                padding: "10px 8px",
                borderBottom: `1px solid ${C.border}`,
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
                    padding: "12px 16px",
                    minWidth: COLUMN_WIDTHS[h.key] || "auto",
                    fontSize: T.text.xs,
                    fontWeight: T.weight.bold,
                    color: C.inkLight,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    borderBottom: `1px solid ${C.border}`,
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
                  borderTop: `1px solid ${C.border}`,
                  background: checked
                    ? T.accentLight
                    : idx % 2 === 0
                      ? C.surface
                      : "#FCFCFB",
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onClick={() => onSelect(ing)}
                onMouseEnter={(e) => {
                  if (!checked) e.currentTarget.style.background = "#F5F3EE";
                }}
                onMouseLeave={(e) => {
                  if (!checked) {
                    e.currentTarget.style.background = idx % 2 === 0 ? C.surface : "#FCFCFB";
                  }
                }}
              >
                {/* Checkbox cell */}
                <td
                  style={{ width: 40, textAlign: "center", padding: "12px 8px" }}
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
                <td style={{ padding: "12px 16px", minWidth: COLUMN_WIDTHS.ingredient }}>
                  <div
                    style={{
                      fontWeight: T.weight.semibold,
                      fontSize: T.text.smPlus,
                      color: C.ink,
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
                  <td style={{ padding: "12px 16px", fontSize: T.text.sm, minWidth: COLUMN_WIDTHS.category }}>
                    <span>{cat.icon} {cat.label}</span>
                  </td>
                )}
                {vis.allergens !== false && (
                  <td style={{ padding: "12px 16px", minWidth: COLUMN_WIDTHS.allergens }}>
                    <AllergenBadge flags={ing.allergen_flags} compact />
                  </td>
                )}
                {vis.haccp !== false && (
                  <td style={{ padding: "12px 16px", minWidth: COLUMN_WIDTHS.haccp }}>
                    <HaccpBadge level={ing.haccp_risk_level} />
                  </td>
                )}
                {vis.zone !== false && (
                  <td style={{ padding: "12px 16px", minWidth: COLUMN_WIDTHS.zone }}>
                    <TempBadge zone={ing.temperature_zone} />
                  </td>
                )}
                {vis.shelf !== false && (
                  <td
                    style={{
                      padding: "12px 16px",
                      minWidth: COLUMN_WIDTHS.shelf,
                      fontSize: T.text.sm,
                      color: C.inkLight,
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
