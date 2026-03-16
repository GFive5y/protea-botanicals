// HQPurchaseOrders.js v1.1 — WP-B: Purchase Order Flow (Import-Aware)
// Protea Botanicals · Phase 2 · March 2026
//
// v1.1 fixes:
//   - handleReceive: auto-create inventory_items when no match found
//     (previously silently skipped all items if not pre-existing in inventory)
//   - handleReceive: write stock_movements for every received item
//   - handleReceive: stamp item_id back onto purchase_order_items after create/find
//   - handleCreate: remove line_total from insert (GENERATED column — never insert)
//
// v1.0 — New file — WP-B: Purchase Order Flow

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import InfoTooltip from "../InfoTooltip";

// ─── FX Rate Hook ─────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = [
  "draft",
  "ordered",
  "in_transit",
  "customs",
  "received",
  "complete",
];

const STATUS_META = {
  draft: { label: "Draft", color: "#9E9E9E", bg: "#F5F5F5" },
  ordered: { label: "Ordered", color: "#1976D2", bg: "#E3F2FD" },
  in_transit: { label: "In Transit", color: "#E65100", bg: "#FFF3E0" },
  customs: { label: "Customs", color: "#7B1FA2", bg: "#F3E5F5" },
  received: { label: "Received", color: "#2E7D32", bg: "#E8F5E9" },
  complete: { label: "Complete", color: "#00695C", bg: "#E0F2F1" },
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
    icon: "✈️",
  },
  {
    id: "standard_air",
    label: "Standard Air",
    note: "Half cube $800 flat · ~4 weeks",
    icon: "📦",
  },
  {
    id: "sea_freight",
    label: "Sea Freight",
    note: "$650/CBM self-pickup · 45–55 days",
    icon: "🚢",
  },
];

const DDP_TIERS = [
  { maxKg: 21, rateUsd: 15.8 },
  { maxKg: 50, rateUsd: 15.5 },
  { maxKg: 100, rateUsd: 15.2 },
  { maxKg: Infinity, rateUsd: 14.9 },
];

// ─── Category mapping: supplier_products → inventory_items ───────────────────
// supplier_products.category: "terpene" | "hardware"
// inventory_items.category:   "finished_product" | "raw_material" | "terpene" | "hardware"
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

