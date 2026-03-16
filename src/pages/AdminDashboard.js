// AdminDashboard.js v4.8
// Protea Botanicals — March 2026
// ★ v4.8: WP-X System Intelligence Layer
//   - SystemStatusBar added below header (live counts + pending setup checklist)
//   - Overview tab overhauled: 3-row tile grid (Today · Action Required · Platform Health)
//   - WorkflowGuide added to Overview tab (contextual onboarding)
//   - New live counts: scansToday, newCustomers, pointsToday, fraudAlerts
// ★ v4.7: WP-U Unified Comms Centre
//   - New "comms" tab replaces separate "messages" and "support" tabs
//   - AdminCommsCenter.js handles customer_messages + support_tickets + wholesale_messages
//   - commsBadge = unread inbound messages + open tickets combined
//   - AdminSupportPanel + AdminMessages imports removed
// ★ v4.6: WP-R Phase 6 — realtime KPI strip (qr_codes table)
// ★ v4.5: WP-S Batch QR Chain
// ★ v4.4: BUG-002 fix — Overview KPIs rewired to qr_codes table

import React, { useState, useEffect, useCallback } from "react";
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

function StatCard({ label, value, sub, color = C.green, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "20px",
        flex: "1 1 200px",
        minWidth: "180px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick)
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
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
  // v4.8: additional live stats for overview
  const [scansToday, setScansToday] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [pointsToday, setPointsToday] = useState(0);
  const [fraudAlerts, setFraudAlerts] = useState(0);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("user_profiles").select("*");
    setUsers(data || []);
  }, []);

  // v4.7: combined comms badge = unread inbound messages + open tickets
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

  // v4.8: fetch today's live counts
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
  }, [fetchUsers, computeAnalytics, fetchCommsBadge, fetchTodayStats]);

  // Realtime: customer_messages → refresh comms badge
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

  // Realtime: support_tickets → refresh comms badge
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

  // Realtime: qr_codes → refresh KPI strip
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
    <div style={{ fontFamily: FONTS.body }}>
      {/* Header */}
      <div
        style={{
          background: C.green,
          padding: "20px 32px",
          borderRadius: "2px",
          marginBottom: 0,
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

      {/* System Status Bar — WP-X */}
      <SystemStatusBar />

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
          marginTop: "12px",
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
          onClick={() => {
            setQrInitialBatchId(null);
            setTab("qr_codes");
          }}
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
          active={tab === "comms"}
          label="💬 Comms"
          badge={commsBadge}
          onClick={() => setTab("comms")}
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

      {error && (
        <div
          style={{
            background: "#f8d7da",
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

      {/* ═══════════════════════════════════════════════════════
          OVERVIEW — v4.8
      ═══════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div>
          {/* Workflow Guide */}
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

          {/* ── ROW 1: Today's Activity ── */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 12,
            }}
          >
            Today's Activity
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <StatCard
              icon="📱"
              label="Scans Today"
              value={scansToday}
              color={C.green}
            />
            <StatCard
              icon="👥"
              label="New Customers"
              value={newCustomers}
              color={C.accent}
            />
            <StatCard
              icon="⭐"
              label="Points Awarded"
              value={pointsToday.toLocaleString()}
              color={C.gold}
            />
            <StatCard
              icon="📦"
              label="Active QR Codes"
              value={analytics.inStock}
              sub="in stock, unscanned"
              color={C.blue}
            />
          </div>

          {/* ── ROW 2: Action Required ── */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 12,
            }}
          >
            Action Required
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <StatCard
              icon="💬"
              label="Comms"
              value={commsBadge}
              sub={commsBadge > 0 ? "items need attention" : "all clear"}
              color={commsBadge > 0 ? C.red : C.accent}
              onClick={() => setTab("comms")}
            />
            <StatCard
              icon="📦"
              label="QR Claim Rate"
              value={`${analytics.claimRate}%`}
              sub={`${analytics.claimed} claimed of ${analytics.total}`}
              color={parseFloat(analytics.claimRate) < 20 ? C.orange : C.accent}
            />
            <StatCard
              icon="🚨"
              label="Fraud Alerts"
              value={fraudAlerts}
              sub={fraudAlerts > 0 ? "accounts flagged" : "no alerts"}
              color={fraudAlerts > 0 ? C.red : C.accent}
              onClick={() => setTab("security")}
            />
            <StatCard
              icon="👥"
              label="Total Users"
              value={analytics.userCount}
              color={C.green}
              onClick={() => setTab("users")}
            />
          </div>

          {/* ── ROW 3: Platform Health ── */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 12,
            }}
          >
            Platform Health
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            <StatCard
              icon="🎯"
              label="Points Distributed"
              value={analytics.totalPointsDistributed.toLocaleString()}
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
              icon="📤"
              label="Distributed"
              value={analytics.distributed}
              sub="with customer, unclaimed"
              color={C.gold}
            />
          </div>

          {/* ── Quick Actions ── */}
          <h3
            style={{
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: "18px",
              marginBottom: "14px",
            }}
          >
            Quick Actions
          </h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => setTab("comms")}
              style={{ ...makeBtn(commsBadge > 0 ? C.red : C.mid) }}
            >
              💬 COMMS {commsBadge > 0 ? `(${commsBadge})` : ""}
            </button>
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
              🌿 BATCHES
            </button>
            <button
              onClick={() => {
                setQrInitialBatchId(null);
                setTab("qr_codes");
              }}
              style={makeBtn(C.accent)}
            >
              📷 QR ENGINE
            </button>
            <button onClick={() => setTab("stock")} style={makeBtn(C.mid)}>
              📦 STOCK
            </button>
            <button onClick={() => setTab("customers")} style={makeBtn(C.mid)}>
              👥 CUSTOMERS
            </button>
            <button
              onClick={() => setTab("security")}
              style={{ ...makeBtn(fraudAlerts > 0 ? C.red : C.mid) }}
            >
              🛡️ FRAUD {fraudAlerts > 0 ? `(${fraudAlerts})` : ""}
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
                fetchCommsBadge();
                fetchTodayStats();
              }}
              style={makeBtn(C.mid)}
            >
              ↻ REFRESH
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
      {/* v4.7: Unified Comms Centre — customer_messages + support_tickets + wholesale */}
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
