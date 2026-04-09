// src/components/NuAiBrief.js
// WP-AINS Phase 4 — NuAi Panel Brief
// Renders inside ProteaAI.js chat panel.
// Full mode (messages === 0): shows right now / working well / actions.
// Collapsed mode (messages > 0): single summary line at top of chat.
// SQL-computed via useBrief. Zero LLM calls.

import { useLocation } from "react-router-dom";
import { useBrief } from "../hooks/useBrief";

const CONTEXT_MAP = {
  "oos":           { label: "Out of stock items",       query: "Which items are out of stock right now and what's the revenue impact? What should I order first?" },
  "stock-critical":{ label: "Critical stock alert",     query: "Walk me through my most urgent stock issues and what I need to do today." },
  "reorder":       { label: "Below reorder level",      query: "Which items are below their reorder level and how urgently do I need to act on each one?" },
  "margin":        { label: "Best margin category",     query: "Break down my margin by category. Where are my biggest opportunities to improve profitability?" },
  "avg-margin":    { label: "Average margin",           query: "What is driving my average margin and which products are pulling it up or down?" },
  "value":         { label: "Stock value",              query: "Give me a breakdown of my stock value by category and highlight any concerns." },
  "skus":          { label: "Active SKUs",              query: "How many active SKUs do I have and are there any that need attention?" },
  "revenue":       { label: "Today's revenue",          query: "How is today's revenue tracking? Compare to yesterday and my best day this month." },
  "revenue-mtd":   { label: "MTD revenue",             query: "Give me a full MTD revenue breakdown — orders, trends, and how I'm tracking against my best month." },
  "orders":        { label: "Orders today",             query: "Walk me through today's orders — count, value, payment methods, and any patterns." },
  "vs-yesterday":  { label: "vs yesterday",             query: "Compare today's sales to yesterday in detail. What's driving the difference?" },
  "basket":        { label: "Average basket",           query: "What is my average basket size and how does it compare to recent days? What can I do to increase it?" },
  "missing-vat":   { label: "Missing VAT on expenses",  query: "Show me all expenses missing VAT amounts and walk me through how to fix this and the impact on my P&L." },
  "gross-profit":  { label: "Gross profit",             query: "What is my actual gross profit this month and what are the main factors affecting it?" },
  "open-pos":      { label: "Open purchase orders",     query: "What purchase orders are open and what action do I need to take on each one?" },
  "overdue-pos":   { label: "Overdue purchase orders",  query: "I have overdue purchase orders. Which ones need urgent follow-up and what should I do?" },
  "suppliers":     { label: "Suppliers on file",        query: "I have no suppliers on file. Walk me through adding a supplier and what I need to prepare." },
  "entries":       { label: "Expense entries",          query: "Give me a breakdown of my expenses this month by category." },
  "net-vat":       { label: "VAT payable",              query: "What is my current VAT position and when is payment due?" },
  "output-vat":    { label: "Output VAT",               query: "Explain my output VAT this period and how it was calculated." },
  "input-vat":     { label: "Input VAT",                query: "Why is my input VAT so low? Walk me through how to fix this." },
  "loyalty-tx":    { label: "Loyalty transactions",     query: "How is my loyalty programme performing? Show me engagement and any customers I should act on." },
  "active-cust":   { label: "Active customers",         query: "Who are my most active customers this week and what patterns do I see?" },
  "messages":      { label: "Unread messages",          query: "I have unread customer messages. What are they about and how should I respond?" },
  "top-category":  { label: "Best category",            query: "Tell me more about my best performing category — what's driving it and how do I grow it?" },
  "profiles":      { label: "Customer profiles",        query: "Give me a customer health overview — who's active, who's at risk, and who I should contact." },
};

const T = {
  accent:     "#1A3D2B",
  accentMid:  "#2D6A4F",
  accentBd:   "#A7D9B8",
  accentLit:  "#E8F5EE",
  ink900:     "#0D0D0D",
  ink700:     "#2C2C2C",
  ink500:     "#5A5A5A",
  ink400:     "#747474",
  ink300:     "#999999",
  ink150:     "#E2E2E2",
  ink075:     "#F4F4F3",
  danger:     "#991B1B",
  dangerBg:   "#FEF2F2",
  dangerBd:   "#FECACA",
  warning:    "#92400E",
  warningBg:  "#FFFBEB",
  warningBd:  "#FDE68A",
  success:    "#166534",
  successBg:  "#F0FDF4",
  successBd:  "#BBF7D0",
  info:       "#1E3A5F",
  infoBg:     "#EFF6FF",
  infoBd:     "#BFDBFE",
  font:       "'Inter','Helvetica Neue',Arial,sans-serif",
};

const BRIEF_CSS = `
@keyframes brief-pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes brief-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.brief-item{animation:brief-in 0.18s ease;}
.brief-action-btn:hover{background:#2D6A4F!important;color:#fff!important;}
`;
if (typeof document !== "undefined" && !document.getElementById("nuai-brief-css")) {
  const s = document.createElement("style");
  s.id = "nuai-brief-css";
  s.textContent = BRIEF_CSS;
  document.head.appendChild(s);
}

function dotColor(variant) {
  switch (variant) {
    case "danger":  return T.danger;
    case "warning": return T.warning;
    case "success": return "#2D6A4F";
    case "info":    return T.info;
    default:        return T.ink300;
  }
}

