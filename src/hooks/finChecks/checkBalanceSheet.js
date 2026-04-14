// src/hooks/finChecks/checkBalanceSheet.js
// Balance Sheet health — inventory days of cover
// Formula: (90 * inventory_value) / cogs_90d
// COGS source: tenant_financial_period RPC (LL-210 canonical aggregator, matches HQProfitLoss)
// Thresholds are universal; benchmark text varies by industry_profile.

const BENCHMARKS = {
  general_retail:      { days: 60, label: "general retail" },
  cannabis_retail:     { days: 45, label: "cannabis retail" },
  food_beverage:       { days: 30, label: "food & beverage" },
  cannabis_dispensary: null, // no inventory-days check — dispensing is Rx-driven
};

const fmtR = (n) => "R" + Math.round(n).toLocaleString("en-ZA");

/**
 * @param {Object} input
 * @param {Array}  input.items            - inventory_items rows (quantity_on_hand, weighted_avg_cost)
 * @param {Number} input.cogs90d          - 90-day COGS sourced from tenant_financial_period RPC
 * @param {String} input.industryProfile
 * @returns {{ severity: 'red'|'amber'|'green'|null, alertCount: number, alerts: Array }}
 */
export function checkBalanceSheet({ items = [], cogs90d = 0, industryProfile }) {
  const benchmark = BENCHMARKS[industryProfile];
  if (benchmark === null || benchmark === undefined) {
    // dispensary or unknown profile — skip check
    return { severity: null, alertCount: 0, alerts: [] };
  }

  const inventoryValue = items.reduce((sum, i) => {
    const qty = parseFloat(i.quantity_on_hand) || 0;
    const cost = parseFloat(i.weighted_avg_cost) || 0;
    return sum + qty * cost;
  }, 0);

  // Cannot compute velocity from zero COGS → treat as null (no check)
  // Nourish Kitchen shows null — order_items cost_price needs seeding. See LOOP-NEW-004.
  // Do not add a fallback COGS source — RPC is canonical (LL-210). Fix the data, not the code.
  if (cogs90d <= 0) {
    return { severity: null, alertCount: 0, alerts: [] };
  }

  const daysOfCover = Math.round((90 * inventoryValue) / cogs90d);

  // Universal thresholds
  let severity;
  if (daysOfCover > 120) severity = "red";
  else if (daysOfCover > 60) severity = "amber";
  else severity = "green";

  if (severity === "green") {
    return { severity: "green", alertCount: 0, alerts: [] };
  }

  // Excess capital = value above the industry benchmark
  const benchmarkValue = (cogs90d / 90) * benchmark.days;
  const excessCapital = Math.max(0, Math.round(inventoryValue - benchmarkValue));

  const alerts = [
    {
      problem: `Inventory turning in ${daysOfCover} days`,
      why: `${fmtR(excessCapital)} locked up — ${benchmark.label} benchmark is ${benchmark.days} days`,
      fix: "Review dead stock",
      action: { type: "navigate", tab: "stock" },
      // TODO: AINS dispatch — second alert with { type: 'ains', question: '...' } once mechanism exists
    },
  ];

  return { severity, alertCount: alerts.length, alerts };
}
