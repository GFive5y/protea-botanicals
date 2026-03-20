/* DEPRECATED v91 — absorbed into PlatformBar.js (WP-Z Phase 1) */
// src/components/SystemStatusBar.js — v1.0
// Protea Botanicals — WP-X System Intelligence Layer
// Persistent 36px status bar rendered in AdminDashboard + HQDashboard.
// Shows live counts + pending setup items checklist.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

const PENDING_ITEMS = [
  {
    id: "twilio_token",
    label: "Twilio Auth Token",
    desc: "Rotate at console.twilio.com → run: npx supabase secrets set TWILIO_AUTH_TOKEN=<new_token>",
    severity: "high",
  },
  {
    id: "sa_whatsapp",
    label: "SA WhatsApp Number",
    desc: "Update ADMIN_WHATSAPP_TO in Supabase secrets. Currently set to NZ number (+64210301406).",
    severity: "high",
  },
  {
    id: "domain",
    label: "Production Domain",
    desc: "Configure DNS and deploy to production hosting (Vercel / Netlify).",
    severity: "medium",
  },
  {
    id: "bank_account",
    label: "Bank Account / PayFast",
    desc: "Connect payment provider so online orders can be processed.",
    severity: "medium",
  },
  {
    id: "pg_cron",
    label: "pg_cron Birthday Points",
    desc: "Waiting on Supabase Pro upgrade. pts_birthday column is already in loyalty_config.",
    severity: "low",
  },
];

const SEV_COLOR = { high: "#c0392b", medium: "#e67e22", low: "#b5935a" };
const SEV_BG = { high: "#fdf0ef", medium: "#fdf5ec", low: "#fef9e7" };

const C = {
  green: "#1b4332",
  accent: "#52b788",
  gold: "#b5935a",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
  orange: "#e67e22",
  border: "#e8e0d4",
};
const F = { body: "'Jost', 'Helvetica Neue', sans-serif" };

export default function SystemStatusBar() {
  const [live, setLive] = useState(true);
  const [openTickets, setOpenTickets] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [scansToday, setScansToday] = useState(0);
  const [showChecklist, setShowChecklist] = useState(false);
  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wb_pending_completed") || "{}");
    } catch {
      return {};
    }
  });

  const pendingCount = PENDING_ITEMS.filter((i) => !completed[i.id]).length;

  const fetchCounts = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [tickRes, msgRes, scanRes] = await Promise.all([
        supabase
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "pending_reply"]),
        supabase
          .from("customer_messages")
          .select("id", { count: "exact", head: true })
          .eq("direction", "inbound")
          .is("read_at", null),
        supabase
          .from("scan_logs")
          .select("id", { count: "exact", head: true })
          .gte("scanned_at", todayStart.toISOString()),
      ]);
      setOpenTickets(tickRes.count || 0);
      setUnreadMsgs(msgRes.count || 0);
      setScansToday(scanRes.count || 0);
      setLive(true);
    } catch {
      setLive(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const toggleComplete = (id) => {
    setCompleted((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("wb_pending_completed", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <>
      {/* ── Status bar ── */}
      <div
        style={{
          background: "#f0ede8",
          borderBottom: `1px solid ${C.border}`,
          padding: "0 24px",
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: F.body,
          fontSize: 11,
          gap: 16,
          flexShrink: 0,
        }}
      >
        {/* Left: live dot + counts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "nowrap",
            overflow: "hidden",
          }}
        >
          {/* Live indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: live ? C.accent : C.red,
                display: "inline-block",
                boxShadow: live ? "0 0 0 2px rgba(82,183,136,0.25)" : "none",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontWeight: 700,
                color: live ? C.accent : C.red,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontSize: 10,
              }}
            >
              {live ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          <span style={{ color: C.border, flexShrink: 0 }}>|</span>

          <span style={{ color: "#444", flexShrink: 0 }}>
            📱 <strong style={{ color: C.green }}>{scansToday}</strong>
            <span style={{ color: C.muted }}> scans today</span>
          </span>

          <span style={{ color: C.border, flexShrink: 0 }}>·</span>

          <span
            style={{ color: openTickets > 0 ? C.red : "#444", flexShrink: 0 }}
          >
            🎫{" "}
            <strong style={{ color: openTickets > 0 ? C.red : C.green }}>
              {openTickets}
            </strong>
            <span style={{ color: C.muted }}>
              {" "}
              open ticket{openTickets !== 1 ? "s" : ""}
            </span>
          </span>

          <span style={{ color: C.border, flexShrink: 0 }}>·</span>

          <span
            style={{ color: unreadMsgs > 0 ? C.orange : "#444", flexShrink: 0 }}
          >
            💬{" "}
            <strong style={{ color: unreadMsgs > 0 ? C.orange : C.green }}>
              {unreadMsgs}
            </strong>
            <span style={{ color: C.muted }}> unread</span>
          </span>
        </div>

        {/* Right: pending setup items */}
        {pendingCount > 0 ? (
          <button
            onClick={() => setShowChecklist(true)}
            style={{
              background: "none",
              border: `1px solid ${C.orange}`,
              borderRadius: 2,
              padding: "3px 11px",
              fontSize: 10,
              fontWeight: 700,
              color: C.orange,
              cursor: "pointer",
              fontFamily: F.body,
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            ⚠ {pendingCount} pending setup item{pendingCount !== 1 ? "s" : ""}
          </button>
        ) : (
          <span
            style={{
              fontSize: 10,
              color: C.accent,
              fontWeight: 600,
              letterSpacing: "0.1em",
              flexShrink: 0,
            }}
          >
            ✓ SETUP COMPLETE
          </span>
        )}
      </div>

      {/* ── Checklist modal ── */}
      {showChecklist && (
        <>
          <div
            onClick={() => setShowChecklist(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 5000,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: C.white,
              borderRadius: 4,
              width: 580,
              maxWidth: "95vw",
              maxHeight: "82vh",
              overflowY: "auto",
              zIndex: 5001,
              padding: 28,
              boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
              fontFamily: F.body,
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 22,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 22,
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    color: C.green,
                    marginBottom: 3,
                  }}
                >
                  🛠 Production Setup Checklist
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {pendingCount} of {PENDING_ITEMS.length} items remaining
                  before going live
                </div>
              </div>
              <button
                onClick={() => setShowChecklist(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  color: C.muted,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PENDING_ITEMS.map((item) => {
                const done = !!completed[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 14px",
                      background: done
                        ? "rgba(82,183,136,0.06)"
                        : SEV_BG[item.severity],
                      border: `1px solid ${done ? "rgba(82,183,136,0.25)" : "rgba(0,0,0,0.07)"}`,
                      borderLeft: done
                        ? "3px solid #52b788"
                        : `3px solid ${SEV_COLOR[item.severity]}`,
                      borderRadius: 2,
                      opacity: done ? 0.65 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleComplete(item.id)}
                      style={{
                        marginTop: 3,
                        cursor: "pointer",
                        accentColor: C.accent,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: done ? C.muted : C.green,
                            textDecoration: done ? "line-through" : "none",
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: C.white,
                            background: done
                              ? C.muted
                              : SEV_COLOR[item.severity],
                            padding: "2px 7px",
                            borderRadius: 2,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          {done ? "done" : item.severity}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          lineHeight: 1.6,
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid #e8e0d4",
                fontSize: 10,
                color: C.muted,
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              Checked items are saved in browser storage. They do not affect
              platform functionality.
            </div>
          </div>
        </>
      )}
    </>
  );
}
