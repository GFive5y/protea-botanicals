// src/components/AdminBatchManager.js
// v1.1 — WP-I: COA source document link on batch card when coa_document_id is set
// v1.0 — March 2026
// WP1 — Batch Manager
// Features:
//   - Card grid of all batches with live QR + claim stats
//   - Create batch form (slide-in panel)
//   - Auto-suggested next batch number
//   - COA PDF upload to Supabase Storage
//   - Expiry alerts (orange <30d, red = expired)
//   - Edit batch
//   - Archive batch (never delete)
//   - "Generate QR Codes" button → navigates to QR tab
//   - COA source document badge linking to document_log record (WP-I)

import React, { useState, useEffect, useCallback, useRef } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const label = (text) => ({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: 6,
  fontFamily: FONTS.body,
  display: "block",
});
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 14,
  fontFamily: FONTS.body,
  backgroundColor: C.white,
  color: C.text,
  boxSizing: "border-box",
  outline: "none",
};
const makeBtn = (bg = C.mid, color = C.white, disabled = false) => ({
  padding: "10px 20px",
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
const hint = {
  fontSize: 11,
  color: C.muted,
  marginTop: 4,
  fontFamily: FONTS.body,
};

function today() {
  return new Date().toISOString().split("T")[0];
}
function addMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function pct(a, b) {
  if (!b || b === 0) return "0";
  return ((a / b) * 100).toFixed(1);
}

// ─── Expiry Badge ─────────────────────────────────────────────────────────────
function ExpiryBadge({ expiryDate }) {
  const days = daysUntil(expiryDate);
  if (days === null) return null;
  if (days < 0)
    return (
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 20,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          backgroundColor: C.lightRed,
          color: C.red,
          border: `1px solid ${C.red}`,
        }}
      >
        EXPIRED
      </span>
    );
  if (days <= 30)
    return (
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 20,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          backgroundColor: C.lightOrange,
          color: C.orange,
          border: `1px solid ${C.orange}`,
        }}
      >
        EXPIRING {days}d
      </span>
    );
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        backgroundColor: C.lightGreen,
        color: C.mid,
        border: `1px solid ${C.accent}`,
      }}
    >
      ACTIVE
    </span>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label: l, value, color = C.green }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          fontFamily: FONTS.heading,
          color,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          fontFamily: FONTS.body,
        }}
      >
        {l}
      </div>
    </div>
  );
}

