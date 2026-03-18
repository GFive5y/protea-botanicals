// src/components/hq/HQCogs.js v4.1 — WP-THEME-2: Inter font
// v4.0 — WP-THEME: Unified design system applied
//   - Outfit replaces Cormorant Garamond + Jost everywhere
//   - DM Mono for all displayed numeric / financial values
//   - Sub-tabs: underline style, emoji removed from labels
//   - Header: Outfit 300, ink900
//   - Toast: T.accent background, clean text
//   - FX badge: success semantic tokens
//   - Buttons: 4-variant token system
//   - Domain section headers keep their category colours (hardware/terpene/etc)
//     as they are functional visual markers in the builder, not branding.
// v3.9: InfoTooltip — batch size, transport, terpene µl
// v3.8: WorkflowGuide v2.0
// v3.7-v3.0: See changelog above

import { useState, useEffect, useCallback } from "react";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import InfoTooltip from "../InfoTooltip";
import { supabase } from "../../services/supabaseClient";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#888888",
  ink300: "#B0B0B0",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

// ── Domain colours (preserved — functional category markers in builder) ──────
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

const CHAMBER_COLORS = [
  { bg: "#E3F2FD", border: "#90CAF9", accent: "#1565C0", dot: "#42A5F5" },
  { bg: "#F3E5F5", border: "#CE93D8", accent: "#6A1B9A", dot: "#AB47BC" },
  { bg: "#FFF8E1", border: "#FFE082", accent: "#F57F17", dot: "#FFCA28" },
];

// ── Shared styles ─────────────────────────────────────────────────────────────
const sCard = {
  background: "#fff",
  borderRadius: 8,
  border: `1px solid ${T.ink150}`,
  padding: 24,
  marginBottom: 20,
  boxShadow: T.shadow,
};

const mkBtn = (variant = "primary", extra = {}) => {
  const base = {
    padding: "9px 18px",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    fontFamily: T.fontUi,
    fontWeight: 600,
    fontSize: 13,
    transition: "opacity 0.15s",
    letterSpacing: "0.04em",
  };
  const v = {
    primary: { background: T.accent, color: "#fff" },
    ghost: {
      background: "transparent",
      color: T.accent,
      border: `1px solid ${T.accentBd}`,
    },
    danger: { background: T.danger, color: "#fff" },
    small: {
      background: T.ink075,
      color: T.ink700,
      padding: "5px 12px",
      fontSize: 12,
      fontWeight: 500,
    },
  };
  return { ...base, ...(v[variant] || v.primary), ...extra };
};

const sInput = {
  padding: "9px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: 4,
  fontFamily: T.fontUi,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  color: T.ink900,
};
const sSelect = { ...sInput, background: "#fff" };

const sLbl = (text) => (
  <label
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: T.ink400,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      display: "block",
      marginBottom: 6,
      fontFamily: T.fontUi,
    }}
  >
    {text}
  </label>
);

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── FX Hook ───────────────────────────────────────────────────────────────────
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

// ── COGS calc ─────────────────────────────────────────────────────────────────
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

// ── LandedCostCalc (inline calculator in builder) ────────────────────────────
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
  const s = { ...sInput, fontSize: 12 };
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: `1px solid ${T.infoBd}`,
          borderRadius: 4,
          color: T.info,
          fontSize: 12,
          padding: "4px 12px",
          cursor: "pointer",
          fontFamily: T.fontUi,
          fontWeight: 600,
        }}
      >
        {open ? "Hide" : "Calculate landed cost per unit"}
      </button>
      {open && (
        <div
          style={{
            marginTop: 10,
            background: T.infoBg,
            border: `1px solid ${T.infoBd}`,
            borderRadius: 6,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.info,
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
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
              <div style={{ fontSize: 11, color: T.ink500, marginBottom: 4 }}>
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
                <div style={{ fontSize: 11, color: T.ink500, marginBottom: 4 }}>
                  Shipment weight (kg)
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
                <div style={{ fontSize: 11, color: T.ink500, marginBottom: 4 }}>
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
              <div style={{ fontSize: 11, color: T.ink500, marginBottom: 4 }}>
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
                border: `1px solid ${T.infoBd}`,
                borderRadius: 4,
                padding: "10px 14px",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    textTransform: "uppercase",
                  }}
                >
                  Total freight
                </div>
                <div
                  style={{
                    fontFamily: T.fontData,
                    fontWeight: 600,
                    color: T.info,
                  }}
                >
                  ${freightUSD.toFixed(2)} · R{freightZAR.toFixed(2)}
                </div>
              </div>
              {perUnitZAR !== null && (
                <>
                  <div style={{ color: T.ink300 }}>÷</div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        textTransform: "uppercase",
                      }}
                    >
                      Units
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontData,
                        fontWeight: 600,
                        color: T.info,
                      }}
                    >
                      {unitsN.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ color: T.ink300 }}>=</div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        textTransform: "uppercase",
                      }}
                    >
                      Per-unit shipping
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontData,
                        fontSize: 18,
                        fontWeight: 400,
                        color: T.info,
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
                      ...mkBtn("primary", {
                        fontSize: 12,
                        padding: "7px 14px",
                      }),
                    }}
                  >
                    Apply to recipe
                  </button>
                </>
              )}
            </div>
          )}
          <div style={{ fontSize: 10, color: T.info, fontFamily: T.fontUi }}>
            DDP rates: ≤21kg $15.80/kg · 21–50kg $15.50/kg · 50–100kg $15.20/kg
            · 100kg+ $14.90/kg · +$25 clearance
          </div>
        </div>
      )}
    </div>
  );
}

