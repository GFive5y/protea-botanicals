// src/components/viz/DeltaBadge.js — v2.0
// Enterprise delta indicator. Clear, bold, unambiguous.

/**
 * DeltaBadge v2.0
 * @param {number}  value     — percentage change (positive = up, negative = down)
 * @param {string}  suffix    — default "%"
 * @param {number}  decimals  — decimal places (default 1)
 * @param {boolean} inverse   — invert colour logic (for costs: up = bad)
 * @param {string}  size      — "sm" | "md" | "lg" (default "md")
 */
export default function DeltaBadge({
  value,
  suffix = "%",
  decimals = 1,
  inverse = false,
  size = "md",
}) {
  if (value === null || value === undefined || isNaN(value)) return null;

  const isPositive = inverse ? value < 0 : value >= 0;
  const isNeutral = Math.abs(value) < 0.05;

  const SIZES = {
    sm: { fontSize: 10, padding: "2px 6px", iconSize: 8 },
    md: { fontSize: 12, padding: "3px 8px", iconSize: 10 },
    lg: { fontSize: 14, padding: "4px 10px", iconSize: 12 },
  };
  const s = SIZES[size] || SIZES.md;

  const COLORS = isNeutral
    ? { text: "#6B7280", bg: "#F3F4F6", bd: "#E5E7EB" }
    : isPositive
    ? { text: "#059669", bg: "rgba(5,150,105,0.08)", bd: "rgba(5,150,105,0.22)" }
    : { text: "#DC2626", bg: "rgba(220,38,38,0.07)", bd: "rgba(220,38,38,0.2)" };

  const arrow = isNeutral ? "→" : isPositive ? "↑" : "↓";
  const display = `${Math.abs(value).toFixed(decimals)}${suffix}`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: s.padding,
        borderRadius: 6,
        background: COLORS.bg,
        border: `1px solid ${COLORS.bd}`,
        color: COLORS.text,
        fontSize: s.fontSize,
        fontWeight: 700,
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: s.iconSize, lineHeight: 1 }}>{arrow}</span>
      {display}
    </span>
  );
}
