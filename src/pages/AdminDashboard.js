// AdminDashboard.js v6.0
// WP-THEME: Unified design system applied
//   - Outfit replaces Cormorant Garamond + Jost
//   - DM Mono for all metric values
//   - Emoji removed from quick action buttons and stat cards
//   - StatCard: no coloured top borders — semantic colour on value only
//   - Metric rows: flush grid layout matching HQOverview
//   - Quick Actions: 4-variant button system
//   - Error bar: standard danger template
//   - Users table: semantic role badges (warning/info/neutral), DM Mono for points
// ★ v5.0: WP-NAV Sub-B — URL sync, green banner + tab bar removed

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "../components/WorkflowGuide";
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

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#888888",
  ink300: "#B0B0B0",
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
  fontUi: "'Outfit','Helvetica Neue',Arial,sans-serif",
  fontData: "'DM Mono','Courier New',monospace",
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
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
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
          .gte("transaction_date", iso)
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

  useEffect(() => {
    fetchUsers();
    computeAnalytics();
    fetchCommsBadge();
    fetchTodayStats();
    fetchTenantId();
  }, [
    fetchUsers,
    computeAnalytics,
    fetchCommsBadge,
    fetchTodayStats,
    fetchTenantId,
  ]);

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

  const handleNavigateToQR = (batchId) => {
    setQrInitialBatchId(batchId || null);
    setTab("qr_codes");
  };
  const handleNavigateToDocuments = (documentId) => {
    setDocumentsTargetId(documentId);
    setTab("documents");
  };

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
            title="Admin Dashboard"
            description="Day-to-day operations for your shop. Check the Comms badge first — reply to customers and close tickets. Then review batches, QR codes, and fraud alerts."
            steps={[
              {
                number: 1,
                label: "Comms",
                desc: "Reply to customer messages and resolve open support tickets. Badge turns red when attention is needed.",
                status: "required",
              },
              {
                number: 2,
                label: "Batches",
                desc: "Review active batches and stock levels. Low stock means products may disappear from the shop.",
                status: "required",
              },
              {
                number: 3,
                label: "QR Codes",
                desc: "Generate QR codes for new stock batches. Codes are HMAC-signed — always use the QR Engine.",
                status: "required",
              },
              {
                number: 4,
                label: "Customers",
                desc: "Monitor loyalty scores and engagement. CRM scoring only — use Comms tab for messaging.",
                status: "optional",
              },
              {
                number: 5,
                label: "Fraud",
                desc: "Review flagged accounts daily. Dismiss false positives or suspend confirmed abuse.",
                status: "required",
              },
              {
                number: 6,
                label: "Notifications",
                desc: "Check SMS/email delivery log for failures. This is an ops log — NOT a comms channel.",
                status: "optional",
              },
            ]}
            warnings={[
              "Comms tab (v4.7) replaced the old Messages + Support tabs. Do NOT re-add those tabs.",
              "Notifications tab = SMS/email delivery log ONLY. It is not a comms channel.",
              "Customers tab = CRM engagement scoring ONLY. It is not a comms channel.",
              "customer_messages uses .body field. ticket_messages uses .content field. Never swap these.",
              "ORDER BY production_date on batches — there is no created_at column on the batches table.",
              "UPDATE only on user_profiles — never use upsert.",
            ]}
            dataFlow={[
              {
                direction: "in",
                from: "HQ ships batch",
                to: "Batches tab (stock level updates)",
              },
              {
                direction: "in",
                from: "Customer scans QR",
                to: "Analytics tab + Customers tab (loyalty points)",
              },
              {
                direction: "in",
                from: "Customer sends message",
                to: "Comms tab badge (realtime)",
              },
              {
                direction: "out",
                from: "Admin replies in Comms",
                to: "Customer receives WhatsApp + inbox message",
              },
              {
                direction: "out",
                from: "Admin generates QR codes",
                to: "QR codes assigned to batch, ready for distribution",
              },
            ]}
            tips={[
              "The Comms badge is realtime — no refresh needed. Watch it during business hours.",
              "The QR Engine auto-selects the most recent batch. Always verify the correct batch before bulk generating.",
              "Customers tab shows tier distribution — useful for targeting Broadcast messages in the Comms tab.",
            ]}
            storageKey="admin_overview"
            defaultOpen={false}
          />

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

          {/* Quick Actions — no emoji, 4-variant buttons */}
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
              }}
              style={mkBtn("ghost", "sm")}
            >
              Refresh
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
      {tab === "comms" && <AdminCommsCenter />}
      {tab === "security" && <AdminFraudSecurity />}
      {tab === "notifications" && <AdminNotifications />}
      {tab === "qr_codes" && (
        <AdminQRCodes
          initialBatchId={qrInitialBatchId}
          initialTab={qrInitialBatchId ? "generate" : "registry"}
        />
      )}
      {tab === "analytics" && <AdminAnalytics />}
      {tab === "stock" && <StockControl />}
      {tab === "documents" && <HQDocuments initialDocId={documentsTargetId} />}
      {tab === "hr" && <AdminHRPanel tenantId={tenantId} />}

      {/* USERS */}
      {tab === "users" && (
        <div>
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
