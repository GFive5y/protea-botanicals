// src/components/StockControl.js v2.5 — WP-TABLE-UNIFY Phase 0: tenant scoping on fetchAll (LL-206 + LL-205 cross-tenant leak fix)
// v2.4 — commit 11015a1: category filter .in() → .eq("is_active", true) (LL-276), fetchAll guard, writeAlert LL-206
// v2.3 — WP-IND Session 2: category filter by industry profile — WP-STK Phase 2: AVCO + cost drift + unit_cost in history
// v2.0 — WP-THEME: Unified design system applied
/* ═══════════════════════════════════════════════════════════════════
 * COMPONENT MAP — StockControl.js — WP-TABLE-UNIFY Phase 0 (17 Apr 2026)
 * ═══════════════════════════════════════════════════════════════════
 * LOCATION           src/components/StockControl.js (NOT under hq/)
 * LINES              ~4,680
 * CONSUMED IN        /admin dashboard · store operator Stock tab
 * TENANT CONTEXT     useTenant() at L276 → { industryProfile, tenantId }
 *
 * STATE VARIABLES    (survey; adjust during Phase 1 migration)
 *   items, movements, suppliers, orders     — fetchAll() outputs
 *   loading, error                          — fetch UX
 *   activeTab                               — sub-tab router
 *   showForm, editItem, form, saving        — item/movement CRUD
 *   selectedPo, receiveOpen                 — PO + receive modal
 *
 * SUPABASE CALLS
 *   fetchAll (Promise.all, L316)
 *     L322  inventory_items  .eq("tenant_id", tenantId).eq("is_active", true)
 *                            ← FIXED this session (was leak per LL-205)
 *     L328  stock_movements  NO tenant filter · NOT fixed this session
 *     L332  suppliers        NO tenant filter · NOT fixed this session
 *     L333  purchase_orders  NO tenant filter · NOT fixed this session
 *     ↑ Phase 1/2 must add .eq("tenant_id", tenantId) to the three
 *       siblings. Pre-check their hq_all_ policies per LL-205 first.
 *   writeAlert (L297) — system_alerts INSERT, already tenant-scoped
 *   handleSave (L1363/1369) — inventory_items UPDATE/INSERT (by id)
 *   handleDeactivate (L1386) — inventory_items UPDATE (by id)
 *   movement submit (L2990) — inventory_items UPDATE (by id)
 *   PO receive (L3362) — inventory_items UPDATE (by id)
 *
 * RENDER SECTIONS (approx. line anchors)
 *   L~580  ReceiveModal gate
 *   L~1400 ItemsView (table + form + categoryFilter pills)
 *   L~2440 KpiCards · Charts · Movements list
 *   L~3360 PurchaseOrders tab
 *
 * DS6 VIOLATIONS (for WP-TABLE-UNIFY Phase 1)
 *   Local `C` alias block at L42-60 (legacy palette)
 *   Row heights on table exceed LL-284 (44/56/72 cap)
 *   Mixed border weights — audit and unify in Phase 1
 *
 * WP-TABLE-UNIFY PLANNED ADDITIONS
 *   Phase 1  DS6 token migration (T import already present L39)
 *   Phase 2  FoodWorld pills when industryProfile === 'food_beverage'
 *            (LL-282 isFoodBev guard mandatory)
 *   Phase 3  SmartInventory feature parity — tile view, world picker,
 *            column sort, bulk actions, smart search (SC-01..SC-15)
 *   Phase 4  Advanced Excel-like features (post-demo)
 * ═══════════════════════════════════════════════════════════════════ */
//   - Outfit replaces Cormorant Garamond + Jost everywhere
//   - DM Mono for all metric/numeric values
//   - StatCard: coloured top borders removed — semantic colour on value only
//   - Category pills: neutral ink075 background, semantic text colour
//   - Sub-tab buttons: standard underline style
//   - Card left-border accents removed (decorative use)
//   - Purple removed — doc source badge uses info-blue
// v1.5: InfoTooltip shop-visibility | v1.4: PO Detail Modal | v1.3: Item History

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../services/supabaseClient";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "./hq/ProductWorlds";
import { useTenant } from "../services/tenantService";
import {
  INDUSTRY_PROFILES,
  CANNABIS_ONLY_CATEGORIES,
} from "../constants/industryProfiles";
import ActionCentre from "./shared/ActionCentre";
import { usePageContext } from "../hooks/usePageContext";
import InfoTooltip from "./InfoTooltip";
import { ChartCard, ChartTooltip, InlineProgressBar } from "./viz";
import StockItemModal from "./StockItemModal";
import StockAIAnalysis from "./hq/StockAIAnalysis";
import StockReceiveModal from "./hq/StockReceiveModal";
import { T as DS } from "../styles/tokens";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ...DS,
  ink150:    DS.border,
  ink075:    DS.bg,
  ink050:    DS.surface,
  successBg: DS.successLight,
  warningBg: DS.warningLight,
  dangerBg:  DS.dangerLight,
  infoBg:    DS.infoLight,
  accentLit: DS.accentLight,
  fontUi:    DS.font,
  fontData:  DS.font,
  shadow:    DS.shadow.sm,
};

// Legacy aliases (keeps internal logic unchanged)
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.ink050,
  warm: T.ink075,
  white: T.surface,
  border: T.ink150,
  muted: T.ink500,
  text: T.ink900,
  error: T.danger,
  red: T.danger,
  blue: T.info,
  purple: T.info,
  lightPurple: T.infoBg,
};

const F = {
  heading: T.fontUi, // ★ WP-THEME: Outfit replaces Cormorant everywhere
  body: T.fontUi,
};

// ── Shared style objects ─────────────────────────────────────────────────────
const sLabel = {
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
  fontFamily: T.fontUi,
  fontWeight: 700,
};
const sCard = {
  background: T.surface,
  border: `1px solid ${T.ink150}`,
  borderRadius: T.radius.md,
  padding: "20px",
  boxShadow: T.shadow,
};
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background: v === "primary" ? T.accent : "transparent",
  color: v === "primary" ? "#fff" : T.accentMid,
  border: v === "primary" ? "none" : `1px solid ${T.accentBd}`,
  borderRadius: T.radius.sm,
  fontSize: "11px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.fontUi,
  transition: "opacity 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: T.radius.sm,
  fontSize: "13px",
  fontFamily: T.fontUi,
  background: T.surface,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };
const sTable = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
  fontFamily: T.fontUi,
};
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink075}`,
  color: T.ink700,
  verticalAlign: "middle",
};

// CATEGORY_LABELS imported from ProductWorlds.js
const CATEGORY_COLORS = {
  finished_product: T.success,
  raw_material: T.info,
  terpene: T.accentMid,
  hardware: "#92400E",
  packaging: T.ink500,
  concentrate: T.accentMid,
  flower: "#166534",
  edible: "#b5935a",
  topical: "#7e22ce",
  medical_consumable: T.danger,
  accessory: T.ink400,
  service: T.info,
};
const UNIT_LABELS = { pcs: "pcs", ml: "ml", g: "g", bottles: "bottles" };
const availQty = (item) =>
  Math.max(
    0,
    parseFloat(item.quantity_on_hand || 0) - parseFloat(item.reserved_qty || 0),
  );
const MOVEMENT_LABELS = {
  purchase_in: "Purchase In",
  sale_out: "Sale Out",
  adjustment: "Adjustment",
  waste: "Waste",
  transfer: "Transfer",
  production_in: "Production In",
  production_out: "Production Out",
};
const ALL_PO_STATUSES = [
  { id: "draft", label: "Draft", color: T.ink500 },
  { id: "submitted", label: "Submitted", color: T.info },
  { id: "confirmed", label: "Confirmed", color: T.accentMid },
  { id: "shipped", label: "Shipped", color: "#92400E" },
  { id: "received", label: "Received", color: T.accent },
  { id: "complete", label: "Complete", color: T.success },
  { id: "cancelled", label: "Cancelled", color: T.danger },
];
const PO_STATUS_COLORS = ALL_PO_STATUSES.reduce((a, s) => {
  a[s.id] = s.color;
  return a;
}, {});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isDocumentSourced(m) {
  if (!m) return false;
  const n = (m.notes || "").toLowerCase(),
    r = (m.reference || "").toLowerCase();
  return (
    n.includes("document") ||
    n.includes("ingested") ||
    n.includes("ai extracted") ||
    UUID_PATTERN.test(r)
  );
}
function buildDocSourceMap(movements) {
  const map = {};
  for (const m of movements) {
    if (isDocumentSourced(m)) {
      const e = map[m.item_id];
      if (!e || new Date(m.created_at) > new Date(e.created_at))
        map[m.item_id] = m;
    }
  }
  return map;
}

function DocumentSourceBadge({ movement }) {
  if (!movement) return null;
  return (
    <span
      title={`Doc ingestion ${new Date(movement.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
      style={{
        fontSize: "11px",
        padding: "1px 6px",
        borderRadius: T.radius.sm,
        background: T.infoBg,
        color: T.info,
        border: `1px solid ${T.infoBd}`,
        fontWeight: 700,
        letterSpacing: "0.08em",
        fontFamily: T.fontUi,
        whiteSpace: "nowrap",
        cursor: "default",
      }}
    >
      DOC
    </span>
  );
}

function LiveShopBadge() {
  return (
    <span
      title="Live in customer shop"
      style={{
        fontSize: "11px",
        padding: "2px 7px",
        borderRadius: T.radius.sm,
        background: T.successBg,
        color: T.success,
        border: `1px solid ${T.successBd}`,
        fontWeight: 700,
        letterSpacing: "0.08em",
        fontFamily: T.fontUi,
        whiteSpace: "nowrap",
        cursor: "default",
        marginLeft: "6px",
      }}
    >
      LIVE
    </span>
  );
}

