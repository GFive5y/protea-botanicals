// src/components/group/CustomerIntelligence.js
// WP-ANALYTICS-5 — Customer & Loyalty Intelligence
// Status: IN PROGRESS — Session 1 HEAD `a5134aa` · Session 2 pending
//
// Module 5 of the NuAi franchise analytics suite. Answers the question no
// single-store surface can answer: how is the loyalty programme performing
// across the whole network, and where are the churn signals?
//
// Sections live in S1:
//   1. Network Customer Summary — 4 KPI tiles (total, active, at-risk, points)
//   2. Loyalty Tier Distribution by Store — per-store tier breakdown bars
//   3. Cohort Health by Store — collapsible per-store cohort table + bar
//
// Deferred to S2:
//   4. Campaign ROI — no loyalty_campaigns table exists in the live schema
//      (verified via Step 0 on 12 Apr 2026). Section is a no-op until a
//      schema owner adds the table.
//   5. AI Engine Activity — reads loyalty_ai_log (actual table name; the
//      spec's ai_action_logs does not exist). Action types live:
//      churn_rescue, birthday_bonus, stock_boost_suggestion.
//   6. Top Customers per store — POPIA-safe projection, initials + masked
//      UUID suffix only. No email, phone, or full name ever rendered.
//
// POPIA (non-negotiable): this component renders aggregate counts, cohort
// distributions, and tier breakdowns only. No individual customer identity
// is displayed anywhere. The POPIA-safe SELECT list is enforced in
// fetchStoreLoyalty.js — the eight non-PII columns are the entire projection.
// See that helper's header for the full column list and rationale.
//
// Tier palette — hardcoded with Step 0 rationale. The loyalty_tiers table
// that the WP-ANALYTICS-5 spec assumed does not exist in the schema. Tier
// names are a fixed five-value enum in user_profiles.loyalty_tier:
// bronze, silver, gold, platinum, harvest_club. Per-tenant thresholds and
// multipliers live on loyalty_config but that table has no colour column
// either. The palette below matches the visual convention used throughout
// HQLoyalty.js and the consumer-facing loyalty surfaces — updating it
// requires updating those surfaces too for consistency.

import React, { useState, useEffect, useMemo } from "react";
import { T } from "../../styles/tokens";
import { fetchStoreLoyalty } from "./_helpers/fetchStoreLoyalty";
import { INDUSTRY_BADGE } from "./_helpers/industryBadge";

// ─── Tier palette (Step 0 — no loyalty_tiers table, see header) ────────────
const TIER_PALETTE = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#B9F2FF",
  harvest_club: "#6B8E23",
  unassigned: "#9CA3AF",
};

const TIER_LABEL = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  harvest_club: "Harvest Club",
  unassigned: "Unassigned",
};

// Canonical ordering for tier bar segments — bottom tier to top. Any tier
// name not listed sorts after in alphabetic order (handled at helper level).
const TIER_ORDER = ["bronze", "silver", "gold", "platinum", "harvest_club"];

// Churn signal thresholds (from spec) — expressed as fractions of totalMembers.
const CHURN_SIGNAL_THRESHOLD = 0.3;
const DORMANT_ACTIVATION_THRESHOLD = 0.2;
const REDEMPTION_DANGER_THRESHOLD = 0.1;
const ACTIVE_SUCCESS_THRESHOLD = 0.6;
const ACTIVE_WARNING_THRESHOLD = 0.3;

// ─── Formatters ────────────────────────────────────────────────────────────
const fmtInt = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-ZA");
};

const fmtPctOfTotal = (count, total) => {
  if (!total || total === 0) return "—";
  return `${((count / total) * 100).toFixed(1)}%`;
};

