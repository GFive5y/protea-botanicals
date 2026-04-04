// src/components/viz/ChartCard.js — v2.0
// Enterprise-grade chart container. Linear/Vercel quality.
// v2.0: accent top-border variants, elevated shadow, badge slot,
//        larger title, optional footer

import InfoTooltip from "../InfoTooltip";

const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#6B7280",
  ink150: "#E5E7EB",
  ink075: "#F9FAFB",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#ECFDF5",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
  shadowHover: "0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
};

// Accent colours for top border variants
const ACCENT_COLORS = {
  green:   "#16A34A",
  blue:    "#2563EB",
  amber:   "#D97706",
  red:     "#DC2626",
  purple:  "#7C3AED",
  teal:    "#0D9488",
  default: "#1A3D2B",
};

/**
 * ChartCard v2.0 — enterprise chart container
 * @param {string}    title         — card heading
 * @param {string}    subtitle      — optional sub-heading
 * @param {string}    tooltipId     — InfoTooltip id (omit to hide)
 * @param {ReactNode} children      — chart content
 * @param {number}    height        — content area height px (default 260)
 * @param {ReactNode} action        — top-right slot (period selector, button)
 * @param {ReactNode} badge         — inline badge next to title (DeltaBadge etc)
 * @param {ReactNode} footer        — optional footer row below chart
 * @param {string}    accent        — top border colour key: green|blue|amber|red|purple|teal|default
 * @param {boolean}   noPadding     — removes chart area padding (for full-bleed charts)
 * @param {object}    style         — additional outer card styles
 */
export default function ChartCard({
  title,
  subtitle,
  tooltipId,
  children,
  height = 260,
  action,
  badge,
  footer,
  accent = "default",
  noPadding = false,
  style = {},
}) {
  const topColor = ACCENT_COLORS[accent] ?? ACCENT_COLORS.default;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${T.ink150}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: T.shadow,
        borderTop: `3px solid ${topColor}`,
        transition: "box-shadow 0.2s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = T.shadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = T.shadow;
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "16px 20px 14px",
          borderBottom: `1px solid ${T.ink150}`,
          gap: 12,
          background: "#FAFAFA",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.fontUi,
                fontSize: 13,
                fontWeight: 600,
                color: T.ink700,
                lineHeight: 1.4,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {title}
              {badge && <span>{badge}</span>}
            </div>
            {subtitle && (
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 11,
                  color: T.ink400,
                  marginTop: 2,
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {tooltipId && <InfoTooltip id={tooltipId} />}
        </div>
        {action && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {action}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div
        style={{
          padding: noPadding ? 0 : "20px 20px 16px",
          height,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div
          style={{
            borderTop: `1px solid ${T.ink150}`,
            padding: "10px 20px",
            background: "#FAFAFA",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
