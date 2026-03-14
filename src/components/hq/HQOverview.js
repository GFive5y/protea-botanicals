// src/components/hq/HQOverview.js — Protea Botanicals v1.7
// v1.7: Birthday KPI tiles — how many birthdays today + this week
// v1.6: Open tickets KPI + live USD/ZAR + clickable cards → onNavigate
// v1.5: Clickable KPI cards, clickable panel headers, USD/ZAR auto-refresh every 60s
// v1.4 FIXED: scans → scan_logs, scan_date → scanned_at
// v1.3 WP-H: ERP KPI tiles added

import { useState, useEffect, useCallback, useRef } from "react";
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
  orange: "#E65100",
  purple: "#6A1B9A",
};

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

export default function HQOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [erpStats, setErpStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // v1.7: birthday stats
  const [birthdayStats, setBirthdayStats] = useState({ today: 0, thisWeek: 0 });

  // ── USD/ZAR live state ──────────────────────────────────────────────────────
  const [fxRate, setFxRate] = useState(null);
  const [fxUpdatedAt, setFxUpdatedAt] = useState(null);
  const [fxRefreshing, setFxRefreshing] = useState(false);
  const [fxCountdown, setFxCountdown] = useState(60);
  const fxTimerRef = useRef(null);
  const fxCountRef = useRef(null);

  const fetchFx = useCallback(async (silent = false) => {
    if (!silent) setFxRefreshing(true);
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-fx-rate`);
      if (res.ok) {
        const json = await res.json();
        const rate = json?.usd_zar || json?.rate || null;
        if (rate) {
          setFxRate(parseFloat(rate));
          setFxUpdatedAt(new Date());
          setFxCountdown(60);
          setErpStats((prev) =>
            prev ? { ...prev, fxRate: parseFloat(rate) } : prev,
          );
          return;
        }
      }
    } catch (_) {}
    try {
      const r = await supabase
        .from("fx_rates")
        .select("rate, fetched_at")
        .eq("currency_pair", "USD/ZAR")
        .order("fetched_at", { ascending: false })
        .limit(1);
      if (r.data?.[0]?.rate) {
        setFxRate(parseFloat(r.data[0].rate));
        setFxUpdatedAt(new Date(r.data[0].fetched_at));
        setFxCountdown(60);
        setErpStats((prev) =>
          prev ? { ...prev, fxRate: parseFloat(r.data[0].rate) } : prev,
        );
      }
    } catch (_) {}
    if (!silent) setFxRefreshing(false);
    setFxRefreshing(false);
  }, []);

  useEffect(() => {
    fetchFx(false);
    fxCountRef.current = setInterval(() => {
      setFxCountdown((n) => {
        if (n <= 1) return 60;
        return n - 1;
      });
    }, 1000);
    fxTimerRef.current = setInterval(() => {
      fetchFx(true);
    }, 60000);
    return () => {
      clearInterval(fxTimerRef.current);
      clearInterval(fxCountRef.current);
    };
  }, [fetchFx]);

  // ── v1.7: Birthday stats fetch ──────────────────────────────────────────────
  const fetchBirthdayStats = useCallback(async () => {
    try {
      const now = new Date();
      const todayMonth = now.getMonth() + 1; // 1-12
      const todayDay = now.getDate();

      // Build 7-day window (month/day pairs)
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        weekDays.push({ month: d.getMonth() + 1, day: d.getDate() });
      }

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("date_of_birth")
        .not("date_of_birth", "is", null);

      if (!profiles) return;

      let todayCount = 0;
      let weekCount = 0;

      profiles.forEach(({ date_of_birth }) => {
        if (!date_of_birth) return;
        try {
          const dob = new Date(date_of_birth);
          const dobMonth = dob.getMonth() + 1;
          const dobDay = dob.getDate();
          if (dobMonth === todayMonth && dobDay === todayDay) todayCount++;
          if (weekDays.some((d) => d.month === dobMonth && d.day === dobDay))
            weekCount++;
        } catch (_) {}
      });

      setBirthdayStats({ today: todayCount, thisWeek: weekCount });
    } catch (err) {
      console.error("[HQOverview] Birthday stats error:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let products = 0,
        scans = 0,
        users = 0,
        totalPoints = 0,
        tenants = 0,
        recentScanCount = 0;
      let scansData = [],
        lowStockData = [];

      try {
        const r = await supabase
          .from("products")
          .select("id", { count: "exact", head: true });
        products = r.count || 0;
      } catch (_) {}
      try {
        const r = await supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true });
        users = r.count || 0;
      } catch (_) {}
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
        totalPoints = (r.data || []).reduce((s, t) => s + (t.points || 0), 0);
      } catch (_) {}
      try {
        const r = await supabase
          .from("tenants")
          .select("id", { count: "exact", head: true });
        tenants = r.count || 0;
      } catch (_) {}
      try {
        const r = await supabase
          .from("scan_logs")
          .select("*", { count: "exact", head: true });
        scans = r.count || 0;
      } catch (_) {}
      try {
        const r = await supabase
          .from("scan_logs")
          .select(
            "id,user_id,qr_code,qr_type,scanned_at,scan_outcome,points_awarded,ip_city",
          )
          .order("scanned_at", { ascending: false })
          .limit(10);
        scansData = r.data || [];
      } catch (_) {}
      try {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const r = await supabase
          .from("scan_logs")
          .select("id", { count: "exact", head: true })
          .gte("scanned_at", d.toISOString());
        recentScanCount = r.count || 0;
      } catch (_) {}
      try {
        const r = await supabase
          .from("inventory_items")
          .select("id,name,sku,quantity_on_hand,reorder_level,unit")
          .eq("is_active", true)
          .lt("quantity_on_hand", 10)
          .order("quantity_on_hand", { ascending: true })
          .limit(5);
        if (!r.error) lowStockData = r.data || [];
      } catch (_) {}

      let openTickets = 0;
      try {
        const r = await supabase
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "pending_reply"]);
        openTickets = r.count || 0;
      } catch (_) {}

      setStats({
        products,
        scans,
        users,
        loyaltyPoints: totalPoints,
        tenants,
        recentScanCount,
        openTickets,
      });
      setRecentScans(scansData);
      setLowStock(lowStockData);

      let reorderCount = 0,
        avgMarginPct = null,
        activeImportPOs = 0;
      const currentFx = fxRate || 18.5;

      try {
        const r = await supabase
          .from("inventory_items")
          .select("id,quantity_on_hand,reorder_level")
          .eq("is_active", true)
          .gt("reorder_level", 0);
        reorderCount = (r.data || []).filter(
          (i) => parseFloat(i.quantity_on_hand) <= parseFloat(i.reorder_level),
        ).length;
      } catch (_) {}
      try {
        const [pricesRes, cogsRes, suppRes] = await Promise.all([
          supabase
            .from("product_pricing")
            .select("product_cogs_id,channel,sell_price_zar")
            .eq("channel", "retail"),
          supabase
            .from("product_cogs")
            .select(
              "id,hardware_item_id,hardware_qty,terpene_item_id,terpene_qty_g,distillate_input_id,distillate_qty_ml,packaging_input_id,packaging_qty,labour_input_id,labour_qty,other_cost_zar",
            ),
          supabase
            .from("supplier_products")
            .select("id,unit_price_usd,category"),
        ]);
        const prices = pricesRes.data || [],
          recipes = cogsRes.data || [],
          suppProds = suppRes.data || [];
        const margins = [];
        prices.forEach((p) => {
          if (!p.sell_price_zar) return;
          const recipe = recipes.find((r) => r.id === p.product_cogs_id);
          if (!recipe) return;
          const hw = suppProds.find((s) => s.id === recipe.hardware_item_id);
          const tp = suppProds.find((s) => s.id === recipe.terpene_item_id);
          const hwCost = hw
            ? parseFloat(recipe.hardware_qty || 1) *
              parseFloat(hw.unit_price_usd) *
              currentFx
            : 0;
          const tpCost = tp
            ? parseFloat(recipe.terpene_qty_g || 0) *
              (parseFloat(tp.unit_price_usd) / 50) *
              currentFx
            : 0;
          const cogs = hwCost + tpCost + parseFloat(recipe.other_cost_zar || 0);
          const margin =
            ((parseFloat(p.sell_price_zar) - cogs) /
              parseFloat(p.sell_price_zar)) *
            100;
          if (isFinite(margin)) margins.push(margin);
        });
        if (margins.length > 0)
          avgMarginPct = margins.reduce((s, m) => s + m, 0) / margins.length;
      } catch (_) {}
      try {
        const r = await supabase
          .from("purchase_orders")
          .select("id", { count: "exact", head: true })
          .not(
            "po_status",
            "in",
            '("received","complete","cancelled","draft")',
          );
        activeImportPOs = r.count || 0;
      } catch (_) {}

      setErpStats({
        reorderCount,
        avgMarginPct,
        activeImportPOs,
        fxRate: currentFx,
      });

      // v1.7: fetch birthday stats in parallel
      await fetchBirthdayStats();
    } catch (err) {
      console.error("[HQOverview] Fatal:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [fxRate, fetchBirthdayStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
        <style>{`@keyframes protea-spin{to{transform:rotate(360deg)}}`}</style>
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
  if (error)
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

  const marginColour =
    erpStats?.avgMarginPct >= 35
      ? "#2E7D32"
      : erpStats?.avgMarginPct >= 20
        ? C.orange
        : C.red;
  const nav = (tab) => onNavigate && onNavigate(tab);

  return (
    <div>
      {/* ── PLATFORM KPI CARDS ── */}
      <SectionLabel label="Platform" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <KPICard
          icon="📦"
          label="Products"
          value={stats.products}
          color={C.primaryDark}
          onClick={() => nav("costing")}
          hint="→ Costing"
        />
        <KPICard
          icon="📱"
          label="Total Scans"
          value={stats.scans}
          color={C.accentGreen}
          onClick={() => nav("analytics")}
          hint="→ Analytics"
        />
        <KPICard
          icon="📱"
          label="Scans (7 days)"
          value={stats.recentScanCount}
          color={C.accentGreen}
          onClick={() => nav("analytics")}
          hint="→ Analytics"
          sub="last 7 days"
        />
        <KPICard
          icon="👥"
          label="Users"
          value={stats.users}
          color={C.primaryMid}
          onClick={() => (window.location.href = "/admin")}
          hint="→ Admin"
        />
        <KPICard
          icon="⭐"
          label="Points Issued"
          value={stats.loyaltyPoints.toLocaleString()}
          color={C.gold}
          onClick={() => nav("loyalty")}
          hint="→ Loyalty"
        />
        <KPICard
          icon="🏪"
          label="Tenants"
          value={stats.tenants}
          color={C.primaryDark}
        />
        <KPICard
          icon="🎫"
          label="Open Tickets"
          value={stats.openTickets || 0}
          color={stats.openTickets > 0 ? C.red : C.accentGreen}
          onClick={() => (window.location.href = "/admin")}
          hint="→ Admin Support"
        />
      </div>

      {/* ── v1.7: BIRTHDAY KPI CARDS ── */}
      <SectionLabel label="Birthdays" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <KPICard
          icon="🎂"
          label="Birthdays Today"
          value={birthdayStats.today}
          color={birthdayStats.today > 0 ? C.purple : C.muted}
          sub={
            birthdayStats.today > 0
              ? "bonus points sent at 06:00"
              : "none today"
          }
        />
        <KPICard
          icon="🎉"
          label="Birthdays This Week"
          value={birthdayStats.thisWeek}
          color={birthdayStats.thisWeek > 0 ? C.gold : C.muted}
          sub="next 7 days"
        />
      </div>

      {/* ── IMPORT ERP TILES ── */}
      {erpStats && (
        <>
          <SectionLabel label="Import ERP" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: "14px",
              marginBottom: "28px",
            }}
          >
            <ERPCard
              icon="🔔"
              label="Reorder Alerts"
              value={erpStats.reorderCount}
              color={erpStats.reorderCount > 0 ? C.red : C.accentGreen}
              sub={
                erpStats.reorderCount > 0 ? "items need reorder" : "all stocked"
              }
              onClick={() => nav("reorder")}
              alert={erpStats.reorderCount > 0}
            />
            <ERPCard
              icon="📊"
              label="Avg Gross Margin"
              value={
                erpStats.avgMarginPct !== null
                  ? `${erpStats.avgMarginPct.toFixed(1)}%`
                  : "—"
              }
              color={erpStats.avgMarginPct !== null ? marginColour : C.muted}
              sub="retail channel avg"
              onClick={() => nav("pricing")}
            />
            <ERPCard
              icon="✈️"
              label="Import POs"
              value={erpStats.activeImportPOs}
              color="#2c4a6e"
              sub="in transit / pending"
              onClick={() => nav("procurement")}
            />

            {/* LIVE USD/ZAR TILE */}
            <div
              style={{
                background: "#E8F5E9",
                border: "1px solid #c8e6c9",
                borderTop: "3px solid #2E7D32",
                borderRadius: "2px",
                padding: "18px 20px",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "14px" }}>💱</span>
                  <span
                    style={{
                      color: C.muted,
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    USD / ZAR
                  </span>
                </div>
                <button
                  onClick={() => fetchFx(false)}
                  disabled={fxRefreshing}
                  title="Refresh rate now"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: fxRefreshing ? "default" : "pointer",
                    fontSize: "14px",
                    opacity: fxRefreshing ? 0.4 : 1,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  {fxRefreshing ? "⏳" : "↻"}
                </button>
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: "28px",
                  fontWeight: 300,
                  color: "#2E7D32",
                  lineHeight: 1,
                }}
              >
                {fxRate
                  ? `R${fxRate.toFixed(4)}`
                  : erpStats.fxRate
                    ? `R${erpStats.fxRate.toFixed(4)}`
                    : "Loading…"}
              </div>
              <div
                style={{
                  color: C.muted,
                  fontSize: "10px",
                  marginTop: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  {fxUpdatedAt ? `updated ${fmtAgo(fxUpdatedAt)}` : "live rate"}
                </span>
                <span
                  style={{
                    background: "rgba(46,125,50,0.12)",
                    color: "#2E7D32",
                    padding: "1px 6px",
                    borderRadius: "2px",
                    fontWeight: 700,
                    fontSize: "9px",
                  }}
                >
                  ↻ {fxCountdown}s
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── RECENT SCANS + LOW STOCK ── */}
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
            onClick={() => nav("analytics")}
            title="View full analytics"
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.warmBg)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <h3
              style={{ ...sH, display: "flex", alignItems: "center", gap: 8 }}
            >
              Recent Scans
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: C.accentGreen,
                  fontFamily: "Jost,sans-serif",
                }}
              >
                → Analytics
              </span>
            </h3>
            <span style={badge}>{recentScans.length}</span>
          </div>
          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
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
                      {scan.qr_code ? scan.qr_code.slice(0, 20) + "…" : "—"}
                    </span>
                    {scan.qr_type && (
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
                        {scan.qr_type}
                      </span>
                    )}
                    {scan.ip_city && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "10px",
                          color: C.muted,
                        }}
                      >
                        📍{scan.ip_city}
                      </span>
                    )}
                  </div>
                  <span style={{ color: C.muted, fontSize: "11px" }}>
                    {fmtAgo(scan.scanned_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            onClick={() => nav("supply-chain")}
            title="View supply chain"
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.warmBg)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <h3
              style={{ ...sH, display: "flex", alignItems: "center", gap: 8 }}
            >
              Low Stock Alerts
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: lowStock.length > 0 ? C.red : C.accentGreen,
                  fontFamily: "Jost,sans-serif",
                }}
              >
                → Supply Chain
              </span>
            </h3>
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
                    cursor: "pointer",
                  }}
                  onClick={() => nav("supply-chain")}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#fff8f8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
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
                        fontFamily: "'Cormorant Garamond',serif",
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

      {/* ── QUICK ACTIONS ── */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          padding: "20px 24px",
        }}
      >
        <h3 style={{ ...sH, marginBottom: "8px" }}>Quick Actions</h3>
        <SectionLabel label="Platform" small />
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <QA label="Admin Dashboard" href="/admin" icon="⚙️" />
          <QA label="QR Generator" href="/admin/qr" icon="📷" />
          <QA label="View Shop" href="/shop" icon="🛒" />
          <QA label="Loyalty Page" href="/loyalty" icon="⭐" />
          <QA label="Leaderboard" href="/leaderboard" icon="🏆" />
        </div>
        {onNavigate && (
          <>
            <SectionLabel label="Import ERP" small />
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <QABtn
                label="Procurement"
                icon="🛒"
                onClick={() => nav("procurement")}
              />
              <QABtn label="Costing" icon="🧮" onClick={() => nav("costing")} />
              <QABtn label="Pricing" icon="💰" onClick={() => nav("pricing")} />
              <QABtn label="P&L" icon="📉" onClick={() => nav("pl")} />
              <QABtn label="Loyalty" icon="💎" onClick={() => nav("loyalty")} />
              <QABtn
                label="Reorder Alerts"
                icon="🔔"
                onClick={() => nav("reorder")}
                highlight={erpStats?.reorderCount > 0}
              />
            </div>
          </>
        )}
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
            fontFamily: "Jost,sans-serif",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          ↻ Refresh All Data
        </button>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SectionLabel({ label, small }) {
  return (
    <div
      style={{
        fontSize: small ? "9px" : "10px",
        fontWeight: 700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: C.muted,
        marginBottom: small ? "10px" : "12px",
      }}
    >
      {label}
    </div>
  );
}

function KPICard({ icon, label, value, color, sub, onClick, hint }) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      title={hint}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "18px 20px",
        borderTop: `3px solid ${color}`,
        cursor: clickable ? "pointer" : "default",
        transition: "box-shadow 0.15s, transform 0.1s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
        {clickable && hint && (
          <span
            style={{ fontSize: "9px", color, fontWeight: 600, opacity: 0.7 }}
          >
            ↗
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond',serif",
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
      {hint && (
        <div
          style={{
            fontSize: "9px",
            color,
            opacity: 0.6,
            marginTop: "6px",
            fontWeight: 500,
            fontFamily: "Jost,sans-serif",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function ERPCard({ icon, label, value, color, sub, onClick, alert }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.white,
        border: `1px solid ${alert ? "#ffcdd2" : C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: "2px",
        padding: "18px 20px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
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
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: "32px",
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ color: C.muted, fontSize: "10px", marginTop: "4px" }}>
        {sub}
      </div>
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
        fontFamily: "Jost,sans-serif",
        fontSize: "11px",
        fontWeight: 500,
        color: C.primaryDark,
        textDecoration: "none",
      }}
    >
      <span>{icon}</span>
      {label}
    </a>
  );
}

function QABtn({ label, icon, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: highlight ? "#FFEBEE" : C.warmBg,
        border: `1px solid ${highlight ? "#ffcdd2" : C.border}`,
        borderRadius: "2px",
        padding: "8px 16px",
        fontFamily: "Jost,sans-serif",
        fontSize: "11px",
        fontWeight: 500,
        color: highlight ? C.red : C.primaryDark,
        cursor: "pointer",
      }}
    >
      <span>{icon}</span>
      {label}
      {highlight ? " ⚠" : ""}
    </button>
  );
}

function fmtAgo(d) {
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

const sH = {
  fontFamily: "'Cormorant Garamond',serif",
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
