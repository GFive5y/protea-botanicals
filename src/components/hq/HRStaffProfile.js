// HRStaffProfile.js v1.0
// Protea Botanicals · HR Module · Staff Profile CRUD Modal
// WP-HR-2 · March 2026
// NEW FILE — src/components/hr/HRStaffProfile.js

import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor", "casual"];
const STATUSES = ["active", "on_leave", "terminated", "suspended"];
const DEPARTMENTS = [
  "Management",
  "Production",
  "Sales",
  "Admin",
  "Security",
  "Logistics",
  "Finance",
  "Other",
];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const ACCOUNT_TYPES = ["Current", "Savings", "Transmission"];
const BANKS = [
  "ABSA",
  "Capitec",
  "FNB",
  "Nedbank",
  "Standard Bank",
  "TymeBank",
  "Discovery Bank",
  "Other",
];

const SECTION_TABS = [
  { id: "personal", label: "Personal", icon: "👤" },
  { id: "employment", label: "Employment", icon: "💼" },
  { id: "emergency", label: "Emergency", icon: "🚨" },
  { id: "banking", label: "Banking", icon: "🏦" },
];

const st = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 1000,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  panel: {
    width: "100%",
    maxWidth: 620,
    height: "100vh",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    overflowY: "hidden",
    boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
    fontFamily: "'Jost', sans-serif",
  },
  panelHeader: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #ece8e2",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexShrink: 0,
    background: "#faf8f5",
  },
  headerLeft: { flex: 1 },
  empNumber: {
    fontSize: 11,
    fontWeight: 600,
    color: "#3d6b35",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  panelTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    color: "#2d2d2d",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 20,
    cursor: "pointer",
    color: "#999",
    padding: "4px 8px",
    lineHeight: 1,
    borderRadius: 4,
  },
  sectionTabs: {
    display: "flex",
    borderBottom: "1px solid #ece8e2",
    background: "#faf8f5",
    flexShrink: 0,
    overflowX: "auto",
  },
  sectionTab: (active) => ({
    padding: "10px 18px",
    cursor: "pointer",
    border: "none",
    background: active ? "#fff" : "none",
    fontSize: 12,
    fontFamily: "'Jost', sans-serif",
    color: active ? "#3d6b35" : "#888",
    borderBottom: active ? "2px solid #3d6b35" : "2px solid transparent",
    fontWeight: active ? 600 : 400,
    whiteSpace: "nowrap",
    borderRight: "1px solid #ece8e2",
  }),
  body: { flex: 1, overflowY: "auto", padding: "24px" },
  footer: {
    padding: "14px 24px",
    borderTop: "1px solid #ece8e2",
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#faf8f5",
  },
  fieldGroup: { marginBottom: 20 },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 20,
  },
  row3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 14,
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 5,
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    color: "#2d2d2d",
    background: "#fff",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s",
  },
  select: {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    color: "#2d2d2d",
    background: "#fff",
    boxSizing: "border-box",
    outline: "none",
    cursor: "pointer",
  },
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 16,
    fontWeight: 600,
    color: "#2d2d2d",
    margin: "0 0 16px 0",
    paddingBottom: 8,
    borderBottom: "1px solid #f0ece6",
  },
  sensitiveNote: {
    fontSize: 11,
    color: "#aaa",
    fontStyle: "italic",
    marginBottom: 14,
  },
  divider: { height: 1, background: "#f0ece6", margin: "20px 0" },
  saveBtn: {
    padding: "10px 24px",
    background: "#3d6b35",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
  },
  cancelBtn: {
    padding: "10px 20px",
    background: "none",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
  },
  deleteBtn: {
    padding: "10px 16px",
    background: "none",
    color: "#c0392b",
    border: "1px solid #c0392b",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
  },
  toast: (type) => ({
    padding: "10px 16px",
    borderRadius: 6,
    fontSize: 13,
    background: type === "success" ? "#edf7ed" : "#fdecea",
    color: type === "success" ? "#2e7d32" : "#c62828",
    marginBottom: 16,
    flexShrink: 0,
  }),
  statusBadge: (status) => {
    const map = {
      active: ["#e8f5e9", "#2e7d32"],
      on_leave: ["#fff8e1", "#f57f17"],
      terminated: ["#fdecea", "#c62828"],
      suspended: ["#fff3e0", "#e65100"],
    };
    const [bg, color] = map[status] || ["#f5f5f5", "#666"];
    return {
      background: bg,
      color,
      fontSize: 11,
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: 20,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    };
  },
};

