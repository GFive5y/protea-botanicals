// src/components/group/NetworkIntelligence.js
// WP-ANALYTICS-6 Session 1 — NuAi Network Intelligence
// Status: IN PROGRESS — Session 1
//
// Module 6 of the NuAi franchise analytics suite — the executive
// synthesis layer. Answers the question a franchise owner asks before
// opening any other tab:
//
//   "Is my network healthy — and what needs my attention right now?"
//
// Sections:
//   Alert Centre — consolidated cross-store alerts, severity-sorted
//                  (absent when the network is fully healthy — not
//                  an empty card, genuinely absent)
//   Section 1    — Network Health Score per store + network average
//   Section 2    — Benchmarking table (sortable) with network total row
//   Section 3    — Royalty calculator (renders at 0% with configure note)
//   CSV export   — benchmarking table as 10-column CSV
//   Data quality footnote
//
// Architectural decision (from WP-ANALYTICS-6.md): this component
// renders over fetchNetworkIntelligence, which is a pure aggregator
// calling the three existing helpers (fetchStoreSummary,
// fetchStoreInventory with velocity, fetchStoreLoyalty). No new
// queries. If a metric already exists in a helper's return shape,
// we use it.
//
// The Alert Centre's "Go to {tab}" links use onNavigate to route to
// the relevant analytics tab — onNavigate IS used in this module and
// must NOT be voided. Same for Section 3's "Go to Group Settings"
// button when royalty_percentage is not yet configured.
//
// POPIA: Module 6 does not introduce any customer-level rendering.
// Health scores and alert counts are aggregates. No PII is fetched
// or rendered by this component.

import React, { useState, useEffect, useMemo } from "react";
import { T } from "../../styles/tokens";
import { INDUSTRY_BADGE } from "./_helpers/industryBadge";
import { fetchNetworkIntelligence } from "./_helpers/fetchNetworkIntelligence";

// ─── Health score bands ────────────────────────────────────────────────────
const SCORE_HEALTHY_MIN = 80;
const SCORE_STABLE_MIN = 60;
const SCORE_WATCH_MIN = 40;

const DIMENSION_FULL = 16; // score >= 16 → success colour
const DIMENSION_WARN = 10; // score 10–15 → warning colour; below → danger

// ─── Canonical health score dimensions (order matters for rendering) ──────
const HEALTH_DIMENSIONS = [
  { key: "revenueTrend", label: "Revenue trend" },
  { key: "stockHealth", label: "Stock health" },
  { key: "deadStock", label: "Dead stock" },
  { key: "customerRetention", label: "Customer retain" },
  { key: "loyaltyEngagement", label: "Loyalty engage" },
];

// ─── Benchmarking table columns ────────────────────────────────────────────
const BENCHMARK_COLUMNS = [
  { key: "store", label: "Store", numeric: false, width: "220px" },
  { key: "revenue", label: "Revenue MTD", numeric: true, width: "120px" },
  { key: "mom", label: "MoM %", numeric: true, width: "90px" },
  { key: "margin", label: "Margin %", numeric: true, width: "90px" },
  { key: "stockValue", label: "Stock Value", numeric: true, width: "120px" },
  { key: "outOfStock", label: "Out of Stock", numeric: true, width: "100px" },
  { key: "activeCustomers", label: "Active Cust.", numeric: true, width: "100px" },
  { key: "activeRate", label: "Active %", numeric: true, width: "90px" },
  { key: "redemptionRate", label: "Redeem %", numeric: true, width: "90px" },
  { key: "healthScore", label: "Health", numeric: true, width: "90px" },
];

// ─── Formatters ────────────────────────────────────────────────────────────
const fmtR = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return `R${Math.round(n).toLocaleString("en-ZA")}`;
};

const fmtInt = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-ZA");
};

const fmtPct = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
};

const fmtSignedPct = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
};

// ─── Score band helpers ────────────────────────────────────────────────────
function scoreBandColor(score) {
  if (score == null) return T.ink600;
  if (score >= SCORE_HEALTHY_MIN) return T.successText;
  if (score >= SCORE_STABLE_MIN) return T.ink700;
  if (score >= SCORE_WATCH_MIN) return T.warningText;
  return T.dangerText;
}

function scoreBandLabel(score) {
  if (score == null) return "NO DATA";
  if (score >= SCORE_HEALTHY_MIN) return "HEALTHY";
  if (score >= SCORE_STABLE_MIN) return "STABLE";
  if (score >= SCORE_WATCH_MIN) return "WATCH";
  return "CRITICAL";
}

