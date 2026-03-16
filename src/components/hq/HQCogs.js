// src/components/hq/HQCogs.js v3.7
// v3.7 — Hardware row shows landed cost split: unit cost + shipping alloc separately
// v3.6 — Hardware MOQ displayed on cards and in builder
//         MOQ indicator shows min order qty from supplier_products.moq
//         Warning shown if batch_size < hardware MOQ
// v3.5 — Two fixes:
//   1. ChambersEditor terpene qty label corrected: "ml" → "µl" (stored value IS µl, not ml)
//      Added sub-hint showing ml conversion below field to prevent confusion
//   2. Batch scaler: breakdown line items now show ×qty = batch_total when qty > 1
// v3.4 — Clearer hardware qty label and hint
// v3.3 — Per-card batch qty selector on costing cards (per-unit + total COGS)
// v3.2 — hardware_qty > 10 warning
// v3.1 — Save try/catch/finally, CogsBar negative-pct clamp
// v3.0 — Multi-chamber hardware profiles with per-chamber distillate & terpene
// v2.2 — Case-insensitive hardware dedup, manual ZAR override for packaging & labour
// v2.1 — Inline landed cost calculator in Hardware section
// v2.0 — Lab testing, µl terpene input, transport, misc, deduped hardware, batch amortisation
// v1.0 — WP-C: COGS Engine & Local Inputs
//
// COGS formula per finished unit:
//   Hardware:     hardware_qty × (unit_price_usd × usd_zar) + shipping_alloc_zar
//   Terpene:      per chamber: terpene_qty_ul / 1000 / 50 × unit_price_usd × usd_zar
//   Distillate:   per chamber: distillate_qty_ml × cost_zar
//   Packaging:    packaging_qty × cost_zar
//   Labour:       labour_qty × cost_zar
//   Lab Testing:  sum(selected_tests) / batch_size
//   Transport:    transport_cost_zar / batch_size
//   Misc:         misc_cost_zar / batch_size

import { useState, useEffect, useCallback } from "react";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import { supabase } from "../../services/supabaseClient";

const CANNALYTICS_TESTS = [
  { id: "potency", label: "Potency / Cannabinoid Profiling", price: 350 },
  { id: "solvents", label: "Residual Solvents", price: 200 },
  { id: "microbial", label: "Microbial Analysis", price: 150 },
  { id: "mycotoxins", label: "Mycotoxins", price: 1800 },
  { id: "heavy_metal", label: "Heavy Metal", price: 1200 },
  { id: "pesticide", label: "Pesticide Analysis", price: 1000 },
  { id: "terpene_profile", label: "Terpene Profile", price: 750 },
  { id: "foreign_matter", label: "Foreign Matter", price: 100 },
];

const HARDWARE_PROFILES = [
  {
    pattern: /triple|3.cham|3x|0\.6.*0\.6.*0\.6/i,
    chambers: 3,
    defaultMl: [0.6, 0.6, 0.6],
    label: "Triple Chamber",
    emoji: "🔵🔵🔵",
    tip: "Each chamber can hold a different strain / flavour. Total: 1.8ml.",
  },
  {
    pattern: /dual|duo|2.cham|2x|1ml.*x.*2|1.*x.*1/i,
    chambers: 2,
    defaultMl: [1.0, 1.0],
    label: "Dual Chamber",
    emoji: "🔵🔵",
    tip: "Two independent chambers. Mix the same or different strains.",
  },
];

function detectHardwareProfile(name) {
  if (!name) return null;
  return HARDWARE_PROFILES.find((p) => p.pattern.test(name)) || null;
}

function blankChambers(profile) {
  return profile.defaultMl.map((ml, i) => ({
    label: `Chamber ${i + 1}`,
    distillate_input_id: "",
    distillate_qty_ml: ml,
    terpene_item_id: "",
    terpene_qty_ul: Math.round(ml * 1000 * 0.067),
  }));
}

const DDP_TIERS = [
  { maxKg: 21, ratePerKg: 15.8 },
  { maxKg: 50, ratePerKg: 15.5 },
  { maxKg: 100, ratePerKg: 15.2 },
  { maxKg: Infinity, ratePerKg: 14.9 },
];
const DDP_CLEARANCE_USD = 25;

function calcDdpAir(weightKg) {
  if (!weightKg || weightKg <= 0) return 0;
  const tier = DDP_TIERS.find((t) => weightKg <= t.maxKg);
  return weightKg * tier.ratePerKg + DDP_CLEARANCE_USD;
}

function LandedCostCalc({ usdZar, onApply }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("ddp_air");
  const [weightKg, setWeightKg] = useState("");
  const [units, setUnits] = useState("");
  const [seaUSD, setSeaUSD] = useState("");

  let freightUSD = 0;
  if (mode === "ddp_air" && weightKg)
    freightUSD = calcDdpAir(parseFloat(weightKg));
  if (mode === "standard_air") freightUSD = 800;
  if (mode === "sea" && seaUSD) freightUSD = parseFloat(seaUSD);

  const freightZAR = freightUSD * usdZar;
  const unitsN = parseFloat(units) || 0;
  const perUnitZAR = unitsN > 0 ? freightZAR / unitsN : null;

  const s = {
    padding: "7px 10px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontFamily: "Jost, sans-serif",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "1px solid #90CAF9",
          borderRadius: 6,
          color: "#1565C0",
          fontSize: 12,
          padding: "4px 12px",
          cursor: "pointer",
          fontFamily: "Jost, sans-serif",
          fontWeight: 600,
        }}
      >
        {open ? "▲ Hide" : "🚢 Calculate landed cost per unit"}
      </button>
      {open && (
        <div
          style={{
            marginTop: 10,
            background: "#EBF5FB",
            border: "1px solid #90CAF9",
            borderRadius: 8,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1565C0",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Shipping Cost → Per-Unit Allocation
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                Shipping Mode
              </div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={s}
              >
                <option value="ddp_air">DDP Air (per kg)</option>
                <option value="standard_air">Standard Air ($800 flat)</option>
                <option value="sea">Sea Freight (manual)</option>
              </select>
            </div>
            {mode === "ddp_air" && (
              <div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                  Total shipment weight (kg)
                </div>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 12"
                  style={s}
                />
              </div>
            )}
            {mode === "sea" && (
              <div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                  Freight cost (USD)
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={seaUSD}
                  onChange={(e) => setSeaUSD(e.target.value)}
                  placeholder="e.g. 800"
                  style={s}
                />
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                Units in shipment
              </div>
              <input
                type="number"
                min="1"
                step="1"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g. 1000"
                style={s}
              />
            </div>
          </div>
          {freightUSD > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                background: "#fff",
                border: "1px solid #90CAF9",
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#888",
                    textTransform: "uppercase",
                  }}
                >
                  Total freight
                </div>
                <div style={{ fontWeight: 700, color: "#1565C0" }}>
                  ${freightUSD.toFixed(2)} · R{freightZAR.toFixed(2)}
                </div>
              </div>
              {perUnitZAR !== null && (
                <>
                  <div style={{ color: "#ccc" }}>÷</div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#888",
                        textTransform: "uppercase",
                      }}
                    >
                      Units
                    </div>
                    <div style={{ fontWeight: 700, color: "#1565C0" }}>
                      {unitsN.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ color: "#ccc" }}>=</div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#888",
                        textTransform: "uppercase",
                      }}
                    >
                      Per-unit shipping
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#1565C0",
                      }}
                    >
                      R{perUnitZAR.toFixed(4)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onApply(perUnitZAR.toFixed(4));
                      setOpen(false);
                    }}
                    style={{
                      marginLeft: "auto",
                      background: "#1565C0",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontFamily: "Jost, sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    ↑ Apply to recipe
                  </button>
                </>
              )}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#5C9BD6" }}>
            DDP rates: ≤21kg $15.80/kg · 21–50kg $15.50/kg · 50–100kg $15.20/kg
            · 100kg+ $14.90/kg · +$25 clearance
          </div>
        </div>
      )}
    </div>
  );
}

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
      setFxRate({ usd_zar: 18.5, eur_zar: 20.2, source: "fallback" });
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

