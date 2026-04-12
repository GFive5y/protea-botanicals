// src/components/AdminNotifications.js v1.2
// WP-GUIDE: WorkflowGuide + usePageContext added
// WP-VISUAL: T tokens, Inter font, flush stat grid, underline tabs, no Cormorant/Jost
// v1.0 — March 2026 · WP9 — Notification Centre

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "./WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import { T } from "../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.surface,
  border: T.border,
  muted: T.ink500,
  text: T.ink700,
  white: "#fff",
  red: T.danger,
  lightRed: T.dangerLight,
  orange: T.warning,
  lightOrange: T.warningLight,
  blue: T.info,
  lightBlue: T.infoLight,
  lightGreen: T.accentLight,
};
const F = { heading: T.font, body: T.font };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const inputStyle = {
  padding: "8px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  background: "#fff",
  color: T.ink700,
  outline: "none",
  boxSizing: "border-box",
};
const makeBtn = (bg = T.accentMid, color = "#fff", disabled = false) => ({
  padding: "9px 18px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: bg === "transparent" ? `1px solid ${T.border}` : "none",
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: T.font,
  opacity: disabled ? 0.6 : 1,
  transition: "opacity 0.15s",
});
const fldLabel = (text) => (
  <div
    style={{
      fontSize: 11,
      color: T.ink500,
      marginBottom: 5,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontFamily: T.font,
      fontWeight: 600,
    }}
  >
    {text}
  </div>
);

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── TRIGGER CONFIG ───────────────────────────────────────────────────────────
const TRIGGERS = {
  scan_confirmed: {
    label: "Scan Confirmed",
    icon: "📱",
    to: "Customer",
    color: T.accentMid,
  },
  tier_upgrade: {
    label: "Tier Upgrade",
    icon: "⭐",
    to: "Customer",
    color: "#b5935a",
  },
  shipment_dispatched: {
    label: "Shipment Dispatched",
    icon: "🚚",
    to: "Retailer",
    color: T.info,
  },
  shipment_delivered: {
    label: "Shipment Delivered",
    icon: "✅",
    to: "Retailer",
    color: T.success,
  },
  low_stock: {
    label: "Low / Out of Stock",
    icon: "⚠",
    to: "Admin",
    color: T.warning,
  },
  churn_risk: { label: "Churn Risk", icon: "📉", to: "Admin", color: T.danger },
  new_customer: {
    label: "New Customer",
    icon: "👤",
    to: "Admin",
    color: T.accent,
  },
};

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

// ─── BADGES ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    sent: { bg: T.successLight, color: T.success },
    failed: { bg: T.dangerLight, color: T.danger },
    pending: { bg: T.warningLight, color: T.warning },
  }[status] || { bg: T.bg, color: T.ink500 };
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 20,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        background: cfg.bg,
        color: cfg.color,
        fontFamily: T.font,
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
        borderRadius: 20,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        background: type === "sms" ? T.infoLight : T.accentLight,
        color: type === "sms" ? T.info : T.accentMid,
        fontFamily: T.font,
      }}
    >
      {type === "sms" ? "SMS" : "Email"}
    </span>
  );
}