function dimensionBarColor(score) {
  if (score >= DIMENSION_FULL) return T.successText;
  if (score >= DIMENSION_WARN) return T.warningText;
  return T.dangerText;
}

function severityColor(severity) {
  if (severity === "critical") return T.dangerText;
  if (severity === "warning") return T.warningText;
  return T.ink400;
}

// ─── CSV export ────────────────────────────────────────────────────────────
function downloadNetworkCsv({ stores, groupName }) {
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const intOrBlank = (n) =>
    n == null || Number.isNaN(n) ? "" : Math.round(n);
  const decOrBlank = (n) =>
    n == null || Number.isNaN(n) ? "" : Number(n).toFixed(3);

  const rows = [
    [
      "Store",
      "Revenue MTD",
      "MoM %",
      "Gross Margin %",
      "Stock Value",
      "Out of Stock",
      "Active Customers",
      "Active Rate",
      "Redemption Rate",
      "Health Score",
    ],
  ];

  for (const s of stores) {
    const summary = s.summary || {};
    const inventory = s.inventory || {};
    const loyalty = s.loyalty || {};
    const revCurr = summary.revenue;
    const revPrior = summary.revenueLastMonth;
    const momPct =
      revCurr != null && revPrior != null && revPrior > 0
        ? ((revCurr - revPrior) / revPrior) * 100
        : null;
    const activeRate =
      (loyalty.totalMembers || 0) > 0
        ? (loyalty.activeMembers || 0) / loyalty.totalMembers
        : null;
    rows.push([
      s.member?.tenants?.name || s.member?.tenant_id || "",
      intOrBlank(summary.revenue),
      momPct != null ? momPct.toFixed(1) : "",
      summary.stockMarginPct != null
        ? summary.stockMarginPct.toFixed(1)
        : "",
      intOrBlank(inventory.summary?.totalValue),
      intOrBlank(inventory.summary?.outOfStock),
      intOrBlank(loyalty.activeMembers),
      decOrBlank(activeRate),
      decOrBlank(loyalty.redemptionRate),
      intOrBlank(s.healthScore),
    ]);
  }

  const csvBody = rows.map((r) => r.map(esc).join(",")).join("\n");
  const csv = `\ufeff${csvBody}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeGroup = (groupName || "network")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const now = new Date();
  const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  a.download = `network-intelligence-${safeGroup}-${yyyymm}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Row value extraction for benchmarking sort ───────────────────────────
function getBenchmarkValue(store, columnKey) {
  const summary = store.summary || {};
  const inventory = store.inventory || {};
  const loyalty = store.loyalty || {};
  switch (columnKey) {
    case "store":
      return store.member?.tenants?.name || "";
    case "revenue":
      return summary.revenue || 0;
    case "mom": {
      const revCurr = summary.revenue;
      const revPrior = summary.revenueLastMonth;
      if (revCurr == null || revPrior == null || revPrior === 0)
        return -Infinity;
      return ((revCurr - revPrior) / revPrior) * 100;
    }
    case "margin":
      return summary.stockMarginPct != null
        ? summary.stockMarginPct
        : -Infinity;
    case "stockValue":
      return inventory.summary?.totalValue || 0;
    case "outOfStock":
      return inventory.summary?.outOfStock || 0;
    case "activeCustomers":
      return loyalty.activeMembers || 0;
    case "activeRate": {
      const total = loyalty.totalMembers || 0;
      return total > 0 ? (loyalty.activeMembers || 0) / total : -Infinity;
    }
    case "redemptionRate":
      return loyalty.redemptionRate != null
        ? loyalty.redemptionRate
        : -Infinity;
    case "healthScore":
      return store.healthScore != null ? store.healthScore : -Infinity;
    default:
      return 0;
  }
}

// ─── Main component ────────────────────────────────────────────────────────
export default function NetworkIntelligence({
  groupId,
  groupName,
  groupMeta,
  members,
  onNavigate,
}) {
  // eslint-disable-next-line no-unused-vars
  void groupId;

  const [loading, setLoading] = useState(true);
  const [networkData, setNetworkData] = useState(null);
  const [sortKey, setSortKey] = useState("healthScore");
  const [sortDir, setSortDir] = useState("desc"); // default: Health Score DESC
  const [expandedAlerts, setExpandedAlerts] = useState(false);

  const royaltyPct = parseFloat(groupMeta?.royaltyPct) || 0;

  // Date window — computed once per mount
  const dateWindow = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      monthStartISO: monthStart.toISOString(),
      monthEndISO: monthEnd.toISOString(),
      lastMonthStartISO: lastMonthStart.toISOString(),
      lastMonthEndISO: monthStart.toISOString(),
      label: now.toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
      }),
    };
  }, []);

  // ── Fetch network intelligence ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!members || members.length === 0) {
        setNetworkData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await fetchNetworkIntelligence(
        members,
        groupMeta,
        {
          monthStartISO: dateWindow.monthStartISO,
          monthEndISO: dateWindow.monthEndISO,
          lastMonthStartISO: dateWindow.lastMonthStartISO,
          lastMonthEndISO: dateWindow.lastMonthEndISO,
        },
      );
      if (cancelled) return;
      setNetworkData(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [members, groupMeta, dateWindow]);

  // ── Sorted benchmark rows ───────────────────────────────────────────────
  const sortedStores = useMemo(() => {
    if (!networkData?.stores) return [];
    const copy = [...networkData.stores];
    copy.sort((a, b) => {
      const va = getBenchmarkValue(a, sortKey);
      const vb = getBenchmarkValue(b, sortKey);
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc"
          ? va.localeCompare(vb)
          : vb.localeCompare(va);
      }
      const na = va === -Infinity ? Number.NEGATIVE_INFINITY : va;
      const nb = vb === -Infinity ? Number.NEGATIVE_INFINITY : vb;
      return sortDir === "asc" ? na - nb : nb - na;
    });
    return copy;
  }, [networkData, sortKey, sortDir]);

  const toggleSort = (columnKey) => {
    if (sortKey === columnKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(columnKey);
      setSortDir(columnKey === "store" ? "asc" : "desc");
    }
  };

  const handleExport = () => {
    if (!networkData?.stores?.length) return;
    downloadNetworkCsv({
      stores: networkData.stores,
      groupName,
    });
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          fontSize: T.text.sm,
          color: T.ink400,
          fontFamily: T.font,
          gap: T.gap.sm,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            border: `2px solid ${T.border}`,
            borderTopColor: T.accent,
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Loading network intelligence…
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  // ── Empty state: no members ─────────────────────────────────────────────
  if (!members.length || !networkData) {
    return (
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.lg,
          padding: T.inset.card,
          color: T.ink600,
          fontSize: T.text.base,
          fontFamily: T.font,
        }}
      >
        No stores in this network yet.
      </div>
    );
  }

  const {
    totalAlerts,
    criticalCount,
    warningCount,
    avgHealthScore,
    sortedAlerts,
    royaltyDueMTD,
  } = networkData.network;

  return (
    <div
      style={{
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
        gap: T.page.sectionGap,
      }}
    >
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: T.gap.md,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: T.text["2xl"],
              fontWeight: T.weight.bold,
              color: T.ink900,
              letterSpacing: "-0.01em",
            }}
          >
            Network Intelligence · {groupName}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: T.text.sm,
              color: T.ink600,
            }}
          >
            Executive overview · {members.length} store
            {members.length !== 1 ? "s" : ""} · {dateWindow.label}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!networkData?.stores?.length}
          style={{
            padding: `${T.pad.xs}px ${T.pad.sm}px`,
            borderRadius: T.radius.md,
            border: `1px solid ${T.border}`,
            background: T.surface,
            color: T.ink700,
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
            cursor: networkData?.stores?.length ? "pointer" : "not-allowed",
            opacity: networkData?.stores?.length ? 1 : 0.5,
            fontFamily: T.font,
            whiteSpace: "nowrap",
          }}
          title="Download network intelligence as CSV"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* ── Alert Centre (absent when fully healthy) ───────────────────── */}
      {totalAlerts > 0 && (
        <AlertCentre
          alerts={sortedAlerts}
          criticalCount={criticalCount}
          warningCount={warningCount}
          expanded={expandedAlerts}
          setExpanded={setExpandedAlerts}
          onNavigate={onNavigate}
        />
      )}

      {/* ── Section 1: Network Health Score ────────────────────────────── */}
      <section>
        <div style={sectionLabelStyle}>Network Health Score</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: T.page.cardGap,
          }}
        >
          {networkData.stores.map((store, idx) => (
            <HealthScoreCard
              key={store.member.tenant_id}
              store={store}
              isSelf={idx === 0}
            />
          ))}
        </div>
        {avgHealthScore != null && (
          <NetworkAverageBar avgHealthScore={avgHealthScore} />
        )}
      </section>

      {/* ── Section 2: Benchmarking table ──────────────────────────────── */}
      <section>
        <div style={sectionLabelStyle}>Benchmarking</div>
        <BenchmarkingTable
          stores={sortedStores}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
        />
      </section>

      {/* ── Section 3: Royalty calculator ──────────────────────────────── */}
      <section>
        <div style={sectionLabelStyle}>
          Royalty Summary · {royaltyPct.toFixed(2)}% of revenue
        </div>
        <RoyaltyCalculator
          stores={networkData.stores}
          royaltyPct={royaltyPct}
          royaltyDueMTD={royaltyDueMTD}
          onNavigate={onNavigate}
        />
      </section>

      {/* ── Data quality footnote ──────────────────────────────────────── */}
      <div
        style={{
          borderTop: `1px solid ${T.border}`,
          paddingTop: T.gap.lg,
          fontSize: T.text.xs,
          color: T.ink400,
          lineHeight: 1.7,
        }}
      >
        <div
          style={{
            fontWeight: T.weight.semibold,
            marginBottom: T.gap.xs,
            color: T.ink600,
          }}
        >
          Network Intelligence data notes
        </div>
        · Network Intelligence synthesises data from Revenue
        (fetchStoreSummary), Stock (fetchStoreInventory with velocity),
        and Customer (fetchStoreLoyalty) helpers. No new database
        queries — this tab reuses the helpers the other analytics
        modules already fetch.
        <br />· Health scores are 5-dimension aggregates (revenue
        trend, stock health, dead stock, customer retention, loyalty
        engagement). Dimensions with missing source data are excluded
        from the score denominator and listed in the card footer —
        scores are never artificially inflated by missing data.
        <br />· &quot;HEALTHY&quot; (80+) requires all 5 dimensions to
        have data and all 5 to score in the top band.
        <br />· Alert thresholds are fixed constants — see
        `fetchNetworkIntelligence.js` for tuning values. Critical
        alerts appear before warnings; info alerts only render below
        all critical and warning alerts.
        <br />· Royalty calculations are indicative only —
        `revenue × royalty_percentage / 100` applied to franchisee
        stores (franchisor does not owe royalties to themselves). No
        payment records are created or modified by this view. No
        ledger writes.
        <br />· <strong>POPIA:</strong> no customer-level data is
        fetched or rendered by this component. Alert counts and health
        scores are aggregates only.
      </div>
    </div>
  );
}

