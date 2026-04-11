// src/components/group/_helpers/fetchNetworkIntelligence.js
// WP-ANALYTICS-6 Session 1 — Network Intelligence aggregator
//
// ARCHITECTURAL DECISION (from WP-ANALYTICS-6.md): this helper is an
// AGGREGATOR, not a new data fetcher. It calls three existing sibling
// helpers in parallel and synthesises network-level intelligence from
// their results. NO new Supabase queries are written here. If a metric
// already exists in fetchStoreSummary / fetchStoreInventory /
// fetchStoreLoyalty, we use it. If the data genuinely does not exist
// anywhere else, we stop and ask.
//
// Parallel pattern — 3 × N queries (where N = member count) dispatched
// as a single Promise.all over three Promise.all calls. For the current
// Medi Can Franchise Network (2 stores) that is 6 parallel queries —
// trivial. Each inner family runs in lock-step across stores.
//
// Phase 1: parallel data fetch via 3 helper families
// Phase 2: per-store health score derivation (client-side)
// Phase 3: alert generation (client-side, severity-sorted)
// Phase 4: royalty calculation (client-side arithmetic)
//
// Contract: never throws. Partial failures (one helper fails for one
// store) populate store.{summary,inventory,loyalty}.err and the store
// still renders with available data. Health score excludes any
// dimension whose source data is unavailable and scales the
// denominator proportionally — data quality guard against artificially
// inflated scores.
//
// Step 0 (WP-A6) verified 12 April 2026:
// - tenant_groups.royalty_percentage exists, type numeric
// - tenant_group_members.role is text, values 'franchisor' and 'franchisee'
// - Medi Can Franchise Network royalty_percentage = 0.00 — Section 3
//   of NetworkIntelligence renders the "configure" note path correctly
// - No new network-analytics tables have appeared (network_alerts,
//   network_scores, franchise_fees, royalty_ledger, compliance_log all
//   absent) — confirms the no-persistence, client-side-only design

import { fetchStoreSummary } from "./fetchStoreSummary";
import { fetchStoreInventory } from "./fetchStoreInventory";
import { fetchStoreLoyalty } from "./fetchStoreLoyalty";

// ─── Health score constants (each dimension 0-20, total 0-100) ────────────
//
// Linear interpolation between zeroValue and fullValue. For "higher is
// better" dimensions fullValue > zeroValue; for "lower is better"
// fullValue < zeroValue. The scoreBand helper handles both cases.

const REVENUE_MOM_FULL_PCT = 10; // ≥ +10% MoM → full 20
const REVENUE_MOM_ZERO_PCT = -20; // ≤ -20% MoM → 0

const STOCK_OUT_FULL_PCT = 0; // 0% out of stock → full 20
const STOCK_OUT_ZERO_PCT = 10; // ≥ 10% out of stock → 0

const DEAD_STOCK_FULL_PCT = 0; // 0% dead stock value → full 20
const DEAD_STOCK_ZERO_PCT = 15; // ≥ 15% dead stock value → 0

const ACTIVE_RATE_FULL_PCT = 80; // ≥ 80% active → full 20
const ACTIVE_RATE_ZERO_PCT = 20; // ≤ 20% active → 0

const REDEMPTION_FULL_PCT = 20; // ≥ 20% redemption → full 20
const REDEMPTION_ZERO_PCT = 0; // 0% redemption → 0

const MAX_DIMENSION_SCORE = 20;
const FULL_NETWORK_SCORE = 100;

// ─── Alert thresholds (from WP-ANALYTICS-6.md spec) ────────────────────────

const AT_RISK_CRITICAL_RATIO = 0.3; // > 30% at-risk → critical
const DEAD_STOCK_WARNING_RATIO = 0.1; // > 10% dead stock value → warning
const MARGIN_WARNING_PCT = 50; // < 50% margin → warning
const REDEMPTION_WARNING_RATIO = 0.05; // < 5% redemption → warning
const REVENUE_MOM_WARNING_PCT = -20; // < -20% MoM revenue → warning
const DORMANT_INFO_RATIO = 0.2; // > 20% dormant → info

