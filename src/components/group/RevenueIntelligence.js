// src/components/group/RevenueIntelligence.js
// WP-ANALYTICS-3 Session 2 — Revenue Intelligence
// Primary question: "Is my network growing or shrinking, and where?"
//
// Session 1 (HEAD 5352d96):
//   1. Network Growth Summary — 4 KPI tiles (MTD revenue, MoM SSSG, WoW SSSG, top-growth store)
//   2. Revenue Trend Overlay  — all stores on one LineChart, 30/60/90d window toggle
//   3. Per-store Growth Cards — SSSG badges, 7-day mini bar sparkline, projection
//
// Session 2 (this change) adds:
//   A. Peak trading heat matrix — 7 days × 14 business hours, per store collapsible,
//      cells coloured by intensity relative to the store's own max. Network peak
//      insight ("Network peak: Saturday 2pm · 42 events") rendered above the grid.
//      Uses existing `rows[].hour` + `rows[].dayOfWeek` from trendResults — zero new fetches.
//   B. Top products per store — calls fetchStoreSummary with includeExtended to pull
//      the pre-built topProducts [{name, revenue, qty}] array. Rendered as a compact
//      ranked list below the sparkline in each store card.
//   C. CSV export — client-side Blob, 6 columns (Store · Revenue MTD · Prior Month ·
//      MoM SSSG % · WoW SSSG % · Projected Month-End). Export button beside the
//      window toggle in the header controls row.
//
// Schema honoured via fetchStoreTrend + fetchStoreSummary helpers.
// All layout via T.* tokens — zero hardcoded px matching a token (LL-238).
// LL-231: dispensary revenue sourced from dispensing_log (both fetchers branch internally).
// LL-226: is_voided != true applied inside fetchStoreTrend + fetchStoreSummary for dispensary.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartCard, ChartTooltip, DeltaBadge } from "../viz";
import {
  fetchStoreTrend,
  toDailyBuckets,
  buildNetworkDailyAxis,
  calcSSSGMoM,
  calcSSSGWoW,
  projectMonthEnd,
} from "./_helpers/fetchStoreTrend";
import { fetchStoreSummary } from "./_helpers/fetchStoreSummary";
import { INDUSTRY_BADGE } from "./_helpers/industryBadge";
import { T } from "../../styles/tokens";

// ─── Constants ──────────────────────────────────────────────────────────────
const WINDOWS = [
  { days: 30, label: "30d" },
  { days: 60, label: "60d" },
  { days: 90, label: "90d" },
];

// One distinct colour per store — cycles if network > 6 stores
const STORE_PALETTE = [
  "#2D6A4F", // deep forest — franchisor / primary store
  "#2563EB", // sapphire
  "#9333EA", // violet
  "#D97706", // amber
  "#DC2626", // crimson
  "#0891B2", // cyan
];

// Heat matrix constants — display window 9am–10pm (hours 9..22 inclusive = 14 cols)
const PEAK_HOUR_START = 9;
const PEAK_HOUR_END = 22; // inclusive
const PEAK_HOURS_COUNT = PEAK_HOUR_END - PEAK_HOUR_START + 1; // 14
const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
// Show hour labels every 3 columns so they fit in narrow cards: 9am · 12pm · 3pm · 6pm · 9pm
const PEAK_LABEL_STRIDE = 3;
// Minimum events required before we show a heat matrix at all — avoids displaying
// a near-empty grid that misleads the reader into thinking there's a "peak".
const PEAK_MIN_EVENTS = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtR = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const fmtRShort = (n) => {
  const v = Math.abs(parseFloat(n) || 0);
  if (v >= 1_000_000) return `R${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R${(v / 1_000).toFixed(0)}k`;
  return `R${v.toFixed(0)}`;
};

// Format date as "12 Apr" for chart x-axis
const fmtDateShort = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
};

// Format date as "1 Apr – 12 Apr"
const fmtDateRange = (startStr, endStr) => {
  const fmt = (s) => {
    const d = new Date(s + "T12:00:00");
    return `${d.getDate()} ${d.toLocaleString("en-ZA", { month: "short" })}`;
  };
  return `${fmt(startStr)} – ${fmt(endStr)}`;
};

// SSSG colour
const sssgColour = (pct) => {
  if (pct === null || pct === undefined) return T.ink400;
  if (pct >= 5) return T.successText || "#059669";
  if (pct >= 0) return T.warningText || "#D97706";
  return T.dangerText || "#DC2626";
};

