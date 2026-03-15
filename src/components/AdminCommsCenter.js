// src/components/AdminCommsCenter.js v1.1
// WP-U: Unified Comms Centre
// v1.1 — Added full ticket thread support (ticket_messages table), status management,
//         auto-reply on resolve via message_templates, Templates panel,
//         tier-targeted Broadcast with email_marketing opt-in filter.
//         Wholesale channel retained from v1.0.
//
// Tables used:
//   customer_messages    — existing (admin messages + customer queries)
//   support_tickets      — existing (structured tickets with PB-SUP-XXXXX)
//   ticket_messages      — existing (threaded replies per ticket)
//   message_templates    — existing (auto-reply templates)
//   wholesale_messages   — new (WP-U SQL step)
//   wholesale_partners   — existing
//   user_profiles        — existing

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  green: "#1b4332", mid: "#2d6a4f", accent: "#52b788", gold: "#b5935a",
  cream: "#faf9f6", warm: "#f4f0e8", white: "#fff", border: "#e0dbd2",
  muted: "#888", text: "#1a1a1a", red: "#c0392b", lightRed: "#fdf0ef",
  blue: "#2c4a6e", lightBlue: "#eaf0f8", lightGreen: "#eafaf1",
  lightGold: "#fef9e7", orange: "#e67e22", success: "#27ae60",
  purple: "#6A1B9A",
};
const F = { heading: "'Cormorant Garamond', Georgia, serif", body: "'Jost', sans-serif" };
const sBtn = (bg = C.green, color = C.white, disabled = false) => ({
  padding: "8px 16px", background: disabled ? "#ccc" : bg, color,
  border: bg === "transparent" ? `1px solid ${C.border}` : "none",
  borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
  textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: F.body,
});
const sInp = {
  padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 2,
  fontSize: 13, fontFamily: F.body, background: C.white, color: C.text,
  outline: "none", width: "100%", boxSizing: "border-box",
};

const STATUS_COLOURS = {
  open: { bg: "#E3F2FD", text: "#1565C0" },
  pending_reply: { bg: "#FFF8E1", text: "#F57F17" },
  resolved: { bg: "#E8F5E9", text: "#27ae60" },
  closed: { bg: "#F5F5F5", text: "#888" },
};
const TICKET_STATUSES = ["open", "pending_reply", "resolved", "closed"];

const RESPONSE_TEMPLATES = [
  { label: "Device Issue", icon: "🔧", body: "Thank you for reaching out about your device. We're sorry to hear you're experiencing an issue. Could you please describe the problem in detail and include your batch number (found on the product label)? We'll assess whether a replacement is warranted and get back to you within 24 hours." },
  { label: "Order Not Received", icon: "📦", body: "We sincerely apologise for this inconvenience. Please provide your order number and the address it was shipped to, and we'll investigate with our courier immediately. We aim to resolve delivery issues within 48 hours." },
  { label: "Quality Concern", icon: "🌿", body: "Thank you for flagging this — product quality is our highest priority. Please share your batch number (on the label) and a description of the concern. Our quality team will review and follow up with you directly." },
  { label: "Points Query", icon: "⭐", body: "Loyalty points are awarded automatically after each verified QR scan. If you believe there's a discrepancy, please share your registered email address and we'll review your scan history and correct any errors promptly." },
  { label: "General Reply", icon: "💬", body: "Thank you for contacting Protea Botanicals. We've received your message and a member of our team will follow up with you shortly. Our standard response time is within 24 hours on business days." },
];