// ── CogsBar ───────────────────────────────────────────────────────────────────
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
          height: 8,
          borderRadius: 4,
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
              <span style={{ color: T.ink500, fontFamily: T.fontUi }}>
                {c.label}:{" "}
                <strong style={{ fontFamily: T.fontData }}>{fmt(pct)}%</strong>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ChambersEditor ────────────────────────────────────────────────────────────
function ChambersEditor({
  chambers,
  onChange,
  distillateInputs,
  terpeneItems,
  usdZar,
}) {
  const setChField = (idx, key, val) =>
    onChange(chambers.map((ch, i) => (i === idx ? { ...ch, [key]: val } : ch)));
  const totalDistillate = chambers.reduce(
    (s, ch) => s + parseFloat(ch.distillate_qty_ml || 0),
    0,
  );
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
          background: T.ink075,
          borderRadius: 6,
          padding: "10px 14px",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13, color: T.ink500, fontFamily: T.fontUi }}>
          <strong style={{ color: T.ink900 }}>
            {chambers.length} chambers
          </strong>
          <span style={{ color: T.ink300, margin: "0 8px" }}>·</span>
          <strong style={{ fontFamily: T.fontData, color: "#1565C0" }}>
            {totalDistillate.toFixed(2)}ml
          </strong>
          <span style={{ fontSize: 11, color: T.ink300, marginLeft: 4 }}>
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
                borderRadius: 4,
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
                style={{
                  fontSize: 12,
                  color: col.accent,
                  fontWeight: 600,
                  fontFamily: T.fontUi,
                }}
              >
                {ch.label || `Ch.${i + 1}`}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: col.accent,
                  fontFamily: T.fontData,
                }}
              >
                {ch.distillate_qty_ml}ml
              </span>
            </div>
          );
        })}
      </div>
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
              borderRadius: 8,
              marginBottom: 14,
              overflow: "hidden",
            }}
          >
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
                  fontFamily: T.fontUi,
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
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontFamily: T.fontData,
                }}
              >
                {chDiCost > 0 || chTpCost > 0
                  ? fmtZar(chDiCost + chTpCost)
                  : "—"}
              </div>
            </div>
            <div style={{ padding: "14px 16px", background: "#fff" }}>
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
                      fontWeight: 700,
                      color: T.ink400,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 5,
                    }}
                  >
                    Distillate
                  </div>
                  <select
                    value={ch.distillate_input_id}
                    onChange={(e) =>
                      setChField(idx, "distillate_input_id", e.target.value)
                    }
                    style={{ ...sSelect, fontSize: 13 }}
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
                      fontWeight: 700,
                      color: T.ink400,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
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
                    style={{ ...sInput, fontSize: 13 }}
                  />
                </div>
              </div>
              {di && di.cost_zar && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#F57F17",
                    marginBottom: 10,
                    fontFamily: T.fontData,
                  }}
                >
                  R{parseFloat(di.cost_zar).toFixed(2)}/ml ×{" "}
                  {ch.distillate_qty_ml}ml = {fmtZar(chDiCost)}
                </div>
              )}
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
                      fontWeight: 700,
                      color: T.ink400,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 5,
                    }}
                  >
                    Terpene Blend
                  </div>
                  <select
                    value={ch.terpene_item_id}
                    onChange={(e) =>
                      setChField(idx, "terpene_item_id", e.target.value)
                    }
                    style={{ ...sSelect, fontSize: 13 }}
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
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: col.accent,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 5,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Qty (µl) <InfoTooltip id="cogs-terpene-ul" position="top" />
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
                    style={{ ...sInput, fontSize: 13, borderColor: col.border }}
                  />
                  {parseFloat(ch.terpene_qty_ul) > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: col.accent,
                        marginTop: 3,
                        fontWeight: 600,
                        fontFamily: T.fontData,
                      }}
                    >
                      = {(parseFloat(ch.terpene_qty_ul) / 1000).toFixed(4)} ml
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 6,
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
                      borderRadius: 4,
                      border: `1px solid ${col.border}`,
                      background:
                        parseInt(ch.terpene_qty_ul) === p.ul
                          ? col.bg
                          : "#fafafa",
                      color: col.accent,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                {parseFloat(ch.terpene_qty_ul) > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      color: col.accent,
                      marginLeft: 4,
                      fontFamily: T.fontData,
                    }}
                  >
                    = {(parseFloat(ch.terpene_qty_ul) / 1000).toFixed(4)}ml ·{" "}
                    {terpPct}% of {ch.distillate_qty_ml}ml
                    {tp && (
                      <span style={{ color: T.ink400 }}>
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
        showToast(`Save failed: ${error.message}`);
      } else {
        showToast(
          editingRecipe
            ? `${payload.product_name} updated`
            : `${payload.product_name} added to COGS registry`,
        );
        setShowBuilder(false);
        fetchAll();
      }
    } catch (err) {
      console.error("COGS save exception:", err);
      showToast(`Unexpected error: ${err.message}`);
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
    showToast("SKU removed from COGS registry");
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
      showToast("Cost updated");
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

  const SUB_TABS = [
    { id: "costing", label: "SKU COGS Builder" },
    { id: "local-inputs", label: "Local Inputs" },
  ];

  return (
    <div style={{ fontFamily: T.fontUi, color: T.ink700 }}>
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
            background: T.accent,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            fontFamily: T.fontUi,
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
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontFamily: T.fontUi,
              fontWeight: 300,
              color: T.ink900,
            }}
          >
            Costing
          </h2>
          <p style={{ margin: "4px 0 0", color: T.ink500, fontSize: 13 }}>
            Cost-of-goods-sold per finished SKU · live ZAR calculations
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              background: fxLoading ? T.ink075 : T.successBg,
              border: `1px solid ${T.successBd}`,
              borderRadius: 4,
              padding: "6px 12px",
              fontSize: 12,
              color: T.success,
              fontWeight: 600,
              fontFamily: T.fontData,
            }}
          >
            {fxLoading
              ? "Loading FX…"
              : `USD/ZAR R${usdZar.toFixed(4)} ${fxRate?.source === "live" ? "Live" : "Cached"}`}
          </div>
          {activeSubTab === "costing" && (
            <button style={mkBtn("primary")} onClick={openNew}>
              + New SKU Recipe
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs — underline, no emoji */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${T.ink150}`,
          marginBottom: 24,
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 18px",
              fontFamily: T.fontUi,
              fontSize: 11,
              fontWeight: activeSubTab === t.id ? 700 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: activeSubTab === t.id ? T.accent : T.ink500,
              borderBottom:
                activeSubTab === t.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LOCAL INPUTS TAB ── */}
      {activeSubTab === "local-inputs" && (
        <div>
          <div style={sCard}>
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: 15,
                color: T.ink900,
                fontFamily: T.fontUi,
                fontWeight: 500,
              }}
            >
              Local Inputs
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: T.ink500 }}>
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
                      padding: "3px 10px",
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      background: col.bg,
                      color: col.color,
                      marginBottom: 12,
                      fontFamily: T.fontUi,
                    }}
                  >
                    {cat}
                  </div>
                  {items.length === 0 ? (
                    <div style={{ color: T.ink300, fontSize: 13 }}>
                      No {cat} inputs found.
                    </div>
                  ) : (
                    items.map((inp) => (
                      <div
                        key={inp.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 16px",
                          borderRadius: 6,
                          border: `1px solid ${T.ink150}`,
                          marginBottom: 8,
                          background: T.ink050,
                        }}
                      >
                        <div style={{ flex: 2 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {inp.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: T.ink400,
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
                            <span style={{ fontSize: 13, color: T.ink500 }}>
                              R
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={inputEditVal}
                              onChange={(e) => setInputEditVal(e.target.value)}
                              style={{ ...sInput, width: 120 }}
                              autoFocus
                            />
                            <span style={{ fontSize: 12, color: T.ink400 }}>
                              per {inp.unit?.replace("per ", "")}
                            </span>
                            <button
                              style={mkBtn("primary", {
                                padding: "7px 14px",
                                fontSize: 12,
                              })}
                              onClick={() => handleSaveInput(inp.id)}
                              disabled={savingInput}
                            >
                              {savingInput ? "…" : "Save"}
                            </button>
                            <button
                              style={mkBtn("small")}
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
                              gap: 14,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: T.fontData,
                                fontSize: 18,
                                fontWeight: 400,
                                color: inp.cost_zar ? T.accent : T.ink300,
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
                              style={mkBtn("small")}
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
              background: T.ink075,
              borderRadius: 6,
              padding: "14px 18px",
              fontSize: 13,
              color: T.ink500,
              border: `1px solid ${T.ink150}`,
            }}
          >
            Terpene & hardware are imported items priced in USD — ZAR cost is
            calculated live. To update imported item prices go to{" "}
            <strong>HQ → Suppliers → Product Catalogue</strong>.
          </div>
        </div>
      )}

      {/* ── COGS BUILDER TAB ── */}
      {activeSubTab === "costing" && (
        <div>
          {localInputs.some((i) => !i.cost_zar) && (
            <div
              style={{
                background: T.warningBg,
                border: `1px solid ${T.warningBd}`,
                borderRadius: 6,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 13,
                color: T.warning,
                fontFamily: T.fontUi,
              }}
            >
              Some local input costs are still <strong>TBD</strong> (packaging,
              labour). Set them in the <strong>Local Inputs</strong> tab.
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: T.ink400 }}>
              Loading COGS data…
            </div>
          ) : recipes.length === 0 ? (
            <div style={{ ...sCard, textAlign: "center", padding: 60 }}>
              <h3
                style={{
                  color: T.ink900,
                  fontFamily: T.fontUi,
                  fontWeight: 400,
                  marginBottom: 8,
                }}
              >
                No SKU recipes yet
              </h3>
              <p style={{ color: T.ink400, fontSize: 13, marginBottom: 24 }}>
                Build a recipe for each finished product SKU.
              </p>
              <button style={mkBtn("primary")} onClick={openNew}>
                + Build First SKU Recipe
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))",
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
                  <div key={recipe.id} style={{ ...sCard, marginBottom: 0 }}>
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
                            fontSize: 16,
                            fontWeight: 600,
                            color: T.ink900,
                            fontFamily: T.fontUi,
                          }}
                        >
                          {recipe.product_name}
                        </div>
                        {recipe.sku && (
                          <div
                            style={{
                              fontSize: 11,
                              color: T.ink400,
                              marginTop: 2,
                              fontFamily: T.fontData,
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
                            <div
                              style={{
                                fontSize: 11,
                                color: T.ink400,
                                fontFamily: T.fontUi,
                              }}
                            >
                              Batch: {bd.batchSize} units
                            </div>
                          )}
                          {bd?.isMultiChamber && (
                            <div
                              style={{
                                fontSize: 11,
                                background: "#E3F2FD",
                                color: "#1565C0",
                                borderRadius: 3,
                                padding: "1px 7px",
                                fontWeight: 700,
                                fontFamily: T.fontUi,
                              }}
                            >
                              {bd.chamberSummary.length}-Chamber
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          style={mkBtn("small")}
                          onClick={() => openEdit(recipe)}
                        >
                          Edit
                        </button>
                        <button
                          style={mkBtn("small", { color: T.danger })}
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
                                ? T.warningBg
                                : T.accentLit,
                              border: `1px solid ${bd?.hasMissingCosts ? T.warningBd : T.accentBd}`,
                              borderRadius: 6,
                              padding: "12px 16px",
                              marginBottom: 10,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.ink400,
                                  marginBottom: 4,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  fontWeight: 700,
                                }}
                              >
                                COGS per unit
                              </div>
                              <div
                                style={{
                                  fontFamily: T.fontData,
                                  fontSize: 26,
                                  fontWeight: 400,
                                  color: T.accent,
                                }}
                              >
                                {bd ? fmtZar(total) : "—"}
                              </div>
                            </div>
                            {bd?.hasMissingCosts && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: T.warning,
                                  textAlign: "right",
                                }}
                              >
                                Incomplete
                                <br />
                                (TBD costs)
                              </div>
                            )}
                          </div>
                          {bd?.hwMoq &&
                            getCardQty(recipe.id) < parseInt(bd.hwMoq) && (
                              <div
                                style={{
                                  background: T.warningBg,
                                  border: `1px solid ${T.warningBd}`,
                                  borderRadius: 6,
                                  padding: "9px 12px",
                                  marginBottom: 10,
                                  fontSize: 12,
                                  color: T.warning,
                                  fontFamily: T.fontUi,
                                }}
                              >
                                <strong>Below hardware MOQ</strong> — minimum
                                order is {parseInt(bd.hwMoq).toLocaleString()}{" "}
                                units
                              </div>
                            )}
                          <div
                            style={{
                              background: T.ink050,
                              border: `1px solid ${T.ink150}`,
                              borderRadius: 6,
                              padding: "10px 12px",
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
                                  color: T.ink400,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  flexShrink: 0,
                                }}
                              >
                                Batch qty
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
                                  border: `1px solid ${T.ink150}`,
                                  borderRadius: 4,
                                  fontFamily: T.fontData,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: T.accent,
                                  textAlign: "center",
                                }}
                              />
                              {[1, 50, 100, 500, 1000].map((n) => (
                                <button
                                  key={n}
                                  onClick={() => setCardQtyFor(recipe.id, n)}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: 4,
                                    border: `1px solid ${T.ink150}`,
                                    background: qty === n ? T.accent : T.ink050,
                                    color: qty === n ? "#fff" : T.ink500,
                                    cursor: "pointer",
                                    fontSize: 11,
                                    fontFamily: T.fontUi,
                                    fontWeight: 700,
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
                                    color: T.ink400,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                  }}
                                >
                                  Total COGS × {qty.toLocaleString()}
                                </div>
                                <div
                                  style={{
                                    fontFamily: T.fontData,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: T.danger,
                                  }}
                                >
                                  {fmtZar(total * qty)}
                                </div>
                                {qty > 1 && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: T.ink400,
                                      fontFamily: T.fontData,
                                    }}
                                  >
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
                            const qty = getCardQty(recipe.id);
                            return (
                              <div
                                key={row.key}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "7px 0",
                                  borderBottom: `1px solid ${T.ink075}`,
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
                                    <span
                                      style={{
                                        color: T.ink700,
                                        fontFamily: T.fontUi,
                                      }}
                                    >
                                      {row.label}
                                    </span>
                                    {row.name && (
                                      <span
                                        style={{
                                          color: T.ink300,
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
                                          letterSpacing: "0.08em",
                                          textTransform: "uppercase",
                                          background: "#E3F2FD",
                                          color: "#1565C0",
                                          borderRadius: 3,
                                          padding: "1px 6px",
                                        }}
                                      >
                                        MOQ {parseInt(row.moq).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  {bd[row.key] > 0 ? (
                                    <>
                                      <div>
                                        <strong
                                          style={{
                                            fontFamily: T.fontData,
                                            color: T.ink900,
                                          }}
                                        >
                                          {fmtZar(bd[row.key])}
                                        </strong>
                                        <span
                                          style={{
                                            color: T.ink300,
                                            fontSize: 11,
                                            marginLeft: 6,
                                            fontFamily: T.fontData,
                                          }}
                                        >
                                          {fmt(pct)}%
                                        </span>
                                      </div>
                                      {row.key === "hardware" &&
                                        row.hwShippingZar > 0 && (
                                          <div
                                            style={{
                                              fontSize: 10,
                                              color: "#1565C0",
                                              marginTop: 2,
                                              fontFamily: T.fontData,
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
                                              color: T.ink300,
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
                                            color: T.danger,
                                            fontWeight: 700,
                                            marginTop: 2,
                                            fontFamily: T.fontData,
                                          }}
                                        >
                                          ×{qty.toLocaleString()} ={" "}
                                          {fmtZar(bd[row.key] * qty)}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span
                                      style={{ color: T.ink150, fontSize: 12 }}
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
                              borderTop: `1px solid ${T.ink150}`,
                              paddingTop: 12,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: T.ink400,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: 8,
                                fontWeight: 700,
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
                                    borderRadius: 5,
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
                                      fontFamily: T.fontUi,
                                    }}
                                  >
                                    {ch.label}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: T.ink500,
                                      flex: 1,
                                      fontFamily: T.fontUi,
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
                                      fontFamily: T.fontData,
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
                          color: T.ink400,
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
              borderRadius: 10,
              padding: 32,
              width: 360,
              textAlign: "center",
              fontFamily: T.fontUi,
            }}
          >
            <h3 style={{ margin: "0 0 8px", color: T.ink900 }}>
              Remove this SKU?
            </h3>
            <p style={{ color: T.ink500, fontSize: 13, marginBottom: 24 }}>
              The recipe will be deactivated.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                style={mkBtn("danger")}
                onClick={() => handleDelete(deleteConfirm)}
              >
                Remove
              </button>
              <button
                style={mkBtn("ghost")}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUILDER PANEL ── */}
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
                padding: "20px 24px",
                borderBottom: `1px solid ${T.ink150}`,
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
                    fontSize: 18,
                    fontFamily: T.fontUi,
                    fontWeight: 500,
                    color: T.ink900,
                  }}
                >
                  {editingRecipe
                    ? `Edit: ${editingRecipe.product_name}`
                    : "New SKU Recipe"}
                </h3>
                <div
                  style={{
                    fontSize: 12,
                    color: T.ink400,
                    marginTop: 3,
                    fontFamily: T.fontData,
                  }}
                >
                  USD/ZAR: R{usdZar.toFixed(4)} · Terpene cost = price ÷ 50ml
                  bottle
                </div>
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: T.ink300,
                }}
                onClick={() => setShowBuilder(false)}
              >
                ✕
              </button>
            </div>

            {/* Panel body */}
            <div style={{ padding: 24, flex: 1 }}>
              {/* Live preview */}
              {previewBreakdown && previewBreakdown.total > 0 && (
                <div
                  style={{
                    background: T.accentLit,
                    border: `1px solid ${T.accentBd}`,
                    borderRadius: 6,
                    padding: "14px 18px",
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: T.ink400,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                    }}
                  >
                    Live COGS preview
                  </div>
                  <div
                    style={{
                      fontFamily: T.fontData,
                      fontSize: 28,
                      fontWeight: 400,
                      color: T.accent,
                    }}
                  >
                    {fmtZar(previewBreakdown.total)}{" "}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: T.ink400,
                        fontFamily: T.fontUi,
                      }}
                    >
                      per unit
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      flexWrap: "wrap",
                      marginTop: 8,
                      fontSize: 12,
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
                        <span
                          key={l}
                          style={{ color: T.ink500, fontFamily: T.fontUi }}
                        >
                          {l}:{" "}
                          <strong style={{ fontFamily: T.fontData }}>
                            {fmtZar(v)}
                          </strong>
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
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                <div>
                  {sLbl("Product Name *")}
                  <input
                    type="text"
                    placeholder="e.g. Postless Cart 1ml — Blue Zushi"
                    value={form.product_name}
                    onChange={(e) => setF("product_name", e.target.value)}
                    style={sInput}
                  />
                </div>
                <div>
                  {sLbl("SKU (optional)")}
                  <input
                    type="text"
                    placeholder="e.g. CART-1ML-BZ"
                    value={form.sku}
                    onChange={(e) => setF("sku", e.target.value)}
                    style={sInput}
                  />
                </div>
              </div>

              {/* Batch size */}
              <div
                style={{
                  background: "#F9FBE7",
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 14,
                  border: "1px solid #F0F4C3",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#558B2F",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Batch Size for Amortisation
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr",
                    gap: 14,
                    alignItems: "flex-end",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.ink400,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 6,
                      }}
                    >
                      Units per batch{" "}
                      <InfoTooltip id="cogs-batch-size" position="top" />
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.batch_size}
                      onChange={(e) => setF("batch_size", e.target.value)}
                      style={sInput}
                      placeholder="50"
                    />
                  </div>
                  <div
                    style={{ fontSize: 12, color: T.ink400, paddingBottom: 2 }}
                  >
                    Lab, transport and misc costs are divided by this number.
                    E.g. R350 potency test ÷ {form.batch_size || 50} units ={" "}
                    <span style={{ fontFamily: T.fontData }}>
                      {fmtZar(350 / (parseInt(form.batch_size) || 50))}
                    </span>
                    /unit.
                  </div>
                </div>
              </div>

              {/* Hardware */}
              <div
                style={{
                  background: "#E3F2FD",
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1565C0",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 12,
                  }}
                >
                  Hardware (Imported — USD)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    {sLbl("Hardware Item")}
                    <select
                      value={form.hardware_item_id}
                      onChange={(e) => handleHardwareChange(e.target.value)}
                      style={sSelect}
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
                          borderRadius: 4,
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
                            borderRadius: 4,
                            padding: "5px 10px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: belowMoq ? "#E65100" : "#1565C0",
                              fontFamily: T.fontData,
                            }}
                          >
                            MOQ: {moq.toLocaleString()} units
                          </span>
                          {belowMoq ? (
                            <span style={{ color: "#BF360C" }}>
                              Batch size ({batchSz}) is below minimum order
                            </span>
                          ) : (
                            <span style={{ color: "#1565C0" }}>
                              Batch size ({batchSz}) meets minimum order
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    {sLbl("Qty per unit")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.hardware_qty}
                      onChange={(e) => setF("hardware_qty", e.target.value)}
                      style={sInput}
                    />
                    <div
                      style={{ fontSize: 11, color: T.ink400, marginTop: 4 }}
                    >
                      Almost always <strong>1</strong>.
                    </div>
                    {parseFloat(form.hardware_qty) > 10 && (
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 11,
                          color: T.danger,
                          background: T.dangerBg,
                          borderRadius: 4,
                          padding: "4px 8px",
                        }}
                      >
                        Qty {form.hardware_qty} looks like a batch size — set to
                        1.
                      </div>
                    )}
                  </div>
                  <div>
                    {sLbl("Ship alloc ZAR")}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.shipping_alloc_zar}
                      onChange={(e) =>
                        setF("shipping_alloc_zar", e.target.value)
                      }
                      style={sInput}
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
                        style={{
                          fontSize: 12,
                          color: "#1565C0",
                          marginTop: 8,
                          fontFamily: T.fontData,
                        }}
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
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#1565C0",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
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
                  />
                </div>
              ) : (
                <>
                  {/* Terpene */}
                  <div
                    style={{
                      background: "#F3E5F5",
                      borderRadius: 6,
                      padding: "14px 16px",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#6A1B9A",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 12,
                      }}
                    >
                      Terpene (Imported — USD per 50ml bottle)
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr",
                        gap: 10,
                      }}
                    >
                      <div>
                        {sLbl("Terpene Blend")}
                        <select
                          value={form.terpene_item_id}
                          onChange={(e) =>
                            setF("terpene_item_id", e.target.value)
                          }
                          style={sSelect}
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
                        <label
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.ink400,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginBottom: 6,
                          }}
                        >
                          Qty (µl){" "}
                          <InfoTooltip id="cogs-terpene-ul" position="top" />
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          max="2000"
                          value={form.terpene_qty_ul}
                          onChange={(e) =>
                            setF("terpene_qty_ul", e.target.value)
                          }
                          style={sInput}
                          placeholder="67"
                        />
                        {parseFloat(form.terpene_qty_ul) > 0 && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "#6A1B9A",
                              marginTop: 3,
                              fontWeight: 700,
                              fontFamily: T.fontData,
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
                        gap: 14,
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
                          borderRadius: 4,
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
                              fontWeight: 700,
                              fontFamily: T.fontData,
                            }}
                          >
                            ={" "}
                            {(parseFloat(form.terpene_qty_ul) / 1000).toFixed(
                              4,
                            )}
                            ml · {terpPct}% of {form.distillate_qty_ml}ml
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
                              borderRadius: 4,
                              border: "1px solid #CE93D8",
                              background:
                                parseInt(form.terpene_qty_ul) === p.ul
                                  ? "#CE93D8"
                                  : "#F8F0FD",
                              color: "#6A1B9A",
                              cursor: "pointer",
                              fontSize: 11,
                              fontFamily: T.fontUi,
                              fontWeight: 700,
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
                              fontFamily: T.fontData,
                            }}
                          >
                            R{fmt(costPerMl, 4)}/ml × {fmt(terpMl, 4)}ml ={" "}
                            {fmtZar(costPerMl * terpMl)}
                          </div>
                        );
                      })()}
                  </div>
                  {/* Distillate */}
                  <div
                    style={{
                      background: "#FFF8E1",
                      borderRadius: 6,
                      padding: "14px 16px",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#F57F17",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 12,
                      }}
                    >
                      Distillate (Local — ZAR per ml)
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr",
                        gap: 10,
                      }}
                    >
                      <div>
                        {sLbl("Distillate Input")}
                        <select
                          value={form.distillate_input_id}
                          onChange={(e) =>
                            setF("distillate_input_id", e.target.value)
                          }
                          style={sSelect}
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
                        {sLbl("Qty (ml)")}
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={form.distillate_qty_ml}
                          onChange={(e) =>
                            setF("distillate_qty_ml", e.target.value)
                          }
                          style={sInput}
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
                              fontFamily: T.fontData,
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
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#2E7D32",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 12,
                  }}
                >
                  Packaging (Local — ZAR per unit)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    {sLbl("Packaging Input")}
                    <select
                      value={form.packaging_input_id}
                      onChange={(e) => {
                        setF("packaging_input_id", e.target.value);
                        if (e.target.value) setF("packaging_manual_zar", "");
                      }}
                      style={sSelect}
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
                    {sLbl("Qty per unit")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.packaging_qty}
                      onChange={(e) => setF("packaging_qty", e.target.value)}
                      style={sInput}
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
                  <div style={{ fontSize: 11, color: T.ink500, flexShrink: 0 }}>
                    Or manually:
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
                        fontWeight: 700,
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
                        ...sInput,
                        width: 120,
                        background: form.packaging_manual_zar
                          ? "#f0fdf4"
                          : undefined,
                        border: form.packaging_manual_zar
                          ? `1px solid ${T.successBd}`
                          : `1px solid ${T.ink150}`,
                      }}
                    />
                    <span style={{ fontSize: 11, color: T.ink400 }}>
                      per unit
                    </span>
                    {form.packaging_manual_zar && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#2E7D32",
                          fontWeight: 700,
                          fontFamily: T.fontData,
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
                    Using manual rate — dropdown ignored
                  </div>
                )}
              </div>

              {/* Labour */}
              <div
                style={{
                  background: "#FCE4EC",
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#880E4F",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 12,
                  }}
                >
                  Labour (Local — ZAR per unit)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    {sLbl("Labour Input")}
                    <select
                      value={form.labour_input_id}
                      onChange={(e) => {
                        setF("labour_input_id", e.target.value);
                        if (e.target.value) setF("labour_manual_zar", "");
                      }}
                      style={sSelect}
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
                    {sLbl("Units of labour")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.labour_qty}
                      onChange={(e) => setF("labour_qty", e.target.value)}
                      style={sInput}
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
                  <div style={{ fontSize: 11, color: T.ink500, flexShrink: 0 }}>
                    Or manually:
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
                        fontWeight: 700,
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
                        ...sInput,
                        width: 120,
                        background: form.labour_manual_zar
                          ? "#fdf2f8"
                          : undefined,
                        border: form.labour_manual_zar
                          ? "1px solid #E91E8C"
                          : `1px solid ${T.ink150}`,
                      }}
                    />
                    <span style={{ fontSize: 11, color: T.ink400 }}>
                      per unit
                    </span>
                    {form.labour_manual_zar && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#880E4F",
                          fontWeight: 700,
                          fontFamily: T.fontData,
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
                    Using manual rate — dropdown ignored
                  </div>
                )}
              </div>

              {/* Lab testing */}
              <div
                style={{
                  background: "#E8EAF6",
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 14,
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
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#283593",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Lab Testing — Cannalytics Africa
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
                        <div style={{ fontSize: 11, color: T.ink400 }}>
                          Total:{" "}
                          <strong
                            style={{ color: "#283593", fontFamily: T.fontData }}
                          >
                            {fmtZar(total)}
                          </strong>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#283593",
                            fontFamily: T.fontData,
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
                          padding: "9px 12px",
                          borderRadius: 6,
                          border: `1px solid ${checked ? "#3949AB" : "#C5CAE9"}`,
                          background: checked ? "#E8EAF6" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLabTest(test.id)}
                          style={{
                            width: 14,
                            height: 14,
                            accentColor: "#3949AB",
                            flexShrink: 0,
                          }}
                        />
                        <div
                          style={{
                            flex: 1,
                            fontSize: 12,
                            fontWeight: checked ? 700 : 400,
                            color: checked ? "#283593" : T.ink500,
                            fontFamily: T.fontUi,
                          }}
                        >
                          {test.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#283593",
                            flexShrink: 0,
                            fontFamily: T.fontData,
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
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    background: "#E0F7FA",
                    borderRadius: 6,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#00695C",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    Transport (ZAR per batch){" "}
                    <InfoTooltip id="cogs-transport" position="top" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.transport_cost_zar}
                    onChange={(e) => setF("transport_cost_zar", e.target.value)}
                    style={sInput}
                    placeholder="0.00"
                  />
                  {parseFloat(form.transport_cost_zar) > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#00695C",
                        marginTop: 6,
                        fontFamily: T.fontData,
                      }}
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
                    borderRadius: 6,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#455A64",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 12,
                    }}
                  >
                    Miscellaneous (ZAR per batch)
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.misc_cost_zar}
                    onChange={(e) => setF("misc_cost_zar", e.target.value)}
                    style={sInput}
                    placeholder="0.00"
                  />
                  {parseFloat(form.misc_cost_zar) > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#455A64",
                        marginTop: 6,
                        fontFamily: T.fontData,
                      }}
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
                {sLbl("Notes (optional)")}
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setF("notes", e.target.value)}
                  style={{ ...sInput, resize: "vertical" }}
                  placeholder="Any notes about this recipe…"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div
              style={{
                padding: "18px 24px",
                borderTop: `1px solid ${T.ink150}`,
                display: "flex",
                justifyContent: "space-between",
                position: "sticky",
                bottom: 0,
                background: "#fff",
              }}
            >
              <button
                style={mkBtn("ghost")}
                onClick={() => setShowBuilder(false)}
              >
                Cancel
              </button>
              <button
                style={mkBtn("primary")}
                disabled={!form.product_name.trim() || saving}
                onClick={handleSave}
              >
                {saving
                  ? "Saving…"
                  : editingRecipe
                    ? `Update Recipe`
                    : `Save — ${previewBreakdown ? fmtZar(previewBreakdown.total) : "R0.00"} COGS`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
