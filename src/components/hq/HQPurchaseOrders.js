// HQPurchaseOrders.js v1.2 — WP-B: Purchase Order Flow (Import-Aware)
// Protea Botanicals · Phase 2 · March 2026
//
// v1.2 — "Add Shipping to PO" feature:
//   - "✈️ + Add Shipping" button appears on all POs (actions column + detail modal)
//   - Displays "✓ Shipping: $XX.XX — Edit" when shipping already confirmed
//   - User enters total weight (kg) → auto-calculates DDP freight, $25 clearance, per-unit landed cost
//   - Preview table: each line item shows old EXW cost → new landed cost before confirm
//   - Pro-rata allocation by EXW line value (not qty) — filling gun gets ~69% of shipping
//   - Confirm writes three tables in sequence:
//       purchase_orders       → shipping_cost_usd, clearance_fee_usd, landed_cost_zar, total_weight_kg
//       purchase_order_items  → landed_cost_per_unit_zar per item
//       inventory_items       → cost_price per linked item_id
//   - Uses locked usd_zar_rate from PO (not live FX) for cost consistency
//   - shipping_cost_usd = freight only; clearance_fee_usd = $25 stored separately
//
// v1.1 fixes (preserved):
//   - handleReceive: auto-create inventory_items when no match found
//   - handleReceive: write stock_movements for every received item
//   - handleReceive: stamp item_id back onto purchase_order_items after create/find
//   - handleCreate: remove line_total from insert (GENERATED column — never insert)
//
// v1.0 — New file — WP-B: Purchase Order Flow

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

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

// ─── Shipping Calculation — used by Create PO form ────────────────────────────
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

// ─── DDP Freight Only — for Add Shipping feature ─────────────────────────────
// Returns freight-only (no clearance). Clearance ($25) stored separately in DB.
function calcDdpFreightUsd(weightKg) {
  const tier =
    DDP_TIERS.find((t) => weightKg <= t.maxKg) ||
    DDP_TIERS[DDP_TIERS.length - 1];
  return {
    freightUsd: parseFloat((weightKg * tier.rateUsd).toFixed(2)),
    tier,
  };
}

