// src/components/hq/HQProduction.js v3.0
// WP-THEME: Unified design system applied
//   - Outfit replaces Cormorant Garamond + Jost everywhere
//   - DM Mono for all metric/numeric values
//   - Stat cards: coloured top borders removed — semantic colour on value only
//   - Orange "PLAN PRODUCTION" banner → standard warning template
//   - Red "Out of Stock" banner → standard danger template
//   - Sub-tabs: standard underline style (no filled buttons)
//   - sLabel: ink400 replaces accent green
//   - HowItWorksBanner: step cards use left border only (no coloured top border)
//   - Purple retired from pipeline steps → info-blue
// v2.0: WP-W unified pipeline, lifecycle badges, archive, audit export

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import { showCannabisField } from "../../constants/industryProfiles";
import { useTenant } from "../../services/tenantService";
import { usePageContext } from "../../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "../viz";
import ActionCentre from "../shared/ActionCentre";
import { T } from "../../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)

// Legacy aliases — keeps all internal logic unchanged
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.surface,
  warm: T.bg,
  white: "#fff",
  border: T.border,
  muted: T.ink500,
  text: T.ink900,
  error: T.danger,
  red: T.danger,
  blue: T.info,
  purple: T.info, // ★ purple → info-blue
  orange: T.warning,
  lightOrange: T.warningLight,
};
const F = {
  heading: T.font, // ★ Outfit replaces Cormorant everywhere
  body: T.font,
};

const sCard = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.md,
  padding: "20px",
  boxShadow: T.shadow.sm,
};
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background:
    v === "primary"
      ? T.accent
      : v === "danger"
        ? T.danger
        : v === "amber"
          ? T.warning
          : "transparent",
  color: ["primary", "danger", "amber"].includes(v) ? "#fff" : T.accentMid,
  border: ["primary", "danger", "amber"].includes(v)
    ? "none"
    : `1px solid ${T.accentBd}`,
  borderRadius: T.radius.sm,
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.font,
  transition: "all 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm,
  fontSize: "13px",
  fontFamily: T.font,
  background: T.surface,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };
