// src/pages/AdminAnalytics.js
// Protea Botanicals — Scan Analytics Dashboard Component
// v2.0 — FIXED: now queries scan_logs (not legacy scans table)
//         scanned_at replaces scan_date, qr_type used for breakdown,
//         realtime subscription to scan_logs, rich geo + device data

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  brown: "#7c3a10",
  orange: "#e67e22",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
  lightGold: "#fef9e7",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

const TYPE_META = {
  product_insert: { label: "Product Insert", color: C.green, icon: "📦" },
  packaging_exterior: {
    label: "Exterior Packaging",
    color: C.blue,
    icon: "🌐",
  },
  promotional: { label: "Promotional", color: C.gold, icon: "📣" },
  event: { label: "Event Check-in", color: C.orange, icon: "🎪" },
  wearable: { label: "Wearable / Merch", color: C.brown, icon: "👕" },
  retail_display: { label: "Retail Display", color: C.mid, icon: "🏪" },
};
function getTypeMeta(t) {
  return TYPE_META[t] || { label: t || "Unknown", color: C.muted, icon: "🔗" };
}

const OUTCOME_META = {
  points_awarded: { label: "Points Awarded", color: C.accent },
  already_claimed: { label: "Already Claimed", color: C.muted },
  limit_reached: { label: "Limit Reached", color: C.orange },
  cooldown: { label: "Cooldown", color: C.orange },
  inactive: { label: "Inactive", color: C.muted },
  expired: { label: "Expired", color: C.red },
  no_actions: { label: "No Actions", color: C.muted },
};

function fmtDT(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} · ${dt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "—";
  }
}

