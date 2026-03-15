// AdminDashboard.js v4.7
// Protea Botanicals — March 2026
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

  useEffect(() => {
    fetchUsers();
    computeAnalytics();
    fetchCommsBadge();
  }, [fetchUsers, computeAnalytics, fetchCommsBadge]);

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

          {commsBadge > 0 && (
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
                {commsBadge} item{commsBadge !== 1 ? "s" : ""} need attention in
                Comms
              </span>
              <button
                onClick={() => setTab("comms")}
                style={{
                  ...makeBtn(C.orange),
                  fontSize: 10,
                  padding: "5px 14px",
                  marginLeft: "auto",
                }}
              >
                View Comms
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
              onClick={() => {
                setQrInitialBatchId(null);
                setTab("qr_codes");
              }}
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
            <button onClick={() => setTab("comms")} style={makeBtn(C.mid)}>
              💬 COMMS
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
