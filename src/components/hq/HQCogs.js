// src/components/hq/HQCogs.js v1.0 — WP-C: COGS Engine & Local Inputs
// Protea Botanicals · Phase 2 · March 2026
// New file — add to src/components/hq/
//
// COGS formula per finished unit:
//   Hardware:   hardware_qty × (unit_price_usd × usd_zar) + shipping_alloc_zar
//   Terpene:    terpene_qty_g × (unit_price_usd ÷ 50) × usd_zar   [50ml bottle]
//   Distillate: distillate_qty_ml × cost_zar
//   Packaging:  packaging_qty × cost_zar
//   Labour:     labour_qty × cost_zar
//   Other:      other_cost_zar
//   ─────────────────────────────────────────────────────────
//   TOTAL COGS = sum of all above

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── FX Rate Hook ─────────────────────────────────────────────────────────────
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

// ─── COGS Calculation ─────────────────────────────────────────────────────────
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

  // Terpenes: unit_price_usd is per 50ml bottle → cost per gram = price / 50
  const tpCostPerG = tp ? (parseFloat(tp.unit_price_usd) / 50) * usdZar : 0;
  const tpCost = tp ? parseFloat(recipe.terpene_qty_g || 0) * tpCostPerG : 0;

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

  const otherCost = parseFloat(recipe.other_cost_zar || 0);

  const total = hwCost + tpCost + diCost + pkCost + lbCost + otherCost;

  return {
    hardware: hwCost,
    terpene: tpCost,
    distillate: diCost,
    packaging: pkCost,
    labour: lbCost,
    other: otherCost,
    total,
    hwName: hw?.name || null,
    tpName: tp?.name || null,
    diName: di?.name || null,
    pkName: pk?.name || null,
    lbName: lb?.name || null,
    hasMissingCosts: (pk && !pk.cost_zar) || (lb && !lb.cost_zar),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtZar = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n, dp = 2) => (parseFloat(n) || 0).toFixed(dp);

const CATEGORY_COLOURS = {
  hardware: { bg: "#E3F2FD", color: "#1565C0" },
  terpene: { bg: "#F3E5F5", color: "#6A1B9A" },
  distillate: { bg: "#FFF8E1", color: "#F57F17" },
  packaging: { bg: "#E8F5E9", color: "#2E7D32" },
  labour: { bg: "#FCE4EC", color: "#880E4F" },
  other: { bg: "#ECEFF1", color: "#455A64" },
};

