// HRCalendar.js v1.2 — SCHEMA VERIFIED · WP-VISUAL updated
// WP-HR-8: HR Calendar — leave, public holidays, hearings, timesheets, shifts
// Location: src/components/hq/HRCalendar.js
// Views: Month | Week | Team
//
// ── CONFIRMED SCHEMAS USED ────────────────────────────────────────────────────
// leave_requests:       start_date, end_date, days_requested, reason, status
// leave_types:          name, color, is_active
// public_holidays:      holiday_date (NOT date), name, holiday_type, tenant_id, is_active
// disciplinary_records: hearing_date (TIMESTAMPTZ — not date), hearing_location, subject, status
// timesheets:           period_start, period_end, status, total_hours, regular_hours,
//                       overtime_hours, late_count, absent_count
// shift_schedules:      effective_from, effective_to, works_monday→works_sunday (booleans),
//                       shift_start, shift_end, is_active, location
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";
// Design tokens — imported from tokens.js (WP-UNIFY)

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function formatDisplay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}
function shiftCoversDate(shift, dateStr) {
  if (!shift.is_active) return false;
  if (dateStr < shift.effective_from) return false;
  if (shift.effective_to && dateStr > shift.effective_to) return false;
  const dow = new Date(dateStr + "T00:00:00").getDay();
  const key = `works_${DAY_KEYS[dow]}`;
  return !!shift[key];
}

// ─── EVENT COLOURS (light-theme semantic palette) ────────────────────────────
const EV = {
  leave: { bg: T.accentLight, border: T.accentBd, text: T.accent },
  holiday: { bg: T.warningLight, border: T.warningBd, text: T.warning },
  hearing: { bg: T.dangerLight, border: T.dangerBd, text: T.danger },
  timesheet: { bg: T.infoLight, border: T.infoBd, text: T.info },
  shift: { bg: "#EDE9FE", border: "#A78BFA", text: "#5B21B6" },
  diary: { bg: "#F0F9FF", border: "#BAE6FD", text: "#0369A1" },
};

const STATUS_COLOR = {
  pending: T.warning,
  admin_approved: T.success,
  hr_approved: T.accentMid,
  rejected: T.danger,
  draft: T.ink500,
  staff_submitted: T.warning,
  locked: T.ink300,
};