// ─── Severity ordering ─────────────────────────────────────────────────────

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

/**
 * fetchNetworkIntelligence
 *
 * @param {Array} members — from GroupPortal, each with tenant_id,
 *   tenants.name, tenants.industry_profile, role
 * @param {object} groupMeta — { royaltyPct, groupName } from GroupPortal
 * @param {object} options — { monthStartISO, monthEndISO,
 *   lastMonthStartISO, lastMonthEndISO }
 * @returns {Promise<NetworkResult>}
 */
export async function fetchNetworkIntelligence(
  members,
  groupMeta,
  options = {},
) {
  const {
    monthStartISO,
    monthEndISO,
    lastMonthStartISO,
    lastMonthEndISO,
  } = options;
  const royaltyPct = parseFloat(groupMeta?.royaltyPct) || 0;

  // Empty-network guard — return an empty network shape without firing
  // any helpers. Matches the pattern used in NetworkDashboard.
  if (!members || members.length === 0) {
    return {
      stores: [],
      network: {
        totalAlerts: 0,
        criticalCount: 0,
        warningCount: 0,
        avgHealthScore: null,
        topAlert: null,
        royaltyDueMTD: 0,
      },
      err: null,
    };
  }

  // ── Phase 1: parallel helper fetches ────────────────────────────────────
  // Three families run in parallel via a single outer Promise.all. Each
  // family is itself a Promise.all across the member stores, so the
  // effective parallelism is 3 × N simultaneous queries. Errors land
  // inside the per-store result objects (each helper is non-throwing by
  // contract) rather than rejecting the outer Promise.
  const [summaryResults, inventoryResults, loyaltyResults] =
    await Promise.all([
      Promise.all(
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
      ),
      Promise.all(
        members.map((m) =>
          fetchStoreInventory(m.tenant_id, m.tenants?.industry_profile, {
            includeVelocity: true,
          }),
        ),
      ),
      Promise.all(
        members.map((m) =>
          fetchStoreLoyalty(m.tenant_id, {
            monthStartISO,
            monthEndISO,
          }),
        ),
      ),
    ]);

  // ── Phase 2–4: per-store synthesis ──────────────────────────────────────
  const stores = members.map((member, i) => {
    const summary = summaryResults[i];
    const inventory = inventoryResults[i];
    const loyalty = loyaltyResults[i];

    const {
      healthScore,
      scoreExclusions,
      dimensionScores,
    } = computeHealthScore(summary, inventory, loyalty);

    const alerts = buildAlerts(member, summary, inventory, loyalty);

    // Royalty calculation — franchisees only. Franchisor does not owe
    // royalties to themselves. Zero royaltyPct produces zero royalty
    // (correctly — the Section 3 render surfaces the "configure" note
    // in this case).
    const isFranchisee = member.role === "franchisee";
    const royaltyMTD = isFranchisee
      ? (summary?.revenue || 0) * (royaltyPct / 100)
      : 0;
    const royaltyLastMonth = isFranchisee
      ? (summary?.revenueLastMonth || 0) * (royaltyPct / 100)
      : 0;

    return {
      member,
      summary,
      inventory,
      loyalty,
      healthScore,
      scoreExclusions,
      dimensionScores,
      royaltyMTD,
      royaltyLastMonth,
      alerts,
    };
  });

  // ── Network-level aggregates ────────────────────────────────────────────
  const allAlerts = stores.flatMap((s) => s.alerts);
  // Severity + impact sort in one pass — spread into a new array first
  // so we don't mutate any store's alerts[] reference.
  const sortedAlerts = [...allAlerts].sort(alertSortFn);

  const criticalCount = allAlerts.filter(
    (a) => a.severity === "critical",
  ).length;
  const warningCount = allAlerts.filter(
    (a) => a.severity === "warning",
  ).length;

  const storesWithScore = stores.filter((s) => s.healthScore != null);
  const avgHealthScore =
    storesWithScore.length > 0
      ? Math.round(
          storesWithScore.reduce((sum, s) => sum + s.healthScore, 0) /
            storesWithScore.length,
        )
      : null;

  const topAlert = sortedAlerts[0] || null;

  const royaltyDueMTD = stores.reduce(
    (sum, s) => sum + (s.royaltyMTD || 0),
    0,
  );

  return {
    stores,
    network: {
      totalAlerts: allAlerts.length,
      criticalCount,
      warningCount,
      avgHealthScore,
      topAlert,
      royaltyDueMTD,
      sortedAlerts,
    },
    err: null,
  };
}

