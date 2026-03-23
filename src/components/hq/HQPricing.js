// src/components/hq/HQPricing.js v4.1 — WP-THEME-2: Inter font
// v4.0 — WP-THEME: Unified design system applied
//   - Outfit replaces Cormorant Garamond + Jost everywhere
//   - DM Mono for all numeric / financial values
//   - Header: Outfit 300, ink900
//   - Toast: T.accent, clean text
//   - FX badge: success semantic tokens
//   - KPI values: DM Mono, semantic colour
//   - Margin badges: token colours
//   - Buttons: token system
//   - ChannelCard: dirty border → accentBd; save button uses token primary
//   - Summary table: ink tokens throughout
// v3.5: usePageContext 'pricing' + WorkflowGuide
// v3.4–v3.1: See changelog above

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "../viz";
import { useTenant } from "../../services/tenantService";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const sCard = {
  background: "#fff",
  borderRadius: 8,
  border: `1px solid ${T.ink150}`,
  padding: 24,
  marginBottom: 20,
  boxShadow: T.shadow,
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
const sTh = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  color: T.ink400,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  borderBottom: `1px solid ${T.ink150}`,
};
const sTd = {
  padding: "12px 14px",
  borderBottom: `1px solid ${T.ink075}`,
  color: T.ink700,
  verticalAlign: "middle",
  fontSize: 13,
};

const mkBtn = (variant = "primary", extra = {}) => {
  const base = {
    padding: "8px 16px",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    fontFamily: T.fontUi,
    fontWeight: 600,
    fontSize: 12,
    transition: "all 0.15s",
    letterSpacing: "0.04em",
  };
  const v = {
    primary: { background: T.accent, color: "#fff" },
    ghost: {
      background: "transparent",
      color: T.accent,
      border: `1px solid ${T.accentBd}`,
    },
    muted: { background: T.ink075, color: T.ink400, cursor: "default" },
    toggle: {
      background: T.ink075,
      color: T.ink500,
      border: `1px solid ${T.ink150}`,
    },
    toggleOn: { background: T.accent, color: "#fff" },
  };
  return { ...base, ...(v[variant] || v.primary), ...extra };
};

// ── Constants ─────────────────────────────────────────────────────────────────
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

const CHANNELS = [
  { id: "wholesale", label: "Wholesale", desc: "B2B retailer price" },
  { id: "retail", label: "Retail", desc: "In-store price" },
  { id: "website", label: "Website", desc: "Online store price" },
];

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

// ── COGS calc ─────────────────────────────────────────────────────────────────
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
  let tpCost = 0,
    diCost = 0;
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
  return (
    hwCost +
    tpCost +
    diCost +
    pkCost +
    lbCost +
    labTotal / batchSize +
    parseFloat(recipe.transport_cost_zar || 0) / batchSize +
    parseFloat(recipe.misc_cost_zar || 0) / batchSize
  );
}

const fmtZar = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n, dp = 2) => (parseFloat(n) || 0).toFixed(dp);
function calcMargin(sell, cogs) {
  if (!sell || sell <= 0) return null;
  return ((sell - cogs) / sell) * 100;
}
function recommendedPrice(cogs, targetPct) {
  if (!targetPct || targetPct >= 100 || targetPct <= 0) return null;
  return cogs / (1 - targetPct / 100);
}

// ── Margin helpers ────────────────────────────────────────────────────────────
function marginTokens(pct) {
  if (pct === null || isNaN(pct))
    return { color: T.ink300, bg: T.ink075, label: "—" };
  if (pct < 0) return { color: T.danger, bg: T.dangerBg, label: "Loss" };
  if (pct < 20) return { color: T.danger, bg: T.dangerBg, label: "Low" };
  if (pct < 35) return { color: T.warning, bg: T.warningBg, label: "OK" };
  return { color: T.success, bg: T.successBg, label: "Good" };
}

function MarginBadge({ pct, large = false }) {
  const c = marginTokens(pct);
  return (
    <span
      style={{
        display: "inline-block",
        padding: large ? "6px 14px" : "3px 10px",
        borderRadius: 20,
        fontSize: large ? 15 : 11,
        fontWeight: 700,
        color: c.color,
        background: c.bg,
        fontFamily: T.fontData,
        letterSpacing: "-0.01em",
      }}
    >
      {pct !== null && !isNaN(pct) ? `${fmt(pct)}%` : "—"}
      {c.label !== "—" ? ` · ${c.label}` : ""}
    </span>
  );
}

