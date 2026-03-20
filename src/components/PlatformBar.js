// src/components/hq/AlertsBar.js — v1.0
// Protea Botanicals — WP-X System Intelligence Layer
// Dashboard warning bar — carbon copy DNA from LiveFXBar.js
// Invisible indicators until triggered. Click → slide panel. ACK to dismiss.

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";

// ── Design tokens — exact match LiveFXBar ─────────────────────────────────────
const C = {
  bg: "#ffffff",
  bgMid: "#f4f0e8",
  bgCard: "#faf9f6",
  border: "#e8e0d4",
  green: "#2d6a4f",
  greenBr: "#52b788",
  text: "#1a1a1a",
  muted: "#474747",
  dimmed: "#aaaaaa",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
};

// ── Animations — same keyframe pattern as LiveFXBar ──────────────────────────
const INJECTED_CSS = `
@keyframes ab-live   { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes ab-danger { 0%,100%{opacity:1} 50%{opacity:0.15} }
@keyframes ab-warn   { 0%,100%{opacity:1} 50%{opacity:0.2} }
@keyframes ab-pulse-d {
  0%   { box-shadow: 0 0 0 0   rgba(153,27,27,0.55); }
  70%  { box-shadow: 0 0 0 7px rgba(153,27,27,0); }
  100% { box-shadow: 0 0 0 0   rgba(153,27,27,0); }
}
@keyframes ab-pulse-w {
  0%   { box-shadow: 0 0 0 0   rgba(146,64,14,0.45); }
  70%  { box-shadow: 0 0 0 7px rgba(146,64,14,0); }
  100% { box-shadow: 0 0 0 0   rgba(146,64,14,0); }
}
@keyframes ab-slide-in {
  from { opacity:0; transform:translateY(-6px); }
  to   { opacity:1; transform:translateY(0);    }
}
.ab-live-dot    { animation: ab-live   1.8s ease-in-out infinite; }
.ab-danger-dot  { animation: ab-danger 1.1s ease-in-out infinite; }
.ab-danger-ring { animation: ab-pulse-d 1.8s ease-out   infinite; }
.ab-warn-dot    { animation: ab-warn   1.5s ease-in-out infinite; }
.ab-warn-ring   { animation: ab-pulse-w 2.2s ease-out   infinite; }
.ab-info-dot    { animation: ab-live   2.2s ease-in-out infinite; }
.ab-panel-in    { animation: ab-slide-in 0.18s ease; }
.ab-row:hover   { background: #faf9f6 !important; }
.ab-ack:hover   { background: #d4eedd !important; }
.ab-ind:hover   { opacity: 0.75 !important; }
`;

// ── Severity group definitions ────────────────────────────────────────────────
const GROUPS = [
  {
    key: "critical",
    label: "CRITICAL",
    color: C.danger,
    bg: C.dangerBg,
    bd: C.dangerBd,
    dotClass: "ab-danger-dot",
    ringClass: "ab-danger-ring",
    // severity values that map here
    match: ["critical", "danger", "error"],
  },
  {
    key: "warning",
    label: "WARNING",
    color: C.warning,
    bg: C.warningBg,
    bd: C.warningBd,
    dotClass: "ab-warn-dot",
    ringClass: "ab-warn-ring",
    match: ["warning", "warn", "caution"],
  },
  {
    key: "info",
    label: "INFO",
    color: C.info,
    bg: C.infoBg,
    bd: C.infoBd,
    dotClass: "ab-info-dot",
    ringClass: null,
    match: ["info", "notice", "informational"],
  },
  {
    key: "success",
    label: "OK",
    color: C.success,
    bg: C.successBg,
    bd: C.successBd,
    dotClass: "ab-live-dot",
    ringClass: null,
    match: ["success", "ok", "resolved", "complete"],
  },
];

