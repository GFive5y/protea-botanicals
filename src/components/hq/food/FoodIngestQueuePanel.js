// src/components/hq/food/FoodIngestQueuePanel.js
// WP-TABLE-UNIFY Phase 2B.4 — Ingest Queue review/approve/reject panel
// DS6 Part 16 Tier 1 table, confidence badges, review drawer
// Rules: RULE 0F (tenant_id), LL-285 (defence-in-depth), LL-304

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../services/supabaseClient";
import { logAudit } from "../../../services/auditPlacemarker";
import { T } from "../../../styles/tokens";
import { categoryForSubcategory } from "../FoodWorlds";
import { AlertCircle, Check, X, Edit3, FileText } from "lucide-react";

/* ── confidence badge helper ─────────────────────────────────────── */

function confidenceBadge(value) {
  const v = Number(value) || 0;
  if (v >= 0.70) return { color: T.successText, bg: T.successLight, bd: T.successBd, label: "High" };
  if (v >= 0.50) return { color: T.warningText, bg: T.warningLight, bd: T.warningBd, label: "Review" };
  return { color: T.dangerText, bg: T.dangerLight, bd: T.dangerBd, label: "Verify" };
}

/* ── table styles (DS6 Part 16 Tier 1) ───────────────────────────── */

const sTh = {
  padding: "11px 12px",
  textAlign: "left",
  fontFamily: T.font,
  fontSize: T.text.xs,
  fontWeight: T.weight.semibold,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `1.5px solid ${T.ink}`,
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  background: T.surface,
  zIndex: 2,
};

const sTd = {
  padding: "11px 12px",
  fontSize: T.text.sm,
  fontFamily: T.font,
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: "top",
};

/* ── allergen pill ───────────────────────────────────────────────── */

function AllergenPill({ name, present }) {
  if (!present) return null;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 6px",
        fontSize: T.text.xxs,
        fontWeight: T.weight.semibold,
        borderRadius: T.radius.full,
        background: T.dangerLight,
        color: T.dangerText,
        marginRight: 4,
        marginBottom: 2,
      }}
    >
      {name}
    </span>
  );
}

/* ── status filter tabs ──────────────────────────────────────────── */

const STATUS_FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

/* ── review drawer ───────────────────────────────────────────────── */

