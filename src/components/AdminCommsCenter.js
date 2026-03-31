// src/components/AdminCommsCenter.js v1.4
// WP-VIZ: flush stat grid + Activity Donut + Top Customers HBar
// WP-VISUAL: T tokens, Inter font, underline channel tabs, no Cormorant/Jost
// WP-GUIDE-C++: usePageContext 'comms' wired + WorkflowGuide added
// v1.2 — WorkflowGuide · v1.1 — Ticket threads, Templates, Broadcast

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";
import WorkflowGuide from "./WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "./viz";

// ─── THEME ────────────────────────────────────────────────────────────────────
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
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
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
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
};
// Legacy aliases so all C.* refs resolve
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.ink050,
  warm: T.ink075,
  white: "#fff",
  border: T.ink150,
  muted: T.ink400,
  text: T.ink700,
  red: T.danger,
  lightRed: T.dangerBg,
  blue: T.info,
  lightBlue: T.infoBg,
  lightGreen: T.accentLit,
  lightGold: T.warningBg,
  orange: T.warning,
  success: T.success,
  purple: "#6A1B9A",
};
const F = { heading: T.font, body: T.font };

// ─── STYLE HELPERS ────────────────────────────────────────────────────────────
const sBtn = (bg = T.accent, color = "#fff", disabled = false) => ({
  padding: "8px 16px",
  background: disabled ? "#ccc" : bg,
  color,
  border: bg === "transparent" ? `1px solid ${T.ink150}` : "none",
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
const sInp = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  background: "#fff",
  color: T.ink700,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const STATUS_COLOURS = {
  open: { bg: T.infoBg, text: T.info },
  pending_reply: { bg: T.warningBg, text: T.warning },
  resolved: { bg: T.successBg, text: T.success },
  closed: { bg: T.ink075, text: T.ink400 },
};
const TICKET_STATUSES = ["open", "pending_reply", "resolved", "closed"];
const RESPONSE_TEMPLATES = [
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

const TRIGGER_LABELS = {
  ticket_opened: "Ticket Opened (auto-reply)",
  ticket_resolved: "Ticket Resolved (auto-reply)",
  referral_redeemed: "Referral Code Used — Referrer",
  referral_welcome: "Referral Welcome — New Customer",
  tier_upgrade_silver: "Tier Upgrade → Silver",
  tier_upgrade_gold: "Tier Upgrade → Gold",
  tier_upgrade_platinum: "Tier Upgrade → Platinum",
  birthday_bonus: "Birthday Bonus",
  first_purchase: "First Purchase",
  streak_bonus: "Streak Bonus",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TICKET THREAD
// ═══════════════════════════════════════════════════════════════════════════════
function TicketThread({ ticket, profile, onStatusChange, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    const unread = (data || []).filter(
      (m) => m.sender_type === "customer" && !m.read_at,
    );
    if (unread.length)
      await supabase
        .from("ticket_messages")
        .update({ read_at: new Date().toISOString() })
        .in(
          "id",
          unread.map((m) => m.id),
        );
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
    setLoading(false);
  }, [ticket.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const chan = supabase
      .channel(`ticket-thread-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            100,
          );
        },
      )
      .subscribe();
    return () => supabase.removeChannel(chan);
  }, [ticket.id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_id: user.id,
        content: reply.trim(),
      });
      await supabase.from("customer_messages").insert({
        user_id: ticket.user_id,
        direction: "outbound",
        message_type: "response",
        subject: `Re: ${ticket.subject} [${ticket.ticket_number}]`,
        body: reply.trim(),
        sent_by: user.id,
        sent_by_name: user.email?.split("@")[0] || "Admin",
        metadata: { ticket_id: ticket.id },
      });
      const newStatus = status === "pending_reply" ? "open" : status;
      await supabase
        .from("support_tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ticket.id);
      setStatus(newStatus);
      onStatusChange?.(ticket.id, newStatus);
      setReply("");
    } catch (err) {
      console.error("[TicketThread] sendReply:", err);
    } finally {
      setSending(false);
    }
  };

  const handleSetStatus = async (newStatus) => {
    const update = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "resolved") update.resolved_at = new Date().toISOString();
    await supabase.from("support_tickets").update(update).eq("id", ticket.id);
    setStatus(newStatus);
    onStatusChange?.(ticket.id, newStatus);
    if (newStatus === "resolved") {
      const { data: tmpl } = await supabase
        .from("message_templates")
        .select("*")
        .eq("trigger_type", "ticket_resolved")
        .eq("is_active", true)
        .maybeSingle();
      if (tmpl && ticket.user_id) {
        const vars = {
          first_name: profile?.full_name?.split(" ")[0] || "there",
          ticket_number: ticket.ticket_number || "",
        };
        const content = (tmpl.content || "").replace(
          /\{\{(\w+)\}\}/g,
          (_, k) => vars[k] || "",
        );
        const subject = (tmpl.subject || "").replace(
          /\{\{(\w+)\}\}/g,
          (_, k) => vars[k] || "",
        );
        await supabase
          .from("ticket_messages")
          .insert({ ticket_id: ticket.id, sender_type: "auto", content });
        await supabase.from("customer_messages").insert({
          user_id: ticket.user_id,
          direction: "outbound",
          message_type: "support_reply",
          subject,
          body: content,
          sent_by_name: "Auto-reply",
          metadata: { ticket_id: ticket.id },
        });
        loadMessages();
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: T.font,
      }}
    >
      {/* Thread header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${T.ink150}`,
          background: T.ink075,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 15,
                fontWeight: 600,
                color: T.ink900,
              }}
            >
              {ticket.subject}
            </div>
            <div style={{ fontSize: 11, color: T.ink400, marginTop: 2 }}>
              {profile?.full_name || "Customer"} · {ticket.ticket_number}
              {ticket.category ? ` · ${ticket.category}` : ""}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 5,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {TICKET_STATUSES.map((s) => {
              const sc = STATUS_COLOURS[s] || STATUS_COLOURS.open;
              return (
                <button
                  key={s}
                  onClick={() => handleSetStatus(s)}
                  style={{
                    padding: "3px 9px",
                    border: `1px solid ${status === s ? T.accent : T.ink150}`,
                    background: status === s ? T.accent : "#fff",
                    color: status === s ? "#fff" : T.ink400,
                    borderRadius: 20,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    fontFamily: T.font,
                    cursor: "pointer",
                  }}
                >
                  {s.replace("_", " ")}
                </button>
              );
            })}
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.ink400,
                fontSize: 18,
                padding: "0 4px",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: T.ink400,
              fontFamily: T.font,
            }}
          >
            Loading thread…
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: T.ink400,
              fontSize: 12,
              fontFamily: T.font,
            }}
          >
            No messages in this ticket yet.
          </div>
        ) : (
          messages.map((m) => {
            const isCustomer = m.sender_type === "customer",
              isAuto = m.sender_type === "auto";
            return (
              <div
                key={m.id}
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: isCustomer
                      ? T.ink150
                      : isAuto
                        ? T.accentMid
                        : T.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isAuto ? 12 : 11,
                    color: isCustomer ? T.ink700 : "#fff",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 2,
                    fontFamily: T.font,
                  }}
                >
                  {isAuto
                    ? "🤖"
                    : isCustomer
                      ? profile?.full_name?.[0] || "C"
                      : "PB"}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.ink900,
                        fontFamily: T.font,
                      }}
                    >
                      {isCustomer
                        ? profile?.full_name || "Customer"
                        : isAuto
                          ? "Auto-reply"
                          : "Support Team"}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        fontFamily: T.font,
                      }}
                    >
                      {fmtTime(m.created_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      background: isCustomer
                        ? T.ink075
                        : isAuto
                          ? T.accentLit
                          : "#fff",
                      border: `1px solid ${T.ink150}`,
                      borderRadius: isCustomer
                        ? "4px 12px 12px 12px"
                        : "12px 12px 12px 4px",
                      padding: "10px 14px",
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: T.ink700,
                      whiteSpace: "pre-wrap",
                      fontFamily: T.font,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply area */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: `1px solid ${T.ink150}`,
          background: "#fff",
          flexShrink: 0,
        }}
      >
        {showTemplates && (
          <div style={{ marginBottom: 10, display: "grid", gap: 5 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.ink400,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 2,
                fontFamily: T.font,
              }}
            >
              Quick Templates
            </div>
            {RESPONSE_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  setReply(t.body);
                  setShowTemplates(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "7px 11px",
                  background: T.ink075,
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  color: T.ink700,
                  fontFamily: T.font,
                }}
              >
                {t.icon} <strong>{t.label}</strong>
              </button>
            ))}
          </div>
        )}
        <textarea
          rows={2}
          placeholder="Type your reply to the customer…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) sendReply();
          }}
          style={{ ...sInp, resize: "none", marginBottom: 8, fontSize: 13 }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={sendReply}
            disabled={sending || !reply.trim()}
            style={sBtn(T.accent, "#fff", sending || !reply.trim())}
          >
            {sending ? "Sending…" : "Send Reply"}
          </button>
          <button
            onClick={() => handleSetStatus("resolved")}
            style={sBtn(T.success)}
          >
            Resolve
          </button>
          <button
            onClick={() => setShowTemplates((s) => !s)}
            style={sBtn("transparent", T.ink400)}
          >
            Templates
          </button>
        </div>
        <div
          style={{
            fontSize: 10,
            color: T.ink400,
            marginTop: 6,
            fontFamily: T.font,
          }}
        >
          Ctrl+Enter to send · Replies mirror to customer inbox
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER THREAD
// ═══════════════════════════════════════════════════════════════════════════════
function CustomerThread({ userId, profile, adminUser, onUnreadCleared }) {
  const [messages, setMessages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
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
          "id,ticket_number,subject,status,created_at,updated_at,user_id,category",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
    ]);
    setMessages(msgRes.data || []);
    setTickets(tickRes.data || []);
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

  const msgTypeMeta = {
    query: { label: "Query", icon: "💬", color: T.info },
    fault: { label: "Fault", icon: "⚠️", color: T.danger },
    response: { label: "Reply", icon: "↩️", color: T.accentMid },
    support_reply: { label: "Support Reply", icon: "↩️", color: T.accentMid },
    admin_notice: { label: "Notice", icon: "📢", color: T.accentMid },
    tier_upgrade: { label: "Tier Upgrade", icon: "🏆", color: "#6A1B9A" },
    streak_bonus: { label: "Streak Bonus", icon: "🔥", color: "#b5935a" },
    birthday: { label: "Birthday", icon: "🎂", color: "#b5935a" },
    broadcast: { label: "Broadcast", icon: "📣", color: T.accentMid },
    general: { label: "Message", icon: "📩", color: T.ink400 },
  };

  const timeline = [
    ...(messages || []).map((m) => ({ ...m, _type: "message" })),
    ...(tickets || []).map((t) => ({ ...t, _type: "ticket" })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (activeTicket) {
    return (
      <TicketThread
        ticket={activeTicket}
        profile={profile}
        onStatusChange={(id, status) =>
          setTickets((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status } : t)),
          )
        }
        onClose={() => setActiveTicket(null)}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: T.font,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${T.ink150}`,
          background: T.ink075,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: T.font,
            fontSize: 16,
            fontWeight: 600,
            color: T.ink900,
          }}
        >
          {profile?.full_name || "Anonymous"}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.ink400,
            marginTop: 2,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {profile?.email && <span>{profile.email}</span>}
          {profile?.phone && <span>{profile.phone}</span>}
          {profile?.loyalty_tier && (
            <span style={{ textTransform: "capitalize" }}>
              {profile.loyalty_tier} · {profile.loyalty_points || 0} pts
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
          <div style={{ textAlign: "center", padding: 40, color: T.ink400 }}>
            Loading thread…
          </div>
        ) : timeline.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: T.ink400 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: T.accent,
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
              const sc = STATUS_COLOURS[item.status] || STATUS_COLOURS.open;
              return (
                <div
                  key={`ticket-${item.id}`}
                  onClick={() => setActiveTicket(item)}
                  style={{
                    background: "#f5f0ff",
                    border: `1px solid #d8ccff`,
                    borderLeft: `3px solid #7b68ee`,
                    borderRadius: 6,
                    padding: "12px 16px",
                    cursor: "pointer",
                    transition: "box-shadow 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow = T.shadowMd)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow = "none")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#7b68ee",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontFamily: T.font,
                        }}
                      >
                        Support Ticket
                      </span>
                      {item.ticket_number && (
                        <span
                          style={{
                            fontSize: 10,
                            color: T.ink400,
                            marginLeft: 8,
                            fontFamily: "monospace",
                          }}
                        >
                          {item.ticket_number}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 8px",
                          borderRadius: 20,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: sc.bg,
                          color: sc.text,
                          fontFamily: T.font,
                        }}
                      >
                        {item.status?.replace("_", " ")}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: T.ink400,
                          fontFamily: T.font,
                        }}
                      >
                        {fmtTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.ink700,
                      marginBottom: 2,
                      fontFamily: T.font,
                    }}
                  >
                    {item.subject}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#7b68ee",
                      marginTop: 4,
                      fontFamily: T.font,
                    }}
                  >
                    Click to open thread →
                  </div>
                </div>
              );
            }
            const isOutbound = item.direction === "outbound";
            const meta = msgTypeMeta[item.message_type] || msgTypeMeta.general;
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
                    color: T.ink400,
                    marginBottom: 3,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: isOutbound ? "flex-end" : "flex-start",
                    fontFamily: T.font,
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
                    background: isOutbound ? T.accent : "#fff",
                    color: isOutbound ? "#fff" : T.ink700,
                    border: `1px solid ${isOutbound ? T.accent : T.ink150}`,
                    borderRadius: isOutbound
                      ? "12px 12px 4px 12px"
                      : "12px 12px 12px 4px",
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    fontFamily: T.font,
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
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: toast.ok ? T.successBg : T.dangerBg,
            color: toast.ok ? T.success : T.danger,
            fontFamily: T.font,
          }}
        >
          {toast.ok ? "✓" : "⚠"} {toast.msg}
        </div>
      )}

      {/* Reply */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: `1px solid ${T.ink150}`,
          background: "#fff",
          flexShrink: 0,
        }}
      >
        {showTemplates && (
          <div style={{ marginBottom: 10, display: "grid", gap: 5 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.ink400,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 2,
                fontFamily: T.font,
              }}
            >
              Response Templates
            </div>
            {RESPONSE_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  setReplyBody(t.body);
                  setShowTemplates(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "7px 11px",
                  background: T.ink075,
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  color: T.ink700,
                  fontFamily: T.font,
                }}
              >
                {t.icon} <strong>{t.label}</strong> — {t.body.slice(0, 55)}…
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            rows={2}
            placeholder="Type your reply… (Ctrl+Enter to send)"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleSend();
            }}
            style={{ ...sInp, resize: "none", flex: 1, fontSize: 13 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <button
              onClick={() => setShowTemplates((s) => !s)}
              style={{
                ...sBtn("transparent", T.ink400),
                padding: "6px 10px",
                fontSize: 9,
              }}
            >
              📝
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !replyBody.trim()}
              style={{
                ...sBtn(T.accent, "#fff", sending || !replyBody.trim()),
                padding: "8px 14px",
              }}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHOLESALE THREAD
// ═══════════════════════════════════════════════════════════════════════════════
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
    const unread = (data || []).filter(
      (m) => m.direction === "inbound" && !m.read_at,
    );
    if (unread.length > 0)
      await supabase
        .from("wholesale_messages")
        .update({ read_at: new Date().toISOString() })
        .in(
          "id",
          unread.map((m) => m.id),
        );
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: T.font,
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${T.ink150}`,
          background: T.ink075,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: T.font,
            fontSize: 16,
            fontWeight: 600,
            color: T.ink900,
          }}
        >
          🏪 {partner.name}
        </div>
        {partner.contact_name && (
          <div style={{ fontSize: 11, color: T.ink400, marginTop: 2 }}>
            Contact: {partner.contact_name}
          </div>
        )}
      </div>
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
          <div style={{ textAlign: "center", padding: 40, color: T.ink400 }}>
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: T.ink400 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏪</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: T.accent,
                marginBottom: 4,
              }}
            >
              No messages yet with {partner.name}
            </div>
            <div style={{ fontSize: 12 }}>Send the first message below.</div>
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
                    color: T.ink400,
                    marginBottom: 3,
                    textAlign: isOutbound ? "right" : "left",
                    fontFamily: T.font,
                  }}
                >
                  {isOutbound ? msg.sent_by_name || "Admin" : partner.name} ·{" "}
                  {fmtTime(msg.created_at)}
                </div>
                <div
                  style={{
                    background: isOutbound ? T.info : "#fff",
                    color: isOutbound ? "#fff" : T.ink700,
                    border: `1px solid ${isOutbound ? T.info : T.ink150}`,
                    borderRadius: isOutbound
                      ? "12px 12px 4px 12px"
                      : "12px 12px 12px 4px",
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    fontFamily: T.font,
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
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: toast.ok ? T.successBg : T.dangerBg,
            color: toast.ok ? T.success : T.danger,
            fontFamily: T.font,
          }}
        >
          {toast.ok ? "✓" : "⚠"} {toast.msg}
        </div>
      )}
      <div
        style={{
          padding: "14px 20px",
          borderTop: `1px solid ${T.ink150}`,
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            rows={2}
            placeholder="Message wholesale partner… (Ctrl+Enter)"
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
              ...sBtn(T.info, "#fff", sending || !replyBody.trim()),
              padding: "8px 14px",
            }}
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
        <div
          style={{
            fontSize: 10,
            color: T.ink400,
            marginTop: 4,
            fontFamily: T.font,
          }}
        >
          Admin/HQ only · Not visible to customers
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function TemplatesPanel() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("message_templates")
      .select("*")
      .order("trigger_type");
    setTemplates(data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, created_at, ...fields } = editing;
    if (id) {
      await supabase.from("message_templates").update(fields).eq("id", id);
    } else {
      await supabase.from("message_templates").insert(fields);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load();
    setEditing(null);
  };

  const fldLabel = (text) => (
    <label
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: T.ink400,
        display: "block",
        marginBottom: 6,
        fontFamily: T.font,
      }}
    >
      {text}
    </label>
  );

  if (editing)
    return (
      <div style={{ maxWidth: 700, fontFamily: T.font }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <button
            onClick={() => setEditing(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.ink400,
              fontSize: 20,
              padding: 0,
            }}
          >
            ←
          </button>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.ink900 }}>
            {editing.id ? "Edit Template" : "New Template"}
          </div>
        </div>
        {[
          ["name", "Admin Label"],
          ["trigger_type", "Trigger Type"],
          ["subject", "Email / Inbox Subject"],
        ].map(([field, lbl]) => (
          <div key={field} style={{ marginBottom: 14 }}>
            {fldLabel(lbl)}
            <input
              value={editing[field] || ""}
              onChange={(e) =>
                setEditing((p) => ({ ...p, [field]: e.target.value }))
              }
              style={sInp}
            />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          {fldLabel(
            "Message Content (supports {{first_name}} {{points}} {{tier}} {{code}} {{ticket_number}})",
          )}
          <textarea
            value={editing.content || ""}
            onChange={(e) =>
              setEditing((p) => ({ ...p, content: e.target.value }))
            }
            rows={10}
            style={{ ...sInp, resize: "vertical" }}
          />
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          {[
            ["send_inbox", "Send to Inbox"],
            ["send_whatsapp", "Send WhatsApp"],
            ["is_active", "Active"],
          ].map(([field, lbl]) => (
            <label
              key={field}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              <input
                type="checkbox"
                checked={!!editing[field]}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, [field]: e.target.checked }))
                }
              />
              {lbl}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setEditing(null)}
            style={sBtn("transparent", T.ink400)}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={sBtn(T.accent, "#fff", saving)}
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save Template"}
          </button>
        </div>
      </div>
    );

  return (
    <div style={{ fontFamily: T.font }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.ink900 }}>
            Message Templates
          </div>
          <div style={{ fontSize: 12, color: T.ink400, marginTop: 2 }}>
            Auto-replies, event notifications, system messages
          </div>
        </div>
        <button
          onClick={() =>
            setEditing({
              name: "",
              trigger_type: "",
              subject: "",
              content: "",
              send_whatsapp: false,
              send_inbox: true,
              is_active: true,
            })
          }
          style={sBtn(T.accent)}
        >
          + New Template
        </button>
      </div>
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: T.ink400 }}>
          Loading templates…
        </div>
      ) : templates.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            border: `1px dashed ${T.ink150}`,
            borderRadius: 8,
            color: T.ink400,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: T.accent,
              marginBottom: 4,
            }}
          >
            No templates yet
          </div>
          <div style={{ fontSize: 12 }}>
            Create auto-reply templates for ticket events, tier upgrades,
            referrals and more.
          </div>
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${T.ink150}`,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: T.shadow,
          }}
        >
          {templates.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom:
                  i < templates.length - 1 ? `1px solid ${T.ink150}` : "none",
                background: i % 2 === 0 ? "#fff" : T.ink050,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: t.is_active ? T.success : T.ink300,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.ink900,
                    fontFamily: T.font,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink400,
                    marginTop: 2,
                    fontFamily: T.font,
                  }}
                >
                  {TRIGGER_LABELS[t.trigger_type] || t.trigger_type}
                  {t.send_whatsapp && (
                    <span style={{ marginLeft: 8, color: T.success }}>
                      · WhatsApp
                    </span>
                  )}
                  {t.send_inbox && (
                    <span style={{ marginLeft: 8, color: T.info }}>
                      · Inbox
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditing({ ...t })}
                style={sBtn("transparent", T.ink400)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BROADCAST PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function BroadcastPanel() {
  const [tier, setTier] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");

  const loadPreview = useCallback(async () => {
    const q = supabase
      .from("user_profiles")
      .select("id,full_name,loyalty_tier,email")
      .eq("email_marketing", true);
    if (tier !== "all") q.eq("loyalty_tier", tier);
    const { data } = await q.limit(5);
    setPreview(data || []);
  }, [tier]);
  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const send = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const q = supabase
        .from("user_profiles")
        .select("id,full_name")
        .eq("email_marketing", true);
      if (tier !== "all") q.eq("loyalty_tier", tier);
      const { data: recipients } = await q;
      const rows = (recipients || []).map((r) => ({
        user_id: r.id,
        direction: "outbound",
        message_type: "broadcast",
        subject: subject.trim(),
        body: body
          .trim()
          .replace("{{first_name}}", r.full_name?.split(" ")[0] || "there"),
        sent_by_name: "Protea Botanicals",
        metadata: {},
      }));
      for (let i = 0; i < rows.length; i += 50)
        await supabase.from("customer_messages").insert(rows.slice(i, i + 50));
      setSent(rows.length);
      setSubject("");
      setBody("");
    } catch (err) {
      setError("Broadcast failed. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const fldLabel = (text) => (
    <label
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: T.ink400,
        display: "block",
        marginBottom: 6,
        fontFamily: T.font,
      }}
    >
      {text}
    </label>
  );

  return (
    <div style={{ maxWidth: 640, fontFamily: T.font }}>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: T.ink900,
          marginBottom: 4,
        }}
      >
        Broadcast Message
      </div>
      <div style={{ fontSize: 12, color: T.ink400, marginBottom: 20 }}>
        Send to opted-in customers (inbox delivery). Use {"{{first_name}}"} for
        personalisation.
      </div>
      {sent && (
        <div
          style={{
            background: T.successBg,
            border: `1px solid ${T.successBd}`,
            borderRadius: 6,
            padding: "12px 16px",
            fontSize: 13,
            color: T.success,
            marginBottom: 16,
          }}
        >
          Broadcast sent to {sent} customer{sent !== 1 ? "s" : ""}.
          <button
            onClick={() => setSent(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.ink400,
              marginLeft: 12,
              fontSize: 11,
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        {fldLabel("Target Tier")}
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          style={sInp}
        >
          <option value="all">All Customers (opted-in)</option>
          <option value="Bronze">Bronze Tier Only</option>
          <option value="Silver">Silver Tier Only</option>
          <option value="Gold">Gold Tier Only</option>
          <option value="Platinum">Platinum Tier Only</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        {fldLabel("Subject")}
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Double Points This Weekend"
          style={sInp}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        {fldLabel("Message")}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder={
            "Hi {{first_name}},\n\nExciting news from Protea Botanicals..."
          }
          style={{ ...sInp, resize: "vertical" }}
        />
      </div>
      {preview.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 14px",
            background: T.ink075,
            border: `1px solid ${T.ink150}`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.ink400,
              marginBottom: 8,
              fontFamily: T.font,
            }}
          >
            Sample recipients (first 5)
          </div>
          {preview.map((p) => (
            <div
              key={p.id}
              style={{
                fontSize: 12,
                color: T.ink700,
                padding: "2px 0",
                fontFamily: T.font,
              }}
            >
              {p.full_name || "—"} · {p.loyalty_tier || "Bronze"}
            </div>
          ))}
        </div>
      )}
      {error && (
        <div
          style={{
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 6,
            padding: "10px 14px",
            fontSize: 13,
            color: T.danger,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      <button
        onClick={send}
        disabled={sending}
        style={sBtn(sending ? T.ink300 : T.accent, "#fff", sending)}
      >
        {sending ? "Sending…" : "Send Broadcast"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL TABS (underline style)
// ═══════════════════════════════════════════════════════════════════════════════
function ChannelTabs({
  channel,
  setChannel,
  custUnread,
  partUnread,
  onRefresh,
}) {
  const tabs = [
    { id: "customers", label: "Customers", badge: custUnread },
    { id: "wholesale", label: "Wholesale", badge: partUnread },
    { id: "templates", label: "Templates", badge: 0 },
    { id: "broadcast", label: "Broadcast", badge: 0 },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderBottom: `2px solid ${T.ink150}`,
        flexWrap: "wrap",
      }}
    >
      {tabs.map((ch) => (
        <button
          key={ch.id}
          onClick={() => setChannel(ch.id)}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "none",
            borderBottom:
              channel === ch.id
                ? `2px solid ${T.accent}`
                : "2px solid transparent",
            marginBottom: -2,
            fontFamily: T.font,
            fontSize: 11,
            fontWeight: channel === ch.id ? 700 : 400,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: channel === ch.id ? T.accent : T.ink400,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          {ch.label}
          {ch.badge > 0 && (
            <span
              style={{
                background: T.danger,
                color: "#fff",
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
      <button
        onClick={onRefresh}
        style={{
          ...sBtn("transparent", T.ink400),
          padding: "8px 12px",
          marginLeft: 8,
          marginBottom: 2,
        }}
      >
        ↻
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCommsCenter({ tenantId: tenantIdProp } = {}) {
  const { tenantId: ctxTenantId } = useTenant();
  const tenantId = tenantIdProp || ctxTenantId;
  const ctx = usePageContext("comms", null);

  const [channel, setChannel] = useState("customers");
  const [adminUser, setAdminUser] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [custLoading, setCustLoading] = useState(true);
  const [custSearch, setCustSearch] = useState("");
  const [custUnread, setCustUnread] = useState(0);
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partLoading, setPartLoading] = useState(true);
  const [partUnread, setPartUnread] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAdminUser(user));
  }, []);

  const fetchCustomerList = useCallback(async () => {
    setCustLoading(true);
    try {
      const [msgRes, tickRes] = await Promise.all([
        supabase
          .from("customer_messages")
          .select("user_id,direction,read_at,created_at,body,message_type")
          .eq("tenant_id", tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3")
          .order("created_at", { ascending: false }),
        supabase
          .from("support_tickets")
          .select("user_id,status,created_at,subject,ticket_number")
          .eq("tenant_id", tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3")
          .order("created_at", { ascending: false }),
      ]);
      const msgs = msgRes.data || [],
        ticks = tickRes.data || [];
      const userMap = {};
      msgs.forEach((m) => {
        if (!m.user_id) return;
        if (!userMap[m.user_id])
          userMap[m.user_id] = {
            user_id: m.user_id,
            lastActivity: m.created_at,
            unread: 0,
            openTickets: 0,
            lastMessage: "",
          };
        if (m.direction === "inbound" && !m.read_at)
          userMap[m.user_id].unread++;
        if (
          new Date(m.created_at) >
          new Date(userMap[m.user_id].lastActivity || 0)
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
            openTickets: 0,
            lastMessage: "",
          };
        if (["open", "pending_reply"].includes(t.status))
          userMap[t.user_id].openTickets++;
        if (
          new Date(t.created_at) >
          new Date(userMap[t.user_id].lastActivity || 0)
        ) {
          userMap[t.user_id].lastActivity = t.created_at;
          userMap[t.user_id].lastMessage = t.subject || "";
        }
      });
      const userIds = Object.keys(userMap);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id,full_name,email,phone,loyalty_tier,loyalty_points")
          .in("id", userIds);
        (profiles || []).forEach((p) => {
          if (userMap[p.id]) userMap[p.id].profile = p;
        });
      }
      const list = Object.values(userMap).sort(
        (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity),
      );
      setCustomerList(list);
      setCustUnread(list.reduce((s, c) => s + c.unread, 0));
    } catch (err) {
      console.error("[AdminCommsCenter] Customer list:", err);
    } finally {
      setCustLoading(false);
    }
  }, []);

  const fetchPartners = useCallback(async () => {
    setPartLoading(true);
    try {
      const { data: partnerData } = await supabase
        .from("wholesale_partners")
        .select("id,name,contact_name,contact_email,contact_phone")
        .eq("is_active", true)
        .order("name");
      const { data: wMsgs } = await supabase
        .from("wholesale_messages")
        .select("partner_id,read_at,direction,created_at,body")
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
          new Date(m.created_at) >
          new Date(msgMap[m.partner_id].lastActivity || 0)
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
      console.error("[AdminCommsCenter] Partner list:", err);
    } finally {
      setPartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerList();
    fetchPartners();
  }, [fetchCustomerList, fetchPartners]);

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

  const headerRow = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 10,
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
          Comms Centre
        </h2>
        <div style={{ fontSize: 13, color: T.ink400 }}>
          Customer messages · Support tickets · Wholesale comms
        </div>
      </div>
    </div>
  );

  if (channel === "templates")
    return (
      <div style={{ fontFamily: T.font }}>
        <WorkflowGuide
          context={ctx}
          tabId="comms"
          onAction={() => {}}
          defaultOpen={true}
        />
        {headerRow}
        <ChannelTabs
          channel={channel}
          setChannel={setChannel}
          custUnread={custUnread}
          partUnread={partUnread}
          onRefresh={() => {
            fetchCustomerList();
            fetchPartners();
          }}
        />
        <div style={{ marginTop: 28 }}>
          <TemplatesPanel />
        </div>
      </div>
    );

  if (channel === "broadcast")
    return (
      <div style={{ fontFamily: T.font }}>
        <WorkflowGuide
          context={ctx}
          tabId="comms"
          onAction={() => {}}
          defaultOpen={true}
        />
        {headerRow}
        <ChannelTabs
          channel={channel}
          setChannel={setChannel}
          custUnread={custUnread}
          partUnread={partUnread}
          onRefresh={() => {
            fetchCustomerList();
            fetchPartners();
          }}
        />
        <div style={{ marginTop: 28 }}>
          <BroadcastPanel />
        </div>
      </div>
    );

  return (
    <div style={{ fontFamily: T.font }}>
      <WorkflowGuide
        context={ctx}
        tabId="comms"
        onAction={() => {}}
        defaultOpen={true}
      />
      {headerRow}

      {/* ── WP-VIZ: flush stat grid + charts ── */}
      {!custLoading && (
        <>
          {/* Flush stat grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
              gap: "1px",
              background: T.ink150,
              borderRadius: 8,
              overflow: "hidden",
              border: `1px solid ${T.ink150}`,
              boxShadow: T.shadow,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: "Conversations",
                value: customerList.length,
                color: T.accent,
              },
              {
                label: "Unread",
                value: custUnread,
                color: custUnread > 0 ? T.danger : T.ink400,
              },
              {
                label: "Open Tickets",
                value: customerList.reduce((s, c) => s + c.openTickets, 0),
                color: T.warning,
              },
              { label: "Partners", value: partners.length, color: T.info },
              {
                label: "Partner Unread",
                value: partUnread,
                color: partUnread > 0 ? T.danger : T.ink400,
              },
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
                    color: T.ink400,
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

          {/* Charts — only when there's data */}
          {customerList.length > 0 &&
            (() => {
              // Donut — customer activity status
              const withUnread = customerList.filter(
                (c) => c.unread > 0,
              ).length;
              const withTickets = customerList.filter(
                (c) => c.openTickets > 0 && c.unread === 0,
              ).length;
              const clean = customerList.filter(
                (c) => c.unread === 0 && c.openTickets === 0,
              ).length;
              const activityDonut = [
                { name: "Unread Messages", value: withUnread, color: T.danger },
                { name: "Open Tickets", value: withTickets, color: T.warning },
                { name: "Up to Date", value: clean, color: T.success },
              ].filter((d) => d.value > 0);

              // HBar — top customers by combined activity (unread + open tickets)
              const topCusts = [...customerList]
                .map((c) => ({
                  name: (
                    c.profile?.full_name ||
                    c.profile?.email ||
                    "Anon"
                  ).slice(0, 16),
                  score: c.unread * 2 + c.openTickets,
                }))
                .filter((d) => d.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 7);
              const topMax = Math.max(...topCusts.map((d) => d.score), 1);

              if (activityDonut.length === 0) return null;
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  {/* Activity donut */}
                  <ChartCard title="Customer Conversation Status" height={180}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activityDonut}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={68}
                          paddingAngle={3}
                          isAnimationActive={false}
                        >
                          {activityDonut.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={
                            <ChartTooltip formatter={(v) => `${v} customers`} />
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Top customers needing attention */}
                  <ChartCard
                    title="Needs Attention (Top Customers)"
                    height={180}
                  >
                    {topCusts.length === 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          fontSize: 13,
                          color: T.success,
                          fontFamily: T.font,
                        }}
                      >
                        All conversations up to date
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "8px 4px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          height: "100%",
                          justifyContent: "center",
                        }}
                      >
                        {topCusts.map((d) => (
                          <div
                            key={d.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: T.ink700,
                                fontFamily: T.font,
                                width: 90,
                                flexShrink: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.name}
                            </span>
                            <div
                              style={{
                                flex: 1,
                                height: 14,
                                background: T.ink075,
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${(d.score / topMax) * 100}%`,
                                  background:
                                    d.score >= 4 ? T.danger : T.warning,
                                  borderRadius: 3,
                                  transition: "width 0.5s",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                color: T.ink400,
                                fontFamily: T.font,
                                minWidth: 16,
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {d.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>
                </div>
              );
            })()}
        </>
      )}

      <ChannelTabs
        channel={channel}
        setChannel={setChannel}
        custUnread={custUnread}
        partUnread={partUnread}
        onRefresh={() => {
          fetchCustomerList();
          fetchPartners();
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 0,
          border: `1px solid ${T.ink150}`,
          borderRadius: 8,
          overflow: "hidden",
          minHeight: 560,
          marginTop: 20,
          boxShadow: T.shadow,
        }}
      >
        {/* LEFT PANEL */}
        <div
          style={{
            borderRight: `1px solid ${T.ink150}`,
            display: "flex",
            flexDirection: "column",
            background: T.ink050,
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${T.ink150}`,
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
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* CUSTOMERS list */}
            {channel === "customers" &&
              (custLoading ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: T.ink400,
                    fontSize: 12,
                  }}
                >
                  Loading…
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div
                  style={{ padding: 24, textAlign: "center", color: T.ink400 }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                  <div style={{ fontSize: 12 }}>
                    No customers with messages yet.
                  </div>
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const p = c.profile,
                    isSelected = selectedCustomer?.user_id === c.user_id;
                  return (
                    <div
                      key={c.user_id}
                      onClick={() => setSelectedCustomer(c)}
                      style={{
                        padding: "12px 14px",
                        borderBottom: `1px solid ${T.ink150}`,
                        cursor: "pointer",
                        background: isSelected ? T.accentLit : "transparent",
                        borderLeft: isSelected
                          ? `3px solid ${T.accent}`
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
                              color: T.ink900,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontFamily: T.font,
                            }}
                          >
                            {p?.full_name || "Anonymous"}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: T.ink400,
                              marginTop: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontFamily: T.font,
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
                                  borderRadius: 4,
                                  background: T.dangerBg,
                                  color: T.danger,
                                  fontWeight: 700,
                                  fontFamily: T.font,
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
                                  borderRadius: 4,
                                  background: T.warningBg,
                                  color: T.warning,
                                  textTransform: "capitalize",
                                  fontFamily: T.font,
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
                                background: T.danger,
                                color: "#fff",
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
                          <div
                            style={{
                              fontSize: 10,
                              color: T.ink400,
                              fontFamily: T.font,
                            }}
                          >
                            {fmtTime(c.lastActivity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}
            {/* WHOLESALE list */}
            {channel === "wholesale" &&
              (partLoading ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: T.ink400,
                    fontSize: 12,
                  }}
                >
                  Loading…
                </div>
              ) : partners.length === 0 ? (
                <div
                  style={{ padding: 24, textAlign: "center", color: T.ink400 }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🏪</div>
                  <div style={{ fontSize: 12 }}>
                    No active wholesale partners.
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
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
                        borderBottom: `1px solid ${T.ink150}`,
                        cursor: "pointer",
                        background: isSelected ? T.infoBg : "transparent",
                        borderLeft: isSelected
                          ? `3px solid ${T.info}`
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
                              color: T.ink900,
                              fontFamily: T.font,
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: T.ink400,
                              marginTop: 1,
                              fontFamily: T.font,
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
                                background: T.danger,
                                color: "#fff",
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
                            <div
                              style={{
                                fontSize: 10,
                                color: T.ink400,
                                fontFamily: T.font,
                              }}
                            >
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

        {/* RIGHT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {channel === "customers" && !selectedCustomer && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: T.ink400,
                padding: 40,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: T.accent,
                  marginBottom: 8,
                  fontFamily: T.font,
                }}
              >
                Select a customer
              </div>
              <div
                style={{
                  fontSize: 13,
                  maxWidth: 300,
                  lineHeight: 1.7,
                  fontFamily: T.font,
                  color: T.ink400,
                }}
              >
                Click any customer on the left to view their full message and
                support ticket history in one unified thread.
              </div>
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
                color: T.ink400,
                padding: 40,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: T.accent,
                  marginBottom: 8,
                  fontFamily: T.font,
                }}
              >
                Select a wholesale partner
              </div>
              <div
                style={{
                  fontSize: 13,
                  maxWidth: 300,
                  lineHeight: 1.7,
                  fontFamily: T.font,
                  color: T.ink400,
                }}
              >
                Private comms channel — visible to Admin and HQ only, not to
                retail customers.
              </div>
              <div
                style={{
                  marginTop: 20,
                  padding: "12px 16px",
                  background: T.infoBg,
                  border: `1px solid ${T.infoBd}`,
                  borderRadius: 6,
                  fontSize: 12,
                  color: T.info,
                  maxWidth: 320,
                  fontFamily: T.font,
                }}
              >
                Wholesale partner messages are stored in a separate table —
                complete data isolation.
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
