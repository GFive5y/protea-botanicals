// src/hooks/finChecks/checkVat.js
// VAT health — days to next filing deadline + missing input VAT count
// Only contributes when useBadges.vat is empty (operational-overdue alerts win).
//
// South African bi-monthly VAT filing:
//   Jan-Feb (P1) → file by 31 Mar
//   Mar-Apr (P2) → file by 31 May
//   May-Jun (P3) → file by 31 Jul
//   Jul-Aug (P4) → file by 30 Sep
//   Sep-Oct (P5) → file by 30 Nov
//   Nov-Dec (P6) → file by 31 Jan (next year)

const fmtZar = (n) => "R" + Math.round(n).toLocaleString("en-ZA");

// Compute next filing deadline given today's date
function nextFilingDeadline(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based
  // Period ends at end of Feb/Apr/Jun/Aug/Oct/Dec (even-month 1,3,5,7,9,11 zero-indexed)
  // Deadline = last day of month following period end
  // Map month-in-year → deadline date
  const deadlines = [
    new Date(year, 2, 31, 23, 59, 59), // Jan-Feb → Mar 31
    new Date(year, 4, 31, 23, 59, 59), // Mar-Apr → May 31
    new Date(year, 6, 31, 23, 59, 59), // May-Jun → Jul 31
    new Date(year, 8, 30, 23, 59, 59), // Jul-Aug → Sep 30
    new Date(year, 10, 30, 23, 59, 59), // Sep-Oct → Nov 30
    new Date(year + 1, 0, 31, 23, 59, 59), // Nov-Dec → Jan 31 next year
  ];
  return deadlines.find((d) => d > today) || deadlines[0];
}

/**
 * @param {Object} input
 * @param {Boolean} input.vatRegistered
 * @param {Array} input.expenses         - current FY opex-category expenses with amount_zar + input_vat_amount + subcategory
 * @returns {{ severity, alertCount, alerts }}
 */
export function checkVat({ vatRegistered, expenses = [] }) {
  if (!vatRegistered) {
    return { severity: null, alertCount: 0, alerts: [] };
  }

  const today = new Date();
  const deadline = nextFilingDeadline(today);
  const daysToDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  // Non-VAT-bearing categories — excluded from "missing input VAT" check (LL earlier)
  const NON_VAT_SUBCATS = new Set([
    "labour", "salaries", "wages", "insurance",
    "banking", "Banking & Fees", "Staff Wages",
  ]);

  const missingInput = expenses.filter((e) => {
    if (e.category === "capex") return false;
    if (NON_VAT_SUBCATS.has(e.subcategory)) return false;
    const amt = parseFloat(e.amount_zar) || 0;
    if (amt <= 0) return false;
    const vat = parseFloat(e.input_vat_amount) || 0;
    return vat <= 0;
  });
  const missingCount = missingInput.length;
  const missingValue = missingInput.reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0);

  // Severity: days-to-deadline drives red threshold. Missing-input count is an
  // amber signal (surfaces a problem worth reviewing) but never promotes to red
  // on its own — red requires the filing deadline to actually be imminent.
  let severity = "green";
  if (daysToDeadline < 14) severity = "red";
  else if (daysToDeadline < 30 || missingCount >= 1) severity = "amber";

  if (severity === "green") {
    return { severity: "green", alertCount: 0, alerts: [] };
  }

  const alerts = [];

  if (daysToDeadline < 30) {
    alerts.push({
      problem: `VAT filing due in ${daysToDeadline} day${daysToDeadline === 1 ? "" : "s"}`,
      why: `Next deadline: ${deadline.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`,
      fix: "Open VAT",
      action: { type: "navigate", tab: "vat" },
      // TODO: AINS dispatch
    });
  }

  if (missingCount >= 1) {
    alerts.push({
      problem: `${missingCount} expense${missingCount === 1 ? "" : "s"} missing input VAT`,
      why: `${fmtZar(missingValue)} of purchases with no VAT claim recorded`,
      fix: "Review expenses",
      action: { type: "navigate", tab: "expenses" },
      // TODO: AINS dispatch
    });
  }

  return { severity, alertCount: alerts.length, alerts };
}
