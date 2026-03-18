// HRContracts.js v1.0
// Protea Botanicals · HR Module · Contract Management
// WP-HR-5 · March 2026
// src/components/hq/HRContracts.js
//
// Features: Contract list per staff · Create/edit · HTML→PDF via window.print()
// Columns: exact match to live employment_contracts schema

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

const CONTRACT_TYPES = [
  "permanent",
  "fixed_term",
  "casual",
  "contractor",
  "probation",
];
const SALARY_FREQUENCIES = ["monthly", "weekly", "fortnightly", "hourly"];

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
};
// Legacy aliases — preserve all internal logic referencing C
const C = {
  green: T.accent,
  greenLight: T.accentLit,
  greenMid: T.accentMid,
  amber: T.warning,
  amberLight: T.warningBg,
  red: T.danger,
  redLight: T.dangerBg,
  blue: T.info,
  blueLight: T.infoBg,
  border: T.ink150,
  bg: T.ink075,
  white: "#fff",
  text: T.ink700,
  muted: T.ink400,
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtCurrency(v) {
  if (!v) return "—";
  return `R ${parseFloat(v).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

const s = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: `1px solid ${C.border}`,
    background: C.bg,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "11px 14px",
    borderBottom: `1px solid #f5f2ee`,
    verticalAlign: "middle",
    fontSize: 13,
  },
  btn: (bg, color = "#fff") => ({
    padding: "6px 14px",
    background: bg,
    color,
    border: `1px solid ${bg}`,
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  }),
  outBtn: (color) => ({
    padding: "6px 14px",
    background: "none",
    color,
    border: `1px solid ${color}`,
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  }),
  select: {
    padding: "8px 12px",
    border: `1px solid ${T.ink150}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    background: "#fff",
    cursor: "pointer",
    outline: "none",
    width: "100%",
  },
  input: {
    padding: "8px 12px",
    border: `1px solid ${T.ink150}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: T.font,
    color: T.ink400,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 1000,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  drawer: {
    width: "100%",
    maxWidth: 620,
    height: "100vh",
    background: C.white,
    display: "flex",
    flexDirection: "column",
    boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
    overflowY: "hidden",
  },
  dHead: {
    padding: "18px 24px",
    borderBottom: `1px solid ${C.border}`,
    background: C.bg,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  dBody: { flex: 1, overflowY: "auto", padding: 24 },
  dFoot: {
    padding: "14px 24px",
    borderTop: `1px solid ${C.border}`,
    background: C.bg,
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 16,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 14,
    marginBottom: 16,
  },
  field: { marginBottom: 16 },
  section: {
    fontFamily: T.font,
    fontSize: 11,
    fontWeight: 700,
    color: T.ink400,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: "20px 0 12px 0",
    paddingBottom: 8,
    borderBottom: `1px solid ${T.ink150}`,
  },
  error: {
    padding: "12px 16px",
    background: C.redLight,
    color: C.red,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
  },
  toast: (t) => ({
    padding: "10px 16px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
    background: t === "success" ? C.greenLight : C.redLight,
    color: t === "success" ? C.greenMid : C.red,
  }),
  badge: (active) => ({
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
    background: active ? C.greenLight : "#f5f5f5",
    color: active ? C.greenMid : C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  }),
  alertPill: (days) => {
    if (days === null) return null;
    if (days < 0) return { bg: C.redLight, color: C.red, label: "Expired" };
    if (days <= 30)
      return { bg: C.amberLight, color: C.amber, label: `${days}d left` };
    if (days <= 90)
      return { bg: C.blueLight, color: C.blue, label: `${days}d left` };
    return null;
  },
};

const EMPTY_FORM = {
  contract_type: "permanent",
  start_date: "",
  end_date: "",
  probation_end_date: "",
  notice_period_days: 30,
  gross_salary_zar: "",
  salary_frequency: "monthly",
  hourly_rate_zar: "",
  standard_hours_per_day: 8,
  standard_days_per_week: 5,
  notes: "",
  is_active: true,
};

// ── HTML→PDF print template ────────────────────────────────────────────────
function generateContractHTML(
  contract,
  staffName,
  tenantName = "Protea Botanicals",
) {
  const typeLabel =
    contract.contract_type
      ?.replace("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "";
  return `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Employment Contract — ${staffName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 12pt; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 22pt; color: #1b4332; margin-bottom: 6px; }
  h2 { font-size: 13pt; color: #2d6a4f; margin: 24px 0 8px 0; border-bottom: 1px solid #c8e6c9; padding-bottom: 4px; }
  .subtitle { font-size: 10pt; color: #555; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  td { padding: 7px 10px; border: 1px solid #e0dbd2; vertical-align: top; font-size: 11pt; }
  td:first-child { font-weight: bold; width: 40%; background: #f9f7f4; }
  .clause { margin-bottom: 14px; line-height: 1.6; font-size: 11pt; }
  .clause strong { display: block; margin-bottom: 3px; color: #2d6a4f; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .sig-block { border-top: 1px solid #333; padding-top: 8px; }
  .sig-label { font-size: 10pt; color: #555; }
  .footer { margin-top: 40px; font-size: 9pt; color: #999; text-align: center; border-top: 1px solid #e0dbd2; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <h1>${tenantName}</h1>
  <div class="subtitle">EMPLOYMENT CONTRACT — ${typeLabel.toUpperCase()}</div>

  <h2>1. Parties</h2>
  <table>
    <tr><td>Employer</td><td>${tenantName}</td></tr>
    <tr><td>Employee</td><td>${staffName}</td></tr>
    <tr><td>Contract Type</td><td>${typeLabel}</td></tr>
    <tr><td>Version</td><td>${contract.version_number || 1}</td></tr>
  </table>

  <h2>2. Employment Period</h2>
  <table>
    <tr><td>Start Date</td><td>${fmtDate(contract.start_date)}</td></tr>
    ${contract.end_date ? `<tr><td>End Date</td><td>${fmtDate(contract.end_date)}</td></tr>` : ""}
    ${contract.probation_end_date ? `<tr><td>Probation End</td><td>${fmtDate(contract.probation_end_date)}</td></tr>` : ""}
    <tr><td>Notice Period</td><td>${contract.notice_period_days || 30} calendar days</td></tr>
  </table>

  <h2>3. Remuneration</h2>
  <table>
    ${contract.gross_salary_zar ? `<tr><td>Gross Salary</td><td>${fmtCurrency(contract.gross_salary_zar)} ${contract.salary_frequency || "monthly"}</td></tr>` : ""}
    ${contract.hourly_rate_zar ? `<tr><td>Hourly Rate</td><td>${fmtCurrency(contract.hourly_rate_zar)} per hour</td></tr>` : ""}
    <tr><td>Standard Hours</td><td>${contract.standard_hours_per_day || 8} hours/day · ${contract.standard_days_per_week || 5} days/week</td></tr>
  </table>

  <h2>4. Terms &amp; Conditions</h2>
  <div class="clause"><strong>4.1 Basic Conditions of Employment</strong>This contract is governed by the Basic Conditions of Employment Act (BCEA) No. 75 of 1997 and the Labour Relations Act (LRA) No. 66 of 1995.</div>
  <div class="clause"><strong>4.2 Confidentiality</strong>The employee agrees to maintain strict confidentiality regarding all proprietary information, trade secrets, and business processes of the employer during and after employment.</div>
  <div class="clause"><strong>4.3 Leave Entitlement</strong>Annual leave, sick leave, and other leave entitlements are as per the BCEA and the company leave policy provided separately.</div>
  <div class="clause"><strong>4.4 Termination</strong>Either party may terminate this contract by providing ${contract.notice_period_days || 30} calendar days written notice, except in cases of summary dismissal for gross misconduct.</div>
  ${contract.notes ? `<div class="clause"><strong>4.5 Additional Notes</strong>${contract.notes}</div>` : ""}

  <h2>5. Signatures</h2>
  <div class="signature-grid">
    <div class="sig-block"><div style="height:50px"></div><div class="sig-label">Employee: ${staffName}</div><div class="sig-label">Date: ____________________</div></div>
    <div class="sig-block"><div style="height:50px"></div><div class="sig-label">Employer: ${tenantName}</div><div class="sig-label">Date: ____________________</div></div>
  </div>

  <div class="footer">Generated by Protea Botanicals HR Platform · ${new Date().toLocaleDateString("en-ZA")} · This document is confidential</div>
</body></html>`;
}

function printContract(html) {
  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
  };
}

// ── Contract form drawer ───────────────────────────────────────────────────
function ContractDrawer({
  contract,
  staffId,
  tenantId,
  staffName,
  allStaff,
  onClose,
  onSaved,
}) {
  const isNew = !contract?.id;
  const [form, setForm] = useState(
    isNew
      ? EMPTY_FORM
      : {
          contract_type: contract.contract_type || "permanent",
          start_date: contract.start_date || "",
          end_date: contract.end_date || "",
          probation_end_date: contract.probation_end_date || "",
          notice_period_days: contract.notice_period_days || 30,
          gross_salary_zar: contract.gross_salary_zar || "",
          salary_frequency: contract.salary_frequency || "monthly",
          hourly_rate_zar: contract.hourly_rate_zar || "",
          standard_hours_per_day: contract.standard_hours_per_day || 8,
          standard_days_per_week: contract.standard_days_per_week || 5,
          notes: contract.notes || "",
          is_active: contract.is_active !== false,
        },
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const f = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const save = async () => {
    if (!form.start_date) {
      setToast({ type: "error", msg: "Start date is required." });
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const payload = {
        staff_profile_id: staffId,
        tenant_id: tenantId,
        contract_type: form.contract_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        probation_end_date: form.probation_end_date || null,
        notice_period_days: parseInt(form.notice_period_days) || 30,
        gross_salary_zar: form.gross_salary_zar
          ? parseFloat(form.gross_salary_zar)
          : null,
        salary_frequency: form.salary_frequency || null,
        hourly_rate_zar: form.hourly_rate_zar
          ? parseFloat(form.hourly_rate_zar)
          : null,
        standard_hours_per_day: parseFloat(form.standard_hours_per_day) || 8,
        standard_days_per_week: parseInt(form.standard_days_per_week) || 5,
        is_active: form.is_active,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      let error;
      if (isNew) {
        // Deactivate previous active contracts for this staff member
        await supabase
          .from("employment_contracts")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("staff_profile_id", staffId)
          .eq("is_active", true);
        const maxVer = await supabase
          .from("employment_contracts")
          .select("version_number")
          .eq("staff_profile_id", staffId)
          .order("version_number", { ascending: false })
          .limit(1)
          .single();
        payload.version_number = (maxVer.data?.version_number || 0) + 1;
        payload.created_by = user.id;
        ({ error } = await supabase
          .from("employment_contracts")
          .insert([payload]));
      } else {
        ({ error } = await supabase
          .from("employment_contracts")
          .update(payload)
          .eq("id", contract.id));
      }
      if (error) throw error;
      setToast({
        type: "success",
        msg: isNew ? "Contract created." : "Contract updated.",
      });
      setTimeout(() => onSaved && onSaved(), 700);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={s.modal}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={s.drawer}>
        <div style={s.dHead}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.green,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {isNew ? "New Contract" : "Edit Contract"}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 17,
                fontWeight: 600,
                color: T.ink700,
              }}
            >
              {staffName}
            </div>
          </div>
          <button
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: C.muted,
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div style={s.dBody}>
          {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}

          <div style={s.section}>Contract Details</div>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Contract Type *</label>
              <select
                style={s.select}
                value={form.contract_type}
                onChange={f("contract_type")}
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Status</label>
              <select
                style={s.select}
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    is_active: e.target.value === "active",
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive / Superseded</option>
              </select>
            </div>
          </div>
          <div style={s.grid3}>
            <div>
              <label style={s.label}>Start Date *</label>
              <input
                style={s.input}
                type="date"
                value={form.start_date}
                onChange={f("start_date")}
              />
            </div>
            <div>
              <label style={s.label}>End Date</label>
              <input
                style={s.input}
                type="date"
                value={form.end_date}
                onChange={f("end_date")}
              />
            </div>
            <div>
              <label style={s.label}>Probation End</label>
              <input
                style={s.input}
                type="date"
                value={form.probation_end_date}
                onChange={f("probation_end_date")}
              />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Notice Period (days)</label>
            <input
              style={s.input}
              type="number"
              value={form.notice_period_days}
              onChange={f("notice_period_days")}
            />
          </div>

          <div style={s.section}>Remuneration</div>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Gross Salary (ZAR)</label>
              <input
                style={s.input}
                type="number"
                step="0.01"
                value={form.gross_salary_zar}
                onChange={f("gross_salary_zar")}
                placeholder="0.00"
              />
            </div>
            <div>
              <label style={s.label}>Frequency</label>
              <select
                style={s.select}
                value={form.salary_frequency}
                onChange={f("salary_frequency")}
              >
                {SALARY_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Hourly Rate (ZAR) — if applicable</label>
            <input
              style={s.input}
              type="number"
              step="0.01"
              value={form.hourly_rate_zar}
              onChange={f("hourly_rate_zar")}
              placeholder="0.00"
            />
          </div>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Hours per Day</label>
              <input
                style={s.input}
                type="number"
                step="0.5"
                value={form.standard_hours_per_day}
                onChange={f("standard_hours_per_day")}
              />
            </div>
            <div>
              <label style={s.label}>Days per Week</label>
              <input
                style={s.input}
                type="number"
                value={form.standard_days_per_week}
                onChange={f("standard_days_per_week")}
              />
            </div>
          </div>

          <div style={s.section}>Notes</div>
          <div style={s.field}>
            <textarea
              style={{ ...s.input, height: 80, resize: "vertical" }}
              value={form.notes}
              onChange={f("notes")}
              placeholder="Additional terms, conditions or remarks…"
            />
          </div>
        </div>
        <div style={s.dFoot}>
          <div style={{ display: "flex", gap: 8 }}>
            {!isNew && (
              <button
                style={s.outBtn(C.green)}
                onClick={() =>
                  printContract(generateContractHTML(form, staffName))
                }
              >
                🖨 Print PDF
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={s.outBtn("#aaa")} onClick={onClose}>
              Cancel
            </button>
            <button style={s.btn(C.green)} onClick={save} disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create Contract" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function HRContracts({ tenantId }) {
  const [staffList, setStaffList] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [staffFilter, setStaffFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [drawerStaffId, setDrawerStaffId] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRes, contractRes] = await Promise.allSettled([
        supabase
          .from("staff_profiles")
          .select("id, full_name, preferred_name, job_title, department")
          .eq("tenant_id", tenantId)
          .order("full_name"),
        supabase
          .from("employment_contracts")
          .select(
            "id, staff_profile_id, contract_type, version_number, start_date, end_date, probation_end_date, notice_period_days, gross_salary_zar, salary_frequency, hourly_rate_zar, standard_hours_per_day, standard_days_per_week, is_active, signed_by_staff, signed_at, notes, created_at",
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
      ]);
      setStaffList(
        staffRes.status === "fulfilled" ? staffRes.value.data || [] : [],
      );
      setContracts(
        contractRes.status === "fulfilled" ? contractRes.value.data || [] : [],
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const staffName = (id) => {
    const s = staffList.find((x) => x.id === id);
    return s ? s.preferred_name || s.full_name : "Unknown";
  };

  const openNew = (staffId) => {
    setDrawerStaffId(staffId);
    setEditingContract(null);
    setDrawerOpen(true);
  };
  const openEdit = (c) => {
    setDrawerStaffId(c.staff_profile_id);
    setEditingContract(c);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingContract(null);
    setDrawerStaffId(null);
  };

  const filtered = contracts.filter((c) => {
    const matchStaff = !staffFilter || c.staff_profile_id === staffFilter;
    const matchType = !typeFilter || c.contract_type === typeFilter;
    return matchStaff && matchType;
  });

  const expiringCount = contracts.filter((c) => {
    const d = daysUntil(c.end_date);
    return d !== null && d >= 0 && d <= 60 && c.is_active;
  }).length;
  const probationCount = contracts.filter((c) => {
    const d = daysUntil(c.probation_end_date);
    return d !== null && d >= 0 && d <= 14 && c.is_active;
  }).length;

  return (
    <div style={{ fontFamily: T.font, color: T.ink700 }}>
      {/* Alerts */}
      {expiringCount > 0 && (
        <div
          style={{
            padding: "10px 14px",
            background: C.amberLight,
            border: `1px solid ${C.amber}`,
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            color: C.amber,
            fontWeight: 600,
          }}
        >
          ⚠ {expiringCount} contract{expiringCount !== 1 ? "s" : ""} expiring
          within 60 days — review and renew
        </div>
      )}
      {probationCount > 0 && (
        <div
          style={{
            padding: "10px 14px",
            background: C.blueLight,
            border: `1px solid ${C.blue}`,
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            color: C.blue,
            fontWeight: 600,
          }}
        >
          📋 {probationCount} probation period{probationCount !== 1 ? "s" : ""}{" "}
          ending within 14 days
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          style={{ ...s.select, width: "auto" }}
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
        >
          <option value="">All Staff</option>
          {staffList.map((st) => (
            <option key={st.id} value={st.id}>
              {st.preferred_name || st.full_name}
            </option>
          ))}
        </select>
        <select
          style={{ ...s.select, width: "auto" }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {CONTRACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          style={{ ...s.select, width: "auto", marginLeft: "auto" }}
          onChange={(e) => {
            if (e.target.value) openNew(e.target.value);
            e.target.value = "";
          }}
          defaultValue=""
        >
          <option value="" disabled>
            + New Contract for…
          </option>
          {staffList.map((st) => (
            <option key={st.id} value={st.id}>
              {st.preferred_name || st.full_name}
            </option>
          ))}
        </select>
      </div>

      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
      {error && <div style={s.error}>⚠ {error}</div>}

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>
          Loading contracts…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{ padding: "48px 24px", textAlign: "center", color: C.muted }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          <div
            style={{
              fontFamily: T.font,
              fontSize: 15,
              color: T.ink400,
              marginBottom: 6,
            }}
          >
            No contracts on record
          </div>
          <div style={{ fontSize: 12, color: "#ccc" }}>
            Create contracts for each staff member using the dropdown above
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Staff Member</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Ver.</th>
                <th style={s.th}>Start</th>
                <th style={s.th}>End</th>
                <th style={s.th}>Probation</th>
                <th style={s.th}>Salary</th>
                <th style={s.th}>Status</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const endAlert = s.alertPill(daysUntil(c.end_date));
                const probAlert = s.alertPill(daysUntil(c.probation_end_date));
                return (
                  <tr key={c.id}>
                    <td style={s.td}>
                      <strong>{staffName(c.staff_profile_id)}</strong>
                    </td>
                    <td
                      style={{
                        ...s.td,
                        textTransform: "capitalize",
                        fontSize: 12,
                      }}
                    >
                      {c.contract_type?.replace("_", " ") || "—"}
                    </td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>
                      v{c.version_number || 1}
                    </td>
                    <td style={{ ...s.td, fontSize: 12 }}>
                      {fmtDate(c.start_date)}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontSize: 12 }}>
                        {c.end_date ? (
                          fmtDate(c.end_date)
                        ) : (
                          <span style={{ color: "#ccc" }}>—</span>
                        )}
                      </div>
                      {endAlert && (
                        <span
                          style={{
                            background: endAlert.bg,
                            color: endAlert.color,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 20,
                            textTransform: "uppercase",
                          }}
                        >
                          {endAlert.label}
                        </span>
                      )}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontSize: 12 }}>
                        {c.probation_end_date ? (
                          fmtDate(c.probation_end_date)
                        ) : (
                          <span style={{ color: "#ccc" }}>—</span>
                        )}
                      </div>
                      {probAlert && (
                        <span
                          style={{
                            background: probAlert.bg,
                            color: probAlert.color,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 20,
                            textTransform: "uppercase",
                          }}
                        >
                          {probAlert.label}
                        </span>
                      )}
                    </td>
                    <td style={s.td}>
                      {c.gross_salary_zar ? (
                        <span
                          style={{
                            fontFamily: T.font,
                            fontSize: 13,
                            fontWeight: 400,
                            fontVariantNumeric: "tabular-nums",
                            color: T.accent,
                          }}
                        >
                          {fmtCurrency(c.gross_salary_zar)}
                          <span
                            style={{
                              fontSize: 10,
                              color: T.ink400,
                              fontFamily: T.font,
                              marginLeft: 3,
                            }}
                          >
                            /{c.salary_frequency || "mo"}
                          </span>
                        </span>
                      ) : c.hourly_rate_zar ? (
                        <span style={{ fontSize: 12, color: C.muted }}>
                          {fmtCurrency(c.hourly_rate_zar)}/hr
                        </span>
                      ) : (
                        <span style={{ color: "#ccc" }}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <span style={s.badge(c.is_active)}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          style={{
                            ...s.outBtn(C.green),
                            padding: "3px 10px",
                            fontSize: 11,
                          }}
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          style={{
                            ...s.outBtn(C.blue),
                            padding: "3px 10px",
                            fontSize: 11,
                          }}
                          onClick={() =>
                            printContract(
                              generateContractHTML(
                                c,
                                staffName(c.staff_profile_id),
                              ),
                            )
                          }
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginTop: 8,
              textAlign: "right",
            }}
          >
            {filtered.length} contract{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {drawerOpen && (
        <ContractDrawer
          contract={editingContract}
          staffId={drawerStaffId}
          tenantId={tenantId}
          staffName={staffName(drawerStaffId)}
          onClose={closeDrawer}
          onSaved={() => {
            closeDrawer();
            loadAll();
          }}
        />
      )}
    </div>
  );
}
