// src/components/hq/LiveFXBar.js — v1.5
// Protea Botanicals — WP-X System Intelligence Layer
// v1.5: Chart readability pass — taller chart (260px), larger/brighter Y-axis
//       rate labels, larger/brighter X-axis date labels with tick marks,
//       bigger stats bar text. Fixed broken fontSize="" from partial edit.
// v1.4: Full live COGS recalculation per selected SKU.
// v1.3: Real historical FX data from frankfurter.app (ECB daily rates).
// v1.2: Interactive history chart + period selectors.
// v1.1: Live EUR/ZAR + GBP/ZAR from open.er-api.com.
// v1.0: Initial Bloomberg-botanical terminal bar.

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

const REFRESH_SEC = 60;
const FRANK_BASE = "https://api.frankfurter.app";
const SKU_LS_KEY = "pb_fx_pinned_sku";

const C = {
  bg: "#08150e",
  bgMid: "#0d1f14",
  bgCard: "#0a1a10",
  border: "#1c3a24",
  grid: "#112618",
  green: "#52b788",
  greenBr: "#74c69d",
  gold: "#b5935a",
  goldBr: "#d4b07a",
  text: "#d8f3dc",
  muted: "#5a9e6e",
  dimmed: "#2e5c3a",
  white: "#f0faf2",
  up: "#40c97a",
  down: "#e05a5a",
  amber: "#f39c12",
};

const PERIODS = [
  { id: "1W", label: "1W", days: 7 },
  { id: "1M", label: "1M", days: 30 },
  { id: "3M", label: "3M", days: 90 },
  { id: "1Y", label: "1Y", days: 365 },
  { id: "3Y", label: "ALL", days: 1095 },
];

const INJECTED_CSS = `
@keyframes fx-flash-up   { 0%{background:rgba(64,201,122,0.18)} 100%{background:transparent} }
@keyframes fx-flash-down { 0%{background:rgba(224,90,90,0.16)}  100%{background:transparent} }
@keyframes fx-blink      { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes ticker-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes fx-chart-in   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes fx-shimmer    { 0%{opacity:0.4} 50%{opacity:0.8} 100%{opacity:0.4} }
.fx-flash-up   { animation: fx-flash-up   0.9s ease forwards; }
.fx-flash-down { animation: fx-flash-down 0.9s ease forwards; }
.fx-live-dot   { animation: fx-blink 1.8s ease-in-out infinite; }
.fx-period-btn { transition: all 0.15s; cursor: pointer; font-family:'Jost',sans-serif; }
.fx-period-btn:hover { color:#74c69d !important; border-color:#52b788 !important; }
.fx-shimmer    { animation: fx-shimmer 1.4s ease-in-out infinite; }
.fx-sku-row:hover { background: rgba(82,183,136,0.07) !important; }
`;

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toISO(d) {
  return d.toISOString().split("T")[0];
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function fetchHistoricalRates(days) {
  const from = toISO(daysAgo(days));
  const to = toISO(new Date());
  try {
    const res = await fetch(`${FRANK_BASE}/${from}..${to}?from=USD&to=ZAR`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.rates) return null;
    return Object.entries(json.rates)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, rate: parseFloat(vals.ZAR) }));
  } catch (_) {
    return null;
  }
}

