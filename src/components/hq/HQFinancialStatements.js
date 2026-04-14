// src/components/hq/HQFinancialStatements.js v1.0 — WP-FINANCIALS P2
// 4 IFRS statements unified shell:
//   1. Income Statement (Statement of Comprehensive Income)
//   2. Balance Sheet (Statement of Financial Position)
//   3. Cash Flow Statement (simplified indirect method)
//   4. Statement of Changes in Equity
// financial_statement_status: Draft → Reviewed → Auditor Signed Off → Locked
// Period selector: FY2026 / FY2025 / Custom
// Prior period shown as "No data for prior period" (future-proof)
// Status workflow: any authenticated user with access can advance (tenant self-managed)

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import HQFinancialSetup from "./HQFinancialSetup";
import { sendStatementEmail } from "../../services/emailService";
import { T } from "../../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)
// C is a pure alias for T — no shadow or local overrides required
const C = T;

const fmtZar = (n) => `R${(parseFloat(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

function fyBounds(fy) {
  const yr = parseInt(fy.replace("FY", ""), 10);
  return { start: new Date(yr, 0, 1).toISOString(), end: new Date(yr, 11, 31, 23, 59, 59).toISOString(), startDate: `${yr}-01-01`, endDate: `${yr}-12-31`, label: `For the year ended 31 December ${yr}` };
}
function customBounds(from, to) {
  if (!from || !to) return null;
  return { start: new Date(from + "T00:00:00").toISOString(), end: new Date(to + "T23:59:59").toISOString(), startDate: from, endDate: to, label: `For the period ${from} to ${to}` };
}

const STATUS_CFG = {
  draft: { label: "Draft", bg: "#FEF9C3", color: "#A16207", border: "#FDE047", icon: "\u25CB" },
  reviewed: { label: "Reviewed", bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD", icon: "\u25CE" },
  signed: { label: "Auditor Signed Off", bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7", icon: "\u2713" },
  locked: { label: "Locked", bg: "#E5E7EB", color: "#374151", border: "#9CA3AF", icon: "\uD83D\uDD12" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: C.font }}>{cfg.icon} {cfg.label}</span>;
}

function SRow({ label, current, prior = null, indent = 0, bold = false, total = false, negative = false, sub = null, shade = false }) {
  const fmt = (v) => { if (v === null || v === undefined) return "\u2014"; if (negative && v > 0) return `(${fmtZar(Math.abs(v))})`; return fmtZar(v); };
  const col = total ? (current >= 0 ? C.accent : C.danger) : C.ink700;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", padding: `${bold || total ? 11 : 8}px ${16 + indent * 20}px`, borderBottom: total ? `2px solid ${C.border}` : `1px solid #F8FAFC`, background: shade || total ? C.bg : "transparent", alignItems: "center" }}>
      <div><div style={{ fontSize: bold || total ? 14 : 13, fontWeight: bold || total ? 700 : 400, color: C.ink700, fontFamily: C.font }}>{label}</div>{sub && <div style={{ fontSize: 11, color: C.ink500, marginTop: 2, fontFamily: C.font }}>{sub}</div>}</div>
      <div style={{ textAlign: "right", fontSize: bold || total ? 15 : 13, fontWeight: bold || total ? 700 : 400, color: col, fontFamily: C.font, fontVariantNumeric: "tabular-nums" }}>{fmt(current)}</div>
      <div style={{ textAlign: "right", fontSize: 13, color: C.ink300, fontFamily: C.font, fontVariantNumeric: "tabular-nums", fontStyle: "italic" }}>{prior !== null ? fmt(prior) : "\u2014 prior period"}</div>
    </div>
  );
}
function SSection({ label }) { return <div style={{ padding: "8px 16px", background: "#F0EDE8", fontSize: 10, fontWeight: 700, color: C.ink500, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: C.font }}>{label}</div>; }
function SHeader() { return <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", padding: "10px 16px", borderBottom: `2px solid ${C.accent}`, fontSize: 10, fontWeight: 700, color: C.ink500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: C.font }}><span>Note</span><span style={{ textAlign: "right" }}>Current Period (ZAR)</span><span style={{ textAlign: "right" }}>Prior Period (ZAR)</span></div>; }

function Letterhead({ tenantName, statementTitle, statementSubtitle, periodLabel, status, financialYear }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#1A3D2B 0%,#2D6A4F 100%)", padding: "28px 32px 24px", color: "#fff", borderRadius: "12px 12px 0 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.65, marginBottom: 6 }}>{statementTitle}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px", fontFamily: C.font }}>{tenantName || "Business Name"}</div>
          <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.9, fontFamily: C.font }}>{statementSubtitle}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6, fontFamily: C.font }}>{periodLabel} {"\u00b7"} Prepared {fmtDate(new Date())}</div>
        </div>
        <div style={{ textAlign: "right" }}><StatusBadge status={status} /><div style={{ fontSize: 11, opacity: 0.6, marginTop: 8, fontFamily: C.font }}>IFRS for SMEs compliant</div><div style={{ fontSize: 11, opacity: 0.6, marginTop: 2, fontFamily: C.font }}>{financialYear}</div></div>
      </div>
    </div>
  );
}

