// src/components/AdminCustomerEngagement.js
// v1.0 — March 2026
// WP7 — Customer Engagement Layer
//
// Features:
//   - Customer list with engagement score, tier, churn risk flag
//   - Engagement score calculation from live data (scans, points, recency, profile)
//   - Churn risk detection: no scan in 30d + low points
//   - Tier display: Bronze / Silver / Gold / Platinum from loyalty_points
//   - Customer detail modal: full profile, scan history, loyalty transactions
//   - Bulk flags: mark churn risk, recalculate engagement scores
//   - Filter: All / At Risk / Active / By Tier
//   - Stats: total customers, avg engagement, churn risk count, opt-in rate

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  white: "#fff",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  orange: "#e67e22",
  lightOrange: "#fef9f0",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  platinum: "#7b68ee",
  lightPlatinum: "#f0eeff",
  lightGreen: "#eafaf1",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ── Tier config (based on loyalty_points) ────────────────────────────────
const TIERS = {
  platinum: {
    label: "Platinum",
    min: 1000,
    color: C.platinum,
    bg: C.lightPlatinum,
    icon: "💎",
  },
  gold: { label: "Gold", min: 500, color: C.gold, bg: "#fef9e7", icon: "🥇" },
  silver: {
    label: "Silver",
    min: 200,
    color: "#8e9ba8",
    bg: "#f4f6f8",
    icon: "🥈",
  },
  bronze: {
    label: "Bronze",
    min: 0,
    color: "#a0674b",
    bg: "#fdf3ee",
    icon: "🥉",
  },
};

function getTier(points) {
  if (points >= 1000) return "platinum";
  if (points >= 500) return "gold";
  if (points >= 200) return "silver";
  return "bronze";
}
function getTierCfg(points) {
  return TIERS[getTier(points)];
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function daysSince(d) {
  if (!d) return null;
  return Math.floor((new Date() - new Date(d)) / 86400000);
}

const inputStyle = {
  padding: "9px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 13,
  fontFamily: FONTS.body,
  backgroundColor: C.white,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};
const makeBtn = (bg = C.mid, color = C.white, disabled = false) => ({
  padding: "9px 18px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: "none",
  borderRadius: 2,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: FONTS.body,
  opacity: disabled ? 0.6 : 1,
});

// ── Engagement score calculator ───────────────────────────────────────────
// Max 100 pts:
//   Recency (last scan)   30 pts
//   Scan volume           25 pts
//   Points balance        20 pts
//   Profile completeness  15 pts
//   Opt-ins               10 pts
function calcEngagement(profile, recentScans) {
  const now = new Date();
  const days = profile.last_active_at ? daysSince(profile.last_active_at) : 999;

  // Recency (30)
  let recency = 0;
  if (days <= 7) recency = 30;
  else if (days <= 14) recency = 24;
  else if (days <= 30) recency = 16;
  else if (days <= 60) recency = 8;
  else if (days <= 90) recency = 3;

  // Scan volume (25) — total_scans
  const scans = profile.total_scans || 0;
  const scanScore = Math.min(25, Math.round((scans / 20) * 25));

  // Points balance (20)
  const pts = profile.loyalty_points || 0;
  const pointScore = Math.min(20, Math.round((pts / 500) * 20));

  // Profile completeness (15)
  let profScore = 0;
  if (profile.full_name) profScore += 3;
  if (profile.phone) profScore += 3;
  if (profile.date_of_birth) profScore += 2;
  if (profile.province) profScore += 2;
  if (profile.gender) profScore += 2;
  if (profile.profile_complete) profScore += 3;
  profScore = Math.min(15, profScore);

  // Opt-ins (10)
  let optScore = 0;
  if (profile.popia_consented) optScore += 4;
  if (profile.marketing_opt_in) optScore += 3;
  if (profile.analytics_opt_in) optScore += 3;
  optScore = Math.min(10, optScore);

  const total = recency + scanScore + pointScore + profScore + optScore;
  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: {
      recency: { score: recency, max: 30, label: "Recency (last active)" },
      scans: { score: scanScore, max: 25, label: "Scan volume" },
      points: { score: pointScore, max: 20, label: "Points balance" },
      profile: { score: profScore, max: 15, label: "Profile completeness" },
      optins: { score: optScore, max: 10, label: "Opt-ins & consents" },
    },
  };
}

