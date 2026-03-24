// src/components/hq/HQRecipeEngine.js
// WP-FNB S2 — Recipe Intelligence Engine — v1.0
// Built: March 25, 2026
// Rules: RULE 0F (tenant_id), RULE 0G (useTenant inside),
//        WorkflowGuide first, InfoTooltip on key fields,
//        LL-087: declare booleans before use

import React, { useState, useEffect, useCallback, useMemo } from "react";
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

// ─── Constants ────────────────────────────────────────────────────────────────
const RECIPE_CATEGORIES = [
  "Beverage",
  "Bakery",
  "Sauce & Condiment",
  "Snack",
  "Meal",
  "Dessert",
  "Breakfast",
  "Preserve & Pickle",
  "Spice Blend",
  "Other",
];
const ALLERGENS = [
  { key: "gluten", label: "Gluten", icon: "🌾" },
  { key: "crustaceans", label: "Shellfish", icon: "🦐" },
  { key: "eggs", label: "Eggs", icon: "🥚" },
  { key: "fish", label: "Fish", icon: "🐟" },
  { key: "peanuts", label: "Peanuts", icon: "🥜" },
  { key: "soybeans", label: "Soy", icon: "🫘" },
  { key: "milk", label: "Dairy", icon: "🥛" },
  { key: "nuts", label: "Tree Nuts", icon: "🌰" },
  { key: "celery", label: "Celery", icon: "🥬" },
  { key: "mustard", label: "Mustard", icon: "🌱" },
  { key: "sesame", label: "Sesame", icon: "⚪" },
  { key: "sulphites", label: "Sulphites", icon: "🧪" },
  { key: "lupin", label: "Lupin", icon: "🌼" },
  { key: "molluscs", label: "Molluscs", icon: "🐚" },
];
const UNITS = [
  "g",
  "kg",
  "ml",
  "L",
  "pcs",
  "tsp",
  "tbsp",
  "cup",
  "por",
  "tray",
];
const TEMP_OPTIONS = [
  { value: "ambient", label: "☀️ Ambient" },
  { value: "refrigerated", label: "❄️ Refrigerated (2–8°C)" },
  { value: "frozen", label: "🧊 Frozen (-18°C)" },
];
const STATUS_COLORS = {
  draft: { bg: C.blueBg, color: C.blue, label: "Draft" },
  approved: { bg: C.accentBg, color: C.accent, label: "Approved" },
  archived: { bg: "#F3F4F6", color: "#6B7280", label: "Archived" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCost(n) {
  return "R" + (n || 0).toFixed(2);
}

function computeAllergens(lines, ingredients) {
  const flags = {};
  for (const line of lines) {
    const ing = ingredients.find((i) => i.id === line.ingredient_id);
    if (!ing?.allergen_flags) continue;
    for (const [k, v] of Object.entries(ing.allergen_flags)) {
      if (v) flags[k] = true;
    }
  }
  return flags;
}

function computeNutritionPerServe(lines, ingredients, yieldQty) {
  if (!yieldQty || yieldQty <= 0) return {};
  const totals = {};
  const KEYS = [
    "energy_kj",
    "energy_kcal",
    "protein_g",
    "fat_total_g",
    "fat_saturated_g",
    "fat_trans_g",
    "carbohydrate_g",
    "sugars_g",
    "dietary_fibre_g",
    "sodium_mg",
  ];

  for (const line of lines) {
    const ing = ingredients.find((i) => i.id === line.ingredient_id);
    if (!ing?.nutrition_per_100g) continue;
    const qty100g = toGrams(line.quantity, line.unit) / 100;
    if (isNaN(qty100g) || qty100g <= 0) continue;
    for (const k of KEYS) {
      const v = ing.nutrition_per_100g[k];
      if (v != null) totals[k] = (totals[k] || 0) + v * qty100g;
    }
  }
  // Divide by yield to get per-serve
  const perServe = {};
  for (const [k, v] of Object.entries(totals)) {
    perServe[k] = v / yieldQty;
  }
  return perServe;
}

function toGrams(qty, unit) {
  const conversions = {
    g: 1,
    kg: 1000,
    ml: 1,
    L: 1000,
    tsp: 4.2,
    tbsp: 12.6,
    cup: 240,
  };
  return qty * (conversions[unit] || 1);
}

function computeCostPerUnit(lines, ingredients, yieldQty) {
  if (!yieldQty || yieldQty <= 0) return 0;
  let total = 0;
  for (const line of lines) {
    const ing = ingredients.find((i) => i.id === line.ingredient_id);
    const avco = ing?.weighted_avg_cost || 0;
    total += line.quantity * avco;
  }
  return total / yieldQty;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        borderRadius: 4,
        padding: "2px 9px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}

function AllergenRow({ flags }) {
  const present = ALLERGENS.filter((a) => flags?.[a.key]);
  if (!present.length)
    return <span style={{ fontSize: 11, color: C.inkLight }}>None</span>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {present.map((a) => (
        <span
          key={a.key}
          style={{
            background: C.amberBg,
            color: C.amber,
            border: "1px solid #FDE68A",
            borderRadius: 4,
            padding: "2px 7px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {a.icon} {a.label}
        </span>
      ))}
    </div>
  );
}

function NutritionTable({ n, serveLabel }) {
  if (!n || !Object.keys(n).length)
    return (
      <div style={{ color: C.inkLight, fontSize: 13 }}>
        Add ingredients with nutritional data to see values.
      </div>
    );
  const rows = [
    [
      "Energy",
      n.energy_kj?.toFixed(0),
      "kJ",
      n.energy_kcal?.toFixed(0),
      "kcal",
    ],
    ["Protein", n.protein_g?.toFixed(1), "g"],
    ["Total Fat", n.fat_total_g?.toFixed(1), "g"],
    ["  – Saturated", n.fat_saturated_g?.toFixed(1), "g"],
    ["  – Trans", n.fat_trans_g?.toFixed(1), "g"],
    ["Carbohydrates", n.carbohydrate_g?.toFixed(1), "g"],
    ["  – Sugars", n.sugars_g?.toFixed(1), "g"],
    ["Dietary Fibre", n.dietary_fibre_g?.toFixed(1), "g"],
    ["Sodium", n.sodium_mg?.toFixed(0), "mg"],
  ];
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: C.ink,
          color: "#fff",
          padding: "8px 14px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}
      >
        <span>NUTRITIONAL INFORMATION</span>
        <span>Per {serveLabel || "serve"}</span>
      </div>
      {rows.map(([label, val, unit, val2, unit2]) =>
        val == null ? null : (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: `${label.startsWith("  ") ? 4 : 8}px 14px`,
              borderTop: `1px solid ${C.border}`,
              background: label.startsWith("  ") ? "#FAFAFA" : C.surface,
              fontSize: label.startsWith("  ") ? 11 : 13,
            }}
          >
            <span
              style={{
                color: label.startsWith("  ") ? C.inkLight : C.ink,
                fontWeight: label.startsWith("  ") ? 400 : 500,
              }}
            >
              {label.trim()}
            </span>
            <span style={{ fontWeight: 700, color: C.accent }}>
              {val}
              {unit}
              {val2 != null && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: C.inkLight,
                    marginLeft: 6,
                  }}
                >
                  / {val2}
                  {unit2}
                </span>
              )}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

// ─── Recipe Form (shared for new + edit) ─────────────────────────────────────
function RecipeForm({ initial, ingredients, onSave, onCancel, saving }) {
  const emptyLine = {
    ingredient_id: "",
    name: "",
    quantity: "",
    unit: "g",
    notes: "",
    is_optional: false,
  };

  const [form, setForm] = useState(
    () =>
      initial || {
        name: "",
        category: "Beverage",
        status: "draft",
        description: "",
        yield_quantity: 1,
        yield_unit: "units",
        yield_size_value: "",
        yield_size_unit: "ml",
        prep_time_min: "",
        production_time_min: "",
        shelf_life_days: "",
        storage_instructions: "",
        temperature_zone: "ambient",
        haccp_notes: "",
        version: "v1.0",
      },
  );
  const [lines, setLines] = useState(initial?.lines || []);
  const [ingSearch, setIngSearch] = useState("");
  const [changeNotes, setChangeNotes] = useState("");

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-compute allergens + nutrition from BOM
  const computedAllergens = useMemo(
    () => computeAllergens(lines, ingredients),
    [lines, ingredients],
  );
  const computedNutrition = useMemo(
    () =>
      computeNutritionPerServe(
        lines,
        ingredients,
        parseFloat(form.yield_quantity) || 1,
      ),
    [lines, ingredients, form.yield_quantity],
  );
  const computedCost = useMemo(
    () =>
      computeCostPerUnit(
        lines,
        ingredients,
        parseFloat(form.yield_quantity) || 1,
      ),
    [lines, ingredients, form.yield_quantity],
  );

  const filteredIngredients = useMemo(() => {
    const q = ingSearch.toLowerCase();
    return ingredients
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          (i.common_name || "").toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [ingredients, ingSearch]);

  function addLine() {
    setLines((l) => [...l, { ...emptyLine, _key: Date.now() }]);
  }

  function updateLine(idx, k, v) {
    setLines((l) =>
      l.map((line, i) => {
        if (i !== idx) return line;
        const updated = { ...line, [k]: v };
        // Auto-fill name + unit when ingredient selected
        if (k === "ingredient_id") {
          const ing = ingredients.find((x) => x.id === v);
          if (ing) {
            updated.name = ing.name;
            updated.unit = ing.default_unit || "g";
          }
        }
        return updated;
      }),
    );
  }

  function removeLine(idx) {
    setLines((l) => l.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      allergen_flags: computedAllergens,
      nutrition_per_serve: computedNutrition,
      cost_per_unit: computedCost,
      lines,
      changeNotes,
    });
  }

  const sLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: C.inkLight,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };
  const sInput = {
    width: "100%",
    padding: "8px 11px",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    background: C.surface,
    boxSizing: "border-box",
    color: C.ink,
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 28,
        }}
      >
        {/* ── Header info ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <label style={sLabel}>Recipe Name *</label>
            <input
              value={form.name}
              onChange={(e) => setF("name", e.target.value)}
              placeholder="e.g. Classic Cold Brew Coffee"
              style={sInput}
            />
          </div>
          <div>
            <label style={sLabel}>Version</label>
            <input
              value={form.version}
              onChange={(e) => setF("version", e.target.value)}
              placeholder="v1.0"
              style={sInput}
            />
          </div>
          <div>
            <label style={sLabel}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setF("category", e.target.value)}
              style={sInput}
            >
              {RECIPE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={sLabel}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setF("status", e.target.value)}
              style={sInput}
            >
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={sLabel}>Description</label>
          <textarea
            value={form.description || ""}
            onChange={(e) => setF("description", e.target.value)}
            placeholder="Brief description of this recipe..."
            rows={2}
            style={{ ...sInput, resize: "vertical" }}
          />
        </div>

        {/* ── Yield ── */}
        <div
          style={{
            background: C.accentBg,
            border: `1px solid ${C.accent}20`,
            borderRadius: 8,
            padding: "16px 18px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.accent,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            📦 Batch Yield
            <InfoTooltip
              title="Batch Yield"
              body="How many units this recipe produces. Used to calculate cost per unit and nutrition per serve."
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            <div>
              <label style={sLabel}>Units to Produce</label>
              <input
                type="number"
                value={form.yield_quantity}
                onChange={(e) => setF("yield_quantity", e.target.value)}
                placeholder="e.g. 500"
                style={sInput}
              />
            </div>
            <div>
              <label style={sLabel}>Unit Type</label>
              <input
                value={form.yield_unit}
                onChange={(e) => setF("yield_unit", e.target.value)}
                placeholder="bottles, pcs, portions…"
                style={sInput}
              />
            </div>
            <div>
              <label style={sLabel}>Serve Size</label>
              <input
                type="number"
                value={form.yield_size_value || ""}
                onChange={(e) => setF("yield_size_value", e.target.value)}
                placeholder="e.g. 330"
                style={sInput}
              />
            </div>
            <div>
              <label style={sLabel}>Serve Unit</label>
              <select
                value={form.yield_size_unit || "ml"}
                onChange={(e) => setF("yield_size_unit", e.target.value)}
                style={sInput}
              >
                {["ml", "L", "g", "kg", "pcs"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Ingredient BOM ── */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
              🧪 Ingredient BOM
              <InfoTooltip
                title="Bill of Materials"
                body="Add every ingredient used in this recipe. Allergens auto-propagate from the ingredient library. Nutritional profile per serve is computed automatically."
              />
            </div>
            <button
              onClick={addLine}
              style={{
                padding: "6px 14px",
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              + Add Ingredient
            </button>
          </div>

          {/* Ingredient search */}
          <input
            value={ingSearch}
            onChange={(e) => setIngSearch(e.target.value)}
            placeholder="Search ingredient library to auto-fill…"
            style={{ ...sInput, marginBottom: 10, fontSize: 12 }}
          />

          {lines.length === 0 ? (
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "24px",
                textAlign: "center",
                color: C.inkLight,
                fontSize: 13,
              }}
            >
              No ingredients yet. Click "+ Add Ingredient" to start building the
              BOM.
            </div>
          ) : (
            <div
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {[
                      "#",
                      "Ingredient",
                      "Qty",
                      "Unit",
                      "Notes",
                      "Optional",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontSize: 10,
                          color: C.inkLight,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr
                      key={line._key || idx}
                      style={{
                        borderTop: `1px solid ${C.border}`,
                        background: idx % 2 === 0 ? C.surface : "#FCFCFB",
                      }}
                    >
                      <td
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          color: C.inkLight,
                          fontWeight: 700,
                          width: 30,
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td style={{ padding: "6px 8px", minWidth: 200 }}>
                        <select
                          value={line.ingredient_id || ""}
                          onChange={(e) =>
                            updateLine(idx, "ingredient_id", e.target.value)
                          }
                          style={{
                            ...sInput,
                            fontSize: 12,
                            padding: "5px 8px",
                          }}
                        >
                          <option value="">Select ingredient…</option>
                          {filteredIngredients.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px", width: 80 }}>
                        <input
                          type="number"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(
                              idx,
                              "quantity",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          style={{
                            ...sInput,
                            fontSize: 12,
                            padding: "5px 8px",
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px", width: 70 }}>
                        <select
                          value={line.unit}
                          onChange={(e) =>
                            updateLine(idx, "unit", e.target.value)
                          }
                          style={{
                            ...sInput,
                            fontSize: 12,
                            padding: "5px 8px",
                          }}
                        >
                          {UNITS.map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          value={line.notes || ""}
                          onChange={(e) =>
                            updateLine(idx, "notes", e.target.value)
                          }
                          placeholder="sifted, room temp…"
                          style={{
                            ...sInput,
                            fontSize: 11,
                            padding: "5px 8px",
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={line.is_optional}
                          onChange={(e) =>
                            updateLine(idx, "is_optional", e.target.checked)
                          }
                        />
                      </td>
                      <td style={{ padding: "6px 8px", width: 36 }}>
                        <button
                          onClick={() => removeLine(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: C.red,
                            cursor: "pointer",
                            fontSize: 17,
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* BOM cost summary */}
              <div
                style={{
                  padding: "8px 14px",
                  background: C.bg,
                  borderTop: `1px solid ${C.border}`,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 24,
                  fontSize: 12,
                }}
              >
                <span style={{ color: C.inkLight }}>
                  {lines.filter((l) => l.ingredient_id).length} ingredients
                </span>
                <span style={{ fontWeight: 700, color: C.accent }}>
                  Cost/unit: {fmtCost(computedCost)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Auto-computed allergens ── */}
        {lines.length > 0 && (
          <div
            style={{
              background:
                Object.keys(computedAllergens).length > 0
                  ? C.amberBg
                  : C.accentBg,
              border: `1px solid ${Object.keys(computedAllergens).length > 0 ? "#FDE68A" : C.accent + "30"}`,
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 8,
                color:
                  Object.keys(computedAllergens).length > 0
                    ? C.amber
                    : C.accent,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              ⚡ Auto-Computed Allergens (from ingredient library)
            </div>
            <AllergenRow flags={computedAllergens} />
            {Object.keys(computedAllergens).length === 0 && (
              <span style={{ fontSize: 12, color: C.accent }}>
                ✅ No allergens detected in current BOM
              </span>
            )}
          </div>
        )}

        {/* ── Storage & time ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <label style={sLabel}>Prep Time (min)</label>
            <input
              type="number"
              value={form.prep_time_min || ""}
              onChange={(e) => setF("prep_time_min", e.target.value)}
              style={sInput}
            />
          </div>
          <div>
            <label style={sLabel}>Production Time (min)</label>
            <input
              type="number"
              value={form.production_time_min || ""}
              onChange={(e) => setF("production_time_min", e.target.value)}
              style={sInput}
            />
          </div>
          <div>
            <label style={sLabel}>Shelf Life (days)</label>
            <input
              type="number"
              value={form.shelf_life_days || ""}
              onChange={(e) => setF("shelf_life_days", e.target.value)}
              style={sInput}
            />
          </div>
          <div>
            <label style={sLabel}>Temperature Zone</label>
            <select
              value={form.temperature_zone}
              onChange={(e) => setF("temperature_zone", e.target.value)}
              style={sInput}
            >
              {TEMP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <label style={sLabel}>Storage Instructions</label>
            <textarea
              value={form.storage_instructions || ""}
              onChange={(e) => setF("storage_instructions", e.target.value)}
              placeholder="e.g. Keep refrigerated. Consume within 3 days of production."
              rows={2}
              style={{ ...sInput, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={sLabel}>HACCP Notes</label>
            <textarea
              value={form.haccp_notes || ""}
              onChange={(e) => setF("haccp_notes", e.target.value)}
              placeholder="e.g. CCP1: Pasteurise at ≥72°C for ≥15s. CCP2: Chill to ≤4°C within 90min."
              rows={2}
              style={{ ...sInput, resize: "vertical" }}
            />
          </div>
        </div>

        {initial && (
          <div style={{ marginBottom: 20 }}>
            <label style={sLabel}>Change Notes (for version history)</label>
            <input
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="e.g. Reduced sugar by 10%, added vanilla extract"
              style={sInput}
            />
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 14,
              color: C.inkMid,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            style={{
              padding: "10px 24px",
              background: !saving && form.name.trim() ? C.accent : "#D1D5DB",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: "inherit",
            }}
          >
            {saving ? "Saving…" : initial ? "Save Recipe" : "Create Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function HQRecipeEngine() {
  const { tenantId } = useTenant(); // RULE 0G — inside component

  const [activeTab, setActiveTab] = useState("recipes");
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [viewingVersions, setViewingVersions] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [recipeRes, ingRes] = await Promise.all([
        supabase
          .from("food_recipes")
          .select("*, food_recipe_lines(*)")
          .eq("tenant_id", tenantId) // RULE 0F
          .order("updated_at", { ascending: false }),
        supabase
          .from("food_ingredients")
          .select(
            "id, name, common_name, default_unit, allergen_flags, nutrition_per_100g, weighted_avg_cost, category",
          )
          .or(`is_seeded.eq.true,tenant_id.eq.${tenantId}`)
          .order("name"),
      ]);
      if (recipeRes.error) throw recipeRes.error;
      if (ingRes.error) throw ingRes.error;
      setRecipes(recipeRes.data || []);
      setIngredients(ingRes.data || []);
    } catch (err) {
      showToast("Failed to load recipes: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Save recipe ──────────────────────────────────────────────────────────
  async function handleSave({ lines, changeNotes, ...recipeData }) {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data?.user;
      const isEdit = !!editingRecipe?.id;

      const payload = {
        ...recipeData,
        tenant_id: tenantId, // RULE 0F
        updated_at: new Date().toISOString(),
      };

      let recipeId;
      if (isEdit) {
        const { error } = await supabase
          .from("food_recipes")
          .update(payload)
          .eq("id", editingRecipe.id);
        if (error) throw error;
        recipeId = editingRecipe.id;
      } else {
        const { data, error } = await supabase
          .from("food_recipes")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("id")
          .single();
        if (error) throw error;
        recipeId = data.id;
      }

      // Replace BOM lines
      if (isEdit) {
        await supabase
          .from("food_recipe_lines")
          .delete()
          .eq("recipe_id", recipeId);
      }
      const validLines = lines.filter((l) => l.ingredient_id && l.quantity > 0);
      if (validLines.length > 0) {
        const { error } = await supabase.from("food_recipe_lines").insert(
          validLines.map((l, idx) => ({
            recipe_id: recipeId,
            ingredient_id: l.ingredient_id,
            name: l.name,
            quantity: l.quantity,
            unit: l.unit,
            notes: l.notes || null,
            is_optional: l.is_optional || false,
            step_number: idx + 1,
          })),
        );
        if (error) throw error;
      }

      // Save version snapshot
      const snapshot = { ...payload, lines: validLines };
      await supabase.from("food_recipe_versions").insert({
        recipe_id: recipeId,
        version: recipeData.version,
        snapshot: snapshot,
        change_notes: changeNotes || null,
        created_by: user?.id || null,
      });

      showToast(isEdit ? "Recipe updated ✅" : "Recipe created ✅");
      setEditingRecipe(null);
      setActiveTab("recipes");
      fetchAll();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Load versions ────────────────────────────────────────────────────────
  async function loadVersions(recipeId) {
    const { data } = await supabase
      .from("food_recipe_versions")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: false });
    setViewingVersions(data || []);
  }

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(
    () => ({
      total: recipes.length,
      approved: recipes.filter((r) => r.status === "approved").length,
      draft: recipes.filter((r) => r.status === "draft").length,
      withCost: recipes.filter((r) => (r.cost_per_unit || 0) > 0).length,
    }),
    [recipes],
  );

  // ── Filtered recipes ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = recipes;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q),
      );
    }
    if (filterCat) list = list.filter((r) => r.category === filterCat);
    if (filterStatus) list = list.filter((r) => r.status === filterStatus);
    return list;
  }, [recipes, searchQ, filterCat, filterStatus]);

  const TABS = [
    { id: "recipes", label: `Recipes (${filtered.length})` },
    { id: "new", label: "+ New Recipe" },
    ...(viewingRecipe
      ? [{ id: "view", label: `📋 ${viewingRecipe.name.substring(0, 20)}…` }]
      : []),
    ...(editingRecipe ? [{ id: "edit", label: `✏️ Editing` }] : []),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: C.ink }}>
      {/* WorkflowGuide MUST be first */}
      <WorkflowGuide tabId="hq-recipes" />

      {/* Toast */}
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

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            margin: 0,
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-0.02em",
          }}
        >
          📖 Recipe Intelligence Engine
          <InfoTooltip
            title="Recipe Intelligence Engine"
            body="Version-controlled recipe management with auto-computed allergen declarations, DAFF nutritional profiling per serve, cost per unit from AVCO, and direct integration with the Ingredient Encyclopedia. Approved recipes can launch production runs directly."
          />
        </h2>
        <p style={{ margin: "4px 0 0", color: C.inkLight, fontSize: 14 }}>
          {kpis.total} recipes · {ingredients.length} ingredients available · SA
          R638 allergen auto-declaration
        </p>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}
      >
        {[
          {
            label: "Total Recipes",
            value: kpis.total,
            accent: C.accent,
            bg: C.accentBg,
          },
          {
            label: "Approved",
            value: kpis.approved,
            accent: C.accent,
            bg: C.accentBg,
          },
          { label: "Drafts", value: kpis.draft, accent: C.blue, bg: C.blueBg },
          {
            label: "With Cost Data",
            value: kpis.withCost,
            accent: "#7C3AED",
            bg: "#F5F3FF",
          },
          {
            label: "Ingredients Available",
            value: ingredients.length,
            accent: C.inkMid,
            bg: C.bg,
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: k.bg,
              border: `1px solid ${k.accent}20`,
              borderRadius: 10,
              padding: "16px 20px",
              flex: 1,
              minWidth: 130,
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: k.accent,
                letterSpacing: "-0.02em",
              }}
            >
              {k.value}
            </div>
            <div
              style={{
                fontSize: 12,
                color: k.accent,
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "9px 18px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? C.accent : C.inkLight,
              borderBottom:
                activeTab === tab.id
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: C.inkLight,
            fontSize: 14,
          }}
        >
          Loading recipes…
        </div>
      )}

      {/* ── RECIPES LIST ───────────────────────────────────────────────── */}
      {!loading && activeTab === "recipes" && (
        <div>
          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search recipes…"
              style={{
                flex: 2,
                minWidth: 200,
                padding: "9px 14px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 14,
                fontFamily: "inherit",
                background: C.surface,
              }}
            />
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              style={{
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: C.surface,
              }}
            >
              <option value="">All Categories</option>
              {RECIPE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: C.surface,
              }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}30`,
                borderRadius: 10,
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.accent,
                  marginBottom: 8,
                }}
              >
                No recipes yet
              </div>
              <div style={{ fontSize: 14, color: C.inkMid, marginBottom: 20 }}>
                Create your first recipe to start building your food & beverage
                portfolio.
              </div>
              <button
                onClick={() => setActiveTab("new")}
                style={{
                  padding: "10px 24px",
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                + Create First Recipe
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map((recipe) => {
                const lines = recipe.food_recipe_lines || [];
                const allergenList = ALLERGENS.filter(
                  (a) => recipe.allergen_flags?.[a.key],
                );
                return (
                  <div
                    key={recipe.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "18px 20px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setViewingRecipe(recipe);
                      loadVersions(recipe.id);
                      setActiveTab("view");
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 16 }}>
                            {recipe.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: C.inkLight,
                              background: C.bg,
                              border: `1px solid ${C.border}`,
                              borderRadius: 4,
                              padding: "1px 7px",
                            }}
                          >
                            {recipe.version}
                          </span>
                          <StatusBadge status={recipe.status} />
                        </div>
                        {recipe.description && (
                          <div
                            style={{
                              fontSize: 13,
                              color: C.inkMid,
                              marginBottom: 8,
                            }}
                          >
                            {recipe.description}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            fontSize: 12,
                            color: C.inkLight,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            📦 {recipe.yield_quantity} {recipe.yield_unit}
                          </span>
                          {recipe.yield_size_value && (
                            <span>
                              ⚖️ {recipe.yield_size_value}
                              {recipe.yield_size_unit}/serve
                            </span>
                          )}
                          <span>🧪 {lines.length} ingredients</span>
                          {recipe.shelf_life_days && (
                            <span>📅 {recipe.shelf_life_days}d shelf life</span>
                          )}
                          {recipe.cost_per_unit > 0 && (
                            <span style={{ color: C.accent, fontWeight: 700 }}>
                              💰 {fmtCost(recipe.cost_per_unit)}/unit
                            </span>
                          )}
                          <span>{recipe.category}</span>
                        </div>
                        {allergenList.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <AllergenRow flags={recipe.allergen_flags} />
                          </div>
                        )}
                      </div>
                      <div
                        style={{ display: "flex", gap: 8 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingRecipe({
                              ...recipe,
                              lines: recipe.food_recipe_lines || [],
                            });
                            setActiveTab("edit");
                          }}
                          style={{
                            padding: "7px 14px",
                            background: C.bg,
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            fontFamily: "inherit",
                            color: C.inkMid,
                            fontWeight: 600,
                          }}
                        >
                          ✏️ Edit
                        </button>
                        {recipe.status === "approved" && (
                          <button
                            onClick={() => {
                              sessionStorage.setItem(
                                "fnb_start_batch",
                                JSON.stringify({
                                  recipe_id: recipe.id,
                                  recipe_name: recipe.name,
                                  recipe_version: recipe.version,
                                  yield_quantity: recipe.yield_quantity,
                                  yield_unit: recipe.yield_unit,
                                  allergen_flags: recipe.allergen_flags,
                                  shelf_life_days: recipe.shelf_life_days,
                                  temperature_zone: recipe.temperature_zone,
                                  storage_instructions:
                                    recipe.storage_instructions,
                                }),
                              );
                              window.location.href = "/hq?tab=hq-production";
                            }}
                            style={{
                              padding: "7px 14px",
                              background: C.accent,
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: "inherit",
                              fontWeight: 700,
                            }}
                          >
                            ▶ Start Batch
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── NEW RECIPE TAB ─────────────────────────────────────────────── */}
      {!loading && activeTab === "new" && (
        <RecipeForm
          ingredients={ingredients}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setActiveTab("recipes")}
        />
      )}

      {/* ── EDIT TAB ───────────────────────────────────────────────────── */}
      {!loading && activeTab === "edit" && editingRecipe && (
        <RecipeForm
          initial={editingRecipe}
          ingredients={ingredients}
          saving={saving}
          onSave={handleSave}
          onCancel={() => {
            setEditingRecipe(null);
            setActiveTab("recipes");
          }}
        />
      )}

      {/* ── VIEW / DETAIL TAB ──────────────────────────────────────────── */}
      {!loading && activeTab === "view" && viewingRecipe && (
        <div style={{ maxWidth: 860 }}>
          {/* Header */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                    {viewingRecipe.name}
                  </h3>
                  <span
                    style={{
                      fontSize: 12,
                      color: C.inkLight,
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 4,
                      padding: "2px 8px",
                    }}
                  >
                    {viewingRecipe.version}
                  </span>
                  <StatusBadge status={viewingRecipe.status} />
                </div>
                {viewingRecipe.description && (
                  <div
                    style={{ fontSize: 14, color: C.inkMid, marginBottom: 8 }}
                  >
                    {viewingRecipe.description}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    fontSize: 13,
                    color: C.inkLight,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    📦 Yield: {viewingRecipe.yield_quantity}{" "}
                    {viewingRecipe.yield_unit}
                  </span>
                  {viewingRecipe.yield_size_value && (
                    <span>
                      ⚖️ {viewingRecipe.yield_size_value}
                      {viewingRecipe.yield_size_unit}/serve
                    </span>
                  )}
                  {viewingRecipe.shelf_life_days && (
                    <span>
                      📅 {viewingRecipe.shelf_life_days} days shelf life
                    </span>
                  )}
                  {viewingRecipe.cost_per_unit > 0 && (
                    <span style={{ color: C.accent, fontWeight: 700 }}>
                      💰 {fmtCost(viewingRecipe.cost_per_unit)}/unit
                    </span>
                  )}
                  <span>{viewingRecipe.category}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setEditingRecipe({
                      ...viewingRecipe,
                      lines: viewingRecipe.food_recipe_lines || [],
                    });
                    setActiveTab("edit");
                  }}
                  style={{
                    padding: "8px 16px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                    fontWeight: 600,
                  }}
                >
                  ✏️ Edit
                </button>
                {viewingRecipe.status === "approved" && (
                  <button
                    onClick={() => {
                      sessionStorage.setItem(
                        "fnb_start_batch",
                        JSON.stringify({
                          recipe_id: viewingRecipe.id,
                          recipe_name: viewingRecipe.name,
                          recipe_version: viewingRecipe.version,
                          yield_quantity: viewingRecipe.yield_quantity,
                          yield_unit: viewingRecipe.yield_unit,
                          allergen_flags: viewingRecipe.allergen_flags,
                          shelf_life_days: viewingRecipe.shelf_life_days,
                          temperature_zone: viewingRecipe.temperature_zone,
                          storage_instructions:
                            viewingRecipe.storage_instructions,
                        }),
                      );
                      window.location.href = "/hq?tab=hq-production";
                    }}
                    style={{
                      padding: "8px 16px",
                      background: C.accent,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "inherit",
                      fontWeight: 700,
                    }}
                  >
                    ▶ Start Batch
                  </button>
                )}
              </div>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {/* BOM */}
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
                🧪 Ingredient BOM
              </div>
              {(viewingRecipe.food_recipe_lines || []).length === 0 ? (
                <div style={{ color: C.inkLight, fontSize: 13 }}>
                  No ingredients on this recipe.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Ingredient", "Qty", "Unit", "Notes"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "6px 8px",
                            textAlign: "left",
                            fontSize: 10,
                            color: C.inkLight,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingRecipe.food_recipe_lines || []).map(
                      (line, idx) => (
                        <tr
                          key={line.id}
                          style={{
                            borderTop:
                              idx > 0 ? `1px solid ${C.border}` : "none",
                          }}
                        >
                          <td
                            style={{
                              padding: "8px",
                              fontSize: 13,
                              fontWeight: 500,
                            }}
                          >
                            {line.name}
                            {line.is_optional && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: C.inkLight,
                                  marginLeft: 6,
                                }}
                              >
                                (optional)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px", fontSize: 13 }}>
                            {line.quantity}
                          </td>
                          <td
                            style={{
                              padding: "8px",
                              fontSize: 12,
                              color: C.inkLight,
                            }}
                          >
                            {line.unit}
                          </td>
                          <td
                            style={{
                              padding: "8px",
                              fontSize: 11,
                              color: C.inkLight,
                            }}
                          >
                            {line.notes || "—"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Nutrition */}
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
                📊 Nutritional Profile
              </div>
              <NutritionTable
                n={viewingRecipe.nutrition_per_serve}
                serveLabel={
                  viewingRecipe.yield_size_value
                    ? `${viewingRecipe.yield_size_value}${viewingRecipe.yield_size_unit}`
                    : "1 serve"
                }
              />
            </div>

            {/* Allergens */}
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
                ⚠️ Allergen Declaration (R638)
              </div>
              <AllergenRow flags={viewingRecipe.allergen_flags} />
              <div style={{ marginTop: 14, fontSize: 11, color: C.inkLight }}>
                All 14 R638 allergens:
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginTop: 6,
                }}
              >
                {ALLERGENS.map((a) => (
                  <span
                    key={a.key}
                    style={{
                      background: viewingRecipe.allergen_flags?.[a.key]
                        ? C.amberBg
                        : C.bg,
                      color: viewingRecipe.allergen_flags?.[a.key]
                        ? C.amber
                        : C.inkLight,
                      border: `1px solid ${viewingRecipe.allergen_flags?.[a.key] ? "#FDE68A" : C.border}`,
                      borderRadius: 4,
                      padding: "2px 7px",
                      fontSize: 11,
                      fontWeight: viewingRecipe.allergen_flags?.[a.key]
                        ? 700
                        : 400,
                    }}
                  >
                    {a.icon} {a.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Storage */}
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
                📦 Storage & Compliance
              </div>
              {[
                ["Temperature", viewingRecipe.temperature_zone],
                [
                  "Shelf Life",
                  viewingRecipe.shelf_life_days
                    ? viewingRecipe.shelf_life_days + " days"
                    : "—",
                ],
                ["Storage", viewingRecipe.storage_instructions || "—"],
                ["HACCP Notes", viewingRecipe.haccp_notes || "—"],
                [
                  "Prep Time",
                  viewingRecipe.prep_time_min
                    ? viewingRecipe.prep_time_min + " min"
                    : "—",
                ],
                [
                  "Production Time",
                  viewingRecipe.production_time_min
                    ? viewingRecipe.production_time_min + " min"
                    : "—",
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: C.inkLight, fontWeight: 500 }}>
                    {k}
                  </span>
                  <span
                    style={{
                      color: C.ink,
                      maxWidth: "60%",
                      textAlign: "right",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Version history */}
          {viewingVersions.length > 0 && (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 20,
                marginTop: 16,
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
                🕐 Version History
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {["Version", "Date", "Change Notes"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontSize: 11,
                          color: C.inkLight,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewingVersions.map((v, idx) => (
                    <tr
                      key={v.id}
                      style={{
                        borderTop: `1px solid ${C.border}`,
                        background: idx === 0 ? C.accentBg : C.surface,
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 13,
                          fontWeight: 700,
                          color: idx === 0 ? C.accent : C.ink,
                        }}
                      >
                        {v.version}
                        {idx === 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              marginLeft: 6,
                              color: C.accent,
                            }}
                          >
                            CURRENT
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: C.inkLight,
                        }}
                      >
                        {new Date(v.created_at).toLocaleDateString("en-ZA", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: C.inkMid,
                        }}
                      >
                        {v.change_notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
