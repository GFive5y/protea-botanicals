// src/components/hq/food/FoodIngestModal.js
// WP-TABLE-UNIFY Phase 2B.3 — HQ "+ Add from Document" modal
// Ships the upload/paste UI layer on top of process-document v62 F&B branch.
// Rules: RULE 0F (tenant_id), DS6 tokens only, no raw hex.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../../services/supabaseClient";
import { logAudit } from "../../../services/auditPlacemarker";
import { T } from "../../../styles/tokens";
import { Upload, X, AlertCircle, FileText, Link2 } from "lucide-react";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ACCEPT_STRING = "application/pdf,image/jpeg,image/png,image/webp";
const MIN_PASTE_CHARS = 50;

/* ── helpers ─────────────────────────────────────────────────────── */

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 120);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Strip "data:...;base64," prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function humanSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/* ── styles ──────────────────────────────────────────────────────── */

const sOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: T.z.modal,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const sCard = {
  width: 640, // Modal width — between T.container.narrow (900) and default (1200); 640 is a spec'd value (LL-289)
  maxHeight: "85vh",
  background: T.surface,
  borderRadius: T.radius.mdPlus,
  boxShadow: T.shadow.lg,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const sHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${T.pad.lg}px ${T.pad.xl}px`,
  borderBottom: `1px solid ${T.border}`,
};

const sBody = {
  flex: 1,
  overflowY: "auto",
  padding: `${T.pad.lg}px ${T.pad.xl}px`,
};

const sFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: T.gap.sm,
  padding: `${T.pad.md}px ${T.pad.xl}px`,
  borderTop: `1px solid ${T.border}`,
};

const sInfoBanner = {
  display: "flex",
  alignItems: "flex-start",
  gap: T.gap.sm,
  padding: `${T.pad.md}px ${T.pad.lg}px`,
  background: T.infoLight,
  border: `1px solid ${T.infoBd}`,
  borderRadius: T.radius.md,
  marginBottom: T.gap.lg,
  fontSize: T.text.sm,
  fontFamily: T.font,
  color: T.ink,
  lineHeight: 1.45,
};

const sTabBar = {
  display: "flex",
  gap: 0,
  borderBottom: `1px solid ${T.border}`,
  marginBottom: T.gap.lg,
};

function tabStyle(active, disabled) {
  return {
    padding: `${T.pad.sm}px ${T.pad.lg}px`,
    background: "none",
    border: "none",
    borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
    color: disabled ? T.ink400 : active ? T.accent : T.ink,
    fontWeight: active ? T.weight.semibold : T.weight.normal,
    fontSize: T.text.base,
    fontFamily: T.font,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    gap: T.gap.xs,
  };
}

const sDropZone = (isDrag) => ({
  border: `2px dashed ${isDrag ? T.accentBd : T.border}`,
  borderRadius: T.radius.md,
  padding: T.pad.xl,
  textAlign: "center",
  cursor: "pointer",
  background: isDrag ? T.accentLight : "transparent",
  transition: "background 0.15s, border-color 0.15s",
});

const sComingSoonPill = {
  display: "inline-block",
  fontSize: T.text.xxs,
  fontWeight: T.weight.semibold,
  padding: "2px 8px",
  background: T.surfaceHover,
  borderRadius: T.radius.full,
  color: T.ink400,
  marginLeft: T.gap.xs,
};

function btnStyle(variant) {
  if (variant === "primary") {
    return {
      padding: `${T.pad.sm}px ${T.pad.lg}px`,
      background: T.accent,
      color: T.surface,
      border: "none",
      borderRadius: T.radius.md,
      cursor: "pointer",
      fontWeight: T.weight.semibold,
      fontSize: T.text.base,
      fontFamily: T.font,
    };
  }
  // ghost
  return {
    padding: `${T.pad.sm}px ${T.pad.lg}px`,
    background: "transparent",
    color: T.ink,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius.md,
    cursor: "pointer",
    fontWeight: T.weight.normal,
    fontSize: T.text.base,
    fontFamily: T.font,
  };
}

/* ── component ───────────────────────────────────────────────────── */

export default function FoodIngestModal({ isOpen, onClose, onSuccess, tenantId, industryProfile }) {
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const firstTabRef = useRef(null);

  // Focus first tab on open
  useEffect(() => {
    if (isOpen && firstTabRef.current) {
      firstTabRef.current.focus();
    }
  }, [isOpen]);

  // ESC handler
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape" && !extracting) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, extracting, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !cardRef.current) return;
    function handleTab(e) {
      if (e.key !== "Tab") return;
      const focusable = cardRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  const resetState = useCallback(() => {
    setFile(null);
    setPastedText("");
    setLastError(null);
    setIsDragging(false);
    setActiveTab("upload");
  }, []);

  /* ── file validation ──────────────────────────────────────────── */

  function validateFile(f) {
    if (f.size > MAX_FILE_SIZE) {
      setLastError(`File too large (${humanSize(f.size)}). Maximum is 20 MB.`);
      return false;
    }
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setLastError(`Unsupported file type: ${f.type || "unknown"}. Use PDF, JPG, PNG, or WebP.`);
      return false;
    }
    setLastError(null);
    return true;
  }

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (f && validateFile(f)) setFile(f);
  }

  /* ── drag & drop ──────────────────────────────────────────────── */

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && validateFile(f)) setFile(f);
  }

  /* ── extract (upload) ─────────────────────────────────────────── */

  async function handleExtractUpload() {
    if (!file || extracting) return;
    setExtracting(true);
    setLastError(null);

    try {
      // 1. Upload to storage
      const storagePath = `food_ingest/${Date.now()}-${sanitizeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("supplier-documents")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

      // 2. Convert to base64
      const base64 = await fileToBase64(file);

      // 3. Invoke EF
      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-document", {
        body: {
          file_base64: base64,
          mime_type: file.type,
          file_url: storagePath,
          file_name: file.name,
          file_size_kb: Math.round(file.size / 1024),
          document_type_hint: null,
          industry_profile: industryProfile,
          context: {},
        },
      });

      if (fnError) throw new Error("Extraction failed: " + fnError.message);
      if (!fnData?.success) throw new Error(fnData?.error || "Extraction returned no data");

      // 4. Audit + callback
      logAudit({
        action: "ingredient.ingest.extract",
        targetType: "document_log",
        targetId: fnData.document_log_id,
        tenantId,
        diff: {
          source: "upload",
          file_name: file.name,
          mime_type: file.type,
          size_kb: Math.round(file.size / 1024),
          queued_count: fnData.queued_ingredient_count || 0,
        },
      });

      onSuccess({
        documentLogId: fnData.document_log_id,
        queuedCount: fnData.queued_ingredient_count || 0,
      });
      resetState();
    } catch (err) {
      setLastError(err.message || "Extraction failed. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  /* ── extract (paste) ──────────────────────────────────────────── */

  async function handleExtractPaste() {
    if (pastedText.length < MIN_PASTE_CHARS || extracting) return;
    setExtracting(true);
    setLastError(null);

    try {
      const base64 = btoa(unescape(encodeURIComponent(pastedText)));

      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-document", {
        body: {
          file_base64: base64,
          mime_type: "text/plain",
          file_url: null,
          file_name: "pasted-text.txt",
          file_size_kb: Math.round(pastedText.length / 1024),
          document_type_hint: "spec_sheet",
          industry_profile: industryProfile,
          context: {},
        },
      });

      if (fnError) throw new Error("Extraction failed: " + fnError.message);
      if (!fnData?.success) throw new Error(fnData?.error || "Extraction returned no data");

      logAudit({
        action: "ingredient.ingest.extract",
        targetType: "document_log",
        targetId: fnData.document_log_id,
        tenantId,
        diff: {
          source: "paste",
          file_name: "pasted-text.txt",
          mime_type: "text/plain",
          size_kb: Math.round(pastedText.length / 1024),
          queued_count: fnData.queued_ingredient_count || 0,
        },
      });

      onSuccess({
        documentLogId: fnData.document_log_id,
        queuedCount: fnData.queued_ingredient_count || 0,
      });
      resetState();
    } catch (err) {
      setLastError(err.message || "Extraction failed. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  /* ── extract dispatch ─────────────────────────────────────────── */

  function handleExtract() {
    if (activeTab === "upload") handleExtractUpload();
    else if (activeTab === "paste") handleExtractPaste();
  }

  const extractDisabled =
    extracting ||
    (activeTab === "upload" && !file) ||
    (activeTab === "paste" && pastedText.length < MIN_PASTE_CHARS) ||
    activeTab === "url";

  /* ── render ────────────────────────────────────────────────────── */

  if (!isOpen) return null;

  const headerId = "food-ingest-modal-title";

  return (
    <div
      style={sOverlay}
      onClick={extracting ? undefined : onClose}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headerId}
        style={sCard}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={sHeader}>
          <h2
            id={headerId}
            style={{
              margin: 0,
              fontSize: T.text.lg,
              fontWeight: T.weight.semibold,
              fontFamily: T.font,
            }}
          >
            Add Ingredients from Document
          </h2>
          <button
            onClick={extracting ? undefined : onClose}
            style={{
              background: "none",
              border: "none",
              cursor: extracting ? "not-allowed" : "pointer",
              color: T.ink400,
              padding: T.pad.xs,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={sBody}>
          {/* Info banner — mobile placemarker */}
          <div style={sInfoBanner}>
            <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0, color: T.info }} />
            <span>
              Desktop ingest is live today. Phase 2F adds mobile Smart
              Capture — photograph ingredients at the stock-receiving
              point for receive-and-go ingestion.
            </span>
          </div>

          {/* Tab bar */}
          <div style={sTabBar}>
            <button
              ref={firstTabRef}
              style={tabStyle(activeTab === "upload", false)}
              onClick={() => !extracting && setActiveTab("upload")}
              disabled={extracting}
            >
              <Upload size={14} /> Upload file
            </button>
            <button
              style={tabStyle(activeTab === "paste", false)}
              onClick={() => !extracting && setActiveTab("paste")}
              disabled={extracting}
            >
              <FileText size={14} /> Paste text
            </button>
            <button
              style={tabStyle(false, true)}
              onClick={() => {}}
              disabled
            >
              <Link2 size={14} /> Import from URL
              <span style={sComingSoonPill}>Coming soon</span>
            </button>
          </div>

          {/* Upload tab */}
          {activeTab === "upload" && (
            <>
              {!file ? (
                <div
                  style={sDropZone(isDragging)}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload size={32} color={T.ink400} style={{ marginBottom: T.gap.sm }} />
                  <div style={{ fontSize: T.text.base, fontWeight: T.weight.medium, color: T.ink }}>
                    Drop invoice, COA, spec sheet, or label photo here
                  </div>
                  <div style={{ fontSize: T.text.sm, color: T.ink400, marginTop: T.gap.xs }}>
                    PDF · JPG · PNG — max 20 MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_STRING}
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: T.pad.lg,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius.md,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: T.gap.sm }}>
                    <FileText size={20} color={T.accent} />
                    <div>
                      <div style={{ fontWeight: T.weight.medium, fontSize: T.text.base }}>{file.name}</div>
                      <div style={{ fontSize: T.text.sm, color: T.ink400 }}>{humanSize(file.size)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setFile(null); setLastError(null); }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: T.ink400,
                      padding: T.pad.xs,
                    }}
                    aria-label="Clear file"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Paste tab */}
          {activeTab === "paste" && (
            <div style={{ position: "relative" }}>
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => { setPastedText(e.target.value); setLastError(null); }}
                placeholder="Paste product spec, invoice text, or nutrition panel here…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.smPlus,
                  padding: T.pad.md,
                  fontFamily: T.font,
                  fontSize: T.text.base,
                  resize: "vertical",
                }}
              />
              <div
                style={{
                  textAlign: "right",
                  fontSize: T.text.xs,
                  color: pastedText.length >= MIN_PASTE_CHARS ? T.ink400 : T.danger,
                  marginTop: T.gap.xs,
                }}
              >
                {pastedText.length} / {MIN_PASTE_CHARS} min characters
              </div>
            </div>
          )}

          {/* URL tab */}
          {activeTab === "url" && (
            <div style={{ textAlign: "center", padding: T.pad.xl, color: T.ink400 }}>
              <Link2 size={28} style={{ marginBottom: T.gap.sm }} />
              <div style={{ fontSize: T.text.base, fontWeight: T.weight.medium }}>
                URL scraping opens in Phase 2F
              </div>
              <div style={{ fontSize: T.text.sm, marginTop: T.gap.xs }}>
                For now, save the page as PDF and use Upload.
              </div>
            </div>
          )}

          {/* Error banner */}
          {lastError && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: T.gap.sm,
                padding: `${T.pad.md}px ${T.pad.lg}px`,
                background: T.dangerLight,
                border: `1px solid ${T.dangerBd}`,
                borderRadius: T.radius.md,
                marginTop: T.gap.lg,
                fontSize: T.text.sm,
                fontFamily: T.font,
                color: T.ink,
              }}
            >
              <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0, color: T.danger }} />
              <span>{lastError} — check the file and try again.</span>
            </div>
          )}

          {/* Progress row */}
          {extracting && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: T.gap.sm,
                marginTop: T.gap.lg,
                fontSize: T.text.sm,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  border: `2px solid ${T.border}`,
                  borderTopColor: T.accent,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: T.gap.xs }}>
                <div style={{ color: T.ink, fontWeight: T.weight.medium }}>
                  Reading your document…
                </div>
                <div style={{ color: T.ink400 }}>
                  Identifying ingredients, allergens, and HACCP risk…
                </div>
                <div style={{ color: T.ink400 }}>
                  Matching against SA suppliers and R638 compliance…
                </div>
                <div style={{ color: T.ink400, fontSize: T.text.xs, marginTop: T.gap.xs }}>
                  Usually 8-15 seconds for a typical invoice.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={sFooter}>
          <button
            onClick={extracting ? undefined : () => { resetState(); onClose(); }}
            style={{ ...btnStyle("ghost"), opacity: extracting ? 0.5 : 1, cursor: extracting ? "not-allowed" : "pointer" }}
            disabled={extracting}
          >
            Cancel
          </button>
          <button
            onClick={handleExtract}
            disabled={extractDisabled}
            style={{
              ...btnStyle("primary"),
              opacity: extractDisabled ? 0.5 : 1,
              cursor: extractDisabled ? "not-allowed" : "pointer",
            }}
          >
            {extracting ? "Extracting…" : "Extract"}
          </button>
        </div>
      </div>

      {/* Spinner keyframe — injected once */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
