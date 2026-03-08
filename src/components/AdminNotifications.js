// src/components/AdminNotifications.js
// v1.0 — March 2026
// WP9 — Notification Centre
//
// Features:
//   - Notification log (from notification_log table): filter by type/trigger/status
//   - Stats: sent today, failed, by trigger
//   - Test send panel: fire any trigger with custom recipient
//   - Template preview: see SMS/email content per trigger
//   - BulkSMS setup guide with env var instructions
//   - Integration hooks guide (where to add notify.xxx calls)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  white: "#fff",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  orange: "#e67e22",
  lightOrange: "#fef3e0",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  lightGreen: "#eafaf1",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', sans-serif",
};

const inputStyle = {
  padding: "9px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 13,
  fontFamily: F.body,
  background: C.white,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};
const makeBtn = (bg = C.mid, color = C.white, disabled = false) => ({
  padding: "9px 18px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: bg === "transparent" ? `1px solid ${C.border}` : "none",
  borderRadius: 2,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: F.body,
});
const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: "10px",
  fontFamily: F.body,
  fontWeight: 700,
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Trigger config ────────────────────────────────────────────────────────
const TRIGGERS = {
  scan_confirmed: {
    label: "Scan Confirmed",
    icon: "📱",
    to: "Customer",
    color: C.accent,
  },
  tier_upgrade: {
    label: "Tier Upgrade",
    icon: "⭐",
    to: "Customer",
    color: C.gold,
  },
  shipment_dispatched: {
    label: "Shipment Dispatched",
    icon: "🚚",
    to: "Retailer",
    color: C.blue,
  },
  shipment_delivered: {
    label: "Shipment Delivered",
    icon: "✅",
    to: "Retailer",
    color: C.mid,
  },
  low_stock: {
    label: "Low / Out of Stock",
    icon: "⚠",
    to: "Admin",
    color: C.orange,
  },
  churn_risk: { label: "Churn Risk", icon: "📉", to: "Admin", color: C.red },
  new_customer: {
    label: "New Customer",
    icon: "👤",
    to: "Admin",
    color: C.green,
  },
};

// ── SMS preview templates ─────────────────────────────────────────────────
const SMS_PREVIEWS = {
  scan_confirmed:
    "Protea Botanicals: Product verified ✓ You earned 10 pts! Total: 820 pts. Keep scanning to unlock rewards. Reply STOP to opt out.",
  tier_upgrade:
    "Protea Botanicals: Congratulations Steve! You've reached GOLD tier 🎉 Your loyalty is rewarded. Reply STOP to opt out.",
  shipment_dispatched:
    "Protea Botanicals: Shipment SHP-202603-001 dispatched to Cape Town Store. Courier: Dawn Wing. Tracking: DW123456. ETA: 12 Mar 2026.",
  shipment_delivered:
    "Protea Botanicals: Shipment SHP-202603-001 has been delivered to Cape Town Store. Please confirm receipt in your portal.",
  low_stock:
    "Protea Botanicals ALERT: Distillate Syringes is low (3 units remaining). Reorder level: 10. Action required.",
  churn_risk:
    "Protea Botanicals ALERT: Customer John Smith flagged as churn risk. Last active: 02 Jan 2026. Engagement score: 18/100.",
  new_customer:
    "Protea Botanicals: New customer registered — Sarah Connor (+27821234567). Acquisition: qr_scan. Check admin dashboard.",
};

function StatusBadge({ status }) {
  const cfg = {
    sent: { bg: C.lightGreen, color: C.accent },
    failed: { bg: C.lightRed, color: C.red },
    pending: { bg: C.lightOrange, color: C.orange },
  }[status] || { bg: "#f0f0f0", color: "#555" };
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 2,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {status}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 2,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: type === "sms" ? C.lightBlue : C.lightGreen,
        color: type === "sms" ? C.blue : C.accent,
      }}
    >
      {type === "sms" ? "📱 SMS" : "✉ Email"}
    </span>
  );
}

