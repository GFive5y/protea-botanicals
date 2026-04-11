// src/components/group/_helpers/fetchStoreInventory.js
// WP-ANALYTICS-4 Sessions 1 + 2 — per-store inventory snapshot fetcher
//
// Returns a normalised per-store inventory result with health flags
// derived client-side from one inventory_items query (S1 core), optionally
// enriched with 30-day velocity data from a second opt-in query (S2).
//
// S1 efficiency win: `inventory_items.last_movement_at` is maintained by a
// DB trigger on stock_movements INSERT, so slow-mover / dead-stock detection
// is O(1) per item — ZERO stock_movements queries are required for the
// health snapshot. The core inventory select below is the only query for
// S1 callers (no options passed).
//
// S2 extension (includeVelocity: true): adds a second query that aggregates
// 30-day unit sales per item for fast-mover / restock-risk / transfer-
// opportunity analysis. Profile-branched per WP-ANALYTICS-4 S2 addendum
// Gap 1:
//   - Retail   (cannabis_retail, food_beverage, general_retail, general):
//       stock_movements WHERE movement_type IN ('sale_pos','sale_out')
//   - Dispensary (cannabis_dispensary):
//       dispensing_log WHERE is_voided != true (LL-231 + LL-226)
//       Verified via Step 0-A 12 Apr 2026: Medi Can Dispensary has ZERO
//       sale_* rows in stock_movements but 14 rows in dispensing_log — the
//       branch is mandatory, not optional. Without it dispensary items
//       silently render zero velocity.
//
// Contract: never throws.
//   - Core inventory query failure → result.err set, items empty, summary
//     zeroed (graceful per-store degradation in the grid).
//   - Velocity query failure (S2 mode only) → result.velocityErr set,
//     core items still render, velocity fields default to 0. UI can
//     surface a "velocity unavailable" note per store without hiding the
//     health snapshot.
//
// Schema facts verified 12 Apr 2026 via Supabase MCP:
//   - inventory_items: id, sku, name, category, quantity_on_hand,
//     reorder_level, reorder_qty (nullable — Gap 6 guard applies),
//     sell_price, weighted_avg_cost, last_movement_at, needs_reorder,
//     max_stock_level, is_active
//   - stock_movements: item_id (FK → inventory_items.id), quantity,
//     movement_type (enum: sale_pos, sale_out, purchase_in, adjustment,
//     production_in, production_out), created_at timestamptz
//   - dispensing_log: inventory_item_id (FK → inventory_items.id),
//     quantity_dispensed numeric, is_voided boolean, dispensed_at timestamptz

import { supabase } from "../../../services/supabaseClient";

// Thresholds (match WP-ANALYTICS-4.md Decision 2 + S2 addendum Gap 3)
const SLOW_MOVER_DAYS = 30;
const DEAD_STOCK_DAYS = 60;
const VELOCITY_WINDOW_DAYS = 30;
const FAST_MOVER_MIN_UNITS = 3; // velocityUnits30d >= 3 qualifies as fast mover
const CRITICAL_RESTOCK_DAYS = 7; // daysOfStockLeft < 7 → critical
const LOW_STOCK_DAYS = 14; // daysOfStockLeft < 14 → qualifies regardless of velocity
const MS_PER_DAY = 86400 * 1000;

