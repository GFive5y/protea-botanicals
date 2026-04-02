// src/components/hq/HQTradingDashboard.js — v1.0
// WP-DAILY-OPS Session B — Phase 1
// Daily trading intelligence dashboard for NuAi / Medi Recreational
//
// Spec:    WP-DAILY-OPS_v2_0.md
// Pattern: ReorderPanel.js — standalone, no props, reads tenantId internally
//
// Files read before build (LL-185, session v173):
//   HQDashboard.js    SHA: a751fe3d  — nav wiring confirmed
//   useNavConfig.js   SHA: 2af18ac0  — HQ_PAGES confirmed
//   HQStock.js        v3.1           — T token system confirmed
//   POSScreen.js      v1.0           — movement_type: 'sale_pos', product_metadata.category
//   SparkLine.js                     — data:[{v}], positive, width, height
//   DeltaBadge.js                    — value, suffix, decimals, forcePositive
//
// CRITICAL: all queries use status = 'paid' (NOT 'completed' — that value does not exist)
// Rule 0F:  tenantId on every query
// LL-185:   all touched files read this session

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { usePageContext } from "../../hooks/usePageContext";
import { SparkLine, DeltaBadge } from "../viz";

// ── Design tokens — mirrors HQStock.js v3.1 exactly ──────────────────────────
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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
};

// ── Style helpers ─────────────────────────────────────────────────────────────
const sKPICard = {
  background: T.ink050,
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  padding: "14px 16px",
  flex: 1,
  minWidth: 130,
};
const sKPIValue = {
  fontSize: "22px",
  fontFamily: T.mono,
  fontWeight: 400,
  fontVariantNumeric: "tabular-nums",
  color: T.ink900,
  marginBottom: "4px",
  lineHeight: 1.2,
};
const sKPILabel = {
  fontSize: "10px",
  fontFamily: T.font,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
};
const sKPISub = {
  fontSize: "11px",
  fontFamily: T.font,
  color: T.ink500,
  marginTop: "4px",
};
const sTh = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
  fontFamily: T.font,
  background: T.ink050,
  whiteSpace: "nowrap",
};
const sTd = {
  padding: "9px 12px",
  borderBottom: `1px solid ${T.ink150}`,
  fontSize: "13px",
  fontFamily: T.font,
  verticalAlign: "middle",
  color: T.ink900,
};
const sSection = {
  background: "#fff",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  padding: "16px",
  marginBottom: "16px",
};
const sSectionHead = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.ink500,
  marginBottom: "12px",
  fontFamily: T.font,
};

