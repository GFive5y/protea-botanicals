// src/components/PlatformBar.js — v1.0
// WP-Z Phase 1: Platform Intelligence Bar
// Replaces: AlertsBar.js (hq/) + SystemStatusBar.js
// 40px bar · 4 global icons · live dot · all-clear 4px green hairline
// Admin: position sticky, top 0, zIndex 89
// HQ:    inline (not sticky) — sits immediately after LiveFXBar
//
// RULES (do not violate):
//   - Font: Inter only — never Jost, never Outfit (LL per SYSTEM.md)
//   - onNavigate is NOT a prop on this component — never add setTab/setActiveTab (LL-041)
//   - PlatformBarContext.usePlatformBar() drives Phase 2 page icons — do not add page icons here
//   - AlertsBar.js and SystemStatusBar.js are DEPRECATED — this replaces both

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";

// ─── T TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#474747",
  ink400: "#6B6B6B",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
};

// ─── SEVERITY CONFIG ───────────────────────────────────────────────────────────
const SEV = {
  danger: {
    color: T.danger,
    bg: T.dangerBg,
    bd: T.dangerBd,
    pulseCls: "pib-pulse-danger",
    ringCls: "pib-ring-danger",
  },
  warning: {
    color: T.warning,
    bg: T.warningBg,
    bd: T.warningBd,
    pulseCls: "pib-pulse-warning",
    ringCls: "pib-ring-warning",
  },
  info: {
    color: T.info,
    bg: T.infoBg,
    bd: T.infoBd,
    pulseCls: "pib-pulse-info",
    ringCls: null,
  },
};

// ─── ANIMATIONS ────────────────────────────────────────────────────────────────
// Keyframe timing ratios mirror LiveFXBar live dot DNA (spec Section 3.2)
const INJECTED_CSS = `
@keyframes pib-pulse-danger  { 0%,100%{opacity:1} 50%{opacity:0.2}  }
@keyframes pib-pulse-warning { 0%,100%{opacity:1} 50%{opacity:0.28} }
@keyframes pib-pulse-info    { 0%,100%{opacity:1} 50%{opacity:0.38} }
@keyframes pib-ring-danger   { 0%{transform:scale(1);opacity:0.55} 100%{transform:scale(2.4);opacity:0} }
@keyframes pib-ring-warning  { 0%{transform:scale(1);opacity:0.45} 100%{transform:scale(2.4);opacity:0} }
@keyframes pib-slide-in      { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
@keyframes pib-live          { 0%,100%{opacity:1} 50%{opacity:0.3} }
.pib-pulse-danger  { animation: pib-pulse-danger  1.1s ease-in-out infinite; }
.pib-pulse-warning { animation: pib-pulse-warning 1.8s ease-in-out infinite; }
.pib-pulse-info    { animation: pib-pulse-info    2.4s ease-in-out infinite; }
.pib-ring-danger   { animation: pib-ring-danger   1.8s ease-out    infinite; }
.pib-ring-warning  { animation: pib-ring-warning  2.4s ease-out    infinite; }
.pib-live-dot      { animation: pib-live          1.8s ease-in-out infinite; }
.pib-panel-in      { animation: pib-slide-in 0.16s ease; }
.pib-icon-btn:hover { opacity: 0.72 !important; }
.pib-ack-btn:hover  { background: #d4eedd !important; }
.pib-row:hover      { background: #F4F4F3 !important; }
`;

// ─── ALERT SEVERITY RESOLVER ───────────────────────────────────────────────────
const ALERT_SEVERITY_MAP = [
  { key: "critical", match: ["critical", "danger", "error"], sev: "danger" },
  { key: "warning", match: ["warning", "warn", "caution"], sev: "warning" },
  { key: "info", match: ["info", "notice", "informational"], sev: "info" },
  {
    key: "success",
    match: ["success", "ok", "resolved", "complete"],
    sev: "info",
  },
];
function resolveAlertSev(severity) {
  if (!severity) return "info";
  const s = severity.toLowerCase();
  for (const g of ALERT_SEVERITY_MAP) if (g.match.includes(s)) return g.sev;
  return "info";
}

// ─── TIME FORMATTER ────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

// ─── MONOLINE SVG ICONS ────────────────────────────────────────────────────────
// 20×20 viewBox · 1.5px stroke · linecap round · linejoin round · no fill
// Quiet: T.ink300 @ 38% opacity. Active: full semantic color, pulsing.

