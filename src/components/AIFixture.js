// src/components/AIFixture.js — v2.0
// WP-AINS Phase 2 — Sidebar Intelligence
//
// v2.0: EF cycling removed. Wired to IntelligenceContext.
// Shows 2 IntelLines (live SQL facts from useNavIntelligence).
// NuAi mark shows real today's metric, not marketing copy.
// Zero LLM calls. Instant load. Refreshes every 5 minutes.

import { useIntelligence } from "../contexts/IntelligenceContext";

const T = {
  accent:    "#1A3D2B",
  accentMid: "#2D6A4F",
  ink400:    "#6B6B6B",
  ink300:    "#999999",
  ink150:    "#E2E2E2",
  border:    "#ECEAE6",
  font:      "'Inter','Helvetica Neue',Arial,sans-serif",
  danger:    "#991B1B",
  dangerBg:  "#FEF2F2",
  warning:   "#92400E",
  warningBg: "#FFFBEB",
  success:   "#1A3D2B",
  successBg: "#E8F5EE",
  info:      "#1E3A5F",
  infoBg:    "#EFF6FF",
};

function lineStyle(variant) {
  switch (variant) {
    case "danger":  return { dot: T.danger,  text: T.danger };
    case "warning": return { dot: T.warning, text: T.warning };
    case "success": return { dot: "#2D6A4F", text: T.accent };
    default:        return { dot: T.ink300,  text: T.ink400 };
  }
}

export default function AIFixture({ collapsed, onOpen }) {
  const { data } = useIntelligence();

  const lines    = data?.intelLines  || [];
  const nuaiMark = data?.nuaiMark    || "Ask anything";

  // ── COLLAPSED MODE ────────────────────────────────────────────
  if (collapsed) {
    const hasDanger = lines.some((l) => l.variant === "danger");
    const hasWarn   = !hasDanger && lines.some((l) => l.variant === "warning");
    return (
      <button
        onClick={onOpen}
        title="NuAi"
        style={{
          width: "100%", height: 44, border: "none",
          borderTop: `1px solid ${T.border}`,
          background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          fontFamily: T.font, position: "relative",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em" }}>
          <span style={{ color: T.accent }}>Nu</span>
          <span style={{ color: "#00E87A" }}>Ai</span>
        </span>
        {(hasDanger || hasWarn) && (
          <span style={{
            position: "absolute", top: 8, right: 10,
            width: 6, height: 6, borderRadius: "50%",
            background: hasDanger ? T.danger : T.warning,
          }} />
        )}
      </button>
    );
  }

  // ── EXPANDED MODE ─────────────────────────────────────────────
  return (
    <div
      style={{
        borderTop: `1px solid ${T.border}`,
        flexShrink: 0,
        fontFamily: T.font,
      }}
    >
      {/* IntelLines — 2 live SQL facts, each clickable */}
      {lines.length > 0 ? lines.map((line, i) => {
        const s = lineStyle(line.variant);
        return (
          <button
            key={i}
            onClick={() => onOpen(line.context)}
            style={{
              width: "100%", border: "none",
              borderBottom: i < lines.length - 1 ? `0.5px solid ${T.border}` : "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 14px", textAlign: "left",
              fontFamily: T.font, transition: "background 0.12s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#F4F4F3"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: s.dot, flexShrink: 0,
            }} />
            <span style={{
              flex: 1, fontSize: 11, color: s.text,
              overflow: "hidden", whiteSpace: "nowrap",
              textOverflow: "ellipsis", lineHeight: 1.4,
            }}>
              {line.text}
            </span>
            <span style={{ fontSize: 10, color: T.ink300, flexShrink: 0 }}>›</span>
          </button>
        );
      }) : (
        <button
          onClick={onOpen}
          style={{
            width: "100%", border: "none", background: "transparent",
            cursor: "pointer", display: "flex", alignItems: "center",
            gap: 8, padding: "9px 14px", fontFamily: T.font,
          }}
        >
          <span style={{ fontSize: 11, color: T.ink300 }}>All clear · no alerts</span>
        </button>
      )}

      {/* NuAi mark — brand + today's key metric */}
      <button
        onClick={onOpen}
        style={{
          width: "100%", border: "none",
          borderTop: `0.5px solid ${T.border}`,
          background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", fontFamily: T.font,
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#F4F4F3"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", flexShrink: 0 }}>
          <span style={{ color: T.accent }}>Nu</span>
          <span style={{ color: "#00E87A" }}>Ai</span>
        </span>
        <span style={{
          width: 1, height: 12, background: T.ink150, flexShrink: 0,
        }} />
        <span style={{
          flex: 1, fontSize: 11, color: T.ink400,
          overflow: "hidden", whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}>
          {nuaiMark}
        </span>
      </button>
    </div>
  );
}
