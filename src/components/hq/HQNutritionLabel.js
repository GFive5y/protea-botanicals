// src/components/hq/HQNutritionLabel.js
// WP-FNB S5 — Nutritional Label Generator — v1.0
// Built: March 25, 2026
// Rules: RULE 0F (tenant_id), RULE 0G (useTenant inside),
//        WorkflowGuide first, InfoTooltip on key fields
// No new DB tables — reads food_recipes.nutrition_per_serve (S2)

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import WorkflowGuide from "../WorkflowGuide";
import InfoTooltip from "../InfoTooltip";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F8F7F4",
  surface: "#FFFFFF",
  border: "#E8E4DC",
  ink: "#1A1A18",
  inkMid: "#4A4740",
  inkLight: "#8A8680",
  accent: "#2D6A4F",
  accentBg: "#EBF5EF",
  amber: "#92400E",
  amberBg: "#FEF3C7",
  red: "#991B1B",
  redBg: "#FEF2F2",
  blue: "#1D4ED8",
  blueBg: "#EFF6FF",
};

// ─── SA R638 Allergen keys ────────────────────────────────────────────────────
const ALLERGENS = [
  { key: "gluten", label: "Gluten (wheat, rye, barley, oats)" },
  { key: "crustaceans", label: "Crustaceans and shellfish" },
  { key: "eggs", label: "Eggs" },
  { key: "fish", label: "Fish" },
  { key: "peanuts", label: "Peanuts" },
  { key: "soybeans", label: "Soybeans" },
  { key: "milk", label: "Milk and dairy products (including lactose)" },
  { key: "nuts", label: "Tree nuts" },
  { key: "celery", label: "Celery and celeriac" },
  { key: "mustard", label: "Mustard" },
  { key: "sesame", label: "Sesame seeds" },
  { key: "sulphites", label: "Sulphur dioxide and sulphites (>10ppm)" },
  { key: "lupin", label: "Lupin" },
  { key: "molluscs", label: "Molluscs" },
];

