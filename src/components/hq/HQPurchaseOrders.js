// src/components/hq/HQPurchaseOrders.js v2.1 — WP-THEME-2: Inter font
// v2.0 — WP-THEME: Unified design system applied
//   - Outfit replaces Cormorant Garamond + Jost everywhere
//   - DM Mono for all numeric/financial values
//   - Stat cards: coloured top borders removed — semantic colour on value only
//   - Buttons: 4-variant system (primary/ghost/danger/advance)
//   - Overdue alert: standard warning template
//   - Toast: standard success template (no emoji prefix)
//   - Status badges: semantic token colours
//   - Filter chips: underline-adjacent style matching global tab pattern
//   - Emoji removed from button labels
// v1.1: Auto-create inventory_items on receive + stock_movements
// v1.0: WP-B Purchase Order Flow

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { ChartCard, ChartTooltip } from "../viz";
import { usePageContext } from "../../hooks/usePageContext";
import InfoTooltip from "../InfoTooltip";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#888888",
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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
  label: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
  },
  kpi: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 24,
    fontWeight: 400,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  body: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 13,
    fontWeight: 400,
  },
  data: {
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    fontSize: 12,
    fontWeight: 400,
    fontVariantNumeric: "tabular-nums",
  },
};

// ── FX Rate Hook ─────────────────────────────────────────────────────────────
function useFxRate() {
  const [fxRate, setFxRate] = useState(null);
  const [fxLoading, setFxLoading] = useState(true);
  const fetchRate = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-fx-rate`,
        { headers: { apikey: process.env.REACT_APP_SUPABASE_ANON_KEY } },
      );
      const data = await res.json();
      if (data.usd_zar) setFxRate(data);
    } catch {
      setFxRate({ usd_zar: 18.5, eur_zar: 20.2, source: "fallback" });
    } finally {
      setFxLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchRate();
    const t = setInterval(fetchRate, 60000);
    return () => clearInterval(t);
  }, [fetchRate]);
  return { fxRate, fxLoading };
}

// ── Constants ────────────────────────────────────────────────────────────────
const STATUSES = [
  "draft",
  "ordered",
  "in_transit",
  "customs",
  "received",
  "complete",
];

const STATUS_META = {
  draft: { label: "Draft", color: T.ink500, bg: T.ink075 },
  ordered: { label: "Ordered", color: T.info, bg: T.infoBg },
  in_transit: { label: "In Transit", color: T.warning, bg: T.warningBg },
  customs: { label: "Customs", color: "#6B21A8", bg: "#F5F3FF" },
  received: { label: "Received", color: T.success, bg: T.successBg },
  complete: { label: "Complete", color: T.accent, bg: T.accentLit },
};

const NEXT_STATUS = {
  draft: "ordered",
  ordered: "in_transit",
  in_transit: "customs",
  customs: "received",
};

const SHIPPING_MODES = [
  {
    id: "ddp_air",
    label: "DDP Air (per kg)",
    note: "Door-to-door · 10–18 days",
  },
  {
    id: "standard_air",
    label: "Standard Air",
    note: "Half cube $800 flat · ~4 weeks",
  },
  {
    id: "sea_freight",
    label: "Sea Freight",
    note: "$650/CBM self-pickup · 45–55 days",
  },
];

const DDP_TIERS = [
  { maxKg: 21, rateUsd: 15.8 },
  { maxKg: 50, rateUsd: 15.5 },
  { maxKg: 100, rateUsd: 15.2 },
  { maxKg: Infinity, rateUsd: 14.9 },
];

function supplierCatToInventoryCat(cat) {
  if (cat === "terpene") return "terpene";
  if (cat === "hardware") return "hardware";
  return "raw_material";
}
function defaultUnitForCat(cat) {
  if (cat === "terpene") return "ml";
  if (cat === "hardware") return "pcs";
  return "pcs";
}
function calcShippingUsd(mode, weightKg, seaCustom = 650) {
  if (mode === "ddp_air") {
    const tier =
      DDP_TIERS.find((t) => weightKg <= t.maxKg) ||
      DDP_TIERS[DDP_TIERS.length - 1];
    return weightKg * tier.rateUsd + 25;
  }
  if (mode === "standard_air") return 800;
  if (mode === "sea_freight") return seaCustom;
  return 0;
}

const fmt = (n, dp = 2) => (parseFloat(n) || 0).toFixed(dp);
const fmtZar = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtUsd = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`;
const isOverdue = (po) => {
  const arrival = po.expected_arrival || po.expected_date;
  if (!arrival) return false;
  const status = po.po_status || po.status;
  return (
    new Date(arrival) < new Date() && !["received", "complete"].includes(status)
  );
};

// ── Shared style objects ─────────────────────────────────────────────────────
const sCard = {
  background: "#fff",
  border: `1px solid ${T.ink150}`,
  borderRadius: 8,
  padding: "20px",
  boxShadow: T.shadow,
};

const mkBtn = (variant = "primary") => {
  const base = {
    padding: "9px 18px",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    fontFamily: T.fontUi,
    fontWeight: 600,
    fontSize: 13,
    transition: "opacity 0.15s",
    letterSpacing: "0.04em",
  };
  const v = {
    primary: { background: T.accent, color: "#fff" },
    ghost: {
      background: "transparent",
      color: T.accent,
      border: `1px solid ${T.accentBd}`,
    },
    danger: { background: T.danger, color: "#fff" },
    success: { background: T.success, color: "#fff" },
    advance: {
      background: T.info,
      color: "#fff",
      padding: "7px 14px",
      fontSize: 12,
    },
    small: {
      background: T.ink075,
      color: T.ink700,
      padding: "5px 12px",
      fontSize: 12,
      fontWeight: 500,
    },
  };
  return { ...base, ...(v[variant] || v.primary) };
};

const sInput = {
  padding: "9px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: 4,
  fontFamily: T.fontUi,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  color: T.ink900,
};
const sTh = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  color: T.ink400,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  borderBottom: `1px solid ${T.ink150}`,
};
const sTd = {
  padding: "12px 14px",
  fontSize: 13,
  color: T.ink700,
  borderBottom: `1px solid ${T.ink075}`,
  verticalAlign: "middle",
};

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 700,
        color: meta.color,
        background: meta.bg,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: T.fontUi,
      }}
    >
      {meta.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HQPurchaseOrders() {
  const { fxRate, fxLoading } = useFxRate();
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [toast, setToast] = useState("");

  const [step, setStep] = useState(1);
  const [selSupplier, setSelSupplier] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [shipMode, setShipMode] = useState("ddp_air");
  const [seaCost, setSeaCost] = useState(650);
  const [poNotes, setPoNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const ctx = usePageContext("procurement", null);

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(name, country, currency)")
      .order("created_at", { ascending: false });
    if (error)
      console.error(
        "[HQPurchaseOrders] fetchPOs error:",
        error.message,
        error.code,
        error.details,
      );
    setPos(data || []);
    setLoading(false);
  }, []);

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  }, []);

  useEffect(() => {
    fetchPOs();
    fetchSuppliers();
  }, [fetchPOs, fetchSuppliers]);

  const fetchCatalogue = async (supplierId) => {
    setCatLoading(true);
    const { data } = await supabase
      .from("supplier_products")
      .select("*")
      .eq("supplier_id", supplierId)
      .eq("is_active", true)
      .order("category")
      .order("name");
    setCatalogue(data || []);
    setCatLoading(false);
  };

  const addItem = (product) => {
    setLineItems((prev) => {
      const exists = prev.find((i) => i.product_id === product.id);
      if (exists)
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, qty: i.qty + (product.moq || 1) }
            : i,
        );
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku || "",
          category: product.category,
          qty: product.moq || 1,
          moq: product.moq || 1,
          unit_price_usd: parseFloat(product.unit_price_usd) || 0,
          weight_kg_per_unit: parseFloat(product.weight_kg_per_unit) || 0,
        },
      ];
    });
  };
  const updateQty = (productId, raw) => {
    const qty = Math.max(1, parseInt(raw) || 1);
    setLineItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, qty } : i)),
    );
  };
  const removeItem = (productId) => {
    setLineItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const totalWeight = lineItems.reduce(
    (s, i) => s + i.weight_kg_per_unit * i.qty,
    0,
  );
  const totalUnits = lineItems.reduce((s, i) => s + i.qty, 0);
  const subtotalUsd = lineItems.reduce(
    (s, i) => s + i.unit_price_usd * i.qty,
    0,
  );
  const shipCostUsd = lineItems.length
    ? calcShippingUsd(shipMode, totalWeight, seaCost)
    : 0;
  const totalUsd = subtotalUsd + shipCostUsd;
  const usdZar = fxRate?.usd_zar || 18.5;
  const landedZar = totalUsd * usdZar;
  const landedPerUnit = totalUnits > 0 ? landedZar / totalUnits : 0;
  const shipPerUnit = totalUnits > 0 ? shipCostUsd / totalUnits : 0;

  const resetCreate = () => {
    setStep(1);
    setSelSupplier(null);
    setCatalogue([]);
    setLineItems([]);
    setShipMode("ddp_air");
    setPoNotes("");
    setCatFilter("all");
  };
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4500);
  };

  const handleCreate = async () => {
    if (!selSupplier || lineItems.length === 0) return;
    setCreating(true);
    const poNumber = `PO-${Date.now().toString().slice(-8)}`;
    const lockedRate = usdZar;
    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: poNumber,
        supplier_id: selSupplier.id,
        status: "draft",
        po_status: "draft",
        order_date: new Date().toISOString().split("T")[0],
        shipping_mode: shipMode,
        total_weight_kg: parseFloat(totalWeight.toFixed(3)),
        shipping_cost_usd: parseFloat(shipCostUsd.toFixed(2)),
        clearance_fee_usd: shipMode === "ddp_air" ? 25 : 0,
        usd_zar_rate: parseFloat(lockedRate.toFixed(4)),
        landed_cost_zar: parseFloat(landedZar.toFixed(2)),
        subtotal: parseFloat(subtotalUsd.toFixed(2)),
        currency: "USD",
        notes: poNotes,
      })
      .select()
      .single();
    if (error || !po) {
      console.error("[HQPurchaseOrders] PO create error:", error);
      setCreating(false);
      return;
    }
    const itemInserts = lineItems.map((item) => ({
      po_id: po.id,
      supplier_product_id: item.product_id,
      quantity_ordered: item.qty,
      unit_price_usd: parseFloat(item.unit_price_usd.toFixed(4)),
      landed_cost_per_unit_zar: parseFloat(
        ((item.unit_price_usd + shipPerUnit) * lockedRate).toFixed(4),
      ),
      weight_kg: parseFloat((item.weight_kg_per_unit * item.qty).toFixed(4)),
      unit_cost: parseFloat(item.unit_price_usd.toFixed(4)),
      notes: `${item.name}${item.sku ? ` (${item.sku})` : ""}`,
    }));
    const { error: lineErr } = await supabase
      .from("purchase_order_items")
      .insert(itemInserts);
    if (lineErr)
      console.error("[HQPurchaseOrders] PO line insert error:", lineErr);
    setCreating(false);
    setShowCreate(false);
    resetCreate();
    showToast(
      `${poNumber} created — FX rate locked at R${lockedRate.toFixed(4)}/USD`,
    );
    fetchPOs();
  };

  const handleAdvance = async (po, newStatus) => {
    await supabase
      .from("purchase_orders")
      .update({ po_status: newStatus, status: newStatus })
      .eq("id", po.id);
    if (newStatus === "ordered") {
      const days = po.shipping_mode === "sea_freight" ? 50 : 14;
      const arrival = new Date();
      arrival.setDate(arrival.getDate() + days);
      await supabase
        .from("purchase_orders")
        .update({ expected_arrival: arrival.toISOString().split("T")[0] })
        .eq("id", po.id);
    }
    fetchPOs();
    if (selectedPo?.id === po.id)
      setSelectedPo((prev) => ({
        ...prev,
        po_status: newStatus,
        status: newStatus,
      }));
  };

  const handleReceive = async (po) => {
    setReceiving(true);
    await supabase
      .from("purchase_orders")
      .update({
        po_status: "received",
        status: "received",
        actual_arrival: new Date().toISOString().split("T")[0],
        received_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", po.id);
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select(
        "*, supplier_products(name, sku, category, unit_price_usd, weight_kg_per_unit)",
      )
      .eq("po_id", po.id);
    let itemsCreated = 0,
      itemsUpdated = 0,
      movementsWritten = 0;
    const errors = [];
    if (items && items.length > 0) {
      for (const item of items) {
        const sp = item.supplier_products;
        const productName =
          sp?.name || item.notes?.replace(/ \(.*\)$/, "") || "Unknown Product";
        const qty = parseFloat(item.quantity_ordered) || 0;
        if (qty <= 0) continue;
        try {
          const { data: existing } = await supabase
            .from("inventory_items")
            .select("id, quantity_on_hand")
            .ilike("name", productName)
            .maybeSingle();
          let inventoryItemId = null;
          if (existing) {
            const newQty = (parseFloat(existing.quantity_on_hand) || 0) + qty;
            await supabase
              .from("inventory_items")
              .update({ quantity_on_hand: newQty })
              .eq("id", existing.id);
            inventoryItemId = existing.id;
            itemsUpdated++;
          } else {
            const invCategory = supplierCatToInventoryCat(
              sp?.category || "raw_material",
            );
            const invUnit = defaultUnitForCat(invCategory);
            const invSku = sp?.sku
              ? `IMP-${sp.sku}`
              : `IMP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
            const costPrice = parseFloat(
              item.landed_cost_per_unit_zar || item.unit_cost || 0,
            );
            const { data: newItem, error: createErr } = await supabase
              .from("inventory_items")
              .insert({
                sku: invSku,
                name: productName,
                category: invCategory,
                unit: invUnit,
                description: sp
                  ? `Imported from ${po.suppliers?.name || "supplier"} via PO ${po.po_number}`
                  : null,
                quantity_on_hand: qty,
                reorder_level: 0,
                cost_price: parseFloat(costPrice.toFixed(2)),
                sell_price: 0,
                supplier_id: po.supplier_id || null,
                is_active: true,
              })
              .select()
              .single();
            if (createErr) {
              console.error(
                `[HQPurchaseOrders] Failed to create inventory item for "${productName}":`,
                createErr,
              );
              errors.push(productName);
              continue;
            }
            inventoryItemId = newItem?.id;
            itemsCreated++;
          }
          if (inventoryItemId) {
            const { error: moveErr } = await supabase
              .from("stock_movements")
              .insert({
                item_id: inventoryItemId,
                quantity: qty,
                movement_type: "purchase_in",
                reference: po.po_number,
                notes: `Received via PO ${po.po_number} — ${po.suppliers?.name || "supplier"}`,
              });
            if (moveErr)
              console.error(
                `[HQPurchaseOrders] Stock movement error for "${productName}":`,
                moveErr,
              );
            else movementsWritten++;
            await supabase
              .from("purchase_order_items")
              .update({ item_id: inventoryItemId })
              .eq("id", item.id);
          }
        } catch (err) {
          console.error(
            `[HQPurchaseOrders] Error processing "${productName}":`,
            err,
          );
          errors.push(productName);
        }
      }
    }
    setReceiving(false);
    setSelectedPo(null);
    const summary = [
      itemsCreated > 0 ? `${itemsCreated} new items created` : null,
      itemsUpdated > 0 ? `${itemsUpdated} items updated` : null,
      movementsWritten > 0 ? `${movementsWritten} movements logged` : null,
      errors.length > 0 ? `${errors.length} failed` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    showToast(`PO received — ${summary || "inventory updated"}`);
    fetchPOs();
  };

  const filteredPos =
    filterStatus === "all"
      ? pos
      : pos.filter((p) => (p.po_status || p.status) === filterStatus);
  const overdueCount = pos.filter(isOverdue).length;
  const catalogueView =
    catFilter === "all"
      ? catalogue
      : catalogue.filter((p) => p.category === catFilter);
  const catCategories = [...new Set(catalogue.map((p) => p.category))];
  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = pos.filter((p) => (p.po_status || p.status) === s).length;
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: T.fontUi, color: T.ink700 }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: T.accent,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            fontFamily: T.fontUi,
          }}
        >
          {toast}
        </div>
      )}

      <WorkflowGuide
        context={ctx}
        tabId="procurement"
        onAction={() => {}}
        defaultOpen={true}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontFamily: T.fontUi,
              fontWeight: 300,
              color: T.ink900,
            }}
          >
            Procurement
          </h2>
          <p style={{ margin: "4px 0 0", color: T.ink500, fontSize: 13 }}>
            Import-aware purchase orders · landed cost · inventory receiving
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              background: fxLoading ? T.ink075 : T.successBg,
              border: `1px solid ${T.successBd}`,
              borderRadius: 4,
              padding: "6px 12px",
              fontSize: 12,
              color: T.success,
              fontWeight: 600,
              fontFamily: T.fontData,
            }}
          >
            {fxLoading
              ? "Loading FX…"
              : `USD/ZAR R${usdZar.toFixed(4)} ${fxRate?.source === "live" ? "Live" : "Cached"}`}
            <InfoTooltip id="po-fx-rate" position="top" />
          </div>
          <button
            style={mkBtn("primary")}
            onClick={() => {
              resetCreate();
              setShowCreate(true);
            }}
          >
            + New Purchase Order
          </button>
          <InfoTooltip id="po-what-is" />
        </div>
      </div>

      {/* KPI row — flush grid, no coloured borders */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total POs", value: pos.length, semantic: null },
          {
            label: "In Transit / Customs",
            value: pos.filter((p) =>
              ["in_transit", "customs"].includes(p.po_status || p.status),
            ).length,
            semantic: "warning",
          },
          {
            label: "Overdue",
            value: overdueCount,
            semantic: overdueCount > 0 ? "danger" : null,
          },
          {
            label: "Completed",
            value: pos.filter((p) => (p.po_status || p.status) === "complete")
              .length,
            semantic: "success",
          },
        ].map((k) => {
          const semC = {
            success: T.success,
            warning: T.warning,
            danger: T.danger,
            info: T.info,
          };
          const color = k.semantic ? semC[k.semantic] : T.ink900;
          return (
            <div
              key={k.label}
              style={{ background: "#fff", padding: "16px 18px" }}
            >
              <div
                style={{
                  fontFamily: T.fontData,
                  fontSize: 26,
                  fontWeight: 400,
                  color,
                  lineHeight: 1,
                }}
              >
                {k.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.ink400,
                  marginTop: 4,
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {k.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CHARTS: PO Pipeline + Supplier Spend ── */}
      {pos.length > 0 &&
        (() => {
          const statusBarData = STATUSES.map((s) => ({
            status: STATUS_META[s].label,
            count: statusCounts[s] || 0,
            color: STATUS_META[s].color,
          })).filter((d) => d.count > 0);

          const supplierMap = {};
          pos.forEach((po) => {
            const name = po.suppliers?.name || "Unknown";
            supplierMap[name] =
              (supplierMap[name] || 0) + (parseFloat(po.landed_cost_zar) || 0);
          });
          const spendData = Object.entries(supplierMap)
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
          const PIE_COLOURS = [
            T.accent,
            T.accentMid,
            "#52B788",
            T.info,
            "#b5935a",
          ];

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginBottom: 20,
              }}
            >
              <ChartCard title="PO Pipeline — Status Breakdown" height={220}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusBarData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.ink150}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="status"
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
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
                          formatter={(v) => `${v} PO${v !== 1 ? "s" : ""}`}
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      name="POs"
                      isAnimationActive={false}
                      maxBarSize={36}
                      radius={[3, 3, 0, 0]}
                    >
                      {statusBarData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Landed Cost by Supplier (ZAR)" height={220}>
                {spendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        dataKey="value"
                        paddingAngle={3}
                        isAnimationActive={false}
                      >
                        {spendData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLOURS[i % PIE_COLOURS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={
                          <ChartTooltip
                            formatter={(v) => `R${v.toLocaleString("en-ZA")}`}
                          />
                        }
                      />
                      <Legend
                        iconSize={8}
                        iconType="square"
                        formatter={(v) => (
                          <span
                            style={{
                              fontSize: 11,
                              color: T.ink500,
                              fontFamily: T.font,
                            }}
                          >
                            {v}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: T.ink400,
                      fontFamily: T.fontUi,
                    }}
                  >
                    No completed PO spend yet
                  </div>
                )}
              </ChartCard>
            </div>
          );
        })()}

      {/* Overdue alert — standard warning template */}
      {overdueCount > 0 && (
        <div
          style={{
            background: T.warningBg,
            border: `1px solid ${T.warningBd}`,
            borderRadius: 6,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: T.warning,
            fontWeight: 600,
            fontFamily: T.fontUi,
          }}
        >
          {overdueCount} overdue PO{overdueCount > 1 ? "s" : ""} — expected
          arrival date has passed.
        </div>
      )}

      {/* PO list */}
      <div style={sCard}>
        {/* Filter chips */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {[
            { id: "all", label: `All (${pos.length})` },
            ...STATUSES.map((s) => ({
              id: s,
              label: `${STATUS_META[s].label} (${statusCounts[s] || 0})`,
            })),
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: T.fontUi,
                fontWeight: 500,
                background: filterStatus === f.id ? T.accent : T.ink075,
                color: filterStatus === f.id ? "#fff" : T.ink500,
                transition: "background 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: T.ink400 }}>
            Loading purchase orders…
          </div>
        ) : filteredPos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: T.ink300 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>—</div>
            <div>
              No purchase orders
              {filterStatus !== "all"
                ? ` with status "${STATUS_META[filterStatus]?.label}"`
                : ""}
            </div>
            <button
              style={{ ...mkBtn("ghost"), marginTop: 14 }}
              onClick={() => {
                resetCreate();
                setShowCreate(true);
              }}
            >
              Create First PO
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: T.fontUi,
              }}
            >
              <thead>
                <tr>
                  {[
                    "PO Number",
                    "Supplier",
                    "Status",
                    "Shipping",
                    "Subtotal (USD)",
                    "Landed Cost (ZAR)",
                    "FX Rate",
                    "Expected Arrival",
                    "Actions",
                  ].map((h) => (
                    <th key={h} style={sTh}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPos.map((po) => {
                  const status = po.po_status || po.status || "draft";
                  const overdue = isOverdue(po);
                  const shipMeta =
                    SHIPPING_MODES.find((m) => m.id === po.shipping_mode) ||
                    SHIPPING_MODES[0];
                  const nextStatus = NEXT_STATUS[status];
                  return (
                    <tr
                      key={po.id}
                      style={{
                        background: overdue ? T.warningBg : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedPo(po)}
                    >
                      <td style={sTd}>
                        <strong
                          style={{ color: T.accent, fontFamily: T.fontData }}
                        >
                          {po.po_number}
                        </strong>
                        {overdue && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              color: T.danger,
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            Overdue
                          </span>
                        )}
                      </td>
                      <td style={sTd}>
                        <div style={{ fontWeight: 500 }}>
                          {po.suppliers?.name || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: T.ink400 }}>
                          {po.suppliers?.country}
                        </div>
                      </td>
                      <td style={sTd}>
                        <StatusBadge status={status} />
                      </td>
                      <td style={{ ...sTd, fontSize: 12 }}>{shipMeta.label}</td>
                      <td style={{ ...sTd, fontFamily: T.fontData }}>
                        {fmtUsd(po.subtotal)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.fontData,
                          fontWeight: 600,
                          color: T.accent,
                        }}
                      >
                        {fmtZar(po.landed_cost_zar)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.fontData,
                          fontSize: 12,
                          color: T.ink500,
                        }}
                      >
                        {po.usd_zar_rate
                          ? `R${parseFloat(po.usd_zar_rate).toFixed(4)}`
                          : "—"}
                      </td>
                      <td style={sTd}>
                        {po.expected_arrival || po.expected_date || "—"}
                        {overdue && (
                          <div style={{ fontSize: 11, color: T.danger }}>
                            Past due
                          </div>
                        )}
                      </td>
                      <td style={sTd} onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          {nextStatus &&
                            status !== "received" &&
                            status !== "complete" && (
                              <button
                                style={mkBtn("advance")}
                                onClick={() => handleAdvance(po, nextStatus)}
                              >
                                → {STATUS_META[nextStatus]?.label}
                              </button>
                            )}
                          {status === "customs" && (
                            <button
                              style={mkBtn("success")}
                              onClick={() => handleReceive(po)}
                              disabled={receiving}
                            >
                              {receiving ? "Receiving…" : "Receive"}
                            </button>
                          )}
                          {status === "received" && (
                            <button
                              style={mkBtn("small")}
                              onClick={() => handleAdvance(po, "complete")}
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create PO slide-in ── */}
      {showCreate && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}
        >
          <div
            style={{ flex: 1, background: "rgba(0,0,0,0.4)" }}
            onClick={() => {
              setShowCreate(false);
              resetCreate();
            }}
          />
          <div
            style={{
              width: 720,
              background: "#fff",
              overflowY: "auto",
              boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: `1px solid ${T.ink150}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "#fff",
                zIndex: 1,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontFamily: T.fontUi,
                    fontWeight: 500,
                    color: T.ink900,
                  }}
                >
                  New Purchase Order
                </h3>
                <div style={{ fontSize: 12, color: T.ink400, marginTop: 3 }}>
                  Step {step} of 3 —{" "}
                  {
                    ["Select Supplier", "Add Items", "Shipping & Confirm"][
                      step - 1
                    ]
                  }
                </div>
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: T.ink400,
                }}
                onClick={() => {
                  setShowCreate(false);
                  resetCreate();
                }}
              >
                ✕
              </button>
            </div>

            {/* Progress bar */}
            <div
              style={{
                padding: "12px 24px",
                borderBottom: `1px solid ${T.ink150}`,
                display: "flex",
                gap: 6,
              }}
            >
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 2,
                      background: step >= n ? T.accent : T.ink150,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10,
                      color: step >= n ? T.accent : T.ink300,
                      marginTop: 4,
                      fontWeight: step === n ? 700 : 400,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {["Supplier", "Items", "Shipping"][n - 1]}
                  </div>
                </div>
              ))}
            </div>

            {/* Body */}
            <div style={{ padding: 24, flex: 1 }}>
              {/* Step 1 */}
              {step === 1 && (
                <div>
                  <p style={{ color: T.ink500, marginTop: 0, fontSize: 13 }}>
                    Choose the supplier for this purchase order.{" "}
                    <InfoTooltip id="po-select-supplier" />
                  </p>
                  {suppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelSupplier(s)}
                      style={{
                        padding: "16px 18px",
                        borderRadius: 6,
                        marginBottom: 10,
                        cursor: "pointer",
                        border: `2px solid ${selSupplier?.id === s.id ? T.accent : T.ink150}`,
                        background:
                          selSupplier?.id === s.id ? T.accentLit : "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <strong style={{ color: T.ink900 }}>{s.name}</strong>
                          <div
                            style={{
                              fontSize: 12,
                              color: T.ink500,
                              marginTop: 3,
                            }}
                          >
                            {s.country} · {s.currency}
                          </div>
                        </div>
                        {selSupplier?.id === s.id && (
                          <span
                            style={{
                              color: T.success,
                              fontSize: 18,
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {suppliers.length === 0 && (
                    <div
                      style={{
                        color: T.ink400,
                        textAlign: "center",
                        padding: 32,
                        fontFamily: T.fontUi,
                      }}
                    >
                      No suppliers found. Add via HQ → Supply Chain.
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginBottom: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    {["all", ...catCategories].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCatFilter(c)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 16,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          fontFamily: T.fontUi,
                          background: catFilter === c ? T.accent : T.ink075,
                          color: catFilter === c ? "#fff" : T.ink500,
                          fontWeight: catFilter === c ? 700 : 400,
                        }}
                      >
                        {c === "all"
                          ? "All"
                          : c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                  {catLoading ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: T.ink400,
                      }}
                    >
                      Loading catalogue…
                    </div>
                  ) : catalogueView.length === 0 ? (
                    <div
                      style={{
                        color: T.ink300,
                        textAlign: "center",
                        padding: 32,
                      }}
                    >
                      No products found for {selSupplier?.name}
                    </div>
                  ) : (
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          color: T.ink500,
                          margin: "0 0 10px",
                        }}
                      >
                        Click a product to add it to the order:
                      </p>
                      {catalogueView.map((p) => {
                        const inOrder = lineItems.find(
                          (i) => i.product_id === p.id,
                        );
                        return (
                          <div
                            key={p.id}
                            onClick={() => addItem(p)}
                            style={{
                              padding: "12px 14px",
                              borderRadius: 6,
                              marginBottom: 6,
                              cursor: "pointer",
                              border: `1px solid ${inOrder ? T.successBd : T.ink150}`,
                              background: inOrder ? T.successBg : T.ink050,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>
                                {p.name}
                              </span>
                              {p.sku && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 11,
                                    color: T.ink400,
                                    fontFamily: T.fontData,
                                  }}
                                >
                                  {p.sku}
                                </span>
                              )}
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 10,
                                  padding: "2px 7px",
                                  borderRadius: 3,
                                  background: T.ink075,
                                  color: T.ink500,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  fontWeight: 700,
                                }}
                              >
                                {p.category}
                              </span>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: T.ink500,
                                  marginTop: 3,
                                }}
                              >
                                MOQ: {p.moq || 1} · {fmtUsd(p.unit_price_usd)}
                                /unit
                                {p.weight_kg_per_unit
                                  ? ` · ${p.weight_kg_per_unit}kg/unit`
                                  : ""}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontFamily: T.fontData,
                                  fontWeight: 600,
                                  color: T.accent,
                                }}
                              >
                                {fmtUsd(p.unit_price_usd)}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: T.ink500,
                                  fontFamily: T.fontData,
                                }}
                              >
                                {fmtZar(p.unit_price_usd * usdZar)}
                              </div>
                              {inOrder && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: T.success,
                                    fontWeight: 700,
                                  }}
                                >
                                  In order
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {lineItems.length > 0 && (
                        <div
                          style={{
                            ...sCard,
                            padding: 16,
                            marginTop: 16,
                            marginBottom: 0,
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 12px",
                              fontSize: 13,
                              color: T.ink700,
                            }}
                          >
                            Order Items ({lineItems.length})
                          </h4>
                          {lineItems.map((item) => (
                            <div
                              key={item.product_id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 0",
                                borderBottom: `1px solid ${T.ink075}`,
                              }}
                            >
                              <div style={{ flex: 2, fontSize: 12 }}>
                                <strong>{item.name}</strong>
                                {item.sku && (
                                  <span
                                    style={{
                                      color: T.ink400,
                                      marginLeft: 6,
                                      fontFamily: T.fontData,
                                      fontSize: 11,
                                    }}
                                  >
                                    {item.sku}
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                value={item.qty}
                                min={1}
                                onChange={(e) =>
                                  updateQty(item.product_id, e.target.value)
                                }
                                style={{
                                  ...sInput,
                                  width: 70,
                                  textAlign: "center",
                                }}
                              />
                              <div
                                style={{
                                  flex: 1,
                                  fontSize: 12,
                                  color: T.ink700,
                                  fontFamily: T.fontData,
                                }}
                              >
                                {fmtUsd(item.unit_price_usd * item.qty)}
                              </div>
                              <button
                                onClick={() => removeItem(item.product_id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: T.danger,
                                  fontSize: 16,
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 12,
                              color: T.ink500,
                              display: "flex",
                              justifyContent: "space-between",
                              fontFamily: T.fontData,
                            }}
                          >
                            <span>
                              Total weight:{" "}
                              <strong>{fmt(totalWeight, 3)} kg</strong>
                            </span>
                            <span>
                              Subtotal: <strong>{fmtUsd(subtotalUsd)}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: T.ink500,
                        display: "block",
                        marginBottom: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Shipping Mode <InfoTooltip id="po-shipping-mode" />
                    </label>
                    {SHIPPING_MODES.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setShipMode(m.id)}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 6,
                          marginBottom: 6,
                          cursor: "pointer",
                          border: `2px solid ${shipMode === m.id ? T.accent : T.ink150}`,
                          background: shipMode === m.id ? T.accentLit : "#fff",
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              color: T.ink900,
                            }}
                          >
                            {m.label}
                          </div>
                          <div style={{ fontSize: 11, color: T.ink500 }}>
                            {m.note}
                          </div>
                        </div>
                        {shipMode === m.id && (
                          <span style={{ color: T.success, fontWeight: 700 }}>
                            ✓
                          </span>
                        )}
                      </div>
                    ))}
                    {shipMode === "sea_freight" && (
                      <div style={{ marginTop: 10 }}>
                        <label
                          style={{
                            fontSize: 12,
                            color: T.ink500,
                            display: "block",
                            marginBottom: 6,
                          }}
                        >
                          Sea freight cost (USD)
                        </label>
                        <input
                          type="number"
                          value={seaCost}
                          onChange={(e) =>
                            setSeaCost(parseFloat(e.target.value) || 650)
                          }
                          style={{ ...sInput, width: 140 }}
                        />
                      </div>
                    )}
                  </div>

                  {shipMode === "ddp_air" && (
                    <div
                      style={{
                        ...sCard,
                        padding: 14,
                        marginBottom: 16,
                        background: T.ink050,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.ink400,
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        DDP Air Rate Card (China → SA)
                      </div>
                      {DDP_TIERS.map((t, i) => {
                        const active =
                          totalWeight <= t.maxKg &&
                          (i === 0 || totalWeight > DDP_TIERS[i - 1].maxKg);
                        return (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                              padding: "3px 0",
                              color: active ? T.accent : T.ink300,
                              fontWeight: active ? 700 : 400,
                              fontFamily: T.fontData,
                            }}
                          >
                            <span>
                              {i === 0 ? "≤" : `${DDP_TIERS[i - 1].maxKg}–`}
                              {t.maxKg === Infinity ? "100+" : t.maxKg}kg
                            </span>
                            <span>
                              ${t.rateUsd}/kg + $25 clearance
                              {active ? " ← current" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: T.ink500,
                        display: "block",
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Notes (optional)
                    </label>
                    <textarea
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      rows={3}
                      placeholder="Supplier invoice ref, special instructions, etc."
                      style={{ ...sInput, resize: "vertical" }}
                    />
                  </div>

                  {/* Cost summary */}
                  <div
                    style={{
                      ...sCard,
                      padding: 16,
                      background: T.accentLit,
                      border: `1px solid ${T.accentBd}`,
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 14px",
                        color: T.accent,
                        fontSize: 14,
                        fontFamily: T.fontUi,
                      }}
                    >
                      Cost Summary — FX locked at{" "}
                      <span style={{ fontFamily: T.fontData }}>
                        R{usdZar.toFixed(4)}/USD
                      </span>
                    </h4>
                    {lineItems.map((item) => (
                      <div
                        key={item.product_id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          padding: "5px 0",
                          borderBottom: `1px solid ${T.accentBd}`,
                          fontFamily: T.fontUi,
                        }}
                      >
                        <span>
                          {item.name} × {item.qty}
                        </span>
                        <span style={{ fontFamily: T.fontData }}>
                          {fmtUsd(item.unit_price_usd * item.qty)}
                        </span>
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {[
                        ["Subtotal (USD)", fmtUsd(subtotalUsd)],
                        [
                          `Shipping — ${SHIPPING_MODES.find((m) => m.id === shipMode)?.label} (${fmt(totalWeight, 3)} kg)`,
                          fmtUsd(shipCostUsd),
                        ],
                        ["Total (USD)", fmtUsd(totalUsd)],
                        ["Total landed cost (ZAR)", fmtZar(landedZar)],
                        ["Landed cost per unit (ZAR)", fmtZar(landedPerUnit)],
                        ["Total units", totalUnits],
                        ["Total weight", `${fmt(totalWeight, 3)} kg`],
                      ].map(([label, val]) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: T.ink700 }}>{label}</span>
                          <strong
                            style={{ color: T.accent, fontFamily: T.fontData }}
                          >
                            {val}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: `1px solid ${T.ink150}`,
                display: "flex",
                justifyContent: "space-between",
                position: "sticky",
                bottom: 0,
                background: "#fff",
              }}
            >
              <button
                style={mkBtn("ghost")}
                onClick={() => {
                  if (step === 1) {
                    setShowCreate(false);
                    resetCreate();
                  } else setStep((s) => s - 1);
                }}
              >
                {step === 1 ? "Cancel" : "← Back"}
              </button>
              {step < 3 ? (
                <button
                  style={mkBtn("primary")}
                  disabled={
                    (step === 1 && !selSupplier) ||
                    (step === 2 && lineItems.length === 0)
                  }
                  onClick={() => {
                    if (step === 1 && selSupplier) {
                      fetchCatalogue(selSupplier.id);
                      setStep(2);
                    } else if (step === 2 && lineItems.length > 0) setStep(3);
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  style={mkBtn("primary")}
                  disabled={creating || lineItems.length === 0}
                  onClick={handleCreate}
                >
                  {creating ? "Creating…" : `Create PO (${fmtZar(landedZar)})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PO Detail Modal ── */}
      {selectedPo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 900,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setSelectedPo(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              width: "100%",
              maxWidth: 680,
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 28,
              fontFamily: T.fontUi,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const po = selectedPo;
              const status = po.po_status || po.status || "draft";
              const nextStatus = NEXT_STATUS[status];
              const overdue = isOverdue(po);
              const shipMeta =
                SHIPPING_MODES.find((m) => m.id === po.shipping_mode) ||
                SHIPPING_MODES[0];
              return (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 20,
                          fontFamily: T.fontUi,
                          fontWeight: 500,
                          color: T.ink900,
                        }}
                      >
                        <span style={{ fontFamily: T.fontData }}>
                          {po.po_number}
                        </span>
                      </h3>
                      <div
                        style={{ fontSize: 13, color: T.ink500, marginTop: 4 }}
                      >
                        {po.suppliers?.name} · {po.suppliers?.country}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <StatusBadge status={status} />
                      {overdue && (
                        <span
                          style={{
                            fontSize: 11,
                            color: T.danger,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          Overdue
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedPo(null)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 20,
                          color: T.ink300,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Status pipeline */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 24,
                      gap: 0,
                      overflowX: "auto",
                    }}
                  >
                    {STATUSES.map((s, i) => {
                      const meta = STATUS_META[s];
                      const done = STATUSES.indexOf(status) >= i;
                      return (
                        <div
                          key={s}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              textAlign: "center",
                              padding: "7px 3px",
                              borderRadius: 4,
                              fontSize: 10,
                              background: done ? meta.bg : T.ink075,
                              color: done ? meta.color : T.ink300,
                              fontWeight: status === s ? 800 : 500,
                              border:
                                status === s
                                  ? `2px solid ${meta.color}`
                                  : "2px solid transparent",
                              fontFamily: T.fontUi,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {meta.label}
                          </div>
                          {i < STATUSES.length - 1 && (
                            <div
                              style={{
                                width: 16,
                                height: 2,
                                background:
                                  STATUSES.indexOf(status) > i
                                    ? T.accent
                                    : T.ink150,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Key details grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      ["Order Date", po.order_date || "—"],
                      ["Shipping Mode", shipMeta.label],
                      [
                        "Expected Arrival",
                        po.expected_arrival || po.expected_date || "Not set",
                      ],
                      [
                        "Actual Arrival",
                        po.actual_arrival || po.received_date || "—",
                      ],
                      [
                        "Locked FX Rate",
                        po.usd_zar_rate
                          ? `R${parseFloat(po.usd_zar_rate).toFixed(4)}/USD`
                          : "—",
                      ],
                      [
                        "Total Weight",
                        po.total_weight_kg ? `${po.total_weight_kg} kg` : "—",
                      ],
                      ["Subtotal (USD)", fmtUsd(po.subtotal)],
                      ["Shipping (USD)", fmtUsd(po.shipping_cost_usd)],
                    ].map(([label, val]) => (
                      <div
                        key={label}
                        style={{
                          background: T.ink075,
                          borderRadius: 6,
                          padding: "10px 14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: T.ink400,
                            marginBottom: 3,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            fontWeight: 700,
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: T.ink900,
                            fontFamily: [
                              "Locked FX Rate",
                              "Total Weight",
                              "Subtotal (USD)",
                              "Shipping (USD)",
                            ].includes(label)
                              ? T.fontData
                              : T.fontUi,
                          }}
                        >
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Landed cost */}
                  <div
                    style={{
                      background: T.accentLit,
                      border: `1px solid ${T.accentBd}`,
                      borderRadius: 6,
                      padding: "14px 18px",
                      marginBottom: 20,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          marginBottom: 3,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 700,
                        }}
                      >
                        Total Landed Cost (ZAR)
                      </div>
                      <div
                        style={{
                          fontFamily: T.fontData,
                          fontSize: 24,
                          fontWeight: 400,
                          color: T.accent,
                        }}
                      >
                        {fmtZar(po.landed_cost_zar)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          marginBottom: 3,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 700,
                        }}
                      >
                        FX Rate (locked)
                      </div>
                      <div
                        style={{
                          fontFamily: T.fontData,
                          fontSize: 16,
                          fontWeight: 400,
                          color: T.success,
                        }}
                      >
                        R
                        {po.usd_zar_rate
                          ? parseFloat(po.usd_zar_rate).toFixed(4)
                          : "—"}
                        /USD
                      </div>
                    </div>
                  </div>

                  {po.notes && (
                    <div
                      style={{
                        marginBottom: 16,
                        fontSize: 12,
                        color: T.ink700,
                        background: T.ink075,
                        padding: "10px 14px",
                        borderRadius: 6,
                      }}
                    >
                      <strong>Notes:</strong> {po.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {nextStatus &&
                      status !== "received" &&
                      status !== "complete" && (
                        <button
                          style={mkBtn("advance")}
                          onClick={() => handleAdvance(po, nextStatus)}
                        >
                          → Advance to {STATUS_META[nextStatus]?.label}
                        </button>
                      )}
                    {status === "customs" && (
                      <button
                        style={mkBtn("success")}
                        onClick={() => handleReceive(po)}
                        disabled={receiving}
                      >
                        {receiving
                          ? "Receiving…"
                          : "Mark as Received & Update Inventory"}
                      </button>
                    )}
                    {status === "received" && (
                      <button
                        style={mkBtn("primary")}
                        onClick={() => handleAdvance(po, "complete")}
                      >
                        Mark Complete
                      </button>
                    )}
                    <button
                      style={mkBtn("ghost")}
                      onClick={() => setSelectedPo(null)}
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
