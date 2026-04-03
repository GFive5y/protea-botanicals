// src/components/hq/HQTradingDashboard.js — v2.0
// WP-DAILY-OPS Session C — Tier 1 Foundation Fixes
//
// CHANGES v2.0:
//   1. TIMEZONE: All date boundaries now SAST-correct (UTC+2) — fixes midnight mismatch
//   2. AUTO-REFRESH: 5-minute interval with live countdown in header
//   3. CATEGORY FIX: Resolves inventory_item_id → category from inventory_items
//      when product_metadata lacks category (sandbox data + older POS sales)
//   4. EOD STATUS WIDGET: Shows today's cash-up status with link to Cash-Up tab
//   5. PROJECTED REVENUE: Real-time daily revenue projection based on trading pace
//
// Critical: status = 'paid' always (NOT 'completed')
// Rule 0F:  tenantId on every query
// LL-190:   EOD thresholds from tenant_config.settings (never hardcoded)

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

// ── SAST timezone helpers (UTC+2) ─────────────────────────────────────────────
// CRITICAL FIX: All date boundaries must be SAST-aware.
// SAST midnight = 22:00 UTC on the previous calendar day.
// Without this, a sale at 23:30 SAST falls into "tomorrow" UTC.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000; // UTC+2

function nowSAST() {
  // Returns a Date object where getUTCHours() = current SAST hour
  return new Date(Date.now() + SAST_OFFSET_MS);
}
function dayStartSAST(daysAgo = 0) {
  const sast = nowSAST();
  // Construct midnight SAST as a UTC timestamp
  const utcMidnightSAST = Date.UTC(
    sast.getUTCFullYear(),
    sast.getUTCMonth(),
    sast.getUTCDate() - daysAgo,
    0,
    0,
    0,
    0,
  );
  // Subtract SAST offset to get the UTC moment that equals SAST midnight
  return new Date(utcMidnightSAST - SAST_OFFSET_MS);
}
function dayEndSAST(daysAgo = 0) {
  return new Date(dayStartSAST(daysAgo).getTime() + 24 * 60 * 60 * 1000);
}
function monthStartSAST() {
  const sast = nowSAST();
  const utcFirst = Date.UTC(
    sast.getUTCFullYear(),
    sast.getUTCMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  return new Date(utcFirst - SAST_OFFSET_MS);
}
function todayStrSAST() {
  const sast = nowSAST();
  const y = sast.getUTCFullYear();
  const m = String(sast.getUTCMonth() + 1).padStart(2, "0");
  const d = String(sast.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function sastHour(isoString) {
  // Convert a UTC ISO string to the SAST hour (0-23)
  return (new Date(isoString).getUTCHours() + 2) % 24;
}
function formatDateLabel(d) {
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ── Chunked .in() helper ──────────────────────────────────────────────────────
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

// ── Category resolver — fetches from inventory_items when metadata lacks it ───
// Fixes sandbox data (metadata = {sandbox:true, inventory_item_id:"..."}) and
// older POS sales that may not have stored category in product_metadata.
async function resolveCategories(items) {
  const needsResolution = items.filter(
    (i) =>
      !i.product_metadata?.category && i.product_metadata?.inventory_item_id,
  );
  if (needsResolution.length === 0) return items;

  const invIds = [
    ...new Set(
      needsResolution.map((i) => i.product_metadata.inventory_item_id),
    ),
  ];
  const CHUNK = 50;
  const invMap = {};
  for (let j = 0; j < invIds.length; j += CHUNK) {
    const { data } = await supabase
      .from("inventory_items")
      .select("id, category")
      .in("id", invIds.slice(j, j + CHUNK));
    (data || []).forEach((ii) => {
      invMap[ii.id] = ii.category;
    });
  }

  return items.map((item) => {
    if (!item.product_metadata?.category) {
      const invId = item.product_metadata?.inventory_item_id;
      if (invId && invMap[invId]) {
        return {
          ...item,
          product_metadata: {
            ...item.product_metadata,
            category: invMap[invId],
          },
        };
      }
    }
    return item;
  });
}

// ── Aggregate helpers ─────────────────────────────────────────────────────────
function sumRevenue(orders) {
  return orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
}
function buildHourly(todayOrds, yestOrds) {
  // FIXED: Uses SAST hours (8:00–20:00 SAST) — not UTC hours
  const hours = Array.from({ length: 13 }, (_, i) => {
    const h = i + 8; // 08:00–20:00 SAST
    return { hour: `${h}:00`, today: 0, yesterday: 0 };
  });
  todayOrds.forEach((o) => {
    const h = sastHour(o.created_at); // SAST hour 0-23
    const idx = h - 8;
    if (idx >= 0 && idx < 13) hours[idx].today += Number(o.total) || 0;
  });
  yestOrds.forEach((o) => {
    const h = sastHour(o.created_at);
    const idx = h - 8;
    if (idx >= 0 && idx < 13) hours[idx].yesterday += Number(o.total) || 0;
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
function buildSparkData(orders30) {
  const ts = dayStartSAST(0);
  const map = {};
  orders30.forEach((o) => {
    const day = o.created_at.slice(0, 10);
    map[day] = (map[day] || 0) + (Number(o.total) || 0);
  });
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(ts);
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return { v: map[key] || 0 };
  });
}

// ── Label maps ────────────────────────────────────────────────────────────────
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
const PAY_LABELS = {
  cash: "💵 Cash",
  card: "💳 Card",
  online: "📱 Online",
  payfast: "🔗 PayFast",
};
const CAT_COLOURS = [
  T.accentMid,
  "#2563EB",
  "#9333EA",
  "#D97706",
  "#DC2626",
  "#0891B2",
  "#16A34A",
];

// ── EOD status helpers ─────────────────────────────────────────────────────────
const EOD_STATUS = {
  balanced: {
    icon: "✅",
    label: "Balanced",
    colour: T.success,
    bg: T.successBg,
    bd: T.successBd,
  },
  flagged: {
    icon: "⚠️",
    label: "Flagged",
    colour: T.warning,
    bg: T.warningBg,
    bd: T.warningBd,
  },
  escalated: {
    icon: "🚨",
    label: "Escalated",
    colour: T.danger,
    bg: T.dangerBg,
    bd: T.dangerBd,
  },
};

// ── Auto-refresh interval (seconds) ───────────────────────────────────────────
const REFRESH_INTERVAL_S = 300; // 5 minutes

// ── Projected revenue constants ───────────────────────────────────────────────
const STORE_OPEN_HOUR = 8; // 08:00 SAST
const STORE_CLOSE_HOUR = 20; // 20:00 SAST

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HQTradingDashboard() {
  usePageContext("hq-trading", null); // ProteaAI context — MANDATORY, first call

  const { tenantId } = useTenant();

  // ── Core data state ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [todayOrders, setTodayOrders] = useState([]);
  const [yesterdayOrders, setYesterdayOrders] = useState([]);
  const [lastWeekRevenue, setLastWeekRevenue] = useState(0);
  const [bestDayRevenue, setBestDayRevenue] = useState(0);
  const [bestDayDate, setBestDayDate] = useState(null);
  const [todayItems, setTodayItems] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState({ earned: 0, redeemed: 0 });
  const [isSandbox, setIsSandbox] = useState(false);
  const [sparkData30, setSparkData30] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── EOD status ────────────────────────────────────────────────────────────
  const [eodData, setEodData] = useState(null);
  // { cashup: {status, variance, created_at} | null, sessionOpen: bool }

  // ── Auto-refresh countdown ────────────────────────────────────────────────
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_S);
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false);
  const [topSellersMode, setTopSellersMode] = useState("qty");

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    // All date windows are SAST-correct
    const ts = dayStartSAST(0);
    const te = dayEndSAST(0);
    const ys = dayStartSAST(1);
    const ye = dayEndSAST(1);
    const lws = dayStartSAST(8);
    const lwe = dayEndSAST(8);
    const ms = monthStartSAST();
    const thirtyAgo = dayStartSAST(29);
    const todayStr = todayStrSAST();

    try {
      const [
        todayRes,
        yesterdayRes,
        lastWeekRes,
        monthRes,
        thirtyRes,
        sandboxRes,
        earnedRes,
        redeemedRes,
        eodRes,
        sesRes,
      ] = await Promise.all([
        // Today's orders
        supabase
          .from("orders")
          .select("id, total, items_count, payment_method, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", ts.toISOString())
          .lt("created_at", te.toISOString()),

        // Yesterday's orders
        supabase
          .from("orders")
          .select("id, total, payment_method, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", ys.toISOString())
          .lt("created_at", ye.toISOString()),

        // Last week same day
        supabase
          .from("orders")
          .select("total")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", lws.toISOString())
          .lt("created_at", lwe.toISOString()),

        // Month to date (for best day calc)
        supabase
          .from("orders")
          .select("total, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", ms.toISOString())
          .lt("created_at", te.toISOString()),

        // 30-day sparkline
        supabase
          .from("orders")
          .select("total, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", thirtyAgo.toISOString())
          .lt("created_at", te.toISOString()),

        // Sandbox check
        supabase
          .from("orders")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("notes", "SANDBOX")
          .limit(1),

        // Loyalty earned today
        supabase
          .from("loyalty_transactions")
          .select("points")
          .eq("tenant_id", tenantId)
          .ilike("transaction_type", "earned")
          .gte("created_at", ts.toISOString())
          .lt("created_at", te.toISOString()),

        // Loyalty redeemed today
        supabase
          .from("loyalty_transactions")
          .select("points")
          .eq("tenant_id", tenantId)
          .ilike("transaction_type", "redeemed")
          .gte("created_at", ts.toISOString())
          .lt("created_at", te.toISOString()),

        // EOD cash-up for today (LL-190: uses cashup_date, not created_at)
        supabase
          .from("eod_cash_ups")
          .select("status, variance, created_at")
          .eq("tenant_id", tenantId)
          .eq("cashup_date", todayStr)
          .maybeSingle(),

        // Open POS session for today
        supabase
          .from("pos_sessions")
          .select("id, opening_float")
          .eq("tenant_id", tenantId)
          .eq("session_date", todayStr)
          .eq("status", "open")
          .maybeSingle(),
      ]);

      const tod = todayRes.data || [];
      const yest = yesterdayRes.data || [];
      const month = monthRes.data || [];
      const thirty = thirtyRes.data || [];

      setTodayOrders(tod);
      setYesterdayOrders(yest);
      setLastWeekRevenue(sumRevenue(lastWeekRes.data || []));
      setIsSandbox((sandboxRes.data?.length || 0) > 0);
      setSparkData30(buildSparkData(thirty));

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

      // Fetch + resolve item categories
      const orderIds = tod.map((o) => o.id);
      let items = await fetchItemsForOrders(orderIds);
      items = await resolveCategories(items); // ← NEW: fix "Other" for sandbox data
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
      setLoyaltyData({ earned, redeemed });

      // EOD status
      setEodData({
        cashup: eodRes.data || null,
        sessionOpen: !!sesRes.data,
      });

      setLastRefresh(new Date());
    } catch (err) {
      console.error("[HQTradingDashboard] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Auto-refresh: 5-minute countdown, auto-reload ─────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          load();
          return REFRESH_INTERVAL_S;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [load]);

  const handleRefresh = useCallback(() => {
    setCountdown(REFRESH_INTERVAL_S);
    load();
  }, [load]);

  // ── Derived values ─────────────────────────────────────────────────────────
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

  // Projected daily revenue based on trading pace
  const currentSASTHour = nowSAST().getUTCHours();
  const hoursElapsed = Math.max(0.5, currentSASTHour - STORE_OPEN_HOUR);
  const projectedRevenue =
    currentSASTHour >= STORE_OPEN_HOUR &&
    currentSASTHour < STORE_CLOSE_HOUR &&
    todayRevenue > 0
      ? Math.round(
          (todayRevenue / hoursElapsed) * (STORE_CLOSE_HOUR - STORE_OPEN_HOUR),
        )
      : null;

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

  // ── Navigate to another tab via URL ──────────────────────────────────────
  const navToTab = (tab) => {
    window.history.pushState({}, "", `/hq?tab=${tab}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

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

      {/* ── Page header ── */}
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
          <span style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
            ↻ {fmtCountdown(countdown)}
          </span>
          <button
            onClick={handleRefresh}
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
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI strip (5 cards — revenue, transactions, avg basket, units, projected) ── */}
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
        {projectedRevenue !== null && (
          <KPICard
            label="Projected Daily"
            value={zar(projectedRevenue)}
            sub={`At current pace · ${STORE_CLOSE_HOUR - currentSASTHour}h remaining`}
            deltaVal={null}
            accent
          />
        )}
      </div>

      {/* ── Comparison row ── */}
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
          isBest={todayRevenue >= bestDayRevenue && todayRevenue > 0}
        />
      </div>

      {/* ── Loyalty strip ── */}
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

      {/* ── EOD Status widget ── */}
      {eodData && (
        <EODStatusWidget
          data={eodData}
          onNavigateCashUp={() => navToTab("hq-eod")}
          onNavigatePOS={() => navToTab("hq-pos")}
        />
      )}

      {/* ── Hourly chart (SAST hours) ── */}
      <div style={{ ...sSection, marginBottom: 16 }}>
        <div
          style={{
            ...sSectionHead,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            Revenue by hour{" "}
            <span
              style={{
                fontWeight: 400,
                color: T.ink400,
                fontSize: 10,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              (SAST)
            </span>
          </span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <LegendDot colour={T.accentMid} label="Today" />
            <LegendDot colour={T.ink150} label="Yesterday" />
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

      {/* ── Top sellers + Payment split ── */}
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

      {/* ── Category breakdown ── */}
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

      {/* ── History panel ── */}
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
// EOD STATUS WIDGET
// ─────────────────────────────────────────────────────────────────────────────
function EODStatusWidget({ data, onNavigateCashUp, onNavigatePOS }) {
  const { cashup, sessionOpen } = data;

  // Determine display state
  let icon, message, colour, bg, bd, actionLabel, onAction;

  if (cashup) {
    const s = EOD_STATUS[cashup.status] || EOD_STATUS.balanced;
    icon = s.icon;
    colour = s.colour;
    bg = s.bg;
    bd = s.bd;
    const variance = Number(cashup.variance);
    message = `Day closed — ${s.label}${variance !== 0 ? ` · ${variance > 0 ? "+" : ""}R${Math.abs(variance).toLocaleString("en-ZA")} variance` : ""}`;
    actionLabel = "View cash-up";
    onAction = onNavigateCashUp;
  } else if (sessionOpen) {
    icon = "🟢";
    colour = T.success;
    bg = T.successBg;
    bd = T.successBd;
    message = "Till open · cash-up pending";
    actionLabel = "Close day →";
    onAction = onNavigateCashUp;
  } else {
    icon = "⚪";
    colour = T.ink500;
    bg = T.ink075;
    bd = T.ink150;
    message = "No session open today";
    actionLabel = "Open till →";
    onAction = onNavigatePOS;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
        padding: "10px 14px",
        background: bg,
        border: `1px solid ${bd}`,
        borderRadius: "4px",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colour,
            fontFamily: "'Inter',sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          CASH-UP
        </span>
        <span
          style={{
            fontSize: 12,
            color: colour,
            fontFamily: "'Inter',sans-serif",
            marginLeft: 10,
          }}
        >
          {message}
        </span>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          style={{
            padding: "4px 12px",
            background: "transparent",
            border: `1px solid ${colour}`,
            borderRadius: "3px",
            color: colour,
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Inter',sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, deltaVal, accent }) {
  return (
    <div
      style={{
        ...sKPICard,
        ...(accent
          ? {
              background: T.accentLit,
              border: `1px solid ${T.accentBd}`,
            }
          : {}),
      }}
    >
      <div style={{ ...sKPILabel, ...(accent ? { color: T.accentMid } : {}) }}>
        {label}
      </div>
      <div style={{ ...sKPIValue, ...(accent ? { color: T.accent } : {}) }}>
        {value}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}
      >
        {deltaVal !== null && (
          <DeltaBadge value={deltaVal} suffix="%" decimals={1} />
        )}
        <span style={{ ...sKPISub, ...(accent ? { color: T.accentMid } : {}) }}>
          {sub}
        </span>
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

function LegendDot({ colour, label }) {
  return (
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
          background: colour,
          borderRadius: 2,
        }}
      />
      {label}
    </span>
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
// HISTORY PANEL
// ─────────────────────────────────────────────────────────────────────────────
const HISTORY_PRESETS = [
  { label: "Yesterday", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "This month", days: 0, monthToDate: true },
];

function HistoryPanel({ tenantId, onClose }) {
  const [preset, setPreset] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [topMode, setTopMode] = useState("qty");

  const fetchHistory = useCallback(
    async (presetIdx) => {
      if (!tenantId) return;
      setLoading(true);
      const p = HISTORY_PRESETS[presetIdx];
      const ts = p.monthToDate ? monthStartSAST() : dayStartSAST(p.days);
      const te = dayEndSAST(0);

      const { data: ords } = await supabase
        .from("orders")
        .select("id, total, payment_method, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("created_at", ts.toISOString())
        .lt("created_at", te.toISOString());

      const orderIds = (ords || []).map((o) => o.id);
      let its = await fetchItemsForOrders(orderIds);
      its = await resolveCategories(its); // resolve categories for history too
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
                        <td style={sTd}>{s.name}</td>
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

