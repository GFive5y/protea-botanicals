// src/components/group/NetworkDashboard.js
// WP-TENANT-GROUPS Phase 3 — default tab of /group-portal
//
// Renders:
//   1. NuAi Insight Bar (static placeholder — ai-copilot wiring Phase 4)
//   2. 4 Combined KPI tiles (revenue, orders/events, margin, stock value)
//   3. Store comparison grid (1 card per member tenant)
//   4. Quick actions row (transfers / financials / CSV export)
//
// Data:
//   - Receives members[] as prop from GroupPortal (does NOT call useTenant)
//   - All per-store fetches run in parallel via Promise.allSettled
//   - Per-store errors are isolated — one tenant failing does not crash the grid
//
// Schema facts honoured (verified against live source):
//   - orders.total (NOT total_amount) — HQOverview.js:795
//   - orders.status = "paid" — HQProfitLoss.js:1108
//   - inventory_items.reorder_level (NOT reorder_point) — HQOverview.js:525, 644
//   - dispensing_log × inventory_items.sell_price for cannabis_dispensary (LL-231)
//   - dispensing_log.is_voided != true (LL-226)
//
// Tokens: all layout via T.* per WP-DS-6. No hardcoded px matching a token.

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";

// ─── Industry profile badge map ─────────────────────────────────────────────
// Maps industry_profile → { bg, fg, label } using WP-DS-6 tokens only.
// Dispensary uses T.info (clinical blue) per WP-DS-3 plan — no new token needed.
const INDUSTRY_BADGE = {
  cannabis_retail: {
    bg: T.accentLight,
    fg: T.accentText,
    label: "Cannabis Retail",
  },
  cannabis_dispensary: {
    bg: T.infoLight,
    fg: T.infoText,
    label: "Medical Dispensary",
  },
  food_beverage: {
    bg: T.warningLight,
    fg: T.warningText,
    label: "Food & Beverage",
  },
  general_retail: {
    bg: T.neutralLight,
    fg: T.neutralText,
    label: "General Retail",
  },
};

// ─── Currency formatter ────────────────────────────────────────────────────
const fmtR = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return `R${Math.round(n).toLocaleString("en-ZA")}`;
};

const fmtPct = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
};

// ─── Margin colour picker (matches HQOverview / HQProfitLoss convention) ──
const marginColour = (pct) => {
  if (pct == null) return T.ink600;
  if (pct >= 55) return T.successText;
  if (pct >= 40) return T.warningText;
  return T.dangerText;
};