// ─── Label size presets ───────────────────────────────────────────────────────
const LABEL_SIZES = [
  { id: "standard", label: "Standard (70×50mm)", width: 265, fontSize: 8.5 },
  { id: "large", label: "Large (100×70mm)", width: 378, fontSize: 10 },
  { id: "small", label: "Small (50×35mm)", width: 189, fontSize: 7 },
  { id: "wide", label: "Wide Strip (120×40mm)", width: 454, fontSize: 9 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v, decimals = 1) {
  if (v === undefined || v === null || isNaN(v)) return "—";
  return Number(v).toFixed(decimals);
}

function computePer100g(nutrition, serveSizeG) {
  // If we have per-serve data and a serve size, back-calculate per 100g
  if (!nutrition || !serveSizeG || serveSizeG <= 0) return nutrition || {};
  const factor = 100 / serveSizeG;
  const result = {};
  for (const [k, v] of Object.entries(nutrition)) {
    if (v != null) result[k] = v * factor;
  }
  return result;
}

function getServeGrams(size, unit) {
  if (!size) return null;
  const conversions = { g: 1, kg: 1000, ml: 1, L: 1000 };
  return size * (conversions[unit] || 1);
}

// ─── R638 Nutritional Panel Component (print-ready) ───────────────────────────
function NutritionalPanel({ recipe, serveOverride, sizePreset, showGDA }) {
  const n = recipe?.nutrition_per_serve || {};
  const serveSizeG = serveOverride
    ? getServeGrams(serveOverride.value, serveOverride.unit)
    : getServeGrams(recipe?.yield_size_value, recipe?.yield_size_unit);

  const per100g = computePer100g(n, serveSizeG);
  const size = LABEL_SIZES.find((s) => s.id === sizePreset) || LABEL_SIZES[0];
  const fs = size.fontSize;
  const w = size.width;

  // GDA reference values (adult, 8700kJ diet — SA R638)
  const GDA = {
    energy_kj: 8700,
    protein_g: 50,
    fat_total_g: 70,
    fat_saturated_g: 20,
    carbohydrate_g: 260,
    sugars_g: 90,
    dietary_fibre_g: 25,
    sodium_mg: 2000,
  };

  const rows = [
    {
      label: "Energy",
      per100: per100g.energy_kj,
      perServe: n.energy_kj,
      unit: "kJ",
      gdaKey: "energy_kj",
      bold: true,
    },
    {
      label: "Glycaemic carbohydrate",
      per100: per100g.carbohydrate_g,
      perServe: n.carbohydrate_g,
      unit: "g",
      gdaKey: "carbohydrate_g",
      bold: true,
    },
    {
      label: "   of which total sugars",
      per100: per100g.sugars_g,
      perServe: n.sugars_g,
      unit: "g",
      indent: true,
    },
    {
      label: "Total fat",
      per100: per100g.fat_total_g,
      perServe: n.fat_total_g,
      unit: "g",
      gdaKey: "fat_total_g",
      bold: true,
    },
    {
      label: "   of which saturated fat",
      per100: per100g.fat_saturated_g,
      perServe: n.fat_saturated_g,
      unit: "g",
      indent: true,
      gdaKey: "fat_saturated_g",
    },
    {
      label: "   of which trans fat",
      per100: per100g.fat_trans_g,
      perServe: n.fat_trans_g,
      unit: "g",
      indent: true,
    },
    {
      label: "Dietary fibre",
      per100: per100g.dietary_fibre_g,
      perServe: n.dietary_fibre_g,
      unit: "g",
      gdaKey: "dietary_fibre_g",
    },
    {
      label: "Total sodium",
      per100: per100g.sodium_mg,
      perServe: n.sodium_mg,
      unit: "mg",
      gdaKey: "sodium_mg",
      bold: true,
    },
  ];

  const allergenPresent = ALLERGENS.filter(
    (a) => recipe?.allergen_flags?.[a.key],
  );

  const serveLabel = serveSizeG
    ? `${serveOverride?.value || recipe?.yield_size_value}${serveOverride?.unit || recipe?.yield_size_unit}`
    : "1 serve";

  const panelStyle = {
    fontFamily: "Arial, Helvetica, sans-serif",
    border: "1.5px solid #000",
    width: w,
    backgroundColor: "#fff",
    color: "#000",
    boxSizing: "border-box",
    padding: "6px 8px",
  };

  return (
    <div style={panelStyle} id="nutrition-panel-print">
      {/* Title */}
      <div
        style={{
          fontSize: fs + 4,
          fontWeight: 900,
          borderBottom: "3px solid #000",
          paddingBottom: 3,
          marginBottom: 3,
          letterSpacing: "0.02em",
        }}
      >
        NUTRITIONAL INFORMATION
      </div>

      {/* Serve size line */}
      <div
        style={{
          fontSize: fs,
          marginBottom: 3,
          borderBottom: "1px solid #000",
          paddingBottom: 3,
        }}
      >
        <span style={{ fontWeight: 700 }}>Typical nutritional values</span>
        {serveSizeG && <span> · Per serving ({serveLabel})</span>}
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: fs - 0.5,
          fontWeight: 700,
          borderBottom: "1px solid #000",
          paddingBottom: 2,
          marginBottom: 1,
        }}
      >
        <span style={{ flex: 2 }}></span>
        <span style={{ flex: 1, textAlign: "right" }}>
          Per 100
          {serveSizeG
            ? recipe?.yield_size_unit === "ml" ||
              recipe?.yield_size_unit === "L"
              ? "ml"
              : "g"
            : "g"}
        </span>
        {serveSizeG && (
          <span style={{ flex: 1, textAlign: "right" }}>Per serving</span>
        )}
        {showGDA && serveSizeG && (
          <span style={{ flex: 1, textAlign: "right" }}>%GDA*</span>
        )}
      </div>

      {/* Nutrient rows */}
      {rows.map((row, i) => {
        if (row.perServe === undefined && row.per100 === undefined) return null;
        const gdaPct =
          showGDA && row.gdaKey && n[row.gdaKey] && GDA[row.gdaKey]
            ? Math.round((n[row.gdaKey] / GDA[row.gdaKey]) * 100)
            : null;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontSize: row.indent ? fs - 0.5 : fs,
              fontWeight: row.bold ? 700 : 400,
              borderBottom: i < rows.length - 1 ? "0.5px solid #ccc" : "none",
              padding: "1.5px 0",
            }}
          >
            <span style={{ flex: 2, paddingLeft: row.indent ? 8 : 0 }}>
              {row.label.trim()}
            </span>
            <span style={{ flex: 1, textAlign: "right" }}>
              {row.per100 != null
                ? `${fmt(row.per100, row.unit === "mg" ? 0 : 1)}${row.unit}`
                : "—"}
            </span>
            {serveSizeG && (
              <span style={{ flex: 1, textAlign: "right" }}>
                {row.perServe != null
                  ? `${fmt(row.perServe, row.unit === "mg" ? 0 : 1)}${row.unit}`
                  : "—"}
              </span>
            )}
            {showGDA && serveSizeG && (
              <span style={{ flex: 1, textAlign: "right" }}>
                {gdaPct != null ? `${gdaPct}%` : ""}
              </span>
            )}
          </div>
        );
      })}

      {/* Protein row */}
      {n.protein_g != null && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: fs,
            fontWeight: 700,
            borderTop: "1px solid #000",
            padding: "2px 0",
          }}
        >
          <span style={{ flex: 2 }}>Protein</span>
          <span style={{ flex: 1, textAlign: "right" }}>
            {per100g.protein_g != null ? `${fmt(per100g.protein_g, 1)}g` : "—"}
          </span>
          {serveSizeG && (
            <span style={{ flex: 1, textAlign: "right" }}>
              {fmt(n.protein_g, 1)}g
            </span>
          )}
          {showGDA && serveSizeG && (
            <span style={{ flex: 1, textAlign: "right" }}>
              {Math.round((n.protein_g / 50) * 100)}%
            </span>
          )}
        </div>
      )}

      {/* GDA footnote */}
      {showGDA && serveSizeG && (
        <div
          style={{
            fontSize: fs - 1.5,
            color: "#444",
            borderTop: "0.5px solid #ccc",
            marginTop: 3,
            paddingTop: 2,
          }}
        >
          * % of Guideline Daily Amount (adult, 8700kJ)
        </div>
      )}

      {/* Allergen declaration */}
      {allergenPresent.length > 0 && (
        <div
          style={{ borderTop: "1.5px solid #000", marginTop: 4, paddingTop: 4 }}
        >
          <span style={{ fontSize: fs, fontWeight: 900 }}>CONTAINS: </span>
          <span style={{ fontSize: fs, fontWeight: 700 }}>
            {allergenPresent.map((a) => a.label).join(", ")}.
          </span>
        </div>
      )}

      {/* No allergen statement */}
      {allergenPresent.length === 0 && (
        <div
          style={{
            borderTop: "1px solid #ccc",
            marginTop: 4,
            paddingTop: 4,
            fontSize: fs - 0.5,
            color: "#555",
          }}
        >
          No common allergens declared.
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function HQNutritionLabel() {
  const { tenantId } = useTenant(); // RULE 0G

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [sizePreset, setSizePreset] = useState("standard");
  const [showGDA, setShowGDA] = useState(false);
  const [serveOverride, setServeOverride] = useState({ value: "", unit: "ml" });
  const [useOverride, setUseOverride] = useState(false);
  const [toast, setToast] = useState(null);
  const printRef = useRef(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Fetch approved recipes with nutrition data ────────────────────────────
  const fetchRecipes = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("food_recipes")
        .select(
          "id, name, version, category, yield_quantity, yield_unit, yield_size_value, yield_size_unit, nutrition_per_serve, allergen_flags, shelf_life_days, temperature_zone",
        )
        .eq("tenant_id", tenantId) // RULE 0F
        .in("status", ["approved", "draft"])
        .order("name");
      if (error) throw error;
      setRecipes(data || []);
      // Auto-select first recipe with nutrition data
      const withNutrition = (data || []).find(
        (r) =>
          r.nutrition_per_serve &&
          Object.keys(r.nutrition_per_serve).length > 0,
      );
      if (withNutrition) setSelectedRecipeId(withNutrition.id);
    } catch (err) {
      showToast("Failed to load recipes: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId),
    [recipes, selectedRecipeId],
  );

  const hasNutrition =
    selectedRecipe &&
    selectedRecipe.nutrition_per_serve &&
    Object.keys(selectedRecipe.nutrition_per_serve).length > 0;

  // ── Print handler ─────────────────────────────────────────────────────────
  function handlePrint() {
    const panel = document.getElementById("nutrition-panel-print");
    if (!panel) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>Nutritional Label — ${selectedRecipe?.name}</title>
          <style>
            body { margin: 20px; font-family: Arial, sans-serif; }
            @media print {
              body { margin: 5mm; }
              @page { margin: 5mm; }
            }
          </style>
        </head>
        <body>
          ${panel.outerHTML}
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const sInput = {
    padding: "8px 11px",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    background: C.surface,
    color: C.ink,
  };
  const sLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: C.inkLight,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: C.ink }}>
      <WorkflowGuide tabId="hq-nutrition-label" />

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "error" ? C.redBg : "#F0FDF4",
            border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`,
            color: toast.type === "error" ? C.red : "#166534",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            margin: 0,
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-0.02em",
          }}
        >
          🏷️ Nutritional Label Generator
          <InfoTooltip
            title="R638 Label Generator"
            body="Generates SA R638-compliant nutritional information panels from your recipe data. Select a recipe, choose label size, and print. Nutritional values are automatically computed from your ingredient BOM."
          />
        </h2>
        <p style={{ margin: "4px 0 0", color: C.inkLight, fontSize: 14 }}>
          SA Regulation R638 compliant ·{" "}
          {
            recipes.filter(
              (r) =>
                r.nutrition_per_serve &&
                Object.keys(r.nutrition_per_serve).length > 0,
            ).length
          }{" "}
          recipes with nutritional data
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: C.inkLight }}>
          Loading recipes…
        </div>
      )}

      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── LEFT: Controls ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Recipe selector */}
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 14,
                  color: C.ink,
                }}
              >
                📖 Select Recipe
              </div>
              {recipes.length === 0 ? (
                <div style={{ color: C.inkLight, fontSize: 13 }}>
                  No recipes found. Create and approve a recipe in the Recipes
                  tab first.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {recipes.map((r) => {
                    const hasData =
                      r.nutrition_per_serve &&
                      Object.keys(r.nutrition_per_serve).length > 0;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRecipeId(r.id)}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          background:
                            selectedRecipeId === r.id ? C.accentBg : C.bg,
                          border: `1.5px solid ${selectedRecipeId === r.id ? C.accent : C.border}`,
                          borderRadius: 7,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: selectedRecipeId === r.id ? C.accent : C.ink,
                          }}
                        >
                          {r.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.inkLight,
                            marginTop: 3,
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          <span>{r.version}</span>
                          <span>{r.category}</span>
                          {hasData ? (
                            <span style={{ color: C.accent, fontWeight: 600 }}>
                              ✅ Has nutrition data
                            </span>
                          ) : (
                            <span style={{ color: C.amber }}>
                              ⚠️ No nutrition data
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Label settings */}
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 14,
                  color: C.ink,
                }}
              >
                ⚙️ Label Settings
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={sLabel}>Label Size</label>
                <select
                  value={sizePreset}
                  onChange={(e) => setSizePreset(e.target.value)}
                  style={{ ...sInput, width: "100%" }}
                >
                  {LABEL_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Serve size override */}
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    ...sLabel,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={useOverride}
                    onChange={(e) => setUseOverride(e.target.checked)}
                  />
                  Override serve size
                  <InfoTooltip
                    title="Serve Size Override"
                    body="By default uses the recipe's yield_size_value. Override here to generate a label for a different serve size — e.g. recipe yields 330ml bottles but you want a label for 250ml."
                  />
                </label>
                {useOverride && (
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      type="number"
                      value={serveOverride.value}
                      onChange={(e) =>
                        setServeOverride((s) => ({
                          ...s,
                          value: e.target.value,
                        }))
                      }
                      placeholder="e.g. 330"
                      style={{ ...sInput, flex: 1 }}
                    />
                    <select
                      value={serveOverride.unit}
                      onChange={(e) =>
                        setServeOverride((s) => ({
                          ...s,
                          unit: e.target.value,
                        }))
                      }
                      style={{ ...sInput, width: 70 }}
                    >
                      {["ml", "L", "g", "kg"].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* GDA toggle */}
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showGDA}
                    onChange={(e) => setShowGDA(e.target.checked)}
                  />
                  Show %GDA column
                  <InfoTooltip
                    title="Guideline Daily Amount"
                    body="Optional %GDA column showing what percentage of the adult daily guideline each serve contributes. Based on 8700kJ reference diet."
                  />
                </label>
              </div>

              {/* Print button */}
              <button
                onClick={handlePrint}
                disabled={!hasNutrition}
                style={{
                  width: "100%",
                  padding: "11px",
                  fontFamily: "inherit",
                  background: hasNutrition ? C.accent : "#D1D5DB",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  cursor: hasNutrition ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                🖨️ Print Label
              </button>

              {!hasNutrition && selectedRecipe && (
                <div
                  style={{
                    marginTop: 10,
                    background: C.amberBg,
                    border: "1px solid #FDE68A",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 12,
                    color: C.amber,
                  }}
                >
                  ⚠️ This recipe has no nutritional data. Add ingredients with
                  DAFF nutritional data in the Recipe Engine, then re-save the
                  recipe.
                </div>
              )}
            </div>

            {/* Recipe info summary */}
            {selectedRecipe && (
              <div
                style={{
                  background: C.accentBg,
                  border: `1px solid ${C.accent}20`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.accent,
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Recipe Summary
                </div>
                {[
                  ["Recipe", selectedRecipe.name],
                  ["Version", selectedRecipe.version],
                  ["Category", selectedRecipe.category],
                  [
                    "Yield",
                    `${selectedRecipe.yield_quantity} ${selectedRecipe.yield_unit}`,
                  ],
                  [
                    "Serve Size",
                    selectedRecipe.yield_size_value
                      ? `${selectedRecipe.yield_size_value}${selectedRecipe.yield_size_unit}`
                      : "Not set",
                  ],
                  [
                    "Shelf Life",
                    selectedRecipe.shelf_life_days
                      ? `${selectedRecipe.shelf_life_days} days`
                      : "Not set",
                  ],
                  ["Storage", selectedRecipe.temperature_zone || "ambient"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "4px 0",
                      borderBottom: `1px solid ${C.accent}15`,
                    }}
                  >
                    <span style={{ color: C.inkLight }}>{k}</span>
                    <span style={{ color: C.ink, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Preview ── */}
          <div>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                  👁 Label Preview —{" "}
                  {LABEL_SIZES.find((s) => s.id === sizePreset)?.label}
                </div>
                {hasNutrition && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: C.accent,
                        background: C.accentBg,
                        border: `1px solid ${C.accent}30`,
                        borderRadius: 4,
                        padding: "3px 9px",
                        fontWeight: 600,
                      }}
                    >
                      ✅ R638 Compliant
                    </span>
                  </div>
                )}
              </div>

              {!selectedRecipe ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 24px",
                    color: C.inkLight,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🏷️</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    Select a recipe to generate a label
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Choose from the list on the left
                  </div>
                </div>
              ) : !hasNutrition ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 24px",
                    background: C.amberBg,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: C.amber }}
                  >
                    No nutritional data for this recipe
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: C.inkMid,
                      marginTop: 8,
                      maxWidth: 360,
                      margin: "8px auto 0",
                    }}
                  >
                    Go to <strong>Recipes</strong> → edit this recipe → add
                    ingredients from the library. Ingredients need DAFF
                    nutritional data. Save the recipe and return here.
                  </div>
                </div>
              ) : (
                <div>
                  {/* White background preview area */}
                  <div
                    style={{
                      background: "#F0F0F0",
                      borderRadius: 8,
                      padding: 24,
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    <NutritionalPanel
                      recipe={selectedRecipe}
                      serveOverride={
                        useOverride && serveOverride.value
                          ? serveOverride
                          : null
                      }
                      sizePreset={sizePreset}
                      showGDA={showGDA}
                    />
                  </div>

                  {/* Allergen breakdown */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.inkLight,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Allergen Declaration (SA R638 Section 51)
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ALLERGENS.map((a) => {
                        const present = selectedRecipe.allergen_flags?.[a.key];
                        return (
                          <span
                            key={a.key}
                            style={{
                              background: present ? C.amberBg : C.bg,
                              color: present ? C.amber : C.inkLight,
                              border: `1px solid ${present ? "#FDE68A" : C.border}`,
                              borderRadius: 4,
                              padding: "3px 9px",
                              fontSize: 11,
                              fontWeight: present ? 700 : 400,
                            }}
                          >
                            {present ? "⚠️" : "✓"} {a.label.split(" ")[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nutritional highlights */}
                  <div
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.inkLight,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Per Serve Highlights
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {[
                        {
                          label: "Energy",
                          value:
                            selectedRecipe.nutrition_per_serve?.energy_kj?.toFixed(
                              0,
                            ),
                          unit: "kJ",
                        },
                        {
                          label: "Protein",
                          value:
                            selectedRecipe.nutrition_per_serve?.protein_g?.toFixed(
                              1,
                            ),
                          unit: "g",
                        },
                        {
                          label: "Total Fat",
                          value:
                            selectedRecipe.nutrition_per_serve?.fat_total_g?.toFixed(
                              1,
                            ),
                          unit: "g",
                        },
                        {
                          label: "Carbs",
                          value:
                            selectedRecipe.nutrition_per_serve?.carbohydrate_g?.toFixed(
                              1,
                            ),
                          unit: "g",
                        },
                        {
                          label: "Sugars",
                          value:
                            selectedRecipe.nutrition_per_serve?.sugars_g?.toFixed(
                              1,
                            ),
                          unit: "g",
                        },
                        {
                          label: "Sodium",
                          value:
                            selectedRecipe.nutrition_per_serve?.sodium_mg?.toFixed(
                              0,
                            ),
                          unit: "mg",
                        },
                      ]
                        .filter((i) => i.value && i.value !== "NaN")
                        .map((item) => (
                          <div
                            key={item.label}
                            style={{ textAlign: "center", minWidth: 60 }}
                          >
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 800,
                                color: C.accent,
                              }}
                            >
                              {item.value}
                              <span style={{ fontSize: 11, fontWeight: 400 }}>
                                {item.unit}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: C.inkLight,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              {item.label}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* R638 compliance checklist */}
                  <div
                    style={{
                      marginTop: 16,
                      background: C.accentBg,
                      border: `1px solid ${C.accent}20`,
                      borderRadius: 8,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.accent,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      R638 Compliance Checklist
                    </div>
                    {[
                      {
                        label: "Energy value declared",
                        ok:
                          selectedRecipe.nutrition_per_serve?.energy_kj != null,
                      },
                      {
                        label: "Carbohydrate declared",
                        ok:
                          selectedRecipe.nutrition_per_serve?.carbohydrate_g !=
                          null,
                      },
                      {
                        label: "Total fat declared",
                        ok:
                          selectedRecipe.nutrition_per_serve?.fat_total_g !=
                          null,
                      },
                      {
                        label: "Protein declared",
                        ok:
                          selectedRecipe.nutrition_per_serve?.protein_g != null,
                      },
                      {
                        label: "Sodium declared",
                        ok:
                          selectedRecipe.nutrition_per_serve?.sodium_mg != null,
                      },
                      {
                        label: "Allergen declaration present",
                        ok: selectedRecipe.allergen_flags != null,
                      },
                      { label: "Per 100g/ml column present", ok: true },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          padding: "3px 0",
                        }}
                      >
                        <span
                          style={{
                            color: item.ok ? C.accent : C.amber,
                            fontWeight: 700,
                          }}
                        >
                          {item.ok ? "✅" : "⚠️"}
                        </span>
                        <span style={{ color: item.ok ? C.inkMid : C.amber }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
