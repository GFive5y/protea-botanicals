// src/components/hq/HQStock.js v3.1 — WP-STOCK-UI Session A
// Surgical addition: CannabisItemsView for cannabis_retail profile
// All other profiles (food_beverage, general_retail, mixed_retail) — UNCHANGED
// ESLint fixes: renderAccPanel disable (kept for future use), avail disable in grid

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import StockItemModal from "../StockItemModal";
import StockItemPanel from "./StockItemPanel";
import CannabisDetailView from "./CannabisDetailView";
import StockReceiveModal from "./StockReceiveModal";
import StockOpeningCalibration from "./StockOpeningCalibration";
import StockPricingPanel from "./StockPricingPanel";
import StockChannelPanel from "./StockChannelPanel";
import StockReceiveHistoryPanel from "./StockReceiveHistoryPanel";
import HQPurchaseOrders from "./HQPurchaseOrders";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Package, Tag, ShoppingCart, Globe, AlignJustify, LayoutGrid, Table2,
  Star, Loader2, Camera, Trash2, X, AlertTriangle, Check,
  Leaf, Gem, FlaskConical, Wrench, Heart, Wind, Sprout, Lightbulb,
  ScrollText, Shirt, Cookie,
} from "lucide-react";
import { SparkLine, BulletChart } from "../viz";
import StockIntelPanel from "./StockIntelPanel";
import ActionCentre from "../shared/ActionCentre";
import {
  PRODUCT_WORLDS,
  itemMatchesWorld,
  worldForItem,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from "./ProductWorlds";
import { T } from "../../styles/tokens";
// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)

const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.font,
  background: T.surface,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  color: T.ink900,
};
const sSelect = { ...sInput, cursor: "pointer" };
const sCard = {
  background: T.surface,
  border: "1px solid " + T.border,
  borderRadius: "4px",
  padding: "12px 14px",
  marginBottom: "6px",
};
const sMetricBase = {
  borderRadius: "3px",
  padding: "3px 8px",
  fontSize: "11px",
  fontFamily: T.font,
  whiteSpace: "nowrap",
};
const sTh = {
  textAlign: "left",
  padding: "11px 12px",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.border}`,
  fontWeight: 700,
  fontFamily: T.font,
  whiteSpace: "nowrap",
  background: T.surface,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.border}`,
  fontSize: "13px",
  fontFamily: T.font,
  verticalAlign: "middle",
};
const sPanelHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  background: T.bg,
  border: "1px solid " + T.border,
  borderRadius: "4px",
  marginBottom: "4px",
  cursor: "pointer",
  userSelect: "none",
};

const sBtn = (v = "primary") => ({
  padding: "7px 16px",
  background: v === "primary" ? T.accentMid : "transparent",
  color: v === "primary" ? "#fff" : T.accentMid,
  border: v === "primary" ? "none" : `1px solid ${T.accentBd}`,
  borderRadius: "3px",
  fontSize: "12px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.font,
});

const sMetric = (variant) => {
  const map = {
    default: {
      background: T.bg,
      border: "1px solid " + T.border,
      color: T.ink500,
    },
    danger: {
      background: T.dangerLight,
      border: "1px solid " + T.dangerBd,
      color: T.danger,
    },
    warning: {
      background: T.warningLight,
      border: "1px solid " + T.warningBd,
      color: T.warning,
    },
    success: {
      background: T.successLight,
      border: "1px solid " + T.successBd,
      color: T.success,
    },
    accent: {
      background: T.accentLight,
      border: "1px solid " + T.accentBd,
      color: T.accentMid,
    },
    info: {
      background: T.infoLight,
      border: "1px solid " + T.infoBd,
      color: T.info,
    },
  };
  return { ...sMetricBase, ...(map[variant] || map.default) };
};

const sBadgeBase = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "2px",
  padding: "1px 6px",
};
const sBadge = (v) => ({
  ...sBadgeBase,
  ...(v === "danger"
    ? {
        background: T.dangerLight,
        color: T.danger,
        border: "1px solid " + T.dangerBd,
      }
    : {}),
  ...(v === "warning"
    ? {
        background: T.warningLight,
        color: T.warning,
        border: "1px solid " + T.warningBd,
      }
    : {}),
  ...(v === "accent"
    ? {
        background: T.accentLight,
        color: T.accentMid,
        border: "1px solid " + T.accentBd,
      }
    : {}),
  ...(v === "info"
    ? { background: T.infoLight, color: T.info, border: "1px solid " + T.infoBd }
    : {}),
  ...(v === "default"
    ? { background: T.bg, color: T.ink500, border: "1px solid " + T.border }
    : {}),
  ...(v === "success"
    ? {
        background: T.successLight,
        color: T.success,
        border: "1px solid " + T.successBd,
      }
    : {}),
});

const PANEL_LABELS = {
  cannabis_retail: {
    p1: "Raw Materials & Concentrates",
    p2: "Terpenes",
    p3: "Hardware & Packaging",
    p4: "Finished Goods",
  },
  cannabis_dispensary: {
    p1: "Raw Materials & Concentrates",
    p2: "Terpenes",
    p3: "Hardware & Packaging",
    p4: "Finished Goods",
  },
  food_beverage: {
    p1: "Ingredients",
    p2: "Flavourings & Botanicals",
    p3: "Packaging & Equipment",
    p4: "Finished Goods",
  },
  general_retail: {
    p1: "Raw Materials",
    p2: "Botanicals & Additives",
    p3: "Hardware & Packaging",
    p4: "Finished Goods",
  },
  mixed_retail: {
    p1: "Raw Materials",
    p2: "Terpenes & Flavourings",
    p3: "Hardware & Packaging",
    p4: "Finished Goods",
  },
};

const PANEL_CATS_BY_PROFILE = {
  cannabis_retail: {
    p1: ["raw_material", "concentrate", "flower"],
    p2: ["terpene"],
    p3: ["hardware", "packaging", "equipment"],
    p4: ["finished_product"],
  },
  cannabis_dispensary: {
    p1: ["raw_material", "concentrate", "flower"],
    p2: ["terpene"],
    p3: ["hardware", "packaging", "equipment"],
    p4: ["finished_product"],
  },
  food_beverage: {
    p1: ["raw_material"],
    p2: ["terpene", "accessory"],
    p3: ["packaging", "equipment"],
    p4: ["finished_product"],
  },
  general_retail: {
    p1: ["raw_material", "accessory"],
    p2: ["other"],
    p3: ["packaging", "equipment", "hardware"],
    p4: ["finished_product"],
  },
  mixed_retail: {
    p1: ["raw_material", "concentrate", "flower"],
    p2: ["terpene", "accessory"],
    p3: ["hardware", "packaging", "equipment"],
    p4: ["finished_product"],
  },
};

const CANNABIS_PROFILES = [
  "cannabis_retail",
  "cannabis_dispensary",
  "mixed_retail",
];

// CATEGORY_LABELS imported from ProductWorlds.js

const FOOD_CATS = [
  "raw_material",
  "accessory",
  "packaging",
  "equipment",
  "finished_product",
  "ingredient",
  "other",
];

const fmt = (n) =>
  n == null
    ? "—"
    : "R" +
      Number(n).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const fmtQty = (n, unit) =>
  n == null
    ? "—"
    : `${Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}${unit ? " " + unit : ""}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const expiryStatus = (item) => {
  if (!item.expiry_date) return null;
  const days = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000);
  if (days < 0)
    return { label: "EXPIRED", variant: "danger", days, color: T.danger };
  if (days < 7)
    return { label: `${days}d LEFT`, variant: "danger", days, color: T.danger };
  if (days < 30)
    return { label: `${days}d`, variant: "warning", days, color: T.warning };
  return {
    label: fmtDate(item.expiry_date),
    variant: "ok",
    days,
    color: T.ink500,
  };
};

const tempInfo = (zone) =>
  ({
    frozen: {
      label: "FRZ",
      bg: "#EFF6FF",
      color: "#1D4ED8",
      border: "#BFDBFE",
    },
    refrigerated: {
      label: "REF",
      bg: "#F0FDF4",
      color: "#166534",
      border: "#BBF7D0",
    },
    ambient: { label: "AMB", bg: T.bg, color: T.ink500, border: T.border },
  })[zone] || null;

const countAllergens = (flags) =>
  !flags || typeof flags !== "object"
    ? 0
    : Object.values(flags).filter(Boolean).length;
const isLowFn = (item) =>
  item.reorder_level != null &&
  (item.quantity_on_hand || 0) <= item.reorder_level;

// Module-scoped Lucide world icon map — referenced by both ShopTab and HQStock
const WORLD_ICON_MAP = {
  all: <Package size={18} color={T.ink400} />,
  flower: <Leaf size={18} color={T.accent} />,
  hash: <Gem size={18} color={T.ink600} />,
  concentrate: <Gem size={18} color={T.info} />,
  vape: <Wind size={18} color={T.ink600} />,
  preroll: <ScrollText size={18} color={T.warning} />,
  edible: <Cookie size={18} color={T.warning} />,
  seeds: <Sprout size={18} color={T.accent} />,
  substrate: <Sprout size={18} color={T.accentMid} />,
  nutrients: <FlaskConical size={18} color={T.info} />,
  equipment: <Lightbulb size={18} color={T.warning} />,
  wellness: <Heart size={18} color={T.accent} />,
  papers: <ScrollText size={18} color={T.ink600} />,
  accessories: <Wrench size={18} color={T.ink600} />,
  merch: <Shirt size={18} color={T.ink600} />,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHOP TAB — visual product grid, image upload, visibility + featured controls
// Owner manages exactly what the website shows from this panel
// ═══════════════════════════════════════════════════════════════════════════════
function ShopTab({ items, tenantId, onRefresh }) {
  const BUCKET_URL =
    "https://uvicrqapgzcdvozxrreo.supabase.co/storage/v1/object/public/product-images";
  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const filtered = items
    .filter((i) => i.sell_price > 0)
    .filter((i) => catFilter === "all" || i.category === catFilter)
    .filter(
      (i) =>
        !search ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.brand || "").toLowerCase().includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (a.display_order || 0) - (b.display_order || 0) ||
        (a.name || "").localeCompare(b.name || ""),
    );

  const shopLive = filtered.filter(
    (i) => i.is_active && (i.quantity_on_hand || 0) > 0,
  ).length;
  const soldOut = filtered.filter(
    (i) => i.is_active && (i.quantity_on_hand || 0) === 0,
  ).length;
  const hidden = filtered.filter((i) => !i.is_active).length;
  const noPhoto = filtered.filter((i) => !i.image_url).length;

  const handleImageUpload = async (item, file) => {
    if (!file) return;
    setUploading((p) => ({ ...p, [item.id]: true }));
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const path = `${tenantId}/${item.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const url = `${BUCKET_URL}/${path}`;
      const { error: dbErr } = await supabase
        .from("inventory_items")
        .update({ image_url: url })
        .eq("id", item.id);
      if (dbErr) throw dbErr;
      showToast(`Photo saved for ${item.name}`);
      onRefresh();
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading((p) => ({ ...p, [item.id]: false }));
    }
  };

  const toggleField = async (item, field) => {
    setSaving((p) => ({ ...p, [item.id]: true }));
    const { error } = await supabase
      .from("inventory_items")
      .update({ [field]: !item[field] })
      .eq("id", item.id);
    if (!error) onRefresh();
    setSaving((p) => ({ ...p, [item.id]: false }));
  };

  const removeImage = async (item) => {
    setSaving((p) => ({ ...p, [item.id]: true }));
    await supabase
      .from("inventory_items")
      .update({ image_url: null })
      .eq("id", item.id);
    onRefresh();
    setSaving((p) => ({ ...p, [item.id]: false }));
  };

  const CAT_ICON_MAP = CATEGORY_ICONS;
  const CAT_LABEL_MAP = CATEGORY_LABELS;

  return (
    <div style={{ fontFamily: T.font }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 999,
            padding: "10px 18px",
            borderRadius: T.radius.md,
            background: toast.type === "error" ? T.danger : T.success,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "1px",
          background: T.border,
          borderRadius: T.radius.md,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          marginBottom: 20,
        }}
      >
        {[
          ["Live in Shop", shopLive, T.success],
          ["Sold Out (visible)", soldOut, T.warning],
          ["Hidden", hidden, T.ink500],
          ["No Photo Yet", noPhoto, T.danger],
        ].map(([label, val, color]) => (
          <div
            key={label}
            style={{
              background: T.surface,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
            >
              {val}
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.ink400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          style={{
            padding: "7px 10px",
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.md,
            fontSize: 12,
            fontFamily: T.font,
            width: 220,
          }}
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {CAT_LABEL_MAP[c] || c}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 11, color: T.ink500 }}>
          {filtered.length} products · items without sell price are excluded
        </div>
      </div>

      {/* Product grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))",
          gap: 12,
        }}
      >
        {filtered.map((item) => {
          const inStock = (item.quantity_on_hand || 0) > 0;
          const isLive = item.is_active && inStock;
          const isSoldOut = item.is_active && !inStock;
          const isHidden = !item.is_active;
          const statusColor = isLive
            ? T.success
            : isSoldOut
              ? T.warning
              : T.ink300;
          const statusLabel = isLive
            ? "LIVE"
            : isSoldOut
              ? "SOLD OUT"
              : "HIDDEN";

          return (
            <div
              key={item.id}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius.lg,
                overflow: "hidden",
                opacity: isHidden ? 0.65 : 1,
              }}
            >
              {/* Image area */}
              <div
                style={{
                  height: 130,
                  background: item.image_url
                    ? "#f5f5f3"
                    : `linear-gradient(135deg,${isHidden ? T.ink500 : T.accentText} 0%,${isHidden ? T.ink400 : T.accent} 100%)`,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: 8,
                    }}
                  />
                ) : (
                  <div style={{
                    width:40,height:40,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    filter: isHidden ? "grayscale(1)" : "none",
                  }}>
                    {WORLD_ICON_MAP[worldForItem(item)?.id] || <Package size={22} color={T.ink400} />}
                  </div>
                )}

                {/* Status badge */}
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    background: isLive
                      ? T.success
                      : isSoldOut
                        ? "#b5935a"
                        : "#666",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: T.radius.lg,
                    letterSpacing: "0.1em",
                  }}
                >
                  {statusLabel}
                </div>

                {/* Featured badge */}
                {item.is_featured && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "#b5935a",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: T.radius.lg,
                    }}
                  >
                    <Star size={9} fill="currentColor" strokeWidth={0} style={{marginRight:2,verticalAlign:"middle"}} />FEATURED
                  </div>
                )}

                {/* Upload button overlay */}
                <label
                  style={{
                    position: "absolute",
                    bottom: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: T.radius.md,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageUpload(item, e.target.files[0])}
                  />
                  {uploading[item.id] ? <Loader2 size={12} style={{animation:"spin 1s linear infinite",verticalAlign:"middle"}} /> : <Camera size={12} style={{verticalAlign:"middle"}} />}{" "}
                  {item.image_url ? "Replace" : "Add photo"}
                </label>
              </div>

              {/* Product info */}
              <div style={{ padding: "10px 12px" }}>
                {item.brand && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.accentMid,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    {item.brand}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.ink900,
                    lineHeight: 1.3,
                    marginBottom: 6,
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{ fontSize: 14, fontWeight: 700, color: T.accent }}
                  >
                    R{parseFloat(item.sell_price).toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: statusColor,
                      fontWeight: 600,
                    }}
                  >
                    {item.quantity_on_hand || 0} in stock
                  </span>
                </div>

                {/* Controls */}
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => toggleField(item, "is_active")}
                    disabled={saving[item.id]}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1px solid ${item.is_active ? T.danger : T.success}`,
                      borderRadius: T.radius.md,
                      background: "transparent",
                      color: item.is_active ? T.danger : T.success,
                      cursor: "pointer",
                    }}
                  >
                    {item.is_active ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => toggleField(item, "is_featured")}
                    disabled={saving[item.id]}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1px solid ${item.is_featured ? "#b5935a" : T.border}`,
                      borderRadius: T.radius.md,
                      background: item.is_featured ? "#FFF8F0" : "transparent",
                      color: item.is_featured ? "#b5935a" : T.ink500,
                      cursor: "pointer",
                    }}
                  >
                    {item.is_featured ? <><Star size={9} fill="currentColor" strokeWidth={0} style={{marginRight:2,verticalAlign:"middle"}} /> Featured</> : "Feature"}
                  </button>
                  {item.image_url && (
                    <button
                      onClick={() => removeImage(item)}
                      title="Remove photo"
                      style={{
                        padding: "5px 8px",
                        fontSize: 11,
                        border: `1px solid ${T.dangerBd}`,
                        borderRadius: T.radius.md,
                        background: T.dangerLight,
                        color: T.danger,
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: T.ink300,
            fontSize: 13,
          }}
        >
          No products with a sell price yet. Set prices in the Pricing tab to
          control what appears in your shop.
        </div>
      )}
    </div>
  );
}