// ─── Shipping Calculation ─────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        color: meta.color,
        background: meta.bg,
        letterSpacing: "0.3px",
      }}
    >
      {meta.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HQPurchaseOrders() {
  const { fxRate, fxLoading } = useFxRate();

  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [toast, setToast] = useState("");

  // Create PO state
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

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchPOs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(name, country, currency)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(
        "[HQPurchaseOrders] fetchPOs error:",
        error.message,
        error.code,
        error.details,
      );
    }
    console.log("[HQPurchaseOrders] rows returned:", data?.length ?? 0);
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

  // ── Line Item Management ─────────────────────────────────────────────────
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

  // ── Derived Totals ───────────────────────────────────────────────────────
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

  // ── Reset Create Panel ───────────────────────────────────────────────────
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

  // ── Create PO ────────────────────────────────────────────────────────────
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

    // Insert line items
    // ⚠ NEVER include line_total — it is a GENERATED column in Supabase
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
      // line_total intentionally omitted — GENERATED COLUMN
      notes: `${item.name}${item.sku ? ` (${item.sku})` : ""}`,
    }));

    const { error: lineErr } = await supabase
      .from("purchase_order_items")
      .insert(itemInserts);
    if (lineErr) {
      console.error("[HQPurchaseOrders] PO line insert error:", lineErr);
    }

    setCreating(false);
    setShowCreate(false);
    resetCreate();
    showToast(
      `✅ ${poNumber} created — FX rate locked at R${lockedRate.toFixed(4)}/USD`,
    );
    fetchPOs();
  };

  // ── Advance Status ───────────────────────────────────────────────────────
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
    if (selectedPo?.id === po.id) {
      setSelectedPo((prev) => ({
        ...prev,
        po_status: newStatus,
        status: newStatus,
      }));
    }
  };

  // ── Receive PO ───────────────────────────────────────────────────────────
  // v1.1: Auto-creates inventory_items when no match found + writes stock_movements
  const handleReceive = async (po) => {
    setReceiving(true);

    // 1. Mark PO as received
    await supabase
      .from("purchase_orders")
      .update({
        po_status: "received",
        status: "received",
        actual_arrival: new Date().toISOString().split("T")[0],
        received_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", po.id);

    // 2. Fetch line items with supplier product details
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select(
        "*, supplier_products(name, sku, category, unit_price_usd, weight_kg_per_unit)",
      )
      .eq("po_id", po.id);

    let itemsCreated = 0;
    let itemsUpdated = 0;
    let movementsWritten = 0;
    const errors = [];

    if (items && items.length > 0) {
      for (const item of items) {
        const sp = item.supplier_products;
        const productName =
          sp?.name || item.notes?.replace(/ \(.*\)$/, "") || "Unknown Product";
        const qty = parseFloat(item.quantity_ordered) || 0;

        if (qty <= 0) continue;

        try {
          // 3. Try to find existing inventory item by name (case-insensitive)
          const { data: existing } = await supabase
            .from("inventory_items")
            .select("id, quantity_on_hand")
            .ilike("name", productName)
            .maybeSingle();

          let inventoryItemId = null;

          if (existing) {
            // Update existing quantity
            const newQty = (parseFloat(existing.quantity_on_hand) || 0) + qty;
            await supabase
              .from("inventory_items")
              .update({ quantity_on_hand: newQty })
              .eq("id", existing.id);
            inventoryItemId = existing.id;
            itemsUpdated++;
          } else {
            // Auto-create inventory item from supplier product data
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

          // 4. Write stock movement
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

            if (moveErr) {
              console.error(
                `[HQPurchaseOrders] Stock movement error for "${productName}":`,
                moveErr,
              );
            } else {
              movementsWritten++;
            }

            // 5. Stamp item_id back onto PO line for traceability
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
      errors.length > 0 ? `⚠ ${errors.length} failed` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    showToast(`📦 PO received — ${summary || "inventory updated"}`);
    fetchPOs();
  };

  // ── Derived Display Lists ────────────────────────────────────────────────
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

  // ── Styles ───────────────────────────────────────────────────────────────
  const card = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #f0ede8",
    padding: "24px",
    marginBottom: 20,
  };

  const btn = (variant = "primary") => ({
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: "Jost, sans-serif",
    fontWeight: 600,
    fontSize: 14,
    transition: "opacity 0.15s",
    ...(variant === "primary" ? { background: "#2d4a2d", color: "#fff" } : {}),
    ...(variant === "ghost"
      ? {
          background: "transparent",
          color: "#2d4a2d",
          border: "1px solid #2d4a2d",
        }
      : {}),
    ...(variant === "danger" ? { background: "#c62828", color: "#fff" } : {}),
    ...(variant === "success" ? { background: "#2E7D32", color: "#fff" } : {}),
    ...(variant === "advance"
      ? {
          background: "#1976D2",
          color: "#fff",
          padding: "8px 16px",
          fontSize: 13,
        }
      : {}),
    ...(variant === "small"
      ? {
          background: "#f5f5f5",
          color: "#555",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
        }
      : {}),
  });

  const input = {
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontFamily: "Jost, sans-serif",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };

  const th = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #f0ede8",
  };
  const td = {
    padding: "14px 16px",
    fontSize: 14,
    color: "#333",
    borderBottom: "1px solid #f8f6f2",
    verticalAlign: "middle",
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "Jost, sans-serif", color: "#333" }}>
      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "#2d4a2d",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
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
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontFamily: "Cormorant Garamond, serif",
              fontWeight: 600,
              color: "#2d4a2d",
            }}
          >
            Procurement
          </h2>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: 14 }}>
            Import-aware purchase orders · landed cost · inventory receiving
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              background: fxLoading ? "#f5f5f5" : "#e8f5e9",
              border: "1px solid #c8e6c9",
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 13,
              color: "#2E7D32",
              fontWeight: 600,
            }}
          >
            {fxLoading
              ? "Loading FX…"
              : `USD/ZAR R${usdZar.toFixed(4)} ${fxRate?.source === "live" ? "🟢" : "🟡"}`}
            <InfoTooltip id="po-fx-rate" position="top" />
          </div>
          <button
            style={btn("primary")}
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

      {/* ── KPI Row ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total POs", value: pos.length, color: "#333" },
          {
            label: "In Transit / Customs",
            value: pos.filter((p) =>
              ["in_transit", "customs"].includes(p.po_status || p.status),
            ).length,
            color: "#E65100",
          },
          {
            label: "Overdue",
            value: overdueCount,
            color: overdueCount > 0 ? "#c62828" : "#2E7D32",
          },
          {
            label: "Completed (30d)",
            value: pos.filter((p) => (p.po_status || p.status) === "complete")
              .length,
            color: "#00695C",
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{ ...card, padding: "18px 22px", marginBottom: 0 }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Overdue Alert ─────────────────────────────────────────────── */}
      {overdueCount > 0 && (
        <div
          style={{
            background: "#fff3e0",
            border: "1px solid #ffcc80",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 20,
            fontSize: 14,
            color: "#E65100",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          ⚠️{" "}
          <strong>
            {overdueCount} overdue PO{overdueCount > 1 ? "s" : ""}
          </strong>{" "}
          — expected arrival date has passed.
        </div>
      )}

      {/* ── PO List ───────────────────────────────────────────────────── */}
      <div style={card}>
        {/* Filter chips */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
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
                padding: "7px 16px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "Jost, sans-serif",
                background: filterStatus === f.id ? "#2d4a2d" : "#f5f5f5",
                color: filterStatus === f.id ? "#fff" : "#666",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#999" }}>
            Loading purchase orders…
          </div>
        ) : filteredPos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#bbb" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div>
              No purchase orders
              {filterStatus !== "all"
                ? ` with status "${STATUS_META[filterStatus]?.label}"`
                : ""}
            </div>
            <button
              style={{ ...btn("ghost"), marginTop: 16 }}
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
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                    <th key={h} style={th}>
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
                        background: overdue ? "#fff8f0" : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedPo(po)}
                    >
                      <td style={td}>
                        <strong style={{ color: "#2d4a2d" }}>
                          {po.po_number}
                        </strong>
                        {overdue && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              color: "#c62828",
                              fontWeight: 600,
                            }}
                          >
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td style={td}>
                        <div>{po.suppliers?.name || "—"}</div>
                        <div style={{ fontSize: 12, color: "#999" }}>
                          {po.suppliers?.country}
                        </div>
                      </td>
                      <td style={td}>
                        <StatusBadge status={status} />
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 12 }}>
                          {shipMeta.icon} {shipMeta.label}
                        </span>
                      </td>
                      <td style={td}>{fmtUsd(po.subtotal)}</td>
                      <td style={td}>
                        <strong>{fmtZar(po.landed_cost_zar)}</strong>
                      </td>
                      <td style={td}>
                        {po.usd_zar_rate ? (
                          <span style={{ fontSize: 12, color: "#666" }}>
                            R{parseFloat(po.usd_zar_rate).toFixed(4)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={td}>
                        {po.expected_arrival || po.expected_date || "—"}
                        {overdue && (
                          <div style={{ fontSize: 11, color: "#c62828" }}>
                            Past due
                          </div>
                        )}
                      </td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          {nextStatus &&
                            status !== "received" &&
                            status !== "complete" && (
                              <button
                                style={btn("advance")}
                                onClick={() => handleAdvance(po, nextStatus)}
                              >
                                → {STATUS_META[nextStatus]?.label}
                              </button>
                            )}
                          {status === "customs" && (
                            <button
                              style={btn("success")}
                              onClick={() => handleReceive(po)}
                              disabled={receiving}
                            >
                              {receiving ? "Receiving…" : "📦 Receive"}
                            </button>
                          )}
                          {status === "received" && (
                            <button
                              style={{ ...btn("small"), color: "#00695C" }}
                              onClick={() => handleAdvance(po, "complete")}
                            >
                              ✓ Complete
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

      {/* ══════════════════════════════════════════════════════════════════
          CREATE PO SLIDE-IN PANEL
      ══════════════════════════════════════════════════════════════════ */}
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
                padding: "24px 28px",
                borderBottom: "1px solid #f0ede8",
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
                    fontSize: 20,
                    fontFamily: "Cormorant Garamond, serif",
                    color: "#2d4a2d",
                  }}
                >
                  New Purchase Order
                </h3>
                <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>
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
                  fontSize: 22,
                  color: "#999",
                }}
                onClick={() => {
                  setShowCreate(false);
                  resetCreate();
                }}
              >
                ✕
              </button>
            </div>

            {/* Step progress */}
            <div
              style={{
                padding: "16px 28px",
                borderBottom: "1px solid #f0ede8",
                display: "flex",
                gap: 8,
              }}
            >
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: step >= n ? "#2d4a2d" : "#e0e0e0",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: step >= n ? "#2d4a2d" : "#bbb",
                      marginTop: 4,
                      fontWeight: step === n ? 700 : 400,
                    }}
                  >
                    {["Supplier", "Items", "Shipping"][n - 1]}
                  </div>
                </div>
              ))}
            </div>

            {/* Panel body */}
            <div style={{ padding: 28, flex: 1 }}>
              {/* STEP 1: Select Supplier */}
              {step === 1 && (
                <div>
                  <p style={{ color: "#666", marginTop: 0, fontSize: 14 }}>
                    Choose the supplier for this purchase order.{" "}
                    <InfoTooltip id="po-select-supplier" />
                  </p>
                  {suppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelSupplier(s)}
                      style={{
                        padding: "18px 20px",
                        borderRadius: 10,
                        marginBottom: 12,
                        cursor: "pointer",
                        border: `2px solid ${selSupplier?.id === s.id ? "#2d4a2d" : "#f0ede8"}`,
                        background:
                          selSupplier?.id === s.id ? "#f0f7f0" : "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#2d4a2d" }}>{s.name}</strong>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#888",
                              marginTop: 4,
                            }}
                          >
                            {s.country} · {s.currency}
                          </div>
                        </div>
                        {selSupplier?.id === s.id && (
                          <span style={{ color: "#2d4a2d", fontSize: 20 }}>
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {suppliers.length === 0 && (
                    <div
                      style={{
                        color: "#999",
                        textAlign: "center",
                        padding: 32,
                      }}
                    >
                      No suppliers found. Add via HQ → Supply Chain.
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Add Items */}
              {step === 2 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    {["all", ...catCategories].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCatFilter(c)}
                        style={{
                          padding: "5px 14px",
                          borderRadius: 16,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "Jost, sans-serif",
                          background: catFilter === c ? "#2d4a2d" : "#f5f5f5",
                          color: catFilter === c ? "#fff" : "#666",
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
                        color: "#999",
                      }}
                    >
                      Loading catalogue…
                    </div>
                  ) : catalogueView.length === 0 ? (
                    <div
                      style={{
                        color: "#bbb",
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
                          fontSize: 13,
                          color: "#888",
                          margin: "0 0 12px",
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
                              padding: "12px 16px",
                              borderRadius: 8,
                              marginBottom: 8,
                              cursor: "pointer",
                              border: `1px solid ${inOrder ? "#a5d6a7" : "#f0ede8"}`,
                              background: inOrder ? "#f1f8e9" : "#fafafa",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>
                                {p.name}
                              </span>
                              {p.sku && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 12,
                                    color: "#999",
                                  }}
                                >
                                  {p.sku}
                                </span>
                              )}
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 11,
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  background: "#e8f5e9",
                                  color: "#2E7D32",
                                }}
                              >
                                {p.category}
                              </span>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#888",
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
                                style={{ fontWeight: 700, color: "#2d4a2d" }}
                              >
                                {fmtUsd(p.unit_price_usd)}
                              </div>
                              <div style={{ fontSize: 12, color: "#888" }}>
                                = {fmtZar(p.unit_price_usd * usdZar)}
                              </div>
                              {inOrder && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#2E7D32",
                                    fontWeight: 600,
                                  }}
                                >
                                  ✓ In order
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {lineItems.length > 0 && (
                        <div style={{ ...card, padding: 20, marginBottom: 0 }}>
                          <h4
                            style={{
                              margin: "0 0 14px",
                              fontSize: 14,
                              color: "#555",
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
                                gap: 12,
                                padding: "10px 0",
                                borderBottom: "1px solid #f5f5f5",
                              }}
                            >
                              <div style={{ flex: 2, fontSize: 13 }}>
                                <strong>{item.name}</strong>
                                {item.sku && (
                                  <span
                                    style={{ color: "#999", marginLeft: 6 }}
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
                                style={{ ...input, width: 80 }}
                              />
                              <div
                                style={{ flex: 1, fontSize: 13, color: "#555" }}
                              >
                                {fmtUsd(item.unit_price_usd * item.qty)}
                              </div>
                              <button
                                onClick={() => removeItem(item.product_id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#e57373",
                                  fontSize: 16,
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <div
                            style={{
                              marginTop: 12,
                              fontSize: 13,
                              color: "#666",
                              display: "flex",
                              justifyContent: "space-between",
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

              {/* STEP 3: Shipping & Confirm */}
              {step === 3 && (
                <div>
                  <div style={{ marginBottom: 24 }}>
                    <label
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#555",
                        display: "block",
                        marginBottom: 10,
                      }}
                    >
                      Shipping Mode <InfoTooltip id="po-shipping-mode" />
                    </label>
                    {SHIPPING_MODES.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setShipMode(m.id)}
                        style={{
                          padding: "14px 18px",
                          borderRadius: 10,
                          marginBottom: 8,
                          cursor: "pointer",
                          border: `2px solid ${shipMode === m.id ? "#2d4a2d" : "#f0ede8"}`,
                          background: shipMode === m.id ? "#f0f7f0" : "#fff",
                          display: "flex",
                          gap: 14,
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{m.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {m.label}
                          </div>
                          <div style={{ fontSize: 12, color: "#888" }}>
                            {m.note}
                          </div>
                        </div>
                        {shipMode === m.id && (
                          <span
                            style={{
                              marginLeft: "auto",
                              color: "#2d4a2d",
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    ))}
                    {shipMode === "sea_freight" && (
                      <div style={{ marginTop: 12 }}>
                        <label
                          style={{
                            fontSize: 13,
                            color: "#666",
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
                          style={{ ...input, width: 160 }}
                        />
                      </div>
                    )}
                  </div>

                  {shipMode === "ddp_air" && (
                    <div
                      style={{
                        ...card,
                        padding: 16,
                        marginBottom: 20,
                        background: "#f8f9fa",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#888",
                          marginBottom: 8,
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
                              fontSize: 12,
                              padding: "4px 0",
                              color: active ? "#2d4a2d" : "#aaa",
                              fontWeight: active ? 700 : 400,
                            }}
                          >
                            <span>
                              {i === 0 ? "≤" : `${DDP_TIERS[i - 1].maxKg}–`}
                              {t.maxKg === Infinity ? "100+" : t.maxKg}kg
                            </span>
                            <span>${t.rateUsd}/kg + $25 clearance</span>
                            {active && <span>← current</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginBottom: 24 }}>
                    <label
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#555",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Notes (optional)
                    </label>
                    <textarea
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      rows={3}
                      placeholder="Supplier invoice ref, special instructions, etc."
                      style={{ ...input, resize: "vertical" }}
                    />
                  </div>

                  <div
                    style={{
                      ...card,
                      padding: 20,
                      background: "#f0f7f0",
                      border: "1px solid #c8e6c9",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 16px",
                        color: "#2d4a2d",
                        fontSize: 15,
                      }}
                    >
                      💰 Cost Summary — FX Rate locked at R{usdZar.toFixed(4)}
                      /USD
                    </h4>
                    {lineItems.map((item) => (
                      <div
                        key={item.product_id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          padding: "6px 0",
                          borderBottom: "1px solid #c8e6c9",
                        }}
                      >
                        <span>
                          {item.name} × {item.qty}
                        </span>
                        <span>{fmtUsd(item.unit_price_usd * item.qty)}</span>
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
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
                            fontSize: 13,
                          }}
                        >
                          <span style={{ color: "#555" }}>{label}</span>
                          <strong style={{ color: "#2d4a2d" }}>{val}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div
              style={{
                padding: "20px 28px",
                borderTop: "1px solid #f0ede8",
                display: "flex",
                justifyContent: "space-between",
                position: "sticky",
                bottom: 0,
                background: "#fff",
              }}
            >
              <button
                style={btn("ghost")}
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
                  style={btn("primary")}
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
                  style={btn("primary")}
                  disabled={creating || lineItems.length === 0}
                  onClick={handleCreate}
                >
                  {creating
                    ? "Creating…"
                    : `✓ Create PO (${fmtZar(landedZar)})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PO DETAIL MODAL
      ══════════════════════════════════════════════════════════════════ */}
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
              borderRadius: 16,
              width: "100%",
              maxWidth: 680,
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 32,
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
                      marginBottom: 24,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 22,
                          fontFamily: "Cormorant Garamond, serif",
                          color: "#2d4a2d",
                        }}
                      >
                        {po.po_number}
                      </h3>
                      <div
                        style={{ fontSize: 14, color: "#888", marginTop: 6 }}
                      >
                        {po.suppliers?.name} · {po.suppliers?.country}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", gap: 10, alignItems: "center" }}
                    >
                      <StatusBadge status={status} />
                      {overdue && (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#c62828",
                            fontWeight: 700,
                          }}
                        >
                          ⚠ OVERDUE
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedPo(null)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 22,
                          color: "#bbb",
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
                      marginBottom: 28,
                      overflowX: "auto",
                      gap: 0,
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
                              padding: "8px 4px",
                              borderRadius: 6,
                              fontSize: 11,
                              background: done ? meta.bg : "#f5f5f5",
                              color: done ? meta.color : "#ccc",
                              fontWeight: status === s ? 800 : 500,
                              border:
                                status === s
                                  ? `2px solid ${meta.color}`
                                  : "2px solid transparent",
                            }}
                          >
                            {meta.label}
                          </div>
                          {i < STATUSES.length - 1 && (
                            <div
                              style={{
                                width: 20,
                                height: 2,
                                background:
                                  STATUSES.indexOf(status) > i
                                    ? "#2d4a2d"
                                    : "#e0e0e0",
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
                      gap: 12,
                      marginBottom: 24,
                    }}
                  >
                    {[
                      ["Order Date", po.order_date || "—"],
                      ["Shipping Mode", `${shipMeta.icon} ${shipMeta.label}`],
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
                      ["Shipping Cost (USD)", fmtUsd(po.shipping_cost_usd)],
                    ].map(([label, val]) => (
                      <div
                        key={label}
                        style={{
                          background: "#fafafa",
                          borderRadius: 8,
                          padding: "12px 16px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#999",
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#333",
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
                      background: "#f0f7f0",
                      border: "1px solid #c8e6c9",
                      borderRadius: 10,
                      padding: "16px 20px",
                      marginBottom: 24,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 12, color: "#555", marginBottom: 4 }}
                      >
                        Total Landed Cost (ZAR)
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 700,
                          color: "#2d4a2d",
                        }}
                      >
                        {fmtZar(po.landed_cost_zar)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{ fontSize: 12, color: "#555", marginBottom: 4 }}
                      >
                        FX Rate (locked at order)
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: "#388E3C",
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
                        marginBottom: 20,
                        fontSize: 13,
                        color: "#666",
                        background: "#f9f9f9",
                        padding: "12px 16px",
                        borderRadius: 8,
                      }}
                    >
                      <strong>Notes:</strong> {po.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {nextStatus &&
                      status !== "received" &&
                      status !== "complete" && (
                        <button
                          style={btn("advance")}
                          onClick={() => handleAdvance(po, nextStatus)}
                        >
                          → Advance to {STATUS_META[nextStatus]?.label}
                        </button>
                      )}
                    {status === "customs" && (
                      <button
                        style={btn("success")}
                        onClick={() => handleReceive(po)}
                        disabled={receiving}
                      >
                        {receiving
                          ? "Receiving…"
                          : "📦 Mark as Received & Update Inventory"}
                      </button>
                    )}
                    {status === "received" && (
                      <button
                        style={btn("primary")}
                        onClick={() => handleAdvance(po, "complete")}
                      >
                        ✓ Mark Complete
                      </button>
                    )}
                    <button
                      style={btn("ghost")}
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
