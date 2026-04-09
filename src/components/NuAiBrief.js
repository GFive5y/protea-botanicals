// src/components/NuAiBrief.js
// WP-AINS Phase 4 — NuAi Panel Brief
// Renders inside ProteaAI.js chat panel.
// Full mode (messages === 0): shows right now / working well / actions.
// Collapsed mode (messages > 0): single summary line at top of chat.
// SQL-computed via useBrief. Zero LLM calls.

import { useLocation } from "react-router-dom";
import { useBrief } from "../hooks/useBrief";

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
