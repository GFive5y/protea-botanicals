// src/components/hq/StockIntelPanel.js — v3.0
// WP-STOCK-OVERVIEW Phase 2 + Phase 4 — Intelligence Panels + Movement Heatmap
//
// Zone 4: Best Sellers · Margin Heroes · Fast Movers · Dead Stock
// Zone 5: 12-week × 7-day movement velocity heatmap
// Zone 6: AI Insights — ProteaAI via ai-copilot EF (LL-120: never direct to api.anthropic.com)
//
// Props:
//   items      — array   — from HQStock items state
//   movements  — array   — from HQStock movements state (last 100)
//   tenantId   — string  — PROP only (LL-160)
//   onNavigate — fn(tab) — jump to HQStock tab
//   onOpenItem — fn(item)— open StockItemPanel drawer

import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";

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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
};

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
  accessory: "Accessory",
  equipment: "Equipment",
  other: "Other",
};

const fmt = (n) =>
  n == null
    ? "—"
    : "R" +
      Number(n).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const SectionLabel = ({ children }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: T.ink400,
      fontFamily: T.font,
    }}
  >
    {children}
  </div>
);

const StatusBadge = ({ label, color, bg, bd }) => (
  <span
    style={{
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      padding: "2px 5px",
      borderRadius: 3,
      background: bg,
      color,
      border: `1px solid ${bd}`,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
  >
    {label}
  </span>
);

function IntelPanel({
  title,
  icon,
  badge,
  badgeColor,
  rows,
  emptyMsg,
  emptyCta,
  onEmptyCta,
  footerLabel,
  onFooter,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid " + T.ink150,
        borderRadius: 6,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid " + T.ink150,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: T.ink075,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.ink700,
            fontFamily: T.font,
          }}
        >
          {icon} {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 3,
              background: badgeColor?.bg || T.accentLit,
              color: badgeColor?.color || T.accentMid,
              border: `1px solid ${badgeColor?.bd || T.accentBd}`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ flex: 1, padding: "6px 0" }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: "20px 14px",
              fontSize: 12,
              color: T.ink300,
              fontFamily: T.font,
              textAlign: "center",
            }}
          >
            {emptyMsg}
            {emptyCta && onEmptyCta && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={onEmptyCta}
                  style={{
                    padding: "6px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: T.font,
                    background: T.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                  }}
                >
                  {emptyCta} →
                </button>
              </div>
            )}
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={idx}
              onClick={() => row.onClick?.()}
              style={{
                padding: "7px 14px",
                cursor: row.onClick ? "pointer" : "default",
                borderBottom:
                  idx < rows.length - 1 ? "1px solid " + T.ink075 : "none",
                transition: "background .1s",
              }}
              onMouseEnter={(e) => {
                if (row.onClick) e.currentTarget.style.background = T.accentLit;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: idx === 0 ? T.accentMid : T.ink300,
                    fontFamily: T.mono,
                    width: 14,
                    flexShrink: 0,
                    textAlign: "right",
                  }}
                >
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: T.ink700,
                        fontFamily: T.font,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.name}
                    </span>
                    {idx === 0 && row.badge && <StatusBadge {...row.badge} />}
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: T.ink150,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${row.pct}%`,
                        borderRadius: 2,
                        background: row.barColor || T.accentMid,
                        transition: "width .4s",
                      }}
                    />
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: T.mono,
                    fontVariantNumeric: "tabular-nums",
                    color: row.valueColor || T.ink700,
                    flexShrink: 0,
                    textAlign: "right",
                    minWidth: 50,
                  }}
                >
                  {row.value}
                </span>
              </div>
              {row.sub && (
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    fontFamily: T.font,
                    marginLeft: 22,
                    marginTop: 1,
                  }}
                >
                  {row.sub}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {footerLabel && (
        <div
          style={{ borderTop: "1px solid " + T.ink150, padding: "8px 14px" }}
        >
          <button
            onClick={onFooter}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: T.accentMid,
              fontFamily: T.font,
              padding: 0,
            }}
          >
            {footerLabel} →
          </button>
        </div>
      )}
    </div>
  );
}

function HeatmapTooltip({ cell, x, y }) {
  if (!cell) return null;
  const d = new Date(cell.date + "T00:00:00");
  const label = d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <div
      style={{
        position: "fixed",
        left: x + 10,
        top: y - 40,
        zIndex: 9999,
        background: T.ink900,
        color: "#fff",
        borderRadius: 5,
        padding: "6px 10px",
        fontSize: 11,
        fontFamily: T.font,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      {cell.count === 0 ? (
        <div style={{ color: "#aaa" }}>No activity</div>
      ) : (
        <>
          <div>
            {cell.count} movement{cell.count !== 1 ? "s" : ""}
          </div>
          {cell.saleOuts > 0 && (
            <div style={{ color: T.accentBd }}>
              {cell.saleOuts} sale{cell.saleOuts !== 1 ? "s" : ""}
            </div>
          )}
          {cell.purchases > 0 && (
            <div style={{ color: "#86efac" }}>
              {cell.purchases} receipt{cell.purchases !== 1 ? "s" : ""}
            </div>
          )}
          {cell.adjustments > 0 && (
            <div style={{ color: "#fcd34d" }}>
              {cell.adjustments} adjustment{cell.adjustments !== 1 ? "s" : ""}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Stock Glossary — collapsible, explains every term used on this screen ────
// Collapsed by default. One click to open. Plain English definitions.
// Same terms are used across the platform — this is the single reference.
const GLOSSARY_TERMS = [
  {
    term: "AVCO",
    full: "Average Weighted Cost",
    def: "The average cost you paid per unit, weighted across all deliveries. Updates automatically every time you receive stock. If you paid R30 for 10 units then R50 for 10 units, your AVCO is R40.",
  },
  {
    term: "Margin",
    full: "Gross Profit %",
    def: "How much profit you make on each sale, as a percentage. Formula: (Sell Price − AVCO) ÷ Sell Price × 100. A 60% margin on a R100 item means R60 profit per sale.",
  },
  {
    term: "NO COST",
    full: "No cost basis set",
    def: "You have set a sell price but no cost has been recorded yet (AVCO = R0). Receive a delivery with a unit cost to establish the cost basis. Until then, margin cannot be calculated accurately.",
  },
  {
    term: "Stock Value",
    full: "Total stock value at cost",
    def: "The total value of all stock on hand, calculated as: quantity × AVCO per item. This is what your stock cost you — not what you would sell it for.",
  },
  {
    term: "Available",
    full: "Available quantity",
    def: "Stock on hand minus stock held for confirmed wholesale orders. This is the quantity you can safely sell without double-selling into a confirmed order.",
  },
  {
    term: "Reorder Level",
    full: "Restock trigger quantity",
    def: "The quantity at which you should place a new order. When stock drops to or below this number, the item appears in your Action Queue as a reorder alert.",
  },
  {
    term: "Dead Stock",
    full: "Idle stock (45+ days)",
    def: "Items that have had no stock movement (no sales, no deliveries, no adjustments) for 45 or more days. Cash is tied up in these items. Consider discounting, bundling, or returning to supplier.",
  },
  {
    term: "Velocity",
    full: "Daily sell rate",
    def: "How many units you sell per day on average, based on the last 30 days. Used to calculate 'days of stock remaining'. Velocity of 2 means you sell 2 units per day.",
  },
  {
    term: "Days Left",
    full: "Estimated days until out of stock",
    def: "Based on current velocity: quantity on hand ÷ daily sell rate. If you have 30 units and sell 3 per day, you have 10 days left. An item at 7 days or fewer triggers a REORDER alert.",
  },
  {
    term: "Bulk Discount / RCV",
    full: "Receipt / Receive Delivery reference",
    def: "Every delivery you receive is assigned an RCV reference number (e.g. RCV-20260331-4770). This is your audit trail — traceable to the exact delivery, supplier, quantities, and costs.",
  },
  {
    term: "Channel Hold",
    full: "Stock reserved for a channel",
    def: "Stock that is soft-reserved for a confirmed wholesale order or online checkout. It is still physically in your warehouse but cannot be sold to another channel until the hold is released.",
  },
  {
    term: "price_history",
    full: "Price audit trail",
    def: "Every time a sell price is changed, a record is written with: who changed it, when, what it was before, and what it is now. Accessible via the audit drawer in the Pricing tab.",
  },
];

function StockGlossary() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = search.trim()
    ? GLOSSARY_TERMS.filter(
        (t) =>
          t.term.toLowerCase().includes(search.toLowerCase()) ||
          t.def.toLowerCase().includes(search.toLowerCase()),
      )
    : GLOSSARY_TERMS;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid " + T.ink150,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: T.font,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.ink400,
            }}
          >
            📖 Stock Terms Explained
          </span>
          <span
            style={{
              fontSize: 10,
              color: T.ink300,
              fontFamily: T.font,
            }}
          >
            {GLOSSARY_TERMS.length} terms — AVCO, Margin, Dead Stock and more
          </span>
        </div>
        <span style={{ fontSize: 12, color: T.ink300 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid " + T.ink150 }}>
          {/* Search */}
          <div
            style={{
              padding: "10px 20px",
              borderBottom: "1px solid " + T.ink075,
            }}
          >
            <input
              type="text"
              placeholder="Search terms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                fontSize: 12,
                fontFamily: T.font,
                border: "1px solid " + T.ink150,
                borderRadius: 4,
                outline: "none",
                boxSizing: "border-box",
                color: T.ink700,
                background: T.ink075,
              }}
            />
          </div>

          {/* Terms grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1px",
              background: T.ink150,
              maxHeight: 420,
              overflowY: "auto",
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "#fff",
                  padding: "20px",
                  fontSize: 12,
                  color: T.ink300,
                  fontFamily: T.font,
                  textAlign: "center",
                }}
              >
                No terms match "{search}"
              </div>
            ) : (
              filtered.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#fff",
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: T.accentMid,
                        fontFamily: T.mono,
                      }}
                    >
                      {item.term}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        fontFamily: T.font,
                      }}
                    >
                      {item.full}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.ink500,
                      fontFamily: T.font,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.def}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: "8px 20px",
              fontSize: 10,
              color: T.ink300,
              fontFamily: T.font,
              borderTop: "1px solid " + T.ink150,
            }}
          >
            These terms are standard across the cannabis and retail industry.
            They appear throughout NuAi exactly as your accountant, bank, and
            suppliers use them.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Zone 6 — AI Insights (Phase 3 — LL-120 compliant) ────────────────────────
// Calls ai-copilot Edge Function ONLY. Never api.anthropic.com directly.
// 3 contextual insights with severity dot + action link per insight.
// 30-minute cache prevents unnecessary EF calls on re-render.
// Graceful fallback: if EF unavailable, shows static message, does not crash.
function Zone6AIInsights({ context, onNavigate }) {
  const [insights, setInsights] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [timestamp, setTimestamp] = React.useState(null);
  const CACHE_MS = 30 * 60 * 1000;

  const SEV = {
    critical: {
      dot: T.danger,
      bg: T.dangerBg,
      bd: T.dangerBd,
      label: "Critical",
    },
    warning: {
      dot: T.warning,
      bg: T.warningBg,
      bd: T.warningBd,
      label: "Watch",
    },
    info: { dot: T.info, bg: T.infoBg, bd: T.infoBd, label: "Info" },
    positive: {
      dot: T.success,
      bg: T.successBg,
      bd: T.successBd,
      label: "Good",
    },
  };

  const ACTION_LABELS = {
    pricing: "Open pricing",
    items: "View items",
    receipts: "View receipts",
    orders: "View orders",
  };

  const doLoad = async (force) => {
    if (
      !force &&
      timestamp &&
      Date.now() - timestamp < CACHE_MS &&
      insights.length > 0
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;
      if (!url || !anon) throw new Error("Supabase env vars not configured");
      // LL-120: NEVER call api.anthropic.com — always use ai-copilot EF
      const res = await fetch(`${url}/functions/v1/ai-copilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `You are a cannabis retail stock analyst for a South African cannabis store using NuAi ERP. Analyse this stock position and give exactly 3 specific actionable insights.

Stock context: ${JSON.stringify(context)}

Rules:
- Each insight must reference a specific metric or number from the context
- Be direct and actionable — what should the owner do today
- Do not mention Claude, Anthropic, AI, or NuAi
- severity must be one of: critical, warning, info, positive
- actionType must be one of: pricing, items, receipts, orders

Return ONLY a valid JSON array of exactly 3 objects, no markdown, no explanation:
[{"severity":"warning","text":"...","action":"...","actionType":"pricing"}]`,
            },
          ],
          userContext: { role: "hq" },
        }),
      });
      const data = await res.json();
      const raw = (data.reply || "").replace(/```json|```/g, "").trim();
      const a = raw.indexOf("["),
        b = raw.lastIndexOf("]");
      if (a === -1 || b === -1) throw new Error("No JSON array in response");
      const parsed = JSON.parse(raw.slice(a, b + 1));
      if (!Array.isArray(parsed) || parsed.length === 0)
        throw new Error("Empty response");
      setInsights(parsed.slice(0, 3));
      setTimestamp(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    doLoad(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid " + T.ink150,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid " + T.ink150,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SectionLabel>AI Stock Insights</SectionLabel>
          {timestamp && !loading && (
            <span style={{ fontSize: 10, color: T.ink300, fontFamily: T.font }}>
              {new Date(timestamp).toLocaleTimeString("en-ZA", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <button
          onClick={() => doLoad(true)}
          disabled={loading}
          style={{
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            border: "1px solid " + T.ink150,
            borderRadius: 4,
            cursor: loading ? "default" : "pointer",
            background: "transparent",
            color: T.ink500,
            fontFamily: T.font,
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {/* Body */}
      {loading && insights.length === 0 ? (
        /* First-load skeleton */
        <div style={{ padding: "16px 20px" }}>
          {[80, 65, 75].map((w, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: i < 2 ? 14 : 0,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: T.ink150,
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 11,
                    background: T.ink075,
                    borderRadius: 3,
                    marginBottom: 6,
                    width: w + "%",
                  }}
                />
                <div
                  style={{
                    height: 9,
                    background: T.ink075,
                    borderRadius: 3,
                    width: "38%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Graceful fallback — Overview does not crash */
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              flexShrink: 0,
              background: T.warningBg,
              border: "1px solid " + T.warningBd,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: T.warning,
            }}
          >
            ⚠
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: T.ink700,
                marginBottom: 3,
              }}
            >
              AI insights unavailable
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.ink400,
                fontFamily: T.font,
                marginBottom: 8,
                lineHeight: 1.4,
              }}
            >
              {error.includes("env vars")
                ? "Supabase environment variables not configured."
                : "Could not load insights. The ai-copilot Edge Function may not be deployed."}
            </div>
            <button
              onClick={() => doLoad(true)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.accentMid,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontFamily: T.font,
              }}
            >
              Try again →
            </button>
          </div>
        </div>
      ) : (
        insights.map((insight, idx) => {
          const sev = SEV[insight.severity] || SEV.info;
          return (
            <div
              key={idx}
              style={{
                padding: "13px 20px",
                borderBottom:
                  idx < insights.length - 1 ? "1px solid " + T.ink075 : "none",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              {/* Severity dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: sev.dot,
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: T.ink700,
                    fontFamily: T.font,
                    lineHeight: 1.45,
                    marginBottom: insight.action ? 6 : 0,
                  }}
                >
                  {insight.text}
                </div>
                {insight.action && insight.actionType && (
                  <button
                    onClick={() => onNavigate(insight.actionType)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.accentMid,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: T.font,
                    }}
                  >
                    {ACTION_LABELS[insight.actionType] || insight.action} →
                  </button>
                )}
              </div>
              {/* Severity badge */}
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: 3,
                  flexShrink: 0,
                  background: sev.bg,
                  color: sev.dot,
                  border: "1px solid " + sev.bd,
                }}
              >
                {sev.label}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function StockIntelPanel({
  items = [],
  movements = [],
  tenantId, // LL-160: always a prop
  onNavigate = () => {},
  onOpenItem = () => {},
}) {
  const [catFilter, setCatFilter] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const activeItems = useMemo(
    () => items.filter((i) => i.is_active !== false),
    [items],
  );
  const categories = useMemo(
    () =>
      [...new Set(activeItems.map((i) => i.category).filter(Boolean))].sort(),
    [activeItems],
  );
  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 30 * 86400000), []);

  const saleOuts = useMemo(
    () =>
      movements.filter(
        (m) =>
          m.movement_type === "sale_out" &&
          new Date(m.created_at) > thirtyDaysAgo,
      ),
    [movements, thirtyDaysAgo],
  );

  // Best Sellers
  const bestSellers = useMemo(() => {
    const soldMap = {};
    saleOuts.forEach((m) => {
      soldMap[m.item_id] =
        (soldMap[m.item_id] || 0) + Math.abs(m.quantity || 0);
    });
    const ranked = Object.entries(soldMap)
      .map(([id, units]) => ({ item: items.find((i) => i.id === id), units }))
      .filter((x) => x.item && (!catFilter || x.item.category === catFilter))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
    const max = ranked[0]?.units || 1;
    return ranked.map(({ item, units }, idx) => ({
      name: item.name,
      value: `${units} units`,
      pct: Math.round((units / max) * 100),
      sub: CATEGORY_LABELS[item.category] || item.category,
      barColor: T.accentMid,
      badge:
        idx === 0
          ? { label: "HOT", color: T.danger, bg: T.dangerBg, bd: T.dangerBd }
          : null,
      onClick: () => onOpenItem(item),
    }));
  }, [saleOuts, items, catFilter, onOpenItem]);

  // Margin Heroes
  const marginHeroes = useMemo(() => {
    const ranked = activeItems
      .filter(
        (i) =>
          (i.quantity_on_hand || 0) > 0 &&
          i.sell_price > 0 &&
          i.weighted_avg_cost > 0 &&
          (!catFilter || i.category === catFilter),
      )
      .map((i) => ({
        item: i,
        margin: ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100,
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);
    const max = ranked[0]?.margin || 1;
    return ranked.map(({ item, margin }, idx) => ({
      name: item.name,
      value: `${Math.round(margin)}%`,
      pct: Math.round((margin / max) * 100),
      sub: `${fmt(item.sell_price)} sell · ${fmt(item.weighted_avg_cost)} cost`,
      barColor: margin > 60 ? T.success : margin > 40 ? T.accentMid : T.warning,
      valueColor:
        margin > 60 ? T.success : margin > 40 ? T.accentMid : T.warning,
      badge:
        idx === 0
          ? {
              label: "PUSH",
              color: T.success,
              bg: T.successBg,
              bd: T.successBd,
            }
          : null,
      onClick: () => onOpenItem(item),
    }));
  }, [activeItems, catFilter, onOpenItem]);

  // Fast Movers
  const fastMovers = useMemo(() => {
    const ranked = activeItems
      .filter((i) => (i.quantity_on_hand || 0) > 0)
      .map((i) => {
        const unitsSold = saleOuts
          .filter((m) => m.item_id === i.id)
          .reduce((s, m) => s + Math.abs(m.quantity || 0), 0);
        const velocity = unitsSold / 30;
        const daysLeft =
          velocity > 0 ? Math.floor(i.quantity_on_hand / velocity) : null;
        return { item: i, velocity, daysLeft, unitsSold };
      })
      .filter(
        (x) => x.velocity > 0 && (!catFilter || x.item.category === catFilter),
      )
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
    const minDays = ranked[0]?.daysLeft || 1;
    return ranked.map(({ item, daysLeft, unitsSold }, idx) => {
      const urgent = daysLeft <= 7,
        warn = daysLeft <= 14;
      return {
        name: item.name,
        value: `${daysLeft}d left`,
        pct: Math.max(
          5,
          Math.min(100, Math.round((minDays / Math.max(daysLeft, 1)) * 100)),
        ),
        sub: `${unitsSold} units/30d · ${item.quantity_on_hand} on hand`,
        barColor: urgent ? T.danger : warn ? T.warning : T.accentMid,
        valueColor: urgent ? T.danger : warn ? T.warning : T.ink700,
        badge:
          idx === 0
            ? {
                label: urgent ? "REORDER" : "WATCH",
                color: urgent ? T.danger : T.warning,
                bg: urgent ? T.dangerBg : T.warningBg,
                bd: urgent ? T.dangerBd : T.warningBd,
              }
            : null,
        onClick: () => onOpenItem(item),
      };
    });
  }, [activeItems, saleOuts, catFilter, onOpenItem]);

  // Dead Stock
  const DEAD_THRESHOLD = 45;
  const deadCutoff = useMemo(
    () => new Date(Date.now() - DEAD_THRESHOLD * 86400000),
    [],
  );
  const deadStock = useMemo(() => {
    const ranked = activeItems
      .filter(
        (i) =>
          (i.quantity_on_hand || 0) > 0 &&
          i.last_movement_at &&
          new Date(i.last_movement_at) < deadCutoff &&
          (!catFilter || i.category === catFilter),
      )
      .map((i) => ({
        item: i,
        daysDead: Math.floor(
          (Date.now() - new Date(i.last_movement_at)) / 86400000,
        ),
        tiedUpValue: (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
      }))
      .sort((a, b) => b.daysDead - a.daysDead)
      .slice(0, 5);
    const max = ranked[0]?.daysDead || 1;
    return ranked.map(({ item, daysDead, tiedUpValue }, idx) => ({
      name: item.name,
      value: fmt(tiedUpValue),
      pct: Math.round((daysDead / max) * 100),
      sub: `${daysDead} days idle · ${item.quantity_on_hand} units`,
      barColor: T.warning,
      valueColor: T.warning,
      badge:
        idx === 0
          ? {
              label: "IDLE",
              color: T.warning,
              bg: T.warningBg,
              bd: T.warningBd,
            }
          : null,
      onClick: () => onOpenItem(item),
    }));
  }, [activeItems, deadCutoff, catFilter, onOpenItem]);

  // ── Phase 4 computed panels (plain language — no jargon) ────────────────
  // "Making You Money" — Revenue Leaders (units sold × sell price)
  const revenueLeaders = useMemo(() => {
    const revMap = {};
    saleOuts.forEach((m) => {
      revMap[m.item_id] = (revMap[m.item_id] || 0) + Math.abs(m.quantity || 0);
    });
    const ranked = Object.entries(revMap)
      .map(([id, units]) => {
        const item = items.find((i) => i.id === id);
        if (!item) return null;
        const rev = units * (item.sell_price || 0);
        const margin =
          item.sell_price > 0 && item.weighted_avg_cost > 0
            ? Math.round(
                ((item.sell_price - item.weighted_avg_cost) / item.sell_price) *
                  100,
              )
            : null;
        return { item, units, rev, margin };
      })
      .filter(
        (x) => x && x.rev > 0 && (!catFilter || x.item.category === catFilter),
      )
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5);
    const maxRev = ranked[0]?.rev || 1;
    return ranked.map(({ item, units, rev, margin }, idx) => ({
      name: item.name,
      value: fmt(rev),
      pct: Math.round((rev / maxRev) * 100),
      sub: `${units} sold · ${margin !== null ? margin + "% profit" : "no cost set"}`,
      barColor: T.accentMid,
      valueColor: T.success,
      badge:
        idx === 0
          ? { label: "TOP", color: T.success, bg: T.successBg, bd: T.successBd }
          : null,
      onClick: () => onOpenItem(item),
    }));
  }, [saleOuts, items, catFilter, onOpenItem]);

  // "Selling Fast, Earning Little" — Margin at Risk
  const marginAtRisk = useMemo(() => {
    const ranked = activeItems
      .filter((i) => {
        if ((i.quantity_on_hand || 0) <= 0) return false;
        if (!(i.sell_price > 0) || !(i.weighted_avg_cost > 0)) return false;
        if (catFilter && i.category !== catFilter) return false;
        const margin =
          ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100;
        if (margin >= 25) return false;
        // Must be selling — check saleOuts
        const unitsSold = saleOuts
          .filter((m) => m.item_id === i.id)
          .reduce((s, m) => s + Math.abs(m.quantity || 0), 0);
        return unitsSold > 0;
      })
      .map((i) => {
        const margin = Math.round(
          ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100,
        );
        const unitsSold = saleOuts
          .filter((m) => m.item_id === i.id)
          .reduce((s, m) => s + Math.abs(m.quantity || 0), 0);
        return { item: i, margin, unitsSold };
      })
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 5);
    return ranked.map(({ item, margin, unitsSold }, idx) => ({
      name: item.name,
      value: `${margin}% profit`,
      pct: Math.max(10, margin),
      sub: `${unitsSold} sold · ${fmt(item.sell_price)} sell · ${fmt(item.weighted_avg_cost)} cost`,
      barColor: margin < 10 ? T.danger : T.warning,
      valueColor: margin < 10 ? T.danger : T.warning,
      badge:
        idx === 0
          ? {
              label: "FIX PRICE",
              color: T.danger,
              bg: T.dangerBg,
              bd: T.dangerBd,
            }
          : null,
      onClick: () => onOpenItem(item),
    }));
  }, [activeItems, saleOuts, catFilter, onOpenItem]);

  // "Prices Worth Checking" — items where price_history shows last change > 60 days ago
  const [priceAgeMap, setPriceAgeMap] = useState({}); // item_id → last changed_at
  const [priceAgeLoaded, setPriceAgeLoaded] = useState(false);
  useEffect(() => {
    if (!tenantId || priceAgeLoaded) return;
    supabase
      .from("price_history")
      .select("item_id, changed_at")
      .eq("tenant_id", tenantId)
      .order("changed_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach((row) => {
          if (!map[row.item_id]) map[row.item_id] = row.changed_at;
        });
        setPriceAgeMap(map);
        setPriceAgeLoaded(true);
      });
  }, [tenantId, priceAgeLoaded]);

  const priceReview = useMemo(() => {
    const STALE_DAYS = 60;
    const cutoff = new Date(Date.now() - STALE_DAYS * 86400000);
    const ranked = activeItems
      .filter((i) => {
        if (!(i.sell_price > 0) || !(i.weighted_avg_cost > 0)) return false;
        if ((i.quantity_on_hand || 0) <= 0) return false;
        if (catFilter && i.category !== catFilter) return false;
        const lastChange = priceAgeMap[i.id];
        if (!lastChange) return false;
        return new Date(lastChange) < cutoff;
      })
      .map((i) => {
        const lastChange = new Date(priceAgeMap[i.id]);
        const daysSince = Math.floor((Date.now() - lastChange) / 86400000);
        const margin = Math.round(
          ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100,
        );
        return { item: i, daysSince, margin };
      })
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 5);
    const maxDays = ranked[0]?.daysSince || 1;
    return ranked.map(({ item, daysSince, margin }, idx) => ({
      name: item.name,
      value: `${daysSince}d ago`,
      pct: Math.round((daysSince / maxDays) * 100),
      sub: `${fmt(item.sell_price)} price · ${margin}% profit now`,
      barColor: daysSince > 120 ? T.warning : T.ink300,
      valueColor: daysSince > 120 ? T.warning : T.ink500,
      badge:
        idx === 0
          ? {
              label: "REVIEW",
              color: T.warning,
              bg: T.warningBg,
              bd: T.warningBd,
            }
          : null,
      onClick: () => onNavigate("pricing"),
    }));
  }, [activeItems, priceAgeMap, catFilter, onNavigate]);

  // Heatmap
  const HEATMAP_COLORS = [
    T.ink150,
    T.accentBd,
    "#6aab85",
    T.accentMid,
    T.accent,
  ];
  const heatmapCells = useMemo(() => {
    const dayMap = {};
    movements.forEach((m) => {
      const key = (m.created_at || "").split("T")[0];
      if (!key) return;
      if (!dayMap[key])
        dayMap[key] = { count: 0, saleOuts: 0, purchases: 0, adjustments: 0 };
      dayMap[key].count++;
      if (m.movement_type === "sale_out") dayMap[key].saleOuts++;
      if (m.movement_type === "purchase_in") dayMap[key].purchases++;
      if (m.movement_type === "adjustment") dayMap[key].adjustments++;
    });
    return Array.from({ length: 84 }, (_, i) => {
      const d = new Date(Date.now() - (83 - i) * 86400000);
      const key = d.toISOString().split("T")[0];
      const data = dayMap[key] || {
        count: 0,
        saleOuts: 0,
        purchases: 0,
        adjustments: 0,
      };
      return {
        date: key,
        ...data,
        level:
          data.count === 0
            ? 0
            : data.count <= 2
              ? 1
              : data.count <= 5
                ? 2
                : data.count <= 10
                  ? 3
                  : 4,
      };
    });
  }, [movements]);
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < 12; i++) w.push(heatmapCells.slice(i * 7, i * 7 + 7));
    return w;
  }, [heatmapCells]);
  const totalMovements = heatmapCells.reduce((s, c) => s + c.count, 0);
  const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

  // AI context payload — derived from loaded data, no extra DB calls
  const aiContext = useMemo(() => {
    const pricedWithCost = activeItems.filter(
      (i) => i.sell_price > 0 && i.weighted_avg_cost > 0,
    );
    const outOfStock = activeItems.filter(
      (i) => (i.quantity_on_hand || 0) <= 0,
    );
    const noPrice = activeItems.filter((i) => !(i.sell_price > 0));
    const lowStock = activeItems.filter(
      (i) =>
        i.reorder_level != null && (i.quantity_on_hand || 0) <= i.reorder_level,
    );
    const totalValue = activeItems.reduce(
      (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
      0,
    );
    const avgMargin =
      pricedWithCost.length > 0
        ? pricedWithCost.reduce(
            (s, i) =>
              s + ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100,
            0,
          ) / pricedWithCost.length
        : 0;
    const deadItems = activeItems.filter(
      (i) =>
        (i.quantity_on_hand || 0) > 0 &&
        i.last_movement_at &&
        new Date(i.last_movement_at) < new Date(Date.now() - 45 * 86400000),
    );
    const deadValue = deadItems.reduce(
      (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
      0,
    );
    const catCounts = {};
    activeItems.forEach((i) => {
      catCounts[i.category || "other"] =
        (catCounts[i.category || "other"] || 0) + 1;
    });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      totalSKUs: activeItems.length,
      outOfStock: outOfStock.length,
      noPrice: noPrice.length,
      lowStock: lowStock.length,
      noCostBasis: activeItems.filter(
        (i) => i.sell_price > 0 && !(i.weighted_avg_cost > 0),
      ).length,
      totalStockValue: "R" + Math.round(totalValue).toLocaleString("en-ZA"),
      avgMarginPct: avgMargin > 0 ? Math.round(avgMargin) + "%" : "unknown",
      pricedSKUs: pricedWithCost.length,
      deadStockItems: deadItems.length,
      deadStockValue: "R" + Math.round(deadValue).toLocaleString("en-ZA"),
      topCategory: topCat ? topCat[0] + " (" + topCat[1] + " SKUs)" : "unknown",
      salesLast30d: saleOuts.length,
      bestSeller: bestSellers[0]?.name || "none recorded",
    };
  }, [activeItems, saleOuts, bestSellers]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Zone 4 — Category pills + 2×2 intel grid */}
      <div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <SectionLabel>Filter by category</SectionLabel>
          <div style={{ flex: 1 }} />
          {[null, ...categories].map((cat) => {
            const active = catFilter === cat;
            const label = cat === null ? "All" : CATEGORY_LABELS[cat] || cat;
            const count =
              cat === null
                ? activeItems.length
                : activeItems.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat || "all"}
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  fontFamily: T.font,
                  border: "1.5px solid " + (active ? T.accentMid : T.ink150),
                  background: active ? T.accentMid : "#fff",
                  color: active ? "#fff" : T.ink700,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {label} <span style={{ opacity: 0.7 }}>×{count}</span>
              </button>
            );
          })}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <IntelPanel
            title="Best Sellers"
            icon="🔥"
            badge={saleOuts.length > 0 ? "last 30d" : null}
            rows={bestSellers}
            emptyMsg={
              saleOuts.length === 0
                ? "No sales recorded yet — your top sellers will appear here"
                : "No sales in this category"
            }
            emptyCta={saleOuts.length === 0 ? "Open shop to sell" : null}
            onEmptyCta={() => window.open("/shop", "_blank")}
            footerLabel="View movements"
            onFooter={() => onNavigate("movements")}
          />

          <IntelPanel
            title="Margin Heroes"
            icon="💰"
            badge={
              marginHeroes.length > 0 ? `${marginHeroes.length} priced` : null
            }
            badgeColor={{ color: T.success, bg: T.successBg, bd: T.successBd }}
            rows={marginHeroes}
            emptyMsg="Set prices and receive a delivery to see real margins"
            footerLabel="Open pricing"
            onFooter={() => onNavigate("pricing")}
          />

          <IntelPanel
            title="Fast Movers"
            icon="⚡"
            badge={fastMovers.length > 0 ? "days remaining" : null}
            rows={fastMovers}
            emptyMsg="Once sales come through, you'll see how many days of stock remain per item"
            emptyCta="Open shop to sell"
            onEmptyCta={() => window.open("/shop", "_blank")}
            footerLabel="View movements"
            onFooter={() => onNavigate("movements")}
          />

          <IntelPanel
            title="Dead Stock"
            icon="📦"
            badge={deadStock.length > 0 ? `${DEAD_THRESHOLD}d+ idle` : null}
            badgeColor={{ color: T.warning, bg: T.warningBg, bd: T.warningBd }}
            rows={deadStock}
            emptyMsg={`No items idle for ${DEAD_THRESHOLD}+ days — your stock is moving`}
            footerLabel="Get strategy"
            onFooter={() => onNavigate("items")}
          />
        </div>
      </div>

      {/* ── Zone 4b: Phase 4 — Plain language money panels ──────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <IntelPanel
          title="Making You Money"
          icon="💵"
          badge={revenueLeaders.length > 0 ? "last 30 days" : null}
          badgeColor={{ color: T.success, bg: T.successBg, bd: T.successBd }}
          rows={revenueLeaders}
          emptyMsg="Your top revenue items will appear here after your first sale"
          emptyCta="Open shop to sell"
          onEmptyCta={() => window.open("/shop", "_blank")}
          footerLabel="View all sales"
          onFooter={() => onNavigate("movements")}
        />

        <IntelPanel
          title="Selling Fast, Earning Little"
          icon="⚠️"
          badge={marginAtRisk.length > 0 ? "under 25% profit" : null}
          badgeColor={{ color: T.danger, bg: T.dangerBg, bd: T.dangerBd }}
          rows={marginAtRisk}
          emptyMsg="All your fast-selling items have healthy profit margins — great work"
          footerLabel="Review prices"
          onFooter={() => onNavigate("pricing")}
        />

        <IntelPanel
          title="Prices Worth Checking"
          icon="🗓"
          badge={priceReview.length > 0 ? "60+ days old" : null}
          badgeColor={{ color: T.warning, bg: T.warningBg, bd: T.warningBd }}
          rows={priceReview}
          emptyMsg={
            !priceAgeLoaded
              ? "Loading price history…"
              : "All your prices have been reviewed recently"
          }
          footerLabel="Open pricing"
          onFooter={() => onNavigate("pricing")}
        />
      </div>

      {/* Zone 5 — Heatmap */}
      <div
        style={{
          background: "#fff",
          border: "1px solid " + T.ink150,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid " + T.ink150,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SectionLabel>Movement Velocity — 12 weeks</SectionLabel>
          <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}>
            {totalMovements} movements in window
          </span>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {/* Day labels */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                marginRight: 2,
              }}
            >
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  style={{
                    height: 14,
                    width: 28,
                    fontSize: 9,
                    color: T.ink300,
                    fontFamily: T.font,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            {/* 12 week columns */}
            <div style={{ display: "flex", gap: 3, flex: 1 }}>
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    flex: 1,
                  }}
                >
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      onMouseEnter={(e) => {
                        setHoverCell(cell);
                        setHoverPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoverCell(null)}
                      onMouseMove={(e) =>
                        setHoverPos({ x: e.clientX, y: e.clientY })
                      }
                      style={{
                        height: 14,
                        borderRadius: 2,
                        background: HEATMAP_COLORS[cell.level],
                        cursor: cell.count > 0 ? "pointer" : "default",
                        transition: "opacity .1s",
                        opacity: hoverCell?.date === cell.date ? 0.7 : 1,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Week labels */}
          <div
            style={{ display: "flex", gap: 3, marginTop: 6, marginLeft: 34 }}
          >
            {weeks.map((week, wi) => {
              const d = new Date(week[0].date + "T00:00:00");
              return (
                <div
                  key={wi}
                  style={{
                    flex: 1,
                    fontSize: 9,
                    color: T.ink300,
                    fontFamily: T.font,
                    textAlign: "center",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {wi % 3 === 0
                    ? d.toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <span style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
              Less
            </span>
            {HEATMAP_COLORS.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: color,
                }}
              />
            ))}
            <span style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
              More
            </span>
            <span
              style={{
                fontSize: 10,
                color: T.ink300,
                fontFamily: T.font,
                marginLeft: 8,
              }}
            >
              Based on last 100 movements loaded
            </span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoverCell && hoverCell.count > 0 && (
        <HeatmapTooltip cell={hoverCell} x={hoverPos.x} y={hoverPos.y} />
      )}

      {/* Zone 6 — AI Insights (Phase 3 — live) */}
      <Zone6AIInsights context={aiContext} onNavigate={onNavigate} />

      {/* Glossary — collapsed by default, always accessible */}
      <StockGlossary />
    </div>
  );
}
