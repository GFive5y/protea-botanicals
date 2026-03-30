// src/components/hq/ProductWorlds.js
// WP-STOCK-RECEIVE-S3 — Single source of truth for cannabis product worlds
//
// ARCHITECTURE: This file is the ONLY place product world definitions live.
// Both the Items tab (CannabisItemsView in HQStock.js) and the Receive
// Delivery modal (StockReceiveModal.js) import from here.
//
// Adding a new world: add one entry to PRODUCT_WORLDS.
// Cascading effect: Items tab + Receive Delivery both update automatically.
//
// Each world has:
//   id           — unique key, used for filtering
//   label        — display name
//   icon         — emoji icon
//   enums        — maps to inventory_items.category (array)
//   subs         — maps to inventory_items.subcategory (array or null)
//   receiveAttrs — fields shown when RECEIVING this world (per-world attributes)
//   subLabels    — human labels for subcategory keys (used in both tabs)

export const PRODUCT_WORLDS = [
  {
    id: "all",
    label: "All Products",
    icon: "◈",
    enums: null,
    subs: null,
    receiveAttrs: [],
    subLabels: {},
  },
  {
    id: "flower",
    label: "Flower",
    icon: "🌿",
    enums: ["flower"],
    subs: null,
    receiveAttrs: [
      {
        key: "strain_type",
        label: "Strain Type",
        type: "select",
        options: ["Indica", "Sativa", "Hybrid", "CBD", "Auto"],
        col: "strain_type",
      },
      {
        key: "weight_grams",
        label: "Weight (g)",
        type: "select",
        options: ["0.5", "1", "2", "3.5", "5", "7", "10", "14", "28"],
        col: "weight_grams",
      },
      {
        key: "grade_tag",
        label: "Grade",
        type: "select",
        options: [
          "",
          "Budget",
          "Commercial",
          "A Grade",
          "AA Grade",
          "AAA Grade",
          "AAAA Grade",
          "Craft",
          "Top Shelf",
          "Exotic",
        ],
        col: "tags",
        tagField: true,
      },
      {
        key: "cultivation_tag",
        label: "Cultivation",
        type: "select",
        options: [
          "",
          "Indoor",
          "Outdoor",
          "Greenhouse",
          "Hydroponic",
          "Organic",
          "Living Soil",
          "Sun-grown",
        ],
        col: "tags",
        tagField: true,
      },
    ],
    subLabels: {},
  },
  {
    id: "hash",
    label: "Hash & Kief",
    icon: "🟤",
    enums: ["concentrate"],
    subs: [
      "hash",
      "dry_sift",
      "bubble_hash",
      "pressed_hash",
      "charas",
      "temple_ball",
      "lebanese",
      "moroccan",
      "afghani",
      "finger_hash",
      "kief",
      "moon_rock",
      "dry_ice_hash",
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Hash Type",
        type: "select",
        options: [
          "bubble_hash",
          "dry_sift",
          "kief",
          "pressed_hash",
          "hash",
          "lebanese",
          "moroccan",
          "afghani",
          "charas",
          "temple_ball",
          "moon_rock",
          "finger_hash",
          "dry_ice_hash",
        ],
        col: "subcategory",
      },
      {
        key: "weight_grams",
        label: "Weight (g)",
        type: "select",
        options: ["0.5", "1", "2", "3.5", "5", "10", "14", "28"],
        col: "weight_grams",
      },
    ],
    subLabels: {
      bubble_hash: "Bubble Hash",
      dry_sift: "Dry Sift",
      kief: "Kief",
      pressed_hash: "Pressed Hash",
      hash: "Hash",
      lebanese: "Lebanese",
      moroccan: "Moroccan",
      afghani: "Afghani",
      charas: "Charas",
      temple_ball: "Temple Ball",
      moon_rock: "Moon Rock",
      finger_hash: "Finger Hash",
      dry_ice_hash: "Dry Ice Hash",
    },
  },
  {
    id: "concentrate",
    label: "Concentrates",
    icon: "💎",
    enums: ["concentrate"],
    subs: [
      "concentrate",
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
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Concentrate Type",
        type: "select",
        options: [
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
          "concentrate",
        ],
        col: "subcategory",
      },
      {
        key: "weight_grams",
        label: "Weight (g)",
        type: "select",
        options: ["0.5", "1", "2", "3.5", "5"],
        col: "weight_grams",
      },
    ],
    subLabels: {
      budder: "Budder",
      badder: "Badder",
      live_resin: "Live Resin",
      rosin: "Rosin",
      sauce: "Terp Sauce",
      diamonds: "Diamonds",
      distillate: "Distillate",
      crumble: "Crumble",
      shatter: "Shatter",
      wax: "Wax",
      feco: "FECO",
      rso: "RSO",
      bho: "BHO",
      concentrate: "Concentrate",
    },
  },
  {
    id: "vape",
    label: "Vapes",
    icon: "💨",
    enums: ["finished_product"],
    subs: ["cartridge", "disposable", "battery"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Device Type",
        type: "select",
        options: ["cartridge", "disposable", "battery"],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Volume / Variant",
        type: "select",
        options: ["0.5ml", "1ml", "2ml", "3ml", "510 Thread", "Other"],
        col: "variant_value",
      },
    ],
    subLabels: {
      cartridge: "Cartridges",
      disposable: "Disposables",
      battery: "Batteries",
    },
  },
  {
    id: "preroll",
    label: "Pre-Rolls",
    icon: "🌀",
    enums: ["finished_product"],
    subs: ["preroll"],
    receiveAttrs: [
      {
        key: "strain_type",
        label: "Strain",
        type: "select",
        options: ["Indica", "Sativa", "Hybrid", "CBD", "Mixed"],
        col: "strain_type",
      },
      {
        key: "weight_grams",
        label: "Weight (g)",
        type: "select",
        options: ["0.5", "1", "1.5", "2", "3.5"],
        col: "weight_grams",
      },
    ],
    subLabels: { preroll: "Pre-Rolls" },
  },
  {
    id: "edible",
    label: "Edibles",
    icon: "🍬",
    enums: ["edible"],
    subs: null,
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Format",
        type: "select",
        options: ["edible", "tincture", "capsule"],
        col: "subcategory",
      },
      {
        key: "potency_label",
        label: "Potency",
        type: "select",
        options: [
          "5mg",
          "10mg",
          "20mg",
          "25mg",
          "50mg",
          "100mg",
          "200mg",
          "500mg",
        ],
        col: "variant_value",
      },
    ],
    subLabels: {
      edible: "Edible",
      tincture: "Tincture",
      capsule: "Capsule",
    },
  },
  {
    id: "seeds",
    label: "Seeds & Clones",
    icon: "🌱",
    enums: ["raw_material"],
    subs: ["seed", "clone", "seedling", "propagation"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Type",
        type: "select",
        options: ["seed", "clone", "seedling", "propagation"],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Pack / Count",
        type: "text",
        placeholder: "e.g. 3-Pack, Single",
        col: "variant_value",
      },
    ],
    subLabels: {
      seed: "Seeds",
      clone: "Clones",
      seedling: "Seedlings",
      propagation: "Propagation",
    },
  },
  {
    id: "substrate",
    label: "Substrate",
    icon: "🪴",
    enums: ["raw_material"],
    subs: ["substrate", "soil", "rockwool"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Type",
        type: "select",
        options: ["substrate", "soil", "rockwool"],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Volume / Size",
        type: "select",
        options: ["5L", "10L", "20L", "50L", "100L"],
        col: "variant_value",
      },
    ],
    subLabels: {
      substrate: "Substrate",
      soil: "Soil",
      rockwool: "Rockwool",
    },
  },
  {
    id: "nutrients",
    label: "Nutrients",
    icon: "🧪",
    enums: ["raw_material"],
    subs: [
      "base_nutrient",
      "bloom_booster",
      "root_stimulant",
      "enzyme",
      "ph_management",
      "supplement",
      "beneficial",
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Nutrient Type",
        type: "select",
        options: [
          "base_nutrient",
          "bloom_booster",
          "root_stimulant",
          "enzyme",
          "ph_management",
          "supplement",
          "beneficial",
        ],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Volume / Size",
        type: "select",
        options: ["250ml", "500ml", "1L", "5L", "10L", "20L", "1kg", "5kg"],
        col: "variant_value",
      },
    ],
    subLabels: {
      base_nutrient: "Base Nutrients",
      bloom_booster: "Bloom Boosters",
      root_stimulant: "Root Stimulants",
      enzyme: "Enzymes",
      ph_management: "pH Mgmt",
      supplement: "Supplements",
      beneficial: "Beneficials",
    },
  },
  {
    id: "equipment",
    label: "Grow Equipment",
    icon: "💡",
    enums: ["hardware"],
    subs: null,
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Equipment Type",
        type: "select",
        options: [
          "grow_light",
          "grow_tent",
          "fan",
          "carbon_filter",
          "meter",
          "timer",
          "pot",
          "training",
        ],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Model / Size",
        type: "text",
        placeholder: "e.g. 600W, 1.2x1.2m",
        col: "variant_value",
      },
    ],
    subLabels: {
      grow_light: "Lights",
      grow_tent: "Tents",
      fan: "Fans",
      carbon_filter: "Filters",
      meter: "Meters",
      timer: "Timers",
      pot: "Pots",
      training: "Training",
    },
  },
  {
    id: "wellness",
    label: "Wellness",
    icon: "💚",
    enums: ["finished_product"],
    subs: ["mushroom", "adaptogen", "cbd", "cbd_pet"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Product Type",
        type: "select",
        options: ["mushroom", "adaptogen", "cbd", "cbd_pet"],
        col: "subcategory",
      },
      {
        key: "potency_label",
        label: "Potency / Dose",
        type: "text",
        placeholder: "e.g. 500mg, 1000mg",
        col: "variant_value",
      },
    ],
    subLabels: {
      mushroom: "Mushrooms",
      adaptogen: "Adaptogens",
      cbd: "CBD",
      cbd_pet: "Pet CBD",
    },
  },
  {
    id: "papers",
    label: "Rolling Papers",
    icon: "📄",
    enums: ["accessory"],
    subs: ["rolling_papers", "cones", "tips", "rolling_machine", "tray"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Type",
        type: "select",
        options: ["rolling_papers", "cones", "tips", "rolling_machine", "tray"],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Size / Count",
        type: "text",
        placeholder: "e.g. King Size, 50-pack",
        col: "variant_value",
      },
    ],
    subLabels: {
      rolling_papers: "Rolling Papers",
      cones: "Cones",
      tips: "Tips",
      rolling_machine: "Machines",
      tray: "Trays",
    },
  },
  {
    id: "accessories",
    label: "Accessories",
    icon: "🛠",
    enums: ["accessory"],
    subs: [
      "grinder",
      "pipe",
      "bong",
      "dab_rig",
      "dab_tool",
      "humidity_pack",
      "storage",
      "lighter",
      "extraction_bag",
      "rosin_bag",
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Accessory Type",
        type: "select",
        options: [
          "grinder",
          "pipe",
          "bong",
          "dab_rig",
          "dab_tool",
          "humidity_pack",
          "storage",
          "lighter",
          "extraction_bag",
          "rosin_bag",
        ],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Variant",
        type: "text",
        placeholder: "e.g. 2-Piece, 4-Piece, 62%RH",
        col: "variant_value",
      },
    ],
    subLabels: {
      grinder: "Grinders",
      pipe: "Pipes",
      bong: "Bongs",
      dab_rig: "Dab Rigs",
      dab_tool: "Dab Tools",
      humidity_pack: "Humidity Packs",
      storage: "Storage Jars",
      lighter: "Lighters",
      extraction_bag: "Extraction Bags",
      rosin_bag: "Rosin Bags",
    },
  },
  {
    id: "merch",
    label: "Merch",
    icon: "👕",
    enums: ["finished_product"],
    subs: ["clothing"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Type",
        type: "select",
        options: ["clothing"],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Size / Variant",
        type: "text",
        placeholder: "e.g. S, M, L, XL",
        col: "variant_value",
      },
    ],
    subLabels: { clothing: "Clothing" },
  },
];

// ── Helper: does item match a world? ─────────────────────────────────────────
export function itemMatchesWorld(item, world) {
  if (!world || world.id === "all") return true;
  if (world.subs && world.subs.length > 0)
    return world.subs.includes(item.subcategory);
  return world.enums ? world.enums.includes(item.category) : false;
}

// ── Helper: get world for a given item ───────────────────────────────────────
export function worldForItem(item) {
  // Most specific match first (subs), then enum match
  const bySub = PRODUCT_WORLDS.find(
    (w) => w.subs && w.subs.includes(item.subcategory),
  );
  if (bySub) return bySub;
  const byEnum = PRODUCT_WORLDS.find(
    (w) => w.enums && w.enums.includes(item.category) && w.id !== "all",
  );
  return byEnum || PRODUCT_WORLDS[0];
}

// ── Helper: derive default category/subcategory for new product in a world ───
export function defaultsForWorld(world) {
  return {
    category: world.enums?.[0] || "finished_product",
    subcategory: world.subs?.[0] || "",
  };
}
