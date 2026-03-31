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
  { key: "category", label: "Category", width: 130, sortable: true },
  {
    key: "quantity_on_hand",
    label: "On Hand",
    width: 90,
    sortable: true,
    align: "right",
  },
  {
    key: "sell_price",
    label: "Sell Price",
    width: 100,
    sortable: true,
    align: "right",
  },
  {
    key: "weighted_avg_cost",
    label: "Avg Cost",
    width: 100,
    sortable: true,
    align: "right",
  },
  {
    key: "_margin",
    label: "Margin %",
    width: 90,
    sortable: true,
    align: "right",
  },
  {
    key: "is_active",
    label: "Active",
    width: 72,
    sortable: true,
    align: "center",
  },
  {
    key: "is_featured",
    label: "Featured",
    width: 82,
    sortable: true,
    align: "center",
  },
  { key: "loyalty_category", label: "Loyalty Cat", width: 140, sortable: true },
  { key: "_actions", label: "", width: 96, sortable: false, align: "center" },
];

// ── Sub-category keywords (derived from name — no sub_category column) ───
// ── 3-tier pill hierarchy: category → sub-group → brand/detail ───────────
// keywords[] matched against item.name (case-insensitive)
const PILL_HIERARCHY = {
  flower: {
    subs: [
      { id: "indica", label: "Indica", keywords: ["indica"], brands: [] },
      { id: "sativa", label: "Sativa", keywords: ["sativa"], brands: [] },
      { id: "hybrid", label: "Hybrid", keywords: ["hybrid"], brands: [] },
      { id: "cbd", label: "CBD", keywords: ["cbd"], brands: [] },
      {
        id: "preroll",
        label: "Pre-Rolls",
        keywords: ["pre-roll", "pre roll"],
        brands: [
          { id: "house", label: "House", keywords: ["house pre-roll"] },
          { id: "infused", label: "Infused", keywords: ["infused pre-roll"] },
        ],
      },
      { id: "1g", label: "1g", keywords: ["1g"], brands: [] },
      { id: "3.5g", label: "3.5g", keywords: ["3.5g"], brands: [] },
      { id: "7g", label: "7g", keywords: ["7g"], brands: [] },
      {
        id: "28g",
        label: "28g / Oz",
        keywords: ["28g", "oz", "ounce"],
        brands: [],
      },
    ],
  },
  concentrate: {
    subs: [
      {
        id: "badder",
        label: "Badder / Wax",
        keywords: ["badder", "wax"],
        brands: [],
      },
      { id: "shatter", label: "Shatter", keywords: ["shatter"], brands: [] },
      { id: "crumble", label: "Crumble", keywords: ["crumble"], brands: [] },
      {
        id: "terpsauce",
        label: "Terp Sauce",
        keywords: ["terp sauce"],
        brands: [],
      },
      {
        id: "diamonds",
        label: "THCA Diamonds",
        keywords: ["diamonds"],
        brands: [],
      },
      { id: "kief", label: "Kief", keywords: ["kief"], brands: [] },
      { id: "rso", label: "RSO", keywords: ["rso"], brands: [] },
      {
        id: "distillate",
        label: "Distillate",
        keywords: ["distillate"],
        brands: [],
      },
      { id: "hash", label: "Hash", keywords: ["hash"], brands: [] },
    ],
  },
  edible: {
    subs: [
      {
        id: "gummies",
        label: "Gummies",
        keywords: ["gumm"],
        brands: [
          { id: "10mg", label: "10mg THC", keywords: ["10mg"] },
          { id: "20mg", label: "20mg THC", keywords: ["20mg"] },
        ],
      },
      { id: "chocolate", label: "Chocolate", keywords: ["choc"], brands: [] },
      {
        id: "tincture",
        label: "Tinctures",
        keywords: ["tincture"],
        brands: [],
      },
      { id: "capsule", label: "Capsules", keywords: ["capsule"], brands: [] },
    ],
  },
  accessory: {
    subs: [
      {
        id: "rolling_papers",
        label: "Rolling Papers",
        keywords: ["rolling paper", "1.25", "slim pap"],
        brands: [
          { id: "raw", label: "RAW", keywords: ["raw "] },
          { id: "ocb", label: "OCB", keywords: ["ocb"] },
          { id: "gizeh", label: "Gizeh", keywords: ["gizeh"] },
          { id: "elements", label: "Elements", keywords: ["elements"] },
        ],
      },
      {
        id: "cones",
        label: "Cones",
        keywords: ["cone"],
        brands: [
          {
            id: "raw_classic",
            label: "RAW Classic",
            keywords: ["raw classic"],
          },
          { id: "raw_black", label: "RAW Black", keywords: ["raw black"] },
          {
            id: "raw_organic",
            label: "RAW Organic",
            keywords: ["raw organic"],
          },
          { id: "raw_lean", label: "RAW Lean", keywords: ["raw lean"] },
          { id: "gizeh_cone", label: "Gizeh", keywords: ["gizeh"] },
        ],
      },
      {
        id: "tips",
        label: "Tips & Filters",
        keywords: ["tip", "filter"],
        brands: [
          {
            id: "raw_tips",
            label: "RAW Tips",
            keywords: ["raw tips", "raw pre-rolled"],
          },
          { id: "gizeh_tips", label: "Gizeh Tips", keywords: ["gizeh tips"] },
        ],
      },
      {
        id: "rolling_machines",
        label: "Rolling Machines",
        keywords: ["rolling machine"],
        brands: [
          { id: "raw_110", label: "RAW 110mm", keywords: ["110mm"] },
          { id: "raw_79", label: "RAW 79mm", keywords: ["79mm"] },
        ],
      },
      { id: "grinders", label: "Grinders", keywords: ["grinder"], brands: [] },
      {
        id: "pipes",
        label: "Pipes & Bongs",
        keywords: ["pipe", "bong", "dab rig"],
        brands: [{ id: "dab_rig", label: "Dab Rigs", keywords: ["dab rig"] }],
      },
      {
        id: "dab_tools",
        label: "Dab Tools",
        keywords: ["dab tool", "quartz banger", "fullmelt"],
        brands: [],
      },
      {
        id: "storage",
        label: "Storage Jars",
        keywords: ["jar", "uv glass"],
        brands: [],
      },
      {
        id: "humidity",
        label: "Humidity Packs",
        keywords: ["bovida", "humidity"],
        brands: [
          { id: "rh58", label: "58% RH", keywords: ["58%"] },
          { id: "rh62", label: "62% RH", keywords: ["62%"] },
        ],
      },
      {
        id: "hemp_wick",
        label: "Hemp Wick",
        keywords: ["hemp wick"],
        brands: [],
      },
    ],
  },
  hardware: {
    subs: [
      {
        id: "lighting",
        label: "Lighting",
        keywords: ["led", "light", "t5", "fluorescent"],
        brands: [
          { id: "led_100", label: "LED 100W", keywords: ["100w"] },
          { id: "led_240", label: "LED 240W", keywords: ["240w"] },
          { id: "t5", label: "T5 Propagation", keywords: ["t5"] },
        ],
      },
      {
        id: "tents",
        label: "Grow Tents",
        keywords: ["tent"],
        brands: [
          { id: "tent_60", label: "60×60cm", keywords: ["60x60"] },
          { id: "tent_80", label: "80×80cm", keywords: ["80x80"] },
          { id: "tent_120", label: "120×120cm", keywords: ["120x120"] },
        ],
      },
      {
        id: "fans",
        label: "Fans & Filters",
        keywords: ["fan", "filter", "inline", "carbon"],
        brands: [],
      },
      {
        id: "pots",
        label: "Fabric Pots",
        keywords: ["fabric pot"],
        brands: [
          { id: "pot_5", label: "5L", keywords: ["pot 5l"] },
          { id: "pot_10", label: "10L", keywords: ["pot 10l"] },
          { id: "pot_20", label: "20L", keywords: ["pot 20l"] },
          { id: "pot_25", label: "25L", keywords: ["pot 25l"] },
        ],
      },
      {
        id: "meters",
        label: "Meters",
        keywords: ["meter", "ph meter", "ec/tds", "thermometer"],
        brands: [],
      },
      {
        id: "propagation",
        label: "Propagation",
        keywords: ["heat mat", "rockwool", "propagation"],
        brands: [],
      },
      {
        id: "training",
        label: "Training",
        keywords: ["trellis", "scrog"],
        brands: [],
      },
    ],
  },
  raw_material: {
    subs: [
      {
        id: "biobizz",
        label: "BioBizz",
        keywords: ["biobizz"],
        brands: [
          { id: "bb_all", label: "All·Mix", keywords: ["all mix"] },
          { id: "bb_light", label: "Light·Mix", keywords: ["light mix"] },
          { id: "bb_grow", label: "Bio·Grow", keywords: ["bio-grow"] },
          { id: "bb_bloom", label: "Bio·Bloom", keywords: ["bio-bloom"] },
          { id: "bb_top", label: "Top·Max", keywords: ["top-max"] },
          { id: "bb_root", label: "Root·Juice", keywords: ["root-juice"] },
        ],
      },
      {
        id: "canna",
        label: "Canna",
        keywords: ["canna ", "cannazym"],
        brands: [
          { id: "canna_coco_a", label: "Coco A", keywords: ["coco a"] },
          { id: "canna_coco_b", label: "Coco B", keywords: ["coco b"] },
          { id: "canna_pk", label: "PK 13/14", keywords: ["pk 13"] },
          { id: "canna_rhizo", label: "Rhizotonic", keywords: ["rhizotonic"] },
          { id: "cannazym", label: "Cannazym", keywords: ["cannazym"] },
        ],
      },
      { id: "plagron", label: "Plagron", keywords: ["plagron"], brands: [] },
      { id: "calmag", label: "CalMag", keywords: ["calmag"], brands: [] },
      {
        id: "soil",
        label: "Soil & Coco",
        keywords: ["coco peat", "plagron universal"],
        brands: [],
      },
      {
        id: "amendments",
        label: "Amendments",
        keywords: [
          "perlite",
          "vermiculite",
          "clay pebble",
          "leca",
          "mycorrhizae",
        ],
        brands: [],
      },
      {
        id: "prop_media",
        label: "Propagation",
        keywords: ["rockwool", "seedling"],
        brands: [],
      },
    ],
  },
  finished_product: {
    subs: [
      {
        id: "merch",
        label: "Merch",
        keywords: ["medi recreational"],
        brands: [],
      },
      {
        id: "wellness",
        label: "Wellness",
        keywords: ["lions mane"],
        brands: [],
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
  const [subFilter, setSubFilter] = useState(null); // tier-2
  const [brandFilter, setBrandFilter] = useState(null); // tier-3
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

    // Category pill filter
    if (catFilter !== "all") {
      list = list.filter((i) => i.category === catFilter);
    }

    // Sub-category filter (tier 2 — keyword match on name)
    if (subFilter && PILL_HIERARCHY[catFilter]) {
      const sub = PILL_HIERARCHY[catFilter].subs.find(
        (s) => s.id === subFilter,
      );
      if (sub) {
        list = list.filter((i) =>
          sub.keywords.some((kw) =>
            i.name.toLowerCase().includes(kw.toLowerCase()),
          ),
        );
      }
    }

    // Brand filter (tier 3)
    if (brandFilter && subFilter && PILL_HIERARCHY[catFilter]) {
      const sub = PILL_HIERARCHY[catFilter].subs.find(
        (s) => s.id === subFilter,
      );
      const brand = sub?.brands?.find((b) => b.id === brandFilter);
      if (brand) {
        list = list.filter((i) =>
          brand.keywords.some((kw) =>
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
    subFilter,
    brandFilter,
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
    setAddDraft({
      name: "",
      category: catFilter !== "all" ? catFilter : "flower",
      sell_price: "",
      weighted_avg_cost: "",
      quantity_on_hand: 0,
      is_active: true,
      is_featured: false,
      loyalty_category:
        catFilter !== "all"
          ? PILL_HIERARCHY[catFilter]
            ? catFilter === "flower" || catFilter === "concentrate"
              ? "cannabis_flower"
              : catFilter === "edible"
                ? "cannabis_edible"
                : catFilter === "accessory" || catFilter === "hardware"
                  ? "accessories"
                  : catFilter === "raw_material"
                    ? "grow_supplies"
                    : "health_wellness"
            : "health_wellness"
          : "cannabis_flower",
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
    setSubFilter(null);
    setBrandFilter(null);
    setSearch("");
  }

  function selectSub(subId) {
    if (subFilter === subId) {
      setSubFilter(null);
      setBrandFilter(null);
    } else {
      setSubFilter(subId);
      setBrandFilter(null);
    }
  }

  function selectBrand(brandId) {
    setBrandFilter(brandFilter === brandId ? null : brandId);
  }

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
          subFilter={subFilter}
          brandFilter={brandFilter}
          onSelectCat={selectCat}
          onSelectSub={selectSub}
          onSelectBrand={selectBrand}
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
          title={`+ Add ${catFilter !== "all" ? CATEGORY_ICONS[catFilter] + " " + CATEGORY_LABELS[catFilter] : "Inventory"} Item`}
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
  subFilter,
  brandFilter,
  onSelectCat,
  onSelectSub,
  onSelectBrand,
  search,
  onSearch,
  searchRef,
  items,
  T,
}) {
  // Live item counts per category
  const counts = useMemo(() => {
    const m = { all: items.length };
    items.forEach((i) => {
      m[i.category] = (m[i.category] || 0) + 1;
    });
    return m;
  }, [items]);

  // Per sub-category counts (keyword match against name within the active category)
  const subCounts = useMemo(() => {
    if (catFilter === "all" || !PILL_HIERARCHY[catFilter]) return {};
    const catItems = items.filter((i) => i.category === catFilter);
    const m = {};
    PILL_HIERARCHY[catFilter].subs.forEach((sub) => {
      m[sub.id] = catItems.filter((i) =>
        sub.keywords.some((kw) =>
          i.name.toLowerCase().includes(kw.toLowerCase()),
        ),
      ).length;
    });
    return m;
  }, [items, catFilter]);

  // Per brand counts (within active sub)
  const brandCounts = useMemo(() => {
    if (!subFilter || !PILL_HIERARCHY[catFilter]) return {};
    const sub = PILL_HIERARCHY[catFilter].subs.find((s) => s.id === subFilter);
    if (!sub?.brands?.length) return {};
    const subItems = items.filter(
      (i) =>
        i.category === catFilter &&
        sub.keywords.some((kw) =>
          i.name.toLowerCase().includes(kw.toLowerCase()),
        ),
    );
    const m = {};
    sub.brands.forEach((b) => {
      m[b.id] = subItems.filter((i) =>
        b.keywords.some((kw) =>
          i.name.toLowerCase().includes(kw.toLowerCase()),
        ),
      ).length;
    });
    return m;
  }, [items, catFilter, subFilter]);

  const allCats = [
    { id: "all", label: "All", icon: "🔍" },
    ...CANNABIS_CATEGORIES.map((c) => ({
      id: c,
      label: CATEGORY_LABELS[c] || c,
      icon: CATEGORY_ICONS[c] || "📦",
      hasSub: Boolean(PILL_HIERARCHY[c]?.subs?.length),
    })),
  ];

  const activeSubs =
    catFilter !== "all" ? PILL_HIERARCHY[catFilter]?.subs || [] : [];
  const activeSub = activeSubs.find((s) => s.id === subFilter);
  const activeBrands = activeSub?.brands || [];

  // ── Tier pill style helper ──────────────────────────────────────────────
  const pill = (active, color = null, size = 12.5) => ({
    padding: "4px 12px",
    borderRadius: 99,
    border: `1.5px solid ${active ? color || T.accent : T.border}`,
    background: active ? color || T.accent : T.white,
    color: active ? T.white : T.ink500,
    fontWeight: active ? 700 : 400,
    fontSize: size,
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
    color: active ? T.white : T.ink400,
    borderRadius: 99,
    padding: "0 6px",
    fontSize: 10,
    fontWeight: 700,
    minWidth: 18,
    textAlign: "center",
    display: "inline-block",
  });

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* ── TIER 1: Category pills ──────────────────────────────────────── */}
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
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCat(cat.id)}
              style={pill(active)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span style={countBadge(cnt, active)}>{cnt}</span>
              {cat.hasSub && (
                <span
                  style={{
                    fontSize: 8,
                    opacity: active ? 0.8 : 0.45,
                    marginLeft: 1,
                  }}
                >
                  {active && subFilter ? "▲" : "▼"}
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

      {/* ── TIER 2: Sub-category pills (visible when a category is selected) ── */}
      {activeSubs.length > 0 && (
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
            flexWrap: "wrap",
          }}
        >
          {/* Breadcrumb label */}
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
            {CATEGORY_ICONS[catFilter]} {CATEGORY_LABELS[catFilter]}:
          </span>

          {activeSubs.map((sub) => {
            const active = subFilter === sub.id;
            const cnt = subCounts[sub.id] || 0;
            const hasBrands = sub.brands?.length > 0;
            return (
              <button
                key={sub.id}
                onClick={() => onSelectSub(sub.id)}
                style={{
                  ...pill(active, T.accentMid, 12),
                  border: `1.5px solid ${active ? T.accentMid : T.borderDark}`,
                  background: active ? T.accentMid : T.accentXlit,
                  color: active ? T.white : T.accentMid,
                }}
              >
                <span>{sub.label}</span>
                {cnt > 0 && <span style={countBadge(cnt, active)}>{cnt}</span>}
                {hasBrands && (
                  <span style={{ fontSize: 8, opacity: active ? 0.8 : 0.45 }}>
                    {active && brandFilter ? "▲" : "▼"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── TIER 3: Brand pills (visible when a sub with brands is selected) ── */}
      {activeBrands.length > 0 && subFilter && (
        <div
          style={{
            display: "flex",
            gap: 4,
            overflowX: "auto",
            paddingBottom: 5,
            paddingTop: 4,
            paddingLeft: 20,
            borderTop: `1px dashed ${T.border}`,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Breadcrumb */}
          <span
            style={{
              fontSize: 10,
              color: T.ink300,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginRight: 2,
              flexShrink: 0,
            }}
          >
            {activeSub?.label} →
          </span>

          {activeBrands.map((brand) => {
            const active = brandFilter === brand.id;
            const cnt = brandCounts[brand.id] || 0;
            return (
              <button
                key={brand.id}
                onClick={() => onSelectBrand(brand.id)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 99,
                  border: `1.5px solid ${active ? T.blue : T.borderDark}`,
                  background: active ? T.blueLit : T.white,
                  color: active ? T.blue : T.ink400,
                  fontWeight: active ? 700 : 400,
                  fontSize: 11,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: T.font,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                }}
              >
                <span>{brand.label}</span>
                {cnt > 0 && (
                  <span
                    style={{
                      background: active ? T.blue + "25" : T.ink50,
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
              <span
                style={{ fontSize: 11, fontWeight: 600, color: T.accentMid }}
              >
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
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
                display: "inline-block",
              }}
            >
              {CATEGORY_LABELS[item.category] || item.category}
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
  const totalWidth = DETAIL_COLS.reduce((s, c) => s + c.width, 0);

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
        }}
      >
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
                  borderRight: `1px solid ${T.border}`,
                  width: col.width,
                  whiteSpace: "nowrap",
                  background: sortKey === col.key ? T.accentXlit : T.ink50,
                }}
              >
                {col.label}
                {col.sortable && sortKey === col.key && (
                  <span style={{ marginLeft: 4 }}>
                    {sortDir === "asc" ? "↑" : "↓"}
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
                      maxWidth: col.width,
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
                    {col.key === "category" && (
                      <span
                        style={{
                          background: T.accentLit,
                          color: T.accentMid,
                          padding: "2px 8px",
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    )}
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
        {search
          ? `No items match "${search}"`
          : catFilter !== "all"
            ? `No ${CATEGORY_LABELS[catFilter] || catFilter} items yet`
            : "No inventory items"}
      </div>
      <div style={{ fontSize: 13, marginBottom: 20 }}>
        {catFilter !== "all" && !search
          ? "Items show here once their category is set correctly in the database."
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
