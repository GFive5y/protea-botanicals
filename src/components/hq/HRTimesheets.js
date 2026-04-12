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
import { T } from "../../styles/tokens";
// Design tokens — imported from tokens.js (WP-UNIFY)
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
  orange: T.warning,
  orangeLight: T.warningLight,
  purple: T.info,
  purpleLight: T.infoLight,
  grey: T.ink500,
  greyLight: T.bg,
  border: T.border,
  bg: T.bg,
  white: "#fff",
  text: T.ink700,
  muted: T.ink500,
};

const STATUS_CFG = {
  draft: { label: "Draft", bg: T.bg, color: T.ink500 },
  staff_submitted: { label: "Submitted", bg: T.warningLight, color: T.warning },
  admin_approved: { label: "Admin Approved", bg: T.infoLight, color: T.info },
  hr_approved: { label: "HR Approved", bg: T.successLight, color: T.success },
  locked: { label: "Locked", bg: T.bg, color: T.ink700 },
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
    borderBottom: `1px solid ${T.border}`,
    marginBottom: 24,
  },
  subTab: (a) => ({
    padding: "10px 16px",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    fontSize: 11,
    fontFamily: T.font,
    color: a ? T.accent : T.ink500,
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
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    background: "#fff",
    cursor: "pointer",
    outline: "none",
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
    color: T.ink500,
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
                  color: T.ink500,
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
// TIMESHEET SETUP WIZARD
// Shown when tenant has no timesheets yet.
// Creates first timesheet and auto-opens the entries drawer.
// ═══════════════════════════════════════════════════════════════════════════════
function TimesheetSetupWizard({ staffList, tenantId, onCreated, onSkip }) {
  const [staffId, setStaffId] = useState(staffList[0]?.id || "");
  const [periodStart, setPeriodStart] = useState(getMonday());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const periodEnd = getSunday(periodStart);

  async function handleCreate() {
    if (!staffId || !periodStart) return;
    setSaving(true);
    setError(null);
    try {
      // Duplicate check
      const { data: existing } = await supabase
        .from("timesheets")
        .select("id")
        .eq("staff_profile_id", staffId)
        .eq("period_start", periodStart)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existing) {
        setError("A timesheet for this staff member and week already exists.");
        setSaving(false);
        return;
      }

      const { data, error: err } = await supabase
        .from("timesheets")
        .insert({
          tenant_id: tenantId,
          staff_profile_id: staffId,
          period_start: periodStart,
          period_end: periodEnd,
          status: "draft",
        })
        .select()
        .single();

      if (err) throw err;
      onCreated(data); // parent opens EntriesDrawer immediately
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const inp = {
    padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 13, fontFamily: T.font, color: T.ink900, outline: "none",
    width: "100%", boxSizing: "border-box", background: "#fff",
  };
  const lbl = {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: T.ink500, fontFamily: T.font, marginBottom: 6,
  };

  // No staff guard
  if (staffList.length === 0) {
    return (
      <div style={{
        background: "#fff", border: `1px solid ${T.border}`,
        borderRadius: 12, overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }}>
        <div style={{ background: T.accent, padding: "28px 32px 24px", color: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>
            Timesheets · Getting started
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            Add staff before tracking hours
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
            Timesheets are linked to staff profiles.
            You need at least one active staff member before you can track hours.
          </div>
        </div>
        <div style={{ padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            {[
              { num: "1", text: "Add staff profiles in the Staff tab" },
              { num: "2", text: "Come back here to create timesheets" },
              { num: "3", text: "Add daily clock-in / clock-out entries" },
            ].map(({ num, text }) => (
              <div key={num} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: T.border, color: T.ink500,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {num}
                </div>
                <span style={{ fontSize: 12, color: T.ink500, fontFamily: T.font, lineHeight: 1.4 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            padding: "14px 18px", borderRadius: 8,
            background: T.accentLight, border: `1px solid ${T.accentBd}`,
            fontSize: 12, color: T.accent, fontFamily: T.font,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>👉</span>
            Go to the <strong>Staff tab</strong> in the navigation bar above to add your first team member.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", border: `1px solid ${T.border}`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    }}>
      {/* Header */}
      <div style={{ background: T.accent, padding: "28px 32px 24px", color: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>
          Timesheets Setup · Step 1 of 2
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Create your first timesheet
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
          A timesheet covers one week (Monday to Sunday) for one staff member.
          After creating it you'll add the daily clock-in and clock-out times.
        </div>

        {/* Step indicator */}
        <div style={{ marginTop: 20, display: "flex", gap: 6, alignItems: "center" }}>
          {["Create Timesheet", "Add Hours"].map((label, i) => (
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
              <span style={{ fontSize: 11, fontWeight: i === 0 ? 700 : 400, opacity: i === 0 ? 1 : 0.6 }}>
                {label}
              </span>
              {i < 1 && <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.3)" }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Form body */}
      <div style={{ padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div>
            <label style={lbl}>Staff member *</label>
            <select value={staffId} onChange={e => setStaffId(e.target.value)} style={inp}>
              {staffList.map(st => (
                <option key={st.id} value={st.id}>
                  {st.preferred_name || st.full_name}
                  {st.job_title ? ` — ${st.job_title}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Week starting (Monday) *</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              style={inp}
            />
            {periodStart && (
              <div style={{ fontSize: 11, color: T.ink500, fontFamily: T.font, marginTop: 5 }}>
                Period: {fmtDate(periodStart)} — {fmtDate(periodEnd)}
              </div>
            )}
          </div>
        </div>

        {/* What happens next */}
        <div style={{
          padding: "14px 18px", borderRadius: 8, marginBottom: 24,
          background: T.accentLight, border: `1px solid ${T.accentBd}`,
          fontSize: 12, color: T.accent, fontFamily: T.font, lineHeight: 1.6,
        }}>
          <strong>What happens next:</strong> After clicking Create, a daily entry
          sheet opens immediately so you can log this week's hours straight away.
          Each day shows clock-in, clock-out, break time, and hours calculated
          automatically.
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16,
            background: T.dangerLight, border: `1px solid ${T.dangerBd}`,
            fontSize: 12, color: T.danger, fontFamily: T.font,
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onSkip}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: T.ink500, fontFamily: T.font,
              textDecoration: "underline",
            }}
          >
            Skip — I'll do this later
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !staffId || !periodStart}
            style={{
              padding: "12px 28px", borderRadius: 8, border: "none",
              background: staffId && periodStart ? T.accent : T.border,
              color: "#fff", fontWeight: 700, fontSize: 13,
              fontFamily: T.font,
              cursor: staffId && periodStart ? "pointer" : "not-allowed",
              opacity: saving ? 0.7 : 1, transition: "background 0.15s",
            }}
          >
            {saving ? "Creating…" : "Create timesheet and add hours →"}
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
          background: T.border,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow.sm,
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

      {/* Table / Wizard */}
      {loading ? (
        <div style={s.emptyState}>Loading timesheets…</div>
      ) : timesheets.length === 0 ? (
        <TimesheetSetupWizard
          staffList={staffList}
          tenantId={tenantId}
          onCreated={(newTs) => {
            load();          // refresh list
            setViewingEntries(newTs); // auto-open entries drawer (step 2)
          }}
          onSkip={() => setShowNew(true)} // fall back to existing modal
        />
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
// SUB-TAB: HOURS MONITOR
// Scheduled (roster_assignments) vs Actual (timesheet_entries) per week
// ═══════════════════════════════════════════════════════════════════════════════
function HoursMonitor({ tenantId, staffList }) {
  const [weekStart, setWeekStart] = useState(getMonday());
  const [rows, setRows] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rosterExists, setRosterExists] = useState(null);

  const weekEnd = getSunday(weekStart);
  const weekDates = weekDays(weekStart);

  function fmtWeekLabel(monday) {
    const end = getSunday(monday);
    return `${fmtDate(monday)} – ${fmtDate(end)}`;
  }
  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }
  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  const load = useCallback(async () => {
    if (!tenantId || staffList.length === 0) return;
    setLoading(true);

    // 1. Roster week for this Monday
    const { data: rosterWeek } = await supabase
      .from("roster_weeks")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("week_start", weekStart)
      .maybeSingle();

    setRosterExists(rosterWeek || null);

    // 2. Roster assignments for this week
    const { data: assignments } = rosterWeek
      ? await supabase
          .from("roster_assignments")
          .select("staff_profile_id, work_date, shift_start, shift_end, break_minutes, is_off, shift_template_id, shift_templates(shift_start, shift_end, break_minutes)")
          .eq("roster_week_id", rosterWeek.id)
      : { data: [] };

    // 3. Timesheet entries for all staff in this week
    const staffIds = staffList.map(s => s.id);
    const { data: entries } = await supabase
      .from("timesheet_entries")
      .select("staff_profile_id, work_date, hours_worked, late_flag, absent_flag, entry_type")
      .eq("tenant_id", tenantId)
      .in("staff_profile_id", staffIds)
      .gte("work_date", weekStart)
      .lte("work_date", weekEnd);

    // 4. Public holidays this week
    const { data: phData } = await supabase
      .from("public_holidays")
      .select("holiday_date, name")
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .eq("is_active", true)
      .gte("holiday_date", weekStart)
      .lte("holiday_date", weekEnd);

    setHolidays(phData || []);
    const holidayDates = new Set((phData || []).map(h => h.holiday_date));

    // 5. Build per-staff rows
    function calcAssignedHours(staffId) {
      const staffAssignments = (assignments || []).filter(
        a => a.staff_profile_id === staffId && !a.is_off
      );
      return staffAssignments.reduce((sum, a) => {
        const start = a.shift_start || a.shift_templates?.shift_start;
        const end   = a.shift_end   || a.shift_templates?.shift_end;
        const brk   = a.break_minutes ?? a.shift_templates?.break_minutes ?? 30;
        return sum + (parseFloat(calcHours(start, end, brk)) || 0);
      }, 0);
    }

    const built = staffList.map(staff => {
      const staffEntries = (entries || []).filter(e => e.staff_profile_id === staff.id);
      const actualHours  = staffEntries.reduce((s, e) => s + parseFloat(e.hours_worked || 0), 0);
      const scheduledHours = calcAssignedHours(staff.id);
      const variance     = actualHours - scheduledHours;
      const lateCount    = staffEntries.filter(e => e.late_flag).length;
      const absentCount  = staffEntries.filter(e => e.absent_flag).length;
      const phCount      = staffEntries.filter(e => holidayDates.has(e.work_date)).length;
      const daysWorked   = staffEntries.filter(e => !e.absent_flag && parseFloat(e.hours_worked || 0) > 0).length;
      const hasOT        = actualHours > 45;
      return {
        staff,
        scheduledHours,
        actualHours,
        variance,
        lateCount,
        absentCount,
        phCount,
        daysWorked,
        hasOT,
        hasEntries: staffEntries.length > 0,
        hasAssignments: scheduledHours > 0,
      };
    });

    setRows(built);
    setLoading(false);
  }, [tenantId, staffList, weekStart, weekEnd]);

  useEffect(() => { load(); }, [load]);

  // Variance colour
  function varColor(v, scheduled) {
    if (scheduled === 0) return T.ink500;
    const pct = scheduled > 0 ? (v / scheduled) * 100 : 0;
    if (v > 0) return T.info;          // over scheduled — blue
    if (pct >= -10) return T.success;  // within 10% short — green
    if (pct >= -20) return T.warning;  // 10–20% short — amber
    return T.danger;                   // >20% short — red
  }

  const totalScheduled = rows.reduce((s, r) => s + r.scheduledHours, 0);
  const totalActual    = rows.reduce((s, r) => s + r.actualHours, 0);
  const totalVariance  = totalActual - totalScheduled;
  const hasAnyData     = rows.some(r => r.hasEntries || r.hasAssignments);

  return (
    <div>
      {/* Week nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevWeek} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#fff", cursor: "pointer", fontSize: 15, color: T.ink500 }}>‹</button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink900, fontFamily: T.font }}>
              {fmtWeekLabel(weekStart)}
            </div>
            {rosterExists && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                background: rosterExists.status === "published" ? T.accentLight
                          : rosterExists.status === "locked" ? T.infoLight : T.bg,
                color: rosterExists.status === "published" ? T.accentMid
                     : rosterExists.status === "locked" ? T.info : T.ink500,
                fontFamily: T.font, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Roster: {rosterExists.status}
              </span>
            )}
          </div>
          <button onClick={nextWeek} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#fff", cursor: "pointer", fontSize: 15, color: T.ink500 }}>›</button>
          <button onClick={() => setWeekStart(getMonday())} style={{
            padding: "6px 12px", borderRadius: 6,
            border: `1px solid ${T.accentBd}`, background: T.accentLight,
            cursor: "pointer", fontSize: 11, fontWeight: 700, color: T.accent, fontFamily: T.font,
          }}>This Week</button>
        </div>
        <button onClick={load} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#fff", cursor: "pointer", fontSize: 11, color: T.ink500, fontFamily: T.font }}>
          ↻ Refresh
        </button>
      </div>

      {/* Holiday banner */}
      {holidays.length > 0 && (
        <div style={{
          padding: "8px 14px", borderRadius: 8, background: T.warningLight,
          border: `1px solid ${T.warningBd}`, marginBottom: 16,
          fontSize: 12, color: T.warning, fontFamily: T.font,
        }}>
          ★ Public holiday this week: {holidays.map(h => `${h.name} (${fmtDate(h.holiday_date)})`).join(" · ")}
          {" "}— staff working these days earn 2× rate
        </div>
      )}

      {loading ? (
        <div style={s.emptyState}>Comparing hours…</div>
      ) : staffList.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
          <div style={{ fontFamily: T.font, fontSize: 14, color: T.ink500 }}>
            No active staff profiles yet. Add staff in the Staff tab first.
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI strip */}
          {hasAnyData && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4,1fr)",
              gap: "1px", background: T.border, borderRadius: 8,
              overflow: "hidden", border: `1px solid ${T.border}`,
              boxShadow: T.shadow.sm, marginBottom: 20,
            }}>
              {[
                { label: "Scheduled", value: `${totalScheduled.toFixed(1)}h`, color: T.ink700 },
                { label: "Actual", value: `${totalActual.toFixed(1)}h`, color: T.accentMid },
                {
                  label: "Variance",
                  value: `${totalVariance >= 0 ? "+" : ""}${totalVariance.toFixed(1)}h`,
                  color: totalVariance >= 0 ? T.info : Math.abs(totalVariance) < 5 ? T.success : T.danger,
                },
                {
                  label: "Coverage",
                  value: totalScheduled > 0 ? `${Math.round((totalActual / totalScheduled) * 100)}%` : "—",
                  color: totalScheduled > 0 && totalActual / totalScheduled >= 0.9 ? T.success : T.warning,
                },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#fff", padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink500, fontFamily: T.font, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color, fontFamily: T.font, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Per-staff comparison table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...s.table, fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={s.th}>Staff</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Scheduled</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Actual</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Variance</th>
                  <th style={{ ...s.th, textAlign: "center" }}>Days</th>
                  <th style={{ ...s.th, textAlign: "center" }}>Late</th>
                  <th style={{ ...s.th, textAlign: "center" }}>Absent</th>
                  {holidays.length > 0 && <th style={{ ...s.th, textAlign: "center" }}>PH Days</th>}
                  <th style={{ ...s.th, textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const vc = varColor(row.variance, row.scheduledHours);
                  const noData = !row.hasEntries && !row.hasAssignments;
                  return (
                    <tr key={row.staff.id} style={{ background: noData ? T.surface : "#fff" }}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, color: T.ink900, fontFamily: T.font }}>{row.staff.full_name || row.staff.preferred_name}</div>
                        {row.staff.job_title && <div style={{ fontSize: 10, color: T.ink500 }}>{row.staff.job_title}</div>}
                      </td>

                      <td style={{ ...s.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {row.hasAssignments ? (
                          <span style={{ fontWeight: 600, color: T.ink700 }}>{row.scheduledHours.toFixed(1)}h</span>
                        ) : (
                          <span style={{ color: T.ink300, fontSize: 11 }}>No roster</span>
                        )}
                      </td>

                      <td style={{ ...s.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {row.hasEntries ? (
                          <span style={{ fontWeight: 600, color: T.accentMid }}>{row.actualHours.toFixed(1)}h</span>
                        ) : (
                          <span style={{ color: T.ink300, fontSize: 11 }}>No entries</span>
                        )}
                      </td>

                      <td style={{ ...s.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {(row.hasEntries || row.hasAssignments) && row.scheduledHours > 0 ? (
                          <span style={{ fontWeight: 700, color: vc }}>
                            {row.variance >= 0 ? "+" : ""}{row.variance.toFixed(1)}h
                            {row.hasOT && <span style={{ fontSize: 10, marginLeft: 4, color: T.info }}>OT</span>}
                          </span>
                        ) : <span style={{ color: T.ink300 }}>—</span>}
                      </td>

                      <td style={{ ...s.td, textAlign: "center", color: T.ink700 }}>
                        {row.daysWorked > 0 ? row.daysWorked : <span style={{ color: T.ink300 }}>—</span>}
                      </td>

                      <td style={{ ...s.td, textAlign: "center" }}>
                        {row.lateCount > 0
                          ? <span style={s.flagPill(true)}>{row.lateCount}</span>
                          : <span style={{ color: T.ink300, fontSize: 11 }}>—</span>}
                      </td>

                      <td style={{ ...s.td, textAlign: "center" }}>
                        {row.absentCount > 0
                          ? <span style={s.flagPill(true)}>{row.absentCount}</span>
                          : <span style={{ color: T.ink300, fontSize: 11 }}>—</span>}
                      </td>

                      {holidays.length > 0 && (
                        <td style={{ ...s.td, textAlign: "center" }}>
                          {row.phCount > 0
                            ? <span style={{ fontSize: 11, fontWeight: 700, color: T.warning }}>★ {row.phCount}</span>
                            : <span style={{ color: T.ink300, fontSize: 11 }}>—</span>}
                        </td>
                      )}

                      <td style={{ ...s.td, textAlign: "center" }}>
                        {noData ? (
                          <span style={{ fontSize: 10, color: T.ink300, fontFamily: T.font }}>No data</span>
                        ) : !row.hasEntries ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.warning, fontFamily: T.font }}>Missing entries</span>
                        ) : !row.hasAssignments ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.ink500, fontFamily: T.font }}>No roster</span>
                        ) : row.hasOT ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.info, fontFamily: T.font }}>Overtime</span>
                        ) : Math.abs(row.variance) <= 1 ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.success, fontFamily: T.font }}>✓ On track</span>
                        ) : row.variance < -3 ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.danger, fontFamily: T.font }}>Short hours</span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.warning, fontFamily: T.font }}>Slight short</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {hasAnyData && (
                <tfoot>
                  <tr style={{ background: T.accentLight, borderTop: `2px solid ${T.accentBd}` }}>
                    <td style={{ ...s.td, fontWeight: 700, color: T.accent }}>TOTAL</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>{totalScheduled.toFixed(1)}h</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: T.accentMid, fontVariantNumeric: "tabular-nums" }}>{totalActual.toFixed(1)}h</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: varColor(totalVariance, totalScheduled), fontVariantNumeric: "tabular-nums" }}>
                      {totalVariance >= 0 ? "+" : ""}{totalVariance.toFixed(1)}h
                    </td>
                    <td colSpan={holidays.length > 0 ? 5 : 4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Empty state when no data for the week */}
          {!hasAnyData && !loading && (
            <div style={{ ...s.emptyState, marginTop: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
              <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink700, marginBottom: 8 }}>
                No hours data for this week
              </div>
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.font, maxWidth: 360, margin: "0 auto 20px" }}>
                Build a roster in the Roster tab, then add timesheet entries in the Timesheets tab. Hours Monitor will compare them here.
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 14 }}>
            {[
              { color: T.success, label: "On track (within 1h)" },
              { color: T.warning, label: "Slight short (1–3h)" },
              { color: T.danger,  label: "Short hours (>3h)" },
              { color: T.info,    label: "Overtime (>45h/week)" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 11, color: T.ink500, fontFamily: T.font }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB: PAY CALCULATOR (Session D)
// SA BCEA-compliant shift cost calculator
// Reads: employment_contracts (hourly_rate_zar) + timesheet_entries + public_holidays
// Rules: regular≤45h×1× | OT>45h×1.5× | Sunday×1.5× | PH×2×
// ═══════════════════════════════════════════════════════════════════════════════

function PayCalculator({ tenantId, staffList }) {
  const [staffId, setStaffId] = useState(staffList[0]?.id || "");
  const [weekStart, setWeekStart] = useState(getMonday());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const weekEnd = getSunday(weekStart);

  async function calculate() {
    if (!staffId || !weekStart) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // 1. Active contract → rate
      const { data: contract } = await supabase
        .from("employment_contracts")
        .select("hourly_rate_zar, contract_type")
        .eq("staff_profile_id", staffId)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .maybeSingle();

      if (!contract || !contract.hourly_rate_zar) {
        setError("No active contract with an hourly rate found for this staff member. Create or edit a contract in the Contracts tab.");
        setLoading(false);
        return;
      }
      const rate = parseFloat(contract.hourly_rate_zar);

      // 2. Timesheet entries for the week
      const { data: entries } = await supabase
        .from("timesheet_entries")
        .select("work_date, hours_worked, entry_type, clock_in, clock_out")
        .eq("staff_profile_id", staffId)
        .eq("tenant_id", tenantId)
        .gte("work_date", weekStart)
        .lte("work_date", weekEnd)
        .order("work_date");

      // 3. Public holidays this week
      const { data: holidays } = await supabase
        .from("public_holidays")
        .select("holiday_date, name")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .gte("holiday_date", weekStart)
        .lte("holiday_date", weekEnd);

      const phDates = new Set((holidays || []).map((h) => h.holiday_date));

      // 4. Classify and cost each entry
      let regularRaw = 0;
      let sundayHours = 0;
      let phHours = 0;
      const entryDetails = (entries || []).map((entry) => {
        const hours = parseFloat(entry.hours_worked || 0);
        const dayOfWeek = new Date(entry.work_date + "T12:00:00").getDay();
        const isSunday = dayOfWeek === 0;
        const isPH = phDates.has(entry.work_date) || entry.entry_type === "public_holiday";

        let category, multiplier;
        if (isPH) {
          category = "Public Holiday";
          multiplier = 2.0;
          phHours += hours;
        } else if (isSunday) {
          category = "Sunday";
          multiplier = 1.5;
          sundayHours += hours;
        } else {
          category = "Regular";
          multiplier = 1.0;
          regularRaw += hours;
        }
        return { date: entry.work_date, hours, category, multiplier, cost: hours * rate * multiplier };
      });

      // 5. Apply BCEA 45h weekly limit to regular hours
      const BCEA_LIMIT = 45;
      const regularHours = Math.min(regularRaw, BCEA_LIMIT);
      const overtimeHours = Math.max(0, regularRaw - BCEA_LIMIT);

      const regularCost = regularHours * rate;
      const overtimeCost = overtimeHours * rate * 1.5;
      const sundayCost = sundayHours * rate * 1.5;
      const phCost = phHours * rate * 2.0;
      const totalCost = regularCost + overtimeCost + sundayCost + phCost;
      const totalHours = regularRaw + sundayHours + phHours;

      const staffMember = staffList.find((s) => s.id === staffId);

      setResult({
        rate, contract,
        entries: entries || [],
        holidays: holidays || [],
        entryDetails,
        regularHours, overtimeHours, sundayHours, phHours,
        totalHours, regularCost, overtimeCost, sundayCost, phCost, totalCost,
        weekStart, weekEnd,
        staffName: staffMember?.preferred_name || staffMember?.full_name || "Staff",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (staffList.length === 0) {
    return (
      <div style={s.emptyState}>
        No active staff. Add staff profiles in the Staff tab first.
      </div>
    );
  }

  const categoryColor = { Regular: T.accent, Sunday: T.warning, "Public Holiday": T.danger };

  return (
    <div>
      {/* ── Controls ── */}
      <div style={{ ...s.card, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "flex-end" }}>
          <div>
            <label style={s.label}>Staff Member</label>
            <select style={{ ...s.select, width: "100%" }} value={staffId} onChange={(e) => { setStaffId(e.target.value); setResult(null); }}>
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>{st.preferred_name || st.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Week Starting (Monday)</label>
            <input type="date" style={{ ...s.input, width: "100%" }} value={weekStart}
              onChange={(e) => { setWeekStart(e.target.value); setResult(null); }} />
            <div style={{ fontSize: 11, color: T.ink500, fontFamily: T.font, marginTop: 4 }}>
              {fmtDate(weekStart)} — {fmtDate(weekEnd)}
            </div>
          </div>
          <button
            onClick={calculate}
            disabled={loading || !staffId}
            style={{ ...s.btn(T.accent), padding: "10px 24px", height: 42, alignSelf: "flex-start", marginTop: 20 }}
          >
            {loading ? "Calculating…" : "Calculate Pay →"}
          </button>
        </div>
      </div>

      {error && <div style={s.error}>⚠ {error}</div>}

      {/* ── Results ── */}
      {result && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ ...s.sectionTitle, fontSize: 18, marginBottom: 4 }}>
                {result.staffName} — {fmtDate(result.weekStart)} to {fmtDate(result.weekEnd)}
              </div>
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.font }}>
                R{result.rate.toFixed(2)}/hr · {result.contract.contract_type || "Contractor"} · BCEA compliant
              </div>
            </div>
          </div>

          {result.entries.length === 0 ? (
            <div style={{ ...s.card, textAlign: "center", padding: "48px 24px", color: T.ink500 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏱</div>
              <div style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink700, marginBottom: 6 }}>
                No timesheet entries for this week
              </div>
              <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.font }}>
                Add clock-in / clock-out entries in the Timesheets tab, then come back to calculate pay.
              </div>
            </div>
          ) : (
            <>
              {/* PH banner */}
              {result.holidays.length > 0 && (
                <div style={{ padding: "8px 14px", borderRadius: 8, background: T.warningLight, border: `1px solid ${T.warningBd}`, marginBottom: 16, fontSize: 12, color: T.warning, fontFamily: T.font }}>
                  ★ Public holiday this week: {result.holidays.map((h) => h.name).join(", ")} — 2× rate applied
                </div>
              )}

              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Regular Hours", hours: result.regularHours, cost: result.regularCost, mult: "1×", color: T.accent, show: result.regularHours > 0 },
                  { label: "Overtime >45h", hours: result.overtimeHours, cost: result.overtimeCost, mult: "1.5×", color: T.info, show: result.overtimeHours > 0 },
                  { label: "Sunday Work", hours: result.sundayHours, cost: result.sundayCost, mult: "1.5×", color: T.warning, show: result.sundayHours > 0 },
                  { label: "Public Holiday", hours: result.phHours, cost: result.phCost, mult: "2×", color: T.danger, show: result.phHours > 0 },
                ].filter((item) => item.show).map((item) => (
                  <div key={item.label} style={{ background: "#fff", border: `1px solid ${T.border}`, borderTop: `3px solid ${item.color}`, borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.ink500, fontFamily: T.font }}>{item.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: `${item.color}18`, color: item.color, padding: "2px 6px", borderRadius: 4 }}>{item.mult} rate</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: item.color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", marginBottom: 4 }}>
                      R{item.cost.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink500, fontFamily: T.font }}>
                      {item.hours.toFixed(1)}h × R{result.rate.toFixed(2)}{item.mult !== "1×" ? ` × ${item.mult}` : ""}
                    </div>
                  </div>
                ))}

                {/* Grand total card */}
                <div style={{ background: T.accent, borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.65)", fontFamily: T.font, marginBottom: 8 }}>
                    Total Gross Pay
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", marginBottom: 4 }}>
                    R{result.totalCost.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: T.font }}>
                    {result.totalHours.toFixed(1)}h total · before deductions
                  </div>
                </div>
              </div>

              {/* Daily breakdown table */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink500, fontFamily: T.font, marginBottom: 10 }}>
                  Daily breakdown
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ ...s.table, fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={s.th}>Date</th>
                        <th style={s.th}>Day</th>
                        <th style={{ ...s.th, textAlign: "right" }}>Hours</th>
                        <th style={s.th}>Category</th>
                        <th style={{ ...s.th, textAlign: "right" }}>Rate</th>
                        <th style={{ ...s.th, textAlign: "right" }}>Multiplier</th>
                        <th style={{ ...s.th, textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.entryDetails.map((entry, i) => {
                        const col = categoryColor[entry.category] || T.ink500;
                        const dayName = new Date(entry.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short" });
                        return (
                          <tr key={i}>
                            <td style={{ ...s.td, fontSize: 11 }}>{fmtDate(entry.date)}</td>
                            <td style={{ ...s.td, color: T.ink500, fontSize: 11 }}>{dayName}</td>
                            <td style={{ ...s.td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: T.accent }}>{entry.hours.toFixed(1)}h</td>
                            <td style={s.td}><span style={{ fontSize: 11, fontWeight: 700, color: col }}>{entry.category}</span></td>
                            <td style={{ ...s.td, textAlign: "right", color: T.ink500, fontVariantNumeric: "tabular-nums" }}>R{result.rate.toFixed(2)}</td>
                            <td style={{ ...s.td, textAlign: "right", fontWeight: entry.multiplier > 1 ? 700 : 400, color: entry.multiplier > 1 ? col : T.ink500 }}>{entry.multiplier}×</td>
                            <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>R{entry.cost.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {result.overtimeHours > 0 && (
                        <tr style={{ background: T.infoLight }}>
                          <td colSpan={2} style={{ ...s.td, fontSize: 11, color: T.info, fontWeight: 600, fontStyle: "italic" }}>+ Overtime premium (hours beyond 45h/wk)</td>
                          <td style={{ ...s.td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: T.info }}>{result.overtimeHours.toFixed(1)}h</td>
                          <td style={s.td}><span style={{ fontSize: 11, fontWeight: 700, color: T.info }}>Overtime</span></td>
                          <td style={{ ...s.td, textAlign: "right", color: T.info, fontVariantNumeric: "tabular-nums" }}>R{result.rate.toFixed(2)}</td>
                          <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: T.info }}>+0.5×</td>
                          <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: T.info, fontVariantNumeric: "tabular-nums" }}>R{result.overtimeCost.toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: T.accentLight, borderTop: `2px solid ${T.accentBd}` }}>
                        <td colSpan={2} style={{ ...s.td, fontWeight: 700, color: T.accent, fontFamily: T.font }}>GROSS PAY</td>
                        <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: T.accent, fontVariantNumeric: "tabular-nums" }}>{result.totalHours.toFixed(1)}h</td>
                        <td colSpan={3} />
                        <td style={{ ...s.td, textAlign: "right", fontWeight: 700, fontSize: 15, color: T.accent, fontVariantNumeric: "tabular-nums" }}>R{result.totalCost.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* BCEA footnote */}
              <div style={{ fontSize: 11, color: T.ink500, fontFamily: T.font, marginTop: 14, padding: "10px 14px", background: T.bg, borderRadius: 6, lineHeight: 1.6 }}>
                <strong>SA BCEA rules applied:</strong> Regular hours at 1× rate (up to 45h/week) ·
                Overtime at 1.5× (hours beyond 45h) · Sunday work at 1.5× ·
                Public holidays at 2×. Gross pay only — excludes UIF, PAYE tax, and deductions.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const SUB_TABS = ["Timesheets", "Hours Monitor", "Pay Calculator", "Summary"];

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
      {subTab === "Hours Monitor" && (
        <HoursMonitor tenantId={tenantId} staffList={staffList} />
      )}
      {subTab === "Pay Calculator" && (
        <PayCalculator tenantId={tenantId} staffList={staffList} />
      )}
      {subTab === "Summary" && (
        <TimesheetSummary tenantId={tenantId} staffList={staffList} />
      )}
    </div>
  );
}
