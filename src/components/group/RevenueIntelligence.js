// src/components/group/RevenueIntelligence.js
// WP-ANALYTICS-3 Session 1 — Revenue Intelligence
// Primary question: "Is my network growing or shrinking, and where?"
//
// Three sections (progressive disclosure):
//   1. Network Growth Summary — 4 KPI tiles (MTD revenue, MoM SSSG, WoW SSSG, top-growth store)
//   2. Revenue Trend Overlay  — all stores on one LineChart, 30/60/90d window toggle
//   3. Per-store Growth Cards — SSSG badges, 7-day mini bar sparkline, projection
//
// Schema honoured via fetchStoreTrend helper (see that file for full notes).
// All layout via T.* tokens — zero hardcoded px matching a token (LL-238).
// LL-231: dispensary revenue sourced from dispensing_log (fetchStoreTrend branches internally).
// LL-226: is_voided != true applied inside fetchStoreTrend for dispensary.
//
// Step 0 schema check (12 Apr 2026 — preserved permanently):
//   orders.created_at + dispensing_log.dispensed_at — both timestamptz ✓
//   Medi Recreational 90d: 468 orders, 32 distinct dates — client-side bucketing safe ✓
//   Medi Can Dispensary 90d: 14 events, 10 distinct dates — sparse, renders honestly ✓
//   Data gap noted: simulator data starts March 9, not March 1.
//   MoM SSSG labels show actual date ranges ("Apr 1-12 vs Mar 9-31") to avoid misleading %.

import React, { useState, useEffect, useMemo } from "react";
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
function StoreGrowthCard({ member, trendResult, storeColour, isSelf }) {
  const daily = useMemo(
    () => toDailyBuckets(trendResult?.rows || []),
    [trendResult],
  );
  const mom = useMemo(() => calcSSSGMoM(daily), [daily]);
  const wow = useMemo(() => calcSSSGWoW(daily), [daily]);
  const proj = useMemo(() => projectMonthEnd(daily), [daily]);

  const storeName = member.tenants?.name || member.tenant_id.slice(0, 8);
  const profile = member.tenants?.industry_profile || "cannabis_retail";
  const hasErr = !!trendResult?.err;

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
      <MiniSparkline
        daily={toDailyBuckets(trendResult?.rows || [])}
        colour={storeColour}
      />
    </div>
  );
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

  // Self-identification: the logged-in store is the one already known from GroupPortal context.
  // We don't call useTenant() here — cross-tenant component receives members as props.
  // Mark first member (franchisor) as "self" for the accent highlight.
  // In a real multi-user system, we'd compare against the auth user's tenant_id.
  // For now: the franchisor (first member by joined_at) gets the accent treatment.
  const selfTenantId = members[0]?.tenant_id;

  // Fetch all stores in parallel when window changes
  useEffect(() => {
    if (!members.length) {
      setLoading(false);
      return;
    }
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
      setTrendResults(results);
      setLoading(false);
    });
  }, [members, windowDays]);

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
      earliestData,
    };
  }, [trendResults, members]);

  // ── Window toggle pills ──────────────────────────────────────────────────
  const windowToggle = (
    <div style={{ display: "flex", gap: T.gap?.xs || 4 }}>
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
    earliestData,
  } = analytics;

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
        a 7-day rolling average.
        {earliestData &&
          ` Data available from ${fmtDateShort(earliestData)} — comparisons reflect actual data range.`}{" "}
        Dispensary revenue sourced from dispensing log (Schedule 6 records).
      </div>
    </div>
  );
}
