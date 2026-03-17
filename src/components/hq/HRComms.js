// HRComms.js v1.0
// Protea Botanicals · HR Module · Staff Communications
// WP-HR-7 · March 2026
// src/components/hq/HRComms.js
//
// Sub-tabs: Inbox | Compose | Broadcast
// Features: Thread view · Read/unread · Acknowledgement tracking · Priority flags
// Columns: exact match to live staff_messages schema

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

const C = {
  green: "#3d6b35",
  greenLight: "#e8f5e9",
  greenMid: "#2e7d32",
  amber: "#f57f17",
  amberLight: "#fff8e1",
  red: "#c62828",
  redLight: "#fdecea",
  blue: "#1565c0",
  blueLight: "#e3f2fd",
  purple: "#6a1b9a",
  purpleLight: "#f3e5f5",
  border: "#ece8e2",
  bg: "#faf8f5",
  white: "#fff",
  text: "#2d2d2d",
  muted: "#aaa",
};

const PRIORITY_CFG = {
  normal: { label: "Normal", color: C.muted, bg: "#f5f5f5" },
  high: { label: "High", color: C.amber, bg: C.amberLight },
  urgent: { label: "Urgent", color: C.red, bg: C.redLight },
};

const MESSAGE_TYPES = [
  "general",
  "formal_notice",
  "policy_update",
  "warning_notice",
  "hearing_notice",
  "acknowledgement_request",
  "announcement",
];

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const now = new Date();
  const diffMs = now - dt;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return dt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.normal;
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: 9,
        fontWeight: 700,
        padding: "1px 7px",
        borderRadius: 20,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {cfg.label}
    </span>
  );
}

const s = {
  subTabs: {
    display: "flex",
    borderBottom: `2px solid ${C.border}`,
    marginBottom: 24,
  },
  subTab: (a) => ({
    padding: "9px 18px",
    cursor: "pointer",
    border: "none",
    background: "none",
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    color: a ? C.green : "#555",
    borderBottom: a ? `2px solid ${C.green}` : "2px solid transparent",
    fontWeight: a ? 700 : 400,
    marginBottom: -2,
  }),
  btn: (bg, color = C.white) => ({
    padding: "7px 16px",
    background: bg,
    color,
    border: `1px solid ${bg}`,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
  }),
  outBtn: (color) => ({
    padding: "7px 14px",
    background: "none",
    color,
    border: `1px solid ${color}`,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
  }),
  select: {
    padding: "8px 12px",
    border: `1px solid #ddd`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    background: C.white,
    cursor: "pointer",
    outline: "none",
    width: "100%",
  },
  input: {
    padding: "8px 12px",
    border: `1px solid #ddd`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    background: C.white,
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  },
  textarea: {
    padding: "8px 12px",
    border: `1px solid #ddd`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    background: C.white,
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
    resize: "vertical",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
  },
  toast: (t) => ({
    padding: "10px 16px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
    background: t === "success" ? C.greenLight : C.redLight,
    color: t === "success" ? C.greenMid : C.red,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  }),
  error: {
    padding: "12px 16px",
    background: C.redLight,
    color: C.red,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
  },
  statCard: {
    padding: "10px 16px",
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    display: "flex",
    gap: 8,
    alignItems: "center",
    flex: "1 1 120px",
  },
  statNum: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
  },
  statLbl: {
    fontSize: 11,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  msgRow: (unread) => ({
    padding: "14px 16px",
    borderBottom: `1px solid ${C.border}`,
    cursor: "pointer",
    background: unread ? "#fdfcfa" : C.white,
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    transition: "background 0.1s",
  }),
  msgPanel: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  threadMsg: (mine) => ({
    marginBottom: 12,
    display: "flex",
    justifyContent: mine ? "flex-end" : "flex-start",
  }),
  bubble: (mine) => ({
    maxWidth: "75%",
    padding: "10px 14px",
    borderRadius: mine ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
    background: mine ? C.green : C.bg,
    color: mine ? C.white : C.text,
    fontSize: 13,
    lineHeight: 1.5,
  }),
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 16,
  },
  field: { marginBottom: 16 },
  section: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 16,
    fontWeight: 600,
    color: C.text,
    margin: "20px 0 12px 0",
    paddingBottom: 8,
    borderBottom: `1px solid ${C.border}`,
  },
};

