// src/components/shared/ActionCentre.js
// Reusable collapsible alert stack. Session-dismissible, zero external deps.
// Props:
//   alerts: [{ severity: 'warn'|'critical', message, action?: { label, onClick } }]
//   title?: string   — optional header label (defaults to "Action Centre")

import React, { useState } from "react";
import { T } from "../../styles/tokens";

export default function ActionCentre({ alerts = [], title = "Action Centre" }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !alerts || alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warnCount = alerts.filter((a) => a.severity === "warn").length;

  // Bar tone: critical dominates, otherwise warn
  const hasCritical = criticalCount > 0;
  const barBg = hasCritical ? T.dangerLight : T.warningLight;
  const barBd = hasCritical ? T.dangerBorder : T.warningBorder;
  const barText = hasCritical ? T.dangerText : T.warningText;

  return (
    <div
      style={{
        marginBottom: 20,
        border: `1px solid ${barBd}`,
        borderRadius: 6,
        background: barBg,
        fontFamily: T.font,
        overflow: "hidden",
      }}
    >
      {/* ── Collapsed bar / header row ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: T.font,
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: barText,
          }}
        >
          {title}
        </span>

        {criticalCount > 0 && (
          <Badge count={criticalCount} bg={T.dangerText} fg="#fff" label="critical" />
        )}
        {warnCount > 0 && (
          <Badge count={warnCount} bg={T.warningText} fg="#fff" label="warn" />
        )}

        <span
          style={{
            flex: 1,
            fontSize: 12,
            color: barText,
            fontWeight: 500,
          }}
        >
          {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
        </span>

        <span
          aria-hidden="true"
          style={{
            fontSize: 11,
            color: barText,
            fontWeight: 700,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            display: "inline-block",
            marginRight: 4,
          }}
        >
          ▾
        </span>

        <span
          role="button"
          tabIndex={0}
          aria-label="Dismiss for this session"
          title="Dismiss for this session"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setDismissed(true);
            }
          }}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: barText,
            padding: "2px 6px",
            borderRadius: 4,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ✕
        </span>
      </button>

      {/* ── Expanded list ── */}
      {open && (
        <div
          style={{
            maxHeight: "30vh",
            overflowY: "auto",
            borderTop: `1px solid ${barBd}`,
            background: "#fff",
          }}
        >
          {alerts.map((a, i) => {
            const sevIsCritical = a.severity === "critical";
            const rowBg = sevIsCritical ? T.dangerLight : T.warningLight;
            const rowText = sevIsCritical ? T.dangerText : T.warningText;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderBottom: i < alerts.length - 1 ? `1px solid ${T.surfaceAlt}` : "none",
                  fontSize: 12,
                  background: i % 2 === 0 ? "#fff" : rowBg,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: rowText,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    color: T.ink900,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={a.message}
                >
                  {a.message}
                </span>
                {a.action && (
                  <button
                    type="button"
                    onClick={a.action.onClick}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: `1px solid ${rowText}`,
                      background: "transparent",
                      color: rowText,
                      cursor: "pointer",
                      fontFamily: T.font,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Badge({ count, bg, fg, label }) {
  return (
    <span
      aria-label={`${count} ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 18,
        padding: "0 6px",
        borderRadius: 9,
        background: bg,
        color: fg,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        fontFamily: T.font,
      }}
    >
      {count}
    </span>
  );
}
