// src/components/viz/ChartCard.js
// WP-VISUAL-SYSTEM — Standard chart wrapper with title, tooltip slot, optional action

import InfoTooltip from "../InfoTooltip";

const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

/**
 * ChartCard — standard chart container used on every HQ page
 * @param {string}    title       — card heading
 * @param {string}    tooltipId   — InfoTooltip id (omit to hide tooltip)
 * @param {ReactNode} children    — chart content
 * @param {number}    height      — content area height in px (default 240)
 * @param {ReactNode} action      — optional element rendered top-right (e.g. period selector)
 * @param {string}    subtitle    — optional sub-heading below title
 * @param {object}    style       — additional styles on outer card div
 */
export default function ChartCard({
  title,
  tooltipId,
  children,
  height = 240,
  action,
  subtitle,
  style = {},
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.ink150}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: T.shadow,
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px 12px",
          borderBottom: `1px solid ${T.ink150}`,
          gap: 10,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        >
          <div>
            <div
              style={{
                fontFamily: T.fontUi,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: T.ink500,
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 11,
                  color: T.ink400,
                  marginTop: 1,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {tooltipId && <InfoTooltip id={tooltipId} />}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      {/* Chart area */}
      <div
        style={{
          padding: "16px 18px 14px",
          height,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}