// ── Formatters ────────────────────────────────────────────────────────────────
function zar(n) {
  const num = Number(n) || 0;
  return `R${num.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function pct(num, total) {
  if (!total) return "0%";
  return `${Math.round((num / total) * 100)}%`;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function dayStart(daysAgo = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}
function dayEnd(daysAgo = 0) {
  const d = dayStart(daysAgo);
  d.setDate(d.getDate() + 1);
  return d;
}
function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatDateLabel(d) {
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Chunked .in() helper ─────────────────────────────────────────────────────
// Supabase has a limit on .in() clause size — chunk large arrays
async function fetchItemsForOrders(orderIds) {
  if (!orderIds || orderIds.length === 0) return [];
  const CHUNK = 50;
  const results = [];
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const chunk = orderIds.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("order_items")
      .select("product_name, quantity, line_total, product_metadata")
      .in("order_id", chunk);
    if (data) results.push(...data);
  }
  return results;
}

// ── Aggregate helpers ─────────────────────────────────────────────────────────
function sumRevenue(orders) {
  return orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
}
function buildHourly(todayOrds, yestOrds) {
  const hours = Array.from({ length: 12 }, (_, i) => {
    const h = i + 8; // 08:00 – 19:00
    return { hour: `${h}:00`, today: 0, yesterday: 0 };
  });
  todayOrds.forEach((o) => {
    const h = new Date(o.created_at).getHours();
    const idx = h - 8;
    if (idx >= 0 && idx < 12) hours[idx].today += Number(o.total) || 0;
  });
  yestOrds.forEach((o) => {
    const h = new Date(o.created_at).getHours();
    const idx = h - 8;
    if (idx >= 0 && idx < 12) hours[idx].yesterday += Number(o.total) || 0;
  });
  return hours;
}
function buildTopSellers(items, mode = "qty") {
  const map = {};
  items.forEach((item) => {
    const name = item.product_name || "Unknown";
    if (!map[name]) map[name] = { qty: 0, revenue: 0 };
    map[name].qty += Number(item.quantity) || 0;
    map[name].revenue += Number(item.line_total) || 0;
  });
  return Object.entries(map)
    .sort((a, b) =>
      mode === "qty" ? b[1].qty - a[1].qty : b[1].revenue - a[1].revenue,
    )
    .slice(0, 10)
    .map(([name, d]) => ({ name, ...d }));
}
function buildCategoryBreakdown(items) {
  const map = {};
  items.forEach((item) => {
    const cat =
      item.product_metadata?.category ||
      item.product_metadata?.loyalty_category ||
      "other";
    if (!map[cat]) map[cat] = { revenue: 0, qty: 0 };
    map[cat].revenue += Number(item.line_total) || 0;
    map[cat].qty += Number(item.quantity) || 0;
  });
  return Object.entries(map)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([cat, d]) => ({ cat, ...d }));
}
function buildPaymentSplit(orders) {
  const map = {};
  orders.forEach((o) => {
    const m = o.payment_method || "other";
    if (!map[m]) map[m] = { count: 0, revenue: 0 };
    map[m].count++;
    map[m].revenue += Number(o.total) || 0;
  });
  return Object.entries(map)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([method, d]) => ({ method, ...d }));
}
function buildSparkData(orders30, todayStart) {
  const map = {};
  orders30.forEach((o) => {
    const day = o.created_at.slice(0, 10);
    map[day] = (map[day] || 0) + (Number(o.total) || 0);
  });
  // Build 30 days from 29 days ago to today
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return { v: map[key] || 0 };
  });
}

// ── CATEGORY LABELS — human readable ─────────────────────────────────────────
const CAT_LABELS = {
  flower: "Flower",
  concentrate: "Concentrates",
  edible: "Edibles",
  accessory: "Accessories",
  hardware: "Hardware",
  raw_material: "Raw Material",
  finished_product: "Finished Product",
  nutrients: "Nutrients",
  substrate: "Substrate",
  seeds: "Seeds",
  wellness: "Wellness",
  vape: "Vapes",
  preroll: "Pre-rolls",
  hash: "Hash",
  other: "Other",
};

// ── PAYMENT LABEL ─────────────────────────────────────────────────────────────
const PAY_LABELS = {
  cash: "💵 Cash",
  card: "💳 Card",
  online: "📱 Online",
  payfast: "🔗 PayFast",
};

// ── CATEGORY COLOURS (for breakdown bars) ────────────────────────────────────
const CAT_COLOURS = [
  T.accentMid,
  "#2563EB",
  "#9333EA",
  "#D97706",
  "#DC2626",
  "#0891B2",
  "#16A34A",
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HQTradingDashboard() {
  usePageContext("hq-trading", null); // ProteaAI tab context — MANDATORY, first call

  const { tenantId } = useTenant();

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [todayOrders, setTodayOrders] = useState([]);
  const [yesterdayOrders, setYesterdayOrders] = useState([]);
  const [lastWeekRevenue, setLastWeekRevenue] = useState(0);
  const [bestDayRevenue, setBestDayRevenue] = useState(0);
  const [bestDayDate, setBestDayDate] = useState(null);
  const [todayItems, setTodayItems] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState({
    earned: 0,
    redeemed: 0,
    newMembers: 0,
  });
  const [isSandbox, setIsSandbox] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [topSellersMode, setTopSellersMode] = useState("qty"); // 'qty' | 'revenue'
  const [sparkData30, setSparkData30] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── Stable date refs — recalculated on each load ──────────────────────────
  const today0 = useMemo(() => dayStart(0), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch everything ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const ts = dayStart(0);
    const te = dayEnd(0);
    const ys = dayStart(1);
    const ye = dayEnd(1);
    const lws = dayStart(8); // last week same day start
    const lwe = dayEnd(8); // last week same day end
    const ms = monthStart();
    const thirtyAgo = dayStart(29);

    try {
      // Parallel fetches — all use status = 'paid'
      const [
        todayRes,
        yesterdayRes,
        lastWeekRes,
        monthRes,
        thirtyRes,
        sandboxRes,
        earnedRes,
        redeemedRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total, items_count, payment_method, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", ts.toISOString())
          .lt("created_at", te.toISOString()),

        supabase
          .from("orders")
          .select("id, total, payment_method, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", ys.toISOString())
          .lt("created_at", ye.toISOString()),

        supabase
          .from("orders")
          .select("total")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", lws.toISOString())
          .lt("created_at", lwe.toISOString()),

        supabase
          .from("orders")
          .select("total, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", ms.toISOString())
          .lt("created_at", te.toISOString()),

        supabase
          .from("orders")
          .select("total, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", thirtyAgo.toISOString())
          .lt("created_at", te.toISOString()),

        supabase
          .from("orders")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("notes", "SANDBOX")
          .limit(1),

        supabase
          .from("loyalty_transactions")
          .select("points")
          .eq("tenant_id", tenantId)
          .ilike("type", "earned")
          .gte("created_at", ts.toISOString())
          .lt("created_at", te.toISOString()),

        supabase
          .from("loyalty_transactions")
          .select("points")
          .eq("tenant_id", tenantId)
          .eq("type", "redeemed")
          .gte("created_at", ts.toISOString())
          .lt("created_at", te.toISOString()),
      ]);

      const tod = todayRes.data || [];
      const yest = yesterdayRes.data || [];
      const month = monthRes.data || [];
      const thirty = thirtyRes.data || [];

      setTodayOrders(tod);
      setYesterdayOrders(yest);
      setLastWeekRevenue(sumRevenue(lastWeekRes.data || []));
      setIsSandbox((sandboxRes.data?.length || 0) > 0);

      // Best day this month
      const byDay = {};
      month.forEach((o) => {
        const day = o.created_at.slice(0, 10);
        byDay[day] = (byDay[day] || 0) + (Number(o.total) || 0);
      });
      const bestEntry = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
      if (bestEntry) {
        setBestDayRevenue(bestEntry[1]);
        setBestDayDate(bestEntry[0]);
      }

      // 30-day sparkline data
      setSparkData30(buildSparkData(thirty, ts));

      // Order items for top sellers and category breakdown
      const orderIds = tod.map((o) => o.id);
      const items = await fetchItemsForOrders(orderIds);
      setTodayItems(items);

      // Loyalty
      const earned = (earnedRes.data || []).reduce(
        (s, t) => s + (Number(t.points) || 0),
        0,
      );
      const redeemed = (redeemedRes.data || []).reduce(
        (s, t) => s + (Number(t.points) || 0),
        0,
      );
      setLoyaltyData({ earned, redeemed, newMembers: 0 });

      setLastRefresh(new Date());
    } catch (err) {
      console.error("[HQTradingDashboard] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const todayRevenue = useMemo(() => sumRevenue(todayOrders), [todayOrders]);
  const todayTxCount = todayOrders.length;
  const todayAvgBasket = todayTxCount > 0 ? todayRevenue / todayTxCount : 0;
  const todayUnits = useMemo(
    () => todayItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    [todayItems],
  );
  const todaySkus = useMemo(
    () => new Set(todayItems.map((i) => i.product_name)).size,
    [todayItems],
  );

  const yestRevenue = useMemo(
    () => sumRevenue(yesterdayOrders),
    [yesterdayOrders],
  );
  const yestTxCount = yesterdayOrders.length;
  const yestAvgBasket = yestTxCount > 0 ? yestRevenue / yestTxCount : 0;

  const revDelta =
    yestRevenue > 0 ? ((todayRevenue - yestRevenue) / yestRevenue) * 100 : 0;
  const txDelta =
    yestTxCount > 0 ? ((todayTxCount - yestTxCount) / yestTxCount) * 100 : 0;
  const basketDelta =
    yestAvgBasket > 0
      ? ((todayAvgBasket - yestAvgBasket) / yestAvgBasket) * 100
      : 0;

  const lastWeekDelta =
    lastWeekRevenue > 0
      ? ((todayRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
      : 0;
  const bestDayPct =
    bestDayRevenue > 0 ? (todayRevenue / bestDayRevenue) * 100 : 0;

  const hourlyData = useMemo(
    () => buildHourly(todayOrders, yesterdayOrders),
    [todayOrders, yesterdayOrders],
  );
  const topSellers = useMemo(
    () => buildTopSellers(todayItems, topSellersMode),
    [todayItems, topSellersMode],
  );
  const catBreakdown = useMemo(
    () => buildCategoryBreakdown(todayItems),
    [todayItems],
  );
  const paymentSplit = useMemo(
    () => buildPaymentSplit(todayOrders),
    [todayOrders],
  );

  const sparkPositive =
    sparkData30.length >= 2
      ? sparkData30[sparkData30.length - 1].v >=
        sparkData30[sparkData30.length - 2].v
      : true;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          fontFamily: T.font,
          color: T.ink400,
        }}
      >
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          Loading trading data…
        </div>
        <div style={{ fontSize: 11, color: T.ink300 }}>
          Querying orders + items + loyalty
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.font, color: T.ink900, paddingBottom: 40 }}>
      {/* ── Sandbox banner ── */}
      {isSandbox && (
        <div
          style={{
            background: T.warningBg,
            border: `1px solid ${T.warningBd}`,
            borderRadius: "4px",
            padding: "10px 14px",
            marginBottom: "16px",
            fontSize: "12px",
            color: T.warning,
            fontFamily: T.font,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 700 }}>🧪 SANDBOX MODE</span>— Showing
          seeded development data, not real sales. Run{" "}
          <code
            style={{
              background: T.ink075,
              padding: "1px 6px",
              borderRadius: 3,
              fontSize: 11,
            }}
          >
            DELETE FROM orders WHERE notes = 'SANDBOX'
          </code>{" "}
          before go-live.
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: T.ink900,
              fontFamily: T.font,
            }}
          >
            Trading Performance
          </h2>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12,
              color: T.ink500,
              fontFamily: T.font,
            }}
          >
            {formatDateLabel(new Date())}
            {lastRefresh && (
              <span style={{ marginLeft: 10, color: T.ink300 }}>
                Updated{" "}
                {lastRefresh.toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* 30-day sparkline */}
          {sparkData30.length >= 2 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  color: T.ink400,
                  fontFamily: T.font,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                30d
              </span>
              <SparkLine
                data={sparkData30}
                positive={sparkPositive}
                width={80}
                height={28}
              />
              <DeltaBadge value={revDelta} suffix="%" decimals={1} />
            </div>
          )}
          <button
            onClick={load}
            style={{
              padding: "6px 14px",
              background: "transparent",
              border: `1px solid ${T.accentBd}`,
              borderRadius: "3px",
              color: T.accentMid,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────── */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
      >
        <KPICard
          label="Today's Revenue"
          value={zar(todayRevenue)}
          sub={`${yestRevenue > 0 ? (todayRevenue > yestRevenue ? "↑" : "↓") : "—"} ${zar(Math.abs(todayRevenue - yestRevenue))} vs yesterday`}
          deltaVal={revDelta}
        />
        <KPICard
          label="Transactions"
          value={`${todayTxCount}`}
          sub={`${yestTxCount > 0 ? (todayTxCount > yestTxCount ? "↑" : "↓") + " " + Math.abs(todayTxCount - yestTxCount) : "—"} vs yesterday`}
          deltaVal={txDelta}
        />
        <KPICard
          label="Avg Basket"
          value={zar(todayAvgBasket)}
          sub={`${yestAvgBasket > 0 ? (todayAvgBasket >= yestAvgBasket ? "↑" : "↓") : "—"} ${zar(Math.abs(todayAvgBasket - yestAvgBasket))} vs yesterday`}
          deltaVal={basketDelta}
        />
        <KPICard
          label="Units Sold"
          value={`${todayUnits}`}
          sub={`${todaySkus} SKU${todaySkus !== 1 ? "s" : ""} sold today`}
          deltaVal={null}
        />
      </div>

      {/* ── Comparison row ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          padding: "10px 14px",
          background: T.ink075,
          borderRadius: "4px",
          border: `1px solid ${T.ink150}`,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <CompStat
          label="vs last week same day"
          delta={lastWeekDelta}
          amount={zar(Math.abs(todayRevenue - lastWeekRevenue))}
          up={todayRevenue >= lastWeekRevenue}
        />
        <span style={{ color: T.ink150, fontSize: 16 }}>|</span>
        <CompStat
          label={
            bestDayDate
              ? `vs best day (${new Date(bestDayDate + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })})`
              : "best day this month"
          }
          pctOf={bestDayPct}
          bestVal={zar(bestDayRevenue)}
          isBest={todayRevenue >= bestDayRevenue}
        />
      </div>

      {/* ── Loyalty strip ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 16,
          padding: "10px 16px",
          background: T.accentLit,
          border: `1px solid ${T.accentBd}`,
          borderRadius: "4px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.accentMid,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: T.font,
          }}
        >
          💎 Loyalty Today
        </span>
        <LoyaltyKPI
          label="Points earned"
          value={loyaltyData.earned.toLocaleString("en-ZA")}
        />
        <LoyaltyKPI
          label="Redeemed"
          value={loyaltyData.redeemed.toLocaleString("en-ZA")}
        />
        {loyaltyData.earned === 0 && loyaltyData.redeemed === 0 && (
          <span
            style={{ fontSize: 11, color: T.accentMid, fontFamily: T.font }}
          >
            No loyalty activity yet today
          </span>
        )}
      </div>

      {/* ── Hourly chart ────────────────────────────────────────────── */}
      <div style={{ ...sSection, marginBottom: 16 }}>
        <div
          style={{
            ...sSectionHead,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Revenue by hour</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: T.ink500,
                fontFamily: T.font,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  background: T.accentMid,
                  borderRadius: 2,
                }}
              />{" "}
              Today
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: T.ink500,
                fontFamily: T.font,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  background: T.ink150,
                  borderRadius: 2,
                }}
              />{" "}
              Yesterday
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={hourlyData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barSize={14}
            barGap={2}
          >
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fontFamily: T.font, fill: T.ink500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: T.mono, fill: T.ink500 }}
              tickFormatter={(v) =>
                v === 0 ? "" : `R${v >= 1000 ? Math.round(v / 1000) + "k" : v}`
              }
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                fontFamily: T.font,
                fontSize: 12,
                background: T.ink050,
                border: `1px solid ${T.ink150}`,
                borderRadius: 4,
                boxShadow: "none",
              }}
              formatter={(v, name) => [
                zar(v),
                name === "today" ? "Today" : "Yesterday",
              ]}
              labelStyle={{ color: T.ink500, fontSize: 11 }}
            />
            <Bar dataKey="yesterday" fill={T.ink150} radius={[2, 2, 0, 0]} />
            <Bar dataKey="today" fill={T.accentMid} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Two-column row: top sellers + payment split ─────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Top sellers */}
        <div style={sSection}>
          <div
            style={{
              ...sSectionHead,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span>Top sellers today</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <ModeToggle
                active={topSellersMode === "qty"}
                onClick={() => setTopSellersMode("qty")}
                label="Units"
              />
              <ModeToggle
                active={topSellersMode === "revenue"}
                onClick={() => setTopSellersMode("revenue")}
                label="Revenue"
              />
              <button
                onClick={() => setHistoryOpen(true)}
                style={{
                  padding: "3px 10px",
                  background: "transparent",
                  border: `1px solid ${T.accentBd}`,
                  borderRadius: "3px",
                  color: T.accentMid,
                  fontSize: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: T.font,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginLeft: 4,
                }}
              >
                📅 History
              </button>
            </div>
          </div>
          {topSellers.length === 0 ? (
            <EmptyState msg="No sales recorded today" />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...sTh, width: 20 }}>#</th>
                  <th style={sTh}>Product</th>
                  <th style={{ ...sTh, textAlign: "right" }}>
                    {topSellersMode === "qty" ? "Units" : "Revenue"}
                  </th>
                  <th style={{ ...sTh, textAlign: "right" }}>
                    {topSellersMode === "qty" ? "Revenue" : "Units"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {topSellers.slice(0, 5).map((s, i) => (
                  <tr
                    key={s.name}
                    style={{ background: i % 2 === 0 ? "#fff" : T.ink050 }}
                  >
                    <td style={{ ...sTd, color: T.ink300, fontSize: 11 }}>
                      {i + 1}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        maxWidth: 160,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.name}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.mono,
                        fontWeight: 600,
                      }}
                    >
                      {topSellersMode === "qty" ? s.qty : zar(s.revenue)}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.mono,
                        color: T.ink500,
                      }}
                    >
                      {topSellersMode === "qty" ? zar(s.revenue) : s.qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payment split */}
        <div style={sSection}>
          <div style={sSectionHead}>Payment methods</div>
          {paymentSplit.length === 0 ? (
            <EmptyState msg="No sales recorded today" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paymentSplit.map(({ method, count, revenue }) => {
                const barPct =
                  todayRevenue > 0 ? (revenue / todayRevenue) * 100 : 0;
                return (
                  <div key={method}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        fontSize: 12,
                        fontFamily: T.font,
                      }}
                    >
                      <span style={{ color: T.ink700 }}>
                        {PAY_LABELS[method] || method}
                      </span>
                      <span style={{ fontFamily: T.mono, color: T.ink900 }}>
                        {zar(revenue)}{" "}
                        <span style={{ color: T.ink400, fontWeight: 400 }}>
                          ({pct(revenue, todayRevenue)})
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: T.ink150,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${barPct}%`,
                          background:
                            method === "cash"
                              ? "#059669"
                              : method === "card"
                                ? "#2563EB"
                                : T.accentMid,
                          borderRadius: 3,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        marginTop: 2,
                        fontFamily: T.font,
                      }}
                    >
                      {count} transaction{count !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Category breakdown ──────────────────────────────────────── */}
      {catBreakdown.length > 0 && (
        <div style={sSection}>
          <div style={sSectionHead}>Category breakdown — today</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {catBreakdown.map(({ cat, revenue, qty }, i) => {
              const barPct =
                todayRevenue > 0 ? (revenue / todayRevenue) * 100 : 0;
              return (
                <div
                  key={cat}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: T.font,
                      color: T.ink500,
                      width: 110,
                      flexShrink: 0,
                    }}
                  >
                    {CAT_LABELS[cat] || cat}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: T.ink150,
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barPct}%`,
                        background: CAT_COLOURS[i % CAT_COLOURS.length],
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: T.mono,
                      fontSize: 11,
                      color: T.ink900,
                      width: 70,
                      textAlign: "right",
                    }}
                  >
                    {zar(revenue)}
                  </span>
                  <span
                    style={{
                      fontFamily: T.font,
                      fontSize: 10,
                      color: T.ink400,
                      width: 36,
                      textAlign: "right",
                    }}
                  >
                    {pct(revenue, todayRevenue)}
                  </span>
                  <span
                    style={{
                      fontFamily: T.font,
                      fontSize: 10,
                      color: T.ink500,
                      width: 50,
                      textAlign: "right",
                    }}
                  >
                    {qty} unit{qty !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── History panel ───────────────────────────────────────────── */}
      {historyOpen && (
        <HistoryPanel
          tenantId={tenantId}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, deltaVal }) {
  return (
    <div style={sKPICard}>
      <div style={sKPILabel}>{label}</div>
      <div style={sKPIValue}>{value}</div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}
      >
        {deltaVal !== null && (
          <DeltaBadge value={deltaVal} suffix="%" decimals={1} />
        )}
        <span style={sKPISub}>{sub}</span>
      </div>
    </div>
  );
}

function CompStat({ label, delta, amount, up, pctOf, bestVal, isBest }) {
  const isComparison = delta !== undefined;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontFamily: T.font,
      }}
    >
      <span style={{ color: T.ink500 }}>{label}:</span>
      {isComparison ? (
        <>
          <span style={{ color: up ? T.success : T.danger, fontWeight: 600 }}>
            {up ? "↑" : "↓"} {amount}
          </span>
          <DeltaBadge value={delta} suffix="%" decimals={1} />
        </>
      ) : (
        <>
          <span
            style={{ fontFamily: T.mono, color: T.ink900, fontWeight: 600 }}
          >
            {Math.round(pctOf)}%
          </span>
          <span style={{ color: T.ink400 }}>of {bestVal}</span>
          {isBest && (
            <span
              style={{
                fontSize: 10,
                background: T.accentLit,
                color: T.accentMid,
                padding: "1px 6px",
                borderRadius: 3,
                fontWeight: 700,
              }}
            >
              NEW BEST
            </span>
          )}
        </>
      )}
    </div>
  );
}

function LoyaltyKPI({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontSize: 10,
          fontFamily: T.font,
          color: T.accentMid,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontFamily: T.mono,
          fontWeight: 600,
          color: T.accent,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ModeToggle({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "2px 8px",
        background: active ? T.accentMid : "transparent",
        border: `1px solid ${active ? T.accentMid : T.ink150}`,
        borderRadius: "3px",
        color: active ? "#fff" : T.ink500,
        fontSize: "10px",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: T.font,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ msg }) {
  return (
    <div
      style={{
        padding: "24px 0",
        textAlign: "center",
        fontSize: 12,
        color: T.ink400,
        fontFamily: T.font,
      }}
    >
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY PANEL — slide-in overlay with date range selector
// ─────────────────────────────────────────────────────────────────────────────
const HISTORY_PRESETS = [
  { label: "Yesterday", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "This month", days: 0, monthToDate: true },
];

function HistoryPanel({ tenantId, onClose }) {
  const [preset, setPreset] = useState(1); // index into HISTORY_PRESETS
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [topMode, setTopMode] = useState("qty");

  const fetchHistory = useCallback(
    async (presetIdx) => {
      if (!tenantId) return;
      setLoading(true);
      const p = HISTORY_PRESETS[presetIdx];
      const ts = p.monthToDate ? monthStart() : dayStart(p.days);
      const te = dayEnd(0);

      const { data: ords } = await supabase
        .from("orders")
        .select("id, total, payment_method, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "paid") // 'paid' not 'completed'
        .gte("created_at", ts.toISOString())
        .lt("created_at", te.toISOString());

      const orderIds = (ords || []).map((o) => o.id);
      const its = await fetchItemsForOrders(orderIds);
      setOrders(ords || []);
      setItems(its);
      setLoading(false);
    },
    [tenantId],
  );

  useEffect(() => {
    fetchHistory(preset);
  }, [preset, fetchHistory]);

  const histRevenue = sumRevenue(orders);
  const histTopSellers = useMemo(
    () => buildTopSellers(items, topMode),
    [items, topMode],
  );
  const histCatBreakdown = useMemo(
    () => buildCategoryBreakdown(items),
    [items],
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 500,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(720px, 95vw)",
          background: "#fff",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          fontFamily: T.font,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: T.ink900,
              fontFamily: T.font,
            }}
          >
            Historical Performance
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: T.ink400,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Preset buttons */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {HISTORY_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPreset(i)}
              style={{
                padding: "6px 14px",
                borderRadius: "3px",
                border: `1px solid ${preset === i ? T.accentMid : T.ink150}`,
                background: preset === i ? T.accentMid : "transparent",
                color: preset === i ? "#fff" : T.ink500,
                fontSize: "12px",
                fontWeight: preset === i ? 600 : 400,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: T.ink400,
              fontSize: 13,
            }}
          >
            Loading…
          </div>
        ) : (
          <>
            {/* Period summary */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <HistKPI label="Revenue" value={zar(histRevenue)} />
              <HistKPI label="Transactions" value={`${orders.length}`} />
              <HistKPI
                label="Avg basket"
                value={zar(orders.length > 0 ? histRevenue / orders.length : 0)}
              />
              <HistKPI
                label="Units sold"
                value={`${items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}`}
              />
            </div>

            {/* Top sellers */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  ...sSectionHead,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  Top sellers — {HISTORY_PRESETS[preset].label.toLowerCase()}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <ModeToggle
                    active={topMode === "qty"}
                    onClick={() => setTopMode("qty")}
                    label="Units"
                  />
                  <ModeToggle
                    active={topMode === "revenue"}
                    onClick={() => setTopMode("revenue")}
                    label="Revenue"
                  />
                </div>
              </div>
              {histTopSellers.length === 0 ? (
                <EmptyState msg="No sales in this period" />
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...sTh, width: 28 }}>#</th>
                      <th style={sTh}>Product</th>
                      <th style={{ ...sTh, textAlign: "right" }}>Units</th>
                      <th style={{ ...sTh, textAlign: "right" }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histTopSellers.map((s, i) => (
                      <tr
                        key={s.name}
                        style={{ background: i % 2 === 0 ? "#fff" : T.ink050 }}
                      >
                        <td style={{ ...sTd, color: T.ink300, fontSize: 11 }}>
                          {i + 1}
                        </td>
                        <td style={{ ...sTd }}>{s.name}</td>
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.mono,
                          }}
                        >
                          {s.qty}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.mono,
                            fontWeight: 600,
                          }}
                        >
                          {zar(s.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Category breakdown */}
            {histCatBreakdown.length > 0 && (
              <div>
                <div style={sSectionHead}>
                  Category breakdown —{" "}
                  {HISTORY_PRESETS[preset].label.toLowerCase()}
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {histCatBreakdown.map(({ cat, revenue, qty }, i) => {
                    const barPct =
                      histRevenue > 0 ? (revenue / histRevenue) * 100 : 0;
                    return (
                      <div
                        key={cat}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: T.font,
                            color: T.ink500,
                            width: 110,
                            flexShrink: 0,
                          }}
                        >
                          {CAT_LABELS[cat] || cat}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            background: T.ink150,
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${barPct}%`,
                              background: CAT_COLOURS[i % CAT_COLOURS.length],
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: T.mono,
                            fontSize: 11,
                            color: T.ink900,
                            width: 70,
                            textAlign: "right",
                          }}
                        >
                          {zar(revenue)}
                        </span>
                        <span
                          style={{
                            fontFamily: T.font,
                            fontSize: 10,
                            color: T.ink400,
                            width: 36,
                            textAlign: "right",
                          }}
                        >
                          {pct(revenue, histRevenue)}
                        </span>
                        <span
                          style={{
                            fontFamily: T.font,
                            fontSize: 10,
                            color: T.ink500,
                            width: 50,
                            textAlign: "right",
                          }}
                        >
                          {qty} units
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HistKPI({ label, value }) {
  return (
    <div
      style={{
        background: T.ink050,
        border: `1px solid ${T.ink150}`,
        borderRadius: "4px",
        padding: "10px 14px",
        minWidth: 120,
      }}
    >
      <div style={{ ...sKPILabel, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: "18px",
          fontFamily: T.mono,
          fontWeight: 400,
          color: T.ink900,
        }}
      >
        {value}
      </div>
    </div>
  );
}
