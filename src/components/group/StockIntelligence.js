// src/components/group/StockIntelligence.js
// WP-ANALYTICS-4 Sessions 1 + 2 — Stock Intelligence
// Primary question: "Where is stock stuck and where is it needed?"
//
// Session 1:
//   1. Network Stock Summary  — 4 KPI tiles
//   2. Per-store stock health cards
//   3. Slow Movers — per-store collapsible
//
// Session 2 (this build) adds:
//   • Network Insight Banner (Gap 4) between Section 1 and Section 2 —
//     restock alerts + dead stock capital, only renders when either
//     signal is non-zero
//   4. Fast Movers per store — partition order per Gap 3:
//     isSellingWithNoStock items rendered first (dangerLight, "Active
//     — no stock" chip), then regular fast movers sorted by
//     daysOfStockLeft ASC. Capped at 25 with "+ N more" expand toggle.
//   5. Transfer Opportunities — cross-store SKU matching engine with
//     the Gap 2 surplus/need/suggestedQty formulas. Renders the honest
//     empty state when no shared SKUs exist (expected for the current
//     Medi Can network per Step 0-B).
//   6. Dead Stock Breakdown per store — 7-column table with age bands
//     (60-90d / 91-180d / 181+d), local "flag for review" toggle, and
//     a footnote linking back to the Slow Movers section.
//
// Zero-regression path: S1 callers (if any) that don't pass
// includeVelocity still work because fetchStoreInventory defaults the
// S2 fields to zero/Infinity/false. This component always passes
// { includeVelocity: true } per Step 2 of the S2 build sequence.
//
// All layout via T.* tokens (LL-238). LL-242 AVCO-correct stock value
// end-to-end. LL-231 profile branching handled inside fetchStoreInventory
// — Medi Can Dispensary velocity sourced from dispensing_log per Step 0-A.
//
// Step 0 verification (12 Apr 2026):
//   S1 schema: last_movement_at / needs_reorder / max_stock_level /
//              reorder_qty all present ✓
//   S2 Gap 1:  dispensary branch MANDATORY — Medi Can Dispensary has
//              0 sale_* rows in stock_movements but 14 dispensing_log
//              rows. Retail-only velocity query would silently return
//              empty for dispensary.
//   S2 Gap 2:  zero shared SKUs across Medi Can network. MC-* vs MED-*
//              prefixes. Transfer engine renders honest empty state.
//   Live data: Medi Recreational 186 items · 14 with AVCO · 10 slow
//              movers. Medi Can Dispensary 8 items · 8 with AVCO.

import React, { useState, useEffect, useMemo } from "react";
import { fetchStoreInventory } from "./_helpers/fetchStoreInventory";
import { INDUSTRY_BADGE } from "./_helpers/industryBadge";
import { T } from "../../styles/tokens";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtR = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return (
    "R" +
    Math.round(Number(n)).toLocaleString("en-ZA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
};

const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(Number(n)).toLocaleString("en-ZA");
};

const fmtPct = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(1) + "%";
};

