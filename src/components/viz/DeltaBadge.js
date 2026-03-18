// src/components/viz/DeltaBadge.js
// WP-VISUAL-SYSTEM — Inline delta / % change badge
// Props: value (number), suffix, decimals, forcePositive

const T = {
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  ink500: "#5A5A5A",
  ink075: "#F4F4F3",
  ink150: "#E2E2E2",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
};

/**
 * DeltaBadge — ▲/▼ % change pill for KPI tiles
 * @param {number}  value        — the delta value (positive or negative)
 * @param {string}  suffix       — appended after number (default "%")
 * @param {number}  decimals     — decimal places (default 1)
 * @param {boolean} forcePositive — override colour — always green (e.g. cost reduction is good)
 * @param {boolean} forceNegative — override colour — always red
 * @param {boolean} neutral       — grey pill, no ▲/▼
 */
export default function DeltaBadge({
  value,
  suffix = "%",
  decimals = 1,
  forcePositive = false,
  forceNegative = false,
  neutral = false,
  style = {},
}) {
  if (value === null || value === undefined) return null;

  const num = parseFloat(value);
  const isUp = num >= 0;

  let color, bg, bd;
  if (neutral) {
    color = T.ink500;
    bg = T.ink075;
    bd = T.ink150;
  } else if (forcePositive || (!forceNegative && isUp)) {
    color = T.success;
    bg = T.successBg;
    bd = T.successBd;
  } else {
    color = T.danger;
    bg = T.dangerBg;
    bd = T.dangerBd;
  }

  const arrow = neutral ? "" : isUp ? "▲ " : "▼ ";
  const display = `${arrow}${Math.abs(num).toFixed(decimals)}${suffix}`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        background: bg,
        border: `1px solid ${bd}`,
        color,
        borderRadius: 3,
        padding: "1px 7px",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: T.fontUi,
        letterSpacing: "0.02em",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {display}
    </span>
  );
}
