// src/components/CustomerSupportWidget.js v1.0
// WP-P: Customer Communications Platform
// Customer-facing: log tickets, view thread, see auto-replies
// Embedded in Account.js as "Support" tab
// Inline styles only. Fonts: Cormorant Garamond + Jost.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  text: "#1a1a1a",
  error: "#c0392b",
  success: "#27ae60",
  blue: "#1565C0",
  bluePale: "#E3F2FD",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

const CATEGORIES = [
  { value: "general", label: "General Enquiry" },
  { value: "order", label: "Order Issue" },
  { value: "loyalty", label: "Loyalty / Points" },
  { value: "product", label: "Product Question" },
  { value: "refund", label: "Refund Request" },
  { value: "technical", label: "Technical Problem" },
];

const STATUS_COLOURS = {
  open: { bg: "#E3F2FD", text: C.blue },
  pending_reply: { bg: "#FFF8E1", text: "#F57F17" },
  resolved: { bg: "#E8F5E9", text: C.success },
  closed: { bg: "#F5F5F5", text: C.muted },
};

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

export default function CustomerSupportWidget({ userId, profile }) {
  const [view, setView] = useState("list"); // list | new | thread
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");
  const [formErr, setFormErr] = useState("");

  // Reply
  const [reply, setReply] = useState("");
  const bottomRef = useRef(null);

  // ── Fetch tickets ──────────────────────────────────────────────────────────
  const loadTickets = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // ── Realtime: new messages on active ticket ────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const chan = supabase
      .channel(`ticket-${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${active.id}`,
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
  }, [active]);

  // ── Open thread ─────────────────────────────────────────────────────────────
  const openThread = async (ticket) => {
    setActive(ticket);
    setView("thread");
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    // Mark unread admin/auto messages as read
    const unread = (data || []).filter(
      (m) => m.sender_type !== "customer" && !m.read_at,
    );
    if (unread.length > 0) {
      await supabase
        .from("ticket_messages")
        .update({ read_at: new Date().toISOString() })
        .in(
          "id",
          unread.map((m) => m.id),
        );
    }
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      200,
    );
  };

  // ── Submit new ticket ────────────────────────────────────────────────────────
  const submitTicket = async () => {
    if (!subject.trim()) {
      setFormErr("Please enter a subject.");
      return;
    }
    if (!body.trim()) {
      setFormErr("Please describe your issue.");
      return;
    }
    setFormErr("");
    setSending(true);
    try {
      // 1. Create ticket
      const { data: ticketData, error: tErr } = await supabase
        .from("support_tickets")
        .insert({ user_id: userId, subject: subject.trim(), category })
        .select()
        .single();
      if (tErr) throw tErr;

      // 2. First customer message
      await supabase.from("ticket_messages").insert({
        ticket_id: ticketData.id,
        sender_type: "customer",
        sender_id: userId,
        content: body.trim(),
      });

      // 3. Fetch auto-reply template
      const { data: tmpl } = await supabase
        .from("message_templates")
        .select("*")
        .eq("trigger_type", "ticket_opened")
        .eq("is_active", true)
        .maybeSingle();

      if (tmpl) {
        const vars = {
          first_name: profile?.full_name?.split(" ")[0] || "there",
          ticket_number: ticketData.ticket_number,
          subject: ticketData.subject,
          category:
            CATEGORIES.find((c) => c.value === ticketData.category)?.label ||
            ticketData.category,
        };
        const autoContent = interpolate(tmpl.content, vars);
        const autoSubject = interpolate(tmpl.subject, vars);

        // Insert auto-reply to thread
        await supabase.from("ticket_messages").insert({
          ticket_id: ticketData.id,
          sender_type: "auto",
          sender_id: null,
          content: autoContent,
        });

        // Also write to customer_messages inbox
        if (tmpl.send_inbox) {
          await supabase.from("customer_messages").insert({
            user_id: userId,
            subject: autoSubject,
            content: autoContent,
            type: "support_ticket",
            read: false,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Reset form + navigate to thread
      setSubject("");
      setCategory("general");
      setBody("");
      await loadTickets();
      await openThread({ ...ticketData });
    } catch (err) {
      setFormErr("Failed to submit ticket. Please try again.");
      console.error("[Support] submitTicket:", err);
    } finally {
      setSending(false);
    }
  };

  // ── Send reply to existing ticket ────────────────────────────────────────────
  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setSending(true);
    try {
      await supabase.from("ticket_messages").insert({
        ticket_id: active.id,
        sender_type: "customer",
        sender_id: userId,
        content: reply.trim(),
      });
      // Update ticket status to pending_reply so admin sees it
      await supabase
        .from("support_tickets")
        .update({
          status: "pending_reply",
          updated_at: new Date().toISOString(),
        })
        .eq("id", active.id);
      setReply("");
      setActive((t) => ({ ...t, status: "pending_reply" }));
    } catch (err) {
      console.error("[Support] sendReply:", err);
    } finally {
      setSending(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────

  const openCount = tickets.filter(
    (t) => t.status === "open" || t.status === "pending_reply",
  ).length;

  // ── Ticket list ──
  if (view === "list")
    return (
      <div style={{ fontFamily: F.body }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 22,
                color: C.green,
                fontWeight: 400,
              }}
            >
              Support
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {openCount > 0
                ? `${openCount} open ticket${openCount > 1 ? "s" : ""}`
                : "No open tickets"}
            </div>
          </div>
          <button
            onClick={() => setView("new")}
            style={{
              background: C.green,
              color: C.white,
              border: "none",
              borderRadius: 2,
              padding: "10px 20px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: F.body,
              cursor: "pointer",
            }}
          >
            + New Ticket
          </button>
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: C.muted,
              fontSize: 13,
            }}
          >
            Loading tickets…
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              border: `1px dashed ${C.border}`,
              borderRadius: 2,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎫</div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 18,
                color: C.green,
                marginBottom: 8,
              }}
            >
              No support tickets yet
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
              Have a question or issue? We're here to help.
            </div>
            <button
              onClick={() => setView("new")}
              style={{
                background: C.green,
                color: C.white,
                border: "none",
                borderRadius: 2,
                padding: "10px 24px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: F.body,
                cursor: "pointer",
              }}
            >
              Open a Ticket
            </button>
          </div>
        )}

        {/* Ticket list */}
        {tickets.map((t, i) => {
          const sc = STATUS_COLOURS[t.status] || STATUS_COLOURS.open;
          const cat = CATEGORIES.find((c) => c.value === t.category);
          const isOpen = t.status === "open" || t.status === "pending_reply";
          return (
            <div
              key={t.id}
              onClick={() => openThread(t)}
              style={{
                border: `1px solid ${isOpen ? C.accent + "60" : C.border}`,
                borderLeft: `3px solid ${isOpen ? C.accent : C.border}`,
                borderRadius: 2,
                padding: "14px 16px",
                marginBottom: 10,
                cursor: "pointer",
                background: C.white,
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 2px 12px rgba(0,0,0,0.08)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: C.text,
                    flex: 1,
                    marginRight: 12,
                  }}
                >
                  {t.subject}
                </div>
                <span
                  style={{
                    background: sc.bg,
                    color: sc.text,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 20,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.status.replace("_", " ")}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 11,
                  color: C.muted,
                }}
              >
                <span>{t.ticket_number}</span>
                {cat && <span>· {cat.label}</span>}
                <span>
                  ·{" "}
                  {new Date(t.created_at).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );

  // ── New ticket form ──
  if (view === "new")
    return (
      <div style={{ fontFamily: F.body, maxWidth: 560 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => {
              setView("list");
              setFormErr("");
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              fontSize: 20,
              padding: 0,
            }}
          >
            ←
          </button>
          <div style={{ fontFamily: F.heading, fontSize: 22, color: C.green }}>
            New Support Ticket
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: C.accent,
              display: "block",
              marginBottom: 6,
            }}
          >
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              fontSize: 13,
              fontFamily: F.body,
              color: C.text,
              background: C.white,
              outline: "none",
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: C.accent,
              display: "block",
              marginBottom: 6,
            }}
          >
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief description of your issue"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              fontSize: 13,
              fontFamily: F.body,
              color: C.text,
              background: C.white,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: C.accent,
              display: "block",
              marginBottom: 6,
            }}
          >
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Please describe your issue in detail. Include any order numbers, product names, or relevant information."
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              fontSize: 13,
              fontFamily: F.body,
              color: C.text,
              background: C.white,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {formErr && (
          <div
            style={{
              background: "#fdf0ef",
              border: `1px solid ${C.error}`,
              borderRadius: 2,
              padding: "10px 14px",
              fontSize: 13,
              color: C.error,
              marginBottom: 16,
            }}
          >
            {formErr}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              setView("list");
              setFormErr("");
            }}
            style={{
              padding: "10px 20px",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              background: C.white,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: F.body,
              cursor: "pointer",
              color: C.muted,
            }}
          >
            Cancel
          </button>
          <button
            onClick={submitTicket}
            disabled={sending}
            style={{
              flex: 1,
              background: sending ? C.muted : C.green,
              color: C.white,
              border: "none",
              borderRadius: 2,
              padding: "10px 20px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: F.body,
              cursor: sending ? "not-allowed" : "pointer",
            }}
          >
            {sending ? "Submitting…" : "Submit Ticket"}
          </button>
        </div>

        <div
          style={{
            fontSize: 11,
            color: C.muted,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          You'll receive an automatic acknowledgement and our team typically
          responds within 24 hours.
        </div>
      </div>
    );

  // ── Thread view ──
  if (view === "thread" && active) {
    const sc = STATUS_COLOURS[active.status] || STATUS_COLOURS.open;
    const isResolved =
      active.status === "resolved" || active.status === "closed";
    return (
      <div style={{ fontFamily: F.body }}>
        {/* Thread header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <button
            onClick={() => {
              setView("list");
              loadTickets();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              fontSize: 20,
              padding: "2px 0",
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 20,
                color: C.green,
                marginBottom: 4,
              }}
            >
              {active.subject}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                fontSize: 11,
                color: C.muted,
                flexWrap: "wrap",
              }}
            >
              <span>{active.ticket_number}</span>
              <span>·</span>
              <span>
                {CATEGORIES.find((c) => c.value === active.category)?.label}
              </span>
              <span>·</span>
              <span
                style={{
                  background: sc.bg,
                  color: sc.text,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: 20,
                }}
              >
                {active.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {messages.map((m, i) => {
            const isCustomer = m.sender_type === "customer";
            const isAuto = m.sender_type === "auto";
            return (
              <div
                key={m.id}
                style={{
                  padding: "16px 20px",
                  borderBottom:
                    i < messages.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isCustomer
                    ? C.cream
                    : isAuto
                      ? "#f0f9f4"
                      : C.white,
                }}
              >
                {/* Sender label */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: isCustomer
                          ? C.warm
                          : isAuto
                            ? C.accent
                            : C.green,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: isCustomer ? C.text : C.white,
                        fontWeight: 700,
                      }}
                    >
                      {isCustomer
                        ? profile?.full_name?.[0] || "Y"
                        : isAuto
                          ? "🤖"
                          : "PB"}
                    </div>
                    <span
                      style={{ fontSize: 12, fontWeight: 600, color: C.text }}
                    >
                      {isCustomer
                        ? "You"
                        : isAuto
                          ? "Protea Botanicals (Auto-reply)"
                          : "Protea Botanicals Support"}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: C.muted }}>
                    {new Date(m.created_at).toLocaleString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {/* Content */}
                <div
                  style={{
                    fontSize: 13,
                    color: C.text,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {!isResolved ? (
          <div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Type your reply…"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                fontSize: 13,
                fontFamily: F.body,
                color: C.text,
                background: C.white,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 10,
              }}
            />
            <button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              style={{
                background: sending || !reply.trim() ? C.muted : C.green,
                color: C.white,
                border: "none",
                borderRadius: 2,
                padding: "10px 24px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: F.body,
                cursor: sending || !reply.trim() ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Sending…" : "Send Reply"}
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "#f0f9f4",
              border: `1px solid ${C.accent}50`,
              borderRadius: 2,
              padding: "12px 16px",
              fontSize: 13,
              color: C.mid,
              textAlign: "center",
            }}
          >
            ✅ This ticket is resolved. If you need further help, please open a
            new ticket.
          </div>
        )}
      </div>
    );
  }

  return null;
}
