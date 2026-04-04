// HRDashboard.js v1.2
// v1.2 — URL sync: useLocation + useEffect added — sidebar navigation now works
// v1.1 — WP-VIZ: Leave Status Donut + Timesheet Pipeline Bar + Headcount HBar added to HROverview
// v1.0 — WP-HR-5 · March 2026 · src/pages/HRDashboard.js
//
// Route: /hr — role='hr' OR isHQ access
// Tabs: Overview | Staff | Leave | Timesheets | Contracts | Settings
// AdminHRPanel = scoped to Admin's team | HRDashboard = full tenant HR access

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
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
import { useTenant } from "../services/tenantService";
import HRStaffDirectory from "../components/hq/HRStaffDirectory";
import HRLeave from "../components/hq/HRLeave";
import HRTimesheets from "../components/hq/HRTimesheets";
import HRContracts from "../components/hq/HRContracts";
import HRDisciplinary from "../components/hq/HRDisciplinary";
import HRComms from "../components/hq/HRComms";
import HRSettings from "../components/hq/HRSettings";
import HRCalendar from "../components/hq/HRCalendar";
import HRLoans from "../components/hq/HRLoans";
import HRPerformance from "../components/hq/HRPerformance";
import HRPayroll from "../components/hq/HRPayroll";
import { ChartCard, ChartTooltip } from "../components/viz";
import HRStockView from "../components/hq/HRStockView";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#474747",
  ink400: "#6B6B6B",
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
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  cream: T.ink050,
  border: T.ink150,
  muted: T.ink500,
  white: "#fff",
  red: T.danger,
};
const FONTS = { heading: T.font, body: T.font };

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "staff", label: "Staff" },
  { id: "leave", label: "Leave" },
  { id: "timesheets", label: "Timesheets" },
  { id: "contracts", label: "Contracts" },
  { id: "comms", label: "Comms" },
  { id: "disciplinary", label: "Disciplinary" },
  { id: "calendar", label: "Calendar" },
  { id: "loans", label: "Loans" },
  { id: "performance", label: "Performance" },
  { id: "payroll", label: "Payroll" },
  { id: "settings", label: "Settings" },
  { id: "stock", label: "Stock" },
];