// Truncate store name for tile sub-labels per spec (24 chars with ellipsis).
const truncate = (s, max = 24) => {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

// ─── CSV export helper ─────────────────────────────────────────────────────
// 8-column spec — Store, Total, New, Active, At-Risk, Lapsed, Dormant,
// Redemption Rate %. Pattern ported from downloadSSSGCsv in
// RevenueIntelligence.js (proper quote escaping, UTF-8 BOM for Excel).
function downloadCustomerIntelligenceCsv({ members, loyaltyResults, groupName }) {
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const intOrBlank = (n) =>
    n == null || Number.isNaN(n) ? "" : Math.round(n);
  const pctOrBlank = (n) =>
    n == null || Number.isNaN(n) ? "" : (n * 100).toFixed(1);

  const rows = [
    [
      "Store",
      "Total Members",
      "New This Month",
      "Active",
      "At-Risk",
      "Lapsed",
      "Dormant",
      "Redemption Rate %",
    ],
  ];

  members.forEach((m) => {
    const r = loyaltyResults.find((x) => x.tenantId === m.tenant_id);
    rows.push([
      m.tenants?.name || m.tenant_id,
      intOrBlank(r?.totalMembers),
      intOrBlank(r?.newThisMonth),
      intOrBlank(r?.activeMembers),
      intOrBlank(r?.atRiskMembers),
      intOrBlank(r?.lapsedMembers),
      intOrBlank(r?.dormantMembers),
      pctOrBlank(r?.redemptionRate),
    ]);
  });

  const csvBody = rows.map((r) => r.map(esc).join(",")).join("\n");
  // UTF-8 BOM so Excel renders special characters correctly on Windows.
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
  a.download = `customer-intelligence-${safeGroup}-${yyyymm}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main component ────────────────────────────────────────────────────────
export default function CustomerIntelligence({
  groupId,
  groupName,
  members,
  onNavigate,
}) {
  // eslint-disable-next-line no-unused-vars
  void groupId;
  // eslint-disable-next-line no-unused-vars
  void onNavigate;

  const [loading, setLoading] = useState(true);
  const [loyaltyResults, setLoyaltyResults] = useState([]); // parallel to members[]

  // Section 3 per-store expansion state. Keys are tenant_id. A store is
  // expanded by default when it has any at-risk or lapsed members (the
  // operationally urgent signal) — see computeInitialExpansion below.
  const [expandedStores, setExpandedStores] = useState(() => new Set());

  // Month window — computed once per mount. Used for the points economy
  // MTD filter in fetchStoreLoyalty and for the CSV filename.
  const { monthStartISO, monthEndISO } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      monthStartISO: monthStart.toISOString(),
      monthEndISO: monthEnd.toISOString(),
    };
  }, []);

  // ── Fetch loyalty data for every member store in parallel ────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!members || members.length === 0) {
        setLoyaltyResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const results = await Promise.all(
        members.map((m) =>
          fetchStoreLoyalty(m.tenant_id, {
            monthStartISO,
            monthEndISO,
          }),
        ),
      );
      if (cancelled) return;
      setLoyaltyResults(results);

      // Auto-expand Section 3 cards that have churn signals — this is the
      // operationally urgent path and matches the spec's intent of "at-risk
      // and lapsed cohorts are revenue about to be permanently lost".
      const initial = new Set();
      results.forEach((r) => {
        if ((r.atRiskMembers || 0) + (r.lapsedMembers || 0) > 0) {
          initial.add(r.tenantId);
        }
      });
      setExpandedStores(initial);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [members, monthStartISO, monthEndISO]);

  // ── Network-level aggregates ─────────────────────────────────────────────
  const networkTotals = useMemo(() => {
    const init = {
      totalMembers: 0,
      newThisMonth: 0,
      activeMembers: 0,
      atRiskMembers: 0,
      lapsedMembers: 0,
      dormantMembers: 0,
      highChurnRiskMembers: 0,
      pointsIssuedMTD: 0,
      pointsRedeemedMTD: 0,
      storesWithData: 0,
      storesErrored: 0,
    };
    for (const r of loyaltyResults) {
      if (r.cohortErr && r.pointsErr) {
        init.storesErrored++;
        continue;
      }
      init.storesWithData++;
      init.totalMembers += r.totalMembers || 0;
      init.newThisMonth += r.newThisMonth || 0;
      init.activeMembers += r.activeMembers || 0;
      init.atRiskMembers += r.atRiskMembers || 0;
      init.lapsedMembers += r.lapsedMembers || 0;
      init.dormantMembers += r.dormantMembers || 0;
      init.highChurnRiskMembers += r.highChurnRiskMembers || 0;
      init.pointsIssuedMTD += r.pointsIssuedMTD || 0;
      init.pointsRedeemedMTD += r.pointsRedeemedMTD || 0;
    }
    init.activeRate =
      init.totalMembers > 0 ? init.activeMembers / init.totalMembers : 0;
    init.networkRedemptionRate =
      init.pointsIssuedMTD > 0
        ? init.pointsRedeemedMTD / init.pointsIssuedMTD
        : 0;
    return init;
  }, [loyaltyResults]);

  const toggleStore = (tenantId) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) next.delete(tenantId);
      else next.add(tenantId);
      return next;
    });
  };

  const handleExport = () => {
    downloadCustomerIntelligenceCsv({
      members,
      loyaltyResults,
      groupName,
    });
  };

  const allErrored =
    loyaltyResults.length > 0 &&
    loyaltyResults.every((r) => r.cohortErr && r.pointsErr);

  // ── Loading state ────────────────────────────────────────────────────────
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
        Loading customer intelligence…
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  // ── Empty state: no members ──────────────────────────────────────────────
  if (!members.length) {
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

  // ── Section 1: 4 KPI tiles ───────────────────────────────────────────────
  const activeRateColour =
    networkTotals.totalMembers === 0
      ? T.ink900
      : networkTotals.activeRate >= ACTIVE_SUCCESS_THRESHOLD
        ? T.successText
        : networkTotals.activeRate >= ACTIVE_WARNING_THRESHOLD
          ? T.warningText
          : T.dangerText;

  const redemptionColour =
    networkTotals.pointsIssuedMTD === 0
      ? T.ink900
      : networkTotals.networkRedemptionRate < REDEMPTION_DANGER_THRESHOLD
        ? T.dangerText
        : T.ink900;

  const atRiskColour =
    networkTotals.atRiskMembers > 0 ? T.warningText : T.ink900;

  // Tile 1 sub-label — per-store breakdown, one line per store
  const totalMembersSubLines = members.map((m, idx) => {
    const r = loyaltyResults[idx];
    const count = r?.totalMembers ?? 0;
    return `${truncate(m.tenants?.name, 24)}: ${count.toLocaleString("en-ZA")}`;
  });

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
            Customer Intelligence · {groupName}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: T.text.sm,
              color: T.ink600,
            }}
          >
            Network-wide loyalty health, tier distribution, and churn signals.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || allErrored || loyaltyResults.length === 0}
          style={{
            padding: `${T.pad.xs}px ${T.pad.sm}px`,
            borderRadius: T.radius.md,
            border: `1px solid ${T.border}`,
            background: T.surface,
            color: T.ink700,
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
            cursor:
              loading || allErrored || loyaltyResults.length === 0
                ? "not-allowed"
                : "pointer",
            opacity:
              loading || allErrored || loyaltyResults.length === 0 ? 0.5 : 1,
            fontFamily: T.font,
            whiteSpace: "nowrap",
          }}
          title="Download customer intelligence summary as CSV"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* ── Partial-error notice (some stores unavailable) ─────────────── */}
      {networkTotals.storesErrored > 0 && (
        <div
          style={{
            background: T.warningLight,
            border: `1px solid ${T.warningBorder}`,
            borderRadius: T.radius.md,
            padding: T.inset.card,
            color: T.warningText,
            fontSize: T.text.sm,
          }}
        >
          {networkTotals.storesErrored} store
          {networkTotals.storesErrored === 1 ? "" : "s"} excluded — data
          unavailable. Network totals below reflect resolved stores only.
        </div>
      )}

      {/* ── Section 1: Network Customer Summary (4 KPI tiles) ──────────── */}
      <section>
        <div style={sectionLabelStyle}>Network Customer Summary</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: T.page.cardGap,
          }}
        >
          <KpiTile
            label="Total Members"
            value={fmtInt(networkTotals.totalMembers)}
            subLines={totalMembersSubLines}
          />
          <KpiTile
            label="Active This Month"
            value={fmtInt(networkTotals.activeMembers)}
            valueColor={activeRateColour}
            sub={
              networkTotals.totalMembers > 0
                ? `${(networkTotals.activeRate * 100).toFixed(1)}% of network`
                : "No members yet"
            }
          />
          <KpiTile
            label="At-Risk"
            value={fmtInt(networkTotals.atRiskMembers)}
            valueColor={atRiskColour}
            sub="31–60 days no purchase"
          />
          <KpiTile
            label="Points Economy"
            value={`${fmtInt(networkTotals.pointsRedeemedMTD)} / ${fmtInt(
              networkTotals.pointsIssuedMTD,
            )}`}
            valueColor={redemptionColour}
            sub={
              networkTotals.pointsIssuedMTD > 0
                ? `${(networkTotals.networkRedemptionRate * 100).toFixed(1)}% redemption rate`
                : "No points issued this month"
            }
          />
        </div>
      </section>

      {/* ── Section 2: Tier distribution by store ──────────────────────── */}
      <section>
        <div style={sectionLabelStyle}>Loyalty Tier Distribution by Store</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: T.page.cardGap,
          }}
        >
          {members.map((m, idx) => {
            const r = loyaltyResults[idx];
            const badge =
              INDUSTRY_BADGE[m.tenants?.industry_profile] || {
                bg: T.neutralLight,
                fg: T.neutralText,
                label: m.tenants?.industry_profile || "Unknown",
              };
            return (
              <StoreTierCard
                key={m.tenant_id}
                name={m.tenants?.name || "Unnamed store"}
                badge={badge}
                loyalty={r}
                isSelf={idx === 0}
              />
            );
          })}
        </div>
      </section>

      {/* ── Section 3: Cohort health by store ──────────────────────────── */}
      <section>
        <div style={sectionLabelStyle}>Cohort Health by Store</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: T.gap.lg,
          }}
        >
          {members.map((m, idx) => {
            const r = loyaltyResults[idx];
            const isExpanded = expandedStores.has(m.tenant_id);
            return (
              <CohortHealthCard
                key={m.tenant_id}
                name={m.tenants?.name || "Unnamed store"}
                loyalty={r}
                isExpanded={isExpanded}
                onToggle={() => toggleStore(m.tenant_id)}
              />
            );
          })}
        </div>
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
          Customer Intelligence data notes
        </div>
        · Cohort windows use the store&apos;s local date (Africa/Johannesburg).
        Members near window boundaries may shift cohort on day-of.
        <br />· &quot;Active&quot; = at least one order linked to this loyalty
        member in the last 30 days. Walk-in sales not linked to a loyalty
        account are excluded.
        <br />· Points economy reflects loyalty_transactions only. Manual admin
        adjustments are included; POS-voided transactions depend on whether a
        reversal entry exists.
        <br />· Tier distribution is a live snapshot. Historical tier movement
        requires loyalty_ai_log tier_upgrade tracking (Session 2 roadmap).
        <br />· Campaign ROI (Section 4) is deferred — the loyalty_campaigns
        table does not exist in the current schema.
        <br />· AI Engine Activity (Section 5) will read loyalty_ai_log in
        Session 2. Live action types: churn_rescue, birthday_bonus,
        stock_boost_suggestion.
        <br />· <strong>POPIA:</strong> no individual customer data is
        displayed in the Group Portal. Aggregate counts only — full names,
        emails, and phone numbers are never fetched from the database by
        this view.
      </div>
    </div>
  );
}

// ─── KPI tile helper ───────────────────────────────────────────────────────
function KpiTile({ label, value, sub, subLines, valueColor }) {
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
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: T.text.xs, color: T.ink600 }}>{sub}</div>
      )}
      {subLines && subLines.length > 0 && (
        <div
          style={{
            fontSize: T.text.xs,
            color: T.ink600,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            marginTop: T.gap.xs,
          }}
        >
          {subLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Store tier card (Section 2) ───────────────────────────────────────────
function StoreTierCard({ name, badge, loyalty, isSelf }) {
  const total = loyalty?.totalMembers || 0;
  const breakdown = loyalty?.tierBreakdown || [];

  // Order tiers for bar rendering — canonical order first, then any extras.
  const orderedBreakdown = [...breakdown].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(a.tierName);
    const bi = TIER_ORDER.indexOf(b.tierName);
    if (ai === -1 && bi === -1) return a.tierName.localeCompare(b.tierName);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const errored = !!loyalty?.cohortErr;

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

      {errored ? (
        <div
          style={{
            fontSize: T.text.sm,
            color: T.dangerText,
            background: T.dangerLight,
            border: `1px solid ${T.dangerBorder}`,
            borderRadius: T.radius.sm,
            padding: T.inset.card,
          }}
        >
          Loyalty data unavailable
        </div>
      ) : total === 0 ? (
        <div
          style={{
            fontSize: T.text.sm,
            color: T.ink600,
            lineHeight: 1.5,
          }}
        >
          No loyalty members yet · Programme may not be active at this store
        </div>
      ) : (
        <>
          <div style={{ fontSize: T.text.sm, color: T.ink700 }}>
            Total: <strong>{fmtInt(total)}</strong> member
            {total !== 1 ? "s" : ""}
          </div>

          {/* Tier bar — horizontal segments proportional to tier count */}
          <div
            style={{
              display: "flex",
              height: 10,
              borderRadius: T.radius.full,
              overflow: "hidden",
              background: T.neutralLight,
            }}
          >
            {orderedBreakdown.map((t) => {
              const width = (t.count / total) * 100;
              return (
                <div
                  key={t.tierName}
                  title={`${TIER_LABEL[t.tierName] || t.tierName}: ${t.count}`}
                  style={{
                    width: `${width}%`,
                    background:
                      TIER_PALETTE[t.tierName] || TIER_PALETTE.unassigned,
                  }}
                />
              );
            })}
          </div>

          {/* Tier legend rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: T.gap.xs,
            }}
          >
            {orderedBreakdown.map((t) => (
              <div
                key={t.tierName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: T.text.sm,
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
                      width: 10,
                      height: 10,
                      borderRadius: T.radius.full,
                      background:
                        TIER_PALETTE[t.tierName] || TIER_PALETTE.unassigned,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ color: T.ink700 }}>
                    {TIER_LABEL[t.tierName] || t.tierName}
                  </span>
                </div>
                <span
                  style={{
                    color: T.ink900,
                    fontWeight: T.weight.semibold,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.count} ({((t.count / total) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Cohort health card (Section 3) ────────────────────────────────────────
function CohortHealthCard({ name, loyalty, isExpanded, onToggle }) {
  const total = loyalty?.totalMembers || 0;
  const atRisk = loyalty?.atRiskMembers || 0;
  const lapsed = loyalty?.lapsedMembers || 0;
  const active = loyalty?.activeMembers || 0;
  const dormant = loyalty?.dormantMembers || 0;
  const newCount = loyalty?.newThisMonth || 0;
  const highRisk = loyalty?.highChurnRiskMembers || 0;
  const errored = !!loyalty?.cohortErr;

  const churnSignals = atRisk + lapsed;
  const allClear = !errored && total > 0 && churnSignals === 0;

  // Collapsed header variant
  const headerContent = errored ? (
    <span style={{ color: T.dangerText }}>Data unavailable</span>
  ) : total === 0 ? (
    <span style={{ color: T.ink600 }}>No loyalty members yet</span>
  ) : allClear ? (
    <span style={{ color: T.successText }}>
      ✓ All {total} member{total !== 1 ? "s" : ""} active or new
    </span>
  ) : (
    <span style={{ color: T.ink700 }}>
      {atRisk > 0 && (
        <span style={{ color: T.warningText, fontWeight: T.weight.semibold }}>
          {atRisk} at-risk
        </span>
      )}
      {atRisk > 0 && lapsed > 0 && " · "}
      {lapsed > 0 && (
        <span style={{ color: T.dangerText, fontWeight: T.weight.semibold }}>
          {lapsed} lapsed
        </span>
      )}
      {churnSignals === 0 && (
        <span style={{ color: T.ink600 }}>No churn signals</span>
      )}
    </span>
  );

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: T.inset.card,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: T.gap.md,
          cursor: "pointer",
          fontFamily: T.font,
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: T.gap.md,
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: T.text.xs,
              color: T.ink400,
              width: 14,
              display: "inline-block",
            }}
          >
            {isExpanded ? "▼" : "▶"}
          </span>
          <span
            style={{
              fontSize: T.text.base,
              fontWeight: T.weight.semibold,
              color: T.ink900,
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontSize: T.text.xs,
              color: T.ink400,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            —
          </span>
          <span style={{ fontSize: T.text.sm }}>{headerContent}</span>
        </div>
      </button>

      {isExpanded && !errored && total > 0 && (
        <div
          style={{
            padding: T.inset.card,
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            gap: T.gap.md,
          }}
        >
          {/* Cohort breakdown table */}
          <div>
            <CohortRow
              label="New this month"
              definition="First joined in the last 30 days"
              count={newCount}
              total={total}
              bg={T.successLight}
              accent={T.successText}
            />
            <CohortRow
              label="Active"
              definition="Purchased in the last 30 days"
              count={active}
              total={total}
              bg="transparent"
              accent={T.ink900}
            />
            <CohortRow
              label="At-risk"
              definition="No purchase in 31–60 days"
              count={atRisk}
              total={total}
              bg={T.warningLight}
              accent={T.warningText}
              extraRight={
                highRisk > 0 ? (
                  <span
                    style={{
                      fontSize: T.text.xs,
                      color: T.dangerText,
                      marginLeft: T.gap.sm,
                    }}
                    title="Members with churn_risk_score ≥ 0.5 from the nightly AI engine"
                  >
                    · {highRisk} high-risk
                  </span>
                ) : null
              }
            />
            <CohortRow
              label="Lapsed"
              definition="No purchase in 60+ days"
              count={lapsed}
              total={total}
              bg={T.dangerLight}
              accent={T.dangerText}
            />
            <CohortRow
              label="Dormant"
              definition="Joined but never purchased"
              count={dormant}
              total={total}
              bg="transparent"
              accent={T.ink600}
            />
          </div>

          {/* Proportional cohort bar */}
          <CohortBar
            segments={[
              { key: "new", count: newCount, color: T.successText },
              { key: "active", count: active, color: T.accent },
              { key: "at_risk", count: atRisk, color: T.warningText },
              { key: "lapsed", count: lapsed, color: T.dangerText },
              { key: "dormant", count: dormant, color: T.ink400 },
            ]}
            total={total}
          />

          {/* Churn insight line — static rules per spec */}
          <ChurnInsightLine
            atRisk={atRisk}
            lapsed={lapsed}
            dormant={dormant}
            total={total}
          />
        </div>
      )}
    </div>
  );
}

function CohortRow({ label, definition, count, total, bg, accent, extraRight }) {
  return (
    <div
      title={definition}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${T.pad.sm}px ${T.pad.md}px`,
        borderRadius: T.radius.sm,
        background: bg,
        marginBottom: T.gap.xs,
        fontSize: T.text.sm,
      }}
    >
      <span style={{ color: T.ink700 }}>{label}</span>
      <span
        style={{
          color: accent,
          fontWeight: T.weight.semibold,
          fontVariantNumeric: "tabular-nums",
          display: "flex",
          alignItems: "center",
        }}
      >
        {fmtInt(count)}{" "}
        <span
          style={{
            color: T.ink400,
            fontWeight: T.weight.medium,
            marginLeft: T.gap.xs,
          }}
        >
          {fmtPctOfTotal(count, total)}
        </span>
        {extraRight}
      </span>
    </div>
  );
}