// ─── Main component ────────────────────────────────────────────────────────
export default function NetworkDashboard({
  groupId,
  groupName,
  members,
  onNavigate,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storeData, setStoreData] = useState([]);
  const [networkStockValue, setNetworkStockValue] = useState(0);

  // ── Compute monthStart once ──────────────────────────────────────────────
  const monthStartISO = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  })();

  // ── Per-store fetcher ────────────────────────────────────────────────────
  // Returns { tenantId, revenue, orderCount, stockMarginPct, stockHealth, err }
  // Never throws — wraps every Supabase call in try/catch and returns "—" shape.
  const fetchStoreSummary = useCallback(
    async (tenantId, industryProfile) => {
      const result = {
        tenantId,
        revenue: null,
        orderCount: null,
        stockMarginPct: null,
        stockHealth: { critical: 0, low: 0, total: 0 },
        err: null,
      };

      try {
        // ── Revenue + count (branch by industry profile per LL-231) ───────
        if (industryProfile === "cannabis_dispensary") {
          // Dispensary: dispensing_log × inventory_items.sell_price, exclude voided
          const { data, error: dispErr } = await supabase
            .from("dispensing_log")
            .select(
              "quantity_dispensed, is_voided, inventory_items(sell_price)",
            )
            .eq("tenant_id", tenantId)
            .gte("dispensed_at", monthStartISO);
          if (dispErr) throw dispErr;

          const rows = (data || []).filter(
            (r) => r.is_voided !== true,
          );
          result.revenue = rows.reduce((sum, r) => {
            const qty = parseFloat(r.quantity_dispensed) || 0;
            const price = parseFloat(r.inventory_items?.sell_price) || 0;
            return sum + qty * price;
          }, 0);
          result.orderCount = rows.length;
        } else {
          // Retail / other: orders.total where status = "paid"
          const { data, error: ordErr } = await supabase
            .from("orders")
            .select("total")
            .eq("tenant_id", tenantId)
            .eq("status", "paid")
            .gte("created_at", monthStartISO);
          if (ordErr) throw ordErr;

          const rows = data || [];
          result.revenue = rows.reduce(
            (sum, r) => sum + (parseFloat(r.total) || 0),
            0,
          );
          result.orderCount = rows.length;
        }

        // ── Stock margin + stock health (both from one inventory query) ───
        const { data: items, error: invErr } = await supabase
          .from("inventory_items")
          .select(
            "id, quantity_on_hand, reorder_level, sell_price, weighted_avg_cost, is_active",
          )
          .eq("tenant_id", tenantId)
          .eq("is_active", true);
        if (invErr) throw invErr;

        const activeItems = items || [];

        // Stock margin: avg of (sell_price - weighted_avg_cost) / sell_price * 100
        // across items where both values > 0 (matches HQOverview convention)
        const priced = activeItems.filter(
          (i) =>
            parseFloat(i.sell_price) > 0 &&
            parseFloat(i.weighted_avg_cost) > 0,
        );
        if (priced.length > 0) {
          const margins = priced.map((i) => {
            const sp = parseFloat(i.sell_price);
            const wac = parseFloat(i.weighted_avg_cost);
            return ((sp - wac) / sp) * 100;
          });
          result.stockMarginPct =
            margins.reduce((a, b) => a + b, 0) / margins.length;
        }

        // Stock health: count critical (qty <= 0) and low (qty <= reorder, > 0)
        result.stockHealth.total = activeItems.length;
        for (const i of activeItems) {
          const qty = parseFloat(i.quantity_on_hand) || 0;
          const reorder = parseFloat(i.reorder_level) || 0;
          if (qty <= 0) {
            result.stockHealth.critical++;
          } else if (reorder > 0 && qty <= reorder) {
            result.stockHealth.low++;
          }
        }
      } catch (err) {
        console.error(
          `[NetworkDashboard] fetch failed for tenant ${tenantId}:`,
          err,
        );
        result.err = err.message || "Fetch failed";
      }

      return result;
    },
    [monthStartISO],
  );

  // ── Fetch everything in parallel ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!members || members.length === 0) {
      setStoreData([]);
      setNetworkStockValue(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Parallel per-store fetches (Promise.allSettled — resilient)
      const settled = await Promise.allSettled(
        members.map((m) =>
          fetchStoreSummary(m.tenant_id, m.tenants?.industry_profile),
        ),
      );
      const data = settled.map((s, i) =>
        s.status === "fulfilled"
          ? s.value
          : {
              tenantId: members[i].tenant_id,
              revenue: null,
              orderCount: null,
              stockMarginPct: null,
              stockHealth: { critical: 0, low: 0, total: 0 },
              err: s.reason?.message || "Unknown error",
            },
      );
      setStoreData(data);

      // Network stock value (one cross-tenant query — uses .in() filter)
      const tenantIds = members.map((m) => m.tenant_id);
      const { data: stockRows, error: stockErr } = await supabase
        .from("inventory_items")
        .select("quantity_on_hand, weighted_avg_cost")
        .in("tenant_id", tenantIds)
        .eq("is_active", true)
        .gt("quantity_on_hand", 0);
      if (stockErr) throw stockErr;
      const total = (stockRows || []).reduce((sum, r) => {
        const qty = parseFloat(r.quantity_on_hand) || 0;
        const wac = parseFloat(r.weighted_avg_cost) || 0;
        return sum + qty * wac;
      }, 0);
      setNetworkStockValue(total);
    } catch (err) {
      console.error("[NetworkDashboard] fetchAll failed:", err);
      setError(err.message || "Failed to load network dashboard");
    } finally {
      setLoading(false);
    }
  }, [members, fetchStoreSummary]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Derived network totals ──────────────────────────────────────────────
  const combinedRevenue = storeData.reduce(
    (sum, s) => sum + (s.revenue || 0),
    0,
  );
  const combinedCount = storeData.reduce(
    (sum, s) => sum + (s.orderCount || 0),
    0,
  );

  // Network avg margin — weighted by priced-item count per store is hard
  // without re-fetching; use simple average of per-store stockMarginPct values
  // that are non-null. Matches HQOverview's "avg across priced items" convention.
  const storesWithMargin = storeData.filter((s) => s.stockMarginPct != null);
  const networkMargin =
    storesWithMargin.length > 0
      ? storesWithMargin.reduce((sum, s) => sum + s.stockMarginPct, 0) /
        storesWithMargin.length
      : null;

  // Tile 2 label — adapts to mix of profiles in the group
  const profiles = new Set(
    (members || []).map((m) => m.tenants?.industry_profile).filter(Boolean),
  );
  const hasDispensary = profiles.has("cannabis_dispensary");
  const hasNonDispensary = [...profiles].some(
    (p) => p !== "cannabis_dispensary",
  );
  const countLabel =
    hasDispensary && hasNonDispensary
      ? "Orders & Events MTD"
      : hasDispensary
        ? "Events MTD"
        : "Orders MTD";

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          background: T.dangerLight,
          border: `1px solid ${T.dangerBorder}`,
          borderRadius: T.radius.md,
          padding: T.inset.card,
          color: T.dangerText,
          fontSize: T.text.base,
          fontFamily: T.font,
        }}
      >
        <strong>Could not load network dashboard:</strong> {error}
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          padding: T.pad.xl,
          textAlign: "center",
          color: T.ink600,
          fontFamily: T.font,
          fontSize: T.text.base,
        }}
      >
        Loading network data…
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: T.page.sectionGap,
        fontFamily: T.font,
      }}
    >
      {/* ── 1. NuAi Insight Bar ──────────────────────────────────────────── */}
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.md,
          padding: T.inset.card,
          display: "flex",
          alignItems: "center",
          gap: T.gap.md,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: T.radius.full,
            background: T.accent,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
            color: T.ink400,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          NuAi Insight
        </div>
        <div
          style={{
            flex: 1,
            fontSize: T.text.sm,
            color: T.ink700,
            lineHeight: 1.5,
          }}
        >
          NuAi is analysing your network{members.length > 1 ? "" : " — add a second store to unlock cross-store insights"}. {combinedRevenue > 0 && `Combined revenue MTD: ${fmtR(combinedRevenue)}.`}
        </div>
      </div>

      {/* ── 2. KPI Tiles (4 in a grid) ───────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: T.page.cardGap,
        }}
      >
        <KpiTile label="Combined Revenue MTD" value={fmtR(combinedRevenue)} />
        <KpiTile label={countLabel} value={combinedCount.toLocaleString("en-ZA")} />
        <KpiTile
          label="Network Avg Stock Margin"
          value={fmtPct(networkMargin)}
          valueColor={marginColour(networkMargin)}
          sub={
            storesWithMargin.length < storeData.length
              ? `${storesWithMargin.length}/${storeData.length} stores priced`
              : null
          }
        />
        <KpiTile
          label="Combined Stock Value"
          value={fmtR(networkStockValue)}
          sub="AVCO weighted"
        />
      </div>

      {/* ── 3. Store comparison grid ─────────────────────────────────────── */}
      <div>
        <div
          style={{
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
            color: T.ink600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: T.gap.lg,
          }}
        >
          Store Comparison
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: T.page.cardGap,
          }}
        >
          {members.map((m, i) => {
            const data = storeData[i] || {};
            const badge =
              INDUSTRY_BADGE[m.tenants?.industry_profile] || {
                bg: T.neutralLight,
                fg: T.neutralText,
                label: m.tenants?.industry_profile || "Unknown",
              };
            return (
              <StoreCard
                key={m.tenant_id}
                name={m.tenants?.name || "Unnamed store"}
                badge={badge}
                data={data}
              />
            );
          })}
        </div>
      </div>

      {/* ── 4. Quick Actions row ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: T.gap.lg,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate && onNavigate("transfers")}
          style={quickActionStyle(true)}
        >
          Transfer stock between stores
        </button>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate("financials")}
          style={quickActionStyle(false)}
        >
          Combined P&L report
        </button>
        <button
          type="button"
          onClick={() => {
            // Phase 4: CSV export of network summary
            // eslint-disable-next-line no-console
            console.log("TODO Phase 4: CSV export of network summary");
          }}
          style={quickActionStyle(false)}
        >
          Export network summary
        </button>
      </div>
    </div>
  );
}

// ─── KPI tile helper ───────────────────────────────────────────────────────
function KpiTile({ label, value, sub, valueColor }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.md,
        padding: T.inset.card,
        display: "flex",
        flexDirection: "column",
        gap: T.gap.xs,
      }}
    >
      <div
        style={{
          fontSize: T.text.xs,
          fontWeight: T.weight.semibold,
          color: T.ink400,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: T.text["2xl"],
          fontWeight: T.weight.bold,
          color: valueColor || T.ink900,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: T.text.xs,
            color: T.ink600,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Store card helper ─────────────────────────────────────────────────────
function StoreCard({ name, badge, data }) {
  const stockHealthDisplay = (() => {
    if (!data.stockHealth) return { text: "—", color: T.ink600 };
    const { critical, low } = data.stockHealth;
    if (critical > 0) {
      return {
        text: `${critical} critical${low > 0 ? ` · ${low} low` : ""}`,
        color: T.dangerText,
      };
    }
    if (low > 0) {
      return { text: `${low} low`, color: T.warningText };
    }
    return { text: "All stocked", color: T.successText };
  })();

  const rows = [
    {
      label: "Revenue MTD",
      value: fmtR(data.revenue),
      color: T.ink900,
    },
    {
      label: "Stock margin",
      value: fmtPct(data.stockMarginPct),
      color: marginColour(data.stockMarginPct),
    },
    {
      label: "Orders / events",
      value:
        data.orderCount != null
          ? data.orderCount.toLocaleString("en-ZA")
          : "—",
      color: T.ink900,
    },
    {
      label: "Stock health",
      value: stockHealthDisplay.text,
      color: stockHealthDisplay.color,
    },
  ];

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        padding: T.inset.card,
        display: "flex",
        flexDirection: "column",
        gap: T.gap.md,
      }}
    >
      {/* Header: name + industry badge */}
      <div>
        <div
          style={{
            fontSize: T.text.base,
            fontWeight: T.weight.medium,
            color: T.ink900,
            marginBottom: T.gap.xs,
          }}
        >
          {name}
        </div>
        <span
          style={{
            display: "inline-block",
            background: badge.bg,
            color: badge.fg,
            fontSize: T.text.xs,
            fontWeight: T.weight.semibold,
            padding: `${T.pad.xs}px ${T.pad.sm}px`,
            borderRadius: T.radius.sm,
            letterSpacing: "0.04em",
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Metric rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: T.gap.sm,
        }}
      >
        {rows.map((row, idx) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              paddingBottom: T.gap.sm,
              borderBottom:
                idx < rows.length - 1 ? `1px solid ${T.border}` : "none",
              fontSize: T.text.sm,
            }}
          >
            <span style={{ color: T.ink600 }}>{row.label}</span>
            <span
              style={{
                color: row.color,
                fontWeight: T.weight.semibold,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* View store button — Phase 4 placeholder */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: T.gap.sm,
        }}
      >
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log(
              "TODO Phase 4: switch tenant context and navigate to /tenant-portal",
            );
          }}
          style={{
            background: "transparent",
            border: "none",
            color: T.accent,
            fontFamily: T.font,
            fontSize: T.text.sm,
            fontWeight: T.weight.medium,
            cursor: "pointer",
            padding: 0,
          }}
        >
          View store →
        </button>
        <span
          style={{
            fontSize: T.text.xs,
            color: T.ink400,
            fontStyle: "italic",
          }}
        >
          Phase 4
        </span>
      </div>

      {/* Per-store fetch error (if any) */}
      {data.err && (
        <div
          style={{
            marginTop: T.gap.xs,
            fontSize: T.text.xs,
            color: T.dangerText,
            background: T.dangerLight,
            border: `1px solid ${T.dangerBorder}`,
            borderRadius: T.radius.sm,
            padding: `${T.pad.xs}px ${T.pad.sm}px`,
          }}
          title={data.err}
        >
          Some metrics unavailable
        </div>
      )}
    </div>
  );
}

// ─── Quick action button style ─────────────────────────────────────────────
function quickActionStyle(primary) {
  return {
    padding: `${T.pad.md}px ${T.pad.lg}px`,
    borderRadius: T.radius.md,
    border: primary ? "none" : `1px solid ${T.border}`,
    background: primary ? T.accent : T.surface,
    color: primary ? "#fff" : T.ink700,
    fontFamily: T.font,
    fontSize: T.text.sm,
    fontWeight: T.weight.semibold,
    cursor: "pointer",
  };
}
