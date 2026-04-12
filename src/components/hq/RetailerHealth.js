// src/components/hq/RetailerHealth.js — Protea Botanicals v1.1
// WP6 — Retailer Health Score & Partner Analytics
//
// Features:
//   - Health score calculation per retailer (0–100) from live data
//   - Tier classification: Platinum ≥85 | Gold ≥70 | Silver ≥50 | Bronze <50
//   - Writes health_score + activation_rate + tier + monthly_unit_avg back to tenants
//   - ★ v1.1: Margin per Retailer — fetches product_pricing (retail) + product_cogs
//     + supplier_products + fx_rates. For each retailer, calculates weighted avg margin
//     on products they've received (from shipment history). Shows per-retailer margin
//     grade in card, full breakdown in detail modal.

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";

// ── Design Tokens (migrated to shared tokens.js) ─────────────────────────
// Legacy aliases — preserve all internal logic
const C = {
  bg: T.surface,
  primaryDark: T.accent,
  primaryMid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  text: T.ink900,
  muted: T.ink500,
  border: T.border,
  white: "#fff",
  red: T.danger,
  lightRed: T.dangerLight,
  orange: T.warning,
  lightOrange: T.warningLight,
  blue: T.info,
  lightBlue: T.infoLight,
  platinum: T.info,
  lightPlatinum: T.infoLight,
};
const F = { heading: T.font, body: T.font };

