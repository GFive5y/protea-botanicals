// src/components/WorkflowGuide.js
// WP-GUIDE Phase A — Context Panel Component
// Version: 2.0.0
//
// ─── DESIGN PHILOSOPHY ────────────────────────────────────────────────────────
// This component is a PURE PRESENTATION LAYER. It knows nothing about tabs,
// business domains, or what any status means. It receives a `context` object
// from usePageContext() and renders it. That is its entire responsibility.
//
// It is intentionally opinionated about visual design and intentionally
// unopinionated about data. Swap the query engine — the component doesn't care.
// Change the business domain — the component doesn't care.
//
// API:
//   <WorkflowGuide
//     context    = { object from usePageContext() }
//     onAction   = { (action) => void }     — called when action button clicked
//     defaultOpen = { bool }                — initial expanded state (default: true)
//     tabId       = { string }              — used for localStorage key isolation
//   />
//
// Styling: inline styles only. Fonts: Jost (body/UI). No external dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  setup: {
    border: "#7c5cbf",
    dot: "#7c5cbf",
    bg: "rgba(124,92,191,0.04)",
    headlineC: "#4a3875",
    labelText: "Setup guide",
    labelBg: "rgba(124,92,191,0.10)",
    labelColor: "#4a3875",
  },
  ok: {
    border: "#52b788",
    dot: "#52b788",
    bg: "rgba(82,183,136,0.04)",
    headlineC: "#2d4a2d",
    labelText: "All clear",
    labelBg: "rgba(82,183,136,0.12)",
    labelColor: "#2d4a2d",
  },
  info: {
    border: "#3a7bd5",
    dot: "#3a7bd5",
    bg: "rgba(58,123,213,0.04)",
    headlineC: "#1a3a6e",
    labelText: "Note",
    labelBg: "rgba(58,123,213,0.10)",
    labelColor: "#1a3a6e",
  },
  warn: {
    border: "#e9a84c",
    dot: "#e9a84c",
    bg: "rgba(233,168,76,0.05)",
    headlineC: "#7a4f10",
    labelText: "Action needed",
    labelBg: "rgba(233,168,76,0.14)",
    labelColor: "#7a4f10",
  },
  critical: {
    border: "#c0392b",
    dot: "#c0392b",
    bg: "rgba(192,57,43,0.04)",
    headlineC: "#7a1a12",
    labelText: "Critical",
    labelBg: "rgba(192,57,43,0.12)",
    labelColor: "#7a1a12",
  },
};

const FONT = "'Jost', sans-serif";

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

