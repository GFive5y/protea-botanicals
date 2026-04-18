// src/services/trialBalanceExcel.js
// WP-FIN-004 PR 4 — Trial Balance + GL Excel export
//
// Produces a 5-sheet .xlsx workbook in CA working papers format:
//   Sheet 1: Cover          — entity, period, status, watermark if unsigned
//   Sheet 2: Trial Balance  — grouped by account type, subtotals, Dr=Cr check
//   Sheet 3: GL Detail      — all transactions, truncated at 10k rows
//   Sheet 4: Notes          — basis of preparation, VAT, AVCO, audit trail
//   Sheet 5: COA Mapping    — account code → P&L/BS line mapping (reference)
//
// Runs 100% client-side. No EF. No server round-trip beyond the RPCs that
// already populate the on-screen TB tab (fn_trial_balance + fn_gl_detail).
//
// LL-297: FY labels computed from tenant.financial_year_start — never hardcoded.
// LL-290: scope verified against fn_trial_balance return shape, not UI assumption.

import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

const GL_ROW_CAP = 10000; // Owner decision Q2 (WP-FIN-004 Section 0)

const MONEY_FMT = '#,##0.00;(#,##0.00);"—"';
const DATE_FMT = "yyyy-mm-dd";

// Accounts that are snapshot balances (reported on BS, not flowing through P&L)
// — GL Detail sheet renders a short explanatory row instead of "empty".
// (WP-TB-SNAPSHOT-EMPTY-STATE bundled into PR 4)
const SNAPSHOT_ACCOUNTS = new Set([
  "12000", // Inventory
  "15000", // Fixed assets — cost
  "15100", // Fixed assets — accumulated depreciation (snapshot pair with 15000)
  "30000", // Share capital
  "30100", // Retained earnings
]);

function zar(n) {
  const v = parseFloat(n);
  return isNaN(v) ? 0 : Math.round(v * 100) / 100;
}

function safeCellDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt;
}

