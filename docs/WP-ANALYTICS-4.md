# WP-ANALYTICS-4 — Stock Intelligence
## NuAi Franchise Analytics Suite — Module 4
## Status: IN PROGRESS — Session 1 HEAD 3ec1d32 · Session 2 pending
## Written: 12 April 2026 · HEAD at time of writing: 5352d96
## New tab: /group-portal?tab=stock (add to GroupPortal.js)

---

## WHAT THIS MODULE BUILDS

A new Stock Intelligence tab in the Group Portal.
Primary question: **"Where is stock stuck and where is it needed?"**

Where Module 2 (Combined P&L) answers "are we profitable?" and Module 3 (Revenue
Intelligence) answers "are we growing?", Module 4 answers "is our inventory working
hard enough?"

Dead stock ties up cash. Stockouts kill sales. Transfer opportunities exist between
stores right now that no one can see because no one has a cross-store view. This module
surfaces all three and makes them immediately actionable via the existing GroupTransfer
component.

---

## RECONNAISSANCE FINDINGS (12 April 2026 — preserve permanently)

### Finding 1 — inventory_items schema (live check, confirmed columns)

Key columns for Stock Intelligence:
id, tenant_id, sku, name, category (ENUM),
quantity_on_hand, reorder_level, reorder_qty,
sell_price, weighted_avg_cost, cost_price,
last_movement_at (timestamptz),   ← KEY: slow-mover detection at O(1) per item
needs_reorder (boolean),          ← KEY: already computed by DB — free flag
max_stock_level (integer),        ← KEY: overstock detection is trivial
is_active (boolean),
created_at, updated_at

CRITICAL EFFICIENCY FINDING: `last_movement_at` exists on `inventory_items`.
Slow-mover detection (30+ days without movement) requires ZERO stock_movements
queries. One inventory_items query gives us both stock health AND slow-mover status.
Do not aggregate stock_movements for slow-mover detection — use `last_movement_at`
directly.

### Finding 2 — stock_movements schema (live check)

Columns: id, item_id, quantity, movement_type (ENUM), reference, notes,
         performed_by, created_at (timestamptz), tenant_id, unit_cost, batch_id

CRITICAL: No `sku` or `name` column on stock_movements.
All velocity queries must JOIN to inventory_items to get item identifiers.

Movement types in production (all tenants, confirmed from live DB):
  sale_pos:      1,923  — POS sales (primary retail velocity source)
  sale_out:      1,012  — wholesale / manual sale
  purchase_in:    104   — stock receipt
  adjustment:      55   — manual adjustment
  production_out:  41   — production consumption
  production_in:   14   — production output

Velocity query pattern (units sold per item in last 30 days):
```sql
SELECT sm.item_id, SUM(ABS(sm.quantity)) AS units_sold_30d
FROM stock_movements sm
WHERE sm.tenant_id = $1
  AND sm.movement_type IN ('sale_pos', 'sale_out')
  AND sm.created_at >= now() - interval '30 days'
GROUP BY sm.item_id
```

### Finding 3 — Live inventory snapshot for Medi Can network (12 Apr 2026)

| Store | SKUs | Out of stock | Low stock | No movement 30d | AVCO stock value |
|---|---|---|---|---|---|
| Medi Recreational | 186 | 1 | 6 | 10 | R15,025 |
| Medi Can Dispensary | 8 | 0 | 0 | 0 | R121,575 |
| **Network total** | **194** | **1** | **6** | **10** | **R136,600** |

Top velocity items (Medi Recreational, sale_pos + sale_out, last 30 days):
1. Grow Tent 120x120 — 103 units sold, 5 on hand (~14 days of stock)
2. LED Grow Light 100W — 103 units sold, 5 on hand (~14 days of stock)
3. Grow Tent 80x80 — 51 units sold, **1 on hand** → **CRITICAL: ~half a day of stock**
4. THC Distillate 1g — 59 units sold, 6 on hand (~3 days of stock)

### Finding 4 — weighted_avg_cost data quality gap

All velocity-checked items show weighted_avg_cost = 0.
The simulator generated orders and stock_movements but did not seed AVCO values
into inventory_items.weighted_avg_cost for Medi Recreational.

Impact on Stock Intelligence:
- Dead stock value (qty × AVCO) will return R0 for Medi Recreational
- The AVCO gap is a data quality issue in the simulator, not a code issue

Mitigation: show "AVCO not set for N items" badge on tiles. When real stock is
received via the Receiving workflow, AVCO populates automatically via DB trigger.
Do NOT mask or suppress the display — honest data is better than hidden gaps.

### Finding 5 — Cross-store SKU matching for transfer opportunities

Transfer opportunity detection requires matching the same product across stores.
The natural join key is `inventory_items.sku` (text field).

