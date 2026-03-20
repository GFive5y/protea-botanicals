// src/components/hq/HQDocuments.js
// v2.3 — WP-VISUAL: T tokens, Inter font, no Cormorant/Jost
// v2.2 — WP-GUIDE-C+: usePageContext 'documents' wired + WorkflowGuide added
// v2.1 — Shipping line detection: after AI extraction, client-side scan of line_items
//         for shipping/freight/handling keywords. If found and a linked PO exists,
//         auto-injects a proposed "update_po_shipping" update into extracted_data.
// v2.0 — Fix: create_supplier_product action now also creates inventory_item + stock_movement
// v1.9 — Inline supplier creation
// v1.8 — Fix: update_batch_coa resolves batch UUID by batch_number when record_id null
// v1.7 — initialDocId prop for external navigation from AdminBatchManager
// v1.6 — Delivery Note → Auto-receive inventory

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";

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

// Legacy colour aliases — keeps every C.xxx reference working unchanged
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.ink050,
  white: "#ffffff",
  border: T.ink150,
  muted: T.ink400,
  text: T.ink700,
  red: T.danger,
  lightRed: T.dangerBg,
  lightGreen: T.accentLit,
  blue: T.info,
  lightBlue: T.infoBg,
  amber: T.warning,
  lightAmber: T.warningBg,
  purple: "#6c3483",
  lightPurple: "#f5eef8",
  orange: "#c0560a",
  lightOrange: "#fff4ee",
};
// F aliases — both point to Inter so all F.heading / F.body refs get Inter
const F = { heading: T.font, body: T.font };

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
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
  pending_review: { bg: T.warningBg, color: T.warning, border: T.warning },
  confirmed: { bg: T.accentLit, color: T.accentMid, border: T.accentBd },
  rejected: { bg: T.dangerBg, color: T.danger, border: T.danger },
  partially_applied: { bg: T.infoBg, color: T.info, border: T.info },
};
const STATUS_LABELS = {
  pending_review: "Pending Review",
  confirmed: "Confirmed",
  rejected: "Rejected",
  partially_applied: "Partially Applied",
};

const confidenceColor = (score) => {
  if (score === null || score === undefined) return T.ink400;
  if (score >= 0.85) return T.accentMid;
  if (score >= 0.7) return T.warning;
  return T.danger;
};
const confidencePct = (score) =>
  score !== null && score !== undefined ? `${Math.round(score * 100)}%` : "—";

