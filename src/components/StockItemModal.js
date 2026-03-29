// src/components/StockItemModal.js v1.2 — WP-STOCK-UI Session A
// Surgical additions: brand, subcategory, variant_type, variant_value, tags
// All existing fields, logic, and sections PRESERVED exactly from v1.1
// New section: "Cannabis Catalogue" — shown for cannabis_retail profile only

import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";
import { showCannabisField } from "../constants/industryProfiles";

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
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.fontUi,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  color: T.ink900,
};
const sSelect = { ...sInput, cursor: "pointer" };
const sBtn = (v = "primary") => ({
  padding: "9px 18px",
  background:
    v === "primary" ? T.accent : v === "danger" ? T.danger : "transparent",
  color: ["primary", "danger"].includes(v) ? "#fff" : T.accentMid,
  border: ["primary", "danger"].includes(v)
    ? "none"
    : `1px solid ${T.accentBd}`,
  borderRadius: "4px",
  fontSize: "12px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.fontUi,
  transition: "opacity 0.15s",
});

// ── Constants ─────────────────────────────────────────────────────────────────

const MEDIUM_TYPES = [
  { value: "distillate", label: "Distillate" },
  { value: "live_resin", label: "Live Resin" },
  { value: "live_rosin", label: "Live Rosin" },
  { value: "co2_oil", label: "CO2 Oil" },
  { value: "concentrate", label: "Concentrate" },
  { value: "rosin", label: "Rosin" },
  { value: "bho", label: "BHO" },
  { value: "other", label: "Other" },
];

const ALLERGEN_FLAGS = [
  { key: "gluten", label: "Gluten" },
  { key: "crustaceans", label: "Crustaceans" },
  { key: "eggs", label: "Eggs" },
  { key: "fish", label: "Fish" },
  { key: "peanuts", label: "Peanuts" },
  { key: "soybeans", label: "Soybeans" },
  { key: "milk", label: "Milk / Dairy" },
  { key: "nuts", label: "Tree Nuts" },
  { key: "celery", label: "Celery" },
  { key: "mustard", label: "Mustard" },
  { key: "sesame", label: "Sesame" },
  { key: "sulphites", label: "Sulphites" },
  { key: "lupin", label: "Lupin" },
  { key: "molluscs", label: "Molluscs" },
];

const UNIT_OPTIONS = [
  "pcs",
  "ea",
  "ml",
  "L",
  "bottles",
  "g",
  "kg",
  "m",
  "set",
  "roll",
  "box",
  "por",
  "tray",
];

const CATEGORY_LABELS = {
  finished_product: "Finished Product",
  raw_material: "Raw Material",
  terpene: "Terpene",
  hardware: "Hardware",
  packaging: "Packaging",
  concentrate: "Concentrate",
  flower: "Flower",
  edible: "Edible",
  topical: "Topical",
  medical_consumable: "Medical Consumable",
  accessory: "Accessory",
  service: "Service",
  ingredient: "Ingredient",
  equipment: "Equipment",
  other: "Other",
};

