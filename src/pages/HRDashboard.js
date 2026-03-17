// HRDashboard.js v1.0
// Protea Botanicals · HR Module · HR Officer Dashboard
// WP-HR-5 · March 2026
// src/pages/HRDashboard.js
//
// Route: /hr — role='hr' OR isHQ access
// Tabs: Overview | Staff | Leave | Timesheets | Contracts | Settings
// This is the full HR officer view — broader than AdminHRPanel
// AdminHRPanel = scoped to Admin's team | HRDashboard = full tenant HR access

import React, { useState, useEffect, useCallback, useContext } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";
import SystemStatusBar from "../components/SystemStatusBar";
import HRStaffDirectory from "../components/hq/HRStaffDirectory";
import HRLeave from "../components/hq/HRLeave";
import HRTimesheets from "../components/hq/HRTimesheets";
import HRContracts from "../components/hq/HRContracts";
import HRDisciplinary from "../components/hq/HRDisciplinary";
import HRComms from "../components/hq/HRComms";
import HRSettings from "../components/hq/HRSettings";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "staff", label: "Staff" },
  { id: "leave", label: "Leave" },
  { id: "timesheets", label: "Timesheets" },
  { id: "contracts", label: "Contracts" },
  { id: "comms", label: "Comms" },
  { id: "disciplinary", label: "Disciplinary" },
  { id: "settings", label: "Settings" },
];

function TabBtn({ active, label, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.green : "transparent",
        color: active ? C.white : C.green,
        border: "none",
        borderBottom: active
          ? `3px solid ${C.accent}`
          : "3px solid transparent",
        borderRadius: 0,
        padding: "12px 20px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontFamily: FONTS.body,
        cursor: "pointer",
        position: "relative",
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

// ── HR Overview ─────────────────────────────────────────────────────────────
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
            .select("id, status")
            .eq("tenant_id", tenantId),
          supabase
            .from("leave_requests")
            .select("id, status")
            .eq("tenant_id", tenantId),
          supabase
            .from("timesheets")
            .select("id, status")
            .eq("tenant_id", tenantId),
          supabase
            .from("employment_contracts")
            .select("id, is_active, end_date, probation_end_date")
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
      <div style={{ color: C.muted, padding: "40px", textAlign: "center" }}>
        Loading HR overview…
      </div>
    );
  if (!stats) return null;

  const tiles = [
    {
      icon: "👥",
      label: "Active Staff",
      value: stats.activeStaff,
      sub: `${stats.totalStaff} total`,
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

  return (
    <div>
      <h2
        style={{
          fontFamily: FONTS.heading,
          fontSize: 22,
          color: C.green,
          marginBottom: 20,
        }}
      >
        HR Command Centre
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 32,
        }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.label}
            onClick={() => onNavigate(tile.tab)}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${tile.color}`,
              borderRadius: 2,
              padding: "18px 20px",
              cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 14 }}>{tile.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                }}
              >
                {tile.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 32,
                fontWeight: 300,
                color: tile.color,
                lineHeight: 1,
              }}
            >
              {tile.value}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              {tile.sub}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 12,
        }}
      >
        Quick Actions
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
              padding: "10px 20px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: FONTS.body,
              cursor: "pointer",
              background: highlight ? C.red : C.mid,
              color: C.white,
              border: "none",
              borderRadius: "2px",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function HRDashboard() {
  const [tab, setTab] = useState("overview");
  const { tenantId, loading: tenantLoading } = useTenant();
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingTS, setPendingTS] = useState(0);

  // Load badge counts
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
      {/* Header */}
      <div
        style={{
          background: C.green,
          padding: "20px 32px",
          borderRadius: "2px",
          marginBottom: 0,
        }}
      >
        <span
          style={{
            color: C.accent,
            fontSize: "11px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Protea Botanicals
        </span>
        <h1
          style={{
            color: C.white,
            fontFamily: FONTS.heading,
            fontSize: "24px",
            margin: "4px 0 0",
          }}
        >
          HR Dashboard
        </h1>
      </div>

      <SystemStatusBar />

      {/* Tab bar */}
      <div
        style={{
          background: C.white,
          borderBottom: `1px solid ${C.border}`,
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

      {/* Tab content */}
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
        {tab === "settings" && <HRSettings tenantId={tenantId} />}
      </div>
    </div>
  );
}
