// src/components/InfoTooltip.js — v2.0 (portal rendering)
// ALL HOOKS CALLED BEFORE ANY EARLY RETURNS — fixes rules-of-hooks
import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

export const TOOLTIP_CONTENT = {
  sc_search: {
    title: "Smart Search",
    body: "The search bar supports power-user tokens for precise filtering. Combine with category pills for laser-targeted results.",
    example: `price>500    → sell price above R500
price<100    → below R100
qty:0        → sold out items
qty>10       → more than 10 in stock
margin>50    → margin above 50%
margin<30    → below 30% (danger zone)
brand:RAW    → brand contains RAW
sku:PRO      → SKU contains PRO
cost<80      → avg cost below R80
supplier:green → supplier name match

Plain text searches name, brand, category, SKU.`,
  },
  sc_stock_value: {
    title: "Total Stock Value",
    body: "Calculated as Quantity on Hand × Weighted Avg Cost, summed across all items in your current filter. This is your inventory at cost — what you paid for what's on the shelf, not what it sells for.",
    example:
      "R110k in filter = R110,000 at cost. At 60% avg margin: R110k ÷ 0.4 = ~R275k revenue potential.",
  },
  sc_avg_cost: {
    title: "Weighted Average Cost (AVCO)",
    body: "This is NOT your last purchase price. It's a running weighted average recalculated every time you receive stock. If you have 10 units at R60 and receive 10 more at R80, your AVCO becomes R70 — not R80.",
    example:
      "Why it matters: one expensive delivery won't inflate all your cost data. Your margins stay accurate across price fluctuations from suppliers.",
  },
  sc_margin: {
    title: "Gross Margin %",
    body: "Margin % = (Sell Price − Avg Cost) ÷ Sell Price × 100. This is margin, not markup — they are different numbers.",
    example: `Sell R100, Cost R50:
  Margin  = 50%  (50 ÷ 100)
  Markup  = 100% (50 ÷ 50)

Colour thresholds:
  🟢 Green  ≥ 50% — healthy
  🟡 Amber  30–49% — watch it
  🔴 Red    < 30% — review pricing`,
  },
  sc_bulk_select: {
    title: "Bulk Actions",
    body: "Select multiple items to act on them together. Hide removes items from your shop without deleting them — stock data is preserved. Delete is permanent.",
    example: `Common workflows:
• End-of-season: bulk Hide slow movers
• Pricing review: select world → Export CSV
• Spring clean: filter sold-out → bulk Delete
• Visibility: select items → bulk Show

Tip: Filter by category first, then Select All.`,
  },
  avco_explained: {
    title: "Weighted Average Cost",
    body: "AVCO is recalculated on every stock receipt. It prevents a single expensive delivery from skewing all your cost data.",
    example: "10 units @ R60 + 10 units @ R80 = AVCO R70, not R80.",
  },
  gross_margin: {
    title: "Gross Margin",
    body: "Revenue minus Cost of Goods Sold (COGS), expressed as a percentage of revenue.",
    example: "Sell R1,000. COGS = R400. Gross Margin = 60%.",
  },
  markup_vs_margin: {
    title: "Markup vs Margin",
    body: "Markup = profit ÷ cost. Margin = profit ÷ sell price. A 100% markup equals a 50% margin.",
    example: "Cost R50, Sell R100 → Markup 100%, Margin 50%.",
  },
  stock_value: {
    title: "Stock Value",
    body: "Total value of your inventory at cost price (AVCO × Qty on Hand).",
    example: "R110k at 60% average margin = ~R275k of potential revenue.",
  },
  qr_loyalty_points: {
    title: "Loyalty Points",
    body: "Points are awarded per transaction based on the item's loyalty category multiplier.",
    example: "Cannabis Flower = 2× multiplier. R100 spend = 200 points.",
  },
  qr_tier_system: {
    title: "Loyalty Tiers",
    body: "Customers progress through 5 tiers: Bronze → Silver → Gold → Platinum → Diamond.",
    example: "Diamond tier earns 5× points. A R200 spend = 1,000 points.",
  },
  qr_hmac: {
    title: "Secure QR Codes",
    body: "Each QR code is HMAC-signed with your tenant secret. Counterfeit codes are rejected automatically.",
    example:
      "Fraud detection flags: wrong tenant, expired token, replay attack.",
  },
  velocity_score: {
    title: "Sales Velocity",
    body: "Units sold per day, averaged over the selected period.",
    example: "Sell 3.5g/day with 21g in stock = 6 days of cover.",
  },
  days_cover: {
    title: "Days of Cover",
    body: "How many days your current stock will last at current sales velocity.",
    example: "30 units ÷ 5/day = 6 days cover.",
  },
  abc_classification: {
    title: "ABC Classification",
    body: "A = top 20% by revenue. B = middle 30%. C = bottom 50%.",
    example: "Your A items are likely 2–3 core strains driving most turnover.",
  },
  reorder_level: {
    title: "Reorder Level",
    body: "The quantity at which you should place a new order.",
    example: "Supplier takes 5 days, sell 4/day → set reorder at 25.",
  },
  max_stock_level: {
    title: "Max Stock Level",
    body: "The maximum quantity you want to hold. Order Qty = Max Stock − Current Stock.",
    example: "Max 100, current 15, reorder qty = 85 units.",
  },
  on_order: {
    title: "On Order",
    body: "Marked when a purchase order is placed but stock hasn't arrived yet.",
    example: "Prevents duplicate orders and shows what's inbound.",
  },
  cold_chain_alert: {
    title: "Cold Chain Alert",
    body: "Temperature excursion detected. Review before selling.",
    example: "Excursions above 25°C can cause terpene degradation.",
  },
  haccp_ccp: {
    title: "Critical Control Point (CCP)",
    body: "A point where a hazard can be prevented or eliminated. Required by HACCP.",
    example: "Temperature control at storage, lab testing at intake.",
  },
  leave_accrual: {
    title: "Leave Accrual",
    body: "Employees accrue 1.25 days per month (15 days/year per BCEA).",
    example: "After 6 months: 7.5 days accrued.",
  },
  payroll_gross: {
    title: "Gross vs Net Pay",
    body: "Gross is before deductions. Net is after PAYE tax and UIF (1%).",
    example: "Gross R20,000 → PAYE ~R2,100 → UIF R200 → Net ~R17,700.",
  },
};

