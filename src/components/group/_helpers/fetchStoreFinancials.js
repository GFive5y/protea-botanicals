// src/components/group/_helpers/fetchStoreFinancials.js
// WP-ANALYTICS-2 — shared per-store financials fetcher
//
// Sibling to fetchStoreSummary.js. Solves a different question:
//   summary     = "are my stores healthy right now?" (MTD, no date control)
//   financials  = "P&L for a specific period"         (full date range)
//
// Contract: never throws. Any Supabase error for this tenant lands in
// result.err with partial results populated where possible. Callers use
// this to render graceful degradation in the Combined P&L grid — one
// store failing does not crash the rest.
//
// Queries per store (parallelisable across tenants via Promise.all):
//   Retail / general_retail / food_beverage (3 queries):
//     1. orders → paid order IDs in [startISO, endISO)
//     2. order_items → quantity + line_total + product_metadata for COGS
//     3. expenses → opex/wages/tax/other SUM for period
//   Cannabis dispensary (2 queries):
//     1. dispensing_log + inventory_items(sell_price, weighted_avg_cost)
//     2. expenses → opex/wages/tax/other SUM for period
//
// Schema facts (verified 12 Apr 2026 via Supabase MCP at HEAD ec3b5d3):
//   - expenses.expense_date is type `date` (not timestamptz). Filter using
//     ISO date-only strings via .slice(0, 10). Category bucket for OPEX:
//     'opex', 'wages', 'tax', 'other'. 'capex' is memo-only and excluded.
//   - order_items.product_metadata is JSONB with top-level key
//     weighted_avg_cost. LL-203 pattern confirmed.
//   - dispensing_log FK column is inventory_item_id; PostgREST implicit
//     join via inventory_items(...) works (same pattern as fetchStoreSummary).
//   - inventory_items.weighted_avg_cost and sell_price both present.
//   - orders.total is VAT-inclusive; divide by VAT_RATE = 1.15 for ex-VAT
//     revenue (LL-231 + GAP-01 from HQProfitLoss).
//   - dispensary revenue is NOT VAT-inclusive (Schedule 6 — LL-231).
//
// Loyalty cost is deliberately excluded from this view — see
// WP-ANALYTICS-2.md Decision 3 and the UI footnote in CombinedPL.js.

import { supabase } from "../../../services/supabaseClient";

// LL-298: VAT_RATE removed — per-tenant divisor read from tenant_config.vat_rate
const OPEX_CATEGORIES = ["opex", "wages", "tax", "other"];