// ─── COGS Bar ─────────────────────────────────────────────────────────────────
function CogsBar({ breakdown }) {
  if (!breakdown || breakdown.total === 0) return null;
  const categories = [
    { key: "hardware", label: "Hardware" },
    { key: "terpene", label: "Terpene" },
    { key: "distillate", label: "Distillate" },
    { key: "packaging", label: "Packaging" },
    { key: "labour", label: "Labour" },
    { key: "other", label: "Other" },
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
          const pct = (breakdown[c.key] / breakdown.total) * 100;
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
          const pct = (breakdown[c.key] / breakdown.total) * 100;
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

// ─── BLANK RECIPE ─────────────────────────────────────────────────────────────
const blankRecipe = () => ({
  product_name: "",
  sku: "",
  hardware_item_id: "",
  hardware_qty: 1,
  shipping_alloc_zar: 0,
  terpene_item_id: "",
  terpene_qty_g: 0.1,
  distillate_input_id: "",
  distillate_qty_ml: 1,
  packaging_input_id: "",
  packaging_qty: 1,
  labour_input_id: "",
  labour_qty: 1,
  other_cost_zar: 0,
  notes: "",
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function HQCogs() {
  const { fxRate, fxLoading } = useFxRate();
  const usdZar = fxRate?.usd_zar || 18.5;

  // Data
  const [recipes, setRecipes] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [localInputs, setLocalInputs] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeSubTab, setActiveSubTab] = useState("costing");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null); // null = new
  const [form, setForm] = useState(blankRecipe());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Local inputs edit
  const [editingInput, setEditingInput] = useState(null);
  const [inputEditVal, setInputEditVal] = useState("");
  const [savingInput, setSavingInput] = useState(false);

  // ── Fetch all data ─────────────────────────────────────────────────────
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

  // ── Derived product lists ──────────────────────────────────────────────
  const hardwareItems = supplierProducts.filter(
    (p) => p.category === "hardware",
  );
  const terpeneItems = supplierProducts.filter((p) => p.category === "terpene");
  const distillateInputs = localInputs.filter(
    (i) => i.category === "distillate",
  );
  const packagingInputs = localInputs.filter((i) => i.category === "packaging");
  const labourInputs = localInputs.filter((i) => i.category === "labour");

  // ── Toast helper ──────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  // ── Open builder ──────────────────────────────────────────────────────
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
      hardware_item_id: recipe.hardware_item_id || "",
      hardware_qty: recipe.hardware_qty ?? 1,
      shipping_alloc_zar: recipe.shipping_alloc_zar ?? 0,
      terpene_item_id: recipe.terpene_item_id || "",
      terpene_qty_g: recipe.terpene_qty_g ?? 0.1,
      distillate_input_id: recipe.distillate_input_id || "",
      distillate_qty_ml: recipe.distillate_qty_ml ?? 1,
      packaging_input_id: recipe.packaging_input_id || "",
      packaging_qty: recipe.packaging_qty ?? 1,
      labour_input_id: recipe.labour_input_id || "",
      labour_qty: recipe.labour_qty ?? 1,
      other_cost_zar: recipe.other_cost_zar ?? 0,
      notes: recipe.notes || "",
    });
    setShowBuilder(true);
  };

  // ── Save recipe ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.product_name.trim()) return;
    setSaving(true);

    const payload = {
      product_name: form.product_name.trim(),
      sku: form.sku.trim() || null,
      hardware_item_id: form.hardware_item_id || null,
      hardware_qty: parseFloat(form.hardware_qty) || 1,
      terpene_item_id: form.terpene_item_id || null,
      terpene_qty_g: parseFloat(form.terpene_qty_g) || null,
      distillate_input_id: form.distillate_input_id || null,
      distillate_qty_ml: parseFloat(form.distillate_qty_ml) || null,
      packaging_input_id: form.packaging_input_id || null,
      packaging_qty: parseFloat(form.packaging_qty) || 1,
      labour_input_id: form.labour_input_id || null,
      labour_qty: parseFloat(form.labour_qty) || 1,
      other_cost_zar: parseFloat(form.other_cost_zar) || 0,
      notes: form.notes.trim() || null,
    };

    if (editingRecipe) {
      await supabase
        .from("product_cogs")
        .update(payload)
        .eq("id", editingRecipe.id);
      showToast(`✅ ${payload.product_name} updated`);
    } else {
      await supabase.from("product_cogs").insert(payload);
      showToast(`✅ ${payload.product_name} added to COGS registry`);
    }

    setSaving(false);
    setShowBuilder(false);
    fetchAll();
  };

  // ── Delete recipe ──────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await supabase
      .from("product_cogs")
      .update({ is_active: false })
      .eq("id", id);
    setDeleteConfirm(null);
    showToast("🗑 SKU removed from COGS registry");
    fetchAll();
  };

  // ── Save local input cost ──────────────────────────────────────────────
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

  // ── Live COGS preview for builder ──────────────────────────────────────
  const previewRecipe = {
    ...form,
    hardware_item_id: form.hardware_item_id || null,
    terpene_item_id: form.terpene_item_id || null,
    distillate_input_id: form.distillate_input_id || null,
    packaging_input_id: form.packaging_input_id || null,
    labour_input_id: form.labour_input_id || null,
  };
  const previewBreakdown = calcCogs(
    previewRecipe,
    supplierProducts,
    localInputs,
    usdZar,
  );

  // ── Styles ────────────────────────────────────────────────────────────
  const card = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #f0ede8",
    padding: 24,
    marginBottom: 20,
  };

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

  const inputStyle = {
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontFamily: "Jost, sans-serif",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };

  const label = (text) => (
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

  const selectStyle = { ...inputStyle, background: "#fff" };

  // ── Sub-tabs ───────────────────────────────────────────────────────────
  const SUB_TABS = [
    { id: "costing", label: "📊 SKU COGS Builder" },
    { id: "local-inputs", label: "🧪 Local Inputs" },
  ];

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
            Costing
          </h2>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: 14 }}>
            Cost-of-goods-sold per finished SKU · live ZAR calculations
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
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

      {/* ── SUB-TAB: LOCAL INPUTS ──────────────────────────────────────── */}
      {activeSubTab === "local-inputs" && (
        <div>
          <div style={{ ...card }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#2d4a2d" }}>
              Local Inputs
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>
              ZAR costs for locally-sourced inputs. Click a cost to edit it.
              Packaging and labour will be TBD until prices are confirmed.
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

          {/* Info box */}
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
            <strong>ℹ️ Note on terpene & hardware pricing:</strong> These are
            imported items priced in USD. Their ZAR cost is calculated live
            using the current USD/ZAR rate shown above. Terpenes are priced per
            50ml bottle — COGS uses cost-per-gram (price ÷ 50). To update
            imported item prices, go to{" "}
            <strong>HQ → Suppliers → Product Catalogue</strong>.
          </div>
        </div>
      )}

      {/* ── SUB-TAB: COGS BUILDER ─────────────────────────────────────── */}
      {activeSubTab === "costing" && (
        <div>
          {/* Missing costs warning */}
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
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              ⚠️{" "}
              <span>
                Some local input costs are still <strong>TBD</strong>{" "}
                (packaging, labour). COGS totals for affected SKUs will be
                incomplete until costs are set in <strong>Local Inputs</strong>{" "}
                tab.
              </span>
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
                Build a recipe for each finished product SKU to calculate its
                real cost in ZAR.
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
                    {/* Card header */}
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

                    {/* COGS total */}
                    <div
                      style={{
                        background: bd?.hasMissingCosts ? "#fff8e1" : "#f0f7f0",
                        border: `1px solid ${bd?.hasMissingCosts ? "#ffe082" : "#c8e6c9"}`,
                        borderRadius: 10,
                        padding: "14px 18px",
                        marginBottom: 14,
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
                          Total COGS per unit
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#2d4a2d",
                          }}
                        >
                          {bd ? fmtZar(bd.total) : "—"}
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

                    {/* Breakdown rows */}
                    {bd && (
                      <div style={{ fontSize: 13 }}>
                        {[
                          {
                            key: "hardware",
                            label: "Hardware",
                            name: bd.hwName,
                            val: bd.hardware,
                          },
                          {
                            key: "terpene",
                            label: "Terpene",
                            name: bd.tpName,
                            val: bd.terpene,
                          },
                          {
                            key: "distillate",
                            label: "Distillate",
                            name: bd.diName,
                            val: bd.distillate,
                          },
                          {
                            key: "packaging",
                            label: "Packaging",
                            name: bd.pkName,
                            val: bd.packaging,
                          },
                          {
                            key: "labour",
                            label: "Labour",
                            name: bd.lbName,
                            val: bd.labour,
                          },
                          {
                            key: "other",
                            label: "Other",
                            name: null,
                            val: bd.other,
                          },
                        ]
                          .filter((r) => r.val > 0 || r.name)
                          .map((row) => {
                            const col =
                              CATEGORY_COLOURS[row.key] ||
                              CATEGORY_COLOURS.other;
                            const pct =
                              bd.total > 0 ? (row.val / bd.total) * 100 : 0;
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
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  {row.val > 0 ? (
                                    <>
                                      <strong style={{ color: "#333" }}>
                                        {fmtZar(row.val)}
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

      {/* ══════════════════════════════════════════════════════════════════
          DELETE CONFIRM MODAL
      ══════════════════════════════════════════════════════════════════ */}
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
              The recipe will be deactivated. This won't affect historical data.
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
          COGS BUILDER SLIDE-IN PANEL
      ══════════════════════════════════════════════════════════════════ */}
      {showBuilder && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}
        >
          {/* Backdrop */}
          <div
            style={{ flex: 1, background: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowBuilder(false)}
          />

          {/* Panel */}
          <div
            style={{
              width: 680,
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
              {/* Live COGS preview */}
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
                      ["Other", previewBreakdown.other],
                    ]
                      .filter(([, v]) => v > 0)
                      .map(([lbl, val]) => (
                        <span key={lbl} style={{ color: "#555" }}>
                          {lbl}: <strong>{fmtZar(val)}</strong>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Product name & SKU */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div>
                  {label("Product Name *")}
                  <input
                    type="text"
                    placeholder="e.g. Postless Cart 1ml — Blue Zushi"
                    value={form.product_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, product_name: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  {label("SKU (optional)")}
                  <input
                    type="text"
                    placeholder="e.g. CART-1ML-BZ"
                    value={form.sku}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sku: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* ── HARDWARE */}
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
                    {label("Hardware Item")}
                    <select
                      value={form.hardware_item_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hardware_item_id: e.target.value,
                        }))
                      }
                      style={selectStyle}
                    >
                      <option value="">— None —</option>
                      {hardwareItems.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${fmt(p.unit_price_usd)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {label("Qty per unit")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.hardware_qty}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, hardware_qty: e.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    {label("Ship alloc ZAR")}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.shipping_alloc_zar}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          shipping_alloc_zar: e.target.value,
                        }))
                      }
                      style={inputStyle}
                      placeholder="0.00"
                      title="Shipping cost allocated per unit from your last PO"
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
                        × R{usdZar.toFixed(4)} + shipping)
                      </div>
                    );
                  })()}
              </div>

              {/* ── TERPENE */}
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
                    {label("Terpene Blend")}
                    <select
                      value={form.terpene_item_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          terpene_item_id: e.target.value,
                        }))
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
                    {label("Qty used (grams)")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.terpene_qty_g}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          terpene_qty_g: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>
                {form.terpene_item_id &&
                  (() => {
                    const tp = terpeneItems.find(
                      (p) => p.id === form.terpene_item_id,
                    );
                    if (!tp) return null;
                    const costPerG =
                      (parseFloat(tp.unit_price_usd) / 50) * usdZar;
                    const totalCost =
                      costPerG * parseFloat(form.terpene_qty_g || 0);
                    return (
                      <div
                        style={{ fontSize: 12, color: "#6A1B9A", marginTop: 8 }}
                      >
                        R{fmt(costPerG, 4)}/g × {form.terpene_qty_g}g ={" "}
                        {fmtZar(totalCost)} · (${fmt(tp.unit_price_usd)}/50ml ÷
                        50 × R{usdZar.toFixed(4)})
                      </div>
                    );
                  })()}
              </div>

              {/* ── DISTILLATE */}
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
                    {label("Distillate Input")}
                    <select
                      value={form.distillate_input_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          distillate_input_id: e.target.value,
                        }))
                      }
                      style={selectStyle}
                    >
                      <option value="">— None —</option>
                      {distillateInputs.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}{" "}
                          {i.cost_zar ? `(R${fmt(i.cost_zar)}/ml)` : "(TBD)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {label("Qty (ml)")}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.distillate_qty_ml}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          distillate_qty_ml: e.target.value,
                        }))
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
                        style={{ fontSize: 12, color: "#F57F17", marginTop: 8 }}
                      >
                        ={" "}
                        {fmtZar(
                          parseFloat(di.cost_zar) *
                            parseFloat(form.distillate_qty_ml || 0),
                        )}{" "}
                        (R{fmt(di.cost_zar)}/ml × {form.distillate_qty_ml}ml)
                      </div>
                    );
                  })()}
              </div>

              {/* ── PACKAGING */}
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
                    {label("Packaging Input")}
                    <select
                      value={form.packaging_input_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          packaging_input_id: e.target.value,
                        }))
                      }
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
                    {label("Qty per unit")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.packaging_qty}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          packaging_qty: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* ── LABOUR */}
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
                    {label("Labour Input")}
                    <select
                      value={form.labour_input_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          labour_input_id: e.target.value,
                        }))
                      }
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
                    {label("Units of labour")}
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={form.labour_qty}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, labour_qty: e.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* ── OTHER COSTS */}
              <div style={{ marginBottom: 20 }}>
                {label("Other one-off costs (ZAR) — optional")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.other_cost_zar}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, other_cost_zar: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="0.00"
                />
              </div>

              {/* ── NOTES */}
              <div style={{ marginBottom: 8 }}>
                {label("Notes (optional)")}
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
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
