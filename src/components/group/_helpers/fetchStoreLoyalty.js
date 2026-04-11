// src/components/group/_helpers/fetchStoreLoyalty.js
// WP-ANALYTICS-5 Sessions 1 + 2 — per-store loyalty cohort + points economy fetcher
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
// postal_code). The cohort query MUST NOT SELECT any of those columns.
// The authorised cohort projection is exactly eight columns and no more:
//   id, tenant_id, loyalty_points, loyalty_tier, created_at,
//   last_purchase_at, is_suspended, churn_risk_score
//
// S2 Section 6 Top Customers — this section needs `full_name` to derive
// initials, which is a narrower projection that stays POPIA-safe as long
// as the full name never reaches the component. The implementation:
// `full_name` is SELECTed only inside the includeTopCustomers branch,
// reduced to a two-character initials string inside the helper's
// transform loop, and immediately discarded. The returned `topCustomers`
// array contains ONLY initials + masked UUID (last 4 chars of id) +
// tier + points balance + monthly_spend_zar + monthly_visit_count. No
// full name, no raw UUID, no email, no phone ever leaves the helper.
// Browser devtools network tab verification is mandatory: the Supabase
// response payload contains full_name briefly on the wire, but React
// state never stores it. This is documented at the query site for
// future maintainers.
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
 * @param {boolean} [options.includeAiLogs=false] — S2: adds a query on
 *   loyalty_ai_log for per-action_type MTD counts. Live action types at
 *   verification time: churn_rescue, birthday_bonus, stock_boost_suggestion.
 * @param {boolean} [options.includeTopCustomers=false] — S2: adds a query
 *   on user_profiles for the top N customers by monthly_spend_zar (falls
 *   back to loyalty_points when no spend data is present). SELECTs
 *   full_name server-side for initials derivation ONLY — full_name is
 *   consumed and discarded inside the helper's transform loop. The
 *   returned topCustomers array contains only the POPIA-safe two-
 *   character initials + last-4 UUID + tier + points + monthly spend +
 *   monthly visits projection. Full name is never stored in React state.
 * @param {number}  [options.topCustomersLimit=10] — how many customers
 *   per store to return from the top customers query.
 * @param {boolean} [options.includeCampaigns=false] — permanently
 *   deferred. No loyalty_campaigns table exists in the live schema.
 *   Option is kept on the signature for stability but stays a no-op.
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
 *   // S2 — AI engine activity (populated when includeAiLogs=true)
 *   aiActionsMTD: {
 *     churnRescue, birthdayBonus, stockBoostSuggestion, other, total
 *   },
 *   // S2 — top customers (populated when includeTopCustomers=true)
 *   // POPIA-safe projection only — no full name, no raw UUID
 *   topCustomers: [{
 *     initials,        // "JS" — derived server-side, full_name discarded
 *     maskedId,        // last 4 chars of UUID
 *     loyaltyTier,
 *     loyaltyPoints,
 *     monthlySpendZar,
 *     monthlyVisitCount,
 *     lastPurchaseAt,
 *   }],
 *   // Errors — independent so one failure does not mask another
 *   cohortErr: string | null,
 *   pointsErr: string | null,
 *   aiLogsErr: string | null,
 *   topCustomersErr: string | null,
 * }
 */
