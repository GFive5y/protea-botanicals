// StockReceiveModal.js — v1.0
// WP-STOCK-RECEIVE S1
// 4-step guided delivery receive flow
// Writes: stock_receipts, stock_receipt_lines, stock_movements (purchase_in)
// Updates: inventory_items (qty, weighted_avg_cost, cost_price, batch, expiry)
// AVCO: ((Qold × Aold) + (Qin × Cin)) / (Qold + Qin)

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

// ─── Theme tokens (mirrors HQStock palette) ──────────────────────────────────
const T = {
  font: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#E8E4DC",
  borderFocus: "#A89B8C",
  ink900: "#1C1A17",
  ink600: "#4A4540",
  ink400: "#8C8680",
  ink200: "#C8C3BC",
  ink150: "#DDD9D3",
  ink075: "#F0EDE8",
  accentDark: "#2D5016",
  accentMid: "#4A7C2F",
  accentLight: "#7AB648",
  accentBg: "#F0F7E8",
  danger: "#C0392B",
  dangerBg: "#FDF2F0",
  warning: "#D4820A",
  warningBg: "#FEF8EC",
  success: "#27AE60",
  successBg: "#EDFAF3",
  kpiLg: "22px",
  kpiSm: "13px",
  label: "11px",
  caption: "10px",
};

// ─── AVCO helper ─────────────────────────────────────────────────────────────
function calcNewAvco(currentQty, currentAvco, incomingQty, incomingCost) {
  const cq = parseFloat(currentQty) || 0;
  const ca = parseFloat(currentAvco) || 0;
  const iq = parseFloat(incomingQty) || 0;
  const ic = parseFloat(incomingCost) || 0;
  if (iq <= 0) return ca;
  if (cq <= 0) return ic;
  return (cq * ca + iq * ic) / (cq + iq);
}

// ─── RCV reference generator ─────────────────────────────────────────────────
function genReference() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = String(Math.floor(Math.random() * 9000) + 1000);
  return `RCV-${ymd}-${rnd}`;
}