Current network: Medi Recreational uses MED-* SKUs (cannabis retail).
Medi Can Dispensary uses MC-* SKUs (Schedule 6 products).
No SKU overlap exists in the current 2-store network.

Impact: transfer opportunity table will be empty for this network.
Build the feature correctly for when the network grows to include multiple
retail stores with overlapping inventory. Clear empty state is correct output.

### Finding 6 — GroupTransfer integration target

GroupTransfer.js is live at `/group-portal?tab=transfers`.
Transfer opportunity cards call `onNavigate("transfers")` — same pattern as
NetworkDashboard and StoreComparison. Pre-population of the transfer form
(FROM/TO + line items) is Phase 4b. For this module: navigate only.

---

## ARCHITECTURAL DECISIONS (locked before build)

### Decision 1 — New helper: fetchStoreInventory.js

Sibling to the four existing helpers in `_helpers/`.

Signature:
```js
fetchStoreInventory(tenantId, industryProfile, options = {})
  → Promise<InventoryResult>
```

`options.includeVelocity` (boolean) — opt-in, triggers the stock_movements
velocity aggregation query. Default false.

Two-mode design (mirrors fetchStoreSummary opt-in pattern):
- Core (no options): single inventory_items query, returns health snapshot.
  Session 1 uses core only.
- Extended (includeVelocity: true): adds stock_movements aggregation.
  Session 2 uses this for fast-mover ranking and transfer opportunity engine.

### Decision 2 — Slow-mover threshold: last_movement_at > 30 days

```js
const now = Date.now();
const slowMoverThresholdMs = 30 * 86400 * 1000;
const deadStockThresholdMs = 60 * 86400 * 1000;

const daysSinceMovement = (item) => {
  if (!item.last_movement_at) return Infinity; // never moved
  return (now - new Date(item.last_movement_at)) / 86400000;
};

const isSlowMover = (item) => daysSinceMovement(item) > 30;
const isDeadStock = (item) =>
  parseFloat(item.quantity_on_hand) > 0 && daysSinceMovement(item) > 60;
```

O(1) per item. No aggregation query needed. Zero new Supabase calls for slow-mover
detection.

30-day = slow mover. 60-day = dead stock (capital risk, different action implied).

### Decision 3 — Overstock definition

Overstock = quantity_on_hand > max_stock_level when max_stock_level > 0.
When max_stock_level = 0 or null: no overstock flag (unconfigured ≠ zero max).

### Decision 4 — Transfer opportunity logic (Session 2)

```js
// Build cross-store inventory map: { sku → [{ tenantId, qty, reorderLevel, reorderQty }] }
// For each SKU that appears in multiple stores:
//   need  = stores where qty <= reorderLevel
//   have  = stores where qty > reorderLevel + reorderQty (surplus)
//   if (need.length && have.length): generate transfer opportunity

const suggestedQty = (surplus, needed) =>
  Math.min(surplus, needed); // don't strip the sender below reorder_level
```

SKU matching: exact `sku` text match. Fallback: case-insensitive `name` match.
No fuzzy matching.

### Decision 5 — Layout: two sessions

**Session 1 (core — this build):**
- fetchStoreInventory.js (core mode)
- Section 1: Network Stock Summary (4 KPI tiles)
- Section 2: Per-store stock health cards
- Section 3: Slow movers table (cross-store, last_movement_at > 30d)
- Mount in GroupPortal.js

**Session 2 (velocity + actions):**
- fetchStoreInventory extended mode (includeVelocity)
- Section 4: Fast movers with restock risk flag
- Section 5: Transfer opportunity cards
- Section 6: Dead stock value breakdown per store
- "Transfer now →" button wired to onNavigate("transfers")

---

## DATA ARCHITECTURE

### New helper: src/components/group/_helpers/fetchStoreInventory.js

Signature:
```
fetchStoreInventory(tenantId, industryProfile, options = {})
  → Promise<InventoryResult>
```

InventoryResult shape:
```
{
  tenantId:   string,
  items: Array<{
    id:                string,
    sku:               string,
    name:              string,
    category:          string,
    quantityOnHand:    number,
    reorderLevel:      number,
    reorderQty:        number,
    sellPrice:         number,
    weightedAvgCost:   number,
    stockValue:        number,        // quantityOnHand × weightedAvgCost
    lastMovementAt:    string|null,
    daysSinceMovement: number,        // Infinity if never moved
    needsReorder:      boolean,       // from DB column
    maxStockLevel:     number,
    isSlowMover:       boolean,       // daysSinceMovement > 30
    isDeadStock:       boolean,       // daysSinceMovement > 60 AND qty > 0
    isOverstock:       boolean,       // qty > maxStockLevel when maxStockLevel > 0
    isOutOfStock:      boolean,       // quantityOnHand <= 0
    velocityUnits30d:  number,        // Session 2 only (includeVelocity)
    daysOfStockLeft:   number|null,   // Session 2 only
  }>,
  summary: {
    total:          number,
    outOfStock:     number,
    lowStock:       number,
    slowMovers:     number,
    deadStock:      number,
    overstock:      number,
    totalValue:     number,
    deadStockValue: number,
    avcoMissing:    number,   // items where weightedAvgCost = 0 (data quality)
  },
  err: string | null,
}
```

