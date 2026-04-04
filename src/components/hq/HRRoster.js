// src/components/hq/HRRoster.js — v1.0
// WP-HR-ROSTER Session C1
// Shift Templates + Weekly Roster Builder
// Tables: shift_templates, roster_weeks, roster_assignments, staff_profiles,
//         employment_contracts (hourly_rate_zar), public_holidays

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

const T = {
  ink900: "#0D0D0D", ink700: "#2C2C2C", ink500: "#474747",
  ink400: "#6B6B6B", ink300: "#999999", ink150: "#E2E2E2",
  ink075: "#F4F4F3", ink050: "#FAFAF9",
  accent: "#1A3D2B", accentMid: "#2D6A4F", accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  success: "#166534", successBg: "#F0FDF4", successBd: "#BBF7D0",
  warning: "#92400E", warningBg: "#FFFBEB", warningBd: "#FDE68A",
  danger: "#991B1B",  dangerBg:  "#FEF2F2", dangerBd:  "#FECACA",
  info: "#1E3A5F",    infoBg:    "#EFF6FF",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.10)",
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_FULL = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const SECTIONS = [
  "General","Budtender","Manager","Cashier",
  "Coffee Shop","Restaurant","Headshop","Growshop","Security","Cleaner",
];

const TEMPLATE_COLORS = [
  "#1A3D2B","#2D6A4F","#1E3A5F","#92400E",
  "#991B1B","#5B21B6","#374151","#0369A1",
];

// ── default templates (wizard seed data) ────────────────────────────────────
const DEFAULT_TEMPLATES = [
  {
    key: "opening",
    name: "Opening",
    description: "Early shift — open the shop",
    shift_start: "08:00", shift_end: "16:00", break_minutes: 30,
    section: "General", color: "#1A3D2B",
  },
  {
    key: "mid",
    name: "Mid Shift",
    description: "Core trading hours",
    shift_start: "10:00", shift_end: "18:00", break_minutes: 30,
    section: "General", color: "#2D6A4F",
  },
  {
    key: "close",
    name: "Closing",
    description: "Afternoon through close",
    shift_start: "12:00", shift_end: "20:00", break_minutes: 30,
    section: "General", color: "#1E3A5F",
  },
  {
    key: "fullday",
    name: "Full Day",
    description: "Open to close — long shift",
    shift_start: "08:00", shift_end: "17:00", break_minutes: 60,
    section: "General", color: "#374151",
  },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function zar(n) {
  return `R${(Number(n)||0).toFixed(2)}`;
}
function fmtTime(t) {
  return t ? t.slice(0,5) : "—";
}
function calcHours(start, end, breakMins = 30) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm) - breakMins;
  return Math.max(0, mins / 60);
}
function getMondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtWeekLabel(monday) {
  const start = new Date(monday + "T00:00:00");
  const end   = new Date(monday + "T00:00:00");
  end.setDate(end.getDate() + 6);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-ZA", opts)} – ${end.toLocaleDateString("en-ZA", opts)}`;
}

// ── TemplateCard ─────────────────────────────────────────────────────────────
function TemplateCard({ tpl, onEdit, onDelete }) {
  const hrs = calcHours(tpl.shift_start, tpl.shift_end, tpl.break_minutes);
  return (
    <div style={{
      border: `2px solid ${tpl.color}33`,
      borderLeft: `4px solid ${tpl.color}`,
      borderRadius: 10, padding: "14px 16px", background: "#fff",
      boxShadow: T.shadow, display: "flex", justifyContent: "space-between",
      alignItems: "flex-start",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: tpl.color, fontFamily: T.font, marginBottom: 4 }}>
          {tpl.name}
        </div>
        <div style={{ fontSize: 11, color: T.ink500, fontFamily: T.font, marginBottom: 2 }}>
          {fmtTime(tpl.shift_start)} – {fmtTime(tpl.shift_end)}
          {" "}· {tpl.break_minutes}min break · {hrs.toFixed(1)}h
        </div>
        <div style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
          📍 {tpl.section}
          {tpl.description && <span> · {tpl.description}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onEdit(tpl)} style={{
          padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.ink150}`,
          background: T.ink050, cursor: "pointer", fontSize: 11,
          fontFamily: T.font, color: T.ink500,
        }}>Edit</button>
        <button onClick={() => onDelete(tpl.id)} style={{
          padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.dangerBd}`,
          background: T.dangerBg, cursor: "pointer", fontSize: 11,
          fontFamily: T.font, color: T.danger,
        }}>Delete</button>
      </div>
    </div>
  );
}

