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

---

## SESSION 2 ADDENDUM — Gap Closure (12 April 2026)
## Produced by Claude.ai spec review before S2 build start
## Append this section to docs/WP-ANALYTICS-4.md before Claude Code reads the file

---

## S2 SPEC GAP CLOSURE — LOCKED DECISIONS

Read this section AFTER the base S2 spec above. Where this addendum
contradicts the base spec, this addendum wins. These decisions are final.

---

### GAP 1 — Dispensary velocity sourcing (CRITICAL — silent data corruption risk)

**Problem:** Medi Can Dispensary (`cannabis_dispensary` profile) records sales
via `dispensing_log`, not via `stock_movements`. The base S2 velocity query:
```js
.in("movement_type", ["sale_pos", "sale_out"])
```
...returns zero rows for dispensary items if dispensing events do not write a
`stock_movements` row. Result: dispensary appears to have zero fast movers
and all items appear idle in slow movers. Silent, no error thrown.

**Step 0 check (mandatory before writing a line):**
```sql
-- Does Medi Can Dispensary have sale_out rows in stock_movements?
SELECT COUNT(*), movement_type
FROM stock_movements
WHERE tenant_id = '2bd41eb7-1a6e-416c-905b-1358f6499d8d'
  AND movement_type IN ('sale_pos', 'sale_out')
GROUP BY movement_type;

-- And how many dispensing_log rows exist for this tenant?
SELECT COUNT(*), SUM(quantity_dispensed) AS total_units
FROM dispensing_log
WHERE tenant_id = '2bd41eb7-1a6e-416c-905b-1358f6499d8d'
  AND is_voided != true;
```

**Decision — branch on industryProfile in fetchStoreInventory.js:**

When `options.includeVelocity = true`:
```js
// Retail branch (cannabis_retail, food_beverage, general_retail)
if (industryProfile !== 'cannabis_dispensary') {
  // existing query: stock_movements WHERE movement_type IN ('sale_pos','sale_out')
}

// Dispensary branch (LL-231 pattern)
if (industryProfile === 'cannabis_dispensary') {
  const { data } = await supabase
    .from('dispensing_log')
    .select('item_id, quantity_dispensed')
    .eq('tenant_id', tenantId)
    .neq('is_voided', true)
    .gte('dispensed_at', last30DaysISO);   // confirm column name in Step 0

  // Aggregate: velocityMap[item_id] = Σ quantity_dispensed
}
```

If `dispensed_at` column name differs — check in Step 0, use actual name.
Never alias silently. Report the actual column name in Step 0 output.

---

### GAP 2 — Cross-store SKU join key (CRITICAL — transfer logic depends on it)

**Problem:** Transfer opportunities require matching the same product across
two stores. Medi Recreational uses `MC-*` SKU prefixes; Medi Can Dispensary
uses `MED-*` prefixes. No shared key is confirmed.

**Step 0 check (mandatory):**
```sql
-- What columns exist on inventory_items that could serve as a cross-tenant key?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND column_name IN (
    'sku', 'barcode', 'product_template_id', 'supplier_sku',
    'product_code', 'global_sku', 'parent_id'
  );

-- Sample: do any values appear in both tenants?
SELECT sku, COUNT(DISTINCT tenant_id) AS tenant_count
FROM inventory_items
WHERE sku IS NOT NULL
GROUP BY sku
HAVING COUNT(DISTINCT tenant_id) > 1
LIMIT 10;
```

**Decision tree based on Step 0 result:**

- If a `product_template_id` or equivalent cross-tenant key exists with
  shared values — use it as the join key. Document the column name.
- If `barcode` has shared values across tenants — use barcode as join key.
- If `sku` has shared values — use sku (strip tenant prefix if needed).
- If NO shared key exists — transfer opportunity engine renders the honest
  empty state for ALL stores: "No shared SKUs detected across network —
  transfer opportunities require matching products in both stores."
  Do NOT fake opportunities. Do NOT match by name (fuzzy name matching
  is a future enhancement, not S2 scope).

**Surplus and need formulas (locked):**
```
surplus = currentQty - reorderLevel - reorderQty
  (if reorderQty IS NULL → use reorderLevel as the buffer → surplus = currentQty - (reorderLevel * 2))

needed = reorderLevel - currentQty
  (only computed when currentQty <= reorderLevel → i.e. store is in need)

suggestedQty = FLOOR(MIN(surplus, needed))
  (never strip sender below their own reorderLevel)
```

**Performance note:** Transfer matching runs entirely client-side from
already-loaded inventory data — no extra Supabase query. O(n×m) where n
and m are item counts per store. At current scale (8 × 186 = 1,488 pairs)
this is trivial. Document the approach in a comment block at the top of
the matching function so future agents understand why no query is needed.

