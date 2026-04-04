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

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
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
  leave: { bg: T.accentLit, border: T.accentBd, text: T.accent },
  holiday: { bg: T.warningBg, border: T.warningBd, text: T.warning },
  hearing: { bg: T.dangerBg, border: T.dangerBd, text: T.danger },
  timesheet: { bg: T.infoBg, border: T.infoBd, text: T.info },
  shift: { bg: "#EDE9FE", border: "#A78BFA", text: "#5B21B6" },
};

const STATUS_COLOR = {
  pending: T.warning,
  admin_approved: T.success,
  hr_approved: T.accentMid,
  rejected: T.danger,
  draft: T.ink400,
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
          boxShadow: T.shadow,
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
              color: T.ink400,
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
                  background: (STATUS_COLOR[event.status] || T.ink400) + "20",
                  color: STATUS_COLOR[event.status] || T.ink400,
                  border: `1px solid ${STATUS_COLOR[event.status] || T.ink400}44`,
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
          color: T.ink400,
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
              border: `1px solid ${on ? c.border : T.ink150}`,
              background: on ? c.bg : "transparent",
              color: on ? c.text : T.ink400,
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
function MonthView({ year, month, events, layers, onEventClick }) {
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
              color: T.ink400,
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
              style={{
                minHeight: 90,
                borderRadius: 4,
                padding: "5px 4px",
                background: day
                  ? isToday
                    ? T.accentLit
                    : isWeekend
                      ? T.ink075
                      : "#fff"
                  : T.ink050,
                border: `1px solid ${isToday ? T.accentBd : T.ink150}`,
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
                        color: T.ink400,
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
function WeekView({ weekStart, events, layers, onEventClick }) {
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
              style={{
                background: isToday
                  ? T.accentLit
                  : isWeekend
                    ? T.ink075
                    : "#fff",
                border: `1px solid ${isToday ? T.accentBd : T.ink150}`,
                borderRadius: 8,
                padding: "10px 7px",
                minHeight: 220,
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
                    color: isWeekend ? T.ink300 : T.ink400,
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
                    color: T.ink150,
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
                  color: isToday ? T.accent : isWeekend ? T.ink300 : T.ink400,
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
              color: T.ink400,
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

              let bg = isWeekend ? T.ink075 : "#fff";
              let border = isToday ? T.accentBd : T.ink150;
              let symbol = null;
              let clickEv = null;

              if (holiday) {
                bg = T.warningBg;
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
                bg = T.dangerBg;
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
          { sym: "✓", color: T.accent, bg: T.accentLit, label: "On Leave" },
          {
            sym: "★",
            color: T.warning,
            bg: T.warningBg,
            label: "Public Holiday",
          },
          { sym: "⚠", color: T.danger, bg: T.dangerBg, label: "Hearing" },
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

// ─── YEAR VIEW ────────────────────────────────────────────────────────────────
function YearView({ year, events, layers, todayYear, todayMonth, onMonthSelect }) {
  function countsForMonth(m) {
    const pad = (n) => String(n).padStart(2, "0");
    const monthStart = `${year}-${pad(m + 1)}-01`;
    const monthEnd = `${year}-${pad(m + 1)}-${String(daysInMonth(year, m)).padStart(2, "0")}`;
    const counts = { leave: 0, holiday: 0, hearing: 0, timesheet: 0, shift: 0 };
    const seen = new Set();
    events.forEach((ev) => {
      if (!layers[ev.type]) return;
      const start = ev.startDate || ev.date || "";
      const end = ev.endDate || ev.date || "";
      if (!start || start > monthEnd || end < monthStart) return;
      const uid = ev.type === "shift"
        ? ev.id.split("-")[0] + "-m" + m
        : ev.id + "-m" + m;
      if (seen.has(uid)) return;
      seen.add(uid);
      counts[ev.type]++;
    });
    return counts;
  }

  const isCurrentYear = year === todayYear;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1 }}>
      {MONTHS_FULL.map((monthName, m) => {
        const counts = countsForMonth(m);
        const isNow = isCurrentYear && m === todayMonth;
        const hasEvents = Object.values(counts).some((v) => v > 0);
        return (
          <div
            key={m}
            onClick={() => onMonthSelect(m)}
            style={{
              border: `1.5px solid ${isNow ? T.accentBd : T.ink150}`,
              borderRadius: 10,
              padding: "14px 16px",
              background: isNow ? T.accentLit : "#fff",
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
              e.currentTarget.style.borderColor = isNow ? T.accentBd : T.ink150;
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700, fontFamily: T.font,
              color: isNow ? T.accent : T.ink700, marginBottom: 10,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              {monthName}
              {isNow && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: T.accent,
                  background: T.accentBd, padding: "1px 6px", borderRadius: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  Now
                </span>
              )}
            </div>
            {!hasEvents ? (
              <div style={{ fontSize: 11, fontFamily: T.font, color: T.ink300, fontStyle: "italic" }}>
                No events
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { key: "holiday", label: "Holiday", c: EV.holiday },
                  { key: "leave",   label: "Leave",   c: EV.leave   },
                  { key: "hearing", label: "Hearing", c: EV.hearing  },
                  { key: "shift",   label: "Shift",   c: EV.shift    },
                ].filter(({ key }) => layers[key] && counts[key] > 0)
                  .map(({ key, label, c }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: c.text, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, fontFamily: T.font, color: T.ink500 }}>
                        {counts[key]} {label}{counts[key] !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
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
  });

  const toggleLayer = (key) => setLayers((p) => ({ ...p, [key]: !p[key] }));

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

      setEvents([
        ...leaveEvents,
        ...holidayEvents,
        ...hearingEvents,
        ...timesheetEvents,
        ...shiftEvents,
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
    border: `1px solid ${T.ink150}`,
    color: T.ink400,
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
        border: `1px solid ${T.ink150}`,
        borderRadius: 10,
        padding: 24,
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        fontFamily: T.font,
        boxShadow: T.shadow,
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
            ].map(({ key, label, color }) => (
              <span
                key={key}
                style={{ fontSize: 12, fontFamily: T.font, color: T.ink400 }}
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
            background: T.ink075,
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
                color: view === v ? "#fff" : T.ink400,
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
            background: T.dangerBg,
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
            />
          )}
          {view === "week" && (
            <WeekView
              weekStart={weekStart}
              events={events}
              layers={layers}
              onEventClick={setSelected}
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
    </div>
  );
}