function StatCard({ label, value, color = C.green, icon }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "20px",
        flex: "1 1 160px",
        minWidth: "140px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          fontFamily: FONTS.body,
          marginBottom: "8px",
        }}
      >
        {icon && <span style={{ marginRight: "6px" }}>{icon}</span>}
        {label}
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color,
          fontFamily: FONTS.heading,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalScans: 0,
    todayScans: 0,
    weekScans: 0,
    monthScans: 0,
    byType: [],
    byOutcome: [],
    byProvince: [],
    recentScans: [],
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

      const [tot, tod, wk, mo] = await Promise.all([
        supabase.from("scan_logs").select("*", { count: "exact", head: true }),
        supabase
          .from("scan_logs")
          .select("*", { count: "exact", head: true })
          .gte("scanned_at", todayStart.toISOString()),
        supabase
          .from("scan_logs")
          .select("*", { count: "exact", head: true })
          .gte("scanned_at", weekStart.toISOString()),
        supabase
          .from("scan_logs")
          .select("*", { count: "exact", head: true })
          .gte("scanned_at", monthStart.toISOString()),
      ]);

      const { data: rows } = await supabase
        .from("scan_logs")
        .select(
          "id, qr_type, campaign_name, scan_outcome, scanned_at, ip_province, ip_city, user_id, qr_code, points_awarded",
        )
        .order("scanned_at", { ascending: false })
        .limit(500);

      const all = rows || [];
      const total = tot.count || 0;

      // By type
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

      // By outcome
      const outcomeMap = {};
      all.forEach((s) => {
        const o = s.scan_outcome || "unknown";
        outcomeMap[o] = (outcomeMap[o] || 0) + 1;
      });
      const byOutcome = Object.entries(outcomeMap)
        .map(([outcome, count]) => ({ outcome, count }))
        .sort((a, b) => b.count - a.count);

      // By province
      const provMap = {};
      all.forEach((s) => {
        const p = s.ip_province || "Unknown";
        provMap[p] = (provMap[p] || 0) + 1;
      });
      const byProvince = Object.entries(provMap)
        .map(([province, count]) => ({ province, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      setData({
        totalScans: total,
        todayScans: tod.count || 0,
        weekScans: wk.count || 0,
        monthScans: mo.count || 0,
        byType,
        byOutcome,
        byProvince,
        recentScans: all.slice(0, 25),
      });
    } catch (err) {
      console.error("Scan analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    // Live update on new scans
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
  }, [fetchAnalytics]);

  if (loading)
    return (
      <div
        style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}
      >
        Loading scan analytics…
      </div>
    );

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h2
          style={{
            fontFamily: FONTS.heading,
            color: C.green,
            fontSize: "22px",
            margin: 0,
          }}
        >
          Scan Analytics
        </h2>
        <button
          onClick={fetchAnalytics}
          style={{
            background: C.mid,
            color: C.white,
            border: "none",
            borderRadius: "2px",
            padding: "10px 20px",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontFamily: FONTS.body,
            cursor: "pointer",
          }}
        >
          ↻ Refresh Data
        </button>
      </div>

      {/* KPI Strip */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <StatCard
          icon="📊"
          label="Total Scans"
          value={data.totalScans}
          color={C.green}
        />
        <StatCard
          icon="📅"
          label="Today"
          value={data.todayScans}
          color={C.accent}
        />
        <StatCard
          icon="📈"
          label="Last 7 Days"
          value={data.weekScans}
          color={C.blue}
        />
        <StatCard
          icon="📆"
          label="Last 30 Days"
          value={data.monthScans}
          color={C.gold}
        />
      </div>

      {/* Two-column: Type + right column */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* By QR Type */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.green,
              }}
            >
              Breakdown by QR Type
            </div>
          </div>
          {data.byType.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: C.muted,
                fontSize: "13px",
              }}
            >
              No scans recorded yet.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr style={{ background: C.green, color: C.white }}>
                  {["Type", "Scans", "% Total", "Last Scan"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 14px",
                        textAlign: "left",
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.byType.map((row, i) => {
                  const meta = getTypeMeta(row.qrType);
                  return (
                    <tr
                      key={row.qrType}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: i % 2 === 0 ? C.white : C.cream,
                      }}
                    >
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontWeight: 600, color: C.green }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "9px 14px",
                          fontWeight: 700,
                          fontSize: "14px",
                        }}
                      >
                        {row.count}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <div
                            style={{
                              background: C.border,
                              borderRadius: "4px",
                              height: "5px",
                              width: "60px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                background: meta.color,
                                height: "100%",
                                width: `${row.pct}%`,
                                transition: "width 0.6s",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "10px", color: C.muted }}>
                            {row.pct}%
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "9px 14px",
                          fontSize: "10px",
                          color: C.muted,
                        }}
                      >
                        {fmtDT(row.lastScan)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column: Outcomes + Province */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: "2px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.green,
                marginBottom: "14px",
              }}
            >
              Scan Outcomes
            </div>
            {data.byOutcome.length === 0 ? (
              <div style={{ fontSize: "13px", color: C.muted }}>
                No data yet.
              </div>
            ) : (
              data.byOutcome.map((row) => {
                const meta = OUTCOME_META[row.outcome] || {
                  label: row.outcome,
                  color: C.muted,
                };
                const pct =
                  data.totalScans > 0
                    ? ((row.count / data.totalScans) * 100).toFixed(1)
                    : 0;
                return (
                  <div key={row.outcome} style={{ marginBottom: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                      <span style={{ fontSize: "11px", color: C.muted }}>
                        {row.count} · {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: "4px",
                        background: C.border,
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: meta.color,
                          borderRadius: "2px",
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: "2px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.green,
                marginBottom: "14px",
              }}
            >
              Scans by Province (IP)
            </div>
            {data.byProvince.length === 0 ? (
              <div style={{ fontSize: "13px", color: C.muted }}>
                No geo data yet.
              </div>
            ) : (
              data.byProvince.map((row) => {
                const pct =
                  data.totalScans > 0
                    ? ((row.count / data.totalScans) * 100).toFixed(1)
                    : 0;
                return (
                  <div key={row.province} style={{ marginBottom: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: C.green,
                          fontWeight: 500,
                        }}
                      >
                        {row.province}
                      </span>
                      <span style={{ fontSize: "11px", color: C.muted }}>
                        {row.count} · {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: "4px",
                        background: C.border,
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: C.mid,
                          borderRadius: "2px",
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.green,
            }}
          >
            Recent Scans (Last 25)
          </div>
        </div>
        {data.recentScans.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: C.muted,
              fontSize: "14px",
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
                fontSize: "12px",
              }}
            >
              <thead>
                <tr style={{ background: C.green, color: C.white }}>
                  {[
                    "QR Code",
                    "Type",
                    "Outcome",
                    "Pts",
                    "Province",
                    "User",
                    "Date & Time",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 14px",
                        textAlign: "left",
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentScans.map((s, i) => {
                  const tm = getTypeMeta(s.qr_type);
                  const om = OUTCOME_META[s.scan_outcome] || {
                    label: s.scan_outcome || "—",
                    color: C.muted,
                  };
                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: i % 2 === 0 ? C.white : C.cream,
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 14px",
                          fontFamily: "monospace",
                          fontSize: "10px",
                          fontWeight: 600,
                        }}
                      >
                        {s.qr_code
                          ? s.qr_code.length > 24
                            ? s.qr_code.slice(0, 24) + "…"
                            : s.qr_code
                          : "—"}
                      </td>
                      <td style={{ padding: "8px 14px", fontSize: "11px" }}>
                        {tm.icon} {tm.label}
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <span
                          style={{
                            background: `${om.color}20`,
                            color: om.color,
                            padding: "2px 7px",
                            borderRadius: "2px",
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {om.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "8px 14px",
                          fontWeight: 600,
                          color: C.accent,
                        }}
                      >
                        {s.points_awarded > 0 ? `+${s.points_awarded}` : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 14px",
                          fontSize: "11px",
                          color: C.muted,
                        }}
                      >
                        {s.ip_province || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 14px",
                          fontFamily: "monospace",
                          fontSize: "10px",
                          color: C.muted,
                        }}
                      >
                        {s.user_id ? s.user_id.slice(0, 10) + "…" : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 14px",
                          fontSize: "11px",
                          color: C.muted,
                        }}
                      >
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
