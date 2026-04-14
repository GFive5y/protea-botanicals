// src/hooks/finChecks/checkPL.js
// P&L health — wage ratio (wages ÷ total revenue), year-to-date.
// Thresholds: red > 30%, amber > 20%, green ≤ 20%
// YTD window matches the IFRS Income Statement — MTD is too volatile for a
// structural signal like wage ratio. Revenue source branches on industry per LL-231.

const fmtZar = (n) => "R" + Math.round(n).toLocaleString("en-ZA");
const fmtPct = (n) => Math.round(n * 10) / 10 + "%";

/**
 * @param {Object} input
 * @param {Array}  input.expensesYTD   - YTD expenses (category + amount_zar), already FY-filtered by caller
 * @param {Number} input.revenueYTD    - YTD revenue ex-VAT (orders or dispensing, caller resolves)
 * @returns {{ severity, alertCount, alerts }}
 */
export function checkPL({ expensesYTD = [], revenueYTD = 0 }) {
  if (revenueYTD <= 0) {
    // no revenue yet this FY — no meaningful ratio
    return { severity: null, alertCount: 0, alerts: [] };
  }

  const wageCategories = new Set(["wages", "salaries"]);
  const wagesYTD = expensesYTD.reduce((sum, e) => {
    if (!wageCategories.has(e.category)) return sum;
    return sum + (parseFloat(e.amount_zar) || 0);
  }, 0);

  if (wagesYTD <= 0) {
    return { severity: "green", alertCount: 0, alerts: [] };
  }

  const ratio = (wagesYTD / revenueYTD) * 100;

  let severity;
  if (ratio > 30) severity = "red";
  else if (ratio > 20) severity = "amber";
  else severity = "green";

  if (severity === "green") {
    return { severity: "green", alertCount: 0, alerts: [] };
  }

  // Excess wages = what wages would be at the 20% healthy ceiling
  const healthyCeiling = revenueYTD * 0.20;
  const excessWages = Math.max(0, Math.round(wagesYTD - healthyCeiling));

  const alerts = [
    {
      problem: `Wages are ${fmtPct(ratio)} of revenue (YTD)`,
      why: `${fmtZar(wagesYTD)} wages on ${fmtZar(revenueYTD)} revenue — ${fmtZar(excessWages)} above the 20% healthy ceiling`,
      fix: "Review P&L",
      action: { type: "navigate", tab: "pl" },
      // TODO: AINS dispatch
    },
  ];

  return { severity, alertCount: alerts.length, alerts };
}
