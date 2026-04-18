// src/components/hq/food/FoodColumnPicker.js
// WP-TABLE-UNIFY Phase 2A.3 — column visibility picker with localStorage persistence
//
// Controlled component. Parent owns the `value` object (key -> bool).
// localStorage is written in parent (keyed by tenant) so this component
// stays testable and SSR-safe.

import React, { useState, useRef, useEffect } from "react";
import { T } from "../../../styles/tokens";

const COLUMNS = [
  { key: "ingredient", label: "Ingredient", locked: true },
  { key: "category",   label: "Category" },
  { key: "allergens",  label: "Allergens" },
  { key: "haccp",      label: "HACCP" },
  { key: "zone",       label: "Zone" },
  { key: "shelf",      label: "Shelf" },
];

export default function FoodColumnPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          padding: "7px 12px",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.smPlus,
          fontSize: T.text.sm,
          fontFamily: "inherit",
          color: T.ink700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: T.gap.xs,
        }}
      >
        <span>Columns</span>
        <span style={{ fontSize: 10, color: T.ink500 }}>{"\u25BE"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.md,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            padding: T.pad.sm,
            minWidth: 180,
            zIndex: 100,
          }}
        >
          {COLUMNS.map((col) => (
            <label
              key={col.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: T.gap.sm,
                padding: "6px 8px",
                cursor: col.locked ? "not-allowed" : "pointer",
                fontSize: T.text.sm,
                color: col.locked ? T.ink400 : T.ink700,
                borderRadius: T.radius.sm,
              }}
            >
              <input
                type="checkbox"
                checked={col.locked ? true : value[col.key] !== false}
                disabled={col.locked}
                onChange={(e) => {
                  if (col.locked) return;
                  onChange({ ...value, [col.key]: e.target.checked });
                }}
              />
              <span>{col.label}</span>
              {col.locked && (
                <span style={{ fontSize: 10, marginLeft: "auto", color: T.ink400 }}>
                  always shown
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export const DEFAULT_COL_VISIBILITY = {
  ingredient: true,
  category: true,
  allergens: true,
  haccp: true,
  zone: true,
  shelf: true,
};
