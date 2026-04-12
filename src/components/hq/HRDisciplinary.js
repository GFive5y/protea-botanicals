// HRDisciplinary.js v1.1
// Protea Botanicals · HR Module · Disciplinary Records
// WP-HR-6 · March 2026
// src/components/hq/HRDisciplinary.js
//
// Record types: verbal_warning | written_warning | final_warning |
//               notice_to_attend | suspension | hearing_outcome | dismissal
// Features: Full CRUD · Progressive discipline tracker · HTML→PDF letters
// Access: Admin can create verbal_warning only. HR can create all types.

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";
// Design tokens — imported from tokens.js (WP-UNIFY)

// ─── Constants ────────────────────────────────────────────────────────────────
const RECORD_TYPES = [
  {
    value: "verbal_warning",
    label: "Verbal Warning",
    hrOnly: false,
    validMonths: 6,
  },
  {
    value: "written_warning",
    label: "Written Warning",
    hrOnly: false,
    validMonths: 6,
  },
  {
    value: "final_warning",
    label: "Final Warning",
    hrOnly: true,
    validMonths: 12,
  },
  {
    value: "notice_to_attend",
    label: "Notice to Attend",
    hrOnly: true,
    validMonths: null,
  },
  { value: "suspension", label: "Suspension", hrOnly: true, validMonths: null },
  {
    value: "hearing_outcome",
    label: "Hearing Outcome",
    hrOnly: true,
    validMonths: null,
  },
  { value: "dismissal", label: "Dismissal", hrOnly: true, validMonths: null },
];

// Legacy aliases — preserve all internal logic referencing C
const C = {
  green: T.accent,
  greenLight: T.accentLight,
  greenMid: T.accentMid,
  amber: T.warning,
  amberLight: T.warningLight,
  red: T.danger,
  redLight: T.dangerLight,
  blue: T.info,
  blueLight: T.infoLight,
  border: T.border,
  bg: T.bg,
  white: "#fff",
  text: T.ink700,
  muted: T.ink500,
};

const STATUS_CFG = {
  draft: { label: "Draft", bg: T.bg, color: T.ink500 },
  issued: { label: "Issued", bg: T.warningLight, color: T.warning },
  acknowledged: { label: "Acknowledged", bg: T.successLight, color: T.success },
  appealed: { label: "Appealed", bg: T.infoLight, color: T.info },
  lapsed: { label: "Lapsed", bg: T.bg, color: T.ink500 },
  closed: { label: "Closed", bg: T.bg, color: T.ink500 },
};

const TYPE_CFG = {
  verbal_warning: { color: T.warning, bg: T.warningLight },
  written_warning: { color: "#e65100", bg: "#fff3e0" },
  final_warning: { color: T.danger, bg: T.dangerLight },
  notice_to_attend: { color: T.info, bg: T.infoLight },
  suspension: { color: "#6a1b9a", bg: "#f3e5f5" },
  hearing_outcome: { color: "#4e342e", bg: "#efebe9" },
  dismissal: { color: "#b71c1c", bg: "#ffebee" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}
function typeCfg(type) {
  return TYPE_CFG[type] || { color: T.ink500, bg: T.bg };
}
function typeLabel(type) {
  return RECORD_TYPES.find((r) => r.value === type)?.label || type;
}

function TypeBadge({ type }) {
  const cfg = typeCfg(type);
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.font,
        padding: "2px 8px",
        borderRadius: 20,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {typeLabel(type)}
    </span>
  );
}
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || {
    label: status,
    bg: T.bg,
    color: T.ink500,
  };
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.font,
        padding: "2px 8px",
        borderRadius: 20,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── HTML→PDF letter generator ────────────────────────────────────────────────