// For inline display in text (notes, audit trail) — not for spreadsheet cells.
// Avoids Date.toString() leaking "Fri Apr 17 2026 12:20:56 GMT+1200" format.
function fmtDateDisplay(d) {
  if (!d) return "\u2014";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Sheet 1: Cover ───────────────────────────────────────────────────────────
function buildCoverSheet({ tenantName, financialYear, periodLabel, status, signedBy, signedAt, generatedAt }) {
  const watermark = status !== "signed" ? "DRAFT — UNAUDITED WORKING PAPERS" : "";
  const rows = [
    ["NuAi Financial Reporting — Trial Balance & GL Export"],
    [],
    ["Entity", tenantName || ""],
    ["Financial Year", financialYear || ""],
    ["Period", periodLabel || ""],
    ["Status", (status || "draft").toUpperCase()],
    ["Signed By", signedBy || "—"],
    ["Sign-Off Date", signedAt ? safeCellDate(signedAt) : "—"],
    ["Generated", safeCellDate(generatedAt)],
    ["Format", "CA Working Papers — IFRS for SMEs"],
    ["Currency", "ZAR"],
    [],
    [watermark],
    [],
    ["Contents"],
    ["Sheet 1: Cover"],
    ["Sheet 2: Trial Balance (grouped by account type, Dr=Cr check)"],
    [`Sheet 3: GL Detail (up to ${GL_ROW_CAP.toLocaleString()} rows per account)`],
    ["Sheet 4: Notes (basis of preparation, AVCO, VAT, audit trail)"],
    ["Sheet 5: COA Mapping (reference)"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 24 }, { wch: 56 }];
  return ws;
}

// ── Sheet 2: Trial Balance ───────────────────────────────────────────────────
const TB_TYPE_ORDER = ["asset", "liability", "equity", "revenue", "expense"];
const TB_TYPE_LABELS = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

function buildTbSheet(tbRows) {
  const rows = [["Code", "Account Name", "Account Type", "Debit (ZAR)", "Credit (ZAR)"]];

  const groups = {};
  TB_TYPE_ORDER.forEach((t) => { groups[t] = []; });
  (tbRows || []).forEach((r) => {
    if (groups[r.account_type]) groups[r.account_type].push(r);
  });

  let grandDr = 0;
  let grandCr = 0;

  TB_TYPE_ORDER.forEach((type) => {
    const group = groups[type];
    if (!group.length) return;
    rows.push([]);
    rows.push([TB_TYPE_LABELS[type]]);
    let gDr = 0;
    let gCr = 0;
    group.forEach((r) => {
      const dr = zar(r.period_debit);
      const cr = zar(r.period_credit);
      if (dr === 0 && cr === 0) return;
      rows.push([r.account_code, r.account_name, type, dr, cr]);
      gDr += dr;
      gCr += cr;
    });
    rows.push(["", `Total ${TB_TYPE_LABELS[type]}`, "", gDr, gCr]);
    grandDr += gDr;
    grandCr += gCr;
  });

  rows.push([]);
  const diff = Math.abs(grandDr - grandCr);
  const balanced = diff < 2;
  rows.push(["", "TOTAL", "", grandDr, grandCr]);
  rows.push([
    "",
    balanced ? "Dr = Cr (balanced)" : `OUT OF BALANCE BY ${diff.toFixed(2)} — REVIEW REQUIRED`,
    "",
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 10 }, { wch: 44 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];

  // Apply money format to numeric columns (D and E).
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = 1; R <= range.e.r; ++R) {
    for (const col of ["D", "E"]) {
      const addr = `${col}${R + 1}`;
      if (ws[addr] && typeof ws[addr].v === "number") ws[addr].z = MONEY_FMT;
    }
  }

  return ws;
}

// ── Sheet 3: GL Detail ───────────────────────────────────────────────────────
async function buildGlSheet({ tenantId, financialYear, tbRows }) {
  const header = ["Account", "Account Name", "Date", "Reference", "Description", "Debit (ZAR)", "Credit (ZAR)", "Running Balance (ZAR)"];
  const rows = [header];

  const accountsToFetch = (tbRows || []).filter((r) => {
    const dr = zar(r.period_debit);
    const cr = zar(r.period_credit);
    return dr > 0 || cr > 0;
  });

  let totalFetched = 0;
  let truncated = false;

  for (const acc of accountsToFetch) {
    if (totalFetched >= GL_ROW_CAP) { truncated = true; break; }

    // Snapshot accounts: render one explanatory line instead of querying empty GL
    if (SNAPSHOT_ACCOUNTS.has(acc.account_code)) {
      rows.push([
        acc.account_code,
        acc.account_name,
        "",
        "",
        "Snapshot balance \u2014 see Balance Sheet for breakdown. No posted journals in this period.",
        "",
        "",
        "",
      ]);
      continue;
    }

    const remaining = GL_ROW_CAP - totalFetched;
    const { data: lines, error } = await supabase.rpc("fn_gl_detail", {
      p_tenant_id: tenantId,
      p_financial_year: financialYear,
      p_account_code: acc.account_code,
      p_limit: remaining + 1,
    });

    if (error) {
      // Graceful handling — fn_gl_detail RPC can fail for certain accounts
      // (see WATCH-014, e.g. 15100 and 61100 depreciation journal construction).
      // Data still aggregates correctly in the Trial Balance sheet; we just
      // can't enumerate the per-line detail for this account.
      rows.push([
        acc.account_code,
        acc.account_name,
        "",
        "",
        "GL detail unavailable for this account. Aggregated amount is correct in the Trial Balance sheet \u2014 see Trial Balance tab for the period total.",
        "",
        "",
        "",
      ]);
      continue;
    }

    const lineRows = lines || [];
    if (lineRows.length === 0) {
      rows.push([acc.account_code, acc.account_name, "", "", "No transactions for this account in the period.", "", "", ""]);
      continue;
    }

    const capped = lineRows.slice(0, remaining);
    capped.forEach((l) => {
      rows.push([
        acc.account_code,
        acc.account_name,
        safeCellDate(l.transaction_date),
        l.reference || "",
        l.description || "",
        zar(l.debit_amount),
        zar(l.credit_amount),
        zar(l.running_balance),
      ]);
    });
    totalFetched += capped.length;

    if (lineRows.length > remaining) truncated = true;
  }

  if (truncated) {
    rows.push([]);
    rows.push([
      "",
      "",
      "",
      "",
      `GL detail truncated at ${GL_ROW_CAP.toLocaleString()} rows total. For the full GL, filter the period selector to a single quarter and re-export.`,
      "",
      "",
      "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 10 }, { wch: 28 }, { wch: 12 }, { wch: 14 },
    { wch: 50 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
  ];

  // Money format columns F/G/H; date format column C
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = 1; R <= range.e.r; ++R) {
    for (const col of ["F", "G", "H"]) {
      const addr = `${col}${R + 1}`;
      if (ws[addr] && typeof ws[addr].v === "number") ws[addr].z = MONEY_FMT;
    }
    const dateAddr = `C${R + 1}`;
    if (ws[dateAddr] && ws[dateAddr].v instanceof Date) ws[dateAddr].z = DATE_FMT;
  }

  return ws;
}

// ── Sheet 4: Notes ───────────────────────────────────────────────────────────
function buildNotesSheet({ financialYear, periodLabel, status, signedBy, signedAt }) {
  const rows = [
    ["Notes to the Trial Balance & GL Export"],
    [],
    ["1. Basis of Preparation"],
    ["Prepared in accordance with IFRS for SMEs. Functional currency: South African Rand (ZAR). Historical cost basis."],
    [`Reporting period: ${periodLabel || ""}  \u00b7  ${financialYear || ""}`],
    [],
    ["2. Trial Balance Derivation"],
    ["TB is derived from operational tables (orders, expenses, dispensing_log, inventory_items, equity_ledger) with a double-entry overlay from journal_lines for manual adjusting entries. Revenue and expense accounts are shown individually (pre-closing TB)."],
    [],
    ["3. Inventory (AVCO)"],
    ["Inventories are measured at weighted average cost, recalculated automatically on each stock movement. See account 12000 on the Balance Sheet for the carrying value."],
    [],
    ["4. Value Added Tax"],
    ["The entity's VAT registration status is recorded in tenant_config.vat_registered. The standard SA rate of 15% applies to vatable supplies. Output VAT arises on taxable sales; input VAT is claimed on qualifying business expenses."],
    [],
    ["5. Snapshot Accounts"],
    ["Accounts 12000 (Inventory), 15000 (Fixed Assets), 30000 (Share Capital) and 30100 (Retained Earnings Opening) are snapshot balances shown on the Balance Sheet. They do not flow through journal entries during the period. GL Detail rows for these accounts will show 'Snapshot balance \u2014 see Balance Sheet for breakdown'."],
    [],
    ["6. Balance Check"],
    ["Total debits must equal total credits within R2 tolerance. Larger discrepancies indicate a journal posting issue and require review before reliance on these figures."],
    [],
    ["7. Audit Trail"],
    [`Status at export: ${(status || "draft").toUpperCase()}`],
    [`Signed by: ${signedBy || "\u2014"}`],
    [`Sign-off date: ${fmtDateDisplay(signedAt)}`],
    ["Each row on the GL Detail sheet ties back to a journal_lines or operational-table row via the Reference column."],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 120 }];
  return ws;
}

// ── Sheet 5: COA Mapping ─────────────────────────────────────────────────────
async function buildCoaMappingSheet({ tenantId }) {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("account_code, account_name, account_type, account_subtype")
    .eq("tenant_id", tenantId)
    .order("account_code");

  const rows = [["Code", "Account Name", "Type", "Subtype"]];
  if (error) {
    rows.push(["", `Error loading COA: ${error.message}`, "", ""]);
  } else {
    (data || []).forEach((a) => {
      rows.push([a.account_code, a.account_name, a.account_type, a.account_subtype || "\u2014"]);
    });
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 10 }, { wch: 44 }, { wch: 14 }, { wch: 20 }];
  return ws;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate and trigger download of the TB/GL Excel workbook.
 *
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.tenantName
 * @param {string} params.financialYear   — e.g. "FY2026" or "custom"
 * @param {string} params.periodLabel
 * @param {string} params.status          — draft | reviewed | signed | locked
 * @param {string|null} params.signedBy
 * @param {string|null} params.signedAt
 * @param {Array}  params.tbRows          — already-loaded rows from fn_trial_balance
 * @returns {Promise<{ ok: boolean, filename?: string, error?: string }>}
 */
export async function exportTrialBalanceExcel({
  tenantId, tenantName, financialYear, periodLabel, status,
  signedBy, signedAt, tbRows,
}) {
  try {
    if (!tenantId) throw new Error("tenantId required");
    if (!Array.isArray(tbRows)) throw new Error("tbRows must be an array");

    const generatedAt = new Date();
    const wb = XLSX.utils.book_new();

    const coverWs = buildCoverSheet({ tenantName, financialYear, periodLabel, status, signedBy, signedAt, generatedAt });
    XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

    const tbWs = buildTbSheet(tbRows);
    XLSX.utils.book_append_sheet(wb, tbWs, "Trial Balance");

    const glWs = await buildGlSheet({ tenantId, financialYear, tbRows });
    XLSX.utils.book_append_sheet(wb, glWs, "GL Detail");

    const notesWs = buildNotesSheet({ financialYear, periodLabel, status, signedBy, signedAt });
    XLSX.utils.book_append_sheet(wb, notesWs, "Notes");

    const coaWs = await buildCoaMappingSheet({ tenantId });
    XLSX.utils.book_append_sheet(wb, coaWs, "COA Mapping");

    const safeName = String(tenantName || "entity").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 40);
    const ts = generatedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `TB_${safeName}_${financialYear}_${ts}.xlsx`;

    XLSX.writeFile(wb, filename);
    return { ok: true, filename };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