function isLiveInShop(item) {
  return (
    item.category === "finished_product" &&
    parseFloat(item.sell_price || 0) > 0 &&
    parseFloat(item.quantity_on_hand || 0) > 0
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function StockControl() {
  const [subTab, setSubTab] = useState("overview");
  const [items, setItems] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const ctx = usePageContext("admin-stock", null);
  const { industryProfile, tenantId } = useTenant();
  const profile =
    INDUSTRY_PROFILES[industryProfile] || INDUSTRY_PROFILES.cannabis_retail;
  const visibleCategories =
    profile.inventoryCategories === "non_cannabis"
      ? Object.keys(CATEGORY_LABELS).filter(
          (k) => !CANNABIS_ONLY_CATEGORIES.includes(k),
        )
      : Object.keys(CATEGORY_LABELS);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiveOpen, setReceiveOpen] = useState(false);

  // GAP-02: write a system_alert (non-blocking, fire-and-forget)
  const writeAlert = useCallback(async (alertType, severity, title, body) => {
    if (!tenantId) return;
    try {
      const { count } = await supabase
        .from("system_alerts")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("alert_type", alertType)
        .is("acknowledged_at", null);
      if (count > 0) return;
      await supabase.from("system_alerts").insert({
        tenant_id: tenantId,
        alert_type: alertType,
        severity,
        status: "open",
        title,
        body: body || null,
        source_table: "inventory_items",
      });
    } catch (_) {}
  }, []);

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [iR, mR, sR, oR] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("*, suppliers(name)")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("stock_movements")
          .select("*, inventory_items(name, sku)")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("suppliers").select("*").order("name"),
        supabase
          .from("purchase_orders")
          .select(
            "*, suppliers(name, country, currency), purchase_order_items(*, supplier_products(name, sku, category))",
          )
          .order("created_at", { ascending: false }),
      ]);
      if (iR.error) throw iR.error;
      if (mR.error) throw mR.error;
      if (sR.error) throw sR.error;
      if (oR.error) throw oR.error;
      const fetchedItems = iR.data || [];
      setItems(fetchedItems);
      setMovements(mR.data || []);
      setSuppliers(sR.data || []);
      setOrders(oR.data || []);

      // GAP-02: fire alerts for depleted + low stock
      const active = fetchedItems.filter((i) => i.is_active);
      const depleted = active.filter(
        (i) => parseFloat(i.quantity_on_hand || 0) <= 0,
      );
      const lowStock = active.filter(
        (i) =>
          parseFloat(i.reorder_level || 0) > 0 &&
          parseFloat(i.quantity_on_hand || 0) <=
            parseFloat(i.reorder_level || 0) &&
          parseFloat(i.quantity_on_hand || 0) > 0,
      );
      if (depleted.length > 0) {
        writeAlert(
          "stock_depleted",
          "critical",
          `${depleted.length} item${depleted.length > 1 ? "s" : ""} out of stock`,
          depleted
            .map((i) => `${i.name} (${i.sku}): 0 ${i.unit || "units"}`)
            .join(" · "),
        );
      }
      if (lowStock.length > 0) {
        writeAlert(
          "reorder_threshold",
          "warning",
          `${lowStock.length} item${lowStock.length > 1 ? "s" : ""} below reorder level`,
          lowStock
            .map(
              (i) =>
                `${i.name}: ${i.quantity_on_hand} ${i.unit || "units"} (min ${i.reorder_level})`,
            )
            .join(" · "),
        );
      }
    } catch (err) {
      console.error("[StockControl] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // GAP-02: read system_alerts for stock types
  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("system_alerts")
        .select("id,title,body,severity,status,created_at")
        .in("alert_type", ["stock_depleted", "reorder_threshold"])
        .in("status", ["open", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(5);
      setStockAlerts(data || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchAlerts();
    const sub = supabase
      .channel("admin-stock-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_alerts" },
        fetchAlerts,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchAlerts]);

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "items", label: "Items" },
    { id: "movements", label: "Movements" },
    { id: "orders", label: "Purchase Orders" },
    { id: "suppliers", label: "Suppliers" },
  ];

  if (error)
    return (
      <div
        style={{
          ...sCard,
          borderLeft: `3px solid ${T.danger}`,
          margin: "20px 0",
        }}
      >
        <div style={sLabel}>Error</div>
        <p style={{ fontSize: "13px", color: T.danger }}>{error}</p>
        <button onClick={fetchAll} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );

  // WorkflowGuide hidden on this component (Option A): ctx.warnings → ActionCentre
  const ctxAlerts =
    ctx && !ctx.loading
      ? (ctx.warnings || []).map((w) => ({
          severity: "warn",
          message: String(w).replace(/^⚠\s*/, ""),
        }))
      : [];

  return (
    <div style={{ fontFamily: T.fontUi }}>
      {ctxAlerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <ActionCentre title="Stock Alerts" alerts={ctxAlerts} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "12px",
        }}
      >
        <button
          onClick={() => setReceiveOpen(true)}
          style={{
            padding: "7px 18px",
            background: T.accentMid,
            border: "none",
            borderRadius: T.radius.sm,
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: T.fontUi,
            color: "#fff",
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}
        >
          📦 Receive Delivery
        </button>
      </div>

      {/* Alerts handled globally by AlertsBar */}

      {/* Sub-tab bar — standard underline style */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${T.ink150}`,
          marginBottom: "24px",
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom:
                subTab === t.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              fontFamily: T.fontUi,
              fontSize: "11px",
              fontWeight: subTab === t.id ? 700 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: subTab === t.id ? T.accent : T.ink500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: T.ink500 }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: `2px solid ${T.ink150}`,
              borderTopColor: T.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Loading stock data...
        </div>
      ) : (
        <>
          {subTab === "overview" && (
            <OverviewView items={items} movements={movements} orders={orders} />
          )}
          {subTab === "items" && (
            <ItemsView
              items={items}
              suppliers={suppliers}
              movements={movements}
              visibleCategories={visibleCategories}
              industryProfile={industryProfile}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "movements" && (
            <MovementsView
              movements={movements}
              items={items}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "orders" && (
            <OrdersView
              orders={orders}
              suppliers={suppliers}
              items={items}
              onRefresh={fetchAll}
            />
          )}
          {subTab === "suppliers" && (
            <SuppliersView suppliers={suppliers} onRefresh={fetchAll} />
          )}
        </>
      )}
      {receiveOpen && tenantId && (
        <StockReceiveModal
          tenantId={tenantId}
          onClose={() => setReceiveOpen(false)}
          onComplete={() => {
            fetchAll();
            setReceiveOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Stat card — no coloured top border ──────────────────────────────────────
function StatCard({ label, value, sub, semantic }) {
  const colors = {
    success: T.success,
    warning: T.warning,
    danger: T.danger,
    info: T.info,
  };
  const color = semantic ? colors[semantic] : T.ink900;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.ink150}`,
        borderRadius: T.radius.md,
        padding: "16px 18px",
        boxShadow: T.shadow,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: T.ink400,
          marginBottom: "6px",
          fontFamily: T.fontUi,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.fontData,
          fontSize: "26px",
          fontWeight: 400,
          color,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "11px",
            color: T.ink500,
            marginTop: "4px",
            fontFamily: T.fontUi,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewView({ items, movements, orders }) {
  const active = items.filter((i) => i.is_active);
  const lowStock = active.filter(
    (i) =>
      availQty(i) <= parseFloat(i.reorder_level || 0) &&
      parseFloat(i.reorder_level || 0) > 0 &&
      availQty(i) > 0,
  );
  const outOfStock = active.filter((i) => availQty(i) <= 0);
  const totalReserved = active.reduce(
    (s, i) => s + parseFloat(i.reserved_qty || 0),
    0,
  );
  const totalValue = active.reduce((s, i) => s + availQty(i) * i.sell_price, 0);
  const totalCost = active.reduce(
    (s, i) => s + availQty(i) * (i.weighted_avg_cost ?? i.cost_price ?? 0),
    0,
  );
  const pendingPOs = orders.filter(
    (o) =>
      !["received", "cancelled", "complete"].includes(o.po_status || o.status),
  );
  const liveCount = active.filter(isLiveInShop).length;
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const deadStock = active.filter(
    (i) =>
      parseFloat(i.quantity_on_hand || 0) > 0 &&
      i.last_movement_at &&
      new Date(i.last_movement_at) < sixtyDaysAgo,
  );
  const overstockItems = active.filter(
    (i) =>
      parseFloat(i.max_stock_level || 0) > 0 &&
      parseFloat(i.quantity_on_hand || 0) > parseFloat(i.max_stock_level || 0),
  );
  const catBreak = {};
  active.forEach((i) => {
    if (!catBreak[i.category]) catBreak[i.category] = { count: 0, value: 0 };
    catBreak[i.category].count++;
    catBreak[i.category].value += i.quantity_on_hand * i.sell_price;
  });
  const recent = movements.slice(0, 8);

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Metric grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: T.radius.md,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
        }}
      >
        {[
          { label: "Total SKUs", value: active.length, semantic: "success" },
          {
            label: "Stock Value",
            value: `R${totalValue.toLocaleString()}`,
            semantic: null,
          },
          {
            label: "Stock Cost",
            value: `R${totalCost.toLocaleString()}`,
            semantic: "info",
          },
          {
            label: "Low Stock",
            value: lowStock.length,
            semantic: lowStock.length > 0 ? "warning" : "success",
          },
          {
            label: "Out of Stock",
            value: outOfStock.length,
            semantic: outOfStock.length > 0 ? "danger" : "success",
          },
          { label: "Open POs", value: pendingPOs.length, semantic: "info" },
          {
            label: "Live in Shop",
            value: liveCount,
            semantic: liveCount > 0 ? "success" : null,
          },
          {
            label: "Reserved",
            value: Math.floor(totalReserved),
            semantic: totalReserved > 0 ? "warning" : null,
          },
        ].map((s, i) => {
          const colors = {
            success: T.success,
            warning: T.warning,
            danger: T.danger,
            info: T.info,
          };
          const color = s.semantic ? colors[s.semantic] : T.ink900;
          return (
            <div key={i} style={{ background: T.surface, padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: "6px",
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: T.fontData,
                  fontSize: "24px",
                  fontWeight: 400,
                  color,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CHARTS: Stock by category + Stock health bar ── */}
      {active.length > 0 &&
        (() => {
          const catBarData = Object.entries(catBreak).map(([cat, d]) => ({
            name: (CATEGORY_LABELS[cat] || cat).split(" ")[0],
            items: d.count,
            value: Math.round(d.value),
            color: CATEGORY_COLORS[cat] || T.ink400,
          }));

          const healthBarData = [
            {
              name: "Healthy",
              value: active.length - lowStock.length - outOfStock.length,
              color: T.success,
            },
            { name: "Low", value: lowStock.length, color: T.warning },
            { name: "Out", value: outOfStock.length, color: T.danger },
          ].filter((d) => d.value > 0);

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 16,
                marginBottom: 0,
              }}
            >
              <ChartCard title="Stock Items by Category" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={catBarData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.ink150}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: T.ink400,
                        fontSize: 11,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink400,
                        fontSize: 11,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={24}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v, n) =>
                            n === "items"
                              ? `${v} SKUs`
                              : `R${v.toLocaleString("en-ZA")}`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="items"
                      name="items"
                      isAnimationActive={false}
                      maxBarSize={40}
                      radius={[3, 3, 0, 0]}
                    >
                      {catBarData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Stock Health" height={200}>
                <div
                  style={{
                    padding: "16px 8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    height: "100%",
                    justifyContent: "center",
                  }}
                >
                  {healthBarData.map((d) => (
                    <div key={d.name}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: d.color,
                            fontFamily: T.font,
                          }}
                        >
                          {d.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: T.fontData,
                            color: T.ink400,
                          }}
                        >
                          {d.value} SKU{d.value !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <InlineProgressBar
                        value={
                          active.length > 0
                            ? (d.value / active.length) * 100
                            : 0
                        }
                        max={100}
                      />
                    </div>
                  ))}
                  <div
                    style={{
                      fontSize: 11,
                      color: T.ink400,
                      fontFamily: T.fontUi,
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    {active.length} total active SKUs
                  </div>
                </div>
              </ChartCard>
            </div>
          );
        })()}

      {/* AVCO Variance panel */}
      {(() => {
        const drifted = active.filter(
          (i) =>
            i.weighted_avg_cost &&
            i.cost_price &&
            Math.abs((i.weighted_avg_cost - i.cost_price) / i.cost_price) >
              0.05,
        );
        if (drifted.length === 0) return null;
        return (
          <div
            style={{
              background: T.warningBg,
              border: `1px solid ${T.warningBd}`,
              borderRadius: T.radius.md,
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: "10px",
              }}
            >
              Cost Drift — {drifted.length} item{drifted.length > 1 ? "s" : ""}{" "}
              where real cost differs from recorded cost price by &gt;5%
            </div>
            {drifted.map((item) => {
              const drift =
                ((item.weighted_avg_cost - item.cost_price) / item.cost_price) *
                100;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: `1px solid ${T.warningBd}`,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: T.ink900,
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: T.ink500,
                        marginLeft: "8px",
                        fontFamily: T.fontData,
                      }}
                    >
                      {item.sku}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", gap: 16, alignItems: "center" }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: T.ink400,
                        fontFamily: T.fontData,
                      }}
                    >
                      Recorded: R{(item.cost_price || 0).toFixed(2)}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: T.warning,
                        fontFamily: T.fontData,
                      }}
                    >
                      AVCO: R{item.weighted_avg_cost.toFixed(2)}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: drift > 0 ? T.danger : T.success,
                        fontFamily: T.fontData,
                      }}
                    >
                      {drift > 0 ? "▲" : "▼"} {Math.abs(drift).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Inline Low Stock Alerts removed — now surfaced via ActionCentre at top (ctx.warnings) */}

      {/* Category breakdown */}
      <div style={sCard}>
        <div style={sLabel}>Stock by Category</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: "12px",
            marginTop: "12px",
          }}
        >
          {Object.entries(catBreak).map(([cat, d]) => (
            <div
              key={cat}
              style={{
                padding: "12px 14px",
                background: T.ink075,
                border: `1px solid ${T.ink150}`,
                borderRadius: T.radius.md,
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: CATEGORY_COLORS[cat] || T.ink500,
                  marginBottom: "4px",
                  fontWeight: 700,
                }}
              >
                {CATEGORY_LABELS[cat] || cat}
              </div>
              <div
                style={{
                  fontFamily: T.fontData,
                  fontSize: "18px",
                  fontWeight: 400,
                  color: T.ink900,
                }}
              >
                {d.count} items
              </div>
              <div style={{ fontSize: "11px", color: T.ink500 }}>
                R{d.value.toLocaleString()} value
              </div>
            </div>
          ))}
        </div>
      </div>

      {deadStock.length > 0 && (
        <div
          style={{
            ...sCard,
            border: `1px solid ${T.warningBd}`,
            borderLeft: `3px solid ${T.warning}`,
          }}
        >
          <div style={{ ...sLabel, color: T.warning, marginBottom: 10 }}>
            Dead Stock — No Movement 60+ Days ({deadStock.length} item
            {deadStock.length > 1 ? "s" : ""})
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: T.fontUi,
              marginTop: 10,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Item</th>
                <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                <th style={sTh}>Last Movement</th>
                <th style={{ ...sTh, textAlign: "right" }}>Tied-up Value</th>
              </tr>
            </thead>
            <tbody>
              {deadStock.map((i) => {
                const daysIdle = Math.floor(
                  (Date.now() - new Date(i.last_movement_at)) / 86400000,
                );
                const val =
                  parseFloat(i.quantity_on_hand || 0) *
                  parseFloat(i.weighted_avg_cost || i.cost_price || 0);
                return (
                  <tr key={i.id}>
                    <td style={{ ...sTd, fontWeight: 500 }}>{i.name}</td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                        fontWeight: 600,
                      }}
                    >
                      {Math.floor(parseFloat(i.quantity_on_hand || 0))} {i.unit}
                    </td>
                    <td style={{ ...sTd, color: T.warning }}>
                      {daysIdle} days ago
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                      }}
                    >
                      R{val.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {overstockItems.length > 0 && (
        <div
          style={{
            ...sCard,
            border: `1px solid ${T.infoBd}`,
            borderLeft: `3px solid ${T.info}`,
          }}
        >
          <div style={{ ...sLabel, color: T.info, marginBottom: 10 }}>
            Overstock — Exceeds Max Level ({overstockItems.length} item
            {overstockItems.length > 1 ? "s" : ""})
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: T.fontUi,
              marginTop: 10,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Item</th>
                <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                <th style={{ ...sTh, textAlign: "right" }}>Max Level</th>
                <th style={{ ...sTh, textAlign: "right" }}>Excess</th>
              </tr>
            </thead>
            <tbody>
              {overstockItems.map((i) => {
                const excess =
                  parseFloat(i.quantity_on_hand || 0) -
                  parseFloat(i.max_stock_level || 0);
                return (
                  <tr key={i.id}>
                    <td style={{ ...sTd, fontWeight: 500 }}>{i.name}</td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                        fontWeight: 600,
                      }}
                    >
                      {Math.floor(parseFloat(i.quantity_on_hand || 0))} {i.unit}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                        color: T.ink500,
                      }}
                    >
                      {Math.floor(parseFloat(i.max_stock_level || 0))}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                        color: T.info,
                        fontWeight: 600,
                      }}
                    >
                      +{Math.floor(excess)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent movements */}
      <div style={sCard}>
        <div style={sLabel}>Recent Stock Movements</div>
        {recent.length === 0 ? (
          <p style={{ fontSize: "13px", color: T.ink500, marginTop: "12px" }}>
            No movements recorded yet.
          </p>
        ) : (
          <table style={{ ...sTable, marginTop: "12px" }}>
            <thead>
              <tr>
                <th style={sTh}>Date</th>
                <th style={sTh}>Item</th>
                <th style={sTh}>Type</th>
                <th style={{ ...sTh, textAlign: "right" }}>Qty</th>
                <th style={sTh}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.id}>
                  <td style={sTd}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td style={sTd}>{m.inventory_items?.name || "—"}</td>
                  <td style={sTd}>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: T.radius.sm,
                        background: m.quantity >= 0 ? T.successBg : T.dangerBg,
                        color: m.quantity >= 0 ? T.success : T.danger,
                        fontWeight: 600,
                      }}
                    >
                      {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                    </span>
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.fontData,
                      fontWeight: 600,
                      color: m.quantity >= 0 ? T.success : T.danger,
                    }}
                  >
                    {m.quantity >= 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td style={{ ...sTd, color: T.ink500 }}>
                    {m.reference || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Items ────────────────────────────────────────────────────────────────────
function ItemsView({
  items,
  suppliers,
  movements,
  visibleCategories,
  industryProfile,
  onRefresh,
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [aiItem, setAiItem] = useState(null);
  const docSourceMap = buildDocSourceMap(movements);
  const isCannabis = [
    "cannabis_retail",
    "cannabis_dispensary",
    "mixed_retail",
  ].includes(industryProfile);
  const isFoodBev = industryProfile === "food_beverage";

  const filtered = items.filter((i) => {
    if (filter !== "all" && i.category !== filter) return false;
    if (
      search &&
      !i.name.toLowerCase().includes(search.toLowerCase()) &&
      !i.sku.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return i.is_active;
  });
  const liveCount = filtered.filter(isLiveInShop).length;
  const margin = (item) => {
    if (!item.cost_price || !item.sell_price) return null;
    return (
      ((item.sell_price - item.cost_price) / item.sell_price) *
      100
    ).toFixed(1);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase
          .from("inventory_items")
          .update(formData)
          .eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert(formData);
        if (error) throw error;
      }
      setShowForm(false);
      setEditItem(null);
      onRefresh();
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item) => {
    if (!window.confirm(`Deactivate "${item.name}"?`)) return;
    const { error } = await supabase
      .from("inventory_items")
      .update({ is_active: false })
      .eq("id", item.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    onRefresh();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...sInput, width: "240px" }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...sSelect, width: "180px" }}
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS)
            .filter(([k]) => visibleCategories.includes(k))
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            setEditItem(null);
            setShowForm(true);
          }}
          style={sBtn()}
        >
          + Add Item
        </button>
      </div>

      {showForm && (
        <StockItemModal
          item={editItem}
          suppliers={suppliers}
          visibleCategories={visibleCategories}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditItem(null);
          }}
          saving={saving}
        />
      )}

      <div style={{ ...sCard, padding: "0", overflow: "auto" }}>
        <table style={sTable}>
          <thead>
            <tr>
              <th style={sTh}>SKU</th>
              <th style={sTh}>Name</th>
              <th style={sTh}>Category</th>
              <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
              <th style={{ ...sTh, textAlign: "right" }}>Available</th>
              <th style={{ ...sTh, textAlign: "right" }}>Reorder</th>
              <th style={{ ...sTh, textAlign: "right" }}>Max Stock</th>
              <th style={{ ...sTh, textAlign: "right" }}>Reserved</th>
              <th style={sTh}>Last Moved</th>
              <th style={{ ...sTh, textAlign: "right" }}>Cost (Flat)</th>
              <th style={{ ...sTh, textAlign: "right" }}>AVCO</th>
              <th style={{ ...sTh, textAlign: "right" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                  }}
                >
                  Sell <InfoTooltip id="shop-visibility" />
                </span>
              </th>
              <th style={{ ...sTh, textAlign: "right" }}>Margin</th>
              <th style={sTh}>Supplier</th>
              <th style={sTh}>Source</th>
              <th style={sTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan="11"
                  style={{
                    ...sTd,
                    textAlign: "center",
                    color: T.ink500,
                    padding: "40px",
                  }}
                >
                  No items found
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isLow =
                  item.reorder_level > 0 &&
                  item.quantity_on_hand <= item.reorder_level;
                const isOut = item.quantity_on_hand <= 0;
                const live = isLiveInShop(item);
                return (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.fontData,
                          fontSize: "11px",
                          color: T.ink500,
                        }}
                      >
                        {item.sku}
                      </td>
                      <td style={{ ...sTd, fontWeight: 500 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          {item.name}
                          {live && <LiveShopBadge />}
                        </div>
                      </td>
                      <td style={sTd}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: T.radius.sm,
                            background: T.ink075,
                            color: CATEGORY_COLORS[item.category] || T.ink500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                          }}
                        >
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          fontWeight: 600,
                          color: T.ink500,
                          fontSize: "11px",
                        }}
                      >
                        {item.quantity_on_hand} {UNIT_LABELS[item.unit]}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          fontWeight: 700,
                          color:
                            availQty(item) <= 0
                              ? T.danger
                              : parseFloat(item.reserved_qty || 0) > 0
                                ? T.warning
                                : T.success,
                        }}
                      >
                        {availQty(item).toFixed(0)} {UNIT_LABELS[item.unit]}
                        {parseFloat(item.reserved_qty || 0) > 0 && (
                          <span
                            style={{
                              marginLeft: "6px",
                              fontSize: "11px",
                              padding: "1px 5px",
                              borderRadius: T.radius.sm,
                              background: T.warningBg,
                              color: T.warning,
                              fontWeight: 700,
                            }}
                          >
                            {Math.floor(parseFloat(item.reserved_qty))} held
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.fontData,
                          fontSize: "11px",
                          color: T.ink500,
                        }}
                      >
                        {item.reorder_level}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          fontSize: "11px",
                          color: T.ink500,
                        }}
                      >
                        {item.max_stock_level
                          ? Math.floor(parseFloat(item.max_stock_level))
                          : "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          fontSize: "11px",
                          color:
                            parseFloat(item.reserved_qty || 0) > 0
                              ? T.warning
                              : T.ink400,
                        }}
                      >
                        {Math.floor(parseFloat(item.reserved_qty || 0))}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink500,
                        }}
                      >
                        {item.last_movement_at
                          ? new Date(item.last_movement_at).toLocaleDateString(
                              "en-ZA",
                            )
                          : "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          color: T.ink400,
                        }}
                      >
                        R{(item.cost_price || 0).toFixed(2)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          fontWeight: item.weighted_avg_cost ? 600 : 400,
                          color: item.weighted_avg_cost
                            ? Math.abs(
                                (item.weighted_avg_cost - item.cost_price) /
                                  (item.cost_price || 1),
                              ) > 0.05
                              ? T.warning
                              : T.success
                            : T.ink400,
                        }}
                      >
                        {item.weighted_avg_cost
                          ? `R${item.weighted_avg_cost.toFixed(2)}`
                          : "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          fontWeight: 500,
                        }}
                      >
                        R{(item.sell_price || 0).toFixed(2)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          color: margin(item) ? T.success : T.ink400,
                        }}
                      >
                        {margin(item) ? `${margin(item)}%` : "—"}
                      </td>
                      <td style={{ ...sTd, fontSize: "12px", color: T.ink500 }}>
                        {item.suppliers?.name || "—"}
                      </td>
                      <td style={sTd}>
                        <DocumentSourceBadge
                          movement={docSourceMap[item.id] || null}
                        />
                      </td>
                      <td style={sTd}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() =>
                              setExpandedItemId(
                                expandedItemId === item.id ? null : item.id,
                              )
                            }
                            style={{
                              ...sBtn("outline"),
                              padding: "4px 10px",
                              fontSize: "11px",
                              color:
                                expandedItemId === item.id
                                  ? T.accent
                                  : T.ink500,
                              borderColor:
                                expandedItemId === item.id
                                  ? T.accentBd
                                  : T.ink150,
                              background:
                                expandedItemId === item.id
                                  ? T.accentLit
                                  : "transparent",
                            }}
                            title="Expand details"
                          >
                            {expandedItemId === item.id ? "▲" : "▼"}
                          </button>
                          <button
                            onClick={() => setHistoryItem(item)}
                            style={{
                              ...sBtn("outline"),
                              padding: "4px 10px",
                              fontSize: "11px",
                              color: T.info,
                              borderColor: T.infoBd,
                            }}
                            title="View history"
                          >
                            Log
                          </button>
                          <button
                            onClick={() => {
                              setEditItem(item);
                              setShowForm(true);
                            }}
                            style={{
                              ...sBtn("outline"),
                              padding: "4px 10px",
                              fontSize: "11px",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeactivate(item)}
                            style={{
                              ...sBtn("outline"),
                              padding: "4px 10px",
                              fontSize: "11px",
                              color: T.danger,
                              borderColor: T.dangerBd,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedItemId === item.id && (
                      <tr key={`${item.id}-exp`}>
                        <td
                          colSpan="17"
                          style={{
                            padding: 0,
                            borderBottom: `2px solid ${T.accentBd}`,
                          }}
                        >
                          <StockItemExpandedCard
                            item={item}
                            movements={movements.filter(
                              (m) => m.item_id === item.id,
                            )}
                            industryProfile={industryProfile}
                            isCannabis={isCannabis}
                            isFoodBev={isFoodBev}
                            onEdit={() => {
                              setEditItem(item);
                              setShowForm(true);
                              setExpandedItemId(null);
                            }}
                            onHistory={() => setHistoryItem(item)}
                            onAI={() => setAiItem(item)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div
        style={{
          fontSize: "11px",
          color: T.ink500,
          marginTop: "12px",
          textAlign: "right",
        }}
      >
        Showing {filtered.length} of {items.filter((i) => i.is_active).length}{" "}
        active items
        {liveCount > 0 && (
          <span style={{ marginLeft: 12, color: T.success }}>
            · {liveCount} live in shop
          </span>
        )}
        {Object.keys(docSourceMap).length > 0 && (
          <span style={{ marginLeft: 12, color: T.info }}>
            · {Object.keys(docSourceMap).length} via doc ingestion
          </span>
        )}
      </div>
      {historyItem && (
        <ItemHistoryModal
          item={historyItem}
          movements={movements.filter((m) => m.item_id === historyItem.id)}
          onClose={() => setHistoryItem(null)}
        />
      )}
      {aiItem && (
        <StockAIAnalysis
          item={aiItem}
          industryProfile={industryProfile}
          movements={movements.filter((m) => m.item_id === aiItem.id)}
          onClose={() => setAiItem(null)}
        />
      )}
    </div>
  );
}

// ─── Stock Item Expanded Card ─────────────────────────────────────────────────
function StockItemExpandedCard({
  item,
  movements,
  industryProfile,
  isCannabis,
  isFoodBev,
  onEdit,
  onHistory,
  onAI,
}) {
  const recent = [...(movements || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  const availQtyVal = Math.max(
    0,
    parseFloat(item.quantity_on_hand || 0) - parseFloat(item.reserved_qty || 0),
  );
  const margin =
    item.sell_price && item.cost_price
      ? (((item.sell_price - item.cost_price) / item.sell_price) * 100).toFixed(
          1,
        )
      : null;
  const allergens = item.allergen_flags
    ? Object.entries(item.allergen_flags)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : [];
  const daysToExpiry = item.expiry_date
    ? Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000)
    : null;

  const MOVEMENT_TYPE_LABELS = {
    purchase_in: "Purchase In",
    sale_out: "Sale Out",
    production_out: "Production Out",
    production_in: "Production In",
    adjustment: "Adjustment",
    waste: "Waste",
  };

  return (
    <div
      style={{
        padding: "20px 24px",
        background: T.accentLit,
        borderTop: `1px solid ${T.accentBd}`,
        fontFamily: T.fontUi,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Core metrics */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.ink150}`,
            borderRadius: T.radius.md,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.ink400,
              marginBottom: 10,
            }}
          >
            Stock Position
          </div>
          {[
            [
              "On Hand",
              `${parseFloat(item.quantity_on_hand || 0).toFixed(2)} ${item.unit}`,
              item.quantity_on_hand <= 0 ? T.danger : T.success,
            ],
            [
              "Reserved",
              `${parseFloat(item.reserved_qty || 0).toFixed(0)} ${item.unit}`,
              parseFloat(item.reserved_qty || 0) > 0 ? T.warning : T.ink400,
            ],
            [
              "Available",
              `${availQtyVal.toFixed(2)} ${item.unit}`,
              availQtyVal <= 0 ? T.danger : T.success,
            ],
            [
              "Reorder At",
              item.reorder_level ? `${item.reorder_level} ${item.unit}` : "—",
              T.ink400,
            ],
            [
              "Max Stock",
              item.max_stock_level
                ? `${item.max_stock_level} ${item.unit}`
                : "—",
              T.ink400,
            ],
          ].map(([label, value, color]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                borderBottom: `1px solid ${T.ink075}`,
                fontSize: 12,
              }}
            >
              <span style={{ color: T.ink500 }}>{label}</span>
              <span style={{ fontFamily: T.fontData, fontWeight: 600, color }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing + profile-specific */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.ink150}`,
            borderRadius: T.radius.md,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.ink400,
              marginBottom: 10,
            }}
          >
            {isFoodBev ? "Product Details" : "Pricing"}
          </div>
          {[
            [
              "Cost (AVCO)",
              item.weighted_avg_cost
                ? `R${parseFloat(item.weighted_avg_cost).toFixed(2)}`
                : item.cost_price
                  ? `R${parseFloat(item.cost_price).toFixed(2)}`
                  : "—",
              T.ink700,
            ],
            [
              "Sell Price",
              item.sell_price
                ? `R${parseFloat(item.sell_price).toFixed(2)}`
                : "—",
              item.sell_price > 0 ? T.ink700 : T.danger,
            ],
            [
              "Margin",
              margin ? `${margin}%` : "—",
              margin
                ? parseFloat(margin) >= 35
                  ? T.success
                  : parseFloat(margin) >= 20
                    ? T.warning
                    : T.danger
                : T.ink400,
            ],
            ...(isFoodBev
              ? [
                  [
                    "Expiry",
                    item.expiry_date
                      ? new Date(item.expiry_date).toLocaleDateString("en-ZA")
                      : "—",
                    daysToExpiry !== null
                      ? daysToExpiry < 0
                        ? T.danger
                        : daysToExpiry < 30
                          ? T.warning
                          : T.success
                      : T.ink400,
                  ],
                  [
                    "Days Left",
                    daysToExpiry !== null ? `${daysToExpiry} days` : "—",
                    daysToExpiry !== null
                      ? daysToExpiry < 0
                        ? T.danger
                        : daysToExpiry < 30
                          ? T.warning
                          : T.success
                      : T.ink400,
                  ],
                  [
                    "Shelf Life",
                    item.shelf_life_days ? `${item.shelf_life_days} days` : "—",
                    T.ink400,
                  ],
                ]
              : []),
            ...(isCannabis && item.medium_type
              ? [
                  [
                    "Medium Type",
                    item.medium_type.replace(/_/g, " "),
                    T.accentMid,
                  ],
                ]
              : []),
          ].map(([label, value, color]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                borderBottom: `1px solid ${T.ink075}`,
                fontSize: 12,
              }}
            >
              <span style={{ color: T.ink500 }}>{label}</span>
              <span style={{ fontFamily: T.fontData, fontWeight: 600, color }}>
                {value}
              </span>
            </div>
          ))}
          {isFoodBev && allergens.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  color: T.warning,
                  fontWeight: 700,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                ⚠ Allergens
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {allergens.map((a) => (
                  <span
                    key={a}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: T.radius.sm,
                      background: T.warningBg,
                      color: T.warning,
                      border: `1px solid ${T.warningBd}`,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent movements */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.ink150}`,
            borderRadius: T.radius.md,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.ink400,
              marginBottom: 10,
            }}
          >
            Recent Movements
          </div>
          {recent.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: T.ink300,
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              No movements yet
            </div>
          ) : (
            recent.map((m, i) => (
              <div
                key={m.id || i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 0",
                  borderBottom: `1px solid ${T.ink075}`,
                  fontSize: 11,
                }}
              >
                <div>
                  <div style={{ color: T.ink700, fontWeight: 500 }}>
                    {MOVEMENT_TYPE_LABELS[m.movement_type] || m.movement_type}
                  </div>
                  <div style={{ color: T.ink400, fontSize: 10 }}>
                    {m.created_at
                      ? new Date(m.created_at).toLocaleDateString("en-ZA")
                      : "—"}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: T.fontData,
                    fontWeight: 700,
                    fontSize: 12,
                    color: parseFloat(m.quantity) >= 0 ? T.success : T.danger,
                  }}
                >
                  {parseFloat(m.quantity) >= 0 ? "+" : ""}
                  {parseFloat(m.quantity).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Storage + action buttons */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {item.storage_instructions && (
          <div
            style={{
              flex: 1,
              padding: "8px 12px",
              background: T.infoBg,
              border: `1px solid ${T.infoBd}`,
              borderRadius: T.radius.md,
              fontSize: 11,
              color: T.info,
            }}
          >
            <strong>Storage:</strong> {item.storage_instructions}
          </div>
        )}
        {item.ingredients_notes && (
          <div
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#E8F5E9",
              border: "1px solid #A5D6A7",
              borderRadius: T.radius.md,
              fontSize: 11,
              color: "#2E7D32",
            }}
          >
            <strong>Ingredients:</strong> {item.ingredients_notes}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button
            onClick={onHistory}
            style={{
              padding: "7px 14px",
              borderRadius: T.radius.sm,
              border: `1px solid ${T.infoBd}`,
              background: T.infoBg,
              color: T.info,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: T.fontUi,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Full History
          </button>
          <button
            onClick={onEdit}
            style={{
              padding: "7px 14px",
              borderRadius: T.radius.sm,
              border: `1px solid ${T.accentBd}`,
              background: T.accentLit,
              color: T.accentMid,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: T.fontUi,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Edit Item
          </button>
          <button
            onClick={onAI}
            style={{
              padding: "7px 14px",
              borderRadius: T.radius.sm,
              border: "none",
              background: T.accent,
              color: "#fff",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: T.fontUi,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            ✦ AI Analyse
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item History Modal ───────────────────────────────────────────────────────
function ItemHistoryModal({ item, movements, onClose }) {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
  let running = 0;
  const rows = sorted.map((m) => {
    running += parseFloat(m.quantity || 0);
    return { ...m, runningBalance: running };
  });
  const display = [...rows].reverse();
  const totalIn = sorted
    .filter((m) => m.quantity > 0)
    .reduce((s, m) => s + parseFloat(m.quantity), 0);
  const totalOut = sorted
    .filter((m) => m.quantity < 0)
    .reduce((s, m) => s + parseFloat(m.quantity), 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(640px,100vw)",
          height: "100vh",
          background: T.surface,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${T.ink150}`,
            background: T.ink050,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: "4px",
                }}
              >
                Stock Audit Trail
              </div>
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: "20px",
                  fontWeight: 600,
                  color: T.accent,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontFamily: T.fontData,
                  fontSize: "11px",
                  color: T.ink500,
                  marginTop: "2px",
                }}
              >
                {item.sku} · {CATEGORY_LABELS[item.category]} · {item.unit}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: T.ink400,
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Current Stock",
                value: `${item.quantity_on_hand} ${item.unit}`,
                color: item.quantity_on_hand <= 0 ? T.danger : T.success,
              },
              {
                label: "Total In",
                value: `+${totalIn.toFixed(2)}`,
                color: T.success,
              },
              {
                label: "Total Out",
                value: totalOut.toFixed(2),
                color: T.danger,
              },
              { label: "Movements", value: movements.length, color: T.ink500 },
              {
                label: "Cost Price",
                value: `R${(item.cost_price || 0).toFixed(2)}`,
                color: T.warning,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.ink150}`,
                  borderRadius: T.radius.sm,
                  padding: "10px 14px",
                  minWidth: "90px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: T.ink400,
                    fontFamily: T.fontUi,
                    marginBottom: "4px",
                    fontWeight: 700,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: T.fontData,
                    fontSize: "16px",
                    fontWeight: 600,
                    color: s.color,
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {display.length === 0 ? (
            <div
              style={{
                padding: "48px",
                textAlign: "center",
                color: T.ink500,
                fontSize: "13px",
              }}
            >
              No movements recorded yet.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                fontFamily: T.fontUi,
              }}
            >
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    background: T.ink075,
                    zIndex: 1,
                  }}
                >
                  <th style={{ ...sTh, padding: "10px 16px" }}>Date & Time</th>
                  <th style={{ ...sTh, padding: "10px 8px" }}>Type</th>
                  <th
                    style={{ ...sTh, textAlign: "right", padding: "10px 8px" }}
                  >
                    Qty
                  </th>
                  <th
                    style={{ ...sTh, textAlign: "right", padding: "10px 8px" }}
                  >
                    Balance
                  </th>
                  <th style={{ ...sTh, padding: "10px 8px" }}>Reference</th>
                  <th
                    style={{ ...sTh, textAlign: "right", padding: "10px 8px" }}
                  >
                    Unit Cost
                  </th>
                  <th style={{ ...sTh, padding: "10px 16px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {display.map((m, i) => (
                  <tr
                    key={m.id}
                    style={{ background: i % 2 === 0 ? "#fff" : T.ink050 }}
                  >
                    <td
                      style={{ ...sTd, padding: "10px 16px", fontSize: "11px" }}
                    >
                      <div style={{ color: T.ink900, fontWeight: 500 }}>
                        {new Date(m.created_at).toLocaleDateString("en-ZA")}
                      </div>
                      <div style={{ fontSize: "11px", color: T.ink500 }}>
                        {new Date(m.created_at).toLocaleTimeString("en-ZA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td style={{ ...sTd, padding: "10px 8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: T.radius.sm,
                          background:
                            m.quantity >= 0 ? T.successBg : T.dangerBg,
                          color: m.quantity >= 0 ? T.success : T.danger,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        padding: "10px 8px",
                        fontFamily: T.fontData,
                        fontWeight: 700,
                        fontSize: "13px",
                        color: m.quantity >= 0 ? T.success : T.danger,
                      }}
                    >
                      {m.quantity >= 0 ? "+" : ""}
                      {parseFloat(m.quantity).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        padding: "10px 8px",
                        fontFamily: T.fontData,
                        fontWeight: 600,
                        fontSize: "13px",
                        color: m.runningBalance <= 0 ? T.danger : T.ink900,
                      }}
                    >
                      {m.runningBalance.toFixed(2)}
                      <span
                        style={{
                          fontSize: "11px",
                          color: T.ink400,
                          marginLeft: "3px",
                          fontFamily: T.fontUi,
                          fontWeight: 400,
                        }}
                      >
                        {item.unit}
                      </span>
                    </td>
                    <td
                      style={{
                        ...sTd,
                        padding: "10px 8px",
                        fontSize: "11px",
                        color: T.info,
                        fontFamily: T.fontData,
                      }}
                    >
                      {m.reference || "—"}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        padding: "10px 8px",
                        fontFamily: T.fontData,
                        fontSize: "11px",
                        color: m.unit_cost ? T.ink700 : T.ink300,
                      }}
                    >
                      {m.unit_cost
                        ? `R${parseFloat(m.unit_cost).toFixed(2)}`
                        : "—"}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        padding: "10px 16px",
                        fontSize: "11px",
                        color: T.ink500,
                        maxWidth: "180px",
                      }}
                    >
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={m.notes || ""}
                      >
                        {m.notes || "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${T.ink150}`,
            background: T.ink050,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11px", color: T.ink500 }}>
            {movements.length} total · balance:{" "}
            <strong>
              {item.quantity_on_hand} {item.unit}
            </strong>
          </span>
          <button onClick={onClose} style={sBtn()}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item Form ────────────────────────────────────────────────────────────────
function ItemForm({
  item,
  suppliers,
  visibleCategories,
  onSave,
  onCancel,
  saving,
}) {
  const [form, setForm] = useState({
    sku: item?.sku || "",
    name: item?.name || "",
    category: item?.category || "finished_product",
    unit: item?.unit || "pcs",
    description: item?.description || "",
    quantity_on_hand: item?.quantity_on_hand || 0,
    reorder_level: item?.reorder_level || 0,
    cost_price: item?.cost_price || 0,
    sell_price: item?.sell_price || 0,
    supplier_id: item?.supplier_id || "",
    batch_number: item?.batch_number || "",
    expiry_date: item?.expiry_date || "",
    strain_id: item?.strain_id || "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const handleSubmit = () => {
    if (!form.sku.trim() || !form.name.trim()) {
      alert("SKU and Name are required.");
      return;
    }
    onSave({
      ...form,
      quantity_on_hand: parseFloat(form.quantity_on_hand) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
      strain_id: form.strain_id || null,
    });
  };
  const fr = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  };
  const lbl = (t, note) => (
    <label
      style={{
        fontSize: "11px",
        color: T.ink500,
        display: "block",
        marginBottom: "4px",
      }}
    >
      {t}
      {note && (
        <span style={{ marginLeft: 6, fontSize: "11px", color: T.accentMid }}>
          {note}
        </span>
      )}
    </label>
  );
  const willBeLive =
    form.category === "finished_product" &&
    parseFloat(form.sell_price || 0) > 0 &&
    parseFloat(form.quantity_on_hand || 0) > 0;

  return (
    <div style={{ ...sCard, marginBottom: "20px" }}>
      <div style={{ ...sLabel, marginBottom: "16px" }}>
        {item ? "Edit Item" : "Add New Item"}
      </div>
      <div style={fr}>
        <div>
          {lbl("SKU *")}
          <input
            style={sInput}
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="e.g. FP-CART-PE"
          />
        </div>
        <div>
          {lbl("Name *")}
          <input
            style={sInput}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Category")}
          <select
            style={sSelect}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {Object.entries(CATEGORY_LABELS)
              .filter(([k]) => visibleCategories.includes(k))
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </div>
        <div>
          {lbl("Unit")}
          <select
            style={sSelect}
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
          >
            {Object.entries(UNIT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Quantity On Hand")}
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.quantity_on_hand}
            onChange={(e) => set("quantity_on_hand", e.target.value)}
          />
        </div>
        <div>
          {lbl("Reorder Level")}
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.reorder_level}
            onChange={(e) => set("reorder_level", e.target.value)}
          />
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Cost Price (ZAR)")}
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.cost_price}
            onChange={(e) => set("cost_price", e.target.value)}
          />
        </div>
        <div>
          {lbl(
            "Sell Price (ZAR)",
            form.category === "finished_product" ? "← shown in shop" : null,
          )}
          <input
            style={sInput}
            type="number"
            step="0.01"
            value={form.sell_price}
            onChange={(e) => set("sell_price", e.target.value)}
          />
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Supplier")}
          <select
            style={sSelect}
            value={form.supplier_id}
            onChange={(e) => set("supplier_id", e.target.value)}
          >
            <option value="">— None —</option>
            {suppliers
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          {lbl("Batch Number")}
          <input
            style={sInput}
            value={form.batch_number}
            onChange={(e) => set("batch_number", e.target.value)}
          />
        </div>
      </div>
      <div style={fr}>
        <div>
          {lbl("Expiry Date")}
          <input
            style={sInput}
            type="date"
            value={form.expiry_date}
            onChange={(e) => set("expiry_date", e.target.value)}
          />
        </div>
        <div>
          {lbl(
            "Strain ID",
            form.category === "finished_product"
              ? "← links to shop profile"
              : null,
          )}
          <input
            style={sInput}
            value={form.strain_id}
            onChange={(e) => set("strain_id", e.target.value)}
            placeholder="e.g. pineapple-express"
          />
        </div>
      </div>
      <div style={{ marginBottom: "12px" }}>
        {lbl("Description")}
        <textarea
          style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {form.category === "finished_product" && (
        <div
          style={{
            background: willBeLive ? T.successBg : T.warningBg,
            border: `1px solid ${willBeLive ? T.successBd : T.warningBd}`,
            borderRadius: T.radius.md,
            padding: "14px 16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: willBeLive ? T.success : T.warning,
              marginBottom: "6px",
            }}
          >
            Shop Listing
          </div>
          {willBeLive ? (
            <div
              style={{ fontSize: "13px", fontWeight: 600, color: T.success }}
            >
              Will appear in customer shop — R
              {parseFloat(form.sell_price).toLocaleString("en-ZA", {
                minimumFractionDigits: 2,
              })}{" "}
              · {form.quantity_on_hand} {form.unit}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: T.warning }}>
              Not yet live — requires: finished_product · sell price &gt; R0 ·
              stock &gt; 0
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={sBtn("outline")}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} style={sBtn()}>
          {saving ? "Saving..." : item ? "Update Item" : "Create Item"}
        </button>
      </div>
    </div>
  );
}

// ─── Movements ────────────────────────────────────────────────────────────────
function MovementsView({ movements, items, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    item_id: "",
    quantity: "",
    movement_type: "purchase_in",
    reference: "",
    notes: "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleRecord = async () => {
    if (!form.item_id || !form.quantity) {
      alert("Select an item and enter quantity.");
      return;
    }
    setSaving(true);
    try {
      const qty = parseFloat(form.quantity);
      const isOut = ["sale_out", "waste", "production_out"].includes(
        form.movement_type,
      );
      const finalQty = isOut ? -Math.abs(qty) : Math.abs(qty);
      const { error: mE } = await supabase.from("stock_movements").insert({
        item_id: form.item_id,
        quantity: finalQty,
        movement_type: form.movement_type,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      if (mE) throw mE;
      const item = items.find((i) => i.id === form.item_id);
      if (item) {
        const { error: uE } = await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: (item.quantity_on_hand || 0) + finalQty })
          .eq("id", form.item_id);
        if (uE) throw uE;
      }
      setShowForm(false);
      setForm({
        item_id: "",
        quantity: "",
        movement_type: "purchase_in",
        reference: "",
        notes: "",
      });
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "11px", color: T.ink500 }}>
          {movements.length} movements recorded
        </div>
        <button onClick={() => setShowForm(!showForm)} style={sBtn()}>
          {showForm ? "Cancel" : "+ Record Movement"}
        </button>
      </div>
      {showForm && (
        <div style={{ ...sCard, marginBottom: "20px" }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Record Stock Movement
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {[
              {
                label: "Item *",
                key: "item_id",
                type: "select",
                options: items
                  .filter((i) => i.is_active)
                  .map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` })),
              },
              {
                label: "Movement Type",
                key: "movement_type",
                type: "select",
                options: Object.entries(MOVEMENT_LABELS).map(([k, v]) => ({
                  value: k,
                  label: v,
                })),
              },
              {
                label: "Quantity *",
                key: "quantity",
                type: "number",
                placeholder: "e.g. 50",
              },
              {
                label: "Reference",
                key: "reference",
                placeholder: "PO number, order #, etc.",
              },
            ].map((f) => (
              <div key={f.key}>
                <label
                  style={{
                    fontSize: "11px",
                    color: T.ink500,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {f.label}
                </label>
                {f.type === "select" ? (
                  <select
                    style={sSelect}
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                  >
                    <option value="">
                      {f.label === "Item *" ? "— Select Item —" : "—"}
                    </option>
                    {(f.options || []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={sInput}
                    type={f.type || "text"}
                    step={f.type === "number" ? "0.01" : undefined}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                color: T.ink500,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Notes
            </label>
            <input
              style={sInput}
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "16px",
            }}
          >
            <button onClick={handleRecord} disabled={saving} style={sBtn()}>
              {saving ? "Recording..." : "Record Movement"}
            </button>
          </div>
        </div>
      )}
      <div style={{ ...sCard, padding: "0", overflow: "auto" }}>
        <table style={sTable}>
          <thead>
            <tr>
              <th style={sTh}>Date</th>
              <th style={sTh}>Item</th>
              <th style={sTh}>SKU</th>
              <th style={sTh}>Type</th>
              <th style={{ ...sTh, textAlign: "right" }}>Quantity</th>
              <th style={sTh}>Reference</th>
              <th style={sTh}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    ...sTd,
                    textAlign: "center",
                    color: T.ink500,
                    padding: "40px",
                  }}
                >
                  No movements recorded yet
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td style={{ ...sTd, fontWeight: 500 }}>
                    {m.inventory_items?.name || "—"}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: T.fontData,
                      fontSize: "11px",
                      color: T.ink500,
                    }}
                  >
                    {m.inventory_items?.sku || "—"}
                  </td>
                  <td style={sTd}>
                    <div
                      style={{ display: "flex", gap: 4, alignItems: "center" }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: T.radius.sm,
                          background:
                            m.quantity >= 0 ? T.successBg : T.dangerBg,
                          color: m.quantity >= 0 ? T.success : T.danger,
                          fontWeight: 600,
                        }}
                      >
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                      {isDocumentSourced(m) && (
                        <DocumentSourceBadge movement={m} />
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.fontData,
                      fontWeight: 600,
                      color: m.quantity >= 0 ? T.success : T.danger,
                    }}
                  >
                    {m.quantity >= 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td style={{ ...sTd, color: T.ink500 }}>
                    {m.reference || "—"}
                  </td>
                  <td style={{ ...sTd, color: T.ink500, fontSize: "12px" }}>
                    {m.notes || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Orders ───────────────────────────────────────────────────────────────────
function OrdersView({ orders, suppliers, items, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [form, setForm] = useState({
    supplier_id: "",
    expected_date: "",
    notes: "",
    currency: "USD",
    lineItems: [{ item_id: "", quantity_ordered: "", unit_cost: "" }],
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setLine = (idx, k, v) =>
    setForm((p) => {
      const l = [...p.lineItems];
      l[idx] = { ...l[idx], [k]: v };
      return { ...p, lineItems: l };
    });
  const addLine = () =>
    setForm((p) => ({
      ...p,
      lineItems: [
        ...p.lineItems,
        { item_id: "", quantity_ordered: "", unit_cost: "" },
      ],
    }));
  const removeLine = (idx) =>
    setForm((p) => ({
      ...p,
      lineItems: p.lineItems.filter((_, i) => i !== idx),
    }));
  const genPONum = () => {
    const d = new Date();
    return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(orders.length + 1).padStart(3, "0")}`;
  };
  const poStatus = (po) => po.po_status || po.status || "draft";

  const handleCreate = async () => {
    if (!form.supplier_id) {
      alert("Select a supplier.");
      return;
    }
    const valid = form.lineItems.filter(
      (l) => l.item_id && l.quantity_ordered && l.unit_cost,
    );
    if (valid.length === 0) {
      alert("Add at least one line item.");
      return;
    }
    setSaving(true);
    try {
      const subtotal = valid.reduce(
        (s, l) => s + parseFloat(l.quantity_ordered) * parseFloat(l.unit_cost),
        0,
      );
      const { data: po, error: pE } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: genPONum(),
          supplier_id: form.supplier_id,
          expected_date: form.expected_date || null,
          notes: form.notes || null,
          currency: form.currency,
          subtotal,
          status: "draft",
        })
        .select()
        .single();
      if (pE) throw pE;
      const { error: lE } = await supabase.from("purchase_order_items").insert(
        valid.map((l) => ({
          po_id: po.id,
          item_id: l.item_id,
          quantity_ordered: parseFloat(l.quantity_ordered),
          unit_cost: parseFloat(l.unit_cost),
        })),
      );
      if (lE) throw lE;
      setShowForm(false);
      setForm({
        supplier_id: "",
        expected_date: "",
        notes: "",
        currency: "USD",
        lineItems: [{ item_id: "", quantity_ordered: "", unit_cost: "" }],
      });
      onRefresh();
    } catch (err) {
      alert("Error creating PO: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (po, newStatus) => {
    const updates = {
      status: newStatus,
      po_status: newStatus,
      ...(newStatus === "received"
        ? { received_date: new Date().toISOString().split("T")[0] }
        : {}),
    };
    const { error } = await supabase
      .from("purchase_orders")
      .update(updates)
      .eq("id", po.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    if (newStatus === "received" && po.purchase_order_items) {
      for (const line of po.purchase_order_items) {
        if (!line.item_id) continue;
        await supabase.from("stock_movements").insert({
          item_id: line.item_id,
          quantity: line.quantity_ordered,
          movement_type: "purchase_in",
          reference: po.po_number,
          unit_cost: parseFloat(line.unit_cost) || 0,
          notes: `Auto-recorded from PO ${po.po_number}`,
        });
        const item = items.find((i) => i.id === line.item_id);
        if (item)
          await supabase
            .from("inventory_items")
            .update({
              quantity_on_hand:
                (item.quantity_on_hand || 0) + line.quantity_ordered,
            })
            .eq("id", line.item_id);
      }
    }
    if (selectedPo?.id === po.id)
      setSelectedPo((p) => ({ ...p, status: newStatus, po_status: newStatus }));
    onRefresh();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "11px", color: T.ink500 }}>
          {orders.length} purchase orders ·{" "}
          <span style={{ color: T.accentMid }}>
            click any card to view & edit
          </span>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={sBtn()}>
          {showForm ? "Cancel" : "+ Create PO"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...sCard, marginBottom: "20px" }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            New Purchase Order
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: T.ink500,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Supplier *
              </label>
              <select
                style={sSelect}
                value={form.supplier_id}
                onChange={(e) => set("supplier_id", e.target.value)}
              >
                <option value="">— Select —</option>
                {suppliers
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: T.ink500,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Expected Date
              </label>
              <input
                style={sInput}
                type="date"
                value={form.expected_date}
                onChange={(e) => set("expected_date", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: T.ink500,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Currency
              </label>
              <select
                style={sSelect}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="ZAR">ZAR</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div style={{ ...sLabel, marginBottom: "8px" }}>Line Items</div>
          {form.lineItems.map((line, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr auto",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <select
                style={sSelect}
                value={line.item_id}
                onChange={(e) => setLine(idx, "item_id", e.target.value)}
              >
                <option value="">— Item —</option>
                {items
                  .filter((i) => i.is_active)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </select>
              <input
                style={sInput}
                type="number"
                step="1"
                placeholder="Qty"
                value={line.quantity_ordered}
                onChange={(e) =>
                  setLine(idx, "quantity_ordered", e.target.value)
                }
              />
              <input
                style={sInput}
                type="number"
                step="0.01"
                placeholder="Unit cost"
                value={line.unit_cost}
                onChange={(e) => setLine(idx, "unit_cost", e.target.value)}
              />
              {form.lineItems.length > 1 && (
                <button
                  onClick={() => removeLine(idx)}
                  style={{
                    ...sBtn("outline"),
                    padding: "4px 8px",
                    color: T.danger,
                    borderColor: T.dangerBd,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addLine}
            style={{ ...sBtn("outline"), fontSize: "11px", marginTop: "4px" }}
          >
            + Add Line
          </button>
          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                color: T.ink500,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Notes
            </label>
            <input
              style={sInput}
              placeholder="Optional PO notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "16px",
            }}
          >
            <button onClick={handleCreate} disabled={saving} style={sBtn()}>
              {saving ? "Creating..." : "Create Purchase Order"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: "12px" }}>
        {orders.length === 0 ? (
          <div
            style={{
              ...sCard,
              textAlign: "center",
              color: T.ink500,
              padding: "40px",
            }}
          >
            No purchase orders yet
          </div>
        ) : (
          orders.map((po) => {
            const status = poStatus(po);
            const sc = PO_STATUS_COLORS[status] || T.ink500;
            const isCancelled = status === "cancelled";
            return (
              <div
                key={po.id}
                onClick={() => setSelectedPo(po)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(0,0,0,0.09)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = T.shadow)
                }
                style={{
                  ...sCard,
                  cursor: "pointer",
                  opacity: isCancelled ? 0.72 : 1,
                  transition: "box-shadow 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: T.fontData,
                        fontSize: "16px",
                        fontWeight: 600,
                        color: isCancelled ? T.ink400 : T.ink900,
                      }}
                    >
                      {po.po_number}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: T.ink500,
                        marginTop: "2px",
                      }}
                    >
                      {po.suppliers?.name || "Unknown"} ·{" "}
                      {po.order_date || po.created_at?.split("T")[0]}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: T.radius.sm,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        background: `${sc}18`,
                        color: sc,
                        border: `1px solid ${sc}35`,
                        fontWeight: 600,
                      }}
                    >
                      {status}
                    </span>
                    <select
                      value=""
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.value)
                          handleStatusChange(po, e.target.value);
                      }}
                      style={{ ...sSelect, width: "130px", fontSize: "11px" }}
                    >
                      <option value="">Set status...</option>
                      {ALL_PO_STATUSES.filter((s) => s.id !== status).map(
                        (s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    marginTop: "10px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: T.ink500,
                  }}
                >
                  {po.purchase_order_items?.length > 0 && (
                    <span>
                      {po.purchase_order_items.length} line items ·{" "}
                      {po.currency || "USD"}{" "}
                      {parseFloat(po.subtotal || 0).toFixed(2)}
                    </span>
                  )}
                  {(po.expected_arrival || po.expected_date) && (
                    <span>
                      Expected: {po.expected_arrival || po.expected_date}
                    </span>
                  )}
                  {po.shipping_mode && (
                    <span>
                      {po.shipping_mode === "supplier_included"
                        ? "Supplier Incl."
                        : po.shipping_mode === "ddp_air"
                          ? "DDP Air"
                          : po.shipping_mode}
                    </span>
                  )}
                  {po.landed_cost_zar && (
                    <span style={{ color: T.success, fontWeight: 600 }}>
                      Landed: R
                      {parseFloat(po.landed_cost_zar).toLocaleString("en-ZA", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </div>
                {po.notes && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: T.ink500,
                      fontStyle: "italic",
                      marginTop: "6px",
                    }}
                  >
                    {po.notes}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "11px",
                    color: T.accentMid,
                    marginTop: "8px",
                    letterSpacing: "0.04em",
                  }}
                >
                  Click to view details & edit →
                </div>
              </div>
            );
          })
        )}
      </div>
      {selectedPo && (
        <PODetailModal
          po={selectedPo}
          items={items}
          onClose={() => setSelectedPo(null)}
          onStatusChange={(ns) => handleStatusChange(selectedPo, ns)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ─── PO Detail Modal ──────────────────────────────────────────────────────────
function PODetailModal({ po, items, onClose, onStatusChange, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localPo, setLocalPo] = useState(po);
  const [editForm, setEditForm] = useState({
    notes: po.notes || "",
    expected_arrival: po.expected_arrival || po.expected_date || "",
    supplier_invoice_ref: po.supplier_invoice_ref || "",
    usd_zar_rate: po.usd_zar_rate || "",
  });

  const status = localPo.po_status || localPo.status || "draft";
  const sc = PO_STATUS_COLORS[status] || T.ink500;
  const isCancelled = status === "cancelled";
  const lines = localPo.purchase_order_items || [];

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updates = {
        notes: editForm.notes || null,
        expected_arrival: editForm.expected_arrival || null,
        expected_date: editForm.expected_arrival || null,
        supplier_invoice_ref: editForm.supplier_invoice_ref || null,
        ...(editForm.usd_zar_rate
          ? { usd_zar_rate: parseFloat(editForm.usd_zar_rate) }
          : {}),
      };
      const { error } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", localPo.id);
      if (error) throw error;
      setLocalPo((p) => ({ ...p, ...updates }));
      setEditing(false);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSet = async (newStatus) => {
    const updates = {
      status: newStatus,
      po_status: newStatus,
      ...(newStatus === "received"
        ? { received_date: new Date().toISOString().split("T")[0] }
        : {}),
    };
    const { error } = await supabase
      .from("purchase_orders")
      .update(updates)
      .eq("id", localPo.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setLocalPo((p) => ({ ...p, ...updates }));
    onStatusChange(newStatus);
  };

  const row = (label, value, hl) => (
    <div
      style={{
        padding: "10px 0",
        borderBottom: `1px solid ${T.ink075}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: T.ink500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: T.fontUi,
          flexShrink: 0,
          paddingRight: 16,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: hl ? 600 : 400,
          color: hl ? T.success : T.ink900,
          textAlign: "right",
          fontFamily: hl ? T.fontData : T.fontUi,
        }}
      >
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(680px,100vw)",
          height: "100vh",
          background: T.surface,
          boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${T.ink150}`,
            background: T.ink050,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: "4px",
                }}
              >
                Purchase Order
              </div>
              <div
                style={{
                  fontFamily: T.fontData,
                  fontSize: "24px",
                  fontWeight: 600,
                  color: isCancelled ? T.ink400 : T.accent,
                }}
              >
                {localPo.po_number}
              </div>
              <div
                style={{ fontSize: "12px", color: T.ink500, marginTop: "2px" }}
              >
                {localPo.suppliers?.name || "—"}
                {localPo.suppliers?.country
                  ? ` · ${localPo.suppliers.country}`
                  : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "11px",
                  padding: "4px 12px",
                  borderRadius: T.radius.sm,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: `${sc}18`,
                  color: sc,
                  border: `1px solid ${sc}40`,
                  fontWeight: 600,
                }}
              >
                {status}
              </span>
              <button
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: T.ink400,
                }}
              >
                ✕
              </button>
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: "8px",
              }}
            >
              Set Status
              {isCancelled && (
                <span
                  style={{
                    marginLeft: 8,
                    color: T.danger,
                    fontSize: "11px",
                    fontWeight: 400,
                  }}
                >
                  (select any status to un-cancel)
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {ALL_PO_STATUSES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStatusSet(s.id)}
                  disabled={s.id === status}
                  style={{
                    padding: "5px 12px",
                    borderRadius: T.radius.sm,
                    border: `1px solid ${s.id === status ? s.color : T.ink150}`,
                    background: s.id === status ? `${s.color}18` : "#fff",
                    color: s.id === status ? s.color : T.ink500,
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: s.id === status ? 700 : 400,
                    cursor: s.id === status ? "default" : "pointer",
                    fontFamily: T.fontUi,
                  }}
                >
                  {s.id === status ? "✓ " : ""}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ ...sCard, marginBottom: "20px", padding: "0 16px" }}>
            {row("Supplier Invoice Ref", localPo.supplier_invoice_ref)}
            {row(
              "Order Date",
              localPo.order_date || localPo.created_at?.split("T")[0],
            )}
            {row(
              "Expected Arrival",
              localPo.expected_arrival || localPo.expected_date,
            )}
            {row(
              "Actual Arrival",
              localPo.actual_arrival || localPo.received_date,
            )}
            {row(
              "Locked FX Rate",
              localPo.usd_zar_rate
                ? `R${parseFloat(localPo.usd_zar_rate).toFixed(4)}/USD`
                : null,
            )}
            {row(
              "EXW Subtotal",
              localPo.subtotal
                ? `${localPo.currency || "USD"} ${parseFloat(localPo.subtotal).toFixed(2)}`
                : null,
            )}
            {row(
              "Shipping Mode",
              localPo.shipping_mode
                ? {
                    supplier_included: "Supplier Included",
                    ddp_air: "DDP Air (per kg)",
                    standard_air: "Standard Air",
                    sea_freight: "Sea Freight",
                  }[localPo.shipping_mode] || localPo.shipping_mode
                : null,
            )}
            {row(
              "Freight (USD)",
              localPo.shipping_cost_usd != null
                ? `$${parseFloat(localPo.shipping_cost_usd).toFixed(2)}`
                : null,
            )}
            {localPo.clearance_fee_usd > 0 &&
              row(
                "Clearance Fee (USD)",
                `$${parseFloat(localPo.clearance_fee_usd).toFixed(2)}`,
              )}
            {row(
              "Total Landed Cost (ZAR)",
              localPo.landed_cost_zar
                ? `R${parseFloat(localPo.landed_cost_zar).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                : null,
              !!localPo.landed_cost_zar,
            )}
            {localPo.total_weight_kg &&
              row("Total Weight", `${localPo.total_weight_kg} kg`)}
          </div>

          {editing ? (
            <div style={{ ...sCard, marginBottom: "20px" }}>
              <div style={{ ...sLabel, marginBottom: "14px" }}>
                Edit PO Details
              </div>
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      color: T.ink500,
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Notes
                  </label>
                  <textarea
                    style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: T.ink500,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Expected Arrival
                    </label>
                    <input
                      type="date"
                      style={sInput}
                      value={editForm.expected_arrival}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          expected_arrival: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: T.ink500,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Supplier Invoice Ref
                    </label>
                    <input
                      style={sInput}
                      value={editForm.supplier_invoice_ref}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          supplier_invoice_ref: e.target.value,
                        }))
                      }
                      placeholder="INV-2026-001"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: T.ink500,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      USD/ZAR Override{" "}
                      <span style={{ fontSize: "11px", color: T.warning }}>
                        affects landed cost
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      style={sInput}
                      value={editForm.usd_zar_rate}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          usd_zar_rate: e.target.value,
                        }))
                      }
                      placeholder="e.g. 16.0000"
                    />
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "14px",
                }}
              >
                <button
                  onClick={() => setEditing(false)}
                  style={sBtn("outline")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  style={sBtn()}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "20px" }}>
              {localPo.notes && (
                <div
                  style={{
                    ...sCard,
                    background: T.ink050,
                    fontSize: "13px",
                    fontStyle: "italic",
                    marginBottom: "12px",
                  }}
                >
                  {localPo.notes}
                </div>
              )}
              <button
                onClick={() => setEditing(true)}
                style={{ ...sBtn("outline"), fontSize: "11px" }}
              >
                Edit Notes / Dates / Invoice Ref / FX Rate
              </button>
            </div>
          )}

          {lines.length > 0 && (
            <div>
              <div style={{ ...sLabel, marginBottom: "10px" }}>
                Line Items ({lines.length})
              </div>
              <div style={{ ...sCard, padding: 0, overflow: "auto" }}>
                <table style={{ ...sTable, fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th style={sTh}>Product</th>
                      <th style={{ ...sTh, textAlign: "right" }}>Qty</th>
                      <th style={{ ...sTh, textAlign: "right" }}>
                        Unit Price (USD)
                      </th>
                      <th style={{ ...sTh, textAlign: "right" }}>Line EXW</th>
                      <th style={{ ...sTh, textAlign: "right" }}>
                        Landed/unit (ZAR)
                      </th>
                      <th style={sTh}>Inv. Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const name =
                        line.supplier_products?.name ||
                        line.notes?.replace(/ \(.*\)$/, "") ||
                        `Item ${idx + 1}`;
                      const unitPrice = parseFloat(
                        line.unit_price_usd || line.unit_cost || 0,
                      );
                      const lineExw =
                        (parseFloat(line.quantity_ordered) || 0) * unitPrice;
                      return (
                        <tr
                          key={line.id || idx}
                          style={{
                            background: idx % 2 === 0 ? "#fff" : T.ink050,
                          }}
                        >
                          <td style={sTd}>
                            <div style={{ fontWeight: 500 }}>{name}</div>
                            {line.supplier_products?.sku && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: T.ink500,
                                  fontFamily: T.fontData,
                                }}
                              >
                                {line.supplier_products.sku}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              textAlign: "right",
                              fontFamily: T.fontData,
                            }}
                          >
                            {line.quantity_ordered}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              textAlign: "right",
                              fontFamily: T.fontData,
                            }}
                          >
                            ${unitPrice.toFixed(4)}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              textAlign: "right",
                              fontFamily: T.fontData,
                              fontWeight: 500,
                            }}
                          >
                            ${lineExw.toFixed(2)}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              textAlign: "right",
                              fontFamily: T.fontData,
                              color: line.landed_cost_per_unit_zar
                                ? T.success
                                : T.ink400,
                              fontWeight: line.landed_cost_per_unit_zar
                                ? 600
                                : 400,
                            }}
                          >
                            {line.landed_cost_per_unit_zar
                              ? `R${parseFloat(line.landed_cost_per_unit_zar).toFixed(2)}`
                              : "—"}
                          </td>
                          <td style={sTd}>
                            {line.item_id ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  background: T.successBg,
                                  color: T.success,
                                  borderRadius: T.radius.sm,
                                  fontWeight: 600,
                                }}
                              >
                                linked
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  background: T.warningBg,
                                  color: T.warning,
                                  borderRadius: T.radius.sm,
                                  fontWeight: 600,
                                }}
                              >
                                none
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: T.ink075 }}>
                      <td
                        colSpan={3}
                        style={{
                          ...sTd,
                          fontWeight: 600,
                          textAlign: "right",
                          fontSize: "12px",
                        }}
                      >
                        Subtotal (EXW):
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.fontData,
                          fontWeight: 700,
                          textAlign: "right",
                        }}
                      >
                        ${parseFloat(localPo.subtotal || 0).toFixed(2)}
                      </td>
                      <td colSpan={2} style={sTd} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          <div
            style={{
              marginTop: "20px",
              background: T.infoBg,
              border: `1px solid ${T.infoBd}`,
              borderRadius: T.radius.md,
              padding: "14px 16px",
              fontSize: "12px",
              color: T.info,
              fontFamily: T.fontUi,
            }}
          >
            Shipping & landed cost is managed in{" "}
            <strong>HQ → Procurement</strong>. Use the Edit Shipping button
            there to set weight, freight mode, and update per-item costs.
          </div>
        </div>

        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${T.ink150}`,
            background: T.ink050,
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button onClick={onClose} style={sBtn("outline")}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
function SuppliersView({ suppliers, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = {
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    country: "",
    website: "",
    notes: "",
  };
  const [form, setForm] = useState(EMPTY);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const openEdit = (s) => {
    setEditSupplier(s);
    setForm({
      name: s.name,
      contact_name: s.contact_name || "",
      email: s.email || "",
      phone: s.phone || "",
      country: s.country || "",
      website: s.website || "",
      notes: s.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Supplier name is required.");
      return;
    }
    setSaving(true);
    try {
      const data = { ...form };
      Object.keys(data).forEach((k) => {
        if (data[k] === "") data[k] = null;
      });
      data.name = form.name;
      if (editSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(data)
          .eq("id", editSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(data);
        if (error) throw error;
      }
      setShowForm(false);
      setEditSupplier(null);
      setForm(EMPTY);
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "11px", color: T.ink500 }}>
          {suppliers.filter((s) => s.is_active).length} active suppliers
        </div>
        <button
          onClick={() => {
            setEditSupplier(null);
            setForm(EMPTY);
            setShowForm(!showForm);
          }}
          style={sBtn()}
        >
          {showForm ? "Cancel" : "+ Add Supplier"}
        </button>
      </div>
      {showForm && (
        <div style={{ ...sCard, marginBottom: "20px" }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            {editSupplier ? "Edit Supplier" : "Add New Supplier"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {[
              { k: "name", label: "Company Name *" },
              { k: "contact_name", label: "Contact Person" },
              { k: "email", label: "Email", type: "email" },
              { k: "phone", label: "Phone" },
              { k: "country", label: "Country" },
              { k: "website", label: "Website" },
            ].map((f) => (
              <div key={f.k}>
                <label
                  style={{
                    fontSize: "11px",
                    color: T.ink500,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {f.label}
                </label>
                <input
                  style={sInput}
                  type={f.type || "text"}
                  value={form[f.k]}
                  onChange={(e) => set(f.k, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                color: T.ink500,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Notes
            </label>
            <textarea
              style={{ ...sInput, minHeight: "50px", resize: "vertical" }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            <button
              onClick={() => {
                setShowForm(false);
                setEditSupplier(null);
              }}
              style={sBtn("outline")}
            >
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={sBtn()}>
              {saving ? "Saving..." : editSupplier ? "Update" : "Add Supplier"}
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
          gap: "16px",
        }}
      >
        {suppliers
          .filter((s) => s.is_active)
          .map((s) => (
            <div key={s.id} style={sCard}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: T.fontUi,
                      fontSize: "15px",
                      fontWeight: 600,
                      color: T.ink900,
                    }}
                  >
                    {s.name}
                  </div>
                  {s.contact_name && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: T.ink500,
                        marginTop: "2px",
                      }}
                    >
                      {s.contact_name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEdit(s)}
                  style={{
                    ...sBtn("outline"),
                    padding: "4px 10px",
                    fontSize: "11px",
                  }}
                >
                  Edit
                </button>
              </div>
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "12px",
                  color: T.ink500,
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {s.country && <div>{s.country}</div>}
                {s.email && <div>{s.email}</div>}
                {s.phone && <div>{s.phone}</div>}
                {s.website && <div>{s.website}</div>}
              </div>
              {s.notes && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: T.ink500,
                    fontStyle: "italic",
                    borderTop: `1px solid ${T.ink150}`,
                    paddingTop: "8px",
                  }}
                >
                  {s.notes}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
