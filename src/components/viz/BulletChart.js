// src/components/viz/BulletChart.js
// WP-VISUAL-SYSTEM — Pure HTML bullet chart (value vs target vs max)
// Used in Supply Chain stock vs reorder, StockControl history modal

const T = {
  success: "#166534",
  successBg: "#F0FDF4",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  danger: "#991B1B",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  ink150: "#E2E2E2",
  ink300: "#B0B0B0",
  ink400: "#888888",
  ink500: "#5A5A5A",
  ink075: "#F4F4F3",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
};

/**
 * BulletChart — horizontal bullet chart
 * @param {number} value   — current value (the filled bar)
 * @param {number} max     — axis maximum
 * @param {number} target  — target/threshold line (rendered as vertical marker)
 * @param {string} label   — left label
 * @param {string} unit    — unit suffix (e.g. "ml", "pcs")
 * @param {number} height  — bar height in px (default 20)
 * @param {string} valueLabel — override display for value (default formatted number)
 */
export default function BulletChart({
  value,
  max,
  target,
  label,
  unit = "",
  height = 20,
  valueLabel,
  style = {},
}) {
  const safePct = (v) => Math.min(Math.max((v / max) * 100, 0), 100);
  const valuePct = max > 0 ? safePct(value) : 0;
  const targetPct = max > 0 && target !== undefined ? safePct(target) : null;

  const isAboveTarget = target !== undefined ? value >= target : true;
  const barColor = isAboveTarget
    ? T.accentMid
    : value < target * 0.5
      ? T.danger
      : T.warning;

  const fmt = (n) => {
    if (typeof n !== "number") return String(n);
    return n % 1 === 0 ? n.toLocaleString("en-ZA") : n.toFixed(2);
  };
  const displayValue = valueLabel ?? `${fmt(value)}${unit}`;

  return (
    <div style={{ width: "100%", ...style }}>
      {/* Label row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        {label && (
          <span style={{ fontFamily: T.fontUi, fontSize: 12, color: T.ink500 }}>
            {label}
          </span>
        )}
        <span
          style={{
            fontFamily: T.fontUi,
            fontSize: 12,
            fontWeight: 600,
            color: barColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayValue}
          {target !== undefined && (
            <span style={{ fontWeight: 400, color: T.ink400, fontSize: 11 }}>
              {" "}
              / {fmt(target)}
              {unit} target
            </span>
          )}
        </span>
      </div>

      {/* Track + bar + target marker */}
      <div
        style={{
          position: "relative",
          height,
          background: T.ink075,
          border: `1px solid ${T.ink150}`,
          borderRadius: 4,
          overflow: "visible",
        }}
      >
        {/* Qualitative band: 0–50% danger zone background */}
        {target !== undefined && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${safePct(target * 0.5)}%`,
              height: "100%",
              background: "rgba(153,27,27,0.06)",
              borderRadius: "4px 0 0 4px",
            }}
          />
        )}

        {/* Value bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 2,
            bottom: 2,
            width: `${valuePct}%`,
            background: barColor,
            borderRadius: 3,
            transition: "width 0.4s ease",
          }}
        />

        {/* Target marker line */}
        {targetPct !== null && (
          <div
            style={{
              position: "absolute",
              left: `${targetPct}%`,
              top: -3,
              bottom: -3,
              width: 2,
              background: T.ink400,
              borderRadius: 1,
              transform: "translateX(-50%)",
            }}
          />
        )}
      </div>

      {/* Axis labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 3,
        }}
      >
        <span style={{ fontFamily: T.fontUi, fontSize: 10, color: T.ink300 }}>
          0
        </span>
        <span style={{ fontFamily: T.fontUi, fontSize: 10, color: T.ink300 }}>
          {fmt(max)}
          {unit}
        </span>
      </div>
    </div>
  );
}