const IconAlert = ({ stroke }) => (
  <svg
    viewBox="0 0 20 20"
    width={20}
    height={20}
    fill="none"
    stroke={stroke}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8.7 3.2a1.55 1.55 0 0 1 2.6 0l6.4 11A1.55 1.55 0 0 1 16.4 16.5H3.6a1.55 1.55 0 0 1-1.3-2.3l6.4-11z" />
    <line x1="10" y1="8" x2="10" y2="11.5" />
    <circle cx="10" cy="13.75" r="0.65" fill={stroke} stroke="none" />
  </svg>
);

const IconComms = ({ stroke }) => (
  <svg
    viewBox="0 0 20 20"
    width={20}
    height={20}
    fill="none"
    stroke={stroke}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="16" height="12" rx="2" />
    <polyline points="2,6 10,12 18,6" />
  </svg>
);

const IconFraud = ({ stroke }) => (
  <svg
    viewBox="0 0 20 20"
    width={20}
    height={20}
    fill="none"
    stroke={stroke}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 2 L3 5.5 V10 C3 13.87 6.1 17.1 10 18.2 C13.9 17.1 17 13.87 17 10 V5.5 L10 2z" />
    <line x1="10" y1="8" x2="10" y2="11.5" />
    <circle cx="10" cy="13.75" r="0.65" fill={stroke} stroke="none" />
  </svg>
);

const IconActions = ({ stroke }) => (
  <svg
    viewBox="0 0 20 20"
    width={20}
    height={20}
    fill="none"
    stroke={stroke}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15.3 3.2 a3.2 3.2 0 0 0-4.5 4.5 L4 15.5 a.7.7 0 0 0 1 1 l6.8-6.8 A3.2 3.2 0 0 0 15.3 3.2z" />
    <line x1="13.2" y1="6" x2="15.2" y2="4" />
  </svg>
);