function StatementNote({ text }) {
  return <div style={{ margin: "0 16px 20px", padding: "10px 14px", background: C.bg, borderRadius: 6, fontSize: 11, color: C.ink500, lineHeight: 1.6, fontFamily: C.font, borderLeft: `3px solid ${C.accentBd}` }}>{text}</div>;
}

// ── Statement 1: Income Statement ─────────────────────────────────────────────
function IncomeStatement({ data, tenantName, periodLabel, financialYear, status }) {
  const { revenue, cogs, grossProfit, grossMarginPct, opexLines, totalOpex, depreciationTotal, netProfit, netMarginPct } = data;
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 24 }}>
      <Letterhead tenantName={tenantName} statementTitle="Statement 1 of 4" statementSubtitle="Statement of Comprehensive Income" periodLabel={periodLabel} status={status} financialYear={financialYear} />
      <div style={{ padding: "0 0 8px" }}>
        <SHeader />
        <SSection label="Revenue" />
        <SRow label="Revenue from contracts with customers" current={revenue} indent={1} />
        <SRow label="Total Revenue" current={revenue} bold shade />
        <SSection label="Cost of Sales" />
        <SRow label="Cost of inventories recognised as expense" current={cogs} indent={1} negative />
        <SRow label="Gross Profit" current={grossProfit} bold shade sub={`Gross margin: ${(grossMarginPct || 0).toFixed(1)}%`} />
        <SSection label="Operating Expenses" />
        {opexLines.map((line, i) => <SRow key={i} label={line.label} current={line.amount} indent={1} negative />)}
        {depreciationTotal > 0 && <SRow label="Depreciation of property, plant and equipment" current={depreciationTotal} indent={1} negative />}
        <SRow label="Total Operating Expenses" current={totalOpex + depreciationTotal} bold shade negative />
        <div style={{ background: "#F0FDF4", borderTop: "2px solid #6EE7B7", borderBottom: "2px solid #6EE7B7" }}>
          <SRow label={netProfit >= 0 ? "Profit for the Period" : "Loss for the Period"} current={netProfit} bold sub={`Net margin: ${(netMarginPct || 0).toFixed(1)}%`} />
        </div>
      </div>
      <StatementNote text="Basis of preparation: Prepared in accordance with IFRS for SMEs. Functional currency: South African Rand (ZAR). Historical cost basis. COGS derived from order-level weighted average cost (AVCO). Comparative figures will populate after prior year-end close." />
    </div>
  );
}

