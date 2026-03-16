// src/components/InfoTooltip.js
// WP-GUIDE Phase B — Inline Contextual Help
// Version: 1.0.0
//
// ─── DESIGN PHILOSOPHY ────────────────────────────────────────────────────────
// A small ⓘ button placed next to any label, button, field, or step header.
// Click → opens a plain-English explanation card.
// Written for a non-technical business owner, not a developer.
//
// PLATFORM-AGNOSTIC: TOOLTIP_CONTENT is the only layer that knows anything
// about this specific business. The component itself works for any deployment.
// To deploy for a different business: replace or extend TOOLTIP_CONTENT.
//
// Usage:
//   import InfoTooltip from '../InfoTooltip';
//
//   // By content ID (recommended):
//   <button>+ New Purchase Order</button>
//   <InfoTooltip id="po-what-is" />
//
//   // Inline (no ID needed):
//   <InfoTooltip title="What is this?" body="Explanation here." />
//
//   // Position above (use when near bottom of viewport):
//   <InfoTooltip id="cogs-transport" position="top" />
//
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from "react";

// ─── TOOLTIP CONTENT ─────────────────────────────────────────────────────────
// Plain English explanations for every non-obvious field, button, or concept.
// Written for: a business owner who has never used an ERP.
// NOT for: developers. No technical jargon.
//
// Structure:
//   title:   Short question or label (shown as card header)
//   body:    Plain English explanation (1–3 sentences)
//   example: Optional real-world example in italic (makes abstract concepts concrete)

