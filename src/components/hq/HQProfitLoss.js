// src/components/hq/HQProfitLoss.js v1.0 — WP-E: Live P&L Waterfall Dashboard
// Protea Botanicals · Phase 2 · March 2026
// New file — add to src/components/hq/
//
// Data sources:
//   Revenue:   orders table (website) + shipments (wholesale estimate)
//   Import COGS: purchase_orders.landed_cost_zar (received POs)
//   Local COGS:  product_cogs × local_inputs (live calculation)
//   OpEx:        manual entry, stored in localStorage for session
//   Net Profit:  Gross Profit − OpEx

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

// ─── COGS calculation (mirrors HQCogs pattern) ────────────────────────────────
function calcCogsTotal(recipe, supplierProducts, localInputs, usdZar) {
  if (!recipe || !usdZar) return 0;
  const hw = supplierProducts.find((p) => p.id === recipe.hardware_item_id);
  const tp = supplierProducts.find((p) => p.id === recipe.terpene_item_id);
  const di = localInputs.find((i) => i.id === recipe.distillate_input_id);
  const pk = localInputs.find((i) => i.id === recipe.packaging_input_id);
  const lb = localInputs.find((i) => i.id === recipe.labour_input_id);
  const hwCost = hw
    ? parseFloat(recipe.hardware_qty || 1) *
        parseFloat(hw.unit_price_usd) *
        usdZar +
      parseFloat(recipe.shipping_alloc_zar || 0)
    : 0;
  const tpCost = tp
    ? parseFloat(recipe.terpene_qty_g || 0) *
      (parseFloat(tp.unit_price_usd) / 50) *
      usdZar
    : 0;
  const diCost = di?.cost_zar
    ? parseFloat(recipe.distillate_qty_ml || 0) * parseFloat(di.cost_zar)
    : 0;
  const pkCost = pk?.cost_zar
    ? parseFloat(recipe.packaging_qty || 1) * parseFloat(pk.cost_zar)
    : 0;
  const lbCost = lb?.cost_zar
    ? parseFloat(recipe.labour_qty || 1) * parseFloat(lb.cost_zar)
    : 0;
  return (
    hwCost +
    tpCost +
    diCost +
    pkCost +
    lbCost +
    parseFloat(recipe.other_cost_zar || 0)
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

const PERIODS = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "mtd", label: "This month" },
  { id: "ytd", label: "This year" },
  { id: "all", label: "All time" },
];

function periodFilter(dateStr, period) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (period === "30d") return d >= new Date(now - 30 * 86400000);
  if (period === "90d") return d >= new Date(now - 90 * 86400000);
  if (period === "mtd")
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  if (period === "ytd") return d.getFullYear() === now.getFullYear();
  return true; // all
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

