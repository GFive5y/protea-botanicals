// src/components/viz/ChartTooltip.js
// WP-VISUAL-SYSTEM — Custom Recharts tooltip
// RULE: ALWAYS use this. NEVER use Recharts default tooltip.

const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#888888",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  success: "#166534",
  warning: "#92400E",
  danger: "#991B1B",
  info: "#1E3A5F",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
};

const SERIES_COLOURS = [T.accent, T.accentMid, "#52B788", "#A7D9B8"];

/**
 * ChartTooltip — drop-in custom tooltip for all Recharts charts
 *
 * Usage in any chart:
 *   <Tooltip content={<ChartTooltip formatter={(v) => `R${v.toLocaleString("en-ZA")}`} />} />
 *
 * @param {boolean}  active      — injected by Recharts
 * @param {Array}    payload     — injected by Recharts
 * @param {string}   label       — injected by Recharts (X-axis value)
 * @param {function} formatter   — optional: (value, name) => string — formats each row value
 * @param {function} labelFormatter — optional: (label) => string — formats the header label
 * @param {string}   unit        — optional suffix appended to every value (e.g. "%" or " units")
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  unit = "",
}) {
  if (!active || !payload || payload.length === 0) return null;

  const displayLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.ink150}`,
        borderLeft: `3px solid ${T.accent}`,
        borderRadius: 4,
        padding: "10px 14px",
        boxShadow: T.shadowMd,
        minWidth: 140,
        pointerEvents: "none",
      }}
    >
      {/* Header label */}
      {displayLabel !== undefined && displayLabel !== "" && (
        <div
          style={{
            fontFamily: T.fontUi,
            fontSize: 11,
            fontWeight: 600,
            color: T.ink500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: 8,
            paddingBottom: 6,
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
          : `${typeof rawValue === "number" ? rawValue.toLocaleString("en-ZA") : rawValue}${unit}`;
        const colour = entry.color || SERIES_COLOURS[i % SERIES_COLOURS.length];

        return (
          <div
            key={entry.dataKey || i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: i < payload.length - 1 ? 5 : 0,
            }}
          >
            {/* Series name + colour dot */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: T.fontUi,
                fontSize: 12,
                color: T.ink500,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: colour,
                  flexShrink: 0,
                }}
              />
              {entry.name}
            </div>

            {/* Value */}
            <span
              style={{
                fontFamily: T.fontUi,
                fontSize: 13,
                fontWeight: 600,
                color: T.ink900,
                fontVariantNumeric: "tabular-nums",
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
