// src/components/group/_helpers/fetchStoreTrend.js
// WP-ANALYTICS-3 Step 1 — per-store revenue trend fetcher
//
// Returns raw timestamped revenue rows so callers can bucket any way needed:
// by day (trend chart), by hour (peak trading), by week (SSSG), etc.
//
// Schema honoured:
//   - Retail revenue: orders.total / VAT_RATE, status = "paid" (LL-203 / GAP-01)
//   - Dispensary revenue: dispensing_log × inventory_items.sell_price,
//     is_voided != true (LL-231 + LL-226)
//   - VAT_RATE = 1.15 (SA VAT — orders.total is VAT-inclusive)
//
// Contract: never throws. Errors land in result.err.
// Partial results are kept — one fetch failure does not zero the result.
//
// Step 0 schema check results (12 Apr 2026):
//   orders.created_at            → timestamptz ✓
//   dispensing_log.dispensed_at  → timestamptz ✓
//   Medi Recreational 90d: 468 orders, 32 distinct dates — client-side safe ✓
//   Medi Can Dispensary 90d: 14 events, 10 distinct dates ✓

import { supabase } from "../../../services/supabaseClient";

// LL-298: VAT_RATE removed — per-tenant divisor read from tenant_config.vat_rate

/**
 * fetchStoreTrend
 * @param {string} tenantId
 * @param {string} industryProfile
 * @param {number} windowDays — how many days back to fetch (30 | 60 | 90)
 * @returns {Promise<TrendResult>}
 *
 * TrendResult:
 * {
 *   tenantId:   string,
 *   rows: Array<{
 *     date:      string,   // "YYYY-MM-DD" — for daily bucketing
 *     hour:      number,   // 0–23 — for peak trading (Session 2)
 *     dayOfWeek: number,   // 0=Sun … 6=Sat — for peak trading (Session 2)
 *     revenue:   number,   // ex-VAT ZAR
 *   }>,
 *   eventCount: number,    // total orders / dispensing events in window
 *   dataStartDate: string, // earliest date with data "YYYY-MM-DD"
 *   err: string | null,
 * }
 */
export async function fetchStoreTrend(tenantId, industryProfile, windowDays = 30) {
  const result = {
    tenantId,
    rows: [],
    eventCount: 0,
    dataStartDate: null,
    err: null,
  };

  const startISO = new Date(Date.now() - windowDays * 86400 * 1000).toISOString();

  // LL-298: Read vat_rate per tenant. Fallback 0.15 for NULL or missing rows.
  let divisor = 1.15;
  try {
    const { data: cfg } = await supabase.from("tenant_config").select("vat_rate").eq("tenant_id", tenantId).maybeSingle();
    const r = parseFloat(cfg?.vat_rate);
    if (Number.isFinite(r)) divisor = 1 + r;
  } catch (_) { /* divisor stays 1.15 */ }

  try {
    if (industryProfile === "cannabis_dispensary") {
      // ── Dispensary: dispensing_log × inventory_items.sell_price ──────────
      const { data, error } = await supabase
        .from("dispensing_log")
        .select("dispensed_at, quantity_dispensed, is_voided, inventory_items(sell_price)")
        .eq("tenant_id", tenantId)
        .neq("is_voided", true)
        .gte("dispensed_at", startISO)
        .order("dispensed_at", { ascending: true });

      if (error) throw error;

      const valid = (data || []).filter((l) => l.is_voided !== true);
      result.eventCount = valid.length;

      result.rows = valid.map((l) => {
        const ts = new Date(l.dispensed_at);
        const rev =
          (parseFloat(l.quantity_dispensed) || 0) *
          parseFloat(l.inventory_items?.sell_price || 0);
        return {
          date: l.dispensed_at.slice(0, 10),
          hour: ts.getHours(),
          dayOfWeek: ts.getDay(),
          revenue: rev,
        };
      });
    } else {
      // ── Retail / F&B / General: orders.total / VAT_RATE ─────────────────
      const { data, error } = await supabase
        .from("orders")
        .select("created_at, total")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("created_at", startISO)
        .order("created_at", { ascending: true });

      if (error) throw error;

      result.eventCount = (data || []).length;

      result.rows = (data || []).map((o) => {
        const ts = new Date(o.created_at);
        return {
          date: o.created_at.slice(0, 10),
          hour: ts.getHours(),
          dayOfWeek: ts.getDay(),
          revenue: (parseFloat(o.total) || 0) / divisor,
        };
      });
    }

    // Determine earliest data date
    if (result.rows.length > 0) {
      result.dataStartDate = result.rows[0].date;
    }
  } catch (err) {
    console.error(`[fetchStoreTrend] failed for tenant ${tenantId}:`, err);
    result.err = err.message || "Fetch failed";
  }

  return result;
}

// ─── Client-side bucketing helpers (exported for reuse in Session 2) ────────