export default function InfoTooltip({ id, title, body, example, size }) {
  // ── ALL HOOKS FIRST — no early returns before this block ──
  const resolvedSize = size || "md";
  const [open, setOpen] = useState(false);
  const [cardStyle, setCardStyle] = useState({});
  const triggerRef = useRef(null);
  const cardRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    function () {
      if (!open) return;
      function onKey(e) {
        if (e.key === "Escape") setOpen(false);
      }
      function onClickOutside(e) {
        if (triggerRef.current && triggerRef.current.contains(e.target)) return;
        if (cardRef.current && cardRef.current.contains(e.target)) return;
        setOpen(false);
      }
      document.addEventListener("keydown", onKey);
      document.addEventListener("mousedown", onClickOutside);
      return function () {
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("mousedown", onClickOutside);
      };
    },
    [open],
  );
  // ── END HOOKS ──

  const content = id ? TOOLTIP_CONTENT[id] : null;
  const resolvedTitle = title || (content && content.title) || "";
  const resolvedBody = body || (content && content.body) || "";
  const resolvedEx = example || (content && content.example) || "";

  // Early return AFTER all hooks
  if (!resolvedTitle && !resolvedBody) return null;

  function calcPosition() {
    if (!triggerRef.current) return;
    var rect = triggerRef.current.getBoundingClientRect();
    var cardW = 292;
    var cardH = 280;
    var gap = 8;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var left = rect.left + rect.width / 2 - cardW / 2;
    var top = rect.bottom + gap;
    if (left + cardW > vw - 12) left = vw - cardW - 12;
    if (left < 12) left = 12;
    if (top + cardH > vh - 12) top = rect.top - cardH - gap;
    setCardStyle({ left: left, top: top });
  }

  function handleOpen(e) {
    e.stopPropagation();
    if (!open) calcPosition();
    setOpen(function (v) {
      return !v;
    });
  }

  var iconSz = resolvedSize === "sm" ? 13 : 15;
  var iconStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: iconSz + 2,
    height: iconSz + 2,
    borderRadius: "50%",
    border: "1.5px solid " + (open ? "#2D6A4F" : "#2D6A4F80"),
    background: open ? "#2D6A4F" : "transparent",
    color: open ? "#fff" : "#2D6A4F",
    fontSize: iconSz - 3,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
    transition: "all 0.12s",
    userSelect: "none",
    fontFamily: "sans-serif",
    verticalAlign: "middle",
    marginLeft: 4,
  };

  var card =
    open &&
    ReactDOM.createPortal(
      <div
        ref={cardRef}
        style={{
          position: "fixed",
          zIndex: 99999,
          left: cardStyle.left || 0,
          top: cardStyle.top || 0,
          width: 292,
          background: "#141414",
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.40)",
          fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          animation: "nuai-tip-in 0.12s ease-out",
        }}
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        <style>{`@keyframes nuai-tip-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div
          style={{
            padding: "12px 14px 10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#2D6A4F",
                flexShrink: 0,
                display: "block",
                marginTop: 2,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.3,
              }}
            >
              {resolvedTitle}
            </span>
          </div>
          <button
            onClick={function () {
              setOpen(false);
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
              marginLeft: 8,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "0 14px 12px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "rgba(255,255,255,0.70)",
              lineHeight: 1.6,
            }}
          >
            {resolvedBody}
          </p>
        </div>
        {resolvedEx && (
          <div
            style={{
              margin: "0 14px 14px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 7,
              padding: "10px 12px",
              borderLeft: "2.5px solid #2D6A4F",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#2D6A4F",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 5,
              }}
            >
              Example
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                color: "rgba(255,255,255,0.80)",
                fontFamily: "'SFMono-Regular','Consolas',monospace",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {resolvedEx}
            </pre>
          </div>
        )}
      </div>,
      document.body,
    );

  return (
    <>
      <span
        ref={triggerRef}
        onClick={handleOpen}
        title={"Help: " + resolvedTitle}
        style={iconStyle}
        onMouseEnter={function (e) {
          e.currentTarget.style.background = "#2D6A4F";
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = "#2D6A4F";
        }}
        onMouseLeave={function (e) {
          if (!open) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#2D6A4F";
            e.currentTarget.style.borderColor = "#2D6A4F80";
          }
        }}
      >
        i
      </span>
      {card}
    </>
  );
}
