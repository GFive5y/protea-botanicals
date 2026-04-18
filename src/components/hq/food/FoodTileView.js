// src/components/hq/food/FoodTileView.js
// WP-TABLE-UNIFY Phase 2A.1 — tile view for F&B ingredient library
//
// NET NEW component. Uses FoodWorlds.js exports that were shipped but unused:
//   - foodWorldForItem(item)     -> which of 9 worlds
//   - FNB_WORLD_COLORS           -> per-world bg/text/border
//   - FNB_SUBCATEGORY_ICONS      -> emoji per sub_category
//   - getFnbSmartTags(item)      -> expiry/zone/allergen chips
//
// Presentational. Parent owns filter state and selection dispatch.
// PR 2A.4 will add: tile size picker (S/M/L). This PR: fixed medium.

import React from "react";
import { T } from "../../../styles/tokens";
import {
  foodWorldForItem,
  FNB_WORLD_COLORS,
  FNB_SUBCATEGORY_ICONS,
  getFnbSmartTags,
} from "../FoodWorlds";

const C = {
  surface: T.surface,
  border: T.border,
  ink: T.ink900,
  inkLight: T.ink500,
};

const TILE_MIN_WIDTHS = { sm: 180, md: 220, lg: 280 };

export default function FoodTileView({ items, compareList, onSelect, HaccpBadge, tileSize }) {
  const minWidth = TILE_MIN_WIDTHS[tileSize || "md"];
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

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        gap: T.gap.md,
      }}
    >
      {items.map((ing) => {
        const world = foodWorldForItem(ing);
        const colors = FNB_WORLD_COLORS[world.id] || FNB_WORLD_COLORS.all;
        const icon = FNB_SUBCATEGORY_ICONS[ing.sub_category] || world.icon || "\uD83C\uDF7D";
        const smartTags = getFnbSmartTags(ing);
        const inCompare = compareList.some((c) => c.id === ing.id);

        return (
          <button
            key={ing.id}
            type="button"
            onClick={() => onSelect(ing)}
            style={{
              textAlign: "left",
              border: `1px solid ${C.border}`,
              borderRadius: T.radius.lg,
              background: C.surface,
              padding: 0,
              cursor: "pointer",
              fontFamily: "inherit",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              transition: "box-shadow 120ms, transform 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = T.shadow.sm;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Banner strip — world colour */}
            <div
              style={{
                background: colors.bg,
                color: colors.text,
                borderBottom: `1px solid ${colors.border}`,
                padding: `${T.pad.sm} ${T.pad.md}`,
                display: "flex",
                alignItems: "center",
                gap: T.gap.sm,
                minHeight: 40,
              }}
            >
              <span style={{ fontSize: T.text.lg }}>{icon}</span>
              <span
                style={{
                  fontSize: T.text.xs,
                  fontWeight: T.weight.bold,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {world.label}
              </span>
            </div>

            {/* Body */}
            <div
              style={{
                padding: T.pad.md,
                display: "flex",
                flexDirection: "column",
                gap: T.gap.xs,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontWeight: T.weight.semibold,
                  fontSize: T.text.base,
                  color: C.ink,
                  lineHeight: 1.25,
                }}
              >
                {ing.name}
              </div>
              {ing.common_name && (
                <div style={{ fontSize: T.text.xs, color: C.inkLight }}>
                  {ing.common_name}
                </div>
              )}

              {/* Smart tags row */}
              {smartTags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: T.gap.xxs,
                    marginTop: T.gap.xs,
                  }}
                >
                  {smartTags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        background: tag.bg,
                        color: tag.color,
                        fontSize: T.text.xxs,
                        fontWeight: T.weight.semibold,
                        padding: "2px 7px",
                        borderRadius: T.radius.sm,
                      }}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer row — HACCP + library marker */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "auto",
                  paddingTop: T.gap.xs,
                }}
              >
                {HaccpBadge ? <HaccpBadge level={ing.haccp_risk_level} /> : <span />}
                <div style={{ display: "flex", gap: T.gap.xxs }}>
                  {ing.is_seeded && (
                    <span
                      style={{
                        fontSize: T.text.xxs,
                        color: T.accentText,
                        fontWeight: T.weight.bold,
                      }}
                    >
                      {"\uD83D\uDCDA"}
                    </span>
                  )}
                  {inCompare && (
                    <span
                      style={{
                        fontSize: T.text.xxs,
                        color: T.info,
                        fontWeight: T.weight.bold,
                      }}
                    >
                      {"\u2713"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