// ─── Needs expiry? ────────────────────────────────────────────────────────────
function needsExpiry(item) {
  if (!item) return false;
  const cat = (item.category || "").toLowerCase();
  return cat === "edible" || cat === "finished_product" || cat === "food";
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepDots({ step }) {
  const steps = ["Delivery Info", "Add Items", "Review", "Complete"];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 24,
      }}
    >
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <React.Fragment key={idx}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: done
                    ? T.accentMid
                    : active
                      ? T.accentDark
                      : T.ink150,
                  color: done || active ? "#fff" : T.ink400,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: T.font,
                  transition: "background .2s",
                }}
              >
                {done ? "✓" : idx}
              </div>
              <span
                style={{
                  fontSize: "10px",
                  color: active ? T.accentDark : T.ink400,
                  fontFamily: T.font,
                  fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 4px",
                  marginBottom: 18,
                  background: done ? T.accentMid : T.ink150,
                  transition: "background .2s",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Delivery Info ───────────────────────────────────────────────────
function Step1({ data, onChange, onNext }) {
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    supabase
      .from("suppliers")
      .select("id,name")
      .order("name")
      .then(({ data: rows }) => setSuppliers(rows || []));
  }, []);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <h3
        style={{
          margin: "0 0 18px",
          fontSize: "16px",
          fontFamily: T.font,
          fontWeight: 700,
          color: T.ink900,
        }}
      >
        Delivery Information
      </h3>

      <label style={labelStyle}>Supplier</label>
      <select
        value={data.supplier_id}
        onChange={(e) => onChange("supplier_id", e.target.value)}
        style={inputStyle}
      >
        <option value="">— Select supplier —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <label style={labelStyle}>
        Received Date <span style={{ color: T.danger }}>*</span>
      </label>
      <input
        type="date"
        value={data.received_at}
        max={today}
        onChange={(e) => onChange("received_at", e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Invoice Number</label>
      <input
        type="text"
        placeholder="e.g. INV-2024-0042"
        value={data.invoice_number}
        onChange={(e) => onChange("invoice_number", e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Reference</label>
      <input
        type="text"
        placeholder="Internal reference (optional)"
        value={data.reference}
        onChange={(e) => onChange("reference", e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Notes</label>
      <textarea
        rows={3}
        placeholder="Delivery condition, driver, temperature, etc."
        value={data.notes}
        onChange={(e) => onChange("notes", e.target.value)}
        style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
      />

      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}
      >
        <button
          onClick={onNext}
          disabled={!data.received_at}
          style={primaryBtn(!!data.received_at)}
        >
          Next: Add Items →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Add Items ───────────────────────────────────────────────────────
function Step2({
  lines,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onNext,
  onBack,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select(
          "id,name,sku,brand,category,quantity_on_hand,weighted_avg_cost,cost_price,expiry_date,batch_lot_number",
        )
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`)
        .eq("is_active", true)
        .limit(10);
      setResults(data || []);
      setSearching(false);
    }, 280);
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  function addItem(item) {
    // Don't add duplicates
    if (lines.find((l) => l.item_id === item.id)) {
      setQuery("");
      setResults([]);
      return;
    }
    const avco = calcNewAvco(
      item.quantity_on_hand,
      item.weighted_avg_cost,
      1,
      item.cost_price || 0,
    );
    onAddLine({
      item_id: item.id,
      item: item,
      qty_received: "",
      cost_per_unit: item.cost_price ? String(item.cost_price) : "",
      batch_lot: item.batch_lot_number || "",
      expiry_date: item.expiry_date || "",
      preview_avco: avco,
    });
    setQuery("");
    setResults([]);
  }

  function updateLineField(idx, field, value) {
    const line = lines[idx];
    let preview_avco = line.preview_avco;
    if (field === "qty_received" || field === "cost_per_unit") {
      const qty =
        field === "qty_received"
          ? parseFloat(value)
          : parseFloat(line.qty_received);
      const cost =
        field === "cost_per_unit"
          ? parseFloat(value)
          : parseFloat(line.cost_per_unit);
      preview_avco = calcNewAvco(
        line.item.quantity_on_hand,
        line.item.weighted_avg_cost,
        qty,
        cost,
      );
    }
    onUpdateLine(idx, { ...line, [field]: value, preview_avco });
  }

  const canProceed =
    lines.length > 0 &&
    lines.every((l) => l.qty_received && parseFloat(l.qty_received) > 0);

  return (
    <div>
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: "16px",
          fontFamily: T.font,
          fontWeight: 700,
          color: T.ink900,
        }}
      >
        Add Items
      </h3>
      <p
        style={{
          margin: "0 0 16px",
          fontSize: "12px",
          color: T.ink400,
          fontFamily: T.font,
        }}
      >
        Search by item name, SKU, or brand. Add all items in this delivery.
      </p>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input
          type="text"
          placeholder="🔍  Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0, paddingRight: 36 }}
        />
        {searching && (
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "11px",
              color: T.ink400,
              fontFamily: T.font,
            }}
          >
            …
          </span>
        )}
        {results.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 50,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {results.map((item) => (
              <div
                key={item.id}
                onClick={() => addItem(item)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${T.ink075}`,
                  fontFamily: T.font,
                  transition: "background .1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = T.accentBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{ fontSize: "13px", fontWeight: 600, color: T.ink900 }}
                >
                  {item.name}
                </div>
                <div
                  style={{ fontSize: "11px", color: T.ink400, marginTop: 2 }}
                >
                  {item.sku} · {item.brand} · {item.category} ·{" "}
                  <span
                    style={{
                      color: item.quantity_on_hand < 0 ? T.danger : T.ink400,
                    }}
                  >
                    {item.quantity_on_hand ?? 0} on hand
                  </span>
                  {item.weighted_avg_cost
                    ? ` · AVCO R${Number(item.weighted_avg_cost).toFixed(2)}`
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lines */}
      {lines.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 0",
            color: T.ink400,
            fontSize: "13px",
            fontFamily: T.font,
            background: T.ink075,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          No items added yet. Search above to add delivery lines.
        </div>
      )}

      {lines.map((line, idx) => (
        <div
          key={line.item_id}
          style={{
            background: T.ink075,
            borderRadius: 6,
            padding: "12px 14px",
            marginBottom: 10,
            position: "relative",
          }}
        >
          {/* Item header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: T.ink900,
                  fontFamily: T.font,
                }}
              >
                {line.item.name}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: T.ink400,
                  fontFamily: T.font,
                  marginTop: 2,
                }}
              >
                {line.item.sku} · {line.item.category} ·{" "}
                {line.item.quantity_on_hand ?? 0} on hand
              </div>
            </div>
            <button
              onClick={() => onRemoveLine(idx)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.danger,
                fontSize: "16px",
                lineHeight: 1,
                padding: 4,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>
                Qty Received <span style={{ color: T.danger }}>*</span>
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                placeholder="0"
                value={line.qty_received}
                onChange={(e) =>
                  updateLineField(idx, "qty_received", e.target.value)
                }
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>
                Cost Per Unit (R)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={line.cost_per_unit}
                onChange={(e) =>
                  updateLineField(idx, "cost_per_unit", e.target.value)
                }
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>
                Batch / Lot
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={line.batch_lot}
                onChange={(e) =>
                  updateLineField(idx, "batch_lot", e.target.value)
                }
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
            {needsExpiry(line.item) && (
              <div>
                <label style={{ ...labelStyle, marginBottom: 4 }}>
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={line.expiry_date}
                  onChange={(e) =>
                    updateLineField(idx, "expiry_date", e.target.value)
                  }
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
              </div>
            )}
          </div>

          {/* AVCO preview */}
          {line.qty_received && line.cost_per_unit && (
            <div
              style={{
                background: T.accentBg,
                border: `1px solid ${T.accentLight}40`,
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: "11px",
                color: T.accentDark,
                fontFamily: T.font,
                display: "flex",
                gap: 16,
              }}
            >
              <span>
                New AVCO: <strong>R{line.preview_avco.toFixed(2)}</strong>
              </span>
              <span>
                Line total:{" "}
                <strong>
                  R
                  {(
                    parseFloat(line.qty_received || 0) *
                    parseFloat(line.cost_per_unit || 0)
                  ).toFixed(2)}
                </strong>
              </span>
              <span>
                New on-hand:{" "}
                <strong>
                  {(
                    parseFloat(line.item.quantity_on_hand || 0) +
                    parseFloat(line.qty_received || 0)
                  ).toFixed(3)}
                </strong>
              </span>
            </div>
          )}
        </div>
      ))}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        <button onClick={onBack} style={ghostBtn}>
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          style={primaryBtn(canProceed)}
        >
          Next: Review →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 — Review & Confirm ────────────────────────────────────────────────
function Step3({ deliveryInfo, lines, onConfirm, onBack, saving }) {
  const totalValue = lines.reduce((sum, l) => {
    return (
      sum + parseFloat(l.qty_received || 0) * parseFloat(l.cost_per_unit || 0)
    );
  }, 0);

  return (
    <div>
      <h3
        style={{
          margin: "0 0 4px",
          fontSize: "16px",
          fontFamily: T.font,
          fontWeight: 700,
          color: T.ink900,
        }}
      >
        Review Delivery
      </h3>
      <p
        style={{
          margin: "0 0 16px",
          fontSize: "12px",
          color: T.ink400,
          fontFamily: T.font,
        }}
      >
        Confirm all quantities and costs are correct before posting.
      </p>

      {/* Delivery meta */}
      <div
        style={{
          background: T.ink075,
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: "12px",
          fontFamily: T.font,
          color: T.ink600,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 16px",
        }}
      >
        <span>
          <strong>Date:</strong> {deliveryInfo.received_at}
        </span>
        {deliveryInfo.invoice_number && (
          <span>
            <strong>Invoice:</strong> {deliveryInfo.invoice_number}
          </span>
        )}
        {deliveryInfo.reference && (
          <span>
            <strong>Ref:</strong> {deliveryInfo.reference}
          </span>
        )}
        {deliveryInfo.notes && (
          <span style={{ gridColumn: "1/-1" }}>
            <strong>Notes:</strong> {deliveryInfo.notes}
          </span>
        )}
      </div>

      {/* Lines table */}
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            fontFamily: T.font,
          }}
        >
          <thead>
            <tr style={{ background: T.ink075 }}>
              {[
                "Item",
                "Qty",
                "Cost/Unit",
                "New AVCO",
                "New On-Hand",
                "Line Total",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    color: T.ink400,
                    fontWeight: 600,
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const newAvco = calcNewAvco(
                line.item.quantity_on_hand,
                line.item.weighted_avg_cost,
                parseFloat(line.qty_received),
                parseFloat(line.cost_per_unit),
              );
              const lineTotal =
                parseFloat(line.qty_received || 0) *
                parseFloat(line.cost_per_unit || 0);
              const newOnHand =
                parseFloat(line.item.quantity_on_hand || 0) +
                parseFloat(line.qty_received || 0);
              return (
                <tr
                  key={line.item_id}
                  style={{
                    borderBottom: `1px solid ${T.ink075}`,
                    background: i % 2 === 0 ? T.surface : T.ink075 + "60",
                  }}
                >
                  <td style={{ padding: "9px 10px" }}>
                    <div style={{ fontWeight: 600, color: T.ink900 }}>
                      {line.item.name}
                    </div>
                    <div style={{ fontSize: "10px", color: T.ink400 }}>
                      {line.item.sku}
                    </div>
                  </td>
                  <td style={{ padding: "9px 10px", color: T.ink900 }}>
                    {line.qty_received}
                  </td>
                  <td style={{ padding: "9px 10px", color: T.ink900 }}>
                    R{parseFloat(line.cost_per_unit || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <span style={{ color: T.accentDark, fontWeight: 600 }}>
                      R{newAvco.toFixed(2)}
                    </span>
                    <div style={{ fontSize: "10px", color: T.ink400 }}>
                      was R
                      {parseFloat(line.item.weighted_avg_cost || 0).toFixed(2)}
                    </div>
                  </td>
                  <td style={{ padding: "9px 10px", color: T.ink900 }}>
                    {newOnHand.toFixed(3)}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      fontWeight: 600,
                      color: T.ink900,
                    }}
                  >
                    R{lineTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${T.border}` }}>
              <td
                colSpan={5}
                style={{
                  padding: "10px 10px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: T.ink600,
                  fontSize: "13px",
                  fontFamily: T.font,
                }}
              >
                Total Delivery Value:
              </td>
              <td
                style={{
                  padding: "10px 10px",
                  fontWeight: 700,
                  color: T.accentDark,
                  fontSize: "15px",
                }}
              >
                R{totalValue.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Warning */}
      <div
        style={{
          background: T.warningBg,
          border: `1px solid ${T.warning}40`,
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 20,
          fontSize: "12px",
          color: T.warning,
          fontFamily: T.font,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "16px" }}>⚠️</span>
        <span>
          <strong>This action cannot be undone.</strong> Posting will update
          stock levels, recalculate AVCO, and write permanent stock movement
          records. Verify all quantities and costs before confirming.
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={onBack} style={ghostBtn} disabled={saving}>
          ← Back
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          style={primaryBtn(!saving)}
        >
          {saving ? "Posting…" : "✓ Confirm & Post Delivery"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4 — Complete ────────────────────────────────────────────────────────
function Step4({ receiptRef, lines, totalValue, deliveryInfo, onClose }) {
  const printRef = useRef();

  function handlePrint() {
    const w = window.open("", "_blank", "width=800,height=600");
    w.document.write(`
      <html><head><title>Receipt ${receiptRef}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; font-size: 12px; }
        h2 { margin: 0 0 4px; font-size: 18px; }
        .meta { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .total { font-weight: bold; font-size: 14px; text-align: right; padding: 12px 8px 0; }
      </style></head><body>
      <h2>Stock Receipt</h2>
      <div class="meta">
        <strong>${receiptRef}</strong><br/>
        Date: ${deliveryInfo.received_at}
        ${deliveryInfo.invoice_number ? ` · Invoice: ${deliveryInfo.invoice_number}` : ""}
        ${deliveryInfo.reference ? ` · Ref: ${deliveryInfo.reference}` : ""}
      </div>
      <table>
        <thead><tr>
          <th>Item</th><th>SKU</th><th>Qty</th><th>Cost/Unit</th><th>Total</th>
        </tr></thead>
        <tbody>
          ${lines
            .map(
              (l) => `<tr>
            <td>${l.item.name}</td>
            <td>${l.item.sku}</td>
            <td>${l.qty_received}</td>
            <td>R${parseFloat(l.cost_per_unit || 0).toFixed(2)}</td>
            <td>R${(parseFloat(l.qty_received || 0) * parseFloat(l.cost_per_unit || 0)).toFixed(2)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <div class="total">Total: R${totalValue.toFixed(2)}</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: T.successBg,
          border: `2px solid ${T.success}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: "28px",
        }}
      >
        ✓
      </div>

      <h3
        style={{
          margin: "0 0 6px",
          fontSize: "18px",
          fontFamily: T.font,
          fontWeight: 700,
          color: T.ink900,
        }}
      >
        Delivery Posted
      </h3>
      <p
        style={{
          margin: "0 0 20px",
          fontSize: "13px",
          color: T.ink400,
          fontFamily: T.font,
        }}
      >
        Stock levels, AVCO, and movement records have been updated.
      </p>

      <div
        style={{
          background: T.accentBg,
          border: `1px solid ${T.accentLight}40`,
          borderRadius: 8,
          padding: "16px 24px",
          display: "inline-block",
          marginBottom: 24,
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontFamily: T.font,
            color: T.ink400,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 4,
          }}
        >
          Receipt Reference
        </div>
        <div
          style={{
            fontSize: "20px",
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            color: T.accentDark,
            letterSpacing: "0.05em",
          }}
        >
          {receiptRef}
        </div>
        <div
          style={{
            fontSize: "11px",
            fontFamily: T.font,
            color: T.ink400,
            marginTop: 6,
          }}
        >
          {lines.length} item{lines.length !== 1 ? "s" : ""} ·{" "}
          <strong>R{totalValue.toFixed(2)}</strong> total ·{" "}
          {deliveryInfo.received_at}
        </div>
      </div>

      {/* Summary lines */}
      <div style={{ marginBottom: 24 }}>
        {lines.map((l) => {
          const lineTotal =
            parseFloat(l.qty_received || 0) * parseFloat(l.cost_per_unit || 0);
          return (
            <div
              key={l.item_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${T.ink075}`,
                fontSize: "12px",
                fontFamily: T.font,
              }}
            >
              <span style={{ color: T.ink900 }}>{l.item.name}</span>
              <span style={{ color: T.ink600 }}>
                {l.qty_received} × R
                {parseFloat(l.cost_per_unit || 0).toFixed(2)} = R
                {lineTotal.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={handlePrint} style={{ ...ghostBtn, fontSize: "12px" }}>
          🖨 Print Receipt
        </button>
        <button onClick={onClose} style={primaryBtn(true)}>
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#4A4540",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
  fontFamily: "'Inter', sans-serif",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  fontSize: "13px",
  border: "1px solid #DDD9D3",
  borderRadius: 4,
  fontFamily: "'Inter', sans-serif",
  color: "#1C1A17",
  background: "#FFFFFF",
  marginBottom: 14,
  outline: "none",
  transition: "border-color .15s",
};

function primaryBtn(enabled) {
  return {
    padding: "8px 20px",
    background: enabled ? "#4A7C2F" : "#C8C3BC",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    fontFamily: "'Inter', sans-serif",
    transition: "background .15s",
  };
}

const ghostBtn = {
  padding: "8px 16px",
  background: "transparent",
  color: "#4A4540",
  border: "1px solid #DDD9D3",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "13px",
  fontFamily: "'Inter', sans-serif",
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function StockReceiveModal({ onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [deliveryInfo, setDeliveryInfo] = useState({
    supplier_id: "",
    received_at: new Date().toISOString().split("T")[0],
    invoice_number: "",
    reference: "",
    notes: "",
  });

  const [lines, setLines] = useState([]);
  const [receiptRef, setReceiptRef] = useState("");
  const [totalValue, setTotalValue] = useState(0);

  function updateDelivery(field, value) {
    setDeliveryInfo((prev) => ({ ...prev, [field]: value }));
  }

  function addLine(line) {
    setLines((prev) => [...prev, line]);
  }

  function updateLine(idx, line) {
    setLines((prev) => prev.map((l, i) => (i === idx ? line : l)));
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function confirm() {
    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get tenant_id
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      const tenant_id = profile?.tenant_id;
      const ref = genReference();

      const tv = lines.reduce(
        (sum, l) =>
          sum +
          parseFloat(l.qty_received || 0) * parseFloat(l.cost_per_unit || 0),
        0,
      );

      // 1. Insert stock_receipt
      const { data: receipt, error: receiptErr } = await supabase
        .from("stock_receipts")
        .insert({
          tenant_id,
          supplier_id: deliveryInfo.supplier_id || null,
          reference: ref,
          invoice_number: deliveryInfo.invoice_number || null,
          received_at: new Date(deliveryInfo.received_at).toISOString(),
          received_by: user.id,
          notes: deliveryInfo.notes || null,
          total_value_zar: tv,
          status: "confirmed",
        })
        .select("id")
        .single();

      if (receiptErr) throw receiptErr;

      // 2. For each line: write movement FIRST, then update inventory_items
      for (const line of lines) {
        const qty = parseFloat(line.qty_received);
        const cost = parseFloat(line.cost_per_unit || 0);
        const item = line.item;

        const newAvco = calcNewAvco(
          item.quantity_on_hand,
          item.weighted_avg_cost,
          qty,
          cost,
        );
        const newQty = parseFloat(item.quantity_on_hand || 0) + qty;

        // a) stock_movements (purchase_in)
        const { error: movErr } = await supabase
          .from("stock_movements")
          .insert({
            tenant_id,
            item_id: line.item_id,
            movement_type: "purchase_in",
            quantity: qty,
            unit_cost: cost,
            reference: ref,
            notes: `Receipt ${ref}${deliveryInfo.invoice_number ? " · " + deliveryInfo.invoice_number : ""}`,
          });
        if (movErr) throw movErr;

        // b) update inventory_items
        const updatePayload = {
          quantity_on_hand: newQty,
          weighted_avg_cost: newAvco,
          cost_price: cost > 0 ? cost : item.cost_price,
        };
        if (line.batch_lot) updatePayload.batch_lot_number = line.batch_lot;
        if (line.expiry_date) updatePayload.expiry_date = line.expiry_date;

        const { error: itemErr } = await supabase
          .from("inventory_items")
          .update(updatePayload)
          .eq("id", line.item_id);
        if (itemErr) throw itemErr;

        // c) stock_receipt_lines
        const { error: lineErr } = await supabase
          .from("stock_receipt_lines")
          .insert({
            receipt_id: receipt.id,
            item_id: line.item_id,
            qty_received: qty,
            cost_per_unit: cost,
            batch_lot: line.batch_lot || null,
            expiry_date: line.expiry_date || null,
            new_avco: newAvco,
          });
        if (lineErr) throw lineErr;
      }

      setReceiptRef(ref);
      setTotalValue(tv);
      setStep(4);
    } catch (err) {
      console.error("StockReceiveModal confirm error:", err);
      setError(err.message || "Failed to post delivery. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(28,26,23,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 4) onClose();
      }}
    >
      <div
        style={{
          background: T.surface,
          borderRadius: 10,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
          padding: "28px 28px 24px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontFamily: T.font,
                color: T.ink400,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 2,
              }}
            >
              WP-STOCK-RECEIVE
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontFamily: T.font,
                fontWeight: 800,
                color: T.ink900,
              }}
            >
              📦 Receive Delivery
            </h2>
          </div>
          {step !== 4 && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "20px",
                color: T.ink400,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ×
            </button>
          )}
        </div>

        <StepDots step={step} />

        {error && (
          <div
            style={{
              background: T.dangerBg,
              border: `1px solid ${T.danger}40`,
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: "12px",
              color: T.danger,
              fontFamily: T.font,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {step === 1 && (
          <Step1
            data={deliveryInfo}
            onChange={updateDelivery}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            lines={lines}
            onAddLine={addLine}
            onUpdateLine={updateLine}
            onRemoveLine={removeLine}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3
            deliveryInfo={deliveryInfo}
            lines={lines}
            onConfirm={confirm}
            onBack={() => setStep(2)}
            saving={saving}
          />
        )}
        {step === 4 && (
          <Step4
            receiptRef={receiptRef}
            lines={lines}
            totalValue={totalValue}
            deliveryInfo={deliveryInfo}
            onClose={onComplete || onClose}
          />
        )}
      </div>
    </div>
  );
}
