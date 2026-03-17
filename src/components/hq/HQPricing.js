// src/components/hq/HQPricing.js v3.5 — WP-GUIDE-C+: usePageContext 'pricing' wired + WorkflowGuide added
// v3.4 — Batch P&L boxes always show per-unit price alongside total
// v3.3 — Per-unit COGS always shown prominently, batch P&L secondary
// v3.2 — Edit scrolls to detail panel, quantity P&L strip, hardware_qty warning
// v3.1 — calcCogsTotal mirrors HQCogs v3.1 exactly

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";

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

const fmtZar = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n, dp = 2) => (parseFloat(n) || 0).toFixed(dp);

const CHANNELS = [
  {
    id: "wholesale",
    label: "Wholesale",
    icon: "🏭",
    desc: "B2B retailer price",
  },
  { id: "retail", label: "Retail", icon: "🏪", desc: "In-store price" },
  { id: "website", label: "Website", icon: "🌐", desc: "Online store price" },
];

function marginColour(pct) {
  if (pct === null || isNaN(pct))
    return { color: "#bbb", bg: "#f5f5f5", label: "—" };
  if (pct < 0) return { color: "#c62828", bg: "#FFEBEE", label: "Loss" };
  if (pct < 20) return { color: "#c62828", bg: "#FFEBEE", label: "Low" };
  if (pct < 35) return { color: "#E65100", bg: "#FFF3E0", label: "OK" };
  return { color: "#2E7D32", bg: "#E8F5E9", label: "Good" };
}
function calcMargin(sellPrice, cogs) {
  if (!sellPrice || sellPrice <= 0) return null;
  return ((sellPrice - cogs) / sellPrice) * 100;
}
function recommendedPrice(cogs, targetMarginPct) {
  if (!targetMarginPct || targetMarginPct >= 100 || targetMarginPct <= 0)
    return null;
  return cogs / (1 - targetMarginPct / 100);
}