// ─── Mini progress bar ────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = C.accent }) {
  const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      style={{
        height: 4,
        backgroundColor: C.border,
        borderRadius: 2,
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pctVal}%`,
          backgroundColor: color,
          borderRadius: 2,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ─── COA Document Source Badge (WP-I) ─────────────────────────────────────────
// Shows when a batch's COA was ingested via the Document Ingestion Engine
function COADocumentBadge({ coaDocumentId, onViewInDocuments }) {
  if (!coaDocumentId) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onViewInDocuments) onViewInDocuments(coaDocumentId);
      }}
      title="This COA was ingested via the Document Engine — click to view source document"
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 20,
        backgroundColor: C.lightPurple,
        color: C.purple,
        border: `1px solid ${C.purple}`,
        fontWeight: 700,
        letterSpacing: "0.1em",
        cursor: onViewInDocuments ? "pointer" : "default",
        fontFamily: FONTS.body,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      🔬 AI INGESTED
    </button>
  );
}

// ─── Batch Card ───────────────────────────────────────────────────────────────
function BatchCard({
  batch,
  stats,
  onEdit,
  onArchive,
  onGoToQR,
  onViewDocumentSource,
}) {
  const qr = stats?.qr_count || 0;
  const claimed = stats?.claimed_count || 0;
  const activation = pct(claimed, qr);
  const days = daysUntil(batch.expiry_date);
  const cardBorder =
    days !== null && days < 0
      ? C.red
      : days !== null && days <= 30
        ? C.orange
        : C.border;

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${cardBorder}`,
        borderRadius: 2,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Header row */}
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
            {batch.product_name || "Unnamed Product"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 2,
              fontFamily: FONTS.body,
            }}
          >
            {batch.batch_number}
          </div>
        </div>
        <ExpiryBadge expiryDate={batch.expiry_date} />
      </div>

      {/* Strain / type row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: C.muted,
          fontFamily: FONTS.body,
          flexWrap: "wrap",
        }}
      >
        {batch.strain && <span>🌿 {batch.strain.replace(/-/g, " ")}</span>}
        {batch.product_type && <span>📦 {batch.product_type}</span>}
        {batch.volume && <span>💧 {batch.volume}</span>}
        {batch.thc_content && <span>⚗️ THC {batch.thc_content}%</span>}
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "12px 0",
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <StatPill
          label="Produced"
          value={batch.units_produced || "—"}
          color={C.green}
        />
        <div style={{ width: 1, background: C.border }} />
        <StatPill label="QR Codes" value={qr} color={C.blue} />
        <div style={{ width: 1, background: C.border }} />
        <StatPill label="Claimed" value={claimed} color={C.accent} />
        <div style={{ width: 1, background: C.border }} />
        <StatPill
          label="Rate %"
          value={`${activation}%`}
          color={parseFloat(activation) >= 50 ? C.accent : C.orange}
        />
      </div>

      {/* Activation bar */}
      <div>
        <div
          style={{
            fontSize: 10,
            color: C.muted,
            fontFamily: FONTS.body,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Activation Rate
        </div>
        <ProgressBar
          value={claimed}
          max={qr}
          color={parseFloat(activation) >= 50 ? C.accent : C.orange}
        />
      </div>

      {/* Dates row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: C.muted,
          fontFamily: FONTS.body,
        }}
      >
        <span>Produced: {fmtDate(batch.production_date)}</span>
        <span>Expires: {fmtDate(batch.expiry_date)}</span>
      </div>

      {/* Lab / COA row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {batch.lab_certified && (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              backgroundColor: C.lightGreen,
              color: C.mid,
              border: `1px solid ${C.accent}`,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            LAB CERTIFIED
          </span>
        )}
        {batch.organic && (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              backgroundColor: "#f0fff4",
              color: "#276749",
              border: "1px solid #276749",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            ORGANIC
          </span>
        )}
        {batch.coa_url ? (
          <a
            href={batch.coa_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              backgroundColor: C.lightBlue,
              color: C.blue,
              border: `1px solid ${C.blue}`,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textDecoration: "none",
            }}
          >
            📄 VIEW COA
          </a>
        ) : (
          <span style={{ fontSize: 10, color: C.muted }}>No COA uploaded</span>
        )}

        {/* WP-I: AI Ingested COA badge */}
        <COADocumentBadge
          coaDocumentId={batch.coa_document_id}
          onViewInDocuments={onViewDocumentSource}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <button
          onClick={() => onGoToQR(batch.id)}
          style={{
            ...makeBtn(C.mid),
            fontSize: 10,
            padding: "8px 14px",
            flex: 1,
          }}
        >
          🔲 Generate QR
        </button>
        <button
          onClick={() => onEdit(batch)}
          style={{
            ...makeBtn("transparent", C.mid),
            border: `1px solid ${C.border}`,
            fontSize: 10,
            padding: "8px 14px",
          }}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onArchive(batch)}
          style={{
            ...makeBtn("transparent", C.muted),
            border: `1px solid ${C.border}`,
            fontSize: 10,
            padding: "8px 14px",
          }}
        >
          📁 Archive
        </button>
      </div>
    </div>
  );
}

// ─── Row / Field layout helpers (must be outside BatchForm to avoid remount) ──
function Row({ children }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>{children}</div>
  );
}
function Field({ label: l, children, flex = 1 }) {
  return (
    <div style={{ flex }}>
      <span style={label(l)}>{l}</span>
      {children}
    </div>
  );
}

