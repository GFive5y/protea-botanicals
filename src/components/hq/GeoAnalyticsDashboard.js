// src/components/hq/GeoAnalyticsDashboard.js v1.0
// Phase 2: Full geo analytics — scan heatmap, province breakdown,
// stockist attribution, device split, churn risk, acquisition funnel.
// Plugs directly into HQDashboard.js as a tab component.

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { getScanGeoAnalytics } from "../../services/scanService";

// ── Tokens (match system design) ─────────────────────────────────────────────
const GEO_T = {
  bg: "#faf9f6",
  surface: "#ffffff",
  border: "#e8e0d4",
  green: "#1b4332",
  greenMid: "#2d6a4f",
  greenLight: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#888",
  faint: "#f4f0ea",
  red: "#dc2626",
  amber: "#f59e0b",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  serif: "'Inter','Helvetica Neue',Arial,sans-serif",
};

// ── SA Province colour map ─────────────────────────────────────────────────
const PROVINCE_COLORS = {
  Gauteng: "#1b4332",
  "Western Cape": "#2d6a4f",
  "KwaZulu-Natal": "#52b788",
  "Eastern Cape": "#b5935a",
  Limpopo: "#74c69d",
  Mpumalanga: "#40916c",
  "North West": "#d4a96a",
  "Free State": "#95d5b2",
  "Northern Cape": "#b7e4c7",
};

// ── Shared card styles ────────────────────────────────────────────────────────
const card = (extra = {}) => ({
  background: GEO_T.surface,
  border: `1px solid ${GEO_T.border}`,
  borderRadius: 10,
  padding: "20px 22px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)",
  ...extra,
});

const label = (extra = {}) => ({
  fontFamily: GEO_T.font,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#374151",
  marginBottom: 6,
  ...extra,
});

