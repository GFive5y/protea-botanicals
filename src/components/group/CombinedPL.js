// src/components/group/CombinedPL.js
// WP-ANALYTICS-2 Module 2 — Combined P&L
//
// Answers one primary question: "Is my franchise network profitable as
// a whole — and which store is leaking margin?"
//
// Layout (progressive disclosure, single scrolling page):
//   Section 1 — Network Summary: 4 KPI tiles (revenue / gross profit /
//               net profit / average gross margin)
//   Section 2 — Consolidated P&L Table: network total + per-store
//               columns with COGS% benchmark flags on outlier columns
//   Section 3 — Per-store P&L Cards: one card per store with collapsible
//               expense context, COGS flag detail, data-quality badge,
//               and store-level actions (transfer / view)
//
// Plus a top-right control row with date range selector (MTD / Last
// Month / Last 3 Months / YTD) and CSV export, and a loyalty-exclusion
// footnote at the bottom per Decision 3.
//
// Data: fetchStoreFinancials shared helper (separate from
// fetchStoreSummary — see WP-ANALYTICS-2.md Decision 1) called with
// explicit start/end ISO timestamps so each date range triggers a fresh
// fetch. Promise.all parallel across members — per-store failures land
// as an "Some figures unavailable" banner on the affected card only.
//
// LL-206: const { tenantId } = useTenant() — used for self-card highlight.
// LL-231 / LL-226: revenue branching and dispensary is_voided filter are
// handled inside fetchStoreFinancials. This component is profile-agnostic
// at render layer.
// LL-238: all layout via T.* — zero hardcoded px matching a token.
// LL-242: AVCO-correct COGS end-to-end (retail via product_metadata,
// dispensary via inventory_items.weighted_avg_cost).
//
// Loyalty cost is deliberately excluded from this view per Decision 3.
// Footnote in the UI links users to HQ → Profit & Loss for loyalty-
// adjusted figures per store.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTenant } from "../../services/tenantService";
import { fetchStoreFinancials } from "./_helpers/fetchStoreFinancials";
import { INDUSTRY_BADGE } from "./_helpers/industryBadge";
import { T } from "../../styles/tokens";

// ─── Constants ───────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { id: "mtd", label: "This month" },
  { id: "last_m", label: "Last month" },
  { id: "last_3m", label: "Last 3 months" },
  { id: "ytd", label: "This year" },
];

// COGS% benchmark flag thresholds (deviation from network average).
// Decision 5: red at +3% above network avg, amber at +2%.
const COGS_FLAG_RED = 0.03;
const COGS_FLAG_AMBER = 0.02;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtR = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return (
    "R" +
    Math.round(Number(n)).toLocaleString("en-ZA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
};

const fmtPct = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(1) + "%";
};

const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(Number(n)).toLocaleString("en-ZA");
};

