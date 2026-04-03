// src/components/hq/SmartInventory.js — v1.4 (drag-drop + pill-scroll fix)
// LL-131: tenantId as prop only — never hardcoded
// LL-174: CATEGORY_LABELS, CATEGORY_ICONS from ProductWorlds.js
// Rule 0F: tenant_id on every INSERT/UPDATE

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import StockItemModal from "../StockItemModal";
import toast from "../../services/toast";
import StockItemPanel from "./StockItemPanel";
import {
  PRODUCT_WORLDS,
  itemMatchesWorld,
  CANNABIS_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from "./ProductWorlds";
import InfoTooltip from "../InfoTooltip";
import ReorderPanel from "./ReorderPanel";

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
  blueMid: "#1D4ED8",
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

const VIEW_TILE = "tile";
const VIEW_LIST = "list";
const VIEW_DETAIL = "detail";

const DETAIL_COLS = [
  {
    key: "_row",
    label: "#",
    width: 45,
    sortable: false,
    align: "center",
    system: true,
  },
  { key: "name", label: "Name", width: 220, sortable: true },
  { key: "sku", label: "SKU", width: 100, sortable: true, defaultHidden: true },
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
    tooltip: "sc_avg_cost",
  },
  {
    key: "_margin",
    label: "Margin %",
    width: 85,
    sortable: true,
    align: "right",
    tooltip: "sc_margin",
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
  {
    key: "reorder_level",
    label: "Reorder Lvl",
    width: 90,
    sortable: true,
    align: "right",
    defaultHidden: true,
  },
  {
    key: "max_stock_level",
    label: "Max Stock",
    width: 85,
    sortable: true,
    align: "right",
    defaultHidden: true,
  },
  {
    key: "supplier",
    label: "Supplier",
    width: 130,
    sortable: true,
    defaultHidden: true,
  },
  { key: "_actions", label: "", width: 80, sortable: false, align: "center" },
];

const PILL_HIERARCHY = {
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
            keywords: ["raw classic king", "raw black king", "raw 1.25"],
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
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewMode, setViewMode] = useState(VIEW_DETAIL);
  const [pillExpanded, setPillExpanded] = useState(false);
  const [tileSize, setTileSize] = useState("M");
  const [catFilter, setCatFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState(null);
  const [subFilter, setSubFilter] = useState(null);
  const [search, setSearch] = useState("");

  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [colFilters, setColFilters] = useState({});
  const [filterRowOpen, setFilterRowOpen] = useState(false);
  const [sortByIssues, setSortByIssues] = useState(false);

  const [hiddenCols, setHiddenCols] = useState(() => {
    try {
      const s = localStorage.getItem("nuai_detail_hidden_cols");
      return s
        ? new Set(JSON.parse(s))
        : new Set(["sku", "reorder_level", "max_stock_level", "supplier"]);
    } catch {
      return new Set(["sku", "reorder_level", "max_stock_level", "supplier"]);
    }
  });
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef(null);

  // SC-08 Bulk select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const onToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((i) => i.id))); // eslint-disable-line react-hooks/exhaustive-deps
  }, []); // filtered injected below via ref

  // eslint-disable-next-line no-unused-vars
  const [editItem, setEditItem] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [editDraft, setEditDraft] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [saveError, setSaveError] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [panelItem, setPanelItem] = useState(null);
  const [modalItem, setModalItem] = useState(undefined);
  const [modalDefaults, setModalDefaults] = useState({});
  const [modalSaving, setModalSaving] = useState(false);
  const [showWorldPicker, setShowWorldPicker] = useState(false);
  const [showReorderPanel, setShowReorderPanel] = useState(false);
  const searchRef = useRef(null);

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
    const loadedItems = iData || [];
    setItems(loadedItems);
    setSuppliers(sData || []);
    // UX: Auto-hide empty columns on first load (only if no saved preference)
    if (
      !localStorage.getItem("nuai_detail_hidden_cols") &&
      loadedItems.length > 0
    ) {
      const emptyKeys = DETAIL_COLS.filter((c) => {
        if (c.key.startsWith("_") || c.key === "name" || c.key === "category")
          return false;
        return !loadedItems.some((i) => {
          const v = i[c.key];
          return (
            v !== null && v !== undefined && v !== "" && v !== false && v !== 0
          );
        });
      }).map((c) => c.key);
      if (emptyKeys.length > 0) {
        const defaultHidden = new Set([
          "sku",
          "reorder_level",
          "max_stock_level",
          "supplier",
          ...emptyKeys,
        ]);
        setHiddenCols(defaultHidden);
        try {
          localStorage.setItem(
            "nuai_detail_hidden_cols",
            JSON.stringify([...defaultHidden]),
          );
        } catch {}
      }
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const [activePanel, setActivePanel] = useState(null);
  const [noPriceDraft, setNoPriceDraft] = useState({});
  const [noPriceFixed, setNoPriceFixed] = useState(new Set());
  const [noPriceSaving, setNoPriceSaving] = useState(new Set());
  const [flaggedReorder, setFlaggedReorder] = useState(new Set());
  const [onOrderSet, setOnOrderSet] = useState(new Set());
  const [onOrderSaving, setOnOrderSaving] = useState(new Set());

  const selectCat = useCallback((catId) => {
    setCatFilter(catId);
    setGroupFilter(null);
    setSubFilter(null);
    setSearch("");
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (modalItem !== undefined) return;
      if (selectMode) {
        exitSelectMode();
        return;
      }
      if (panelItem) {
        setPanelItem(null);
        return;
      }
      if (activePanel) {
        setActivePanel(null);
        return;
      }
      if (colPickerOpen) {
        setColPickerOpen(false);
        return;
      }
      if (subFilter) {
        setSubFilter(null);
        return;
      }
      if (groupFilter) {
        setGroupFilter(null);
        return;
      }
      if (catFilter !== "all") {
        selectCat("all");
        return;
      }
    };
    const onMouse = (e) => {
      if (
        colPickerOpen &&
        colPickerRef.current &&
        !colPickerRef.current.contains(e.target)
      )
        setColPickerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [
    colPickerOpen,
    panelItem,
    activePanel,
    modalItem,
    subFilter,
    groupFilter,
    catFilter,
    selectCat,
    selectMode,
    exitSelectMode,
  ]);

  const filtered = useMemo(() => {
    let list = items;
    if (catFilter !== "all") {
      const world = PRODUCT_WORLDS.find((w) => w.id === catFilter);
      if (world) list = list.filter((i) => itemMatchesWorld(i, world));
    }
    if (subFilter && catFilter !== "all" && PILL_HIERARCHY[catFilter]) {
      for (const group of PILL_HIERARCHY[catFilter].groups || []) {
        const sub = group.subs?.find((s) => s.id === subFilter);
        if (sub) {
          list = list.filter((i) =>
            sub.keywords.some((kw) =>
              i.name.toLowerCase().includes(kw.toLowerCase()),
            ),
          );
          break;
        }
      }
    }
    // SC-10: Smart search parser — supports tokens like price>500, qty:0, brand:RAW, cost<100, margin>50
    if (search.trim()) {
      const q = search.trim();
      const tokenRegex =
        /^(price|sell_price|cost|avg_cost|qty|quantity|stock|margin|brand|category|world|sku|name|supplier)\s*([><=:!]+)\s*(.+)$/i;
      const match = q.match(tokenRegex);
      if (match) {
        const [, rawField, op, rawVal] = match;
        const val = rawVal.trim().toLowerCase();
        const num = parseFloat(val);
        const fieldMap = {
          price: "sell_price",
          sell_price: "sell_price",
          cost: "weighted_avg_cost",
          avg_cost: "weighted_avg_cost",
          qty: "quantity_on_hand",
          quantity: "quantity_on_hand",
          stock: "quantity_on_hand",
          margin: "_margin",
          brand: "brand",
          category: "category",
          world: "category",
          sku: "sku",
          name: "name",
          supplier: "supplier",
        };
        const field =
          fieldMap[rawField.toLowerCase()] || rawField.toLowerCase();
        list = list.filter((i) => {
          if (field === "_margin") {
            const m = margin(i.sell_price, i.weighted_avg_cost);
            if (m === null) return false;
            if (op.includes(">")) return m > num;
            if (op.includes("<")) return m < num;
            if (op === ":" || op === "=") return Math.abs(m - num) < 1;
            return false;
          }
          if (field === "supplier") {
            const sName = (i.suppliers?.name || "").toLowerCase();
            return sName.includes(val);
          }
          const cellVal = i[field];
          if (cellVal === undefined || cellVal === null) return false;
          if (!isNaN(num) && typeof cellVal === "number") {
            if (op.includes(">") && op.includes("=")) return cellVal >= num;
            if (op.includes("<") && op.includes("=")) return cellVal <= num;
            if (op.includes(">")) return cellVal > num;
            if (op.includes("<")) return cellVal < num;
            if (op === ":" || op === "=" || op === "==") return cellVal === num;
            if (op === "!" || op === "!=") return cellVal !== num;
          }
          const str = String(cellVal).toLowerCase();
          if (op === ":" || op === "=") return str.includes(val);
          if (op === "!" || op === "!=") return !str.includes(val);
          return str.includes(val);
        });
      } else {
        const lq = q.toLowerCase();
        list = list.filter(
          (i) =>
            i.name?.toLowerCase().includes(lq) ||
            (CATEGORY_LABELS[i.category] || "").toLowerCase().includes(lq) ||
            i.loyalty_category?.toLowerCase().includes(lq) ||
            i.brand?.toLowerCase().includes(lq) ||
            i.sku?.toLowerCase().includes(lq) ||
            i.variant_value?.toLowerCase().includes(lq),
        );
      }
    }
    Object.entries(colFilters).forEach(([col, val]) => {
      if (!val) return;
      const v = val.toLowerCase();
      list = list.filter((i) =>
        String(i[col] ?? "")
          .toLowerCase()
          .includes(v),
      );
    });
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
    if (sortByIssues) {
      const score = (i) => {
        if ((i.quantity_on_hand || 0) === 0) return 2;
        if (
          (i.reorder_level || 0) > 0 &&
          (i.quantity_on_hand || 0) <= (i.reorder_level || 0)
        )
          return 1;
        return 0;
      };
      list.sort((a, b) => score(b) - score(a));
    }
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
    sortByIssues,
  ]);

  // Keep selectAll in sync with filtered
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const selectAllItems = useCallback(() => {
    setSelectedIds(new Set(filteredRef.current.map((i) => i.id)));
  }, []);

  function handleSort(key) {
    if (!key || key === "_actions" || key === "_row") return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // KPI stats
  const gTotal = items.length;
  const gActive = items.filter((i) => i.is_active).length;
  const gSoldOut = items.filter((i) => (i.quantity_on_hand || 0) === 0).length;
  const gStockValue = items.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
    0,
  );
  const gBelowReorder = items.filter(
    (i) =>
      (i.reorder_level || 0) > 0 &&
      (i.quantity_on_hand || 0) > 0 &&
      (i.quantity_on_hand || 0) <= (i.reorder_level || 0),
  ).length;
  const gNoPrice = items.filter(
    (i) => !i.sell_price || i.sell_price <= 0,
  ).length;
  const fTotal = filtered.length;
  const fActive = filtered.filter((i) => i.is_active).length;
  const fSoldOut = filtered.filter(
    (i) => (i.quantity_on_hand || 0) === 0,
  ).length;
  const fStockValue = filtered.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
    0,
  );
  const fBelowReorder = filtered.filter(
    (i) =>
      (i.reorder_level || 0) > 0 &&
      (i.quantity_on_hand || 0) > 0 &&
      (i.quantity_on_hand || 0) <= (i.reorder_level || 0),
  ).length;
  const fNoPrice = filtered.filter(
    (i) => !i.sell_price || i.sell_price <= 0,
  ).length;
  const isFiltered =
    catFilter !== "all" ||
    groupFilter ||
    subFilter ||
    search.trim() ||
    Object.values(colFilters).some((v) => v);

  const soldOutItems = items
    .filter((i) => (i.quantity_on_hand || 0) === 0)
    .sort(
      (a, b) =>
        (b.sell_price || 0) * (b.weighted_avg_cost || 0) -
        (a.sell_price || 0) * (a.weighted_avg_cost || 0),
    );
  const belowReorderItems = items.filter(
    (i) =>
      (i.reorder_level || 0) > 0 &&
      (i.quantity_on_hand || 0) > 0 &&
      (i.quantity_on_hand || 0) <= (i.reorder_level || 0),
  );
  const noPriceItems = items.filter((i) => !i.sell_price || i.sell_price <= 0);

  const saveNoPrice = async (itemId) => {
    const price = parseFloat(noPriceDraft[itemId]);
    if (!price || price <= 0) return;
    setNoPriceSaving((prev) => new Set([...prev, itemId]));
    const { error: priceErr } = await supabase
      .from("inventory_items")
      .update({ sell_price: price, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    setNoPriceSaving((prev) => {
      const n = new Set(prev);
      n.delete(itemId);
      return n;
    });
    if (priceErr) {
      toast.error("Failed to save price — check your connection");
      return;
    }
    setNoPriceFixed((prev) => new Set([...prev, itemId]));
    load();
    const item = items.find((i) => i.id === itemId);
    toast.success(`Sell price set${item ? ` — R${price}` : ""}`);
  };

  const handlePanelRefresh = async () => {
    load();
    if (panelItem) {
      const { data } = await supabase
        .from("inventory_items")
        .select("*, suppliers(name)")
        .eq("id", panelItem.id)
        .single();
      if (data) setPanelItem(data);
    }
  };

  const flagForReorder = async (itemId) => {
    try {
      await supabase
        .from("inventory_items")
        .update({ needs_reorder: true, updated_at: new Date().toISOString() })
        .eq("id", itemId);
    } catch {
      toast.error("Failed to flag for reorder — check your connection");
      return;
    }
    setFlaggedReorder((prev) => new Set([...prev, itemId]));
    toast.info("⚑ Flagged for reorder", {
      duration: 5000,
      undo: async () => {
        try {
          await supabase
            .from("inventory_items")
            .update({
              needs_reorder: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", itemId);
        } catch {}
        setFlaggedReorder((prev) => {
          const n = new Set(prev);
          n.delete(itemId);
          return n;
        });
      },
    });
  };

  const markOnOrder = async (itemId) => {
    setOnOrderSaving((prev) => new Set([...prev, itemId]));
    try {
      await supabase
        .from("inventory_items")
        .update({ on_order: true, updated_at: new Date().toISOString() })
        .eq("id", itemId);
    } catch {
      toast.error("Failed to mark as On Order — check your connection");
      setOnOrderSaving((prev) => {
        const n = new Set(prev);
        n.delete(itemId);
        return n;
      });
      return;
    }
    setOnOrderSet((prev) => new Set([...prev, itemId]));
    setOnOrderSaving((prev) => {
      const n = new Set(prev);
      n.delete(itemId);
      return n;
    });
    toast.info("📦 Marked as On Order");
  };

  const toggleCol = useCallback((key) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(
          "nuai_detail_hidden_cols",
          JSON.stringify([...next]),
        );
      } catch {}
      return next;
    });
  }, []);

  function openEdit(item) {
    setModalDefaults({});
    setModalItem(item);
  }
  function closeEdit() {
    setEditItem(null);
    setEditDraft({});
  }

  async function deleteItem(item) {
    const saved = { ...item };
    const { error: err } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", item.id);
    if (err) {
      toast.error(`Delete failed: ${err.message}`);
      return;
    }
    setDelConfirm(null);
    closeEdit();
    load();
    toast.warning(`"${item.name}" deleted`, {
      duration: 5000,
      undo: async () => {
        await supabase.from("inventory_items").insert(saved);
        load();
      },
    });
  }

  // SC-08 Bulk actions
  const bulkHide = async () => {
    const ids = [...selectedIds];
    const results = await Promise.all(
      ids.map((id) =>
        supabase
          .from("inventory_items")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", id),
      ),
    );
    const failed = results.filter((r) => r.error).length;
    load();
    exitSelectMode();
    if (failed > 0)
      toast.error(`${failed} item${failed > 1 ? "s" : ""} failed to update`);
    else
      toast.warning(
        `${ids.length} item${ids.length > 1 ? "s" : ""} hidden from shop`,
      );
  };
  const bulkShow = async () => {
    const ids = [...selectedIds];
    const results = await Promise.all(
      ids.map((id) =>
        supabase
          .from("inventory_items")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", id),
      ),
    );
    const failed = results.filter((r) => r.error).length;
    load();
    exitSelectMode();
    if (failed > 0)
      toast.error(`${failed} item${failed > 1 ? "s" : ""} failed to update`);
    else
      toast.success(
        `${ids.length} item${ids.length > 1 ? "s" : ""} made visible in shop`,
      );
  };
  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (
      !window.confirm(
        `Delete ${ids.length} item${ids.length > 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return;
    const results = await Promise.all(
      ids.map((id) => supabase.from("inventory_items").delete().eq("id", id)),
    );
    const failed = results.filter((r) => r.error).length;
    load();
    exitSelectMode();
    if (failed > 0)
      toast.error(`${failed} item${failed > 1 ? "s" : ""} failed to delete`);
    else
      toast.warning(`${ids.length} item${ids.length > 1 ? "s" : ""} deleted`);
  };

  function openAdd() {
    if (catFilter === "all") {
      setShowWorldPicker(true);
    } else {
      const world = PRODUCT_WORLDS.find((w) => w.id === catFilter);
      setModalDefaults({
        category: world?.enums?.[0] || "finished_product",
        subcategory: subFilter || "",
        world: catFilter,
        worldLabel: world?.label || catFilter,
      });
      setModalItem(null);
    }
  }

  const handleModalSave = async (payload) => {
    setModalSaving(true);
    try {
      if (modalItem && modalItem.id) {
        const { error: e } = await supabase
          .from("inventory_items")
          .update(payload)
          .eq("id", modalItem.id);
        if (e) throw e;
        toast.success(`"${modalItem.name}" updated`);
      } else {
        const { error: e } = await supabase
          .from("inventory_items")
          .insert(payload);
        if (e) throw e;
        toast.success(`"${payload.name || "Item"}" added to catalogue`);
      }
      setModalItem(undefined);
      setModalDefaults({});
      load();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Save failed — check your connection");
    } finally {
      setModalSaving(false);
    }
  };

  function exportCSV() {
    const visibleCols = DETAIL_COLS.filter(
      (c) => c.key !== "_actions" && c.key !== "_row" && !hiddenCols.has(c.key),
    );
    const sourceItems =
      selectedIds.size > 0
        ? filtered.filter((i) => selectedIds.has(i.id))
        : filtered;
    const headers = visibleCols.map((c) => c.label || c.key);
    const rows = sourceItems.map((item) =>
      visibleCols.map((c) => {
        if (c.key === "_margin") {
          const m = margin(item.sell_price, item.weighted_avg_cost);
          return m !== null ? m.toFixed(1) + "%" : "";
        }
        if (c.key === "supplier") return item.suppliers?.name || "";
        if (c.key === "is_active") return item.is_active ? "Active" : "Hidden";
        if (c.key === "is_featured") return item.is_featured ? "Yes" : "No";
        const val = item[c.key];
        if (val === null || val === undefined) return "";
        if (typeof val === "string" && val.includes(","))
          return `"${val.replace(/"/g, '""')}"`;
        return val;
      }),
    );
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const world = catFilter !== "all" ? `-${catFilter}` : "";
    const date = new Date().toISOString().slice(0, 10);
    const filename = `inventory${world}-${date}.csv`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sourceItems.length} items → ${filename}`);
  }

  async function quickToggle(item, field) {
    const newVal = !item[field];
    await supabase
      .from("inventory_items")
      .update({ [field]: newVal, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    load();
    if (field === "is_active") {
      if (!newVal)
        toast.warning(`"${item.name}" hidden from shop`, {
          duration: 5000,
          undo: async () => {
            await supabase
              .from("inventory_items")
              .update({ is_active: true, updated_at: new Date().toISOString() })
              .eq("id", item.id);
            load();
          },
        });
      else toast.success(`"${item.name}" visible in shop`);
    }
  }

  function selectGroup(groupId) {
    setGroupFilter(groupId);
  }
  function selectSub(subId) {
    setSubFilter(subId);
  }
  // eslint-disable-next-line no-unused-vars
  function selectBrand(brandId) {}

  const pickerCols = DETAIL_COLS.filter(
    (c) => c.key !== "_actions" && !c.system,
  );
  const shownCount = pickerCols.filter((c) => !hiddenCols.has(c.key)).length;

  return (
    <div
      className="nuai-catalog"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: T.font,
        background: "transparent",
      }}
    >
      <style>{`
        .nuai-catalog button, .nuai-catalog [role="button"], .nuai-catalog label { cursor: pointer; }
        .nuai-catalog input[type="text"], .nuai-catalog input[type="number"], .nuai-catalog input[type="search"], .nuai-catalog textarea { cursor: text; }
        .nuai-catalog input[type="checkbox"], .nuai-catalog input[type="radio"] { cursor: pointer; }
        .nuai-catalog [aria-disabled="true"], .nuai-catalog button:disabled { cursor: not-allowed; opacity: 0.5; }
        .nuai-select-tile { outline: 2.5px solid #2563EB !important; box-shadow: 0 0 0 4px #EFF6FF !important; }
        .nuai-select-row  { background: #EFF6FF !important; }
      `}</style>

      {/* ── TOP TOOLBAR ─────────────────────────────────────────────── */}
      <div
        style={{
          background: T.white,
          borderBottom: `1px solid ${T.border}`,
          padding: "10px 0 0",
          flexShrink: 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 17, color: T.ink900 }}>
            📦 Inventory
          </span>
          <div style={{ marginLeft: 12 }}>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search… or try price>500, qty:0, brand:RAW"
              style={{
                padding: "5px 12px",
                border: `1.5px solid ${search ? T.accent : T.border}`,
                borderRadius: 99,
                fontSize: 12.5,
                fontFamily: T.font,
                color: T.ink900,
                outline: "none",
                width: 320,
                background: T.white,
              }}
            />
            <InfoTooltip id="sc_search" />
          </div>

          {/* UX: Showing X of Y count + Clear all filters */}
          {isFiltered && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  color: T.ink400,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {filtered.length} of {items.length}
              </span>
              <button
                onClick={() => {
                  selectCat("all");
                  setGroupFilter(null);
                  setSubFilter(null);
                  setSearch("");
                  setColFilters({});
                  setFilterRowOpen(false);
                  setSortByIssues(false);
                  setPillExpanded(false);
                }}
                style={{
                  fontSize: 10,
                  color: T.danger,
                  background: T.dangerLit,
                  border: `1px solid ${T.danger}30`,
                  borderRadius: 99,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: T.font,
                  whiteSpace: "nowrap",
                }}
              >
                ✕ Clear
              </button>
            </div>
          )}

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <ViewToggle
              current={viewMode}
              onChange={(v) => {
                setViewMode(v);
                exitSelectMode();
              }}
              T={T}
            />
            {viewMode === VIEW_TILE && !selectMode && (
              <div
                style={{
                  display: "flex",
                  border: `1.5px solid ${T.border}`,
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {["S", "M", "L"].map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setTileSize(s)}
                    style={{
                      padding: "5px 10px",
                      border: "none",
                      borderRight: i < 2 ? `1px solid ${T.border}` : "none",
                      background: tileSize === s ? T.accent : T.white,
                      color: tileSize === s ? T.white : T.ink500,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: T.font,
                      transition: "all 0.12s",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {!selectMode && (
              <button
                onClick={() => setFilterRowOpen((v) => !v)}
                style={btnStyle(
                  filterRowOpen || sortByIssues ? T.accent : T.white,
                  filterRowOpen || sortByIssues ? T.white : T.ink500,
                  T.border,
                  T,
                )}
              >
                🔽 Filters{sortByIssues ? " ·⚠" : ""}
              </button>
            )}
            {viewMode === VIEW_DETAIL && !selectMode && (
              <button
                onClick={exportCSV}
                style={btnStyle(T.white, T.ink500, T.border, T)}
                title="Export visible columns to CSV"
              >
                ↓ CSV
              </button>
            )}
            {viewMode === VIEW_DETAIL && !selectMode && (
              <div style={{ position: "relative" }} ref={colPickerRef}>
                <button
                  onClick={() => setColPickerOpen((v) => !v)}
                  style={btnStyle(
                    colPickerOpen ? T.accent : T.white,
                    colPickerOpen ? T.white : T.ink500,
                    T.border,
                    T,
                  )}
                >
                  Columns ({shownCount} shown)
                </button>
                {colPickerOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      right: 0,
                      background: T.white,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                      zIndex: 500,
                      padding: "6px 0",
                      minWidth: 210,
                    }}
                  >
                    <div
                      style={{
                        padding: "4px 14px 6px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.ink400,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Show / hide columns
                    </div>
                    {pickerCols.map((col) => {
                      const isHidden = hiddenCols.has(col.key);
                      const hasData = items.some((i) => {
                        if (col.key.startsWith("_")) return true;
                        const v = i[col.key];
                        return (
                          v !== null &&
                          v !== undefined &&
                          v !== "" &&
                          v !== false &&
                          v !== 0
                        );
                      });
                      return (
                        <label
                          key={col.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "5px 14px",
                            cursor: "pointer",
                            fontSize: 13,
                            color: T.ink700,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = T.accentXlit)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <input
                            type="checkbox"
                            checked={!isHidden}
                            onChange={() => toggleCol(col.key)}
                            style={{ accentColor: T.accent, flexShrink: 0 }}
                          />
                          <span style={{ flex: 1 }}>
                            {col.label || col.key}
                          </span>
                          {!hasData && (
                            <span
                              style={{
                                fontSize: 10,
                                color: T.amber,
                                fontWeight: 600,
                              }}
                            >
                              no data
                            </span>
                          )}
                        </label>
                      );
                    })}
                    <div
                      style={{
                        borderTop: `1px solid ${T.border}`,
                        margin: "4px 0",
                      }}
                    />
                    <button
                      onClick={() => {
                        const emptyKeys = pickerCols
                          .filter(
                            (c) =>
                              !items.some((i) => {
                                const v = i[c.key];
                                return (
                                  v !== null &&
                                  v !== undefined &&
                                  v !== "" &&
                                  v !== false &&
                                  v !== 0
                                );
                              }),
                          )
                          .map((c) => c.key);
                        setHiddenCols((prev) => {
                          const next = new Set([...prev, ...emptyKeys]);
                          try {
                            localStorage.setItem(
                              "nuai_detail_hidden_cols",
                              JSON.stringify([...next]),
                            );
                          } catch {}
                          return next;
                        });
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "5px 14px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        fontSize: 12,
                        color: T.amber,
                        cursor: "pointer",
                        fontFamily: T.font,
                        fontWeight: 600,
                      }}
                    >
                      Hide columns with no data
                    </button>
                    <button
                      onClick={() => {
                        setHiddenCols(new Set());
                        try {
                          localStorage.removeItem("nuai_detail_hidden_cols");
                        } catch {}
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "5px 14px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        fontSize: 12,
                        color: T.ink400,
                        cursor: "pointer",
                        fontFamily: T.font,
                      }}
                    >
                      Show all columns
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={load}
              style={btnStyle(T.white, T.ink500, T.border, T)}
            >
              ↺
            </button>
            {/* SC-08: Select mode toggle */}
            <button
              onClick={() => {
                if (selectMode) exitSelectMode();
                else setSelectMode(true);
              }}
              title={
                selectMode ? "Exit selection mode" : "Select multiple items"
              }
              style={btnStyle(
                selectMode ? T.blue : T.white,
                selectMode ? T.white : T.ink500,
                selectMode ? T.blue : T.border,
                T,
              )}
            >
              {selectMode ? "✕ Cancel" : "☑ Select"}
            </button>
            {!selectMode && <InfoTooltip id="sc_bulk_select" size="sm" />}
            {!selectMode && (
              <button
                onClick={() => setShowReorderPanel(true)}
                style={btnStyle(T.white, T.amber, T.amber + "60", T)}
              >
                ⚑ Reorder
                {gSoldOut + gBelowReorder > 0
                  ? ` (${gSoldOut + gBelowReorder})`
                  : ""}
              </button>
            )}
            {!selectMode && (
              <button
                onClick={openAdd}
                style={btnStyle(T.accent, T.white, T.accent, T, true)}
              >
                + Add Item
              </button>
            )}
          </div>
        </div>

        {/* SC-08 Bulk action bar */}
        {selectMode && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0 10px",
              borderTop: `1px solid ${T.border}`,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: selectedIds.size > 0 ? T.blue : T.ink400,
              }}
            >
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "Click items to select"}
            </span>
            <button
              onClick={selectAllItems}
              style={{
                ...btnStyle(T.white, T.blue, T.blue + "60", T),
                fontSize: 12,
              }}
            >
              Select all ({fTotal})
            </button>
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{
                    ...btnStyle(T.white, T.ink400, T.border, T),
                    fontSize: 12,
                  }}
                >
                  Clear
                </button>
                <div style={{ width: 1, height: 20, background: T.border }} />
                <button
                  onClick={bulkShow}
                  style={{
                    ...btnStyle(
                      T.accentLit,
                      T.accentMid,
                      T.accentMid + "40",
                      T,
                    ),
                    fontSize: 12,
                  }}
                >
                  👁 Show ({selectedIds.size})
                </button>
                <button
                  onClick={bulkHide}
                  style={{
                    ...btnStyle(T.amberLit, T.amber, T.amber + "40", T),
                    fontSize: 12,
                  }}
                >
                  🚫 Hide ({selectedIds.size})
                </button>
                <button
                  onClick={exportCSV}
                  style={{
                    ...btnStyle(T.white, T.ink500, T.border, T),
                    fontSize: 12,
                  }}
                >
                  ↓ Export ({selectedIds.size})
                </button>
                <button
                  onClick={bulkDelete}
                  style={{
                    ...btnStyle(T.dangerLit, T.danger, T.danger + "40", T),
                    fontSize: 12,
                  }}
                >
                  🗑 Delete ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        )}

        {/* KPI Cards */}
        {!selectMode && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
              marginTop: 2,
            }}
          >
            {[
              {
                key: "total",
                label: "Total Items",
                global: gTotal,
                filtered: fTotal,
                color: T.ink700,
                bg: T.ink50,
                border: T.border,
                onClick: () => {
                  selectCat("all");
                  setGroupFilter(null);
                  setSubFilter(null);
                  setSearch("");
                  setColFilters({});
                  setFilterRowOpen(false);
                  setPillExpanded(false);
                },
                title: "Click to clear all filters",
              },
              {
                key: "value",
                label: "Stock Value",
                tooltip: "sc_stock_value",
                global: `R${gStockValue >= 1000000 ? (gStockValue / 1000000).toFixed(1) + "m" : (gStockValue / 1000).toFixed(0) + "k"}`,
                filtered: `R${fStockValue >= 1000000 ? (fStockValue / 1000000).toFixed(1) + "m" : (fStockValue / 1000).toFixed(0) + "k"}`,
                color: T.blue,
                bg: T.blueLit,
                border: T.blue + "30",
              },
              {
                key: "active",
                label: "Active",
                global: gActive,
                filtered: fActive,
                color: T.accentMid,
                bg: T.accentLit,
                border: T.accentBd,
              },
              {
                key: "soldout",
                label: "Sold Out",
                global: gSoldOut,
                filtered: fSoldOut,
                color: gSoldOut > 0 ? T.danger : T.ink300,
                bg: gSoldOut > 0 ? T.dangerLit : T.ink50,
                border: gSoldOut > 0 ? T.danger + "30" : T.border,
                urgent: gSoldOut > 0,
                onClick:
                  gSoldOut > 0 ? () => setActivePanel("soldout") : undefined,
                title: "View sold-out items",
              },
              {
                key: "reorder",
                label: "Below Reorder",
                global: gBelowReorder,
                filtered: fBelowReorder,
                color: gBelowReorder > 0 ? T.amber : T.ink300,
                bg: gBelowReorder > 0 ? T.amberLit : T.ink50,
                border: gBelowReorder > 0 ? T.amber + "40" : T.border,
                urgent: gBelowReorder > 0,
                onClick:
                  gBelowReorder > 0
                    ? () => setActivePanel("reorder")
                    : undefined,
                title: "Flag items for reorder",
              },
              {
                key: "noprice",
                label: "No Price",
                global: gNoPrice,
                filtered: fNoPrice,
                color: gNoPrice > 0 ? T.danger : T.ink300,
                bg: gNoPrice > 0 ? T.dangerLit : T.ink50,
                border: gNoPrice > 0 ? T.danger + "30" : T.border,
                urgent: gNoPrice > 0,
                onClick:
                  gNoPrice > 0 ? () => setActivePanel("noprice") : undefined,
                title: "Add prices to hidden items",
              },
            ].map((card) => (
              <div
                key={card.key}
                onClick={card.onClick}
                title={card.onClick ? card.title : undefined}
                style={{
                  flex: "1 1 120px",
                  minWidth: 110,
                  maxWidth: 200,
                  background: card.bg,
                  border: `1.5px solid ${card.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: card.onClick ? "pointer" : "default",
                  transition: "all 0.12s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (card.onClick) e.currentTarget.style.opacity = "0.85";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: card.color,
                  }}
                >
                  {card.global}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    marginTop: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  {card.label}
                  {card.tooltip && <InfoTooltip id={card.tooltip} />}
                </div>
                {isFiltered && (
                  <div
                    style={{
                      fontSize: 10,
                      color: card.color,
                      marginTop: 3,
                      fontWeight: 700,
                      opacity: 0.85,
                    }}
                  >
                    {card.filtered} in filter
                  </div>
                )}
                {card.onClick && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 10,
                      fontSize: 14,
                      color: card.color,
                      opacity: 0.5,
                    }}
                  >
                    ›
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {filterRowOpen && !selectMode && (
          <div
            style={{
              padding: "8px 0 10px",
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                fontSize: 12,
                color: T.ink700,
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={sortByIssues}
                onChange={() => setSortByIssues((v) => !v)}
                style={{ accentColor: T.accent, width: 14, height: 14 }}
              />
              <span>⚠ Issues first</span>
              <span style={{ fontSize: 10.5, color: T.ink300 }}>
                sold out + low stock at top
              </span>
            </label>
            {sortByIssues && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: T.amberLit,
                  color: T.amber,
                  padding: "2px 8px",
                  borderRadius: 99,
                  border: `1px solid ${T.amber}40`,
                }}
              >
                ⚠ Active — {gSoldOut + gBelowReorder} items flagged
              </span>
            )}
          </div>
        )}

        <SmartPillBox
          catFilter={catFilter}
          groupFilter={groupFilter}
          subFilter={subFilter}
          onSelectCat={selectCat}
          onSelectGroup={selectGroup}
          onSelectSub={selectSub}
          items={items}
          T={T}
          pillExpanded={pillExpanded}
          onExpandPills={() => setPillExpanded(true)}
          onCollapsePills={() => setPillExpanded(false)}
        />
      </div>

      {/* ── CONTENT AREA ─────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          position: "relative",
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: viewMode === VIEW_DETAIL ? "hidden" : "auto",
            padding: viewMode === VIEW_DETAIL ? "12px 0 0 0" : "16px 0",
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
              isFiltered={isFiltered}
              onClearAll={() => {
                selectCat("all");
                setGroupFilter(null);
                setSubFilter(null);
                setSearch("");
                setColFilters({});
                setFilterRowOpen(false);
                setSortByIssues(false);
                setPillExpanded(false);
              }}
              T={T}
            />
          ) : viewMode === VIEW_TILE ? (
            <TileView
              items={filtered}
              onEdit={openEdit}
              onDelete={(item) => setDelConfirm(item)}
              onToggle={quickToggle}
              onOpenPanel={setPanelItem}
              tileSize={tileSize}
              T={T}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
            />
          ) : viewMode === VIEW_LIST ? (
            <ListView
              items={filtered}
              onEdit={openEdit}
              onDelete={(item) => setDelConfirm(item)}
              onToggle={quickToggle}
              onOpenPanel={setPanelItem}
              T={T}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
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
              hiddenCols={hiddenCols}
              onOpenPanel={setPanelItem}
              T={T}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
            />
          )}
        </div>
      </div>

      {/* ── SC-01 ACTION PANELS ───────────────────────────────────────── */}
      {activePanel && (
        <div
          onClick={() => setActivePanel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 350,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 420,
              background: T.white,
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.14)",
              fontFamily: T.font,
            }}
          >
            <div
              style={{
                padding: "18px 20px 14px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.ink900 }}>
                  {activePanel === "soldout" &&
                    `Sold Out · ${soldOutItems.length} items`}
                  {activePanel === "reorder" &&
                    `Below Reorder · ${belowReorderItems.length} items`}
                  {activePanel === "noprice" &&
                    `No Sell Price · ${noPriceItems.length} items`}
                </div>
                <div style={{ fontSize: 11, color: T.ink400, marginTop: 3 }}>
                  {activePanel === "soldout" &&
                    "Sorted by potential revenue lost"}
                  {activePanel === "reorder" &&
                    "Items running below minimum stock level"}
                  {activePanel === "noprice" &&
                    "These items are hidden from your shop"}
                </div>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: T.ink400,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {activePanel === "soldout" &&
                (soldOutItems.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: T.ink300,
                      fontSize: 13,
                    }}
                  >
                    🎉 No sold-out items
                  </div>
                ) : (
                  soldOutItems.map((item) => {
                    const world = PRODUCT_WORLDS.find(
                      (w) => w.id !== "all" && itemMatchesWorld(item, w),
                    );
                    const isOnOrder = onOrderSet.has(item.id);
                    const isSavingOrder = onOrderSaving.has(item.id);
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "12px 20px",
                          borderBottom: `1px solid ${T.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: isOnOrder ? "#FFFBEB" : T.white,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>
                          {world?.icon || "📦"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.ink900,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: T.ink400,
                              marginTop: 2,
                            }}
                          >
                            Sell:{" "}
                            {item.sell_price ? `R${item.sell_price}` : "—"}
                            {item.sell_price && item.weighted_avg_cost
                              ? ` · Cost: R${item.weighted_avg_cost}`
                              : ""}
                          </div>
                        </div>
                        {isOnOrder ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: T.amber,
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: T.amberLit,
                              border: `1px solid ${T.amber}40`,
                              flexShrink: 0,
                            }}
                          >
                            📦 On Order
                          </span>
                        ) : (
                          <div
                            style={{ display: "flex", gap: 6, flexShrink: 0 }}
                          >
                            <button
                              onClick={() =>
                                !isSavingOrder && markOnOrder(item.id)
                              }
                              disabled={isSavingOrder}
                              style={{
                                padding: "5px 10px",
                                borderRadius: 6,
                                border: `1px solid ${T.amber}60`,
                                background: T.amberLit,
                                color: T.amber,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: T.font,
                              }}
                            >
                              {isSavingOrder ? "…" : "On Order"}
                            </button>
                            <button
                              onClick={() => openEdit(item)}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 6,
                                border: `1px solid ${T.accentBd}`,
                                background: T.accentLit,
                                color: T.accentMid,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: T.font,
                              }}
                            >
                              Receive Stock
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ))}
              {activePanel === "reorder" &&
                (belowReorderItems.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: T.ink300,
                      fontSize: 13,
                    }}
                  >
                    ✓ All items above reorder level
                  </div>
                ) : (
                  belowReorderItems.map((item) => {
                    const world = PRODUCT_WORLDS.find(
                      (w) => w.id !== "all" && itemMatchesWorld(item, w),
                    );
                    const isFlagged = flaggedReorder.has(item.id);
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "12px 20px",
                          borderBottom: `1px solid ${T.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>
                          {world?.icon || "📦"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.ink900,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, marginTop: 2 }}>
                            <span style={{ color: T.amber, fontWeight: 700 }}>
                              {item.quantity_on_hand || 0} remaining
                            </span>
                            <span style={{ color: T.ink400 }}>
                              {" "}
                              · reorder at {item.reorder_level}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => !isFlagged && flagForReorder(item.id)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            flexShrink: 0,
                            border: `1px solid ${isFlagged ? T.accentBd : T.amber + "60"}`,
                            background: isFlagged ? T.accentLit : T.amberLit,
                            color: isFlagged ? T.accentMid : T.amber,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: isFlagged ? "default" : "pointer",
                            fontFamily: T.font,
                          }}
                        >
                          {isFlagged ? "✓ Flagged" : "⚑ Flag for Reorder"}
                        </button>
                      </div>
                    );
                  })
                ))}
              {activePanel === "noprice" &&
                (noPriceItems.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: T.ink300,
                      fontSize: 13,
                    }}
                  >
                    ✓ All items have a sell price
                  </div>
                ) : (
                  noPriceItems.map((item) => {
                    const world = PRODUCT_WORLDS.find(
                      (w) => w.id !== "all" && itemMatchesWorld(item, w),
                    );
                    const isFixed = noPriceFixed.has(item.id);
                    const isSaving = noPriceSaving.has(item.id);
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "12px 20px",
                          borderBottom: `1px solid ${T.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: isFixed ? "#F0FDF4" : T.white,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>
                          {world?.icon || "📦"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.ink900,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.name}
                          </div>
                          {item.weighted_avg_cost > 0 && (
                            <div
                              style={{
                                fontSize: 11,
                                color: T.ink400,
                                marginTop: 2,
                              }}
                            >
                              Avg cost: R{item.weighted_avg_cost} (reference)
                            </div>
                          )}
                        </div>
                        {isFixed ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#2D6A4F",
                              flexShrink: 0,
                            }}
                          >
                            ✓ Fixed
                          </span>
                        ) : (
                          <div
                            style={{ display: "flex", gap: 4, flexShrink: 0 }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                border: `1px solid ${T.border}`,
                                borderRadius: 6,
                                overflow: "hidden",
                              }}
                            >
                              <span
                                style={{
                                  padding: "5px 6px 5px 8px",
                                  fontSize: 12,
                                  color: T.ink400,
                                  background: T.ink50,
                                }}
                              >
                                R
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={noPriceDraft[item.id] || ""}
                                onChange={(e) =>
                                  setNoPriceDraft((p) => ({
                                    ...p,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" && saveNoPrice(item.id)
                                }
                                style={{
                                  width: 72,
                                  padding: "5px 6px",
                                  border: "none",
                                  fontSize: 12,
                                  outline: "none",
                                  fontFamily: T.font,
                                }}
                              />
                            </div>
                            <button
                              onClick={() => saveNoPrice(item.id)}
                              disabled={!noPriceDraft[item.id] || isSaving}
                              style={{
                                padding: "5px 10px",
                                borderRadius: 6,
                                border: "none",
                                background: noPriceDraft[item.id]
                                  ? T.accent
                                  : T.ink150,
                                color: noPriceDraft[item.id]
                                  ? "#fff"
                                  : T.ink300,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: noPriceDraft[item.id]
                                  ? "pointer"
                                  : "not-allowed",
                                fontFamily: T.font,
                              }}
                            >
                              {isSaving ? "…" : "Save"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WORLD PICKER ──────────────────────────────────────────────── */}
      {showWorldPicker && (
        <div
          onClick={() => setShowWorldPicker(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 28,
              width: 580,
              maxWidth: "95vw",
              fontFamily: T.font,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: T.ink900,
                    marginBottom: 4,
                  }}
                >
                  What are you adding?
                </div>
                <div style={{ fontSize: 12, color: T.ink400 }}>
                  Choose a product type — the form adapts with the right fields
                </div>
              </div>
              <button
                onClick={() => setShowWorldPicker(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: T.ink400,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {PRODUCT_WORLDS.filter((w) => w.id !== "all").map((world) => (
                <div
                  key={world.id}
                  onClick={() => {
                    setShowWorldPicker(false);
                    setModalDefaults({
                      category: world.enums?.[0] || "finished_product",
                      subcategory: world.subs?.[0] || "",
                      world: world.id,
                      worldLabel: world.label,
                    });
                    setModalItem(null);
                  }}
                  style={{
                    padding: "14px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.ink150}`,
                    cursor: "pointer",
                    textAlign: "center",
                    background: "#fff",
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = T.accent;
                    e.currentTarget.style.background = T.accentLit;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = T.ink150;
                    e.currentTarget.style.background = "#fff";
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>
                    {world.icon || "📦"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.ink900,
                      marginBottom: 3,
                    }}
                  >
                    {world.label}
                  </div>
                  <div
                    style={{ fontSize: 10, color: T.ink400, lineHeight: 1.4 }}
                  >
                    {world.desc || world.enums?.[0]?.replace(/_/g, " ") || ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SC-02: STOCK ITEM PANEL ───────────────────────────────────── */}
      {panelItem && !selectMode && (
        <StockItemPanel
          item={panelItem}
          onClose={() => setPanelItem(null)}
          onEdit={() => openEdit(panelItem)}
          onRefresh={handlePanelRefresh}
        />
      )}

      {/* ── STOCKITEMMODAL ────────────────────────────────────────────── */}
      {modalItem !== undefined && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              pointerEvents: "all",
            }}
          >
            <StockItemModal
              item={modalItem || null}
              defaults={modalDefaults}
              suppliers={suppliers}
              visibleCategories={[
                "flower",
                "concentrate",
                "edible",
                "accessory",
                "finished_product",
                "hardware",
                "raw_material",
              ]}
              onSave={handleModalSave}
              onCancel={() => {
                setModalItem(undefined);
                setModalDefaults({});
              }}
              saving={modalSaving}
            />
          </div>
        </div>
      )}

      {/* ── REORDER PANEL ────────────────────────────────────────────── */}
      {showReorderPanel && (
        <ReorderPanel
          tenantId={tenantId}
          onClose={() => setShowReorderPanel(false)}
          onComplete={() => {
            load();
            setShowReorderPanel(false);
          }}
        />
      )}

      {/* ── DELETE CONFIRM ────────────────────────────────────────────── */}
      {delConfirm && (
        <Modal
          onClose={() => setDelConfirm(null)}
          title="Delete Item"
          T={T}
          width={380}
          preventBackdropDismiss
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
// ─────────────────────────────────────────────────────────────────────────
function SmartPillBox({
  catFilter,
  groupFilter,
  subFilter,
  onSelectCat,
  onSelectGroup,
  onSelectSub,
  items,
  T,
  pillExpanded,
  onExpandPills,
  onCollapsePills,
}) {
  const counts = useMemo(() => {
    const m = { all: items.length };
    PRODUCT_WORLDS.filter((w) => w.id !== "all").forEach((w) => {
      m[w.id] = items.filter((i) => itemMatchesWorld(i, w)).length;
    });
    return m;
  }, [items]);

  // eslint-disable-next-line no-unused-vars
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

  const subCounts = useMemo(() => {
    if (catFilter === "all" || !PILL_HIERARCHY[catFilter]) return {};
    const world = PRODUCT_WORLDS.find((w) => w.id === catFilter);
    const catItems = world
      ? items.filter((i) => itemMatchesWorld(i, world))
      : [];
    const m = {};
    (PILL_HIERARCHY[catFilter].groups || []).forEach((group) => {
      (group.subs || []).forEach((sub) => {
        m[sub.id] = catItems.filter((item) =>
          sub.keywords.some((kw) =>
            item.name.toLowerCase().includes(kw.toLowerCase()),
          ),
        ).length;
      });
    });
    return m;
  }, [items, catFilter]);

  const activeGroups =
    catFilter !== "all" ? PILL_HIERARCHY[catFilter]?.groups || [] : [];
  const navLevel = !pillExpanded ? 0 : catFilter === "all" ? 1 : 2;
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
  const navBtnStyle = {
    padding: "4px 11px",
    borderRadius: 99,
    border: `1.5px solid ${T.borderDark}`,
    background: T.white,
    color: T.ink500,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    transition: "all 0.12s",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ paddingBottom: 4 }}>
      <style>{`.nuai-pill-row::-webkit-scrollbar{display:none;}.nuai-pill-row{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
      <div
        className="nuai-pill-row"
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "nowrap",
          overflowX: "auto",
          paddingBottom: 6,
          alignItems: "center",
        }}
      >
        <button
          onClick={() => {
            onSelectCat("all");
            onCollapsePills();
          }}
          style={pillBase(navLevel === 0, T.accent, T)}
        >
          <span>●</span>
          <span>All</span>
          <span style={countBadge(counts.all, navLevel === 0)}>
            {counts.all}
          </span>
        </button>
        {navLevel === 0 && (
          <button onClick={onExpandPills} style={pillBase(false, T.accent, T)}>
            <span>🗂</span>
            <span>Categories</span>
            <span style={countBadge(14, false)}>14</span>
            <span style={{ fontSize: 8, opacity: 0.4 }}>▼</span>
          </button>
        )}
        {navLevel === 1 && (
          <>
            <button onClick={onCollapsePills} style={navBtnStyle}>
              ‹ Back
            </button>
            {PRODUCT_WORLDS.filter((w) => w.id !== "all").map((w) => {
              const cnt = counts[w.id] || 0;
              return (
                <button
                  key={w.id}
                  onClick={() => onSelectCat(w.id)}
                  style={pillBase(false, T.accent, T)}
                >
                  <span>{w.icon || "📦"}</span>
                  <span>{w.label}</span>
                  <span style={countBadge(cnt, false)}>{cnt}</span>
                </button>
              );
            })}
          </>
        )}
        {navLevel === 2 &&
          (() => {
            const world = PRODUCT_WORLDS.find((w) => w.id === catFilter);
            return (
              <>
                <button
                  onClick={() => {
                    onSelectCat("all");
                    onExpandPills();
                  }}
                  style={navBtnStyle}
                >
                  ‹ Back
                </button>
                <button
                  style={{ ...pillBase(true, T.accent, T), cursor: "default" }}
                >
                  <span>{world?.icon || "📦"}</span>
                  <span>{world?.label || catFilter}</span>
                  <span style={countBadge(counts[catFilter] || 0, true)}>
                    {counts[catFilter] || 0}
                  </span>
                </button>
              </>
            );
          })()}
        {navLevel > 0 && (
          <button
            onClick={() => {
              onSelectCat("all");
              onCollapsePills();
            }}
            style={{
              ...navBtnStyle,
              padding: "3px 9px",
              fontSize: 15,
              color: T.ink400,
              fontWeight: 400,
              border: `1.5px solid ${T.border}`,
              marginLeft: "auto",
            }}
            title="Close — back to All"
          >
            ×
          </button>
        )}
      </div>
      {navLevel === 2 && activeGroups.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: 6,
            paddingBottom: 2,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {activeGroups.map((group) => {
            const subs = group.subs || [];
            if (subs.length === 0) return null;
            return (
              <div
                key={group.id}
                style={{
                  display: "flex",
                  gap: 5,
                  overflowX: "auto",
                  alignItems: "center",
                  paddingLeft: 4,
                  paddingBottom: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: T.ink300,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginRight: 2,
                    flexShrink: 0,
                    minWidth: 80,
                  }}
                >
                  {group.icon} {group.label}:
                </span>
                {subs.map((sub) => {
                  const active =
                    subFilter === sub.id && groupFilter === group.id;
                  const cnt = subCounts[sub.id] || 0;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        if (active) {
                          onSelectGroup(null);
                          onSelectSub(null);
                        } else {
                          onSelectGroup(group.id);
                          onSelectSub(sub.id);
                        }
                      }}
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
            );
          })}
        </div>
      )}
      {subFilter && groupFilter && (
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
            {activeGroups.find((g) => g.id === groupFilter)?.icon}{" "}
            {activeGroups.find((g) => g.id === groupFilter)?.label} →{" "}
            {
              activeGroups
                .find((g) => g.id === groupFilter)
                ?.subs?.find((s) => s.id === subFilter)?.label
            }
            <button
              onClick={() => {
                onSelectGroup(null);
                onSelectSub(null);
              }}
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

// SC-03 helpers
const isSoldOut = (item) => (item.quantity_on_hand || 0) === 0;
const isLowStock = (item) =>
  (item.reorder_level || 0) > 0 &&
  (item.quantity_on_hand || 0) > 0 &&
  (item.quantity_on_hand || 0) <= (item.reorder_level || 0);

function StockChip({ type, T }) {
  const styles = {
    out: { bg: T.danger, color: "#fff", label: "OUT OF STOCK" },
    low: { bg: T.amber, color: "#fff", label: "LOW" },
  }[type];
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.06em",
        background: styles.bg,
        color: styles.color,
        padding: "2px 6px",
        borderRadius: 4,
        display: "inline-block",
        flexShrink: 0,
        textTransform: "uppercase",
      }}
    >
      {styles.label}
    </span>
  );
}

function getSmartTags(item) {
  const vv = (item.variant_value || "").trim();
  const brand = (item.brand || "").trim();
  const sub = (item.subcategory || "").trim();
  const tags = [];
  const world = PRODUCT_WORLDS.find(
    (pw) => pw.id !== "all" && itemMatchesWorld(item, pw),
  );
  const worldId = world?.id || "";
  const parts = vv.split(/\s+/).filter(Boolean);
  const weightPart = parts.find((p) => /^\d+(\.\d+)?(g|mg|ml|L)$/i.test(p));
  const strainPart = parts.find((p) =>
    /^(indica|sativa|hybrid|cbd|auto)$/i.test(p),
  );
  if (["flower", "concentrate", "hash", "vape", "preroll"].includes(worldId)) {
    if (strainPart) tags.push(strainPart);
    else if (sub) tags.push(sub);
    if (weightPart) tags.push(weightPart);
    else if (brand && tags.length < 2) tags.push(brand);
  } else {
    if (brand) tags.push(brand);
    if (sub && sub !== brand) tags.push(sub);
  }
  return tags.slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────
// TILE VIEW — SC-08: checkbox top-left, blue border when selected
// ─────────────────────────────────────────────────────────────────────────
function TileView({
  items,
  onEdit,
  onDelete,
  onToggle,
  onOpenPanel,
  tileSize,
  T,
  selectMode,
  selectedIds,
  onToggleSelect,
}) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const minW = tileSize === "S" ? 155 : tileSize === "L" ? 270 : 200;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minW}px, 1fr))`,
        gap: 12,
      }}
      onClick={() => setMenuOpenId(null)}
    >
      {items.map((item) => {
        const m = margin(item.sell_price, item.weighted_avg_cost);
        const soldOut = isSoldOut(item);
        const lowStock = isLowStock(item);
        const isHovered = hoveredId === item.id;
        const menuOpen = menuOpenId === item.id;
        const isSelected = selectMode && selectedIds.has(item.id);
        const tags = getSmartTags(item);
        const statusBorder = isSelected
          ? T.blue
          : soldOut
            ? T.danger
            : lowStock
              ? T.amber
              : item.is_active
                ? T.border
                : T.ink150;
        return (
          <div
            key={item.id}
            className={isSelected ? "nuai-select-tile" : ""}
            style={{
              background: T.white,
              border: `1.5px solid ${statusBorder}`,
              borderLeft: isSelected
                ? `3px solid ${T.blue}`
                : soldOut
                  ? `3px solid ${T.danger}`
                  : lowStock
                    ? `3px solid ${T.amber}`
                    : `1.5px solid ${statusBorder}`,
              borderRadius: T.radius,
              overflow: "hidden",
              opacity: item.is_active ? (soldOut ? 0.82 : 1) : 0.55,
              boxShadow: isSelected
                ? `0 0 0 3px ${T.blueLit}`
                : isHovered
                  ? "0 4px 14px rgba(0,0,0,0.13)"
                  : T.shadow,
              cursor: selectMode ? "pointer" : "pointer",
              transition: "box-shadow 0.15s, border-color 0.15s",
              position: "relative",
            }}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={(e) => {
              if (selectMode) {
                onToggleSelect(item.id);
                return;
              }
              if (!menuOpen) onOpenPanel(item);
            }}
          >
            {/* SC-08: Select checkbox top-left */}
            {selectMode && (
              <div
                style={{ position: "absolute", top: 8, left: 8, zIndex: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(item.id)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: T.blue,
                    cursor: "pointer",
                  }}
                />
              </div>
            )}

            {/* Category banner */}
            <div
              style={{
                background: isSelected ? "#DBEAFE" : T.accentLit,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderBottom: `1px solid ${T.border}`,
                transition: "background 0.12s",
              }}
            >
              <span style={{ fontSize: 16, marginLeft: selectMode ? 22 : 0 }}>
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
                      color: isSelected ? T.blueMid : T.accentMid,
                    }}
                  >
                    {w
                      ? w.label
                      : CATEGORY_LABELS[item.category] || item.category}
                  </span>
                );
              })()}
              {item.is_featured && (
                <span style={{ marginLeft: "auto", fontSize: 10 }}>★</span>
              )}
              {soldOut && (
                <span style={{ marginLeft: item.is_featured ? 4 : "auto" }}>
                  <StockChip type="out" T={T} />
                </span>
              )}
              {lowStock && !soldOut && (
                <span style={{ marginLeft: item.is_featured ? 4 : "auto" }}>
                  <StockChip type="low" T={T} />
                </span>
              )}
            </div>

            {/* ··· menu — hidden in selectMode */}
            {isHovered && !selectMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpen ? null : item.id);
                }}
                style={{
                  position: "absolute",
                  top: 7,
                  right: 8,
                  zIndex: 10,
                  background: menuOpen ? T.accent : "rgba(255,255,255,0.92)",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  padding: "1px 8px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 900,
                  color: menuOpen ? T.white : T.ink500,
                  lineHeight: 1.6,
                  transition: "all 0.1s",
                  letterSpacing: 1,
                }}
              >
                ···
              </button>
            )}
            {menuOpen && !selectMode && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: "flex",
                  borderTop: `1px solid ${T.border}`,
                  background: T.white,
                  zIndex: 5,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {[
                  {
                    label: "✏ Edit",
                    action: () => onEdit(item),
                    color: T.accent,
                  },
                  {
                    label: item.is_active ? "👁 Hide" : "👁 Show",
                    action: () => onToggle(item, "is_active"),
                    color: T.amber,
                  },
                  {
                    label: "🗑 Del",
                    action: () => onDelete(item),
                    color: T.danger,
                  },
                ].map((a, i) => (
                  <button
                    key={a.label}
                    onClick={() => {
                      a.action();
                      setMenuOpenId(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      border: "none",
                      borderRight: i < 2 ? `1px solid ${T.border}` : "none",
                      background: "transparent",
                      color: a.color,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: T.font,
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div style={{ padding: "12px 14px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: T.ink900,
                  marginBottom: tags.length ? 6 : 10,
                  lineHeight: 1.3,
                  minHeight: 32,
                }}
              >
                {item.name}
              </div>
              {tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.accentMid,
                        background: T.accentXlit || T.accentLit,
                        border: `1px solid ${T.accentBd || T.border}`,
                        borderRadius: 4,
                        padding: "2px 6px",
                        textTransform: "capitalize",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
              {item.weighted_avg_cost > 0 && (
                <div style={{ fontSize: 11, color: T.ink400 }}>
                  Cost: {zar(item.weighted_avg_cost)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LIST VIEW — SC-08: icon column → checkbox, blue row bg when selected
// ─────────────────────────────────────────────────────────────────────────
function ListView({
  items,
  onEdit,
  onDelete,
  onToggle,
  onOpenPanel,
  T,
  selectMode,
  selectedIds,
  onToggleSelect,
}) {
  return (
    <div
      style={{
        background: T.white,
        borderRadius: T.radius,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}
    >
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
        <span>{selectMode ? "" : ""}</span>
        <span>Name</span>
        <span>Category</span>
        <span style={{ textAlign: "right" }}>On Hand</span>
        <span style={{ textAlign: "right" }}>Price</span>
        <span style={{ textAlign: "right" }}>Margin</span>
        <span style={{ textAlign: "center" }}>Actions</span>
      </div>
      {items.map((item, idx) => {
        const m = margin(item.sell_price, item.weighted_avg_cost);
        const soldOut = isSoldOut(item);
        const lowStock = isLowStock(item);
        const isSelected = selectMode && selectedIds.has(item.id);
        return (
          <div
            key={item.id}
            className={isSelected ? "nuai-select-row" : ""}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 110px 90px 90px 80px 90px",
              padding: "9px 11px 9px 14px",
              alignItems: "center",
              background: isSelected
                ? "#EFF6FF"
                : idx % 2 === 0
                  ? T.white
                  : T.bg,
              borderBottom: `1px solid ${T.border}`,
              borderLeft: isSelected
                ? `3px solid ${T.blue}`
                : soldOut
                  ? `3px solid ${T.danger}`
                  : lowStock
                    ? `3px solid ${T.amber}`
                    : "3px solid transparent",
              opacity: item.is_active ? (soldOut ? 0.82 : 1) : 0.55,
              cursor: "pointer",
              transition: "background 0.1s, border-color 0.12s",
            }}
            onClick={() => {
              if (selectMode) {
                onToggleSelect(item.id);
                return;
              }
              onOpenPanel(item);
            }}
          >
            {/* Icon col → checkbox in selectMode */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={(e) => {
                if (selectMode) {
                  e.stopPropagation();
                  onToggleSelect(item.id);
                }
              }}
            >
              {selectMode ? (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(item.id)}
                  style={{
                    width: 15,
                    height: 15,
                    accentColor: T.blue,
                    cursor: "pointer",
                  }}
                />
              ) : (
                <span style={{ fontSize: 18 }}>
                  {CATEGORY_ICONS[item.category] || "📦"}
                </span>
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.ink900,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{item.name}</span>
                {soldOut && <StockChip type="out" T={T} />}
                {lowStock && <StockChip type="low" T={T} />}
              </div>
              {item.is_featured && (
                <span style={{ fontSize: 10, color: T.amber }}>
                  ⭐ Featured
                </span>
              )}
            </div>
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
            <div
              style={{ display: "flex", gap: 4, justifyContent: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              {!selectMode && (
                <>
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
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DETAIL VIEW — SC-08: _row → checkbox, blue row bg when selected
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
  hiddenCols = new Set(),
  onOpenPanel,
  T,
  selectMode,
  selectedIds,
  onToggleSelect,
}) {
  const [colWidths, setColWidths] = useState(() => {
    try {
      const s = localStorage.getItem("nuai_detail_col_widths");
      return s
        ? JSON.parse(s)
        : Object.fromEntries(DETAIL_COLS.map((c) => [c.key, c.width]));
    } catch {
      return Object.fromEntries(DETAIL_COLS.map((c) => [c.key, c.width]));
    }
  });
  const resizing = useRef(null);

  const [colOrder, setColOrder] = useState(() => {
    try {
      const s = localStorage.getItem("nuai_col_order");
      return s ? JSON.parse(s) : DETAIL_COLS.map((c) => c.key);
    } catch {
      return DETAIL_COLS.map((c) => c.key);
    }
  });
  const dragCol = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);

  const handleDragStart = (e, key) => {
    if (key === "_row" || key === "_actions") {
      e.preventDefault();
      return;
    }
    dragCol.current = key;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  };
  const handleDragOver = (e, key) => {
    if (key === "_row" || key === "_actions") return;
    e.preventDefault();
    setDragOverKey(key);
  };
  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    setDragOverKey(null);
    const sourceKey = e.dataTransfer.getData("text/plain") || dragCol.current;
    if (
      !sourceKey ||
      sourceKey === targetKey ||
      targetKey === "_row" ||
      targetKey === "_actions"
    ) {
      dragCol.current = null;
      return;
    }
    setColOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(sourceKey);
      const toIdx = next.indexOf(targetKey);
      if (fromIdx < 0 || toIdx < 0) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, sourceKey);
      try {
        localStorage.setItem("nuai_col_order", JSON.stringify(next));
      } catch {}
      return next;
    });
    dragCol.current = null;
  };
  const handleDragEnd = () => {
    dragCol.current = null;
    setDragOverKey(null);
  };

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
          localStorage.setItem("nuai_detail_col_widths", JSON.stringify(next));
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

  const visibleCols = useMemo(() => {
    const allKeys = DETAIL_COLS.map((c) => c.key);
    const ordered = [
      ...colOrder.filter((k) => allKeys.includes(k)),
      ...allKeys.filter((k) => !colOrder.includes(k)),
    ];
    return ordered
      .map((key) => DETAIL_COLS.find((c) => c.key === key))
      .filter((c) => c && !hiddenCols.has(c.key));
  }, [colOrder, hiddenCols]);

  const totalWidth = visibleCols.reduce(
    (s, c) => s + (colWidths[c.key] || c.width),
    0,
  );

  return (
    <div
      onDragOver={(e) => dragCol.current && e.preventDefault()}
      style={{
        overflowX: "auto",
        overflowY: "auto",
        height: "100%",
        fontFamily: T.font,
      }}
    >
      <table
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); setDragOverKey(null); dragCol.current = null; }}
        style={{
          borderCollapse: "collapse",
          width: totalWidth,
          fontSize: 12.5,
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          {visibleCols.map((col) => (
            <col
              key={col.key}
              style={{ width: colWidths[col.key] || col.width }}
            />
          ))}
        </colgroup>
        <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <tr
            style={{
              background: T.ink50,
              borderBottom: `2px solid ${T.borderDark}`,
            }}
          >
            {visibleCols.map((col) => {
              const isDraggable = col.key !== "_row" && col.key !== "_actions";
              const isOver = dragOverKey === col.key;
              return (
                <th
                  key={col.key}
                  draggable={isDraggable}
                  onDragStart={
                    isDraggable ? (e) => handleDragStart(e, col.key) : undefined
                  }
                  onDragOver={
                    isDraggable ? (e) => handleDragOver(e, col.key) : undefined
                  }
                  onDrop={
                    isDraggable ? (e) => handleDrop(e, col.key) : undefined
                  }
                  onDragEnd={handleDragEnd}
                  onClick={() => col.sortable && onSort(col.key)}
                  style={{
                    padding: "9px 10px",
                    textAlign: col.align || "left",
                    fontWeight: 700,
                    fontSize: 11,
                    color: sortKey === col.key ? T.accent : T.ink400,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: col.sortable
                      ? "pointer"
                      : isDraggable
                        ? "grab"
                        : "default",
                    userSelect: "none",
                    background: isOver
                      ? T.accentLit
                      : sortKey === col.key
                        ? T.accentXlit
                        : T.ink50,
                    position: "relative",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    transition: "background 0.1s",
                    outline: isOver ? `2px solid ${T.accentMid}` : "none",
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
                    {/* In selectMode, _row header shows "select all" checkbox */}
                    {col.key === "_row" && selectMode ? (
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size === items.length && items.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            items.forEach((i) => {
                              if (!selectedIds.has(i.id)) onToggleSelect(i.id);
                            });
                          } else {
                            items.forEach((i) => {
                              if (selectedIds.has(i.id)) onToggleSelect(i.id);
                            });
                          }
                        }}
                        style={{
                          accentColor: T.blue,
                          cursor: "pointer",
                          width: 14,
                          height: 14,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      col.label
                    )}
                    {col.sortable && sortKey === col.key && !selectMode && (
                      <span style={{ marginLeft: 4 }}>
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                    {isDraggable && !col.sortable && !selectMode && (
                      <span
                        style={{ marginLeft: 4, opacity: 0.3, fontSize: 9 }}
                      >
                        ⠿
                      </span>
                    )}
                  </span>
                  {col.key !== "_actions" && col.key !== "_row" && (
                    <span
                      onMouseDown={(e) => startResize(e, col.key)}
                      onClick={(e) => e.stopPropagation()}
                      title="Drag to resize"
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
              );
            })}
          </tr>
          {filterRowOpen && !selectMode && (
            <tr
              style={{
                background: T.white,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              {visibleCols.map((col) => (
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
                  col.key !== "is_featured" &&
                  col.key !== "_row" ? (
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
            const soldOut = isSoldOut(item);
            const lowStock = isLowStock(item);
            const isSelected = selectMode && selectedIds.has(item.id);
            const rowBg = isSelected
              ? "#EFF6FF"
              : idx % 2 === 0
                ? T.white
                : "#FCFCFB";
            return (
              <tr
                key={item.id}
                className={isSelected ? "nuai-select-row" : ""}
                style={{
                  background: rowBg,
                  borderBottom: `1px solid ${T.border}`,
                  borderLeft: isSelected
                    ? `3px solid ${T.blue}`
                    : soldOut
                      ? `3px solid ${T.danger}`
                      : lowStock
                        ? `3px solid ${T.amber}`
                        : "3px solid transparent",
                  opacity: item.is_active ? (soldOut ? 0.85 : 1) : 0.55,
                  transition: "background 0.1s",
                }}
                onClick={() => {
                  if (selectMode) {
                    onToggleSelect(item.id);
                    return;
                  }
                  onOpenPanel(item);
                }}
                onDoubleClick={() => {
                  if (!selectMode) onEdit(item);
                }}
              >
                {visibleCols.map((col) => (
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
                    {/* SC-08: _row → checkbox in selectMode */}
                    {col.key === "_row" &&
                      (selectMode ? (
                        <div
                          style={{ display: "flex", justifyContent: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(item.id)}
                            style={{
                              width: 14,
                              height: 14,
                              accentColor: T.blue,
                              cursor: "pointer",
                            }}
                          />
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: T.ink300,
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {idx + 1}
                        </span>
                      ))}
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
                        {soldOut && <StockChip type="out" T={T} />}
                        {lowStock && <StockChip type="low" T={T} />}
                        {item.is_featured && (
                          <span style={{ fontSize: 10 }}>⭐</span>
                        )}
                      </div>
                    )}
                    {col.key === "sku" && (
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: "monospace",
                        }}
                      >
                        {item.sku || "—"}
                      </span>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(item, "is_active");
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(item, "is_featured");
                        }}
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
                    {col.key === "reorder_level" && (
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            (item.reorder_level || 0) > 0 ? T.ink700 : T.ink300,
                        }}
                      >
                        {item.reorder_level || "—"}
                      </span>
                    )}
                    {col.key === "max_stock_level" && (
                      <span style={{ color: T.ink400 }}>
                        {item.max_stock_level || "—"}
                      </span>
                    )}
                    {col.key === "supplier" && (
                      <span style={{ fontSize: 11, color: T.ink500 }}>
                        {item.suppliers?.name || "—"}
                      </span>
                    )}
                    {col.key === "variant_value" && (
                      <span style={{ fontSize: 11, color: T.ink500 }}>
                        {item.variant_value || "—"}
                      </span>
                    )}
                    {col.key === "brand" && (
                      <span style={{ fontSize: 11 }}>{item.brand || "—"}</span>
                    )}
                    {col.key === "_actions" && !selectMode && (
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

// eslint-disable-next-line no-unused-vars
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
      {error && (
        <div
          style={{
            background: T.dangerLit,
            border: "1px solid #FCA5A5",
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

function Modal({
  children,
  onClose,
  title,
  T,
  width = 480,
  preventBackdropDismiss = false,
}) {
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
      onClick={preventBackdropDismiss ? undefined : onClose}
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

// eslint-disable-next-line no-unused-vars
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
  const shimmer = {
    background: `linear-gradient(90deg, ${T.ink50} 25%, ${T.ink150}40 50%, ${T.ink50} 75%)`,
    backgroundSize: "200% 100%",
    animation: "nuai-shimmer 1.4s ease-in-out infinite",
    borderRadius: 6,
  };
  return (
    <div style={{ padding: "4px 0" }}>
      <style>{`@keyframes nuai-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 4px",
          borderBottom: `1px solid ${T.border}`,
          marginBottom: 2,
        }}
      >
        {[45, 220, 100, 120, 130, 110, 80, 95, 90, 85, 70].map((w, i) => (
          <div
            key={i}
            style={{ ...shimmer, width: w, height: 12, flexShrink: 0 }}
          />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 4px",
            borderBottom: `1px solid ${T.border}`,
            opacity: 1 - row * 0.07,
          }}
        >
          {[45, 220, 100, 120, 130, 110, 80, 95, 90, 85, 70].map((w, i) => (
            <div
              key={i}
              style={{
                ...shimmer,
                width: i === 0 ? w : w * 0.6,
                height: i === 1 ? 14 : 12,
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      ))}
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

function EmptyState({ catFilter, search, onAdd, isFiltered, onClearAll, T }) {
  return (
    <div style={{ textAlign: "center", padding: 64, color: T.ink400 }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>
        {isFiltered ? "🔍" : "📦"}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: T.ink500,
          marginBottom: 6,
        }}
      >
        {isFiltered
          ? search
            ? `No items match "${search}"`
            : "No items match the current filters"
          : catFilter !== "all"
            ? `No ${PRODUCT_WORLDS.find((w) => w.id === catFilter)?.label || catFilter} items yet`
            : "No inventory items"}
      </div>
      <div style={{ fontSize: 13, marginBottom: 20 }}>
        {isFiltered
          ? "Try adjusting your search or filters to see results."
          : "Add your first item to get started."}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {isFiltered && onClearAll && (
          <button
            onClick={onClearAll}
            style={btnStyle(T.white, T.danger, T.danger, T, true)}
          >
            ✕ Clear all filters
          </button>
        )}
        <button
          onClick={onAdd}
          style={btnStyle("#1A3D2B", "#fff", "#1A3D2B", T, true)}
        >
          + Add Item
        </button>
      </div>
    </div>
  );
}

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