/**
 * fetchStoreInventory
 *
 * @param {string} tenantId
 * @param {string} industryProfile — branches the velocity query in S2 mode
 * @param {object} [options]
 * @param {boolean} [options.includeVelocity=false] — S2 opt-in: run the
 *   second query to enrich items with 30-day velocity fields. Leave false
 *   for the S1 landing-page use case where only the health snapshot is
 *   needed — that's the zero-regression path for NetworkDashboard and the
 *   current StockIntelligence S1 render.
 * @returns {Promise<InventoryResult>}
 *
 * InventoryResult:
 * {
 *   tenantId: string,
 *   items: Array<{
 *     // Core S1 fields
 *     id, sku, name, category,
 *     quantityOnHand, reorderLevel, reorderQty, safeReorderQty, maxStockLevel,
 *     sellPrice, weightedAvgCost, stockValue,
 *     lastMovementAt, daysSinceMovement,
 *     needsReorder, isSlowMover, isDeadStock, isOverstock, isOutOfStock,
 *     // S2 velocity fields (present but zero/Infinity when includeVelocity=false)
 *     velocityUnits30d,    // int: units sold in last 30 days
 *     monthlyRate,         // int: rounded velocityUnits30d for "~N/mo" display
 *     daysOfStockLeft,     // number | Infinity
 *     isCriticalRestock,   // bool: daysOfStockLeft < 7
 *     isFastMover,         // bool: Gap 3 qualifying criteria
 *     isSellingWithNoStock // bool: qty <= 0 AND velocity > 0
 *   }>,
 *   summary: {
 *     total, outOfStock, lowStock, slowMovers, deadStock, overstock,
 *     needsReorder, totalValue, deadStockValue, avcoMissing,
 *     // S2 additions
 *     fastMovers,          // count of items matching isFastMover
 *     criticalRestock,     // count of items matching isCriticalRestock
 *     sellingWithNoStock,  // count of items matching isSellingWithNoStock
 *     velocityQueried,     // bool: was the velocity query run and successful?
 *   },
 *   err: string | null,         // core inventory error (fatal)
 *   velocityErr: string | null, // velocity query error (non-fatal in S2 mode)
 * }
 */
