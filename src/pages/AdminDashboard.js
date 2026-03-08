// AdminDashboard.js v3.9 — Adds Batches tab (WP1)
// Protea Botanicals — March 2026
// ★ v3.9 changes:
//   1. ADDED: "Batches" tab → AdminBatchManager component
//   2. ADDED: onNavigateToQR callback — batch "Generate QR" button switches to QR tab
//   3. ADDED: Quick action "MANAGE BATCHES" on overview
//   4. UPDATED: Overview stats strip — no logic changes to existing tabs

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import AdminQrGenerator from "./AdminQrGenerator";
import AdminAnalytics from "./AdminAnalytics";
import AdminQrList from "../components/AdminQrList";
import StockControl from "../components/StockControl";
import AdminBatchManager from "../components/AdminBatchManager";
import AdminProductionModule from "../components/AdminProductionModule";
import AdminShipments from "../components/AdminShipments";

// ─── Design Tokens ───
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

function TabBtn({ active, label, onClick }) {
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
      }}
    >
      {label}
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

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [qrSubTab, setQrSubTab] = useState("registry");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
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
    const { data, err } = await supabase.from("user_profiles").select("*");
    if (err) console.error("fetchUsers error:", err);
    setUsers(data || []);
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
        .select("distributed_at, claimed_at")
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
  }, [fetchUsers, computeAnalytics]);

  // ── Called from AdminBatchManager "Generate QR" button ──────────────────
  const handleNavigateToQR = (batchId) => {
    setTab("qr_codes");
    setQrSubTab("generate");
    // Note: AdminQrGenerator v4.0 auto-loads batch dropdown on mount.
    // The user picks the correct batch from the dropdown (already auto-selects newest).
    // Full batch pre-selection wiring can be added in a future session if needed.
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
          active={tab === "production"}
          label="Production"
          onClick={() => setTab("production")}
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
          active={tab === "analytics"}
          label="Analytics"
          onClick={() => setTab("analytics")}
        />
        <TabBtn
          active={tab === "stock"}
          label="Stock"
          onClick={() => setTab("stock")}
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

      {/* ══════ OVERVIEW ══════ */}
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
                setTab("qr_codes");
                setQrSubTab("generate");
              }}
              style={makeBtn(C.accent)}
            >
              GENERATE QR CODES
            </button>
            <button
              onClick={() => {
                setTab("qr_codes");
                setQrSubTab("registry");
              }}
              style={makeBtn(C.blue)}
            >
              VIEW ALL CODES
            </button>
            <button onClick={() => setTab("stock")} style={makeBtn(C.mid)}>
              STOCK CONTROL
            </button>
            <button
              onClick={() => {
                computeAnalytics();
                fetchUsers();
              }}
              style={makeBtn(C.mid)}
            >
              REFRESH DATA
            </button>
          </div>
        </div>
      )}

      {/* ══════ SHIPMENTS ══════ */}
      {tab === "shipments" && <AdminShipments />}

      {/* ══════ PRODUCTION ══════ */}
      {tab === "production" && <AdminProductionModule />}

      {/* ══════ BATCHES ══════ */}
      {tab === "batches" && (
        <AdminBatchManager onNavigateToQR={handleNavigateToQR} />
      )}

      {/* ══════ QR CODES — sub-tabs ══════ */}
      {tab === "qr_codes" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: "28px",
              borderBottom: `2px solid ${C.border}`,
            }}
          >
            {[
              { key: "registry", label: "QR Registry" },
              { key: "generate", label: "Generate" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setQrSubTab(s.key)}
                style={{
                  padding: "10px 28px",
                  border: "none",
                  borderBottom:
                    qrSubTab === s.key
                      ? `3px solid ${C.accent}`
                      : "3px solid transparent",
                  marginBottom: "-2px",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: qrSubTab === s.key ? C.green : C.muted,
                  fontFamily: FONTS.body,
                  transition: "color 0.15s",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          {qrSubTab === "registry" && <AdminQrList />}
          {qrSubTab === "generate" && <AdminQrGenerator />}
        </div>
      )}

      {/* ══════ USERS ══════ */}
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

      {/* ══════ ANALYTICS ══════ */}
      {tab === "analytics" && <AdminAnalytics />}

      {/* ══════ STOCK ══════ */}
      {tab === "stock" && <StockControl />}
    </div>
  );
}