// ─── SHARED STYLE HELPERS ─────────────────────────────────────────────────────
const inputStyle = {
  padding: "7px 10px",
  border: `1px solid ${T.ink150}`,
  borderRadius: 4,
  fontSize: 12,
  fontFamily: T.font,
  background: "#fff",
  color: T.ink700,
  outline: "none",
  boxSizing: "border-box",
};
const makeBtn = (bg = T.accentMid, color = "#fff", disabled = false) => ({
  padding: "7px 14px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: bg === "transparent" ? `1px solid ${T.ink150}` : "none",
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: T.font,
  opacity: disabled ? 0.6 : 1,
});

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
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
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: T.font,
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
        fontFamily: T.font,
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
          background: T.ink150,
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
          fontFamily: T.font,
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
  const lbl = (text) => (
    <label
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: T.ink400,
        fontFamily: T.font,
        display: "block",
        marginBottom: 3,
      }}
    >
      {text}
    </label>
  );

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
        background: "#f5eef8",
        borderTop: `1px solid ${T.ink150}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#6c3483",
          fontFamily: T.font,
          marginBottom: 10,
        }}
      >
        ➕ Create New Supplier
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <div>
          {lbl("Supplier Name *")}
          <input
            style={{ ...inputStyle, width: "100%", borderColor: "#6c3483" }}
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Ecogreen Analytics (Pty) Ltd"
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <div>
            {lbl("Country")}
            <input
              style={{ ...inputStyle, width: "100%" }}
              value={form.country}
              onChange={set("country")}
              placeholder="e.g. South Africa"
            />
          </div>
          <div>
            {lbl("Currency")}
            <select
              style={{ ...inputStyle, width: "100%", cursor: "pointer" }}
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
            {lbl("Contact Name")}
            <input
              style={{ ...inputStyle, width: "100%" }}
              value={form.contact_name}
              onChange={set("contact_name")}
              placeholder="Optional"
            />
          </div>
          <div>
            {lbl("Email")}
            <input
              style={{ ...inputStyle, width: "100%" }}
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
            {lbl("Phone")}
            <input
              style={{ ...inputStyle, width: "100%" }}
              value={form.phone}
              onChange={set("phone")}
              placeholder="Optional"
            />
          </div>
          <div>
            {lbl("Website")}
            <input
              style={{ ...inputStyle, width: "100%" }}
              value={form.website}
              onChange={set("website")}
              placeholder="Optional"
            />
          </div>
        </div>
        <div>
          {lbl("Notes")}
          <input
            style={{ ...inputStyle, width: "100%" }}
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
            color: T.danger,
            fontFamily: T.font,
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
            background: "#6c3483",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: T.font,
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
            color: T.ink400,
            border: `1px solid ${T.ink150}`,
            borderRadius: 4,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: T.font,
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
        border: `2px dashed ${dragOver ? T.accentMid : T.ink150}`,
        borderRadius: 6,
        padding: "20px 16px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragOver ? T.accentLit : T.ink050,
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 6 }}>📤</div>
      <div
        style={{
          fontSize: 12,
          color: T.accentMid,
          fontFamily: T.font,
          fontWeight: 600,
        }}
      >
        Drop document here
      </div>
      <div
        style={{
          fontSize: 10,
          color: T.ink400,
          marginTop: 4,
          fontFamily: T.font,
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
        background: selected ? T.accentLit : "transparent",
        borderLeft: selected
          ? `3px solid ${T.accentMid}`
          : "3px solid transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = T.ink050;
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
            color: T.ink900,
            fontFamily: T.font,
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
          color: T.ink400,
          fontFamily: T.font,
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
        <span style={{ fontSize: 9, color: T.ink400, fontFamily: T.font }}>
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

  useEffect(() => {
    const autoChecked = new Set(proposedUpdates.map((_, i) => i));
    setCheckedUpdates(autoChecked);
    setRejecting(false);
    setRejectReason("");
    setShowSupplierForm(false);
    setSupplierCreated(false);
  }, [doc.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleUpdate = (idx) =>
    setCheckedUpdates((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  const isReadOnly = doc.status !== "pending_review";

  const sectionHead = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: T.ink400,
    fontFamily: T.font,
    padding: "10px 14px 6px",
    borderBottom: `1px solid ${T.ink150}`,
    background: T.ink050,
  };
  const fieldRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 14px",
    borderBottom: `1px solid ${T.ink075}`,
    fontSize: 12,
    fontFamily: T.font,
  };

  const actionBadgeStyle = (action) => ({
    fontSize: 9,
    padding: "1px 6px",
    borderRadius: 3,
    background:
      action === "receive_delivery_item"
        ? T.accentLit
        : action === "update_batch_coa"
          ? "#f5eef8"
          : action === "update_po_shipping"
            ? C.lightOrange
            : T.infoBg,
    color:
      action === "receive_delivery_item"
        ? T.accentMid
        : action === "update_batch_coa"
          ? "#6c3483"
          : action === "update_po_shipping"
            ? C.orange
            : T.info,
    fontFamily: T.font,
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
    <div
      style={{
        width: 320,
        minWidth: 320,
        borderLeft: `1px solid ${T.ink150}`,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px",
          borderBottom: `1px solid ${T.ink150}`,
          background: T.ink050,
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
                color: T.accent,
                fontFamily: T.font,
              }}
            >
              {DOC_TYPE_LABELS[extraction.document_type] || "Document"}
            </div>
            <div style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
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
              color: T.ink400,
              fontFamily: T.font,
              marginTop: 6,
              fontStyle: "italic",
            }}
          >
            {extraction.extraction_notes}
          </div>
        )}
      </div>

      {/* Extracted fields */}
      <div style={sectionHead}>Extracted Fields</div>
      {extraction.reference?.number && (
        <div style={fieldRow}>
          <span style={{ color: T.ink400 }}>Reference</span>
          <span style={{ fontWeight: 600, color: T.ink700 }}>
            {extraction.reference.number}
          </span>
        </div>
      )}
      {extraction.reference?.date && (
        <div style={fieldRow}>
          <span style={{ color: T.ink400 }}>Date</span>
          <span style={{ color: T.ink700 }}>{extraction.reference.date}</span>
        </div>
      )}
      {extraction.currency && (
        <div style={fieldRow}>
          <span style={{ color: T.ink400 }}>Currency</span>
          <span style={{ color: T.ink700 }}>{extraction.currency}</span>
        </div>
      )}
      {extraction.total_amount != null && (
        <div style={fieldRow}>
          <span style={{ color: T.ink400 }}>Total</span>
          <span style={{ fontWeight: 600, color: T.accent }}>
            {extraction.currency} {Number(extraction.total_amount).toFixed(2)}
          </span>
        </div>
      )}

      {extraction.supplier?.matched_id ? (
        <div style={fieldRow}>
          <span style={{ color: T.ink400 }}>Supplier</span>
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
            <span style={{ color: T.ink400 }}>Supplier</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginLeft: "auto",
              }}
            >
              {supplierCreated ? (
                <span
                  style={{
                    fontSize: 10,
                    color: T.accentMid,
                    fontWeight: 600,
                    fontFamily: T.font,
                  }}
                >
                  ✅ Supplier created
                </span>
              ) : (
                !showSupplierForm && (
                  <button
                    onClick={() => setShowSupplierForm(true)}
                    style={{
                      fontSize: 9,
                      padding: "3px 8px",
                      background: "#6c3483",
                      color: "#fff",
                      border: "none",
                      borderRadius: 3,
                      cursor: "pointer",
                      fontFamily: T.font,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ➕ Add Supplier
                  </button>
                )
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

      {/* Line items */}
      {lineItems.length > 0 && (
        <>
          <div style={sectionHead}>Line Items ({lineItems.length})</div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {lineItems.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "7px 14px",
                  borderBottom: `1px solid ${T.ink075}`,
                  fontSize: 11,
                  fontFamily: T.font,
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
                        : T.ink700,
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
                    color: T.ink400,
                  }}
                >
                  <span>Qty: {item.quantity}</span>
                  {item.unit_price != null && (
                    <span>
                      {extraction.currency} {Number(item.unit_price).toFixed(3)}
                    </span>
                  )}
                  {item.matched_product_id ? (
                    <span style={{ color: T.accentMid }}>✓ matched</span>
                  ) : isShippingLine(item.description) ? (
                    <span style={{ color: C.orange }}>🚢 shipping</span>
                  ) : (
                    <span style={{ color: T.warning }}>⚠ unmatched</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Proposed updates */}
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
                  borderBottom: `1px solid ${T.ink075}`,
                  background: checkedUpdates.has(i)
                    ? update.action === "update_po_shipping"
                      ? "#fff7f2"
                      : T.accentLit
                    : "#fff",
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
                        color: T.ink700,
                        fontFamily: T.font,
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
            color: T.ink400,
            fontFamily: T.font,
            textAlign: "center",
          }}
        >
          No proposed updates extracted
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: `1px solid ${T.ink075}`,
            background: T.warningBg,
          }}
        >
          {warnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                color: T.warning,
                fontFamily: T.font,
                marginBottom: 2,
              }}
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Unknown items */}
      {unknownItems.length > 0 && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: `1px solid ${T.ink075}`,
            background: T.dangerBg,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: T.danger,
              marginBottom: 4,
              textTransform: "uppercase",
              fontFamily: T.font,
            }}
          >
            Unmatched Items
          </div>
          {unknownItems.map((u, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                color: T.danger,
                fontFamily: T.font,
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
            background: T.accentLit,
            borderTop: `1px solid ${T.ink075}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.accentMid,
              fontFamily: T.font,
            }}
          >
            ✅ Applied {doc.applied_updates.length} update
            {doc.applied_updates.length !== 1 ? "s" : ""}
          </div>
          {doc.confirmed_at && (
            <div
              style={{
                fontSize: 9,
                color: T.ink400,
                marginTop: 2,
                fontFamily: T.font,
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
            background: T.dangerBg,
            borderTop: `1px solid ${T.ink075}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.danger,
              fontFamily: T.font,
            }}
          >
            ✗ Rejected
          </div>
          {doc.rejection_reason && (
            <div
              style={{
                fontSize: 10,
                color: T.danger,
                marginTop: 2,
                fontFamily: T.font,
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
            borderTop: `1px solid ${T.ink150}`,
            background: T.ink050,
          }}
        >
          <button
            onClick={() => onReopen && onReopen()}
            style={{
              width: "100%",
              padding: 8,
              background: "transparent",
              color: T.ink400,
              border: `1px solid ${T.ink150}`,
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: T.font,
              letterSpacing: "0.07em",
            }}
          >
            ↺ Re-open for Review
          </button>
        </div>
      )}

      {/* Reject form */}
      {rejecting && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${T.ink075}`,
            background: T.dangerBg,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: T.danger,
              fontFamily: T.font,
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
              border: `1px solid ${T.danger}`,
              borderRadius: 4,
              fontSize: 11,
              fontFamily: T.font,
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
                padding: 8,
                background: T.danger,
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              Confirm Reject
            </button>
            <button
              onClick={() => setRejecting(false)}
              style={{
                padding: "8px 12px",
                background: "transparent",
                color: T.ink400,
                border: `1px solid ${T.ink150}`,
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isReadOnly && !rejecting && !showSupplierForm && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: `1px solid ${T.ink150}`,
            background: T.ink050,
          }}
        >
          {confirmError && (
            <div
              style={{
                fontSize: 10,
                color: T.danger,
                marginBottom: 8,
                fontFamily: T.font,
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
                color: T.accentMid,
                fontFamily: T.font,
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
                  background: T.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  cursor: checkedUpdates.size === 0 ? "not-allowed" : "pointer",
                  fontFamily: T.font,
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
                  color: T.danger,
                  border: `1px solid ${T.danger}`,
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: T.font,
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

  const sTh = {
    padding: "8px 12px",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: T.ink400,
    borderBottom: `2px solid ${T.ink150}`,
    textAlign: "left",
    fontFamily: T.font,
    background: T.ink075,
  };
  const sTd = {
    padding: "8px 12px",
    borderBottom: `1px solid ${T.ink075}`,
    fontSize: 12,
    fontFamily: T.font,
    color: T.ink700,
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
          style={{ ...inputStyle, width: 220 }}
          placeholder="Search supplier, filename…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={inputStyle}
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
          style={inputStyle}
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
        <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}>
          {filtered.length} records
        </span>
        <button
          onClick={exportCSV}
          style={{
            ...makeBtn("transparent", T.accentMid),
            padding: "6px 14px",
          }}
        >
          ↓ Export CSV
        </button>
      </div>
      <div
        style={{
          background: "#fff",
          border: `1px solid ${T.ink150}`,
          borderRadius: 6,
          overflowX: "auto",
          boxShadow: T.shadow,
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
                    color: T.ink400,
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
                    (e.currentTarget.style.background = T.accentLit)
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
                      <span style={{ color: T.ink400 }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: T.ink400,
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
                      <span style={{ color: T.accentMid, fontWeight: 600 }}>
                        {doc.applied_updates.length}
                      </span>
                    ) : (
                      <span style={{ color: T.ink400 }}>—</span>
                    )}
                  </td>
                  <td style={sTd}>
                    <button
                      onClick={() => onSelectDoc(doc)}
                      style={{
                        ...makeBtn("transparent", T.accentMid),
                        padding: "3px 10px",
                        fontSize: 9,
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
// MAIN COMPONENT
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

  // WP-GUIDE-C+: wire 'documents' context for WorkflowGuide live status
  const ctx = usePageContext("documents", null);

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
          .select("id,name,country,currency")
          .eq("is_active", true),
        supabase
          .from("supplier_products")
          .select("id,name,sku,category,unit_price_usd,supplier_id")
          .eq("is_active", true),
        supabase
          .from("inventory_items")
          .select("id,name,sku,category,quantity_on_hand")
          .eq("is_active", true),
        supabase
          .from("purchase_orders")
          .select("id,po_number,supplier_id,po_status,expected_arrival")
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

      // v2.1: Client-side shipping line detection
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
            const shippingLine = lines.find(
              (li) =>
                isShippingLine(li.description) &&
                Number(li.unit_price ?? 0) > 0,
            );
            const alreadyHasShippingProposal = proposals.some(
              (p) => p.action === "update_po_shipping",
            );
            if (shippingLine && !alreadyHasShippingProposal) {
              const poProposal = proposals.find(
                (p) =>
                  (p.action === "update_po_status" ||
                    p.action === "create_purchase_order") &&
                  p.record_id,
              );
              let poRecordId = poProposal?.record_id || null;
              if (!poRecordId && exData.supplier?.matched_id) {
                const ref = exData.reference?.number;
                if (ref) {
                  const { data: matchedPO } = await supabase
                    .from("purchase_orders")
                    .select("id,po_number")
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
          console.warn(
            "[HQDocuments] shipping patch failed:",
            patchErr.message,
          );
        }
      }

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
      .select("id,name")
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
          if (!poHeader.supplier_id)
            poHeader.supplier_id =
              data.supplier?.id ||
              data.supplier?.matched_id ||
              extraction.supplier?.matched_id ||
              selectedDoc.supplier_id ||
              null;
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
            } else throw poErr;
          } else newPO = insertedPO;
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
              unit_cost:
                parseFloat(data.unit_cost ?? data.unit_price ?? 0) || null,
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
            .select("id,name,sku,category,unit_price_usd,supplier_id")
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
              "[HQDocuments] inventory_item insert skipped:",
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
          const { data: poRow, error: poFetchErr } = await supabase
            .from("purchase_orders")
            .select("subtotal,usd_zar_rate,clearance_fee_usd,shipping_cost_usd")
            .eq("id", record_id)
            .single();
          if (!poFetchErr && poRow) {
            const fxR = parseFloat(poRow.usd_zar_rate) || fxRate,
              subtotal = parseFloat(poRow.subtotal) || 0;
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
        } else throw new Error(`No record_id for update action on ${table}`);
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
    <div style={{ fontFamily: T.font, position: "relative" }}>
      {/* WP-GUIDE-C+: WorkflowGuide with live documents context — PRESERVED */}
      <WorkflowGuide
        context={ctx}
        tabId="documents"
        onAction={() => {}}
        defaultOpen={true}
      />

      {/* Header */}
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
              fontFamily: T.font,
              fontSize: 22,
              fontWeight: 600,
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            Document Ingestion
          </h2>
          <div style={{ fontSize: 13, color: T.ink400, fontFamily: T.font }}>
            Upload any business document · AI extracts data · Review and confirm
            DB updates
          </div>
        </div>
        <div
          style={{
            display: "flex",
            border: `1px solid ${T.ink150}`,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {[
            { id: "review", label: "Review" },
            { id: "log", label: "History" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                padding: "8px 16px",
                border: "none",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: T.font,
                transition: "all 0.15s",
                background: view === t.id ? T.accent : "#fff",
                color: view === t.id ? "#fff" : T.ink400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Initial doc navigation banner */}
      {initialDocId && selectedDoc && (
        <div
          style={{
            padding: "10px 16px",
            background: "#f5eef8",
            border: `1px solid #6c3483`,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 12,
            color: "#6c3483",
            fontFamily: T.font,
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

      {/* Flush stat grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total Documents",
            value: documents.length,
            color: T.accent,
          },
          {
            label: "Pending Review",
            value: documents.filter((d) => d.status === "pending_review")
              .length,
            color: T.warning,
          },
          {
            label: "Confirmed",
            value: documents.filter((d) => d.status === "confirmed").length,
            color: T.accentMid,
          },
          {
            label: "Rejected",
            value: documents.filter((d) => d.status === "rejected").length,
            color: T.danger,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              padding: "14px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: s.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                fontFamily: T.font,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.ink400,
                marginTop: 6,
                fontFamily: T.font,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── HISTORY VIEW ── */}
      {view === "log" ? (
        <DocumentLogTable
          documents={documents}
          onSelectDoc={(doc) => {
            setSelectedDocId(doc.id);
            setView("review");
          }}
        />
      ) : (
        /* ── REVIEW VIEW ── */
        <div
          style={{
            display: "flex",
            border: `1px solid ${T.ink150}`,
            borderRadius: 8,
            background: "#fff",
            minHeight: 600,
            overflow: "hidden",
            boxShadow: T.shadow,
          }}
        >
          {/* Left panel */}
          <div
            style={{
              width: 220,
              minWidth: 220,
              borderRight: `1px solid ${T.ink150}`,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 10,
                borderBottom: `1px solid ${T.ink150}`,
                background: T.ink050,
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
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: T.font,
                    background: "#fff",
                    color: T.ink700,
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
                        background: T.ink150,
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
                          background: T.accentMid,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: T.font,
                      textAlign: "center",
                      color:
                        uploadState === "error"
                          ? T.danger
                          : uploadState === "done"
                            ? T.accentMid
                            : T.ink400,
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
                    color: T.ink400,
                    fontSize: 12,
                    fontFamily: T.font,
                  }}
                >
                  Loading…
                </div>
              ) : documents.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: T.ink400,
                    fontSize: 12,
                    fontFamily: T.font,
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

          {/* Centre panel */}
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
                    borderBottom: `1px solid ${T.ink150}`,
                    background: T.ink050,
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
                        color: T.ink700,
                        fontFamily: T.font,
                      }}
                    >
                      {selectedDoc.file_name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.ink400,
                        fontFamily: T.font,
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
                        color: T.info,
                        fontWeight: 600,
                        textDecoration: "none",
                        fontFamily: T.font,
                        padding: "4px 10px",
                        border: `1px solid ${T.infoBd}`,
                        borderRadius: 4,
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
                        color: T.ink400,
                        fontSize: 13,
                        fontFamily: T.font,
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
                        color: T.ink400,
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
                      <div style={{ fontSize: 13, fontFamily: T.font }}>
                        Preview unavailable
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          fontFamily: T.font,
                        }}
                      >
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
                  color: T.ink400,
                  textAlign: "center",
                  padding: 40,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: T.accent,
                    marginBottom: 8,
                    fontFamily: T.font,
                  }}
                >
                  No Document Selected
                </div>
                <div style={{ fontSize: 13, fontFamily: T.font }}>
                  Upload a document or select one from the list to review it.
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
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
                borderLeft: `1px solid ${T.ink150}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.ink400,
                fontSize: 12,
                fontFamily: T.font,
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