const EMPTY_FORM = {
  full_name: "",
  preferred_name: "",
  id_number: "",
  date_of_birth: "",
  gender: "",
  nationality: "South African",
  phone_personal: "",
  email_personal: "",
  email_work: "",
  address_line1: "",
  address_suburb: "",
  address_city: "",
  address_province: "",
  address_code: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_type: "",
  bank_branch_code: "",
  tax_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
  department: "",
  job_title: "",
  employment_type: "full_time",
  employment_start_date: "",
  employment_end_date: "",
  status: "active",
  reports_to: "",
};

function flattenStaff(s) {
  const addr = s.address_residential || {};
  const bank = s.bank_account || {};
  return {
    ...EMPTY_FORM,
    full_name: s.full_name || "",
    preferred_name: s.preferred_name || "",
    id_number: s.id_number || "",
    date_of_birth: s.date_of_birth || "",
    gender: s.gender || "",
    nationality: s.nationality || "South African",
    phone_personal: s.phone_personal || "",
    email_personal: s.email_personal || "",
    email_work: s.email_work || "",
    address_line1: addr.line1 || "",
    address_suburb: addr.suburb || "",
    address_city: addr.city || "",
    address_province: addr.province || "",
    address_code: addr.code || "",
    bank_name: bank.bank || "",
    bank_account_number: bank.account_number || "",
    bank_account_type: bank.account_type || "",
    bank_branch_code: bank.branch_code || "",
    tax_number: s.tax_number || "",
    emergency_contact_name: s.emergency_contact_name || "",
    emergency_contact_phone: s.emergency_contact_phone || "",
    emergency_contact_relation: s.emergency_contact_relation || "",
    department: s.department || "",
    job_title: s.job_title || "",
    employment_type: s.employment_type || "full_time",
    employment_start_date: s.employment_start_date || "",
    employment_end_date: s.employment_end_date || "",
    status: s.status || "active",
    reports_to: s.reports_to || "",
  };
}