// ─── Alert Centre ──────────────────────────────────────────────────────────
function AlertCentre({
  alerts,
  criticalCount,
  warningCount,
  expanded,
  setExpanded,
  onNavigate,
}) {
  const visibleCap = 10;
  // Critical alerts are never truncated regardless of the cap — show
  // all criticals first, then fill remaining slots with warnings/info
  // up to the cap.
  const criticals = alerts.filter((a) => a.severity === "critical");
  const nonCriticals = alerts.filter((a) => a.severity !== "critical");
  const shownBelowCap = [
    ...criticals,
    ...nonCriticals.slice(
      0,
      Math.max(0, visibleCap - criticals.length),
    ),
  ];
  const hiddenCount = alerts.length - shownBelowCap.length;
  const displayAlerts = expanded ? alerts : shownBelowCap;

  const accentColor =
    criticalCount > 0 ? T.dangerText : T.warningText;

  return (
    <section
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: T.radius.lg,
        padding: T.inset.card,
        display: "flex",
        flexDirection: "column",
        gap: T.gap.md,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: T.gap.md,
          flexWrap: "wrap",
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
          Alert Centre
        </div>
        <div style={{ fontSize: T.text.sm, color: T.ink600 }}>
          {criticalCount > 0 && (
            <span style={{ color: T.dangerText, fontWeight: T.weight.semibold }}>
              {criticalCount} critical
            </span>
          )}
          {criticalCount > 0 && warningCount > 0 && " · "}
          {warningCount > 0 && (
            <span
              style={{ color: T.warningText, fontWeight: T.weight.semibold }}
            >
              {warningCount} warning
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: T.gap.xs,
        }}
      >
        {displayAlerts.map((a, i) => (
          <AlertRow key={i} alert={a} onNavigate={onNavigate} />
        ))}
      </div>

      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            background: "transparent",
            border: "none",
            color: T.accent,
            fontFamily: T.font,
            fontSize: T.text.sm,
            fontWeight: T.weight.medium,
            cursor: "pointer",
            padding: 0,
            alignSelf: "flex-start",
          }}
        >
          + {hiddenCount} more alert{hiddenCount !== 1 ? "s" : ""}
        </button>
      )}
    </section>
  );
}