// ─── PIB ICON WRAPPER ──────────────────────────────────────────────────────────
// Renders the icon at quiet or active state with pulse + optional ring
function PIBIcon({ Icon, severity, active, panelOpen, onClick }) {
  const s = active && severity ? SEV[severity] : null;
  const strokeColor = s ? s.color : T.ink300;
  return (
    <div
      className="pib-icon-btn"
      onClick={active ? onClick : undefined}
      style={{
        position: "relative",
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: active ? "pointer" : "default",
        opacity: active ? 1 : 0.38,
        background: panelOpen ? s?.bg || "transparent" : "transparent",
        borderRadius: 4,
        transition: "opacity 0.3s ease, background 0.15s",
        flexShrink: 0,
      }}
    >
      {/* Expanding ring — danger + warning only */}
      {s?.ringCls && (
        <span
          className={s.ringCls}
          style={{
            position: "absolute",
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: `1.5px solid ${strokeColor}`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Icon with pulse */}
      <span
        className={s?.pulseCls || ""}
        style={{ display: "flex", lineHeight: 0 }}
      >
        <Icon stroke={strokeColor} />
      </span>
    </div>
  );
}

// ─── PANEL SHELL ──────────────────────────────────────────────────────────────
// Shared frame used by all 4 panel types
function PanelShell({ severity, title, count, onAckAll, onClose, children }) {
  const s = SEV[severity] || SEV.info;
  return (
    <div
      className="pib-panel-in"
      style={{
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        background: "#fff",
        border: `1px solid ${T.ink150}`,
        borderTop: `2px solid ${s.color}`,
        borderRadius: "0 0 8px 8px",
        zIndex: 100,
        boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
        maxHeight: 380,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: s.bg,
          borderBottom: `1px solid ${T.ink150}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: s.color,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: s.color,
              fontFamily: T.font,
            }}
          >
            {title}
            {count > 0 ? ` — ${count}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onAckAll && (
            <button
              onClick={onAckAll}
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 10px",
                border: `1px solid ${s.bd}`,
                borderRadius: 3,
                background: "transparent",
                color: s.color,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              Acknowledge all
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              color: T.ink400,
              fontSize: 13,
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: "auto", flex: 1, scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

// ─── ALERTS PANEL ──────────────────────────────────────────────────────────────
function AlertsPanel({ alerts, onAckOne, onAckAll, onClose }) {
  const overallSev = alerts.some((a) =>
    ["critical", "danger", "error"].includes((a.severity || "").toLowerCase()),
  )
    ? "danger"
    : alerts.some((a) =>
          ["warning", "warn", "caution"].includes(
            (a.severity || "").toLowerCase(),
          ),
        )
      ? "warning"
      : "info";

  return (
    <PanelShell
      severity={overallSev}
      title="Alerts"
      count={alerts.length}
      onAckAll={() => onAckAll(alerts.map((a) => a.id))}
      onClose={onClose}
    >
      {alerts.map((alert, i) => {
        const sev = resolveAlertSev(alert.severity);
        const s = SEV[sev] || SEV.info;
        return (
          <div
            key={alert.id}
            className="pib-row"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "10px 16px",
              borderBottom:
                i < alerts.length - 1 ? `0.5px solid ${T.ink150}` : "none",
              transition: "background 0.1s",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: T.ink900,
                  marginBottom: 2,
                  lineHeight: 1.35,
                  fontFamily: T.font,
                }}
              >
                {alert.title}
              </div>
              {alert.body && (
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink500,
                    marginBottom: 4,
                    lineHeight: 1.45,
                    fontFamily: T.font,
                  }}
                >
                  {alert.body}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {alert.alert_type && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      padding: "1px 5px",
                      borderRadius: 2,
                      background: s.bg,
                      border: `1px solid ${s.bd}`,
                      color: s.color,
                      fontFamily: T.font,
                    }}
                  >
                    {alert.alert_type.replace(/_/g, " ")}
                  </span>
                )}
                {alert.source_table && (
                  <span
                    style={{ fontSize: 9, color: T.ink400, fontFamily: T.font }}
                  >
                    {alert.source_table}
                  </span>
                )}
                <span
                  style={{ fontSize: 9, color: T.ink400, fontFamily: T.font }}
                >
                  {fmtTime(alert.created_at)}
                </span>
              </div>
            </div>
            <button
              className="pib-ack-btn"
              onClick={() => onAckOne(alert.id)}
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 9px",
                border: `1px solid ${T.successBd}`,
                borderRadius: 3,
                background: T.successBg,
                color: T.success,
                cursor: "pointer",
                flexShrink: 0,
                marginTop: 2,
                transition: "background 0.1s",
                fontFamily: T.font,
              }}
            >
              ACK
            </button>
          </div>
        );
      })}
    </PanelShell>
  );
}

// ─── COMMS PANEL ───────────────────────────────────────────────────────────────
function CommsPanel({ unread, openTickets, role, onNavigate, onClose }) {
  const sev = unread > 0 || openTickets > 0 ? "warning" : "info";
  return (
    <PanelShell
      severity={sev}
      title="Communications"
      count={unread + openTickets}
      onClose={onClose}
    >
      <div style={{ padding: "16px 16px 14px" }}>
        {/* Stat row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              flex: 1,
              padding: "10px 12px",
              background: unread > 0 ? T.warningBg : T.ink075,
              border: `1px solid ${unread > 0 ? T.warningBd : T.ink150}`,
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.ink400,
                fontFamily: T.font,
                marginBottom: 4,
              }}
            >
              Unread msgs
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: unread > 0 ? T.warning : T.ink400,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                fontFamily: T.font,
              }}
            >
              {unread}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              padding: "10px 12px",
              background: openTickets > 0 ? T.infoBg : T.ink075,
              border: `1px solid ${openTickets > 0 ? T.infoBd : T.ink150}`,
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.ink400,
                fontFamily: T.font,
                marginBottom: 4,
              }}
            >
              Open tickets
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: openTickets > 0 ? T.info : T.ink400,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                fontFamily: T.font,
              }}
            >
              {openTickets}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: T.ink500,
            fontFamily: T.font,
            marginBottom: 14,
            lineHeight: 1.55,
          }}
        >
          {unread === 0 && openTickets === 0
            ? "All caught up — no unread messages or open tickets."
            : `${unread > 0 ? `${unread} message${unread !== 1 ? "s" : ""} waiting for reply. ` : ""}${openTickets > 0 ? `${openTickets} ticket${openTickets !== 1 ? "s" : ""} open.` : ""}`}
          {role === "hq" &&
            unread + openTickets > 0 &&
            " (Cross-tenant aggregate.)"}
        </div>

        <button
          onClick={() => {
            onClose();
            onNavigate(role === "hq" ? "/admin?tab=comms" : "?tab=comms");
          }}
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "5px 14px",
            border: `1px solid ${T.ink150}`,
            borderRadius: 4,
            background: T.ink075,
            color: T.ink700,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          → Open Comms
        </button>
      </div>
    </PanelShell>
  );
}

// ─── FRAUD PANEL ───────────────────────────────────────────────────────────────
function FraudPanel({ flagged, role, onNavigate, onClose }) {
  return (
    <PanelShell
      severity="danger"
      title="Fraud alerts"
      count={flagged.length}
      onClose={onClose}
    >
      <div style={{ padding: "12px 16px" }}>
        <div
          style={{
            padding: "8px 12px",
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 11,
            color: T.danger,
            fontFamily: T.font,
            lineHeight: 1.5,
          }}
        >
          {flagged.length} account{flagged.length !== 1 ? "s" : ""} with anomaly
          score &gt; 85 — review immediately.
        </div>

        {flagged.slice(0, 8).map((u, i) => (
          <div
            key={u.id}
            className="pib-row"
            style={{
              padding: "8px 0",
              borderBottom:
                i < Math.min(flagged.length, 8) - 1
                  ? `0.5px solid ${T.ink150}`
                  : "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "background 0.1s",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: T.dangerBg,
                border: `1px solid ${T.dangerBd}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: T.danger,
                fontFamily: T.font,
                flexShrink: 0,
              }}
            >
              {(u.full_name || u.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: T.ink900,
                  fontFamily: T.font,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.full_name || u.email || "Unknown user"}
              </div>
              <div
                style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}
              >
                Score: {u.anomaly_score}
              </div>
            </div>
          </div>
        ))}

        {flagged.length > 8 && (
          <div
            style={{
              fontSize: 10,
              color: T.ink400,
              fontFamily: T.font,
              padding: "8px 0",
            }}
          >
            +{flagged.length - 8} more — open Security tab to view all
          </div>
        )}

        <button
          onClick={() => {
            onClose();
            onNavigate(role === "hq" ? "/hq?tab=fraud" : "?tab=security");
          }}
          style={{
            marginTop: 12,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "5px 14px",
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 4,
            background: T.dangerBg,
            color: T.danger,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          → Open Security
        </button>
      </div>
    </PanelShell>
  );
}

// ─── ACTIONS PANEL ─────────────────────────────────────────────────────────────
function ActionsPanel({ zeroPrice, outOfStock, role, onNavigate, onClose }) {
  const sev = zeroPrice.length > 0 ? "danger" : "warning";
  const total = zeroPrice.length + outOfStock.length;
  return (
    <PanelShell
      severity={sev}
      title="Actions required"
      count={total}
      onClose={onClose}
    >
      <div style={{ padding: "12px 16px" }}>
        {/* Zero-price section */}
        {zeroPrice.length > 0 && (
          <div style={{ marginBottom: outOfStock.length > 0 ? 16 : 0 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: T.danger,
                marginBottom: 8,
                fontFamily: T.font,
              }}
            >
              No sell price — invisible to customers ({zeroPrice.length})
            </div>
            {zeroPrice.slice(0, 6).map((item, i) => (
              <div
                key={item.id}
                className="pib-row"
                style={{
                  padding: "5px 0",
                  borderBottom:
                    i < Math.min(zeroPrice.length, 6) - 1
                      ? `0.5px solid ${T.ink150}`
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background 0.1s",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: T.danger,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{ fontSize: 12, color: T.ink700, fontFamily: T.font }}
                >
                  {item.name}
                </span>
                {item.sku && (
                  <span
                    style={{
                      fontSize: 10,
                      color: T.ink400,
                      fontFamily: T.font,
                    }}
                  >
                    · {item.sku}
                  </span>
                )}
              </div>
            ))}
            {zeroPrice.length > 6 && (
              <div
                style={{
                  fontSize: 10,
                  color: T.ink400,
                  fontFamily: T.font,
                  paddingTop: 4,
                }}
              >
                +{zeroPrice.length - 6} more
              </div>
            )}
          </div>
        )}

        {/* Out of stock section */}
        {outOfStock.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: 8,
                fontFamily: T.font,
              }}
            >
              Out of stock ({outOfStock.length})
            </div>
            {outOfStock.slice(0, 6).map((item, i) => (
              <div
                key={item.id}
                className="pib-row"
                style={{
                  padding: "5px 0",
                  borderBottom:
                    i < Math.min(outOfStock.length, 6) - 1
                      ? `0.5px solid ${T.ink150}`
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background 0.1s",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: T.warning,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{ fontSize: 12, color: T.ink700, fontFamily: T.font }}
                >
                  {item.name}
                </span>
              </div>
            ))}
            {outOfStock.length > 6 && (
              <div
                style={{
                  fontSize: 10,
                  color: T.ink400,
                  fontFamily: T.font,
                  paddingTop: 4,
                }}
              >
                +{outOfStock.length - 6} more
              </div>
            )}
          </div>
        )}

        {/* CTA buttons */}
        <div
          style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}
        >
          {zeroPrice.length > 0 && (
            <button
              onClick={() => {
                onClose();
                onNavigate(role === "hq" ? "/hq?tab=pricing" : "?tab=stock");
              }}
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 14px",
                border: `1px solid ${T.dangerBd}`,
                borderRadius: 4,
                background: T.dangerBg,
                color: T.danger,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              → Set prices
            </button>
          )}
          {outOfStock.length > 0 && (
            <button
              onClick={() => {
                onClose();
                onNavigate("?tab=stock");
              }}
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 14px",
                border: `1px solid ${T.warningBd}`,
                borderRadius: 4,
                background: T.warningBg,
                color: T.warning,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              → Restock
            </button>
          )}
        </div>
      </div>
    </PanelShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * PlatformBar v1.0
 *
 * @param {string} role     — "admin" | "hq"  → determines data scope + sticky behaviour
 * @param {string} tenantId — tenant ID for scoped queries (admin role)
 *
 * Admin: sticky top:0 zIndex:89
 * HQ:    inline, not sticky — sits immediately after <LiveFXBar />
 */
export default function PlatformBar({ role = "admin", tenantId }) {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const tid = tenantId || tenant?.id;

  // ── Panel state ────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState(null);
  const panelRef = useRef(null);

  // ── Connection ─────────────────────────────────────────────────────────────
  const [connected, setConnected] = useState(false);

  // ── Alerts data ────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState([]);

  // ── Comms data ─────────────────────────────────────────────────────────────
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  // ── Fraud data ─────────────────────────────────────────────────────────────
  const [flaggedUsers, setFlaggedUsers] = useState([]);

  // ── Actions data ───────────────────────────────────────────────────────────
  const [zeroPrice, setZeroPrice] = useState([]);
  const [outOfStock, setOutOfStock] = useState([]);

  // Interval refs for cleanup
  const commsInterval = useRef(null);
  const fraudInterval = useRef(null);
  const actionsInterval = useRef(null);
  const heartbeatTimer = useRef(null);

  // ── ALERTS: realtime ───────────────────────────────────────────────────────
  const loadAlerts = useCallback(async () => {
    if (!tid) return;
    let q = supabase
      .from("system_alerts")
      .select("id,alert_type,severity,title,body,source_table,created_at")
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    // Admin: tenant-scoped. HQ: all tenants via RLS (hq_access=true bypasses RLS).
    if (role === "admin") q = q.eq("tenant_id", tid);
    const { data } = await q;
    setAlerts(data || []);
  }, [tid, role]);

  useEffect(() => {
    if (!tid) return;
    loadAlerts();
    const ch = supabase
      .channel(`pib-alerts-${tid}-${role}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_alerts",
          ...(role === "admin" ? { filter: `tenant_id=eq.${tid}` } : {}),
        },
        loadAlerts,
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => supabase.removeChannel(ch);
  }, [tid, role, loadAlerts]);

  // ── COMMS: 60s poll ────────────────────────────────────────────────────────
  const loadComms = useCallback(async () => {
    if (!tid) return;
    try {
      let msgsQ = supabase
        .from("customer_messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null); // column is read_at NOT .read (LL-003/DB facts)
      if (role === "admin") msgsQ = msgsQ.eq("tenant_id", tid);

      let tixQ = supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("closed","resolved")');
      if (role === "admin") tixQ = tixQ.eq("tenant_id", tid);

      const [msgsRes, tixRes] = await Promise.allSettled([msgsQ, tixQ]);
      setUnreadMsgs(
        msgsRes?.status === "fulfilled" ? (msgsRes.value?.count ?? 0) : 0,
      );
      setOpenTickets(
        tixRes?.status === "fulfilled" ? (tixRes.value?.count ?? 0) : 0,
      );
    } catch (_) {}
  }, [tid, role]);

  useEffect(() => {
    loadComms();
    commsInterval.current = setInterval(loadComms, 60_000);
    return () => clearInterval(commsInterval.current);
  }, [loadComms]);

  // ── FRAUD: 60s poll · anomaly_score > 85 ──────────────────────────────────
  const loadFraud = useCallback(async () => {
    if (!tid) return;
    try {
      let q = supabase
        .from("user_profiles")
        .select("id,full_name,email,anomaly_score")
        .gt("anomaly_score", 85)
        .order("anomaly_score", { ascending: false })
        .limit(20);
      if (role === "admin") q = q.eq("tenant_id", tid);
      const { data } = await q;
      setFlaggedUsers(data || []);
    } catch (_) {}
  }, [tid, role]);

  useEffect(() => {
    loadFraud();
    fraudInterval.current = setInterval(loadFraud, 60_000);
    return () => clearInterval(fraudInterval.current);
  }, [loadFraud]);

  // ── ACTIONS: 5min poll · zero-price + OOS finished products ───────────────
  const loadActions = useCallback(async () => {
    if (!tid) return;
    try {
      let zpQ = supabase
        .from("inventory_items")
        .select("id,name,sku")
        .eq("is_active", true)
        .lte("sell_price", 0)
        .eq("category", "finished_product");
      if (role === "admin") zpQ = zpQ.eq("tenant_id", tid);

      let oosQ = supabase
        .from("inventory_items")
        .select("id,name")
        .eq("is_active", true)
        .lte("quantity_on_hand", 0)
        .eq("category", "finished_product");
      if (role === "admin") oosQ = oosQ.eq("tenant_id", tid);

      const [zpRes, oosRes] = await Promise.allSettled([zpQ, oosQ]);
      const zp = zpRes?.status === "fulfilled" ? zpRes.value?.data || [] : [];
      const oos =
        oosRes?.status === "fulfilled" ? oosRes.value?.data || [] : [];
      const zpIds = new Set(zp.map((i) => i.id));
      setZeroPrice(zp);
      setOutOfStock(oos.filter((i) => !zpIds.has(i.id)));
    } catch (_) {}
  }, [tid, role]);

  useEffect(() => {
    loadActions();
    actionsInterval.current = setInterval(loadActions, 5 * 60_000);
    return () => clearInterval(actionsInterval.current);
  }, [loadActions]);

  // ── Heartbeat: 30s connection probe ───────────────────────────────────────
  useEffect(() => {
    heartbeatTimer.current = setInterval(async () => {
      try {
        const { error } = await supabase
          .from("system_alerts")
          .select("id", { count: "exact", head: true })
          .limit(1);
        setConnected(!error);
      } catch (_) {
        setConnected(false);
      }
    }, 30_000);
    return () => clearInterval(heartbeatTimer.current);
  }, []);

  // ── Outside click → close panel ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setActivePanel(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Navigation helper (used by panels) ───────────────────────────────────
  const handleNavigate = useCallback(
    (path) => {
      if (path.startsWith("?")) {
        // Relative: stay on current route, change query
        const base = window.location.pathname;
        navigate(base + path);
      } else {
        navigate(path);
      }
    },
    [navigate],
  );

  // ── ACK alerts ────────────────────────────────────────────────────────────
  const ackOne = useCallback(async (id) => {
    await supabase
      .from("system_alerts")
      .update({
        acknowledged_at: new Date().toISOString(),
        status: "acknowledged",
      })
      .eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const ackAll = useCallback(async (ids) => {
    if (!ids.length) return;
    await supabase
      .from("system_alerts")
      .update({
        acknowledged_at: new Date().toISOString(),
        status: "acknowledged",
      })
      .in("id", ids);
    setAlerts((prev) => prev.filter((a) => !ids.includes(a.id)));
    setActivePanel(null);
  }, []);

  // ── Derived severity ──────────────────────────────────────────────────────
  const alertsSev = alerts.some((a) =>
    ["critical", "danger", "error"].includes((a.severity || "").toLowerCase()),
  )
    ? "danger"
    : alerts.length > 0
      ? "warning"
      : null;

  const commsSev = unreadMsgs > 0 || openTickets > 0 ? "warning" : null;

  const fraudSev = flaggedUsers.length > 0 ? "danger" : null;

  const actionsSev =
    zeroPrice.length > 0 ? "danger" : outOfStock.length > 0 ? "warning" : null;

  const allClear = !alertsSev && !commsSev && !fraudSev && !actionsSev;

  // Admin: sticky. HQ: inline (scrolls with LiveFXBar cluster).
  const isSticky = role === "admin";

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{INJECTED_CSS}</style>

      <div
        ref={panelRef}
        style={{
          position: isSticky ? "sticky" : "relative",
          top: isSticky ? 0 : "auto",
          zIndex: 89,
          fontFamily: T.font,
        }}
      >
        {/* ── THE BAR ───────────────────────────────────────────────────── */}
        <div
          style={{
            height: allClear ? 4 : 40,
            background: allClear ? T.successBd : "#ffffff",
            borderBottom: allClear ? "none" : `1px solid ${T.ink150}`,
            overflow: "visible",
            transition: "height 200ms ease, background 200ms ease",
            display: "flex",
            alignItems: "center",
            padding: allClear ? 0 : "0 8px 0 12px",
            boxSizing: "border-box",
          }}
        >
          {!allClear && (
            <>
              {/* ── GLOBAL ZONE (left) ─── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flex: 1,
                }}
              >
                {/* Live dot */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    paddingRight: 10,
                    marginRight: 2,
                    borderRight: `1px solid ${T.ink150}`,
                    height: 20,
                  }}
                >
                  <span
                    className={connected ? "pib-live-dot" : ""}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: connected ? T.accentMid : T.ink300,
                      boxShadow: connected
                        ? `0 0 5px ${T.accentMid}80`
                        : "none",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                </div>

                {/* Alerts ⚠ */}
                <PIBIcon
                  Icon={IconAlert}
                  severity={alertsSev}
                  active={!!alertsSev}
                  panelOpen={activePanel === "alerts"}
                  onClick={() =>
                    setActivePanel((v) => (v === "alerts" ? null : "alerts"))
                  }
                />

                {/* Comms ✉ */}
                <PIBIcon
                  Icon={IconComms}
                  severity={commsSev}
                  active={!!commsSev}
                  panelOpen={activePanel === "comms"}
                  onClick={() =>
                    setActivePanel((v) => (v === "comms" ? null : "comms"))
                  }
                />

                {/* Fraud 🛡 */}
                <PIBIcon
                  Icon={IconFraud}
                  severity={fraudSev}
                  active={!!fraudSev}
                  panelOpen={activePanel === "fraud"}
                  onClick={() =>
                    setActivePanel((v) => (v === "fraud" ? null : "fraud"))
                  }
                />

                {/* Actions 🔧 */}
                <PIBIcon
                  Icon={IconActions}
                  severity={actionsSev}
                  active={!!actionsSev}
                  panelOpen={activePanel === "actions"}
                  onClick={() =>
                    setActivePanel((v) => (v === "actions" ? null : "actions"))
                  }
                />
              </div>

              {/* ── PAGE ZONE (right) — EMPTY Phase 1 ───────────────────── */}
              {/* Phase 2: usePlatformBar().registerPageIcons() populates here */}
            </>
          )}
        </div>

        {/* ── PANELS ────────────────────────────────────────────────────── */}
        {activePanel === "alerts" && alerts.length > 0 && (
          <AlertsPanel
            alerts={alerts}
            onAckOne={ackOne}
            onAckAll={ackAll}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "comms" && (
          <CommsPanel
            unread={unreadMsgs}
            openTickets={openTickets}
            role={role}
            onNavigate={handleNavigate}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "fraud" && flaggedUsers.length > 0 && (
          <FraudPanel
            flagged={flaggedUsers}
            role={role}
            onNavigate={handleNavigate}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "actions" &&
          (zeroPrice.length > 0 || outOfStock.length > 0) && (
            <ActionsPanel
              zeroPrice={zeroPrice}
              outOfStock={outOfStock}
              role={role}
              onNavigate={handleNavigate}
              onClose={() => setActivePanel(null)}
            />
          )}
      </div>
    </>
  );
}
