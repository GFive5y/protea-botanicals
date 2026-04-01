// src/components/hq/SmartInventory.js — v1.0
// Next-gen universal inventory screen for NuAi cannabis retail
// Three views: Tile · List · Detail (Excel-style sortable/filterable table)
// Smart cascading PillBox: Category → Sub-category → search
// Full CRUD: inline edit, save to Supabase, delete with confirm
// Add New item with full field set
//
// LL-131: tenantId as prop only — never hardcoded
// LL-174: CATEGORY_LABELS, CATEGORY_ICONS from ProductWorlds.js
// Rule 0F: tenant_id on every INSERT/UPDATE

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import {
  PRODUCT_WORLDS,
  itemMatchesWorld,
  CANNABIS_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from "./ProductWorlds";

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  bg: "#FAFAF9",
  white: "#ffffff",
  border: "#ECEAE6",
  borderDark: "#D4D0CB",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentXlit: "#F0FAF4",
  danger: "#DC2626",
  dangerLit: "#FEF2F2",
  amber: "#D97706",
  amberLit: "#FFFBEB",
  blue: "#2563EB",
  blueLit: "#EFF6FF",
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#474747",
  ink400: "#6B6B6B",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink50: "#F7F7F7",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  radius: 10,
  shadow: "0 1px 4px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.10)",
  shadowLg: "0 12px 40px rgba(0,0,0,0.14)",
};

// ── View modes ────────────────────────────────────────────────────────────
const VIEW_TILE = "tile";
const VIEW_LIST = "list";
const VIEW_DETAIL = "detail";

// ── Detail view column definitions ────────────────────────────────────────
const DETAIL_COLS = [
  { key: "name", label: "Name", width: 220, sortable: true },
  { key: "category", label: "Category", width: 120, sortable: true },
  { key: "variant_value", label: "Sub-type", width: 130, sortable: true },
  { key: "brand", label: "Brand", width: 110, sortable: true },
  {
    key: "quantity_on_hand",
    label: "On Hand",
    width: 80,
    sortable: true,
    align: "right",
  },
  {
    key: "sell_price",
    label: "Sell Price",
    width: 95,
    sortable: true,
    align: "right",
  },
  {
    key: "weighted_avg_cost",
    label: "Avg Cost",
    width: 90,
    sortable: true,
    align: "right",
  },
  {
    key: "_margin",
    label: "Margin %",
    width: 85,
    sortable: true,
    align: "right",
  },
  {
    key: "is_active",
    label: "Active",
    width: 70,
    sortable: true,
    align: "center",
  },
  {
    key: "is_featured",
    label: "Featured",
    width: 78,
    sortable: true,
    align: "center",
  },
  { key: "loyalty_category", label: "Loyalty Cat", width: 130, sortable: true },
  { key: "_actions", label: "", width: 80, sortable: false, align: "center" },
];

