// src/pages/AdminAnalytics.js v2.2
// WP-VISUAL + WP-VIZ: T tokens, Inter font, flush stat grid, 4 charts
// v2.1 — WP-GUIDE-C+++: usePageContext 'admin-analytics' wired + WorkflowGuide added
// v2.0 — FIXED: queries scan_logs, scanned_at, qr_type, realtime subscription

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "../components/WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "../components/viz";
import { useTenant } from "../services/tenantService";

// ─── THEME ────────────────────────────────────────────────────────────────────
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
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
};

// ─── META ─────────────────────────────────────────────────────────────────────
const TYPE_META = {
  product_insert: { label: "Product Insert", color: T.accent, icon: "📦" },
  packaging_exterior: {
    label: "Exterior Packaging",
    color: T.info,
    icon: "🌐",
  },
  promotional: { label: "Promotional", color: "#b5935a", icon: "📣" },
  event: { label: "Event Check-in", color: T.warning, icon: "🎪" },
  wearable: { label: "Wearable / Merch", color: "#7c3a10", icon: "👕" },
  retail_display: { label: "Retail Display", color: T.accentMid, icon: "🏪" },
};
const OUTCOME_META = {
  points_awarded: { label: "Points Awarded", color: T.success },
  already_claimed: { label: "Already Claimed", color: T.ink400 },
  limit_reached: { label: "Limit Reached", color: T.warning },
  cooldown: { label: "Cooldown", color: T.warning },
  inactive: { label: "Inactive", color: T.ink400 },
  expired: { label: "Expired", color: T.danger },
  no_actions: { label: "No Actions", color: T.ink400 },
};
function getTypeMeta(t) {
  return TYPE_META[t] || { label: t || "Unknown", color: T.ink400, icon: "🔗" };
}
function getOutcomeMeta(o) {
  return OUTCOME_META[o] || { label: o || "Unknown", color: T.ink400 };
}

function fmtDT(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} · ${dt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "—";
  }
}