// ── NEW: Subcategory options per DB category enum ─────────────────────────────
const SUBCATEGORY_BY_CATEGORY = {
  accessory: [
    { value: "rolling_papers", label: "Rolling Papers" },
    { value: "cones", label: "Cones" },
    { value: "tips", label: "Tips" },
    { value: "rolling_machine", label: "Rolling Machine" },
    { value: "tray", label: "Rolling Tray" },
    { value: "grinder", label: "Grinder" },
    { value: "pipe", label: "Pipe" },
    { value: "bong", label: "Bong / Water Pipe" },
    { value: "dab_rig", label: "Dab Rig" },
    { value: "dab_tool", label: "Dab Tool" },
    { value: "humidity_pack", label: "Humidity Pack" },
    { value: "storage", label: "Storage Jar" },
    { value: "lighter", label: "Lighter / Wick" },
    { value: "extraction_bag", label: "Extraction Bag" },
    { value: "rosin_bag", label: "Rosin Bag" },
    { value: "screens", label: "Screens" },
  ],
  flower: [{ value: "flower", label: "Flower" }],
  concentrate: [
    { value: "concentrate", label: "Concentrate (generic)" },
    { value: "budder", label: "Budder" },
    { value: "badder", label: "Badder" },
    { value: "live_resin", label: "Live Resin" },
    { value: "rosin", label: "Rosin (solventless)" },
    { value: "sauce", label: "Terp Sauce" },
    { value: "diamonds", label: "THCA Diamonds" },
    { value: "distillate", label: "Distillate" },
    { value: "crumble", label: "Crumble" },
    { value: "shatter", label: "Shatter" },
    { value: "wax", label: "Wax" },
    { value: "feco", label: "FECO" },
    { value: "rso", label: "RSO" },
    { value: "bho", label: "BHO" },
    // ── Hash & Kief (shared DB category: concentrate) ──
    { value: "hash", label: "Hash (generic)" },
    { value: "dry_sift", label: "Dry Sift Hash" },
    { value: "bubble_hash", label: "Bubble Hash (Ice Water)" },
    { value: "pressed_hash", label: "Pressed Hash" },
    { value: "charas", label: "Charas (Hand-rolled)" },
    { value: "temple_ball", label: "Temple Ball" },
    { value: "lebanese", label: "Lebanese Hash" },
    { value: "moroccan", label: "Moroccan Hash" },
    { value: "afghani", label: "Afghani Hash" },
    { value: "finger_hash", label: "Finger Hash" },
    { value: "kief", label: "Kief (raw)" },
    { value: "moon_rock", label: "Moon Rock" },
    { value: "dry_ice_hash", label: "Dry Ice Hash" },
  ],
  finished_product: [
    { value: "preroll", label: "Pre-Roll" },
    { value: "cartridge", label: "Vape Cartridge" },
    { value: "disposable", label: "Disposable Vape" },
    { value: "battery", label: "Vape Battery" },
    { value: "edible", label: "Edible" },
    { value: "tincture", label: "Tincture" },
    { value: "capsule", label: "Capsule" },
    { value: "mushroom", label: "Mushroom Supplement" },
    { value: "adaptogen", label: "Adaptogen" },
    { value: "cbd", label: "CBD Product" },
    { value: "cbd_pet", label: "CBD Pet Product" },
    { value: "clothing", label: "Clothing / Merch" },
    { value: "topical", label: "Topical" },
  ],
  raw_material: [
    { value: "seed", label: "Seed" },
    { value: "clone", label: "Clone" },
    { value: "seedling", label: "Seedling" },
    { value: "propagation", label: "Propagation Supply" },
    { value: "substrate", label: "Substrate / Coco" },
    { value: "soil", label: "Soil Mix" },
    { value: "rockwool", label: "Rockwool" },
    { value: "base_nutrient", label: "Base Nutrient" },
    { value: "bloom_booster", label: "Bloom Booster" },
    { value: "root_stimulant", label: "Root Stimulant" },
    { value: "enzyme", label: "Enzyme" },
    { value: "ph_management", label: "pH Management" },
    { value: "supplement", label: "Supplement / CalMag" },
    { value: "beneficial", label: "Beneficial Organism" },
  ],
  hardware: [
    { value: "grow_light", label: "Grow Light" },
    { value: "grow_tent", label: "Grow Tent" },
    { value: "fan", label: "Fan / Ventilation" },
    { value: "carbon_filter", label: "Carbon Filter" },
    { value: "meter", label: "Meter / Monitor" },
    { value: "timer", label: "Timer" },
    { value: "pot", label: "Pot / Container" },
    { value: "training", label: "Training / SCROG" },
    { value: "propagation", label: "Propagation Gear" },
  ],
  edible: [
    { value: "edible", label: "Edible" },
    { value: "tincture", label: "Tincture" },
    { value: "capsule", label: "Capsule" },
  ],
};

const VARIANT_TYPES = [
  { value: "", label: "— None —" },
  { value: "weight", label: "Weight" },
  { value: "size", label: "Size" },
  { value: "strain", label: "Strain" },
  { value: "count", label: "Count" },
  { value: "strength", label: "Strength" },
  { value: "colour", label: "Colour" },
];

// ── NEW: Tag library ──────────────────────────────────────────────────────────
const TAG_GROUPS = [
  {
    group: "Cultivation",
    tags: [
      "Indoor",
      "Outdoor",
      "Greenhouse",
      "Hydroponic",
      "Organic",
      "Living Soil",
      "Greendoor",
      "Sun-grown",
      "LED Grown",
      "HPS Grown",
    ],
  },
  {
    group: "Grade",
    tags: [
      "Budget",
      "Commercial",
      "A Grade",
      "AA Grade",
      "AAA Grade",
      "AAAA Grade",
      "Craft",
      "Top Shelf",
      "Exotic",
      "Premium",
    ],
  },
  {
    group: "Processing",
    tags: [
      "Hang-dried",
      "Freeze-dried",
      "Machine-trimmed",
      "Hand-trimmed",
      "Slow-cured",
      "Flash-frozen",
      "Fresh Frozen",
    ],
  },
  {
    group: "Concentrate Type",
    tags: [
      "BHO",
      "CO2",
      "Solventless",
      "Cold-press",
      "Live",
      "Cured",
      "Full-spectrum",
      "Broad-spectrum",
      "Single-source",
    ],
  },
  {
    group: "Effect",
    tags: [
      "Relaxing",
      "Uplifting",
      "Creative",
      "Sleepy",
      "Focused",
      "Energetic",
      "Pain-relief",
      "Appetite",
    ],
  },
];

// ── Layout helpers (identical to v1.1) ───────────────────────────────────────

