// src/components/PlatformBar.js — v1.2
// WP-Z Phase 1: Platform Intelligence Bar
// WP-BIB Session 11: Profile-adaptive actions panel
//   - ActionsPanel labels adapt per industryProfile
//   - food_beverage: expiry check (7-day window) + "check supplier" language
//   - general_retail: simplified labels
//   - cannabis_retail: unchanged
// Replaces: AlertsBar.js (hq/) + SystemStatusBar.js
// 40px bar · 4 global icons · live dot · all-clear 4px green hairline
// Admin: position sticky, top 0, zIndex 89
// HQ:    inline (not sticky) — sits immediately after LiveFXBar
//
// RULES (do not violate):
//   - Font: Inter only — never Jost, never Outfit
//   - onNavigate is NOT a prop on this component — never add setTab/setActiveTab (LL-041)
//   - AlertsBar.js and SystemStatusBar.js are DEPRECATED — this replaces both

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Mail, Shield, Wrench } from "lucide-react";
import { T as DS } from "../styles/tokens";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";

const T = {
  ...DS,
  ink150:    DS.border,
  ink075:    DS.bg,
  ink050:    DS.surface,
  successBg: DS.successLight,
  warningBg: DS.warningLight,
  dangerBg:  DS.dangerLight,
  infoBg:    DS.infoLight,
};

const SEV = {
  danger: {
    color: T.danger,
    bg: T.dangerBg,
    bd: T.dangerBd,
    pulseCls: "pib-pulse-danger",
  },
  warning: {
    color: T.warning,
    bg: T.warningBg,
    bd: T.warningBd,
    pulseCls: "pib-pulse-warning",
  },
  info: {
    color: T.info,
    bg: T.infoBg,
    bd: T.infoBd,
    pulseCls: "pib-pulse-info",
  },
};

const INJECTED_CSS = `
@keyframes pib-pulse-danger  { 0%,100%{opacity:1} 50%{opacity:0.2}  }
@keyframes pib-pulse-warning { 0%,100%{opacity:1} 50%{opacity:0.28} }
@keyframes pib-pulse-info    { 0%,100%{opacity:1} 50%{opacity:0.38} }
@keyframes pib-slide-in      { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
@keyframes pib-live          { 0%,100%{opacity:1} 50%{opacity:0.3} }
.pib-pulse-danger  { animation: pib-pulse-danger  1.1s ease-in-out infinite; }
.pib-pulse-warning { animation: pib-pulse-warning 1.8s ease-in-out infinite; }
.pib-pulse-info    { animation: pib-pulse-info    2.4s ease-in-out infinite; }
.pib-live-dot      { animation: pib-live          1.8s ease-in-out infinite; }
.pib-panel-in      { animation: pib-slide-in 0.16s ease; }
.pib-icon-btn:hover { opacity: 0.72 !important; }
.pib-ack-btn:hover  { background: #d4eedd !important; }
.pib-row:hover      { background: #F4F4F3 !important; }
`;

const ALERT_SEVERITY_MAP = [
  { match: ["critical", "danger", "error"], sev: "danger" },
  { match: ["warning", "warn", "caution"], sev: "warning" },
  { match: ["info", "notice", "informational"], sev: "info" },
  { match: ["success", "ok", "resolved", "complete"], sev: "info" },
];
function resolveAlertSev(severity) {
  if (!severity) return "info";
  const s = severity.toLowerCase();
  for (const g of ALERT_SEVERITY_MAP) if (g.match.includes(s)) return g.sev;
  return "info";
}

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

const IconAlert = ({ stroke }) => <AlertTriangle size={18} color={stroke} strokeWidth={1.5} />;
const IconComms = ({ stroke }) => <Mail size={18} color={stroke} strokeWidth={1.5} />;
const IconFraud = ({ stroke }) => <Shield size={18} color={stroke} strokeWidth={1.5} />;
const IconActions = ({ stroke }) => <Wrench size={18} color={stroke} strokeWidth={1.5} />;

