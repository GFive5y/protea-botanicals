// src/components/AdminCommsCenter.js v1.0
// WP-U: Unified Comms Centre — Phase 1 + 2
// Replaces AdminMessages tab + AdminSupport tab in AdminDashboard.
//
// CHANNEL 1 — Customers: customer_messages (all directions) + support_tickets per user
// CHANNEL 2 — Wholesale: wholesale_messages per partner (new table)
//
// Tables used:
//   customer_messages    — existing, untouched
//   support_tickets      — existing, untouched
//   wholesale_messages   — new (created in WP-U SQL step)
//   wholesale_partners   — existing
//   user_profiles        — existing

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  white: "#fff",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  lightGreen: "#eafaf1",
  lightGold: "#fef9e7",
  orange: "#e67e22",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', sans-serif",
};
const sBtn = (bg = C.green, color = C.white, disabled = false) => ({
  padding: "8px 16px",
  background: disabled ? "#ccc" : bg,
  color,
  border: bg === "transparent" ? `1px solid ${C.border}` : "none",
  borderRadius: 2,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: F.body,
  transition: "opacity 0.15s",
});
const sInp = {
  padding: "9px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 13,
  fontFamily: F.body,
  background: C.white,
  color: C.text,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function fmtTime(ts) {
  if (!ts) return "—";
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

// ── Response templates (cannabis industry) ───────────────────────────────────
const TEMPLATES = [
  {
    label: "Device Issue",
    icon: "🔧",
    body: "Thank you for reaching out about your device. We're sorry to hear you're experiencing an issue. Could you please describe the problem in detail and include your batch number (found on the product label)? We'll assess whether a replacement is warranted and get back to you within 24 hours.",
  },
  {
    label: "Order Not Received",
    icon: "📦",
    body: "We sincerely apologise for this inconvenience. Please provide your order number and the address it was shipped to, and we'll investigate with our courier immediately. We aim to resolve delivery issues within 48 hours.",
  },
  {
    label: "Quality Concern",
    icon: "🌿",
    body: "Thank you for flagging this — product quality is our highest priority. Please share your batch number (on the label) and a description of the concern. Our quality team will review and follow up with you directly.",
  },
  {
    label: "Points Query",
    icon: "⭐",
    body: "Loyalty points are awarded automatically after each verified QR scan. If you believe there's a discrepancy, please share your registered email address and we'll review your scan history and correct any errors promptly.",
  },
  {
    label: "General Reply",
    icon: "💬",
    body: "Thank you for contacting Protea Botanicals. We've received your message and a member of our team will follow up with you shortly. Our standard response time is within 24 hours on business days.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER THREAD — unified customer_messages + support_tickets timeline
// ─────────────────────────────────────────────────────────────────────────────
function CustomerThread({ userId, profile, adminUser, onUnreadCleared }) {
  const [messages, setMessages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast] = useState(null);
  const bottomRef = useRef(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchThread = useCallback(async () => {
    setLoading(true);
    const [msgRes, tickRes] = await Promise.all([
      supabase
        .from("customer_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("support_tickets")
        .select(
          "id, ticket_number, subject, status, created_at, body, message, description, resolution_notes, customer_name, customer_email",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
    ]);
    setMessages(msgRes.data || []);
    setTickets(tickRes.data || []);
    // Mark outbound messages as read
    const unread = (msgRes.data || []).filter(
      (m) => m.direction === "outbound" && !m.read_at,
    );
    if (unread.length > 0) {
      await supabase
        .from("customer_messages")
        .update({ read_at: new Date().toISOString() })
        .in(
          "id",
          unread.map((m) => m.id),
        );
      onUnreadCleared?.();
    }
    setLoading(false);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  }, [userId, onUnreadCleared]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  const handleSend = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    const { error } = await supabase.from("customer_messages").insert({
      user_id: userId,
      direction: "outbound",
      message_type: "response",
      subject: "Re: Your message",
      body: replyBody.trim(),
      sent_by: adminUser?.id || null,
      sent_by_name: adminUser?.email?.split("@")[0] || "Admin",
      metadata: {},
    });
    if (error) {
      showToast("Failed to send: " + error.message, false);
    } else {
      setReplyBody("");
      fetchThread();
      showToast("Message sent");
    }
    setSending(false);
  };

  // Merge messages + tickets into unified timeline
  const timeline = [
    ...(messages || []).map((m) => ({ ...m, _type: "message" })),
    ...(tickets || []).map((t) => ({ ...t, _type: "ticket" })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const msgTypeMeta = {
    query: { label: "Query", icon: "💬", color: C.blue },
    fault: { label: "Fault", icon: "⚠️", color: C.red },
    response: { label: "Reply", icon: "↩️", color: C.mid },
    admin_notice: { label: "Notice", icon: "📢", color: C.mid },
    tier_upgrade: { label: "Tier Upgrade", icon: "🏆", color: "#7b68ee" },
    streak_bonus: { label: "Streak Bonus", icon: "🔥", color: C.gold },
    birthday: { label: "Birthday", icon: "🎂", color: C.gold },
    broadcast: { label: "Broadcast", icon: "📣", color: C.accent },
  };

  const ticketStatusColor = {
    open: C.red,
    pending_reply: C.orange,
    resolved: C.accent,
    closed: C.muted,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Thread header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${C.border}`,
          background: C.warm,
          flexShrink: 0,
        }}
      >
        <div style={{ fontFamily: F.heading, fontSize: 18, color: C.green }}>
          {profile?.full_name || "Anonymous"}
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            marginTop: 2,
            display: "flex",
            gap: 12,
          }}
        >
          {profile?.email && <span>✉ {profile.email}</span>}
          {profile?.phone && <span>📱 {profile.phone}</span>}
          {profile?.loyalty_tier && (
            <span style={{ textTransform: "capitalize" }}>
              🏅 {profile.loyalty_tier} · {profile.loyalty_points || 0} pts
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            Loading thread…
          </div>
        ) : timeline.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 16,
                color: C.green,
                marginBottom: 4,
              }}
            >
              No messages yet
            </div>
            <div style={{ fontSize: 12 }}>
              Use the compose panel below to send the first message.
            </div>
          </div>
        ) : (
          timeline.map((item) => {
            if (item._type === "ticket") {
              const statusColor = ticketStatusColor[item.status] || C.muted;
              const ticketBody =
                item.body || item.message || item.description || "";
              return (
                <div
                  key={`ticket-${item.id}`}
                  style={{
                    background: "#f5f0ff",
                    border: `1px solid #d8ccff`,
                    borderLeft: `4px solid #7b68ee`,
                    borderRadius: 2,
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#7b68ee",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        🎫 Support Ticket
                      </span>
                      {item.ticket_number && (
                        <span
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            marginLeft: 8,
                            fontFamily: "monospace",
                          }}
                        >
                          {item.ticket_number}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 8px",
                          borderRadius: 2,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: `${statusColor}15`,
                          color: statusColor,
                        }}
                      >
                        {item.status}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        {fmtTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                  {item.subject && (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        marginBottom: 4,
                      }}
                    >
                      {item.subject}
                    </div>
                  )}
                  {ticketBody && (
                    <div
                      style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}
                    >
                      {ticketBody}
                    </div>
                  )}
                  {item.resolution_notes && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        background: C.lightGreen,
                        borderRadius: 2,
                        fontSize: 11,
                        color: C.mid,
                      }}
                    >
                      <strong>Resolution:</strong> {item.resolution_notes}
                    </div>
                  )}
                </div>
              );
            }
            // customer_message
            const isOutbound = item.direction === "outbound";
            const meta = msgTypeMeta[item.message_type] || {
              label: item.message_type || "Message",
              icon: "📩",
              color: C.muted,
            };
            return (
              <div
                key={`msg-${item.id}`}
                style={{
                  alignSelf: isOutbound ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    marginBottom: 3,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: isOutbound ? "flex-end" : "flex-start",
                  }}
                >
                  <span>
                    {meta.icon} {meta.label}
                  </span>
                  <span>
                    {isOutbound
                      ? item.sent_by_name || "Admin"
                      : profile?.full_name || "Customer"}
                  </span>
                  <span>{fmtTime(item.created_at)}</span>
                </div>
                <div
                  style={{
                    background: isOutbound ? C.green : C.white,
                    color: isOutbound ? C.white : C.text,
                    border: `1px solid ${isOutbound ? C.green : C.border}`,
                    borderRadius: isOutbound
                      ? "12px 12px 2px 12px"
                      : "12px 12px 12px 2px",
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.subject && (
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 12,
                        marginBottom: 4,
                        opacity: 0.85,
                      }}
                    >
                      {item.subject}
                    </div>
                  )}
                  {item.body || item.content || ""}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            margin: "0 20px",
            padding: "8px 14px",
            borderRadius: 2,
            fontSize: 12,
            fontWeight: 600,
            background: toast.ok ? C.lightGreen : C.lightRed,
            color: toast.ok ? C.mid : C.red,
          }}
        >
          {toast.ok ? "✓" : "⚠"} {toast.msg}
        </div>
      )}

      {/* Compose */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: `1px solid ${C.border}`,
          background: C.white,
          flexShrink: 0,
        }}
      >
        {/* Templates */}
        {showTemplates && (
          <div style={{ marginBottom: 10, display: "grid", gap: 6 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Response Templates
            </div>
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  setReplyBody(t.body);
                  setShowTemplates(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  background: C.cream,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  cursor: "pointer",
                  fontSize: 12,
                  color: C.text,
                  fontFamily: F.body,
                }}
              >
                {t.icon} <strong>{t.label}</strong> — {t.body.slice(0, 60)}…
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            rows={2}
            placeholder="Type your reply…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleSend();
            }}
            style={{ ...sInp, resize: "none", flex: 1, fontSize: 13 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => setShowTemplates((s) => !s)}
              style={{
                ...sBtn("transparent", C.muted),
                padding: "6px 10px",
                fontSize: 9,
              }}
            >
              📝 Templates
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !replyBody.trim()}
              style={{
                ...sBtn(C.green, C.white, sending || !replyBody.trim()),
                padding: "8px 14px",
              }}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          Ctrl+Enter to send
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHOLESALE THREAD
// ─────────────────────────────────────────────────────────────────────────────
function WholesaleThread({ partner, adminUser }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const bottomRef = useRef(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchThread = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wholesale_messages")
      .select("*")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    // Mark inbound as read
    const unread = (data || []).filter(
      (m) => m.direction === "inbound" && !m.read_at,
    );
    if (unread.length > 0) {
      await supabase
        .from("wholesale_messages")
        .update({ read_at: new Date().toISOString() })
        .in(
          "id",
          unread.map((m) => m.id),
        );
    }
    setLoading(false);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  }, [partner.id]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  const handleSend = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    const { error } = await supabase.from("wholesale_messages").insert({
      partner_id: partner.id,
      direction: "outbound",
      message_type: "general",
      body: replyBody.trim(),
      sent_by: adminUser?.id || null,
      sent_by_name: adminUser?.email?.split("@")[0] || "Admin",
    });
    if (error) {
      showToast("Failed: " + error.message, false);
    } else {
      setReplyBody("");
      fetchThread();
      showToast("Message sent");
    }
    setSending(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${C.border}`,
          background: C.warm,
          flexShrink: 0,
        }}
      >
        <div style={{ fontFamily: F.heading, fontSize: 18, color: C.green }}>
          🏪 {partner.name}
        </div>
        {partner.contact_name && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Contact: {partner.contact_name}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏪</div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 16,
                color: C.green,
                marginBottom: 4,
              }}
            >
              No messages yet with {partner.name}
            </div>
            <div style={{ fontSize: 12 }}>
              Send the first message below to start the conversation.
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isOutbound ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    marginBottom: 3,
                    textAlign: isOutbound ? "right" : "left",
                  }}
                >
                  {isOutbound ? msg.sent_by_name || "Admin" : partner.name} ·{" "}
                  {fmtTime(msg.created_at)}
                </div>
                <div
                  style={{
                    background: isOutbound ? C.blue : C.white,
                    color: isOutbound ? C.white : C.text,
                    border: `1px solid ${isOutbound ? C.blue : C.border}`,
                    borderRadius: isOutbound
                      ? "12px 12px 2px 12px"
                      : "12px 12px 12px 2px",
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.subject && (
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 12,
                        marginBottom: 4,
                        opacity: 0.85,
                      }}
                    >
                      {msg.subject}
                    </div>
                  )}
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {toast && (
        <div
          style={{
            margin: "0 20px",
            padding: "8px 14px",
            borderRadius: 2,
            fontSize: 12,
            fontWeight: 600,
            background: toast.ok ? C.lightGreen : C.lightRed,
            color: toast.ok ? C.mid : C.red,
          }}
        >
          {toast.ok ? "✓" : "⚠"} {toast.msg}
        </div>
      )}

      {/* Compose */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: `1px solid ${C.border}`,
          background: C.white,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            rows={2}
            placeholder="Message wholesale partner…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleSend();
            }}
            style={{ ...sInp, resize: "none", flex: 1, fontSize: 13 }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !replyBody.trim()}
            style={{
              ...sBtn(C.blue, C.white, sending || !replyBody.trim()),
              padding: "8px 14px",
            }}
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          Ctrl+Enter to send · This channel is admin/HQ only
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminCommsCenter() {
  const [channel, setChannel] = useState("customers"); // customers | wholesale
  const [adminUser, setAdminUser] = useState(null);

  // Customers state
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [custLoading, setCustLoading] = useState(true);
  const [custSearch, setCustSearch] = useState("");
  const [custUnread, setCustUnread] = useState(0);

  // Wholesale state
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partLoading, setPartLoading] = useState(true);
  const [partUnread, setPartUnread] = useState(0);

  // Broadcast state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAdminUser(user));
  }, []);

  // ── Fetch customer list ────────────────────────────────────────────────────
  const fetchCustomerList = useCallback(async () => {
    setCustLoading(true);
    try {
      // Get distinct user_ids from customer_messages + support_tickets
      const [msgRes, tickRes] = await Promise.all([
        supabase
          .from("customer_messages")
          .select("user_id, direction, read_at, created_at, body, message_type")
          .order("created_at", { ascending: false }),
        supabase
          .from("support_tickets")
          .select("user_id, status, created_at, subject, ticket_number")
          .order("created_at", { ascending: false }),
      ]);

      const msgs = msgRes.data || [];
      const ticks = tickRes.data || [];

      // Build user map
      const userMap = {};
      msgs.forEach((m) => {
        if (!m.user_id) return;
        if (!userMap[m.user_id])
          userMap[m.user_id] = {
            user_id: m.user_id,
            lastActivity: m.created_at,
            unread: 0,
            hasTicket: false,
            openTickets: 0,
            lastMessage: "",
          };
        if (m.direction === "outbound" && !m.read_at)
          userMap[m.user_id].unread++;
        if (
          new Date(m.created_at) > new Date(userMap[m.user_id].lastActivity)
        ) {
          userMap[m.user_id].lastActivity = m.created_at;
          userMap[m.user_id].lastMessage = m.body?.slice(0, 50) || "";
        }
      });
      ticks.forEach((t) => {
        if (!t.user_id) return;
        if (!userMap[t.user_id])
          userMap[t.user_id] = {
            user_id: t.user_id,
            lastActivity: t.created_at,
            unread: 0,
            hasTicket: false,
            openTickets: 0,
            lastMessage: "",
          };
        userMap[t.user_id].hasTicket = true;
        if (["open", "pending_reply"].includes(t.status))
          userMap[t.user_id].openTickets++;
        if (
          new Date(t.created_at) > new Date(userMap[t.user_id].lastActivity)
        ) {
          userMap[t.user_id].lastActivity = t.created_at;
          userMap[t.user_id].lastMessage = t.subject || "";
        }
      });

      // Fetch profiles for all user_ids
      const userIds = Object.keys(userMap);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, full_name, email, phone, loyalty_tier, loyalty_points")
          .in("id", userIds);
        (profiles || []).forEach((p) => {
          if (userMap[p.id]) userMap[p.id].profile = p;
        });
      }

      const list = Object.values(userMap).sort(
        (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity),
      );
      setCustomerList(list);
      const totalUnread = list.reduce((s, c) => s + c.unread, 0);
      setCustUnread(totalUnread);
    } catch (err) {
      console.error("[AdminCommsCenter] Customer list error:", err);
    } finally {
      setCustLoading(false);
    }
  }, []);

  // ── Fetch wholesale partners ───────────────────────────────────────────────
  const fetchPartners = useCallback(async () => {
    setPartLoading(true);
    try {
      const { data: partnerData } = await supabase
        .from("wholesale_partners")
        .select("id, name, contact_name, contact_email, contact_phone")
        .eq("is_active", true)
        .order("name");
      const { data: wMsgs } = await supabase
        .from("wholesale_messages")
        .select("partner_id, read_at, direction, created_at, body")
        .order("created_at", { ascending: false });

      const msgMap = {};
      (wMsgs || []).forEach((m) => {
        if (!msgMap[m.partner_id])
          msgMap[m.partner_id] = {
            unread: 0,
            lastActivity: m.created_at,
            lastMessage: "",
          };
        if (m.direction === "inbound" && !m.read_at)
          msgMap[m.partner_id].unread++;
        if (
          new Date(m.created_at) > new Date(msgMap[m.partner_id].lastActivity)
        ) {
          msgMap[m.partner_id].lastActivity = m.created_at;
          msgMap[m.partner_id].lastMessage = m.body?.slice(0, 50) || "";
        }
      });

      const list = (partnerData || []).map((p) => ({
        ...p,
        ...(msgMap[p.id] || { unread: 0, lastActivity: null, lastMessage: "" }),
      }));
      setPartners(list);
      setPartUnread(list.reduce((s, p) => s + p.unread, 0));
    } catch (err) {
      console.error("[AdminCommsCenter] Partner list error:", err);
    } finally {
      setPartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerList();
    fetchPartners();
  }, [fetchCustomerList, fetchPartners]);

  // ── Broadcast ──────────────────────────────────────────────────────────────
  const handleBroadcast = async () => {
    if (!broadcastBody.trim()) return;
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const { data: allUsers } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("role", "customer");
      const inserts = (allUsers || []).map((u) => ({
        user_id: u.id,
        direction: "outbound",
        message_type: "broadcast",
        subject: broadcastSubject.trim() || "Message from Protea Botanicals",
        body: broadcastBody.trim(),
        sent_by: adminUser?.id || null,
        sent_by_name: adminUser?.email?.split("@")[0] || "Admin",
        metadata: {},
      }));
      if (inserts.length > 0) {
        const { error } = await supabase
          .from("customer_messages")
          .insert(inserts);
        if (error) throw error;
      }
      setBroadcastResult({ ok: true, count: inserts.length });
      setBroadcastBody("");
      setBroadcastSubject("");
      setTimeout(() => {
        setShowBroadcast(false);
        setBroadcastResult(null);
      }, 3000);
      fetchCustomerList();
    } catch (err) {
      setBroadcastResult({ ok: false, msg: err.message });
    } finally {
      setBroadcasting(false);
    }
  };

  // ── Filtered customer list ─────────────────────────────────────────────────
  const filteredCustomers = customerList.filter((c) => {
    const q = custSearch.toLowerCase();
    if (!q) return true;
    const p = c.profile;
    return (
      p?.full_name?.toLowerCase().includes(q) ||
      p?.email?.toLowerCase().includes(q) ||
      p?.phone?.includes(q)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: F.body }}>
      {/* ── Channel switcher ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: F.heading,
              color: C.green,
              fontSize: 22,
              margin: 0,
            }}
          >
            Comms Centre
          </h2>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            Customer messages · Support tickets · Wholesale comms
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Channel tabs */}
          {[
            { id: "customers", label: `👥 Customers`, badge: custUnread },
            { id: "wholesale", label: `🏪 Wholesale`, badge: partUnread },
          ].map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                setChannel(ch.id);
                setSelectedCustomer(null);
                setSelectedPartner(null);
              }}
              style={{
                padding: "8px 16px",
                background: channel === ch.id ? C.green : C.white,
                color: channel === ch.id ? C.white : C.muted,
                border: `1px solid ${channel === ch.id ? C.green : C.border}`,
                borderRadius: 2,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: F.body,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {ch.label}
              {ch.badge > 0 && (
                <span
                  style={{
                    background: C.red,
                    color: C.white,
                    borderRadius: 10,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                  }}
                >
                  {ch.badge}
                </span>
              )}
            </button>
          ))}
          {channel === "customers" && (
            <button
              onClick={() => setShowBroadcast((s) => !s)}
              style={{ ...sBtn(C.gold), padding: "8px 14px" }}
            >
              📣 Broadcast
            </button>
          )}
          <button
            onClick={() => {
              fetchCustomerList();
              fetchPartners();
            }}
            style={{ ...sBtn("transparent", C.muted), padding: "8px 12px" }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Broadcast panel ── */}
      {showBroadcast && (
        <div
          style={{
            marginBottom: 20,
            padding: 20,
            background: C.lightGold,
            border: `1px solid ${C.gold}`,
            borderRadius: 2,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.gold,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            📣 Broadcast to All Customers
          </div>
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <input
              style={sInp}
              placeholder="Subject (optional)"
              value={broadcastSubject}
              onChange={(e) => setBroadcastSubject(e.target.value)}
            />
            <textarea
              rows={3}
              style={{ ...sInp, resize: "vertical" }}
              placeholder="Message body…"
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
            />
          </div>
          {broadcastResult && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 2,
                marginBottom: 10,
                fontSize: 12,
                fontWeight: 600,
                background: broadcastResult.ok ? C.lightGreen : C.lightRed,
                color: broadcastResult.ok ? C.mid : C.red,
              }}
            >
              {broadcastResult.ok
                ? `✓ Sent to ${broadcastResult.count} customers`
                : `⚠ ${broadcastResult.msg}`}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleBroadcast}
              disabled={broadcasting || !broadcastBody.trim()}
              style={sBtn(
                C.gold,
                C.white,
                broadcasting || !broadcastBody.trim(),
              )}
            >
              {broadcasting ? "Sending…" : "Send Broadcast"}
            </button>
            <button
              onClick={() => setShowBroadcast(false)}
              style={sBtn("transparent", C.muted)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Two-panel layout ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 0,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          overflow: "hidden",
          minHeight: 560,
        }}
      >
        {/* LEFT PANEL — list */}
        <div
          style={{
            borderRight: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            background: C.cream,
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <input
              style={{ ...sInp, fontSize: 12 }}
              placeholder={
                channel === "customers"
                  ? "Search customers…"
                  : "Search partners…"
              }
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {channel === "customers" &&
              (custLoading ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: C.muted,
                    fontSize: 12,
                  }}
                >
                  Loading…
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div
                  style={{ padding: 24, textAlign: "center", color: C.muted }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                  <div style={{ fontSize: 12 }}>
                    No customers with messages yet.
                  </div>
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const p = c.profile;
                  const isSelected = selectedCustomer?.user_id === c.user_id;
                  return (
                    <div
                      key={c.user_id}
                      onClick={() => setSelectedCustomer(c)}
                      style={{
                        padding: "12px 14px",
                        borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer",
                        background: isSelected ? C.lightGreen : "transparent",
                        borderLeft: isSelected
                          ? `3px solid ${C.accent}`
                          : "3px solid transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: c.unread > 0 ? 700 : 500,
                              color: C.text,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {p?.full_name || "Anonymous"}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: C.muted,
                              marginTop: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.lastMessage || p?.email || "No messages"}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              marginTop: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            {c.openTickets > 0 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "1px 5px",
                                  borderRadius: 2,
                                  background: C.lightRed,
                                  color: C.red,
                                  fontWeight: 700,
                                }}
                              >
                                🎫 {c.openTickets} open
                              </span>
                            )}
                            {p?.loyalty_tier && (
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "1px 5px",
                                  borderRadius: 2,
                                  background: C.lightGold,
                                  color: C.gold,
                                  textTransform: "capitalize",
                                }}
                              >
                                {p.loyalty_tier}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            flexShrink: 0,
                            textAlign: "right",
                            marginLeft: 8,
                          }}
                        >
                          {c.unread > 0 && (
                            <span
                              style={{
                                display: "inline-block",
                                background: C.red,
                                color: C.white,
                                borderRadius: 10,
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "1px 5px",
                                marginBottom: 4,
                              }}
                            >
                              {c.unread}
                            </span>
                          )}
                          <div style={{ fontSize: 10, color: C.muted }}>
                            {fmtTime(c.lastActivity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}

            {channel === "wholesale" &&
              (partLoading ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: C.muted,
                    fontSize: 12,
                  }}
                >
                  Loading…
                </div>
              ) : partners.length === 0 ? (
                <div
                  style={{ padding: 24, textAlign: "center", color: C.muted }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🏪</div>
                  <div style={{ fontSize: 12 }}>
                    No active wholesale partners found.
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    Add partners in HQ → Wholesale.
                  </div>
                </div>
              ) : (
                partners.map((p) => {
                  const isSelected = selectedPartner?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPartner(p)}
                      style={{
                        padding: "12px 14px",
                        borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer",
                        background: isSelected ? "#e8f0ff" : "transparent",
                        borderLeft: isSelected
                          ? `3px solid ${C.blue}`
                          : "3px solid transparent",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: p.unread > 0 ? 700 : 500,
                              color: C.text,
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: C.muted,
                              marginTop: 1,
                            }}
                          >
                            {p.lastMessage ||
                              p.contact_name ||
                              "No messages yet"}
                          </div>
                        </div>
                        <div
                          style={{
                            flexShrink: 0,
                            textAlign: "right",
                            marginLeft: 8,
                          }}
                        >
                          {p.unread > 0 && (
                            <span
                              style={{
                                display: "inline-block",
                                background: C.red,
                                color: C.white,
                                borderRadius: 10,
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "1px 5px",
                                marginBottom: 4,
                              }}
                            >
                              {p.unread}
                            </span>
                          )}
                          {p.lastActivity && (
                            <div style={{ fontSize: 10, color: C.muted }}>
                              {fmtTime(p.lastActivity)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}
          </div>
        </div>

        {/* RIGHT PANEL — thread or empty state */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {channel === "customers" && !selectedCustomer && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: C.muted,
                padding: 40,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
              <div
                style={{
                  fontFamily: F.heading,
                  fontSize: 20,
                  color: C.green,
                  marginBottom: 8,
                }}
              >
                Select a customer
              </div>
              <div style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.7 }}>
                Click any customer on the left to view their full message and
                support ticket history in one unified thread.
              </div>
              {custLoading === false && customerList.length === 0 && (
                <div
                  style={{
                    marginTop: 20,
                    padding: "12px 16px",
                    background: C.lightGold,
                    border: `1px solid ${C.gold}`,
                    borderRadius: 2,
                    fontSize: 12,
                    color: C.gold,
                    maxWidth: 320,
                  }}
                >
                  💡 Messages from customers will appear here automatically when
                  they contact you via their Account → Support tab.
                </div>
              )}
            </div>
          )}

          {channel === "customers" && selectedCustomer && (
            <CustomerThread
              key={selectedCustomer.user_id}
              userId={selectedCustomer.user_id}
              profile={selectedCustomer.profile}
              adminUser={adminUser}
              onUnreadCleared={fetchCustomerList}
            />
          )}

          {channel === "wholesale" && !selectedPartner && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: C.muted,
                padding: 40,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
              <div
                style={{
                  fontFamily: F.heading,
                  fontSize: 20,
                  color: C.green,
                  marginBottom: 8,
                }}
              >
                Select a wholesale partner
              </div>
              <div style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.7 }}>
                Click a partner on the left to open a private comms channel.
                This channel is visible to Admin and HQ only — not to retail
                customers.
              </div>
              <div
                style={{
                  marginTop: 20,
                  padding: "12px 16px",
                  background: C.lightBlue,
                  border: `1px solid ${C.blue}20`,
                  borderRadius: 2,
                  fontSize: 12,
                  color: C.blue,
                  maxWidth: 320,
                }}
              >
                💡 Wholesale partner messages are stored in a separate table
                from customer messages — complete data isolation.
              </div>
            </div>
          )}

          {channel === "wholesale" && selectedPartner && (
            <WholesaleThread
              key={selectedPartner.id}
              partner={selectedPartner}
              adminUser={adminUser}
            />
          )}
        </div>
      </div>
    </div>
  );
}