// ── Statement 2: Balance Sheet ────────────────────────────────────────────────
function BalanceSheetStatement({ data, tenantName, asAtLabel, financialYear, status }) {
  const { inventoryValue, receivables, fixedAssetsNBV, fixedAssetsCost, fixedAssetsAccDep, payables, vatLiability, shareCapital, openingRetained, currentYearPL, totalEquity, balanced } = data;
  const totalCurrentAssets = inventoryValue + receivables;
  const totalAssets = totalCurrentAssets + fixedAssetsNBV;
  const totalLiabilities = payables + vatLiability;
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 24 }}>
      <Letterhead tenantName={tenantName} statementTitle="Statement 2 of 4" statementSubtitle="Statement of Financial Position" periodLabel={`As at ${asAtLabel}`} status={status} financialYear={financialYear} />
      <div style={{ padding: "8px 16px", background: balanced ? C.successLight : C.dangerLight, fontSize: 12, fontWeight: 600, color: balanced ? C.success : C.danger, fontFamily: C.font, borderBottom: `1px solid ${balanced ? C.successBd : C.dangerBd}` }}>
        {balanced ? "\u2713 Assets = Liabilities + Equity" : `\u26A0 Statement does not balance \u2014 difference: ${fmtZar(Math.abs(totalAssets - totalLiabilities - totalEquity))}`}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        <div style={{ borderRight: `1px solid ${C.border}` }}>
          <SSection label="Assets" />
          <SSection label="Current Assets" />
          <SRow label="Inventories (at AVCO)" current={inventoryValue} indent={1} sub="Weighted average cost per unit" />
          <SRow label="Trade and other receivables" current={receivables} indent={1} sub="Unpaid invoices" />
          <SRow label="Total Current Assets" current={totalCurrentAssets} bold shade />
          <SSection label="Non-Current Assets" />
          {fixedAssetsCost > 0 ? (<><SRow label="PPE \u2014 Cost" current={fixedAssetsCost} indent={1} /><SRow label="PPE \u2014 Accumulated depreciation" current={fixedAssetsAccDep} indent={1} negative /><SRow label="Total PPE (Net Book Value)" current={fixedAssetsNBV} bold shade /></>) : (<SRow label="Property, plant and equipment" current={0} indent={1} sub="No fixed assets registered" />)}
          <SRow label="TOTAL ASSETS" current={totalAssets} bold total />
        </div>
        <div>
          <SSection label="Liabilities" />
          <SSection label="Current Liabilities" />
          <SRow label="Trade and other payables" current={payables} indent={1} sub="Open purchase orders" />
          {vatLiability > 0 && <SRow label="VAT payable \u2014 SARS" current={vatLiability} indent={1} />}
          <SRow label="Total Liabilities" current={totalLiabilities} bold shade />
          <SSection label="Equity" />
          <SRow label="Share capital" current={shareCapital} indent={1} />
          <SRow label="Retained earnings \u2014 opening" current={openingRetained} indent={1} sub={openingRetained === 0 ? "First financial year" : "Brought forward"} />
          <SRow label={currentYearPL >= 0 ? "Profit for the year" : "Loss for the year"} current={Math.abs(currentYearPL)} indent={1} negative={currentYearPL < 0} />
          <SRow label="Total Equity" current={totalEquity} bold shade />
          <SRow label="TOTAL LIABILITIES + EQUITY" current={totalLiabilities + totalEquity} bold total />
        </div>
      </div>
      <StatementNote text="Inventories stated at weighted average cost (AVCO). Fixed assets at cost less accumulated depreciation from Fixed Asset Register. Trade payables represent open purchase orders. Equity comprises share capital, opening retained earnings and current period profit/(loss) per equity_ledger." />
    </div>
  );
}

// ── Statement 3: Cash Flow ────────────────────────────────────────────────────
function CashFlowStatement({ data, tenantName, periodLabel, financialYear, status }) {
  const { netProfit, depreciationTotal, netOperating, capexPaid, netInvesting, netCash } = data;
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 24 }}>
      <Letterhead tenantName={tenantName} statementTitle="Statement 3 of 4" statementSubtitle="Statement of Cash Flows" periodLabel={periodLabel} status={status} financialYear={financialYear} />
      <div style={{ padding: "0 0 8px" }}>
        <SHeader />
        <SSection label="Operating Activities (Simplified Indirect Method)" />
        <SRow label="Net profit / (loss) for the period" current={netProfit} indent={1} />
        <SRow label="Adjustments for non-cash items:" current={null} indent={1} />
        <SRow label="Depreciation of PPE" current={depreciationTotal} indent={2} />
        <SRow label="Net cash from operating activities" current={netOperating} bold shade sub="Approximated from P&L + depreciation add-back" />
        <SSection label="Investing Activities" />
        <SRow label="Purchase of property, plant and equipment" current={capexPaid} indent={1} negative sub="Capital expenditure from expense records" />
        <SRow label="Net cash used in investing activities" current={netInvesting} bold shade />
        <SSection label="Financing Activities" />
        <SRow label="Capital contributions / loan movements" current={0} indent={1} sub="Not yet tracked \u2014 add financing category to expenses" />
        <SRow label="Net cash from financing activities" current={0} bold shade />
        <div style={{ background: netCash >= 0 ? "#F0FDF4" : "#FEF2F2", borderTop: `2px solid ${netCash >= 0 ? "#6EE7B7" : "#FECACA"}`, borderBottom: `2px solid ${netCash >= 0 ? "#6EE7B7" : "#FECACA"}` }}>
          <SRow label="Net increase / (decrease) in cash and cash equivalents" current={netCash} bold />
        </div>
      </div>
      <StatementNote text="Simplified indirect method: starts with net profit, adds back depreciation (non-cash). Working capital movements (inventory change, receivables, payables) are not yet included \u2014 these require prior period snapshots. Cash balance not yet connected to bank reconciliation. Full indirect method available in Phase B." />
    </div>
  );
}

