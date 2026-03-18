// src/components/viz/SparkLine.js
// WP-VISUAL-SYSTEM — Inline sparkline for KPI tiles
// Props: data [{v}], positive (bool), width, height

import { AreaChart, Area, ResponsiveContainer } from "recharts";

const T = {
  success: "#166534",
  danger: "#991B1B",
  accentLit: "#E8F5EE",
  dangerBg: "#FEF2F2",
};

/**
 * SparkLine — 60×24px inline trend indicator
 * @param {Array}   data     — [{v: number}, ...] — 6–12 points
 * @param {boolean} positive — true = green, false = red
 * @param {number}  width    — default 60
 * @param {number}  height   — default 24
 */
export default function SparkLine({
  data = [],
  positive = true,
  width = 60,
  height = 24,
}) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }
  const c = positive ? T.success : T.danger;
  const bg = positive ? T.accentLit : T.dangerBg;
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Area
          type="monotone"
          dataKey="v"
          stroke={c}
          strokeWidth={1.5}
          fill={bg}
          fillOpacity={positive ? 0.35 : 0.2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
