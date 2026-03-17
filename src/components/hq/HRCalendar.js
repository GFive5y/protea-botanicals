// HRCalendar.js v1.1 — SCHEMA VERIFIED
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

// Determine if a shift_schedule covers a given date string (YYYY-MM-DD)
function shiftCoversDate(shift, dateStr) {
  if (!shift.is_active) return false;
  if (dateStr < shift.effective_from) return false;
  if (shift.effective_to && dateStr > shift.effective_to) return false;
  const dow = new Date(dateStr + "T00:00:00").getDay(); // 0=Sun
  const key = `works_${DAY_KEYS[dow]}`;
  return !!shift[key];
}

// ─── COLOURS ─────────────────────────────────────────────────────────────────

const C = {
  leave: { bg: "#14532d", text: "#bbf7d0", border: "#22c55e" },
  holiday: { bg: "#78350f", text: "#fde68a", border: "#f59e0b" },
  hearing: { bg: "#7f1d1d", text: "#fecaca", border: "#ef4444" },
  timesheet: { bg: "#1e3a5f", text: "#bfdbfe", border: "#3b82f6" },
  shift: { bg: "#1e1b4b", text: "#e0e7ff", border: "#818cf8" },
};

const STATUS_COLOR = {
  pending: "#f59e0b",
  admin_approved: "#22c55e",
  hr_approved: "#10b981",
  rejected: "#ef4444",
  draft: "#64748b",
  staff_submitted: "#f59e0b",
  locked: "#94a3b8",
};

// ─── EVENT CHIP ───────────────────────────────────────────────────────────────