function AlertRow({ alert, onNavigate }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: T.gap.md,
        padding: `${T.pad.sm}px ${T.pad.md}px`,
        borderRadius: T.radius.sm,
        background: T.bg,
        fontSize: T.text.sm,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: T.radius.full,
          background: severityColor(alert.severity),
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: T.ink900,
          fontWeight: T.weight.semibold,
          minWidth: 140,
          flexShrink: 0,
        }}
      >
        {alert.storeName}
      </span>
      <span
        style={{
          color: severityColor(alert.severity),
          fontWeight: T.weight.semibold,
          minWidth: 160,
          flexShrink: 0,
        }}
      >
        {alert.signal}
      </span>
      <span
        style={{
          color: T.ink600,
          flex: 1,
          minWidth: 0,
        }}
      >
        {alert.detail}
      </span>
      <button
        type="button"
        onClick={() => onNavigate && onNavigate(alert.action)}
        style={{
          background: "transparent",
          border: "none",
          color: T.accent,
          fontFamily: T.font,
          fontSize: T.text.xs,
          fontWeight: T.weight.medium,
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        Go to {alert.action} →
      </button>
    </div>
  );
}

// ─── Health Score Card (Section 1) ────────────────────────────────────────
function HealthScoreCard({ store, isSelf }) {
  const { member, healthScore, scoreExclusions, dimensionScores } = store;
  const name = member?.tenants?.name || "Unnamed store";
  const badge = INDUSTRY_BADGE[member?.tenants?.industry_profile] || {
    bg: T.neutralLight,
    fg: T.neutralText,
    label: member?.tenants?.industry_profile || "Unknown",
  };
  const color = scoreBandColor(healthScore);
  const label = scoreBandLabel(healthScore);

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        padding: T.inset.card,
        display: "flex",
        flexDirection: "column",
        gap: T.gap.md,
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            fontSize: T.text.base,
            fontWeight: T.weight.medium,
            color: T.ink900,
            marginBottom: T.gap.xs,
            display: "flex",
            alignItems: "center",
            gap: T.gap.sm,
            flexWrap: "wrap",
          }}
        >
          <span>{name}</span>
          {isSelf && (
            <span
              style={{
                fontSize: T.text.xs,
                color: T.accent,
                fontWeight: T.weight.semibold,
                fontStyle: "italic",
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
            padding: `${T.pad.xs}px ${T.pad.sm}px`,
            borderRadius: T.radius.sm,
            letterSpacing: "0.04em",
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Score gauge */}
      <div
        style={{
          textAlign: "center",
          paddingTop: T.gap.md,
          paddingBottom: T.gap.md,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: T.weight.bold,
            color,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {healthScore != null ? `${healthScore}` : "—"}
          {healthScore != null && (
            <span
              style={{
                fontSize: T.text.base,
                color: T.ink400,
                fontWeight: T.weight.medium,
              }}
            >
              {" "}/ 100
            </span>
          )}
        </div>
        <div
          style={{
            marginTop: T.gap.xs,
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
            color,
            letterSpacing: "0.1em",
          }}
        >
          {label}
        </div>
      </div>

      {/* Dimension bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: T.gap.sm,
        }}
      >
        {HEALTH_DIMENSIONS.map((dim) => {
          const score = dimensionScores?.[dim.key];
          const excluded = score == null;
          const widthPct = excluded ? 0 : (score / 20) * 100;
          return (
            <div key={dim.key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: T.text.xs,
                  color: excluded ? T.ink400 : T.ink700,
                  marginBottom: 2,
                }}
              >
                <span>{dim.label}</span>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: T.ink600,
                  }}
                >
                  {excluded ? "— / 20" : `${score} / 20`}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: T.neutralLight,
                  borderRadius: T.radius.full,
                  overflow: "hidden",
                }}
              >
                {!excluded && (
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      background: dimensionBarColor(score),
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Exclusions footer */}
      {scoreExclusions && scoreExclusions.length > 0 && (
        <div
          style={{
            fontSize: T.text.xs,
            color: T.ink400,
            lineHeight: 1.5,
            fontStyle: "italic",
            borderTop: `1px solid ${T.border}`,
            paddingTop: T.gap.sm,
          }}
        >
          Excluded (no data): {scoreExclusions.join(", ")}
        </div>
      )}
    </div>
  );
}

function NetworkAverageBar({ avgHealthScore }) {
  const color = scoreBandColor(avgHealthScore);
  return (
    <div
      style={{
        marginTop: T.gap.lg,
        padding: T.inset.card,
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.md,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: T.gap.md,
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
        Network average
      </div>
      <div
        style={{
          fontSize: T.text.xl,
          fontWeight: T.weight.bold,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {avgHealthScore} / 100 · {scoreBandLabel(avgHealthScore)}
      </div>
    </div>
  );
}

// ─── Section 2: Benchmarking Table ─────────────────────────────────────────
function BenchmarkingTable({ stores, sortKey, sortDir, toggleSort }) {
  // Network totals / averages pinned bottom row
  const networkTotals = useMemo(() => {
    const totalRevenue = stores.reduce(
      (s, st) => s + (st.summary?.revenue || 0),
      0,
    );
    const totalStockValue = stores.reduce(
      (s, st) => s + (st.inventory?.summary?.totalValue || 0),
      0,
    );
    const totalOutOfStock = stores.reduce(
      (s, st) => s + (st.inventory?.summary?.outOfStock || 0),
      0,
    );
    const totalActive = stores.reduce(
      (s, st) => s + (st.loyalty?.activeMembers || 0),
      0,
    );
    const totalMembers = stores.reduce(
      (s, st) => s + (st.loyalty?.totalMembers || 0),
      0,
    );
    const marginStores = stores.filter(
      (s) => s.summary?.stockMarginPct != null,
    );
    const avgMargin =
      marginStores.length > 0
        ? marginStores.reduce(
            (s, st) => s + st.summary.stockMarginPct,
            0,
          ) / marginStores.length
        : null;
    const healthStores = stores.filter((s) => s.healthScore != null);
    const avgHealth =
      healthStores.length > 0
        ? Math.round(
            healthStores.reduce((s, st) => s + st.healthScore, 0) /
              healthStores.length,
          )
        : null;
    const activeRate = totalMembers > 0 ? totalActive / totalMembers : null;

    // Weighted MoM — use total revenue deltas
    const totalRevPrior = stores.reduce(
      (s, st) => s + (st.summary?.revenueLastMonth || 0),
      0,
    );
    const networkMoMPct =
      totalRevPrior > 0
        ? ((totalRevenue - totalRevPrior) / totalRevPrior) * 100
        : null;

    const redemptionStores = stores.filter(
      (s) => (s.loyalty?.pointsIssuedMTD || 0) > 0,
    );
    const avgRedemption =
      redemptionStores.length > 0
        ? redemptionStores.reduce(
            (s, st) => s + (st.loyalty.redemptionRate || 0),
            0,
          ) / redemptionStores.length
        : null;

    return {
      totalRevenue,
      totalStockValue,
      totalOutOfStock,
      totalActive,
      avgMargin,
      avgHealth,
      activeRate,
      networkMoMPct,
      avgRedemption,
    };
  }, [stores]);

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          minWidth: 1100,
        }}
      >
        <colgroup>
          {BENCHMARK_COLUMNS.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead>
          <tr
            style={{
              background: T.surfaceAlt || T.bg,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            {BENCHMARK_COLUMNS.map((col) => {
              const isActive = sortKey === col.key;
              const arrow = isActive ? (sortDir === "asc" ? " ↑" : " ↓") : "";
              return (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.md}px`,
                    fontSize: T.text.xs,
                    fontWeight: T.weight.semibold,
                    color: isActive ? T.ink900 : T.ink600,
                    textAlign: col.numeric ? "right" : "left",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                  {arrow}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => {
            const summary = store.summary || {};
            const inventory = store.inventory || {};
            const loyalty = store.loyalty || {};
            const revCurr = summary.revenue;
            const revPrior = summary.revenueLastMonth;
            const momPct =
              revCurr != null && revPrior != null && revPrior > 0
                ? ((revCurr - revPrior) / revPrior) * 100
                : null;
            const activeRate =
              (loyalty.totalMembers || 0) > 0
                ? ((loyalty.activeMembers || 0) / loyalty.totalMembers) *
                  100
                : null;
            const badge =
              INDUSTRY_BADGE[store.member?.tenants?.industry_profile] || {
                bg: T.neutralLight,
                fg: T.neutralText,
                label: "—",
              };
            return (
              <tr
                key={store.member.tenant_id}
                style={{
                  borderBottom: `1px solid ${T.border}`,
                  fontSize: T.text.sm,
                }}
              >
                <td
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.md}px`,
                    color: T.ink900,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: T.gap.sm,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: T.weight.medium,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {store.member?.tenants?.name || "Unnamed"}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        background: badge.bg,
                        color: badge.fg,
                        fontSize: 10,
                        fontWeight: T.weight.semibold,
                        padding: `2px ${T.pad.xs}px`,
                        borderRadius: T.radius.sm,
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>
                </td>
                <BenchCell value={fmtR(summary.revenue)} />
                <BenchCell
                  value={fmtSignedPct(momPct)}
                  color={
                    momPct == null
                      ? T.ink400
                      : momPct >= 0
                        ? T.successText
                        : T.dangerText
                  }
                />
                <BenchCell
                  value={fmtPct(summary.stockMarginPct)}
                  color={
                    summary.stockMarginPct == null
                      ? T.ink400
                      : summary.stockMarginPct >= 50
                        ? T.successText
                        : T.warningText
                  }
                />
                <BenchCell
                  value={fmtR(inventory.summary?.totalValue)}
                />
                <BenchCell
                  value={fmtInt(inventory.summary?.outOfStock)}
                  color={
                    (inventory.summary?.outOfStock || 0) > 0
                      ? T.dangerText
                      : T.ink900
                  }
                />
                <BenchCell value={fmtInt(loyalty.activeMembers)} />
                <BenchCell
                  value={fmtPct(activeRate)}
                  color={
                    activeRate == null
                      ? T.ink400
                      : activeRate >= 60
                        ? T.successText
                        : activeRate >= 30
                          ? T.warningText
                          : T.dangerText
                  }
                />
                <BenchCell
                  value={fmtPct(
                    loyalty.redemptionRate != null
                      ? loyalty.redemptionRate * 100
                      : null,
                  )}
                />
                <BenchCell
                  value={
                    store.healthScore != null
                      ? `${store.healthScore}/100`
                      : "—"
                  }
                  color={scoreBandColor(store.healthScore)}
                  weight={T.weight.bold}
                />
              </tr>
            );
          })}
          {/* Network total / average row */}
          <tr
            style={{
              background: T.surfaceAlt || T.bg,
              fontSize: T.text.sm,
              fontWeight: T.weight.semibold,
            }}
          >
            <td
              style={{
                padding: `${T.pad.sm}px ${T.pad.md}px`,
                color: T.ink900,
              }}
            >
              Network total / average
            </td>
            <BenchCell value={fmtR(networkTotals.totalRevenue)} />
            <BenchCell
              value={fmtSignedPct(networkTotals.networkMoMPct)}
              color={
                networkTotals.networkMoMPct == null
                  ? T.ink400
                  : networkTotals.networkMoMPct >= 0
                    ? T.successText
                    : T.dangerText
              }
            />
            <BenchCell
              value={fmtPct(networkTotals.avgMargin)}
            />
            <BenchCell value={fmtR(networkTotals.totalStockValue)} />
            <BenchCell
              value={fmtInt(networkTotals.totalOutOfStock)}
              color={
                networkTotals.totalOutOfStock > 0
                  ? T.dangerText
                  : T.ink900
              }
            />
            <BenchCell value={fmtInt(networkTotals.totalActive)} />
            <BenchCell
              value={fmtPct(
                networkTotals.activeRate != null
                  ? networkTotals.activeRate * 100
                  : null,
              )}
            />
            <BenchCell
              value={fmtPct(
                networkTotals.avgRedemption != null
                  ? networkTotals.avgRedemption * 100
                  : null,
              )}
            />
            <BenchCell
              value={
                networkTotals.avgHealth != null
                  ? `${networkTotals.avgHealth}/100`
                  : "—"
              }
              color={scoreBandColor(networkTotals.avgHealth)}
              weight={T.weight.bold}
            />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BenchCell({ value, color, weight }) {
  return (
    <td
      style={{
        padding: `${T.pad.sm}px ${T.pad.md}px`,
        textAlign: "right",
        color: color || T.ink900,
        fontVariantNumeric: "tabular-nums",
        fontWeight: weight || T.weight.medium,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </td>
  );
}

// ─── Section 3: Royalty Calculator ─────────────────────────────────────────
function RoyaltyCalculator({
  stores,
  royaltyPct,
  royaltyDueMTD,
  onNavigate,
}) {
  const notConfigured = royaltyPct === 0;

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        overflow: "hidden",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: T.text.sm,
        }}
      >
        <thead>
          <tr
            style={{
              background: T.surfaceAlt || T.bg,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <th
              style={{
                padding: `${T.pad.sm}px ${T.pad.md}px`,
                textAlign: "left",
                fontSize: T.text.xs,
                fontWeight: T.weight.semibold,
                color: T.ink600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Store
            </th>
            <th
              style={{
                padding: `${T.pad.sm}px ${T.pad.md}px`,
                textAlign: "right",
                fontSize: T.text.xs,
                fontWeight: T.weight.semibold,
                color: T.ink600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Revenue MTD
            </th>
            <th
              style={{
                padding: `${T.pad.sm}px ${T.pad.md}px`,
                textAlign: "right",
                fontSize: T.text.xs,
                fontWeight: T.weight.semibold,
                color: T.ink600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Royalty MTD
            </th>
            <th
              style={{
                padding: `${T.pad.sm}px ${T.pad.md}px`,
                textAlign: "right",
                fontSize: T.text.xs,
                fontWeight: T.weight.semibold,
                color: T.ink600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Last Month
            </th>
            <th
              style={{
                padding: `${T.pad.sm}px ${T.pad.md}px`,
                textAlign: "left",
                fontSize: T.text.xs,
                fontWeight: T.weight.semibold,
                color: T.ink600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Role
            </th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => {
            const isFranchisee = store.member?.role === "franchisee";
            return (
              <tr
                key={store.member.tenant_id}
                style={{
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <td
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.md}px`,
                    color: T.ink900,
                  }}
                >
                  {store.member?.tenants?.name || "Unnamed"}
                </td>
                <td
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.md}px`,
                    textAlign: "right",
                    color: T.ink900,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtR(store.summary?.revenue)}
                </td>
                <td
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.md}px`,
                    textAlign: "right",
                    color: isFranchisee ? T.ink900 : T.ink400,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: isFranchisee
                      ? T.weight.semibold
                      : T.weight.medium,
                  }}
                >
                  {isFranchisee ? fmtR(store.royaltyMTD) : "—"}
                </td>
                <td
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.md}px`,
                    textAlign: "right",
                    color: isFranchisee ? T.ink700 : T.ink400,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {isFranchisee ? fmtR(store.royaltyLastMonth) : "—"}
                </td>
                <td
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.md}px`,
                    color: T.ink600,
                    textTransform: "capitalize",
                  }}
                >
                  {store.member?.role || "—"}
                </td>
              </tr>
            );
          })}
          <tr
            style={{
              background: T.surfaceAlt || T.bg,
              fontWeight: T.weight.semibold,
            }}
          >
            <td
              colSpan={2}
              style={{
                padding: `${T.pad.sm}px ${T.pad.md}px`,
                color: T.ink900,
              }}
            >
              Network royalty due MTD
            </td>
            <td
              style={{
                padding: `${T.pad.sm}px ${T.pad.md}px`,
                textAlign: "right",
                color: T.ink900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtR(royaltyDueMTD)}
            </td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
      {notConfigured && (
        <div
          style={{
            padding: T.inset.card,
            borderTop: `1px solid ${T.border}`,
            fontSize: T.text.sm,
            color: T.ink600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: T.gap.md,
            flexWrap: "wrap",
          }}
        >
          <span>
            Royalty rate is set to 0%. Franchisee royalties will show R0
            until a rate is configured.
          </span>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("settings")}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              borderRadius: T.radius.md,
              padding: `${T.pad.xs}px ${T.pad.sm}px`,
              color: T.accent,
              fontFamily: T.font,
              fontSize: T.text.xs,
              fontWeight: T.weight.semibold,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Go to Group Settings →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared style fragments ────────────────────────────────────────────────
const sectionLabelStyle = {
  fontSize: T.text.xs,
  fontWeight: T.weight.semibold,
  color: T.ink600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: T.gap.lg,
};