function TabBtn({ active, label, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        color: active ? T.accent : T.ink400,
        border: "none",
        borderBottom: active
          ? "2px solid " + T.accent
          : "2px solid transparent",
        borderRadius: 0,
        padding: "10px 16px",
        fontSize: "11px",
        fontWeight: active ? 700 : 400,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: T.font,
        cursor: "pointer",
        position: "relative",
        marginBottom: "-1px",
      }}
    >
      {label}
      {badge > 0 && (
        <span
          style={{
            display: "inline-block",
            background: C.red,
            color: C.white,
            borderRadius: 10,
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 5px",
            marginLeft: 6,
            verticalAlign: "middle",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── HR OVERVIEW ──────────────────────────────────────────────────────────────
function HROverview({ tenantId, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, leaveRes, tsRes, contractRes] = await Promise.allSettled(
        [
          supabase
            .from("staff_profiles")
            .select("id,status,employment_type,department")
            .eq("tenant_id", tenantId),
          supabase
            .from("leave_requests")
            .select("id,status")
            .eq("tenant_id", tenantId),
          supabase
            .from("timesheets")
            .select("id,status")
            .eq("tenant_id", tenantId),
          supabase
            .from("employment_contracts")
            .select("id,is_active,end_date,probation_end_date")
            .eq("tenant_id", tenantId)
            .eq("is_active", true),
        ],
      );

      const staff =
        staffRes.status === "fulfilled" ? staffRes.value.data || [] : [];
      const leaves =
        leaveRes.status === "fulfilled" ? leaveRes.value.data || [] : [];
      const timesheets =
        tsRes.status === "fulfilled" ? tsRes.value.data || [] : [];
      const contracts =
        contractRes.status === "fulfilled" ? contractRes.value.data || [] : [];

      const now = new Date();
      const in60Days = new Date(now.getTime() + 60 * 86400000);
      const in14Days = new Date(now.getTime() + 14 * 86400000);

      const staffByStatus = staff.reduce((acc, s) => {
        const k = s.status || "active";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      const staffByDept = staff.reduce((acc, s) => {
        const k = s.department || "General";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      const leaveByStatus = leaves.reduce((acc, l) => {
        const k = l.status || "pending";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      const tsByStatus = timesheets.reduce((acc, t) => {
        const k = t.status || "draft";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalStaff: staff.length,
        activeStaff: staff.filter((s) => s.status === "active").length,
        pendingLeave: leaves.filter((l) => l.status === "pending").length,
        pendingTimesheets: timesheets.filter(
          (t) => t.status === "staff_submitted",
        ).length,
        adminApprovedTimesheets: timesheets.filter(
          (t) => t.status === "admin_approved",
        ).length,
        expiringContracts: contracts.filter(
          (c) =>
            c.end_date &&
            new Date(c.end_date) <= in60Days &&
            new Date(c.end_date) >= now,
        ).length,
        probationEnding: contracts.filter(
          (c) =>
            c.probation_end_date &&
            new Date(c.probation_end_date) <= in14Days &&
            new Date(c.probation_end_date) >= now,
        ).length,
        staffByStatus,
        staffByDept,
        leaveByStatus,
        tsByStatus,
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div
        style={{
          color: C.muted,
          padding: "40px",
          textAlign: "center",
          fontFamily: T.font,
        }}
      >
        Loading HR overview…
      </div>
    );
  if (!stats) return null;

  const tiles = [
    {
      icon: "👥",
      label: "Active Staff",
      value: stats.activeStaff,
      sub: stats.totalStaff + " total",
      color: "#2e7d32",
      tab: "staff",
    },
    {
      icon: "🗓",
      label: "Leave Pending",
      value: stats.pendingLeave,
      sub: "awaiting approval",
      color: stats.pendingLeave > 0 ? "#f57f17" : "#aaa",
      tab: "leave",
    },
    {
      icon: "⏱",
      label: "Timesheets to Review",
      value: stats.pendingTimesheets,
      sub: "staff submitted",
      color: stats.pendingTimesheets > 0 ? "#f57f17" : "#aaa",
      tab: "timesheets",
    },
    {
      icon: "✅",
      label: "Timesheets to Lock",
      value: stats.adminApprovedTimesheets,
      sub: "admin approved → HR",
      color: stats.adminApprovedTimesheets > 0 ? "#1565c0" : "#aaa",
      tab: "timesheets",
    },
    {
      icon: "📋",
      label: "Contracts Expiring",
      value: stats.expiringContracts,
      sub: "within 60 days",
      color: stats.expiringContracts > 0 ? "#c62828" : "#aaa",
      tab: "contracts",
    },
    {
      icon: "🔔",
      label: "Probation Ending",
      value: stats.probationEnding,
      sub: "within 14 days",
      color: stats.probationEnding > 0 ? "#e65100" : "#aaa",
      tab: "contracts",
    },
  ];

  const leaveDonut = [
    {
      name: "Pending",
      value: stats.leaveByStatus["pending"] || 0,
      color: T.warning,
    },
    {
      name: "Approved",
      value: stats.leaveByStatus["approved"] || 0,
      color: T.success,
    },
    {
      name: "Rejected",
      value: stats.leaveByStatus["rejected"] || 0,
      color: T.danger,
    },
    {
      name: "Cancelled",
      value: stats.leaveByStatus["cancelled"] || 0,
      color: T.ink400,
    },
  ].filter((d) => d.value > 0);

  const tsBar = [
    { name: "Draft", count: stats.tsByStatus["draft"] || 0, color: T.ink400 },
    {
      name: "Submitted",
      count: stats.tsByStatus["staff_submitted"] || 0,
      color: T.warning,
    },
    {
      name: "Admin Approved",
      count: stats.tsByStatus["admin_approved"] || 0,
      color: T.info,
    },
    {
      name: "HR Locked",
      count: stats.tsByStatus["hr_locked"] || 0,
      color: T.success,
    },
    { name: "Paid", count: stats.tsByStatus["paid"] || 0, color: T.accentMid },
  ].filter((d) => d.count > 0);

  const deptBar = Object.entries(stats.staffByDept)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([dept, count]) => ({ dept, count }));
  const deptMax = Math.max(...deptBar.map((d) => d.count), 1);
  const showCharts =
    leaveDonut.length > 0 || tsBar.length > 0 || deptBar.length > 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: T.font,
            fontSize: 22,
            fontWeight: 600,
            color: T.ink900,
            margin: "0 0 4px",
            letterSpacing: "-0.01em",
          }}
        >
          HR Command Centre
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: T.ink400, fontFamily: T.font }}>
          Staff · Leave · Timesheets · Contracts · Payroll
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.label}
            onClick={() => onNavigate(tile.tab)}
            style={{
              background: C.white,
              border: "1px solid " + T.ink150,
              borderLeft: `4px solid ${tile.color === "#aaa" ? T.ink150 : tile.color}`,
              borderRadius: 10,
              padding: "18px 20px 16px",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.18s ease, transform 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#6B7280",
                  fontFamily: T.font,
                }}
              >
                {tile.label}
              </span>
              <span style={{ fontSize: 13 }}>{tile.icon}</span>
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 28,
                fontWeight: 600,
                color: tile.color === "#aaa" ? T.ink400 : tile.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                marginBottom: 4,
              }}
            >
              {tile.value}
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: T.font }}>
              {tile.sub}
            </div>
          </div>
        ))}
      </div>

      {showCharts && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <ChartCard title="Leave Requests" subtitle="By approval status" accent="amber" height={220}>
            {leaveDonut.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 13,
                  color: T.ink400,
                  fontFamily: T.font,
                }}
              >
                No leave requests yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveDonut}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    isAnimationActive={true}
                    animationDuration={600}
                  >
                    {leaveDonut.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip formatter={(v) => v + " requests"} />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Timesheet Pipeline" subtitle="Status flow · draft → paid" accent="blue" height={220}>
            {tsBar.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 13,
                  color: T.ink400,
                  fontFamily: T.font,
                }}
              >
                No timesheets yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tsBar}
                  margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    horizontal
                    vertical={false}
                    stroke={T.ink150}
                    strokeWidth={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: T.ink400, fontSize: 9, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    dy={4}
                    maxRotation={30}
                  />
                  <YAxis
                    tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip formatter={(v) => v + " timesheets"} />
                    }
                  />
                  <Bar
                    dataKey="count"
                    name="Timesheets"
                    isAnimationActive={true}
                    animationDuration={600}
                    animationEasing="ease-out"
                    maxBarSize={36}
                    radius={[3, 3, 0, 0]}
                  >
                    {tsBar.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Headcount by Department" subtitle="Active staff distribution" accent="green" height={220}>
            {deptBar.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: 13,
                  color: T.ink400,
                  fontFamily: T.font,
                }}
              >
                No department data
              </div>
            ) : (
              <div
                style={{
                  padding: "8px 4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  height: "100%",
                  justifyContent: "center",
                }}
              >
                {deptBar.map((d) => (
                  <div
                    key={d.dept}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: T.ink700,
                        fontFamily: T.font,
                        width: 80,
                        flexShrink: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.dept}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 16,
                        background: T.ink075,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: (d.count / deptMax) * 100 + "%",
                          background: T.accentMid,
                          borderRadius: 3,
                          transition: "width 0.5s",
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: 4,
                        }}
                      >
                        {d.count / deptMax > 0.2 && (
                          <span
                            style={{
                              fontSize: 9,
                              color: "#fff",
                              fontWeight: 700,
                              fontFamily: T.font,
                            }}
                          >
                            {d.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.ink400,
                        fontFamily: T.font,
                        minWidth: 20,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {d.count / deptMax <= 0.2 ? d.count : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span style={{
          display: "inline-block",
          width: 3,
          height: 14,
          borderRadius: 2,
          background: T.accent,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#374151",
          fontFamily: T.font,
        }}>
          Quick Actions
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          {
            label: "🗓 Review Leave",
            tab: "leave",
            highlight: stats.pendingLeave > 0,
          },
          {
            label: "⏱ Lock Timesheets",
            tab: "timesheets",
            highlight: stats.adminApprovedTimesheets > 0,
          },
          {
            label: "📋 Contracts",
            tab: "contracts",
            highlight: stats.expiringContracts > 0,
          },
          { label: "👥 Staff Directory", tab: "staff", highlight: false },
          { label: "⚙ Settings", tab: "settings", highlight: false },
        ].map(({ label, tab, highlight }) => (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            style={{
              padding: "8px 16px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: T.font,
              cursor: "pointer",
              background: highlight ? T.danger : T.accent,
              color: "#fff",
              border: "none",
              borderRadius: "4px",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function HRDashboard() {
  const [tab, setTab] = useState("overview");
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("tab");
    if (t && TABS.find((x) => x.id === t)) setTab(t);
  }, [location.search]); // eslint-disable-line
  const { tenantId, loading: tenantLoading } = useTenant();
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingTS, setPendingTS] = useState(0);

  useEffect(() => {
    if (!tenantId) return;
    const loadBadges = async () => {
      const [leaveRes, tsRes] = await Promise.allSettled([
        supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "pending"),
        supabase
          .from("timesheets")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .in("status", ["staff_submitted", "admin_approved"]),
      ]);
      setPendingLeave(
        leaveRes.status === "fulfilled" ? leaveRes.value.count || 0 : 0,
      );
      setPendingTS(tsRes.status === "fulfilled" ? tsRes.value.count || 0 : 0);
    };
    loadBadges();
  }, [tenantId]);

  if (tenantLoading || !tenantId) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          fontFamily: FONTS.body,
          color: C.muted,
          fontSize: 13,
        }}
      >
        Loading HR…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <div style={{ marginBottom: 0 }}>
        <h1
          style={{
            color: T.ink900,
            fontFamily: T.font,
            fontSize: "22px",
            fontWeight: 600,
            margin: "0 0 4px",
          }}
        >
          HR Dashboard
        </h1>
        <p
          style={{
            fontFamily: T.font,
            fontSize: 13,
            color: T.ink500,
            margin: 0,
          }}
        >
          Staff · Leave · Timesheets · Contracts · Payroll
        </p>
      </div>

      <div
        style={{
          background: C.white,
          borderBottom: "1px solid " + C.border,
          display: "flex",
          gap: 0,
          overflowX: "auto",
          marginBottom: "24px",
          borderRadius: "2px",
          marginTop: "12px",
        }}
      >
        {TABS.map((t) => (
          <TabBtn
            key={t.id}
            active={tab === t.id}
            label={t.label}
            badge={
              t.id === "leave"
                ? pendingLeave
                : t.id === "timesheets"
                  ? pendingTS
                  : 0
            }
            onClick={() => setTab(t.id)}
          />
        ))}
      </div>

      <div>
        {tab === "overview" && (
          <HROverview tenantId={tenantId} onNavigate={setTab} />
        )}
        {tab === "staff" && <HRStaffDirectory tenantId={tenantId} />}
        {tab === "leave" && <HRLeave tenantId={tenantId} />}
        {tab === "timesheets" && <HRTimesheets tenantId={tenantId} />}
        {tab === "contracts" && <HRContracts tenantId={tenantId} />}
        {tab === "comms" && <HRComms tenantId={tenantId} />}
        {tab === "disciplinary" && <HRDisciplinary tenantId={tenantId} />}
        {tab === "calendar" && <HRCalendar tenantId={tenantId} />}
        {tab === "loans" && <HRLoans tenantId={tenantId} />}
        {tab === "performance" && <HRPerformance tenantId={tenantId} />}
        {tab === "payroll" && <HRPayroll tenantId={tenantId} />}
        {tab === "settings" && <HRSettings tenantId={tenantId} />}
        {tab === "stock" && <HRStockView tenantId={tenantId} />}
      </div>
    </div>
  );
}