Core query:
```js
const { data, error } = await supabase
  .from("inventory_items")
  .select(`
    id, sku, name, category,
    quantity_on_hand, reorder_level, reorder_qty,
    sell_price, weighted_avg_cost,
    last_movement_at, needs_reorder, max_stock_level
  `)
  .eq("tenant_id", tenantId)
  .eq("is_active", true)
  .order("name");
```

Velocity query (opt-in, Session 2 only):
```js
const startISO = new Date(Date.now() - 30 * 86400000).toISOString();
const { data: velData } = await supabase
  .from("stock_movements")
  .select("item_id, quantity")
  .eq("tenant_id", tenantId)
  .in("movement_type", ["sale_pos", "sale_out"])
  .gte("created_at", startISO);

// Aggregate client-side
const velocityMap = {};
for (const sm of velData || []) {
  velocityMap[sm.item_id] =
    (velocityMap[sm.item_id] || 0) + Math.abs(parseFloat(sm.quantity) || 0);
}
```

---

## COMPONENT SPEC — StockIntelligence.js

### File: src/components/group/StockIntelligence.js
### Props: { groupId, groupName, members[], onNavigate }
### Estimated size Session 1: 700–850 lines · Session 2 adds ~350 lines

### Session 1 — Section 1: Network Stock Summary (4 KPI tiles)

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Network Stock    │ Out of Stock     │ Slow Movers      │ Reorder Needed   │
│ Value (AVCO)     │                  │ (30+ days)       │ (needs_reorder)  │
│ R136,600         │ 1 item           │ 10 items         │ 7 items          │
│ 194 SKUs ·       │ Medi Rec: 1      │ Across 2 stores  │ Across 2 stores  │
│ 2 stores         │ Medi Can: 0      │                  │                  │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

Sub-labels show per-store breakdown for Out of Stock, Slow Movers, Reorder.
Stock Value tile shows "N items with no AVCO set" note when avcoMissing > 0.

Colours: Out of Stock → T.dangerText. Slow Movers + Reorder → T.warningText.
Stock Value → T.ink900 (neutral, informational).

### Session 1 — Section 2: Per-store stock health cards

Grid: `repeat(auto-fit, minmax(280px, 1fr))`

Per-store card (T.surface, T.border, T.radius.lg, T.inset.card):
- Store name + IndustryPill
- Stock value: `R{total}` — with AVCO missing note if avcoMissing > 0
- Status pills in a flex row:
    `{N} OK` (T.successLight) · `{N} Low` (T.warningLight) ·
    `{N} Critical` (T.dangerLight) · `{N} Slow` (T.warningLight)
- Stock health bar: 3-segment proportional fill
    (healthy = green, low = amber, out-of-stock = red)
    width proportional to counts
- "View transfers →" button: `onNavigate("transfers")`
- Per-store error banner when fetch fails

### Session 1 — Section 3: Slow Movers table (cross-store)

One collapsible section per store. Toggle: "Slow movers ({N}) ▾"
Expanded: table of items with last_movement_at > 30 days.

Columns: SKU | Item Name | Days idle | Qty on hand | Stock value | Status

Row colouring:
- days > 60 (dead stock): T.dangerLight background, "Dead stock" chip
- days 30–60 (slow mover): T.warningLight background, "Slow mover" chip
- Rows sorted by days idle DESC

Stock value column: shows "—" when weightedAvgCost = 0, with tooltip
"AVCO not set — receive stock to update weighted average cost".

Empty state: "No slow movers — all {N} items moved in the last 30 days ✓"
rendered in T.successText.

### Session 2 additions (for future reference)

Section 4 — Fast movers with restock risk.
Items sorted by velocityUnits30d DESC. Flag: daysOfStockLeft < 7 → RED,
< 14 → AMBER. Columns: SKU | Name | Units/30d | On hand | Days of stock | Daily rate.

Section 5 — Transfer opportunities.
Cross-store SKU matching via Decision 4 logic. Empty state: "No transfer
opportunities — stores carry different SKUs." One card per opportunity.
[Transfer N units →] → onNavigate("transfers").