// ─── Full COGS calculation (matches HQCogs engine) ────────────────────────────
async function calcSkuCogs(skuId, fxRate) {
  if (!skuId || !fxRate) return null;
  try {
    const { data: recipe, error } = await supabase
      .from("product_cogs")
      .select("*")
      .eq("id", skuId)
      .single();
    if (error || !recipe) return null;

    const toZar = (usd) => parseFloat(usd || 0) * fxRate;
    const batchSize = parseFloat(recipe.batch_size || 1000);

    // ── Parse chambers JSON (multi-chamber SKUs store terpene/distillate per chamber) ──
    let chambers = null;
    try {
      chambers = recipe.chambers
        ? Array.isArray(recipe.chambers)
          ? recipe.chambers
          : JSON.parse(recipe.chambers)
        : null;
    } catch (_) {}
    const isMultiChamber = chambers && chambers.length > 0;

    // ── Collect all IDs ───────────────────────────────────────────────────────
    const suppIds = [recipe.hardware_item_id].filter(Boolean);
    const localIds = [recipe.packaging_input_id, recipe.labour_input_id].filter(
      Boolean,
    );

    if (isMultiChamber) {
      chambers.forEach((ch) => {
        if (ch.terpene_item_id) suppIds.push(ch.terpene_item_id);
        if (ch.distillate_item_id) suppIds.push(ch.distillate_item_id);
        if (ch.distillate_input_id) localIds.push(ch.distillate_input_id);
      });
    } else {
      if (recipe.terpene_item_id) suppIds.push(recipe.terpene_item_id);
      if (recipe.distillate_item_id) suppIds.push(recipe.distillate_item_id);
      if (recipe.distillate_input_id) localIds.push(recipe.distillate_input_id);
    }

    // ── Lab tests ─────────────────────────────────────────────────────────────
    let labTests = [];
    try {
      labTests = recipe.lab_tests
        ? Array.isArray(recipe.lab_tests)
          ? recipe.lab_tests
          : JSON.parse(recipe.lab_tests)
        : [];
    } catch (_) {}
    const labCount = labTests.length;

    const [suppRes, localRes, labRes] = await Promise.all([
      suppIds.length
        ? supabase
            .from("supplier_products")
            .select("id,name,unit_price_usd")
            .in("id", [...new Set(suppIds)])
        : Promise.resolve({ data: [] }),
      localIds.length
        ? supabase
            .from("local_inputs")
            .select("id,name,cost_zar,unit")
            .in("id", [...new Set(localIds)])
        : Promise.resolve({ data: [] }),
      labCount > 0
        ? supabase
            .from("local_inputs")
            .select("id,name,cost_zar")
            .ilike("name", "%lab%")
            .limit(5)
        : Promise.resolve({ data: [] }),
    ]);

    const suppMap = Object.fromEntries(
      (suppRes.data || []).map((r) => [r.id, r]),
    );
    const localMap = Object.fromEntries(
      (localRes.data || []).map((r) => [r.id, r]),
    );

    // Lab: cost per test × count ÷ batchSize
    const labInput = (labRes.data || []).find(
      (r) => parseFloat(r.cost_zar) > 0,
    );
    const labCostPerTest = labInput ? parseFloat(labInput.cost_zar) : 0;
    const labCostTotal = (labCostPerTest * labCount) / batchSize;

    // ── Hardware (landed = unit cost + shipping alloc) ────────────────────────
    const hw = suppMap[recipe.hardware_item_id];
    const hwBase = hw
      ? toZar(hw.unit_price_usd) * parseFloat(recipe.hardware_qty || 1)
      : 0;
    const shippingCost = parseFloat(recipe.shipping_alloc_zar || 0);
    const hwCost = hwBase + shippingCost;

    // ── Terpene + Distillate ──────────────────────────────────────────────────
    let tpCost = 0,
      distCost = 0;

    if (isMultiChamber) {
      chambers.forEach((ch) => {
        // terpene_qty_ul → convert ul to g (÷1000), priced per 50g bottle
        const tp = suppMap[ch.terpene_item_id];
        const tpQg = parseFloat(ch.terpene_qty_ul || 0) / 1000;
        if (tp) tpCost += (toZar(tp.unit_price_usd) / 50) * tpQg;

        // distillate: local_inputs (ZAR/ml) first, supplier fallback
        if (ch.distillate_input_id && localMap[ch.distillate_input_id]) {
          distCost +=
            parseFloat(localMap[ch.distillate_input_id].cost_zar || 0) *
            parseFloat(ch.distillate_qty_ml || 0);
        } else if (ch.distillate_item_id && suppMap[ch.distillate_item_id]) {
          distCost +=
            toZar(suppMap[ch.distillate_item_id].unit_price_usd) *
            parseFloat(ch.distillate_qty_ml || 0);
        }
      });
    } else {
      const tp = suppMap[recipe.terpene_item_id];
      if (tp)
        tpCost =
          (toZar(tp.unit_price_usd) / 50) *
          parseFloat(recipe.terpene_qty_g || 0);

      if (recipe.distillate_input_id && localMap[recipe.distillate_input_id]) {
        distCost =
          parseFloat(localMap[recipe.distillate_input_id].cost_zar || 0) *
          parseFloat(recipe.distillate_qty_ml || 0);
      } else if (
        recipe.distillate_item_id &&
        suppMap[recipe.distillate_item_id]
      ) {
        distCost =
          toZar(suppMap[recipe.distillate_item_id].unit_price_usd) *
          parseFloat(recipe.distillate_qty_ml || 0);
      }
    }

    // ── Packaging + Labour (manual override or local_inputs) ──────────────────
    const pk = localMap[recipe.packaging_input_id];
    const pkCost = pk
      ? parseFloat(pk.cost_zar || 0) * parseFloat(recipe.packaging_qty || 1)
      : 0;
    const lb = localMap[recipe.labour_input_id];
    const lbCost = lb
      ? parseFloat(lb.cost_zar || 0) * parseFloat(recipe.labour_qty || 1)
      : 0;
    const finalPkCost =
      parseFloat(recipe.packaging_manual_zar || 0) > 0
        ? parseFloat(recipe.packaging_manual_zar)
        : pkCost;
    const finalLbCost =
      parseFloat(recipe.labour_manual_zar || 0) > 0
        ? parseFloat(recipe.labour_manual_zar)
        : lbCost;

    // ── Batch-level costs ÷ batchSize ─────────────────────────────────────────
    const transportCost =
      parseFloat(recipe.transport_cost_zar || 0) / batchSize;
    const miscCost = parseFloat(recipe.misc_cost_zar || 0) / batchSize;
    const otherCost = parseFloat(recipe.other_cost_zar || 0);

    const total =
      hwCost +
      tpCost +
      distCost +
      finalPkCost +
      finalLbCost +
      transportCost +
      miscCost +
      otherCost +
      labCostTotal;

    return {
      total,
      breakdown: [
        {
          label: "Hardware",
          cost: hwCost,
          pct: total > 0 ? (hwCost / total) * 100 : 0,
        },
        {
          label: "Terpene",
          cost: tpCost,
          pct: total > 0 ? (tpCost / total) * 100 : 0,
        },
        {
          label: "Distillate",
          cost: distCost,
          pct: total > 0 ? (distCost / total) * 100 : 0,
        },
        {
          label: "Packaging",
          cost: finalPkCost,
          pct: total > 0 ? (finalPkCost / total) * 100 : 0,
        },
        {
          label: "Labour",
          cost: finalLbCost,
          pct: total > 0 ? (finalLbCost / total) * 100 : 0,
        },
        {
          label: "Lab",
          cost: labCostTotal,
          pct: total > 0 ? (labCostTotal / total) * 100 : 0,
        },
        {
          label: "Transport",
          cost: transportCost,
          pct: total > 0 ? (transportCost / total) * 100 : 0,
        },
        {
          label: "Misc",
          cost: miscCost,
          pct: total > 0 ? (miscCost / total) * 100 : 0,
        },
        {
          label: "Other",
          cost: otherCost,
          pct: total > 0 ? (otherCost / total) * 100 : 0,
        },
      ].filter((b) => b.cost > 0),
      skuName: recipe.product_name || recipe.sku || skuId,
      hwLanded: hwCost,
    };
  } catch (_) {
    return null;
  }
}
// ─── COGS breakdown bar ───────────────────────────────────────────────────────
const COGS_COLOURS = [
  "#52b788",
  "#b5935a",
  "#74c69d",
  "#d4b07a",
  "#3a6647",
  "#8fbc8f",
];
function CogsBreakdownBar({ breakdown }) {
  if (!breakdown || breakdown.length === 0) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        {breakdown.map((b, i) => (
          <div
            key={b.label}
            style={{
              width: `${b.pct}%`,
              background: COGS_COLOURS[i % COGS_COLOURS.length],
              transition: "width 0.5s ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
        {breakdown.map((b, i) => (
          <div
            key={b.label}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 1,
                background: COGS_COLOURS[i % COGS_COLOURS.length],
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 9, color: C.muted }}>{b.label}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.text,
                fontFamily: "'Courier New', monospace",
              }}
            >
              R{b.cost.toFixed(2)}
            </span>
            <span style={{ fontSize: 9, color: C.dimmed }}>
              ({b.pct.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compact sparkline ────────────────────────────────────────────────────────
function Sparkline({ data, w = 110, h = 32 }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data) - 0.001;
  const max = Math.max(...data) + 0.001;
  const range = max - min;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return [x.toFixed(1), y.toFixed(1)];
  });
  const polyPts = pts.map((p) => p.join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  const lc = data[data.length - 1] >= data[0] ? C.up : C.down;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="spk-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lc} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lc} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`${pts[0].join(",")} ${polyPts} ${w},${h} 0,${h}`}
        fill="url(#spk-g)"
        stroke="none"
      />
      <polyline
        points={polyPts}
        fill="none"
        stroke={lc}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lx} cy={ly} r="2.5" fill={lc} />
      <circle cx={lx} cy={ly} r="2.5" fill="none" stroke={lc} strokeWidth="1.2">
        <animate
          attributeName="r"
          from="2.5"
          to="9"
          dur="1.6s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="0.7"
          to="0"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

// ─── Ring timer ───────────────────────────────────────────────────────────────
function RingTimer({ sec, total = REFRESH_SEC, size = 38 }) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (sec / total);
  return (
    <svg
      width={size}
      height={size}
      style={{ flexShrink: 0, transform: "rotate(-90deg)" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={C.border}
        strokeWidth="2.5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={C.green}
        strokeWidth="2.5"
        strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s linear" }}
      />
      <g transform={`rotate(90, ${size / 2}, ${size / 2})`}>
        <text
          x={size / 2}
          y={size / 2 + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fontFamily="'Jost',monospace"
          fontWeight="700"
          fill={C.green}
        >
          {sec}s
        </text>
      </g>
    </svg>
  );
}

function RateChip({ label, value, flag }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 14px",
        borderLeft: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: C.muted,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {flag} {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.gold,
          fontFamily: "'Courier New', monospace",
        }}
      >
        {value ? `R${value}` : "—"}
      </div>
    </div>
  );
}

// ─── History chart ────────────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div
      style={{
        height: 260,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          height: 120,
          width: "90%",
        }}
      >
        {[
          60, 80, 55, 95, 70, 85, 45, 90, 75, 100, 65, 88, 72, 50, 95, 80, 60,
          75, 90, 55,
        ].map((h, i) => (
          <div
            key={i}
            className="fx-shimmer"
            style={{
              flex: 1,
              height: `${h}%`,
              background: C.grid,
              borderRadius: "2px 2px 0 0",
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: 10,
          color: C.dimmed,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Loading historical data…
      </div>
    </div>
  );
}

function HistoryChart({ data, loading }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [chartWidth, setChartWidth] = useState(760);

  useEffect(() => {
    if (!containerRef.current) return;
    // Measure immediately + on resize
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.getBoundingClientRect().width;
        if (w > 100) setChartWidth(w);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    // Also re-measure after layout settles
    const t = setTimeout(measure, 100);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  if (loading) return <ChartSkeleton />;
  if (!data || data.length < 2) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.3 }}>📊</div>
        <div style={{ fontSize: 11, color: C.dimmed, textAlign: "center" }}>
          No data for this period — try a longer timeframe or check
          connectivity.
        </div>
      </div>
    );
  }

  // ── v1.5: taller chart + more padding for readable labels ──────────────
  const W = chartWidth;
  const H = 260;
  const PAD = { top: 18, right: 80, bottom: 48, left: 10 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  const rates = data.map((d) => d.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 0.001;
  const pad = range * 0.15;
  const yMin = min - pad;
  const yMax = max + pad;
  const yRange = yMax - yMin;

  const toX = (i) => PAD.left + (i / (data.length - 1)) * CW;
  const toY = (v) => PAD.top + CH - ((v - yMin) / yRange) * CH;

  const pathD = data
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)},${toY(d.rate).toFixed(1)}`,
    )
    .join(" ");
  const areaD = `${pathD} L ${toX(data.length - 1).toFixed(1)},${(PAD.top + CH).toFixed(1)} L ${PAD.left.toFixed(1)},${(PAD.top + CH).toFixed(1)} Z`;

  // 6 y-axis grid lines
  const yTicks = Array.from({ length: 6 }, (_, i) => {
    const v = yMin + (yRange / 5) * i;
    return { y: toY(v), label: `R${v.toFixed(4)}` };
  });

  // Up to 8 x-axis date labels
  // Limit to 6 ticks max, space them evenly, use short month format
  const maxTicks = Math.min(6, data.length);
  const xTicks = [];
  for (let t = 0; t < maxTicks; t++) {
    const i = Math.round((t / (maxTicks - 1)) * (data.length - 1));
    const d = new Date(data[i].date || data[i].fetched_at);
    // Short format: "3 Feb" — avoids overlap
    const label = d.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
    });
    xTicks.push({ x: toX(i), label });
  }

  const trend = data[data.length - 1].rate >= data[0].rate;
  const lc = trend ? C.up : C.down;
  const openClose = data[data.length - 1].rate - data[0].rate;
  const openClosePct = (openClose / data[0].rate) * 100;

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const idx = Math.max(
      0,
      Math.min(
        data.length - 1,
        Math.round(((mx - PAD.left) / CW) * (data.length - 1)),
      ),
    );
    setHover({
      x: toX(idx),
      y: toY(data[idx].rate),
      rate: data[idx].rate,
      dateStr: data[idx].date || data[idx].fetched_at,
    });
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", animation: "fx-chart-in 0.3s ease" }}
    >
      {/* ── v1.5: larger stats bar ── */}
      <div
        style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}
      >
        {[
          { label: "Open", val: `R${data[0].rate.toFixed(4)}`, color: C.muted },
          {
            label: "Close",
            val: `R${data[data.length - 1].rate.toFixed(4)}`,
            color: C.white,
          },
          { label: "Low", val: `R${min.toFixed(4)}`, color: C.down },
          { label: "High", val: `R${max.toFixed(4)}`, color: C.up },
          {
            label: "Change",
            val: `${openClose >= 0 ? "+" : ""}${openClose.toFixed(4)} (${openClosePct >= 0 ? "+" : ""}${openClosePct.toFixed(2)}%)`,
            color: openClose >= 0 ? C.up : C.down,
          },
        ].map((s) => (
          <div key={s.label}>
            {/* v1.5: brighter, larger label */}
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {s.label}
            </div>
            {/* v1.5: larger value */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: s.color,
                fontFamily: "'Courier New', monospace",
              }}
            >
              {s.val}
            </div>
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="ha" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lc} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lc} stopOpacity="0" />
          </linearGradient>
          <filter id="lg" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── v1.5: Y-axis grid + readable labels ── */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={t.y}
              x2={W - PAD.right}
              y2={t.y}
              stroke={C.grid}
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            <text
              x={W - PAD.right + 8}
              y={t.y + 4}
              fill={C.muted}
              fontSize="11"
              fontWeight="600"
              fontFamily="'Courier New', monospace"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* ── v1.5: X-axis tick marks + readable date labels ── */}
        {xTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.x}
              y1={PAD.top + CH}
              x2={t.x}
              y2={PAD.top + CH + 5}
              stroke={C.muted}
              strokeWidth="1"
            />
            <text
              x={t.x}
              y={H - 8}
              fill={C.text}
              fontSize="11"
              fontWeight="500"
              fontFamily="'Jost', sans-serif"
              textAnchor="middle"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#ha)" />

        {/* Glow layer */}
        <path
          d={pathD}
          fill="none"
          stroke={lc}
          strokeWidth="5"
          strokeOpacity="0.1"
          filter="url(#lg)"
          strokeLinejoin="round"
        />

        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke={lc}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Crosshair */}
        {hover && (
          <>
            <line
              x1={hover.x}
              y1={PAD.top}
              x2={hover.x}
              y2={PAD.top + CH}
              stroke={C.green}
              strokeWidth="1"
              strokeDasharray="4 4"
              strokeOpacity="0.5"
            />
            <line
              x1={PAD.left}
              y1={hover.y}
              x2={W - PAD.right}
              y2={hover.y}
              stroke={C.green}
              strokeWidth="1"
              strokeDasharray="4 4"
              strokeOpacity="0.3"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r="4"
              fill={lc}
              stroke={C.bg}
              strokeWidth="2"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r="9"
              fill="none"
              stroke={lc}
              strokeOpacity="0.3"
              strokeWidth="1"
            />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hover &&
        (() => {
          const raw = hover.dateStr;
          const d = new Date(raw);
          const label =
            raw?.length === 10
              ? d.toLocaleDateString("en-ZA", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : d.toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                }) +
                " " +
                d.toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
          const svgW = svgRef.current?.getBoundingClientRect().width || 0;
          const pctX = svgW > 0 ? (hover.x / W) * 100 : 50;
          const flip = pctX > 65;
          return (
            <div
              style={{
                position: "absolute",
                top: 52,
                left: flip ? "auto" : `${Math.min(pctX + 1.5, 75)}%`,
                right: flip ? `${100 - pctX + 1.5}%` : "auto",
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderLeft: `2px solid ${C.green}`,
                borderRadius: 3,
                padding: "8px 12px",
                pointerEvents: "none",
                minWidth: 152,
                boxShadow: "0 4px 20px rgba(0,0,0,0.55)",
                zIndex: 20,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.white,
                  fontFamily: "'Courier New', monospace",
                  marginBottom: 4,
                }}
              >
                R{hover.rate.toFixed(4)}
              </div>
              <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
            </div>
          );
        })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function LiveFXBar() {
  const [rate, setRate] = useState(null);
  const [prevRate, setPrevRate] = useState(null);
  const [history, setHistory] = useState([]);
  const [countdown, setCountdown] = useState(REFRESH_SEC);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [flashClass, setFlashClass] = useState("");
  const [eurZarLive, setEurZarLive] = useState(null);
  const [gbpZarLive, setGbpZarLive] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [activePeriod, setActivePeriod] = useState("1M");
  const [periodCache, setPeriodCache] = useState({});
  const [chartLoading, setChartLoading] = useState(false);
  const [skuList, setSkuList] = useState([]);
  const [pinnedSkuId, setPinnedSkuId] = useState(() => {
    try {
      return localStorage.getItem(SKU_LS_KEY) || null;
    } catch {
      return null;
    }
  });
  const [liveCogs, setLiveCogs] = useState(null);
  const [cogsLoading, setCogsLoading] = useState(false);
  const [skuDropOpen, setSkuDropOpen] = useState(false);

  const timerRef = useRef(null);
  const countRef = useRef(null);
  const flashRef = useRef(null);
  const prevRateRef = useRef(null);
  const cogsTimerRef = useRef(null);
  const skuBtnRef = useRef(null);

  const fetchSkuList = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("product_cogs")
        .select("id, product_name, sku")
        .order("product_name", { ascending: true });
      if (data)
        setSkuList(
          data.map((r) => ({
            id: r.id,
            name: r.product_name || r.sku || r.id,
          })),
        );
    } catch (_) {}
  }, []);

  const recalcCogs = useCallback(async (skuId, fx) => {
    if (!skuId || !fx) {
      setLiveCogs(null);
      return;
    }
    setCogsLoading(true);
    const result = await calcSkuCogs(skuId, fx);
    setLiveCogs(result);
    setCogsLoading(false);
  }, []);

  const pinSku = (id) => {
    setPinnedSkuId(id);
    try {
      if (id) localStorage.setItem(SKU_LS_KEY, id);
      else localStorage.removeItem(SKU_LS_KEY);
    } catch {}
    setSkuDropOpen(false);
    if (rate) recalcCogs(id, rate);
  };

  const loadPeriod = useCallback(
    async (periodId) => {
      if (periodCache[periodId]) return;
      setChartLoading(true);
      const period = PERIODS.find((p) => p.id === periodId);
      if (!period) {
        setChartLoading(false);
        return;
      }
      const data = await fetchHistoricalRates(period.days);
      if (data && data.length > 0) {
        setPeriodCache((c) => ({ ...c, [periodId]: data }));
      } else {
        try {
          const { data: dbData } = await supabase
            .from("fx_rates")
            .select("rate, fetched_at")
            .eq("currency_pair", "USD/ZAR")
            .gte("fetched_at", daysAgo(period.days).toISOString())
            .order("fetched_at", { ascending: true })
            .limit(2000);
          setPeriodCache((c) => ({
            ...c,
            [periodId]: (dbData || []).map((r) => ({
              date: r.fetched_at,
              rate: parseFloat(r.rate),
            })),
          }));
        } catch (_) {
          setPeriodCache((c) => ({ ...c, [periodId]: [] }));
        }
      }
      setChartLoading(false);
    },
    [periodCache],
  );

  // Pre-load 1M on mount so mini chart shows immediately in collapsed bar
  useEffect(() => {
    loadPeriod("1M");
  }, []); // eslint-disable-line
  useEffect(() => {
    if (expanded) loadPeriod(activePeriod);
  }, [expanded, activePeriod, loadPeriod]);

  const fetchCrossRates = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("fx_rates")
        .select("currency_pair, rate")
        .in("currency_pair", ["EUR/ZAR", "GBP/ZAR"])
        .order("fetched_at", { ascending: false });
      if (data && data.length > 0) {
        const eur = data.find((r) => r.currency_pair === "EUR/ZAR");
        const gbp = data.find((r) => r.currency_pair === "GBP/ZAR");
        if (eur) setEurZarLive(parseFloat(eur.rate).toFixed(4));
        if (gbp) setGbpZarLive(parseFloat(gbp.rate).toFixed(4));
        if (eur && gbp) return;
      }
    } catch (_) {}
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (res.ok) {
        const json = await res.json();
        const r = json?.rates;
        if (r?.ZAR && r?.EUR && r?.GBP) {
          setEurZarLive((r.ZAR / r.EUR).toFixed(4));
          setGbpZarLive((r.ZAR / r.GBP).toFixed(4));
        }
      }
    } catch (_) {}
  }, []);

  const fetchRate = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      let newRate = null;
      try {
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-fx-rate`);
        if (res.ok) {
          const j = await res.json();
          newRate = parseFloat(j?.usd_zar || j?.rate || 0) || null;
        }
      } catch (_) {}
      if (!newRate) {
        try {
          const { data } = await supabase
            .from("fx_rates")
            .select("rate")
            .eq("currency_pair", "USD/ZAR")
            .order("fetched_at", { ascending: false })
            .limit(1);
          if (data?.[0]?.rate) newRate = parseFloat(data[0].rate);
        } catch (_) {}
      }
      if (newRate) {
        const old = prevRateRef.current;
        if (old !== null && old !== newRate) {
          clearTimeout(flashRef.current);
          setFlashClass(newRate > old ? "fx-flash-up" : "fx-flash-down");
          flashRef.current = setTimeout(() => setFlashClass(""), 1000);
        }
        setPrevRate(old);
        prevRateRef.current = newRate;
        setRate(newRate);
        setHistory((h) => [...h.slice(-39), newRate]);
        setUpdatedAt(new Date());
        setCountdown(REFRESH_SEC);
        if (pinnedSkuId) {
          clearTimeout(cogsTimerRef.current);
          cogsTimerRef.current = setTimeout(
            () => recalcCogs(pinnedSkuId, newRate),
            200,
          );
        }
      }
      setRefreshing(false);
    },
    [pinnedSkuId, recalcCogs],
  );

  useEffect(() => {
    fetchRate(false);
    fetchCrossRates();
    fetchSkuList();
    countRef.current = setInterval(
      () => setCountdown((n) => (n <= 1 ? REFRESH_SEC : n - 1)),
      1000,
    );
    timerRef.current = setInterval(() => {
      fetchRate(true);
      fetchCrossRates();
    }, REFRESH_SEC * 1000);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countRef.current);
      clearTimeout(flashRef.current);
      clearTimeout(cogsTimerRef.current);
    };
  }, [fetchRate, fetchCrossRates, fetchSkuList]);

  useEffect(() => {
    if (pinnedSkuId && rate) recalcCogs(pinnedSkuId, rate);
  }, [pinnedSkuId]); // eslint-disable-line

  const eurZar = eurZarLive;
  const gbpZar = gbpZarLive;
  const change =
    rate && prevRate && prevRate !== rate
      ? ((rate - prevRate) / prevRate) * 100
      : null;
  const changeColor = change == null ? C.green : change >= 0 ? C.up : C.down;
  const changeArrow = change == null ? "" : change >= 0 ? "▲" : "▼";
  const chartData = periodCache[activePeriod] || null;
  const pinnedName = skuList.find((s) => s.id === pinnedSkuId)?.name || null;

  const fmtAgo = (d) => {
    if (!d) return "";
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  const tickerSegments = [
    rate ? `USD/ZAR  R${rate.toFixed(4)}` : "USD/ZAR  loading…",
    eurZar ? `EUR/ZAR  R${eurZar}` : null,
    gbpZar ? `GBP/ZAR  R${gbpZar}` : null,
    liveCogs ? `${pinnedName} COGS  R${liveCogs.total.toFixed(2)}` : null,
    "LIVE RATE · ECB DAILY HISTORY · FRANKFURTER.APP",
    ...history.slice(-6).map((r) => `R${r.toFixed(4)}`),
  ]
    .filter(Boolean)
    .join("   ·   ");

  return (
    <>
      <style>{INJECTED_CSS}</style>

      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          marginBottom: 20,
          overflow: "hidden",
          fontFamily: "'Jost','Courier New',monospace",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(82,183,136,0.08)",
          position: "relative",
        }}
      >
        {/* Scan-line texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            background:
              "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)",
          }}
        />

        {/* ══ MAIN BAR ══ */}
        <div
          className={flashClass}
          onClick={() => setExpanded((e) => !e)}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            height: 56,
            gap: 0,
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          {/* Live dot */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginRight: 14,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                width: 9,
                height: 9,
              }}
            >
              <span
                className="fx-live-dot"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: C.green,
                  boxShadow: `0 0 6px ${C.green}`,
                }}
              />
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: C.green,
              }}
            >
              LIVE
            </span>
          </div>

          <div style={{ marginRight: 10, flexShrink: 0 }}>
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              USD / ZAR
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 5,
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Courier New',monospace",
                fontSize: 26,
                fontWeight: 700,
                color: C.white,
                letterSpacing: "0.04em",
                lineHeight: 1,
                textShadow: "0 0 20px rgba(82,183,136,0.4)",
              }}
            >
              {rate ? `R${rate.toFixed(4)}` : "R——.——"}
            </span>
            {change != null && (
              <span
                style={{ fontSize: 11, fontWeight: 700, color: changeColor }}
              >
                {changeArrow}
                {Math.abs(change).toFixed(4)}%
              </span>
            )}
          </div>

          <div style={{ marginRight: 12, flexShrink: 0 }}>
            <Sparkline data={history} w={90} h={30} />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              flexShrink: 0,
            }}
          >
            <RateChip label="EUR/ZAR" value={eurZar} flag="🇪🇺" />
            <RateChip label="GBP/ZAR" value={gbpZar} flag="🇬🇧" />
          </div>

          {/* COGS pill */}
          <div style={{ marginLeft: 12, flexShrink: 0, position: "relative" }}>
            {!pinnedSkuId ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                  setSkuDropOpen(true);
                }}
                style={{
                  background: "rgba(82,183,136,0.06)",
                  border: `1px dashed ${C.border}`,
                  borderRadius: 2,
                  padding: "4px 12px",
                  color: C.dimmed,
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Jost',sans-serif",
                }}
              >
                + Pin SKU COGS
              </button>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 12px",
                  background: "rgba(82,183,136,0.07)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  COGS
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: C.green,
                    maxWidth: 100,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pinnedName}
                </span>
                {cogsLoading ? (
                  <span style={{ fontSize: 11, color: C.dimmed }}>…</span>
                ) : liveCogs ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: C.dimmed,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        lineHeight: 1,
                      }}
                    >
                      HW landed
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.greenBr,
                        fontFamily: "'Courier New',monospace",
                        lineHeight: 1.2,
                      }}
                    >
                      R{liveCogs.hwLanded.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: C.down }}>err</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                    setSkuDropOpen(true);
                  }}
                  title="Change pinned SKU"
                  style={{
                    background: "none",
                    border: "none",
                    color: C.dimmed,
                    fontSize: 10,
                    cursor: "pointer",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ⇅
                </button>
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* ── Mini historical chart in collapsed bar ── */}
          {(() => {
            const miniData =
              periodCache[activePeriod] || periodCache["1M"] || null;
            if (!miniData || miniData.length < 2) return null;
            const W = 160,
              H = 38;
            const rates = miniData.map((d) => d.rate);
            const min = Math.min(...rates) - 0.001;
            const max = Math.max(...rates) + 0.001;
            const range = max - min;
            const pts = miniData.map((d, i) => {
              const x = (i / (miniData.length - 1)) * W;
              const y = H - 2 - ((d.rate - min) / range) * (H - 4);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            });
            const trend =
              miniData[miniData.length - 1].rate >= miniData[0].rate;
            const lc = trend ? C.up : C.down;
            const [lx, ly] = pts[pts.length - 1].split(",");
            return (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
                title="Click to expand full chart"
                style={{
                  marginRight: 14,
                  flexShrink: 0,
                  cursor: "pointer",
                  opacity: 0.85,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
              >
                <svg
                  width={W}
                  height={H}
                  style={{ display: "block", overflow: "visible" }}
                >
                  <defs>
                    <linearGradient id="mini-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lc} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={lc} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points={`${pts[0]} ${pts.join(" ")} ${W},${H} 0,${H}`}
                    fill="url(#mini-fill)"
                    stroke="none"
                  />
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    stroke={lc}
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <circle cx={lx} cy={ly} r="2.5" fill={lc} />
                  <circle
                    cx={lx}
                    cy={ly}
                    r="2.5"
                    fill="none"
                    stroke={lc}
                    strokeWidth="1"
                  >
                    <animate
                      attributeName="r"
                      from="2.5"
                      to="7"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
                <div
                  style={{
                    fontSize: 8,
                    color: C.dimmed,
                    textAlign: "center",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginTop: 1,
                  }}
                >
                  {activePeriod} · click to expand
                </div>
              </div>
            );
          })()}

          <div
            style={{
              fontSize: 9,
              color: C.muted,
              marginRight: 12,
              flexShrink: 0,
              textAlign: "right",
            }}
          >
            <div
              style={{
                textTransform: "uppercase",
                marginBottom: 1,
                letterSpacing: "0.08em",
              }}
            >
              Updated
            </div>
            <div style={{ color: C.green }}>{fmtAgo(updatedAt)}</div>
          </div>

          <div style={{ marginRight: 8, flexShrink: 0 }}>
            <RingTimer sec={countdown} />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchRate(false);
              fetchCrossRates();
            }}
            title="Refresh now"
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              color: refreshing ? C.dimmed : C.green,
              fontSize: 13,
              cursor: refreshing ? "default" : "pointer",
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginRight: 8,
            }}
          >
            {refreshing ? "⏳" : "↻"}
          </button>

          <div
            style={{
              color: C.muted,
              fontSize: 11,
              flexShrink: 0,
              width: 14,
              textAlign: "center",
            }}
          >
            {expanded ? "▲" : "▾"}
          </div>
        </div>

        {/* ══ EXPANDED PANEL ══ */}
        {expanded && (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              borderTop: `1px solid ${C.border}`,
              padding: "20px 22px 22px",
            }}
          >
            {/* Header + period buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: C.dimmed,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  USD / ZAR — Daily Closing Rate History · ECB via
                  frankfurter.app
                </div>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 20,
                    fontWeight: 300,
                    color: C.white,
                  }}
                >
                  {rate ? `R${rate.toFixed(4)}` : "—"}
                  <span
                    style={{
                      fontSize: 11,
                      color: C.dimmed,
                      marginLeft: 10,
                      fontFamily: "'Jost',sans-serif",
                    }}
                  >
                    {chartData ? `${chartData.length} data points` : "loading…"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    className="fx-period-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePeriod(p.id);
                      loadPeriod(p.id);
                    }}
                    style={{
                      background:
                        activePeriod === p.id
                          ? "rgba(82,183,136,0.14)"
                          : "transparent",
                      border: `1px solid ${activePeriod === p.id ? C.green : C.border}`,
                      borderRadius: 2,
                      padding: "5px 12px",
                      fontSize: 10,
                      fontWeight: activePeriod === p.id ? 700 : 400,
                      color: activePeriod === p.id ? C.greenBr : C.muted,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div
              style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: "14px 8px 10px",
                marginBottom: 16,
              }}
            >
              <HistoryChart data={chartData} loading={chartLoading} />
            </div>

            {/* COGS + Cross rates */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {/* SKU COGS panel */}
              <div
                style={{
                  flex: "1 1 300px",
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: C.muted,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    Live COGS — Full Calculation @ R{rate?.toFixed(4)}
                  </div>
                  <div style={{ position: "relative" }} ref={skuBtnRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkuDropOpen((o) => !o);
                      }}
                      style={{
                        background: "rgba(82,183,136,0.07)",
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                        padding: "4px 10px",
                        fontSize: 9,
                        color: C.greenBr,
                        cursor: "pointer",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontFamily: "'Jost',sans-serif",
                      }}
                    >
                      {pinnedName ? `📌 ${pinnedName}` : "📌 Select SKU"}
                      <span style={{ color: C.dimmed }}>▾</span>
                    </button>
                    {skuDropOpen &&
                      (() => {
                        const rect = skuBtnRef.current?.getBoundingClientRect();
                        const spaceBelow = rect
                          ? window.innerHeight - rect.bottom - 8
                          : 300;
                        const spaceAbove = rect ? rect.top - 8 : 300;
                        const dropH = Math.min(
                          280,
                          Math.max(spaceBelow, spaceAbove) - 8,
                        );
                        const flipUp =
                          spaceBelow < 180 && spaceAbove > spaceBelow;
                        const top = rect
                          ? flipUp
                            ? rect.top - dropH - 4
                            : rect.bottom + 4
                          : 200;
                        const right = rect
                          ? window.innerWidth - rect.right
                          : 20;
                        return (
                          <>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSkuDropOpen(false);
                              }}
                              style={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 9998,
                              }}
                            />
                            <div
                              style={{
                                position: "fixed",
                                right,
                                top,
                                background: "#0d1f14",
                                border: `1px solid ${C.border}`,
                                borderRadius: 3,
                                minWidth: 260,
                                maxHeight: dropH,
                                overflowY: "auto",
                                zIndex: 9999,
                                boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                                scrollbarWidth: "thin",
                                scrollbarColor: `${C.green} ${C.bgCard}`,
                              }}
                            >
                              <div
                                className="fx-sku-row"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pinSku(null);
                                }}
                                style={{
                                  padding: "8px 14px",
                                  fontSize: 11,
                                  color: C.dimmed,
                                  cursor: "pointer",
                                  borderBottom: `1px solid ${C.border}`,
                                }}
                              >
                                — None
                              </div>
                              {skuList.length === 0 && (
                                <div
                                  style={{
                                    padding: "10px 14px",
                                    fontSize: 11,
                                    color: C.dimmed,
                                  }}
                                >
                                  No active SKUs found
                                </div>
                              )}
                              {skuList.map((sku) => (
                                <div
                                  key={sku.id}
                                  className="fx-sku-row"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    pinSku(sku.id);
                                  }}
                                  style={{
                                    padding: "8px 14px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                    color:
                                      sku.id === pinnedSkuId
                                        ? C.greenBr
                                        : C.text,
                                    background:
                                      sku.id === pinnedSkuId
                                        ? "rgba(82,183,136,0.1)"
                                        : "transparent",
                                    borderBottom: `1px solid ${C.border}`,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <span>{sku.name}</span>
                                  {sku.id === pinnedSkuId && (
                                    <span
                                      style={{ fontSize: 9, color: C.green }}
                                    >
                                      📌 pinned
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                  </div>
                </div>

                {!pinnedSkuId ? (
                  <div
                    style={{
                      padding: "20px 0",
                      textAlign: "center",
                      color: C.dimmed,
                      fontSize: 11,
                    }}
                  >
                    Select a SKU above to see its live-calculated COGS at the
                    current FX rate.
                  </div>
                ) : cogsLoading ? (
                  <div
                    className="fx-shimmer"
                    style={{ height: 60, background: C.grid, borderRadius: 2 }}
                  />
                ) : liveCogs ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Cormorant Garamond',serif",
                          fontSize: 34,
                          fontWeight: 300,
                          color: C.white,
                        }}
                      >
                        R{liveCogs.total.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 10, color: C.muted }}>
                        per unit · full COGS
                      </span>
                    </div>
                    <CogsBreakdownBar breakdown={liveCogs.breakdown} />
                    <div
                      style={{
                        fontSize: 9,
                        color: C.dimmed,
                        marginTop: 10,
                        lineHeight: 1.6,
                      }}
                    >
                      Recalculates every 60s as FX rate updates. Imported
                      components (hardware, terpene) multiply live by R
                      {rate?.toFixed(4)}. Local ZAR costs (distillate,
                      packaging, labour) are fixed until next DB update.
                    </div>
                  </>
                ) : (
                  <div
                    style={{ fontSize: 11, color: C.down, padding: "10px 0" }}
                  >
                    Could not calculate COGS for this SKU. Check product_cogs
                    recipe is complete.
                  </div>
                )}
              </div>

              {/* Cross rates */}
              <div
                style={{
                  flex: "0 1 190px",
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Live Cross Rates
                </div>
                {[
                  { pair: "USD/ZAR", value: rate?.toFixed(4), flag: "🇺🇸" },
                  { pair: "EUR/ZAR", value: eurZar, flag: "🇪🇺" },
                  { pair: "GBP/ZAR", value: gbpZar, flag: "🇬🇧" },
                ].map((r) => (
                  <div
                    key={r.pair}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "7px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <span style={{ fontSize: 11, color: C.muted }}>
                      {r.flag} {r.pair}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Courier New',monospace",
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.goldBr,
                      }}
                    >
                      {r.value ? `R${r.value}` : "—"}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    fontSize: 9,
                    color: C.dimmed,
                    marginTop: 10,
                    lineHeight: 1.6,
                  }}
                >
                  ECB sourced daily rates. History cached per period — instant
                  switch after first load.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TICKER TAPE ══ */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            borderTop: `1px solid ${C.border}`,
            background: C.bgMid,
            height: 24,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 40,
              zIndex: 2,
              background: `linear-gradient(to right,${C.bgMid},transparent)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 40,
              zIndex: 2,
              background: `linear-gradient(to left,${C.bgMid},transparent)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              display: "inline-flex",
              whiteSpace: "nowrap",
              animation: "ticker-scroll 30s linear infinite",
            }}
          >
            {[0, 1].map((idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: C.muted,
                  paddingRight: 80,
                }}
              >
                {tickerSegments}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
