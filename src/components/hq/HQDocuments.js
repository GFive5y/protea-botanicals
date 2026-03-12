// src/components/hq/HQDocuments.js
// v2.1 — Shipping line detection: after AI extraction, client-side scan of line_items
//         for shipping/freight/handling keywords. If found and a linked PO exists,
//         auto-injects a proposed "update_po_shipping" update into extracted_data.
//         handleConfirm now handles update_po_shipping: writes shipping_cost_usd,
//         shipping_mode, and recalculates landed_cost_zar on the purchase_order.
//         ActionBadge + label updated for new action type (orange ship icon).
// v2.0 — Fix: create_supplier_product action now also creates inventory_item + stock_movement
// v1.9 — Inline supplier creation
// v1.8 — Fix: update_batch_coa resolves batch UUID by batch_number when record_id null
// v1.7 — initialDocId prop for external navigation from AdminBatchManager
// v1.6 — Delivery Note → Auto-receive inventory

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  white: "#ffffff",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  lightGreen: "#eafaf1",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  amber: "#d4830a",
  lightAmber: "#fff8ee",
  purple: "#6c3483",
  lightPurple: "#f5eef8",
  orange: "#c0560a",
  lightOrange: "#fff4ee",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ── Shipping keyword detection ────────────────────────────────────────────────
const SHIPPING_KEYWORDS = [
  "shipping",
  "freight",
  "handling",
  "delivery",
  "postage",
  "courier",
  "transport",
  "carriage",
  "dispatch",
  "forwarding",
];
const isShippingLine = (description = "") => {
  const d = description.toLowerCase();
  return SHIPPING_KEYWORDS.some((kw) => d.includes(kw));
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const detectTypeFromName = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("invoice") || n.includes("inv-") || n.includes("inv_"))
    return "invoice";
  if (n.includes("quote") || n.includes("proforma") || n.includes("pro-forma"))
    return "quote";
  if (n.includes("pop") || n.includes("payment") || n.includes("proof"))
    return "proof_of_payment";
  if (
    n.includes("delivery") ||
    n.includes("del-") ||
    n.includes("docket") ||
    n.includes("waybill")
  )
    return "delivery_note";
  if (
    n.includes("coa") ||
    n.includes("lab") ||
    n.includes("certificate") ||
    n.includes("test")
  )
    return "coa";
  if (
    n.includes("pricelist") ||
    n.includes("price-list") ||
    n.includes("price_list")
  )
    return "price_list";
  if (n.includes("stock") || n.includes("stocksheet")) return "stock_sheet";
  if (n.includes("contract") || n.includes("agreement")) return "contract";
  return "";
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const supplierCatToInventoryCat = (cat) => {
  if (cat === "terpene") return "terpene";
  if (cat === "hardware") return "hardware";
  return "raw_material";
};
const defaultUnitForCat = (cat) => {
  if (cat === "hardware" || cat === "terpene") return "pcs";
  return "g";
};

const DOC_TYPE_LABELS = {
  invoice: "Invoice",
  quote: "Quote",
  proof_of_payment: "Proof of Payment",
  delivery_note: "Delivery Note",
  coa: "COA",
  price_list: "Price List",
  stock_sheet: "Stock Sheet",
  contract: "Contract",
  unknown: "Unknown",
};
const DOC_TYPE_ICONS = {
  invoice: "🧾",
  quote: "📝",
  proof_of_payment: "💳",
  delivery_note: "📦",
  coa: "🔬",
  price_list: "💰",
  stock_sheet: "📊",
  contract: "📃",
  unknown: "📄",
};
const STATUS_COLORS = {
  pending_review: { bg: C.lightAmber, color: C.amber, border: C.amber },
  confirmed: { bg: C.lightGreen, color: C.mid, border: C.accent },
  rejected: { bg: C.lightRed, color: C.red, border: C.red },
  partially_applied: { bg: C.lightBlue, color: C.blue, border: C.blue },
};
const STATUS_LABELS = {
  pending_review: "Pending Review",
  confirmed: "Confirmed",
  rejected: "Rejected",
  partially_applied: "Partially Applied",
};

const confidenceColor = (score) => {
  if (score === null || score === undefined) return C.muted;
  if (score >= 0.85) return C.accent;
  if (score >= 0.7) return C.amber;
  return C.red;
};
const confidencePct = (score) =>
  score !== null && score !== undefined ? `${Math.round(score * 100)}%` : "—";

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending_review;
  return (
    <span
      style={{
        fontSize: 9,
        padding: "2px 8px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: F.body,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ConfidenceDot({ score }) {
  const color = confidenceColor(score);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        color,
        fontFamily: F.body,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {confidencePct(score)}
    </span>
  );
}

function ConfidenceBar({ score }) {
  const pct = score !== null ? Math.max(0, Math.round((score || 0) * 100)) : 0;
  const color = confidenceColor(score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 5,
          background: C.border,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          color,
          fontFamily: F.body,
          minWidth: 30,
          textAlign: "right",
        }}
      >
        {confidencePct(score)}
      </span>
    </div>
  );
}