// ── Statement 4: Changes in Equity ────────────────────────────────────────────
function ChangesInEquityStatement({ data, tenantName, periodLabel, financialYear, status }) {
  const { shareCapital, openingRetained, currentYearPL } = data;
  const closingRetained = openingRetained + currentYearPL;
  const closingTotal = shareCapital + closingRetained;
  const openingTotal = shareCapital + openingRetained;
  const colStyle = { textAlign: "right", fontSize: 13, fontFamily: C.font, fontVariantNumeric: "tabular-nums", padding: "0 8px" };
  const cellBold = { ...colStyle, fontWeight: 700, fontSize: 14 };
  const rowStyle = (shade) => ({ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid #F8FAFC", background: shade ? C.bg : "transparent", alignItems: "center" });
  const hdStyle = { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 16px", borderBottom: `2px solid ${C.accent}`, fontSize: 10, fontWeight: 700, color: C.ink500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: C.font, background: C.bg };
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 24 }}>
      <Letterhead tenantName={tenantName} statementTitle="Statement 4 of 4" statementSubtitle="Statement of Changes in Equity" periodLabel={periodLabel} status={status} financialYear={financialYear} />
      <div>
        <div style={hdStyle}><span>Movement</span><span style={{ textAlign: "right", padding: "0 8px" }}>Share Capital</span><span style={{ textAlign: "right", padding: "0 8px" }}>Retained Earnings</span><span style={{ textAlign: "right", padding: "0 8px" }}>Total</span></div>
        <div style={rowStyle(false)}><span style={{ fontSize: 13, fontFamily: C.font, color: C.ink700 }}>Opening balance</span><span style={colStyle}>{fmtZar(shareCapital)}</span><span style={colStyle}>{fmtZar(openingRetained)}</span><span style={colStyle}>{fmtZar(openingTotal)}</span></div>
        <div style={rowStyle(false)}><span style={{ fontSize: 13, fontFamily: C.font, color: C.ink700 }}>{currentYearPL >= 0 ? "Net profit for the period" : "Net loss for the period"}</span><span style={{ ...colStyle, color: C.ink300 }}>{"\u2014"}</span><span style={{ ...colStyle, color: currentYearPL >= 0 ? C.success : C.danger }}>{fmtZar(currentYearPL)}</span><span style={{ ...colStyle, color: currentYearPL >= 0 ? C.success : C.danger }}>{fmtZar(currentYearPL)}</span></div>
        <div style={rowStyle(false)}><span style={{ fontSize: 13, fontFamily: C.font, color: C.ink300 }}>Dividends declared</span><span style={{ ...colStyle, color: C.ink300 }}>{"\u2014"}</span><span style={{ ...colStyle, color: C.ink300 }}>{"\u2014"}</span><span style={{ ...colStyle, color: C.ink300 }}>{"\u2014"}</span></div>
        <div style={rowStyle(true)}><span style={{ fontSize: 14, fontWeight: 700, fontFamily: C.font, color: C.ink900 }}>Closing balance</span><span style={cellBold}>{fmtZar(shareCapital)}</span><span style={cellBold}>{fmtZar(closingRetained)}</span><span style={{ ...cellBold, color: closingTotal >= 0 ? C.accent : C.danger }}>{fmtZar(closingTotal)}</span></div>
      </div>
      <StatementNote text="Share capital and opening retained earnings sourced from Financial Setup (equity_ledger). Dividends declared: not yet tracked. Future periods will show year-on-year retained earnings movement after year-end close." />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HQFinancialStatements() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const currentFY = `FY${new Date().getFullYear()}`;
  const priorFY = `FY${new Date().getFullYear() - 1}`;
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activeStatement, setActiveStatement] = useState("income");
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(null);
  const [toast, setToast] = useState(null);
  const [statusRow, setStatusRow] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [auditorName, setAuditorName] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [incomeData, setIncomeData] = useState(null);
  const [bsData, setBsData] = useState(null);
  const [cfData, setCfData] = useState(null);
  const [equityData, setEquityData] = useState(null);
  const [printing, setPrinting] = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const bounds = useMemo(
    () => selectedFY === "custom" ? customBounds(customFrom, customTo) : fyBounds(selectedFY),
    [selectedFY, customFrom, customTo]
  );

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("tenant_config").select("financial_setup_complete").eq("tenant_id", tenantId).single()
      .then(({ data }) => setSetupComplete(data?.financial_setup_complete ?? false));
  }, [tenantId]);

  const fetchStatus = useCallback(async () => {
    if (!tenantId || !bounds) return;
    const fy = selectedFY === "custom" ? "custom" : selectedFY;
    const { data } = await supabase.from("financial_statement_status").select("*").eq("tenant_id", tenantId).eq("financial_year", fy).maybeSingle();
    setStatusRow(data || null);
  }, [tenantId, selectedFY, bounds]);

  const fetchData = useCallback(async () => {
    if (!tenantId || !bounds) return;
    setLoading(true);
    try {
      const { start, end, startDate, endDate } = bounds;
      // Use canonical RPC for income statement data (LL-210, LL-209)
      const [fpRes, expensesRes, depRes, equityRes, inventoryRes, faRes, invoicesRes, payablesRes, vatExpRes] = await Promise.all([
        supabase.rpc("tenant_financial_period", { p_tenant_id: tenantId, p_since: start, p_until: end }),
        supabase.from("expenses").select("*").eq("tenant_id", tenantId).gte("expense_date", startDate).lte("expense_date", endDate),
        supabase.from("depreciation_entries").select("depreciation,period_month,period_year").eq("tenant_id", tenantId),
        supabase.from("equity_ledger").select("*").eq("tenant_id", tenantId).eq("financial_year", selectedFY === "custom" ? currentFY : selectedFY).maybeSingle(),
        supabase.from("inventory_items").select("quantity_on_hand,weighted_avg_cost,is_active").eq("tenant_id", tenantId).eq("is_active", true),
        supabase.from("fixed_assets").select("purchase_cost,accumulated_depreciation,is_active").eq("tenant_id", tenantId).eq("is_active", true),
        supabase.from("invoices").select("total_amount,status,invoice_type").eq("tenant_id", tenantId).not("status", "eq", "paid"),
        supabase.from("purchase_orders").select("landed_cost_zar,po_status").eq("tenant_id", tenantId).in("po_status", ["pending", "confirmed", "ordered"]),
        supabase.from("expenses").select("input_vat_amount").eq("tenant_id", tenantId).gt("input_vat_amount", 0),
      ]);

      const fp = fpRes.data || {};

      // Income Statement — from canonical RPC
      const revenue = fp.revenue?.ex_vat || 0;
      const cogs = fp.cogs?.actual || 0;
      const grossProfit = revenue - cogs;
      const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const opexExpenses = (expensesRes.data || []).filter(e => ["opex", "wages", "tax", "other"].includes(e.category));
      const capexExpenses = (expensesRes.data || []).filter(e => e.category === "capex");
      const totalOpex = fp.opex?.total || opexExpenses.reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0);
      const capexPaid = capexExpenses.reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0);
      const opexMap = {};
      opexExpenses.forEach(e => { const k = e.subcategory || "Other operating expenses"; opexMap[k] = (opexMap[k] || 0) + (parseFloat(e.amount_zar) || 0); });
      const opexLines = Object.entries(opexMap).map(([label, amount]) => ({ label, amount }));
      // Depreciation filtered by period
      const startYear = new Date(start).getFullYear();
      const startMonth = new Date(start).getMonth() + 1;
      const endYear = new Date(end).getFullYear();
      const endMonth = new Date(end).getMonth() + 1;
      const depreciationTotal = (depRes.data || []).filter(e => {
        const y = e.period_year; const m = e.period_month;
        return (y > startYear || (y === startYear && m >= startMonth)) && (y < endYear || (y === endYear && m <= endMonth));
      }).reduce((s, e) => s + (parseFloat(e.depreciation) || 0), 0);
      const netProfit = grossProfit - totalOpex - depreciationTotal;
      const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      setIncomeData({ revenue, cogs, grossProfit, grossMarginPct, opexLines, totalOpex, depreciationTotal, netProfit, netMarginPct });

      // Balance Sheet — use RPC + direct queries for point-in-time values
      const inventoryValue = (inventoryRes.data || []).reduce((s, i) => s + (parseFloat(i.quantity_on_hand || 0) * parseFloat(i.weighted_avg_cost || 0)), 0);
      const receivables = (invoicesRes.data || []).filter(i => i.invoice_type !== "purchase").reduce((s, i) => s + (parseFloat(i.total_amount || 0)), 0);
      const payables = (payablesRes.data || []).reduce((s, po) => s + (parseFloat(po.landed_cost_zar || 0)), 0);
      const fixedAssetsCost = (faRes.data || []).reduce((s, a) => s + (parseFloat(a.purchase_cost || 0)), 0);
      const fixedAssetsAD = (faRes.data || []).reduce((s, a) => s + (parseFloat(a.accumulated_depreciation || 0)), 0);
      const fixedAssetsNBV = Math.max(0, fixedAssetsCost - fixedAssetsAD);
      const vatInput = (vatExpRes.data || []).reduce((s, e) => s + (parseFloat(e.input_vat_amount) || 0), 0);
      const vatOutput = fp.vat?.output || 0;
      const vatLiability = Math.max(0, Math.round((vatOutput - vatInput) * 100) / 100);
      const eqData = equityRes.data;
      const shareCapital = parseFloat(eqData?.share_capital || 0);
      const openingRE = parseFloat(eqData?.opening_retained_earnings || 0);
      const totalEquity = shareCapital + openingRE + netProfit;
      const totalAssets = inventoryValue + receivables + fixedAssetsNBV;
      const totalLiabilities = payables + vatLiability;
      const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 2;
      setBsData({ inventoryValue, receivables, fixedAssetsNBV, fixedAssetsCost, fixedAssetsAccDep: fixedAssetsAD, payables, vatLiability, shareCapital, openingRetained: openingRE, currentYearPL: netProfit, totalEquity, balanced });

      // Cash Flow — from RPC
      const netOperating = netProfit + depreciationTotal;
      const netInvesting = -capexPaid;
      const netCash = netOperating + netInvesting;
      setCfData({ netProfit, depreciationTotal, cashFromCustomers: fp.cash?.from_customers || revenue, cashToSuppliers: fp.cash?.to_suppliers || 0, opexPaid: totalOpex, capexPaid, netOperating, netInvesting, netCash });

      // Equity
      setEquityData({ shareCapital, openingRetained: openingRE, currentYearPL: netProfit });
    } catch (err) { console.error("HQFinancialStatements fetch error:", err); }
    finally { setLoading(false); }
  }, [tenantId, bounds, selectedFY, currentFY]);

  useEffect(() => { fetchData(); fetchStatus(); }, [fetchData, fetchStatus]);

  const currentStatus = statusRow?.status || "draft";
  const isLocked = currentStatus === "locked";
  const fy = selectedFY === "custom" ? "custom" : selectedFY;

  const advanceStatus = async (newStatus, extra = {}) => {
    if (!tenantId || isLocked) return;
    setStatusSaving(true);
    try {
      const { error } = await supabase.from("financial_statement_status").upsert({ tenant_id: tenantId, financial_year: fy, status: newStatus, updated_at: new Date().toISOString(), ...extra }, { onConflict: "tenant_id,financial_year" });
      if (error) throw error;
      showToast(`Status updated to ${newStatus}`);
      fetchStatus();
    } catch (err) { showToast(err.message, "error"); }
    finally { setStatusSaving(false); }
  };

  const handleMarkReviewed = () => advanceStatus("reviewed", { reviewed_at: new Date().toISOString(), reviewed_by: "Internal review" });
  const handleSignOff = () => { if (!auditorName.trim()) { showToast("Enter auditor name", "error"); return; } advanceStatus("signed", { signed_at: new Date().toISOString(), signed_by: auditorName.trim() }); setShowSignModal(false); setAuditorName(""); };
  const handleLock = () => { if (window.confirm(`Lock ${fy} financial statements? This cannot be undone.`)) advanceStatus("locked", { locked_at: new Date().toISOString() }); };

  const handlePrint = useCallback(() => {
    if (loading || !incomeData || !bsData || !cfData || !equityData) {
      showToast("Statements still loading \u2014 wait a moment", "error");
      return;
    }
    setPrinting(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        setTimeout(() => setPrinting(false), 400);
      }, 150);
    });
  }, [loading, incomeData, bsData, cfData, equityData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (setupComplete === false) return <HQFinancialSetup onComplete={() => setSetupComplete(true)} />;
  if (setupComplete === null) return <div style={{ padding: 60, textAlign: "center", color: C.ink500, fontFamily: C.font }}>Loading{"\u2026"}</div>;

  const STATEMENTS = [{ id: "income", label: "Income Statement" }, { id: "balance", label: "Balance Sheet" }, { id: "cashflow", label: "Cash Flow" }, { id: "equity", label: "Changes in Equity" }];
  const FY_OPTIONS = [{ id: currentFY, label: currentFY }, { id: priorFY, label: `${priorFY} (prior year)` }, { id: "custom", label: "Custom range" }];
  const periodLabel = bounds ? bounds.label : "Period not set";
  const asAtLabel = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const tenantName = tenant?.name || "Business";
  const financialYear = selectedFY === "custom" ? "Custom Period" : selectedFY;

  return (
    <div style={{ fontFamily: C.font, color: C.ink700 }}>
      {/* Print CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          #root { display: none !important; }
          .nuai-print-portal { display: block !important; position: static !important; overflow: visible !important; }
          .nuai-print-page-break { page-break-after: always; break-after: page; }
          @page { size: A4 portrait; margin: 1.5cm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.ink900, letterSpacing: "-0.01em", fontFamily: C.font }}>IFRS Financial Statements</h2>
          <p style={{ margin: "4px 0 0", color: C.ink500, fontSize: 13 }}>4 IFRS statements {"\u00b7"} status workflow {"\u00b7"} auditor sign-off</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {FY_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setSelectedFY(opt.id)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid", borderColor: selectedFY === opt.id ? C.accent : C.border, background: selectedFY === opt.id ? C.accentLight : "#fff", color: selectedFY === opt.id ? C.accent : C.ink500, fontWeight: selectedFY === opt.id ? 700 : 400, cursor: "pointer", fontSize: 12, fontFamily: C.font }}>{opt.label}</button>
          ))}
          {!loading && incomeData && (
            <button onClick={handlePrint} disabled={printing} style={{ padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${C.accentMid}`, background: printing ? C.bg : C.accentLight, color: printing ? C.ink500 : C.accent, cursor: printing ? "wait" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: C.font, display: "flex", alignItems: "center", gap: 6 }}>
              {printing ? "Preparing\u2026" : "\uD83D\uDDA8\uFE0F Print / Save PDF"}
            </button>
          )}
          {!loading && incomeData && (
            <button
              onClick={async () => {
                const to = window.prompt(`Email statement to:`, "");
                if (!to) return;
                const tenantContact = window.prompt(
                  "Your tenant contact email (reply-to):",
                  tenant?.email || "",
                );
                if (!tenantContact) return;
                const fyOpt = FY_OPTIONS.find((o) => o.id === selectedFY);
                const res = await sendStatementEmail({
                  tenantId,
                  recipient: { email: to },
                  tenantContactEmail: tenantContact,
                  data: {
                    period: fyOpt?.label || selectedFY,
                    customer_name: tenantName,
                    opening_balance: 0,
                    closing_balance: incomeData?.netProfit || 0,
                  },
                });
                if (res.skipped) window.alert(`Skipped (cooldown ${res.cooldown_hours}h)`);
                else if (!res.ok) window.alert(`Email failed: ${res.error}`);
                else window.alert(`Statement email sent to ${to}`);
              }}
              style={{ padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${C.accentMid}`, background: "#fff", color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: C.font, display: "flex", alignItems: "center", gap: 6 }}
            >
              {"\uD83D\uDCE7"} Email Statement
            </button>
          )}
        </div>
      </div>

      {selectedFY === "custom" && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: C.font, fontSize: 13 }} />
          <span style={{ color: C.ink500, fontSize: 12 }}>to</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: C.font, fontSize: 13 }} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StatusBadge status={currentStatus} />
          {statusRow?.signed_by && <span style={{ fontSize: 12, color: C.ink500, fontFamily: C.font }}>Signed by: <strong>{statusRow.signed_by}</strong>{statusRow.signed_at ? ` on ${new Date(statusRow.signed_at).toLocaleDateString("en-ZA")}` : ""}</span>}
          {statusRow?.locked_at && <span style={{ fontSize: 12, color: C.ink500, fontFamily: C.font }}>Locked {new Date(statusRow.locked_at).toLocaleDateString("en-ZA")}</span>}
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 8 }}>
            {currentStatus === "draft" && <button onClick={handleMarkReviewed} disabled={statusSaving} style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${C.infoBd}`, background: C.infoLight, color: C.info, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: C.font }}>{"\u25CE"} Mark Reviewed</button>}
            {currentStatus === "reviewed" && <button onClick={() => setShowSignModal(true)} disabled={statusSaving} style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${C.successBd}`, background: C.successLight, color: C.success, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: C.font }}>{"\u2713"} Auditor Sign Off{"\u2026"}</button>}
            {currentStatus === "signed" && <button onClick={handleLock} disabled={statusSaving} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #9CA3AF", background: "#F3F4F6", color: "#374151", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: C.font }}>{"\uD83D\uDD12"} Lock Period</button>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {STATEMENTS.map(s => (
          <button key={s.id} onClick={() => setActiveStatement(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 18px", fontFamily: C.font, fontSize: 12, fontWeight: activeStatement === s.id ? 700 : 400, color: activeStatement === s.id ? C.accent : C.ink500, letterSpacing: "0.04em", borderBottom: activeStatement === s.id ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: "-1px" }}>{s.label}</button>
        ))}
      </div>

      {loading ? <div style={{ padding: 60, textAlign: "center", color: C.ink500, fontFamily: C.font }}>Loading financial statements{"\u2026"}</div> : (
        <>
          {activeStatement === "income" && incomeData && <IncomeStatement data={incomeData} tenantName={tenantName} periodLabel={periodLabel} financialYear={financialYear} status={currentStatus} />}
          {activeStatement === "balance" && bsData && <BalanceSheetStatement data={bsData} tenantName={tenantName} asAtLabel={asAtLabel} financialYear={financialYear} status={currentStatus} />}
          {activeStatement === "cashflow" && cfData && <CashFlowStatement data={cfData} tenantName={tenantName} periodLabel={periodLabel} financialYear={financialYear} status={currentStatus} />}
          {activeStatement === "equity" && equityData && <ChangesInEquityStatement data={equityData} tenantName={tenantName} periodLabel={periodLabel} financialYear={financialYear} status={currentStatus} />}
        </>
      )}

      {showSignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 380, fontFamily: C.font, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: C.ink900 }}>Auditor Sign-Off</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: C.ink500, lineHeight: 1.5 }}>Enter the auditor or reviewer name. This will be recorded on the statement and cannot be changed after locking.</p>
            <input autoFocus value={auditorName} onChange={e => setAuditorName(e.target.value)} placeholder="e.g. J. Smith CA(SA) / Smith & Associates" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: C.font, boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowSignModal(false); setAuditorName(""); }} style={{ padding: "8px 18px", borderRadius: 7, border: `1px solid ${C.border}`, background: "#fff", color: C.ink500, cursor: "pointer", fontSize: 13, fontFamily: C.font }}>Cancel</button>
              <button onClick={handleSignOff} disabled={!auditorName.trim()} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: C.accent, color: "#fff", cursor: auditorName.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, fontFamily: C.font, opacity: auditorName.trim() ? 1 : 0.5 }}>Confirm Sign-Off</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? "#991B1B" : C.accent, color: "#fff", padding: "12px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: C.font, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>{toast.msg}</div>}

      {/* Print portal — renders all 4 statements outside #root for clean printing */}
      {printing && createPortal(
        <div className="nuai-print-portal" style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 99999, overflowY: "auto", padding: "24px", fontFamily: C.font }}>
          <div style={{ textAlign: "center", marginBottom: 32, paddingBottom: 24, borderBottom: `2px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.ink500, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>NuAi Financial Reporting</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.ink900 }}>{tenantName}</div>
            <div style={{ fontSize: 14, color: C.ink500, marginTop: 4 }}>IFRS Financial Statements {"\u00b7"} {financialYear}</div>
            <div style={{ fontSize: 12, color: C.ink500, marginTop: 4 }}>{periodLabel}</div>
            <div style={{ marginTop: 12 }}><StatusBadge status={currentStatus} /></div>
            {statusRow?.signed_by && <div style={{ fontSize: 12, color: C.ink500, marginTop: 8 }}>Signed by: <strong>{statusRow.signed_by}</strong>{statusRow.signed_at ? ` on ${new Date(statusRow.signed_at).toLocaleDateString("en-ZA")}` : ""}</div>}
            <div style={{ fontSize: 11, color: C.ink300, marginTop: 6 }}>Prepared {fmtDate(new Date())} {"\u00b7"} IFRS for SMEs compliant {"\u00b7"} Functional currency: ZAR</div>
          </div>
          <div className="nuai-print-page-break">{incomeData && <IncomeStatement data={incomeData} tenantName={tenantName} periodLabel={periodLabel} financialYear={financialYear} status={currentStatus} />}</div>
          <div className="nuai-print-page-break">{bsData && <BalanceSheetStatement data={bsData} tenantName={tenantName} asAtLabel={asAtLabel} financialYear={financialYear} status={currentStatus} />}</div>
          <div className="nuai-print-page-break">{cfData && <CashFlowStatement data={cfData} tenantName={tenantName} periodLabel={periodLabel} financialYear={financialYear} status={currentStatus} />}</div>
          <div>{equityData && <ChangesInEquityStatement data={equityData} tenantName={tenantName} periodLabel={periodLabel} financialYear={financialYear} status={currentStatus} />}</div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.ink300, textAlign: "center", lineHeight: 1.7 }}>
            Generated by NuAi {"\u00b7"} {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })} {"\u00b7"} These statements have been prepared in accordance with IFRS for SMEs. {"\u00b7"} Prepared on the historical cost basis. Functional currency: South African Rand (ZAR).
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
