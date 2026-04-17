// AdminHRPanel.js v1.5
// WP-VISUAL + WP-VIZ: T tokens, Inter font, flush stat grid, 3 charts
// v1.4 — WP-HR-6: Disciplinary tab unlocked — HRDisciplinary.js wired
// v1.3 — WP-HR-5: Contracts tab unlocked — HRContracts.js wired
// v1.2 — WP-HR-4: Timesheets tab unlocked — HRTimesheets.js wired
// v1.1 — WP-HR-3: Leave tab unlocked — HRLeave.js wired
// v1.0 — WP-HR-2: Initial build — Staff tab live
// src/components/AdminHRPanel.js

import React, { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../services/supabaseClient";
import { usePageContext } from "../hooks/usePageContext";
import WorkflowGuide from "./WorkflowGuide";
import HRStaffDirectory from "./hq/HRStaffDirectory";
import HRLeave from "./hq/HRLeave";
import HRTimesheets from "./hq/HRTimesheets";
import HRContracts from "./hq/HRContracts";
import HRDisciplinary from "./hq/HRDisciplinary";
import { ChartCard, ChartTooltip } from "./viz";
import { T } from "../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)

// ─── SUB-TABS ─────────────────────────────────────────────────────────────────
const SUB_TABS = [
  { id: "staff", label: "Staff" },
  { id: "leave", label: "Leave" },
  { id: "timesheets", label: "Timesheets" },
  { id: "contracts", label: "Contracts" },
  { id: "disciplinary", label: "Disciplinary" },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AdminHRPanel({ tenantId, user }) {
  const [activeTab, setActiveTab] = useState("staff");
  const ctx = usePageContext("hr-staff", tenantId);

  // ── Summary data for overview charts ──────────────────────────────────────
  const [summary, setSummary] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      const [staffRes, leaveRes, timesheetRes] = await Promise.all([
        supabase
          .from("staff_profiles")
          .select("id,status,employment_type,department")
          .eq("tenant_id", tenantId),
        supabase
          .from("leave_requests")
          .select("id,status,leave_type_id,start_date,end_date")
          .eq("tenant_id", tenantId)
          .gte(
            "start_date",
            new Date(new Date().getFullYear(), 0, 1).toISOString(),
          ),
        supabase
          .from("timesheet_entries")
          .select("id,staff_profile_id,hours_worked,is_late,status")
          .eq("tenant_id", tenantId)
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 86400000).toISOString(),
          ),
      ]);

      const staff = staffRes.data || [];
      const leaves = leaveRes.data || [];
      const entries = timesheetRes.data || [];

      // Headcount by status
      const statusCounts = staff.reduce((acc, s) => {
        const k = s.status || "active";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

      // Leave requests by status
      const leaveCounts = leaves.reduce((acc, l) => {
        const k = l.status || "pending";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

      // Timesheet hours by staff (top 8, last 30 days)
      const hoursByStaff = {};
      entries.forEach((e) => {
        const k = e.staff_profile_id?.slice(0, 8) || "unknown";
        hoursByStaff[k] = (hoursByStaff[k] || 0) + (e.hours_worked || 0);
      });
      const topHours = Object.entries(hoursByStaff)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, hrs]) => ({ name: id, hours: Math.round(hrs * 10) / 10 }));

      const lateCount = entries.filter((e) => e.is_late).length;
      const pendingLeave = leaves.filter((l) => l.status === "pending").length;
      const onLeaveToday = leaves.filter((l) => {
        const now = new Date();
        return (
          l.status === "approved" &&
          new Date(l.start_date) <= now &&
          new Date(l.end_date) >= now
        );
      }).length;

      setSummary({
        total: staff.length,
        active: statusCounts["active"] || 0,
        onLeave: onLeaveToday,
        inactive:
          (statusCounts["inactive"] || 0) + (statusCounts["terminated"] || 0),
        pendingLeave,
        lateCount,
        totalHoursThisMonth: entries.reduce(
          (s, e) => s + (e.hours_worked || 0),
          0,
        ),
        statusCounts,
        leaveCounts,
        topHours,
      });
    } catch (err) {
      console.error("[AdminHRPanel] fetchSummary:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const headcountDonut = summary
    ? [
        {
          name: "Active",
          value: summary.statusCounts["active"] || 0,
          color: T.success,
        },
        { name: "On Leave", value: summary.onLeave, color: T.warning },
        { name: "Inactive", value: summary.inactive, color: T.ink300 },
        {
          name: "Probation",
          value: summary.statusCounts["probation"] || 0,
          color: T.info,
        },
      ].filter((d) => d.value > 0)
    : [];

  const leaveBar = summary
    ? [
        {
          name: "Pending",
          count: summary.leaveCounts["pending"] || 0,
          color: T.warning,
        },
        {
          name: "Approved",
          count: summary.leaveCounts["approved"] || 0,
          color: T.success,
        },
        {
          name: "Rejected",
          count: summary.leaveCounts["rejected"] || 0,
          color: T.danger,
        },
        {
          name: "Cancelled",
          count: summary.leaveCounts["cancelled"] || 0,
          color: T.ink300,
        },
      ].filter((d) => d.count > 0)
    : [];

  return (
    <div style={{ fontFamily: T.font, color: T.ink700 }}>
      <WorkflowGuide context={ctx} defaultOpen={true} />

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <h2
          style={{
            fontFamily: T.font,
            fontSize: 22,
            fontWeight: 600,
            color: T.ink900,
            margin: "0 0 4px",
          }}
        >
          HR Management
        </h2>
        <p
          style={{
            fontSize: 13,
            color: T.ink500,
            margin: "0 0 20px",
            fontFamily: T.font,
          }}
        >
          Staff records · Leave · Timesheets · Contracts · Compliance
        </p>
      </div>

      {/* ── FLUSH STAT GRID ── */}
      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
            gap: "1px",
            background: T.border,
            borderRadius: T.radius.md,
            overflow: "hidden",
            border: `1px solid ${T.border}`,
            boxShadow: T.shadow.sm,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Total Staff", value: summary.total, color: T.accent },
            { label: "Active", value: summary.active, color: T.success },
            {
              label: "On Leave Today",
              value: summary.onLeave,
              color: T.warning,
            },
            {
              label: "Pending Leave",
              value: summary.pendingLeave,
              color: summary.pendingLeave > 0 ? T.warning : T.ink500,
            },
            {
              label: "Late (30d)",
              value: summary.lateCount,
              color: summary.lateCount > 0 ? T.danger : T.success,
            },
            {
              label: "Hours (30d)",
              value: Math.round(summary.totalHoursThisMonth),
              color: T.info,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: T.surface,
                padding: "14px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: 6,
                  fontFamily: T.font,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 22,
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── WP-VIZ CHARTS ── */}
      {summary && summary.total > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Donut — headcount by status */}
          <ChartCard title="Headcount by Status" height={200}>
            {headcountDonut.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 13,
                  color: T.ink500,
                  fontFamily: T.font,
                }}
              >
                No staff data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={headcountDonut}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    isAnimationActive={false}
                  >
                    {headcountDonut.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip formatter={(v) => `${v} staff`} />}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Bar — leave requests by status */}
          <ChartCard title="Leave Requests (YTD)" height={200}>
            {leaveBar.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 13,
                  color: T.ink500,
                  fontFamily: T.font,
                }}
              >
                No leave data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leaveBar}
                  margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    horizontal
                    vertical={false}
                    stroke={T.border}
                    strokeWidth={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: T.ink500, fontSize: 11, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    dy={4}
                  />
                  <YAxis
                    tick={{ fill: T.ink500, fontSize: 11, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip formatter={(v) => `${v} requests`} />
                    }
                  />
                  <Bar
                    dataKey="count"
                    name="Requests"
                    isAnimationActive={false}
                    maxBarSize={36}
                    radius={[3, 3, 0, 0]}
                  >
                    {leaveBar.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Horizontal bar — hours by staff (last 30d) */}
          <ChartCard title="Hours by Staff (Last 30 Days)" height={200}>
            {summary.topHours.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 13,
                  color: T.ink500,
                  fontFamily: T.font,
                }}
              >
                No timesheet data yet
              </div>
            ) : (
              <div
                style={{
                  padding: "8px 4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  height: "100%",
                  justifyContent: "center",
                }}
              >
                {(() => {
                  const maxHrs = Math.max(
                    ...summary.topHours.map((d) => d.hours),
                    1,
                  );
                  return summary.topHours.map((d) => (
                    <div
                      key={d.name}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: "monospace",
                          width: 64,
                          flexShrink: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {d.name}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 14,
                          background: T.bg,
                          borderRadius: T.radius.sm,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(d.hours / maxHrs) * 100}%`,
                            background: T.accentMid,
                            borderRadius: T.radius.sm,
                            transition: "width 0.5s",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 4,
                          }}
                        >
                          {d.hours / maxHrs > 0.2 && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#fff",
                                fontWeight: 700,
                                fontFamily: T.font,
                              }}
                            >
                              {d.hours}h
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.font,
                          minWidth: 28,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {d.hours / maxHrs <= 0.2 ? `${d.hours}h` : ""}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* Pending leave alert */}
      {summary?.pendingLeave > 0 && (
        <div
          style={{
            padding: "10px 16px",
            background: T.warningLight,
            border: `1px solid ${T.warningBd}`,
            borderRadius: T.radius.md,
            marginBottom: 16,
            fontSize: 13,
            color: T.warning,
            fontWeight: 600,
            fontFamily: T.font,
          }}
        >
          {summary.pendingLeave} leave request
          {summary.pendingLeave > 1 ? "s" : ""} pending approval — open the
          Leave tab to review
        </div>
      )}

      {/* ── UNDERLINE TABS ── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `2px solid ${T.border}`,
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "9px 18px",
              cursor: "pointer",
              border: "none",
              background: "none",
              fontFamily: T.font,
              fontSize: 11,
              fontWeight: activeTab === tab.id ? 700 : 400,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              color: activeTab === tab.id ? T.accent : T.ink500,
              borderBottom:
                activeTab === tab.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              marginBottom: -2,
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "staff" && (
        <HRStaffDirectory tenantId={tenantId} user={user} />
      )}
      {activeTab === "leave" && <HRLeave tenantId={tenantId} />}
      {activeTab === "timesheets" && <HRTimesheets tenantId={tenantId} />}
      {activeTab === "contracts" && <HRContracts tenantId={tenantId} />}
      {activeTab === "disciplinary" && <HRDisciplinary tenantId={tenantId} />}
    </div>
  );
}