function SupplierCreateForm({
  extractedName,
  extractedCurrency,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState({
    name: extractedName || "",
    country: "",
    currency: extractedCurrency || "ZAR",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 8px",
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    fontSize: 11,
    fontFamily: F.body,
    outline: "none",
    background: C.white,
  };
  const labelStyle = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: C.muted,
    fontFamily: F.body,
    display: "block",
    marginBottom: 3,
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Supplier name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, is_active: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: "12px 14px",
        background: C.lightPurple,
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.purple,
          fontFamily: F.body,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ➕ Create New Supplier
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <label style={labelStyle}>Supplier Name *</label>
          <input
            style={{ ...inputStyle, borderColor: C.purple }}
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Ecogreen Analytics (Pty) Ltd"
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <div>
            <label style={labelStyle}>Country</label>
            <input
              style={inputStyle}
              value={form.country}
              onChange={set("country")}
              placeholder="e.g. South Africa"
            />
          </div>
          <div>
            <label style={labelStyle}>Currency</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.currency}
              onChange={set("currency")}
            >
              {["ZAR", "USD", "EUR", "GBP", "CNY", "CHF"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <div>
            <label style={labelStyle}>Contact Name</label>
            <input
              style={inputStyle}
              value={form.contact_name}
              onChange={set("contact_name")}
              placeholder="Optional"
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              value={form.email}
              onChange={set("email")}
              placeholder="Optional"
            />
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              style={inputStyle}
              value={form.phone}
              onChange={set("phone")}
              placeholder="Optional"
            />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input
              style={inputStyle}
              value={form.website}
              onChange={set("website")}
              placeholder="Optional"
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <input
            style={inputStyle}
            value={form.notes}
            onChange={set("notes")}
            placeholder="Optional"
          />
        </div>
      </div>
      {error && (
        <div
          style={{
            fontSize: 10,
            color: C.red,
            fontFamily: F.body,
            marginTop: 6,
          }}
        >
          ⚠ {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2,
            padding: "8px 0",
            background: C.purple,
            color: C.white,
            border: "none",
            borderRadius: 2,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: F.body,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "✓ SAVE SUPPLIER"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            flex: 1,
            padding: "8px 0",
            background: "transparent",
            color: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: F.body,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function UploadZone({ onFileSelected, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && fileRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? C.accent : C.border}`,
        borderRadius: 4,
        padding: "20px 16px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragOver ? "#f0faf5" : C.cream,
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 6 }}>📤</div>
      <div
        style={{
          fontSize: 12,
          color: C.mid,
          fontFamily: F.body,
          fontWeight: 600,
        }}
      >
        Drop document here
      </div>
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          marginTop: 4,
          fontFamily: F.body,
        }}
      >
        PDF · JPG · PNG · WEBP · max 20MB
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleChange}
      />
    </div>
  );
}

function DocListItem({ doc, selected, onClick }) {
  const icon = DOC_TYPE_ICONS[doc.document_type] || "📄";
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        cursor: "pointer",
        borderRadius: 2,
        background: selected ? "#f0faf5" : "transparent",
        borderLeft: selected
          ? `3px solid ${C.accent}`
          : "3px solid transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "#f8fdf9";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.text,
            fontFamily: F.body,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.supplier_name ||
            DOC_TYPE_LABELS[doc.document_type] ||
            "Document"}
        </span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          fontFamily: F.body,
          marginBottom: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {doc.file_name}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <StatusBadge status={doc.status} />
        <span style={{ fontSize: 9, color: C.muted, fontFamily: F.body }}>
          {fmtDate(doc.uploaded_at)}
        </span>
      </div>
    </div>
  );
}

function ReviewPanel({
  doc,
  onConfirm,
  onReject,
  onReopen,
  onCreateSupplier,
  confirming,
  confirmed,
  error: confirmError,
}) {
  const [checkedUpdates, setCheckedUpdates] = useState(new Set());
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierCreated, setSupplierCreated] = useState(false);

  const extraction = doc.extracted_data || {};
  const lineItems = extraction.line_items || [];
  const proposedUpdates = extraction.proposed_updates || [];
  const unknownItems = extraction.unknown_items || [];
  const warnings = extraction.warnings || [];
  const supplierUnmatched =
    extraction.supplier?.name && !extraction.supplier?.matched_id;

  useEffect(() => {
    const autoChecked = new Set(proposedUpdates.map((_, i) => i));
    setCheckedUpdates(autoChecked);
    setRejecting(false);
    setRejectReason("");
    setShowSupplierForm(false);
    setSupplierCreated(false);
  }, [doc.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleUpdate = (idx) => {
    setCheckedUpdates((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const isReadOnly = doc.status !== "pending_review";

  const panelStyle = {
    width: 320,
    minWidth: 320,
    borderLeft: `1px solid ${C.border}`,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    background: C.white,
  };
  const sectionHead = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    color: C.muted,
    fontFamily: F.body,
    padding: "10px 14px 6px",
    borderBottom: `1px solid ${C.border}`,
    background: C.cream,
  };
  const fieldRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 14px",
    borderBottom: `1px solid ${C.border}`,
    fontSize: 12,
    fontFamily: F.body,
  };

  // v2.1: added update_po_shipping styling
  const actionBadgeStyle = (action) => ({
    fontSize: 9,
    padding: "1px 6px",
    borderRadius: 2,
    background:
      action === "receive_delivery_item"
        ? C.lightGreen
        : action === "update_batch_coa"
          ? C.lightPurple
          : action === "update_po_shipping"
            ? C.lightOrange
            : C.lightBlue,
    color:
      action === "receive_delivery_item"
        ? C.mid
        : action === "update_batch_coa"
          ? C.purple
          : action === "update_po_shipping"
            ? C.orange
            : C.blue,
    fontFamily: F.body,
    letterSpacing: "0.05em",
  });

  const actionBadgeLabel = (action, table) => {
    if (action === "receive_delivery_item") return "📦 " + table;
    if (action === "update_batch_coa") return "🔬 " + table;
    if (action === "update_po_status") return "🔄 " + table;
    if (action === "create_supplier_product") return "➕ " + table;
    if (action === "update_po_shipping") return "🚢 Shipping Cost";
    return table;
  };

  const handleSupplierSave = async (supplierData) => {
    await onCreateSupplier(doc.id, supplierData);
    setShowSupplierForm(false);
    setSupplierCreated(true);
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div
        style={{
          padding: "14px",
          borderBottom: `1px solid ${C.border}`,
          background: C.cream,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>
            {DOC_TYPE_ICONS[extraction.document_type] || "📄"}
          </span>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.green,
                fontFamily: F.body,
              }}
            >
              {DOC_TYPE_LABELS[extraction.document_type] || "Document"}
            </div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: F.body }}>
              {extraction.supplier?.name || "Unknown supplier"}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <StatusBadge status={doc.status} />
          </div>
        </div>
        <ConfidenceBar score={extraction.confidence} />
        {extraction.extraction_notes && (
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              fontFamily: F.body,
              marginTop: 6,
              fontStyle: "italic",
            }}
          >
            {extraction.extraction_notes}
          </div>
        )}
      </div>

      {/* Extracted Fields */}
      <div style={sectionHead}>Extracted Fields</div>
      {extraction.reference?.number && (
        <div style={fieldRow}>
          <span style={{ color: C.muted }}>Reference</span>
          <span style={{ fontWeight: 600, color: C.text }}>
            {extraction.reference.number}
          </span>
        </div>
      )}
      {extraction.reference?.date && (
        <div style={fieldRow}>
          <span style={{ color: C.muted }}>Date</span>
          <span style={{ color: C.text }}>{extraction.reference.date}</span>
        </div>
      )}
      {extraction.currency && (
        <div style={fieldRow}>
          <span style={{ color: C.muted }}>Currency</span>
          <span style={{ color: C.text }}>{extraction.currency}</span>
        </div>
      )}
      {extraction.total_amount != null && (
        <div style={fieldRow}>
          <span style={{ color: C.muted }}>Total</span>
          <span style={{ fontWeight: 600, color: C.green }}>
            {extraction.currency} {Number(extraction.total_amount).toFixed(2)}
          </span>
        </div>
      )}

      {/* Supplier row */}
      {extraction.supplier?.matched_id ? (
        <div style={fieldRow}>
          <span style={{ color: C.muted }}>Supplier</span>
          <ConfidenceDot score={extraction.supplier.confidence} />
        </div>
      ) : extraction.supplier?.name ? (
        <>
          <div
            style={{
              ...fieldRow,
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            <span style={{ color: C.muted }}>Supplier</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginLeft: "auto",
              }}
            >
              {supplierCreated ? (
                <span style={{ fontSize: 10, color: C.mid, fontWeight: 600 }}>
                  ✅ Supplier created
                </span>
              ) : (
                <>
                  <span style={{ color: C.amber, fontSize: 11 }}>
                    ⚠ No match
                  </span>
                  {!showSupplierForm && (
                    <button
                      onClick={() => setShowSupplierForm(true)}
                      style={{
                        fontSize: 9,
                        padding: "3px 8px",
                        background: C.purple,
                        color: C.white,
                        border: "none",
                        borderRadius: 2,
                        cursor: "pointer",
                        fontFamily: F.body,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ➕ Add Supplier
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {showSupplierForm && (
            <SupplierCreateForm
              extractedName={extraction.supplier.name}
              extractedCurrency={extraction.currency || "ZAR"}
              onSave={handleSupplierSave}
              onCancel={() => setShowSupplierForm(false)}
            />
          )}
        </>
      ) : null}

      {/* Line Items */}
      {lineItems.length > 0 && (
        <>
          <div style={sectionHead}>Line Items ({lineItems.length})</div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {lineItems.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "7px 14px",
                  borderBottom: `1px solid ${C.border}`,
                  fontSize: 11,
                  fontFamily: F.body,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: isShippingLine(item.description)
                        ? C.orange
                        : C.text,
                      fontWeight: 500,
                      flex: 1,
                      marginRight: 6,
                    }}
                  >
                    {isShippingLine(item.description) ? "🚢 " : ""}
                    {item.description}
                  </span>
                  <ConfidenceDot score={item.confidence} />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 2,
                    color: C.muted,
                  }}
                >
                  <span>Qty: {item.quantity}</span>
                  {item.unit_price != null && (
                    <span>
                      {extraction.currency} {Number(item.unit_price).toFixed(3)}
                    </span>
                  )}
                  {item.matched_product_id ? (
                    <span style={{ color: C.accent }}>✓ matched</span>
                  ) : isShippingLine(item.description) ? (
                    <span style={{ color: C.orange }}>🚢 shipping</span>
                  ) : (
                    <span style={{ color: C.amber }}>⚠ unmatched</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Proposed Updates */}
      {proposedUpdates.length > 0 && (
        <>
          <div style={sectionHead}>
            Proposed Updates ({checkedUpdates.size}/{proposedUpdates.length}{" "}
            selected)
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {proposedUpdates.map((update, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 14px",
                  borderBottom: `1px solid ${C.border}`,
                  background: checkedUpdates.has(i)
                    ? update.action === "update_po_shipping"
                      ? "#fff7f2"
                      : "#f5fdf8"
                    : C.white,
                  opacity: isReadOnly ? 0.7 : 1,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    cursor: isReadOnly ? "default" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedUpdates.has(i)}
                    disabled={isReadOnly}
                    onChange={() => toggleUpdate(i)}
                    style={{
                      marginTop: 2,
                      cursor: isReadOnly ? "default" : "pointer",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.text,
                        fontFamily: F.body,
                        lineHeight: 1.4,
                      }}
                    >
                      {update.description}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 3,
                        alignItems: "center",
                      }}
                    >
                      <span style={actionBadgeStyle(update.action)}>
                        {actionBadgeLabel(update.action, update.table)}
                      </span>
                      <ConfidenceDot score={update.confidence} />
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </>
      )}

      {proposedUpdates.length === 0 && (
        <div
          style={{
            padding: 14,
            fontSize: 12,
            color: C.muted,
            fontFamily: F.body,
            textAlign: "center",
          }}
        >
          No proposed updates extracted
        </div>
      )}

      {warnings.length > 0 && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: `1px solid ${C.border}`,
            background: C.lightAmber,
          }}
        >
          {warnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                color: C.amber,
                fontFamily: F.body,
                marginBottom: 2,
              }}
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {unknownItems.length > 0 && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: `1px solid ${C.border}`,
            background: C.lightRed,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: C.red,
              marginBottom: 4,
              textTransform: "uppercase",
              fontFamily: F.body,
            }}
          >
            Unmatched Items
          </div>
          {unknownItems.map((u, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                color: C.red,
                fontFamily: F.body,
                marginBottom: 2,
              }}
            >
              •{" "}
              {typeof u === "object" && u !== null
                ? `${u.name || u.sku || "Unknown item"}${u.sku ? ` (${u.sku})` : ""}${u.unit_price ? ` — $${u.unit_price}` : ""}`
                : String(u)}
            </div>
          ))}
        </div>
      )}

      {/* Confirmed banner */}
      {doc.status === "confirmed" && doc.applied_updates && (
        <div
          style={{
            padding: "10px 14px",
            background: C.lightGreen,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.mid,
              fontFamily: F.body,
            }}
          >
            ✅ Applied {doc.applied_updates.length} update
            {doc.applied_updates.length !== 1 ? "s" : ""}
          </div>
          {doc.confirmed_at && (
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                marginTop: 2,
                fontFamily: F.body,
              }}
            >
              {fmtDateTime(doc.confirmed_at)}
            </div>
          )}
        </div>
      )}

      {/* Rejected banner */}
      {doc.status === "rejected" && (
        <div
          style={{
            padding: "10px 14px",
            background: C.lightRed,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.red,
              fontFamily: F.body,
            }}
          >
            ✗ Rejected
          </div>
          {doc.rejection_reason && (
            <div
              style={{
                fontSize: 10,
                color: C.red,
                marginTop: 2,
                fontFamily: F.body,
              }}
            >
              {doc.rejection_reason}
            </div>
          )}
        </div>
      )}

      {/* Re-open */}
      {(doc.status === "confirmed" ||
        doc.status === "partially_applied" ||
        doc.status === "rejected") && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${C.border}`,
            background: C.cream,
          }}
        >
          <button
            onClick={() => onReopen && onReopen()}
            style={{
              width: "100%",
              padding: "8px",
              background: "transparent",
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: F.body,
              letterSpacing: "0.1em",
            }}
          >
            ↺ Re-open for Review
          </button>
        </div>
      )}

      {/* Reject textarea */}
      {rejecting && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${C.border}`,
            background: C.lightRed,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.red,
              fontFamily: F.body,
              marginBottom: 6,
            }}
          >
            Reason for rejection:
          </div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Optional"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 8,
              border: `1px solid ${C.red}`,
              borderRadius: 2,
              fontSize: 11,
              fontFamily: F.body,
              minHeight: 60,
              resize: "vertical",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={async () => {
                await onReject(rejectReason);
                setRejecting(false);
                setRejectReason("");
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: C.red,
                color: C.white,
                border: "none",
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: F.body,
              }}
            >
              Confirm Reject
            </button>
            <button
              onClick={() => setRejecting(false)}
              style={{
                padding: "8px 12px",
                background: "transparent",
                color: C.muted,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: F.body,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm / Reject buttons */}
      {!isReadOnly && !rejecting && !showSupplierForm && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: `1px solid ${C.border}`,
            background: C.cream,
          }}
        >
          {confirmError && (
            <div
              style={{
                fontSize: 10,
                color: C.red,
                marginBottom: 8,
                fontFamily: F.body,
              }}
            >
              ⚠ {confirmError}
            </div>
          )}
          {confirmed ? (
            <div
              style={{
                textAlign: "center",
                fontSize: 12,
                color: C.mid,
                fontFamily: F.body,
                fontWeight: 600,
              }}
            >
              ✅ Updates applied successfully
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onConfirm(Array.from(checkedUpdates))}
                disabled={confirming}
                style={{
                  flex: 2,
                  padding: "10px 0",
                  background: C.green,
                  color: C.white,
                  border: "none",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  cursor: checkedUpdates.size === 0 ? "not-allowed" : "pointer",
                  fontFamily: F.body,
                  opacity: confirming ? 0.7 : 1,
                }}
              >
                {confirming
                  ? "Applying…"
                  : `✓ CONFIRM (${checkedUpdates.size})`}
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={confirming}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: "transparent",
                  color: C.red,
                  border: `1px solid ${C.red}`,
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: F.body,
                }}
              >
                ✗ REJECT
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentLogTable({ documents, onSelectDoc }) {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");

  const filtered = documents.filter((d) => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (filterType && d.document_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(d.file_name || "").toLowerCase().includes(q) &&
        !(d.supplier_name || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const exportCSV = () => {
    const rows = [
      [
        "Date",
        "Type",
        "Supplier",
        "File",
        "Confidence",
        "Status",
        "Applied Updates",
      ],
      ...filtered.map((d) => [
        fmtDateTime(d.uploaded_at),
        DOC_TYPE_LABELS[d.document_type] || d.document_type,
        d.supplier_name || "",
        d.file_name,
        confidencePct(d.confidence_score),
        d.status,
        d.applied_updates ? d.applied_updates.length : 0,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sInput = {
    padding: "6px 10px",
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    fontSize: 12,
    fontFamily: F.body,
    outline: "none",
    background: C.white,
  };
  const sTh = {
    padding: "8px 12px",
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: C.muted,
    borderBottom: `2px solid ${C.border}`,
    textAlign: "left",
    fontFamily: F.body,
  };
  const sTd = {
    padding: "8px 12px",
    borderBottom: `1px solid ${C.border}`,
    fontSize: 12,
    fontFamily: F.body,
    color: C.text,
    verticalAlign: "middle",
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          style={{ ...sInput, width: 220 }}
          placeholder="Search supplier, filename…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={sInput}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          style={sInput}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: C.muted, fontFamily: F.body }}>
          {filtered.length} records
        </span>
        <button
          onClick={exportCSV}
          style={{
            padding: "6px 14px",
            background: "transparent",
            color: C.mid,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: F.body,
            letterSpacing: "0.1em",
          }}
        >
          ↓ Export CSV
        </button>
      </div>
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                "Date",
                "Type",
                "Supplier",
                "File",
                "Confidence",
                "Status",
                "Applied",
                "",
              ].map((h) => (
                <th key={h} style={sTh}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    ...sTd,
                    textAlign: "center",
                    color: C.muted,
                    padding: 40,
                  }}
                >
                  No documents found
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr
                  key={doc.id}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8fdf9")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={sTd}>{fmtDateTime(doc.uploaded_at)}</td>
                  <td style={sTd}>
                    {DOC_TYPE_ICONS[doc.document_type]}{" "}
                    {DOC_TYPE_LABELS[doc.document_type]}
                  </td>
                  <td style={sTd}>
                    {doc.supplier_name || (
                      <span style={{ color: C.muted }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: C.muted,
                      fontSize: 11,
                    }}
                  >
                    {doc.file_name}
                  </td>
                  <td style={sTd}>
                    <ConfidenceDot score={doc.confidence_score} />
                  </td>
                  <td style={sTd}>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td style={{ ...sTd, textAlign: "center" }}>
                    {doc.applied_updates?.length > 0 ? (
                      <span style={{ color: C.mid, fontWeight: 600 }}>
                        {doc.applied_updates.length}
                      </span>
                    ) : (
                      <span style={{ color: C.muted }}>—</span>
                    )}
                  </td>
                  <td style={sTd}>
                    <button
                      onClick={() => onSelectDoc(doc)}
                      style={{
                        padding: "3px 10px",
                        background: "transparent",
                        color: C.mid,
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                        fontSize: 9,
                        cursor: "pointer",
                        fontFamily: F.body,
                        letterSpacing: "0.1em",
                        fontWeight: 600,
                      }}
                    >
                      Review →
                    </button>
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

// ═══════════════════════════════════════════════════════════════════════════════
export default function HQDocuments({ initialDocId = null }) {
  const [view, setView] = useState("review");
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [signedUrlLoading, setSignedUrlLoading] = useState(false);
  const [uploadState, setUploadState] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMsg, setUploadMsg] = useState("");
  const [typeHint, setTypeHint] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from("document_log")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("[HQDocuments] fetchDocuments:", err.message);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const initialDocApplied = useRef(false);
  useEffect(() => {
    if (initialDocId && !initialDocApplied.current && documents.length > 0) {
      const match = documents.find((d) => d.id === initialDocId);
      if (match) {
        setSelectedDocId(initialDocId);
        setView("review");
        initialDocApplied.current = true;
      }
    }
  }, [initialDocId, documents]);

  const fetchFreshContext = async () => {
    const [{ data: sups }, { data: prods }, { data: invs }, { data: pos }] =
      await Promise.all([
        supabase
          .from("suppliers")
          .select("id, name, country, currency")
          .eq("is_active", true),
        supabase
          .from("supplier_products")
          .select("id, name, sku, category, unit_price_usd, supplier_id")
          .eq("is_active", true),
        supabase
          .from("inventory_items")
          .select("id, name, sku, category, quantity_on_hand")
          .eq("is_active", true),
        supabase
          .from("purchase_orders")
          .select("id, po_number, supplier_id, po_status, expected_arrival")
          .in("po_status", ["ordered", "in_transit", "customs"]),
      ]);
    return {
      existing_suppliers: sups || [],
      existing_products: prods || [],
      existing_inventory: invs || [],
      open_purchase_orders: pos || [],
    };
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    setSignedUrl(null);
    setConfirmed(false);
    setConfirmError("");
    if (!selectedDoc?.file_url) return;
    setSignedUrlLoading(true);
    supabase.storage
      .from("supplier-documents")
      .createSignedUrl(selectedDoc.file_url, 3600)
      .then(({ data }) => setSignedUrl(data?.signedUrl || null))
      .catch(() => setSignedUrl(null))
      .finally(() => setSignedUrlLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocId]);

  const handleFileSelected = async (file) => {
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadState("error");
      setUploadMsg("File exceeds 20MB limit.");
      return;
    }
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowed.includes(file.type)) {
      setUploadState("error");
      setUploadMsg("Unsupported file type. Use PDF, JPG, PNG, or WEBP.");
      return;
    }

    setUploadState("uploading");
    setUploadProgress(10);
    setUploadMsg("Uploading to secure storage…");
    setConfirmError("");
    const detectedHint = typeHint || detectTypeFromName(file.name);

    try {
      const storagePath = `${detectedHint || "documents"}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("supplier-documents")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

      setUploadProgress(30);
      setUploadMsg("Loading catalogue, inventory & open POs for matching…");
      const freshContext = await fetchFreshContext();

      setUploadProgress(50);
      setUploadMsg("Extracting data with Claude Vision…");
      setUploadState("processing");
      const base64 = await fileToBase64(file);
      setUploadProgress(55);

      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "process-document",
        {
          body: {
            file_base64: base64,
            mime_type: file.type,
            file_url: storagePath,
            file_name: file.name,
            file_size_kb: Math.round(file.size / 1024),
            document_type_hint: detectedHint || null,
            context: freshContext,
          },
        },
      );

      if (fnErr) throw new Error(`Edge function error: ${fnErr.message}`);
      if (!fnData?.success)
        throw new Error(fnData?.error || "Extraction failed");

      // ── v2.1: Client-side shipping line detection ──────────────────────
      // The AI extracts line items but doesn't always propose a shipping update.
      // Scan line_items for shipping keywords. If found and a linked PO exists,
      // inject a proposed update_po_shipping action into extracted_data.
      if (fnData.document_log_id) {
        try {
          const { data: freshDoc } = await supabase
            .from("document_log")
            .select("extracted_data")
            .eq("id", fnData.document_log_id)
            .single();

          if (freshDoc?.extracted_data) {
            const exData = freshDoc.extracted_data;
            const lines = exData.line_items || [];
            const proposals = exData.proposed_updates || [];

            // Find shipping line item
            const shippingLine = lines.find(
              (li) =>
                isShippingLine(li.description) &&
                Number(li.unit_price ?? 0) > 0,
            );

            // Check if a shipping proposal already exists
            const alreadyHasShippingProposal = proposals.some(
              (p) => p.action === "update_po_shipping",
            );

            if (shippingLine && !alreadyHasShippingProposal) {
              // Find PO record_id from update_po_status proposal
              const poProposal = proposals.find(
                (p) =>
                  (p.action === "update_po_status" ||
                    p.action === "create_purchase_order") &&
                  p.record_id,
              );

              // Also check if PO matched via supplier + reference
              let poRecordId = poProposal?.record_id || null;

              if (!poRecordId && exData.supplier?.matched_id) {
                // Try to find PO by supplier + invoice reference
                const ref = exData.reference?.number;
                if (ref) {
                  const { data: matchedPO } = await supabase
                    .from("purchase_orders")
                    .select("id, po_number")
                    .eq("supplier_id", exData.supplier.matched_id)
                    .eq("po_number", ref)
                    .maybeSingle();
                  if (matchedPO) poRecordId = matchedPO.id;
                }
              }

              if (poRecordId) {
                const shippingAmt = Number(shippingLine.unit_price);
                const shippingProposal = {
                  action: "update_po_shipping",
                  table: "purchase_orders",
                  record_id: poRecordId,
                  description: `Write shipping cost to PO: ${exData.currency || "USD"} ${shippingAmt.toFixed(2)} — from "${shippingLine.description}" line on invoice`,
                  confidence: 0.95,
                  data: {
                    shipping_cost_usd: shippingAmt,
                    shipping_mode: "supplier_included",
                  },
                };
                const patchedData = {
                  ...exData,
                  proposed_updates: [...proposals, shippingProposal],
                };
                await supabase
                  .from("document_log")
                  .update({ extracted_data: patchedData })
                  .eq("id", fnData.document_log_id);
              }
            }
          }
        } catch (patchErr) {
          // Non-fatal — log but don't fail the whole upload
          console.warn(
            "[HQDocuments] shipping patch failed:",
            patchErr.message,
          );
        }
      }
      // ── end shipping detection ──────────────────────────────────────────

      setUploadProgress(90);
      setUploadMsg("Extraction complete — review below");
      setUploadState("done");
      await fetchDocuments();
      if (fnData.document_log_id) setSelectedDocId(fnData.document_log_id);
      setUploadProgress(100);
      setTimeout(() => {
        setUploadState("idle");
        setUploadMsg("");
        setUploadProgress(0);
        setTypeHint("");
      }, 2000);
    } catch (err) {
      console.error("[HQDocuments] upload error:", err.message);
      setUploadState("error");
      setUploadMsg(err.message);
      setUploadProgress(0);
    }
  };

  // ── Schema whitelists ──────────────────────────────────────────────────────
  const PO_HEADER_COLS = new Set([
    "po_number",
    "supplier_id",
    "status",
    "order_date",
    "expected_date",
    "received_date",
    "subtotal",
    "currency",
    "notes",
    "created_by",
    "shipping_mode",
    "total_weight_kg",
    "shipping_cost_usd",
    "clearance_fee_usd",
    "usd_zar_rate",
    "landed_cost_zar",
    "expected_arrival",
    "actual_arrival",
    "po_status",
    "supplier_invoice_ref",
    "source_document_id",
    "payment_date",
    "payment_reference",
  ]);
  const PO_RECEIVE_COLS = new Set([
    "po_status",
    "actual_arrival",
    "received_date",
    "notes",
  ]);
  const BATCH_COA_COLS = new Set([
    "thc_content",
    "cbd_content",
    "lab_name",
    "lab_test_date",
    "is_lab_certified",
  ]);
  const VALID_PO_STATUSES = new Set([
    "draft",
    "ordered",
    "in_transit",
    "customs",
    "received",
    "complete",
    "cancelled",
  ]);

  const normalisePOItem = (item) => ({
    supplier_product_id:
      item.supplier_product_id ||
      item.product_id ||
      item.matched_product_id ||
      item.item_id ||
      null,
    quantity_ordered: item.quantity_ordered ?? item.quantity ?? 1,
    unit_cost: item.unit_cost ?? item.unit_price_usd ?? item.unit_price ?? 0,
    ...(item.unit_price_usd != null
      ? { unit_price_usd: item.unit_price_usd ?? item.unit_price ?? 0 }
      : {}),
    ...(item.quantity_received != null
      ? { quantity_received: item.quantity_received }
      : {}),
    ...(item.landed_cost_per_unit_zar != null
      ? { landed_cost_per_unit_zar: item.landed_cost_per_unit_zar }
      : {}),
    ...(item.weight_kg != null ? { weight_kg: item.weight_kg } : {}),
    ...(item.notes ? { notes: item.notes } : {}),
  });

  const handleCreateSupplier = async (docId, supplierData) => {
    const { data: newSupplier, error: insErr } = await supabase
      .from("suppliers")
      .insert({
        name: supplierData.name.trim(),
        country: supplierData.country.trim() || null,
        currency: supplierData.currency || "ZAR",
        contact_name: supplierData.contact_name.trim() || null,
        email: supplierData.email.trim() || null,
        phone: supplierData.phone.trim() || null,
        website: supplierData.website.trim() || null,
        notes: supplierData.notes.trim() || null,
        is_active: true,
      })
      .select("id, name")
      .single();
    if (insErr) throw new Error(insErr.message);
    await supabase
      .from("document_log")
      .update({ supplier_id: newSupplier.id, supplier_name: newSupplier.name })
      .eq("id", docId);
    await fetchDocuments();
  };

  const handleConfirm = async (checkedIndices) => {
    if (!selectedDoc || checkedIndices.length === 0) return;
    setConfirming(true);
    setConfirmError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const extraction = selectedDoc.extracted_data || {};
    const proposedUpdates = extraction.proposed_updates || [];
    const lineItems = extraction.line_items || [];
    const toApply = checkedIndices
      .map((i) => proposedUpdates[i])
      .filter(Boolean);
    const appliedUpdates = [];
    const failedUpdates = [];

    const fxRate = extraction.usd_zar_rate || extraction.fx_rate || 18.5;
    const docSupplierId =
      extraction.supplier?.matched_id || selectedDoc.supplier_id || null;

    for (const update of toApply) {
      try {
        const { action, table, record_id, data } = update;
        if (!table || !data) throw new Error("Missing table or data");

        if (action === "create_purchase_order") {
          const { items, ...rawHeader } = data;
          const poHeader = Object.fromEntries(
            Object.entries(rawHeader).filter(([k]) => PO_HEADER_COLS.has(k)),
          );
          if (user?.id) poHeader.created_by = user.id;
          poHeader.source_document_id = selectedDoc.id;
          poHeader.status = "draft";
          poHeader.po_status = "draft";
          if (!poHeader.currency)
            poHeader.currency = extraction.currency || "USD";
          if (!poHeader.order_date)
            poHeader.order_date = new Date().toISOString().split("T")[0];
          if (!poHeader.po_number)
            poHeader.po_number = `PO-DOC-${Date.now().toString().slice(-8)}`;
          if (!poHeader.supplier_id) {
            poHeader.supplier_id =
              data.supplier?.id ||
              data.supplier?.matched_id ||
              extraction.supplier?.matched_id ||
              selectedDoc.supplier_id ||
              null;
          }
          if (!poHeader.supplier_id)
            throw new Error(
              "supplier_id could not be resolved — cannot insert PO without a supplier",
            );

          let newPO = null;
          const { data: insertedPO, error: poErr } = await supabase
            .from(table)
            .insert(poHeader)
            .select()
            .single();
          if (poErr) {
            if (poErr.code === "23505" && poHeader.po_number) {
              const { data: existingPO, error: fetchErr } = await supabase
                .from(table)
                .select()
                .eq("po_number", poHeader.po_number)
                .single();
              if (fetchErr || !existingPO) throw poErr;
              newPO = existingPO;
            } else {
              throw poErr;
            }
          } else {
            newPO = insertedPO;
          }

          if (items?.length && newPO?.id) {
            const poItems = items
              .map((item) => ({ ...normalisePOItem(item), po_id: newPO.id }))
              .filter((item) => item.supplier_product_id);
            if (poItems.length > 0) {
              const { error: itemsErr } = await supabase
                .from("purchase_order_items")
                .insert(poItems);
              if (itemsErr) throw itemsErr;
            }
          }
        } else if (action === "receive_delivery_item") {
          const itemId = data.item_id || record_id;
          if (!itemId)
            throw new Error("item_id required for receive_delivery_item");
          const qty = Number(data.quantity_received ?? data.quantity ?? 0);
          if (!qty || qty <= 0)
            throw new Error(
              `quantity_received must be > 0 (got ${data.quantity_received ?? data.quantity})`,
            );
          const { data: invRow, error: fetchErr } = await supabase
            .from("inventory_items")
            .select("quantity_on_hand")
            .eq("id", itemId)
            .single();
          if (fetchErr || !invRow)
            throw new Error(`inventory_items row not found for id: ${itemId}`);
          const newQty = (Number(invRow.quantity_on_hand) || 0) + qty;
          const { error: updErr } = await supabase
            .from("inventory_items")
            .update({ quantity_on_hand: newQty })
            .eq("id", itemId);
          if (updErr) throw updErr;
          const { error: movErr } = await supabase
            .from("stock_movements")
            .insert({
              item_id: itemId,
              quantity: qty,
              movement_type: "purchase_in",
              reference: selectedDoc.extracted_data?.reference?.number ?? null,
              notes: `Goods received — ${selectedDoc.file_name}`,
              performed_by: user?.id ?? null,
              tenant_id: selectedDoc.tenant_id ?? null,
            });
          if (movErr) throw movErr;
        } else if (action === "update_po_status") {
          if (!record_id)
            throw new Error("record_id required for update_po_status");
          const cleanData = Object.fromEntries(
            Object.entries(data).filter(([k]) => PO_RECEIVE_COLS.has(k)),
          );
          if (
            cleanData.po_status &&
            !VALID_PO_STATUSES.has(String(cleanData.po_status))
          )
            cleanData.po_status = "received";
          if (!cleanData.po_status) cleanData.po_status = "received";
          const { error } = await supabase
            .from("purchase_orders")
            .update(cleanData)
            .eq("id", record_id);
          if (error) throw error;
        } else if (action === "update_batch_coa") {
          let batchId = record_id;
          if (!batchId) {
            const batchNumber =
              data.batch_number ||
              data.sample_id ||
              data.sample_name ||
              extraction.reference?.number ||
              null;
            if (!batchNumber)
              throw new Error(
                "No batch_number in COA data — cannot identify which batch to update",
              );
            const { data: batchRow, error: lookupErr } = await supabase
              .from("batches")
              .select("id")
              .eq("batch_number", batchNumber)
              .maybeSingle();
            if (lookupErr) throw lookupErr;
            if (!batchRow)
              throw new Error(
                `No batch found with batch_number: ${batchNumber} — create the batch first then re-confirm`,
              );
            batchId = batchRow.id;
          }
          const batchUpdate = Object.fromEntries(
            Object.entries(data).filter(([k]) => BATCH_COA_COLS.has(k)),
          );
          batchUpdate.coa_document_id = selectedDoc.id;
          if (Object.keys(batchUpdate).length === 0)
            throw new Error("No valid COA fields to update on batch");
          const { error } = await supabase
            .from("batches")
            .update(batchUpdate)
            .eq("id", batchId);
          if (error) throw error;
        } else if (action === "create_supplier_product") {
          const { data: newProduct, error: spErr } = await supabase
            .from(table)
            .insert(data)
            .select("id, name, sku, category, unit_price_usd, supplier_id")
            .single();
          if (spErr) throw spErr;

          const productNameLower = (
            newProduct.name ||
            data.name ||
            ""
          ).toLowerCase();
          const matchingLine = lineItems.find(
            (li) =>
              !isShippingLine(li.description) &&
              ((li.description || "")
                .toLowerCase()
                .includes(productNameLower.slice(0, 20)) ||
                productNameLower.includes(
                  (li.description || "").toLowerCase().slice(0, 20),
                )),
          );
          const qty = matchingLine
            ? Number(matchingLine.quantity ?? 1)
            : Number(data.quantity ?? data.quantity_ordered ?? 1);

          const rawSku = newProduct.sku || data.sku || "";
          const invSku = rawSku
            ? `IMP-${rawSku}`
            : `IMP-${(newProduct.name || data.name || "ITEM")
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "-")
                .slice(0, 20)}`;

          const unitPriceUsd = Number(
            newProduct.unit_price_usd ?? data.unit_price_usd ?? 0,
          );
          const costPriceZar = Math.round(unitPriceUsd * fxRate * 100) / 100;
          const invCat = supplierCatToInventoryCat(
            newProduct.category || data.category || "",
          );
          const invUnit = defaultUnitForCat(invCat);
          const supplierId =
            newProduct.supplier_id || data.supplier_id || docSupplierId;

          const { data: newInvItem, error: invErr } = await supabase
            .from("inventory_items")
            .insert({
              sku: invSku,
              name: newProduct.name || data.name,
              category: invCat,
              unit: invUnit,
              quantity_on_hand: qty,
              reorder_level: 0,
              cost_price: costPriceZar,
              sell_price: 0,
              supplier_id: supplierId,
              description: `Imported from ${selectedDoc.supplier_name || "supplier"} via ${extraction.reference?.number || selectedDoc.file_name}`,
              is_active: true,
            })
            .select("id")
            .single();

          if (invErr) {
            console.warn(
              "[HQDocuments] inventory_item insert skipped (likely duplicate SKU):",
              invErr.message,
            );
          } else if (newInvItem?.id && qty > 0) {
            const { error: movErr } = await supabase
              .from("stock_movements")
              .insert({
                item_id: newInvItem.id,
                quantity: qty,
                movement_type: "purchase_in",
                reference: extraction.reference?.number ?? null,
                notes: `Received via ${extraction.reference?.number || selectedDoc.file_name} — auto-created from document ingestion`,
                performed_by: user?.id ?? null,
              });
            if (movErr)
              console.warn(
                "[HQDocuments] stock_movement insert failed:",
                movErr.message,
              );
          }

          // ── v2.1: update_po_shipping ─────────────────────────────────────
        } else if (action === "update_po_shipping") {
          if (!record_id)
            throw new Error("record_id required for update_po_shipping");

          const shippingUpdate = {};
          if (data.shipping_cost_usd != null)
            shippingUpdate.shipping_cost_usd = parseFloat(
              data.shipping_cost_usd,
            );
          if (data.clearance_fee_usd != null)
            shippingUpdate.clearance_fee_usd = parseFloat(
              data.clearance_fee_usd,
            );
          if (data.shipping_mode != null)
            shippingUpdate.shipping_mode = data.shipping_mode;

          // Fetch current PO to recalculate landed_cost_zar
          const { data: poRow, error: poFetchErr } = await supabase
            .from("purchase_orders")
            .select(
              "subtotal, usd_zar_rate, clearance_fee_usd, shipping_cost_usd",
            )
            .eq("id", record_id)
            .single();

          if (!poFetchErr && poRow) {
            const fxR = parseFloat(poRow.usd_zar_rate) || fxRate;
            const subtotal = parseFloat(poRow.subtotal) || 0;
            const newShipping =
              shippingUpdate.shipping_cost_usd != null
                ? shippingUpdate.shipping_cost_usd
                : parseFloat(poRow.shipping_cost_usd) || 0;
            const clearance =
              shippingUpdate.clearance_fee_usd != null
                ? shippingUpdate.clearance_fee_usd
                : parseFloat(poRow.clearance_fee_usd) || 0;
            shippingUpdate.landed_cost_zar =
              Math.round((subtotal + newShipping + clearance) * fxR * 100) /
              100;
          }

          const { error: poUpdErr } = await supabase
            .from("purchase_orders")
            .update(shippingUpdate)
            .eq("id", record_id);
          if (poUpdErr) throw poUpdErr;
        } else if (action === "create_batch") {
          const { error } = await supabase.from(table).insert(data);
          if (error) throw error;
        } else if (record_id) {
          const { error } = await supabase
            .from(table)
            .update(data)
            .eq("id", record_id);
          if (error) throw error;
        } else {
          throw new Error(`No record_id for update action on ${table}`);
        }

        appliedUpdates.push(update);
      } catch (err) {
        console.error("[handleConfirm] failed update:", err.message, update);
        failedUpdates.push({ update, error: err.message });
      }
    }

    let newStatus = "confirmed";
    if (failedUpdates.length > 0 && appliedUpdates.length > 0)
      newStatus = "partially_applied";
    else if (failedUpdates.length > 0 && appliedUpdates.length === 0)
      newStatus = "rejected";

    await supabase
      .from("document_log")
      .update({
        status: newStatus,
        applied_updates: appliedUpdates,
        confirmed_by: user?.id || null,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", selectedDoc.id);

    setConfirming(false);
    if (failedUpdates.length > 0) {
      setConfirmError(
        `${failedUpdates.length} update(s) failed: ${failedUpdates[0].error}`,
      );
    } else {
      setConfirmed(true);
    }
    await fetchDocuments();
  };

  const handleReject = async (reason) => {
    if (!selectedDoc) return;
    await supabase
      .from("document_log")
      .update({ status: "rejected", rejection_reason: reason || null })
      .eq("id", selectedDoc.id);
    await fetchDocuments();
  };

  const handleReopen = async () => {
    if (!selectedDoc) return;
    await supabase
      .from("document_log")
      .update({
        status: "pending_review",
        applied_updates: null,
        confirmed_by: null,
        confirmed_at: null,
        rejection_reason: null,
      })
      .eq("id", selectedDoc.id);
    setConfirmed(false);
    setConfirmError("");
    await fetchDocuments();
  };

  const isUploading =
    uploadState === "uploading" || uploadState === "processing";

  return (
    <div style={{ fontFamily: F.body, position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: F.heading,
              color: C.green,
              fontSize: 24,
              margin: 0,
            }}
          >
            Document Ingestion
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Upload any business document · AI extracts data · Review and confirm
            DB updates
          </div>
        </div>
        <div
          style={{
            display: "flex",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {[
            { id: "review", label: "📋 Review" },
            { id: "log", label: "📜 History" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                padding: "8px 16px",
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: F.body,
                transition: "all 0.15s",
                background: view === t.id ? C.green : C.white,
                color: view === t.id ? C.white : C.muted,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {initialDocId && selectedDoc && (
        <div
          style={{
            padding: "10px 16px",
            background: C.lightPurple,
            border: `1px solid ${C.purple}`,
            borderRadius: 2,
            marginBottom: 16,
            fontSize: 12,
            color: C.purple,
            fontFamily: F.body,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🔬 <strong>Navigated from Batch Manager</strong> — showing source COA
          document:&nbsp;
          <span style={{ fontWeight: 600 }}>{selectedDoc.file_name}</span>
        </div>
      )}

      <div
        style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          { label: "Total Documents", value: documents.length, color: C.green },
          {
            label: "Pending Review",
            value: documents.filter((d) => d.status === "pending_review")
              .length,
            color: C.amber,
          },
          {
            label: "Confirmed",
            value: documents.filter((d) => d.status === "confirmed").length,
            color: C.accent,
          },
          {
            label: "Rejected",
            value: documents.filter((d) => d.status === "rejected").length,
            color: C.red,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: "12px 16px",
              flex: "1 1 140px",
              minWidth: 120,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: F.heading,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 9,
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

      {view === "log" ? (
        <DocumentLogTable
          documents={documents}
          onSelectDoc={(doc) => {
            setSelectedDocId(doc.id);
            setView("review");
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            background: C.white,
            minHeight: 600,
            overflow: "hidden",
          }}
        >
          {/* LEFT PANEL */}
          <div
            style={{
              width: 220,
              minWidth: 220,
              borderRight: `1px solid ${C.border}`,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 10,
                borderBottom: `1px solid ${C.border}`,
                background: C.cream,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <select
                  value={typeHint}
                  onChange={(e) => setTypeHint(e.target.value)}
                  disabled={isUploading}
                  style={{
                    width: "100%",
                    padding: "5px 8px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    fontSize: 11,
                    fontFamily: F.body,
                    background: C.white,
                    color: C.text,
                    cursor: "pointer",
                  }}
                >
                  <option value="">Auto-detect type…</option>
                  {Object.entries(DOC_TYPE_LABELS)
                    .filter(([k]) => k !== "unknown")
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                </select>
              </div>
              <UploadZone
                onFileSelected={handleFileSelected}
                disabled={isUploading}
              />
              {uploadState !== "idle" && (
                <div style={{ marginTop: 8 }}>
                  {(uploadState === "uploading" ||
                    uploadState === "processing") && (
                    <div
                      style={{
                        height: 4,
                        background: C.border,
                        borderRadius: 2,
                        overflow: "hidden",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          width: `${uploadProgress}%`,
                          background: C.accent,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: F.body,
                      textAlign: "center",
                      color:
                        uploadState === "error"
                          ? C.red
                          : uploadState === "done"
                            ? C.mid
                            : C.muted,
                    }}
                  >
                    {uploadState === "error"
                      ? "⚠ "
                      : uploadState === "done"
                        ? "✅ "
                        : "⏳ "}
                    {uploadMsg}
                  </div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingDocs ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: C.muted,
                    fontSize: 12,
                  }}
                >
                  Loading…
                </div>
              ) : documents.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: C.muted,
                    fontSize: 12,
                  }}
                >
                  No documents yet.
                  <br />
                  Upload one above.
                </div>
              ) : (
                documents.map((doc) => (
                  <DocListItem
                    key={doc.id}
                    doc={doc}
                    selected={doc.id === selectedDocId}
                    onClick={() => setSelectedDocId(doc.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* CENTRE PANEL */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {selectedDoc ? (
              <>
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: `1px solid ${C.border}`,
                    background: C.cream,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 16 }}>
                    {DOC_TYPE_ICONS[selectedDoc.document_type]}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.text,
                        fontFamily: F.body,
                      }}
                    >
                      {selectedDoc.file_name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: C.muted,
                        fontFamily: F.body,
                      }}
                    >
                      {selectedDoc.file_size_kb
                        ? `${selectedDoc.file_size_kb} KB · `
                        : ""}
                      Uploaded {fmtDateTime(selectedDoc.uploaded_at)}
                    </div>
                  </div>
                  {signedUrl && (
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 10,
                        color: C.blue,
                        fontWeight: 600,
                        textDecoration: "none",
                        fontFamily: F.body,
                        padding: "4px 10px",
                        border: `1px solid ${C.blue}`,
                        borderRadius: 2,
                      }}
                    >
                      ↗ Open
                    </a>
                  )}
                </div>
                <div
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    background: "#f0f0f0",
                    position: "relative",
                  }}
                >
                  {signedUrlLoading ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: C.muted,
                        fontSize: 13,
                      }}
                    >
                      Loading preview…
                    </div>
                  ) : signedUrl ? (
                    selectedDoc.file_name?.toLowerCase().endsWith(".pdf") ||
                    selectedDoc.extracted_data?.document_mime_type ===
                      "application/pdf" ? (
                      <iframe
                        src={signedUrl}
                        title="Document Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                      />
                    ) : (
                      <img
                        src={signedUrl}
                        alt="Document preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          display: "block",
                          margin: "auto",
                          objectFit: "contain",
                          padding: 16,
                        }}
                      />
                    )
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: C.muted,
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
                      <div style={{ fontSize: 13 }}>Preview unavailable</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>
                        File stored securely
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.muted,
                  textAlign: "center",
                  padding: 40,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <div
                  style={{
                    fontFamily: F.heading,
                    fontSize: 20,
                    color: C.green,
                    marginBottom: 8,
                  }}
                >
                  No Document Selected
                </div>
                <div style={{ fontSize: 13 }}>
                  Upload a document or select one from the list to review it.
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          {selectedDoc ? (
            <ReviewPanel
              doc={selectedDoc}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onReopen={handleReopen}
              onCreateSupplier={handleCreateSupplier}
              confirming={confirming}
              confirmed={confirmed}
              error={confirmError}
            />
          ) : (
            <div
              style={{
                width: 320,
                minWidth: 320,
                borderLeft: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.muted,
                fontSize: 12,
                fontFamily: F.body,
                textAlign: "center",
                padding: 20,
              }}
            >
              Select a document to see extracted data and proposed updates
            </div>
          )}
        </div>
      )}
    </div>
  );
}