/**
 * toDailyBuckets — group rows by date, return sorted array
 * @param {Array} rows
 * @returns {Array<{date: string, revenue: number}>}
 */
export function toDailyBuckets(rows) {
  const map = {};
  for (const r of rows) {
    map[r.date] = (map[r.date] || 0) + r.revenue;
  }
  return Object.entries(map)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * buildNetworkDailyAxis
 * Merge per-store daily buckets onto a unified date axis for LineChart.
 * Each date entry contains one key per tenantId.
 *
 * @param {Object} storeDaily — { tenantId: [{date, revenue}] }
 * @param {string[]} tenantIds
 * @returns {Array<{date: string, [tenantId]: number}>}
 */
export function buildNetworkDailyAxis(storeDaily, tenantIds) {
  const allDates = new Set();
  tenantIds.forEach((id) => {
    (storeDaily[id] || []).forEach((d) => allDates.add(d.date));
  });

  return Array.from(allDates)
    .sort()
    .map((date) => {
      const point = { date };
      tenantIds.forEach((id) => {
        const found = (storeDaily[id] || []).find((d) => d.date === date);
        point[id] = found ? found.revenue : 0;
      });
      return point;
    });
}

/**
 * calcSSSGMoM — month-on-month same-store sales growth
 * Compares current MTD revenue vs prior calendar month revenue.
 * Returns null if prior month has no data (insufficient history).
 *
 * @param {Array} dailyBuckets — [{date, revenue}]
 * @returns {{ pct: number|null, mtdRevenue: number, priorRevenue: number,
 *             mtdStart: string, priorStart: string, priorEnd: string,
 *             dataIsPartial: boolean }}
 */
export function calcSSSGMoM(dailyBuckets) {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth(); // 0-indexed

  const mtdStart = `${yr}-${String(mo + 1).padStart(2, "0")}-01`;
  const priorStart = new Date(yr, mo - 1, 1).toISOString().slice(0, 10);
  const priorEnd = new Date(yr, mo, 0).toISOString().slice(0, 10);

  const mtdRevenue = dailyBuckets
    .filter((d) => d.date >= mtdStart)
    .reduce((s, d) => s + d.revenue, 0);

  const priorBuckets = dailyBuckets.filter(
    (d) => d.date >= priorStart && d.date <= priorEnd,
  );
  const priorRevenue = priorBuckets.reduce((s, d) => s + d.revenue, 0);

  // Detect if prior month data starts mid-month (simulator / new store)
  const priorDates = priorBuckets.map((d) => d.date).sort();
  const dataIsPartial =
    priorDates.length > 0 && priorDates[0] > priorStart;

  const pct =
    priorRevenue > 0 ? ((mtdRevenue - priorRevenue) / priorRevenue) * 100 : null;

  return { pct, mtdRevenue, priorRevenue, mtdStart, priorStart, priorEnd, dataIsPartial };
}

/**
 * calcSSSGWoW — week-on-week same-store sales growth
 * Current week (Mon–today) vs prior full week (Mon–Sun).
 * @param {Array} dailyBuckets
 * @returns {{ pct: number|null, thisWeekRevenue: number, lastWeekRevenue: number }}
 */
export function calcSSSGWoW(dailyBuckets) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  // Monday of this week
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysToMon);
  const thisMondayStr = thisMonday.toISOString().slice(0, 10);

  // Monday of last week
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastMondayStr = lastMonday.toISOString().slice(0, 10);

  // Sunday of last week
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  const lastSundayStr = lastSunday.toISOString().slice(0, 10);

  const thisWeekRevenue = dailyBuckets
    .filter((d) => d.date >= thisMondayStr)
    .reduce((s, d) => s + d.revenue, 0);

  const lastWeekRevenue = dailyBuckets
    .filter((d) => d.date >= lastMondayStr && d.date <= lastSundayStr)
    .reduce((s, d) => s + d.revenue, 0);

  const pct =
    lastWeekRevenue > 0
      ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
      : null;

  return { pct, thisWeekRevenue, lastWeekRevenue };
}

/**
 * projectMonthEnd — simple 7-day rolling average projection
 * @param {Array} dailyBuckets
 * @returns {{ projectedMonthEnd: number, avgDaily: number, mtdRevenue: number, daysRemaining: number }}
 */
export function projectMonthEnd(dailyBuckets) {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();
  const mtdStart = `${yr}-${String(mo + 1).padStart(2, "0")}-01`;
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);

  const mtdBuckets = dailyBuckets.filter((d) => d.date >= mtdStart);
  const mtdRevenue = mtdBuckets.reduce((s, d) => s + d.revenue, 0);

  const last7 = dailyBuckets.slice(-7);
  const avgDaily =
    last7.length > 0
      ? last7.reduce((s, d) => s + d.revenue, 0) / last7.length
      : 0;

  return {
    projectedMonthEnd: mtdRevenue + avgDaily * daysRemaining,
    avgDaily,
    mtdRevenue,
    daysRemaining,
  };
}