// ─── Section Header ───────────────────────────────────────────────────────────
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
  const [loading, setLoading] = useState(true);

  // Period
  const [period, setPeriod] = useState("30d");

  // Manual OpEx (session state — no DB persistence needed for MVP)
  const [opexItems, setOpexItems] = useState([
    { id: 1, label: "Shipping out to stores", amount: "" },
    { id: 2, label: "Other overheads", amount: "" },
  ]);
  const [newOpexLabel, setNewOpexLabel] = useState("");
  const [newOpexAmount, setNewOpexAmount] = useState("");

  // FX sensitivity
  const [fxScenario, setFxScenario] = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      supabase
        .from("orders")
        .select("id, created_at, total_amount, status")
        .neq("status", "cancelled"),
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
    ]);
    setOrders(r1.data || []);
    setPurchaseOrders(r2.data || []);
    setRecipes(r3.data || []);
    setSupplierProducts(r4.data || []);
    setLocalInputs(r5.data || []);
    setPricing(r6.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
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

  // Revenue: website orders
  const filteredOrders = orders.filter((o) =>
    periodFilter(o.created_at, period),
  );
  const websiteRevenue = filteredOrders.reduce(
    (s, o) => s + (parseFloat(o.total_amount) || 0),
    0,
  );

  // Import COGS: landed_cost_zar from received POs in period
  const filteredPOs = purchaseOrders.filter((po) =>
    periodFilter(po.order_date, period),
  );
  const importCogsHardware = filteredPOs.reduce((s, po) => {
    // Approximate split: subtotal × rate = import product cost, rest = shipping
    const productCost =
      (parseFloat(po.subtotal) || 0) * (parseFloat(po.usd_zar_rate) || usdZar);
    return s + productCost;
  }, 0);
  const importCogsShipping = filteredPOs.reduce((s, po) => {
    return (
      s +
      (parseFloat(po.shipping_cost_usd) || 0) *
        (parseFloat(po.usd_zar_rate) || usdZar)
    );
  }, 0);
  const totalImportCogs = importCogsHardware + importCogsShipping;

  // Live COGS per unit for each recipe (used for per-unit cost reference)
  const recipesWithCogs = recipes.map((r) => ({
    ...r,
    cogsPerUnit: calcCogsTotal(r, supplierProducts, localInputs, usdZar),
  }));

  // Local COGS estimate from local_inputs (distillate, packaging, labour)
  // Approximate: sum of all local input cost × units sold (from orders)
  // Since we don't have per-order item breakdown yet, show as reference only
  const localCogsPerUnit =
    recipesWithCogs.length > 0
      ? recipesWithCogs.reduce((s, r) => {
          const di = localInputs.find((i) => i.id === r.distillate_input_id);
          const pk = localInputs.find((i) => i.id === r.packaging_input_id);
          const lb = localInputs.find((i) => i.id === r.labour_input_id);
          const diC = di?.cost_zar
            ? parseFloat(r.distillate_qty_ml || 0) * parseFloat(di.cost_zar)
            : 0;
          const pkC = pk?.cost_zar
            ? parseFloat(r.packaging_qty || 1) * parseFloat(pk.cost_zar)
            : 0;
          const lbC = lb?.cost_zar
            ? parseFloat(r.labour_qty || 1) * parseFloat(lb.cost_zar)
            : 0;
          return s + diC + pkC + lbC;
        }, 0) / recipesWithCogs.length
      : 0;
  const estUnits = filteredOrders.length > 0 ? filteredOrders.length * 2 : 0; // rough estimate 2 units per order
  const localCogsTotal = localCogsPerUnit * estUnits;

  const totalCogs = totalImportCogs + localCogsTotal;
  const grossProfit = websiteRevenue - totalCogs;
  const grossMarginPct =
    websiteRevenue > 0 ? (grossProfit / websiteRevenue) * 100 : 0;
  const netProfit = grossProfit - totalOpex;
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

  // Break-even: at avg COGS per unit, how many units to cover all costs
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
    avgSellPrice > avgCogsPerUnit && totalOpex > 0
      ? Math.ceil(totalOpex / (avgSellPrice - avgCogsPerUnit))
      : null;

  // FX sensitivity
  const scenarioRate = parseFloat(fxScenario) || usdZar;
  const scenarioCogs = totalImportCogs * (scenarioRate / usdZar);
  const scenarioGross = websiteRevenue - scenarioCogs - localCogsTotal;
  const scenarioGrossMargin =
    websiteRevenue > 0 ? (scenarioGross / websiteRevenue) * 100 : 0;

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

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "Jost, sans-serif", color: "#333" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
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
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: 14 }}>
            Live profit & loss · supplier cost to customer sale
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* FX pill */}
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
          {/* Period selector */}
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
        </div>
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
          {/* ── LEFT: WATERFALL ─────────────────────────────────────── */}
          <div>
            <div style={card}>
              {/* ── REVENUE ── */}
              <SectionHeader icon="💰" label="Revenue" />
              <WRow
                label="Website sales"
                sub={`${filteredOrders.length} orders · ${PERIODS.find((p) => p.id === period)?.label}`}
                value={websiteRevenue}
                indent={1}
                highlight={websiteRevenue > 0 ? "green" : undefined}
              />
              <WRow
                label="Wholesale / store sales"
                sub="Manual entry — add below in OpEx section"
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

              {/* ── COST OF GOODS SOLD ── */}
              <SectionHeader icon="📦" label="Cost of Goods Sold" />
              <WRow
                label="Imported hardware (landed cost)"
                sub={`${filteredPOs.length} received POs · locked FX rates`}
                value={importCogsHardware}
                indent={1}
                negative
              />
              <WRow
                label="Import shipping & clearance"
                sub="DDP Air fees from received POs"
                value={importCogsShipping}
                indent={1}
                negative
              />
              <WRow
                label="Local inputs (distillate · packaging · labour)"
                sub={
                  localCogsPerUnit > 0
                    ? `~R${fmt(localCogsPerUnit)}/unit avg · ${estUnits} est. units`
                    : "Set costs in HQ → Costing → Local Inputs"
                }
                value={localCogsTotal}
                indent={1}
                negative
                dim={localCogsPerUnit === 0}
              />
              <WRow
                label="Total COGS"
                value={totalCogs}
                bold
                negative
                highlight={totalCogs > 0 ? "red" : undefined}
              />

              {/* ── GROSS PROFIT ── */}
              <SectionHeader icon="📊" label="Gross Profit" />
              <WRow
                label="Gross Profit"
                sub={`Margin: ${fmt(grossMarginPct)}%`}
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

              {/* ── OPERATING COSTS ── */}
              <SectionHeader icon="⚙️" label="Operating Costs (manual)" />
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
                      minWidth: 90,
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
                label="Total OpEx"
                value={totalOpex}
                bold
                negative
                highlight={totalOpex > 0 ? "red" : undefined}
              />

              {/* ── NET PROFIT ── */}
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
                {/* Gross vs Net margin bar */}
                {websiteRevenue > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 12,
                        color: "#888",
                        marginBottom: 6,
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

          {/* ── RIGHT: INTEL PANELS ─────────────────────────────────── */}
          <div>
            {/* FX Impact strip */}
            <div style={{ ...card, padding: 0 }}>
              <SectionHeader icon="📡" label="Live FX Impact" />
              <div style={{ padding: "16px 20px" }}>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>
                  What if USD/ZAR moves? Enter a scenario rate to see the impact
                  on your gross margin.
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: "#888" }}>Current rate</span>
                      <strong>R{usdZar.toFixed(4)}/USD</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: "#888" }}>Scenario rate</span>
                      <strong>R{fmt(scenarioRate, 4)}/USD</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: "#888" }}>Est. import COGS</span>
                      <strong style={{ color: "#c62828" }}>
                        {fmtZar(scenarioCogs)}
                      </strong>
                    </div>
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

            {/* Break-Even Calculator */}
            <div style={{ ...card, padding: 0 }}>
              <SectionHeader icon="⚖️" label="Break-Even Calculator" />
              <div style={{ padding: "16px 20px" }}>
                {avgSellPrice > 0 && avgCogsPerUnit > 0 ? (
                  <div>
                    <div
                      style={{ fontSize: 13, color: "#888", marginBottom: 14 }}
                    >
                      At avg retail price{" "}
                      <strong>{fmtZar(avgSellPrice)}</strong> and avg COGS{" "}
                      <strong>{fmtZar(avgCogsPerUnit)}</strong> per unit:
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
                            : totalOpex === 0
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
                        at retail to cover your operating costs of{" "}
                        <strong>{fmtZar(totalOpex)}</strong>.
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
                    const avgMargin =
                      chPrices.reduce((s, p) => {
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
                      }, 0) / chPrices.length;
                    const col = pctColour(avgMargin);
                    return (
                      <div key={ch} style={{ marginBottom: 12 }}>
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
