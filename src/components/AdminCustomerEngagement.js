// src/components/AdminCustomerEngagement.js v2.4
// WP-VIZ: Tier Donut + Engagement Buckets HBar + Active vs At-Risk by Tier grouped bar
// WP-VISUAL: T tokens, Inter font, flush stat grid, underline tabs, no Cormorant/Jost
// WP-GUIDE-C++: usePageContext 'customers' wired + WorkflowGuide added
// v2.2 — WorkflowGuide · v2.1 — Inbox/Messaging · v2.0 — calcEngagement, churn risk, 360 drawer

import React, { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.ink050,
  border: T.ink150,
  muted: T.ink400,
  text: T.ink700,
  white: "#fff",
  red: T.danger,
  lightRed: T.dangerBg,
  orange: T.warning,
  lightOrange: T.warningBg,
  blue: T.info,
  lightBlue: T.infoBg,
  platinum: "#7b68ee",
  lightPlatinum: "#f0eeff",
  lightGreen: T.accentLit,
};
const FONTS = { heading: T.font, body: T.font };
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
function getTier(pts) {
  return pts >= 1000
    ? "platinum"
    : pts >= 500
      ? "gold"
      : pts >= 200
        ? "silver"
        : "bronze";
}
function getTierCfg(pts) {
  return TIERS[getTier(pts)];
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
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
  return (
    (days !== null && days > 45) ||
    ((profile.loyalty_points || 0) < 50 && (profile.total_scans || 0) === 0)
  );
}

const inputStyle = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  backgroundColor: "#fff",
  color: T.ink700,
  outline: "none",
  boxSizing: "border-box",
};
const makeBtn = (bg = T.accentMid, color = "#fff", disabled = false) => ({
  padding: "9px 18px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border:
    bg === "transparent" || bg === "#eee" ? `1px solid ${T.ink150}` : "none",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: T.font,
  opacity: disabled ? 0.6 : 1,
  transition: "opacity 0.15s",
});

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
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        backgroundColor: t.bg,
        color: t.color,
        border: `1px solid ${t.color}40`,
        fontFamily: T.font,
      }}
    >
      {t.icon} {t.label}
    </span>
  );
}
function EngBar({ score }) {
  const color = score >= 70 ? T.success : score >= 40 ? "#b5935a" : T.danger;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{ flex: 1, height: 5, background: T.ink150, borderRadius: 3 }}
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
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color,
          minWidth: 28,
          fontFamily: T.font,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score}
      </span>
    </div>
  );
}
function ScoreBadge({ score }) {
  const color = score >= 80 ? T.accentMid : score >= 40 ? T.warning : T.danger;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 50,
          height: 5,
          background: T.ink150,
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
        style={{ fontSize: 11, color, fontWeight: 600, fontFamily: T.font }}
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
        color: color || T.ink400,
        borderRadius: 10,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 600,
        fontFamily: T.font,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {label}
    </span>
  );
}
const MSG_META = {
  query: { label: "Query", icon: "💬", color: T.info },
  fault: { label: "Fault", icon: "⚠", color: T.danger },
  admin_notice: { label: "Notice", icon: "📢", color: T.accentMid },
  birthday: { label: "Birthday", icon: "🎂", color: "#b5935a" },
  tier_up: { label: "Tier Upgrade", icon: "🏆", color: "#7b68ee" },
  event: { label: "Event", icon: "🎪", color: "#9b6b9e" },
  response: { label: "Response", icon: "↩️", color: T.accentMid },
  broadcast: { label: "Broadcast", icon: "📣", color: T.accentMid },
  general: { label: "Message", icon: "📩", color: T.ink400 },
};
function getMsgMeta(type) {
  return MSG_META[type] || MSG_META.general;
}