function calcCogs(recipe, supplierProducts, localInputs, usdZar) {
  if (!recipe || !usdZar) return null;
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

  let tpCost = 0,
    diCost = 0,
    chamberSummary = null;
  const chamberData =
    Array.isArray(recipe.chambers) && recipe.chambers.length > 1
      ? recipe.chambers
      : null;

  if (chamberData) {
    chamberSummary = chamberData.map((ch) => {
      const chTp = supplierProducts.find((p) => p.id === ch.terpene_item_id);
      const chDi = localInputs.find((i) => i.id === ch.distillate_input_id);
      const ul = parseFloat(ch.terpene_qty_ul || 0);
      const ml = ul / 1000;
      const cpml = chTp ? (parseFloat(chTp.unit_price_usd) / 50) * usdZar : 0;
      const tc = chTp ? ml * cpml : 0;
      const dc =
        chDi && chDi.cost_zar
          ? parseFloat(ch.distillate_qty_ml || 0) * parseFloat(chDi.cost_zar)
          : 0;
      tpCost += tc;
      diCost += dc;
      return {
        label: ch.label || "Chamber",
        diName: chDi?.name || null,
        tpName: chTp?.name || null,
        diCost: dc,
        tpCost: tc,
        ml: parseFloat(ch.distillate_qty_ml || 0),
        ul,
      };
    });
  } else {
    const terpUl = parseFloat(recipe.terpene_qty_ul || 0);
    const terpMl = terpUl / 1000;
    const tpCostPerMl = tp ? (parseFloat(tp.unit_price_usd) / 50) * usdZar : 0;
    tpCost = tp ? terpMl * tpCostPerMl : 0;
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
  const transportPU = parseFloat(recipe.transport_cost_zar || 0) / batchSize;
  const miscPU = parseFloat(recipe.misc_cost_zar || 0) / batchSize;
  const total =
    hwCost +
    tpCost +
    diCost +
    pkCost +
    lbCost +
    labPerUnit +
    transportPU +
    miscPU;

  return {
    hardware: hwCost,
    terpene: tpCost,
    distillate: diCost,
    packaging: pkCost,
    labour: lbCost,
    lab: labPerUnit,
    transport: transportPU,
    misc: miscPU,
    total,
    hwBaseZar: hw
      ? parseFloat(recipe.hardware_qty || 1) *
        parseFloat(hw.unit_price_usd) *
        usdZar
      : 0,
    hwShippingZar: parseFloat(recipe.shipping_alloc_zar || 0),
    hwName: hw?.name || null,
    hwMoq: hw?.moq || null,
    tpName: tp?.name || null,
    diName: di?.name || null,
    pkName: pk?.name || null,
    lbName: lb?.name || null,
    labTests,
    labTotal,
    batchSize,
    chamberSummary,
    isMultiChamber: !!chamberSummary,
    hasMissingCosts:
      (pk && !pk.cost_zar && !recipe.packaging_manual_zar) ||
      (lb && !lb.cost_zar && !recipe.labour_manual_zar),
  };
}

const fmtZar = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n, dp = 2) => (parseFloat(n) || 0).toFixed(dp);

