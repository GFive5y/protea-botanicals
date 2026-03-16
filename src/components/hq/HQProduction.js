// src/components/hq/HQProduction.js v2.0
// WP-W: Unified Batch→Production→Stock→Shop Pipeline
//
// v2.0 changes:
//   - OverviewPanel: Stock Alert banner (DEPLETED + LOW STOCK finished products)
//   - BatchesPanel: shows live quantity_on_hand per batch (via inventory_item_id link)
//   - BatchesPanel: lifecycle_status badges (active|low_stock|depleted|archived)
//   - BatchesPanel: Archive action (sets is_archived=true + lifecycle_status='archived')
//   - BatchesPanel: "🏭 New Run" shortcut per batch row
//   - BatchesPanel: onboarding panel explaining the full pipeline
//   - BatchesPanel: low_stock_threshold field editable per batch
//   - NewRunPanel.handleConfirm: writes inventory_item_id + lifecycle_status back to batches
//   - NewRunPanel: post-completion prompt "Set sell price to go live in shop"
//   - AllocatePanel: auto-updates batch lifecycle_status after allocation depletes stock
//
// v1.6 — WP-T: Audit Export sub-tab — batch→QR→scan chain, CSV export, QR recall tool
// v1.5 — FORMAT expansion: vape formats, non-vape, triple chamber, batch edit
// v1.4 — BUG-001 FIX: direct batches query ordered by production_date
// v1.3 — Terpene unit fix
// v1.2 — History admin controls: Edit/Cancel/Delete w/ stock reversal
// v1.1 — Schema fix
// v1.0 — WP-L: Production Module

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  white: "#fff",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  error: "#c0392b",
  red: "#e74c3c",
  blue: "#2c4a6e",
  purple: "#6c3483",
  lightPurple: "#f5eef8",
  orange: "#d4680a",
  lightOrange: "#fff3e8",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};
const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background:
    v === "primary"
      ? C.green
      : v === "danger"
        ? C.red
        : v === "amber"
          ? C.orange
          : "transparent",
  color: ["primary", "danger", "amber"].includes(v) ? C.white : C.mid,
  border: ["primary", "danger", "amber"].includes(v)
    ? "none"
    : `1px solid ${C.mid}`,
  borderRadius: "2px",
  fontSize: "10px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: F.body,
  transition: "all 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  fontSize: "13px",
  fontFamily: F.body,
  background: C.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };
