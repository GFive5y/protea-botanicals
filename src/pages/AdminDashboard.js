// AdminDashboard.js v4.2
// Protea Botanicals — March 2026
// ★ v4.2 changes:
//   1. ADDED: Messages tab — shows all customer inbound messages (queries/faults)
//      with unread count badge, admin reply inline, mark-as-read
//   2. ADDED: unreadMsgCount state — polled on mount + realtime subscription
//   3. Tab label: "Messages" shows badge dot if unread count > 0
//   All v4.1 content preserved exactly.

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import AdminAnalytics from "./AdminAnalytics";
import StockControl from "../components/StockControl";
import AdminBatchManager from "../components/AdminBatchManager";
import AdminProductionModule from "../components/AdminProductionModule";
import AdminShipments from "../components/AdminShipments";
import AdminCustomerEngagement from "../components/AdminCustomerEngagement";
import AdminFraudSecurity from "../components/AdminFraudSecurity";
import AdminNotifications from "../components/AdminNotifications";
import HQDocuments from "../components/hq/HQDocuments";
import AdminQRCodes from "../components/AdminQRCodes";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  brown: "#7c3a10",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
  lightRed: "#f8d7da",
  orange: "#e67e22",
  lightGreen: "#eafaf1",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};
const makeBtn = (bg, color = C.white) => ({
  background: bg,
  color,
  border: "none",
  borderRadius: "2px",
  padding: "10px 20px",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontFamily: FONTS.body,
  cursor: "pointer",
  transition: "opacity 0.2s",
});

