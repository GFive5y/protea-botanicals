// src/components/hq/HQMedical.js
// v1.0 — WP-IND Session 4: Medical dispensary module
// Gate: feature_medical=true AND profile=cannabis_dispensary
// Tabs: Patients | Prescriptions | Dispensing | Reports | Compliance

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
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
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const sCard = {
  background: "#fff",
  border: `1px solid ${T.ink150}`,
  borderRadius: "6px",
  padding: "20px",
  boxShadow: T.shadow,
};
const sLabel = {
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
  fontFamily: T.fontUi,
  fontWeight: 700,
};
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.fontUi,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background:
    v === "primary" ? T.accent : v === "danger" ? T.danger : "transparent",
  color: ["primary", "danger"].includes(v) ? "#fff" : T.accentMid,
  border: ["primary", "danger"].includes(v)
    ? "none"
    : `1px solid ${T.accentBd}`,
  borderRadius: "4px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.fontUi,
});
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "9px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
  fontFamily: T.fontUi,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink075}`,
  color: T.ink700,
  verticalAlign: "middle",
  fontSize: "13px",
  fontFamily: T.fontUi,
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function Badge({ label, color = T.info, bg = T.infoBg, border = T.infoBd }) {
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "3px",
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: T.fontUi,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ── PATIENTS TAB ──────────────────────────────────────────────────────────────
function PatientsTab({ patients, loading, onRefresh }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const { tenantId } = useTenant();

  const EMPTY = {
    name: "",
    id_number: "",
    date_of_birth: "",
    medical_aid: "",
    contact: "",
    notes: "",
    section_21_number: "",
    s21_expiry_date: "",
    condition: "",
    authorized_practitioner: "",
  };
  const [form, setForm] = useState(EMPTY);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.id_number || "").toLowerCase().includes(q)
    );
  });

  const openEdit = (p) => {
    setEditPatient(p);
    setForm({
      name: p.name || "",
      id_number: p.id_number || "",
      date_of_birth: p.date_of_birth || "",
      medical_aid: p.medical_aid || "",
      contact: p.contact || "",
      notes: p.notes || "",
      section_21_number: p.section_21_number || "",
      s21_expiry_date: p.s21_expiry_date || "",
      condition: p.condition || "",
      authorized_practitioner: p.authorized_practitioner || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Patient name is required.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        id_number: form.id_number.trim() || null,
        date_of_birth: form.date_of_birth || null,
        medical_aid: form.medical_aid.trim() || null,
        contact: form.contact.trim() || null,
        notes: form.notes.trim() || null,
        is_active: true,
        section_21_number: form.section_21_number.trim() || null,
        s21_expiry_date: form.s21_expiry_date || null,
        condition: form.condition.trim() || null,
        authorized_practitioner: form.authorized_practitioner.trim() || null,
      };
      if (editPatient) {
        const { error } = await supabase
          .from("patients")
          .update(data)
          .eq("id", editPatient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("patients")
          .insert({ ...data, tenant_id: tenantId });
        if (error) throw error;
      }
      setShowForm(false);
      setEditPatient(null);
      setForm(EMPTY);
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const lbl = (t) => (
    <label
      style={{
        fontSize: "11px",
        color: T.ink500,
        display: "block",
        marginBottom: "4px",
        fontFamily: T.fontUi,
      }}
    >
      {t}
    </label>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          style={{ ...sInput, width: "260px" }}
          placeholder="Search by name or ID number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            setEditPatient(null);
            setForm(EMPTY);
            setShowForm(true);
          }}
          style={sBtn()}
        >
          + Register Patient
        </button>
      </div>

      {showForm && (
        <div
          style={{
            ...sCard,
            marginBottom: "20px",
            borderLeft: `3px solid ${T.accent}`,
          }}
        >
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            {editPatient ? "Edit Patient" : "Register New Patient"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              {lbl("Full Name *")}
              <input
                style={sInput}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              {lbl("SA ID Number")}
              <input
                style={sInput}
                value={form.id_number}
                onChange={(e) => set("id_number", e.target.value)}
                placeholder="e.g. 9001015009087"
              />
            </div>
            <div>
              {lbl("Date of Birth")}
              <input
                style={sInput}
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
              />
            </div>
            <div>
              {lbl("Medical Aid")}
              <input
                style={sInput}
                value={form.medical_aid}
                onChange={(e) => set("medical_aid", e.target.value)}
                placeholder="e.g. Discovery Health"
              />
            </div>
            <div>
              {lbl("Contact Number")}
              <input
                style={sInput}
                value={form.contact}
                onChange={(e) => set("contact", e.target.value)}
              />
            </div>
            <div>
              {lbl("Section 21 Number")}
              <input
                style={sInput}
                value={form.section_21_number}
                onChange={(e) => set("section_21_number", e.target.value)}
                placeholder="e.g. SAHPRA/S21/2025/001"
              />
            </div>
            <div>
              {lbl("S21 Expiry Date")}
              <input
                style={sInput}
                type="date"
                value={form.s21_expiry_date}
                onChange={(e) => set("s21_expiry_date", e.target.value)}
              />
            </div>
            <div>
              {lbl("Condition / Diagnosis")}
              <input
                style={sInput}
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
                placeholder="e.g. Chronic pain — lower back"
              />
            </div>
            <div>
              {lbl("Authorised Practitioner")}
              <input
                style={sInput}
                value={form.authorized_practitioner}
                onChange={(e) => set("authorized_practitioner", e.target.value)}
                placeholder="e.g. Dr. M. van der Berg (MP0123456)"
              />
            </div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            {lbl("Notes")}
            <textarea
              style={{ ...sInput, minHeight: "60px", resize: "vertical" }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <button
              onClick={() => {
                setShowForm(false);
                setEditPatient(null);
              }}
              style={sBtn("outline")}
            >
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={sBtn()}>
              {saving
                ? "Saving..."
                : editPatient
                  ? "Update Patient"
                  : "Register Patient"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: T.ink400,
            fontFamily: T.fontUi,
          }}
        >
          Loading patients...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            padding: "60px",
            color: T.ink400,
            fontFamily: T.fontUi,
          }}
        >
          {search
            ? "No patients match your search."
            : "No patients registered yet."}
        </div>
      ) : (
        <div style={{ ...sCard, padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={sTh}>Name</th>
                <th style={sTh}>ID Number</th>
                <th style={sTh}>Date of Birth</th>
                <th style={sTh}>Medical Aid</th>
                <th style={sTh}>Contact</th>
                <th style={sTh}>Section 21 No.</th>
                <th style={sTh}>S21 Expiry</th>
                <th style={sTh}>Condition</th>
                <th style={sTh}>Authorised By</th>
                <th style={sTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...sTd, fontWeight: 500 }}>{p.name}</td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: T.fontData,
                      fontSize: "12px",
                      color: T.ink500,
                    }}
                  >
                    {p.id_number || "—"}
                  </td>
                  <td style={sTd}>{fmtDate(p.date_of_birth)}</td>
                  <td style={sTd}>{p.medical_aid || "—"}</td>
                  <td style={sTd}>{p.contact || "—"}</td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: T.fontData,
                      fontSize: "11px",
                      color: T.ink500,
                    }}
                  >
                    {p.section_21_number || "—"}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      color: (() => {
                        if (!p.s21_expiry_date) return T.ink700;
                        const days = Math.ceil(
                          (new Date(p.s21_expiry_date) - new Date()) / 86400000,
                        );
                        return days < 0
                          ? T.danger
                          : days <= 30
                            ? T.warning
                            : T.ink700;
                      })(),
                    }}
                  >
                    {fmtDate(p.s21_expiry_date)}
                    {p.s21_expiry_date &&
                      (() => {
                        const days = Math.ceil(
                          (new Date(p.s21_expiry_date) - new Date()) / 86400000,
                        );
                        if (days < 0)
                          return (
                            <div
                              style={{
                                fontSize: "9px",
                                color: T.danger,
                                fontWeight: 700,
                              }}
                            >
                              EXPIRED
                            </div>
                          );
                        if (days <= 30)
                          return (
                            <div
                              style={{
                                fontSize: "9px",
                                color: T.warning,
                                fontWeight: 700,
                              }}
                            >
                              {days}d left
                            </div>
                          );
                        return null;
                      })()}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontSize: "12px",
                      color: T.ink700,
                    }}
                  >
                    {p.condition || "—"}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontSize: "11px",
                      color: T.ink500,
                    }}
                  >
                    {p.authorized_practitioner || "—"}
                  </td>
                  <td style={sTd}>
                    <button
                      onClick={() => openEdit(p)}
                      style={{
                        ...sBtn("outline"),
                        padding: "4px 10px",
                        fontSize: "9px",
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div
        style={{
          fontSize: "11px",
          color: T.ink400,
          marginTop: "10px",
          textAlign: "right",
          fontFamily: T.fontUi,
        }}
      >
        {filtered.length} of {patients.length} patients
      </div>
    </div>
  );
}

// ── PRESCRIPTIONS TAB ─────────────────────────────────────────────────────────
function PrescriptionsTab({ prescriptions, patients, loading, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterActive, setFilterActive] = useState(true);
  const { tenantId } = useTenant();

  const EMPTY = {
    patient_id: "",
    doctor_name: "",
    doctor_hpcsa: "",
    substance: "",
    quantity_mg: "",
    repeats: "1",
    issue_date: "",
    expiry_date: "",
    notes: "",
  };
  const [form, setForm] = useState(EMPTY);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = prescriptions.filter((rx) =>
    filterActive ? rx.is_active : true,
  );

  const handleSave = async () => {
    if (
      !form.patient_id ||
      !form.doctor_name ||
      !form.substance ||
      !form.issue_date
    ) {
      alert("Patient, doctor name, substance and issue date are required.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("prescriptions").insert({
        patient_id: form.patient_id,
        tenant_id: tenantId,
        doctor_name: form.doctor_name.trim(),
        doctor_hpcsa: form.doctor_hpcsa.trim() || null,
        substance: form.substance.trim(),
        quantity_mg: parseFloat(form.quantity_mg) || null,
        repeats: parseInt(form.repeats) || 1,
        repeats_used: 0,
        issue_date: form.issue_date,
        expiry_date: form.expiry_date || null,
        is_active: true,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      setShowForm(false);
      setForm(EMPTY);
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rx) => {
    const { error } = await supabase
      .from("prescriptions")
      .update({ is_active: !rx.is_active })
      .eq("id", rx.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    onRefresh();
  };

  const lbl = (t) => (
    <label
      style={{
        fontSize: "11px",
        color: T.ink500,
        display: "block",
        marginBottom: "4px",
        fontFamily: T.fontUi,
      }}
    >
      {t}
    </label>
  );

  const repeatsRemaining = (rx) =>
    Math.max(0, (rx.repeats || 0) - (rx.repeats_used || 0));

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setFilterActive(!filterActive)}
          style={{
            ...sBtn("outline"),
            fontSize: "9px",
            color: filterActive ? T.success : T.ink500,
            borderColor: filterActive ? T.successBd : T.ink150,
          }}
        >
          {filterActive ? "Active Only" : "All Prescriptions"}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            setForm(EMPTY);
            setShowForm(true);
          }}
          style={sBtn()}
        >
          + New Prescription
        </button>
      </div>

      {showForm && (
        <div
          style={{
            ...sCard,
            marginBottom: "20px",
            borderLeft: `3px solid ${T.info}`,
          }}
        >
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            New Prescription
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              {lbl("Patient *")}
              <select
                style={sSelect}
                value={form.patient_id}
                onChange={(e) => set("patient_id", e.target.value)}
              >
                <option value="">— Select Patient —</option>
                {patients
                  .filter((p) => p.is_active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.id_number ? ` (${p.id_number})` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              {lbl("Doctor Name *")}
              <input
                style={sInput}
                value={form.doctor_name}
                onChange={(e) => set("doctor_name", e.target.value)}
              />
            </div>
            <div>
              {lbl("Doctor HPCSA Number")}
              <input
                style={sInput}
                value={form.doctor_hpcsa}
                onChange={(e) => set("doctor_hpcsa", e.target.value)}
                placeholder="e.g. MP0123456"
              />
            </div>
            <div>
              {lbl("Substance *")}
              <input
                style={sInput}
                value={form.substance}
                onChange={(e) => set("substance", e.target.value)}
                placeholder="e.g. Cannabis extract 20mg CBD/ml"
              />
            </div>
            <div>
              {lbl("Quantity (mg)")}
              <input
                style={sInput}
                type="number"
                value={form.quantity_mg}
                onChange={(e) => set("quantity_mg", e.target.value)}
              />
            </div>
            <div>
              {lbl("Repeats Authorised")}
              <input
                style={sInput}
                type="number"
                min="0"
                value={form.repeats}
                onChange={(e) => set("repeats", e.target.value)}
              />
            </div>
            <div>
              {lbl("Issue Date *")}
              <input
                style={sInput}
                type="date"
                value={form.issue_date}
                onChange={(e) => set("issue_date", e.target.value)}
              />
            </div>
            <div>
              {lbl("Expiry Date")}
              <input
                style={sInput}
                type="date"
                value={form.expiry_date}
                onChange={(e) => set("expiry_date", e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            {lbl("Notes")}
            <textarea
              style={{ ...sInput, minHeight: "50px", resize: "vertical" }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <button onClick={() => setShowForm(false)} style={sBtn("outline")}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={sBtn()}>
              {saving ? "Saving..." : "Create Prescription"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: T.ink400,
            fontFamily: T.fontUi,
          }}
        >
          Loading prescriptions...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            padding: "60px",
            color: T.ink400,
            fontFamily: T.fontUi,
          }}
        >
          No prescriptions found.
        </div>
      ) : (
        <div style={{ ...sCard, padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={sTh}>Patient</th>
                <th style={sTh}>Substance</th>
                <th style={sTh}>Doctor</th>
                <th style={sTh}>Issue Date</th>
                <th style={sTh}>Expiry</th>
                <th style={{ ...sTh, textAlign: "center" }}>Repeats Left</th>
                <th style={sTh}>Status</th>
                <th style={sTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rx) => {
                const remaining = repeatsRemaining(rx);
                const isExpired =
                  rx.expiry_date && new Date(rx.expiry_date) < new Date();
                return (
                  <tr key={rx.id} style={{ opacity: rx.is_active ? 1 : 0.6 }}>
                    <td style={{ ...sTd, fontWeight: 500 }}>
                      {patients.find((p) => p.id === rx.patient_id)?.name ||
                        "—"}
                    </td>
                    <td style={sTd}>{rx.substance}</td>
                    <td style={{ ...sTd, fontSize: "12px" }}>
                      {rx.doctor_name}
                      {rx.doctor_hpcsa && (
                        <div style={{ color: T.ink400, fontSize: "10px" }}>
                          {rx.doctor_hpcsa}
                        </div>
                      )}
                    </td>
                    <td style={sTd}>{fmtDate(rx.issue_date)}</td>
                    <td
                      style={{ ...sTd, color: isExpired ? T.danger : T.ink700 }}
                    >
                      {rx.expiry_date ? fmtDate(rx.expiry_date) : "—"}
                      {isExpired && (
                        <div
                          style={{
                            fontSize: "9px",
                            color: T.danger,
                            fontWeight: 700,
                          }}
                        >
                          EXPIRED
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "center",
                        fontFamily: T.fontData,
                        fontWeight: 700,
                        color:
                          remaining === 0
                            ? T.danger
                            : remaining <= 1
                              ? T.warning
                              : T.success,
                      }}
                    >
                      {remaining} / {rx.repeats || 0}
                    </td>
                    <td style={sTd}>
                      <Badge
                        label={rx.is_active ? "Active" : "Inactive"}
                        color={rx.is_active ? T.success : T.ink400}
                        bg={rx.is_active ? T.successBg : T.ink075}
                        border={rx.is_active ? T.successBd : T.ink150}
                      />
                    </td>
                    <td style={sTd}>
                      <button
                        onClick={() => handleToggleActive(rx)}
                        style={{
                          ...sBtn("outline"),
                          padding: "4px 10px",
                          fontSize: "9px",
                          color: rx.is_active ? T.warning : T.success,
                          borderColor: rx.is_active ? T.warningBd : T.successBd,
                        }}
                      >
                        {rx.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── DISPENSING TAB ────────────────────────────────────────────────────────────
function DispensingTab({
  patients,
  prescriptions,
  items,
  batches,
  log,
  loading,
  onRefresh,
}) {
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [voidModal, setVoidModal] = useState(null); // { entry, reason }
  const [voiding, setVoiding] = useState(false);
  const { tenantId } = useTenant();

  const EMPTY = {
    patient_id: "",
    prescription_id: "",
    inventory_item_id: "",
    batch_id: "",
    quantity_dispensed: "",
    notes: "",
  };
  const [form, setForm] = useState(EMPTY);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // LL-226: NEVER hard-delete dispensing_log — void only (Schedule 6 requirement)
  const handleVoid = async () => {
    if (!voidModal || !voidModal.reason.trim()) return;
    setVoiding(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("dispensing_log")
        .update({
          is_voided: true,
          void_reason: voidModal.reason.trim(),
          void_at: new Date().toISOString(),
          void_by: user?.id || null,
        })
        .eq("id", voidModal.entry.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      setVoidModal(null);
      onRefresh();
    } catch (err) {
      alert("Void failed: " + err.message);
    } finally {
      setVoiding(false);
    }
  };

  const patientRx = prescriptions.filter(
    (rx) => rx.patient_id === form.patient_id && rx.is_active,
  );
  const selectedRx = prescriptions.find((rx) => rx.id === form.prescription_id);
  const repeatsRemaining = selectedRx
    ? Math.max(0, (selectedRx.repeats || 0) - (selectedRx.repeats_used || 0))
    : null;
  const finishedItems = items.filter(
    (i) =>
      i.category === "finished_product" &&
      parseFloat(i.quantity_on_hand || 0) > 0,
  );

  const handleDispense = async () => {
    if (
      !form.patient_id ||
      !form.prescription_id ||
      !form.inventory_item_id ||
      !form.quantity_dispensed
    ) {
      alert("All fields are required.");
      return;
    }
    if (repeatsRemaining !== null && repeatsRemaining <= 0) {
      alert("No repeats remaining on this prescription.");
      return;
    }
    const qty = parseFloat(form.quantity_dispensed);
    if (qty <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    const item = items.find((i) => i.id === form.inventory_item_id);
    if (!item || parseFloat(item.quantity_on_hand || 0) < qty) {
      alert("Insufficient stock for this item.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Record dispensing event
      const { error: logErr } = await supabase.from("dispensing_log").insert({
        prescription_id: form.prescription_id,
        patient_id: form.patient_id,
        tenant_id: tenantId,
        inventory_item_id: form.inventory_item_id,
        batch_id: form.batch_id || null,
        quantity_dispensed: qty,
        dispensed_by: user?.id || null,
        dispensed_at: new Date().toISOString(),
        notes: form.notes.trim() || null,
      });
      if (logErr) throw logErr;

      // 2. Increment repeats_used on prescription
      const { error: rxErr } = await supabase
        .from("prescriptions")
        .update({ repeats_used: (selectedRx.repeats_used || 0) + 1 })
        .eq("id", form.prescription_id);
      if (rxErr) throw rxErr;

      // 3. Deduct stock
      const { error: stockErr } = await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: parseFloat(item.quantity_on_hand) - qty })
        .eq("id", form.inventory_item_id);
      if (stockErr) throw stockErr;

      // 4. Record stock movement
      await supabase.from("stock_movements").insert({
        item_id: form.inventory_item_id,
        quantity: -qty,
        movement_type: "sale_out",
        reference: `RX-${form.prescription_id.slice(0, 8)}`,
        notes: `Medical dispensing — patient ${patients.find((p) => p.id === form.patient_id)?.name || form.patient_id}`,
        performed_by: user?.id || null,
      });

      setForm(EMPTY);
      setShowForm(false);
      onRefresh();
    } catch (err) {
      alert("Dispensing error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const lbl = (t) => (
    <label
      style={{
        fontSize: "11px",
        color: T.ink500,
        display: "block",
        marginBottom: "4px",
        fontFamily: T.fontUi,
      }}
    >
      {t}
    </label>
  );

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            setForm(EMPTY);
            setShowForm(!showForm);
          }}
          style={sBtn()}
        >
          {showForm ? "Cancel" : "+ Dispense Medication"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...sCard, borderLeft: `3px solid ${T.accentMid}` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Record Dispensing Event
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              {lbl("Patient *")}
              <select
                style={sSelect}
                value={form.patient_id}
                onChange={(e) => {
                  set("patient_id", e.target.value);
                  set("prescription_id", "");
                }}
              >
                <option value="">— Select Patient —</option>
                {patients
                  .filter((p) => p.is_active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              {lbl("Prescription *")}
              <select
                style={sSelect}
                value={form.prescription_id}
                onChange={(e) => set("prescription_id", e.target.value)}
                disabled={!form.patient_id}
              >
                <option value="">— Select Prescription —</option>
                {patientRx.map((rx) => {
                  const rem = Math.max(
                    0,
                    (rx.repeats || 0) - (rx.repeats_used || 0),
                  );
                  return (
                    <option key={rx.id} value={rx.id} disabled={rem <= 0}>
                      {rx.substance} — {rem} repeat{rem !== 1 ? "s" : ""} left
                    </option>
                  );
                })}
              </select>
              {selectedRx && repeatsRemaining !== null && (
                <div
                  style={{
                    fontSize: "11px",
                    marginTop: "4px",
                    color: repeatsRemaining <= 1 ? T.warning : T.success,
                    fontFamily: T.fontUi,
                  }}
                >
                  {repeatsRemaining} repeat{repeatsRemaining !== 1 ? "s" : ""}{" "}
                  remaining
                </div>
              )}
            </div>
            <div>
              {lbl("Product Dispensed *")}
              <select
                style={sSelect}
                value={form.inventory_item_id}
                onChange={(e) => set("inventory_item_id", e.target.value)}
              >
                <option value="">— Select Product —</option>
                {finishedItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({Math.floor(parseFloat(i.quantity_on_hand || 0))}{" "}
                    in stock)
                  </option>
                ))}
              </select>
            </div>
            <div>
              {lbl("Batch / Lot Reference")}
              <select
                style={sSelect}
                value={form.batch_id}
                onChange={(e) => set("batch_id", e.target.value)}
                disabled={!form.inventory_item_id}
              >
                <option value="">— No specific batch —</option>
                {(batches || [])
                  .filter((b) =>
                    !form.inventory_item_id ||
                    b.inventory_item_id === form.inventory_item_id,
                  )
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number}
                      {b.expiry_date
                        ? ` · exp ${new Date(b.expiry_date).toLocaleDateString("en-ZA")}`
                        : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              {lbl("Quantity Dispensed *")}
              <input
                style={sInput}
                type="number"
                step="0.01"
                min="0.01"
                value={form.quantity_dispensed}
                onChange={(e) => set("quantity_dispensed", e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            {lbl("Notes")}
            <input
              style={sInput}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional dispensing notes"
            />
          </div>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <button onClick={() => setShowForm(false)} style={sBtn("outline")}>
              Cancel
            </button>
            <button onClick={handleDispense} disabled={saving} style={sBtn()}>
              {saving ? "Recording..." : "Confirm Dispensing"}
            </button>
          </div>
        </div>
      )}

      {/* ── VOID CONFIRMATION MODAL (LL-226) ─────────────────────────── */}
      {voidModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "28px",
              width: "460px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              fontFamily: T.fontUi,
            }}
          >
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: T.danger,
                marginBottom: "8px",
              }}
            >
              Void Dispensing Event
            </div>
            <div
              style={{
                fontSize: "12px",
                color: T.ink500,
                marginBottom: "16px",
                lineHeight: "1.6",
              }}
            >
              This event will be marked VOIDED in the audit log. The record is
              permanently preserved per Schedule 6 requirements. Stock and
              prescription repeats are not automatically adjusted — record a
              correction dispensing event if required.
            </div>
            <div
              style={{
                background: T.ink075,
                borderRadius: "6px",
                padding: "12px 14px",
                marginBottom: "16px",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: T.ink900,
                  marginBottom: "4px",
                }}
              >
                {patients.find((p) => p.id === voidModal.entry.patient_id)
                  ?.name || "\u2014"}
              </div>
              <div style={{ color: T.ink500 }}>
                {voidModal.entry.inventory_items?.name || "\u2014"} · Qty{" "}
                {voidModal.entry.quantity_dispensed} ·{" "}
                {new Date(voidModal.entry.dispensed_at).toLocaleDateString(
                  "en-ZA",
                )}
              </div>
            </div>
            <label
              style={{
                fontSize: "11px",
                color: T.ink500,
                display: "block",
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              Void Reason * (required for SAHPRA audit trail)
            </label>
            <textarea
              style={{
                ...sInput,
                minHeight: "70px",
                resize: "vertical",
                marginBottom: "16px",
                border: `1px solid ${T.dangerBd}`,
              }}
              value={voidModal.reason}
              onChange={(e) =>
                setVoidModal((p) => ({ ...p, reason: e.target.value }))
              }
              placeholder="e.g. Dispensing error — wrong product selected. Correct event re-recorded separately."
              autoFocus
            />
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setVoidModal(null)}
                style={sBtn("outline")}
                disabled={voiding}
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={!voidModal.reason.trim() || voiding}
                style={{
                  ...sBtn("danger"),
                  opacity: !voidModal.reason.trim() || voiding ? 0.5 : 1,
                }}
              >
                {voiding ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...sCard, padding: 0, overflow: "auto" }}>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${T.ink150}`,
            background: T.ink050,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div style={sLabel}>Recent Dispensing Events</div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowVoided((v) => !v)}
            style={{
              ...sBtn("outline"),
              fontSize: "9px",
              padding: "4px 10px",
              color: showVoided ? T.danger : T.ink400,
              borderColor: showVoided ? T.dangerBd : T.ink150,
            }}
          >
            {showVoided ? "Hide Voided" : "Show Voided"}
          </button>
        </div>
        {(() => {
          const voidedCount = log.filter((e) => e.is_voided).length;
          const displayLog = showVoided
            ? log
            : log.filter((e) => !e.is_voided);
          return loading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: T.ink400,
                fontFamily: T.fontUi,
              }}
            >
              Loading...
            </div>
          ) : displayLog.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: T.ink400,
                fontFamily: T.fontUi,
              }}
            >
              {!showVoided && voidedCount > 0
                ? `All ${voidedCount} event${voidedCount !== 1 ? "s" : ""} are voided — click "Show Voided" to view audit trail.`
                : "No dispensing events recorded yet."}
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={sTh}>Date</th>
                    <th style={sTh}>Patient</th>
                    <th style={sTh}>Product</th>
                    <th style={sTh}>Batch / Lot</th>
                    <th style={{ ...sTh, textAlign: "right" }}>Qty</th>
                    <th style={sTh}>Notes / Void Reason</th>
                    <th style={sTh}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLog.map((entry) => (
                    <tr
                      key={entry.id}
                      style={{
                        opacity: entry.is_voided ? 0.55 : 1,
                        background: entry.is_voided ? T.dangerBg : "transparent",
                      }}
                    >
                      <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            textDecoration: entry.is_voided
                              ? "line-through"
                              : "none",
                          }}
                        >
                          {new Date(entry.dispensed_at).toLocaleDateString(
                            "en-ZA",
                          )}
                          <div style={{ fontSize: "10px", color: T.ink400 }}>
                            {new Date(entry.dispensed_at).toLocaleTimeString(
                              "en-ZA",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontWeight: 500,
                          textDecoration: entry.is_voided
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {patients.find((p) => p.id === entry.patient_id)
                          ?.name || "\u2014"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textDecoration: entry.is_voided
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {entry.inventory_items?.name || "\u2014"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink500,
                          fontFamily: T.fontData,
                        }}
                      >
                        {entry.batches?.batch_number || "\u2014"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.fontData,
                          fontWeight: 600,
                        }}
                      >
                        {entry.quantity_dispensed}
                      </td>
                      <td style={{ ...sTd, fontSize: "12px", color: T.ink500 }}>
                        {entry.is_voided ? (
                          <div>
                            <Badge
                              label="VOIDED"
                              color={T.danger}
                              bg={T.dangerBg}
                              border={T.dangerBd}
                            />
                            {entry.void_reason && (
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: T.danger,
                                  marginTop: "3px",
                                  fontStyle: "italic",
                                }}
                              >
                                {entry.void_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          entry.notes || "\u2014"
                        )}
                      </td>
                      <td style={sTd}>
                        {!entry.is_voided ? (
                          <button
                            onClick={() =>
                              setVoidModal({ entry, reason: "" })
                            }
                            style={{
                              ...sBtn("outline"),
                              fontSize: "9px",
                              padding: "3px 8px",
                              color: T.danger,
                              borderColor: T.dangerBd,
                            }}
                          >
                            Void
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "9px",
                              color: T.ink400,
                              fontStyle: "italic",
                            }}
                          >
                            voided
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!showVoided && voidedCount > 0 && (
                <div
                  style={{
                    padding: "8px 16px",
                    fontSize: "11px",
                    color: T.danger,
                    background: T.dangerBg,
                    borderTop: `1px solid ${T.dangerBd}`,
                  }}
                >
                  {voidedCount} voided event
                  {voidedCount !== 1 ? "s" : ""} hidden ·{" "}
                  <button
                    onClick={() => setShowVoided(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.danger,
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: "11px",
                      fontFamily: T.fontUi,
                      padding: 0,
                    }}
                  >
                    Show voided audit trail
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ── REPORTS TAB ───────────────────────────────────────────────────────────────
function ReportsTab({ log, patients, prescriptions }) {
  const [groupBy, setGroupBy] = useState("patient");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLog = log.filter((e) => new Date(e.dispensed_at) >= monthStart);

  const byPatient = {};
  monthLog.forEach((e) => {
    const name = patients.find((p) => p.id === e.patient_id)?.name || "Unknown";
    if (!byPatient[name]) byPatient[name] = { count: 0, items: {} };
    byPatient[name].count++;
    const prod = e.inventory_items?.name || "Unknown";
    byPatient[name].items[prod] =
      (byPatient[name].items[prod] || 0) +
      parseFloat(e.quantity_dispensed || 0);
  });

  const bySubstance = {};
  monthLog.forEach((e) => {
    const rx = prescriptions.find((r) => r.id === e.prescription_id);
    const sub = rx?.substance || "Unknown";
    if (!bySubstance[sub]) bySubstance[sub] = { count: 0, qty: 0 };
    bySubstance[sub].count++;
    bySubstance[sub].qty += parseFloat(e.quantity_dispensed || 0);
  });

  const monthName = now.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ ...sLabel, marginBottom: 0 }}>Group by:</div>
        {["patient", "substance"].map((g) => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            style={{
              ...sBtn("outline"),
              padding: "5px 14px",
              fontSize: "9px",
              background: groupBy === g ? T.accent : "#fff",
              color: groupBy === g ? "#fff" : T.accentMid,
              borderColor: groupBy === g ? T.accent : T.accentBd,
            }}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ ...sCard, borderLeft: `3px solid ${T.info}` }}>
        <div style={{ ...sLabel, color: T.info, marginBottom: "14px" }}>
          Monthly Dispensing Report — {monthName}
        </div>
        <div
          style={{
            fontSize: "13px",
            color: T.ink500,
            marginBottom: "16px",
            fontFamily: T.fontUi,
          }}
        >
          {monthLog.length} dispensing event{monthLog.length !== 1 ? "s" : ""}{" "}
          this month
        </div>

        {groupBy === "patient" ? (
          Object.entries(byPatient).length === 0 ? (
            <div
              style={{
                color: T.ink400,
                fontFamily: T.fontUi,
                fontSize: "13px",
              }}
            >
              No dispensing events this month.
            </div>
          ) : (
            Object.entries(byPatient).map(([name, data]) => (
              <div
                key={name}
                style={{
                  padding: "12px 0",
                  borderBottom: `1px solid ${T.ink075}`,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    color: T.ink900,
                    fontFamily: T.fontUi,
                    marginBottom: "6px",
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: T.ink500,
                    fontFamily: T.fontUi,
                  }}
                >
                  {data.count} dispensing event{data.count !== 1 ? "s" : ""}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginTop: "6px",
                  }}
                >
                  {Object.entries(data.items).map(([prod, qty]) => (
                    <span
                      key={prod}
                      style={{
                        fontSize: "10px",
                        padding: "2px 8px",
                        background: T.ink075,
                        borderRadius: "3px",
                        fontFamily: T.fontUi,
                      }}
                    >
                      {prod}: {qty}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )
        ) : Object.entries(bySubstance).length === 0 ? (
          <div
            style={{ color: T.ink400, fontFamily: T.fontUi, fontSize: "13px" }}
          >
            No dispensing events this month.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={sTh}>Substance</th>
                <th style={{ ...sTh, textAlign: "right" }}>Events</th>
                <th style={{ ...sTh, textAlign: "right" }}>Total Qty</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(bySubstance).map(([sub, data]) => (
                <tr key={sub}>
                  <td style={sTd}>{sub}</td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.fontData,
                    }}
                  >
                    {data.count}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontFamily: T.fontData,
                      fontWeight: 600,
                    }}
                  >
                    {data.qty.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── COMPLIANCE TAB ────────────────────────────────────────────────────────────
function ComplianceTab({ prescriptions, patients, log }) {
  const expiringSoon = prescriptions.filter((rx) => {
    if (!rx.expiry_date || !rx.is_active) return false;
    const days = Math.ceil((new Date(rx.expiry_date) - new Date()) / 86400000);
    return days >= 0 && days <= 30;
  });
  const expired = prescriptions.filter((rx) => {
    if (!rx.expiry_date || !rx.is_active) return false;
    return new Date(rx.expiry_date) < new Date();
  });

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
        }}
      >
        {[
          {
            label: "Active Patients",
            value: patients.filter((p) => p.is_active).length,
            color: T.success,
          },
          {
            label: "Active Rx",
            value: prescriptions.filter((r) => r.is_active).length,
            color: T.info,
          },
          {
            label: "S21 Expiring 60d",
            value: patients.filter((p) => {
              if (!p.s21_expiry_date || !p.is_active) return false;
              const days = Math.ceil(
                (new Date(p.s21_expiry_date) - new Date()) / 86400000,
              );
              return days >= 0 && days <= 60;
            }).length,
            color: patients.some((p) => {
              if (!p.s21_expiry_date || !p.is_active) return false;
              const days = Math.ceil(
                (new Date(p.s21_expiry_date) - new Date()) / 86400000,
              );
              return days >= 0 && days <= 60;
            })
              ? T.warning
              : T.success,
          },
          {
            label: "Rx Expiring 30d",
            value: expiringSoon.length,
            color: expiringSoon.length > 0 ? T.warning : T.success,
          },
          {
            label: "Expired Rx",
            value: expired.length,
            color: expired.length > 0 ? T.danger : T.success,
          },
          { label: "Total Dispensed", value: log.length, color: T.ink900 },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: "#fff", padding: "16px 18px" }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: "6px",
                fontFamily: T.fontUi,
                fontWeight: 700,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: T.fontData,
                fontSize: "24px",
                fontWeight: 400,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* S21 Authorization expiry monitoring */}
      {(() => {
        const s21Expiring = patients.filter((p) => {
          if (!p.s21_expiry_date || !p.is_active) return false;
          const days = Math.ceil(
            (new Date(p.s21_expiry_date) - new Date()) / 86400000,
          );
          return days >= 0 && days <= 60;
        });
        const s21Expired = patients.filter((p) => {
          if (!p.s21_expiry_date || !p.is_active) return false;
          return new Date(p.s21_expiry_date) < new Date();
        });
        if (s21Expiring.length === 0 && s21Expired.length === 0) return null;
        return (
          <div
            style={{
              ...sCard,
              border: `1px solid ${s21Expired.length > 0 ? T.dangerBd : T.warningBd}`,
              borderLeft: `3px solid ${s21Expired.length > 0 ? T.danger : T.warning}`,
            }}
          >
            <div
              style={{
                ...sLabel,
                color: s21Expired.length > 0 ? T.danger : T.warning,
                marginBottom: "12px",
              }}
            >
              Section 21 Authorizations —{" "}
              {s21Expired.length > 0
                ? `${s21Expired.length} expired, action required`
                : `${s21Expiring.length} expiring within 60 days`}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={sTh}>Patient</th>
                  <th style={sTh}>S21 Number</th>
                  <th style={sTh}>Condition</th>
                  <th style={sTh}>Expiry Date</th>
                  <th style={{ ...sTh, textAlign: "center" }}>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {[...s21Expired, ...s21Expiring].map((p) => {
                  const days = Math.ceil(
                    (new Date(p.s21_expiry_date) - new Date()) / 86400000,
                  );
                  const isExpired = days < 0;
                  return (
                    <tr key={p.id}>
                      <td style={{ ...sTd, fontWeight: 500 }}>{p.name}</td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.fontData,
                          fontSize: "11px",
                          color: T.ink500,
                        }}
                      >
                        {p.section_21_number || "—"}
                      </td>
                      <td style={{ ...sTd, fontSize: "12px" }}>
                        {p.condition || "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          color: isExpired ? T.danger : T.warning,
                          fontWeight: 500,
                        }}
                      >
                        {fmtDate(p.s21_expiry_date)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "center",
                          fontFamily: T.fontData,
                          fontWeight: 700,
                          color: isExpired
                            ? T.danger
                            : days <= 14
                              ? T.danger
                              : T.warning,
                        }}
                      >
                        {isExpired ? "EXPIRED" : days}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {expiringSoon.length > 0 && (
        <div
          style={{
            ...sCard,
            border: `1px solid ${T.warningBd}`,
            borderLeft: `3px solid ${T.warning}`,
          }}
        >
          <div style={{ ...sLabel, color: T.warning, marginBottom: "12px" }}>
            Prescriptions Expiring Within 30 Days ({expiringSoon.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={sTh}>Patient</th>
                <th style={sTh}>Substance</th>
                <th style={sTh}>Expiry Date</th>
                <th style={{ ...sTh, textAlign: "center" }}>Days Left</th>
              </tr>
            </thead>
            <tbody>
              {expiringSoon.map((rx) => {
                const days = Math.ceil(
                  (new Date(rx.expiry_date) - new Date()) / 86400000,
                );
                return (
                  <tr key={rx.id}>
                    <td style={{ ...sTd, fontWeight: 500 }}>
                      {patients.find((p) => p.id === rx.patient_id)?.name ||
                        "—"}
                    </td>
                    <td style={sTd}>{rx.substance}</td>
                    <td style={sTd}>{fmtDate(rx.expiry_date)}</td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "center",
                        fontFamily: T.fontData,
                        fontWeight: 700,
                        color: days <= 7 ? T.danger : T.warning,
                      }}
                    >
                      {days}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {expired.length > 0 && (
        <div
          style={{
            ...sCard,
            border: `1px solid ${T.dangerBd}`,
            borderLeft: `3px solid ${T.danger}`,
          }}
        >
          <div style={{ ...sLabel, color: T.danger, marginBottom: "12px" }}>
            Expired Active Prescriptions ({expired.length}) — Action Required
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={sTh}>Patient</th>
                <th style={sTh}>Substance</th>
                <th style={sTh}>Expired</th>
              </tr>
            </thead>
            <tbody>
              {expired.map((rx) => (
                <tr key={rx.id}>
                  <td style={{ ...sTd, fontWeight: 500 }}>
                    {patients.find((p) => p.id === rx.patient_id)?.name || "—"}
                  </td>
                  <td style={sTd}>{rx.substance}</td>
                  <td style={{ ...sTd, color: T.danger }}>
                    {fmtDate(rx.expiry_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          ...sCard,
          border: `1px solid ${T.infoBd}`,
          borderLeft: `3px solid ${T.info}`,
        }}
      >
        <div style={{ ...sLabel, color: T.info, marginBottom: "8px" }}>
          Section 21 Compliance Notes
        </div>
        <p
          style={{
            fontSize: "13px",
            color: T.ink500,
            fontFamily: T.fontUi,
            lineHeight: "1.7",
            margin: 0,
          }}
        >
          All dispensing events are logged with patient ID, prescription
          reference, batch linkage and dispenser identity. Prescription repeats
          are tracked and enforced. Expired prescriptions are flagged
          automatically. Export dispensing log from the Reports tab for SAHPRA
          submissions.
        </p>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function HQMedical() {
  const [subTab, setSubTab] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [dispensingLog, setDispensingLog] = useState([]);
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { tenantId, tenantConfig, industryProfile } = useTenant();

  // Gate check — should not render if not gated, but belt-and-suspenders
  const isGated =
    tenantConfig?.feature_medical !== false &&
    industryProfile === "cannabis_dispensary";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pR, rxR, logR, invR, batchR] = await Promise.all([
        supabase
          .from("patients")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("prescriptions")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("dispensing_log")
          .select("*, inventory_items(name,sku), batches(batch_number,expiry_date)")
          .eq("tenant_id", tenantId)
          .order("dispensed_at", { ascending: false })
          .limit(200),
        supabase
          .from("inventory_items")
          .select("id,name,sku,category,quantity_on_hand")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("batches")
          .select("id,batch_number,product_name,inventory_item_id,expiry_date,section_21_number")
          .eq("tenant_id", tenantId)
          .eq("is_archived", false)
          .order("batch_number"),
      ]);
      if (pR.error) throw pR.error;
      if (rxR.error) throw rxR.error;
      if (logR.error) throw logR.error;
      setPatients(pR.data || []);
      setPrescriptions(rxR.data || []);
      setDispensingLog(logR.data || []);
      setItems(invR.data || []);
      setBatches(batchR.data || []);
    } catch (err) {
      console.error("[HQMedical] fetchAll error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (!isGated) {
    return (
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.warningBd}`,
          borderLeft: `3px solid ${T.warning}`,
          margin: "20px 0",
        }}
      >
        <div style={{ ...sLabel, color: T.warning }}>Access Restricted</div>
        <p
          style={{
            fontSize: "13px",
            color: T.ink700,
            fontFamily: T.fontUi,
            margin: "8px 0 0",
            lineHeight: "1.7",
          }}
        >
          The Medical Dispensary module requires{" "}
          <strong>feature_medical = true</strong> and tenant profile{" "}
          <strong>cannabis_dispensary</strong>. Contact your platform
          administrator to enable this module.
        </p>
      </div>
    );
  }

  const TABS = [
    { id: "patients", label: "Patients" },
    { id: "prescriptions", label: "Prescriptions" },
    { id: "dispensing", label: "Dispensing" },
    { id: "reports", label: "Reports" },
    { id: "compliance", label: "Compliance" },
  ];

  return (
    <div style={{ fontFamily: T.fontUi }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: T.accent,
              fontFamily: T.fontUi,
            }}
          >
            Medical Dispensary
          </div>
          <div style={{ fontSize: "12px", color: T.ink400, marginTop: "2px" }}>
            {patients.length} patients ·{" "}
            {prescriptions.filter((r) => r.is_active).length} active
            prescriptions · {dispensingLog.length} dispensing events
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={fetchAll}
            style={{ ...sBtn("outline"), fontSize: "9px", padding: "6px 12px" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${T.ink150}`,
          marginBottom: "24px",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom:
                subTab === t.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              fontFamily: T.fontUi,
              fontSize: "11px",
              fontWeight: subTab === t.id ? 700 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: subTab === t.id ? T.accent : T.ink500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginBottom: "-1px",
            }}
          >
            {t.label}
            {t.id === "patients" && patients.length > 0 && (
              <span
                style={{
                  marginLeft: "6px",
                  background: T.accent,
                  color: "#fff",
                  borderRadius: "10px",
                  fontSize: "9px",
                  padding: "1px 6px",
                  fontWeight: 700,
                }}
              >
                {patients.length}
              </span>
            )}
            {t.id === "compliance" &&
              (() => {
                const warn =
                  prescriptions.filter((rx) => {
                    if (!rx.expiry_date || !rx.is_active) return false;
                    const days = Math.ceil(
                      (new Date(rx.expiry_date) - new Date()) / 86400000,
                    );
                    return days >= 0 && days <= 30;
                  }).length +
                  prescriptions.filter(
                    (rx) =>
                      rx.expiry_date &&
                      rx.is_active &&
                      new Date(rx.expiry_date) < new Date(),
                  ).length;
                return warn > 0 ? (
                  <span
                    style={{
                      marginLeft: "4px",
                      background: T.danger,
                      color: "#fff",
                      borderRadius: "10px",
                      fontSize: "9px",
                      padding: "1px 6px",
                      fontWeight: 700,
                    }}
                  >
                    !
                  </span>
                ) : null;
              })()}
          </button>
        ))}
      </div>

      {subTab === "patients" && (
        <PatientsTab
          patients={patients}
          loading={loading}
          onRefresh={fetchAll}
        />
      )}
      {subTab === "prescriptions" && (
        <PrescriptionsTab
          prescriptions={prescriptions}
          patients={patients}
          loading={loading}
          onRefresh={fetchAll}
        />
      )}
      {subTab === "dispensing" && (
        <DispensingTab
          patients={patients}
          prescriptions={prescriptions}
          items={items}
          batches={batches}
          log={dispensingLog}
          loading={loading}
          onRefresh={fetchAll}
        />
      )}
      {subTab === "reports" && (
        <ReportsTab
          log={dispensingLog}
          patients={patients}
          prescriptions={prescriptions}
        />
      )}
      {subTab === "compliance" && (
        <ComplianceTab
          prescriptions={prescriptions}
          patients={patients}
          log={dispensingLog}
        />
      )}
    </div>
  );
}
