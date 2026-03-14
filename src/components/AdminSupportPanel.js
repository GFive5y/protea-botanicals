// src/components/AdminSupportPanel.js v1.0
// WP-P: Customer Communications Platform — Admin Side
// Features: All tickets, threaded replies, status management,
//           message template editor, broadcast composer
// Used in AdminDashboard.js as "Support" tab

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  text: "#1a1a1a",
  error: "#c0392b",
  success: "#27ae60",
  warning: "#e67e22",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

const CATEGORIES = [
  "order",
  "loyalty",
  "product",
  "general",
  "refund",
  "technical",
];
const STATUSES = ["open", "pending_reply", "resolved", "closed"];
const STATUS_COLOURS = {
  open: { bg: "#E3F2FD", text: "#1565C0" },
  pending_reply: { bg: "#FFF8E1", text: "#F57F17" },
  resolved: { bg: "#E8F5E9", text: "#27ae60" },
  closed: { bg: "#F5F5F5", text: "#888" },
};

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

const SUBTABS = ["Tickets", "Templates", "Broadcast"];

export default function AdminSupportPanel() {
  const [sub, setSub] = useState("Tickets");

  return (
    <div style={{ fontFamily: F.body }}>
      {/* Sub-nav */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `2px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        {SUBTABS.map((t) => (
          <button
            key={t}
            onClick={() => setSub(t)}
            style={{
              padding: "9px 20px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom:
                sub === t ? `2px solid ${C.mid}` : "2px solid transparent",
              marginBottom: -2,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: F.body,
              color: sub === t ? C.mid : C.muted,
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {sub === "Tickets" && <TicketsPanel />}
      {sub === "Templates" && <TemplatesPanel />}
      {sub === "Broadcast" && <BroadcastPanel />}
    </div>
  );
}

// ── TICKETS PANEL ─────────────────────────────────────────────────────────────
function TicketsPanel() {
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("open");
  const [profiles, setProfiles] = useState({});
  const bottomRef = useRef(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const q = supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });
    if (filter !== "all") q.eq("status", filter);
    const { data } = await q;
    setTickets(data || []);
    // Enrich with profiles
    const ids = [
      ...new Set((data || []).map((t) => t.user_id).filter(Boolean)),
    ];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("user_profiles")
        .select("id,full_name,email")
        .in("id", ids);
      const map = {};
      (profs || []).forEach((p) => {
        map[p.id] = p;
      });
      setProfiles(map);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Realtime
  useEffect(() => {
    const chan = supabase
      .channel("admin-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        loadTickets,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages" },
        async (payload) => {
          if (active && payload.new.ticket_id === active.id) {
            setMessages((prev) => [...prev, payload.new]);
            setTimeout(
              () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
              100,
            );
          }
          loadTickets();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(chan);
  }, [active, loadTickets]);

  const openThread = async (ticket) => {
    setActive(ticket);
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    // Mark customer messages as read
    const unread = (data || []).filter(
      (m) => m.sender_type === "customer" && !m.read_at,
    );
    if (unread.length) {
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

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("ticket_messages").insert({
        ticket_id: active.id,
        sender_type: "admin",
        sender_id: user.id,
        content: reply.trim(),
      });
      // Also write to customer_messages inbox
      await supabase.from("customer_messages").insert({
        user_id: active.user_id,
        subject: `Re: ${active.subject} [${active.ticket_number}]`,
        content: reply.trim(),
        type: "support_reply",
        read: false,
        created_at: new Date().toISOString(),
      });
      // Update ticket status
      const newStatus =
        active.status === "pending_reply" ? "open" : active.status;
      await supabase
        .from("support_tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", active.id);
      setActive((t) => ({ ...t, status: newStatus }));
      setReply("");
    } catch (err) {
      console.error("[AdminSupport] sendReply:", err);
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status) => {
    if (!active) return;
    const update = { status, updated_at: new Date().toISOString() };
    if (status === "resolved") update.resolved_at = new Date().toISOString();
    await supabase.from("support_tickets").update(update).eq("id", active.id);
    setActive((t) => ({ ...t, status }));
    loadTickets();

    // Auto-reply on resolve
    if (status === "resolved") {
      const prof = profiles[active.user_id];
      const { data: tmpl } = await supabase
        .from("message_templates")
        .select("*")
        .eq("trigger_type", "ticket_resolved")
        .eq("is_active", true)
        .maybeSingle();
      if (tmpl && prof) {
        const vars = {
          first_name: prof.full_name?.split(" ")[0] || "there",
          ticket_number: active.ticket_number,
        };
        const content = tmpl.content.replace(
          /\{\{(\w+)\}\}/g,
          (_, k) => vars[k] || "",
        );
        await supabase
          .from("ticket_messages")
          .insert({ ticket_id: active.id, sender_type: "auto", content });
        await supabase.from("customer_messages").insert({
          user_id: active.user_id,
          subject: tmpl.subject.replace(
            /\{\{(\w+)\}\}/g,
            (_, k) => vars[k] || "",
          ),
          content,
          type: "support_ticket",
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  const openCount = tickets.filter(
    (t) => t.status === "open" || t.status === "pending_reply",
  ).length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* Ticket list */}
      <div>
        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          {["open", "pending_reply", "resolved", "closed", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "5px 10px",
                border: `1px solid ${filter === s ? C.mid : C.border}`,
                background: filter === s ? C.mid : C.white,
                color: filter === s ? C.white : C.muted,
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: F.body,
                cursor: "pointer",
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        {loading ? (
          <div style={{ color: C.muted, fontSize: 13, padding: 20 }}>
            Loading…
          </div>
        ) : tickets.length === 0 ? (
          <div
            style={{
              color: C.muted,
              fontSize: 13,
              padding: 20,
              textAlign: "center",
              border: `1px dashed ${C.border}`,
              borderRadius: 2,
            }}
          >
            No {filter !== "all" ? filter.replace("_", " ") : ""} tickets
          </div>
        ) : (
          tickets.map((t) => {
            const prof = profiles[t.user_id];
            const sc = STATUS_COLOURS[t.status] || STATUS_COLOURS.open;
            const isActive = active?.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => openThread(t)}
                style={{
                  border: `1px solid ${isActive ? C.accent : C.border}`,
                  borderLeft: `3px solid ${sc.text}`,
                  borderRadius: 2,
                  padding: "12px 14px",
                  marginBottom: 8,
                  cursor: "pointer",
                  background: isActive ? "#f0faf4" : C.white,
                  transition: "all 0.12s",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    marginBottom: 4,
                  }}
                >
                  {t.subject}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                  {prof?.full_name || "Customer"} · {t.ticket_number}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      background: sc.bg,
                      color: sc.text,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      padding: "2px 7px",
                      borderRadius: 20,
                    }}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                  <span style={{ fontSize: 10, color: C.muted }}>
                    {new Date(t.updated_at).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Thread */}
      <div>
        {!active ? (
          <div
            style={{
              border: `1px dashed ${C.border}`,
              borderRadius: 2,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎫</div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 18,
                color: C.green,
                marginBottom: 8,
              }}
            >
              {openCount} open ticket{openCount !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>
              Select a ticket from the left to view and respond
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: "14px 20px",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: F.heading,
                      fontSize: 18,
                      color: C.green,
                      marginBottom: 4,
                    }}
                  >
                    {active.subject}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    {profiles[active.user_id]?.full_name} ·{" "}
                    {active.ticket_number} · {active.category}
                  </div>
                </div>
                {/* Status changer */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      style={{
                        padding: "5px 10px",
                        border: `1px solid ${active.status === s ? C.mid : C.border}`,
                        background: active.status === s ? C.mid : C.white,
                        color: active.status === s ? C.white : C.muted,
                        borderRadius: 2,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontFamily: F.body,
                        cursor: "pointer",
                      }}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: 12,
                maxHeight: 440,
                overflowY: "auto",
              }}
            >
              {messages.map((m, i) => {
                const isCustomer = m.sender_type === "customer";
                const isAuto = m.sender_type === "auto";
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: "14px 18px",
                      borderBottom:
                        i < messages.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                      background: isCustomer
                        ? "#f7f5f2"
                        : isAuto
                          ? "#f0f9f4"
                          : C.white,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
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
                            fontSize: 11,
                            color: isCustomer ? C.text : C.white,
                            fontWeight: 700,
                          }}
                        >
                          {isCustomer
                            ? profiles[active.user_id]?.full_name?.[0] || "C"
                            : isAuto
                              ? "🤖"
                              : "PB"}
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: C.text,
                          }}
                        >
                          {isCustomer
                            ? profiles[active.user_id]?.full_name || "Customer"
                            : isAuto
                              ? "Auto-reply"
                              : "Support Team"}
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

            {/* Admin reply */}
            <div>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Type your reply to the customer…"
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
              <div style={{ display: "flex", gap: 8 }}>
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
                    cursor:
                      sending || !reply.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "Sending…" : "Send Reply"}
                </button>
                <button
                  onClick={() => setStatus("resolved")}
                  style={{
                    background: C.success,
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
                  ✓ Resolve
                </button>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                Replies are sent to the customer's inbox and trigger a WhatsApp
                notification if their phone is verified.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── TEMPLATES PANEL ──────────────────────────────────────────────────────────
function TemplatesPanel() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("message_templates")
      .select("*")
      .order("trigger_type");
    setTemplates(data || []);
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

  if (editing)
    return (
      <div style={{ maxWidth: 700 }}>
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
              color: C.muted,
              fontSize: 20,
              padding: 0,
            }}
          >
            ←
          </button>
          <div style={{ fontFamily: F.heading, fontSize: 20, color: C.green }}>
            {editing.id ? "Edit Template" : "New Template"}
          </div>
        </div>

        {[
          ["name", "Admin Label", "text"],
          ["trigger_type", "Trigger Type", "text"],
          ["subject", "Email / Inbox Subject", "text"],
        ].map(([field, lbl]) => (
          <div key={field} style={{ marginBottom: 14 }}>
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
              {lbl}
            </label>
            <input
              value={editing[field] || ""}
              onChange={(e) =>
                setEditing((p) => ({ ...p, [field]: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                fontSize: 13,
                fontFamily: F.body,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
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
            Message Content (supports{" "}
            {"{{first_name}} {{points}} {{tier}} {{code}} {{ticket_number}}"})
          </label>
          <textarea
            value={editing.content || ""}
            onChange={(e) =>
              setEditing((p) => ({ ...p, content: e.target.value }))
            }
            rows={10}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              fontSize: 13,
              fontFamily: F.body,
              boxSizing: "border-box",
              outline: "none",
              resize: "vertical",
            }}
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
                fontFamily: F.body,
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
            onClick={save}
            disabled={saving}
            style={{
              background: saving ? C.muted : C.green,
              color: C.white,
              border: "none",
              borderRadius: 2,
              padding: "10px 24px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: F.body,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Template"}
          </button>
        </div>
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontFamily: F.heading, fontSize: 20, color: C.green }}>
            Message Templates
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            Auto-replies, event notifications, and system messages
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
          + New Template
        </button>
      </div>

      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          overflow: "hidden",
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
                i < templates.length - 1 ? `1px solid ${C.border}` : "none",
              background: i % 2 === 0 ? C.white : C.cream,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: t.is_active ? C.success : C.muted,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {t.name}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {TRIGGER_LABELS[t.trigger_type] || t.trigger_type}
                {t.send_whatsapp && (
                  <span style={{ marginLeft: 8, color: C.success }}>
                    · WhatsApp
                  </span>
                )}
                {t.send_inbox && (
                  <span style={{ marginLeft: 8, color: C.blue }}>· Inbox</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing({ ...t })}
              style={{
                background: C.warm,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: "5px 12px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: F.body,
                cursor: "pointer",
                color: C.text,
              }}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BROADCAST PANEL ───────────────────────────────────────────────────────────
function BroadcastPanel() {
  const [tier, setTier] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");

  const loadPreview = async () => {
    const q = supabase
      .from("user_profiles")
      .select("id, full_name, loyalty_tier, email")
      .eq("email_marketing", true);
    if (tier !== "all") q.eq("loyalty_tier", tier);
    const { data } = await q.limit(5);
    setPreview(data || []);
  };

  useEffect(() => {
    loadPreview();
  }, [tier]);

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
        .select("id, full_name")
        .eq("email_marketing", true);
      if (tier !== "all") q.eq("loyalty_tier", tier);
      const { data: recipients } = await q;

      const rows = (recipients || []).map((r) => ({
        user_id: r.id,
        subject: subject.trim(),
        content: body
          .trim()
          .replace("{{first_name}}", r.full_name?.split(" ")[0] || "there"),
        type: "broadcast",
        read: false,
        created_at: new Date().toISOString(),
      }));

      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        await supabase.from("customer_messages").insert(rows.slice(i, i + 50));
      }

      setSent(rows.length);
      setSubject("");
      setBody("");
    } catch (err) {
      setError("Broadcast failed. Please try again.");
      console.error("[Broadcast]", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div
        style={{
          fontFamily: F.heading,
          fontSize: 20,
          color: C.green,
          marginBottom: 4,
        }}
      >
        Broadcast Message
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
        Send a message to all opted-in customers (inbox delivery). Use{" "}
        {"{{first_name}}"} for personalisation.
      </div>

      {sent && (
        <div
          style={{
            background: "#f0f9f4",
            border: `1px solid ${C.success}50`,
            borderRadius: 2,
            padding: "12px 16px",
            fontSize: 13,
            color: C.success,
            marginBottom: 16,
          }}
        >
          ✅ Broadcast sent to {sent} customer{sent !== 1 ? "s" : ""}.
          <button
            onClick={() => setSent(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              marginLeft: 12,
              fontSize: 11,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

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
          Target Tier
        </label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            fontSize: 13,
            fontFamily: F.body,
            outline: "none",
          }}
        >
          <option value="all">All Customers (opted-in)</option>
          <option value="Bronze">Bronze Tier Only</option>
          <option value="Silver">Silver Tier Only</option>
          <option value="Gold">Gold Tier Only</option>
          <option value="Platinum">Platinum Tier Only</option>
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
          placeholder="e.g. Double Points This Weekend 🌿"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            fontSize: 13,
            fontFamily: F.body,
            boxSizing: "border-box",
            outline: "none",
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
          rows={6}
          placeholder={
            "Hi {{first_name}},\n\nExciting news from Protea Botanicals..."
          }
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            fontSize: 13,
            fontFamily: F.body,
            boxSizing: "border-box",
            outline: "none",
            resize: "vertical",
          }}
        />
      </div>

      {preview.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 14px",
            background: C.cream,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 8,
            }}
          >
            Sample recipients (first 5)
          </div>
          {preview.map((p) => (
            <div
              key={p.id}
              style={{ fontSize: 12, color: C.text, padding: "2px 0" }}
            >
              {p.full_name || "—"} · {p.loyalty_tier || "Bronze"}
            </div>
          ))}
        </div>
      )}

      {error && (
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
          {error}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending}
        style={{
          background: sending ? C.muted : C.green,
          color: C.white,
          border: "none",
          borderRadius: 2,
          padding: "12px 28px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: F.body,
          cursor: sending ? "not-allowed" : "pointer",
        }}
      >
        {sending ? "Sending…" : "Send Broadcast"}
      </button>
    </div>
  );
}