// ─── CODE BLOCK ───────────────────────────────────────────────────────────────
function CodeBlock({ children }) {
  return (
    <pre
      style={{
        background: "#1e1e2e",
        color: "#cdd6f4",
        padding: 16,
        borderRadius: 6,
        fontSize: 12,
        overflowX: "auto",
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {children}
    </pre>
  );
}

// ─── TEST SEND PANEL ──────────────────────────────────────────────────────────
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
        background: "#fff",
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 24,
        boxShadow: T.shadow.sm,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.ink500,
          marginBottom: 16,
          fontFamily: T.font,
        }}
      >
        Test Send
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          {fldLabel("Trigger")}
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
          {fldLabel("Type")}
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
          {fldLabel("Phone (e.g. +27821234567)")}
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+27..."
          />
        </div>
        <div>
          {fldLabel("Email")}
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
          />
        </div>
      </div>

      {/* SMS preview */}
      <div
        style={{
          padding: 12,
          background: T.bg,
          borderRadius: 6,
          marginBottom: 14,
          fontSize: 12,
          color: T.ink700,
          lineHeight: 1.6,
          fontStyle: "italic",
          fontFamily: T.font,
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: T.ink500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            display: "block",
            marginBottom: 4,
            fontStyle: "normal",
          }}
        >
          SMS Preview
        </span>
        {SMS_PREVIEWS[trigger]}
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        style={makeBtn(T.accent, "#fff", sending)}
      >
        {sending ? "Sending…" : "Send Test"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 12,
            background: result.ok ? T.successLight : T.dangerLight,
            color: result.ok ? T.success : T.danger,
            fontWeight: 600,
            fontFamily: T.font,
          }}
        >
          {result.ok
            ? "Test notification sent successfully"
            : `Failed: ${result.error || JSON.stringify(result)}`}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminNotifications() {
  const ctx = usePageContext("notifications", null);
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

  // GAP-02: write a system_alert (non-blocking, fire-and-forget)
  const writeAlert = useCallback(async (alertType, severity, title, body) => {
    try {
      await supabase.from("system_alerts").insert({
        tenant_id: "43b34c33-6864-4f02-98dd-df1d340475c3",
        alert_type: alertType,
        severity,
        status: "open",
        title,
        body: body || null,
        source_table: "notification_log",
      });
    } catch (_) {}
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notification_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const fetched = data || [];
    setLogs(fetched);

    // GAP-02: alert on recent delivery failures (last 24h)
    const since = new Date(Date.now() - 86400000).toISOString();
    const recentFailed = fetched.filter(
      (l) => l.status === "failed" && l.created_at >= since,
    );
    if (recentFailed.length > 0) {
      writeAlert(
        "delivery_failure",
        "warning",
        `${recentFailed.length} notification${recentFailed.length > 1 ? "s" : ""} failed in last 24h`,
        recentFailed
          .slice(0, 5)
          .map(
            (l) =>
              `${l.type?.toUpperCase()} · ${TRIGGERS[l.trigger]?.label || l.trigger} → ${l.recipient || "unknown"}`,
          )
          .join(" · "),
      );
    }
    setLoading(false);
  }, [writeAlert]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sentTotal = logs.filter((l) => l.status === "sent").length;
  const sentToday = logs.filter(
    (l) => l.status === "sent" && new Date(l.created_at) >= today,
  ).length;
  const failedTotal = logs.filter((l) => l.status === "failed").length;
  const smsCount = logs.filter((l) => l.type === "sms").length;
  const emailCount = logs.filter((l) => l.type === "email").length;
  const trigCounts = {};
  logs.forEach((l) => {
    trigCounts[l.trigger] = (trigCounts[l.trigger] || 0) + 1;
  });

  // ── Filtered ───────────────────────────────────────────────────────────────
  let displayed = [...logs];
  if (filterType !== "all")
    displayed = displayed.filter((l) => l.type === filterType);
  if (filterTrig !== "all")
    displayed = displayed.filter((l) => l.trigger === filterTrig);
  if (filterStat !== "all")
    displayed = displayed.filter((l) => l.status === filterStat);

  const TABS = [
    { id: "log", label: "Notification Log" },
    { id: "templates", label: "Templates" },
    { id: "setup", label: "Setup & Integration" },
  ];

  // ── Setup step wrapper ─────────────────────────────────────────────────────
  const SetupStep = ({ n, title, children }) => (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 24,
        marginBottom: 16,
        boxShadow: T.shadow.sm,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: T.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {n}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: T.ink500,
            fontFamily: T.font,
          }}
        >
          {title}
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ fontFamily: T.font, position: "relative" }}>
      <WorkflowGuide
        context={ctx}
        tabId="notifications"
        onAction={() => {}}
        defaultOpen={false}
      />
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: T.accent,
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
            fontFamily: T.font,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
              fontFamily: T.font,
              fontSize: 22,
              fontWeight: 600,
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            Notifications
          </h2>
          <div style={{ fontSize: 13, color: T.ink500 }}>
            SMS via BulkSMS · Email framework ready · 6 trigger types
          </div>
        </div>
        <button
          onClick={fetchLogs}
          style={{
            ...makeBtn("transparent", T.ink500),
            border: `1px solid ${T.border}`,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── FLUSH STAT GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
          gap: "1px",
          background: T.border,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow.sm,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total Sent", value: sentTotal, color: T.accent },
          { label: "Sent Today", value: sentToday, color: T.accentMid },
          {
            label: "Failed",
            value: failedTotal,
            color: failedTotal > 0 ? T.danger : T.success,
          },
          { label: "SMS", value: smsCount, color: T.info },
          { label: "Email", value: emailCount, color: "#b5935a" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              padding: "14px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.ink500,
                marginBottom: 6,
                fontFamily: T.font,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 22,
                fontWeight: 400,
                color: s.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── UNDERLINE TABS ── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `2px solid ${T.border}`,
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
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
              fontFamily: T.font,
              fontSize: 11,
              fontWeight: activeTab === t.id ? 700 : 400,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: activeTab === t.id ? T.accent : T.ink500,
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

          {/* Trigger breakdown pills */}
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
                      background: "#fff",
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${t?.color || T.ink500}`,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: T.shadow.sm,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: T.ink500,
                        fontFamily: T.font,
                      }}
                    >
                      {t?.icon} {t?.label || k}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: t?.color || T.ink700,
                        fontFamily: T.font,
                        fontVariantNumeric: "tabular-nums",
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
            <span
              style={{
                fontSize: 12,
                color: T.ink500,
                marginLeft: "auto",
                fontFamily: T.font,
              }}
            >
              {displayed.length} records
            </span>
          </div>

          {/* Log table */}
          {loading ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: T.ink500,
                fontFamily: T.font,
              }}
            >
              Loading…
            </div>
          ) : displayed.length === 0 ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                border: `1px dashed ${T.border}`,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: T.accent,
                  marginBottom: 8,
                  fontFamily: T.font,
                }}
              >
                No notifications yet
              </div>
              <div
                style={{ fontSize: 13, color: T.ink500, fontFamily: T.font }}
              >
                Use the test send panel above or notifications will appear here
                as they fire from the system.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: T.shadow.sm,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  fontFamily: T.font,
                }}
              >
                <thead>
                  <tr style={{ background: T.accent }}>
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
                          color: "#fff",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontFamily: T.font,
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
                        background: i % 2 === 0 ? "#fff" : T.surface,
                        borderBottom: `1px solid ${T.bg}`,
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          color: T.ink500,
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
                        <span
                          style={{
                            fontSize: 11,
                            color: T.ink700,
                            fontFamily: T.font,
                          }}
                        >
                          {TRIGGERS[l.trigger]?.icon}{" "}
                          {TRIGGERS[l.trigger]?.label || l.trigger}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: T.ink500,
                          fontSize: 11,
                        }}
                      >
                        {l.recipient || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: T.ink500,
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
                            style={{
                              fontSize: 10,
                              color: T.danger,
                              marginTop: 2,
                              fontFamily: T.font,
                            }}
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
          <div
            style={{
              fontSize: 13,
              color: T.ink500,
              marginBottom: 20,
              fontFamily: T.font,
            }}
          >
            SMS templates are defined in the Edge Function. Edit{" "}
            <code
              style={{
                background: T.bg,
                padding: "1px 4px",
                borderRadius: 3,
              }}
            >
              supabase/functions/send-notification/index.ts
            </code>{" "}
            → <code>buildSMS()</code> to customise.
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {Object.entries(TRIGGERS).map(([key, t]) => (
              <div
                key={key}
                style={{
                  background: "#fff",
                  border: `1px solid ${T.border}`,
                  borderLeft: `4px solid ${t.color}`,
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: T.shadow.sm,
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
                    <div
                      style={{
                        fontWeight: 700,
                        color: T.ink900,
                        fontFamily: T.font,
                      }}
                    >
                      {t.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.ink500,
                        fontFamily: T.font,
                      }}
                    >
                      Recipient: {t.to} · Key:{" "}
                      <code
                        style={{
                          background: T.bg,
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        {key}
                      </code>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: T.bg,
                    borderRadius: 6,
                    fontSize: 12,
                    color: T.ink700,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                    fontFamily: T.font,
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
          {/* Step 1 */}
          <SetupStep n="1" title="Run SQL (once)">
            <div
              style={{
                fontSize: 13,
                color: T.ink500,
                marginBottom: 12,
                fontFamily: T.font,
              }}
            >
              Create the notification_log table in Supabase SQL editor:
            </div>
            <CodeBlock>{`CREATE TABLE notification_log (
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
  USING (auth.jwt() ->> 'role' IN ('admin','hq'));`}</CodeBlock>
          </SetupStep>

          {/* Step 2 */}
          <SetupStep n="2" title="Deploy Edge Function">
            <CodeBlock>{`# Copy index.ts to supabase/functions/send-notification/index.ts
# Then deploy:
supabase functions deploy send-notification --no-verify-jwt`}</CodeBlock>
          </SetupStep>

          {/* Step 3 */}
          <SetupStep
            n="3"
            title="Add Secrets (Supabase Dashboard → Edge Functions → Secrets)"
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                fontFamily: T.font,
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
                        color: T.ink500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        borderBottom: `1px solid ${T.border}`,
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
                        padding: 10,
                        borderBottom: `1px solid ${T.bg}`,
                      }}
                    >
                      <code
                        style={{
                          background: T.bg,
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 12,
                        }}
                      >
                        {name}
                      </code>
                    </td>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: `1px solid ${T.bg}`,
                        color: T.ink500,
                        fontStyle: "italic",
                        fontSize: 12,
                      }}
                    >
                      {val}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: `1px solid ${T.bg}`,
                        fontSize: 12,
                        color: T.ink500,
                      }}
                    >
                      {note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SetupStep>

          {/* Step 4 */}
          <SetupStep n="4" title="Add to .env">
            <CodeBlock>{`REACT_APP_ADMIN_PHONE=+2782xxxxxxx
REACT_APP_ADMIN_EMAIL=admin@proteabotanicals.co.za`}</CodeBlock>
          </SetupStep>

          {/* Step 5 */}
          <SetupStep n="5" title="Wire Triggers into Existing Code">
            <div
              style={{
                fontSize: 13,
                color: T.ink500,
                marginBottom: 12,
                fontFamily: T.font,
              }}
            >
              Add{" "}
              <code
                style={{
                  background: T.bg,
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
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
                  where: "After stock movement drops below reorder_level",
                  code: `await notify.lowStock(\n  { item_name: item.name, quantity: newQty, unit: item.unit, reorder_level: item.reorder_level }\n);`,
                },
              ].map((h) => (
                <div
                  key={h.file}
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 14px",
                      background: T.bg,
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.accent,
                        fontFamily: T.font,
                      }}
                    >
                      {h.file}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.ink500,
                        marginLeft: 8,
                        fontFamily: T.font,
                      }}
                    >
                      — {h.where}
                    </span>
                  </div>
                  <CodeBlock>{h.code}</CodeBlock>
                </div>
              ))}
            </div>
          </SetupStep>
        </div>
      )}
    </div>
  );
}
