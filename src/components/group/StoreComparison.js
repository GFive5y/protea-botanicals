// src/components/group/StoreComparison.js
// WP-ANALYTICS-1 Module 1 — Store Comparison
// First genuine cross-tenant analytics surface in the NuAi codebase.
//
// Answers one primary question: "Which store is performing best and why?"
//
// Layout (progressive disclosure, single scrolling page):
//   Section 1 — Network Summary: 4 KPI tiles (combined / network avg /
//               best store by revenue / needs attention by margin)
//   Section 2 — Revenue Bar Chart: horizontal Recharts BarChart, sorted,
//               network average reference line, current tenant highlighted
//   Section 3 — Store Comparison Grid: one card per store with
//               DeltaBadge (MTD vs last month), InlineProgressBar margin,
//               AOV, orders, stock health, collapsible top-5 products,
//               transfer + view store actions.
//
// Data: fetchStoreSummary shared helper called with includeExtended=true
// so every store card gets revenueLastMonth + topProducts. Parallel
// Promise.allSettled — per-store failures land as an "Some metrics
// unavailable" banner on that card only.
//
// LL-206: const { tenantId } = useTenant() — used to highlight the user's
// own store on the bar chart.
// LL-231 / LL-226: profile-branched revenue + dispensary is_voided filter
// are both handled inside fetchStoreSummary — this component is
// profile-agnostic at the render layer.
// LL-238: every layout value via T.* — zero hardcoded px matching a token.
// LL-242: margin calculations use AVCO-correct weighted_avg_cost.

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import {
  ChartCard,
  ChartTooltip,
  DeltaBadge,
  InlineProgressBar,
} from "../viz";
import { useTenant } from "../../services/tenantService";
import { fetchStoreSummary } from "./_helpers/fetchStoreSummary";
import { INDUSTRY_BADGE } from "./_helpers/industryBadge";
import { T } from "../../styles/tokens";

// ─── Local helpers (match NetworkDashboard naming) ───────────────────────────

const fmtR = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return "R" + Math.round(n).toLocaleString("en-ZA");
};

const fmtPct = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(1) + "%";
};

const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-ZA");
};

const marginColour = (pct) => {
  if (pct == null) return T.ink600;
  if (pct >= 55) return T.successText;
  if (pct >= 40) return T.warningText;
  return T.dangerText;
};

const truncate = (s, max) => {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

// ─── Sort configuration ─────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { id: "revenue", label: "Revenue" },
  { id: "margin", label: "Margin" },
  { id: "orders", label: "Orders" },
  { id: "stock", label: "Stock health" },
];

// Distinct visible colours for bar chart — cycle if > 6 stores.
// Current store always uses T.accent (dark green). Others get a unique colour.
const BAR_PALETTE = [
  "#2D6A4F", // deep green
  "#1E3A5F", // navy
  "#7C3AED", // violet
  "#92400E", // amber-brown
  "#0F766E", // teal
  "#6B21A8", // purple
];

// ─── Main component ─────────────────────────────────────────────────────────

