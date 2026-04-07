// src/components/hq/HQProfitLoss.js v3.0 — WP-FIN S1: Expense Engine
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
import { T } from "../../theme";

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
const pctColour = (pct) =>
  pct >= 35 ? "#2E7D32" : pct >= 20 ? "#E65100" : "#c62828";

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
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

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
  const [wholesaleMovements, setWholesaleMovements] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [fxScenario, setFxScenario] = useState("");
  const [toast, setToast] = useState(null);
  const [orderItemsCogs, setOrderItemsCogs] = useState(null); // { revenue, cogs, byProduct }
  const [marginSortMode, setMarginSortMode] = useState("gp"); // "gp" or "margin"

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
  }, [tenantId, period, customFrom, customTo]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const errors = {};
    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11] = await Promise.all([
      supabase
        .from("orders")
        .select("id, created_at, total, status, items_count, currency")
        .not("status", "in", '("cancelled","failed")'),
      supabase
        .from("purchase_orders")
        .select(
          "id, order_date, landed_cost_zar, po_status, status, subtotal, shipping_cost_usd, usd_zar_rate",
        )
        .in("po_status", ["received", "complete"]),
      supabase.from("product_cogs").select("*").eq("is_active", true),
      supabase.from("supplier_products").select("*").eq("is_active", true),
      supabase.from("local_inputs").select("*").eq("is_active", true),
      supabase.from("product_pricing").select("*"),
      supabase
        .from("loyalty_transactions")
        .select("points, transaction_type, created_at"),
      supabase
        .from("loyalty_config")
        .select("redemption_value_zar, breakage_rate")
        .maybeSingle(),
      supabase
        .from("stock_movements")
        .select("item_id, quantity, unit_cost, movement_type, created_at")
        .eq("movement_type", "production_out"),
      supabase
        .from("stock_movements")
        .select("item_id, quantity, created_at")
        .eq("movement_type", "sale_out"),
      supabase
        .from("inventory_items")
        .select("id, sell_price, name")
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
    setWholesaleMovements(r10.data || []);
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
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
  const websiteRevenue = filteredOrders.reduce(
    (s, o) => s + (parseFloat(o.total) || 0),
    0,
  );
  const totalUnitsSold = filteredOrders.reduce(
    (s, o) => s + (parseInt(o.items_count) || 1),
    0,
  );

  // WP-FIN S4: wholesale revenue from sale_out movements × sell_price
  const filteredWholesaleMovements = wholesaleMovements.filter((m) =>
    periodFilter(m.created_at, period, customFrom, customTo),
  );
  const wholesaleRevenue = filteredWholesaleMovements.reduce((s, m) => {
    const item = inventoryItems.find((i) => i.id === m.item_id);
    const price = parseFloat(item?.sell_price || 0);
    return s + Math.abs(parseFloat(m.quantity) || 0) * price;
  }, 0);
  const totalRevenue = websiteRevenue + wholesaleRevenue;

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
  const grossProfit = totalRevenue - totalCogs;
  const grossMarginPct =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Per-product margin data for "Margin by Product" section
  const productMargins = (() => {
    const map = {};
    filteredOI.forEach((oi) => {
      const name = oi.product_name || "Unknown";
      const avco = parseFloat(oi.product_metadata?.weighted_avg_cost || 0);
      if (!map[name]) map[name] = { units: 0, revenue: 0, cogs: 0 };
      map[name].units += oi.quantity || 0;
      map[name].revenue += parseFloat(oi.line_total) || 0;
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
  const totalOpexIncLoyalty = totalOpex + loyaltyCost;
  const netProfit = grossProfit - totalOpexIncLoyalty;
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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
    fontFamily: T.font.ui,
    fontSize: 14,
    boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: T.font.ui, color: "#333" }}>
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
              fontFamily: T.font.ui,
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
          count={filteredWholesaleMovements.length}
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

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
          Loading P&L data…
        </div>
      ) : (
        <>
          {/* Waterfall Chart */}
          {websiteRevenue > 0 && (
            <div style={{ marginBottom: 24 }}>
              <ChartCard title="P&L Waterfall" subtitle="Revenue → COGS → Gross → OpEx → Net" accent="green" height={300}>
                <WaterfallChart
                  revenue={websiteRevenue}
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
                  label="Website / direct sales"
                  sub={`${filteredOrders.length} orders · ${totalUnitsSold} units · ${PERIODS.find((p) => p.id === period)?.label}`}
                  value={websiteRevenue}
                  indent={1}
                  highlight={websiteRevenue > 0 ? "green" : undefined}
                />
                <WRow
                  label="Wholesale / store sales"
                  sub={
                    filteredWholesaleMovements.length > 0
                      ? `${filteredWholesaleMovements.length} shipment movement${filteredWholesaleMovements.length !== 1 ? "s" : ""} · sale_out × sell price`
                      : "No wholesale shipments this period"
                  }
                  value={wholesaleRevenue}
                  indent={1}
                  highlight={wholesaleRevenue > 0 ? "green" : undefined}
                  dim={wholesaleRevenue === 0}
                />
                <WRow
                  label="Total Revenue"
                  value={totalRevenue}
                  bold
                  highlight={totalRevenue > 0 ? "green" : undefined}
                />

                <SectionHeader icon="📦" label="Cost of Goods Sold" />
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

                <SectionHeader icon="📊" label="Gross Profit" />
                <WRow
                  label="Gross Profit"
                  sub={`Gross margin: ${fmt(grossMarginPct)}%`}
                  value={grossProfit}
                  bold
                  borderTop
                  highlight={
                    grossMarginPct >= 35
                      ? "green"
                      : grossMarginPct >= 20
                        ? "orange"
                        : "red"
                  }
                />

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
                      fontFamily: T.font.ui,
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
                          ...T.type.metricLg,
                          fontFamily: T.font.ui,
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
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.color?.ink900 || "#111" }}>
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
                          background: marginSortMode === m.id ? (T.color?.accent || "#1A3D2B") : "#fff",
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
                          grossMarginPct >= 35
                            ? CC.success
                            : grossMarginPct >= 20
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
                        totalRevenue > 0
                          ? `${fmt((loyaltyCost / totalRevenue) * 100)}%`
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
      )}

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
            background: toast.type === "error" ? T.danger.text : T.accent.dark,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: T.font.ui,
            boxShadow: T.shadow.hover,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
