// src/components/hq/food/FoodSmartSearch.js
// WP-TABLE-UNIFY Phase 2A.2 — smart search bar with FNB token support
//
// Token grammar (space-separated):
//   plain words              -> name + common_name + sub_category + e_number LIKE
//   allergen:gluten          -> item.allergen_flags.gluten === true
//   zone:frozen              -> item.temperature_zone === "frozen"
//   expiry<7                 -> computed days-to-expiry < 7
//   expiry>30                -> computed days-to-expiry > 30
//   shelf<90                 -> item.shelf_life_days < 90
//   sub:protein_red_meat     -> item.sub_category exact match
//   subcategory:...          -> alias of sub

import React from "react";
import { T } from "../../../styles/tokens";
import { FNB_FIELD_MAP, expiryDaysLeft, hasAllergen } from "../FoodWorlds";

export function parseSmartSearch(query) {
  if (!query) return [];
  const tokens = query.trim().split(/\s+/);
  const predicates = [];
  const plainWords = [];

  for (const tok of tokens) {
    // Operator tokens: key<N or key>N
    let m = tok.match(/^(\w+)([<>])(\d+(?:\.\d+)?)$/);
    if (m) {
      const key = m[1].toLowerCase();
      const op = m[2];
      const val = parseFloat(m[3]);
      const field = FNB_FIELD_MAP[key];
      if (field === "_expiry_days") {
        predicates.push((item) => {
          const d = expiryDaysLeft(item);
          if (d == null) return false;
          return op === "<" ? d < val : d > val;
        });
        continue;
      }
      if (field && field !== "_allergen" && field !== "_portions") {
        predicates.push((item) => {
          const v = item[field];
          if (v == null) return false;
          return op === "<" ? v < val : v > val;
        });
        continue;
      }
    }

    // Colon tokens: key:value
    m = tok.match(/^(\w+):(.+)$/);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2].toLowerCase();
      const field = FNB_FIELD_MAP[key];
      if (field === "_allergen") {
        predicates.push((item) => hasAllergen(item, val));
        continue;
      }
      // sub / subcategory -> match against item.sub_category (note underscore)
      if (field === "subcategory") {
        predicates.push((item) => (item.sub_category || "").toLowerCase() === val);
        continue;
      }
      if (field && field !== "_expiry_days" && field !== "_portions") {
        predicates.push((item) => (item[field] || "").toString().toLowerCase() === val);
        continue;
      }
    }

    // Plain word
    plainWords.push(tok.toLowerCase());
  }

  if (plainWords.length > 0) {
    predicates.push((item) => {
      const hay = [item.name, item.common_name, item.sub_category, item.e_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return plainWords.every((w) => hay.includes(w));
    });
  }

  return predicates;
}

export function matchesSmartSearch(item, query) {
  const preds = parseSmartSearch(query);
  return preds.every((p) => p(item));
}

export default function FoodSmartSearch({ value, onChange, placeholder }) {
  return (
    <div style={{ flex: 2, minWidth: 240 }}>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search or try: allergen:gluten \u00B7 zone:frozen \u00B7 expiry<7"}
        style={{
          width: "100%",
          padding: "9px 14px",
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.smPlus,
          fontSize: T.text.base,
          fontFamily: "inherit",
          background: T.surface,
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          fontSize: T.text.xxs,
          color: T.ink500,
          marginTop: 4,
          letterSpacing: "0.02em",
        }}
      >
        Tokens: allergen \u00B7 zone \u00B7 sub \u00B7 expiry&lt;N \u00B7 shelf&lt;N \u00B7 plain text
      </div>
    </div>
  );
}