function MarginBadge({ pct, large = false }) {
  const c = marginColour(pct);
  return (
    <span
      style={{
        display: "inline-block",
        padding: large ? "6px 14px" : "3px 10px",
        borderRadius: 20,
        fontSize: large ? 16 : 12,
        fontWeight: 700,
        color: c.color,
        background: c.bg,
      }}
    >
      {pct !== null && !isNaN(pct) ? `${fmt(pct)}%` : "—"}
      {c.label !== "—" ? ` · ${c.label}` : ""}
    </span>
  );
}

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
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr>
            {["USD/ZAR Rate", "Est. COGS", "Margin at current price", ""].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#888",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #f0ede8",
                  }}
                >
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
              style={{ background: s.delta === 0 ? "#f0f7f0" : "transparent" }}
            >
              <td
                style={{
                  padding: "10px 12px",
                  fontWeight: s.delta === 0 ? 700 : 400,
                }}
              >
                R{fmt(s.rate, 2)}/USD{" "}
                {s.delta === 0
                  ? "← current"
                  : s.delta > 0
                    ? `(+R${s.delta})`
                    : `(−R${Math.abs(s.delta)})`}
              </td>
              <td style={{ padding: "10px 12px" }}>{fmtZar(s.scenarioCogs)}</td>
              <td style={{ padding: "10px 12px" }}>
                <MarginBadge pct={s.margin} />
              </td>
              <td style={{ padding: "10px 12px", fontSize: 11, color: "#aaa" }}>
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
  const mc = marginColour(margin);
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

  const inputBase = {
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontFamily: "Jost, sans-serif",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };
  const lbl = (text) => (
    <label
      style={{
        fontSize: 11,
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

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: `2px solid ${dirty ? "#2d4a2d" : "#f0ede8"}`,
        padding: 20,
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>{channel.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#2d4a2d" }}>
              {channel.label}
            </div>
            <div style={{ fontSize: 11, color: "#999" }}>{channel.desc}</div>
          </div>
        </div>
        {margin !== null && <MarginBadge pct={margin} large />}
      </div>
      <div style={{ marginBottom: 14 }}>
        {lbl("Sell Price (ZAR) — per unit")}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, color: "#555", fontWeight: 600 }}>
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
              ...inputBase,
              fontSize: 16,
              fontWeight: 600,
              color: "#2d4a2d",
              border: `1px solid ${dirty ? "#2d4a2d" : "#ddd"}`,
              flex: 1,
            }}
          />
        </div>
      </div>
      {sell > 0 && (
        <div style={{ marginBottom: 14 }}>
          {lbl("Adjust Price (what-if)")}
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
              color: "#bbb",
              marginTop: 2,
            }}
          >
            <span>{fmtZar(Math.max(1, cogs * 0.8))}</span>
            <span style={{ fontWeight: 600, color: mc.color }}>
              {fmtZar(sell)}
            </span>
            <span>{fmtZar(sell * 2.5)}</span>
          </div>
        </div>
      )}
      {sell > 0 && (
        <>
          <div
            style={{
              background: mc.bg,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: qtyUnits > 1 ? 6 : 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#888",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Per unit
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#666" }}>
                COGS: <strong>{fmtZar(cogs)}</strong>
              </span>
              <span style={{ color: "#666" }}>
                Profit:{" "}
                <strong style={{ color: mc.color }}>
                  {fmtZar(sell - cogs)}
                </strong>
              </span>
              <span style={{ color: "#666" }}>
                Margin:{" "}
                <strong style={{ color: mc.color }}>{fmt(margin)}%</strong>
              </span>
            </div>
          </div>
          {qtyUnits > 1 && (
            <div
              style={{
                background: "#f5f5f5",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 14,
                fontSize: 12,
              }}
            >
              <div style={{ color: "#888", marginBottom: 4 }}>
                × {qtyUnits.toLocaleString()} units
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666" }}>
                  Total COGS:{" "}
                  <strong style={{ color: "#c62828" }}>
                    {fmtZar(cogs * qtyUnits)}
                  </strong>
                </span>
                <span style={{ color: "#666" }}>
                  Total Revenue:{" "}
                  <strong style={{ color: "#2d4a2d" }}>
                    {fmtZar(sell * qtyUnits)}
                  </strong>
                </span>
              </div>
              <div style={{ marginTop: 3 }}>
                <span style={{ color: "#666" }}>
                  Total Profit:{" "}
                  <strong
                    style={{
                      color:
                        (sell - cogs) * qtyUnits >= 0 ? "#2d4a2d" : "#c62828",
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
      <div style={{ marginBottom: 14 }}>
        {lbl("Target Margin % → Recommended Price")}
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
              width: 80,
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontFamily: "Jost, sans-serif",
              fontSize: 14,
            }}
          />
          <span style={{ fontSize: 13, color: "#888" }}>% →</span>
          {recPrice ? (
            <button
              onClick={applyRec}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #2d4a2d",
                background: "#f0f7f0",
                color: "#2d4a2d",
                cursor: "pointer",
                fontFamily: "Jost, sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
              title="Click to apply"
            >
              {fmtZar(recPrice)} ↑ apply
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "#bbb" }}>Enter % above</span>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Notes (optional)"
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            fontFamily: "Jost, sans-serif",
            fontSize: 13,
            boxSizing: "border-box",
          }}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        style={{
          width: "100%",
          padding: "11px",
          borderRadius: 8,
          border: "none",
          cursor: dirty ? "pointer" : "default",
          fontFamily: "Jost, sans-serif",
          fontWeight: 600,
          fontSize: 14,
          background: dirty ? "#2d4a2d" : "#f0f0f0",
          color: dirty ? "#fff" : "#bbb",
          transition: "all 0.2s",
        }}
      >
        {saving ? "Saving…" : dirty ? `✓ Save ${channel.label} Price` : "Saved"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function HQPricing() {
  const { fxRate, fxLoading } = useFxRate();
  const usdZar = fxRate?.usd_zar || 18.5;

  // WP-GUIDE-C+: wire 'pricing' context for WorkflowGuide live status
  const ctx = usePageContext("pricing", null);

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
      if (detailRef.current) {
        detailRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
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
      showToast("❌ Save failed — check console");
      return;
    }
    showToast(`✅ ${channelId} price saved`);
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

  const card = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #f0ede8",
    padding: 24,
    marginBottom: 20,
  };

  return (
    <div style={{ fontFamily: "Jost, sans-serif", color: "#333" }}>
      {/* Toast */}
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

      {/* WP-GUIDE-C+: WorkflowGuide with live pricing context */}
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
            Pricing & Margin
          </h2>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: 14 }}>
            Set sell prices per channel · live margin calculations · FX
            sensitivity
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
          <button
            onClick={() => setShowFxPanel((v) => !v)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: showFxPanel ? "#2d4a2d" : "#fff",
              color: showFxPanel ? "#fff" : "#555",
              cursor: "pointer",
              fontFamily: "Jost, sans-serif",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            📊 FX Sensitivity
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
          Loading pricing data…
        </div>
      ) : recipes.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
          <h3
            style={{
              color: "#2d4a2d",
              fontFamily: "Cormorant Garamond, serif",
            }}
          >
            No SKU recipes yet
          </h3>
          <p style={{ color: "#999", fontSize: 14 }}>
            Build COGS recipes in <strong>HQ → Costing</strong> first, then set
            prices here.
          </p>
        </div>
      ) : (
        <>
          {/* All-SKUs Summary */}
          <div style={card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#2d4a2d" }}>
              All SKUs — Margin Overview
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#888",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                          borderBottom: "1px solid #f0ede8",
                        }}
                      >
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
                          selectedId === row.id ? "#f0f7f0" : "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid #f8f6f2",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "#2d4a2d" }}>
                          {row.name}
                        </div>
                        {row.sku && (
                          <div style={{ fontSize: 11, color: "#bbb" }}>
                            {row.sku}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid #f8f6f2",
                          fontWeight: 600,
                        }}
                      >
                        {fmtZar(row.cogs)}
                      </td>
                      {row.channels.map((ch) => (
                        <td
                          key={ch.id}
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #f8f6f2",
                          }}
                        >
                          {ch.sell ? (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>
                                {fmtZar(ch.sell)}
                              </div>
                              <MarginBadge pct={ch.margin} />
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "#ddd" }}>
                              Not set
                            </span>
                          )}
                        </td>
                      ))}
                      <td
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid #f8f6f2",
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAndScroll(row.id);
                          }}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: "1px solid #ddd",
                            background: "#f9f9f9",
                            cursor: "pointer",
                            fontSize: 12,
                            color: "#555",
                            fontFamily: "Jost, sans-serif",
                          }}
                        >
                          Edit →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected SKU Detail */}
          <div ref={detailRef} />
          {selected && (
            <div>
              <div style={{ ...card, padding: "20px 24px", marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
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
                      {selected.product_name}
                    </h3>
                    {selected.sku && (
                      <div
                        style={{ fontSize: 13, color: "#aaa", marginTop: 3 }}
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
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {selected.lab_tests?.length > 0 && (
                          <span
                            style={{
                              fontSize: 12,
                              background: "#E8EAF6",
                              color: "#283593",
                              borderRadius: 10,
                              padding: "3px 10px",
                              fontWeight: 600,
                            }}
                          >
                            🔬 {selected.lab_tests.length} lab test
                            {selected.lab_tests.length > 1 ? "s" : ""} ÷{" "}
                            {selected.batch_size || 1} units
                          </span>
                        )}
                        {parseFloat(selected.transport_cost_zar) > 0 && (
                          <span
                            style={{
                              fontSize: 12,
                              background: "#E0F7FA",
                              color: "#00695C",
                              borderRadius: 10,
                              padding: "3px 10px",
                              fontWeight: 600,
                            }}
                          >
                            🚚 Transport ÷ {selected.batch_size || 1}
                          </span>
                        )}
                        {parseFloat(selected.misc_cost_zar) > 0 && (
                          <span
                            style={{
                              fontSize: 12,
                              background: "#ECEFF1",
                              color: "#455A64",
                              borderRadius: 10,
                              padding: "3px 10px",
                              fontWeight: 600,
                            }}
                          >
                            ✏️ Misc ÷ {selected.batch_size || 1}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#aaa",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                        marginBottom: 4,
                      }}
                    >
                      Live COGS per unit
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#2d4a2d",
                      }}
                    >
                      {fmtZar(selectedCogs)}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                      at R{usdZar.toFixed(4)}/USD
                    </div>
                  </div>
                </div>
              </div>

              {showFxPanel && selectedCogs > 0 && (
                <div
                  style={{ ...card, background: "#f8f9fa", marginBottom: 20 }}
                >
                  <h4
                    style={{
                      margin: "0 0 14px",
                      fontSize: 15,
                      color: "#2d4a2d",
                    }}
                  >
                    📊 FX Sensitivity — {selected.product_name}
                  </h4>
                  <p
                    style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}
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
                      <p style={{ color: "#bbb", fontSize: 13 }}>
                        Set at least one sell price below to see FX sensitivity.
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Quantity scenario strip */}
              <div
                style={{
                  background: "#f8faf8",
                  border: "1px solid #e0ede0",
                  borderRadius: 10,
                  padding: "16px 18px",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      background: "#fff",
                      border: "2px solid #2d4a2d",
                      borderRadius: 8,
                      padding: "10px 18px",
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                        flexShrink: 0,
                      }}
                    >
                      COGS per unit
                    </div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: "#2d4a2d",
                      }}
                    >
                      {fmtZar(selectedCogs)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>
                    ← This is what ONE unit costs to make.
                    <br />
                    <span style={{ color: "#2d4a2d", fontWeight: 600 }}>
                      Sell prices below are also per unit.
                    </span>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #e8f0e8", paddingTop: 12 }}>
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
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#2d4a2d",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                        flexShrink: 0,
                      }}
                    >
                      Batch P&L — how many units?
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
                        padding: "6px 10px",
                        border: "1px solid #c8e6c9",
                        borderRadius: 6,
                        fontFamily: "Jost, sans-serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#2d4a2d",
                        width: 90,
                        textAlign: "center",
                      }}
                    />
                    {[1, 50, 100, 500, 1000].map((n) => (
                      <button
                        key={n}
                        onClick={() => setQtyUnits(n)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid #c8e6c9",
                          background: qtyUnits === n ? "#2d4a2d" : "#fff",
                          color: qtyUnits === n ? "#fff" : "#2d4a2d",
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "Jost, sans-serif",
                          fontWeight: 600,
                        }}
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
                          gap: 16,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            padding: "8px 14px",
                            minWidth: 160,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: "#888",
                              textTransform: "uppercase",
                            }}
                          >
                            Total COGS × {qtyUnits.toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "#c62828",
                            }}
                          >
                            {fmtZar(totalCogs)}
                          </div>
                          <div
                            style={{ display: "flex", gap: 10, marginTop: 4 }}
                          >
                            <span style={{ fontSize: 10, color: "#aaa" }}>
                              {fmtZar(selectedCogs)}/unit
                            </span>
                            {qtyUnits > 1 && (
                              <span style={{ fontSize: 10, color: "#aaa" }}>
                                × {qtyUnits.toLocaleString()} units
                              </span>
                            )}
                          </div>
                        </div>
                        {bestSell > 0 ? (
                          <>
                            <div style={{ fontSize: 20, color: "#ddd" }}>→</div>
                            <div
                              style={{
                                background: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                padding: "8px 14px",
                                minWidth: 160,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#888",
                                  textTransform: "uppercase",
                                }}
                              >
                                Total Revenue
                                {bestChannel ? ` (${bestChannel.label})` : ""}
                              </div>
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: "#2d4a2d",
                                }}
                              >
                                {fmtZar(totalRev)}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  marginTop: 4,
                                }}
                              >
                                <span style={{ fontSize: 10, color: "#aaa" }}>
                                  {fmtZar(bestSell)}/unit
                                </span>
                                {qtyUnits > 1 && (
                                  <span style={{ fontSize: 10, color: "#aaa" }}>
                                    × {qtyUnits.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: 20, color: "#ddd" }}>→</div>
                            <div
                              style={{
                                background:
                                  totalProfit >= 0 ? "#f0f7f0" : "#FFEBEE",
                                border: `1px solid ${totalProfit >= 0 ? "#c8e6c9" : "#ffcdd2"}`,
                                borderRadius: 8,
                                padding: "8px 14px",
                                minWidth: 160,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#888",
                                  textTransform: "uppercase",
                                }}
                              >
                                Gross Profit
                              </div>
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color:
                                    totalProfit >= 0 ? "#2d4a2d" : "#c62828",
                                }}
                              >
                                {fmtZar(totalProfit)}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  marginTop: 4,
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ fontSize: 10, color: "#aaa" }}>
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
                              color: "#bbb",
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
                  gridTemplateColumns: "repeat(3, 1fr)",
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

              {/* Legend */}
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#888" }}>Margin guide:</span>
                {[
                  { label: "< 20% — Low (red)", color: "#c62828" },
                  { label: "20–35% — OK (orange)", color: "#E65100" },
                  { label: "> 35% — Good (green)", color: "#2E7D32" },
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
                    <span style={{ color: "#888" }}>{g.label}</span>
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
