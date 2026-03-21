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
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "../viz";

// ── Design tokens ────────────────────────────────────────────────────────────
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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

// Legacy aliases — keeps all internal logic unchanged
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.ink050,
  warm: T.ink075,
  white: "#fff",
  border: T.ink150,
  muted: T.ink500,
  text: T.ink900,
  error: T.danger,
  red: T.danger,
  blue: T.info,
  purple: T.info, // ★ purple → info-blue
  orange: T.warning,
  lightOrange: T.warningBg,
};
const F = {
  heading: T.fontUi, // ★ Outfit replaces Cormorant everywhere
  body: T.fontUi,
};

const sCard = {
  background: "#fff",
  border: `1px solid ${T.ink150}`,
  borderRadius: "6px",
  padding: "20px",
  boxShadow: T.shadow,
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
  borderRadius: "4px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.fontUi,
  transition: "all 0.15s",
});
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
};
const sSelect = { ...sInput, cursor: "pointer" };
const sLabel = {
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
  fontFamily: T.fontUi,
  fontWeight: 700,
};
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "9px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink075}`,
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
    active: { bg: T.successBg, color: T.success, label: "Active" },
    in_production: { bg: T.infoBg, color: T.info, label: "In Production" },
    low_stock: { bg: T.warningBg, color: T.warning, label: "Low Stock" },
    depleted: { bg: T.dangerBg, color: T.danger, label: "Depleted" },
    archived: { bg: T.ink075, color: T.ink500, label: "Archived" },
  };
  const s = map[status || "active"] || map.active;
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "3px",
        background: s.bg,
        color: s.color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: T.fontUi,
      }}
    >
      {s.label}
    </span>
  );
}