const truncate = (s, max) => {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

// Format days as "34 days" / "2 years" — used in the slow-mover table
const fmtDaysIdle = (days) => {
  if (!Number.isFinite(days)) return "Never";
  const d = Math.round(days);
  if (d < 365) return `${d} days`;
  const years = (d / 365).toFixed(1);
  return `${years} years`;
};

// Format days-of-stock-left for the fast mover table
const fmtDaysOfStock = (days) => {
  if (!Number.isFinite(days) || days < 0) return "—";
  const d = Math.floor(days);
  if (d < 1) return "< 1 day";
  if (d >= 365) return "365+ days";
  return `${d} day${d !== 1 ? "s" : ""}`;
};

// Monthly rate display (~N/mo) per Gap 3
const fmtMonthlyRate = (monthlyRate) => {
  if (!monthlyRate || monthlyRate <= 0) return "—";
  return `~${monthlyRate}/mo`;
};

// Age bands for dead stock section — Gap 5
// 60-90 days:  warningLight bg, "Dead stock" chip
// 91-180 days: dangerLight bg (light), "Very dead" chip
// 181+ days:   dangerLight bg, "Write-off risk" chip, semibold
function getAgeBand(days) {
  if (!Number.isFinite(days)) {
    return {
      rowBg: T.dangerLight || "#fdf0ef",
      chipBg: T.danger || "#c0392b",
      chipFg: "#ffffff",
      label: "Never moved",
      semibold: true,
    };
  }
  if (days >= 181) {
    return {
      rowBg: T.dangerLight || "#fdf0ef",
      chipBg: T.danger || "#c0392b",
      chipFg: "#ffffff",
      label: "Write-off risk",
      semibold: true,
    };
  }
  if (days >= 91) {
    return {
      rowBg: T.dangerLight || "#fdf0ef",
      chipBg: T.danger || "#c0392b",
      chipFg: "#ffffff",
      label: "Very dead",
      semibold: false,
    };
  }
  return {
    rowBg: T.warningLight || "#fef9f0",
    chipBg: T.warning || "#e67e22",
    chipFg: "#ffffff",
    label: "Dead stock",
    semibold: false,
  };
}

// Resolve an INDUSTRY_BADGE descriptor with a safe fallback.
const resolveBadge = (profile) =>
  INDUSTRY_BADGE[profile] || {
    bg: T.neutralLight || "#F3F4F6",
    fg: T.neutralText || "#6B7280",
    label: profile || "Unknown",
  };

// ─── Cross-store transfer opportunity engine (Gap 2) ────────────────────────
// Runs entirely client-side against already-loaded inventory data — no extra
// Supabase query. O(n×m) where n and m are item counts per store. At current
// scale (8 × 186 = 1,488 pairs) this is trivial and runs in sub-millisecond.
//
// Step 0-B confirmed 12 Apr 2026: no shared SKUs exist in the current Medi
// Can network (MC-* vs MED-* prefixes, zero overlap). This function will
// therefore return an empty array for this network — that is the correct
// and honest output. The engine is built correctly for future networks
// where stores carry overlapping inventory.
//
// SKU matching uses the `sku` text column exactly. No fuzzy name matching,
// no normalisation, no case-insensitive collapse — per the Gap 2 decision
// tree, fuzzy matching is a future enhancement, not S2 scope.
//
// Gap 2 formulas:
//   surplus      = currentQty - reorderLevel - safeReorderQty
//   needed       = reorderLevel - currentQty  (only when in need)
//   suggestedQty = FLOOR(MIN(surplus, needed))
function buildTransferOpportunities(resultByTenant, members) {
  // Build a map: sku → [{ member, item }]
  const skuMap = {};
  for (const m of members) {
    const result = resultByTenant[m.tenant_id];
    if (!result || !result.items) continue;
    for (const item of result.items) {
      if (!item.sku) continue;
      if (!skuMap[item.sku]) skuMap[item.sku] = [];
      skuMap[item.sku].push({ member: m, item });
    }
  }

  const opportunities = [];
  for (const [sku, entries] of Object.entries(skuMap)) {
    // Skip SKUs present in only one store — nothing to transfer
    if (entries.length < 2) continue;

    // Partition into stores that need stock (≤ reorderLevel) and stores
    // with surplus (> reorderLevel + safeReorderQty buffer)
    const needs = entries.filter(
      (e) =>
        e.item.reorderLevel > 0 &&
        e.item.quantityOnHand <= e.item.reorderLevel,
    );
    const haves = entries
      .filter((e) => {
        const buffer = e.item.reorderLevel + (e.item.safeReorderQty || 0);
        return e.item.quantityOnHand > buffer;
      })
      .sort((a, b) => {
        // Highest surplus first — greedy matching
        const aSurplus =
          a.item.quantityOnHand -
          a.item.reorderLevel -
          (a.item.safeReorderQty || 0);
        const bSurplus =
          b.item.quantityOnHand -
          b.item.reorderLevel -
          (b.item.safeReorderQty || 0);
        return bSurplus - aSurplus;
      });

    if (needs.length === 0 || haves.length === 0) continue;

    for (const need of needs) {
      // Find the best have that isn't the same store
      const have = haves.find(
        (h) => h.member.tenant_id !== need.member.tenant_id,
      );
      if (!have) continue;

      const needed = need.item.reorderLevel - need.item.quantityOnHand;
      const surplus =
        have.item.quantityOnHand -
        have.item.reorderLevel -
        (have.item.safeReorderQty || 0);
      const suggestedQty = Math.floor(Math.min(surplus, needed));

      if (suggestedQty <= 0) continue;

      opportunities.push({
        sku,
        productName: need.item.name,
        fromMember: have.member,
        toMember: need.member,
        suggestedQty,
        fromCurrentQty: have.item.quantityOnHand,
        toCurrentQty: need.item.quantityOnHand,
        fromReorderLevel: have.item.reorderLevel,
        toReorderLevel: need.item.reorderLevel,
      });
    }
  }

  return opportunities;
}

// Inline pill — same pattern as RevenueIntelligence + StoreComparison.
function IndustryPill({ profile }) {
  const badge = resolveBadge(profile);
  return (
    <span
      style={{
        display: "inline-block",
        background: badge.bg,
        color: badge.fg,
        fontSize: T.text?.xs || 11,
        fontWeight: T.weight?.semibold || 600,
        padding: `2px ${T.pad?.sm || 8}px`,
        borderRadius: T.radius?.full || 9999,
        letterSpacing: "0.04em",
      }}
    >
      {badge.label}
    </span>
  );
}

// ─── KPI Tile ───────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, subColour, colour, accent = false }) {
  return (
    <div
      style={{
        background: accent ? T.accentLight || "#ECFDF5" : T.surface || "#fff",
        border: `1px solid ${accent ? T.accent || "#2D6A4F" : T.border || "#E5E7EB"}`,
        borderRadius: T.radius?.lg || 10,
        padding: T.inset?.card || 16,
        display: "flex",
        flexDirection: "column",
        gap: T.gap?.xs || 4,
      }}
    >
      <div
        style={{
          fontSize: T.text?.xs || 11,
          fontWeight: T.weight?.semibold || 600,
          color: T.ink400 || "#9CA3AF",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: T.text?.["2xl"] || 22,
          fontWeight: T.weight?.bold || 700,
          color: colour || T.ink900 || "#0D0D0D",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: T.text?.xs || 11,
            color: subColour || T.ink500 || "#6B7280",
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Status chip (small coloured pill for counts) ───────────────────────────
function StatusChip({ count, label, bg, fg, border }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 4,
        background: bg,
        color: fg,
        border: border ? `1px solid ${border}` : "none",
        borderRadius: T.radius?.full || 9999,
        padding: `2px ${T.pad?.sm || 8}px`,
        fontSize: T.text?.xs || 11,
        fontWeight: T.weight?.semibold || 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span>{count}</span>
      <span
        style={{
          fontWeight: T.weight?.normal || 400,
          textTransform: "lowercase",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </span>
  );
}

// ─── 3-segment proportional stock health bar ────────────────────────────────
// Segments (left to right): healthy (green) · low (amber) · critical (red)
// Widths are proportional to counts; segments with 0 are omitted entirely.
function HealthBar({ healthy, low, critical }) {
  const total = healthy + low + critical;
  if (total === 0) {
    return (
      <div
        style={{
          height: 6,
          background: T.surfaceAlt || "#F9FAFB",
          borderRadius: T.radius?.full || 9999,
        }}
      />
    );
  }
  const pct = (n) => (n / total) * 100;
  return (
    <div
      style={{
        display: "flex",
        height: 6,
        borderRadius: T.radius?.full || 9999,
        overflow: "hidden",
        background: T.surfaceAlt || "#F9FAFB",
      }}
    >
      {healthy > 0 && (
        <div
          style={{
            width: `${pct(healthy)}%`,
            background: T.success || "#27ae60",
          }}
          title={`${healthy} healthy`}
        />
      )}
      {low > 0 && (
        <div
          style={{
            width: `${pct(low)}%`,
            background: T.warning || "#e67e22",
          }}
          title={`${low} low`}
        />
      )}
      {critical > 0 && (
        <div
          style={{
            width: `${pct(critical)}%`,
            background: T.danger || "#c0392b",
          }}
          title={`${critical} out of stock`}
        />
      )}
    </div>
  );
}

// ─── Network Insight Banner (Gap 4) ─────────────────────────────────────────
// Renders between Section 1 and Section 2. Shows restock alerts + dead
// stock capital. Only renders when either signal is non-zero — absent,
// not empty, when both are zero.
function NetworkInsightBanner({
  criticalCount,
  deadCount,
  deadStockValue,
  deadPct,
  avcoMissingInDead,
}) {
  const hasCritical = criticalCount > 0;
  const hasDead = deadCount > 0;
  if (!hasCritical && !hasDead) return null;

  const rowStyle = {
    display: "flex",
    alignItems: "baseline",
    gap: T.gap?.md || 12,
    fontSize: T.text?.sm || 13,
    color: T.ink700 || "#374151",
    lineHeight: 1.5,
  };
  const labelStyle = {
    fontSize: T.text?.xs || 11,
    fontWeight: T.weight?.semibold || 600,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    minWidth: 130,
    flexShrink: 0,
  };

  return (
    <div
      style={{
        background: T.surfaceAlt || "#F9FAFB",
        border: `1px solid ${T.border || "#E5E7EB"}`,
        borderLeft: `3px solid ${
          hasCritical ? T.danger || "#c0392b" : T.warning || "#e67e22"
        }`,
        borderRadius: T.radius?.md || 8,
        padding: `${T.pad?.md || 12}px ${T.pad?.lg || 16}px`,
        display: "flex",
        flexDirection: "column",
        gap: T.gap?.sm || 8,
      }}
    >
      {hasCritical && (
        <div style={rowStyle}>
          <span style={{ ...labelStyle, color: T.dangerText || "#7b1a11" }}>
            ⚠ Restock alerts
          </span>
          <span>
            <strong
              style={{
                color: T.dangerText || "#7b1a11",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {criticalCount}
            </strong>{" "}
            item{criticalCount !== 1 ? "s" : ""} critical (less than 7 days of
            stock) across the network
          </span>
        </div>
      )}
      {hasDead && (
        <div style={rowStyle}>
          <span style={{ ...labelStyle, color: T.warningText || "#7d4a00" }}>
            Dead stock
          </span>
          <span>
            <strong
              style={{
                color: T.ink900 || "#0D0D0D",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtR(deadStockValue)}
            </strong>{" "}
            tied up in {deadCount} item{deadCount !== 1 ? "s" : ""}
            {deadPct != null && (
              <>
                {" · "}
                <span style={{ color: T.ink600 || "#6B7280" }}>
                  {fmtPct(deadPct)} of network inventory value
                </span>
              </>
            )}
            {avcoMissingInDead > 0 && (
              <span
                style={{
                  color: T.ink400 || "#9CA3AF",
                  fontSize: T.text?.xs || 11,
                  marginLeft: T.gap?.xs || 4,
                  fontStyle: "italic",
                }}
              >
                ({avcoMissingInDead} dead item{avcoMissingInDead !== 1 ? "s" : ""}{" "}
                with no AVCO — capital figure is understated)
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Per-store stock health card ────────────────────────────────────────────
function StoreStockCard({ member, inventoryResult, onNavigate, isSelf }) {
  const summary = inventoryResult?.summary || {
    total: 0,
    outOfStock: 0,
    lowStock: 0,
    slowMovers: 0,
    deadStock: 0,
    totalValue: 0,
    avcoMissing: 0,
  };
  const hasErr = !!inventoryResult?.err;
  const healthy =
    summary.total - summary.outOfStock - summary.lowStock;
  const profile = member.tenants?.industry_profile || "cannabis_retail";
  const storeName = member.tenants?.name || member.tenant_id.slice(0, 8);

  return (
    <div
      style={{
        background: T.surface || "#fff",
        border: `1px solid ${isSelf ? T.accent || "#2D6A4F" : T.border || "#E5E7EB"}`,
        borderRadius: T.radius?.lg || 10,
        padding: T.inset?.card || 16,
        display: "flex",
        flexDirection: "column",
        gap: T.gap?.md || 12,
        outline: isSelf ? `2px solid ${T.accent || "#2D6A4F"}` : "none",
        outlineOffset: 2,
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink900 || "#0D0D0D",
            marginBottom: T.gap?.xs || 4,
          }}
        >
          {storeName}
          {isSelf && (
            <span
              style={{
                fontSize: T.text?.xs || 11,
                fontWeight: T.weight?.normal || 400,
                color: T.accentText || "#2D6A4F",
                marginLeft: T.gap?.xs || 4,
              }}
            >
              (you)
            </span>
          )}
        </div>
        <IndustryPill profile={profile} />
      </div>

      {/* Error state */}
      {hasErr && (
        <div
          style={{
            background: T.dangerLight || "#FEF2F2",
            border: `1px solid ${T.dangerBorder || "#FECACA"}`,
            borderRadius: T.radius?.sm || 6,
            padding: `${T.pad?.xs || 4}px ${T.pad?.sm || 8}px`,
            fontSize: T.text?.xs || 11,
            color: T.dangerText || "#DC2626",
          }}
        >
          ⚠ Inventory unavailable: {inventoryResult.err}
        </div>
      )}

      {/* Stock value */}
      <div>
        <div
          style={{
            fontSize: T.text?.xs || 11,
            color: T.ink500 || "#6B7280",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 2,
          }}
        >
          Stock value (AVCO)
        </div>
        <div
          style={{
            fontSize: T.text?.xl || 18,
            fontWeight: T.weight?.bold || 700,
            color: T.ink900 || "#0D0D0D",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtR(summary.totalValue)}
        </div>
        <div
          style={{
            fontSize: T.text?.xs || 11,
            color: T.ink500 || "#6B7280",
            marginTop: 2,
          }}
        >
          {fmtNum(summary.total)} SKU{summary.total !== 1 ? "s" : ""}
          {summary.avcoMissing > 0 && (
            <>
              {" · "}
              <span style={{ color: T.warningText || "#D97706" }}>
                {summary.avcoMissing} with no AVCO set
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status chips row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: T.gap?.sm || 8,
        }}
      >
        <StatusChip
          count={healthy}
          label="OK"
          bg={T.successLight || "#eafaf1"}
          fg={T.successText || "#1a6b3c"}
        />
        <StatusChip
          count={summary.lowStock}
          label="low"
          bg={T.warningLight || "#fef9f0"}
          fg={T.warningText || "#7d4a00"}
        />
        <StatusChip
          count={summary.outOfStock}
          label="critical"
          bg={T.dangerLight || "#fdf0ef"}
          fg={T.dangerText || "#7b1a11"}
        />
        <StatusChip
          count={summary.slowMovers}
          label="slow"
          bg={T.warningLight || "#fef9f0"}
          fg={T.warningText || "#7d4a00"}
        />
      </div>

      {/* 3-segment health bar */}
      <HealthBar
        healthy={healthy}
        low={summary.lowStock}
        critical={summary.outOfStock}
      />

      {/* View transfers action */}
      <button
        type="button"
        onClick={() => onNavigate && onNavigate("transfers")}
        style={{
          alignSelf: "flex-start",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: T.font,
          fontSize: T.text?.xs || 11,
          fontWeight: T.weight?.semibold || 600,
          color: T.accentText || "#2D6A4F",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        View transfers →
      </button>
    </div>
  );
}

// ─── Slow Movers table (per store, collapsible) — UNCHANGED from S1 ─────────
// Per Gap 5 decision: dead-stock items intentionally appear in BOTH this
// section and the new Section 6 Dead Stock Breakdown. Different analytical
// lens on the same data. Do not retroactively modify this component.
function SlowMoversSection({ member, inventoryResult }) {
  const [expanded, setExpanded] = useState(false);

  const slowItems = useMemo(() => {
    const items = (inventoryResult?.items || []).filter((i) => i.isSlowMover);
    return items.sort((a, b) => b.daysSinceMovement - a.daysSinceMovement);
  }, [inventoryResult]);

  const storeName = member.tenants?.name || member.tenant_id.slice(0, 8);
  const count = slowItems.length;
  const totalItems = inventoryResult?.summary?.total || 0;

  return (
    <div
      style={{
        background: T.surface || "#fff",
        border: `1px solid ${T.border || "#E5E7EB"}`,
        borderRadius: T.radius?.lg || 10,
        marginBottom: T.gap?.md || 12,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: T.inset?.card || 16,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: T.font,
          textAlign: "left",
        }}
      >
        <div>
          <div
            style={{
              fontSize: T.text?.base || 14,
              fontWeight: T.weight?.semibold || 600,
              color: T.ink900 || "#0D0D0D",
            }}
          >
            {storeName}
          </div>
          <div
            style={{
              fontSize: T.text?.xs || 11,
              color: T.ink500 || "#6B7280",
              marginTop: 2,
            }}
          >
            {count === 0 ? (
              <span style={{ color: T.successText || "#1a6b3c" }}>
                No slow movers — all {fmtNum(totalItems)} items moved in the
                last 30 days ✓
              </span>
            ) : (
              <>
                {count} slow mover{count !== 1 ? "s" : ""} of {fmtNum(totalItems)}{" "}
                total item{totalItems !== 1 ? "s" : ""}
              </>
            )}
          </div>
        </div>
        {count > 0 && (
          <span
            style={{
              fontSize: T.text?.sm || 13,
              color: T.ink600 || "#6B7280",
              fontFamily: T.font,
              marginLeft: T.gap?.md || 12,
            }}
          >
            {expanded ? "▴" : "▾"}
          </span>
        )}
      </button>

      {expanded && count > 0 && (
        <div
          style={{
            borderTop: `1px solid ${T.border || "#E5E7EB"}`,
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: T.font,
              fontSize: T.text?.sm || 13,
            }}
          >
            <thead>
              <tr>
                {[
                  "SKU",
                  "Item Name",
                  "Days idle",
                  "Qty on hand",
                  "Stock value",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                      background: T.surfaceAlt || "#F9FAFB",
                      borderBottom: `1px solid ${T.border || "#E5E7EB"}`,
                      fontSize: T.text?.xs || 11,
                      fontWeight: T.weight?.semibold || 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: T.ink600 || "#6B7280",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slowItems.map((item) => {
                const rowBg = item.isDeadStock
                  ? T.dangerLight || "#fdf0ef"
                  : T.warningLight || "#fef9f0";
                const rowFg = item.isDeadStock
                  ? T.dangerText || "#7b1a11"
                  : T.warningText || "#7d4a00";
                const chipLabel = item.isDeadStock ? "Dead stock" : "Slow mover";
                const stockValueDisplay =
                  item.weightedAvgCost > 0 ? (
                    fmtR(item.stockValue)
                  ) : (
                    <span
                      style={{ color: T.ink400 || "#9CA3AF" }}
                      title="AVCO not set — receive stock to update weighted average cost"
                    >
                      —
                    </span>
                  );

                return (
                  <tr
                    key={item.id}
                    style={{
                      background: rowBg,
                      borderBottom: `1px solid ${T.border || "#E5E7EB"}`,
                    }}
                  >
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        fontFamily: T.fontMono,
                        fontSize: T.text?.xs || 11,
                        color: T.ink700 || "#374151",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.sku || "—"}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        color: T.ink900 || "#0D0D0D",
                      }}
                    >
                      {truncate(item.name, 40)}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        color: rowFg,
                        fontWeight: T.weight?.semibold || 600,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDaysIdle(item.daysSinceMovement)}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        color:
                          item.quantityOnHand <= 0
                            ? T.ink400 || "#9CA3AF"
                            : T.ink900 || "#0D0D0D",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtNum(item.quantityOnHand)}
                      {item.quantityOnHand <= 0 && (
                        <span
                          style={{
                            marginLeft: T.gap?.xs || 4,
                            fontSize: T.text?.xs || 11,
                            color: T.dangerText || "#7b1a11",
                          }}
                        >
                          (out)
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                        color: T.ink900 || "#0D0D0D",
                      }}
                    >
                      {stockValueDisplay}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          background:
                            item.isDeadStock
                              ? T.danger || "#c0392b"
                              : T.warning || "#e67e22",
                          color: "#ffffff",
                          fontSize: T.text?.xs || 11,
                          fontWeight: T.weight?.semibold || 600,
                          padding: `2px ${T.pad?.sm || 8}px`,
                          borderRadius: T.radius?.full || 9999,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {chipLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Fast Movers section (Gap 3) — per-store collapsible ────────────────────
// Partition order (Gap 3):
//   1. isSellingWithNoStock items first (qty ≤ 0 AND velocity > 0 — POS
//      recorded sales for an item the system says isn't in stock). Sorted
//      by velocityUnits30d DESC. These are the most operationally urgent
//      signal in the entire module — surface them above everything else.
//   2. isFastMover items (velocity ≥ 3 OR daysOfStockLeft < 14) that are
//      NOT isSellingWithNoStock. Sorted by daysOfStockLeft ASC so the
//      most urgent restock needs appear first.
//
// Cap at 25 combined. "+ N more items" toggle expands to show everything.
function FastMoversSection({ member, inventoryResult }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const items = inventoryResult?.items || [];
    const sellingOut = items
      .filter((i) => i.isSellingWithNoStock)
      .sort((a, b) => b.velocityUnits30d - a.velocityUnits30d);
    const regular = items
      .filter((i) => i.isFastMover && !i.isSellingWithNoStock)
      .sort((a, b) => {
        const aDays = Number.isFinite(a.daysOfStockLeft)
          ? a.daysOfStockLeft
          : Infinity;
        const bDays = Number.isFinite(b.daysOfStockLeft)
          ? b.daysOfStockLeft
          : Infinity;
        return aDays - bDays;
      });
    return [...sellingOut, ...regular];
  }, [inventoryResult]);

  const CAP = 25;
  const visibleItems = showAll ? sorted : sorted.slice(0, CAP);
  const hasMore = sorted.length > CAP;

  const storeName = member.tenants?.name || member.tenant_id.slice(0, 8);
  const count = sorted.length;
  const velocityQueried = inventoryResult?.summary?.velocityQueried;
  const velocityErr = inventoryResult?.velocityErr;
  const sellingOutCount = inventoryResult?.summary?.sellingWithNoStock || 0;
  const criticalCount = inventoryResult?.summary?.criticalRestock || 0;

  // Header sub-label priority: selling-out (most urgent) > critical
  // restock > empty-state.
  const subLabel = (() => {
    if (!velocityQueried) {
      return velocityErr
        ? `Velocity unavailable: ${velocityErr}`
        : "Velocity data not loaded";
    }
    if (count === 0) {
      return "No fast movers — velocity below 3 units/mo on every item";
    }
    const parts = [];
    if (sellingOutCount > 0) {
      parts.push(
        `${sellingOutCount} selling with no stock`,
      );
    }
    if (criticalCount > 0) {
      parts.push(`${criticalCount} critical restock`);
    }
    parts.push(`${count} item${count !== 1 ? "s" : ""}`);
    return parts.join(" · ");
  })();

  const subColour =
    sellingOutCount > 0 || criticalCount > 0
      ? T.dangerText || "#7b1a11"
      : count === 0
        ? T.successText || "#1a6b3c"
        : T.ink500 || "#6B7280";

  return (
    <div
      style={{
        background: T.surface || "#fff",
        border: `1px solid ${T.border || "#E5E7EB"}`,
        borderRadius: T.radius?.lg || 10,
        marginBottom: T.gap?.md || 12,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: T.inset?.card || 16,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: T.font,
          textAlign: "left",
        }}
      >
        <div>
          <div
            style={{
              fontSize: T.text?.base || 14,
              fontWeight: T.weight?.semibold || 600,
              color: T.ink900 || "#0D0D0D",
            }}
          >
            {storeName}
          </div>
          <div
            style={{
              fontSize: T.text?.xs || 11,
              color: subColour,
              marginTop: 2,
            }}
          >
            {subLabel}
          </div>
        </div>
        {count > 0 && (
          <span
            style={{
              fontSize: T.text?.sm || 13,
              color: T.ink600 || "#6B7280",
              fontFamily: T.font,
              marginLeft: T.gap?.md || 12,
            }}
          >
            {expanded ? "▴" : "▾"}
          </span>
        )}
      </button>

      {expanded && count > 0 && (
        <div
          style={{
            borderTop: `1px solid ${T.border || "#E5E7EB"}`,
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: T.font,
              fontSize: T.text?.sm || 13,
            }}
          >
            <thead>
              <tr>
                {[
                  "SKU",
                  "Item Name",
                  "Units/30d",
                  "On hand",
                  "Days of stock",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                      background: T.surfaceAlt || "#F9FAFB",
                      borderBottom: `1px solid ${T.border || "#E5E7EB"}`,
                      fontSize: T.text?.xs || 11,
                      fontWeight: T.weight?.semibold || 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: T.ink600 || "#6B7280",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                // Row styling by urgency:
                //   selling-with-no-stock → dangerLight
                //   critical restock (< 7d) → dangerLight
                //   low (< 14d) → warningLight
                //   else → no tint (healthy fast mover)
                let rowBg = "transparent";
                let chipLabel = "Fast mover";
                let chipColour = T.success || "#27ae60";
                let daysDisplay;
                let daysColour = T.ink900 || "#0D0D0D";

                if (item.isSellingWithNoStock) {
                  rowBg = T.dangerLight || "#fdf0ef";
                  chipLabel = "Active — no stock";
                  chipColour = T.danger || "#c0392b";
                  daysDisplay = (
                    <span
                      style={{
                        display: "inline-block",
                        background: T.danger || "#c0392b",
                        color: "#ffffff",
                        fontSize: T.text?.xs || 11,
                        fontWeight: T.weight?.bold || 700,
                        padding: `1px ${T.pad?.xs || 4}px`,
                        borderRadius: T.radius?.sm || 6,
                      }}
                    >
                      OUT
                    </span>
                  );
                } else if (item.isCriticalRestock) {
                  rowBg = T.dangerLight || "#fdf0ef";
                  chipLabel = "Critical restock";
                  chipColour = T.danger || "#c0392b";
                  daysColour = T.dangerText || "#7b1a11";
                  daysDisplay = fmtDaysOfStock(item.daysOfStockLeft);
                } else if (item.daysOfStockLeft < 14) {
                  rowBg = T.warningLight || "#fef9f0";
                  chipLabel = "Low stock";
                  chipColour = T.warning || "#e67e22";
                  daysColour = T.warningText || "#7d4a00";
                  daysDisplay = fmtDaysOfStock(item.daysOfStockLeft);
                } else {
                  daysDisplay = fmtDaysOfStock(item.daysOfStockLeft);
                }

                return (
                  <tr
                    key={item.id}
                    style={{
                      background: rowBg,
                      borderBottom: `1px solid ${T.border || "#E5E7EB"}`,
                    }}
                  >
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        fontFamily: T.fontMono,
                        fontSize: T.text?.xs || 11,
                        color: T.ink700 || "#374151",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.sku || "—"}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        color: T.ink900 || "#0D0D0D",
                      }}
                    >
                      {truncate(item.name, 40)}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        color: T.ink900 || "#0D0D0D",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtMonthlyRate(item.monthlyRate)}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        color:
                          item.quantityOnHand <= 0
                            ? T.ink400 || "#9CA3AF"
                            : T.ink900 || "#0D0D0D",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtNum(item.quantityOnHand)}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        color: daysColour,
                        fontWeight: T.weight?.semibold || 600,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {daysDisplay}
                    </td>
                    <td
                      style={{
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          background: chipColour,
                          color: "#ffffff",
                          fontSize: T.text?.xs || 11,
                          fontWeight: T.weight?.semibold || 600,
                          padding: `2px ${T.pad?.sm || 8}px`,
                          borderRadius: T.radius?.full || 9999,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {chipLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hasMore && (
            <div
              style={{
                padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                background: T.surfaceAlt || "#F9FAFB",
                borderTop: `1px solid ${T.border || "#E5E7EB"}`,
                textAlign: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font,
                  fontSize: T.text?.xs || 11,
                  fontWeight: T.weight?.semibold || 600,
                  color: T.accentText || "#2D6A4F",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {showAll
                  ? `Show top ${CAP} only`
                  : `+ ${sorted.length - CAP} more item${sorted.length - CAP !== 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Transfer Opportunities section (Gap 2) ─────────────────────────────────
// Network-level. Renders one card per opportunity, or a single honest
// empty state card when no shared SKUs exist across the network.
// Step 0-B confirmed 12 Apr 2026: zero shared SKUs in Medi Can network
// → empty state is the expected and correct output.
function TransferOpportunitiesSection({ opportunities, onNavigate }) {
  if (opportunities.length === 0) {
    return (
      <div
        style={{
          background: T.surface || "#fff",
          border: `1px solid ${T.border || "#E5E7EB"}`,
          borderRadius: T.radius?.lg || 10,
          padding: T.inset?.modal || 24,
          display: "flex",
          flexDirection: "column",
          gap: T.gap?.sm || 8,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 32,
            color: T.ink300 || "#9CA3AF",
            lineHeight: 1,
          }}
        >
          ↔
        </div>
        <div
          style={{
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink700 || "#374151",
          }}
        >
          No transfer opportunities detected
        </div>
        <div
          style={{
            fontSize: T.text?.sm || 13,
            color: T.ink500 || "#6B7280",
            maxWidth: 480,
            lineHeight: 1.5,
          }}
        >
          Transfer opportunities require matching products (by SKU) in two or
          more stores, where one store is below its reorder level and another
          has surplus above its reorder buffer. Your current network carries
          distinct inventory per store with no SKU overlap, so no transfers
          are suggested. When stores begin carrying overlapping products this
          view will surface suggestions automatically.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: T.page?.cardGap || 16,
      }}
    >
      {opportunities.map((opp, i) => (
        <div
          key={`${opp.sku}-${opp.fromMember.tenant_id}-${opp.toMember.tenant_id}-${i}`}
          style={{
            background: T.surface || "#fff",
            border: `1px solid ${T.border || "#E5E7EB"}`,
            borderLeft: `3px solid ${T.accent || "#2D6A4F"}`,
            borderRadius: T.radius?.lg || 10,
            padding: T.inset?.card || 16,
            display: "flex",
            flexDirection: "column",
            gap: T.gap?.sm || 8,
          }}
        >
          <div
            style={{
              fontSize: T.text?.xs || 11,
              fontFamily: T.fontMono,
              color: T.ink500 || "#6B7280",
            }}
          >
            {opp.sku}
          </div>
          <div
            style={{
              fontSize: T.text?.base || 14,
              fontWeight: T.weight?.semibold || 600,
              color: T.ink900 || "#0D0D0D",
            }}
          >
            {truncate(opp.productName, 45)}
          </div>
          <div
            style={{
              fontSize: T.text?.sm || 13,
              color: T.ink700 || "#374151",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: T.gap?.sm || 8,
            }}
          >
            <span style={{ color: T.successText || "#1a6b3c" }}>
              {truncate(opp.fromMember.tenants?.name || "—", 16)}
            </span>
            <span style={{ color: T.ink400 || "#9CA3AF" }}>
              ({opp.fromCurrentQty} on hand)
            </span>
            <span style={{ color: T.ink500 || "#6B7280" }}>→</span>
            <span style={{ color: T.dangerText || "#7b1a11" }}>
              {truncate(opp.toMember.tenants?.name || "—", 16)}
            </span>
            <span style={{ color: T.ink400 || "#9CA3AF" }}>
              ({opp.toCurrentQty} on hand · reorder at {opp.toReorderLevel})
            </span>
          </div>
          <div
            style={{
              fontSize: T.text?.sm || 13,
              color: T.ink600 || "#6B7280",
            }}
          >
            Suggested transfer:{" "}
            <strong
              style={{
                color: T.ink900 || "#0D0D0D",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtNum(opp.suggestedQty)}
            </strong>{" "}
            unit{opp.suggestedQty !== 1 ? "s" : ""}
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("transfers")}
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: T.font,
              fontSize: T.text?.xs || 11,
              fontWeight: T.weight?.semibold || 600,
              color: T.accentText || "#2D6A4F",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginTop: T.gap?.xs || 4,
            }}
          >
            Transfer now →
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Dead Stock Breakdown section (Gap 5) — per-store collapsible ───────────
// Items where isDeadStock = true (qty > 0 AND daysSinceMovement > 60).
// Seven columns with age-banded row colouring. Local flag toggle is a
// visual workflow aid only — no DB write, no notification trigger.
// A future session can wire it to send-notification EF if needed.
function DeadStockSection({ member, inventoryResult }) {
  const [expanded, setExpanded] = useState(false);
  // Local flag state — set of item ids flagged in this session
  const [flaggedIds, setFlaggedIds] = useState(() => new Set());

  const toggleFlag = (id) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deadItems = useMemo(() => {
    const items = (inventoryResult?.items || []).filter((i) => i.isDeadStock);
    return items.sort((a, b) => b.daysSinceMovement - a.daysSinceMovement);
  }, [inventoryResult]);

  const storeName = member.tenants?.name || member.tenant_id.slice(0, 8);
  const count = deadItems.length;
  const deadValue = inventoryResult?.summary?.deadStockValue || 0;
  const totalValue = inventoryResult?.summary?.totalValue || 0;
  const deadPct = totalValue > 0 ? (deadValue / totalValue) * 100 : null;

  const avcoMissingInDead = deadItems.filter(
    (i) => i.weightedAvgCost <= 0,
  ).length;

  return (
    <div
      style={{
        background: T.surface || "#fff",
        border: `1px solid ${T.border || "#E5E7EB"}`,
        borderRadius: T.radius?.lg || 10,
        marginBottom: T.gap?.md || 12,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => count > 0 && setExpanded((v) => !v)}
        disabled={count === 0}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: T.inset?.card || 16,
          background: "transparent",
          border: "none",
          cursor: count > 0 ? "pointer" : "default",
          fontFamily: T.font,
          textAlign: "left",
        }}
      >
        <div>
          <div
            style={{
              fontSize: T.text?.base || 14,
              fontWeight: T.weight?.semibold || 600,
              color: T.ink900 || "#0D0D0D",
            }}
          >
            {storeName}
          </div>
          <div
            style={{
              fontSize: T.text?.xs || 11,
              color:
                count === 0
                  ? T.successText || "#1a6b3c"
                  : T.ink500 || "#6B7280",
              marginTop: 2,
            }}
          >
            {count === 0 ? (
              <>✓ No dead stock · all items moved within 60 days</>
            ) : (
              <>
                {count} dead item{count !== 1 ? "s" : ""} ·{" "}
                <strong
                  style={{
                    color: T.ink900 || "#0D0D0D",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtR(deadValue)}
                </strong>{" "}
                tied up
                {deadPct != null && (
                  <span style={{ color: T.ink600 || "#6B7280" }}>
                    {" · "}
                    {fmtPct(deadPct)} of store value
                  </span>
                )}
                {totalValue === 0 && (
                  <span style={{ color: T.ink400 || "#9CA3AF" }}>
                    {" · "}—% (total value = 0)
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        {count > 0 && (
          <span
            style={{
              fontSize: T.text?.sm || 13,
              color: T.ink600 || "#6B7280",
              fontFamily: T.font,
              marginLeft: T.gap?.md || 12,
            }}
          >
            {expanded ? "▴" : "▾"}
          </span>
        )}
      </button>

      {expanded && count > 0 && (
        <div
          style={{
            borderTop: `1px solid ${T.border || "#E5E7EB"}`,
          }}
        >
          {/* Footnote linking back to Slow Movers */}
          <div
            style={{
              padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
              background: T.surfaceAlt || "#F9FAFB",
              borderBottom: `1px solid ${T.border || "#E5E7EB"}`,
              fontSize: T.text?.xs || 11,
              color: T.ink500 || "#6B7280",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            Items marked dead stock also appear in the Slow Movers section
            above. Section 6 groups them by age band and shows capital
            exposure.
            {avcoMissingInDead > 0 && (
              <>
                {" "}
                <span style={{ color: T.warningText || "#7d4a00" }}>
                  {avcoMissingInDead} item{avcoMissingInDead !== 1 ? "s" : ""}{" "}
                  with no AVCO set — stock value figures are understated.
                </span>
              </>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: T.font,
                fontSize: T.text?.sm || 13,
              }}
            >
              <thead>
                <tr>
                  {[
                    "SKU",
                    "Item Name",
                    "Days idle",
                    "Qty on hand",
                    "Stock value",
                    "Age band",
                    "% of store",
                    "",
                  ].map((h, i) => (
                    <th
                      key={`h-${i}`}
                      style={{
                        textAlign: "left",
                        padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        background: T.surfaceAlt || "#F9FAFB",
                        borderBottom: `1px solid ${T.border || "#E5E7EB"}`,
                        fontSize: T.text?.xs || 11,
                        fontWeight: T.weight?.semibold || 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: T.ink600 || "#6B7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deadItems.map((item) => {
                  const band = getAgeBand(item.daysSinceMovement);
                  const isFlagged = flaggedIds.has(item.id);
                  const storePct =
                    totalValue > 0
                      ? (item.stockValue / totalValue) * 100
                      : null;
                  const stockValueDisplay =
                    item.weightedAvgCost > 0 ? (
                      fmtR(item.stockValue)
                    ) : (
                      <span
                        style={{ color: T.ink400 || "#9CA3AF" }}
                        title="AVCO not set — receive stock to update weighted average cost"
                      >
                        —
                      </span>
                    );

                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: band.rowBg,
                        borderBottom: `1px solid ${T.border || "#E5E7EB"}`,
                      }}
                    >
                      <td
                        style={{
                          padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                          fontFamily: T.fontMono,
                          fontSize: T.text?.xs || 11,
                          color: T.ink700 || "#374151",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {truncate(item.sku || "—", 12)}
                      </td>
                      <td
                        style={{
                          padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                          color: T.ink900 || "#0D0D0D",
                        }}
                      >
                        {truncate(item.name, 35)}
                      </td>
                      <td
                        style={{
                          padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                          color: band.chipBg,
                          fontWeight: band.semibold
                            ? T.weight?.bold || 700
                            : T.weight?.semibold || 600,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDaysIdle(item.daysSinceMovement)}
                      </td>
                      <td
                        style={{
                          padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                          color: T.ink900 || "#0D0D0D",
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtNum(item.quantityOnHand)}
                      </td>
                      <td
                        style={{
                          padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                          color: T.ink900 || "#0D0D0D",
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {stockValueDisplay}
                      </td>
                      <td
                        style={{
                          padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            background: band.chipBg,
                            color: band.chipFg,
                            fontSize: T.text?.xs || 11,
                            fontWeight: band.semibold
                              ? T.weight?.bold || 700
                              : T.weight?.semibold || 600,
                            padding: `2px ${T.pad?.sm || 8}px`,
                            borderRadius: T.radius?.full || 9999,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {band.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                          color: T.ink500 || "#6B7280",
                          fontSize: T.text?.xs || 11,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {storePct != null ? fmtPct(storePct) : "—"}
                      </td>
                      <td
                        style={{
                          padding: `${T.pad?.sm || 8}px ${T.pad?.md || 12}px`,
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleFlag(item.id)}
                          title={
                            isFlagged
                              ? "Flagged for review — export CSV to share with your team."
                              : "Flag for review"
                          }
                          style={{
                            background: "transparent",
                            border: `1px solid ${
                              isFlagged
                                ? T.warning || "#e67e22"
                                : T.border || "#E5E7EB"
                            }`,
                            borderRadius: T.radius?.sm || 6,
                            padding: `${T.pad?.xs || 4}px ${T.pad?.sm || 8}px`,
                            fontFamily: T.font,
                            fontSize: T.text?.xs || 11,
                            fontWeight: T.weight?.semibold || 600,
                            color: isFlagged
                              ? T.warningText || "#7d4a00"
                              : T.ink600 || "#6B7280",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isFlagged ? "Flagged ✓" : "🚩 Flag"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function StockIntelligence({
  groupId,
  groupName,
  members,
  onNavigate,
}) {
  // eslint-disable-next-line no-unused-vars
  void groupId;

  const [loading, setLoading] = useState(true);
  const [inventoryResults, setInventoryResults] = useState([]);

  // Self-identification — match RevenueIntelligence convention:
  // mark the franchisor (first member by joined_at) as "self".
  const selfTenantId = members[0]?.tenant_id;

  // Fetch inventory for every store in parallel on mount / member change.
  // S2: always passes { includeVelocity: true } so the fetcher runs the
  // second query for fast-mover / restock-risk / transfer-opportunity
  // analysis. Dispensary profile is handled inside the helper per Gap 1.
  useEffect(() => {
    if (!members || members.length === 0) {
      setInventoryResults([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      members.map((m) =>
        fetchStoreInventory(
          m.tenant_id,
          m.tenants?.industry_profile || "cannabis_retail",
          { includeVelocity: true },
        ),
      ),
    ).then((results) => {
      if (cancelled) return;
      setInventoryResults(results);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [members]);

  // Index results by tenantId for O(1) lookup from the store card map.
  const resultByTenant = useMemo(() => {
    const map = {};
    inventoryResults.forEach((r) => {
      if (r && r.tenantId) map[r.tenantId] = r;
    });
    return map;
  }, [inventoryResults]);

  // Network-level aggregates for Section 1 tiles + Gap 4 banner + per-store
  // breakdown strings.
  const network = useMemo(() => {
    let total = 0;
    let totalValue = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let slowMovers = 0;
    let deadStock = 0;
    let deadStockValue = 0;
    let needsReorder = 0;
    let avcoMissing = 0;
    let criticalRestock = 0;
    let avcoMissingInDead = 0;
    const perStore = []; // Array<{ member, summary }>

    members.forEach((m) => {
      const r = resultByTenant[m.tenant_id];
      const s = r?.summary || {
        total: 0,
        totalValue: 0,
        outOfStock: 0,
        lowStock: 0,
        slowMovers: 0,
        deadStock: 0,
        deadStockValue: 0,
        needsReorder: 0,
        avcoMissing: 0,
        criticalRestock: 0,
      };
      total += s.total || 0;
      totalValue += s.totalValue || 0;
      outOfStock += s.outOfStock || 0;
      lowStock += s.lowStock || 0;
      slowMovers += s.slowMovers || 0;
      deadStock += s.deadStock || 0;
      deadStockValue += s.deadStockValue || 0;
      needsReorder += s.needsReorder || 0;
      avcoMissing += s.avcoMissing || 0;
      criticalRestock += s.criticalRestock || 0;

      // Count dead items with missing AVCO (banner footnote input)
      const items = r?.items || [];
      for (const item of items) {
        if (item.isDeadStock && item.weightedAvgCost <= 0) {
          avcoMissingInDead++;
        }
      }

      perStore.push({ member: m, summary: s });
    });

    const deadPct = totalValue > 0 ? (deadStockValue / totalValue) * 100 : null;

    return {
      total,
      totalValue,
      outOfStock,
      lowStock,
      slowMovers,
      deadStock,
      deadStockValue,
      deadPct,
      needsReorder,
      avcoMissing,
      criticalRestock,
      avcoMissingInDead,
      perStore,
    };
  }, [members, resultByTenant]);

  // Cross-store transfer opportunities — see buildTransferOpportunities
  // comment block for the algorithm and the Gap 2 decision tree context.
  const opportunities = useMemo(
    () => buildTransferOpportunities(resultByTenant, members),
    [resultByTenant, members],
  );

  // Per-store breakdown string helper for the KPI tile sub-labels
  const perStoreBreakdown = (key) =>
    network.perStore
      .map((ps) => {
        const name = ps.member.tenants?.name || "—";
        return `${truncate(name, 14)}: ${ps.summary[key] || 0}`;
      })
      .join(" · ");

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          fontSize: T.text?.sm || 13,
          color: T.ink400 || "#9CA3AF",
          fontFamily: T.font,
          gap: T.gap?.sm || 8,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            border: `2px solid ${T.border || "#E5E7EB"}`,
            borderTopColor: T.accent || "#2D6A4F",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Loading stock intelligence…
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div
        style={{
          background: T.surface || "#fff",
          border: `1px solid ${T.border || "#E5E7EB"}`,
          borderRadius: T.radius?.lg || 10,
          padding: T.inset?.card || 16,
          color: T.ink600 || "#6B7280",
          fontSize: T.text?.base || 14,
          fontFamily: T.font,
        }}
      >
        No stores in this network yet.
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
        gap: T.page?.sectionGap || 32,
      }}
    >
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: T.text?.["2xl"] || 22,
            fontWeight: T.weight?.bold || 700,
            color: T.ink900 || "#0D0D0D",
            letterSpacing: "-0.01em",
          }}
        >
          Stock Intelligence · {groupName}
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: T.text?.sm || 13,
            color: T.ink500 || "#6B7280",
          }}
        >
          Where is stock stuck, and where is it needed? · {members.length} store
          {members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Section 1: Network Stock Summary (4 KPI tiles) ──────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: T.page?.cardGap || 16,
        }}
      >
        <KpiTile
          label="Network Stock Value (AVCO)"
          value={fmtR(network.totalValue)}
          sub={
            network.avcoMissing > 0
              ? `${fmtNum(network.total)} SKUs · ${network.avcoMissing} with no AVCO set`
              : `${fmtNum(network.total)} SKUs · ${members.length} store${members.length !== 1 ? "s" : ""}`
          }
          subColour={network.avcoMissing > 0 ? T.warningText : undefined}
          accent
        />
        <KpiTile
          label="Out of Stock"
          value={`${network.outOfStock} item${network.outOfStock !== 1 ? "s" : ""}`}
          colour={network.outOfStock > 0 ? T.dangerText : T.ink900}
          sub={perStoreBreakdown("outOfStock")}
        />
        <KpiTile
          label="Slow Movers (30+ days)"
          value={`${network.slowMovers} item${network.slowMovers !== 1 ? "s" : ""}`}
          colour={network.slowMovers > 0 ? T.warningText : T.ink900}
          sub={`Across ${members.length} store${members.length !== 1 ? "s" : ""}`}
        />
        <KpiTile
          label="Reorder Needed"
          value={`${network.needsReorder} item${network.needsReorder !== 1 ? "s" : ""}`}
          colour={network.needsReorder > 0 ? T.warningText : T.ink900}
          sub={
            network.needsReorder > 0
              ? `Across ${members.length} store${members.length !== 1 ? "s" : ""}`
              : "No items flagged"
          }
        />
      </div>

      {/* ── Network Insight Banner (Gap 4) ──────────────────────────── */}
      <NetworkInsightBanner
        criticalCount={network.criticalRestock}
        deadCount={network.deadStock}
        deadStockValue={network.deadStockValue}
        deadPct={network.deadPct}
        avcoMissingInDead={network.avcoMissingInDead}
      />

      {/* ── Section 2: Per-store stock health cards ────────────────── */}
      <div>
        <h3
          style={{
            margin: `0 0 ${T.gap?.md || 12}px`,
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink700 || "#374151",
          }}
        >
          Stock Health by Store
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: T.page?.cardGap || 16,
          }}
        >
          {members.map((m) => (
            <StoreStockCard
              key={m.tenant_id}
              member={m}
              inventoryResult={resultByTenant[m.tenant_id]}
              onNavigate={onNavigate}
              isSelf={m.tenant_id === selfTenantId}
            />
          ))}
        </div>
      </div>

      {/* ── Section 3: Slow Movers (per-store collapsible tables) ──── */}
      <div>
        <h3
          style={{
            margin: `0 0 ${T.gap?.md || 12}px`,
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink700 || "#374151",
          }}
        >
          Slow Movers
        </h3>
        <div
          style={{
            fontSize: T.text?.xs || 11,
            color: T.ink500 || "#6B7280",
            marginBottom: T.gap?.md || 12,
            lineHeight: 1.5,
          }}
        >
          Items with no movement in the last 30 days. Dead stock ={" "}
          <strong style={{ color: T.dangerText || "#7b1a11" }}>
            quantity &gt; 0 AND idle &gt; 60 days
          </strong>{" "}
          — capital tied up that isn&apos;t selling. Stock value shows
          &ldquo;—&rdquo; when weighted_avg_cost is 0; hover for AVCO disclosure.
        </div>
        {members.map((m) => (
          <SlowMoversSection
            key={m.tenant_id}
            member={m}
            inventoryResult={resultByTenant[m.tenant_id]}
          />
        ))}
      </div>

      {/* ── Section 4: Fast Movers + restock risk ───────────────────── */}
      <div>
        <h3
          style={{
            margin: `0 0 ${T.gap?.md || 12}px`,
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink700 || "#374151",
          }}
        >
          Fast Movers & Restock Risk
        </h3>
        <div
          style={{
            fontSize: T.text?.xs || 11,
            color: T.ink500 || "#6B7280",
            marginBottom: T.gap?.md || 12,
            lineHeight: 1.5,
          }}
        >
          Items selling at ≥ 3 units/mo or running out of stock in less than
          14 days. Items with <strong>quantity ≤ 0 AND recent sales</strong>{" "}
          (&ldquo;Active — no stock&rdquo;) are rendered first — they indicate
          the inventory count is out of sync with POS reality and need
          immediate investigation. Top 25 per store shown by default.
        </div>
        {members.map((m) => (
          <FastMoversSection
            key={m.tenant_id}
            member={m}
            inventoryResult={resultByTenant[m.tenant_id]}
          />
        ))}
      </div>

      {/* ── Section 5: Transfer Opportunities ───────────────────────── */}
      <div>
        <h3
          style={{
            margin: `0 0 ${T.gap?.md || 12}px`,
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink700 || "#374151",
          }}
        >
          Transfer Opportunities
        </h3>
        <div
          style={{
            fontSize: T.text?.xs || 11,
            color: T.ink500 || "#6B7280",
            marginBottom: T.gap?.md || 12,
            lineHeight: 1.5,
          }}
        >
          Cross-store SKU matching — where one store has surplus of a product
          and another store needs it. Uses{" "}
          <code>inventory_items.sku</code> as the join key (exact match).
        </div>
        <TransferOpportunitiesSection
          opportunities={opportunities}
          onNavigate={onNavigate}
        />
      </div>

      {/* ── Section 6: Dead Stock Breakdown by Store ────────────────── */}
      <div>
        <h3
          style={{
            margin: `0 0 ${T.gap?.md || 12}px`,
            fontSize: T.text?.base || 14,
            fontWeight: T.weight?.semibold || 600,
            color: T.ink700 || "#374151",
          }}
        >
          Dead Stock Breakdown
        </h3>
        <div
          style={{
            fontSize: T.text?.xs || 11,
            color: T.ink500 || "#6B7280",
            marginBottom: T.gap?.md || 12,
            lineHeight: 1.5,
          }}
        >
          Items with <strong>quantity &gt; 0 AND idle &gt; 60 days</strong> —
          capital tied up in products that aren&apos;t moving. Grouped by age
          band:{" "}
          <span style={{ color: T.warningText || "#7d4a00" }}>
            60–90 days dead stock
          </span>
          ,{" "}
          <span style={{ color: T.dangerText || "#7b1a11" }}>
            91–180 days very dead
          </span>
          ,{" "}
          <span
            style={{
              color: T.dangerText || "#7b1a11",
              fontWeight: T.weight?.bold || 700,
            }}
          >
            181+ days write-off risk
          </span>
          . The flag toggle is a visual aid only — no DB write, no notification
          sent. Export CSV to share with your team.
        </div>
        {members.map((m) => (
          <DeadStockSection
            key={m.tenant_id}
            member={m}
            inventoryResult={resultByTenant[m.tenant_id]}
          />
        ))}
      </div>

      {/* ── Data quality footnote ───────────────────────────────────── */}
      <div
        style={{
          fontSize: T.text?.xs || 11,
          color: T.ink400 || "#9CA3AF",
          borderTop: `1px solid ${T.border || "#E5E7EB"}`,
          paddingTop: T.pad?.sm || 8,
          lineHeight: 1.6,
        }}
      >
        Slow-mover + dead-stock detection uses{" "}
        <code>inventory_items.last_movement_at</code>, maintained by a DB
        trigger on <code>stock_movements</code> inserts — zero aggregation
        queries for the health snapshot. Velocity data (fast movers +
        transfer opportunities + days-of-stock) comes from a second query
        per store, profile-branched:{" "}
        <code>stock_movements</code> for retail and{" "}
        <code>dispensing_log</code> for cannabis dispensary (LL-231 + LL-226).
        Stock value uses AVCO-correct <code>weighted_avg_cost</code> per
        LL-242. Items where AVCO has not been set render with a
        &ldquo;—&rdquo; value and are counted separately in banners and
        tiles — the capital figure is understated when AVCO is missing.
        Transfer opportunities use exact SKU match only; fuzzy name matching
        is out of scope for this module.
      </div>
    </div>
  );
}