function Section({ label, items, onAction, limitReached, streaming }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.09em",
        textTransform: "uppercase", color: T.ink400,
        marginBottom: 8, fontFamily: T.font,
      }}>
        {label}
      </div>
      {items.map((item, i) => (
        <div key={i} className="brief-item" style={{
          padding: "7px 0",
          borderBottom: i < items.length - 1 ? `0.5px solid ${T.ink150}` : "none",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: dotColor(item.variant),
              flexShrink: 0, marginTop: 5,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, color: T.ink700, lineHeight: 1.5,
                fontFamily: T.font,
              }}>
                {item.text}
              </div>
              {item.actionLabel && item.actionQuery && (
                <button
                  className="brief-action-btn"
                  onClick={() => !limitReached && !streaming && onAction(item.actionQuery)}
                  disabled={limitReached || streaming}
                  style={{
                    marginTop: 5, fontSize: 10, fontWeight: 600,
                    padding: "3px 10px", borderRadius: 5,
                    border: `0.5px solid ${T.accentBd}`,
                    background: T.accentLit, color: T.accent,
                    cursor: limitReached || streaming ? "default" : "pointer",
                    fontFamily: T.font, transition: "all 0.12s",
                    opacity: limitReached ? 0.5 : 1,
                  }}
                >
                  {item.actionLabel} →
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NuAiBrief({
  tenantId, role, isHQ, intel,
  collapsed, onAction, limitReached, streaming,
  briefContext,
}) {
  const location = useLocation();
  const tabId    = new URLSearchParams(location.search).get("tab") || "overview";
  const { brief, loading } = useBrief(tenantId, tabId, intel);

  const hasContent = brief &&
    (brief.rightNow.length > 0 || brief.workingWell.length > 0 || brief.actions.length > 0);

  // ── COLLAPSED MODE — single summary line above messages ───────────────────
  if (collapsed) {
    if (!brief?.summary) return null;
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 0 8px",
        borderBottom: `0.5px solid ${T.ink150}`,
        marginBottom: 4, flexShrink: 0,
      }}>
        <span style={{ fontSize: 8, color: T.accentMid }}>✦</span>
        <span style={{ fontSize: 10, color: T.ink400, fontFamily: T.font, flex: 1 }}>
          {brief.summary}
        </span>
      </div>
    );
  }

  // ── CONTEXT BAR — shown when opened via pill or IntelLine click ───────────
  const ctxEntry = briefContext ? CONTEXT_MAP[briefContext] : null;

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "8px 0" }}>
        {[90, 70, 80].map((w, i) => (
          <div key={i} style={{
            height: 10, width: `${w}%`, borderRadius: 4,
            background: T.ink150, marginBottom: 8,
            animation: `brief-pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
    );
  }

  // ── NO CONTENT — fallback to empty ────────────────────────────────────────
  if (!hasContent) return null;

  // ── FULL BRIEF ────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 8 }}>
      {ctxEntry && (
        <div style={{
          background: T.accentLit,
          border: `1px solid ${T.accentBd}`,
          borderRadius: 8,
          padding: "10px 12px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: T.accentMid,
              marginBottom: 3, fontFamily: T.font,
            }}>
              You clicked
            </div>
            <div style={{
              fontSize: 12, color: T.accent, fontFamily: T.font,
              fontWeight: 500,
            }}>
              {ctxEntry.label}
            </div>
          </div>
          <button
            className="brief-action-btn"
            onClick={() => !limitReached && !streaming && onAction(ctxEntry.query)}
            disabled={limitReached || streaming}
            style={{
              fontSize: 10, fontWeight: 700, padding: "5px 12px",
              borderRadius: 6, border: `1px solid ${T.accentBd}`,
              background: T.accent, color: "#fff",
              cursor: limitReached || streaming ? "default" : "pointer",
              fontFamily: T.font, flexShrink: 0,
              opacity: limitReached ? 0.5 : 1,
            }}
          >
            Ask this →
          </button>
        </div>
      )}
      <Section
        label="Right now"
        items={brief.rightNow}
        onAction={onAction}
        limitReached={limitReached}
        streaming={streaming}
      />
      <Section
        label="Working well"
        items={brief.workingWell}
        onAction={onAction}
        limitReached={limitReached}
        streaming={streaming}
      />
      {brief.actions.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.09em",
            textTransform: "uppercase", color: T.ink400,
            marginBottom: 8, fontFamily: T.font,
          }}>
            Actions
          </div>
          {brief.actions.map((action, i) => (
            <div key={i} className="brief-item" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 0",
              borderBottom: i < brief.actions.length - 1 ? `0.5px solid ${T.ink150}` : "none",
            }}>
              <span style={{
                fontSize: 11, color: T.ink500, flex: 1,
                fontFamily: T.font, lineHeight: 1.5,
              }}>
                {action.text}
              </span>
              {action.actionLabel && (
                <button
                  className="brief-action-btn"
                  onClick={() => !limitReached && !streaming && onAction(action.actionQuery)}
                  disabled={limitReached || streaming}
                  style={{
                    fontSize: 10, fontWeight: 600, padding: "4px 12px",
                    borderRadius: 5, border: `0.5px solid ${T.accentBd}`,
                    background: T.accentLit, color: T.accent,
                    cursor: limitReached || streaming ? "default" : "pointer",
                    fontFamily: T.font, transition: "all 0.12s",
                    flexShrink: 0, opacity: limitReached ? 0.5 : 1,
                  }}
                >
                  {action.actionLabel} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{
        marginTop: 10, paddingTop: 8,
        borderTop: `0.5px solid ${T.ink150}`,
        fontSize: 10, color: T.ink300, fontFamily: T.font,
      }}>
        Type a question below or tap any action above.
      </div>
    </div>
  );
}
