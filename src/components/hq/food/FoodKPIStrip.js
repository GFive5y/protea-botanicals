// src/components/hq/food/FoodKPIStrip.js
// WP-TABLE-UNIFY Phase 2A.2 — 4-card KPI strip for F&B ingredient library
//
// Replaces the existing 5-card strip in HQFoodIngredients.js.
// KPIs: Total / Expiring<7d / Missing allergen / Missing nutrition.
// All client-computed from already-fetched items array.

import React from "react";
import { T } from "../../../styles/tokens";

function KPICard({ label, value, sub, accent, bg }) {
  return (
    <div
      style={{
        background: bg || T.surface,
        border: `1px solid ${accent ? accent + "20" : T.border}`,
        borderRadius: T.radius.lg,
        padding: "16px 20px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: T.weight.extrabold,
          color: accent || T.ink900,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: T.text.sm,
          color: accent || T.ink700,
          fontWeight: T.weight.semibold,
          marginTop: 2,
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontSize: T.text.xs,
            color: accent ? accent + "BB" : T.ink500,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function FoodKPIStrip({ items }) {
  const list = items || [];
  const total = list.length;

  const expiringSoon = list.filter((i) => {
    if (!i.expiry_date) return false;
    const days = Math.ceil((new Date(i.expiry_date) - new Date()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;

  // Missing = null/undefined allergen_flags (not empty object — {} means "declared: none")
  const missingAllergen = list.filter((i) => i.allergen_flags == null).length;

  const missingNutrition = list.filter((i) => {
    const n = i.nutrition_per_100g;
    return n == null || Object.keys(n).length === 0;
  }).length;

  return (
    <div style={{ display: "flex", gap: T.gap.md, flexWrap: "wrap", marginBottom: 24 }}>
      <KPICard
        label="Total Ingredients"
        value={total}
        sub="In library"
        accent={T.accent}
        bg={T.accentLight}
      />
      <KPICard
        label="Expiring <7 days"
        value={expiringSoon}
        sub="Review stock urgently"
        accent={T.danger}
        bg={T.dangerLight}
      />
      <KPICard
        label="Missing Allergen Info"
        value={missingAllergen}
        sub="Not yet declared"
        accent={T.warning}
        bg={T.warningLight}
      />
      <KPICard
        label="Missing Nutrition"
        value={missingNutrition}
        sub="No per-100g data"
        accent={T.info}
        bg={T.infoLight}
      />
    </div>
  );
}
