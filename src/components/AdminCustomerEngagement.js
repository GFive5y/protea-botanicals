// src/components/AdminCustomerEngagement.js v2.2
// WP-GUIDE-C++: usePageContext 'customers' wired + WorkflowGuide added
// v2.1 — Inbox / Messaging layer + broadcast, compose, auto-triggers
// v2.0 — calcEngagement scoring, churn risk, 360 drawer

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "./WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  white: "#fff",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  orange: "#e67e22",
  lightOrange: "#fef9f0",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  platinum: "#7b68ee",
  lightPlatinum: "#f0eeff",
  lightGreen: "#eafaf1",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};
const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

const TIERS = {
  platinum: {
    label: "Platinum",
    min: 1000,
    color: "#7b68ee",
    bg: "#f0eeff",
    icon: "💎",
  },
  gold: {
    label: "Gold",
    min: 500,
    color: "#b5935a",
    bg: "#fef9e7",
    icon: "🥇",
  },
  silver: {
    label: "Silver",
    min: 200,
    color: "#8e9ba8",
    bg: "#f4f6f8",
    icon: "🥈",
  },
  bronze: {
    label: "Bronze",
    min: 0,
    color: "#a0674b",
    bg: "#fdf3ee",
    icon: "🥉",
  },
};
function getTier(points) {
  if (points >= 1000) return "platinum";
  if (points >= 500) return "gold";
  if (points >= 200) return "silver";
  return "bronze";
}
function getTierCfg(points) {
  return TIERS[getTier(points)];
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
} // eslint-disable-line no-unused-vars
function daysSince(d) {
  if (!d) return null;
  return Math.floor((new Date() - new Date(d)) / 86400000);
}
function timeAgo(ts) {
  if (!ts) return "—";
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.round(diff / 86400)}d ago`;
  return fmtDate(ts);
}
function profileScore(p) {
  if (!p) return 0;
  let s = 0;
  if (p.full_name) s += 20;
  if (p.phone) s += 20;
  if (p.date_of_birth) s += 20;
  if (p.province) s += 20;
  if (p.popia_consented) s += 20;
  return s;
}

const inputStyle = {
  padding: "9px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 13,
  fontFamily: FONTS.body,
  backgroundColor: C.white,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};
const makeBtn = (bg = C.mid, color = C.white, disabled = false) => ({
  padding: "9px 18px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: "none",
  borderRadius: 2,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: FONTS.body,
  opacity: disabled ? 0.6 : 1,
});

function calcEngagement(profile) {
  const days = profile.last_active_at ? daysSince(profile.last_active_at) : 999;
  let recency = 0;
  if (days <= 7) recency = 30;
  else if (days <= 14) recency = 24;
  else if (days <= 30) recency = 16;
  else if (days <= 60) recency = 8;
  else if (days <= 90) recency = 3;
  const scanScore = Math.min(
    25,
    Math.round(((profile.total_scans || 0) / 20) * 25),
  );
  const pointScore = Math.min(
    20,
    Math.round(((profile.loyalty_points || 0) / 500) * 20),
  );
  let profScore = 0;
  if (profile.full_name) profScore += 3;
  if (profile.phone) profScore += 3;
  if (profile.date_of_birth) profScore += 2;
  if (profile.province) profScore += 2;
  if (profile.gender) profScore += 2;
  if (profile.profile_complete) profScore += 3;
  profScore = Math.min(15, profScore);
  let optScore = 0;
  if (profile.popia_consented) optScore += 4;
  if (profile.marketing_opt_in) optScore += 3;
  if (profile.analytics_opt_in) optScore += 3;
  optScore = Math.min(10, optScore);
  const total = Math.min(
    100,
    Math.max(0, recency + scanScore + pointScore + profScore + optScore),
  );
  return {
    total,
    breakdown: {
      recency: { score: recency, max: 30, label: "Recency (last active)" },
      scans: { score: scanScore, max: 25, label: "Scan volume" },
      points: { score: pointScore, max: 20, label: "Points balance" },
      profile: { score: profScore, max: 15, label: "Profile completeness" },
      optins: { score: optScore, max: 10, label: "Opt-ins & consents" },
    },
  };
}
function isChurnRisk(profile) {
  const days = daysSince(profile.last_active_at);
  const lowPoints = (profile.loyalty_points || 0) < 50;
  const inactiveScans = (profile.total_scans || 0) === 0;
  return (days !== null && days > 45) || (lowPoints && inactiveScans);
}

function TierBadge({ points }) {
  const t = getTierCfg(points || 0);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        backgroundColor: t.bg,
        color: t.color,
        border: `1px solid ${t.color}40`,
      }}
    >
      {t.icon} {t.label}
    </span>
  );
}
function EngBar({ score }) {
  const color = score >= 70 ? C.accent : score >= 40 ? C.gold : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{ flex: 1, height: 5, background: C.border, borderRadius: 3 }}
      >
        <div
          style={{
            height: "100%",
            width: `${score}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 28 }}>
        {score}
      </span>
    </div>
  );
}
function ScoreBadge({ score }) {
  const color = score >= 80 ? C.mid : score >= 40 ? C.orange : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 50,
          height: 5,
          background: C.border,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
      <span
        style={{ fontSize: 11, color, fontWeight: 600, fontFamily: FONTS.body }}
      >
        {score}%
      </span>
    </div>
  );
}
function Pill({ label, color, bg }) {
  return (
    <span
      style={{
        background: bg || "#eee",
        color: color || C.muted,
        borderRadius: 10,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 600,
        fontFamily: FONTS.body,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {label}
    </span>
  );
}

const MSG_META = {
  query: { label: "Query", icon: "💬", color: C.blue },
  fault: { label: "Fault", icon: "⚠", color: C.red },
  admin_notice: { label: "Notice", icon: "📢", color: C.mid },
  birthday: { label: "Birthday", icon: "🎂", color: C.gold },
  tier_up: { label: "Tier Upgrade", icon: "🏆", color: "#7b68ee" },
  event: { label: "Event", icon: "🎪", color: "#9b6b9e" },
  response: { label: "Response", icon: "↩️", color: C.mid },
  broadcast: { label: "Broadcast", icon: "📣", color: C.accent },
  general: { label: "Message", icon: "📩", color: C.muted },
};
function getMsgMeta(type) {
  return MSG_META[type] || MSG_META.general;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCustomerEngagement() {
  // WP-GUIDE-C++: wire 'customers' context for WorkflowGuide live status
  const ctx = usePageContext("customers", null);

  const [customers, setCustomers] = useState([]);
  const [engScores, setEngScores] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [sortBy, setSortBy] = useState("engagement");
  const [selected, setSelected] = useState(null);
  const [drawerTab, setDrawerTab] = useState("profile");
  const [drawerData, setDrawerData] = useState({ txns: [], scans: [] });
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    province: "",
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeForm, setComposeForm] = useState({
    message_type: "admin_notice",
    subject: "",
    body: "",
    bonus_points: 0,
  });
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendMsgResult, setSendMsgResult] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [birthdayAlert, setBirthdayAlert] = useState(false);
  const [tierUpAlert, setTierUpAlert] = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    subject: "",
    body: "",
    message_type: "broadcast",
  });
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAdminUser(user));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, txnRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("*")
          .eq("role", "customer")
          .order("created_at", { ascending: false }),
        supabase
          .from("loyalty_transactions")
          .select(
            "id,user_id,points,transaction_type,description,transaction_date,source",
          )
          .order("transaction_date", { ascending: false }),
      ]);
      const custs = custRes.data || [],
        txns = txnRes.data || [];
      setCustomers(custs);
      setTransactions(txns);
      const scores = {};
      custs.forEach((c) => {
        scores[c.id] = calcEngagement(c);
      });
      setEngScores(scores);
    } catch (err) {
      console.error("CustomerEngagement fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!selected) return;
    setDrawerLoading(true);
    setDrawerData({ txns: [], scans: [] });
    Promise.all([
      supabase
        .from("loyalty_transactions")
        .select(
          "id,points,transaction_type,description,transaction_date,source",
        )
        .eq("user_id", selected.id)
        .order("transaction_date", { ascending: false })
        .limit(50),
      supabase
        .from("scan_logs")
        .select(
          "id,scanned_at,scan_outcome,qr_type,campaign_name,points_awarded,ip_city,ip_province,device_type,location_source,qr_code",
        )
        .eq("user_id", selected.id)
        .order("scanned_at", { ascending: false })
        .limit(50),
    ]).then(([txnRes, scanRes]) => {
      setDrawerData({ txns: txnRes.data || [], scans: scanRes.data || [] });
      setDrawerLoading(false);
    });
    const today = new Date();
    if (selected.date_of_birth) {
      const dob = new Date(selected.date_of_birth);
      setBirthdayAlert(
        dob.getMonth() === today.getMonth() &&
          dob.getDate() === today.getDate(),
      );
    } else {
      setBirthdayAlert(false);
    }
    const computedTier = getTier(selected.loyalty_points || 0);
    const storedTier = selected.loyalty_tier || "bronze";
    if (computedTier !== storedTier && computedTier !== "bronze") {
      setTierUpAlert({ old: storedTier, new: computedTier });
    } else {
      setTierUpAlert(null);
    }
  }, [selected]);

  const loadMessages = useCallback(async () => {
    if (!selected) return;
    setMsgsLoading(true);
    const { data } = await supabase
      .from("customer_messages")
      .select("*")
      .eq("user_id", selected.id)
      .order("created_at", { ascending: false });
    setMessages(data || []);
    setMsgsLoading(false);
  }, [selected]);

  useEffect(() => {
    if (drawerTab === "messages") loadMessages();
  }, [drawerTab, loadMessages]);

  const handleBulkSave = async () => {
    setSaving(true);
    let saved = 0;
    for (const c of customers) {
      const eng = engScores[c.id];
      if (!eng) continue;
      const { error } = await supabase
        .from("user_profiles")
        .update({
          engagement_score: eng.total,
          churn_risk: isChurnRisk(c),
          loyalty_tier: getTier(c.loyalty_points || 0),
        })
        .eq("id", c.id);
      if (!error) saved++;
    }
    setSaving(false);
    showToast(`✓ ${saved} customer profiles updated`);
    fetchAll();
  };

  async function handleRegister() {
    setRegLoading(true);
    setRegMsg(null);
    if (!regForm.email) {
      setRegMsg({ error: "Email is required" });
      setRegLoading(false);
      return;
    }
    const tempPassword = Math.random().toString(36).slice(-10) + "Pb1!";
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: regForm.email,
      password: tempPassword,
      options: { data: { full_name: regForm.full_name, phone: regForm.phone } },
    });
    if (authErr) {
      setRegMsg({ error: authErr.message });
      setRegLoading(false);
      return;
    }
    const userId = authData?.user?.id;
    if (userId) {
      await supabase
        .from("user_profiles")
        .upsert({
          id: userId,
          role: "customer",
          loyalty_points: 0,
          full_name: regForm.full_name || null,
          phone: regForm.phone || null,
          province: regForm.province || null,
          acquisition_channel: "in_store",
          profile_complete: false,
          created_at: new Date().toISOString(),
        });
    }
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "admin_alert",
          message: `🏪 IN-STORE REGISTRATION\nName: ${regForm.full_name || "Not provided"}\nEmail: ${regForm.email}\nPhone: ${regForm.phone || "—"}\nProvince: ${regForm.province || "—"}\nRegistered by store staff at ${new Date().toLocaleString("en-ZA")}`,
        }),
      });
    } catch {
      /* non-blocking */
    }
    setRegMsg({
      success: `Registered! They'll receive a password-set email at ${regForm.email}`,
    });
    setRegForm({ email: "", full_name: "", phone: "", province: "" });
    setRegLoading(false);
    setTimeout(() => {
      setShowRegister(false);
      setRegMsg(null);
      fetchAll();
    }, 3000);
  }

  async function handleDeleteRequest(customer) {
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "admin_alert",
          message: `🗑️ DATA DELETION REQUEST\nCustomer: ${customer.full_name || "Anonymous"}\nUser ID: ${customer.id}\nPhone: ${customer.phone || "—"}\nPoints: ${customer.loyalty_points || 0} · Tier: ${getTier(customer.loyalty_points || 0)}\nRequested: ${new Date().toLocaleString("en-ZA")}\n\n⚠️ POPIA requires action within 30 days.`,
        }),
      });
      setDeleteConfirm({ done: true });
    } catch {
      setDeleteConfirm({ error: true });
    }
  }

  const handleSendMessage = async () => {
    if (!composeForm.body.trim()) {
      setSendMsgResult({ error: "Message body is required." });
      return;
    }
    setSendingMsg(true);
    setSendMsgResult(null);
    const metadata = {};
    if (composeForm.bonus_points > 0)
      metadata.points_awarded = Number(composeForm.bonus_points);
    const { error } = await supabase
      .from("customer_messages")
      .insert({
        user_id: selected.id,
        direction: "outbound",
        message_type: composeForm.message_type,
        subject: composeForm.subject.trim() || null,
        body: composeForm.body.trim(),
        sent_by: adminUser?.id || null,
        sent_by_name: adminUser?.email
          ? adminUser.email.split("@")[0]
          : "Admin",
        metadata,
      });
    if (!error && composeForm.bonus_points > 0) {
      const pts = Number(composeForm.bonus_points);
      await supabase
        .from("user_profiles")
        .update({ loyalty_points: (selected.loyalty_points || 0) + pts })
        .eq("id", selected.id);
      await supabase
        .from("loyalty_transactions")
        .insert({
          user_id: selected.id,
          points: pts,
          transaction_type: "ADMIN_BONUS",
          description: `Admin bonus: ${composeForm.subject || composeForm.message_type}`,
          transaction_date: new Date().toISOString(),
        });
    }
    if (error) {
      setSendMsgResult({
        error: "Failed to send. Check customer_messages table exists.",
      });
    } else {
      setSendMsgResult({ success: "Message sent!" });
      setComposeForm({
        message_type: "admin_notice",
        subject: "",
        body: "",
        bonus_points: 0,
      });
      setTimeout(() => {
        setComposing(false);
        setSendMsgResult(null);
      }, 1500);
      loadMessages();
    }
    setSendingMsg(false);
  };

  const prefillBirthday = () => {
    setComposing(true);
    setComposeForm({
      message_type: "birthday",
      subject: "🎂 Happy Birthday from Protea Botanicals!",
      body: `Hi ${selected.full_name || "there"},\n\nWishing you a wonderful birthday from all of us at Protea Botanicals! 🌿\n\nAs a thank you, we've added a special birthday bonus to your account. Enjoy your day!`,
      bonus_points: 50,
    });
  };
  const prefillTierUp = () => {
    setComposing(true);
    setComposeForm({
      message_type: "tier_up",
      subject: `🏆 You've reached ${tierUpAlert?.new ? TIERS[tierUpAlert.new]?.label : "a new tier"}!`,
      body: `Hi ${selected.full_name || "there"},\n\nCongratulations! You've been upgraded to ${TIERS[tierUpAlert?.new]?.label || "a new tier"} status at Protea Botanicals. 🎉\n\nKeep scanning and earning to unlock even more exclusive rewards. Thank you for your loyalty!`,
      bonus_points: 0,
    });
  };

  const handleBroadcast = async () => {
    if (!broadcastForm.body.trim()) {
      setBroadcastResult({ error: "Body required." });
      return;
    }
    setBroadcasting(true);
    setBroadcastResult(null);
    const targets = displayed.filter(
      (c) => c.marketing_opt_in || broadcastForm.message_type === "broadcast",
    );
    let sent = 0;
    for (const c of targets) {
      const { error } = await supabase
        .from("customer_messages")
        .insert({
          user_id: c.id,
          direction: "outbound",
          message_type: broadcastForm.message_type,
          subject: broadcastForm.subject.trim() || null,
          body: broadcastForm.body.trim(),
          sent_by: adminUser?.id || null,
          sent_by_name: "Protea Botanicals",
          metadata: {},
        });
      if (!error) sent++;
    }
    setBroadcastResult({
      success: `Sent to ${sent} customer${sent !== 1 ? "s" : ""}!`,
    });
    setBroadcasting(false);
    setTimeout(() => {
      setShowBroadcast(false);
      setBroadcastResult(null);
      setBroadcastForm({ subject: "", body: "", message_type: "broadcast" });
    }, 3000);
  };

  const handleDeleteMessage = async (msgId) => {
    await supabase.from("customer_messages").delete().eq("id", msgId);
    loadMessages();
  };

  // ── Computed stats ──
  const avgEng =
    customers.length > 0
      ? Math.round(
          customers.reduce((s, c) => s + (engScores[c.id]?.total || 0), 0) /
            customers.length,
        )
      : 0;
  const churnCount = customers.filter((c) => isChurnRisk(c)).length;
  const optInCount = customers.filter((c) => c.marketing_opt_in).length;
  const optInRate =
    customers.length > 0
      ? Math.round((optInCount / customers.length) * 100)
      : 0;
  const activeCount = customers.filter((c) => {
    const d = daysSince(c.last_active_at);
    return d !== null && d <= 30;
  }).length;
  const popiaCount = customers.filter((c) => c.popia_consented).length;
  const avgProfile =
    customers.length > 0
      ? Math.round(
          customers.reduce((s, c) => s + profileScore(c), 0) / customers.length,
        )
      : 0;
  const tierCounts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  customers.forEach((c) => {
    tierCounts[getTier(c.loyalty_points || 0)]++;
  });

  // ── Filter + sort ──
  let displayed = [...customers];
  if (filter === "at_risk") displayed = displayed.filter((c) => isChurnRisk(c));
  if (filter === "active")
    displayed = displayed.filter((c) => {
      const d = daysSince(c.last_active_at);
      return d !== null && d <= 30;
    });
  if (filter === "opted_in")
    displayed = displayed.filter((c) => c.marketing_opt_in);
  if (filter === "complete")
    displayed = displayed.filter((c) => profileScore(c) >= 100);
  if (tierFilter !== "all")
    displayed = displayed.filter(
      (c) => getTier(c.loyalty_points || 0) === tierFilter,
    );
  if (search) {
    const q = search.toLowerCase();
    displayed = displayed.filter(
      (c) =>
        (c.full_name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.province || "").toLowerCase().includes(q) ||
        (c.referral_code || "").toLowerCase().includes(q),
    );
  }
  if (sortBy === "engagement")
    displayed.sort(
      (a, b) => (engScores[b.id]?.total || 0) - (engScores[a.id]?.total || 0),
    );
  if (sortBy === "points")
    displayed.sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0));
  if (sortBy === "recent")
    displayed.sort(
      (a, b) =>
        new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0),
    );
  if (sortBy === "scans")
    displayed.sort((a, b) => (b.total_scans || 0) - (a.total_scans || 0));
  if (sortBy === "risk")
    displayed.sort(
      (a, b) => (isChurnRisk(b) ? 1 : 0) - (isChurnRisk(a) ? 1 : 0),
    );
  if (sortBy === "join_date")
    displayed.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
  if (sortBy === "profile")
    displayed.sort((a, b) => profileScore(b) - profileScore(a));
  const msgUnreadCount = messages.filter(
    (m) => m.direction === "inbound" && !m.read_at,
  ).length;

  return (
    <div style={{ fontFamily: FONTS.body, position: "relative" }}>
      {/* WP-GUIDE-C++: WorkflowGuide with live customers context */}
      <WorkflowGuide
        context={ctx}
        tabId="customers"
        onAction={() => {}}
        defaultOpen={true}
      />

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.green,
            color: C.white,
            padding: "12px 24px",
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
            fontFamily: FONTS.body,
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
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: 24,
              margin: 0,
            }}
          >
            Customer Engagement
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Live engagement scoring · Churn risk detection · Loyalty tier
            management · 360° profiles
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setShowBroadcast(true);
              setBroadcastResult(null);
            }}
            style={{ ...makeBtn(C.gold), letterSpacing: "0.12em" }}
          >
            📣 Broadcast
          </button>
          <button
            onClick={() => {
              setShowRegister(true);
              setRegMsg(null);
            }}
            style={{ ...makeBtn(C.blue), letterSpacing: "0.12em" }}
          >
            + Register In-Store
          </button>
          <button
            onClick={fetchAll}
            style={{
              ...makeBtn("transparent", C.muted),
              border: `1px solid ${C.border}`,
            }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleBulkSave}
            disabled={saving}
            style={makeBtn(C.green, C.white, saving)}
          >
            {saving ? "Saving…" : "💾 Save All Scores"}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Customers", value: customers.length, color: C.green },
          { label: "Active (30d)", value: activeCount, color: C.accent },
          {
            label: "Avg Engagement",
            value: `${avgEng}/100`,
            color: avgEng >= 60 ? C.accent : avgEng >= 35 ? C.gold : C.red,
          },
          {
            label: "⚠ Churn Risk",
            value: churnCount,
            color: churnCount > 0 ? C.red : C.accent,
          },
          { label: "Marketing Opt-in", value: `${optInRate}%`, color: C.blue },
          { label: "POPIA Consented", value: popiaCount, color: C.mid },
          {
            label: "Avg Profile",
            value: `${avgProfile}%`,
            color: avgProfile > 60 ? C.mid : C.orange,
          },
          {
            label: "💎 Platinum",
            value: tierCounts.platinum,
            color: C.platinum,
          },
          { label: "🥇 Gold", value: tierCounts.gold, color: C.gold },
          { label: "🥉 Bronze", value: tierCounts.bronze, color: "#a0674b" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${s.color}`,
              borderRadius: 2,
              padding: "14px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 24,
                fontWeight: 300,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {churnCount > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: C.lightRed,
            border: `1px solid ${C.red}`,
            borderRadius: 2,
            marginBottom: 16,
            fontSize: 13,
            color: C.red,
            fontWeight: 600,
          }}
        >
          ⚠ {churnCount} customer{churnCount > 1 ? "s" : ""} at churn risk —
          inactive 45+ days or no scans with low points
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
        <input
          style={{ ...inputStyle, width: 220 }}
          placeholder="Search name, phone, city, province…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div
          style={{
            display: "flex",
            gap: 0,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "at_risk", label: "⚠ At Risk" },
            { key: "opted_in", label: "Opted In" },
            { key: "complete", label: "Complete" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 14px",
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: FONTS.body,
                backgroundColor: filter === f.key ? C.green : C.white,
                color: filter === f.key ? C.white : C.muted,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          style={{ ...inputStyle, cursor: "pointer", width: "auto" }}
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="all">All Tiers</option>
          <option value="platinum">💎 Platinum</option>
          <option value="gold">🥇 Gold</option>
          <option value="silver">🥈 Silver</option>
          <option value="bronze">🥉 Bronze</option>
        </select>
        <select
          style={{ ...inputStyle, cursor: "pointer", width: "auto" }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="engagement">Sort: Engagement</option>
          <option value="points">Sort: Points</option>
          <option value="scans">Sort: Scans</option>
          <option value="recent">Sort: Recent</option>
          <option value="risk">Sort: Churn Risk</option>
          <option value="join_date">Sort: Join Date</option>
          <option value="profile">Sort: Profile %</option>
        </select>
        <div style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
          {displayed.length} customer{displayed.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>
          Loading customers…
        </div>
      ) : displayed.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            border: `1px dashed ${C.border}`,
            borderRadius: 2,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 20,
              color: C.green,
              marginBottom: 8,
            }}
          >
            No customers found
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            Customers appear here once they sign up and scan a QR code.
          </div>
        </div>
      ) : (
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: C.green, color: C.white }}>
                {[
                  "Customer",
                  "Tier",
                  "Engagement",
                  "Points",
                  "Scans",
                  "Profile",
                  "Last Active",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((c, i) => {
                const eng = engScores[c.id] || { total: 0 };
                const risk = isChurnRisk(c);
                const days = daysSince(c.last_active_at);
                const pScore = profileScore(c);
                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: i % 2 === 0 ? C.white : C.cream,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setSelected(c);
                      setDrawerTab("profile");
                      setDeleteConfirm(null);
                      setComposing(false);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f0faf5")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        i % 2 === 0 ? C.white : C.cream)
                    }
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: C.text }}>
                        {c.full_name || (
                          <span style={{ color: C.muted }}>Anonymous</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {c.city || ""}
                        {c.province ? `, ${c.province}` : ""}
                      </div>
                      {c.phone && (
                        <div style={{ fontSize: 11, color: C.muted }}>
                          {c.phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <TierBadge points={c.loyalty_points || 0} />
                    </td>
                    <td style={{ padding: "12px 14px", minWidth: 120 }}>
                      <EngBar score={eng.total} />
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontWeight: 600,
                        color: C.gold,
                      }}
                    >
                      {(c.loyalty_points || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 14px", color: C.muted }}>
                      {c.total_scans || 0}
                    </td>
                    <td style={{ padding: "12px 14px", minWidth: 90 }}>
                      <ScoreBadge score={pScore} />
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: 12,
                        color: days !== null && days > 30 ? C.red : C.muted,
                      }}
                    >
                      {days !== null
                        ? days === 0
                          ? "Today"
                          : `${days}d ago`
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {risk ? (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 2,
                            background: C.lightRed,
                            color: C.red,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          ⚠ At Risk
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 2,
                            background: C.lightGreen,
                            color: C.accent,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          ✓ Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(c);
                          setDrawerTab("profile");
                          setDeleteConfirm(null);
                          setComposing(false);
                        }}
                        style={{
                          ...makeBtn("transparent", C.mid),
                          border: `1px solid ${C.border}`,
                          fontSize: 10,
                          padding: "5px 12px",
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CUSTOMER 360 DRAWER ── */}
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
              top: 0,
              right: 0,
              bottom: 0,
              width: 620,
              maxWidth: "95vw",
              background: C.cream,
              zIndex: 1001,
              overflowY: "auto",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                background: C.green,
                color: C.white,
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 22,
                    fontFamily: FONTS.heading,
                    fontWeight: 700,
                  }}
                >
                  {selected.full_name || "Anonymous Customer"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                    marginTop: 2,
                    fontFamily: FONTS.body,
                  }}
                >
                  {selected.city}
                  {selected.province ? `, ${selected.province}` : ""}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <TierBadge points={selected.loyalty_points || 0} />
                <button
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: C.white,
                    cursor: "pointer",
                    fontSize: 20,
                    borderRadius: 2,
                    padding: "4px 10px",
                  }}
                  onClick={() => setSelected(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {(birthdayAlert || tierUpAlert) && (
              <div
                style={{
                  padding: "12px 24px",
                  background: "#fef9e7",
                  borderBottom: `1px solid ${C.gold}`,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {birthdayAlert && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: C.gold,
                      fontWeight: 600,
                    }}
                  >
                    🎂 Birthday today!
                    <button
                      onClick={prefillBirthday}
                      style={{
                        ...makeBtn(C.gold),
                        fontSize: 9,
                        padding: "3px 10px",
                      }}
                    >
                      Send Birthday Message
                    </button>
                  </div>
                )}
                {tierUpAlert && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: C.platinum,
                      fontWeight: 600,
                    }}
                  >
                    🏆 Tier upgraded to {TIERS[tierUpAlert.new]?.label}!
                    <button
                      onClick={prefillTierUp}
                      style={{
                        ...makeBtn(C.platinum),
                        fontSize: 9,
                        padding: "3px 10px",
                      }}
                    >
                      Send Tier-Up Message
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                borderBottom: `2px solid ${C.border}`,
                background: C.white,
                flexShrink: 0,
                overflowX: "auto",
              }}
            >
              {[
                { id: "profile", label: "👤 Profile" },
                { id: "loyalty", label: "⭐ Loyalty" },
                { id: "scans", label: "📱 Scans" },
                {
                  id: "messages",
                  label: `💬 Messages${msgUnreadCount > 0 ? ` (${msgUnreadCount})` : ""}`,
                },
                { id: "popia", label: "🔒 POPIA" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDrawerTab(t.id)}
                  style={{
                    padding: "12px 18px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontFamily: FONTS.body,
                    cursor: "pointer",
                    border: "none",
                    background: "none",
                    color: drawerTab === t.id ? C.green : C.muted,
                    borderBottom:
                      drawerTab === t.id
                        ? `3px solid ${C.green}`
                        : "3px solid transparent",
                    marginBottom: -2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              {/* PROFILE TAB */}
              {drawerTab === "profile" &&
                (() => {
                  const eng =
                    engScores[selected.id] || calcEngagement(selected);
                  return (
                    <>
                      <div
                        style={{
                          background: C.white,
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          padding: 20,
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: C.muted,
                            marginBottom: 14,
                            fontFamily: FONTS.body,
                          }}
                        >
                          Engagement Score
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            marginBottom: 16,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              padding: "12px 16px",
                              background: C.cream,
                              borderRadius: 2,
                              flex: 1,
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 9,
                                color: C.muted,
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                marginBottom: 4,
                                fontFamily: FONTS.body,
                              }}
                            >
                              Score
                            </div>
                            <div
                              style={{
                                fontFamily: FONTS.heading,
                                fontSize: 28,
                                color:
                                  eng.total >= 70
                                    ? C.accent
                                    : eng.total >= 40
                                      ? C.orange
                                      : C.red,
                              }}
                            >
                              {eng.total}/100
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "12px 16px",
                              background: C.cream,
                              borderRadius: 2,
                              flex: 1,
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 9,
                                color: C.muted,
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                marginBottom: 4,
                                fontFamily: FONTS.body,
                              }}
                            >
                              Profile
                            </div>
                            <div
                              style={{
                                fontFamily: FONTS.heading,
                                fontSize: 28,
                                color: C.blue,
                              }}
                            >
                              {profileScore(selected)}%
                            </div>
                          </div>
                          {isChurnRisk(selected) && (
                            <div
                              style={{
                                padding: "12px 16px",
                                background: C.lightRed,
                                borderRadius: 2,
                                flex: 1,
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 9,
                                  color: C.red,
                                  letterSpacing: "0.15em",
                                  textTransform: "uppercase",
                                  marginBottom: 4,
                                  fontFamily: FONTS.body,
                                }}
                              >
                                Status
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: C.red,
                                }}
                              >
                                ⚠ Churn Risk
                              </div>
                            </div>
                          )}
                        </div>
                        {Object.values(eng.breakdown).map((b) => (
                          <div key={b.label} style={{ marginBottom: 8 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 3,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  color: C.text,
                                  fontFamily: FONTS.body,
                                }}
                              >
                                {b.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: C.accent,
                                  fontFamily: FONTS.body,
                                }}
                              >
                                {b.score}/{b.max}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 4,
                                background: C.border,
                                borderRadius: 2,
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${b.max > 0 ? (b.score / b.max) * 100 : 0}%`,
                                  background: C.accent,
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          background: C.white,
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          padding: 20,
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: C.muted,
                            marginBottom: 12,
                            fontFamily: FONTS.body,
                          }}
                        >
                          Identity
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px 20px",
                          }}
                        >
                          {[
                            { label: "Full Name", val: selected.full_name },
                            { label: "Phone", val: selected.phone },
                            {
                              label: "Date of Birth",
                              val: fmtDate(selected.date_of_birth),
                            },
                            { label: "Gender", val: selected.gender },
                            { label: "Province", val: selected.province },
                            { label: "City", val: selected.city },
                            {
                              label: "Total Scans",
                              val: selected.total_scans || 0,
                            },
                            {
                              label: "Last Active",
                              val: fmtDate(selected.last_active_at),
                            },
                            {
                              label: "Member Since",
                              val: fmtDate(selected.created_at),
                            },
                            {
                              label: "Referral Code",
                              val: selected.referral_code,
                            },
                          ].map(({ label, val }) => (
                            <div key={label}>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: C.muted,
                                  fontFamily: FONTS.body,
                                  marginBottom: 2,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                                }}
                              >
                                {label}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color:
                                    val != null && val !== "—"
                                      ? C.text
                                      : C.muted,
                                  fontFamily: FONTS.body,
                                  fontWeight: 500,
                                }}
                              >
                                {val ?? "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

              {/* LOYALTY TAB */}
              {drawerTab === "loyalty" && (
                <>
                  <div
                    style={{
                      background: C.green,
                      borderRadius: 2,
                      padding: 20,
                      marginBottom: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.7)",
                          fontFamily: FONTS.body,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        Total Points
                      </div>
                      <div
                        style={{
                          fontSize: 48,
                          fontFamily: FONTS.heading,
                          fontWeight: 700,
                          color: C.white,
                          lineHeight: 1,
                        }}
                      >
                        {(selected.loyalty_points || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <TierBadge points={selected.loyalty_points || 0} />
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.6)",
                          fontFamily: FONTS.body,
                          marginTop: 8,
                        }}
                      >
                        {drawerData.txns.length} transactions
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                        marginBottom: 12,
                        fontFamily: FONTS.body,
                      }}
                    >
                      Transaction History
                    </div>
                    {drawerLoading && (
                      <div
                        style={{
                          color: C.muted,
                          fontFamily: FONTS.body,
                          fontSize: 13,
                        }}
                      >
                        Loading…
                      </div>
                    )}
                    {!drawerLoading && drawerData.txns.length === 0 && (
                      <div
                        style={{
                          color: C.muted,
                          fontFamily: FONTS.body,
                          fontSize: 13,
                        }}
                      >
                        No transactions yet
                      </div>
                    )}
                    {drawerData.txns.map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              color: C.text,
                              fontFamily: FONTS.body,
                            }}
                          >
                            {tx.description || tx.transaction_type}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              fontFamily: FONTS.body,
                              marginTop: 2,
                            }}
                          >
                            {fmtDate(tx.transaction_date)}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            fontFamily: FONTS.heading,
                            color: tx.points > 0 ? C.mid : C.red,
                          }}
                        >
                          {tx.points > 0 ? "+" : ""}
                          {tx.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* SCANS TAB */}
              {drawerTab === "scans" && (
                <>
                  <div
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      padding: 20,
                      marginBottom: 16,
                      display: "flex",
                      gap: 24,
                    }}
                  >
                    {[
                      {
                        label: "Total Scans",
                        val: drawerData.scans.length,
                        color: C.green,
                      },
                      {
                        label: "Points Earned",
                        val: drawerData.scans.filter(
                          (s) => s.scan_outcome === "points_awarded",
                        ).length,
                        color: C.gold,
                      },
                      {
                        label: "GPS Scans",
                        val: drawerData.scans.filter(
                          (s) => s.location_source === "gps",
                        ).length,
                        color: C.blue,
                      },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 36,
                            fontFamily: FONTS.heading,
                            fontWeight: 700,
                            color,
                            lineHeight: 1,
                          }}
                        >
                          {val}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            fontFamily: FONTS.body,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginTop: 4,
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                        marginBottom: 12,
                        fontFamily: FONTS.body,
                      }}
                    >
                      Scan Log (scan_logs)
                    </div>
                    {drawerLoading && (
                      <div
                        style={{
                          color: C.muted,
                          fontFamily: FONTS.body,
                          fontSize: 13,
                        }}
                      >
                        Loading…
                      </div>
                    )}
                    {!drawerLoading && drawerData.scans.length === 0 && (
                      <div
                        style={{
                          color: C.muted,
                          fontFamily: FONTS.body,
                          fontSize: 13,
                        }}
                      >
                        No scans in scan_logs yet
                      </div>
                    )}
                    {drawerData.scans.map((sc) => {
                      const oc =
                        sc.scan_outcome === "points_awarded"
                          ? C.mid
                          : sc.scan_outcome === "already_claimed"
                            ? C.muted
                            : C.orange;
                      return (
                        <div
                          key={sc.id}
                          style={{
                            display: "flex",
                            gap: 12,
                            padding: "10px 0",
                            borderBottom: `1px solid ${C.border}`,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 22,
                              lineHeight: 1,
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {sc.qr_type === "product_insert"
                              ? "📦"
                              : sc.qr_type === "promotional"
                                ? "📣"
                                : sc.qr_type === "event"
                                  ? "🎪"
                                  : "📱"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  fontFamily: FONTS.body,
                                  color: C.text,
                                  fontWeight: 600,
                                }}
                              >
                                {sc.qr_type || "unknown"}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: C.muted,
                                  fontFamily: FONTS.body,
                                }}
                              >
                                {timeAgo(sc.scanned_at)}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                marginTop: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              <Pill
                                label={sc.scan_outcome || "—"}
                                color={oc}
                                bg={`${oc}18`}
                              />
                              {sc.points_awarded > 0 && (
                                <Pill
                                  label={`+${sc.points_awarded} pts`}
                                  color={C.gold}
                                  bg="#fef3dc"
                                />
                              )}
                              {sc.ip_city && (
                                <Pill
                                  label={sc.ip_city}
                                  color={C.blue}
                                  bg="#e8f0f8"
                                />
                              )}
                              {sc.device_type && (
                                <Pill
                                  label={sc.device_type}
                                  color={C.muted}
                                  bg="#eee"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* MESSAGES TAB */}
              {drawerTab === "messages" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                      }}
                    >
                      Conversation with {selected.full_name || "Customer"}
                    </div>
                    <button
                      onClick={() => {
                        setComposing((c) => !c);
                        setSendMsgResult(null);
                      }}
                      style={{
                        ...makeBtn(composing ? C.muted : C.green),
                        fontSize: 9,
                        padding: "5px 12px",
                      }}
                    >
                      {composing ? "✕ Cancel" : "+ Compose"}
                    </button>
                  </div>
                  {composing && (
                    <div
                      style={{
                        background: C.white,
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                        padding: 18,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 10,
                              color: C.muted,
                              marginBottom: 4,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              fontWeight: 600,
                            }}
                          >
                            Type
                          </label>
                          <select
                            value={composeForm.message_type}
                            onChange={(e) =>
                              setComposeForm((f) => ({
                                ...f,
                                message_type: e.target.value,
                              }))
                            }
                            style={{ ...inputStyle, width: "100%" }}
                          >
                            <option value="admin_notice">📢 Notice</option>
                            <option value="response">↩️ Response</option>
                            <option value="birthday">🎂 Birthday</option>
                            <option value="tier_up">🏆 Tier Upgrade</option>
                            <option value="event">🎪 Event</option>
                            <option value="general">📩 General</option>
                          </select>
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 10,
                              color: C.muted,
                              marginBottom: 4,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              fontWeight: 600,
                            }}
                          >
                            Bonus Points
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={composeForm.bonus_points}
                            onChange={(e) =>
                              setComposeForm((f) => ({
                                ...f,
                                bonus_points: e.target.value,
                              }))
                            }
                            style={{ ...inputStyle, width: "100%" }}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 10,
                            color: C.muted,
                            marginBottom: 4,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          Subject
                        </label>
                        <input
                          type="text"
                          value={composeForm.subject}
                          onChange={(e) =>
                            setComposeForm((f) => ({
                              ...f,
                              subject: e.target.value,
                            }))
                          }
                          style={{ ...inputStyle, width: "100%" }}
                          placeholder="Optional subject line"
                        />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 10,
                            color: C.muted,
                            marginBottom: 4,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          Message *
                        </label>
                        <textarea
                          rows={4}
                          value={composeForm.body}
                          onChange={(e) =>
                            setComposeForm((f) => ({
                              ...f,
                              body: e.target.value,
                            }))
                          }
                          style={{
                            ...inputStyle,
                            width: "100%",
                            resize: "vertical",
                          }}
                          placeholder="Write your message…"
                        />
                      </div>
                      {sendMsgResult?.error && (
                        <div
                          style={{
                            color: C.red,
                            fontSize: 12,
                            marginBottom: 8,
                          }}
                        >
                          ⚠ {sendMsgResult.error}
                        </div>
                      )}
                      {sendMsgResult?.success && (
                        <div
                          style={{
                            color: C.mid,
                            fontSize: 12,
                            marginBottom: 8,
                            fontWeight: 600,
                          }}
                        >
                          ✅ {sendMsgResult.success}
                        </div>
                      )}
                      <button
                        onClick={handleSendMessage}
                        disabled={sendingMsg}
                        style={makeBtn(C.green, C.white, sendingMsg)}
                      >
                        {sendingMsg ? "Sending…" : "Send Message"}
                      </button>
                      {composeForm.bonus_points > 0 && (
                        <span
                          style={{
                            fontSize: 11,
                            color: C.gold,
                            marginLeft: 10,
                            fontWeight: 600,
                          }}
                        >
                          +{composeForm.bonus_points} pts will be added
                        </span>
                      )}
                    </div>
                  )}
                  {msgsLoading ? (
                    <div
                      style={{
                        color: C.muted,
                        fontSize: 13,
                        textAlign: "center",
                        padding: 24,
                      }}
                    >
                      Loading messages…
                    </div>
                  ) : messages.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: C.muted,
                        fontSize: 13,
                        border: `1px dashed ${C.border}`,
                        borderRadius: 2,
                      }}
                    >
                      No messages yet. Use Compose to send the first message to
                      this customer.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 1 }}>
                      {messages.map((msg) => {
                        const m = getMsgMeta(msg.message_type);
                        const isInbound = msg.direction === "inbound",
                          isUnread = isInbound && !msg.read_at;
                        return (
                          <div
                            key={msg.id}
                            style={{
                              background: isUnread ? "#fff8f0" : C.white,
                              border: `1px solid ${isUnread ? C.orange + "40" : C.border}`,
                              borderLeft: `3px solid ${isInbound ? C.blue : m.color}`,
                              borderRadius: 2,
                              padding: "12px 16px",
                              display: "flex",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 18,
                                flexShrink: 0,
                                marginTop: 1,
                              }}
                            >
                              {isInbound ? "👤" : m.icon}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  marginBottom: 4,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: isUnread ? 700 : 500,
                                    color: isUnread ? C.text : C.muted,
                                  }}
                                >
                                  {msg.subject || m.label}
                                  {isUnread && (
                                    <span
                                      style={{
                                        marginLeft: 6,
                                        fontSize: 9,
                                        background: C.orange,
                                        color: C.white,
                                        padding: "1px 6px",
                                        borderRadius: 10,
                                        fontWeight: 700,
                                      }}
                                    >
                                      NEW
                                    </span>
                                  )}
                                  {isInbound && (
                                    <span
                                      style={{
                                        marginLeft: 6,
                                        fontSize: 9,
                                        background: `${C.blue}18`,
                                        color: C.blue,
                                        padding: "1px 6px",
                                        borderRadius: 10,
                                        fontWeight: 700,
                                      }}
                                    >
                                      FROM CUSTOMER
                                    </span>
                                  )}
                                </span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: C.muted,
                                    flexShrink: 0,
                                  }}
                                >
                                  {timeAgo(msg.created_at)}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: C.text,
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {msg.body}
                              </div>
                              {msg.metadata?.points_awarded > 0 && (
                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 11,
                                    color: C.gold,
                                    fontWeight: 600,
                                  }}
                                >
                                  🎁 +{msg.metadata.points_awarded} pts bonus
                                  awarded
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: C.muted,
                                cursor: "pointer",
                                fontSize: 14,
                                padding: "2px 6px",
                                flexShrink: 0,
                                opacity: 0.5,
                              }}
                              title="Delete message"
                            >
                              🗑
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* POPIA TAB */}
              {drawerTab === "popia" && (
                <>
                  <div
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      padding: 20,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                        marginBottom: 14,
                        fontFamily: FONTS.body,
                      }}
                    >
                      POPIA Compliance Record
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px 20px",
                      }}
                    >
                      {[
                        {
                          label: "POPIA Consented",
                          val: selected.popia_consented
                            ? "✅ Yes"
                            : "❌ Not yet",
                        },
                        {
                          label: "Consent Date",
                          val: fmtDate(selected.popia_date),
                        },
                        {
                          label: "Marketing Opt-In",
                          val: selected.marketing_opt_in ? "✅ Yes" : "No",
                        },
                        {
                          label: "Analytics Opt-In",
                          val: selected.analytics_opt_in ? "✅ Yes" : "No",
                        },
                        {
                          label: "Geolocation Consent",
                          val: selected.geolocation_consent ? "✅ Yes" : "No",
                        },
                      ].map(({ label, val }) => (
                        <div key={label}>
                          <div
                            style={{
                              fontSize: 10,
                              color: C.muted,
                              fontFamily: FONTS.body,
                              marginBottom: 2,
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: C.text,
                              fontFamily: FONTS.body,
                              fontWeight: 500,
                            }}
                          >
                            {val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      background: C.lightRed,
                      border: `1px solid ${C.red}`,
                      borderRadius: 2,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.red,
                        marginBottom: 10,
                        fontFamily: FONTS.body,
                      }}
                    >
                      Data Deletion — POPIA Right to Erasure
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: C.text,
                        fontFamily: FONTS.body,
                        marginBottom: 16,
                        lineHeight: 1.6,
                      }}
                    >
                      Sends an admin WhatsApp alert. Action required within 30
                      days under POPIA.
                    </div>
                    {deleteConfirm?.done ? (
                      <div
                        style={{
                          color: C.mid,
                          fontFamily: FONTS.body,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        ✅ Request sent to admin. Ref:{" "}
                        {selected.id?.slice(0, 8)}
                      </div>
                    ) : deleteConfirm?.error ? (
                      <div
                        style={{
                          color: C.red,
                          fontFamily: FONTS.body,
                          fontSize: 13,
                        }}
                      >
                        Failed to send. Contact admin manually.
                      </div>
                    ) : deleteConfirm?.confirm ? (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          style={{ ...makeBtn(C.red), fontSize: 10 }}
                          onClick={() => handleDeleteRequest(selected)}
                        >
                          Confirm — Send Request
                        </button>
                        <button
                          style={{ ...makeBtn("#eee", C.muted), fontSize: 10 }}
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        style={{ ...makeBtn(C.red), fontSize: 10 }}
                        onClick={() => setDeleteConfirm({ confirm: true })}
                      >
                        🗑 Request Data Deletion
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* BROADCAST MODAL */}
      {showBroadcast && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: 4,
              padding: 32,
              width: 480,
              maxWidth: "95vw",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              fontFamily: FONTS.body,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 22,
                fontWeight: 700,
                color: C.green,
                marginBottom: 6,
              }}
            >
              📣 Broadcast Message
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.muted,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Sends to{" "}
              <strong>
                {displayed.filter((c) => c.marketing_opt_in).length}
              </strong>{" "}
              opted-in customers matching your current filter (
              {displayed.length} visible).
            </div>
            {[
              {
                field: "type",
                label: "Type",
                el: (
                  <select
                    value={broadcastForm.message_type}
                    onChange={(e) =>
                      setBroadcastForm((f) => ({
                        ...f,
                        message_type: e.target.value,
                      }))
                    }
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    <option value="broadcast">📣 Broadcast</option>
                    <option value="event">🎪 Event</option>
                    <option value="admin_notice">📢 Notice</option>
                  </select>
                ),
              },
              {
                field: "subject",
                label: "Subject",
                el: (
                  <input
                    type="text"
                    value={broadcastForm.subject}
                    onChange={(e) =>
                      setBroadcastForm((f) => ({
                        ...f,
                        subject: e.target.value,
                      }))
                    }
                    style={{ ...inputStyle, width: "100%" }}
                    placeholder="Optional subject"
                  />
                ),
              },
            ].map(({ field, label, el }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: C.muted,
                    marginBottom: 5,
                  }}
                >
                  {label}
                </label>
                {el}
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.muted,
                  marginBottom: 5,
                }}
              >
                Message *
              </label>
              <textarea
                rows={4}
                value={broadcastForm.body}
                onChange={(e) =>
                  setBroadcastForm((f) => ({ ...f, body: e.target.value }))
                }
                style={{ ...inputStyle, width: "100%", resize: "vertical" }}
                placeholder="Write your broadcast message…"
              />
            </div>
            {broadcastResult?.error && (
              <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>
                ⚠ {broadcastResult.error}
              </div>
            )}
            {broadcastResult?.success && (
              <div
                style={{
                  color: C.mid,
                  fontSize: 13,
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                ✅ {broadcastResult.success}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleBroadcast}
                disabled={broadcasting}
                style={{ ...makeBtn(C.gold, C.white, broadcasting), flex: 1 }}
              >
                {broadcasting ? "Sending…" : "📣 Send Broadcast"}
              </button>
              <button
                onClick={() => {
                  setShowBroadcast(false);
                  setBroadcastResult(null);
                }}
                style={makeBtn("#eee", C.muted)}
              >
                Cancel
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 12 }}>
              Only customers with marketing_opt_in = true will receive this
              message.
            </div>
          </div>
        </div>
      )}

      {/* REGISTER IN-STORE MODAL */}
      {showRegister && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: 4,
              padding: 32,
              width: 440,
              maxWidth: "95vw",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              fontFamily: FONTS.body,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 22,
                fontWeight: 700,
                color: C.green,
                marginBottom: 6,
              }}
            >
              Register Customer In-Store
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.muted,
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              Creates an account on the customer's behalf. They'll receive a
              password-set email. Admin will be notified via WhatsApp.
            </div>
            {[
              {
                field: "email",
                label: "Email Address *",
                type: "email",
                placeholder: "customer@email.com",
              },
              {
                field: "full_name",
                label: "Full Name",
                type: "text",
                placeholder: "",
              },
              {
                field: "phone",
                label: "Phone Number",
                type: "text",
                placeholder: "+27 XXX XXX XXXX",
              },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: C.muted,
                    marginBottom: 5,
                  }}
                >
                  {label}
                </label>
                <input
                  style={{ ...inputStyle, width: "100%" }}
                  type={type}
                  placeholder={placeholder}
                  value={regForm[field]}
                  onChange={(e) =>
                    setRegForm((f) => ({ ...f, [field]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.muted,
                  marginBottom: 5,
                }}
              >
                Province
              </label>
              <select
                style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
                value={regForm.province}
                onChange={(e) =>
                  setRegForm((f) => ({ ...f, province: e.target.value }))
                }
              >
                <option value="">Select province…</option>
                {[
                  "Gauteng",
                  "Western Cape",
                  "KwaZulu-Natal",
                  "Eastern Cape",
                  "Limpopo",
                  "Mpumalanga",
                  "North West",
                  "Free State",
                  "Northern Cape",
                ].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {regMsg?.error && (
              <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>
                ⚠ {regMsg.error}
              </div>
            )}
            {regMsg?.success && (
              <div
                style={{
                  color: C.mid,
                  fontSize: 13,
                  marginBottom: 12,
                  fontWeight: 600,
                }}
              >
                ✅ {regMsg.success}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                style={{ ...makeBtn(C.green, C.white, regLoading), flex: 1 }}
                onClick={handleRegister}
                disabled={regLoading}
              >
                {regLoading ? "Registering…" : "Register Customer"}
              </button>
              <button
                style={makeBtn("#eee", C.muted)}
                onClick={() => {
                  setShowRegister(false);
                  setRegMsg(null);
                }}
              >
                Cancel
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.muted,
                marginTop: 14,
                lineHeight: 1.5,
              }}
            >
              📋 POPIA: Obtain verbal consent before registration. Acquisition
              channel recorded as "in_store".
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
