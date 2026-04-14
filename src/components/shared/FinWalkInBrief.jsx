// src/components/shared/FinWalkInBrief.jsx
// Layer 4 — dashboard walk-in brief.
// Renders above Operations Health on the tenant dashboard home tab.
// Reads from useFinSignals (already mounted in TenantPortal — no new query).
// Zero AI calls. Pure computed logic.

import React from "react";
import { T } from "../../styles/tokens";

const SEVERITY_ACCENT = {
  red: T.danger || "#DC2626",
  amber: T.warning || "#D97706",
  green: T.success || "#059669",
};

function formatDate(d) {
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function FinWalkInBrief({ signals }) {
  if (!signals) return null;

  // Flatten alerts from every signal with severity attached
  const allAlerts = Object.values(signals).flatMap((s) =>
    (s?.alerts || []).map((a) => ({ ...a, severity: s.severity }))
  );
  const red = allAlerts.filter((a) => a.severity === "red");
  const amber = allAlerts.filter((a) => a.severity === "amber");
  const brief = [...red, ...amber];

  const today = formatDate(new Date());
  const hasAnyRed = red.length > 0;
  const hasAnyAmber = amber.length > 0;
  const leftAccent = hasAnyRed
    ? SEVERITY_ACCENT.red
    : hasAnyAmber
      ? SEVERITY_ACCENT.amber
      : SEVERITY_ACCENT.green;

  const cardStyle = {
    background: "#fff",
    border: `1px solid ${T.border}`,
    borderLeft: `3px solid ${leftAccent}`,
    borderRadius: T.radius?.md || 8,
    padding: "14px 18px",
    marginBottom: 20,
    fontFamily: T.font,
  };

  const headerStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: T.ink700,
    marginBottom: 6,
    letterSpacing: "-0.01em",
  };

  // Healthy state
  if (brief.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>Financial briefing — {today}</div>
        <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.5 }}>
          No financial alerts. All systems within target.
        </div>
      </div>
    );
  }

  // Show up to 3 problems in the paragraph, remainder as "+ N more"
  const shown = brief.slice(0, 3);
  const remainder = brief.length - shown.length;
  const paragraph =
    shown.map((a) => a.problem).join(" · ") +
    (remainder > 0 ? ` · +${remainder} more in sidebar` : "");

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>Financial briefing — {today}</div>
      <div style={{ fontSize: 13, color: T.ink700, lineHeight: 1.5 }}>
        {paragraph}
      </div>
    </div>
  );
}
