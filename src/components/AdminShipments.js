// src/components/AdminShipments.js
// v1.0 — March 2026
// WP3 — Distribution & Shipment Tracking
// Features:
//   - Shipment card grid with status pipeline
//   - Create shipment: destination, courier, dates, line items
//   - Auto shipment number generation
//   - Status progression: draft → dispatched → in_transit → delivered → confirmed
//   - Line items: link inventory items or free-text
//   - Shipment detail modal: full item list, timeline, tracking
//   - Stats: active shipments, delivered this month, total units shipped
//   - Search + filter by status

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  white: "#fff",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  orange: "#e67e22",
  lightOrange: "#fef9f0",
  lightGreen: "#eafaf1",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  purple: "#6c3483",
  lightPurple: "#f5eef8",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ─── Status pipeline ──────────────────────────────────────────────────────────
const STATUS = {
  preparing: {
    label: "Preparing",
    color: C.muted,
    bg: "#f5f5f5",
    icon: "📋",
    next: "shipped",
  },
  shipped: {
    label: "Shipped",
    color: C.blue,
    bg: C.lightBlue,
    icon: "📦",
    next: "in_transit",
  },
  in_transit: {
    label: "In Transit",
    color: C.orange,
    bg: C.lightOrange,
    icon: "🚚",
    next: "delivered",
  },
  delivered: {
    label: "Delivered",
    color: C.mid,
    bg: C.lightGreen,
    icon: "✅",
    next: "confirmed",
  },
  confirmed: {
    label: "Confirmed",
    color: C.accent,
    bg: C.lightGreen,
    icon: "🎯",
    next: null,
  },
  cancelled: {
    label: "Cancelled",
    color: C.red,
    bg: C.lightRed,
    icon: "✕",
    next: null,
  },
};
const STATUS_ORDER = [
  "preparing",
  "shipped",
  "in_transit",
  "delivered",
  "confirmed",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 13,
  fontFamily: FONTS.body,
  backgroundColor: C.white,
  color: C.text,
  boxSizing: "border-box",
  outline: "none",
};
const makeBtn = (bg = C.mid, color = C.white, disabled = false) => ({
  padding: "9px 18px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: "none",
  borderRadius: 2,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: FONTS.body,
  opacity: disabled ? 0.6 : 1,
  transition: "opacity 0.2s",
});
const sectionHead = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.2em",
  color: C.muted,
  textTransform: "uppercase",
  marginBottom: 12,
  borderBottom: `1px solid ${C.border}`,
  paddingBottom: 8,
  marginTop: 4,
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}
function autoShipNumber(existing) {
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, "0");
  const seq = String((existing?.length || 0) + 1).padStart(3, "0");
  return `SHP-${y}${m}-${seq}`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft;
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.color}40`,
        whiteSpace: "nowrap",
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

// ─── Status Progress Bar ──────────────────────────────────────────────────────
function StatusPipeline({ status }) {
  const idx = STATUS_ORDER.indexOf(status);
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 4 }}>
      {STATUS_ORDER.map((s, i) => {
        const active = i <= idx;
        const current = i === idx;
        return (
          <div key={s} style={{ flex: 1, position: "relative" }}>
            <div
              style={{
                height: 4,
                backgroundColor: active ? STATUS[s].color : C.border,
                transition: "background-color 0.3s",
                marginRight: i < STATUS_ORDER.length - 1 ? 2 : 0,
              }}
            />
            {current && (
              <div
                style={{
                  fontSize: 9,
                  color: STATUS[s].color,
                  textAlign: "center",
                  marginTop: 3,
                  fontFamily: FONTS.body,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {STATUS[s].label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shipment Card ────────────────────────────────────────────────────────────
function ShipmentCard({
  shipment,
  itemCount,
  totalUnits,
  onAdvance,
  onView,
  onCancel,
}) {
  const s = STATUS[shipment.status] || STATUS.draft;
  const eta = shipment.estimated_arrival
    ? daysUntil(shipment.estimated_arrival)
    : null;
  const isLate =
    eta !== null &&
    eta < 0 &&
    !["delivered", "confirmed", "cancelled"].includes(shipment.status);

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${isLate ? C.red : shipment.status === "in_transit" ? C.orange : C.border}`,
        borderRadius: 2,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 18,
              color: C.green,
              fontWeight: 600,
            }}
          >
            {shipment.shipment_number}
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.text,
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {shipment.destination_name || "Unknown Destination"}
          </div>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      {/* Pipeline */}
      <StatusPipeline status={shipment.status} />

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: C.muted,
          flexWrap: "wrap",
        }}
      >
        {shipment.courier && <span>🚚 {shipment.courier}</span>}
        {shipment.tracking_number && (
          <span style={{ fontFamily: "monospace" }}>
            #{shipment.tracking_number}
          </span>
        )}
        {itemCount > 0 && (
          <span>
            📦 {itemCount} SKU{itemCount !== 1 ? "s" : ""} · {totalUnits} units
          </span>
        )}
      </div>

      {/* Dates */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: C.muted,
          flexWrap: "wrap",
        }}
      >
        {shipment.shipped_date && (
          <span>Dispatched: {fmtDate(shipment.shipped_date)}</span>
        )}
        {shipment.estimated_arrival && (
          <span
            style={{
              color: isLate
                ? C.red
                : eta !== null && eta <= 2
                  ? C.orange
                  : C.muted,
            }}
          >
            ETA: {fmtDate(shipment.estimated_arrival)}
            {eta !== null &&
            !["delivered", "confirmed", "cancelled"].includes(shipment.status)
              ? " (" + (eta < 0 ? Math.abs(eta) + "d late" : eta + "d") + ")"
              : ""}
          </span>
        )}
        {shipment.delivered_date && (
          <span>Delivered: {fmtDate(shipment.delivered_date)}</span>
        )}
      </div>

      {isLate && (
        <div style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>
          ⚠ Shipment overdue
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <button
          onClick={() => onView(shipment)}
          style={{
            ...makeBtn(C.blue),
            fontSize: 10,
            padding: "7px 14px",
            flex: 1,
          }}
        >
          📋 Details
        </button>
        {s.next && (
          <button
            onClick={() => onAdvance(shipment, s.next)}
            style={{
              ...makeBtn(STATUS[s.next]?.color || C.mid),
              fontSize: 10,
              padding: "7px 14px",
              flex: 1,
            }}
          >
            {STATUS[s.next]?.icon} {STATUS[s.next]?.label}
          </button>
        )}
        {!["delivered", "confirmed", "cancelled"].includes(shipment.status) && (
          <button
            onClick={() => onCancel(shipment)}
            style={{
              ...makeBtn("transparent", C.red),
              border: `1px solid ${C.red}`,
              fontSize: 10,
              padding: "7px 12px",
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Create Shipment Form ─────────────────────────────────────────────────────
function CreateShipmentForm({
  inventoryItems,
  existingShipments,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState({
    shipment_number: autoShipNumber(existingShipments),
    destination_name: "",
    courier: "",
    tracking_number: "",
    shipped_date: new Date().toISOString().split("T")[0],
    estimated_arrival: "",
    notes: "",
    status: "preparing",
  });
  const [lineItems, setLineItems] = useState([
    {
      inventory_item_id: "",
      item_name: "",
      sku: "",
      quantity: "",
      unit_cost: "",
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (i, k, v) =>
    setLineItems((arr) =>
      arr.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)),
    );

  const handleItemSelect = (i, itemId) => {
    const item = inventoryItems.find((it) => it.id === itemId);
    if (item) {
      setLineItems((arr) =>
        arr.map((r, idx) =>
          idx === i
            ? {
                ...r,
                inventory_item_id: itemId,
                item_name: item.name,
                sku: item.sku,
                unit_cost: item.sell_price || "",
              }
            : r,
        ),
      );
    } else {
      setLine(i, "inventory_item_id", "");
    }
  };

  const addLine = () =>
    setLineItems((arr) => [
      ...arr,
      {
        inventory_item_id: "",
        item_name: "",
        sku: "",
        quantity: "",
        unit_cost: "",
      },
    ]);
  const removeLine = (i) =>
    setLineItems((arr) => arr.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError("");
    if (!form.destination_name.trim()) {
      setError("Destination name required.");
      return;
    }
    const validLines = lineItems.filter((l) => l.item_name && l.quantity);
    if (validLines.length === 0) {
      setError("Add at least one line item.");
      return;
    }

    setSaving(true);
    try {
      // Get current user's tenant_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      const tenantId = profile?.tenant_id || null;

      const { data: shp, error: shpErr } = await supabase
        .from("shipments")
        .insert({
          tenant_id: tenantId,
          shipment_number: form.shipment_number,
          destination_name: form.destination_name,
          courier: form.courier || null,
          tracking_number: form.tracking_number || null,
          shipped_date:
            form.status !== "draft" ? form.shipped_date || null : null,
          estimated_arrival: form.estimated_arrival || null,
          notes: form.notes || null,
          status: form.status,
        })
        .select()
        .single();
      if (shpErr) throw shpErr;

      const items = validLines.map((l) => ({
        shipment_id: shp.id,
        inventory_item_id: l.inventory_item_id || null,
        item_name: l.item_name,
        sku: l.sku || null,
        quantity: parseInt(l.quantity),
        unit_cost: l.unit_cost ? parseFloat(l.unit_cost) : null,
        total_cost:
          l.unit_cost && l.quantity
            ? parseFloat(l.unit_cost) * parseInt(l.quantity)
            : null,
      }));
      const { error: itemErr } = await supabase
        .from("shipment_items")
        .insert(items);
      if (itemErr) throw itemErr;

      onSave(shp);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalUnits = lineItems.reduce(
    (s, l) => s + (parseInt(l.quantity) || 0),
    0,
  );
  const totalValue = lineItems.reduce(
    (s, l) => s + (parseFloat(l.unit_cost) || 0) * (parseInt(l.quantity) || 0),
    0,
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(600px, 100vw)",
        background: C.white,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        zIndex: 1000,
        overflowY: "auto",
        fontFamily: FONTS.body,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: C.green,
          padding: "20px 24px",
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <div
          style={{ fontFamily: FONTS.heading, fontSize: 22, color: C.white }}
        >
          New Shipment
        </div>
        <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>
          Create distribution order to retailer
        </div>
        <button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            color: C.white,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 24 }}>
        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: C.lightRed,
              border: `1px solid ${C.red}`,
              borderRadius: 2,
              color: C.red,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div style={sectionHead}>Shipment Details</div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Shipment Number
            </div>
            <input
              style={inputStyle}
              value={form.shipment_number}
              onChange={(e) => set("shipment_number", e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Status
            </div>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="preparing">Preparing</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
            Destination (Retailer / Stockist) *
          </div>
          <input
            style={inputStyle}
            value={form.destination_name}
            onChange={(e) => set("destination_name", e.target.value)}
            placeholder="e.g. Cape Town Dispensary"
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Courier
            </div>
            <input
              style={inputStyle}
              value={form.courier}
              onChange={(e) => set("courier", e.target.value)}
              placeholder="e.g. Courier Guy, FastWay"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Tracking Number
            </div>
            <input
              style={inputStyle}
              value={form.tracking_number}
              onChange={(e) => set("tracking_number", e.target.value)}
              placeholder="Waybill / tracking #"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Dispatch Date
            </div>
            <input
              style={inputStyle}
              type="date"
              value={form.shipped_date}
              onChange={(e) => set("shipped_date", e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Estimated Arrival
            </div>
            <input
              style={inputStyle}
              type="date"
              value={form.estimated_arrival}
              onChange={(e) => set("estimated_arrival", e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
            Notes
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional notes"
          />
        </div>

        <div style={sectionHead}>Line Items</div>

        {lineItems.map((line, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 3 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  Inventory Item (optional)
                </div>
                <select
                  style={{ ...inputStyle, cursor: "pointer", fontSize: 12 }}
                  value={line.inventory_item_id}
                  onChange={(e) => handleItemSelect(i, e.target.value)}
                >
                  <option value="">— Select or type below —</option>
                  {inventoryItems
                    .filter((it) => it.is_active)
                    .map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.sku})
                      </option>
                    ))}
                </select>
              </div>
              {lineItems.length > 1 && (
                <button
                  onClick={() => removeLine(i)}
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    padding: "6px 10px",
                    cursor: "pointer",
                    color: C.muted,
                    alignSelf: "flex-end",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 3 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  Item Name *
                </div>
                <input
                  style={{ ...inputStyle, fontSize: 12 }}
                  value={line.item_name}
                  onChange={(e) => setLine(i, "item_name", e.target.value)}
                  placeholder="Product name"
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  SKU
                </div>
                <input
                  style={{ ...inputStyle, fontSize: 12 }}
                  value={line.sku}
                  onChange={(e) => setLine(i, "sku", e.target.value)}
                  placeholder="SKU"
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  Qty *
                </div>
                <input
                  style={{ ...inputStyle, fontSize: 12 }}
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => setLine(i, "quantity", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  Unit Price
                </div>
                <input
                  style={{ ...inputStyle, fontSize: 12 }}
                  type="number"
                  step="0.01"
                  value={line.unit_cost}
                  onChange={(e) => setLine(i, "unit_cost", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addLine}
          style={{
            ...makeBtn("transparent", C.mid),
            border: `1px solid ${C.border}`,
            fontSize: 10,
            padding: "7px 14px",
            marginBottom: 20,
          }}
        >
          + Add Line Item
        </button>

        {/* Totals */}
        {totalUnits > 0 && (
          <div
            style={{
              padding: "12px 16px",
              background: C.cream,
              borderRadius: 2,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
            }}
          >
            <span style={{ color: C.muted }}>
              Total:{" "}
              <strong style={{ color: C.text }}>{totalUnits} units</strong>
            </span>
            {totalValue > 0 && (
              <span style={{ color: C.muted }}>
                Value:{" "}
                <strong style={{ color: C.green }}>
                  R{totalValue.toLocaleString()}
                </strong>
              </span>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...makeBtn(C.green, C.white, saving), flex: 1 }}
          >
            {saving ? "Creating…" : "Create Shipment"}
          </button>
          <button
            onClick={onCancel}
            style={{
              ...makeBtn("transparent", C.muted),
              border: `1px solid ${C.border}`,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ shipment, items, onClose, onAdvance }) {
  const s = STATUS[shipment.status] || STATUS.draft;
  const totalUnits = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalValue = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 2,
          padding: 32,
          maxWidth: 560,
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
          fontFamily: FONTS.body,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 24,
                color: C.green,
              }}
            >
              {shipment.shipment_number}
            </div>
            <div
              style={{
                fontSize: 14,
                color: C.text,
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              {shipment.destination_name}
            </div>
          </div>
          <StatusBadge status={shipment.status} />
        </div>

        <StatusPipeline status={shipment.status} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            margin: "16px 0",
          }}
        >
          {[
            { label: "Courier", value: shipment.courier || "—" },
            { label: "Tracking", value: shipment.tracking_number || "—" },
            { label: "Dispatched", value: fmtDate(shipment.shipped_date) },
            {
              label: "Est. Arrival",
              value: fmtDate(shipment.estimated_arrival),
            },
            { label: "Delivered", value: fmtDate(shipment.delivered_date) },
            { label: "Confirmed", value: fmtDate(shipment.confirmed_date) },
          ]
            .filter((r) => r.value !== "—")
            .map((r) => (
              <div
                key={r.label}
                style={{
                  padding: "10px 14px",
                  background: C.cream,
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 3,
                  }}
                >
                  {r.label}
                </div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                  {r.value}
                </div>
              </div>
            ))}
        </div>

        {items.length > 0 && (
          <>
            <div style={sectionHead}>Line Items</div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <thead>
                <tr>
                  {["Item", "SKU", "Qty", "Unit Price", "Total"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: 10,
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
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
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: C.muted,
                      }}
                    >
                      {item.sku || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${C.border}`,
                        fontWeight: 600,
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${C.border}`,
                        color: C.muted,
                      }}
                    >
                      {item.unit_cost ? `R${item.unit_cost}` : "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${C.border}`,
                        fontWeight: 600,
                        color: C.green,
                      }}
                    >
                      {item.total_cost
                        ? `R${item.total_cost.toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 8px",
                background: C.cream,
                borderRadius: 2,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <span>
                <strong>{totalUnits}</strong> units total
              </span>
              {totalValue > 0 && (
                <span style={{ fontWeight: 700, color: C.green }}>
                  R{totalValue.toLocaleString()}
                </span>
              )}
            </div>
          </>
        )}

        {shipment.notes && (
          <>
            <div style={sectionHead}>Notes</div>
            <div
              style={{
                fontSize: 13,
                color: C.muted,
                fontStyle: "italic",
                marginBottom: 16,
              }}
            >
              {shipment.notes}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          {s.next && (
            <button
              onClick={() => {
                onAdvance(shipment, s.next);
                onClose();
              }}
              style={{ ...makeBtn(STATUS[s.next]?.color || C.mid), flex: 1 }}
            >
              {STATUS[s.next]?.icon} Mark {STATUS[s.next]?.label}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              ...makeBtn("transparent", C.muted),
              border: `1px solid ${C.border}`,
              flex: s.next ? 0 : 1,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminShipments() {
  const [shipments, setShipments] = useState([]);
  const [itemsMap, setItemsMap] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [shpRes, itemsRes, invRes] = await Promise.all([
        supabase
          .from("shipments")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("shipment_items").select("*"),
        supabase
          .from("inventory_items")
          .select("id, name, sku, sell_price, is_active, unit")
          .eq("is_active", true),
      ]);
      const shpList = shpRes.data || [];
      setShipments(shpList);
      setInventoryItems(invRes.data || []);

      const map = {};
      for (const item of itemsRes.data || []) {
        if (!map[item.shipment_id]) map[item.shipment_id] = [];
        map[item.shipment_id].push(item);
      }
      setItemsMap(map);
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAdvance = async (shipment, nextStatus) => {
    const updates = {
      status: nextStatus,
      ...(nextStatus === "shipped"
        ? { shipped_date: new Date().toISOString().split("T")[0] }
        : {}),
      ...(nextStatus === "delivered"
        ? { delivered_date: new Date().toISOString().split("T")[0] }
        : {}),
      ...(nextStatus === "confirmed"
        ? { confirmed_date: new Date().toISOString().split("T")[0] }
        : {}),
    };
    const { error } = await supabase
      .from("shipments")
      .update(updates)
      .eq("id", shipment.id);
    if (!error) {
      showToast(
        `Shipment ${shipment.shipment_number} → ${STATUS[nextStatus]?.label}`,
      );
      fetchAll();
    }
  };

  const handleCancel = async (shipment) => {
    if (!window.confirm(`Cancel shipment ${shipment.shipment_number}?`)) return;
    const { error } = await supabase
      .from("shipments")
      .update({ status: "cancelled" })
      .eq("id", shipment.id);
    if (!error) {
      showToast("Shipment cancelled.");
      fetchAll();
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeShipments = shipments.filter((s) =>
    ["preparing", "shipped", "in_transit"].includes(s.status),
  ).length;
  const deliveredThisMonth = shipments.filter(
    (s) => s.status === "delivered" && new Date(s.delivered_date) >= monthStart,
  ).length;
  const inTransit = shipments.filter((s) => s.status === "in_transit").length;
  const totalUnitsShipped = Object.values(itemsMap)
    .flat()
    .reduce((s, i) => s + (i.quantity || 0), 0);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = shipments.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (s.shipment_number || "").toLowerCase().includes(q) ||
      (s.destination_name || "").toLowerCase().includes(q) ||
      (s.tracking_number || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filter === "active")
      return ["preparing", "shipped", "in_transit"].includes(s.status);
    if (filter === "delivered")
      return ["delivered", "confirmed"].includes(s.status);
    if (filter === "cancelled") return s.status === "cancelled";
    return true;
  });

  return (
    <div style={{ fontFamily: FONTS.body, position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.green,
            color: C.white,
            padding: "12px 24px",
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
            fontFamily: FONTS.body,
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: 24,
              margin: 0,
            }}
          >
            Shipments
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Distribute stock to retailers · Track in transit · Confirm delivery
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={makeBtn(C.mid)}>
          + New Shipment
        </button>
      </div>

      {/* Stats */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        {[
          {
            label: "Active",
            value: activeShipments,
            color: activeShipments > 0 ? C.blue : C.muted,
          },
          {
            label: "In Transit",
            value: inTransit,
            color: inTransit > 0 ? C.orange : C.muted,
          },
          {
            label: "Delivered (Month)",
            value: deliveredThisMonth,
            color: C.accent,
          },
          { label: "Total Units", value: totalUnitsShipped, color: C.green },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: "16px 20px",
              flex: "1 1 140px",
              minWidth: 120,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: FONTS.heading,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
                marginTop: 4,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* In-transit alert */}
      {inTransit > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: C.lightOrange,
            border: `1px solid ${C.orange}`,
            borderRadius: 2,
            marginBottom: 20,
            fontSize: 13,
            color: C.orange,
            fontWeight: 600,
          }}
        >
          🚚 {inTransit} shipment{inTransit > 1 ? "s" : ""} currently in transit
        </div>
      )}

      {/* Search + filter */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          style={{ ...inputStyle, maxWidth: 280 }}
          placeholder="Search shipment, destination, tracking…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div
          style={{
            display: "flex",
            gap: 0,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {[
            { key: "active", label: "Active" },
            { key: "delivered", label: "Delivered" },
            { key: "cancelled", label: "Cancelled" },
            { key: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 16px",
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: FONTS.body,
                transition: "all 0.15s",
                backgroundColor: filter === f.key ? C.green : C.white,
                color: filter === f.key ? C.white : C.muted,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
          {filtered.length} shipment{filtered.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={fetchAll}
          style={{
            ...makeBtn("transparent", C.muted),
            border: `1px solid ${C.border}`,
            padding: "8px 16px",
            fontSize: 11,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Card grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>
          Loading shipments…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            border: `1px dashed ${C.border}`,
            borderRadius: 2,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚚</div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 20,
              color: C.green,
              marginBottom: 8,
            }}
          >
            No shipments found
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
            {filter === "active"
              ? "Create a shipment to start distributing to retailers."
              : `No ${filter} shipments.`}
          </div>
          {filter === "active" && (
            <button onClick={() => setShowCreate(true)} style={makeBtn(C.mid)}>
              + Create First Shipment
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((shp) => (
            <ShipmentCard
              key={shp.id}
              shipment={shp}
              itemCount={(itemsMap[shp.id] || []).length}
              totalUnits={(itemsMap[shp.id] || []).reduce(
                (s, i) => s + (i.quantity || 0),
                0,
              )}
              onAdvance={handleAdvance}
              onView={(s) => setViewTarget(s)}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <>
          <div
            onClick={() => setShowCreate(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />
          <CreateShipmentForm
            inventoryItems={inventoryItems}
            existingShipments={shipments}
            onSave={() => {
              setShowCreate(false);
              showToast("Shipment created.");
              fetchAll();
            }}
            onCancel={() => setShowCreate(false)}
          />
        </>
      )}

      {/* Detail modal */}
      {viewTarget && (
        <DetailModal
          shipment={viewTarget}
          items={itemsMap[viewTarget.id] || []}
          onClose={() => setViewTarget(null)}
          onAdvance={(s, next) => {
            handleAdvance(s, next);
            setViewTarget(null);
          }}
        />
      )}
    </div>
  );
}