// ─── Health score helpers ──────────────────────────────────────────────────

/**
 * Linear band scoring. Maps a value between zeroValue and fullValue to
 * a score in [0, MAX_DIMENSION_SCORE]. Handles both directions: when
 * fullValue > zeroValue the dimension is "higher is better" (e.g.
 * active rate), when fullValue < zeroValue it is "lower is better"
 * (e.g. out-of-stock percentage).
 */
function scoreBand(value, zeroValue, fullValue) {
  if (value == null || Number.isNaN(value)) return null;

  if (fullValue > zeroValue) {
    // Higher is better
    if (value >= fullValue) return MAX_DIMENSION_SCORE;
    if (value <= zeroValue) return 0;
    return Math.round(
      ((value - zeroValue) / (fullValue - zeroValue)) *
        MAX_DIMENSION_SCORE,
    );
  }
  // Lower is better (fullValue < zeroValue)
  if (value <= fullValue) return MAX_DIMENSION_SCORE;
  if (value >= zeroValue) return 0;
  return Math.round(
    ((zeroValue - value) / (zeroValue - fullValue)) *
      MAX_DIMENSION_SCORE,
  );
}

/**
 * computeHealthScore — per-store 5-dimension scoring with exclusions.
 *
 * Any dimension whose source data is unavailable is excluded from both
 * the numerator and the denominator. A store with only 3 dimensions
 * available is scored against 3×20=60 max and scaled up to 100 so it's
 * comparable to a store with all 5 dimensions. This is the data quality
 * guard from the spec — we never inflate a score by treating a missing
 * dimension as zero, and we never deflate it by treating a missing
 * dimension as full marks.
 */