export const TOOLTIP_CONTENT = {
  // ── PROCUREMENT / PURCHASE ORDERS ──────────────────────────────────────────
  "po-what-is": {
    title: "What is a Purchase Order?",
    body: 'A Purchase Order (PO) is your formal request to a supplier to send you stock. It records exactly what you ordered, at what price, and locks in the exchange rate for the day. When your stock arrives, you mark it "received" and your inventory updates automatically.',
    example:
      "e.g. Ordering 1,000 vape cartridges from AimVape in China at $2.80 each, with USD/ZAR locked at R16.89.",
  },
  "po-select-supplier": {
    title: "Which supplier do I choose?",
    body: "Choose the company you are ordering from. Your supplier list shows all registered vendors. Each supplier has their own product catalogue, pricing, and lead times stored in the system.",
  },
  "po-fx-rate": {
    title: "Why is the exchange rate important?",
    body: "All overseas stock is priced in USD. The ZAR cost of your stock changes every day as the Rand strengthens or weakens. When you create a PO, today's rate is locked in — this protects you from the rate moving while your stock is in transit.",
    example:
      "e.g. At R16.89/USD, 1,000 cartridges at $2.80 = R47,292. If the rate was R18.00, the same order = R50,400.",
  },
  "po-shipping-mode": {
    title: "DDP Air vs Standard Air vs Sea Freight",
    body: "DDP Air (Delivered Duty Paid) is the most common for urgent orders — supplier handles customs, you pay by weight. Standard Air is a flat fee regardless of weight. Sea Freight is slowest (4–6 weeks) but cheapest for large orders. The system calculates the ZAR cost per unit for each option.",
  },
  "po-line-items": {
    title: "What are line items?",
    body: "Line items are the individual products within a single order. One PO can contain multiple products from the same supplier — each gets its own line with quantity, unit price, and total.",
    example:
      "e.g. One PO to AimVape: Line 1 — 500 × 1ml cartridges at $2.80. Line 2 — 200 × batteries at $1.50.",
  },
  "po-receiving": {
    title: 'What happens when I "receive" a PO?',
    body: 'Clicking "Receive" confirms that the stock has physically arrived. The system adds the quantities to your inventory automatically — no manual stock entry needed. The PO status changes to "received" and the items appear in your available stock.',
  },

  // ── COSTING / COGS ENGINE ──────────────────────────────────────────────────
  "cogs-what-is": {
    title: "What is COGS?",
    body: "COGS stands for Cost of Goods Sold — the actual cost to produce one finished product. It includes raw materials, packaging, labour, and a share of fixed costs like lab testing. Knowing your COGS is how you set prices that make a profit.",
    example:
      "e.g. A 1ml cartridge: Hardware R28 + Distillate R45 + Terpenes R8 + Packaging R5 + Lab R3 = R89 COGS. Sell at R400 wholesale → R311 gross profit.",
  },
  "cogs-batch-size": {
    title: "What is batch size?",
    body: "Some costs (lab testing, transport, miscellaneous) are paid once for a whole production run, then shared across every unit. Batch size is how many units you produce in one run. The system divides those fixed costs by the batch size to get the cost per unit.",
    example:
      "e.g. A potency test costs R350. Batch of 100 units → R3.50/unit. Batch of 1,000 units → R0.35/unit.",
  },
  "cogs-transport": {
    title: "Transport cost — enter the total, not per unit",
    body: "This is the total cost to move your raw materials or finished products for one production run. Enter the full batch amount — the system divides it by your batch size automatically to calculate the per-unit cost.",
  },
  "cogs-terpene-ul": {
    title: "Why is terpene measured in µl (microlitres)?",
    body: "Terpene blends are added in very small quantities — typically 3–10% of the distillate volume. A 1ml cartridge uses roughly 30–100 microlitres (µl) of terpenes. 1,000µl = 1ml. The system converts this to ml for the cost calculation.",
  },
  "cogs-shipping-alloc": {
    title: "What is shipping allocation?",
    body: 'This is the per-unit share of the shipping cost for the hardware in this recipe. Use the "Calculate landed cost" tool below to work out the correct per-unit figure based on shipment weight and freight mode.',
  },
  "cogs-lab-tests": {
    title: "Lab testing costs",
    body: "Each lab test is a fixed cost paid once per batch. The system divides the total lab cost by your batch size to get the per-unit contribution. Select only the tests required for regulatory compliance on this specific product.",
  },
  "cogs-hardware-qty": {
    title: "Hardware quantity per finished unit",
    body: 'How many hardware units go into one finished product. Almost always 1. This is NOT your order quantity — use "Units per batch" above for production volumes.',
  },

  // ── PRODUCTION ─────────────────────────────────────────────────────────────
  "production-sell-price": {
    title: "Why do I need to set a sell price?",
    body: "Until a product has a sell price greater than R0, it is completely invisible to customers in the online shop. Setting the price here updates the product catalogue instantly — no other step required.",
  },
  "production-batch-number": {
    title: "What is a batch number?",
    body: "A unique code for each production run. This number is embedded in every QR code generated for this batch — it's how the system tracks which product a customer scanned, and links to the lab certificate (COA) for that specific run.",
    example:
      "e.g. PR-260316-MAC-1ML means: run on 16 March 2026, MAC strain, 1ml cartridge format.",
  },
  "production-lifecycle": {
    title: "What do the batch statuses mean?",
    body: "Active: in stock and selling. Low Stock: below your reorder threshold (default 10 units). Depleted: zero stock — product hidden from shop automatically. Archived: manually removed from active view but records are kept.",
  },
  "production-pipeline": {
    title: "The 4-step production pipeline",
    body: "Step 1: Receive raw materials via Purchase Orders. Step 2: Run production to convert raw materials into finished units. Step 3: Set a sell price. Step 4: Product appears automatically in the shop. All four steps must be complete for a product to be visible and purchasable.",
  },

  // ── LOYALTY ENGINE ─────────────────────────────────────────────────────────
  "loyalty-schema": {
    title: "What is a loyalty schema?",
    body: "A schema is a complete set of loyalty programme settings — how many points customers earn, what the tier thresholds are, and how much points are worth when redeemed. You can switch between Conservative (low cost), Standard (balanced), and Aggressive (high reward) in one click.",
  },
  "loyalty-breakage": {
    title: "What is breakage rate?",
    body: "Most loyalty programmes have points that are earned but never redeemed — customers forget, accounts go dormant, points expire. Breakage is the percentage of points you expect to never be redeemed. Industry average is 25–35%. A higher breakage rate means a lower real cost to you.",
  },
  "loyalty-multiplier": {
    title: "What are tier multipliers?",
    body: "Customers at higher tiers earn MORE points on the same purchase. A Gold customer at 2× earns twice as many points as a Bronze customer. This rewards your best customers and makes them reluctant to switch to a competitor — they'd lose their multiplier advantage.",
  },
  "loyalty-threshold": {
    title: "What is a tier threshold?",
    body: "The minimum points balance a customer needs to reach a tier. Once they hit this number, they are promoted automatically. If thresholds change, all customers are immediately recalculated — no manual updates needed.",
  },
  "loyalty-redemption-value": {
    title: 'What does "1 point = R___ " mean?',
    body: "This is the cash value of one point when a customer redeems their balance. At R0.15 per point, 1,000 points = R150 off their next order. Higher values mean more generous redemption — and higher programme cost.",
  },

  // ── QR CODES ───────────────────────────────────────────────────────────────
  "qr-scan-actions": {
    title: "What are scan actions?",
    body: 'When a customer scans a QR code, you control exactly what happens. "Award points" gives them loyalty points. "Show banner" displays a message or promotion. "Redirect" sends them to a specific page. You can stack multiple actions.',
  },
  "qr-hmac": {
    title: "Why are QR codes signed?",
    body: "Every QR code is cryptographically signed — a secret code is embedded that can't be faked. When a customer scans, the system verifies the signature before awarding any points. This prevents counterfeiting: a printed fake QR code cannot claim points.",
  },
  "qr-claim-rate": {
    title: "What is claim rate?",
    body: "The percentage of QR codes that have been scanned at least once. A code is \"claimed\" the first time a customer scans it and registers their details. High claim rate = good product insert engagement. Low claim rate = customers aren't scanning, or codes aren't reaching them.",
  },
  "qr-points-value": {
    title: "Points value per scan",
    body: "The number of loyalty points awarded when a customer scans this QR code. This is the base value before tier multipliers are applied. A Gold customer at 2× earns double this base amount.",
  },

  // ── COMMS ──────────────────────────────────────────────────────────────────
  "comms-ticket-vs-message": {
    title: "Messages vs Support Tickets — what's the difference?",
    body: "A Message is a direct conversation with a customer — like a WhatsApp chat. A Support Ticket is a formal request that needs to be resolved — like a complaint or a product query. Tickets have a status (open → resolved) and an auto-reply is sent when resolved.",
  },
  "comms-broadcast": {
    title: "What is a broadcast message?",
    body: "A broadcast sends the same message to multiple customers at once, filtered by tier. Use it for promotions, announcements, or tier-specific rewards. Unlike a direct message, customers cannot reply to a broadcast.",
  },

  // ── SHOP / PRODUCTS ────────────────────────────────────────────────────────
  "shop-visibility": {
    title: "Why isn't my product showing in the shop?",
    body: "Three conditions must all be true: the product must be active, it must have a price set (sell_price > R0), and it must be in stock (quantity > 0). If any one of these is missing, the product is invisible — no error is shown to the customer.",
  },
  "shop-channel-pricing": {
    title: "What are channel prices?",
    body: "You can set different prices for different sales channels. Wholesale price is what retailers pay. Retail price is what end customers pay in the shop. Setting a separate wholesale price lets you sell to dispensaries at a lower margin without affecting your retail price.",
  },

  // ── SYSTEM / GENERAL ───────────────────────────────────────────────────────
  "fx-rate": {
    title: "Live exchange rate",
    body: "The USD/ZAR rate updates every 60 seconds from the European Central Bank. All USD-priced items (hardware, terpenes) are recalculated automatically at the current rate. A 🟢 dot means the rate is live. 🟡 means a slightly older cached rate is being used.",
  },
  tenant: {
    title: "What is a tenant?",
    body: "A tenant is one shop or retail location on the platform. Each tenant has its own customers, QR codes, and sales data. HQ can view all tenants at once. Admin users only see their own tenant's data.",
  },
};

