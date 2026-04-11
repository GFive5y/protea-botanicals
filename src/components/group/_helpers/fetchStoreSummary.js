// src/components/group/_helpers/fetchStoreSummary.js
// WP-ANALYTICS-1 Step 1 — shared per-store summary fetcher
//
// Extracted from NetworkDashboard.js so every group portal tab can share
// a single, correct, contract-stable per-tenant summary source.
//
// Contract: never throws. Any Supabase error for this tenant lands in
// result.err; partial results stay populated. Callers use this to render
// graceful degradation (one store failing does not crash the grid).
//
// Core fields (always fetched, ~2 queries per store):
//   tenantId, revenue, orderCount, stockMarginPct, stockHealth, aov, err
//
// Extended fields (opt-in via options.includeExtended, ~2-3 extra queries):
//   revenueLastMonth, topProducts
//
// Why opt-in: NetworkDashboard is the /group-portal landing page and must
// stay fast. StoreComparison is an analytics surface where the extra
// round-trips are justified. Default = core only → zero NetworkDashboard
// regression when this file replaces the inline fetcher.
//
// Schema facts honoured:
//   - Dispensary revenue: dispensing_log × inventory_items.sell_price,
//     filter is_voided !== true (LL-231 + LL-226)
//   - Retail revenue: orders.total where status = "paid" (LL-231)
//   - Stock margin: avg (sell_price - weighted_avg_cost) / sell_price × 100
//     across items where both values > 0 (AVCO-correct per LL-242)
//   - Stock health: quantity_on_hand vs reorder_level
//   - Top products (retail): order_items.line_total grouped by product_name
//     (columns verified live 11 Apr 2026 via Supabase MCP)
//   - Top products (dispensary): dispensing_log grouped by inventory_items.name

import { supabase } from "../../../services/supabaseClient";

export async function fetchStoreSummary(
  tenantId,
  industryProfile,
  monthStartISO,
  options = {},
) {
  const {
    includeExtended = false,
    lastMonthStartISO = null,
    lastMonthEndISO = null,
  } = options;

  const result = {
    tenantId,
    revenue: null,
    orderCount: null,
    stockMarginPct: null,
    stockHealth: { critical: 0, low: 0, total: 0 },
    aov: null,
    revenueLastMonth: null,
    topProducts: [],
    err: null,
  };

  try {
    // ── Revenue + count (branch by industry profile per LL-231) ───────────
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

      const rows = (data || []).filter((r) => r.is_voided !== true);
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

    // ── AOV (zero-cost derivation) ────────────────────────────────────────
    if (result.revenue != null && result.orderCount > 0) {
      result.aov = result.revenue / result.orderCount;
    }

    // ── Stock margin + stock health (both from one inventory query) ──────
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

    // ── Extended fields (opt-in — Compare Stores only) ───────────────────
    // Skipped entirely when includeExtended is false. Network Dashboard
    // stays fast; StoreComparison gets the analytics payload.
    if (includeExtended && lastMonthStartISO && lastMonthEndISO) {
      // ── Revenue for prior month (same branch logic, different range) ──
      if (industryProfile === "cannabis_dispensary") {
        const { data: lastData, error: lastErr } = await supabase
          .from("dispensing_log")
          .select(
            "quantity_dispensed, is_voided, inventory_items(sell_price)",
          )
          .eq("tenant_id", tenantId)
          .gte("dispensed_at", lastMonthStartISO)
          .lt("dispensed_at", lastMonthEndISO);
        if (lastErr) throw lastErr;
        const lastRows = (lastData || []).filter(
          (r) => r.is_voided !== true,
        );
        result.revenueLastMonth = lastRows.reduce((sum, r) => {
          const qty = parseFloat(r.quantity_dispensed) || 0;
          const price = parseFloat(r.inventory_items?.sell_price) || 0;
          return sum + qty * price;
        }, 0);
      } else {
        const { data: lastData, error: lastErr } = await supabase
          .from("orders")
          .select("total")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", lastMonthStartISO)
          .lt("created_at", lastMonthEndISO);
        if (lastErr) throw lastErr;
        const lastRows = lastData || [];
        result.revenueLastMonth = lastRows.reduce(
          (sum, r) => sum + (parseFloat(r.total) || 0),
          0,
        );
      }

      // ── Top 5 products by revenue (MTD) ──────────────────────────────
      if (industryProfile === "cannabis_dispensary") {
        // Dispensary: reuse dispensing_log joined to inventory_items.name
        const { data: logs, error: tpErr } = await supabase
          .from("dispensing_log")
          .select(
            "quantity_dispensed, is_voided, inventory_items(name, sell_price)",
          )
          .eq("tenant_id", tenantId)
          .gte("dispensed_at", monthStartISO);
        if (tpErr) throw tpErr;

        const grouped = {};
        for (const log of (logs || []).filter(
          (l) => l.is_voided !== true,
        )) {
          const name = log.inventory_items?.name || "Unnamed";
          const qty = parseFloat(log.quantity_dispensed) || 0;
          const price = parseFloat(log.inventory_items?.sell_price) || 0;
          if (!grouped[name]) grouped[name] = { name, revenue: 0, qty: 0 };
          grouped[name].revenue += qty * price;
          grouped[name].qty += qty;
        }
        result.topProducts = Object.values(grouped)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
      } else {
        // Retail: two-step — paid order IDs for the tenant in range, then
        // order_items for those IDs. PostgREST does not reliably filter
        // by fields on a joined table, so this is the idiomatic path.
        const { data: orderRows, error: ordIdErr } = await supabase
          .from("orders")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", monthStartISO);
        if (ordIdErr) throw ordIdErr;

        const orderIds = (orderRows || []).map((o) => o.id);
        if (orderIds.length > 0) {
          const { data: itemRows, error: itmErr } = await supabase
            .from("order_items")
            .select("product_name, quantity, line_total")
            .in("order_id", orderIds);
          if (itmErr) throw itmErr;

          const grouped = {};
          for (const item of itemRows || []) {
            const name = item.product_name || "Unnamed";
            if (!grouped[name]) grouped[name] = { name, revenue: 0, qty: 0 };
            grouped[name].revenue += parseFloat(item.line_total) || 0;
            grouped[name].qty += parseFloat(item.quantity) || 0;
          }
          result.topProducts = Object.values(grouped)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        }
      }
    }
  } catch (err) {
    console.error(
      `[fetchStoreSummary] failed for tenant ${tenantId}:`,
      err,
    );
    result.err = err.message || "Fetch failed";
  }

  return result;
}
