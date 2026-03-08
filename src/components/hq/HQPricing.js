// src/components/hq/HQPricing.js v1.0 — WP-D: Pricing & Margin Intelligence
// Protea Botanicals · Phase 2 · March 2026
// New file — add to src/components/hq/
//
// Margin formula:  margin% = (sell_price - cogs) / sell_price × 100
// Recommended price from target margin: price = cogs / (1 - target/100)
// Channels: wholesale / retail / website
// Colour thresholds: red <20% · orange 20–35% · green >35%

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── FX Hook (same pattern throughout Phase 2) ────────────────────────────────
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

// ─── COGS Calculation (mirrors HQCogs.js) ────────────────────────────────────
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
  const diCost =
    di && di.cost_zar
      ? parseFloat(recipe.distillate_qty_ml || 0) * parseFloat(di.cost_zar)
      : 0;
  const pkCost =
    pk && pk.cost_zar
      ? parseFloat(recipe.packaging_qty || 1) * parseFloat(pk.cost_zar)
      : 0;
  const lbCost =
    lb && lb.cost_zar
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

// ─── Margin Badge ─────────────────────────────────────────────────────────────
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
      {pct !== null && !isNaN(pct) ? `${fmt(pct)}%` : "—"}{" "}
      {c.label !== "—" ? `· ${c.label}` : ""}
    </span>
  );
}

// ─── FX Sensitivity Row ───────────────────────────────────────────────────────
function FxSensitivity({ baseCogs, baseRate, sellPrice }) {
  const scenarios = [-2, -1, 0, +1, +2].map((delta) => {
    const rate = baseRate + delta;
    // COGS scales with FX — approximate: multiply cogs by rate ratio
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

// ══════════════════════════════════════════════════════════════════════════════
// CHANNEL PRICING CARD
// ══════════════════════════════════════════════════════════════════════════════
function ChannelCard({ channel, cogs, pricing, onSave }) {
  const existing = pricing.find((p) => p.channel === channel.id);

  // Initialise from existing data. Use a key on the parent to remount
  // after save rather than syncing via useEffect (which wipes in-progress edits).
  const [sellPrice, setSellPrice] = useState(
    existing?.sell_price_zar ? fmt(existing.sell_price_zar) : "",
  );
  const [targetPct, setTargetPct] = useState(
    existing?.target_margin ? fmt(existing.target_margin) : "",
  );
  const [notes, setNotes] = useState(existing?.notes || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // No useEffect sync — state is only reset when the card remounts (after save via key prop)

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
      {/* Channel header */}
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

      {/* Sell price input */}
      <div style={{ marginBottom: 14 }}>
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
          Sell Price (ZAR)
        </label>
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
              flex: 1,
              padding: "10px 14px",
              border: `1px solid ${dirty ? "#2d4a2d" : "#ddd"}`,
              borderRadius: 8,
              fontFamily: "Jost, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: "#2d4a2d",
            }}
          />
        </div>
      </div>

      {/* What-if slider */}
      {sell > 0 && (
        <div style={{ marginBottom: 14 }}>
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

      {/* Margin breakdown */}
      {sell > 0 && (
        <div
          style={{
            background: mc.bg,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
          }}
        >
          <span style={{ color: "#666" }}>
            COGS: <strong>{fmtZar(cogs)}</strong>
          </span>
          <span style={{ color: "#666" }}>
            Gross:{" "}
            <strong style={{ color: mc.color }}>{fmtZar(sell - cogs)}</strong>
          </span>
          <span style={{ color: "#666" }}>
            Margin: <strong style={{ color: mc.color }}>{fmt(margin)}%</strong>
          </span>
        </div>
      )}

      {/* Target margin → recommended price */}
      <div style={{ marginBottom: 14 }}>
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
              title="Click to apply this price"
            >
              {fmtZar(recPrice)} ↑ apply
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "#bbb" }}>Enter % above</span>
          )}
        </div>
      </div>

      {/* Notes */}
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

      {/* Save */}
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

  const [recipes, setRecipes] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [localInputs, setLocalInputs] = useState([]);
  const [pricing, setPricing] = useState([]); // all product_pricing rows
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState("");
  const [showFxPanel, setShowFxPanel] = useState(false);
  const [pricingVersion, setPricingVersion] = useState(0); // bumped after each save to remount cards

  // ── Fetch ────────────────────────────────────────────────────────────
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
    // Auto-select first SKU
    if (!selectedId && r1.data?.length > 0) setSelectedId(r1.data[0].id);
  }, [selectedId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  // ── Save a channel price (manual upsert — avoids constraint dependency) ──
  const handleSaveChannel = async (cogsId, channelId, values) => {
    // Check if a row already exists for this SKU + channel
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

  // ── Derived ───────────────────────────────────────────────────────────
  const selected = recipes.find((r) => r.id === selectedId);
  const selectedCogs = selected
    ? calcCogsTotal(selected, supplierProducts, localInputs, usdZar)
    : 0;
  const selectedPricing = pricing.filter(
    (p) => p.product_cogs_id === selectedId,
  );

  // All-SKUs summary table
  const summaryRows = recipes.map((r) => {
    const cogs = calcCogsTotal(r, supplierProducts, localInputs, usdZar);
    const rows = pricing.filter((p) => p.product_cogs_id === r.id);
    const channels = CHANNELS.map((ch) => {
      const p = rows.find((x) => x.channel === ch.id);
      const sell = p?.sell_price_zar ? parseFloat(p.sell_price_zar) : null;
      const margin = sell ? calcMargin(sell, cogs) : null;
      return { id: ch.id, sell, margin };
    });
    return { id: r.id, name: r.product_name, sku: r.sku, cogs, channels };
  });

  // ── Styles ───────────────────────────────────────────────────────────
  const card = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #f0ede8",
    padding: 24,
    marginBottom: 20,
  };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
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
          {/* ── All-SKUs Summary Table ─────────────────────────────── */}
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
                      onClick={() => setSelectedId(row.id)}
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
                            setSelectedId(row.id);
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

          {/* ── Selected SKU Detail ────────────────────────────────── */}
          {selected && (
            <div>
              {/* SKU header */}
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

              {/* FX Sensitivity Panel */}
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
                    How your margin changes if USD/ZAR moves by ±R2 from current
                    rate. Using highest sell price set across channels.
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