const TIERS = {
  platinum: {
    label: "Platinum",
    min: 85,
    color: C.platinum,
    bg: C.lightPlatinum,
    icon: "💎",
  },
  gold: { label: "Gold", min: 70, color: C.gold, bg: "#fef9e7", icon: "🥇" },
  silver: {
    label: "Silver",
    min: 50,
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

function getTier(score) {
  if (score >= 85) return "platinum";
  if (score >= 70) return "gold";
  if (score >= 50) return "silver";
  return "bronze";
}
function getTierConfig(score) {
  return TIERS[getTier(score)];
}

function marginColor(pct) {
  if (pct >= 35) return C.accent;
  if (pct >= 20) return C.gold;
  return C.red;
}
function marginLabel(pct) {
  if (pct >= 35) return "Healthy";
  if (pct >= 20) return "Moderate";
  return "Low";
}

const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "10px",
  padding: "20px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)",
};
const sLabel = {
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#374151",
  marginBottom: "12px",
  fontFamily: F.body,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Score Ring SVG ────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const tier = getTierConfig(score);
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={C.border}
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tier.color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: T.font,
            fontSize: size * 0.28,
            fontWeight: 700,
            color: tier.color,
            lineHeight: 1,
          }}
        >
          {score}
        </div>
        <div
          style={{
            fontSize: size * 0.1,
            color: C.muted,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          /100
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, max, color = C.accent }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 3,
        }}
      >
        <span style={{ fontSize: 11, color: C.text }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>
          {score}/{max}
        </span>
      </div>
      <div style={{ height: 5, background: C.border, borderRadius: 3 }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

function TierBadge({ score }) {
  const t = getTierConfig(score);
  const key = getTier(score);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
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

// ── Margin Badge ──────────────────────────────────────────────────────────
function MarginBadge({ pct }) {
  if (pct === null || pct === undefined)
    return <span style={{ fontSize: 10, color: C.muted }}>—</span>;
  const color = marginColor(pct);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 8px",
        borderRadius: 2,
        fontSize: 10,
        fontWeight: 700,
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {pct.toFixed(1)}% margin
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════
function calculateHealthScore(
  tenant,
  { scans, shipments, movements, loyalty },
) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000);

  const recentScans = scans.filter(
    (s) => new Date(s.scan_date) >= thirtyDaysAgo,
  ).length;
  const scanScore = Math.min(30, Math.round((recentScans / 20) * 30));

  const tenantShipments = shipments.filter(
    (s) =>
      s.destination_name?.toLowerCase() === tenant.name?.toLowerCase() ||
      s.destination_tenant_id === tenant.id,
  );
  const recentShipments = tenantShipments.filter(
    (s) => new Date(s.created_at) >= ninetyDaysAgo,
  );
  const confirmedShipments = recentShipments.filter(
    (s) => s.status === "confirmed",
  );
  const deliveredShipments = recentShipments.filter((s) =>
    ["delivered", "confirmed"].includes(s.status),
  );
  let shipScore = 0;
  if (recentShipments.length > 0) shipScore += 10;
  if (deliveredShipments.length > 0) shipScore += 10;
  if (confirmedShipments.length > 0) shipScore += 5;
  shipScore = Math.min(25, shipScore);

  const recentLoyalty = loyalty.filter(
    (l) => new Date(l.created_at || now) >= thirtyDaysAgo,
  );
  const redemptions = recentLoyalty.filter((l) =>
    ["REDEEMED", "redeemed", "REDEEMED_POINTS"].includes(l.transaction_type),
  ).length;
  const loyaltyScore = Math.min(20, Math.round((redemptions / 5) * 20));

  const recentMovements = movements.filter(
    (m) => new Date(m.created_at) >= thirtyDaysAgo,
  );
  const stockScore = Math.min(
    15,
    Math.round((recentMovements.length / 10) * 15),
  );

  const lastScan = scans.length > 0 ? new Date(scans[0].scan_date) : null;
  let recencyScore = 0;
  if (lastScan) {
    const daysSince = (now - lastScan) / 86400000;
    if (daysSince <= 7) recencyScore = 10;
    else if (daysSince <= 14) recencyScore = 8;
    else if (daysSince <= 30) recencyScore = 5;
    else if (daysSince <= 90) recencyScore = 2;
  }

  const total =
    scanScore + shipScore + loyaltyScore + stockScore + recencyScore;
  const activationRate =
    scans.length > 0
      ? Math.min(
          100,
          Math.round((recentScans / Math.max(scans.length, 1)) * 100),
        )
      : 0;

  const sixMonthShipments = tenantShipments.filter(
    (s) =>
      ["delivered", "confirmed"].includes(s.status) &&
      new Date(s.created_at) >= sixMonthsAgo,
  );
  const totalUnits = sixMonthShipments.reduce(
    (sum, s) =>
      sum +
      (s.shipment_items || []).reduce((is, i) => is + (i.quantity || 0), 0),
    0,
  );
  const monthlyUnitAvg = Math.round(totalUnits / 6);

  return {
    total: Math.min(100, Math.max(0, total)),
    activationRate,
    monthlyUnitAvg,
    breakdown: {
      scans: {
        score: scanScore,
        max: 30,
        label: "Scan Activity (30d)",
        color: C.accent,
      },
      shipments: {
        score: shipScore,
        max: 25,
        label: "Shipment Engagement",
        color: C.primaryDark,
      },
      loyalty: {
        score: loyaltyScore,
        max: 20,
        label: "Loyalty Redemptions (30d)",
        color: C.gold,
      },
      stock: {
        score: stockScore,
        max: 15,
        label: "Stock Movement (30d)",
        color: C.blue,
      },
      recency: {
        score: recencyScore,
        max: 10,
        label: "Recency (last scan)",
        color: C.primaryMid,
      },
    },
    meta: {
      recentScans,
      totalScans: scans.length,
      tenantShipments: tenantShipments.length,
      confirmedShipments: confirmedShipments.length,
      redemptions,
      recentMovements: recentMovements.length,
      lastScan,
      // v1.1: shipment items for this tenant (for margin calculation)
      receivedShipmentItems: sixMonthShipments.flatMap(
        (s) => s.shipment_items || [],
      ),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// v1.1: MARGIN CALCULATOR
// Calculates weighted avg margin for a tenant based on products they've received.
// Uses product_pricing (retail channel) + product_cogs as baseline.
// Falls back to global retail avg if no shipment-item match.
// ═══════════════════════════════════════════════════════════════════════════
function calculateRetailerMargin(
  tenantScoreData,
  { pricingMap, globalAvgMargin },
) {
  if (!pricingMap || Object.keys(pricingMap).length === 0) {
    return { avgMargin: null, productMargins: [], source: "none" };
  }

  const receivedItems = tenantScoreData?.meta?.receivedShipmentItems || [];

  if (receivedItems.length === 0) {
    // No received items in last 6 months — use global retail avg
    return { avgMargin: globalAvgMargin, productMargins: [], source: "global" };
  }

  // Match shipment items to pricing by item_name
  const matched = [];
  for (const si of receivedItems) {
    const name = (si.item_name || "").toLowerCase().trim();
    // Look for matching key in pricingMap
    const key = Object.keys(pricingMap).find(
      (k) =>
        name.includes(k.toLowerCase()) ||
        k.toLowerCase().includes(name.split(" ")[0]),
    );
    if (key && pricingMap[key]) {
      matched.push({
        name: si.item_name,
        qty: si.quantity || 1,
        ...pricingMap[key],
      });
    }
  }

  if (matched.length === 0) {
    return { avgMargin: globalAvgMargin, productMargins: [], source: "global" };
  }

  // Weighted average by quantity
  const totalQty = matched.reduce((s, m) => s + m.qty, 0);
  const weightedMargin =
    matched.reduce((s, m) => s + m.margin * m.qty, 0) / totalQty;

  const productMargins = [...new Map(matched.map((m) => [m.name, m])).values()];

  return {
    avgMargin: parseFloat(weightedMargin.toFixed(1)),
    productMargins,
    source: "shipments",
  };
}

// ── Retailer Card ─────────────────────────────────────────────────────────
function RetailerCard({
  tenant,
  scoreData,
  marginData,
  onView,
  onRecalculate,
  saving,
}) {
  const { total, breakdown, activationRate } = scoreData;
  const tier = getTierConfig(total);

  return (
    <div
      style={{
        ...sCard,
        borderTop: `3px solid ${tier.color}`,
        borderRadius: 10,
        transition: "box-shadow 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
      onClick={() => onView(tenant, scoreData, marginData)}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <ScoreRing score={total} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: T.font,
                fontSize: 18,
                fontWeight: 600,
                color: C.primaryDark,
              }}
            >
              {tenant.name}
            </div>
            <TierBadge score={total} />
            {/* v1.1: Margin badge */}
            {marginData?.avgMargin !== null &&
              marginData?.avgMargin !== undefined && (
                <MarginBadge pct={marginData.avgMargin} />
              )}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
            {tenant.type}
            {tenant.location_city ? ` · ${tenant.location_city}` : ""}
            {tenant.location_province ? `, ${tenant.location_province}` : ""}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 11,
              color: C.muted,
              flexWrap: "wrap",
            }}
          >
            <span>📊 {activationRate}% active</span>
            {scoreData.monthlyUnitAvg > 0 && (
              <span>📦 ~{scoreData.monthlyUnitAvg} units/mo</span>
            )}
            {scoreData.meta.lastScan && (
              <span>📱 Last scan {fmtDate(scoreData.meta.lastScan)}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        {Object.values(breakdown).map((b) => (
          <ScoreBar
            key={b.label}
            label={b.label}
            score={b.score}
            max={b.max}
            color={b.color}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 12,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div style={{ fontSize: 11, color: C.muted }}>
          {scoreData.meta.totalScans} scans · {scoreData.meta.tenantShipments}{" "}
          shipments
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRecalculate(tenant, scoreData);
          }}
          disabled={saving}
          style={{
            padding: "5px 12px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: saving ? "not-allowed" : "pointer",
            color: C.muted,
            fontFamily: F.body,
          }}
        >
          {saving ? "Saving…" : "↻ Update Score"}
        </button>
      </div>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────
function DetailModal({ tenant, scoreData, marginData, onClose }) {
  if (!tenant || !scoreData) return null;
  const { total, breakdown, activationRate, monthlyUnitAvg, meta } = scoreData;
  const tier = getTierConfig(total);
  const nextTierKey =
    getTier(total) === "platinum"
      ? null
      : Object.keys(TIERS).find((k) => TIERS[k].min > total);
  const nextTier = nextTierKey ? TIERS[nextTierKey] : null;
  const pointsToNext = nextTier ? nextTier.min - total : 0;

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
          borderRadius: 12,
          padding: 32,
          maxWidth: 600,
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: F.body,
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
                fontFamily: F.heading,
                fontSize: 26,
                color: C.primaryDark,
              }}
            >
              {tenant.name}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {tenant.type}
              {tenant.location_city ? ` · ${tenant.location_city}` : ""}
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

        {/* Score + tier */}
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            marginBottom: 24,
            padding: 20,
            background: tier.bg,
            borderRadius: 2,
          }}
        >
          <ScoreRing score={total} size={90} />
          <div>
            <TierBadge score={total} />
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 32,
                color: tier.color,
                marginTop: 6,
                lineHeight: 1,
              }}
            >
              {total} / 100
            </div>
            {nextTier && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {pointsToNext} more points to reach {nextTier.icon}{" "}
                {nextTier.label}
              </div>
            )}
            {!nextTier && (
              <div
                style={{
                  fontSize: 12,
                  color: tier.color,
                  marginTop: 4,
                  fontWeight: 700,
                }}
              >
                💎 Maximum tier achieved
              </div>
            )}
          </div>
        </div>

        {/* Score breakdown */}
        <div style={sLabel}>Score Breakdown</div>
        <div style={{ marginBottom: 20 }}>
          {Object.values(breakdown).map((b) => (
            <ScoreBar
              key={b.label}
              label={b.label}
              score={b.score}
              max={b.max}
              color={b.color}
            />
          ))}
        </div>

        {/* ── v1.1: Margin Section ─────────────────────────────────── */}
        <MarginSection marginData={marginData} />
        {/* ── end v1.1 ─────────────────────────────────────────────── */}

        {/* KPIs */}
        <div style={sLabel}>Partner Metrics</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Activation Rate", value: `${activationRate}%` },
            {
              label: "Monthly Unit Avg",
              value: monthlyUnitAvg > 0 ? `${monthlyUnitAvg} units` : "—",
            },
            { label: "Total Scans", value: meta.totalScans },
            { label: "Scans (30d)", value: meta.recentScans },
            { label: "Shipments Received", value: meta.tenantShipments },
            { label: "Confirmed", value: meta.confirmedShipments },
            { label: "Redemptions (30d)", value: meta.redemptions },
            { label: "Movements (30d)", value: meta.recentMovements },
            { label: "Last Scan", value: fmtDate(meta.lastScan) },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                padding: "10px 12px",
                background: C.bg,
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: C.muted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                {k.label}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.primaryDark,
                  fontFamily: F.heading,
                }}
              >
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {/* Score improvement guide */}
        <div
          style={{
            padding: 16,
            background: "#eafaf1",
            border: `1px solid ${C.accent}40`,
            borderRadius: 2,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.primaryDark,
              marginBottom: 8,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            💡 Score Improvement Guide
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {breakdown.scans.score < breakdown.scans.max && (
              <div style={{ fontSize: 12, color: C.text }}>
                📱 Increase scan volume —{" "}
                {breakdown.scans.max - breakdown.scans.score} more points
                available
              </div>
            )}
            {breakdown.shipments.score < breakdown.shipments.max && (
              <div style={{ fontSize: 12, color: C.text }}>
                🚚 Confirm received shipments —{" "}
                {breakdown.shipments.max - breakdown.shipments.score} more
                points available
              </div>
            )}
            {breakdown.loyalty.score < breakdown.loyalty.max && (
              <div style={{ fontSize: 12, color: C.text }}>
                ⭐ Drive loyalty redemptions —{" "}
                {breakdown.loyalty.max - breakdown.loyalty.score} more points
                available
              </div>
            )}
            {breakdown.recency.score < breakdown.recency.max && (
              <div style={{ fontSize: 12, color: C.text }}>
                🕐 Recent scan activity boosts recency score by{" "}
                {breakdown.recency.max - breakdown.recency.score} points
              </div>
            )}
            {Object.values(breakdown).every((b) => b.score === b.max) && (
              <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
                ✓ All metrics at maximum — maintaining Platinum status
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "10px",
            background: C.primaryDark,
            color: C.white,
            border: "none",
            borderRadius: 2,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── v1.1: Margin Section (shown in Detail Modal) ──────────────────────────
function MarginSection({ marginData }) {
  if (!marginData || marginData.avgMargin === null) {
    return (
      <div
        style={{
          marginBottom: 20,
          padding: "12px 16px",
          background: "#fafaf8",
          border: `1px dashed ${C.border}`,
          borderRadius: 2,
        }}
      >
        <div style={sLabel}>Margin Analysis</div>
        <div style={{ fontSize: 12, color: C.muted }}>
          No product pricing data available for this retailer yet.
        </div>
      </div>
    );
  }

  const { avgMargin, productMargins, source } = marginData;
  const color = marginColor(avgMargin);
  const label = marginLabel(avgMargin);

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "16px",
        background: `${color}08`,
        border: `1px solid ${color}25`,
        borderRadius: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={sLabel}>Margin Analysis</div>
        <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em" }}>
          {source === "global"
            ? "Global retail avg"
            : "Based on received products"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: productMargins.length > 0 ? 16 : 0,
        }}
      >
        {/* Big margin number */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: F.heading,
              fontSize: 42,
              fontWeight: 300,
              color,
              lineHeight: 1,
            }}
          >
            {avgMargin.toFixed(1)}%
          </div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color,
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            {label} Margin
          </div>
        </div>
        {/* Visual bar */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              color: C.muted,
              marginBottom: 3,
            }}
          >
            <span>0%</span>
            <span>20% (min)</span>
            <span>35% (target)</span>
            <span>50%+</span>
          </div>
          <div
            style={{
              position: "relative",
              height: 8,
              background: C.border,
              borderRadius: 4,
            }}
          >
            {/* Zone markers */}
            <div
              style={{
                position: "absolute",
                left: "40%",
                top: 0,
                bottom: 0,
                width: 1,
                background: C.orange,
                opacity: 0.5,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "70%",
                top: 0,
                bottom: 0,
                width: 1,
                background: C.accent,
                opacity: 0.5,
              }}
            />
            {/* Actual */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${Math.min(100, avgMargin * 2)}%`,
                background: color,
                borderRadius: 4,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            {avgMargin >= 35
              ? "✓ Meeting target margin"
              : avgMargin >= 20
                ? "⚠ Below 35% target"
                : "⛔ Below 20% minimum"}
          </div>
        </div>
      </div>

      {/* Per-product breakdown */}
      {productMargins.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.primaryDark,
              marginBottom: 8,
            }}
          >
            Product Breakdown
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {productMargins.map((pm) => (
              <div
                key={pm.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  background: C.white,
                  borderRadius: 2,
                  border: `1px solid ${C.border}`,
                }}
              >
                <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>
                  {pm.name}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    fontSize: 11,
                  }}
                >
                  {pm.sellPrice && (
                    <span style={{ color: C.muted }}>
                      Sell: R{pm.sellPrice.toFixed(2)}
                    </span>
                  )}
                  {pm.cogs && (
                    <span style={{ color: C.muted }}>
                      COGS: R{pm.cogs.toFixed(2)}
                    </span>
                  )}
                  <span
                    style={{ fontWeight: 700, color: marginColor(pm.margin) }}
                  >
                    {pm.margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function RetailerHealth() {
  const [tenants, setTenants] = useState([]);
  const [scores, setScores] = useState({});
  const [margins, setMargins] = useState({}); // v1.1: { tenantId: { avgMargin, productMargins, source } }
  const [loading, setLoading] = useState(true);
  const [recalcing, setRecalcing] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [lastCalc, setLastCalc] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchAndCalculate = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all health score data + v1.1: pricing/cogs/fx
      const [
        tenantsRes,
        scansRes,
        shipmentsRes,
        movementsRes,
        loyaltyRes,
        pricingRes,
        cogsRes,
        fxRes,
      ] = await Promise.all([
        supabase.from("tenants").select("*").eq("is_active", true),
        supabase
          .from("scans")
          .select("id,product_id,source,scan_date")
          .order("scan_date", { ascending: false }),
        supabase
          .from("shipments")
          .select(
            "id,shipment_number,destination_name,destination_tenant_id,status,created_at,confirmed_date,delivered_date,shipment_items(quantity,total_cost,item_name,unit_cost)",
          ),
        supabase
          .from("stock_movements")
          .select("id,item_id,quantity,movement_type,reference,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("loyalty_transactions")
          .select("points,transaction_type,created_at"),
        // v1.1: retail pricing
        supabase
          .from("product_pricing")
          .select("id,product_cogs_id,channel,sell_price_zar")
          .eq("channel", "retail"),
        // v1.1: product COGS with joins
        supabase
          .from("product_cogs")
          .select(
            `
          id, product_name, sku,
          hardware_item_id, hardware_qty,
          terpene_item_id, terpene_qty_g,
          distillate_input_id, distillate_qty_ml,
          packaging_input_id, packaging_qty,
          labour_input_id, labour_qty,
          other_cost_zar,
          hardware:hardware_item_id(unit_price_usd),
          terpene:terpene_item_id(unit_price_usd)
        `,
          )
          .eq("is_active", true),
        // v1.1: FX rate
        supabase
          .from("fx_rates")
          .select("rate")
          .eq("currency_pair", "USD/ZAR")
          .order("fetched_at", { ascending: false })
          .limit(1),
      ]);

      const allTenants = (tenantsRes.data || []).filter((t) => t.type !== "hq");
      const allScans = scansRes.data || [];
      const allShipments = shipmentsRes.data || [];
      const allMovements = movementsRes.data || [];
      const allLoyalty = loyaltyRes.data || [];

      // ── v1.1: Build pricing map ────────────────────────────────────────
      const fxRate = fxRes.data?.[0]?.rate || 18.5;
      const allPricing = pricingRes.data || [];
      const allCogs = cogsRes.data || [];

      // Fetch local inputs needed for COGS calculation
      const localIds = [
        ...new Set(
          allCogs.flatMap((c) =>
            [
              c.distillate_input_id,
              c.packaging_input_id,
              c.labour_input_id,
            ].filter(Boolean),
          ),
        ),
      ];
      let locals = [];
      if (localIds.length > 0) {
        const { data } = await supabase
          .from("local_inputs")
          .select("id, name, cost_zar")
          .in("id", localIds);
        locals = data || [];
      }
      const getLocal = (id) => locals.find((l) => l.id === id);

      // Build pricingMap: { productName (lowercase) → { margin, sellPrice, cogs } }
      const pricingMap = {};
      let globalMarginSum = 0;
      let globalMarginCount = 0;

      for (const p of allPricing) {
        const cog = allCogs.find((c) => c.id === p.product_cogs_id);
        if (!cog) continue;

        const hwCost =
          (cog.hardware?.unit_price_usd || 0) *
          (cog.hardware_qty || 1) *
          fxRate;
        const tpCost =
          ((cog.terpene?.unit_price_usd || 0) / 50) *
          fxRate *
          (cog.terpene_qty_g || 0);
        const dist = getLocal(cog.distillate_input_id);
        const pack = getLocal(cog.packaging_input_id);
        const labour = getLocal(cog.labour_input_id);
        const distCost = (dist?.cost_zar || 0) * (cog.distillate_qty_ml || 0);
        const packCost = (pack?.cost_zar || 0) * (cog.packaging_qty || 0);
        const labourCost = (labour?.cost_zar || 0) * (cog.labour_qty || 0);
        const totalCogs =
          hwCost +
          tpCost +
          distCost +
          packCost +
          labourCost +
          (cog.other_cost_zar || 0);

        const sellPrice = p.sell_price_zar || 0;
        const margin =
          sellPrice > 0 ? ((sellPrice - totalCogs) / sellPrice) * 100 : 0;

        pricingMap[cog.product_name] = { margin, sellPrice, cogs: totalCogs };
        globalMarginSum += margin;
        globalMarginCount++;
      }

      const globalAvgMargin =
        globalMarginCount > 0
          ? parseFloat((globalMarginSum / globalMarginCount).toFixed(1))
          : null;
      // ── end v1.1 pricing map ───────────────────────────────────────────

      setTenants(allTenants);

      const newScores = {};
      const newMargins = {};

      for (const tenant of allTenants) {
        const sd = calculateHealthScore(tenant, {
          scans: allScans,
          shipments: allShipments,
          movements: allMovements,
          loyalty: allLoyalty,
        });
        newScores[tenant.id] = sd;

        // v1.1: Calculate margin for this tenant
        newMargins[tenant.id] = calculateRetailerMargin(sd, {
          pricingMap,
          globalAvgMargin,
        });
      }

      setScores(newScores);
      setMargins(newMargins);
      setLastCalc(new Date());
    } catch (err) {
      console.error("RetailerHealth fetchAndCalculate:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndCalculate();
  }, [fetchAndCalculate]);

  const saveScore = async (tenant, scoreData) => {
    const { error } = await supabase
      .from("tenants")
      .update({
        health_score: scoreData.total,
        activation_rate: scoreData.activationRate / 100,
        tier: getTier(scoreData.total),
        monthly_unit_avg: scoreData.monthlyUnitAvg,
      })
      .eq("id", tenant.id);
    return !error;
  };

  const handleRecalculate = async (tenant, scoreData) => {
    setRecalcing((r) => ({ ...r, [tenant.id]: true }));
    const ok = await saveScore(tenant, scoreData);
    setRecalcing((r) => ({ ...r, [tenant.id]: false }));
    if (ok)
      showToast(
        `${tenant.name} score saved — ${scoreData.total}/100 (${TIERS[getTier(scoreData.total)].label})`,
      );
  };

  const handleBulkRecalculate = async () => {
    setBulkSaving(true);
    let saved = 0;
    for (const tenant of tenants) {
      const sd = scores[tenant.id];
      if (sd) {
        const ok = await saveScore(tenant, sd);
        if (ok) saved++;
      }
    }
    setBulkSaving(false);
    showToast(`✓ ${saved} retailer scores saved to database`);
    fetchAndCalculate();
  };

  const sorted = [...tenants].sort(
    (a, b) => (scores[b.id]?.total || 0) - (scores[a.id]?.total || 0),
  );
  const filtered = sorted.filter((t) => {
    if (filter === "all") return true;
    return getTier(scores[t.id]?.total || 0) === filter;
  });

  const tierCounts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  tenants.forEach((t) => {
    tierCounts[getTier(scores[t.id]?.total || 0)]++;
  });

  const avgScore =
    tenants.length > 0
      ? Math.round(
          tenants.reduce((s, t) => s + (scores[t.id]?.total || 0), 0) /
            tenants.length,
        )
      : 0;

  // v1.1: Global avg margin for display
  const globalAvgMarginDisplay = Object.values(margins).filter(
    (m) => m.avgMargin !== null,
  );
  const globalAvgMarginVal =
    globalAvgMarginDisplay.length > 0
      ? parseFloat(
          (
            globalAvgMarginDisplay.reduce((s, m) => s + m.avgMargin, 0) /
            globalAvgMarginDisplay.length
          ).toFixed(1),
        )
      : null;

  if (loading) {
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: C.muted,
          fontFamily: F.body,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
        Calculating retailer health scores…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: F.body, position: "relative" }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.primaryDark,
            color: C.white,
            padding: "12px 24px",
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: F.heading,
              fontSize: 22,
              fontWeight: 600,
              color: T.ink900,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Retailer Health
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Live partner scoring · Tier classification · Margin analysis
            {lastCalc && (
              <span>
                {" "}
                · Calculated{" "}
                {lastCalc.toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={fetchAndCalculate}
            style={{
              padding: "9px 16px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              color: C.muted,
              fontFamily: F.body,
            }}
          >
            ↻ Recalculate
          </button>
          <button
            onClick={handleBulkRecalculate}
            disabled={bulkSaving}
            style={{
              padding: "9px 18px",
              background: bulkSaving ? "#ccc" : C.primaryDark,
              color: C.white,
              border: "none",
              borderRadius: 2,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: bulkSaving ? "not-allowed" : "pointer",
              fontFamily: F.body,
            }}
          >
            {bulkSaving ? "Saving…" : "💾 Save All Scores"}
          </button>
        </div>
      </div>

      {/* Summary KPIs — v1.1: added avg margin tile */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Retailers", value: tenants.length, color: C.primaryDark },
          {
            label: "Avg Score",
            value: `${avgScore}/100`,
            color: avgScore >= 70 ? C.accent : avgScore >= 50 ? C.gold : C.red,
          },
          {
            label: "Avg Margin",
            value: globalAvgMarginVal !== null ? `${globalAvgMarginVal}%` : "—",
            color:
              globalAvgMarginVal !== null
                ? marginColor(globalAvgMarginVal)
                : C.muted,
          },
          {
            label: "💎 Platinum",
            value: tierCounts.platinum,
            color: C.platinum,
          },
          { label: "🥇 Gold", value: tierCounts.gold, color: C.gold },
          { label: "🥈 Silver", value: tierCounts.silver, color: "#8e9ba8" },
          { label: "🥉 Bronze", value: tierCounts.bronze, color: "#a0674b" },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${k.color}`,
              borderRadius: 4,
              padding: "14px 18px",
              boxShadow: T.shadow.sm,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink500,
                marginBottom: 6,
                fontFamily: T.font,
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 24,
                fontWeight: 400,
                color: k.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 20,
          width: "fit-content",
        }}
      >
        {[
          { key: "all", label: "All Retailers" },
          { key: "platinum", label: "💎 Platinum" },
          { key: "gold", label: "🥇 Gold" },
          { key: "silver", label: "🥈 Silver" },
          { key: "bronze", label: "🥉 Bronze" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 16px",
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: F.body,
              transition: "all 0.15s",
              backgroundColor: filter === f.key ? C.primaryDark : C.white,
              color: filter === f.key ? C.white : C.muted,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* League Table — v1.1: added Margin column */}
      {sorted.length > 0 && (
        <div style={{ ...sCard, marginBottom: 20 }}>
          <div style={sLabel}>League Table — Ranked by Health Score</div>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr>
                {[
                  "#",
                  "Retailer",
                  "Score",
                  "Tier",
                  "Avg Margin",
                  "Activation",
                  "Monthly Avg",
                  "Last Scan",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: C.muted,
                      borderBottom: `2px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((tenant, i) => {
                const sd = scores[tenant.id];
                const md = margins[tenant.id];
                if (!sd) return null;
                return (
                  <tr
                    key={tenant.id}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setViewTarget({ tenant, scoreData: sd, marginData: md })
                    }
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = C.bg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                        fontWeight: 700,
                        color: C.muted,
                      }}
                    >
                      #{i + 1}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                        fontWeight: 600,
                      }}
                    >
                      {tenant.name}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 60,
                            height: 5,
                            background: C.border,
                            borderRadius: 3,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${sd.total}%`,
                              background: getTierConfig(sd.total).color,
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: getTierConfig(sd.total).color,
                          }}
                        >
                          {sd.total}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <TierBadge score={sd.total} />
                    </td>
                    {/* v1.1: Margin column */}
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {md?.avgMargin !== null && md?.avgMargin !== undefined ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: marginColor(md.avgMargin),
                            fontSize: 12,
                          }}
                        >
                          {md.avgMargin.toFixed(1)}%
                          {md.source === "global" && (
                            <span
                              style={{
                                fontSize: 9,
                                color: C.muted,
                                fontWeight: 400,
                              }}
                            >
                              {" "}
                              (avg)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: C.muted }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                        color: C.muted,
                      }}
                    >
                      {sd.activationRate}%
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                        color: C.muted,
                      }}
                    >
                      {sd.monthlyUnitAvg > 0
                        ? `${sd.monthlyUnitAvg} units`
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: 11,
                        color: C.muted,
                      }}
                    >
                      {fmtDate(sd.meta.lastScan)}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecalculate(tenant, sd);
                        }}
                        disabled={recalcing[tenant.id]}
                        style={{
                          padding: "4px 10px",
                          background: "transparent",
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          color: C.muted,
                          fontFamily: F.body,
                        }}
                      >
                        {recalcing[tenant.id] ? "…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Retailer Cards */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            border: `1px dashed ${C.border}`,
            borderRadius: 2,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
          <div
            style={{
              fontFamily: F.heading,
              fontSize: 20,
              color: C.primaryDark,
              marginBottom: 8,
            }}
          >
            No retailers found
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            Active retailer tenants will appear here with their health scores.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((tenant) => (
            <RetailerCard
              key={tenant.id}
              tenant={tenant}
              scoreData={
                scores[tenant.id] || {
                  total: 0,
                  breakdown: {},
                  activationRate: 0,
                  monthlyUnitAvg: 0,
                  meta: {},
                }
              }
              marginData={margins[tenant.id] || null}
              onView={(t, sd, md) =>
                setViewTarget({ tenant: t, scoreData: sd, marginData: md })
              }
              onRecalculate={handleRecalculate}
              saving={!!recalcing[tenant.id]}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {viewTarget && (
        <DetailModal
          tenant={viewTarget.tenant}
          scoreData={viewTarget.scoreData}
          marginData={viewTarget.marginData}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
