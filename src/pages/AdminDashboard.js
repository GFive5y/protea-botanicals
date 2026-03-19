// AdminDashboard.js v6.3 — WP-VIZ: User Management charts (role donut, tier bar, points bar)
// v6.2 — WP-GUIDE: WorkflowGuide added to users tab
// v6.0 — WP-THEME: Unified design system applied
// ★ v5.0: WP-NAV Sub-B — URL sync, green banner + tab bar removed

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../services/supabaseClient";
import { ChartCard, ChartTooltip, PipelineStages } from "../components/viz";
import WorkflowGuide from "../components/WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import SystemStatusBar from "../components/SystemStatusBar";
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
import AdminCommsCenter from "../components/AdminCommsCenter";
import AdminHRPanel from "../components/AdminHRPanel";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
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
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

// 4-variant button factory
const mkBtn = (variant = "primary", size = "md") => {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 4,
    fontFamily: T.fontUi,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "opacity 0.15s",
    fontSize: size === "sm" ? "10px" : "11px",
    padding: size === "sm" ? "6px 12px" : "9px 18px",
  };
  const v = {
    primary: { background: T.accent, color: "#fff", border: "none" },
    secondary: {
      background: "transparent",
      color: T.accent,
      border: `1px solid ${T.accentBd}`,
    },
    ghost: {
      background: "transparent",
      color: T.ink700,
      border: `1px solid ${T.ink150}`,
    },
    danger: {
      background: "transparent",
      color: T.danger,
      border: `1px solid ${T.dangerBd}`,
    },
    warning: {
      background: "transparent",
      color: T.warning,
      border: `1px solid ${T.warningBd}`,
    },
  };
  return { ...base, ...(v[variant] || v.primary) };
};

// Stat card — no coloured top border, semantic value colour only
function StatCard({ label, value, sub, semantic, onClick }) {
  const semColors = {
    success: T.success,
    warning: T.warning,
    danger: T.danger,
    info: T.info,
  };
  const color = semantic ? semColors[semantic] : T.ink900;
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick)
          e.currentTarget.style.boxShadow = "inset 0 0 0 1px " + T.accentBd;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.ink400,
          fontFamily: T.fontUi,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.fontData,
          fontSize: "26px",
          fontWeight: 400,
          color,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "11px",
            color: T.ink500,
            fontFamily: T.fontUi,
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// Metric grid — flush cells separated by 1px ink150 lines
function MetricGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "1px",
        background: T.ink150,
        border: `1px solid ${T.ink150}`,
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 24,
        boxShadow: T.shadow,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: T.ink400,
        marginBottom: 12,
        fontFamily: T.fontUi,
      }}
    >
      {text}
    </div>
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

