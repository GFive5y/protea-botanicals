// src/components/group/_helpers/fetchStoreInventory.js
// WP-ANALYTICS-4 Session 1 — per-store inventory snapshot fetcher
//
// Returns a normalised per-store inventory result with health flags
// derived client-side from a single inventory_items query.
//
// Key efficiency win (from the WP-ANALYTICS-4 reconnaissance):
// `inventory_items.last_movement_at` is maintained by a DB trigger on
// stock_movements INSERT, so slow-mover / dead-stock detection is O(1)
// per item — ZERO stock_movements queries are required for Session 1.
// The one-and-only query is the inventory_items select below.
//
// Session 2 will add opt-in `includeVelocity` mode that adds a
// stock_movements aggregation for fast-mover / transfer-opportunity
// analysis. The signature already accepts the `options` parameter so
// Session 2 can extend without breaking the Session 1 callers.
//
// Contract: never throws. Any Supabase error for this tenant lands in
// result.err with partial results (empty items + zeroed summary) so
// callers can render graceful per-store degradation — one store
// failing does not crash the grid.
//
// Schema facts verified 12 Apr 2026 via Supabase MCP:
//   - last_movement_at   timestamptz  (trigger-maintained)
//   - needs_reorder      boolean      (trigger-maintained)
//   - max_stock_level    integer
//   - reorder_qty        numeric
//   - weighted_avg_cost  numeric      (LL-242 AVCO-correct)
//   - sell_price         numeric
// Plus the base columns: id, sku, name, category, quantity_on_hand,
// reorder_level, is_active.

import { supabase } from "../../../services/supabaseClient";

// Thresholds (match WP-ANALYTICS-4.md Decision 2)
const SLOW_MOVER_DAYS = 30;
const DEAD_STOCK_DAYS = 60;
const MS_PER_DAY = 86400 * 1000;

/**
 * fetchStoreInventory
 * @param {string} tenantId
 * @param {string} industryProfile — reserved for Session 2 (dispensary velocity branch)
 * @param {object} options — reserved for Session 2 (includeVelocity)
 * @returns {Promise<InventoryResult>}
 *
 * InventoryResult:
 * {
 *   tenantId: string,
 *   items: Array<{
 *     id, sku, name, category,
 *     quantityOnHand, reorderLevel, reorderQty, maxStockLevel,
 *     sellPrice, weightedAvgCost, stockValue,
 *     lastMovementAt, daysSinceMovement,
 *     needsReorder, isSlowMover, isDeadStock, isOverstock, isOutOfStock,
 *   }>,
 *   summary: {
 *     total, outOfStock, lowStock, slowMovers, deadStock, overstock,
 *     needsReorder, totalValue, deadStockValue, avcoMissing,
 *   },
 *   err: string | null,
 * }
 */
export async function fetchStoreInventory(
  tenantId,
  industryProfile,
  options = {},
) {
  // eslint-disable-next-line no-unused-vars
  void industryProfile;
  // eslint-disable-next-line no-unused-vars
  void options; // Session 2 will read options.includeVelocity

  const result = {
    tenantId,
    items: [],
    summary: {
      total: 0,
      outOfStock: 0,
      lowStock: 0,
      slowMovers: 0,
      deadStock: 0,
      overstock: 0,
      needsReorder: 0,
      totalValue: 0,
      deadStockValue: 0,
      avcoMissing: 0,
    },
    err: null,
  };

  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select(
        "id, sku, name, category, quantity_on_hand, reorder_level, reorder_qty, sell_price, weighted_avg_cost, last_movement_at, needs_reorder, max_stock_level",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    const now = Date.now();
    const rows = data || [];

    for (const r of rows) {
      const quantityOnHand = parseFloat(r.quantity_on_hand) || 0;
      const reorderLevel = parseFloat(r.reorder_level) || 0;
      const reorderQty = parseFloat(r.reorder_qty) || 0;
      const maxStockLevel = parseFloat(r.max_stock_level) || 0;
      const sellPrice = parseFloat(r.sell_price) || 0;
      const weightedAvgCost = parseFloat(r.weighted_avg_cost) || 0;
      const stockValue = quantityOnHand * weightedAvgCost;

      const daysSinceMovement = r.last_movement_at
        ? (now - new Date(r.last_movement_at).getTime()) / MS_PER_DAY
        : Infinity;

      const isOutOfStock = quantityOnHand <= 0;
      const isLowStock =
        !isOutOfStock && reorderLevel > 0 && quantityOnHand <= reorderLevel;
      const isSlowMover = daysSinceMovement > SLOW_MOVER_DAYS;
      const isDeadStock = quantityOnHand > 0 && daysSinceMovement > DEAD_STOCK_DAYS;
      const isOverstock =
        maxStockLevel > 0 && quantityOnHand > maxStockLevel;
      const needsReorder = !!r.needs_reorder;

      result.items.push({
        id: r.id,
        sku: r.sku || null,
        name: r.name || "Unnamed",
        category: r.category || null,
        quantityOnHand,
        reorderLevel,
        reorderQty,
        maxStockLevel,
        sellPrice,
        weightedAvgCost,
        stockValue,
        lastMovementAt: r.last_movement_at || null,
        daysSinceMovement,
        needsReorder,
        isLowStock,
        isSlowMover,
        isDeadStock,
        isOverstock,
        isOutOfStock,
      });

      // Summary counters
      result.summary.total++;
      if (isOutOfStock) result.summary.outOfStock++;
      if (isLowStock) result.summary.lowStock++;
      if (isSlowMover) result.summary.slowMovers++;
      if (isDeadStock) {
        result.summary.deadStock++;
        result.summary.deadStockValue += stockValue;
      }
      if (isOverstock) result.summary.overstock++;
      if (needsReorder) result.summary.needsReorder++;
      if (weightedAvgCost <= 0) result.summary.avcoMissing++;
      result.summary.totalValue += stockValue;
    }
  } catch (err) {
    console.error(
      `[fetchStoreInventory] failed for tenant ${tenantId}:`,
      err,
    );
    result.err = err.message || "Fetch failed";
  }

  return result;
}