// ── FX Sensitivity table ──────────────────────────────────────────────────────
function FxSensitivity({ baseCogs, baseRate, sellPrice }) {
  const scenarios = [-2, -1, 0, +1, +2].map((delta) => {
    const rate = baseRate + delta;
    const scenarioCogs = baseCogs * (rate / baseRate);
    const margin = sellPrice > 0 ? calcMargin(sellPrice, scenarioCogs) : null;
    return { rate, scenarioCogs, margin, delta };
  });
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          fontFamily: T.fontUi,
        }}
      >
        <thead>
          <tr>
            {["USD/ZAR Rate", "Est. COGS", "Margin at current price", ""].map(
              (h) => (
                <th key={h} style={sTh}>
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr
              key={s.rate}
              style={{
                background: s.delta === 0 ? T.accentLit : "transparent",
              }}
            >
              <td
                style={{
                  ...sTd,
                  fontWeight: s.delta === 0 ? 700 : 400,
                  fontFamily: T.fontData,
                }}
              >
                R{fmt(s.rate, 2)}/USD{" "}
                {s.delta === 0
                  ? "← current"
                  : s.delta > 0
                    ? `(+R${s.delta})`
                    : `(−R${Math.abs(s.delta)})`}
              </td>
              <td style={{ ...sTd, fontFamily: T.fontData }}>
                {fmtZar(s.scenarioCogs)}
              </td>
              <td style={sTd}>
                <MarginBadge pct={s.margin} />
              </td>
              <td
                style={{
                  ...sTd,
                  fontSize: 11,
                  color: T.ink400,
                  fontFamily: T.fontData,
                }}
              >
                {s.delta !== 0 && s.margin !== null
                  ? `${fmt(Math.abs(s.margin - (scenarios[2].margin || 0)))}pp ${s.delta > 0 ? "▼" : "▲"}`
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ChannelCard ───────────────────────────────────────────────────────────────
function ChannelCard({ channel, cogs, qtyUnits = 1, pricing, onSave }) {
  const existing = pricing.find((p) => p.channel === channel.id);
  const [sellPrice, setSellPrice] = useState(
    existing?.sell_price_zar ? fmt(existing.sell_price_zar) : "",
  );
  const [targetPct, setTargetPct] = useState(
    existing?.target_margin ? fmt(existing.target_margin) : "",
  );
  const [notes, setNotes] = useState(existing?.notes || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const sell = parseFloat(sellPrice) || 0;
  const margin = sell > 0 ? calcMargin(sell, cogs) : null;
  const mc = marginTokens(margin);
  const recPrice = targetPct
    ? recommendedPrice(cogs, parseFloat(targetPct))
    : null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(channel.id, {
      sell_price_zar: sell || null,
      target_margin: parseFloat(targetPct) || null,
      notes: notes || null,
    });
    setSaving(false);
    setDirty(false);
  };
  const applyRec = () => {
    if (recPrice) {
      setSellPrice(fmt(recPrice));
      setDirty(true);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: `2px solid ${dirty ? T.accent : T.ink150}`,
        padding: 20,
        transition: "border-color 0.2s",
        boxShadow: T.shadow,
      }}
    >
      {/* Channel header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: T.ink900,
              fontFamily: T.fontUi,
            }}
          >
            {channel.label}
          </div>
          <div
            style={{
              fontSize: 11,
              color: T.ink400,
              marginTop: 2,
              fontFamily: T.fontUi,
            }}
          >
            {channel.desc}
          </div>
        </div>
        {margin !== null && <MarginBadge pct={margin} large />}
      </div>

      {/* Sell price */}
      <div style={{ marginBottom: 14 }}>
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
          Sell Price (ZAR) — per unit
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 16,
              color: T.ink500,
              fontWeight: 600,
              fontFamily: T.fontData,
            }}
          >
            R
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={sellPrice}
            onChange={(e) => {
              setSellPrice(e.target.value);
              setDirty(true);
            }}
            placeholder="0.00"
            style={{
              ...sInput,
              fontSize: 16,
              fontWeight: 600,
              color: T.accent,
              fontFamily: T.fontData,
              border: `1px solid ${dirty ? T.accent : T.ink150}`,
              flex: 1,
            }}
          />
        </div>
      </div>

      {/* Slider */}
      {sell > 0 && (
        <div style={{ marginBottom: 14 }}>
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
            Adjust Price (what-if)
          </label>
          <input
            type="range"
            min={Math.max(1, Math.round(cogs * 0.8))}
            max={Math.round(sell * 2.5)}
            step={1}
            value={Math.round(sell)}
            onChange={(e) => {
              setSellPrice(fmt(e.target.value));
              setDirty(true);
            }}
            style={{ width: "100%", accentColor: mc.color }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: T.ink300,
              marginTop: 2,
              fontFamily: T.fontData,
            }}
          >
            <span>{fmtZar(Math.max(1, cogs * 0.8))}</span>
            <span style={{ fontWeight: 700, color: mc.color }}>
              {fmtZar(sell)}
            </span>
            <span>{fmtZar(sell * 2.5)}</span>
          </div>
        </div>
      )}

      {/* P&L display */}
      {sell > 0 && (
        <>
          <div
            style={{
              background: mc.bg,
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: qtyUnits > 1 ? 6 : 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: T.ink400,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Per unit
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                fontFamily: T.fontUi,
              }}
            >
              <span style={{ color: T.ink500 }}>
                COGS:{" "}
                <strong style={{ fontFamily: T.fontData }}>
                  {fmtZar(cogs)}
                </strong>
              </span>
              <span style={{ color: T.ink500 }}>
                Profit:{" "}
                <strong style={{ color: mc.color, fontFamily: T.fontData }}>
                  {fmtZar(sell - cogs)}
                </strong>
              </span>
              <span style={{ color: T.ink500 }}>
                Margin:{" "}
                <strong style={{ color: mc.color, fontFamily: T.fontData }}>
                  {fmt(margin)}%
                </strong>
              </span>
            </div>
          </div>
          {qtyUnits > 1 && (
            <div
              style={{
                background: T.ink075,
                borderRadius: 6,
                padding: "8px 12px",
                marginBottom: 14,
                fontSize: 12,
              }}
            >
              <div
                style={{
                  color: T.ink400,
                  marginBottom: 4,
                  fontFamily: T.fontUi,
                }}
              >
                × {qtyUnits.toLocaleString()} units
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: T.fontUi,
                }}
              >
                <span style={{ color: T.ink500 }}>
                  Total COGS:{" "}
                  <strong style={{ color: T.danger, fontFamily: T.fontData }}>
                    {fmtZar(cogs * qtyUnits)}
                  </strong>
                </span>
                <span style={{ color: T.ink500 }}>
                  Revenue:{" "}
                  <strong style={{ color: T.accent, fontFamily: T.fontData }}>
                    {fmtZar(sell * qtyUnits)}
                  </strong>
                </span>
              </div>
              <div style={{ marginTop: 3, fontFamily: T.fontUi }}>
                <span style={{ color: T.ink500 }}>
                  Gross Profit:{" "}
                  <strong
                    style={{
                      color:
                        (sell - cogs) * qtyUnits >= 0 ? T.accent : T.danger,
                      fontFamily: T.fontData,
                    }}
                  >
                    {fmtZar((sell - cogs) * qtyUnits)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Target margin */}
      <div style={{ marginBottom: 14 }}>
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
          Target Margin % → Recommended Price
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            min="1"
            max="99"
            step="1"
            value={targetPct}
            onChange={(e) => {
              setTargetPct(e.target.value);
              setDirty(true);
            }}
            placeholder="e.g. 40"
            style={{
              ...sInput,
              width: 80,
              textAlign: "center",
              fontFamily: T.fontData,
            }}
          />
          <span style={{ fontSize: 12, color: T.ink400 }}>% →</span>
          {recPrice ? (
            <button onClick={applyRec} style={mkBtn("ghost", { fontSize: 12 })}>
              <span style={{ fontFamily: T.fontData }}>{fmtZar(recPrice)}</span>{" "}
              — apply
            </button>
          ) : (
            <span style={{ fontSize: 12, color: T.ink300 }}>Enter % above</span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Notes (optional)"
          style={{ ...sInput, fontSize: 12 }}
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: 4,
          border: "none",
          cursor: dirty ? "pointer" : "default",
          fontFamily: T.fontUi,
          fontWeight: 700,
          fontSize: 13,
          background: dirty ? T.accent : T.ink075,
          color: dirty ? "#fff" : T.ink400,
          transition: "all 0.2s",
          letterSpacing: "0.04em",
        }}
      >
        {saving ? "Saving…" : dirty ? `Save ${channel.label} Price` : "Saved"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function HQPricing() {
  const { fxRate, fxLoading } = useFxRate();
  const usdZar = fxRate?.usd_zar || 18.5;
  const ctx = usePageContext("pricing", null);
  const { tenant } = useTenant();
  const industryProfile = tenant?.industry_profile || "cannabis_retail";
  const isFoodBev = industryProfile === "food_beverage";
  const isGeneral = industryProfile === "general_retail";
  const isCannabis =
    industryProfile === "cannabis_retail" ||
    industryProfile === "cannabis_dispensary";

  const [recipes, setRecipes] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [localInputs, setLocalInputs] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const detailRef = useRef(null);
  const [toast, setToast] = useState("");
  const [showFxPanel, setShowFxPanel] = useState(false);
  const [pricingVersion, setPricingVersion] = useState(0);
  const [qtyUnits, setQtyUnits] = useState(1);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3, r4] = await Promise.all([
      supabase
        .from("product_cogs")
        .select("*")
        .eq("is_active", true)
        .order("product_name"),
      supabase.from("supplier_products").select("*").eq("is_active", true),
      supabase.from("local_inputs").select("*").eq("is_active", true),
      supabase.from("product_pricing").select("*"),
    ]);
    setRecipes(r1.data || []);
    setSupplierProducts(r2.data || []);
    setLocalInputs(r3.data || []);
    setPricing(r4.data || []);
    setLoading(false);
    if (!selectedId && r1.data?.length > 0) setSelectedId(r1.data[0].id);
  }, [selectedId]);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selectAndScroll = (id) => {
    setSelectedId(id);
    setTimeout(() => {
      if (detailRef.current)
        detailRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleSaveChannel = async (cogsId, channelId, values) => {
    const { data: existing } = await supabase
      .from("product_pricing")
      .select("id")
      .eq("product_cogs_id", cogsId)
      .eq("channel", channelId)
      .maybeSingle();
    let error;
    if (existing?.id) {
      ({ error } = await supabase
        .from("product_pricing")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("product_pricing")
        .insert({ product_cogs_id: cogsId, channel: channelId, ...values }));
    }
    if (error) {
      console.error("Pricing save error:", error);
      showToast("Save failed — check console");
      return;
    }
    showToast(`${channelId} price saved`);
    const { data } = await supabase.from("product_pricing").select("*");
    setPricing(data || []);
    setPricingVersion((v) => v + 1);
  };

  const selected = recipes.find((r) => r.id === selectedId);
  const selectedCogs = selected
    ? calcCogsTotal(selected, supplierProducts, localInputs, usdZar)
    : 0;
  const selectedPricing = pricing.filter(
    (p) => p.product_cogs_id === selectedId,
  );

  const summaryRows = recipes.map((r) => {
    const cogs = calcCogsTotal(r, supplierProducts, localInputs, usdZar);
    const rows = pricing.filter((p) => p.product_cogs_id === r.id);
    const channels = CHANNELS.map((ch) => {
      const p = rows.find((x) => x.channel === ch.id);
      const sell = p?.sell_price_zar ? parseFloat(p.sell_price_zar) : null;
      return { id: ch.id, sell, margin: sell ? calcMargin(sell, cogs) : null };
    });
    return { id: r.id, name: r.product_name, sku: r.sku, cogs, channels };
  });

  return (
    <div style={{ fontFamily: T.fontUi, color: T.ink700 }}>
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

      <WorkflowGuide
        context={ctx}
        tabId="pricing"
        onAction={() => {}}
        defaultOpen={true}
      />

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
            Pricing & Margin
          </h2>
          <p style={{ margin: "4px 0 0", color: T.ink500, fontSize: 13 }}>
            Set sell prices per channel · live margin calculations · FX
            sensitivity
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
          <button
            onClick={() => setShowFxPanel((v) => !v)}
            style={mkBtn(showFxPanel ? "toggleOn" : "toggle")}
          >
            FX Sensitivity
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: T.ink400 }}>
          Loading pricing data…
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
          <p style={{ color: T.ink400, fontSize: 13 }}>
            Build COGS recipes in <strong>HQ → Costing</strong> first, then set
            prices here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary table */}
          <div style={sCard}>
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                color: T.ink900,
                fontFamily: T.fontUi,
                fontWeight: 500,
              }}
            >
              All SKUs — Margin Overview
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: T.fontUi,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "SKU / Product",
                      "COGS (live)",
                      "Wholesale",
                      "Retail",
                      "Website",
                      "",
                    ].map((h) => (
                      <th key={h} style={sTh}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => selectAndScroll(row.id)}
                      style={{
                        cursor: "pointer",
                        background:
                          selectedId === row.id ? T.accentLit : "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <td style={sTd}>
                        <div style={{ fontWeight: 600, color: T.ink900 }}>
                          {row.name}
                        </div>
                        {row.sku && (
                          <div
                            style={{
                              fontSize: 11,
                              color: T.ink400,
                              fontFamily: T.fontData,
                            }}
                          >
                            {row.sku}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.fontData,
                          fontWeight: 600,
                          color: T.accent,
                        }}
                      >
                        {fmtZar(row.cogs)}
                      </td>
                      {row.channels.map((ch) => (
                        <td key={ch.id} style={sTd}>
                          {ch.sell ? (
                            <div>
                              <div
                                style={{
                                  fontFamily: T.fontData,
                                  fontWeight: 600,
                                  marginBottom: 4,
                                }}
                              >
                                {fmtZar(ch.sell)}
                              </div>
                              <MarginBadge pct={ch.margin} />
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: T.ink150 }}>
                              Not set
                            </span>
                          )}
                        </td>
                      ))}
                      <td style={sTd}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAndScroll(row.id);
                          }}
                          style={mkBtn("ghost", {
                            fontSize: 11,
                            padding: "4px 10px",
                          })}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CHARTS: Margin by channel + Price vs Margin scatter ── */}
          {summaryRows.length > 0 &&
            (() => {
              // HBar: avg margin per channel across all priced SKUs
              const channelMargins = CHANNELS.map((ch) => {
                const priced = summaryRows
                  .map((r) => r.channels.find((c) => c.id === ch.id))
                  .filter((c) => c?.margin !== null && c?.margin !== undefined);
                const avg =
                  priced.length > 0
                    ? priced.reduce((s, c) => s + c.margin, 0) / priced.length
                    : null;
                return { channel: ch.label, avg, count: priced.length };
              }).filter((c) => c.avg !== null);

              // Scatter: each priced SKU/channel combo → sell price vs margin
              const scatterData = [];
              summaryRows.forEach((r) => {
                r.channels.forEach((ch) => {
                  if (ch.sell && ch.margin !== null) {
                    scatterData.push({
                      name: `${r.name} (${ch.id})`,
                      sell: Math.round(ch.sell),
                      margin: parseFloat(ch.margin.toFixed(1)),
                      channel: ch.id,
                    });
                  }
                });
              });
              const SCATTER_COLOURS = {
                wholesale: T.info,
                retail: T.accentMid,
                website: "#52B788",
              };

              if (channelMargins.length === 0 && scatterData.length === 0)
                return null;
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      scatterData.length > 1 ? "1fr 1fr" : "1fr",
                    gap: 20,
                    marginBottom: 24,
                  }}
                >
                  {channelMargins.length > 0 && (
                    <ChartCard title="Avg Margin by Channel" height={220}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={channelMargins}
                          layout="vertical"
                          margin={{ top: 8, right: 32, bottom: 8, left: 0 }}
                        >
                          <CartesianGrid
                            horizontal={false}
                            vertical
                            stroke={T.ink150}
                            strokeWidth={0.5}
                          />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{
                              fill: T.ink400,
                              fontSize: 10,
                              fontFamily: T.font,
                            }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <YAxis
                            type="category"
                            dataKey="channel"
                            tick={{
                              fill: T.ink400,
                              fontSize: 11,
                              fontFamily: T.font,
                            }}
                            axisLine={false}
                            tickLine={false}
                            width={72}
                          />
                          <Tooltip
                            content={
                              <ChartTooltip
                                formatter={(v) =>
                                  `${parseFloat(v).toFixed(1)}%`
                                }
                              />
                            }
                          />
                          <ReferenceLine
                            x={35}
                            stroke={T.success}
                            strokeDasharray="4 3"
                            strokeWidth={1}
                          />
                          <ReferenceLine
                            x={20}
                            stroke={T.warning}
                            strokeDasharray="4 3"
                            strokeWidth={1}
                          />
                          <Bar
                            dataKey="avg"
                            name="Avg Margin"
                            isAnimationActive={false}
                            maxBarSize={28}
                            radius={[0, 3, 3, 0]}
                          >
                            {channelMargins.map((d, i) => (
                              <Cell
                                key={i}
                                fill={
                                  d.avg >= 35
                                    ? T.success
                                    : d.avg >= 20
                                      ? T.warning
                                      : T.danger
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {scatterData.length > 1 && (
                    <ChartCard title="Price vs Margin (all SKUs)" height={220}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                        >
                          <CartesianGrid stroke={T.ink150} strokeWidth={0.5} />
                          <XAxis
                            type="number"
                            dataKey="sell"
                            name="Sell Price"
                            tick={{
                              fill: T.ink400,
                              fontSize: 10,
                              fontFamily: T.font,
                            }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `R${v}`}
                            label={{
                              value: "Sell Price",
                              position: "insideBottom",
                              offset: -4,
                              fontSize: 9,
                              fill: T.ink400,
                            }}
                          />
                          <YAxis
                            type="number"
                            dataKey="margin"
                            name="Margin %"
                            tick={{
                              fill: T.ink400,
                              fontSize: 10,
                              fontFamily: T.font,
                            }}
                            axisLine={false}
                            tickLine={false}
                            width={36}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            content={
                              <ChartTooltip
                                formatter={(v, n) =>
                                  n === "Margin %" ? `${v}%` : `R${v}`
                                }
                              />
                            }
                          />
                          <ReferenceLine
                            y={35}
                            stroke={T.success}
                            strokeDasharray="4 3"
                            strokeWidth={1}
                          />
                          <ReferenceLine
                            y={20}
                            stroke={T.warning}
                            strokeDasharray="4 3"
                            strokeWidth={1}
                          />
                          <Scatter data={scatterData} isAnimationActive={false}>
                            {scatterData.map((d, i) => (
                              <Cell
                                key={i}
                                fill={SCATTER_COLOURS[d.channel] || T.accentMid}
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}
                </div>
              );
            })()}

          {/* Selected SKU detail */}
          <div ref={detailRef} />
          {selected && (
            <div>
              {/* SKU header card */}
              <div style={{ ...sCard, padding: "18px 22px", marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
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
                      {selected.product_name}
                    </h3>
                    {selected.sku && (
                      <div
                        style={{
                          fontSize: 12,
                          color: T.ink400,
                          marginTop: 3,
                          fontFamily: T.fontData,
                        }}
                      >
                        {selected.sku}
                      </div>
                    )}
                    {(selected.lab_tests?.length > 0 ||
                      selected.transport_cost_zar > 0 ||
                      selected.misc_cost_zar > 0) && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {selected.lab_tests?.length > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              background: T.infoBg,
                              color: T.info,
                              borderRadius: 3,
                              padding: "2px 8px",
                              fontWeight: 700,
                            }}
                          >
                            {selected.lab_tests.length}{" "}
                            {isFoodBev
                              ? "quality test"
                              : isGeneral
                                ? "compliance test"
                                : "lab test"}
                            {selected.lab_tests.length > 1 ? "s" : ""} ÷{" "}
                            {selected.batch_size || 1} units
                          </span>
                        )}
                        {parseFloat(selected.transport_cost_zar) > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              background: T.accentLit,
                              color: T.accent,
                              borderRadius: 3,
                              padding: "2px 8px",
                              fontWeight: 700,
                            }}
                          >
                            Transport ÷ {selected.batch_size || 1}
                          </span>
                        )}
                        {parseFloat(selected.misc_cost_zar) > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              background: T.ink075,
                              color: T.ink500,
                              borderRadius: 3,
                              padding: "2px 8px",
                              fontWeight: 700,
                            }}
                          >
                            Misc ÷ {selected.batch_size || 1}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Live COGS per unit
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontData,
                        fontSize: 26,
                        fontWeight: 400,
                        color: T.accent,
                      }}
                    >
                      {fmtZar(selectedCogs)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.ink400,
                        marginTop: 2,
                        fontFamily: T.fontData,
                      }}
                    >
                      at R{usdZar.toFixed(4)}/USD
                    </div>
                  </div>
                </div>
              </div>

              {/* FX Sensitivity panel */}
              {showFxPanel && selectedCogs > 0 && (
                <div
                  style={{ ...sCard, background: T.ink050, marginBottom: 16 }}
                >
                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: 14,
                      color: T.ink900,
                      fontFamily: T.fontUi,
                      fontWeight: 500,
                    }}
                  >
                    FX Sensitivity — {selected.product_name}
                  </h4>
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 13,
                      color: T.ink500,
                    }}
                  >
                    How your margin changes if USD/ZAR moves ±R2. Using highest
                    sell price set across channels.
                  </p>
                  {(() => {
                    const bestSell = Math.max(
                      ...CHANNELS.map((ch) => {
                        const p = selectedPricing.find(
                          (x) => x.channel === ch.id,
                        );
                        return p?.sell_price_zar
                          ? parseFloat(p.sell_price_zar)
                          : 0;
                      }),
                    );
                    return bestSell > 0 ? (
                      <FxSensitivity
                        baseCogs={selectedCogs}
                        baseRate={usdZar}
                        sellPrice={bestSell}
                      />
                    ) : (
                      <p style={{ color: T.ink300, fontSize: 13 }}>
                        Set at least one sell price below to see FX sensitivity.
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Quantity / Batch P&L strip */}
              <div
                style={{
                  background: T.accentLit,
                  border: `1px solid ${T.accentBd}`,
                  borderRadius: 8,
                  padding: "16px 18px",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 14,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Per-unit COGS anchor */}
                  <div
                    style={{
                      background: "#fff",
                      border: `2px solid ${T.accentBd}`,
                      borderRadius: 6,
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      COGS per unit
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontData,
                        fontSize: 24,
                        fontWeight: 400,
                        color: T.accent,
                      }}
                    >
                      {fmtZar(selectedCogs)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.ink500 }}>
                    This is what ONE unit costs to make.
                    <br />
                    <strong style={{ color: T.accent }}>
                      Sell prices below are also per unit.
                    </strong>
                  </div>
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${T.accentBd}`,
                    paddingTop: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        flexShrink: 0,
                      }}
                    >
                      {isFoodBev
                        ? "Recipe Run P&L — how many units?"
                        : isGeneral
                          ? "Order P&L — how many units?"
                          : "Batch P&L — how many units?"}
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={qtyUnits}
                      onChange={(e) =>
                        setQtyUnits(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      style={{
                        ...sInput,
                        width: 90,
                        textAlign: "center",
                        fontFamily: T.fontData,
                        fontWeight: 700,
                        color: T.accent,
                        border: `1px solid ${T.accentBd}`,
                      }}
                    />
                    {[1, 50, 100, 500, 1000].map((n) => (
                      <button
                        key={n}
                        onClick={() => setQtyUnits(n)}
                        style={mkBtn(qtyUnits === n ? "primary" : "ghost", {
                          padding: "4px 10px",
                          fontSize: 11,
                        })}
                      >
                        {n === 1 ? "1" : n >= 1000 ? `${n / 1000}k` : n}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const totalCogs = selectedCogs * qtyUnits;
                    const bestSell = Math.max(
                      0,
                      ...CHANNELS.map((ch) => {
                        const p = selectedPricing.find(
                          (x) => x.channel === ch.id,
                        );
                        return p?.sell_price_zar
                          ? parseFloat(p.sell_price_zar)
                          : 0;
                      }),
                    );
                    const bestChannel = CHANNELS.find((ch) => {
                      const p = selectedPricing.find(
                        (x) => x.channel === ch.id,
                      );
                      return (
                        p?.sell_price_zar &&
                        parseFloat(p.sell_price_zar) === bestSell
                      );
                    });
                    const totalRev = bestSell * qtyUnits;
                    const totalProfit = totalRev - totalCogs;
                    const margin =
                      totalRev > 0 ? (totalProfit / totalRev) * 100 : null;
                    return (
                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            background: "#fff",
                            border: `1px solid ${T.ink150}`,
                            borderRadius: 6,
                            padding: "8px 14px",
                            minWidth: 150,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: T.ink400,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              fontWeight: 700,
                            }}
                          >
                            Total COGS × {qtyUnits.toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontFamily: T.fontData,
                              fontSize: 17,
                              fontWeight: 400,
                              color: T.danger,
                            }}
                          >
                            {fmtZar(totalCogs)}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: T.ink400,
                              fontFamily: T.fontData,
                              marginTop: 2,
                            }}
                          >
                            {fmtZar(selectedCogs)}/unit ×{" "}
                            {qtyUnits.toLocaleString()}
                          </div>
                        </div>
                        {bestSell > 0 ? (
                          <>
                            <div style={{ fontSize: 18, color: T.ink300 }}>
                              →
                            </div>
                            <div
                              style={{
                                background: "#fff",
                                border: `1px solid ${T.ink150}`,
                                borderRadius: 6,
                                padding: "8px 14px",
                                minWidth: 150,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.ink400,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  fontWeight: 700,
                                }}
                              >
                                Total Revenue
                                {bestChannel ? ` (${bestChannel.label})` : ""}
                              </div>
                              <div
                                style={{
                                  fontFamily: T.fontData,
                                  fontSize: 17,
                                  fontWeight: 400,
                                  color: T.accent,
                                }}
                              >
                                {fmtZar(totalRev)}
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.ink400,
                                  fontFamily: T.fontData,
                                  marginTop: 2,
                                }}
                              >
                                {fmtZar(bestSell)}/unit ×{" "}
                                {qtyUnits.toLocaleString()}
                              </div>
                            </div>
                            <div style={{ fontSize: 18, color: T.ink300 }}>
                              →
                            </div>
                            <div
                              style={{
                                background:
                                  totalProfit >= 0 ? "#fff" : T.dangerBg,
                                border: `1px solid ${totalProfit >= 0 ? T.successBd : T.dangerBd}`,
                                borderRadius: 6,
                                padding: "8px 14px",
                                minWidth: 150,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.ink400,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  fontWeight: 700,
                                }}
                              >
                                Gross Profit
                              </div>
                              <div
                                style={{
                                  fontFamily: T.fontData,
                                  fontSize: 17,
                                  fontWeight: 400,
                                  color:
                                    totalProfit >= 0 ? T.success : T.danger,
                                }}
                              >
                                {fmtZar(totalProfit)}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  marginTop: 4,
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: T.ink400,
                                    fontFamily: T.fontData,
                                  }}
                                >
                                  {fmtZar(totalProfit / qtyUnits)}/unit
                                </span>
                                {margin !== null && (
                                  <MarginBadge pct={margin} />
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div
                            style={{
                              fontSize: 12,
                              color: T.ink400,
                              fontStyle: "italic",
                            }}
                          >
                            Set a sell price in the cards below to see batch P&L
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Channel cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 16,
                }}
              >
                {CHANNELS.map((ch) => (
                  <ChannelCard
                    key={`${ch.id}-${selectedId}-${pricingVersion}`}
                    channel={ch}
                    cogs={selectedCogs}
                    qtyUnits={qtyUnits}
                    pricing={selectedPricing}
                    onSave={(channelId, values) =>
                      handleSaveChannel(selected.id, channelId, values)
                    }
                  />
                ))}
              </div>

              {/* Margin legend */}
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  fontSize: 12,
                  alignItems: "center",
                }}
              >
                <span style={{ color: T.ink400, fontFamily: T.fontUi }}>
                  Margin guide:
                </span>
                {[
                  { label: "< 20% — Low", color: T.danger },
                  { label: "20–35% — OK", color: T.warning },
                  { label: "> 35% — Good", color: T.success },
                ].map((g) => (
                  <div
                    key={g.label}
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: g.color,
                      }}
                    />
                    <span style={{ color: T.ink400, fontFamily: T.fontUi }}>
                      {g.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
