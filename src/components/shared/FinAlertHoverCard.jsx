// src/components/shared/FinAlertHoverCard.jsx
// Layer 3 — hover card that surfaces financial alerts for a nav tab.
// Pure presentation. Max 280px. Renders nothing if alerts is empty.
// Actions dispatch via parent-owned onAction(action) callback.

import React from "react";
import { T } from "../../styles/tokens";

const SEVERITY_ACCENT = {
  red: T.danger || "#DC2626",
  amber: T.warning || "#D97706",
  green: T.success || "#059669",
};

export default function FinAlertHoverCard({ alerts, severity, onAction, anchorRect }) {
  if (!alerts || alerts.length === 0) return null;

  // Position fixed to the right of the anchor (sidebar nav row)
  const top = anchorRect ? anchorRect.top : 120;
  const left = anchorRect ? anchorRect.right + 8 : 240;

  const accent = SEVERITY_ACCENT[severity] || T.ink400;

  return (
    <div
      role="tooltip"
      style={{
        position: "fixed",
        top,
        left,
        width: 280,
        maxWidth: 280,
        background: "#fff",
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: T.radius?.md || 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
        padding: "12px 14px",
        zIndex: 9000,
        fontFamily: T.font,
      }}
    >
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            paddingTop: i === 0 ? 0 : 10,
            borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
            marginTop: i === 0 ? 0 : 10,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: T.ink700,
              lineHeight: 1.3,
              marginBottom: 2,
            }}
          >
            {alert.problem}
          </div>
          <div
            style={{
              fontSize: 11,
              color: T.ink400,
              lineHeight: 1.4,
              marginBottom: 8,
            }}
          >
            {alert.why}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onAction && alert.action) onAction(alert.action);
            }}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: accent,
              background: "transparent",
              border: `1px solid ${accent}`,
              borderRadius: 4,
              padding: "3px 10px",
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            {alert.fix} →
          </button>
        </div>
      ))}
    </div>
  );
}
