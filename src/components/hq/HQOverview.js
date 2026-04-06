// src/components/hq/HQOverview.js — v4.0 — WP-VISUAL: revenue hero + delta badges
// v3.1 — WP-THEME-2: Inter font
// v3.0 — WP-THEME: Unified design system applied
// v2.1 — WP-GUIDE-C: wire overview context to WorkflowGuide

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import { ChartCard, ChartTooltip, SparkLine, DeltaBadge } from "../viz";
import { PRODUCT_WORLDS, worldForItem } from "./ProductWorlds";

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

// ─── Design tokens (mirrors src/theme.js) ───────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
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
  ink400: "#474747",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
  shadowCard: "0 1px 3px rgba(0,0,0,0.07)",
  display: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 36,
    fontWeight: 300,
    letterSpacing: "-0.03em",
    fontVariantNumeric: "tabular-nums",
  },
  title: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 22,
    fontWeight: 400,
    letterSpacing: "-0.01em",
  },
  heading: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 16,
    fontWeight: 600,
  },
  kpi: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 24,
    fontWeight: 400,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  kpiSm: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 18,
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
  },
  body: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 13,
    fontWeight: 400,
  },
  label: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
  },
  caption: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 11,
    fontWeight: 400,
  },
  data: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 12,
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
  },
};

// ── Chart colour palette — Indigo Intelligence ──────────────────────────────
const CHART = {
  primary:    "#6366F1",
  secondary:  "#F472B6",
  tertiary:   "#06B6D4",
  quaternary: "#A78BFA",
  neutral:    "#94A3B8",
  grid:       "#E2E8F0",
  axis:       "#94A3B8",
  cat: ["#6366F1","#F472B6","#06B6D4","#A78BFA","#94A3B8"],
};

// ── SA Public Holidays 2025–2026 (ISO date → name) ───────────────────────────
const SA_PUBLIC_HOLIDAYS = {
  "2025-01-01": "New Year's Day",
  "2025-03-21": "Human Rights Day",
  "2025-04-18": "Good Friday",
  "2025-04-21": "Family Day",
  "2025-04-27": "Freedom Day",
  "2025-04-28": "Freedom Day (observed)",
  "2025-05-01": "Workers' Day",
  "2025-06-16": "Youth Day",
  "2025-08-09": "National Women's Day",
  "2025-09-24": "Heritage Day",
  "2025-12-16": "Day of Reconciliation",
  "2025-12-25": "Christmas Day",
  "2025-12-26": "Day of Goodwill",
  "2026-01-01": "New Year's Day",
  "2026-03-21": "Human Rights Day",
  "2026-04-03": "Good Friday",
  "2026-04-06": "Family Day",
  "2026-04-27": "Freedom Day",
  "2026-05-01": "Workers' Day",
  "2026-06-16": "Youth Day",
  "2026-08-09": "National Women's Day",
  "2026-08-10": "National Women's Day (observed)",
  "2026-09-24": "Heritage Day",
  "2026-12-16": "Day of Reconciliation",
  "2026-12-25": "Christmas Day",
  "2026-12-26": "Day of Goodwill",
};

const DONUT_COLOURS = CHART.cat;

// ─── WorkflowGuide content ───────────────────────────────────────────────────
const GUIDE_STEPS = [
  {
    number: 1,
    label: "Supply Chain",
    desc: "Add suppliers, create POs, receive stock. Raw materials enter inventory here.",
    status: "required",
  },
  {
    number: 2,
    label: "Production",
    desc: "Create batches, run production. Finished products deduct raw materials and add to finished goods.",
    status: "required",
  },
  {
    number: 3,
    label: "Pricing",
    desc: "Set sell_price per product. Without sell_price > R0 the product will NOT appear in the shop.",
    status: "required",
  },
  {
    number: 4,
    label: "Distribution",
    desc: "Ship finished goods to wholesale partners via the Distribution tab.",
    status: "optional",
  },
  {
    number: 5,
    label: "Monitor Daily",
    desc: "Check Comms for messages, Fraud for flagged accounts, and Reorder alerts for low stock.",
    status: "required",
  },
];
const GUIDE_DATAFLOW = [
  {
    direction: "in",
    from: "Purchase Orders received",
    to: "inventory_items (raw materials +)",
    note: "Triggered by Receive action on a PO",
  },
  {
    direction: "in",
    from: "Production Run completed",
    to: "inventory_items (finished goods +, raw materials −)",
    note: "HQ → Production → New Production Run",
  },
  {
    direction: "in",
    from: "Customer QR Scan",
    to: "scan_logs + loyalty_transactions + customer_messages",
    note: "Auto: tier_upgrade and streak_bonus written to customer inbox",
  },
  {
    direction: "out",
    from: "sell_price set > R0",
    to: "Product visible in customer shop",
    note: "Also requires is_active = true and quantity_on_hand > 0",
  },
  {
    direction: "out",
    from: "Admin reply in Comms",
    to: "customer_messages (outbound) + WhatsApp",
    note: "Realtime: inbox-{userId} channel fires immediately",
  },
  {
    direction: "out",
    from: "Loyalty Schema applied",
    to: "All pts_ and mult_ fields updated live",
    note: "Next scan/purchase reads new config instantly",
  },
];
const GUIDE_WARNINGS = [
  "sell_price must be > R0 AND is_active = true AND quantity_on_hand > 0 for a product to appear in the shop.",
  "Twilio token rotation is pending — WhatsApp notifications are currently inactive.",
  "NO updated_at column in loyalty_config — never include it in update() calls.",
  "NO created_at column in batches — always ORDER BY production_date.",
  "customer_messages uses .body field. ticket_messages uses .content field. Never swap these.",
  "hq-production is the ONLY production tab. The legacy Production tab was removed in v3.7.",
  "Notifications tab = SMS delivery log only. It is NOT a comms channel.",
];
const GUIDE_TIPS = [
  "Apply a loyalty schema first (Conservative / Standard / Aggressive) to get a clean baseline.",
  "Check the Fraud tab daily. anomaly_score > 70 requires review.",
  "The FX rate updates every 60 seconds. All COGS calculations use this rate automatically.",
  "The Comms tile turns red when there are open tickets or unread messages.",
  "Production tile shows finished goods with quantity < 5 — at risk of going out of stock.",
];

