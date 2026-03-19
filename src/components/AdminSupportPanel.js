// src/components/AdminSupportPanel.js v1.1
// WP-VISUAL: T tokens, Inter font, underline sub-nav, pill badges, no Cormorant/Jost
// v1.0 — WP-P: Customer Communications Platform — Admin Side
// Features: All tickets, threaded replies, status management,
//           message template editor, broadcast composer
// Used in AdminDashboard.js as "Support" tab

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

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

// Legacy colour aliases — keeps every C.xxx reference working unchanged
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  blue: T.info,
  cream: T.ink050,
  warm: T.ink075,
  border: T.ink150,
  muted: T.ink400,
  white: "#fff",
  text: T.ink700,
  error: T.danger,
  success: T.success,
  warning: T.warning,
};
const F = { heading: T.font, body: T.font };

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const inputStyle = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  background: "#fff",
  color: T.ink700,
  outline: "none",
  boxSizing: "border-box",
};
const makeBtn = (bg = T.accentMid, color = "#fff", disabled = false) => ({
  padding: "9px 20px",
  backgroundColor: disabled ? "#ccc" : bg,
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
});

const STATUS_COLOURS = {
  open: { bg: T.infoBg, text: T.info },
  pending_reply: { bg: T.warningBg, text: T.warning },
  resolved: { bg: T.successBg, text: T.success },
  closed: { bg: T.ink075, text: T.ink400 },
};
const STATUSES = ["open", "pending_reply", "resolved", "closed"];

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

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function AdminSupportPanel() {
  const [sub, setSub] = useState("Tickets");

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Underline sub-nav */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `2px solid ${T.ink150}`,
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
                sub === t ? `2px solid ${T.accent}` : "2px solid transparent",
              marginBottom: -2,
              fontSize: 11,
              fontWeight: sub === t ? 700 : 400,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              fontFamily: T.font,
              color: sub === t ? T.accent : T.ink400,
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

// ─── TICKETS PANEL ────────────────────────────────────────────────────────────
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
      await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: active.id,
          sender_type: "admin",
          sender_id: user.id,
          content: reply.trim(),
        });
      await supabase
        .from("customer_messages")
        .insert({
          user_id: active.user_id,
          subject: `Re: ${active.subject} [${active.ticket_number}]`,
          content: reply.trim(),
          type: "support_reply",
          read: false,
          created_at: new Date().toISOString(),
        });
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
        await supabase
          .from("customer_messages")
          .insert({
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
      {/* ── Ticket list ── */}
      <div>
        {/* Filter pills */}
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
                padding: "4px 10px",
                border: `1px solid ${filter === s ? T.accent : T.ink150}`,
                background: filter === s ? T.accent : "#fff",
                color: filter === s ? "#fff" : T.ink400,
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: T.font,
                cursor: "pointer",
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              color: T.ink400,
              fontSize: 13,
              padding: 20,
              fontFamily: T.font,
            }}
          >
            Loading…
          </div>
        ) : tickets.length === 0 ? (
          <div
            style={{
              color: T.ink400,
              fontSize: 13,
              padding: 20,
              textAlign: "center",
              border: `1px dashed ${T.ink150}`,
              borderRadius: 6,
              fontFamily: T.font,
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
                  border: `1px solid ${isActive ? T.accentBd : T.ink150}`,
                  borderLeft: `3px solid ${sc.text}`,
                  borderRadius: 6,
                  padding: "12px 14px",
                  marginBottom: 8,
                  cursor: "pointer",
                  background: isActive ? T.accentLit : "#fff",
                  transition: "all 0.12s",
                  boxShadow: T.shadow,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.ink900,
                    marginBottom: 4,
                    fontFamily: T.font,
                  }}
                >
                  {t.subject}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink400,
                    marginBottom: 6,
                    fontFamily: T.font,
                  }}
                >
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
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontFamily: T.font,
                    }}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: T.ink400,
                      fontFamily: T.font,
                    }}
                  >
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

      {/* ── Thread ── */}
      <div>
        {!active ? (
          <div
            style={{
              border: `1px dashed ${T.ink150}`,
              borderRadius: 8,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎫</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: T.accent,
                marginBottom: 8,
                fontFamily: T.font,
              }}
            >
              {openCount} open ticket{openCount !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 13, color: T.ink400, fontFamily: T.font }}>
              Select a ticket from the left to view and respond
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div
              style={{
                background: "#fff",
                border: `1px solid ${T.ink150}`,
                borderRadius: 8,
                padding: "14px 20px",
                marginBottom: 12,
                boxShadow: T.shadow,
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
                      fontSize: 17,
                      fontWeight: 600,
                      color: T.ink900,
                      marginBottom: 4,
                      fontFamily: T.font,
                    }}
                  >
                    {active.subject}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: T.ink400,
                      fontFamily: T.font,
                    }}
                  >
                    {profiles[active.user_id]?.full_name} ·{" "}
                    {active.ticket_number} · {active.category}
                  </div>
                </div>
                {/* Status buttons */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      style={{
                        padding: "5px 10px",
                        border: `1px solid ${active.status === s ? T.accent : T.ink150}`,
                        background: active.status === s ? T.accent : "#fff",
                        color: active.status === s ? "#fff" : T.ink400,
                        borderRadius: 4,
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
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                border: `1px solid ${T.ink150}`,
                borderRadius: 8,
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
                          ? `1px solid ${T.ink075}`
                          : "none",
                      background: isCustomer
                        ? T.ink075
                        : isAuto
                          ? T.accentLit
                          : "#fff",
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
                              ? T.ink150
                              : isAuto
                                ? T.accentBd
                                : T.accent,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            color: isCustomer ? T.ink700 : "#fff",
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
                            color: T.ink900,
                            fontFamily: T.font,
                          }}
                        >
                          {isCustomer
                            ? profiles[active.user_id]?.full_name || "Customer"
                            : isAuto
                              ? "Auto-reply"
                              : "Support Team"}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: T.ink400,
                          fontFamily: T.font,
                        }}
                      >
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
                        color: T.ink700,
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                        fontFamily: T.font,
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
            <div>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Type your reply to the customer…"
                style={{
                  ...inputStyle,
                  width: "100%",
                  resize: "vertical",
                  marginBottom: 10,
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  style={{
                    ...makeBtn(T.accent, "#fff", sending || !reply.trim()),
                  }}
                >
                  {sending ? "Sending…" : "Send Reply"}
                </button>
                <button
                  onClick={() => setStatus("resolved")}
                  style={{ ...makeBtn(T.success, "#fff") }}
                >
                  ✓ Resolve
                </button>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.ink400,
                  marginTop: 8,
                  fontFamily: T.font,
                }}
              >
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