export async function fetchStoreInventory(
  tenantId,
  industryProfile,
  options = {},
) {
  const { includeVelocity = false } = options;

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
      fastMovers: 0,
      criticalRestock: 0,
      sellingWithNoStock: 0,
      velocityQueried: false,
    },
    err: null,
    velocityErr: null,
  };

  // ── Core inventory query (S1 — always runs) ─────────────────────────────
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

    // ── Velocity query (S2 — opt-in, profile-branched) ────────────────────
    // We run the velocity query AFTER the inventory query so the row loop
    // below can enrich items with velocityMap lookups in a single pass.
    // Velocity errors are isolated into result.velocityErr — they do NOT
    // affect the core inventory rendering.
    let velocityMap = {};
    if (includeVelocity) {
      try {
        const velStartISO = new Date(
          Date.now() - VELOCITY_WINDOW_DAYS * MS_PER_DAY,
        ).toISOString();

        if (industryProfile === "cannabis_dispensary") {
          // Dispensary branch — LL-231 pattern (dispensing_log, not orders)
          // + LL-226 is_voided filter (Schedule 6: void only, never delete).
          // Client-side re-filter for NULL safety matching fetchStoreTrend.
          const { data: dispData, error: dispErr } = await supabase
            .from("dispensing_log")
            .select("inventory_item_id, quantity_dispensed, is_voided")
            .eq("tenant_id", tenantId)
            .neq("is_voided", true)
            .gte("dispensed_at", velStartISO);
          if (dispErr) throw dispErr;

          const validLogs = (dispData || []).filter(
            (l) => l.is_voided !== true,
          );
          for (const row of validLogs) {
            const id = row.inventory_item_id;
            if (!id) continue;
            const units = parseFloat(row.quantity_dispensed) || 0;
            velocityMap[id] = (velocityMap[id] || 0) + units;
          }
        } else {
          // Retail / general / food_beverage branch — stock_movements of
          // type sale_pos (POS sales) or sale_out (wholesale / manual).
          // Math.abs because sale rows typically record negative quantity
          // (stock leaving the system); we want units sold, not signed delta.
          const { data: velData, error: velErr } = await supabase
            .from("stock_movements")
            .select("item_id, quantity")
            .eq("tenant_id", tenantId)
            .in("movement_type", ["sale_pos", "sale_out"])
            .gte("created_at", velStartISO);
          if (velErr) throw velErr;

          for (const row of velData || []) {
            const id = row.item_id;
            if (!id) continue;
            const units = Math.abs(parseFloat(row.quantity) || 0);
            velocityMap[id] = (velocityMap[id] || 0) + units;
          }
        }

        result.summary.velocityQueried = true;
      } catch (velErr) {
        console.error(
          `[fetchStoreInventory] velocity query failed for tenant ${tenantId}:`,
          velErr,
        );
        result.velocityErr = velErr.message || "Velocity fetch failed";
        velocityMap = {}; // safety: if query half-failed, start clean
      }
    }

    // ── Row loop — enrich every item with both S1 health flags and
    // S2 velocity fields. Items with no velocity data (S1 mode or
    // velocity query failed) get zero/Infinity defaults.
    const now = Date.now();
    const rows = data || [];

    for (const r of rows) {
      const quantityOnHand = parseFloat(r.quantity_on_hand) || 0;
      const reorderLevel = parseFloat(r.reorder_level) || 0;
      const maxStockLevel = parseFloat(r.max_stock_level) || 0;
      const sellPrice = parseFloat(r.sell_price) || 0;
      const weightedAvgCost = parseFloat(r.weighted_avg_cost) || 0;
      const stockValue = quantityOnHand * weightedAvgCost;

      // Display value for reorder_qty — raw config, 0 when null
      const reorderQty = parseFloat(r.reorder_qty) || 0;

      // Gap 6 arithmetic-safe value — falls back to reorder_level when
      // reorder_qty is null so surplus formulas (currentQty - reorderLevel
      // - reorderQty) don't treat unconfigured items as "reorder zero units"
      // which would let every item appear as surplus regardless of buffer.
      // Pattern: item.reorder_qty ?? item.reorder_level ?? 0
      const safeReorderQty =
        r.reorder_qty != null && !Number.isNaN(parseFloat(r.reorder_qty))
          ? parseFloat(r.reorder_qty)
          : reorderLevel;

      const daysSinceMovement = r.last_movement_at
        ? (now - new Date(r.last_movement_at).getTime()) / MS_PER_DAY
        : Infinity;

      const isOutOfStock = quantityOnHand <= 0;
      const isLowStock =
        !isOutOfStock && reorderLevel > 0 && quantityOnHand <= reorderLevel;
      const isSlowMover = daysSinceMovement > SLOW_MOVER_DAYS;
      const isDeadStock =
        quantityOnHand > 0 && daysSinceMovement > DEAD_STOCK_DAYS;
      const isOverstock =
        maxStockLevel > 0 && quantityOnHand > maxStockLevel;
      const needsReorder = !!r.needs_reorder;

      // S2 velocity enrichment — looks up velocityMap by item id. Items
      // with no entry get 0 velocity which maps to Infinity daysOfStockLeft
      // (can't run out if nothing's moving) — that correctly excludes them
      // from fast-movers and critical-restock counts.
      const velocityUnits30d = velocityMap[r.id] || 0;
      const monthlyRate = Math.round(velocityUnits30d);
      const daysOfStockLeft =
        velocityUnits30d > 0
          ? Math.floor(quantityOnHand / (velocityUnits30d / VELOCITY_WINDOW_DAYS))
          : Infinity;
      const isCriticalRestock =
        velocityUnits30d > 0 && daysOfStockLeft < CRITICAL_RESTOCK_DAYS;
      // Gap 3 qualifying criteria: velocity >= 3 OR daysOfStockLeft < 14.
      // The second clause implicitly requires velocity > 0 because
      // daysOfStockLeft is Infinity when velocity is 0.
      const isFastMover =
        velocityUnits30d >= FAST_MOVER_MIN_UNITS ||
        daysOfStockLeft < LOW_STOCK_DAYS;
      // "Selling with no stock" edge case (Gap 3) — POS has recorded sales
      // for this item but inventory_items.quantity_on_hand is zero or
      // negative. Critical operational signal: stock count is out of sync
      // with reality, OR a phantom item is being sold.
      const isSellingWithNoStock =
        quantityOnHand <= 0 && velocityUnits30d > 0;

      result.items.push({
        id: r.id,
        sku: r.sku || null,
        name: r.name || "Unnamed",
        category: r.category || null,
        quantityOnHand,
        reorderLevel,
        reorderQty,
        safeReorderQty,
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
        // S2 velocity fields
        velocityUnits30d,
        monthlyRate,
        daysOfStockLeft,
        isCriticalRestock,
        isFastMover,
        isSellingWithNoStock,
      });

      // Summary counters — S1 health flags
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

      // S2 velocity counters — only meaningful when velocityQueried is true,
      // but we increment unconditionally so the counts are accurate when
      // velocity data is present and stay zero when it isn't.
      if (isFastMover) result.summary.fastMovers++;
      if (isCriticalRestock) result.summary.criticalRestock++;
      if (isSellingWithNoStock) result.summary.sellingWithNoStock++;
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
