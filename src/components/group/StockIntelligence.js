// src/components/group/StockIntelligence.js
// WP-ANALYTICS-4 Session 1 — Stock Intelligence
// Primary question: "Where is stock stuck and where is it needed?"
//
// Session 1 (this build):
//   1. Network Stock Summary  — 4 KPI tiles (stock value · out of stock ·
//      slow movers · reorder needed). Each sub-label shows per-store
//      breakdown so the franchise owner sees at a glance which store is
//      dragging which metric.
//   2. Per-store stock health cards — one card per member. Stock value
//      with AVCO-missing disclosure, status pills (OK / Low / Critical /
//      Slow), 3-segment proportional health bar, "View transfers →"
//      action wired to onNavigate.
//   3. Slow Movers — one collapsible section per store listing every
//      item with last_movement_at > 30 days. Dead stock (qty > 0 AND
//      > 60 days) rendered with a distinct chip + dangerLight row tint.
//
// Session 2 will add fast movers + transfer opportunities + dead-stock
// breakdown by store, powered by an opt-in `includeVelocity` mode on
// fetchStoreInventory that adds a stock_movements aggregation query.
//
// Zero stock_movements queries in Session 1 — last_movement_at on
// inventory_items gives O(1) slow-mover / dead-stock detection. The
// only Supabase call per store is the single inventory_items select
// inside fetchStoreInventory.
//
// All layout via T.* tokens (LL-238). LL-242 AVCO-correct stock value
// end-to-end. LL-231 profile branching is unnecessary here — stock
// health queries are identical for all profiles.
//
// Step 0 schema verification 12 Apr 2026 (preserved permanently):
//   inventory_items.last_movement_at   timestamptz  ✓
//   inventory_items.needs_reorder      boolean      ✓
//   inventory_items.max_stock_level    integer      ✓
//   inventory_items.reorder_qty        numeric      ✓
//   Medi Recreational: 186 items · 14 with AVCO · 1 out · 6 low · 10 slow
//   Medi Can Dispensary: 8 items · 8 with AVCO · 0 out · 0 low · 0 slow
//   Live avcoMissing = 172 on Medi Recreational — surfaced prominently
//   in the UI via "N items with no AVCO set" disclosure.

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

// Resolve an INDUSTRY_BADGE descriptor with a safe fallback.
const resolveBadge = (profile) =>
  INDUSTRY_BADGE[profile] || {
    bg: T.neutralLight || "#F3F4F6",
    fg: T.neutralText || "#6B7280",
    label: profile || "Unknown",
  };

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

// ─── Slow Movers table (per store, collapsible) ─────────────────────────────
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

  // Network-level aggregates for Section 1 tiles and the per-store breakdown.
  const network = useMemo(() => {
    let total = 0;
    let totalValue = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let slowMovers = 0;
    let deadStock = 0;
    let needsReorder = 0;
    let avcoMissing = 0;
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
        needsReorder: 0,
        avcoMissing: 0,
      };
      total += s.total;
      totalValue += s.totalValue;
      outOfStock += s.outOfStock;
      lowStock += s.lowStock;
      slowMovers += s.slowMovers;
      deadStock += s.deadStock;
      needsReorder += s.needsReorder;
      avcoMissing += s.avcoMissing;
      perStore.push({ member: m, summary: s });
    });

    return {
      total,
      totalValue,
      outOfStock,
      lowStock,
      slowMovers,
      deadStock,
      needsReorder,
      avcoMissing,
      perStore,
    };
  }, [members, resultByTenant]);

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
        Slow-mover detection uses <code>inventory_items.last_movement_at</code>,
        maintained by a DB trigger on <code>stock_movements</code> inserts —
        zero aggregation queries. Stock value uses AVCO-correct
        <code> weighted_avg_cost</code> per LL-242. Items where AVCO has not
        been set (e.g. simulator-seeded products not yet received through the
        Receiving workflow) render with a &ldquo;—&rdquo; value and are counted
        separately. Session 2 will add fast-mover velocity analysis, transfer
        opportunity detection, and dead-stock breakdown by store.
      </div>
    </div>
  );
}