const bigNum = (color = GEO_T.green, extra = {}) => ({
  fontFamily: GEO_T.serif,
  fontSize: 32,
  fontWeight: 600,
  color,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  fontVariantNumeric: "tabular-nums",
  ...extra,
});

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ title, value, sub, color = GEO_T.green, accent, loading }) {
  return (
    <div style={card()}>
      <p style={label()}>{title}</p>
      {loading ? (
        <div
          style={{
            height: 36,
            background: GEO_T.faint,
            borderRadius: 2,
            animation: "pulse 1.5s infinite",
          }}
        />
      ) : (
        <p style={bigNum(color)}>{value}</p>
      )}
      {sub && (
        <p
          style={{
            fontFamily: GEO_T.font,
            fontSize: 11,
            color: accent || GEO_T.muted,
            marginTop: 6,
            fontWeight: 300,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function BarChart({ data, total, colorFn }) {
  if (!data || !Object.keys(data).length)
    return (
      <p
        style={{
          fontFamily: GEO_T.font,
          fontSize: 12,
          color: GEO_T.muted,
          fontWeight: 300,
        }}
      >
        No data yet
      </p>
    );
  const sorted = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const max = sorted[0]?.[1] || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map(([name, count]) => {
        const pct = Math.round((count / (total || max)) * 100);
        const barPct = Math.round((count / max) * 100);
        return (
          <div key={name}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span
                style={{
                  fontFamily: GEO_T.font,
                  fontSize: 12,
                  color: GEO_T.text,
                  fontWeight: 400,
                }}
              >
                {name}
              </span>
              <span
                style={{
                  fontFamily: GEO_T.font,
                  fontSize: 11,
                  color: GEO_T.muted,
                  fontWeight: 400,
                }}
              >
                {count} <span style={{ color: GEO_T.faint }}>·</span> {pct}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: GEO_T.faint,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${barPct}%`,
                  background: colorFn ? colorFn(name) : GEO_T.green,
                  borderRadius: 2,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments, size = 80 }) {
  // Simple CSS-based ring chart for device split
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  let cumulative = 0;
  const gradient = segments
    .map((s) => {
      const pct = (s.value / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return `${s.color} ${start}% ${cumulative}%`;
    })
    .join(", ");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          flexShrink: 0,
          background: `conic-gradient(${gradient})`,
          boxShadow: "inset 0 0 0 22px " + GEO_T.surface,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 1,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontFamily: GEO_T.font, fontSize: 12, color: GEO_T.text }}>
              {s.label}
            </span>
            <span
              style={{
                fontFamily: GEO_T.font,
                fontSize: 11,
                color: GEO_T.muted,
                fontWeight: 300,
              }}
            >
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChurnTable({ users }) {
  if (!users?.length)
    return (
      <p
        style={{
          fontFamily: GEO_T.font,
          fontSize: 12,
          color: GEO_T.muted,
          fontWeight: 300,
        }}
      >
        No churn risk accounts detected.
      </p>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {users.map((u, i) => (
        <div
          key={u.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom:
              i < users.length - 1 ? `1px solid ${GEO_T.border}` : "none",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: GEO_T.font,
                fontSize: 13,
                color: GEO_T.text,
                fontWeight: 400,
                marginBottom: 2,
              }}
            >
              {u.full_name || u.email || "Anonymous"}
            </p>
            <p
              style={{
                fontFamily: GEO_T.font,
                fontSize: 11,
                color: GEO_T.muted,
                fontWeight: 300,
              }}
            >
              {u.province || "—"} · {u.total_scans || 0} scans ·{" "}
              {u.loyalty_points || 0} pts
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: GEO_T.font,
                fontSize: 9,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 2,
                background: "rgba(245,158,11,0.1)",
                color: GEO_T.amber,
                border: `1px solid rgba(245,158,11,0.2)`,
              }}
            >
              {u.last_active_at
                ? `${Math.floor((Date.now() - new Date(u.last_active_at)) / 86400000)}d inactive`
                : "Never active"}
            </span>
            <span
              style={{
                fontFamily: GEO_T.font,
                fontSize: 11,
                color: GEO_T.muted,
                fontWeight: 300,
              }}
            >
              {u.loyalty_tier?.toUpperCase() || "BRONZE"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RetailerHealthTable({ retailers }) {
  if (!retailers?.length)
    return (
      <p
        style={{
          fontFamily: GEO_T.font,
          fontSize: 12,
          color: GEO_T.muted,
          fontWeight: 300,
        }}
      >
        No retailer data yet.
      </p>
    );
  const scoreColor = (s) =>
    s >= 70 ? GEO_T.greenLight : s >= 40 ? GEO_T.amber : GEO_T.red;
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          gap: "0 12px",
          padding: "0 0 8px",
          borderBottom: `1px solid ${GEO_T.border}`,
          marginBottom: 4,
        }}
      >
        {["Retailer", "City", "Tier", "Health", "Activation"].map((h) => (
          <span key={h} style={label()}>
            {h}
          </span>
        ))}
      </div>
      {retailers.map((r, i) => (
        <div
          key={r.tenant_id}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            gap: "0 12px",
            padding: "10px 0",
            borderBottom:
              i < retailers.length - 1 ? `1px solid ${GEO_T.border}` : "none",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: GEO_T.font, fontSize: 13, color: GEO_T.text }}>
            {r.retailer_name}
          </span>
          <span
            style={{
              fontFamily: GEO_T.font,
              fontSize: 12,
              color: GEO_T.muted,
              fontWeight: 300,
            }}
          >
            {r.location_city || "—"}
          </span>
          <span
            style={{
              fontFamily: GEO_T.font,
              fontSize: 9,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: GEO_T.gold,
              padding: "2px 6px",
              background: "rgba(181,147,90,0.1)",
              borderRadius: 2,
              display: "inline-block",
            }}
          >
            {r.tier || "starter"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                flex: 1,
                height: 3,
                background: GEO_T.faint,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${r.health_score || 0}%`,
                  background: scoreColor(r.health_score || 0),
                  transition: "width 0.5s",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: GEO_T.font,
                fontSize: 11,
                color: scoreColor(r.health_score || 0),
                fontWeight: 500,
                minWidth: 24,
              }}
            >
              {r.health_score || 0}
            </span>
          </div>
          <span style={{ fontFamily: GEO_T.font, fontSize: 12, color: GEO_T.text }}>
            {r.activation_rate
              ? `${Math.round(r.activation_rate * 100)}%`
              : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function GeoAnalyticsDashboard() {
  const [period, setPeriod] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [churnUsers, setChurnUsers] = useState([]);
  const [acquisition, setAcquisition] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetchAll();
  }, [period]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([
      fetchAnalytics(),
      fetchRetailers(),
      fetchChurnUsers(),
      fetchAcquisition(),
    ]);
    setLoading(false);
  }

  async function fetchAnalytics() {
    const data = await getScanGeoAnalytics(period);
    setAnalytics(data);
  }

  async function fetchRetailers() {
    const { data } = await supabase
      .from("retailer_performance")
      .select("*")
      .order("health_score", { ascending: false })
      .limit(20);
    setRetailers(data || []);
  }

  async function fetchChurnUsers() {
    const { data } = await supabase
      .from("user_profiles")
      .select(
        "id, full_name, email, province, total_scans, loyalty_points, loyalty_tier, last_active_at",
      )
      .eq("churn_risk", true)
      .order("last_active_at", { ascending: true })
      .limit(15);
    setChurnUsers(data || []);
  }

  async function fetchAcquisition() {
    const { data } = await supabase
      .from("customer_acquisition")
      .select("*")
      .order("signup_week", { ascending: false })
      .limit(12);
    setAcquisition(data || []);
  }

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const deviceSegments = useMemo(() => {
    if (!analytics?.byDevice) return [];
    const d = analytics.byDevice;
    return [
      { label: "Mobile", value: d.mobile || 0, color: GEO_T.green },
      { label: "Desktop", value: d.desktop || 0, color: GEO_T.gold },
      { label: "Tablet", value: d.tablet || 0, color: GEO_T.greenLight },
    ].filter((s) => s.value > 0);
  }, [analytics]);

  const demandGaps = useMemo(() => {
    // Cities with scan density but no nearby stockist attribution
    if (!analytics?.byCity || !retailers?.length) return [];
    const stockistCities = new Set(
      retailers.map((r) => r.location_city).filter(Boolean),
    );
    return Object.entries(analytics.byCity || {})
      .filter(([city, count]) => count >= 5 && !stockistCities.has(city))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [analytics, retailers]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "geo", label: "Geography" },
    { id: "retailers", label: "Retailers" },
    { id: "acquisition", label: "Acquisition" },
    {
      id: "churn",
      label: `Churn Risk ${churnUsers.length ? `(${churnUsers.length})` : ""}`,
    },
    { id: "gaps", label: "Demand Gaps" },
  ];

  // ── Period selector + tabs header ──────────────────────────────────────────
  return (
    <div style={{ fontFamily: GEO_T.font }}>
      <style>{`
        
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .geo-tab-btn { background:none; border:none; cursor:pointer; padding:8px 14px; font-family:${GEO_T.font}; font-size:11px; letter-spacing:0.15em; text-transform:uppercase; transition:all 0.2s; border-bottom: 2px solid transparent; }
        .geo-tab-btn:hover { color: ${GEO_T.green}; }
        .geo-tab-active { color: ${GEO_T.green}; border-bottom-color: ${GEO_T.green}; font-weight:500; }
        .geo-tab-inactive { color: ${GEO_T.muted}; }
        .period-btn { background:none; border:1px solid ${GEO_T.border}; border-radius:2px; padding:5px 12px; font-family:${GEO_T.font}; font-size:10px; letter-spacing:0.15em; text-transform:uppercase; cursor:pointer; transition:all 0.2s; }
        .period-active { background:${GEO_T.green}; color:white; border-color:${GEO_T.green}; }
        .period-inactive { color:${GEO_T.muted}; }
        .geo-grid { display:grid; gap:16px; }
        @media(min-width:700px) { .stat-grid { grid-template-columns: repeat(4, 1fr); } .two-col { grid-template-columns: 1fr 1fr; } }
        @media(max-width:699px) { .stat-grid { grid-template-columns: repeat(2,1fr); } .two-col { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: GEO_T.serif,
                fontSize: 22,
                fontWeight: 600,
                color: GEO_T.text,
                marginBottom: 4,
                letterSpacing: "-0.01em",
              }}
            >
              Geo & Analytics
            </h2>
            <p style={{ fontSize: 12, color: GEO_T.muted, fontWeight: 300 }}>
              Real-time scan intelligence · {analytics?.total || 0} scans in
              last {period} days
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                className={`period-btn ${period === d ? "period-active" : "period-inactive"}`}
                onClick={() => setPeriod(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: `1px solid ${GEO_T.border}`,
            overflowX: "auto",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`geo-tab-btn ${tab === t.id ? "geo-tab-active" : "geo-tab-inactive"}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {tab === "overview" && (
        <div>
          <div className="geo-grid stat-grid" style={{ marginBottom: 20 }}>
            <StatCard
              title="Total Scans"
              value={analytics?.total?.toLocaleString() || "0"}
              sub={`Last ${period} days`}
              loading={loading}
            />
            <StatCard
              title="First Scans"
              value={analytics?.firstScans?.toLocaleString() || "0"}
              sub="Unique product verifications"
              color={GEO_T.greenMid}
              loading={loading}
            />
            <StatCard
              title="GPS Consent"
              value={`${analytics?.gpsConsent || 0}%`}
              sub="Users sharing precise location"
              color={GEO_T.gold}
              loading={loading}
            />
            <StatCard
              title="Flagged Scans"
              value={analytics?.flagged?.toLocaleString() || "0"}
              sub="Anomaly detections"
              color={analytics?.flagged > 0 ? GEO_T.amber : GEO_T.muted}
              loading={loading}
            />
          </div>

          <div className="geo-grid two-col" style={{ marginBottom: 20 }}>
            <div style={card()}>
              <p style={label({ marginBottom: 16 })}>Device Split</p>
              {loading ? (
                <div
                  style={{ height: 80, background: GEO_T.faint, borderRadius: 2 }}
                />
              ) : (
                <DonutChart segments={deviceSegments} />
              )}
            </div>
            <div style={card()}>
              <p style={label({ marginBottom: 16 })}>Top Province</p>
              {loading ? (
                <div
                  style={{ height: 80, background: GEO_T.faint, borderRadius: 2 }}
                />
              ) : (
                <>
                  <p
                    style={{
                      fontFamily: GEO_T.serif,
                      fontSize: 24,
                      fontWeight: 600,
                      color: GEO_T.green,
                      marginBottom: 6,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {analytics?.topProvince || "—"}
                  </p>
                  <p
                    style={{
                      fontFamily: GEO_T.font,
                      fontSize: 12,
                      color: GEO_T.muted,
                      fontWeight: 300,
                    }}
                  >
                    {analytics?.byProvince?.[
                      analytics.topProvince
                    ]?.toLocaleString() || 0}{" "}
                    scans · {analytics?.topCity || "—"} top city
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="geo-grid two-col">
            <div style={card()}>
              <p style={label({ marginBottom: 16 })}>Churn Risk Accounts</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <p
                  style={{
                    fontFamily: GEO_T.serif,
                    fontSize: 36,
                    fontWeight: 300,
                    color: churnUsers.length > 0 ? GEO_T.amber : GEO_T.green,
                    lineHeight: 1,
                  }}
                >
                  {churnUsers.length}
                </p>
                <p
                  style={{
                    fontFamily: GEO_T.font,
                    fontSize: 12,
                    color: GEO_T.muted,
                    fontWeight: 300,
                    lineHeight: 1.6,
                  }}
                >
                  {churnUsers.length === 0
                    ? "No at-risk accounts"
                    : "Inactive 45+ days · Win-back campaigns needed"}
                </p>
              </div>
            </div>
            <div style={card()}>
              <p style={label({ marginBottom: 16 })}>Demand Gaps Identified</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <p
                  style={{
                    fontFamily: GEO_T.serif,
                    fontSize: 36,
                    fontWeight: 300,
                    color: demandGaps.length > 0 ? GEO_T.gold : GEO_T.green,
                    lineHeight: 1,
                  }}
                >
                  {demandGaps.length}
                </p>
                <p
                  style={{
                    fontFamily: GEO_T.font,
                    fontSize: 12,
                    color: GEO_T.muted,
                    fontWeight: 300,
                    lineHeight: 1.6,
                  }}
                >
                  {demandGaps.length === 0
                    ? "Full coverage"
                    : "Cities scanning without a nearby stockist"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: GEOGRAPHY ── */}
      {tab === "geo" && (
        <div className="geo-grid two-col">
          <div style={card()}>
            <p style={label({ marginBottom: 16 })}>Scans by Province</p>
            <BarChart
              data={analytics?.byProvince}
              total={analytics?.total}
              colorFn={(name) => PROVINCE_COLORS[name] || GEO_T.green}
            />
          </div>
          <div style={card()}>
            <p style={label({ marginBottom: 16 })}>Scans by City — Top 8</p>
            <BarChart data={analytics?.byCity} total={analytics?.total} />
          </div>
          <div style={card()}>
            <p style={label({ marginBottom: 16 })}>Location Source Quality</p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 8,
              }}
            >
              {[
                {
                  label: "GPS (precise)",
                  value:
                    analytics?.raw?.filter((s) => s.location_source === "gps")
                      .length || 0,
                  color: GEO_T.green,
                },
                {
                  label: "IP (city-level)",
                  value:
                    analytics?.raw?.filter((s) => s.location_source === "ip")
                      .length || 0,
                  color: GEO_T.gold,
                },
                {
                  label: "No location",
                  value:
                    analytics?.raw?.filter((s) => s.location_source === "none")
                      .length || 0,
                  color: GEO_T.border,
                },
              ].map((row) => {
                const pct = analytics?.total
                  ? Math.round((row.value / analytics.total) * 100)
                  : 0;
                return (
                  <div key={row.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: GEO_T.font,
                          fontSize: 12,
                          color: GEO_T.text,
                        }}
                      >
                        {row.label}
                      </span>
                      <span
                        style={{
                          fontFamily: GEO_T.font,
                          fontSize: 11,
                          color: GEO_T.muted,
                          fontWeight: 300,
                        }}
                      >
                        {row.value} · {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: GEO_T.faint,
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: row.color,
                          borderRadius: 2,
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={card()}>
            <p style={label({ marginBottom: 16 })}>Devices</p>
            <DonutChart segments={deviceSegments} size={90} />
          </div>
        </div>
      )}

      {/* ── TAB: RETAILERS ── */}
      {tab === "retailers" && (
        <div style={card({ overflowX: "auto" })}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <p style={label()}>Retailer Health — {retailers.length} accounts</p>
            <span
              style={{
                fontFamily: GEO_T.font,
                fontSize: 10,
                color: GEO_T.muted,
                fontWeight: 300,
              }}
            >
              Health score 0–100 · Updated weekly
            </span>
          </div>
          <RetailerHealthTable retailers={retailers} />
        </div>
      )}

      {/* ── TAB: ACQUISITION ── */}
      {tab === "acquisition" && (
        <div className="geo-grid two-col">
          <div style={card()}>
            <p style={label({ marginBottom: 16 })}>Signups by Channel</p>
            <BarChart
              data={acquisition.reduce((acc, row) => {
                const ch = row.acquisition_channel || "unknown";
                acc[ch] = (acc[ch] || 0) + (row.signups || 0);
                return acc;
              }, {})}
              total={acquisition.reduce((a, r) => a + (r.signups || 0), 0)}
            />
          </div>
          <div style={card()}>
            <p style={label({ marginBottom: 16 })}>Signups by Province</p>
            <BarChart
              data={acquisition.reduce((acc, row) => {
                const p = row.province || "Unknown";
                acc[p] = (acc[p] || 0) + (row.signups || 0);
                return acc;
              }, {})}
              total={acquisition.reduce((a, r) => a + (r.signups || 0), 0)}
              colorFn={(name) => PROVINCE_COLORS[name] || GEO_T.green}
            />
          </div>
          <div style={card()}>
            <p style={label({ marginBottom: 16 })}>
              Strain Preference Breakdown
            </p>
            <BarChart
              data={acquisition.reduce((acc, row) => {
                const p = row.preferred_type || "Not set";
                acc[p] = (acc[p] || 0) + (row.signups || 0);
                return acc;
              }, {})}
              total={acquisition.reduce((a, r) => a + (r.signups || 0), 0)}
            />
          </div>
          <div style={card()}>
            <p style={label({ marginBottom: 16 })}>Profile Completeness</p>
            {(() => {
              const total = acquisition.reduce(
                (a, r) => a + (r.signups || 0),
                0,
              );
              const complete = acquisition.reduce(
                (a, r) => a + (r.complete_profiles || 0),
                0,
              );
              const pct = total ? Math.round((complete / total) * 100) : 0;
              return (
                <>
                  <p
                    style={{
                      fontFamily: GEO_T.serif,
                      fontSize: 40,
                      fontWeight: 300,
                      color: GEO_T.green,
                      lineHeight: 1,
                      marginBottom: 10,
                    }}
                  >
                    {pct}%
                  </p>
                  <div
                    style={{
                      height: 4,
                      background: GEO_T.faint,
                      borderRadius: 2,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: GEO_T.green,
                        borderRadius: 2,
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontFamily: GEO_T.font,
                      fontSize: 11,
                      color: GEO_T.muted,
                      fontWeight: 300,
                    }}
                  >
                    {complete} of {total} accounts fully profiled
                  </p>
                  <p
                    style={{
                      fontFamily: GEO_T.font,
                      fontSize: 11,
                      color: GEO_T.muted,
                      fontWeight: 300,
                      marginTop: 4,
                    }}
                  >
                    Avg{" "}
                    {(
                      acquisition.reduce(
                        (a, r) => a + (r.avg_scans_per_user || 0),
                        0,
                      ) / (acquisition.length || 1)
                    ).toFixed(1)}{" "}
                    scans per user
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── TAB: CHURN RISK ── */}
      {tab === "churn" && (
        <div>
          <div
            style={{
              ...card(),
              marginBottom: 16,
              background: "rgba(245,158,11,0.04)",
              borderColor: "rgba(245,158,11,0.25)",
            }}
          >
            <p
              style={{
                fontFamily: GEO_T.font,
                fontSize: 13,
                color: "#92400e",
                fontWeight: 400,
                marginBottom: 4,
              }}
            >
              🔔 {churnUsers.length} account{churnUsers.length !== 1 ? "s" : ""}{" "}
              flagged as churn risk
            </p>
            <p
              style={{
                fontFamily: GEO_T.font,
                fontSize: 12,
                color: GEO_T.muted,
                fontWeight: 300,
              }}
            >
              These users have not scanned in 45+ days. Trigger a win-back email
              with 150 bonus points to re-engage them. Churn risk is
              recalculated nightly via the{" "}
              <code
                style={{
                  fontSize: 11,
                  background: GEO_T.faint,
                  padding: "1px 4px",
                  borderRadius: 2,
                }}
              >
                flag_churn_risk()
              </code>{" "}
              database function.
            </p>
          </div>
          <div style={card()}>
            <ChurnTable users={churnUsers} />
          </div>
        </div>
      )}

      {/* ── TAB: DEMAND GAPS ── */}
      {tab === "gaps" && (
        <div>
          <div
            style={{
              ...card(),
              marginBottom: 16,
              background: "rgba(181,147,90,0.04)",
              borderColor: "rgba(181,147,90,0.25)",
            }}
          >
            <p
              style={{
                fontFamily: GEO_T.font,
                fontSize: 13,
                color: "#78350f",
                fontWeight: 400,
                marginBottom: 4,
              }}
            >
              📍 Demand without supply — {demandGaps.length} cities identified
            </p>
            <p
              style={{
                fontFamily: GEO_T.font,
                fontSize: 12,
                color: GEO_T.muted,
                fontWeight: 300,
              }}
            >
              These cities have 5+ scans in the last {period} days but no
              registered stockist nearby. Each represents an open wholesale
              opportunity.
            </p>
          </div>
          {demandGaps.length === 0 ? (
            <div style={card()}>
              <p
                style={{
                  fontFamily: GEO_T.font,
                  fontSize: 13,
                  color: GEO_T.muted,
                  fontWeight: 300,
                }}
              >
                No demand gaps detected in this period. All scan clusters have a
                nearby stockist.
              </p>
            </div>
          ) : (
            <div style={card()}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr",
                  gap: "0 16px",
                  padding: "0 0 8px",
                  borderBottom: `1px solid ${GEO_T.border}`,
                  marginBottom: 4,
                }}
              >
                {["City", "Scans", "Opportunity"].map((h) => (
                  <span key={h} style={label()}>
                    {h}
                  </span>
                ))}
              </div>
              {demandGaps.map(([city, count], i) => (
                <div
                  key={city}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr",
                    gap: "0 16px",
                    padding: "10px 0",
                    borderBottom:
                      i < demandGaps.length - 1
                        ? `1px solid ${GEO_T.border}`
                        : "none",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: GEO_T.font,
                      fontSize: 13,
                      color: GEO_T.text,
                      fontWeight: 400,
                    }}
                  >
                    {city}
                  </span>
                  <span
                    style={{
                      fontFamily: GEO_T.serif,
                      fontSize: 20,
                      fontWeight: 300,
                      color: GEO_T.gold,
                    }}
                  >
                    {count}
                  </span>
                  <span
                    style={{
                      fontFamily: GEO_T.font,
                      fontSize: 10,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: GEO_T.green,
                      padding: "3px 8px",
                      background: "rgba(27,67,50,0.06)",
                      borderRadius: 2,
                      display: "inline-block",
                    }}
                  >
                    Sales Lead
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