export default function HQStock() {
  const { industryProfile, tenantId } = useTenant();

  const [items, setItems] = useState([]);
  const [qrMap, setQrMap] = useState({}); // item_id → qr_codes[]
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subTab, setSubTab] = useState("overview");
  const [openPanels, setOpenPanels] = useState({
    p1: true,
    p2: true,
    p3: false,
    p4: false,
  });
  const [movItem, setMovItem] = useState(null);
  const [movList, setMovList] = useState([]);
  const [movLoading, setMovLoading] = useState(false);
  const [modalItem, setModalItem] = useState(undefined);
  const [modalSaving, setModalSaving] = useState(false);
  const [showWorldPicker, setShowWorldPicker] = useState(false);
  const [panelItem, setPanelItem] = useState(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [calibOpen, setCalibOpen] = useState(false);
  const [avcoAlertItems, setAvcoAlertItems] = useState([]);
  const [checkAvcoAfterLoad, setCheckAvcoAfterLoad] = useState(false);
  const preReceiveRef = React.useRef(null);
  const [modalDefaults, setModalDefaults] = useState({});
  const [adjustOpen, setAdjustOpen] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const isFoodBev = industryProfile === "food_beverage";
  const isCannabis = CANNABIS_PROFILES.includes(industryProfile);
  const labels = PANEL_LABELS[industryProfile] || PANEL_LABELS.general_retail;

  // ── Top-level KPI computations — MUST stay before early returns (LL-127) ──
  const activeItems = useMemo(
    () => items.filter((i) => i.is_active !== false),
    [items],
  );
  const totalVal = useMemo(
    () => activeItems.reduce(
      (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0), 0
    ),
    [activeItems],
  );
  const inStockCount = useMemo(
    () => activeItems.filter((i) => (i.quantity_on_hand || 0) > 0).length,
    [activeItems],
  );
  const lowTotal = useMemo(
    () => activeItems.filter(isLowFn).length,
    [activeItems],
  );
  const avgMarginPct = useMemo(() => {
    const p = activeItems.filter(
      (i) => i.sell_price > 0 && i.weighted_avg_cost > 0,
    );
    if (!p.length) return null;
    return (
      p.reduce(
        (s, i) =>
          s + ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100,
        0,
      ) / p.length
    );
  }, [activeItems]);
  const expiringCount = useMemo(
    () =>
      activeItems.filter((i) => {
        if (!i.expiry_date) return false;
        const d = Math.ceil(
          (new Date(i.expiry_date) - new Date()) / 86400000,
        );
        return d >= 0 && d <= 30;
      }).length,
    [activeItems],
  );

  const load = useCallback(async () => {
    if (!tenantId) return;
    // Background QR status fetch — non-blocking
    supabase
      .from("qr_codes")
      .select("inventory_item_id,qr_code,is_active,scan_count,claimed")
      .eq("tenant_id", tenantId)
      .not("inventory_item_id", "is", null)
      .then(({ data }) => {
        const m = {};
        (data || []).forEach((q) => {
          if (!m[q.inventory_item_id]) m[q.inventory_item_id] = [];
          m[q.inventory_item_id].push(q);
        });
        setQrMap(m);
      });
    setLoading(true);
    setError(null);
    try {
      const [{ data: iData, error: iErr }, { data: sData }, { data: mData }] =
        await Promise.all([
          supabase
            .from("inventory_items")
            .select("*, suppliers(name)")
            .eq("tenant_id", tenantId)
            .order("name"),
          supabase
            .from("suppliers")
            .select("id, name")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("stock_movements")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);
      if (iErr) throw iErr;
      setItems(iData || []);
      setSuppliers(sData || []);
      setMovements(mData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);
  // Detect AVCO changes after a delivery is received
  useEffect(() => {
    if (!checkAvcoAfterLoad || loading || !preReceiveRef.current) return;
    const snapshot = preReceiveRef.current;
    const changed = items.filter((i) => {
      const before = snapshot[i.id];
      const after = i.weighted_avg_cost;
      if (!before || !after) return false;
      return Math.abs((after - before) / before) > 0.05;
    });
    if (changed.length > 0) setAvcoAlertItems(changed);
    setCheckAvcoAfterLoad(false);
    preReceiveRef.current = null;
  }, [items, loading, checkAvcoAfterLoad]);

  const loadMovForItem = async (item) => {
    setMovItem(item);
    setMovList([]);
    setMovLoading(true);
    try {
      const { data } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(25);
      setMovList(data || []);
    } finally {
      setMovLoading(false);
    }
  };

  const handleSave = async (payload) => {
    setModalSaving(true);
    try {
      if (modalItem) {
        const { error: e } = await supabase
          .from("inventory_items")
          .update(payload)
          .eq("id", modalItem.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from("inventory_items")
          .insert(payload);
        if (e) throw e;
      }
      setModalItem(undefined);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setModalSaving(false);
    }
  };

  const handleAdjust = async (item) => {
    const delta = parseFloat(adjustQty);
    if (!delta || isNaN(delta)) {
      setAdjustError("Enter a quantity (+ to add, - to remove).");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("Reason is required for audit trail.");
      return;
    }
    setAdjustSaving(true);
    setAdjustError("");
    try {
      const newQty = Math.max(0, (item.quantity_on_hand || 0) + delta);
      await supabase.from("stock_movements").insert({
        item_id: item.id,
        tenant_id: tenantId,
        movement_type: "adjustment",
        quantity: delta,
        reference: `ADJ-HQ-${Date.now()}`,
        notes: adjustReason.trim(),
        unit_cost: item.weighted_avg_cost || null,
      });
      await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: newQty })
        .eq("id", item.id);
      setAdjustOpen(null);
      setAdjustQty("");
      setAdjustReason("");
      load();
    } catch (err) {
      setAdjustError(err.message);
    } finally {
      setAdjustSaving(false);
    }
  };

  const openAdj = (id) => {
    setAdjustOpen(id);
    setAdjustQty("");
    setAdjustReason("");
    setAdjustError("");
  };
  const closeAdj = () => {
    setAdjustOpen(null);
    setAdjustQty("");
    setAdjustReason("");
    setAdjustError("");
  };

  const foodKPIs = isFoodBev
    ? (() => {
        const now = new Date();
        let expired = 0,
          exp7 = 0,
          exp30 = 0,
          noExp = 0,
          allergens = 0,
          cold = 0,
          low = 0,
          cost = 0;
        items.forEach((i) => {
          if (isLowFn(i)) low++;
          cost += (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0);
          if (i.expiry_date) {
            const d = Math.ceil((new Date(i.expiry_date) - now) / 86400000);
            if (d < 0) expired++;
            else if (d < 7) exp7++;
            else if (d < 30) exp30++;
          } else if (!["packaging", "equipment"].includes(i.category)) noExp++;
          if (countAllergens(i.allergen_flags) > 0) allergens++;
          if (i.temperature_zone && i.temperature_zone !== "ambient") cold++;
        });
        return { expired, exp7, exp30, noExp, allergens, cold, low, cost };
      })()
    : null;

  // ── MOVEMENT DRAWER ───────────────────────────────────────────────────────
  const renderMovDrawer = () => {
    if (!movItem) return null;
    const expiry = isFoodBev ? expiryStatus(movItem) : null;
    return (
      <>
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.15)",
            zIndex: 999,
          }}
          onClick={() => setMovItem(null)}
        />
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "420px",
            height: "100vh",
            background: T.surface,
            borderLeft: "1px solid " + T.border,
            boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            fontFamily: T.font,
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid " + T.border,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{ fontSize: "13px", fontWeight: 600, color: T.ink700 }}
              >
                {movItem.name}
              </div>
              <div
                style={{ fontSize: "11px", color: T.ink300, marginTop: "2px" }}
              >
                Last 25 movements · {movItem.sku}
              </div>
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: T.ink300,
              }}
              onClick={() => setMovItem(null)}
            >
              <X size={13} />
            </button>
          </div>
          <div
            style={{
              padding: "10px 20px",
              background: T.bg,
              borderBottom: "1px solid " + T.border,
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span style={sMetric("default")}>
              ON HAND: {fmtQty(movItem.quantity_on_hand, movItem.unit)}
            </span>
            <span style={sMetric("default")}>
              AVAIL:{" "}
              {fmtQty(
                (movItem.quantity_on_hand || 0) - (movItem.reserved_qty || 0),
                movItem.unit,
              )}
            </span>
            {expiry && (
              <span
                style={sMetric(
                  expiry.variant === "ok" ? "default" : expiry.variant,
                )}
              >
                EXP: {fmtDate(movItem.expiry_date)}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {movLoading ? (
              <p style={{ fontSize: "12px", color: T.ink300 }}>Loading...</p>
            ) : movList.length === 0 ? (
              <p style={{ fontSize: "12px", color: T.ink300 }}>
                No movements recorded.
              </p>
            ) : (
              movList.map((m) => {
                const qty = m.quantity || 0;
                const pos = qty >= 0;
                return (
                  <div key={m.id} style={{ ...sCard, marginBottom: "6px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: T.radius.sm,
                          border: `1px solid ${T.border}`,
                          background: T.bg,
                          color: T.ink600,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {(m.movement_type || "").replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontFamily: T.font,
                          color: pos ? T.success : T.danger,
                          fontWeight: 600,
                        }}
                      >
                        {pos ? "+" : ""}
                        {fmtQty(qty, movItem.unit)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: T.ink300 }}>
                        {fmtDate(m.created_at)}
                      </span>
                      {m.reference && (
                        <span style={{ fontSize: "11px", color: T.ink500 }}>
                          {m.reference}
                        </span>
                      )}
                      {m.unit_cost > 0 && (
                        <span style={{ fontSize: "11px", color: T.ink300 }}>
                          {fmt(m.unit_cost)}/unit
                        </span>
                      )}
                      {m.notes && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: T.ink500,
                            fontStyle: "italic",
                          }}
                        >
                          {m.notes}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </>
    );
  };

  // ── ADJUST INLINE ─────────────────────────────────────────────────────────
  const renderAdjust = (item) =>
    adjustOpen !== item.id ? null : (
      <div
        style={{
          marginTop: "10px",
          padding: "12px 14px",
          background: T.warningLight,
          border: "1px solid " + T.warningBd,
          borderRadius: "4px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: T.warning,
            marginBottom: "8px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Stock Adjustment — {item.name}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr auto",
            gap: "8px",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label
              style={{
                fontSize: "10px",
                color: T.ink500,
                display: "block",
                marginBottom: "4px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Qty (+/−)
            </label>
            <input
              type="number"
              step="0.01"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. -5 or +10"
              style={{
                padding: "7px 10px",
                border: "1px solid " + T.warningBd,
                borderRadius: "3px",
                fontSize: "13px",
                fontFamily: T.font,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "10px",
                color: T.ink500,
                display: "block",
                marginBottom: "4px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Reason (audit trail) *
            </label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Stock take correction, Spoilage"
              style={{
                padding: "7px 10px",
                border: "1px solid " + T.warningBd,
                borderRadius: "3px",
                fontSize: "13px",
                fontFamily: T.font,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => handleAdjust(item)}
            disabled={adjustSaving}
            style={{
              ...sBtn(),
              padding: "7px 16px",
              whiteSpace: "nowrap",
              opacity: adjustSaving ? 0.6 : 1,
            }}
          >
            {adjustSaving ? "Saving..." : "Confirm"}
          </button>
        </div>
        {adjustError && (
          <p style={{ fontSize: "11px", color: T.danger, margin: "6px 0 0" }}>
            {adjustError}
          </p>
        )}
        <p style={{ fontSize: "10px", color: T.warning, margin: "6px 0 0" }}>
          Current: {fmtQty(item.quantity_on_hand, item.unit)} · Written to
          stock_movements (adjustment) for full audit trail.
        </p>
      </div>
    );

  // ── FOOD OVERVIEW ─────────────────────────────────────────────────────────
  const FoodOverview = () => {
    if (!foodKPIs) return null;
    const expiring = items
      .filter((i) => {
        const e = expiryStatus(i);
        return e && (e.variant === "danger" || e.variant === "warning");
      })
      .sort((a, b) =>
        (a.expiry_date || "9999") < (b.expiry_date || "9999") ? -1 : 1,
      );
    const coldItems = items.filter(
      (i) => i.temperature_zone && i.temperature_zone !== "ambient",
    );
    const lowItems = items.filter(isLowFn);
    const drifted = items.filter(
      (i) =>
        i.weighted_avg_cost &&
        i.cost_price &&
        Math.abs((i.weighted_avg_cost - i.cost_price) / i.cost_price) > 0.05,
    );
    return (
      <div style={{ display: "grid", gap: "20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
            gap: "1px",
            background: T.border,
            borderRadius: T.radius.lg,
            overflow: "hidden",
            border: "1px solid " + T.border,
          }}
        >
          {[
            {
              label: "Expired",
              value: foodKPIs.expired,
              top: foodKPIs.expired > 0 ? T.danger : T.border,
              note: "remove immediately",
            },
            {
              label: "Expiring <7d",
              value: foodKPIs.exp7,
              top: foodKPIs.exp7 > 0 ? T.danger : T.border,
              note: "urgent action",
            },
            {
              label: "Expiring <30d",
              value: foodKPIs.exp30,
              top: foodKPIs.exp30 > 0 ? T.warning : T.border,
              note: "use first (FEFO)",
            },
            {
              label: "No Expiry Set",
              value: foodKPIs.noExp,
              top: foodKPIs.noExp > 0 ? T.warning : T.border,
              note: "edit items to add",
            },
            {
              label: "Allergen Items",
              value: foodKPIs.allergens,
              top: T.accentMid,
              note: "declared",
            },
            {
              label: "Cold Chain",
              value: foodKPIs.cold,
              top: T.info,
              note: "REF / FRZ items",
            },
            {
              label: "Low Stock",
              value: foodKPIs.low,
              top: foodKPIs.low > 0 ? T.warning : T.border,
              note: "below reorder level",
            },
            {
              label: "Total Value",
              value: fmt(foodKPIs.cost),
              top: T.border,
              note: "AVCO-weighted",
            },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                background: T.surface,
                padding: "16px 18px",
                borderTop: "3px solid " + k.top,
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 400,
                  color: T.ink900,
                  fontFamily: T.font,
                  lineHeight: 1,
                  marginBottom: "4px",
                  letterSpacing: "-0.02em",
                }}
              >
                {k.value}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: T.ink400,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {k.label}
              </div>
              <div
                style={{ fontSize: "10px", color: T.ink300, marginTop: "2px" }}
              >
                {k.note}
              </div>
            </div>
          ))}
        </div>
        {expiring.length > 0 && (
          <div
            style={{
              background: T.warningLight,
              border: "1px solid " + T.warningBd,
              borderRadius: T.radius.lg,
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: "12px",
              }}
            >
              FEFO Alert — {expiring.length} item
              {expiring.length !== 1 ? "s" : ""} expiring soon · use or reorder
              first
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Item",
                    "Category",
                    "On Hand",
                    "Expiry",
                    "Days Left",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "6px 10px",
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.warning,
                        borderBottom: "1px solid " + T.warningBd,
                        fontWeight: 700,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiring.map((item) => {
                  const ex = expiryStatus(item);
                  return (
                    <tr key={item.id}>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                          fontWeight: 600,
                          color: T.ink700,
                        }}
                      >
                        {item.name}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                          color: T.ink500,
                          fontSize: "11px",
                        }}
                      >
                        {CATEGORY_LABELS[item.category] || item.category}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                          fontFamily: T.font,
                        }}
                      >
                        {fmtQty(item.quantity_on_hand, item.unit)}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                          fontFamily: T.font,
                          color: ex?.color,
                        }}
                      >
                        {fmtDate(item.expiry_date)}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                        }}
                      >
                        <span style={sBadge(ex?.variant || "default")}>
                          {ex?.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                        }}
                      >
                        <button
                          style={{
                            ...sBtn(),
                            padding: "3px 10px",
                            fontSize: "10px",
                          }}
                          onClick={() => setModalItem(item)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {coldItems.length > 0 && (
          <div
            style={{
              background: T.infoLight,
              border: "1px solid " + T.infoBd,
              borderRadius: T.radius.lg,
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.info,
                marginBottom: "12px",
              }}
            >
              Cold Chain — {coldItems.length} item
              {coldItems.length !== 1 ? "s" : ""} requiring temperature control
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                gap: "8px",
              }}
            >
              {coldItems.map((item) => {
                const ti = tempInfo(item.temperature_zone);
                const ex = expiryStatus(item);
                return (
                  <div
                    key={item.id}
                    style={{
                      background: T.surface,
                      border: "1px solid " + T.infoBd,
                      borderRadius: "4px",
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: T.ink700,
                        }}
                      >
                        {item.name}
                      </span>
                      {ti && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            background: ti.bg,
                            color: ti.color,
                            border: "1px solid " + ti.border,
                            borderRadius: "2px",
                            padding: "1px 6px",
                          }}
                        >
                          {ti.label}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      <span style={sMetric("default")}>
                        {fmtQty(item.quantity_on_hand, item.unit)}
                      </span>
                      {ex && (
                        <span
                          style={sMetric(
                            ex.variant === "ok" ? "default" : ex.variant,
                          )}
                        >
                          EXP: {fmtDate(item.expiry_date)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {lowItems.length > 0 && (
          <div
            style={{
              background: T.warningLight,
              border: "1px solid " + T.warningBd,
              borderRadius: T.radius.lg,
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: "12px",
              }}
            >
              Low Stock — {lowItems.length} item
              {lowItems.length !== 1 ? "s" : ""} below reorder level
            </div>
            {lowItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid " + T.warningBd,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: T.ink900,
                    }}
                  >
                    {item.name}
                  </span>
                  {item.suppliers?.name && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: T.ink500,
                        marginLeft: "8px",
                      }}
                    >
                      {item.suppliers.name}
                    </span>
                  )}
                </div>
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontFamily: T.font,
                      color: T.danger,
                      fontWeight: 700,
                    }}
                  >
                    {fmtQty(item.quantity_on_hand, item.unit)}
                  </span>
                  <span style={{ fontSize: "11px", color: T.ink500 }}>
                    min {fmtQty(item.reorder_level, item.unit)}
                  </span>
                  {item.reorder_qty && (
                    <span style={{ fontSize: "11px", color: T.warning }}>
                      order {fmtQty(item.reorder_qty, item.unit)}
                    </span>
                  )}
                  {item.supplier_id && (
                    <span
                      style={{
                        ...sBadgeBase,
                        background: T.infoLight,
                        color: T.info,
                        border: "1px solid " + T.infoBd,
                      }}
                    >
                      → Raise PO
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {drifted.length > 0 && (
          <div
            style={{
              background: T.warningLight,
              border: "1px solid " + T.warningBd,
              borderRadius: T.radius.lg,
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: "10px",
              }}
            >
              AVCO Cost Drift — {drifted.length} item
              {drifted.length !== 1 ? "s" : ""} where real cost differs from
              recorded by &gt;5%
            </div>
            {drifted.map((item) => {
              const drift =
                ((item.weighted_avg_cost - item.cost_price) / item.cost_price) *
                100;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid " + T.warningBd,
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: T.ink900,
                    }}
                  >
                    {item.name}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: T.ink500,
                        fontFamily: T.font,
                      }}
                    >
                      Recorded: {fmt(item.cost_price)}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: T.warning,
                        fontFamily: T.font,
                      }}
                    >
                      AVCO: {fmt(item.weighted_avg_cost)}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: drift > 0 ? T.danger : T.success,
                        fontFamily: T.font,
                      }}
                    >
                      {drift > 0 ? "↑" : "↓"} {Math.abs(drift).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ZONES 4-6: AI Intelligence (same as GeneralOverview) ── */}
        <StockIntelPanel
          items={items}
          movements={movements}
          tenantId={tenantId}
          onNavigate={setSubTab}
          onOpenItem={setPanelItem}
        />

        {/* ── ZONE 7: Channel Stock Hold ── */}
        <StockChannelPanel tenantId={tenantId} />

      </div>
    );
  };

  // ── FOOD ITEMS TABLE ──────────────────────────────────────────────────────
  const FoodItems = () => {
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("all");
    const [tempFilter, setTempFilter] = useState("all");
    const [allergenFilter, setAllergenFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name");

    const filtered = items
      .filter((i) => {
        if (catFilter !== "all" && i.category !== catFilter) return false;
        if (
          tempFilter !== "all" &&
          (i.temperature_zone || "ambient") !== tempFilter
        )
          return false;
        if (allergenFilter === "has" && countAllergens(i.allergen_flags) === 0)
          return false;
        if (allergenFilter === "none" && countAllergens(i.allergen_flags) > 0)
          return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !i.name?.toLowerCase().includes(q) &&
            !i.sku?.toLowerCase().includes(q) &&
            !(i.batch_lot_number || "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "expiry")
          return (a.expiry_date || "9999") < (b.expiry_date || "9999") ? -1 : 1;
        if (sortBy === "low")
          return isLowFn(a) === isLowFn(b) ? 0 : isLowFn(a) ? -1 : 1;
        if (sortBy === "avco")
          return (b.weighted_avg_cost || 0) - (a.weighted_avg_cost || 0);
        return (a.name || "").localeCompare(b.name || "");
      });

    return (
      <div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <input
            type="text"
            placeholder="Search name, SKU, lot number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...sInput, width: "240px" }}
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{ ...sSelect, width: "155px" }}
          >
            <option value="all">All Categories</option>
            {(industryProfile === "cannabis_dispensary"
              ? ["concentrate","edible","flower","topical","medical_consumable","terpene"]
              : FOOD_CATS
            ).map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <select
            value={tempFilter}
            onChange={(e) => setTempFilter(e.target.value)}
            style={{ ...sSelect, width: "150px" }}
          >
            <option value="all">All Temp Zones</option>
            <option value="ambient">AMB – Ambient</option>
            <option value="refrigerated">REF – Refrigerated</option>
            <option value="frozen">FRZ – Frozen</option>
          </select>
          <select
            value={allergenFilter}
            onChange={(e) => setAllergenFilter(e.target.value)}
            style={{ ...sSelect, width: "140px" }}
          >
            <option value="all">All Allergens</option>
            <option value="has">Has Allergens</option>
            <option value="none">No Allergens</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ ...sSelect, width: "150px" }}
          >
            <option value="name">Sort: Name A–Z</option>
            <option value="expiry">Sort: Expiry (FEFO)</option>
            <option value="low">Sort: Low Stock First</option>
            <option value="avco">Sort: AVCO High–Low</option>
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: "12px", color: T.ink500 }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
          <button style={sBtn()} onClick={() => setModalItem(null)}>
            + Add Item
          </button>
        </div>
        <div
          style={{
            background: T.surface,
            border: "1px solid " + T.border,
            borderRadius: T.radius.lg,
            overflow: "auto",
            boxShadow: T.shadow.sm,
            padding: "0 16px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Name / SKU</th>
                <th style={sTh}>Category</th>
                <th style={{ ...sTh, textAlign: "center" }}>Temp</th>
                <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                <th style={{ ...sTh, textAlign: "right" }}>Available</th>
                <th style={{ ...sTh, textAlign: "right" }}>AVCO / unit</th>
                <th style={sTh}>Expiry</th>
                <th style={{ ...sTh, textAlign: "center" }}><AlertTriangle size={11} /></th>
                <th style={{ ...sTh, textAlign: "center" }}>QR</th>
                <th style={sTh}>Lot / Batch</th>
                <th style={sTh}>Reorder</th>
                <th style={sTh}>Supplier</th>
                <th style={sTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="12"
                    style={{
                      ...sTd,
                      textAlign: "center",
                      color: T.ink300,
                      padding: "40px",
                    }}
                  >
                    No items match your filters.{" "}
                    <span
                      style={{
                        color: T.accentMid,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      onClick={() => setModalItem(null)}
                    >
                      Add the first one →
                    </span>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const low = isLowFn(item);
                  const avail =
                    (item.quantity_on_hand || 0) - (item.reserved_qty || 0);
                  const expiry = expiryStatus(item);
                  const ti = tempInfo(item.temperature_zone);
                  const ac = countAllergens(item.allergen_flags);
                  const isAdj = adjustOpen === item.id;
                  const rowBg =
                    expiry?.variant === "danger" || low ? "#FFF9F9" : "#fff";
                  const leftBorder =
                    low || expiry?.variant === "danger"
                      ? "3px solid " + T.danger
                      : expiry?.variant === "warning"
                        ? "3px solid " + T.warning
                        : "3px solid transparent";
                  return (
                    <React.Fragment key={item.id}>
                      <tr style={{ background: rowBg, borderLeft: leftBorder }}>
                        <td style={{ ...sTd, minWidth: "180px" }}>
                          <div style={{ fontWeight: 600, color: T.ink700 }}>
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: T.ink300,
                              fontFamily: T.font,
                              marginTop: "2px",
                            }}
                          >
                            {item.sku}
                          </div>
                          {low && (
                            <span
                              style={{
                                ...sBadge("danger"),
                                marginTop: "3px",
                                display: "inline-block",
                              }}
                            >
                              LOW
                            </span>
                          )}
                        </td>
                        <td style={sTd}>
                          <span
                            style={{
                              fontSize: "9px",
                              padding: "2px 7px",
                              borderRadius: "3px",
                              background: T.bg,
                              color: T.ink400,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              fontWeight: 700,
                            }}
                          >
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </td>
                        <td style={{ ...sTd, textAlign: "center" }}>
                          {ti ? (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                background: ti.bg,
                                color: ti.color,
                                border: "1px solid " + ti.border,
                                borderRadius: "2px",
                                padding: "2px 6px",
                              }}
                            >
                              {ti.label}
                            </span>
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.font,
                            fontWeight: 600,
                            color: low ? T.danger : T.ink700,
                          }}
                        >
                          {fmtQty(item.quantity_on_hand, item.unit)}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.font,
                            fontWeight: 700,
                            color: avail <= 0 ? T.danger : T.success,
                          }}
                        >
                          {fmtQty(avail, item.unit)}
                          {(item.reserved_qty || 0) > 0 && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "9px",
                                color: T.warning,
                                fontWeight: 600,
                              }}
                            >
                              {item.reserved_qty} held
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.font,
                            fontSize: "12px",
                            color: T.ink500,
                          }}
                        >
                          {item.weighted_avg_cost ? (
                            fmt(item.weighted_avg_cost) +
                            "/" +
                            (item.unit || "u")
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                          {expiry ? (
                            expiry.variant !== "ok" ? (
                              <span style={sBadge(expiry.variant)}>
                                {expiry.label}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: T.ink500,
                                  fontFamily: T.font,
                                }}
                              >
                                {fmtDate(item.expiry_date)}
                              </span>
                            )
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...sTd, textAlign: "center" }}>
                          {ac > 0 ? (
                            <span style={sBadge("warning")}><AlertTriangle size={10} style={{marginRight:3,verticalAlign:"middle"}} /> {ac}</span>
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        {/* QR status cell — shows code count and scan activity */}
                        <td
                          style={{
                            ...sTd,
                            textAlign: "center",
                            padding: "6px 8px",
                          }}
                        >
                          {(() => {
                            const codes = qrMap[item.id] || [];
                            const active = codes.filter((q) => q.is_active);
                            const scans = codes.reduce(
                              (s, q) => s + (q.scan_count || 0),
                              0,
                            );
                            if (codes.length === 0)
                              return (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: T.ink300,
                                    fontStyle: "italic",
                                  }}
                                >
                                  —
                                </span>
                              );
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: T.radius.md,
                                    background:
                                      active.length > 0
                                        ? T.successLight
                                        : T.warningLight,
                                    color:
                                      active.length > 0 ? T.success : T.warning,
                                  }}
                                >
                                  {active.length} QR
                                </span>
                                {scans > 0 && (
                                  <span
                                    style={{ fontSize: 11, color: T.ink500 }}
                                  >
                                    {scans} scans
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            fontSize: "11px",
                            color: T.ink500,
                            fontFamily: T.font,
                          }}
                        >
                          {item.batch_lot_number || (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...sTd, fontSize: "11px" }}>
                          {item.reorder_level != null ? (
                            <span style={{ color: low ? T.danger : T.ink500 }}>
                              {fmtQty(item.reorder_level, item.unit)}
                              {item.reorder_qty && (
                                <span style={{ color: T.warning }}>
                                  →{fmtQty(item.reorder_qty, item.unit)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td
                          style={{ ...sTd, fontSize: "11px", color: T.ink500 }}
                        >
                          {item.suppliers?.name || (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              style={{
                                padding: "3px 8px",
                                fontSize: "10px",
                                fontFamily: T.font,
                                fontWeight: 600,
                                border: "1px solid " + T.accentBd,
                                color: T.accentMid,
                                background: "transparent",
                                borderRadius: "3px",
                                cursor: "pointer",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                              }}
                              onClick={() => setModalItem(item)}
                            >
                              Edit
                            </button>
                            <button
                              style={{
                                padding: "3px 8px",
                                fontSize: "10px",
                                fontFamily: T.font,
                                fontWeight: 600,
                                border:
                                  "1px solid " +
                                  (isAdj ? T.dangerBd : T.warningBd),
                                color: isAdj ? T.danger : T.warning,
                                background: "transparent",
                                borderRadius: "3px",
                                cursor: "pointer",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                              }}
                              onClick={() =>
                                isAdj ? closeAdj() : openAdj(item.id)
                              }
                            >
                              {isAdj ? "Cancel" : "Adjust"}
                            </button>
                            <button
                              style={{
                                padding: "3px 8px",
                                fontSize: "10px",
                                fontFamily: T.font,
                                fontWeight: 600,
                                border: "1px solid " + T.border,
                                color: T.ink500,
                                background: "transparent",
                                borderRadius: "3px",
                                cursor: "pointer",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                              }}
                              onClick={() => loadMovForItem(item)}
                            >
                              Mov
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isAdj && (
                        <tr>
                          <td
                            colSpan="12"
                            style={{
                              padding: "0 12px 12px",
                              background: "#FFF9F9",
                            }}
                          >
                            {renderAdjust(item)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── FOOD MOVEMENTS ────────────────────────────────────────────────────────
  const FoodMovements = () => {
    const [search, setSearch] = useState("");
    const filtered = movements.filter((m) => {
      if (!search) return true;
      const item = items.find((i) => i.id === m.item_id);
      const q = search.toLowerCase();
      return (
        (item?.name || "").toLowerCase().includes(q) ||
        (m.reference || "").toLowerCase().includes(q) ||
        (m.movement_type || "").includes(q)
      );
    });
    return (
      <div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "16px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search movements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...sInput, width: "280px" }}
          />
          <span style={{ fontSize: "12px", color: T.ink500 }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div
          style={{
            background: T.surface,
            border: "1px solid " + T.border,
            borderRadius: T.radius.lg,
            overflow: "auto",
            boxShadow: T.shadow.sm,
            padding: "0 16px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr style={{ background: T.surface }}>
                {[
                  "Date",
                  "Item",
                  "Type",
                  "Qty",
                  "AVCO/unit",
                  "Reference",
                  "Notes",
                ].map((h) => (
                  <th key={h} style={sTh}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      ...sTd,
                      textAlign: "center",
                      color: T.ink300,
                      padding: "32px",
                    }}
                  >
                    No movements found.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 100).map((m) => {
                  const item = items.find((i) => i.id === m.item_id);
                  const qty = m.quantity || 0;
                  const pos = qty >= 0;
                  return (
                    <tr key={m.id}>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink500,
                          fontFamily: T.font,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(m.created_at)}
                      </td>
                      <td style={{ ...sTd, fontWeight: 500 }}>
                        {item?.name || (
                          <span style={{ color: T.ink300 }}>Unknown</span>
                        )}
                      </td>
                      <td style={sTd}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: T.radius.sm,
                            border: `1px solid ${T.border}`,
                            background: T.bg,
                            color: T.ink600,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {(m.movement_type || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.font,
                          fontWeight: 700,
                          color: pos ? T.success : T.danger,
                        }}
                      >
                        {pos ? "+" : ""}
                        {fmtQty(qty, item?.unit)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.font,
                          fontSize: "12px",
                          color: T.ink500,
                        }}
                      >
                        {m.unit_cost ? fmt(m.unit_cost) : "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink500,
                          fontFamily: T.font,
                        }}
                      >
                        {m.reference || "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink500,
                          fontStyle: m.notes ? "italic" : "normal",
                        }}
                      >
                        {m.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── ACCORDION ITEM (non-food, non-cannabis_retail) ────────────────────────
  const renderAccItem = (item) => {
    const low = isLowFn(item);
    const avail = (item.quantity_on_hand || 0) - (item.reserved_qty || 0);
    const totalVal =
      (item.quantity_on_hand || 0) * (item.weighted_avg_cost || 0);
    const isAdj = adjustOpen === item.id;
    return (
      <div
        key={item.id}
        style={{
          ...sCard,
          borderLeft: low ? "3px solid " + T.danger : "3px solid transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "8px",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: "13px", fontWeight: 600, color: T.ink700 }}
            >
              {item.name}
            </span>
            {item.sku && (
              <span
                style={{
                  fontSize: "11px",
                  color: T.ink300,
                  fontFamily: T.font,
                }}
              >
                {item.sku}
              </span>
            )}
            {isCannabis && item.medium_type && (
              <span style={sBadge("accent")}>
                {item.medium_type.replace(/_/g, " ")}
              </span>
            )}
            {low && <span style={sBadge("danger")}>LOW STOCK</span>}
          </div>
          <div style={{ display: "flex", gap: "5px" }}>
            <button
              style={{
                padding: "3px 10px",
                fontSize: "11px",
                fontFamily: T.font,
                background: "transparent",
                border: "1px solid " + T.border,
                borderRadius: "2px",
                cursor: "pointer",
                color: T.ink500,
              }}
              onClick={() => loadMovForItem(item)}
            >
              Movements
            </button>
            <button
              style={{
                padding: "3px 10px",
                fontSize: "11px",
                fontFamily: T.font,
                background: "transparent",
                border: "1px solid " + T.accentBd,
                borderRadius: "2px",
                cursor: "pointer",
                color: T.accentMid,
              }}
              onClick={() => setModalItem(item)}
            >
              Edit
            </button>
            <button
              style={{
                padding: "3px 10px",
                fontSize: "11px",
                fontFamily: T.font,
                background: "transparent",
                border: "1px solid " + (isAdj ? T.dangerBd : T.border),
                borderRadius: "2px",
                cursor: "pointer",
                color: isAdj ? T.danger : T.ink500,
              }}
              onClick={() => (isAdj ? closeAdj() : openAdj(item.id))}
            >
              {isAdj ? "Cancel" : "Adjust"}
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            marginBottom: "6px",
          }}
        >
          <span style={sMetric(low ? "danger" : "default")}>
            ON HAND: {fmtQty(item.quantity_on_hand, item.unit)}
          </span>
          {(item.reserved_qty || 0) > 0 && (
            <span style={sMetric("warning")}>
              RESERVED: {fmtQty(item.reserved_qty, item.unit)}
            </span>
          )}
          <span style={sMetric(avail < 0 ? "danger" : "default")}>
            AVAIL: {fmtQty(avail, item.unit)}
          </span>
          {(item.weighted_avg_cost || 0) > 0 && (
            <span style={sMetric("default")}>
              AVCO: {fmt(item.weighted_avg_cost)}/{item.unit || "unit"}
            </span>
          )}
          {(item.weighted_avg_cost || 0) > 0 && (
            <span style={sMetric("default")}>VALUE: {fmt(totalVal)}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {item.suppliers?.name && (
            <span style={{ fontSize: "11px", color: T.ink500 }}>
              Supplier: {item.suppliers.name}
            </span>
          )}
          {low && item.reorder_level != null && (
            <span style={{ fontSize: "11px", color: T.danger }}>
              Reorder at: {fmtQty(item.reorder_level, item.unit)}
            </span>
          )}
        </div>
        {renderAdjust(item)}
      </div>
    );
  };

  // eslint-disable-next-line no-unused-vars
  const renderAccPanel = (key) => {
    const prof =
      PANEL_CATS_BY_PROFILE[industryProfile] ||
      PANEL_CATS_BY_PROFILE.cannabis_retail;
    const pItems = items.filter((i) => prof[key].includes(i.category));
    const open = openPanels[key];
    const lowCount = pItems.filter(isLowFn).length;
    const totalVal = pItems.reduce(
      (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
      0,
    );
    return (
      <div style={{ marginBottom: "16px" }} key={key}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <div
            style={{ ...sPanelHead, flex: 1, marginBottom: 0 }}
            onClick={() => setOpenPanels((p) => ({ ...p, [key]: !p[key] }))}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{ fontSize: "13px", fontWeight: 600, color: T.ink700 }}
              >
                {labels[key]}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: T.ink300,
                  fontFamily: T.font,
                }}
              >
                {pItems.length} item{pItems.length !== 1 ? "s" : ""}
              </span>
              {totalVal > 0 && (
                <span style={{ fontSize: "11px", color: T.ink500 }}>
                  {fmt(totalVal)} total value
                </span>
              )}
              {lowCount > 0 && (
                <span style={sBadge("danger")}>{lowCount} LOW</span>
              )}
            </div>
            <span style={{ fontSize: "12px", color: T.ink300 }}>
              {open ? "▲" : "▼"}
            </span>
          </div>
          <button
            style={{
              ...sBtn(),
              padding: "6px 12px",
              fontSize: "11px",
              whiteSpace: "nowrap",
            }}
            onClick={() => setModalItem(null)}
          >
            + Add Item
          </button>
        </div>
        {open && (
          <div>
            {pItems.length === 0 ? (
              <div
                style={{
                  fontSize: "12px",
                  color: T.ink300,
                  padding: "14px",
                  border: "1px dashed " + T.border,
                  borderRadius: "4px",
                  textAlign: "center",
                  background: T.surface,
                }}
              >
                No items.{" "}
                <span
                  style={{
                    color: T.accentMid,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onClick={() => setModalItem(null)}
                >
                  Add the first one →
                </span>
              </div>
            ) : (
              pItems.map(renderAccItem)
            )}
          </div>
        )}
      </div>
    );
  };

  // ── GENERAL OVERVIEW ──────────────────────────────────────────────────────
  // ── GENERAL OVERVIEW v4.0 — WP-STOCK-OVERVIEW Phase 1 ───────────────────
  // Zone 1: Action Queue · Zone 2: Command Metrics · Zone 3: Category Health
  // Zone 4–6: StockIntelPanel (Phase 2/3) · Zone 7: StockChannelPanel (kept)
  // Zone 8: Recent Movements (restyled)
  const GeneralOverview = () => {
    // ── Shared derivations ────────────────────────────────────────────────────
    const activeItems = useMemo(
      () => items.filter((i) => i.is_active !== false),
      [],
    );
    const pricedItems = useMemo(
      () =>
        activeItems.filter((i) => i.sell_price > 0 && i.weighted_avg_cost > 0),
      [activeItems],
    );
    const outOfStock = useMemo(
      () => activeItems.filter((i) => (i.quantity_on_hand || 0) <= 0),
      [activeItems],
    );
    const lowItems = useMemo(() => activeItems.filter(isLowFn), [activeItems]);
    const inStockLow = useMemo(
      () => lowItems.filter((i) => (i.quantity_on_hand || 0) > 0),
      [lowItems],
    );

    const totalValue = useMemo(
      () =>
        activeItems.reduce(
          (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
          0,
        ),
      [activeItems],
    );
    const availValue = useMemo(
      () =>
        activeItems.reduce(
          (s, i) =>
            s +
            Math.max(0, (i.quantity_on_hand || 0) - (i.reserved_qty || 0)) *
              (i.weighted_avg_cost || 0),
          0,
        ),
      [activeItems],
    );
    const healthyCount = useMemo(
      () =>
        activeItems.filter((i) => (i.quantity_on_hand || 0) > 0 && !isLowFn(i))
          .length,
      [activeItems],
    );
    const highMarginCnt = useMemo(
      () =>
        pricedItems.filter(
          (i) =>
            ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100 > 40,
        ).length,
      [pricedItems],
    );
    const marginalCnt = useMemo(
      () =>
        pricedItems.filter((i) => {
          const m = ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100;
          return m >= 20 && m <= 40;
        }).length,
      [pricedItems],
    );
    const reorderCnt = useMemo(
      () =>
        activeItems.filter((i) => isLowFn(i) && (i.quantity_on_hand || 0) > 0)
          .length,
      [activeItems],
    );

    // 7-day activity sparkline — derived from real movements, not mocked.
    // Shows movement count per day as a proxy for business activity.
    // Hidden gracefully if fewer than 3 days have data (new tenant / no history).
    const spark7 = useMemo(() => {
      const now = Date.now();
      return Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date(now - (6 - i) * 86400000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const count = movements.filter((m) => {
          const d = new Date(m.created_at);
          return d >= dayStart && d <= dayEnd;
        }).length;
        return { v: count };
      });
    }, []);
    const hasSparkData = useMemo(
      () => spark7.filter((d) => d.v > 0).length >= 3,
      [spark7],
    );

    // Zone 3 — category groups for BulletChart
    const catGroups = useMemo(() => {
      const map = {};
      activeItems.forEach((i) => {
        const cat = i.category || "other";
        if (!map[cat])
          map[cat] = { count: 0, onHand: 0, reorder: 0, maxStock: 0, value: 0 };
        map[cat].count++;
        map[cat].onHand += i.quantity_on_hand || 0;
        map[cat].reorder += i.reorder_level || 0;
        map[cat].maxStock += i.max_stock_level || 0;
        map[cat].value +=
          (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0);
      });
      return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
    }, [activeItems]);

    // Zone 3 — margin distribution donut
    const marginDonut = useMemo(() => {
      const healthy = pricedItems.filter(
        (i) => ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100 > 40,
      ).length;
      const marginal = pricedItems.filter((i) => {
        const m = ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100;
        return m >= 20 && m <= 40;
      }).length;
      const thin = pricedItems.filter(
        (i) => ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100 < 20,
      ).length;
      const unpriced = activeItems.length - pricedItems.length;
      return [
        { name: "Healthy >40%", value: healthy, color: T.success },
        { name: "Marginal 20–40%", value: marginal, color: T.warning },
        { name: "Thin <20%", value: thin, color: T.danger },
        { name: "No price set", value: unpriced, color: T.border },
      ].filter((d) => d.value > 0);
    }, [activeItems, pricedItems]);

    // Zone 1 — Action Queue
    const noPrice = activeItems.filter((i) => !(i.sell_price > 0));
    const topCategories = (list) => {
      const map = {};
      list.forEach((i) => {
        const c = CATEGORY_LABELS[i.category] || i.category || "Other";
        map[c] = (map[c] || 0) + 1;
      });
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, n]) => `${c} ×${n}`)
        .join(" · ");
    };
    const queueActions = [];
    if (outOfStock.length > 0)
      queueActions.push({
        severity: "critical",
        text: `${outOfStock.length} item${outOfStock.length !== 1 ? "s" : ""} out of stock — hidden from shop`,
        sub: topCategories(outOfStock),
        cta: "View items",
        action: () => setSubTab("items"),
      });
    if (noPrice.length > 0)
      queueActions.push({
        severity: "critical",
        text: `${noPrice.length} SKU${noPrice.length !== 1 ? "s" : ""} have no sell price — shop shows nothing`,
        sub: topCategories(noPrice),
        cta: "Open pricing",
        action: () => setSubTab("pricing"),
      });
    // WARNING: items priced but AVCO=0 — margins show as NO COST (BUG-051 fix)
    // Only items with stock > 0 are actionable — no point receiving for items not in stock yet
    const pricedNoAvco = activeItems.filter(
      (i) =>
        i.sell_price > 0 &&
        !(i.weighted_avg_cost > 0) &&
        (i.quantity_on_hand || 0) > 0,
    );
    if (pricedNoAvco.length > 0)
      queueActions.push({
        severity: "warning",
        text: `${pricedNoAvco.length} item${pricedNoAvco.length !== 1 ? "s" : ""} priced but no cost basis — margin shows as NO COST`,
        sub: topCategories(pricedNoAvco),
        cta: "Set opening AVCO",
        action: () => setCalibOpen(true),
      });

    // Expiry alerts — cannabis compliance (items with expiry_date set)
    const now = new Date();
    const expired = activeItems.filter(
      (i) =>
        i.expiry_date &&
        new Date(i.expiry_date) < now &&
        (i.quantity_on_hand || 0) > 0,
    );
    const expiring7 = activeItems.filter((i) => {
      if (!i.expiry_date || (i.quantity_on_hand || 0) <= 0) return false;
      const d = Math.ceil((new Date(i.expiry_date) - now) / 86400000);
      return d >= 0 && d < 7;
    });
    const expiring30 = activeItems.filter((i) => {
      if (!i.expiry_date || (i.quantity_on_hand || 0) <= 0) return false;
      const d = Math.ceil((new Date(i.expiry_date) - now) / 86400000);
      return d >= 7 && d < 30;
    });
    if (expired.length > 0)
      queueActions.push({
        severity: "critical",
        text: `${expired.length} item${expired.length !== 1 ? "s" : ""} EXPIRED — must not be sold`,
        sub: expired
          .slice(0, 3)
          .map(
            (i) =>
              `${i.name} (exp. ${new Date(i.expiry_date).toLocaleDateString("en-ZA")})`,
          )
          .join(" · "),
        cta: "View items",
        action: () => setSubTab("items"),
      });
    if (expiring7.length > 0)
      queueActions.push({
        severity: "critical",
        text: `${expiring7.length} item${expiring7.length !== 1 ? "s" : ""} expiring within 7 days — use or remove`,
        sub: expiring7
          .slice(0, 3)
          .map(
            (i) =>
              `${i.name} (${Math.ceil((new Date(i.expiry_date) - now) / 86400000)}d left)`,
          )
          .join(" · "),
        cta: "View items",
        action: () => setSubTab("items"),
      });
    if (expiring30.length > 0)
      queueActions.push({
        severity: "warning",
        text: `${expiring30.length} item${expiring30.length !== 1 ? "s" : ""} expiring within 30 days — prioritise sales`,
        sub: expiring30
          .slice(0, 3)
          .map(
            (i) =>
              `${i.name} (${Math.ceil((new Date(i.expiry_date) - now) / 86400000)}d left)`,
          )
          .join(" · "),
        cta: "View items",
        action: () => setSubTab("items"),
      });
    if (inStockLow.length > 0)
      queueActions.push({
        severity: "info",
        text: `${inStockLow.length} item${inStockLow.length !== 1 ? "s" : ""} below reorder level`,
        sub: topCategories(inStockLow),
        // Purchase Orders tab is visible in the tab bar (disabled, SOON badge).
        // setSubTab fires but renders nothing until WP-STOCK-PO ships.
        // This is intentional — keeps the planned feature visible in the UI.
        cta: "Raise PO",
        action: () => setSubTab("purchase-orders"),
      });

    const recentMov = movements.slice(0, 8);

    // Zone 2 — KPI tile definitions
    const liveItems = activeItems.filter(
      (i) => (i.sell_price || 0) > 0 && (i.quantity_on_hand || 0) > 0,
    );
    const kpiTiles = [
      {
        label: "Stock Value",
        value: fmt(totalValue),
        sub: `Available ${fmt(availValue)}`,
        valueColor: T.ink900,
        spark: spark7,
        sparkPositive: true,
        delta: null,
      },
      {
        label: "Healthy SKUs",
        value: healthyCount,
        sub: `of ${activeItems.length} active`,
        valueColor:
          healthyCount > activeItems.length * 0.7
            ? T.success
            : healthyCount > activeItems.length * 0.4
              ? T.warning
              : T.danger,
        spark: spark7,
        sparkPositive: true,
        delta: null,
      },
      {
        label: "Margin Health",
        value:
          pricedItems.length > 0
            ? `${Math.round((highMarginCnt / pricedItems.length) * 100)}%`
            : "—",
        sub: `${highMarginCnt} healthy · ${marginalCnt} marginal`,
        valueColor:
          pricedItems.length > 0 && highMarginCnt / pricedItems.length > 0.5
            ? T.success
            : T.warning,
        spark: null,
        delta: null,
      },
      {
        label: "Live in Shop",
        value: liveItems.length,
        sub: `priced & in stock`,
        valueColor: liveItems.length > 0 ? T.accentMid : T.danger,
        spark: null,
        delta: null,
      },
      {
        label: "Reorder Pressure",
        value: reorderCnt,
        sub:
          reorderCnt === 0
            ? "all above reorder level"
            : `item${reorderCnt !== 1 ? "s" : ""} need restocking`,
        valueColor:
          reorderCnt > 10 ? T.danger : reorderCnt > 5 ? T.warning : T.success,
        spark: null,
        delta: null,
      },
    ];

    return (
      <div style={{ display: "grid", gap: 20 }}>
        {/* ── ZONE 1: ACTION QUEUE — ActionCentre (collapsible, session-dismissible) ── */}
        {queueActions.length === 0 ? (
          <div
            style={{
              background: T.surface,
              border: "1px solid " + T.border,
              borderRadius: T.radius.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid " + T.border,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 3, height: 14, borderRadius: 2, background: T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink400 }}>
                  Action Queue
                </span>
              </div>
              <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}>
                {new Date().toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div
              style={{
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: T.successLight,
                  border: "1px solid " + T.successBd,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: T.success,
                  flexShrink: 0,
                }}
              >
                <Check size={13} />
              </div>
              <div>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: T.success }}
                >
                  All good
                </div>
                <div style={{ fontSize: 11, color: T.ink500, marginTop: 1 }}>
                  All items in stock · All SKUs priced · No critical holds
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ActionCentre
            title="Action Queue"
            alerts={queueActions.map((act) => ({
              // Severity map (render-layer only): critical→critical, warning→warn, info→warn
              severity: act.severity === "critical" ? "critical" : "warn",
              message: act.sub ? `${act.text} · ${act.sub}` : act.text,
              action: {
                label: act.cta,
                onClick: act.action,
              },
            }))}
          />
        )}

        {/* ── ZONE 2: COMMAND METRICS ─────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))",
            gap: 10,
          }}
        >
          {kpiTiles.map((tile) => (
            <div
              key={tile.label}
              style={{
                background: T.surface,
                border: "1px solid " + T.border,
                borderRadius: T.radius.lg,
                padding: "14px 16px",
                // No coloured top borders — forbidden by WP-VISUAL-SYSTEM v1.0
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: 8,
                }}
              >
                {tile.label}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      fontFamily: T.font,
                      fontVariantNumeric: "tabular-nums",
                      color: tile.valueColor,
                      lineHeight: 1,
                    }}
                  >
                    {tile.value}
                  </div>
                  {tile.sub && (
                    <div
                      style={{
                        fontSize: 11,
                        color: T.ink300,
                        marginTop: 4,
                        fontFamily: T.font,
                      }}
                    >
                      {tile.sub}
                    </div>
                  )}
                </div>
                {tile.spark && hasSparkData && (
                  <SparkLine
                    data={tile.spark}
                    positive={tile.sparkPositive}
                    width={56}
                    height={28}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── ZONE 3: CATEGORY HEALTH MATRIX ─────────────────────────────── */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          {/* Left: BulletChart per category */}
          <div
            style={{
              background: T.surface,
              border: "1px solid " + T.border,
              borderRadius: T.radius.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid " + T.border,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 3, height: 14, borderRadius: 2, background: T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink400 }}>
                  Category Health
                </span>
              </div>
            </div>
            <div style={{ padding: "12px 20px", display: "grid", gap: 12 }}>
              {catGroups.length === 0 ? (
                <div
                  style={{ fontSize: 12, color: T.ink300, padding: "8px 0" }}
                >
                  No categories found
                </div>
              ) : (
                catGroups.map(([cat, data]) => {
                  const maxVal =
                    data.maxStock > 0
                      ? data.maxStock
                      : Math.max(data.onHand * 2, 1);
                  return (
                    <div
                      key={cat}
                      onClick={() => setSubTab("items")}
                      style={{ cursor: "pointer" }}
                      title={`Click to view ${CATEGORY_LABELS[cat] || cat} items`}
                    >
                      <BulletChart
                        label={CATEGORY_LABELS[cat] || cat}
                        value={data.onHand}
                        target={data.reorder}
                        max={maxVal}
                        unit=" units"
                        height={16}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Margin distribution donut */}
          <div
            style={{
              background: T.surface,
              border: "1px solid " + T.border,
              borderRadius: T.radius.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid " + T.border,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 3, height: 14, borderRadius: 2, background: T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink400 }}>
                  Margin Distribution
                </span>
              </div>
              {noPrice.length > 0 && (
                <button
                  onClick={() => setSubTab("pricing")}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    padding: "2px 8px",
                    borderRadius: T.radius.sm,
                    cursor: "pointer",
                    background: T.warningLight,
                    color: T.warning,
                    border: "1px solid " + T.warningBd,
                    fontFamily: T.font,
                  }}
                >
                  {noPrice.length} unpriced →
                </button>
              )}
            </div>
            <div style={{ padding: "12px 20px" }}>
              {marginDonut.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: T.ink300,
                    padding: "20px 0",
                    textAlign: "center",
                  }}
                >
                  Set prices to see margin breakdown
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={marginDonut}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {marginDonut.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} SKUs`, name]}
                        contentStyle={{
                          fontSize: 11,
                          fontFamily: T.font,
                          border: "1px solid " + T.border,
                          borderRadius: T.radius.sm,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "4px 12px",
                      marginTop: 4,
                    }}
                  >
                    {marginDonut.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: T.ink500,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: d.color,
                            flexShrink: 0,
                            display: "inline-block",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: T.font,
                            fontVariantNumeric: "tabular-nums",
                            color: T.ink700,
                            fontWeight: 600,
                          }}
                        >
                          {d.value}
                        </span>
                        <span>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── ZONES 4, 5, 6: StockIntelPanel (Phase 2 + 3) ───────────────── */}
        <StockIntelPanel
          items={items}
          movements={movements}
          tenantId={tenantId}
          onNavigate={setSubTab}
          onOpenItem={setPanelItem}
        />

        {/* ── ZONE 7: CHANNEL STOCK HOLD (unchanged) ──────────────────────── */}
        <StockChannelPanel tenantId={tenantId} />

        {/* ── ZONE 8: RECENT MOVEMENTS (restyled — T-tokens, no coloured borders) */}
        {recentMov.length > 0 && (
          <div
            style={{
              background: T.surface,
              border: "1px solid " + T.border,
              borderRadius: T.radius.lg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid " + T.border,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 3, height: 14, borderRadius: 2, background: T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink400 }}>
                  Recent Stock Movements
                </span>
              </div>
              <button
                onClick={() => setSubTab("movements")}
                style={{
                  fontSize: 11,
                  color: T.accentMid,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                View all →
              </button>
            </div>
            <div style={{ padding: "0 16px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: T.font,
              }}
            >
              <thead>
                <tr>
                  {["Date", "Item", "Type", "Qty", "Reference"].map((h) => (
                    <th key={h} style={sTh}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentMov.map((m, idx) => {
                  const item = items.find((i) => i.id === m.item_id);
                  const qty = m.quantity || 0;
                  return (
                    <tr
                      key={m.id}
                      style={{ background: idx % 2 === 0 ? T.surface : T.bg }}
                    >
                      <td
                        style={{
                          ...sTd,
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.font,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(m.created_at)}
                      </td>
                      <td style={{ ...sTd, fontWeight: 500 }}>
                        {item?.name || (
                          <span style={{ color: T.ink300 }}>—</span>
                        )}
                      </td>
                      <td style={sTd}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 7px",
                            borderRadius: T.radius.sm,
                            background: T.bg,
                            color: T.ink400,
                            border: "1px solid " + T.border,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            fontWeight: 700,
                          }}
                        >
                          {(m.movement_type || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.font,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 700,
                          color: qty >= 0 ? T.success : T.danger,
                        }}
                      >
                        {qty >= 0 ? "+" : ""}
                        {fmtQty(qty, item?.unit)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.font,
                        }}
                      >
                        {m.reference || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── CANNABIS ITEMS VIEW (cannabis_retail only) ────────────────────────────
  const CannabisItemsView = () => {
    const [catFilter, setCatFilter] = useState("all");
    const [brandFilter, setBrandFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState("list");
    // subTypeFilter: { key, label } | null — Tier 2 pill selection
    // Replaces the old setSearch(label) pill pattern (WP-SMARTSTOCK-UI Phase 2)
    const [subTypeFilter, setSubTypeFilter] = useState(null);

    const brands = [
      ...new Set(items.map((i) => i.brand).filter(Boolean)),
    ].sort();

    // CAT_GROUPS and matchesGroup now live in ProductWorlds.js (single source of truth).
    // StockReceiveModal reads the same definition — add a world once, both update.
    const CAT_GROUPS = PRODUCT_WORLDS;
    const matchesGroup = itemMatchesWorld;

    const filtered = items.filter((item) => {
      if (item.is_active === false) return false;
      const group = CAT_GROUPS.find((g) => g.id === catFilter);
      if (group && !matchesGroup(item, group)) return false;
      if (brandFilter !== "all" && item.brand !== brandFilter) return false;
      // Sub-type filter (Tier 2 pill — WP-SMARTSTOCK-UI Phase 2)
      if (
        subTypeFilter &&
        !matchesSubType(item, catFilter, subTypeFilter.key, subTypeFilter.label)
      )
        return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !item.name?.toLowerCase().includes(s) &&
          !item.sku?.toLowerCase().includes(s) &&
          !item.brand?.toLowerCase().includes(s) &&
          !(item.variant_value || "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });

    const activeItems = items.filter((i) => i.is_active !== false);
    const noPrice = activeItems.filter(
      (i) => !i.sell_price || i.sell_price <= 0,
    ).length;
    const outCount = activeItems.filter(
      (i) => (i.quantity_on_hand || 0) <= 0,
    ).length;
    const groupCount = (group) =>
      group.id === "all"
        ? activeItems.length
        : activeItems.filter((i) => matchesGroup(i, group)).length;

    // ── Sub-type filter match (WP-SMARTSTOCK-UI Phase 2) ─────────────────────
    // function declaration = hoisted — safe to reference in filtered above
    function matchesSubType(item, catId, subKey, subLabel) {
      if (!subKey) return true;
      const lbl = (subLabel || subKey).toLowerCase();
      const vv = (item.variant_value || "").toLowerCase();
      const nm = (item.name || "").toLowerCase();
      const sc = (item.subcategory || "").toLowerCase();
      switch (catId) {
        // Flower: strain pills use strain_type field
        case "flower":
        case "preroll":
          if (
            ["indica", "sativa", "hybrid", "cbd", "auto"].includes(
              subKey.toLowerCase(),
            )
          ) {
            return (
              (item.strain_type || "").toLowerCase() === subKey.toLowerCase()
            );
          }
          // Weight pills (1g, 3.5g, 7g, etc.)
          return (
            parseFloat(item.weight_grams) === parseFloat(subKey) ||
            vv.startsWith(subKey) ||
            nm.includes(subKey)
          );
        // DB subcategory field for most worlds
        case "concentrate":
        case "hash":
        case "vape":
        case "papers":
        case "accessories":
        case "equipment":
        case "edible":
        case "seeds":
        case "substrate":
        case "nutrients":
        case "wellness":
        case "merch":
          // Direct subcategory match first
          if (sc === subKey) return true;
          // Fall back to name/variant label match
          return vv.includes(lbl) || nm.includes(lbl);
        default:
          return vv.includes(lbl) || nm.includes(lbl);
      }
    }

    return (
      <div>
        {(noPrice > 0 || outCount > 0) && (
          <div
            style={{
              background: T.warningLight,
              border: "1px solid " + T.warningBd,
              borderRadius: T.radius.md,
              padding: "10px 16px",
              marginBottom: 14,
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.warning,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <AlertTriangle size={11} style={{marginRight:4,verticalAlign:"middle"}} /> Needs Attention
            </span>
            {noPrice > 0 && (
              <span style={{ fontSize: 12, color: T.warning }}>
                {noPrice} item{noPrice !== 1 ? "s" : ""} have no sell price —
                hidden from shop
              </span>
            )}
            {outCount > 0 && (
              <span style={{ fontSize: 12, color: T.danger }}>
                {outCount} item{outCount !== 1 ? "s" : ""} out of stock
              </span>
            )}
          </div>
        )}

        <div
          style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}
        >
          {/* Category sidebar */}
          <div
            style={{
              background: T.surface,
              border: "1px solid " + T.border,
              borderRadius: T.radius.md,
              padding: "8px 0",
              height: "fit-content",
            }}
          >
            <div
              style={{
                padding: "8px 12px 6px",
                fontSize: 11,
                fontWeight: 700,
                color: T.ink400,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: T.font,
              }}
            >
              Categories
            </div>
            {CAT_GROUPS.map((group) => {
              const count = groupCount(group);
              const active = catFilter === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setCatFilter(group.id);
                    setBrandFilter("all");
                    setSubTypeFilter(null); // reset Tier 2 on world change
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 12px",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    background: active ? T.accentLight : "transparent",
                    borderLeft: active
                      ? "3px solid " + T.accentMid
                      : "3px solid transparent",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <span style={{ fontSize: 13 }}>{group.icon}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        color: active ? T.accentMid : T.ink700,
                        fontFamily: T.font,
                      }}
                    >
                      {group.label}
                    </span>
                  </span>
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: T.font,
                        background: active ? T.accentMid : T.border,
                        color: active ? "#fff" : T.ink500,
                        padding: "1px 5px",
                        borderRadius: T.radius.md,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main content */}
          <div>
            {/* Controls */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="Search name, SKU, brand…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...sInput, width: 220 }}
              />
              <div style={{ flex: 1 }} />
              <span
                style={{ fontSize: 11, color: T.ink500, fontFamily: T.font }}
              >
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              </span>
              <div
                style={{
                  display: "flex",
                  border: "1px solid " + T.border,
                  borderRadius: T.radius.sm,
                  overflow: "hidden",
                }}
              >
                {[
                  { id: "list", label: <AlignJustify size={14} /> },
                  { id: "grid", label: <LayoutGrid size={14} /> },
                  { id: "detail", label: <Table2 size={14} /> },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setViewMode(v.id)}
                    style={{
                      padding: "5px 10px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: T.font,
                      background: viewMode === v.id ? T.accentMid : "#fff",
                      color: viewMode === v.id ? "#fff" : T.ink500,
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              {catFilter === "all" ? (
                <button
                  style={sBtn()}
                  onClick={() => {
                    if (isCannabis) {
                      setShowWorldPicker(true);
                    } else {
                      setModalDefaults({});
                      setModalItem(null);
                    }
                  }}
                >
                  + Add Item
                </button>
              ) : (
                (() => {
                  const activeGroup = CAT_GROUPS.find(
                    (g) => g.id === catFilter,
                  );
                  // Build a human-readable label for the button
                  const subLabel = subTypeFilter?.label;
                  const btnLabel = subLabel
                    ? `+ Add ${subLabel}`
                    : `+ Add ${activeGroup?.label || "Item"}`;
                  return (
                    <button
                      style={sBtn()}
                      onClick={() => {
                        setModalDefaults({
                          category:
                            activeGroup?.enums?.[0] || "finished_product",
                          // Pass sub-type context — StockItemModal reads defaults.subcategory
                          subcategory: subTypeFilter?.key || "",
                          // Pass brand context if at Tier 3
                          brand: brandFilter !== "all" ? brandFilter : "",
                          world: catFilter,
                          worldLabel: activeGroup?.label || catFilter,
                        });
                        setModalItem(null);
                      }}
                    >
                      {btnLabel}
                    </button>
                  );
                })()
              )}
            </div>

            {/* Brand pills */}
            {brands.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                {["all", ...brands].map((brand) => {
                  const isAll = brand === "all";
                  const count = isAll
                    ? filtered.length
                    : filtered.filter((i) => i.brand === brand).length;
                  const active = brandFilter === brand;
                  if (!isAll && count === 0) return null;
                  return (
                    <button
                      key={brand}
                      onClick={() => setBrandFilter(brand)}
                      style={{
                        padding: "4px 11px",
                        borderRadius: T.radius.xl,
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        fontFamily: T.font,
                        border:
                          "1.5px solid " + (active ? T.accentMid : T.border),
                        background: active ? T.accentMid : "#fff",
                        color: active ? "#fff" : T.ink700,
                        cursor: "pointer",
                      }}
                    >
                      {isAll ? "All Brands" : brand}{" "}
                      <span style={{ opacity: 0.65 }}>×{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Smart Catalog Pills — live catalog + stock recon */}
            {catFilter !== "all" &&
              (() => {
                const group = CAT_GROUPS.find((g) => g.id === catFilter);
                const groupItems = activeItems.filter((i) =>
                  matchesGroup(i, group),
                );

                const PillBlock = ({ label, note, pills }) => {
                  const hasAny = pills.some((p) => p.count > 0);
                  // Which pill in this block is active?
                  const activeKey = subTypeFilter?.key;
                  return (
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.ink400,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 6,
                          fontFamily: T.font,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {label}
                        {note && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 400,
                              color: T.ink300,
                              textTransform: "none",
                              letterSpacing: 0,
                            }}
                          >
                            {note}
                          </span>
                        )}
                        {!hasAny && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 400,
                              color: T.ink300,
                              textTransform: "none",
                              letterSpacing: 0,
                            }}
                          >
                            — no items tagged yet
                          </span>
                        )}
                      </div>
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        {pills.map(({ key, label: lbl, count }) => {
                          const inStock = count > 0;
                          const isActive = activeKey === key;
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                // Toggle: click active pill to deselect
                                if (isActive) {
                                  setSubTypeFilter(null);
                                } else {
                                  setSubTypeFilter({ key, label: lbl });
                                }
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: T.radius.md,
                                cursor: "pointer",
                                border:
                                  "1.5px solid " +
                                  (isActive
                                    ? T.accentMid
                                    : inStock
                                      ? T.accentBd
                                      : T.border),
                                background: isActive
                                  ? T.accentMid
                                  : inStock
                                    ? T.accentLight
                                    : T.surface,
                                fontFamily: T.font,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                gap: 1,
                                minWidth: 72,
                                opacity: inStock ? 1 : 0.4,
                                transition: "all .15s",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: isActive
                                    ? "#fff"
                                    : inStock
                                      ? T.accentMid
                                      : T.ink500,
                                }}
                              >
                                {lbl}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: isActive
                                    ? "rgba(255,255,255,0.75)"
                                    : inStock
                                      ? T.ink500
                                      : T.ink300,
                                }}
                              >
                                {count > 0
                                  ? `${count} item${count !== 1 ? "s" : ""}`
                                  : "no stock"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                };

                // ── FLOWER ──
                if (catFilter === "flower") {
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <PillBlock
                        label="Strain"
                        pills={[
                          "Indica",
                          "Sativa",
                          "Hybrid",
                          "CBD",
                          "Auto",
                        ].map((s) => ({
                          key: s,
                          label: s,
                          count: groupItems.filter((i) => i.strain_type === s)
                            .length,
                        }))}
                      />
                      <PillBlock
                        label="Weight"
                        pills={[
                          "0.5g",
                          "1g",
                          "2g",
                          "3.5g",
                          "5g",
                          "7g",
                          "10g",
                          "14g",
                          "28g",
                        ].map((w) => ({
                          key: w,
                          label: w,
                          count: groupItems.filter(
                            (i) =>
                              parseFloat(i.weight_grams) === parseFloat(w) ||
                              (i.variant_value || "").startsWith(w),
                          ).length,
                        }))}
                      />
                      <PillBlock
                        label="Grade"
                        note="— edit items and add grade tags to activate"
                        pills={[
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
                        ].map((g) => ({
                          key: g,
                          label: g,
                          count: groupItems.filter(
                            (i) => Array.isArray(i.tags) && i.tags.includes(g),
                          ).length,
                        }))}
                      />
                      <PillBlock
                        label="Cultivation"
                        note="— edit items and add cultivation tags to activate"
                        pills={[
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
                        ].map((c) => ({
                          key: c,
                          label: c,
                          count: groupItems.filter(
                            (i) => Array.isArray(i.tags) && i.tags.includes(c),
                          ).length,
                        }))}
                      />
                    </div>
                  );
                }

                // ── CONCENTRATES ──
                if (catFilter === "concentrate") {
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <PillBlock
                        label="Type"
                        pills={[
                          ["budder", "Budder"],
                          ["badder", "Badder"],
                          ["live_resin", "Live Resin"],
                          ["rosin", "Rosin"],
                          ["sauce", "Terp Sauce"],
                          ["diamonds", "Diamonds"],
                          ["distillate", "Distillate"],
                          ["crumble", "Crumble"],
                          ["shatter", "Shatter"],
                          ["wax", "Wax"],
                          ["feco", "FECO"],
                          ["rso", "RSO"],
                          ["bho", "BHO"],
                        ].map(([key, lbl]) => ({
                          key,
                          label: lbl,
                          count: groupItems.filter(
                            (i) =>
                              (i.variant_value || "")
                                .toLowerCase()
                                .includes(lbl.toLowerCase()) ||
                              (i.name || "")
                                .toLowerCase()
                                .includes(lbl.toLowerCase()),
                          ).length,
                        }))}
                      />
                      <PillBlock
                        label="Weight / Size"
                        pills={["0.5g", "1g", "2g", "3.5g", "5g", "1ml"].map(
                          (w) => ({
                            key: w,
                            label: w,
                            count: groupItems.filter((i) =>
                              (i.variant_value || "").startsWith(w),
                            ).length,
                          }),
                        )}
                      />
                    </div>
                  );
                }

                // ── HASH & KIEF ──
                if (catFilter === "hash") {
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <PillBlock
                        label="Type"
                        pills={[
                          ["bubble", "Bubble Hash"],
                          ["dry_sift", "Dry Sift"],
                          ["kief", "Kief"],
                          ["lebanese", "Lebanese"],
                          ["moroccan", "Moroccan"],
                          ["traditional", "Traditional"],
                          ["afghani", "Afghani"],
                          ["charas", "Charas"],
                          ["temple_ball", "Temple Ball"],
                          ["moon_rock", "Moon Rock"],
                          ["finger_hash", "Finger Hash"],
                          ["dry_ice", "Dry Ice Hash"],
                        ].map(([key, lbl]) => ({
                          key,
                          label: lbl,
                          count: groupItems.filter((i) => {
                            const vv = (i.variant_value || "").toLowerCase();
                            const nm = (i.name || "").toLowerCase();
                            const search = lbl.toLowerCase().split(" ")[0];
                            return vv.includes(search) || nm.includes(search);
                          }).length,
                        }))}
                      />
                    </div>
                  );
                }

                // ── EDIBLES ──
                if (catFilter === "edible") {
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <PillBlock
                        label="Type"
                        pills={[
                          ["edible", "Edible"],
                          ["tincture", "Tincture"],
                          ["capsule", "Capsule"],
                        ].map(([key, lbl]) => ({
                          key,
                          label: lbl,
                          count: groupItems.filter((i) => i.subcategory === key)
                            .length,
                        }))}
                      />
                      <PillBlock
                        label="Potency"
                        pills={[
                          "5mg",
                          "10mg",
                          "20mg",
                          "25mg",
                          "50mg",
                          "100mg",
                        ].map((p) => ({
                          key: p,
                          label: p,
                          count: groupItems.filter((i) =>
                            (i.variant_value || "").includes(p),
                          ).length,
                        }))}
                      />
                      <PillBlock
                        label="Format"
                        pills={[
                          "Gummy",
                          "Chocolate",
                          "Cookie",
                          "Brownie",
                          "Candy",
                          "Lozenge",
                          "Beverage",
                          "Honey",
                        ].map((f) => ({
                          key: f,
                          label: f,
                          count: groupItems.filter(
                            (i) =>
                              (i.variant_value || "")
                                .toLowerCase()
                                .includes(f.toLowerCase()) ||
                              (i.name || "")
                                .toLowerCase()
                                .includes(f.toLowerCase()),
                          ).length,
                        }))}
                      />
                    </div>
                  );
                }

                // ── VAPES ──
                if (catFilter === "vape") {
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <PillBlock
                        label="Device Type"
                        pills={[
                          ["cartridge", "Cartridges"],
                          ["disposable", "Disposables"],
                          ["battery", "Batteries"],
                        ].map(([key, lbl]) => ({
                          key,
                          label: lbl,
                          count: groupItems.filter((i) => i.subcategory === key)
                            .length,
                        }))}
                      />
                      <PillBlock
                        label="Volume"
                        pills={["0.5ml", "1ml", "2ml", "3ml"].map((v) => ({
                          key: v,
                          label: v,
                          count: groupItems.filter((i) =>
                            (i.variant_value || "").includes(v),
                          ).length,
                        }))}
                      />
                    </div>
                  );
                }

                // ── GROW EQUIPMENT ──
                if (catFilter === "equipment") {
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <PillBlock
                        label="Equipment Type"
                        pills={[
                          ["grow_light", "Lights"],
                          ["grow_tent", "Tents"],
                          ["fan", "Fans"],
                          ["carbon_filter", "Filters"],
                          ["meter", "Meters"],
                          ["timer", "Timers"],
                          ["pot", "Pots / Containers"],
                          ["training", "Training / SCROG"],
                        ].map(([key, lbl]) => ({
                          key,
                          label: lbl,
                          count: groupItems.filter((i) => i.subcategory === key)
                            .length,
                        }))}
                      />
                    </div>
                  );
                }

                // ── DEFAULT: all other categories ──
                if (!group?.subs || group.subs.length === 0) return null;
                const subLabels = {
                  rolling_papers: "Rolling Papers",
                  cones: "Cones",
                  tips: "Tips",
                  rolling_machine: "Machines",
                  tray: "Trays",
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
                  seed: "Seeds",
                  clone: "Clones",
                  seedling: "Seedlings",
                  propagation: "Propagation",
                  substrate: "Substrate",
                  soil: "Soil",
                  rockwool: "Rockwool",
                  base_nutrient: "Base Nutrients",
                  bloom_booster: "Bloom Boosters",
                  root_stimulant: "Root Stimulants",
                  enzyme: "Enzymes",
                  ph_management: "pH Mgmt",
                  supplement: "Supplements",
                  beneficial: "Beneficials",
                  grow_light: "Lights",
                  grow_tent: "Tents",
                  fan: "Fans",
                  carbon_filter: "Filters",
                  meter: "Meters",
                  timer: "Timers",
                  pot: "Pots",
                  training: "Training",
                  mushroom: "Mushrooms",
                  adaptogen: "Adaptogens",
                  cbd: "CBD",
                  cbd_pet: "Pet CBD",
                  clothing: "Clothing",
                  preroll: "Pre-Rolls",
                  cartridge: "Cartridges",
                  disposable: "Disposables",
                  battery: "Batteries",
                };
                const subCounts = group.subs
                  .map((sub) => ({
                    sub,
                    count: activeItems.filter(
                      (i) => matchesGroup(i, group) && i.subcategory === sub,
                    ).length,
                  }))
                  .filter((s) => s.count > 0);
                if (subCounts.length === 0) return null;
                return (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 14,
                    }}
                  >
                    {subCounts.map(({ sub, count }) => {
                      const dispLabel = subLabels[sub] || sub;
                      const isActive = subTypeFilter?.key === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => {
                            if (isActive) setSubTypeFilter(null);
                            else
                              setSubTypeFilter({ key: sub, label: dispLabel });
                          }}
                          style={{
                            padding: "8px 14px",
                            borderRadius: T.radius.md,
                            cursor: "pointer",
                            border:
                              "1.5px solid " +
                              (isActive ? T.accentMid : T.accentBd),
                            background: isActive ? T.accentMid : T.accentLight,
                            fontFamily: T.font,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 2,
                            minWidth: 80,
                            transition: "all .15s",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: isActive ? "#fff" : T.accentMid,
                            }}
                          >
                            {subLabels[sub] || sub}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: isActive
                                ? "rgba(255,255,255,0.65)"
                                : T.ink500,
                            }}
                          >
                            {count} items
                          </span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => {
                        setModalDefaults({
                          category: group.enums?.[0] || "finished_product",
                          subcategory: group.subs?.[0] || "",
                          world: group.id,
                          worldLabel: group.label,
                        });
                        setModalItem(null);
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: T.radius.md,
                        cursor: "pointer",
                        border: "1.5px dashed " + T.border,
                        background: T.surface,
                        fontFamily: T.font,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                        minWidth: 80,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.ink500,
                        }}
                      >
                        + Add New
                      </span>
                      <span style={{ fontSize: 11, color: T.ink300 }}>
                        Create item
                      </span>
                    </button>
                  </div>
                );
              })()}

            {/* Grid view */}
            {viewMode === "grid" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {filtered.length === 0 ? (
                  <div
                    style={{
                      gridColumn: "1/-1",
                      textAlign: "center",
                      padding: 40,
                      color: T.ink300,
                      fontSize: 13,
                      fontFamily: T.font,
                    }}
                  >
                    No products match.{" "}
                    <span
                      style={{
                        color: T.accentMid,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      onClick={() => setModalItem(null)}
                    >
                      Add the first one →
                    </span>
                  </div>
                ) : (
                  filtered.map((item) => {
                    const low = isLowFn(item);
                    // eslint-disable-next-line no-unused-vars
                    const avail =
                      (item.quantity_on_hand || 0) - (item.reserved_qty || 0);
                    const margin =
                      item.sell_price > 0 && item.cost_price > 0
                        ? Math.round(
                            ((item.sell_price - item.cost_price) /
                              item.sell_price) *
                              100,
                          )
                        : null;
                    return (
                      <div
                        key={item.id}
                        style={{
                          background: T.surface,
                          border: "1px solid " + (low ? T.dangerBd : T.border),
                          borderRadius: T.radius.lg,
                          padding: 14,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: T.ink700,
                              lineHeight: 1.3,
                              flex: 1,
                            }}
                          >
                            {item.name}
                          </span>
                          {low && <span style={sBadge("danger")}>LOW</span>}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: T.ink300,
                            fontFamily: T.font,
                          }}
                        >
                          {item.sku}
                        </span>
                        {item.brand && (
                          <span
                            style={{
                              fontSize: 11,
                              color: T.ink500,
                              fontFamily: T.font,
                            }}
                          >
                            {item.brand}
                          </span>
                        )}
                        {item.variant_value && (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 7px",
                              borderRadius: T.radius.sm,
                              fontSize: 11,
                              fontWeight: 700,
                              width: "fit-content",
                              background: "#EEF2FF",
                              color: "#3730A3",
                            }}
                          >
                            {item.variant_value}
                          </span>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: T.accentMid,
                              fontFamily: T.font,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {item.sell_price > 0 ? (
                              fmt(item.sell_price)
                            ) : (
                              <span
                                style={{
                                  color: T.ink300,
                                  fontSize: 11,
                                  fontWeight: 400,
                                }}
                              >
                                No price
                              </span>
                            )}
                          </span>
                          {margin !== null && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: T.radius.sm,
                                background:
                                  margin >= 50
                                    ? T.successLight
                                    : margin >= 30
                                      ? T.warningLight
                                      : T.dangerLight,
                                color:
                                  margin >= 50
                                    ? T.success
                                    : margin >= 30
                                      ? T.warning
                                      : T.danger,
                              }}
                            >
                              {margin}%
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: low ? T.danger : T.ink500,
                            fontFamily: T.font,
                          }}
                        >
                          {fmtQty(item.quantity_on_hand, item.unit)} on hand
                          {(item.reserved_qty || 0) > 0 &&
                            ` · ${item.reserved_qty} held`}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 5,
                            borderTop: "1px solid " + T.bg,
                            paddingTop: 8,
                          }}
                        >
                          <button
                            onClick={() => loadMovForItem(item)}
                            style={{
                              flex: 1,
                              padding: "5px 0",
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: T.font,
                              border: "1px solid " + T.border,
                              color: T.ink500,
                              background: "transparent",
                              borderRadius: T.radius.sm,
                              cursor: "pointer",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Mov
                          </button>
                          <button
                            onClick={() => setModalItem(item)}
                            style={{
                              flex: 1,
                              padding: "5px 0",
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: T.font,
                              border: "1px solid " + T.accentBd,
                              color: T.accentMid,
                              background: "transparent",
                              borderRadius: T.radius.sm,
                              cursor: "pointer",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              adjustOpen === item.id
                                ? closeAdj()
                                : openAdj(item.id)
                            }
                            style={{
                              flex: 1,
                              padding: "5px 0",
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: T.font,
                              border:
                                "1px solid " +
                                (adjustOpen === item.id
                                  ? T.dangerBd
                                  : T.warningBd),
                              color:
                                adjustOpen === item.id ? T.danger : T.warning,
                              background: "transparent",
                              borderRadius: T.radius.sm,
                              cursor: "pointer",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {adjustOpen === item.id ? "Cancel" : "Adj"}
                          </button>
                        </div>
                        {adjustOpen === item.id && renderAdjust(item)}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Active sub-type filter chip ───────────────────────── */}
            {subTypeFilter && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 11, color: T.ink500 }}>
                  Filtered by:
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 99,
                    background: T.accentMid,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {subTypeFilter.label}
                  <button
                    onClick={() => setSubTypeFilter(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.75)",
                      cursor: "pointer",
                      fontSize: 13,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
                <span style={{ fontSize: 11, color: T.ink500 }}>
                  {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* ── Detail / Excel view — WP-SMARTSTOCK-UI ─────────────────── */}
            {viewMode === "detail" && (
              <CannabisDetailView
                items={filtered}
                allItems={activeItems}
                tenantId={tenantId}
                onOpenPanel={setPanelItem}
                onOpenEdit={(item) => {
                  setModalItem(item);
                }}
                onRefresh={load}
              />
            )}

            {/* List view */}
            {viewMode === "list" && (
              <div
                style={{
                  background: T.surface,
                  border: "1px solid " + T.border,
                  borderRadius: T.radius.lg,
                  overflow: "auto",
                  padding: "0 16px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    fontFamily: T.font,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "Product / SKU",
                        "Variant",
                        "On Hand",
                        "Available",
                        "Sell Price",
                        "Margin",
                        "AVCO",
                        "",
                      ].map((h) => (
                        <th key={h} style={sTh}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            ...sTd,
                            textAlign: "center",
                            color: T.ink300,
                            padding: 32,
                          }}
                        >
                          No products match your filters.{" "}
                          <span
                            style={{
                              color: T.accentMid,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                            onClick={() => setModalItem(null)}
                          >
                            Add the first one →
                          </span>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((item, idx) => {
                        const low = isLowFn(item);
                        const avail =
                          (item.quantity_on_hand || 0) -
                          (item.reserved_qty || 0);
                        const margin =
                          item.sell_price > 0 && item.cost_price > 0
                            ? Math.round(
                                ((item.sell_price - item.cost_price) /
                                  item.sell_price) *
                                  100,
                              )
                            : null;
                        const isAdj = adjustOpen === item.id;
                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              style={{
                                background: idx % 2 === 0 ? "#fff" : T.surface,
                                borderLeft: low
                                  ? "3px solid " + T.danger
                                  : "3px solid transparent",
                              }}
                            >
                              <td
                                style={{
                                  ...sTd,
                                  minWidth: 180,
                                  cursor: "pointer",
                                }}
                                onClick={() => setPanelItem(item)}
                              >
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: T.accentMid,
                                  }}
                                >
                                  {item.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: T.ink300,
                                    fontFamily: T.font,
                                    marginTop: 2,
                                  }}
                                >
                                  {item.sku}
                                </div>
                                {item.brand && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: T.ink500,
                                      marginTop: 1,
                                    }}
                                  >
                                    {item.brand}
                                  </div>
                                )}
                                {low && (
                                  <span
                                    style={{
                                      ...sBadge("danger"),
                                      display: "inline-block",
                                      marginTop: 3,
                                    }}
                                  >
                                    LOW STOCK
                                  </span>
                                )}
                              </td>
                              <td style={sTd}>
                                {item.variant_value ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 7px",
                                      borderRadius: T.radius.sm,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      background: "#EEF2FF",
                                      color: "#3730A3",
                                    }}
                                  >
                                    {item.variant_value}
                                  </span>
                                ) : (
                                  <span style={{ color: T.ink300 }}>—</span>
                                )}
                              </td>
                              <td
                                style={{
                                  ...sTd,
                                  fontFamily: T.font,
                                  fontWeight: 700,
                                  color: low ? T.danger : T.ink700,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {fmtQty(item.quantity_on_hand, item.unit)}
                              </td>
                              <td
                                style={{
                                  ...sTd,
                                  fontFamily: T.font,
                                  fontWeight: 700,
                                  color: avail <= 0 ? T.danger : T.success,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {fmtQty(avail, item.unit)}
                                {(item.reserved_qty || 0) > 0 && (
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: 11,
                                      color: T.warning,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {item.reserved_qty} held
                                  </span>
                                )}
                              </td>
                              <td
                                style={{
                                  ...sTd,
                                  fontFamily: T.font,
                                  fontWeight: 700,
                                  color: T.accentMid,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {item.sell_price > 0 ? (
                                  fmt(item.sell_price)
                                ) : (
                                  <span
                                    style={{
                                      color: T.ink300,
                                      fontWeight: 400,
                                      fontSize: 11,
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td style={sTd}>
                                {margin !== null ? (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: "2px 6px",
                                      borderRadius: T.radius.sm,
                                      background:
                                        margin >= 50
                                          ? T.successLight
                                          : margin >= 30
                                            ? T.warningLight
                                            : T.dangerLight,
                                      color:
                                        margin >= 50
                                          ? T.success
                                          : margin >= 30
                                            ? T.warning
                                            : T.danger,
                                    }}
                                  >
                                    {margin}%
                                  </span>
                                ) : (
                                  <span style={{ color: T.ink300 }}>—</span>
                                )}
                              </td>
                              <td
                                style={{
                                  ...sTd,
                                  fontFamily: T.font,
                                  fontSize: 12,
                                  color: T.ink500,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {item.weighted_avg_cost ? (
                                  fmt(item.weighted_avg_cost) +
                                  "/" +
                                  (item.unit || "u")
                                ) : (
                                  <span style={{ color: T.ink300 }}>—</span>
                                )}
                              </td>
                              <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button
                                    onClick={() => loadMovForItem(item)}
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: 11,
                                      fontFamily: T.font,
                                      fontWeight: 600,
                                      border: "1px solid " + T.border,
                                      color: T.ink500,
                                      background: "transparent",
                                      borderRadius: T.radius.sm,
                                      cursor: "pointer",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    Mov
                                  </button>
                                  <button
                                    onClick={() => setModalItem(item)}
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: 11,
                                      fontFamily: T.font,
                                      fontWeight: 600,
                                      border: "1px solid " + T.accentBd,
                                      color: T.accentMid,
                                      background: "transparent",
                                      borderRadius: T.radius.sm,
                                      cursor: "pointer",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      isAdj ? closeAdj() : openAdj(item.id)
                                    }
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: 11,
                                      fontFamily: T.font,
                                      fontWeight: 600,
                                      border:
                                        "1px solid " +
                                        (isAdj ? T.dangerBd : T.warningBd),
                                      color: isAdj ? T.danger : T.warning,
                                      background: "transparent",
                                      borderRadius: T.radius.sm,
                                      cursor: "pointer",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {isAdj ? "Cancel" : "Adjust"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isAdj && (
                              <tr>
                                <td
                                  colSpan={8}
                                  style={{
                                    padding: "0 12px 12px",
                                    background: "#FFF9F9",
                                  }}
                                >
                                  {renderAdjust(item)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <p
        style={{
          padding: "32px 0",
          color: T.ink300,
          fontSize: "13px",
          fontFamily: T.font,
        }}
      >
        Loading HQ stock...
      </p>
    );
  if (error)
    return (
      <div
        style={{
          padding: "16px",
          background: T.dangerLight,
          border: "1px solid " + T.dangerBd,
          borderRadius: "4px",
          color: T.danger,
          fontSize: "13px",
        }}
      >
        Error: {error}
      </div>
    );

  return (
    <div style={{ fontFamily: T.font, color: T.ink700, background: "transparent" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: isFoodBev ? "0" : "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: T.font,
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            HQ Stock
          </h2>
          <p style={{ fontSize: "12px", color: T.ink300, margin: 0 }}>
            {items.length} item{items.length !== 1 ? "s" : ""} · Total value:{" "}
            {fmt(totalVal)}
            {lowTotal > 0 && (
              <span
                style={{ color: T.danger, fontWeight: 600, marginLeft: "10px" }}
              >
                {lowTotal} below reorder level
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              preReceiveRef.current = Object.fromEntries(
                items.map((i) => [i.id, i.weighted_avg_cost]),
              );
              setReceiveOpen(true);
            }}
            style={{
              padding: "6px 16px",
              background: T.accentMid,
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: T.font,
              color: "#fff",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            <Package size={13} style={{marginRight:5,verticalAlign:"middle"}} /> Receive Delivery
          </button>
          <button
            style={{
              padding: "6px 14px",
              background: "transparent",
              border: "1px solid " + T.border,
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: T.font,
              color: T.ink500,
            }}
            onClick={load}
          >
            Refresh
          </button>
        </div>
      </div>

      <>
        {/* ── Stock Command KPI Bar ────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 1,
          background: T.border,
          border: "1px solid " + T.border,
          borderRadius: T.radius.lg,
          overflow: "hidden",
          marginBottom: 16,
          marginTop: 8,
        }}>
          {[
            { label: "Stock Value", value: fmt(totalVal), sub: "at cost (AVCO)", color: T.accent },
            { label: "In Stock", value: `${inStockCount} / ${items.length}`, sub: "SKUs available", color: inStockCount === items.length ? T.success : T.warning },
            { label: "Avg Margin", value: avgMarginPct !== null ? `${Math.round(avgMarginPct)}%` : "\u2014", sub: "across priced items", color: avgMarginPct > 50 ? T.success : avgMarginPct > 30 ? T.warning : T.danger },
            { label: "Reorder Alerts", value: lowTotal, sub: "below threshold", color: lowTotal > 0 ? T.danger : T.success },
            ...(expiringCount > 0 ? [{ label: "Expiring <30d", value: expiringCount, sub: "items need action", color: T.warning }] : []),
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: T.surface,
              padding: "14px 18px",
              borderTop: `3px solid ${kpi.color}`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: T.ink900, fontFamily: T.font, lineHeight: 1, marginBottom: 3, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink400, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 10, color: T.ink300, marginTop: 2 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid " + T.border,
            marginBottom: "24px",
            marginTop: "16px",
          }}
        >
          {[
            { id: "overview", label: "Overview" },
            { id: "items", label: `Items (${items.length})` },
            { id: "movements", label: "Movements" },
            { id: "pricing", label: "Pricing" },
            { id: "receipts", label: "Receipts" },
            { id: "purchase-orders", label: "Purchase Orders" },
            ...(isCannabis ? [{ id: "shop", label: "Shop Manager" }] : []),
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => !t.disabled && setSubTab(t.id)}
              style={{
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderBottom:
                  subTab === t.id
                    ? "2px solid " + T.accentMid
                    : "2px solid transparent",
                fontFamily: T.font,
                fontSize: "11px",
                fontWeight: subTab === t.id ? 700 : 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.disabled
                  ? T.ink300
                  : subTab === t.id
                    ? T.accentMid
                    : T.ink500,
                cursor: t.disabled ? "default" : "pointer",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
                opacity: t.disabled ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {t.label}
              {t.soon && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    padding: "1px 5px",
                    borderRadius: T.radius.sm,
                    background: T.infoLight,
                    color: T.info,
                    border: "1px solid " + T.infoBd,
                    textTransform: "uppercase",
                  }}
                >
                  SOON
                </span>
              )}
            </button>
          ))}
        </div>

        {subTab === "overview" &&
          (isFoodBev ? <FoodOverview /> : <GeneralOverview />)}
        {subTab === "items" &&
          (isFoodBev ? (
            <FoodItems />
          ) : industryProfile === "cannabis_retail" ? (
            <CannabisItemsView />
          ) : (
            <FoodItems />
          ))}
        {subTab === "movements" && <FoodMovements />}
        {subTab === "pricing" && <StockPricingPanel tenantId={tenantId} />}
        {subTab === "receipts" && (
          <StockReceiveHistoryPanel
            tenantId={tenantId}
            onReviewPrices={() => setSubTab("pricing")}
          />
        )}
        {subTab === "purchase-orders" && (
          <HQPurchaseOrders
            tenantId={tenantId}
            industryProfile={industryProfile}
          />
        )}
        {subTab === "shop" && isCannabis && (
          <ShopTab items={items} tenantId={tenantId} onRefresh={load} />
        )}

        {avcoAlertItems.length > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: T.warningLight,
              border: `1px solid ${T.warningBd}`,
              borderRadius: T.radius.md,
              padding: "14px 20px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              zIndex: 500,
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontFamily: T.font,
              maxWidth: 520,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.warning,
                  marginBottom: 2,
                }}
              >
                <AlertTriangle size={12} style={{marginRight:4,flexShrink:0,verticalAlign:"middle"}} /> {avcoAlertItems.length} item
                {avcoAlertItems.length !== 1 ? "s" : ""} had AVCO changes &gt;5%
                — check your sell prices
              </div>
              <div style={{ fontSize: 11, color: T.warning, opacity: 0.8 }}>
                {avcoAlertItems
                  .slice(0, 3)
                  .map((i) => i.name)
                  .join(", ")}
                {avcoAlertItems.length > 3
                  ? ` +${avcoAlertItems.length - 3} more`
                  : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setSubTab("pricing")}
                style={{
                  padding: "6px 14px",
                  background: T.warning,
                  color: "#fff",
                  border: "none",
                  borderRadius: T.radius.sm,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: T.font,
                }}
              >
                Review Prices →
              </button>
              <button
                onClick={() => setAvcoAlertItems([])}
                style={{
                  padding: "6px 10px",
                  background: "transparent",
                  color: T.warning,
                  border: `1px solid ${T.warningBd}`,
                  borderRadius: T.radius.sm,
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: T.font,
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}
      </>

      {renderMovDrawer()}
      {receiveOpen && (
        <StockReceiveModal
          tenantId={tenantId}
          onClose={() => setReceiveOpen(false)}
          onComplete={() => {
            setCheckAvcoAfterLoad(true);
            load();
            setReceiveOpen(false);
          }}
        />
      )}
      {calibOpen && (
        <StockOpeningCalibration
          tenantId={tenantId}
          onClose={() => setCalibOpen(false)}
          onComplete={() => {
            setCalibOpen(false);
            load();
          }}
        />
      )}
      {panelItem && (
        <StockItemPanel
          item={panelItem}
          onClose={() => setPanelItem(null)}
          onEdit={() => {
            setModalItem(panelItem);
            setPanelItem(null);
          }}
          onRefresh={() => {
            load();
          }}
        />
      )}
      {/* ── World Picker — cannabis retail "Add Item" entry point ── */}
      {showWorldPicker && isCannabis && (
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
              background: T.surface,
              borderRadius: T.radius.lg,
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
                <div style={{ fontSize: 12, color: T.ink500 }}>
                  Choose a product type — the form adapts with the right fields
                </div>
              </div>
              <button
                onClick={() => setShowWorldPicker(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  fontVariantNumeric: "tabular-nums",
                  cursor: "pointer",
                  color: T.ink500,
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
                    borderRadius: T.radius.md,
                    border: `1px solid ${T.border}`,
                    cursor: "pointer",
                    textAlign: "center",
                    background: T.surface,
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = T.accent;
                    e.currentTarget.style.background = T.accentLight;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.background = "#fff";
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    {WORLD_ICON_MAP[world.id] || <Package size={18} color={T.ink400} />}
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
                    style={{ fontSize: 11, color: T.ink500, lineHeight: 1.4 }}
                  >
                    {world.desc || world.enums?.[0]?.replace(/_/g, " ") || ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalItem !== undefined && (
        <StockItemModal
          item={modalItem || null}
          defaults={modalDefaults}
          suppliers={suppliers}
          visibleCategories={
            isCannabis
              ? [
                  "flower",
                  "concentrate",
                  "edible",
                  "accessory",
                  "finished_product",
                  "hardware",
                  "raw_material",
                ]
              : Object.keys(CATEGORY_LABELS)
          }
          onSave={handleSave}
          onCancel={() => {
            setModalItem(undefined);
            setModalDefaults({});
          }}
          saving={modalSaving}
        />
      )}
    </div>
  );
}