function PIBIcon({ Icon, severity, active, panelOpen, onClick }) {
  const s = active && severity ? SEV[severity] : null;
  const strokeColor = s ? s.color : T.ink300;
  return (
    <div
      className="pib-icon-btn"
      onClick={active ? onClick : undefined}
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: active ? "pointer" : "default",
        opacity: active ? 1 : 0.38,
        background: panelOpen ? s?.bg || "transparent" : "transparent",
        borderRadius: T.radius.sm,
        transition: "opacity 0.3s ease, background 0.15s",
        flexShrink: 0,
      }}
    >
      <span
        className={s?.pulseCls || ""}
        style={{ display: "flex", lineHeight: 0 }}
      >
        <Icon stroke={strokeColor} />
      </span>
    </div>
  );
}

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
        background: T.surface,
        border: `1px solid ${T.ink150}`,
        borderTop: `2px solid ${s.color}`,
        borderRadius: `0 0 ${T.radius.md} ${T.radius.md}`,
        zIndex: 100,
        boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
        maxHeight: 380,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
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
              fontSize: 11,
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
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 10px",
                border: `1px solid ${s.bd}`,
                borderRadius: T.radius.sm,
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
              borderRadius: T.radius.sm,
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1, scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

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
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      padding: "1px 5px",
                      borderRadius: T.radius.sm,
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
                    style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}
                  >
                    {alert.source_table}
                  </span>
                )}
                <span
                  style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}
                >
                  {fmtTime(alert.created_at)}
                </span>
              </div>
            </div>
            <button
              className="pib-ack-btn"
              onClick={() => onAckOne(alert.id)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 9px",
                border: `1px solid ${T.successBd}`,
                borderRadius: T.radius.sm,
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
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              flex: 1,
              padding: "10px 12px",
              background: unread > 0 ? T.warningBg : T.ink075,
              border: `1px solid ${unread > 0 ? T.warningBd : T.ink150}`,
              borderRadius: T.radius.md,
            }}
          >
            <div
              style={{
                fontSize: 11,
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
                fontWeight: 700,
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
              borderRadius: T.radius.md,
            }}
          >
            <div
              style={{
                fontSize: 11,
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
                fontWeight: 700,
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
            onNavigate(role === "hq" ? "/hq?tab=comms" : "?tab=comms");
          }}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "5px 14px",
            border: `1px solid ${T.ink150}`,
            borderRadius: T.radius.sm,
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
            borderRadius: T.radius.md,
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
                fontSize: 11,
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
                style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}
              >
                Score: {u.anomaly_score}
              </div>
            </div>
          </div>
        ))}
        {flagged.length > 8 && (
          <div
            style={{
              fontSize: 11,
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
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "5px 14px",
            border: `1px solid ${T.dangerBd}`,
            borderRadius: T.radius.sm,
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

// ── v1.2: Profile-adaptive Actions Panel ─────────────────────────────────────
function ActionsPanel({
  zeroPrice,
  outOfStock,
  expiringItems = [],
  role,
  onNavigate,
  onClose,
  industryProfile,
}) {
  const isFoodBev = industryProfile === "food_beverage";
  const isGeneral =
    industryProfile === "general_retail" || industryProfile === "mixed_retail";
  const sev = zeroPrice.length > 0 ? "danger" : "warning";
  const total = zeroPrice.length + outOfStock.length + expiringItems.length;

  return (
    <PanelShell
      severity={sev}
      title="Actions required"
      count={total}
      onClose={onClose}
    >
      <div style={{ padding: "12px 16px" }}>
        {/* Zero price items */}
        {zeroPrice.length > 0 && (
          <div
            style={{
              marginBottom:
                outOfStock.length > 0 || expiringItems.length > 0 ? 16 : 0,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: T.danger,
                marginBottom: 8,
                fontFamily: T.font,
              }}
            >
              {isFoodBev
                ? "No sell price — invisible to customers"
                : isGeneral
                  ? "No sell price set"
                  : "No sell price — invisible to customers"}{" "}
              ({zeroPrice.length})
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
                      fontSize: 11,
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
                  fontSize: 11,
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

        {/* Out of stock items */}
        {outOfStock.length > 0 && (
          <div style={{ marginBottom: expiringItems.length > 0 ? 16 : 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: 8,
                fontFamily: T.font,
              }}
            >
              {isFoodBev ? "Out of stock — check supplier" : "Out of stock"} (
              {outOfStock.length})
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
                  fontSize: 11,
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

        {/* Expiring items — food_beverage only */}
        {isFoodBev && expiringItems.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: 8,
                fontFamily: T.font,
              }}
            >
              Expiring within 7 days ({expiringItems.length})
            </div>
            {expiringItems.slice(0, 6).map((item, i) => (
              <div
                key={item.id}
                className="pib-row"
                style={{
                  padding: "5px 0",
                  borderBottom:
                    i < Math.min(expiringItems.length, 6) - 1
                      ? `0.5px solid ${T.ink150}`
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
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
                <span
                  style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}
                >
                  ·{" "}
                  {new Date(item.expiry_date).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
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
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 14px",
                border: `1px solid ${T.dangerBd}`,
                borderRadius: T.radius.sm,
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
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 14px",
                border: `1px solid ${T.warningBd}`,
                borderRadius: T.radius.sm,
                background: T.warningBg,
                color: T.warning,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              → Restock
            </button>
          )}
          {isFoodBev && expiringItems.length > 0 && (
            <button
              onClick={() => {
                onClose();
                onNavigate(role === "hq" ? "/hq?tab=hq-stock" : "?tab=items");
              }}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 14px",
                border: `1px solid ${T.warningBd}`,
                borderRadius: T.radius.sm,
                background: T.warningBg,
                color: T.warning,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              → Review expiry
            </button>
          )}
        </div>
      </div>
    </PanelShell>
  );
}

export default function PlatformBar({ role = "admin", tenantId }) {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const tid = tenantId || tenant?.id;
  const industryProfile = tenant?.industry_profile || "cannabis_retail";
  const isFoodBevPlatform = industryProfile === "food_beverage";

  const [activePanel, setActivePanel] = useState(null);
  const panelRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [zeroPrice, setZeroPrice] = useState([]);
  const [outOfStock, setOutOfStock] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);

  const commsInterval = useRef(null);
  const fraudInterval = useRef(null);
  const actionsInterval = useRef(null);
  const heartbeatTimer = useRef(null);

  const loadAlerts = useCallback(async () => {
    if (!tid) return;
    let q = supabase
      .from("system_alerts")
      .select("id,alert_type,severity,title,body,source_table,created_at")
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
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

  const loadComms = useCallback(async () => {
    if (!tid) return;
    try {
      let msgsQ = supabase
        .from("customer_messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
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
      // Expiry check — food_beverage profile only
      if (isFoodBevPlatform) {
        const threshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        let expQ = supabase
          .from("inventory_items")
          .select("id,name,expiry_date")
          .eq("is_active", true)
          .not("expiry_date", "is", null)
          .lte("expiry_date", threshold)
          .gt("quantity_on_hand", 0);
        if (role === "admin") expQ = expQ.eq("tenant_id", tid);
        const expRes = await expQ;
        setExpiringItems(expRes.data || []);
      }
    } catch (_) {}
  }, [tid, role, isFoodBevPlatform]);

  useEffect(() => {
    loadActions();
    actionsInterval.current = setInterval(loadActions, 5 * 60_000);
    return () => clearInterval(actionsInterval.current);
  }, [loadActions]);

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

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target))
        setActivePanel(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNavigate = useCallback(
    (path) => {
      navigate(path.startsWith("?") ? window.location.pathname + path : path);
    },
    [navigate],
  );

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
    zeroPrice.length > 0
      ? "danger"
      : outOfStock.length > 0 || expiringItems.length > 0
        ? "warning"
        : null;
  const allClear = !alertsSev && !commsSev && !fraudSev && !actionsSev;
  const isSticky = role === "admin";

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
        <div
          style={{
            height: allClear ? 4 : 40,
            background: allClear ? T.successBd : T.surface,
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
            <div
              style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}
            >
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
                    boxShadow: connected ? `0 0 5px ${T.accentMid}80` : "none",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
              </div>
              <PIBIcon
                Icon={IconAlert}
                severity={alertsSev}
                active={!!alertsSev}
                panelOpen={activePanel === "alerts"}
                onClick={() =>
                  setActivePanel((v) => (v === "alerts" ? null : "alerts"))
                }
              />
              <PIBIcon
                Icon={IconComms}
                severity={commsSev}
                active={!!commsSev}
                panelOpen={activePanel === "comms"}
                onClick={() =>
                  setActivePanel((v) => (v === "comms" ? null : "comms"))
                }
              />
              <PIBIcon
                Icon={IconFraud}
                severity={fraudSev}
                active={!!fraudSev}
                panelOpen={activePanel === "fraud"}
                onClick={() =>
                  setActivePanel((v) => (v === "fraud" ? null : "fraud"))
                }
              />
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
          )}
        </div>

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
          (zeroPrice.length > 0 ||
            outOfStock.length > 0 ||
            expiringItems.length > 0) && (
            <ActionsPanel
              zeroPrice={zeroPrice}
              outOfStock={outOfStock}
              expiringItems={expiringItems}
              role={role}
              onNavigate={handleNavigate}
              onClose={() => setActivePanel(null)}
              industryProfile={industryProfile}
            />
          )}
      </div>
    </>
  );
}