// ─── Toast with dismiss button ────────────────────────────────────────────────
function ToastMsg({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div style={s.toast(toast.type)}>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.msg}</span>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          color: "inherit",
          opacity: 0.6,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── INBOX ─────────────────────────────────────────────────────────────────────
function Inbox({ tenantId, staffList, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all"); // all | unread | pending_ack

  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("staff_messages")
        .select(
          "id, thread_id, sender_id, recipient_id, recipient_group, subject, body, priority, message_type, sent_at, read_at, requires_acknowledgement, acknowledged_at, created_at",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (filter === "unread") q = q.is("read_at", null);
      if (filter === "pending_ack")
        q = q.eq("requires_acknowledgement", true).is("acknowledged_at", null);

      const { data, error: err } = await q;
      if (err) throw err;
      // Show only root messages (no thread_id or is the root)
      const roots = (data || []).filter(
        (m) => !m.thread_id || m.thread_id === m.id,
      );
      setMessages(roots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openMessage = async (msg) => {
    setSelected(msg);
    setThreadLoading(true);
    // Mark as read
    if (!msg.read_at) {
      await supabase
        .from("staff_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", msg.id);
      load();
    }
    // Load thread
    const threadId = msg.thread_id || msg.id;
    const { data } = await supabase
      .from("staff_messages")
      .select("id, sender_id, body, sent_at, created_at")
      .eq("tenant_id", tenantId)
      .or(`id.eq.${msg.id},thread_id.eq.${threadId}`)
      .order("created_at", { ascending: true });
    setThread(data || []);
    setThreadLoading(false);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const threadId = selected.thread_id || selected.id;
      const { error: err } = await supabase.from("staff_messages").insert([
        {
          tenant_id: tenantId,
          thread_id: threadId,
          sender_id: currentUserId,
          recipient_id: selected.sender_id,
          subject: `Re: ${selected.subject || ""}`,
          body: reply.trim(),
          priority: "normal",
          message_type: "general",
          sent_at: new Date().toISOString(),
        },
      ]);
      if (err) throw err;
      setReply("");
      openMessage(selected);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSending(false);
    }
  };

  const acknowledge = async (msg) => {
    await supabase
      .from("staff_messages")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", msg.id);
    setSelected((p) => ({ ...p, acknowledged_at: new Date().toISOString() }));
    load();
  };

  const staffName = (id) => {
    const s = staffList.find((x) => x.id === id);
    return s ? s.preferred_name || s.full_name : "HR / Admin";
  };

  const unreadCount = messages.filter((m) => !m.read_at).length;
  const pendingAckCount = messages.filter(
    (m) => m.requires_acknowledgement && !m.acknowledged_at,
  ).length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: selected ? "1fr 1.4fr" : "1fr",
        gap: 16,
        minHeight: 400,
      }}
    >
      {/* Message list */}
      <div>
        {/* Stats + filter */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "all", label: "All" },
              {
                key: "unread",
                label: `Unread ${unreadCount > 0 ? `(${unreadCount})` : ""}`,
              },
              {
                key: "pending_ack",
                label: `Needs Ack ${pendingAckCount > 0 ? `(${pendingAckCount})` : ""}`,
              },
            ].map((f) => (
              <button
                key={f.key}
                style={{
                  ...s.outBtn(filter === f.key ? C.green : "#ddd"),
                  padding: "5px 12px",
                  fontSize: 11,
                  color: filter === f.key ? C.green : C.muted,
                }}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            style={{
              ...s.outBtn("#ddd"),
              padding: "5px 12px",
              fontSize: 11,
              color: C.muted,
              marginLeft: "auto",
            }}
            onClick={load}
          >
            ↻
          </button>
        </div>

        {toast && <ToastMsg toast={toast} onDismiss={() => setToast(null)} />}
        {error && <div style={s.error}>⚠ {error}</div>}

        <div style={s.msgPanel}>
          {loading ? (
            <div
              style={{ padding: "40px", textAlign: "center", color: C.muted }}
            >
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: C.muted,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 16,
                }}
              >
                No messages
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const unread = !msg.read_at;
              const needsAck =
                msg.requires_acknowledgement && !msg.acknowledged_at;
              const isSelected = selected?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  style={{
                    ...s.msgRow(unread),
                    background: isSelected
                      ? "#f0f7ee"
                      : unread
                        ? "#fdfcfa"
                        : C.white,
                  }}
                  onClick={() => openMessage(msg)}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = "#f9f7f4";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = unread
                        ? "#fdfcfa"
                        : C.white;
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: unread ? C.green : "transparent",
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: unread ? 700 : 500,
                          fontSize: 13,
                          color: C.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {staffName(msg.sender_id)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: C.muted,
                          whiteSpace: "nowrap",
                          marginLeft: 8,
                        }}
                      >
                        {fmtDate(msg.created_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: unread ? 600 : 400,
                        color: C.text,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {msg.subject || "(no subject)"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {msg.body?.slice(0, 80) || ""}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 5,
                        flexWrap: "wrap",
                      }}
                    >
                      {msg.priority && msg.priority !== "normal" && (
                        <PriorityBadge priority={msg.priority} />
                      )}
                      {needsAck && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: C.amber,
                            background: C.amberLight,
                            padding: "1px 6px",
                            borderRadius: 20,
                            textTransform: "uppercase",
                          }}
                        >
                          Needs Ack
                        </span>
                      )}
                      {msg.message_type && msg.message_type !== "general" && (
                        <span
                          style={{
                            fontSize: 9,
                            color: C.muted,
                            textTransform: "capitalize",
                          }}
                        >
                          {msg.message_type.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Thread panel */}
      {selected && (
        <div
          style={{
            ...s.msgPanel,
            display: "flex",
            flexDirection: "column",
            maxHeight: 600,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${C.border}`,
              background: C.bg,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: C.text,
                    marginBottom: 3,
                  }}
                >
                  {selected.subject || "(no subject)"}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  From: {staffName(selected.sender_id)} ·{" "}
                  {fmtDate(selected.created_at)}
                </div>
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 16,
                  cursor: "pointer",
                  color: C.muted,
                }}
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            {selected.requires_acknowledgement && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {selected.acknowledged_at ? (
                  <span
                    style={{ fontSize: 11, color: C.greenMid, fontWeight: 600 }}
                  >
                    ✓ Acknowledged {fmtDate(selected.acknowledged_at)}
                  </span>
                ) : (
                  <button
                    style={{
                      ...s.btn(C.amber),
                      padding: "4px 12px",
                      fontSize: 11,
                    }}
                    onClick={() => acknowledge(selected)}
                  >
                    ✓ Mark Acknowledged
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Thread messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
            {threadLoading ? (
              <div style={{ textAlign: "center", color: C.muted, padding: 20 }}>
                Loading thread…
              </div>
            ) : (
              thread.map((msg) => {
                const mine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} style={s.threadMsg(mine)}>
                    <div>
                      {!mine && (
                        <div
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            marginBottom: 3,
                            marginLeft: 4,
                          }}
                        >
                          {staffName(msg.sender_id)}
                        </div>
                      )}
                      <div style={s.bubble(mine)}>{msg.body}</div>
                      <div
                        style={{
                          fontSize: 9,
                          color: C.muted,
                          marginTop: 3,
                          textAlign: mine ? "right" : "left",
                          marginLeft: mine ? 0 : 4,
                        }}
                      >
                        {fmtDate(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply box */}
          <div
            style={{
              padding: "12px 18px",
              borderTop: `1px solid ${C.border}`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                style={{ ...s.textarea, height: 60, flex: 1, resize: "none" }}
                placeholder="Type a reply…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                    sendReply();
                }}
              />
              <button
                style={{
                  ...s.btn(C.green),
                  alignSelf: "flex-end",
                  padding: "8px 16px",
                }}
                onClick={sendReply}
                disabled={sending || !reply.trim()}
              >
                {sending ? "…" : "↑ Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPOSE ───────────────────────────────────────────────────────────────────
function Compose({ tenantId, staffList, currentUserId, onSent }) {
  const [form, setForm] = useState({
    recipient_id: "",
    subject: "",
    body: "",
    priority: "normal",
    message_type: "general",
    requires_acknowledgement: false,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const f = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const send = async () => {
    if (!form.recipient_id || !form.body.trim()) {
      setToast({
        type: "error",
        msg: "Recipient and message body are required.",
      });
      return;
    }
    const recipStaff = staffList.find((s) => s.id === form.recipient_id);
    if (!recipStaff?.user_id) {
      setToast({
        type: "error",
        msg: `${recipStaff?.full_name || "This staff member"} does not have an app account linked. Add their email in Staff → Edit → Employment tab first.`,
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("staff_messages").insert([
        {
          tenant_id: tenantId,
          sender_id: currentUserId,
          recipient_id:
            staffList.find((s) => s.id === form.recipient_id)?.user_id ||
            form.recipient_id,
          subject: form.subject.trim() || null,
          body: form.body.trim(),
          priority: form.priority,
          message_type: form.message_type,
          requires_acknowledgement: !!form.requires_acknowledgement,
          sent_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      setToast({ type: "success", msg: "Message sent." });
      setForm({
        recipient_id: "",
        subject: "",
        body: "",
        priority: "normal",
        message_type: "general",
        requires_acknowledgement: false,
      });
      setTimeout(() => onSent && onSent(), 1000);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 18,
          fontWeight: 600,
          color: C.text,
          marginBottom: 20,
        }}
      >
        New Message
      </p>
      {toast && <ToastMsg toast={toast} onDismiss={() => setToast(null)} />}

      <div
        style={{
          padding: "10px 14px",
          background: "#e3f2fd",
          border: "1px solid #90caf9",
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 12,
          color: "#1565c0",
        }}
      >
        📧 <strong>Email delivery note:</strong> Messages go to staff HR portal
        inbox. For real-time alerts (email/WhatsApp), link an email service or
        Twilio HR number in Settings.
      </div>
      <div style={s.field}>
        <label style={s.label}>To *</label>
        <select
          style={s.select}
          value={form.recipient_id}
          onChange={f("recipient_id")}
        >
          <option value="">Select staff member…</option>
          {staffList.map((st) => (
            <option key={st.id} value={st.id}>
              {st.preferred_name || st.full_name}{" "}
              {st.job_title ? `— ${st.job_title}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div style={s.grid2}>
        <div>
          <label style={s.label}>Message Type</label>
          <select
            style={s.select}
            value={form.message_type}
            onChange={f("message_type")}
          >
            {MESSAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={s.label}>Priority</label>
          <select
            style={s.select}
            value={form.priority}
            onChange={f("priority")}
          >
            {Object.entries(PRIORITY_CFG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Subject</label>
        <input
          style={s.input}
          value={form.subject}
          onChange={f("subject")}
          placeholder="Message subject (optional)"
        />
      </div>

      <div style={s.field}>
        <label style={s.label}>Message *</label>
        <textarea
          style={{ ...s.textarea, height: 160 }}
          value={form.body}
          onChange={f("body")}
          placeholder="Write your message here…"
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={!!form.requires_acknowledgement}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                requires_acknowledgement: e.target.checked,
              }))
            }
          />
          Require acknowledgement from recipient
        </label>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={s.btn(C.green)} onClick={send} disabled={saving}>
          {saving ? "Sending…" : "Send Message"}
        </button>
        <button
          style={s.outBtn("#aaa")}
          onClick={() =>
            setForm({
              recipient_id: "",
              subject: "",
              body: "",
              priority: "normal",
              message_type: "general",
              requires_acknowledgement: false,
            })
          }
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ─── BROADCAST ─────────────────────────────────────────────────────────────────
function Broadcast({ tenantId, staffList, currentUserId }) {
  const [form, setForm] = useState({
    subject: "",
    body: "",
    priority: "normal",
    message_type: "announcement",
    requires_acknowledgement: false,
  });
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const f = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const toggleStaff = (id) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const selectAll = () => setSelected(staffList.map((s) => s.id));
  const clearAll = () => setSelected([]);

  const send = async () => {
    if (selected.length === 0 || !form.body.trim()) {
      setToast({
        type: "error",
        msg: "Select at least one recipient and write a message.",
      });
      return;
    }
    const validRecipients = selected.filter(
      (id) => staffList.find((s) => s.id === id)?.user_id,
    );
    if (validRecipients.length === 0) {
      setToast({
        type: "error",
        msg: "None of the selected staff have app accounts linked. Link staff to user accounts in HR → Staff first.",
      });
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const messages = validRecipients.map((recipId) => {
        const staffMember = staffList.find((s) => s.id === recipId);
        return {
          tenant_id: tenantId,
          sender_id: currentUserId,
          recipient_id: staffMember?.user_id || recipId,
          recipient_group: "broadcast",
          subject: form.subject.trim() || null,
          body: form.body.trim(),
          priority: form.priority,
          message_type: form.message_type,
          requires_acknowledgement: !!form.requires_acknowledgement,
          sent_at: now,
        };
      });
      const { error } = await supabase.from("staff_messages").insert(messages);
      if (error) throw error;
      setToast({
        type: "success",
        msg: `Broadcast sent to ${selected.length} staff member${selected.length !== 1 ? "s" : ""}.`,
      });
      clearAll();
      setForm({
        subject: "",
        body: "",
        priority: "normal",
        message_type: "announcement",
        requires_acknowledgement: false,
      });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
      {/* Recipient picker */}
      <div>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Recipients
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            style={{ ...s.outBtn(C.green), padding: "4px 12px", fontSize: 11 }}
            onClick={selectAll}
          >
            Select All
          </button>
          <button
            style={{ ...s.outBtn("#aaa"), padding: "4px 12px", fontSize: 11 }}
            onClick={clearAll}
          >
            Clear
          </button>
          <span
            style={{
              fontSize: 11,
              color: C.muted,
              alignSelf: "center",
              marginLeft: 4,
            }}
          >
            {selected.length} selected
          </span>
        </div>
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            overflow: "hidden",
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {staffList.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: C.muted,
                fontSize: 13,
              }}
            >
              No active staff members
            </div>
          ) : (
            staffList.map((st, i) => (
              <label
                key={st.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: selected.includes(st.id)
                    ? C.greenLight
                    : i % 2 === 0
                      ? C.white
                      : C.bg,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(st.id)}
                  onChange={() => toggleStaff(st.id)}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: selected.includes(st.id) ? 600 : 400,
                    }}
                  >
                    {st.preferred_name || st.full_name}
                    {!st.user_id && (
                      <span
                        style={{
                          fontSize: 9,
                          color: C.amber,
                          background: C.amberLight,
                          padding: "1px 5px",
                          borderRadius: 10,
                          marginLeft: 6,
                          fontWeight: 700,
                        }}
                      >
                        NO ACCOUNT
                      </span>
                    )}
                  </div>
                  {st.job_title && (
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {st.job_title}
                    </div>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Message form */}
      <div>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Message
        </p>
        {toast && <ToastMsg toast={toast} onDismiss={() => setToast(null)} />}

        <div style={s.grid2}>
          <div>
            <label style={s.label}>Type</label>
            <select
              style={s.select}
              value={form.message_type}
              onChange={f("message_type")}
            >
              {MESSAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Priority</label>
            <select
              style={s.select}
              value={form.priority}
              onChange={f("priority")}
            >
              {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>Subject</label>
          <input
            style={s.input}
            value={form.subject}
            onChange={f("subject")}
            placeholder="Broadcast subject"
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>Message *</label>
          <textarea
            style={{ ...s.textarea, height: 180 }}
            value={form.body}
            onChange={f("body")}
            placeholder="Write your broadcast message…"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!!form.requires_acknowledgement}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  requires_acknowledgement: e.target.checked,
                }))
              }
            />
            Require acknowledgement from all recipients
          </label>
        </div>
        <button
          style={{
            ...s.btn(selected.length === 0 ? "#aaa" : C.green),
            width: "100%",
            padding: "10px",
            fontSize: 13,
          }}
          onClick={send}
          disabled={saving || selected.length === 0}
        >
          {saving
            ? "Sending…"
            : `Send to ${selected.length} staff member${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
const SUB_TABS = ["Inbox", "Compose", "Broadcast"];

export default function HRComms({ tenantId }) {
  const [subTab, setSubTab] = useState("Inbox");
  const [staffList, setStaffList] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from("staff_profiles")
        .select("id, user_id, full_name, preferred_name, job_title")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("full_name");
      setStaffList(data || []);

      // Unread count for badge
      const { count } = await supabase
        .from("staff_messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .is("read_at", null);
      setUnreadCount(count || 0);
    };
    init();
  }, [tenantId]);

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", color: C.text }}>
      {/* Stats */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          {
            label: "Unread",
            num: unreadCount,
            color: unreadCount > 0 ? C.green : C.muted,
          },
          { label: "Staff", num: staffList.length, color: C.text },
        ].map(({ label, num, color }) => (
          <div key={label} style={s.statCard}>
            <div style={{ ...s.statNum, color }}>{num}</div>
            <div style={s.statLbl}>{label}</div>
          </div>
        ))}
      </div>

      <div style={s.subTabs}>
        {SUB_TABS.map((t) => (
          <button
            key={t}
            style={s.subTab(subTab === t)}
            onClick={() => setSubTab(t)}
          >
            {t}
            {t === "Inbox" && unreadCount > 0 && (
              <span
                style={{
                  background: C.red,
                  color: C.white,
                  borderRadius: 10,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "1px 5px",
                  marginLeft: 6,
                  verticalAlign: "middle",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === "Inbox" && (
        <Inbox
          tenantId={tenantId}
          staffList={staffList}
          currentUserId={currentUserId}
        />
      )}
      {subTab === "Compose" && (
        <Compose
          tenantId={tenantId}
          staffList={staffList}
          currentUserId={currentUserId}
          onSent={() => setSubTab("Inbox")}
        />
      )}
      {subTab === "Broadcast" && (
        <Broadcast
          tenantId={tenantId}
          staffList={staffList}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