const secHdr = (text) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: T.ink400,
      marginBottom: 12,
      fontFamily: T.font,
    }}
  >
    {text}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCustomerEngagement({
  tenantId: tenantIdProp,
  initialSearch,
} = {}) {
  const { tenantId: ctxTenantId } = useTenant();
  const tenantId = tenantIdProp || ctxTenantId;
  const ctx = usePageContext("customers", null);

  const [customers, setCustomers] = useState([]);
  const [engScores, setEngScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [search, setSearch] = useState(initialSearch || "");
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

  // GAP-02: write a system_alert (non-blocking, fire-and-forget)
  const writeAlert = useCallback(async (alertType, severity, title, body) => {
    try {
      await supabase.from("system_alerts").insert({
        tenant_id: tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3",
        alert_type: alertType,
        severity,
        status: "open",
        title,
        body: body || null,
        source_table: "user_profiles",
      });
    } catch (_) {}
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("*")
          .eq("role", "customer")
          .eq("tenant_id", tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3")
          .order("created_at", { ascending: false }),
      ]);
      const custs = custRes.data || [];
      setCustomers(custs);
      const scores = {};
      custs.forEach((c) => {
        scores[c.id] = calcEngagement(c);
      });
      setEngScores(scores);

      // GAP-02: alert on churn risk
      const atRisk = custs.filter((c) => isChurnRisk(c));
      if (atRisk.length > 0) {
        writeAlert(
          "churn_risk",
          "warning",
          `${atRisk.length} customer${atRisk.length > 1 ? "s" : ""} at churn risk`,
          atRisk
            .slice(0, 5)
            .map(
              (c) =>
                `${c.full_name || "Anonymous"} (inactive ${Math.floor((Date.now() - new Date(c.last_active_at || 0)) / 86400000)}d)`,
            )
            .join(" · ") +
            (atRisk.length > 5 ? ` +${atRisk.length - 5} more` : ""),
        );
      }
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
    } else setBirthdayAlert(false);
    const ct = getTier(selected.loyalty_points || 0),
      st = selected.loyalty_tier || "bronze";
    if (ct !== st && ct !== "bronze") setTierUpAlert({ old: st, new: ct });
    else setTierUpAlert(null);
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
    showToast(`${saved} customer profiles updated`);
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
    if (userId)
      await supabase.from("user_profiles").upsert({
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
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "admin_alert",
          message: `🏪 IN-STORE REGISTRATION\nName: ${regForm.full_name || "Not provided"}\nEmail: ${regForm.email}\nPhone: ${regForm.phone || "—"}\nProvince: ${regForm.province || "—"}\nRegistered at ${new Date().toLocaleString("en-ZA")}`,
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
    const { error } = await supabase.from("customer_messages").insert({
      user_id: selected.id,
      direction: "outbound",
      message_type: composeForm.message_type,
      subject: composeForm.subject.trim() || null,
      body: composeForm.body.trim(),
      sent_by: adminUser?.id || null,
      sent_by_name: adminUser?.email ? adminUser.email.split("@")[0] : "Admin",
      metadata,
    });
    if (!error && composeForm.bonus_points > 0) {
      const pts = Number(composeForm.bonus_points);
      await supabase
        .from("user_profiles")
        .update({ loyalty_points: (selected.loyalty_points || 0) + pts })
        .eq("id", selected.id);
      await supabase.from("loyalty_transactions").insert({
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
      subject: "Happy Birthday from Protea Botanicals!",
      body: `Hi ${selected.full_name || "there"},\n\nWishing you a wonderful birthday from all of us at Protea Botanicals!\n\nAs a thank you, we've added a special birthday bonus to your account. Enjoy your day!`,
      bonus_points: 50,
    });
  };
  const prefillTierUp = () => {
    setComposing(true);
    setComposeForm({
      message_type: "tier_up",
      subject: `You've reached ${tierUpAlert?.new ? TIERS[tierUpAlert.new]?.label : "a new tier"}!`,
      body: `Hi ${selected.full_name || "there"},\n\nCongratulations! You've been upgraded to ${TIERS[tierUpAlert?.new]?.label || "a new tier"} status at Protea Botanicals.\n\nKeep scanning and earning to unlock even more exclusive rewards. Thank you for your loyalty!`,
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
      const { error } = await supabase.from("customer_messages").insert({
        user_id: c.id,
        direction: "outbound",
        message_type: broadcastForm.message_type,
        subject: broadcastForm.subject.trim() || null,
        body: broadcastForm.body.trim(),
        sent_by: adminUser?.id || null,
        sent_by_name: "Medi Recreational",
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

  // ── Stats ──────────────────────────────────────────────────────────────────
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

  // ── Filter + sort ──────────────────────────────────────────────────────────
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

  const FILTER_TABS = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "at_risk", label: "At Risk" },
    { key: "opted_in", label: "Opted In" },
    { key: "complete", label: "Complete" },
  ];

  return (
    <div style={{ fontFamily: T.font, position: "relative" }}>
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
            background: T.accent,
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
            fontFamily: T.font,
            boxShadow: T.shadowMd,
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
              fontFamily: T.font,
              fontSize: 22,
              fontWeight: 600,
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            Customer Engagement
          </h2>
          <div style={{ fontSize: 13, color: T.ink400 }}>
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
            style={makeBtn("#b5935a")}
          >
            Broadcast
          </button>
          <button
            onClick={() => {
              setShowRegister(true);
              setRegMsg(null);
            }}
            style={makeBtn(T.info)}
          >
            + Register In-Store
          </button>
          <button
            onClick={fetchAll}
            style={{
              ...makeBtn("transparent", T.ink400),
              border: `1px solid ${T.ink150}`,
            }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleBulkSave}
            disabled={saving}
            style={makeBtn(T.accent, "#fff", saving)}
          >
            {saving ? "Saving…" : "Save All Scores"}
          </button>
        </div>
      </div>

      {/* ── FLUSH STAT GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(105px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Customers", value: customers.length, color: T.accent },
          { label: "Active (30d)", value: activeCount, color: T.accentMid },
          {
            label: "Avg Engagement",
            value: `${avgEng}/100`,
            color:
              avgEng >= 60 ? T.success : avgEng >= 35 ? "#b5935a" : T.danger,
          },
          {
            label: "Churn Risk",
            value: churnCount,
            color: churnCount > 0 ? T.danger : T.success,
          },
          { label: "Mktg Opt-in", value: `${optInRate}%`, color: T.info },
          { label: "POPIA Consent", value: popiaCount, color: T.accentMid },
          {
            label: "Avg Profile",
            value: `${avgProfile}%`,
            color: avgProfile > 60 ? T.accentMid : T.warning,
          },
          { label: "Platinum", value: tierCounts.platinum, color: "#7b68ee" },
          { label: "Gold", value: tierCounts.gold, color: "#b5935a" },
          { label: "Bronze", value: tierCounts.bronze, color: "#a0674b" },
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
                fontSize: 20,
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

      {/* ── WP-VIZ CHARTS ── */}
      {!loading &&
        customers.length > 0 &&
        (() => {
          // Chart 1: Tier donut
          const tierDonut = [
            { name: "Platinum", value: tierCounts.platinum, color: "#7b68ee" },
            { name: "Gold", value: tierCounts.gold, color: "#b5935a" },
            { name: "Silver", value: tierCounts.silver || 0, color: "#8e9ba8" },
            { name: "Bronze", value: tierCounts.bronze, color: "#a0674b" },
          ].filter((d) => d.value > 0);

          // Chart 2: Engagement score buckets (horizontal bar)
          const buckets = [
            { label: "81–100", min: 81, max: 100, color: T.success },
            { label: "61–80", min: 61, max: 80, color: T.accentMid },
            { label: "41–60", min: 41, max: 60, color: "#b5935a" },
            { label: "21–40", min: 21, max: 40, color: T.warning },
            { label: "0–20", min: 0, max: 20, color: T.danger },
          ].map((b) => ({
            ...b,
            count: customers.filter((c) => {
              const s = engScores[c.id]?.total || 0;
              return s >= b.min && s <= b.max;
            }).length,
          }));
          const bucketMax = Math.max(...buckets.map((b) => b.count), 1);

          // Chart 3: Active vs at-risk by tier (grouped bar)
          const tierRiskData = ["platinum", "gold", "silver", "bronze"]
            .map((tier) => {
              const group = customers.filter(
                (c) => getTier(c.loyalty_points || 0) === tier,
              );
              return {
                name: tier.charAt(0).toUpperCase() + tier.slice(1),
                active: group.filter((c) => !isChurnRisk(c)).length,
                at_risk: group.filter((c) => isChurnRisk(c)).length,
              };
            })
            .filter((d) => d.active + d.at_risk > 0);

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Donut — tier mix */}
              <ChartCard title="Loyalty Tier Mix" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierDonut}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {tierDonut.map((d, i) => (
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

              {/* Horizontal bar — engagement score buckets */}
              <ChartCard title="Engagement Score Distribution" height={200}>
                <div
                  style={{
                    padding: "12px 8px 8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    height: "100%",
                    justifyContent: "center",
                  }}
                >
                  {buckets.map((b) => (
                    <div
                      key={b.label}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: b.color,
                          fontFamily: T.font,
                          width: 36,
                          flexShrink: 0,
                        }}
                      >
                        {b.label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 16,
                          background: T.ink075,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(b.count / bucketMax) * 100}%`,
                            background: b.color,
                            borderRadius: 3,
                            transition: "width 0.5s",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 4,
                          }}
                        >
                          {b.count / bucketMax > 0.2 && (
                            <span
                              style={{
                                fontSize: 9,
                                color: "#fff",
                                fontWeight: 700,
                                fontFamily: T.font,
                              }}
                            >
                              {b.count}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink400,
                          fontFamily: T.font,
                          minWidth: 20,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {b.count / bucketMax <= 0.2 ? b.count : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {/* Grouped bar — active vs at-risk by tier */}
              <ChartCard title="Active vs At-Risk by Tier" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tierRiskData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.ink150}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={4}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={24}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="active"
                      name="Active"
                      fill={T.accentMid}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                      maxBarSize={20}
                    />
                    <Bar
                      dataKey="at_risk"
                      name="At Risk"
                      fill={T.danger}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                      maxBarSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          );
        })()}

      {churnCount > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
            color: T.danger,
            fontWeight: 600,
            fontFamily: T.font,
          }}
        >
          {churnCount} customer{churnCount > 1 ? "s" : ""} at churn risk —
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
            borderBottom: `2px solid ${T.ink150}`,
            gap: 0,
          }}
        >
          {FILTER_TABS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                borderBottom:
                  filter === f.key
                    ? `2px solid ${T.accent}`
                    : "2px solid transparent",
                fontFamily: T.font,
                fontSize: 11,
                fontWeight: filter === f.key ? 700 : 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: filter === f.key ? T.accent : T.ink400,
                cursor: "pointer",
                marginBottom: -2,
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
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
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
        <div
          style={{
            fontSize: 12,
            color: T.ink400,
            marginLeft: "auto",
            fontFamily: T.font,
          }}
        >
          {displayed.length} customer{displayed.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: T.ink400,
            fontFamily: T.font,
          }}
        >
          Loading customers…
        </div>
      ) : displayed.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            border: `1px dashed ${T.ink150}`,
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: T.ink700,
              marginBottom: 8,
              fontFamily: T.font,
            }}
          >
            No customers found
          </div>
          <div style={{ fontSize: 13, color: T.ink400, fontFamily: T.font }}>
            Customers appear here once they sign up and scan a QR code.
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${T.ink150}`,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: T.shadow,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr style={{ background: T.accent, color: "#fff" }}>
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
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      fontFamily: T.font,
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
                      borderBottom: `1px solid ${T.ink075}`,
                      background: i % 2 === 0 ? "#fff" : T.ink050,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setSelected(c);
                      setDrawerTab("profile");
                      setDeleteConfirm(null);
                      setComposing(false);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = T.accentLit)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        i % 2 === 0 ? "#fff" : T.ink050)
                    }
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: T.ink900 }}>
                        {c.full_name || (
                          <span style={{ color: T.ink400 }}>Anonymous</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: T.ink400 }}>
                        {c.city || ""}
                        {c.province ? `, ${c.province}` : ""}
                      </div>
                      {c.phone && (
                        <div style={{ fontSize: 11, color: T.ink400 }}>
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
                        color: "#b5935a",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {(c.loyalty_points || 0).toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        color: T.ink400,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {c.total_scans || 0}
                    </td>
                    <td style={{ padding: "12px 14px", minWidth: 90 }}>
                      <ScoreBadge score={pScore} />
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: 12,
                        color: days !== null && days > 30 ? T.danger : T.ink400,
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
                            borderRadius: 4,
                            background: T.dangerBg,
                            color: T.danger,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                          }}
                        >
                          At Risk
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: T.successBg,
                            color: T.success,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                          }}
                        >
                          Active
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
                          ...makeBtn("transparent", T.accentMid),
                          border: `1px solid ${T.accentBd}`,
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
              background: T.ink050,
              zIndex: 1001,
              overflowY: "auto",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              fontFamily: T.font,
            }}
          >
            {/* Drawer header */}
            <div
              style={{
                background: T.accent,
                color: "#fff",
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{ fontSize: 18, fontWeight: 600, fontFamily: T.font }}
                >
                  {selected.full_name || "Anonymous Customer"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                  {selected.city}
                  {selected.province ? `, ${selected.province}` : ""}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <TierBadge points={selected.loyalty_points || 0} />
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 18,
                    borderRadius: 4,
                    padding: "4px 10px",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Birthday / tier alerts */}
            {(birthdayAlert || tierUpAlert) && (
              <div
                style={{
                  padding: "12px 24px",
                  background: T.warningBg,
                  borderBottom: `1px solid ${T.warningBd}`,
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
                      color: "#b5935a",
                      fontWeight: 600,
                      fontFamily: T.font,
                    }}
                  >
                    Birthday today!{" "}
                    <button
                      onClick={prefillBirthday}
                      style={{
                        ...makeBtn("#b5935a"),
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
                      color: "#7b68ee",
                      fontWeight: 600,
                      fontFamily: T.font,
                    }}
                  >
                    Tier upgraded to {TIERS[tierUpAlert.new]?.label}!{" "}
                    <button
                      onClick={prefillTierUp}
                      style={{
                        ...makeBtn("#7b68ee"),
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

            {/* Drawer tabs — underline */}
            <div
              style={{
                display: "flex",
                borderBottom: `2px solid ${T.ink150}`,
                background: "#fff",
                flexShrink: 0,
                overflowX: "auto",
              }}
            >
              {[
                { id: "profile", label: "Profile" },
                { id: "loyalty", label: "Loyalty" },
                { id: "scans", label: "Scans" },
                {
                  id: "messages",
                  label: `Messages${msgUnreadCount > 0 ? ` (${msgUnreadCount})` : ""}`,
                },
                { id: "popia", label: "POPIA" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDrawerTab(t.id)}
                  style={{
                    padding: "12px 18px",
                    fontSize: 11,
                    fontWeight: drawerTab === t.id ? 700 : 400,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    fontFamily: T.font,
                    cursor: "pointer",
                    border: "none",
                    background: "none",
                    color: drawerTab === t.id ? T.accent : T.ink400,
                    borderBottom:
                      drawerTab === t.id
                        ? `2px solid ${T.accent}`
                        : "2px solid transparent",
                    marginBottom: -2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              {/* PROFILE */}
              {drawerTab === "profile" &&
                (() => {
                  const eng =
                    engScores[selected.id] || calcEngagement(selected);
                  return (
                    <>
                      <div
                        style={{
                          background: "#fff",
                          border: `1px solid ${T.ink150}`,
                          borderRadius: 8,
                          padding: 20,
                          marginBottom: 16,
                          boxShadow: T.shadow,
                        }}
                      >
                        {secHdr("Engagement Score")}
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            marginBottom: 16,
                            flexWrap: "wrap",
                          }}
                        >
                          {[
                            {
                              label: "Score",
                              value: `${eng.total}/100`,
                              color:
                                eng.total >= 70
                                  ? T.success
                                  : eng.total >= 40
                                    ? "#b5935a"
                                    : T.danger,
                              bg: T.ink075,
                            },
                            {
                              label: "Profile",
                              value: `${profileScore(selected)}%`,
                              color: T.info,
                              bg: T.ink075,
                            },
                            ...(isChurnRisk(selected)
                              ? [
                                  {
                                    label: "Status",
                                    value: "Churn Risk",
                                    color: T.danger,
                                    bg: T.dangerBg,
                                  },
                                ]
                              : []),
                          ].map((s) => (
                            <div
                              key={s.label}
                              style={{
                                padding: "12px 16px",
                                background: s.bg,
                                borderRadius: 6,
                                flex: 1,
                                textAlign: "center",
                                minWidth: 80,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 9,
                                  color: s.color,
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                  marginBottom: 4,
                                  fontFamily: T.font,
                                }}
                              >
                                {s.label}
                              </div>
                              <div
                                style={{
                                  fontSize: 22,
                                  fontWeight: 400,
                                  color: s.color,
                                  letterSpacing: "-0.02em",
                                  fontFamily: T.font,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {s.value}
                              </div>
                            </div>
                          ))}
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
                                  color: T.ink700,
                                  fontFamily: T.font,
                                }}
                              >
                                {b.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: T.accentMid,
                                  fontFamily: T.font,
                                }}
                              >
                                {b.score}/{b.max}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 4,
                                background: T.ink150,
                                borderRadius: 2,
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${b.max > 0 ? (b.score / b.max) * 100 : 0}%`,
                                  background: T.accentMid,
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          background: "#fff",
                          border: `1px solid ${T.ink150}`,
                          borderRadius: 8,
                          padding: 20,
                          boxShadow: T.shadow,
                        }}
                      >
                        {secHdr("Identity")}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px 20px",
                          }}
                        >
                          {[
                            ["Full Name", selected.full_name],
                            ["Phone", selected.phone],
                            ["Date of Birth", fmtDate(selected.date_of_birth)],
                            ["Gender", selected.gender],
                            ["Province", selected.province],
                            ["City", selected.city],
                            ["Total Scans", selected.total_scans || 0],
                            ["Last Active", fmtDate(selected.last_active_at)],
                            ["Member Since", fmtDate(selected.created_at)],
                            ["Referral Code", selected.referral_code],
                          ].map(([lbl, val]) => (
                            <div key={lbl}>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.ink400,
                                  fontFamily: T.font,
                                  marginBottom: 2,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                }}
                              >
                                {lbl}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color:
                                    val != null && val !== "—"
                                      ? T.ink700
                                      : T.ink400,
                                  fontFamily: T.font,
                                  fontWeight: 500,
                                }}
                              >
                                {val != null ? val : "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

              {/* LOYALTY */}
              {drawerTab === "loyalty" && (
                <>
                  <div
                    style={{
                      background: T.accent,
                      borderRadius: 8,
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
                          fontSize: 10,
                          color: "rgba(255,255,255,0.7)",
                          fontFamily: T.font,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        Total Points
                      </div>
                      <div
                        style={{
                          fontSize: 44,
                          fontWeight: 400,
                          color: "#fff",
                          lineHeight: 1,
                          fontFamily: T.font,
                          letterSpacing: "-0.03em",
                          fontVariantNumeric: "tabular-nums",
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
                          fontFamily: T.font,
                          marginTop: 8,
                        }}
                      >
                        {drawerData.txns.length} transactions
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid ${T.ink150}`,
                      borderRadius: 8,
                      padding: 20,
                      boxShadow: T.shadow,
                    }}
                  >
                    {secHdr("Transaction History")}
                    {drawerLoading && (
                      <div
                        style={{
                          color: T.ink400,
                          fontFamily: T.font,
                          fontSize: 13,
                        }}
                      >
                        Loading…
                      </div>
                    )}
                    {!drawerLoading && drawerData.txns.length === 0 && (
                      <div
                        style={{
                          color: T.ink400,
                          fontFamily: T.font,
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
                          borderBottom: `1px solid ${T.ink075}`,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              color: T.ink700,
                              fontFamily: T.font,
                            }}
                          >
                            {tx.description || tx.transaction_type}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: T.ink400,
                              fontFamily: T.font,
                              marginTop: 2,
                            }}
                          >
                            {fmtDate(tx.transaction_date)}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            fontFamily: T.font,
                            color: tx.points > 0 ? T.accentMid : T.danger,
                            fontVariantNumeric: "tabular-nums",
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

              {/* SCANS */}
              {drawerTab === "scans" && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: "1px",
                      background: T.ink150,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: `1px solid ${T.ink150}`,
                      marginBottom: 16,
                    }}
                  >
                    {[
                      {
                        label: "Total Scans",
                        val: drawerData.scans.length,
                        color: T.accent,
                      },
                      {
                        label: "Points Earned",
                        val: drawerData.scans.filter(
                          (s) => s.scan_outcome === "points_awarded",
                        ).length,
                        color: "#b5935a",
                      },
                      {
                        label: "GPS Scans",
                        val: drawerData.scans.filter(
                          (s) => s.location_source === "gps",
                        ).length,
                        color: T.info,
                      },
                    ].map(({ label, val, color }) => (
                      <div
                        key={label}
                        style={{
                          background: "#fff",
                          padding: "14px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 400,
                            color,
                            letterSpacing: "-0.02em",
                            fontFamily: T.font,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {val}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: T.ink400,
                            fontFamily: T.font,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
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
                      background: "#fff",
                      border: `1px solid ${T.ink150}`,
                      borderRadius: 8,
                      padding: 20,
                      boxShadow: T.shadow,
                    }}
                  >
                    {secHdr("Scan Log")}
                    {drawerLoading && (
                      <div
                        style={{
                          color: T.ink400,
                          fontFamily: T.font,
                          fontSize: 13,
                        }}
                      >
                        Loading…
                      </div>
                    )}
                    {!drawerLoading && drawerData.scans.length === 0 && (
                      <div
                        style={{
                          color: T.ink400,
                          fontFamily: T.font,
                          fontSize: 13,
                        }}
                      >
                        No scans in scan_logs yet
                      </div>
                    )}
                    {drawerData.scans.map((sc) => {
                      const oc =
                        sc.scan_outcome === "points_awarded"
                          ? T.accentMid
                          : sc.scan_outcome === "already_claimed"
                            ? T.ink400
                            : T.warning;
                      return (
                        <div
                          key={sc.id}
                          style={{
                            display: "flex",
                            gap: 12,
                            padding: "10px 0",
                            borderBottom: `1px solid ${T.ink075}`,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 18,
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
                                  fontFamily: T.font,
                                  color: T.ink700,
                                  fontWeight: 600,
                                }}
                              >
                                {sc.qr_type || "unknown"}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: T.ink400,
                                  fontFamily: T.font,
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
                                  color="#b5935a"
                                  bg="#fef3dc"
                                />
                              )}
                              {sc.ip_city && (
                                <Pill
                                  label={sc.ip_city}
                                  color={T.info}
                                  bg={T.infoBg}
                                />
                              )}
                              {sc.device_type && (
                                <Pill
                                  label={sc.device_type}
                                  color={T.ink400}
                                  bg={T.ink075}
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

              {/* MESSAGES */}
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
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.ink400,
                        fontFamily: T.font,
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
                        ...makeBtn(composing ? T.ink300 : T.accent),
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
                        background: "#fff",
                        border: `1px solid ${T.ink150}`,
                        borderRadius: 8,
                        padding: 18,
                        marginBottom: 16,
                        boxShadow: T.shadow,
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
                              color: T.ink400,
                              marginBottom: 4,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              fontFamily: T.font,
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
                            <option value="admin_notice">Notice</option>
                            <option value="response">Response</option>
                            <option value="birthday">Birthday</option>
                            <option value="tier_up">Tier Upgrade</option>
                            <option value="event">Event</option>
                            <option value="general">General</option>
                          </select>
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 10,
                              color: T.ink400,
                              marginBottom: 4,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              fontFamily: T.font,
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
                            color: T.ink400,
                            marginBottom: 4,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            fontFamily: T.font,
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
                            color: T.ink400,
                            marginBottom: 4,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            fontFamily: T.font,
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
                            color: T.danger,
                            fontSize: 12,
                            marginBottom: 8,
                            fontFamily: T.font,
                          }}
                        >
                          {sendMsgResult.error}
                        </div>
                      )}
                      {sendMsgResult?.success && (
                        <div
                          style={{
                            color: T.accentMid,
                            fontSize: 12,
                            marginBottom: 8,
                            fontWeight: 600,
                            fontFamily: T.font,
                          }}
                        >
                          {sendMsgResult.success}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMsg}
                          style={makeBtn(T.accent, "#fff", sendingMsg)}
                        >
                          {sendingMsg ? "Sending…" : "Send Message"}
                        </button>
                        {composeForm.bonus_points > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#b5935a",
                              fontWeight: 600,
                              fontFamily: T.font,
                            }}
                          >
                            +{composeForm.bonus_points} pts will be added
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {msgsLoading ? (
                    <div
                      style={{
                        color: T.ink400,
                        fontSize: 13,
                        textAlign: "center",
                        padding: 24,
                        fontFamily: T.font,
                      }}
                    >
                      Loading messages…
                    </div>
                  ) : messages.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: T.ink400,
                        fontSize: 13,
                        border: `1px dashed ${T.ink150}`,
                        borderRadius: 8,
                        fontFamily: T.font,
                      }}
                    >
                      No messages yet. Use Compose to send the first message.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {messages.map((msg) => {
                        const m = getMsgMeta(msg.message_type);
                        const isInbound = msg.direction === "inbound",
                          isUnread = isInbound && !msg.read_at;
                        return (
                          <div
                            key={msg.id}
                            style={{
                              background: isUnread ? T.warningBg : "#fff",
                              border: `1px solid ${isUnread ? T.warningBd : T.ink150}`,
                              borderLeft: `3px solid ${isInbound ? T.info : m.color}`,
                              borderRadius: 6,
                              padding: "12px 16px",
                              display: "flex",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 16,
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
                                    color: isUnread ? T.ink900 : T.ink400,
                                    fontFamily: T.font,
                                  }}
                                >
                                  {msg.subject || m.label}
                                  {isUnread && (
                                    <span
                                      style={{
                                        marginLeft: 6,
                                        fontSize: 9,
                                        background: T.warning,
                                        color: "#fff",
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
                                        background: T.infoBg,
                                        color: T.info,
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
                                    color: T.ink400,
                                    flexShrink: 0,
                                    fontFamily: T.font,
                                  }}
                                >
                                  {timeAgo(msg.created_at)}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: T.ink700,
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap",
                                  fontFamily: T.font,
                                }}
                              >
                                {msg.body}
                              </div>
                              {msg.metadata?.points_awarded > 0 && (
                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 11,
                                    color: "#b5935a",
                                    fontWeight: 600,
                                    fontFamily: T.font,
                                  }}
                                >
                                  +{msg.metadata.points_awarded} pts bonus
                                  awarded
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: T.ink300,
                                cursor: "pointer",
                                fontSize: 14,
                                padding: "2px 6px",
                                flexShrink: 0,
                              }}
                              title="Delete"
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

              {/* POPIA */}
              {drawerTab === "popia" && (
                <>
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid ${T.ink150}`,
                      borderRadius: 8,
                      padding: 20,
                      marginBottom: 16,
                      boxShadow: T.shadow,
                    }}
                  >
                    {secHdr("POPIA Compliance Record")}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px 20px",
                      }}
                    >
                      {[
                        [
                          "POPIA Consented",
                          selected.popia_consented ? "Yes" : "Not yet",
                        ],
                        ["Consent Date", fmtDate(selected.popia_date)],
                        [
                          "Marketing Opt-In",
                          selected.marketing_opt_in ? "Yes" : "No",
                        ],
                        [
                          "Analytics Opt-In",
                          selected.analytics_opt_in ? "Yes" : "No",
                        ],
                        [
                          "Geolocation Consent",
                          selected.geolocation_consent ? "Yes" : "No",
                        ],
                      ].map(([lbl, val]) => (
                        <div key={lbl}>
                          <div
                            style={{
                              fontSize: 10,
                              color: T.ink400,
                              fontFamily: T.font,
                              marginBottom: 2,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {lbl}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: T.ink700,
                              fontFamily: T.font,
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
                      background: T.dangerBg,
                      border: `1px solid ${T.dangerBd}`,
                      borderRadius: 8,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.danger,
                        marginBottom: 10,
                        fontFamily: T.font,
                      }}
                    >
                      Data Deletion — POPIA Right to Erasure
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: T.ink700,
                        fontFamily: T.font,
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
                          color: T.accentMid,
                          fontFamily: T.font,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Request sent to admin. Ref: {selected.id?.slice(0, 8)}
                      </div>
                    ) : deleteConfirm?.error ? (
                      <div
                        style={{
                          color: T.danger,
                          fontFamily: T.font,
                          fontSize: 13,
                        }}
                      >
                        Failed to send. Contact admin manually.
                      </div>
                    ) : deleteConfirm?.confirm ? (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          style={{ ...makeBtn(T.danger), fontSize: 10 }}
                          onClick={() => handleDeleteRequest(selected)}
                        >
                          Confirm — Send Request
                        </button>
                        <button
                          style={{ ...makeBtn("#eee", T.ink400), fontSize: 10 }}
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        style={{ ...makeBtn(T.danger), fontSize: 10 }}
                        onClick={() => setDeleteConfirm({ confirm: true })}
                      >
                        Request Data Deletion
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
              background: "#fff",
              borderRadius: 8,
              padding: 32,
              width: 480,
              maxWidth: "95vw",
              boxShadow: T.shadowMd,
              fontFamily: T.font,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: T.ink900,
                marginBottom: 6,
              }}
            >
              Broadcast Message
            </div>
            <div
              style={{
                fontSize: 13,
                color: T.ink400,
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
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: 5,
                }}
              >
                Type
              </label>
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
                <option value="broadcast">Broadcast</option>
                <option value="event">Event</option>
                <option value="admin_notice">Notice</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: 5,
                }}
              >
                Subject
              </label>
              <input
                type="text"
                value={broadcastForm.subject}
                onChange={(e) =>
                  setBroadcastForm((f) => ({ ...f, subject: e.target.value }))
                }
                style={{ ...inputStyle, width: "100%" }}
                placeholder="Optional subject"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
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
              <div style={{ color: T.danger, fontSize: 12, marginBottom: 8 }}>
                {broadcastResult.error}
              </div>
            )}
            {broadcastResult?.success && (
              <div
                style={{
                  color: T.accentMid,
                  fontSize: 13,
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                {broadcastResult.success}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleBroadcast}
                disabled={broadcasting}
                style={{ ...makeBtn("#b5935a", "#fff", broadcasting), flex: 1 }}
              >
                {broadcasting ? "Sending…" : "Send Broadcast"}
              </button>
              <button
                onClick={() => {
                  setShowBroadcast(false);
                  setBroadcastResult(null);
                }}
                style={makeBtn("#eee", T.ink400)}
              >
                Cancel
              </button>
            </div>
            <div style={{ fontSize: 11, color: T.ink400, marginTop: 12 }}>
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
              background: "#fff",
              borderRadius: 8,
              padding: 32,
              width: 440,
              maxWidth: "95vw",
              boxShadow: T.shadowMd,
              fontFamily: T.font,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: T.ink900,
                marginBottom: 6,
              }}
            >
              Register Customer In-Store
            </div>
            <div
              style={{
                fontSize: 13,
                color: T.ink400,
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
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: T.ink400,
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
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
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
              <div style={{ color: T.danger, fontSize: 13, marginBottom: 12 }}>
                {regMsg.error}
              </div>
            )}
            {regMsg?.success && (
              <div
                style={{
                  color: T.accentMid,
                  fontSize: 13,
                  marginBottom: 12,
                  fontWeight: 600,
                }}
              >
                {regMsg.success}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                style={{ ...makeBtn(T.accent, "#fff", regLoading), flex: 1 }}
                onClick={handleRegister}
                disabled={regLoading}
              >
                {regLoading ? "Registering…" : "Register Customer"}
              </button>
              <button
                style={makeBtn("#eee", T.ink400)}
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
                color: T.ink400,
                marginTop: 14,
                lineHeight: 1.5,
              }}
            >
              POPIA: Obtain verbal consent before registration. Acquisition
              channel recorded as "in_store".
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