export async function fetchStoreFinancials(
  tenantId,
  industryProfile,
  startISO,
  endISO,
) {
  // LL-298: per-tenant VAT divisor
  let divisor = 1.15;
  try {
    const { data: cfg } = await supabase.from("tenant_config").select("vat_rate").eq("tenant_id", tenantId).maybeSingle();
    const r = parseFloat(cfg?.vat_rate);
    if (Number.isFinite(r)) divisor = 1 + r;
  } catch (_) { /* divisor stays 1.15 */ }

  const result = {
    tenantId,
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMarginPct: 0,
    totalOpex: 0,
    netProfit: 0,
    netMarginPct: 0,
    orderCount: 0,
    cogsSource: "unavailable",
    expenseCount: 0,
    err: null,
  };

  try {
    // ─── REVENUE + COGS ────────────────────────────────────────────────
    if (industryProfile === "cannabis_dispensary") {
      // Dispensary path: dispensing_log joined to inventory_items.
      // LL-231: dispensary revenue uses dispensing_log × sell_price.
      // LL-226: exclude voided rows.
      const { data: logs, error: dispErr } = await supabase
        .from("dispensing_log")
        .select(
          "quantity_dispensed, is_voided, inventory_items(sell_price, weighted_avg_cost)",
        )
        .eq("tenant_id", tenantId)
        .gte("dispensed_at", startISO)
        .lt("dispensed_at", endISO);
      if (dispErr) throw dispErr;

      const validLogs = (logs || []).filter((l) => l.is_voided !== true);
      result.orderCount = validLogs.length;
      for (const log of validLogs) {
        const qty = parseFloat(log.quantity_dispensed) || 0;
        const sellPrice = parseFloat(log.inventory_items?.sell_price) || 0;
        const avco = parseFloat(log.inventory_items?.weighted_avg_cost) || 0;
        result.revenue += qty * sellPrice;
        result.cogs += qty * avco;
      }
      if (validLogs.length > 0) {
        result.cogsSource = "dispensing_log";
      }
    } else {
      // Retail / general_retail / food_beverage path.
      // Two-step: paid order IDs in range, then order_items for those IDs.
      // PostgREST does not reliably filter by fields on a joined table;
      // this pattern is idiomatic for cross-table filters in Supabase JS.
      const { data: orderRows, error: ordErr } = await supabase
        .from("orders")
        .select("id, total")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("created_at", startISO)
        .lt("created_at", endISO);
      if (ordErr) throw ordErr;

      const orderIds = (orderRows || []).map((o) => o.id);
      result.orderCount = orderIds.length;

      if (orderIds.length > 0) {
        const { data: itemRows, error: itmErr } = await supabase
          .from("order_items")
          .select("quantity, line_total, product_metadata")
          .in("order_id", orderIds);
        if (itmErr) throw itmErr;

        if (itemRows && itemRows.length > 0) {
          // Revenue: divide line_total by VAT_RATE for ex-VAT figure.
          // COGS: quantity × product_metadata.weighted_avg_cost per LL-203.
          for (const oi of itemRows) {
            const qty = parseFloat(oi.quantity) || 0;
            const lineTotal = parseFloat(oi.line_total) || 0;
            const avco =
              parseFloat(oi.product_metadata?.weighted_avg_cost) || 0;
            result.revenue += lineTotal / divisor;
            result.cogs += qty * avco;
          }
          result.cogsSource = "order_items";
        } else {
          // Fallback: orders exist but no order_items rows. Use orders.total
          // for revenue (still ex-VAT). COGS stays 0; cogsSource unavailable.
          for (const o of orderRows) {
            result.revenue += (parseFloat(o.total) || 0) / divisor;
          }
          result.cogsSource = "unavailable";
        }
      }
    }

    // ─── OPERATING EXPENSES ────────────────────────────────────────────
    // expenses.expense_date is type `date`, so filter with ISO date-only
    // strings. Bucket: opex + wages + tax + other. capex memo excluded.
    const startDate = startISO.slice(0, 10);
    const endDate = endISO.slice(0, 10);
    const { data: expenseRows, error: expErr } = await supabase
      .from("expenses")
      .select("amount_zar, category")
      .eq("tenant_id", tenantId)
      .gte("expense_date", startDate)
      .lt("expense_date", endDate)
      .in("category", OPEX_CATEGORIES);
    if (expErr) throw expErr;

    const expenses = expenseRows || [];
    result.expenseCount = expenses.length;
    result.totalOpex = expenses.reduce(
      (sum, e) => sum + (parseFloat(e.amount_zar) || 0),
      0,
    );

    // ─── DERIVED P&L LINE ITEMS ────────────────────────────────────────
    result.grossProfit = result.revenue - result.cogs;
    result.grossMarginPct =
      result.revenue > 0 ? (result.grossProfit / result.revenue) * 100 : 0;
    result.netProfit = result.grossProfit - result.totalOpex;
    result.netMarginPct =
      result.revenue > 0 ? (result.netProfit / result.revenue) * 100 : 0;
  } catch (err) {
    console.error(
      `[fetchStoreFinancials] failed for tenant ${tenantId}:`,
      err,
    );
    result.err = err.message || "Fetch failed";
  }

  return result;
}