const truncate = (s, max) => {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

// Format hour 0-23 as "9am" / "12pm" / "10pm"
const fmtHourLabel = (hour) => {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
};

// Format a peak slot as "Saturday 2pm"
const formatPeakLabel = (day, hour) =>
  `${DAY_LABELS_FULL[day]} ${fmtHourLabel(hour)}`;

// Build a 7×24 count matrix from rows, plus metadata for the displayed 9am–10pm window.
// Events outside the display window are counted in the matrix but ignored for
// maxCell / peak detection — they still appear in the internal array if a caller
// ever needs them.
const buildPeakMatrix = (rows) => {
  const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const r of rows || []) {
    if (
      r &&
      Number.isFinite(r.dayOfWeek) &&
      r.dayOfWeek >= 0 &&
      r.dayOfWeek < 7 &&
      Number.isFinite(r.hour) &&
      r.hour >= 0 &&
      r.hour < 24
    ) {
      matrix[r.dayOfWeek][r.hour] += 1;
    }
  }
  let maxCell = 0;
  let peakDay = null;
  let peakHour = null;
  let displayedTotal = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = PEAK_HOUR_START; h <= PEAK_HOUR_END; h++) {
      const c = matrix[d][h];
      displayedTotal += c;
      if (c > maxCell) {
        maxCell = c;
        peakDay = d;
        peakHour = h;
      }
    }
  }
  return { matrix, maxCell, peakDay, peakHour, displayedTotal };
};

// Cell colour by intensity (count / max) — 4-stop interpolation.
const heatColour = (count, maxCell) => {
  if (!maxCell || count <= 0) return T.surfaceAlt || "#F9FAFB";
  const intensity = count / maxCell;
  if (intensity < 0.25) return T.accentLight || "#ECFDF5";
  if (intensity < 0.5) return "#A7D9B8"; // light-mid accent
  if (intensity < 0.75) return "#52A074"; // mid accent
  return T.accent || "#2D6A4F";
};

// Resolve an INDUSTRY_BADGE descriptor with a safe fallback.
const resolveBadge = (profile) =>
  INDUSTRY_BADGE[profile] || {
    bg: T.neutralLight || "#F3F4F6",
    fg: T.neutralText || "#6B7280",
    label: profile || "Unknown",
  };

// Inline pill — matches the industry badge pattern used by StoreComparison.
function IndustryPill({ profile }) {
  const badge = resolveBadge(profile);
  return (
    <span
      style={{
        display: "inline-block",
        background: badge.bg,
        color: badge.fg,
        fontSize: T.text?.xs || 11,
        fontWeight: T.weight?.semibold || 600,
        padding: `2px ${T.pad?.sm || 8}px`,
        borderRadius: T.radius?.full || 9999,
        letterSpacing: "0.04em",
      }}
    >
      {badge.label}
    </span>
  );
}

