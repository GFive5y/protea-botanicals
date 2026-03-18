// HRTimesheets.js v1.0
// Protea Botanicals · HR Module · Timesheet Management (Admin view)
// WP-HR-4 · March 2026
// src/components/hq/HRTimesheets.js
//
// Sub-tabs: Timesheets | Entries | Summary
// Approval flow: draft → staff_submitted → admin_approved → hr_approved → locked
// Admin scope: create, review, approve timesheets for their tenant team

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  orange: T.warning,
  orangeLight: T.warningBg,
  purple: T.info,
  purpleLight: T.infoBg,
  grey: T.ink500,
  greyLight: T.ink075,
  border: T.ink150,
  bg: T.ink075,
  white: "#fff",
  text: T.ink700,
  muted: T.ink400,
};

const STATUS_CFG = {
  draft: { label: "Draft", bg: T.ink075, color: T.ink500 },
  staff_submitted: { label: "Submitted", bg: T.warningBg, color: T.warning },
  admin_approved: { label: "Admin Approved", bg: T.infoBg, color: T.info },
  hr_approved: { label: "HR Approved", bg: T.successBg, color: T.success },
  locked: { label: "Locked", bg: T.ink075, color: T.ink700 },
};

const ENTRY_TYPES = [
  "normal",
  "overtime",
  "public_holiday",
  "on_leave",
  "sick",
];
const ENTRY_TYPE_CFG = {
  normal: { label: "Normal", color: T.accent },
  overtime: { label: "Overtime", color: T.info },
  public_holiday: { label: "Public Holiday", color: T.danger },
  on_leave: { label: "On Leave", color: T.accentMid },
  sick: { label: "Sick", color: T.warning },
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
function fmtTime(t) {
  if (!t) return "—";
  return t.slice(0, 5); // HH:MM from TIME type
}
function calcHours(clockIn, clockOut, breakMins) {
  if (!clockIn || !clockOut) return null;
  const [ih, im] = clockIn.split(":").map(Number);
  const [oh, om] = clockOut.split(":").map(Number);
  const totalMins = oh * 60 + om - (ih * 60 + im) - (breakMins || 0);
  return totalMins > 0 ? (totalMins / 60).toFixed(2) : "0.00";
}
function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}
function getSunday(mondayStr) {
  const d = new Date(mondayStr);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}
