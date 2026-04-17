// src/components/hq/food/FoodListView.js
// WP-TABLE-UNIFY Phase 2A.1 — dense list view for F&B ingredient library
//
// Presentational component. Receives already-filtered items from parent.
// No queries, no filtering, no state beyond local hover. Parent owns filter state.
//
// PR 2A.3 will add: column sort (clickable headers), checkbox column, column picker.
// This PR 2A.1 keeps parity with the pre-extraction table: same columns, same rows.

import React from "react";
import { T } from "../../../styles/tokens";

const C = {
  surface: T.surface,
  border: T.border,
  ink: T.ink900,
  inkLight: T.ink500,
  accent: T.accentMid,
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
}) {
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

  const headers = ["Ingredient", "Category", "Allergens", "HACCP", "Zone", "Shelf"];

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
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  fontSize: T.text.xs,
                  fontWeight: T.weight.bold,
                  color: C.inkLight,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((ing, idx) => {
            const cat = getCategory(ing.category);
            const inCompare = compareList.some((c) => c.id === ing.id);
            return (
              <tr
                key={ing.id}
                style={{
                  borderTop: `1px solid ${C.border}`,
                  background: idx % 2 === 0 ? C.surface : "#FCFCFB",
                  cursor: "pointer",
                }}
                onClick={() => onSelect(ing)}
              >
                <td style={{ padding: "12px 14px" }}>
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
                    <div
                      style={{
                        fontSize: T.text.xs,
                        color: C.inkLight,
                        marginTop: 2,
                      }}
                    >
                      {ing.common_name}
                    </div>
                  )}
                  {ing.e_number && (
                    <div
                      style={{
                        fontSize: T.text.xxs,
                        color: C.inkLight,
                        marginTop: 1,
                        fontFamily: "monospace",
                      }}
                    >
                      {ing.e_number}
                    </div>
                  )}
                  {ing.is_seeded && (
                    <span
                      style={{
                        fontSize: T.text.xxs,
                        color: C.accent,
                        fontWeight: T.weight.bold,
                        marginTop: 2,
                        display: "block",
                      }}
                    >
                      {"\uD83D\uDCDA"} LIBRARY
                    </span>
                  )}
                  {inCompare && (
                    <span
                      style={{
                        fontSize: T.text.xxs,
                        color: T.info,
                        fontWeight: T.weight.bold,
                        marginTop: 2,
                        display: "block",
                      }}
                    >
                      {"\u2713"} IN COMPARE
                    </span>
                  )}
                </td>
                <td style={{ padding: "12px 14px", fontSize: T.text.sm }}>
                  <span>
                    {cat.icon} {cat.label}
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <AllergenBadge flags={ing.allergen_flags} compact />
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <HaccpBadge level={ing.haccp_risk_level} />
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <TempBadge zone={ing.temperature_zone} />
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: T.text.sm,
                    color: C.inkLight,
                  }}
                >
                  {ing.shelf_life_days
                    ? `${ing.shelf_life_days}d`
                    : "\u2014"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
