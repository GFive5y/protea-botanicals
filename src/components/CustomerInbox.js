// src/components/CustomerInbox.js
// Protea Botanicals — v1.0 — March 2026
// ============================================================================
// Customer-facing inbox: bidirectional messaging with admin.
//   - Lists all messages (inbound + outbound) newest first
//   - Unread badge on messages sent by admin (outbound, unread)
//   - Customer can compose: type = query | fault
//   - Auto-marks messages read on open
//   - Floating banner popups for birthday / tier_up / event messages
//   - Exposes getUnreadCount() so parent (Account/Landing) can show badge
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

// ── Design tokens (match Account.js / Landing.js palette) ────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e8e0d4",
  muted: "#888",
  text: "#1a1a1a",
  white: "#fff",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  blue: "#2c4a6e",
  lightGreen: "#eafaf1",
  lightGold: "#fef9e7",
  platinum: "#7b68ee",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

const MESSAGE_META = {
  query: { label: "Query", icon: "💬", color: C.blue },
  fault: { label: "Fault Report", icon: "⚠", color: C.red },
  admin_notice: { label: "Notice", icon: "📢", color: C.mid },
  birthday: { label: "🎂 Birthday!", icon: "🎂", color: C.gold },
  tier_up: { label: "Tier Upgrade!", icon: "🏆", color: C.platinum },
  event: { label: "Event", icon: "🎪", color: "#9b6b9e" },
  response: { label: "Response", icon: "↩️", color: C.mid },
  broadcast: { label: "Announcement", icon: "📣", color: C.accent },
  general: { label: "Message", icon: "📩", color: C.muted },
};
function getMeta(type) {
  return MESSAGE_META[type] || MESSAGE_META.general;
}

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── exported helper — Account/Landing call this to get badge count ────────────
export async function getInboxUnreadCount(userId) {
  if (!userId) return 0;
  const { count } = await supabase
    .from("customer_messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "outbound")
    .is("read_at", null);
  return count || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function CustomerInbox({ userId, onUnreadChange }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [composeType, setComposeType] = useState("query");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);
  const [popups, setPopups] = useState([]); // birthday/tier_up banners
  const [selected, setSelected] = useState(null); // full-view message

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("customer_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const msgs = data || [];
    setMessages(msgs);

    // Special popups: unread birthday / tier_up / event from admin
    const special = msgs.filter(
      (m) =>
        m.direction === "outbound" &&
        !m.read_at &&
        ["birthday", "tier_up", "event"].includes(m.message_type),
    );
    if (special.length > 0) setPopups(special);

    // Notify parent of unread count
    const unread = msgs.filter(
      (m) => m.direction === "outbound" && !m.read_at,
    ).length;
    onUnreadChange?.(unread);

    setLoading(false);
  }, [userId, onUnreadChange]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const sub = supabase
      .channel(`inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_messages",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchMessages(),
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [userId, fetchMessages]);

  // ── Mark message read ───────────────────────────────────────────────────────
  const markRead = async (msg) => {
    if (msg.direction === "outbound" && !msg.read_at) {
      await supabase
        .from("customer_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", msg.id);
      fetchMessages();
    }
    setSelected(msg);
  };

  // Dismiss popup + mark read
  const dismissPopup = async (msg) => {
    await supabase
      .from("customer_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", msg.id);
    setPopups((p) => p.filter((x) => x.id !== msg.id));
    fetchMessages();
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!body.trim()) {
      setSendMsg({ error: "Message body required." });
      return;
    }
    setSending(true);
    setSendMsg(null);
    const { error } = await supabase.from("customer_messages").insert({
      user_id: userId,
      direction: "inbound",
      message_type: composeType,
      subject: subject.trim() || null,
      body: body.trim(),
      sent_by: userId,
      sent_by_name: "Customer",
    });
    if (error) {
      setSendMsg({ error: "Failed to send. Please try again." });
    } else {
      setSendMsg({ success: "Message sent! We'll reply shortly." });
      setBody("");
      setSubject("");
      setComposeType("query");
      setTimeout(() => {
        setComposing(false);
        setSendMsg(null);
      }, 2000);
      fetchMessages();
    }
    setSending(false);
  };

  // ── Unread count ─────────────────────────────────────────────────────────────
  const unreadCount = messages.filter(
    (m) => m.direction === "outbound" && !m.read_at,
  ).length;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inp = {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    fontSize: 13,
    fontFamily: FONTS.body,
    background: C.white,
    color: C.text,
    boxSizing: "border-box",
    outline: "none",
  };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* ── Special Popups (Birthday / Tier Up / Event) ── */}
      {popups.map((popup) => {
        const m = getMeta(popup.message_type);
        return (
          <div
            key={popup.id}
            style={{
              background:
                popup.message_type === "birthday"
                  ? "#fef9e7"
                  : popup.message_type === "tier_up"
                    ? "#f0eeff"
                    : C.lightGreen,
              border: `1px solid ${m.color}`,
              borderLeft: `4px solid ${m.color}`,
              borderRadius: 4,
              padding: "16px 20px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
              position: "relative",
            }}
          >
            <span style={{ fontSize: 32 }}>{m.icon}</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 18,
                  color: m.color,
                  marginBottom: 4,
                }}
              >
                {popup.subject || m.label}
              </div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                {popup.body}
              </div>
            </div>
            <button
              onClick={() => dismissPopup(popup)}
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                color: C.muted,
                cursor: "pointer",
                padding: "4px 8px",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: FONTS.heading,
              fontSize: 24,
              color: C.green,
              margin: 0,
            }}
          >
            My Inbox
            {unreadCount > 0 && (
              <span
                style={{
                  display: "inline-block",
                  background: C.red,
                  color: C.white,
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  marginLeft: 8,
                  fontFamily: FONTS.body,
                  verticalAlign: "middle",
                }}
              >
                {unreadCount}
              </span>
            )}
          </h2>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            Messages from Protea Botanicals · Log faults &amp; queries
          </div>
        </div>
        <button
          onClick={() => {
            setComposing(true);
            setSendMsg(null);
          }}
          style={{
            background: C.green,
            color: C.white,
            border: "none",
            borderRadius: 2,
            padding: "9px 18px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: FONTS.body,
            cursor: "pointer",
          }}
        >
          + New Message
        </button>
      </div>

      {/* ── Compose Panel ── */}
      {composing && (
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.mid,
              marginBottom: 16,
            }}
          >
            New Message
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
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Type
              </label>
              <select
                value={composeType}
                onChange={(e) => setComposeType(e.target.value)}
                style={{ ...inp }}
              >
                <option value="query">💬 General Query</option>
                <option value="fault">⚠ Report a Fault</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Subject (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Vape pen not working"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ ...inp }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.muted,
                marginBottom: 5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Message *
            </label>
            <textarea
              rows={4}
              placeholder="Describe your query or issue…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ ...inp, resize: "vertical" }}
            />
          </div>

          {sendMsg?.error && (
            <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>
              ⚠ {sendMsg.error}
            </div>
          )}
          {sendMsg?.success && (
            <div
              style={{
                color: C.mid,
                fontSize: 12,
                marginBottom: 10,
                fontWeight: 600,
              }}
            >
              ✅ {sendMsg.success}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                background: sending ? "#aaa" : C.green,
                color: C.white,
                border: "none",
                borderRadius: 2,
                padding: "9px 20px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: FONTS.body,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "Sending…" : "Send Message"}
            </button>
            <button
              onClick={() => {
                setComposing(false);
                setSendMsg(null);
                setBody("");
                setSubject("");
              }}
              style={{
                background: "#f0ebe3",
                color: C.muted,
                border: "none",
                borderRadius: 2,
                padding: "9px 16px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: FONTS.body,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Message List ── */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: C.muted,
            fontSize: 13,
          }}
        >
          Loading messages…
        </div>
      ) : messages.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: `1px dashed ${C.border}`,
            borderRadius: 2,
            color: C.muted,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 18,
              color: C.green,
              marginBottom: 6,
            }}
          >
            No messages yet
          </div>
          <div style={{ fontSize: 13 }}>
            Use "New Message" above to contact us, or check back here for
            notices from Protea Botanicals.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 1 }}>
          {messages.map((msg) => {
            const m = getMeta(msg.message_type);
            const isUnread = msg.direction === "outbound" && !msg.read_at;
            const isInbound = msg.direction === "inbound";
            return (
              <div
                key={msg.id}
                onClick={() => markRead(msg)}
                style={{
                  background: isUnread ? `${m.color}08` : C.white,
                  border: `1px solid ${isUnread ? m.color + "40" : C.border}`,
                  borderLeft: `3px solid ${isInbound ? C.border : m.color}`,
                  borderRadius: 2,
                  padding: "14px 18px",
                  cursor: "pointer",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f4f0e8")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = isUnread
                    ? `${m.color}08`
                    : C.white)
                }
              >
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>
                  {m.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isUnread ? 700 : 500,
                        color: isUnread ? C.text : C.muted,
                        fontFamily: FONTS.body,
                      }}
                    >
                      {msg.subject || m.label}
                      {isUnread && (
                        <span
                          style={{
                            display: "inline-block",
                            background: m.color,
                            color: C.white,
                            borderRadius: 10,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 6px",
                            marginLeft: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          new
                        </span>
                      )}
                    </span>
                    <span
                      style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}
                    >
                      {fmtTime(msg.created_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: isUnread ? C.text : C.muted,
                      marginTop: 3,
                      lineHeight: 1.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isInbound
                      ? "You: "
                      : (msg.sent_by_name || "Protea Botanicals") + ": "}
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Full Message View Modal ── */}
      {selected && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 1000,
            }}
            onClick={() => setSelected(null)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: C.cream,
              borderRadius: 4,
              width: 520,
              maxWidth: "92vw",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              zIndex: 1001,
              padding: 28,
            }}
          >
            {(() => {
              const m = getMeta(selected.message_type);
              const isInbound = selected.direction === "inbound";
              return (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: 10, alignItems: "center" }}
                    >
                      <span style={{ fontSize: 24 }}>{m.icon}</span>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: m.color,
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                          }}
                        >
                          {m.label}
                        </div>
                        <div
                          style={{
                            fontFamily: FONTS.heading,
                            fontSize: 20,
                            color: C.green,
                            marginTop: 2,
                          }}
                        >
                          {selected.subject || m.label}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 20,
                        color: C.muted,
                        cursor: "pointer",
                        padding: "4px 8px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      marginBottom: 16,
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      {isInbound
                        ? "You"
                        : selected.sent_by_name || "Protea Botanicals"}
                    </span>
                    <span>{fmtTime(selected.created_at)}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: C.text,
                      background: C.white,
                      padding: 16,
                      borderRadius: 2,
                      border: `1px solid ${C.border}`,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selected.body}
                  </div>
                  {selected.metadata?.points_awarded > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        background: C.lightGold,
                        border: `1px solid ${C.gold}`,
                        borderRadius: 2,
                        fontSize: 13,
                        color: C.gold,
                        fontWeight: 600,
                      }}
                    >
                      🎁 {selected.metadata.points_awarded} bonus points added
                      to your account!
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