// ── Heatmap (Chart #17) — 12-week scan density ────────────────────────────────
function ScanHeatmap({ heatmapData }) {
  if (!heatmapData || heatmapData.length === 0) return null;
  const maxVal = Math.max(...heatmapData.map((d) => d.count), 1);
  // 5-stop colour scale: ink075 → accent
  const cellColor = (count) => {
    if (count === 0) return T.ink075;
    const pct = count / maxVal;
    if (pct < 0.2) return T.accentLit;
    if (pct < 0.4) return T.accentBd;
    if (pct < 0.65) return "#52B788";
    if (pct < 0.85) return T.accentMid;
    return T.accent;
  };
  const dayLabels = ["M", "", "W", "", "F", "", ""];
  const weeks = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
        {/* Day labels column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            paddingTop: 18,
          }}
        >
          {dayLabels.map((l, i) => (
            <div
              key={i}
              style={{
                height: 14,
                width: 12,
                fontSize: 9,
                color: T.ink400,
                fontFamily: T.fontUi,
                display: "flex",
                alignItems: "center",
              }}
            >
              {l}
            </div>
          ))}
        </div>
        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            {/* Week label (Mon of that week) */}
            <div
              style={{
                fontSize: 8,
                color: T.ink400,
                fontFamily: T.fontUi,
                height: 14,
                textAlign: "center",
              }}
            >
              {wi % 3 === 0 && week[0]?.date
                ? new Date(week[0].date).toLocaleDateString("en-ZA", {
                    month: "short",
                    day: "numeric",
                  })
                : ""}
            </div>
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date}: ${day.count} scan${day.count !== 1 ? "s" : ""}`}
                style={{
                  width: 14,
                  height: 14,
                  background: cellColor(day.count),
                  borderRadius: 2,
                  cursor: "default",
                  border: `1px solid ${day.count > 0 ? "transparent" : T.ink150}`,
                  transition: "opacity 0.1s",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}
      >
        <span style={{ fontSize: 9, color: T.ink400, fontFamily: T.fontUi }}>
          Less
        </span>
        {[
          T.ink075,
          T.accentLit,
          T.accentBd,
          "#52B788",
          T.accentMid,
          T.accent,
        ].map((c, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              background: c,
              borderRadius: 2,
              border: `1px solid ${T.ink150}`,
            }}
          />
        ))}
        <span style={{ fontSize: 9, color: T.ink400, fontFamily: T.fontUi }}>
          More
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [documentsTargetId, setDocumentsTargetId] = useState(null);
  const [qrInitialBatchId, setQrInitialBatchId] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [commsBadge, setCommsBadge] = useState(0);
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
  const [scansToday, setScansToday] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [pointsToday, setPointsToday] = useState(0);
  const [fraudAlerts, setFraudAlerts] = useState(0);
  const [tenantId, setTenantId] = useState(null);

  // WP-VIZ state
  const [scanTrend24h, setScanTrend24h] = useState([]); // [{hour, count}] last 24h
  const [heatmapData, setHeatmapData] = useState([]); // [{date, count}] 84 days
  const [pipelineFilter, setPipelineFilter] = useState(null);
  const [alerts, setAlerts] = useState([]); // GAP-02: system_alerts

  const ctx = usePageContext("admin", null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("tab");
    if (t) setTab(t);
    else if (location.pathname === "/admin" && !location.search)
      setTab("overview");
  }, [location.search, location.pathname]);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("user_profiles").select("*");
    setUsers(data || []);
  }, []);

  const fetchTenantId = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (data?.tenant_id) setTenantId(data.tenant_id);
    } catch (_) {}
  }, []);

  const fetchCommsBadge = useCallback(async () => {
    try {
      const [msgRes, tickRes] = await Promise.all([
        supabase
          .from("customer_messages")
          .select("*", { count: "exact", head: true })
          .eq("direction", "inbound")
          .is("read_at", null),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "pending_reply"]),
      ]);
      setCommsBadge((msgRes.count || 0) + (tickRes.count || 0));
    } catch (_) {}
  }, []);

  const computeAnalytics = useCallback(async () => {
    try {
      const { count: total } = await supabase
        .from("qr_codes")
        .select("*", { count: "exact", head: true });
      const { count: claimed } = await supabase
        .from("qr_codes")
        .select("*", { count: "exact", head: true })
        .eq("claimed", true);
      const { count: distributed } = await supabase
        .from("qr_codes")
        .select("*", { count: "exact", head: true })
        .not("distributed_at", "is", null)
        .eq("claimed", false);
      const { count: inStock } = await supabase
        .from("qr_codes")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .is("distributed_at", null);
      const claimRate =
        total > 0 ? (((claimed || 0) / total) * 100).toFixed(1) : 0;
      const { data: pointsData } = await supabase
        .from("qr_codes")
        .select("points_value")
        .eq("claimed", true);
      const totalPointsDistributed = (pointsData || []).reduce(
        (s, p) => s + (p.points_value || 0),
        0,
      );
      const { data: stockistData } = await supabase
        .from("qr_codes")
        .select("stockist_id")
        .not("stockist_id", "is", null);
      const activeStockists = new Set(
        (stockistData || []).map((p) => p.stockist_id),
      ).size;
      const { data: timeData } = await supabase
        .from("qr_codes")
        .select("distributed_at, claimed_at")
        .eq("claimed", true)
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
      console.error("[AdminDashboard] Analytics error:", e);
    }
  }, []);

  const fetchTodayStats = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const iso = todayStart.toISOString();
      const [scanRes, custRes, ptsRes, fraudRes] = await Promise.all([
        supabase
          .from("scan_logs")
          .select("id", { count: "exact", head: true })
          .gte("scanned_at", iso),
        supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", iso),
        supabase
          .from("loyalty_transactions")
          .select("points")
          .gte("created_at", iso)
          .not("transaction_type", "in", '("SPENT","REDEEMED")'),
        supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true })
          .or("is_suspended.eq.true,anomaly_score.gt.70"),
      ]);
      setScansToday(scanRes.count || 0);
      setNewCustomers(custRes.count || 0);
      setPointsToday(
        (ptsRes.data || []).reduce((s, t) => s + (t.points || 0), 0),
      );
      setFraudAlerts(fraudRes.count || 0);
    } catch (_) {}
  }, []);

  // WP-VIZ: 24h scan trend (hourly) — Chart #3
  const fetchScanTrend24h = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 24 * 3600000).toISOString();
      const { data } = await supabase
        .from("scan_logs")
        .select("scanned_at")
        .gte("scanned_at", since)
        .order("scanned_at", { ascending: true });
      const hourMap = {};
      for (let h = 0; h < 24; h++) {
        const label = `${h.toString().padStart(2, "0")}:00`;
        hourMap[label] = 0;
      }
      (data || []).forEach((s) => {
        const h = new Date(s.scanned_at).getHours();
        const label = `${h.toString().padStart(2, "0")}:00`;
        hourMap[label] = (hourMap[label] || 0) + 1;
      });
      setScanTrend24h(
        Object.entries(hourMap).map(([hour, count]) => ({ hour, count })),
      );
    } catch (_) {}
  }, []);

  // WP-VIZ: 12-week scan heatmap — Chart #17
  const fetchHeatmap = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 84 * 86400000).toISOString();
      const { data } = await supabase
        .from("scan_logs")
        .select("scanned_at")
        .gte("scanned_at", since);
      const dayMap = {};
      // Seed all 84 days with 0
      for (let i = 83; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dayMap[key] = 0;
      }
      (data || []).forEach((s) => {
        const key = new Date(s.scanned_at).toISOString().split("T")[0];
        if (key in dayMap) dayMap[key]++;
      });
      // Sort by date, build array aligned to Monday
      const entries = Object.entries(dayMap).sort((a, b) =>
        a[0] > b[0] ? 1 : -1,
      );
      // Pad to start on Monday
      const firstDate = new Date(entries[0][0]);
      const dayOfWeek = firstDate.getDay(); // 0=Sun
      const padDays = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days before Monday
      const padded = [
        ...Array(padDays).fill({ date: "", count: 0 }),
        ...entries.map(([date, count]) => ({ date, count })),
      ];
      setHeatmapData(padded);
    } catch (_) {}
  }, []);

  // GAP-02: system_alerts fetch
  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("system_alerts")
        .select("id,title,body,severity,status,created_at")
        .in("status", ["open", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(10);
      setAlerts(data || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchUsers();
    computeAnalytics();
    fetchCommsBadge();
    fetchTodayStats();
    fetchTenantId();
    fetchScanTrend24h();
    fetchHeatmap();
    fetchAlerts();
  }, [
    fetchUsers,
    computeAnalytics,
    fetchCommsBadge,
    fetchTodayStats,
    fetchTenantId,
    fetchScanTrend24h,
    fetchHeatmap,
    fetchAlerts,
  ]);

  // Realtime: inbound messages → badge
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
        fetchCommsBadge,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "customer_messages" },
        fetchCommsBadge,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchCommsBadge]);

  // Realtime: tickets → badge
  useEffect(() => {
    const sub = supabase
      .channel("admin-dashboard-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        fetchCommsBadge,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchCommsBadge]);

  // Realtime: QR codes → analytics
  useEffect(() => {
    const sub = supabase
      .channel("admin-dashboard-kpi")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qr_codes" },
        computeAnalytics,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [computeAnalytics]);

  // Realtime: new scans → refresh 24h trend
  useEffect(() => {
    const sub = supabase
      .channel("admin-scan-trend")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scan_logs" },
        fetchScanTrend24h,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchScanTrend24h]);

  // GAP-02: Realtime system_alerts
  useEffect(() => {
    const sub = supabase
      .channel("admin-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_alerts" },
        fetchAlerts,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "system_alerts" },
        fetchAlerts,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchAlerts]);

  const handleNavigateToQR = (batchId) => {
    setQrInitialBatchId(batchId || null);
    setTab("qr_codes");
  };
  const handleNavigateToDocuments = (documentId) => {
    setDocumentsTargetId(documentId);
    setTab("documents");
  };

  // Pipeline stages for QR flow
  const qrPipelineStages = [
    {
      id: "inStock",
      label: "In Stock",
      count: analytics.inStock,
      variant: "default",
      value: "inStock",
    },
    {
      id: "distributed",
      label: "Distributed",
      count: analytics.distributed,
      variant: "warning",
      value: "distributed",
    },
    {
      id: "claimed",
      label: "Claimed",
      count: analytics.claimed,
      variant: "success",
      value: "claimed",
    },
    {
      id: "comms",
      label: "Comms",
      count: commsBadge,
      variant: commsBadge > 0 ? "danger" : "default",
      value: "comms",
    },
    {
      id: "fraud",
      label: "Fraud",
      count: fraudAlerts,
      variant: fraudAlerts > 0 ? "danger" : "default",
      value: "fraud",
    },
  ];

  return (
    <div style={{ fontFamily: T.fontUi }}>
      {/* Header */}
      <div style={{ marginBottom: 0 }}>
        <h1
          style={{
            fontFamily: T.fontUi,
            fontSize: "22px",
            fontWeight: 300,
            color: T.ink900,
            margin: "0 0 4px",
          }}
        >
          Admin Dashboard
        </h1>
      </div>

      <SystemStatusBar />
      <div style={{ marginBottom: "20px" }} />

      {/* Error — standard danger template */}
      {error && (
        <div
          style={{
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            padding: "12px 16px",
            borderRadius: 6,
            marginBottom: 20,
            color: T.danger,
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError("")}
            style={{
              background: "none",
              border: "none",
              color: T.danger,
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div>
          <WorkflowGuide
            context={ctx}
            tabId="admin"
            onAction={(action) => action.tab && setTab(action.tab)}
            defaultOpen={false}
          />

          {/* GAP-02: System Alerts banner */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {alerts.map((a) => {
                const sev = {
                  critical: { bg: T.dangerBg, bd: T.dangerBd, color: T.danger },
                  warning: {
                    bg: T.warningBg,
                    bd: T.warningBd,
                    color: T.warning,
                  },
                  info: { bg: T.infoBg, bd: T.infoBd, color: T.info },
                }[a.severity] || {
                  bg: T.ink075,
                  bd: T.ink150,
                  color: T.ink700,
                };
                return (
                  <div
                    key={a.id}
                    style={{
                      background: sev.bg,
                      border: `1px solid ${sev.bd}`,
                      borderRadius: 6,
                      padding: "12px 16px",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: sev.color,
                          fontFamily: T.fontUi,
                          marginBottom: 2,
                        }}
                      >
                        {a.title || a.severity?.toUpperCase()}
                      </div>
                      {a.body && (
                        <div
                          style={{
                            fontSize: 12,
                            color: T.ink700,
                            fontFamily: T.fontUi,
                          }}
                        >
                          {a.body}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        await supabase
                          .from("system_alerts")
                          .update({ status: "acknowledged" })
                          .eq("id", a.id);
                        fetchAlerts();
                      }}
                      style={{
                        ...mkBtn("ghost", "sm"),
                        flexShrink: 0,
                        fontSize: 9,
                      }}
                    >
                      Acknowledge
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ROW 1 — Today's Activity */}
          <SectionLabel text="Today's Activity" />
          <MetricGrid>
            <StatCard
              label="Scans Today"
              value={scansToday}
              semantic="success"
            />
            <StatCard
              label="New Customers"
              value={newCustomers}
              semantic="info"
            />
            <StatCard
              label="Points Awarded"
              value={pointsToday.toLocaleString()}
              semantic={null}
            />
            <StatCard
              label="Active QR Codes"
              value={analytics.inStock}
              sub="in stock, unscanned"
              semantic="info"
            />
          </MetricGrid>

          {/* ── CHART: 24h Scan Activity Area (Chart #3) ── */}
          {scanTrend24h.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <ChartCard title="Scan Activity — Last 24 Hours" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={scanTrend24h}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="admin-scan-grad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={T.accentMid}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={T.accentMid}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.ink150}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="hour"
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.fontUi,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                      interval={3}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.fontUi,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={24}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v) => `${v} scan${v !== 1 ? "s" : ""}`}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Scans"
                      stroke={T.accentMid}
                      strokeWidth={2}
                      fill="url(#admin-scan-grad)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {/* ── CHART: QR + Action Pipeline (Chart #16) ── */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: 10,
                fontFamily: T.fontUi,
              }}
            >
              Platform Pipeline — click to navigate
            </div>
            <PipelineStages
              stages={qrPipelineStages}
              selected={pipelineFilter}
              onSelect={(val) => {
                setPipelineFilter(val);
                if (val === "comms") setTab("comms");
                if (val === "fraud") setTab("security");
                if (
                  val === "claimed" ||
                  val === "distributed" ||
                  val === "inStock"
                )
                  setTab("qr_codes");
              }}
            />
          </div>

          {/* ROW 2 — Action Required */}
          <SectionLabel text="Action Required" />
          <MetricGrid>
            <StatCard
              label="Comms"
              value={commsBadge}
              sub={commsBadge > 0 ? "items need attention" : "all clear"}
              semantic={commsBadge > 0 ? "danger" : "success"}
              onClick={() => setTab("comms")}
            />
            <StatCard
              label="QR Claim Rate"
              value={`${analytics.claimRate}%`}
              sub={`${analytics.claimed} claimed of ${analytics.total}`}
              semantic={parseFloat(analytics.claimRate) < 20 ? "warning" : null}
            />
            <StatCard
              label="Fraud Alerts"
              value={fraudAlerts}
              sub={fraudAlerts > 0 ? "accounts flagged" : "no alerts"}
              semantic={fraudAlerts > 0 ? "danger" : "success"}
              onClick={() => setTab("security")}
            />
            <StatCard
              label="Total Users"
              value={analytics.userCount}
              semantic="info"
              onClick={() => setTab("users")}
            />
          </MetricGrid>

          {/* ROW 3 — Platform Health */}
          <SectionLabel text="Platform Health" />
          <MetricGrid>
            <StatCard
              label="Points Distributed"
              value={analytics.totalPointsDistributed.toLocaleString()}
              semantic={null}
            />
            <StatCard
              label="Active Stockists"
              value={analytics.activeStockists}
              semantic="info"
            />
            <StatCard
              label="Avg Time to Claim"
              value={
                analytics.avgTimeToClaim ? `${analytics.avgTimeToClaim}h` : "—"
              }
              sub="hours from distribution"
              semantic={null}
            />
            <StatCard
              label="Distributed"
              value={analytics.distributed}
              sub="with customer, unclaimed"
              semantic={null}
            />
          </MetricGrid>

          {/* ── CHART: Scan Heatmap 12 weeks (Chart #17) ── */}
          {heatmapData.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <ChartCard title="Scan Density — Last 12 Weeks" height={130}>
                <ScanHeatmap heatmapData={heatmapData} />
              </ChartCard>
            </div>
          )}

          {/* Quick Actions */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.ink900,
              marginBottom: 14,
              fontFamily: T.fontUi,
            }}
          >
            Quick Actions
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setTab("comms")}
              style={mkBtn(commsBadge > 0 ? "danger" : "ghost", "sm")}
            >
              {commsBadge > 0 ? `Comms (${commsBadge})` : "Comms"}
            </button>
            <button
              onClick={() => setTab("shipments")}
              style={mkBtn("ghost", "sm")}
            >
              Shipments
            </button>
            <button
              onClick={() => setTab("production")}
              style={mkBtn("ghost", "sm")}
            >
              Production
            </button>
            <button
              onClick={() => setTab("batches")}
              style={mkBtn("ghost", "sm")}
            >
              Batches
            </button>
            <button
              onClick={() => {
                setQrInitialBatchId(null);
                setTab("qr_codes");
              }}
              style={mkBtn("secondary", "sm")}
            >
              QR Engine
            </button>
            <button
              onClick={() => setTab("stock")}
              style={mkBtn("ghost", "sm")}
            >
              Stock
            </button>
            <button
              onClick={() => setTab("customers")}
              style={mkBtn("ghost", "sm")}
            >
              Customers
            </button>
            <button
              onClick={() => setTab("security")}
              style={mkBtn(fraudAlerts > 0 ? "danger" : "ghost", "sm")}
            >
              {fraudAlerts > 0 ? `Fraud (${fraudAlerts})` : "Fraud"}
            </button>
            <button
              onClick={() => {
                setDocumentsTargetId(null);
                setTab("documents");
              }}
              style={mkBtn("ghost", "sm")}
            >
              Documents
            </button>
            <button onClick={() => setTab("hr")} style={mkBtn("ghost", "sm")}>
              HR
            </button>
            <button
              onClick={() => {
                computeAnalytics();
                fetchUsers();
                fetchCommsBadge();
                fetchTodayStats();
                fetchScanTrend24h();
                fetchHeatmap();
              }}
              style={mkBtn("ghost", "sm")}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* ── PLATFORM BAR + TODAY CHARTS (only on overview) ── */}
      {tab === "overview" &&
        (() => {
          const platformBarData = [
            { label: "QR Codes", value: analytics.total, color: T.info },
            { label: "Claimed", value: analytics.claimed, color: T.success },
            {
              label: "Distributed",
              value: analytics.distributed,
              color: "#b5935a",
            },
            { label: "In Stock", value: analytics.inStock, color: T.accentMid },
            { label: "Users", value: analytics.userCount, color: T.accent },
          ].filter((d) => d.value > 0);

          const activityData = [
            { metric: "Scans Today", value: scansToday },
            { metric: "New Customers", value: newCustomers },
            { metric: "Points Today", value: pointsToday },
            { metric: "Fraud Alerts", value: fraudAlerts },
          ].filter((d) => d.value > 0);

          if (platformBarData.length === 0) return null;
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 20,
                marginTop: 24,
              }}
            >
              <ChartCard title="Platform Overview" height={220}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={platformBarData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.ink150}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.fontUi,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.fontUi,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Count"
                      isAnimationActive={false}
                      maxBarSize={40}
                      radius={[3, 3, 0, 0]}
                    >
                      {platformBarData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {activityData.length > 0 && (
                <ChartCard title="Today's Activity" height={220}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activityData}
                      layout="vertical"
                      margin={{ top: 8, right: 32, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid
                        horizontal
                        vertical={false}
                        stroke={T.ink150}
                        strokeWidth={0.5}
                      />
                      <XAxis
                        type="number"
                        tick={{
                          fill: T.ink400,
                          fontSize: 10,
                          fontFamily: T.fontUi,
                        }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="metric"
                        tick={{
                          fill: T.ink400,
                          fontSize: 10,
                          fontFamily: T.fontUi,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={88}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="value"
                        name="Count"
                        fill={T.accentMid}
                        isAnimationActive={false}
                        maxBarSize={22}
                        radius={[0, 3, 3, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>
          );
        })()}

      {/* ── TAB ROUTING ── */}
      {tab === "shipments" && <AdminShipments />}
      {tab === "production" && <AdminProductionModule />}
      {tab === "batches" && (
        <AdminBatchManager
          onNavigateToQR={handleNavigateToQR}
          onNavigateToDocuments={handleNavigateToDocuments}
        />
      )}
      {tab === "customers" && <AdminCustomerEngagement />}
      {tab === "comms" && <AdminCommsCenter />}
      {tab === "security" && <AdminFraudSecurity />}
      {tab === "notifications" && <AdminNotifications />}
      {tab === "qr_codes" && (
        <AdminQRCodes
          initialBatchId={qrInitialBatchId}
          initialTab={qrInitialBatchId ? "generate" : "registry"}
        />
      )}
      {tab === "analytics" && <AdminAnalytics tenantId={tenantId} />}
      {tab === "stock" && <StockControl />}
      {tab === "documents" && <HQDocuments initialDocId={documentsTargetId} />}
      {tab === "hr" && <AdminHRPanel tenantId={tenantId} />}

      {/* USERS */}
      {tab === "users" && (
        <div>
          <WorkflowGuide
            context={ctx}
            tabId="admin-users"
            onAction={() => {}}
            defaultOpen={false}
          />
          <h2
            style={{
              fontFamily: T.fontUi,
              fontSize: "20px",
              fontWeight: 500,
              color: T.ink900,
              marginBottom: "20px",
            }}
          >
            User Management
          </h2>

          {/* Flush stat grid */}
          {users.length > 0 &&
            (() => {
              const customers = users.filter((u) => u.role === "customer");
              const admins = users.filter((u) => u.role === "admin");
              const retailers = users.filter((u) => u.role === "retailer");
              const totalPts = users.reduce(
                (s, u) => s + (u.loyalty_points || 0),
                0,
              );
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
                    gap: "1px",
                    background: T.ink150,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: `1px solid ${T.ink150}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Total Users",
                      value: users.length,
                      color: T.accent,
                    },
                    {
                      label: "Customers",
                      value: customers.length,
                      color: T.accentMid,
                    },
                    { label: "Admins", value: admins.length, color: T.warning },
                    {
                      label: "Retailers",
                      value: retailers.length,
                      color: T.info,
                    },
                    {
                      label: "Total Points",
                      value: totalPts.toLocaleString(),
                      color: "#b5935a",
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
                          fontFamily: T.fontUi,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontFamily: T.fontUi,
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
              );
            })()}

          {/* Charts */}
          {users.length > 0 &&
            (() => {
              // Role donut
              const roleCounts = users.reduce((acc, u) => {
                const r = u.role || "customer";
                acc[r] = (acc[r] || 0) + 1;
                return acc;
              }, {});
              const roleDonut = Object.entries(roleCounts).map(
                ([role, count]) => ({ name: role, value: count }),
              );
              const ROLE_COLORS = {
                customer: T.accentMid,
                admin: T.warning,
                retailer: T.info,
                hq: T.accent,
              };

              // Tier distribution bar
              const TIERS = ["platinum", "gold", "silver", "bronze"];
              const TIER_COLORS = {
                platinum: "#7b68ee",
                gold: "#b5935a",
                silver: "#8e9ba8",
                bronze: "#a0674b",
              };
              const tierBar = TIERS.map((tier) => ({
                name: tier.charAt(0).toUpperCase() + tier.slice(1),
                count: users.filter(
                  (u) => (u.loyalty_tier || "bronze").toLowerCase() === tier,
                ).length,
                color: TIER_COLORS[tier],
              })).filter((d) => d.count > 0);

              // Top 8 users by points
              const topPts = [...users]
                .sort(
                  (a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0),
                )
                .slice(0, 8)
                .map((u) => ({
                  name: (u.email || u.id?.slice(0, 8) || "—")
                    .split("@")[0]
                    .slice(0, 12),
                  points: u.loyalty_points || 0,
                }));

              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  {/* Role donut */}
                  <ChartCard title="Users by Role" height={200}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roleDonut}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          isAnimationActive={false}
                        >
                          {roleDonut.map((d, i) => (
                            <Cell
                              key={i}
                              fill={ROLE_COLORS[d.name] || T.ink400}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={
                            <ChartTooltip formatter={(v) => `${v} users`} />
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Tier bar */}
                  <ChartCard title="Loyalty Tier Distribution" height={200}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={tierBar}
                        margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
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
                            fontFamily: T.fontUi,
                          }}
                          axisLine={false}
                          tickLine={false}
                          dy={4}
                        />
                        <YAxis
                          tick={{
                            fill: T.ink400,
                            fontSize: 10,
                            fontFamily: T.fontUi,
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={24}
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={
                            <ChartTooltip formatter={(v) => `${v} users`} />
                          }
                        />
                        <Bar
                          dataKey="count"
                          name="Users"
                          isAnimationActive={false}
                          maxBarSize={36}
                          radius={[3, 3, 0, 0]}
                        >
                          {tierBar.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Top points bar */}
                  <ChartCard title="Top Users by Points" height={200}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topPts}
                        margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                        layout="vertical"
                      >
                        <CartesianGrid
                          horizontal
                          vertical={false}
                          stroke={T.ink150}
                          strokeWidth={0.5}
                        />
                        <XAxis
                          type="number"
                          tick={{
                            fill: T.ink400,
                            fontSize: 9,
                            fontFamily: T.fontUi,
                          }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{
                            fill: T.ink400,
                            fontSize: 9,
                            fontFamily: T.fontUi,
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={68}
                        />
                        <Tooltip
                          content={
                            <ChartTooltip formatter={(v) => `${v} pts`} />
                          }
                        />
                        <Bar
                          dataKey="points"
                          name="Points"
                          fill="#b5935a"
                          isAnimationActive={false}
                          maxBarSize={14}
                          radius={[0, 3, 3, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              );
            })()}

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                border: `1px solid ${T.ink150}`,
                fontSize: "13px",
                fontFamily: T.fontUi,
              }}
            >
              <thead>
                <tr style={{ background: T.accent, color: "#fff" }}>
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
                          fontWeight: 700,
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
                        color: T.ink500,
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
                        borderBottom: `1px solid ${T.ink075}`,
                        background: i % 2 === 0 ? "#fff" : T.ink050,
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: T.fontData,
                          fontSize: "11px",
                          color: T.ink700,
                        }}
                      >
                        {u.email || u.id?.substring(0, 12) + "..."}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            background:
                              u.role === "admin"
                                ? T.warningBg
                                : u.role === "retailer"
                                  ? T.infoBg
                                  : T.ink075,
                            color:
                              u.role === "admin"
                                ? T.warning
                                : u.role === "retailer"
                                  ? T.info
                                  : T.ink500,
                            padding: "2px 8px",
                            borderRadius: 3,
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          {u.role || "customer"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: T.fontData,
                          fontWeight: 600,
                          color: T.ink900,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {u.loyalty_points || 0}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textTransform: "capitalize",
                          color: T.ink700,
                        }}
                      >
                        {u.loyalty_tier || "bronze"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: "12px",
                          color: T.ink500,
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