function dedupeByName(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const CATEGORY_COLOURS = {
  hardware: { bg: "#E3F2FD", color: "#1565C0" },
  terpene: { bg: "#F3E5F5", color: "#6A1B9A" },
  distillate: { bg: "#FFF8E1", color: "#F57F17" },
  packaging: { bg: "#E8F5E9", color: "#2E7D32" },
  labour: { bg: "#FCE4EC", color: "#880E4F" },
  lab: { bg: "#E8EAF6", color: "#283593" },
  transport: { bg: "#E0F7FA", color: "#00695C" },
  misc: { bg: "#ECEFF1", color: "#455A64" },
  other: { bg: "#ECEFF1", color: "#455A64" },
};

function CogsBar({ breakdown }) {
  if (!breakdown || breakdown.total === 0) return null;
  const categories = [
    { key: "hardware", label: "Hardware" },
    { key: "terpene", label: "Terpene" },
    { key: "distillate", label: "Distillate" },
    { key: "packaging", label: "Packaging" },
    { key: "labour", label: "Labour" },
    { key: "lab", label: "Lab" },
    { key: "transport", label: "Transport" },
    { key: "misc", label: "Misc" },
  ].filter((c) => breakdown[c.key] > 0);

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          height: 10,
          borderRadius: 5,
          overflow: "hidden",
          gap: 1,
        }}
      >
        {categories.map((c) => {
          const pct = Math.max(0, (breakdown[c.key] / breakdown.total) * 100);
          const col = CATEGORY_COLOURS[c.key] || CATEGORY_COLOURS.other;
          return (
            <div
              key={c.key}
              style={{
                width: `${pct}%`,
                background: col.color,
                minWidth: pct > 0.5 ? 3 : 0,
              }}
              title={`${c.label}: ${fmtZar(breakdown[c.key])} (${fmt(pct)}%)`}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        {categories.map((c) => {
          const pct = Math.max(0, (breakdown[c.key] / breakdown.total) * 100);
          const col = CATEGORY_COLOURS[c.key] || CATEGORY_COLOURS.other;
          return (
            <div
              key={c.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: col.color,
                }}
              />
              <span style={{ color: "#666" }}>
                {c.label}: <strong>{fmt(pct)}%</strong>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const blankRecipe = () => ({
  product_name: "",
  sku: "",
  batch_size: 50,
  hardware_item_id: "",
  hardware_qty: 1,
  shipping_alloc_zar: 0,
  terpene_item_id: "",
  terpene_qty_ul: 67,
  distillate_input_id: "",
  distillate_qty_ml: 1,
  packaging_input_id: "",
  packaging_qty: 1,
  labour_input_id: "",
  labour_qty: 1,
  lab_tests: [],
  transport_cost_zar: 0,
  misc_cost_zar: 0,
  packaging_manual_zar: "",
  labour_manual_zar: "",
  chambers: null,
  notes: "",
});

const CHAMBER_COLORS = [
  { bg: "#E3F2FD", border: "#90CAF9", accent: "#1565C0", dot: "#42A5F5" },
  { bg: "#F3E5F5", border: "#CE93D8", accent: "#6A1B9A", dot: "#AB47BC" },
  { bg: "#FFF8E1", border: "#FFE082", accent: "#F57F17", dot: "#FFCA28" },
];

// ── ChambersEditor ────────────────────────────────────────────────────────────
// v3.5 FIX: Terpene qty column label changed from "Qty (ml)" → "Qty (µl)"
//           Added conversion hint below field: "= Xml" so it's unambiguous
function ChambersEditor({
  chambers,
  onChange,
  distillateInputs,
  terpeneItems,
  usdZar,
  fmtZar,
  fmt,
  inputStyle,
  lbl,
}) {
  const setChField = (idx, key, val) => {
    onChange(chambers.map((ch, i) => (i === idx ? { ...ch, [key]: val } : ch)));
  };

  const totalDistillate = chambers.reduce(
    (s, ch) => s + parseFloat(ch.distillate_qty_ml || 0),
    0,
  );

  return (
    <div>
      {/* Summary header */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
          background: "#f8f9fa",
          borderRadius: 8,
          padding: "10px 14px",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13, color: "#555" }}>
          <strong style={{ color: "#333" }}>{chambers.length} chambers</strong>
          <span style={{ color: "#aaa", margin: "0 8px" }}>·</span>
          <strong style={{ color: "#1565C0" }}>
            {totalDistillate.toFixed(2)}ml
          </strong>
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 4 }}>
            total distillate
          </span>
        </div>
        {chambers.map((ch, i) => {
          const col = CHAMBER_COLORS[i % CHAMBER_COLORS.length];
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: col.bg,
                border: `1px solid ${col.border}`,
                borderRadius: 6,
                padding: "3px 10px",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: col.dot,
                  flexShrink: 0,
                }}
              />
              <span
                style={{ fontSize: 12, color: col.accent, fontWeight: 600 }}
              >
                {ch.label || `Ch.${i + 1}`}
              </span>
              <span style={{ fontSize: 11, color: col.accent }}>
                {ch.distillate_qty_ml}ml
              </span>
            </div>
          );
        })}
      </div>

      {/* Per-chamber cards */}
      {chambers.map((ch, idx) => {
        const col = CHAMBER_COLORS[idx % CHAMBER_COLORS.length];
        const terpPct =
          ch.distillate_qty_ml > 0
            ? (
                (parseFloat(ch.terpene_qty_ul || 0) /
                  1000 /
                  parseFloat(ch.distillate_qty_ml)) *
                100
              ).toFixed(1)
            : "0.0";
        const tp = terpeneItems.find((p) => p.id === ch.terpene_item_id);
        const di = distillateInputs.find(
          (i) => i.id === ch.distillate_input_id,
        );
        const terpMl = parseFloat(ch.terpene_qty_ul || 0) / 1000;
        const tpCostPerMl = tp
          ? (parseFloat(tp.unit_price_usd) / 50) * usdZar
          : 0;
        const chTpCost = tp ? terpMl * tpCostPerMl : 0;
        const chDiCost =
          di && di.cost_zar
            ? parseFloat(ch.distillate_qty_ml || 0) * parseFloat(di.cost_zar)
            : 0;

        const presets = [
          {
            label: "3%",
            ul: Math.round(parseFloat(ch.distillate_qty_ml || 1) * 30),
          },
          {
            label: "5%",
            ul: Math.round(parseFloat(ch.distillate_qty_ml || 1) * 50),
          },
          {
            label: "7%",
            ul: Math.round(parseFloat(ch.distillate_qty_ml || 1) * 70),
          },
          {
            label: "10%",
            ul: Math.round(parseFloat(ch.distillate_qty_ml || 1) * 100),
          },
        ];

        return (
          <div
            key={idx}
            style={{
              border: `1.5px solid ${col.border}`,
              borderRadius: 12,
              marginBottom: 14,
              overflow: "hidden",
            }}
          >
            {/* Chamber header */}
            <div
              style={{
                background: col.bg,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: col.dot,
                  flexShrink: 0,
                }}
              />
              <input
                value={ch.label}
                onChange={(e) => setChField(idx, "label", e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: col.accent,
                  flex: 1,
                  outline: "none",
                }}
                placeholder={`Chamber ${idx + 1}`}
              />
              <div
                style={{
                  fontSize: 11,
                  color: col.accent,
                  background: "rgba(255,255,255,0.6)",
                  borderRadius: 5,
                  padding: "2px 8px",
                }}
              >
                {chDiCost > 0 || chTpCost > 0
                  ? fmtZar(chDiCost + chTpCost)
                  : "—"}
              </div>
            </div>

            {/* Chamber body */}
            <div style={{ padding: "14px 16px", background: "#fff" }}>
              {/* Distillate row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "3fr 1fr",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 5,
                    }}
                  >
                    💧 Distillate
                  </div>
                  <select
                    value={ch.distillate_input_id}
                    onChange={(e) =>
                      setChField(idx, "distillate_input_id", e.target.value)
                    }
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="">— None —</option>
                    {distillateInputs.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}{" "}
                        {i.cost_zar
                          ? `(R${parseFloat(i.cost_zar).toFixed(2)}/ml)`
                          : "(TBD)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 5,
                    }}
                  >
                    Qty (ml)
                  </div>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={ch.distillate_qty_ml}
                    onChange={(e) =>
                      setChField(idx, "distillate_qty_ml", e.target.value)
                    }
                    style={{ ...inputStyle, fontSize: 13 }}
                  />
                </div>
              </div>
              {di && di.cost_zar && (
                <div
                  style={{ fontSize: 11, color: "#F57F17", marginBottom: 10 }}
                >
                  Distillate: R{parseFloat(di.cost_zar).toFixed(2)}/ml ×{" "}
                  {ch.distillate_qty_ml}ml = {fmtZar(chDiCost)}
                </div>
              )}

              {/* Terpene row — v3.5: label corrected to µl, ml conversion hint added */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "3fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 5,
                    }}
                  >
                    🌿 Terpene Blend
                  </div>
                  <select
                    value={ch.terpene_item_id}
                    onChange={(e) =>
                      setChField(idx, "terpene_item_id", e.target.value)
                    }
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="">— None —</option>
                    {terpeneItems.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${parseFloat(p.unit_price_usd).toFixed(2)}
                        /50ml)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  {/* ── v3.5 FIX: was "Qty (ml)" — corrected to "Qty (µl)" ── */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: col.accent,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 5,
                    }}
                  >
                    Qty (µl)
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max="2000"
                    value={ch.terpene_qty_ul}
                    onChange={(e) =>
                      setChField(idx, "terpene_qty_ul", e.target.value)
                    }
                    style={{
                      ...inputStyle,
                      fontSize: 13,
                      borderColor: col.border,
                    }}
                  />
                  {/* Conversion hint — shows ml equivalent so there's no ambiguity */}
                  {parseFloat(ch.terpene_qty_ul) > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: col.accent,
                        marginTop: 3,
                        fontWeight: 600,
                      }}
                    >
                      = {(parseFloat(ch.terpene_qty_ul) / 1000).toFixed(4)} ml
                    </div>
                  )}
                </div>
              </div>

              {/* Terpene presets + info */}
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setChField(idx, "terpene_qty_ul", p.ul)}
                    style={{
                      padding: "2px 7px",
                      borderRadius: 5,
                      border: `1px solid ${col.border}`,
                      background:
                        parseInt(ch.terpene_qty_ul) === p.ul
                          ? col.bg
                          : "#fafafa",
                      color: col.accent,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "Jost, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                {parseFloat(ch.terpene_qty_ul) > 0 && (
                  <span
                    style={{ fontSize: 11, color: col.accent, marginLeft: 4 }}
                  >
                    = {(parseFloat(ch.terpene_qty_ul) / 1000).toFixed(4)}ml ·{" "}
                    {terpPct}% of {ch.distillate_qty_ml}ml
                    {tp && (
                      <span style={{ color: "#aaa" }}>
                        {" "}
                        · {fmtZar(chTpCost)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function HQCogs() {
  const { fxRate, fxLoading } = useFxRate();
  const usdZar = fxRate?.usd_zar || 18.5;
  const ctx = usePageContext("costing", null);

  const [recipes, setRecipes] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [localInputs, setLocalInputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("costing");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [form, setForm] = useState(blankRecipe());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [cardQty, setCardQty] = useState({});
  const [editingInput, setEditingInput] = useState(null);
  const [inputEditVal, setInputEditVal] = useState("");
  const [savingInput, setSavingInput] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([
      supabase
        .from("product_cogs")
        .select("*")
        .eq("is_active", true)
        .order("product_name"),
      supabase
        .from("supplier_products")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("name"),
      supabase
        .from("local_inputs")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("name"),
    ]);
    setRecipes(r1.data || []);
    setSupplierProducts(r2.data || []);
    setLocalInputs(r3.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const hardwareItems = dedupeByName(
    supplierProducts.filter((p) => p.category === "hardware"),
  );
  const terpeneItems = supplierProducts.filter((p) => p.category === "terpene");
  const distillateInputs = localInputs.filter(
    (i) => i.category === "distillate",
  );
  const packagingInputs = localInputs.filter((i) => i.category === "packaging");
  const labourInputs = localInputs.filter((i) => i.category === "labour");

  const activeHwItem = hardwareItems.find(
    (p) => p.id === form.hardware_item_id,
  );
  const activeProfile = activeHwItem
    ? detectHardwareProfile(activeHwItem.name)
    : null;
  const isMultiChamber =
    activeProfile !== null &&
    Array.isArray(form.chambers) &&
    form.chambers.length > 1;

  const getCardQty = (id) => cardQty[id] || 1;
  const setCardQtyFor = (id, n) =>
    setCardQty((prev) => ({ ...prev, [id]: Math.max(1, parseInt(n) || 1) }));

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const openNew = () => {
    setEditingRecipe(null);
    setForm(blankRecipe());
    setShowBuilder(true);
  };

  const openEdit = (recipe) => {
    setEditingRecipe(recipe);
    setForm({
      product_name: recipe.product_name || "",
      sku: recipe.sku || "",
      batch_size: recipe.batch_size ?? 50,
      hardware_item_id: recipe.hardware_item_id || "",
      hardware_qty: recipe.hardware_qty ?? 1,
      shipping_alloc_zar: recipe.shipping_alloc_zar ?? 0,
      terpene_item_id: recipe.terpene_item_id || "",
      terpene_qty_ul:
        recipe.terpene_qty_ul != null
          ? recipe.terpene_qty_ul
          : recipe.terpene_qty_g != null
            ? Math.round(recipe.terpene_qty_g * 1000)
            : 67,
      distillate_input_id: recipe.distillate_input_id || "",
      distillate_qty_ml: recipe.distillate_qty_ml ?? 1,
      packaging_input_id: recipe.packaging_input_id || "",
      packaging_qty: recipe.packaging_qty ?? 1,
      labour_input_id: recipe.labour_input_id || "",
      labour_qty: recipe.labour_qty ?? 1,
      lab_tests: Array.isArray(recipe.lab_tests) ? recipe.lab_tests : [],
      transport_cost_zar: recipe.transport_cost_zar ?? 0,
      misc_cost_zar: recipe.misc_cost_zar ?? 0,
      packaging_manual_zar:
        recipe.packaging_manual_zar != null
          ? String(recipe.packaging_manual_zar)
          : "",
      labour_manual_zar:
        recipe.labour_manual_zar != null
          ? String(recipe.labour_manual_zar)
          : "",
      chambers: Array.isArray(recipe.chambers) ? recipe.chambers : null,
      notes: recipe.notes || "",
    });
    setShowBuilder(true);
  };

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleHardwareChange = (hwId) => {
    const hw = hardwareItems.find((p) => p.id === hwId);
    const profile = hw ? detectHardwareProfile(hw.name) : null;
    setForm((f) => ({
      ...f,
      hardware_item_id: hwId,
      chambers: profile
        ? Array.isArray(f.chambers) && f.chambers.length === profile.chambers
          ? f.chambers
          : blankChambers(profile)
        : null,
    }));
  };

  const toggleLabTest = (id) => {
    setForm((f) => {
      const tests = Array.isArray(f.lab_tests) ? f.lab_tests : [];
      return {
        ...f,
        lab_tests: tests.includes(id)
          ? tests.filter((t) => t !== id)
          : [...tests, id],
      };
    });
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        product_name: form.product_name.trim(),
        sku: form.sku.trim() || null,
        batch_size: parseInt(form.batch_size) || 50,
        hardware_item_id: form.hardware_item_id || null,
        hardware_qty: parseFloat(form.hardware_qty) || 1,
        shipping_alloc_zar: parseFloat(form.shipping_alloc_zar) || 0,
        terpene_item_id: form.terpene_item_id || null,
        terpene_qty_ul: parseFloat(form.terpene_qty_ul) || null,
        distillate_input_id: form.distillate_input_id || null,
        distillate_qty_ml: parseFloat(form.distillate_qty_ml) || null,
        packaging_input_id: form.packaging_input_id || null,
        packaging_qty: parseFloat(form.packaging_qty) || 1,
        labour_input_id: form.labour_input_id || null,
        labour_qty: parseFloat(form.labour_qty) || 1,
        lab_tests: Array.isArray(form.lab_tests) ? form.lab_tests : [],
        transport_cost_zar: parseFloat(form.transport_cost_zar) || 0,
        misc_cost_zar: parseFloat(form.misc_cost_zar) || 0,
        packaging_manual_zar:
          form.packaging_manual_zar !== ""
            ? parseFloat(form.packaging_manual_zar)
            : null,
        labour_manual_zar:
          form.labour_manual_zar !== ""
            ? parseFloat(form.labour_manual_zar)
            : null,
        chambers:
          Array.isArray(form.chambers) && form.chambers.length > 1
            ? form.chambers
            : null,
        notes: form.notes.trim() || null,
      };
      const { error } = editingRecipe
        ? await supabase
            .from("product_cogs")
            .update(payload)
            .eq("id", editingRecipe.id)
        : await supabase.from("product_cogs").insert(payload);
      if (error) {
        console.error("COGS save error:", error);
        showToast(`❌ Save failed: ${error.message}`);
      } else {
        showToast(
          editingRecipe
            ? `✅ ${payload.product_name} updated`
            : `✅ ${payload.product_name} added to COGS registry`,
        );
        setShowBuilder(false);
        fetchAll();
      }
    } catch (err) {
      console.error("COGS save exception:", err);
      showToast(`❌ Unexpected error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await supabase
      .from("product_cogs")
      .update({ is_active: false })
      .eq("id", id);
    setDeleteConfirm(null);
    showToast("🗑 SKU removed from COGS registry");
    fetchAll();
  };

  const handleSaveInput = async (inputId) => {
    setSavingInput(true);
    const val = parseFloat(inputEditVal);
    if (!isNaN(val) && val > 0) {
      await supabase
        .from("local_inputs")
        .update({ cost_zar: val })
        .eq("id", inputId);
      showToast("✅ Cost updated");
    }
    setSavingInput(false);
    setEditingInput(null);
    setInputEditVal("");
    fetchAll();
  };

  const previewBreakdown = calcCogs(
    form,
    supplierProducts,
    localInputs,
    usdZar,
  );

  const terpPct =
    form.distillate_qty_ml > 0
      ? (
          (parseFloat(form.terpene_qty_ul) /
            1000 /
            parseFloat(form.distillate_qty_ml)) *
          100
        ).toFixed(1)
      : null;

  const card = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #f0ede8",
    padding: 24,
    marginBottom: 20,
  };
  const inputStyle = {
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontFamily: "Jost, sans-serif",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };
  const selectStyle = { ...inputStyle, background: "#fff" };
  const btn = (variant = "primary", extra = {}) => ({
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: "Jost, sans-serif",
    fontWeight: 600,
    fontSize: 14,
    transition: "opacity 0.15s",
    ...(variant === "primary" ? { background: "#2d4a2d", color: "#fff" } : {}),
    ...(variant === "ghost"
      ? {
          background: "transparent",
          color: "#2d4a2d",
          border: "1px solid #2d4a2d",
        }
      : {}),
    ...(variant === "danger" ? { background: "#c62828", color: "#fff" } : {}),
    ...(variant === "small"
      ? {
          background: "#f5f5f5",
          color: "#555",
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 500,
        }
      : {}),
    ...extra,
  });
  const lbl = (text) => (
    <label
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#888",
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        display: "block",
        marginBottom: 6,
      }}
    >
      {text}
    </label>
  );

  const SUB_TABS = [
    { id: "costing", label: "📊 SKU COGS Builder" },
    { id: "local-inputs", label: "🧪 Local Inputs" },
  ];

  return (
    <div style={{ fontFamily: "Jost, sans-serif", color: "#333" }}>
      <WorkflowGuide
        context={ctx}
        tabId="costing"
        onAction={(action) => action.tab && setActiveSubTab(action.tab)}
        defaultOpen={true}
      />
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "#2d4a2d",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          {toast}
        </div>
      )}

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
            Costing
          </h2>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: 14 }}>
            Cost-of-goods-sold per finished SKU · live ZAR calculations
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
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
          {activeSubTab === "costing" && (
            <button style={btn("primary")} onClick={openNew}>
              + New SKU Recipe
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab nav */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #f0ede8",
          marginBottom: 28,
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "10px 20px",
              fontFamily: "Jost, sans-serif",
              fontSize: 13,
              fontWeight: activeSubTab === t.id ? 700 : 400,
              color: activeSubTab === t.id ? "#2d4a2d" : "#999",
              borderBottom:
                activeSubTab === t.id
                  ? "2px solid #2d4a2d"
                  : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LOCAL INPUTS TAB ── */}
      {activeSubTab === "local-inputs" && (
        <div>
          <div style={card}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#2d4a2d" }}>
              Local Inputs
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>
              ZAR costs for locally-sourced inputs. Click a cost to edit.
            </p>
            {["distillate", "packaging", "labour"].map((cat) => {
              const items = localInputs.filter((i) => i.category === cat);
              const col = CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.other;
              return (
                <div key={cat} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "3px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      background: col.bg,
                      color: col.color,
                      marginBottom: 12,
                    }}
                  >
                    {cat}
                  </div>
                  {items.length === 0 ? (
                    <div style={{ color: "#bbb", fontSize: 13 }}>
                      No {cat} inputs found.
                    </div>
                  ) : (
                    items.map((inp) => (
                      <div
                        key={inp.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          padding: "14px 18px",
                          borderRadius: 10,
                          border: "1px solid #f0ede8",
                          marginBottom: 8,
                          background: "#fafaf8",
                        }}
                      >
                        <div style={{ flex: 2 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {inp.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#999",
                              marginTop: 2,
                            }}
                          >
                            {inp.unit}
                          </div>
                        </div>
                        {editingInput === inp.id ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flex: 1,
                            }}
                          >
                            <span style={{ fontSize: 14, color: "#555" }}>
                              R
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={inputEditVal}
                              onChange={(e) => setInputEditVal(e.target.value)}
                              style={{ ...inputStyle, width: 120 }}
                              autoFocus
                            />
                            <span style={{ fontSize: 12, color: "#999" }}>
                              per {inp.unit?.replace("per ", "")}
                            </span>
                            <button
                              style={btn("primary", {
                                padding: "8px 16px",
                                fontSize: 13,
                              })}
                              onClick={() => handleSaveInput(inp.id)}
                              disabled={savingInput}
                            >
                              {savingInput ? "…" : "Save"}
                            </button>
                            <button
                              style={btn("small")}
                              onClick={() => {
                                setEditingInput(null);
                                setInputEditVal("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 16,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 700,
                                color: inp.cost_zar ? "#2d4a2d" : "#bbb",
                                cursor: "pointer",
                                flex: 1,
                              }}
                              onClick={() => {
                                setEditingInput(inp.id);
                                setInputEditVal(inp.cost_zar || "");
                              }}
                              title="Click to edit"
                            >
                              {inp.cost_zar
                                ? `R${parseFloat(inp.cost_zar).toFixed(2)}`
                                : "TBD — click to set"}
                            </div>
                            <button
                              style={btn("small")}
                              onClick={() => {
                                setEditingInput(inp.id);
                                setInputEditVal(inp.cost_zar || "");
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
          <div
            style={{
              background: "#f8f9fa",
              borderRadius: 10,
              padding: "16px 20px",
              fontSize: 13,
              color: "#666",
              border: "1px solid #e0e0e0",
            }}
          >
            <strong>ℹ️ Note:</strong> Terpene & hardware are imported items
            priced in USD — ZAR cost is calculated live. To update imported item
            prices go to <strong>HQ → Suppliers → Product Catalogue</strong>.
          </div>
        </div>
      )}

      {/* ── COGS BUILDER TAB ── */}
      {activeSubTab === "costing" && (
        <div>
          {localInputs.some((i) => !i.cost_zar) && (
            <div
              style={{
                background: "#fff8e1",
                border: "1px solid #ffe082",
                borderRadius: 10,
                padding: "12px 18px",
                marginBottom: 20,
                fontSize: 13,
                color: "#F57F17",
              }}
            >
              ⚠️ Some local input costs are still <strong>TBD</strong>{" "}
              (packaging, labour). Set them in the <strong>Local Inputs</strong>{" "}
              tab.
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
              Loading COGS data…
            </div>
          ) : recipes.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 42, marginBottom: 16 }}>🧮</div>
              <h3
                style={{
                  color: "#2d4a2d",
                  fontFamily: "Cormorant Garamond, serif",
                  fontWeight: 600,
                }}
              >
                No SKU recipes yet
              </h3>
              <p style={{ color: "#999", fontSize: 14, marginBottom: 24 }}>
                Build a recipe for each finished product SKU.
              </p>
              <button style={btn("primary")} onClick={openNew}>
                + Build First SKU Recipe
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                gap: 20,
              }}
            >
              {recipes.map((recipe) => {
                const bd = calcCogs(
                  recipe,
                  supplierProducts,
                  localInputs,
                  usdZar,
                );
                return (
                  <div key={recipe.id} style={{ ...card, marginBottom: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#2d4a2d",
                          }}
                        >
                          {recipe.product_name}
                        </div>
                        {recipe.sku && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#999",
                              marginTop: 2,
                            }}
                          >
                            {recipe.sku}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          {bd && (
                            <div style={{ fontSize: 11, color: "#aaa" }}>
                              Batch: {bd.batchSize} units
                            </div>
                          )}
                          {bd?.isMultiChamber && (
                            <div
                              style={{
                                fontSize: 11,
                                background: "#E3F2FD",
                                color: "#1565C0",
                                borderRadius: 4,
                                padding: "1px 7px",
                                fontWeight: 600,
                              }}
                            >
                              {bd.chamberSummary.length}-Chamber
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          style={btn("small")}
                          onClick={() => openEdit(recipe)}
                        >
                          Edit
                        </button>
                        <button
                          style={btn("small", { color: "#c62828" })}
                          onClick={() => setDeleteConfirm(recipe.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const qty = getCardQty(recipe.id);
                      const total = bd?.total || 0;
                      return (
                        <>
                          <div
                            style={{
                              background: bd?.hasMissingCosts
                                ? "#fff8e1"
                                : "#f0f7f0",
                              border: `1px solid ${bd?.hasMissingCosts ? "#ffe082" : "#c8e6c9"}`,
                              borderRadius: 10,
                              padding: "14px 18px",
                              marginBottom: 10,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#888",
                                  marginBottom: 4,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.3px",
                                }}
                              >
                                COGS per unit
                              </div>
                              <div
                                style={{
                                  fontSize: 28,
                                  fontWeight: 700,
                                  color: "#2d4a2d",
                                }}
                              >
                                {bd ? fmtZar(total) : "—"}
                              </div>
                            </div>
                            {bd?.hasMissingCosts && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#F57F17",
                                  textAlign: "right",
                                }}
                              >
                                ⚠️ Incomplete
                                <br />
                                (TBD costs)
                              </div>
                            )}
                          </div>

                          {/* MOQ warning — show if batch qty < hardware MOQ */}
                          {bd?.hwMoq &&
                            getCardQty(recipe.id) < parseInt(bd.hwMoq) && (
                              <div
                                style={{
                                  background: "#FFF3E0",
                                  border: "1px solid #FFB74D",
                                  borderRadius: 8,
                                  padding: "9px 14px",
                                  marginBottom: 10,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  fontSize: 12,
                                }}
                              >
                                <span style={{ fontSize: 16 }}>⚠️</span>
                                <div>
                                  <strong style={{ color: "#E65100" }}>
                                    Below hardware MOQ
                                  </strong>
                                  <span
                                    style={{ color: "#BF360C", marginLeft: 6 }}
                                  >
                                    Minimum order is{" "}
                                    {parseInt(bd.hwMoq).toLocaleString()} units
                                    — you're showing{" "}
                                    {getCardQty(recipe.id).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          {/* Batch qty selector */}
                          <div
                            style={{
                              background: "#fafafa",
                              border: "1px solid #eee",
                              borderRadius: 10,
                              padding: "10px 14px",
                              marginBottom: 14,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#555",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.4px",
                                  flexShrink: 0,
                                }}
                              >
                                Batch
                              </div>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={qty}
                                onChange={(e) =>
                                  setCardQtyFor(recipe.id, e.target.value)
                                }
                                style={{
                                  width: 72,
                                  padding: "4px 8px",
                                  border: "1px solid #ddd",
                                  borderRadius: 6,
                                  fontFamily: "Jost, sans-serif",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#2d4a2d",
                                  textAlign: "center",
                                }}
                              />
                              {[1, 50, 100, 500, 1000].map((n) => (
                                <button
                                  key={n}
                                  onClick={() => setCardQtyFor(recipe.id, n)}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: 5,
                                    border: "1px solid #ddd",
                                    background: qty === n ? "#2d4a2d" : "#fff",
                                    color: qty === n ? "#fff" : "#555",
                                    cursor: "pointer",
                                    fontSize: 11,
                                    fontFamily: "Jost, sans-serif",
                                    fontWeight: 600,
                                  }}
                                >
                                  {n >= 1000 ? `${n / 1000}k` : n}
                                </button>
                              ))}
                              <div
                                style={{
                                  marginLeft: "auto",
                                  textAlign: "right",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#888",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Total COGS × {qty.toLocaleString()}
                                </div>
                                <div
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "#c62828",
                                  }}
                                >
                                  {fmtZar(total * qty)}
                                </div>
                                {qty > 1 && (
                                  <div style={{ fontSize: 10, color: "#aaa" }}>
                                    {fmtZar(total)}/unit ×{" "}
                                    {qty.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Breakdown rows — v3.5: shows ×qty = batch_total when qty > 1 */}
                    {bd && (
                      <div style={{ fontSize: 13 }}>
                        {[
                          {
                            key: "hardware",
                            label: "Hardware",
                            name: bd.hwName,
                            moq: bd.hwMoq,
                            hwBaseZar: bd.hwBaseZar,
                            hwShippingZar: bd.hwShippingZar,
                          },
                          {
                            key: "terpene",
                            label: bd.isMultiChamber
                              ? "Terpene (all chambers)"
                              : "Terpene",
                            name: bd.isMultiChamber ? null : bd.tpName,
                          },
                          {
                            key: "distillate",
                            label: bd.isMultiChamber
                              ? "Distillate (all chambers)"
                              : "Distillate",
                            name: bd.isMultiChamber ? null : bd.diName,
                          },
                          {
                            key: "packaging",
                            label: "Packaging",
                            name: bd.pkName,
                          },
                          { key: "labour", label: "Labour", name: bd.lbName },
                          {
                            key: "lab",
                            label: `Lab Testing (÷${bd.batchSize})`,
                            name:
                              bd.labTests.length > 0
                                ? `${bd.labTests.length} test${bd.labTests.length > 1 ? "s" : ""} · R${bd.labTotal.toFixed(0)} total`
                                : null,
                          },
                          {
                            key: "transport",
                            label: `Transport (÷${bd.batchSize})`,
                            name: null,
                          },
                          {
                            key: "misc",
                            label: `Misc (÷${bd.batchSize})`,
                            name: null,
                          },
                        ]
                          .filter((r) => bd[r.key] > 0 || r.name)
                          .map((row) => {
                            const col =
                              CATEGORY_COLOURS[row.key] ||
                              CATEGORY_COLOURS.other;
                            const pct =
                              bd.total > 0 ? (bd[row.key] / bd.total) * 100 : 0;
                            const qty = getCardQty(recipe.id); // v3.5: batch scale
                            return (
                              <div
                                key={row.key}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "7px 0",
                                  borderBottom: "1px solid #f5f5f5",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: 2,
                                      background: col.color,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div>
                                    <span style={{ color: "#555" }}>
                                      {row.label}
                                    </span>
                                    {row.name && (
                                      <span
                                        style={{
                                          color: "#bbb",
                                          marginLeft: 6,
                                          fontSize: 11,
                                        }}
                                      >
                                        {row.name}
                                      </span>
                                    )}
                                    {row.moq && (
                                      <span
                                        style={{
                                          marginLeft: 8,
                                          fontSize: 10,
                                          fontWeight: 700,
                                          letterSpacing: "0.1em",
                                          textTransform: "uppercase",
                                          background: "#E3F2FD",
                                          color: "#1565C0",
                                          borderRadius: 4,
                                          padding: "1px 7px",
                                        }}
                                      >
                                        MOQ {parseInt(row.moq).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* v3.5/v3.7: per-unit + optional landed split + batch total */}
                                <div style={{ textAlign: "right" }}>
                                  {bd[row.key] > 0 ? (
                                    <>
                                      <div>
                                        <strong style={{ color: "#333" }}>
                                          {fmtZar(bd[row.key])}
                                        </strong>
                                        <span
                                          style={{
                                            color: "#bbb",
                                            fontSize: 11,
                                            marginLeft: 6,
                                          }}
                                        >
                                          {fmt(pct)}%
                                        </span>
                                      </div>
                                      {/* v3.7: hardware landed cost split */}
                                      {row.key === "hardware" &&
                                        row.hwShippingZar > 0 && (
                                          <div
                                            style={{
                                              fontSize: 10,
                                              color: "#1565C0",
                                              marginTop: 2,
                                            }}
                                          >
                                            {fmtZar(row.hwBaseZar)} unit +{" "}
                                            {fmtZar(row.hwShippingZar)} ship
                                          </div>
                                        )}
                                      {row.key === "hardware" &&
                                        row.hwShippingZar === 0 && (
                                          <div
                                            style={{
                                              fontSize: 10,
                                              color: "#bbb",
                                              marginTop: 2,
                                            }}
                                          >
                                            no shipping alloc
                                          </div>
                                        )}
                                      {qty > 1 && (
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: "#c62828",
                                            fontWeight: 700,
                                            marginTop: 2,
                                          }}
                                        >
                                          ×{qty.toLocaleString()} ={" "}
                                          {fmtZar(bd[row.key] * qty)}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span
                                      style={{ color: "#e0e0e0", fontSize: 12 }}
                                    >
                                      TBD
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        <CogsBar breakdown={bd} />
                        {bd.isMultiChamber && bd.chamberSummary && (
                          <div
                            style={{
                              marginTop: 14,
                              borderTop: "1px solid #f0ede8",
                              paddingTop: 12,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "#888",
                                textTransform: "uppercase",
                                letterSpacing: "0.4px",
                                marginBottom: 8,
                              }}
                            >
                              Per-Chamber Breakdown
                            </div>
                            {bd.chamberSummary.map((ch, i) => {
                              const col = [
                                { accent: "#1565C0", bg: "#E3F2FD" },
                                { accent: "#6A1B9A", bg: "#F3E5F5" },
                                { accent: "#F57F17", bg: "#FFF8E1" },
                              ][i % 3];
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "6px 10px",
                                    borderRadius: 7,
                                    background: col.bg,
                                    marginBottom: 5,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 12,
                                      color: col.accent,
                                      minWidth: 80,
                                    }}
                                  >
                                    {ch.label}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "#666",
                                      flex: 1,
                                    }}
                                  >
                                    {ch.diName
                                      ? `${ch.ml}ml ${ch.diName}`
                                      : `${ch.ml}ml`}
                                    {ch.tpName ? (
                                      <span style={{ color: "#9C27B0" }}>
                                        {" "}
                                        · {(ch.ul / 1000).toFixed(3)}ml{" "}
                                        {ch.tpName}
                                      </span>
                                    ) : (
                                      ""
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: col.accent,
                                    }}
                                  >
                                    {fmtZar(ch.diCost + ch.tpCost)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {recipe.notes && (
                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 12,
                          color: "#888",
                          fontStyle: "italic",
                        }}
                      >
                        {recipe.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 900,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 32,
              width: 380,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
            <h3 style={{ margin: "0 0 8px" }}>Remove this SKU?</h3>
            <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
              The recipe will be deactivated.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                style={btn("danger")}
                onClick={() => handleDelete(deleteConfirm)}
              >
                Remove
              </button>
              <button
                style={btn("ghost")}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BUILDER PANEL
      ══════════════════════════════════════════════════════════════════ */}
      {showBuilder && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}
        >
          <div
            style={{ flex: 1, background: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowBuilder(false)}
          />
          <div
            style={{
              width: 700,
              background: "#fff",
              overflowY: "auto",
              boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "24px 28px",
                borderBottom: "1px solid #f0ede8",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "#fff",
                zIndex: 1,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontFamily: "Cormorant Garamond, serif",
                    color: "#2d4a2d",
                  }}
                >
                  {editingRecipe
                    ? `Edit: ${editingRecipe.product_name}`
                    : "New SKU Recipe"}
                </h3>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                  USD/ZAR: R{usdZar.toFixed(4)} (live) · Terpene cost = price ÷
                  50ml bottle
                </div>
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 22,
                  color: "#bbb",
                }}
                onClick={() => setShowBuilder(false)}
              >
                ✕
              </button>
            </div>

            {/* Panel body */}
            <div style={{ padding: 28, flex: 1 }}>
              {/* Live preview */}
              {previewBreakdown && previewBreakdown.total > 0 && (
                <div
                  style={{
                    background: "#f0f7f0",
                    border: "1px solid #c8e6c9",
                    borderRadius: 10,
                    padding: "16px 20px",
                    marginBottom: 28,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#888",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    Live COGS preview
                  </div>
                  <div
                    style={{ fontSize: 30, fontWeight: 700, color: "#2d4a2d" }}
                  >
                    {fmtZar(previewBreakdown.total)}{" "}
                    <span
                      style={{ fontSize: 14, fontWeight: 400, color: "#888" }}
                    >
                      per unit
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      marginTop: 8,
                      fontSize: 13,
                    }}
                  >
                    {[
                      ["Hardware", previewBreakdown.hardware],
                      ["Terpene", previewBreakdown.terpene],
                      ["Distillate", previewBreakdown.distillate],
                      ["Packaging", previewBreakdown.packaging],
                      ["Labour", previewBreakdown.labour],
                      ["Lab", previewBreakdown.lab],
                      ["Transport", previewBreakdown.transport],
                      ["Misc", previewBreakdown.misc],
                    ]
                      .filter(([, v]) => v > 0)
                      .map(([l, v]) => (
                        <span key={l} style={{ color: "#555" }}>
                          {l}: <strong>{fmtZar(v)}</strong>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Product name + SKU */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div>
                  {lbl("Product Name *")}
                  <input
                    type="text"
                    placeholder="e.g. Postless Cart 1ml — Blue Zushi"
                    value={form.product_name}
                    onChange={(e) => setF("product_name", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  {lbl("SKU (optional)")}
                  <input
                    type="text"
                    placeholder="e.g. CART-1ML-BZ"
                    value={form.sku}
                    onChange={(e) => setF("sku", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Batch size */}
              <div
                style={{
                  background: "#F9FBE7",
                  borderRadius: 10,
                  padding: "16px 18px",
                  marginBottom: 16,
                  border: "1px solid #F0F4C3",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#558B2F",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginBottom: 10,
                  }}
                >
                  📐 Batch Size for Amortisation
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr",
                    gap: 16,
                    alignItems: "flex-end",
                  }}
                >
                  <div>
                    {lbl("Units per batch")}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.batch_size}
                      onChange={(e) => setF("batch_size", e.target.value)}
                      style={inputStyle}
                      placeholder="50"
                    />
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#888", paddingBottom: 2 }}
                  >
                    Lab, transport and misc costs are divided by this number to
                    get the per-unit contribution. E.g. R350 potency test ÷{" "}
                    {form.batch_size || 50} units ={" "}
                    {fmtZar(350 / (parseInt(form.batch_size) || 50))}/unit.
                  </div>
                </div>
              </div>

              {/* Hardware */}
              <div
                style={{
                  background: "#E3F2FD",
                  borderRadius: 10,
                  padding: "16px 18px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#1565C0",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginBottom: 12,
                  }}
                >
                  🔩 Hardware (Imported — USD)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3fr 1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    {lbl("Hardware Item")}
                    <select
                      value={form.hardware_item_id}
                      onChange={(e) => handleHardwareChange(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">— None —</option>
                      {hardwareItems.map((p) => {
                        const prof = detectHardwareProfile(p.name);
                        return (
                          <option key={p.id} value={p.id}>
                            {prof ? `${prof.emoji} ` : "⬜ "}
                            {p.name} (${fmt(p.unit_price_usd)})
                          </option>
                        );
                      })}
                    </select>
                    {activeProfile && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          color: "#1565C0",
                          background: "#EBF5FB",
                          borderRadius: 6,
                          padding: "5px 10px",
                        }}
                      >
                        {activeProfile.emoji}{" "}
                        <strong>{activeProfile.label}</strong> detected ·{" "}
                        {activeProfile.tip}
                      </div>
                    )}
                    {(() => {
                      const hw = hardwareItems.find(
                        (p) => p.id === form.hardware_item_id,
                      );
                      if (!hw?.moq) return null;
                      const moq = parseInt(hw.moq);
                      const batchSz = parseInt(form.batch_size) || 50;
                      const belowMoq = batchSz < moq;
                      return (
                        <div
                          style={{
                            marginTop: 6,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 11,
                            background: belowMoq ? "#FFF3E0" : "#E3F2FD",
                            border: `1px solid ${belowMoq ? "#FFB74D" : "#90CAF9"}`,
                            borderRadius: 6,
                            padding: "6px 12px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: belowMoq ? "#E65100" : "#1565C0",
                            }}
                          >
                            MOQ: {moq.toLocaleString()} units
                          </span>
                          {belowMoq ? (
                            <span style={{ color: "#BF360C" }}>
                              ⚠️ Batch size ({batchSz}) is below minimum order
                            </span>
                          ) : (
                            <span style={{ color: "#1565C0" }}>
                              ✓ Batch size ({batchSz}) meets minimum order
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    {lbl("Qty per unit — how many in 1 finished product?")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.hardware_qty}
                      onChange={(e) => setF("hardware_qty", e.target.value)}
                      style={inputStyle}
                    />
                    <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                      Almost always <strong>1</strong>. Use batch size above for
                      order quantities.
                    </div>
                    {parseFloat(form.hardware_qty) > 10 && (
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 11,
                          color: "#c62828",
                          background: "#FFEBEE",
                          borderRadius: 5,
                          padding: "4px 8px",
                        }}
                      >
                        ⚠️ Qty {form.hardware_qty} looks like a batch size — set
                        this to <strong>1</strong> and use "Units per batch"
                        above.
                      </div>
                    )}
                  </div>
                  <div>
                    {lbl("Ship alloc ZAR")}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.shipping_alloc_zar}
                      onChange={(e) =>
                        setF("shipping_alloc_zar", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {form.hardware_item_id &&
                  (() => {
                    const hw = hardwareItems.find(
                      (p) => p.id === form.hardware_item_id,
                    );
                    if (!hw) return null;
                    const cost =
                      parseFloat(form.hardware_qty || 1) *
                        parseFloat(hw.unit_price_usd) *
                        usdZar +
                      parseFloat(form.shipping_alloc_zar || 0);
                    return (
                      <div
                        style={{ fontSize: 12, color: "#1565C0", marginTop: 8 }}
                      >
                        = {fmtZar(cost)} ($
                        {fmt(
                          parseFloat(hw.unit_price_usd) *
                            parseFloat(form.hardware_qty || 1),
                        )}{" "}
                        × R{usdZar.toFixed(4)} + R
                        {fmt(form.shipping_alloc_zar || 0)} shipping)
                      </div>
                    );
                  })()}
                <LandedCostCalc
                  usdZar={usdZar}
                  onApply={(val) => setF("shipping_alloc_zar", val)}
                />
              </div>

              {/* Multi vs single chamber */}
              {isMultiChamber ? (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#1565C0",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 12,
                    }}
                  >
                    {activeProfile.emoji} {activeProfile.label} — Per-Chamber
                    Recipe
                  </div>
                  <ChambersEditor
                    chambers={form.chambers}
                    onChange={(chs) => setF("chambers", chs)}
                    distillateInputs={distillateInputs}
                    terpeneItems={terpeneItems}
                    usdZar={usdZar}
                    fmtZar={fmtZar}
                    fmt={fmt}
                    inputStyle={inputStyle}
                    lbl={lbl}
                  />
                </div>
              ) : (
                <>
                  {/* Terpene — single chamber */}
                  <div
                    style={{
                      background: "#F3E5F5",
                      borderRadius: 10,
                      padding: "16px 18px",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#6A1B9A",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                        marginBottom: 12,
                      }}
                    >
                      🌿 Terpene (Imported — USD per 50ml bottle)
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr",
                        gap: 12,
                      }}
                    >
                      <div>
                        {lbl("Terpene Blend")}
                        <select
                          value={form.terpene_item_id}
                          onChange={(e) =>
                            setF("terpene_item_id", e.target.value)
                          }
                          style={selectStyle}
                        >
                          <option value="">— None —</option>
                          {terpeneItems.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${fmt(p.unit_price_usd)}/50ml)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        {/* Single-chamber also uses µl — label matches ChambersEditor */}
                        {lbl("Qty (µl)")}
                        <input
                          type="number"
                          min="1"
                          step="1"
                          max="2000"
                          value={form.terpene_qty_ul}
                          onChange={(e) =>
                            setF("terpene_qty_ul", e.target.value)
                          }
                          style={inputStyle}
                          placeholder="67"
                        />
                        {parseFloat(form.terpene_qty_ul) > 0 && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "#6A1B9A",
                              marginTop: 3,
                              fontWeight: 600,
                            }}
                          >
                            ={" "}
                            {(parseFloat(form.terpene_qty_ul) / 1000).toFixed(
                              4,
                            )}{" "}
                            ml
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 16,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9C27B0",
                          background: "#EDE7F6",
                          padding: "4px 10px",
                          borderRadius: 6,
                        }}
                      >
                        Typical range: 20µl (2%) → 100µl (10%) per 1ml
                        distillate
                      </div>
                      {form.terpene_qty_ul > 0 &&
                        form.distillate_qty_ml > 0 && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6A1B9A",
                              fontWeight: 600,
                            }}
                          >
                            ={" "}
                            {(parseFloat(form.terpene_qty_ul) / 1000).toFixed(
                              4,
                            )}
                            ml · {terpPct}% of {form.distillate_qty_ml}ml
                            distillate
                          </div>
                        )}
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          {
                            label: "3%",
                            ul: Math.round(
                              parseFloat(form.distillate_qty_ml || 1) * 30,
                            ),
                          },
                          {
                            label: "5%",
                            ul: Math.round(
                              parseFloat(form.distillate_qty_ml || 1) * 50,
                            ),
                          },
                          {
                            label: "7%",
                            ul: Math.round(
                              parseFloat(form.distillate_qty_ml || 1) * 70,
                            ),
                          },
                          {
                            label: "10%",
                            ul: Math.round(
                              parseFloat(form.distillate_qty_ml || 1) * 100,
                            ),
                          },
                        ].map((p) => (
                          <button
                            key={p.label}
                            onClick={() => setF("terpene_qty_ul", p.ul)}
                            style={{
                              padding: "3px 8px",
                              borderRadius: 6,
                              border: "1px solid #CE93D8",
                              background:
                                parseInt(form.terpene_qty_ul) === p.ul
                                  ? "#CE93D8"
                                  : "#F8F0FD",
                              color: "#6A1B9A",
                              cursor: "pointer",
                              fontSize: 11,
                              fontFamily: "Jost, sans-serif",
                              fontWeight: 600,
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {form.terpene_item_id &&
                      (() => {
                        const tp = terpeneItems.find(
                          (p) => p.id === form.terpene_item_id,
                        );
                        if (!tp) return null;
                        const costPerMl =
                          (parseFloat(tp.unit_price_usd) / 50) * usdZar;
                        const terpMl =
                          parseFloat(form.terpene_qty_ul || 0) / 1000;
                        return (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6A1B9A",
                              marginTop: 8,
                            }}
                          >
                            R{fmt(costPerMl, 4)}/ml × {fmt(terpMl, 4)}ml ={" "}
                            {fmtZar(costPerMl * terpMl)} · ($
                            {fmt(tp.unit_price_usd)}/50ml ÷ 50 × R
                            {usdZar.toFixed(4)})
                          </div>
                        );
                      })()}
                  </div>

                  {/* Distillate — single chamber */}
                  <div
                    style={{
                      background: "#FFF8E1",
                      borderRadius: 10,
                      padding: "16px 18px",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#F57F17",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                        marginBottom: 12,
                      }}
                    >
                      💧 Distillate (Local — ZAR per ml)
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr",
                        gap: 12,
                      }}
                    >
                      <div>
                        {lbl("Distillate Input")}
                        <select
                          value={form.distillate_input_id}
                          onChange={(e) =>
                            setF("distillate_input_id", e.target.value)
                          }
                          style={selectStyle}
                        >
                          <option value="">— None —</option>
                          {distillateInputs.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}{" "}
                              {i.cost_zar
                                ? `(R${fmt(i.cost_zar)}/ml)`
                                : "(TBD)"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        {lbl("Qty (ml)")}
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={form.distillate_qty_ml}
                          onChange={(e) =>
                            setF("distillate_qty_ml", e.target.value)
                          }
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    {form.distillate_input_id &&
                      (() => {
                        const di = distillateInputs.find(
                          (i) => i.id === form.distillate_input_id,
                        );
                        if (!di || !di.cost_zar) return null;
                        return (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#F57F17",
                              marginTop: 8,
                            }}
                          >
                            ={" "}
                            {fmtZar(
                              parseFloat(di.cost_zar) *
                                parseFloat(form.distillate_qty_ml || 0),
                            )}{" "}
                            (R{fmt(di.cost_zar)}/ml × {form.distillate_qty_ml}
                            ml)
                          </div>
                        );
                      })()}
                  </div>
                </>
              )}

              {/* Packaging */}
              <div
                style={{
                  background: "#E8F5E9",
                  borderRadius: 10,
                  padding: "16px 18px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#2E7D32",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginBottom: 12,
                  }}
                >
                  📦 Packaging (Local — ZAR per unit)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    {lbl("Packaging Input (optional if using manual)")}
                    <select
                      value={form.packaging_input_id}
                      onChange={(e) => {
                        setF("packaging_input_id", e.target.value);
                        if (e.target.value) setF("packaging_manual_zar", "");
                      }}
                      style={selectStyle}
                    >
                      <option value="">— None —</option>
                      {packagingInputs.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}{" "}
                          {i.cost_zar ? `(R${fmt(i.cost_zar)})` : "(TBD)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {lbl("Qty per unit")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.packaging_qty}
                      onChange={(e) => setF("packaging_qty", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>
                    Or enter cost manually:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "#2E7D32",
                        fontWeight: 600,
                      }}
                    >
                      R
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.packaging_manual_zar}
                      onChange={(e) => {
                        setF("packaging_manual_zar", e.target.value);
                        if (e.target.value) setF("packaging_input_id", "");
                      }}
                      placeholder="e.g. 5.50"
                      style={{
                        ...inputStyle,
                        width: 120,
                        background: form.packaging_manual_zar
                          ? "#f0fdf4"
                          : undefined,
                        border: form.packaging_manual_zar
                          ? "1px solid #4CAF50"
                          : "1px solid #ddd",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#888" }}>
                      per unit
                    </span>
                    {form.packaging_manual_zar && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#2E7D32",
                          fontWeight: 600,
                        }}
                      >
                        ={" "}
                        {fmtZar(
                          parseFloat(form.packaging_manual_zar || 0) *
                            parseFloat(form.packaging_qty || 1),
                        )}{" "}
                        total
                      </span>
                    )}
                  </div>
                </div>
                {form.packaging_manual_zar && (
                  <div style={{ fontSize: 11, color: "#2E7D32", marginTop: 4 }}>
                    ✓ Using manual rate — dropdown ignored
                  </div>
                )}
              </div>

              {/* Labour */}
              <div
                style={{
                  background: "#FCE4EC",
                  borderRadius: 10,
                  padding: "16px 18px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#880E4F",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginBottom: 12,
                  }}
                >
                  👷 Labour (Local — ZAR per unit)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    {lbl("Labour Input (optional if using manual)")}
                    <select
                      value={form.labour_input_id}
                      onChange={(e) => {
                        setF("labour_input_id", e.target.value);
                        if (e.target.value) setF("labour_manual_zar", "");
                      }}
                      style={selectStyle}
                    >
                      <option value="">— None —</option>
                      {labourInputs.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}{" "}
                          {i.cost_zar ? `(R${fmt(i.cost_zar)})` : "(TBD)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {lbl("Units of labour")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.labour_qty}
                      onChange={(e) => setF("labour_qty", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>
                    Or enter cost manually:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "#880E4F",
                        fontWeight: 600,
                      }}
                    >
                      R
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.labour_manual_zar}
                      onChange={(e) => {
                        setF("labour_manual_zar", e.target.value);
                        if (e.target.value) setF("labour_input_id", "");
                      }}
                      placeholder="e.g. 12.00"
                      style={{
                        ...inputStyle,
                        width: 120,
                        background: form.labour_manual_zar
                          ? "#fdf2f8"
                          : undefined,
                        border: form.labour_manual_zar
                          ? "1px solid #E91E8C"
                          : "1px solid #ddd",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#888" }}>
                      per unit
                    </span>
                    {form.labour_manual_zar && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#880E4F",
                          fontWeight: 600,
                        }}
                      >
                        ={" "}
                        {fmtZar(
                          parseFloat(form.labour_manual_zar || 0) *
                            parseFloat(form.labour_qty || 1),
                        )}{" "}
                        total
                      </span>
                    )}
                  </div>
                </div>
                {form.labour_manual_zar && (
                  <div style={{ fontSize: 11, color: "#880E4F", marginTop: 4 }}>
                    ✓ Using manual rate — dropdown ignored
                  </div>
                )}
              </div>

              {/* Lab testing */}
              <div
                style={{
                  background: "#E8EAF6",
                  borderRadius: 10,
                  padding: "16px 18px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#283593",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      🔬 Lab Testing — Cannalytics Africa
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#5C6BC0", marginTop: 3 }}
                    >
                      Total ÷ batch size ({form.batch_size || 50} units) =
                      per-unit cost
                    </div>
                  </div>
                  {(() => {
                    const selectedTests = Array.isArray(form.lab_tests)
                      ? form.lab_tests
                      : [];
                    const total = selectedTests.reduce((s, id) => {
                      const t = CANNALYTICS_TESTS.find((x) => x.id === id);
                      return s + (t ? t.price : 0);
                    }, 0);
                    const perUnit =
                      total / Math.max(1, parseInt(form.batch_size) || 50);
                    return total > 0 ? (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#888" }}>
                          Total:{" "}
                          <strong style={{ color: "#283593" }}>
                            {fmtZar(total)}
                          </strong>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#283593",
                          }}
                        >
                          {fmtZar(perUnit)}/unit
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {CANNALYTICS_TESTS.map((test) => {
                    const checked =
                      Array.isArray(form.lab_tests) &&
                      form.lab_tests.includes(test.id);
                    return (
                      <label
                        key={test.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: `1px solid ${checked ? "#3949AB" : "#C5CAE9"}`,
                          background: checked ? "#E8EAF6" : "#fff",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLabTest(test.id)}
                          style={{
                            width: 15,
                            height: 15,
                            accentColor: "#3949AB",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: checked ? 700 : 400,
                              color: checked ? "#283593" : "#555",
                            }}
                          >
                            {test.label}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#283593",
                            flexShrink: 0,
                          }}
                        >
                          {fmtZar(test.price)}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Transport + Misc */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: "#E0F7FA",
                    borderRadius: 10,
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#00695C",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 12,
                    }}
                  >
                    🚚 Transport (ZAR per batch)
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.transport_cost_zar}
                    onChange={(e) => setF("transport_cost_zar", e.target.value)}
                    style={inputStyle}
                    placeholder="0.00"
                  />
                  {parseFloat(form.transport_cost_zar) > 0 && (
                    <div
                      style={{ fontSize: 11, color: "#00695C", marginTop: 6 }}
                    >
                      ={" "}
                      {fmtZar(
                        parseFloat(form.transport_cost_zar) /
                          Math.max(1, parseInt(form.batch_size) || 50),
                      )}
                      /unit
                    </div>
                  )}
                </div>
                <div
                  style={{
                    background: "#ECEFF1",
                    borderRadius: 10,
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#455A64",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 12,
                    }}
                  >
                    ✏️ Miscellaneous (ZAR per batch)
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.misc_cost_zar}
                    onChange={(e) => setF("misc_cost_zar", e.target.value)}
                    style={inputStyle}
                    placeholder="0.00"
                  />
                  {parseFloat(form.misc_cost_zar) > 0 && (
                    <div
                      style={{ fontSize: 11, color: "#455A64", marginTop: 6 }}
                    >
                      ={" "}
                      {fmtZar(
                        parseFloat(form.misc_cost_zar) /
                          Math.max(1, parseInt(form.batch_size) || 50),
                      )}
                      /unit
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                {lbl("Notes (optional)")}
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setF("notes", e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Any notes about this recipe…"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div
              style={{
                padding: "20px 28px",
                borderTop: "1px solid #f0ede8",
                display: "flex",
                justifyContent: "space-between",
                position: "sticky",
                bottom: 0,
                background: "#fff",
              }}
            >
              <button
                style={btn("ghost")}
                onClick={() => setShowBuilder(false)}
              >
                Cancel
              </button>
              <button
                style={btn("primary")}
                disabled={!form.product_name.trim() || saving}
                onClick={handleSave}
              >
                {saving
                  ? "Saving…"
                  : editingRecipe
                    ? "✓ Update Recipe"
                    : `✓ Save — ${previewBreakdown ? fmtZar(previewBreakdown.total) : "R0.00"} COGS`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