function weekDays(mondayStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayStr);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || {
    label: status,
    bg: C.greyLight,
    color: C.grey,
  };
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 700,
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  wrapper: { fontFamily: T.font, color: T.ink700 },
  subTabs: {
    display: "flex",
    borderBottom: `1px solid ${T.ink150}`,
    marginBottom: 24,
  },
  subTab: (a) => ({
    padding: "10px 16px",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    fontSize: 11,
    fontFamily: T.font,
    color: a ? T.accent : T.ink400,
    borderBottom: a ? `2px solid ${T.accent}` : "2px solid transparent",
    fontWeight: a ? 700 : 400,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: -2,
  }),
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
  card: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "16px 20px",
    marginBottom: 12,
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
  outlineBtn: (color) => ({
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
  sectionTitle: {
    fontFamily: T.font,
    fontSize: 15,
    fontWeight: 600,
    color: T.ink700,
    margin: "0 0 16px 0",
  },
  statCard: {
    background: "#fff",
    padding: "16px 18px",
  },
  statNum: {
    fontFamily: T.font,
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: T.font,
    color: T.ink400,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginTop: 6,
  },
  emptyState: {
    padding: "48px 24px",
    textAlign: "center",
    color: C.muted,
    fontSize: 13,
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
    marginBottom: 16,
    background: t === "success" ? C.greenLight : C.redLight,
    color: t === "success" ? C.greenMid : C.red,
  }),
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
    maxWidth: 680,
    height: "100vh",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
    fontFamily: T.font,
    overflowY: "hidden",
  },
  drawerHead: {
    padding: "18px 24px",
    borderBottom: `1px solid ${C.border}`,
    background: C.bg,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  drawerBody: { flex: 1, overflowY: "auto", padding: 24 },
  drawerFoot: {
    padding: "14px 24px",
    borderTop: `1px solid ${C.border}`,
    background: C.bg,
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flagPill: (flag) => ({
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 7px",
    borderRadius: 20,
    background: flag ? C.redLight : C.greenLight,
    color: flag ? C.red : C.greenMid,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIMESHEET ENTRIES DRAWER
// Shows all entries for one timesheet — inline edit support
// ═══════════════════════════════════════════════════════════════════════════════
function EntriesDrawer({ timesheet, staffName, tenantId, onClose, onSaved }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);
  const [editRow, setEditRow] = useState(null); // { date, clock_in, clock_out, break_minutes, entry_type, notes }
  const [addingEntry, setAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    work_date: "",
    clock_in: "",
    clock_out: "",
    break_minutes: 30,
    entry_type: "normal",
    notes: "",
  });

  const days = weekDays(timesheet.period_start);
  const canEdit = !["hr_approved", "locked"].includes(timesheet.status);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("timesheet_entries")
      .select(
        "id, work_date, clock_in, clock_out, break_minutes, hours_worked, entry_type, clock_in_method, clock_out_method, late_flag, late_minutes, absent_flag, notes",
      )
      .eq("timesheet_id", timesheet.id)
      .order("work_date");
    if (!error) setEntries(data || []);
    setLoading(false);
  }, [timesheet.id]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const saveEntry = async (entryId, patch) => {
    setSaving(entryId);
    try {
      const { error } = await supabase
        .from("timesheet_entries")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", entryId);
      if (error) throw error;
      setToast({ type: "success", msg: "Entry saved." });
      setEditRow(null);
      loadEntries();
      onSaved && onSaved();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(null);
    }
  };

  const addEntry = async () => {
    if (!newEntry.work_date || !newEntry.clock_in) {
      setToast({ type: "error", msg: "Date and clock-in time required." });
      return;
    }
    setSaving("new");
    try {
      const hours = calcHours(
        newEntry.clock_in,
        newEntry.clock_out,
        newEntry.break_minutes,
      );
      const { error } = await supabase.from("timesheet_entries").insert([
        {
          timesheet_id: timesheet.id,
          staff_profile_id: timesheet.staff_profile_id,
          tenant_id: tenantId,
          work_date: newEntry.work_date,
          clock_in: newEntry.clock_in || null,
          clock_out: newEntry.clock_out || null,
          break_minutes: parseInt(newEntry.break_minutes) || 30,
          hours_worked: hours ? parseFloat(hours) : null,
          entry_type: newEntry.entry_type,
          clock_in_method: "manual",
          clock_out_method: newEntry.clock_out ? "manual" : null,
          notes: newEntry.notes.trim() || null,
        },
      ]);
      if (error) throw error;
      setToast({ type: "success", msg: "Entry added." });
      setAddingEntry(false);
      setNewEntry({
        work_date: "",
        clock_in: "",
        clock_out: "",
        break_minutes: 30,
        entry_type: "normal",
        notes: "",
      });
      loadEntries();
      onSaved && onSaved();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(null);
    }
  };

  const deleteEntry = async (id) => {
    setSaving(id);
    try {
      const { error } = await supabase
        .from("timesheet_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
      loadEntries();
      onSaved && onSaved();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(null);
    }
  };

  const entryMap = {};
  entries.forEach((e) => {
    entryMap[e.work_date] = e;
  });
  const totalHours = entries.reduce(
    (sum, e) => sum + parseFloat(e.hours_worked || 0),
    0,
  );
  const lateCount = entries.filter((e) => e.late_flag).length;
  const absentCount = entries.filter((e) => e.absent_flag).length;

  return (
    <div
      style={s.modal}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={s.drawer}>
        <div style={s.drawerHead}>
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
              Timesheet Entries
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 18,
                fontWeight: 600,
                color: T.ink700,
              }}
            >
              {staffName}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {fmtDate(timesheet.period_start)} —{" "}
              {fmtDate(timesheet.period_end)} ·{" "}
              <StatusBadge status={timesheet.status} />
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

        {/* Summary strip */}
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 24px",
            borderBottom: `1px solid ${C.border}`,
            background: "#fdfcfa",
            flexShrink: 0,
          }}
        >
          {[
            {
              label: "Total Hours",
              value: totalHours.toFixed(1),
              color: T.ink700,
            },
            {
              label: "Late Days",
              value: lateCount,
              color: lateCount > 0 ? T.warning : T.accentMid,
            },
            {
              label: "Absent Days",
              value: absentCount,
              color: absentCount > 0 ? T.danger : T.accentMid,
            },
            { label: "Days Entered", value: entries.length, color: T.ink700 },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 20,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  color,
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: T.font,
                  fontWeight: 700,
                  color: T.ink400,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: 4,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        <div style={s.drawerBody}>
          {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}

          {/* Weekly entry table */}
          {loading ? (
            <div style={s.emptyState}>Loading entries…</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...s.table, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={s.th}>Date</th>
                    <th style={s.th}>Day</th>
                    <th style={s.th}>In</th>
                    <th style={s.th}>Out</th>
                    <th style={s.th}>Break</th>
                    <th style={s.th}>Hours</th>
                    <th style={s.th}>Type</th>
                    <th style={s.th}>Flags</th>
                    <th style={s.th}>Method</th>
                    {canEdit && <th style={s.th}></th>}
                  </tr>
                </thead>
                <tbody>
                  {days.map((date) => {
                    const entry = entryMap[date];
                    const dayName = new Date(date).toLocaleDateString("en-ZA", {
                      weekday: "short",
                    });
                    const isWeekend = ["Sat", "Sun"].includes(dayName);
                    const isEditing = editRow?.id === entry?.id;

                    if (!entry) {
                      return (
                        <tr
                          key={date}
                          style={{
                            background: isWeekend ? "#fafafa" : C.white,
                          }}
                        >
                          <td
                            style={{
                              ...s.td,
                              color: isWeekend ? C.muted : C.text,
                              fontSize: 11,
                            }}
                          >
                            {fmtDate(date)}
                          </td>
                          <td style={{ ...s.td, color: C.muted, fontSize: 11 }}>
                            {dayName}
                          </td>
                          <td
                            colSpan={6}
                            style={{ ...s.td, color: "#ddd", fontSize: 11 }}
                          >
                            —
                          </td>
                          <td style={s.td}></td>
                          {canEdit && (
                            <td style={s.td}>
                              {!isWeekend && (
                                <button
                                  style={{
                                    ...s.outlineBtn(C.green),
                                    padding: "2px 8px",
                                    fontSize: 10,
                                  }}
                                  onClick={() => {
                                    setNewEntry((p) => ({
                                      ...p,
                                      work_date: date,
                                    }));
                                    setAddingEntry(true);
                                  }}
                                >
                                  + Add
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    }

                    if (isEditing) {
                      return (
                        <tr key={date} style={{ background: "#f0f7ee" }}>
                          <td style={s.td}>{fmtDate(date)}</td>
                          <td style={{ ...s.td, color: C.muted }}>{dayName}</td>
                          <td style={s.td}>
                            <input
                              style={{
                                ...s.input,
                                width: 72,
                                padding: "4px 6px",
                              }}
                              type="time"
                              value={editRow.clock_in || ""}
                              onChange={(e) =>
                                setEditRow((p) => ({
                                  ...p,
                                  clock_in: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td style={s.td}>
                            <input
                              style={{
                                ...s.input,
                                width: 72,
                                padding: "4px 6px",
                              }}
                              type="time"
                              value={editRow.clock_out || ""}
                              onChange={(e) =>
                                setEditRow((p) => ({
                                  ...p,
                                  clock_out: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td style={s.td}>
                            <input
                              style={{
                                ...s.input,
                                width: 54,
                                padding: "4px 6px",
                              }}
                              type="number"
                              value={editRow.break_minutes || 30}
                              onChange={(e) =>
                                setEditRow((p) => ({
                                  ...p,
                                  break_minutes: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td
                            style={{ ...s.td, color: C.green, fontWeight: 600 }}
                          >
                            {calcHours(
                              editRow.clock_in,
                              editRow.clock_out,
                              editRow.break_minutes,
                            ) || "—"}
                          </td>
                          <td style={s.td}>
                            <select
                              style={{
                                ...s.select,
                                padding: "4px 6px",
                                fontSize: 11,
                              }}
                              value={editRow.entry_type}
                              onChange={(e) =>
                                setEditRow((p) => ({
                                  ...p,
                                  entry_type: e.target.value,
                                }))
                              }
                            >
                              {ENTRY_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {ENTRY_TYPE_CFG[t]?.label || t}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={s.td}>
                            <label
                              style={{
                                fontSize: 10,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={!!editRow.late_flag}
                                onChange={(e) =>
                                  setEditRow((p) => ({
                                    ...p,
                                    late_flag: e.target.checked,
                                  }))
                                }
                              />{" "}
                              Late
                            </label>
                          </td>
                          <td style={{ ...s.td, color: C.muted, fontSize: 11 }}>
                            manual
                          </td>
                          <td style={s.td}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                style={{
                                  ...s.btn(C.green),
                                  padding: "3px 10px",
                                  fontSize: 11,
                                }}
                                disabled={saving === entry.id}
                                onClick={() =>
                                  saveEntry(entry.id, {
                                    clock_in: editRow.clock_in || null,
                                    clock_out: editRow.clock_out || null,
                                    break_minutes:
                                      parseInt(editRow.break_minutes) || 30,
                                    hours_worked:
                                      parseFloat(
                                        calcHours(
                                          editRow.clock_in,
                                          editRow.clock_out,
                                          editRow.break_minutes,
                                        ),
                                      ) || null,
                                    entry_type: editRow.entry_type,
                                    late_flag: !!editRow.late_flag,
                                    clock_in_method: "manual",
                                    notes: editRow.notes || null,
                                  })
                                }
                              >
                                {saving === entry.id ? "…" : "✓"}
                              </button>
                              <button
                                style={{
                                  ...s.outlineBtn("#aaa"),
                                  padding: "3px 8px",
                                  fontSize: 11,
                                }}
                                onClick={() => setEditRow(null)}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const typeCfg = ENTRY_TYPE_CFG[entry.entry_type] || {
                      label: entry.entry_type,
                      color: C.grey,
                    };
                    return (
                      <tr
                        key={date}
                        style={{ background: isWeekend ? "#fafafa" : C.white }}
                      >
                        <td style={{ ...s.td, fontSize: 11 }}>
                          {fmtDate(date)}
                        </td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 11 }}>
                          {dayName}
                        </td>
                        <td
                          style={{
                            ...s.td,
                            fontFamily: T.font,
                            fontSize: 12,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtTime(entry.clock_in)}
                        </td>
                        <td
                          style={{
                            ...s.td,
                            fontFamily: T.font,
                            fontSize: 12,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtTime(entry.clock_out)}
                        </td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 11 }}>
                          {entry.break_minutes ?? 30}m
                        </td>
                        <td
                          style={{ ...s.td, fontWeight: 600, color: C.green }}
                        >
                          {entry.hours_worked
                            ? parseFloat(entry.hours_worked).toFixed(1)
                            : "—"}
                        </td>
                        <td style={s.td}>
                          <span
                            style={{
                              color: typeCfg.color,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {typeCfg.label}
                          </span>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {entry.late_flag && (
                              <span style={s.flagPill(true)}>
                                Late
                                {entry.late_minutes
                                  ? ` +${entry.late_minutes}m`
                                  : ""}
                              </span>
                            )}
                            {entry.absent_flag && (
                              <span style={s.flagPill(true)}>Absent</span>
                            )}
                            {!entry.late_flag && !entry.absent_flag && (
                              <span style={s.flagPill(false)}>OK</span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 10 }}>
                          {entry.clock_in_method || "manual"}
                        </td>
                        {canEdit && (
                          <td style={s.td}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                style={{
                                  ...s.outlineBtn(C.green),
                                  padding: "2px 8px",
                                  fontSize: 10,
                                }}
                                onClick={() =>
                                  setEditRow({
                                    id: entry.id,
                                    clock_in: entry.clock_in || "",
                                    clock_out: entry.clock_out || "",
                                    break_minutes: entry.break_minutes || 30,
                                    entry_type: entry.entry_type || "normal",
                                    late_flag: entry.late_flag,
                                    notes: entry.notes || "",
                                  })
                                }
                              >
                                Edit
                              </button>
                              <button
                                style={{
                                  ...s.outlineBtn(C.red),
                                  padding: "2px 8px",
                                  fontSize: 10,
                                }}
                                disabled={saving === entry.id}
                                onClick={() => {
                                  if (window.confirm("Delete this entry?"))
                                    deleteEntry(entry.id);
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add entry form */}
          {addingEntry && (
            <div
              style={{
                ...s.card,
                marginTop: 16,
                background: "#f0f7ee",
                borderColor: C.green,
              }}
            >
              <p style={{ ...s.sectionTitle, fontSize: 14, marginBottom: 12 }}>
                Add Entry
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label style={s.label}>Date *</label>
                  <input
                    style={{ ...s.input, width: "100%" }}
                    type="date"
                    value={newEntry.work_date}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, work_date: e.target.value }))
                    }
                    min={timesheet.period_start}
                    max={timesheet.period_end}
                  />
                </div>
                <div>
                  <label style={s.label}>Clock In *</label>
                  <input
                    style={{ ...s.input, width: "100%" }}
                    type="time"
                    value={newEntry.clock_in}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, clock_in: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={s.label}>Clock Out</label>
                  <input
                    style={{ ...s.input, width: "100%" }}
                    type="time"
                    value={newEntry.clock_out}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, clock_out: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={s.label}>Break (min)</label>
                  <input
                    style={{ ...s.input, width: "100%" }}
                    type="number"
                    value={newEntry.break_minutes}
                    onChange={(e) =>
                      setNewEntry((p) => ({
                        ...p,
                        break_minutes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={s.label}>Type</label>
                  <select
                    style={{ ...s.select, width: "100%" }}
                    value={newEntry.entry_type}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, entry_type: e.target.value }))
                    }
                  >
                    {ENTRY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ENTRY_TYPE_CFG[t]?.label || t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {newEntry.clock_in && newEntry.clock_out && (
                <div
                  style={{
                    fontSize: 12,
                    color: C.green,
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  Calculated:{" "}
                  {calcHours(
                    newEntry.clock_in,
                    newEntry.clock_out,
                    newEntry.break_minutes,
                  )}{" "}
                  hours
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={s.btn(C.green)}
                  onClick={addEntry}
                  disabled={saving === "new"}
                >
                  {saving === "new" ? "Saving…" : "Add Entry"}
                </button>
                <button
                  style={s.outlineBtn("#aaa")}
                  onClick={() => setAddingEntry(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {timesheet.staff_notes && (
            <div
              style={{
                ...s.card,
                marginTop: 16,
                borderLeft: `3px solid ${C.amber}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                Staff Notes
              </div>
              <div style={{ fontSize: 13, color: C.text }}>
                {timesheet.staff_notes}
              </div>
            </div>
          )}
          {timesheet.admin_notes && (
            <div
              style={{
                ...s.card,
                marginTop: 8,
                borderLeft: `3px solid ${C.blue}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                Admin Notes
              </div>
              <div style={{ fontSize: 13, color: C.text }}>
                {timesheet.admin_notes}
              </div>
            </div>
          )}
        </div>

        <div style={s.drawerFoot}>
          <div style={{ fontSize: 11, color: C.muted }}>
            {totalHours.toFixed(1)}h total · {entries.length} entries
            {lateCount > 0 && (
              <span style={{ color: C.amber, marginLeft: 8 }}>
                ⚠ {lateCount} late
              </span>
            )}
            {absentCount > 0 && (
              <span style={{ color: C.red, marginLeft: 8 }}>
                ✗ {absentCount} absent
              </span>
            )}
          </div>
          <button style={s.btn(C.green)} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB: TIMESHEETS LIST
// ═══════════════════════════════════════════════════════════════════════════════
function TimesheetsList({ tenantId, staffList }) {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [viewingEntries, setViewingEntries] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  // New timesheet form
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    staff_profile_id: "",
    period_start: getMonday(),
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("timesheets")
        .select(
          "id, staff_profile_id, period_start, period_end, status, staff_notes, admin_notes, total_hours, regular_hours, overtime_hours, late_count, absent_count, submitted_at, admin_reviewed_at, created_at",
        )
        .eq("tenant_id", tenantId)
        .order("period_start", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      if (staffFilter) q = q.eq("staff_profile_id", staffFilter);
      const { data, error: err } = await q;
      if (err) throw err;
      setTimesheets(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter, staffFilter]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const staffName = (id) => {
    const s = staffList.find((x) => x.id === id);
    return s ? s.preferred_name || s.full_name : "Unknown";
  };

  const createTimesheet = async () => {
    if (!newForm.staff_profile_id || !newForm.period_start) {
      setToast({
        type: "error",
        msg: "Staff member and period start are required.",
      });
      return;
    }
    const periodEnd = getSunday(newForm.period_start);
    setSaving(true);
    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from("timesheets")
        .select("id")
        .eq("staff_profile_id", newForm.staff_profile_id)
        .eq("period_start", newForm.period_start)
        .eq("tenant_id", tenantId)
        .single();
      if (existing) {
        setToast({
          type: "error",
          msg: "A timesheet already exists for this staff member and period.",
        });
        setSaving(false);
        return;
      }

      const { error: err } = await supabase.from("timesheets").insert([
        {
          tenant_id: tenantId,
          staff_profile_id: newForm.staff_profile_id,
          period_start: newForm.period_start,
          period_end: periodEnd,
          status: "draft",
        },
      ]);
      if (err) throw err;
      setToast({ type: "success", msg: "Timesheet created." });
      setShowNew(false);
      setNewForm({ staff_profile_id: "", period_start: getMonday() });
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    if (!approveModal) return;
    setProcessing(approveModal.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from("timesheets")
        .update({
          status: "admin_approved",
          admin_reviewed_by: user.id,
          admin_reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", approveModal.id);
      if (err) throw err;
      setToast({
        type: "success",
        msg: `Timesheet approved for ${staffName(approveModal.staff_profile_id)}.`,
      });
      setApproveModal(null);
      setAdminNotes("");
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setProcessing(null);
    }
  };

  const sendBack = async (ts) => {
    setProcessing(ts.id);
    try {
      const { error: err } = await supabase
        .from("timesheets")
        .update({
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ts.id);
      if (err) throw err;
      setToast({ type: "success", msg: "Timesheet sent back to draft." });
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setProcessing(null);
    }
  };

  const submittedCount = timesheets.filter(
    (t) => t.status === "staff_submitted",
  ).length;

  return (
    <div>
      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1px",
          background: T.ink150,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Submitted",
            num: timesheets.filter((t) => t.status === "staff_submitted")
              .length,
            color: T.warning,
          },
          {
            label: "Draft",
            num: timesheets.filter((t) => t.status === "draft").length,
            color: T.ink500,
          },
          {
            label: "Admin Approved",
            num: timesheets.filter((t) => t.status === "admin_approved").length,
            color: T.info,
          },
          {
            label: "Locked",
            num: timesheets.filter((t) =>
              ["hr_approved", "locked"].includes(t.status),
            ).length,
            color: T.success,
          },
        ].map(({ label, num, color }) => (
          <div key={label} style={s.statCard}>
            <div style={{ ...s.statNum, color }}>{num}</div>
            <div style={s.statLabel}>{label}</div>
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
          style={s.select}
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
          style={s.select}
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
        <button
          style={{ ...s.btn(C.green), marginLeft: "auto" }}
          onClick={() => setShowNew(true)}
        >
          + New Timesheet
        </button>
      </div>

      {submittedCount > 0 && (
        <div
          style={{
            padding: "10px 14px",
            background: C.amberLight,
            border: `1px solid ${C.amber}`,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
            color: C.amber,
            fontWeight: 600,
          }}
        >
          ⏳ {submittedCount} timesheet{submittedCount !== 1 ? "s" : ""}{" "}
          awaiting your review
        </div>
      )}

      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
      {error && <div style={s.error}>⚠ {error}</div>}

      {/* New timesheet modal */}
      {showNew && (
        <div
          style={s.modal}
          onClick={(e) => e.target === e.currentTarget && setShowNew(false)}
        >
          <div style={{ ...s.drawer, maxWidth: 400 }}>
            <div style={s.drawerHead}>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 16,
                  fontWeight: 600,
                  color: T.ink700,
                }}
              >
                New Timesheet
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: C.muted,
                }}
                onClick={() => setShowNew(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Staff Member *</label>
                <select
                  style={{ ...s.select, width: "100%" }}
                  value={newForm.staff_profile_id}
                  onChange={(e) =>
                    setNewForm((p) => ({
                      ...p,
                      staff_profile_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Select staff member…</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.preferred_name || st.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={s.label}>Week Starting (Monday) *</label>
                <input
                  style={{ ...s.input, width: "100%" }}
                  type="date"
                  value={newForm.period_start}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, period_start: e.target.value }))
                  }
                />
              </div>
              {newForm.period_start && (
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
                  Period: {fmtDate(newForm.period_start)} —{" "}
                  {fmtDate(getSunday(newForm.period_start))}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={s.btn(C.green)}
                  onClick={createTimesheet}
                  disabled={saving}
                >
                  {saving ? "Creating…" : "Create Timesheet"}
                </button>
                <button
                  style={s.outlineBtn("#aaa")}
                  onClick={() => setShowNew(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <div
          style={s.modal}
          onClick={(e) => e.target === e.currentTarget && setApproveModal(null)}
        >
          <div style={{ ...s.drawer, maxWidth: 380 }}>
            <div style={s.drawerHead}>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 16,
                  fontWeight: 600,
                  color: T.ink700,
                }}
              >
                Approve Timesheet
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: C.muted,
                }}
                onClick={() => setApproveModal(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>
                Approving timesheet for{" "}
                <strong>{staffName(approveModal.staff_profile_id)}</strong>
                <br />
                {fmtDate(approveModal.period_start)} —{" "}
                {fmtDate(approveModal.period_end)}
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Admin Notes (optional)</label>
                <textarea
                  style={{
                    ...s.input,
                    width: "100%",
                    height: 80,
                    resize: "vertical",
                  }}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Any notes for HR review…"
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={s.btn(C.green)}
                  onClick={approve}
                  disabled={!!processing}
                >
                  {processing ? "Approving…" : "Approve"}
                </button>
                <button
                  style={s.outlineBtn("#aaa")}
                  onClick={() => setApproveModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={s.emptyState}>Loading timesheets…</div>
      ) : timesheets.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⏱</div>
          <div
            style={{
              fontFamily: T.font,
              fontSize: 15,
              color: T.ink400,
              marginBottom: 6,
            }}
          >
            No timesheets yet
          </div>
          <div style={{ fontSize: 12, color: "#ccc", marginBottom: 20 }}>
            Create a timesheet to start tracking hours for your team
          </div>
          <button style={s.btn(C.green)} onClick={() => setShowNew(true)}>
            + Create First Timesheet
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Staff Member</th>
                <th style={s.th}>Period</th>
                <th style={s.th}>Hours</th>
                <th style={s.th}>OT</th>
                <th style={s.th}>Late</th>
                <th style={s.th}>Absent</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map((ts) => {
                const isSubmitted = ts.status === "staff_submitted";
                const isDraft = ts.status === "draft";
                const isLocked = ["hr_approved", "locked"].includes(ts.status);
                return (
                  <tr key={ts.id}>
                    <td style={s.td}>
                      <strong>{staffName(ts.staff_profile_id)}</strong>
                    </td>
                    <td style={{ ...s.td, fontSize: 12, whiteSpace: "nowrap" }}>
                      {fmtDate(ts.period_start)} — {fmtDate(ts.period_end)}
                    </td>
                    <td
                      style={{
                        ...s.td,
                        fontFamily: T.font,
                        fontSize: 16,
                        fontWeight: 400,
                        letterSpacing: "-0.01em",
                        fontVariantNumeric: "tabular-nums",
                        color: T.accent,
                      }}
                    >
                      {ts.total_hours
                        ? parseFloat(ts.total_hours).toFixed(1)
                        : "—"}
                    </td>
                    <td
                      style={{
                        ...s.td,
                        color: ts.overtime_hours > 0 ? C.blue : C.muted,
                        fontSize: 12,
                      }}
                    >
                      {ts.overtime_hours
                        ? parseFloat(ts.overtime_hours).toFixed(1)
                        : "—"}
                    </td>
                    <td style={s.td}>
                      {ts.late_count > 0 ? (
                        <span style={s.flagPill(true)}>{ts.late_count}</span>
                      ) : (
                        <span style={s.flagPill(false)}>0</span>
                      )}
                    </td>
                    <td style={s.td}>
                      {ts.absent_count > 0 ? (
                        <span style={s.flagPill(true)}>{ts.absent_count}</span>
                      ) : (
                        <span style={s.flagPill(false)}>0</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <StatusBadge status={ts.status} />
                    </td>
                    <td style={s.td}>
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        <button
                          style={{
                            ...s.outlineBtn(C.green),
                            padding: "4px 10px",
                            fontSize: 11,
                          }}
                          onClick={() => setViewingEntries(ts)}
                        >
                          Entries
                        </button>
                        {isSubmitted && (
                          <>
                            <button
                              style={{
                                ...s.btn(C.green),
                                padding: "4px 10px",
                                fontSize: 11,
                              }}
                              disabled={processing === ts.id}
                              onClick={() => {
                                setApproveModal(ts);
                                setAdminNotes("");
                              }}
                            >
                              Approve
                            </button>
                            <button
                              style={{
                                ...s.outlineBtn(C.amber),
                                padding: "4px 10px",
                                fontSize: 11,
                              }}
                              disabled={processing === ts.id}
                              onClick={() => sendBack(ts)}
                            >
                              Send Back
                            </button>
                          </>
                        )}
                        {isDraft && (
                          <button
                            style={{
                              ...s.btn(C.amber),
                              padding: "4px 10px",
                              fontSize: 11,
                            }}
                            disabled={processing === ts.id}
                            onClick={async () => {
                              setProcessing(ts.id);
                              await supabase
                                .from("timesheets")
                                .update({
                                  status: "staff_submitted",
                                  submitted_at: new Date().toISOString(),
                                  updated_at: new Date().toISOString(),
                                })
                                .eq("id", ts.id);
                              setProcessing(null);
                              load();
                            }}
                          >
                            Mark Submitted
                          </button>
                        )}
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
            {timesheets.length} timesheet{timesheets.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Entries drawer */}
      {viewingEntries && (
        <EntriesDrawer
          timesheet={viewingEntries}
          staffName={staffName(viewingEntries.staff_profile_id)}
          tenantId={tenantId}
          onClose={() => setViewingEntries(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB: SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
function TimesheetSummary({ tenantId, staffList }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: ts } = await supabase
        .from("timesheets")
        .select(
          "staff_profile_id, total_hours, overtime_hours, late_count, absent_count, status",
        )
        .eq("tenant_id", tenantId);
      if (ts) {
        // Group by staff
        const grouped = {};
        ts.forEach((t) => {
          if (!grouped[t.staff_profile_id])
            grouped[t.staff_profile_id] = {
              total: 0,
              ot: 0,
              late: 0,
              absent: 0,
              sheets: 0,
            };
          grouped[t.staff_profile_id].total += parseFloat(t.total_hours || 0);
          grouped[t.staff_profile_id].ot += parseFloat(t.overtime_hours || 0);
          grouped[t.staff_profile_id].late += parseInt(t.late_count || 0);
          grouped[t.staff_profile_id].absent += parseInt(t.absent_count || 0);
          grouped[t.staff_profile_id].sheets += 1;
        });
        setData(
          Object.entries(grouped).map(([id, stats]) => ({ id, ...stats })),
        );
      }
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const staffName = (id) => {
    const s = staffList.find((x) => x.id === id);
    return s ? s.preferred_name || s.full_name : "Unknown";
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        Cumulative totals across all timesheet periods for each staff member.
      </p>
      {loading ? (
        <div style={s.emptyState}>Loading summary…</div>
      ) : data.length === 0 ? (
        <div style={s.emptyState}>No timesheet data yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Staff Member</th>
                <th style={s.th}>Timesheets</th>
                <th style={s.th}>Total Hours</th>
                <th style={s.th}>Overtime</th>
                <th style={s.th}>Late Days</th>
                <th style={s.th}>Absent Days</th>
              </tr>
            </thead>
            <tbody>
              {data
                .sort((a, b) => b.total - a.total)
                .map((row) => (
                  <tr key={row.id}>
                    <td style={s.td}>
                      <strong>{staffName(row.id)}</strong>
                    </td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>
                      {row.sheets}
                    </td>
                    <td
                      style={{
                        ...s.td,
                        fontFamily: T.font,
                        fontSize: 16,
                        fontWeight: 400,
                        letterSpacing: "-0.01em",
                        fontVariantNumeric: "tabular-nums",
                        color: T.accent,
                      }}
                    >
                      {row.total.toFixed(1)}
                    </td>
                    <td
                      style={{ ...s.td, color: row.ot > 0 ? C.blue : C.muted }}
                    >
                      {row.ot > 0 ? row.ot.toFixed(1) : "—"}
                    </td>
                    <td style={s.td}>
                      <span style={s.flagPill(row.late > 0)}>{row.late}</span>
                    </td>
                    <td style={s.td}>
                      <span style={s.flagPill(row.absent > 0)}>
                        {row.absent}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const SUB_TABS = ["Timesheets", "Summary"];

export default function HRTimesheets({ tenantId }) {
  const [subTab, setSubTab] = useState("Timesheets");
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    supabase
      .from("staff_profiles")
      .select("id, full_name, preferred_name, job_title")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setStaffList(data || []));
  }, [tenantId]);

  return (
    <div style={s.wrapper}>
      <div style={s.subTabs}>
        {SUB_TABS.map((t) => (
          <button
            key={t}
            style={s.subTab(subTab === t)}
            onClick={() => setSubTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {subTab === "Timesheets" && (
        <TimesheetsList tenantId={tenantId} staffList={staffList} />
      )}
      {subTab === "Summary" && (
        <TimesheetSummary tenantId={tenantId} staffList={staffList} />
      )}
    </div>
  );
}
