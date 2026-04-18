// src/components/hq/food/FoodPillNav.js
// WP-TABLE-UNIFY Phase 2A.2 — two-level drill-down pill nav for F&B ingredients
//
// Drives filtering via FNB_PILL_HIERARCHY exported from FoodWorlds.js.
// Level 1: worlds (proteins, dairy, produce, dry_goods, oils, bakery, beverages).
// Level 2: groups within that world (type / zone / allergen / expiry).
//
// NAMING NOTE (scope doc §0.4):
//   food_ingredients column: sub_category (with underscore)
//   FoodWorlds constant keys: subcategory (no underscore)
//   PILL sub ids (e.g. "protein_red_meat") match sub_category column values.
//
// Controlled component. Parent owns { worldId, groupId, subId } state.

import React from "react";
import { T } from "../../../styles/tokens";
import { FNB_PILL_HIERARCHY } from "../FoodWorlds";

const WORLDS = [
  { id: "proteins",  label: "Proteins",  icon: "\uD83E\uDD69" },
  { id: "dairy",     label: "Dairy",     icon: "\uD83E\uDD5B" },
  { id: "produce",   label: "Produce",   icon: "\uD83E\uDD6C" },
  { id: "dry_goods", label: "Dry Goods", icon: "\uD83C\uDF3E" },
  { id: "oils",      label: "Oils",      icon: "\uD83E\uDED4" },
  { id: "bakery",    label: "Bakery",    icon: "\uD83C\uDF5E" },
  { id: "beverages", label: "Beverages", icon: "\u2615" },
];

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        border: `1px solid ${active ? T.accent : T.border}`,
        borderRadius: T.radius.full,
        background: active ? T.accentLight : T.surface,
        color: active ? T.accentText : T.ink700,
        fontSize: T.text.sm,
        fontWeight: active ? T.weight.semibold : T.weight.normal,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 120ms",
      }}
    >
      {children}
    </button>
  );
}

export default function FoodPillNav({ worldId, groupId, subId, onChange }) {
  const world = worldId ? FNB_PILL_HIERARCHY[worldId] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.gap.sm }}>
      {/* Level 1 — worlds */}
      <div style={{ display: "flex", gap: T.gap.xs, flexWrap: "wrap" }}>
        <Pill
          active={!worldId}
          onClick={() => onChange({ worldId: null, groupId: null, subId: null })}
        >
          All
        </Pill>
        {WORLDS.map((w) => (
          <Pill
            key={w.id}
            active={worldId === w.id}
            onClick={() =>
              onChange(
                worldId === w.id
                  ? { worldId: null, groupId: null, subId: null }
                  : { worldId: w.id, groupId: null, subId: null },
              )
            }
          >
            <span style={{ marginRight: 4 }}>{w.icon}</span>
            {w.label}
          </Pill>
        ))}
      </div>

      {/* Level 2 — groups + subs inside selected world */}
      {world && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: T.gap.xs,
            paddingLeft: T.pad.sm,
            borderLeft: `2px solid ${T.accentLight}`,
            marginLeft: T.gap.xs,
          }}
        >
          {world.groups.map((g) => (
            <div key={g.id} style={{ display: "flex", gap: T.gap.xs, flexWrap: "wrap", alignItems: "center" }}>
              <span
                style={{
                  fontSize: T.text.xs,
                  fontWeight: T.weight.bold,
                  color: T.ink500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  minWidth: 90,
                }}
              >
                {g.icon && <span style={{ marginRight: 4 }}>{g.icon}</span>}
                {g.label}
              </span>
              {g.subs.map((s) => (
                <Pill
                  key={s.id}
                  active={groupId === g.id && subId === s.id}
                  onClick={() =>
                    onChange(
                      groupId === g.id && subId === s.id
                        ? { worldId, groupId: null, subId: null }
                        : { worldId, groupId: g.id, subId: s.id },
                    )
                  }
                >
                  {s.label}
                </Pill>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Filter helper — match an ingredient against the current pill selection.
export function pillMatches(item, worldId, groupId, subId) {
  if (!worldId) return true;
  const world = FNB_PILL_HIERARCHY[worldId];
  if (!world) return true;

  // Helper: does this item match a specific sub?
  function matchesSub(s, g) {
    if (s.allergenMatch) return !!(item.allergen_flags || {})[s.allergenMatch];
    if (g.fieldMatch === "temperature_zone") {
      return s.keywords.some((k) => item.temperature_zone === k);
    }
    if (s.expiryDays != null) {
      if (!item.expiry_date) return false;
      const d = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000);
      return d >= 0 && d <= s.expiryDays;
    }
    // sub_category exact match
    if (item.sub_category === s.id) return true;
    // keyword match in name/common_name
    if (s.keywords && s.keywords.length > 0) {
      const hay = (item.name + " " + (item.common_name || "")).toLowerCase();
      return s.keywords.some((k) => hay.includes(k.toLowerCase()));
    }
    return false;
  }

  if (!groupId || !subId) {
    // World selected but no sub — match if item belongs to ANY sub in the world
    return world.groups.some((g) => g.subs.some((s) => matchesSub(s, g)));
  }

  // Both group and sub selected
  const group = world.groups.find((g) => g.id === groupId);
  if (!group) return true;
  const sub = group.subs.find((s) => s.id === subId);
  if (!sub) return true;
  return matchesSub(sub, group);
}
