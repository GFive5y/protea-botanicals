// src/components/hq/HQProfitLoss.js v2.3 — WP-R Phase 6: Realtime subscriptions
// Protea Botanicals · Phase 2 · March 2026
//
// v2.3 — WP-R Phase 6: realtime subscription for revenue tiles (orders table).
//         Any INSERT/UPDATE/DELETE on orders triggers fetchAll automatically.
// v2.2 — COGS methodology fix: Cost of Goods SOLD not Cost of Goods PURCHASED.
//         Uses recipe engine (calcCogsTotal) × units sold — the correct source
//         since recipes already know full per-cart cost (hardware, terpenes,
//         distillate, packaging, labour). PO totals shown as balance-sheet ref only.
// v2.1 — CRITICAL FIX: Use landed_cost_zar directly instead of subtotal × rate.
//         Recalculating with null usd_zar_rate fell back to live FX → phantom R67k COGS.
//         Incomplete POs (landed_cost_zar = R0) now flagged, not counted.
// v2.0 — WP-Q Live Data Integration fixes:
//   ★ CRITICAL FIX: orders.total_amount → orders.total (misnamed in v1.0 → silent R0 revenue bug)
//   ★ orders status filter now excludes BOTH 'cancelled' AND 'failed'
//   ★ Units estimate uses orders.items_count (replaces broken length × 2 hack)
//   ★ Loyalty programme cost added as P&L line (loyalty_transactions EARNED pts × est. cost/pt)
//   ★ Loyalty config fetched for real redemption_value_zar + breakage_rate
//   ★ Per-source error indicators — no more silent R0 data gaps
//   ★ Last-updated timestamp + manual refresh button
//   ★ Data source status strip (shows which queries returned data vs 0 rows)

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

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
// Supports chambers (multi-chamber JSONB), packaging_manual_zar, labour_manual_zar,
// shipping_alloc_zar, terpene_qty_ul (µl), lab tests, transport, misc.
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
  return `R${val.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const fmt = (n, dp = 2) => (parseFloat(n) || 0).toFixed(dp);
const pctColour = (pct) =>
  pct >= 35 ? "#2E7D32" : pct >= 20 ? "#E65100" : "#c62828";

const PERIODS = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "mtd", label: "This month" },
  { id: "ytd", label: "This year" },
  { id: "all", label: "All time" },
];

function periodStart(period) {
  const now = new Date();
  if (period === "30d") return new Date(now - 30 * 86400000).toISOString();
  if (period === "90d") return new Date(now - 90 * 86400000).toISOString();
  if (period === "mtd")
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  if (period === "ytd") return new Date(now.getFullYear(), 0, 1).toISOString();
  return null; // all time — no filter
}

function periodFilter(dateStr, period) {
  if (!dateStr) return false;
  const start = periodStart(period);
  if (!start) return true;
  return new Date(dateStr) >= new Date(start);
}

// ─── Waterfall Row ────────────────────────────────────────────────────────────
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

// ─── Data Source Status Badge ─────────────────────────────────────────────────
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

  // Raw data
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

  // Period
  const [period, setPeriod] = useState("30d");

  // Manual OpEx
  const [opexItems, setOpexItems] = useState([
    { id: 1, label: "Shipping out to stores", amount: "" },
    { id: 2, label: "Other overheads", amount: "" },
  ]);
  const [newOpexLabel, setNewOpexLabel] = useState("");
  const [newOpexAmount, setNewOpexAmount] = useState("");

  // FX sensitivity
  const [fxScenario, setFxScenario] = useState("");

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const errors = {};

    // ── FIXED v2.0: column is `total` not `total_amount` ──────────────
    // Also added items_count, and excluded both 'cancelled' AND 'failed'
    const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
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
      // v2.0: loyalty transactions for programme cost
      supabase
        .from("loyalty_transactions")
        .select("points, transaction_type, created_at"),
      // v2.0: loyalty config for real redemption value + breakage rate
      supabase
        .from("loyalty_config")
        .select("redemption_value_zar, breakage_rate")
        .maybeSingle(),
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
    setDataErrors(errors);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // v2.3: WP-R Phase 6 — realtime revenue tiles (any orders change → refetch)
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

  // ── OpEx helpers ──────────────────────────────────────────────────────
  const addOpex = () => {
    if (!newOpexLabel.trim()) return;
    setOpexItems((prev) => [
      ...prev,
      { id: Date.now(), label: newOpexLabel.trim(), amount: newOpexAmount },
    ]);
    setNewOpexLabel("");
    setNewOpexAmount("");
  };
  const removeOpex = (id) =>
    setOpexItems((prev) => prev.filter((i) => i.id !== id));
  const totalOpex = opexItems.reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0,
  );

  // ── P&L Calculations ──────────────────────────────────────────────────

  // Revenue: website orders — FIXED v2.0: field is `total` not `total_amount`
  const filteredOrders = orders.filter((o) =>
    periodFilter(o.created_at, period),
  );
  const websiteRevenue = filteredOrders.reduce(
    (s, o) => s + (parseFloat(o.total) || 0), // ← FIXED: was total_amount
    0,
  );
  // Units sold: use items_count (FIXED v2.0: replaces broken length × 2 hack)
  const totalUnitsSold = filteredOrders.reduce(
    (s, o) => s + (parseInt(o.items_count) || 1),
    0,
  );

  // PO data for inventory investment reference (balance sheet display only)
  const filteredPOs = purchaseOrders.filter((po) =>
    periodFilter(po.order_date, period),
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

  // ── v2.2 COGS: Recipe-engine × units sold ──────────────────────────────
  // The recipe engine (calcCogsTotal) already knows the full cost to produce
  // one finished cart — hardware (import), terpenes (import), distillate,
  // packaging, labour, lab tests, etc. This is the correct per-unit COGS.
  // Total COGS = avg recipe COGS/unit × actual units sold this period.
  // PO totals are shown as "Inventory investment" reference (balance sheet).
  const recipesWithCogs = recipes.map((r) => ({
    ...r,
    cogsPerUnit: calcCogsTotal(r, supplierProducts, localInputs, usdZar),
  }));

  // Avg full COGS/unit across all active recipes
  const avgFullCogsPerUnit =
    recipesWithCogs.length > 0
      ? recipesWithCogs.reduce((s, r) => s + r.cogsPerUnit, 0) /
        recipesWithCogs.length
      : 0;

  // Split import vs local for waterfall display
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
  const importCogsShipping = 0; // baked into shipping_alloc_zar in recipe

  const totalCogs = avgFullCogsPerUnit * totalUnitsSold;
  const grossProfit = websiteRevenue - totalCogs;
  const grossMarginPct =
    websiteRevenue > 0 ? (grossProfit / websiteRevenue) * 100 : 0;

  // NEW v2.0: Loyalty programme cost
  // Earned points × estimated cost per point (redemption_value × (1 - breakage))
  const redemptionValue = loyaltyConfig?.redemption_value_zar ?? 0.1;
  const breakageRate = loyaltyConfig?.breakage_rate ?? 0.3;
  const costPerPointIssued = redemptionValue * (1 - breakageRate);

  const filteredLoyaltyEarned = loyaltyTxns.filter(
    (t) =>
      periodFilter(t.created_at, period) &&
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
  const netMarginPct =
    websiteRevenue > 0 ? (netProfit / websiteRevenue) * 100 : 0;

  // Best margin SKU
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

  // Break-even
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

  // FX sensitivity — scales import portion of recipe COGS
  const scenarioRate = parseFloat(fxScenario) || usdZar;
  const scenarioImportCogs =
    usdZar > 0 ? importCogsSold * (scenarioRate / usdZar) : importCogsSold;
  const scenarioGross = websiteRevenue - scenarioImportCogs - localCogsTotal;
  const scenarioGrossMargin =
    websiteRevenue > 0 ? (scenarioGross / websiteRevenue) * 100 : 0;

  const hasDataErrors = Object.keys(dataErrors).length > 0;

  // ── Styles ────────────────────────────────────────────────────────────
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
    fontFamily: "Jost, sans-serif",
    fontSize: 14,
    boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: "Jost, sans-serif", color: "#333" }}>
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
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontFamily: "Cormorant Garamond, serif",
              fontWeight: 600,
              color: "#2d4a2d",
            }}
          >
            P&L Dashboard
          </h2>
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
              fontFamily: "Jost, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              opacity: loading ? 0.5 : 1,
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Data source status strip ─────────────────────────────────────── */}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── LEFT: WATERFALL ──────────────────────────────────────── */}
          <div>
            <div style={card}>
              {/* REVENUE */}
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
                sub="Not yet tracked — add wholesale invoices to orders table or enter manually below"
                value={0}
                indent={1}
                dim
              />
              <WRow
                label="Total Revenue"
                value={websiteRevenue}
                bold
                highlight={websiteRevenue > 0 ? "green" : undefined}
              />

              {/* COGS */}
              <SectionHeader icon="📦" label="Cost of Goods Sold" />
              <WRow
                label="Imported hardware & terpenes (recipe cost)"
                sub={
                  avgImportCogsPerUnit > 0
                    ? `R${fmt(avgImportCogsPerUnit)} avg import/unit × ${totalUnitsSold} units sold · from ${recipesWithCogs.length} active recipe${recipesWithCogs.length !== 1 ? "s" : ""}${incompletePOs.length > 0 ? ` · ⚠ ${incompletePOs.length} incomplete PO${incompletePOs.length !== 1 ? "s" : ""} excluded from investment ref` : ""}`
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
                label="Total COGS"
                value={totalCogs}
                bold
                negative
                highlight={totalCogs > 0 ? "red" : undefined}
              />
              {/* Inventory investment reference — NOT part of COGS */}
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
                    📦 Inventory investment this period (balance sheet, not P&L)
                    — {completedPOs.length} PO
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

              {/* GROSS PROFIT */}
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

              {/* OPERATING COSTS */}
              <SectionHeader icon="⚙️" label="Operating Costs" />

              {/* NEW v2.0: Loyalty programme cost as a real P&L line */}
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

              {/* Manual OpEx items */}
              {opexItems.map((item) => (
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
                    {item.label}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span style={{ fontSize: 13, color: "#888" }}>R</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={item.amount}
                      onChange={(e) =>
                        setOpexItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id
                              ? { ...i, amount: e.target.value }
                              : i,
                          ),
                        )
                      }
                      placeholder="0"
                      style={{ ...inputStyle, width: 120 }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#c62828",
                      minWidth: 100,
                      textAlign: "right",
                    }}
                  >
                    {item.amount ? `−${fmtZar(item.amount, true)}` : "—"}
                  </span>
                  <button
                    onClick={() => removeOpex(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ddd",
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Add OpEx row */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "10px 16px 10px 36px",
                  borderTop: "1px dashed #f0ede8",
                }}
              >
                <input
                  type="text"
                  value={newOpexLabel}
                  onChange={(e) => setNewOpexLabel(e.target.value)}
                  placeholder="Add cost item…"
                  style={{ ...inputStyle, flex: 2 }}
                  onKeyDown={(e) => e.key === "Enter" && addOpex()}
                />
                <input
                  type="number"
                  min="0"
                  value={newOpexAmount}
                  onChange={(e) => setNewOpexAmount(e.target.value)}
                  placeholder="Amount"
                  style={{ ...inputStyle, width: 110 }}
                  onKeyDown={(e) => e.key === "Enter" && addOpex()}
                />
                <button
                  onClick={addOpex}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#2d4a2d",
                    color: "#fff",
                    cursor: "pointer",
                    fontFamily: "Jost, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  + Add
                </button>
              </div>
              <WRow
                label="Total OpEx (incl. loyalty)"
                value={totalOpexIncLoyalty}
                bold
                negative
                highlight={totalOpexIncLoyalty > 0 ? "red" : undefined}
              />

              {/* NET PROFIT */}
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
                        fontSize: 36,
                        fontWeight: 800,
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
                          {fmtZar(loyaltyCost)} ({earnedPoints.toLocaleString()}{" "}
                          pts)
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
          </div>

          {/* ── RIGHT: INTEL PANELS ──────────────────────────────────── */}
          <div>
            {/* FX Impact */}
            <div style={{ ...card, padding: 0 }}>
              <SectionHeader icon="📡" label="Live FX Impact" />
              <div style={{ padding: "16px 20px" }}>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>
                  What if USD/ZAR moves? Enter a scenario rate to see the impact
                  on gross margin.
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
                        <strong style={{ color: i === 2 ? "#c62828" : "#333" }}>
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
                      <strong style={{ color: pctColour(scenarioGrossMargin) }}>
                        {fmtZar(scenarioGross)} ({fmt(scenarioGrossMargin)}%)
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ fontSize: 13, color: "#aaa", fontStyle: "italic" }}
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

            {/* Loyalty Programme Summary — NEW v2.0 */}
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
                    ["Points Issued", earnedPoints.toLocaleString(), "#b5935a"],
                    ["Est. Programme Cost", fmtZar(loyaltyCost), "#c62828"],
                    [
                      "Cost/Revenue %",
                      websiteRevenue > 0
                        ? `${fmt((loyaltyCost / websiteRevenue) * 100)}%`
                        : "—",
                      "#E65100",
                    ],
                    ["Cost/Point", `R${fmt(costPerPointIssued, 4)}`, "#2d4a2d"],
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
                        style={{ fontSize: 11, color: "#aaa", marginBottom: 3 }}
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
                      style={{ fontSize: 13, color: "#888", marginBottom: 14 }}
                    >
                      At avg retail <strong>{fmtZar(avgSellPrice)}</strong> and
                      avg COGS <strong>{fmtZar(avgCogsPerUnit)}</strong>:
                    </div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                      <div
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
                          Contribution/unit
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#2d4a2d",
                          }}
                        >
                          {fmtZar(avgSellPrice - avgCogsPerUnit)}
                        </div>
                      </div>
                      <div
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
                          Break-even units
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: breakEvenUnits ? "#E65100" : "#bbb",
                          }}
                        >
                          {breakEvenUnits
                            ? breakEvenUnits.toLocaleString()
                            : totalOpexIncLoyalty === 0
                              ? "Set OpEx ←"
                              : "∞"}
                        </div>
                      </div>
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
                        You need to sell <strong>{breakEvenUnits}</strong> units
                        at retail to cover{" "}
                        <strong>{fmtZar(totalOpexIncLoyalty)}</strong> in
                        operating costs.
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: "#bbb", fontSize: 13 }}>
                    Set retail prices in <strong>HQ → Pricing</strong> and COGS
                    in <strong>HQ → Costing</strong> to calculate break-even.
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
                          ((parseFloat(p.sell_price_zar) - recipe.cogsPerUnit) /
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
                          style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}
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
      )}
    </div>
  );
}
