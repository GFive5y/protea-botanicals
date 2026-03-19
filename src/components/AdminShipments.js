// src/components/AdminShipments.js
// v1.3 — WP-VIZ: Status Donut + Units by Destination HBar + Pipeline Stage Bar
// v1.2 — WP-GUIDE: WorkflowGuide + usePageContext added
// v1.1 — WP-VISUAL: T tokens, Inter font, flush stat grid, underline tabs, no Cormorant/Jost
// v1.0 — March 2026 · WP3 — Distribution & Shipment Tracking

import React, { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "./WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "./viz";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#474747",
  ink400: "#6B6B6B",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
};
// Legacy aliases
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.ink050,
  border: T.ink150,
  muted: T.ink400,
  text: T.ink700,
  white: "#fff",
  red: T.danger,
  lightRed: T.dangerBg,
  orange: T.warning,
  lightOrange: T.warningBg,
  lightGreen: T.accentLit,
  blue: T.info,
  lightBlue: T.infoBg,
};
const FONTS = { heading: T.font, body: T.font };

// ─── STATUS PIPELINE ─────────────────────────────────────────────────────────
const STATUS = {
  preparing: {
    label: "Preparing",
    color: T.ink400,
    bg: T.ink075,
    next: "shipped",
  },
  shipped: {
    label: "Shipped",
    color: T.info,
    bg: T.infoBg,
    next: "in_transit",
  },
  in_transit: {
    label: "In Transit",
    color: T.warning,
    bg: T.warningBg,
    next: "delivered",
  },
  delivered: {
    label: "Delivered",
    color: T.success,
    bg: T.successBg,
    next: "confirmed",
  },
  confirmed: {
    label: "Confirmed",
    color: T.accentMid,
    bg: T.accentLit,
    next: null,
  },
  cancelled: {
    label: "Cancelled",
    color: T.danger,
    bg: T.dangerBg,
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

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  backgroundColor: "#fff",
  color: T.ink700,
  boxSizing: "border-box",
  outline: "none",
};
const makeBtn = (bg = T.accentMid, color = "#fff", disabled = false) => ({
  padding: "9px 18px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: bg === "transparent" ? `1px solid ${T.ink150}` : "none",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: T.font,
  opacity: disabled ? 0.6 : 1,
  transition: "opacity 0.15s",
});

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.preparing;
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}40`,
        whiteSpace: "nowrap",
        fontFamily: T.font,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── STATUS PIPELINE BAR ─────────────────────────────────────────────────────
function StatusPipeline({ status }) {
  const idx = STATUS_ORDER.indexOf(status);
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
      {STATUS_ORDER.map((s, i) => {
        const active = i <= idx;
        const current = i === idx;
        return (
          <div key={s} style={{ flex: 1 }}>
            <div
              style={{
                height: 4,
                background: active ? STATUS[s].color : T.ink150,
                borderRadius: 2,
                transition: "background 0.3s",
              }}
            />
            {current && (
              <div
                style={{
                  fontSize: 9,
                  color: STATUS[s].color,
                  textAlign: "center",
                  marginTop: 3,
                  fontFamily: T.font,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
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

// ─── SHIPMENT CARD ────────────────────────────────────────────────────────────
function ShipmentCard({
  shipment,
  itemCount,
  totalUnits,
  onAdvance,
  onView,
  onCancel,
}) {
  const s = STATUS[shipment.status] || STATUS.preparing;
  const eta = shipment.estimated_arrival
    ? daysUntil(shipment.estimated_arrival)
    : null;
  const isLate =
    eta !== null &&
    eta < 0 &&
    !["delivered", "confirmed", "cancelled"].includes(shipment.status);
  const cardBd = isLate
    ? T.dangerBd
    : shipment.status === "in_transit"
      ? T.warningBd
      : T.ink150;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${cardBd}`,
        borderRadius: 8,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: T.shadow,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = T.shadowMd)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = T.shadow)}
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
              fontFamily: T.font,
              fontSize: 15,
              fontWeight: 600,
              color: T.ink900,
            }}
          >
            {shipment.shipment_number}
          </div>
          <div
            style={{
              fontSize: 13,
              color: T.ink700,
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

      {/* Attributes */}
      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 12,
          color: T.ink400,
          flexWrap: "wrap",
          fontFamily: T.font,
        }}
      >
        {shipment.courier && <span>{shipment.courier}</span>}
        {shipment.tracking_number && (
          <span style={{ fontFamily: "monospace" }}>
            #{shipment.tracking_number}
          </span>
        )}
        {itemCount > 0 && (
          <span>
            {itemCount} SKU{itemCount !== 1 ? "s" : ""} · {totalUnits} units
          </span>
        )}
      </div>

      {/* Dates */}
      <div
        style={{
          display: "flex",
          gap: 14,
          fontSize: 11,
          color: T.ink400,
          flexWrap: "wrap",
          fontFamily: T.font,
        }}
      >
        {shipment.shipped_date && (
          <span>Dispatched: {fmtDate(shipment.shipped_date)}</span>
        )}
        {shipment.estimated_arrival && (
          <span
            style={{
              color: isLate
                ? T.danger
                : eta !== null && eta <= 2
                  ? T.warning
                  : T.ink400,
            }}
          >
            ETA: {fmtDate(shipment.estimated_arrival)}
            {eta !== null &&
            !["delivered", "confirmed", "cancelled"].includes(shipment.status)
              ? ` (${eta < 0 ? Math.abs(eta) + "d late" : eta + "d"})`
              : ""}
          </span>
        )}
        {shipment.delivered_date && (
          <span>Delivered: {fmtDate(shipment.delivered_date)}</span>
        )}
      </div>

      {isLate && (
        <div
          style={{
            fontSize: 11,
            color: T.danger,
            fontWeight: 600,
            fontFamily: T.font,
          }}
        >
          Shipment overdue
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <button
          onClick={() => onView(shipment)}
          style={{
            ...makeBtn(T.info),
            fontSize: 10,
            padding: "7px 14px",
            flex: 1,
          }}
        >
          Details
        </button>
        {s.next && (
          <button
            onClick={() => onAdvance(shipment, s.next)}
            style={{
              ...makeBtn(STATUS[s.next]?.color || T.accentMid),
              fontSize: 10,
              padding: "7px 14px",
              flex: 1,
            }}
          >
            {STATUS[s.next]?.label}
          </button>
        )}
        {!["delivered", "confirmed", "cancelled"].includes(shipment.status) && (
          <button
            onClick={() => onCancel(shipment)}
            style={{
              ...makeBtn("transparent", T.danger),
              border: `1px solid ${T.dangerBd}`,
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

// ─── CREATE FORM (DRAWER) ─────────────────────────────────────────────────────
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

  const fldLabel = (text) => (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: T.ink400,
        marginBottom: 5,
        fontFamily: T.font,
      }}
    >
      {text}
    </div>
  );
  const sectionHdr = (text) => (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: T.ink400,
        marginBottom: 12,
        marginTop: 8,
        paddingBottom: 8,
        borderBottom: `1px solid ${T.ink150}`,
        fontFamily: T.font,
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(600px,100vw)",
        background: "#fff",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        zIndex: 1000,
        overflowY: "auto",
        fontFamily: T.font,
      }}
    >
      <div
        style={{
          background: T.accent,
          padding: "20px 24px",
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: T.font,
            fontSize: 18,
            fontWeight: 600,
            color: "#fff",
          }}
        >
          New Shipment
        </div>
        <div style={{ fontSize: 12, color: T.accentBd, marginTop: 2 }}>
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
            color: "#fff",
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
              background: T.dangerBg,
              border: `1px solid ${T.dangerBd}`,
              borderRadius: 4,
              color: T.danger,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {sectionHdr("Shipment Details")}

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            {fldLabel("Shipment Number")}
            <input
              style={inputStyle}
              value={form.shipment_number}
              onChange={(e) => set("shipment_number", e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            {fldLabel("Status")}
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
          {fldLabel("Destination (Retailer / Stockist) *")}
          <input
            style={inputStyle}
            value={form.destination_name}
            onChange={(e) => set("destination_name", e.target.value)}
            placeholder="e.g. Cape Town Dispensary"
          />
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            {fldLabel("Courier")}
            <input
              style={inputStyle}
              value={form.courier}
              onChange={(e) => set("courier", e.target.value)}
              placeholder="e.g. Courier Guy"
            />
          </div>
          <div style={{ flex: 1 }}>
            {fldLabel("Tracking Number")}
            <input
              style={inputStyle}
              value={form.tracking_number}
              onChange={(e) => set("tracking_number", e.target.value)}
              placeholder="Waybill #"
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            {fldLabel("Dispatch Date")}
            <input
              style={inputStyle}
              type="date"
              value={form.shipped_date}
              onChange={(e) => set("shipped_date", e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            {fldLabel("Estimated Arrival")}
            <input
              style={inputStyle}
              type="date"
              value={form.estimated_arrival}
              onChange={(e) => set("estimated_arrival", e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          {fldLabel("Notes")}
          <textarea
            style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional notes"
          />
        </div>

        {sectionHdr("Line Items")}

        {lineItems.map((line, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${T.ink150}`,
              borderRadius: 6,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 3 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    marginBottom: 3,
                    fontFamily: T.font,
                  }}
                >
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
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    padding: "6px 10px",
                    cursor: "pointer",
                    color: T.ink400,
                    alignSelf: "flex-end",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 3 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    marginBottom: 3,
                    fontFamily: T.font,
                  }}
                >
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
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    marginBottom: 3,
                    fontFamily: T.font,
                  }}
                >
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
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    marginBottom: 3,
                    fontFamily: T.font,
                  }}
                >
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
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    marginBottom: 3,
                    fontFamily: T.font,
                  }}
                >
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
            ...makeBtn("transparent", T.accentMid),
            border: `1px solid ${T.accentBd}`,
            fontSize: 10,
            padding: "7px 14px",
            marginBottom: 20,
          }}
        >
          + Add Line Item
        </button>

        {totalUnits > 0 && (
          <div
            style={{
              padding: "12px 16px",
              background: T.ink075,
              borderRadius: 4,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              fontFamily: T.font,
            }}
          >
            <span style={{ color: T.ink400 }}>
              Total:{" "}
              <strong
                style={{ color: T.ink900, fontVariantNumeric: "tabular-nums" }}
              >
                {totalUnits} units
              </strong>
            </span>
            {totalValue > 0 && (
              <span style={{ color: T.ink400 }}>
                Value:{" "}
                <strong
                  style={{
                    color: T.accent,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  R{totalValue.toLocaleString("en-ZA")}
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
            borderTop: `1px solid ${T.ink150}`,
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...makeBtn(T.accent, "#fff", saving), flex: 1 }}
          >
            {saving ? "Creating…" : "Create Shipment"}
          </button>
          <button
            onClick={onCancel}
            style={{
              ...makeBtn("transparent", T.ink400),
              border: `1px solid ${T.ink150}`,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ shipment, items, onClose, onAdvance }) {
  const s = STATUS[shipment.status] || STATUS.preparing;
  const totalUnits = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalValue = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 32,
          maxWidth: 560,
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
          fontFamily: T.font,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
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
                fontFamily: T.font,
                fontSize: 18,
                fontWeight: 600,
                color: T.ink900,
              }}
            >
              {shipment.shipment_number}
            </div>
            <div
              style={{
                fontSize: 14,
                color: T.ink700,
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
            gap: 10,
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
                  padding: "10px 12px",
                  background: T.ink075,
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 3,
                    fontFamily: T.font,
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: T.ink700,
                    fontWeight: 500,
                    fontFamily: T.font,
                  }}
                >
                  {r.value}
                </div>
              </div>
            ))}
        </div>

        {items.length > 0 && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: `1px solid ${T.ink150}`,
                fontFamily: T.font,
              }}
            >
              Line Items
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                marginBottom: 12,
                fontFamily: T.font,
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
                        borderBottom: `1px solid ${T.ink150}`,
                        fontSize: 10,
                        color: T.ink400,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
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
                        borderBottom: `1px solid ${T.ink075}`,
                        fontWeight: 500,
                      }}
                    >
                      {item.item_name}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${T.ink075}`,
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: T.ink400,
                      }}
                    >
                      {item.sku || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${T.ink075}`,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${T.ink075}`,
                        color: T.ink400,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {item.unit_cost ? `R${item.unit_cost}` : "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${T.ink075}`,
                        fontWeight: 600,
                        color: T.accent,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {item.total_cost
                        ? `R${item.total_cost.toLocaleString("en-ZA")}`
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
                background: T.ink075,
                borderRadius: 4,
                fontSize: 13,
                marginBottom: 16,
                fontFamily: T.font,
              }}
            >
              <span>
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                  {totalUnits}
                </strong>{" "}
                units total
              </span>
              {totalValue > 0 && (
                <span
                  style={{
                    fontWeight: 700,
                    color: T.accent,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  R{totalValue.toLocaleString("en-ZA")}
                </span>
              )}
            </div>
          </>
        )}

        {shipment.notes && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom: `1px solid ${T.ink150}`,
                fontFamily: T.font,
              }}
            >
              Notes
            </div>
            <div
              style={{
                fontSize: 13,
                color: T.ink400,
                fontStyle: "italic",
                marginBottom: 16,
                fontFamily: T.font,
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
              style={{
                ...makeBtn(STATUS[s.next]?.color || T.accentMid),
                flex: 1,
              }}
            >
              Mark {STATUS[s.next]?.label}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              ...makeBtn("transparent", T.ink400),
              border: `1px solid ${T.ink150}`,
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
  const ctx = usePageContext("shipments", null);
  const [shipments, setShipments] = useState([]);
  const [itemsMap, setItemsMap] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // GAP-02: write a system_alert (non-blocking, fire-and-forget)
  const writeAlert = useCallback(async (alertType, severity, title, body) => {
    try {
      await supabase.from("system_alerts").insert({
        tenant_id: "43b34c33-6864-4f02-98dd-df1d340475c3",
        alert_type: alertType,
        severity,
        status: "open",
        title,
        body: body || null,
        source_table: "shipments",
      });
    } catch (_) {}
  }, []);

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
          .select("id,name,sku,sell_price,is_active,unit")
          .eq("is_active", true),
      ]);
      const fetchedShipments = shpRes.data || [];
      setShipments(fetchedShipments);
      setInventoryItems(invRes.data || []);
      const map = {};
      for (const item of itemsRes.data || []) {
        if (!map[item.shipment_id]) map[item.shipment_id] = [];
        map[item.shipment_id].push(item);
      }
      setItemsMap(map);

      // GAP-02: fire alerts for overdue + disputed shipments
      const now = new Date();
      const overdue = fetchedShipments.filter(
        (s) =>
          s.estimated_arrival &&
          new Date(s.estimated_arrival) < now &&
          !["delivered", "confirmed", "cancelled"].includes(s.status),
      );
      const disputed = fetchedShipments.filter((s) => s.status === "disputed");
      if (overdue.length > 0) {
        writeAlert(
          "shipment_overdue",
          "warning",
          `${overdue.length} shipment${overdue.length > 1 ? "s" : ""} past estimated arrival`,
          overdue
            .map(
              (s) =>
                `${s.shipment_number} → ${s.destination_name} (ETA ${s.estimated_arrival?.split("T")[0]})`,
            )
            .join(" · "),
        );
      }
      if (disputed.length > 0) {
        writeAlert(
          "shipment_disputed",
          "warning",
          `${disputed.length} shipment${disputed.length > 1 ? "s" : ""} disputed`,
          disputed
            .map((s) => `${s.shipment_number} → ${s.destination_name}`)
            .join(" · "),
        );
      }
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
      showToast(`${shipment.shipment_number} → ${STATUS[nextStatus]?.label}`);
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

  const FILTER_TABS = [
    { key: "active", label: "Active" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All" },
  ];

  return (
    <div style={{ fontFamily: T.font, position: "relative" }}>
      <WorkflowGuide
        context={ctx}
        tabId="shipments"
        onAction={() => {}}
        defaultOpen={false}
      />
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: T.accent,
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
            boxShadow: T.shadowMd,
            fontFamily: T.font,
          }}
        >
          {toast}
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
              fontFamily: T.font,
              fontSize: 22,
              fontWeight: 600,
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            Shipments
          </h2>
          <div style={{ fontSize: 13, color: T.ink400 }}>
            Distribute stock to retailers · Track in transit · Confirm delivery
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={makeBtn(T.accent)}>
          + New Shipment
        </button>
      </div>

      {/* ── STAT GRID (flush, no borderTop) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Active",
            value: activeShipments,
            color: activeShipments > 0 ? T.info : T.ink400,
          },
          {
            label: "In Transit",
            value: inTransit,
            color: inTransit > 0 ? T.warning : T.ink400,
          },
          {
            label: "Delivered (Month)",
            value: deliveredThisMonth,
            color: T.success,
          },
          {
            label: "Total Units",
            value: totalUnitsShipped.toLocaleString("en-ZA"),
            color: T.accent,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: "#fff", padding: "16px 18px" }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: 6,
                fontFamily: T.font,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 22,
                fontWeight: 400,
                color: s.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── WP-VIZ CHARTS ── */}
      {!loading &&
        shipments.length > 0 &&
        (() => {
          // Chart 1: Status donut
          const statusCounts = shipments.reduce((acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
          }, {});
          const statusDonut = [
            {
              name: "Preparing",
              value: statusCounts["preparing"] || 0,
              color: T.ink400,
            },
            {
              name: "Shipped",
              value: statusCounts["shipped"] || 0,
              color: T.info,
            },
            {
              name: "In Transit",
              value: statusCounts["in_transit"] || 0,
              color: T.warning,
            },
            {
              name: "Delivered",
              value: statusCounts["delivered"] || 0,
              color: T.success,
            },
            {
              name: "Confirmed",
              value: statusCounts["confirmed"] || 0,
              color: T.accentMid,
            },
            {
              name: "Cancelled",
              value: statusCounts["cancelled"] || 0,
              color: T.danger,
            },
          ].filter((d) => d.value > 0);

          // Chart 2: Units shipped by destination (top 8)
          const destMap = {};
          shipments.forEach((s) => {
            const dest = s.destination_name || "Unknown";
            const units = (itemsMap[s.id] || []).reduce(
              (t, i) => t + (i.quantity || 0),
              0,
            );
            destMap[dest] = (destMap[dest] || 0) + units;
          });
          const destBar = Object.entries(destMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([dest, units]) => ({
              name: dest.length > 14 ? dest.slice(0, 14) + "…" : dest,
              units,
            }));
          const destMax = Math.max(...destBar.map((d) => d.units), 1);

          // Chart 3: Pipeline stage grouped bar
          const pipelineBar = STATUS_ORDER.map((s) => ({
            name: STATUS[s].label,
            count: statusCounts[s] || 0,
            color: STATUS[s].color,
          }));

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Donut — shipment status mix */}
              <ChartCard title="Shipment Status Mix" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDonut}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {statusDonut.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip formatter={(v) => `${v} shipments`} />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* HBar — units by destination */}
              <ChartCard title="Units by Destination" height={200}>
                {destBar.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      fontSize: 13,
                      color: T.ink400,
                      fontFamily: T.font,
                    }}
                  >
                    No units data
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "8px 4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      height: "100%",
                      justifyContent: "center",
                    }}
                  >
                    {destBar.map((d) => (
                      <div
                        key={d.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: T.ink400,
                            fontFamily: T.font,
                            width: 72,
                            flexShrink: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.name}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 14,
                            background: T.ink075,
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(d.units / destMax) * 100}%`,
                              background: T.accentMid,
                              borderRadius: 3,
                              transition: "width 0.5s",
                              display: "flex",
                              alignItems: "center",
                              paddingLeft: 4,
                            }}
                          >
                            {d.units / destMax > 0.25 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#fff",
                                  fontWeight: 700,
                                  fontFamily: T.font,
                                }}
                              >
                                {d.units}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: T.ink400,
                            fontFamily: T.font,
                            minWidth: 24,
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {d.units / destMax <= 0.25 ? d.units : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>

              {/* Bar — pipeline stage counts */}
              <ChartCard title="Shipments by Stage" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pipelineBar}
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
                      tick={{ fill: T.ink400, fontSize: 9, fontFamily: T.font }}
                      axisLine={false}
                      tickLine={false}
                      dy={4}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={22}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip formatter={(v) => `${v} shipments`} />
                      }
                    />
                    <Bar
                      dataKey="count"
                      name="Shipments"
                      isAnimationActive={false}
                      maxBarSize={36}
                      radius={[3, 3, 0, 0]}
                    >
                      {pipelineBar.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          );
        })()}

      {/* In-transit alert */}
      {inTransit > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: T.warningBg,
            border: `1px solid ${T.warningBd}`,
            borderRadius: 6,
            marginBottom: 20,
            fontSize: 13,
            color: T.warning,
            fontWeight: 600,
            fontFamily: T.font,
          }}
        >
          {inTransit} shipment{inTransit > 1 ? "s" : ""} currently in transit
        </div>
      )}

      {/* Search + underline filter tabs */}
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
            borderBottom: `2px solid ${T.ink150}`,
            gap: 0,
          }}
        >
          {FILTER_TABS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "none",
                borderBottom:
                  filter === f.key
                    ? `2px solid ${T.accent}`
                    : "2px solid transparent",
                fontFamily: T.font,
                fontSize: 11,
                fontWeight: filter === f.key ? 700 : 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: filter === f.key ? T.accent : T.ink400,
                cursor: "pointer",
                marginBottom: -2,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.ink400,
            marginLeft: "auto",
            fontFamily: T.font,
          }}
        >
          {filtered.length} shipment{filtered.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={fetchAll}
          style={{
            ...makeBtn("transparent", T.ink400),
            border: `1px solid ${T.ink150}`,
            padding: "7px 14px",
            fontSize: 11,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Card grid */}
      {loading ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: T.ink400,
            fontFamily: T.font,
          }}
        >
          Loading shipments…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            border: `1px dashed ${T.ink150}`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: T.ink700,
              marginBottom: 8,
              fontFamily: T.font,
            }}
          >
            No shipments found
          </div>
          <div
            style={{
              fontSize: 13,
              color: T.ink400,
              marginBottom: 20,
              fontFamily: T.font,
            }}
          >
            {filter === "active"
              ? "Create a shipment to start distributing to retailers."
              : `No ${filter} shipments.`}
          </div>
          {filter === "active" && (
            <button
              onClick={() => setShowCreate(true)}
              style={makeBtn(T.accentMid)}
            >
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