// ── Sub-category keywords (derived from name — no sub_category column) ───
// ── 3-tier pill hierarchy: category → sub-group → brand/detail ───────────
// keywords[] matched against item.name (case-insensitive)
// ── World pill hierarchy v2 — grouped cascading drill-down ──────────────
// Each world has "groups" (Tier 2 headers) containing "subs" (Tier 3 items)
// Click world → see group pills only
// Click group → see sub-item pills (replaces group row, back arrow to return)
// Keywords matched case-insensitively against item.name
//
// Two patterns:
//   attribute-grouped  (Flower, Vapes, Edibles…) — groups are attributes
//   brand-grouped      (Rolling Papers, Nutrients…) — groups are brands
const PILL_HIERARCHY = {
  // ── FLOWER — attribute-grouped: Cultivation > Grade > Strain > Weight ────
  flower: {
    groups: [
      {
        id: "cultivation",
        label: "Cultivation",
        icon: "🌱",
        subs: [
          {
            id: "outdoor",
            label: "Outdoor / Sun-grown",
            keywords: ["outdoor", "sun-grown", "sun grown"],
          },
          { id: "greenhouse", label: "Greenhouse", keywords: ["greenhouse"] },
          { id: "indoor", label: "Indoor", keywords: ["indoor"] },
          {
            id: "hydro",
            label: "Hydroponic",
            keywords: ["hydro", "hydroponic"],
          },
          {
            id: "organic",
            label: "Organic / Living Soil",
            keywords: ["organic", "living soil"],
          },
        ],
      },
      {
        id: "grade",
        label: "Grade",
        icon: "⭐",
        subs: [
          { id: "budget", label: "Budget", keywords: ["budget"] },
          { id: "commercial", label: "Commercial", keywords: ["commercial"] },
          { id: "a_grade", label: "A Grade", keywords: ["a grade"] },
          { id: "aa_grade", label: "AA Grade", keywords: ["aa grade"] },
          { id: "aaa_grade", label: "AAA Grade", keywords: ["aaa grade"] },
          { id: "craft", label: "Craft", keywords: ["craft"] },
          { id: "top_shelf", label: "Top Shelf", keywords: ["top shelf"] },
          { id: "exotic", label: "Exotic", keywords: ["exotic"] },
        ],
      },
      {
        id: "strain",
        label: "Strain Type",
        icon: "🧬",
        subs: [
          { id: "indica", label: "Indica", keywords: ["indica"] },
          { id: "sativa", label: "Sativa", keywords: ["sativa"] },
          { id: "hybrid", label: "Hybrid", keywords: ["hybrid"] },
          { id: "cbd", label: "CBD", keywords: ["cbd"] },
          { id: "auto", label: "Auto", keywords: ["auto"] },
        ],
      },
      {
        id: "weight",
        label: "Weight",
        icon: "⚖️",
        subs: [
          { id: "0.5g", label: "0.5g", keywords: ["0.5g"] },
          { id: "1g", label: "1g", keywords: ["1g"] },
          { id: "2g", label: "2g", keywords: ["2g"] },
          { id: "3.5g", label: "3.5g", keywords: ["3.5g"] },
          { id: "5g", label: "5g", keywords: ["5g"] },
          { id: "7g", label: "7g", keywords: ["7g"] },
          { id: "14g", label: "14g", keywords: ["14g"] },
          { id: "28g", label: "28g / Oz", keywords: ["28g", "oz", "ounce"] },
        ],
      },
    ],
  },

  // ── HASH & KIEF — attribute-grouped: Origin > Type ───────────────────────
  hash: {
    groups: [
      {
        id: "type",
        label: "Type",
        icon: "🟤",
        subs: [
          { id: "kief", label: "Kief", keywords: ["kief"] },
          { id: "bubble", label: "Bubble Hash", keywords: ["bubble"] },
          { id: "dry_sift", label: "Dry Sift", keywords: ["dry sift"] },
          { id: "pressed", label: "Pressed", keywords: ["pressed"] },
          {
            id: "temple_ball",
            label: "Temple Ball",
            keywords: ["temple ball"],
          },
          { id: "moon_rock", label: "Moon Rock", keywords: ["moon rock"] },
        ],
      },
      {
        id: "origin",
        label: "Origin / Region",
        icon: "🌍",
        subs: [
          { id: "lebanese", label: "Lebanese", keywords: ["lebanese"] },
          { id: "moroccan", label: "Moroccan", keywords: ["moroccan"] },
          { id: "afghani", label: "Afghani", keywords: ["afghani"] },
          { id: "charas", label: "Charas", keywords: ["charas"] },
          {
            id: "local",
            label: "Local",
            keywords: ["local", "sa ", "south africa"],
          },
        ],
      },
      {
        id: "weight_h",
        label: "Weight",
        icon: "⚖️",
        subs: [
          { id: "1g_h", label: "1g", keywords: ["1g"] },
          { id: "2g_h", label: "2g", keywords: ["2g"] },
          { id: "3.5g_h", label: "3.5g", keywords: ["3.5g"] },
          { id: "7g_h", label: "7g", keywords: ["7g"] },
        ],
      },
    ],
  },

  // ── CONCENTRATES — attribute-grouped: Solvent type > Form > Weight ────────
  concentrate: {
    groups: [
      {
        id: "solventless",
        label: "Solventless (Premium)",
        icon: "💎",
        subs: [
          { id: "rosin", label: "Rosin", keywords: ["rosin"] },
          { id: "live_rosin", label: "Live Rosin", keywords: ["live rosin"] },
          { id: "bubble_h", label: "Bubble Hash", keywords: ["bubble hash"] },
          { id: "dry_sift_c", label: "Dry Sift", keywords: ["dry sift"] },
          { id: "kief_c", label: "Kief", keywords: ["kief"] },
        ],
      },
      {
        id: "solvent",
        label: "Solvent-based",
        icon: "🔬",
        subs: [
          { id: "shatter", label: "Shatter", keywords: ["shatter"] },
          { id: "badder", label: "Badder / Wax", keywords: ["badder", "wax"] },
          { id: "crumble", label: "Crumble", keywords: ["crumble"] },
          { id: "live_resin", label: "Live Resin", keywords: ["live resin"] },
          { id: "diamonds", label: "THCA Diamonds", keywords: ["diamonds"] },
          { id: "terpsauce", label: "Terp Sauce", keywords: ["terp sauce"] },
          { id: "bho", label: "BHO", keywords: ["bho"] },
        ],
      },
      {
        id: "distillate_type",
        label: "Distillate / Oil",
        icon: "💧",
        subs: [
          { id: "distillate", label: "Distillate", keywords: ["distillate"] },
          { id: "rso", label: "RSO", keywords: ["rso"] },
          { id: "feco", label: "FECO", keywords: ["feco"] },
          { id: "co2", label: "CO2 Extract", keywords: ["co2"] },
        ],
      },
      {
        id: "weight_c",
        label: "Weight",
        icon: "⚖️",
        subs: [
          { id: "0.5g_c", label: "0.5g", keywords: ["0.5g"] },
          { id: "1g_c", label: "1g", keywords: ["1g"] },
          { id: "2g_c", label: "2g", keywords: ["2g"] },
          { id: "5g_c", label: "5g", keywords: ["5g"] },
        ],
      },
    ],
  },

  // ── VAPES — attribute-grouped: Device Type > Strain > Volume ─────────────
  vape: {
    groups: [
      {
        id: "device",
        label: "Device Type",
        icon: "💨",
        subs: [
          {
            id: "cartridge",
            label: "Cartridges",
            keywords: ["cartridge", "cart"],
          },
          { id: "disposable", label: "Disposables", keywords: ["disposable"] },
          {
            id: "battery",
            label: "Batteries",
            keywords: ["battery", "510 thread", "510 bat"],
          },
        ],
      },
      {
        id: "strain_v",
        label: "Strain",
        icon: "🧬",
        subs: [
          { id: "indica_v", label: "Indica", keywords: ["indica"] },
          { id: "sativa_v", label: "Sativa", keywords: ["sativa"] },
          { id: "hybrid_v", label: "Hybrid", keywords: ["hybrid"] },
          { id: "cbd_v", label: "CBD", keywords: ["cbd"] },
        ],
      },
      {
        id: "volume",
        label: "Volume",
        icon: "📐",
        subs: [
          { id: "0.5ml", label: "0.5ml", keywords: ["0.5ml"] },
          { id: "1ml", label: "1ml", keywords: ["1ml"] },
          { id: "2ml", label: "2ml", keywords: ["2ml"] },
        ],
      },
    ],
  },

  // ── PRE-ROLLS — attribute-grouped: Format > Strain ───────────────────────
  preroll: {
    groups: [
      {
        id: "format",
        label: "Format",
        icon: "🚬",
        subs: [
          { id: "single", label: "Singles", keywords: ["single"] },
          { id: "pack3", label: "3-Pack", keywords: ["3-pack", "3 pack"] },
          { id: "infused", label: "Infused", keywords: ["infused"] },
          { id: "house", label: "House Brand", keywords: ["house"] },
          { id: "mixed", label: "Mixed", keywords: ["mixed"] },
        ],
      },
      {
        id: "strain_pr",
        label: "Strain",
        icon: "🧬",
        subs: [
          { id: "indica_pr", label: "Indica", keywords: ["indica"] },
          { id: "sativa_pr", label: "Sativa", keywords: ["sativa"] },
          { id: "hybrid_pr", label: "Hybrid", keywords: ["hybrid"] },
          { id: "cbd_pr", label: "CBD", keywords: ["cbd"] },
        ],
      },
    ],
  },

  // ── EDIBLES — attribute-grouped: Format > Potency ────────────────────────
  edible: {
    groups: [
      {
        id: "format_e",
        label: "Format",
        icon: "🍬",
        subs: [
          { id: "gummies", label: "Gummies", keywords: ["gumm"] },
          {
            id: "chocolate",
            label: "Chocolate",
            keywords: ["choc", "chocolate"],
          },
          { id: "tincture", label: "Tinctures", keywords: ["tincture"] },
          { id: "capsule", label: "Capsules", keywords: ["capsule"] },
          {
            id: "beverage",
            label: "Beverages",
            keywords: ["drink", "tea", "beverage"],
          },
          {
            id: "baked",
            label: "Baked Goods",
            keywords: ["cookie", "brownie", "biscuit"],
          },
        ],
      },
      {
        id: "potency",
        label: "Potency / Dose",
        icon: "💊",
        subs: [
          { id: "5mg", label: "5mg THC", keywords: ["5mg"] },
          { id: "10mg", label: "10mg THC", keywords: ["10mg"] },
          { id: "20mg", label: "20mg THC", keywords: ["20mg"] },
          { id: "25mg", label: "25mg THC", keywords: ["25mg"] },
          { id: "50mg", label: "50mg THC", keywords: ["50mg"] },
          { id: "100mg", label: "100mg THC", keywords: ["100mg"] },
        ],
      },
    ],
  },

  // ── SEEDS & CLONES — attribute-grouped: Genetics > Strain ────────────────
  seeds: {
    groups: [
      {
        id: "genetics",
        label: "Genetics Type",
        icon: "🌱",
        subs: [
          { id: "feminised", label: "Feminised", keywords: ["femin"] },
          { id: "autoflower", label: "Auto-Flower", keywords: ["auto"] },
          { id: "regular", label: "Regular", keywords: ["regular"] },
          { id: "clone", label: "Clones", keywords: ["clone"] },
          { id: "seedling", label: "Seedlings", keywords: ["seedling"] },
          { id: "cbd_hemp", label: "CBD / Hemp", keywords: ["cbd", "hemp"] },
        ],
      },
      {
        id: "strain_s",
        label: "Strain",
        icon: "🧬",
        subs: [
          { id: "indica_s", label: "Indica", keywords: ["indica"] },
          { id: "sativa_s", label: "Sativa", keywords: ["sativa"] },
          { id: "hybrid_s", label: "Hybrid", keywords: ["hybrid"] },
        ],
      },
      {
        id: "pack_size",
        label: "Pack Size",
        icon: "📦",
        subs: [
          {
            id: "1pk",
            label: "1-Pack",
            keywords: ["1-pack", "1 pack", "single"],
          },
          { id: "3pk", label: "3-Pack", keywords: ["3-pack", "3 pack"] },
          { id: "5pk", label: "5-Pack", keywords: ["5-pack", "5 pack"] },
          { id: "10pk", label: "10-Pack", keywords: ["10-pack", "10 pack"] },
        ],
      },
    ],
  },

  // ── SUBSTRATE — attribute-grouped: Type > Brand ──────────────────────────
  substrate: {
    groups: [
      {
        id: "medium",
        label: "Growing Medium",
        icon: "🪨",
        subs: [
          { id: "coco", label: "Coco Peat", keywords: ["coco peat", "coco"] },
          { id: "soil", label: "Potting Mix", keywords: ["mix", "universal"] },
          { id: "rockwool", label: "Rockwool", keywords: ["rockwool"] },
          { id: "perlite", label: "Perlite", keywords: ["perlite"] },
          {
            id: "vermiculite",
            label: "Vermiculite",
            keywords: ["vermiculite"],
          },
          { id: "leca", label: "Clay Pebbles", keywords: ["clay", "leca"] },
        ],
      },
      {
        id: "brand_sub",
        label: "Brand",
        icon: "🏷️",
        subs: [
          { id: "biobizz_s", label: "BioBizz", keywords: ["biobizz"] },
          { id: "plagron_s", label: "Plagron", keywords: ["plagron"] },
          { id: "canna_s", label: "Canna", keywords: ["canna "] },
        ],
      },
      {
        id: "volume_sub",
        label: "Volume / Size",
        icon: "📐",
        subs: [
          { id: "5L_s", label: "5L", keywords: ["5l"] },
          { id: "10L_s", label: "10L", keywords: ["10l"] },
          { id: "20L_s", label: "20L", keywords: ["20l", "20 l"] },
          { id: "50L_s", label: "50L", keywords: ["50l"] },
        ],
      },
    ],
  },

  // ── NUTRIENTS — brand-grouped: Brand > Product Line ──────────────────────
  nutrients: {
    groups: [
      {
        id: "biobizz",
        label: "BioBizz",
        icon: "🌿",
        subs: [
          { id: "bb_all_mix", label: "All·Mix", keywords: ["all mix"] },
          { id: "bb_light_mix", label: "Light·Mix", keywords: ["light mix"] },
          { id: "bb_bio_grow", label: "Bio·Grow", keywords: ["bio-grow"] },
          { id: "bb_bio_bloom", label: "Bio·Bloom", keywords: ["bio-bloom"] },
          { id: "bb_top_max", label: "Top·Max", keywords: ["top-max"] },
          {
            id: "bb_root_juice",
            label: "Root·Juice",
            keywords: ["root-juice"],
          },
        ],
      },
      {
        id: "canna",
        label: "Canna",
        icon: "🌿",
        subs: [
          { id: "canna_coco_a", label: "Coco A", keywords: ["coco a"] },
          { id: "canna_coco_b", label: "Coco B", keywords: ["coco b"] },
          { id: "canna_pk", label: "PK 13/14", keywords: ["pk 13"] },
          { id: "canna_rhizo", label: "Rhizotonic", keywords: ["rhizotonic"] },
          { id: "cannazym", label: "Cannazym", keywords: ["cannazym"] },
        ],
      },
      {
        id: "plagron_n",
        label: "Plagron",
        icon: "🌿",
        subs: [
          { id: "plag_uni", label: "Universal Mix", keywords: ["universal"] },
        ],
      },
      {
        id: "generic_n",
        label: "Other / Generic",
        icon: "🧪",
        subs: [
          { id: "calmag", label: "CalMag", keywords: ["calmag"] },
          { id: "ph_up", label: "pH Up", keywords: ["ph up"] },
          { id: "ph_down", label: "pH Down", keywords: ["ph down"] },
        ],
      },
    ],
  },

  // ── GROW EQUIPMENT — type-grouped: Category > Brand/Size ─────────────────
  equipment: {
    groups: [
      {
        id: "lighting",
        label: "Lighting",
        icon: "💡",
        subs: [
          {
            id: "led",
            label: "LED Grow Lights",
            keywords: ["led", "led grow"],
          },
          { id: "t5", label: "T5 Propagation", keywords: ["t5"] },
          { id: "100w", label: "100W", keywords: ["100w"] },
          { id: "240w", label: "240W", keywords: ["240w"] },
        ],
      },
      {
        id: "tents_e",
        label: "Grow Tents",
        icon: "⛺",
        subs: [
          { id: "tent_60", label: "60×60cm", keywords: ["60x60"] },
          { id: "tent_80", label: "80×80cm", keywords: ["80x80"] },
          { id: "tent_120", label: "120×120cm", keywords: ["120x120"] },
        ],
      },
      {
        id: "airflow",
        label: "Air & Filtration",
        icon: "💨",
        subs: [
          { id: "inline_fan", label: "Inline Fans", keywords: ["inline"] },
          { id: "clip_fan", label: "Clip Fans", keywords: ["clip fan"] },
          {
            id: "carbon_filt",
            label: "Carbon Filters",
            keywords: ["carbon filter"],
          },
        ],
      },
      {
        id: "containers",
        label: "Pots & Containers",
        icon: "🪣",
        subs: [
          {
            id: "fab_5l",
            label: "Fabric Pot 5L",
            keywords: ["pot 5l", "fabric pot 5"],
          },
          {
            id: "fab_10l",
            label: "Fabric Pot 10L",
            keywords: ["pot 10l", "fabric pot 10"],
          },
          {
            id: "fab_20l",
            label: "Fabric Pot 20L",
            keywords: ["pot 20l", "fabric pot 20"],
          },
          {
            id: "fab_25l",
            label: "Fabric Pot 25L",
            keywords: ["pot 25l", "fabric pot 25"],
          },
        ],
      },
      {
        id: "meters_e",
        label: "Meters & Tools",
        icon: "📊",
        subs: [
          { id: "ph_meter", label: "pH Meter", keywords: ["ph meter"] },
          { id: "ec_tds", label: "EC/TDS Meter", keywords: ["ec/tds"] },
          {
            id: "thermohygro",
            label: "Thermometer",
            keywords: ["thermometer", "hygrometer"],
          },
          { id: "timer_e", label: "Timers", keywords: ["timer"] },
        ],
      },
      {
        id: "propagation_e",
        label: "Propagation",
        icon: "🌿",
        subs: [
          { id: "heat_mat", label: "Heat Mats", keywords: ["heat mat"] },
          { id: "rockwool_e", label: "Rockwool", keywords: ["rockwool"] },
          {
            id: "trellis_e",
            label: "SCROG Nets",
            keywords: ["trellis", "scrog"],
          },
        ],
      },
    ],
  },

  // ── WELLNESS — attribute-grouped: Category > Brand ───────────────────────
  wellness: {
    groups: [
      {
        id: "functional",
        label: "Functional Mushrooms",
        icon: "🍄",
        subs: [
          { id: "lions_mane", label: "Lion's Mane", keywords: ["lions mane"] },
          { id: "reishi", label: "Reishi", keywords: ["reishi"] },
          { id: "chaga", label: "Chaga", keywords: ["chaga"] },
          { id: "cordyceps", label: "Cordyceps", keywords: ["cordyceps"] },
          {
            id: "shroom_blend",
            label: "Blends",
            keywords: ["blend", "5-mushroom"],
          },
        ],
      },
      {
        id: "adaptogens_w",
        label: "Adaptogens",
        icon: "🌿",
        subs: [
          {
            id: "ashwagandha",
            label: "Ashwagandha",
            keywords: ["ashwagandha"],
          },
          { id: "rhodiola", label: "Rhodiola", keywords: ["rhodiola"] },
        ],
      },
      {
        id: "cbd_wellness",
        label: "CBD Products",
        icon: "💚",
        subs: [
          { id: "cbd_oil", label: "CBD Oil", keywords: ["cbd oil"] },
          { id: "cbd_capsule", label: "CBD Capsules", keywords: ["cbd cap"] },
          {
            id: "cbd_topical",
            label: "Topicals",
            keywords: ["cbd topical", "cbd cream"],
          },
        ],
      },
      {
        id: "pet_well",
        label: "Pet Products",
        icon: "🐾",
        subs: [
          { id: "pet_drops", label: "Pet Drops", keywords: ["pet", "dog"] },
          { id: "pet_treats", label: "Pet Treats", keywords: ["treat"] },
        ],
      },
    ],
  },

  // ── ROLLING PAPERS — brand-grouped (brand is the primary navigator) ───────
  papers: {
    groups: [
      {
        id: "raw_brand",
        label: "RAW",
        icon: "📄",
        subs: [
          {
            id: "raw_classic_cones",
            label: "Classic Cones",
            keywords: ["raw classic cone"],
          },
          {
            id: "raw_black_cones",
            label: "Black Cones",
            keywords: ["raw black cone"],
          },
          {
            id: "raw_organic_cones",
            label: "Organic Cones",
            keywords: ["raw organic cone"],
          },
          { id: "raw_lean_cones", label: "Lean Cones", keywords: ["raw lean"] },
          {
            id: "raw_papers",
            label: "Rolling Papers",
            keywords: [
              "raw classic king",
              "raw black king",
              "raw 1.25",
              "raw classic king size rolling",
              "raw classic kingsize slim",
            ],
          },
          {
            id: "raw_tips",
            label: "Tips & Filters",
            keywords: ["raw tips", "raw pre-rolled tips"],
          },
          {
            id: "raw_machine",
            label: "Rolling Machines",
            keywords: ["raw 110mm", "raw 79mm"],
          },
        ],
      },
      {
        id: "ocb_brand",
        label: "OCB",
        icon: "📄",
        subs: [{ id: "ocb_all", label: "OCB (all)", keywords: ["ocb"] }],
      },
      {
        id: "gizeh_brand",
        label: "Gizeh",
        icon: "📄",
        subs: [
          { id: "gizeh_cones", label: "Gizeh Cones", keywords: ["gizeh cone"] },
          { id: "gizeh_tips", label: "Gizeh Tips", keywords: ["gizeh tip"] },
          { id: "gizeh_papers", label: "Gizeh Papers", keywords: ["gizeh"] },
        ],
      },
      {
        id: "elements_brand",
        label: "Elements",
        icon: "📄",
        subs: [
          {
            id: "elements_all",
            label: "Elements (all)",
            keywords: ["elements"],
          },
        ],
      },
      {
        id: "generic_papers",
        label: "Other Brands",
        icon: "📄",
        subs: [
          { id: "hemp_wick", label: "Hemp Wick", keywords: ["hemp wick"] },
        ],
      },
    ],
  },

  // ── ACCESSORIES — type-grouped: Category > Brand/Size ────────────────────
  accessories: {
    groups: [
      {
        id: "grinders_a",
        label: "Grinders",
        icon: "⚙️",
        subs: [
          {
            id: "grinder_2pc",
            label: "2-Piece",
            keywords: ["2-piece", "2 piece"],
          },
          {
            id: "grinder_4pc",
            label: "4-Piece",
            keywords: ["4-piece", "4 piece"],
          },
          { id: "grinder_40", label: "40mm", keywords: ["40mm"] },
          { id: "grinder_55", label: "55mm", keywords: ["55mm"] },
          {
            id: "grinder_budget",
            label: "Budget",
            keywords: ["budget grinder"],
          },
        ],
      },
      {
        id: "pipes_a",
        label: "Pipes & Bongs",
        icon: "🪧",
        subs: [
          { id: "glass_pipe", label: "Glass Pipes", keywords: ["glass pipe"] },
          { id: "acrylic_pipe", label: "Acrylic", keywords: ["acrylic"] },
          { id: "bong", label: "Bongs", keywords: ["bong"] },
          { id: "dab_rig", label: "Dab Rigs", keywords: ["dab rig"] },
        ],
      },
      {
        id: "dab_a",
        label: "Dab Accessories",
        icon: "💎",
        subs: [
          {
            id: "dab_tool_set",
            label: "Dab Tool Sets",
            keywords: ["dab tool"],
          },
          {
            id: "quartz",
            label: "Quartz Bangers",
            keywords: ["quartz banger"],
          },
          { id: "fullmelt", label: "Fullmelt Bags", keywords: ["fullmelt"] },
        ],
      },
      {
        id: "humidity_a",
        label: "Humidity Control",
        icon: "💧",
        subs: [
          {
            id: "bovida_58",
            label: "Bovida 58% RH",
            keywords: ["bovida", "58%"],
          },
          { id: "bovida_62", label: "Bovida 62% RH", keywords: ["62%"] },
        ],
      },
      {
        id: "storage_a",
        label: "Storage",
        icon: "🫙",
        subs: [
          { id: "uv_jar_100", label: "UV Jar 100ml", keywords: ["100ml"] },
          { id: "uv_jar_250", label: "UV Jar 250ml", keywords: ["250ml"] },
        ],
      },
    ],
  },

  // ── MERCH — type-grouped: Category > Size ────────────────────────────────
  merch: {
    groups: [
      {
        id: "clothing_m",
        label: "Clothing",
        icon: "👕",
        subs: [
          {
            id: "tshirt_m",
            label: "T-Shirts",
            keywords: ["t-shirt", "tshirt"],
          },
          { id: "hoodie_m", label: "Hoodies", keywords: ["hoodie"] },
          { id: "cap_m", label: "Caps", keywords: ["cap"] },
        ],
      },
      {
        id: "size_m",
        label: "Size",
        icon: "📐",
        subs: [
          { id: "small_m", label: "Small", keywords: ["small"] },
          { id: "medium_m", label: "Medium", keywords: ["medium"] },
          { id: "large_m", label: "Large", keywords: ["large"] },
          { id: "xl_m", label: "XL", keywords: ["xl"] },
        ],
      },
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const zar = (n) => `R${(Number(n) || 0).toFixed(2)}`;
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const margin = (sell, cost) => {
  if (!sell || !cost || sell <= 0) return null;
  return ((sell - cost) / sell) * 100;
};

function marginColor(m) {
  if (m === null) return T.ink300;
  if (m >= 50) return T.accentMid;
  if (m >= 30) return T.amber;
  return T.danger;
}

// ── Field definitions for edit panel ─────────────────────────────────────
const EDIT_FIELDS = [
  { key: "name", label: "Name", type: "text", required: true },
  {
    key: "category",
    label: "Category",
    type: "select",
    options: CANNABIS_CATEGORIES,
  },
  {
    key: "loyalty_category",
    label: "Loyalty Category",
    type: "select",
    options: [
      "cannabis_flower",
      "cannabis_edible",
      "accessories",
      "health_wellness",
      "grow_supplies",
    ],
  },
  {
    key: "sell_price",
    label: "Sell Price (ZAR)",
    type: "number",
    step: "0.01",
  },
  {
    key: "weighted_avg_cost",
    label: "Avg Cost (ZAR)",
    type: "number",
    step: "0.01",
  },
  { key: "quantity_on_hand", label: "Qty on Hand", type: "number", step: "1" },
  { key: "display_order", label: "Display Order", type: "number", step: "1" },
  { key: "is_active", label: "Active (in shop)", type: "boolean" },
  { key: "is_featured", label: "Featured", type: "boolean" },
  { key: "image_url", label: "Image URL", type: "text" },
];

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
export default function SmartInventory({ tenantId }) {
  // ── Data state ──────────────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── View + filter state ─────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState(VIEW_TILE);
  const [catFilter, setCatFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState(null); // tier-2 header (e.g. "cultivation")
  const [subFilter, setSubFilter] = useState(null); // tier-3 item  (e.g. "indoor")
  const [search, setSearch] = useState("");

  // ── Sort state (detail view) ─────────────────────────────────────────────
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [colFilters, setColFilters] = useState({}); // {col: value}
  const [filterRowOpen, setFilterRowOpen] = useState(false);

  // ── Edit panel state ─────────────────────────────────────────────────────
  const [editItem, setEditItem] = useState(null); // item being edited
  const [editDraft, setEditDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  // ── Add new ──────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState({});
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  const searchRef = useRef(null);

  // ── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    const [{ data: iData, error: iErr }, { data: sData }] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("*, suppliers(name)")
        .eq("tenant_id", tenantId)
        .order("category")
        .order("name"),
      supabase
        .from("suppliers")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name"),
    ]);
    if (iErr) setError(iErr.message);
    setItems(iData || []);
    setSuppliers(sData || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Filtered + sorted items ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = items;

    // World filter — use itemMatchesWorld for all 14 worlds
    if (catFilter !== "all") {
      const world = PRODUCT_WORLDS.find((w) => w.id === catFilter);
      if (world) list = list.filter((i) => itemMatchesWorld(i, world));
    }

    // Sub-type filter — grouped hierarchy: groupFilter selects the group, subFilter the item
    if (subFilter && groupFilter && PILL_HIERARCHY[catFilter]) {
      const group = PILL_HIERARCHY[catFilter].groups?.find(
        (g) => g.id === groupFilter,
      );
      const sub = group?.subs?.find((s) => s.id === subFilter);
      if (sub) {
        list = list.filter((i) =>
          sub.keywords.some((kw) =>
            i.name.toLowerCase().includes(kw.toLowerCase()),
          ),
        );
      }
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[i.category] || "").toLowerCase().includes(q) ||
          i.loyalty_category?.toLowerCase().includes(q),
      );
    }

    // Column filters (detail view)
    Object.entries(colFilters).forEach(([col, val]) => {
      if (!val) return;
      const v = val.toLowerCase();
      list = list.filter((i) => {
        const cell = String(i[col] ?? "").toLowerCase();
        return cell.includes(v);
      });
    });

    // Sort
    list = [...list].sort((a, b) => {
      let av =
        sortKey === "_margin"
          ? margin(a.sell_price, a.weighted_avg_cost)
          : a[sortKey];
      let bv =
        sortKey === "_margin"
          ? margin(b.sell_price, b.weighted_avg_cost)
          : b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [
    items,
    catFilter,
    groupFilter,
    subFilter,
    search,
    colFilters,
    sortKey,
    sortDir,
  ]);

  // ── Sort column toggle ──────────────────────────────────────────────────
  function handleSort(key) {
    if (!key || key === "_actions") return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ── Edit panel ──────────────────────────────────────────────────────────
  function openEdit(item) {
    setEditItem(item);
    setEditDraft({ ...item });
    setSaveError(null);
  }
  function closeEdit() {
    setEditItem(null);
    setEditDraft({});
    setSaveError(null);
  }

  async function saveEdit() {
    if (!editItem) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      name: editDraft.name,
      category: editDraft.category,
      loyalty_category: editDraft.loyalty_category,
      sell_price: parseFloat(editDraft.sell_price) || 0,
      weighted_avg_cost: parseFloat(editDraft.weighted_avg_cost) || 0,
      quantity_on_hand: parseFloat(editDraft.quantity_on_hand) || 0,
      display_order: parseInt(editDraft.display_order) || 0,
      is_active: Boolean(editDraft.is_active),
      is_featured: Boolean(editDraft.is_featured),
      image_url: editDraft.image_url || null,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = await supabase
      .from("inventory_items")
      .update(payload)
      .eq("id", editItem.id);
    if (err) {
      setSaveError(err.message);
    } else {
      closeEdit();
      load();
    }
    setSaving(false);
  }

  async function deleteItem(item) {
    const { error: err } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", item.id);
    if (err) {
      alert("Delete failed: " + err.message);
      return;
    }
    setDelConfirm(null);
    closeEdit();
    load();
  }

  // ── Add new item ─────────────────────────────────────────────────────────
  function openAdd() {
    // Derive DB enum category from the active world
    const world = PRODUCT_WORLDS.find(
      (w) => w.id === catFilter && w.id !== "all",
    );
    const dbCategory = world?.enums?.[0] || "finished_product";

    // Loyalty category mapping for all 14 worlds
    const loyaltyMap = {
      flower: "cannabis_flower",
      hash: "cannabis_flower",
      concentrate: "cannabis_flower",
      vape: "cannabis_flower",
      preroll: "cannabis_flower",
      edible: "cannabis_edible",
      seeds: "grow_supplies",
      substrate: "grow_supplies",
      nutrients: "grow_supplies",
      equipment: "grow_supplies",
      papers: "accessories",
      accessories: "accessories",
      wellness: "health_wellness",
      merch: "health_wellness",
    };
    const loyaltyCat =
      catFilter !== "all"
        ? loyaltyMap[catFilter] || "health_wellness"
        : "cannabis_flower";

    setAddDraft({
      name: "",
      category: dbCategory,
      sell_price: "",
      weighted_avg_cost: "",
      quantity_on_hand: 0,
      is_active: true,
      is_featured: false,
      loyalty_category: loyaltyCat,
    });
    setAddError(null);
    setAddOpen(true);
  }

  async function saveAdd() {
    if (!addDraft.name?.trim()) {
      setAddError("Name is required.");
      return;
    }
    setAddSaving(true);
    setAddError(null);
    const { error: err } = await supabase.from("inventory_items").insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId, // Rule 0F
      name: addDraft.name.trim(),
      category: addDraft.category || "finished_product",
      loyalty_category: addDraft.loyalty_category || null,
      sell_price: parseFloat(addDraft.sell_price) || 0,
      weighted_avg_cost: parseFloat(addDraft.weighted_avg_cost) || 0,
      quantity_on_hand: parseFloat(addDraft.quantity_on_hand) || 0,
      display_order: 0,
      is_active: Boolean(addDraft.is_active),
      is_featured: false,
      image_url: addDraft.image_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (err) {
      setAddError(err.message);
    } else {
      setAddOpen(false);
      load();
    }
    setAddSaving(false);
  }

  // ── Quick inline toggle (detail view) ───────────────────────────────────
  async function quickToggle(item, field) {
    await supabase
      .from("inventory_items")
      .update({ [field]: !item[field], updated_at: new Date().toISOString() })
      .eq("id", item.id);
    load();
  }

  // ── Pill cascade ────────────────────────────────────────────────────────
  function selectCat(catId) {
    setCatFilter(catId);
    setGroupFilter(null);
    setSubFilter(null);
    setSearch("");
  }

  function selectGroup(groupId) {
    // Toggle group — clicking active group collapses back to group row
    if (groupFilter === groupId) {
      setGroupFilter(null);
      setSubFilter(null);
    } else {
      setGroupFilter(groupId);
      setSubFilter(null);
    }
  }

  function selectSub(subId) {
    if (subFilter === subId) setSubFilter(null);
    else setSubFilter(subId);
  }

  // eslint-disable-next-line no-unused-vars -- kept for future brand-level tier 4
  function selectBrand(brandId) {}

  // ── Stats strip ─────────────────────────────────────────────────────────
  const totalItems = items.length;
  const activeItems = items.filter((i) => i.is_active).length;
  const soldOut = items.filter((i) => (i.quantity_on_hand || 0) === 0).length;
  const stockValue = items.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
    0,
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
        fontFamily: T.font,
        background: T.bg,
      }}
    >
      {/* ── TOP TOOLBAR ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: T.white,
          borderBottom: `1px solid ${T.border}`,
          padding: "10px 18px 0",
          flexShrink: 0,
        }}
      >
        {/* Row 1: title + stats + actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 17, color: T.ink900 }}>
            📦 Inventory
          </span>

          {/* Stats pills */}
          <StatPill label="Total" value={totalItems} />
          <StatPill label="Active" value={activeItems} color={T.accentMid} />
          <StatPill
            label="Sold Out"
            value={soldOut}
            color={soldOut > 0 ? T.danger : T.ink300}
          />
          <StatPill
            label="Stock Value"
            value={`R${(stockValue / 1000).toFixed(0)}k`}
            color={T.blue}
          />

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {/* View switcher */}
            <ViewToggle current={viewMode} onChange={setViewMode} T={T} />

            {/* Column filters toggle (detail only) */}
            {viewMode === VIEW_DETAIL && (
              <button
                onClick={() => setFilterRowOpen((v) => !v)}
                style={btnStyle(
                  filterRowOpen ? T.accent : T.white,
                  filterRowOpen ? T.white : T.ink500,
                  T.border,
                  T,
                )}
              >
                🔽 Filters
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={load}
              style={btnStyle(T.white, T.ink500, T.border, T)}
            >
              ↺
            </button>

            {/* Add new */}
            <button
              onClick={openAdd}
              style={btnStyle(T.accent, T.white, T.accent, T, true)}
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Row 2: Smart PillBox */}
        <SmartPillBox
          catFilter={catFilter}
          groupFilter={groupFilter}
          subFilter={subFilter}
          onSelectCat={selectCat}
          onSelectGroup={selectGroup}
          onSelectSub={selectSub}
          search={search}
          onSearch={setSearch}
          searchRef={searchRef}
          items={items}
          T={T}
        />
      </div>

      {/* ── CONTENT AREA ────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          position: "relative",
        }}
      >
        {/* Main view */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: viewMode === VIEW_DETAIL ? 0 : 16,
          }}
        >
          {loading ? (
            <LoadingState T={T} />
          ) : error ? (
            <ErrorState msg={error} T={T} />
          ) : filtered.length === 0 ? (
            <EmptyState
              catFilter={catFilter}
              search={search}
              onAdd={openAdd}
              T={T}
            />
          ) : viewMode === VIEW_TILE ? (
            <TileView
              items={filtered}
              onEdit={openEdit}
              onDelete={(item) => setDelConfirm(item)}
              onToggle={quickToggle}
              T={T}
            />
          ) : viewMode === VIEW_LIST ? (
            <ListView
              items={filtered}
              onEdit={openEdit}
              onDelete={(item) => setDelConfirm(item)}
              onToggle={quickToggle}
              T={T}
            />
          ) : (
            <DetailView
              items={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              filterRowOpen={filterRowOpen}
              colFilters={colFilters}
              onColFilter={(col, val) =>
                setColFilters((prev) => ({ ...prev, [col]: val }))
              }
              onEdit={openEdit}
              onDelete={(item) => setDelConfirm(item)}
              onToggle={quickToggle}
              T={T}
            />
          )}
        </div>

        {/* Edit panel (right slide-in) */}
        {editItem && (
          <EditPanel
            item={editItem}
            draft={editDraft}
            onDraftChange={(key, val) =>
              setEditDraft((prev) => ({ ...prev, [key]: val }))
            }
            onSave={saveEdit}
            onClose={closeEdit}
            onDelete={() => setDelConfirm(editItem)}
            saving={saving}
            error={saveError}
            suppliers={suppliers}
            T={T}
          />
        )}
      </div>

      {/* ── ADD MODAL ───────────────────────────────────────────────────── */}
      {addOpen && (
        <Modal
          onClose={() => setAddOpen(false)}
          title={(() => {
            if (catFilter === "all") return "+ Add Inventory Item";
            const w = PRODUCT_WORLDS.find((pw) => pw.id === catFilter);
            return `+ Add ${w?.icon || ""} ${w?.label || catFilter} Item`;
          })()}
          T={T}
        >
          <ItemForm
            draft={addDraft}
            onChange={(k, v) => setAddDraft((p) => ({ ...p, [k]: v }))}
            error={addError}
            saving={addSaving}
            onSave={saveAdd}
            onCancel={() => setAddOpen(false)}
            suppliers={suppliers}
            T={T}
            isNew
          />
        </Modal>
      )}

      {/* ── DELETE CONFIRM ──────────────────────────────────────────────── */}
      {delConfirm && (
        <Modal
          onClose={() => setDelConfirm(null)}
          title="Delete Item"
          T={T}
          width={380}
        >
          <div style={{ fontSize: 14, color: T.ink500, marginBottom: 20 }}>
            Permanently delete <strong>{delConfirm.name}</strong>? This removes
            the inventory record. Stock movements are preserved for audit.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setDelConfirm(null)}
              style={btnStyle(T.white, T.ink500, T.border, T, false, true)}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteItem(delConfirm)}
              style={btnStyle(T.danger, T.white, T.danger, T, true, true)}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SMART PILL BOX
// Category pills → sub-category pills cascade → search bar
// ─────────────────────────────────────────────────────────────────────────
function SmartPillBox({
  catFilter,
  groupFilter,
  subFilter,
  onSelectCat,
  onSelectGroup,
  onSelectSub,
  search,
  onSearch,
  searchRef,
  items,
  T,
}) {
  // ── Live counts ──────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const m = { all: items.length };
    PRODUCT_WORLDS.filter((w) => w.id !== "all").forEach((w) => {
      m[w.id] = items.filter((i) => itemMatchesWorld(i, w)).length;
    });
    return m;
  }, [items]);

  // Group counts — items matching each group's combined keywords
  const groupCounts = useMemo(() => {
    if (catFilter === "all" || !PILL_HIERARCHY[catFilter]) return {};
    const world = PRODUCT_WORLDS.find((w) => w.id === catFilter);
    const catItems = world
      ? items.filter((i) => itemMatchesWorld(i, world))
      : [];
    const m = {};
    (PILL_HIERARCHY[catFilter].groups || []).forEach((g) => {
      m[g.id] = catItems.filter((item) =>
        g.subs.some((sub) =>
          sub.keywords.some((kw) =>
            item.name.toLowerCase().includes(kw.toLowerCase()),
          ),
        ),
      ).length;
    });
    return m;
  }, [items, catFilter]);

  // Sub counts — items matching each sub-item's keywords within active group
  const subCounts = useMemo(() => {
    if (!groupFilter || !PILL_HIERARCHY[catFilter]) return {};
    const world = PRODUCT_WORLDS.find((w) => w.id === catFilter);
    const catItems = world
      ? items.filter((i) => itemMatchesWorld(i, world))
      : [];
    const group = PILL_HIERARCHY[catFilter].groups?.find(
      (g) => g.id === groupFilter,
    );
    const m = {};
    (group?.subs || []).forEach((sub) => {
      m[sub.id] = catItems.filter((item) =>
        sub.keywords.some((kw) =>
          item.name.toLowerCase().includes(kw.toLowerCase()),
        ),
      ).length;
    });
    return m;
  }, [items, catFilter, groupFilter]);

  const allCats = [
    { id: "all", label: "All", icon: "🔍" },
    ...PRODUCT_WORLDS.filter((w) => w.id !== "all").map((w) => ({
      id: w.id,
      label: w.label,
      icon: w.icon || "📦",
      hasSub: Boolean(PILL_HIERARCHY[w.id]?.groups?.length),
    })),
  ];

  const activeGroups =
    catFilter !== "all" ? PILL_HIERARCHY[catFilter]?.groups || [] : [];
  const activeGroup = activeGroups.find((g) => g.id === groupFilter);
  const activeSubs = activeGroup?.subs || [];

  // Pill style helpers
  const pillBase = (active, accent, T) => ({
    padding: "4px 12px",
    borderRadius: 99,
    border: `1.5px solid ${active ? accent : T.border}`,
    background: active ? accent : T.white,
    color: active ? "#fff" : T.ink500,
    fontWeight: active ? 700 : 400,
    fontSize: 12.5,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: T.font,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    transition: "all 0.12s",
    flexShrink: 0,
  });

  const countBadge = (n, active) => ({
    background: active ? "rgba(255,255,255,0.28)" : T.ink50,
    color: active ? "#fff" : T.ink400,
    borderRadius: 99,
    padding: "0 6px",
    fontSize: 10,
    fontWeight: 700,
    display: "inline-block",
  });

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* ── TIER 1: World pills ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 6,
          alignItems: "center",
        }}
      >
        {allCats.map((cat) => {
          const active = catFilter === cat.id;
          const cnt = counts[cat.id] || 0;
          const isExpanded = active && groupFilter && catFilter !== "all";
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCat(cat.id)}
              style={pillBase(active, T.accent, T)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span style={countBadge(cnt, active)}>{cnt}</span>
              {cat.hasSub && (
                <span style={{ fontSize: 8, opacity: active ? 0.8 : 0.4 }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              )}
            </button>
          );
        })}
        {/* Search — right-aligned */}
        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search items…"
            style={{
              padding: "5px 12px",
              border: `1.5px solid ${search ? T.accent : T.border}`,
              borderRadius: 99,
              fontSize: 12.5,
              fontFamily: T.font,
              color: T.ink900,
              outline: "none",
              width: 180,
              background: T.white,
            }}
          />
        </div>
      </div>

      {/* ── TIER 2: Group pills OR Sub-item pills (never both at once) ────── */}
      {catFilter !== "all" && activeGroups.length > 0 && (
        <>
          {/* ── GROUP pills row — always visible when world is selected ── */}
          <div
            style={{
              display: "flex",
              gap: 5,
              overflowX: "auto",
              paddingBottom: 5,
              paddingTop: 5,
              paddingLeft: 4,
              borderTop: `1px solid ${T.border}`,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                color: T.ink300,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginRight: 2,
                flexShrink: 0,
              }}
            >
              {PRODUCT_WORLDS.find((w) => w.id === catFilter)?.icon}{" "}
              {PRODUCT_WORLDS.find((w) => w.id === catFilter)?.label}:
            </span>
            {activeGroups.map((group) => {
              const cnt = groupCounts[group.id] || 0;
              const active = groupFilter === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 99,
                    cursor: "pointer",
                    border: `1.5px solid ${active ? T.accentMid : cnt > 0 ? T.accentLit : T.ink150}`,
                    background: active
                      ? T.accentMid
                      : cnt > 0
                        ? T.accentXlit
                        : T.ink50,
                    color: active ? "#fff" : cnt > 0 ? T.accentMid : T.ink300,
                    fontWeight: active ? 700 : 400,
                    fontSize: 12.5,
                    fontFamily: T.font,
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    opacity: cnt > 0 ? 1 : 0.5,
                    transition: "all 0.12s",
                  }}
                >
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                  <span
                    style={{
                      background: active
                        ? "rgba(255,255,255,0.28)"
                        : cnt > 0
                          ? T.accentLit
                          : T.ink50,
                      color: active ? "#fff" : cnt > 0 ? T.accentMid : T.ink300,
                      borderRadius: 99,
                      padding: "0 6px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {cnt}
                  </span>
                  <span style={{ fontSize: 8, opacity: active ? 0.9 : 0.4 }}>
                    {active ? "▼" : "▶"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── SUB-ITEM pills row — appears below when a group is clicked ── */}
          {groupFilter && activeSubs.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 4,
                overflowX: "auto",
                paddingBottom: 5,
                paddingTop: 5,
                paddingLeft: 20,
                borderTop: `1px dashed ${T.border}`,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: T.ink300,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginRight: 4,
                  flexShrink: 0,
                }}
              >
                {activeGroup?.icon} {activeGroup?.label}:
              </span>
              {activeSubs.map((sub) => {
                const active = subFilter === sub.id;
                const cnt = subCounts[sub.id] || 0;
                return (
                  <button
                    key={sub.id}
                    onClick={() => onSelectSub(sub.id)}
                    style={{
                      padding: "3px 11px",
                      borderRadius: 99,
                      border: `1.5px solid ${active ? T.blue : cnt > 0 ? T.borderDark : T.ink150}`,
                      background: active
                        ? T.blueLit
                        : cnt > 0
                          ? T.white
                          : T.ink50,
                      color: active ? T.blue : cnt > 0 ? T.ink700 : T.ink300,
                      fontWeight: active ? 700 : 400,
                      fontSize: 12,
                      cursor: cnt > 0 ? "pointer" : "default",
                      fontFamily: T.font,
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      opacity: cnt > 0 ? 1 : 0.45,
                      transition: "all 0.12s",
                    }}
                  >
                    <span>{sub.label}</span>
                    {cnt > 0 && (
                      <span
                        style={{
                          background: active ? T.blue + "20" : T.ink50,
                          color: active ? T.blue : T.ink400,
                          borderRadius: 99,
                          padding: "0 5px",
                          fontSize: 9.5,
                          fontWeight: 700,
                        }}
                      >
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Active filter chip ──────────────────────────────────────────── */}
      {subFilter && activeGroup && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingTop: 4,
            paddingLeft: 4,
          }}
        >
          <span style={{ fontSize: 11, color: T.ink400 }}>Filtered:</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 10px",
              borderRadius: 99,
              background: T.blueLit,
              border: `1px solid ${T.blue}20`,
              color: T.blue,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {activeGroup.icon} {activeGroup.label} →{" "}
            {activeSubs.find((s) => s.id === subFilter)?.label}
            <button
              onClick={() => onSelectSub(subFilter)}
              style={{
                background: "none",
                border: "none",
                color: T.blue,
                cursor: "pointer",
                fontSize: 13,
                padding: 0,
                opacity: 0.6,
              }}
            >
              ×
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TILE VIEW
// ─────────────────────────────────────────────────────────────────────────
function TileView({ items, onEdit, onDelete, onToggle, T }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
      }}
    >
      {items.map((item) => {
        const m = margin(item.sell_price, item.weighted_avg_cost);
        const soldOut = (item.quantity_on_hand || 0) === 0;
        const lowStock = !soldOut && (item.quantity_on_hand || 0) <= 3;
        return (
          <div
            key={item.id}
            style={{
              background: T.white,
              border: `1.5px solid ${item.is_active ? T.border : T.ink150}`,
              borderRadius: T.radius,
              overflow: "hidden",
              opacity: item.is_active ? 1 : 0.6,
              boxShadow: T.shadow,
              cursor: "pointer",
              transition: "box-shadow 0.15s, border-color 0.15s",
            }}
            onClick={() => onEdit(item)}
          >
            {/* Category banner */}
            <div
              style={{
                background: T.accentLit,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <span style={{ fontSize: 16 }}>
                {CATEGORY_ICONS[item.category] || "📦"}
              </span>
              {(() => {
                const w = PRODUCT_WORLDS.find(
                  (pw) => pw.id !== "all" && itemMatchesWorld(item, pw),
                );
                return (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.accentMid,
                    }}
                  >
                    {w
                      ? w.label
                      : CATEGORY_LABELS[item.category] || item.category}
                  </span>
                );
              })()}
              {item.is_featured && (
                <span style={{ marginLeft: "auto", fontSize: 10 }}>⭐</span>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: "12px 14px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: T.ink900,
                  marginBottom: 10,
                  lineHeight: 1.3,
                  minHeight: 32,
                }}
              >
                {item.name}
              </div>

              {/* Price + margin */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{ fontWeight: 800, fontSize: 15, color: T.accentMid }}
                >
                  {item.sell_price ? zar(item.sell_price) : "—"}
                </span>
                {m !== null && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: marginColor(m),
                    }}
                  >
                    {pct(m)}
                  </span>
                )}
              </div>

              {/* Stock indicator */}
              <div style={{ marginBottom: 10 }}>
                {soldOut ? (
                  <StockBadge
                    label="Sold Out"
                    bg={T.dangerLit}
                    color={T.danger}
                  />
                ) : lowStock ? (
                  <StockBadge
                    label={`Low: ${item.quantity_on_hand}`}
                    bg={T.amberLit}
                    color={T.amber}
                  />
                ) : (
                  <StockBadge
                    label={`${item.quantity_on_hand} in stock`}
                    bg={T.accentXlit}
                    color={T.accentMid}
                  />
                )}
              </div>

              {/* Cost */}
              {item.weighted_avg_cost > 0 && (
                <div style={{ fontSize: 11, color: T.ink400 }}>
                  Cost: {zar(item.weighted_avg_cost)}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div
              style={{
                display: "flex",
                borderTop: `1px solid ${T.border}`,
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <TileAction
                label="Edit"
                onClick={() => onEdit(item)}
                color={T.accent}
                T={T}
              />
              <TileAction
                label={item.is_active ? "Hide" : "Show"}
                onClick={() => onToggle(item, "is_active")}
                color={T.amber}
                T={T}
              />
              <TileAction
                label="Del"
                onClick={() => onDelete(item)}
                color={T.danger}
                T={T}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TileAction({ label, onClick, color, T }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1,
        padding: "7px 0",
        border: "none",
        background: hover ? color + "18" : "transparent",
        color: hover ? color : T.ink300,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: T.font,
        transition: "all 0.12s",
        borderRight: `1px solid ${T.border}`,
      }}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LIST VIEW (compact rows)
// ─────────────────────────────────────────────────────────────────────────
function ListView({ items, onEdit, onDelete, onToggle, T }) {
  return (
    <div
      style={{
        background: T.white,
        borderRadius: T.radius,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 110px 90px 90px 80px 90px",
          padding: "8px 14px",
          background: T.ink50,
          borderBottom: `1px solid ${T.border}`,
          fontSize: 11,
          fontWeight: 700,
          color: T.ink400,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <span></span>
        <span>Name</span>
        <span>Category</span>
        <span style={{ textAlign: "right" }}>On Hand</span>
        <span style={{ textAlign: "right" }}>Price</span>
        <span style={{ textAlign: "right" }}>Margin</span>
        <span style={{ textAlign: "center" }}>Actions</span>
      </div>

      {items.map((item, idx) => {
        const m = margin(item.sell_price, item.weighted_avg_cost);
        const soldOut = (item.quantity_on_hand || 0) === 0;
        return (
          <div
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 110px 90px 90px 80px 90px",
              padding: "9px 14px",
              alignItems: "center",
              background: idx % 2 === 0 ? T.white : T.bg,
              borderBottom: `1px solid ${T.border}`,
              opacity: item.is_active ? 1 : 0.55,
              cursor: "pointer",
            }}
            onClick={() => onEdit(item)}
          >
            {/* Icon */}
            <span style={{ fontSize: 18, textAlign: "center" }}>
              {CATEGORY_ICONS[item.category] || "📦"}
            </span>

            {/* Name */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink900 }}>
                {item.name}
              </div>
              {item.is_featured && (
                <span style={{ fontSize: 10, color: T.amber }}>
                  ⭐ Featured
                </span>
              )}
            </div>

            {/* Category */}
            <span
              style={{
                fontSize: 11,
                background: T.accentLit,
                color: T.accentMid,
                padding: "2px 8px",
                borderRadius: 99,
                fontWeight: 600,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {(() => {
                const w = PRODUCT_WORLDS.find(
                  (pw) => pw.id !== "all" && itemMatchesWorld(item, pw),
                );
                return w ? (
                  <>
                    <span style={{ fontSize: 12 }}>{w.icon}</span>
                    {w.label}
                  </>
                ) : (
                  CATEGORY_LABELS[item.category] || item.category
                );
              })()}
            </span>

            {/* Qty */}
            <span
              style={{
                textAlign: "right",
                fontSize: 13,
                fontWeight: 700,
                color: soldOut
                  ? T.danger
                  : item.quantity_on_hand <= 3
                    ? T.amber
                    : T.ink900,
              }}
            >
              {item.quantity_on_hand ?? 0}
            </span>

            {/* Price */}
            <span
              style={{
                textAlign: "right",
                fontSize: 13,
                fontWeight: 600,
                color: T.ink900,
              }}
            >
              {item.sell_price ? zar(item.sell_price) : "—"}
            </span>

            {/* Margin */}
            <span
              style={{
                textAlign: "right",
                fontSize: 12,
                fontWeight: 700,
                color: m !== null ? marginColor(m) : T.ink300,
              }}
            >
              {m !== null ? pct(m) : "—"}
            </span>

            {/* Actions */}
            <div
              style={{ display: "flex", gap: 4, justifyContent: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <SmallBtn
                label="Edit"
                onClick={() => onEdit(item)}
                color={T.accent}
                T={T}
              />
              <SmallBtn
                label="Del"
                onClick={() => onDelete(item)}
                color={T.danger}
                T={T}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DETAIL VIEW (Excel-style sortable + filterable table)
// ─────────────────────────────────────────────────────────────────────────
function DetailView({
  items,
  sortKey,
  sortDir,
  onSort,
  filterRowOpen,
  colFilters,
  onColFilter,
  onEdit,
  onDelete,
  onToggle,
  T,
}) {
  // ── Resizable columns — drag the border between headers ───────────────
  const [colWidths, setColWidths] = useState(() => {
    try {
      const s = sessionStorage.getItem("nuai_detail_col_widths");
      return s
        ? JSON.parse(s)
        : Object.fromEntries(DETAIL_COLS.map((c) => [c.key, c.width]));
    } catch {
      return Object.fromEntries(DETAIL_COLS.map((c) => [c.key, c.width]));
    }
  });
  const resizing = useRef(null);

  const startResize = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = {
      key: colKey,
      startX: e.clientX,
      startWidth: colWidths[colKey] || 120,
    };
    const onMove = (ev) => {
      if (!resizing.current) return;
      const newW = Math.max(
        50,
        resizing.current.startWidth + ev.clientX - resizing.current.startX,
      );
      setColWidths((prev) => {
        const next = { ...prev, [resizing.current.key]: newW };
        try {
          sessionStorage.setItem(
            "nuai_detail_col_widths",
            JSON.stringify(next),
          );
        } catch {}
        return next;
      });
    };
    const onUp = () => {
      resizing.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const totalWidth = DETAIL_COLS.reduce(
    (s, c) => s + (colWidths[c.key] || c.width),
    0,
  );

  return (
    <div
      style={{
        overflowX: "auto",
        overflowY: "auto",
        height: "100%",
        fontFamily: T.font,
      }}
    >
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          minWidth: totalWidth,
          fontSize: 12.5,
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          {DETAIL_COLS.map((col) => (
            <col
              key={col.key}
              style={{ width: colWidths[col.key] || col.width }}
            />
          ))}
        </colgroup>
        {/* Header */}
        <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <tr
            style={{
              background: T.ink50,
              borderBottom: `2px solid ${T.borderDark}`,
            }}
          >
            {DETAIL_COLS.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && onSort(col.key)}
                style={{
                  padding: "9px 10px",
                  textAlign: col.align || "left",
                  fontWeight: 700,
                  fontSize: 11,
                  color: sortKey === col.key ? T.accent : T.ink400,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  cursor: col.sortable ? "pointer" : "default",
                  userSelect: "none",
                  background: sortKey === col.key ? T.accentXlit : T.ink50,
                  position: "relative",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    paddingRight: col.key !== "_actions" ? 8 : 0,
                  }}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span style={{ marginLeft: 4 }}>
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </span>
                {/* Resize handle */}
                {col.key !== "_actions" && (
                  <span
                    onMouseDown={(e) => startResize(e, col.key)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column"
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 8,
                      height: "100%",
                      cursor: "col-resize",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.querySelector("i").style.background =
                        T.accentMid;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.querySelector("i").style.background =
                        T.borderDark;
                    }}
                  >
                    <i
                      style={{
                        display: "block",
                        width: 2,
                        height: "55%",
                        background: T.borderDark,
                        borderRadius: 1,
                        pointerEvents: "none",
                        transition: "background 0.12s",
                      }}
                    />
                  </span>
                )}
              </th>
            ))}
          </tr>

          {/* Column filter row */}
          {filterRowOpen && (
            <tr
              style={{
                background: T.white,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              {DETAIL_COLS.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "4px 6px",
                    borderRight: `1px solid ${T.border}`,
                  }}
                >
                  {col.key !== "_actions" &&
                  col.key !== "_margin" &&
                  col.key !== "is_active" &&
                  col.key !== "is_featured" ? (
                    <input
                      value={colFilters[col.key] || ""}
                      onChange={(e) => onColFilter(col.key, e.target.value)}
                      placeholder="Filter…"
                      style={{
                        width: "100%",
                        padding: "3px 6px",
                        border: `1px solid ${T.border}`,
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: T.font,
                        outline: "none",
                      }}
                    />
                  ) : (
                    <span />
                  )}
                </th>
              ))}
            </tr>
          )}
        </thead>

        <tbody>
          {items.map((item, idx) => {
            const m = margin(item.sell_price, item.weighted_avg_cost);
            const soldOut = (item.quantity_on_hand || 0) === 0;
            const rowBg = idx % 2 === 0 ? T.white : "#FCFCFB";
            return (
              <tr
                key={item.id}
                style={{
                  background: rowBg,
                  borderBottom: `1px solid ${T.border}`,
                  opacity: item.is_active ? 1 : 0.55,
                }}
                onDoubleClick={() => onEdit(item)}
              >
                {DETAIL_COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "7px 10px",
                      textAlign: col.align || "left",
                      borderRight: `1px solid ${T.border}`,
                      color: T.ink700,
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {col.key === "name" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>
                          {CATEGORY_ICONS[item.category] || "📦"}
                        </span>
                        <span style={{ fontWeight: 600, color: T.ink900 }}>
                          {item.name}
                        </span>
                        {item.is_featured && (
                          <span style={{ fontSize: 10 }}>⭐</span>
                        )}
                      </div>
                    )}
                    {col.key === "category" &&
                      (() => {
                        const w = PRODUCT_WORLDS.find(
                          (pw) => pw.id !== "all" && itemMatchesWorld(item, pw),
                        );
                        return (
                          <span
                            style={{
                              background: T.accentLit,
                              color: T.accentMid,
                              padding: "2px 8px",
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {w ? (
                              <>
                                <span style={{ fontSize: 13 }}>{w.icon}</span>
                                {w.label}
                              </>
                            ) : (
                              CATEGORY_LABELS[item.category] || item.category
                            )}
                          </span>
                        );
                      })()}
                    {col.key === "quantity_on_hand" && (
                      <span
                        style={{
                          fontWeight: 700,
                          color: soldOut
                            ? T.danger
                            : (item.quantity_on_hand || 0) <= 3
                              ? T.amber
                              : T.ink900,
                        }}
                      >
                        {item.quantity_on_hand ?? 0}
                      </span>
                    )}
                    {col.key === "sell_price" && (
                      <span style={{ fontWeight: 600 }}>
                        {item.sell_price ? zar(item.sell_price) : "—"}
                      </span>
                    )}
                    {col.key === "weighted_avg_cost" && (
                      <span>
                        {item.weighted_avg_cost
                          ? zar(item.weighted_avg_cost)
                          : "—"}
                      </span>
                    )}
                    {col.key === "_margin" && (
                      <span
                        style={{
                          fontWeight: 700,
                          color: m !== null ? marginColor(m) : T.ink300,
                        }}
                      >
                        {m !== null ? pct(m) : "—"}
                      </span>
                    )}
                    {col.key === "is_active" && (
                      <button
                        onClick={() => onToggle(item, "is_active")}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 99,
                          border: "none",
                          background: item.is_active
                            ? T.accentLit
                            : T.dangerLit,
                          color: item.is_active ? T.accentMid : T.danger,
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: T.font,
                        }}
                      >
                        {item.is_active ? "Active" : "Hidden"}
                      </button>
                    )}
                    {col.key === "is_featured" && (
                      <button
                        onClick={() => onToggle(item, "is_featured")}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 99,
                          border: "none",
                          background: item.is_featured ? T.amberLit : T.ink50,
                          color: item.is_featured ? T.amber : T.ink300,
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: T.font,
                        }}
                      >
                        {item.is_featured ? "⭐ Yes" : "No"}
                      </button>
                    )}
                    {col.key === "loyalty_category" && (
                      <span style={{ fontSize: 11, color: T.ink400 }}>
                        {item.loyalty_category || "—"}
                      </span>
                    )}
                    {col.key === "_actions" && (
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          justifyContent: "center",
                        }}
                      >
                        <SmallBtn
                          label="✎"
                          onClick={() => onEdit(item)}
                          color={T.accent}
                          T={T}
                          title="Edit"
                        />
                        <SmallBtn
                          label="✕"
                          onClick={() => onDelete(item)}
                          color={T.danger}
                          T={T}
                          title="Delete"
                        />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EDIT PANEL (right side slide-in)
// ─────────────────────────────────────────────────────────────────────────
function EditPanel({
  item,
  draft,
  onDraftChange,
  onSave,
  onClose,
  onDelete,
  saving,
  error,
  suppliers,
  T,
}) {
  return (
    <div
      style={{
        width: 380,
        background: T.white,
        borderLeft: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "-4px 0 16px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.ink900 }}>
            {CATEGORY_ICONS[item.category] || "📦"} Edit Item
          </div>
          <div style={{ fontSize: 11, color: T.ink400, marginTop: 1 }}>
            ID: {item.id?.slice(0, 8)}…
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
            color: T.ink400,
          }}
        >
          ×
        </button>
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        <ItemForm
          draft={draft}
          onChange={onDraftChange}
          error={error}
          saving={saving}
          onSave={onSave}
          onCancel={onClose}
          onDelete={onDelete}
          suppliers={suppliers}
          T={T}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ITEM FORM (shared between edit panel + add modal)
// ─────────────────────────────────────────────────────────────────────────
function ItemForm({
  draft,
  onChange,
  error,
  saving,
  onSave,
  onCancel,
  onDelete,
  suppliers,
  T,
  isNew,
}) {
  return (
    <div>
      {EDIT_FIELDS.map((field) => (
        <div key={field.key} style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              color: T.ink400,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {field.label}
            {field.required && <span style={{ color: T.danger }}> *</span>}
          </label>

          {field.type === "select" ? (
            <select
              value={draft[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              style={inputStyle(T)}
            >
              <option value="">— Select —</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {field.key === "category"
                    ? `${CATEGORY_ICONS[opt] || ""} ${CATEGORY_LABELS[opt] || opt}`
                    : opt}
                </option>
              ))}
            </select>
          ) : field.type === "boolean" ? (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(draft[field.key])}
                onChange={(e) => onChange(field.key, e.target.checked)}
                style={{ width: 16, height: 16, accentColor: T.accent }}
              />
              <span style={{ fontSize: 13, color: T.ink700 }}>
                {Boolean(draft[field.key]) ? "Yes" : "No"}
              </span>
            </label>
          ) : field.type === "textarea" ? (
            <textarea
              value={draft[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              rows={3}
              style={{ ...inputStyle(T), resize: "vertical", lineHeight: 1.5 }}
            />
          ) : (
            <input
              type={field.type}
              step={field.step}
              value={draft[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              style={inputStyle(T)}
            />
          )}
        </div>
      ))}

      {/* Supplier selector */}
      {suppliers?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              color: T.ink400,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Supplier
          </label>
          <select
            value={draft.supplier_id || ""}
            onChange={(e) => onChange("supplier_id", e.target.value)}
            style={inputStyle(T)}
          >
            <option value="">— No supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Margin preview */}
      {draft.sell_price > 0 && draft.weighted_avg_cost > 0 && (
        <div
          style={{
            background: T.accentXlit,
            border: `1px solid ${T.accentLit}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <span style={{ color: T.ink400 }}>Margin preview: </span>
          <span
            style={{
              fontWeight: 800,
              color: marginColor(
                margin(draft.sell_price, draft.weighted_avg_cost),
              ),
              fontSize: 15,
            }}
          >
            {pct(margin(draft.sell_price, draft.weighted_avg_cost))}
          </span>
          <span style={{ color: T.ink400, fontSize: 11, marginLeft: 8 }}>
            ({zar(draft.sell_price - draft.weighted_avg_cost)} GP per unit)
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: T.dangerLit,
            border: `1px solid #FCA5A5`,
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            color: T.danger,
            marginBottom: 12,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        {onDelete && !isNew && (
          <button
            onClick={onDelete}
            style={btnStyle(T.white, T.danger, T.danger, T, false, true)}
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          style={{
            ...btnStyle(T.white, T.ink500, T.border, T, false, true),
            flex: 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            ...btnStyle(T.accent, T.white, T.accent, T, true, true),
            flex: 2,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : isNew ? "Add Item" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VIEW TOGGLE
// ─────────────────────────────────────────────────────────────────────────
function ViewToggle({ current, onChange, T }) {
  const views = [
    { id: VIEW_TILE, label: "⊞", title: "Tile view" },
    { id: VIEW_LIST, label: "☰", title: "List view" },
    { id: VIEW_DETAIL, label: "⊟", title: "Detail / Excel view" },
  ];
  return (
    <div
      style={{
        display: "flex",
        border: `1.5px solid ${T.border}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {views.map((v, i) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          title={v.title}
          style={{
            padding: "5px 12px",
            border: "none",
            borderRight:
              i < views.length - 1 ? `1px solid ${T.border}` : "none",
            background: current === v.id ? T.accent : T.white,
            color: current === v.id ? T.white : T.ink500,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: T.font,
            transition: "all 0.12s",
          }}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MODAL wrapper
// ─────────────────────────────────────────────────────────────────────────
function Modal({ children, onClose, title, T, width = 480 }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.white,
          borderRadius: 14,
          width,
          maxHeight: "88vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: T.shadowLg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, color: T.ink900 }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: T.ink400,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "18px 20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#999" }}>{label}</span>
      <span
        style={{ fontSize: 14, fontWeight: 800, color: color || "#0D0D0D" }}
      >
        {value}
      </span>
    </div>
  );
}

function StockBadge({ label, bg, color }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        background: bg,
        color,
        padding: "2px 8px",
        borderRadius: 99,
        fontWeight: 700,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

function SmallBtn({ label, onClick, color, T, title }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "3px 8px",
        borderRadius: 5,
        border: `1px solid ${hover ? color : T.border}`,
        background: hover ? color + "15" : T.white,
        color: hover ? color : T.ink400,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: T.font,
        transition: "all 0.1s",
      }}
    >
      {label}
    </button>
  );
}

function LoadingState({ T }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 64,
        color: T.ink400,
        fontSize: 14,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>Loading inventory…
    </div>
  );
}

function ErrorState({ msg, T }) {
  return (
    <div
      style={{
        margin: 24,
        background: "#FEF2F2",
        border: "1px solid #FCA5A5",
        borderRadius: 10,
        padding: "16px 20px",
        color: "#DC2626",
        fontSize: 13,
      }}
    >
      ⚠️ {msg}
    </div>
  );
}

function EmptyState({ catFilter, search, onAdd, T }) {
  return (
    <div style={{ textAlign: "center", padding: 64, color: T.ink400 }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: T.ink500,
          marginBottom: 6,
        }}
      >
        {(() => {
          const world = PRODUCT_WORLDS.find((w) => w.id === catFilter);
          return search
            ? `No items match "${search}"`
            : catFilter !== "all"
              ? `No ${world?.label || catFilter} items yet`
              : "No inventory items";
        })()}
      </div>
      <div style={{ fontSize: 13, marginBottom: 20 }}>
        {catFilter !== "all" && !search
          ? "Items show here once tagged to this world in HQStock."
          : "Add your first item to get started."}
      </div>
      <button
        onClick={onAdd}
        style={btnStyle("#1A3D2B", "#fff", "#1A3D2B", T, true)}
      >
        + Add Item
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────
function inputStyle(T) {
  return {
    width: "100%",
    padding: "8px 10px",
    border: `1.5px solid ${T.border}`,
    borderRadius: 7,
    fontSize: 13,
    fontFamily: T.font,
    color: T.ink900,
    outline: "none",
    background: T.white,
    boxSizing: "border-box",
  };
}

function btnStyle(bg, color, borderColor, T, bold = false, full = false) {
  return {
    padding: "7px 16px",
    borderRadius: 7,
    border: `1.5px solid ${borderColor}`,
    background: bg,
    color,
    fontWeight: bold ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: T.font,
    width: full ? "100%" : "auto",
    whiteSpace: "nowrap",
  };
}