---

### GAP 3 — Fast movers filter, cap, and edge cases (Section 4)

**Qualifying criteria (items that appear in Section 4):**
- `velocityUnits30d >= 3` (minimum threshold — 1-2 units/month is noise)
- OR `daysOfStockLeft < 14` regardless of velocity (critical restock
  even if historically slow)
- Sort: `daysOfStockLeft ASC NULLS LAST` (most urgent first)
- Cap: show top 25 items. If more qualify, add "+ N more items" link
  that expands inline (same collapse pattern as slow movers).

**Zero-velocity divide guard (mandatory):**
```js
const daysOfStockLeft = velocityUnits30d > 0
  ? Math.floor(quantityOnHand / (velocityUnits30d / 30))
  : Infinity;
```
Items with `Infinity` daysOfStockLeft are excluded from Section 4.
They belong in Section 1 slow movers (already handled in S1).

**"Selling with no stock" edge case — named, styled, required:**
Items where `quantityOnHand === 0` AND `velocityUnits30d > 0`:
- Row background: `T.dangerLight` (same as dead stock)
- Days of stock column: renders `OUT` chip in `T.dangerText` instead of a number
- Status chip: "Active — no stock" in danger colour
- This is a critical operational signal: POS is selling something that
  doesn't exist in the system. Do not suppress. Do not skip. Surface it first
  (sort above items with stock).

**Daily rate display:** render as `~{N}/mo` (monthly units, rounded to nearest
integer). More intuitive than `0.23/day` for retail context.
```js
const monthlyRate = Math.round(velocityUnits30d);
// renders: "~14/mo"
```

---

### GAP 4 — Network-level velocity KPI additions (Section 1 update)

The existing Section 1 has 4 KPI tiles. S2 adds 2 more tiles to make 6,
OR adds a network insight banner between Section 1 and Section 2.

**Decision: add a network insight banner** (not more tiles — 6 tiles is
visually crowded at 280px min-width).

Render between Section 1 and Section 2, styled as a horizontal bar
with `T.surfaceAlt` background, `T.pad.md` vertical padding:

```
▸   RESTOCK ALERTS   {criticalCount} items critical (< 7 days stock) across network
    DEAD STOCK       R{totalDeadValue} tied up in {deadCount} items · {deadPct}% of network inventory value
```

- `criticalCount` = items where `daysOfStockLeft < 7` across all stores
- `totalDeadValue` = Σ (qty × weightedAvgCost) where `isDeadStock = true`
  (show R0 with data-quality note if AVCO missing — same pattern as S1 tiles)
- `deadPct` = totalDeadValue / totalNetworkInventoryValue × 100

Only renders when `criticalCount > 0` OR `totalDeadValue > 0`.
If both are zero — banner does not render (not an empty banner — absent).

---

### GAP 5 — Dead stock section full UI spec (Section 6)

The base spec was underspecced. This is the full spec.

**Structure:** One collapsible `DeadStockSection` per store — same pattern
as `SlowMoversSection` in S1.

**Collapsed header:**
```
▶ Medi Recreational  —  R{deadValue} in {deadCount} dead items  ({deadPct}% of store value)
```
If no dead stock:
```
✓ Medi Can Dispensary  —  No dead stock · all items moved within 60 days
```
(green, no chevron, not expandable)

**Expanded table — 7 columns:**

| Column | Value | Notes |
|---|---|---|
| SKU | `sku` | monospace, truncated to 12 chars |
| Item name | `name` | truncated to 35 chars |
| Days idle | `daysSinceMovement` | coloured by age band (see below) |
| Qty on hand | `quantityOnHand` | plain integer |
| Stock value | `qty × weightedAvgCost` | shows `—` with tooltip if AVCO = 0 |
| Age band | chip | see below |
| % of store value | `itemValue / storeTotal × 100` | fixed-1, muted colour |

**Age bands (row background + chip colour):**
- 60–90 days: `T.warningLight` background · "Dead stock" chip in `T.warningText`
- 91–180 days: `T.dangerLight` background (light) · "Very dead" chip in `T.dangerText`
- 181+ days: `T.dangerLight` background (same) · "Write-off risk" chip in `T.dangerText`
  with `font-weight: T.weight.semibold`

Sort: `daysSinceMovement DESC` (oldest first — worst problem at top).

**Duplication resolution (dead stock appears in S1 slow movers AND S2 Section 6):**
Decision: **keep both, add a visual note.**
In the S1 slow movers table, items that are `isDeadStock = true` already
render with a "Dead stock" chip. In S2 Section 6, add a footnote below the
table header:
```
Items marked dead stock also appear in the Slow Movers section above.
Section 6 groups them by age band and shows capital exposure.
```
Do NOT retroactively modify S1's slow movers rendering. The duplication is
intentional — different analytical lens on the same data.

