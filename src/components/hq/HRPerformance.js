// HRPerformance.js v1.1 — WP-VISUAL
// WP-HR-10: Performance Reviews — KPI form, PIP tracker
// Location: src/components/hq/HRPerformance.js
//
// ── CONFIRMED SCHEMA ──────────────────────────────────────────────────────────
// performance_reviews:
//   id, staff_profile_id, tenant_id,
//   review_type (NOT NULL), review_period_start, review_period_end,
//   due_date, completed_date, reviewed_by, hr_signed_off_by,
//   scores (jsonb), overall_score, rating_label,
//   manager_comments, employee_comments, strengths, development_areas,
//   goals (jsonb), pip_start_date, pip_end_date, pip_targets, pip_outcome,
//   status, document_url, created_at, updated_at
//
// ── HARDCODED ENUM VALUES (table empty at build time) ─────────────────────────
// review_type:  annual | probation | quarterly | pip | adhoc
// status:       draft | in_progress | completed | hr_signed_off
// rating_label: Excellent | Good | Satisfactory | Needs Improvement | Unsatisfactory
//
// ── JSONB STRUCTURES ──────────────────────────────────────────────────────────
// scores: { [category]: { score: number (1-5), comment: string } }
//   default categories: Quality of Work | Punctuality & Attendance |
//                       Communication | Teamwork | Initiative
// goals:  [ { title, target_date, status, notes } ]
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";
// Design tokens — imported from tokens.js (WP-UNIFY)

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const REVIEW_TYPES = ["annual", "probation", "quarterly", "pip", "adhoc"];
const STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
const RATING_LABELS = [
  "Excellent",
  "Good",
  "Satisfactory",
  "Needs Improvement",
  "Unsatisfactory",
];
const GOAL_STATUSES = ["not_started", "in_progress", "achieved", "missed"];

const KPI_CATEGORIES = [
  "Quality of Work",
  "Punctuality & Attendance",
  "Communication",
  "Teamwork",
  "Initiative",
];

const SCORE_TO_LABEL = {
  5: "Excellent",
  4: "Good",
  3: "Satisfactory",
  2: "Needs Improvement",
  1: "Unsatisfactory",
};

// Legacy aliases — all internal C.* and FONTS.* references resolve correctly
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  cream: T.surface,
  border: T.border,
  muted: T.ink500,
  white: "#fff",
  red: T.danger,
  bg: T.bg,
};
const FONTS = { heading: T.font, body: T.font };