// ─── TEMPLATES PANEL ──────────────────────────────────────────────────────────
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

  const fldLabel = (text) => (
    <label
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: T.ink400,
        display: "block",
        marginBottom: 5,
        fontFamily: T.font,
      }}
    >
      {text}
    </label>
  );

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
              color: T.ink400,
              fontSize: 20,
              padding: 0,
            }}
          >
            ←
          </button>
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: T.accent,
              fontFamily: T.font,
            }}
          >
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
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          {fldLabel(
            `Message Content (supports {{first_name}} {{points}} {{tier}} {{code}} {{ticket_number}})`,
          )}
          <textarea
            value={editing.content || ""}
            onChange={(e) =>
              setEditing((p) => ({ ...p, content: e.target.value }))
            }
            rows={10}
            style={{
              ...inputStyle,
              width: "100%",
              resize: "vertical",
              minHeight: 160,
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
            style={{ ...makeBtn("transparent", T.ink400) }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ ...makeBtn(T.accent, "#fff", saving) }}
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
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: T.accent,
              fontFamily: T.font,
            }}
          >
            Message Templates
          </div>
          <div
            style={{
              fontSize: 12,
              color: T.ink400,
              marginTop: 2,
              fontFamily: T.font,
            }}
          >
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
          style={{ ...makeBtn(T.accent, "#fff") }}
        >
          + New Template
        </button>
      </div>

      <div
        style={{
          border: `1px solid ${T.ink150}`,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: T.shadow,
        }}
      >
        {templates.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: T.ink400,
              fontSize: 13,
              fontFamily: T.font,
            }}
          >
            No templates yet — create your first one above.
          </div>
        )}
        {templates.map((t, i) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderBottom:
                i < templates.length - 1 ? `1px solid ${T.ink075}` : "none",
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
                  <span style={{ marginLeft: 8, color: T.info }}>· Inbox</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing({ ...t })}
              style={{
                ...makeBtn("transparent", T.accentMid),
                padding: "4px 12px",
                fontSize: 9,
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

// ─── BROADCAST PANEL ──────────────────────────────────────────────────────────
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
      .select("id,full_name,loyalty_tier,email")
      .eq("email_marketing", true);
    if (tier !== "all") q.eq("loyalty_tier", tier);
    const { data } = await q.limit(5);
    setPreview(data || []);
  };
  useEffect(() => {
    loadPreview();
  }, [tier]); // eslint-disable-line

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
        subject: subject.trim(),
        content: body
          .trim()
          .replace("{{first_name}}", r.full_name?.split(" ")[0] || "there"),
        type: "broadcast",
        read: false,
        created_at: new Date().toISOString(),
      }));
      for (let i = 0; i < rows.length; i += 50)
        await supabase.from("customer_messages").insert(rows.slice(i, i + 50));
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

  const fldLabel = (text) => (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: T.ink400,
        display: "block",
        marginBottom: 5,
        fontFamily: T.font,
      }}
    >
      {text}
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <div
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: T.accent,
          marginBottom: 4,
          fontFamily: T.font,
        }}
      >
        Broadcast Message
      </div>
      <div
        style={{
          fontSize: 12,
          color: T.ink400,
          marginBottom: 20,
          fontFamily: T.font,
        }}
      >
        Send a message to all opted-in customers (inbox delivery). Use{" "}
        {"{{" + "first_name" + "}}"} for personalisation.
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
            fontFamily: T.font,
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
          style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
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
          placeholder="e.g. Double Points This Weekend 🌿"
          style={{ ...inputStyle, width: "100%" }}
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
          style={{ ...inputStyle, width: "100%", resize: "vertical" }}
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
              letterSpacing: "0.08em",
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
            fontFamily: T.font,
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending}
        style={{ ...makeBtn(T.accent, "#fff", sending) }}
      >
        {sending ? "Sending…" : "Send Broadcast"}
      </button>
    </div>
  );
}
