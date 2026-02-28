// src/components/hq/HQOverview.js — Protea Botanicals v1.2
// ─────────────────────────────────────────────────────────────────────────────
// v1.2 FIX: Low-stock query now uses correct column name `quantity_on_hand`
//   instead of `quantity`. Previous version caused 400 errors from Supabase.
//   Also displays quantity_on_hand in the low-stock alert cards.
//
// v1.1 FIX: Each query independent with try-catch. inventory_items low-stock
//   query handles unknown column names gracefully (400 error protection).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

const C = {
  bg: "#faf9f6",
  warmBg: "#f4f0e8",
  primaryDark: "#1b4332",
  primaryMid: "#2d6a4f",
  accentGreen: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#888888",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c0392b",
};

export default function HQOverview() {
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Each query independent — one failure won't break others
      let products = 0,
        scans = 0,
        users = 0,
        totalPoints = 0;
      let inventoryItems = 0,
        tenants = 0,
        recentScanCount = 0;
      let scansData = [],
        lowStockData = [];

      // Products count
      try {
        const r = await supabase
          .from("products")
          .select("id", { count: "exact", head: true });
        products = r.count || 0;
      } catch (e) {
        console.warn("[HQOverview] products count failed:", e.message);
      }

      // Scans count
      try {
        const r = await supabase
          .from("scans")
          .select("id", { count: "exact", head: true });
        scans = r.count || 0;
      } catch (e) {
        console.warn("[HQOverview] scans count failed:", e.message);
      }

      // Users count
      try {
        const r = await supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true });
        users = r.count || 0;
      } catch (e) {
        console.warn("[HQOverview] users count failed:", e.message);
      }

      // Loyalty points sum
      try {
        const r = await supabase
          .from("loyalty_transactions")
          .select("points")
          .in("transaction_type", [
            "EARNED",
            "earned",
            "EARNED_POINTS",
            "SCAN",
          ]);
        totalPoints = (r.data || []).reduce(
          (sum, t) => sum + (t.points || 0),
          0,
        );
      } catch (e) {
        console.warn("[HQOverview] loyalty sum failed:", e.message);
      }

      // Tenants count
      try {
        const r = await supabase
          .from("tenants")
          .select("id", { count: "exact", head: true });
        tenants = r.count || 0;
      } catch (e) {
        console.warn("[HQOverview] tenants count failed:", e.message);
      }

      // Inventory count (just count, no column-specific filter)
      try {
        const r = await supabase
          .from("inventory_items")
          .select("id", { count: "exact", head: true });
        inventoryItems = r.count || 0;
      } catch (e) {
        console.warn("[HQOverview] inventory count failed:", e.message);
      }

      // Recent scans (last 10)
      try {
        const r = await supabase
          .from("scans")
          .select("id, user_id, product_id, scan_date, source")
          .order("scan_date", { ascending: false })
          .limit(10);
        scansData = r.data || [];
      } catch (e) {
        console.warn("[HQOverview] recent scans failed:", e.message);
      }

      // 7-day scan count
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const r = await supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .gte("scan_date", sevenDaysAgo.toISOString());
        recentScanCount = r.count || 0;
      } catch (e) {
        console.warn("[HQOverview] 7-day scans failed:", e.message);
      }

      // ── Low stock — FIXED v1.2: use quantity_on_hand (not quantity) ──
      try {
        const r = await supabase
          .from("inventory_items")
          .select("id, name, sku, quantity_on_hand, reorder_level, unit")
          .eq("is_active", true)
          .lt("quantity_on_hand", 10)
          .order("quantity_on_hand", { ascending: true })
          .limit(5);
        if (!r.error) lowStockData = r.data || [];
      } catch {
        console.warn(
          "[HQOverview] low stock query failed — column name may differ",
        );
      }

      setStats({
        products,
        scans,
        users,
        loyaltyPoints: totalPoints,
        inventoryItems,
        tenants,
        recentScanCount,
      });
      setRecentScans(scansData);
      setLowStock(lowStockData);
    } catch (err) {
      console.error("[HQOverview] Fatal error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            border: `3px solid ${C.border}`,
            borderTopColor: C.primaryDark,
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <style>{`@keyframes protea-spin { to { transform: rotate(360deg); } }`}</style>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Loading HQ data…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#fdf2f2",
          border: "1px solid #fecaca",
          borderRadius: "2px",
          padding: "16px 20px",
          color: C.red,
          fontSize: "13px",
        }}
      >
        {error}
        <button
          onClick={fetchStats}
          style={{
            marginLeft: "12px",
            background: C.primaryDark,
            color: C.white,
            border: "none",
            borderRadius: "2px",
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <KPICard
          icon="📦"
          label="Products"
          value={stats.products}
          color={C.primaryDark}
        />
        <KPICard
          icon="📱"
          label="Total Scans"
          value={stats.scans}
          color={C.accentGreen}
        />
        <KPICard
          icon="📱"
          label="Scans (7 days)"
          value={stats.recentScanCount}
          color={C.accentGreen}
          sub="last 7 days"
        />
        <KPICard
          icon="👥"
          label="Users"
          value={stats.users}
          color={C.primaryMid}
        />
        <KPICard
          icon="⭐"
          label="Points Issued"
          value={stats.loyaltyPoints.toLocaleString()}
          color={C.gold}
        />
        <KPICard
          icon="🏪"
          label="Tenants"
          value={stats.tenants}
          color={C.primaryDark}
        />
      </div>

      {/* Two Column */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        {/* Recent Scans */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={sectionH}>Recent Scans</h3>
            <span style={badge}>{recentScans.length}</span>
          </div>
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {recentScans.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: C.muted,
                  fontSize: "13px",
                }}
              >
                No scans recorded yet
              </div>
            ) : (
              recentScans.map((scan, i) => (
                <div
                  key={scan.id}
                  style={{
                    padding: "10px 20px",
                    borderBottom:
                      i < recentScans.length - 1
                        ? `1px solid ${C.border}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: C.text, fontWeight: 500 }}>
                      Product:{" "}
                      {scan.product_id
                        ? scan.product_id.slice(0, 8) + "…"
                        : "—"}
                    </span>
                    {scan.source && (
                      <span
                        style={{
                          marginLeft: "8px",
                          background: "rgba(82,183,136,0.1)",
                          color: C.accentGreen,
                          padding: "1px 6px",
                          borderRadius: "2px",
                          fontSize: "9px",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        {scan.source}
                      </span>
                    )}
                  </div>
                  <span style={{ color: C.muted, fontSize: "11px" }}>
                    {formatTimeAgo(scan.scan_date)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock — FIXED v1.2: now displays quantity_on_hand */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={sectionH}>Low Stock Alerts</h3>
            {lowStock.length > 0 && (
              <span
                style={{
                  ...badge,
                  background: "rgba(192,57,43,0.1)",
                  color: C.red,
                }}
              >
                {lowStock.length}
              </span>
            )}
          </div>
          <div>
            {lowStock.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: C.muted,
                  fontSize: "13px",
                }}
              >
                <span
                  style={{
                    fontSize: "24px",
                    display: "block",
                    marginBottom: "8px",
                    opacity: 0.4,
                  }}
                >
                  ✅
                </span>
                All stock levels healthy
              </div>
            ) : (
              lowStock.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    padding: "10px 20px",
                    borderBottom:
                      i < lowStock.length - 1
                        ? `1px solid ${C.border}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: C.text, fontWeight: 500 }}>
                      {item.name || item.sku || "Unnamed"}
                    </span>
                    {item.sku && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "10px",
                          color: C.muted,
                          fontFamily: "monospace",
                        }}
                      >
                        {item.sku}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        color:
                          (item.quantity_on_hand || 0) === 0 ? C.red : C.gold,
                        fontWeight: 600,
                        fontSize: "13px",
                        fontFamily: "'Cormorant Garamond', serif",
                      }}
                    >
                      {item.quantity_on_hand ?? 0}
                    </span>
                    {item.unit && (
                      <span
                        style={{
                          marginLeft: "4px",
                          fontSize: "10px",
                          color: C.muted,
                        }}
                      >
                        {item.unit}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          padding: "20px 24px",
        }}
      >
        <h3 style={{ ...sectionH, marginBottom: "16px" }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <QA label="Admin Dashboard" href="/admin" icon="⚙️" />
          <QA label="QR Generator" href="/admin/qr" icon="📷" />
          <QA label="View Shop" href="/shop" icon="🛒" />
          <QA label="Loyalty Page" href="/loyalty" icon="⭐" />
        </div>
      </div>

      <div style={{ marginTop: "24px", textAlign: "right" }}>
        <button
          onClick={fetchStats}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            padding: "8px 16px",
            cursor: "pointer",
            fontFamily: "Jost, sans-serif",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          ↻ Refresh Data
        </button>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, color, sub }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "18px 20px",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <span style={{ fontSize: "14px" }}>{icon}</span>
        <span
          style={{
            color: C.muted,
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "32px",
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: C.muted, fontSize: "10px", marginTop: "4px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function QA({ label, href, icon }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: C.warmBg,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "8px 16px",
        fontFamily: "Jost, sans-serif",
        fontSize: "11px",
        fontWeight: 500,
        color: C.primaryDark,
        textDecoration: "none",
      }}
    >
      <span>{icon}</span> {label}
    </a>
  );
}

function formatTimeAgo(d) {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000),
    h = Math.floor(ms / 3600000),
    dy = Math.floor(ms / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (dy < 7) return `${dy}d ago`;
  return new Date(d).toLocaleDateString();
}

const sectionH = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: "16px",
  fontWeight: 300,
  color: "#1b4332",
  margin: 0,
};
const badge = {
  background: "rgba(82,183,136,0.1)",
  color: "#52b788",
  padding: "2px 8px",
  borderRadius: "2px",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
};
