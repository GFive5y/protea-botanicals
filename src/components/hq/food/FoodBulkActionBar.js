// src/components/hq/food/FoodBulkActionBar.js
// WP-TABLE-UNIFY Phase 2A.3 — sticky bulk action bar
//
// Appears when parent reports selectedCount >= 1. Pill-shaped, centered
// at bottom of viewport. Actions emit callbacks; parent owns the actual
// mutations.

import React from "react";
import { T } from "../../../styles/tokens";

const bulkBtnStyle = {
  background: "none",
  border: "none",
  color: "inherit",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "inherit",
  fontWeight: "inherit",
  padding: 4,
  whiteSpace: "nowrap",
};

export default function FoodBulkActionBar({
  selectedCount,
  onChangeZone,
  onExportSelected,
  onArchive,
  onClear,
}) {
  if (selectedCount < 1) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 900,
        background: T.ink900,
        color: T.surface,
        borderRadius: T.radius.full,
        padding: "10px 14px 10px 20px",
        display: "flex",
        alignItems: "center",
        gap: T.gap.md,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        fontSize: T.text.sm,
        fontWeight: T.weight.semibold,
      }}
    >
      <span style={{ whiteSpace: "nowrap" }}>
        {selectedCount} selected
      </span>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />

      <button type="button" onClick={onChangeZone} style={bulkBtnStyle}>
        Change zone
      </button>
      <button type="button" onClick={onExportSelected} style={bulkBtnStyle}>
        Export selected
      </button>
      <button type="button" onClick={onArchive} style={{ ...bulkBtnStyle, color: T.warningLight }}>
        Archive
      </button>

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />

      <button
        type="button"
        onClick={onClear}
        style={{
          ...bulkBtnStyle,
          background: "rgba(255,255,255,0.1)",
          padding: "6px 12px",
          borderRadius: T.radius.full,
        }}
      >
        Cancel
      </button>
    </div>
  );
}
