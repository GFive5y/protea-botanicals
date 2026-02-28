// src/components/hq/Distribution.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTION TAB — Phase 2D
//
// Purpose: Outbound shipment tracking — the DISTRIBUTE step of the supply chain:
//   Procure → Receive → Produce → ★ DISTRIBUTE ★ → Customer Scans
//
// Features:
//   - View all shipments (filterable by status)
//   - Create shipment (select destination shop, add items)
//   - Link items to inventory and/or production batches
//   - Status progression: preparing → shipped → in_transit → delivered → confirmed
//   - Courier & tracking number
//   - Cost tracking per shipment
//   - Future: shop-side receipt confirmation, auto-deduct HQ inventory
//
// Tables used:
//   - shipments (CRUD)
//   - shipment_items (CRUD, linked to shipments)
//   - tenants (read, for destination shop selection)
//   - inventory_items (read, for item selection)
//   - production_batches (read, for batch linking)
//
// Design: Cream aesthetic (Section 7 of handover).
// RLS: Uses is_hq_user() — HQ can do everything.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ── Design Tokens ─────────────────────────────────────────────────────────
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
  blue: "#2c4a6e",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ── Shared styles ─────────────────────────────────────────────────────────
const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accentGreen,
  marginBottom: "4px",
  fontFamily: F.body,
};
const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};
const sBtn = (variant = "primary") => ({
  padding: "8px 16px",
  background: variant === "primary" ? C.primaryDark : "transparent",
  color: variant === "primary" ? C.white : C.primaryMid,
  border: variant === "primary" ? "none" : `1px solid ${C.primaryMid}`,
  borderRadius: "2px",
  fontSize: "10px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: F.body,
  transition: "all 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  fontSize: "13px",
  fontFamily: F.body,
  background: C.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  preparing: { label: "Preparing", color: C.blue, bg: "rgba(44,74,110,0.1)" },
  shipped: { label: "Shipped", color: C.gold, bg: "rgba(181,147,90,0.1)" },
  in_transit: {
    label: "In Transit",
    color: C.gold,
    bg: "rgba(181,147,90,0.1)",
  },
  delivered: {
    label: "Delivered",
    color: C.accentGreen,
    bg: "rgba(82,183,136,0.1)",
  },
  confirmed: {
    label: "Confirmed",
    color: C.primaryDark,
    bg: "rgba(27,67,50,0.1)",
  },
  cancelled: { label: "Cancelled", color: C.red, bg: "rgba(192,57,43,0.1)" },
};

// ── Next valid status transitions ─────────────────────────────────────────
const NEXT_STATUSES = {
  preparing: ["shipped", "cancelled"],
  shipped: ["in_transit", "delivered", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: ["confirmed"],
  confirmed: [],
  cancelled: [],
};

// ── HQ tenant ID ──────────────────────────────────────────────────────────
const HQ_TENANT_ID = "43b34c33-6864-4f02-98dd-df1d340475c3";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Distribution() {
  const [shipments, setShipments] = useState([]);
  const [shops, setShops] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [productionBatches, setProductionBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedShipment, setExpandedShipment] = useState(null);

  // ── Fetch all data ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shipmentsRes, shopsRes, itemsRes, batchesRes] = await Promise.all([
        supabase
          .from("shipments")
          .select("*, shipment_items(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("tenants")
          .select("id, name, slug, type, is_active")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("inventory_items")
          .select("id, name, sku, category, unit, quantity_on_hand, cost_price")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("production_batches")
          .select(
            "id, batch_code, strain_name, product_type, size_ml, status, actual_quantity",
          )
          .in("status", ["completed", "in_progress"])
          .order("created_at", { ascending: false }),
      ]);
      if (shipmentsRes.error) throw shipmentsRes.error;
      if (shopsRes.error) throw shopsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (batchesRes.error) throw batchesRes.error;

      setShipments(shipmentsRes.data || []);
      setShops(shopsRes.data || []);
      setInventoryItems(itemsRes.data || []);
      setProductionBatches(batchesRes.data || []);
    } catch (err) {
      console.error("[Distribution] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filter shipments ───────────────────────────────────────────────
  const filteredShipments =
    statusFilter === "all"
      ? shipments
      : shipments.filter((s) => s.status === statusFilter);

  // ── Summary stats ──────────────────────────────────────────────────
  const preparing = shipments.filter((s) => s.status === "preparing").length;
  const inTransit = shipments.filter((s) =>
    ["shipped", "in_transit"].includes(s.status),
  ).length;
  const delivered = shipments.filter((s) =>
    ["delivered", "confirmed"].includes(s.status),
  ).length;
  const totalItems = shipments.reduce(
    (sum, s) =>
      sum +
      (s.shipment_items || []).reduce(
        (iSum, item) => iSum + (item.quantity || 0),
        0,
      ),
    0,
  );

  if (error) {
    return (
      <div
        style={{ ...sCard, borderLeft: `3px solid ${C.red}`, margin: "20px 0" }}
      >
        <div style={sLabel}>Error Loading Distribution Data</div>
        <p style={{ fontSize: "13px", color: C.red, margin: "8px 0 0" }}>
          {error}
        </p>
        <button onClick={fetchData} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <h2
            style={{
              fontFamily: F.heading,
              fontSize: "22px",
              fontWeight: 300,
              color: C.primaryDark,
              margin: 0,
            }}
          >
            Distribution & Shipments
          </h2>
          <span
            style={{
              background: "rgba(82,183,136,0.15)",
              color: C.accentGreen,
              padding: "2px 8px",
              borderRadius: "2px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Phase 2D
          </span>
        </div>
        <p
          style={{
            color: C.muted,
            fontSize: "13px",
            fontWeight: 300,
            margin: 0,
          }}
        >
          Track outbound shipments to shops — items, quantities, courier, and
          delivery status.
        </p>
      </div>

      {/* ── Supply Chain Flow ─────────────────────────────────────── */}
      <div
        style={{
          background: C.warmBg,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          padding: "12px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontSize: "11px",
          color: C.muted,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          flexWrap: "wrap",
        }}
      >
        <FlowStep label="Procure" done />
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <FlowStep label="Receive & Store" done />
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <FlowStep label="Produce" done />
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <FlowStep label="★ Distribute" active />
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <FlowStep label="Customer Scans" done />
      </div>

      {/* ── Summary Stats ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <MiniStat label="Preparing" value={preparing} color={C.blue} />
        <MiniStat label="In Transit" value={inTransit} color={C.gold} />
        <MiniStat label="Delivered" value={delivered} color={C.accentGreen} />
        <MiniStat
          label="Total Items Shipped"
          value={totalItems.toLocaleString()}
          color={C.primaryDark}
        />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            "all",
            "preparing",
            "shipped",
            "in_transit",
            "delivered",
            "confirmed",
            "cancelled",
          ].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px",
                background: statusFilter === s ? C.primaryDark : C.white,
                color: statusFilter === s ? C.white : C.muted,
                border: `1px solid ${statusFilter === s ? C.primaryDark : C.border}`,
                borderRadius: "2px",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: F.body,
                fontWeight: statusFilter === s ? 600 : 400,
              }}
            >
              {s === "all"
                ? `All (${shipments.length})`
                : `${STATUS_CONFIG[s]?.label || s} (${shipments.filter((sh) => sh.status === s).length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={sBtn()}
        >
          {showCreateForm ? "Cancel" : "+ New Shipment"}
        </button>
      </div>

      {/* ── Create Form ───────────────────────────────────────────── */}
      {showCreateForm && (
        <CreateShipmentForm
          shops={shops}
          inventoryItems={inventoryItems}
          productionBatches={productionBatches}
          existingCount={shipments.length}
          onCreated={() => {
            setShowCreateForm(false);
            fetchData();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* ── Shipment List ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>🚚</div>
          Loading distribution data...
        </div>
      ) : filteredShipments.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            color: C.muted,
            padding: "60px 40px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            🚚
          </div>
          <p style={{ fontSize: "13px", margin: 0 }}>
            {shipments.length === 0
              ? "No shipments yet. Create your first shipment to start tracking distribution."
              : "No shipments match the selected filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {filteredShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              expanded={expandedShipment === shipment.id}
              onToggle={() =>
                setExpandedShipment(
                  expandedShipment === shipment.id ? null : shipment.id,
                )
              }
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE SHIPMENT FORM
// ═══════════════════════════════════════════════════════════════════════════
function CreateShipmentForm({
  shops,
  inventoryItems,
  productionBatches,
  existingCount,
  onCreated,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    destination_tenant_id: "",
    destination_name: "",
    courier: "",
    tracking_number: "",
    estimated_arrival: "",
    notes: "",
  });
  const [items, setItems] = useState([
    {
      inventory_item_id: "",
      production_batch_id: "",
      item_name: "",
      sku: "",
      quantity: "",
      unit: "pcs",
      unit_cost: "",
    },
  ]);

  // Available shops (exclude HQ)
  const shopTenants = shops.filter((s) => s.type === "shop");

  const set = (key, val) => {
    setForm((p) => {
      const updated = { ...p, [key]: val };
      // Auto-fill destination name from selected shop
      if (key === "destination_tenant_id" && val) {
        const shop = shops.find((s) => s.id === val);
        if (shop) updated.destination_name = shop.name;
      }
      return updated;
    });
  };

  const setItem = (idx, key, val) => {
    setItems((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [key]: val };

      // Auto-fill from inventory item
      if (key === "inventory_item_id" && val) {
        const item = inventoryItems.find((i) => i.id === val);
        if (item) {
          arr[idx].item_name = item.name;
          arr[idx].sku = item.sku;
          arr[idx].unit = item.unit || "pcs";
          arr[idx].unit_cost = item.cost_price || "";
        }
      }
      // Auto-fill from production batch
      if (key === "production_batch_id" && val) {
        const batch = productionBatches.find((b) => b.id === val);
        if (batch) {
          arr[idx].item_name =
            `${batch.strain_name} ${batch.size_ml}ml ${batch.product_type}`;
          arr[idx].sku = batch.batch_code;
          arr[idx].unit = "pcs";
        }
      }
      return arr;
    });
  };

  const addItem = () =>
    setItems((p) => [
      ...p,
      {
        inventory_item_id: "",
        production_batch_id: "",
        item_name: "",
        sku: "",
        quantity: "",
        unit: "pcs",
        unit_cost: "",
      },
    ]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  // ── Generate shipment number ───────────────────────────────────────
  const generateShipmentNumber = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const seq = String(existingCount + 1).padStart(3, "0");
    return `SH-${y}${m}-${seq}`;
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.destination_name.trim()) {
      alert("Destination is required. Select a shop or enter a name.");
      return;
    }
    const validItems = items.filter((i) => i.item_name.trim() && i.quantity);
    if (validItems.length === 0) {
      alert("Add at least one item to the shipment.");
      return;
    }

    setSaving(true);
    try {
      const shipmentId = crypto.randomUUID();
      const shipmentNumber = generateShipmentNumber();
      console.log(
        "[Distribution] Creating shipment:",
        shipmentNumber,
        "id:",
        shipmentId,
      );

      let userId = null;
      try {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch (e) {
        console.warn("[Distribution] getUser failed:", e.message);
      }

      const { error: shipErr } = await supabase.from("shipments").insert({
        id: shipmentId,
        tenant_id: HQ_TENANT_ID,
        shipment_number: shipmentNumber,
        destination_tenant_id: form.destination_tenant_id || null,
        destination_name: form.destination_name.trim(),
        status: "preparing",
        courier: form.courier.trim() || null,
        tracking_number: form.tracking_number.trim() || null,
        estimated_arrival: form.estimated_arrival || null,
        notes: form.notes.trim() || null,
        created_by: userId,
      });
      if (shipErr) {
        console.error("[Distribution] Shipment insert error:", shipErr);
        throw shipErr;
      }
      console.log("[Distribution] Shipment created:", shipmentId);

      // Insert items
      const itemRows = validItems.map((i) => ({
        shipment_id: shipmentId,
        inventory_item_id: i.inventory_item_id || null,
        production_batch_id: i.production_batch_id || null,
        item_name: i.item_name.trim(),
        sku: i.sku || null,
        quantity: parseInt(i.quantity),
        unit: i.unit,
        unit_cost: i.unit_cost ? parseFloat(i.unit_cost) : null,
        total_cost:
          i.unit_cost && i.quantity
            ? parseFloat(i.unit_cost) * parseInt(i.quantity)
            : null,
      }));
      console.log("[Distribution] Inserting", itemRows.length, "items");
      const { error: itemErr } = await supabase
        .from("shipment_items")
        .insert(itemRows);
      if (itemErr) {
        console.error("[Distribution] Item insert error:", itemErr);
        throw itemErr;
      }
      console.log("[Distribution] Items created successfully");

      onCreated();
    } catch (err) {
      console.error("[Distribution] Create error:", err);
      alert("Error creating shipment: " + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const totalCost = items.reduce((sum, i) => {
    const qty = parseInt(i.quantity) || 0;
    const cost = parseFloat(i.unit_cost) || 0;
    return sum + qty * cost;
  }, 0);

  return (
    <div
      style={{
        ...sCard,
        marginBottom: "20px",
        borderLeft: `3px solid ${C.accentGreen}`,
      }}
    >
      <div style={{ ...sLabel, marginBottom: "16px" }}>New Shipment</div>

      {/* Destination */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Destination Shop
          </label>
          {shopTenants.length > 0 ? (
            <select
              style={sSelect}
              value={form.destination_tenant_id}
              onChange={(e) => set("destination_tenant_id", e.target.value)}
            >
              <option value="">— Select shop or enter manually —</option>
              {shopTenants.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: "11px", color: C.muted, padding: "8px 0" }}>
              No shop tenants yet — enter destination manually below
            </div>
          )}
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Destination Name *
          </label>
          <input
            style={sInput}
            value={form.destination_name}
            onChange={(e) => set("destination_name", e.target.value)}
            placeholder="e.g. Green Leaf Dispensary"
          />
        </div>
      </div>

      {/* Courier & tracking */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Courier
          </label>
          <input
            style={sInput}
            value={form.courier}
            onChange={(e) => set("courier", e.target.value)}
            placeholder="e.g. The Courier Guy, DPD"
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Tracking Number
          </label>
          <input
            style={sInput}
            value={form.tracking_number}
            onChange={(e) => set("tracking_number", e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Estimated Arrival
          </label>
          <input
            style={sInput}
            type="date"
            value={form.estimated_arrival}
            onChange={(e) => set("estimated_arrival", e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            fontSize: "11px",
            color: C.muted,
            display: "block",
            marginBottom: "4px",
          }}
        >
          Notes
        </label>
        <input
          style={sInput}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional shipment notes"
        />
      </div>

      {/* Shipment items */}
      <div style={{ ...sLabel, marginBottom: "8px" }}>Shipment Items</div>

      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr 0.8fr auto",
            gap: "8px",
            marginBottom: "8px",
            alignItems: "end",
          }}
        >
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                From Inventory (optional)
              </label>
            )}
            <select
              style={sSelect}
              value={item.inventory_item_id}
              onChange={(e) =>
                setItem(idx, "inventory_item_id", e.target.value)
              }
            >
              <option value="">— Manual entry —</option>
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.quantity_on_hand} {i.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Item Name
              </label>
            )}
            <input
              style={sInput}
              value={item.item_name}
              onChange={(e) => setItem(idx, "item_name", e.target.value)}
              placeholder="Name"
            />
          </div>
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Quantity
              </label>
            )}
            <input
              style={sInput}
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => setItem(idx, "quantity", e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Unit
              </label>
            )}
            <select
              style={sSelect}
              value={item.unit}
              onChange={(e) => setItem(idx, "unit", e.target.value)}
            >
              <option value="pcs">pcs</option>
              <option value="ml">ml</option>
              <option value="g">g</option>
              <option value="bottles">bottles</option>
              <option value="boxes">boxes</option>
            </select>
          </div>
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Cost (R)
              </label>
            )}
            <input
              style={sInput}
              type="number"
              step="0.01"
              value={item.unit_cost}
              onChange={(e) => setItem(idx, "unit_cost", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            {items.length > 1 && (
              <button
                onClick={() => removeItem(idx)}
                style={{
                  ...sBtn("outline"),
                  padding: "8px",
                  color: C.red,
                  borderColor: C.red,
                  fontSize: "11px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "8px",
        }}
      >
        <button
          onClick={addItem}
          style={{ ...sBtn("outline"), fontSize: "9px" }}
        >
          + Add Item
        </button>
        {totalCost > 0 && (
          <span
            style={{ fontSize: "12px", color: C.primaryDark, fontWeight: 600 }}
          >
            Shipment Value: R{totalCost.toFixed(2)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "20px",
          borderTop: `1px solid ${C.border}`,
          paddingTop: "16px",
        }}
      >
        <button onClick={onCancel} style={sBtn("outline")}>
          Cancel
        </button>
        <button onClick={handleCreate} disabled={saving} style={sBtn()}>
          {saving ? "Creating..." : "Create Shipment"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIPMENT CARD — Individual shipment with expand/collapse
// ═══════════════════════════════════════════════════════════════════════════
function ShipmentCard({ shipment, expanded, onToggle, onRefresh }) {
  const [updating, setUpdating] = useState(false);

  const statusCfg = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.preparing;
  const items = shipment.shipment_items || [];
  const totalItems = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);
  const nextStatuses = NEXT_STATUSES[shipment.status] || [];

  // ── Status change ──────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const updates = { status: newStatus };
      if (newStatus === "shipped")
        updates.shipped_date = new Date().toISOString().split("T")[0];
      if (newStatus === "delivered")
        updates.delivered_date = new Date().toISOString().split("T")[0];
      if (newStatus === "confirmed")
        updates.confirmed_date = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("shipments")
        .update(updates)
        .eq("id", shipment.id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error("[Distribution] Status update error:", err);
      alert("Error updating status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={sCard}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontFamily: F.heading,
                fontSize: "18px",
                fontWeight: 600,
                color: C.text,
              }}
            >
              {shipment.shipment_number}
            </span>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "2px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
                background: statusCfg.bg,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.color}35`,
              }}
            >
              {statusCfg.label}
            </span>
          </div>
          <div style={{ fontSize: "13px", color: C.muted }}>
            → {shipment.destination_name} · {totalItems} items
            {shipment.courier && <span> · {shipment.courier}</span>}
            {totalCost > 0 && (
              <span style={{ color: C.primaryDark, fontWeight: 600 }}>
                {" "}
                · R{totalCost.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: C.muted }}>
            {new Date(shipment.created_at).toLocaleDateString()}
          </span>
          <span
            style={{
              fontSize: "14px",
              color: C.muted,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {/* Items table */}
          {items.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ ...sLabel, marginBottom: "8px" }}>
                Shipment Items
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  fontFamily: F.body,
                }}
              >
                <thead>
                  <tr>
                    {["Item", "SKU", "Qty", "Unit Cost", "Total"].map(
                      (h, i) => (
                        <th
                          key={h}
                          style={{
                            textAlign: i >= 2 ? "right" : "left",
                            padding: "8px",
                            fontSize: "9px",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: C.muted,
                            borderBottom: `2px solid ${C.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          fontWeight: 500,
                        }}
                      >
                        {item.item_name}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          color: C.muted,
                          fontSize: "11px",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.sku || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {item.quantity} {item.unit}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "right",
                        }}
                      >
                        {item.unit_cost ? `R${item.unit_cost.toFixed(2)}` : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "right",
                        }}
                      >
                        {item.total_cost
                          ? `R${item.total_cost.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {totalCost > 0 && (
                  <tfoot>
                    <tr>
                      <td
                        colSpan="4"
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontWeight: 600,
                          fontSize: "11px",
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Total:
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: C.primaryDark,
                        }}
                      >
                        R{totalCost.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Shipment details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
              fontSize: "11px",
              color: C.muted,
              marginBottom: "16px",
            }}
          >
            <DetailItem label="Destination" value={shipment.destination_name} />
            <DetailItem label="Courier" value={shipment.courier} />
            <DetailItem label="Tracking" value={shipment.tracking_number} />
            <DetailItem
              label="Created"
              value={new Date(shipment.created_at).toLocaleString()}
            />
            {shipment.shipped_date && (
              <DetailItem label="Shipped" value={shipment.shipped_date} />
            )}
            {shipment.estimated_arrival && (
              <DetailItem label="ETA" value={shipment.estimated_arrival} />
            )}
            {shipment.delivered_date && (
              <DetailItem label="Delivered" value={shipment.delivered_date} />
            )}
            {shipment.confirmed_date && (
              <DetailItem label="Confirmed" value={shipment.confirmed_date} />
            )}
          </div>

          {shipment.notes && (
            <div
              style={{
                fontSize: "12px",
                color: C.muted,
                fontStyle: "italic",
                marginBottom: "16px",
                padding: "8px 12px",
                background: C.warmBg,
                borderRadius: "2px",
              }}
            >
              {shipment.notes}
            </div>
          )}

          {/* Status actions */}
          {nextStatuses.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                borderTop: `1px solid ${C.border}`,
                paddingTop: "12px",
              }}
            >
              {nextStatuses
                .filter((s) => s !== "cancelled")
                .map((ns) => {
                  const cfg = STATUS_CONFIG[ns];
                  return (
                    <button
                      key={ns}
                      onClick={() => handleStatusChange(ns)}
                      disabled={updating}
                      style={{ ...sBtn(), background: cfg.color }}
                    >
                      {updating ? "Updating..." : `→ ${cfg.label}`}
                    </button>
                  );
                })}
              {nextStatuses.includes("cancelled") && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel this shipment? This cannot be undone.",
                      )
                    ) {
                      handleStatusChange("cancelled");
                    }
                  }}
                  disabled={updating}
                  style={{
                    ...sBtn("outline"),
                    color: C.red,
                    borderColor: C.red,
                  }}
                >
                  Cancel Shipment
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper components ───────────────────────────────────────────────────
function FlowStep({ label, done, active }) {
  const C_ = {
    accentGreen: "#52b788",
    white: "#ffffff",
    warmBg: "#f4f0e8",
    muted: "#888888",
    border: "#e8e0d4",
  };
  if (active) {
    return (
      <span
        style={{
          background: C_.accentGreen,
          color: C_.white,
          padding: "4px 12px",
          borderRadius: "2px",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
    );
  }
  if (done) {
    return (
      <span
        style={{
          background: "rgba(82,183,136,0.15)",
          color: C_.accentGreen,
          padding: "4px 12px",
          borderRadius: "2px",
          fontWeight: 600,
        }}
      >
        ✓ {label}
      </span>
    );
  }
  return (
    <span
      style={{
        background: C_.warmBg,
        color: C_.muted,
        padding: "4px 12px",
        borderRadius: "2px",
        border: `1px dashed ${C_.border}`,
      }}
    >
      {label}
    </span>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e8e0d4",
        borderTop: `3px solid ${color}`,
        borderRadius: "2px",
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#888888",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "28px",
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div
        style={{
          fontSize: "9px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#888888",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "12px", color: "#1a1a1a", fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}
