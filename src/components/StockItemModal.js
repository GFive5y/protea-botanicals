// src/components/StockItemModal.js v2.0 — WP-STOCK-UX Session 1
// WORLD MODE: Every category has its own pill-based add item experience
// Replaces all subcategory dropdowns with contextual pill rows
// Preserves ALL v1.2 fields: brand, variant, tags, food fields, allergens, hardware, storage
// New: PillRow component, auto-name builder, auto-SKU builder, world banner

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
  purple: "#5B21B6",
  purpleBg: "#F5F3FF",
  purpleBd: "#DDD6FE",
  purpleMid: "#7C3AED",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
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

// ── World config ──────────────────────────────────────────────────────────────
const WORLD_ICONS = {
  flower: "🌿",
  papers: "📄",
  accessories: "🛠",
  concentrate: "💎",
  hash: "🟤",
  vape: "💨",
  edible: "🍬",
  seeds: "🌱",
  substrate: "🪴",
  nutrients: "🧪",
  equipment: "💡",
  wellness: "💚",
  merch: "👕",
  preroll: "🌀",
};
const WORLD_UNITS = {
  flower: "g",
  hash: "g",
  concentrate: "g",
  vape: "pcs",
  papers: "pcs",
  accessories: "pcs",
  merch: "pcs",
  preroll: "pcs",
  edible: "pcs",
  wellness: "pcs",
  seeds: "pcs",
  equipment: "pcs",
  substrate: "kg",
  nutrients: "ml",
};