// ─── EVENT CHIP ───────────────────────────────────────────────────────────────
function EventChip({ event, onClick, compact = false }) {
  const c = EV[event.type];
  const bg = event.leaveColor ? event.leaveColor + "30" : c.bg;
  const border = event.leaveColor ? event.leaveColor + "88" : c.border;
  const color = event.leaveColor ? event.leaveColor : c.text;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      title={event.title}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        color,
        borderRadius: 3,
        padding: compact ? "1px 4px" : "2px 6px",
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        fontFamily: T.font,
        cursor: "pointer",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        marginBottom: 2,
        lineHeight: 1.4,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {event.title}
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ event, onClose }) {
  if (!event) return null;
  const c = EV[event.type];
  const typeLabel =
    {
      leave: "Leave Request",
      holiday: "Public Holiday",
      hearing: "Disciplinary Hearing",
      timesheet: "Timesheet Period",
      shift: "Shift Schedule",
    }[event.type] || "Event";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          padding: 28,
          minWidth: 340,
          maxWidth: 500,
          boxShadow: T.shadow.sm,
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: c.text,
                fontFamily: T.font,
              }}
            >
              {typeLabel}
            </div>
            <div
              style={{
                color: T.ink700,
                fontSize: 16,
                fontWeight: 700,
                margin: "4px 0 0",
                fontFamily: T.font,
              }}
            >
              {event.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: T.ink500,
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {event.staffName && <DRow label="Staff" value={event.staffName} />}
          {event.startDate && (
            <DRow label="From" value={formatDisplay(event.startDate)} />
          )}
          {event.endDate && event.endDate !== event.startDate && (
            <DRow label="To" value={formatDisplay(event.endDate)} />
          )}
          {event.leaveType && (
            <DRow label="Leave Type" value={event.leaveType} />
          )}
          {event.days != null && <DRow label="Days" value={`${event.days}`} />}
          {event.reason && <DRow label="Reason" value={event.reason} />}
          {event.holidayType && <DRow label="Type" value={event.holidayType} />}
          {event.subject && <DRow label="Subject" value={event.subject} />}
          {event.location && <DRow label="Location" value={event.location} />}
          {event.shiftTime && <DRow label="Shift" value={event.shiftTime} />}
          {event.period && <DRow label="Period" value={event.period} />}
          {event.hours != null && (
            <DRow
              label="Total Hrs"
              value={`${event.hours}h  (Reg: ${event.regular}h | OT: ${event.overtime}h)`}
            />
          )}
          {event.lateCount != null && (
            <DRow
              label="Attendance"
              value={`${event.lateCount} late · ${event.absentCount} absent`}
            />
          )}
          {event.status && (
            <DRow label="Status">
              <span
                style={{
                  background: (STATUS_COLOR[event.status] || T.ink500) + "20",
                  color: STATUS_COLOR[event.status] || T.ink500,
                  border: `1px solid ${STATUS_COLOR[event.status] || T.ink500}44`,
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: T.font,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {event.status.replace(/_/g, " ")}
              </span>
            </DRow>
          )}
        </div>
      </div>
    </div>
  );
}

function DRow({ label, value, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span
        style={{
          color: T.ink500,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: T.font,
          minWidth: 90,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {children || (
        <span style={{ color: T.ink700, fontSize: 13, fontFamily: T.font }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── LEGEND ──────────────────────────────────────────────────────────────────
const LAYER_META = [
  { key: "leave", label: "Leave" },
  { key: "holiday", label: "Holidays" },
  { key: "hearing", label: "Hearings" },
  { key: "timesheet", label: "Timesheets" },
  { key: "shift", label: "Shifts" },
  { key: "diary", label: "Notes" },
];

function Legend({ layers, onToggle }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {LAYER_META.map(({ key, label }) => {
        const c = EV[key];
        const on = layers[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 11px",
              borderRadius: 20,
              cursor: "pointer",
              border: `1px solid ${on ? c.border : T.border}`,
              background: on ? c.bg : "transparent",
              color: on ? c.text : T.ink500,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: T.font,
              transition: "all 0.15s",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: on ? c.text : T.ink300,
              }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── MONTH VIEW ──────────────────────────────────────────────────────────────
function MonthView({ year, month, events, layers, onEventClick, onDayClick }) {
  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const todayStr = toDateStr(new Date());

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsForDay(day) {
    if (!day) return [];
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((ev) => {
      if (!layers[ev.type]) return false;
      if (ev.date) return ev.date === ds;
      if (ev.startDate)
        return ds >= ev.startDate && ds <= (ev.endDate || ev.startDate);
      return false;
    });
  }

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 1,
          marginBottom: 2,
        }}
      >
        {DAYS_SHORT.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              padding: "8px 0",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontFamily: T.font,
              color: T.ink500,
              textTransform: "uppercase",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 1,
        }}
      >
        {cells.map((day, i) => {
          const ds = day
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : null;
          const isToday = ds === todayStr;
          const dow = ds ? new Date(ds + "T00:00:00").getDay() : null;
          const isWeekend = dow === 0 || dow === 6;
          const dayEvs = eventsForDay(day);
          const overflow = dayEvs.length - 3;

          return (
            <div
              key={i}
              onClick={() => ds && onDayClick && onDayClick(ds)}
              style={{
                minHeight: 90,
                borderRadius: 4,
                padding: "5px 4px",
                background: day
                  ? isToday
                    ? T.accentLight
                    : isWeekend
                      ? T.bg
                      : "#fff"
                  : T.surface,
                border: `1px solid ${isToday ? T.accentBd : T.border}`,
                cursor: day ? "pointer" : "default",
              }}
            >
              {day && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: isToday ? 700 : 400,
                        fontFamily: T.font,
                        color: isToday
                          ? T.accent
                          : isWeekend
                            ? T.ink300
                            : T.ink500,
                        background: isToday ? T.accentBd : "transparent",
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {day}
                    </span>
                  </div>
                  {dayEvs.slice(0, 3).map((ev, j) => (
                    <EventChip
                      key={j}
                      event={ev}
                      onClick={onEventClick}
                      compact
                    />
                  ))}
                  {overflow > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: T.ink500,
                        fontFamily: T.font,
                        paddingLeft: 3,
                      }}
                    >
                      +{overflow} more
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function WeekView({ weekStart, events, layers, onEventClick, onDayClick }) {
  const todayStr = toDateStr(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function eventsForDay(ds) {
    return events.filter((ev) => {
      if (!layers[ev.type]) return false;
      if (ev.date) return ev.date === ds;
      if (ev.startDate)
        return ds >= ev.startDate && ds <= (ev.endDate || ev.startDate);
      return false;
    });
  }

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 6,
        }}
      >
        {days.map((day, i) => {
          const ds = toDateStr(day);
          const isToday = ds === todayStr;
          const dow = day.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const dayEvs = eventsForDay(ds);

          return (
            <div
              key={i}
              onClick={() => onDayClick && onDayClick(ds)}
              style={{
                background: isToday
                  ? T.accentLight
                  : isWeekend
                    ? T.bg
                    : "#fff",
                border: `1px solid ${isToday ? T.accentBd : T.border}`,
                borderRadius: 8,
                padding: "10px 7px",
                minHeight: 220,
                cursor: "pointer",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontFamily: T.font,
                    color: isWeekend ? T.ink300 : T.ink500,
                  }}
                >
                  {DAYS_SHORT[dow]}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: T.font,
                    color: isToday ? T.accent : isWeekend ? T.ink300 : T.ink700,
                    lineHeight: 1.2,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {day.getDate()}
                </div>
                <div
                  style={{ fontSize: 10, fontFamily: T.font, color: T.ink300 }}
                >
                  {MONTHS_FULL[day.getMonth()].slice(0, 3)}
                </div>
              </div>
              {dayEvs.length === 0 ? (
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: T.font,
                    color: T.border,
                    textAlign: "center",
                    marginTop: 16,
                  }}
                >
                  —
                </div>
              ) : (
                dayEvs.map((ev, j) => (
                  <EventChip key={j} event={ev} onClick={onEventClick} />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TEAM VIEW ────────────────────────────────────────────────────────────────
function TeamView({ year, month, staff, events, layers, onEventClick }) {
  const totalDays = daysInMonth(year, month);
  const todayStr = toDateStr(new Date());
  const dayNums = Array.from({ length: totalDays }, (_, i) => i + 1);
  const CELL = 28;

  function cellData(staffId, day) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const leave = layers.leave
      ? events.filter(
          (e) =>
            e.type === "leave" &&
            e.staffId === staffId &&
            ds >= e.startDate &&
            ds <= (e.endDate || e.startDate),
        )
      : [];
    const hearing = layers.hearing
      ? events.find(
          (e) => e.type === "hearing" && e.staffId === staffId && e.date === ds,
        )
      : null;
    const holiday = layers.holiday
      ? events.find((e) => e.type === "holiday" && e.date === ds)
      : null;
    const shift = layers.shift
      ? events.find(
          (e) => e.type === "shift" && e.staffId === staffId && e.date === ds,
        )
      : null;
    return { leave, hearing, holiday, shift, ds };
  }

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ minWidth: 600 }}>
        {/* Day headers */}
        <div style={{ display: "flex", marginBottom: 2, paddingLeft: 168 }}>
          {dayNums.map((d) => {
            const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isToday = ds === todayStr;
            const dow = new Date(ds + "T00:00:00").getDay();
            const isWeekend = dow === 0 || dow === 6;
            return (
              <div
                key={d}
                style={{
                  width: CELL,
                  minWidth: CELL,
                  textAlign: "center",
                  fontSize: 9,
                  lineHeight: 1.4,
                  fontFamily: T.font,
                  color: isToday ? T.accent : isWeekend ? T.ink300 : T.ink500,
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                <div>{DAYS_SHORT[dow][0]}</div>
                <div style={{ fontWeight: 700 }}>{d}</div>
              </div>
            );
          })}
        </div>

        {staff.length === 0 && (
          <div
            style={{
              color: T.ink500,
              textAlign: "center",
              padding: 48,
              fontSize: 13,
              fontFamily: T.font,
            }}
          >
            No active staff found.
          </div>
        )}

        {staff.map((member) => (
          <div
            key={member.id}
            style={{ display: "flex", alignItems: "center", marginBottom: 2 }}
          >
            <div
              style={{
                width: 160,
                minWidth: 160,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: T.font,
                color: T.ink500,
                padding: "3px 8px 3px 0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {member.full_name || member.preferred_name || "—"}
            </div>
            {dayNums.map((d) => {
              const { leave, hearing, holiday, shift, ds } = cellData(
                member.id,
                d,
              );
              const isToday = ds === todayStr;
              const dow = new Date(ds + "T00:00:00").getDay();
              const isWeekend = dow === 0 || dow === 6;

              let bg = isWeekend ? T.bg : "#fff";
              let border = isToday ? T.accentBd : T.border;
              let symbol = null;
              let clickEv = null;

              if (holiday) {
                bg = T.warningLight;
                border = T.warningBd;
                symbol = (
                  <span style={{ color: T.warning, fontSize: 9 }}>★</span>
                );
              }
              if (shift) {
                bg = "#EDE9FE";
                border = "#A78BFA";
                symbol = (
                  <span style={{ color: "#5B21B6", fontSize: 9 }}>S</span>
                );
                clickEv = shift;
              }
              if (leave.length) {
                const lc = leave[0].leaveColor || T.accent;
                bg = lc + "25";
                border = lc + "66";
                symbol = <span style={{ color: lc, fontSize: 9 }}>✓</span>;
                clickEv = leave[0];
              }
              if (hearing) {
                bg = T.dangerLight;
                border = T.dangerBd;
                symbol = (
                  <span style={{ color: T.danger, fontSize: 9 }}>⚠</span>
                );
                clickEv = hearing;
              }

              return (
                <div
                  key={d}
                  onClick={() => clickEv && onEventClick(clickEv)}
                  style={{
                    width: CELL,
                    minWidth: CELL,
                    height: 24,
                    flexShrink: 0,
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: clickEv ? "pointer" : "default",
                    transition: "opacity 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (clickEv) e.currentTarget.style.opacity = "0.7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  {symbol}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Team key */}
      <div
        style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 16 }}
      >
        {[
          { sym: "✓", color: T.accent, bg: T.accentLight, label: "On Leave" },
          {
            sym: "★",
            color: T.warning,
            bg: T.warningLight,
            label: "Public Holiday",
          },
          { sym: "⚠", color: T.danger, bg: T.dangerLight, label: "Hearing" },
          { sym: "S", color: "#5B21B6", bg: "#EDE9FE", label: "Shift" },
        ].map(({ sym, color, bg, label }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                background: bg,
                border: `1px solid ${color}55`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color,
              }}
            >
              {sym}
            </div>
            <span style={{ fontSize: 12, fontFamily: T.font, color: T.ink500 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MINI MONTH (used inside year view cards) ─────────────────────────────────
function MiniMonth({ year, month, events, layers, todayStr }) {
  const pad = (n) => String(n).padStart(2, "0");
  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  function getDayEvents(day) {
    if (!day) return [];
    const ds = `${year}-${pad(month + 1)}-${pad(day)}`;
    return events.filter((ev) => {
      if (!layers[ev.type]) return false;
      if (ev.date) return ev.date === ds;
      if (ev.startDate)
        return ds >= ev.startDate && ds <= (ev.endDate || ev.startDate);
      return false;
    });
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 3 }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} style={{
            textAlign: "center", fontSize: 8, fontWeight: 700,
            fontFamily: T.font,
            color: i === 0 || i === 6 ? T.ink300 : T.ink500,
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} style={{ height: 18 }} />;
          const ds = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isToday = ds === todayStr;
          const dow = new Date(ds + "T00:00:00").getDay();
          const isWeekend = dow === 0 || dow === 6;
          const dayEvs = getDayEvents(day);
          const isHoliday = dayEvs.some((e) => e.type === "holiday");
          const eventTypes = [...new Set(dayEvs.map((e) => e.type))];
          return (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 9, fontFamily: T.font,
                fontWeight: isToday ? 700 : 400,
                width: 16, height: 16, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto", boxSizing: "border-box",
                background: isToday ? T.accent : isHoliday ? T.warningLight : "transparent",
                color: isToday ? "#fff" : isHoliday ? T.warning : isWeekend ? T.ink300 : T.ink500,
                border: isHoliday && !isToday ? `1px solid ${T.warningBd}` : "none",
              }}>
                {day}
              </div>
              {eventTypes.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 1.5, marginTop: 1 }}>
                  {eventTypes.slice(0, 3).map((type) => (
                    <div key={type} style={{
                      width: 3, height: 3, borderRadius: "50%",
                      background: EV[type]?.text || T.ink500, flexShrink: 0,
                    }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── YEAR VIEW ────────────────────────────────────────────────────────────────
function YearView({ year, events, layers, todayYear, todayMonth, onMonthSelect }) {
  const todayStr = toDateStr(new Date());
  const isCurrentYear = year === todayYear;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, flex: 1 }}>
      {MONTHS_FULL.map((monthName, m) => {
        const isNow = isCurrentYear && m === todayMonth;
        return (
          <div
            key={m}
            onClick={() => onMonthSelect(m)}
            style={{
              border: `1.5px solid ${isNow ? T.accentBd : T.border}`,
              borderRadius: 10,
              padding: "12px 14px 10px",
              background: isNow ? T.accentLight : "#fff",
              cursor: "pointer",
              boxShadow: isNow ? `0 0 0 2px ${T.accentBd}` : T.shadow,
              transition: "box-shadow 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 14px rgba(0,0,0,0.10)";
              e.currentTarget.style.borderColor = T.accentMid;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isNow ? `0 0 0 2px ${T.accentBd}` : T.shadow;
              e.currentTarget.style.borderColor = isNow ? T.accentBd : T.border;
            }}
          >
            <div style={{
              fontSize: 12, fontWeight: 700, fontFamily: T.font,
              color: isNow ? T.accent : T.ink700, marginBottom: 8,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              {monthName}
              {isNow && (
                <span style={{
                  fontSize: 8, fontWeight: 700, color: T.accent,
                  background: T.accentBd, padding: "1px 5px", borderRadius: 8,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  Now
                </span>
              )}
            </div>
            <MiniMonth
              year={year}
              month={m}
              events={events}
              layers={layers}
              todayStr={todayStr}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── DIARY CONFIG ────────────────────────────────────────────────────────────
const DIARY_TYPES = [
  { value: "note",         label: "Note",         emoji: "📝" },
  { value: "meeting",      label: "Meeting",       emoji: "👥" },
  { value: "reminder",     label: "Reminder",      emoji: "⏰" },
  { value: "announcement", label: "Announcement",  emoji: "📢" },
  { value: "task",         label: "Task",          emoji: "✅" },
];
const DIARY_COLORS = [
  "#0369A1", "#166534", "#92400E", "#991B1B", "#5B21B6", "#374151",
];

// ─── DAY PANEL ────────────────────────────────────────────────────────────────
function DayPanel({ date, events, onClose, tenantId, onSaved }) {
  const [form, setForm] = useState({
    title: "", body: "", entry_type: "note", color: "#0369A1",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  if (!date) return null;

  const dayEvs = events.filter((ev) => {
    if (ev.date) return ev.date === date;
    if (ev.startDate)
      return date >= ev.startDate && date <= (ev.endDate || ev.startDate);
    return false;
  });
  const diaryEvs = dayEvs.filter((e) => e.type === "diary");
  const otherEvs  = dayEvs.filter((e) => e.type !== "diary");

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await supabase.from("hr_diary_entries").insert({
        tenant_id: tenantId,
        entry_date: date,
        title: form.title.trim(),
        body: form.body.trim() || null,
        entry_type: form.entry_type,
        color: form.color,
      });
      setForm({ title: "", body: "", entry_type: "note", color: "#0369A1" });
      onSaved();
    } catch (e) {
      console.error("[DayPanel] save error:", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await supabase.from("hr_diary_entries").delete().eq("id", id);
      onSaved();
    } catch (e) {
      console.error("[DayPanel] delete error:", e);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,0.18)",
        }}
      />
      {/* Slide-in panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(380px, 90vw)",
          background: "#fff",
          borderLeft: `1px solid ${T.border}`,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
          zIndex: 901,
          display: "flex", flexDirection: "column",
          fontFamily: T.font,
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.ink500,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3,
              fontFamily: T.font,
            }}>
              Calendar
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink900, fontFamily: T.font }}>
              {displayDate}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: T.ink500, lineHeight: 1, padding: "2px 6px",
          }}>×</button>
        </div>

        <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Other events (leave, holidays, hearings) */}
          {otherEvs.length > 0 && (
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: T.ink500,
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginBottom: 8, fontFamily: T.font,
              }}>
                Events
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {otherEvs.map((ev, i) => {
                  const c = EV[ev.type] || EV.leave;
                  return (
                    <div key={i} style={{
                      padding: "8px 12px", borderRadius: 8,
                      background: ev.leaveColor ? ev.leaveColor + "20" : c.bg,
                      border: `1px solid ${ev.leaveColor ? ev.leaveColor + "55" : c.border}`,
                      fontSize: 12, fontFamily: T.font,
                      color: ev.leaveColor || c.text, fontWeight: 600,
                    }}>
                      {ev.title}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Existing diary entries */}
          {diaryEvs.length > 0 && (
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: T.ink500,
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginBottom: 8, fontFamily: T.font,
              }}>
                Notes
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {diaryEvs.map((ev) => {
                  const typeInfo = DIARY_TYPES.find((t) => t.value === ev.entryType) || DIARY_TYPES[0];
                  return (
                    <div key={ev.id} style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: ev.color + "15",
                      border: `1px solid ${ev.color}44`,
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginBottom: ev.body ? 4 : 0,
                      }}>
                        <span style={{ fontSize: 13 }}>{typeInfo.emoji}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: ev.color,
                          fontFamily: T.font, flex: 1,
                        }}>
                          {ev.title}
                        </span>
                        <button
                          onClick={() => handleDelete(ev.id)}
                          disabled={deleting === ev.id}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: T.ink300, fontSize: 14, padding: "0 2px", lineHeight: 1,
                          }}
                        >
                          {deleting === ev.id ? "…" : "✕"}
                        </button>
                      </div>
                      {ev.body && (
                        <div style={{
                          fontSize: 12, color: T.ink500, fontFamily: T.font,
                          lineHeight: 1.5, paddingLeft: 20,
                        }}>
                          {ev.body}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No events empty state */}
          {dayEvs.length === 0 && (
            <div style={{
              textAlign: "center", padding: "20px 0",
              fontSize: 12, color: T.ink300, fontFamily: T.font,
            }}>
              No events on this day
            </div>
          )}

          {/* Add note form */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.ink500,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 12, fontFamily: T.font,
            }}>
              Add Note
            </div>

            {/* Entry type pills */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              {DIARY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((p) => ({ ...p, entry_type: t.value }))}
                  style={{
                    padding: "4px 10px", borderRadius: 20, cursor: "pointer",
                    fontSize: 11, fontFamily: T.font, fontWeight: 600,
                    border: `1px solid ${form.entry_type === t.value ? form.color : T.border}`,
                    background: form.entry_type === t.value ? form.color + "18" : "transparent",
                    color: form.entry_type === t.value ? form.color : T.ink500,
                    transition: "all 0.12s",
                  }}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* Colour swatches */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {DIARY_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  style={{
                    width: 22, height: 22, borderRadius: "50%", background: c,
                    cursor: "pointer", boxSizing: "border-box",
                    border: form.color === c ? `2.5px solid ${T.ink900}` : "2.5px solid transparent",
                    transition: "border 0.1s",
                  }}
                />
              ))}
            </div>

            {/* Title */}
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSave()}
              placeholder="Title (required)…"
              style={{
                width: "100%", padding: "8px 12px", marginBottom: 8,
                border: `1px solid ${T.border}`, borderRadius: 8,
                fontSize: 13, fontFamily: T.font, color: T.ink900,
                outline: "none", boxSizing: "border-box",
              }}
            />

            {/* Body */}
            <textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="Details… (optional)"
              rows={3}
              style={{
                width: "100%", padding: "8px 12px", marginBottom: 12,
                border: `1px solid ${T.border}`, borderRadius: 8,
                fontSize: 13, fontFamily: T.font, color: T.ink900,
                outline: "none", resize: "vertical", boxSizing: "border-box",
              }}
            />

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              style={{
                width: "100%", padding: "10px", borderRadius: 8, border: "none",
                background: form.title.trim() ? form.color : T.border,
                color: form.title.trim() ? "#fff" : T.ink500,
                fontWeight: 700, fontSize: 13, fontFamily: T.font,
                cursor: form.title.trim() ? "pointer" : "not-allowed",
                opacity: saving ? 0.7 : 1, transition: "background 0.15s",
              }}
            >
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function HRCalendar({ tenantId }) {
  const today = new Date();
  const [view, setView] = useState("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [events, setEvents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [layers, setLayers] = useState({
    leave: true,
    holiday: true,
    hearing: true,
    timesheet: true,
    shift: true,
    diary: true,
  });

  const toggleLayer = (key) => setLayers((p) => ({ ...p, [key]: !p[key] }));
  const [dayPanel, setDayPanel] = useState(null); // "YYYY-MM-DD" or null

  const rangeStart = view === "year"
    ? `${year}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const rangeEnd = view === "year"
    ? `${year}-12-31`
    : `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Active staff
      const { data: staffData, error: sErr } = await supabase
        .from("staff_profiles")
        .select("id, full_name, preferred_name, user_id")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("full_name");
      if (sErr) throw sErr;
      setStaff(staffData || []);
      const staffMap = {};
      (staffData || []).forEach((s) => {
        staffMap[s.id] = s.full_name || s.preferred_name || "—";
      });

      // 2. Leave requests
      const { data: leaveData, error: lErr } = await supabase
        .from("leave_requests")
        .select(
          "id, staff_profile_id, start_date, end_date, days_requested, reason, status, leave_types(name, color)",
        )
        .eq("tenant_id", tenantId)
        .lte("start_date", rangeEnd)
        .gte("end_date", rangeStart)
        .in("status", ["pending", "admin_approved", "hr_approved"]);
      if (lErr) throw lErr;

      const leaveEvents = (leaveData || []).map((lr) => ({
        id: lr.id,
        type: "leave",
        title: `${staffMap[lr.staff_profile_id] || "Staff"} — ${lr.leave_types?.name || "Leave"}`,
        staffId: lr.staff_profile_id,
        staffName: staffMap[lr.staff_profile_id] || "—",
        startDate: lr.start_date,
        endDate: lr.end_date,
        leaveType: lr.leave_types?.name || "—",
        leaveColor: lr.leave_types?.color || null,
        days: lr.days_requested,
        reason: lr.reason,
        status: lr.status,
      }));

      // 3. Public holidays (CONFIRMED: holiday_date column)
      const { data: phData, error: phErr } = await supabase
        .from("public_holidays")
        .select("id, holiday_date, name, holiday_type")
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq("is_active", true)
        .gte("holiday_date", rangeStart)
        .lte("holiday_date", rangeEnd)
        .order("holiday_date");
      if (phErr) throw phErr;

      const holidayEvents = (phData || []).map((ph) => ({
        id: ph.id,
        type: "holiday",
        title: ph.name,
        date: ph.holiday_date,
        startDate: ph.holiday_date,
        endDate: ph.holiday_date,
        holidayType: ph.holiday_type,
      }));

      // 4. Disciplinary hearings (CONFIRMED: hearing_date is TIMESTAMPTZ)
      const dayAfterEnd = toDateStr(
        addDays(new Date(rangeEnd + "T00:00:00"), 1),
      );
      const { data: drData, error: drErr } = await supabase
        .from("disciplinary_records")
        .select(
          "id, staff_profile_id, hearing_date, subject, hearing_location, status",
        )
        .eq("tenant_id", tenantId)
        .not("hearing_date", "is", null)
        .gte("hearing_date", rangeStart)
        .lt("hearing_date", dayAfterEnd);
      if (drErr) throw drErr;

      const hearingEvents = (drData || []).map((dr) => {
        const dateOnly = dr.hearing_date ? dr.hearing_date.split("T")[0] : null;
        return {
          id: dr.id,
          type: "hearing",
          title: `Hearing: ${staffMap[dr.staff_profile_id] || "Staff"}`,
          staffId: dr.staff_profile_id,
          staffName: staffMap[dr.staff_profile_id] || "—",
          date: dateOnly,
          startDate: dateOnly,
          endDate: dateOnly,
          subject: dr.subject,
          location: dr.hearing_location,
          status: dr.status,
        };
      });

      // 5. Timesheets
      const { data: tsData, error: tsErr } = await supabase
        .from("timesheets")
        .select(
          "id, staff_profile_id, period_start, period_end, status, total_hours, regular_hours, overtime_hours, late_count, absent_count",
        )
        .eq("tenant_id", tenantId)
        .lte("period_start", rangeEnd)
        .gte("period_end", rangeStart)
        .in("status", ["staff_submitted", "admin_approved", "hr_approved"]);
      if (tsErr) throw tsErr;

      const timesheetEvents = (tsData || []).map((ts) => ({
        id: ts.id,
        type: "timesheet",
        title: `TS: ${staffMap[ts.staff_profile_id] || "Staff"}`,
        staffId: ts.staff_profile_id,
        staffName: staffMap[ts.staff_profile_id] || "—",
        startDate: ts.period_start,
        endDate: ts.period_end,
        period: `${formatDisplay(ts.period_start)} – ${formatDisplay(ts.period_end)}`,
        status: ts.status,
        hours: ts.total_hours,
        regular: ts.regular_hours,
        overtime: ts.overtime_hours,
        lateCount: ts.late_count,
        absentCount: ts.absent_count,
      }));

      // 6. Shift schedules (CONFIRMED: works_[day] booleans, effective_from/to)
      const { data: shiftData, error: shErr } = await supabase
        .from("shift_schedules")
        .select(
          [
            "id",
            "staff_profile_id",
            "effective_from",
            "effective_to",
            "works_monday",
            "works_tuesday",
            "works_wednesday",
            "works_thursday",
            "works_friday",
            "works_saturday",
            "works_sunday",
            "shift_start",
            "shift_end",
            "location",
            "is_active",
          ].join(", "),
        )
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .lte("effective_from", rangeEnd)
        .or(`effective_to.is.null,effective_to.gte.${rangeStart}`);
      if (shErr) throw shErr;

      const shiftEvents = [];
      (shiftData || []).forEach((sh) => {
        const shiftTime =
          sh.shift_start && sh.shift_end
            ? `${formatTime(sh.shift_start)} – ${formatTime(sh.shift_end)}`
            : null;
        for (let d = 1; d <= daysInMonth(year, month); d++) {
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (shiftCoversDate(sh, ds)) {
            shiftEvents.push({
              id: `${sh.id}-${ds}`,
              type: "shift",
              title: `Shift: ${staffMap[sh.staff_profile_id] || "Staff"}${shiftTime ? ` (${shiftTime})` : ""}`,
              staffId: sh.staff_profile_id,
              staffName: staffMap[sh.staff_profile_id] || "—",
              date: ds,
              startDate: ds,
              endDate: ds,
              shiftTime,
              location: sh.location,
            });
          }
        }
      });

      // 7. Diary entries (hr_diary_entries table)
      const { data: diaryData } = await supabase
        .from("hr_diary_entries")
        .select("id, entry_date, title, body, entry_type, color")
        .eq("tenant_id", tenantId)
        .gte("entry_date", rangeStart)
        .lte("entry_date", rangeEnd)
        .order("entry_date");

      const diaryEvents = (diaryData || []).map((d) => ({
        id: d.id,
        type: "diary",
        title: d.title,
        date: d.entry_date,
        startDate: d.entry_date,
        endDate: d.entry_date,
        body: d.body,
        entryType: d.entry_type,
        color: d.color,
        leaveColor: d.color, // reuses leaveColor so EventChip renders custom colour
      }));

      setEvents([
        ...leaveEvents,
        ...holidayEvents,
        ...hearingEvents,
        ...timesheetEvents,
        ...shiftEvents,
        ...diaryEvents,
      ]);
    } catch (err) {
      console.error("HRCalendar fetch error:", err);
      setError(err.message || "Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, rangeStart, rangeEnd, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (view === "week") {
      setYear(weekStart.getFullYear());
      setMonth(weekStart.getMonth());
    }
  }, [weekStart, view]);

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }
  function prevWeek() {
    setWeekStart((d) => addDays(d, -7));
  }
  function nextWeek() {
    setWeekStart((d) => addDays(d, 7));
  }
  function prevYear() { setYear((y) => y - 1); }
  function nextYear() { setYear((y) => y + 1); }

  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setWeekStart(startOfWeek(t));
  }

  const counts = { leave: 0, holiday: 0, hearing: 0, timesheet: 0, shift: 0 };
  const seen = new Set();
  events.forEach((e) => {
    const uid = e.type === "shift" ? e.id.split("-")[0] : e.id;
    if (!seen.has(`${e.type}-${uid}`)) {
      seen.add(`${e.type}-${uid}`);
      counts[e.type]++;
    }
  });

  const navBtnStyle = {
    background: "none",
    border: `1px solid ${T.border}`,
    color: T.ink500,
    borderRadius: 6,
    padding: "5px 11px",
    cursor: "pointer",
    fontSize: 17,
    lineHeight: 1,
    fontFamily: T.font,
    transition: "all 0.15s",
  };

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: 24,
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        fontFamily: T.font,
        boxShadow: T.shadow.sm,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              color: T.ink700,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: T.font,
              margin: 0,
            }}
          >
            HR Calendar
          </div>
          <div
            style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}
          >
            {[
              { key: "leave", label: "Leave", color: T.accent },
              { key: "holiday", label: "Holidays", color: T.warning },
              { key: "hearing", label: "Hearings", color: T.danger },
              { key: "shift", label: "Shifts", color: "#5B21B6" },
              { key: "diary", label: "Notes", color: "#0369A1" },
            ].map(({ key, label, color }) => (
              <span
                key={key}
                style={{ fontSize: 12, fontFamily: T.font, color: T.ink500 }}
              >
                <span style={{ color, fontWeight: 700 }}>{counts[key]}</span>{" "}
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* View switcher */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: T.bg,
            borderRadius: 8,
            padding: 3,
          }}
        >
          {["month", "week", "team", "year"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: view === v ? T.accent : "transparent",
                color: view === v ? "#fff" : T.ink500,
                fontWeight: 700,
                fontSize: 11,
                fontFamily: T.font,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                transition: "all 0.15s",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Nav + Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={
              view === "week" ? prevWeek
              : view === "year" ? prevYear
              : prevMonth
            }
            style={navBtnStyle}
          >
            {view === "year" ? "‹‹" : "‹"}
          </button>
          <span
            style={{
              color: T.ink700,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: T.font,
              minWidth: view === "year" ? 80 : 210,
              textAlign: "center",
            }}
          >
            {view === "week"
              ? `${MONTHS_FULL[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()} – ${MONTHS_FULL[addDays(weekStart, 6).getMonth()].slice(0, 3)} ${addDays(weekStart, 6).getDate()}, ${addDays(weekStart, 6).getFullYear()}`
              : view === "year"
                ? `${year}`
                : `${MONTHS_FULL[month]} ${year}`}
          </span>
          <button
            onClick={
              view === "week" ? nextWeek
              : view === "year" ? nextYear
              : nextMonth
            }
            style={navBtnStyle}
          >
            {view === "year" ? "››" : "›"}
          </button>
          <button
            onClick={goToday}
            style={{
              ...navBtnStyle,
              color: T.accent,
              borderColor: T.accentBd,
              fontSize: 11,
              padding: "6px 12px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Today
          </button>
        </div>
        <Legend layers={layers} onToggle={toggleLayer} />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: T.dangerLight,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 8,
            padding: "10px 14px",
            color: T.danger,
            fontSize: 13,
            fontFamily: T.font,
          }}
        >
          ⚠ {error} —{" "}
          <button
            onClick={fetchData}
            style={{
              background: "none",
              border: "none",
              color: T.danger,
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 13,
              fontFamily: T.font,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Views */}
      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
            color: T.ink300,
          }}
        >
          <div style={{ fontSize: 36 }}>📅</div>
          <div style={{ fontSize: 13, fontFamily: T.font }}>
            Loading calendar…
          </div>
        </div>
      ) : (
        <>
          {view === "month" && (
            <MonthView
              year={year}
              month={month}
              events={events}
              layers={layers}
              onEventClick={setSelected}
              onDayClick={setDayPanel}
            />
          )}
          {view === "week" && (
            <WeekView
              weekStart={weekStart}
              events={events}
              layers={layers}
              onEventClick={setSelected}
              onDayClick={setDayPanel}
            />
          )}
          {view === "year" && (
            <YearView
              year={year}
              events={events}
              layers={layers}
              todayYear={today.getFullYear()}
              todayMonth={today.getMonth()}
              onMonthSelect={(m) => {
                setMonth(m);
                setView("month");
              }}
            />
          )}
          {view === "team" && (
            <TeamView
              year={year}
              month={month}
              staff={staff}
              events={events}
              layers={layers}
              onEventClick={setSelected}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal event={selected} onClose={() => setSelected(null)} />
      )}
      {dayPanel && (
        <DayPanel
          date={dayPanel}
          events={events}
          onClose={() => setDayPanel(null)}
          tenantId={tenantId}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
