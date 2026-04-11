// src/components/group/_helpers/fetchStoreLoyalty.js
// WP-ANALYTICS-5 Session 1 — per-store loyalty cohort + points economy fetcher
//
// Returns a normalised per-store loyalty result with cohort classifications
// derived client-side from one user_profiles query and point flows derived
// from one loyalty_transactions query. Both queries run in parallel via
// Promise.all with independent error isolation — a failure on one side
// still renders the other side of the card.
//
// STEP 0 SCHEMA NOTES (verified 12 Apr 2026 via Supabase MCP) — the
// WP-ANALYTICS-5 spec referred to tables that do not exist in the live DB.
// Actual schema used:
//   customers           → does not exist; use user_profiles instead
//   loyalty_tiers       → does not exist; tiers are inline TEXT in
//                          user_profiles.loyalty_tier (bronze, silver, gold,
//                          platinum, harvest_club). Per-tenant thresholds and
//                          multipliers live in loyalty_config (not queried
//                          by this helper — UI palette handles tier display)
//   loyalty_campaigns   → does not exist; S2 Section 4 is permanently
//                          deferred until a schema owner adds the table
//   ai_action_logs      → actual name is loyalty_ai_log with columns
//                          (tenant_id, action_type, target_user_id, outcome,
//                          created_at). Action types live: churn_rescue,
//                          birthday_bonus, stock_boost_suggestion (not
//                          stock_boost). Used by S2 Section 5 only.
//   loyalty_transactions→ exists; user_id (not customer_id). transaction_type
//                          values in the wild include BOTH legacy uppercase
//                          (BONUS, EARNED, PURCHASE, REDEEMED) and newer
//                          lowercase (earn_purchase). Classification uses
//                          the sign of points as the authoritative signal —
//                          positive = earn, negative = redeem — and only
//                          falls back to the transaction_type string when
//                          points is zero (rare edge case).
//
// POPIA (load-bearing for Module 5): the user_profiles table stores PII
// (email, phone, full_name, date_of_birth, street_address, suburb,
// postal_code). This helper MUST NOT SELECT any of those columns. The
// authorised projection is exactly eight columns and no more:
//   id, tenant_id, loyalty_points, loyalty_tier, created_at,
//   last_purchase_at, is_suspended, churn_risk_score
// No individual customer identity leaves the database via the Group Portal.
// Aggregate counts and cohort distributions only. The S2 Top Customers
// section will derive initials from full_name server-side-limited to a
// two-character projection only — that work happens in S2, not here.
//
// Cohort semantics (derived client-side — never in SQL to avoid TZ drift):
//   isNew      — created_at within the MTD window (monthStartISO → now)
//   isActive   — last_purchase_at within the last 30 days
//   isAtRisk   — last_purchase_at between 31 and 60 days ago
//   isLapsed   — last_purchase_at more than 60 days ago
//   isDormant  — last_purchase_at IS NULL
// `isNew` overlaps the active/dormant buckets intentionally — a member who
// joined 5 days ago with zero purchases is both new AND dormant. The KPI
// tiles sum disjoint cohorts (active + at_risk + lapsed + dormant = total);
// the "new this month" count is reported alongside as a secondary signal
// so it never double-counts.
//
// Active customer predicate: user_profiles has NO is_active column. We use
// `is_suspended IS NOT TRUE` — suspended users are excluded from every
// cohort count because a suspended account is not a churn signal, it's an
// enforcement action. is_operator users are NOT filtered here because
// they do not carry the is_suspended flag reliably; relying on tenant_id
// scope + suspended filter is the agreed predicate for S1.
//
// Contract: never throws.
//   - Cohort query failure → cohort counts zeroed, cohortErr set
//   - Points query failure → economy fields zeroed, pointsErr set
//   - Each query is awaited independently (Promise.allSettled) so one
//     failure cannot mask the other.

import { supabase } from "../../../services/supabaseClient";

const MS_PER_DAY = 86400 * 1000;
const ACTIVE_WINDOW_DAYS = 30;
const AT_RISK_WINDOW_DAYS = 60;

