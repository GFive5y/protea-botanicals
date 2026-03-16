// src/components/hq/HQOverview.js — Protea Botanicals v2.0
// WP-X: System Intelligence Layer — HQ Overview overhaul
// v2.0: New 3-row tile grid (Operations · Customer Intelligence · Import ERP)
//       + WorkflowGuide contextual onboarding
//       + SystemStatusBar (injected at HQDashboard level — not here)
//       + Fraud tile (flagged accounts)
//       + Production tile (active batches, low finished goods)
//       + P&L snapshot tile (revenue MTD)
//       All v1.9 functionality retained: FX rate, birthday stats,
//       recent scans, low stock, reorder alerts, avg margin, import POs.
// v1.9: Comms tile expanded — open tickets + unread customer + unread wholesale
// v1.8: Products KPI from product_cogs
// v1.6: Open tickets KPI + live USD/ZAR

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";

// ─── Colour tokens ───────────────────────────────────────────────────────────
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
  blue: "#2c4a6e",
};

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

// ─── WorkflowGuide content ───────────────────────────────────────────────────
const GUIDE_STEPS = [
  {
    number: 1,
    label: "Supply Chain",
    desc: "Add suppliers → Create POs → Receive stock. Raw materials enter inventory here.",
    status: "required",
    link: null,
  },
  {
    number: 2,
    label: "Production",
    desc: "Create batches → Run production. Finished products deduct raw materials and add to finished goods inventory.",
    status: "required",
    link: null,
  },
  {
    number: 3,
    label: "Pricing",
    desc: "Set sell_price per product in the Pricing tab. Without a sell_price > R0 the product will NOT appear in the customer shop.",
    status: "required",
    link: null,
  },
  {
    number: 4,
    label: "Distribution",
    desc: "Ship finished goods to wholesale partners via the Distribution tab.",
    status: "optional",
    link: null,
  },
  {
    number: 5,
    label: "Monitor Daily",
    desc: "Check Comms for customer messages, Fraud for flagged accounts, and Reorder alerts for low stock.",
    status: "required",
    link: null,
  },
];
const GUIDE_DATAFLOW = [
  {
    direction: "in",
    from: "Purchase Orders received",
    to: "inventory_items (raw materials +)",
    note: "Triggered by 'Receive' action on a PO",
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
    to: "customer_messages (outbound) + WhatsApp notification",
    note: "Realtime: inbox-{userId} channel fires immediately",
  },
  {
    direction: "out",
    from: "Loyalty Schema applied",
    to: "All pts_ and mult_ fields updated live",
    note: "Next scan/purchase reads new config instantly — no restart needed",
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
  "Apply a loyalty schema first (Conservative / Standard / Aggressive) to get a clean baseline, then fine-tune individual values in the other tabs.",
  "Check the Fraud tab daily. anomaly_score > 70 requires review. Dismiss false positives promptly so real threats stay visible.",
  "The FX rate widget updates every 60 seconds from the live API. All COGS calculations use this rate automatically.",
  "The Comms tile turns red when there are open tickets or unread messages. Click it to go directly to Admin Comms.",
  "Production tile shows finished goods with quantity < 5. These products are at risk of going out of stock in the shop.",
];

// ─── Main component ──────────────────────────────────────────────────────────
export default function HQOverview({ onNavigate }) {
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
  const fxTimerRef = useRef(null);
  const fxCountRef = useRef(null);

  // ── FX rate ────────────────────────────────────────────────────────────────
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
          if (!silent) setFxRefreshing(false);
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

  // ── Birthday stats ─────────────────────────────────────────────────────────
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

  // ── Main data fetch ────────────────────────────────────────────────────────
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

      // Comms counts
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
        openTickets,
        unreadMsgs,
        unreadWholesale,
      });
      setRecentScans(scansData);
      setLowStock(lowStockData);

      // ── NEW: Production stats ────────────────────────────────────────────
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

      // ── NEW: Fraud stats ─────────────────────────────────────────────────
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

      // ── NEW: P&L snapshot (revenue MTD) ─────────────────────────────────
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const { data: ordersData } = await supabase
          .from("orders")
          .select("total")
          .gte("created_at", monthStart.toISOString());
        const revenueMTD = (ordersData || []).reduce(
          (s, o) => s + (parseFloat(o.total) || 0),
          0,
        );
        setPlStats({ revenueMTD });
      } catch (_) {
        setPlStats({ revenueMTD: 0 });
      }

      // ── Import ERP stats (existing) ──────────────────────────────────────
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

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
        <style>{`@keyframes protea-spin{to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${C.border}`,
            borderTopColor: C.primaryDark,
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <span
          style={{
            fontSize: 11,
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
          borderRadius: 2,
          padding: "16px 20px",
          color: C.red,
          fontSize: 13,
        }}
      >
        {error}
        <button
          onClick={fetchStats}
          style={{
            marginLeft: 12,
            background: C.primaryDark,
            color: C.white,
            border: "none",
            borderRadius: 2,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Retry
        </button>
      </div>
    );

  // ── Derived values ─────────────────────────────────────────────────────────
  const nav = (tab) => onNavigate && onNavigate(tab);
  const marginColour =
    erpStats?.avgMarginPct >= 35
      ? "#2E7D32"
      : erpStats?.avgMarginPct >= 20
        ? C.orange
        : C.red;
  const commsTotal =
    (stats.openTickets || 0) +
    (stats.unreadMsgs || 0) +
    (stats.unreadWholesale || 0);
  const fraudTotal = (fraudStats?.flagged || 0) + (fraudStats?.suspended || 0);
  const lowFinishedCount = productionStats?.lowFinished?.length || 0;

  return (
    <div>
      {/* ── Workflow Guide ── */}
      <WorkflowGuide
        title="HQ Command Centre"
        description="The master control room for Protea Botanicals. Every number here is live — no refresh needed. Follow the workflow below to get products into the shop and keep operations running smoothly."
        steps={GUIDE_STEPS}
        warnings={GUIDE_WARNINGS}
        dataFlow={GUIDE_DATAFLOW}
        tips={GUIDE_TIPS}
        storageKey="hq_overview"
        defaultOpen={false}
      />

      {/* ══════════════════════════════════════════════
          ROW 1 — OPERATIONS HEALTH
      ══════════════════════════════════════════════ */}
      <SectionLabel label="Operations Health" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {/* Production tile */}
        <TileCard
          icon="🏭"
          label="Production"
          value={productionStats?.activeBatches ?? "—"}
          sub={
            lowFinishedCount > 0
              ? `⚠ ${lowFinishedCount} finished good${lowFinishedCount !== 1 ? "s" : ""} low`
              : "all batches healthy"
          }
          color={lowFinishedCount > 0 ? C.orange : C.primaryMid}
          alert={lowFinishedCount > 0}
          onClick={() => nav("hq-production")}
          hint="→ HQ Production"
          subLabel="active batches"
        />

        {/* Supply Chain / POs */}
        <TileCard
          icon="📦"
          label="Import POs"
          value={erpStats?.activeImportPOs ?? "—"}
          sub="in transit / pending"
          color={C.blue}
          onClick={() => nav("procurement")}
          hint="→ Procurement"
          subLabel="open orders"
        />

        {/* P&L snapshot */}
        <TileCard
          icon="📊"
          label="Revenue MTD"
          value={
            plStats
              ? `R${plStats.revenueMTD.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : "—"
          }
          sub={
            erpStats?.avgMarginPct != null
              ? `${erpStats.avgMarginPct.toFixed(1)}% avg margin`
              : "margin loading…"
          }
          color={marginColour}
          onClick={() => nav("pl")}
          hint="→ P&L"
          subLabel="this month"
        />

        {/* Reorder alerts */}
        <TileCard
          icon="🔔"
          label="Reorder Alerts"
          value={erpStats?.reorderCount ?? "—"}
          sub={
            erpStats?.reorderCount > 0 ? "items need reorder" : "all stocked"
          }
          color={erpStats?.reorderCount > 0 ? C.red : C.accentGreen}
          alert={erpStats?.reorderCount > 0}
          onClick={() => nav("reorder")}
          hint="→ Reorder"
          subLabel="below threshold"
        />
      </div>

      {/* ══════════════════════════════════════════════
          ROW 2 — CUSTOMER INTELLIGENCE
      ══════════════════════════════════════════════ */}
      <SectionLabel label="Customer Intelligence" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {/* QR Scans */}
        <TileCard
          icon="📱"
          label="QR Scans"
          value={stats.scans}
          sub={`${stats.recentScanCount} in last 7 days`}
          color={C.accentGreen}
          onClick={() => nav("analytics")}
          hint="→ Analytics"
          subLabel="total lifetime"
        />

        {/* Loyalty */}
        <TileCard
          icon="🏆"
          label="Loyalty Points"
          value={stats.loyaltyPoints.toLocaleString()}
          sub={`${stats.users} registered members`}
          color={C.gold}
          onClick={() => nav("loyalty")}
          hint="→ Loyalty"
          subLabel="total issued"
        />

        {/* Comms */}
        <TileCard
          icon="💬"
          label="Comms"
          value={commsTotal}
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
          color={commsTotal > 0 ? C.red : C.accentGreen}
          alert={commsTotal > 0}
          onClick={() => (window.location.href = "/admin")}
          hint="→ Admin Comms"
          subLabel="items needing attention"
        />

        {/* Fraud & Security */}
        <TileCard
          icon="🛡️"
          label="Fraud Alerts"
          value={fraudStats ? fraudTotal : "—"}
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
          color={fraudTotal > 0 ? C.red : C.accentGreen}
          alert={fraudTotal > 0}
          onClick={() => nav("fraud")}
          hint="→ Fraud & Security"
          subLabel="accounts flagged"
        />
      </div>

      {/* ══════════════════════════════════════════════
          ROW 3 — BIRTHDAYS
      ══════════════════════════════════════════════ */}
      <SectionLabel label="Birthdays" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <TileCard
          icon="🎂"
          label="Birthdays Today"
          value={birthdayStats.today}
          sub={
            birthdayStats.today > 0
              ? "bonus points sent at 06:00"
              : "none today"
          }
          color={birthdayStats.today > 0 ? C.purple : C.muted}
          subLabel="customers"
        />
        <TileCard
          icon="🎉"
          label="Birthdays This Week"
          value={birthdayStats.thisWeek}
          sub="next 7 days"
          color={birthdayStats.thisWeek > 0 ? C.gold : C.muted}
          subLabel="upcoming"
        />
      </div>

      {/* ══════════════════════════════════════════════
          ROW 4 — IMPORT ERP (existing)
      ══════════════════════════════════════════════ */}
      {erpStats && (
        <>
          <SectionLabel label="Import ERP" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            {/* Avg Margin */}
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
            {/* FX Rate widget */}
            <div
              style={{
                background: "#E8F5E9",
                border: "1px solid #c8e6c9",
                borderTop: "3px solid #2E7D32",
                borderRadius: 2,
                padding: "18px 20px",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>💱</span>
                  <span
                    style={{
                      color: C.muted,
                      fontSize: 10,
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
                    fontSize: 14,
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
                  fontSize: 28,
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
                  fontSize: 10,
                  marginTop: 6,
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
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: 9,
                  }}
                >
                  ↻ {fxCountdown}s
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════
          PANELS — Recent Scans + Low Stock (existing)
      ══════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* Recent Scans */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            onClick={() => nav("analytics")}
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
              Recent Scans{" "}
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
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {recentScans.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: C.muted,
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
                        ? `1px solid ${C.border}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: C.text, fontWeight: 500 }}>
                      {scan.qr_code ? scan.qr_code.slice(0, 20) + "…" : "—"}
                    </span>
                    {scan.qr_type && (
                      <span
                        style={{
                          marginLeft: 8,
                          background: "rgba(82,183,136,0.1)",
                          color: C.accentGreen,
                          padding: "1px 6px",
                          borderRadius: 2,
                          fontSize: 9,
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
                        style={{ marginLeft: 6, fontSize: 10, color: C.muted }}
                      >
                        📍{scan.ip_city}
                      </span>
                    )}
                  </div>
                  <span style={{ color: C.muted, fontSize: 11 }}>
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
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            onClick={() => nav("supply-chain")}
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
              Low Stock Alerts{" "}
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
                  padding: 24,
                  textAlign: "center",
                  color: C.muted,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    display: "block",
                    marginBottom: 8,
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
                  onClick={() => nav("supply-chain")}
                  style={{
                    padding: "10px 20px",
                    borderBottom:
                      i < lowStock.length - 1
                        ? `1px solid ${C.border}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
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
                          marginLeft: 8,
                          fontSize: 10,
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
                        fontSize: 13,
                        fontFamily: "'Cormorant Garamond',serif",
                      }}
                    >
                      {item.quantity_on_hand ?? 0}
                    </span>
                    {item.unit && (
                      <span
                        style={{ marginLeft: 4, fontSize: 10, color: C.muted }}
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

      {/* ══════════════════════════════════════════════
          QUICK ACTIONS (existing + new)
      ══════════════════════════════════════════════ */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          padding: "20px 24px",
        }}
      >
        <h3 style={{ ...sH, marginBottom: 8 }}>Quick Actions</h3>
        <SectionLabel label="Platform" small />
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <QA label="Admin Dashboard" href="/admin" icon="⚙️" />
          <QA label="View Shop" href="/shop" icon="🛒" />
          <QA label="Loyalty Page" href="/loyalty" icon="⭐" />
          <QA label="Leaderboard" href="/leaderboard" icon="🏆" />
        </div>
        {onNavigate && (
          <>
            <SectionLabel label="Import ERP" small />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <QABtn
                label="Production"
                icon="🏭"
                onClick={() => nav("hq-production")}
                highlight={lowFinishedCount > 0}
              />
              <QABtn
                label="Procurement"
                icon="🛒"
                onClick={() => nav("procurement")}
              />
              <QABtn label="Costing" icon="🧮" onClick={() => nav("costing")} />
              <QABtn label="Pricing" icon="💰" onClick={() => nav("pricing")} />
              <QABtn label="P&L" icon="📉" onClick={() => nav("pl")} />
              <QABtn
                label="Loyalty Engine"
                icon="💎"
                onClick={() => nav("loyalty")}
              />
              <QABtn
                label="Reorder"
                icon="🔔"
                onClick={() => nav("reorder")}
                highlight={erpStats?.reorderCount > 0}
              />
              <QABtn
                label="Fraud & Security"
                icon="🛡️"
                onClick={() => nav("fraud")}
                highlight={fraudTotal > 0}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 24, textAlign: "right" }}>
        <button
          onClick={fetchStats}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            padding: "8px 16px",
            cursor: "pointer",
            fontFamily: "Jost,sans-serif",
            fontSize: 10,
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

// ─── Sub-components ──────────────────────────────────────────────────────────
function SectionLabel({ label, small }) {
  return (
    <div
      style={{
        fontSize: small ? 9 : 10,
        fontWeight: 700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: C.muted,
        marginBottom: small ? 10 : 12,
      }}
    >
      {label}
    </div>
  );
}

function TileCard({
  icon,
  label,
  value,
  sub,
  subLabel,
  color,
  alert,
  onClick,
  hint,
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      title={hint}
      style={{
        background: C.white,
        border: `1px solid ${alert ? "#ffcdd2" : C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 2,
        padding: "18px 20px",
        cursor: clickable ? "pointer" : "default",
        transition: "box-shadow 0.15s, transform 0.1s",
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
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span
            style={{
              color: C.muted,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        </div>
        {clickable && (
          <span style={{ fontSize: 9, color, fontWeight: 600, opacity: 0.7 }}>
            ↗
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: 32,
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {subLabel && (
        <div
          style={{
            fontSize: 9,
            color: C.muted,
            marginTop: 2,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {subLabel}
        </div>
      )}
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: alert ? color : C.muted,
            marginTop: 4,
            fontWeight: alert ? 600 : 400,
          }}
        >
          {sub}
        </div>
      )}
      {hint && (
        <div
          style={{
            fontSize: 9,
            color,
            opacity: 0.55,
            marginTop: 6,
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

function ERPCard({ icon, label, value, color, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 2,
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
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span
          style={{
            color: C.muted,
            fontSize: 10,
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
          fontSize: 32,
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{sub}</div>
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
        gap: 6,
        background: "#f4f0e8",
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: "8px 16px",
        fontFamily: "Jost,sans-serif",
        fontSize: 11,
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
        gap: 6,
        background: highlight ? "#FFEBEE" : "#f4f0e8",
        border: `1px solid ${highlight ? "#ffcdd2" : C.border}`,
        borderRadius: 2,
        padding: "8px 16px",
        fontFamily: "Jost,sans-serif",
        fontSize: 11,
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
  fontSize: 16,
  fontWeight: 300,
  color: "#1b4332",
  margin: 0,
};
const badge = {
  background: "rgba(82,183,136,0.1)",
  color: "#52b788",
  padding: "2px 8px",
  borderRadius: 2,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
};
