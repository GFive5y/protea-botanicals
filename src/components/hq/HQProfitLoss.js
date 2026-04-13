// src/components/hq/HQProfitLoss.js v4.0 — WP-FINANCIALS Phase 2: IFRS Statement View
// v4.0: IFRS toggle · IFRSStatementView · depreciation line · equity ledger · status badge · COGS quality
// v3.0: DB-backed OPEX from expenses table · CAPEX memo line · quarter + custom date range
// v2.6 — WP-VIZ: wfCalc() helper + WaterfallChart (ComposedChart) above HTML detail
// v2.5 — WP-THEME-2: Inter font + InfoTooltip + Toast
// v2.4 — WP-GUIDE-C: usePageContext 'pl' wired + WorkflowGuide added
// v2.3 — WP-R Phase 6: realtime subscription for revenue tiles
// v2.2 — COGS methodology fix
// v2.1 — CRITICAL FIX: Use landed_cost_zar directly
// v2.0 — WP-Q Live Data Integration fixes

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { ChartCard, ChartTooltip } from "../viz";
import { usePageContext } from "../../hooks/usePageContext";
import WorkflowGuide from "../WorkflowGuide";
import InfoTooltip from "../InfoTooltip";
import ExpenseManager from "./ExpenseManager";
import HQFinancialSetup from "./HQFinancialSetup";
import { T } from "../../styles/tokens";

// ─── WP-FINANCIALS Phase 2: IFRS account mapping ─────────────────────────────
const SUBCATEGORY_TO_ACCOUNT = {
  "Rent & Premises":   { code: "60000", ifrsLabel: "Rent and occupancy costs" },
  "Staff Wages":       { code: "60100", ifrsLabel: "Employee benefits expense" },
  "Security":          { code: "60200", ifrsLabel: "Security services" },
  "Utilities":         { code: "60300", ifrsLabel: "Utilities" },
  "Insurance":         { code: "60400", ifrsLabel: "Insurance expense" },
  "Marketing":         { code: "60500", ifrsLabel: "Marketing and advertising" },
  "Packaging":         { code: "60600", ifrsLabel: "Packaging materials" },
  "Banking & Fees":    { code: "60700", ifrsLabel: "Finance charges and bank fees" },
  "Software":          { code: "60800", ifrsLabel: "Software and subscriptions" },
  "Professional Fees": { code: "60900", ifrsLabel: "Professional fees" },
  "Cleaning & Hygiene":{ code: "61000", ifrsLabel: "Cleaning and hygiene" },
  "Equipment":         { code: "61900", ifrsLabel: "Other operating expenses" },
  // cannabis_dispensary additions
  "SAHPRA Licensing Fees":         { code: "60150", ifrsLabel: "Regulatory licensing fees" },
  "Pharmacist Salary":             { code: "60110", ifrsLabel: "Employee benefits \u2014 responsible pharmacist" },
  "Cold Chain Equipment":          { code: "61500", ifrsLabel: "Medical equipment and maintenance" },
  "Professional Indemnity":        { code: "60410", ifrsLabel: "Professional indemnity insurance" },
  "Patient Education Materials":   { code: "60510", ifrsLabel: "Clinical education materials" },
  "Controlled Substance Security": { code: "60210", ifrsLabel: "Controlled substance security" },
  // food_beverage additions
  "Produce & Ingredients":         { code: "50100", ifrsLabel: "Raw material \u2014 food ingredients" },
  "Kitchen Wages":                 { code: "60105", ifrsLabel: "Employee benefits \u2014 kitchen and FOH staff" },
  "Gas & Cooking Fuel":            { code: "60305", ifrsLabel: "Gas and cooking fuel" },
  "FSCA Compliance Fees":          { code: "60155", ifrsLabel: "Food safety compliance and certification fees" },
  "Cleaning & Hygiene Supplies":   { code: "61005", ifrsLabel: "Cleaning and hygiene materials" },
  "Equipment Maintenance":         { code: "61505", ifrsLabel: "Kitchen equipment maintenance and calibration" },
};

const STATUS_CONFIG = {
  draft:    { label: "Draft", bg: "#FEF9C3", color: "#A16207", border: "#FDE047" },
  reviewed: { label: "Reviewed", bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
  signed:   { label: "Signed Off", bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"3px 12px", borderRadius:20, fontSize:11, fontWeight:700,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
      letterSpacing:"0.05em", textTransform:"uppercase",
    }}>
      {status === "signed" ? "\u2713 " : status === "reviewed" ? "\u25CE " : "\u25CB "}
      {cfg.label}
    </span>
  );
}