// ─── RUNTIME REGISTRATION ────────────────────────────────────────────────────
// Add tooltip content at runtime without modifying this file.
// Use case: custom business modules, plugin tabs, SaaS tenant overrides.
//
// Usage:
//   import { registerTooltip } from '../InfoTooltip';
//   registerTooltip('my-custom-field', {
//     title: 'What is this?',
//     body: 'Plain English explanation.',
//   });

export const registerTooltip = (id, content) => {
  if (typeof id !== "string" || !content?.title) {
    console.warn(
      "[InfoTooltip] registerTooltip: id must be string, content must have title",
    );
    return;
  }
  TOOLTIP_CONTENT[id] = content;
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

/**
 * InfoTooltip
 *
 * @param {string}   id           — key in TOOLTIP_CONTENT (recommended)
 * @param {string}   title        — fallback title if no id match
 * @param {string}   body         — fallback body if no id match
 * @param {string}   example      — optional example text
 * @param {string}   position     — 'bottom' (default) or 'top'
 * @param {string}   accentColor  — optional override for button border/fill colour
 */
export default function InfoTooltip({
  id,
  title,
  body,
  example,
  position = "bottom",
  accentColor = "#52b788",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Resolve content: ID lookup → inline props → fallback
  const content =
    id && TOOLTIP_CONTENT[id]
      ? TOOLTIP_CONTENT[id]
      : { title: title || "Info", body: body || "", example };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const positionStyle =
    position === "top"
      ? { bottom: 26, top: "auto" }
      : { top: 26, bottom: "auto" };

  return (
    <span
      ref={ref}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        marginLeft: 6,
        verticalAlign: "middle",
      }}
    >
      {/* ⓘ trigger button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="What is this?"
        title="What is this?"
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1.5px solid ${accentColor}`,
          background: open ? accentColor : "transparent",
          color: open ? "#fff" : accentColor,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "Jost, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        i
      </button>

      {/* Tooltip card */}
      {open && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: 290,
            background: "#fff",
            border: "1px solid #e8e4dc",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            padding: "14px 16px",
            zIndex: 9999,
            ...positionStyle,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              top: 8,
              right: 10,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "#bbb",
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>

          {/* Title */}
          <div
            style={{
              fontFamily: "Jost, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: "#2d4a2d",
              marginBottom: 8,
              paddingRight: 16,
              lineHeight: 1.4,
            }}
          >
            {content.title}
          </div>

          {/* Body */}
          {content.body && (
            <div
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: 12,
                color: "#555",
                lineHeight: 1.65,
                marginBottom: content.example ? 10 : 0,
              }}
            >
              {content.body}
            </div>
          )}

          {/* Example */}
          {content.example && (
            <div
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: 11,
                color: "#888",
                fontStyle: "italic",
                background: "#f9f8f5",
                borderRadius: 6,
                padding: "7px 10px",
                lineHeight: 1.55,
              }}
            >
              {content.example}
            </div>
          )}

          {/* Small accent line at top */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 40,
              height: 3,
              background: accentColor,
              borderRadius: "0 0 3px 3px",
            }}
          />
        </div>
      )}
    </span>
  );
}