function ReviewDrawer({ row, onClose, onApproved, onRejected, tenantId }) {
  const ai = row.ai_extracted_data || {};
  const [editedData, setEditedData] = useState({ ...ai });
  const [saving, setSaving] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState(null);

  const isApproved = row.status === "approved";
  const isRejected = row.status === "rejected";
  const isPending = row.status === "pending";

  function setField(key, val) {
    setEditedData((prev) => ({ ...prev, [key]: val }));
  }

  function buildDiff() {
    const changed = [];
    const before = {};
    const after = {};
    for (const key of Object.keys(editedData)) {
      const aiVal = JSON.stringify(ai[key]);
      const editVal = JSON.stringify(editedData[key]);
      if (aiVal !== editVal) {
        changed.push(key);
        before[key] = ai[key];
        after[key] = editedData[key];
      }
    }
    return { changed_fields: changed, before, after };
  }

  async function handleApprove() {
    setSaving(true);
    setError(null);
    try {
      const diff = buildDiff();
      const finalPayload = { ...editedData };
      const { data, error: rpcErr } = await supabase.rpc("fn_approve_ingested_ingredient", {
        p_queue_id: row.id,
        p_user_edits: diff,
        p_final_payload: finalPayload,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      const createdId = data?.[0]?.created_food_ingredient_id;
      logAudit({
        action: "ingredient.ingest.approve",
        targetType: "food_ingredient",
        targetId: createdId,
        tenantId,
        diff: { queue_id: row.id, changed_fields: diff.changed_fields },
      });
      onApproved?.();
      onClose();
    } catch (err) {
      setError(err.message || "Approve failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (rejectReason.length < 10) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from("ingredient_ingest_queue")
        .update({
          status: "rejected",
          user_edits: { reject_reason: rejectReason, rejected_at: new Date().toISOString() },
          approved_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("tenant_id", tenantId); // LL-285

      if (updErr) throw new Error(updErr.message);

      logAudit({
        action: "ingredient.ingest.reject",
        targetType: "ingredient_ingest_queue",
        targetId: row.id,
        tenantId,
        diff: { reject_reason: rejectReason },
      });
      onRejected?.();
      onClose();
    } catch (err) {
      setError(err.message || "Reject failed");
    } finally {
      setSaving(false);
    }
  }

  const badge = confidenceBadge(row.confidence_score);

  const FIELDS = [
    { key: "name", label: "Name", type: "text" },
    { key: "common_name", label: "Common Name", type: "text" },
    { key: "sub_category", label: "Sub-category", type: "text" },
    { key: "default_unit", label: "Unit", type: "text" },
    { key: "haccp_risk_level", label: "HACCP Risk", type: "select", options: ["low", "medium", "high", "critical"] },
    { key: "temperature_zone", label: "Temp Zone", type: "select", options: ["frozen", "chilled", "ambient", "hot_hold"] },
    { key: "shelf_life_days", label: "Shelf Life (days)", type: "number" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={saving ? undefined : onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: T.z.overlay,
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 480, // Review drawer spec width
          background: T.surface,
          boxShadow: T.shadow.xl,
          zIndex: T.z.modal,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: `${T.pad.lg}px ${T.pad.xl}px`,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div>
            <h3 style={{
              margin: 0, fontSize: T.text.lg, fontWeight: T.weight.semibold, fontFamily: T.font,
            }}>
              Review Ingredient
            </h3>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: T.gap.sm }}>
              <span style={{
                display: "inline-block", padding: "2px 8px",
                fontSize: T.text.xxs, fontWeight: T.weight.semibold,
                borderRadius: T.radius.full,
                background: badge.bg, color: badge.color, border: `1px solid ${badge.bd}`,
              }}>
                {badge.label} ({Math.round((row.confidence_score || 0) * 100)}%)
              </span>
              <span style={{ fontSize: T.text.xs, color: T.ink400 }}>
                {row.status}
              </span>
            </div>
          </div>
          <button
            onClick={saving ? undefined : onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.ink400, padding: T.pad.xs }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: T.pad.xl }}>
          {/* Allergens summary */}
          {ai.allergen_flags && Object.keys(ai.allergen_flags).length > 0 && (
            <div style={{ marginBottom: T.gap.lg }}>
              <div style={{ fontSize: T.text.xs, fontWeight: T.weight.semibold, color: T.ink400, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: T.gap.xs }}>
                Allergens (AI-detected)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Object.entries(ai.allergen_flags).map(([k, v]) => (
                  <AllergenPill key={k} name={k} present={v} />
                ))}
              </div>
            </div>
          )}

          {/* Fields — editable for pending rows */}
          {FIELDS.map(({ key, label, type, options }) => (
            <div key={key} style={{ marginBottom: T.gap.md }}>
              <label style={{
                display: "block", fontSize: T.text.xs, fontWeight: T.weight.semibold,
                color: T.ink400, letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: T.gap.xs,
              }}>
                {label}
                {ai[key] !== undefined && String(ai[key]) !== String(editedData[key]) && (
                  <span style={{ color: T.warningText, marginLeft: T.gap.sm, textTransform: "none", letterSpacing: "normal" }}>
                    (edited — AI: {String(ai[key])})
                  </span>
                )}
              </label>
              {isPending ? (
                type === "select" ? (
                  <select
                    value={editedData[key] || ""}
                    onChange={(e) => setField(key, e.target.value)}
                    style={{
                      width: "100%", padding: `${T.pad.sm}px ${T.pad.md}px`,
                      border: `1px solid ${T.border}`, borderRadius: T.radius.smPlus,
                      fontFamily: T.font, fontSize: T.text.base,
                    }}
                  >
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={editedData[key] ?? ""}
                    onChange={(e) => setField(key, type === "number" ? Number(e.target.value) : e.target.value)}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: `${T.pad.sm}px ${T.pad.md}px`,
                      border: `1px solid ${T.border}`, borderRadius: T.radius.smPlus,
                      fontFamily: T.font, fontSize: T.text.base,
                    }}
                  />
                )
              ) : (
                <div style={{ fontSize: T.text.base, color: T.ink, padding: `${T.pad.sm}px 0` }}>
                  {String(editedData[key] ?? ai[key] ?? "—")}
                </div>
              )}
            </div>
          ))}

          {/* Reject reason display for rejected rows */}
          {isRejected && row.user_edits?.reject_reason && (
            <div style={{
              padding: T.pad.md, background: T.dangerLight, border: `1px solid ${T.dangerBd}`,
              borderRadius: T.radius.md, marginTop: T.gap.lg,
            }}>
              <div style={{ fontSize: T.text.xs, fontWeight: T.weight.semibold, color: T.dangerText, marginBottom: T.gap.xs }}>
                Reject reason
              </div>
              <div style={{ fontSize: T.text.sm, color: T.ink }}>{row.user_edits.reject_reason}</div>
            </div>
          )}

          {/* Reject mode textarea */}
          {rejectMode && isPending && (
            <div style={{ marginTop: T.gap.lg }}>
              <label style={{
                display: "block", fontSize: T.text.xs, fontWeight: T.weight.semibold,
                color: T.dangerText, letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: T.gap.xs,
              }}>
                Reject reason (min 10 characters)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why is this extraction being rejected?"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: T.pad.md, border: `1px solid ${T.dangerBd}`,
                  borderRadius: T.radius.smPlus, fontFamily: T.font, fontSize: T.text.base,
                  resize: "vertical",
                }}
              />
              <div style={{ fontSize: T.text.xs, color: rejectReason.length >= 10 ? T.ink400 : T.dangerText, marginTop: T.gap.xs, textAlign: "right" }}>
                {rejectReason.length} / 10 min
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: T.gap.sm,
              padding: `${T.pad.md}px ${T.pad.lg}px`, background: T.dangerLight,
              border: `1px solid ${T.dangerBd}`, borderRadius: T.radius.md, marginTop: T.gap.lg,
              fontSize: T.text.sm, color: T.ink,
            }}>
              <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0, color: T.danger }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {isPending && (
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: T.gap.sm,
            padding: `${T.pad.md}px ${T.pad.xl}px`, borderTop: `1px solid ${T.border}`,
          }}>
            {rejectMode ? (
              <>
                <button
                  onClick={() => setRejectMode(false)}
                  disabled={saving}
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.lg}px`, background: "transparent",
                    color: T.ink, border: `1px solid ${T.border}`, borderRadius: T.radius.md,
                    cursor: "pointer", fontFamily: T.font, fontSize: T.text.base,
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleReject}
                  disabled={saving || rejectReason.length < 10}
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.lg}px`,
                    background: rejectReason.length < 10 ? T.ink400 : T.danger,
                    color: T.surface, border: "none", borderRadius: T.radius.md,
                    cursor: rejectReason.length < 10 ? "not-allowed" : "pointer",
                    fontWeight: T.weight.semibold, fontFamily: T.font, fontSize: T.text.base,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Rejecting…" : "Confirm Reject"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setRejectMode(true)}
                  disabled={saving}
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.lg}px`, background: "transparent",
                    color: T.danger, border: `1px solid ${T.dangerBd}`, borderRadius: T.radius.md,
                    cursor: "pointer", fontFamily: T.font, fontSize: T.text.base,
                  }}
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  style={{
                    padding: `${T.pad.sm}px ${T.pad.lg}px`, background: T.accent,
                    color: T.surface, border: "none", borderRadius: T.radius.md,
                    cursor: "pointer", fontWeight: T.weight.semibold, fontFamily: T.font,
                    fontSize: T.text.base, opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Approving…" : "Approve"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ── main component ──────────────────────────────────────────────── */

export default function FoodIngestQueuePanel({ tenantId, industryProfile, onApproved }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchQueue = useCallback(async () => {
    if (!tenantId || industryProfile !== "food_beverage") return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredient_ingest_queue")
      .select("*")
      .eq("tenant_id", tenantId) // LL-285
      .eq("status", statusFilter)
      .order("created_at", { ascending: false });
    if (!error) setRows(data || []);
    setLoading(false);
  }, [tenantId, industryProfile, statusFilter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  function handleApprovedOrRejected() {
    fetchQueue();
    onApproved?.();
  }

  if (industryProfile !== "food_beverage") return null;

  return (
    <div>
      {/* Status filter tabs */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: `1px solid ${T.border}`, marginBottom: T.gap.lg,
      }}>
        {STATUS_FILTERS.map((sf) => (
          <button
            key={sf.id}
            onClick={() => setStatusFilter(sf.id)}
            style={{
              padding: `${T.pad.sm}px ${T.pad.lg}px`, background: "none", border: "none",
              borderBottom: statusFilter === sf.id ? `2px solid ${T.accent}` : "2px solid transparent",
              color: statusFilter === sf.id ? T.accent : T.ink400,
              fontWeight: statusFilter === sf.id ? T.weight.semibold : T.weight.normal,
              fontSize: T.text.sm, fontFamily: T.font, cursor: "pointer",
            }}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: T.pad.xxl, color: T.ink400, fontSize: T.text.sm }}>
          Loading…
        </div>
      )}

      {/* Empty state */}
      {!loading && rows.length === 0 && (
        <div style={{
          textAlign: "center", padding: T.pad.xxl, color: T.ink400,
        }}>
          <FileText size={32} style={{ marginBottom: T.gap.sm, opacity: 0.5 }} />
          <div style={{ fontSize: T.text.base, fontWeight: T.weight.medium, marginBottom: T.gap.xs }}>
            {statusFilter === "pending"
              ? "No pending extractions."
              : statusFilter === "approved"
                ? "No approved ingredients yet."
                : "No rejected extractions."}
          </div>
          {statusFilter === "pending" && (
            <div style={{ fontSize: T.text.sm }}>
              Upload a document via "+ Add from Document" to extract ingredients.
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && rows.length > 0 && (
        <div style={{ padding: "0 16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={sTh}>Name</th>
                <th style={sTh}>Sub-category</th>
                <th style={sTh}>Allergens</th>
                <th style={sTh}>HACCP</th>
                <th style={sTh}>Confidence</th>
                <th style={sTh}>Created</th>
                <th style={{ ...sTh, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const ai = row.ai_extracted_data || {};
                const badge = confidenceBadge(row.confidence_score);
                const allergens = ai.allergen_flags || {};
                const activeAllergens = Object.entries(allergens).filter(([, v]) => v);

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: idx % 2 === 0 ? T.surface : T.surfaceAlt,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? T.surface : T.surfaceAlt; }}
                    onClick={() => setSelectedRow(row)}
                  >
                    <td style={sTd}>
                      <div style={{ fontWeight: T.weight.medium }}>{ai.name || "—"}</div>
                      {ai.common_name && ai.common_name !== ai.name && (
                        <div style={{ fontSize: T.text.xs, color: T.ink400 }}>{ai.common_name}</div>
                      )}
                    </td>
                    <td style={sTd}>
                      <span style={{ fontSize: T.text.sm, color: T.ink }}>{ai.sub_category || row.suggested_sub_category || "—"}</span>
                    </td>
                    <td style={sTd}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {activeAllergens.length > 0
                          ? activeAllergens.slice(0, 4).map(([k]) => <AllergenPill key={k} name={k} present />)
                          : <span style={{ fontSize: T.text.xs, color: T.ink400 }}>none</span>}
                        {activeAllergens.length > 4 && (
                          <span style={{ fontSize: T.text.xxs, color: T.ink400 }}>+{activeAllergens.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td style={sTd}>
                      <span style={{ fontSize: T.text.sm }}>{ai.haccp_risk_level || row.suggested_haccp_level || "—"}</span>
                    </td>
                    <td style={sTd}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px",
                        fontSize: T.text.xxs, fontWeight: T.weight.semibold,
                        borderRadius: T.radius.full,
                        background: badge.bg, color: badge.color, border: `1px solid ${badge.bd}`,
                      }}>
                        {badge.label} ({Math.round((row.confidence_score || 0) * 100)}%)
                      </span>
                    </td>
                    <td style={sTd}>
                      <span style={{ fontSize: T.text.xs, color: T.ink400 }}>
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td style={{ ...sTd, textAlign: "right" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedRow(row); }}
                        style={{
                          background: "none", border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                          padding: `${T.pad.xs}px ${T.pad.sm}px`, cursor: "pointer",
                          fontSize: T.text.xs, fontFamily: T.font, color: T.accent,
                          display: "inline-flex", alignItems: "center", gap: T.gap.xs,
                        }}
                      >
                        {row.status === "pending" ? <><Edit3 size={12} /> Review</> : <><FileText size={12} /> View</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review drawer */}
      {selectedRow && (
        <ReviewDrawer
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onApproved={handleApprovedOrRejected}
          onRejected={handleApprovedOrRejected}
          tenantId={tenantId}
        />
      )}
    </div>
  );
}