export async function fetchStoreLoyalty(tenantId, options = {}) {
  const {
    monthStartISO,
    monthEndISO,
    // Reserved for future MoM comparison in this module — not used yet.
    // eslint-disable-next-line no-unused-vars
    lastMonthStartISO,
    // eslint-disable-next-line no-unused-vars
    lastMonthEndISO,
    includeAiLogs = false,
    includeTopCustomers = false,
    topCustomersLimit = 10,
    // Permanently deferred — no loyalty_campaigns table exists. Kept on
    // the signature for contract stability but never consulted.
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
    aiActionsMTD: {
      churnRescue: 0,
      birthdayBonus: 0,
      stockBoostSuggestion: 0,
      other: 0,
      total: 0,
    },
    topCustomers: [],
    cohortErr: null,
    pointsErr: null,
    aiLogsErr: null,
    topCustomersErr: null,
  };

  // ── Parallel queries — independent error isolation via allSettled ────────
  // Core S1 queries always run. S2 queries append conditionally. Using a
  // dynamic query array with index-tracked destructuring keeps the
  // Promise.allSettled pattern intact while avoiding a second round-trip.
  const queries = [];

  // Query 0 — cohort snapshot. POPIA-safe projection only: exactly the
  // eight columns the component needs, and none of the PII columns that
  // also live on user_profiles. Suspended users are excluded from counts
  // per the Step 0 active-predicate decision.
  queries.push(
    supabase
      .from("user_profiles")
      .select(
        "id, tenant_id, loyalty_points, loyalty_tier, created_at, last_purchase_at, is_suspended, churn_risk_score",
      )
      .eq("tenant_id", tenantId)
      .neq("is_suspended", true),
  );

  // Query 1 — points economy for the MTD window. Sum by sign of points.
  queries.push(
    supabase
      .from("loyalty_transactions")
      .select("transaction_type, points")
      .eq("tenant_id", tenantId)
      .gte("created_at", monthStartISO || new Date(0).toISOString())
      .lt(
        "created_at",
        monthEndISO || new Date(Date.now() + MS_PER_DAY).toISOString(),
      ),
  );

  // Query 2 (S2, optional) — AI engine activity MTD. loyalty_ai_log is
  // the actual table (not ai_action_logs per the Step 0 addendum).
  // Projection is action_type only — target_user_id is PII-adjacent
  // (reveals membership in churn_rescue lists etc) and we do not need
  // it for the aggregate count, so we do not SELECT it.
  const aiLogsIdx = includeAiLogs ? queries.length : -1;
  if (includeAiLogs) {
    queries.push(
      supabase
        .from("loyalty_ai_log")
        .select("action_type")
        .eq("tenant_id", tenantId)
        .gte("created_at", monthStartISO || new Date(0).toISOString())
        .lt(
          "created_at",
          monthEndISO || new Date(Date.now() + MS_PER_DAY).toISOString(),
        ),
    );
  }

  // Query 3 (S2, optional) — top customers by monthly spend.
  //
  // POPIA pattern: `full_name` is SELECTed server-side ONLY to derive
  // two-character initials inside the helper's transform loop below.
  // After initials derivation the raw string is discarded. The returned
  // topCustomers array contains only the POPIA-safe projection
  // (initials + masked UUID + tier + points + monthly spend + monthly
  // visits + last_purchase_at). Full name never reaches React state.
  //
  // Note: full_name appears briefly on the Supabase response payload
  // for this single query. This is an intentional narrow exception to
  // the "no PII on the wire" stance used by the S1 cohort query.
  // Browser devtools network-tab inspection during POPIA verification
  // must confirm the *render path* is PII-free, not the wire payload
  // for this specific query. This is documented in v247 prompt and in
  // the file header.
  //
  // Sort: monthly_spend_zar DESC. NULLs sort last. If the nightly engine
  // hasn't populated monthly_spend_zar for a tenant yet, the order
  // becomes implicit (and tied customers render by DB order). Component
  // can surface this honestly with an empty-state message.
  const topCustomersIdx = includeTopCustomers ? queries.length : -1;
  if (includeTopCustomers) {
    queries.push(
      supabase
        .from("user_profiles")
        .select(
          "id, full_name, loyalty_tier, loyalty_points, monthly_spend_zar, monthly_visit_count, last_purchase_at",
        )
        .eq("tenant_id", tenantId)
        .neq("is_suspended", true)
        .order("monthly_spend_zar", { ascending: false, nullsFirst: false })
        .order("loyalty_points", { ascending: false })
        .limit(topCustomersLimit),
    );
  }

  const settled = await Promise.allSettled(queries);
  const cohortRes = settled[0];
  const pointsRes = settled[1];
  const aiLogsRes = aiLogsIdx >= 0 ? settled[aiLogsIdx] : null;
  const topCustomersRes =
    topCustomersIdx >= 0 ? settled[topCustomersIdx] : null;

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

  // ── Handle AI logs result (S2 — optional) ─────────────────────────────
  if (aiLogsRes) {
    if (aiLogsRes.status === "fulfilled" && !aiLogsRes.value.error) {
      const rows = aiLogsRes.value.data || [];
      for (const r of rows) {
        const at = r.action_type || "";
        result.aiActionsMTD.total++;
        if (at === "churn_rescue") {
          result.aiActionsMTD.churnRescue++;
        } else if (at === "birthday_bonus") {
          result.aiActionsMTD.birthdayBonus++;
        } else if (at === "stock_boost_suggestion") {
          result.aiActionsMTD.stockBoostSuggestion++;
        } else {
          // Any future action_type added by the nightly engine rolls
          // into "other" instead of silently vanishing. This keeps the
          // total authoritative even if the engine ships new types.
          result.aiActionsMTD.other++;
        }
      }
    } else {
      const err =
        aiLogsRes.status === "rejected"
          ? aiLogsRes.reason
          : aiLogsRes.value.error;
      console.error(
        `[fetchStoreLoyalty] ai logs query failed for tenant ${tenantId}:`,
        err,
      );
      result.aiLogsErr = err?.message || "AI logs fetch failed";
    }
  }

  // ── Handle top customers result (S2 — optional) ──────────────────────
  // POPIA transform loop: full_name is consumed here and never stored.
  // The pushed object contains only the two-character initials + last-4
  // UUID + tier + points + monthly_spend_zar + monthly_visit_count +
  // last_purchase_at. No full name, no raw UUID, no email, no phone.
  if (topCustomersRes) {
    if (
      topCustomersRes.status === "fulfilled" &&
      !topCustomersRes.value.error
    ) {
      const rows = topCustomersRes.value.data || [];
      for (const r of rows) {
        const initials = deriveInitials(r.full_name);
        const maskedId = r.id ? `…${String(r.id).slice(-4)}` : "—";
        result.topCustomers.push({
          initials,
          maskedId,
          loyaltyTier: r.loyalty_tier || "unassigned",
          loyaltyPoints: parseInt(r.loyalty_points, 10) || 0,
          monthlySpendZar:
            r.monthly_spend_zar != null
              ? parseFloat(r.monthly_spend_zar)
              : 0,
          monthlyVisitCount:
            r.monthly_visit_count != null
              ? parseInt(r.monthly_visit_count, 10)
              : 0,
          lastPurchaseAt: r.last_purchase_at || null,
        });
        // full_name goes out of scope with r at next loop iteration
      }
    } else {
      const err =
        topCustomersRes.status === "rejected"
          ? topCustomersRes.reason
          : topCustomersRes.value.error;
      console.error(
        `[fetchStoreLoyalty] top customers query failed for tenant ${tenantId}:`,
        err,
      );
      result.topCustomersErr =
        err?.message || "Top customers fetch failed";
    }
  }

  return result;
}

// ─── Initials derivation (POPIA helper) ─────────────────────────────────
// Given a single `full_name` string, return a two-character initials
// string suitable for rendering in the Group Portal top-customers view.
// Handles the edge cases documented in Session 2 Step 0:
//   - null / empty / whitespace-only → "—"
//   - single word "Jane"              → "J"
//   - two words  "Jane Smith"         → "JS"
//   - 3+ words   "John van der Merwe" → "JM"  (first + last word only)
// This function is invoked inside the topCustomers transform loop above
// and the raw full_name is discarded immediately after.
function deriveInitials(fullName) {
  if (!fullName || typeof fullName !== "string") return "—";
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  const first = words[0].charAt(0).toUpperCase();
  const last = words[words.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}