/** Animated status dot — pulses during loading, solid when stable */
function StatusDot({ color, loading }) {
  const pulseStyle = loading
    ? {
        animation: "wg-pulse 1.2s ease-in-out infinite",
      }
    : {};

  return (
    <>
      <style>{`
        @keyframes wg-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
        @keyframes wg-expand {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          ...pulseStyle,
        }}
      />
    </>
  );
}

/** Collapse/expand chevron */
function Chevron({ open, color }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.22s ease",
        flexShrink: 0,
      }}
    >
      <path
        d="M2 4l4 4 4-4"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Warning line — amber prefix + message */
function WarningLine({ text }) {
  // Strip leading ⚠ if present (we render it ourselves for consistent styling)
  const clean = text.replace(/^⚠\s*/, "");
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: "5px 0",
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontSize: 12,
          color: "#e9a84c",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        ⚠
      </span>
      <span
        style={{
          fontFamily: FONT,
          fontSize: 12,
          color: "#7a4f10",
          lineHeight: 1.55,
        }}
      >
        {clean}
      </span>
    </div>
  );
}

/** Item line — neutral bullet + message */
function ItemLine({ text }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: "3px 0",
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontSize: 12,
          color: "#aaa",
          flexShrink: 0,
          marginTop: 2,
          lineHeight: 1,
        }}
      >
        •
      </span>
      <span
        style={{
          fontFamily: FONT,
          fontSize: 12,
          color: "#666",
          lineHeight: 1.55,
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** Action button — calls onAction with the action object */
function ActionButton({ action, onAction, borderColor }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onAction && onAction(action)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 500,
        color: borderColor,
        background: hovered ? `${borderColor}18` : `${borderColor}0c`,
        border: `1px solid ${borderColor}55`,
        borderRadius: 6,
        padding: "5px 12px",
        cursor: "pointer",
        transition: "background 0.15s",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {action.label}
    </button>
  );
}

/** Refresh icon button */
function RefreshButton({ onClick, color, spinning }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Refresh"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px 4px",
        display: "flex",
        alignItems: "center",
        opacity: 0.55,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        style={{
          animation: spinning ? "wg-spin 0.8s linear infinite" : "none",
        }}
      >
        <style>{`@keyframes wg-spin { to { transform: rotate(360deg); } }`}</style>
        <path
          d="M11 6.5A4.5 4.5 0 1 1 8.5 2.5"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <polyline
          points="8.5,1 8.5,3.5 11,3.5"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * WorkflowGuide v2.0
 *
 * Renders a collapsible context panel driven entirely by the `context` object
 * returned from usePageContext(). No hardcoded strings, no domain knowledge.
 */
export default function WorkflowGuide({
  context,
  onAction,
  defaultOpen = true,
  tabId = "default",
}) {
  const storageKey = `wg_open_${tabId}`;

  // Initialise collapse state from localStorage
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? JSON.parse(stored) : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Persist collapse state
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(open));
    } catch {
      /* localStorage unavailable */
    }
  }, [open, storageKey]);

  // Handle refresh with brief spinner feedback
  const handleRefresh = async () => {
    if (!context?.refresh) return;
    setRefreshing(true);
    await context.refresh();
    if (mountedRef.current) {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  // Determine visual config from status
  const status = context?.status || "ok";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ok;
  const loading = context?.loading ?? true;
  const headline =
    context?.headline || (loading ? "Checking system state…" : "");
  const items = context?.items || [];
  const warnings = context?.warnings || [];
  const actions = context?.actions || [];
  const timestamp = context?.relativeTime || null;

  const hasContent =
    warnings.length > 0 || items.length > 0 || actions.length > 0;

  // ── COLLAPSED BAR ──────────────────────────────────────────────────────────
  const collapsedBar = (
    <div
      onClick={() => setOpen(true)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 42,
        paddingLeft: 14,
        paddingRight: 10,
        cursor: "pointer",
        userSelect: "none",
        borderLeft: `4px solid ${cfg.border}`,
        background: cfg.bg,
        borderRadius: "0 6px 6px 0",
        transition: "background 0.15s",
      }}
    >
      <StatusDot color={cfg.dot} loading={loading} />

      <span
        style={{
          fontFamily: FONT,
          fontSize: 12,
          fontWeight: 500,
          color: cfg.headlineC,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {headline}
      </span>

      {/* Status label pill */}
      <span
        style={{
          fontFamily: FONT,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: cfg.labelColor,
          background: cfg.labelBg,
          padding: "2px 8px",
          borderRadius: 100,
          flexShrink: 0,
        }}
      >
        {cfg.labelText}
      </span>

      <RefreshButton
        onClick={handleRefresh}
        color={cfg.border}
        spinning={refreshing}
      />

      <Chevron open={false} color={cfg.border} />
    </div>
  );

  // ── EXPANDED PANEL ─────────────────────────────────────────────────────────
  const expandedPanel = (
    <div
      style={{
        borderLeft: `4px solid ${cfg.border}`,
        background: cfg.bg,
        borderRadius: "0 6px 6px 0",
        overflow: "hidden",
        animation: "wg-expand 0.18s ease",
      }}
    >
      {/* Header row */}
      <div
        onClick={() => setOpen(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 42,
          paddingLeft: 14,
          paddingRight: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <StatusDot color={cfg.dot} loading={loading} />

        <span
          style={{
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            color: cfg.headlineC,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {headline}
        </span>

        {/* Status label pill */}
        <span
          style={{
            fontFamily: FONT,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: cfg.labelColor,
            background: cfg.labelBg,
            padding: "2px 8px",
            borderRadius: 100,
            flexShrink: 0,
          }}
        >
          {cfg.labelText}
        </span>

        <RefreshButton
          onClick={handleRefresh}
          color={cfg.border}
          spinning={refreshing}
        />
        <Chevron open={true} color={cfg.border} />
      </div>

      {/* Content — only if we have something to show */}
      {!loading && hasContent && (
        <div
          style={{
            paddingLeft: 18,
            paddingRight: 16,
            paddingBottom: 12,
            borderTop: `1px solid ${cfg.border}22`,
          }}
        >
          {/* Warnings first — most important */}
          {warnings.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {warnings.map((w, i) => (
                <WarningLine key={i} text={w} />
              ))}
            </div>
          )}

          {/* Items — factual live state */}
          {items.length > 0 && (
            <div style={{ marginTop: warnings.length > 0 ? 8 : 10 }}>
              {items.map((item, i) => (
                <ItemLine key={i} text={item} />
              ))}
            </div>
          )}

          {/* Actions + timestamp */}
          {(actions.length > 0 || timestamp) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              {actions.map((action, i) => (
                <ActionButton
                  key={i}
                  action={action}
                  onAction={onAction}
                  borderColor={cfg.border}
                />
              ))}
              {timestamp && (
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 10,
                    color: "#bbb",
                    marginLeft: "auto",
                  }}
                >
                  {timestamp}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          style={{
            paddingLeft: 18,
            paddingRight: 16,
            paddingBottom: 12,
            borderTop: `1px solid ${cfg.border}22`,
          }}
        >
          {[100, 75, 60].map((w, i) => (
            <div
              key={i}
              style={{
                height: 10,
                width: `${w}%`,
                background: `${cfg.border}18`,
                borderRadius: 4,
                marginTop: i === 0 ? 12 : 6,
                animation: "wg-pulse 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  return open ? expandedPanel : collapsedBar;
}