function EventChip({ event, onClick, compact = false }) {
  const c = C[event.type];
  const bg = event.leaveColor ? event.leaveColor + "44" : c.bg;
  const border = event.leaveColor ? event.leaveColor + "99" : c.border;
  const color = event.leaveColor ? "#f1f5f9" : c.text;

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
        cursor: "pointer",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        marginBottom: 2,
        lineHeight: 1.4,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {event.title}
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function DetailModal({ event, onClose }) {
  if (!event) return null;
  const c = C[event.type];
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
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a2e",
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          padding: 28,
          minWidth: 340,
          maxWidth: 500,
          boxShadow: `0 0 40px ${c.border}33`,
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
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: c.border,
              }}
            >
              {typeLabel}
            </div>
            <h3
              style={{
                color: "#f1f5f9",
                fontSize: 17,
                fontWeight: 700,
                margin: "4px 0 0",
              }}
            >
              {event.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 22,
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
                  background: (STATUS_COLOR[event.status] || "#64748b") + "22",
                  color: STATUS_COLOR[event.status] || "#94a3b8",
                  border: `1px solid ${STATUS_COLOR[event.status] || "#64748b"}44`,
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {event.status.replace(/_/g, " ").toUpperCase()}
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
          color: "#475569",
          fontSize: 12,
          fontWeight: 600,
          minWidth: 90,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {children || (
        <span style={{ color: "#cbd5e1", fontSize: 13 }}>{value}</span>
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
        const c = C[key];
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
              border: `1px solid ${on ? c.border : "#334155"}`,
              background: on ? c.bg : "transparent",
              color: on ? c.border : "#475569",
              fontSize: 11,
              fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: on ? c.border : "#334155",
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
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: "#475569",
              textTransform: "uppercase",
            }}
          >
            {d}
          </div>
        ))}
      </div>
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
                minHeight: 92,
                borderRadius: 5,
                padding: "5px 4px",
                background: day
                  ? isToday
                    ? "#1e293b"
                    : isWeekend
                      ? "#0c111d"
                      : "#0f172a"
                  : "#07090f",
                border: `1px solid ${isToday ? "#22c55e44" : "#1a2235"}`,
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
                        fontWeight: isToday ? 800 : 500,
                        color: isToday
                          ? "#22c55e"
                          : isWeekend
                            ? "#374151"
                            : "#64748b",
                        background: isToday ? "#22c55e1a" : "transparent",
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
                      style={{ fontSize: 10, color: "#475569", paddingLeft: 3 }}
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
          gap: 4,
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
                  ? "#1e293b"
                  : isWeekend
                    ? "#0c111d"
                    : "#0f172a",
                border: `1px solid ${isToday ? "#22c55e44" : "#1a2235"}`,
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
                    letterSpacing: 1,
                    color: isWeekend ? "#374151" : "#475569",
                  }}
                >
                  {DAYS_SHORT[dow]}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: isToday
                      ? "#22c55e"
                      : isWeekend
                        ? "#374151"
                        : "#e2e8f0",
                    lineHeight: 1.2,
                  }}
                >
                  {day.getDate()}
                </div>
                <div style={{ fontSize: 10, color: "#334155" }}>
                  {MONTHS_FULL[day.getMonth()].slice(0, 3)}
                </div>
              </div>
              {dayEvs.length === 0 ? (
                <div
                  style={{
                    fontSize: 11,
                    color: "#1e293b",
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
                  color: isToday
                    ? "#22c55e"
                    : isWeekend
                      ? "#2d3748"
                      : "#475569",
                  fontWeight: isToday ? 800 : 500,
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
              color: "#334155",
              textAlign: "center",
              padding: 48,
              fontSize: 13,
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
                color: "#94a3b8",
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

              let bg = isWeekend ? "#090d17" : "#0f172a";
              let border = isToday ? "#22c55e22" : "#1a2235";
              let symbol = null;
              let clickEv = null;

              if (holiday) {
                bg = C.holiday.bg + "55";
                border = C.holiday.border + "44";
                symbol = (
                  <span style={{ color: C.holiday.border, fontSize: 9 }}>
                    ★
                  </span>
                );
              }
              if (shift) {
                bg = C.shift.bg + "66";
                border = C.shift.border + "55";
                symbol = (
                  <span style={{ color: C.shift.border, fontSize: 9 }}>S</span>
                );
                clickEv = shift;
              }
              if (leave.length) {
                const lc = leave[0].leaveColor || C.leave.border;
                bg = lc + "44";
                border = lc + "88";
                symbol = <span style={{ color: lc, fontSize: 9 }}>✓</span>;
                clickEv = leave[0];
              }
              if (hearing) {
                bg = C.hearing.bg + "77";
                border = C.hearing.border + "88";
                symbol = (
                  <span style={{ color: C.hearing.border, fontSize: 9 }}>
                    ⚠
                  </span>
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
          { sym: "✓", color: C.leave.border, label: "On Leave" },
          { sym: "★", color: C.holiday.border, label: "Public Holiday" },
          { sym: "⚠", color: C.hearing.border, label: "Hearing" },
          { sym: "S", color: C.shift.border, label: "Shift" },
        ].map(({ sym, color, label }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                background: color + "22",
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
            <span style={{ fontSize: 12, color: "#475569" }}>{label}</span>
          </div>
        ))}
      </div>
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

  const rangeStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const rangeEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Active staff ───────────────────────────────────────────────────────
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

      // 2. Leave requests ─────────────────────────────────────────────────────
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
        reason: lr.reason, // confirmed column name
        status: lr.status,
      }));

      // 3. Public holidays ────────────────────────────────────────────────────
      // CONFIRMED: column is holiday_date (not date)
      const { data: phData, error: phErr } = await supabase
        .from("public_holidays")
        .select("id, holiday_date, name, holiday_type")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .gte("holiday_date", rangeStart)
        .lte("holiday_date", rangeEnd)
        .order("holiday_date");
      if (phErr) throw phErr;

      const holidayEvents = (phData || []).map((ph) => ({
        id: ph.id,
        type: "holiday",
        title: ph.name,
        date: ph.holiday_date, // confirmed: holiday_date
        startDate: ph.holiday_date,
        endDate: ph.holiday_date,
        holidayType: ph.holiday_type,
      }));

      // 4. Disciplinary hearings ──────────────────────────────────────────────
      // CONFIRMED: hearing_date is TIMESTAMPTZ — extract date portion client-side
      // Range filter: gte rangeStart, lt day-after-rangeEnd (covers full last day)
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

      // 5. Timesheets ─────────────────────────────────────────────────────────
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

      // 6. Shift schedules ────────────────────────────────────────────────────
      // CONFIRMED: effective_from/to date range + works_[day] booleans
      // Fetch schedules overlapping this month, then expand per-day client-side
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

      // Expand each schedule into individual confirmed day events
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

  // Sync week nav → month/year
  useEffect(() => {
    if (view === "week") {
      setYear(weekStart.getFullYear());
      setMonth(weekStart.getMonth());
    }
  }, [weekStart, view]);

  // Navigation
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
  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setWeekStart(startOfWeek(t));
  }

  // Summary counts (deduplicated — shifts expand to many events per schedule)
  const counts = { leave: 0, holiday: 0, hearing: 0, timesheet: 0, shift: 0 };
  const seen = new Set();
  events.forEach((e) => {
    const uid = e.type === "shift" ? e.id.split("-")[0] : e.id;
    if (!seen.has(`${e.type}-${uid}`)) {
      seen.add(`${e.type}-${uid}`);
      counts[e.type]++;
    }
  });

  return (
    <div
      style={{
        background: "#0b0f1a",
        borderRadius: 12,
        padding: 24,
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        fontFamily: "'Inter', system-ui, sans-serif",
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
          <h2
            style={{
              color: "#f1f5f9",
              fontSize: 21,
              fontWeight: 800,
              margin: 0,
            }}
          >
            HR Calendar
          </h2>
          <div
            style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}
          >
            {[
              { key: "leave", label: "Leave", color: C.leave.border },
              { key: "holiday", label: "Holidays", color: C.holiday.border },
              { key: "hearing", label: "Hearings", color: C.hearing.border },
              { key: "shift", label: "Shifts", color: C.shift.border },
            ].map(({ key, label, color }) => (
              <span key={key} style={{ fontSize: 12, color: "#475569" }}>
                <span style={{ color, fontWeight: 700 }}>{counts[key]}</span>{" "}
                {label}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 3,
            background: "#1e293b",
            borderRadius: 8,
            padding: 4,
          }}
        >
          {["month", "week", "team"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: view === v ? "#22c55e" : "transparent",
                color: view === v ? "#000" : "#475569",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "capitalize",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={view === "week" ? prevWeek : prevMonth}
            style={NAV_BTN}
          >
            ‹
          </button>
          <span
            style={{
              color: "#e2e8f0",
              fontSize: 16,
              fontWeight: 700,
              minWidth: 210,
              textAlign: "center",
            }}
          >
            {view === "week"
              ? `${MONTHS_FULL[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()} – ${MONTHS_FULL[addDays(weekStart, 6).getMonth()].slice(0, 3)} ${addDays(weekStart, 6).getDate()}, ${addDays(weekStart, 6).getFullYear()}`
              : `${MONTHS_FULL[month]} ${year}`}
          </span>
          <button
            onClick={view === "week" ? nextWeek : nextMonth}
            style={NAV_BTN}
          >
            ›
          </button>
          <button
            onClick={goToday}
            style={{
              ...NAV_BTN,
              color: "#22c55e",
              borderColor: "#22c55e33",
              fontSize: 12,
              padding: "6px 12px",
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
            background: "#7f1d1d22",
            border: "1px solid #ef444433",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          ⚠ {error} —{" "}
          <button
            onClick={fetchData}
            style={{
              background: "none",
              border: "none",
              color: "#f87171",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 13,
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
            color: "#334155",
          }}
        >
          <div style={{ fontSize: 36 }}>📅</div>
          <div style={{ fontSize: 13 }}>Loading calendar…</div>
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

const NAV_BTN = {
  background: "none",
  border: "1px solid #1e293b",
  color: "#64748b",
  borderRadius: 6,
  padding: "5px 11px",
  cursor: "pointer",
  fontSize: 17,
  lineHeight: 1,
  transition: "all 0.15s",
};
