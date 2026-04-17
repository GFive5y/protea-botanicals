// src/components/hq/food/ViewToggle.js
// WP-TABLE-UNIFY Phase 2A.1 — view mode toggle for F&B ingredient surfaces
// Consumers: HQFoodIngredients (more may follow in 2A.2+)
// Renders two buttons styled from T tokens. Fully controlled component.

import React from "react";
import { T } from "../../../styles/tokens";

export default function ViewToggle({ value, onChange }) {
  const modes = [
    { id: "tile", label: "Tiles", icon: "\u25A6" },
    { id: "list", label: "List", icon: "\u2630" },
  ];

  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.smPlus,
        overflow: "hidden",
        fontFamily: "inherit",
      }}
    >
      {modes.map((m, idx) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            type="button"
            style={{
              padding: "7px 14px",
              border: "none",
              borderRight: idx === 0 ? `1px solid ${T.border}` : "none",
              background: active ? T.accentLight : T.surface,
              color: active ? T.accentText : T.ink700,
              fontSize: T.text.sm,
              fontWeight: active ? T.weight.semibold : T.weight.regular,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: T.gap.xs,
            }}
            aria-pressed={active}
          >
            <span style={{ fontSize: T.text.base }}>{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
