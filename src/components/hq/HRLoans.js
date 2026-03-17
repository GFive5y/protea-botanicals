// HRLoans.js v1.0 — SCHEMA VERIFIED
// WP-HR-9: Loans & Allowances — loans_stipends + travel_allowances
// Location: src/components/hq/HRLoans.js
//
// ── CONFIRMED SCHEMAS ─────────────────────────────────────────────────────────
// loans_stipends:    id, staff_profile_id, tenant_id, record_type, description,
//                    amount_zar, disbursed_date, disbursed_method,
//                    repayment_per_period, repayment_frequency, repayment_start_date,
//                    total_repaid, outstanding_balance, repayment_log (jsonb),
//                    status, approved_by, notes, document_url, created_at, updated_at
//
// travel_allowances: id, staff_profile_id, tenant_id, allowance_type, description,
//                    travel_date, origin, destination, distance_km, rate_per_km_zar,
//                    amount_claimed_zar (NOT NULL), amount_approved_zar,
//                    odometer_start, odometer_end, receipt_url, notes,
//                    status, approved_by, approved_at, created_at, updated_at
//
// expense_claims:    TABLE DOES NOT EXIST — skipped, future WP
//
// ── HARDCODED ENUM VALUES (tables empty at build time) ────────────────────────
// loans_stipends.record_type:       loan | stipend
// loans_stipends.status:            active | completed | cancelled
// loans_stipends.repayment_frequency: weekly | monthly | once_off
// loans_stipends.disbursed_method:  cash | bank_transfer | payroll_deduction
// travel_allowances.status:         pending | approved | rejected
// travel_allowances.allowance_type: mileage | parking | toll | accommodation | other
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const RECORD_TYPES = ["loan", "stipend"];
const LOAN_STATUSES = ["active", "completed", "cancelled"];
const REPAY_FREQS = ["weekly", "monthly", "once_off"];
const DISBURSE_METHODS = ["cash", "bank_transfer", "payroll_deduction"];
const ALLOWANCE_TYPES = [
  "mileage",
  "parking",
  "toll",
  "accommodation",
  "other",
];
const TRAVEL_STATUSES = ["pending", "approved", "rejected"];

// ─── THEME ───────────────────────────────────────────────────────────────────

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
  bg: "#f7f6f2",
};