function CohortBar({ segments, total }) {
  if (!total) return null;
  // Minimum width 2% so tiny cohorts stay visible per spec.
  const MIN_PCT = 2;
  const rawSegments = segments.map((s) => ({
    ...s,
    rawPct: (s.count / total) * 100,
  }));
  // First pass — apply minimum widths to non-zero segments. We overshoot
  // 100% when multiple small segments exist, then normalise in a second
  // pass so the bar still sums to 100%.
  const withMin = rawSegments.map((s) => ({
    ...s,
    displayPct:
      s.count === 0 ? 0 : Math.max(s.rawPct, MIN_PCT),
  }));
  const totalDisplay = withMin.reduce((a, b) => a + b.displayPct, 0);
  const normalised =
    totalDisplay > 0
      ? withMin.map((s) => ({ ...s, displayPct: (s.displayPct / totalDisplay) * 100 }))
      : withMin;

  return (
    <div
      style={{
        display: "flex",
        height: 12,
        borderRadius: T.radius.full,
        overflow: "hidden",
        background: T.neutralLight,
      }}
    >
      {normalised.map((s) => (
        <div
          key={s.key}
          title={`${s.key}: ${s.count}`}
          style={{
            width: `${s.displayPct}%`,
            background: s.color,
          }}
        />
      ))}
    </div>
  );
}