function SectionHead({
  label,
  color = T.accentMid,
  bg = T.accentLit,
  border = T.accentBd,
}) {
  return (
    <div
      style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "4px",
        padding: "6px 12px",
        marginBottom: "14px",
        marginTop: "4px",
        fontFamily: T.fontUi,
      }}
    >
      {label}
    </div>
  );
}

function Lbl({ children, note, required }) {
  return (
    <label
      style={{
        fontSize: "11px",
        color: T.ink500,
        display: "block",
        marginBottom: "5px",
        fontFamily: T.fontUi,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
      {required && <span style={{ color: T.danger, marginLeft: 2 }}>*</span>}
      {note && (
        <span
          style={{
            color: T.accentMid,
            marginLeft: 6,
            fontSize: "9px",
            fontWeight: 400,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {note}
        </span>
      )}
    </label>
  );
}

function Field({ children, style }) {
  return <div style={{ marginBottom: "14px", ...style }}>{children}</div>;
}

function Grid2({ children }) {
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StockItemModal({
  item, // null = new, object = edit
  defaults = {},
  suppliers,
  visibleCategories,
  onSave,
  onCancel,
  saving,
}) {
  const { tenantId, industryProfile } = useTenant();
  const [productFormats, setProductFormats] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    supabase
      .from("product_formats")
      .select("id,label,format_key,is_vape,chambers")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setProductFormats(data || []));
  }, []);

  const isCannabis = [
    "cannabis_retail",
    "cannabis_dispensary",
    "mixed_retail",
  ].includes(industryProfile);
  const isFoodBev = industryProfile === "food_beverage";

  const parseAllergens = (flags) =>
    !flags || typeof flags !== "object" ? {} : flags;

  // ── Parse existing tags (stored as TEXT[] in DB) ──────────────────────────
  const parseTags = (t) => {
    if (!t) return [];
    if (Array.isArray(t)) return t;
    if (typeof t === "string") {
      try {
        return JSON.parse(t);
      } catch {
        return [];
      }
    }
    return [];
  };

  const [form, setForm] = useState({
    sku: item?.sku || "",
    name: item?.name || "",
    category:
      item?.category ||
      defaults.category ||
      (isFoodBev ? "raw_material" : "finished_product"),
    unit: item?.unit || "pcs",
    description: item?.description || "",
    quantity_on_hand: item?.quantity_on_hand ?? 0,
    reorder_level: item?.reorder_level ?? 0,
    max_stock_level: item?.max_stock_level ?? "",
    cost_price: item?.cost_price ?? 0,
    sell_price: item?.sell_price ?? 0,
    supplier_id: item?.supplier_id || "",
    expiry_date: item?.expiry_date || "",
    strain_id: item?.strain_id || "",
    medium_type: item?.medium_type || "",
    shelf_life_days: item?.shelf_life_days ?? "",
    ingredients_notes: item?.ingredients_notes || "",
    storage_instructions: item?.storage_instructions || "",
    allergen_flags: parseAllergens(item?.allergen_flags),
    temperature_zone: item?.temperature_zone || "",
    batch_lot_number: item?.batch_lot_number || "",
    country_of_origin: item?.country_of_origin || "",
    reorder_qty: item?.reorder_qty ?? "",
    compatible_formats: item?.compatible_formats || [],
    is_active: item?.is_active !== false,
    // ── NEW v1.2 fields ──
    brand: item?.brand || "",
    subcategory: item?.subcategory || defaults.subcategory || "",
    variant_type: item?.variant_type || "",
    variant_value: item?.variant_value || "",
    tags: parseTags(item?.tags),
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleAllergen = (key) =>
    setForm((p) => ({
      ...p,
      allergen_flags: { ...p.allergen_flags, [key]: !p.allergen_flags[key] },
    }));

  const toggleFormat = (fmtId) =>
    setForm((p) => {
      const cur = p.compatible_formats || [];
      return {
        ...p,
        compatible_formats: cur.includes(fmtId)
          ? cur.filter((id) => id !== fmtId)
          : [...cur, fmtId],
      };
    });

  // ── NEW: Toggle a tag ─────────────────────────────────────────────────────
  const toggleTag = (tag) =>
    setForm((p) => ({
      ...p,
      tags: p.tags.includes(tag)
        ? p.tags.filter((t) => t !== tag)
        : [...p.tags, tag],
    }));

  // ── Reset subcategory when category changes ───────────────────────────────
  const handleCategoryChange = (val) => {
    set("category", val);
    set("subcategory", ""); // reset subcategory so it doesn't mismatch
  };

  const cat = form.category;
  const isFinished = cat === "finished_product";
  const isRawMaterial = cat === "raw_material" || cat === "ingredient";
  const isTerpene = cat === "terpene";
  const isHardware = cat === "hardware";
  const isPackaging = cat === "packaging";
  const showCannabisFields = showCannabisField(industryProfile, isCannabis);
  const showFoodFields =
    isFoodBev || ["raw_material", "ingredient"].includes(cat);
  const willBeLive =
    isFinished &&
    parseFloat(form.sell_price || 0) > 0 &&
    parseFloat(form.quantity_on_hand || 0) > 0;
  const allergenCount = Object.values(form.allergen_flags).filter(
    Boolean,
  ).length;

  // Available subcategories for selected category
  const subcategoryOptions = SUBCATEGORY_BY_CATEGORY[cat] || [];

  const generateAllergenText = () => {
    const present = ALLERGEN_FLAGS.filter(
      (a) => form.allergen_flags[a.key],
    ).map((a) => a.label);
    return present.length === 0
      ? "No allergens declared."
      : `Contains: ${present.join(", ")}.`;
  };

  const handleSubmit = () => {
    if (!form.sku.trim() || !form.name.trim()) {
      setToast({ type: "error", text: "SKU and Name are required." });
      return;
    }
    if (isFoodBev && isFinished && !form.expiry_date) {
      setToast({
        type: "error",
        text: "Expiry date is required for food & beverage finished products.",
      });
      return;
    }

    const allergenOut = Object.fromEntries(
      Object.entries(form.allergen_flags).filter(([, v]) => v === true),
    );

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      description: form.description || null,
      quantity_on_hand: parseFloat(form.quantity_on_hand) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      max_stock_level:
        form.max_stock_level !== "" ? parseFloat(form.max_stock_level) : null,
      cost_price: parseFloat(form.cost_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
      strain_id: form.strain_id || null,
      is_active: form.is_active,
      medium_type: form.medium_type || null,
      shelf_life_days:
        form.shelf_life_days !== "" ? parseInt(form.shelf_life_days) : null,
      ingredients_notes: form.ingredients_notes || null,
      storage_instructions: form.storage_instructions || null,
      allergen_flags: Object.keys(allergenOut).length > 0 ? allergenOut : null,
      temperature_zone: form.temperature_zone || null,
      batch_lot_number: form.batch_lot_number || null,
      country_of_origin: form.country_of_origin || null,
      reorder_qty:
        form.reorder_qty !== "" ? parseFloat(form.reorder_qty) : null,
      // ── NEW v1.2 ──
      brand: form.brand.trim() || null,
      subcategory: form.subcategory || null,
      variant_type: form.variant_type || null,
      variant_value: form.variant_value.trim() || null,
      tags: form.tags.length > 0 ? form.tags : null,
    };

    if (!item) {
      payload.tenant_id = tenantId || null;
    }

    onSave(payload);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 1000,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "680px",
          maxWidth: "100vw",
          background: "#fff",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${T.ink150}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
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
                fontWeight: 600,
                color: T.ink900,
              }}
            >
              {item ? `Edit: ${item.name}` : "Add Stock Item"}
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: T.ink500,
                fontFamily: T.fontUi,
              }}
            >
              {item
                ? `${CATEGORY_LABELS[item.category] || item.category} · ${item.sku}`
                : "Fields adapt by category and industry profile"}
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: T.ink300,
              padding: "4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", flex: 1 }}>
          {toast && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "4px",
                fontSize: "12px",
                marginBottom: "16px",
                fontFamily: T.fontUi,
                background: toast.type === "error" ? T.dangerBg : T.successBg,
                border: `1px solid ${toast.type === "error" ? T.dangerBd : T.successBd}`,
                color: toast.type === "error" ? T.danger : T.success,
              }}
            >
              {toast.type === "error" ? "✗ " : "✓ "}
              {toast.text}
            </div>
          )}

          {/* ── SECTION: Core Identity ── */}
          <SectionHead
            label="Core Identity"
            color={T.info}
            bg={T.infoBg}
            border={T.infoBd}
          />
          <Grid2>
            <Field>
              <Lbl required>SKU</Lbl>
              <input
                style={sInput}
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="e.g. MED-CONC-BUD-1G"
              />
            </Field>
            <Field>
              <Lbl required>Name</Lbl>
              <input
                style={sInput}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Budder 1g"
              />
            </Field>
          </Grid2>
          <Grid2>
            <Field>
              <Lbl>Category</Lbl>
              <select
                style={sSelect}
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS)
                  .filter(([k]) => visibleCategories.includes(k))
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
            </Field>
            <Field>
              <Lbl>Unit</Lbl>
              <select
                style={sSelect}
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </Grid2>
          <Field>
            <Lbl>Description</Lbl>
            <textarea
              style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional internal notes about this item"
            />
          </Field>

          {/* ── SECTION: Cannabis Catalogue (NEW v1.2 — cannabis profiles only) ── */}
          {isCannabis && (
            <>
              <SectionHead
                label="Cannabis Catalogue"
                color="#5B21B6"
                bg="#F5F3FF"
                border="#DDD6FE"
              />

              <Grid2>
                <Field>
                  <Lbl note="brand name shown in filters">Brand</Lbl>
                  <input
                    style={sInput}
                    value={form.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    placeholder="e.g. RAW, Canna, Biobizz"
                  />
                </Field>
                <Field>
                  <Lbl note="product type within category">Subcategory</Lbl>
                  {subcategoryOptions.length > 0 ? (
                    <select
                      style={sSelect}
                      value={form.subcategory}
                      onChange={(e) => set("subcategory", e.target.value)}
                    >
                      <option value="">— Select type —</option>
                      {subcategoryOptions.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      style={sInput}
                      value={form.subcategory}
                      onChange={(e) => set("subcategory", e.target.value)}
                      placeholder="e.g. rosin_bag"
                    />
                  )}
                </Field>
              </Grid2>

              <Grid2>
                <Field>
                  <Lbl note="what the variant describes">Variant Type</Lbl>
                  <select
                    style={sSelect}
                    value={form.variant_type}
                    onChange={(e) => set("variant_type", e.target.value)}
                  >
                    {VARIANT_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <Lbl note="shown as badge on product card">Variant Value</Lbl>
                  <input
                    style={sInput}
                    value={form.variant_value}
                    onChange={(e) => set("variant_value", e.target.value)}
                    placeholder={
                      form.variant_type === "weight"
                        ? "e.g. 3.5g, 1g, 7g"
                        : form.variant_type === "size"
                          ? "e.g. King Size, 110mm"
                          : form.variant_type === "strain"
                            ? "e.g. Indica, Sativa, Gelato"
                            : form.variant_type === "count"
                              ? "e.g. 3-Pack, 6-Pack"
                              : form.variant_type === "strength"
                                ? "e.g. 500mg, 58% 4g"
                                : "e.g. King Size, 3.5g, Indica"
                    }
                  />
                </Field>
              </Grid2>

              {/* Tags — only shown when relevant groups exist for this category/subcategory */}
              {TAG_GROUPS.some((group) => {
                const c = form.category;
                const s = form.subcategory;
                const noTags = [
                  "clothing",
                  "cartridge",
                  "disposable",
                  "battery",
                  "mushroom",
                  "adaptogen",
                  "cbd",
                  "cbd_pet",
                  "preroll",
                  "tincture",
                  "capsule",
                  "topical",
                ];
                if (noTags.includes(s)) return false;
                if (group.group === "Concentrate Type")
                  return (
                    ["concentrate"].includes(c) ||
                    [
                      "hash",
                      "budder",
                      "badder",
                      "live_resin",
                      "rosin",
                      "sauce",
                      "diamonds",
                      "distillate",
                      "crumble",
                      "shatter",
                      "wax",
                      "feco",
                      "rso",
                      "bho",
                      "kief",
                    ].includes(s)
                  );
                if (group.group === "Processing")
                  return ["flower", "concentrate", "raw_material"].includes(c);
                if (group.group === "Cultivation")
                  return ["flower", "concentrate", "raw_material"].includes(c);
                if (group.group === "Grade")
                  return ["flower", "concentrate"].includes(c);
                if (group.group === "Effect")
                  return ["flower", "concentrate", "edible"].includes(c);
                return false;
              }) && (
                <Field>
                  <Lbl note="cultivation method, grade, processing — unlimited">
                    Tags
                  </Lbl>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      padding: "12px",
                      background: "#F5F3FF",
                      border: "1px solid #DDD6FE",
                      borderRadius: "4px",
                    }}
                  >
                    {TAG_GROUPS.filter((group) => {
                      const c = form.category;
                      const s = form.subcategory;
                      const noTags = [
                        "clothing",
                        "cartridge",
                        "disposable",
                        "battery",
                        "mushroom",
                        "adaptogen",
                        "cbd",
                        "cbd_pet",
                        "preroll",
                        "tincture",
                        "capsule",
                        "topical",
                      ];
                      if (noTags.includes(s)) return false;
                      if (group.group === "Concentrate Type")
                        return (
                          ["concentrate"].includes(c) ||
                          [
                            "hash",
                            "budder",
                            "badder",
                            "live_resin",
                            "rosin",
                            "sauce",
                            "diamonds",
                            "distillate",
                            "crumble",
                            "shatter",
                            "wax",
                            "feco",
                            "rso",
                            "bho",
                            "kief",
                          ].includes(s)
                        );
                      if (group.group === "Processing")
                        return [
                          "flower",
                          "concentrate",
                          "raw_material",
                        ].includes(c);
                      if (group.group === "Cultivation")
                        return [
                          "flower",
                          "concentrate",
                          "raw_material",
                        ].includes(c);
                      if (group.group === "Grade")
                        return ["flower", "concentrate"].includes(c);
                      if (group.group === "Effect")
                        return ["flower", "concentrate", "edible"].includes(c);
                      return false;
                    }).map((group) => (
                      <div key={group.group}>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#5B21B6",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 6,
                            fontFamily: T.fontUi,
                          }}
                        >
                          {group.group}
                        </div>
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                        >
                          {group.tags.map((tag) => {
                            const active = form.tags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                style={{
                                  padding: "3px 10px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: active ? 700 : 400,
                                  fontFamily: T.fontUi,
                                  border:
                                    "1.5px solid " +
                                    (active ? "#5B21B6" : "#DDD6FE"),
                                  background: active ? "#5B21B6" : "#fff",
                                  color: active ? "#fff" : "#5B21B6",
                                  cursor: "pointer",
                                }}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {form.tags.length > 0 && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#5B21B6",
                          fontFamily: T.fontUi,
                          borderTop: "1px solid #DDD6FE",
                          paddingTop: 8,
                        }}
                      >
                        Selected: {form.tags.join(" · ")}
                      </div>
                    )}
                  </div>
                </Field>
              )}
            </>
          )}

          {/* ── SECTION: Stock Levels ── */}
          <SectionHead
            label="Stock Levels"
            color={T.accentMid}
            bg={T.accentLit}
            border={T.accentBd}
          />
          <Grid2>
            <Field>
              <Lbl note="current on-hand qty">Quantity on Hand</Lbl>
              <input
                style={sInput}
                type="number"
                step="0.01"
                min="0"
                value={form.quantity_on_hand}
                onChange={(e) => set("quantity_on_hand", e.target.value)}
              />
            </Field>
            <Field>
              <Lbl note="trigger reorder alert">Reorder Level</Lbl>
              <input
                style={sInput}
                type="number"
                step="0.01"
                min="0"
                value={form.reorder_level}
                onChange={(e) => set("reorder_level", e.target.value)}
              />
            </Field>
          </Grid2>
          <Grid2>
            <Field>
              <Lbl note="optional">Max Stock Level</Lbl>
              <input
                style={sInput}
                type="number"
                step="1"
                min="0"
                value={form.max_stock_level}
                onChange={(e) => set("max_stock_level", e.target.value)}
                placeholder="Leave blank for unlimited"
              />
            </Field>
            <Field>
              <Lbl>Supplier</Lbl>
              <select
                style={sSelect}
                value={form.supplier_id}
                onChange={(e) => set("supplier_id", e.target.value)}
              >
                <option value="">— None —</option>
                {(suppliers || [])
                  .filter((s) => s.is_active !== false)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
          </Grid2>

          {/* ── SECTION: Pricing ── */}
          <SectionHead
            label="Pricing"
            color="#92400E"
            bg="#FFF8E1"
            border="#FFE082"
          />
          <Grid2>
            <Field>
              <Lbl>Cost Price (ZAR)</Lbl>
              <input
                style={sInput}
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => set("cost_price", e.target.value)}
              />
            </Field>
            <Field>
              <Lbl note={isFinished ? "← shown in shop" : undefined}>
                Sell Price (ZAR)
              </Lbl>
              <input
                style={sInput}
                type="number"
                step="0.01"
                min="0"
                value={form.sell_price}
                onChange={(e) => set("sell_price", e.target.value)}
                disabled={!isFinished}
              />
              {!isFinished && (
                <p
                  style={{
                    fontSize: "10px",
                    color: T.ink300,
                    margin: "4px 0 0",
                    fontFamily: T.fontUi,
                  }}
                >
                  Only applicable for finished products
                </p>
              )}
            </Field>
          </Grid2>
          {isFinished && (
            <div
              style={{
                background: willBeLive ? T.successBg : T.warningBg,
                border: `1px solid ${willBeLive ? T.successBd : T.warningBd}`,
                borderRadius: "6px",
                padding: "12px 16px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: willBeLive ? T.success : T.warning,
                  marginBottom: "4px",
                  fontFamily: T.fontUi,
                }}
              >
                Shop Listing Status
              </div>
              {willBeLive ? (
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: T.success,
                    fontFamily: T.fontUi,
                  }}
                >
                  ✓ Will appear in customer shop — R
                  {parseFloat(form.sell_price).toFixed(2)} ·{" "}
                  {form.quantity_on_hand} {form.unit}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "12px",
                    color: T.warning,
                    fontFamily: T.fontUi,
                  }}
                >
                  Not live — requires: finished_product · sell price &gt; R0 ·
                  stock &gt; 0
                </div>
              )}
            </div>
          )}

          {/* ── SECTION: Dates ── */}
          <SectionHead
            label="Dates"
            color={T.ink500}
            bg={T.ink075}
            border={T.ink150}
          />
          <Grid2>
            <Field>
              <Lbl required={isFoodBev && isFinished}>Expiry Date</Lbl>
              <input
                style={{
                  ...sInput,
                  borderColor:
                    isFoodBev && isFinished && !form.expiry_date
                      ? T.danger
                      : T.ink150,
                }}
                type="date"
                value={form.expiry_date}
                onChange={(e) => set("expiry_date", e.target.value)}
              />
              {isFoodBev && isFinished && !form.expiry_date && (
                <p
                  style={{
                    fontSize: "11px",
                    color: T.danger,
                    margin: "4px 0 0",
                    fontFamily: T.fontUi,
                  }}
                >
                  Mandatory for food & beverage
                </p>
              )}
            </Field>
            {(isFoodBev || showFoodFields) && (
              <Field>
                <Lbl note="days from production">Shelf Life (days)</Lbl>
                <input
                  style={sInput}
                  type="number"
                  min="0"
                  step="1"
                  value={form.shelf_life_days}
                  onChange={(e) => set("shelf_life_days", e.target.value)}
                  placeholder="e.g. 180"
                />
              </Field>
            )}
          </Grid2>

          {/* ── SECTION: Cannabis Profile (raw_material, concentrate, terpene) ── */}
          {showCannabisFields && (isRawMaterial || isTerpene) && (
            <>
              <SectionHead
                label="Cannabis Profile"
                color={T.accentMid}
                bg={T.accentLit}
                border={T.accentBd}
              />
              <Grid2>
                {isRawMaterial && (
                  <Field>
                    <Lbl>Medium Type</Lbl>
                    <select
                      style={sSelect}
                      value={form.medium_type}
                      onChange={(e) => set("medium_type", e.target.value)}
                    >
                      <option value="">— Not specified —</option>
                      {MEDIUM_TYPES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {isTerpene && (
                  <Field>
                    <Lbl note="terpene flavour profile">Medium Type</Lbl>
                    <select
                      style={sSelect}
                      value={form.medium_type}
                      onChange={(e) => set("medium_type", e.target.value)}
                    >
                      <option value="">— Not specified —</option>
                      <option value="live_terpene">Live Terpene</option>
                      <option value="botanical">Botanical</option>
                      <option value="strain_specific">Strain-Specific</option>
                      <option value="flavoured">Flavoured Blend</option>
                      <option value="enhancer">Enhancer</option>
                      <option value="pure">Pure Terpene</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                )}
                <Field>
                  <Lbl note="optional">Strain ID</Lbl>
                  <input
                    style={sInput}
                    value={form.strain_id}
                    onChange={(e) => set("strain_id", e.target.value)}
                    placeholder="e.g. pineapple-express"
                  />
                </Field>
              </Grid2>
            </>
          )}

          {/* ── SECTION: Food & Beverage specific (S3) ── */}
          {(isFoodBev || (isRawMaterial && !isCannabis)) && (
            <>
              <SectionHead
                label="Food & Beverage"
                color="#2E7D32"
                bg="#E8F5E9"
                border="#A5D6A7"
              />
              <Grid2>
                <Field>
                  <Lbl>Temperature Zone</Lbl>
                  <select
                    style={sSelect}
                    value={form.temperature_zone}
                    onChange={(e) => set("temperature_zone", e.target.value)}
                  >
                    <option value="">— Not specified —</option>
                    <option value="ambient">Ambient (room temp)</option>
                    <option value="refrigerated">Refrigerated (2–8°C)</option>
                    <option value="frozen">Frozen (−18°C or below)</option>
                  </select>
                </Field>
                <Field>
                  <Lbl note="standard order qty (MOQ)">Reorder Qty</Lbl>
                  <input
                    style={sInput}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.reorder_qty}
                    onChange={(e) => set("reorder_qty", e.target.value)}
                    placeholder={`e.g. 25 ${form.unit || ""}`}
                  />
                </Field>
              </Grid2>
              <Grid2>
                <Field>
                  <Lbl note="supplier's delivery lot ref">
                    Batch / Lot Number
                  </Lbl>
                  <input
                    style={sInput}
                    value={form.batch_lot_number}
                    onChange={(e) => set("batch_lot_number", e.target.value)}
                    placeholder="e.g. LOT-2026-0312-A"
                  />
                </Field>
                <Field>
                  <Lbl note="import compliance">Country of Origin</Lbl>
                  <input
                    style={sInput}
                    value={form.country_of_origin}
                    onChange={(e) => set("country_of_origin", e.target.value)}
                    placeholder="e.g. South Africa"
                  />
                </Field>
              </Grid2>
              <Field>
                <Lbl>Ingredients Notes</Lbl>
                <textarea
                  style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
                  value={form.ingredients_notes}
                  onChange={(e) => set("ingredients_notes", e.target.value)}
                  placeholder="e.g. Contains natural lemon flavouring, citric acid (E330)"
                />
              </Field>
              <Field>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <Lbl>
                    Allergen Declaration
                    {allergenCount > 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          background: T.warningBg,
                          color: T.warning,
                          border: `1px solid ${T.warningBd}`,
                          borderRadius: 3,
                          fontSize: "9px",
                          padding: "1px 6px",
                          fontWeight: 700,
                        }}
                      >
                        {allergenCount} flagged
                      </span>
                    )}
                  </Lbl>
                  {allergenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const txt = generateAllergenText();
                        navigator.clipboard
                          .writeText(txt)
                          .then(() =>
                            setToast({
                              type: "success",
                              text: "Allergen declaration text copied to clipboard.",
                            }),
                          )
                          .catch(() =>
                            setToast({
                              type: "error",
                              text: `Declaration: ${txt}`,
                            }),
                          );
                      }}
                      style={{
                        fontSize: "10px",
                        fontFamily: T.fontUi,
                        fontWeight: 600,
                        color: T.warning,
                        background: T.warningBg,
                        border: `1px solid ${T.warningBd}`,
                        borderRadius: "3px",
                        padding: "3px 10px",
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Copy Label Text
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: "8px",
                    padding: "12px",
                    background: allergenCount > 0 ? T.warningBg : T.ink075,
                    border: `1px solid ${allergenCount > 0 ? T.warningBd : T.ink150}`,
                    borderRadius: "4px",
                  }}
                >
                  {ALLERGEN_FLAGS.map((a) => (
                    <label
                      key={a.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontFamily: T.fontUi,
                        color: form.allergen_flags[a.key]
                          ? T.warning
                          : T.ink700,
                        fontWeight: form.allergen_flags[a.key] ? 700 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!form.allergen_flags[a.key]}
                        onChange={() => toggleAllergen(a.key)}
                        style={{ accentColor: T.warning }}
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
                {allergenCount > 0 && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: T.warning,
                      margin: "8px 0 0",
                      fontFamily: T.fontUi,
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    {generateAllergenText()}
                  </p>
                )}
              </Field>
            </>
          )}

          {/* ── SECTION: Hardware ── */}
          {isHardware && (
            <>
              <SectionHead
                label="Hardware Compatibility"
                color={T.info}
                bg={T.infoBg}
                border={T.infoBd}
              />
              <Field>
                <Lbl note="select compatible formats">
                  Compatible Product Formats
                </Lbl>
                {productFormats.length === 0 ? (
                  <p
                    style={{
                      fontSize: "12px",
                      color: T.ink400,
                      fontFamily: T.fontUi,
                    }}
                  >
                    No formats yet — create them in Production → Formats tab.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "6px",
                      padding: "10px",
                      background: T.ink075,
                      border: `1px solid ${T.ink150}`,
                      borderRadius: "4px",
                    }}
                  >
                    {productFormats.map((f) => {
                      const selected = (form.compatible_formats || []).includes(
                        f.id,
                      );
                      return (
                        <label
                          key={f.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontFamily: T.fontUi,
                            padding: "4px 8px",
                            borderRadius: "3px",
                            background: selected ? T.accentLit : "transparent",
                            color: selected ? T.accentMid : T.ink700,
                            fontWeight: selected ? 700 : 400,
                            border: `1px solid ${selected ? T.accentBd : "transparent"}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleFormat(f.id)}
                            style={{ accentColor: T.accentMid }}
                          />
                          {f.label || f.format_key}
                          {f.chambers > 1 && (
                            <span style={{ fontSize: "9px", color: T.ink400 }}>
                              {f.chambers}ch
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </Field>
            </>
          )}

          {/* ── SECTION: Storage ── */}
          {(isRawMaterial ||
            isTerpene ||
            isHardware ||
            isPackaging ||
            isFoodBev) && (
            <>
              <SectionHead
                label="Storage"
                color={T.ink500}
                bg={T.ink075}
                border={T.ink150}
              />
              <Field>
                <Lbl>Storage Instructions</Lbl>
                <textarea
                  style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
                  value={form.storage_instructions}
                  onChange={(e) => set("storage_instructions", e.target.value)}
                  placeholder={
                    isFoodBev
                      ? "e.g. Store below 25°C. Keep away from direct sunlight."
                      : isTerpene
                        ? "e.g. Store in airtight container, 15–20°C, away from light."
                        : "e.g. Store in cool, dry place."
                  }
                />
              </Field>
            </>
          )}

          {/* ── Active toggle ── */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: T.fontUi,
                color: form.is_active ? T.success : T.ink500,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                style={{ width: "15px", height: "15px", accentColor: T.accent }}
              />
              Item is active
              {!form.is_active && (
                <span
                  style={{ fontSize: "11px", color: T.danger, fontWeight: 400 }}
                >
                  — inactive items are hidden from stock views and shop
                </span>
              )}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: `1px solid ${T.ink150}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            bottom: 0,
            background: "#fff",
            gap: "10px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              ...sBtn("outline"),
              color: T.ink500,
              borderColor: T.ink150,
            }}
          >
            Cancel
          </button>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {saving && (
              <span
                style={{
                  fontSize: "12px",
                  color: T.ink400,
                  fontFamily: T.fontUi,
                }}
              >
                Saving...
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                ...sBtn("primary"),
                opacity: saving ? 0.6 : 1,
                minWidth: "140px",
              }}
            >
              {saving ? "Saving..." : item ? "Update Item" : "Create Item"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