function generateDisciplinaryLetter(
  record,
  staffName,
  issuedByName,
  tenantName = "Protea Botanicals",
) {
  const tLabel = typeLabel(record.record_type);
  const validUntilText = record.valid_until
    ? `This ${tLabel} remains on record until ${fmtDate(record.valid_until)}.`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${tLabel} — ${staffName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 12pt; color: #1a1a1a; padding: 50px; max-width: 780px; margin: 0 auto; }
  .header { border-bottom: 2px solid #1b4332; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .company { font-size: 20pt; color: #1b4332; font-weight: bold; }
  .doc-type { font-size: 10pt; color: #555; text-transform: uppercase; letter-spacing: 0.1em; }
  h2 { font-size: 14pt; color: #c62828; margin: 24px 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  td { padding: 8px 10px; border: 1px solid #e0dbd2; font-size: 11pt; }
  td:first-child { font-weight: bold; width: 38%; background: #f9f7f4; }
  .body-text { line-height: 1.7; font-size: 11pt; margin-bottom: 16px; }
  .warning-box { background: #fff8e1; border: 1px solid #ffe082; padding: 14px 16px; margin: 20px 0; font-size: 11pt; line-height: 1.6; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 56px; }
  .sig-line { border-top: 1px solid #333; padding-top: 8px; font-size: 10pt; color: #555; }
  .footer { margin-top: 40px; font-size: 9pt; color: #aaa; text-align: center; border-top: 1px solid #e0dbd2; padding-top: 10px; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    <div><div class="company">${tenantName}</div><div class="doc-type">${tLabel}</div></div>
    <div style="text-align:right;font-size:10pt;color:#555">Date issued: ${fmtDate(record.issued_date || new Date())}<br>Ref: DISC-${record.id?.slice(0, 8).toUpperCase() || "DRAFT"}</div>
  </div>
  <h2>Notice of ${tLabel}</h2>
  <table>
    <tr><td>Employee</td><td>${staffName}</td></tr>
    <tr><td>Subject</td><td>${record.subject || "—"}</td></tr>
    <tr><td>Incident Date</td><td>${fmtDate(record.incident_date)}</td></tr>
    <tr><td>Issued By</td><td>${issuedByName || "Management"}</td></tr>
    ${record.witness_1_name ? `<tr><td>Witness</td><td>${record.witness_1_name}${record.witness_2_name ? `, ${record.witness_2_name}` : ""}</td></tr>` : ""}
    ${record.rule_infringed ? `<tr><td>Rule / Policy Infringed</td><td>${record.rule_infringed}</td></tr>` : ""}
  </table>
  <div class="body-text"><strong>Description of Incident:</strong><br>${record.description || "See attached incident report."}</div>
  ${record.outcome ? `<div class="body-text"><strong>Outcome / Sanctions:</strong><br>${record.outcome}${record.sanctions_applied ? "<br><em>" + record.sanctions_applied + "</em>" : ""}</div>` : ""}
  <div class="warning-box">
    You are hereby issued this <strong>${tLabel}</strong>. ${validUntilText}
    Further misconduct of a similar nature may result in more serious disciplinary action, up to and including dismissal.
    You have the right to appeal this decision within 5 business days of receipt.
  </div>
  ${record.hearing_date ? `<div class="body-text"><strong>Hearing Details:</strong><br>Date: ${fmtDate(record.hearing_date)}<br>${record.hearing_location ? "Location: " + record.hearing_location : ""}</div>` : ""}
  <div class="sig-grid">
    <div><div style="height:48px"></div><div class="sig-line">Employee: ${staffName}<br>Date: ____________________</div></div>
    <div><div style="height:48px"></div><div class="sig-line">Employer: ${tenantName}<br>Date: ____________________</div></div>
  </div>
  <div class="footer">${tenantName} · Disciplinary Record · STRICTLY CONFIDENTIAL · Generated ${new Date().toLocaleDateString("en-ZA")}</div>
</body></html>`;
}

function printLetter(html) {
  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: T.font,
    color: T.ink500,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: `1px solid ${T.border}`,
    background: T.bg,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "11px 14px",
    borderBottom: `1px solid ${T.border}`,
    verticalAlign: "middle",
    fontSize: 13,
    fontFamily: T.font,
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
    border: `1px solid ${T.border}`,
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
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  },
  textarea: {
    padding: "8px 12px",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
    resize: "vertical",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: T.font,
    color: T.ink500,
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
    maxWidth: 660,
    height: "100vh",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
    overflowY: "hidden",
    fontFamily: T.font,
  },
  dHead: {
    padding: "18px 24px",
    borderBottom: `1px solid ${T.border}`,
    background: T.bg,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  dBody: { flex: 1, overflowY: "auto", padding: 24 },
  dFoot: {
    padding: "14px 24px",
    borderTop: `1px solid ${T.border}`,
    background: T.bg,
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
  field: { marginBottom: 16 },
  section: {
    fontFamily: T.font,
    fontSize: 11,
    fontWeight: 700,
    color: T.ink500,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: "20px 0 12px 0",
    paddingBottom: 8,
    borderBottom: `1px solid ${T.border}`,
  },
  toast: (t) => ({
    padding: "10px 16px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
    fontFamily: T.font,
    background: t === "success" ? T.successLight : T.dangerLight,
    color: t === "success" ? T.success : T.danger,
  }),
  error: {
    padding: "12px 16px",
    background: T.dangerLight,
    color: T.danger,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
    fontFamily: T.font,
  },
  statCard: { background: "#fff", padding: "16px 18px" },
  statNum: {
    fontFamily: T.font,
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  statLbl: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: T.font,
    color: T.ink500,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginTop: 6,
  },
};

// ─── Record Form Drawer ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  record_type: "verbal_warning",
  incident_date: "",
  issued_date: "",
  subject: "",
  description: "",
  rule_infringed: "",
  witness_1_name: "",
  witness_2_name: "",
  outcome: "",
  sanctions_applied: "",
  valid_until: "",
  status: "draft",
  hearing_date: "",
  hearing_location: "",
  hearing_notes: "",
  employee_response: "",
  appeal_lodged: false,
  appeal_outcome: "",
};

function RecordDrawer({
  record,
  staffId,
  tenantId,
  staffName,
  allStaff,
  onClose,
  onSaved,
}) {
  const isNew = !record?.id;
  const initForm = isNew
    ? EMPTY_FORM
    : {
        record_type: record.record_type || "verbal_warning",
        incident_date: record.incident_date || "",
        issued_date: record.issued_date || "",
        subject: record.subject || "",
        description: record.description || "",
        rule_infringed: record.rule_infringed || "",
        witness_1_name: record.witness_1_name || "",
        witness_2_name: record.witness_2_name || "",
        outcome: record.outcome || "",
        sanctions_applied: record.sanctions_applied || "",
        valid_until: record.valid_until || "",
        status: record.status || "draft",
        hearing_date: record.hearing_date
          ? record.hearing_date.slice(0, 16)
          : "",
        hearing_location: record.hearing_location || "",
        hearing_notes: record.hearing_notes || "",
        employee_response: record.employee_response || "",
        appeal_lodged: record.appeal_lodged || false,
        appeal_outcome: record.appeal_outcome || "",
      };

  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("details");

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const f = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));
  const fb = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.checked }));

  // Auto-calculate valid_until when type or issued_date changes
  useEffect(() => {
    const typeDef = RECORD_TYPES.find((r) => r.value === form.record_type);
    if (typeDef?.validMonths && form.issued_date) {
      const d = new Date(form.issued_date);
      d.setMonth(d.getMonth() + typeDef.validMonths);
      setForm((p) => ({ ...p, valid_until: d.toISOString().slice(0, 10) }));
    }
  }, [form.record_type, form.issued_date]);

  const save = async () => {
    if (!form.incident_date || !form.subject.trim()) {
      setToast({
        type: "error",
        msg: "Incident date and subject are required.",
      });
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
        record_type: form.record_type,
        incident_date: form.incident_date,
        issued_date: form.issued_date || null,
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        rule_infringed: form.rule_infringed.trim() || null,
        witness_1_name: form.witness_1_name.trim() || null,
        witness_2_name: form.witness_2_name.trim() || null,
        outcome: form.outcome.trim() || null,
        sanctions_applied: form.sanctions_applied.trim() || null,
        valid_until: form.valid_until || null,
        status: form.status,
        hearing_date: form.hearing_date
          ? new Date(form.hearing_date).toISOString()
          : null,
        hearing_location: form.hearing_location.trim() || null,
        hearing_notes: form.hearing_notes.trim() || null,
        employee_response: form.employee_response.trim() || null,
        appeal_lodged: !!form.appeal_lodged,
        appeal_outcome: form.appeal_outcome.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (isNew) payload.issued_by = user.id;

      let error;
      if (isNew) {
        ({ error } = await supabase
          .from("disciplinary_records")
          .insert([payload]));
      } else {
        ({ error } = await supabase
          .from("disciplinary_records")
          .update(payload)
          .eq("id", record.id));
      }
      if (error) throw error;
      setToast({
        type: "success",
        msg: isNew ? "Record created." : "Record updated.",
      });
      setTimeout(() => onSaved && onSaved(), 700);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const markIssued = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("disciplinary_records")
        .update({
          status: "issued",
          issued_date:
            form.issued_date || new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);
      if (error) throw error;
      setToast({ type: "success", msg: "Marked as issued." });
      setTimeout(() => onSaved && onSaved(), 700);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const DRAWER_TABS = ["details", "hearing", "response"];

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
                fontFamily: T.font,
                color: T.danger,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {isNew ? "New Record" : typeLabel(record.record_type)}
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
            {!isNew && <StatusBadge status={record.status} />}
          </div>
          <button
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: T.ink500,
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Sub-tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
            background: T.bg,
          }}
        >
          {DRAWER_TABS.map((t) => (
            <button
              key={t}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                border: "none",
                background: "transparent",
                fontSize: 11,
                fontFamily: T.font,
                color: tab === t ? T.danger : T.ink500,
                borderBottom:
                  tab === t ? `2px solid ${T.danger}` : "2px solid transparent",
                fontWeight: tab === t ? 700 : 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: -1,
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={s.dBody}>
          {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}

          {/* ── DETAILS TAB ── */}
          {tab === "details" && (
            <>
              <div style={s.section}>Incident Details</div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Record Type *</label>
                  <select
                    style={s.select}
                    value={form.record_type}
                    onChange={f("record_type")}
                  >
                    {RECORD_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Status</label>
                  <select
                    style={s.select}
                    value={form.status}
                    onChange={f("status")}
                  >
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Incident Date *</label>
                  <input
                    style={s.input}
                    type="date"
                    value={form.incident_date}
                    onChange={f("incident_date")}
                  />
                </div>
                <div>
                  <label style={s.label}>Issued Date</label>
                  <input
                    style={s.input}
                    type="date"
                    value={form.issued_date}
                    onChange={f("issued_date")}
                  />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Subject *</label>
                <input
                  style={s.input}
                  value={form.subject}
                  onChange={f("subject")}
                  placeholder="Brief description of the incident"
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Rule / Policy Infringed</label>
                <input
                  style={s.input}
                  value={form.rule_infringed}
                  onChange={f("rule_infringed")}
                  placeholder="e.g. Company Rule 3.2 — Insubordination"
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Description of Incident</label>
                <textarea
                  style={{ ...s.textarea, height: 100 }}
                  value={form.description}
                  onChange={f("description")}
                  placeholder="Detailed account of what occurred…"
                />
              </div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Witness 1</label>
                  <input
                    style={s.input}
                    value={form.witness_1_name}
                    onChange={f("witness_1_name")}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label style={s.label}>Witness 2</label>
                  <input
                    style={s.input}
                    value={form.witness_2_name}
                    onChange={f("witness_2_name")}
                    placeholder="Full name"
                  />
                </div>
              </div>
              <div style={s.section}>Outcome</div>
              <div style={s.field}>
                <label style={s.label}>Outcome</label>
                <textarea
                  style={{ ...s.textarea, height: 80 }}
                  value={form.outcome}
                  onChange={f("outcome")}
                  placeholder="Decision, finding, or outcome of disciplinary process…"
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Sanctions Applied</label>
                <input
                  style={s.input}
                  value={form.sanctions_applied}
                  onChange={f("sanctions_applied")}
                  placeholder="e.g. Final written warning, 3-day suspension"
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Valid Until (auto-calculated)</label>
                <input
                  style={s.input}
                  type="date"
                  value={form.valid_until}
                  onChange={f("valid_until")}
                />
              </div>
            </>
          )}

          {/* ── HEARING TAB ── */}
          {tab === "hearing" && (
            <>
              <div style={s.section}>Hearing Details</div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Hearing Date & Time</label>
                  <input
                    style={s.input}
                    type="datetime-local"
                    value={form.hearing_date}
                    onChange={f("hearing_date")}
                  />
                </div>
                <div>
                  <label style={s.label}>Location</label>
                  <input
                    style={s.input}
                    value={form.hearing_location}
                    onChange={f("hearing_location")}
                    placeholder="e.g. Boardroom, Zoom"
                  />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Hearing Notes</label>
                <textarea
                  style={{ ...s.textarea, height: 120 }}
                  value={form.hearing_notes}
                  onChange={f("hearing_notes")}
                  placeholder="Notes from the hearing proceedings…"
                />
              </div>
            </>
          )}

          {/* ── RESPONSE TAB ── */}
          {tab === "response" && (
            <>
              <div style={s.section}>Employee Response</div>
              <div style={s.field}>
                <label style={s.label}>Employee Written Response</label>
                <textarea
                  style={{ ...s.textarea, height: 120 }}
                  value={form.employee_response}
                  onChange={f("employee_response")}
                  placeholder="Employee's written response to the charge…"
                />
              </div>
              <div style={s.section}>Appeal</div>
              <div style={s.field}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontFamily: T.font,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!form.appeal_lodged}
                    onChange={fb("appeal_lodged")}
                  />
                  Appeal lodged by employee
                </label>
              </div>
              {form.appeal_lodged && (
                <div style={s.field}>
                  <label style={s.label}>Appeal Outcome</label>
                  <textarea
                    style={{ ...s.textarea, height: 80 }}
                    value={form.appeal_outcome}
                    onChange={f("appeal_outcome")}
                    placeholder="Outcome of the appeal hearing…"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div style={s.dFoot}>
          <div style={{ display: "flex", gap: 8 }}>
            {!isNew && (
              <button
                style={s.outBtn(T.info)}
                onClick={() =>
                  printLetter(generateDisciplinaryLetter(record, staffName, ""))
                }
              >
                🖨 Print Letter
              </button>
            )}
            {!isNew && record.status === "draft" && (
              <button
                style={s.outBtn(T.warning)}
                onClick={markIssued}
                disabled={saving}
              >
                Mark Issued
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={s.outBtn(T.ink300)} onClick={onClose}>
              Cancel
            </button>
            <button style={s.btn(T.danger)} onClick={save} disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create Record" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Progressive Discipline Tracker ─────────────────────────────────────────
function ProgressiveTracker({ records }) {
  const active = records.filter((r) => {
    if (!r.valid_until) return false;
    return (
      new Date(r.valid_until) > new Date() &&
      r.status !== "lapsed" &&
      r.status !== "closed"
    );
  });
  const verbal = active.filter(
    (r) => r.record_type === "verbal_warning",
  ).length;
  const written = active.filter(
    (r) => r.record_type === "written_warning",
  ).length;
  const final = active.filter((r) => r.record_type === "final_warning").length;
  const level = final > 0 ? 3 : written > 0 ? 2 : verbal > 0 ? 1 : 0;

  if (active.length === 0) return null;

  const steps = [
    { label: "Verbal", color: T.warning, active: verbal > 0 },
    { label: "Written", color: "#e65100", active: written > 0 },
    { label: "Final", color: T.danger, active: final > 0 },
    { label: "Dismissal", color: "#b71c1c", active: false },
  ];

  return (
    <div
      style={{
        padding: "12px 16px",
        background: T.dangerLight,
        border: `1px solid ${T.dangerBd}`,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: T.font,
          color: T.danger,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        Progressive Discipline — Active Warnings
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: step.active ? step.color : T.border,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 4px",
                  border: step.active
                    ? `2px solid ${step.color}`
                    : `2px solid ${T.border}`,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: T.font,
                  color: step.active ? step.color : T.ink500,
                  fontWeight: step.active ? 700 : 400,
                }}
              >
                {step.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  height: 2,
                  flex: 1,
                  background: i < level ? steps[i].color : T.border,
                  marginBottom: 18,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HRDisciplinary({ tenantId }) {
  const [records, setRecords] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [staffFilter, setStaffFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerStaffId, setDrawerStaffId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
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
      const [staffRes, recRes] = await Promise.allSettled([
        supabase
          .from("staff_profiles")
          .select("id, full_name, preferred_name, job_title")
          .eq("tenant_id", tenantId)
          .order("full_name"),
        supabase
          .from("disciplinary_records")
          .select(
            "id, staff_profile_id, record_type, incident_date, issued_date, subject, status, valid_until, outcome, sanctions_applied, appeal_lodged, acknowledged_at, created_at",
          )
          .eq("tenant_id", tenantId)
          .order("incident_date", { ascending: false }),
      ]);
      setStaffList(
        staffRes.status === "fulfilled" ? staffRes.value.data || [] : [],
      );
      setRecords(recRes.status === "fulfilled" ? recRes.value.data || [] : []);
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
    setEditingRecord(null);
    setDrawerOpen(true);
  };
  const openEdit = (r) => {
    setDrawerStaffId(r.staff_profile_id);
    setEditingRecord(r);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingRecord(null);
    setDrawerStaffId(null);
  };

  const filtered = records.filter((r) => {
    const ms = !staffFilter || r.staff_profile_id === staffFilter;
    const mt = !typeFilter || r.record_type === typeFilter;
    const mst = !statusFilter || r.status === statusFilter;
    return ms && mt && mst;
  });

  const activeWarnings = records.filter(
    (r) =>
      r.valid_until &&
      new Date(r.valid_until) > new Date() &&
      !["lapsed", "closed"].includes(r.status),
  );
  const pendingAck = records.filter(
    (r) => r.status === "issued" && !r.acknowledged_at,
  );
  const statsByType = RECORD_TYPES.reduce((acc, t) => {
    acc[t.value] = records.filter((r) => r.record_type === t.value).length;
    return acc;
  }, {});
  const staffRecords = staffFilter
    ? records.filter((r) => r.staff_profile_id === staffFilter)
    : [];

  return (
    <div style={{ fontFamily: T.font, color: T.ink700 }}>
      {/* Alert banners */}
      {pendingAck.length > 0 && (
        <div
          style={{
            padding: "10px 14px",
            background: T.warningLight,
            border: `1px solid ${T.warningBd}`,
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            fontFamily: T.font,
            color: T.warning,
            fontWeight: 600,
          }}
        >
          ⚠ {pendingAck.length} record{pendingAck.length !== 1 ? "s" : ""}{" "}
          issued but not yet acknowledged by staff
        </div>
      )}

      {/* Stats — flush grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1px",
          background: T.border,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow.sm,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total Records", num: records.length, color: T.ink700 },
          {
            label: "Active Warnings",
            num: activeWarnings.length,
            color: activeWarnings.length > 0 ? T.danger : T.ink500,
          },
          {
            label: "Pending Acknowledgement",
            num: pendingAck.length,
            color: pendingAck.length > 0 ? T.warning : T.ink500,
          },
          {
            label: "Dismissals",
            num: statsByType.dismissal || 0,
            color: statsByType.dismissal > 0 ? "#b71c1c" : T.ink500,
          },
        ].map(({ label, num, color }) => (
          <div key={label} style={s.statCard}>
            <div style={{ ...s.statNum, color }}>{num}</div>
            <div style={s.statLbl}>{label}</div>
          </div>
        ))}
      </div>

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
          {RECORD_TYPES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          style={{ ...s.select, width: "auto" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
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
            + New Record for…
          </option>
          {staffList.map((st) => (
            <option key={st.id} value={st.id}>
              {st.preferred_name || st.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Progressive discipline tracker */}
      {staffFilter && staffRecords.length > 0 && (
        <ProgressiveTracker records={staffRecords} />
      )}

      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
      {error && <div style={s.error}>⚠ {error}</div>}

      {/* Table */}
      {loading ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: T.ink500,
            fontFamily: T.font,
          }}
        >
          Loading disciplinary records…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{ padding: "48px 24px", textAlign: "center", color: T.ink500 }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚠</div>
          <div
            style={{
              fontFamily: T.font,
              fontSize: 15,
              color: T.ink500,
              marginBottom: 6,
            }}
          >
            {records.length === 0
              ? "No disciplinary records on file"
              : "No records match your filters"}
          </div>
          <div style={{ fontSize: 12, fontFamily: T.font, color: T.ink300 }}>
            Records are created per staff member using the dropdown above
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "Staff Member",
                  "Type",
                  "Subject",
                  "Incident",
                  "Valid Until",
                  "Status",
                  "Appeal",
                  "",
                ].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const d = daysUntil(r.valid_until);
                const expiring = d !== null && d >= 0 && d <= 30;
                const expired = d !== null && d < 0;
                return (
                  <tr
                    key={r.id}
                    style={{ background: expiring ? T.warningLight : "#fff" }}
                  >
                    <td style={s.td}>
                      <strong>{staffName(r.staff_profile_id)}</strong>
                    </td>
                    <td style={s.td}>
                      <TypeBadge type={r.record_type} />
                    </td>
                    <td
                      style={{
                        ...s.td,
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                      }}
                    >
                      {r.subject || "—"}
                    </td>
                    <td style={{ ...s.td, fontSize: 12, whiteSpace: "nowrap" }}>
                      {fmtDate(r.incident_date)}
                    </td>
                    <td style={s.td}>
                      {r.valid_until ? (
                        <div>
                          <div style={{ fontSize: 12 }}>
                            {fmtDate(r.valid_until)}
                          </div>
                          {expiring && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                fontFamily: T.font,
                                color: T.warning,
                                textTransform: "uppercase",
                              }}
                            >
                              {d}d left
                            </span>
                          )}
                          {expired && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                fontFamily: T.font,
                                color: T.ink500,
                                textTransform: "uppercase",
                              }}
                            >
                              Expired
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: T.border }}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={s.td}>
                      {r.appeal_lodged ? (
                        <span
                          style={{
                            color: T.info,
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: T.font,
                          }}
                        >
                          Yes
                        </span>
                      ) : (
                        <span style={{ color: T.border }}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          style={{
                            ...s.outBtn(T.danger),
                            padding: "3px 10px",
                            fontSize: 10,
                          }}
                          onClick={() => openEdit(r)}
                        >
                          View
                        </button>
                        <button
                          style={{
                            ...s.outBtn(T.info),
                            padding: "3px 10px",
                            fontSize: 10,
                          }}
                          onClick={() =>
                            printLetter(
                              generateDisciplinaryLetter(
                                { ...r },
                                staffName(r.staff_profile_id),
                                "",
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
              fontFamily: T.font,
              color: T.ink500,
              marginTop: 8,
              textAlign: "right",
            }}
          >
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {drawerOpen && (
        <RecordDrawer
          record={editingRecord}
          staffId={drawerStaffId}
          tenantId={tenantId}
          staffName={staffName(drawerStaffId)}
          allStaff={staffList}
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