function ChurnInsightLine({ atRisk, lapsed, dormant, total }) {
  if (!total) return null;
  const churnSignals = atRisk + lapsed;
  const churnFraction = churnSignals / total;
  const dormantFraction = dormant / total;

  let text = null;
  let color = T.ink600;

  if (churnSignals === 0) {
    text = "✓ No churn signals detected in this window";
    color = T.successText;
  } else if (churnFraction > CHURN_SIGNAL_THRESHOLD) {
    const pct = (churnFraction * 100).toFixed(0);
    text = `⚠ ${pct}% of members show churn signals — consider loyalty-ai rescue campaign`;
    color = T.warningText;
  } else if (dormantFraction > DORMANT_ACTIVATION_THRESHOLD) {
    const pct = (dormantFraction * 100).toFixed(0);
    text = `ℹ ${pct}% of members have never purchased — activation campaign opportunity`;
    color = T.ink600;
  } else {
    // Low-level churn — neither urgent nor clean. Still state it.
    const pct = (churnFraction * 100).toFixed(0);
    text = `${pct}% of members show churn signals · below rescue threshold`;
    color = T.ink600;
  }

  return (
    <div
      style={{
        fontSize: T.text.xs,
        color,
        fontStyle: "italic",
        lineHeight: 1.5,
      }}
    >
      {text}
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