export default function StoreComparison({
  groupId,
  groupName,
  members,
  onNavigate,
}) {
  // eslint-disable-next-line no-unused-vars
  void groupId; // reserved for future group-level queries

  const { tenantId } = useTenant(); // LL-206 direct form

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState([]);
  const [sortBy, setSortBy] = useState("revenue");
  const [expandedProducts, setExpandedProducts] = useState(() => new Set());

  // ── Date ranges computed once per mount ────────────────────────────────
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

  // ── Fetch all stores in parallel, extended mode ────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!members || members.length === 0) {
      setStoreData([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    (async () => {
      const settled = await Promise.allSettled(
        members.map((m) =>
          fetchStoreSummary(
            m.tenant_id,
            m.tenants?.industry_profile,
            monthStartISO,
            {
              includeExtended: true,
              lastMonthStartISO,
              lastMonthEndISO,
            },
          ),
        ),
      );
      if (cancelled) return;
      const data = settled.map((s, i) => {
        const member = members[i];
        const base =
          s.status === "fulfilled"
            ? s.value
            : {
                tenantId: member.tenant_id,
                revenue: null,
                orderCount: null,
                stockMarginPct: null,
                stockHealth: { critical: 0, low: 0, total: 0 },
                aov: null,
                revenueLastMonth: null,
                topProducts: [],
                err: s.reason?.message || "Unknown error",
              };
        // Enrich with display metadata from the members prop so we don't
        // have to re-join at render time.
        return {
          ...base,
          name: member.tenants?.name || "Unnamed store",
          industryProfile: member.tenants?.industry_profile || null,
          role: member.role || null,
        };
      });
      setStoreData(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [members, monthStartISO, lastMonthStartISO, lastMonthEndISO]);

  // ── Sorted stores (by current sort metric) ─────────────────────────────
  const sortedStores = useMemo(() => {
    const copy = [...storeData];
    copy.sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return (b.revenue || 0) - (a.revenue || 0);
        case "margin":
          return (b.stockMarginPct || 0) - (a.stockMarginPct || 0);
        case "orders":
          return (b.orderCount || 0) - (a.orderCount || 0);
        case "stock": {
          const aRisk =
            (a.stockHealth?.critical || 0) + (a.stockHealth?.low || 0);
          const bRisk =
            (b.stockHealth?.critical || 0) + (b.stockHealth?.low || 0);
          return bRisk - aRisk;
        }
        default:
          return 0;
      }
    });
    return copy;
  }, [storeData, sortBy]);

  // ── Network-level aggregates (derived — no extra queries) ──────────────
  const aggregates = useMemo(() => {
    const withRevenue = storeData.filter((s) => s.revenue != null);
    const combinedRevenue = withRevenue.reduce(
      (sum, s) => sum + (s.revenue || 0),
      0,
    );
    const networkAvgRevenue =
      withRevenue.length > 0 ? combinedRevenue / withRevenue.length : 0;
    const withMargin = storeData.filter((s) => s.stockMarginPct != null);
    const networkAvgMargin =
      withMargin.length > 0
        ? withMargin.reduce((sum, s) => sum + s.stockMarginPct, 0) /
          withMargin.length
        : null;

    // Best store by revenue, worst by margin — computed once
    const byRevenue = [...withRevenue].sort(
      (a, b) => (b.revenue || 0) - (a.revenue || 0),
    );
    const byMarginAsc = [...withMargin].sort(
      (a, b) => (a.stockMarginPct || 0) - (b.stockMarginPct || 0),
    );
    return {
      combinedRevenue,
      networkAvgRevenue,
      networkAvgMargin,
      bestStore: byRevenue[0] || null,
      worstStore: byMarginAsc[0] || null,
    };
  }, [storeData]);

  // ── Bar chart data (same order as sortedStores) ────────────────────────
  const chartData = useMemo(
    () =>
      sortedStores.map((s, idx) => ({
        name: truncate(s.name, 15),
        revenue: s.revenue || 0,
        tenantId: s.tenantId,
        barColor:
          s.tenantId === tenantId
            ? T.accent
            : BAR_PALETTE[idx % BAR_PALETTE.length],
      })),
    [sortedStores, tenantId],
  );

  const toggleProducts = (tid) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(tid)) next.delete(tid);
      else next.add(tid);
      return next;
    });
  };

  // ── Shared style fragments ─────────────────────────────────────────────

  const sectionLabelStyle = {
    fontSize: T.text.xs,
    fontWeight: T.weight.semibold,
    color: T.ink600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: T.gap.lg,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: T.font,
          fontSize: T.text.base,
          color: T.ink600,
        }}
      >
        Loading store comparison…
      </div>
    );
  }

  // Empty / single-store state
  if (!members || members.length < 2) {
    return (
      <div style={{ fontFamily: T.font }}>
        <div style={{ marginBottom: T.page.sectionGap }}>
          <div
            style={{
              fontSize: T.text["3xl"],
              fontWeight: T.weight.bold,
              color: T.ink900,
              marginBottom: T.gap.xs,
            }}
          >
            Store Comparison
          </div>
          <div style={{ fontSize: T.text.base, color: T.ink600 }}>
            {groupName}
          </div>
        </div>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg,
            padding: T.inset.modal,
            textAlign: "center",
            color: T.ink600,
            fontSize: T.text.base,
            lineHeight: 1.6,
          }}
        >
          Add a second store to your network to compare performance. Once
          you have two or more stores, this view will show revenue, margin,
          stock health, and top products side by side with month-on-month
          deltas.
        </div>
      </div>
    );
  }

  const { combinedRevenue, networkAvgRevenue, networkAvgMargin, bestStore, worstStore } =
    aggregates;
  const showWorstTile =
    worstStore && worstStore.stockMarginPct != null && worstStore.stockMarginPct < 50;

  return (
    <div style={{ fontFamily: T.font }}>
      {/* ── Page header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: T.page.sectionGap }}>
        <div
          style={{
            fontSize: T.text["3xl"],
            fontWeight: T.weight.bold,
            color: T.ink900,
            marginBottom: T.gap.xs,
          }}
        >
          Store Comparison · {groupName}
        </div>
        <div style={{ fontSize: T.text.base, color: T.ink600 }}>
          How your stores compare — {members.length} locations
        </div>
      </div>

      {/* ── SECTION 1 — Network Summary (4 KPI tiles) ──────────────── */}
      <section style={{ marginBottom: T.page.sectionGap }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: T.page.cardGap,
          }}
        >
          <KpiTile
            label="Combined Revenue MTD"
            value={fmtR(combinedRevenue)}
            sub={`across ${members.length} stores`}
          />
          <KpiTile
            label="Network Avg Margin"
            value={fmtPct(networkAvgMargin)}
            valueColor={marginColour(networkAvgMargin)}
          />
          <KpiTile
            label="Best Store"
            value={bestStore ? truncate(bestStore.name, 20) : "—"}
            sub={bestStore ? `${fmtR(bestStore.revenue)} MTD` : null}
            accent={T.accent}
          />
          {showWorstTile ? (
            <KpiTile
              label="Needs Attention"
              value={truncate(worstStore.name, 20)}
              sub={`${fmtPct(worstStore.stockMarginPct)} margin`}
              accent={T.dangerBorder}
            />
          ) : (
            <KpiTile
              label="Network Average Revenue"
              value={fmtR(networkAvgRevenue)}
              sub="per store"
            />
          )}
        </div>
      </section>

      {/* ── SECTION 2 — Revenue bar chart + sort control ───────────── */}
      <section style={{ marginBottom: T.page.sectionGap }}>
        {/* Sort control row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: T.gap.sm,
            marginBottom: T.gap.md,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: T.text.xs,
              fontWeight: T.weight.semibold,
              color: T.ink600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginRight: T.gap.xs,
            }}
          >
            Sort by
          </span>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                style={{
                  padding: `${T.pad.xs}px ${T.pad.md}px`,
                  borderRadius: T.radius.full,
                  border: isActive ? "none" : `1px solid ${T.border}`,
                  background: isActive ? T.accent : T.surface,
                  color: isActive ? "#ffffff" : T.ink600,
                  fontFamily: T.font,
                  fontSize: T.text.xs,
                  fontWeight: isActive ? T.weight.semibold : T.weight.medium,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <ChartCard
          title={`Revenue MTD — sorted by ${(
            SORT_OPTIONS.find((o) => o.id === sortBy)?.label || "Revenue"
          ).toLowerCase()}`}
          height={240}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={T.border}
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={(n) => "R" + Math.round(n / 1000) + "k"}
                tick={{ fontSize: T.text.xs, fill: T.ink600 }}
                stroke={T.border}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: T.text.xs, fill: T.ink900 }}
                stroke={T.border}
              />
              <Tooltip
                content={
                  <ChartTooltip formatter={(val) => fmtR(val)} />
                }
                cursor={{ fill: T.surfaceAlt }}
              />
              <ReferenceLine
                x={networkAvgRevenue}
                stroke={T.ink400}
                strokeDasharray="4 4"
                label={{
                  value: "Network avg",
                  position: "top",
                  fontSize: T.text.xs,
                  fill: T.ink400,
                }}
              />
              <Bar
                dataKey="revenue"
                name="Revenue MTD"
                radius={[0, T.radius.sm, T.radius.sm, 0]}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.tenantId}
                    fill={entry.barColor}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* ── SECTION 3 — Store Comparison Grid ──────────────────────── */}
      <section>
        <div style={sectionLabelStyle}>Store breakdown</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: T.page.cardGap,
          }}
        >
          {sortedStores.map((s, idx) => (
            <StoreCard
              key={s.tenantId}
              store={s}
              rank={idx + 1}
              isSelf={s.tenantId === tenantId}
              expanded={expandedProducts.has(s.tenantId)}
              onToggleProducts={() => toggleProducts(s.tenantId)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── KPI tile helper ────────────────────────────────────────────────────────

function KpiTile({ label, value, sub, valueColor, accent }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
        borderRadius: T.radius.md,
        padding: T.inset.card,
        display: "flex",
        flexDirection: "column",
        gap: T.gap.xs,
      }}
    >
      <div
        style={{
          fontSize: T.text.xs,
          fontWeight: T.weight.semibold,
          color: T.ink400,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: T.text["2xl"],
          fontWeight: T.weight.bold,
          color: valueColor || T.ink900,
          fontVariantNumeric: "tabular-nums",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: T.text.xs, color: T.ink600 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Store card ─────────────────────────────────────────────────────────────

function StoreCard({
  store,
  rank,
  isSelf,
  expanded,
  onToggleProducts,
  onNavigate,
}) {
  const badge =
    INDUSTRY_BADGE[store.industryProfile] || {
      bg: T.neutralLight,
      fg: T.neutralText,
      label: store.industryProfile || "Unknown",
    };

  // Delta computation (MTD vs last month). Protect against divide-by-zero.
  const revDelta =
    store.revenueLastMonth != null &&
    store.revenue != null &&
    store.revenueLastMonth > 0
      ? ((store.revenue - store.revenueLastMonth) / store.revenueLastMonth) *
        100
      : null;

  // Label for the count row adapts by profile
  const countLabel =
    store.industryProfile === "cannabis_dispensary"
      ? "Events MTD"
      : "Orders MTD";

  // Stock health summary
  const sh = store.stockHealth || { critical: 0, low: 0, total: 0 };
  const stockHealthDisplay = (() => {
    if (sh.critical > 0) {
      return {
        text:
          sh.critical +
          " critical" +
          (sh.low > 0 ? " · " + sh.low + " low" : ""),
        color: T.dangerText,
      };
    }
    if (sh.low > 0) {
      return { text: sh.low + " low", color: T.warningText };
    }
    if (sh.total > 0) {
      return { text: "All stocked", color: T.successText };
    }
    return { text: "—", color: T.ink600 };
  })();

  // Row style used 5 times — extracted for clarity
  const metricRow = (isLast) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: T.gap.sm,
    paddingBottom: T.gap.sm,
    borderBottom: isLast ? "none" : `1px solid ${T.border}`,
  });
  const metricLabelStyle = {
    fontSize: T.text.xs,
    color: T.ink600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const metricValueStyle = {
    display: "flex",
    alignItems: "center",
    gap: T.gap.sm,
    fontSize: T.text.sm,
    fontWeight: T.weight.medium,
    color: T.ink900,
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div
      style={{
        position: "relative",
        background: T.surface,
        border: `1px solid ${isSelf ? T.accent : T.border}`,
        borderRadius: T.radius.lg,
        padding: T.inset.card,
        overflow: "hidden",
      }}
    >
      {/* Rank badge — absolute top-right */}
      <div
        style={{
          position: "absolute",
          top: T.gap.sm,
          right: T.gap.sm,
          background: T.surfaceAlt,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.full,
          padding: `2px ${T.pad.sm}px`,
          fontSize: T.text.xs,
          fontWeight: T.weight.semibold,
          color: T.ink600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        #{rank}
      </div>

      {/* Per-store error banner (if any) */}
      {store.err && (
        <div
          style={{
            marginBottom: T.gap.md,
            padding: `${T.pad.xs}px ${T.pad.sm}px`,
            background: T.warningLight,
            border: `1px solid ${T.warningBorder}`,
            borderRadius: T.radius.sm,
            fontSize: T.text.xs,
            color: T.warningText,
          }}
          title={store.err}
        >
          Some metrics unavailable
        </div>
      )}

      {/* Header: store name + industry badge */}
      <div style={{ marginBottom: T.gap.md, paddingRight: 40 }}>
        <div
          style={{
            fontSize: T.text.base,
            fontWeight: T.weight.semibold,
            color: T.ink900,
            marginBottom: T.gap.xs,
          }}
        >
          {store.name}
          {isSelf && (
            <span
              style={{
                marginLeft: T.gap.sm,
                fontSize: T.text.xs,
                color: T.ink400,
                fontWeight: T.weight.normal,
              }}
            >
              (you)
            </span>
          )}
        </div>
        <span
          style={{
            display: "inline-block",
            background: badge.bg,
            color: badge.fg,
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
            padding: `2px ${T.pad.sm}px`,
            borderRadius: T.radius.full,
            letterSpacing: "0.04em",
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Metric rows */}
      <div>
        {/* Row 1 — Revenue MTD + delta */}
        <div style={metricRow(false)}>
          <span style={metricLabelStyle}>Revenue MTD</span>
          <span style={metricValueStyle}>
            <span>{fmtR(store.revenue)}</span>
            <DeltaBadge value={revDelta} size="sm" />
          </span>
        </div>

        {/* Row 2 — Gross margin + bar */}
        <div style={metricRow(false)}>
          <span style={metricLabelStyle}>Gross margin</span>
          <span style={metricValueStyle}>
            {store.stockMarginPct != null ? (
              <div style={{ width: 80 }}>
                <InlineProgressBar
                  value={store.stockMarginPct}
                  max={100}
                  dangerAt={40}
                  warnAt={55}
                  showValue={false}
                  height={6}
                />
              </div>
            ) : null}
            <span
              style={{
                color: marginColour(store.stockMarginPct),
                fontWeight: T.weight.semibold,
              }}
            >
              {fmtPct(store.stockMarginPct)}
            </span>
          </span>
        </div>

        {/* Row 3 — AOV */}
        <div style={metricRow(false)}>
          <span style={metricLabelStyle}>Avg order value</span>
          <span style={metricValueStyle}>{fmtR(store.aov)}</span>
        </div>

        {/* Row 4 — Orders / events */}
        <div style={metricRow(false)}>
          <span style={metricLabelStyle}>{countLabel}</span>
          <span style={metricValueStyle}>{fmtNum(store.orderCount)}</span>
        </div>

        {/* Row 5 — Stock health */}
        <div style={metricRow(true)}>
          <span style={metricLabelStyle}>Stock health</span>
          <span
            style={{
              ...metricValueStyle,
              color: stockHealthDisplay.color,
              fontWeight: T.weight.semibold,
            }}
          >
            {stockHealthDisplay.text}
          </span>
        </div>
      </div>

      {/* Top products — collapsible */}
      <div style={{ marginTop: T.gap.md }}>
        <button
          type="button"
          onClick={onToggleProducts}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: T.pad.xs,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: T.ink700,
            fontFamily: T.font,
          }}
        >
          <span
            style={{
              fontSize: T.text.xs,
              fontWeight: T.weight.medium,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Top products
          </span>
          <span style={{ fontSize: T.text.sm }}>
            {expanded ? "▴" : "▾"}
          </span>
        </button>

        {expanded && (
          <div
            style={{
              marginTop: T.gap.sm,
              padding: T.pad.sm,
              background: T.surfaceAlt,
              borderRadius: T.radius.md,
            }}
          >
            {!store.topProducts || store.topProducts.length === 0 ? (
              <div
                style={{
                  fontSize: T.text.xs,
                  color: T.ink400,
                  textAlign: "center",
                  padding: T.pad.sm,
                }}
              >
                No product data yet
              </div>
            ) : (
              store.topProducts.map((p, i) => (
                <div
                  key={p.name + i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: T.gap.sm,
                    paddingTop: T.gap.xs,
                    paddingBottom: T.gap.xs,
                    borderBottom:
                      i < store.topProducts.length - 1
                        ? `1px solid ${T.border}`
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: T.text.xs,
                      color: T.ink400,
                      width: 20,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: T.text.xs,
                      color: T.ink900,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {truncate(p.name, 25)}
                  </span>
                  <span
                    style={{
                      fontSize: T.text.xs,
                      color: T.ink600,
                      fontFamily: T.fontMono,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtR(p.revenue)}
                  </span>
                  <span
                    style={{
                      fontSize: T.text.xs,
                      color: T.ink400,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    ({fmtNum(p.qty)})
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div
        style={{
          marginTop: T.gap.md,
          display: "flex",
          gap: T.gap.sm,
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate && onNavigate("transfers")}
          style={{
            flex: 1,
            background: T.accentLight,
            color: T.accentText,
            border: `1px solid ${T.accent}`,
            borderRadius: T.radius.md,
            padding: `${T.pad.sm}px ${T.pad.md}px`,
            fontFamily: T.font,
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
            cursor: "pointer",
          }}
        >
          Transfer stock →
        </button>
        <button
          type="button"
          onClick={() => {
            // Phase 4b — cross-tenant nav requires a secure tenant-switch
            // action; placeholder until that's wired.
            // eslint-disable-next-line no-console
            console.log(
              "TODO Phase 4b: switch tenant context and navigate to /tenant-portal for",
              store.tenantId,
            );
          }}
          style={{
            flex: 1,
            background: T.surface,
            color: T.ink700,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.md,
            padding: `${T.pad.sm}px ${T.pad.md}px`,
            fontFamily: T.font,
            fontSize: T.text.xs,
            fontWeight: T.weight.medium,
            cursor: "pointer",
          }}
        >
          View store
        </button>
      </div>
    </div>
  );
}