// ─── WP-FINANCIALS Phase 2: IFRS Statement View ───────────────────────────────
function IFRSStatementView({
  tenantName, financialYear, period,
  revenueIfrsLabel = "Revenue from contracts with customers",
  totalRevenue, totalCogs, grossProfit, grossMarginPct,
  depreciationTotal, expensesBySubcategory, loyaltyCost,
  totalOpexIncLoyalty, netProfit, netMarginPct,
  equityLedger, statementStatus,
  fmtZar, fmt,
}) {
  const preparedDate = new Date().toLocaleDateString("en-ZA", {
    day:"numeric", month:"long", year:"numeric",
  });

  const ifrsLines = [];
  const mapped = new Map();
  Object.entries(expensesBySubcategory).forEach(([sub, total]) => {
    const acc = SUBCATEGORY_TO_ACCOUNT[sub];
    const key = acc ? acc.code : "61900";
    const label = acc ? acc.ifrsLabel : sub || "Other operating expenses";
    if (mapped.has(key)) {
      mapped.get(key).amount += total;
    } else {
      mapped.set(key, { code: key, label, amount: total });
    }
  });
  Array.from(mapped.values())
    .sort((a,b) => a.code.localeCompare(b.code))
    .forEach(l => ifrsLines.push(l));

  const totalOpex = ifrsLines.reduce((s,l)=>s+l.amount,0) + loyaltyCost + depreciationTotal;

  const IS = {
    page: {
      background:"#fff", border:"1px solid #E2E8F0", borderRadius:12,
      overflow:"hidden", fontFamily:"'Inter','Helvetica Neue',Arial,sans-serif",
    },
    letterhead: {
      background:"linear-gradient(135deg,#1A3D2B 0%,#2D6A4F 100%)",
      padding:"28px 40px 24px", color:"#fff",
    },
    statTitle: { fontSize:13,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",opacity:0.7,marginBottom:4 },
    companyName: { fontSize:22,fontWeight:700,letterSpacing:"-0.02em",margin:"0 0 4px" },
    statName: { fontSize:16,fontWeight:600,opacity:0.9 },
    periodLine: { fontSize:12,opacity:0.65,marginTop:6 },
    body: { padding:"0 40px 40px" },
    tableHeader: {
      display:"grid", gridTemplateColumns:"1fr 140px 140px",
      padding:"10px 0", borderBottom:"2px solid #1A3D2B",
      fontSize:11,fontWeight:700,color:"#374151",
      letterSpacing:"0.07em",textTransform:"uppercase",marginTop:28,
    },
    sectionLabel: {
      fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:"0.07em",
      textTransform:"uppercase",padding:"18px 0 6px",
    },
    row: (bold, indent=0, shade=false) => ({
      display:"grid", gridTemplateColumns:"1fr 140px 140px",
      padding:`${bold?12:8}px 0 ${bold?12:8}px ${indent*20}px`,
      borderBottom: bold ? "1px solid #E2E8F0" : "1px solid #F8FAFC",
      background: shade ? "#F8FAFC" : "transparent",
      alignItems:"center",
    }),
    lbl: (bold,dim) => ({
      fontSize:bold?14:13, fontWeight:bold?700:400,
      color:dim?"#9CA3AF":bold?"#111827":"#374151",
    }),
    amt: (bold,color) => ({
      fontSize:bold?15:13, fontWeight:bold?700:500,
      color:color||"#374151", textAlign:"right",
      fontVariantNumeric:"tabular-nums",
    }),
    dash: { fontSize:13,color:"#D1D5DB",textAlign:"right" },
    footnote: {
      marginTop:32,paddingTop:16,borderTop:"1px solid #E2E8F0",
      fontSize:11,color:"#9CA3AF",lineHeight:1.6,
    },
  };

  return (
    <div style={IS.page}>
      <div style={IS.letterhead}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <div style={IS.statTitle}>Income Statement</div>
            <div style={IS.companyName}>{tenantName || "Business Name"}</div>
            <div style={IS.statName}>Statement of Comprehensive Income</div>
            <div style={IS.periodLine}>
              For the period ended {period} \u00b7 Prepared {preparedDate}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <StatusBadge status={statementStatus || "draft"} />
            <div style={{ fontSize:11,opacity:0.6,marginTop:8 }}>IFRS for SMEs compliant</div>
            <div style={{ fontSize:11,opacity:0.6,marginTop:2 }}>{financialYear}</div>
          </div>
        </div>
      </div>
      <div style={IS.body}>
        <div style={IS.tableHeader}>
          <span>Note</span>
          <span style={{ textAlign:"right" }}>Current Period (ZAR)</span>
          <span style={{ textAlign:"right" }}>Prior Period (ZAR)</span>
        </div>

        <div style={IS.sectionLabel}>Revenue</div>
        <div style={IS.row(false,0)}>
          <span style={IS.lbl(false)}>{revenueIfrsLabel}</span>
          <span style={IS.amt(false,"#059669")}>{fmtZar(totalRevenue)}</span>
          <span style={IS.dash}>\u2014</span>
        </div>
        <div style={IS.row(true,0,true)}>
          <span style={IS.lbl(true)}>Total Revenue</span>
          <span style={IS.amt(true,"#059669")}>{fmtZar(totalRevenue)}</span>
          <span style={IS.dash}>\u2014</span>
        </div>

        <div style={IS.sectionLabel}>Cost of Sales</div>
        <div style={IS.row(false,1)}>
          <span style={IS.lbl(false)}>Cost of inventories recognised as expense (actual)</span>
          <span style={IS.amt(false,"#DC2626")}>({fmtZar(Math.abs(totalCogs))})</span>
          <span style={IS.dash}>\u2014</span>
        </div>
        <div style={IS.row(true,0,true)}>
          <span style={IS.lbl(true)}>Gross Profit</span>
          <span style={IS.amt(true, grossProfit>=0?"#059669":"#DC2626")}>
            {grossProfit < 0 ? `(${fmtZar(Math.abs(grossProfit))})` : fmtZar(grossProfit)}
          </span>
          <span style={IS.dash}>\u2014</span>
        </div>
        <div style={{ fontSize:11,color:"#6B7280",padding:"4px 0 8px",fontStyle:"italic" }}>
          Gross margin: {fmt(grossMarginPct)}%
        </div>

        <div style={IS.sectionLabel}>Operating Expenses</div>
        {ifrsLines.map(line => (
          <div key={line.code} style={IS.row(false,1)}>
            <span style={IS.lbl(false)}>
              {line.label}
              <span style={{ fontSize:10,color:"#9CA3AF",marginLeft:8 }}>{line.code}</span>
            </span>
            <span style={IS.amt(false,"#374151")}>({fmtZar(Math.abs(line.amount))})</span>
            <span style={IS.dash}>\u2014</span>
          </div>
        ))}
        {loyaltyCost > 0 && (
          <div style={IS.row(false,1)}>
            <span style={IS.lbl(false)}>
              Marketing \u2014 loyalty programme cost
              <span style={{ fontSize:10,color:"#9CA3AF",marginLeft:8 }}>60500</span>
            </span>
            <span style={IS.amt(false,"#374151")}>({fmtZar(Math.abs(loyaltyCost))})</span>
            <span style={IS.dash}>\u2014</span>
          </div>
        )}
        {depreciationTotal > 0 && (
          <div style={IS.row(false,1)}>
            <span style={IS.lbl(false)}>
              Depreciation of property, plant and equipment
              <span style={{ fontSize:10,color:"#9CA3AF",marginLeft:8 }}>61100</span>
            </span>
            <span style={IS.amt(false,"#374151")}>({fmtZar(Math.abs(depreciationTotal))})</span>
            <span style={IS.dash}>\u2014</span>
          </div>
        )}
        {depreciationTotal === 0 && (
          <div style={{ fontSize:11,color:"#D1D5DB",padding:"6px 20px",fontStyle:"italic" }}>
            Depreciation \u2014 no fixed assets registered yet
          </div>
        )}
        <div style={IS.row(true,0,true)}>
          <span style={IS.lbl(true)}>Total Operating Expenses</span>
          <span style={IS.amt(true,"#DC2626")}>({fmtZar(Math.abs(totalOpex))})</span>
          <span style={IS.dash}>\u2014</span>
        </div>

        <div style={{ ...IS.row(true,0), background:"#F0FDF4",borderTop:"2px solid #6EE7B7",borderBottom:"2px solid #6EE7B7" }}>
          <span style={IS.lbl(true)}>
            {netProfit >= 0 ? "Profit for the Period" : "Loss for the Period"}
          </span>
          <span style={IS.amt(true, netProfit>=0?"#059669":"#DC2626")}>
            {netProfit < 0 ? `(${fmtZar(Math.abs(netProfit))})` : fmtZar(netProfit)}
          </span>
          <span style={IS.dash}>\u2014</span>
        </div>
        <div style={{ fontSize:11,color:"#6B7280",padding:"4px 0 16px",fontStyle:"italic" }}>
          Net margin: {fmt(netMarginPct)}%
        </div>

        {equityLedger && (
          <>
            <div style={IS.sectionLabel}>Movement in Equity</div>
            <div style={IS.row(false,0)}>
              <span style={IS.lbl(false)}>Share capital</span>
              <span style={IS.amt(false)}>{fmtZar(equityLedger.share_capital || 0)}</span>
              <span style={IS.dash}>\u2014</span>
            </div>
            <div style={IS.row(false,0)}>
              <span style={IS.lbl(false)}>Retained earnings \u2014 opening</span>
              <span style={IS.amt(false)}>{fmtZar(equityLedger.opening_retained_earnings || 0)}</span>
              <span style={IS.dash}>\u2014</span>
            </div>
            <div style={IS.row(false,0)}>
              <span style={IS.lbl(false)}>Profit/(loss) for the period</span>
              <span style={IS.amt(false,netProfit>=0?"#059669":"#DC2626")}>{fmtZar(netProfit)}</span>
              <span style={IS.dash}>\u2014</span>
            </div>
            <div style={IS.row(true,0,true)}>
              <span style={IS.lbl(true)}>Total Equity</span>
              <span style={IS.amt(true)}>
                {fmtZar((equityLedger.share_capital||0)+(equityLedger.opening_retained_earnings||0)+netProfit)}
              </span>
              <span style={IS.dash}>\u2014</span>
            </div>
          </>
        )}

        <div style={IS.footnote}>
          <strong>Basis of preparation:</strong> These financial statements have been prepared in accordance with the International Financial Reporting Standard for Small and Medium-sized Entities (IFRS for SMEs). The functional and presentation currency is South African Rand (ZAR). Prepared on the historical cost basis.
          <br /><br />
          <strong>Note on comparative figures:</strong> No comparative period data is available. This will populate once the prior financial year has been closed.
          <br /><br />
          <em>System-generated from NuAi transaction data. Status: <strong>{(statementStatus || "draft").toUpperCase()}</strong>.</em>
        </div>
      </div>
    </div>
  );
}

// ─── FX Hook ──────────────────────────────────────────────────────────────────
function useFxRate() {
  const [fxRate, setFxRate] = useState(null);
  const [fxLoading, setFxLoading] = useState(true);
  const fetchRate = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-fx-rate`,
        { headers: { apikey: process.env.REACT_APP_SUPABASE_ANON_KEY } },
      );
      const data = await res.json();
      if (data.usd_zar) setFxRate(data);
    } catch {
      setFxRate({ usd_zar: 18.5, source: "fallback" });
    } finally {
      setFxLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchRate();
    const t = setInterval(fetchRate, 60000);
    return () => clearInterval(t);
  }, [fetchRate]);
  return { fxRate, fxLoading };
}

// ─── COGS calculation — mirrors HQCogs v3.7 exactly ─────────────────────────
const CANNALYTICS_TESTS = [
  { id: "potency", price: 350 },
  { id: "solvents", price: 200 },
  { id: "microbial", price: 150 },
  { id: "mycotoxins", price: 1800 },
  { id: "heavy_metal", price: 1200 },
  { id: "pesticide", price: 1000 },
  { id: "terpene_profile", price: 750 },
  { id: "foreign_matter", price: 100 },
];

function calcCogsTotal(recipe, supplierProducts, localInputs, usdZar) {
  if (!recipe || !usdZar) return 0;
  const hw = supplierProducts.find((p) => p.id === recipe.hardware_item_id);
  const pk = localInputs.find((i) => i.id === recipe.packaging_input_id);
  const lb = localInputs.find((i) => i.id === recipe.labour_input_id);

  const hwCost = hw
    ? parseFloat(recipe.hardware_qty || 1) *
        parseFloat(hw.unit_price_usd) *
        usdZar +
      parseFloat(recipe.shipping_alloc_zar || 0)
    : 0;

  let tpCost = 0;
  let diCost = 0;
  const chamberData =
    Array.isArray(recipe.chambers) && recipe.chambers.length > 1
      ? recipe.chambers
      : null;

  if (chamberData) {
    chamberData.forEach((ch) => {
      const chTp = supplierProducts.find((p) => p.id === ch.terpene_item_id);
      const chDi = localInputs.find((i) => i.id === ch.distillate_input_id);
      const ul = parseFloat(ch.terpene_qty_ul || 0);
      const cpml = chTp ? (parseFloat(chTp.unit_price_usd) / 50) * usdZar : 0;
      tpCost += chTp ? (ul / 1000) * cpml : 0;
      diCost +=
        chDi && chDi.cost_zar
          ? parseFloat(ch.distillate_qty_ml || 0) * parseFloat(chDi.cost_zar)
          : 0;
    });
  } else {
    const tp = supplierProducts.find((p) => p.id === recipe.terpene_item_id);
    const di = localInputs.find((i) => i.id === recipe.distillate_input_id);
    const terpUl = parseFloat(recipe.terpene_qty_ul || 0);
    const tpCostPerMl = tp ? (parseFloat(tp.unit_price_usd) / 50) * usdZar : 0;
    tpCost = tp ? (terpUl / 1000) * tpCostPerMl : 0;
    diCost =
      di && di.cost_zar
        ? parseFloat(recipe.distillate_qty_ml || 0) * parseFloat(di.cost_zar)
        : 0;
  }

  const pkRate =
    recipe.packaging_manual_zar != null && recipe.packaging_manual_zar !== ""
      ? parseFloat(recipe.packaging_manual_zar)
      : pk && pk.cost_zar
        ? parseFloat(pk.cost_zar)
        : 0;
  const pkCost =
    pkRate > 0 ? parseFloat(recipe.packaging_qty || 1) * pkRate : 0;

  const lbRate =
    recipe.labour_manual_zar != null && recipe.labour_manual_zar !== ""
      ? parseFloat(recipe.labour_manual_zar)
      : lb && lb.cost_zar
        ? parseFloat(lb.cost_zar)
        : 0;
  const lbCost = lbRate > 0 ? parseFloat(recipe.labour_qty || 1) * lbRate : 0;

  const batchSize = Math.max(1, parseInt(recipe.batch_size || 1));
  const labTests = Array.isArray(recipe.lab_tests) ? recipe.lab_tests : [];
  const labTotal = labTests.reduce((s, id) => {
    const t = CANNALYTICS_TESTS.find((x) => x.id === id);
    return s + (t ? t.price : 0);
  }, 0);
  const labPerUnit = labTotal / batchSize;
  const transPerU = parseFloat(recipe.transport_cost_zar || 0) / batchSize;
  const miscPerU = parseFloat(recipe.misc_cost_zar || 0) / batchSize;

  return (
    hwCost +
    tpCost +
    diCost +
    pkCost +
    lbCost +
    labPerUnit +
    transPerU +
    miscPerU
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtZar = (n, abs = false) => {
  const val = abs ? Math.abs(parseFloat(n) || 0) : parseFloat(n) || 0;
  return `R${val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmt = (n, dp = 2) => (parseFloat(n) || 0).toFixed(dp);
const pctColour = (pct, profile = "general_retail") => {
  if (profile === "food_beverage")
    return pct >= 65 ? "#2E7D32" : pct >= 55 ? "#E65100" : "#c62828";
  if (profile === "cannabis_retail")
    return pct >= 50 ? "#2E7D32" : pct >= 30 ? "#E65100" : "#c62828";
  if (profile === "cannabis_dispensary")
    return pct >= 50 ? "#2E7D32" : pct >= 35 ? "#E65100" : "#c62828";
  return pct >= 35 ? "#2E7D32" : pct >= 20 ? "#E65100" : "#c62828";
};

// GAP-01 fix — SA VAT is 15%. All orders.total values are VAT-inclusive.
// Divide by VAT_RATE at every revenue aggregation point.
const VAT_RATE = 1.15;

// ─── WP-FIN S1: Periods — quarters + custom added ────────────────────────────
const PERIODS = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "mtd", label: "This month" },
  { id: "q1", label: "Q1 (Jan–Mar)" },
  { id: "q2", label: "Q2 (Apr–Jun)" },
  { id: "q3", label: "Q3 (Jul–Sep)" },
  { id: "q4", label: "Q4 (Oct–Dec)" },
  { id: "ytd", label: "This year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom range" },
];

function periodStart(period, customFrom) {
  const now = new Date();
  const yr = now.getFullYear();
  if (period === "30d") return new Date(now - 30 * 86400000).toISOString();
  if (period === "90d") return new Date(now - 90 * 86400000).toISOString();
  if (period === "mtd") return new Date(yr, now.getMonth(), 1).toISOString();
  if (period === "q1") return new Date(yr, 0, 1).toISOString();
  if (period === "q2") return new Date(yr, 3, 1).toISOString();
  if (period === "q3") return new Date(yr, 6, 1).toISOString();
  if (period === "q4") return new Date(yr, 9, 1).toISOString();
  if (period === "ytd") return new Date(yr, 0, 1).toISOString();
  if (period === "custom" && customFrom)
    return new Date(customFrom).toISOString();
  return null;
}

function periodEnd(period, customTo) {
  const now = new Date();
  const yr = now.getFullYear();
  if (period === "q1") return new Date(yr, 3, 0, 23, 59, 59).toISOString();
  if (period === "q2") return new Date(yr, 6, 0, 23, 59, 59).toISOString();
  if (period === "q3") return new Date(yr, 9, 0, 23, 59, 59).toISOString();
  if (period === "q4") return new Date(yr, 12, 0, 23, 59, 59).toISOString();
  if (period === "custom" && customTo)
    return new Date(customTo + "T23:59:59").toISOString();
  return null;
}

function periodFilter(dateStr, period, customFrom, customTo) {
  if (!dateStr) return false;
  const start = periodStart(period, customFrom);
  const end = periodEnd(period, customTo);
  const d = new Date(dateStr);
  if (start && d < new Date(start)) return false;
  if (end && d > new Date(end)) return false;
  return true;
}

// ─── Chart constants ──────────────────────────────────────────────────────────
const CC = {
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  success: "#166534",
  danger: "#991B1B",
  warning: "#92400E",
  info: "#1E3A5F",
  gold: "#b5935a",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink400: "#474747",
  ink500: "#5A5A5A",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
};

// ── Premium Financial palette — semantic finance colors ──────────────────────
const FIN = {
  revenue:    "#059669",   // emerald — revenue, profit, positive
  cost:       "#DC2626",   // crimson — costs, losses, COGS
  rate:       "#2563EB",   // sapphire — margins, rates, net line
  structural: "#64748B",   // slate — overhead, neutral categories
  managed:    "#92400E",   // amber — loyalty, controllable costs
  grid:       "#E2E8F0",
  axis:       "#94A3B8",
  costCat:    ["#1E3A5F","#3B82F6","#B45309","#94A3B8"],
};

// ─── Waterfall helper ─────────────────────────────────────────────────────────
function wfCalc(steps) {
  let running = 0;
  return steps.map((s) => {
    if (s.type === "total") {
      const result = {
        label: s.label,
        offset: 0,
        display: Math.abs(s.value),
        value: s.value,
        type: s.type,
      };
      running = s.value;
      return result;
    }
    const isNeg = s.value < 0;
    const offset = isNeg ? running + s.value : running;
    running += s.value;
    return {
      label: s.label,
      offset,
      display: Math.abs(s.value),
      value: s.value,
      type: s.type,
    };
  });
}

// ─── Waterfall Chart ──────────────────────────────────────────────────────────
function WaterfallChart({
  revenue,
  totalCogs,
  grossProfit,
  totalOpexIncLoyalty,
  netProfit,
}) {
  if (revenue === 0) return null;
  const steps = wfCalc([
    { label: "Revenue", value: revenue, type: "total" },
    { label: "COGS", value: -Math.abs(totalCogs), type: "negative" },
    { label: "Gross Profit", value: grossProfit, type: "total" },
    { label: "OpEx", value: -Math.abs(totalOpexIncLoyalty), type: "negative" },
    { label: "Net Profit", value: netProfit, type: "total" },
  ]);
  const barColour = (entry) => {
    if (entry.type === "total") return entry.value >= 0 ? CC.accent : CC.danger;
    if (entry.type === "negative") return CC.danger;
    return CC.success;
  };
  const CustomBar = (props) => {
    const { x, y, width, height, index } = props;
    if (!height || height <= 0) return null;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={barColour(steps[index])}
        rx={3}
        ry={3}
      />
    );
  };
  const zarFmt = (v) =>
    `R${Math.abs(v).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={steps}
        margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
      >
        <CartesianGrid
          horizontal={true}
          vertical={false}
          stroke={FIN.grid}
          strokeWidth={0.5}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: FIN.axis, fontSize: 11, fontFamily: CC.font }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fill: FIN.axis, fontSize: 11, fontFamily: CC.font }}
          axisLine={false}
          tickLine={false}
          width={62}
          tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(v, name) => (name === "display" ? zarFmt(v) : null)}
              labelFormatter={(l) => l}
            />
          }
        />
        <ReferenceLine y={0} stroke={CC.ink150} strokeWidth={1} />
        <Bar
          dataKey="offset"
          stackId="wf"
          fill="transparent"
          isAnimationActive={false}
        />
        <Bar
          dataKey="display"
          stackId="wf"
          shape={<CustomBar />}
          isAnimationActive={false}
          maxBarSize={56}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PLMarginGauge({ value, label, color }) {
  const pct = Math.min(Math.max((value || 0) / 100, 0), 1);
  const r = 62,
    cx = 90,
    cy = 98,
    startAngle = -210,
    totalDeg = 240;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPath = (start, end) => {
    const x1 = cx + r * Math.cos(toRad(start)),
      y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end)),
      y2 = cy + r * Math.sin(toRad(end));
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  return (
    <svg
      viewBox="0 0 180 170"
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <path
        d={arcPath(startAngle, startAngle + totalDeg)}
        fill="none"
        stroke={CC.ink150}
        strokeWidth={14}
        strokeLinecap="round"
      />
      {pct > 0.01 && (
        <path
          d={arcPath(startAngle, startAngle + totalDeg * pct)}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
        />
      )}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize="24"
        fontWeight="400"
        fontFamily={CC.font}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value !== null && value !== undefined ? `${value.toFixed(1)}%` : "—"}
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fill={CC.ink400}
        fontSize="9"
        fontWeight="600"
        fontFamily={CC.font}
        letterSpacing="0.08em"
      >
        {(label || "").toUpperCase()}
      </text>
    </svg>
  );
}

function WRow({
  label,
  value,
  sub,
  indent = 0,
  bold = false,
  highlight,
  negative,
  dim,
  borderTop,
}) {
  const col =
    highlight === "green"
      ? "#2E7D32"
      : highlight === "red"
        ? "#c62828"
        : highlight === "orange"
          ? "#E65100"
          : "#333";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: `${bold ? 14 : 10}px ${16 + indent * 20}px`,
        borderTop: borderTop ? "2px solid #e0e0e0" : undefined,
        borderBottom: bold ? "1px solid #e8e8e8" : undefined,
        background: bold ? "#fafaf8" : "transparent",
      }}
    >
      <div>
        <div
          style={{
            fontSize: bold ? 15 : 13,
            fontWeight: bold ? 700 : 400,
            color: dim ? "#bbb" : "#555",
          }}
        >
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{sub}</div>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: bold ? 18 : 14,
            fontWeight: bold ? 700 : 500,
            color: dim ? "#bbb" : col,
          }}
        >
          {negative && value > 0 ? `−${fmtZar(value, true)}` : fmtZar(value)}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, icon }) {
  return (
    <div
      style={{
        padding: "10px 16px",
        background: "#f0ede8",
        fontSize: 11,
        fontWeight: 700,
        color: "#888",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span>{icon}</span>
      {label}
    </div>
  );
}

function DataBadge({ label, ok, count }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        background: ok ? "rgba(46,125,50,0.07)" : "rgba(198,40,40,0.07)",
        border: `1px solid ${ok ? "#a5d6a7" : "#ef9a9a"}`,
        borderRadius: 20,
        fontSize: 11,
        color: ok ? "#2E7D32" : "#c62828",
        fontWeight: 500,
      }}
    >
      <span>{ok ? "✓" : "⚠"}</span>
      {label}
      {count !== undefined && (
        <span
          style={{
            background: ok ? "#c8e6c9" : "#ffcdd2",
            borderRadius: 10,
            padding: "0 6px",
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function HQProfitLoss() {
  const { fxRate, fxLoading } = useFxRate();
  const usdZar = fxRate?.usd_zar || 18.5;
  const { tenant, tenantId, industryProfile } = useTenant();

  const ctx = usePageContext("pl", null);

  const [orders, setOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [localInputs, setLocalInputs] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loyaltyTxns, setLoyaltyTxns] = useState([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataErrors, setDataErrors] = useState({});

  // ── WP-FIN S1: new state ──────────────────────────────────────────────────
  const [period, setPeriod] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [showExpMgr, setShowExpMgr] = useState(false);
  const [productionMovements, setProductionMovements] = useState([]);
  // wholesaleMovements removed — sale_out is not a revenue source (LL-203)
  const [inventoryItems, setInventoryItems] = useState([]);
  const [fxScenario, setFxScenario] = useState("");
  const [toast, setToast] = useState(null);
  // ── WP-FINANCIALS Phase 2: IFRS view state ─────────────────────────────
  const [ifrsView, setIfrsView] = useState(false);
  const [depreciationEntries, setDepreciationEntries] = useState([]);
  const [equityLedger, setEquityLedger] = useState(null);
  const [statementStatus, setStatementStatus] = useState("draft");
  const [setupComplete, setSetupComplete] = useState(null);
  // Dismissible setup wizard — resets on tab remount so it reappears next visit
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [orderItemsCogs, setOrderItemsCogs] = useState(null); // { revenue, cogs, byProduct }
  const [marginSortMode, setMarginSortMode] = useState("gp"); // "gp" or "margin"
  // LL-231: cannabis_dispensary revenue from dispensing_log, NOT orders
  const [dispensingRevenue, setDispensingRevenue] = useState(0);
  const [dispensingCount, setDispensingCount] = useState(0);
  const [dispensingProductMargins, setDispensingProductMargins] = useState([]);
  // GAP-02: manual journal adjustments flowing to P&L
  const [journalAdjustments, setJournalAdjustments] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── WP-FIN S1: fetch expenses from DB ────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    if (!tenantId) return;
    try {
      let q = supabase.from("expenses").select("*").eq("tenant_id", tenantId);
      const start = periodStart(period, customFrom);
      const end = periodEnd(period, customTo);
      if (start) q = q.gte("expense_date", start.slice(0, 10));
      if (end) q = q.lte("expense_date", end.slice(0, 10));
      const { data } = await q;
      setExpenses(data || []);
    } catch (_) {}

    // GAP-02: Fetch manual journal adjustments for the period.
    // 'auto' journals are excluded — they duplicate expenses already in the expenses table
    // (Smart Capture writes to both expenses + journal_entries simultaneously).
    // Only manual adjustments (accruals, write-offs, corrections) flow here.
    try {
      const start = periodStart(period, customFrom);
      const end   = periodEnd(period, customTo);
      let jq = supabase
        .from("journal_entries")
        .select(`
          id, journal_date, journal_type, status, description, reference,
          journal_lines ( account_code, account_name, debit_amount, credit_amount, description )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "posted")
        .neq("journal_type", "auto");   // exclude Smart Capture auto-posts
      if (start) jq = jq.gte("journal_date", start.slice(0, 10));
      if (end)   jq = jq.lte("journal_date", end.slice(0, 10));
      const { data: jData } = await jq;

      // Net each line against COA account type
      const revAdj  = [];   // credits to revenue accounts (40xxx, 49xxx, 70xxx finance)
      const cogsAdj = [];   // debits to cogs accounts (50xxx)
      const opexAdj = [];   // debits to opex/finance expense accounts (60xxx-70100)

      (jData || []).forEach(je => {
        (je.journal_lines || []).forEach(line => {
          const code = parseInt(line.account_code, 10);
          const net  = (parseFloat(line.debit_amount) || 0) - (parseFloat(line.credit_amount) || 0);
          if (net === 0) return;
          const entry = {
            journalId:   je.id,
            date:        je.journal_date,
            ref:         je.reference,
            journalDesc: je.description,
            accountCode: line.account_code,
            accountName: line.account_name,
            lineDesc:    line.description,
            net,
          };
          if (code >= 40000 && code < 50000) {
            // Revenue account — net credit (negative net) = additional revenue
            if (net < 0) revAdj.push({ ...entry, amount: Math.abs(net) });
          } else if (code >= 50000 && code < 60000) {
            // COGS account — net debit (positive net) = additional COGS
            if (net > 0) cogsAdj.push({ ...entry, amount: net });
          } else if ((code >= 60000 && code < 70000) || code === 70100) {
            // OpEx or finance expense — net debit = additional expense
            if (net > 0) opexAdj.push({ ...entry, amount: net });
          }
        });
      });

      setJournalAdjustments({
        revAdj,
        cogsAdj,
        opexAdj,
        totalRevAdj:  revAdj.reduce((s, x) => s + x.amount, 0),
        totalCogsAdj: cogsAdj.reduce((s, x) => s + x.amount, 0),
        totalOpexAdj: opexAdj.reduce((s, x) => s + x.amount, 0),
        count: revAdj.length + cogsAdj.length + opexAdj.length,
      });
    } catch (_) {
      setJournalAdjustments({ revAdj:[], cogsAdj:[], opexAdj:[], totalRevAdj:0, totalCogsAdj:0, totalOpexAdj:0, count:0 });
    }
  }, [tenantId, period, customFrom, customTo]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // LL-231: cannabis_dispensary revenue source — dispensing_log × sell_price
  const fetchDispensingRevenue = useCallback(async () => {
    if (!tenantId || industryProfile !== "cannabis_dispensary") return;
    try {
      let q = supabase
        .from("dispensing_log")
        .select("quantity_dispensed, inventory_item_id, dispensed_at, is_voided")
        .eq("tenant_id", tenantId)
        .neq("is_voided", true);
      const start = periodStart(period, customFrom);
      const end = periodEnd(period, customTo);
      if (start) q = q.gte("dispensed_at", start);
      if (end) q = q.lte("dispensed_at", end);
      const { data: dlData } = await q;
      const itemPrices = {};
      inventoryItems.forEach((i) => {
        itemPrices[i.id] = parseFloat(i.sell_price || 0);
      });
      const events = dlData || [];
      const rev = events.reduce(
        (s, dl) =>
          s + (dl.quantity_dispensed || 0) * (itemPrices[dl.inventory_item_id] || 0),
        0,
      );
      setDispensingRevenue(rev);
      setDispensingCount(events.length);
      const itemMap = {};
      events.forEach((dl) => {
        const item = inventoryItems.find((i) => i.id === dl.inventory_item_id);
        if (!item) return;
        const qty = parseFloat(dl.quantity_dispensed || 0);
        const itemRev  = qty * parseFloat(item.sell_price || 0);
        const itemCogs = qty * parseFloat(item.weighted_avg_cost || 0);
        if (!itemMap[item.id]) itemMap[item.id] = { name: item.name, units: 0, revenue: 0, cogs: 0 };
        itemMap[item.id].units   += qty;
        itemMap[item.id].revenue += itemRev;
        itemMap[item.id].cogs    += itemCogs;
      });
      const dpMargins = Object.values(itemMap)
        .map((d) => ({ ...d, gp: d.revenue - d.cogs, margin: d.revenue > 0 ? ((d.revenue - d.cogs) / d.revenue) * 100 : 0 }))
        .filter((d) => d.revenue > 0 && d.cogs > 0);
      setDispensingProductMargins(dpMargins);
    } catch (_) {
      setDispensingRevenue(0);
      setDispensingCount(0);
      setDispensingProductMargins([]);
    }
  }, [tenantId, industryProfile, period, customFrom, customTo, inventoryItems]);

  useEffect(() => {
    fetchDispensingRevenue();
  }, [fetchDispensingRevenue]);

  // ── WP-FINANCIALS Phase 2: fetch depreciation + equity ledger ──────────
  useEffect(() => {
    if (!tenantId) return;
    const yr = `FY${new Date().getFullYear()}`;
    Promise.all([
      supabase.from("depreciation_entries")
        .select("depreciation")
        .eq("tenant_id", tenantId),
      supabase.from("equity_ledger")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("financial_year", yr)
        .maybeSingle(),
    ]).then(([dep, eq]) => {
      setDepreciationEntries(dep.data || []);
      if (eq.data) {
        setEquityLedger(eq.data);
        setStatementStatus(eq.data.year_end_closed ? "signed" : "draft");
      }
    });
  }, [tenantId]);

  // WP-FINANCIALS Phase 0 — setup gate
  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("tenant_config")
      .select("financial_setup_complete")
      .eq("tenant_id", tenantId)
      .single()
      .then(({ data }) => setSetupComplete(data?.financial_setup_complete ?? false));
  }, [tenantId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const errors = {};
    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11] = await Promise.all([
      supabase
        .from("orders")
        .select("id, created_at, total, status, items_count, currency")
        .eq("tenant_id", tenantId)
        .not("status", "in", '("cancelled","failed")'),
      supabase
        .from("purchase_orders")
        .select(
          "id, order_date, landed_cost_zar, po_status, status, subtotal, shipping_cost_usd, usd_zar_rate",
        )
        .eq("tenant_id", tenantId)
        .in("po_status", ["received", "complete"]),
      supabase.from("product_cogs").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("supplier_products").select("*").eq("is_active", true),
      supabase.from("local_inputs").select("*").eq("is_active", true),
      supabase.from("product_pricing").select("*").eq("tenant_id", tenantId),
      supabase
        .from("loyalty_transactions")
        .select("points, transaction_type, created_at")
        .eq("tenant_id", tenantId),
      supabase
        .from("loyalty_config")
        .select("redemption_value_zar, breakage_rate")
        .maybeSingle(),
      supabase
        .from("stock_movements")
        .select("item_id, quantity, unit_cost, movement_type, created_at")
        .eq("tenant_id", tenantId)
        .eq("movement_type", "production_out"),
      // sale_out movements removed from P&L — not a revenue source (LL-203)
      Promise.resolve({ data: [] }),
      supabase
        .from("inventory_items")
        .select("id, sell_price, name, weighted_avg_cost, category")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
    ]);
    if (r1.error) errors.orders = r1.error.message;
    if (r2.error) errors.pos = r2.error.message;
    if (r3.error) errors.cogs = r3.error.message;
    if (r7.error) errors.loyalty = r7.error.message;
    setOrders(r1.data || []);
    setPurchaseOrders(r2.data || []);
    setRecipes(r3.data || []);
    setSupplierProducts(r4.data || []);
    setLocalInputs(r5.data || []);
    setPricing(r6.data || []);
    setLoyaltyTxns(r7.data || []);
    setLoyaltyConfig(r8.data || null);
    setProductionMovements(r9.data || []);
    // setWholesaleMovements removed (LL-203)
    setInventoryItems(r11.data || []);
    setDataErrors(errors);

    // WP-P&L-INTELLIGENCE: fetch order_items with AVCO for real COGS
    try {
      const paidOrderIds = (r1.data || []).filter(o => o.status === "paid").map(o => o.id);
      const oiResults = [];
      for (let i = 0; i < paidOrderIds.length; i += 50) {
        const chunk = paidOrderIds.slice(i, i + 50);
        const { data } = await supabase
          .from("order_items")
          .select("order_id, product_name, quantity, line_total, product_metadata, created_at")
          .in("order_id", chunk);
        if (data) oiResults.push(...data);
      }
      // Build per-product aggregation (filtered by period later in render)
      setOrderItemsCogs({ items: oiResults, orderDates: Object.fromEntries((r1.data || []).map(o => [o.id, o.created_at])) });
    } catch (_) {
      setOrderItemsCogs(null);
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (tenantId) fetchAll();
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // v2.3: realtime revenue tiles
  useEffect(() => {
    const sub = supabase
      .channel("hq-pl-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        fetchAll,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchAll]);

  // ── WP-FIN S1: OPEX + CAPEX from expenses table ───────────────────────────
  const totalOpex = expenses
    .filter((e) => ["opex", "wages", "tax", "other"].includes(e.category))
    .reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0);
  const totalCapex = expenses
    .filter((e) => e.category === "capex")
    .reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0);

  // ── P&L Calculations ──────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) =>
    periodFilter(o.created_at, period, customFrom, customTo),
  );
  // GAP-01: orders.total is VAT-inclusive. Divide by 1.15 to get ex-VAT revenue.
  // SA VAT = 15%. This affects all downstream calculations: grossProfit,
  // grossMarginPct, netProfit, netMarginPct, FX scenario, loyalty cost %.
  const websiteRevenue = filteredOrders.reduce(
    (s, o) => s + (parseFloat(o.total) || 0) / VAT_RATE,
    0,
  );
  const totalUnitsSold = filteredOrders.reduce(
    (s, o) => s + (parseInt(o.items_count) || 1),
    0,
  );

  // Wholesale revenue: will come from wholesale_orders table when populated
  // sale_out stock_movements are NOT revenue — removed (LL-203)
  const totalRevenue = websiteRevenue;

  // WP-FIN S2: actual COGS from stock_movements production_out × AVCO
  const filteredProductionMovements = productionMovements.filter((m) =>
    periodFilter(m.created_at, period, customFrom, customTo),
  );
  const hasActualCogs = filteredProductionMovements.length > 0;
  const actualCogs = hasActualCogs
    ? filteredProductionMovements.reduce((s, m) => {
        const unitCost = parseFloat(m.unit_cost ?? 0) || 0;
        return s + Math.abs(parseFloat(m.quantity) || 0) * unitCost;
      }, 0)
    : null;

  const filteredPOs = purchaseOrders.filter((po) =>
    periodFilter(po.order_date, period, customFrom, customTo),
  );
  const completedPOs = filteredPOs.filter(
    (po) => parseFloat(po.landed_cost_zar) > 0,
  );
  const incompletePOs = filteredPOs.filter(
    (po) => parseFloat(po.landed_cost_zar) <= 0 && parseFloat(po.subtotal) > 0,
  );
  const totalInventoryInvestment = completedPOs.reduce(
    (s, po) => s + parseFloat(po.landed_cost_zar),
    0,
  );

  const recipesWithCogs = recipes.map((r) => ({
    ...r,
    cogsPerUnit: calcCogsTotal(r, supplierProducts, localInputs, usdZar),
  }));

  const avgFullCogsPerUnit =
    recipesWithCogs.length > 0
      ? recipesWithCogs.reduce((s, r) => s + r.cogsPerUnit, 0) /
        recipesWithCogs.length
      : 0;

  const avgImportCogsPerUnit =
    recipesWithCogs.length > 0
      ? recipesWithCogs.reduce((s, r) => {
          const hw = supplierProducts.find((p) => p.id === r.hardware_item_id);
          const tp = supplierProducts.find((p) => p.id === r.terpene_item_id);
          const hwCost = hw
            ? parseFloat(r.hardware_qty || 1) *
                parseFloat(hw.unit_price_usd) *
                usdZar +
              parseFloat(r.shipping_alloc_zar || 0)
            : 0;
          const tpUl = parseFloat(r.terpene_qty_ul || 0);
          const tpCostPerMl = tp
            ? (parseFloat(tp.unit_price_usd) / 50) * usdZar
            : 0;
          const tpCost = tp ? (tpUl / 1000) * tpCostPerMl : 0;
          return s + hwCost + tpCost;
        }, 0) / recipesWithCogs.length
      : 0;

  const avgLocalCogsPerUnit = avgFullCogsPerUnit - avgImportCogsPerUnit;
  const importCogsSold = avgImportCogsPerUnit * totalUnitsSold;
  const localCogsTotal = avgLocalCogsPerUnit * totalUnitsSold;
  const importCogsHardware = importCogsSold;
  // WP-P&L-INTELLIGENCE: order_items COGS (best source — transaction-level AVCO)
  const filteredOI = orderItemsCogs?.items?.filter((oi) => {
    const orderDate = orderItemsCogs.orderDates?.[oi.order_id];
    return orderDate && periodFilter(orderDate, period, customFrom, customTo);
  }) || [];
  const oiCogsTotal = filteredOI.reduce((s, oi) => {
    const avco = parseFloat(oi.product_metadata?.weighted_avg_cost || 0);
    return s + (oi.quantity || 0) * avco;
  }, 0);
  const oiRevenueTotal = filteredOI.reduce((s, oi) => s + (parseFloat(oi.line_total) || 0), 0);
  const hasOrderItemsCogs = filteredOI.length > 0 && oiCogsTotal > 0;

  // Priority: order_items AVCO > production_out AVCO > recipe estimates
  const totalCogs = hasOrderItemsCogs
    ? oiCogsTotal
    : actualCogs !== null ? actualCogs : avgFullCogsPerUnit * totalUnitsSold;
  const cogsSource = hasOrderItemsCogs ? "actual" : actualCogs !== null ? "production" : "estimated";
  // GAP-02: grossProfit and grossMarginPct now computed below after journal adjustments

  // Per-product margin data for "Margin by Product" section
  const productMargins = (() => {
    const map = {};
    filteredOI.forEach((oi) => {
      const name = oi.product_name || "Unknown";
      const avco = parseFloat(oi.product_metadata?.weighted_avg_cost || 0);
      if (!map[name]) map[name] = { units: 0, revenue: 0, cogs: 0 };
      map[name].units += oi.quantity || 0;
      // GAP-01: line_total is VAT-inclusive — divide by VAT_RATE for ex-VAT margin calc
      map[name].revenue += (parseFloat(oi.line_total) || 0) / VAT_RATE;
      map[name].cogs += (oi.quantity || 0) * avco;
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        units: d.units,
        revenue: d.revenue,
        cogs: d.cogs,
        gp: d.revenue - d.cogs,
        margin: d.revenue > 0 ? ((d.revenue - d.cogs) / d.revenue) * 100 : 0,
      }))
      .filter((p) => p.revenue > 0 && p.cogs > 0);
  })();

  const redemptionValue = loyaltyConfig?.redemption_value_zar ?? 0.1;
  const breakageRate = loyaltyConfig?.breakage_rate ?? 0.3;
  const costPerPointIssued = redemptionValue * (1 - breakageRate);

  const filteredLoyaltyEarned = loyaltyTxns.filter(
    (t) =>
      periodFilter(t.created_at, period, customFrom, customTo) &&
      [
        "EARNED",
        "earned",
        "EARNED_POINTS",
        "SCAN",
        "survey",
        "birthday_bonus",
      ].includes(t.transaction_type),
  );
  const earnedPoints = filteredLoyaltyEarned.reduce(
    (s, t) => s + (t.points || 0),
    0,
  );
  const loyaltyCost = earnedPoints * costPerPointIssued;
  // GAP-02: include manual journal adjustments in final totals
  const jAdj = journalAdjustments || { totalRevAdj:0, totalCogsAdj:0, totalOpexAdj:0, count:0 };
  const totalOpexIncLoyalty = totalOpex + loyaltyCost + jAdj.totalOpexAdj;
  const adjustedRevenue     = totalRevenue + jAdj.totalRevAdj;
  const adjustedCogs        = totalCogs    + jAdj.totalCogsAdj;
  // LL-231: route revenue source by profile — must be declared before grossProfit
  const baseRevenue = industryProfile === "cannabis_dispensary" ? dispensingRevenue : websiteRevenue;
  const profileRevenue = baseRevenue + jAdj.totalRevAdj;

  const grossProfit         = profileRevenue - adjustedCogs;
  const grossMarginPct      = profileRevenue > 0 ? (grossProfit / profileRevenue) * 100 : 0;
  const netProfit           = grossProfit - totalOpexIncLoyalty;
  const netMarginPct        = profileRevenue > 0 ? (netProfit / profileRevenue) * 100 : 0;

  const bestSkuMargin = (() => {
    let best = null;
    pricing.forEach((p) => {
      const recipe = recipesWithCogs.find((r) => r.id === p.product_cogs_id);
      if (!recipe || !p.sell_price_zar) return;
      const margin =
        ((parseFloat(p.sell_price_zar) - recipe.cogsPerUnit) /
          parseFloat(p.sell_price_zar)) *
        100;
      if (!best || margin > best.margin)
        best = {
          name: recipe.product_name,
          channel: p.channel,
          sell: p.sell_price_zar,
          cogs: recipe.cogsPerUnit,
          margin,
        };
    });
    return best;
  })();

  const avgCogsPerUnit =
    recipesWithCogs.length > 0
      ? recipesWithCogs.reduce((s, r) => s + r.cogsPerUnit, 0) /
        recipesWithCogs.length
      : 0;
  const avgSellPrice = (() => {
    const prices = pricing.filter(
      (p) => p.sell_price_zar && p.channel === "retail",
    );
    return prices.length > 0
      ? prices.reduce((s, p) => s + parseFloat(p.sell_price_zar), 0) /
          prices.length
      : 0;
  })();
  const breakEvenUnits =
    avgSellPrice > avgCogsPerUnit && totalOpexIncLoyalty > 0
      ? Math.ceil(totalOpexIncLoyalty / (avgSellPrice - avgCogsPerUnit))
      : null;

  const scenarioRate = parseFloat(fxScenario) || usdZar;
  const scenarioImportCogs =
    usdZar > 0 ? importCogsSold * (scenarioRate / usdZar) : importCogsSold;
  const scenarioGross = websiteRevenue - scenarioImportCogs - localCogsTotal;
  const scenarioGrossMargin =
    totalRevenue > 0 ? (scenarioGross / totalRevenue) * 100 : 0;
  const hasDataErrors = Object.keys(dataErrors).length > 0;

  // ── WP-FINANCIALS Phase 2: IFRS computed values ─────────────────────────
  const depreciationTotal = depreciationEntries.reduce(
    (s, e) => s + (parseFloat(e.depreciation) || 0), 0
  );
  const expensesBySubcategory = expenses
    .filter(e => ["opex","wages","tax","other"].includes(e.category))
    .reduce((acc, e) => {
      const key = e.subcategory || "Other";
      acc[key] = (acc[key] || 0) + (parseFloat(e.amount_zar) || 0);
      return acc;
    }, {});
  const periodLabel = PERIODS.find(p => p.id === period)?.label || period;

  // WP-FINANCIAL-PROFILES: profile-adaptive labels and revenue source
  const PROFILE_LABELS = {
    cannabis_dispensary: {
      revenue: "Dispensing Revenue",
      revDesc: `${dispensingCount} dispensing event${dispensingCount !== 1 ? "s" : ""} \u00b7 Schedule 6 clinical records`,
      cogs: "Product Acquisition Cost",
      cogsDesc: "AVCO-weighted acquisition cost of dispensed products",
      gross: "Dispensing Margin",
      ifrsRev: "Revenue \u2014 medical dispensing services",
    },
    food_beverage: {
      revenue: "Food & Beverage Sales",
      revDesc: `${filteredOrders.length} orders \u00b7 ${totalUnitsSold} covers \u00b7 ex-VAT`,
      cogs: "Food Cost",
      cogsDesc: "Cost of food ingredients \u00b7 AVCO or recipe estimate",
      gross: "Gross Profit",
      ifrsRev: "Revenue \u2014 food and beverage sales",
    },
    cannabis_retail: {
      revenue: "Product Sales",
      revDesc: `${filteredOrders.length} orders \u00b7 ${totalUnitsSold} units \u00b7 ex-VAT`,
      cogs: "Cost of Goods Sold (AVCO)",
      cogsDesc: "Weighted average cost of goods sold",
      gross: "Gross Profit",
      ifrsRev: "Revenue from contracts with customers",
    },
    general_retail: {
      revenue: "Product Sales",
      revDesc: `${filteredOrders.length} orders \u00b7 ${totalUnitsSold} units \u00b7 ex-VAT`,
      cogs: "Cost of Goods Sold (AVCO)",
      cogsDesc: "Weighted average cost of goods sold",
      gross: "Gross Profit",
      ifrsRev: "Revenue from contracts with customers",
    },
  };
  const PL = PROFILE_LABELS[industryProfile] || PROFILE_LABELS.general_retail;

  const card = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #f0ede8",
    overflow: "hidden",
    marginBottom: 20,
  };
  const inputStyle = {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontFamily: T.font,
    fontSize: 14,
    boxSizing: "border-box",
  };

  // WP-FINANCIALS Phase 0: show setup wizard if not configured
  // Dismissible: user can close with ✕ — wizard reappears on next tab visit until complete
  if (setupComplete === false && !setupDismissed) {
    return (
      <HQFinancialSetup
        onComplete={() => setSetupComplete(true)}
        onDismiss={() => setSetupDismissed(true)}
      />
    );
  }

  return (
    <div style={{ fontFamily: T.font, color: "#333" }}>
      <WorkflowGuide
        context={ctx}
        tabId="pl"
        onAction={() => {}}
        defaultOpen={true}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
                fontSize: 22,
                fontWeight: 600,
                color: "#111827",
                letterSpacing: "-0.01em",
              }}
            >
              Profit & Loss
            </h2>
            <InfoTooltip id="pl-title" />
          </div>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>
            Live profit & loss · supplier cost to customer sale
            {lastUpdated && (
              <span style={{ color: "#bbb", marginLeft: 10 }}>
                · Updated{" "}
                {lastUpdated.toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                background: fxLoading ? "#f5f5f5" : "#e8f5e9",
                border: "1px solid #c8e6c9",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                color: "#2E7D32",
                fontWeight: 600,
              }}
            >
              {fxLoading
                ? "Loading FX…"
                : `USD/ZAR R${usdZar.toFixed(4)} ${fxRate?.source === "live" ? "🟢" : "🟡"}`}
            </div>
            <InfoTooltip id="pl-fx-rate" />
          </div>

          {/* WP-FIN S1: period selector with quarters + custom */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              ...inputStyle,
              fontWeight: 600,
              color: "#2d4a2d",
              cursor: "pointer",
              width: "auto",
            }}
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Custom date pickers */}
          {period === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ ...inputStyle, width: 140 }}
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ ...inputStyle, width: 140 }}
              />
            </>
          )}

          {/* WP-FINANCIALS Phase 2: IFRS view toggle */}
          <div style={{
            display:"flex", borderRadius:8, overflow:"hidden",
            border:"1px solid #E2E8F0", flexShrink:0,
          }}>
            {[
              { id:false, label:"\uD83D\uDCCA Dashboard" },
              { id:true,  label:"\uD83D\uDCCB IFRS Statement" },
            ].map(opt => (
              <button key={String(opt.id)}
                onClick={() => setIfrsView(opt.id)}
                style={{
                  padding:"7px 14px", border:"none", cursor:"pointer",
                  fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600,
                  background: ifrsView===opt.id ? "#1A3D2B" : "#fff",
                  color: ifrsView===opt.id ? "#fff" : "#6B7280",
                  transition:"all 0.15s",
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #e0e0e0",
              background: "#fafafa",
              color: "#555",
              cursor: loading ? "wait" : "pointer",
              fontFamily: T.font,
              fontSize: 13,
              fontWeight: 600,
              opacity: loading ? 0.5 : 1,
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Data source status strip */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 20,
          padding: "12px 16px",
          background: hasDataErrors ? "#fff8f8" : "#f8fdf9",
          border: `1px solid ${hasDataErrors ? "#ffcdd2" : "#c8e6c9"}`,
          borderRadius: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#888",
            alignSelf: "center",
            marginRight: 4,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Data sources:
        </span>
        <DataBadge
          label="Orders"
          ok={!dataErrors.orders && orders.length >= 0}
          count={filteredOrders.length}
        />
        <DataBadge
          label="Purchase Orders"
          ok={!dataErrors.pos && purchaseOrders.length >= 0}
          count={completedPOs.length}
        />
        {incompletePOs.length > 0 && (
          <DataBadge
            label={`${incompletePOs.length} PO${incompletePOs.length !== 1 ? "s" : ""} incomplete (R0 landed — not counted)`}
            ok={false}
          />
        )}
        <DataBadge
          label="COGS Recipes"
          ok={!dataErrors.cogs && recipes.length >= 0}
          count={recipes.length}
        />
        <DataBadge
          label="Pricing"
          ok={pricing.length > 0}
          count={pricing.length}
        />
        <DataBadge
          label="Loyalty"
          ok={!dataErrors.loyalty}
          count={filteredLoyaltyEarned.length}
        />
        <DataBadge
          label="Wholesale"
          ok={true}
          count={0}
        />
        <DataBadge label="Expenses" ok={true} count={expenses.length} />
        {hasDataErrors && (
          <div
            style={{
              fontSize: 11,
              color: "#c62828",
              alignSelf: "center",
              marginLeft: 4,
            }}
          >
            {Object.entries(dataErrors).map(([k, v]) => (
              <span key={k} style={{ marginRight: 8 }}>
                ⚠ {k}: {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* WP-FINANCIALS Phase 9: Print/PDF export */}
      {ifrsView && !loading && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <button
            onClick={() => {
              import("../../utils/exportFinancialStatements").then(m => {
                m.exportFinancialStatementsPDF({
                  tenantName: tenant?.name,
                  vatNumber: null,
                  financialYear: `FY${new Date().getFullYear()}`,
                  preparedDate: new Date().toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"}),
                  totalRevenue, totalCogs, grossProfit, grossMarginPct,
                  totalOpex: totalOpexIncLoyalty, depreciationTotal,
                  netProfit, netMarginPct,
                  expensesBySubcategory,
                  equityLedger, shareCapital: equityLedger?.share_capital || 0,
                  openingRetained: equityLedger?.opening_retained_earnings || 0,
                  statementStatus,
                });
              });
            }}
            style={{
              padding:"8px 18px", border:"1.5px solid #2D6A4F", borderRadius:8,
              background:"#ECFDF5", color:"#1A3D2B", fontSize:13, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit",
            }}
          >{"\uD83D\uDDA8\uFE0F"} Print / Save PDF</button>
        </div>
      )}

      {/* WP-FINANCIALS Phase 2: IFRS Statement View */}
      {ifrsView && !loading && (
        <IFRSStatementView
          tenantName={tenant?.name}
          financialYear={`FY${new Date().getFullYear()}`}
          period={periodLabel}
          revenueIfrsLabel={PL.ifrsRev}
          totalRevenue={profileRevenue}
          totalCogs={totalCogs}
          grossProfit={grossProfit}
          grossMarginPct={grossMarginPct}
          depreciationTotal={depreciationTotal}
          expensesBySubcategory={expensesBySubcategory}
          loyaltyCost={loyaltyCost}
          totalOpexIncLoyalty={totalOpexIncLoyalty}
          netProfit={netProfit}
          netMarginPct={netMarginPct}
          equityLedger={equityLedger}
          statementStatus={statementStatus}
          fmtZar={fmtZar}
          fmt={fmt}
        />
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
          Loading P&L data…
        </div>
      ) : !ifrsView ? (
        <>
          {/* Waterfall Chart */}
          {websiteRevenue > 0 && (
            <div style={{ marginBottom: 24 }}>
              <ChartCard title="P&L Waterfall" subtitle="Revenue → COGS → Gross → OpEx → Net" accent="green" height={300}>
                <WaterfallChart
                  revenue={adjustedRevenue}
                  totalCogs={totalCogs}
                  grossProfit={grossProfit}
                  totalOpexIncLoyalty={totalOpexIncLoyalty}
                  netProfit={netProfit}
                />
              </ChartCard>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* LEFT: P&L WATERFALL DETAIL */}
            <div>
              <div style={card}>
                <SectionHeader icon="💰" label="Revenue" />
                <WRow
                  label={PL.revenue}
                  sub={PL.revDesc}
                  value={baseRevenue}
                  indent={1}
                  highlight={baseRevenue > 0 ? "green" : undefined}
                />
                {/* Wholesale revenue: placeholder until wholesale_orders table is populated */}
                <WRow
                  label={`Total ${PL.revenue}`}
                  value={profileRevenue}
                  bold
                  highlight={profileRevenue > 0 ? "green" : undefined}
                />

                <SectionHeader icon="📦" label={PL.cogs} />
                <WRow
                  label={
                    hasActualCogs
                      ? "Cost of goods produced (actual — stock movements × AVCO)"
                      : "Imported hardware & terpenes (recipe cost estimate)"
                  }
                  sub={
                    hasActualCogs
                      ? `${filteredProductionMovements.length} production movement${filteredProductionMovements.length !== 1 ? "s" : ""} · AVCO weighted average cost · actual material usage`
                      : avgImportCogsPerUnit > 0
                        ? `R${fmt(avgImportCogsPerUnit)} avg import/unit × ${totalUnitsSold} units sold · from ${recipesWithCogs.length} active recipe${recipesWithCogs.length !== 1 ? "s" : ""}${incompletePOs.length > 0 ? ` · ⚠ ${incompletePOs.length} incomplete PO${incompletePOs.length !== 1 ? "s" : ""} excluded` : ""}`
                        : "⚠ Set hardware & terpene prices in HQ → Suppliers"
                  }
                  value={importCogsHardware}
                  indent={1}
                  negative
                  dim={avgImportCogsPerUnit === 0}
                />
                <WRow
                  label="Local inputs (distillate · packaging · labour)"
                  sub={
                    avgLocalCogsPerUnit > 0
                      ? `R${fmt(avgLocalCogsPerUnit)} avg local/unit × ${totalUnitsSold} units sold`
                      : "⚠ Set costs in HQ → Costing → Local Inputs tab"
                  }
                  value={localCogsTotal}
                  indent={1}
                  negative
                  dim={avgLocalCogsPerUnit === 0}
                />
                <WRow
                  label={`Total COGS${cogsSource === "actual" ? " (actual)" : cogsSource === "production" ? " (production)" : " (estimated)"}`}
                  value={totalCogs}
                  bold
                  negative
                  highlight={totalCogs > 0 ? "red" : undefined}
                />
                {totalInventoryInvestment > 0 && (
                  <div
                    style={{
                      margin: "0 16px 8px",
                      padding: "8px 12px",
                      background: "#f8f9fa",
                      border: "1px solid #e8e8e8",
                      borderRadius: 6,
                      fontSize: 11,
                      color: "#999",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      📦 Inventory investment this period (balance sheet, not
                      P&L) — {completedPOs.length} PO
                      {completedPOs.length !== 1 ? "s" : ""} totalling{" "}
                      <strong style={{ color: "#666" }}>
                        {fmtZar(totalInventoryInvestment)}
                      </strong>
                    </span>
                    <span
                      style={{
                        color: "#bbb",
                        marginLeft: 8,
                        whiteSpace: "nowrap",
                      }}
                    >
                      P&L shows {totalUnitsSold} units sold only
                    </span>
                  </div>
                )}

                {/* GAP-02 — Manual journal adjustments */}
                {jAdj.count > 0 && (
                  <>
                    <SectionHeader icon="📓" label="Journal Adjustments" />
                    {jAdj.revAdj.map((e, i) => (
                      <WRow
                        key={i}
                        label={e.accountName}
                        sub={`${e.ref || e.journalDesc} · ${e.date} · ${e.accountCode}`}
                        value={e.amount}
                        indent={1}
                        highlight="green"
                      />
                    ))}
                    {jAdj.cogsAdj.map((e, i) => (
                      <WRow
                        key={i}
                        label={e.accountName}
                        sub={`${e.ref || e.journalDesc} · ${e.date} · ${e.accountCode}`}
                        value={e.amount}
                        indent={1}
                        negative
                        highlight="red"
                      />
                    ))}
                    {jAdj.opexAdj.map((e, i) => (
                      <WRow
                        key={i}
                        label={e.accountName}
                        sub={`${e.ref || e.journalDesc} · ${e.date} · ${e.accountCode}`}
                        value={e.amount}
                        indent={1}
                        negative
                      />
                    ))}
                  </>
                )}
                {jAdj.count === 0 && (
                  <div style={{ padding:"6px 36px", fontSize:11, color:"#ccc", fontStyle:"italic" }}>
                    No manual journal adjustments for this period.
                  </div>
                )}
                <SectionHeader icon="📊" label={PL.gross} />
                <WRow
                  label={PL.gross}
                  sub={`Gross margin: ${fmt(grossMarginPct)}%`}
                  value={grossProfit}
                  bold
                  borderTop
                  highlight={
                    pctColour(grossMarginPct, industryProfile) === "#2E7D32"
                      ? "green"
                      : pctColour(grossMarginPct, industryProfile) === "#E65100"
                        ? "orange"
                        : "red"
                  }
                />

                {/* F&B primary KPI: Food Cost % */}
                {industryProfile === "food_beverage" && profileRevenue > 0 && (
                  <div
                    style={{
                      margin: "0 16px 12px",
                      padding: "12px 16px",
                      borderRadius: 8,
                      background:
                        (totalCogs / profileRevenue) * 100 < 30
                          ? "#F0FDF4"
                          : (totalCogs / profileRevenue) * 100 < 35
                            ? "#FFFBEB"
                            : "#FEF2F2",
                      border: `1px solid ${
                        (totalCogs / profileRevenue) * 100 < 30
                          ? "#BBF7D0"
                          : (totalCogs / profileRevenue) * 100 < 35
                            ? "#FDE68A"
                            : "#FECACA"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#92400E",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 3,
                          }}
                        >
                          Food Cost % — Primary KPI
                        </div>
                        <div style={{ fontSize: 11, color: "#555" }}>
                          Target: &lt;30% · Danger: &gt;35%
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color:
                            (totalCogs / profileRevenue) * 100 < 30
                              ? "#166534"
                              : (totalCogs / profileRevenue) * 100 < 35
                                ? "#92400E"
                                : "#991B1B",
                        }}
                      >
                        {((totalCogs / profileRevenue) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
                <SectionHeader icon="⚙️" label="Operating Costs" />

                {/* Loyalty cost */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 16px 8px 36px",
                    background:
                      loyaltyCost > 0 ? "rgba(181,147,90,0.04)" : "transparent",
                  }}
                >
                  <span style={{ flex: 2, fontSize: 13, color: "#555" }}>
                    Loyalty programme cost
                  </span>
                  <span style={{ fontSize: 11, color: "#aaa", flex: 2 }}>
                    {earnedPoints.toLocaleString()} pts × R
                    {fmt(costPerPointIssued, 4)}/pt
                    {loyaltyConfig
                      ? ` (R${fmt(redemptionValue, 2)} val · ${Math.round(breakageRate * 100)}% breakage)`
                      : " (default rates)"}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: loyaltyCost > 0 ? "#c62828" : "#bbb",
                      minWidth: 100,
                      textAlign: "right",
                    }}
                  >
                    {loyaltyCost > 0 ? `−${fmtZar(loyaltyCost)}` : "—"}
                  </span>
                  <div style={{ width: 24 }} />
                </div>

                {/* WP-FIN S1: DB-backed expenses list */}
                {expenses
                  .filter((e) =>
                    ["opex", "wages", "tax", "other"].includes(e.category),
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 16px 8px 36px",
                      }}
                    >
                      <span style={{ flex: 2, fontSize: 13, color: "#555" }}>
                        {item.description}
                        {item.subcategory && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#aaa",
                              marginLeft: 6,
                            }}
                          >
                            ({item.subcategory})
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#aaa",
                          minWidth: 60,
                          textAlign: "right",
                        }}
                      >
                        {item.expense_date?.slice(0, 7)}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#c62828",
                          minWidth: 100,
                          textAlign: "right",
                        }}
                      >
                        −{fmtZar(item.amount_zar)}
                      </span>
                      <div style={{ width: 24 }} />
                    </div>
                  ))}
                {expenses.filter((e) =>
                  ["opex", "wages", "tax", "other"].includes(e.category),
                ).length === 0 && (
                  <div
                    style={{
                      padding: "10px 36px",
                      fontSize: 12,
                      color: "#bbb",
                      fontStyle: "italic",
                    }}
                  >
                    No OPEX expenses for this period — add via Manage Expenses.
                  </div>
                )}

                {/* Manage Expenses button */}
                <div
                  style={{
                    padding: "10px 16px 10px 36px",
                    borderTop: "1px dashed #f0ede8",
                  }}
                >
                  <button
                    onClick={() => setShowExpMgr(true)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#2d4a2d",
                      color: "#fff",
                      cursor: "pointer",
                      fontFamily: T.font,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    + Manage Expenses
                  </button>
                </div>

                <WRow
                  label="Total OpEx (incl. loyalty)"
                  value={totalOpexIncLoyalty}
                  bold
                  negative
                  highlight={totalOpexIncLoyalty > 0 ? "red" : undefined}
                />

                <SectionHeader icon="🏁" label="Net Profit / Loss" />
                <div
                  style={{
                    padding: "20px 16px",
                    background: netProfit >= 0 ? "#f0f7f0" : "#fff8f8",
                    borderTop:
                      "2px solid " + (netProfit >= 0 ? "#c8e6c9" : "#ffcdd2"),
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 13, color: "#888", marginBottom: 4 }}
                      >
                        Net {netProfit >= 0 ? "Profit" : "Loss"}
                      </div>
                      <div
                        style={{
                          fontFamily: T.font, fontSize: 28, fontWeight: 700,
                          letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
                          color: netProfit >= 0 ? "#2E7D32" : "#c62828",
                        }}
                      >
                        {netProfit < 0 ? "−" : ""}
                        {fmtZar(Math.abs(netProfit))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{ fontSize: 12, color: "#888", marginBottom: 6 }}
                      >
                        Net Margin
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          color: pctColour(netMarginPct),
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmt(netMarginPct)}%
                      </div>
                    </div>
                  </div>
                  {websiteRevenue > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 16,
                          fontSize: 12,
                          color: "#888",
                          marginBottom: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          Gross margin:{" "}
                          <strong style={{ color: pctColour(grossMarginPct) }}>
                            {fmt(grossMarginPct)}%
                          </strong>
                        </span>
                        <span>
                          Net margin:{" "}
                          <strong style={{ color: pctColour(netMarginPct) }}>
                            {fmt(netMarginPct)}%
                          </strong>
                        </span>
                        <span>
                          Loyalty cost:{" "}
                          <strong style={{ color: "#b5935a" }}>
                            {fmtZar(loyaltyCost)} (
                            {earnedPoints.toLocaleString()} pts)
                          </strong>
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 4,
                          background: "#e0e0e0",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max(0, Math.min(100, netMarginPct))}%`,
                            background: pctColour(netMarginPct),
                            borderRadius: 4,
                            transition: "width 0.5s",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* WP-FIN S1: CAPEX memo card */}
              {totalCapex > 0 && (
                <div style={card}>
                  <SectionHeader icon="🏗️" label="Capital Expenditure (Memo)" />
                  {expenses
                    .filter((e) => e.category === "capex")
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "8px 16px 8px 36px",
                        }}
                      >
                        <span style={{ flex: 2, fontSize: 13, color: "#555" }}>
                          {item.description}
                        </span>
                        <span style={{ fontSize: 11, color: "#aaa" }}>
                          {item.expense_date}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "#E65100",
                            minWidth: 100,
                            textAlign: "right",
                          }}
                        >
                          {fmtZar(item.amount_zar)}
                        </span>
                      </div>
                    ))}
                  <WRow
                    label="Total CAPEX this period"
                    value={totalCapex}
                    bold
                    highlight="orange"
                    sub="Memo only — not deducted from Net Profit (Option A). Amortisation in WP-FIN S6."
                  />
                </div>
              )}
            </div>

            {/* WP-P&L-INTELLIGENCE: Margin by Product */}
            {productMargins.length > 0 && (
              <div style={{ ...card, marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px", borderBottom: "1px solid #eee" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.ink900 }}>
                    Gross Profit by Product
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[{ id: "gp", label: "By GP" }, { id: "margin", label: "By Margin %" }].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMarginSortMode(m.id)}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 3,
                          border: "1px solid #ddd", cursor: "pointer",
                          background: marginSortMode === m.id ? (T.accent) : "#fff",
                          color: marginSortMode === m.id ? "#fff" : "#666",
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "0 16px 12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", gap: 4, padding: "8px 0 4px", fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span>Product</span><span style={{ textAlign: "right" }}>Units</span><span style={{ textAlign: "right" }}>Revenue</span><span style={{ textAlign: "right" }}>COGS</span><span style={{ textAlign: "right" }}>GP</span><span style={{ textAlign: "right" }}>Margin</span>
                  </div>
                  {[...productMargins]
                    .sort((a, b) => marginSortMode === "gp" ? b.gp - a.gp : b.margin - a.margin)
                    .slice(0, 10)
                    .map((p, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", gap: 4, padding: "6px 0", borderBottom: "1px solid #f5f5f5", fontSize: 12, alignItems: "center" }}>
                        <span style={{ color: "#333", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        <span style={{ textAlign: "right", color: "#666", fontVariantNumeric: "tabular-nums" }}>{p.units}</span>
                        <span style={{ textAlign: "right", color: "#333", fontVariantNumeric: "tabular-nums" }}>{fmtZar(p.revenue)}</span>
                        <span style={{ textAlign: "right", color: "#c62828", fontVariantNumeric: "tabular-nums" }}>−{fmtZar(p.cogs)}</span>
                        <span style={{ textAlign: "right", color: "#2E7D32", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtZar(p.gp)}</span>
                        <span style={{ textAlign: "right" }}>
                          <span style={{
                            display: "inline-block", padding: "2px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600,
                            background: p.margin >= 70 ? "#E8F5E9" : p.margin >= 50 ? "#FFF8E1" : "#FFEBEE",
                            color: p.margin >= 70 ? "#2E7D32" : p.margin >= 50 ? "#F57F17" : "#c62828",
                          }}>
                            {p.margin.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* RIGHT: INTEL PANELS */}
            <div>
              {/* Margin Gauges */}
              {websiteRevenue > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <ChartCard title="Margin Overview" subtitle="Gross & Net margin gauges" accent="amber" height={200}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        height: "100%",
                        gap: 8,
                      }}
                    >
                      <PLMarginGauge
                        value={grossMarginPct}
                        label="Gross Margin"
                        color={
                          pctColour(grossMarginPct, industryProfile) === "#2E7D32"
                            ? CC.success
                            : pctColour(grossMarginPct, industryProfile) === "#E65100"
                              ? CC.warning
                              : CC.danger
                        }
                      />
                      <PLMarginGauge
                        value={netMarginPct}
                        label="Net Margin"
                        color={
                          netMarginPct >= 20
                            ? CC.success
                            : netMarginPct >= 10
                              ? CC.warning
                              : CC.danger
                        }
                      />
                    </div>
                  </ChartCard>
                </div>
              )}

              {/* Cost Composition Donut */}
              {importCogsHardware + localCogsTotal + loyaltyCost + totalOpex >
                0 && (
                <div style={{ marginBottom: 20 }}>
                  <ChartCard title="Cost Composition" subtitle="Where every rand goes" accent="purple" height={240}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Import COGS",
                              value: Math.round(importCogsHardware),
                            },
                            {
                              name: "Local COGS",
                              value: Math.round(localCogsTotal),
                            },
                            {
                              name: "Loyalty Cost",
                              value: Math.round(loyaltyCost),
                            },
                            { name: "OpEx", value: Math.round(totalOpex) },
                          ].filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={80}
                          dataKey="value"
                          paddingAngle={3}
                          isAnimationActive={true}
                          animationDuration={600}
                        >
                          {FIN.costCat.map(
                            (c, i) => (
                              <Cell key={i} fill={c} />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          content={
                            <ChartTooltip
                              formatter={(v) => `R${v.toLocaleString("en-ZA")}`}
                            />
                          }
                        />
                        <Legend
                          iconSize={8}
                          iconType="square"
                          formatter={(v) => (
                            <span
                              style={{
                                fontSize: 11,
                                color: CC.ink500,
                                fontFamily: CC.font,
                              }}
                            >
                              {v}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}

              {/* Gross Margin Trend */}
              {(() => {
                const dayMap = {};
                orders.forEach((o) => {
                  const day = new Date(o.created_at).toLocaleDateString(
                    "en-ZA",
                    { month: "short", day: "numeric" },
                  );
                  dayMap[day] = dayMap[day] || { date: day, revenue: 0, cogs: 0 };
                  dayMap[day].revenue += parseFloat(o.total) || 0;
                  dayMap[day].cogs += avgFullCogsPerUnit * (parseInt(o.items_count) || 1);
                });
                const trendData = Object.values(dayMap)
                  .slice(-20)
                  .map((d) => ({
                    date: d.date,
                    marginPct: d.revenue > 0
                      ? parseFloat(((d.revenue - d.cogs) / d.revenue * 100).toFixed(2))
                      : 0,
                  }));
                if (trendData.length < 2) return null;
                const avgMargin = trendData.reduce((s, d) => s + d.marginPct, 0) / trendData.length;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <ChartCard
                      title="Gross Margin Trend"
                      subtitle="Daily gross margin % \u00b7 last 30 days"
                      height={240}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={trendData}
                          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                        >
                          <defs>
                            <linearGradient id="pl-margin-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={FIN.rate} stopOpacity={0.09} />
                              <stop offset="95%" stopColor={FIN.rate} stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            horizontal
                            vertical={false}
                            stroke={FIN.grid}
                            strokeWidth={0.5}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: FIN.axis, fontSize: 10, fontFamily: CC.font }}
                            axisLine={false}
                            tickLine={false}
                            dy={6}
                            interval="preserveStartEnd"
                            maxRotation={0}
                          />
                          <YAxis
                            tick={{ fill: FIN.axis, fontSize: 10, fontFamily: CC.font }}
                            axisLine={false}
                            tickLine={false}
                            width={42}
                            tickFormatter={(v) => `${v.toFixed(0)}%`}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip
                            content={
                              <ChartTooltip
                                formatter={(v) => `${parseFloat(v).toFixed(2)}%`}
                              />
                            }
                          />
                          <ReferenceLine
                            y={avgMargin}
                            stroke={FIN.rate}
                            strokeWidth={0.75}
                            strokeDasharray="4 3"
                            opacity={0.4}
                            label={{
                              value: `avg ${avgMargin.toFixed(1)}%`,
                              position: "insideTopRight",
                              fontSize: 9,
                              fill: FIN.rate,
                              opacity: 0.6,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="marginPct"
                            name="Gross margin"
                            stroke={FIN.rate}
                            strokeWidth={1.5}
                            fill="url(#pl-margin-grad)"
                            dot={false}
                            isAnimationActive={true}
                            animationDuration={700}
                            animationEasing="ease-out"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>
                );
              })()}

              {/* FX Impact */}
              <div style={{ ...card, padding: 0 }}>
                <SectionHeader icon="📡" label="Live FX Impact" />
                <div style={{ padding: "16px 20px" }}>
                  <p
                    style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}
                  >
                    What if USD/ZAR moves? Enter a scenario rate to see the
                    impact on gross margin.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "#555",
                        whiteSpace: "nowrap",
                      }}
                    >
                      If rate moves to R
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="10"
                      max="30"
                      value={fxScenario}
                      onChange={(e) => setFxScenario(e.target.value)}
                      placeholder={usdZar.toFixed(2)}
                      style={{ ...inputStyle, width: 90 }}
                    />
                    <span style={{ fontSize: 13, color: "#555" }}>/ USD</span>
                  </div>
                  {fxScenario ? (
                    <div
                      style={{
                        background: scenarioGross >= 0 ? "#f0f7f0" : "#fff8f8",
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}
                    >
                      {[
                        ["Current rate", `R${usdZar.toFixed(4)}/USD`],
                        ["Scenario rate", `R${fmt(scenarioRate, 4)}/USD`],
                        [
                          "Est. import COGS (sold units)",
                          fmtZar(scenarioImportCogs),
                        ],
                      ].map(([label, val], i) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ color: "#888" }}>{label}</span>
                          <strong
                            style={{ color: i === 2 ? "#c62828" : "#333" }}
                          >
                            {val}
                          </strong>
                        </div>
                      ))}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 14,
                          fontWeight: 700,
                          borderTop: "1px solid #e0e0e0",
                          paddingTop: 8,
                        }}
                      >
                        <span>Gross Profit at scenario</span>
                        <strong
                          style={{ color: pctColour(scenarioGrossMargin) }}
                        >
                          {fmtZar(scenarioGross)} ({fmt(scenarioGrossMargin)}%)
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#aaa",
                        fontStyle: "italic",
                      }}
                    >
                      Current gross margin:{" "}
                      <strong
                        style={{
                          color: pctColour(grossMarginPct),
                          fontStyle: "normal",
                        }}
                      >
                        {fmt(grossMarginPct)}%
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Loyalty Programme Summary */}
              <div style={{ ...card, padding: 0 }}>
                <SectionHeader icon="⭐" label="Loyalty Programme Cost" />
                <div style={{ padding: "16px 20px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      [
                        "Points Issued",
                        earnedPoints.toLocaleString(),
                        "#b5935a",
                      ],
                      ["Est. Programme Cost", fmtZar(loyaltyCost), "#c62828"],
                      [
                        "Cost/Revenue %",
                        profileRevenue > 0
                          ? `${fmt((loyaltyCost / profileRevenue) * 100)}%`
                          : "—",
                        "#E65100",
                      ],
                      [
                        "Cost/Point",
                        `R${fmt(costPerPointIssued, 4)}`,
                        "#2d4a2d",
                      ],
                    ].map(([label, val, color]) => (
                      <div
                        key={label}
                        style={{
                          background: "#fafaf8",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#aaa",
                            marginBottom: 3,
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color }}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#999",
                      background: "#f9f9f9",
                      borderRadius: 6,
                      padding: "8px 10px",
                      lineHeight: 1.5,
                    }}
                  >
                    Cost/pt = R{fmt(redemptionValue, 2)} redemption value ×{" "}
                    {100 - Math.round(breakageRate * 100)}% expected redemption
                    rate.
                    {loyaltyConfig
                      ? " Config from loyalty_config table."
                      : " Using default rates — link loyalty_config for live values."}
                  </div>
                </div>
              </div>

              {/* Best Margin SKU */}
              <div style={{ ...card, padding: 0 }}>
                <SectionHeader icon="🏆" label="Best Margin SKU" />
                <div style={{ padding: "16px 20px" }}>
                  {bestSkuMargin ? (
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#2d4a2d",
                          marginBottom: 4,
                        }}
                      >
                        {bestSkuMargin.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#999",
                          marginBottom: 12,
                          textTransform: "capitalize",
                        }}
                      >
                        {bestSkuMargin.channel} channel
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        {[
                          ["Sell Price", fmtZar(bestSkuMargin.sell)],
                          ["COGS", fmtZar(bestSkuMargin.cogs)],
                          ["Margin", `${fmt(bestSkuMargin.margin)}%`],
                        ].map(([l, v]) => (
                          <div key={l} style={{ textAlign: "center" }}>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#999",
                                marginBottom: 4,
                              }}
                            >
                              {l}
                            </div>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color:
                                  l === "Margin"
                                    ? pctColour(bestSkuMargin.margin)
                                    : "#333",
                              }}
                            >
                              {v}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: "#bbb", fontSize: 13 }}>
                      Set retail prices in <strong>HQ → Pricing</strong> to see
                      best margin SKU.
                    </p>
                  )}
                </div>
              </div>

              {/* Break-Even */}
              <div style={{ ...card, padding: 0 }}>
                <SectionHeader icon="⚖️" label="Break-Even Calculator" />
                <div style={{ padding: "16px 20px" }}>
                  {avgSellPrice > 0 && avgCogsPerUnit > 0 ? (
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#888",
                          marginBottom: 14,
                        }}
                      >
                        At avg retail <strong>{fmtZar(avgSellPrice)}</strong>{" "}
                        and avg COGS <strong>{fmtZar(avgCogsPerUnit)}</strong>:
                      </div>
                      <div
                        style={{ display: "flex", gap: 16, marginBottom: 16 }}
                      >
                        {[
                          [
                            "Contribution/unit",
                            fmtZar(avgSellPrice - avgCogsPerUnit),
                            "#2d4a2d",
                          ],
                          [
                            "Break-even units",
                            breakEvenUnits
                              ? breakEvenUnits.toLocaleString()
                              : totalOpexIncLoyalty === 0
                                ? "Set OpEx ←"
                                : "∞",
                            breakEvenUnits ? "#E65100" : "#bbb",
                          ],
                        ].map(([l, v, color]) => (
                          <div
                            key={l}
                            style={{
                              textAlign: "center",
                              flex: 1,
                              background: "#f8f8f8",
                              borderRadius: 8,
                              padding: "12px 8px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "#aaa",
                                marginBottom: 4,
                              }}
                            >
                              {l}
                            </div>
                            <div
                              style={{ fontSize: 18, fontWeight: 700, color }}
                            >
                              {v}
                            </div>
                          </div>
                        ))}
                      </div>
                      {breakEvenUnits && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#888",
                            background: "#fff8e1",
                            borderRadius: 8,
                            padding: "10px 14px",
                          }}
                        >
                          You need to sell <strong>{breakEvenUnits}</strong>{" "}
                          units at retail to cover{" "}
                          <strong>{fmtZar(totalOpexIncLoyalty)}</strong> in
                          operating costs.
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: "#bbb", fontSize: 13 }}>
                      Set retail prices in <strong>HQ → Pricing</strong> and
                      COGS in <strong>HQ → Costing</strong> to calculate
                      break-even.
                    </p>
                  )}
                </div>
              </div>

              {/* Channel Comparison */}
              <div style={{ ...card, padding: 0 }}>
                <SectionHeader icon="📈" label="Channel Margin Comparison" />
                <div style={{ padding: "16px 20px" }}>
                  {pricing.length === 0 ? (
                    <p style={{ color: "#bbb", fontSize: 13 }}>
                      No pricing data yet. Set prices in{" "}
                      <strong>HQ → Pricing</strong>.
                    </p>
                  ) : (
                    ["wholesale", "retail", "website"].map((ch) => {
                      const chPrices = pricing.filter(
                        (p) => p.channel === ch && p.sell_price_zar,
                      );
                      if (chPrices.length === 0)
                        return (
                          <div
                            key={ch}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "8px 0",
                              fontSize: 13,
                              borderBottom: "1px solid #f5f5f5",
                            }}
                          >
                            <span
                              style={{
                                textTransform: "capitalize",
                                color: "#bbb",
                              }}
                            >
                              {ch}
                            </span>
                            <span style={{ color: "#ddd" }}>No prices set</span>
                          </div>
                        );
                      const validPrices = chPrices.filter((p) =>
                        recipesWithCogs.find((r) => r.id === p.product_cogs_id),
                      );
                      if (validPrices.length === 0)
                        return (
                          <div
                            key={ch}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "8px 0",
                              fontSize: 13,
                              borderBottom: "1px solid #f5f5f5",
                            }}
                          >
                            <span
                              style={{
                                textTransform: "capitalize",
                                color: "#888",
                              }}
                            >
                              {ch}
                            </span>
                            <span style={{ color: "#ccc", fontSize: 11 }}>
                              COGS not configured
                            </span>
                          </div>
                        );
                      const avgMargin =
                        validPrices.reduce((s, p) => {
                          const recipe = recipesWithCogs.find(
                            (r) => r.id === p.product_cogs_id,
                          );
                          if (!recipe) return s;
                          return (
                            s +
                            ((parseFloat(p.sell_price_zar) -
                              recipe.cogsPerUnit) /
                              parseFloat(p.sell_price_zar)) *
                              100
                          );
                        }, 0) / validPrices.length;
                      const col = pctColour(avgMargin);
                      return (
                        <div key={ch} style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 5,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                textTransform: "capitalize",
                                color: "#555",
                                fontWeight: 600,
                              }}
                            >
                              {ch}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: col,
                              }}
                            >
                              {fmt(avgMargin)}% avg margin
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 3,
                              background: "#f0f0f0",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, Math.max(0, avgMargin))}%`,
                                background: col,
                                transition: "width 0.4s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#bbb",
                              marginTop: 3,
                            }}
                          >
                            {validPrices.length} SKU
                            {validPrices.length !== 1 ? "s" : ""} with pricing
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* WP-FIN S1: ExpenseManager modal */}
      {showExpMgr && (
        <ExpenseManager
          onClose={() => setShowExpMgr(false)}
          onSaved={() => {
            fetchExpenses();
            fetchAll();
          }}
          periodStart={periodStart(period, customFrom)?.slice(0, 10)}
          periodEnd={periodEnd(period, customTo)?.slice(0, 10)}
        />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: toast.type === "error" ? T.danger : T.accent,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: T.font,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
