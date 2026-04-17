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
import { useTenant } from "../../services/tenantService";
import StockReceiveModal from "./StockReceiveModal";
import WorkflowGuide from "../WorkflowGuide";
import { ChartCard, ChartTooltip } from "../viz";
import { usePageContext } from "../../hooks/usePageContext";
import InfoTooltip from "../InfoTooltip";
import { T as DS } from "../../styles/tokens";

// ── Design tokens — bridge to shared DS token system ─────────────────────
// Local aliases preserve existing T.xxx references throughout this file
const T = {
  ...DS,                          // inherit all shared tokens
  ink150:   DS.border,            // local alias for 1px borders
  ink075:   DS.bg,                // local alias for subtle backgrounds
  ink050:   DS.surface,           // local alias for near-white surfaces
  successBg: DS.successLight,
  warningBg: DS.warningLight,
  dangerBg:  DS.dangerLight,
  infoBg:    DS.infoLight,
  accentLit: DS.accentLight,
  fontUi:    DS.font,
  fontData:  DS.font,
  shadow:    DS.shadow.sm,
  shadowMd:  DS.shadow.md,
  label: { fontFamily: DS.font, fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" },
  kpi:   { fontFamily: DS.font, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" },
  body:  { fontFamily: DS.font, fontSize: 13, fontWeight: 400 },
  data:  { fontFamily: DS.font, fontSize: 12, fontWeight: 400, fontVariantNumeric: "tabular-nums" },
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
  // USD international (Pure PTV)
  "draft",
  "ordered",
  "in_transit",
  "customs",
  "received",
  "complete",
  // ZAR local (Medi Rec)
  "sent",
  "awaiting_delivery",
  "partial",
  "paid",
];

const STATUS_META = {
  // USD international statuses (Pure PTV flow — unchanged)
  draft: { label: "Draft", color: T.ink500, bg: T.ink075 },
  ordered: { label: "Ordered", color: T.info, bg: T.infoBg },
  in_transit: { label: "In Transit", color: T.warning, bg: T.warningBg },
  customs: { label: "Customs", color: "#6B21A8", bg: "#F5F3FF" },
  received: { label: "Received", color: T.success, bg: T.successBg },
  complete: { label: "Complete", color: T.accent, bg: T.accentLit },
  // Document ingestion statuses (WHO- POs from Pure PTV pipeline)
  confirmed: { label: "Confirmed", color: T.success, bg: T.successBg },
  cancelled: { label: "Cancelled", color: T.ink500, bg: T.ink075 },
  // ZAR local statuses (Medi Rec flow — new)
  sent: { label: "Sent", color: T.info, bg: T.infoBg },
  awaiting_delivery: { label: "Awaiting", color: T.warning, bg: T.warningBg },
  partial: { label: "Partial", color: "#6B21A8", bg: "#F5F3FF" },
  paid: { label: "Paid", color: T.accent, bg: T.accentLit },
};

// ZAR local status progression
const NEXT_STATUS_ZAR = {
  draft: "sent",
  sent: "awaiting_delivery",
  awaiting_delivery: "received",
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
  background: T.surface,
  border: `1px solid ${T.ink150}`,
  borderRadius: T.radius.md,
  padding: "20px",
  boxShadow: T.shadow,
};

const mkBtn = (variant = "primary") => {
  const base = {
    padding: "9px 18px",
    borderRadius: T.radius.sm,
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
  borderRadius: T.radius.sm,
  fontFamily: T.fontUi,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  color: T.ink900,
};
const sTh = {
  padding: "11px 14px",
  textAlign: "left",
  fontSize: 11,
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
        borderRadius: T.radius.sm,
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
export default function HQPurchaseOrders({
  tenantId: tenantIdProp,
  industryProfile: profileProp,
} = {}) {
  const { fxRate, fxLoading } = useFxRate();
  const { tenantId: ctxTenantId, industryProfile: ctxProfile } = useTenant();
  const tenantId = tenantIdProp || ctxTenantId;
  const industryProfile = profileProp || ctxProfile || "vape";
  const isCannabisTenant = industryProfile === "cannabis_retail";
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
  // ZAR local mode
  const [poMode, setPoMode] = useState(
    isCannabisTenant ? "local" : "international",
  );
  const [zarLines, setZarLines] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [zarNotes, setZarNotes] = useState("");
  const [receivePo, setReceivePo] = useState(null);
  const ctx = usePageContext("procurement", null);

  const fetchPOs = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(name, country, currency)")
      .eq("tenant_id", tenantId)
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
  }, [tenantId]);

  const fetchInventoryItems = useCallback(async () => {
    if (!tenantId) return;
    setItemsLoading(true);
    const { data } = await supabase
      .from("inventory_items")
      .select(
        "id,name,sku,brand,category,subcategory,variant_value,sell_price,weighted_avg_cost,quantity_on_hand,reorder_level,unit",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("category")
      .order("name");
    setInventoryItems(data || []);
    setItemsLoading(false);
  }, [tenantId]);

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase.from("suppliers").select("*").eq("tenant_id", tenantId).order("name");
    setSuppliers(data || []);
  }, [tenantId]);

  useEffect(() => {
    fetchPOs();
    fetchSuppliers();
    fetchInventoryItems();
  }, [fetchPOs, fetchSuppliers, fetchInventoryItems]);

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
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }, []);

  const handleCreate = async () => {
    if (!selSupplier || lineItems.length === 0) return;
    setCreating(true);
    const _d = new Date();
    const _ds = `${_d.getFullYear()}${String(_d.getMonth() + 1).padStart(2, "0")}${String(_d.getDate()).padStart(2, "0")}`;
    const poNumber = `PO-${_ds}-${Math.floor(1000 + Math.random() * 9000)}`;
    const lockedRate = usdZar;
    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: poNumber,
        tenant_id: tenantId,
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
      tenant_id: tenantId,
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
          const costPrice = parseFloat(
            item.landed_cost_per_unit_zar || item.unit_cost || 0,
          );
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

            const { data: newItem, error: createErr } = await supabase
              .from("inventory_items")
              .insert({
                tenant_id: tenantId,
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
                tenant_id: tenantId,
                item_id: inventoryItemId,
                quantity: qty,
                movement_type: "purchase_in",
                unit_cost: parseFloat(costPrice.toFixed(2)),
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
  // ── ZAR local PO create ──────────────────────────────────────────────────
  const handleCreateLocal = async () => {
    if (!selSupplier || zarLines.length === 0) return;
    setCreating(true);
    const _d = new Date();
    const _ds = `${_d.getFullYear()}${String(_d.getMonth() + 1).padStart(2, "0")}${String(_d.getDate()).padStart(2, "0")}`;
    const poNumber = `PO-${_ds}-${Math.floor(1000 + Math.random() * 9000)}`;
    const subtotalZar = zarLines.reduce((s, l) => s + l.qty * l.unit_cost, 0);
    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: poNumber,
        tenant_id: tenantId,
        supplier_id: selSupplier.id,
        status: "draft",
        po_status: "draft",
        order_date: new Date().toISOString().split("T")[0],
        expected_date: expectedDelivery || null,
        expected_arrival: expectedDelivery || null,
        subtotal: parseFloat(subtotalZar.toFixed(2)),
        landed_cost_zar: parseFloat(subtotalZar.toFixed(2)),
        currency: "ZAR",
        notes: zarNotes || null,
        direction: "inbound",
      })
      .select()
      .single();
    if (error || !po) {
      console.error("[HQPurchaseOrders] ZAR PO create error:", error);
      setCreating(false);
      return;
    }
    const lineInserts = zarLines.map((l) => ({
      tenant_id: tenantId,
      po_id: po.id,
      item_id: l.item_id,
      quantity_ordered: l.qty,
      unit_cost: parseFloat(l.unit_cost.toFixed(2)),
      line_total: parseFloat((l.qty * l.unit_cost).toFixed(2)),
      notes: l.name,
    }));
    await supabase.from("purchase_order_items").insert(lineInserts);
    setCreating(false);
    setShowCreate(false);
    setZarLines([]);
    setExpectedDelivery("");
    setZarNotes("");
    setSelSupplier(null);
    showToast(
      `${poNumber} created — R${subtotalZar.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
    );
    fetchPOs();
  };

  // ── PDF generation ───────────────────────────────────────────────────────
  const generatePDF = async (po) => {
    const { data: lines } = await supabase
      .from("purchase_order_items")
      .select("*, inventory_items(name, sku, unit)")
      .eq("po_id", po.id);
    const supplierName = po.suppliers?.name || "Supplier";
    const total = (lines || []).reduce(
      (s, l) => s + parseFloat(l.line_total || 0),
      0,
    );
    const html = `<!DOCTYPE html><html><head><title>${po.po_number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#111;padding:40px}
  h1{font-size:22px;font-weight:600;margin-bottom:4px}
  .meta{color:#666;font-size:12px;margin-bottom:24px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #1A3D2B}
  .co{font-size:13px;font-weight:600;color:#1A3D2B}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#1A3D2B;color:#fff;padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.08em;text-transform:uppercase}
  td{padding:9px 10px;border-bottom:1px solid #eee;font-size:12px}
  tr:nth-child(even) td{background:#f9f9f9}
  .total{text-align:right;padding:14px 10px 0;font-weight:600;font-size:14px;color:#1A3D2B}
  .footer{margin-top:32px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:12px}
  .badge{display:inline-block;padding:3px 10px;background:#E8F5EE;color:#1A3D2B;border-radius:3px;font-size:11px;font-weight:600;letter-spacing:0.05em}
</style></head><body>
<div class="header">
  <div>
    <div class="co">Medi Recreational</div>
    <div style="color:#999;font-size:11px;margin-top:2px">Purchase Order</div>
  </div>
  <div style="text-align:right">
    <h1>${po.po_number}</h1>
    <div class="meta">Date: ${po.order_date || new Date().toLocaleDateString("en-ZA")}</div>
    ${po.expected_date ? `<div class="meta">Expected delivery: ${po.expected_date}</div>` : ""}
    <span class="badge">ZAR Order</span>
  </div>
</div>
<div style="margin-bottom:20px">
  <div style="font-weight:600;font-size:13px">${supplierName}</div>
  ${po.notes ? `<div style="margin-top:6px;font-size:11px;color:#666">${po.notes}</div>` : ""}
</div>
<table>
  <thead><tr><th>Item</th><th>SKU</th><th>Unit</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Cost</th><th style="text-align:right">Line Total</th></tr></thead>
  <tbody>
    ${(lines || [])
      .map(
        (l) => `<tr>
      <td>${l.inventory_items?.name || l.notes || "—"}</td>
      <td style="font-family:monospace;font-size:11px">${l.inventory_items?.sku || "—"}</td>
      <td>${l.inventory_items?.unit || "unit"}</td>
      <td style="text-align:right">${parseFloat(l.quantity_ordered || 0).toLocaleString("en-ZA")}</td>
      <td style="text-align:right">R${parseFloat(l.unit_cost || 0).toFixed(2)}</td>
      <td style="text-align:right;font-weight:500">R${parseFloat(l.line_total || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
    </tr>`,
      )
      .join("")}
  </tbody>
</table>
<div class="total">Total: R${total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
<div class="footer">Generated by NuAi · ${new Date().toLocaleDateString("en-ZA")} · ${po.po_number} · This is an official purchase order. Please confirm receipt.</div>
</body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
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
            borderRadius: T.radius.md,
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
              fontWeight: 600,
              color: T.ink900,
              letterSpacing: "-0.01em",
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
              borderRadius: T.radius.sm,
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
          borderRadius: T.radius.md,
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
              style={{ background: T.surface, padding: "16px 18px" }}
            >
              <div
                style={{
                  fontFamily: T.fontData,
                  fontSize: 26,
                  fontWeight: 600,
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
              <ChartCard title="PO Pipeline" subtitle="Purchase orders by current status" accent="blue" height={240}>
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
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-out"
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

              <ChartCard title="Supplier Spend" subtitle="Landed cost by supplier · ZAR" accent="green" height={240}>
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
                        isAnimationActive={true}
                        animationDuration={600}
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
            borderRadius: T.radius.md,
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
                borderRadius: T.radius.full,
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
                    ...(filteredPos.some((p) => p.currency !== "ZAR")
                      ? [
                          "Shipping",
                          "Subtotal (USD)",
                          "Landed Cost (ZAR)",
                          "FX Rate",
                        ]
                      : ["Total (ZAR)"]),
                    "Expected",
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
                  const nextStatus =
                    po.currency === "ZAR"
                      ? NEXT_STATUS_ZAR[status]
                      : NEXT_STATUS[status]; // eslint-disable-line no-unused-vars -- NEXT_STATUS_ZAR used here
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
                      {/* Currency-aware cells — ZAR local vs USD import */}
                      {po.currency === "ZAR" ? (
                        <td
                          style={{
                            ...sTd,
                            fontFamily: T.fontData,
                            fontWeight: 600,
                            color: T.accent,
                          }}
                        >
                          {fmtZar(po.subtotal || po.landed_cost_zar)}
                        </td>
                      ) : (
                        <>
                          <td style={{ ...sTd, fontSize: 12 }}>
                            {shipMeta.label}
                          </td>
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
                        </>
                      )}
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
                          {/* USD international — Pure PTV: unchanged */}
                          {status === "customs" && po.currency !== "ZAR" && (
                            <button
                              style={mkBtn("success")}
                              onClick={() => handleReceive(po)}
                              disabled={receiving}
                            >
                              {receiving ? "Receiving…" : "Receive"}
                            </button>
                          )}
                          {status === "received" && po.currency !== "ZAR" && (
                            <button
                              style={mkBtn("small")}
                              onClick={() => handleAdvance(po, "complete")}
                            >
                              Complete
                            </button>
                          )}
                          {/* ZAR local — Medi Rec: routes through StockReceiveModal */}
                          {(status === "sent" ||
                            status === "awaiting_delivery") &&
                            po.currency === "ZAR" && (
                              <button
                                style={mkBtn("success")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReceivePo(po);
                                }}
                              >
                                Receive →
                              </button>
                            )}
                          {status === "received" && po.currency === "ZAR" && (
                            <button
                              style={mkBtn("small")}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvance(po, "paid");
                              }}
                            >
                              Mark paid
                            </button>
                          )}
                          {po.currency === "ZAR" && (
                            <button
                              style={mkBtn("small")}
                              onClick={(e) => {
                                e.stopPropagation();
                                generatePDF(po);
                              }}
                            >
                              PDF
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
              background: T.surface,
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
                background: T.surface,
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
                  {poMode === "local"
                    ? "Local supplier (ZAR) — items from your catalogue"
                    : `Step ${step} of 3 — ${["Select Supplier", "Add Items", "Shipping & Confirm"][step - 1]}`}
                </div>
              </div>
              {/* Mode toggle */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  style={{
                    ...mkBtn(poMode === "local" ? "primary" : "ghost"),
                    fontSize: 11,
                    padding: "5px 12px",
                  }}
                  onClick={() => setPoMode("local")}
                >
                  ZAR Local
                </button>
                <button
                  style={{
                    ...mkBtn(poMode === "international" ? "primary" : "ghost"),
                    fontSize: 11,
                    padding: "5px 12px",
                  }}
                  onClick={() => setPoMode("international")}
                >
                  USD Import
                </button>
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

            {/* ZAR local create form */}
            {poMode === "local" && (
              <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
                {/* Step 1: Supplier */}
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: T.ink400,
                      marginBottom: 6,
                      fontFamily: T.fontUi,
                    }}
                  >
                    Supplier
                  </label>
                  <select
                    value={selSupplier?.id || ""}
                    onChange={(e) => {
                      const s = suppliers.find((x) => x.id === e.target.value);
                      setSelSupplier(s || null);
                    }}
                    style={{
                      ...{
                        padding: "9px 12px",
                        border: `1px solid ${T.ink150}`,
                        borderRadius: T.radius.sm,
                        fontFamily: T.fontUi,
                        fontSize: 13,
                        width: "100%",
                        boxSizing: "border-box",
                        color: T.ink900,
                      },
                      background: T.surface,
                    }}
                  >
                    <option value="">— Select supplier —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.country ? ` (${s.country})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: T.ink400,
                        marginBottom: 6,
                        fontFamily: T.fontUi,
                      }}
                    >
                      Expected delivery{" "}
                      <span style={{ color: T.danger }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={expectedDelivery}
                      onChange={(e) => setExpectedDelivery(e.target.value)}
                      style={{
                        padding: "9px 12px",
                        border: `1px solid ${T.ink150}`,
                        borderRadius: T.radius.sm,
                        fontFamily: T.fontUi,
                        fontSize: 13,
                        width: "100%",
                        boxSizing: "border-box",
                        color: T.ink900,
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: T.ink400,
                        marginBottom: 6,
                        fontFamily: T.fontUi,
                      }}
                    >
                      Notes
                    </label>
                    <input
                      type="text"
                      value={zarNotes}
                      onChange={(e) => setZarNotes(e.target.value)}
                      placeholder="e.g. delivery instructions"
                      style={{
                        padding: "9px 12px",
                        border: `1px solid ${T.ink150}`,
                        borderRadius: T.radius.sm,
                        fontFamily: T.fontUi,
                        fontSize: 13,
                        width: "100%",
                        boxSizing: "border-box",
                        color: T.ink900,
                      }}
                    />
                  </div>
                </div>
                {/* Item picker */}
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: T.ink400,
                      fontFamily: T.fontUi,
                    }}
                  >
                    Add items ({zarLines.length} selected)
                  </label>
                  {zarLines.length > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: T.fontData,
                        color: T.accent,
                        fontWeight: 600,
                      }}
                    >
                      Total: R
                      {zarLines
                        .reduce((s, l) => s + l.qty * l.unit_cost, 0)
                        .toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                {/* Selected lines */}
                {zarLines.length > 0 && (
                  <div
                    style={{
                      border: `1px solid ${T.successBd}`,
                      borderRadius: T.radius.md,
                      marginBottom: 14,
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontFamily: T.fontUi,
                      }}
                    >
                      <thead>
                        <tr style={{ background: T.successBg }}>
                          {["Item", "Qty", "Unit cost (R)", "Total", ""].map(
                            (h) => (
                              <th
                                key={h}
                                style={{
                                  padding: "6px 10px",
                                  textAlign: "left",
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: T.ink400,
                                  borderBottom: `1px solid ${T.successBd}`,
                                }}
                              >
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {zarLines.map((l, i) => (
                          <tr key={l.item_id}>
                            <td
                              style={{
                                padding: "7px 10px",
                                fontSize: 12,
                                color: T.ink900,
                              }}
                            >
                              <div>{l.name}</div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.ink400,
                                  fontFamily: T.fontData,
                                }}
                              >
                                {l.sku}
                              </div>
                            </td>
                            <td style={{ padding: "7px 10px" }}>
                              <input
                                type="number"
                                min={1}
                                value={l.qty}
                                onChange={(e) =>
                                  setZarLines((prev) =>
                                    prev.map((x, j) =>
                                      j === i
                                        ? {
                                            ...x,
                                            qty: Math.max(
                                              1,
                                              parseInt(e.target.value) || 1,
                                            ),
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                style={{
                                  width: 60,
                                  padding: "3px 6px",
                                  border: `1px solid ${T.ink150}`,
                                  borderRadius: T.radius.sm,
                                  fontFamily: T.fontData,
                                  fontSize: 12,
                                }}
                              />
                            </td>
                            <td style={{ padding: "7px 10px" }}>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={l.unit_cost}
                                onChange={(e) =>
                                  setZarLines((prev) =>
                                    prev.map((x, j) =>
                                      j === i
                                        ? {
                                            ...x,
                                            unit_cost:
                                              parseFloat(e.target.value) || 0,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                style={{
                                  width: 80,
                                  padding: "3px 6px",
                                  border: `1px solid ${T.ink150}`,
                                  borderRadius: T.radius.sm,
                                  fontFamily: T.fontData,
                                  fontSize: 12,
                                }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                fontFamily: T.fontData,
                                fontSize: 12,
                                color: T.accent,
                                fontWeight: 600,
                              }}
                            >
                              R{(l.qty * l.unit_cost).toFixed(2)}
                            </td>
                            <td style={{ padding: "7px 10px" }}>
                              <button
                                onClick={() =>
                                  setZarLines((prev) =>
                                    prev.filter((_, j) => j !== i),
                                  )
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: T.danger,
                                  fontSize: 14,
                                }}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Inventory search */}
                {itemsLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 20,
                      color: T.ink400,
                      fontSize: 12,
                    }}
                  >
                    Loading catalogue…
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: 300,
                      overflowY: "auto",
                      border: `1px solid ${T.ink150}`,
                      borderRadius: T.radius.md,
                    }}
                  >
                    {inventoryItems
                      .filter((i) => !zarLines.find((l) => l.item_id === i.id))
                      .map((item) => {
                        const suggestedCost =
                          item.weighted_avg_cost > 0
                            ? item.weighted_avg_cost
                            : parseFloat((item.sell_price * 0.4).toFixed(2));
                        const isLow =
                          item.reorder_level > 0 &&
                          item.quantity_on_hand <= item.reorder_level;
                        return (
                          <div
                            key={item.id}
                            onClick={() =>
                              setZarLines((prev) => [
                                ...prev,
                                {
                                  item_id: item.id,
                                  name: item.name,
                                  sku: item.sku,
                                  qty: Math.max(
                                    1,
                                    (item.reorder_level || 0) * 2 -
                                      (item.quantity_on_hand || 0) || 10,
                                  ),
                                  unit_cost: suggestedCost,
                                },
                              ])
                            }
                            style={{
                              padding: "9px 12px",
                              borderBottom: `1px solid ${T.ink075}`,
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: isLow ? T.warningBg : "transparent",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.background = T.accentLit)
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.background = isLow
                                ? T.warningBg
                                : "transparent")
                            }
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: T.ink900,
                                }}
                              >
                                {item.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.ink400,
                                  fontFamily: T.fontData,
                                }}
                              >
                                {item.sku} · {item.category} · On hand:{" "}
                                {item.quantity_on_hand || 0}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontFamily: T.fontData,
                                  color: T.accentMid,
                                  fontWeight: 600,
                                }}
                              >
                                R{suggestedCost.toFixed(2)}
                              </div>
                              {isLow && (
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: T.warning,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                  }}
                                >
                                  Below reorder
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {inventoryItems.filter(
                      (i) => !zarLines.find((l) => l.item_id === i.id),
                    ).length === 0 && (
                      <div
                        style={{
                          padding: 20,
                          textAlign: "center",
                          color: T.ink400,
                          fontSize: 12,
                        }}
                      >
                        All items added
                      </div>
                    )}
                  </div>
                )}
                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: `1px solid ${T.ink150}`,
                  }}
                >
                  <button
                    style={mkBtn("ghost")}
                    onClick={() => {
                      setShowCreate(false);
                      setZarLines([]);
                      setSelSupplier(null);
                      setExpectedDelivery("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    style={mkBtn("primary")}
                    disabled={
                      !selSupplier ||
                      zarLines.length === 0 ||
                      !expectedDelivery ||
                      creating
                    }
                    onClick={handleCreateLocal}
                  >
                    {creating
                      ? "Creating…"
                      : `Create PO (${zarLines.length} items)`}
                  </button>
                </div>
              </div>
            )}

            {/* USD international steps — Pure PTV unchanged */}
            {poMode === "international" && (
              <>
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
                      <p
                        style={{ color: T.ink500, marginTop: 0, fontSize: 13 }}
                      >
                        Choose the supplier for this purchase order.{" "}
                        <InfoTooltip id="po-select-supplier" />
                      </p>
                      {suppliers.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelSupplier(s)}
                          style={{
                            padding: "16px 18px",
                            borderRadius: T.radius.md,
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
                              <strong style={{ color: T.ink900 }}>
                                {s.name}
                              </strong>
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
                              borderRadius: T.radius.full,
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
                                  borderRadius: T.radius.md,
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
                                  <span
                                    style={{ fontWeight: 600, fontSize: 13 }}
                                  >
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
                                      borderRadius: T.radius.sm,
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
                                    MOQ: {p.moq || 1} ·{" "}
                                    {fmtUsd(p.unit_price_usd)}
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
                                  Subtotal:{" "}
                                  <strong>{fmtUsd(subtotalUsd)}</strong>
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
                              borderRadius: T.radius.md,
                              marginBottom: 6,
                              cursor: "pointer",
                              border: `2px solid ${shipMode === m.id ? T.accent : T.ink150}`,
                              background:
                                shipMode === m.id ? T.accentLit : "#fff",
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
                              <span
                                style={{ color: T.success, fontWeight: 700 }}
                              >
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
                            [
                              "Landed cost per unit (ZAR)",
                              fmtZar(landedPerUnit),
                            ],
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
                                style={{
                                  color: T.accent,
                                  fontFamily: T.fontData,
                                }}
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
                    background: T.surface,
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
                        } else if (step === 2 && lineItems.length > 0)
                          setStep(3);
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
                      {creating
                        ? "Creating…"
                        : `Create PO (${fmtZar(landedZar)})`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── StockReceiveModal for ZAR POs ── */}
      {receivePo && (
        <StockReceiveModal
          tenantId={tenantId}
          onClose={() => setReceivePo(null)}
          onComplete={async () => {
            await supabase
              .from("purchase_orders")
              .update({
                po_status: "received",
                status: "received",
                actual_arrival: new Date().toISOString().split("T")[0],
                received_date: new Date().toISOString().split("T")[0],
              })
              .eq("id", receivePo.id);
            setReceivePo(null);
            showToast(`${receivePo.po_number} marked received — AVCO updated`);
            fetchPOs();
          }}
        />
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
              background: T.surface,
              borderRadius: T.radius.md,
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
              const nextStatus =
                po.currency === "ZAR"
                  ? NEXT_STATUS_ZAR[status]
                  : NEXT_STATUS[status];
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
                              borderRadius: T.radius.sm,
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
                          borderRadius: T.radius.md,
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
                      borderRadius: T.radius.md,
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
                        borderRadius: T.radius.md,
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
                    {/* USD: Pure PTV unchanged */}
                    {status === "customs" && po.currency !== "ZAR" && (
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
                    {status === "received" && po.currency !== "ZAR" && (
                      <button
                        style={mkBtn("primary")}
                        onClick={() => handleAdvance(po, "complete")}
                      >
                        Mark Complete
                      </button>
                    )}
                    {/* ZAR: Medi Rec */}
                    {(status === "sent" || status === "awaiting_delivery") &&
                      po.currency === "ZAR" && (
                        <button
                          style={mkBtn("success")}
                          onClick={() => setReceivePo(po)}
                        >
                          Receive Delivery →
                        </button>
                      )}
                    {status === "received" && po.currency === "ZAR" && (
                      <button
                        style={mkBtn("primary")}
                        onClick={() => handleAdvance(po, "paid")}
                      >
                        Mark Paid
                      </button>
                    )}
                    {po.currency === "ZAR" && (
                      <button
                        style={mkBtn("ghost")}
                        onClick={() => generatePDF(po)}
                      >
                        Download PDF
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