function computeHealthScore(summary, inventory, loyalty) {
  const dimensionScores = {};
  const scoreExclusions = [];

  // Dimension 1: Revenue trend (MoM SSSG %)
  if (
    summary?.err ||
    summary?.revenue == null ||
    summary?.revenueLastMonth == null ||
    summary.revenueLastMonth === 0
  ) {
    scoreExclusions.push("Revenue trend");
  } else {
    const momPct =
      ((summary.revenue - summary.revenueLastMonth) /
        summary.revenueLastMonth) *
      100;
    const score = scoreBand(
      momPct,
      REVENUE_MOM_ZERO_PCT,
      REVENUE_MOM_FULL_PCT,
    );
    if (score != null) dimensionScores.revenueTrend = score;
    else scoreExclusions.push("Revenue trend");
  }

  // Dimension 2: Stock health (out-of-stock % of total)
  const stockTotal = inventory?.summary?.total || 0;
  if (inventory?.err || stockTotal === 0) {
    scoreExclusions.push("Stock health");
  } else {
    const outPct =
      ((inventory.summary.outOfStock || 0) / stockTotal) * 100;
    const score = scoreBand(
      outPct,
      STOCK_OUT_ZERO_PCT,
      STOCK_OUT_FULL_PCT,
    );
    if (score != null) dimensionScores.stockHealth = score;
    else scoreExclusions.push("Stock health");
  }

  // Dimension 3: Dead stock (dead stock value as % of inventory value)
  const totalValue = inventory?.summary?.totalValue || 0;
  if (inventory?.err || totalValue === 0) {
    scoreExclusions.push("Dead stock");
  } else {
    const deadPct =
      ((inventory.summary.deadStockValue || 0) / totalValue) * 100;
    const score = scoreBand(
      deadPct,
      DEAD_STOCK_ZERO_PCT,
      DEAD_STOCK_FULL_PCT,
    );
    if (score != null) dimensionScores.deadStock = score;
    else scoreExclusions.push("Dead stock");
  }

  // Dimension 4: Customer retention (active member rate)
  const totalMembers = loyalty?.totalMembers || 0;
  if (loyalty?.cohortErr || totalMembers === 0) {
    scoreExclusions.push("Customer retention");
  } else {
    const activePct =
      ((loyalty.activeMembers || 0) / totalMembers) * 100;
    const score = scoreBand(
      activePct,
      ACTIVE_RATE_ZERO_PCT,
      ACTIVE_RATE_FULL_PCT,
    );
    if (score != null) dimensionScores.customerRetention = score;
    else scoreExclusions.push("Customer retention");
  }

  // Dimension 5: Loyalty engagement (points redemption rate)
  if (loyalty?.pointsErr || (loyalty?.pointsIssuedMTD || 0) === 0) {
    scoreExclusions.push("Loyalty engagement");
  } else {
    const redemptionPct = (loyalty.redemptionRate || 0) * 100;
    const score = scoreBand(
      redemptionPct,
      REDEMPTION_ZERO_PCT,
      REDEMPTION_FULL_PCT,
    );
    if (score != null) dimensionScores.loyaltyEngagement = score;
    else scoreExclusions.push("Loyalty engagement");
  }

  // Scale to 0-100 based on available dimensions only
  const dimensionKeys = Object.keys(dimensionScores);
  if (dimensionKeys.length === 0) {
    return {
      healthScore: null,
      scoreExclusions,
      dimensionScores,
    };
  }
  const sumAvailable = dimensionKeys.reduce(
    (sum, k) => sum + dimensionScores[k],
    0,
  );
  const maxAvailable = dimensionKeys.length * MAX_DIMENSION_SCORE;
  const healthScore = Math.round(
    (sumAvailable / maxAvailable) * FULL_NETWORK_SCORE,
  );

  return { healthScore, scoreExclusions, dimensionScores };
}

// ─── Alert generation ──────────────────────────────────────────────────────

/**
 * buildAlerts — traverses one store's helper results and emits a
 * flat list of severity-tagged alerts. The impact field drives the
 * secondary sort inside a severity bucket (larger impact → higher
 * rank). Impact values are comparable within a severity tier only.
 */