export default function HRStaffProfile({
  staff,
  tenantId,
  onClose,
  onSaved,
  allStaff = [],
}) {
  const isNew = !staff?.id;
  const [form, setForm] = useState(isNew ? EMPTY_FORM : flattenStaff(staff));
  const [section, setSection] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const f = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const buildPayload = () => ({
    tenant_id: tenantId,
    full_name: form.full_name.trim(),
    preferred_name: form.preferred_name.trim() || null,
    id_number: form.id_number.trim() || null,
    date_of_birth: form.date_of_birth || null,
    gender: form.gender || null,
    nationality: form.nationality.trim() || null,
    phone_personal: form.phone_personal.trim() || null,
    email_personal: form.email_personal.trim() || null,
    email_work: form.email_work.trim() || null,
    address_residential: {
      line1: form.address_line1,
      suburb: form.address_suburb,
      city: form.address_city,
      province: form.address_province,
      code: form.address_code,
    },
    bank_account: {
      bank: form.bank_name,
      account_number: form.bank_account_number,
      account_type: form.bank_account_type,
      branch_code: form.bank_branch_code,
    },
    tax_number: form.tax_number.trim() || null,
    emergency_contact_name: form.emergency_contact_name.trim() || null,
    emergency_contact_phone: form.emergency_contact_phone.trim() || null,
    emergency_contact_relation: form.emergency_contact_relation.trim() || null,
    department: form.department || null,
    job_title: form.job_title.trim() || null,
    employment_type: form.employment_type,
    employment_start_date: form.employment_start_date || null,
    employment_end_date: form.employment_end_date || null,
    status: form.status,
    reports_to: form.reports_to || null,
    updated_at: new Date().toISOString(),
  });

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setToast({ type: "error", msg: "Full name is required." });
      return;
    }
    setSaving(true);
    try {
      let error;
      if (isNew) {
        ({ error } = await supabase
          .from("staff_profiles")
          .insert([buildPayload()]));
      } else {
        ({ error } = await supabase
          .from("staff_profiles")
          .update(buildPayload())
          .eq("id", staff.id));
      }
      if (error) throw error;
      setToast({
        type: "success",
        msg: isNew ? "Staff member created." : "Profile updated.",
      });
      setTimeout(() => onSaved && onSaved(), 900);
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("staff_profiles")
        .update({
          status: "terminated",
          employment_end_date: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq("id", staff.id);
      if (error) throw error;
      setToast({ type: "success", msg: "Staff member marked as terminated." });
      setTimeout(() => onSaved && onSaved(), 900);
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Operation failed." });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      style={st.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={st.panel}>
        {/* Header */}
        <div style={st.panelHeader}>
          <div style={st.headerLeft}>
            {!isNew && staff?.employee_number && (
              <div style={st.empNumber}>{staff.employee_number}</div>
            )}
            <h2 style={st.panelTitle}>
              {isNew
                ? "Add Staff Member"
                : staff?.preferred_name || staff?.full_name || "Edit Profile"}
            </h2>
            {!isNew && (
              <span style={st.statusBadge(form.status)}>
                {form.status.replace("_", " ")}
              </span>
            )}
          </div>
          <button style={st.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Section tabs */}
        <div style={st.sectionTabs}>
          {SECTION_TABS.map((t) => (
            <button
              key={t.id}
              style={st.sectionTab(section === t.id)}
              onClick={() => setSection(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ ...st.toast(toast.type), margin: "12px 24px 0" }}>
            {toast.msg}
          </div>
        )}

        {/* Body */}
        <div style={st.body}>
          {/* ── PERSONAL ── */}
          {section === "personal" && (
            <>
              <p style={st.sectionTitle}>Personal Information</p>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Full Name *</label>
                  <input
                    style={st.input}
                    value={form.full_name}
                    onChange={f("full_name")}
                    placeholder="Legal name as on ID"
                  />
                </div>
                <div>
                  <label style={st.label}>Preferred Name</label>
                  <input
                    style={st.input}
                    value={form.preferred_name}
                    onChange={f("preferred_name")}
                    placeholder="Display name"
                  />
                </div>
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>SA ID / Passport</label>
                  <input
                    style={st.input}
                    value={form.id_number}
                    onChange={f("id_number")}
                    placeholder="ID number"
                  />
                </div>
                <div>
                  <label style={st.label}>Date of Birth</label>
                  <input
                    style={st.input}
                    type="date"
                    value={form.date_of_birth}
                    onChange={f("date_of_birth")}
                  />
                </div>
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Gender</label>
                  <select
                    style={st.select}
                    value={form.gender}
                    onChange={f("gender")}
                  >
                    <option value="">Select…</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={st.label}>Nationality</label>
                  <input
                    style={st.input}
                    value={form.nationality}
                    onChange={f("nationality")}
                    placeholder="e.g. South African"
                  />
                </div>
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Personal Mobile</label>
                  <input
                    style={st.input}
                    value={form.phone_personal}
                    onChange={f("phone_personal")}
                    placeholder="+27 82 000 0000"
                  />
                </div>
                <div>
                  <label style={st.label}>Personal Email</label>
                  <input
                    style={st.input}
                    type="email"
                    value={form.email_personal}
                    onChange={f("email_personal")}
                    placeholder="personal@email.com"
                  />
                </div>
              </div>
              <div style={st.fieldGroup}>
                <label style={st.label}>Work Email</label>
                <input
                  style={st.input}
                  type="email"
                  value={form.email_work}
                  onChange={f("email_work")}
                  placeholder="name@company.com"
                />
              </div>
              <div style={st.divider} />
              <p style={{ ...st.sectionTitle, marginTop: 0 }}>
                Residential Address
              </p>
              <div style={st.fieldGroup}>
                <label style={st.label}>Street Address</label>
                <input
                  style={st.input}
                  value={form.address_line1}
                  onChange={f("address_line1")}
                  placeholder="12 Main Road"
                />
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Suburb</label>
                  <input
                    style={st.input}
                    value={form.address_suburb}
                    onChange={f("address_suburb")}
                    placeholder="Suburb"
                  />
                </div>
                <div>
                  <label style={st.label}>City</label>
                  <input
                    style={st.input}
                    value={form.address_city}
                    onChange={f("address_city")}
                    placeholder="City"
                  />
                </div>
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Province</label>
                  <input
                    style={st.input}
                    value={form.address_province}
                    onChange={f("address_province")}
                    placeholder="Province"
                  />
                </div>
                <div>
                  <label style={st.label}>Postal Code</label>
                  <input
                    style={st.input}
                    value={form.address_code}
                    onChange={f("address_code")}
                    placeholder="0000"
                  />
                </div>
              </div>
            </>
          )}

          {/* ── EMPLOYMENT ── */}
          {section === "employment" && (
            <>
              <p style={st.sectionTitle}>Employment Details</p>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Job Title</label>
                  <input
                    style={st.input}
                    value={form.job_title}
                    onChange={f("job_title")}
                    placeholder="e.g. Budtender, Manager"
                  />
                </div>
                <div>
                  <label style={st.label}>Department</label>
                  <select
                    style={st.select}
                    value={form.department}
                    onChange={f("department")}
                  >
                    <option value="">Select…</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Employment Type</label>
                  <select
                    style={st.select}
                    value={form.employment_type}
                    onChange={f("employment_type")}
                  >
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={st.label}>Status</label>
                  <select
                    style={st.select}
                    value={form.status}
                    onChange={f("status")}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Start Date</label>
                  <input
                    style={st.input}
                    type="date"
                    value={form.employment_start_date}
                    onChange={f("employment_start_date")}
                  />
                </div>
                <div>
                  <label style={st.label}>End Date</label>
                  <input
                    style={st.input}
                    type="date"
                    value={form.employment_end_date}
                    onChange={f("employment_end_date")}
                  />
                </div>
              </div>
              <div style={st.fieldGroup}>
                <label style={st.label}>Reports To (Line Manager)</label>
                <select
                  style={st.select}
                  value={form.reports_to}
                  onChange={f("reports_to")}
                >
                  <option value="">None / Owner</option>
                  {allStaff
                    .filter((s) => s.id !== staff?.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.preferred_name || s.full_name} (
                        {s.job_title || "No title"})
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}

          {/* ── EMERGENCY ── */}
          {section === "emergency" && (
            <>
              <p style={st.sectionTitle}>Emergency Contact</p>
              <div style={st.fieldGroup}>
                <label style={st.label}>Contact Name</label>
                <input
                  style={st.input}
                  value={form.emergency_contact_name}
                  onChange={f("emergency_contact_name")}
                  placeholder="Full name"
                />
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Phone Number</label>
                  <input
                    style={st.input}
                    value={form.emergency_contact_phone}
                    onChange={f("emergency_contact_phone")}
                    placeholder="+27 82 000 0000"
                  />
                </div>
                <div>
                  <label style={st.label}>Relationship</label>
                  <input
                    style={st.input}
                    value={form.emergency_contact_relation}
                    onChange={f("emergency_contact_relation")}
                    placeholder="e.g. Spouse, Parent, Sibling"
                  />
                </div>
              </div>
            </>
          )}

          {/* ── BANKING ── */}
          {section === "banking" && (
            <>
              <p style={st.sectionTitle}>Banking Details</p>
              <p style={st.sensitiveNote}>
                🔒 Sensitive information — stored securely. Used for payroll CSV
                export only.
              </p>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Bank</label>
                  <select
                    style={st.select}
                    value={form.bank_name}
                    onChange={f("bank_name")}
                  >
                    <option value="">Select bank…</option>
                    {BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={st.label}>Account Type</label>
                  <select
                    style={st.select}
                    value={form.bank_account_type}
                    onChange={f("bank_account_type")}
                  >
                    <option value="">Select type…</option>
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={st.row2}>
                <div>
                  <label style={st.label}>Account Number</label>
                  <input
                    style={st.input}
                    value={form.bank_account_number}
                    onChange={f("bank_account_number")}
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <label style={st.label}>Branch Code</label>
                  <input
                    style={st.input}
                    value={form.bank_branch_code}
                    onChange={f("bank_branch_code")}
                    placeholder="e.g. 250655"
                  />
                </div>
              </div>
              <div style={st.divider} />
              <div style={st.fieldGroup}>
                <label style={st.label}>SARS Tax Number</label>
                <input
                  style={st.input}
                  value={form.tax_number}
                  onChange={f("tax_number")}
                  placeholder="Tax reference number"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={st.footer}>
          <div>
            {!isNew && (
              <button
                style={st.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? "Processing…"
                  : confirmDelete
                    ? "⚠ Confirm Terminate"
                    : "Terminate"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {confirmDelete && (
              <button
                style={st.cancelBtn}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            )}
            {!confirmDelete && (
              <button style={st.cancelBtn} onClick={onClose}>
                Cancel
              </button>
            )}
            {!confirmDelete && (
              <button style={st.saveBtn} onClick={handleSave} disabled={saving}>
                {saving
                  ? "Saving…"
                  : isNew
                    ? "Create Staff Member"
                    : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
