// src/components/viz/ChartTooltip.js — v2.0
// Enterprise tooltip. Sharp, readable, branded.
// RULE: Always use this. Never use Recharts default tooltip.

const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink300: "#9CA3AF",
  ink150: "#E5E7EB",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
};

const SERIES_COLOURS = [
  "#1A3D2B", "#2D6A4F", "#16A34A", "#059669",
  "#2563EB", "#7C3AED", "#D97706", "#DC2626",
];

/**
 * ChartTooltip v2.0 — drop-in for all Recharts charts
 *
 * Usage:
 *   <Tooltip content={<ChartTooltip formatter={(v) => `R${v.toLocaleString("en-ZA")}`} />} />
 *
 * @param {boolean}  active
 * @param {Array}    payload
 * @param {string}   label
 * @param {function} formatter        — (value, name) => string
 * @param {function} labelFormatter   — (label) => string
 * @param {string}   unit             — suffix appended to every value
 * @param {string}   accentColor      — left border colour override
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  unit = "",
  accentColor,
}) {
  if (!active || !payload || payload.length === 0) return null;

  const displayLabel = labelFormatter ? labelFormatter(label) : label;
  const borderColor = accentColor || T.accentMid;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.97)",
        border: `1px solid ${T.ink150}`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 8,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        minWidth: 160,
        maxWidth: 260,
        pointerEvents: "none",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Header */}
      {displayLabel !== undefined && displayLabel !== "" && (
        <div
          style={{
            fontFamily: T.fontUi,
            fontSize: 11,
            fontWeight: 700,
            color: T.ink500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${T.ink150}`,
          }}
        >
          {displayLabel}
        </div>
      )}

      {/* Series rows */}
      {payload.map((entry, i) => {
        const rawValue = entry.value;
        const displayValue = formatter
          ? formatter(rawValue, entry.name)
          : `${typeof rawValue === "number"
              ? rawValue.toLocaleString("en-ZA")
              : rawValue}${unit}`;
        const colour =
          entry.color || SERIES_COLOURS[i % SERIES_COLOURS.length];

        return (
          <div
            key={entry.dataKey || i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              marginBottom: i < payload.length - 1 ? 7 : 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontFamily: T.fontUi,
                fontSize: 12,
                color: T.ink500,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: colour,
                  flexShrink: 0,
                  boxShadow: `0 0 0 2px ${colour}22`,
                }}
              />
              <span style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {entry.name}
              </span>
            </div>
            <span
              style={{
                fontFamily: T.fontUi,
                fontSize: 13,
                fontWeight: 700,
                color: T.ink900,
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
            >
              {displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}