**"Flag for review" — visual only in S2:**
A toggle button per row: "🚩 Flag" → toggles to "Flagged ✓" with
`T.warningText` colour. State lives in React `useState` (local, not
persisted to DB). A tooltip on the flagged state reads: "Flagged for review
— export CSV to share with your team." This is a visual workflow aid only.
No DB write, no notification trigger in S2. A future session can wire it
to `send-notification` EF if needed.

**Capital as percentage — always shown:**
```
{deadCount} items · R{deadValue} · {deadPct}% of store inventory value
```
Rendered in the section sub-header, visible even when collapsed.
If `totalStoreValue === 0` (all AVCO missing) — show `—%` not `NaN%`.

---

### GAP 6 — reorderQty null handling

Throughout the velocity logic, `reorderQty` may be null (not configured).
Anywhere `reorderQty` is used in a calculation, apply:
```js
const safeReorderQty = item.reorder_qty ?? item.reorder_level ?? 0;
```
Never let null propagate into arithmetic. NaN in the UI is a failed build.

---

### S2 BUILD SEQUENCE (replaces base spec build steps)

```
Step 0-A  Dispensary velocity check (2 SQL queries — Gap 1)
Step 0-B  Cross-store join key check (2 SQL queries — Gap 2)
Step 0-C  Report all Step 0 findings before writing any code

Step 1    Extend fetchStoreInventory.js — includeVelocity opt-in
            · retail branch: stock_movements query
            · dispensary branch: dispensing_log query (if Step 0-A confirms needed)
            · client-side velocity aggregation + daysOfStockLeft + daysOfStockLeft < 7 flag
            · reorderQty null guard throughout

Step 2    Update StockIntelligence.js — call fetchStoreInventory with
            { includeVelocity: true } for all stores (replaces the S1 call)

Step 3    Add network insight banner (Gap 4) between Section 1 and Section 2
            · criticalCount + totalDeadValue + deadPct computed in useMemo

Step 4    Section 4 — Fast Movers per store
            · qualify: velocityUnits30d >= 3 OR daysOfStockLeft < 14
            · "selling with no stock" edge case rows (sorted first)
            · top 25 cap with expand toggle
            · monthly rate display (~N/mo)

Step 5    Section 5 — Transfer Opportunities
            · only if Step 0-B found a cross-store join key
            · if no join key found — render honest empty state for all stores
            · surplus/need/suggestedQty formulas from Gap 2

Step 6    Section 6 — Dead Stock Breakdown
            · collapsible per store
            · 7-column table, age bands, flag toggle
            · footnote linking back to slow movers

Step 7    CI=false npm run build — zero new warnings
Step 8    Paste-bug checklist (all 5 patterns)
Step 9    Single commit: feat(WP-A4/S2): StockIntelligence velocity,
            transfer opportunities, dead stock breakdown
```

---

### BROWSER VERIFICATION TARGETS (S2)

Test at `medican@nuai.dev / MediCan2026!` → `/group-portal?tab=stock`

1. **Network banner:** renders with critical restock count and dead stock
   capital. If Medi Recreational has items with < 7 days stock, count
   is non-zero. If all AVCO missing on dead items, shows R0 with note.

2. **Section 4 — Fast Movers:** Medi Recreational (468 orders/90d) should
   have qualifying fast movers. Verify "selling with no stock" rows appear
   in danger tint if any item has qty = 0 with recent sales. Monthly rate
   column shows `~N/mo` format not decimals.

3. **Section 5 — Transfer Opportunities:** Expected result for current
   Medi Can network is the honest empty state — no shared SKUs between
   MC-* and MED-* prefixes. Confirm the empty state message renders
   cleanly, not a blank section.

4. **Section 6 — Dead Stock:** Medi Recreational has 10 slow movers from S1.
   Subset of those (qty > 0 AND > 60 days idle) qualify as dead stock.
   Verify age bands render correctly. Flag toggle works locally. Capital
   percentage shown in collapsed header.

5. **Dispensary S2 data quality:** Medi Can Dispensary has 8 items, all
   with recent AVCO (S1 confirmed). Verify its fast-movers section renders
   from dispensing_log data (if Step 0-A confirms the branch is needed)
   rather than showing empty (which would indicate the branch is missing).

---

*WP-ANALYTICS-4.md S2 Addendum · 12 April 2026*
*Produced by Claude.ai spec review — append to end of docs/WP-ANALYTICS-4.md*
*All gaps from the pre-S2 review are closed with concrete decisions.*
*Claude Code reads this BEFORE starting any S2 code.*