// ── PillRow ───────────────────────────────────────────────────────────────────
function PillRow({
  label,
  options,
  selected,
  onSelect,
  multi = false,
  note,
  customKey,
  onAddCustom,
  extraOptions = [],
}) {
  const sel = multi
    ? Array.isArray(selected)
      ? selected
      : []
    : selected
      ? [selected]
      : [];
  const [adding, setAdding] = React.useState(false);
  const [customVal, setCustomVal] = React.useState("");

  const allOptions = [
    ...options,
    ...extraOptions.map((v) => ({ value: v, label: v, custom: true })),
  ];

  const handleAdd = () => {
    const trimmed = customVal.trim();
    if (!trimmed) return;
    if (onAddCustom) onAddCustom(trimmed);
    if (multi)
      onSelect([...(Array.isArray(selected) ? selected : []), trimmed]);
    else onSelect(trimmed);
    setCustomVal("");
    setAdding(false);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.purple,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 7,
            fontFamily: T.fontUi,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            {label}
            {note && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 400,
                  color: T.ink400,
                  textTransform: "none",
                  letterSpacing: 0,
                  marginLeft: 5,
                }}
              >
                {note}
              </span>
            )}
          </span>
          {customKey && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: T.purpleMid,
                background: "transparent",
                border: `1px solid ${T.purpleBd}`,
                borderRadius: 10,
                padding: "1px 8px",
                cursor: "pointer",
                fontFamily: T.fontUi,
              }}
            >
              + Custom
            </button>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {allOptions.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          const isCustom = opt.custom;
          const active = sel.includes(val);
          return (
            <button
              key={val}
              type="button"
              onClick={() => {
                if (multi) {
                  onSelect(
                    active ? sel.filter((v) => v !== val) : [...sel, val],
                  );
                } else {
                  onSelect(active ? "" : val);
                }
              }}
              style={{
                padding: "5px 13px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                fontFamily: T.fontUi,
                border: `${isCustom ? "1.5px dashed" : "1.5px solid"} ${active ? T.purple : T.purpleBd}`,
                background: active ? T.purple : "#fff",
                color: active ? "#fff" : T.purple,
                cursor: "pointer",
              }}
            >
              {lbl}
            </button>
          );
        })}
        {adding && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              autoFocus
              type="text"
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setCustomVal("");
                }
              }}
              placeholder="Type then Enter"
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: T.fontUi,
                border: `1.5px dashed ${T.purple}`,
                outline: "none",
                width: 130,
                color: T.purple,
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: T.fontUi,
                background: T.purple,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setCustomVal("");
              }}
              style={{
                padding: "4px 8px",
                borderRadius: 20,
                fontSize: 12,
                fontFamily: T.fontUi,
                background: "transparent",
                color: T.ink400,
                border: `1px solid ${T.ink150}`,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pill data ─────────────────────────────────────────────────────────────────
const STRAIN_TYPES = ["Indica", "Sativa", "Hybrid", "CBD", "Auto"];
const FLOWER_WEIGHTS = ["1g", "2g", "3.5g", "5g", "7g", "14g", "28g"];
const CONC_WEIGHTS = ["0.5g", "1g", "2g", "3.5g", "5g", "7g"];
const HASH_WEIGHTS = ["1g", "2g", "3.5g", "5g", "7g", "10g", "14g"];
const PREROLL_WEIGHTS = ["0.5g", "1g", "1.5g", "2g", "3g"];
const PREROLL_PACKS = ["Single", "2-Pack", "5-Pack", "10-Pack"];
const PREROLL_TYPES = [
  "Standard",
  "Infused",
  "Hash Roll",
  "Spliff",
  "King Size",
];
const PAPER_SUBCATS = [
  { value: "rolling_papers", label: "Rolling Papers" },
  { value: "cones", label: "Cones" },
  { value: "tips", label: "Tips" },
  { value: "rolling_machine", label: "Rolling Machine" },
  { value: "tray", label: "Rolling Tray" },
];
const PAPER_SIZES = [
  "Regular",
  "1.25",
  "King Size",
  "King Slim",
  "Double Wide",
  "110mm",
  "Extra Long",
  "Blunt Wrap",
];
const PAPER_COUNTS = ["1pk", "3pk", "6pk", "25s", "50s"];
const TIP_MATERIALS = ["Natural Unbleached", "Cardboard", "Glass", "Cellulose"];
const MACHINE_SIZES = ["70mm", "79mm", "110mm"];
const TRAY_SIZES = ["Small", "Medium", "Large", "XL"];
const ACC_SUBCATS = [
  { value: "grinder", label: "Grinder" },
  { value: "pipe", label: "Pipe" },
  { value: "bong", label: "Bong" },
  { value: "dab_rig", label: "Dab Rig" },
  { value: "dab_tool", label: "Dab Tool" },
  { value: "humidity_pack", label: "Humidity Pack" },
  { value: "storage", label: "Storage Jar" },
  { value: "lighter", label: "Lighter / Wick" },
  { value: "extraction_bag", label: "Extraction Bag" },
  { value: "rosin_bag", label: "Rosin Bag" },
  { value: "screens", label: "Screens" },
];
const GRINDER_SIZES = ["40mm", "50mm", "55mm", "63mm", "75mm"];
const GRINDER_PIECES = ["2-Piece", "4-Piece", "5-Piece"];
const HUMIDITY_PCT = ["58%", "62%"];
const HUMIDITY_WEIGHT = ["4g", "8g", "67g"];
const BONG_MATERIALS = ["Glass", "Silicone", "Acrylic", "Ceramic"];
const CONC_TYPES = [
  { value: "budder", label: "Budder" },
  { value: "badder", label: "Badder" },
  { value: "live_resin", label: "Live Resin" },
  { value: "rosin", label: "Rosin" },
  { value: "sauce", label: "Terp Sauce" },
  { value: "diamonds", label: "Diamonds" },
  { value: "distillate", label: "Distillate" },
  { value: "crumble", label: "Crumble" },
  { value: "shatter", label: "Shatter" },
  { value: "wax", label: "Wax" },
  { value: "feco", label: "FECO" },
  { value: "rso", label: "RSO" },
  { value: "bho", label: "BHO" },
];
const EXTRACTION_METHODS = [
  "BHO",
  "CO2",
  "Solventless",
  "Cold-press",
  "Live",
  "Cured",
  "Full-spectrum",
  "Broad-spectrum",
  "Single-source",
];
const HASH_TYPES = [
  { value: "hash", label: "Hash (generic)" },
  { value: "dry_sift", label: "Dry Sift" },
  { value: "bubble_hash", label: "Bubble Hash" },
  { value: "pressed_hash", label: "Pressed Hash" },
  { value: "charas", label: "Charas" },
  { value: "temple_ball", label: "Temple Ball" },
  { value: "lebanese", label: "Lebanese" },
  { value: "moroccan", label: "Moroccan" },
  { value: "afghani", label: "Afghani" },
  { value: "finger_hash", label: "Finger Hash" },
  { value: "kief", label: "Kief" },
  { value: "moon_rock", label: "Moon Rock" },
  { value: "dry_ice_hash", label: "Dry Ice Hash" },
];
const VAPE_TYPES = [
  { value: "cartridge", label: "Cartridge" },
  { value: "disposable", label: "Disposable" },
  { value: "battery", label: "Battery" },
];
const VAPE_VOLUMES = ["0.5ml", "1ml", "2ml", "3ml"];
const BATTERY_TYPES = ["510 Thread", "Pod System", "Twist", "Box Mod"];
const FILL_TYPES = [
  "Distillate",
  "Live Resin",
  "CO2 Oil",
  "Rosin",
  "Broad-spectrum",
  "Full-spectrum",
];
const SEED_TYPES = [
  { value: "seed", label: "Seed" },
  { value: "clone", label: "Clone" },
  { value: "seedling", label: "Seedling" },
  { value: "propagation", label: "Propagation Supply" },
];
const SEED_GENETICS = [
  "Feminised",
  "Auto-flower",
  "Regular",
  "Fast Flower",
  "CBD Seed",
];
const SEED_PACKS = ["1 seed", "3-pack", "5-pack", "10-pack", "25-pack"];
const SUBSTRATE_TYPES = [
  { value: "substrate", label: "Substrate / Coco" },
  { value: "soil", label: "Soil Mix" },
  { value: "rockwool", label: "Rockwool" },
];
const SUBSTRATE_SIZES = ["5L", "10L", "20L", "50L", "80L"];
const ROCKWOOL_SIZES = ["Mini Cube", "Slab", "Large Block"];
const NUTRIENT_TYPES = [
  { value: "base_nutrient", label: "Base Nutrient" },
  { value: "bloom_booster", label: "Bloom Booster" },
  { value: "root_stimulant", label: "Root Stimulant" },
  { value: "enzyme", label: "Enzyme" },
  { value: "ph_management", label: "pH Management" },
  { value: "supplement", label: "CalMag / Supplement" },
  { value: "beneficial", label: "Beneficial Organism" },
];
const NUTRIENT_PHASES = ["Grow", "Bloom", "Both", "All-in-1"];
const NUTRIENT_FORMS = ["Liquid", "Powder", "Tablet"];
const PH_TYPES = ["pH Up", "pH Down", "Buffer", "Tester"];
const BENEFICIAL_TYPES = [
  "Mycorrhizae",
  "Trichoderma",
  "Beneficial Nema",
  "Bacillus",
];
const NUTRIENT_VOL_LIQUID = ["250ml", "500ml", "1L", "5L", "20L"];
const NUTRIENT_VOL_POWDER = ["100g", "250g", "500g", "1kg"];
const NUTRIENT_BRANDS = [
  "Biobizz",
  "Canna",
  "Mills",
  "Plagron",
  "Athena",
  "General Hydroponics",
  "Dutch Pro",
  "Generic",
];
const EQUIP_TYPES = [
  { value: "grow_light", label: "Grow Light" },
  { value: "grow_tent", label: "Grow Tent" },
  { value: "fan", label: "Fan" },
  { value: "carbon_filter", label: "Carbon Filter" },
  { value: "meter", label: "Meter/Monitor" },
  { value: "timer", label: "Timer" },
  { value: "pot", label: "Pot/Container" },
  { value: "training", label: "Training/SCROG" },
];
const LIGHT_TYPES = ["LED", "HPS", "CMH / LEC", "CFL", "Quantum Board"];
const LIGHT_WATTS = ["100W", "200W", "300W", "400W", "600W", "1000W"];
const TENT_SIZES = [
  "60x60cm",
  "80x80cm",
  "100x100cm",
  "120x120cm",
  "240x120cm",
];
const POT_SIZES = ["5L", "10L", "15L", "20L", "25L", "50L"];
const METER_TYPES = [
  "pH Meter",
  "EC/TDS Meter",
  "Thermometer",
  "Hygrometer",
  "Combo Meter",
  "CO2 Monitor",
];
const EDIBLE_TYPES = [
  { value: "edible", label: "Edible" },
  { value: "tincture", label: "Tincture" },
  { value: "capsule", label: "Capsule" },
];
const EDIBLE_FORMATS = [
  "Gummy",
  "Chocolate",
  "Cookie",
  "Brownie",
  "Candy",
  "Lozenge",
  "Beverage",
  "Honey",
];
const EDIBLE_POTENCY = ["5mg", "10mg", "25mg", "50mg", "100mg"];
const CANNABINOIDS = ["THC", "CBD", "CBG", "THC:CBD (1:1)"];
const EDIBLE_PACKS = ["1", "5-pack", "10-pack", "20-pack", "30-pack"];
const EFFECT_TAGS = [
  "Relaxing",
  "Uplifting",
  "Creative",
  "Sleepy",
  "Focused",
  "Energetic",
  "Pain-relief",
  "Appetite",
];
const WELLNESS_TYPES = [
  { value: "mushroom", label: "Mushroom" },
  { value: "adaptogen", label: "Adaptogen" },
  { value: "cbd", label: "CBD Product" },
  { value: "cbd_pet", label: "CBD Pet" },
];
const MUSHROOM_TYPES = [
  "Lion's Mane",
  "Reishi",
  "Chaga",
  "Turkey Tail",
  "Cordyceps",
  "Blend",
];
const WELLNESS_FORMATS = [
  "Capsule",
  "Tincture",
  "Powder",
  "Tea",
  "Gummy",
  "Topical",
];
const WELLNESS_STRENGTHS = ["250mg", "500mg", "1000mg", "2000mg"];
const WELLNESS_COUNTS = ["30 caps", "60 caps", "90 caps", "120 caps"];
const WELLNESS_EFFECTS = [
  "Focus",
  "Energy",
  "Sleep",
  "Immunity",
  "Stress",
  "Recovery",
];
const GARMENT_TYPES = [
  "T-Shirt",
  "Hoodie",
  "Cap",
  "Snapback",
  "Beanie",
  "Tote Bag",
  "Socks",
  "Jacket",
];
const GARMENT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const GARMENT_COLOURS = [
  "Black",
  "White",
  "Green",
  "Navy",
  "Olive",
  "Cream",
  "Tie-dye",
];
const CULTIVATION_TAGS = [
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
];
const GRADE_TAGS = [
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
];
const PROCESSING_TAGS = [
  "Hang-dried",
  "Freeze-dried",
  "Machine-trimmed",
  "Hand-trimmed",
  "Slow-cured",
  "Flash-frozen",
  "Fresh Frozen",
];

// ── Auto name builder ─────────────────────────────────────────────────────────
function buildAutoName(world, brand, s) {
  const b = brand?.trim() || "";
  const parts = [];
  if (b) parts.push(b);
  const w = world;
  if (w === "flower") {
    if (s.weight) parts.push(s.weight);
    if (s.strain) parts.push(s.strain);
  } else if (w === "hash") {
    const t = HASH_TYPES.find((h) => h.value === s.subcat)?.label || "Hash";
    parts.push(t);
    if (s.weight) parts.push(s.weight);
  } else if (w === "concentrate") {
    const t =
      CONC_TYPES.find((c) => c.value === s.subcat)?.label || "Concentrate";
    parts.push(t);
    if (s.weight) parts.push(s.weight);
  } else if (w === "papers") {
    const t = PAPER_SUBCATS.find((p) => p.value === s.subcat)?.label || "Paper";
    if (s.size) parts.push(s.size);
    parts.push(t);
    if (s.packSize) parts.push(s.packSize);
  } else if (w === "accessories") {
    const t =
      ACC_SUBCATS.find((a) => a.value === s.subcat)?.label || "Accessory";
    if (s.size) parts.push(s.size);
    parts.push(t);
  } else if (w === "vape") {
    const t = VAPE_TYPES.find((v) => v.value === s.subcat)?.label || "Vape";
    if (s.volume) parts.push(s.volume);
    if (s.strain) parts.push(s.strain);
    parts.push(t);
  } else if (w === "nutrients") {
    const t =
      NUTRIENT_TYPES.find((n) => n.value === s.subcat)?.label || "Nutrient";
    parts.push(t);
    if (s.phase) parts.push(s.phase);
    if (s.size) parts.push(s.size);
  } else if (w === "substrate") {
    const t =
      SUBSTRATE_TYPES.find((x) => x.value === s.subcat)?.label || "Substrate";
    parts.push(t);
    if (s.size) parts.push(s.size);
  } else if (w === "equipment") {
    const t =
      EQUIP_TYPES.find((e) => e.value === s.subcat)?.label || "Equipment";
    parts.push(t);
    if (s.size) parts.push(s.size);
  } else if (w === "edible") {
    if (s.form) parts.push(s.form);
    if (s.strain) parts.push(s.strain);
    if (s.weight) parts.push(s.weight);
  } else if (w === "wellness") {
    if (s.form) parts.push(s.form);
    if (s.size) parts.push(s.size);
  } else if (w === "merch") {
    if (s.garment) parts.push(s.garment);
    if (s.colour && s.colour !== "Black") parts.push(s.colour);
    if (s.size) parts.push(s.size);
  } else if (w === "seeds") {
    if (s.form) parts.push(s.form);
    if (s.packSize) parts.push(s.packSize);
    parts.push("Seeds");
  } else if (w === "preroll") {
    if (s.strain) parts.push(s.strain);
    if (s.weight) parts.push(s.weight);
    parts.push("Pre-Roll");
    if (s.packSize && s.packSize !== "Single") parts.push(s.packSize);
  }
  return parts.join(" ");
}

function buildAutoSKU(world, brand) {
  const wc =
    {
      flower: "FL",
      hash: "HK",
      concentrate: "CONC",
      papers: "PAP",
      accessories: "ACC",
      vape: "VPE",
      nutrients: "NUT",
      substrate: "SUB",
      equipment: "EQP",
      edible: "EDI",
      wellness: "WEL",
      merch: "MRC",
      seeds: "SED",
      preroll: "PR",
    }[world] || "STK";
  const bc = brand
    ? brand.trim().toUpperCase().replace(/\s+/g, "").substring(0, 4)
    : "GEN";
  return `MED-${wc}-${bc}-`;
}

// ── Legacy constants ──────────────────────────────────────────────────────────
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

// ── Layout helpers ────────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StockItemModal({
  item,
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
  const world = defaults.world || "";
  const worldLabel = defaults.worldLabel || "";
  const worldIcon = WORLD_ICONS[world] || "📦";
  const isWorldMode = isCannabis && !item && !!world;

  const parseAllergens = (f) => (!f || typeof f !== "object" ? {} : f);
  const parseTags = (t) => {
    if (!t) return [];
    if (Array.isArray(t)) return t;
    try {
      return JSON.parse(t);
    } catch {
      return [];
    }
  };
  const smartUnit = WORLD_UNITS[world] || "pcs";

  const [form, setForm] = useState({
    sku: item?.sku || "",
    name: item?.name || "",
    category:
      item?.category ||
      defaults.category ||
      (isFoodBev ? "raw_material" : "finished_product"),
    unit: item?.unit || smartUnit,
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
    brand: item?.brand || "",
    subcategory: item?.subcategory || defaults.subcategory || "",
    variant_type: item?.variant_type || "",
    variant_value: item?.variant_value || "",
    tags: parseTags(item?.tags),
  });

  // World pill state
  const [wStrain, setWStrain] = useState("");
  const [wWeight, setWWeight] = useState("");
  const [wSize, setWSize] = useState("");
  const [wVolume, setWVolume] = useState("");
  const [wPackSize, setWPackSize] = useState("");
  const [wForm, setWForm] = useState("");
  const [wPhase, setWPhase] = useState("");
  const [wGarment, setWGarment] = useState("");
  const [wColour, setWColour] = useState("");
  const [wExtraction, setWExtraction] = useState([]);
  const [wCultivation, setWCultivation] = useState([]);
  const [wGrade, setWGrade] = useState([]);
  const [wProcessing, setWProcessing] = useState([]);
  const [wEffect, setWEffect] = useState([]);

  // Custom options — persisted per tenant+world in localStorage
  const [customOpts, setCustomOpts] = React.useState(() => {
    try {
      const key = `nuai_custom_${tenantId || "local"}_${world}`;
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  });

  const addCustomOption = (field, value) => {
    setCustomOpts((prev) => {
      const next = { ...prev, [field]: [...(prev[field] || []), value] };
      try {
        const key = `nuai_custom_${tenantId || "local"}_${world}`;
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleAllergen = (key) =>
    setForm((p) => ({
      ...p,
      allergen_flags: { ...p.allergen_flags, [key]: !p.allergen_flags[key] },
    }));
  const toggleFormat = (fmtId) =>
    setForm((p) => {
      const c = p.compatible_formats || [];
      return {
        ...p,
        compatible_formats: c.includes(fmtId)
          ? c.filter((i) => i !== fmtId)
          : [...c, fmtId],
      };
    });
  const handleCategoryChange = (val) => {
    set("category", val);
    set("subcategory", "");
  };

  // Auto-sync variant + name + tags from pill state
  useEffect(() => {
    if (!isWorldMode) return;
    const s = {
      subcat: form.subcategory,
      strain: wStrain,
      weight: wWeight,
      size: wSize,
      volume: wVolume,
      packSize: wPackSize,
      form: wForm,
      phase: wPhase,
      garment: wGarment,
      colour: wColour,
    };
    // variant_value
    if (world === "flower" && (wWeight || wStrain)) {
      set("variant_value", [wWeight, wStrain].filter(Boolean).join(" "));
      set("variant_type", "weight");
    } else if (["hash", "concentrate"].includes(world) && wWeight) {
      set("variant_value", wWeight);
      set("variant_type", "weight");
    } else if (world === "vape" && (wVolume || wStrain)) {
      set("variant_value", [wVolume, wStrain].filter(Boolean).join(" "));
      set("variant_type", "size");
    } else if (world === "papers" && (wSize || wPackSize)) {
      set("variant_value", [wSize, wPackSize].filter(Boolean).join(" "));
      set("variant_type", "size");
    } else if (world === "accessories" && wSize) {
      set("variant_value", wSize);
      set("variant_type", "size");
    } else if (world === "nutrients" && (wPhase || wSize)) {
      set("variant_value", [wPhase, wSize].filter(Boolean).join(" "));
    } else if (world === "merch" && wSize) {
      set("variant_value", wSize);
      set("variant_type", "size");
    } else if (world === "preroll" && (wWeight || wStrain)) {
      set("variant_value", [wWeight, wStrain].filter(Boolean).join(" "));
      set("variant_type", "weight");
    }
    // tags
    set("tags", [
      ...wExtraction,
      ...wCultivation,
      ...wGrade,
      ...wProcessing,
      ...wEffect,
    ]);
    // auto-name (only if user hasn't typed)
    const auto = buildAutoName(world, form.brand, s);
    if (auto) set("name", auto);
    // auto-SKU prefix if empty
    if (!form.sku) set("sku", buildAutoSKU(world, form.brand));
  }, [
    wStrain,
    wWeight,
    wSize,
    wVolume,
    wPackSize,
    wForm,
    wPhase,
    wGarment,
    wColour,
    wExtraction,
    wCultivation,
    wGrade,
    wProcessing,
    wEffect,
    form.subcategory,
    form.brand,
  ]); // eslint-disable-line

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
  const generateAllergenText = () => {
    const p = ALLERGEN_FLAGS.filter((a) => form.allergen_flags[a.key]).map(
      (a) => a.label,
    );
    return p.length === 0
      ? "No allergens declared."
      : `Contains: ${p.join(", ")}.`;
  };
  const liveMargin =
    form.sell_price > 0 && form.cost_price > 0
      ? (((form.sell_price - form.cost_price) / form.sell_price) * 100).toFixed(
          1,
        )
      : null;

  const handleSubmit = () => {
    if (!form.sku.trim() || !form.name.trim()) {
      setToast({ type: "error", text: "SKU and Name are required." });
      return;
    }
    if (isFoodBev && isFinished && !form.expiry_date) {
      setToast({
        type: "error",
        text: "Expiry date required for food & beverage.",
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
      brand: form.brand.trim() || null,
      subcategory: form.subcategory || null,
      variant_type: form.variant_type || null,
      variant_value: form.variant_value.trim() || null,
      tags: form.tags.length > 0 ? form.tags : null,
    };
    if (!item) payload.tenant_id = tenantId || null;
    onSave(payload);
  };

  // ── World renderer ────────────────────────────────────────────────────────
  const renderWorld = () => (
    <div>
      <div
        style={{
          background: T.purpleBg,
          border: `1px solid ${T.purpleBd}`,
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 28, lineHeight: 1 }}>{worldIcon}</span>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.purple,
              fontFamily: T.fontUi,
            }}
          >
            You are in {worldLabel} World
          </div>
          <div
            style={{
              fontSize: 10,
              color: T.purpleMid,
              fontFamily: T.fontUi,
              marginTop: 2,
            }}
          >
            Only fields relevant to {worldLabel} shown below
          </div>
        </div>
      </div>

      {/* Brand — all worlds */}
      {world !== "merch" && (
        <Field>
          <Lbl note="shown in brand filter">Brand</Lbl>
          <input
            style={sInput}
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            placeholder="e.g. RAW, Canna, Biobizz, Uncle John's Farm"
          />
        </Field>
      )}

      {/* FLOWER */}
      {world === "flower" && (
        <>
          <PillRow
            label="Strain Type"
            options={STRAIN_TYPES}
            selected={wStrain}
            onSelect={setWStrain}
          />
          <PillRow
            label="Weight"
            options={FLOWER_WEIGHTS}
            selected={wWeight}
            onSelect={setWWeight}
            customKey="flower_weight"
            extraOptions={customOpts["flower_weight"] || []}
            onAddCustom={(v) => addCustomOption("flower_weight", v)}
          />
          <PillRow
            label="Cultivation"
            note="(multi-select)"
            options={CULTIVATION_TAGS}
            selected={wCultivation}
            onSelect={setWCultivation}
            multi
          />
          <PillRow
            label="Grade"
            note="(multi-select)"
            options={GRADE_TAGS}
            selected={wGrade}
            onSelect={setWGrade}
            multi
          />
          <PillRow
            label="Processing"
            note="(multi-select)"
            options={PROCESSING_TAGS}
            selected={wProcessing}
            onSelect={setWProcessing}
            multi
          />
          <PillRow
            label="Effect"
            note="(multi-select)"
            options={EFFECT_TAGS}
            selected={wEffect}
            onSelect={setWEffect}
            multi
          />
        </>
      )}

      {/* ROLLING PAPERS */}
      {world === "papers" && (
        <>
          <PillRow
            label="Type"
            options={PAPER_SUBCATS}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          {["rolling_papers", "cones"].includes(form.subcategory) && (
            <>
              <PillRow
                label="Size"
                options={PAPER_SIZES}
                selected={wSize}
                onSelect={setWSize}
                customKey="papers_size"
                extraOptions={customOpts["papers_size"] || []}
                onAddCustom={(v) => addCustomOption("papers_size", v)}
              />
              <PillRow
                label="Pack Count"
                options={PAPER_COUNTS}
                selected={wPackSize}
                onSelect={setWPackSize}
                customKey="papers_count"
                extraOptions={customOpts["papers_count"] || []}
                onAddCustom={(v) => addCustomOption("papers_count", v)}
              />
            </>
          )}
          {form.subcategory === "tips" && (
            <PillRow
              label="Material"
              options={TIP_MATERIALS}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
          {form.subcategory === "rolling_machine" && (
            <PillRow
              label="Machine Size"
              options={MACHINE_SIZES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
          {form.subcategory === "tray" && (
            <PillRow
              label="Tray Size"
              options={TRAY_SIZES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
        </>
      )}

      {/* ACCESSORIES */}
      {world === "accessories" && (
        <>
          <PillRow
            label="Type"
            options={ACC_SUBCATS}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          {form.subcategory === "grinder" && (
            <>
              <PillRow
                label="Diameter"
                options={GRINDER_SIZES}
                selected={wSize}
                onSelect={setWSize}
              />
              <PillRow
                label="Pieces"
                options={GRINDER_PIECES}
                selected={wForm}
                onSelect={setWForm}
              />
            </>
          )}
          {form.subcategory === "humidity_pack" && (
            <>
              <PillRow
                label="RH %"
                options={HUMIDITY_PCT}
                selected={wSize}
                onSelect={setWSize}
              />
              <PillRow
                label="Weight"
                options={HUMIDITY_WEIGHT}
                selected={wWeight}
                onSelect={setWWeight}
              />
            </>
          )}
          {["bong", "dab_rig"].includes(form.subcategory) && (
            <PillRow
              label="Material"
              options={BONG_MATERIALS}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
        </>
      )}

      {/* CONCENTRATES */}
      {world === "concentrate" && (
        <>
          <PillRow
            label="Type"
            options={CONC_TYPES}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          <PillRow
            label="Weight"
            options={CONC_WEIGHTS}
            selected={wWeight}
            onSelect={setWWeight}
            customKey="conc_weight"
            extraOptions={customOpts["conc_weight"] || []}
            onAddCustom={(v) => addCustomOption("conc_weight", v)}
          />
          <PillRow
            label="Extraction Method"
            note="(multi-select)"
            options={EXTRACTION_METHODS}
            selected={wExtraction}
            onSelect={setWExtraction}
            multi
          />
          <PillRow
            label="Cultivation"
            note="(multi-select)"
            options={CULTIVATION_TAGS.slice(0, 6)}
            selected={wCultivation}
            onSelect={setWCultivation}
            multi
          />
          <PillRow
            label="Grade"
            note="(multi-select)"
            options={GRADE_TAGS.slice(2)}
            selected={wGrade}
            onSelect={setWGrade}
            multi
          />
        </>
      )}

      {/* HASH & KIEF */}
      {world === "hash" && (
        <>
          <PillRow
            label="Type"
            options={HASH_TYPES}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          <PillRow
            label="Weight"
            options={HASH_WEIGHTS}
            selected={wWeight}
            onSelect={setWWeight}
            customKey="hash_weight"
            extraOptions={customOpts["hash_weight"] || []}
            onAddCustom={(v) => addCustomOption("hash_weight", v)}
          />
          <PillRow
            label="Grade"
            note="(multi-select)"
            options={[...GRADE_TAGS.slice(1, 7), "Imported", "Artisanal"]}
            selected={wGrade}
            onSelect={setWGrade}
            multi
          />
          <PillRow
            label="Cultivation"
            note="(multi-select)"
            options={CULTIVATION_TAGS.slice(0, 5)}
            selected={wCultivation}
            onSelect={setWCultivation}
            multi
          />
        </>
      )}

      {/* VAPES */}
      {world === "vape" && (
        <>
          <PillRow
            label="Device Type"
            options={VAPE_TYPES}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          {["cartridge", "disposable"].includes(form.subcategory) && (
            <>
              <PillRow
                label="Volume"
                options={VAPE_VOLUMES}
                selected={wVolume}
                onSelect={setWVolume}
              />
              <PillRow
                label="Strain"
                options={STRAIN_TYPES}
                selected={wStrain}
                onSelect={setWStrain}
              />
              <PillRow
                label="Fill Type"
                options={FILL_TYPES}
                selected={wSize}
                onSelect={setWSize}
              />
            </>
          )}
          {form.subcategory === "battery" && (
            <PillRow
              label="Battery Type"
              options={BATTERY_TYPES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
        </>
      )}

      {/* SEEDS & CLONES */}
      {world === "seeds" && (
        <>
          <PillRow
            label="Type"
            options={SEED_TYPES}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          {form.subcategory === "seed" && (
            <>
              <PillRow
                label="Genetics"
                options={SEED_GENETICS}
                selected={wForm}
                onSelect={setWForm}
              />
              <PillRow
                label="Pack Size"
                options={SEED_PACKS}
                selected={wPackSize}
                onSelect={setWPackSize}
              />
            </>
          )}
          <Field>
            <Lbl note="strain name / genetics">Strain Name</Lbl>
            <input
              style={sInput}
              value={form.strain_id}
              onChange={(e) => set("strain_id", e.target.value)}
              placeholder="e.g. Blue Dream, OG Kush, Wedding Cake x Gelato"
            />
          </Field>
          <PillRow
            label="Cultivation"
            note="(multi-select)"
            options={CULTIVATION_TAGS.slice(0, 5)}
            selected={wCultivation}
            onSelect={setWCultivation}
            multi
          />
        </>
      )}

      {/* SUBSTRATE */}
      {world === "substrate" && (
        <>
          <PillRow
            label="Type"
            options={SUBSTRATE_TYPES}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          {["substrate", "soil"].includes(form.subcategory) && (
            <PillRow
              label="Volume"
              options={SUBSTRATE_SIZES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
          {form.subcategory === "rockwool" && (
            <PillRow
              label="Size"
              options={ROCKWOOL_SIZES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
        </>
      )}

      {/* NUTRIENTS — THE STAR */}
      {world === "nutrients" && (
        <>
          <PillRow
            label="Nutrient Type"
            options={NUTRIENT_TYPES}
            selected={form.subcategory}
            onSelect={(v) => {
              set("subcategory", v);
              setWForm("");
              setWPhase("");
              setWSize("");
            }}
          />
          {["base_nutrient", "bloom_booster"].includes(form.subcategory) && (
            <PillRow
              label="Growth Phase"
              options={NUTRIENT_PHASES}
              selected={wPhase}
              onSelect={setWPhase}
            />
          )}
          {[
            "base_nutrient",
            "bloom_booster",
            "root_stimulant",
            "supplement",
          ].includes(form.subcategory) && (
            <PillRow
              label="Form"
              options={NUTRIENT_FORMS}
              selected={wForm}
              onSelect={(v) => {
                setWForm(v);
                set("unit", v === "Powder" ? "g" : "ml");
              }}
            />
          )}
          {form.subcategory === "ph_management" && (
            <PillRow
              label="pH Type"
              options={PH_TYPES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
          {form.subcategory === "beneficial" && (
            <PillRow
              label="Organism Type"
              options={BENEFICIAL_TYPES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
          {(wForm === "Liquid" ||
            (!wForm &&
              form.subcategory &&
              form.subcategory !== "beneficial" &&
              form.subcategory !== "ph_management")) && (
            <PillRow
              label="Volume"
              options={NUTRIENT_VOL_LIQUID}
              selected={wSize}
              onSelect={setWSize}
              customKey="nut_vol_liquid"
              extraOptions={customOpts["nut_vol_liquid"] || []}
              onAddCustom={(v) => addCustomOption("nut_vol_liquid", v)}
            />
          )}
          {wForm === "Powder" && (
            <PillRow
              label="Weight"
              options={NUTRIENT_VOL_POWDER}
              selected={wSize}
              onSelect={setWSize}
              customKey="nut_vol_powder"
              extraOptions={customOpts["nut_vol_powder"] || []}
              onAddCustom={(v) => addCustomOption("nut_vol_powder", v)}
            />
          )}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.purple,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 7,
                fontFamily: T.fontUi,
              }}
            >
              Known Brands — quick pick
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {NUTRIENT_BRANDS.map((b) => {
                const a = form.brand === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set("brand", b)}
                    style={{
                      padding: "5px 13px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: a ? 700 : 400,
                      fontFamily: T.fontUi,
                      border: `1.5px solid ${a ? T.accentMid : T.ink150}`,
                      background: a ? T.accentMid : "#fff",
                      color: a ? "#fff" : T.ink700,
                      cursor: "pointer",
                    }}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* GROW EQUIPMENT */}
      {world === "equipment" && (
        <>
          <PillRow
            label="Equipment Type"
            options={EQUIP_TYPES}
            selected={form.subcategory}
            onSelect={(v) => {
              set("subcategory", v);
              setWSize("");
              setWForm("");
            }}
          />
          {form.subcategory === "grow_light" && (
            <>
              <PillRow
                label="Light Type"
                options={LIGHT_TYPES}
                selected={wForm}
                onSelect={setWForm}
              />
              <PillRow
                label="Wattage"
                options={LIGHT_WATTS}
                selected={wSize}
                onSelect={setWSize}
              />
            </>
          )}
          {form.subcategory === "grow_tent" && (
            <PillRow
              label="Tent Size"
              options={TENT_SIZES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
          {form.subcategory === "pot" && (
            <PillRow
              label="Pot Volume"
              options={POT_SIZES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
          {form.subcategory === "meter" && (
            <PillRow
              label="Meter Type"
              options={METER_TYPES}
              selected={wSize}
              onSelect={setWSize}
            />
          )}
        </>
      )}

      {/* EDIBLES */}
      {world === "edible" && (
        <>
          <PillRow
            label="Type"
            options={EDIBLE_TYPES}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          {form.subcategory === "edible" && (
            <PillRow
              label="Format"
              options={EDIBLE_FORMATS}
              selected={wForm}
              onSelect={setWForm}
            />
          )}
          <PillRow
            label="Potency"
            options={EDIBLE_POTENCY}
            selected={wWeight}
            onSelect={setWWeight}
          />
          <PillRow
            label="Cannabinoid"
            options={CANNABINOIDS}
            selected={wStrain}
            onSelect={setWStrain}
          />
          <PillRow
            label="Pack Count"
            options={EDIBLE_PACKS}
            selected={wPackSize}
            onSelect={setWPackSize}
          />
          <PillRow
            label="Effect"
            note="(multi-select)"
            options={EFFECT_TAGS}
            selected={wEffect}
            onSelect={setWEffect}
            multi
          />
        </>
      )}

      {/* WELLNESS */}
      {world === "wellness" && (
        <>
          <PillRow
            label="Type"
            options={WELLNESS_TYPES}
            selected={form.subcategory}
            onSelect={(v) => set("subcategory", v)}
          />
          {form.subcategory === "mushroom" && (
            <PillRow
              label="Mushroom Type"
              options={MUSHROOM_TYPES}
              selected={wForm}
              onSelect={setWForm}
            />
          )}
          <PillRow
            label="Format"
            options={WELLNESS_FORMATS}
            selected={wSize}
            onSelect={setWSize}
          />
          {wSize === "Capsule" && (
            <>
              <PillRow
                label="Strength"
                options={WELLNESS_STRENGTHS}
                selected={wWeight}
                onSelect={setWWeight}
              />
              <PillRow
                label="Count"
                options={WELLNESS_COUNTS}
                selected={wPackSize}
                onSelect={setWPackSize}
              />
            </>
          )}
          <PillRow
            label="Effect"
            note="(multi-select)"
            options={WELLNESS_EFFECTS}
            selected={wEffect}
            onSelect={setWEffect}
            multi
          />
        </>
      )}

      {/* MERCH */}
      {world === "merch" && (
        <>
          <Field>
            <Lbl note="brand / label name">Brand</Lbl>
            <input
              style={sInput}
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="e.g. Medi Recreational, NuAi"
            />
          </Field>
          <PillRow
            label="Garment"
            options={GARMENT_TYPES}
            selected={wGarment}
            onSelect={(v) => {
              setWGarment(v);
              set("subcategory", "clothing");
            }}
          />
          <PillRow
            label="Size"
            options={GARMENT_SIZES}
            selected={wSize}
            onSelect={setWSize}
          />
          <PillRow
            label="Colour"
            options={GARMENT_COLOURS}
            selected={wColour}
            onSelect={setWColour}
          />
        </>
      )}

      {/* PRE-ROLLS */}
      {world === "preroll" && (
        <>
          <PillRow
            label="Strain"
            options={STRAIN_TYPES}
            selected={wStrain}
            onSelect={setWStrain}
          />
          <PillRow
            label="Weight"
            options={PREROLL_WEIGHTS}
            selected={wWeight}
            onSelect={setWWeight}
          />
          <PillRow
            label="Pack Size"
            options={PREROLL_PACKS}
            selected={wPackSize}
            onSelect={setWPackSize}
          />
          <PillRow
            label="Type"
            options={PREROLL_TYPES}
            selected={wSize}
            onSelect={setWSize}
          />
          <PillRow
            label="Cultivation"
            note="(multi-select)"
            options={CULTIVATION_TAGS.slice(0, 5)}
            selected={wCultivation}
            onSelect={setWCultivation}
            multi
          />
          <PillRow
            label="Grade"
            note="(multi-select)"
            options={GRADE_TAGS.slice(2, 8)}
            selected={wGrade}
            onSelect={setWGrade}
            multi
          />
        </>
      )}

      {/* Auto-preview */}
      {(form.name || form.sku) && (
        <div
          style={{
            background: T.ink075,
            border: `1px solid ${T.ink150}`,
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: T.ink400,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 4,
              fontFamily: T.fontUi,
            }}
          >
            Auto Preview
          </div>
          {form.name && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.ink700,
                fontFamily: T.fontUi,
              }}
            >
              {form.name}
            </div>
          )}
          {form.sku && (
            <div
              style={{
                fontSize: 10,
                color: T.ink400,
                fontFamily: "'DM Mono','Courier New',monospace",
                marginTop: 2,
              }}
            >
              {form.sku}
            </div>
          )}
        </div>
      )}
    </div>
  );

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
              {item
                ? `Edit: ${item.name}`
                : isWorldMode
                  ? `${worldIcon} Add ${worldLabel} Item`
                  : "Add Stock Item"}
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
                : isWorldMode
                  ? `Fields adapted for ${worldLabel}`
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

          {/* WORLD MODE section */}
          {isWorldMode && (
            <>
              <SectionHead
                label={`${worldLabel} Details`}
                color={T.purple}
                bg={T.purpleBg}
                border={T.purpleBd}
              />
              {renderWorld()}
            </>
          )}

          {/* Core Identity */}
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
                placeholder="e.g. MED-FL-UJF-IND-35"
              />
            </Field>
            <Field>
              <Lbl required>Name</Lbl>
              <input
                style={sInput}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Product name"
              />
            </Field>
          </Grid2>
          <Grid2>
            <Field>
              <Lbl>Category</Lbl>
              {isWorldMode ? (
                <div
                  style={{
                    padding: "8px 12px",
                    background: T.purpleBg,
                    border: `1px solid ${T.purpleBd}`,
                    borderRadius: 4,
                    fontSize: 13,
                    color: T.purple,
                    fontWeight: 700,
                    fontFamily: T.fontUi,
                  }}
                >
                  {worldIcon} {CATEGORY_LABELS[form.category] || form.category}
                </div>
              ) : (
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
              )}
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
              placeholder="Optional internal notes"
            />
          </Field>

          {/* Legacy Cannabis Catalogue — edit mode only */}
          {isCannabis && !isWorldMode && (
            <>
              <SectionHead
                label="Cannabis Catalogue"
                color={T.purple}
                bg={T.purpleBg}
                border={T.purpleBd}
              />
              <Grid2>
                <Field>
                  <Lbl note="brand filter">Brand</Lbl>
                  <input
                    style={sInput}
                    value={form.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    placeholder="e.g. RAW, Canna"
                  />
                </Field>
                <Field>
                  <Lbl note="product type">Subcategory</Lbl>
                  <input
                    style={sInput}
                    value={form.subcategory}
                    onChange={(e) => set("subcategory", e.target.value)}
                    placeholder="e.g. budder, rolling_papers"
                  />
                </Field>
              </Grid2>
              <Grid2>
                <Field>
                  <Lbl>Variant Type</Lbl>
                  <select
                    style={sSelect}
                    value={form.variant_type}
                    onChange={(e) => set("variant_type", e.target.value)}
                  >
                    {[
                      { value: "", label: "— None —" },
                      { value: "weight", label: "Weight" },
                      { value: "size", label: "Size" },
                      { value: "strain", label: "Strain" },
                      { value: "count", label: "Count" },
                      { value: "strength", label: "Strength" },
                      { value: "colour", label: "Colour" },
                    ].map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <Lbl note="badge on product card">Variant Value</Lbl>
                  <input
                    style={sInput}
                    value={form.variant_value}
                    onChange={(e) => set("variant_value", e.target.value)}
                    placeholder="e.g. 3.5g Indica"
                  />
                </Field>
              </Grid2>
            </>
          )}

          {/* Stock Levels */}
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

          {/* Pricing */}
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
              <Lbl note="← shown in shop">Sell Price (ZAR)</Lbl>
              <input
                style={sInput}
                type="number"
                step="0.01"
                min="0"
                value={form.sell_price}
                onChange={(e) => set("sell_price", e.target.value)}
              />
              {liveMargin && (
                <p
                  style={{
                    fontSize: 11,
                    color: parseFloat(liveMargin) >= 50 ? T.success : T.warning,
                    margin: "4px 0 0",
                    fontWeight: 700,
                    fontFamily: T.fontUi,
                  }}
                >
                  Margin: {liveMargin}%
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
                  ✓ Will appear in shop — R
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
                  Not live — needs sell price &gt; R0 and stock &gt; 0
                </div>
              )}
            </div>
          )}

          {/* Dates */}
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

          {/* Cannabis Profile */}
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
                    <Lbl note="flavour profile">Medium Type</Lbl>
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

          {/* Food & Beverage */}
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
                  <Lbl note="MOQ">Reorder Qty</Lbl>
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
                  <Lbl note="lot ref">Batch / Lot Number</Lbl>
                  <input
                    style={sInput}
                    value={form.batch_lot_number}
                    onChange={(e) => set("batch_lot_number", e.target.value)}
                    placeholder="e.g. LOT-2026-0312-A"
                  />
                </Field>
                <Field>
                  <Lbl note="import">Country of Origin</Lbl>
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
                  placeholder="e.g. Contains citric acid (E330)"
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
                    Allergen Declaration{" "}
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
                      onClick={() =>
                        navigator.clipboard
                          .writeText(generateAllergenText())
                          .then(() =>
                            setToast({ type: "success", text: "Copied." }),
                          )
                          .catch(() => {})
                      }
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

          {/* Hardware */}
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
                      const sel = (form.compatible_formats || []).includes(
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
                            background: sel ? T.accentLit : "transparent",
                            color: sel ? T.accentMid : T.ink700,
                            fontWeight: sel ? 700 : 400,
                            border: `1px solid ${sel ? T.accentBd : "transparent"}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
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

          {/* Storage */}
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
                      ? "e.g. Store below 25°C."
                      : isTerpene
                        ? "e.g. Airtight container."
                        : "e.g. Cool, dry place."
                  }
                />
              </Field>
            </>
          )}

          {/* Active */}
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
              Item is active{" "}
              {!form.is_active && (
                <span
                  style={{ fontSize: "11px", color: T.danger, fontWeight: 400 }}
                >
                  — hidden from views and shop
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
                minWidth: "160px",
              }}
            >
              {saving
                ? "Saving..."
                : item
                  ? "Update Item"
                  : isWorldMode
                    ? `Create ${worldLabel} Item`
                    : "Create Item"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