function fmtTime(ts) {
  if (!ts) return "—";
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKET THREAD — full ticket_messages view with status + auto-reply
// ─────────────────────────────────────────────────────────────────────────────
function TicketThread({ ticket, profile, onStatusChange, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    setMessages(data || []);
    // Mark customer messages read
    const unread = (data || []).filter(m => m.sender_type === "customer" && !m.read_at);
    if (unread.length) {
      await supabase.from("ticket_messages").update({ read_at: new Date().toISOString() }).in("id", unread.map(m => m.id));
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    setLoading(false);
  }, [ticket.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime for new ticket messages
  useEffect(() => {
    const chan = supabase.channel(`ticket-thread-${ticket.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticket.id}` },
        (payload) => { setMessages(prev => [...prev, payload.new]); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); })
      .subscribe();
    return () => supabase.removeChannel(chan);
  }, [ticket.id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("ticket_messages").insert({ ticket_id: ticket.id, sender_type: "admin", sender_id: user.id, content: reply.trim() });
      // Mirror to customer_messages inbox
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
      await supabase.from("support_tickets").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", ticket.id);
      setStatus(newStatus);
      onStatusChange?.(ticket.id, newStatus);
      setReply("");
    } catch (err) { console.error("[TicketThread] sendReply:", err); }
    finally { setSending(false); }
  };

  const handleSetStatus = async (newStatus) => {
    const update = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "resolved") update.resolved_at = new Date().toISOString();
    await supabase.from("support_tickets").update(update).eq("id", ticket.id);
    setStatus(newStatus);
    onStatusChange?.(ticket.id, newStatus);
    // Auto-reply on resolve from message_templates
    if (newStatus === "resolved") {
      const { data: tmpl } = await supabase.from("message_templates").select("*").eq("trigger_type", "ticket_resolved").eq("is_active", true).maybeSingle();
      if (tmpl && ticket.user_id) {
        const vars = { first_name: profile?.full_name?.split(" ")[0] || "there", ticket_number: ticket.ticket_number || "" };
        const content = (tmpl.content || "").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
        const subject = (tmpl.subject || "").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
        await supabase.from("ticket_messages").insert({ ticket_id: ticket.id, sender_type: "auto", content });
        await supabase.from("customer_messages").insert({
          user_id: ticket.user_id, direction: "outbound", message_type: "support_reply",
          subject, body: content, sent_by_name: "Auto-reply", metadata: { ticket_id: ticket.id },
        });
        loadMessages();
      }
    }
  };

  const sc = STATUS_COLOURS[status] || STATUS_COLOURS.open;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.warm, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontFamily: F.heading, fontSize: 17, color: C.green }}>{ticket.subject}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {profile?.full_name || "Customer"} · {ticket.ticket_number}
              {ticket.category && ` · ${ticket.category}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            {TICKET_STATUSES.map(s => (
              <button key={s} onClick={() => handleSetStatus(s)} style={{ padding: "4px 9px", border: `1px solid ${status === s ? C.mid : C.border}`, background: status === s ? C.mid : C.white, color: status === s ? C.white : C.muted, borderRadius: 2, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: F.body, cursor: "pointer" }}>
                {s.replace("_", " ")}
              </button>
            ))}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 16, padding: "0 4px" }}>✕</button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 32, color: C.muted }}>Loading thread…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: C.muted, fontSize: 12 }}>No messages in this ticket yet.</div>
        ) : (
          messages.map((m) => {
            const isCustomer = m.sender_type === "customer";
            const isAuto = m.sender_type === "auto";
            return (
              <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: isCustomer ? C.warm : isAuto ? C.accent : C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isAuto ? 12 : 11, color: isCustomer ? C.text : C.white, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                  {isAuto ? "🤖" : isCustomer ? (profile?.full_name?.[0] || "C") : "PB"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{isCustomer ? (profile?.full_name || "Customer") : isAuto ? "Auto-reply" : "Support Team"}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>{fmtTime(m.created_at)}</span>
                  </div>
                  <div style={{ background: isCustomer ? C.cream : isAuto ? C.lightGreen : C.white, border: `1px solid ${C.border}`, borderRadius: "2px 12px 12px 12px", padding: "10px 14px", fontSize: 13, lineHeight: 1.7, color: C.text, whiteSpace: "pre-wrap" }}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: C.white, flexShrink: 0 }}>
        {showTemplates && (
          <div style={{ marginBottom: 10, display: "grid", gap: 5 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 2 }}>Quick Templates</div>
            {RESPONSE_TEMPLATES.map(t => (
              <button key={t.label} onClick={() => { setReply(t.body); setShowTemplates(false); }} style={{ textAlign: "left", padding: "7px 11px", background: C.cream, border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer", fontSize: 12, color: C.text, fontFamily: F.body }}>
                {t.icon} <strong>{t.label}</strong>
              </button>
            ))}
          </div>
        )}
        <textarea rows={2} placeholder="Type your reply to the customer…" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) sendReply(); }} style={{ ...sInp, resize: "none", marginBottom: 8, fontSize: 13 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={sendReply} disabled={sending || !reply.trim()} style={sBtn(C.green, C.white, sending || !reply.trim())}>{sending ? "Sending…" : "Send Reply"}</button>
          <button onClick={() => handleSetStatus("resolved")} style={sBtn(C.success)}>✓ Resolve</button>
          <button onClick={() => setShowTemplates(s => !s)} style={sBtn("transparent", C.muted)}>📝 Templates</button>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>Ctrl+Enter to send · Replies mirror to customer inbox</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER THREAD — customer_messages + support_tickets in unified timeline
// Clicking a ticket card opens TicketThread inline
// ─────────────────────────────────────────────────────────────────────────────
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

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchThread = useCallback(async () => {
    setLoading(true);
    const [msgRes, tickRes] = await Promise.all([
      supabase.from("customer_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("support_tickets").select("id, ticket_number, subject, status, created_at, updated_at, user_id, category").eq("user_id", userId).order("created_at", { ascending: true }),
    ]);
    setMessages(msgRes.data || []);
    setTickets(tickRes.data || []);
    // Mark outbound unread as read
    const unread = (msgRes.data || []).filter(m => m.direction === "outbound" && !m.read_at);
    if (unread.length > 0) {
      await supabase.from("customer_messages").update({ read_at: new Date().toISOString() }).in("id", unread.map(m => m.id));
      onUnreadCleared?.();
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [userId, onUnreadCleared]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  const handleSend = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    const { error } = await supabase.from("customer_messages").insert({
      user_id: userId, direction: "outbound", message_type: "response",
      subject: "Re: Your message", body: replyBody.trim(),
      sent_by: adminUser?.id || null,
      sent_by_name: adminUser?.email?.split("@")[0] || "Admin",
      metadata: {},
    });
    if (error) { showToast("Failed to send: " + error.message, false); }
    else { setReplyBody(""); fetchThread(); showToast("Message sent"); }
    setSending(false);
  };

  // Build unified timeline
  const msgTypeMeta = {
    query: { label: "Query", icon: "💬", color: C.blue },
    fault: { label: "Fault", icon: "⚠️", color: C.red },
    response: { label: "Reply", icon: "↩️", color: C.mid },
    support_reply: { label: "Support Reply", icon: "↩️", color: C.mid },
    admin_notice: { label: "Notice", icon: "📢", color: C.mid },
    tier_upgrade: { label: "Tier Upgrade", icon: "🏆", color: C.purple },
    streak_bonus: { label: "Streak Bonus", icon: "🔥", color: C.gold },
    birthday: { label: "Birthday", icon: "🎂", color: C.gold },
    broadcast: { label: "Broadcast", icon: "📣", color: C.accent },
    general: { label: "Message", icon: "📩", color: C.muted },
  };

  const timeline = [
    ...(messages || []).map(m => ({ ...m, _type: "message" })),
    ...(tickets || []).map(t => ({ ...t, _type: "ticket" })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // If viewing a ticket thread, show TicketThread component
  if (activeTicket) {
    return (
      <TicketThread
        ticket={activeTicket}
        profile={profile}
        onStatusChange={(id, status) => {
          setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
        }}
        onClose={() => setActiveTicket(null)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.warm, flexShrink: 0 }}>
        <div style={{ fontFamily: F.heading, fontSize: 18, color: C.green }}>{profile?.full_name || "Anonymous"}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {profile?.email && <span>✉ {profile.email}</span>}
          {profile?.phone && <span>📱 {profile.phone}</span>}
          {profile?.loyalty_tier && <span style={{ textTransform: "capitalize" }}>🏅 {profile.loyalty_tier} · {profile.loyalty_points || 0} pts</span>}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading thread…</div>
        ) : timeline.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div style={{ fontFamily: F.heading, fontSize: 16, color: C.green, marginBottom: 4 }}>No messages yet</div>
            <div style={{ fontSize: 12 }}>Use the compose panel below to send the first message.</div>
          </div>
        ) : (
          timeline.map((item) => {
            if (item._type === "ticket") {
              const sc = STATUS_COLOURS[item.status] || STATUS_COLOURS.open;
              const openCount = tickets.filter(t => ["open","pending_reply"].includes(t.status)).length;
              return (
                <div key={`ticket-${item.id}`} onClick={() => setActiveTicket(item)}
                  style={{ background: "#f5f0ff", border: `1px solid #d8ccff`, borderLeft: `4px solid #7b68ee`, borderRadius: 2, padding: "12px 16px", cursor: "pointer", transition: "box-shadow 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#7b68ee", letterSpacing: "0.1em", textTransform: "uppercase" }}>🎫 Support Ticket</span>
                      {item.ticket_number && <span style={{ fontSize: 10, color: C.muted, marginLeft: 8, fontFamily: "monospace" }}>{item.ticket_number}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 2, fontWeight: 700, textTransform: "uppercase", background: sc.bg, color: sc.text }}>{item.status?.replace("_", " ")}</span>
                      <span style={{ fontSize: 10, color: C.muted }}>{fmtTime(item.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{item.subject}</div>
                  <div style={{ fontSize: 11, color: "#7b68ee", marginTop: 4 }}>Click to open thread →</div>
                </div>
              );
            }
            // customer_message
            const isOutbound = item.direction === "outbound";
            const meta = msgTypeMeta[item.message_type] || msgTypeMeta.general;
            return (
              <div key={`msg-${item.id}`} style={{ alignSelf: isOutbound ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, display: "flex", gap: 8, alignItems: "center", justifyContent: isOutbound ? "flex-end" : "flex-start" }}>
                  <span>{meta.icon} {meta.label}</span>
                  <span>{isOutbound ? (item.sent_by_name || "Admin") : (profile?.full_name || "Customer")}</span>
                  <span>{fmtTime(item.created_at)}</span>
                </div>
                <div style={{ background: isOutbound ? C.green : C.white, color: isOutbound ? C.white : C.text, border: `1px solid ${isOutbound ? C.green : C.border}`, borderRadius: isOutbound ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "10px 14px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {item.subject && <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, opacity: 0.85 }}>{item.subject}</div>}
                  {item.body || item.content || ""}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {toast && <div style={{ margin: "0 20px", padding: "8px 14px", borderRadius: 2, fontSize: 12, fontWeight: 600, background: toast.ok ? C.lightGreen : C.lightRed, color: toast.ok ? C.mid : C.red }}>{toast.ok ? "✓" : "⚠"} {toast.msg}</div>}

      {/* Compose */}
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: C.white, flexShrink: 0 }}>
        {showTemplates && (
          <div style={{ marginBottom: 10, display: "grid", gap: 5 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 2 }}>Response Templates</div>
            {RESPONSE_TEMPLATES.map(t => (
              <button key={t.label} onClick={() => { setReplyBody(t.body); setShowTemplates(false); }} style={{ textAlign: "left", padding: "7px 11px", background: C.cream, border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer", fontSize: 12, color: C.text, fontFamily: F.body }}>
                {t.icon} <strong>{t.label}</strong> — {t.body.slice(0, 55)}…
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea rows={2} placeholder="Type your reply… (Ctrl+Enter to send)" value={replyBody} onChange={e => setReplyBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSend(); }} style={{ ...sInp, resize: "none", flex: 1, fontSize: 13 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <button onClick={() => setShowTemplates(s => !s)} style={{ ...sBtn("transparent", C.muted), padding: "6px 10px", fontSize: 9 }}>📝</button>
            <button onClick={handleSend} disabled={sending || !replyBody.trim()} style={{ ...sBtn(C.green, C.white, sending || !replyBody.trim()), padding: "8px 14px" }}>{sending ? "…" : "Send"}</button>
          </div>
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

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchThread = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("wholesale_messages").select("*").eq("partner_id", partner.id).order("created_at", { ascending: true });
    setMessages(data || []);
    const unread = (data || []).filter(m => m.direction === "inbound" && !m.read_at);
    if (unread.length > 0) await supabase.from("wholesale_messages").update({ read_at: new Date().toISOString() }).in("id", unread.map(m => m.id));
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [partner.id]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  const handleSend = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    const { error } = await supabase.from("wholesale_messages").insert({
      partner_id: partner.id, direction: "outbound", message_type: "general",
      body: replyBody.trim(), sent_by: adminUser?.id || null,
      sent_by_name: adminUser?.email?.split("@")[0] || "Admin",
    });
    if (error) { showToast("Failed: " + error.message, false); }
    else { setReplyBody(""); fetchThread(); showToast("Message sent"); }
    setSending(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.warm, flexShrink: 0 }}>
        <div style={{ fontFamily: F.heading, fontSize: 18, color: C.green }}>🏪 {partner.name}</div>
        {partner.contact_name && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Contact: {partner.contact_name}</div>}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏪</div>
            <div style={{ fontFamily: F.heading, fontSize: 16, color: C.green, marginBottom: 4 }}>No messages yet with {partner.name}</div>
            <div style={{ fontSize: 12 }}>Send the first message below.</div>
          </div>
        ) : (
          messages.map(msg => {
            const isOutbound = msg.direction === "outbound";
            return (
              <div key={msg.id} style={{ alignSelf: isOutbound ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3, textAlign: isOutbound ? "right" : "left" }}>
                  {isOutbound ? (msg.sent_by_name || "Admin") : partner.name} · {fmtTime(msg.created_at)}
                </div>
                <div style={{ background: isOutbound ? C.blue : C.white, color: isOutbound ? C.white : C.text, border: `1px solid ${isOutbound ? C.blue : C.border}`, borderRadius: isOutbound ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "10px 14px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {msg.subject && <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, opacity: 0.85 }}>{msg.subject}</div>}
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {toast && <div style={{ margin: "0 20px", padding: "8px 14px", borderRadius: 2, fontSize: 12, fontWeight: 600, background: toast.ok ? C.lightGreen : C.lightRed, color: toast.ok ? C.mid : C.red }}>{toast.ok ? "✓" : "⚠"} {toast.msg}</div>}
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: C.white, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea rows={2} placeholder="Message wholesale partner… (Ctrl+Enter)" value={replyBody} onChange={e => setReplyBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSend(); }} style={{ ...sInp, resize: "none", flex: 1, fontSize: 13 }} />
          <button onClick={handleSend} disabled={sending || !replyBody.trim()} style={{ ...sBtn(C.blue, C.white, sending || !replyBody.trim()), padding: "8px 14px" }}>{sending ? "…" : "Send"}</button>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Admin/HQ only · Not visible to customers</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES PANEL — full CRUD for message_templates
// ─────────────────────────────────────────────────────────────────────────────
const TRIGGER_LABELS = {
  ticket_opened: "Ticket Opened (auto-reply)", ticket_resolved: "Ticket Resolved (auto-reply)",
  referral_redeemed: "Referral Code Used — Referrer", referral_welcome: "Referral Welcome — New Customer",
  tier_upgrade_silver: "Tier Upgrade → Silver", tier_upgrade_gold: "Tier Upgrade → Gold",
  tier_upgrade_platinum: "Tier Upgrade → Platinum", birthday_bonus: "Birthday Bonus",
  first_purchase: "First Purchase", streak_bonus: "Streak Bonus",
};

function TemplatesPanel() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("message_templates").select("*").order("trigger_type");
    setTemplates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, created_at, ...fields } = editing;
    if (id) { await supabase.from("message_templates").update(fields).eq("id", id); }
    else { await supabase.from("message_templates").insert(fields); }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load(); setEditing(null);
  };

  if (editing) return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 20, padding: 0 }}>←</button>
        <div style={{ fontFamily: F.heading, fontSize: 20, color: C.green }}>{editing.id ? "Edit Template" : "New Template"}</div>
      </div>
      {[["name","Admin Label"],["trigger_type","Trigger Type"],["subject","Email / Inbox Subject"]].map(([field, lbl]) => (
        <div key={field} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: C.accent, display: "block", marginBottom: 6 }}>{lbl}</label>
          <input value={editing[field] || ""} onChange={e => setEditing(p => ({ ...p, [field]: e.target.value }))} style={sInp} />
        </div>
      ))}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: C.accent, display: "block", marginBottom: 6 }}>
          Message Content (supports {"{{first_name}} {{points}} {{tier}} {{code}} {{ticket_number}}"})
        </label>
        <textarea value={editing.content || ""} onChange={e => setEditing(p => ({ ...p, content: e.target.value }))} rows={10} style={{ ...sInp, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[["send_inbox","Send to Inbox"],["send_whatsapp","Send WhatsApp"],["is_active","Active"]].map(([field, lbl]) => (
          <label key={field} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontFamily: F.body }}>
            <input type="checkbox" checked={!!editing[field]} onChange={e => setEditing(p => ({ ...p, [field]: e.target.checked }))} />
            {lbl}
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setEditing(null)} style={sBtn("transparent", C.muted)}>Cancel</button>
        <button onClick={save} disabled={saving} style={sBtn(C.green, C.white, saving)}>{saving ? "Saving…" : saved ? "✓ Saved" : "Save Template"}</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: F.heading, fontSize: 20, color: C.green }}>Message Templates</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Auto-replies, event notifications, system messages</div>
        </div>
        <button onClick={() => setEditing({ name: "", trigger_type: "", subject: "", content: "", send_whatsapp: false, send_inbox: true, is_active: true })} style={sBtn(C.green)}>+ New Template</button>
      </div>
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: C.muted }}>Loading templates…</div>
      ) : templates.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 2, color: C.muted }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
          <div style={{ fontFamily: F.heading, fontSize: 16, color: C.green, marginBottom: 4 }}>No templates yet</div>
          <div style={{ fontSize: 12 }}>Create auto-reply templates for ticket events, tier upgrades, referrals and more.</div>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 2, overflow: "hidden" }}>
          {templates.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < templates.length - 1 ? `1px solid ${C.border}` : "none", background: i % 2 === 0 ? C.white : C.cream }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.is_active ? C.success : C.muted, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {TRIGGER_LABELS[t.trigger_type] || t.trigger_type}
                  {t.send_whatsapp && <span style={{ marginLeft: 8, color: C.success }}>· WhatsApp</span>}
                  {t.send_inbox && <span style={{ marginLeft: 8, color: C.blue }}>· Inbox</span>}
                </div>
              </div>
              <button onClick={() => setEditing({ ...t })} style={sBtn("transparent", C.muted)}>Edit</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BROADCAST PANEL — tier-targeted, email_marketing opt-in, {{first_name}}
