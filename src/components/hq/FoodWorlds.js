// src/components/hq/FoodWorlds.js
// F&B Ingredient Worlds — the restaurant-industry equivalent of ProductWorlds.js
//
// ARCHITECTURE: This file is the ONLY place F&B ingredient world definitions live.
// FoodOverview, SmartInventory, StockControl, StockReceiveModal all import from here
// when industryProfile === 'food_beverage'.
//
// Adding a new world: add one entry to FOOD_WORLDS.
// Cascading effect: world picker, receive modal, tile view, pill nav all update.
//
// Mirrors ProductWorlds.js structure exactly:
//   id           — unique key, used for filtering
//   label        — display name shown in UI
//   icon         — emoji — maps to the physical kitchen zone a chef thinks in
//   subs         — maps to inventory_items.subcategory (array)
//   receiveAttrs — fields captured when RECEIVING this world's ingredients at the dock
//   subLabels    — human labels for subcategory keys
//   defaultZone  — default temperature_zone pre-filled in receive form
//   defaultShelf — default shelf_life_days pre-filled in receive form
//
// LL-277 gospel: subcategory is the F&B ingredient group. Never null for F&B items.
// LL-275 gospel: inventory_items holds RAW INGREDIENTS only for F&B. Not dishes.

export const FOOD_WORLDS = [
  {
    id: "all",
    label: "All Ingredients",
    icon: "\uD83C\uDF7D",
    subs: null,
    receiveAttrs: [],
    subLabels: {},
    defaultZone: "ambient",
    defaultShelf: null,
  },
  {
    id: "proteins",
    label: "Proteins",
    icon: "\uD83E\uDD69",
    desc: "Meat, poultry, fish, seafood, charcuterie",
    subs: [
      "protein_red_meat",
      "protein_poultry",
      "protein_fish",
      "protein_seafood",
      "protein_charcuterie",
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Protein type",
        type: "select",
        options: [
          "protein_red_meat",
          "protein_poultry",
          "protein_fish",
          "protein_seafood",
          "protein_charcuterie",
        ],
        col: "subcategory",
      },
      {
        key: "temperature_zone",
        label: "Storage zone",
        type: "select",
        options: ["refrigerated", "frozen"],
        col: "temperature_zone",
      },
      {
        key: "shelf_life_days",
        label: "Shelf life (days)",
        type: "number",
        placeholder: "e.g. 4",
        col: "shelf_life_days",
      },
      {
        key: "country_of_origin",
        label: "Origin / Country",
        type: "text",
        placeholder: "e.g. South Africa, NZ",
        col: "country_of_origin",
      },
      {
        key: "supplier_grade",
        label: "Grade / Certification",
        type: "select",
        options: [
          "",
          "Standard",
          "Premium",
          "Artisan",
          "Free-range",
          "Grass-fed",
          "Organic",
          "MSC certified",
          "SABS approved",
        ],
        col: "tags",
        tagField: true,
      },
    ],
    subLabels: {
      protein_red_meat: "Red Meat",
      protein_poultry: "Poultry",
      protein_fish: "Fish",
      protein_seafood: "Shellfish & Seafood",
      protein_charcuterie: "Charcuterie",
    },
    defaultZone: "refrigerated",
    defaultShelf: 4,
  },
  {
    id: "dairy",
    label: "Dairy & Eggs",
    icon: "\uD83E\uDD5B",
    desc: "Cream, butter, cheese, eggs, milk",
    subs: [
      "dairy_butter",
      "dairy_cream",
      "dairy_cheese",
      "dairy_eggs",
      "dairy_milk",
      "dairy_yoghurt",
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Dairy type",
        type: "select",
        options: [
          "dairy_butter",
          "dairy_cream",
          "dairy_cheese",
          "dairy_eggs",
          "dairy_milk",
          "dairy_yoghurt",
        ],
        col: "subcategory",
      },
      {
        key: "shelf_life_days",
        label: "Shelf life (days)",
        type: "number",
        placeholder: "e.g. 14",
        col: "shelf_life_days",
      },
    ],
    subLabels: {
      dairy_butter: "Butter",
      dairy_cream: "Cream",
      dairy_cheese: "Cheese",
      dairy_eggs: "Eggs",
      dairy_milk: "Milk",
      dairy_yoghurt: "Yoghurt",
    },
    defaultZone: "refrigerated",
    defaultShelf: 14,
    autoAllergen: { milk: true },
  },
  {
    id: "produce",
    label: "Produce",
    icon: "\uD83E\uDD6C",
    desc: "Vegetables, leaves, aromatics, fruit",
    subs: [
      "produce_vegetables",
      "produce_leaves",
      "produce_aromatics",
      "produce_fruit",
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Produce type",
        type: "select",
        options: [
          "produce_vegetables",
          "produce_leaves",
          "produce_aromatics",
          "produce_fruit",
        ],
        col: "subcategory",
      },
      {
        key: "shelf_life_days",
        label: "Shelf life (days)",
        type: "number",
        placeholder: "e.g. 5",
        col: "shelf_life_days",
      },
      {
        key: "origin_tag",
        label: "Grown / Origin",
        type: "select",
        options: [
          "",
          "Local SA",
          "Western Cape",
          "KZN",
          "Imported",
          "Organic",
          "Hydroponic",
          "Greenhouse",
        ],
        col: "tags",
        tagField: true,
      },
    ],
    subLabels: {
      produce_vegetables: "Vegetables",
      produce_leaves: "Leaves & Salads",
      produce_aromatics: "Aromatics",
      produce_fruit: "Fruit",
    },
    defaultZone: "refrigerated",
    defaultShelf: 5,
  },
  {
    id: "dry_goods",
    label: "Dry Goods",
    icon: "\uD83C\uDF3E",
    desc: "Grains, flour, sugar, spices, canned",
    subs: [
      "dry_goods_grains",
      "dry_goods_flour",
      "dry_goods_sugar",
      "dry_goods_spices",
      "dry_goods_canned",
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Goods type",
        type: "select",
        options: [
          "dry_goods_grains",
          "dry_goods_flour",
          "dry_goods_sugar",
          "dry_goods_spices",
          "dry_goods_canned",
        ],
        col: "subcategory",
      },
      {
        key: "pack_size",
        label: "Pack / unit size",
        type: "select",
        options: ["100g", "500g", "1kg", "2.5kg", "5kg", "10kg", "25kg"],
        col: "variant_value",
      },
    ],
    subLabels: {
      dry_goods_grains: "Grains & Rice",
      dry_goods_flour: "Flour",
      dry_goods_sugar: "Sugar & Sweeteners",
      dry_goods_spices: "Herbs & Spices",
      dry_goods_canned: "Canned & Preserved",
    },
    defaultZone: "ambient",
    defaultShelf: 180,
    autoAllergenIfSub: { dry_goods_flour: { gluten: true } },
  },
  {
    id: "oils",
    label: "Oils & Condiments",
    icon: "\uD83E\uDED4",
    desc: "Oils, vinegars, stocks, sauces, flavourings",
    subs: [
      "oils_condiments",
      "stocks_bases",
      "flavourings_aromatics",
    ],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Product type",
        type: "select",
        options: [
          "oils_condiments",
          "stocks_bases",
          "flavourings_aromatics",
        ],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Volume / size",
        type: "select",
        options: ["250ml", "500ml", "750ml", "1L", "2L", "5L", "10L"],
        col: "variant_value",
      },
    ],
    subLabels: {
      oils_condiments: "Oils & Condiments",
      stocks_bases: "Stocks & Bases",
      flavourings_aromatics: "Flavourings",
    },
    defaultZone: "ambient",
    defaultShelf: 365,
  },
  {
    id: "bakery",
    label: "Bakery & Bread",
    icon: "\uD83C\uDF5E",
    desc: "Rolls, wraps, pastry, bread products",
    subs: ["bakery_bread"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Bakery type",
        type: "select",
        options: ["bakery_bread"],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Pack / count",
        type: "text",
        placeholder: "e.g. 12-pack, single",
        col: "variant_value",
      },
    ],
    subLabels: {
      bakery_bread: "Bakery & Bread",
    },
    defaultZone: "ambient",
    defaultShelf: 3,
    autoAllergenIfSub: { bakery_bread: { gluten: true } },
  },
  {
    id: "beverages",
    label: "Beverages",
    icon: "\u2615",
    desc: "Coffee, tea, juices, cold drinks",
    subs: ["beverages_hot", "beverages_cold"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Beverage type",
        type: "select",
        options: ["beverages_hot", "beverages_cold"],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Pack size / format",
        type: "text",
        placeholder: "e.g. 1kg bag, 250g, 1L",
        col: "variant_value",
      },
    ],
    subLabels: {
      beverages_hot: "Hot Beverages",
      beverages_cold: "Cold Beverages",
    },
    defaultZone: "ambient",
    defaultShelf: 180,
  },
  {
    id: "packaging",
    label: "Packaging & Other",
    icon: "\uD83D\uDCE6",
    desc: "Takeaway, cleaning, equipment, misc",
    subs: ["packaging_disposables", "cleaning_chemicals"],
    receiveAttrs: [
      {
        key: "subcategory",
        label: "Type",
        type: "select",
        options: ["packaging_disposables", "cleaning_chemicals"],
        col: "subcategory",
      },
      {
        key: "variant_value",
        label: "Qty / pack",
        type: "text",
        placeholder: "e.g. 100-pack",
        col: "variant_value",
      },
    ],
    subLabels: {
      packaging_disposables: "Packaging",
      cleaning_chemicals: "Cleaning",
    },
    defaultZone: "ambient",
    defaultShelf: 730,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PILL HIERARCHY — two-level drill-down filter for F&B catalog navigation
// ═══════════════════════════════════════════════════════════════════════════

export const FNB_PILL_HIERARCHY = {
  proteins: {
    groups: [
      {
        id: "type", label: "Protein type", icon: "\uD83E\uDD69",
        subs: [
          { id: "protein_red_meat",    label: "Red Meat",   keywords: ["lamb", "beef", "wagyu", "pork", "venison", "veal", "biltong"] },
          { id: "protein_poultry",     label: "Poultry",    keywords: ["chicken", "duck", "turkey", "quail", "poultry"] },
          { id: "protein_fish",        label: "Fish",       keywords: ["fish", "hake", "salmon", "tuna", "trout", "linefish", "cape"] },
          { id: "protein_seafood",     label: "Shellfish",  keywords: ["prawn", "mussel", "calamari", "squid", "crab", "lobster", "octopus", "clam", "oyster"] },
          { id: "protein_charcuterie", label: "Charcuterie",keywords: ["chorizo", "salami", "pancetta", "bacon", "ham", "prosciutto", "boerewors"] },
        ],
      },
      {
        id: "zone", label: "Storage", icon: "\u2744",
        subs: [
          { id: "zone_frozen",       label: "Frozen",      keywords: ["frozen"] },
          { id: "zone_refrigerated", label: "Refrigerated",keywords: ["refrigerated", "fresh"] },
        ],
        fieldMatch: "temperature_zone",
      },
    ],
  },
  dairy: {
    groups: [
      {
        id: "type", label: "Dairy type", icon: "\uD83E\uDD5B",
        subs: [
          { id: "dairy_cream",   label: "Cream",   keywords: ["cream", "double cream", "heavy cream", "whipping"] },
          { id: "dairy_butter",  label: "Butter",  keywords: ["butter", "clarified"] },
          { id: "dairy_cheese",  label: "Cheese",  keywords: ["cheese", "parmesan", "brie", "gouda", "goat"] },
          { id: "dairy_eggs",    label: "Eggs",    keywords: ["egg", "eggs"] },
          { id: "dairy_milk",    label: "Milk",    keywords: ["milk", "buttermilk"] },
          { id: "dairy_yoghurt", label: "Yoghurt", keywords: ["yoghurt", "yogurt"] },
        ],
      },
      {
        id: "allergen", label: "Allergen", icon: "\u26A0",
        subs: [
          { id: "allergen_milk", label: "Contains dairy", keywords: [], allergenMatch: "milk" },
        ],
      },
    ],
  },
  produce: {
    groups: [
      {
        id: "type", label: "Produce type", icon: "\uD83E\uDD6C",
        subs: [
          { id: "produce_vegetables", label: "Vegetables", keywords: ["onion", "butternut", "tomato", "potato", "broccoli", "carrot", "beet", "squash", "courgette"] },
          { id: "produce_leaves",     label: "Leaves",     keywords: ["spinach", "lettuce", "leaves", "rocket", "kale", "chard", "watercress"] },
          { id: "produce_aromatics",  label: "Aromatics",  keywords: ["garlic", "ginger", "shallot", "leek", "chive", "spring onion"] },
          { id: "produce_fruit",      label: "Fruit",      keywords: ["lemon", "lime", "strawberry", "mango", "melon", "pineapple", "peach", "apple", "orange", "avocado"] },
        ],
      },
      {
        id: "expiry", label: "Expiry urgency", icon: "\u23F0",
        subs: [
          { id: "expiry_today", label: "Expiring today", keywords: [], expiryDays: 1 },
          { id: "expiry_week",  label: "Expiring this week", keywords: [], expiryDays: 7 },
        ],
      },
    ],
  },
  dry_goods: {
    groups: [
      {
        id: "type", label: "Goods type", icon: "\uD83C\uDF3E",
        subs: [
          { id: "dry_goods_grains", label: "Grains & Rice", keywords: ["rice", "grain", "quinoa", "barley", "farro", "bulgur", "lentil", "oat"] },
          { id: "dry_goods_flour",  label: "Flour",         keywords: ["flour", "semolina", "cornstarch", "breadcrumbs"] },
          { id: "dry_goods_sugar",  label: "Sugar",         keywords: ["sugar", "honey", "syrup", "treacle", "molasses"] },
          { id: "dry_goods_spices", label: "Herbs & Spices",keywords: ["spice", "herb", "pepper", "cumin", "paprika", "cinnamon", "bay", "thyme", "rosemary"] },
          { id: "dry_goods_canned", label: "Canned Goods",  keywords: ["canned", "tinned", "preserved", "paste", "puree", "concentrate"] },
        ],
      },
      {
        id: "allergen", label: "Allergen", icon: "\u26A0",
        subs: [
          { id: "allergen_gluten", label: "Contains gluten", keywords: [], allergenMatch: "gluten" },
        ],
      },
    ],
  },
  oils: {
    groups: [
      {
        id: "type", label: "Type", icon: "\uD83E\uDED4",
        subs: [
          { id: "oils_condiments",       label: "Oils",       keywords: ["oil", "butter", "fat", "lard"] },
          { id: "oils_vinegars",         label: "Vinegars",   keywords: ["vinegar", "balsamic", "sherry", "acv"] },
          { id: "stocks_bases",          label: "Stocks",     keywords: ["stock", "broth", "base", "demi"] },
          { id: "flavourings_aromatics", label: "Flavourings",keywords: ["vanilla", "truffle", "saffron", "miso", "worcestershire"] },
        ],
      },
    ],
  },
  bakery: {
    groups: [
      {
        id: "type", label: "Type", icon: "\uD83C\uDF5E",
        subs: [
          { id: "bakery_bread",  label: "Bread",  keywords: ["bread", "loaf", "roll", "sourdough", "baguette", "ciabatta"] },
          { id: "bakery_wrap",   label: "Wraps",  keywords: ["wrap", "tortilla", "flatbread", "pita"] },
          { id: "bakery_pastry", label: "Pastry", keywords: ["pastry", "croissant", "danish", "dough"] },
        ],
      },
    ],
  },
  beverages: {
    groups: [
      {
        id: "type", label: "Type", icon: "\u2615",
        subs: [
          { id: "beverages_hot",  label: "Hot beverages",  keywords: ["coffee", "tea", "espresso", "chai", "cocoa"] },
          { id: "beverages_cold", label: "Cold beverages", keywords: ["juice", "soda", "kombucha", "water", "cordial"] },
        ],
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ICONS — subcategory — emoji mapping for tile and list view banners
// ═══════════════════════════════════════════════════════════════════════════

export const FNB_SUBCATEGORY_ICONS = {
  protein_red_meat: "\uD83E\uDD69",
  protein_poultry: "\uD83C\uDF57",
  protein_fish: "\uD83D\uDC1F",
  protein_seafood: "\uD83E\uDD90",
  protein_charcuterie: "\uD83E\uDD53",
  dairy_butter: "\uD83E\uDDC8",
  dairy_cream: "\uD83E\uDD5B",
  dairy_cheese: "\uD83E\uDDC0",
  dairy_eggs: "\uD83E\uDD5A",
  dairy_milk: "\uD83E\uDD5B",
  dairy_yoghurt: "\uD83E\uDED5",
  produce_vegetables: "\uD83E\uDD66",
  produce_leaves: "\uD83E\uDD6C",
  produce_aromatics: "\uD83E\uDDC4",
  produce_fruit: "\uD83C\uDF4B",
  dry_goods_grains: "\uD83C\uDF3E",
  dry_goods_flour: "\uD83C\uDF3E",
  dry_goods_sugar: "\uD83C\uDF6C",
  dry_goods_spices: "\uD83C\uDF3F",
  dry_goods_canned: "\uD83E\uDD6B",
  oils_condiments: "\uD83E\uDED4",
  stocks_bases: "\uD83E\uDED5",
  flavourings_aromatics: "\uD83C\uDF3A",
  bakery_bread: "\uD83C\uDF5E",
  beverages_hot: "\u2615",
  beverages_cold: "\uD83E\uDDCA",
  packaging_disposables: "\uD83D\uDCE6",
  cleaning_chemicals: "\uD83E\uDDF4",
};

// ═══════════════════════════════════════════════════════════════════════════
// BANNER COLORS — per-world color for tile view category banner background
// ═══════════════════════════════════════════════════════════════════════════

export const FNB_WORLD_COLORS = {
  proteins:   { bg: "#FFF0E8", text: "#993C1D", border: "#D85A30" },
  dairy:      { bg: "#E8F4FB", text: "#185FA5", border: "#378ADD" },
  produce:    { bg: "#E1F5EE", text: "#0F6E56", border: "#1D9E75" },
  dry_goods:  { bg: "#FAEEDA", text: "#633806", border: "#BA7517" },
  oils:       { bg: "#F1EFE8", text: "#444441", border: "#888780" },
  bakery:     { bg: "#FBEAF0", text: "#72243E", border: "#D4537E" },
  beverages:  { bg: "#EAF3DE", text: "#27500A", border: "#639922" },
  packaging:  { bg: "#F1EFE8", text: "#444441", border: "#888780" },
  all:        { bg: "#F1EFE8", text: "#444441", border: "#888780" },
};

// ═══════════════════════════════════════════════════════════════════════════
// SMART TAGS — per-item F&B-specific tag generation for tile view
// ═══════════════════════════════════════════════════════════════════════════

export function getFnbSmartTags(item) {
  const tags = [];
  if (item.expiry_date) {
    const days = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000);
    if (days < 0)        tags.push({ label: "EXPIRED",      color: "#A32D2D", bg: "#FCEBEB" });
    else if (days <= 1)  tags.push({ label: `${days}d left`, color: "#A32D2D", bg: "#FCEBEB" });
    else if (days <= 3)  tags.push({ label: `${days}d left`, color: "#854F0B", bg: "#FAEEDA" });
    else if (days <= 7)  tags.push({ label: `${days}d`,      color: "#854F0B", bg: "#FAEEDA" });
  }
  if (item.temperature_zone === "frozen")            tags.push({ label: "Frozen",  color: "#185FA5", bg: "#E6F1FB" });
  else if (item.temperature_zone === "refrigerated") tags.push({ label: "Fridge",  color: "#0F6E56", bg: "#E1F5EE" });
  const flags = item.allergen_flags || {};
  if (flags.milk)   tags.push({ label: "Dairy",  color: "#185FA5", bg: "#E6F1FB" });
  if (flags.gluten) tags.push({ label: "Gluten", color: "#854F0B", bg: "#FAEEDA" });
  if (flags.nuts)   tags.push({ label: "Nuts",   color: "#A32D2D", bg: "#FCEBEB" });
  return tags;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — mirrors ProductWorlds.js helpers exactly
// ═══════════════════════════════════════════════════════════════════════════

/** Does item match a food world? */
export function foodItemMatchesWorld(item, world) {
  if (!world || world.id === "all") return true;
  if (world.subs && world.subs.length > 0)
    return world.subs.includes(item.subcategory);
  return false;
}

/** Get the food world for a given item */
export function foodWorldForItem(item) {
  const bySub = FOOD_WORLDS.find(
    (w) => w.subs && w.subs.includes(item.subcategory),
  );
  return bySub || FOOD_WORLDS[0];
}

/** Get default category/subcategory/zone when adding item in a world */
export function defaultsForFoodWorld(world) {
  return {
    category: "raw_material",
    subcategory: world.subs?.[0] || "",
    temperature_zone: world.defaultZone || "ambient",
    shelf_life_days: world.defaultShelf || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART SEARCH EXTENSIONS — extra F&B tokens for SmartInventory.js
// ═══════════════════════════════════════════════════════════════════════════

export const FNB_FIELD_MAP = {
  expiry: "_expiry_days",
  zone: "temperature_zone",
  shelf: "shelf_life_days",
  sub: "subcategory",
  subcategory: "subcategory",
  allergen: "_allergen",
  portions: "_portions",
};

export function expiryDaysLeft(item) {
  if (!item.expiry_date) return null;
  return Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000);
}

export function hasAllergen(item, allergen) {
  const flags = item.allergen_flags || {};
  return !!flags[allergen.toLowerCase()];
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE SUBCATEGORY TAXONOMY (LL-277 reference)
// ═══════════════════════════════════════════════════════════════════════════

export const FNB_SUBCATEGORIES = {
  protein_red_meat:      { label: "Red Meat",        world: "proteins",  icon: "\uD83E\uDD69", zone: "refrigerated", shelf: 5   },
  protein_poultry:       { label: "Poultry",         world: "proteins",  icon: "\uD83C\uDF57", zone: "refrigerated", shelf: 4   },
  protein_fish:          { label: "Fish",            world: "proteins",  icon: "\uD83D\uDC1F", zone: "frozen",       shelf: 90  },
  protein_seafood:       { label: "Shellfish",       world: "proteins",  icon: "\uD83E\uDD90", zone: "frozen",       shelf: 90  },
  protein_charcuterie:   { label: "Charcuterie",     world: "proteins",  icon: "\uD83E\uDD53", zone: "refrigerated", shelf: 14  },
  dairy_butter:          { label: "Butter",          world: "dairy",     icon: "\uD83E\uDDC8", zone: "refrigerated", shelf: 30  },
  dairy_cream:           { label: "Cream",           world: "dairy",     icon: "\uD83E\uDD5B", zone: "refrigerated", shelf: 10  },
  dairy_cheese:          { label: "Cheese",          world: "dairy",     icon: "\uD83E\uDDC0", zone: "refrigerated", shelf: 60  },
  dairy_eggs:            { label: "Eggs",            world: "dairy",     icon: "\uD83E\uDD5A", zone: "refrigerated", shelf: 21  },
  dairy_milk:            { label: "Milk",            world: "dairy",     icon: "\uD83E\uDD5B", zone: "refrigerated", shelf: 7   },
  dairy_yoghurt:         { label: "Yoghurt",         world: "dairy",     icon: "\uD83E\uDED5", zone: "refrigerated", shelf: 14  },
  produce_vegetables:    { label: "Vegetables",      world: "produce",   icon: "\uD83E\uDD66", zone: "refrigerated", shelf: 7   },
  produce_leaves:        { label: "Leaves",          world: "produce",   icon: "\uD83E\uDD6C", zone: "refrigerated", shelf: 3   },
  produce_aromatics:     { label: "Aromatics",       world: "produce",   icon: "\uD83E\uDDC4", zone: "ambient",      shelf: 30  },
  produce_fruit:         { label: "Fruit",           world: "produce",   icon: "\uD83C\uDF4B", zone: "refrigerated", shelf: 7   },
  dry_goods_grains:      { label: "Grains",          world: "dry_goods", icon: "\uD83C\uDF3E", zone: "ambient",      shelf: 365 },
  dry_goods_flour:       { label: "Flour",           world: "dry_goods", icon: "\uD83C\uDF3E", zone: "ambient",      shelf: 180 },
  dry_goods_sugar:       { label: "Sugar",           world: "dry_goods", icon: "\uD83C\uDF6C", zone: "ambient",      shelf: 365 },
  dry_goods_spices:      { label: "Herbs & Spices",  world: "dry_goods", icon: "\uD83C\uDF3F", zone: "ambient",      shelf: 730 },
  dry_goods_canned:      { label: "Canned Goods",    world: "dry_goods", icon: "\uD83E\uDD6B", zone: "ambient",      shelf: 730 },
  oils_condiments:       { label: "Oils",            world: "oils",      icon: "\uD83E\uDED4", zone: "ambient",      shelf: 730 },
  stocks_bases:          { label: "Stocks",          world: "oils",      icon: "\uD83E\uDED5", zone: "refrigerated", shelf: 5   },
  flavourings_aromatics: { label: "Flavourings",     world: "oils",      icon: "\uD83C\uDF3A", zone: "ambient",      shelf: 365 },
  bakery_bread:          { label: "Bakery & Bread",  world: "bakery",    icon: "\uD83C\uDF5E", zone: "ambient",      shelf: 3   },
  beverages_hot:         { label: "Hot Beverages",   world: "beverages", icon: "\u2615",       zone: "ambient",      shelf: 180 },
  beverages_cold:        { label: "Cold Beverages",  world: "beverages", icon: "\uD83E\uDDCA", zone: "refrigerated", shelf: 14  },
  packaging_disposables: { label: "Packaging",       world: "packaging", icon: "\uD83D\uDCE6", zone: "ambient",      shelf: 730 },
  cleaning_chemicals:    { label: "Cleaning",        world: "packaging", icon: "\uD83E\uDDF4", zone: "ambient",      shelf: 365 },
};

export const FNB_SUBCATEGORY_LABELS = Object.fromEntries(
  Object.entries(FNB_SUBCATEGORIES).map(([k, v]) => [k, v.label])
);

// LL-278: This file is the single source of truth for F&B ingredient worlds.
// Import from here — never redefine FoodWorlds locally in any component.
// When adding a new subcategory: add to FNB_SUBCATEGORIES, FOOD_WORLDS.subs,
// subLabels, FNB_SUBCATEGORY_ICONS, and FNB_WORLD_COLORS. All four, always.