/**
 * fetchStoreLoyalty
 *
 * @param {string} tenantId
 * @param {object} [options]
 * @param {string} [options.monthStartISO] — start of current month, used for
 *   the MTD points economy window and for "new this month" cohort derivation
 * @param {string} [options.monthEndISO] — end of current month (exclusive
 *   upper bound on the points economy window)
 * @param {string} [options.lastMonthStartISO] — reserved for S2 MoM comparison
 * @param {string} [options.lastMonthEndISO] — reserved for S2 MoM comparison
 * @param {boolean} [options.includeAiLogs=false] — S2 reserved. When true
 *   (S2 only), will query loyalty_ai_log for per-action_type breakdowns.
 *   Voided in S1 bodies below.
 * @param {boolean} [options.includeCampaigns=false] — S2 reserved. No table
 *   exists in the current schema; this option is documented for signature
 *   stability only and will stay a no-op even in S2 until a schema owner
 *   adds loyalty_campaigns. Voided in S1 bodies below.
 * @returns {Promise<LoyaltyResult>}
 *
 * LoyaltyResult:
 * {
 *   tenantId: string,
 *   // Cohort counts
 *   totalMembers, newThisMonth, activeMembers, atRiskMembers,
 *   lapsedMembers, dormantMembers,
 *   highChurnRiskMembers,   // count where churn_risk_score >= 0.5
 *   // Tier distribution — array, one entry per tier_name found in the cohort
 *   tierBreakdown: [{ tierName, count, pointsTotal }],
 *   // Points economy (MTD)
 *   pointsIssuedMTD, pointsRedeemedMTD, redemptionRate,
 *   // Raw trimmed cohort (POPIA-safe projection only)
 *   customers: [{
 *     id, loyaltyPoints, loyaltyTier, createdAt, lastPurchaseAt,
 *     churnRiskScore, isNew, isActive, isAtRisk, isLapsed, isDormant,
 *     daysSinceLastPurchase
 *   }],
 *   // Errors — independent so one failure does not mask the other
 *   cohortErr: string | null,
 *   pointsErr: string | null,
 * }
 */
