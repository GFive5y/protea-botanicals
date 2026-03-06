// src/pages/AdminAnalytics.js
// Protea Botanicals — Scan Analytics Dashboard Component
// v1.0 — Source tracking analytics: summary cards, source breakdown, recent scans
// Imported by AdminDashboard.js (same pattern as AdminQrGenerator)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

// ─── Design Tokens (match AdminDashboard) ───
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
  lightGreen: "#d4edda",
  lightBlue: "#d6eaf8",
  lightGold: "#fef9e7",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ─── Source label + color mapping ───
const SOURCE_META = {
  direct: { label: "Direct Scan", color: C.blue, icon: "📱" },
  promo: { label: "Promo Campaign", color: C.gold, icon: "📢" },
  loyalty: { label: "Loyalty Flow", color: C.accent, icon: "⭐" },
  verify: { label: "Verification", color: C.mid, icon: "✅" },
};

function getSourceMeta(source) {
  return SOURCE_META[source] || { label: source, color: C.muted, icon: "🔗" };
}

// ─── Format date with time ───
function fmtDateTime(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    const date = dt.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
    });
    const time = dt.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date} · ${time}`;
  } catch {
    return "—";
  }
}

// ─── Stat Card (local copy to stay self-contained) ───
function StatCard({ label, value, sub, color = C.green, icon }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "20px",
        flex: "1 1 180px",
        minWidth: "160px",
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
      {sub && (
        <div
          style={{
            fontSize: "12px",
            color: C.muted,
            fontFamily: FONTS.body,
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalScans: 0,
    todayScans: 0,
    weekScans: 0,
    monthScans: 0,
    bySource: [],
    recentScans: [],
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // ── Total scans ──
      const { count: totalScans } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true });

      // ── Today ──
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayScans } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .gte("scan_date", todayStart.toISOString());

      // ── This week ──
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const { count: weekScans } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .gte("scan_date", weekStart.toISOString());

      // ── This month ──
      const monthStart = new Date();
      monthStart.setDate(monthStart.getDate() - 30);
      const { count: monthScans } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .gte("scan_date", monthStart.toISOString());

      // ── By source (aggregate client-side for flexibility) ──
      const { data: allScans } = await supabase
        .from("scans")
        .select("source, scan_date");

      const sourceMap = {};
      (allScans || []).forEach((s) => {
        const src = s.source || "direct";
        if (!sourceMap[src]) sourceMap[src] = { count: 0, lastScan: null };
        sourceMap[src].count++;
        if (!sourceMap[src].lastScan || s.scan_date > sourceMap[src].lastScan) {
          sourceMap[src].lastScan = s.scan_date;
        }
      });

      const bySource = Object.entries(sourceMap)
        .map(([source, info]) => ({
          source,
          count: info.count,
          lastScan: info.lastScan,
          pct:
            totalScans > 0
              ? ((info.count / (totalScans || 1)) * 100).toFixed(1)
              : "0",
        }))
        .sort((a, b) => b.count - a.count);

      // ── Recent scans (last 20) with joins ──
      const { data: recent, error: recentErr } = await supabase
        .from("scans")
        .select("id, source, scan_date, product_id, user_id, products(qr_code)")
        .order("scan_date", { ascending: false })
        .limit(20);

      if (recentErr) {
        console.error("Recent scans fetch error:", recentErr);
      }

      setData({
        totalScans: totalScans || 0,
        todayScans: todayScans || 0,
        weekScans: weekScans || 0,
        monthScans: monthScans || 0,
        bySource,
        recentScans: recent || [],
      });
    } catch (err) {
      console.error("Scan analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ─── Loading ───
  if (loading) {
    return (
      <div
        style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}
      >
        Loading scan analytics...
      </div>
    );
  }

  // ─── RENDER ───
  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* ── Header ── */}
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
          Refresh Data
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "32px",
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

      {/* ── Source Breakdown ── */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          marginBottom: "32px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.green,
              fontFamily: FONTS.body,
            }}
          >
            Scan Source Breakdown
          </div>
        </div>

        {data.bySource.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: C.muted,
              fontSize: "14px",
            }}
          >
            No scans recorded yet. Scans will appear here once customers start
            scanning QR codes.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ background: C.green, color: C.white }}>
                {["Source", "Scans", "% of Total", "Last Scan"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: "10px",
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
              {data.bySource.map((row, i) => {
                const meta = getSourceMeta(row.source);
                return (
                  <tr
                    key={row.source}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: i % 2 === 0 ? C.white : C.cream,
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span style={{ fontSize: "16px" }}>{meta.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: C.green }}>
                            {meta.label}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: C.muted,
                              fontFamily: "monospace",
                            }}
                          >
                            ?source={row.source}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontWeight: 700,
                        fontSize: "16px",
                      }}
                    >
                      {row.count}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            background: C.border,
                            borderRadius: "4px",
                            height: "8px",
                            width: "80px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              background: meta.color,
                              height: "100%",
                              width: `${row.pct}%`,
                              borderRadius: "4px",
                              transition: "width 0.6s ease-out",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "12px", color: C.muted }}>
                          {row.pct}%
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "12px",
                        color: C.muted,
                      }}
                    >
                      {fmtDateTime(row.lastScan)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Recent Scans ── */}
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
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.green,
              fontFamily: FONTS.body,
            }}
          >
            Recent Scans (Last 20)
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
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: C.green, color: C.white }}>
                  {["QR Code", "Source", "User ID", "Date & Time"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: "10px",
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
                {data.recentScans.map((scan, i) => {
                  const meta = getSourceMeta(scan.source || "direct");
                  return (
                    <tr
                      key={scan.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: i % 2 === 0 ? C.white : C.cream,
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 16px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {scan.products?.qr_code ||
                          scan.product_id?.substring(0, 8) + "..." ||
                          "—"}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span
                          style={{
                            background: meta.color,
                            color: C.white,
                            padding: "3px 10px",
                            borderRadius: "2px",
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontFamily: FONTS.body,
                          }}
                        >
                          {scan.source || "direct"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontFamily: "monospace",
                          fontSize: "11px",
                          color: C.muted,
                        }}
                      >
                        {scan.user_id
                          ? scan.user_id.substring(0, 12) + "..."
                          : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: "12px",
                          color: C.muted,
                        }}
                      >
                        {fmtDateTime(scan.scan_date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Campaign URL Guide ── */}
      <div
        style={{
          marginTop: "32px",
          background: C.lightGold,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: C.green,
            marginBottom: "12px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Campaign Source Tracking Guide
        </div>
        <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 8px" }}>
            Append{" "}
            <code
              style={{
                background: C.white,
                padding: "2px 6px",
                borderRadius: "2px",
              }}
            >
              ?source=
            </code>{" "}
            to any scan URL to track where scans come from:
          </p>
          <div
            style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: 2 }}
          >
            <div>
              <span style={{ color: C.gold }}>Promo:</span>{" "}
              /scan/PB-001-2026-0001<strong>?source=promo</strong>
            </div>
            <div>
              <span style={{ color: C.accent }}>Loyalty:</span>{" "}
              /scan/PB-001-2026-0001<strong>?source=loyalty</strong>
            </div>
            <div>
              <span style={{ color: C.mid }}>Verify:</span>{" "}
              /scan/PB-001-2026-0001<strong>?source=verify</strong>
            </div>
            <div>
              <span style={{ color: C.blue }}>Default:</span>{" "}
              /scan/PB-001-2026-0001{" "}
              <span style={{ color: C.muted }}>(no param = "direct")</span>
            </div>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: "12px", color: C.muted }}>
            Use the Smart QR tab to generate campaign URLs with source tracking
            built in.
          </p>
        </div>
      </div>
    </div>
  );
}