// ─── Create / Edit Form ───────────────────────────────────────────────────────
function BatchForm({ initial, onSave, onCancel, suggestedBatchNumber }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    batch_number: initial?.batch_number || suggestedBatchNumber || "",
    product_name: initial?.product_name || "",
    product_type: initial?.product_type || "",
    strain: initial?.strain || "",
    volume: initial?.volume || "",
    units_produced: initial?.units_produced || "",
    thc_content: initial?.thc_content || "",
    cbd_content: initial?.cbd_content || "",
    production_date: initial?.production_date || today(),
    expiry_date: initial?.expiry_date || addMonths(18),
    lab_name: initial?.lab_name || "",
    lab_test_date: initial?.lab_test_date || "",
    lab_certified: initial?.lab_certified ?? false,
    organic: initial?.organic ?? false,
    coa_url: initial?.coa_url || "",
    status: initial?.status || "active",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCOAUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadMsg("⚠ Please upload a PDF file.");
      return;
    }
    setUploading(true);
    setUploadMsg("Uploading…");
    try {
      const fileName = `${form.batch_number || "batch"}-COA-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("coa-documents")
        .upload(fileName, file, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("coa-documents")
        .getPublicUrl(fileName);
      set("coa_url", urlData.publicUrl);
      setUploadMsg("✅ COA uploaded successfully");
    } catch (err) {
      setUploadMsg(
        `⚠ Upload failed: ${err.message}. Check 'coa-documents' bucket exists in Supabase Storage.`,
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!form.batch_number.trim()) {
      setError("Batch number is required.");
      return;
    }
    if (!form.product_name.trim()) {
      setError("Product name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        units_produced: form.units_produced
          ? parseInt(form.units_produced, 10)
          : null,
        thc_content: form.thc_content ? parseFloat(form.thc_content) : null,
        cbd_content: form.cbd_content ? parseFloat(form.cbd_content) : null,
        production_date: form.production_date || null,
        expiry_date: form.expiry_date || null,
        lab_test_date: form.lab_test_date || null,
      };
      let result;
      if (isEdit) {
        const { data, error: dbErr } = await supabase
          .from("batches")
          .update(payload)
          .eq("id", initial.id)
          .select()
          .single();
        if (dbErr) throw dbErr;
        result = data;
      } else {
        const { data, error: dbErr } = await supabase
          .from("batches")
          .insert(payload)
          .select()
          .single();
        if (dbErr) throw dbErr;
        result = data;
      }
      onSave(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(560px, 100vw)",
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
          {isEdit ? "Edit Batch" : "New Batch"}
        </div>
        <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>
          {isEdit
            ? `Editing ${initial.batch_number}`
            : "All fields marked * are required"}
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
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 24 }}>
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: C.lightRed,
              border: `1px solid ${C.red}`,
              borderRadius: 2,
              color: C.red,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Section: Identity */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: C.muted,
            textTransform: "uppercase",
            marginBottom: 12,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 8,
          }}
        >
          Batch Identity
        </div>

        <Row>
          <Field label="Batch Number *" flex={1}>
            <input
              style={inputStyle}
              value={form.batch_number}
              onChange={(e) => set("batch_number", e.target.value)}
              placeholder="PB-001-2026"
            />
            <div style={hint}>
              Auto-suggested from last batch — you can edit
            </div>
          </Field>
        </Row>

        <Row>
          <Field label="Product Name *" flex={2}>
            <input
              style={inputStyle}
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
              placeholder="Protea Botanicals Premium Extract"
            />
          </Field>
          <Field label="Product Type" flex={1}>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.product_type}
              onChange={(e) => set("product_type", e.target.value)}
            >
              <option value="">— Select —</option>
              <option value="1ml Cartridge">1ml Cartridge</option>
              <option value="2ml Disposable">2ml Disposable</option>
              <option value="0.5ml Cartridge">0.5ml Cartridge</option>
              <option value="Tincture">Tincture</option>
              <option value="Other">Other</option>
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Strain" flex={2}>
            <input
              style={inputStyle}
              value={form.strain}
              onChange={(e) => set("strain", e.target.value)}
              placeholder="gelato-41"
            />
            <div style={hint}>Use hyphenated lowercase (e.g. purple-punch)</div>
          </Field>
          <Field label="Volume" flex={1}>
            <input
              style={inputStyle}
              value={form.volume}
              onChange={(e) => set("volume", e.target.value)}
              placeholder="1ml"
            />
          </Field>
        </Row>

        <Row>
          <Field label="Units Produced">
            <input
              style={inputStyle}
              type="number"
              value={form.units_produced}
              onChange={(e) => set("units_produced", e.target.value)}
              placeholder="100"
              min="1"
            />
          </Field>
          <Field label="THC Content (%)">
            <input
              style={inputStyle}
              type="number"
              value={form.thc_content}
              onChange={(e) => set("thc_content", e.target.value)}
              placeholder="85.4"
              step="0.1"
            />
          </Field>
          <Field label="CBD Content (%)">
            <input
              style={inputStyle}
              type="number"
              value={form.cbd_content}
              onChange={(e) => set("cbd_content", e.target.value)}
              placeholder="0.5"
              step="0.1"
            />
          </Field>
        </Row>

        {/* Section: Dates */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: C.muted,
            textTransform: "uppercase",
            marginBottom: 12,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 8,
            marginTop: 8,
          }}
        >
          Dates
        </div>

        <Row>
          <Field label="Production Date">
            <input
              style={inputStyle}
              type="date"
              value={form.production_date}
              onChange={(e) => set("production_date", e.target.value)}
            />
          </Field>
          <Field label="Expiry Date">
            <input
              style={inputStyle}
              type="date"
              value={form.expiry_date}
              onChange={(e) => set("expiry_date", e.target.value)}
            />
            {form.expiry_date && daysUntil(form.expiry_date) !== null && (
              <div
                style={{
                  ...hint,
                  color: daysUntil(form.expiry_date) <= 30 ? C.orange : C.mid,
                }}
              >
                {daysUntil(form.expiry_date) < 0
                  ? "⚠ Expired"
                  : `${daysUntil(form.expiry_date)} days remaining`}
              </div>
            )}
          </Field>
        </Row>

        {/* Section: Lab */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: C.muted,
            textTransform: "uppercase",
            marginBottom: 12,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 8,
            marginTop: 8,
          }}
        >
          Lab &amp; Certification
        </div>

        <Row>
          <Field label="Lab Name" flex={2}>
            <input
              style={inputStyle}
              value={form.lab_name}
              onChange={(e) => set("lab_name", e.target.value)}
              placeholder="SANAS Accredited Lab"
            />
          </Field>
          <Field label="Lab Test Date" flex={1}>
            <input
              style={inputStyle}
              type="date"
              value={form.lab_test_date}
              onChange={(e) => set("lab_test_date", e.target.value)}
            />
          </Field>
        </Row>

        <Row>
          <Field label="">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                fontSize: 14,
                color: C.text,
              }}
            >
              <input
                type="checkbox"
                checked={form.lab_certified}
                onChange={(e) => set("lab_certified", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              Lab Certified
            </label>
          </Field>
          <Field label="">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                fontSize: 14,
                color: C.text,
              }}
            >
              <input
                type="checkbox"
                checked={form.organic}
                onChange={(e) => set("organic", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              Organic
            </label>
          </Field>
        </Row>

        {/* Section: COA Upload */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: C.muted,
            textTransform: "uppercase",
            marginBottom: 12,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 8,
            marginTop: 8,
          }}
        >
          Certificate of Analysis (COA)
        </div>

        {form.coa_url ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: C.lightGreen,
              border: `1px solid ${C.accent}`,
              borderRadius: 2,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 13, color: C.mid, flex: 1 }}>
              ✅ COA uploaded
            </span>
            <a
              href={form.coa_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: C.blue,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View PDF →
            </a>
            <button
              onClick={() => set("coa_url", "")}
              style={{
                fontSize: 11,
                color: C.red,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${C.border}`,
              borderRadius: 2,
              padding: "24px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 16,
              background: C.cream,
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 13, color: C.mid, fontFamily: FONTS.body }}>
              {uploading ? "Uploading…" : "Click to upload COA PDF"}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              PDF files only · Max 10MB
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleCOAUpload}
        />
        {uploadMsg && (
          <div
            style={{
              fontSize: 12,
              color: uploadMsg.startsWith("✅") ? C.mid : C.orange,
              marginBottom: 12,
            }}
          >
            {uploadMsg}
          </div>
        )}

        {/* OR paste URL */}
        <div style={{ marginBottom: 20 }}>
          <span style={label("Or Paste Existing COA URL")}>
            Or Paste Existing COA URL
          </span>
          <input
            style={inputStyle}
            value={form.coa_url}
            onChange={(e) => set("coa_url", e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Actions */}
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Batch"}
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminBatchManager({
  onNavigateToQR,
  onNavigateToDocuments,
}) {
  const [batches, setBatches] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [filter, setFilter] = useState("active"); // active | expiring | archived | all
  const [search, setSearch] = useState("");
  const [suggestedNum, setSuggestedNum] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Fetch batches ────────────────────────────────────────────────────────
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data: batchData, error: bErr } = await supabase
        .from("batches")
        .select("*")
        .order("batch_number", { ascending: false });
      if (bErr) throw bErr;

      // Get QR + claim stats for all batches in one query
      const { data: productData } = await supabase
        .from("products")
        .select("batch_id, claimed")
        .not("batch_id", "is", null);

      const map = {};
      for (const p of productData || []) {
        if (!map[p.batch_id])
          map[p.batch_id] = { qr_count: 0, claimed_count: 0 };
        map[p.batch_id].qr_count++;
        if (p.claimed) map[p.batch_id].claimed_count++;
      }
      setStatsMap(map);
      setBatches(batchData || []);

      // Suggest next batch number
      await suggestNext(batchData || []);
    } catch (err) {
      console.error("fetchBatches error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const suggestNext = async (batchList) => {
    if (!batchList || batchList.length === 0) {
      setSuggestedNum("PB-001-2026");
      return;
    }
    // Find highest numeric suffix
    let max = 0;
    for (const b of batchList) {
      const parts = (b.batch_number || "").split("-");
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n) && n > max) max = n;
    }
    const year = new Date().getFullYear();
    setSuggestedNum(`PB-001-${year}-${String(max + 1).padStart(3, "0")}`);
  };

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // ── Archive ──────────────────────────────────────────────────────────────
  const handleArchive = async (batch) => {
    const { error } = await supabase
      .from("batches")
      .update({ is_archived: true })
      .eq("id", batch.id);
    if (!error) {
      setArchiveTarget(null);
      showToast("Batch archived.");
      fetchBatches();
    }
  };

  // ── Save (create or edit) ────────────────────────────────────────────────
  const handleSave = (saved) => {
    setShowForm(false);
    setEditBatch(null);
    showToast(editBatch ? "Batch updated." : "Batch created successfully.");
    fetchBatches();
  };

  // ── Go to QR generator ───────────────────────────────────────────────────
  const handleGoToQR = (batchId) => {
    if (onNavigateToQR) onNavigateToQR(batchId);
  };

  // ── Go to Document source (WP-I) ─────────────────────────────────────────
  const handleViewDocumentSource = (documentId) => {
    if (onNavigateToDocuments) onNavigateToDocuments(documentId);
  };

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = batches.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (b.batch_number || "").toLowerCase().includes(q) ||
      (b.product_name || "").toLowerCase().includes(q) ||
      (b.strain || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    const days = daysUntil(b.expiry_date);
    const archived = b.is_archived;
    if (filter === "archived") return archived;
    if (filter === "active") return !archived && (days === null || days > 30);
    if (filter === "expiring") return !archived && days !== null && days <= 30;
    return true; // all
  });

  // ── Summary stats ─────────────────────────────────────────────────────────
  const activeBatches = batches.filter((b) => !b.is_archived).length;
  const expiringBatches = batches.filter((b) => {
    const d = daysUntil(b.expiry_date);
    return !b.is_archived && d !== null && d <= 30;
  }).length;
  const totalUnits = batches
    .filter((b) => !b.is_archived)
    .reduce((s, b) => s + (b.units_produced || 0), 0);
  const totalQR = Object.values(statsMap).reduce((s, v) => s + v.qr_count, 0);

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
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            fontFamily: FONTS.body,
            letterSpacing: "0.05em",
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
            Batch Manager
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Create and manage production batches · COA uploads · QR code linking
          </div>
        </div>
        <button
          onClick={() => {
            setEditBatch(null);
            setShowForm(true);
          }}
          style={makeBtn(C.mid)}
        >
          + New Batch
        </button>
      </div>

      {/* Stats strip */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        {[
          { label: "Active Batches", value: activeBatches, color: C.green },
          {
            label: "Expiring Soon",
            value: expiringBatches,
            color: expiringBatches > 0 ? C.orange : C.muted,
          },
          { label: "Total Units", value: totalUnits, color: C.blue },
          { label: "QR Codes Issued", value: totalQR, color: C.accent },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: "16px 20px",
              flex: "1 1 160px",
              minWidth: 140,
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

      {/* Expiry alert banner */}
      {expiringBatches > 0 && (
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
          ⚠ {expiringBatches} batch{expiringBatches > 1 ? "es" : ""} expiring
          within 30 days — review distribution plan.
          <button
            onClick={() => setFilter("expiring")}
            style={{
              marginLeft: 12,
              fontSize: 11,
              color: C.orange,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: FONTS.body,
            }}
          >
            View expiring →
          </button>
        </div>
      )}

      {/* Search + filter bar */}
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
          style={{ ...inputStyle, maxWidth: 300 }}
          placeholder="Search batch, product, strain…"
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
            { key: "expiring", label: "Expiring" },
            { key: "archived", label: "Archived" },
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
          {filtered.length} batch{filtered.length !== 1 ? "es" : ""}
        </div>
        <button
          onClick={fetchBatches}
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
        <div
          style={{
            padding: "60px",
            textAlign: "center",
            color: C.muted,
            fontSize: 14,
          }}
        >
          Loading batches…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "60px",
            textAlign: "center",
            border: `1px dashed ${C.border}`,
            borderRadius: 2,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 20,
              color: C.green,
              marginBottom: 8,
            }}
          >
            {filter === "archived" ? "No archived batches" : "No batches found"}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
            {filter === "archived"
              ? "Archived batches will appear here."
              : "Create your first batch to get started."}
          </div>
          {filter !== "archived" && (
            <button
              onClick={() => {
                setEditBatch(null);
                setShowForm(true);
              }}
              style={makeBtn(C.mid)}
            >
              + Create First Batch
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
          {filtered.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              stats={statsMap[batch.id]}
              onEdit={(b) => {
                setEditBatch(b);
                setShowForm(true);
              }}
              onArchive={(b) => setArchiveTarget(b)}
              onGoToQR={handleGoToQR}
              onViewDocumentSource={handleViewDocumentSource}
            />
          ))}
        </div>
      )}

      {/* Archive confirm modal */}
      {archiveTarget && (
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
              maxWidth: 400,
              width: "90%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 22,
                color: C.green,
                marginBottom: 12,
              }}
            >
              Archive Batch?
            </div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
              <strong>{archiveTarget.batch_number}</strong> —{" "}
              {archiveTarget.product_name}
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.muted,
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              The batch will be hidden from the active view but never deleted.
              QR codes linked to this batch remain valid and scannable.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => handleArchive(archiveTarget)}
                style={makeBtn(C.orange)}
              >
                Archive
              </button>
              <button
                onClick={() => setArchiveTarget(null)}
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
      )}

      {/* Create / Edit slide-in form */}
      {showForm && (
        <>
          <div
            onClick={() => {
              setShowForm(false);
              setEditBatch(null);
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />
          <BatchForm
            initial={editBatch}
            suggestedBatchNumber={!editBatch ? suggestedNum : undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditBatch(null);
            }}
          />
        </>
      )}
    </div>
  );
}