// ── Test Send Form ────────────────────────────────────────────────────────
function TestSendPanel({ onSent }) {
  const [trigger, setTrigger] = useState("scan_confirmed");
  const [type, setType] = useState("sms");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;

  const handleSend = async () => {
    if (!phone && !email) {
      setResult({ ok: false, error: "Enter a phone or email" });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          type,
          trigger,
          recipient: { phone, email, name: "Test User" },
          data: {
            points: 10,
            total_points: 820,
            product: "Distillate",
            batch: "PB-001-2026",
            tier: "gold",
            shipment_number: "SHP-202603-001",
            destination: "Test Store",
            courier: "Dawn Wing",
            tracking: "DW123456",
            eta: "12 Mar 2026",
            item_name: "Distillate Syringes",
            quantity: 3,
            unit: "units",
            reorder_level: 10,
            customer_name: "Test Customer",
            last_active: "01 Mar 2026",
            score: 18,
            name: "Test Customer",
            channel: "qr_scan",
          },
        }),
      });
      const json = await res.json();
      setResult(json);
      if (json.ok) onSent();
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 24,
      }}
    >
      <div style={sLabel}>Test Send</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Trigger
          </div>
          <select
            style={{ ...inputStyle, width: "100%" }}
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
          >
            {Object.entries(TRIGGERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Type
          </div>
          <select
            style={{ ...inputStyle, width: "100%" }}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="sms">SMS only</option>
            <option value="email">Email only</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Phone (e.g. +27821234567)
          </div>
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+27..."
          />
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Email
          </div>
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
          />
        </div>
      </div>

      {/* Preview */}
      <div
        style={{
          padding: 12,
          background: C.cream,
          borderRadius: 2,
          marginBottom: 14,
          fontSize: 12,
          color: C.text,
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            display: "block",
            marginBottom: 4,
          }}
        >
          SMS Preview
        </span>
        {SMS_PREVIEWS[trigger]}
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        style={makeBtn(C.green, C.white, sending)}
      >
        {sending ? "Sending…" : "🚀 Send Test"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 2,
            fontSize: 12,
            background: result.ok ? C.lightGreen : C.lightRed,
            color: result.ok ? C.accent : C.red,
            fontWeight: 600,
          }}
        >
          {result.ok
            ? "✓ Test notification sent successfully"
            : `✗ Failed: ${result.error || JSON.stringify(result)}`}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState("log");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterTrig, setFilterTrig] = useState("all");
  const [filterStat, setFilterStat] = useState("all");
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notification_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sentToday = logs.filter(
    (l) => l.status === "sent" && new Date(l.created_at) >= today,
  ).length;
  const failedTotal = logs.filter((l) => l.status === "failed").length;
  const smsCount = logs.filter((l) => l.type === "sms").length;
  const emailCount = logs.filter((l) => l.type === "email").length;

  // Trigger breakdown
  const trigCounts = {};
  logs.forEach((l) => {
    trigCounts[l.trigger] = (trigCounts[l.trigger] || 0) + 1;
  });

  // ── Filtered logs ──────────────────────────────────────────────────────
  let displayed = [...logs];
  if (filterType !== "all")
    displayed = displayed.filter((l) => l.type === filterType);
  if (filterTrig !== "all")
    displayed = displayed.filter((l) => l.trigger === filterTrig);
  if (filterStat !== "all")
    displayed = displayed.filter((l) => l.status === filterStat);

  const TABS = [
    { id: "log", label: "📋 Notification Log" },
    { id: "templates", label: "📝 Templates" },
    { id: "setup", label: "⚙ Setup & Integration" },
  ];

  return (
    <div style={{ fontFamily: F.body, position: "relative" }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.green,
            color: C.white,
            padding: "12px 24px",
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: F.heading,
              color: C.green,
              fontSize: 24,
              margin: 0,
            }}
          >
            Notifications
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            SMS via BulkSMS · Email framework ready · 6 trigger types
          </div>
        </div>
        <button onClick={fetchLogs} style={makeBtn("transparent", C.muted)}>
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}
      >
        {[
          {
            label: "Total Sent",
            value: logs.filter((l) => l.status === "sent").length,
            color: C.green,
          },
          { label: "Sent Today", value: sentToday, color: C.accent },
          {
            label: "Failed",
            value: failedTotal,
            color: failedTotal > 0 ? C.red : C.accent,
          },
          { label: "SMS", value: smsCount, color: C.blue },
          { label: "Email", value: emailCount, color: C.mid },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${s.color}`,
              borderRadius: 2,
              padding: "14px 18px",
              textAlign: "center",
              flex: 1,
              minWidth: 100,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 28,
                fontWeight: 300,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "none",
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${C.green}`
                  : "2px solid transparent",
              marginBottom: "-1px",
              cursor: "pointer",
              fontFamily: F.body,
              fontSize: 11,
              fontWeight: activeTab === t.id ? 700 : 400,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: activeTab === t.id ? C.green : C.muted,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════ LOG ══════ */}
      {activeTab === "log" && (
        <div>
          {/* Test send */}
          <div style={{ marginBottom: 20 }}>
            <TestSendPanel
              onSent={() => {
                fetchLogs();
                showToast("Test sent — check log");
              }}
            />
          </div>

          {/* Trigger breakdown */}
          {Object.keys(trigCounts).length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {Object.entries(trigCounts).map(([k, v]) => {
                const t = TRIGGERS[k];
                return (
                  <div
                    key={k}
                    style={{
                      padding: "8px 14px",
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${t?.color || C.muted}`,
                      borderRadius: 2,
                    }}
                  >
                    <span style={{ fontSize: 11, color: C.muted }}>
                      {t?.icon} {t?.label || k}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: t?.color || C.text,
                        marginLeft: 8,
                      }}
                    >
                      {v}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              style={{ ...inputStyle, width: "auto" }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <select
              style={{ ...inputStyle, width: "auto" }}
              value={filterTrig}
              onChange={(e) => setFilterTrig(e.target.value)}
            >
              <option value="all">All Triggers</option>
              {Object.entries(TRIGGERS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </select>
            <select
              style={{ ...inputStyle, width: "auto" }}
              value={filterStat}
              onChange={(e) => setFilterStat(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
              {displayed.length} records
            </span>
          </div>

          {/* Log table */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
              Loading…
            </div>
          ) : displayed.length === 0 ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                border: `1px dashed ${C.border}`,
                borderRadius: 2,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
              <div
                style={{
                  fontFamily: F.heading,
                  fontSize: 20,
                  color: C.green,
                  marginBottom: 8,
                }}
              >
                No notifications yet
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>
                Use the test send panel above or notifications will appear here
                as they fire from the system.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ background: C.green }}>
                    {[
                      "Date",
                      "Type",
                      "Trigger",
                      "Recipient",
                      "Message",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontSize: 9,
                          color: C.white,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((l, i) => (
                    <tr
                      key={l.id}
                      style={{
                        background: i % 2 === 0 ? C.white : C.cream,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          color: C.muted,
                          whiteSpace: "nowrap",
                          fontSize: 11,
                        }}
                      >
                        {fmtDate(l.created_at)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <TypeBadge type={l.type} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11 }}>
                          {TRIGGERS[l.trigger]?.icon}{" "}
                          {TRIGGERS[l.trigger]?.label || l.trigger}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: C.muted,
                          fontSize: 11,
                        }}
                      >
                        {l.recipient || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: C.muted,
                          fontSize: 11,
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {l.message || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <StatusBadge status={l.status} />
                        {l.error && (
                          <div
                            style={{ fontSize: 10, color: C.red, marginTop: 2 }}
                          >
                            {l.error.slice(0, 40)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════ TEMPLATES ══════ */}
      {activeTab === "templates" && (
        <div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
            SMS templates are defined in the Edge Function. Edit{" "}
            <code style={{ background: C.cream, padding: "1px 4px" }}>
              supabase/functions/send-notification/index.ts
            </code>{" "}
            → <code>buildSMS()</code> to customise.
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {Object.entries(TRIGGERS).map(([key, t]) => (
              <div
                key={key}
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${t.color}`,
                  borderRadius: 2,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      Recipient: {t.to} · Key: <code>{key}</code>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: C.cream,
                    borderRadius: 2,
                    fontSize: 12,
                    color: C.text,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  {SMS_PREVIEWS[key]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ SETUP ══════ */}
      {activeTab === "setup" && (
        <div>
          {/* Step 1 — SQL */}
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <div style={sLabel}>Step 1 — Run SQL (once)</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
              Create the notification_log table in Supabase SQL editor:
            </div>
            <pre
              style={{
                background: "#1e1e2e",
                color: "#cdd6f4",
                padding: 16,
                borderRadius: 2,
                fontSize: 12,
                overflowX: "auto",
                lineHeight: 1.6,
              }}
            >{`CREATE TABLE notification_log (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type         text NOT NULL,
  trigger      text NOT NULL,
  recipient    text,
  message      text,
  status       text DEFAULT 'pending',
  error        text,
  metadata     jsonb,
  tenant_id    uuid REFERENCES tenants(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON notification_log
  USING (auth.jwt() ->> 'role' IN ('admin','hq'));`}</pre>
          </div>

          {/* Step 2 — Deploy Edge Function */}
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <div style={sLabel}>Step 2 — Deploy Edge Function</div>
            <pre
              style={{
                background: "#1e1e2e",
                color: "#cdd6f4",
                padding: 16,
                borderRadius: 2,
                fontSize: 12,
                overflowX: "auto",
              }}
            >{`# Copy index.ts to supabase/functions/send-notification/index.ts
# Then deploy:
supabase functions deploy send-notification --no-verify-jwt`}</pre>
          </div>

          {/* Step 3 — Secrets */}
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <div style={sLabel}>
              Step 3 — Add Secrets (Supabase Dashboard → Edge Functions →
              Secrets)
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {["Secret Name", "Value", "Notes"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        fontSize: 10,
                        color: C.muted,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "BULKSMS_API_KEY",
                    "username:password",
                    "Your BulkSMS username + password separated by colon",
                  ],
                  [
                    "EMAIL_API_KEY",
                    "(your email key)",
                    "Leave blank until provider chosen — email stubs succeed",
                  ],
                ].map(([name, val, note]) => (
                  <tr key={name}>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <code
                        style={{
                          background: C.cream,
                          padding: "2px 6px",
                          borderRadius: 2,
                        }}
                      >
                        {name}
                      </code>
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                        color: C.muted,
                        fontStyle: "italic",
                      }}
                    >
                      {val}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: 12,
                        color: C.muted,
                      }}
                    >
                      {note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Step 4 — .env */}
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <div style={sLabel}>Step 4 — Add to .env</div>
            <pre
              style={{
                background: "#1e1e2e",
                color: "#cdd6f4",
                padding: 16,
                borderRadius: 2,
                fontSize: 12,
              }}
            >{`REACT_APP_ADMIN_PHONE=+2782xxxxxxx
REACT_APP_ADMIN_EMAIL=admin@proteabotanicals.co.za`}</pre>
          </div>

          {/* Step 5 — Integration hooks */}
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <div style={sLabel}>Step 5 — Wire Triggers into Existing Code</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
              Add{" "}
              <code style={{ background: C.cream, padding: "1px 4px" }}>
                import {"{ notify }"} from "../services/notificationService"
              </code>{" "}
              then call:
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                {
                  file: "src/services/scanService.js",
                  where: "After points awarded (claim success block)",
                  code: `await notify.scanConfirmed(\n  { phone: userProfile.phone, name: userProfile.full_name },\n  { points: pointsAwarded, total_points: newTotal, product: productName, batch: batchNumber }\n);`,
                },
                {
                  file: "src/services/scanService.js",
                  where: "After tier upgrade detected",
                  code: `await notify.tierUpgrade(\n  { phone: userProfile.phone, name: userProfile.full_name },\n  { tier: newTier, points: totalPoints }\n);`,
                },
                {
                  file: "src/components/AdminShipments.js",
                  where: "After status updated to 'shipped'",
                  code: `await notify.shipmentDispatched(\n  { phone: retailerPhone, email: retailerEmail, name: shipment.destination_name },\n  { shipment_number: shipment.shipment_number, destination: shipment.destination_name,\n    courier: shipment.courier, tracking: shipment.tracking_number, eta: shipment.estimated_arrival }\n);`,
                },
                {
                  file: "src/components/StockControl.js",
                  where: "After stock movement that drops below reorder_level",
                  code: `await notify.lowStock(\n  { item_name: item.name, quantity: newQty, unit: item.unit, reorder_level: item.reorder_level }\n);`,
                },
              ].map((h) => (
                <div
                  key={h.file}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 14px",
                      background: C.cream,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, fontWeight: 700, color: C.green }}
                    >
                      {h.file}
                    </span>
                    <span
                      style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}
                    >
                      — {h.where}
                    </span>
                  </div>
                  <pre
                    style={{
                      background: "#1e1e2e",
                      color: "#cdd6f4",
                      padding: 14,
                      fontSize: 11,
                      margin: 0,
                      overflowX: "auto",
                      lineHeight: 1.6,
                    }}
                  >
                    {h.code}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