const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: "4px",
  fontFamily: F.body,
};
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "9px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: C.muted,
  borderBottom: `2px solid ${C.border}`,
  fontWeight: 500,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${C.border}`,
  color: C.text,
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

// ─── LIFECYCLE STATUS BADGE ──────────────────────────────────────────────────
function LifecycleBadge({ status, qty }) {
  // Derive effective status from qty if lifecycle_status not set
  const effective = status || "active";
  const map = {
    active: { bg: "#d4edda", color: C.green, label: "Active" },
    in_production: { bg: "#e3f2fd", color: C.blue, label: "In Production" },
    low_stock: { bg: "#fff3e8", color: C.orange, label: "Low Stock" },
    depleted: { bg: "#ffebee", color: C.red, label: "Depleted" },
    archived: { bg: C.warm, color: C.muted, label: "Archived" },
  };
  const s = map[effective] || map.active;
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "2px",
        background: s.bg,
        color: s.color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 600,
        fontFamily: F.body,
      }}
    >
      {s.label}
    </span>
  );
}

function StatusBadge({ status, yieldPct }) {
  let bg, color, label;
  if (status === "completed" && yieldPct !== null && yieldPct < 95) {
    bg = "#fff3e8";
    color = C.orange;
    label = "Yield Flagged";
  } else if (status === "completed") {
    bg = "#d4edda";
    color = C.green;
    label = "Completed";
  } else if (status === "in_progress") {
    bg = "#fff3e8";
    color = C.orange;
    label = "In Progress";
  } else if (status === "active") {
    bg = "#d4edda";
    color = C.green;
    label = "Active";
  } else if (status === "archived") {
    bg = C.warm;
    color = C.muted;
    label = "Archived";
  } else {
    bg = C.warm;
    color = C.muted;
    label = status || "Draft";
  }
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "2px",
        background: bg,
        color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 600,
        fontFamily: F.body,
      }}
    >
      {label}
    </span>
  );
}

function StockGauge({ label, available, needed, unit, color = C.accent }) {
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
        <span style={{ fontSize: "12px", fontFamily: F.body, color: C.text }}>
          {label}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontFamily: F.body,
            fontWeight: 600,
            color: ok ? C.green : C.red,
          }}
        >
          {ok ? "✓" : "✕"}{" "}
          {typeof available === "number" ? available.toFixed(2) : available}
          {unit} available
          {needed > 0 && (
            <span style={{ color: C.muted, fontWeight: 400 }}>
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
          background: C.border,
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: ok ? color : C.red,
            borderRadius: "3px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOW IT WORKS BANNER — persistent onboarding for all users
// ═══════════════════════════════════════════════════════════════════════════════
function HowItWorksBanner() {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          ...sCard,
          borderLeft: `4px solid ${C.blue}`,
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>ℹ</span>
            <span
              style={{
                fontFamily: F.body,
                fontSize: 12,
                fontWeight: 600,
                color: C.blue,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              How Production Works
            </span>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>
              — 4 steps from raw materials to live shop
            </span>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              ...sBtn("outline"),
              padding: "4px 12px",
              fontSize: "9px",
              color: C.blue,
              borderColor: C.blue,
            }}
          >
            {open ? "▲ Hide" : "▼ Show"}
          </button>
        </div>

        {open && (
          <div style={{ marginTop: 16 }}>
            {/* Step flow */}
            <div
              style={{
                display: "flex",
                gap: 0,
                flexWrap: "wrap",
                alignItems: "stretch",
                marginBottom: 16,
              }}
            >
              {[
                {
                  step: "1",
                  icon: "📥",
                  title: "Supply Chain",
                  color: C.blue,
                  what: "Receive raw materials",
                  how: "HQ → Supply Chain → Purchase Orders\nCreate a PO for distillate, terpenes, hardware.\nWhen stock arrives, click 'Receive' — quantities auto-add to inventory.",
                  result:
                    "Raw materials appear in inventory with correct quantities.",
                },
                {
                  step: "2",
                  icon: "⚗",
                  title: "New Production Run",
                  color: C.purple,
                  what: "Manufacture finished product",
                  how: "HQ → Production → New Production Run\nSelect strain + format (e.g. MAC 1ml Cart).\nEnter how many units you're filling.\nSystem shows exactly what raw materials will be deducted.",
                  result:
                    "Raw materials deducted. Finished units added to stock. Batch + run record created.",
                },
                {
                  step: "3",
                  icon: "💰",
                  title: "Set Sell Price",
                  color: C.gold,
                  what: "Price the product for the shop",
                  how: "HQ → Pricing tab\nFind the finished product.\nSet sell_price > R0.\nWithout a price, the product will NOT appear in the customer shop.",
                  result: "Product is now ready to go live.",
                },
                {
                  step: "4",
                  icon: "🛍",
                  title: "Live in Shop",
                  color: C.accent,
                  what: "Product appears automatically",
                  how: "No action needed.\nThe shop reads inventory_items WHERE:\n  • category = 'finished_product'\n  • is_active = true\n  • quantity_on_hand > 0\n  • sell_price > R0\nAll 4 conditions must be true.",
                  result:
                    "Customers can find, add to cart and buy the product online.",
                },
              ].map((s, i, arr) => (
                <React.Fragment key={s.step}>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 200,
                      background: C.white,
                      border: `1px solid ${s.color}30`,
                      borderTop: `3px solid ${s.color}`,
                      borderRadius: 2,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <div>
                        <div
                          style={{
                            fontFamily: F.body,
                            fontSize: 9,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color: s.color,
                            fontWeight: 700,
                          }}
                        >
                          Step {s.step}
                        </div>
                        <div
                          style={{
                            fontFamily: F.body,
                            fontSize: 13,
                            fontWeight: 700,
                            color: C.text,
                          }}
                        >
                          {s.title}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: F.body,
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.text,
                        marginBottom: 4,
                      }}
                    >
                      {s.what}
                    </div>
                    <div
                      style={{
                        fontFamily: F.body,
                        fontSize: 11,
                        color: C.muted,
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
                        borderRadius: 2,
                        padding: "6px 10px",
                        fontFamily: F.body,
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
                        color: C.muted,
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

            {/* Glossary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              {[
                {
                  term: "BATCH",
                  icon: "📦",
                  def: "A product record — describes what the product is (strain, format, expiry, lab cert). Does NOT add stock on its own.",
                },
                {
                  term: "PRODUCTION RUN",
                  icon: "⚗",
                  def: "A manufacturing event — logs how many units you filled today, deducts raw materials, adds finished stock.",
                },
                {
                  term: "INVENTORY ITEM",
                  icon: "📊",
                  def: "The live stock counter — quantity_on_hand is what the shop reads. This number goes up on production, down on each sale.",
                },
                {
                  term: "NOT LINKED",
                  icon: "⚠",
                  def: "Batch was created before v2.0 and has no inventory_item_id. Run a New Production Run to link it and enable live stock tracking.",
                },
                {
                  term: "LOW STOCK",
                  icon: "🟡",
                  def: "quantity_on_hand ≤ low_stock_threshold (default: 10). Still live in shop but you should plan a production run soon.",
                },
                {
                  term: "DEPLETED",
                  icon: "🔴",
                  def: "quantity_on_hand = 0. Product is automatically hidden from shop. Run production to restock and it reappears.",
                },
              ].map((g) => (
                <div
                  key={g.term}
                  style={{
                    background: C.warm,
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F.body,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: C.text,
                      marginBottom: 4,
                    }}
                  >
                    {g.icon} {g.term}
                  </div>
                  <div
                    style={{
                      fontFamily: F.body,
                      fontSize: 11,
                      color: C.muted,
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

// ═══════════════════════════════════════════════════════════════════════════════
// SET PRICE PANEL v2.4
// ═══════════════════════════════════════════════════════════════════════════════
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
        msg: `✓ ${item.name} updated to R${prices[item.id]}`,
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
        borderLeft: `3px solid ${C.accent}`,
        background: "#f0faf5",
      }}
    >
      <div style={sLabel}>💰 Set Sell Prices — Website Shop</div>
      <p
        style={{
          fontSize: "12px",
          color: C.mid,
          margin: "6px 0 12px",
          fontFamily: F.body,
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
            borderRadius: 2,
            fontSize: 12,
            fontFamily: F.body,
            background: toast.type === "success" ? "#f0faf5" : "#fff0f0",
            color: toast.type === "success" ? C.green : C.red,
            border: `1px solid ${toast.type === "success" ? C.accent : C.red}`,
          }}
        >
          {toast.msg}
        </div>
      )}
      {finished.length === 0 ? (
        <p style={{ fontSize: "12px", color: C.muted, fontFamily: F.body }}>
          No finished products in inventory yet.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            fontFamily: F.body,
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
              return (
                <tr key={i.id}>
                  <td style={{ ...sTd, fontWeight: 500 }}>{i.name}</td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: C.muted,
                    }}
                  >
                    {i.sku}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      color: qty <= 0 ? C.red : C.green,
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
                        borderRadius: 2,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        background: isLive
                          ? "#d4edda"
                          : qty <= 0
                            ? "#ffebee"
                            : "#fff3e8",
                        color: isLive ? C.green : qty <= 0 ? C.red : C.orange,
                      }}
                    >
                      {isLive
                        ? "🟢 Live"
                        : qty <= 0
                          ? "🔴 No Stock"
                          : "🟡 Price Needed"}
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
export default function HQProduction() {
  const [subTab, setSubTab] = useState("overview");
  const ctx = usePageContext("hq-production", null);
  const [items, setItems] = useState([]);
  const [runs, setRuns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsR, runsR, batchesR, partnersR] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("production_runs")
          .select(
            `
          id, batch_id, run_number, status, planned_units, actual_units,
          started_at, completed_at, notes, created_at,
          batches ( batch_number, product_name, strain, product_type, volume ),
          production_run_inputs (
            id, run_id, item_id, quantity_planned, quantity_actual, notes,
            inventory_items ( name, sku, unit, category )
          )
        `,
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("batches")
          .select(
            "id,batch_number,product_name,product_type,strain,volume,status,lifecycle_status,inventory_item_id,low_stock_threshold,production_date,expiry_date,units_produced,thc_content,cbd_content,lab_certified,is_archived,tenant_id",
          )
          .eq("is_archived", false)
          .order("production_date", { ascending: false }),
        supabase
          .from("wholesale_partners")
          .select("id,name,contact_name")
          .eq("is_active", true)
          .order("name"),
      ]);
      if (itemsR.error) throw itemsR.error;
      if (runsR.error) throw runsR.error;
      if (batchesR.error) throw batchesR.error;
      setItems(itemsR.data || []);
      setRuns(runsR.data || []);
      setBatches(batchesR.data || []);
      setPartners(partnersR.data || []);
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
    { id: "overview", label: "Overview", icon: "◎" },
    { id: "batches", label: "Batches", icon: "📦" },
    { id: "new-run", label: "New Production Run", icon: "⊕" },
    { id: "history", label: "History", icon: "📋" },
    { id: "allocate", label: "Allocate Stock", icon: "→" },
    { id: "audit", label: "Audit Export", icon: "🔍" },
  ];

  // Compute stock alerts across all finished products
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
          borderLeft: `3px solid ${C.error}`,
          margin: "20px 0",
        }}
      >
        <div style={sLabel}>Error</div>
        <p style={{ fontSize: "13px", color: C.error, margin: "8px 0 0" }}>
          {error}
        </p>
        <button onClick={fetchAll} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );

  return (
    <div>
      {/* ── Global Stock Alert Banner ── */}
      {(depleted.length > 0 || lowStock.length > 0) && !loading && (
        <div style={{ marginBottom: "20px" }}>
          {depleted.length > 0 && (
            <div
              style={{
                ...sCard,
                borderLeft: `4px solid ${C.red}`,
                background: "#fff5f5",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
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
                      color: C.red,
                      fontFamily: F.body,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    🚨 {depleted.length} Product{depleted.length > 1 ? "s" : ""}{" "}
                    Out of Stock — Shop Hidden
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {depleted.map((i) => (
                      <span
                        key={i.id}
                        style={{
                          fontSize: "11px",
                          background: "#ffebee",
                          color: C.red,
                          padding: "2px 10px",
                          borderRadius: "2px",
                          fontFamily: F.body,
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
                  style={{
                    ...sBtn("primary"),
                    background: C.red,
                    whiteSpace: "nowrap",
                  }}
                >
                  + New Production Run →
                </button>
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div
              style={{
                ...sCard,
                borderLeft: `4px solid ${C.orange}`,
                background: C.lightOrange,
              }}
            >
              <div
                style={{
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
                      color: C.orange,
                      fontFamily: F.body,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    ⚠ {lowStock.length} Product{lowStock.length > 1 ? "s" : ""}{" "}
                    Running Low
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {lowStock.map((i) => {
                      const batch = batches.find(
                        (b) => b.inventory_item_id === i.id,
                      );
                      return (
                        <span
                          key={i.id}
                          style={{
                            fontSize: "11px",
                            background: "#fff3e8",
                            color: C.orange,
                            padding: "2px 10px",
                            borderRadius: "2px",
                            fontFamily: F.body,
                            fontWeight: 600,
                          }}
                        >
                          {i.name} —{" "}
                          {Math.floor(parseFloat(i.quantity_on_hand || 0))} left
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => setSubTab("new-run")}
                  style={{ ...sBtn("amber"), whiteSpace: "nowrap" }}
                >
                  Plan Production →
                </button>
              </div>
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
      {/* ── How It Works — persistent onboarding strip ── */}
      <HowItWorksBanner />

      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "8px 16px",
              background: subTab === t.id ? C.green : C.white,
              color: subTab === t.id ? C.white : C.muted,
              border: `1px solid ${subTab === t.id ? C.green : C.border}`,
              borderRadius: "2px",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: F.body,
              fontWeight: subTab === t.id ? 600 : 400,
              transition: "all 0.15s",
              position: "relative",
            }}
          >
            {t.icon} {t.label}
            {t.id === "batches" && batches.length > 0 && (
              <span
                style={{
                  marginLeft: "6px",
                  background: C.accent,
                  color: C.white,
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
                  background: C.red,
                  color: C.white,
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
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>◎</div>
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
              onNavNewRun={() => setSubTab("new-run")}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "new-run" && (
            <NewRunPanel
              items={items}
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

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
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

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Pipeline onboarding */}
      <div
        style={{
          ...sCard,
          borderLeft: `4px solid ${C.accent}`,
          background: "#f0faf5",
        }}
      >
        <div style={{ ...sLabel, color: C.mid, marginBottom: 8 }}>
          📋 Production Pipeline — How It Works
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
              color: C.blue,
            },
            { step: "→", label: "", desc: "", color: C.muted },
            {
              step: "2",
              label: "New Production Run",
              desc: "Select batch + materials → confirm",
              color: C.purple,
            },
            { step: "→", label: "", desc: "", color: C.muted },
            {
              step: "3",
              label: "Set Sell Price",
              desc: "HQ → Pricing → set sell_price > R0",
              color: C.gold,
            },
            { step: "→", label: "", desc: "", color: C.muted },
            {
              step: "4",
              label: "Live in Shop",
              desc: "Auto-appears when qty > 0 + price set",
              color: C.accent,
            },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              {s.step === "→" ? (
                <div style={{ fontSize: 18, color: C.muted, margin: "0 8px" }}>
                  →
                </div>
              ) : (
                <div
                  style={{
                    padding: "8px 14px",
                    background: C.white,
                    border: `1px solid ${s.color}30`,
                    borderRadius: 2,
                    borderLeft: `3px solid ${s.color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: s.color,
                      fontFamily: F.body,
                      fontWeight: 700,
                    }}
                  >
                    Step {s.step}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: F.body,
                      fontWeight: 600,
                      color: C.text,
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{ fontSize: 10, color: C.muted, fontFamily: F.body }}
                  >
                    {s.desc}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
          gap: "14px",
        }}
      >
        {[
          {
            label: "Active Batches",
            value: activeBatches.length,
            sub: `${batches.length} total`,
            color: C.green,
            click: onNavBatches,
          },
          {
            label: "Distillate",
            value: `${totalDist.toFixed(1)}ml`,
            sub: `${distillate.length} SKU`,
            color: C.blue,
          },
          {
            label: "Terpenes",
            value: `${totalTerp.toFixed(2)}ml`,
            sub: `${terpenes.length} strains`,
            color: C.purple,
          },
          {
            label: "Hardware",
            value: totalHw.toLocaleString(),
            sub: `${hardware.length} types`,
            color: C.gold,
          },
          {
            label: "Finished Stock",
            value: totalFin.toLocaleString(),
            sub: "units ready",
            color: depleted.length > 0 ? C.red : C.accent,
          },
          {
            label: "1ml Capacity",
            value: cap1ml.toLocaleString(),
            sub: "carts possible",
            color: C.green,
          },
          {
            label: "Runs (Month)",
            value: monthRuns.length,
            sub: `${monthUnits} units`,
            color: C.blue,
          },
          {
            label: "Avg Yield",
            value: avgYield ? `${avgYield}%` : "—",
            sub: "all runs",
            color: avgYield && parseFloat(avgYield) >= 95 ? C.accent : C.gold,
          },
        ].map((c) => (
          <div
            key={c.label}
            onClick={c.click || undefined}
            style={{
              ...sCard,
              borderTop: `3px solid ${c.color}`,
              textAlign: "center",
              cursor: c.click ? "pointer" : "default",
            }}
            onMouseEnter={(e) => {
              if (c.click)
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              if (c.click)
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
            }}
          >
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: "6px",
                fontFamily: F.body,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: c.color,
                fontFamily: F.heading,
              }}
            >
              {c.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: C.muted,
                marginTop: "2px",
                fontFamily: F.body,
              }}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

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
              fontFamily: F.body,
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
                        fontFamily: "monospace",
                        fontSize: "11px",
                        color: C.muted,
                      }}
                    >
                      {b.batch_number}
                    </td>
                    <td style={{ ...sTd, fontWeight: 500 }}>
                      {b.product_name || "—"}
                    </td>
                    <td style={sTd}>{b.strain || "—"}</td>
                    <td style={{ ...sTd, textAlign: "right", fontWeight: 600 }}>
                      {b.units_produced ?? "-"}
                    </td>
                    <td style={{ ...sTd, color: C.muted }}>
                      {b.production_date
                        ? new Date(b.production_date).toLocaleDateString(
                            "en-ZA",
                          )
                        : "—"}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        fontWeight: 600,
                        color:
                          qty === null
                            ? C.muted
                            : qty <= 0
                              ? C.red
                              : qty <= 10
                                ? C.orange
                                : C.green,
                      }}
                    >
                      {qty === null ? "—" : `${Math.floor(qty)} pcs`}
                    </td>
                    <td style={sTd}>
                      <LifecycleBadge status={b.lifecycle_status} />
                    </td>
                    <td style={sTd}>
                      {b.lab_certified ? (
                        <span style={{ color: C.green }}>✓</span>
                      ) : (
                        <span style={{ color: C.muted }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        {[
          { label: "🧪 Distillate", data: distillate, unit: "ml", decimals: 1 },
          { label: "🌿 Terpenes", data: terpenes, unit: "ml", decimals: 2 },
          { label: "⚙ Hardware", data: hardware, unit: "pcs", decimals: 0 },
          { label: "📦 Finished", data: finished, unit: "pcs", decimals: 0 },
        ].map(({ label, data, unit, decimals }) => (
          <div key={label} style={sCard}>
            <div style={sLabel}>{label}</div>
            {data.length === 0 ? (
              <p
                style={{
                  fontSize: "12px",
                  color: C.muted,
                  marginTop: "8px",
                  fontFamily: F.body,
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
                  fontFamily: F.body,
                  marginTop: "10px",
                }}
              >
                <thead>
                  <tr>
                    <th style={sTh}>Name</th>
                    <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                    {label === "📦 Finished" && (
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
                          fontWeight: 600,
                          color:
                            parseFloat(i.quantity_on_hand || 0) <= 0
                              ? C.red
                              : C.text,
                        }}
                      >
                        {decimals === 0
                          ? Math.floor(parseFloat(i.quantity_on_hand || 0))
                          : parseFloat(i.quantity_on_hand || 0).toFixed(
                              decimals,
                            )}
                        {unit === "pcs" ? "" : unit}
                      </td>
                      {label === "📦 Finished" && (
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            color:
                              parseFloat(i.sell_price || 0) > 0
                                ? C.text
                                : C.red,
                          }}
                        >
                          {parseFloat(i.sell_price || 0) > 0
                            ? `R${parseFloat(i.sell_price).toFixed(0)}`
                            : "R0 ⚠"}
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

// ═══════════════════════════════════════════════════════════════════════════════
// BATCHES PANEL v2.0 — lifecycle, stock levels, archive, new run shortcut
// ═══════════════════════════════════════════════════════════════════════════════
function BatchesPanel({ batches, runs, items, onNavNewRun, onRefresh }) {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [deleting, setDeleting] = useState(null); // batch id pending delete confirm
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
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
      // Safe to delete — no production runs linked
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

  const runByBatch = {};
  runs.forEach((r) => {
    if (r.batch_id) runByBatch[r.batch_id] = r;
  });

  // Link each batch to its inventory item
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
    });
  };

  const handleSaveEdit = async (b) => {
    setSaving(true);
    try {
      // IMPORTANT: batches table has NO updated_at column
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
      setArchiving(null);
      onRefresh();
      showToast(`Batch ${b.batch_number} archived.`);
    } catch (err) {
      showToast("Archive failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const depletedCount = batches.filter(
    (b) => getEffectiveLifecycle(b) === "depleted",
  ).length;
  const lowCount = batches.filter(
    (b) => getEffectiveLifecycle(b) === "low_stock",
  ).length;

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
            borderRadius: "2px",
            fontSize: "12px",
            fontFamily: F.body,
            fontWeight: 500,
            background: toast.type === "error" ? "#fff0f0" : "#f0faf5",
            color: toast.type === "error" ? C.red : C.green,
            border: `1px solid ${toast.type === "error" ? C.red : C.accent}`,
          }}
        >
          {toast.type === "error" ? "⚠ " : "✓ "}
          {toast.msg}
        </div>
      )}

      {/* Onboarding panel — shown when no batches linked to inventory */}
      {batches.length === 0 && (
        <div
          style={{
            ...sCard,
            borderLeft: `4px solid ${C.accent}`,
            background: "#f0faf5",
          }}
        >
          <div style={{ ...sLabel, color: C.mid, marginBottom: 12 }}>
            Getting Started — No Batches Yet
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                icon: "📥",
                title: "1. Receive Raw Materials",
                desc: "HQ → Supply Chain → Purchase Orders. Receive a PO to add distillate, terpenes and hardware to inventory.",
              },
              {
                icon: "⊕",
                title: "2. New Production Run",
                desc: "Use the 'New Production Run' tab. Select a strain, format and quantity. The system deducts raw materials and adds finished stock.",
              },
              {
                icon: "💰",
                title: "3. Set Sell Price",
                desc: "HQ → Pricing. Set sell_price > R0 for each finished product. Without a price, the shop won't display it.",
              },
              {
                icon: "🛍",
                title: "4. Live in Shop",
                desc: "Once qty > 0 and sell_price > R0, the product appears automatically in the customer shop. No further action needed.",
              },
            ].map((s) => (
              <div
                key={s.title}
                style={{
                  padding: "12px 14px",
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: F.body,
                    color: C.text,
                    marginBottom: 4,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    fontFamily: F.body,
                    lineHeight: 1.6,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          { label: "Total Batches", value: batches.length, color: C.green },
          {
            label: "Active",
            value: batches.filter((b) => b.status === "active").length,
            color: C.accent,
          },
          {
            label: "Lab Certified",
            value: batches.filter((b) => b.lab_certified).length,
            color: C.blue,
          },
          {
            label: "With Production Run",
            value: Object.keys(runByBatch).length,
            color: C.gold,
          },
          {
            label: "No Run Yet",
            value: batches.filter((b) => !runByBatch[b.id]).length,
            color: C.orange,
          },
          {
            label: "Depleted",
            value: depletedCount,
            color: depletedCount > 0 ? C.red : C.muted,
          },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              ...sCard,
              borderTop: `3px solid ${c.color}`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: "6px",
                fontFamily: F.body,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: c.color,
                fontFamily: F.heading,
              }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

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
              background: filter === f.id ? C.green : C.white,
              color: filter === f.id ? C.white : f.alert ? C.orange : C.muted,
              border: `1px solid ${filter === f.id ? C.green : f.alert ? C.orange : C.border}`,
              borderRadius: "2px",
              fontSize: "9px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: F.body,
              fontWeight: filter === f.id ? 600 : 400,
            }}
          >
            {f.label}
            {f.alert ? " ⚠" : ""}
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
          ↻ Refresh
        </button>
      </div>

      <div style={sCard}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📦</div>
            <p style={{ fontFamily: F.body, fontSize: "14px" }}>
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
                borderBottom: `2px solid ${C.border}`,
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
                      borderBottom: `1px solid ${C.border}`,
                      alignItems: "center",
                      background: isDepleted
                        ? "#fff8f8"
                        : isLow
                          ? "#fffbf5"
                          : isEditing
                            ? "#f0faf5"
                            : "transparent",
                    }}
                  >
                    <div
                      style={{
                        ...sTd,
                        fontFamily: "monospace",
                        fontSize: "10px",
                        color: C.muted,
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
                        color: !b.product_type ? C.orange : C.muted,
                        fontSize: "11px",
                      }}
                    >
                      {b.product_type || <span>⚠ empty</span>}
                    </div>
                    <div style={sTd}>{b.strain || "—"}</div>
                    <div
                      style={{ ...sTd, textAlign: "right", fontWeight: 600 }}
                    >
                      {b.units_produced ?? "-"}
                    </div>
                    {/* v2.0: live stock column */}
                    <div
                      style={{
                        ...sTd,
                        fontWeight: 700,
                        color:
                          qty === null
                            ? C.muted
                            : isDepleted
                              ? C.red
                              : isLow
                                ? C.orange
                                : C.green,
                      }}
                    >
                      {qty === null ? (
                        <span style={{ color: C.muted, fontSize: 10 }}>
                          not linked
                        </span>
                      ) : (
                        `${Math.floor(qty)} pcs`
                      )}
                    </div>
                    <div style={{ ...sTd, color: C.muted, fontSize: "11px" }}>
                      {b.production_date
                        ? new Date(b.production_date).toLocaleDateString(
                            "en-ZA",
                          )
                        : "—"}
                    </div>
                    <div style={{ ...sTd, color: C.muted, fontSize: "11px" }}>
                      {b.expiry_date
                        ? new Date(b.expiry_date).toLocaleDateString("en-ZA")
                        : "—"}
                    </div>
                    <div style={sTd}>
                      {b.lab_certified ? (
                        <span style={{ color: C.green, fontWeight: 600 }}>
                          ✓
                        </span>
                      ) : (
                        <span style={{ color: C.muted }}>—</span>
                      )}
                    </div>
                    <div style={{ ...sTd, fontSize: "10px" }}>
                      {linkedRun ? (
                        <span
                          style={{ color: C.green, fontFamily: "monospace" }}
                        >
                          {linkedRun.run_number || "✓"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "2px 6px",
                            borderRadius: "2px",
                            background: C.lightOrange,
                            color: C.orange,
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
                          color: isEditing ? C.muted : C.mid,
                          borderColor: isEditing ? C.muted : C.mid,
                        }}
                      >
                        {isEditing ? "✕" : "✎"}
                      </button>
                      {/* New Run shortcut */}
                      {!linkedRun && (
                        <button
                          onClick={onNavNewRun}
                          title="New Production Run"
                          style={{
                            ...sBtn("outline"),
                            padding: "3px 8px",
                            fontSize: "9px",
                            color: C.accent,
                            borderColor: C.accent,
                          }}
                        >
                          ⊕
                        </button>
                      )}
                      {/* Archive */}
                      {(isDepleted || b.status !== "archived") && (
                        <button
                          onClick={() => handleArchive(b)}
                          title="Archive batch"
                          style={{
                            ...sBtn("outline"),
                            padding: "3px 8px",
                            fontSize: "9px",
                            color: C.muted,
                            borderColor: C.muted,
                          }}
                        >
                          🗄
                        </button>
                      )}
                      {/* Delete — only when no production run linked */}
                      {!linkedRun && deleting !== b.id && (
                        <button
                          onClick={() => setDeleting(b.id)}
                          title="Delete batch"
                          style={{
                            ...sBtn("outline"),
                            padding: "3px 8px",
                            fontSize: "9px",
                            color: C.red,
                            borderColor: C.red,
                          }}
                        >
                          🗑
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
                            {saving ? "..." : "✓ Delete"}
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
                        background: "#f0faf5",
                        borderBottom: `1px solid ${C.accent}`,
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
                                color: C.muted,
                                display: "block",
                                marginBottom: "3px",
                                fontFamily: F.body,
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
                              color: C.muted,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: F.body,
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
                              color: C.muted,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: F.body,
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
                              color: C.muted,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: F.body,
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
                              color: C.muted,
                              display: "block",
                              marginBottom: "3px",
                              fontFamily: F.body,
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
                            fontFamily: F.body,
                            color: C.text,
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
                          {saving ? "Saving..." : "✓ Save"}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          style={sBtn("outline")}
                        >
                          Cancel
                        </button>
                        <span
                          style={{
                            fontSize: "10px",
                            color: C.muted,
                            fontFamily: F.body,
                          }}
                        >
                          ℹ Low Stock Alert = notify when qty drops below this
                          number
                        </span>
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
            ...sCard,
            borderLeft: `4px solid ${C.orange}`,
            background: C.lightOrange,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ ...sLabel, color: C.orange }}>
                ⚠ Batches Without Production Runs
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: C.text,
                  margin: "8px 0 0",
                  fontFamily: F.body,
                  lineHeight: "1.7",
                }}
              >
                {batches.filter((b) => !runByBatch[b.id]).length} batch(es) have
                no linked production run. Use New Production Run to log material
                consumption going forward.
              </p>
            </div>
            <button
              onClick={onNavNewRun}
              style={{ ...sBtn("amber"), whiteSpace: "nowrap" }}
            >
              + New Run →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW RUN v2.0 — writes inventory_item_id + lifecycle_status back to batch
// ═══════════════════════════════════════════════════════════════════════════════
function NewRunPanel({ items, onComplete }) {
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
  });
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [completedRun, setCompletedRun] = useState(null); // for post-completion prompt
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setConfirmed(false);
  };

  const fmt = FORMAT_CATALOGUE[form.format_key] || FORMAT_CATALOGUE["vape_1ml"];
  const isVape = fmt.is_vape;
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

  const distItems = items.filter(
    (i) => i.category === "raw_material" && i.unit === "ml",
  );
  const terpItems = items.filter((i) => i.category === "terpene");
  const hwItems = items.filter((i) => i.category === "hardware");
  const selDist = distItems.find((i) => i.id === form.distillate_item_id);
  const selTerp = terpItems.find((i) => i.id === form.terpene_item_id);
  const selHw = hwItems.find((i) => i.id === form.hardware_item_id);
  const distAvail = parseFloat(selDist?.quantity_on_hand || 0);
  const terpAvail = parseFloat(selTerp?.quantity_on_hand || 0);
  const hwAvail = parseFloat(selHw?.quantity_on_hand || 0);
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
  const canRun = planned > 0 && vapeMatsOk && hasName;
  const distCost = selDist
    ? parseFloat(selDist.cost_price || 0) * distNeeded
    : 0;
  const terpCost = selTerp
    ? parseFloat(selTerp.cost_price || 0) * terpNeeded
    : 0;
  const hwCost = selHw ? parseFloat(selHw.cost_price || 0) * hwNeeded : 0;
  const totalCost = distCost + terpCost + hwCost;
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
        color: C.muted,
        display: "block",
        marginBottom: "4px",
        fontFamily: F.body,
      }}
    >
      {text}
      {hint && (
        <span style={{ color: C.accent, marginLeft: "6px", fontSize: "9px" }}>
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

      // Find or create finished_product inventory item
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

      // v2.0: Write inventory_item_id + lifecycle_status back to the batch
      await supabase
        .from("batches")
        .update({
          inventory_item_id: finId,
          lifecycle_status: "active",
        })
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

  // Post-completion state
  if (completedRun) {
    const needsPrice = parseFloat(completedRun.sellPrice || 0) <= 0;
    return (
      <div style={{ maxWidth: "640px" }}>
        <div
          style={{
            ...sCard,
            borderLeft: `4px solid ${C.accent}`,
            background: "#f0faf5",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div
            style={{
              fontFamily: F.heading,
              fontSize: 22,
              fontWeight: 600,
              color: C.green,
              marginBottom: 6,
            }}
          >
            Production Run Complete
          </div>
          <div
            style={{
              fontFamily: F.body,
              fontSize: 13,
              color: C.mid,
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
                fontFamily: "monospace",
                background: C.warm,
                padding: "2px 6px",
              }}
            >
              {completedRun.runNumber}
            </code>
          </div>
          {needsPrice && (
            <div
              style={{
                padding: "14px 16px",
                background: "#fffbe6",
                border: `1px solid ${C.gold}`,
                borderRadius: 2,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: F.body,
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.gold,
                  marginBottom: 6,
                }}
              >
                ⚠ Sell Price Not Set — Product NOT yet visible in Shop
              </div>
              <div
                style={{
                  fontFamily: F.body,
                  fontSize: 12,
                  color: C.text,
                  lineHeight: 1.6,
                }}
              >
                To make <strong>{completedRun.finishedName}</strong> visible on
                the customer shop, you need to set a sell price.
                <br />
                Go to <strong>HQ → Pricing</strong> and set a sell_price &gt; R0
                for this product.
              </div>
            </div>
          )}
          {!needsPrice && (
            <div
              style={{
                padding: "12px 16px",
                background: "#d4edda",
                borderRadius: 2,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: F.body,
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.green,
                }}
              >
                ✓ Product is now live in the shop (sell price already set: R
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
              ✓ Done — View History
            </button>
            <button
              onClick={() => setCompletedRun(null)}
              style={sBtn("outline")}
            >
              + Another Run
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "20px", maxWidth: "820px" }}>
      <div style={{ ...sCard, borderLeft: `4px solid ${C.accent}` }}>
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
              {FORMAT_GROUPS.map((g) => (
                <optgroup key={g.groupLabel} label={g.groupLabel}>
                  {g.keys.map((k) => (
                    <option key={k} value={k}>
                      {FORMAT_CATALOGUE[k].label}
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
                background: C.warm,
                borderRadius: "2px",
                fontSize: "12px",
                fontFamily: F.body,
                color: C.text,
                display: "flex",
                alignItems: "center",
              }}
            >
              ℹ Triple Chamber:{" "}
              <strong style={{ margin: "0 4px" }}>
                {distMlPerUnit.toFixed(2)}ml distillate/unit
              </strong>{" "}
              ({fillMlPerChamber}ml × {chambers} chambers)
            </div>
          )}
          <div>
            {fLabel(isVape ? "Strain *" : "Strain (optional)")}
            <select
              style={sSelect}
              value={form.strain}
              onChange={(e) => set("strain", e.target.value)}
            >
              <option value="">— Select Strain —</option>
              {STRAIN_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
                    color: C.accent,
                    margin: "4px 0 0",
                    fontFamily: F.body,
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
        <div style={{ ...sCard, borderLeft: `4px solid ${C.blue}` }}>
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
                    color: C.red,
                    margin: "4px 0 0",
                    fontFamily: F.body,
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

      {!isVape && planned > 0 && (
        <div
          style={{
            ...sCard,
            borderLeft: `4px solid ${C.gold}`,
            background: "#fffdf5",
          }}
        >
          <div style={{ ...sLabel, color: C.gold, marginBottom: "8px" }}>
            Non-Vape Run — Units Only
          </div>
          <p
            style={{
              fontSize: "12px",
              color: C.text,
              margin: 0,
              fontFamily: F.body,
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
              borderLeft: `4px solid ${canRun ? C.accent : C.red}`,
              background: canRun ? "#f0faf5" : "#fff5f5",
            }}
          >
            <div
              style={{
                ...sLabel,
                color: canRun ? C.green : C.red,
                marginBottom: "16px",
              }}
            >
              Step 3 — Bill of Materials{" "}
              {canRun
                ? "✓ All materials available"
                : "✕ Insufficient materials"}
            </div>
            <StockGauge
              label="Distillate"
              available={distAvail}
              needed={distNeeded}
              unit="ml"
              color={C.blue}
            />
            <StockGauge
              label={`Terpene (${selTerp?.name || "—"})`}
              available={terpAvail}
              needed={terpNeeded}
              unit="ml"
              color={C.purple}
            />
            <StockGauge
              label={`Hardware (${selHw?.name || "—"})`}
              available={hwAvail}
              needed={hwNeeded}
              unit=" pcs"
              color={C.gold}
            />
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                paddingTop: "14px",
                marginTop: "8px",
                display: "flex",
                gap: "32px",
                flexWrap: "wrap",
              }}
            >
              {[
                ["Output", `${planned} × ${finishedName || "—"}`, C.green],
                ["Dist / Unit", `${distMlPerUnit.toFixed(2)}ml`, C.blue],
                ["Cost / Unit", `R${costPerUnit}`, C.gold],
                ["Total Material Cost", `R${totalCost.toFixed(2)}`, C.blue],
                ["Run Number", runNumber, C.muted],
              ].map(([lbl, val, color]) => (
                <div key={lbl}>
                  <div
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: C.muted,
                      marginBottom: "4px",
                      fontFamily: F.body,
                    }}
                  >
                    {lbl}
                  </div>
                  <div
                    style={{
                      fontSize: lbl === "Run Number" ? "13px" : "18px",
                      fontWeight: 600,
                      fontFamily:
                        lbl === "Run Number" ? "monospace" : F.heading,
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
        <div style={{ ...sCard, borderLeft: `4px solid ${C.gold}` }}>
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
                    color: C.orange,
                    margin: "4px 0 0",
                    fontFamily: F.body,
                  }}
                >
                  ⚠ Yield {yieldPct}% — below 95% threshold
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
                background: C.warm,
                borderRadius: "2px",
                marginBottom: "14px",
                fontSize: "13px",
                fontFamily: F.body,
                color: C.text,
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
                {isVape && (
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
                    background: saving ? C.muted : C.green,
                    minWidth: "180px",
                  }}
                >
                  {saving ? "Processing..." : "✓ Confirm Production Run"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY — unchanged from v1.2/v1.6
// ═══════════════════════════════════════════════════════════════════════════════
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
            borderRadius: "2px",
            fontSize: "12px",
            fontFamily: F.body,
            fontWeight: 500,
            background: toast.type === "error" ? "#fff0f0" : "#f0faf5",
            color: toast.type === "error" ? C.red : C.green,
            border: `1px solid ${toast.type === "error" ? C.red : C.accent}`,
          }}
        >
          {toast.type === "error" ? "⚠ " : "✓ "}
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
        <div style={{ fontSize: "11px", color: C.muted, fontFamily: F.body }}>
          {runs.length} production runs
        </div>
        <button
          onClick={onRefresh}
          style={{ ...sBtn("outline"), fontSize: "9px", padding: "6px 12px" }}
        >
          ↻ Refresh
        </button>
      </div>
      {runs.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            padding: "60px",
            color: C.muted,
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚗</div>
          <p style={{ fontFamily: F.body, fontSize: "14px" }}>
            No production runs yet.
          </p>
          <p
            style={{
              fontFamily: F.body,
              fontSize: "12px",
              color: C.muted,
              marginTop: "8px",
            }}
          >
            Use "New Production Run" to log your first batch.
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
                  borderLeft: `3px solid ${isCancelled ? C.muted : yp && yp < 95 ? C.orange : C.accent}`,
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
                        fontFamily: F.heading,
                        color: C.text,
                      }}
                    >
                      {productLabel}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: C.muted,
                        fontFamily: "monospace",
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
                        color: C.muted,
                        fontFamily: F.body,
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
                      ✎ Edit
                    </button>
                    {!isCancelled && cancelling !== run.id && (
                      <button
                        onClick={() => setCancelling(run.id)}
                        style={{
                          ...sBtn("outline"),
                          padding: "4px 10px",
                          fontSize: "9px",
                          color: C.orange,
                          borderColor: C.orange,
                        }}
                      >
                        ✕ Cancel
                      </button>
                    )}
                    {cancelling === run.id && (
                      <>
                        <span
                          style={{
                            fontSize: "11px",
                            color: C.orange,
                            fontFamily: F.body,
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
                            color: C.red,
                            borderColor: C.red,
                          }}
                        >
                          {saving ? "..." : "✓ Yes"}
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
                        color: C.red,
                        borderColor: C.red,
                      }}
                    >
                      🗑 Delete
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
                          color: C.muted,
                          fontFamily: F.body,
                        }}
                      >
                        {lbl}
                      </div>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: 600,
                          fontFamily: F.heading,
                          color:
                            lbl === "Yield" && yp && yp < 95
                              ? C.orange
                              : C.text,
                        }}
                      >
                        {val}
                        <span
                          style={{
                            fontSize: "12px",
                            color: C.muted,
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
                      background: C.lightOrange,
                      borderRadius: "2px",
                      fontSize: "12px",
                      color: C.orange,
                      fontFamily: F.body,
                    }}
                  >
                    ⚠ Yield {yp}% — below 95% threshold.
                  </div>
                )}
                {isOpen && (
                  <div
                    style={{
                      marginTop: "14px",
                      borderTop: `1px solid ${C.border}`,
                      paddingTop: "14px",
                    }}
                  >
                    {isDeleting && (
                      <div
                        style={{
                          padding: "16px",
                          background: "#fff5f5",
                          border: `1px solid ${C.red}`,
                          borderRadius: "2px",
                          marginBottom: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: C.red,
                            fontFamily: F.body,
                            marginBottom: "10px",
                          }}
                        >
                          ⚠ Delete Run {run.run_number}?
                        </div>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            marginBottom: "14px",
                            fontSize: "12px",
                            fontFamily: F.body,
                            color: C.text,
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
                            {saving ? "Deleting..." : "✓ Confirm Delete"}
                          </button>
                          <button
                            onClick={() => setDeleting(null)}
                            style={sBtn("outline")}
                          >
                            ← Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {isEditing && (
                      <div
                        style={{
                          padding: "16px",
                          background: "#f0faf5",
                          border: `1px solid ${C.accent}`,
                          borderRadius: "2px",
                          marginBottom: "14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "9px",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color: C.accent,
                            fontFamily: F.body,
                            marginBottom: "14px",
                          }}
                        >
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
                                color: C.muted,
                                display: "block",
                                marginBottom: "4px",
                                fontFamily: F.body,
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
                                color: C.muted,
                                display: "block",
                                marginBottom: "4px",
                                fontFamily: F.body,
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
                                color: C.muted,
                                display: "block",
                                marginBottom: "4px",
                                fontFamily: F.body,
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
                            {saving ? "Saving..." : "✓ Save Changes"}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            style={sBtn("outline")}
                          >
                            ← Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {run.production_run_inputs?.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(180px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {run.production_run_inputs.map((inp) => (
                          <div
                            key={inp.id}
                            style={{
                              padding: "10px 14px",
                              background: C.warm,
                              borderRadius: "2px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "9px",
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                color: C.muted,
                                fontFamily: F.body,
                              }}
                            >
                              {inp.inventory_items?.name || "Material"}
                            </div>
                            <div
                              style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                fontFamily: F.heading,
                                color: C.text,
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
                                  color: C.muted,
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
                          color: C.muted,
                          fontStyle: "italic",
                          margin: "10px 0 0",
                          fontFamily: F.body,
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

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOCATE v2.0 — updates batch lifecycle_status after depletion
// ═══════════════════════════════════════════════════════════════════════════════
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
      icon: "🏪",
      desc: "Allocate to a retail partner",
    },
    {
      id: "samples",
      label: "Samples",
      icon: "🎁",
      desc: "Internal / giveaway units",
    },
    {
      id: "write_off",
      label: "Write Off",
      icon: "✕",
      desc: "Damaged or destroyed units",
    },
  ];

  const handleAllocate = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const partner = partners.find((p) => p.id === form.partner_id);
      const ref =
        form.channel === "wholesale" && partner ? partner.name : form.channel;
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

      // v2.0: update batch lifecycle_status if depleted
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
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
              borderLeft: `4px solid ${form.channel === ch.id ? C.green : C.border}`,
              background: form.channel === ch.id ? "#f0faf5" : C.white,
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>
              {ch.icon}
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: F.body,
                color: C.text,
              }}
            >
              {ch.label}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: C.muted,
                fontFamily: F.body,
                marginTop: "3px",
              }}
            >
              {ch.desc}
            </div>
          </div>
        ))}
      </div>
      <div style={sCard}>
        <div style={sLabel}>📦 Available Finished Stock</div>
        {finished.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: C.muted,
              marginTop: "10px",
              fontFamily: F.body,
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
              fontFamily: F.body,
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
                      form.item_id === i.id ? "#f0faf5" : "transparent",
                  }}
                >
                  <td style={{ ...sTd, fontWeight: 500 }}>
                    {form.item_id === i.id && (
                      <span style={{ color: C.accent, marginRight: "6px" }}>
                        ►
                      </span>
                    )}
                    {i.name}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: C.muted,
                    }}
                  >
                    {i.sku}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontWeight: 600,
                      color: C.green,
                    }}
                  >
                    {Math.floor(parseFloat(i.quantity_on_hand || 0))} pcs
                  </td>
                  <td style={{ ...sTd, textAlign: "right" }}>
                    R{parseFloat(i.sell_price || 0).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {form.item_id && (
        <div style={{ ...sCard, borderLeft: `4px solid ${C.gold}` }}>
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
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                  fontFamily: F.body,
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
                    color: C.muted,
                    display: "block",
                    marginBottom: "4px",
                    fontFamily: F.body,
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
                      {p.name}
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
                color: C.muted,
                display: "block",
                marginBottom: "4px",
                fontFamily: F.body,
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
                background: C.warm,
                borderRadius: "2px",
                marginBottom: "12px",
                fontSize: "12px",
                fontFamily: F.body,
                color: C.text,
              }}
            >
              <strong>
                {qty} × {selItem.name}
              </strong>{" "}
              → {CHANNELS.find((c) => c.id === form.channel)?.label}
              {qty > available && (
                <span
                  style={{ color: C.red, marginLeft: "8px", fontWeight: 600 }}
                >
                  ⚠ Exceeds stock
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleAllocate}
            disabled={saving || !valid}
            style={{ ...sBtn(), opacity: valid ? 1 : 0.5 }}
          >
            {saving ? "Recording..." : `✓ Allocate ${qty || "?"} Units`}
          </button>
        </div>
      )}
      <SetPricePanel items={items} onRefresh={onRefresh} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT PANEL — unchanged from v1.6