// ─── Compute Shipping Preview ─────────────────────────────────────────────────
// Pure function — no side effects.
// Pro-rates total shipping across PO lines by EXW line value (not by qty).
// Formula (Section 7):
//   shipping_per_unit = (line_exw / total_exw) × total_shipping_usd / qty
//   landed_cost_usd   = unit_exw_usd + shipping_per_unit
//   cost_price_zar    = ROUND(landed_cost_usd × locked_fx, 2)
function computeShippingPreview(po, items, weightKg, mode) {
  if (!po || !items || items.length === 0) return null;
  if (!weightKg || isNaN(weightKg) || weightKg <= 0) return null;

  let freightUsd, clearanceUsd, tier;

  if (mode === "ddp_air") {
    const result = calcDdpFreightUsd(weightKg);
    freightUsd = result.freightUsd;
    clearanceUsd = 25;
    tier = result.tier;
  } else {
    // For non-DDP modes, treat full calcShippingUsd result as freight (no clearance split)
    freightUsd = parseFloat(calcShippingUsd(mode, weightKg).toFixed(2));
    clearanceUsd = 0;
    tier = null;
  }

  const totalShippingUsd = freightUsd + clearanceUsd;
  const lockedFx = parseFloat(po.usd_zar_rate) || 18.5;
  const subtotalUsd = parseFloat(po.subtotal) || 0;
  const newLandedCostZar = parseFloat(
    ((subtotalUsd + totalShippingUsd) * lockedFx).toFixed(2),
  );

  const lineItems = items.map((item) => {
    const qty = parseFloat(item.quantity_ordered) || 1;
    const unitExwUsd = parseFloat(item.unit_price_usd) || 0;
    const lineExwUsd = unitExwUsd * qty;

    // Pro-rata by EXW line value; fallback to equal split if subtotal is 0
    const proRata =
      subtotalUsd > 0 ? lineExwUsd / subtotalUsd : 1 / items.length;
    const itemShipUsd = proRata * totalShippingUsd;
    const shipPerUnit = itemShipUsd / qty;

    const newLandedUsd = unitExwUsd + shipPerUnit;
    const newCostPriceZar = Math.round(newLandedUsd * lockedFx * 100) / 100;

    const productName =
      item.supplier_products?.name ||
      item.notes?.replace(/ \(.*\)$/, "") ||
      "Unknown";

    return {
      id: item.id,
      item_id: item.item_id,
      name: productName,
      qty,
      unitExwUsd,
      lineExwUsd,
      proRataPct: parseFloat((proRata * 100).toFixed(1)),
      shipPerUnit,
      newLandedUsd,
      newCostPriceZar,
      newLandedCostPerUnitZar: newCostPriceZar,
      oldLandedCostZar: parseFloat(item.landed_cost_per_unit_zar) || 0,
    };
  });

  return {
    breakdown: {
      freightUsd,
      clearanceUsd,
      totalShippingUsd,
      tier,
      newLandedCostZar,
      subtotalUsd,
    },
    lineItems,
    lockedFx,
  };
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

  // ── Add Shipping state ──────────────────────────────────────────────────────
  const [addShipPo, setAddShipPo] = useState(null);
  const [addShipItems, setAddShipItems] = useState([]);
  const [addShipWeight, setAddShipWeight] = useState("");
  const [addShipMode, setAddShipMode] = useState("ddp_air");
  const [addShipLoading, setAddShipLoading] = useState(false);
  const [addShipConfirming, setAddShipConfirming] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────
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

  // ── Derived Totals (Create PO) ───────────────────────────────────────────
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

            if (moveErr) {
              console.error(
                `[HQPurchaseOrders] Stock movement error for "${productName}":`,
                moveErr,
              );
            } else {
              movementsWritten++;
            }

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

  // ── Open Add Shipping Modal ───────────────────────────────────────────────
  const openAddShipping = async (po, e) => {
    if (e) e.stopPropagation();
    setAddShipPo(po);
    setAddShipMode(po.shipping_mode || "ddp_air");
    // Pre-fill weight from PO if already stored
    setAddShipWeight(po.total_weight_kg ? String(po.total_weight_kg) : "");
    setAddShipLoading(true);
    setAddShipItems([]);

    const { data: items, error } = await supabase
      .from("purchase_order_items")
      .select(
        "id, item_id, quantity_ordered, unit_price_usd, landed_cost_per_unit_zar, notes, supplier_products(name, sku, category)",
      )
      .eq("po_id", po.id);

    if (error) {
      console.error(
        "[HQPurchaseOrders] Add shipping — fetch items error:",
        error,
      );
    }

    setAddShipItems(items || []);
    setAddShipLoading(false);
  };

  // ── Confirm Shipping Update ────────────────────────────────────────────────
  // Writes to purchase_orders, purchase_order_items, inventory_items in sequence.
  const handleConfirmShipping = async () => {
    if (!addShipPo || !addShipPreview) return;
    setAddShipConfirming(true);

    const { freightUsd, clearanceUsd, totalShippingUsd, newLandedCostZar } =
      addShipPreview.breakdown;

    // 1. Update purchase_orders
    const { error: poErr } = await supabase
      .from("purchase_orders")
      .update({
        shipping_cost_usd: parseFloat(freightUsd.toFixed(2)),
        clearance_fee_usd: parseFloat(clearanceUsd.toFixed(2)),
        landed_cost_zar: newLandedCostZar,
        total_weight_kg: parseFloat(parseFloat(addShipWeight).toFixed(3)),
      })
      .eq("id", addShipPo.id);

    if (poErr) {
      console.error(
        "[HQPurchaseOrders] Shipping confirm — PO update error:",
        poErr,
      );
      setAddShipConfirming(false);
      return;
    }

    let linesUpdated = 0;
    let inventoryUpdated = 0;
    const invErrors = [];

    for (const item of addShipPreview.lineItems) {
      // 2. Update purchase_order_items.landed_cost_per_unit_zar
      const { error: lineErr } = await supabase
        .from("purchase_order_items")
        .update({ landed_cost_per_unit_zar: item.newLandedCostPerUnitZar })
        .eq("id", item.id);

      if (lineErr) {
        console.error(
          `[HQPurchaseOrders] Line update error for item ${item.id}:`,
          lineErr,
        );
      } else {
        linesUpdated++;
      }

      // 3. Update inventory_items.cost_price where item_id is linked
      if (item.item_id) {
        const { error: invErr } = await supabase
          .from("inventory_items")
          .update({ cost_price: item.newCostPriceZar })
          .eq("id", item.item_id);

        if (invErr) {
          console.error(
            `[HQPurchaseOrders] Inventory cost update error for item_id ${item.item_id}:`,
            invErr,
          );
          invErrors.push(item.name);
        } else {
          inventoryUpdated++;
        }
      }
    }

    setAddShipConfirming(false);
    setAddShipPo(null);
    setAddShipItems([]);
    setAddShipWeight("");

    const summary = [
      `${linesUpdated} PO lines updated`,
      inventoryUpdated > 0
        ? `${inventoryUpdated} inventory costs updated`
        : null,
      invErrors.length > 0
        ? `⚠ ${invErrors.length} inventory updates failed`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    showToast(`✅ Shipping confirmed — ${summary}`);
    fetchPOs();
  };

  // ── Add Shipping Preview (derived — pure calc from state) ─────────────────
  const addShipPreview = computeShippingPreview(
    addShipPo,
    addShipItems,
    parseFloat(addShipWeight),
    addShipMode,
  );

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
    ...(variant === "ship"
      ? {
          background: "#5C6BC0",
          color: "#fff",
          padding: "8px 14px",
          fontSize: 12,
        }
      : {}),
    ...(variant === "ship-set"
      ? {
          background: "#f0f4ff",
          color: "#3949AB",
          border: "1px solid #9fa8da",
          padding: "6px 12px",
          fontSize: 12,
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
                  const shippingSet =
                    po.shipping_cost_usd !== null &&
                    po.shipping_cost_usd !== undefined;

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
                        <div style={{ fontSize: 12 }}>
                          {shipMeta.icon} {shipMeta.label}
                        </div>
                        {shippingSet && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#3949AB",
                              marginTop: 2,
                            }}
                          >
                            ✓{" "}
                            {fmtUsd(
                              parseFloat(po.shipping_cost_usd) +
                                parseFloat(po.clearance_fee_usd || 0),
                            )}
                          </div>
                        )}
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
                          {/* Add Shipping button — shown on all POs */}
                          <button
                            style={shippingSet ? btn("ship-set") : btn("ship")}
                            onClick={(e) => openAddShipping(po, e)}
                          >
                            {shippingSet
                              ? `✓ ${fmtUsd(parseFloat(po.shipping_cost_usd) + parseFloat(po.clearance_fee_usd || 0))} — Edit`
                              : "✈️ + Shipping"}
                          </button>
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
                    Choose the supplier for this purchase order.
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
                      Shipping Mode
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
              maxWidth: 720,
              maxHeight: "88vh",
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
              const shippingSet =
                po.shipping_cost_usd !== null &&
                po.shipping_cost_usd !== undefined;

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
                      ["Subtotal (EXW USD)", fmtUsd(po.subtotal)],
                      [
                        "Freight (USD)",
                        shippingSet ? fmtUsd(po.shipping_cost_usd) : "Not set",
                      ],
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

                  {/* Shipping breakdown (when set) */}
                  {shippingSet && (
                    <div
                      style={{
                        background: "#f3f0ff",
                        border: "1px solid #d1c4e9",
                        borderRadius: 10,
                        padding: "14px 18px",
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#5C6BC0",
                          marginBottom: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}
                      >
                        ✈️ Shipping Breakdown
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 24,
                          flexWrap: "wrap",
                          fontSize: 13,
                        }}
                      >
                        {[
                          ["Freight", fmtUsd(po.shipping_cost_usd)],
                          ["Clearance", fmtUsd(po.clearance_fee_usd)],
                          [
                            "Total Ship",
                            fmtUsd(
                              parseFloat(po.shipping_cost_usd) +
                                parseFloat(po.clearance_fee_usd || 0),
                            ),
                          ],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#7986CB",
                                marginBottom: 2,
                              }}
                            >
                              {label}
                            </div>
                            <div style={{ fontWeight: 700, color: "#3949AB" }}>
                              {val}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                    {/* Add / Edit Shipping */}
                    <button
                      style={shippingSet ? btn("ship-set") : btn("ship")}
                      onClick={() => {
                        setSelectedPo(null);
                        openAddShipping(po);
                      }}
                    >
                      {shippingSet
                        ? `✈️ Edit Shipping (${fmtUsd(parseFloat(po.shipping_cost_usd) + parseFloat(po.clearance_fee_usd || 0))})`
                        : "✈️ + Add Shipping"}
                    </button>
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

      {/* ══════════════════════════════════════════════════════════════════
          ADD SHIPPING MODAL  (v1.2 new)
      ══════════════════════════════════════════════════════════════════ */}
      {addShipPo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => {
            if (!addShipConfirming) {
              setAddShipPo(null);
              setAddShipItems([]);
              setAddShipWeight("");
            }
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 760,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 8px 48px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "24px 28px",
                borderBottom: "1px solid #e8e0f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
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
                    color: "#3949AB",
                  }}
                >
                  ✈️ {addShipPo.shipping_cost_usd != null ? "Edit" : "Add"}{" "}
                  Shipping — {addShipPo.po_number}
                </h3>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                  {addShipPo.suppliers?.name} · EXW subtotal:{" "}
                  {fmtUsd(addShipPo.subtotal)} · FX locked: R
                  {parseFloat(addShipPo.usd_zar_rate || 18.5).toFixed(4)}/USD
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
                  if (!addShipConfirming) {
                    setAddShipPo(null);
                    setAddShipItems([]);
                    setAddShipWeight("");
                  }
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 28 }}>
              {addShipLoading ? (
                <div
                  style={{ textAlign: "center", padding: 48, color: "#999" }}
                >
                  Loading line items…
                </div>
              ) : (
                <>
                  {/* Shipping mode + weight input */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                      marginBottom: 24,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#555",
                          display: "block",
                          marginBottom: 10,
                        }}
                      >
                        Shipping Mode
                      </label>
                      {SHIPPING_MODES.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setAddShipMode(m.id)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            marginBottom: 6,
                            cursor: "pointer",
                            border: `2px solid ${addShipMode === m.id ? "#3949AB" : "#f0ede8"}`,
                            background:
                              addShipMode === m.id ? "#f3f0ff" : "#fafafa",
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{m.icon}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {m.label}
                            </div>
                            <div style={{ fontSize: 11, color: "#888" }}>
                              {m.note}
                            </div>
                          </div>
                          {addShipMode === m.id && (
                            <span
                              style={{
                                marginLeft: "auto",
                                color: "#3949AB",
                                fontWeight: 700,
                                fontSize: 13,
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <label
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#555",
                            display: "block",
                            marginBottom: 8,
                          }}
                        >
                          Total Shipment Weight (kg)
                        </label>
                        <input
                          type="number"
                          value={addShipWeight}
                          min="0.001"
                          step="0.001"
                          placeholder="e.g. 4.500"
                          onChange={(e) => setAddShipWeight(e.target.value)}
                          style={{
                            ...input,
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#3949AB",
                            border: "2px solid #9fa8da",
                          }}
                        />
                        <div
                          style={{ fontSize: 12, color: "#999", marginTop: 6 }}
                        >
                          Enter total weight from freight agent notification
                        </div>
                      </div>

                      {/* DDP rate card (when ddp_air selected) */}
                      {addShipMode === "ddp_air" && (
                        <div
                          style={{
                            background: "#f8f9ff",
                            border: "1px solid #e8eaf6",
                            borderRadius: 8,
                            padding: "12px 16px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#7986CB",
                              marginBottom: 8,
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                            }}
                          >
                            DDP Rate Card (China → SA)
                          </div>
                          {DDP_TIERS.map((t, i) => {
                            const wt = parseFloat(addShipWeight) || 0;
                            const active =
                              wt > 0 &&
                              wt <= t.maxKg &&
                              (i === 0 || wt > DDP_TIERS[i - 1].maxKg);
                            return (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: 12,
                                  padding: "3px 0",
                                  color: active ? "#3949AB" : "#aaa",
                                  fontWeight: active ? 700 : 400,
                                }}
                              >
                                <span>
                                  {i === 0 ? "≤" : `${DDP_TIERS[i - 1].maxKg}–`}
                                  {t.maxKg === Infinity ? "100+" : t.maxKg}kg
                                </span>
                                <span>${t.rateUsd}/kg + $25</span>
                                {active && (
                                  <span style={{ color: "#3949AB" }}>
                                    ← active
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview — auto-updates as weight changes */}
                  {addShipPreview ? (
                    <>
                      {/* Cost breakdown summary */}
                      <div
                        style={{
                          background: "#f3f0ff",
                          border: "1px solid #d1c4e9",
                          borderRadius: 10,
                          padding: "16px 20px",
                          marginBottom: 20,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#5C6BC0",
                            marginBottom: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}
                        >
                          Shipping Cost Breakdown
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(5, 1fr)",
                            gap: 12,
                          }}
                        >
                          {[
                            [
                              "Freight (USD)",
                              fmtUsd(addShipPreview.breakdown.freightUsd),
                            ],
                            [
                              "Clearance (USD)",
                              fmtUsd(addShipPreview.breakdown.clearanceUsd),
                            ],
                            [
                              "Total Ship (USD)",
                              fmtUsd(addShipPreview.breakdown.totalShippingUsd),
                            ],
                            [
                              "EXW Subtotal (USD)",
                              fmtUsd(addShipPreview.breakdown.subtotalUsd),
                            ],
                            [
                              "New Landed (ZAR)",
                              fmtZar(addShipPreview.breakdown.newLandedCostZar),
                            ],
                          ].map(([label, val]) => (
                            <div
                              key={label}
                              style={{
                                background: "#fff",
                                borderRadius: 8,
                                padding: "10px 12px",
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#7986CB",
                                  marginBottom: 4,
                                  textTransform: "uppercase",
                                }}
                              >
                                {label}
                              </div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#3949AB",
                                  fontSize: 14,
                                }}
                              >
                                {val}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Per-item landed cost preview table */}
                      <div style={{ marginBottom: 24 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#555",
                            marginBottom: 10,
                          }}
                        >
                          Per-Item Landed Cost Preview
                          <span
                            style={{
                              fontSize: 11,
                              color: "#999",
                              fontWeight: 400,
                              marginLeft: 8,
                            }}
                          >
                            Pro-rated by EXW line value — shipping allocated
                            proportionally
                          </span>
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: 13,
                            }}
                          >
                            <thead>
                              <tr>
                                {[
                                  "Item",
                                  "Qty",
                                  "EXW/unit",
                                  "EXW share",
                                  "Ship/unit",
                                  "New landed (USD)",
                                  "New cost (ZAR)",
                                  "Old cost (ZAR)",
                                  "Change",
                                ].map((h) => (
                                  <th key={h} style={{ ...th, fontSize: 11 }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {addShipPreview.lineItems.map((item, idx) => {
                                const change =
                                  item.newCostPriceZar - item.oldLandedCostZar;
                                const changeColor =
                                  change > 0
                                    ? "#c62828"
                                    : change < 0
                                      ? "#2E7D32"
                                      : "#999";
                                return (
                                  <tr
                                    key={idx}
                                    style={{
                                      background:
                                        idx % 2 === 0 ? "#fafafa" : "#fff",
                                    }}
                                  >
                                    <td
                                      style={{
                                        ...td,
                                        fontWeight: 600,
                                        color: "#2d4a2d",
                                      }}
                                    >
                                      {item.name}
                                      {!item.item_id && (
                                        <div
                                          style={{
                                            fontSize: 10,
                                            color: "#e65100",
                                            marginTop: 2,
                                          }}
                                        >
                                          ⚠ No inventory link
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ ...td, textAlign: "center" }}>
                                      {item.qty}
                                    </td>
                                    <td style={td}>
                                      {fmtUsd(item.unitExwUsd)}
                                    </td>
                                    <td style={{ ...td, color: "#7986CB" }}>
                                      {item.proRataPct}%
                                    </td>
                                    <td
                                      style={{
                                        ...td,
                                        color: "#5C6BC0",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {fmtUsd(item.shipPerUnit)}
                                    </td>
                                    <td style={{ ...td, fontWeight: 600 }}>
                                      {fmtUsd(item.newLandedUsd)}
                                    </td>
                                    <td
                                      style={{
                                        ...td,
                                        fontWeight: 700,
                                        color: "#3949AB",
                                      }}
                                    >
                                      {fmtZar(item.newCostPriceZar)}
                                    </td>
                                    <td style={{ ...td, color: "#999" }}>
                                      {item.oldLandedCostZar > 0
                                        ? fmtZar(item.oldLandedCostZar)
                                        : "—"}
                                    </td>
                                    <td
                                      style={{
                                        ...td,
                                        color: changeColor,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {item.oldLandedCostZar > 0
                                        ? `${change >= 0 ? "+" : ""}${fmtZar(change)}`
                                        : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Items without inventory_link warning */}
                      {addShipPreview.lineItems.some((i) => !i.item_id) && (
                        <div
                          style={{
                            background: "#fff3e0",
                            border: "1px solid #ffcc80",
                            borderRadius: 8,
                            padding: "12px 16px",
                            marginBottom: 20,
                            fontSize: 13,
                            color: "#E65100",
                          }}
                        >
                          ⚠️ <strong>Note:</strong> Items marked "No inventory
                          link" will have their PO line costs updated, but
                          inventory <code>cost_price</code> cannot be updated
                          without a linked <code>item_id</code>. Receive the PO
                          first to link inventory, then run Add Shipping again
                          to update costs.
                        </div>
                      )}

                      {/* Confirm button */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 12,
                          paddingTop: 8,
                          borderTop: "1px solid #e8e0f0",
                        }}
                      >
                        <button
                          style={btn("ghost")}
                          disabled={addShipConfirming}
                          onClick={() => {
                            setAddShipPo(null);
                            setAddShipItems([]);
                            setAddShipWeight("");
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          style={{
                            ...btn("ship"),
                            fontSize: 14,
                            padding: "12px 28px",
                          }}
                          disabled={addShipConfirming}
                          onClick={handleConfirmShipping}
                        >
                          {addShipConfirming
                            ? "Updating…"
                            : `✓ Confirm & Update Costs — ${fmtZar(addShipPreview.breakdown.newLandedCostZar)}`}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Prompt to enter weight */
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px 0",
                        color: "#bbb",
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 12 }}>⚖️</div>
                      <div style={{ fontSize: 14 }}>
                        Enter the total shipment weight above to preview landed
                        cost calculations.
                      </div>
                      {addShipItems.length > 0 && (
                        <div
                          style={{ marginTop: 12, fontSize: 13, color: "#999" }}
                        >
                          {addShipItems.length} line item
                          {addShipItems.length !== 1 ? "s" : ""} loaded
                          {addShipItems.filter((i) => i.item_id).length > 0
                            ? ` · ${addShipItems.filter((i) => i.item_id).length} linked to inventory`
                            : " · ⚠ no inventory links — receive PO first"}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
