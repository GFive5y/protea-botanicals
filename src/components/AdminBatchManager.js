// src/components/AdminBatchManager.js
// v1.4 — WP-VIZ: Batch Status Donut + Units Produced HBar + Activation Rate HBar
// v1.3 — WP-VISUAL: T tokens, Inter font, flush stat grid, underline tabs, no Cormorant/Jost
// v1.2 — WP-GUIDE-C++: usePageContext 'batches' wired + WorkflowGuide added
// v1.1 — WP-I: COA source document link on batch card when coa_document_id is set
// v1.0 — March 2026

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
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

// Legacy aliases — all C.* references resolve correctly
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
  purple: "#6c3483",
  lightPurple: "#f5eef8",
};
const FONTS = { heading: T.font, body: T.font };

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
  padding: "9px 20px",
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
const hint = {
  fontSize: 11,
  color: T.ink400,
  marginTop: 4,
  fontFamily: T.font,
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

// ─── EXPIRY BADGE ─────────────────────────────────────────────────────────────
function ExpiryBadge({ expiryDate }) {
  const days = daysUntil(expiryDate);
  if (days === null) return null;
  const style = {
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    fontFamily: T.font,
  };
  if (days < 0)
    return (
      <span
        style={{
          ...style,
          background: T.dangerBg,
          color: T.danger,
          border: `1px solid ${T.dangerBd}`,
        }}
      >
        EXPIRED
      </span>
    );
  if (days <= 30)
    return (
      <span
        style={{
          ...style,
          background: T.warningBg,
          color: T.warning,
          border: `1px solid ${T.warningBd}`,
        }}
      >
        EXPIRING {days}d
      </span>
    );
  return (
    <span
      style={{
        ...style,
        background: T.successBg,
        color: T.success,
        border: `1px solid ${T.successBd}`,
      }}
    >
      ACTIVE
    </span>
  );
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = T.accentMid }) {
  const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      style={{
        height: 6,
        background: T.ink150,
        borderRadius: 3,
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pctVal}%`,
          background: color,
          borderRadius: 3,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ─── COA BADGE ───────────────────────────────────────────────────────────────
function COADocumentBadge({ coaDocumentId, onViewInDocuments }) {
  if (!coaDocumentId) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onViewInDocuments) onViewInDocuments(coaDocumentId);
      }}
      title="AI ingested COA — click to view source document"
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 20,
        background: C.lightPurple,
        color: C.purple,
        border: `1px solid ${C.purple}`,
        fontWeight: 700,
        letterSpacing: "0.07em",
        cursor: onViewInDocuments ? "pointer" : "default",
        fontFamily: T.font,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      AI INGESTED
    </button>
  );
}

// ─── BATCH CARD ───────────────────────────────────────────────────────────────
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
  const rate = pct(claimed, qr);
  const days = daysUntil(batch.expiry_date);
  const cardBd =
    days !== null && days < 0
      ? T.dangerBd
      : days !== null && days <= 30
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
        gap: 12,
        boxShadow: T.shadow,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = T.shadowMd)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = T.shadow)}
    >
      {/* Card header */}
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
              fontSize: 16,
              fontWeight: 600,
              color: T.ink900,
            }}
          >
            {batch.product_name || "Unnamed Product"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: T.ink400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 2,
              fontFamily: T.font,
            }}
          >
            {batch.batch_number}
          </div>
        </div>
        <ExpiryBadge expiryDate={batch.expiry_date} />
      </div>

      {/* Attributes */}
      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 12,
          color: T.ink500,
          fontFamily: T.font,
          flexWrap: "wrap",
        }}
      >
        {batch.strain && <span>{batch.strain.replace(/-/g, " ")}</span>}
        {batch.product_type && <span>· {batch.product_type}</span>}
        {batch.volume && <span>· {batch.volume}</span>}
        {batch.thc_content && <span>· THC {batch.thc_content}%</span>}
      </div>

      {/* Stat grid — flush 4-cell */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
        }}
      >
        {[
          {
            label: "Produced",
            value: batch.units_produced || "—",
            color: T.accent,
          },
          { label: "QR Codes", value: qr, color: T.info },
          { label: "Claimed", value: claimed, color: T.accentMid },
          {
            label: "Rate",
            value: `${rate}%`,
            color: parseFloat(rate) >= 50 ? T.success : T.warning,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 400,
                fontFamily: T.font,
                color: s.color,
                lineHeight: 1,
                letterSpacing: "-0.01em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginTop: 3,
                fontFamily: T.font,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Activation bar */}
      <div>
        <div
          style={{
            fontSize: 10,
            color: T.ink400,
            fontFamily: T.font,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Activation Rate
        </div>
        <ProgressBar
          value={claimed}
          max={qr || 1}
          color={parseFloat(rate) >= 50 ? T.success : T.warning}
        />
      </div>

      {/* Dates */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: T.ink400,
          fontFamily: T.font,
        }}
      >
        <span>Produced: {fmtDate(batch.production_date)}</span>
        <span>Expires: {fmtDate(batch.expiry_date)}</span>
      </div>

      {/* Badges */}
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
              background: T.successBg,
              color: T.success,
              border: `1px solid ${T.successBd}`,
              fontWeight: 700,
              letterSpacing: "0.07em",
              fontFamily: T.font,
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
              background: "#f0fff4",
              color: "#276749",
              border: "1px solid #276749",
              fontWeight: 700,
              letterSpacing: "0.07em",
              fontFamily: T.font,
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
              background: T.infoBg,
              color: T.info,
              border: `1px solid ${T.infoBd}`,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textDecoration: "none",
              fontFamily: T.font,
            }}
          >
            VIEW COA
          </a>
        ) : (
          <span style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
            No COA uploaded
          </span>
        )}
        <COADocumentBadge
          coaDocumentId={batch.coa_document_id}
          onViewInDocuments={onViewDocumentSource}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onGoToQR(batch.id)}
          style={{
            ...makeBtn(T.accent),
            fontSize: 11,
            padding: "8px 14px",
            flex: 1,
          }}
        >
          Generate QR
        </button>
        <button
          onClick={() => onEdit(batch)}
          style={{
            ...makeBtn("transparent", T.accentMid),
            border: `1px solid ${T.accentBd}`,
            fontSize: 11,
            padding: "8px 14px",
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onArchive(batch)}
          style={{
            ...makeBtn("transparent", T.ink400),
            border: `1px solid ${T.ink150}`,
            fontSize: 11,
            padding: "8px 14px",
          }}
        >
          Archive
        </button>
      </div>
    </div>
  );
}

// ─── FORM HELPERS ─────────────────────────────────────────────────────────────
function Row({ children }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>{children}</div>
  );
}
function Field({ label: l, children, flex = 1 }) {
  return (
    <div style={{ flex }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: T.ink400,
          marginBottom: 5,
          fontFamily: T.font,
          display: "block",
        }}
      >
        {l}
      </label>
      {children}
    </div>
  );
}

// ─── BATCH FORM (DRAWER) ──────────────────────────────────────────────────────
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
      setUploadMsg("Please upload a PDF file.");
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
      setUploadMsg("COA uploaded successfully");
    } catch (err) {
      setUploadMsg(`Upload failed: ${err.message}`);
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
      // WP-R: resolve tenant_id so HQProduction can filter correctly
      let tenantId = null;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();
          tenantId = profile?.tenant_id || null;
        }
      } catch (_) {}
      const payload = {
        ...form,
        tenant_id: tenantId,
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

  const sectionHdr = (label) => (
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
      {label}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(540px,100vw)",
        background: "#fff",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        zIndex: 1000,
        overflowY: "auto",
        fontFamily: T.font,
      }}
    >
      {/* Drawer header */}
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
          {isEdit ? "Edit Batch" : "New Batch"}
        </div>
        <div style={{ fontSize: 12, color: T.accentBd, marginTop: 2 }}>
          {isEdit
            ? `Editing ${initial.batch_number}`
            : "Fields marked * are required"}
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

        {sectionHdr("Batch Identity")}
        <Row>
          <Field label="Batch Number *" flex={1}>
            <input
              style={inputStyle}
              value={form.batch_number}
              onChange={(e) => set("batch_number", e.target.value)}
              placeholder="PB-001-2026"
            />
            <div style={hint}>Auto-suggested — you can edit</div>
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
            <div style={hint}>Hyphenated lowercase (e.g. purple-punch)</div>
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

        {sectionHdr("Dates")}
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
                  color:
                    daysUntil(form.expiry_date) <= 30 ? T.warning : T.accentMid,
                }}
              >
                {daysUntil(form.expiry_date) < 0
                  ? "Expired"
                  : `${daysUntil(form.expiry_date)} days remaining`}
              </div>
            )}
          </Field>
        </Row>

        {sectionHdr("Lab & Certification")}
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
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: T.ink700,
                fontFamily: T.font,
              }}
            >
              <input
                type="checkbox"
                checked={form.lab_certified}
                onChange={(e) => set("lab_certified", e.target.checked)}
                style={{ width: 15, height: 15 }}
              />
              Lab Certified
            </label>
          </Field>
          <Field label="">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: T.ink700,
                fontFamily: T.font,
              }}
            >
              <input
                type="checkbox"
                checked={form.organic}
                onChange={(e) => set("organic", e.target.checked)}
                style={{ width: 15, height: 15 }}
              />
              Organic
            </label>
          </Field>
        </Row>

        {sectionHdr("Certificate of Analysis (COA)")}
        {form.coa_url ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: T.successBg,
              border: `1px solid ${T.successBd}`,
              borderRadius: 4,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 13, color: T.success, flex: 1 }}>
              COA uploaded
            </span>
            <a
              href={form.coa_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: T.info,
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
                color: T.danger,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${T.ink150}`,
              borderRadius: 4,
              padding: "20px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 14,
              background: T.ink075,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = T.accentBd)
            }
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.ink150)}
          >
            <div
              style={{ fontSize: 13, color: T.accentMid, fontFamily: T.font }}
            >
              {uploading ? "Uploading…" : "Click to upload COA PDF"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.ink400,
                marginTop: 3,
                fontFamily: T.font,
              }}
            >
              PDF only · Max 10MB
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
              color: uploadMsg.includes("success") ? T.success : T.warning,
              marginBottom: 10,
              fontFamily: T.font,
            }}
          >
            {uploadMsg}
          </div>
        )}

        <Field label="Or Paste Existing COA URL">
          <input
            style={inputStyle}
            value={form.coa_url}
            onChange={(e) => set("coa_url", e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <div
          style={{
            display: "flex",
            gap: 10,
            paddingTop: 16,
            marginTop: 16,
            borderTop: `1px solid ${T.ink150}`,
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...makeBtn(T.accent, "#fff", saving), flex: 1 }}
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Batch"}
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminBatchManager({
  onNavigateToQR,
  onNavigateToDocuments,
}) {
  const ctx = usePageContext("batches", null);

  const [batches, setBatches] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [suggestedNum, setSuggestedNum] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // GAP-02: write a system_alert (non-blocking, fire-and-forget)
  const writeAlert = useCallback(async (alertType, severity, title, body) => {
    try {
      const { count } = await supabase
        .from("system_alerts")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", "43b34c33-6864-4f02-98dd-df1d340475c3")
        .eq("alert_type", alertType)
        .is("acknowledged_at", null);
      if (count > 0) return;
      await supabase.from("system_alerts").insert({
        tenant_id: "43b34c33-6864-4f02-98dd-df1d340475c3",
        alert_type: alertType,
        severity,
        status: "open",
        title,
        body: body || null,
        source_table: "batches",
      });
    } catch (_) {}
  }, []);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data: batchData, error: bErr } = await supabase
        .from("batches")
        .select("*")
        .order("batch_number", { ascending: false });
      if (bErr) throw bErr;
      const { data: productData } = await supabase
        .from("qr_codes")
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

      // GAP-02: fire alerts for expiring batches + missing COA
      const now = Date.now();
      const activeFetched = (batchData || []).filter((b) => !b.is_archived);
      const expiring = activeFetched.filter((b) => {
        const days = b.expiry_date
          ? Math.ceil((new Date(b.expiry_date) - now) / 86400000)
          : null;
        return days !== null && days <= 30 && days >= 0;
      });
      const noCoa = activeFetched.filter((b) => !b.coa_url);
      if (expiring.length > 0) {
        writeAlert(
          "batch_expiry",
          "warning",
          `${expiring.length} batch${expiring.length > 1 ? "es" : ""} expiring within 30 days`,
          expiring
            .map(
              (b) =>
                `${b.batch_number} (${b.product_name}) — expires ${b.expiry_date}`,
            )
            .join(" · "),
        );
      }
      if (noCoa.length > 0) {
        writeAlert(
          "missing_coa",
          "info",
          `${noCoa.length} batch${noCoa.length > 1 ? "es" : ""} missing COA`,
          noCoa.map((b) => `${b.batch_number} (${b.product_name})`).join(" · "),
        );
      }

      // Suggest next batch number
      let max = 0;
      for (const b of batchData || []) {
        const parts = (b.batch_number || "").split("-");
        const n = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(n) && n > max) max = n;
      }
      setSuggestedNum(
        `PB-001-${new Date().getFullYear()}-${String(max + 1).padStart(3, "0")}`,
      );
    } catch (err) {
      console.error("fetchBatches error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

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

  const handleSave = () => {
    setShowForm(false);
    setEditBatch(null);
    showToast(editBatch ? "Batch updated." : "Batch created.");
    fetchBatches();
  };

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
    return true;
  });

  const activeBatches = batches.filter((b) => !b.is_archived).length;
  const expiringBatches = batches.filter((b) => {
    const d = daysUntil(b.expiry_date);
    return !b.is_archived && d !== null && d <= 30;
  }).length;
  const totalUnits = batches
    .filter((b) => !b.is_archived)
    .reduce((s, b) => s + (b.units_produced || 0), 0);
  const totalQR = Object.values(statsMap).reduce((s, v) => s + v.qr_count, 0);

  const FILTER_TABS = [
    { key: "active", label: "Active" },
    { key: "expiring", label: "Expiring" },
    { key: "archived", label: "Archived" },
    { key: "all", label: "All" },
  ];

  return (
    <div style={{ fontFamily: T.font, position: "relative" }}>
      {/* WorkflowGuide — always first */}
      <WorkflowGuide
        context={ctx}
        tabId="batches"
        onAction={() => {}}
        defaultOpen={true}
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
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            fontFamily: T.font,
            letterSpacing: "0.04em",
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
            Batch Manager
          </h2>
          <div style={{ fontSize: 13, color: T.ink400 }}>
            Create and manage production batches · COA uploads · QR code linking
          </div>
        </div>
        <button
          onClick={() => {
            setEditBatch(null);
            setShowForm(true);
          }}
          style={makeBtn(T.accent)}
        >
          + New Batch
        </button>
      </div>

      {/* ── STAT GRID (flush, no borderTop) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
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
          { label: "Active Batches", value: activeBatches, color: T.accent },
          {
            label: "Expiring Soon",
            value: expiringBatches,
            color: expiringBatches > 0 ? T.warning : T.ink400,
          },
          {
            label: "Total Units",
            value: totalUnits.toLocaleString("en-ZA"),
            color: T.info,
          },
          {
            label: "QR Codes Issued",
            value: totalQR.toLocaleString("en-ZA"),
            color: T.accentMid,
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
        batches.length > 0 &&
        (() => {
          // Chart 1: Batch status donut
          const archived = batches.filter((b) => b.is_archived).length;
          const expiring = batches.filter(
            (b) =>
              !b.is_archived &&
              daysUntil(b.expiry_date) !== null &&
              daysUntil(b.expiry_date) <= 30,
          ).length;
          const active = batches.filter(
            (b) =>
              !b.is_archived &&
              (daysUntil(b.expiry_date) === null ||
                daysUntil(b.expiry_date) > 30),
          ).length;
          const statusDonut = [
            { name: "Active", value: active, color: T.success },
            { name: "Expiring", value: expiring, color: T.warning },
            { name: "Archived", value: archived, color: T.ink300 },
          ].filter((d) => d.value > 0);

          // Chart 2: Units produced per batch (top 8, horizontal bars)
          const unitsBar = [...batches]
            .filter((b) => !b.is_archived && (b.units_produced || 0) > 0)
            .sort((a, b) => (b.units_produced || 0) - (a.units_produced || 0))
            .slice(0, 8)
            .map((b) => ({
              name: b.batch_number?.slice(-6) || b.batch_number,
              units: b.units_produced || 0,
            }));
          const unitsMax = Math.max(...unitsBar.map((d) => d.units), 1);

          // Chart 3: Activation rate per batch (top 8 by QR count)
          const rateBar = batches
            .filter((b) => !b.is_archived && statsMap[b.id]?.qr_count > 0)
            .map((b) => ({
              name: b.batch_number?.slice(-6) || b.batch_number,
              rate: parseFloat(
                pct(
                  statsMap[b.id]?.claimed_count || 0,
                  statsMap[b.id]?.qr_count || 1,
                ),
              ),
              qr: statsMap[b.id]?.qr_count || 0,
            }))
            .sort((a, b) => b.qr - a.qr)
            .slice(0, 8);
          const showCharts = statusDonut.length > 0;

          if (!showCharts) return null;
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Donut — batch status */}
              <ChartCard title="Batch Status" height={200}>
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
                        <ChartTooltip formatter={(v) => `${v} batches`} />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* HBar — units produced per batch */}
              <ChartCard title="Units Produced per Batch" height={200}>
                {unitsBar.length === 0 ? (
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
                    No production data
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
                    {unitsBar.map((d) => (
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
                            fontSize: 9,
                            color: T.ink400,
                            fontFamily: "monospace",
                            width: 54,
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
                              width: `${(d.units / unitsMax) * 100}%`,
                              background: T.accentMid,
                              borderRadius: 3,
                              transition: "width 0.5s",
                              display: "flex",
                              alignItems: "center",
                              paddingLeft: 4,
                            }}
                          >
                            {d.units / unitsMax > 0.25 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#fff",
                                  fontWeight: 700,
                                  fontFamily: T.font,
                                }}
                              >
                                {d.units.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: T.ink400,
                            fontFamily: T.font,
                            minWidth: 32,
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {d.units / unitsMax <= 0.25
                            ? d.units.toLocaleString()
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>

              {/* HBar — QR activation rate per batch */}
              <ChartCard title="QR Activation Rate" height={200}>
                {rateBar.length === 0 ? (
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
                    No QR data yet
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
                    {rateBar.map((d) => (
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
                            fontSize: 9,
                            color: T.ink400,
                            fontFamily: "monospace",
                            width: 54,
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
                              width: `${Math.min(d.rate, 100)}%`,
                              background:
                                d.rate >= 50
                                  ? T.success
                                  : d.rate >= 25
                                    ? T.accentMid
                                    : T.warning,
                              borderRadius: 3,
                              transition: "width 0.5s",
                              display: "flex",
                              alignItems: "center",
                              paddingLeft: 4,
                            }}
                          >
                            {d.rate >= 15 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#fff",
                                  fontWeight: 700,
                                  fontFamily: T.font,
                                }}
                              >
                                {d.rate}%
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: T.ink400,
                            fontFamily: T.font,
                            minWidth: 30,
                            textAlign: "right",
                          }}
                        >
                          {d.rate < 15 ? `${d.rate}%` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>
          );
        })()}

      {/* Expiring warning */}
      {expiringBatches > 0 && (
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
          {expiringBatches} batch{expiringBatches > 1 ? "es" : ""} expiring
          within 30 days — review distribution plan.
          <button
            onClick={() => setFilter("expiring")}
            style={{
              marginLeft: 12,
              fontSize: 11,
              color: T.warning,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: T.font,
            }}
          >
            View expiring →
          </button>
        </div>
      )}

      {/* Search + filter tabs */}
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
          placeholder="Search batch, product, strain…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* Underline-only filter tabs */}
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
          {filtered.length} batch{filtered.length !== 1 ? "es" : ""}
        </div>
        <button
          onClick={fetchBatches}
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
            padding: "60px",
            textAlign: "center",
            color: T.ink400,
            fontSize: 13,
            fontFamily: T.font,
          }}
        >
          Loading batches…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "60px",
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
            {filter === "archived" ? "No archived batches" : "No batches found"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: T.ink400,
              marginBottom: 20,
              fontFamily: T.font,
            }}
          >
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
              style={makeBtn(T.accentMid)}
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
              onGoToQR={(id) => onNavigateToQR && onNavigateToQR(id)}
              onViewDocumentSource={(id) =>
                onNavigateToDocuments && onNavigateToDocuments(id)
              }
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
              maxWidth: 400,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              fontFamily: T.font,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: T.ink900,
                marginBottom: 8,
              }}
            >
              Archive Batch?
            </div>
            <div style={{ fontSize: 14, color: T.ink500, marginBottom: 6 }}>
              <strong>{archiveTarget.batch_number}</strong> —{" "}
              {archiveTarget.product_name}
            </div>
            <div
              style={{
                fontSize: 13,
                color: T.ink400,
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
                style={makeBtn(T.warning)}
              >
                Archive
              </button>
              <button
                onClick={() => setArchiveTarget(null)}
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
      )}

      {/* Drawer backdrop + form */}
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
