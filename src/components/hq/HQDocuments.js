// src/components/hq/HQDocuments.js
// v1.5 — WP-I: Intelligent Document Ingestion Engine
// FIX: create_purchase_order — strict schema whitelist + item field mapper
//      prevents 400 Bad Request when Claude invents column names
// FIX: Re-open for Review button added (confirmed / partially_applied docs)
// FIX: else if (record_id) update branch restored
// FIX: fetch fresh suppliers/products context on every upload
// FIX: reject state cleanup, ESLint suppressions, signed URL useEffect restored

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
  orange: "#e67e22",
  lightOrange: "#fef9f0",
  lightGreen: "#eafaf1",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  amber: "#d4830a",
  lightAmber: "#fff8ee",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
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
  confirming,
  confirmed,
  error: confirmError,
}) {
  const [checkedUpdates, setCheckedUpdates] = useState(new Set());
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const extraction = doc.extracted_data || {};
  const lineItems = extraction.line_items || [];
  const proposedUpdates = extraction.proposed_updates || [];
  const unknownItems = extraction.unknown_items || [];
  const warnings = extraction.warnings || [];

  // Auto-check all high-confidence updates on mount
  useEffect(() => {
    const autoChecked = new Set(
      proposedUpdates
        .map((u, i) => (u.confidence >= 0.8 ? i : null))
        .filter((i) => i !== null),
    );
    setCheckedUpdates(autoChecked);
    setRejecting(false);
    setRejectReason("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

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

  return (
    <div style={panelStyle}>
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
      {extraction.supplier?.matched_id ? (
        <div style={fieldRow}>
          <span style={{ color: C.muted }}>Supplier Match</span>
          <ConfidenceDot score={extraction.supplier.confidence} />
        </div>
      ) : extraction.supplier?.name ? (
        <div style={fieldRow}>
          <span style={{ color: C.muted }}>Supplier</span>
          <span style={{ color: C.amber, fontSize: 11 }}>⚠ No match</span>
        </div>
      ) : null}

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
                      color: C.text,
                      fontWeight: 500,
                      flex: 1,
                      marginRight: 6,
                    }}
                  >
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
                  ) : (
                    <span style={{ color: C.amber }}>⚠ unmatched</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
                  background: checkedUpdates.has(i) ? "#f5fdf8" : C.white,
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
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 6px",
                          borderRadius: 2,
                          background: C.lightBlue,
                          color: C.blue,
                          fontFamily: F.body,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {update.table}
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

      {/* ── Confirmed status banner ── */}
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

      {/* ── Rejected status banner ── */}
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

      {/* ── Re-open button (confirmed / partially_applied / rejected) ── */}
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

      {/* ── Reject reason textarea ── */}
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
            placeholder="Optional — describe why this document is rejected"
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
                letterSpacing: "0.15em",
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

      {/* ── Confirm / Reject action buttons (pending_review only) ── */}
      {!isReadOnly && !rejecting && (
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
              <th style={sTh}>Date</th>
              <th style={sTh}>Type</th>
              <th style={sTh}>Supplier</th>
              <th style={sTh}>File</th>
              <th style={sTh}>Confidence</th>
              <th style={sTh}>Status</th>
              <th style={sTh}>Applied</th>
              <th style={sTh}></th>
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

export default function HQDocuments() {
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

  const fetchFreshContext = async () => {
    const [suppRes, prodRes] = await Promise.all([
      supabase
        .from("suppliers")
        .select("id, name, country, currency")
        .eq("is_active", true),
      supabase
        .from("supplier_products")
        .select("id, name, sku, category, unit_price_usd, supplier_id")
        .eq("is_active", true),
    ]);
    return {
      existing_suppliers: suppRes.data || [],
      existing_products: prodRes.data || [],
    };
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Generate signed URL on document select ─────────────────────────────────
  useEffect(() => {
    setSignedUrl(null);
    setConfirmed(false);
    setConfirmError("");
    if (!selectedDoc?.file_url) return;

    setSignedUrlLoading(true);
    supabase.storage
      .from("supplier-documents")
      .createSignedUrl(selectedDoc.file_url, 3600)
      .then(({ data }) => {
        setSignedUrl(data?.signedUrl || null);
      })
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
      setUploadMsg("Loading latest product catalogue for matching…");
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

  // ── Schema whitelists — prevents 400s when Claude invents column names ───
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

  // Normalise a PO line item to exact purchase_order_items column names
  // NOTE: item_id FKs to inventory_items — use supplier_product_id for product refs
  // Normalise PO line item to exact purchase_order_items columns
  // item_id FKs to inventory_items (for stock receiving) — NOT used here
  // supplier_product_id FKs to supplier_products — correct for doc ingestion
  // line_total is a generated column — NEVER insert it
  const normalisePOItem = (item) => ({
    supplier_product_id:
      item.supplier_product_id ||
      item.product_id ||
      item.matched_product_id ||
      item.item_id ||
      null,
    quantity_ordered: item.quantity_ordered ?? item.quantity ?? 1,
    unit_cost: item.unit_cost ?? item.unit_price_usd ?? item.unit_price ?? 0,
    // optional columns only — no generated columns
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
    // line_total intentionally omitted — generated column in DB
    // item_id intentionally omitted — FKs to inventory_items, not supplier_products
  });

  const handleConfirm = async (checkedIndices) => {
    if (!selectedDoc || checkedIndices.length === 0) return;
    setConfirming(true);
    setConfirmError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const extraction = selectedDoc.extracted_data || {};
    const proposedUpdates = extraction.proposed_updates || [];
    const toApply = checkedIndices
      .map((i) => proposedUpdates[i])
      .filter(Boolean);
    const appliedUpdates = [];
    const failedUpdates = [];

    for (const update of toApply) {
      try {
        const { action, table, record_id, data } = update;
        if (!table || !data) throw new Error("Missing table or data");

        const createActions = [
          "create_supplier_product",
          "create_purchase_order",
          "create_batch",
        ];

        if (createActions.includes(action)) {
          if (action === "create_purchase_order") {
            // ── Sanitise: strip items + any column not in schema whitelist ──
            const { items, ...rawHeader } = data;
            const poHeader = Object.fromEntries(
              Object.entries(rawHeader).filter(([k]) => PO_HEADER_COLS.has(k)),
            );
            // Always stamp who created it + which document sourced it
            if (user?.id) poHeader.created_by = user.id;
            poHeader.source_document_id = selectedDoc.id;
            // Force draft status — po_status is a PG ENUM, only "draft" valid on create
            poHeader.status = "draft";
            poHeader.po_status = "draft";
            if (!poHeader.currency)
              poHeader.currency = extraction.currency || "USD";
            if (!poHeader.order_date)
              poHeader.order_date = new Date().toISOString().split("T")[0];
            // Auto-generate po_number if missing
            if (!poHeader.po_number)
              poHeader.po_number = `PO-DOC-${Date.now().toString().slice(-8)}`;
            // supplier_id fallback — AI may nest it or omit it entirely
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

            console.log(
              "[PO INSERT] poHeader:",
              JSON.stringify(poHeader, null, 2),
            );

            // Try insert; if po_number already exists, fetch the existing PO instead
            let newPO = null;
            const { data: insertedPO, error: poErr } = await supabase
              .from(table)
              .insert(poHeader)
              .select()
              .single();

            if (poErr) {
              // 23505 = unique_violation — PO already created from a prior confirm attempt
              if (poErr.code === "23505" && poHeader.po_number) {
                const { data: existingPO, error: fetchErr } = await supabase
                  .from(table)
                  .select()
                  .eq("po_number", poHeader.po_number)
                  .single();
                if (fetchErr || !existingPO) throw poErr; // original error if can't recover
                newPO = existingPO;
                console.log(
                  "[PO INSERT] duplicate po_number — using existing PO:",
                  existingPO.id,
                );
              } else {
                throw poErr;
              }
            } else {
              newPO = insertedPO;
            }

            // ── Insert line items with normalised column names ──────────────
            if (items?.length && newPO?.id) {
              const poItems = items
                .map((item) => ({ ...normalisePOItem(item), po_id: newPO.id }))
                // drop items with no supplier_product_id — can't FK without it
                .filter((item) => item.supplier_product_id);
              console.log(
                "[PO ITEMS INSERT]",
                JSON.stringify(poItems, null, 2),
              );
              if (poItems.length > 0) {
                const { error: itemsErr } = await supabase
                  .from("purchase_order_items")
                  .insert(poItems);
                if (itemsErr) throw itemsErr;
              }
            }
          } else {
            const { error } = await supabase.from(table).insert(data);
            if (error) throw error;
          }
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