const sLabel = {
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
  fontFamily: T.font,
  fontWeight: 700,
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
  background: T.surface,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.bg}`,
  color: T.ink700,
  verticalAlign: "middle",
};

// ─── FORMAT CATALOGUE ────────────────────────────────────────────────────────
const FORMAT_CATALOGUE = {
  vape_05ml: {
    label: "0.5ml Cartridge (510)",
    category: "vape",
    is_vape: true,
    distillate_ml: 0.5,
    chambers: 1,
    terpene_pct: 10,
    format_short: "0.5ml Cart",
  },
  vape_1ml: {
    label: "1ml Cartridge (510 Thread)",
    category: "vape",
    is_vape: true,
    distillate_ml: 1.0,
    chambers: 1,
    terpene_pct: 10,
    format_short: "1ml Cart",
  },
  vape_1ml_postless: {
    label: "1ml Post-less Cartridge",
    category: "vape",
    is_vape: true,
    distillate_ml: 1.0,
    chambers: 1,
    terpene_pct: 10,
    format_short: "1ml Postless",
  },
  vape_2ml: {
    label: "2ml Disposable Pen (AiO)",
    category: "vape",
    is_vape: true,
    distillate_ml: 2.0,
    chambers: 1,
    terpene_pct: 10,
    format_short: "2ml Pen",
  },
  vape_3x1ml: {
    label: "Triple Chamber (3 × 1ml)",
    category: "vape",
    is_vape: true,
    distillate_ml: 1.0,
    chambers: 3,
    terpene_pct: 10,
    format_short: "3×1ml Triple",
  },
  vape_custom: {
    label: "Custom Vape (enter ml)",
    category: "vape",
    is_vape: true,
    distillate_ml: 0,
    chambers: 1,
    terpene_pct: 10,
    format_short: "Custom Vape",
    custom_fill: true,
  },
  edible: {
    label: "Edible / Capsule",
    category: "other",
    is_vape: false,
    format_short: "Edible",
  },
  flower: {
    label: "Flower / Pre-roll",
    category: "other",
    is_vape: false,
    format_short: "Flower",
  },
  beverage: {
    label: "Beverage / Drink",
    category: "other",
    is_vape: false,
    format_short: "Beverage",
  },
  topical: {
    label: "Topical / Cream",
    category: "other",
    is_vape: false,
    format_short: "Topical",
  },
  other: {
    label: "Other / Custom",
    category: "other",
    is_vape: false,
    format_short: "Custom",
  },
};
const FORMAT_GROUPS = [
  {
    groupLabel: "── Vape ──",
    keys: [
      "vape_05ml",
      "vape_1ml",
      "vape_1ml_postless",
      "vape_2ml",
      "vape_3x1ml",
      "vape_custom",
    ],
  },
  {
    groupLabel: "── Other Products ──",
    keys: ["edible", "flower", "beverage", "topical", "other"],
  },
];
const STRAIN_OPTIONS = [
  "Pineapple Express",
  "Gelato #41",
  "Cinnamon Kush Cake",
  "Sweet Watermelon",
  "ZKZ",
  "Wedding Cake",
  "Peaches & Cream",
  "Purple Punch",
  "Mimosa",
  "RNTZ",
  "Blue Zushi",
  "MAC",
  "Pear Jam",
  "Melon Lychee",
  "Tutti Frutti",
  "Purple Crack",
  "Lemonhead+",
  "Sherblato+",
];

function genRunNumber(nameStr, formatKey) {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const sc = nameStr
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase();
  const fc = formatKey
    .replace("vape_", "")
    .replace(/_/g, "")
    .toUpperCase()
    .slice(0, 4);
  return `PR-${y}${m}${day}-${sc}-${fc}`;
}
function calcYield(actual, planned) {
  if (!planned || planned === 0) return null;
  return +((actual / planned) * 100).toFixed(1);
}

// ─── Lifecycle badge ─────────────────────────────────────────────────────────
function LifecycleBadge({ status }) {
  const map = {
    active: { bg: T.successLight, color: T.success, label: "Active" },
    in_production: { bg: T.infoLight, color: T.info, label: "In Production" },
    low_stock: { bg: T.warningLight, color: T.warning, label: "Low Stock" },
    depleted: { bg: T.dangerLight, color: T.danger, label: "Depleted" },
    archived: { bg: T.bg, color: T.ink500, label: "Archived" },
  };
  const s = map[status || "active"] || map.active;
  return (
    <span
      style={{
        fontSize: "11px",
        padding: "2px 8px",
        borderRadius: T.radius.sm,
        background: s.bg,
        color: s.color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: T.font,
      }}
    >
      {s.label}
    </span>
  );
}

function StatusBadge({ status, yieldPct }) {
  let bg, color, label;
  if (status === "completed" && yieldPct !== null && yieldPct < 95) {
    bg = T.warningLight;
    color = T.warning;
    label = "Yield Flagged";
  } else if (status === "completed") {
    bg = T.successLight;
    color = T.success;
    label = "Completed";
  } else if (status === "in_progress") {
    bg = T.warningLight;
    color = T.warning;
    label = "In Progress";
  } else if (status === "active") {
    bg = T.successLight;
    color = T.success;
    label = "Active";
  } else if (status === "archived") {
    bg = T.bg;
    color = T.ink500;
    label = "Archived";
  } else {
    bg = T.bg;
    color = T.ink500;
    label = status || "Draft";
  }
  return (
    <span
      style={{
        fontSize: "11px",
        padding: "2px 8px",
        borderRadius: T.radius.sm,
        background: bg,
        color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: T.font,
      }}
    >
      {label}
    </span>
  );
}

function StockGauge({ label, available, needed, unit, color = T.accentMid }) {
  const pct = needed > 0 ? Math.min((available / needed) * 100, 100) : 100;
  const ok = available >= needed;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span
          style={{ fontSize: "12px", fontFamily: T.font, color: T.ink700 }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontFamily: T.font,
            fontWeight: 600,
            color: ok ? T.success : T.danger,
          }}
        >
          {ok ? "✓" : "✕"}{" "}
          {typeof available === "number" ? available.toFixed(2) : available}
          {unit} available
          {needed > 0 && (
            <span style={{ color: T.ink500, fontWeight: 400 }}>
              {" "}
              / {needed}
              {unit} needed
            </span>
          )}
        </span>
      </div>
      <div
        style={{
          height: "6px",
          background: T.border,
          borderRadius: T.radius.sm,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: ok ? color : T.danger,
            borderRadius: T.radius.sm,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── How It Works banner ─────────────────────────────────────────────────────
function HowItWorksBanner() {
  const [open, setOpen] = React.useState(false);
  const steps = [
    {
      step: "1",
      title: "Supply Chain",
      color: T.info,
      what: "Receive raw materials",
      how: "HQ → Supply Chain → Purchase Orders\nCreate a PO for distillate, terpenes, hardware.\nWhen stock arrives, click 'Receive' — quantities auto-add to inventory.",
      result: "Raw materials appear in inventory with correct quantities.",
    },
    {
      step: "2",
      title: "New Production Run",
      color: T.accentMid,
      what: "Manufacture finished product",
      how: "HQ → Production → New Production Run\nSelect strain + format (e.g. MAC 1ml Cart).\nEnter how many units you're filling.\nSystem shows exactly what raw materials will be deducted.",
      result: "Raw materials deducted. Finished units added to stock.",
    },
    {
      step: "3",
      title: "Set Sell Price",
      color: "#b5935a",
      what: "Price the product for the shop",
      how: "HQ → Pricing tab\nFind the finished product.\nSet sell_price > R0.\nWithout a price, the product will NOT appear in the customer shop.",
      result: "Product is now ready to go live.",
    },
    {
      step: "4",
      title: "Live in Shop",
      color: T.success,
      what: "Product appears automatically",
      how: "No action needed.\nThe shop reads inventory_items WHERE:\n  • category = 'finished_product'\n  • is_active = true\n  • quantity_on_hand > 0\n  • sell_price > R0\nAll 4 conditions must be true.",
      result: "Customers can find, add to cart and buy the product.",
    },
  ];
  const glossary = [
    {
      term: "BATCH",
      def: "A product record — describes what the product is (strain, format, expiry, lab cert). Does NOT add stock on its own.",
    },
    {
      term: "PRODUCTION RUN",
      def: "A manufacturing event — logs how many units you filled today, deducts raw materials, adds finished stock.",
    },
    {
      term: "INVENTORY ITEM",
      def: "The live stock counter — quantity_on_hand is what the shop reads. Goes up on production, down on each sale.",
    },
    {
      term: "NOT LINKED",
      def: "Batch was created before v2.0 and has no inventory_item_id. Run a New Production Run to link it.",
    },
    {
      term: "LOW STOCK",
      def: "quantity_on_hand ≤ low_stock_threshold (default: 10). Still live in shop but plan a production run soon.",
    },
    {
      term: "DEPLETED",
      def: "quantity_on_hand = 0. Product is automatically hidden from shop. Run production to restock.",
    },
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.infoBd}`,
          borderLeft: `3px solid ${T.info}`,
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: T.font,
              fontSize: 13,
              fontWeight: 600,
              color: T.info,
            }}
          >
            How Production Works — 4 steps from raw materials to live shop
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              ...sBtn("outline"),
              padding: "4px 12px",
              fontSize: "11px",
              color: T.info,
              borderColor: T.infoBd,
            }}
          >
            {open ? "▲ Hide" : "▼ Show"}
          </button>
        </div>
        {open && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 0,
                flexWrap: "wrap",
                alignItems: "stretch",
                marginBottom: 16,
              }}
            >
              {steps.map((s, i, arr) => (
                <React.Fragment key={s.step}>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 200,
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${s.color}`,
                      borderRadius: T.radius.md,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: s.color,
                        fontFamily: T.font,
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Step {s.step}
                    </div>
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.ink900,
                        marginBottom: 6,
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ink700,
                        marginBottom: 4,
                      }}
                    >
                      {s.what}
                    </div>
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 11,
                        color: T.ink500,
                        lineHeight: 1.7,
                        whiteSpace: "pre-line",
                        marginBottom: 8,
                      }}
                    >
                      {s.how}
                    </div>
                    <div
                      style={{
                        background: `${s.color}10`,
                        border: `1px solid ${s.color}30`,
                        borderRadius: T.radius.sm,
                        padding: "6px 10px",
                        fontFamily: T.font,
                        fontSize: 11,
                        color: s.color,
                        fontWeight: 600,
                      }}
                    >
                      ✓ {s.result}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0 4px",
                        color: T.ink300,
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      →
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                gap: 10,
              }}
            >
              {glossary.map((g) => (
                <div
                  key={g.term}
                  style={{
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius.md,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: T.ink900,
                      marginBottom: 4,
                    }}
                  >
                    {g.term}
                  </div>
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: 11,
                      color: T.ink500,
                      lineHeight: 1.6,
                    }}
                  >
                    {g.def}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Set Price Panel ─────────────────────────────────────────────────────────
function SetPricePanel({ items, onRefresh }) {
  const { tenantId } = useTenant();
  const finished = items.filter((i) => i.category === "finished_product");
  const [prices, setPrices] = useState({});
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    const init = {};
    finished.forEach((i) => {
      init[i.id] = parseFloat(i.sell_price || 0).toFixed(0);
    });
    setPrices(init);
  }, [items]); // eslint-disable-line
  const handleSave = async (item) => {
    setSaving(item.id);
    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({ sell_price: parseFloat(prices[item.id]) || 0 })
        .eq("id", item.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      setToast({
        msg: `${item.name} updated to R${prices[item.id]}`,
        type: "success",
      });
      setTimeout(() => setToast(null), 3000);
      onRefresh();
    } catch (err) {
      setToast({ msg: "Save failed: " + err.message, type: "error" });
    } finally {
      setSaving(null);
    }
  };
  return (
    <div
      style={{
        ...sCard,
        border: `1px solid ${T.accentBd}`,
        background: T.accentLight,
      }}
    >
      <div style={sLabel}>Set Sell Prices — Website Shop</div>
      <p
        style={{
          fontSize: "12px",
          color: T.accentMid,
          margin: "6px 0 12px",
          fontFamily: T.font,
          lineHeight: "1.7",
        }}
      >
        Products with <strong>sell_price &gt; R0</strong> and{" "}
        <strong>quantity &gt; 0</strong> appear automatically in the shop.
      </p>
      {toast && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: 10,
            borderRadius: T.radius.sm,
            fontSize: 12,
            fontFamily: T.font,
            background: toast.type === "success" ? T.successLight : T.dangerLight,
            color: toast.type === "success" ? T.success : T.danger,
            border: `1px solid ${toast.type === "success" ? T.successBd : T.dangerBd}`,
          }}
        >
          {toast.type === "success" ? "✓ " : "✗ "}
          {toast.msg}
        </div>
      )}
      {finished.length === 0 ? (
        <p style={{ fontSize: "12px", color: T.ink500, fontFamily: T.font }}>
          No finished products in inventory yet.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            fontFamily: T.font,
          }}
        >
          <thead>
            <tr>
              <th style={sTh}>Product</th>
              <th style={sTh}>SKU</th>
              <th style={{ ...sTh, textAlign: "right" }}>Stock</th>
              <th style={{ ...sTh, textAlign: "right" }}>Sell Price (R)</th>
              <th style={sTh}>Shop Status</th>
              <th style={sTh}></th>
            </tr>
          </thead>
          <tbody>
            {finished.map((i) => {
              const qty = parseFloat(i.quantity_on_hand || 0);
              const price = parseFloat(prices[i.id] || 0);
              const isLive = qty > 0 && price > 0;
              const sem = isLive ? "success" : qty <= 0 ? "danger" : "warning";
              const semC = {
                success: T.success,
                danger: T.danger,
                warning: T.warning,
              };
              const semBg = {
                success: T.successLight,
                danger: T.dangerLight,
                warning: T.warningLight,
              };
              return (
                <tr key={i.id}>
                  <td style={{ ...sTd, fontWeight: 500 }}>{i.name}</td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: T.font,
                      fontSize: "11px",
                      color: T.ink500,
                    }}
                  >
                    {i.sku}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.font,
                      color: qty <= 0 ? T.danger : T.success,
                      fontWeight: 600,
                    }}
                  >
                    {Math.floor(qty)} pcs
                  </td>
                  <td style={{ ...sTd, textAlign: "right" }}>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={prices[i.id] || ""}
                      onChange={(e) =>
                        setPrices((p) => ({ ...p, [i.id]: e.target.value }))
                      }
                      style={{
                        ...sInput,
                        width: "90px",
                        textAlign: "right",
                        padding: "6px 8px",
                      }}
                      placeholder="0"
                    />
                  </td>
                  <td style={sTd}>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: 3,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        background: semBg[sem],
                        color: semC[sem],
                      }}
                    >
                      {isLive ? "Live" : qty <= 0 ? "No Stock" : "Price Needed"}
                    </span>
                  </td>
                  <td style={{ ...sTd, textAlign: "center" }}>
                    <button
                      onClick={() => handleSave(i)}
                      disabled={saving === i.id}
                      style={{
                        ...sBtn(),
                        padding: "5px 14px",
                        fontSize: "11px",
                      }}
                    >
                      {saving === i.id ? "..." : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
// ─── WP-BIB Session 2: INSERT THIS BLOCK immediately before the line:
// export default function HQProduction() {
// ─────────────────────────────────────────────────────────────────────────────

const HQ_TENANT_ID_PROD = "43b34c33-6864-4f02-98dd-df1d340475c3";

// Profile-adaptive material type options for BOM editor
const BOM_MATERIAL_TYPES = {
  cannabis_retail: [
    "distillate",
    "concentrate",
    "terpene",
    "hardware",
    "packaging",
    "flower",
    "other",
  ],
  cannabis_dispensary: [
    "distillate",
    "concentrate",
    "terpene",
    "hardware",
    "packaging",
    "flower",
    "other",
  ],
  food_beverage: [
    "ingredient",
    "flavouring",
    "packaging",
    "equipment",
    "other",
  ],
  general_retail: ["raw_material", "packaging", "equipment", "other"],
  mixed_retail: [
    "distillate",
    "concentrate",
    "terpene",
    "ingredient",
    "hardware",
    "packaging",
    "equipment",
    "other",
  ],
};

const FORMAT_CATEGORIES = [
  "Vape",
  "Edible",
  "Beverage",
  "Food",
  "Apparel",
  "Service",
  "Other",
];
const YIELD_UNITS = ["pcs", "L", "kg", "g", "ml"];

// ─── FORMAT CREATOR PANEL ────────────────────────────────────────────────────

function FormatCreatorPanel({ productFormats, industryProfile, onRefresh }) {
  // RULE 0G: useTenant() called inside this sub-component
  const { tenantId } = useTenant();
  const isCannabis = [
    "cannabis_retail",
    "cannabis_dispensary",
    "mixed_retail",
  ].includes(industryProfile);

  const emptyForm = {
    name: "",
    format_key: "",
    category: "Other",
    is_cannabis: false,
    is_vape: false,
    chambers: 1,
    distillate_ml: 0,
    terpene_pct: 10,
    yield_unit: "pcs",
    shelf_life_days: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const autoKey = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);

  const set = (k, v) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "name" && !f._keyEdited) next.format_key = autoKey(v);
      return next;
    });

  const handleKeyEdit = (v) =>
    setForm((f) => ({ ...f, format_key: v, _keyEdited: true }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMsg({ type: "error", text: "Format name is required." });
      return;
    }
    if (!form.format_key.trim()) {
      setMsg({ type: "error", text: "Format key is required." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        name: form.name.trim(),
        format_key: form.format_key.trim(),
        category: form.category,
        is_cannabis: form.is_cannabis,
        is_vape: form.is_vape,
        chambers: form.is_vape ? Number(form.chambers) : 1,
        distillate_ml: form.is_vape ? Number(form.distillate_ml) : 0,
        terpene_pct: form.is_vape ? Number(form.terpene_pct) : 0,
        yield_unit: form.yield_unit,
        shelf_life_days:
          form.shelf_life_days !== "" ? Number(form.shelf_life_days) : null,
        is_active: true,
        sort_order: productFormats.length + 1,
        tenant_id: tenantId || HQ_TENANT_ID_PROD, // RULE 0F
      };
      const { error } = await supabase.from("product_formats").insert(payload);
      if (error) throw error;
      setMsg({ type: "success", text: `Format "${form.name}" created.` });
      setForm(emptyForm);
      onRefresh();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const sInput = {
    width: "100%",
    padding: "7px 10px",
    fontSize: "12px",
    fontFamily: T.font,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius.sm,
    color: T.ink700,
    background: T.surface,
    boxSizing: "border-box",
  };
  const sLabel = {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: T.ink500,
    marginBottom: "4px",
    display: "block",
  };
  const sField = { marginBottom: "14px" };
  const sBadge = {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderRadius: "2px",
    padding: "1px 6px",
  };
  const sToggle = (on) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: on ? T.accent : T.ink500,
    cursor: "pointer",
    fontFamily: T.font,
  });

  return (
    <div style={{ maxWidth: "860px" }}>
      <p style={{ fontSize: "12px", color: T.ink500, marginBottom: "20px" }}>
        Create new product formats without Supabase dashboard access. New
        formats appear immediately in the Production Run selector.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* ── Create form ── */}
        <div style={{ ...sCard, padding: "18px 20px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: T.ink700,
              marginBottom: "16px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            New Format
          </div>

          <div style={sField}>
            <label style={sLabel}>Format Name</label>
            <input
              style={sInput}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Bob's Lemonade 500ml"
            />
          </div>

          <div style={sField}>
            <label style={sLabel}>
              Format Key{" "}
              <span style={{ color: T.ink300, fontWeight: 400 }}>
                (auto-generated, editable)
              </span>
            </label>
            <input
              style={sInput}
              value={form.format_key}
              onChange={(e) => handleKeyEdit(e.target.value)}
              placeholder="e.g. bobs-lem-500"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div style={sField}>
              <label style={sLabel}>Category</label>
              <select
                style={sInput}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {FORMAT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={sField}>
              <label style={sLabel}>Yield Unit</label>
              <select
                style={sInput}
                value={form.yield_unit}
                onChange={(e) => set("yield_unit", e.target.value)}
              >
                {YIELD_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {isCannabis && (
            <div style={{ display: "flex", gap: "20px", marginBottom: "14px" }}>
              <label style={sToggle(form.is_cannabis)}>
                <input
                  type="checkbox"
                  checked={form.is_cannabis}
                  onChange={(e) => set("is_cannabis", e.target.checked)}
                />
                Is Cannabis
              </label>
              <label style={sToggle(form.is_vape)}>
                <input
                  type="checkbox"
                  checked={form.is_vape}
                  onChange={(e) => set("is_vape", e.target.checked)}
                />
                Is Vape
              </label>
            </div>
          )}

          {form.is_vape && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
              }}
            >
              <div style={sField}>
                <label style={sLabel}>Chambers</label>
                <input
                  style={sInput}
                  type="number"
                  min="1"
                  max="4"
                  value={form.chambers}
                  onChange={(e) => set("chambers", e.target.value)}
                />
              </div>
              <div style={sField}>
                <label style={sLabel}>Distillate ml/unit</label>
                <input
                  style={sInput}
                  type="number"
                  step="0.1"
                  value={form.distillate_ml}
                  onChange={(e) => set("distillate_ml", e.target.value)}
                />
              </div>
              <div style={sField}>
                <label style={sLabel}>Terpene %</label>
                <input
                  style={sInput}
                  type="number"
                  step="1"
                  value={form.terpene_pct}
                  onChange={(e) => set("terpene_pct", e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={sField}>
            <label style={sLabel}>
              Shelf Life (days){" "}
              <span style={{ color: T.ink300, fontWeight: 400 }}>
                — optional
              </span>
            </label>
            <input
              style={sInput}
              type="number"
              value={form.shelf_life_days}
              onChange={(e) => set("shelf_life_days", e.target.value)}
              placeholder="Leave blank if not applicable"
            />
          </div>

          {msg && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: T.radius.sm,
                fontSize: "12px",
                marginBottom: "12px",
                background: msg.type === "error" ? T.dangerLight : T.successLight,
                border: `1px solid ${msg.type === "error" ? T.dangerBd : T.successBd}`,
                color: msg.type === "error" ? T.danger : T.success,
              }}
            >
              {msg.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...sBtn("accent"),
              width: "100%",
              justifyContent: "center",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Format"}
          </button>
        </div>

        {/* ── Existing formats list ── */}
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.ink300,
              marginBottom: "10px",
            }}
          >
            {productFormats.length} Existing Format
            {productFormats.length !== 1 ? "s" : ""}
          </div>
          {productFormats.length === 0 ? (
            <p style={{ fontSize: "12px", color: T.ink300 }}>
              No formats in database yet.
            </p>
          ) : (
            productFormats.map((f) => (
              <div
                key={f.id}
                style={{ ...sCard, marginBottom: "6px", padding: "10px 14px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: T.ink700,
                      }}
                    >
                      {f.name}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: T.ink300,
                        fontFamily: T.fontMono,
                        marginLeft: "8px",
                      }}
                    >
                      {f.format_key}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}
                  >
                    {f.is_cannabis && (
                      <span
                        style={{
                          ...sBadge,
                          background: T.accentLight,
                          color: T.accentMid,
                          border: `1px solid ${T.accentBd}`,
                        }}
                      >
                        cannabis
                      </span>
                    )}
                    {f.is_vape && (
                      <span
                        style={{
                          ...sBadge,
                          background: T.infoLight,
                          color: T.info,
                          border: `1px solid ${T.infoBd}`,
                        }}
                      >
                        vape
                      </span>
                    )}
                    {f.chambers > 1 && (
                      <span
                        style={{
                          ...sBadge,
                          background: T.bg,
                          color: T.ink500,
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        {f.chambers}ch
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: T.ink500,
                    marginTop: "4px",
                  }}
                >
                  {f.category} · yield: {f.yield_unit}
                  {f.distillate_ml > 0 && ` · ${f.distillate_ml}ml distillate`}
                  {f.shelf_life_days && ` · ${f.shelf_life_days}d shelf life`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BOM EDITOR PANEL ────────────────────────────────────────────────────────

function BOMEditorPanel({
  productFormats,
  formatBom,
  items,
  industryProfile,
  onRefresh,
}) {
  // RULE 0G: useTenant() called inside this sub-component
  const { tenantId } = useTenant();

  const [selectedFormatId, setSelectedFormatId] = useState(
    productFormats[0]?.id || "",
  );
  useEffect(() => {
    if (productFormats.length > 0) {
      const firstFood = productFormats.find(
        (f) => !f.is_cannabis && !f.is_vape,
      );
      const firstAny = productFormats[0]?.id;
      const target =
        industryProfile === "food_beverage"
          ? firstFood?.id || firstAny
          : firstAny;
      if (target) setSelectedFormatId(target);
    }
  }, [productFormats.length, industryProfile]); // eslint-disable-line
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const matTypes =
    BOM_MATERIAL_TYPES[industryProfile] || BOM_MATERIAL_TYPES.general_retail;
  const isFoodBev = industryProfile === "food_beverage";
  const matLabel = isFoodBev ? "Ingredient" : "Material";

  const emptyLine = {
    material_type: matTypes[0],
    inventory_item_id: "",
    quantity_per_unit: "",
    unit: "ml",
    notes: "",
  };
  const [lineForm, setLineForm] = useState(emptyLine);

  const selectedFormat = productFormats.find((f) => f.id === selectedFormatId);
  const bomForFormat = formatBom.filter(
    (b) => b.format_id === selectedFormatId,
  );

  // Items filtered by selected material_type
  const CAT_MAP = {
    distillate: ["raw_material", "concentrate"],
    concentrate: ["raw_material", "concentrate"],
    terpene: ["terpene"],
    hardware: ["hardware"],
    packaging: ["packaging"],
    flower: ["flower"],
    ingredient: ["raw_material"],
    flavouring: ["terpene"],
    equipment: ["equipment"],
    raw_material: ["raw_material"],
    other: [
      "raw_material",
      "concentrate",
      "terpene",
      "hardware",
      "packaging",
      "equipment",
      "finished_product",
      "accessory",
      "other",
    ],
  };
  // WP-PROD-MASTER Session C: FEFO — First Expiry First Out sort
  const filteredItems = items
    .filter((i) => {
      const cats = CAT_MAP[lineForm.material_type] || [];
      return cats.includes(i.category);
    })
    .sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date) - new Date(b.expiry_date);
    });

  const setLine = (k, v) => setLineForm((f) => ({ ...f, [k]: v }));

  const handleAddLine = async () => {
    if (!lineForm.inventory_item_id) {
      setMsg({ type: "error", text: "Select an inventory item." });
      return;
    }
    if (!lineForm.quantity_per_unit || isNaN(lineForm.quantity_per_unit)) {
      setMsg({ type: "error", text: "Enter a valid quantity." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        format_id: selectedFormatId,
        inventory_item_id: lineForm.inventory_item_id,
        material_type: lineForm.material_type,
        quantity_per_unit: Number(lineForm.quantity_per_unit),
        unit: lineForm.unit,
        notes: lineForm.notes || null,
        sort_order: bomForFormat.length + 1,
        tenant_id: tenantId || HQ_TENANT_ID_PROD, // RULE 0F
      };
      const { error } = await supabase
        .from("product_format_bom")
        .insert(payload);
      if (error) throw error;
      setMsg({ type: "success", text: `${matLabel} line added.` });
      setLineForm(emptyLine);
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bomId) => {
    if (!window.confirm("Remove this BOM line?")) return;
    setDeleting(bomId);
    try {
      const { error } = await supabase
        .from("product_format_bom")
        .delete()
        .eq("id", bomId);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const sInput = {
    width: "100%",
    padding: "7px 10px",
    fontSize: "12px",
    fontFamily: T.font,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius.sm,
    color: T.ink700,
    background: T.surface,
    boxSizing: "border-box",
  };
  const sLabelSm = {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: T.ink500,
    marginBottom: "4px",
    display: "block",
  };

  return (
    <div style={{ maxWidth: "860px" }}>
      <p style={{ fontSize: "12px", color: T.ink500, marginBottom: "20px" }}>
        Define the materials consumed per finished unit for each product format.
        Used by Production Run to calculate stock deductions and validate
        available stock.
      </p>

      {/* Format selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <label
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: T.ink500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          BOM for:
        </label>
        <select
          value={selectedFormatId}
          onChange={(e) => {
            setSelectedFormatId(e.target.value);
            setShowAdd(false);
            setMsg(null);
          }}
          style={{ ...sInput, width: "280px" }}
        >
          {productFormats.length === 0 && (
            <option value="">No formats yet — create one in Formats tab</option>
          )}
          {productFormats.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label || f.name || f.key}
            </option>
          ))}
        </select>
        {selectedFormat && (
          <span style={{ fontSize: "11px", color: T.ink300 }}>
            {selectedFormat.is_vape
              ? `Vape · ${selectedFormat.chambers} chamber${selectedFormat.chambers > 1 ? "s" : ""}`
              : selectedFormat.category}
          </span>
        )}
      </div>

      {/* BOM lines */}
      {!selectedFormatId ? null : (
        <>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 80px 80px 1fr 60px",
              gap: "8px",
              padding: "6px 10px",
              background: T.bg,
              borderRadius: "3px 3px 0 0",
              border: `1px solid ${T.border}`,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.ink500,
            }}
          >
            <span>{matLabel} Type</span>
            <span>Item</span>
            <span>Qty/Unit</span>
            <span>Unit</span>
            <span>Notes</span>
            <span></span>
          </div>

          {bomForFormat.length === 0 && (
            <div
              style={{
                padding: "16px 10px",
                border: `1px solid ${T.border}`,
                borderTop: "none",
                fontSize: "12px",
                color: T.ink300,
                textAlign: "center",
              }}
            >
              No BOM lines yet for this format. Add one below.
            </div>
          )}

          {bomForFormat.map((b, idx) => (
            <div
              key={b.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 80px 80px 1fr 60px",
                gap: "8px",
                padding: "8px 10px",
                background: idx % 2 === 0 ? "#fff" : T.surface,
                border: `1px solid ${T.border}`,
                borderTop: "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: T.ink600,
                  textTransform: "capitalize",
                }}
              >
                {(b.material_type || "").replace(/_/g, " ")}
              </span>
              <span style={{ fontSize: "11px", color: T.ink700 }}>
                {b.inventory_items?.name || "—"}
                {b.inventory_items?.quantity_on_hand != null && (
                  <span style={{ color: T.ink300, marginLeft: "6px" }}>
                    ({b.inventory_items.quantity_on_hand}{" "}
                    {b.inventory_items.unit} avail)
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: T.fontMono,
                  color: T.ink700,
                }}
              >
                {b.quantity_per_unit}
              </span>
              <span style={{ fontSize: "11px", color: T.ink500 }}>
                {b.unit}
              </span>
              <span style={{ fontSize: "11px", color: T.ink300 }}>
                {b.notes || "—"}
              </span>
              <button
                onClick={() => handleDelete(b.id)}
                disabled={deleting === b.id}
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  border: `1px solid ${T.dangerBd}`,
                  borderRadius: "2px",
                  background: T.dangerLight,
                  color: T.danger,
                  cursor: "pointer",
                  opacity: deleting === b.id ? 0.5 : 1,
                }}
              >
                {deleting === b.id ? "..." : "Remove"}
              </button>
            </div>
          ))}

          {/* Add line */}
          {!showAdd ? (
            <div
              style={{
                padding: "10px",
                border: `1px solid ${T.border}`,
                borderTop: "none",
                borderRadius: "0 0 3px 3px",
              }}
            >
              <button
                onClick={() => setShowAdd(true)}
                style={{ ...sBtn("default"), fontSize: "11px" }}
              >
                + Add {matLabel} Line
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: "14px",
                border: `1px solid ${T.border}`,
                borderTop: "none",
                borderRadius: "0 0 3px 3px",
                background: T.surface,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <label style={sLabelSm}>{matLabel} Type</label>
                  <select
                    style={sInput}
                    value={lineForm.material_type}
                    onChange={(e) => {
                      setLine("material_type", e.target.value);
                      setLine("inventory_item_id", "");
                    }}
                  >
                    {matTypes.map((m) => (
                      <option key={m} value={m}>
                        {m.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={sLabelSm}>Inventory Item</label>
                  <select
                    style={sInput}
                    value={lineForm.inventory_item_id}
                    onChange={(e) =>
                      setLine("inventory_item_id", e.target.value)
                    }
                  >
                    <option value="">— select item —</option>
                    {filteredItems.map((i) => {
                      const daysToExpiry = i.expiry_date
                        ? Math.ceil(
                            (new Date(i.expiry_date) - Date.now()) / 86400000,
                          )
                        : null;
                      const fefoTag =
                        daysToExpiry !== null && daysToExpiry <= 60
                          ? ` [exp ${daysToExpiry}d]`
                          : "";
                      return (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.quantity_on_hand} {i.unit}){fefoTag}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label style={sLabelSm}>Qty per finished unit</label>
                  <input
                    style={sInput}
                    type="number"
                    step="0.01"
                    value={lineForm.quantity_per_unit}
                    onChange={(e) =>
                      setLine("quantity_per_unit", e.target.value)
                    }
                    placeholder="e.g. 1.0"
                  />
                </div>
                <div>
                  <label style={sLabelSm}>Unit</label>
                  <select
                    style={sInput}
                    value={lineForm.unit}
                    onChange={(e) => setLine("unit", e.target.value)}
                  >
                    {["ml", "g", "pcs", "kg", "L"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={sLabelSm}>Notes (optional)</label>
                <input
                  style={sInput}
                  value={lineForm.notes}
                  onChange={(e) => setLine("notes", e.target.value)}
                  placeholder="e.g. Chamber 1 only"
                />
              </div>
              {msg && (
                <div
                  style={{
                    padding: "7px 10px",
                    borderRadius: T.radius.sm,
                    fontSize: "12px",
                    marginBottom: "10px",
                    background: msg.type === "error" ? T.dangerLight : T.successLight,
                    border: `1px solid ${msg.type === "error" ? T.dangerBd : T.successBd}`,
                    color: msg.type === "error" ? T.danger : T.success,
                  }}
                >
                  {msg.text}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleAddLine}
                  disabled={saving}
                  style={{ ...sBtn("accent"), opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Adding..." : `Add ${matLabel} Line`}
                </button>
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setMsg(null);
                    setLineForm(emptyLine);
                  }}
                  style={sBtn("default")}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── END WP-BIB Session 2 INSERT ─────────────────────────────────────────────

export default function HQProduction() {
  const [subTab, setSubTab] = useState("overview");
  const ctx = usePageContext("hq-production", null);
  const { tenantId, tenantConfig, industryProfile } = useTenant();
  const [items, setItems] = useState([]);
  const [runs, setRuns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [partners, setPartners] = useState([]);
  const [productFormats, setProductFormats] = useState([]);
  const [productStrains, setProductStrains] = useState([]);
  const [formatBom, setFormatBom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // WP-R: resolve HQ tenant for batch filtering
      let hqTenantId = null;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();
          hqTenantId = profile?.tenant_id || null;
        }
      } catch (_) {}

      const batchQuery = supabase
        .from("batches")
        .select(
          "id,batch_number,product_name,product_type,strain,volume,status,lifecycle_status,inventory_item_id,low_stock_threshold,production_date,expiry_date,units_produced,thc_content,cbd_content,lab_certified,is_archived,tenant_id,cannabinoid_profile,section_21_number",
        )
        .eq("tenant_id", tenantId)
        .eq("is_archived", false)
        .order("production_date", { ascending: false })
        .limit(200);

      const [itemsR, runsR, partnersR, formatsR, strainsR, bomR] =
        await Promise.all([
          supabase
            .from("inventory_items")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("production_runs")
            .select(
              `id,batch_id,run_number,status,planned_units,actual_units,started_at,completed_at,notes,created_at,recipe_name,recipe_version,batch_lot_number,expiry_date,temperature_zone,yield_pct,qc_passed,allergen_flags,fsca_cert_number,haccp_ref,storage_instructions,industry_profile_snapshot,batches(batch_number,product_name,strain,product_type,volume),production_run_inputs(id,run_id,item_id,quantity_planned,quantity_actual,notes,inventory_items(name,sku,unit,category))`,
            )
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("wholesale_partners")
            .select("id,business_name,contact_name")
            .order("business_name"),
          supabase
            .from("product_formats")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("product_strains")
            .select("*")
            .eq("is_active", true)
            .order("name", { ascending: true }),
          supabase
            .from("product_format_bom")
            .select(
              "id,format_id,inventory_item_id,material_type,quantity_per_unit,unit,notes,sort_order,inventory_items(id,name,sku,unit,quantity_on_hand,cost_price,weighted_avg_cost,category)",
            )
            .order("sort_order", { ascending: true }),
        ]);
      const batchesR = await batchQuery;
      if (itemsR.error) throw itemsR.error;
      if (runsR.error) throw runsR.error;
      if (batchesR.error) throw batchesR.error;
      setItems(itemsR.data || []);
      setRuns(runsR.data || []);
      setBatches(batchesR.data || []);
      setPartners(partnersR.data || []);
      setProductFormats(formatsR.data || []);
      setProductStrains(strainsR.data || []);
      setFormatBom(bomR.data || []);
    } catch (err) {
      console.error("[HQProduction] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // WP-PROD-MASTER Session D: profile-adaptive tab labels + BOM hidden for general_retail
  const isFoodBevMain = industryProfile === "food_beverage";
  const isGeneralRetailMain = industryProfile === "general_retail";
  const isMixedRetailMain = industryProfile === "mixed_retail";
  const SUB_TABS = [
    { id: "overview", label: "Overview" },
    {
      id: "batches",
      label: isFoodBevMain
        ? "Recipe Runs"
        : isGeneralRetailMain
          ? "Receive History"
          : "Batches",
    },
    {
      id: "new-run",
      label: isFoodBevMain
        ? "Start Recipe Run"
        : isGeneralRetailMain
          ? "Receive Stock"
          : "New Production Run",
    },
    { id: "history", label: "History" },
    { id: "allocate", label: "Allocate Stock" },
    { id: "formats", label: "Formats" },
    ...(!isGeneralRetailMain ? [{ id: "bom", label: "BOM Editor" }] : []),
    { id: "audit", label: "Audit Export" },
  ];

  const finishedItems = items.filter((i) => i.category === "finished_product");
  const depleted = finishedItems.filter(
    (i) => parseFloat(i.quantity_on_hand || 0) <= 0,
  );
  const lowStock = finishedItems.filter((i) => {
    const qty = parseFloat(i.quantity_on_hand || 0);
    const batch = batches.find((b) => b.inventory_item_id === i.id);
    const threshold = batch?.low_stock_threshold || 10;
    return qty > 0 && qty <= threshold;
  });

  if (error)
    return (
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.dangerBd}`,
          borderLeft: `3px solid ${T.danger}`,
          margin: "20px 0",
        }}
      >
        <div style={sLabel}>Error</div>
        <p style={{ fontSize: "13px", color: T.danger, margin: "8px 0 0" }}>
          {error}
        </p>
        <button onClick={fetchAll} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );

  return (
    <div style={{ fontFamily: T.font }}>
      {/* ── Action Centre — stock alerts + workflow warnings (collapsible, session-dismissible) ── */}
      {/* WorkflowGuide hidden on this tab (Option A): ctx.warnings now flow into ActionCentre below */}
      {!loading &&
        (depleted.length > 0 ||
          lowStock.length > 0 ||
          (ctx && !ctx.loading && (ctx.warnings?.length ?? 0) > 0)) && (
          <ActionCentre
            title="Action Centre"
            alerts={[
              ...depleted.map((i) => ({
                severity: "critical",
                message: `${i.name} — out of stock · shop hidden`,
                action: {
                  label: isFoodBevMain
                    ? "Start Recipe Run"
                    : isGeneralRetailMain
                      ? "Receive Stock"
                      : "New Production Run",
                  onClick: () => setSubTab("new-run"),
                },
              })),
              ...lowStock.map((i) => ({
                severity: "warn",
                message: `${i.name} — ${Math.floor(parseFloat(i.quantity_on_hand || 0))} left (running low)`,
                action: {
                  label: isFoodBevMain
                    ? "Start Recipe Run"
                    : isGeneralRetailMain
                      ? "Receive Stock"
                      : "Plan Production",
                  onClick: () => setSubTab("new-run"),
                },
              })),
              // usePageContext("hq-production") warnings — zero-price / COA / expiry / no-run
              ...(ctx && !ctx.loading
                ? (ctx.warnings || []).map((w) => ({
                    severity: "warn",
                    message: String(w).replace(/^⚠\s*/, ""),
                  }))
                : []),
            ]}
          />
        )}

      <HowItWorksBanner />

      {/* Sub-tabs — standard underline style */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${T.border}`,
          marginBottom: "24px",
          flexWrap: "nowrap",
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom:
                subTab === t.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              fontFamily: T.font,
              fontSize: "11px",
              fontWeight: subTab === t.id ? 700 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: subTab === t.id ? T.accent : T.ink500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginBottom: "-1px",
              position: "relative",
            }}
          >
            {t.label}
            {t.id === "batches" && batches.length > 0 && (
              <span
                style={{
                  marginLeft: "6px",
                  background: T.accent,
                  color: "#fff",
                  borderRadius: T.radius.md,
                  fontSize: "11px",
                  padding: "1px 6px",
                  fontWeight: 700,
                }}
              >
                {batches.length}
              </span>
            )}
            {t.id === "batches" && depleted.length > 0 && (
              <span
                style={{
                  marginLeft: "4px",
                  background: T.danger,
                  color: "#fff",
                  borderRadius: T.radius.md,
                  fontSize: "11px",
                  padding: "1px 6px",
                  fontWeight: 700,
                }}
              >
                !
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: T.ink500 }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: `2px solid ${T.border}`,
              borderTopColor: T.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Loading production data...
        </div>
      ) : (
        <>
          {subTab === "overview" && (
            <OverviewPanel
              items={items}
              runs={runs}
              batches={batches}
              depleted={depleted}
              lowStock={lowStock}
              onNavBatches={() => setSubTab("batches")}
              onNavNewRun={() => setSubTab("new-run")}
              industryProfile={industryProfile}
            />
          )}
          {subTab === "batches" && (
            <BatchesPanel
              batches={batches}
              runs={runs}
              items={items}
              productFormats={productFormats}
              tenantConfig={tenantConfig}
              industryProfile={industryProfile}
              onNavNewRun={() => setSubTab("new-run")}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "new-run" && (
            <NewRunPanel
              items={items}
              productFormats={productFormats}
              productStrains={productStrains}
              formatBom={formatBom}
              industryProfile={industryProfile}
              onComplete={() => {
                fetchAll();
                setSubTab("history");
              }}
            />
          )}
          {subTab === "history" && (
            <HistoryPanel
              runs={runs}
              onRefresh={fetchAll}
              industryProfile={industryProfile}
            />
          )}
          {subTab === "allocate" && (
            <AllocatePanel
              items={items}
              partners={partners}
              batches={batches}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "formats" && (
            <FormatCreatorPanel
              productFormats={productFormats}
              industryProfile={industryProfile}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "bom" && (
            <BOMEditorPanel
              productFormats={productFormats}
              formatBom={formatBom}
              items={items}
              industryProfile={industryProfile}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "audit" && <AuditPanel batches={batches} />}
        </>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewPanel({
  items,
  runs,
  batches,
  depleted,
  lowStock,
  onNavBatches,
  onNavNewRun,
  industryProfile,
}) {
  const distillate = items.filter(
    (i) => i.category === "raw_material" && i.unit === "ml",
  );
  const terpenes = items.filter((i) => i.category === "terpene");
  const hardware = items.filter((i) => i.category === "hardware");
  const finished = items.filter((i) => i.category === "finished_product");
  const totalDist = distillate.reduce(
    (s, i) => s + parseFloat(i.quantity_on_hand || 0),
    0,
  );
  const totalTerp = terpenes.reduce(
    (s, i) => s + parseFloat(i.quantity_on_hand || 0),
    0,
  );
  const totalHw = hardware.reduce(
    (s, i) => s + parseFloat(i.quantity_on_hand || 0),
    0,
  );
  const totalFin = finished.reduce(
    (s, i) => s + parseFloat(i.quantity_on_hand || 0),
    0,
  );
  const cap1ml = Math.floor(totalDist / 1.0);
  const activeBatches = batches.filter((b) => b.status === "active");
  const now = new Date();
  const monthRuns = runs.filter((r) => {
    const d = new Date(r.created_at);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const monthUnits = monthRuns.reduce(
    (s, r) => s + (r.actual_units || r.planned_units || 0),
    0,
  );
  const yieldsArr = runs
    .filter((r) => r.actual_units && r.planned_units)
    .map((r) => calcYield(r.actual_units, r.planned_units))
    .filter((y) => y !== null);
  const avgYield =
    yieldsArr.length > 0
      ? (yieldsArr.reduce((s, y) => s + y, 0) / yieldsArr.length).toFixed(1)
      : null;

  const cannabisMetrics = [
    {
      label: "Active Batches",
      value: activeBatches.length,
      sub: `${batches.length} total`,
      semantic: "success",
      click: onNavBatches,
    },
    {
      label: "Distillate",
      value: `${totalDist.toFixed(1)}ml`,
      sub: `${distillate.length} SKU`,
      semantic: "info",
    },
    {
      label: "Terpenes",
      value: `${totalTerp.toFixed(2)}ml`,
      sub: `${terpenes.length} strains`,
      semantic: "info",
    },
    {
      label: "Hardware",
      value: totalHw.toLocaleString(),
      sub: `${hardware.length} types`,
      semantic: null,
    },
    {
      label: "Finished Stock",
      value: totalFin.toLocaleString(),
      sub: "units ready",
      semantic: depleted.length > 0 ? "danger" : "success",
    },
    {
      label: "1ml Capacity",
      value: cap1ml.toLocaleString(),
      sub: "carts possible",
      semantic: "success",
    },
    {
      label: "Runs (Month)",
      value: monthRuns.length,
      sub: `${monthUnits} units`,
      semantic: "info",
    },
    {
      label: "Avg Yield",
      value: avgYield ? `${avgYield}%` : "\u2014",
      sub: "all runs",
      semantic: avgYield && parseFloat(avgYield) >= 95 ? "success" : "warning",
    },
  ];
  // WP-PROD-MASTER Session D: profile-adaptive overview KPIs (D7)
  const todayOv = new Date().toISOString().split("T")[0];
  const in7Ov = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const expiring7d = batches.filter(
    (b) =>
      !b.is_archived &&
      b.expiry_date &&
      b.expiry_date >= todayOv &&
      b.expiry_date <= in7Ov,
  ).length;
  const qcAssessed = runs.filter(
    (r) => r.qc_passed !== null && r.qc_passed !== undefined,
  );
  const qcPassRate =
    qcAssessed.length > 0
      ? (
          (qcAssessed.filter((r) => r.qc_passed === true).length /
            qcAssessed.length) *
          100
        ).toFixed(0)
      : null;
  const costRuns = runs.filter(
    (r) => r.cost_per_unit && parseFloat(r.cost_per_unit) > 0,
  );
  const avgCostPerUnit =
    costRuns.length > 0
      ? (
          costRuns.reduce((s, r) => s + parseFloat(r.cost_per_unit), 0) /
          costRuns.length
        ).toFixed(2)
      : null;
  const foodOverviewMetrics = [
    {
      label: "Recipe Runs MTD",
      value: monthRuns.length,
      sub: `${monthUnits} units`,
      semantic: "info",
      click: onNavBatches,
    },
    {
      label: "Active Batches",
      value: activeBatches.length,
      sub: `${batches.length} total`,
      semantic: "success",
    },
    {
      label: "QC Pass Rate",
      value: qcPassRate !== null ? `${qcPassRate}%` : "\u2014",
      sub: `${qcAssessed.length} assessed`,
      semantic:
        qcPassRate === null
          ? null
          : parseFloat(qcPassRate) >= 98
            ? "success"
            : parseFloat(qcPassRate) >= 90
              ? "warning"
              : "danger",
    },
    {
      label: "Expiring 7d",
      value: expiring7d,
      sub: "batches",
      semantic: expiring7d > 0 ? "danger" : "success",
    },
    {
      label: "Avg Cost/Unit",
      value: avgCostPerUnit !== null ? `R${avgCostPerUnit}` : "\u2014",
      sub: "confirmed runs",
      semantic: null,
    },
    {
      label: "Avg Yield",
      value: avgYield ? `${avgYield}%` : "\u2014",
      sub: "all runs",
      semantic: avgYield && parseFloat(avgYield) >= 95 ? "success" : "warning",
    },
    {
      label: "Finished Stock",
      value: totalFin.toLocaleString(),
      sub: "units ready",
      semantic: depleted.length > 0 ? "danger" : "success",
    },
  ];
  const generalOverviewMetrics = [
    {
      label: "Receives MTD",
      value: monthRuns.length,
      sub: `${monthUnits} units`,
      semantic: "info",
      click: onNavBatches,
    },
    {
      label: "Active Products",
      value: activeBatches.length,
      sub: `${batches.length} total`,
      semantic: "success",
    },
    {
      label: "Finished Stock",
      value: totalFin.toLocaleString(),
      sub: "units ready",
      semantic: depleted.length > 0 ? "danger" : "success",
    },
    {
      label: "Expiring 7d",
      value: expiring7d,
      sub: "items",
      semantic: expiring7d > 0 ? "danger" : "success",
    },
    {
      label: "Avg Yield",
      value: avgYield ? `${avgYield}%` : "\u2014",
      sub: "all runs",
      semantic: avgYield && parseFloat(avgYield) >= 95 ? "success" : "warning",
    },
  ];
  const metrics =
    industryProfile === "food_beverage"
      ? foodOverviewMetrics
      : industryProfile === "general_retail"
        ? generalOverviewMetrics
        : [
            {
              label: "Active Batches",
              value: activeBatches.length,
              sub: `${batches.length} total`,
              semantic: "success",
              click: onNavBatches,
            },
            {
              label: "Distillate",
              value: `${totalDist.toFixed(1)}ml`,
              sub: `${distillate.length} SKU`,
              semantic: "info",
            },
            {
              label: "Terpenes",
              value: `${totalTerp.toFixed(2)}ml`,
              sub: `${terpenes.length} strains`,
              semantic: "info",
            },
            {
              label: "Hardware",
              value: totalHw.toLocaleString(),
              sub: `${hardware.length} types`,
              semantic: null,
            },
            {
              label: "Finished Stock",
              value: totalFin.toLocaleString(),
              sub: "units ready",
              semantic: depleted.length > 0 ? "danger" : "success",
            },
            {
              label: "1ml Capacity",
              value: cap1ml.toLocaleString(),
              sub: "carts possible",
              semantic: "success",
            },
            {
              label: "Runs (Month)",
              value: monthRuns.length,
              sub: `${monthUnits} units`,
              semantic: "info",
            },
            {
              label: "Avg Yield",
              value: avgYield ? `${avgYield}%` : "—",
              sub: "all runs",
              semantic:
                avgYield && parseFloat(avgYield) >= 95 ? "success" : "warning",
            },
          ];
  const semC = {
    success: T.success,
    warning: T.warning,
    danger: T.danger,
    info: T.info,
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Pipeline strip */}
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.accentBd}`,
          background: T.accentLight,
        }}
      >
        <div style={{ ...sLabel, marginBottom: 10 }}>
          {industryProfile === "food_beverage"
            ? "Recipe Production Pipeline"
            : industryProfile === "general_retail"
              ? "Stock Receiving Flow"
              : "Production Pipeline"}
        </div>
        <div
          style={{
            display: "flex",
            gap: 0,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {[
            {
              step: "1",
              label: "Supply Chain",
              desc: "Receive raw materials via PO",
              color: T.info,
            },
            { step: "→", label: "", desc: "", color: T.ink300 },
            {
              step: "2",
              label:
                industryProfile === "food_beverage"
                  ? "Start Recipe Run"
                  : industryProfile === "general_retail"
                    ? "Receive Stock"
                    : "New Production Run",
              desc:
                industryProfile === "food_beverage"
                  ? "Select recipe + ingredients — confirm run"
                  : industryProfile === "general_retail"
                    ? "Log received goods against PO or supplier"
                    : "Select batch + materials — confirm",
              color: T.accentMid,
            },
            { step: "→", label: "", desc: "", color: T.ink300 },
            {
              step: "3",
              label: "Set Sell Price",
              desc: "HQ → Pricing → set sell_price > R0",
              color: "#b5935a",
            },
            { step: "→", label: "", desc: "", color: T.ink300 },
            {
              step: "4",
              label: "Live in Shop",
              desc: "Auto-appears when qty > 0 + price set",
              color: T.success,
            },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              {s.step === "→" ? (
                <div style={{ fontSize: 18, color: T.ink300, margin: "0 8px" }}>
                  →
                </div>
              ) : (
                <div
                  style={{
                    padding: "8px 14px",
                    background: T.surface,
                    border: `1px solid ${s.color}30`,
                    borderRadius: T.radius.md,
                    borderLeft: `3px solid ${s.color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: s.color,
                      fontFamily: T.font,
                      fontWeight: 700,
                    }}
                  >
                    Step {s.step}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: T.font,
                      fontWeight: 600,
                      color: T.ink900,
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    {s.desc}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Metric grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
          gap: "1px",
          background: T.border,
          borderRadius: T.radius.md,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow.sm,
        }}
      >
        {metrics.map((c) => (
          <div
            key={c.label}
            onClick={c.click || undefined}
            style={{
              background: T.surface,
              padding: "16px 18px",
              cursor: c.click ? "pointer" : "default",
            }}
            onMouseEnter={(e) => {
              if (c.click)
                e.currentTarget.style.boxShadow =
                  "inset 0 0 0 1px " + T.accentBd;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink500,
                marginBottom: "6px",
                fontFamily: T.font,
                fontWeight: 700,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: "24px",
                fontWeight: 400,
                color: c.semantic ? semC[c.semantic] : T.ink900,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {c.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: T.ink500,
                marginTop: "2px",
                fontFamily: T.font,
              }}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── CHARTS: Batch yield history + Monthly output ── */}
      {runs.length > 0 &&
        (() => {
          const yieldData = runs
            .filter((r) => r.actual_units && r.planned_units)
            .slice(0, 10)
            .reverse()
            .map((r) => ({
              run: (r.run_number || r.id?.slice(0, 6) || "").slice(-8),
              yield: calcYield(r.actual_units, r.planned_units),
              actual: r.actual_units,
            }));

          const monthlyMap = {};
          runs.forEach((r) => {
            const d = new Date(r.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("en-ZA", {
              month: "short",
              year: "2-digit",
            });
            if (!monthlyMap[key]) monthlyMap[key] = { month: label, units: 0 };
            monthlyMap[key].units += r.actual_units || r.planned_units || 0;
          });
          const monthlyData = Object.values(monthlyMap).slice(-6);

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 16,
              }}
            >
              <ChartCard
                title="Batch Yield History"
                subtitle="Last 10 runs · dots turn amber below 95%"
                accent="green"
                height={220}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={yieldData}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.border}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="run"
                      tick={{ fill: T.ink500, fontSize: 9, fontFamily: T.font }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      domain={[80, 100]}
                      tick={{
                        fill: T.ink500,
                        fontSize: 11,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${v}%`} />}
                    />
                    <Line
                      type="monotone"
                      dataKey="yield"
                      name="Yield"
                      stroke={T.accentMid}
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, value } = props;
                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={value < 95 ? T.warning : T.accentMid}
                            stroke="#fff"
                            strokeWidth={1.5}
                          />
                        );
                      }}
                      isAnimationActive={true}
                      animationDuration={700}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Monthly Output" subtitle="Units produced per month · current month highlighted" accent="teal" height={220}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.border}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fill: T.ink500,
                        fontSize: 11,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink500,
                        fontSize: 11,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${v} units`} />}
                    />
                    <Bar
                      dataKey="units"
                      name="Units"
                      fill={T.accentMid}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-out"
                      maxBarSize={40}
                      radius={[3, 3, 0, 0]}
                    >
                      {monthlyData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            i === monthlyData.length - 1
                              ? T.accent
                              : T.accentMid
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          );
        })()}

      {/* Recent batches */}
      {batches.length > 0 && (
        <div style={sCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div style={sLabel}>Recent Batches</div>
            <button
              onClick={onNavBatches}
              style={{
                ...sBtn("outline"),
                padding: "4px 12px",
                fontSize: "11px",
              }}
            >
              View All →
            </button>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Batch #</th>
                <th style={sTh}>Product</th>
                {!["food_beverage", "general_retail"].includes(
                  industryProfile,
                ) && <th style={sTh}>Strain</th>}
                {industryProfile === "food_beverage" && (
                  <th style={sTh}>Lot #</th>
                )}
                {industryProfile === "food_beverage" && (
                  <th style={sTh}>Expiry</th>
                )}
                {industryProfile === "food_beverage" && (
                  <th style={{ ...sTh, textAlign: "right" }}>Yield %</th>
                )}
                {industryProfile === "food_beverage" && <th style={sTh}>QC</th>}
                <th style={{ ...sTh, textAlign: "right" }}>Units</th>
                <th style={sTh}>Date</th>
                <th style={sTh}>Stock</th>
                <th style={sTh}>Status</th>
                {!["food_beverage", "general_retail"].includes(
                  industryProfile,
                ) && <th style={sTh}>Lab</th>}
              </tr>
            </thead>
            <tbody>
              {batches.slice(0, 6).map((b) => {
                const invItem = b.inventory_item_id
                  ? items.find((i) => i.id === b.inventory_item_id)
                  : items.find(
                      (i) =>
                        i.category === "finished_product" &&
                        i.name === b.product_name,
                    );
                const qty = invItem
                  ? parseFloat(invItem.quantity_on_hand || 0)
                  : null;
                return (
                  <tr key={b.id}>
                    <td
                      style={{
                        ...sTd,
                        fontFamily: T.font,
                        fontSize: "11px",
                        color: T.ink500,
                      }}
                    >
                      {b.batch_number}
                    </td>
                    <td style={{ ...sTd, fontWeight: 500 }}>
                      {b.product_name || "—"}
                    </td>
                    {!["food_beverage", "general_retail"].includes(
                      industryProfile,
                    ) && <td style={sTd}>{b.strain || "—"}</td>}
                    {industryProfile === "food_beverage" && (
                      <td style={sTd}>{b.batch_lot_number || "—"}</td>
                    )}
                    {industryProfile === "food_beverage" && (
                      <td style={sTd}>
                        {b.expiry_date
                          ? new Date(b.expiry_date).toLocaleDateString("en-ZA")
                          : "—"}
                      </td>
                    )}
                    {industryProfile === "food_beverage" && (
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          color:
                            b.yield_pct < 85
                              ? T.warning
                              : b.yield_pct >= 95
                                ? T.success
                                : T.ink700,
                        }}
                      >
                        {b.yield_pct
                          ? `${parseFloat(b.yield_pct).toFixed(1)}%`
                          : "—"}
                      </td>
                    )}
                    {industryProfile === "food_beverage" && (
                      <td style={sTd}>
                        {b.qc_passed === true ? (
                          <span style={{ color: T.success, fontWeight: 600 }}>
                            Pass
                          </span>
                        ) : b.qc_passed === false ? (
                          <span style={{ color: T.danger, fontWeight: 600 }}>
                            Fail
                          </span>
                        ) : (
                          <span style={{ color: T.ink500 }}>—</span>
                        )}
                      </td>
                    )}
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.font,
                        fontWeight: 600,
                      }}
                    >
                      {b.units_produced ?? "-"}
                    </td>
                    <td style={{ ...sTd, color: T.ink500 }}>
                      {b.production_date
                        ? new Date(b.production_date).toLocaleDateString(
                            "en-ZA",
                          )
                        : "—"}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        fontFamily: T.font,
                        fontWeight: 600,
                        color:
                          qty === null
                            ? T.ink500
                            : qty <= 0
                              ? T.danger
                              : qty <= 10
                                ? T.warning
                                : T.success,
                      }}
                    >
                      {qty === null ? "—" : `${Math.floor(qty)} pcs`}
                    </td>
                    <td style={sTd}>
                      <LifecycleBadge status={b.lifecycle_status} />
                    </td>
                    <td style={sTd}>
                      {b.lab_certified ? (
                        <span style={{ color: T.success }}>✓</span>
                      ) : (
                        <span style={{ color: T.ink500 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Material breakdown grid */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        {[
          { label: "Distillate", data: distillate, unit: "ml", decimals: 1 },
          { label: "Terpenes", data: terpenes, unit: "ml", decimals: 2 },
          { label: "Hardware", data: hardware, unit: "pcs", decimals: 0 },
          { label: "Finished", data: finished, unit: "pcs", decimals: 0 },
        ].map(({ label, data, unit, decimals }) => (
          <div key={label} style={sCard}>
            <div style={sLabel}>{label}</div>
            {data.length === 0 ? (
              <p
                style={{
                  fontSize: "12px",
                  color: T.ink500,
                  marginTop: "8px",
                  fontFamily: T.font,
                }}
              >
                None in inventory
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  fontFamily: T.font,
                  marginTop: "10px",
                }}
              >
                <thead>
                  <tr>
                    <th style={sTh}>Name</th>
                    <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                    {label === "Finished" && (
                      <th style={{ ...sTh, textAlign: "right" }}>Sell</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.map((i) => (
                    <tr key={i.id}>
                      <td style={sTd}>{i.name}</td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.font,
                          fontWeight: 600,
                          color:
                            parseFloat(i.quantity_on_hand || 0) <= 0
                              ? T.danger
                              : T.ink900,
                        }}
                      >
                        {decimals === 0
                          ? Math.floor(parseFloat(i.quantity_on_hand || 0))
                          : parseFloat(i.quantity_on_hand || 0).toFixed(
                              decimals,
                            )}
                        {unit === "pcs" ? "" : unit}
                      </td>
                      {label === "Finished" && (
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.font,
                            color:
                              parseFloat(i.sell_price || 0) > 0
                                ? T.ink900
                                : T.danger,
                          }}
                        >
                          {parseFloat(i.sell_price || 0) > 0
                            ? `R${parseFloat(i.sell_price).toFixed(0)}`
                            : "R0"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Batches Panel ────────────────────────────────────────────────────────────
function BatchesPanel({
  batches,
  runs,
  items,
  productFormats,
  tenantConfig,
  industryProfile,
  onNavNewRun,
  onRefresh,
}) {
  const { tenantId } = useTenant();
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const runByBatch = {};
  runs.forEach((r) => {
    if (r.batch_id) runByBatch[r.batch_id] = r;
  });

  const getStockForBatch = (b) => {
    if (b.inventory_item_id)
      return items.find((i) => i.id === b.inventory_item_id);
    return items.find(
      (i) => i.category === "finished_product" && i.name === b.product_name,
    );
  };
  const getEffectiveLifecycle = (b) => {
    const invItem = getStockForBatch(b);
    if (!invItem) return b.lifecycle_status || "active";
    const qty = parseFloat(invItem.quantity_on_hand || 0);
    const threshold = b.low_stock_threshold || 10;
    if (qty <= 0) return "depleted";
    if (qty <= threshold) return "low_stock";
    return b.lifecycle_status || "active";
  };
  const getBatchIsCannabis = (b) => {
    if (productFormats && productFormats.length > 0) {
      const fmt = productFormats.find((f) => f.format_short === b.product_type);
      if (fmt) return !!fmt.is_cannabis;
    }
    return !!b.strain; // fallback: strain present = cannabis
  };

  const depletedCount = batches.filter(
    (b) => getEffectiveLifecycle(b) === "depleted",
  ).length;
  const lowCount = batches.filter(
    (b) => getEffectiveLifecycle(b) === "low_stock",
  ).length;

  const filtered =
    filter === "all"
      ? batches
      : filter === "depleted"
        ? batches.filter((b) => getEffectiveLifecycle(b) === "depleted")
        : filter === "low_stock"
          ? batches.filter((b) => getEffectiveLifecycle(b) === "low_stock")
          : batches.filter((b) => b.status === filter);

  const openEdit = (b) => {
    setEditing(b.id);
    setEditForm({
      product_name: b.product_name || "",
      product_type: b.product_type || "",
      strain: b.strain || "",
      status: b.status || "active",
      units_produced: b.units_produced ?? "",
      expiry_date: b.expiry_date || "",
      lab_certified: b.lab_certified || false,
      low_stock_threshold: b.low_stock_threshold ?? 10,
      section_21_number: b.section_21_number || "",
      cannabinoid_profile: b.cannabinoid_profile || "",
    });
  };

  const handleSaveEdit = async (b) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("batches")
        .update({
          product_name: editForm.product_name || null,
          product_type: editForm.product_type || null,
          strain: editForm.strain || null,
          status: editForm.status,
          units_produced: parseInt(editForm.units_produced) || null,
          expiry_date: editForm.expiry_date || null,
          lab_certified: editForm.lab_certified,
          low_stock_threshold: parseInt(editForm.low_stock_threshold) || 10,
          section_21_number: editForm.section_21_number || null,
          cannabinoid_profile: editForm.cannabinoid_profile || null,
        })
        .eq("id", b.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      setEditing(null);
      onRefresh();
      showToast("Batch updated.");
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (b) => {
    if (
      !window.confirm(
        `Archive batch "${b.batch_number}"?\n\nThis will hide it from active views. The batch record and history are preserved.`,
      )
    )
      return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("batches")
        .update({
          is_archived: true,
          lifecycle_status: "archived",
          status: "archived",
        })
        .eq("id", b.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      onRefresh();
      showToast(`Batch ${b.batch_number} archived.`);
    } catch (err) {
      showToast("Archive failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBatch = async (b) => {
    setSaving(true);
    try {
      const linkedRun = runs.find((r) => r.batch_id === b.id);
      if (linkedRun) {
        // Reverse all stock movements from this run
        const { data: mvs } = await supabase
          .from("stock_movements")
          .select("id,item_id,quantity,movement_type")
          .eq("reference", linkedRun.run_number)
          .eq("tenant_id", tenantId);
        if (mvs?.length > 0) {
          for (const mv of mvs) {
            const rev = -mv.quantity;
            await supabase.from("stock_movements").insert({
              item_id: mv.item_id,
              quantity: rev,
              movement_type: "adjustment",
              reference: `VOID-${linkedRun.run_number}`,
              notes: `Void: batch ${b.batch_number} cancelled`,
              tenant_id: tenantId || null,
            });
            const { data: item } = await supabase
              .from("inventory_items")
              .select("quantity_on_hand")
              .eq("id", mv.item_id)
              .eq("tenant_id", tenantId)
              .single();
            if (item) {
              await supabase
                .from("inventory_items")
                .update({
                  quantity_on_hand: Math.max(
                    0,
                    parseFloat(item.quantity_on_hand || 0) + rev,
                  ),
                })
                .eq("id", mv.item_id)
                .eq("tenant_id", tenantId);
            }
          }
        }
        // Delete run inputs + run
        await supabase
          .from("production_run_inputs")
          .delete()
          .eq("run_id", linkedRun.id);
        await supabase.from("production_runs").delete().eq("id", linkedRun.id);
      }
      // Delete batch
      await supabase.from("batches").delete().eq("id", b.id).eq("tenant_id", tenantId);
      setDeleting(null);
      onRefresh();
      showToast(`Batch ${b.batch_number} voided. Stock reversed.`);
    } catch (err) {
      showToast("Void failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const FILTER_OPTIONS = [
    { id: "all", label: `All (${batches.length})` },
    {
      id: "active",
      label: `Active (${batches.filter((b) => b.status === "active").length})`,
    },
    {
      id: "depleted",
      label: `Depleted (${depletedCount})`,
      alert: depletedCount > 0,
    },
    { id: "low_stock", label: `Low Stock (${lowCount})`, alert: lowCount > 0 },
    {
      id: "archived",
      label: `Archived (${batches.filter((b) => b.status === "archived").length})`,
    },
  ];
  const BATCH_STATUSES = ["active", "in_progress", "completed", "archived"];

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {toast && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: T.radius.sm,
            fontSize: "12px",
            fontFamily: T.font,
            fontWeight: 500,
            background: toast.type === "error" ? T.dangerLight : T.successLight,
            color: toast.type === "error" ? T.danger : T.success,
            border: `1px solid ${toast.type === "error" ? T.dangerBd : T.successBd}`,
          }}
        >
          {toast.type === "error" ? "✗ " : "✓ "}
          {toast.msg}
        </div>
      )}

      {/* Batch stats — flush grid, no coloured borders */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
          gap: "1px",
          background: T.border,
          borderRadius: T.radius.md,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow.sm,
        }}
      >
        {[
          {
            label: "Total Batches",
            value: batches.length,
            semantic: "success",
          },
          {
            label: "Active",
            value: batches.filter((b) => b.status === "active").length,
            semantic: "success",
          },
          {
            label: "Lab Certified",
            value: batches.filter((b) => b.lab_certified).length,
            semantic: "info",
          },
          {
            label: "With Production Run",
            value: Object.keys(runByBatch).length,
            semantic: null,
          },
          {
            label: "No Run Yet",
            value: batches.filter((b) => !runByBatch[b.id]).length,
            semantic: "warning",
          },
          {
            label: "Depleted",
            value: depletedCount,
            semantic: depletedCount > 0 ? "danger" : null,
          },
        ].map((c, i) => {
          const col = c.semantic
            ? {
                success: T.success,
                warning: T.warning,
                danger: T.danger,
                info: T.info,
              }[c.semantic]
            : T.ink900;
          return (
            <div key={i} style={{ background: T.surface, padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.ink500,
                  marginBottom: "6px",
                  fontFamily: T.font,
                  fontWeight: 700,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: "24px",
                  fontWeight: 400,
                  color: col,
                  lineHeight: 1,
                }}
              >
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI stat strip — WP-PROD-MASTER Session C */}
      {(() => {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const todayStr = now.toISOString().split("T")[0];
        const in30 = new Date(now.getTime() + 30 * 86400000)
          .toISOString()
          .split("T")[0];
        const batchesMTD = batches.filter(
          (b) => b.production_date >= firstOfMonth,
        ).length;
        const yieldRuns = runs.filter(
          (r) => r.yield_pct !== null && r.yield_pct !== undefined,
        );
        const avgYield =
          yieldRuns.length > 0
            ? yieldRuns.reduce((s, r) => s + parseFloat(r.yield_pct), 0) /
              yieldRuns.length
            : null;
        const avgWaste = avgYield !== null ? 100 - avgYield : null;
        const expiringSoon = batches.filter(
          (b) =>
            !b.is_archived &&
            b.expiry_date &&
            b.expiry_date >= todayStr &&
            b.expiry_date <= in30,
        ).length;
        const kpis = [
          {
            label: "Batches MTD",
            fmt: String(batchesMTD),
            semantic: null,
          },
          {
            label: "Avg Yield %",
            fmt: avgYield !== null ? `${avgYield.toFixed(1)}%` : "\u2014",
            semantic:
              avgYield === null
                ? null
                : avgYield >= 90
                  ? "success"
                  : avgYield >= 80
                    ? "warning"
                    : "danger",
          },
          {
            label: "Avg Waste %",
            fmt: avgWaste !== null ? `${avgWaste.toFixed(1)}%` : "\u2014",
            semantic:
              avgWaste === null
                ? null
                : avgWaste <= 10
                  ? "success"
                  : avgWaste <= 20
                    ? "warning"
                    : "danger",
          },
          {
            label: "Expiring \u226430d",
            fmt: String(expiringSoon),
            semantic: expiringSoon > 0 ? "danger" : "success",
          },
        ];
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
              gap: "1px",
              background: T.border,
              borderRadius: T.radius.md,
              overflow: "hidden",
              border: `1px solid ${T.border}`,
              boxShadow: T.shadow.sm,
            }}
          >
            {kpis.map((k) => {
              const col = k.semantic
                ? {
                    success: T.success,
                    warning: T.warning,
                    danger: T.danger,
                  }[k.semantic]
                : T.ink900;
              return (
                <div
                  key={k.label}
                  style={{ background: T.surface, padding: "14px 16px" }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: T.ink500,
                      marginBottom: "6px",
                      fontFamily: T.font,
                      fontWeight: 700,
                    }}
                  >
                    {k.label}
                  </div>
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: "22px",
                      fontWeight: 400,
                      color: col,
                      lineHeight: 1,
                    }}
                  >
                    {k.fmt}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 14px",
              background: filter === f.id ? T.accent : "#fff",
              color: filter === f.id ? "#fff" : f.alert ? T.warning : T.ink500,
              border: `1px solid ${filter === f.id ? T.accent : f.alert ? T.warningBd : T.border}`,
              borderRadius: T.radius.sm,
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: T.font,
              fontWeight: filter === f.id ? 700 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={onRefresh}
          style={{
            ...sBtn("outline"),
            padding: "6px 12px",
            fontSize: "11px",
            marginLeft: "auto",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Batch table */}
      <div style={sCard}>
        {filtered.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "60px", color: T.ink500 }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📦</div>
            <p style={{ fontFamily: T.font, fontSize: "14px" }}>
              No batches found.
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "140px 1fr 110px 100px 55px 80px 95px 95px 45px 100px 75px 80px",
                gap: 0,
                padding: "0 0 6px 0",
                borderBottom: `2px solid ${T.border}`,
              }}
            >
              {[
                "BATCH #",
                "PRODUCT",
                "TYPE",
                ...(!["food_beverage", "general_retail"].includes(
                  industryProfile,
                )
                  ? ["STRAIN"]
                  : []),
                "UNITS",
                "STOCK",
                "PROD DATE",
                "EXPIRY",
                "LAB",
                "RUN",
                "STATUS",
                "",
              ].map((h, i) => (
                <div
                  key={i}
                  style={{ ...sTh, borderBottom: "none", paddingLeft: "8px" }}
                >
                  {h}
                </div>
              ))}
            </div>
            {filtered.map((b) => {
              const linkedRun = runByBatch[b.id];
              const isEditing = editing === b.id;
              const invItem = getStockForBatch(b);
              const qty = invItem
                ? parseFloat(invItem.quantity_on_hand || 0)
                : null;
              const lifecycle = getEffectiveLifecycle(b);
              const isDepleted = lifecycle === "depleted";
              const isLow = lifecycle === "low_stock";
              return (
                <div key={b.id}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "140px 1fr 110px 100px 55px 80px 95px 95px 45px 100px 75px 80px",
                      gap: 0,
                      borderBottom: `1px solid ${T.bg}`,
                      alignItems: "center",
                      background: isDepleted
                        ? T.dangerLight
                        : isLow
                          ? T.warningLight
                          : isEditing
                            ? T.accentLight
                            : "transparent",
                    }}
                  >
                    <div
                      style={{
                        ...sTd,
                        fontFamily: T.font,
                        fontSize: "11px",
                        color: T.ink500,
                        paddingLeft: "8px",
                      }}
                    >
                      {b.batch_number}
                    </div>
                    <div style={{ ...sTd, fontWeight: 500 }}>
                      {b.product_name || "\u2014"}
                      {/* WP-PROD-MASTER Session D: mixed retail type badge (Q4) */}
                      {industryProfile === "mixed_retail" &&
                        linkedRun?.industry_profile_snapshot && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              marginTop: "3px",
                              padding: "1px 6px",
                              borderRadius: T.radius.sm,
                              fontFamily: T.font,
                              background:
                                linkedRun.industry_profile_snapshot ===
                                "food_beverage"
                                  ? T.infoLight
                                  : linkedRun.industry_profile_snapshot ===
                                      "general_retail"
                                    ? T.bg
                                    : T.accentLight,
                              color:
                                linkedRun.industry_profile_snapshot ===
                                "food_beverage"
                                  ? T.info
                                  : linkedRun.industry_profile_snapshot ===
                                      "general_retail"
                                    ? T.ink500
                                    : T.accentMid,
                              border: `1px solid ${
                                linkedRun.industry_profile_snapshot ===
                                "food_beverage"
                                  ? T.infoBd
                                  : linkedRun.industry_profile_snapshot ===
                                      "general_retail"
                                    ? T.border
                                    : T.accentBd
                              }`,
                            }}
                          >
                            {linkedRun.industry_profile_snapshot ===
                            "food_beverage"
                              ? "Recipe"
                              : linkedRun.industry_profile_snapshot ===
                                  "general_retail"
                                ? "Receiving"
                                : "Manufacturing"}
                          </span>
                        )}
                    </div>
                    <div
                      style={{
                        ...sTd,
                        color: !b.product_type ? T.warning : T.ink500,
                        fontSize: "11px",
                      }}
                    >
                      {b.product_type || <span>empty</span>}
                    </div>
                    {!["food_beverage", "general_retail"].includes(
                      industryProfile,
                    ) && (
                      <div style={sTd}>
                        {(() => {
                          const cp = b.cannabinoid_profile;
                          if (cp && typeof cp === "object" && cp.chamber_1) {
                            return (
                              <div
                                style={{ fontSize: "11px", lineHeight: "1.6" }}
                              >
                                {Object.entries(cp).map(([k, v]) => (
                                  <div key={k} style={{ color: T.accentMid }}>
                                    <span
                                      style={{
                                        color: T.ink500,
                                        textTransform: "uppercase",
                                        fontSize: "11px",
                                      }}
                                    >
                                      {k.replace("_", " ")}:{" "}
                                    </span>
                                    {v.terpene
                                      ? `${v.terpene.split(" - ")[0]} ${v.terpene_pct ? v.terpene_pct + "%" : ""}`
                                      : v.strain || v.medium || "—"}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return b.strain || "—";
                        })()}
                      </div>
                    )}
                    <div
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.font,
                        fontWeight: 600,
                      }}
                    >
                      {b.units_produced ?? "-"}
                    </div>
                    <div
                      style={{
                        ...sTd,
                        fontFamily: T.font,
                        fontWeight: 700,
                        color:
                          qty === null
                            ? T.ink500
                            : isDepleted
                              ? T.danger
                              : isLow
                                ? T.warning
                                : T.success,
                      }}
                    >
                      {qty === null ? (
                        <span style={{ color: T.ink500, fontSize: 10 }}>
                          not linked
                        </span>
                      ) : (
                        `${Math.floor(qty)} pcs`
                      )}
                    </div>
                    <div style={{ ...sTd, color: T.ink500, fontSize: "11px" }}>
                      {b.production_date
                        ? new Date(b.production_date).toLocaleDateString(
                            "en-ZA",
                          )
                        : "—"}
                    </div>
                    <div style={{ ...sTd, color: T.ink500, fontSize: "11px" }}>
                      {b.expiry_date
                        ? new Date(b.expiry_date).toLocaleDateString("en-ZA")
                        : "\u2014"}
                      {/* WP-PROD-MASTER Session D: temperature zone badge (D6) */}
                      {industryProfile === "food_beverage" &&
                        linkedRun?.temperature_zone && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              marginTop: "3px",
                              padding: "1px 5px",
                              borderRadius: T.radius.sm,
                              fontFamily: T.font,
                              background:
                                linkedRun.temperature_zone === "Frozen"
                                  ? "#e0f0ff"
                                  : linkedRun.temperature_zone ===
                                      "Refrigerated"
                                    ? "#e8f5e9"
                                    : T.bg,
                              color:
                                linkedRun.temperature_zone === "Frozen"
                                  ? "#1565c0"
                                  : linkedRun.temperature_zone ===
                                      "Refrigerated"
                                    ? "#2e7d32"
                                    : T.ink500,
                            }}
                          >
                            {linkedRun.temperature_zone === "Frozen"
                              ? "FRZ"
                              : linkedRun.temperature_zone === "Refrigerated"
                                ? "REF"
                                : "AMB"}
                          </span>
                        )}
                    </div>
                    <div style={sTd}>
                      {b.lab_certified ? (
                        <span style={{ color: T.success, fontWeight: 600 }}>
                          ✓
                        </span>
                      ) : (
                        <span style={{ color: T.ink500 }}>—</span>
                      )}
                    </div>
                    <div style={{ ...sTd, fontSize: "11px" }}>
                      {linkedRun ? (
                        <span
                          style={{ color: T.success, fontFamily: T.font }}
                        >
                          {linkedRun.run_number || "✓"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: T.radius.sm,
                            background: T.warningLight,
                            color: T.warning,
                            fontWeight: 600,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          No Run
                        </span>
                      )}
                    </div>
                    <div style={sTd}>
                      <LifecycleBadge status={lifecycle} />
                    </div>
                    <div
                      style={{
                        ...sTd,
                        textAlign: "center",
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() =>
                          isEditing ? setEditing(null) : openEdit(b)
                        }
                        style={{
                          ...sBtn("outline"),
                          padding: "3px 8px",
                          fontSize: "11px",
                          color: isEditing ? T.ink500 : T.accentMid,
                          borderColor: isEditing ? T.border : T.accentBd,
                        }}
                      >
                        {isEditing ? "✕" : "✎"}
                      </button>
                      {!linkedRun && (
                        <button
                          onClick={onNavNewRun}
                          title="New Production Run"
                          style={{
                            ...sBtn("outline"),
                            padding: "3px 8px",
                            fontSize: "11px",
                            color: T.success,
                            borderColor: T.successBd,
                          }}
                        >
                          ⊕
                        </button>
                      )}
                      {(isDepleted || b.status !== "archived") && (
                        <button
                          onClick={() => handleArchive(b)}
                          title="Archive batch"
                          style={{
                            ...sBtn("outline"),
                            padding: "3px 8px",
                            fontSize: "11px",
                            color: T.ink500,
                            borderColor: T.border,
                          }}
                        >
                          ▣
                        </button>
                      )}
                      {deleting !== b.id && (
                        <button
                          onClick={() => setDeleting(b.id)}
                          title={
                            linkedRun
                              ? "Void batch + reverse stock"
                              : "Delete batch"
                          }
                          style={{
                            ...sBtn("outline"),
                            padding: "3px 8px",
                            fontSize: "11px",
                            color: T.danger,
                            borderColor: T.dangerBd,
                          }}
                        >
                          {linkedRun ? "Void" : "✕"}
                        </button>
                      )}
                      {deleting === b.id && (
                        <>
                          <button
                            onClick={() => handleDeleteBatch(b)}
                            disabled={saving}
                            style={{
                              ...sBtn("danger"),
                              padding: "3px 8px",
                              fontSize: "11px",
                            }}
                          >
                            {saving
                              ? "..."
                              : linkedRun
                                ? "Confirm Void"
                                : "Delete"}
                          </button>
                          <button
                            onClick={() => setDeleting(null)}
                            style={{
                              ...sBtn("outline"),
                              padding: "3px 8px",
                              fontSize: "11px",
                            }}
                          >
                            No
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div
                      style={{
                        padding: "16px 12px",
                        background: T.accentLight,
                        borderBottom: `1px solid ${T.accentBd}`,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr 1fr 1fr 80px 130px 100px",
                          gap: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        {[
                          {
                            lbl: "Product Name",
                            key: "product_name",
                            type: "text",
                          },
                          {
                            lbl: "Product Type",
                            key: "product_type",
                            type: "text",
                            placeholder: "e.g. 1ml Cart",
                          },
                          { lbl: "Strain", key: "strain", type: "text" },
                        ].map(({ lbl, key, type, placeholder }) => (
                          <div key={key}>
                            <label
                              style={{
                                fontSize: "11px",
                                color: T.ink500,
                                display: "block",
                                marginBottom: "3px",
                                fontFamily: T.font,
                              }}
                            >
                              {lbl}
                            </label>
                            <input
                              style={sInput}
                              type={type}
                              placeholder={placeholder}
                              value={editForm[key]}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        ))}
                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              color: T.ink500,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: T.font,
                            }}
                          >
                            Status
                          </label>
                          <select
                            style={sSelect}
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                status: e.target.value,
                              }))
                            }
                          >
                            {BATCH_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              color: T.ink500,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: T.font,
                            }}
                          >
                            Units
                          </label>
                          <input
                            style={sInput}
                            type="number"
                            min="0"
                            value={editForm.units_produced}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                units_produced: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              color: T.ink500,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: T.font,
                            }}
                          >
                            Expiry Date
                          </label>
                          <input
                            style={sInput}
                            type="date"
                            value={editForm.expiry_date}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                expiry_date: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              color: T.ink500,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: T.font,
                            }}
                          >
                            Low Stock Alert
                          </label>
                          <input
                            style={sInput}
                            type="number"
                            min="1"
                            value={editForm.low_stock_threshold}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                low_stock_threshold: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      {showCannabisField(
                        industryProfile,
                        getBatchIsCannabis(b),
                      ) &&
                        tenantConfig?.feature_medical !== false && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "12px",
                              marginBottom: "12px",
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  fontSize: "11px",
                                  color: T.ink500,
                                  display: "block",
                                  marginBottom: "3px",
                                  fontFamily: T.font,
                                }}
                              >
                                Section 21 Number
                              </label>
                              <input
                                style={sInput}
                                type="text"
                                placeholder="e.g. S21/..."
                                value={editForm.section_21_number}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    section_21_number: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label
                                style={{
                                  fontSize: "11px",
                                  color: T.ink500,
                                  display: "block",
                                  marginBottom: "3px",
                                  fontFamily: T.font,
                                }}
                              >
                                Cannabinoid Profile
                              </label>
                              <input
                                style={sInput}
                                type="text"
                                placeholder="e.g. THC 85%, CBD 2%"
                                value={editForm.cannabinoid_profile}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    cannabinoid_profile: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}
                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          alignItems: "center",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontFamily: T.font,
                            color: T.ink900,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={editForm.lab_certified}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                lab_certified: e.target.checked,
                              }))
                            }
                            style={{ width: "14px", height: "14px" }}
                          />
                          Lab Certified
                        </label>
                        <button
                          onClick={() => handleSaveEdit(b)}
                          disabled={saving}
                          style={sBtn()}
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          style={sBtn("outline")}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {batches.filter((b) => !runByBatch[b.id]).length > 0 && (
        <div
          style={{
            background: T.warningLight,
            border: `1px solid ${T.warningBd}`,
            borderRadius: T.radius.md,
            padding: "16px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: T.warning,
                fontFamily: T.font,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Batches Without Production Runs
            </div>
            <p
              style={{
                fontSize: "13px",
                color: T.ink700,
                margin: "0",
                fontFamily: T.font,
                lineHeight: "1.7",
              }}
            >
              {batches.filter((b) => !runByBatch[b.id]).length} batch(es) have
              no linked production run.
            </p>
          </div>
          <button
            onClick={onNavNewRun}
            style={{ ...sBtn("amber"), whiteSpace: "nowrap" }}
          >
            New Run
          </button>
        </div>
      )}
    </div>
  );
}

// ─── New Run Panel ────────────────────────────────────────────────────────────
function NewRunPanel({
  items,
  productFormats,
  productStrains,
  formatBom,
  industryProfile,
  onComplete,
}) {
  const { tenantId } = useTenant();
  // ── Build format catalogue + groups from live DB; fall back to hardcoded if empty ──
  const formatCatalogue =
    productFormats.length > 0
      ? Object.fromEntries(
          productFormats.map((f) => [
            f.key,
            {
              label: f.label,
              category: f.category || (f.is_vape ? "vape" : "other"),
              is_vape: !!f.is_vape,
              is_cannabis: !!f.is_cannabis,
              distillate_ml: parseFloat(f.distillate_ml) || 0,
              chambers: parseInt(f.chambers) || 1,
              terpene_pct: parseInt(f.terpene_pct) || 10,
              format_short: f.format_short || f.label,
              custom_fill: !!f.custom_fill,
            },
          ]),
        )
      : FORMAT_CATALOGUE;

  const formatGroups =
    productFormats.length > 0
      ? (() => {
          const seen = new Map();
          // WP-PROD-MASTER: filter formats by profile
          const visibleFormats = productFormats.filter((f) => {
            if (industryProfile === "food_beverage")
              return !f.is_cannabis && !f.is_vape;
            if (industryProfile === "general_retail") return !f.is_cannabis;
            return true; // cannabis profiles see all
          });
          visibleFormats.forEach((f) => {
            const g =
              f.group_label ||
              (f.is_vape ? "-- Vape --" : "-- Other Products --");
            if (!seen.has(g)) seen.set(g, []);
            seen.get(g).push(f.key);
          });
          return Array.from(seen.entries()).map(([groupLabel, keys]) => ({
            groupLabel,
            keys,
          }));
        })()
      : FORMAT_GROUPS;

  const strainOptions =
    productStrains.length > 0
      ? productStrains.map((s) => s.name)
      : STRAIN_OPTIONS;

  const defaultFormatKey = formatGroups[0]?.keys[0] || "vape_1ml";

  // WP-PROD-MASTER: reset format_key when profile changes or formats load
  useEffect(() => {
    const firstKey = formatGroups[0]?.keys[0];
    if (firstKey && firstKey !== form.format_key) {
      set("format_key", firstKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industryProfile, productFormats.length]);

  const [form, setForm] = useState({
    strain: "",
    format_key: "vape_1ml",
    planned_units: "",
    terpene_item_id: "",
    hardware_item_id: "",
    distillate_item_id: "",
    actual_units: "",
    notes: "",
    terpene_pct_override: "",
    custom_fill_ml: "",
    product_name_override: "",
    bom_selections: {},
    lot_number: "", // WP-BIB S3: food_beverage lot number
    expiry_date: "", // WP-BIB S3: food_beverage expiry date (mandatory)
    // WP-PROD-MASTER: food_beverage extended fields
    recipe_name: "",
    recipe_version: "",
    storage_instructions: "",
    temperature_zone: "Ambient",
    allergen_flags: {
      gluten: false,
      crustaceans: false,
      eggs: false,
      fish: false,
      peanuts: false,
      soybeans: false,
      milk: false,
      nuts: false,
      celery: false,
      mustard: false,
      sesame: false,
      sulphites: false,
      lupin: false,
      molluscs: false,
    },
    allergens_declared: false,
    qc_passed: null,
    quality_checks: [],
    fsca_cert_number: "",
    haccp_ref: "",
    yield_pct: "",
    // WP-PROD-MASTER: general_retail receive fields
    receive_supplier_id: "",
    receive_po_ref: "",
    receive_date: new Date().toISOString().split("T")[0],
    unit_cost_receive: "", // AVCO_PLACEHOLDER: wire to AVCO engine in future session
  });
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [completedRun, setCompletedRun] = useState(null);
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setConfirmed(false);
  };
  const setBomSel = (lineId, itemId) => {
    setForm((p) => ({
      ...p,
      bom_selections: { ...p.bom_selections, [lineId]: itemId },
    }));
    setConfirmed(false);
  };

  const fmt =
    formatCatalogue[form.format_key] ||
    formatCatalogue[defaultFormatKey] ||
    FORMAT_CATALOGUE["vape_1ml"];
  const isVape = fmt.is_vape;
  const isCannabis =
    fmt.is_cannabis !== undefined ? !!fmt.is_cannabis : fmt.is_vape;
  const fmtRecord = productFormats.find((f) => f.key === form.format_key);
  const activeBom =
    !isVape && fmtRecord && formatBom
      ? formatBom.filter((b) => b.format_id === fmtRecord.id)
      : [];
  const hasBom = activeBom.length > 0;
  const planned = parseInt(form.planned_units) || 0;
  const fillMlPerChamber = fmt.custom_fill
    ? parseFloat(form.custom_fill_ml) || 0
    : fmt.distillate_ml;
  const chambers = fmt.chambers || 1;
  const distMlPerUnit = fillMlPerChamber * chambers;
  const terpPct =
    parseFloat(form.terpene_pct_override) > 0
      ? parseFloat(form.terpene_pct_override)
      : fmt.terpene_pct || 10;
  const terpRatio = terpPct / 100;
  const distNeeded = isVape ? +(planned * distMlPerUnit).toFixed(2) : 0;
  const terpNeeded = isVape
    ? +(planned * distMlPerUnit * terpRatio).toFixed(3)
    : 0;
  const hwNeeded = isVape ? planned : 0;
  const bomLineData = activeBom.map((line) => {
    const selItemId = form.bom_selections[line.id] || "";
    const selItem = items.find((i) => i.id === selItemId);
    const needed = +(parseFloat(line.quantity_per_unit || 0) * planned).toFixed(
      3,
    );
    const avail = Math.max(
      0,
      parseFloat(selItem?.quantity_on_hand || 0) -
        parseFloat(selItem?.reserved_qty || 0),
    );
    const cost =
      parseFloat(selItem?.weighted_avg_cost || selItem?.cost_price || 0) *
      needed;
    const candidateItems = items.filter((i) => {
      if (line.material_type === "distillate")
        return i.category === "raw_material" && i.unit === "ml";
      if (line.material_type === "terpene") return i.category === "terpene";
      if (line.material_type === "hardware") return i.category === "hardware";
      if (line.material_type === "packaging") return i.category === "packaging";
      return i.is_active !== false;
    });
    return {
      line,
      selItemId,
      selItem,
      needed,
      avail,
      ok: !!selItemId && avail >= needed,
      cost,
      candidateItems,
    };
  });
  const bomMatsOk = hasBom
    ? planned > 0 && bomLineData.every((bl) => bl.ok)
    : true;
  const bomTotalCost = bomLineData.reduce((s, bl) => s + bl.cost, 0);
  const distItems = items.filter(
    (i) => i.category === "raw_material" && i.unit === "ml",
  );
  const terpItems = items.filter((i) => i.category === "terpene");
  const hwItems = items.filter((i) => i.category === "hardware");
  const selDist = distItems.find((i) => i.id === form.distillate_item_id);
  const selTerp = terpItems.find((i) => i.id === form.terpene_item_id);
  const selHw = hwItems.find((i) => i.id === form.hardware_item_id);
  const distAvail = Math.max(
    0,
    parseFloat(selDist?.quantity_on_hand || 0) -
      parseFloat(selDist?.reserved_qty || 0),
  );
  const terpAvail = Math.max(
    0,
    parseFloat(selTerp?.quantity_on_hand || 0) -
      parseFloat(selTerp?.reserved_qty || 0),
  );
  const hwAvail = Math.max(
    0,
    parseFloat(selHw?.quantity_on_hand || 0) -
      parseFloat(selHw?.reserved_qty || 0),
  );

  // ── WP-BIB S3: Multi-chamber computed values ──────────────────────────────
  const isMultiChamber = isVape && chambers > 1;
  const isFoodBev = industryProfile === "food_beverage";
  const isGeneralRetail = industryProfile === "general_retail";
  const isCannabisProfile = [
    "cannabis_retail",
    "cannabis_dispensary",
    "mixed_retail",
  ].includes(industryProfile);

  const chamberData = isMultiChamber
    ? Array.from({ length: chambers }, (_, ci) => {
        const mediumId = form.bom_selections[`ch_${ci}_medium`] || "";
        const terpeneId = form.bom_selections[`ch_${ci}_terpene`] || "";
        const chStrain = form.bom_selections[`ch_${ci}_strain`] || "";
        const medItem = distItems.find((i) => i.id === mediumId);
        const cTerpItem = terpItems.find((i) => i.id === terpeneId);
        const cMedAvail = Math.max(
          0,
          parseFloat(medItem?.quantity_on_hand || 0) -
            parseFloat(medItem?.reserved_qty || 0),
        );
        const cTerpAvail = Math.max(
          0,
          parseFloat(cTerpItem?.quantity_on_hand || 0) -
            parseFloat(cTerpItem?.reserved_qty || 0),
        );
        const cMedNeeded = +(fillMlPerChamber * planned).toFixed(2);
        const chTerpPct =
          parseFloat(form.bom_selections[`ch_${ci}_terpPct`]) || terpPct;
        const chTerpRatio = chTerpPct / 100;
        const cTerpNeeded = +(fillMlPerChamber * chTerpRatio * planned).toFixed(
          3,
        );
        return {
          ci,
          mediumId,
          terpeneId,
          chStrain,
          medItem,
          cTerpItem,
          cMedAvail,
          cTerpAvail,
          cMedNeeded,
          cTerpNeeded,
          medOk: !!mediumId && cMedAvail >= cMedNeeded,
          terpOk: !!terpeneId && cTerpAvail >= cTerpNeeded,
        };
      })
    : [];

  const hwSelId = isMultiChamber ? form.bom_selections["hw"] || "" : "";
  const hwSelItem = hwItems.find((i) => i.id === hwSelId);
  const hwSelAvail = Math.max(
    0,
    parseFloat(hwSelItem?.quantity_on_hand || 0) -
      parseFloat(hwSelItem?.reserved_qty || 0),
  );
  const multiChamberMatsOk =
    isMultiChamber &&
    planned > 0 &&
    chamberData.every((c) => c.medOk && c.terpOk) &&
    !!hwSelId &&
    hwSelAvail >= planned;
  // ──────────────────────────────────────────────────────────────────────────

  const vapeMatsOk =
    !isVape ||
    (isMultiChamber
      ? multiChamberMatsOk
      : form.distillate_item_id &&
        distAvail >= distNeeded &&
        form.terpene_item_id &&
        terpAvail >= terpNeeded &&
        form.hardware_item_id &&
        hwAvail >= hwNeeded &&
        distMlPerUnit > 0);
  const multiChamberName = isMultiChamber ? fmt.format_short : "";
  const hasName = form.strain || form.product_name_override || multiChamberName;
  const foodBevOk =
    !isFoodBev ||
    isVape ||
    (!!form.lot_number &&
      !!form.expiry_date &&
      form.allergens_declared &&
      form.qc_passed !== null);
  const canRun =
    planned > 0 && (hasBom ? bomMatsOk : vapeMatsOk) && hasName && foodBevOk;
  const distCost = selDist
    ? parseFloat(selDist.cost_price || 0) * distNeeded
    : 0;
  const terpCost = selTerp
    ? parseFloat(selTerp.cost_price || 0) * terpNeeded
    : 0;
  const hwCost = selHw ? parseFloat(selHw.cost_price || 0) * hwNeeded : 0;
  const multiChamberCost = isMultiChamber
    ? chamberData.reduce((sum, ch) => {
        const mCost =
          parseFloat(
            ch.medItem?.weighted_avg_cost || ch.medItem?.cost_price || 0,
          ) * ch.cMedNeeded;
        const tCost =
          parseFloat(
            ch.cTerpItem?.weighted_avg_cost || ch.cTerpItem?.cost_price || 0,
          ) * ch.cTerpNeeded;
        return sum + mCost + tCost;
      }, 0) +
      parseFloat(hwSelItem?.cost_price || 0) * planned
    : 0;
  const totalCost = hasBom
    ? bomTotalCost
    : isMultiChamber
      ? multiChamberCost
      : distCost + terpCost + hwCost;
  const costPerUnit = planned > 0 ? (totalCost / planned).toFixed(2) : 0;
  const foodWastePct =
    isFoodBev && form.yield_pct && planned > 0
      ? Math.max(0, 100 - parseFloat(form.yield_pct)).toFixed(1)
      : isFoodBev && form.actual_units && planned > 0
        ? Math.max(
            0,
            ((planned - (parseInt(form.actual_units) || planned)) / planned) *
              100,
          ).toFixed(1)
        : null;
  const finalActual = parseInt(form.actual_units) || planned;
  const yieldPct = calcYield(finalActual, planned);
  const yieldFlagged = yieldPct !== null && yieldPct < 95;
  const nameBase = form.strain
    ? `${form.strain} ${fmt.format_short}`
    : fmt.format_short;
  const finishedName = form.product_name_override || nameBase;
  const finishedSku =
    `FP-${finishedName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`.slice(
      0,
      50,
    );
  const runNumber = hasName
    ? genRunNumber(form.strain || form.product_name_override, form.format_key)
    : "";
  const fLabel = (text, hint) => (
    <label
      style={{
        fontSize: "11px",
        color: T.ink500,
        display: "block",
        marginBottom: "4px",
        fontFamily: T.font,
      }}
    >
      {text}
      {hint && (
        <span
          style={{ color: T.accentMid, marginLeft: "6px", fontSize: "11px" }}
        >
          {hint}
        </span>
      )}
    </label>
  );

  const handleConfirm = async () => {
    if (!canRun) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { data: batch, error: batchErr } = await supabase
        .from("batches")
        .insert({
          batch_number: runNumber,
          product_name: finishedName,
          product_type: fmt.format_short,
          strain: form.strain || null,
          volume: isVape ? `${distMlPerUnit}ml` : null,
          production_date: now.split("T")[0],
          units_produced: finalActual,
          status: "active",
          lifecycle_status: "active",
          is_archived: false,
          expiry_date: isFoodBev ? form.expiry_date || null : null,
          tenant_id: tenantId || null,
        })
        .select()
        .single();
      if (batchErr) throw batchErr;
      const { data: run, error: runErr } = await supabase
        .from("production_runs")
        .insert({
          batch_id: batch.id,
          run_number: runNumber,
          status: "completed",
          planned_units: planned,
          actual_units: finalActual,
          started_at: now,
          completed_at: now,
          notes:
            isFoodBev && form.lot_number
              ? `Lot: ${form.lot_number}${form.notes ? " | " + form.notes : ""}`
              : form.notes || null,
          // WP-PROD-MASTER: food + general fields on production_runs
          recipe_name: isFoodBev ? form.recipe_name || null : null,
          recipe_version: isFoodBev ? form.recipe_version || null : null,
          storage_instructions: isFoodBev
            ? form.storage_instructions || null
            : null,
          temperature_zone: isFoodBev ? form.temperature_zone || null : null,
          allergen_flags: isFoodBev ? form.allergen_flags : {},
          qc_passed: isFoodBev ? form.qc_passed : null,
          quality_checks: isFoodBev ? form.quality_checks : [],
          fsca_cert_number: isFoodBev ? form.fsca_cert_number || null : null,
          haccp_ref: isFoodBev ? form.haccp_ref || null : null,
          yield_pct: form.yield_pct ? parseFloat(form.yield_pct) : null,
          batch_lot_number:
            isFoodBev || isGeneralRetail ? form.lot_number || null : null,
          receive_supplier_id: isGeneralRetail
            ? form.receive_supplier_id || null
            : null,
          receive_po_ref: isGeneralRetail ? form.receive_po_ref || null : null,
          receive_date: isGeneralRetail ? form.receive_date || null : null,
          industry_profile_snapshot: industryProfile,
        })
        .select()
        .single();
      if (runErr) throw runErr;

      // ── Single-chamber vape deductions (unchanged) ──
      if (isVape && !isMultiChamber) {
        await supabase.from("production_run_inputs").insert([
          {
            run_id: run.id,
            item_id: form.distillate_item_id,
            quantity_planned: distNeeded,
            quantity_actual: distNeeded,
            notes: "Distillate",
          },
          {
            run_id: run.id,
            item_id: form.terpene_item_id,
            quantity_planned: terpNeeded,
            quantity_actual: terpNeeded,
            notes: "Terpene",
          },
          {
            run_id: run.id,
            item_id: form.hardware_item_id,
            quantity_planned: hwNeeded,
            quantity_actual: hwNeeded,
            notes: "Hardware",
          },
        ]);
        await supabase.from("stock_movements").insert([
          {
            item_id: form.distillate_item_id,
            quantity: -distNeeded,
            movement_type: "production_out",
            reference: runNumber,
            notes: `Run ${runNumber}: distillate`,
            tenant_id: tenantId,
          },
          {
            item_id: form.terpene_item_id,
            quantity: -terpNeeded,
            movement_type: "production_out",
            reference: runNumber,
            notes: `Run ${runNumber}: ${selTerp?.name}`,
            tenant_id: tenantId,
          },
          {
            item_id: form.hardware_item_id,
            quantity: -hwNeeded,
            movement_type: "production_out",
            reference: runNumber,
            notes: `Run ${runNumber}: ${selHw?.name}`,
            tenant_id: tenantId,
          },
        ]);
        await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: distAvail - distNeeded })
          .eq("id", form.distillate_item_id)
          .eq("tenant_id", tenantId);
        await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: terpAvail - terpNeeded })
          .eq("id", form.terpene_item_id)
          .eq("tenant_id", tenantId);
        await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: hwAvail - hwNeeded })
          .eq("id", form.hardware_item_id)
          .eq("tenant_id", tenantId);
      }

      // ── WP-BIB S3: Multi-chamber vape deductions ──
      if (isVape && isMultiChamber) {
        const runInputs = [];
        const movements = [];
        // Track qty updates per item — same item may appear in multiple chambers
        const qtyUpdates = {};
        for (const ch of chamberData) {
          runInputs.push(
            {
              run_id: run.id,
              item_id: ch.mediumId,
              quantity_planned: ch.cMedNeeded,
              quantity_actual: ch.cMedNeeded,
              notes: `Chamber ${ch.ci + 1} medium`,
            },
            {
              run_id: run.id,
              item_id: ch.terpeneId,
              quantity_planned: ch.cTerpNeeded,
              quantity_actual: ch.cTerpNeeded,
              notes: `Chamber ${ch.ci + 1} terpene`,
            },
          );
          movements.push(
            {
              item_id: ch.mediumId,
              quantity: -ch.cMedNeeded,
              movement_type: "production_out",
              reference: runNumber,
              notes: `Run ${runNumber}: Ch${ch.ci + 1} ${ch.medItem?.name || "medium"}`,
              tenant_id: tenantId,
            },
            {
              item_id: ch.terpeneId,
              quantity: -ch.cTerpNeeded,
              movement_type: "production_out",
              reference: runNumber,
              notes: `Run ${runNumber}: Ch${ch.ci + 1} ${ch.cTerpItem?.name || "terpene"}`,
              tenant_id: tenantId,
            },
          );
          qtyUpdates[ch.mediumId] =
            (qtyUpdates[ch.mediumId] ?? ch.cMedAvail) - ch.cMedNeeded;
          qtyUpdates[ch.terpeneId] =
            (qtyUpdates[ch.terpeneId] ?? ch.cTerpAvail) - ch.cTerpNeeded;
        }
        // Hardware — shared across all chambers
        runInputs.push({
          run_id: run.id,
          item_id: hwSelId,
          quantity_planned: planned,
          quantity_actual: planned,
          notes: "Hardware (all chambers)",
        });
        movements.push({
          item_id: hwSelId,
          quantity: -planned,
          movement_type: "production_out",
          reference: runNumber,
          notes: `Run ${runNumber}: hardware`,
          tenant_id: tenantId,
        });
        qtyUpdates[hwSelId] = hwSelAvail - planned;

        await supabase.from("production_run_inputs").insert(runInputs);
        await supabase.from("stock_movements").insert(movements);
        for (const [itemId, newQty] of Object.entries(qtyUpdates)) {
          await supabase
            .from("inventory_items")
            .update({ quantity_on_hand: Math.max(0, newQty) })
            .eq("id", itemId)
            .eq("tenant_id", tenantId);
        }

        // Store per-chamber cannabinoid profile on batch
        const cannabinoidProfile = {};
        for (const ch of chamberData) {
          cannabinoidProfile[`chamber_${ch.ci + 1}`] = {
            strain: ch.chStrain || null,
            medium: ch.medItem?.name || null,
            medium_type: ch.medItem?.medium_type || null,
            terpene: ch.cTerpItem?.name || null,
            terpene_pct:
              parseFloat(form.bom_selections[`ch_${ch.ci}_terpPct`]) || terpPct,
          };
        }
        await supabase
          .from("batches")
          .update({ cannabinoid_profile: cannabinoidProfile })
          .eq("id", batch.id)
          .eq("tenant_id", tenantId);
      }

      if (hasBom && !isVape && bomLineData.length > 0) {
        await supabase.from("production_run_inputs").insert(
          bomLineData.map((bl) => ({
            run_id: run.id,
            item_id: bl.selItemId,
            quantity_planned: bl.needed,
            quantity_actual: bl.needed,
            notes: bl.line.notes || bl.line.material_type,
          })),
        );
        for (const bl of bomLineData) {
          if (!bl.selItemId) continue;
          await supabase.from("stock_movements").insert({
            item_id: bl.selItemId,
            quantity: -bl.needed,
            movement_type: "production_out",
            reference: runNumber,
            notes: `Run ${runNumber}: ${bl.selItem?.name || bl.line.material_type}`,
            tenant_id: tenantId,
          });
          const curAvail = parseFloat(bl.selItem?.quantity_on_hand || 0);
          await supabase
            .from("inventory_items")
            .update({ quantity_on_hand: Math.max(0, curAvail - bl.needed) })
            .eq("id", bl.selItemId)
            .eq("tenant_id", tenantId);
        }
      }
      const existingFin = items.find(
        (i) => i.category === "finished_product" && i.name === finishedName,
      );
      let finId;
      if (existingFin) {
        finId = existingFin.id;
      } else {
        const { data: ni, error: niErr } = await supabase
          .from("inventory_items")
          .insert({
            sku: finishedSku,
            name: finishedName,
            category: "finished_product",
            unit: "pcs",
            quantity_on_hand: 0,
            cost_price: isVape ? parseFloat(costPerUnit) || 0 : 0,
            sell_price: 0,
            is_active: true,
            description: `Produced via run ${runNumber}`,
            shelf_life_days: isFoodBev && form.expiry_date ? null : null,
            tenant_id: tenantId,
          })
          .select()
          .single();
        if (niErr) throw niErr;
        finId = ni.id;
      }
      // WP-PROD-MASTER OP10: block stock movement if food QC failed
      const qcBlocked = isFoodBev && form.qc_passed === false;
      if (!qcBlocked) {
        await supabase.from("stock_movements").insert({
          item_id: finId,
          quantity: finalActual,
          movement_type: "production_in",
          reference: runNumber,
          notes: `Batch ${runNumber}: ${finishedName}`,
          tenant_id: tenantId,
        });
        const curQty = parseFloat(existingFin?.quantity_on_hand || 0);
        await supabase
          .from("inventory_items")
          .update({
            quantity_on_hand: curQty + finalActual,
            ...(isVape ? { cost_price: parseFloat(costPerUnit) || 0 } : {}),
            // WP-PROD-MASTER Session C: write AVCO cost to finished product on food BOM runs
            ...(isFoodBev && bomTotalCost > 0 && finalActual > 0
              ? {
                  weighted_avg_cost: parseFloat(
                    (bomTotalCost / finalActual).toFixed(4),
                  ),
                }
              : {}),
          })
          .eq("id", finId)
          .eq("tenant_id", tenantId);
      }
      await supabase
        .from("batches")
        .update({
          inventory_item_id: finId,
          lifecycle_status: qcBlocked ? "qc_failed" : "active",
        })
        .eq("id", batch.id)
        .eq("tenant_id", tenantId);
      // WP-PROD-MASTER OP11: yield < 85% fires PlatformBar alert for food_beverage
      const foodYieldPct =
        isFoodBev && form.yield_pct ? parseFloat(form.yield_pct) : null;
      if (isFoodBev && foodYieldPct !== null && foodYieldPct < 85) {
        await supabase.from("system_alerts").insert({
          alert_type: "yield_low",
          severity: "warning",
          message: `Recipe run ${runNumber} — batch yield ${foodYieldPct.toFixed(1)}% is below 85%. Review production notes and recipe.`,
          reference_id: runNumber,
          tenant_id: tenantId || null,
          is_acknowledged: false,
        });
      }
      setCompletedRun({
        runNumber,
        finishedName,
        finalActual,
        finId,
        sellPrice: existingFin?.sell_price || 0,
      });
    } catch (err) {
      console.error("[HQProduction] Run error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (completedRun) {
    const needsPrice = parseFloat(completedRun.sellPrice || 0) <= 0;
    return (
      <div style={{ maxWidth: "640px" }}>
        <div
          style={{
            ...sCard,
            border: `1px solid ${T.successBd}`,
            background: T.successLight,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: T.font,
              fontSize: 22,
              fontWeight: 600,
              color: T.success,
              marginBottom: 6,
            }}
          >
            Production Run Complete
          </div>
          <div
            style={{
              fontFamily: T.font,
              fontSize: 13,
              color: T.accentMid,
              marginBottom: 12,
              lineHeight: 1.7,
            }}
          >
            <strong>{completedRun.finalActual} units</strong> of{" "}
            <strong>{completedRun.finishedName}</strong> added to finished
            stock.
            <br />
            Run reference:{" "}
            <code
              style={{
                fontFamily: T.font,
                background: T.bg,
                padding: "2px 6px",
                borderRadius: 3,
              }}
            >
              {completedRun.runNumber}
            </code>
          </div>
          {needsPrice && (
            <div
              style={{
                padding: "14px 16px",
                background: T.warningLight,
                border: `1px solid ${T.warningBd}`,
                borderRadius: T.radius.md,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.warning,
                  marginBottom: 6,
                }}
              >
                Sell price not set -- product not yet visible in shop
              </div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 12,
                  color: T.ink700,
                  lineHeight: 1.6,
                }}
              >
                Go to <strong>HQ &rarr; Pricing</strong> and set a sell_price
                &gt; R0 for {completedRun.finishedName}.
              </div>
            </div>
          )}
          {!needsPrice && (
            <div
              style={{
                padding: "12px 16px",
                background: T.successLight,
                border: `1px solid ${T.successBd}`,
                borderRadius: T.radius.md,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.success,
                }}
              >
                Product is now live in the shop (sell price already set: R
                {parseFloat(completedRun.sellPrice).toFixed(0)})
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setCompletedRun(null);
                onComplete();
              }}
              style={sBtn()}
            >
              Done -- View History
            </button>
            <button
              onClick={() => setCompletedRun(null)}
              style={sBtn("outline")}
            >
              Another Run
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "20px", maxWidth: "820px" }}>
      {/* ── STEP 1: Define Run ── */}
      <div style={{ ...sCard, borderLeft: `3px solid ${T.accent}` }}>
        <div style={{ ...sLabel, marginBottom: "16px" }}>
          Step 1 -- Define Run
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            {fLabel("Format / Product Type *")}
            <select
              style={sSelect}
              value={form.format_key}
              onChange={(e) => set("format_key", e.target.value)}
            >
              {formatGroups.map((g) => (
                <optgroup key={g.groupLabel} label={g.groupLabel}>
                  {g.keys.map((k) => (
                    <option key={k} value={k}>
                      {formatCatalogue[k]?.label || k}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {fmt.custom_fill && (
            <div>
              {fLabel("Fill Volume per Chamber (ml) *")}
              <input
                style={sInput}
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 0.6"
                value={form.custom_fill_ml}
                onChange={(e) => set("custom_fill_ml", e.target.value)}
              />
            </div>
          )}
          {isVape && chambers > 1 && (
            <div
              style={{
                padding: "10px 14px",
                background: T.bg,
                borderRadius: T.radius.sm,
                fontSize: "12px",
                fontFamily: T.font,
                color: T.ink700,
                display: "flex",
                alignItems: "center",
              }}
            >
              {chambers}-Chamber:{" "}
              <strong style={{ margin: "0 4px" }}>
                {distMlPerUnit.toFixed(2)}ml distillate/unit
              </strong>{" "}
              ({fillMlPerChamber}ml &times; {chambers} chambers)
            </div>
          )}
          {showCannabisField(industryProfile, isCannabis) &&
            !isMultiChamber && (
              <div>
                {fLabel(isVape ? "Strain *" : "Strain (optional)")}
                <select
                  style={sSelect}
                  value={form.strain}
                  onChange={(e) => set("strain", e.target.value)}
                >
                  <option value="">-- Select Strain --</option>
                  {strainOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          {!isVape && (
            <div>
              {fLabel("Product Name *", "e.g. CBD Gummy Bear 25mg")}
              <input
                style={sInput}
                placeholder="Full product name"
                value={form.product_name_override}
                onChange={(e) => set("product_name_override", e.target.value)}
              />
            </div>
          )}
          <div>
            {fLabel("Units to Produce *")}
            <input
              style={sInput}
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 50"
              value={form.planned_units}
              onChange={(e) => set("planned_units", e.target.value)}
            />
          </div>
          {isVape && !isMultiChamber && (
            <div>
              {fLabel("Terpene %", `default ${fmt.terpene_pct}%`)}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                  marginBottom: "6px",
                }}
              >
                {[3, 5, 7, 10].map((pct) => {
                  const active =
                    parseFloat(form.terpene_pct_override) === pct ||
                    (!form.terpene_pct_override && fmt.terpene_pct === pct);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => set("terpene_pct_override", String(pct))}
                      style={{
                        padding: "5px 12px",
                        borderRadius: T.radius.sm,
                        cursor: "pointer",
                        fontSize: "12px",
                        fontFamily: T.font,
                        fontWeight: 700,
                        border: `1px solid ${active ? T.accentBd : T.border}`,
                        background: active ? T.accentLight : T.bg,
                        color: active ? T.accentMid : T.ink500,
                      }}
                    >
                      {pct}%
                    </button>
                  );
                })}
                <input
                  style={{
                    ...sInput,
                    width: "70px",
                    fontSize: "12px",
                    padding: "5px 8px",
                  }}
                  type="number"
                  step="0.1"
                  min="1"
                  max="20"
                  placeholder="custom"
                  value={
                    [3, 5, 7, 10].includes(
                      parseFloat(form.terpene_pct_override),
                    )
                      ? ""
                      : form.terpene_pct_override
                  }
                  onChange={(e) => set("terpene_pct_override", e.target.value)}
                />
              </div>
              {terpNeeded > 0 && planned > 0 && (
                <p
                  style={{
                    fontSize: "11px",
                    color: T.accentMid,
                    margin: "4px 0 0",
                    fontFamily: T.font,
                  }}
                >
                  {terpPct}% = {terpNeeded.toFixed(3)}ml for {planned} unit
                  {planned !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
          {/* WP-BIB S3: Food & beverage lot + expiry fields */}
          {/* WP-PROD-MASTER: General Retail Receive Form */}
          {isGeneralRetail && (
            <div style={{ ...sCard, borderLeft: `3px solid ${T.info}` }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: T.info,
                  fontFamily: T.font,
                  marginBottom: "16px",
                }}
              >
                Receive Details
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                }}
              >
                <div>
                  {fLabel("Date Received *")}
                  <input
                    style={sInput}
                    type="date"
                    value={form.receive_date}
                    onChange={(e) => set("receive_date", e.target.value)}
                  />
                </div>
                <div>
                  {fLabel("PO / Invoice Reference")}
                  <input
                    style={sInput}
                    placeholder="e.g. PO-2026-0142"
                    value={form.receive_po_ref}
                    onChange={(e) => set("receive_po_ref", e.target.value)}
                  />
                </div>
                <div>
                  {fLabel("Supplier Lot / Batch Ref")}
                  <input
                    style={sInput}
                    placeholder="e.g. SUP-LOT-0042"
                    value={form.lot_number}
                    onChange={(e) => set("lot_number", e.target.value)}
                  />
                </div>
                <div>
                  {fLabel("Expiry Date (if applicable)")}
                  <input
                    style={sInput}
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => set("expiry_date", e.target.value)}
                  />
                </div>
                <div>
                  {fLabel("Unit Cost ZAR")}
                  <input
                    style={sInput}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.unit_cost_receive}
                    onChange={(e) => set("unit_cost_receive", e.target.value)}
                  />
                  <p
                    style={{
                      fontSize: "11px",
                      color: T.ink500,
                      margin: "3px 0 0",
                      fontFamily: T.font,
                    }}
                  >
                    // AVCO_PLACEHOLDER — wire in future session
                  </p>
                </div>
              </div>
            </div>
          )}
          {isFoodBev && !isVape && (
            <>
              <div>
                {fLabel("Recipe Name")}
                <input
                  style={sInput}
                  placeholder="e.g. Classic Cold Brew Coffee"
                  value={form.recipe_name}
                  onChange={(e) => set("recipe_name", e.target.value)}
                />
              </div>
              <div>
                {fLabel("Recipe Version")}
                <input
                  style={sInput}
                  placeholder="e.g. v1.2"
                  value={form.recipe_version}
                  onChange={(e) => set("recipe_version", e.target.value)}
                />
              </div>
              <div>
                {fLabel("Lot Number *")}
                <input
                  style={sInput}
                  placeholder="e.g. BB-2026-032"
                  value={form.lot_number}
                  onChange={(e) => set("lot_number", e.target.value)}
                />
              </div>
              <div>
                {fLabel("Expiry Date *")}
                <input
                  style={sInput}
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => set("expiry_date", e.target.value)}
                />
                {!form.expiry_date && planned > 0 && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: T.danger,
                      margin: "4px 0 0",
                      fontFamily: T.font,
                    }}
                  >
                    Mandatory for food & beverage
                  </p>
                )}
              </div>
              {/* WP-PROD-MASTER: temperature zone + yield */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  {fLabel("Temperature Zone")}
                  <select
                    style={sInput}
                    value={form.temperature_zone}
                    onChange={(e) => set("temperature_zone", e.target.value)}
                  >
                    <option value="Ambient">Ambient</option>
                    <option value="Refrigerated">Refrigerated (2-8°C)</option>
                    <option value="Frozen">Frozen (-18°C)</option>
                  </select>
                </div>
                <div>
                  {fLabel("Actual Yield %")}
                  <input
                    style={sInput}
                    type="number"
                    step="0.1"
                    min="0"
                    max="200"
                    placeholder="e.g. 94.5"
                    value={form.yield_pct}
                    onChange={(e) => set("yield_pct", e.target.value)}
                  />
                  {form.yield_pct && parseFloat(form.yield_pct) < 85 && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: T.warning,
                        margin: "4px 0 0",
                        fontFamily: T.font,
                      }}
                    >
                      Below 85% — add a deviation note
                    </p>
                  )}
                </div>
              </div>
              <div>
                {fLabel("Storage Instructions")}
                <input
                  style={sInput}
                  placeholder="e.g. Keep refrigerated, consume within 3 days"
                  value={form.storage_instructions}
                  onChange={(e) => set("storage_instructions", e.target.value)}
                />
              </div>
              {/* WP-PROD-MASTER: 14-allergen declaration — SA R638 mandatory */}
              <div
                style={{
                  background: T.warningLight,
                  border: `1px solid ${T.warningBd}`,
                  borderRadius: T.radius.sm,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: T.warning,
                      fontFamily: T.font,
                    }}
                  >
                    Allergen Declaration * (SA R638)
                  </div>
                  {form.allergens_declared ? (
                    <span
                      style={{
                        fontSize: "11px",
                        color: T.success,
                        fontFamily: T.font,
                      }}
                    >
                      Declared ✓
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "11px",
                        color: T.danger,
                        fontFamily: T.font,
                      }}
                    >
                      Not yet declared
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {Object.keys(form.allergen_flags).map((allergen) => (
                    <label
                      key={allergen}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontFamily: T.font,
                        color: form.allergen_flags[allergen]
                          ? T.danger
                          : T.ink500,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.allergen_flags[allergen]}
                        onChange={(e) =>
                          set("allergen_flags", {
                            ...form.allergen_flags,
                            [allergen]: e.target.checked,
                          })
                        }
                      />
                      {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => set("allergens_declared", true)}
                  style={{
                    fontSize: "11px",
                    padding: "5px 12px",
                    background: form.allergens_declared
                      ? T.successLight
                      : T.bg,
                    border: `1px solid ${form.allergens_declared ? T.successBd : T.ink200}`,
                    borderRadius: T.radius.sm,
                    color: form.allergens_declared ? T.success : T.ink500,
                    cursor: "pointer",
                    fontFamily: T.font,
                  }}
                >
                  {form.allergens_declared
                    ? "Declaration confirmed ✓"
                    : "Confirm allergen declaration"}
                </button>
              </div>
              {/* WP-PROD-MASTER: QC passed toggle */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.sm,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: T.ink500,
                    fontFamily: T.font,
                    marginBottom: "10px",
                  }}
                >
                  Quality Control *
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => set("qc_passed", true)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: `2px solid ${form.qc_passed === true ? T.successBd : T.ink200}`,
                      borderRadius: T.radius.sm,
                      background:
                        form.qc_passed === true ? T.successLight : "#fff",
                      color: form.qc_passed === true ? T.success : T.ink500,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: T.font,
                    }}
                  >
                    QC Passed ✓
                  </button>
                  <button
                    onClick={() => set("qc_passed", false)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: `2px solid ${form.qc_passed === false ? T.dangerBd : T.ink200}`,
                      borderRadius: T.radius.sm,
                      background:
                        form.qc_passed === false ? T.dangerLight : "#fff",
                      color: form.qc_passed === false ? T.danger : T.ink500,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: T.font,
                    }}
                  >
                    QC Failed ✗
                  </button>
                </div>
                {form.qc_passed === false && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: T.danger,
                      margin: "8px 0 0",
                      fontFamily: T.font,
                    }}
                  >
                    Failed batch recorded — no stock movement created.
                  </p>
                )}
                {form.qc_passed === null && planned > 0 && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: T.danger,
                      margin: "8px 0 0",
                      fontFamily: T.font,
                    }}
                  >
                    QC status mandatory before confirming.
                  </p>
                )}
              </div>
              {/* WP-PROD-MASTER: optional compliance fields */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  {fLabel("FSCA Certificate # (optional)")}
                  <input
                    style={sInput}
                    placeholder="e.g. FSCA-2026-0123"
                    value={form.fsca_cert_number}
                    onChange={(e) => set("fsca_cert_number", e.target.value)}
                  />
                </div>
                <div>
                  {fLabel("HACCP Reference (optional)")}
                  <input
                    style={sInput}
                    placeholder="e.g. CCP-2026-03"
                    value={form.haccp_ref}
                    onChange={(e) => set("haccp_ref", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── STEP 2: Select Materials ── */}
      {isVape && !isFoodBev && !isGeneralRetail && (
        <div style={{ ...sCard, borderLeft: `3px solid ${T.info}` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Step 2 -- Select Materials
          </div>

          {/* Single-chamber: original 3-column layout (unchanged) */}
          {!isMultiChamber && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                {fLabel("Distillate *")}
                <select
                  style={sSelect}
                  value={form.distillate_item_id}
                  onChange={(e) => set("distillate_item_id", e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {distItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({parseFloat(i.quantity_on_hand || 0).toFixed(1)}
                      ml)
                    </option>
                  ))}
                </select>
                {distItems.length === 0 && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: T.danger,
                      margin: "4px 0 0",
                      fontFamily: T.font,
                    }}
                  >
                    Add distillate via Supply Chain first
                  </p>
                )}
              </div>
              <div>
                {fLabel("Terpene *")}
                <select
                  style={sSelect}
                  value={form.terpene_item_id}
                  onChange={(e) => set("terpene_item_id", e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {terpItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({parseFloat(i.quantity_on_hand || 0).toFixed(2)}
                      ml)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {fLabel("Hardware *")}
                <select
                  style={sSelect}
                  value={form.hardware_item_id}
                  onChange={(e) => set("hardware_item_id", e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {hwItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (
                      {Math.floor(parseFloat(i.quantity_on_hand || 0))} pcs)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* WP-BIB S3: Multi-chamber per-chamber selectors */}
          {isMultiChamber && (
            <div>
              {chamberData.map((ch) => (
                <div
                  key={ch.ci}
                  style={{
                    marginBottom: "14px",
                    paddingBottom: "12px",
                    borderBottom:
                      ch.ci < chambers - 1 ? `1px solid ${T.border}` : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: T.accentMid,
                      marginBottom: "10px",
                      fontFamily: T.font,
                    }}
                  >
                    Chamber {ch.ci + 1}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: showCannabisField(
                        industryProfile,
                        isCannabis,
                      )
                        ? "1fr 1fr 1fr"
                        : "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div>
                      {fLabel(
                        "Medium *",
                        ch.cMedNeeded ? `${ch.cMedNeeded}ml needed` : null,
                      )}
                      <select
                        style={{
                          ...sSelect,
                          borderColor:
                            ch.mediumId && !ch.medOk ? T.danger : T.border,
                        }}
                        value={ch.mediumId}
                        onChange={(e) =>
                          setBomSel(`ch_${ch.ci}_medium`, e.target.value)
                        }
                      >
                        <option value="">-- Select --</option>
                        {distItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (
                            {parseFloat(i.quantity_on_hand || 0).toFixed(1)}ml)
                          </option>
                        ))}
                      </select>
                      {ch.mediumId && !ch.medOk && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: T.danger,
                            margin: "4px 0 0",
                            fontFamily: T.font,
                          }}
                        >
                          Need {ch.cMedNeeded}ml -- only{" "}
                          {ch.cMedAvail.toFixed(2)}ml available
                        </p>
                      )}
                    </div>
                    <div>
                      {fLabel(
                        "Terpene *",
                        ch.cTerpNeeded ? `${ch.cTerpNeeded}ml needed` : null,
                      )}
                      <select
                        style={{
                          ...sSelect,
                          borderColor:
                            ch.terpeneId && !ch.terpOk ? T.danger : T.border,
                        }}
                        value={ch.terpeneId}
                        onChange={(e) =>
                          setBomSel(`ch_${ch.ci}_terpene`, e.target.value)
                        }
                      >
                        <option value="">-- Select --</option>
                        {terpItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (
                            {parseFloat(i.quantity_on_hand || 0).toFixed(2)}ml)
                          </option>
                        ))}
                      </select>
                      {ch.terpeneId && !ch.terpOk && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: T.danger,
                            margin: "4px 0 0",
                            fontFamily: T.font,
                          }}
                        >
                          Need {ch.cTerpNeeded}ml -- only{" "}
                          {ch.cTerpAvail.toFixed(3)}ml available
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          flexWrap: "wrap",
                          marginTop: "6px",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: T.ink500,
                            fontFamily: T.font,
                          }}
                        >
                          Terp %:
                        </span>
                        {[3, 5, 7, 10].map((pct) => {
                          const stored = parseFloat(
                            form.bom_selections[`ch_${ch.ci}_terpPct`],
                          );
                          const active =
                            stored === pct || (!stored && terpPct === pct);
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() =>
                                setBomSel(`ch_${ch.ci}_terpPct`, String(pct))
                              }
                              style={{
                                padding: "2px 8px",
                                borderRadius: T.radius.sm,
                                cursor: "pointer",
                                fontSize: "11px",
                                fontFamily: T.font,
                                fontWeight: 700,
                                border: `1px solid ${active ? T.accentBd : T.border}`,
                                background: active ? T.accentLight : T.bg,
                                color: active ? T.accentMid : T.ink500,
                              }}
                            >
                              {pct}%
                            </button>
                          );
                        })}
                        {ch.cTerpNeeded > 0 && planned > 0 && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: T.accentMid,
                              fontFamily: T.font,
                              marginLeft: "4px",
                            }}
                          >
                            = {ch.cTerpNeeded}ml
                          </span>
                        )}
                      </div>
                    </div>
                    {showCannabisField(industryProfile, isCannabis) && (
                      <div>
                        {fLabel("Strain")}
                        <select
                          style={sSelect}
                          value={ch.chStrain}
                          onChange={(e) =>
                            setBomSel(`ch_${ch.ci}_strain`, e.target.value)
                          }
                        >
                          <option value="">-- Select --</option>
                          {strainOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Hardware — shared across all chambers */}
              <div
                style={{
                  marginTop: "6px",
                  paddingTop: "12px",
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                {fLabel(
                  "Hardware *",
                  `${planned > 0 ? planned : "?"} pcs needed -- shared all chambers`,
                )}
                <select
                  style={{
                    ...sSelect,
                    borderColor:
                      hwSelId && hwSelAvail < planned ? T.danger : T.border,
                  }}
                  value={hwSelId}
                  onChange={(e) => setBomSel("hw", e.target.value)}
                >
                  <option value="">-- Select hardware --</option>
                  {hwItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (
                      {Math.floor(parseFloat(i.quantity_on_hand || 0))} pcs)
                    </option>
                  ))}
                </select>
                {hwSelId && hwSelAvail < planned && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: T.danger,
                      margin: "4px 0 0",
                      fontFamily: T.font,
                    }}
                  >
                    Need {planned} pcs -- only {hwSelAvail} available
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasBom && planned > 0 && (
        <div style={{ ...sCard, borderLeft: `3px solid ${T.info}` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Step 2 -- Bill of Materials
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
              gap: "12px",
            }}
          >
            {bomLineData.map(
              ({
                line,
                selItemId,
                selItem,
                needed,
                avail,
                ok,
                candidateItems,
              }) => (
                <div key={line.id}>
                  {fLabel(
                    `${line.notes || line.material_type} *`,
                    needed > 0 && planned > 0
                      ? `${needed.toFixed(3)} ${line.unit} needed`
                      : null,
                  )}
                  <select
                    style={{
                      ...sSelect,
                      borderColor: selItemId && !ok ? T.danger : T.border,
                    }}
                    value={selItemId}
                    onChange={(e) => setBomSel(line.id, e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {candidateItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (
                        {parseFloat(i.quantity_on_hand || 0).toFixed(2)}{" "}
                        {i.unit})
                      </option>
                    ))}
                  </select>
                  {selItemId && !ok && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: T.danger,
                        margin: "4px 0 0",
                        fontFamily: T.font,
                      }}
                    >
                      Need {needed.toFixed(3)}
                      {line.unit} -- only {avail.toFixed(2)}
                      {line.unit} available
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* WP-PROD-MASTER: Recipe Cost Calculator — food_beverage with BOM */}
      {isFoodBev && hasBom && planned > 0 && (
        <div
          style={{
            ...sCard,
            borderLeft: `3px solid ${T.accentMid}`,
            background: T.accentLight,
          }}
        >
          <div style={{ ...sLabel, color: T.accentMid, marginBottom: "16px" }}>
            Recipe Cost Calculator
          </div>
          {/* Per-ingredient cost breakdown */}
          <div style={{ marginBottom: "16px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                fontFamily: T.font,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Ingredient",
                    "Qty Needed",
                    "AVCO Cost/Unit",
                    "Line Cost",
                    "% of Total",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{ ...sTh, fontSize: "11px", padding: "6px 10px" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bomLineData.map((bl, idx) => {
                  const avco = parseFloat(
                    bl.selItem?.weighted_avg_cost ||
                      bl.selItem?.cost_price ||
                      0,
                  );
                  const pct =
                    bomTotalCost > 0
                      ? ((bl.cost / bomTotalCost) * 100).toFixed(1)
                      : "—";
                  return (
                    <tr
                      key={idx}
                      style={{ background: idx % 2 === 0 ? "#fff" : T.surface }}
                    >
                      <td
                        style={{ ...sTd, padding: "6px 10px", fontWeight: 500 }}
                      >
                        {bl.selItem?.name || bl.line.material_type || "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          padding: "6px 10px",
                          fontFamily: T.font,
                        }}
                      >
                        {bl.needed.toFixed(3)} {bl.line.unit}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          padding: "6px 10px",
                          fontFamily: T.font,
                          color: avco > 0 ? T.ink700 : T.warning,
                        }}
                      >
                        {avco > 0 ? `R${avco.toFixed(4)}` : "No AVCO"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          padding: "6px 10px",
                          fontFamily: T.font,
                          fontWeight: 600,
                          color: T.accentMid,
                        }}
                      >
                        {bl.cost > 0 ? `R${bl.cost.toFixed(2)}` : "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          padding: "6px 10px",
                          fontFamily: T.font,
                          color: T.ink500,
                        }}
                      >
                        {pct}
                        {pct !== "—" ? "%" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Summary KPI strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "1px",
              background: T.border,
              borderRadius: T.radius.sm,
              overflow: "hidden",
              border: `1px solid ${T.border}`,
            }}
          >
            {[
              [
                "Total Ingredient Cost",
                bomTotalCost > 0 ? `R${bomTotalCost.toFixed(2)}` : "—",
                bomTotalCost > 0 ? T.accentMid : T.warning,
              ],
              [
                "Cost Per Unit",
                bomTotalCost > 0 && planned > 0 ? `R${costPerUnit}` : "—",
                T.accentMid,
              ],
              ["Units Planned", String(planned), T.ink700],
              [
                "Waste %",
                foodWastePct !== null ? `${foodWastePct}%` : "Enter yield %",
                foodWastePct !== null
                  ? parseFloat(foodWastePct) > 15
                    ? T.danger
                    : parseFloat(foodWastePct) > 5
                      ? T.warning
                      : T.success
                  : T.ink500,
              ],
            ].map(([lbl, val, color]) => (
              <div
                key={lbl}
                style={{ background: T.surface, padding: "12px 14px" }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: T.ink500,
                    fontFamily: T.font,
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  {lbl}
                </div>
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: "18px",
                    fontWeight: 400,
                    color,
                    lineHeight: 1,
                  }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>
          {/* AVCO warning if any ingredient has no cost */}
          {bomLineData.some(
            (bl) => !bl.selItem?.weighted_avg_cost && !bl.selItem?.cost_price,
          ) && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px 12px",
                background: T.warningLight,
                border: `1px solid ${T.warningBd}`,
                borderRadius: T.radius.sm,
                fontSize: "11px",
                color: T.warning,
                fontFamily: T.font,
              }}
            >
              Some ingredients have no AVCO cost set — cost calculation is
              incomplete. Receive stock via a PO to set unit costs.
            </div>
          )}
        </div>
      )}

      {!isVape && !hasBom && planned > 0 && (
        <div
          style={{
            ...sCard,
            border: `1px solid ${T.warningBd}`,
            background: T.warningLight,
          }}
        >
          <div style={{ ...sLabel, color: T.warning, marginBottom: "8px" }}>
            {isFoodBev
              ? "Recipe Production -- Units Only"
              : "Non-Vape Run -- Units Only"}
          </div>
          <p
            style={{
              fontSize: "12px",
              color: T.ink700,
              margin: 0,
              fontFamily: T.font,
              lineHeight: "1.7",
            }}
          >
            No material BOM for this format. The run will create a batch record
            and add <strong>{planned} units</strong> of{" "}
            <strong>{finishedName || "product"}</strong> to finished stock.
            {isFoodBev &&
              " Add a BOM via Production > Bill of Materials to enable ingredient deductions."}
          </p>
        </div>
      )}

      {/* ── STEP 3: Multi-chamber BOM summary ── */}
      {isMultiChamber &&
        planned > 0 &&
        chamberData.some((c) => c.mediumId || c.terpeneId) && (
          <div
            style={{
              ...sCard,
              borderLeft: `3px solid ${multiChamberMatsOk ? T.success : T.warning}`,
              background: multiChamberMatsOk ? T.successLight : T.warningLight,
            }}
          >
            <div
              style={{
                ...sLabel,
                color: multiChamberMatsOk ? T.success : T.warning,
                marginBottom: "16px",
              }}
            >
              Step 3 -- Multi-Chamber Materials --{" "}
              {multiChamberMatsOk
                ? "All chambers ready"
                : "Complete all chambers to continue"}
            </div>
            {chamberData.map((ch) => (
              <div key={ch.ci} style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: T.accentMid,
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontFamily: T.font,
                  }}
                >
                  Chamber {ch.ci + 1}
                  {ch.chStrain && ` -- ${ch.chStrain}`}
                </div>
                <StockGauge
                  label={`Medium: ${ch.medItem?.name || "--"}`}
                  available={ch.cMedAvail}
                  needed={ch.cMedNeeded}
                  unit="ml"
                  color={T.info}
                />
                <StockGauge
                  label={`Terpene: ${ch.cTerpItem?.name || "--"}`}
                  available={ch.cTerpAvail}
                  needed={ch.cTerpNeeded}
                  unit="ml"
                  color={T.accentMid}
                />
              </div>
            ))}
            <StockGauge
              label={`Hardware: ${hwSelItem?.name || "--"} (all chambers)`}
              available={hwSelAvail}
              needed={planned}
              unit=" pcs"
              color="#b5935a"
            />
            <div
              style={{
                borderTop: `1px solid ${T.border}`,
                paddingTop: "14px",
                marginTop: "8px",
                display: "flex",
                gap: "32px",
                flexWrap: "wrap",
              }}
            >
              {[
                ["Output", `${planned} x ${finishedName || "--"}`, T.success],
                ["Chambers", String(chambers), T.info],
                ["Run Number", runNumber, T.ink500],
              ].map(([lbl, val, color]) => (
                <div key={lbl}>
                  <div
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: T.ink500,
                      marginBottom: "4px",
                      fontFamily: T.font,
                    }}
                  >
                    {lbl}
                  </div>
                  <div
                    style={{
                      fontSize: lbl === "Run Number" ? "13px" : "18px",
                      fontWeight: 600,
                      fontFamily: T.font,
                      color,
                    }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* ── STEP 3 (single-chamber): Stock gauges ── */}
      {!isMultiChamber &&
        isVape &&
        planned > 0 &&
        form.distillate_item_id &&
        form.terpene_item_id &&
        form.hardware_item_id &&
        distMlPerUnit > 0 && (
          <div
            style={{
              ...sCard,
              borderLeft: `3px solid ${canRun ? T.success : T.danger}`,
              background: canRun ? T.successLight : T.dangerLight,
            }}
          >
            <div
              style={{
                ...sLabel,
                color: canRun ? T.success : T.danger,
                marginBottom: "16px",
              }}
            >
              Step 3 -- Bill of Materials{" "}
              {canRun
                ? "-- All materials available"
                : "-- Insufficient materials"}
            </div>
            <StockGauge
              label="Distillate"
              available={distAvail}
              needed={distNeeded}
              unit="ml"
              color={T.info}
            />
            <StockGauge
              label={`Terpene (${selTerp?.name || "--"})`}
              available={terpAvail}
              needed={terpNeeded}
              unit="ml"
              color={T.accentMid}
            />
            <StockGauge
              label={`Hardware (${selHw?.name || "--"})`}
              available={hwAvail}
              needed={hwNeeded}
              unit=" pcs"
              color="#b5935a"
            />
            <div
              style={{
                borderTop: `1px solid ${T.border}`,
                paddingTop: "14px",
                marginTop: "8px",
                display: "flex",
                gap: "32px",
                flexWrap: "wrap",
              }}
            >
              {[
                ["Output", `${planned} x ${finishedName || "--"}`, T.success],
                ["Dist / Unit", `${distMlPerUnit.toFixed(2)}ml`, T.info],
                ["Cost / Unit", `R${costPerUnit}`, "#b5935a"],
                ["Total Material Cost", `R${totalCost.toFixed(2)}`, T.info],
                ["Run Number", runNumber, T.ink500],
              ].map(([lbl, val, color]) => (
                <div key={lbl}>
                  <div
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: T.ink500,
                      marginBottom: "4px",
                      fontFamily: T.font,
                    }}
                  >
                    {lbl}
                  </div>
                  <div
                    style={{
                      fontSize: lbl === "Run Number" ? "13px" : "18px",
                      fontWeight: 600,
                      fontFamily: T.font,
                      color,
                    }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* ── Confirm & Log ── */}
      {canRun && (
        <div style={{ ...sCard, borderLeft: `3px solid #b5935a` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Step {isVape ? "4" : "3"} -- Confirm & Log
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              {fLabel("Actual Units Filled", `planned: ${planned}`)}
              <input
                style={sInput}
                type="number"
                min="1"
                step="1"
                placeholder={String(planned)}
                value={form.actual_units}
                onChange={(e) => set("actual_units", e.target.value)}
              />
              {form.actual_units && yieldFlagged && (
                <p
                  style={{
                    fontSize: "11px",
                    color: T.warning,
                    margin: "4px 0 0",
                    fontFamily: T.font,
                  }}
                >
                  Yield {yieldPct}% -- below 95% threshold
                </p>
              )}
            </div>
            <div>
              {fLabel("Notes")}
              <input
                style={sInput}
                placeholder="Optional batch notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
          {!confirmed && (
            <div
              style={{
                padding: "14px 16px",
                background: T.bg,
                borderRadius: T.radius.sm,
                marginBottom: "14px",
                fontSize: "13px",
                fontFamily: T.font,
                color: T.ink700,
              }}
            >
              <strong>This will:</strong>
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: "18px",
                  lineHeight: "1.9",
                }}
              >
                {hasBom &&
                  bomLineData.map((bl) => (
                    <li key={bl.line.id}>
                      Deduct{" "}
                      <strong>
                        {bl.needed.toFixed(3)}
                        {bl.line.unit}
                      </strong>{" "}
                      from {bl.selItem?.name || bl.line.material_type}
                    </li>
                  ))}
                {isVape &&
                  !hasBom &&
                  isMultiChamber &&
                  chamberData.map((ch) => (
                    <React.Fragment key={ch.ci}>
                      <li>
                        Ch{ch.ci + 1}: Deduct <strong>{ch.cMedNeeded}ml</strong>{" "}
                        from {ch.medItem?.name || "medium"}
                        {ch.chStrain ? ` (${ch.chStrain})` : ""}
                      </li>
                      <li>
                        Ch{ch.ci + 1}: Deduct{" "}
                        <strong>{ch.cTerpNeeded}ml</strong> from{" "}
                        {ch.cTerpItem?.name || "terpene"}
                      </li>
                    </React.Fragment>
                  ))}
                {isVape && !hasBom && isMultiChamber && hwSelItem && (
                  <li>
                    Deduct <strong>{planned} pcs</strong> hardware from{" "}
                    {hwSelItem.name}
                  </li>
                )}
                {isVape && !hasBom && !isMultiChamber && (
                  <>
                    <li>
                      Deduct <strong>{distNeeded}ml</strong> from{" "}
                      {selDist?.name}
                    </li>
                    <li>
                      Deduct <strong>{terpNeeded.toFixed(3)}ml</strong> from{" "}
                      {selTerp?.name}
                    </li>
                    <li>
                      Deduct <strong>{hwNeeded} pcs</strong> from {selHw?.name}
                    </li>
                  </>
                )}
                <li>
                  Add <strong>{finalActual} units</strong> of {finishedName} to
                  finished stock
                </li>
                <li>Create batch record + production run log</li>
                {isFoodBev && form.lot_number && (
                  <li>
                    Record lot number: <strong>{form.lot_number}</strong>
                  </li>
                )}
                {isFoodBev && form.expiry_date && (
                  <li>
                    Set expiry date: <strong>{form.expiry_date}</strong>
                  </li>
                )}
                {isMultiChamber && (
                  <li>Store per-chamber cannabinoid profile on batch record</li>
                )}
                <li>
                  Link batch to inventory item (enables live stock tracking)
                </li>
              </ul>
            </div>
          )}
          <div style={{ display: "flex", gap: "10px" }}>
            {!confirmed ? (
              <button onClick={() => setConfirmed(true)} style={sBtn()}>
                Review & Confirm &rarr;
              </button>
            ) : (
              <>
                <button
                  onClick={() => setConfirmed(false)}
                  style={sBtn("outline")}
                >
                  &larr; Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  style={{
                    ...sBtn(),
                    background: saving ? T.ink500 : T.accent,
                    minWidth: "180px",
                  }}
                >
                  {saving ? "Processing..." : "Confirm Production Run"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────
function HistoryPanel({ runs, onRefresh, industryProfile }) {
  const { tenantId } = useTenant();
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [reverseStock, setReverseStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  // WP-PROD-MASTER Session C — recipe version history expand state
  const [showVerHist, setShowVerHist] = useState({});

  const openEdit = (run) => {
    setEditing(run.id);
    setEditForm({
      notes: run.notes || "",
      actual_units: run.actual_units || run.planned_units || "",
      status: run.status || "completed",
    });
    setExpanded(run.id);
  };

  const handleSaveEdit = async (run) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("production_runs")
        .update({
          notes: editForm.notes || null,
          actual_units: parseInt(editForm.actual_units) || run.planned_units,
          status: editForm.status,
        })
        .eq("id", run.id);
      if (error) throw error;
      setEditing(null);
      onRefresh();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = async (run) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("production_runs")
        .update({ status: "cancelled" })
        .eq("id", run.id);
      if (error) throw error;
      setCancelling(null);
      onRefresh();
    } catch (err) {
      showToast("Cancel failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (run) => {
    setSaving(true);
    try {
      if (reverseStock) {
        const { data: mvs } = await supabase
          .from("stock_movements")
          .select("id,item_id,quantity,movement_type")
          .eq("reference", run.run_number)
          .eq("tenant_id", tenantId);
        if (mvs?.length > 0) {
          for (const mv of mvs) {
            const rev = -mv.quantity;
            await supabase.from("stock_movements").insert({
              item_id: mv.item_id,
              quantity: rev,
              movement_type: "adjustment",
              reference: `VOID-${run.run_number}`,
              notes: `Reversal: deleted run ${run.run_number}`,
              tenant_id: tenantId,
            });
            const { data: item } = await supabase
              .from("inventory_items")
              .select("quantity_on_hand")
              .eq("id", mv.item_id)
              .eq("tenant_id", tenantId)
              .single();
            await supabase
              .from("inventory_items")
              .update({
                quantity_on_hand: Math.max(
                  0,
                  parseFloat(item.quantity_on_hand || 0) + rev,
                ),
              })
              .eq("id", mv.item_id)
              .eq("tenant_id", tenantId);
          }
        }
      }
      await supabase
        .from("production_run_inputs")
        .delete()
        .eq("run_id", run.id);
      await supabase.from("production_runs").delete().eq("id", run.id);
      setDeleting(null);
      onRefresh();
      showToast(
        `Run ${run.run_number} deleted.${reverseStock ? " Stock reversed." : ""}`,
      );
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const ALL_STATUSES = ["planned", "in_progress", "completed", "cancelled"];

  return (
    <div>
      {toast && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: "12px",
            borderRadius: T.radius.sm,
            fontSize: "12px",
            fontFamily: T.font,
            fontWeight: 500,
            background: toast.type === "error" ? T.dangerLight : T.successLight,
            color: toast.type === "error" ? T.danger : T.success,
            border: `1px solid ${toast.type === "error" ? T.dangerBd : T.successBd}`,
          }}
        >
          {toast.type === "error" ? "✗ " : "✓ "}
          {toast.msg}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div
          style={{ fontSize: "11px", color: T.ink500, fontFamily: T.font }}
        >
          {runs.length} production runs
        </div>
        <button
          onClick={onRefresh}
          style={{ ...sBtn("outline"), fontSize: "11px", padding: "6px 12px" }}
        >
          Refresh
        </button>
      </div>
      {runs.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            padding: "60px",
            color: T.ink500,
          }}
        >
          <p style={{ fontFamily: T.font, fontSize: "14px" }}>
            {industryProfile === "food_beverage"
              ? `No recipe runs yet. Use "Start Recipe Run" to log your first batch.`
              : industryProfile === "general_retail"
                ? `No receives yet. Use "Receive Stock" to log your first shipment.`
                : `No production runs yet. Use "New Production Run" to log your first batch.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {runs.map((run) => {
            const yp =
              run.actual_units && run.planned_units
                ? calcYield(run.actual_units, run.planned_units)
                : null;
            const isOpen = expanded === run.id,
              isEditing = editing === run.id,
              isDeleting = deleting === run.id;
            const productLabel =
              run.batches?.product_name ||
              run.batches?.strain ||
              run.run_number ||
              "Production Run";
            const isCancelled = run.status === "cancelled";
            return (
              <div
                key={run.id}
                style={{
                  ...sCard,
                  borderLeft: `3px solid ${isCancelled ? T.ink300 : yp && yp < 95 ? T.warning : T.success}`,
                  opacity: isCancelled ? 0.75 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        fontFamily: T.font,
                        color: T.ink900,
                      }}
                    >
                      {productLabel}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: T.ink500,
                        fontFamily: T.font,
                        marginTop: "2px",
                      }}
                    >
                      {run.run_number || run.id?.slice(0, 8)}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <StatusBadge status={run.status} yieldPct={yp} />
                    <span
                      style={{
                        fontSize: "11px",
                        color: T.ink500,
                        fontFamily: T.font,
                      }}
                    >
                      {new Date(run.created_at).toLocaleDateString("en-ZA")}
                    </span>
                    <button
                      onClick={() => openEdit(run)}
                      style={{
                        ...sBtn("outline"),
                        padding: "4px 10px",
                        fontSize: "11px",
                      }}
                    >
                      Edit
                    </button>
                    {!isCancelled && cancelling !== run.id && (
                      <button
                        onClick={() => setCancelling(run.id)}
                        style={{
                          ...sBtn("outline"),
                          padding: "4px 10px",
                          fontSize: "11px",
                          color: T.warning,
                          borderColor: T.warningBd,
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    {cancelling === run.id && (
                      <>
                        <span
                          style={{
                            fontSize: "11px",
                            color: T.warning,
                            fontFamily: T.font,
                          }}
                        >
                          Cancel?
                        </span>
                        <button
                          onClick={() => handleCancel(run)}
                          disabled={saving}
                          style={{
                            ...sBtn("outline"),
                            padding: "4px 10px",
                            fontSize: "11px",
                            color: T.danger,
                            borderColor: T.dangerBd,
                          }}
                        >
                          {saving ? "..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setCancelling(null)}
                          style={{
                            ...sBtn("outline"),
                            padding: "4px 10px",
                            fontSize: "11px",
                          }}
                        >
                          No
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setDeleting(run.id);
                        setExpanded(run.id);
                        setReverseStock(true);
                      }}
                      style={{
                        ...sBtn("outline"),
                        padding: "4px 10px",
                        fontSize: "11px",
                        color: T.danger,
                        borderColor: T.dangerBd,
                      }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setExpanded(isOpen ? null : run.id)}
                      style={{
                        ...sBtn("outline"),
                        padding: "4px 10px",
                        fontSize: "11px",
                      }}
                    >
                      {isOpen ? "▲ Hide" : "▼ Details"}
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "32px",
                    marginTop: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    ["Planned", run.planned_units || "—", "units"],
                    ["Actual", run.actual_units || "—", "units"],
                    ["Yield", yp ? `${yp}%` : "—", ""],
                  ].map(([lbl, val, unit]) => (
                    <div key={lbl}>
                      <div
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: T.ink500,
                          fontFamily: T.font,
                        }}
                      >
                        {lbl}
                      </div>
                      <div
                        style={{
                          fontFamily: T.font,
                          fontSize: "20px",
                          fontWeight: 400,
                          color:
                            lbl === "Yield" && yp && yp < 95
                              ? T.warning
                              : T.ink900,
                          lineHeight: 1,
                        }}
                      >
                        {val}
                        <span
                          style={{
                            fontSize: "12px",
                            color: T.ink500,
                            marginLeft: "2px",
                          }}
                        >
                          {unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {yp !== null && yp < 95 && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      background: T.warningLight,
                      border: `1px solid ${T.warningBd}`,
                      borderRadius: T.radius.sm,
                      fontSize: "12px",
                      color: T.warning,
                      fontFamily: T.font,
                    }}
                  >
                    Yield {yp}% — below 95% threshold.
                  </div>
                )}
                {isOpen && (
                  <div
                    style={{
                      marginTop: "14px",
                      borderTop: `1px solid ${T.border}`,
                      paddingTop: "14px",
                    }}
                  >
                    {isDeleting && (
                      <div
                        style={{
                          padding: "16px",
                          background: T.dangerLight,
                          border: `1px solid ${T.dangerBd}`,
                          borderRadius: T.radius.sm,
                          marginBottom: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: T.danger,
                            fontFamily: T.font,
                            marginBottom: "10px",
                          }}
                        >
                          Delete Run {run.run_number}?
                        </div>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            marginBottom: "14px",
                            fontSize: "12px",
                            fontFamily: T.font,
                            color: T.ink900,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={reverseStock}
                            onChange={(e) => setReverseStock(e.target.checked)}
                            style={{ width: "15px", height: "15px" }}
                          />
                          <span>
                            <strong>Reverse stock movements</strong> — restore
                            raw materials + deduct finished goods
                          </span>
                        </label>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={() => handleDelete(run)}
                            disabled={saving}
                            style={{ ...sBtn("danger"), minWidth: "140px" }}
                          >
                            {saving ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            onClick={() => setDeleting(null)}
                            style={sBtn("outline")}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {isEditing && (
                      <div
                        style={{
                          padding: "16px",
                          background: T.accentLight,
                          border: `1px solid ${T.accentBd}`,
                          borderRadius: T.radius.sm,
                          marginBottom: "14px",
                        }}
                      >
                        <div style={{ ...sLabel, marginBottom: "14px" }}>
                          Edit Run
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: "12px",
                            marginBottom: "12px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                color: T.ink500,
                                display: "block",
                                marginBottom: "4px",
                                fontFamily: T.font,
                              }}
                            >
                              Actual Units
                            </label>
                            <input
                              style={sInput}
                              type="number"
                              min="0"
                              value={editForm.actual_units}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  actual_units: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                color: T.ink500,
                                display: "block",
                                marginBottom: "4px",
                                fontFamily: T.font,
                              }}
                            >
                              Status
                            </label>
                            <select
                              style={sSelect}
                              value={editForm.status}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  status: e.target.value,
                                }))
                              }
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() +
                                    s.slice(1).replace("_", " ")}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "11px",
                                color: T.ink500,
                                display: "block",
                                marginBottom: "4px",
                                fontFamily: T.font,
                              }}
                            >
                              Notes
                            </label>
                            <input
                              style={sInput}
                              placeholder="Optional notes"
                              value={editForm.notes}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  notes: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={() => handleSaveEdit(run)}
                            disabled={saving}
                            style={sBtn()}
                          >
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            style={sBtn("outline")}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {run.production_run_inputs?.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(180px,1fr))",
                          gap: "10px",
                        }}
                      >
                        {run.production_run_inputs.map((inp) => (
                          <div
                            key={inp.id}
                            style={{
                              padding: "10px 14px",
                              background: T.bg,
                              border: `1px solid ${T.border}`,
                              borderRadius: T.radius.sm,
                            }}
                          >
                            <div
                              style={{
                                fontSize: "11px",
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                color: T.ink500,
                                fontFamily: T.font,
                                fontWeight: 700,
                              }}
                            >
                              {inp.inventory_items?.name || "Material"}
                            </div>
                            <div
                              style={{
                                fontFamily: T.font,
                                fontSize: "16px",
                                fontWeight: 400,
                                color: T.ink900,
                                marginTop: "4px",
                              }}
                            >
                              {parseFloat(
                                inp.quantity_actual ||
                                  inp.quantity_planned ||
                                  0,
                              ).toFixed(3)}
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: T.ink500,
                                  marginLeft: "3px",
                                }}
                              >
                                {inp.inventory_items?.unit || ""}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {run.notes && !isEditing && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: T.ink500,
                          fontStyle: "italic",
                          margin: "10px 0 0",
                          fontFamily: T.font,
                        }}
                      >
                        {run.notes}
                      </p>
                    )}
                    {/* WP-PROD-MASTER: food_beverage detail panel */}
                    {industryProfile === "food_beverage" && !isEditing && (
                      <div
                        style={{
                          marginTop: "14px",
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        {/* Recipe + Lot strip */}
                        <div
                          style={{
                            display: "flex",
                            gap: "24px",
                            flexWrap: "wrap",
                            padding: "12px 14px",
                            background: T.bg,
                            borderRadius: T.radius.sm,
                            border: `1px solid ${T.border}`,
                          }}
                        >
                          {[
                            ["Recipe", run.recipe_name || "—"],
                            ["Version", run.recipe_version || "—"],
                            ["Lot #", run.batch_lot_number || "—"],
                            [
                              "Expiry",
                              run.expiry_date
                                ? new Date(run.expiry_date).toLocaleDateString(
                                    "en-ZA",
                                  )
                                : "—",
                            ],
                            ["Temp Zone", run.temperature_zone || "—"],
                            [
                              "Yield %",
                              run.yield_pct
                                ? `${parseFloat(run.yield_pct).toFixed(1)}%`
                                : "—",
                            ],
                          ].map(([lbl, val]) => (
                            <div key={lbl}>
                              <div
                                style={{
                                  fontSize: "11px",
                                  letterSpacing: "0.15em",
                                  textTransform: "uppercase",
                                  color: T.ink500,
                                  fontFamily: T.font,
                                  fontWeight: 700,
                                  marginBottom: "3px",
                                }}
                              >
                                {lbl}
                              </div>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontFamily: T.font,
                                  color: T.ink900,
                                  fontWeight: 500,
                                }}
                              >
                                {val}
                              </div>
                            </div>
                          ))}
                          {/* QC badge */}
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                color: T.ink500,
                                fontFamily: T.font,
                                fontWeight: 700,
                                marginBottom: "3px",
                              }}
                            >
                              QC
                            </div>
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "2px 10px",
                                borderRadius: T.radius.sm,
                                fontWeight: 700,
                                fontFamily: T.font,
                                background:
                                  run.qc_passed === true
                                    ? T.successLight
                                    : run.qc_passed === false
                                      ? T.dangerLight
                                      : T.bg,
                                color:
                                  run.qc_passed === true
                                    ? T.success
                                    : run.qc_passed === false
                                      ? T.danger
                                      : T.ink500,
                                border: `1px solid ${run.qc_passed === true ? T.successBd : run.qc_passed === false ? T.dangerBd : T.border}`,
                              }}
                            >
                              {run.qc_passed === true
                                ? "Passed ✓"
                                : run.qc_passed === false
                                  ? "Failed ✗"
                                  : "Not set"}
                            </span>
                          </div>
                        </div>
                        {/* Recipe version history — WP-PROD-MASTER Session C */}
                        {run.recipe_name &&
                          (() => {
                            const sameRecipe = runs
                              .filter(
                                (r) =>
                                  r.recipe_name === run.recipe_name &&
                                  r.id !== run.id,
                              )
                              .sort(
                                (a, b) =>
                                  new Date(b.created_at) -
                                  new Date(a.created_at),
                              );
                            if (sameRecipe.length === 0) return null;
                            return (
                              <div style={{ marginTop: "10px" }}>
                                <button
                                  onClick={() =>
                                    setShowVerHist((p) => ({
                                      ...p,
                                      [run.id]: !p[run.id],
                                    }))
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    fontFamily: T.font,
                                    fontWeight: 700,
                                    color: T.accent,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {showVerHist[run.id]
                                    ? "\u25b2 Hide"
                                    : "\u25bc Show"}{" "}
                                  Version History ({sameRecipe.length})
                                </button>
                                {showVerHist[run.id] && (
                                  <div
                                    style={{
                                      marginTop: "8px",
                                      border: `1px solid ${T.border}`,
                                      borderRadius: T.radius.sm,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr 1fr",
                                        padding: "6px 10px",
                                        background: T.bg,
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        color: T.ink500,
                                        fontFamily: T.font,
                                      }}
                                    >
                                      <span>Version</span>
                                      <span>Lot #</span>
                                      <span>Yield %</span>
                                      <span>Date</span>
                                    </div>
                                    {sameRecipe.map((r) => (
                                      <div
                                        key={r.id}
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "1fr 1fr 1fr 1fr",
                                          padding: "8px 10px",
                                          borderTop: `1px solid ${T.border}`,
                                          fontSize: "12px",
                                          fontFamily: T.font,
                                          color: T.ink700,
                                        }}
                                      >
                                        <span>
                                          {r.recipe_version || "\u2014"}
                                        </span>
                                        <span>
                                          {r.batch_lot_number || "\u2014"}
                                        </span>
                                        <span>
                                          {r.yield_pct
                                            ? `${parseFloat(r.yield_pct).toFixed(1)}%`
                                            : "\u2014"}
                                        </span>
                                        <span>
                                          {r.created_at
                                            ? new Date(
                                                r.created_at,
                                              ).toLocaleDateString("en-ZA")
                                            : "\u2014"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        {/* Allergen summary */}
                        {run.allergen_flags &&
                          Object.values(run.allergen_flags).some(Boolean) && (
                            <div
                              style={{
                                padding: "10px 14px",
                                background: T.warningLight,
                                border: `1px solid ${T.warningBd}`,
                                borderRadius: T.radius.sm,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "11px",
                                  letterSpacing: "0.15em",
                                  textTransform: "uppercase",
                                  color: T.warning,
                                  fontFamily: T.font,
                                  fontWeight: 700,
                                  marginBottom: "8px",
                                }}
                              >
                                Contains Allergens (SA R638)
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                {Object.entries(run.allergen_flags)
                                  .filter(([, v]) => v)
                                  .map(([allergen]) => (
                                    <span
                                      key={allergen}
                                      style={{
                                        fontSize: "11px",
                                        padding: "2px 8px",
                                        borderRadius: T.radius.sm,
                                        background: T.dangerLight,
                                        color: T.danger,
                                        border: `1px solid ${T.dangerBd}`,
                                        fontWeight: 600,
                                        fontFamily: T.font,
                                        textTransform: "capitalize",
                                      }}
                                    >
                                      {allergen}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        {/* FSCA + HACCP */}
                        {(run.fsca_cert_number ||
                          run.haccp_ref ||
                          run.storage_instructions) && (
                          <div
                            style={{
                              display: "flex",
                              gap: "24px",
                              flexWrap: "wrap",
                              padding: "10px 14px",
                              background: T.infoLight,
                              border: `1px solid ${T.infoBd}`,
                              borderRadius: T.radius.sm,
                            }}
                          >
                            {run.fsca_cert_number && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    letterSpacing: "0.15em",
                                    textTransform: "uppercase",
                                    color: T.info,
                                    fontFamily: T.font,
                                    fontWeight: 700,
                                    marginBottom: "3px",
                                  }}
                                >
                                  FSCA Cert #
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    fontFamily: T.font,
                                    color: T.ink700,
                                  }}
                                >
                                  {run.fsca_cert_number}
                                </div>
                              </div>
                            )}
                            {run.haccp_ref && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    letterSpacing: "0.15em",
                                    textTransform: "uppercase",
                                    color: T.info,
                                    fontFamily: T.font,
                                    fontWeight: 700,
                                    marginBottom: "3px",
                                  }}
                                >
                                  HACCP Ref
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    fontFamily: T.font,
                                    color: T.ink700,
                                  }}
                                >
                                  {run.haccp_ref}
                                </div>
                              </div>
                            )}
                            {run.storage_instructions && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    letterSpacing: "0.15em",
                                    textTransform: "uppercase",
                                    color: T.info,
                                    fontFamily: T.font,
                                    fontWeight: 700,
                                    marginBottom: "3px",
                                  }}
                                >
                                  Storage
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    fontFamily: T.font,
                                    color: T.ink700,
                                  }}
                                >
                                  {run.storage_instructions}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Allocate Panel ───────────────────────────────────────────────────────────
function AllocatePanel({ items, partners, batches, onRefresh }) {
  const { tenantId } = useTenant();
  const finished = items.filter(
    (i) =>
      i.category === "finished_product" &&
      parseFloat(i.quantity_on_hand || 0) > 0,
  );
  const [form, setForm] = useState({
    item_id: "",
    quantity: "",
    channel: "wholesale",
    partner_id: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const selItem = finished.find((i) => i.id === form.item_id);
  const available = parseFloat(selItem?.quantity_on_hand || 0);
  const qty = parseInt(form.quantity) || 0;
  const valid = qty > 0 && qty <= available && form.item_id;
  const CHANNELS = [
    {
      id: "wholesale",
      label: "Wholesale",
      desc: "Allocate to a retail partner",
    },
    { id: "samples", label: "Samples", desc: "Internal / giveaway units" },
    { id: "write_off", label: "Write Off", desc: "Damaged or destroyed units" },
  ];

  const handleAllocate = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const partner = partners.find((p) => p.id === form.partner_id);
      const ref =
        form.channel === "wholesale" && partner
          ? partner.business_name
          : form.channel;
      await supabase.from("stock_movements").insert({
        item_id: form.item_id,
        quantity: -qty,
        movement_type: "sale_out",
        reference: ref,
        notes: form.notes || `Allocated to ${ref}`,
        tenant_id: tenantId,
      });
      const newQty = available - qty;
      await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: newQty })
        .eq("id", form.item_id)
        .eq("tenant_id", tenantId);
      const linkedBatch = batches.find(
        (b) =>
          b.inventory_item_id === form.item_id ||
          (b.category === "finished_product" &&
            b.product_name === selItem?.name),
      );
      if (linkedBatch && newQty <= 0) {
        await supabase
          .from("batches")
          .update({ lifecycle_status: "depleted" })
          .eq("id", linkedBatch.id)
          .eq("tenant_id", tenantId);
      } else if (
        linkedBatch &&
        newQty <= (linkedBatch.low_stock_threshold || 10)
      ) {
        await supabase
          .from("batches")
          .update({ lifecycle_status: "low_stock" })
          .eq("id", linkedBatch.id)
          .eq("tenant_id", tenantId);
      }
      setForm({
        item_id: "",
        quantity: "",
        channel: "wholesale",
        partner_id: "",
        notes: "",
      });
      onRefresh();
    } catch (err) {
      console.error("[HQProduction] Allocate error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: "12px",
        }}
      >
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            onClick={() => set("channel", ch.id)}
            style={{
              ...sCard,
              cursor: "pointer",
              borderLeft: `3px solid ${form.channel === ch.id ? T.accent : T.border}`,
              background: form.channel === ch.id ? T.accentLight : "#fff",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: T.font,
                color: T.ink900,
              }}
            >
              {ch.label}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: T.ink500,
                fontFamily: T.font,
                marginTop: "3px",
              }}
            >
              {ch.desc}
            </div>
          </div>
        ))}
      </div>
      <div style={sCard}>
        <div style={sLabel}>Available Finished Stock</div>
        {finished.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: T.ink500,
              marginTop: "10px",
              fontFamily: T.font,
            }}
          >
            No finished products in stock.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: T.font,
              marginTop: "10px",
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Product</th>
                <th style={sTh}>SKU</th>
                <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                <th style={{ ...sTh, textAlign: "right" }}>Sell Price</th>
              </tr>
            </thead>
            <tbody>
              {finished.map((i) => (
                <tr
                  key={i.id}
                  onClick={() => set("item_id", i.id)}
                  style={{
                    cursor: "pointer",
                    background:
                      form.item_id === i.id ? T.accentLight : "transparent",
                  }}
                >
                  <td style={{ ...sTd, fontWeight: 500 }}>
                    {form.item_id === i.id && (
                      <span style={{ color: T.accent, marginRight: "6px" }}>
                        ►
                      </span>
                    )}
                    {i.name}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: T.font,
                      fontSize: "11px",
                      color: T.ink500,
                    }}
                  >
                    {i.sku}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.font,
                      fontWeight: 600,
                      color: T.success,
                    }}
                  >
                    {Math.floor(parseFloat(i.quantity_on_hand || 0))} pcs
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.font,
                    }}
                  >
                    R{parseFloat(i.sell_price || 0).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {form.item_id && (
        <div style={{ ...sCard, borderLeft: `3px solid #b5935a` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Allocate: {selItem?.name} — {Math.floor(available)} units available
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: T.ink500,
                  display: "block",
                  marginBottom: "4px",
                  fontFamily: T.font,
                }}
              >
                Quantity *
              </label>
              <input
                style={sInput}
                type="number"
                min="1"
                max={Math.floor(available)}
                step="1"
                placeholder={`Max: ${Math.floor(available)}`}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
            {form.channel === "wholesale" && (
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: T.ink500,
                    display: "block",
                    marginBottom: "4px",
                    fontFamily: T.font,
                  }}
                >
                  Wholesale Partner
                </label>
                <select
                  style={sSelect}
                  value={form.partner_id}
                  onChange={(e) => set("partner_id", e.target.value)}
                >
                  <option value="">— Select Partner —</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.business_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                color: T.ink500,
                display: "block",
                marginBottom: "4px",
                fontFamily: T.font,
              }}
            >
              Notes
            </label>
            <input
              style={sInput}
              placeholder="Delivery ref, order #, etc."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {qty > 0 && (
            <div
              style={{
                padding: "12px 14px",
                background: T.bg,
                borderRadius: T.radius.sm,
                marginBottom: "12px",
                fontSize: "12px",
                fontFamily: T.font,
                color: T.ink700,
              }}
            >
              <strong>
                {qty} × {selItem.name}
              </strong>{" "}
              → {CHANNELS.find((c) => c.id === form.channel)?.label}
              {qty > available && (
                <span
                  style={{
                    color: T.danger,
                    marginLeft: "8px",
                    fontWeight: 600,
                  }}
                >
                  Exceeds stock
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleAllocate}
            disabled={saving || !valid}
            style={{ ...sBtn(), opacity: valid ? 1 : 0.5 }}
          >
            {saving ? "Recording..." : `Allocate ${qty || "?"} Units`}
          </button>
        </div>
      )}
      <SetPricePanel items={items} onRefresh={onRefresh} />
    </div>
  );
}

// ─── Audit Panel ──────────────────────────────────────────────────────────────
function AuditPanel({ batches }) {
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [recallBatchId, setRecallBatchId] = useState(null);
  const [recallLoading, setRecallLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAudit = async () => {
    setLoading(true);
    try {
      const { data: qrs, error } = await supabase
        .from("qr_codes")
        .select(
          `id,qr_code,qr_type,claimed,claimed_by,claimed_at,scan_count,points_value,is_active,created_at,batch_id,batches(id,batch_number,product_name,strain,product_type,production_date,expiry_date,lab_certified,lab_name,units_produced,status)`,
        )
        .not("batch_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const qrIds = (qrs || []).map((q) => q.id);
      let scanMap = {};
      if (qrIds.length > 0) {
        const { data: scans } = await supabase
          .from("scan_logs")
          .select(
            "qr_code_id,scan_outcome,scanned_at,user_id,ip_city,ip_province",
          )
          .in("qr_code_id", qrIds)
          .order("scanned_at", { ascending: false });
        for (const s of scans || []) {
          if (!scanMap[s.qr_code_id]) scanMap[s.qr_code_id] = [];
          scanMap[s.qr_code_id].push(s);
        }
      }
      setAuditData(
        (qrs || []).map((q) => ({ ...q, scans: scanMap[q.id] || [] })),
      );
      setLoaded(true);
    } catch (err) {
      showToast("Failed to load audit data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!auditData.length) return;
    const headers = [
      "Batch #",
      "Product",
      "Strain",
      "Product Type",
      "Production Date",
      "Expiry Date",
      "Lab Certified",
      "Lab Name",
      "Units Produced",
      "Batch Status",
      "QR Code",
      "QR Type",
      "QR Active",
      "Claimed",
      "Claimed At",
      "Total Scans",
      "Points Value",
      "QR Created At",
    ];
    const rows = auditData.map((r) => [
      r.batches?.batch_number || "",
      r.batches?.product_name || "",
      r.batches?.strain || "",
      r.batches?.product_type || "",
      r.batches?.production_date || "",
      r.batches?.expiry_date || "",
      r.batches?.lab_certified ? "YES" : "NO",
      r.batches?.lab_name || "",
      r.batches?.units_produced || "",
      r.batches?.status || "",
      r.qr_code,
      r.qr_type,
      r.is_active ? "YES" : "NO",
      r.claimed ? "YES" : "NO",
      r.claimed_at || "",
      r.scan_count || 0,
      r.points_value || 0,
      r.created_at || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `protea-batch-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported successfully");
  };

  const handleRecall = async (batchId, batchNumber) => {
    if (
      !window.confirm(
        `Flag ALL QR codes from batch ${batchNumber} as INACTIVE?\n\nThis is a quality recall action.`,
      )
    )
      return;
    setRecallLoading(true);
    try {
      const { data, error } = await supabase
        .from("qr_codes")
        .update({ is_active: false })
        .eq("batch_id", batchId)
        .select("id");
      if (error) throw error;
      showToast(
        `${data?.length || 0} QR codes from ${batchNumber} flagged inactive`,
      );
      await loadAudit();
    } catch (err) {
      showToast("Recall failed: " + err.message, "error");
    } finally {
      setRecallLoading(false);
      setRecallBatchId(null);
    }
  };

  const byBatch = {};
  for (const row of auditData) {
    const bid = row.batches?.batch_number || row.batch_id;
    if (!byBatch[bid])
      byBatch[bid] = { batch: row.batches, batch_id: row.batch_id, qrs: [] };
    byBatch[bid].qrs.push(row);
  }

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {toast && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: T.radius.sm,
            fontSize: "12px",
            fontFamily: T.font,
            fontWeight: 500,
            background: toast.type === "error" ? T.dangerLight : T.successLight,
            color: toast.type === "error" ? T.danger : T.success,
            border: `1px solid ${toast.type === "error" ? T.dangerBd : T.successBd}`,
          }}
        >
          {toast.type === "error" ? "✗ " : "✓ "}
          {toast.msg}
        </div>
      )}
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.infoBd}`,
          borderLeft: `3px solid ${T.info}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ ...sLabel, color: T.info }}>
              Regulatory Audit Export
            </div>
            <p
              style={{
                fontSize: "13px",
                color: T.ink500,
                margin: "6px 0 0",
                fontFamily: T.font,
                lineHeight: "1.6",
              }}
            >
              Full traceability chain: Batch → QR codes → Scans → Customers.
              Export CSV for regulatory compliance.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {!loaded ? (
              <button
                onClick={loadAudit}
                disabled={loading}
                style={{
                  ...sBtn(),
                  background: loading ? T.ink500 : T.info,
                  minWidth: "140px",
                }}
              >
                {loading ? "Loading..." : "Load Audit Data"}
              </button>
            ) : (
              <>
                <button
                  onClick={loadAudit}
                  disabled={loading}
                  style={{
                    ...sBtn("outline"),
                    fontSize: "11px",
                    padding: "6px 12px",
                  }}
                >
                  Refresh
                </button>
                <button onClick={exportCSV} style={sBtn()}>
                  Export CSV
                </button>
              </>
            )}
          </div>
        </div>
        {loaded && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
              gap: "1px",
              background: T.border,
              borderRadius: T.radius.sm,
              overflow: "hidden",
              border: `1px solid ${T.border}`,
              marginTop: "16px",
            }}
          >
            {[
              {
                label: "Batches",
                value: Object.keys(byBatch).length,
                sem: "success",
              },
              { label: "QR Codes", value: auditData.length, sem: "info" },
              {
                label: "Claimed",
                value: auditData.filter((r) => r.claimed).length,
                sem: "success",
              },
              {
                label: "Total Scans",
                value: auditData.reduce((s, r) => s + (r.scan_count || 0), 0),
                sem: null,
              },
              {
                label: "Inactive",
                value: auditData.filter((r) => !r.is_active).length,
                sem: null,
              },
            ].map((s, i) => {
              const col = s.sem
                ? { success: T.success, info: T.info }[s.sem]
                : T.ink700;
              return (
                <div
                  key={i}
                  style={{
                    background: T.surface,
                    padding: "12px 14px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: "20px",
                      fontWeight: 400,
                      color: col,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: T.ink500,
                      fontFamily: T.font,
                      marginTop: 2,
                      fontWeight: 700,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {loaded &&
        Object.entries(byBatch).map(([batchNum, { batch, batch_id, qrs }]) => {
          const totalScans = qrs.reduce((s, r) => s + (r.scan_count || 0), 0),
            claimed = qrs.filter((r) => r.claimed).length,
            inactive = qrs.filter((r) => !r.is_active).length;
          const daysToExpiry = batch?.expiry_date
            ? Math.ceil((new Date(batch.expiry_date) - new Date()) / 86400000)
            : null;
          const isExpired = daysToExpiry !== null && daysToExpiry < 0;
          const isRecalling = recallBatchId === batch_id;
          return (
            <div
              key={batchNum}
              style={{
                ...sCard,
                borderLeft: `3px solid ${isExpired ? T.danger : inactive > 0 ? T.warning : T.success}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      fontFamily: T.font,
                      color: T.accent,
                    }}
                  >
                    {batch?.product_name || batchNum}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: T.ink500,
                      fontFamily: T.font,
                      marginTop: "2px",
                    }}
                  >
                    {batchNum}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginTop: "6px",
                    }}
                  >
                    {batch?.lab_certified && (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: T.radius.sm,
                          background: T.successLight,
                          color: T.success,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontFamily: T.font,
                        }}
                      >
                        Lab Certified
                      </span>
                    )}
                    {batch?.strain && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: T.ink500,
                          fontFamily: T.font,
                        }}
                      >
                        {batch.strain}
                      </span>
                    )}
                    {batch?.expiry_date && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: isExpired ? T.danger : T.ink500,
                          fontFamily: T.font,
                          fontWeight: isExpired ? 600 : 400,
                        }}
                      >
                        {isExpired
                          ? "EXPIRED"
                          : `Expires ${new Date(batch.expiry_date).toLocaleDateString("en-ZA")}`}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  {!isRecalling ? (
                    <button
                      onClick={() => setRecallBatchId(batch_id)}
                      style={{
                        ...sBtn("outline"),
                        fontSize: "11px",
                        padding: "5px 12px",
                        color: T.warning,
                        borderColor: T.warningBd,
                      }}
                    >
                      QR Recall
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: T.warning,
                          fontFamily: T.font,
                        }}
                      >
                        Flag all QRs inactive?
                      </span>
                      <button
                        onClick={() => handleRecall(batch_id, batchNum)}
                        disabled={recallLoading}
                        style={{
                          ...sBtn("outline"),
                          fontSize: "11px",
                          padding: "4px 10px",
                          color: T.danger,
                          borderColor: T.dangerBd,
                        }}
                      >
                        {recallLoading ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setRecallBatchId(null)}
                        style={{
                          ...sBtn("outline"),
                          fontSize: "11px",
                          padding: "4px 10px",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  marginBottom: "14px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["QR Codes", qrs.length, T.info],
                  ["Claimed", claimed, T.success],
                  ["Total Scans", totalScans, "#b5935a"],
                  ["Inactive", inactive, inactive > 0 ? T.warning : T.ink500],
                ].map(([lbl, val, color]) => (
                  <div key={lbl}>
                    <div
                      style={{
                        fontSize: "11px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: T.ink500,
                        fontFamily: T.font,
                      }}
                    >
                      {lbl}
                    </div>
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: "20px",
                        fontWeight: 400,
                        color,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    fontFamily: T.font,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "QR Code",
                        "Type",
                        "Active",
                        "Claimed",
                        "Scans",
                        "Last Scan",
                        "Claimed At",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            ...sTh,
                            fontSize: "11px",
                            padding: "6px 8px",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {qrs.map((r) => (
                      <tr
                        key={r.id}
                        style={{
                          background: !r.is_active ? T.surface : "transparent",
                          opacity: r.is_active ? 1 : 0.6,
                        }}
                      >
                        <td
                          style={{
                            ...sTd,
                            fontFamily: T.font,
                            fontSize: "11px",
                            color: T.ink500,
                            padding: "6px 8px",
                          }}
                        >
                          {r.qr_code?.slice(0, 32)}
                          {r.qr_code?.length > 32 ? "…" : ""}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            padding: "6px 8px",
                            color: T.ink500,
                          }}
                        >
                          {r.qr_type}
                        </td>
                        <td style={{ ...sTd, padding: "6px 8px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "1px 6px",
                              borderRadius: T.radius.sm,
                              background: r.is_active ? T.successLight : T.bg,
                              color: r.is_active ? T.success : T.ink500,
                              fontWeight: 700,
                            }}
                          >
                            {r.is_active ? "YES" : "NO"}
                          </span>
                        </td>
                        <td style={{ ...sTd, padding: "6px 8px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "1px 6px",
                              borderRadius: T.radius.sm,
                              background: r.claimed ? T.successLight : T.bg,
                              color: r.claimed ? T.success : T.ink500,
                              fontWeight: 700,
                            }}
                          >
                            {r.claimed ? "YES" : "NO"}
                          </span>
                        </td>
                        <td
                          style={{
                            ...sTd,
                            padding: "6px 8px",
                            textAlign: "right",
                            fontFamily: T.font,
                            fontWeight: 600,
                          }}
                        >
                          {r.scan_count || 0}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            padding: "6px 8px",
                            color: T.ink500,
                          }}
                        >
                          {r.scans?.[0]?.scanned_at
                            ? new Date(
                                r.scans[0].scanned_at,
                              ).toLocaleDateString("en-ZA")
                            : "—"}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            padding: "6px 8px",
                            color: T.ink500,
                          }}
                        >
                          {r.claimed_at
                            ? new Date(r.claimed_at).toLocaleDateString("en-ZA")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      {!loaded && (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            padding: "60px",
            color: T.ink500,
          }}
        >
          <p
            style={{
              fontFamily: T.font,
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            Click "Load Audit Data" to fetch the full batch → QR → scan
            traceability chain.
          </p>
          <p
            style={{ fontFamily: T.font, fontSize: "12px", color: T.ink500 }}
          >
            Data loads on demand to keep the page fast. Export as CSV for
            regulatory submissions.
          </p>
        </div>
      )}
    </div>
  );
}
