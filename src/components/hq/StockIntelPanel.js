// src/components/hq/StockIntelPanel.js
// WP-STOCK-OVERVIEW Phase 1 scaffold — Zones 4, 5, 6
// Phase 1: Visible placeholder zones so the layout is complete and the
//          tab/zone structure is visible in the UI. Never hide built
//          structure — you will forget it exists.
//
// Phase 2 (WP-STOCK-OVERVIEW P2): Implement Zone 4 intelligence panels
//          (Best Sellers, Margin Heroes, Fast Movers, Dead Stock) + Zone 5 heatmap
// Phase 3 (WP-STOCK-OVERVIEW P3): Implement Zone 6 AI insights panel
//
// Props:
//   items      — array   — from HQStock items state (already loaded)
//   movements  — array   — from HQStock movements state (last 100)
//   tenantId   — string  — passed as PROP (LL-160 — NEVER from user_profiles)
//   onNavigate — function(tab) — jumps to another HQStock tab

import React, { useState, useMemo } from "react";

const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
};

// ── Phase badge ───────────────────────────────────────────────────────────────
const PhaseBadge = ({ phase }) => (
  <span
    style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      padding: "2px 7px",
      borderRadius: 3,
      background: T.infoBg,
      color: T.info,
      border: "1px solid " + T.infoBd,
    }}
  >
    {phase}
  </span>
);

// ── Placeholder zone card ─────────────────────────────────────────────────────
const PlaceholderZone = ({ zoneName, phase, description, features }) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid " + T.ink150,
      borderRadius: 6,
      overflow: "hidden",
    }}
  >
    {/* Header */}
    <div
      style={{
        padding: "12px 20px",
        borderBottom: "1px solid " + T.ink150,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: T.ink075,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.ink400,
        }}
      >
        {zoneName}
      </span>
      <PhaseBadge phase={phase} />
    </div>

    {/* Body */}
    <div style={{ padding: "20px 24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: T.infoBg,
            border: "1px solid " + T.infoBd,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: T.info,
            flexShrink: 0,
          }}
        >
          ◌
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink700 }}>
            {description}
          </div>
          <div style={{ fontSize: 11, color: T.ink400, marginTop: 2 }}>
            Waiting for {phase} implementation
          </div>
        </div>
      </div>
      <div
        style={{
          background: T.infoBg,
          border: "1px solid " + T.infoBd,
          borderRadius: 4,
          padding: "10px 14px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 16px",
        }}
      >
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              fontSize: 11,
              color: T.info,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: T.infoBd, fontSize: 9 }}>▸</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Main export ───────────────────────────────────────────────────────────────
export default function StockIntelPanel({
  items = [],
  movements = [],
  tenantId, // LL-160: always a prop, never from user_profiles
  onNavigate = () => {},
}) {
  // catFilter drives all 4 intel panels in Phase 2 (WP-STOCK-OVERVIEW P2).
  // Defined here so the state architecture is in place — not yet wired to UI.
  // eslint-disable-next-line no-unused-vars
  const [catFilter, setCatFilter] = useState(null);

  const activeItems = useMemo(
    () => items.filter((i) => i.is_active !== false),
    [items],
  );
  const categories = useMemo(
    () => [...new Set(activeItems.map((i) => i.category).filter(Boolean))],
    [activeItems],
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* ── ZONE 4 PLACEHOLDER: Intelligence Panels ──────────────────────── */}
      <PlaceholderZone
        zoneName="Zone 4 — Intelligence Panels"
        phase="Phase 2"
        description="Best Sellers · Margin Heroes · Fast Movers · Dead Stock"
        features={[
          "Top 5 best sellers by units sold (last 30 days)",
          "Top 5 margin heroes (% gross margin)",
          "Fast movers with days of stock remaining",
          "Dead stock items (45+ days no movement)",
          "Category pill filter drives all 4 panels",
          "Row click → StockItemPanel drawer",
          "'Get strategy →' fires ProteaAI",
        ]}
      />

      {/* Category pill preview — architecture in place, activates Phase 2 */}
      {categories.length > 0 && (
        <div
          style={{
            padding: "10px 16px",
            background: T.ink075,
            borderRadius: 4,
            border: "1px solid " + T.ink150,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.ink400,
              marginRight: 4,
            }}
          >
            Category filter — Phase 2
          </span>
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              disabled
              style={{
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: 11,
                border: "1px solid " + T.ink150,
                background: T.ink075,
                color: T.ink300,
                cursor: "not-allowed",
                fontFamily: T.font,
              }}
            >
              {cat === "All" ? "All" : cat}
              {cat !== "All" && (
                <span style={{ marginLeft: 4, opacity: 0.6 }}>
                  ({activeItems.filter((i) => i.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── ZONE 5 PLACEHOLDER: Movement Velocity Heatmap ────────────────── */}
      <PlaceholderZone
        zoneName="Zone 5 — Movement Velocity Heatmap"
        phase="Phase 2"
        description="12-week × 7-day activity heatmap"
        features={[
          "84-cell grid (12 weeks × 7 days)",
          "5-stop colour scale: none → low → mid → high → peak",
          "Tooltip: date · movement count · type breakdown",
          "Week labels below, Mon/Wed/Fri labels on left",
          "Instantly shows: alive business vs stagnant",
          "Delivery spikes visible as columns",
        ]}
      />

      {/* ── ZONE 6 PLACEHOLDER: AI Insights ──────────────────────────────── */}
      <PlaceholderZone
        zoneName="Zone 6 — AI Insights"
        phase="Phase 3"
        description="ProteaAI-powered contextual stock insights"
        features={[
          "3 specific actionable insights per load",
          "Stock context: value, velocity, dead stock, channel",
          "Severity dot: critical / warning / info",
          "Action links navigate to relevant tab",
          "30-minute cache — no unnecessary EF calls",
          "Graceful fallback if ai-copilot EF unavailable",
          "Calls ai-copilot EF only (LL-120: never direct to anthropic)",
        ]}
      />
    </div>
  );
}