function resolveGroup(severity) {
  if (!severity) return "info";
  const s = severity.toLowerCase();
  for (const g of GROUPS) {
    if (g.match.includes(s)) return g.key;
  }
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

// ═════════════════════════════════════════════════════════════════════════════
export default function PlatformBar() {
  const { tenant } = useTenant();
  const [alerts, setAlerts] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [connected, setConnected] = useState(false);
  const panelRef = useRef(null);
  const tenantId = tenant?.id;

  // ── Load unacknowledged alerts ────────────────────────────────────────────
  const loadAlerts = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("system_alerts")
      .select("id,alert_type,severity,title,body,source_table,created_at")
      .eq("tenant_id", tenantId)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    setAlerts(data || []);
  }, [tenantId]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    loadAlerts();

    const ch = supabase
      .channel(`ab-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_alerts",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => loadAlerts(),
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => supabase.removeChannel(ch);
  }, [tenantId, loadAlerts]);

  // ── Close panel on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target))
        setActivePanel(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── ACK single ────────────────────────────────────────────────────────────
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

  // ── ACK group ─────────────────────────────────────────────────────────────
  const ackGroup = useCallback(
    async (groupKey) => {
      const ids = (alertsByGroup[groupKey] || []).map((a) => a.id);
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
    },
    [alerts],
  ); // eslint-disable-line

  // ── Group alerts by resolved severity ────────────────────────────────────
  const alertsByGroup = alerts.reduce((acc, a) => {
    const key = resolveGroup(a.severity);
    acc[key] = acc[key] || [];
    acc[key].push(a);
    return acc;
  }, {});

  const total = alerts.length;
  const hasCritical = (alertsByGroup.critical || []).length > 0;

  return (
    <>
      <style>{INJECTED_CSS}</style>

      <div
        style={{
          position: "relative",
          marginBottom: 14,
          zIndex: 40,
          fontFamily: "'Jost','Courier New',monospace",
        }}
      >
        {/* ── INDICATOR BAR ──────────────────────────────────────────────── */}
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderLeft: hasCritical
              ? `3px solid ${C.danger}`
              : `1px solid ${C.border}`,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            height: 40,
            padding: "0 14px",
            boxShadow:
              "0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(45,106,79,0.04)",
            overflow: "visible",
            transition: "border-left 0.3s",
          }}
        >
          {/* LIVE dot — always visible, same as FXBar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginRight: 16,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                width: 8,
                height: 8,
              }}
            >
              <span
                className={connected ? "ab-live-dot" : ""}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: connected ? C.green : C.dimmed,
                  boxShadow: connected ? `0 0 5px ${C.greenBr}` : "none",
                }}
              />
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: connected ? C.green : C.dimmed,
              }}
            >
              LIVE
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 18,
              background: C.border,
              marginRight: 14,
              flexShrink: 0,
            }}
          />

          {/* Severity indicators — invisible (opacity:0) until triggered */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}
          >
            {GROUPS.map((g) => {
              const count = (alertsByGroup[g.key] || []).length;
              const active = count > 0;
              const panelOpen = activePanel === g.key;

              return (
                <div
                  key={g.key}
                  className="ab-ind"
                  onClick={() =>
                    active && setActivePanel(panelOpen ? null : g.key)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 4,
                    cursor: active ? "pointer" : "default",
                    opacity: active ? 1 : 0,
                    pointerEvents: active ? "auto" : "none",
                    transition: "opacity 0.35s ease, background 0.1s",
                    background: panelOpen ? g.bg : "transparent",
                    border: panelOpen
                      ? `1px solid ${g.bd}`
                      : "1px solid transparent",
                  }}
                >
                  {/* Dot with optional pulse ring */}
                  <span
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      width: 8,
                      height: 8,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className={g.dotClass}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: g.color,
                        boxShadow: `0 0 5px ${g.color}99`,
                      }}
                    />
                    {g.ringClass && (
                      <span
                        className={g.ringClass}
                        style={{
                          position: "absolute",
                          inset: "-2px",
                          borderRadius: "50%",
                          background: "transparent",
                        }}
                      />
                    )}
                  </span>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: g.color,
                    }}
                  >
                    {g.label}
                  </span>

                  {/* Count badge */}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: g.bg,
                      border: `1px solid ${g.bd}`,
                      color: g.color,
                      borderRadius: 3,
                      padding: "0 5px",
                      minWidth: 16,
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}

            {/* All-clear — visible only when no active alerts */}
            {total === 0 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: C.success,
                  opacity: connected ? 1 : 0,
                  transition: "opacity 0.3s",
                }}
              >
                ALL CLEAR
              </span>
            )}
          </div>

          {/* Total badge — right edge, visible when alerts exist */}
          {total > 0 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: C.danger,
                background: C.dangerBg,
                border: `1px solid ${C.dangerBd}`,
                borderRadius: 3,
                padding: "1px 8px",
                letterSpacing: "0.06em",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
            >
              {total} ACTIVE
            </span>
          )}
        </div>

        {/* ── SLIDE PANEL ─────────────────────────────────────────────────── */}
        {activePanel &&
          (() => {
            const g = GROUPS.find((g) => g.key === activePanel);
            const groupAlerts = alertsByGroup[activePanel] || [];

            return (
              <div
                ref={panelRef}
                className="ab-panel-in"
                style={{
                  position: "absolute",
                  top: 42,
                  left: 0,
                  right: 0,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderTop: `2px solid ${g.color}`,
                  borderRadius: "0 0 6px 6px",
                  zIndex: 100,
                  boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
                  maxHeight: 340,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Panel header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 16px",
                    borderBottom: `1px solid ${C.border}`,
                    background: g.bg,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: g.color,
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: g.color,
                      }}
                    >
                      {g.label} — {groupAlerts.length} alert
                      {groupAlerts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button
                      onClick={() => ackGroup(activePanel)}
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "3px 10px",
                        border: `1px solid ${g.bd}`,
                        borderRadius: 3,
                        background: "transparent",
                        color: g.color,
                        cursor: "pointer",
                        fontFamily: "'Jost',sans-serif",
                      }}
                    >
                      Acknowledge all
                    </button>
                    <button
                      onClick={() => setActivePanel(null)}
                      style={{
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        background: "transparent",
                        color: C.dimmed,
                        fontSize: 13,
                        cursor: "pointer",
                        borderRadius: 4,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Alert rows */}
                <div
                  style={{ overflowY: "auto", flex: 1, scrollbarWidth: "none" }}
                >
                  {groupAlerts.map((alert, i) => (
                    <div
                      key={alert.id}
                      className="ab-row"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "10px 16px",
                        borderBottom:
                          i < groupAlerts.length - 1
                            ? `0.5px solid ${C.border}`
                            : "none",
                        background: "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: C.text,
                            marginBottom: 2,
                            lineHeight: 1.35,
                            fontFamily: "'Jost',sans-serif",
                          }}
                        >
                          {alert.title}
                        </div>
                        {alert.body && (
                          <div
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              marginBottom: 4,
                              lineHeight: 1.45,
                              fontFamily: "'Jost',sans-serif",
                            }}
                          >
                            {alert.body}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          {alert.alert_type && (
                            <span
                              style={{
                                fontSize: 8,
                                fontWeight: 700,
                                letterSpacing: "0.07em",
                                textTransform: "uppercase",
                                padding: "1px 5px",
                                borderRadius: 2,
                                background: g.bg,
                                border: `1px solid ${g.bd}`,
                                color: g.color,
                              }}
                            >
                              {alert.alert_type.replace(/_/g, " ")}
                            </span>
                          )}
                          {alert.source_table && (
                            <span style={{ fontSize: 9, color: C.dimmed }}>
                              {alert.source_table}
                            </span>
                          )}
                          <span style={{ fontSize: 9, color: C.dimmed }}>
                            {fmtTime(alert.created_at)}
                          </span>
                        </div>
                      </div>
                      <button
                        className="ab-ack"
                        onClick={() => ackOne(alert.id)}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "3px 9px",
                          border: `1px solid ${C.successBd}`,
                          borderRadius: 3,
                          background: C.successBg,
                          color: C.success,
                          cursor: "pointer",
                          flexShrink: 0,
                          marginTop: 2,
                          transition: "background 0.1s",
                          fontFamily: "'Jost',sans-serif",
                        }}
                      >
                        ACK
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
      </div>
    </>
  );
}