// ═══════════════════════════════════════════════════════════════════════════════
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
          `
        id, qr_code, qr_type, claimed, claimed_by, claimed_at,
        scan_count, points_value, is_active, created_at, batch_id,
        batches ( id, batch_number, product_name, strain, product_type, production_date, expiry_date, lab_certified, lab_name, units_produced, status )
      `,
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
            "qr_code_id, scan_outcome, scanned_at, user_id, ip_city, ip_province",
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
        `Flag ALL QR codes from batch ${batchNumber} as INACTIVE?\n\nThis is a quality recall action. It can be reversed by re-activating codes individually.`,
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
        `✓ ${data?.length || 0} QR codes from ${batchNumber} flagged inactive`,
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
            borderRadius: "2px",
            fontSize: "12px",
            fontFamily: F.body,
            fontWeight: 500,
            background: toast.type === "error" ? "#fff0f0" : "#f0faf5",
            color: toast.type === "error" ? C.red : C.green,
            border: `1px solid ${toast.type === "error" ? C.red : C.accent}`,
          }}
        >
          {toast.type === "error" ? "⚠ " : "✓ "}
          {toast.msg}
        </div>
      )}
      <div style={{ ...sCard, borderLeft: `4px solid ${C.blue}` }}>
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
            <div style={{ ...sLabel, color: C.blue }}>
              🔍 Regulatory Audit Export
            </div>
            <p
              style={{
                fontSize: "13px",
                color: C.muted,
                margin: "6px 0 0",
                fontFamily: F.body,
                lineHeight: "1.6",
              }}
            >
              Full traceability chain: Batch → QR codes → Scans → Customers.
              <br />
              Export CSV for regulatory compliance. Use QR Recall to flag a
              batch inactive on quality issues.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {!loaded ? (
              <button
                onClick={loadAudit}
                disabled={loading}
                style={{
                  ...sBtn(),
                  background: loading ? C.muted : C.blue,
                  minWidth: "140px",
                }}
              >
                {loading ? "Loading..." : "🔍 Load Audit Data"}
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
                  ↻ Refresh
                </button>
                <button
                  onClick={exportCSV}
                  style={{ ...sBtn(), background: C.green }}
                >
                  ⬇ Export CSV
                </button>
              </>
            )}
          </div>
        </div>
        {loaded && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            {[
              {
                label: "Batches",
                value: Object.keys(byBatch).length,
                color: C.green,
              },
              { label: "QR Codes", value: auditData.length, color: C.blue },
              {
                label: "Claimed",
                value: auditData.filter((r) => r.claimed).length,
                color: C.accent,
              },
              {
                label: "Total Scans",
                value: auditData.reduce((s, r) => s + (r.scan_count || 0), 0),
                color: C.gold,
              },
              {
                label: "Inactive",
                value: auditData.filter((r) => !r.is_active).length,
                color: C.muted,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: C.cream,
                  borderRadius: "2px",
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: s.color,
                    fontFamily: F.heading,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: C.muted,
                    fontFamily: F.body,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
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
          const isExpired = daysToExpiry !== null && daysToExpiry < 0,
            isRecalling = recallBatchId === batch_id;
          return (
            <div
              key={batchNum}
              style={{
                ...sCard,
                borderLeft: `3px solid ${isExpired ? C.red : inactive > 0 ? C.orange : C.accent}`,
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
                      fontFamily: F.heading,
                      color: C.green,
                    }}
                  >
                    {batch?.product_name || batchNum}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: C.muted,
                      fontFamily: "monospace",
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
                          borderRadius: "2px",
                          background: "#eafaf1",
                          color: C.green,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontFamily: F.body,
                        }}
                      >
                        🔬 Lab Certified
                      </span>
                    )}
                    {batch?.strain && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: C.muted,
                          fontFamily: F.body,
                        }}
                      >
                        🌿 {batch.strain}
                      </span>
                    )}
                    {batch?.expiry_date && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: isExpired ? C.red : C.muted,
                          fontFamily: F.body,
                          fontWeight: isExpired ? 600 : 400,
                        }}
                      >
                        {isExpired
                          ? "⚠ EXPIRED"
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
                        color: C.orange,
                        borderColor: C.orange,
                      }}
                    >
                      ⚠ QR Recall
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
                          color: C.orange,
                          fontFamily: F.body,
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
                          color: C.red,
                          borderColor: C.red,
                        }}
                      >
                        {recallLoading ? "..." : "✓ Confirm"}
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
                  ["QR Codes", qrs.length, C.blue],
                  ["Claimed", claimed, C.accent],
                  ["Total Scans", totalScans, C.gold],
                  ["Inactive", inactive, inactive > 0 ? C.orange : C.muted],
                ].map(([lbl, val, color]) => (
                  <div key={lbl}>
                    <div
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: C.muted,
                        fontFamily: F.body,
                      }}
                    >
                      {lbl}
                    </div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 600,
                        fontFamily: F.heading,
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
                    fontFamily: F.body,
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
                          background: !r.is_active ? "#fafafa" : "transparent",
                          opacity: r.is_active ? 1 : 0.6,
                        }}
                      >
                        <td
                          style={{
                            ...sTd,
                            fontFamily: "monospace",
                            fontSize: "10px",
                            color: C.muted,
                            padding: "6px 8px",
                          }}
                        >
                          {r.qr_code?.slice(0, 32)}
                          {r.qr_code?.length > 32 ? "…" : ""}
                        </td>
                        <td
                          style={{ ...sTd, padding: "6px 8px", color: C.muted }}
                        >
                          {r.qr_type}
                        </td>
                        <td style={{ ...sTd, padding: "6px 8px" }}>
                          <span
                            style={{
                              fontSize: "9px",
                              padding: "1px 6px",
                              borderRadius: "2px",
                              background: r.is_active ? "#d4edda" : "#f5f5f5",
                              color: r.is_active ? C.green : C.muted,
                              fontWeight: 600,
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
                              borderRadius: "2px",
                              background: r.claimed ? "#eafaf1" : C.cream,
                              color: r.claimed ? C.green : C.muted,
                              fontWeight: 600,
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
                            fontWeight: 600,
                          }}
                        >
                          {r.scan_count || 0}
                        </td>
                        <td
                          style={{ ...sTd, padding: "6px 8px", color: C.muted }}
                        >
                          {r.scans?.[0]?.scanned_at
                            ? new Date(
                                r.scans[0].scanned_at,
                              ).toLocaleDateString("en-ZA")
                            : "—"}
                        </td>
                        <td
                          style={{ ...sTd, padding: "6px 8px", color: C.muted }}
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
            color: C.muted,
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
          <p
            style={{
              fontFamily: F.body,
              fontSize: "14px",
              marginBottom: "16px",
            }}
          >
            Click "Load Audit Data" to fetch the full batch → QR → scan
            traceability chain.
          </p>
          <p style={{ fontFamily: F.body, fontSize: "12px", color: C.muted }}>
            Data loads on demand to keep the page fast. Export as CSV for
            regulatory submissions.
          </p>
        </div>
      )}
    </div>
  );
}