const sTh = {
  padding: "8px 14px",
  textAlign: "left",
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#fff",
  fontWeight: 700,
  fontFamily: T.font,
};
const sTd = {
  padding: "9px 14px",
  fontSize: 12,
  fontFamily: T.font,
  color: T.ink700,
  borderBottom: `1px solid ${T.ink075}`,
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AdminAnalytics({ tenantId }) {
  const ctx = usePageContext("admin-analytics", null);
  const { tenant } = useTenant();
  const industryProfile = tenant?.industry_profile || "cannabis_retail";
  const isFoodBev = industryProfile === "food_beverage";
  const isGeneral = industryProfile === "general_retail";
  const isCannabis =
    industryProfile === "cannabis_retail" ||
    industryProfile === "cannabis_dispensary";
  const [loading, setLoading] = useState(true);
  const [expiringCount, setExpiringCount] = useState(0);
  const [data, setData] = useState({
    totalScans: 0,
    todayScans: 0,
    weekScans: 0,
    monthScans: 0,
    byType: [],
    byOutcome: [],
    byProvince: [],
    recentScans: [],
    trendData: [],
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date();
      monthStart.setDate(monthStart.getDate() - 30);

      // WP-R: apply tenant filter if available
      const applyTenant = (q) => q; // scan_logs has no tenant_id — RLS handles isolation

      const [tot, tod, wk, mo] = await Promise.all([
        applyTenant(
          supabase
            .from("scan_logs")
            .select("*", { count: "exact", head: true }),
        ),
        applyTenant(
          supabase
            .from("scan_logs")
            .select("*", { count: "exact", head: true }),
        ).gte("scanned_at", todayStart.toISOString()),
        applyTenant(
          supabase
            .from("scan_logs")
            .select("*", { count: "exact", head: true }),
        ).gte("scanned_at", weekStart.toISOString()),
        applyTenant(
          supabase
            .from("scan_logs")
            .select("*", { count: "exact", head: true }),
        ).gte("scanned_at", monthStart.toISOString()),
      ]);

      const { data: rows } = await applyTenant(
        supabase
          .from("scan_logs")
          .select(
            "id,qr_type,campaign_name,scan_outcome,scanned_at,ip_province,ip_city,user_id,qr_code,points_awarded",
          )
          .order("scanned_at", { ascending: false })
          .limit(500),
      );

      const all = rows || [];
      const total = tot.count || 0;

      // byType
      const typeMap = {};
      all.forEach((s) => {
        const t = s.qr_type || "unknown";
        if (!typeMap[t]) typeMap[t] = { count: 0, lastScan: null };
        typeMap[t].count++;
        if (!typeMap[t].lastScan || s.scanned_at > typeMap[t].lastScan)
          typeMap[t].lastScan = s.scanned_at;
      });
      const byType = Object.entries(typeMap)
        .map(([qrType, info]) => ({
          qrType,
          count: info.count,
          lastScan: info.lastScan,
          pct: total > 0 ? ((info.count / total) * 100).toFixed(1) : "0",
        }))
        .sort((a, b) => b.count - a.count);

      // byOutcome
      const outcomeMap = {};
      all.forEach((s) => {
        const o = s.scan_outcome || "unknown";
        outcomeMap[o] = (outcomeMap[o] || 0) + 1;
      });
      const byOutcome = Object.entries(outcomeMap)
        .map(([outcome, count]) => ({ outcome, count }))
        .sort((a, b) => b.count - a.count);

      // byProvince
      const provMap = {};
      all.forEach((s) => {
        const p = s.ip_province || "Unknown";
        provMap[p] = (provMap[p] || 0) + 1;
      });
      const byProvince = Object.entries(provMap)
        .map(([province, count]) => ({ province, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // trend — last 14 days
      const dayMap = {};
      all.forEach((s) => {
        if (!s.scanned_at) return;
        const day = new Date(s.scanned_at).toLocaleDateString("en-ZA", {
          month: "short",
          day: "numeric",
        });
        dayMap[day] = dayMap[day] || { date: day, scans: 0, points: 0 };
        dayMap[day].scans++;
        dayMap[day].points += s.points_awarded || 0;
      });
      const trendData = Object.values(dayMap).slice(-14);

      setData({
        totalScans: total,
        todayScans: tod.count || 0,
        weekScans: wk.count || 0,
        monthScans: mo.count || 0,
        byType,
        byOutcome,
        byProvince,
        recentScans: all.slice(0, 25),
        trendData,
      });
    } catch (err) {
      console.error("Scan analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAnalytics();
    const sub = supabase
      .channel("admin-analytics-scan-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scan_logs" },
        fetchAnalytics,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [fetchAnalytics, tenantId]);

  useEffect(() => {
    if (!isFoodBev) return;
    const fetchExpiry = async () => {
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      const { count } = await supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true })
        .not("expiry_date", "is", null)
        .lte("expiry_date", sevenDays.toISOString())
        .gte("expiry_date", new Date().toISOString())
        .gt("quantity_on_hand", 0)
        .eq("is_active", true);
      setExpiringCount(count || 0);
    };
    fetchExpiry();
  }, [isFoodBev]);

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: T.ink400,
          fontFamily: T.font,
        }}
      >
        Loading scan analytics…
      </div>
    );

  // Chart data
  const outcomePie = data.byOutcome
    .slice(0, 5)
    .map((d) => ({ ...d, color: getOutcomeMeta(d.outcome).color }));
  const typeBarData = data.byType.slice(0, 6).map((d) => ({
    name: getTypeMeta(d.qrType).icon,
    label: getTypeMeta(d.qrType).label,
    count: d.count,
    color: getTypeMeta(d.qrType).color,
  }));
  const provMax = data.byProvince[0]?.count || 1;

  return (
    <div style={{ fontFamily: T.font }}>
      <WorkflowGuide
        context={ctx}
        tabId="admin-analytics"
        onAction={() => {}}
        defaultOpen={true}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: T.font,
              fontSize: 22,
              fontWeight: 600,
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            {isFoodBev ? "Engagement Analytics" : "Scan Analytics"}
          </h2>
          <div style={{ fontSize: 13, color: T.ink400 }}>
            {isFoodBev
              ? "Live engagement · QR scan breakdown · Geo distribution · Outcome tracking"
              : "Live scan intelligence · QR type breakdown · Geo distribution · Outcome tracking"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: T.success,
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: T.ink400,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: T.font,
              }}
            >
              Live
            </span>
          </div>
          <button
            onClick={fetchAnalytics}
            style={{
              background: "transparent",
              border: `1px solid ${T.ink150}`,
              borderRadius: 4,
              padding: "7px 14px",
              cursor: "pointer",
              fontFamily: T.font,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: T.ink500,
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }`}</style>

      {/* ── FLUSH STAT GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Scans", value: data.totalScans, color: T.accent },
          { label: "Today", value: data.todayScans, color: T.accentMid },
          { label: "Last 7 Days", value: data.weekScans, color: T.info },
          { label: "Last 30 Days", value: data.monthScans, color: "#b5935a" },
          { label: "QR Types", value: data.byType.length, color: T.ink700 },
          {
            label: "Provinces",
            value: data.byProvince.filter((p) => p.province !== "Unknown")
              .length,
            color: T.accentMid,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              padding: "16px 18px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
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
                fontSize: 24,
                fontWeight: 400,
                color: s.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value.toLocaleString()}
            </div>
          </div>
        ))}
        {isFoodBev && (
          <div
            style={{
              background: expiringCount > 0 ? T.warningBg : "#fff",
              padding: "16px 18px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: expiringCount > 0 ? T.warning : T.ink400,
                marginBottom: 6,
                fontFamily: T.font,
              }}
            >
              Expiring 7d
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 24,
                fontWeight: 400,
                color: expiringCount > 0 ? T.warning : T.success,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {expiringCount}
            </div>
          </div>
        )}
      </div>

      {/* ── WP-VIZ CHARTS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Area — scan trend */}
        <ChartCard title="Scan Activity — Last 14 Days" height={220}>
          {data.trendData.length < 2 ? (
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
              Not enough data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.trendData}
                margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
              >
                <defs>
                  <linearGradient id="aa-scan-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={T.accentMid}
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="95%"
                      stopColor={T.accentMid}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="aa-pts-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.info} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={T.info} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  horizontal
                  vertical={false}
                  stroke={T.ink150}
                  strokeWidth={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  dy={4}
                  interval="preserveStartEnd"
                  maxRotation={0}
                />
                <YAxis
                  tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v, n) =>
                        n === "Points" ? `${v} pts` : `${v} scans`
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  name="Scans"
                  stroke={T.accentMid}
                  strokeWidth={2}
                  fill="url(#aa-scan-grad)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="points"
                  name="Points"
                  stroke={T.info}
                  strokeWidth={1.5}
                  fill="url(#aa-pts-grad)"
                  dot={false}
                  isAnimationActive={false}
                  strokeDasharray="4 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Outcomes donut */}
        <ChartCard title="Scan Outcomes" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={outcomePie}
                dataKey="count"
                nameKey="outcome"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                isAnimationActive={false}
              >
                {outcomePie.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                content={<ChartTooltip formatter={(v) => `${v} scans`} />}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Bar — scans by QR type */}
        <ChartCard title="Scans by QR Type" height={200}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={typeBarData}
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
                tick={{ fill: T.ink400, fontSize: 13, fontFamily: T.font }}
                axisLine={false}
                tickLine={false}
                dy={4}
              />
              <YAxis
                tick={{ fill: T.ink400, fontSize: 10, fontFamily: T.font }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(v, _, p) =>
                      `${p?.payload?.label || ""}: ${v} scans`
                    }
                  />
                }
              />
              <Bar
                dataKey="count"
                name="Scans"
                isAnimationActive={false}
                maxBarSize={36}
                radius={[3, 3, 0, 0]}
              >
                {typeBarData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Province horizontal bars */}
        <ChartCard title="Scans by Province" height={200}>
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
            {data.byProvince.slice(0, 6).map((p) => (
              <div
                key={p.province}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: T.ink700,
                    fontFamily: T.font,
                    width: 90,
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.province}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 14,
                    background: T.ink075,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(p.count / provMax) * 100}%`,
                      background: T.accentMid,
                      borderRadius: 3,
                      transition: "width 0.5s",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 4,
                    }}
                  >
                    {p.count / provMax > 0.2 && (
                      <span
                        style={{
                          fontSize: 9,
                          color: "#fff",
                          fontWeight: 700,
                          fontFamily: T.font,
                        }}
                      >
                        {p.count}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: T.ink400,
                    fontFamily: T.font,
                    minWidth: 24,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.count / provMax <= 0.2 ? p.count : ""}
                </span>
              </div>
            ))}
            {data.byProvince.length === 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: T.ink400,
                  fontFamily: T.font,
                  textAlign: "center",
                }}
              >
                No geo data yet
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Recent scans table */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${T.ink150}`,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: T.shadow,
        }}
      >
        <div
          style={{
            padding: "12px 20px",
            borderBottom: `1px solid ${T.ink150}`,
            background: T.ink075,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.ink400,
              fontFamily: T.font,
            }}
          >
            Recent Scans — Last 25
          </div>
          <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}>
            {data.recentScans.length} records
          </span>
        </div>
        {data.recentScans.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: T.ink400,
              fontSize: 14,
              fontFamily: T.font,
            }}
          >
            No scan records found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: T.font,
              }}
            >
              <thead>
                <tr style={{ background: T.accent }}>
                  {[
                    "QR Code",
                    "Type",
                    "Outcome",
                    "Pts",
                    "Province",
                    "User",
                    "Date & Time",
                  ].map((h) => (
                    <th key={h} style={sTh}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentScans.map((s, i) => {
                  const tm = getTypeMeta(s.qr_type);
                  const om = getOutcomeMeta(s.scan_outcome);
                  return (
                    <tr
                      key={s.id}
                      style={{ background: i % 2 === 0 ? "#fff" : T.ink050 }}
                    >
                      <td
                        style={{
                          ...sTd,
                          fontFamily: "monospace",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {s.qr_code
                          ? s.qr_code.length > 24
                            ? s.qr_code.slice(0, 24) + "…"
                            : s.qr_code
                          : "—"}
                      </td>
                      <td style={sTd}>
                        {tm.icon} {tm.label}
                      </td>
                      <td style={sTd}>
                        <span
                          style={{
                            background: `${om.color}20`,
                            color: om.color,
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontFamily: T.font,
                          }}
                        >
                          {om.label}
                        </span>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontWeight: 600,
                          color: "#b5935a",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {s.points_awarded > 0 ? `+${s.points_awarded}` : "—"}
                      </td>
                      <td style={{ ...sTd, color: T.ink400 }}>
                        {s.ip_province || "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: "monospace",
                          fontSize: 10,
                          color: T.ink400,
                        }}
                      >
                        {s.user_id ? s.user_id.slice(0, 10) + "…" : "—"}
                      </td>
                      <td style={{ ...sTd, fontSize: 11, color: T.ink400 }}>
                        {fmtDT(s.scanned_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