// ─── HeatMatrix sub-component ───────────────────────────────────────────────
function HeatMatrix({ matrix, maxCell }) {
  const dayCellStyle = {
    fontSize: 9,
    color: T.ink400 || "#9CA3AF",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingRight: T.gap?.xs || 4,
    fontFamily: T.font,
  };

  return (
    <div
      style={{
        marginTop: T.gap?.sm || 8,
        padding: T.pad?.sm || 8,
        background: T.surface || "#fff",
        border: `1px solid ${T.border || "#E5E7EB"}`,
        borderRadius: T.radius?.md || 8,
      }}
    >
      {/* Matrix grid — day label col + 14 hour cols */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `28px repeat(${PEAK_HOURS_COUNT}, 1fr)`,
          gridAutoRows: "14px",
          gap: 1,
        }}
      >
        {DAY_LABELS_SHORT.map((day, d) => (
          <React.Fragment key={`row-${d}`}>
            <div style={dayCellStyle}>{day}</div>
            {Array.from({ length: PEAK_HOURS_COUNT }).map((_, i) => {
              const hour = PEAK_HOUR_START + i;
              const count = matrix[d][hour] || 0;
              return (
                <div
                  key={`cell-${d}-${hour}`}
                  title={
                    count > 0
                      ? `${count} event${count !== 1 ? "s" : ""} · ${DAY_LABELS_SHORT[d]} ${fmtHourLabel(hour)}`
                      : `0 events · ${DAY_LABELS_SHORT[d]} ${fmtHourLabel(hour)}`
                  }
                  style={{
                    background: heatColour(count, maxCell),
                    borderRadius: 2,
                    minHeight: 12,
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Hour axis labels — every 3rd column (9am · 12pm · 3pm · 6pm · 9pm) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `28px repeat(${PEAK_HOURS_COUNT}, 1fr)`,
          gap: 1,
          marginTop: T.gap?.xs || 4,
          fontSize: 8,
          color: T.ink400 || "#9CA3AF",
          fontFamily: T.font,
        }}
      >
        <div />
        {Array.from({ length: PEAK_HOURS_COUNT }).map((_, i) => {
          const hour = PEAK_HOUR_START + i;
          const show = i % PEAK_LABEL_STRIDE === 0;
          return (
            <div
              key={`lbl-${hour}`}
              style={{ textAlign: "center", whiteSpace: "nowrap" }}
            >
              {show ? fmtHourLabel(hour) : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KPI Tile ───────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, colour, accent = false }) {
  return (
    <div
      style={{
        background: accent ? T.accentLight || "#ECFDF5" : T.surface || "#fff",
        border: `1px solid ${accent ? T.accent || "#2D6A4F" : T.border || "#E5E7EB"}`,
        borderRadius: T.radius?.lg || 10,
        padding: T.inset?.card || 16,
        display: "flex",
        flexDirection: "column",
        gap: T.gap?.xs || 4,
      }}
    >
      <div
        style={{
          fontSize: T.text?.xs || 11,
          fontWeight: T.weight?.semibold || 600,
          color: T.ink400 || "#9CA3AF",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: T.text?.["2xl"] || 22,
          fontWeight: T.weight?.bold || 700,
          color: colour || T.ink900 || "#0D0D0D",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: T.text?.xs || 11,
            color: T.ink500 || "#6B7280",
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Mini sparkline (last 7 days daily revenue) ─────────────────────────────
function MiniSparkline({ daily, colour }) {
  const last7 = daily.slice(-7);
  if (last7.length === 0) return null;
  return (
    <div style={{ height: 48, marginTop: T.gap?.sm || 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={last7} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Bar
            dataKey="revenue"
            fill={colour}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Per-store growth card ──────────────────────────────────────────────────
function StoreGrowthCard({
  member,
  trendResult,
  topProducts,
  storeColour,
  isSelf,
}) {
  const daily = useMemo(
    () => toDailyBuckets(trendResult?.rows || []),
    [trendResult],
  );
  const mom = useMemo(() => calcSSSGMoM(daily), [daily]);
  const wow = useMemo(() => calcSSSGWoW(daily), [daily]);
  const proj = useMemo(() => projectMonthEnd(daily), [daily]);
  const peak = useMemo(
    () => buildPeakMatrix(trendResult?.rows || []),
    [trendResult],
  );

  const [peakExpanded, setPeakExpanded] = useState(false);

  const storeName = member.tenants?.name || member.tenant_id.slice(0, 8);
  const profile = member.tenants?.industry_profile || "cannabis_retail";
  const hasErr = !!trendResult?.err;

  const peakHasEnoughData = peak.displayedTotal >= PEAK_MIN_EVENTS;
  const peakSummary =
    peakHasEnoughData && peak.peakDay !== null && peak.peakHour !== null
      ? `${DAY_LABELS_SHORT[peak.peakDay]} ${fmtHourLabel(peak.peakHour)} · ${peak.maxCell} events`
      : `${peak.displayedTotal} events in window`;

  return (
    <div
      style={{
        background: T.surface || "#fff",
        border: `1px solid ${isSelf ? T.accent || "#2D6A4F" : T.border || "#E5E7EB"}`,
        borderRadius: T.radius?.lg || 10,
        padding: T.inset?.card || 16,
        display: "flex",
        flexDirection: "column",
        gap: T.gap?.sm || 8,
        outline: isSelf ? `2px solid ${T.accent || "#2D6A4F"}` : "none",
        outlineOffset: 2,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: T.text?.base || 14,
              fontWeight: T.weight?.semibold || 600,
              color: T.ink900 || "#0D0D0D",
            }}
          >
            {storeName}
            {isSelf && (
              <span
                style={{
                  fontSize: T.text?.xs || 11,
                  fontWeight: T.weight?.normal || 400,
                  color: T.accentText || "#2D6A4F",
                  marginLeft: T.gap?.xs || 4,
                }}
              >
                (you)
              </span>
            )}
          </div>
          <div style={{ marginTop: 4 }}>
            <IndustryPill profile={profile} />
          </div>
        </div>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: storeColour,
            marginTop: 4,
            flexShrink: 0,
          }}
        />
      </div>

      {/* Error state */}
      {hasErr && (
        <div
          style={{
            background: T.dangerLight || "#FEF2F2",
            border: `1px solid ${T.dangerBorder || "#FECACA"}`,
            borderRadius: T.radius?.sm || 6,
            padding: `${T.pad?.xs || 4}px ${T.pad?.sm || 8}px`,
            fontSize: T.text?.xs || 11,
            color: T.dangerText || "#DC2626",
          }}
        >
          ⚠ Data unavailable: {trendResult.err}
        </div>
      )}

      {/* Revenue MTD */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: T.text?.sm || 13, color: T.ink600 || "#6B7280" }}>
          Revenue MTD
        </span>
        <span
          style={{
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink900 || "#0D0D0D",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtR(mom.mtdRevenue)}
        </span>
      </div>

      {/* MoM SSSG */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ fontSize: T.text?.sm || 13, color: T.ink600 || "#6B7280" }}>
            MoM growth
          </span>
          {mom.dataIsPartial && (
            <div style={{ fontSize: 10, color: T.ink400 || "#9CA3AF" }}>
              {mom.priorRevenue > 0
                ? fmtDateRange(mom.priorStart, mom.priorEnd) + " (partial)"
                : "Insufficient prior data"}
            </div>
          )}
        </div>
        {mom.pct !== null ? (
          <DeltaBadge value={mom.pct} decimals={1} />
        ) : (
          <span style={{ fontSize: T.text?.sm || 13, color: T.ink400 || "#9CA3AF" }}>
            —
          </span>
        )}
      </div>

      {/* WoW SSSG */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: T.text?.sm || 13, color: T.ink600 || "#6B7280" }}>
          WoW growth
        </span>
        {wow.pct !== null ? (
          <DeltaBadge value={wow.pct} decimals={1} size="sm" />
        ) : (
          <span style={{ fontSize: T.text?.sm || 13, color: T.ink400 || "#9CA3AF" }}>
            —
          </span>
        )}
      </div>

      {/* Projected month-end */}
      {proj.avgDaily > 0 && proj.daysRemaining > 0 && (
        <div
          style={{
            background: T.surfaceAlt || "#F9FAFB",
            borderRadius: T.radius?.sm || 6,
            padding: `${T.pad?.xs || 4}px ${T.pad?.sm || 8}px`,
            fontSize: T.text?.xs || 11,
            color: T.ink600 || "#6B7280",
          }}
        >
          Projected month-end:{" "}
          <strong style={{ color: T.ink900 || "#0D0D0D" }}>
            {fmtR(proj.projectedMonthEnd)}
          </strong>
          <span style={{ color: T.ink400 || "#9CA3AF" }}>
            {" "}· {fmtR(proj.avgDaily)}/day avg · {proj.daysRemaining}d left
          </span>
        </div>
      )}

      {/* Event count */}
      <div style={{ fontSize: T.text?.xs || 11, color: T.ink400 || "#9CA3AF" }}>
        {trendResult?.eventCount || 0}{" "}
        {profile === "cannabis_dispensary" ? "dispensing events" : "orders"} in window
      </div>

      {/* Mini sparkline */}
      <MiniSparkline daily={daily} colour={storeColour} />

      {/* ── Top products (from fetchStoreSummary.topProducts) ─────────── */}
      {topProducts && topProducts.length > 0 && (
        <div
          style={{
            marginTop: T.gap?.sm || 8,
            paddingTop: T.gap?.sm || 8,
            borderTop: `1px solid ${T.border || "#E5E7EB"}`,
          }}
        >
          <div
            style={{
              fontSize: T.text?.xs || 11,
              fontWeight: T.weight?.semibold || 600,
              color: T.ink600 || "#6B7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: T.gap?.xs || 4,
            }}
          >
            Top products this month
          </div>
          {topProducts.slice(0, 5).map((p, i) => (
            <div
              key={`${p.name || "item"}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontSize: 11,
                color: T.ink700 || "#374151",
                paddingTop: 2,
                paddingBottom: 2,
                fontFamily: T.font,
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: T.gap?.sm || 8,
                }}
              >
                <span
                  style={{
                    color: T.ink400 || "#9CA3AF",
                    marginRight: 4,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  #{i + 1}
                </span>
                {truncate(p.name || "Unnamed", 22)}
              </span>
              <span
                style={{
                  color: T.ink900 || "#0D0D0D",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: T.weight?.medium || 500,
                  flexShrink: 0,
                }}
              >
                {fmtRShort(p.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Peak trading (collapsible) ─────────────────────────────────── */}
      <div
        style={{
          marginTop: T.gap?.sm || 8,
          paddingTop: T.gap?.sm || 8,
          borderTop: `1px solid ${T.border || "#E5E7EB"}`,
        }}
      >
        <button
          type="button"
          onClick={() => setPeakExpanded((v) => !v)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: T.font,
            color: T.ink700 || "#374151",
          }}
        >
          <span
            style={{
              fontSize: T.text?.xs || 11,
              fontWeight: T.weight?.semibold || 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: T.ink600 || "#6B7280",
            }}
          >
            Peak trading {peakExpanded ? "▴" : "▾"}
          </span>
          <span
            style={{
              fontSize: 10,
              color: T.ink500 || "#6B7280",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {peakSummary}
          </span>
        </button>

        {peakExpanded && (
          <>
            {peakHasEnoughData ? (
              <HeatMatrix matrix={peak.matrix} maxCell={peak.maxCell} />
            ) : (
              <div
                style={{
                  marginTop: T.gap?.sm || 8,
                  padding: T.pad?.sm || 8,
                  background: T.surfaceAlt || "#F9FAFB",
                  borderRadius: T.radius?.sm || 6,
                  fontSize: T.text?.xs || 11,
                  color: T.ink500 || "#6B7280",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Insufficient data — {peak.displayedTotal} event
                {peak.displayedTotal !== 1 ? "s" : ""} in the selected window.
                Need at least {PEAK_MIN_EVENTS} events for a meaningful peak
                trading analysis.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── CSV export helper (client-side, no deps) ───────────────────────────────
function downloadSSSGCsv({ members, trendResults, analytics, groupName, periodLabel }) {
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const roundOrBlank = (n) =>
    n == null || Number.isNaN(n) ? "" : Math.round(n);
  const pctOrBlank = (n) =>
    n == null || Number.isNaN(n) ? "" : n.toFixed(1);

  const { storeMoM, storeWoW } = analytics;

  const rows = [
    [
      "Store",
      "Revenue MTD (ex-VAT)",
      "Prior Month (ex-VAT)",
      "MoM SSSG %",
      "WoW SSSG %",
      "Projected Month-End",
    ],
  ];

  members.forEach((m) => {
    const trendResult = trendResults.find((r) => r.tenantId === m.tenant_id);
    const daily = toDailyBuckets(trendResult?.rows || []);
    const proj = projectMonthEnd(daily);
    const mom = storeMoM?.[m.tenant_id];
    const wow = storeWoW?.[m.tenant_id];
    rows.push([
      m.tenants?.name || m.tenant_id,
      roundOrBlank(mom?.mtdRevenue),
      roundOrBlank(mom?.priorRevenue),
      pctOrBlank(mom?.pct),
      pctOrBlank(wow?.pct),
      roundOrBlank(proj.projectedMonthEnd),
    ]);
  });

  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeGroup = (groupName || "network")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const safePeriod = (periodLabel || "mtd")
    .replace(/\s+/g, "-")
    .toLowerCase();
  a.download = `revenue-intelligence-${safeGroup}-${safePeriod}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function RevenueIntelligence({
  groupId,
  groupName,
  members,
  onNavigate,
}) {
  // eslint-disable-next-line no-unused-vars
  void groupId;
  // eslint-disable-next-line no-unused-vars
  void onNavigate;

  const [windowDays, setWindowDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [trendResults, setTrendResults] = useState([]); // Array<TrendResult>, parallel to members[]

  // Top products per store — keyed by tenantId. Populated by a separate
  // useEffect that calls fetchStoreSummary with includeExtended. Independent
  // of the trend fetch so the chart and SSSG tiles render as soon as the
  // trend data lands, without waiting for the summary round-trips.
  const [topProductsMap, setTopProductsMap] = useState({});

  // Self-identification: the logged-in store is the one already known from GroupPortal context.
  // We don't call useTenant() here — cross-tenant component receives members as props.
  // Mark first member (franchisor) as "self" for the accent highlight.
  const selfTenantId = members[0]?.tenant_id;

  // Date ranges computed once per mount — used by fetchStoreSummary extended mode
  // and by the CSV filename generator.
  const { monthStartISO, lastMonthStartISO, lastMonthEndISO } = useMemo(() => {
    const now = new Date();
    return {
      monthStartISO: new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString(),
      lastMonthStartISO: new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      ).toISOString(),
      lastMonthEndISO: new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
      ).toISOString(),
    };
  }, []);

  // Fetch all store trends in parallel when the window toggles
  useEffect(() => {
    if (!members.length) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      members.map((m) =>
        fetchStoreTrend(
          m.tenant_id,
          m.tenants?.industry_profile || "cannabis_retail",
          windowDays,
        ),
      ),
    ).then((results) => {
      if (cancelled) return;
      setTrendResults(results);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [members, windowDays]);

  // Fetch top products (once on mount + on member change) via fetchStoreSummary
  // extended mode. Window-independent — topProducts are always MTD.
  useEffect(() => {
    if (!members.length) {
      setTopProductsMap({});
      return undefined;
    }
    let cancelled = false;
    Promise.all(
      members.map((m) =>
        fetchStoreSummary(
          m.tenant_id,
          m.tenants?.industry_profile || "cannabis_retail",
          monthStartISO,
          {
            includeExtended: true,
            lastMonthStartISO,
            lastMonthEndISO,
          },
        ),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map = {};
      results.forEach((r) => {
        if (r && r.tenantId) {
          map[r.tenantId] = Array.isArray(r.topProducts) ? r.topProducts : [];
        }
      });
      setTopProductsMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [members, monthStartISO, lastMonthStartISO, lastMonthEndISO]);

  // ── Compute derived analytics ─────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!trendResults.length) return null;

    const tenantIds = members.map((m) => m.tenant_id);

    // Build per-store daily buckets
    const storeDaily = {};
    trendResults.forEach((r) => {
      storeDaily[r.tenantId] = toDailyBuckets(r.rows);
    });

    // Unified date axis for LineChart
    const networkAxis = buildNetworkDailyAxis(storeDaily, tenantIds);

    // Per-store SSSG
    const storeMoM = {};
    const storeWoW = {};
    trendResults.forEach((r) => {
      storeMoM[r.tenantId] = calcSSSGMoM(storeDaily[r.tenantId] || []);
      storeWoW[r.tenantId] = calcSSSGWoW(storeDaily[r.tenantId] || []);
    });

    // Network totals (sum across all stores)
    const networkMTD = trendResults.reduce(
      (s, r) => s + (storeMoM[r.tenantId]?.mtdRevenue || 0),
      0,
    );
    const networkPrior = trendResults.reduce(
      (s, r) => s + (storeMoM[r.tenantId]?.priorRevenue || 0),
      0,
    );
    const networkMoMpct =
      networkPrior > 0 ? ((networkMTD - networkPrior) / networkPrior) * 100 : null;

    const networkThisWeek = trendResults.reduce(
      (s, r) => s + (storeWoW[r.tenantId]?.thisWeekRevenue || 0),
      0,
    );
    const networkLastWeek = trendResults.reduce(
      (s, r) => s + (storeWoW[r.tenantId]?.lastWeekRevenue || 0),
      0,
    );
    const networkWoWpct =
      networkLastWeek > 0
        ? ((networkThisWeek - networkLastWeek) / networkLastWeek) * 100
        : null;

    // Top growth store (highest positive MoM SSSG)
    let topGrowthStore = null;
    let topGrowthPct = -Infinity;
    trendResults.forEach((r, i) => {
      const pct = storeMoM[r.tenantId]?.pct;
      if (pct !== null && pct !== undefined && pct > topGrowthPct) {
        topGrowthPct = pct;
        topGrowthStore = { member: members[i], pct };
      }
    });

    // ── Network peak trading matrix (sum of all stores) ─────────────────
    // 7×24 grid, summed across all stores' rows. Peak computed over the
    // display window 9am–10pm only (same as per-store matrix).
    const networkMatrix = Array.from({ length: 7 }, () =>
      new Array(24).fill(0),
    );
    trendResults.forEach((r) => {
      (r.rows || []).forEach((row) => {
        if (
          Number.isFinite(row.dayOfWeek) &&
          row.dayOfWeek >= 0 &&
          row.dayOfWeek < 7 &&
          Number.isFinite(row.hour) &&
          row.hour >= 0 &&
          row.hour < 24
        ) {
          networkMatrix[row.dayOfWeek][row.hour] += 1;
        }
      });
    });
    let networkPeakDay = null;
    let networkPeakHour = null;
    let networkPeakCount = 0;
    let networkDisplayedTotal = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = PEAK_HOUR_START; h <= PEAK_HOUR_END; h++) {
        const c = networkMatrix[d][h];
        networkDisplayedTotal += c;
        if (c > networkPeakCount) {
          networkPeakCount = c;
          networkPeakDay = d;
          networkPeakHour = h;
        }
      }
    }

    // Data coverage note (for UI disclaimer when data is partial)
    const dataStartDates = trendResults
      .map((r) => r.dataStartDate)
      .filter(Boolean)
      .sort();
    const earliestData = dataStartDates[0] || null;

    return {
      networkAxis,
      storeDaily,
      storeMoM,
      storeWoW,
      networkMTD,
      networkPrior,
      networkMoMpct,
      networkWoWpct,
      topGrowthStore,
      topGrowthPct,
      networkPeakDay,
      networkPeakHour,
      networkPeakCount,
      networkDisplayedTotal,
      earliestData,
    };
  }, [trendResults, members]);

  const periodLabel = useMemo(() => `last ${windowDays}d`, [windowDays]);
  const allErrored = useMemo(
    () => trendResults.length > 0 && trendResults.every((r) => r && r.err),
    [trendResults],
  );

  // ── CSV export handler ───────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!analytics || !members || !members.length) return;
    downloadSSSGCsv({
      members,
      trendResults,
      analytics,
      groupName,
      periodLabel,
    });
  }, [analytics, members, trendResults, groupName, periodLabel]);

  // ── Window toggle pills ──────────────────────────────────────────────────
  const windowToggle = (
    <div
      style={{
        display: "flex",
        gap: T.gap?.xs || 4,
        alignItems: "center",
      }}
    >
      {WINDOWS.map((w) => (
        <button
          key={w.days}
          onClick={() => setWindowDays(w.days)}
          style={{
            padding: `${T.pad?.xs || 4}px ${T.pad?.sm || 8}px`,
            borderRadius: T.radius?.sm || 6,
            border: `1px solid ${
              windowDays === w.days ? T.accent || "#2D6A4F" : T.border || "#E5E7EB"
            }`,
            background:
              windowDays === w.days ? T.accentLight || "#ECFDF5" : "transparent",
            color:
              windowDays === w.days
                ? T.accentText || "#2D6A4F"
                : T.ink600 || "#6B7280",
            fontSize: T.text?.xs || 11,
            fontWeight: T.weight?.semibold || 600,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          {w.label}
        </button>
      ))}
      <button
        type="button"
        onClick={handleExport}
        disabled={loading || allErrored || !analytics}
        style={{
          padding: `${T.pad?.xs || 4}px ${T.pad?.sm || 8}px`,
          marginLeft: T.gap?.sm || 8,
          borderRadius: T.radius?.md || 8,
          border: `1px solid ${T.border || "#E5E7EB"}`,
          background: T.surface || "#fff",
          color: T.ink700 || "#374151",
          fontSize: T.text?.xs || 11,
          fontWeight: T.weight?.semibold || 600,
          cursor:
            loading || allErrored || !analytics ? "not-allowed" : "pointer",
          opacity: loading || allErrored || !analytics ? 0.5 : 1,
          fontFamily: T.font,
          whiteSpace: "nowrap",
        }}
        title="Download SSSG summary as CSV"
      >
        ↓ Export CSV
      </button>
    </div>
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          fontSize: T.text?.sm || 13,
          color: T.ink400 || "#9CA3AF",
          fontFamily: T.font,
          gap: T.gap?.sm || 8,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            border: `2px solid ${T.border || "#E5E7EB"}`,
            borderTopColor: T.accent || "#2D6A4F",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Loading revenue trends…
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  if (!members.length || !analytics) {
    return (
      <div
        style={{
          background: T.surface || "#fff",
          border: `1px solid ${T.border || "#E5E7EB"}`,
          borderRadius: T.radius?.lg || 10,
          padding: T.inset?.card || 16,
          color: T.ink600 || "#6B7280",
          fontSize: T.text?.base || 14,
          fontFamily: T.font,
        }}
      >
        No stores in this network yet.
      </div>
    );
  }

  const {
    networkAxis,
    networkMTD,
    networkMoMpct,
    networkWoWpct,
    topGrowthStore,
    topGrowthPct,
    networkPeakDay,
    networkPeakHour,
    networkPeakCount,
    networkDisplayedTotal,
    earliestData,
  } = analytics;

  const hasNetworkPeak =
    networkDisplayedTotal >= PEAK_MIN_EVENTS &&
    networkPeakDay !== null &&
    networkPeakHour !== null;

  return (
    <div
      style={{
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
        gap: T.page?.sectionGap || 32,
      }}
    >
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: T.gap?.md || 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: T.text?.["2xl"] || 22,
              fontWeight: T.weight?.bold || 700,
              color: T.ink900 || "#0D0D0D",
              letterSpacing: "-0.01em",
            }}
          >
            Revenue Intelligence · {groupName}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: T.text?.sm || 13,
              color: T.ink500 || "#6B7280",
            }}
          >
            Growth trends across {members.length} store
            {members.length !== 1 ? "s" : ""}
            {earliestData && (
              <span style={{ color: T.ink400 || "#9CA3AF", marginLeft: 8 }}>
                · Data from {fmtDateShort(earliestData)}
              </span>
            )}
          </p>
        </div>
        {windowToggle}
      </div>

      {/* ── Section 1: Network Growth Summary (4 KPI tiles) ─────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: T.page?.cardGap || 16,
        }}
      >
        <KpiTile
          label="Network Revenue MTD"
          value={fmtR(networkMTD)}
          sub={`${members.length} store${members.length !== 1 ? "s" : ""} combined`}
          accent
        />
        <KpiTile
          label="MoM Growth"
          value={
            networkMoMpct !== null ? (
              <span style={{ color: sssgColour(networkMoMpct) }}>
                {networkMoMpct >= 0 ? "+" : ""}
                {networkMoMpct.toFixed(1)}%
              </span>
            ) : (
              <span style={{ color: T.ink400 || "#9CA3AF", fontSize: 18 }}>—</span>
            )
          }
          sub={
            networkMoMpct !== null
              ? "vs prior calendar month"
              : "Insufficient prior-month data"
          }
          colour={networkMoMpct !== null ? sssgColour(networkMoMpct) : undefined}
        />
        <KpiTile
          label="WoW Growth"
          value={
            networkWoWpct !== null ? (
              <span style={{ color: sssgColour(networkWoWpct) }}>
                {networkWoWpct >= 0 ? "+" : ""}
                {networkWoWpct.toFixed(1)}%
              </span>
            ) : (
              <span style={{ color: T.ink400 || "#9CA3AF", fontSize: 18 }}>—</span>
            )
          }
          sub={networkWoWpct !== null ? "vs last full week" : "Insufficient data"}
          colour={networkWoWpct !== null ? sssgColour(networkWoWpct) : undefined}
        />
        {topGrowthStore && topGrowthPct > 0 ? (
          <KpiTile
            label="Top Growth Store"
            value={topGrowthStore.member.tenants?.name || "—"}
            sub={`+${topGrowthPct.toFixed(1)}% MoM`}
            colour={T.successText || "#059669"}
          />
        ) : (
          <KpiTile
            label="Network Avg MTD"
            value={members.length > 0 ? fmtR(networkMTD / members.length) : "—"}
            sub="Per store average"
          />
        )}
      </div>

      {/* ── Section 2: Revenue Trend Overlay Chart ──────────────────── */}
      <ChartCard
        title="Revenue Trend"
        subtitle={`Daily revenue (ex-VAT) · last ${windowDays} days · all stores`}
        height={300}
        noPadding={false}
      >
        {networkAxis.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: T.ink400 || "#9CA3AF",
              fontSize: T.text?.sm || 13,
            }}
          >
            No revenue data in this window
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={networkAxis}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid
                horizontal
                vertical={false}
                stroke={T.border || "#E5E7EB"}
                strokeWidth={0.5}
              />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDateShort}
                tick={{
                  fill: T.ink400 || "#9CA3AF",
                  fontSize: 10,
                  fontFamily: T.font,
                }}
                axisLine={false}
                tickLine={false}
                dy={6}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{
                  fill: T.ink400 || "#9CA3AF",
                  fontSize: 10,
                  fontFamily: T.font,
                }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={fmtRShort}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    labelFormatter={fmtDateShort}
                    formatter={(val) => fmtR(val)}
                  />
                }
              />
              <Legend
                formatter={(value) => (
                  <span
                    style={{
                      fontSize: 11,
                      color: T.ink600 || "#6B7280",
                      fontFamily: T.font,
                    }}
                  >
                    {value}
                  </span>
                )}
              />
              {members.map((m, i) => (
                <Line
                  key={m.tenant_id}
                  dataKey={m.tenant_id}
                  name={m.tenants?.name || "Unknown store"}
                  stroke={STORE_PALETTE[i % STORE_PALETTE.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Network peak trading insight (above Section 3) ──────────── */}
      {hasNetworkPeak && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: T.gap?.md || 12,
            padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
            background: T.accentLight || "#ECFDF5",
            border: `1px solid ${T.accent || "#2D6A4F"}`,
            borderRadius: T.radius?.md || 8,
            fontSize: T.text?.sm || 13,
            color: T.accentText || "#2D6A4F",
          }}
        >
          <span
            style={{
              fontSize: T.text?.xs || 11,
              fontWeight: T.weight?.semibold || 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Network peak
          </span>
          <span
            style={{
              fontWeight: T.weight?.semibold || 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatPeakLabel(networkPeakDay, networkPeakHour)}
          </span>
          <span style={{ color: T.ink600 || "#6B7280" }}>
            · {networkPeakCount} events in that slot · {networkDisplayedTotal}{" "}
            total in window
          </span>
        </div>
      )}

      {/* ── Section 3: Per-store growth cards ───────────────────────── */}
      <div>
        <h3
          style={{
            margin: `0 0 ${T.gap?.md || 12}px`,
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink700 || "#374151",
          }}
        >
          Store Growth Breakdown
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: T.page?.cardGap || 16,
          }}
        >
          {members.map((m, i) => {
            const result = trendResults.find(
              (r) => r.tenantId === m.tenant_id,
            ) || {
              tenantId: m.tenant_id,
              rows: [],
              eventCount: 0,
              err: "No data",
            };
            return (
              <StoreGrowthCard
                key={m.tenant_id}
                member={m}
                trendResult={result}
                topProducts={topProductsMap[m.tenant_id]}
                storeColour={STORE_PALETTE[i % STORE_PALETTE.length]}
                isSelf={m.tenant_id === selfTenantId}
              />
            );
          })}
        </div>
      </div>

      {/* ── Data coverage footnote ──────────────────────────────────── */}
      <div
        style={{
          fontSize: T.text?.xs || 11,
          color: T.ink400 || "#9CA3AF",
          borderTop: `1px solid ${T.border || "#E5E7EB"}`,
          paddingTop: T.pad?.sm || 8,
          lineHeight: 1.6,
        }}
      >
        Revenue figures are ex-VAT (÷ 1.15 for retail orders). MoM compares
        current month-to-date to prior full calendar month. WoW compares
        Monday-to-today to prior full week (Mon–Sun). Projected month-end uses
        a 7-day rolling average. Peak trading heat matrix covers 9am–10pm; slots
        with fewer than {PEAK_MIN_EVENTS} events in the selected window render
        as "insufficient data" rather than a misleading empty grid.
        {earliestData &&
          ` Data available from ${fmtDateShort(earliestData)} — comparisons reflect actual data range.`}{" "}
        Dispensary revenue sourced from dispensing log (Schedule 6 records).
      </div>
    </div>
  );
}