export async function fetchStoreLoyalty(tenantId, options = {}) {
  const {
    monthStartISO,
    monthEndISO,
    // S2 options — voided so no-unused-vars does not trip. Kept on the
    // signature for stability so the Session 2 wire-up is a pure diff
    // inside this file rather than a caller-side change.
    // eslint-disable-next-line no-unused-vars
    lastMonthStartISO,
    // eslint-disable-next-line no-unused-vars
    lastMonthEndISO,
    // eslint-disable-next-line no-unused-vars
    includeAiLogs = false,
    // eslint-disable-next-line no-unused-vars
    includeCampaigns = false,
  } = options;

  const result = {
    tenantId,
    totalMembers: 0,
    newThisMonth: 0,
    activeMembers: 0,
    atRiskMembers: 0,
    lapsedMembers: 0,
    dormantMembers: 0,
    highChurnRiskMembers: 0,
    tierBreakdown: [],
    pointsIssuedMTD: 0,
    pointsRedeemedMTD: 0,
    redemptionRate: 0,
    customers: [],
    cohortErr: null,
    pointsErr: null,
  };

  // ── Parallel queries — independent error isolation via allSettled ────────
  const [cohortRes, pointsRes] = await Promise.allSettled([
    // Query 1 — cohort snapshot. POPIA-safe projection only: exactly the
    // eight columns the component needs, and none of the PII columns that
    // also live on user_profiles. Suspended users are excluded from counts
    // per the Step 0 active-predicate decision.
    supabase
      .from("user_profiles")
      .select(
        "id, tenant_id, loyalty_points, loyalty_tier, created_at, last_purchase_at, is_suspended, churn_risk_score",
      )
      .eq("tenant_id", tenantId)
      .neq("is_suspended", true),

    // Query 2 — points economy for the MTD window. Sum by sign of points.
    // No tenant-wide transaction history, just the current month's flows.
    supabase
      .from("loyalty_transactions")
      .select("transaction_type, points")
      .eq("tenant_id", tenantId)
      .gte("created_at", monthStartISO || new Date(0).toISOString())
      .lt(
        "created_at",
        monthEndISO || new Date(Date.now() + MS_PER_DAY).toISOString(),
      ),
  ]);

  // ── Handle cohort query result ───────────────────────────────────────────
  if (cohortRes.status === "fulfilled" && !cohortRes.value.error) {
    const rows = cohortRes.value.data || [];
    const now = Date.now();
    const monthStartMs = monthStartISO
      ? new Date(monthStartISO).getTime()
      : now;

    const tierMap = {};

    for (const r of rows) {
      const lastPurchaseMs = r.last_purchase_at
        ? new Date(r.last_purchase_at).getTime()
        : null;
      const daysSinceLastPurchase =
        lastPurchaseMs != null
          ? (now - lastPurchaseMs) / MS_PER_DAY
          : Infinity;

      const isDormant = lastPurchaseMs == null;
      const isActive =
        !isDormant && daysSinceLastPurchase <= ACTIVE_WINDOW_DAYS;
      const isAtRisk =
        !isDormant &&
        daysSinceLastPurchase > ACTIVE_WINDOW_DAYS &&
        daysSinceLastPurchase <= AT_RISK_WINDOW_DAYS;
      const isLapsed =
        !isDormant && daysSinceLastPurchase > AT_RISK_WINDOW_DAYS;

      const createdAtMs = r.created_at
        ? new Date(r.created_at).getTime()
        : null;
      const isNew =
        createdAtMs != null && createdAtMs >= monthStartMs;

      const churnRiskScore =
        r.churn_risk_score != null
          ? parseFloat(r.churn_risk_score)
          : null;
      const isHighChurnRisk =
        churnRiskScore != null && churnRiskScore >= 0.5;

      const tierName = r.loyalty_tier || "unassigned";
      if (!tierMap[tierName]) {
        tierMap[tierName] = { tierName, count: 0, pointsTotal: 0 };
      }
      tierMap[tierName].count++;
      tierMap[tierName].pointsTotal += parseInt(r.loyalty_points, 10) || 0;

      result.totalMembers++;
      if (isNew) result.newThisMonth++;
      if (isActive) result.activeMembers++;
      if (isAtRisk) result.atRiskMembers++;
      if (isLapsed) result.lapsedMembers++;
      if (isDormant) result.dormantMembers++;
      if (isHighChurnRisk) result.highChurnRiskMembers++;

      result.customers.push({
        id: r.id,
        loyaltyPoints: parseInt(r.loyalty_points, 10) || 0,
        loyaltyTier: tierName,
        createdAt: r.created_at || null,
        lastPurchaseAt: r.last_purchase_at || null,
        churnRiskScore,
        isNew,
        isActive,
        isAtRisk,
        isLapsed,
        isDormant,
        daysSinceLastPurchase,
      });
    }

    // Stable tier ordering — use the canonical 5-tier sequence from
    // loyalty_config schema. Any tier name not in this list (e.g.
    // "unassigned" or a future custom tier) sorts to the end alphabetically.
    const TIER_ORDER = [
      "bronze",
      "silver",
      "gold",
      "platinum",
      "harvest_club",
    ];
    result.tierBreakdown = Object.values(tierMap).sort((a, b) => {
      const ai = TIER_ORDER.indexOf(a.tierName);
      const bi = TIER_ORDER.indexOf(b.tierName);
      if (ai === -1 && bi === -1) return a.tierName.localeCompare(b.tierName);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  } else {
    const err =
      cohortRes.status === "rejected"
        ? cohortRes.reason
        : cohortRes.value.error;
    console.error(
      `[fetchStoreLoyalty] cohort query failed for tenant ${tenantId}:`,
      err,
    );
    result.cohortErr = err?.message || "Cohort fetch failed";
  }

  // ── Handle points economy query result ─────────────────────────────────
  if (pointsRes.status === "fulfilled" && !pointsRes.value.error) {
    const rows = pointsRes.value.data || [];

    for (const r of rows) {
      const pts = parseInt(r.points, 10) || 0;
      if (pts > 0) {
        result.pointsIssuedMTD += pts;
      } else if (pts < 0) {
        result.pointsRedeemedMTD += Math.abs(pts);
      } else {
        // points = 0 → fall back to transaction_type string for disambiguation.
        // Live schema has mixed-case values (BONUS/EARNED/PURCHASE/REDEEMED
        // legacy + earn_purchase new) so match case-insensitively on "redeem"
        // prefix; anything else is treated as informational and not counted.
        const t = (r.transaction_type || "").toLowerCase();
        if (t.startsWith("redeem")) {
          // zero-point redeem entries are a no-op on the economy total
        }
      }
    }

    result.redemptionRate =
      result.pointsIssuedMTD > 0
        ? result.pointsRedeemedMTD / result.pointsIssuedMTD
        : 0;
  } else {
    const err =
      pointsRes.status === "rejected"
        ? pointsRes.reason
        : pointsRes.value.error;
    console.error(
      `[fetchStoreLoyalty] points query failed for tenant ${tenantId}:`,
      err,
    );
    result.pointsErr = err?.message || "Points fetch failed";
  }

  return result;
}
