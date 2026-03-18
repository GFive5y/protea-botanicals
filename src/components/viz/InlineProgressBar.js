// src/components/viz/InlineProgressBar.js
// WP-VISUAL-SYSTEM — 8px inline progress bar with 3-zone semantic colouring
// Used in StockControl items table, inventory rows, etc.

const T = {
  success: "#166534",
  successBg: "#F0FDF4",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  ink150: "#E2E2E2",
  ink400: "#888888",
  ink500: "#5A5A5A",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
};

/**
 * InlineProgressBar — 8px semantic progress bar
 * @param {number}  value     — current value
 * @param {number}  max       — maximum value (100% fill)
 * @param {number}  dangerAt  — % threshold below which bar turns red (default 20)
 * @param {number}  warnAt    — % threshold below which bar turns amber (default 40)
 * @param {string}  label     — optional label shown above bar
 * @param {string}  unit      — unit suffix on value display (e.g. "ml", "pcs")
 * @param {boolean} showValue — show value/max text (default true)
 * @param {number}  height    — track height in px (default 8)
 */
export default function InlineProgressBar({
  value,
  max,
  dangerAt = 20,
  warnAt = 40,
  label,
  unit = "",
  showValue = true,
  height = 8,
  style = {},
}) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  let barColor, textColor;
  if (pct <= dangerAt) {
    barColor = T.danger;
    textColor = T.danger;
  } else if (pct <= warnAt) {
    barColor = T.warning;
    textColor = T.warning;
  } else {
    barColor = T.accentMid;
    textColor = T.success;
  }

  const fmt = (n) => {
    if (typeof n !== "number") return n;
    return n % 1 === 0 ? n.toLocaleString("en-ZA") : n.toFixed(2);
  };

  return (
    <div style={{ width: "100%", ...style }}>
      {/* Label + value row */}
      {(label || showValue) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
          }}
        >
          {label && (
            <span
              style={{
                fontFamily: T.fontUi,
                fontSize: 11,
                color: T.ink500,
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              style={{
                fontFamily: T.fontUi,
                fontSize: 11,
                fontWeight: 600,
                color: textColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(value)}
              {unit}
              {max !== undefined && (
                <span style={{ fontWeight: 400, color: T.ink400 }}>
                  {" "}
                  / {fmt(max)}
                  {unit}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        style={{
          height,
          background: T.ink150,
          borderRadius: height / 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: barColor,
            borderRadius: height / 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
