// src/components/hq/HQOverview.js — v3.1 — WP-THEME-2: Inter font
// v3.0 — WP-THEME: Unified design system applied
//   - Outfit replaces Cormorant Garamond + Jost everywhere
//   - DM Mono for all metric values
//   - Emoji icons removed — SVG / text indicators only
//   - Coloured top borders removed — semantic state on value colour only
//   - Alert bars use standard 4-variant template
//   - Buttons use standard 4-variant system
// v2.1 — WP-GUIDE-C: wire overview context to WorkflowGuide

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

// ─── Design tokens (mirrors src/theme.js) ───────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
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
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadowCard: "0 1px 3px rgba(0,0,0,0.07)",
};

// ─── WorkflowGuide content (unchanged) ──────────────────────────────────────
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

      {/* ── ROW 1: OPERATIONS HEALTH ── */}
      <SectionLabel label="Operations Health" />
      <div style={tileGrid}>
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
        <MetricTile
          label="Revenue MTD"
          value={
            plStats
              ? `R${plStats.revenueMTD.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : "—"
          }
          subLabel="this month"
          sub={
            erpStats?.avgMarginPct != null
              ? `${erpStats.avgMarginPct.toFixed(1)}% avg margin`
              : "margin loading…"
          }
          semantic={
            erpStats?.avgMarginPct >= 35
              ? "success"
              : erpStats?.avgMarginPct >= 20
                ? "warning"
                : "danger"
          }
          onClick={() => nav("pl")}
          hint="P&L"
        />
        <MetricTile
          label="Reorder Alerts"
          value={erpStats?.reorderCount ?? "—"}
          subLabel="below threshold"
          sub={
            erpStats?.reorderCount > 0 ? "items need reorder" : "all stocked"
          }
          semantic={erpStats?.reorderCount > 0 ? "danger" : "success"}
          onClick={() => nav("reorder")}
          hint="Reorder"
        />
      </div>

      {/* ── ROW 2: CUSTOMER INTELLIGENCE ── */}
      <SectionLabel label="Customer Intelligence" />
      <div style={tileGrid}>
        <MetricTile
          label="QR Scans"
          value={stats.scans}
          subLabel="total lifetime"
          sub={`${stats.recentScanCount} in last 7 days`}
          semantic="success"
          onClick={() => nav("analytics")}
          hint="Analytics"
        />
        <MetricTile
          label="Loyalty Points"
          value={stats.loyaltyPoints.toLocaleString()}
          subLabel="total issued"
          sub={`${stats.users} registered members`}
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
          <SectionLabel label="Import ERP" />
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
                }}
              >
                {fxRate
                  ? `R${fxRate.toFixed(4)}`
                  : erpStats.fxRate
                    ? `R${erpStats.fxRate.toFixed(4)}`
                    : "—"}
              </div>
              <div style={{ fontSize: 11, color: T.ink500, marginTop: 6 }}>
                {fxUpdatedAt ? `updated ${fmtAgo(fxUpdatedAt)}` : "live rate"}
              </div>
            </div>
          </div>
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
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#B0B0B0",
        marginBottom: 12,
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
      }}
    >
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

function MetricTile({ label, value, subLabel, sub, semantic, onClick, hint }) {
  const s = semantic ? SEMANTIC[semantic] : null;
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        border: `1px solid #E2E2E2`,
        borderRadius: 6,
        padding: "18px 20px",
        cursor: clickable ? "pointer" : "default",
        transition: "box-shadow 0.15s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      }}
      onMouseEnter={(e) => {
        if (clickable)
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)";
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#B0B0B0",
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {label}
        {clickable && hint && (
          <span
            style={{
              fontSize: 9,
              color: "#B0B0B0",
              fontWeight: 500,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {hint} ↗
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
          fontSize: 28,
          fontWeight: 400,
          color: s ? s.text : "#0D0D0D",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {subLabel && (
        <div
          style={{
            fontSize: 9,
            color: "#B0B0B0",
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
            color: s ? s.text : "#5A5A5A",
            marginTop: 6,
            fontWeight: s ? 600 : 400,
            background: s ? s.bg : "transparent",
            border: s ? `1px solid ${s.bd}` : "none",
            borderRadius: s ? 3 : 0,
            padding: s ? "2px 6px" : 0,
            display: "inline-block",
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
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
  gap: 12,
  marginBottom: 28,
};