const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  active: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  completed: { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
  cancelled: { bg: "#fce4ec", color: "#c62828", border: "#ef9a9a" },
  pending: { bg: "#fff8e1", color: "#f57f17", border: "#ffe082" },
  approved: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  rejected: { bg: "#fce4ec", color: "#c62828", border: "#ef9a9a" },
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

// ─── CURRENCY FORMAT ──────────────────────────────────────────────────────────

function zar(amount) {
  if (amount == null) return "—";
  return `R ${Number(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(onClose, 5000);
      return () => clearTimeout(t);
    }
  }, [toast, onClose]);
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: isErr ? "#c62828" : "#2e7d32",
        color: "#fff",
        borderRadius: 8,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONTS.body,
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

// ─── FIELD COMPONENTS ─────────────────────────────────────────────────────────

function Field({ label, children, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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

const inputStyle = {
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: FONTS.body,
  background: C.white,
  color: "#333",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

// ─── LOAN MODAL ───────────────────────────────────────────────────────────────

function LoanModal({ loan, staff, tenantId, onClose, onSaved }) {
  const isEdit = !!loan?.id;
  const [form, setForm] = useState({
    staff_profile_id: loan?.staff_profile_id || "",
    record_type: loan?.record_type || "loan",
    description: loan?.description || "",
    amount_zar: loan?.amount_zar || "",
    disbursed_date: loan?.disbursed_date || "",
    disbursed_method: loan?.disbursed_method || "bank_transfer",
    repayment_per_period: loan?.repayment_per_period || "",
    repayment_frequency: loan?.repayment_frequency || "monthly",
    repayment_start_date: loan?.repayment_start_date || "",
    total_repaid: loan?.total_repaid || 0,
    outstanding_balance: loan?.outstanding_balance || "",
    status: loan?.status || "active",
    notes: loan?.notes || "",
    document_url: loan?.document_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Auto-calculate outstanding balance
  useEffect(() => {
    const amt = parseFloat(form.amount_zar) || 0;
    const paid = parseFloat(form.total_repaid) || 0;
    set("outstanding_balance", Math.max(0, amt - paid).toFixed(2));
  }, [form.amount_zar, form.total_repaid]);

  async function handleSave() {
    if (!form.staff_profile_id) return setErr("Select a staff member.");
    if (!form.description) return setErr("Description is required.");
    if (!form.amount_zar) return setErr("Amount is required.");
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        staff_profile_id: form.staff_profile_id,
        tenant_id: tenantId,
        record_type: form.record_type,
        description: form.description,
        amount_zar: parseFloat(form.amount_zar),
        disbursed_date: form.disbursed_date || null,
        disbursed_method: form.disbursed_method || null,
        repayment_per_period: form.repayment_per_period
          ? parseFloat(form.repayment_per_period)
          : null,
        repayment_frequency: form.repayment_frequency || null,
        repayment_start_date: form.repayment_start_date || null,
        total_repaid: parseFloat(form.total_repaid) || 0,
        outstanding_balance: parseFloat(form.outstanding_balance) || 0,
        status: form.status,
        notes: form.notes || null,
        document_url: form.document_url || null,
      };
      const { error } = isEdit
        ? await supabase
            .from("loans_stipends")
            .update(payload)
            .eq("id", loan.id)
        : await supabase.from("loans_stipends").insert(payload);
      if (error) throw error;
      onSaved(
        `${form.record_type === "loan" ? "Loan" : "Stipend"} ${isEdit ? "updated" : "created"} successfully.`,
      );
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
        background: "rgba(0,0,0,0.5)",
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
          padding: 28,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: FONTS.body,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontFamily: FONTS.heading,
              fontSize: 20,
              color: C.green,
              margin: 0,
            }}
          >
            {isEdit ? "Edit" : "New"}{" "}
            {form.record_type === "loan" ? "Loan" : "Stipend"}
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

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Staff Member" required>
              <select
                value={form.staff_profile_id}
                onChange={(e) => set("staff_profile_id", e.target.value)}
                style={selectStyle}
              >
                <option value="">— Select staff —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.preferred_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Type" required>
            <select
              value={form.record_type}
              onChange={(e) => set("record_type", e.target.value)}
              style={selectStyle}
            >
              {RECORD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" required>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              style={selectStyle}
            >
              {LOAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Description" required>
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                style={inputStyle}
                placeholder="e.g. Staff loan for vehicle repair"
              />
            </Field>
          </div>

          <Field label="Amount (ZAR)" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount_zar}
              onChange={(e) => set("amount_zar", e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>

          <Field label="Disbursed Date">
            <input
              type="date"
              value={form.disbursed_date}
              onChange={(e) => set("disbursed_date", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Disbursement Method">
            <select
              value={form.disbursed_method}
              onChange={(e) => set("disbursed_method", e.target.value)}
              style={selectStyle}
            >
              {DISBURSE_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Repayment Frequency">
            <select
              value={form.repayment_frequency}
              onChange={(e) => set("repayment_frequency", e.target.value)}
              style={selectStyle}
            >
              {REPAY_FREQS.map((f) => (
                <option key={f} value={f}>
                  {f
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Repayment Per Period (ZAR)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.repayment_per_period}
              onChange={(e) => set("repayment_per_period", e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>

          <Field label="Repayment Start Date">
            <input
              type="date"
              value={form.repayment_start_date}
              onChange={(e) => set("repayment_start_date", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Total Repaid (ZAR)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.total_repaid}
              onChange={(e) => set("total_repaid", e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>

          <Field label="Outstanding Balance (ZAR)">
            <input
              type="number"
              value={form.outstanding_balance}
              readOnly
              style={{ ...inputStyle, background: "#f5f5f5", color: C.muted }}
            />
          </Field>

          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Optional notes"
              />
            </Field>
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Document URL">
              <input
                value={form.document_url}
                onChange={(e) => set("document_url", e.target.value)}
                style={inputStyle}
                placeholder="https://..."
              />
            </Field>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONTS.body,
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
              fontFamily: FONTS.body,
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
  );
}

// ─── TRAVEL MODAL ─────────────────────────────────────────────────────────────

function TravelModal({ claim, staff, tenantId, onClose, onSaved }) {
  const isEdit = !!claim?.id;
  const [form, setForm] = useState({
    staff_profile_id: claim?.staff_profile_id || "",
    allowance_type: claim?.allowance_type || "mileage",
    description: claim?.description || "",
    travel_date: claim?.travel_date || "",
    origin: claim?.origin || "",
    destination: claim?.destination || "",
    distance_km: claim?.distance_km || "",
    rate_per_km_zar: claim?.rate_per_km_zar || "4.50",
    amount_claimed_zar: claim?.amount_claimed_zar || "",
    amount_approved_zar: claim?.amount_approved_zar || "",
    odometer_start: claim?.odometer_start || "",
    odometer_end: claim?.odometer_end || "",
    receipt_url: claim?.receipt_url || "",
    notes: claim?.notes || "",
    status: claim?.status || "pending",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Auto-calculate mileage claim amount
  useEffect(() => {
    if (
      form.allowance_type === "mileage" &&
      form.distance_km &&
      form.rate_per_km_zar
    ) {
      const calc = (
        parseFloat(form.distance_km) * parseFloat(form.rate_per_km_zar)
      ).toFixed(2);
      set("amount_claimed_zar", calc);
    }
  }, [form.allowance_type, form.distance_km, form.rate_per_km_zar]);

  // Auto-calculate distance from odometer
  useEffect(() => {
    if (form.odometer_start && form.odometer_end) {
      const dist = parseInt(form.odometer_end) - parseInt(form.odometer_start);
      if (dist > 0) set("distance_km", dist);
    }
  }, [form.odometer_start, form.odometer_end]);

  async function handleSave() {
    if (!form.staff_profile_id) return setErr("Select a staff member.");
    if (!form.amount_claimed_zar) return setErr("Amount claimed is required.");
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        staff_profile_id: form.staff_profile_id,
        tenant_id: tenantId,
        allowance_type: form.allowance_type,
        description: form.description || null,
        travel_date: form.travel_date || null,
        origin: form.origin || null,
        destination: form.destination || null,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        rate_per_km_zar: form.rate_per_km_zar
          ? parseFloat(form.rate_per_km_zar)
          : null,
        amount_claimed_zar: parseFloat(form.amount_claimed_zar),
        amount_approved_zar: form.amount_approved_zar
          ? parseFloat(form.amount_approved_zar)
          : null,
        odometer_start: form.odometer_start
          ? parseInt(form.odometer_start)
          : null,
        odometer_end: form.odometer_end ? parseInt(form.odometer_end) : null,
        receipt_url: form.receipt_url || null,
        notes: form.notes || null,
        status: form.status,
      };
      const { error } = isEdit
        ? await supabase
            .from("travel_allowances")
            .update(payload)
            .eq("id", claim.id)
        : await supabase.from("travel_allowances").insert(payload);
      if (error) throw error;
      onSaved(`Travel claim ${isEdit ? "updated" : "submitted"} successfully.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const isMileage = form.allowance_type === "mileage";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
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
          padding: 28,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: FONTS.body,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontFamily: FONTS.heading,
              fontSize: 20,
              color: C.green,
              margin: 0,
            }}
          >
            {isEdit ? "Edit" : "New"} Travel Claim
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

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Staff Member" required>
              <select
                value={form.staff_profile_id}
                onChange={(e) => set("staff_profile_id", e.target.value)}
                style={selectStyle}
              >
                <option value="">— Select staff —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.preferred_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Allowance Type" required>
            <select
              value={form.allowance_type}
              onChange={(e) => set("allowance_type", e.target.value)}
              style={selectStyle}
            >
              {ALLOWANCE_TYPES.map((t) => (
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
              style={selectStyle}
            >
              {TRAVEL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                style={inputStyle}
                placeholder="Purpose of travel"
              />
            </Field>
          </div>

          <Field label="Travel Date">
            <input
              type="date"
              value={form.travel_date}
              onChange={(e) => set("travel_date", e.target.value)}
              style={inputStyle}
            />
          </Field>

          {isMileage && (
            <>
              <Field label="Origin">
                <input
                  value={form.origin}
                  onChange={(e) => set("origin", e.target.value)}
                  style={inputStyle}
                  placeholder="Departure point"
                />
              </Field>
              <Field label="Destination">
                <input
                  value={form.destination}
                  onChange={(e) => set("destination", e.target.value)}
                  style={inputStyle}
                  placeholder="Arrival point"
                />
              </Field>
              <Field label="Odometer Start (km)">
                <input
                  type="number"
                  min="0"
                  value={form.odometer_start}
                  onChange={(e) => set("odometer_start", e.target.value)}
                  style={inputStyle}
                  placeholder="0"
                />
              </Field>
              <Field label="Odometer End (km)">
                <input
                  type="number"
                  min="0"
                  value={form.odometer_end}
                  onChange={(e) => set("odometer_end", e.target.value)}
                  style={inputStyle}
                  placeholder="0"
                />
              </Field>
              <Field label="Distance (km)">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.distance_km}
                  onChange={(e) => set("distance_km", e.target.value)}
                  style={inputStyle}
                  placeholder="Auto-calculated from odometer"
                />
              </Field>
              <Field label="Rate per km (ZAR)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rate_per_km_zar}
                  onChange={(e) => set("rate_per_km_zar", e.target.value)}
                  style={inputStyle}
                  placeholder="4.50"
                />
              </Field>
            </>
          )}

          <Field label="Amount Claimed (ZAR)" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount_claimed_zar}
              onChange={(e) => set("amount_claimed_zar", e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>

          <Field label="Amount Approved (ZAR)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount_approved_zar}
              onChange={(e) => set("amount_approved_zar", e.target.value)}
              style={{
                ...inputStyle,
                background: form.status === "approved" ? C.white : "#f9f9f9",
              }}
              placeholder="Set on approval"
            />
          </Field>

          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Receipt URL">
              <input
                value={form.receipt_url}
                onChange={(e) => set("receipt_url", e.target.value)}
                style={inputStyle}
                placeholder="https://..."
              />
            </Field>
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Optional notes"
              />
            </Field>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONTS.body,
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
              fontFamily: FONTS.body,
              fontWeight: 700,
              letterSpacing: "0.1em",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── REPAYMENT LOG DRAWER ─────────────────────────────────────────────────────

function RepaymentDrawer({ loan, onClose }) {
  if (!loan) return null;
  // repayment_log is jsonb — expected: array of { date, amount, method, notes }
  let log = [];
  try {
    log = Array.isArray(loan.repayment_log)
      ? loan.repayment_log
      : JSON.parse(loan.repayment_log || "[]");
  } catch {
    log = [];
  }

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
          width: 360,
          maxWidth: "100%",
          height: "100%",
          overflowY: "auto",
          padding: 28,
          fontFamily: FONTS.body,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontFamily: FONTS.heading,
              fontSize: 19,
              color: C.green,
              margin: 0,
            }}
          >
            Repayment Log
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

        <div
          style={{
            marginBottom: 20,
            padding: "14px 16px",
            background: C.bg,
            borderRadius: 4,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
            Total Amount
          </div>
          <div
            style={{ fontSize: 20, fontFamily: FONTS.heading, color: C.green }}
          >
            {zar(loan.amount_zar)}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted }}>Repaid</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#2e7d32" }}>
                {zar(loan.total_repaid)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted }}>Outstanding</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: loan.outstanding_balance > 0 ? C.red : "#2e7d32",
                }}
              >
                {zar(loan.outstanding_balance)}
              </div>
            </div>
          </div>
        </div>

        {log.length === 0 ? (
          <div
            style={{
              color: C.muted,
              fontSize: 13,
              textAlign: "center",
              padding: "32px 0",
            }}
          >
            No repayment entries recorded yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {log.map((entry, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 14px",
                  background: C.bg,
                  borderRadius: 4,
                  border: `1px solid ${C.border}`,
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
                    style={{ fontSize: 13, fontWeight: 700, color: "#2e7d32" }}
                  >
                    {zar(entry.amount)}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}>
                    {formatDate(entry.date)}
                  </span>
                </div>
                {entry.method && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                    {entry.method.replace(/_/g, " ")}
                  </div>
                )}
                {entry.notes && (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                    {entry.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOANS SUB-TAB ────────────────────────────────────────────────────────────

function LoansTab({ tenantId, staff }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | loan object
  const [drawer, setDrawer] = useState(null); // loan object for repayment log
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState(null);

  const staffMap = {};
  staff.forEach((s) => {
    staffMap[s.id] = s.full_name || s.preferred_name;
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loans_stipends")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (!error) setRecords(data || []);
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

  const filtered = records.filter((r) => {
    if (filterType !== "all" && r.record_type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  // Summary totals
  const totalLoaned = records
    .filter((r) => r.record_type === "loan")
    .reduce((s, r) => s + (parseFloat(r.amount_zar) || 0), 0);
  const totalOutstanding = records
    .filter((r) => r.record_type === "loan" && r.status === "active")
    .reduce((s, r) => s + (parseFloat(r.outstanding_balance) || 0), 0);
  const totalStipends = records
    .filter((r) => r.record_type === "stipend")
    .reduce((s, r) => s + (parseFloat(r.amount_zar) || 0), 0);

  return (
    <div>
      {/* Summary tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Loaned", value: zar(totalLoaned), color: "#1565c0" },
          {
            label: "Outstanding",
            value: zar(totalOutstanding),
            color: totalOutstanding > 0 ? C.red : "#2e7d32",
          },
          { label: "Total Stipends", value: zar(totalStipends), color: C.gold },
          {
            label: "Active Records",
            value: records.filter((r) => r.status === "active").length,
            color: "#2e7d32",
          },
        ].map((tile) => (
          <div
            key={tile.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${tile.color}`,
              borderRadius: 2,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: 6,
              }}
            >
              {tile.label}
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 22,
                color: tile.color,
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
            style={{ ...selectStyle, width: "auto", fontSize: 12 }}
          >
            <option value="all">All Types</option>
            {RECORD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ ...selectStyle, width: "auto", fontSize: 12 }}
          >
            <option value="all">All Statuses</option>
            {LOAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
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
            fontFamily: FONTS.body,
            letterSpacing: "0.1em",
          }}
        >
          + Add Loan / Stipend
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
          No records found. Add a loan or stipend above.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              fontFamily: FONTS.body,
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
                  "Description",
                  "Amount",
                  "Outstanding",
                  "Repayment",
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
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.bg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                    {staffMap[r.staff_profile_id] || "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        background:
                          r.record_type === "loan" ? "#e3f2fd" : "#fff8e1",
                        color: r.record_type === "loan" ? "#1565c0" : "#f57f17",
                        border: `1px solid ${r.record_type === "loan" ? "#90caf9" : "#ffe082"}`,
                        borderRadius: 20,
                        padding: "2px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {r.record_type}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.description}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                    {zar(r.amount_zar)}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: r.outstanding_balance > 0 ? C.red : "#2e7d32",
                      fontWeight: 600,
                    }}
                  >
                    {zar(r.outstanding_balance)}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: C.muted,
                      fontSize: 12,
                    }}
                  >
                    {r.repayment_per_period
                      ? `${zar(r.repayment_per_period)} / ${r.repayment_frequency?.replace(/_/g, " ")}`
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setDrawer(r)}
                        title="View repayment log"
                        style={{
                          background: "none",
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontSize: 11,
                          color: C.muted,
                        }}
                      >
                        Log
                      </button>
                      <button
                        onClick={() => setModal(r)}
                        style={{
                          background: "none",
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontSize: 11,
                          color: C.muted,
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <LoanModal
          loan={modal === "new" ? null : modal}
          staff={staff}
          tenantId={tenantId}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {drawer && (
        <RepaymentDrawer loan={drawer} onClose={() => setDrawer(null)} />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── TRAVEL SUB-TAB ───────────────────────────────────────────────────────────

function TravelTab({ tenantId, staff }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [toast, setToast] = useState(null);

  const staffMap = {};
  staff.forEach((s) => {
    staffMap[s.id] = s.full_name || s.preferred_name;
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("travel_allowances")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("travel_date", { ascending: false });
    if (!error) setClaims(data || []);
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

  async function handleApprove(claim) {
    const { error } = await supabase
      .from("travel_allowances")
      .update({
        status: "approved",
        amount_approved_zar: claim.amount_claimed_zar,
        approved_at: new Date().toISOString(),
      })
      .eq("id", claim.id);
    if (!error) {
      setToast({ type: "success", msg: "Claim approved." });
      load();
    } else setToast({ type: "error", msg: error.message });
  }

  async function handleReject(claim) {
    const { error } = await supabase
      .from("travel_allowances")
      .update({ status: "rejected" })
      .eq("id", claim.id);
    if (!error) {
      setToast({ type: "success", msg: "Claim rejected." });
      load();
    } else setToast({ type: "error", msg: error.message });
  }

  const filtered = claims.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterType !== "all" && c.allowance_type !== filterType) return false;
    return true;
  });

  const totalClaimed = claims.reduce(
    (s, c) => s + (parseFloat(c.amount_claimed_zar) || 0),
    0,
  );
  const totalApproved = claims
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + (parseFloat(c.amount_approved_zar) || 0), 0);
  const pendingCount = claims.filter((c) => c.status === "pending").length;

  return (
    <div>
      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Claimed",
            value: zar(totalClaimed),
            color: "#1565c0",
          },
          {
            label: "Total Approved",
            value: zar(totalApproved),
            color: "#2e7d32",
          },
          {
            label: "Pending Approval",
            value: pendingCount,
            color: pendingCount > 0 ? "#f57f17" : C.muted,
          },
        ].map((tile) => (
          <div
            key={tile.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${tile.color}`,
              borderRadius: 2,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: 6,
              }}
            >
              {tile.label}
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 22,
                color: tile.color,
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
            style={{ ...selectStyle, width: "auto", fontSize: 12 }}
          >
            <option value="all">All Types</option>
            {ALLOWANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ ...selectStyle, width: "auto", fontSize: 12 }}
          >
            <option value="all">All Statuses</option>
            {TRAVEL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
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
            fontFamily: FONTS.body,
            letterSpacing: "0.1em",
          }}
        >
          + New Travel Claim
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
          No travel claims found.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              fontFamily: FONTS.body,
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
                  "Date",
                  "Type",
                  "Route / Description",
                  "Claimed",
                  "Approved",
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
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.bg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                    {staffMap[c.staff_profile_id] || "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: C.muted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(c.travel_date)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        background: "#f5f5f5",
                        color: "#555",
                        border: "1px solid #ddd",
                        borderRadius: 20,
                        padding: "2px 9px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {c.allowance_type}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.origin && c.destination
                      ? `${c.origin} → ${c.destination}`
                      : c.description || "—"}
                    {c.distance_km ? (
                      <span
                        style={{ color: C.muted, fontSize: 11, marginLeft: 6 }}
                      >
                        {c.distance_km} km
                      </span>
                    ) : null}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                    {zar(c.amount_claimed_zar)}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: c.amount_approved_zar ? "#2e7d32" : C.muted,
                      fontWeight: 600,
                    }}
                  >
                    {c.amount_approved_zar ? zar(c.amount_approved_zar) : "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {c.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(c)}
                            style={{
                              background: "#e8f5e9",
                              border: "1px solid #a5d6a7",
                              borderRadius: 2,
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: 11,
                              color: "#2e7d32",
                              fontWeight: 600,
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleReject(c)}
                            style={{
                              background: "#fce4ec",
                              border: "1px solid #ef9a9a",
                              borderRadius: 2,
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: 11,
                              color: C.red,
                              fontWeight: 600,
                            }}
                          >
                            ✕
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setModal(c)}
                        style={{
                          background: "none",
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontSize: 11,
                          color: C.muted,
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <TravelModal
          claim={modal === "new" ? null : modal}
          staff={staff}
          tenantId={tenantId}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function HRLoans({ tenantId }) {
  const [subTab, setSubTab] = useState("loans");
  const [staff, setStaff] = useState([]);

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

  const SUB_TABS = [
    { id: "loans", label: "Loans & Stipends" },
    { id: "travel", label: "Travel Allowances" },
  ];

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Sub-tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `2px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "10px 22px",
              background: "none",
              border: "none",
              borderBottom:
                subTab === t.id
                  ? `2px solid ${C.green}`
                  : "2px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: FONTS.body,
              color: subTab === t.id ? C.green : C.muted,
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            paddingRight: 4,
          }}
        >
          <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>
            Expense Claims — coming soon
          </span>
        </div>
      </div>

      {subTab === "loans" && <LoansTab tenantId={tenantId} staff={staff} />}
      {subTab === "travel" && <TravelTab tenantId={tenantId} staff={staff} />}
    </div>
  );
}