const truncate = (s, max) => {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

// Margin band colours — match StoreComparison convention.
const marginColour = (pct) => {
  if (pct == null) return T.ink600;
  if (pct >= 55) return T.successText;
  if (pct >= 40) return T.warningText;
  return T.dangerText;
};

// Compute the start/end ISO boundaries for a given range id. End is
// exclusive — queries use .lt(..., endISO).
function computeDateRange(rangeId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let startISO;
  let endISO;
  let label;

  switch (rangeId) {
    case "last_m": {
      const lastStart = new Date(year, month - 1, 1, 0, 0, 0);
      const thisStart = new Date(year, month, 1, 0, 0, 0);
      startISO = lastStart.toISOString();
      endISO = thisStart.toISOString();
      label = "Last month";
      break;
    }
    case "last_3m": {
      const threeAgo = new Date(year, month - 2, 1, 0, 0, 0);
      startISO = threeAgo.toISOString();
      endISO = new Date().toISOString();
      label = "Last 3 months";
      break;
    }
    case "ytd": {
      const yearStart = new Date(year, 0, 1, 0, 0, 0);
      startISO = yearStart.toISOString();
      endISO = new Date().toISOString();
      label = "This year";
      break;
    }
    case "mtd":
    default: {
      const mStart = new Date(year, month, 1, 0, 0, 0);
      startISO = mStart.toISOString();
      endISO = new Date().toISOString();
      label = "This month";
      break;
    }
  }

  return { startISO, endISO, label };
}

// Classify a store's COGS% deviation from the network average.
// Returns one of: null | "amber" | "red".
function cogsFlagFor(storeCogsRate, networkAvgCogsRate) {
  if (
    storeCogsRate == null ||
    Number.isNaN(storeCogsRate) ||
    networkAvgCogsRate == null ||
    Number.isNaN(networkAvgCogsRate)
  ) {
    return null;
  }
  const deviation = storeCogsRate - networkAvgCogsRate;
  if (deviation > COGS_FLAG_RED) return "red";
  if (deviation > COGS_FLAG_AMBER) return "amber";
  return null;
}

// Client-side CSV export. No dependencies.
function downloadPLCsv(storeResults, network, periodLabel, members) {
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const storeNames = storeResults.map((r) => {
    const m = members.find((mm) => mm.tenant_id === r.tenantId);
    return m?.tenants?.name || r.tenantId;
  });

  const rows = [
    ["Metric", "Network", ...storeNames],
    ["Period", periodLabel, ...storeNames.map(() => "")],
    [
      "Revenue (ex-VAT)",
      fmtR(network.revenue),
      ...storeResults.map((r) => fmtR(r.revenue)),
    ],
    [
      "COGS",
      fmtR(network.cogs),
      ...storeResults.map((r) => fmtR(r.cogs)),
    ],
    [
      "COGS %",
      fmtPct((network.cogsRate || 0) * 100),
      ...storeResults.map((r) =>
        fmtPct(r.revenue > 0 ? (r.cogs / r.revenue) * 100 : 0),
      ),
    ],
    [
      "Gross Profit",
      fmtR(network.grossProfit),
      ...storeResults.map((r) => fmtR(r.grossProfit)),
    ],
    [
      "Gross Margin %",
      fmtPct(network.grossMarginPct),
      ...storeResults.map((r) => fmtPct(r.grossMarginPct)),
    ],
    [
      "Operating Expenses",
      fmtR(network.totalOpex),
      ...storeResults.map((r) => fmtR(r.totalOpex)),
    ],
    [
      "Net Profit",
      fmtR(network.netProfit),
      ...storeResults.map((r) => fmtR(r.netProfit)),
    ],
    [
      "Net Margin %",
      fmtPct(network.netMarginPct),
      ...storeResults.map((r) => fmtPct(r.netMarginPct)),
    ],
    [
      "Order / Event Count",
      String(network.orderCount || 0),
      ...storeResults.map((r) => String(r.orderCount || 0)),
    ],
  ];

  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `network-pl-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function CombinedPL({
  groupId,
  groupName,
  members,
  onNavigate,
}) {
  // eslint-disable-next-line no-unused-vars
  void groupId; // reserved for future group-level queries
  // eslint-disable-next-line no-unused-vars
  void onNavigate; // reserved for Phase 4b cross-tenant nav

  const { tenantId } = useTenant(); // LL-206 direct form

  const [rangeId, setRangeId] = useState("mtd");
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

  const { startISO, endISO, label: periodLabel } = useMemo(
    () => computeDateRange(rangeId),
    [rangeId],
  );

  // ─── Fetch all stores for the selected range ────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!members || members.length === 0) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    (async () => {
      const fetched = await Promise.all(
        members.map((m) =>
          fetchStoreFinancials(
            m.tenant_id,
            m.tenants?.industry_profile,
            startISO,
            endISO,
          ),
        ),
      );
      if (cancelled) return;
      // Enrich each result with display metadata from the members prop.
      const enriched = fetched.map((r, i) => {
        const member = members[i];
        return {
          ...r,
          name: member?.tenants?.name || "Unnamed store",
          industryProfile: member?.tenants?.industry_profile || null,
          role: member?.role || null,
        };
      });
      setResults(enriched);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [members, startISO, endISO]);

  // ─── Network consolidated totals ────────────────────────────────────
  const network = useMemo(() => {
    const revenue = results.reduce((s, r) => s + (r.revenue || 0), 0);
    const cogs = results.reduce((s, r) => s + (r.cogs || 0), 0);
    const totalOpex = results.reduce((s, r) => s + (r.totalOpex || 0), 0);
    const grossProfit = revenue - cogs;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netProfit = grossProfit - totalOpex;
    const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const cogsRate = revenue > 0 ? cogs / revenue : 0;
    const orderCount = results.reduce((s, r) => s + (r.orderCount || 0), 0);
    return {
      revenue,
      cogs,
      cogsRate,
      grossProfit,
      grossMarginPct,
      totalOpex,
      netProfit,
      netMarginPct,
      orderCount,
    };
  }, [results]);

  // Per-store COGS flags, indexed by tenantId for fast lookup.
  const cogsFlags = useMemo(() => {
    const map = {};
    for (const r of results) {
      const rate = r.revenue > 0 ? r.cogs / r.revenue : null;
      map[r.tenantId] = cogsFlagFor(rate, network.cogsRate);
    }
    return map;
  }, [results, network.cogsRate]);

  // Stable display order: keep members[] order so the table matches the
  // sidebar store list in GroupPortal.
  const displayResults = useMemo(() => results, [results]);

  const handleExport = useCallback(() => {
    if (!results || results.length === 0) return;
    downloadPLCsv(displayResults, network, periodLabel, members);
  }, [displayResults, network, periodLabel, members, results]);

  // ─── Style fragments ────────────────────────────────────────────────
  const sectionLabelStyle = {
    fontSize: T.text.xs,
    fontWeight: T.weight.semibold,
    color: T.ink600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: T.gap.lg,
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

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
        Loading combined P&L…
      </div>
    );
  }

  // Empty / single-store state
  if (!members || members.length === 0) {
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
            Combined P&amp;L
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
          No stores in this network yet. Add members in Group Settings to
          see a consolidated P&amp;L.
        </div>
      </div>
    );
  }

  // All stores returned errors — show a single consolidated error state.
  const allErrored = results.every((r) => r.err);

  return (
    <div style={{ fontFamily: T.font }}>
      {/* ── Page header + controls row ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: T.gap.lg,
          marginBottom: T.page.sectionGap,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: T.text["3xl"],
              fontWeight: T.weight.bold,
              color: T.ink900,
              marginBottom: T.gap.xs,
            }}
          >
            Combined P&amp;L · {groupName}
          </div>
          <div style={{ fontSize: T.text.base, color: T.ink600 }}>
            {periodLabel} · {members.length} store
            {members.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Date range + export */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: T.gap.sm,
            flexWrap: "wrap",
          }}
        >
          {DATE_RANGES.map((r) => {
            const isActive = rangeId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeId(r.id)}
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
                {r.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleExport}
            disabled={allErrored}
            style={{
              padding: `${T.pad.xs}px ${T.pad.md}px`,
              borderRadius: T.radius.md,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.ink700,
              fontFamily: T.font,
              fontSize: T.text.xs,
              fontWeight: T.weight.semibold,
              cursor: allErrored ? "not-allowed" : "pointer",
              opacity: allErrored ? 0.5 : 1,
              marginLeft: T.gap.sm,
            }}
            title="Download CSV of this table"
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {allErrored && (
        <div
          style={{
            background: T.dangerLight,
            border: `1px solid ${T.dangerBorder}`,
            borderRadius: T.radius.md,
            padding: T.inset.card,
            color: T.dangerText,
            fontSize: T.text.base,
            marginBottom: T.page.sectionGap,
          }}
        >
          <strong>Could not load any store P&amp;L data for this period.</strong>
          {" "}
          Check your network connection and try again, or select a different
          date range.
        </div>
      )}

      {/* ── SECTION 1 — Network Summary Bar (4 KPI tiles) ──────────── */}
      <section style={{ marginBottom: T.page.sectionGap }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: T.page.cardGap,
          }}
        >
          <KpiTile
            label="Network Revenue"
            value={fmtR(network.revenue)}
            sub={`${members.length} store${members.length !== 1 ? "s" : ""} · ex-VAT`}
          />
          <KpiTile
            label="Gross Profit"
            value={fmtR(network.grossProfit)}
            valueColor={marginColour(network.grossMarginPct)}
            sub={`${fmtPct(network.grossMarginPct)} margin`}
          />
          <KpiTile
            label="Net Profit"
            value={fmtR(network.netProfit)}
            valueColor={marginColour(network.netMarginPct)}
            sub={`${fmtPct(network.netMarginPct)} margin`}
          />
          <KpiTile
            label="Network Avg COGS"
            value={fmtPct((network.cogsRate || 0) * 100)}
            sub="Benchmark for store flags"
          />
        </div>
      </section>

      {/* ── SECTION 2 — Consolidated P&L Table ─────────────────────── */}
      <section style={{ marginBottom: T.page.sectionGap }}>
        <div style={sectionLabelStyle}>Consolidated P&amp;L</div>
        <ConsolidatedTable
          displayResults={displayResults}
          network={network}
          cogsFlags={cogsFlags}
          tenantId={tenantId}
        />
      </section>

      {/* ── SECTION 3 — Per-store P&L Cards ────────────────────────── */}
      <section style={{ marginBottom: T.page.sectionGap }}>
        <div style={sectionLabelStyle}>Store breakdown</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: T.page.cardGap,
          }}
        >
          {displayResults.map((r) => (
            <StoreCard
              key={r.tenantId}
              store={r}
              flag={cogsFlags[r.tenantId]}
              networkAvgCogsPct={(network.cogsRate || 0) * 100}
              isSelf={r.tenantId === tenantId}
            />
          ))}
        </div>
      </section>

      {/* ── Loyalty exclusion footnote (Decision 3) ────────────────── */}
      <div
        style={{
          padding: T.inset.card,
          background: T.surfaceAlt,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.md,
          fontSize: T.text.xs,
          color: T.ink600,
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: T.ink700 }}>Note.</strong> Loyalty programme
        cost is excluded from this view. See each store&apos;s HQ → Profit
        &amp; Loss for loyalty-adjusted figures. Depreciation and CAPEX are
        also excluded — Combined P&amp;L focuses on structural gross and
        net margin across the network.
      </div>
    </div>
  );
}

// ─── KPI tile ───────────────────────────────────────────────────────────────

function KpiTile({ label, value, sub, valueColor }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
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

// ─── Consolidated P&L Table ─────────────────────────────────────────────────

function ConsolidatedTable({ displayResults, network, cogsFlags, tenantId }) {
  // Flag → column header background (applied to the store column header)
  const flagHeaderBg = (flag) => {
    if (flag === "red") return T.dangerLight;
    if (flag === "amber") return T.warningLight;
    return T.surfaceAlt;
  };
  const flagHeaderFg = (flag) => {
    if (flag === "red") return T.dangerText;
    if (flag === "amber") return T.warningText;
    return T.ink700;
  };
  const flagIcon = (flag) => {
    if (flag === "red") return "🔴";
    if (flag === "amber") return "🟡";
    return null;
  };

  // A single P&L row that renders a label + network cell + per-store cells.
  // `highlight` controls subtotal shading. `isPct` controls formatting.
  const renderRow = (label, networkValue, storeValues, options = {}) => {
    const {
      highlight = false,
      isPct = false,
      isCount = false,
      indent = false,
      perStoreColour,
    } = options;

    const baseCellStyle = {
      padding: `${T.pad.md}px ${T.pad.lg}px`,
      fontSize: T.text.sm,
      borderBottom: `1px solid ${T.border}`,
      fontVariantNumeric: "tabular-nums",
      textAlign: "right",
    };
    const labelCellStyle = {
      ...baseCellStyle,
      textAlign: "left",
      color: highlight ? T.ink900 : T.ink700,
      fontWeight: highlight ? T.weight.semibold : T.weight.medium,
      paddingLeft: indent ? T.pad.xl : T.pad.lg,
      background: highlight ? T.surfaceAlt : "transparent",
    };
    const netCellStyle = {
      ...baseCellStyle,
      background: T.accentLight,
      color: T.accentText,
      fontWeight: T.weight.bold,
    };

    const formatCell = (v) => {
      if (v == null || Number.isNaN(v)) return "—";
      if (isCount) return fmtNum(v);
      if (isPct) return fmtPct(v);
      return fmtR(v);
    };

    return (
      <tr>
        <td style={labelCellStyle}>{label}</td>
        <td style={netCellStyle}>{formatCell(networkValue)}</td>
        {storeValues.map((sv, i) => {
          const store = displayResults[i];
          const flag = cogsFlags[store.tenantId];
          const storeCellStyle = {
            ...baseCellStyle,
            background: highlight ? T.surfaceAlt : "transparent",
            color:
              perStoreColour && perStoreColour[i]
                ? perStoreColour[i]
                : store.err
                  ? T.ink400
                  : T.ink900,
            fontWeight: highlight ? T.weight.semibold : T.weight.normal,
          };
          // Highlight the COGS % row cell if this store has a flag
          const isCogsPctRow = label === "COGS %";
          if (isCogsPctRow && flag) {
            storeCellStyle.background =
              flag === "red" ? T.dangerLight : T.warningLight;
            storeCellStyle.color =
              flag === "red" ? T.dangerText : T.warningText;
            storeCellStyle.fontWeight = T.weight.semibold;
          }
          return (
            <td key={store.tenantId} style={storeCellStyle}>
              {store.err && !isCogsPctRow ? "—" : formatCell(sv)}
            </td>
          );
        })}
      </tr>
    );
  };

  // Pre-computed per-store values for each line item.
  const storeRevenue = displayResults.map((r) => r.revenue);
  const storeCogs = displayResults.map((r) => r.cogs);
  const storeCogsPct = displayResults.map((r) =>
    r.revenue > 0 ? (r.cogs / r.revenue) * 100 : null,
  );
  const storeGrossProfit = displayResults.map((r) => r.grossProfit);
  const storeGrossMarginPct = displayResults.map((r) => r.grossMarginPct);
  const storeOpex = displayResults.map((r) => r.totalOpex);
  const storeNetProfit = displayResults.map((r) => r.netProfit);
  const storeNetMarginPct = displayResults.map((r) => r.netMarginPct);
  const storeOrderCount = displayResults.map((r) => r.orderCount);

  // Gross margin colour per store (for the % row).
  const gpPctColours = storeGrossMarginPct.map((pct) => marginColour(pct));
  const netPctColours = storeNetMarginPct.map((pct) => marginColour(pct));

  // Column header cells
  const headerCellBase = {
    padding: `${T.pad.md}px ${T.pad.lg}px`,
    fontSize: T.text.xs,
    fontWeight: T.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    textAlign: "right",
    borderBottom: `1px solid ${T.border}`,
  };

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        overflow: "hidden",
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: T.font,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                ...headerCellBase,
                textAlign: "left",
                color: T.ink600,
                background: T.surface,
              }}
            >
              Metric
            </th>
            <th
              style={{
                ...headerCellBase,
                background: T.accent,
                color: "#ffffff",
              }}
            >
              Network Total
            </th>
            {displayResults.map((r) => {
              const flag = cogsFlags[r.tenantId];
              const icon = flagIcon(flag);
              const isSelf = r.tenantId === tenantId;
              return (
                <th
                  key={r.tenantId}
                  style={{
                    ...headerCellBase,
                    background: flagHeaderBg(flag),
                    color: flagHeaderFg(flag),
                    borderLeft: isSelf ? `2px solid ${T.accent}` : "none",
                  }}
                  title={
                    flag === "red"
                      ? "COGS is 3%+ above network average"
                      : flag === "amber"
                        ? "COGS trending 2-3% above network average"
                        : undefined
                  }
                >
                  {truncate(r.name, 16)}
                  {icon && (
                    <span style={{ marginLeft: T.gap.xs }}>{icon}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {renderRow("Revenue (ex-VAT)", network.revenue, storeRevenue)}
          {renderRow("COGS", network.cogs, storeCogs)}
          {renderRow(
            "COGS %",
            (network.cogsRate || 0) * 100,
            storeCogsPct,
            { isPct: true, indent: true },
          )}
          {renderRow("Gross Profit", network.grossProfit, storeGrossProfit, {
            highlight: true,
          })}
          {renderRow(
            "Gross Margin %",
            network.grossMarginPct,
            storeGrossMarginPct,
            {
              highlight: true,
              isPct: true,
              indent: true,
              perStoreColour: gpPctColours,
            },
          )}
          {renderRow("Operating Expenses", network.totalOpex, storeOpex)}
          {renderRow("Net Profit", network.netProfit, storeNetProfit, {
            highlight: true,
          })}
          {renderRow(
            "Net Margin %",
            network.netMarginPct,
            storeNetMarginPct,
            {
              highlight: true,
              isPct: true,
              indent: true,
              perStoreColour: netPctColours,
            },
          )}
          {renderRow(
            "Order / Event Count",
            network.orderCount,
            storeOrderCount,
            { isCount: true },
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Per-store P&L Card ─────────────────────────────────────────────────────

function StoreCard({ store, flag, networkAvgCogsPct, isSelf }) {
  const badge =
    INDUSTRY_BADGE[store.industryProfile] || {
      bg: T.neutralLight,
      fg: T.neutralText,
      label: store.industryProfile || "Unknown",
    };

  const storeCogsPct =
    store.revenue > 0 ? (store.cogs / store.revenue) * 100 : 0;
  const deviation = storeCogsPct - networkAvgCogsPct;

  // Margin progress bar fill width (0-100 scale)
  const gpBarWidth = Math.max(
    0,
    Math.min(100, store.grossMarginPct || 0),
  );
  const gpBarColor = (() => {
    const pct = store.grossMarginPct;
    if (pct == null || pct < 40) return T.danger;
    if (pct < 55) return T.warning;
    return T.success;
  })();

  const cogsSourceBadge = (() => {
    if (store.cogsSource === "order_items")
      return { label: "AVCO", bg: T.successLight, fg: T.successText };
    if (store.cogsSource === "dispensing_log")
      return { label: "AVCO", bg: T.successLight, fg: T.successText };
    if (store.cogsSource === "production_out")
      return { label: "Production", bg: T.warningLight, fg: T.warningText };
    return { label: "Unavailable", bg: T.neutralLight, fg: T.ink600 };
  })();

  // Metric row layout
  const rowStyle = (isLast) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: T.gap.sm,
    paddingBottom: T.gap.sm,
    borderBottom: isLast ? "none" : `1px solid ${T.border}`,
  });
  const labelStyle = {
    fontSize: T.text.xs,
    color: T.ink600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const valueStyle = {
    fontSize: T.text.sm,
    fontWeight: T.weight.medium,
    color: T.ink900,
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${isSelf ? T.accent : T.border}`,
        borderRadius: T.radius.lg,
        padding: T.inset.card,
        overflow: "hidden",
      }}
    >
      {/* COGS flag banner (top of card, only if flagged) */}
      {flag && (
        <div
          style={{
            marginBottom: T.gap.md,
            padding: `${T.pad.sm}px ${T.pad.md}px`,
            background: flag === "red" ? T.dangerLight : T.warningLight,
            border: `1px solid ${
              flag === "red" ? T.dangerBorder : T.warningBorder
            }`,
            borderRadius: T.radius.md,
            fontSize: T.text.xs,
            color: flag === "red" ? T.dangerText : T.warningText,
            fontWeight: T.weight.semibold,
          }}
        >
          {flag === "red" ? "🔴 " : "🟡 "}
          COGS is {deviation > 0 ? "+" : ""}
          {deviation.toFixed(1)}% vs network average (
          {networkAvgCogsPct.toFixed(1)}%)
          <div
            style={{
              marginTop: T.gap.xs,
              fontSize: T.text.xs,
              color: flag === "red" ? T.dangerText : T.warningText,
              fontWeight: T.weight.normal,
              lineHeight: 1.5,
            }}
          >
            {flag === "red"
              ? "Investigate pricing or verify AVCO in HQ → Inventory."
              : "Trending above network average — monitor pricing."}
          </div>
        </div>
      )}

      {/* Per-store fetch error (if any) */}
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
          Some figures unavailable
        </div>
      )}

      {/* Header: store name + industry badge + data-source chip */}
      <div style={{ marginBottom: T.gap.md }}>
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
        <div style={{ display: "flex", gap: T.gap.sm, flexWrap: "wrap" }}>
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
          <span
            style={{
              display: "inline-block",
              background: cogsSourceBadge.bg,
              color: cogsSourceBadge.fg,
              fontSize: T.text.xs,
              fontWeight: T.weight.medium,
              padding: `2px ${T.pad.sm}px`,
              borderRadius: T.radius.full,
              letterSpacing: "0.04em",
            }}
            title={
              store.cogsSource === "order_items"
                ? "COGS sourced from order_items.product_metadata (LL-203 AVCO)"
                : store.cogsSource === "dispensing_log"
                  ? "COGS sourced from dispensing_log × inventory_items.weighted_avg_cost"
                  : "COGS source unavailable for this store in this period"
            }
          >
            {cogsSourceBadge.label}
          </span>
        </div>
      </div>

      {/* P&L summary rows */}
      <div>
        <div style={rowStyle(false)}>
          <span style={labelStyle}>Revenue</span>
          <span style={valueStyle}>{fmtR(store.revenue)}</span>
        </div>
        <div style={rowStyle(false)}>
          <span style={labelStyle}>COGS</span>
          <span
            style={{
              ...valueStyle,
              color: flag === "red"
                ? T.dangerText
                : flag === "amber"
                  ? T.warningText
                  : T.ink900,
              fontWeight:
                flag === "red" || flag === "amber"
                  ? T.weight.semibold
                  : T.weight.medium,
            }}
          >
            {fmtR(store.cogs)}
            <span
              style={{
                marginLeft: T.gap.sm,
                color: T.ink600,
                fontWeight: T.weight.normal,
              }}
            >
              ({fmtPct(storeCogsPct)})
            </span>
          </span>
        </div>
        <div style={rowStyle(false)}>
          <span style={labelStyle}>Gross Profit</span>
          <span
            style={{
              ...valueStyle,
              color: marginColour(store.grossMarginPct),
              fontWeight: T.weight.semibold,
            }}
          >
            {fmtR(store.grossProfit)}
            <span
              style={{
                marginLeft: T.gap.sm,
                color: T.ink600,
                fontWeight: T.weight.normal,
              }}
            >
              ({fmtPct(store.grossMarginPct)})
            </span>
          </span>
        </div>
        {/* Gross margin progress bar */}
        <div
          style={{
            paddingTop: T.gap.xs,
            paddingBottom: T.gap.md,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              height: 6,
              background: T.surfaceAlt,
              borderRadius: T.radius.full,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${gpBarWidth}%`,
                height: "100%",
                background: gpBarColor,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
        <div style={rowStyle(false)}>
          <span style={labelStyle}>OPEX</span>
          <span style={valueStyle}>
            {fmtR(store.totalOpex)}
            {store.expenseCount > 0 && (
              <span
                style={{
                  marginLeft: T.gap.sm,
                  color: T.ink400,
                  fontSize: T.text.xs,
                  fontWeight: T.weight.normal,
                }}
              >
                ({store.expenseCount} entr
                {store.expenseCount === 1 ? "y" : "ies"})
              </span>
            )}
          </span>
        </div>
        <div style={rowStyle(true)}>
          <span style={labelStyle}>Net Profit</span>
          <span
            style={{
              ...valueStyle,
              color: marginColour(store.netMarginPct),
              fontWeight: T.weight.bold,
              fontSize: T.text.base,
            }}
          >
            {fmtR(store.netProfit)}
            <span
              style={{
                marginLeft: T.gap.sm,
                color: T.ink600,
                fontWeight: T.weight.normal,
                fontSize: T.text.sm,
              }}
            >
              ({fmtPct(store.netMarginPct)})
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