// ─── STATUS / RATING COLOURS ─────────────────────────────────────────────────
const STATUS_STYLES = {
  scheduled: { bg: "#f5f5f5", color: "#666", border: "#ddd" },
  in_progress: { bg: "#fff8e1", color: "#f57f17", border: "#ffe082" },
  completed: { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
  cancelled: { bg: "#fce4ec", color: "#c62828", border: "#ef9a9a" },
};

const RATING_STYLES = {
  Excellent: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  Good: { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
  Satisfactory: { bg: "#fff8e1", color: "#f57f17", border: "#ffe082" },
  "Needs Improvement": { bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
  Unsatisfactory: { bg: "#fce4ec", color: "#c62828", border: "#ef9a9a" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || {
    bg: "#f5f5f5",
    color: "#666",
    border: "#ddd",
  };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {status?.replace(/_/g, " ") || "—"}
    </span>
  );
}

function RatingBadge({ label }) {
  if (!label) return <span style={{ color: C.muted }}>—</span>;
  const s = RATING_STYLES[label] || {
    bg: "#f5f5f5",
    color: "#666",
    border: "#ddd",
  };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function safeJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function calcOverallScore(scores) {
  const vals = Object.values(scores)
    .map((v) => parseFloat(v?.score))
    .filter((n) => !isNaN(n));
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}

function scoreToLabel(score) {
  if (!score) return null;
  const n = Math.round(parseFloat(score));
  return SCORE_TO_LABEL[n] || null;
}

// ─── FIELD + INPUT HELPERS ────────────────────────────────────────────────────

function Field({ label, children, required, col }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        gridColumn: col,
      }}
    >
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {label}
        {required && <span style={{ color: C.red }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inp = {
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: T.font,
  background: C.white,
  color: "#333",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const sel = { ...inp, cursor: "pointer" };

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(onClose, 5000);
      return () => clearTimeout(t);
    }
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: toast.type === "error" ? C.red : "#2e7d32",
        color: "#fff",
        borderRadius: 8,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: T.font,
        maxWidth: 400,
      }}
    >
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── KPI SCORE EDITOR ─────────────────────────────────────────────────────────

function KPIEditor({ scores, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {KPI_CATEGORIES.map((cat) => {
        const entry = scores[cat] || { score: "", comment: "" };
        return (
          <div
            key={cat}
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.green,
                  flex: 1,
                }}
              >
                {cat}
              </span>
              <select
                value={entry.score}
                onChange={(e) => onChange(cat, "score", e.target.value)}
                style={{ ...sel, width: 160, fontSize: 12 }}
              >
                <option value="">— Score —</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} — {SCORE_TO_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={entry.comment}
              onChange={(e) => onChange(cat, "comment", e.target.value)}
              style={{ ...inp, fontSize: 12 }}
              placeholder="Optional comment for this KPI"
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── GOALS EDITOR ─────────────────────────────────────────────────────────────

function GoalsEditor({ goals, onChange }) {
  function addGoal() {
    onChange([
      ...goals,
      { title: "", target_date: "", status: "not_started", notes: "" },
    ]);
  }
  function removeGoal(i) {
    onChange(goals.filter((_, idx) => idx !== i));
  }
  function updateGoal(i, key, val) {
    const updated = goals.map((g, idx) =>
      idx === i ? { ...g, [key]: val } : g,
    );
    onChange(updated);
  }

  return (
    <div>
      {goals.map((goal, i) => (
        <div
          key={i}
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: "12px 14px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <input
              value={goal.title}
              onChange={(e) => updateGoal(i, "title", e.target.value)}
              style={{ ...inp, fontSize: 12 }}
              placeholder="Goal title"
            />
            <input
              type="date"
              value={goal.target_date}
              onChange={(e) => updateGoal(i, "target_date", e.target.value)}
              style={{ ...inp, width: 140, fontSize: 12 }}
            />
            <button
              onClick={() => removeGoal(i)}
              style={{
                background: "#fce4ec",
                border: "1px solid #ef9a9a",
                borderRadius: 2,
                padding: "6px 10px",
                cursor: "pointer",
                color: C.red,
                fontSize: 12,
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <select
              value={goal.status}
              onChange={(e) => updateGoal(i, "status", e.target.value)}
              style={{ ...sel, fontSize: 12 }}
            >
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            <input
              value={goal.notes}
              onChange={(e) => updateGoal(i, "notes", e.target.value)}
              style={{ ...inp, fontSize: 12 }}
              placeholder="Notes"
            />
          </div>
        </div>
      ))}
      <button
        onClick={addGoal}
        style={{
          background: "none",
          border: `1px dashed ${C.accent}`,
          borderRadius: 2,
          padding: "8px 16px",
          cursor: "pointer",
          color: C.mid,
          fontSize: 12,
          fontFamily: T.font,
          fontWeight: 600,
          width: "100%",
        }}
      >
        + Add Goal
      </button>
    </div>
  );
}

// ─── REVIEW MODAL ─────────────────────────────────────────────────────────────

function ReviewModal({ review, staff, tenantId, onClose, onSaved }) {
  const isEdit = !!review?.id;
  const [activeSection, setActiveSection] = useState("details");

  const [form, setForm] = useState({
    staff_profile_id: review?.staff_profile_id || "",
    review_type: review?.review_type || "annual",
    review_period_start: review?.review_period_start || "",
    review_period_end: review?.review_period_end || "",
    due_date: review?.due_date || "",
    completed_date: review?.completed_date || "",
    status: review?.status || "scheduled",
    rating_label: review?.rating_label || "",
    overall_score: review?.overall_score || "",
    manager_comments: review?.manager_comments || "",
    employee_comments: review?.employee_comments || "",
    strengths: review?.strengths || "",
    development_areas: review?.development_areas || "",
    pip_start_date: review?.pip_start_date || "",
    pip_end_date: review?.pip_end_date || "",
    pip_targets: review?.pip_targets || "",
    pip_outcome: review?.pip_outcome || "",
    document_url: review?.document_url || "",
  });

  const [scores, setScores] = useState(safeJson(review?.scores, {}));
  const [goals, setGoals] = useState(safeJson(review?.goals, []));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function handleScoreChange(cat, key, val) {
    setScores((prev) => ({
      ...prev,
      [cat]: { ...(prev[cat] || {}), [key]: val },
    }));
  }

  // Auto-update overall_score + rating_label from KPI scores
  useEffect(() => {
    const avg = calcOverallScore(scores);
    if (avg) {
      setForm((p) => ({
        ...p,
        overall_score: avg,
        rating_label: scoreToLabel(avg) || p.rating_label,
      }));
    }
  }, [scores]);

  const isPIP = form.review_type === "pip";

  const SECTIONS = [
    { id: "details", label: "Details" },
    { id: "kpi", label: "KPI Scores" },
    { id: "feedback", label: "Feedback" },
    { id: "goals", label: "Goals" },
    ...(isPIP ? [{ id: "pip", label: "PIP" }] : []),
  ];

  async function handleSave() {
    if (!form.staff_profile_id) return setErr("Select a staff member.");
    if (!form.review_type) return setErr("Review type is required.");
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        staff_profile_id: form.staff_profile_id,
        tenant_id: tenantId,
        review_type: form.review_type,
        review_period_start: form.review_period_start || null,
        review_period_end: form.review_period_end || null,
        due_date: form.due_date || null,
        completed_date: form.completed_date || null,
        status: form.status,
        scores: Object.keys(scores).length ? scores : null,
        overall_score: form.overall_score
          ? parseFloat(form.overall_score)
          : null,
        rating_label: form.rating_label || null,
        manager_comments: form.manager_comments || null,
        employee_comments: form.employee_comments || null,
        strengths: form.strengths || null,
        development_areas: form.development_areas || null,
        goals: goals.length ? goals : null,
        pip_start_date: form.pip_start_date || null,
        pip_end_date: form.pip_end_date || null,
        pip_targets: form.pip_targets || null,
        pip_outcome: form.pip_outcome || null,
        document_url: form.document_url || null,
      };
      const { error } = isEdit
        ? await supabase
            .from("performance_reviews")
            .update(payload)
            .eq("id", review.id)
        : await supabase.from("performance_reviews").insert(payload);
      if (error) throw error;
      onSaved(`Review ${isEdit ? "updated" : "created"} successfully.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: 4,
          width: "100%",
          maxWidth: 640,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          fontFamily: T.font,
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "20px 28px 0",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontFamily: T.font,
                fontSize: 18,
                fontWeight: 600,
                color: T.ink900,
                margin: 0,
              }}
            >
              {isEdit ? "Edit" : "New"} Performance Review
            </h3>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 22,
                cursor: "pointer",
                color: C.muted,
              }}
            >
              ×
            </button>
          </div>
          {/* Section tabs — underline only */}
          <div style={{ display: "flex", gap: 0 }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    activeSection === s.id
                      ? `2px solid ${T.accent}`
                      : "2px solid transparent",
                  color: activeSection === s.id ? T.accent : T.ink500,
                  fontFamily: T.font,
                  fontSize: 11,
                  fontWeight: activeSection === s.id ? 700 : 400,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "10px 16px",
                  cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {err && (
            <div
              style={{
                background: "#fce4ec",
                border: "1px solid #ef9a9a",
                borderRadius: 4,
                padding: "10px 14px",
                color: C.red,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {err}
            </div>
          )}

          {/* ── DETAILS SECTION ── */}
          {activeSection === "details" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="Staff Member" required col="1/-1">
                <select
                  value={form.staff_profile_id}
                  onChange={(e) => set("staff_profile_id", e.target.value)}
                  style={sel}
                >
                  <option value="">— Select staff —</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.preferred_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Review Type" required>
                <select
                  value={form.review_type}
                  onChange={(e) => set("review_type", e.target.value)}
                  style={sel}
                >
                  {REVIEW_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  style={sel}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Period Start">
                <input
                  type="date"
                  value={form.review_period_start}
                  onChange={(e) => set("review_period_start", e.target.value)}
                  style={inp}
                />
              </Field>
              <Field label="Period End">
                <input
                  type="date"
                  value={form.review_period_end}
                  onChange={(e) => set("review_period_end", e.target.value)}
                  style={inp}
                />
              </Field>
              <Field label="Due Date">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                  style={inp}
                />
              </Field>
              <Field label="Completed Date">
                <input
                  type="date"
                  value={form.completed_date}
                  onChange={(e) => set("completed_date", e.target.value)}
                  style={inp}
                />
              </Field>
              <Field label="Overall Score (auto)">
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.01"
                  value={form.overall_score}
                  onChange={(e) => set("overall_score", e.target.value)}
                  style={{ ...inp, background: "#f9f9f9" }}
                  placeholder="Auto-calculated from KPI scores"
                />
              </Field>
              <Field label="Rating Label">
                <select
                  value={form.rating_label}
                  onChange={(e) => set("rating_label", e.target.value)}
                  style={sel}
                >
                  <option value="">— Select —</option>
                  {RATING_LABELS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Document URL" col="1/-1">
                <input
                  value={form.document_url}
                  onChange={(e) => set("document_url", e.target.value)}
                  style={inp}
                  placeholder="https://..."
                />
              </Field>
            </div>
          )}

          {/* ── KPI SCORES SECTION ── */}
          {activeSection === "kpi" && (
            <div>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
                Score each category 1–5. Overall score and rating label are
                calculated automatically.
              </p>
              <KPIEditor scores={scores} onChange={handleScoreChange} />
              {form.overall_score && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: C.green }}
                  >
                    Overall Score
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span
                      style={{
                        fontFamily: T.font,
                        fontSize: 22,
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        fontVariantNumeric: "tabular-nums",
                        color: T.accent,
                      }}
                    >
                      {form.overall_score} / 5
                    </span>
                    <RatingBadge label={form.rating_label} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FEEDBACK SECTION ── */}
          {activeSection === "feedback" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Strengths">
                <textarea
                  value={form.strengths}
                  onChange={(e) => set("strengths", e.target.value)}
                  rows={3}
                  style={{ ...inp, resize: "vertical" }}
                  placeholder="Key strengths observed during the review period"
                />
              </Field>
              <Field label="Development Areas">
                <textarea
                  value={form.development_areas}
                  onChange={(e) => set("development_areas", e.target.value)}
                  rows={3}
                  style={{ ...inp, resize: "vertical" }}
                  placeholder="Areas identified for growth and improvement"
                />
              </Field>
              <Field label="Manager Comments">
                <textarea
                  value={form.manager_comments}
                  onChange={(e) => set("manager_comments", e.target.value)}
                  rows={3}
                  style={{ ...inp, resize: "vertical" }}
                  placeholder="Overall manager assessment"
                />
              </Field>
              <Field label="Employee Comments">
                <textarea
                  value={form.employee_comments}
                  onChange={(e) => set("employee_comments", e.target.value)}
                  rows={3}
                  style={{ ...inp, resize: "vertical" }}
                  placeholder="Employee's own comments or response"
                />
              </Field>
            </div>
          )}

          {/* ── GOALS SECTION ── */}
          {activeSection === "goals" && (
            <div>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
                Set measurable goals with target dates and track their progress.
              </p>
              <GoalsEditor goals={goals} onChange={setGoals} />
            </div>
          )}

          {/* ── PIP SECTION ── */}
          {activeSection === "pip" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  background: "#fff3e0",
                  border: "1px solid #ffcc80",
                  borderRadius: 4,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#e65100",
                }}
              >
                ⚠ Performance Improvement Plan — complete all fields and ensure
                the employee has been formally notified.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <Field label="PIP Start Date">
                  <input
                    type="date"
                    value={form.pip_start_date}
                    onChange={(e) => set("pip_start_date", e.target.value)}
                    style={inp}
                  />
                </Field>
                <Field label="PIP End Date">
                  <input
                    type="date"
                    value={form.pip_end_date}
                    onChange={(e) => set("pip_end_date", e.target.value)}
                    style={inp}
                  />
                </Field>
              </div>
              <Field label="PIP Targets">
                <textarea
                  value={form.pip_targets}
                  onChange={(e) => set("pip_targets", e.target.value)}
                  rows={4}
                  style={{ ...inp, resize: "vertical" }}
                  placeholder="Specific, measurable targets the employee must achieve during the PIP period"
                />
              </Field>
              <Field label="PIP Outcome">
                <textarea
                  value={form.pip_outcome}
                  onChange={(e) => set("pip_outcome", e.target.value)}
                  rows={3}
                  style={{ ...inp, resize: "vertical" }}
                  placeholder="Final outcome — completed after PIP period ends"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div
          style={{
            padding: "14px 28px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {activeSection !== SECTIONS[0].id && (
              <button
                onClick={() =>
                  setActiveSection(
                    SECTIONS[
                      SECTIONS.findIndex((s) => s.id === activeSection) - 1
                    ].id,
                  )
                }
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: T.font,
                  color: C.muted,
                }}
              >
                ← Back
              </button>
            )}
            {activeSection !== SECTIONS[SECTIONS.length - 1].id && (
              <button
                onClick={() =>
                  setActiveSection(
                    SECTIONS[
                      SECTIONS.findIndex((s) => s.id === activeSection) + 1
                    ].id,
                  )
                }
                style={{
                  padding: "8px 16px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: T.font,
                  color: C.green,
                  fontWeight: 600,
                }}
              >
                Next →
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 20px",
                background: "none",
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: T.font,
                fontWeight: 600,
                color: C.muted,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "9px 24px",
                background: C.green,
                color: C.white,
                border: "none",
                borderRadius: 2,
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: 12,
                fontFamily: T.font,
                fontWeight: 700,
                letterSpacing: "0.1em",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REVIEW DETAIL DRAWER ─────────────────────────────────────────────────────

function ReviewDrawer({ review, staffName, onClose, onEdit }) {
  if (!review) return null;
  const scores = safeJson(review.scores, {});
  const goals = safeJson(review.goals, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          width: 420,
          maxWidth: "100%",
          height: "100%",
          overflowY: "auto",
          padding: 28,
          fontFamily: T.font,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              {review.review_type}
            </div>
            <h3
              style={{
                fontFamily: T.font,
                fontSize: 18,
                fontWeight: 600,
                color: T.ink900,
                margin: "4px 0 6px",
              }}
            >
              {staffName}
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              <StatusBadge status={review.status} />
              {review.rating_label && (
                <RatingBadge label={review.rating_label} />
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: C.muted,
            }}
          >
            ×
          </button>
        </div>

        <button
          onClick={onEdit}
          style={{
            width: "100%",
            padding: "9px 0",
            background: C.green,
            color: C.white,
            border: "none",
            borderRadius: 2,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: T.font,
            letterSpacing: "0.1em",
            marginBottom: 20,
          }}
        >
          Edit Review
        </button>

        {/* Period + score */}
        <Section title="Overview">
          <DRow
            label="Period"
            value={
              review.review_period_start
                ? `${formatDate(review.review_period_start)} – ${formatDate(review.review_period_end)}`
                : "—"
            }
          />
          <DRow label="Due" value={formatDate(review.due_date)} />
          <DRow label="Completed" value={formatDate(review.completed_date)} />
          {review.overall_score && (
            <DRow label="Score">
              <span
                style={{
                  fontFamily: T.font,
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  fontVariantNumeric: "tabular-nums",
                  color: T.accent,
                }}
              >
                {parseFloat(review.overall_score).toFixed(2)} / 5
              </span>
            </DRow>
          )}
        </Section>

        {/* KPI scores */}
        {Object.keys(scores).length > 0 && (
          <Section title="KPI Scores">
            {KPI_CATEGORIES.filter((cat) => scores[cat]?.score).map((cat) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#555" }}>{cat}</span>
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: C.green }}
                  >
                    {scores[cat].score} / 5 —{" "}
                    {SCORE_TO_LABEL[scores[cat].score]}
                  </span>
                </div>
                {scores[cat].comment && (
                  <div style={{ fontSize: 11, color: C.muted, paddingLeft: 8 }}>
                    {scores[cat].comment}
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Feedback */}
        {(review.strengths ||
          review.development_areas ||
          review.manager_comments ||
          review.employee_comments) && (
          <Section title="Feedback">
            {review.strengths && (
              <DRow label="Strengths" value={review.strengths} />
            )}
            {review.development_areas && (
              <DRow label="Development" value={review.development_areas} />
            )}
            {review.manager_comments && (
              <DRow label="Manager" value={review.manager_comments} />
            )}
            {review.employee_comments && (
              <DRow label="Employee" value={review.employee_comments} />
            )}
          </Section>
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <Section title="Goals">
            {goals.map((g, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  background: C.bg,
                  borderRadius: 3,
                  border: `1px solid ${C.border}`,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#333" }}
                  >
                    {g.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: C.muted,
                    }}
                  >
                    {g.status?.replace(/_/g, " ")}
                  </span>
                </div>
                {g.target_date && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    Due {formatDate(g.target_date)}
                  </div>
                )}
                {g.notes && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>
                    {g.notes}
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* PIP */}
        {review.review_type === "pip" && review.pip_start_date && (
          <Section title="PIP Details">
            <DRow
              label="PIP Period"
              value={`${formatDate(review.pip_start_date)} – ${formatDate(review.pip_end_date)}`}
            />
            {review.pip_targets && (
              <DRow label="Targets" value={review.pip_targets} />
            )}
            {review.pip_outcome && (
              <DRow label="Outcome" value={review.pip_outcome} />
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function DRow({ label, value, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span
        style={{
          color: C.muted,
          fontSize: 12,
          fontWeight: 600,
          minWidth: 90,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {children || (
        <span style={{ color: "#444", fontSize: 13, lineHeight: 1.5 }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function HRPerformance({ tenantId }) {
  const [reviews, setReviews] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | review obj
  const [drawer, setDrawer] = useState(null); // review obj
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState(null);

  const staffMap = {};
  staff.forEach((s) => {
    staffMap[s.id] = s.full_name || s.preferred_name;
  });

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("staff_profiles")
      .select("id, full_name, preferred_name")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setStaff(data || []));
  }, [tenantId]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("performance_reviews")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (!error) setReviews(data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  function onSaved(msg) {
    setModal(null);
    setToast({ type: "success", msg });
    load();
  }

  const filtered = reviews.filter((r) => {
    if (filterType !== "all" && r.review_type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  // Summary
  const dueCount = reviews.filter(
    (r) =>
      r.due_date &&
      new Date(r.due_date) <= new Date() &&
      !["completed", "cancelled"].includes(r.status),
  ).length;
  const pipCount = reviews.filter(
    (r) => r.review_type === "pip" && r.status !== "cancelled",
  ).length;
  const doneCount = reviews.filter((r) =>
    ["completed", "cancelled"].includes(r.status),
  ).length;

  return (
    <div style={{ fontFamily: T.font }}>
      {/* ── STAT GRID (flush, no borderTop) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
          gap: "1px",
          background: T.border,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow.sm,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Reviews", value: reviews.length, color: T.info },
          {
            label: "Overdue",
            value: dueCount,
            color: dueCount > 0 ? T.danger : T.ink500,
          },
          {
            label: "Active PIPs",
            value: pipCount,
            color: pipCount > 0 ? T.warning : T.ink500,
          },
          { label: "Completed", value: doneCount, color: T.success },
        ].map((tile) => (
          <div
            key={tile.label}
            style={{ background: "#fff", padding: "16px 18px" }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink500,
                marginBottom: 6,
                fontFamily: T.font,
              }}
            >
              {tile.label}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 22,
                fontWeight: 400,
                color: tile.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ ...sel, width: "auto", fontSize: 12 }}
          >
            <option value="all">All Types</option>
            {REVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ ...sel, width: "auto", fontSize: 12 }}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setModal("new")}
          style={{
            padding: "9px 20px",
            background: C.green,
            color: C.white,
            border: "none",
            borderRadius: 2,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: T.font,
            letterSpacing: "0.1em",
          }}
        >
          + New Review
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            color: C.muted,
            textAlign: "center",
            padding: 48,
            fontSize: 13,
          }}
        >
          No performance reviews found. Create the first one above.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr
                style={{
                  background: C.bg,
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                {[
                  "Staff",
                  "Type",
                  "Period",
                  "Due",
                  "Score",
                  "Rating",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.muted,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const overdue =
                  r.due_date &&
                  new Date(r.due_date) < new Date() &&
                  !["completed", "cancelled"].includes(r.status);
                return (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: overdue ? "#fff8f8" : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = overdue
                        ? "#ffeeee"
                        : C.bg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = overdue
                        ? "#fff8f8"
                        : "transparent")
                    }
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      {staffMap[r.staff_profile_id] || "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          background:
                            r.review_type === "pip" ? "#fff3e0" : "#f5f5f5",
                          color: r.review_type === "pip" ? "#e65100" : "#555",
                          border: `1px solid ${r.review_type === "pip" ? "#ffcc80" : "#ddd"}`,
                          borderRadius: 20,
                          padding: "2px 9px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {r.review_type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: 12,
                        color: C.muted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.review_period_start
                        ? `${formatDate(r.review_period_start)} – ${formatDate(r.review_period_end)}`
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: 12,
                        color: overdue ? C.red : C.muted,
                        fontWeight: overdue ? 700 : 400,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(r.due_date)}
                      {overdue ? " ⚠" : ""}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontFamily: T.font,
                        fontSize: 15,
                        fontWeight: 400,
                        letterSpacing: "-0.01em",
                        fontVariantNumeric: "tabular-nums",
                        color: T.accent,
                      }}
                    >
                      {r.overall_score
                        ? `${parseFloat(r.overall_score).toFixed(1)} / 5`
                        : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <RatingBadge label={r.rating_label} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={() => setDrawer(r)}
                        style={{
                          background: "none",
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          padding: "4px 10px",
                          cursor: "pointer",
                          fontSize: 11,
                          color: C.muted,
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ReviewModal
          review={modal === "new" ? null : modal}
          staff={staff}
          tenantId={tenantId}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {drawer && (
        <ReviewDrawer
          review={drawer}
          staffName={staffMap[drawer.staff_profile_id] || "—"}
          onClose={() => setDrawer(null)}
          onEdit={() => {
            setModal(drawer);
            setDrawer(null);
          }}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