// ─── Main component ──────────────────────────────────────────────────────────
export default function HQOverview({ onNavigate }) {
  const ctx = usePageContext("overview", null);
  const { tenantId, industryProfile } = useTenant();
  const isCannabisRetail =
    industryProfile === "cannabis_retail" ||
    industryProfile === "cannabis_dispensary";

  // Cannabis retail: stock intelligence state
  const [cannabisStock, setCannabisStock] = useState(null);
  const [cannabisPOs, setCannabisPOs] = useState(null);

  const [scanTrend, setScanTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [qrTypeDist, setQrTypeDist] = useState([]);
  const [weeklySpark, setWeeklySpark] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [erpStats, setErpStats] = useState(null);
  const [productionStats, setProductionStats] = useState(null);
  const [fraudStats, setFraudStats] = useState(null);
  const [plStats, setPlStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [birthdayStats, setBirthdayStats] = useState({ today: 0, thisWeek: 0 });
  const [fxRate, setFxRate] = useState(null);
  const [fxUpdatedAt, setFxUpdatedAt] = useState(null);
  const [fxRefreshing, setFxRefreshing] = useState(false);
  const [fxCountdown, setFxCountdown] = useState(60);
  const [fxYesterday, setFxYesterday] = useState(null);
  const [fxRate30d, setFxRate30d] = useState(null);
  const [scanDelta, setScanDelta] = useState(null); // % vs prior 7 days
  const [revDelta, setRevDelta] = useState(null); // % vs prior month
  const [selectedWorld, setSelectedWorld] = useState(null); // drill-down
  const [todaySummary, setTodaySummary] = useState(null);
  const [todayPayments, setTodayPayments] = useState(null);
  const fxTimerRef = useRef(null);
  const fxCountRef = useRef(null);

  const fetchFx = useCallback(async (silent = false) => {
    if (!silent) setFxRefreshing(true);
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-fx-rate`);
      if (res.ok) {
        const json = await res.json();
        const rate = json?.usd_zar || json?.rate || null;
        const yesterday = json?.usd_zar_yesterday || null;
        if (yesterday) setFxYesterday(parseFloat(yesterday));
        const rate30d = json?.usd_zar_30d || null;
        if (rate30d) setFxRate30d(parseFloat(rate30d));
        if (rate) {
          setFxRate(parseFloat(rate));
          setFxUpdatedAt(new Date());
          setFxCountdown(60);
          setErpStats((prev) =>
            prev ? { ...prev, fxRate: parseFloat(rate) } : prev,
          );

          if (!silent) setFxRefreshing(false);
          return;
        }
      }
    } catch (_) {}
    try {
      const r = await supabase
        .from("fx_rates")
        .select("rate,fetched_at")
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
  }, []);

  useEffect(() => {
    fetchFx(false);
    fxCountRef.current = setInterval(
      () => setFxCountdown((n) => (n <= 1 ? 60 : n - 1)),
      1000,
    );
    fxTimerRef.current = setInterval(() => fetchFx(true), 60000);
    return () => {
      clearInterval(fxTimerRef.current);
      clearInterval(fxCountRef.current);
    };
  }, [fetchFx]);


  const fetchBirthdayStats = useCallback(async () => {
    try {
      const now = new Date();
      const todayM = now.getMonth() + 1,
        todayD = now.getDate();
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        return { month: d.getMonth() + 1, day: d.getDate() };
      });
      const { data } = await supabase
        .from("user_profiles")
        .select("date_of_birth")
        .not("date_of_birth", "is", null);
      let todayCount = 0,
        weekCount = 0;
      (data || []).forEach(({ date_of_birth }) => {
        try {
          const dob = new Date(date_of_birth);
          const m = dob.getMonth() + 1,
            d = dob.getDate();
          if (m === todayM && d === todayD) todayCount++;
          if (weekDays.some((w) => w.month === m && w.day === d)) weekCount++;
        } catch (_) {}
      });
      setBirthdayStats({ today: todayCount, thisWeek: weekCount });
    } catch (_) {}
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
        recentScanCount = 0,
        scanLast30 = 0,
        pointsLast7 = 0,
        pointsLast30 = 0;
      let scansData = [],
        lowStockData = [];

      try {
        const r = await supabase
          .from("product_cogs")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);
        products = r.count || 0;
      } catch (_) {}
      try {
        const r = await supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true });
        users = r.count || 0;
      } catch (_) {}
      try {
        const now = new Date();
        const d7pts = new Date(); d7pts.setDate(now.getDate() - 7);
        const d30pts = new Date(); d30pts.setDate(now.getDate() - 30);
        const r = await supabase
          .from("loyalty_transactions")
          .select("points,transaction_date")
          .in("transaction_type", [
            "EARNED",
            "earned",
            "EARNED_POINTS",
            "SCAN",
          ]);
        (r.data || []).forEach((t) => {
          const pts = t.points || 0;
          totalPoints += pts;
          const td = new Date(t.transaction_date);
          if (td >= d30pts) pointsLast30 += pts;
          if (td >= d7pts)  pointsLast7  += pts;
        });
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
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        const r = await supabase
          .from("scan_logs")
          .select("id", { count: "exact", head: true })
          .gte("scanned_at", d7.toISOString());
        recentScanCount = r.count || 0;
      } catch (_) {}
      try {
        const d30s = new Date();
        d30s.setDate(d30s.getDate() - 30);
        const r = await supabase
          .from("scan_logs")
          .select("id", { count: "exact", head: true })
          .gte("scanned_at", d30s.toISOString());
        scanLast30 = r.count || 0;
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

      let openTickets = 0,
        unreadMsgs = 0,
        unreadWholesale = 0;
      try {
        const r = await supabase
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "pending_reply"]);
        openTickets = r.count || 0;
      } catch (_) {}
      try {
        const r = await supabase
          .from("customer_messages")
          .select("id", { count: "exact", head: true })
          .eq("direction", "inbound")
          .is("read_at", null);
        unreadMsgs = r.count || 0;
      } catch (_) {}
      try {
        const r = await supabase
          .from("wholesale_messages")
          .select("id", { count: "exact", head: true })
          .eq("direction", "inbound")
          .is("read_at", null);
        unreadWholesale = r.count || 0;
      } catch (_) {}

      setStats({
        products,
        scans,
        users,
        loyaltyPoints: totalPoints,
        tenants,
        recentScanCount,
        scanLast30,
        pointsLast7,
        pointsLast30,
        openTickets,
        unreadMsgs,
        unreadWholesale,
      });
      setRecentScans(scansData);
      setLowStock(lowStockData);

      try {
        const [batchRes, lowFinishedRes] = await Promise.all([
          supabase
            .from("batches")
            .select("id", { count: "exact", head: true })
            .eq("is_archived", false),
          supabase
            .from("inventory_items")
            .select("id,name,quantity_on_hand")
            .eq("is_active", true)
            .eq("category", "finished_product")
            .lt("quantity_on_hand", 5)
            .order("quantity_on_hand", { ascending: true })
            .limit(5),
        ]);
        setProductionStats({
          activeBatches: batchRes.count || 0,
          lowFinished: lowFinishedRes.data || [],
        });
      } catch (_) {
        setProductionStats({ activeBatches: 0, lowFinished: [] });
      }

      try {
        const [suspendedRes, flaggedRes] = await Promise.all([
          supabase
            .from("user_profiles")
            .select("id", { count: "exact", head: true })
            .eq("is_suspended", true),
          supabase
            .from("user_profiles")
            .select("id", { count: "exact", head: true })
            .gt("anomaly_score", 70),
        ]);
        setFraudStats({
          suspended: suspendedRes.count || 0,
          flagged: flaggedRes.count || 0,
        });
      } catch (_) {
        setFraudStats({ suspended: 0, flagged: 0 });
      }

      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const { data: ordersData } = await supabase
          .from("orders")
          .select("total")
          .gte("created_at", monthStart.toISOString());
        setPlStats({
          revenueMTD: (ordersData || []).reduce(
            (s, o) => s + (parseFloat(o.total) || 0),
            0,
          ),
        });
      } catch (_) {
        setPlStats({ revenueMTD: 0 });
      }

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

      // ── Revenue trend: this 30d bars + prior 30d line ─────────────────
      try {
        const now = new Date();
        const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
        const d60 = new Date(now); d60.setDate(d60.getDate() - 60);

        const [thisRes, lastRes] = await Promise.all([
          supabase.from("orders").select("created_at,total")
            .gte("created_at", d30.toISOString())
            .order("created_at", { ascending: true }),
          supabase.from("orders").select("created_at,total")
            .gte("created_at", d60.toISOString())
            .lt("created_at", d30.toISOString())
            .order("created_at", { ascending: true }),
        ]);

        // Build day-index maps (0 = oldest day in window)
        const bucketByDayIndex = (rows, startDate) => {
          const map = {};
          (rows || []).forEach((o) => {
            const diffMs = new Date(o.created_at) - startDate;
            const idx = Math.floor(diffMs / 86400000);
            if (idx >= 0 && idx < 31)
              map[idx] = (map[idx] || 0) + (parseFloat(o.total) || 0);
          });
          return map;
        };

        const thisMap = bucketByDayIndex(thisRes.data || [], d30);
        const lastMap = bucketByDayIndex(lastRes.data || [], d60);

        // Build merged array — enriched with day type + public holiday
        const DOW_ABBR = ["Su","Mo","Tu","We","Th","Fr","Sa"];
        const merged = [];
        for (let i = 0; i < 30; i++) {
          const d = new Date(d30); d.setDate(d30.getDate() + i);
          const iso = d.toISOString().split("T")[0];
          const phName = SA_PUBLIC_HOLIDAYS[iso] || null;
          const dow = d.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const dayType = phName
            ? "public_holiday"
            : isWeekend ? "weekend" : "weekday";
          merged.push({
            date: `${DOW_ABBR[dow]} ${d.getDate()}`,
            fullDate: d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
            total: thisMap[i] || 0,
            lastMonth: lastMap[i] || null,
            dayType,
            phName,
          });
        }
        setRevenueTrend(merged);

        // Delta: MTD vs same days last month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMTD = (thisRes.data || [])
          .filter((o) => new Date(o.created_at) >= monthStart)
          .reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
        const lastMTD = (lastRes.data || [])
          .filter((o) => {
            const d = new Date(o.created_at);
            const lms = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lme = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return d >= lms && d <= lme;
          })
          .reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
        if (lastMTD > 0) setRevDelta(((thisMTD - lastMTD) / lastMTD) * 100);
      } catch (_) {}

      // ── Today's snapshot (revenue + txns vs yesterday) ───────────────
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const weekAgoStart = new Date(todayStart.getTime() - 7 * 86400000);
        const weekAgoEnd   = new Date(weekAgoStart.getTime() + 86400000);
        const DOW_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const ydayLabel = `last ${DOW_SHORT[weekAgoStart.getDay()]}`;
        const [todayR, ydayR] = await Promise.all([
          supabase.from("orders").select("total,items_count")
            .gte("created_at", todayStart.toISOString())
            .not("status", "in", '("cancelled","failed")'),
          supabase.from("orders").select("total,items_count")
            .gte("created_at", weekAgoStart.toISOString())
            .lt("created_at", weekAgoEnd.toISOString())
            .not("status", "in", '("cancelled","failed")')
        ]);
        const tRev   = (todayR.data||[]).reduce((s,o)=>s+(parseFloat(o.total)||0),0);
        const tTxns  = (todayR.data||[]).length;
        const tAvg   = tTxns > 0 ? tRev / tTxns : 0;
        const tAvgItems = tTxns > 0
          ? (todayR.data||[]).reduce((s,o)=>s+(parseInt(o.items_count)||0),0) / tTxns
          : 0;
        const yRev   = (ydayR.data||[]).reduce((s,o)=>s+(parseFloat(o.total)||0),0);
        const yTxns  = (ydayR.data||[]).length;
        setTodaySummary({
          rev:      tRev,
          txns:     tTxns,
          avgBasket: tAvg,
          avgItems: Math.round(tAvgItems * 10) / 10,
          ydayRev:  yRev,
          ydayLabel,
          revDelta:  yRev  > 0 ? ((tRev  - yRev)  / yRev  * 100) : null,
          txnDelta:  yTxns > 0 ? ((tTxns - yTxns) / yTxns * 100) : null,
        });
      } catch(_) {}

      // ── Payment method breakdown (today) ─────────────────────────────
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: pmRaw } = await supabase
          .from("orders")
          .select("payment_method,total")
          .gte("created_at", todayStart.toISOString())
          .not("status", "in", '("cancelled","failed")');
        const pm = {};
        (pmRaw || []).forEach((o) => {
          const m = (o.payment_method || "other").toLowerCase();
          if (!pm[m]) pm[m] = { txns: 0, revenue: 0 };
          pm[m].txns++;
          pm[m].revenue += parseFloat(o.total) || 0;
        });
        setTodayPayments(pm);
      } catch (_) {}

      // ── Avg basket extras: 7d avg + best day of week (30d) ───────────
      try {
        const now30 = new Date();
        const d30ago = new Date(now30); d30ago.setDate(d30ago.getDate() - 30);
        const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
        const d7ago = new Date(todayMidnight); d7ago.setDate(d7ago.getDate() - 7);

        const { data: last30 } = await supabase
          .from("orders")
          .select("created_at,total")
          .gte("created_at", d30ago.toISOString())
          .not("status", "in", '("cancelled","failed")');

        // avg7d — last 7 full days, excluding today
        const last7Orders = (last30 || []).filter(o => {
          const t = new Date(o.created_at);
          return t >= d7ago && t < todayMidnight;
        });
        const avg7d = last7Orders.length > 0
          ? last7Orders.reduce((s,o) => s + (parseFloat(o.total)||0), 0) / last7Orders.length
          : null;

        // bestDow — highest avg basket day of week over 30 days
        const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const dowMap = {};
        (last30 || []).forEach(o => {
          const dow = new Date(o.created_at).getDay();
          if (!dowMap[dow]) dowMap[dow] = { total: 0, count: 0 };
          dowMap[dow].total += parseFloat(o.total) || 0;
          dowMap[dow].count++;
        });
        const bestDow = Object.entries(dowMap)
          .map(([d, v]) => ({ label: DOW_LABELS[d], avg: v.total / v.count }))
          .sort((a, b) => b.avg - a.avg)[0]?.label || null;

        setTodaySummary(prev => prev ? { ...prev, avg7d, bestDow } : prev);
      } catch (_) {}

      // ── Prior-period scan delta (this 7d vs prev 7d) ─────────────────
      try {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        const d14 = new Date();
        d14.setDate(d14.getDate() - 14);
        const { count: prevCount } = await supabase
          .from("scan_logs")
          .select("id", { count: "exact", head: true })
          .gte("scanned_at", d14.toISOString())
          .lt("scanned_at", d7.toISOString());
        if (prevCount > 0) {
          setScanDelta(((recentScanCount - prevCount) / prevCount) * 100);
        }
      } catch (_) {}

      // ── Scan trend — all 30 days, zero-filled ───────────────────────
      try {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        const { data: trendRaw } = await supabase
          .from("scan_logs")
          .select("scanned_at")
          .gte("scanned_at", d30.toISOString())
          .order("scanned_at", { ascending: true })
          .limit(500);
        const dayMap = {};
        (trendRaw || []).forEach((s) => {
          const day = new Date(s.scanned_at).toLocaleDateString("en-ZA", {
            month: "short",
            day: "numeric",
          });
          dayMap[day] = (dayMap[day] || 0) + 1;
        });
        // Generate all 30 days — zero for days with no scans
        const fullTrend = [];
        for (let i = 0; i < 30; i++) {
          const d = new Date(d30);
          d.setDate(d30.getDate() + i);
          const label = d.toLocaleDateString("en-ZA", {
            month: "short",
            day: "numeric",
          });
          fullTrend.push({ date: label, count: dayMap[label] || 0 });
        }
        setScanTrend(fullTrend);
        const wkMap = {};
        (trendRaw || []).forEach((s) => {
          const wk = Math.floor(
            (Date.now() - new Date(s.scanned_at).getTime()) / (7 * 86400000),
          );
          wkMap[wk] = (wkMap[wk] || 0) + 1;
        });
        setWeeklySpark(
          Object.entries(wkMap)
            .sort((a, b) => b[0] - a[0])
            .slice(0, 6)
            .reverse()
            .map(([, v]) => ({ v })),
        );
      } catch (_) {}

      // ── QR type distribution (Donut + HBar) ─────────────────────────
      try {
        const { data: typeRaw } = await supabase
          .from("scan_logs")
          .select("qr_type")
          .not("qr_type", "is", null)
          .limit(500);
        const typeMap = {};
        (typeRaw || []).forEach((s) => {
          typeMap[s.qr_type] = (typeMap[s.qr_type] || 0) + 1;
        });
        setQrTypeDist(
          Object.entries(typeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name: name.replace(/_/g, " "), value })),
        );
      } catch (_) {}

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

  // ── Cannabis retail: dedicated stock intelligence fetch ─────────────────────
  const fetchCannabisData = useCallback(async () => {
    if (!isCannabisRetail || !tenantId) return;
    try {
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 86400000)
        .toISOString()
        .split("T")[0];
      const in7 = new Date(now.getTime() + 7 * 86400000)
        .toISOString()
        .split("T")[0];
      const today = now.toISOString().split("T")[0];

      const [itemsRes, poisRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select(
            "id,category,subcategory,quantity_on_hand,sell_price,weighted_avg_cost,reorder_level,expiry_date,is_active",
          )
          .eq("tenant_id", tenantId)
          .eq("is_active", true),
        supabase
          .from("purchase_orders")
          .select(
            "id,po_status,currency,subtotal,landed_cost_zar,expected_arrival,expected_date",
          )
          .eq("tenant_id", tenantId)
          .not("po_status", "in", '("complete","paid","cancelled","received")'),
      ]);

      const items = itemsRes.data || [];
      const pos = poisRes.data || [];

      // Stock health metrics
      const inStock = items.filter((i) => (i.quantity_on_hand || 0) > 0);
      const outOfStock = items.filter((i) => (i.quantity_on_hand || 0) <= 0);
      const belowReorder = items.filter(
        (i) =>
          i.reorder_level > 0 && (i.quantity_on_hand || 0) <= i.reorder_level,
      );
      const expiredItems = items.filter(
        (i) =>
          i.expiry_date &&
          i.expiry_date < today &&
          (i.quantity_on_hand || 0) > 0,
      );
      const expiring7 = items.filter(
        (i) =>
          i.expiry_date &&
          i.expiry_date >= today &&
          i.expiry_date <= in7 &&
          (i.quantity_on_hand || 0) > 0,
      );
      const expiring30 = items.filter(
        (i) =>
          i.expiry_date &&
          i.expiry_date > in7 &&
          i.expiry_date <= in30 &&
          (i.quantity_on_hand || 0) > 0,
      );

      // Stock value + margin from AVCO (correct for retail)
      const stockValue = items.reduce(
        (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
        0,
      );
      const pricedItems = items.filter(
        (i) => i.sell_price > 0 && i.weighted_avg_cost > 0,
      );
      const margins = pricedItems.map(
        (i) => ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100,
      );
      const avgMargin =
        margins.length > 0
          ? margins.reduce((s, m) => s + m, 0) / margins.length
          : null;
      const healthyItems = pricedItems.filter(
        (i) =>
          ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100 >= 40,
      );

      // Category breakdown — 14 Product Worlds via subcategory-first matching
      const byCat = {};
      const byWorldSub = {};
      items.forEach((i) => {
        const world = worldForItem(i);
        if (!world || world.id === "all") return;
        // Overview counts
        if (!byCat[world.id])
          byCat[world.id] = { label: world.label, count: 0, inStock: 0 };
        byCat[world.id].count++;
        if ((i.quantity_on_hand || 0) > 0) byCat[world.id].inStock++;
        // Subcategory drill-down counts
        if (!byWorldSub[world.id]) byWorldSub[world.id] = {};
        const subKey = i.subcategory || "__none__";
        const subLabel = world.subLabels?.[subKey]
          || (subKey === "__none__" ? world.label : subKey.replace(/_/g, " "));
        if (!byWorldSub[world.id][subKey])
          byWorldSub[world.id][subKey] = { label: subLabel, count: 0, inStock: 0 };
        byWorldSub[world.id][subKey].count++;
        if ((i.quantity_on_hand || 0) > 0) byWorldSub[world.id][subKey].inStock++;
      });

      setCannabisStock({
        total: items.length,
        inStock: inStock.length,
        outOfStock: outOfStock.length,
        belowReorder: belowReorder.length,
        expired: expiredItems.length,
        expiring7: expiring7.length,
        expiring30: expiring30.length,
        stockValue,
        avgMargin,
        healthyCount: healthyItems.length,
        totalPriced: pricedItems.length,
        byCat,
        byWorldSub,
        expiryAlert:
          expiredItems.length > 0
            ? "critical"
            : expiring7.length > 0
              ? "critical"
              : expiring30.length > 0
                ? "warning"
                : "success",
        expiryLabel:
          expiredItems.length > 0
            ? `${expiredItems.length} EXPIRED — remove now`
            : expiring7.length > 0
              ? `${expiring7.length} expiring this week`
              : expiring30.length > 0
                ? `${expiring30.length} expiring in 30 days`
                : "all clear",
      });

      // ZAR POs only for cannabis retail
      const zarPOs = pos.filter((p) => p.currency === "ZAR");
      const usdPOs = pos.filter((p) => p.currency !== "ZAR");
      setCannabisPOs({
        openZAR: zarPOs.length,
        openUSD: usdPOs.length,
        total: pos.length,
        nextDelivery: zarPOs
          .filter((p) => p.expected_arrival || p.expected_date)
          .sort((a, b) =>
            (a.expected_arrival || a.expected_date || "") <
            (b.expected_arrival || b.expected_date || "")
              ? -1
              : 1,
          )[0],
      });
    } catch (err) {
      console.error("[HQOverview] Cannabis fetch:", err);
    }
  }, [isCannabisRetail, tenantId]);

  useEffect(() => {
    fetchCannabisData();
  }, [fetchCannabisData]);

  // GAP-02: realtime subscriptions — stock + batches → refresh overview
  useEffect(() => {
    const stockSub = supabase
      .channel("hq-overview-stock")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => fetchStats(),
      )
      .subscribe();
    const batchSub = supabase
      .channel("hq-overview-batches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "batches" },
        () => fetchStats(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(stockSub);
      supabase.removeChannel(batchSub);
    };
  }, [fetchStats]);

  // ── Loading ──
  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 0",
          color: T.ink500,
          fontFamily: T.fontUi,
        }}
      >
        <style>{`@keyframes protea-spin{to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            width: 28,
            height: 28,
            border: `2px solid ${T.ink150}`,
            borderTopColor: T.accent,
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Loading HQ data…
        </span>
      </div>
    );

  // ── Error ──
  if (error)
    return (
      <div
        style={{
          background: T.dangerBg,
          border: `1px solid ${T.dangerBd}`,
          borderRadius: 6,
          padding: "14px 18px",
          color: T.danger,
          fontFamily: T.fontUi,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ flex: 1 }}>{error}</span>
        <button onClick={fetchStats} style={{ ...btn("primary", "sm") }}>
          Retry
        </button>
      </div>
    );

  const nav = (tab) => onNavigate && onNavigate(tab);

  const marginColour =
    erpStats?.avgMarginPct >= 35
      ? T.success
      : erpStats?.avgMarginPct >= 20
        ? T.warning
        : T.danger;

  const commsTotal =
    (stats.openTickets || 0) +
    (stats.unreadMsgs || 0) +
    (stats.unreadWholesale || 0);
  const fraudTotal = (fraudStats?.flagged || 0) + (fraudStats?.suspended || 0);
  const lowFinishedCount = productionStats?.lowFinished?.length || 0;

  // ── Custom x-axis tick: day abbr + day number, coloured by dayType ──────────
  const renderRevTick = ({ x, y, payload }) => {
    const entry = revenueTrend.find((e) => e.date === payload.value);
    const color =
      entry?.dayType === "public_holiday" ? "#F472B6"
      : entry?.dayType === "weekend" ? "#818CF8"
      : "#94A3B8";
    const bold = entry?.dayType !== "weekday";
    const [abbr, num] = (payload.value || " ").split(" ");
    return (
      <g transform={`translate(${x},${y + 4})`}>
        <text
          textAnchor="middle"
          fill={color}
          fontSize={8}
          fontWeight={bold ? 600 : 400}
          y={0}
        >
          {abbr}
        </text>
        <text textAnchor="middle" fill={color} fontSize={8} y={11}>
          {num}
        </text>
      </g>
    );
  };

  return (
    <div style={{ fontFamily: T.fontUi }}>
      <WorkflowGuide
        context={ctx}
        title="HQ Command Centre"
        description="Master control for Protea Botanicals. Every number is live. Follow the workflow below to get products into the shop and keep operations running."
        steps={GUIDE_STEPS}
        warnings={GUIDE_WARNINGS}
        dataFlow={GUIDE_DATAFLOW}
        tips={GUIDE_TIPS}
        storageKey="hq_overview"
        defaultOpen={false}
      />

      {/* ── TODAY SNAPSHOT ── */}
      <SectionLabel label="Today" />
      <div style={{ ...tileGrid, marginBottom: 20 }}>
        <MetricTile
          label="Today's Sales"
          value={todaySummary
            ? `R${Math.round(todaySummary.rev).toLocaleString("en-ZA")}`
            : "R0"}
          subLabel={null}
          sub={
            todaySummary?.revDelta != null ? (
              <span style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: todaySummary.revDelta >= 0 ? "#059669" : "#DC2626",
                  fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
                }}>
                  {todaySummary.revDelta >= 0 ? "\u2191" : "\u2193"}
                  {Math.abs(todaySummary.revDelta).toFixed(1)}%
                </span>
                {todaySummary.ydayRev > 0 && (
                  <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif" }}>
                    R{Math.round(todaySummary.ydayRev).toLocaleString("en-ZA")} {todaySummary.ydayLabel}
                  </span>
                )}
              </span>
            ) : "\u2014"
          }
          semantic={null}
          onClick={() => nav("trading")}
          hint="Daily Trading"
        />
        <MetricTile
          label="Transactions"
          value={todaySummary ? todaySummary.txns : 0}
          subLabel="orders today"
          sub={
            todayPayments && Object.keys(todayPayments).length > 0 ? (
              <span style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { key: "cash",  label: "Cash",  color: "#059669" },
                    { key: "card",  label: "Card",  color: "#2563EB" },
                    { key: "yoco",  label: "Yoco",  color: "#6366F1" },
                  ]
                    .filter(m => todayPayments[m.key])
                    .map(m => (
                      <span key={m.key} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        color: "#374151",
                        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
                      }}>
                        <span style={{
                          display: "inline-block",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: m.color,
                          flexShrink: 0,
                        }}/>
                        <span style={{ fontWeight: 500, color: m.color }}>
                          {todayPayments[m.key].txns}
                        </span>
                        <span style={{ color: "#9CA3AF" }}>{m.label}</span>
                      </span>
                    ))
                  }
                </span>
                {todayPayments.cash && (
                  <span style={{
                    fontSize: 11,
                    color: "#059669",
                    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
                    fontWeight: 600,
                  }}>
                    R{Math.round(todayPayments.cash.revenue).toLocaleString("en-ZA")} cash in till
                  </span>
                )}
              </span>
            ) : null
          }
          semantic={todaySummary?.txns > 0 ? "success" : null}
          onClick={() => nav("trading")}
          hint="Daily Trading"
        />
        <MetricTile
          label="Avg Basket"
          value={todaySummary && todaySummary.txns > 0
            ? `R${Math.round(todaySummary.avgBasket).toLocaleString("en-ZA")}`
            : "\u2014"}
          subLabel="per transaction"
          sub={
            todaySummary?.txns > 0 ? (() => {
              const vsSevenD = (todaySummary.avg7d || 0) > 0
                ? ((todaySummary.avgBasket - todaySummary.avg7d) / todaySummary.avg7d * 100)
                : null;
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0 6px", alignItems: "center", marginTop: 2 }}>
                  {todaySummary.avgItems > 0 && (
                    <span style={{ color: "#6B7280", fontSize: 10 }}>
                      {todaySummary.avgItems.toFixed(1)} items avg
                    </span>
                  )}
                  {todaySummary.bestDow && (
                    <>
                      <span style={{ color: "#D1D5DB" }}>&middot;</span>
                      <span style={{ color: "#6B7280", fontSize: 10 }}>
                        best day: {todaySummary.bestDow}
                      </span>
                    </>
                  )}
                  {vsSevenD !== null && (
                    <>
                      <span style={{ color: "#D1D5DB" }}>&middot;</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: vsSevenD >= 0 ? "#059669" : "#DC2626",
                        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
                      }}>
                        {vsSevenD >= 0 ? "\u2191" : "\u2193"}
                        {Math.abs(vsSevenD).toFixed(0)}% vs 7d avg
                      </span>
                    </>
                  )}
                </div>
              );
            })() : "no transactions yet"
          }
          semantic={null}
          onClick={() => nav("trading")}
          hint="Daily Trading"
        />
      </div>

      {/* ── REVENUE — ComposedChart: bars + last month line ── */}
      {revenueTrend.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <ChartCard
            title="Revenue — Last 30 Days"
            subtitle="Daily orders · all channels"
            height={330}
            action={
              revDelta !== null ? (
                <DeltaBadge value={revDelta} suffix="%" decimals={1} />
              ) : null
            }
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 8,
              fontSize: 10,
              color: "#6B7280",
              fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
              flexWrap: "wrap",
            }}>
              {[
                { color: "#6366F1", label: "Weekday" },
                { color: "#C7D2FE", label: "Weekend" },
                { color: "#F472B6", label: "Public holiday" },
              ].map(({ color, label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }}/>
                  {label}
                </span>
              ))}
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="18" height="10" viewBox="0 0 18 10" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="5" x2="18" y2="5" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3"/>
                </svg>
                Last month
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={revenueTrend}
                margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
              >
                <CartesianGrid
                  horizontal={true}
                  vertical={false}
                  stroke={CHART.grid}
                  strokeWidth={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={renderRevTick}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  height={30}
                />
                <YAxis
                  tick={{ fill: CHART.axis, fontSize: 10, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const entry = revenueTrend.find((e) => e.date === label);
                    return (
                      <div style={{
                        background: "white",
                        border: "0.5px solid #E2E8F0",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontFamily: T.font,
                        fontSize: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        minWidth: 160,
                      }}>
                        <div style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                          {entry?.fullDate || label}
                          {entry?.phName && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: "#A78BFA", fontWeight: 500 }}>
                              {entry.phName}
                            </span>
                          )}
                        </div>
                        {payload.map((p) => (
                          p.value != null && (
                            <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "#374151" }}>
                              <span style={{ color: "#6B7280" }}>{p.name}</span>
                              <span style={{ fontWeight: 500 }}>
                                R {Number(p.value).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="total"
                  name="This month"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={22}
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {revenueTrend.map((entry, idx) => (
                    <Cell
                      key={`rev-cell-${idx}`}
                      fill={
                        entry.dayType === "public_holiday" ? "#F472B6"
                        : entry.dayType === "weekend" ? "#C7D2FE"
                        : "#6366F1"
                      }
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="lastMonth"
                  name="Last month"
                  stroke={CHART.neutral}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── ROW 1: OPERATIONS HEALTH ── */}
      <SectionLabel
        label={isCannabisRetail ? "The Shelf" : "Operations Health"}
      />
      <div style={tileGrid}>
        {isCannabisRetail ? (
          <>
            {/* Cannabis: Stock Health */}
            <MetricTile
              label="Stock Health"
              value={cannabisStock ? `${cannabisStock.inStock}` : "—"}
              subLabel={
                cannabisStock
                  ? `of ${cannabisStock.total} SKUs in stock`
                  : "loading…"
              }
              sub={
                cannabisStock
                  ? cannabisStock.outOfStock > 0
                    ? `${cannabisStock.outOfStock} out of stock · ${cannabisStock.belowReorder} below reorder`
                    : "all items stocked"
                  : "…"
              }
              semantic={cannabisStock?.outOfStock > 0 ? "warning" : "success"}
              onClick={() => nav("stock")}
              hint="Stock"
            />
            {/* Cannabis: Purchase Orders (local ZAR) */}
            <MetricTile
              label="Purchase Orders"
              value={cannabisPOs ? `${cannabisPOs.total}` : "—"}
              subLabel="open orders"
              sub={
                cannabisPOs
                  ? cannabisPOs.nextDelivery
                    ? `next delivery ${cannabisPOs.nextDelivery.expected_arrival || cannabisPOs.nextDelivery.expected_date}`
                    : cannabisPOs.total > 0
                      ? "awaiting delivery"
                      : "no open POs"
                  : "…"
              }
              semantic={cannabisPOs?.total > 0 ? "info" : null}
              onClick={() => nav("stock")}
              hint="Purchase Orders"
            />
          </>
        ) : (
          <>
            {/* Manufacturer: Production */}
            <MetricTile
              label="Production"
              value={productionStats?.activeBatches ?? "—"}
              subLabel="active batches"
              sub={
                lowFinishedCount > 0
                  ? `${lowFinishedCount} finished goods low`
                  : "all batches healthy"
              }
              semantic={lowFinishedCount > 0 ? "warning" : "success"}
              onClick={() => nav("hq-production")}
              hint="HQ Production"
            />
            <MetricTile
              label="Import POs"
              value={erpStats?.activeImportPOs ?? "—"}
              subLabel="open orders"
              sub="in transit / pending"
              semantic="info"
              onClick={() => nav("procurement")}
              hint="Procurement"
            />
          </>
        )}
        <MetricTile
          label="Revenue MTD"
          value={
            plStats
              ? `R${plStats.revenueMTD.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : "—"
          }
          subLabel="this month"
          sub={
            isCannabisRetail && cannabisStock?.avgMargin != null
              ? `${cannabisStock.avgMargin.toFixed(1)}% avg margin`
              : erpStats?.avgMarginPct != null
                ? `${erpStats.avgMarginPct.toFixed(1)}% avg margin`
                : "margin loading…"
          }
          semantic={
            (isCannabisRetail
              ? cannabisStock?.avgMargin
              : erpStats?.avgMarginPct) >= 35
              ? "success"
              : (isCannabisRetail
                    ? cannabisStock?.avgMargin
                    : erpStats?.avgMarginPct) >= 20
                ? "warning"
                : "danger"
          }
          onClick={() => nav("pl")}
          hint="P&L"
        />
        <MetricTile
          label="Reorder Alerts"
          value={
            isCannabisRetail
              ? (cannabisStock?.belowReorder ?? "—")
              : (erpStats?.reorderCount ?? "—")
          }
          subLabel="below threshold"
          sub={
            (isCannabisRetail
              ? cannabisStock?.belowReorder
              : erpStats?.reorderCount) > 0
              ? "items need reorder"
              : "all stocked"
          }
          semantic={
            (isCannabisRetail
              ? cannabisStock?.belowReorder
              : erpStats?.reorderCount) > 0
              ? "danger"
              : "success"
          }
          onClick={() => nav("reorder")}
          hint="Reorder"
        />
      </div>

      {/* ── CANNABIS ROW 1.5: STOCK INTELLIGENCE ─────────────────────────── */}
      {isCannabisRetail && cannabisStock && (
        <>
          <SectionLabel label="Product Health" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)",
              gap: 12,
              marginBottom: 28,
              alignItems: "stretch",
            }}
          >
            {/* LEFT: Stock by Category — drill-down chart */}
            {Object.keys(cannabisStock.byCat).length > 0 && (() => {
              const isdrilldown = !!selectedWorld;
              const activeWorld = selectedWorld
                ? PRODUCT_WORLDS.find((w) => w.id === selectedWorld)
                : null;
              const rows = isdrilldown
                ? Object.entries(cannabisStock.byWorldSub?.[selectedWorld] || {})
                    .sort((a, b) => b[1].count - a[1].count)
                : Object.entries(cannabisStock.byCat)
                    .sort((a, b) => b[1].count - a[1].count);

              return (
                <ChartCard
                  title={isdrilldown ? "Stock by Sub Category" : "Stock by Category"}
                  subtitle={isdrilldown ? "" : "In-stock ratio"}
                  action={isdrilldown ? (
                    <button
                      onClick={() => setSelectedWorld(null)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "none",
                        border: "0.5px solid #E2E8F0",
                        borderRadius: 6,
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        padding: 0,
                        color: "#6366F1",
                      }}
                      title="Back to all categories"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  ) : null}
                  height={420}
                >
                  <div
                    style={{
                      padding: "4px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                      height: "100%",
                      justifyContent: "space-evenly",
                    }}
                  >
                    {rows.map(([rowKey, data]) => {
                      const pct = data.count > 0 ? (data.inStock / data.count) * 100 : 0;
                      const clickable = !isdrilldown;
                      return (
                        <div
                          key={rowKey}
                          onClick={clickable ? () => setSelectedWorld(rowKey) : undefined}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: clickable ? "pointer" : "default",
                            borderRadius: 4,
                            padding: "2px 4px",
                            margin: "0 -4px",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            if (clickable) {
                              e.currentTarget.style.background = "#F8FAFC";
                              e.currentTarget.querySelector(".cat-label").style.color = "#6366F1";
                              e.currentTarget.querySelector(".cat-label").style.fontWeight = "600";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (clickable) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.querySelector(".cat-label").style.color = "";
                              e.currentTarget.querySelector(".cat-label").style.fontWeight = "";
                            }
                          }}
                        >
                          <div
                            className="cat-label"
                            style={{
                              width: 100,
                              fontSize: 10,
                              color: T.ink500,
                              fontFamily: T.font,
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              transition: "color 0.12s, font-weight 0.12s",
                            }}
                          >
                            {data.label}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              height: 7,
                              background: T.ink075,
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background:
                                  pct === 100
                                    ? "#059669"
                                    : pct > 50
                                      ? "#D97706"
                                      : "#DC2626",
                                borderRadius: 3,
                                transition: "width 0.5s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              width: 44,
                              fontSize: 10,
                              color: clickable ? "#6366F1" : T.ink400,
                              fontFamily: T.fontData,
                              textAlign: "right",
                              flexShrink: 0,
                              fontWeight: clickable ? 500 : 400,
                            }}
                          >
                            {data.inStock}/{data.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ChartCard>
              );
            })()}
            {/* RIGHT: 2 tiles top, 1 tile below */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "space-between", height: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <MetricTile
                  label="Stock Value"
                  value={`R${Math.round(cannabisStock.stockValue).toLocaleString("en-ZA")}`}
                  subLabel="AVCO-weighted"
                  sub={`${cannabisStock.inStock} SKUs in stock`}
                  semantic="success"
                  onClick={() => nav("stock")}
                  hint="Stock"
                />
                <MetricTile
                  label="Margin Health"
                  value={
                    cannabisStock.avgMargin != null
                      ? `${cannabisStock.avgMargin.toFixed(1)}%`
                      : "\u2014"
                  }
                  subLabel="avg across priced items"
                  sub={`${cannabisStock.healthyCount} of ${cannabisStock.totalPriced} healthy (>40%)`}
                  semantic={
                    cannabisStock.avgMargin >= 50
                      ? "success"
                      : cannabisStock.avgMargin >= 35
                        ? "warning"
                        : "danger"
                  }
                  onClick={() => nav("pricing")}
                  hint="Pricing"
                />
              </div>
              <MetricTile
                label="Expiry Status"
                value={
                  cannabisStock.expired > 0
                    ? cannabisStock.expired
                    : cannabisStock.expiring7 > 0
                      ? cannabisStock.expiring7
                      : cannabisStock.expiring30 > 0
                        ? cannabisStock.expiring30
                        : "\u2713"
                }
                subLabel={
                  cannabisStock.expired > 0
                    ? "items expired"
                    : cannabisStock.expiring7 > 0
                      ? "expiring this week"
                      : cannabisStock.expiring30 > 0
                        ? "expiring in 30 days"
                        : "all clear"
                }
                sub={cannabisStock.expiryLabel}
                semantic={cannabisStock.expiryAlert}
                onClick={() => nav("stock")}
                hint="Stock \u2192 Items"
              />
            </div>
          </div>
        </>
      )}

      {/* ── CHART: Scan Activity — Area (secondary, below ops) ── */}
      {scanTrend.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <ChartCard title="Scan Activity — Last 30 Days" subtitle="QR scans · 30 day window" accent="teal" height={240}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={scanTrend}
                margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
              >
                <defs>
                  <linearGradient id="ov-scan-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHART.secondary}
                      stopOpacity={0.09}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART.secondary}
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  horizontal={true}
                  vertical={false}
                  stroke={CHART.grid}
                  strokeWidth={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: CHART.axis, fontSize: 11, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                  interval="preserveStartEnd"
                  maxRotation={0}
                />
                <YAxis
                  tick={{ fill: CHART.axis, fontSize: 11, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => `${v} scans`} />}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Scans"
                  stroke={CHART.secondary}
                  strokeWidth={1.5}
                  fill="url(#ov-scan-grad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── ROW 2: CUSTOMER INTELLIGENCE ── */}
      <SectionLabel label="Members & Loyalty" />
      <div style={tileGrid}>
        <MetricTile
          label="QR Scans"
          value={stats.scans}
          subLabel="total lifetime"
          sub={
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span>{stats.recentScanCount ?? 0} scans last 7 days</span>
              <span>{stats.scanLast30 ?? 0} scans last 30 days</span>
            </span>
          }
          semantic={stats.recentScanCount > 0 ? "success" : null}
          onClick={() => nav("analytics")}
          hint="Analytics"
          sparkData={weeklySpark}
          delta={scanDelta}
        />
        <MetricTile
          label="Loyalty Points"
          value={stats.loyaltyPoints.toLocaleString()}
          subLabel={`${stats.users} registered members`}
          sub={
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span>{(stats.pointsLast7 ?? 0).toLocaleString()} pts last 7 days</span>
              <span>{(stats.pointsLast30 ?? 0).toLocaleString()} pts last 30 days</span>
            </span>
          }
          semantic="info"
          onClick={() => nav("loyalty")}
          hint="Loyalty"
        />
        <MetricTile
          label="Comms"
          value={commsTotal}
          subLabel="items needing attention"
          sub={
            [
              stats.openTickets > 0
                ? `${stats.openTickets} open ticket${stats.openTickets !== 1 ? "s" : ""}`
                : null,
              stats.unreadMsgs > 0
                ? `${stats.unreadMsgs} unread msg${stats.unreadMsgs !== 1 ? "s" : ""}`
                : null,
              stats.unreadWholesale > 0
                ? `${stats.unreadWholesale} wholesale`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "all clear"
          }
          semantic={commsTotal > 0 ? "danger" : "success"}
          onClick={() => (window.location.href = "/admin")}
          hint="Admin Comms"
        />
        <MetricTile
          label="Fraud Alerts"
          value={fraudStats ? fraudTotal : "—"}
          subLabel="accounts flagged"
          sub={
            [
              fraudStats?.flagged > 0 ? `${fraudStats.flagged} flagged` : null,
              fraudStats?.suspended > 0
                ? `${fraudStats.suspended} suspended`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "no alerts"
          }
          semantic={fraudTotal > 0 ? "danger" : "success"}
          onClick={() => nav("fraud")}
          hint="Fraud & Security"
        />
      </div>

      {/* ── CHARTS: QR Type Distribution ── */}
      {qrTypeDist.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <ChartCard
            title="Scan Distribution"
            subtitle="By QR type"
            height={240}
          >
            <div style={{ display: "flex", height: "100%", alignItems: "center" }}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 10,
                minWidth: 120,
                paddingRight: 8,
              }}>
                {qrTypeDist.map((item, i) => (
                  <div key={item.name} style={{
                    display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <span style={{
                      display: "inline-block", width: 9, height: 9,
                      borderRadius: 2, flexShrink: 0,
                      background: CHART.cat[i % CHART.cat.length],
                    }}/>
                    <span style={{
                      fontSize: 11,
                      color: "#374151",
                      fontFamily: T.font,
                      lineHeight: 1.3,
                    }}>
                      {item.name}
                    </span>
                    <span style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#111827",
                      fontFamily: T.fontData,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qrTypeDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {qrTypeDist.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART.cat[i % CHART.cat.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>
          <ChartCard
            title="Volume by Type"
            subtitle="Ranked"
            height={240}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={qrTypeDist}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 80 }}
              >
                <CartesianGrid
                  horizontal={false}
                  vertical={true}
                  stroke={CHART.grid}
                  strokeWidth={0.5}
                />
                <XAxis
                  type="number"
                  tick={{ fill: CHART.axis, fontSize: 11, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: CHART.axis, fontSize: 11, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  width={76}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => `${v} scans`} />}
                />
                <Bar
                  dataKey="value"
                  name="Scans"
                  radius={[0, 3, 3, 0]}
                  isAnimationActive={false}
                  maxBarSize={18}
                >
                  {qrTypeDist.map((_, i) => (
                    <Cell
                      key={`vol-cell-${i}`}
                      fill={CHART.cat[i % CHART.cat.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── ROW 3: BIRTHDAYS ── */}
      <SectionLabel label="Birthdays" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <MetricTile
          label="Birthdays Today"
          value={birthdayStats.today}
          subLabel="customers"
          sub={
            birthdayStats.today > 0
              ? "bonus points sent at 06:00"
              : "none today"
          }
          semantic={birthdayStats.today > 0 ? "info" : null}
        />
        <MetricTile
          label="Birthdays This Week"
          value={birthdayStats.thisWeek}
          subLabel="upcoming"
          sub="next 7 days"
          semantic={birthdayStats.thisWeek > 0 ? "info" : null}
        />
      </div>

      {/* ── ROW 4: IMPORT ERP ── */}
      {erpStats && (
        <>
          <SectionLabel label="Store Performance" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <MetricTile
              label="Avg Gross Margin"
              value={
                erpStats.avgMarginPct !== null
                  ? `${erpStats.avgMarginPct.toFixed(1)}%`
                  : "—"
              }
              subLabel="retail channel"
              sub="average across SKUs"
              semantic={
                erpStats.avgMarginPct !== null
                  ? erpStats.avgMarginPct >= 35
                    ? "success"
                    : erpStats.avgMarginPct >= 20
                      ? "warning"
                      : "danger"
                  : null
              }
              onClick={() => nav("pricing")}
              hint="Pricing"
            />
            {/* FX Rate card */}
            <div
              style={{
                background: "white",
                border: `1px solid ${T.ink150}`,
                borderRadius: 6,
                padding: "18px 20px",
                boxShadow: T.shadowCard,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: T.ink500,
                  }}
                >
                  USD / ZAR
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: T.fontData,
                      fontSize: 10,
                      color: T.ink400,
                      background: T.ink075,
                      padding: "1px 6px",
                      borderRadius: 3,
                    }}
                  >
                    {fxCountdown}s
                  </span>
                  <button
                    onClick={() => fetchFx(false)}
                    disabled={fxRefreshing}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: fxRefreshing ? "default" : "pointer",
                      color: T.ink500,
                      fontSize: 14,
                      padding: 0,
                      opacity: fxRefreshing ? 0.4 : 1,
                    }}
                    title="Refresh rate"
                  >
                    ↻
                  </button>
                </div>
              </div>
              <div
                style={{
                  fontFamily: T.fontData,
                  fontSize: 28,
                  fontWeight: 400,
                  color: T.success,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fxRate
                  ? `R${fxRate.toFixed(4)}`
                  : erpStats.fxRate
                    ? `R${erpStats.fxRate.toFixed(4)}`
                    : "—"}
              </div>
              {fxYesterday && (fxRate || erpStats?.fxRate) ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: fxRate > fxYesterday ? "#DC2626" : "#059669",
                      fontFamily: T.fontData,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {fxRate > fxYesterday ? "\u2191" : "\u2193"}{" "}
                      {Math.abs(((fxRate - fxYesterday) / fxYesterday) * 100).toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 10, color: T.ink400 }}>vs yesterday</span>
                  </div>
                  {fxRate30d && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: fxRate > fxRate30d ? "#DC2626" : "#059669",
                        fontFamily: T.fontData,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {fxRate > fxRate30d ? "\u2191" : "\u2193"}{" "}
                        {Math.abs(((fxRate - fxRate30d) / fxRate30d) * 100).toFixed(2)}%
                      </span>
                      <span style={{ fontSize: 10, color: T.ink400 }}>vs 30 days</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: T.ink500, marginTop: 6 }}>
                  {fxUpdatedAt ? `updated ${fmtAgo(fxUpdatedAt)}` : "live rate"}
                </div>
              )}
            </div>
          </div>
          {/* Gross margin radial gauge */}
          {erpStats.avgMarginPct !== null &&
            erpStats.avgMarginPct !== undefined && (
              <div style={{ marginTop: 20, marginBottom: 28 }}>
                <ChartCard title="Gross Margin" subtitle="Retail channel average" accent="amber" height={220}>
                  <MarginGauge
                    value={erpStats.avgMarginPct}
                    color={marginColour}
                  />
                </ChartCard>
              </div>
            )}
        </>
      )}

      {/* ── PANELS: Recent Scans + Low Stock ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Recent Scans */}
        <div
          style={{
            background: "white",
            border: `1px solid ${T.ink150}`,
            borderRadius: 6,
            overflow: "hidden",
            boxShadow: T.shadowCard,
          }}
        >
          <div
            onClick={() => nav("analytics")}
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${T.ink150}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.ink075)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink900 }}>
              Recent Scans
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ fontSize: 11, color: T.accentMid, fontWeight: 500 }}
              >
                Analytics
              </span>
              <span
                style={{
                  background: T.accentLit,
                  color: T.accent,
                  padding: "1px 7px",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                {recentScans.length}
              </span>
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {recentScans.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: T.ink500,
                  fontSize: 13,
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
                        ? `1px solid ${T.ink075}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: T.ink900,
                        fontFamily: T.fontData,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {scan.qr_code ? scan.qr_code.slice(0, 20) + "…" : "—"}
                    </span>
                    {scan.qr_type && (
                      <span
                        style={{
                          marginLeft: 8,
                          background: T.infoBg,
                          color: T.info,
                          padding: "1px 6px",
                          borderRadius: 2,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        {scan.qr_type}
                      </span>
                    )}
                    {scan.ip_city && (
                      <span
                        style={{ marginLeft: 6, fontSize: 10, color: T.ink400 }}
                      >
                        {scan.ip_city}
                      </span>
                    )}
                  </div>
                  <span style={{ color: T.ink400, fontSize: 11 }}>
                    {fmtAgo(scan.scanned_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div
          style={{
            background: "white",
            border: `1px solid ${T.ink150}`,
            borderRadius: 6,
            overflow: "hidden",
            boxShadow: T.shadowCard,
          }}
        >
          <div
            onClick={() => nav("supply-chain")}
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${T.ink150}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.ink075)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink900 }}>
              Low Stock Alerts
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: lowStock.length > 0 ? T.danger : T.accentMid,
                  fontWeight: 500,
                }}
              >
                Supply Chain
              </span>
              {lowStock.length > 0 && (
                <span
                  style={{
                    background: T.dangerBg,
                    color: T.danger,
                    padding: "1px 7px",
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  {lowStock.length}
                </span>
              )}
            </div>
          </div>
          <div>
            {lowStock.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: T.ink500,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: T.successBg,
                    borderRadius: "50%",
                    margin: "0 auto 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8l3.5 3.5 6.5-7"
                      stroke={T.success}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                All stock levels healthy
              </div>
            ) : (
              lowStock.map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => nav("supply-chain")}
                  style={{
                    padding: "10px 20px",
                    borderBottom:
                      i < lowStock.length - 1
                        ? `1px solid ${T.ink075}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = T.dangerBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div>
                    <span style={{ color: T.ink900, fontWeight: 500 }}>
                      {item.name || item.sku || "Unnamed"}
                    </span>
                    {item.sku && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          color: T.ink400,
                          fontFamily: T.fontData,
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
                          (item.quantity_on_hand || 0) === 0
                            ? T.danger
                            : T.warning,
                        fontWeight: 600,
                        fontSize: 14,
                        fontFamily: T.fontData,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {item.quantity_on_hand ?? 0}
                    </span>
                    {item.unit && (
                      <span
                        style={{ marginLeft: 4, fontSize: 10, color: T.ink400 }}
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
          background: "white",
          border: `1px solid ${T.ink150}`,
          borderRadius: 6,
          padding: "20px 24px",
          boxShadow: T.shadowCard,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.ink900,
            marginBottom: 16,
          }}
        >
          Quick Actions
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.ink400,
            marginBottom: 10,
          }}
        >
          Platform
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {[
            { label: "Admin Dashboard", href: "/admin" },
            { label: "View Shop", href: "/shop" },
            { label: "Loyalty Page", href: "/loyalty" },
            { label: "Leaderboard", href: "/leaderboard" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: T.ink075,
                border: `1px solid ${T.ink150}`,
                borderRadius: 3,
                padding: "8px 14px",
                fontFamily: T.fontUi,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: T.ink700,
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          ))}
        </div>
        {onNavigate && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: 10,
              }}
            >
              Import ERP
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                {
                  label: "Production",
                  tab: "hq-production",
                  alert: lowFinishedCount > 0,
                },
                { label: "Procurement", tab: "procurement", alert: false },
                { label: "Costing", tab: "costing", alert: false },
                { label: "Pricing", tab: "pricing", alert: false },
                { label: "P&L", tab: "pl", alert: false },
                { label: "Loyalty Engine", tab: "loyalty", alert: false },
                {
                  label: "Reorder",
                  tab: "reorder",
                  alert: erpStats?.reorderCount > 0,
                },
                {
                  label: "Fraud & Security",
                  tab: "fraud",
                  alert: fraudTotal > 0,
                },
              ].map(({ label, tab, alert }) => (
                <button
                  key={tab}
                  onClick={() => nav(tab)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: alert ? T.dangerBg : T.ink075,
                    border: `1px solid ${alert ? T.dangerBd : T.ink150}`,
                    borderRadius: 3,
                    padding: "8px 14px",
                    fontFamily: T.fontUi,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: alert ? T.danger : T.ink700,
                    cursor: "pointer",
                  }}
                >
                  {label}
                  {alert && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 1L11 10H1L6 1z"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6 5v2M6 8.5v.5"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 20, textAlign: "right" }}>
        <button
          onClick={fetchStats}
          style={{
            background: "transparent",
            border: `1px solid ${T.ink150}`,
            borderRadius: 3,
            padding: "7px 14px",
            cursor: "pointer",
            fontFamily: T.fontUi,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.ink500,
          }}
        >
          ↻ Refresh All Data
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <div
      style={{
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#374151",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{
        display: "inline-block",
        width: 3,
        height: 14,
        borderRadius: 2,
        background: "#1A3D2B",
        flexShrink: 0,
      }} />
      {label}
    </div>
  );
}

const SEMANTIC = {
  success: { text: "#166534", bg: "#F0FDF4", bd: "#BBF7D0" },
  warning: { text: "#92400E", bg: "#FFFBEB", bd: "#FDE68A" },
  danger: { text: "#991B1B", bg: "#FEF2F2", bd: "#FECACA" },
  info: { text: "#1E3A5F", bg: "#EFF6FF", bd: "#BFDBFE" },
};

function MarginGauge({ value, color }) {
  const pct = Math.min(Math.max((value || 0) / 100, 0), 1);
  const r = 68,
    cx = 100,
    cy = 108,
    startAngle = -210,
    totalDeg = 240;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPath = (start, end) => {
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const endAngle = startAngle + totalDeg * pct;
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height={240}
      style={{ display: "block" }}
    >
      <path
        d={arcPath(startAngle, startAngle + totalDeg)}
        fill="none"
        stroke={T.ink150}
        strokeWidth={16}
        strokeLinecap="round"
      />
      {pct > 0.01 && (
        <path
          d={arcPath(startAngle, endAngle)}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
        />
      )}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize="28"
        fontWeight="400"
        fontFamily={T.fontUi}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value !== null && value !== undefined ? `${value.toFixed(1)}%` : "—"}
      </text>
      <text
        x={cx}
        y={cy + 20}
        textAnchor="middle"
        fill={T.ink400}
        fontSize="10"
        fontWeight="600"
        fontFamily={T.fontUi}
        letterSpacing="0.08em"
      >
        GROSS MARGIN
      </text>
      <text
        x={cx - r - 4}
        y={cy + 44}
        textAnchor="middle"
        fill={T.ink300}
        fontSize="9"
        fontFamily={T.fontUi}
      >
        0%
      </text>
      <text
        x={cx + r + 4}
        y={cy + 44}
        textAnchor="middle"
        fill={T.ink300}
        fontSize="9"
        fontFamily={T.fontUi}
      >
        100%
      </text>
    </svg>
  );
}

function MetricTile({
  label,
  value,
  subLabel,
  sub,
  semantic,
  onClick,
  hint,
  sparkData,
  delta,
}) {
  const SEMANTIC_STYLES = {
    success: { border: "#059669", text: "#059669", bg: "rgba(5,150,105,0.07)",   bd: "rgba(5,150,105,0.2)"  },
    warning: { border: "#D97706", text: "#D97706", bg: "rgba(215,119,6,0.07)",   bd: "rgba(215,119,6,0.2)"  },
    danger:  { border: "#DC2626", text: "#DC2626", bg: "rgba(220,38,38,0.07)",   bd: "rgba(220,38,38,0.18)" },
    info:    { border: "#2563EB", text: "#2563EB", bg: "rgba(37,99,235,0.07)",   bd: "rgba(37,99,235,0.18)" },
  };
  const s = semantic ? SEMANTIC_STYLES[semantic] : null;
  const clickable = !!onClick;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E5E7EB",
        borderRadius: 10,
        padding: "18px 20px 16px",
        cursor: clickable ? "pointer" : "default",
        boxShadow: hovered && clickable
          ? "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)"
          : "0 1px 4px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.18s ease, transform 0.12s ease",
        transform: hovered && clickable ? "translateY(-1px)" : "none",
        position: "relative",
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6B7280",
          }}
        >
          {label}
        </span>
        {clickable && hint && (
          <span
            style={{
              fontSize: 9,
              color: "#9CA3AF",
              fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {hint}
            <span style={{ fontSize: 10 }}>↗</span>
          </span>
        )}
      </div>

      {/* Value + sparkline row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1,
            color: s ? s.text : "#111827",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        {sparkData && sparkData.length > 1 && (
          <SparkLine
            data={sparkData}
            positive={delta === null || delta === undefined || delta >= 0}
            width={56}
            height={28}
          />
        )}
      </div>

      {/* Delta badge */}
      {delta !== null && delta !== undefined && (
        <div style={{ marginBottom: 6 }}>
          <DeltaBadge value={delta} size="sm" />
        </div>
      )}

      {/* Sub-label */}
      {subLabel && (
        <div
          style={{
            fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
            fontSize: 10,
            color: "#9CA3AF",
            letterSpacing: "0.02em",
            marginBottom: sub ? 6 : 0,
          }}
        >
          {subLabel}
        </div>
      )}

      {/* Status badge */}
      {sub && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: 11,
            fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
            fontWeight: s ? 600 : 400,
            color: s ? s.text : "#6B7280",
          }}
        >
          {sub}
        </div>
      )}
    </div>
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

function btn(variant, size) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 3,
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    border: "none",
    fontSize: size === "sm" ? "10px" : "11px",
    padding: size === "sm" ? "6px 12px" : "9px 16px",
  };
  const variants = {
    primary: { background: "#1A3D2B", color: "white" },
    ghost: {
      background: "transparent",
      color: "#2C2C2C",
      border: "1px solid #E2E2E2",
    },
  };
  return { ...base, ...(variants[variant] || variants.primary) };
}

const tileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 14,
  marginBottom: 28,
};