// Churn risk: no activity in 45d OR (low points AND no scans in 30d)
function isChurnRisk(profile) {
  const days = daysSince(profile.last_active_at);
  const lowPoints = (profile.loyalty_points || 0) < 50;
  const inactiveScans = (profile.total_scans || 0) === 0;
  return (days !== null && days > 45) || (lowPoints && inactiveScans);
}

// ── Tier Badge ────────────────────────────────────────────────────────────
function TierBadge({ points }) {
  const t = getTierCfg(points || 0);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        backgroundColor: t.bg,
        color: t.color,
        border: `1px solid ${t.color}40`,
      }}
    >
      {t.icon} {t.label}
    </span>
  );
}

// ── Engagement Score Bar ──────────────────────────────────────────────────
function EngBar({ score }) {
  const color = score >= 70 ? C.accent : score >= 40 ? C.gold : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{ flex: 1, height: 5, background: C.border, borderRadius: 3 }}
      >
        <div
          style={{
            height: "100%",
            width: `${score}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 28 }}>
        {score}
      </span>
    </div>
  );
}

// ── Customer Detail Modal ─────────────────────────────────────────────────
function CustomerModal({ customer, transactions, onClose }) {
  if (!customer) return null;
  const eng = calcEngagement(customer, []);
  const tier = getTierCfg(customer.loyalty_points || 0);
  const atRisk = isChurnRisk(customer);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 2,
          padding: 32,
          maxWidth: 600,
          width: "90%",
          maxHeight: "88vh",
          overflowY: "auto",
          fontFamily: FONTS.body,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 26,
                color: C.green,
              }}
            >
              {customer.full_name || "Anonymous User"}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {customer.city}
              {customer.province ? `, ${customer.province}` : ""}
              {customer.acquisition_channel
                ? ` · via ${customer.acquisition_channel}`
                : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: C.muted,
            }}
          >
            ×
          </button>
        </div>

        {/* Score + tier strip */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              background: tier.bg,
              borderRadius: 2,
              flex: 1,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Tier
            </div>
            <TierBadge points={customer.loyalty_points || 0} />
          </div>
          <div
            style={{
              padding: "12px 16px",
              background: C.cream,
              borderRadius: 2,
              flex: 1,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Points
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 24,
                color: C.gold,
                fontWeight: 600,
              }}
            >
              {(customer.loyalty_points || 0).toLocaleString()}
            </div>
          </div>
          <div
            style={{
              padding: "12px 16px",
              background: eng.total >= 50 ? C.lightGreen : C.lightRed,
              borderRadius: 2,
              flex: 1,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Engagement
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 24,
                color:
                  eng.total >= 70
                    ? C.accent
                    : eng.total >= 40
                      ? C.orange
                      : C.red,
                fontWeight: 600,
              }}
            >
              {eng.total}/100
            </div>
          </div>
          {atRisk && (
            <div
              style={{
                padding: "12px 16px",
                background: C.lightRed,
                borderRadius: 2,
                flex: 1,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: C.red,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Status
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
                ⚠ Churn Risk
              </div>
            </div>
          )}
        </div>

        {/* Engagement breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.muted,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Engagement Breakdown
          </div>
          {Object.values(eng.breakdown).map((b) => (
            <div key={b.label} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span style={{ fontSize: 12, color: C.text }}>{b.label}</span>
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: C.accent }}
                >
                  {b.score}/{b.max}
                </span>
              </div>
              <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${b.max > 0 ? (b.score / b.max) * 100 : 0}%`,
                    background: C.accent,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Profile grid */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.muted,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Profile
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Phone", value: customer.phone },
            { label: "Gender", value: customer.gender },
            { label: "Date of Birth", value: fmtDate(customer.date_of_birth) },
            { label: "Total Scans", value: customer.total_scans || 0 },
            { label: "Last Active", value: fmtDate(customer.last_active_at) },
            { label: "Member Since", value: fmtDate(customer.created_at) },
            {
              label: "Marketing Opt-in",
              value: customer.marketing_opt_in ? "✓ Yes" : "✗ No",
            },
            {
              label: "Analytics Opt-in",
              value: customer.analytics_opt_in ? "✓ Yes" : "✗ No",
            },
            { label: "Preferred Type", value: customer.preferred_type },
            { label: "How Heard", value: customer.how_heard },
            { label: "Referral Code", value: customer.referral_code },
            {
              label: "Lifetime Spend",
              value: customer.lifetime_spend
                ? `R${customer.lifetime_spend}`
                : "—",
            },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                padding: "8px 10px",
                background: C.cream,
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: C.muted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {k.label}
              </div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                {k.value || "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        {transactions.length > 0 && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Recent Loyalty Transactions
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                marginBottom: 20,
              }}
            >
              <thead>
                <tr>
                  {["Date", "Type", "Points", "Description"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        fontSize: 9,
                        color: C.muted,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((t) => (
                  <tr key={t.id}>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: 11,
                        color: C.muted,
                      }}
                    >
                      {fmtDate(t.transaction_date)}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 2,
                          background: t.points > 0 ? C.lightGreen : C.lightRed,
                          color: t.points > 0 ? C.accent : C.red,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {t.transaction_type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${C.border}`,
                        fontWeight: 700,
                        color: t.points > 0 ? C.accent : C.red,
                      }}
                    >
                      {t.points > 0 ? "+" : ""}
                      {t.points}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom: `1px solid ${C.border}`,
                        color: C.muted,
                        fontSize: 11,
                      }}
                    >
                      {t.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <button
          onClick={onClose}
          style={{ ...makeBtn(C.green), width: "100%" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminCustomerEngagement() {
  const [customers, setCustomers] = useState([]);
  const [engScores, setEngScores] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [modalTxns, setModalTxns] = useState([]);
  const [filter, setFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [sortBy, setSortBy] = useState("engagement");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, txnRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("*")
          .eq("role", "customer")
          .order("created_at", { ascending: false }),
        supabase
          .from("loyalty_transactions")
          .select(
            "id,user_id,points,transaction_type,description,transaction_date,source",
          )
          .order("transaction_date", { ascending: false }),
      ]);

      const custs = custRes.data || [];
      const txns = txnRes.data || [];

      setCustomers(custs);
      setTransactions(txns);

      // Calculate engagement scores
      const scores = {};
      custs.forEach((c) => {
        const customerTxns = txns.filter((t) => t.user_id === c.id);
        scores[c.id] = calcEngagement(c, customerTxns);
      });
      setEngScores(scores);
    } catch (err) {
      console.error("CustomerEngagement fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleViewCustomer = (customer) => {
    setViewCustomer(customer);
    setModalTxns(transactions.filter((t) => t.user_id === customer.id));
  };

  // Bulk recalculate + save engagement scores + churn risk
  const handleBulkSave = async () => {
    setSaving(true);
    let saved = 0;
    for (const c of customers) {
      const eng = engScores[c.id];
      if (!eng) continue;
      const churn = isChurnRisk(c);
      const tier = getTier(c.loyalty_points || 0);
      const { error } = await supabase
        .from("user_profiles")
        .update({
          engagement_score: eng.total,
          churn_risk: churn,
          loyalty_tier: tier,
        })
        .eq("id", c.id);
      if (!error) saved++;
    }
    setSaving(false);
    showToast(`✓ ${saved} customer profiles updated`);
    fetchAll();
  };

  // ── Stats ──────────────────────────────────────────────────────────────
  const avgEng =
    customers.length > 0
      ? Math.round(
          customers.reduce((s, c) => s + (engScores[c.id]?.total || 0), 0) /
            customers.length,
        )
      : 0;
  const churnCount = customers.filter((c) => isChurnRisk(c)).length;
  const optInCount = customers.filter((c) => c.marketing_opt_in).length;
  const optInRate =
    customers.length > 0
      ? Math.round((optInCount / customers.length) * 100)
      : 0;
  const activeCount = customers.filter((c) => {
    const d = daysSince(c.last_active_at);
    return d !== null && d <= 30;
  }).length;

  const tierCounts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  customers.forEach((c) => {
    tierCounts[getTier(c.loyalty_points || 0)]++;
  });

  // ── Filter + sort ──────────────────────────────────────────────────────
  let displayed = [...customers];

  if (filter === "at_risk") displayed = displayed.filter((c) => isChurnRisk(c));
  if (filter === "active")
    displayed = displayed.filter((c) => {
      const d = daysSince(c.last_active_at);
      return d !== null && d <= 30;
    });
  if (filter === "opted_in")
    displayed = displayed.filter((c) => c.marketing_opt_in);

  if (tierFilter !== "all")
    displayed = displayed.filter(
      (c) => getTier(c.loyalty_points || 0) === tierFilter,
    );

  if (search) {
    const q = search.toLowerCase();
    displayed = displayed.filter(
      (c) =>
        (c.full_name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.referral_code || "").toLowerCase().includes(q),
    );
  }

  if (sortBy === "engagement")
    displayed.sort(
      (a, b) => (engScores[b.id]?.total || 0) - (engScores[a.id]?.total || 0),
    );
  if (sortBy === "points")
    displayed.sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0));
  if (sortBy === "recent")
    displayed.sort(
      (a, b) =>
        new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0),
    );
  if (sortBy === "scans")
    displayed.sort((a, b) => (b.total_scans || 0) - (a.total_scans || 0));
  if (sortBy === "risk")
    displayed.sort(
      (a, b) => (isChurnRisk(b) ? 1 : 0) - (isChurnRisk(a) ? 1 : 0),
    );

  return (
    <div style={{ fontFamily: FONTS.body, position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.green,
            color: C.white,
            padding: "12px 24px",
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: 24,
              margin: 0,
            }}
          >
            Customer Engagement
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Live engagement scoring · Churn risk detection · Loyalty tier
            management
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={fetchAll}
            style={{
              ...makeBtn("transparent", C.muted),
              border: `1px solid ${C.border}`,
            }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleBulkSave}
            disabled={saving}
            style={makeBtn(C.green, C.white, saving)}
          >
            {saving ? "Saving…" : "💾 Save All Scores"}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Customers", value: customers.length, color: C.green },
          { label: "Active (30d)", value: activeCount, color: C.accent },
          {
            label: "Avg Engagement",
            value: `${avgEng}/100`,
            color: avgEng >= 60 ? C.accent : avgEng >= 35 ? C.gold : C.red,
          },
          {
            label: "⚠ Churn Risk",
            value: churnCount,
            color: churnCount > 0 ? C.red : C.accent,
          },
          { label: "Marketing Opt-in", value: `${optInRate}%`, color: C.blue },
          {
            label: "💎 Platinum",
            value: tierCounts.platinum,
            color: C.platinum,
          },
          { label: "🥇 Gold", value: tierCounts.gold, color: C.gold },
          { label: "🥉 Bronze", value: tierCounts.bronze, color: "#a0674b" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${s.color}`,
              borderRadius: 2,
              padding: "14px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 24,
                fontWeight: 300,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Churn alert */}
      {churnCount > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: C.lightRed,
            border: `1px solid ${C.red}`,
            borderRadius: 2,
            marginBottom: 16,
            fontSize: 13,
            color: C.red,
            fontWeight: 600,
          }}
        >
          ⚠ {churnCount} customer{churnCount > 1 ? "s" : ""} at churn risk —
          inactive 45+ days or no scans with low points
        </div>
      )}

      {/* Filters + search + sort */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          style={{ ...inputStyle, width: 220 }}
          placeholder="Search name, phone, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Status filter */}
        <div
          style={{
            display: "flex",
            gap: 0,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "at_risk", label: "⚠ At Risk" },
            { key: "opted_in", label: "Opted In" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 14px",
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: FONTS.body,
                backgroundColor: filter === f.key ? C.green : C.white,
                color: filter === f.key ? C.white : C.muted,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tier filter */}
        <select
          style={{ ...inputStyle, cursor: "pointer", width: "auto" }}
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="all">All Tiers</option>
          <option value="platinum">💎 Platinum</option>
          <option value="gold">🥇 Gold</option>
          <option value="silver">🥈 Silver</option>
          <option value="bronze">🥉 Bronze</option>
        </select>

        {/* Sort */}
        <select
          style={{ ...inputStyle, cursor: "pointer", width: "auto" }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="engagement">Sort: Engagement</option>
          <option value="points">Sort: Points</option>
          <option value="scans">Sort: Scans</option>
          <option value="recent">Sort: Recent</option>
          <option value="risk">Sort: Churn Risk</option>
        </select>

        <div style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
          {displayed.length} customer{displayed.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Customer Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>
          Loading customers…
        </div>
      ) : displayed.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            border: `1px dashed ${C.border}`,
            borderRadius: 2,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 20,
              color: C.green,
              marginBottom: 8,
            }}
          >
            No customers found
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            Customers appear here once they sign up and scan a QR code.
          </div>
        </div>
      ) : (
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: C.green, color: C.white }}>
                {[
                  "Customer",
                  "Tier",
                  "Engagement",
                  "Points",
                  "Scans",
                  "Last Active",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 10,
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
              {displayed.map((c, i) => {
                const eng = engScores[c.id] || { total: 0 };
                const risk = isChurnRisk(c);
                const days = daysSince(c.last_active_at);
                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: i % 2 === 0 ? C.white : C.cream,
                      cursor: "pointer",
                    }}
                    onClick={() => handleViewCustomer(c)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f0faf5")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        i % 2 === 0 ? C.white : C.cream)
                    }
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: C.text }}>
                        {c.full_name || "Anonymous"}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {c.city || ""}
                        {c.province ? `, ${c.province}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <TierBadge points={c.loyalty_points || 0} />
                    </td>
                    <td style={{ padding: "12px 14px", minWidth: 120 }}>
                      <EngBar score={eng.total} />
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontWeight: 600,
                        color: C.gold,
                      }}
                    >
                      {(c.loyalty_points || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 14px", color: C.muted }}>
                      {c.total_scans || 0}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: 12,
                        color: days !== null && days > 30 ? C.red : C.muted,
                      }}
                    >
                      {days !== null
                        ? days === 0
                          ? "Today"
                          : `${days}d ago`
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {risk ? (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 2,
                            background: C.lightRed,
                            color: C.red,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          ⚠ At Risk
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 2,
                            background: C.lightGreen,
                            color: C.accent,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          ✓ Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCustomer(c);
                        }}
                        style={{
                          ...makeBtn("transparent", C.mid),
                          border: `1px solid ${C.border}`,
                          fontSize: 10,
                          padding: "5px 12px",
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {viewCustomer && (
        <CustomerModal
          customer={viewCustomer}
          transactions={modalTxns}
          onClose={() => setViewCustomer(null)}
        />
      )}
    </div>
  );
}