// ─────────────────────────────────────────────────────────────────────────────
function BroadcastPanel() {
  const [tier, setTier] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");

  const loadPreview = useCallback(async () => {
    const q = supabase.from("user_profiles").select("id, full_name, loyalty_tier, email").eq("email_marketing", true);
    if (tier !== "all") q.eq("loyalty_tier", tier);
    const { data } = await q.limit(5);
    setPreview(data || []);
  }, [tier]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const send = async () => {
    if (!subject.trim() || !body.trim()) { setError("Subject and message are required."); return; }
    setError(""); setSending(true);
    try {
      const q = supabase.from("user_profiles").select("id, full_name").eq("email_marketing", true);
      if (tier !== "all") q.eq("loyalty_tier", tier);
      const { data: recipients } = await q;
      const rows = (recipients || []).map(r => ({
        user_id: r.id, direction: "outbound", message_type: "broadcast",
        subject: subject.trim(),
        body: body.trim().replace("{{first_name}}", r.full_name?.split(" ")[0] || "there"),
        sent_by_name: "Protea Botanicals", metadata: {},
      }));
      for (let i = 0; i < rows.length; i += 50) {
        await supabase.from("customer_messages").insert(rows.slice(i, i + 50));
      }
      setSent(rows.length); setSubject(""); setBody("");
    } catch (err) { setError("Broadcast failed. Please try again."); }
    finally { setSending(false); }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontFamily: F.heading, fontSize: 20, color: C.green, marginBottom: 4 }}>Broadcast Message</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Send to opted-in customers (inbox delivery). Use {"{{first_name}}"} for personalisation.</div>

      {sent && (
        <div style={{ background: "#f0f9f4", border: `1px solid ${C.success}50`, borderRadius: 2, padding: "12px 16px", fontSize: 13, color: C.success, marginBottom: 16 }}>
          ✅ Broadcast sent to {sent} customer{sent !== 1 ? "s" : ""}.
          <button onClick={() => setSent(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, marginLeft: 12, fontSize: 11 }}>Dismiss</button>
        </div>
      )}

      {[
        { field: "tier", label: "Target Tier", el: (
          <select value={tier} onChange={e => setTier(e.target.value)} style={sInp}>
            <option value="all">All Customers (opted-in)</option>
            <option value="Bronze">Bronze Tier Only</option>
            <option value="Silver">Silver Tier Only</option>
            <option value="Gold">Gold Tier Only</option>
            <option value="Platinum">Platinum Tier Only</option>
          </select>
        )},
        { field: "subject", label: "Subject", el: <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Double Points This Weekend 🌿" style={sInp} /> },
      ].map(({ field, label, el }) => (
        <div key={field} style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: C.accent, display: "block", marginBottom: 6 }}>{label}</label>
          {el}
        </div>
      ))}

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: C.accent, display: "block", marginBottom: 6 }}>Message</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder={"Hi {{first_name}},\n\nExciting news from Protea Botanicals..."} style={{ ...sInp, resize: "vertical" }} />
      </div>

      {preview.length > 0 && (
        <div style={{ marginBottom: 20, padding: "10px 14px", background: C.cream, border: `1px solid ${C.border}`, borderRadius: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Sample recipients (first 5)</div>
          {preview.map(p => <div key={p.id} style={{ fontSize: 12, color: C.text, padding: "2px 0" }}>{p.full_name || "—"} · {p.loyalty_tier || "Bronze"}</div>)}
        </div>
      )}

      {error && <div style={{ background: C.lightRed, border: `1px solid ${C.red}`, borderRadius: 2, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 16 }}>{error}</div>}
      <button onClick={send} disabled={sending} style={sBtn(sending ? C.muted : C.green, C.white, sending)}>{sending ? "Sending…" : "Send Broadcast"}</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminCommsCenter() {
  const [channel, setChannel] = useState("customers"); // customers | wholesale | templates | broadcast
  const [adminUser, setAdminUser] = useState(null);

  // Customer state
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAdminUser(user));
  }, []);

  const fetchCustomerList = useCallback(async () => {
    setCustLoading(true);
    try {
      const [msgRes, tickRes] = await Promise.all([
        supabase.from("customer_messages").select("user_id, direction, read_at, created_at, body, message_type").order("created_at", { ascending: false }),
        supabase.from("support_tickets").select("user_id, status, created_at, subject, ticket_number").order("created_at", { ascending: false }),
      ]);
      const msgs = msgRes.data || [], ticks = tickRes.data || [];
      const userMap = {};
      msgs.forEach(m => {
        if (!m.user_id) return;
        if (!userMap[m.user_id]) userMap[m.user_id] = { user_id: m.user_id, lastActivity: m.created_at, unread: 0, openTickets: 0, lastMessage: "" };
        if (m.direction === "inbound" && !m.read_at) userMap[m.user_id].unread++;
        if (new Date(m.created_at) > new Date(userMap[m.user_id].lastActivity || 0)) {
          userMap[m.user_id].lastActivity = m.created_at;
          userMap[m.user_id].lastMessage = m.body?.slice(0, 50) || "";
        }
      });
      ticks.forEach(t => {
        if (!t.user_id) return;
        if (!userMap[t.user_id]) userMap[t.user_id] = { user_id: t.user_id, lastActivity: t.created_at, unread: 0, openTickets: 0, lastMessage: "" };
        if (["open","pending_reply"].includes(t.status)) userMap[t.user_id].openTickets++;
        if (new Date(t.created_at) > new Date(userMap[t.user_id].lastActivity || 0)) {
          userMap[t.user_id].lastActivity = t.created_at;
          userMap[t.user_id].lastMessage = t.subject || "";
        }
      });
      const userIds = Object.keys(userMap);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("user_profiles").select("id, full_name, email, phone, loyalty_tier, loyalty_points").in("id", userIds);
        (profiles || []).forEach(p => { if (userMap[p.id]) userMap[p.id].profile = p; });
      }
      const list = Object.values(userMap).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
      setCustomerList(list);
      setCustUnread(list.reduce((s, c) => s + c.unread, 0));
    } catch (err) { console.error("[AdminCommsCenter] Customer list:", err); }
    finally { setCustLoading(false); }
  }, []);

  const fetchPartners = useCallback(async () => {
    setPartLoading(true);
    try {
      const { data: partnerData } = await supabase.from("wholesale_partners").select("id, name, contact_name, contact_email, contact_phone").eq("is_active", true).order("name");
      const { data: wMsgs } = await supabase.from("wholesale_messages").select("partner_id, read_at, direction, created_at, body").order("created_at", { ascending: false });
      const msgMap = {};
      (wMsgs || []).forEach(m => {
        if (!msgMap[m.partner_id]) msgMap[m.partner_id] = { unread: 0, lastActivity: m.created_at, lastMessage: "" };
        if (m.direction === "inbound" && !m.read_at) msgMap[m.partner_id].unread++;
        if (new Date(m.created_at) > new Date(msgMap[m.partner_id].lastActivity || 0)) {
          msgMap[m.partner_id].lastActivity = m.created_at;
          msgMap[m.partner_id].lastMessage = m.body?.slice(0, 50) || "";
        }
      });
      const list = (partnerData || []).map(p => ({ ...p, ...(msgMap[p.id] || { unread: 0, lastActivity: null, lastMessage: "" }) }));
      setPartners(list);
      setPartUnread(list.reduce((s, p) => s + p.unread, 0));
    } catch (err) { console.error("[AdminCommsCenter] Partner list:", err); }
    finally { setPartLoading(false); }
  }, []);

  useEffect(() => { fetchCustomerList(); fetchPartners(); }, [fetchCustomerList, fetchPartners]);

  const filteredCustomers = customerList.filter(c => {
    const q = custSearch.toLowerCase();
    if (!q) return true;
    const p = c.profile;
    return (p?.full_name?.toLowerCase().includes(q)) || (p?.email?.toLowerCase().includes(q)) || (p?.phone?.includes(q));
  });

  // Full-screen panels (Templates + Broadcast — no sidebar needed)
  if (channel === "templates") {
    return (
      <div style={{ fontFamily: F.body }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: F.heading, color: C.green, fontSize: 22, margin: 0 }}>Comms Centre</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Customer messages · Support tickets · Wholesale comms</div>
          </div>
          <ChannelButtons channel={channel} setChannel={setChannel} custUnread={custUnread} partUnread={partUnread} onRefresh={() => { fetchCustomerList(); fetchPartners(); }} />
        </div>
        <TemplatesPanel />
      </div>
    );
  }

  if (channel === "broadcast") {
    return (
      <div style={{ fontFamily: F.body }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: F.heading, color: C.green, fontSize: 22, margin: 0 }}>Comms Centre</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Customer messages · Support tickets · Wholesale comms</div>
          </div>
          <ChannelButtons channel={channel} setChannel={setChannel} custUnread={custUnread} partUnread={partUnread} onRefresh={() => { fetchCustomerList(); fetchPartners(); }} />
        </div>
        <BroadcastPanel />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: F.body }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: F.heading, color: C.green, fontSize: 22, margin: 0 }}>Comms Centre</h2>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Customer messages · Support tickets · Wholesale comms</div>
        </div>
        <ChannelButtons channel={channel} setChannel={setChannel} custUnread={custUnread} partUnread={partUnread} onRefresh={() => { fetchCustomerList(); fetchPartners(); }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 0, border: `1px solid ${C.border}`, borderRadius: 2, overflow: "hidden", minHeight: 560 }}>
        {/* LEFT PANEL */}
        <div style={{ borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.cream }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
            <input style={{ ...sInp, fontSize: 12 }} placeholder={channel === "customers" ? "Search customers…" : "Search partners…"} value={custSearch} onChange={e => setCustSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {channel === "customers" && (
              custLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 12 }}>Loading…</div>
              ) : filteredCustomers.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: C.muted }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                  <div style={{ fontSize: 12 }}>No customers with messages yet.</div>
                </div>
              ) : (
                filteredCustomers.map(c => {
                  const p = c.profile;
                  const isSelected = selectedCustomer?.user_id === c.user_id;
                  return (
                    <div key={c.user_id} onClick={() => setSelectedCustomer(c)}
                      style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: isSelected ? C.lightGreen : "transparent", borderLeft: isSelected ? `3px solid ${C.accent}` : "3px solid transparent" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: c.unread > 0 ? 700 : 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.full_name || "Anonymous"}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.lastMessage || p?.email || "No messages"}</div>
                          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                            {c.openTickets > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: C.lightRed, color: C.red, fontWeight: 700 }}>🎫 {c.openTickets} open</span>}
                            {p?.loyalty_tier && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: C.lightGold, color: C.gold, textTransform: "capitalize" }}>{p.loyalty_tier}</span>}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right", marginLeft: 8 }}>
                          {c.unread > 0 && <span style={{ display: "inline-block", background: C.red, color: C.white, borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 5px", marginBottom: 4 }}>{c.unread}</span>}
                          <div style={{ fontSize: 10, color: C.muted }}>{fmtTime(c.lastActivity)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
            {channel === "wholesale" && (
              partLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 12 }}>Loading…</div>
              ) : partners.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: C.muted }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🏪</div>
                  <div style={{ fontSize: 12 }}>No active wholesale partners.</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Add partners in HQ → Wholesale.</div>
                </div>
              ) : (
                partners.map(p => {
                  const isSelected = selectedPartner?.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setSelectedPartner(p)}
                      style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: isSelected ? "#e8f0ff" : "transparent", borderLeft: isSelected ? `3px solid ${C.blue}` : "3px solid transparent" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: p.unread > 0 ? 700 : 500, color: C.text }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{p.lastMessage || p.contact_name || "No messages yet"}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right", marginLeft: 8 }}>
                          {p.unread > 0 && <span style={{ display: "inline-block", background: C.red, color: C.white, borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 5px", marginBottom: 4 }}>{p.unread}</span>}
                          {p.lastActivity && <div style={{ fontSize: 10, color: C.muted }}>{fmtTime(p.lastActivity)}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {channel === "customers" && !selectedCustomer && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
              <div style={{ fontFamily: F.heading, fontSize: 20, color: C.green, marginBottom: 8 }}>Select a customer</div>
              <div style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.7 }}>Click any customer on the left to view their full message and support ticket history in one unified thread.</div>
            </div>
          )}
          {channel === "customers" && selectedCustomer && (
            <CustomerThread key={selectedCustomer.user_id} userId={selectedCustomer.user_id} profile={selectedCustomer.profile} adminUser={adminUser} onUnreadCleared={fetchCustomerList} />
          )}
          {channel === "wholesale" && !selectedPartner && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
              <div style={{ fontFamily: F.heading, fontSize: 20, color: C.green, marginBottom: 8 }}>Select a wholesale partner</div>
              <div style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.7 }}>Private comms channel — visible to Admin and HQ only, not to retail customers.</div>
              <div style={{ marginTop: 20, padding: "12px 16px", background: C.lightBlue, border: `1px solid ${C.blue}20`, borderRadius: 2, fontSize: 12, color: C.blue, maxWidth: 320 }}>💡 Wholesale partner messages are stored in a separate table — complete data isolation.</div>
            </div>
          )}
          {channel === "wholesale" && selectedPartner && (
            <WholesaleThread key={selectedPartner.id} partner={selectedPartner} adminUser={adminUser} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared channel switcher buttons ──────────────────────────────────────────
function ChannelButtons({ channel, setChannel, custUnread, partUnread, onRefresh }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {[
        { id: "customers", label: "👥 Customers", badge: custUnread },
        { id: "wholesale", label: "🏪 Wholesale", badge: partUnread },
        { id: "templates", label: "📝 Templates", badge: 0 },
        { id: "broadcast", label: "📣 Broadcast", badge: 0 },
      ].map(ch => (
        <button key={ch.id} onClick={() => setChannel(ch.id)}
          style={{ padding: "8px 14px", background: channel === ch.id ? C.green : C.white, color: channel === ch.id ? C.white : C.muted, border: `1px solid ${channel === ch.id ? C.green : C.border}`, borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F.body, display: "flex", alignItems: "center", gap: 5 }}>
          {ch.label}
          {ch.badge > 0 && <span style={{ background: C.red, color: C.white, borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 5px" }}>{ch.badge}</span>}
        </button>
      ))}
      <button onClick={onRefresh} style={{ ...sBtn("transparent", C.muted), padding: "8px 12px" }}>↻</button>
    </div>
  );
}