Section 6 — Dead stock breakdown per store.
Items with daysSinceMovement > 60 and qty > 0. Value = qty × WAC.
Per-store total. Action: flag for review.

---

## BUILD SEQUENCE

### Pre-build: Session 1

Step 0 — Confirm schema before writing queries:
```sql
-- Confirm last_movement_at, needs_reorder, max_stock_level, reorder_qty
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND column_name IN ('last_movement_at','needs_reorder','max_stock_level','reorder_qty');
-- Expected: 4 rows (already verified 12 Apr 2026 — re-confirm before build)

-- Confirm movement_type includes sale_pos and sale_out
SELECT DISTINCT movement_type FROM stock_movements ORDER BY movement_type;

-- AVCO coverage per network store
SELECT tenant_id, count(*),
       count(*) FILTER (WHERE weighted_avg_cost > 0) AS with_avco
FROM inventory_items WHERE is_active = true
GROUP BY tenant_id;
```

Step 1 — Create src/components/group/_helpers/fetchStoreInventory.js (core mode)

Step 2 — Build src/components/group/StockIntelligence.js (Sections 1–3)

Step 3 — Add to GroupPortal.js:
  - NAV_ITEMS: `{ id: "stock", label: "Stock Intelligence" }` after "revenue"
  - Import + tab router: `{activeTab === "stock" && <StockIntelligence ... />}`

Step 4 — CI=false npm run build → zero new warnings. Browser verify.

### Pre-build: Session 2

Read StockIntelligence.js in full (LL-221) before adding Session 2 features.
Add includeVelocity mode to fetchStoreInventory.js.
Add Sections 4–6. Wire transfer opportunity "Transfer now →" button.

---

## UX PRINCIPLES APPLIED

1. ONE PRIMARY QUESTION: "Where is stock stuck and where is it needed?"
2. PROGRESSIVE DISCLOSURE: Summary tiles → per-store health → slow movers → (S2) fast movers → transfer opportunities
3. EVERY METRIC HAS CONTEXT: "10 slow movers" → expanded to show which SKUs, how many days, which store
4. EVERY INSIGHT IMPLIES AN ACTION: Slow movers have "Consider transfer →". Restock risk items have "Order now →" (Supply Chain). Transfer opportunities have direct GroupTransfer navigation.
5. BENCHMARKING: Per-store slow mover count vs network total — which store's stock is least productive

---

## KNOWN GAPS AND RISKS

**Gap 1 — AVCO = 0 for simulator items**
Medi Recreational weighted_avg_cost = 0 for all items. Dead stock value and stock
value tiles show R0 for that store. Expected — document with data quality note.
Real receiving workflows populate AVCO automatically via DB trigger.

**Gap 2 — No shared SKUs in 2-store network**
Transfer opportunity engine returns empty for Medi Can network (MED-* vs MC-* SKUs).
Build correctly for future multi-retail networks. Empty state is correct output.

**Gap 3 — last_movement_at update lag**
Updated by DB trigger on stock_movements INSERT. Possible lag if trigger is
asynchronous. Unlikely in current setup. Note for RLS/trigger debugging if values
seem stale.

**Gap 4 — Dispensary velocity sourcing**
Dispensary sales are recorded in dispensing_log, but they also INSERT a
stock_movements row with type 'sale_out' (LL-226 pattern). Verify in Step 0
that Medi Can Dispensary's stock_movements contain 'sale_out' rows from dispensing
events. If not, the velocity query will undercount dispensary item usage.

---

## SESSION CLOSE REQUIREMENTS

When Session 1 ships:
1. Update docs/WP-ANALYTICS.md Module 4: "Pending" → "IN PROGRESS — Session 1 HEAD [hash]"
2. Update this file: "SPEC COMPLETE" → "IN PROGRESS — Session 1 HEAD [hash]"
3. Write docs/WP-ANALYTICS-5.md (Customer & Loyalty Intelligence)
4. Append SESSION-STATE addendum
5. Write NEXT-SESSION-PROMPT_v[N+1].md · delete previous
6. Single commit

When Session 2 ships:
1. Update Module 4 in WP-ANALYTICS.md → COMPLETE — HEAD [hash]
2. Update this file → COMPLETE — shipped [hash], verified in browser

---
*WP-ANALYTICS-4 v1.0 · NuAi · 12 April 2026*
*Written from live schema checks: HEAD 5352d96*
*Prerequisite: WP-ANALYTICS-3 Session 1 COMPLETE (RevenueIntelligence.js live)*
*2-session module: S1 = health snapshot + slow movers · S2 = velocity + transfer opportunities*
*Key efficiency: last_movement_at on inventory_items → zero stock_movements queries for S1*
*Author: George Fivaz + Claude.ai (Sonnet 4.6)*