function StatCard({ label, value, sub, color = C.green, icon }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "20px",
        flex: "1 1 200px",
        minWidth: "180px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          fontFamily: FONTS.body,
          marginBottom: "8px",
        }}
      >
        {icon && <span style={{ marginRight: "6px" }}>{icon}</span>}
        {label}
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color,
          fontFamily: FONTS.heading,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "12px",
            color: C.muted,
            fontFamily: FONTS.body,
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, label, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...makeBtn(
          active ? C.green : "transparent",
          active ? C.white : C.green,
        ),
        borderBottom: active
          ? `3px solid ${C.accent}`
          : "3px solid transparent",
        borderRadius: 0,
        padding: "12px 20px",
        position: "relative",
      }}
    >
      {label}
      {badge > 0 && (
        <span
          style={{
            display: "inline-block",
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
          {badge}
        </span>
      )}
    </button>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

// ── NEW v4.2: AdminMessages component ────────────────────────────────────────
function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAdminUser(user));
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    // Fetch all inbound messages (from customers) + unread
    const { data } = await supabase
      .from("customer_messages")
      .select("*")
      .eq("direction", "inbound")
      .order("created_at", { ascending: false });
    const msgs = data || [];
    setMessages(msgs);

    // Load profiles for senders
    const userIds = [...new Set(msgs.map((m) => m.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("user_profiles")
        .select("id,full_name,phone,loyalty_points,loyalty_tier")
        .in("id", userIds);
      const map = {};
      (profs || []).forEach((p) => {
        map[p.id] = p;
      });
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime: new inbound messages
  useEffect(() => {
    const sub = supabase
      .channel("admin-messages-inbox")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_messages",
          filter: "direction=eq.inbound",
        },
        loadMessages,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [loadMessages]);

  const markRead = async (msgId) => {
    await supabase
      .from("customer_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", msgId);
    loadMessages();
  };

  const handleReply = async (msg) => {
    if (!replyBody.trim()) {
      setSendResult({ error: "Reply body required." });
      return;
    }
    setSending(true);
    setSendResult(null);
    const { error } = await supabase.from("customer_messages").insert({
      user_id: msg.user_id,
      direction: "outbound",
      message_type: "response",
      subject: msg.subject ? `Re: ${msg.subject}` : "Re: Your message",
      body: replyBody.trim(),
      sent_by: adminUser?.id || null,
      sent_by_name: adminUser?.email ? adminUser.email.split("@")[0] : "Admin",
      metadata: {},
    });
    // Mark original as read
    await supabase
      .from("customer_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", msg.id);

    if (error) {
      setSendResult({ error: "Failed to send reply." });
    } else {
      setSendResult({ success: "Reply sent!" });
      setReplyBody("");
      setTimeout(() => {
        setReplyTo(null);
        setSendResult(null);
      }, 1500);
      loadMessages();
    }
    setSending(false);
  };

  const MSG_TYPE_META = {
    query: { label: "Query", icon: "💬", color: C.blue },
    fault: { label: "Fault", icon: "⚠", color: C.red },
  };

  const filtered =
    filterType === "all"
      ? messages
      : filterType === "unread"
        ? messages.filter((m) => !m.read_at)
        : messages.filter((m) => m.message_type === filterType);

  const unreadCount = messages.filter((m) => !m.read_at).length;

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: 22,
              margin: 0,
            }}
          >
            Customer Messages
            {unreadCount > 0 && (
              <span
                style={{
                  display: "inline-block",
                  background: C.red,
                  color: C.white,
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  marginLeft: 8,
                  fontFamily: FONTS.body,
                  verticalAlign: "middle",
                }}
              >
                {unreadCount} new
              </span>
            )}
          </h2>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            Inbound queries and fault reports from customers
          </div>
        </div>
        <button
          onClick={loadMessages}
          style={{ ...makeBtn(C.mid), padding: "8px 16px", fontSize: 10 }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 16,
          width: "fit-content",
        }}
      >
        {[
          { key: "all", label: `All (${messages.length})` },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "query", label: "Queries" },
          { key: "fault", label: "Faults" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            style={{
              padding: "8px 16px",
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: FONTS.body,
              background: filterType === f.key ? C.green : C.white,
              color: filterType === f.key ? C.white : C.muted,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: C.muted }}>
          Loading messages…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            border: `1px dashed ${C.border}`,
            borderRadius: 2,
            color: C.muted,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 18,
              color: C.green,
              marginBottom: 6,
            }}
          >
            No messages
          </div>
          <div style={{ fontSize: 13 }}>
            Customer queries and fault reports appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((msg) => {
            const meta = MSG_TYPE_META[msg.message_type] || {
              label: msg.message_type,
              icon: "📩",
              color: C.muted,
            };
            const prof = profiles[msg.user_id];
            const isUnread = !msg.read_at;
            const isReplying = replyTo?.id === msg.id;
            return (
              <div
                key={msg.id}
                style={{
                  background: isUnread ? "#fffdf5" : C.white,
                  border: `1px solid ${isUnread ? C.orange + "50" : C.border}`,
                  borderLeft: `4px solid ${meta.color}`,
                  borderRadius: 2,
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: meta.color,
                        }}
                      >
                        {meta.icon} {meta.label}
                      </span>
                      {isUnread && (
                        <span
                          style={{
                            fontSize: 9,
                            background: C.orange,
                            color: C.white,
                            padding: "1px 6px",
                            borderRadius: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          NEW
                        </span>
                      )}
                      {msg.subject && (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.text,
                          }}
                        >
                          — {msg.subject}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                      {prof?.full_name || "Anonymous"}
                      {prof?.phone ? ` · ${prof.phone}` : ""} ·{" "}
                      {fmtTime(msg.created_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {isUnread && (
                      <button
                        onClick={() => markRead(msg.id)}
                        style={{
                          ...makeBtn(C.mid),
                          fontSize: 9,
                          padding: "4px 10px",
                        }}
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isReplying) {
                          setReplyTo(null);
                        } else {
                          setReplyTo(msg);
                          setReplyBody("");
                          setSendResult(null);
                          if (isUnread) markRead(msg.id);
                        }
                      }}
                      style={{
                        ...makeBtn(isReplying ? C.muted : C.green),
                        fontSize: 9,
                        padding: "4px 10px",
                      }}
                    >
                      {isReplying ? "✕ Cancel" : "↩ Reply"}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: C.text,
                    lineHeight: 1.7,
                    background: C.cream,
                    padding: "10px 14px",
                    borderRadius: 2,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.body}
                </div>

                {isReplying && (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      rows={3}
                      placeholder="Write your reply…"
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                        fontSize: 13,
                        fontFamily: FONTS.body,
                        resize: "vertical",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                    {sendResult?.error && (
                      <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>
                        ⚠ {sendResult.error}
                      </div>
                    )}
                    {sendResult?.success && (
                      <div
                        style={{
                          color: C.mid,
                          fontSize: 12,
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        ✅ {sendResult.success}
                      </div>
                    )}
                    <button
                      onClick={() => handleReply(msg)}
                      disabled={sending}
                      style={{
                        ...makeBtn(C.green, C.white, sending),
                        marginTop: 8,
                        fontSize: 10,
                      }}
                    >
                      {sending ? "Sending…" : "Send Reply"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [documentsTargetId, setDocumentsTargetId] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [unreadMsgCount, setUnreadMsgCount] = useState(0); // v4.2
  const [analytics, setAnalytics] = useState({
    total: 0,
    claimed: 0,
    distributed: 0,
    inStock: 0,
    claimRate: 0,
    totalPointsDistributed: 0,
    activeStockists: 0,
    avgTimeToClaim: null,
    userCount: 0,
  });

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("user_profiles").select("*");
    setUsers(data || []);
  }, []);

  // v4.2: fetch unread customer messages count
  const fetchUnreadCount = useCallback(async () => {
    const { count } = await supabase
      .from("customer_messages")
      .select("*", { count: "exact", head: true })
      .eq("direction", "inbound")
      .is("read_at", null);
    setUnreadMsgCount(count || 0);
  }, []);

  const computeAnalytics = useCallback(async () => {
    try {
      const { count: total } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      const { count: claimed } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "claimed");
      const { count: distributed } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "distributed");
      const { count: inStock } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_stock");
      const claimRate =
        total > 0 ? (((claimed || 0) / total) * 100).toFixed(1) : 0;
      const { data: pointsData } = await supabase
        .from("products")
        .select("points_value")
        .eq("status", "claimed");
      const totalPointsDistributed = (pointsData || []).reduce(
        (s, p) => s + (p.points_value || 10),
        0,
      );
      const { data: stockistData } = await supabase
        .from("products")
        .select("stockist_id")
        .not("stockist_id", "is", null);
      const activeStockists = new Set(
        (stockistData || []).map((p) => p.stockist_id),
      ).size;
      const { data: timeData } = await supabase
        .from("products")
        .select("distributed_at,claimed_at")
        .eq("status", "claimed")
        .not("distributed_at", "is", null)
        .not("claimed_at", "is", null);
      let avgTimeToClaim = null;
      if (timeData && timeData.length > 0) {
        const hrs = timeData.reduce(
          (s, p) =>
            s + (new Date(p.claimed_at) - new Date(p.distributed_at)) / 3600000,
          0,
        );
        avgTimeToClaim = (hrs / timeData.length).toFixed(1);
      }
      const { count: userCount } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });
      setAnalytics({
        total: total || 0,
        claimed: claimed || 0,
        distributed: distributed || 0,
        inStock: inStock || 0,
        claimRate,
        totalPointsDistributed,
        activeStockists,
        avgTimeToClaim,
        userCount: userCount || 0,
      });
    } catch (e) {
      console.error("Analytics error:", e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    computeAnalytics();
    fetchUnreadCount();
  }, [fetchUsers, computeAnalytics, fetchUnreadCount]);

  // v4.2: realtime badge refresh
  useEffect(() => {
    const sub = supabase
      .channel("admin-dashboard-msgs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_messages",
          filter: "direction=eq.inbound",
        },
        fetchUnreadCount,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "customer_messages" },
        fetchUnreadCount,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchUnreadCount]);

  const handleNavigateToQR = () => {
    setTab("qr_codes");
  };
  const handleNavigateToDocuments = (documentId) => {
    setDocumentsTargetId(documentId);
    setTab("documents");
  };

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Header */}
      <div
        style={{
          background: C.green,
          padding: "20px 32px",
          borderRadius: "2px",
          marginBottom: "24px",
        }}
      >
        <span
          style={{
            color: C.accent,
            fontSize: "11px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Protea Botanicals
        </span>
        <h1
          style={{
            color: C.white,
            fontFamily: FONTS.heading,
            fontSize: "24px",
            margin: "4px 0 0",
          }}
        >
          Admin Dashboard
        </h1>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          background: C.white,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          gap: 0,
          overflowX: "auto",
          marginBottom: "24px",
          borderRadius: "2px",
        }}
      >
        <TabBtn
          active={tab === "overview"}
          label="Overview"
          onClick={() => setTab("overview")}
        />
        <TabBtn
          active={tab === "batches"}
          label="Batches"
          onClick={() => setTab("batches")}
        />
        <TabBtn
          active={tab === "shipments"}
          label="Shipments"
          onClick={() => setTab("shipments")}
        />
        <TabBtn
          active={tab === "qr_codes"}
          label="QR Codes"
          onClick={() => setTab("qr_codes")}
        />
        <TabBtn
          active={tab === "users"}
          label="Users"
          onClick={() => setTab("users")}
        />
        <TabBtn
          active={tab === "customers"}
          label="Customers"
          onClick={() => setTab("customers")}
        />
        <TabBtn
          active={tab === "messages"}
          label="Messages"
          badge={unreadMsgCount}
          onClick={() => {
            setTab("messages");
          }}
        />
        <TabBtn
          active={tab === "security"}
          label="Security"
          onClick={() => setTab("security")}
        />
        <TabBtn
          active={tab === "notifications"}
          label="Notifications"
          onClick={() => setTab("notifications")}
        />
        <TabBtn
          active={tab === "analytics"}
          label="Analytics"
          onClick={() => setTab("analytics")}
        />
        <TabBtn
          active={tab === "stock"}
          label="Stock"
          onClick={() => setTab("stock")}
        />
        <TabBtn
          active={tab === "documents"}
          label="📄 Documents"
          onClick={() => {
            setDocumentsTargetId(null);
            setTab("documents");
          }}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: C.lightRed,
            border: `1px solid ${C.red}`,
            padding: "12px 16px",
            borderRadius: "2px",
            marginBottom: "20px",
            color: C.red,
            fontSize: "13px",
          }}
        >
          ⚠️ {error}
          <button
            onClick={() => setError("")}
            style={{
              float: "right",
              background: "none",
              border: "none",
              color: C.red,
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div>
          <h2
            style={{
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: "22px",
              marginBottom: "24px",
            }}
          >
            System Overview
          </h2>
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            <StatCard
              icon="📦"
              label="Total QR Codes"
              value={analytics.total}
              color={C.green}
            />
            <StatCard
              icon="✅"
              label="Claimed"
              value={analytics.claimed}
              sub={`${analytics.claimRate}% claim rate`}
              color={C.accent}
            />
            <StatCard
              icon="📤"
              label="Distributed"
              value={analytics.distributed}
              color={C.gold}
            />
            <StatCard
              icon="🏪"
              label="In Stock"
              value={analytics.inStock}
              color={C.blue}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            <StatCard
              icon="🎯"
              label="Points Distributed"
              value={analytics.totalPointsDistributed}
              color={C.gold}
            />
            <StatCard
              icon="🏬"
              label="Active Stockists"
              value={analytics.activeStockists}
              color={C.brown}
            />
            <StatCard
              icon="⏱️"
              label="Avg Time to Claim"
              value={
                analytics.avgTimeToClaim ? `${analytics.avgTimeToClaim}h` : "—"
              }
              sub="hours from distribution"
              color={C.blue}
            />
            <StatCard
              icon="👥"
              label="Total Users"
              value={analytics.userCount}
              color={C.green}
            />
          </div>
          {/* v4.2: Messages alert */}
          {unreadMsgCount > 0 && (
            <div
              style={{
                padding: "12px 16px",
                background: "#fffdf5",
                border: `1px solid ${C.orange}`,
                borderRadius: 2,
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 18 }}>💬</span>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                {unreadMsgCount} unread customer message
                {unreadMsgCount !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setTab("messages")}
                style={{
                  ...makeBtn(C.orange),
                  fontSize: 10,
                  padding: "5px 14px",
                  marginLeft: "auto",
                }}
              >
                View Messages
              </button>
            </div>
          )}
          <h3
            style={{
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: "18px",
              marginBottom: "16px",
            }}
          >
            Quick Actions
          </h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => setTab("shipments")} style={makeBtn(C.blue)}>
              🚚 SHIPMENTS
            </button>
            <button
              onClick={() => setTab("production")}
              style={makeBtn(C.gold)}
            >
              ⚙️ PRODUCTION RUNS
            </button>
            <button onClick={() => setTab("batches")} style={makeBtn(C.green)}>
              🌿 MANAGE BATCHES
            </button>
            <button
              onClick={() => setTab("qr_codes")}
              style={makeBtn(C.accent)}
            >
              QR ENGINE v2
            </button>
            <button onClick={() => setTab("stock")} style={makeBtn(C.mid)}>
              STOCK CONTROL
            </button>
            <button onClick={() => setTab("customers")} style={makeBtn(C.mid)}>
              👥 CUSTOMERS
            </button>
            <button
              onClick={() => {
                setDocumentsTargetId(null);
                setTab("documents");
              }}
              style={makeBtn(C.mid)}
            >
              📄 DOCUMENTS
            </button>
            <button
              onClick={() => {
                computeAnalytics();
                fetchUsers();
                fetchUnreadCount();
              }}
              style={makeBtn(C.mid)}
            >
              REFRESH DATA
            </button>
          </div>
        </div>
      )}

      {tab === "shipments" && <AdminShipments />}
      {tab === "production" && <AdminProductionModule />}
      {tab === "batches" && (
        <AdminBatchManager
          onNavigateToQR={handleNavigateToQR}
          onNavigateToDocuments={handleNavigateToDocuments}
        />
      )}
      {tab === "customers" && <AdminCustomerEngagement />}
      {tab === "messages" && <AdminMessages />}
      {tab === "security" && <AdminFraudSecurity />}
      {tab === "notifications" && <AdminNotifications />}
      {tab === "qr_codes" && <AdminQRCodes />}
      {tab === "analytics" && <AdminAnalytics />}
      {tab === "stock" && <StockControl />}
      {tab === "documents" && <HQDocuments initialDocId={documentsTargetId} />}

      {/* USERS */}
      {tab === "users" && (
        <div>
          <h2
            style={{
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: "22px",
              marginBottom: "20px",
            }}
          >
            User Management
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: C.white,
                border: `1px solid ${C.border}`,
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: C.green, color: C.white }}>
                  {["Email / ID", "Role", "Points", "Tier", "Joined"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontSize: "10px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: C.muted,
                      }}
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u, i) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: i % 2 === 0 ? C.white : C.cream,
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "monospace",
                          fontSize: "11px",
                        }}
                      >
                        {u.email || u.id?.substring(0, 12) + "..."}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            background:
                              u.role === "admin"
                                ? C.gold
                                : u.role === "retailer"
                                  ? C.brown
                                  : C.blue,
                            color: C.white,
                            padding: "2px 8px",
                            borderRadius: "2px",
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          {u.role || "customer"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        {u.loyalty_points || 0}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textTransform: "capitalize",
                        }}
                      >
                        {u.loyalty_tier || "bronze"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: "12px",
                          color: C.muted,
                        }}
                      >
                        {fmtDate(u.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