function buildAlerts(member, summary, inventory, loyalty) {
  const alerts = [];
  const storeId = member.tenant_id;
  const storeName = member.tenants?.name || "Unnamed store";

  // ── Critical ──────────────────────────────────────────────────────────
  const criticalRestock = inventory?.summary?.criticalRestock || 0;
  if (criticalRestock > 0) {
    alerts.push({
      storeId,
      storeName,
      severity: "critical",
      module: "stock",
      signal: "Critical restock",
      detail: `${criticalRestock} item${criticalRestock !== 1 ? "s" : ""} with less than 7 days of stock`,
      action: "stock",
      impact: criticalRestock,
    });
  }

  const sellingWithNoStock = inventory?.summary?.sellingWithNoStock || 0;
  if (sellingWithNoStock > 0) {
    alerts.push({
      storeId,
      storeName,
      severity: "critical",
      module: "stock",
      signal: "Selling with no stock",
      detail: `${sellingWithNoStock} item${sellingWithNoStock !== 1 ? "s" : ""} active at the POS but out of stock on hand`,
      action: "stock",
      impact: sellingWithNoStock,
    });
  }

  const totalMembers = loyalty?.totalMembers || 0;
  const atRiskMembers = loyalty?.atRiskMembers || 0;
  if (
    totalMembers > 0 &&
    atRiskMembers > totalMembers * AT_RISK_CRITICAL_RATIO
  ) {
    const pct = Math.round((atRiskMembers / totalMembers) * 100);
    alerts.push({
      storeId,
      storeName,
      severity: "critical",
      module: "customers",
      signal: "Churn risk",
      detail: `${atRiskMembers} members (${pct}% of base) at churn risk — no purchase in 31–60 days`,
      action: "customers",
      impact: atRiskMembers,
    });
  }

  // ── Warning ───────────────────────────────────────────────────────────
  const totalValue = inventory?.summary?.totalValue || 0;
  const deadStockValue = inventory?.summary?.deadStockValue || 0;
  if (
    totalValue > 0 &&
    deadStockValue > totalValue * DEAD_STOCK_WARNING_RATIO
  ) {
    const pct = (deadStockValue / totalValue) * 100;
    alerts.push({
      storeId,
      storeName,
      severity: "warning",
      module: "stock",
      signal: "Dead stock capital",
      detail: `${pct.toFixed(1)}% of inventory capital (R${Math.round(deadStockValue).toLocaleString("en-ZA")}) tied up in dead stock`,
      action: "stock",
      impact: pct,
    });
  }

  const stockMargin = summary?.stockMarginPct;
  if (stockMargin != null && stockMargin < MARGIN_WARNING_PCT) {
    alerts.push({
      storeId,
      storeName,
      severity: "warning",
      module: "financials",
      signal: "Low gross margin",
      detail: `Stock margin ${stockMargin.toFixed(1)}% is below the 50% healthy threshold`,
      action: "financials",
      impact: MARGIN_WARNING_PCT - stockMargin,
    });
  }

  const redemptionRate = loyalty?.redemptionRate || 0;
  const pointsIssued = loyalty?.pointsIssuedMTD || 0;
  if (pointsIssued > 0 && redemptionRate < REDEMPTION_WARNING_RATIO) {
    alerts.push({
      storeId,
      storeName,
      severity: "warning",
      module: "customers",
      signal: "Points accumulating",
      detail: `${(redemptionRate * 100).toFixed(1)}% redemption this month — members earning but not spending points`,
      action: "customers",
      impact: REDEMPTION_WARNING_RATIO - redemptionRate,
    });
  }

  const revCurr = summary?.revenue;
  const revPrior = summary?.revenueLastMonth;
  if (revCurr != null && revPrior != null && revPrior > 0) {
    const momPct = ((revCurr - revPrior) / revPrior) * 100;
    if (momPct < REVENUE_MOM_WARNING_PCT) {
      alerts.push({
        storeId,
        storeName,
        severity: "warning",
        module: "revenue",
        signal: "Revenue decline",
        detail: `Revenue down ${Math.abs(momPct).toFixed(1)}% vs prior month`,
        action: "revenue",
        impact: Math.abs(momPct),
      });
    }
  }

  // ── Info ──────────────────────────────────────────────────────────────
  const needsReorder = inventory?.summary?.needsReorder || 0;
  if (needsReorder > 0) {
    alerts.push({
      storeId,
      storeName,
      severity: "info",
      module: "stock",
      signal: "Reorder needed",
      detail: `${needsReorder} item${needsReorder !== 1 ? "s" : ""} flagged for reorder`,
      action: "stock",
      impact: needsReorder,
    });
  }

  const dormantMembers = loyalty?.dormantMembers || 0;
  if (
    totalMembers > 0 &&
    dormantMembers > totalMembers * DORMANT_INFO_RATIO
  ) {
    const pct = Math.round((dormantMembers / totalMembers) * 100);
    alerts.push({
      storeId,
      storeName,
      severity: "info",
      module: "customers",
      signal: "Dormant members",
      detail: `${pct}% of members have never purchased — activation opportunity`,
      action: "customers",
      impact: dormantMembers,
    });
  }

  return alerts;
}

/**
 * alertSortFn — severity first (critical → warning → info), then by
 * impact DESC inside each severity bucket. Impact scales differ between
 * alert types (item count vs percentage vs raw delta), so the
 * comparison is only meaningful inside the same bucket — but that's
 * exactly how the spec expects it to be used.
 */
function alertSortFn(a, b) {
  const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (sevDiff !== 0) return sevDiff;
  return (b.impact || 0) - (a.impact || 0);
}