function StatusBadge({ status, yieldPct }) {
  let bg, color, label;
  if (status === "completed" && yieldPct !== null && yieldPct < 95) {
    bg = T.warningBg;
    color = T.warning;
    label = "Yield Flagged";
  } else if (status === "completed") {
    bg = T.successBg;
    color = T.success;
    label = "Completed";
  } else if (status === "in_progress") {
    bg = T.warningBg;
    color = T.warning;
    label = "In Progress";
  } else if (status === "active") {
    bg = T.successBg;
    color = T.success;
    label = "Active";
  } else if (status === "archived") {
    bg = T.ink075;
    color = T.ink500;
    label = "Archived";
  } else {
    bg = T.ink075;
    color = T.ink500;
    label = status || "Draft";
  }
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "3px",
        background: bg,
        color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: T.fontUi,
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
          style={{ fontSize: "12px", fontFamily: T.fontUi, color: T.ink700 }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontFamily: T.fontData,
            fontWeight: 600,
            color: ok ? T.success : T.danger,
          }}
        >
          {ok ? "✓" : "✕"}{" "}
          {typeof available === "number" ? available.toFixed(2) : available}
          {unit} available
          {needed > 0 && (
            <span style={{ color: T.ink400, fontWeight: 400 }}>
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
          background: T.ink150,
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: ok ? color : T.danger,
            borderRadius: "3px",
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
              fontFamily: T.fontUi,
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
              fontSize: "9px",
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
                      background: "#fff",
                      border: `1px solid ${T.ink150}`,
                      borderLeft: `3px solid ${s.color}`,
                      borderRadius: 6,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: s.color,
                        fontFamily: T.fontUi,
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Step {s.step}
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontUi,
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
                        fontFamily: T.fontUi,
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
                        fontFamily: T.fontUi,
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
                        borderRadius: 4,
                        padding: "6px 10px",
                        fontFamily: T.fontUi,
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
                    background: T.ink075,
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 6,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.fontUi,
                      fontSize: 10,
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
                      fontFamily: T.fontUi,
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
        .eq("id", item.id);
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
        background: T.accentLit,
      }}
    >
      <div style={sLabel}>Set Sell Prices — Website Shop</div>
      <p
        style={{
          fontSize: "12px",
          color: T.accentMid,
          margin: "6px 0 12px",
          fontFamily: T.fontUi,
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
            borderRadius: 4,
            fontSize: 12,
            fontFamily: T.fontUi,
            background: toast.type === "success" ? T.successBg : T.dangerBg,
            color: toast.type === "success" ? T.success : T.danger,
            border: `1px solid ${toast.type === "success" ? T.successBd : T.dangerBd}`,
          }}
        >
          {toast.type === "success" ? "✓ " : "✗ "}
          {toast.msg}
        </div>
      )}
      {finished.length === 0 ? (
        <p style={{ fontSize: "12px", color: T.ink500, fontFamily: T.fontUi }}>
          No finished products in inventory yet.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            fontFamily: T.fontUi,
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
                success: T.successBg,
                danger: T.dangerBg,
                warning: T.warningBg,
              };
              return (
                <tr key={i.id}>
                  <td style={{ ...sTd, fontWeight: 500 }}>{i.name}</td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: T.fontData,
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
                      fontFamily: T.fontData,
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
                        fontSize: "9px",
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
                        fontSize: "9px",
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
export default function HQProduction() {
  const [subTab, setSubTab] = useState("overview");
  const ctx = usePageContext("hq-production", null);
  const { tenantConfig, industryProfile } = useTenant();
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
          "id,batch_number,product_name,product_type,strain,volume,status,lifecycle_status,inventory_item_id,low_stock_threshold,production_date,expiry_date,units_produced,thc_content,cbd_content,lab_certified,is_archived,tenant_id",
        )
        .eq("is_archived", false)
        .order("production_date", { ascending: false })
        .limit(200);

      // Apply tenant filter if resolved — falls back to all batches for pure HQ role
      if (hqTenantId) batchQuery.eq("tenant_id", hqTenantId);

      const [itemsR, runsR, partnersR, formatsR, strainsR, bomR] =
        await Promise.all([
          supabase
            .from("inventory_items")
            .select("*")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("production_runs")
            .select(
              `id,batch_id,run_number,status,planned_units,actual_units,started_at,completed_at,notes,created_at,batches(batch_number,product_name,strain,product_type,volume),production_run_inputs(id,run_id,item_id,quantity_planned,quantity_actual,notes,inventory_items(name,sku,unit,category))`,
            )
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

  const SUB_TABS = [
    { id: "overview", label: "Overview" },
    { id: "batches", label: "Batches" },
    { id: "new-run", label: "New Production Run" },
    { id: "history", label: "History" },
    { id: "allocate", label: "Allocate Stock" },
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
    <div style={{ fontFamily: T.fontUi }}>
      {/* ── Stock alerts — standard semantic templates ── */}
      {(depleted.length > 0 || lowStock.length > 0) && !loading && (
        <div style={{ marginBottom: "20px" }}>
          {depleted.length > 0 && (
            <div
              style={{
                background: T.dangerBg,
                border: `1px solid ${T.dangerBd}`,
                borderRadius: "6px",
                padding: "14px 18px",
                marginBottom: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: T.danger,
                    fontFamily: T.fontUi,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {depleted.length} product{depleted.length > 1 ? "s" : ""} out
                  of stock — shop hidden
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {depleted.map((i) => (
                    <span
                      key={i.id}
                      style={{
                        fontSize: "11px",
                        background: "rgba(153,27,27,0.08)",
                        color: T.danger,
                        padding: "2px 10px",
                        borderRadius: "3px",
                        fontFamily: T.fontUi,
                        fontWeight: 600,
                      }}
                    >
                      {i.name}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSubTab("new-run")}
                style={{ ...sBtn("danger"), whiteSpace: "nowrap" }}
              >
                New Production Run
              </button>
            </div>
          )}
          {lowStock.length > 0 && (
            <div
              style={{
                background: T.warningBg,
                border: `1px solid ${T.warningBd}`,
                borderRadius: "6px",
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: T.warning,
                    fontFamily: T.fontUi,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {lowStock.length} product{lowStock.length > 1 ? "s" : ""}{" "}
                  running low
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {lowStock.map((i) => (
                    <span
                      key={i.id}
                      style={{
                        fontSize: "11px",
                        background: "rgba(146,64,14,0.08)",
                        color: T.warning,
                        padding: "2px 10px",
                        borderRadius: "3px",
                        fontFamily: T.fontUi,
                        fontWeight: 600,
                      }}
                    >
                      {i.name} —{" "}
                      {Math.floor(parseFloat(i.quantity_on_hand || 0))} left
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSubTab("new-run")}
                style={{ ...sBtn("amber"), whiteSpace: "nowrap" }}
              >
                Plan Production
              </button>
            </div>
          )}
        </div>
      )}

      <WorkflowGuide
        context={ctx}
        tabId="hq-production"
        onAction={(action) => action.tab && setSubTab(action.tab)}
        defaultOpen={true}
      />
      <HowItWorksBanner />

      {/* Sub-tabs — standard underline style */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${T.ink150}`,
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
              fontFamily: T.fontUi,
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
                  borderRadius: "10px",
                  fontSize: "9px",
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
                  borderRadius: "10px",
                  fontSize: "9px",
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
              border: `2px solid ${T.ink150}`,
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
            <HistoryPanel runs={runs} onRefresh={fetchAll} />
          )}
          {subTab === "allocate" && (
            <AllocatePanel
              items={items}
              partners={partners}
              batches={batches}
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

  const metrics = [
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
      semantic: avgYield && parseFloat(avgYield) >= 95 ? "success" : "warning",
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
          background: T.accentLit,
        }}
      >
        <div style={{ ...sLabel, marginBottom: 10 }}>Production Pipeline</div>
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
              label: "New Production Run",
              desc: "Select batch + materials → confirm",
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
                    background: "#fff",
                    border: `1px solid ${s.color}30`,
                    borderRadius: 6,
                    borderLeft: `3px solid ${s.color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: s.color,
                      fontFamily: T.fontUi,
                      fontWeight: 700,
                    }}
                  >
                    Step {s.step}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: T.fontUi,
                      fontWeight: 600,
                      color: T.ink900,
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.ink500,
                      fontFamily: T.fontUi,
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
          background: T.ink150,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        {metrics.map((c) => (
          <div
            key={c.label}
            onClick={c.click || undefined}
            style={{
              background: "#fff",
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
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: "6px",
                fontFamily: T.fontUi,
                fontWeight: 700,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontFamily: T.fontData,
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
                fontFamily: T.fontUi,
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
                title="Batch Yield History (last 10 runs)"
                height={200}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={yieldData}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.ink150}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="run"
                      tick={{ fill: T.ink400, fontSize: 9, fontFamily: T.font }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      domain={[80, 100]}
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
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
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Monthly Production Output" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.ink150}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
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
                      isAnimationActive={false}
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
                fontSize: "9px",
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
              fontFamily: T.fontUi,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Batch #</th>
                <th style={sTh}>Product</th>
                <th style={sTh}>Strain</th>
                <th style={{ ...sTh, textAlign: "right" }}>Units</th>
                <th style={sTh}>Date</th>
                <th style={sTh}>Stock</th>
                <th style={sTh}>Status</th>
                <th style={sTh}>Lab</th>
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
                        fontFamily: T.fontData,
                        fontSize: "11px",
                        color: T.ink500,
                      }}
                    >
                      {b.batch_number}
                    </td>
                    <td style={{ ...sTd, fontWeight: 500 }}>
                      {b.product_name || "—"}
                    </td>
                    <td style={sTd}>{b.strain || "—"}</td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
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
                        fontFamily: T.fontData,
                        fontWeight: 600,
                        color:
                          qty === null
                            ? T.ink400
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
                        <span style={{ color: T.ink400 }}>—</span>
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
                  fontFamily: T.fontUi,
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
                  fontFamily: T.fontUi,
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
                          fontFamily: T.fontData,
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
                            fontFamily: T.fontData,
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
        .eq("id", b.id);
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
        .eq("id", b.id);
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
    const linkedRun = runs.find((r) => r.batch_id === b.id);
    if (linkedRun) {
      showToast(
        "Cannot delete — this batch has a linked production run. Delete the run first from the History tab, or Archive this batch instead.",
        "error",
      );
      setDeleting(null);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("batches").delete().eq("id", b.id);
      if (error) throw error;
      setDeleting(null);
      onRefresh();
      showToast(`Batch ${b.batch_number} deleted.`);
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
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
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: T.fontUi,
            fontWeight: 500,
            background: toast.type === "error" ? T.dangerBg : T.successBg,
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
          background: T.ink150,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
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
            <div key={i} style={{ background: "#fff", padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: "6px",
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: T.fontData,
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
              border: `1px solid ${filter === f.id ? T.accent : f.alert ? T.warningBd : T.ink150}`,
              borderRadius: "4px",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: T.fontUi,
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
            fontSize: "9px",
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
            <p style={{ fontFamily: T.fontUi, fontSize: "14px" }}>
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
                borderBottom: `2px solid ${T.ink150}`,
              }}
            >
              {[
                "BATCH #",
                "PRODUCT",
                "TYPE",
                "STRAIN",
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
                      borderBottom: `1px solid ${T.ink075}`,
                      alignItems: "center",
                      background: isDepleted
                        ? T.dangerBg
                        : isLow
                          ? T.warningBg
                          : isEditing
                            ? T.accentLit
                            : "transparent",
                    }}
                  >
                    <div
                      style={{
                        ...sTd,
                        fontFamily: T.fontData,
                        fontSize: "10px",
                        color: T.ink500,
                        paddingLeft: "8px",
                      }}
                    >
                      {b.batch_number}
                    </div>
                    <div style={{ ...sTd, fontWeight: 500 }}>
                      {b.product_name || "—"}
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
                    <div style={sTd}>{b.strain || "—"}</div>
                    <div
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                        fontWeight: 600,
                      }}
                    >
                      {b.units_produced ?? "-"}
                    </div>
                    <div
                      style={{
                        ...sTd,
                        fontFamily: T.fontData,
                        fontWeight: 700,
                        color:
                          qty === null
                            ? T.ink400
                            : isDepleted
                              ? T.danger
                              : isLow
                                ? T.warning
                                : T.success,
                      }}
                    >
                      {qty === null ? (
                        <span style={{ color: T.ink400, fontSize: 10 }}>
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
                        : "—"}
                    </div>
                    <div style={sTd}>
                      {b.lab_certified ? (
                        <span style={{ color: T.success, fontWeight: 600 }}>
                          ✓
                        </span>
                      ) : (
                        <span style={{ color: T.ink400 }}>—</span>
                      )}
                    </div>
                    <div style={{ ...sTd, fontSize: "10px" }}>
                      {linkedRun ? (
                        <span
                          style={{ color: T.success, fontFamily: T.fontData }}
                        >
                          {linkedRun.run_number || "✓"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            background: T.warningBg,
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
                          fontSize: "9px",
                          color: isEditing ? T.ink400 : T.accentMid,
                          borderColor: isEditing ? T.ink150 : T.accentBd,
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
                            fontSize: "9px",
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
                            fontSize: "9px",
                            color: T.ink400,
                            borderColor: T.ink150,
                          }}
                        >
                          ▣
                        </button>
                      )}
                      {!linkedRun && deleting !== b.id && (
                        <button
                          onClick={() => setDeleting(b.id)}
                          title="Delete batch"
                          style={{
                            ...sBtn("outline"),
                            padding: "3px 8px",
                            fontSize: "9px",
                            color: T.danger,
                            borderColor: T.dangerBd,
                          }}
                        >
                          ✕
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
                              fontSize: "9px",
                            }}
                          >
                            {saving ? "..." : "Delete"}
                          </button>
                          <button
                            onClick={() => setDeleting(null)}
                            style={{
                              ...sBtn("outline"),
                              padding: "3px 8px",
                              fontSize: "9px",
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
                        background: T.accentLit,
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
                                fontSize: "10px",
                                color: T.ink500,
                                display: "block",
                                marginBottom: "3px",
                                fontFamily: T.fontUi,
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
                              fontSize: "10px",
                              color: T.ink500,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: T.fontUi,
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
                              fontSize: "10px",
                              color: T.ink500,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: T.fontUi,
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
                              fontSize: "10px",
                              color: T.ink500,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: T.fontUi,
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
                              fontSize: "10px",
                              color: T.ink500,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: T.fontUi,
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
                                  fontSize: "10px",
                                  color: T.ink500,
                                  display: "block",
                                  marginBottom: "3px",
                                  fontFamily: T.fontUi,
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
                                  fontSize: "10px",
                                  color: T.ink500,
                                  display: "block",
                                  marginBottom: "3px",
                                  fontFamily: T.fontUi,
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
                            fontFamily: T.fontUi,
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
            background: T.warningBg,
            border: `1px solid ${T.warningBd}`,
            borderRadius: "6px",
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
                fontFamily: T.fontUi,
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
                fontFamily: T.fontUi,
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
          productFormats.forEach((f) => {
            const g =
              f.group_label ||
              (f.is_vape ? "── Vape ──" : "── Other Products ──");
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
  const vapeMatsOk =
    !isVape ||
    (form.distillate_item_id &&
      distAvail >= distNeeded &&
      form.terpene_item_id &&
      terpAvail >= terpNeeded &&
      form.hardware_item_id &&
      hwAvail >= hwNeeded &&
      distMlPerUnit > 0);
  const hasName = form.strain || form.product_name_override;
  const canRun = planned > 0 && (hasBom ? bomMatsOk : vapeMatsOk) && hasName;
  const distCost = selDist
    ? parseFloat(selDist.cost_price || 0) * distNeeded
    : 0;
  const terpCost = selTerp
    ? parseFloat(selTerp.cost_price || 0) * terpNeeded
    : 0;
  const hwCost = selHw ? parseFloat(selHw.cost_price || 0) * hwNeeded : 0;
  const totalCost = hasBom ? bomTotalCost : distCost + terpCost + hwCost;
  const costPerUnit = planned > 0 ? (totalCost / planned).toFixed(2) : 0;
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
        fontFamily: T.fontUi,
      }}
    >
      {text}
      {hint && (
        <span
          style={{ color: T.accentMid, marginLeft: "6px", fontSize: "9px" }}
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
          notes: form.notes || null,
        })
        .select()
        .single();
      if (runErr) throw runErr;
      if (isVape) {
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
          },
          {
            item_id: form.terpene_item_id,
            quantity: -terpNeeded,
            movement_type: "production_out",
            reference: runNumber,
            notes: `Run ${runNumber}: ${selTerp?.name}`,
          },
          {
            item_id: form.hardware_item_id,
            quantity: -hwNeeded,
            movement_type: "production_out",
            reference: runNumber,
            notes: `Run ${runNumber}: ${selHw?.name}`,
          },
        ]);
        await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: distAvail - distNeeded })
          .eq("id", form.distillate_item_id);
        await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: terpAvail - terpNeeded })
          .eq("id", form.terpene_item_id);
        await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: hwAvail - hwNeeded })
          .eq("id", form.hardware_item_id);
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
          });
          const curAvail = parseFloat(bl.selItem?.quantity_on_hand || 0);
          await supabase
            .from("inventory_items")
            .update({ quantity_on_hand: Math.max(0, curAvail - bl.needed) })
            .eq("id", bl.selItemId);
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
          })
          .select()
          .single();
        if (niErr) throw niErr;
        finId = ni.id;
      }
      await supabase.from("stock_movements").insert({
        item_id: finId,
        quantity: finalActual,
        movement_type: "production_in",
        reference: runNumber,
        notes: `Batch ${runNumber}: ${finishedName}`,
      });
      const curQty = parseFloat(existingFin?.quantity_on_hand || 0);
      await supabase
        .from("inventory_items")
        .update({
          quantity_on_hand: curQty + finalActual,
          ...(isVape ? { cost_price: parseFloat(costPerUnit) || 0 } : {}),
        })
        .eq("id", finId);
      await supabase
        .from("batches")
        .update({ inventory_item_id: finId, lifecycle_status: "active" })
        .eq("id", batch.id);
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
            background: T.successBg,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: T.fontUi,
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
              fontFamily: T.fontUi,
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
                fontFamily: T.fontData,
                background: T.ink075,
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
                background: T.warningBg,
                border: `1px solid ${T.warningBd}`,
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.warning,
                  marginBottom: 6,
                }}
              >
                Sell price not set — product not yet visible in shop
              </div>
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 12,
                  color: T.ink700,
                  lineHeight: 1.6,
                }}
              >
                Go to <strong>HQ → Pricing</strong> and set a sell_price &gt; R0
                for {completedRun.finishedName}.
              </div>
            </div>
          )}
          {!needsPrice && (
            <div
              style={{
                padding: "12px 16px",
                background: T.successBg,
                border: `1px solid ${T.successBd}`,
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: T.fontUi,
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
              Done — View History
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
      <div style={{ ...sCard, borderLeft: `3px solid ${T.accent}` }}>
        <div style={{ ...sLabel, marginBottom: "16px" }}>
          Step 1 — Define Run
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
          {fmt.chambers > 1 && (
            <div
              style={{
                padding: "10px 14px",
                background: T.ink075,
                borderRadius: "4px",
                fontSize: "12px",
                fontFamily: T.fontUi,
                color: T.ink700,
                display: "flex",
                alignItems: "center",
              }}
            >
              Triple Chamber:{" "}
              <strong style={{ margin: "0 4px" }}>
                {distMlPerUnit.toFixed(2)}ml distillate/unit
              </strong>{" "}
              ({fillMlPerChamber}ml × {chambers} chambers)
            </div>
          )}
          {showCannabisField(industryProfile, isCannabis) && (
            <div>
              {fLabel(isVape ? "Strain *" : "Strain (optional)")}
              <select
                style={sSelect}
                value={form.strain}
                onChange={(e) => set("strain", e.target.value)}
              >
                <option value="">— Select Strain —</option>
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
          {isVape && (
            <div>
              {fLabel("Terpene %", `default ${fmt.terpene_pct}% · range 3–15%`)}
              <input
                style={sInput}
                type="number"
                step="0.1"
                min="3"
                max="15"
                placeholder={`${fmt.terpene_pct} (default)`}
                value={form.terpene_pct_override}
                onChange={(e) => set("terpene_pct_override", e.target.value)}
              />
              {terpNeeded > 0 && planned > 0 && (
                <p
                  style={{
                    fontSize: "10px",
                    color: T.accentMid,
                    margin: "4px 0 0",
                    fontFamily: T.fontUi,
                  }}
                >
                  = {terpNeeded.toFixed(3)}ml terpene for {planned} unit
                  {planned !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {isVape && (
        <div style={{ ...sCard, borderLeft: `3px solid ${T.info}` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Step 2 — Select Materials
          </div>
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
                <option value="">— Select —</option>
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
                    fontFamily: T.fontUi,
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
                <option value="">— Select —</option>
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
                <option value="">— Select —</option>
                {hwItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({Math.floor(parseFloat(i.quantity_on_hand || 0))}{" "}
                    pcs)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {hasBom && planned > 0 && (
        <div style={{ ...sCard, borderLeft: `3px solid ${T.info}` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Step 2 — Bill of Materials
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
                      borderColor: selItemId && !ok ? T.danger : T.ink150,
                    }}
                    value={selItemId}
                    onChange={(e) => setBomSel(line.id, e.target.value)}
                  >
                    <option value="">— Select —</option>
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
                        fontFamily: T.fontUi,
                      }}
                    >
                      Need {needed.toFixed(3)}
                      {line.unit} — only {avail.toFixed(2)}
                      {line.unit} available
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {!isVape && !hasBom && planned > 0 && (
        <div
          style={{
            ...sCard,
            border: `1px solid ${T.warningBd}`,
            background: T.warningBg,
          }}
        >
          <div style={{ ...sLabel, color: T.warning, marginBottom: "8px" }}>
            Non-Vape Run — Units Only
          </div>
          <p
            style={{
              fontSize: "12px",
              color: T.ink700,
              margin: 0,
              fontFamily: T.fontUi,
              lineHeight: "1.7",
            }}
          >
            No material BOM for this format. The run will create a batch record
            and add <strong>{planned} units</strong> of{" "}
            <strong>{finishedName || "product"}</strong> to finished stock.
          </p>
        </div>
      )}

      {isVape &&
        planned > 0 &&
        form.distillate_item_id &&
        form.terpene_item_id &&
        form.hardware_item_id &&
        distMlPerUnit > 0 && (
          <div
            style={{
              ...sCard,
              borderLeft: `3px solid ${canRun ? T.success : T.danger}`,
              background: canRun ? T.successBg : T.dangerBg,
            }}
          >
            <div
              style={{
                ...sLabel,
                color: canRun ? T.success : T.danger,
                marginBottom: "16px",
              }}
            >
              Step 3 — Bill of Materials{" "}
              {canRun
                ? "— All materials available"
                : "— Insufficient materials"}
            </div>
            <StockGauge
              label="Distillate"
              available={distAvail}
              needed={distNeeded}
              unit="ml"
              color={T.info}
            />
            <StockGauge
              label={`Terpene (${selTerp?.name || "—"})`}
              available={terpAvail}
              needed={terpNeeded}
              unit="ml"
              color={T.accentMid}
            />
            <StockGauge
              label={`Hardware (${selHw?.name || "—"})`}
              available={hwAvail}
              needed={hwNeeded}
              unit=" pcs"
              color="#b5935a"
            />
            <div
              style={{
                borderTop: `1px solid ${T.ink150}`,
                paddingTop: "14px",
                marginTop: "8px",
                display: "flex",
                gap: "32px",
                flexWrap: "wrap",
              }}
            >
              {[
                ["Output", `${planned} × ${finishedName || "—"}`, T.success],
                ["Dist / Unit", `${distMlPerUnit.toFixed(2)}ml`, T.info],
                ["Cost / Unit", `R${costPerUnit}`, "#b5935a"],
                ["Total Material Cost", `R${totalCost.toFixed(2)}`, T.info],
                ["Run Number", runNumber, T.ink500],
              ].map(([lbl, val, color]) => (
                <div key={lbl}>
                  <div
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: T.ink400,
                      marginBottom: "4px",
                      fontFamily: T.fontUi,
                    }}
                  >
                    {lbl}
                  </div>
                  <div
                    style={{
                      fontSize: lbl === "Run Number" ? "13px" : "18px",
                      fontWeight: 600,
                      fontFamily:
                        lbl === "Run Number" ? T.fontData : T.fontData,
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

      {canRun && (
        <div style={{ ...sCard, borderLeft: `3px solid #b5935a` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Step {isVape ? "4" : "3"} — Confirm & Log
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
                    fontFamily: T.fontUi,
                  }}
                >
                  Yield {yieldPct}% — below 95% threshold
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
                background: T.ink075,
                borderRadius: "4px",
                marginBottom: "14px",
                fontSize: "13px",
                fontFamily: T.fontUi,
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
                {isVape && !hasBom && (
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
                <li>
                  Link batch to inventory item (enables live stock tracking)
                </li>
              </ul>
            </div>
          )}
          <div style={{ display: "flex", gap: "10px" }}>
            {!confirmed ? (
              <button onClick={() => setConfirmed(true)} style={sBtn()}>
                Review & Confirm →
              </button>
            ) : (
              <>
                <button
                  onClick={() => setConfirmed(false)}
                  style={sBtn("outline")}
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  style={{
                    ...sBtn(),
                    background: saving ? T.ink400 : T.accent,
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
function HistoryPanel({ runs, onRefresh }) {
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
          .eq("reference", run.run_number);
        if (mvs?.length > 0) {
          for (const mv of mvs) {
            const rev = -mv.quantity;
            await supabase.from("stock_movements").insert({
              item_id: mv.item_id,
              quantity: rev,
              movement_type: "adjustment",
              reference: `VOID-${run.run_number}`,
              notes: `Reversal: deleted run ${run.run_number}`,
            });
            const { data: item } = await supabase
              .from("inventory_items")
              .select("quantity_on_hand")
              .eq("id", mv.item_id)
              .single();
            await supabase
              .from("inventory_items")
              .update({
                quantity_on_hand: Math.max(
                  0,
                  parseFloat(item.quantity_on_hand || 0) + rev,
                ),
              })
              .eq("id", mv.item_id);
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
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: T.fontUi,
            fontWeight: 500,
            background: toast.type === "error" ? T.dangerBg : T.successBg,
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
          style={{ fontSize: "11px", color: T.ink500, fontFamily: T.fontUi }}
        >
          {runs.length} production runs
        </div>
        <button
          onClick={onRefresh}
          style={{ ...sBtn("outline"), fontSize: "9px", padding: "6px 12px" }}
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
          <p style={{ fontFamily: T.fontUi, fontSize: "14px" }}>
            No production runs yet. Use "New Production Run" to log your first
            batch.
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
                        fontFamily: T.fontUi,
                        color: T.ink900,
                      }}
                    >
                      {productLabel}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: T.ink500,
                        fontFamily: T.fontData,
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
                        fontFamily: T.fontUi,
                      }}
                    >
                      {new Date(run.created_at).toLocaleDateString("en-ZA")}
                    </span>
                    <button
                      onClick={() => openEdit(run)}
                      style={{
                        ...sBtn("outline"),
                        padding: "4px 10px",
                        fontSize: "9px",
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
                          fontSize: "9px",
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
                            fontFamily: T.fontUi,
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
                            fontSize: "9px",
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
                            fontSize: "9px",
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
                        fontSize: "9px",
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
                        fontSize: "9px",
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
                          fontSize: "9px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: T.ink400,
                          fontFamily: T.fontUi,
                        }}
                      >
                        {lbl}
                      </div>
                      <div
                        style={{
                          fontFamily: T.fontData,
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
                            color: T.ink400,
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
                      background: T.warningBg,
                      border: `1px solid ${T.warningBd}`,
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: T.warning,
                      fontFamily: T.fontUi,
                    }}
                  >
                    Yield {yp}% — below 95% threshold.
                  </div>
                )}
                {isOpen && (
                  <div
                    style={{
                      marginTop: "14px",
                      borderTop: `1px solid ${T.ink150}`,
                      paddingTop: "14px",
                    }}
                  >
                    {isDeleting && (
                      <div
                        style={{
                          padding: "16px",
                          background: T.dangerBg,
                          border: `1px solid ${T.dangerBd}`,
                          borderRadius: "4px",
                          marginBottom: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: T.danger,
                            fontFamily: T.fontUi,
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
                            fontFamily: T.fontUi,
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
                          background: T.accentLit,
                          border: `1px solid ${T.accentBd}`,
                          borderRadius: "4px",
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
                                fontFamily: T.fontUi,
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
                                fontFamily: T.fontUi,
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
                                fontFamily: T.fontUi,
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
                              background: T.ink075,
                              border: `1px solid ${T.ink150}`,
                              borderRadius: "4px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "9px",
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                color: T.ink400,
                                fontFamily: T.fontUi,
                                fontWeight: 700,
                              }}
                            >
                              {inp.inventory_items?.name || "Material"}
                            </div>
                            <div
                              style={{
                                fontFamily: T.fontData,
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
                                  color: T.ink400,
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
                          fontFamily: T.fontUi,
                        }}
                      >
                        {run.notes}
                      </p>
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
      });
      const newQty = available - qty;
      await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: newQty })
        .eq("id", form.item_id);
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
          .eq("id", linkedBatch.id);
      } else if (
        linkedBatch &&
        newQty <= (linkedBatch.low_stock_threshold || 10)
      ) {
        await supabase
          .from("batches")
          .update({ lifecycle_status: "low_stock" })
          .eq("id", linkedBatch.id);
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
              borderLeft: `3px solid ${form.channel === ch.id ? T.accent : T.ink150}`,
              background: form.channel === ch.id ? T.accentLit : "#fff",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: T.fontUi,
                color: T.ink900,
              }}
            >
              {ch.label}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: T.ink500,
                fontFamily: T.fontUi,
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
              fontFamily: T.fontUi,
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
              fontFamily: T.fontUi,
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
                      form.item_id === i.id ? T.accentLit : "transparent",
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
                      fontFamily: T.fontData,
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
                      fontFamily: T.fontData,
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
                      fontFamily: T.fontData,
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
                  fontFamily: T.fontUi,
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
                    fontFamily: T.fontUi,
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
                fontFamily: T.fontUi,
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
                background: T.ink075,
                borderRadius: "4px",
                marginBottom: "12px",
                fontSize: "12px",
                fontFamily: T.fontUi,
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
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: T.fontUi,
            fontWeight: 500,
            background: toast.type === "error" ? T.dangerBg : T.successBg,
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
                fontFamily: T.fontUi,
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
                  background: loading ? T.ink400 : T.info,
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
                    fontSize: "9px",
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
              background: T.ink150,
              borderRadius: 4,
              overflow: "hidden",
              border: `1px solid ${T.ink150}`,
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
                    background: "#fff",
                    padding: "12px 14px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.fontData,
                      fontSize: "20px",
                      fontWeight: 400,
                      color: col,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: T.ink400,
                      fontFamily: T.fontUi,
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
                      fontFamily: T.fontUi,
                      color: T.accent,
                    }}
                  >
                    {batch?.product_name || batchNum}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: T.ink500,
                      fontFamily: T.fontData,
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
                          fontSize: "9px",
                          padding: "2px 8px",
                          borderRadius: "3px",
                          background: T.successBg,
                          color: T.success,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontFamily: T.fontUi,
                        }}
                      >
                        Lab Certified
                      </span>
                    )}
                    {batch?.strain && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: T.ink500,
                          fontFamily: T.fontUi,
                        }}
                      >
                        {batch.strain}
                      </span>
                    )}
                    {batch?.expiry_date && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: isExpired ? T.danger : T.ink500,
                          fontFamily: T.fontUi,
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
                        fontSize: "9px",
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
                          fontFamily: T.fontUi,
                        }}
                      >
                        Flag all QRs inactive?
                      </span>
                      <button
                        onClick={() => handleRecall(batch_id, batchNum)}
                        disabled={recallLoading}
                        style={{
                          ...sBtn("outline"),
                          fontSize: "9px",
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
                          fontSize: "9px",
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
                  ["Inactive", inactive, inactive > 0 ? T.warning : T.ink400],
                ].map(([lbl, val, color]) => (
                  <div key={lbl}>
                    <div
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: T.ink400,
                        fontFamily: T.fontUi,
                      }}
                    >
                      {lbl}
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontData,
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
                    fontFamily: T.fontUi,
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
                            fontSize: "9px",
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
                          background: !r.is_active ? T.ink050 : "transparent",
                          opacity: r.is_active ? 1 : 0.6,
                        }}
                      >
                        <td
                          style={{
                            ...sTd,
                            fontFamily: T.fontData,
                            fontSize: "10px",
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
                              fontSize: "9px",
                              padding: "1px 6px",
                              borderRadius: "3px",
                              background: r.is_active ? T.successBg : T.ink075,
                              color: r.is_active ? T.success : T.ink400,
                              fontWeight: 700,
                            }}
                          >
                            {r.is_active ? "YES" : "NO"}
                          </span>
                        </td>
                        <td style={{ ...sTd, padding: "6px 8px" }}>
                          <span
                            style={{
                              fontSize: "9px",
                              padding: "1px 6px",
                              borderRadius: "3px",
                              background: r.claimed ? T.successBg : T.ink075,
                              color: r.claimed ? T.success : T.ink400,
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
                            fontFamily: T.fontData,
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
              fontFamily: T.fontUi,
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            Click "Load Audit Data" to fetch the full batch → QR → scan
            traceability chain.
          </p>
          <p
            style={{ fontFamily: T.fontUi, fontSize: "12px", color: T.ink500 }}
          >
            Data loads on demand to keep the page fast. Export as CSV for
            regulatory submissions.
          </p>
        </div>
      )}
    </div>
  );
}