// ── TemplateForm ─────────────────────────────────────────────────────────────
function TemplateForm({ initial, onSave, onCancel, tenantId }) {
  const [form, setForm] = useState(initial || {
    name: "", description: "", shift_start: "09:00", shift_end: "17:00",
    break_minutes: 30, section: "General", color: "#1A3D2B",
  });
  const [saving, setSaving] = useState(false);
  const hrs = calcHours(form.shift_start, form.shift_end, form.break_minutes);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inp = {
    padding: "8px 12px", border: `1px solid ${T.ink150}`, borderRadius: 8,
    fontSize: 13, fontFamily: T.font, color: T.ink900, outline: "none",
    width: "100%", boxSizing: "border-box",
  };
  const lbl = {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: T.ink400, fontFamily: T.font,
    display: "block", marginBottom: 5,
  };

  async function handleSave() {
    if (!form.name.trim() || !form.shift_start || !form.shift_end) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        shift_start: form.shift_start,
        shift_end: form.shift_end,
        break_minutes: Number(form.break_minutes) || 30,
        section: form.section || "General",
        color: form.color || "#1A3D2B",
        is_active: true,
      };
      if (form.id) {
        await supabase.from("shift_templates").update(payload).eq("id", form.id);
      } else {
        await supabase.from("shift_templates").insert(payload);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "#fff", border: `1px solid ${T.ink150}`, borderRadius: 12,
      padding: 24, boxShadow: T.shadowMd, marginBottom: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.ink900, fontFamily: T.font, marginBottom: 18 }}>
        {form.id ? "Edit Shift Template" : "New Shift Template"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Name *</label>
          <input value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Morning Shift" style={inp} />
        </div>
        <div>
          <label style={lbl}>Section</label>
          <select value={form.section} onChange={e => set("section", e.target.value)} style={inp}>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Start time *</label>
          <input type="time" value={form.shift_start}
            onChange={e => set("shift_start", e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>End time *</label>
          <input type="time" value={form.shift_end}
            onChange={e => set("shift_end", e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Break (mins)</label>
          <input type="number" min="0" step="15" value={form.break_minutes}
            onChange={e => set("break_minutes", e.target.value)} style={inp} />
        </div>
      </div>

      {hrs > 0 && (
        <div style={{
          padding: "8px 14px", borderRadius: 8, background: T.accentLit,
          border: `1px solid ${T.accentBd}`, marginBottom: 14,
          fontSize: 12, color: T.accent, fontFamily: T.font,
        }}>
          ⏱ Net work time: <strong>{hrs.toFixed(1)} hours</strong>
          {" "}· {(hrs * 5).toFixed(0)}h/week (5-day)
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Description (optional)</label>
        <input value={form.description || ""} onChange={e => set("description", e.target.value)}
          placeholder="Any notes about this shift…" style={inp} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={lbl}>Colour</label>
        <div style={{ display: "flex", gap: 10 }}>
          {TEMPLATE_COLORS.map(c => (
            <div key={c} onClick={() => set("color", c)} style={{
              width: 28, height: 28, borderRadius: "50%", background: c,
              cursor: "pointer", boxSizing: "border-box",
              border: form.color === c ? `3px solid ${T.ink900}` : "3px solid transparent",
            }} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{
          padding: "10px 20px", borderRadius: 8, border: "none",
          background: form.name.trim() ? form.color : T.ink150,
          color: "#fff", fontWeight: 700, fontSize: 13,
          fontFamily: T.font, cursor: form.name.trim() ? "pointer" : "not-allowed",
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? "Saving…" : form.id ? "Update Template" : "Save Template"}
        </button>
        <button onClick={onCancel} style={{
          padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.ink150}`,
          background: "transparent", color: T.ink500, fontSize: 13,
          fontFamily: T.font, cursor: "pointer",
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ── RosterGrid ────────────────────────────────────────────────────────────────
function RosterGrid({ week, staff, assignments, templates, holidays, onAssign, onClear, readOnly }) {
  const weekDates = DAYS.map((_, i) => addDays(week.week_start, i));
  const holidaySet = new Set((holidays || []).map(h => h.holiday_date));
  const assignMap = {};
  assignments.forEach(a => {
    assignMap[`${a.staff_profile_id}-${a.work_date}`] = a;
  });

  if (staff.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: T.ink400, fontFamily: T.font }}>
        No active staff found. Add staff in the Staff tab first.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr>
            <th style={{
              padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink400,
              fontFamily: T.font, borderBottom: `2px solid ${T.ink150}`,
              background: T.ink050, width: 160,
            }}>Staff</th>
            {weekDates.map((date, i) => {
              const isHoliday = holidaySet.has(date);
              const isWeekend = i >= 5;
              return (
                <th key={date} style={{
                  padding: "8px 6px", textAlign: "center", fontSize: 10, fontWeight: 700,
                  color: isHoliday ? T.warning : isWeekend ? T.ink300 : T.ink400,
                  fontFamily: T.font, borderBottom: `2px solid ${T.ink150}`,
                  background: isHoliday ? T.warningBg : isWeekend ? T.ink075 : T.ink050,
                  minWidth: 110,
                }}>
                  <div>{DAYS[i]}</div>
                  <div style={{ fontSize: 9, fontWeight: 400 }}>
                    {new Date(date + "T00:00:00").getDate()}
                    {isHoliday && <span style={{ marginLeft: 4 }}>★</span>}
                  </div>
                </th>
              );
            })}
            <th style={{
              padding: "8px 6px", textAlign: "center", fontSize: 10, fontWeight: 700,
              color: T.ink400, fontFamily: T.font, borderBottom: `2px solid ${T.ink150}`,
              background: T.ink050,
            }}>Hrs</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member, si) => {
            let weekHrs = 0;
            return (
              <tr key={member.id} style={{ background: si % 2 === 0 ? "#fff" : T.ink050 }}>
                <td style={{
                  padding: "8px 12px", fontSize: 12, fontWeight: 600,
                  color: T.ink900, fontFamily: T.font,
                  borderBottom: `1px solid ${T.ink075}`,
                }}>
                  {member.full_name || member.preferred_name || "—"}
                  {member.job_title && (
                    <div style={{ fontSize: 10, color: T.ink400, fontWeight: 400 }}>
                      {member.job_title}
                    </div>
                  )}
                </td>
                {weekDates.map((date, di) => {
                  const key = `${member.id}-${date}`;
                  const assignment = assignMap[key];
                  const isHoliday = holidaySet.has(date);
                  const isWeekend = di >= 5;
                  const tpl = assignment?.shift_template_id
                    ? templates.find(t => t.id === assignment.shift_template_id)
                    : null;
                  const start = assignment?.shift_start || tpl?.shift_start;
                  const end   = assignment?.shift_end   || tpl?.shift_end;
                  const brk   = assignment?.break_minutes ?? tpl?.break_minutes ?? 30;
                  const hrs   = calcHours(start, end, brk);
                  if (hrs > 0 && !assignment?.is_off) weekHrs += hrs;
                  const color = tpl?.color || T.accentMid;

                  return (
                    <td key={date} style={{
                      padding: "4px 4px", textAlign: "center",
                      borderBottom: `1px solid ${T.ink075}`,
                      background: isHoliday && !assignment ? T.warningBg : undefined,
                    }}>
                      {assignment?.is_off ? (
                        <div style={{
                          padding: "4px 6px", borderRadius: 6, fontSize: 10,
                          background: T.ink075, color: T.ink400, fontFamily: T.font,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <span>Day Off</span>
                          {!readOnly && (
                            <button onClick={() => onClear(assignment.id)} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: T.ink300, fontSize: 12, lineHeight: 1, padding: "0 2px",
                            }}>✕</button>
                          )}
                        </div>
                      ) : tpl || (assignment?.shift_start) ? (
                        <div style={{
                          padding: "4px 6px", borderRadius: 6, fontSize: 10,
                          background: color + "18",
                          border: `1px solid ${color}44`,
                          fontFamily: T.font,
                        }}>
                          <div style={{ fontWeight: 700, color, marginBottom: 1 }}>
                            {tpl?.name || "Custom"}
                          </div>
                          <div style={{ color: T.ink500, fontSize: 9 }}>
                            {fmtTime(start)} – {fmtTime(end)}
                          </div>
                          <div style={{ color: T.ink400, fontSize: 9 }}>
                            📍 {tpl?.section || assignment?.section || "—"}
                            {isHoliday && <span style={{ color: T.warning, marginLeft: 4 }}>PH 2×</span>}
                          </div>
                          {!readOnly && (
                            <button onClick={() => onClear(assignment.id)} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: T.ink300, fontSize: 11, marginTop: 2,
                            }}>✕ clear</button>
                          )}
                        </div>
                      ) : !readOnly ? (
                        <AssignDropdown
                          templates={templates}
                          isWeekend={isWeekend}
                          isHoliday={isHoliday}
                          onSelect={(tplId, isOff) => onAssign(member.id, date, tplId, isOff)}
                        />
                      ) : (
                        <div style={{ fontSize: 10, color: T.ink150, fontFamily: T.font }}>—</div>
                      )}
                    </td>
                  );
                })}
                <td style={{
                  padding: "8px 6px", textAlign: "center", fontSize: 11,
                  fontWeight: 700, fontFamily: T.font,
                  color: weekHrs > 45 ? T.danger : weekHrs > 0 ? T.accentMid : T.ink300,
                  borderBottom: `1px solid ${T.ink075}`,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {weekHrs > 0 ? `${weekHrs.toFixed(1)}h` : "—"}
                  {weekHrs > 45 && <div style={{ fontSize: 9, color: T.danger }}>OT</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── AssignDropdown ────────────────────────────────────────────────────────────
function AssignDropdown({ templates, isWeekend, isHoliday, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "4px 6px", borderRadius: 6,
        border: `1px dashed ${T.ink150}`, background: "transparent",
        cursor: "pointer", fontSize: 10, color: T.ink300, fontFamily: T.font,
        transition: "all 0.12s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accentMid; e.currentTarget.style.color = T.accentMid; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.ink150; e.currentTarget.style.color = T.ink300; }}
      >
        {open ? "✕" : "+ Assign"}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 50,
          background: "#fff", border: `1px solid ${T.ink150}`,
          borderRadius: 8, boxShadow: T.shadowMd,
          minWidth: 180, padding: 6,
        }}>
          {isHoliday && (
            <div style={{ fontSize: 9, color: T.warning, padding: "4px 8px", fontFamily: T.font, fontWeight: 700 }}>
              ★ Public holiday — 2× rate applies
            </div>
          )}
          {templates.map(tpl => (
            <button key={tpl.id} onClick={() => { onSelect(tpl.id, false); setOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "6px 10px", border: "none", background: "transparent",
              cursor: "pointer", borderRadius: 6, fontFamily: T.font,
              transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = tpl.color + "15"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: tpl.color }}>{tpl.name}</div>
              <div style={{ fontSize: 9, color: T.ink400 }}>
                {fmtTime(tpl.shift_start)}–{fmtTime(tpl.shift_end)} · {tpl.section}
              </div>
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${T.ink075}`, marginTop: 4, paddingTop: 4 }}>
            <button onClick={() => { onSelect(null, true); setOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "6px 10px", border: "none", background: "transparent",
              cursor: "pointer", borderRadius: 6, fontFamily: T.font,
              fontSize: 11, color: T.ink400,
            }}>
              🚫 Mark as Day Off
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ROSTER SETUP WIZARD ───────────────────────────────────────────────────────
function RosterSetupWizard({ tenantId, onComplete }) {
  const [selected, setSelected] = useState(
    DEFAULT_TEMPLATES.reduce((acc, t) => ({ ...acc, [t.key]: true }), {})
  );
  const [edits, setEdits] = useState(
    DEFAULT_TEMPLATES.reduce((acc, t) => ({
      ...acc,
      [t.key]: { shift_start: t.shift_start, shift_end: t.shift_end, break_minutes: t.break_minutes },
    }), {})
  );
  const [saving, setSaving] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: "", shift_start: "09:00", shift_end: "17:00",
    break_minutes: 30, section: "General", color: "#1A3D2B",
  });

  const toggleSelect = (key) => setSelected(p => ({ ...p, [key]: !p[key] }));
  const setEdit = (key, field, val) =>
    setEdits(p => ({ ...p, [key]: { ...p[key], [field]: val } }));

  const selectedCount = Object.values(selected).filter(Boolean).length;

  async function handleSave() {
    setSaving(true);
    const toInsert = DEFAULT_TEMPLATES
      .filter(t => selected[t.key])
      .map(t => ({
        tenant_id: tenantId,
        name: t.name,
        description: t.description,
        shift_start: edits[t.key].shift_start,
        shift_end: edits[t.key].shift_end,
        break_minutes: Number(edits[t.key].break_minutes) || 30,
        section: t.section,
        color: t.color,
        is_active: true,
      }));

    if (showCustomForm && customForm.name.trim()) {
      toInsert.push({
        tenant_id: tenantId,
        name: customForm.name.trim(),
        description: null,
        shift_start: customForm.shift_start,
        shift_end: customForm.shift_end,
        break_minutes: Number(customForm.break_minutes) || 30,
        section: customForm.section,
        color: customForm.color,
        is_active: true,
      });
    }

    if (toInsert.length > 0) {
      await supabase.from("shift_templates").insert(toInsert);
    }
    setSaving(false);
    onComplete();
  }

  const inp = {
    padding: "5px 8px", border: `1px solid ${T.ink150}`, borderRadius: 6,
    fontSize: 12, fontFamily: T.font, color: T.ink900, outline: "none",
    background: "#fff", boxSizing: "border-box",
  };

  return (
    <div style={{
      background: "#fff", border: `1px solid ${T.ink150}`,
      borderRadius: 12, boxShadow: T.shadowMd,
      fontFamily: T.font, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        background: T.accent, padding: "28px 32px 24px",
        color: "#fff",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>
          Roster Setup · Step 1 of 2
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Set up your shift templates
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
          Templates are the building blocks of your roster — reusable shift patterns
          you assign to staff each week. Select the ones that fit your shop and
          adjust the times if needed.
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 20, display: "flex", gap: 6, alignItems: "center" }}>
          {["Shift Templates", "Build Roster"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: i === 0 ? "#fff" : "rgba(255,255,255,0.25)",
                color: i === 0 ? T.accent : "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: 11, fontWeight: i === 0 ? 700 : 400,
                opacity: i === 0 ? 1 : 0.6,
              }}>
                {label}
              </span>
              {i < 1 && <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.3)" }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Template cards */}
      <div style={{ padding: "24px 32px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: T.ink400, marginBottom: 14,
        }}>
          Suggested shift patterns — click to select, edit times if needed
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12, marginBottom: 20,
        }}>
          {DEFAULT_TEMPLATES.map(t => {
            const isOn = selected[t.key];
            const hrs = calcHours(edits[t.key].shift_start, edits[t.key].shift_end, edits[t.key].break_minutes);
            return (
              <div
                key={t.key}
                onClick={() => toggleSelect(t.key)}
                style={{
                  border: `2px solid ${isOn ? t.color : T.ink150}`,
                  borderRadius: 10, padding: "14px 16px",
                  background: isOn ? t.color + "08" : T.ink050,
                  cursor: "pointer", transition: "all 0.15s", position: "relative",
                  boxShadow: isOn ? `0 0 0 3px ${t.color}22` : "none",
                }}
              >
                {/* Checkmark */}
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  width: 20, height: 20, borderRadius: "50%",
                  background: isOn ? t.color : T.ink150,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "#fff", fontWeight: 700,
                  transition: "all 0.15s",
                }}>
                  {isOn ? "✓" : ""}
                </div>

                <div style={{ fontWeight: 700, color: isOn ? t.color : T.ink500, fontSize: 13, marginBottom: 4 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: T.ink400, marginBottom: 12 }}>
                  {t.description}
                </div>

                {/* Inline time editors */}
                <div
                  onClick={e => e.stopPropagation()}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
                >
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.ink400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Start</div>
                    <input type="time" value={edits[t.key].shift_start}
                      onChange={e => setEdit(t.key, "shift_start", e.target.value)}
                      style={{ ...inp, width: "100%" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.ink400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>End</div>
                    <input type="time" value={edits[t.key].shift_end}
                      onChange={e => setEdit(t.key, "shift_end", e.target.value)}
                      style={{ ...inp, width: "100%" }} />
                  </div>
                </div>

                {hrs > 0 && (
                  <div style={{
                    marginTop: 8, fontSize: 10, color: isOn ? t.color : T.ink400, fontWeight: 600,
                  }}>
                    ⏱ {hrs.toFixed(1)}h net · {edits[t.key].break_minutes}min break
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom template add-on */}
        {!showCustomForm ? (
          <button
            onClick={e => { e.stopPropagation(); setShowCustomForm(true); }}
            style={{
              padding: "8px 16px", borderRadius: 8, border: `1px dashed ${T.ink150}`,
              background: "transparent", cursor: "pointer", fontSize: 12,
              color: T.ink400, fontFamily: T.font, marginBottom: 24,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            + Add a custom shift
          </button>
        ) : (
          <div style={{
            border: `1px solid ${T.ink150}`, borderRadius: 10, padding: 16,
            marginBottom: 24, background: T.ink050,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.ink700, marginBottom: 12 }}>
              Custom shift
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.ink400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Name</div>
                <input value={customForm.name} onChange={e => setCustomForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Weekend Morning" style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.ink400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Start</div>
                <input type="time" value={customForm.shift_start} onChange={e => setCustomForm(p => ({ ...p, shift_start: e.target.value }))} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.ink400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>End</div>
                <input type="time" value={customForm.shift_end} onChange={e => setCustomForm(p => ({ ...p, shift_end: e.target.value }))} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.ink400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Break (min)</div>
                <input type="number" min="0" step="15" value={customForm.break_minutes} onChange={e => setCustomForm(p => ({ ...p, break_minutes: e.target.value }))} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.ink400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Section</div>
                <select value={customForm.section} onChange={e => setCustomForm(p => ({ ...p, section: e.target.value }))} style={{ ...inp, width: "100%" }}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {TEMPLATE_COLORS.map(c => (
                  <div key={c} onClick={() => setCustomForm(p => ({ ...p, color: c }))} style={{
                    width: 20, height: 20, borderRadius: "50%", background: c,
                    cursor: "pointer", boxSizing: "border-box",
                    border: customForm.color === c ? `2.5px solid ${T.ink900}` : "2.5px solid transparent",
                  }} />
                ))}
              </div>
              <button onClick={() => setShowCustomForm(false)} style={{
                marginLeft: "auto", padding: "4px 10px", borderRadius: 6,
                border: `1px solid ${T.ink150}`, background: "transparent",
                cursor: "pointer", fontSize: 11, color: T.ink400, fontFamily: T.font,
              }}>Remove</button>
            </div>
          </div>
        )}

        {/* Action row */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", paddingTop: 16,
          borderTop: `1px solid ${T.ink150}`,
        }}>
          <button
            onClick={onComplete}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: T.ink400, fontFamily: T.font,
              textDecoration: "underline",
            }}
          >
            Skip — I'll set this up later
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
            style={{
              padding: "12px 28px", borderRadius: 8, border: "none",
              background: selectedCount > 0 ? T.accent : T.ink150,
              color: "#fff", fontWeight: 700, fontSize: 13,
              fontFamily: T.font,
              cursor: selectedCount > 0 ? "pointer" : "not-allowed",
              opacity: saving ? 0.7 : 1,
              transition: "background 0.15s",
            }}
          >
            {saving
              ? "Saving…"
              : `Save ${selectedCount} template${selectedCount !== 1 ? "s" : ""} and continue →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function HRRoster({ tenantId, readOnly = false }) {
  const [activeTab, setActiveTab] = useState("roster");
  const [templates, setTemplates] = useState([]);
  const [staff, setStaff] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [rosterWeeks, setRosterWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── fetch base data ────────────────────────────────────────────────────────
  const fetchBase = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [tplRes, staffRes, weeksRes] = await Promise.all([
      supabase.from("shift_templates")
        .select("*").eq("tenant_id", tenantId)
        .eq("is_active", true).order("name"),
      supabase.from("staff_profiles")
        .select("id, full_name, preferred_name, job_title, department")
        .eq("tenant_id", tenantId).eq("status", "active").order("full_name"),
      supabase.from("roster_weeks")
        .select("*").eq("tenant_id", tenantId)
        .order("week_start", { ascending: false }).limit(12),
    ]);
    setTemplates(tplRes.data || []);
    setStaff(staffRes.data || []);
    const weeks = weeksRes.data || [];
    setRosterWeeks(weeks);
    // default to current week
    const thisMonday = getMondayOf(new Date());
    const existing = weeks.find(w => w.week_start === thisMonday);
    if (existing) {
      setSelectedWeek(existing);
    } else if (weeks.length > 0) {
      setSelectedWeek(weeks[0]);
    }
    setLoading(false);
  }, [tenantId]);

  // ── fetch holidays for selected week ──────────────────────────────────────
  const fetchHolidays = useCallback(async () => {
    if (!selectedWeek) return;
    const end = addDays(selectedWeek.week_start, 6);
    const { data } = await supabase.from("public_holidays")
      .select("holiday_date, name")
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .eq("is_active", true)
      .gte("holiday_date", selectedWeek.week_start)
      .lte("holiday_date", end);
    setHolidays(data || []);
  }, [selectedWeek, tenantId]);

  // ── fetch assignments for selected week ───────────────────────────────────
  const fetchAssignments = useCallback(async () => {
    if (!selectedWeek) return;
    const { data } = await supabase.from("roster_assignments")
      .select("*")
      .eq("roster_week_id", selectedWeek.id);
    setAssignments(data || []);
  }, [selectedWeek]);

  useEffect(() => { fetchBase(); }, [fetchBase]);
  useEffect(() => { fetchHolidays(); fetchAssignments(); }, [fetchHolidays, fetchAssignments]);

  // ── create or select week ─────────────────────────────────────────────────
  async function selectOrCreateWeek(monday) {
    const existing = rosterWeeks.find(w => w.week_start === monday);
    if (existing) { setSelectedWeek(existing); return; }
    setSaving(true);
    const { data, error } = await supabase.from("roster_weeks")
      .insert({ tenant_id: tenantId, week_start: monday, status: "draft" })
      .select().single();
    if (!error) {
      const updated = [data, ...rosterWeeks];
      setRosterWeeks(updated);
      setSelectedWeek(data);
    }
    setSaving(false);
  }

  // ── assign shift to a cell ────────────────────────────────────────────────
  async function handleAssign(staffId, date, templateId, isOff) {
    if (!selectedWeek) return;
    const tpl = templateId ? templates.find(t => t.id === templateId) : null;
    const payload = {
      tenant_id: tenantId,
      roster_week_id: selectedWeek.id,
      staff_profile_id: staffId,
      work_date: date,
      shift_template_id: templateId || null,
      shift_start: tpl?.shift_start || null,
      shift_end: tpl?.shift_end || null,
      break_minutes: tpl?.break_minutes || 30,
      section: tpl?.section || null,
      is_off: isOff,
    };
    const { error } = await supabase.from("roster_assignments")
      .upsert(payload, { onConflict: "roster_week_id,staff_profile_id,work_date" });
    if (!error) fetchAssignments();
  }

  // ── clear a cell ──────────────────────────────────────────────────────────
  async function handleClear(assignmentId) {
    await supabase.from("roster_assignments").delete().eq("id", assignmentId);
    fetchAssignments();
  }

  // ── publish week ──────────────────────────────────────────────────────────
  async function handlePublish() {
    if (!selectedWeek || selectedWeek.status === "locked") return;
    const newStatus = selectedWeek.status === "draft" ? "published" : "locked";
    const { error } = await supabase.from("roster_weeks")
      .update({ status: newStatus, published_at: new Date().toISOString() })
      .eq("id", selectedWeek.id);
    if (!error) {
      const updated = { ...selectedWeek, status: newStatus };
      setSelectedWeek(updated);
      setRosterWeeks(rosterWeeks.map(w => w.id === updated.id ? updated : w));
      showToast(`Roster ${newStatus === "published" ? "published" : "locked"}`);
    }
  }

  // ── generate from shift_schedules ────────────────────────────────────────
  async function handleGenerate() {
    if (!selectedWeek || assignments.length > 0) return;
    setSaving(true);
    const { data: schedules } = await supabase.from("shift_schedules")
      .select("*").eq("tenant_id", tenantId).eq("is_active", true);
    const DOW_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const toInsert = [];
    (schedules || []).forEach(sch => {
      DAYS.forEach((_, di) => {
        const date = addDays(selectedWeek.week_start, di);
        const dow = new Date(date + "T00:00:00").getDay();
        if (sch[`works_${DOW_KEYS[dow]}`]) {
          if (date >= sch.effective_from && (!sch.effective_to || date <= sch.effective_to)) {
            toInsert.push({
              tenant_id: tenantId,
              roster_week_id: selectedWeek.id,
              staff_profile_id: sch.staff_profile_id,
              work_date: date,
              shift_start: sch.shift_start,
              shift_end: sch.shift_end,
              break_minutes: sch.break_minutes || 30,
              section: sch.location || null,
              is_off: false,
            });
          }
        }
      });
    });
    if (toInsert.length > 0) {
      await supabase.from("roster_assignments")
        .upsert(toInsert, { onConflict: "roster_week_id,staff_profile_id,work_date" });
      fetchAssignments();
      showToast(`Generated ${toInsert.length} assignments from shift schedules`);
    } else {
      showToast("No active shift schedules found — add them in Shift Schedules", "info");
    }
    setSaving(false);
  }

  // ── delete template ───────────────────────────────────────────────────────
  async function handleDeleteTemplate(id) {
    await supabase.from("shift_templates").delete().eq("id", id);
    setTemplates(templates.filter(t => t.id !== id));
    showToast("Template deleted");
  }

  // ── week nav helpers ──────────────────────────────────────────────────────
  const currentMonday = selectedWeek?.week_start || getMondayOf(new Date());
  const prevMonday = addDays(currentMonday, -7);
  const nextMonday = addDays(currentMonday, 7);

  const statusColor = {
    draft: T.ink400, published: T.accentMid, locked: T.info,
  };
  const statusBg = {
    draft: T.ink075, published: T.accentLit, locked: T.infoBg,
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: 48, color: T.ink400, fontFamily: T.font }}>
      Loading roster…
    </div>
  );

  return (
    <div style={{ fontFamily: T.font, position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? T.danger : T.accent,
          color: "#fff", padding: "10px 20px", borderRadius: 8,
          fontSize: 13, fontWeight: 600, zIndex: 2000, fontFamily: T.font,
          boxShadow: T.shadowMd,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Sub-tabs */}
      {!readOnly && (
        <div style={{
          display: "flex", gap: 0, borderBottom: `2px solid ${T.ink150}`,
          marginBottom: 24,
        }}>
          {[
            { id: "roster", label: "📅 Roster" },
            { id: "templates", label: "🔧 Shift Templates" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "10px 20px", border: "none", background: "none",
              cursor: "pointer", fontFamily: T.font, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: activeTab === tab.id ? T.accent : T.ink400,
              borderBottom: activeTab === tab.id
                ? `2px solid ${T.accent}` : "2px solid transparent",
              marginBottom: -2,
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── ROSTER TAB ── */}
      {(activeTab === "roster" || readOnly) && (
        <div>
          {/* Week navigation */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12, marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => selectOrCreateWeek(prevMonday)} style={{
                padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.ink150}`,
                background: "#fff", cursor: "pointer", fontSize: 15, color: T.ink400,
              }}>‹</button>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink900, fontFamily: T.font }}>
                  {fmtWeekLabel(currentMonday)}
                </div>
                {selectedWeek && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                    background: statusBg[selectedWeek.status],
                    color: statusColor[selectedWeek.status],
                    fontFamily: T.font, textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {selectedWeek.status}
                  </span>
                )}
              </div>
              <button onClick={() => selectOrCreateWeek(nextMonday)} style={{
                padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.ink150}`,
                background: "#fff", cursor: "pointer", fontSize: 15, color: T.ink400,
              }}>›</button>
              <button onClick={() => selectOrCreateWeek(getMondayOf(new Date()))} style={{
                padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.accentBd}`,
                background: T.accentLit, cursor: "pointer", fontSize: 11,
                fontWeight: 700, color: T.accent, fontFamily: T.font,
              }}>Today</button>
            </div>

            {!readOnly && (
              <div style={{ display: "flex", gap: 8 }}>
                {assignments.length === 0 && (
                  <button onClick={handleGenerate} disabled={saving} style={{
                    padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.ink150}`,
                    background: "#fff", cursor: "pointer", fontSize: 12,
                    fontWeight: 600, color: T.ink500, fontFamily: T.font,
                    opacity: saving ? 0.7 : 1,
                  }}>
                    ⚡ Generate from schedules
                  </button>
                )}
                {selectedWeek && selectedWeek.status !== "locked" && (
                  <button onClick={handlePublish} style={{
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    background: selectedWeek.status === "draft" ? T.accentMid : T.info,
                    color: "#fff", cursor: "pointer", fontSize: 12,
                    fontWeight: 700, fontFamily: T.font,
                  }}>
                    {selectedWeek.status === "draft" ? "📢 Publish Roster" : "🔒 Lock Roster"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── SETUP WIZARD — shown until templates exist ── */}
          {!readOnly && templates.length === 0 && (
            <RosterSetupWizard
              tenantId={tenantId}
              onComplete={fetchBase}
            />
          )}

          {/* ── NORMAL ROSTER UI — shown once templates exist ── */}
          {(readOnly || templates.length > 0) && <>

          {/* First-assign nudge — when templates exist but week is empty */}
          {!readOnly && templates.length > 0 && assignments.length === 0 && selectedWeek && (
            <div style={{
              padding: "12px 16px", borderRadius: 8, marginBottom: 16,
              background: T.accentLit, border: `1px solid ${T.accentBd}`,
              display: "flex", alignItems: "center", gap: 12,
              fontSize: 12, color: T.accent, fontFamily: T.font,
            }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <div>
                <span style={{ fontWeight: 700 }}>Your shift templates are ready. </span>
                Click <strong>+ Assign</strong> on any cell in the grid below to schedule
                a shift for a staff member. Use <strong>⚡ Generate from schedules</strong> to
                auto-fill from existing shift patterns.
              </div>
            </div>
          )}

          {/* Holiday notice */}
          {holidays.length > 0 && (
            <div style={{
              padding: "8px 14px", borderRadius: 8, background: T.warningBg,
              border: `1px solid ${T.warningBd}`, marginBottom: 16,
              fontSize: 12, color: T.warning, fontFamily: T.font,
            }}>
              ★ Public holiday this week: {holidays.map(h => `${h.name} (${h.holiday_date})`).join(" · ")}
              {" "}— staff working these days earn 2× rate
            </div>
          )}

          {/* Roster grid */}
          {selectedWeek ? (
            <div style={{
              background: "#fff", border: `1px solid ${T.ink150}`,
              borderRadius: 10, padding: 16, boxShadow: T.shadow,
            }}>
              <RosterGrid
                week={selectedWeek}
                staff={staff}
                assignments={assignments}
                templates={templates}
                holidays={holidays}
                onAssign={handleAssign}
                onClear={handleClear}
                readOnly={readOnly || selectedWeek.status === "locked"}
              />
            </div>
          ) : (
            <div style={{
              textAlign: "center", padding: 48, background: "#fff",
              border: `1px solid ${T.ink150}`, borderRadius: 10,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink700, fontFamily: T.font, marginBottom: 8 }}>
                No roster for this week yet
              </div>
              <button onClick={() => selectOrCreateWeek(currentMonday)} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: T.accent, color: "#fff", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: T.font,
              }}>
                + Create Roster for this Week
              </button>
            </div>
          )}

          {/* Week history */}
          {rosterWeeks.length > 1 && (
            <div style={{ marginTop: 24 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: T.ink400, fontFamily: T.font, marginBottom: 10,
              }}>
                Recent Weeks
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {rosterWeeks.slice(0, 8).map(w => (
                  <button key={w.id} onClick={() => setSelectedWeek(w)} style={{
                    padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                    fontFamily: T.font, fontSize: 11,
                    border: `1px solid ${selectedWeek?.id === w.id ? T.accentBd : T.ink150}`,
                    background: selectedWeek?.id === w.id ? T.accentLit : "#fff",
                    color: selectedWeek?.id === w.id ? T.accent : T.ink500,
                    fontWeight: selectedWeek?.id === w.id ? 700 : 400,
                  }}>
                    {fmtWeekLabel(w.week_start)}
                    <span style={{
                      marginLeft: 6, fontSize: 9, fontWeight: 700,
                      color: statusColor[w.status],
                    }}>
                      {w.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          </> /* end normal roster UI wrapper */}
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {activeTab === "templates" && !readOnly && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink900, fontFamily: T.font }}>
                Shift Templates
              </div>
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.font, marginTop: 2 }}>
                Define reusable shift patterns. Assign them to staff in the Roster view.
              </div>
            </div>
            {!showTemplateForm && (
              <button onClick={() => { setEditingTemplate(null); setShowTemplateForm(true); }} style={{
                padding: "10px 18px", borderRadius: 8, border: "none",
                background: T.accent, color: "#fff", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: T.font,
              }}>
                + New Template
              </button>
            )}
          </div>

          {showTemplateForm && (
            <TemplateForm
              initial={editingTemplate}
              tenantId={tenantId}
              onSave={() => { setShowTemplateForm(false); setEditingTemplate(null); fetchBase(); showToast("Template saved"); }}
              onCancel={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
            />
          )}

          {templates.length === 0 && !showTemplateForm ? (
            <div style={{
              textAlign: "center", padding: "48px 24px", background: "#fff",
              border: `1px solid ${T.ink150}`, borderRadius: 10,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔧</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink700, fontFamily: T.font, marginBottom: 8 }}>
                No shift templates yet
              </div>
              <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.font, marginBottom: 20 }}>
                Create templates like "Morning Shift", "Afternoon Close", "Weekend Budtender"
              </div>
              <button onClick={() => setShowTemplateForm(true)} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: T.accent, color: "#fff", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: T.font,
              }}>
                + Create First Template
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {templates.map(tpl => (
                <TemplateCard
                  key={tpl.id} tpl={tpl}
                  onEdit={t => { setEditingTemplate(t); setShowTemplateForm(true); }}
                  onDelete={handleDeleteTemplate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
