# WP-ANALYTICS-1 — Store Comparison
## NuAi Franchise Analytics Suite — Module 1
## Status: SPEC COMPLETE — ready to build
## Written: 11 April 2026 · HEAD at time of writing: 20dff82

---

## WHAT THIS MODULE BUILDS

The Compare Stores tab in the Group Portal (/group-portal?tab=compare).
First genuine cross-store analytical view in the entire NuAi codebase.
Replaces the PlaceholderTab at GroupPortal.js lines 386-391.

This is NOT a reporting screen. It is an analytics screen.
Reporting = what happened. Analytics = what it means + what to do.
Every metric must have context (vs what? vs when?) and imply an action.

---

## RECONNAISSANCE FINDINGS (11 April 2026 — preserve permanently)

### Finding 1 — What NetworkDashboard already fetches per store
Source: NetworkDashboard.js:94-196 — fetchStoreSummary(tenantId, industryProfile)

Exact per-store result shape:
```js
{
  tenantId:        string,
  revenue:         number | null,   // MTD (profile-branched — see LL-231)
  orderCount:      number | null,   // MTD order/event count
  stockMarginPct:  number | null,   // avg (sell - wac) / sell × 100
  stockHealth: {
    critical: number,               // items with qty <= 0
    low:      number,               // items with 0 < qty <= reorder_level
    total:    number,
  },
  err: string | null,
}
```

Queries per store (2):
- Revenue: dispensing_log for cannabis_dispensary (LL-231+LL-226),
  orders.total WHERE status="paid" for all others
- Inventory: inventory_items for BOTH margin AND stock health (one query)

Network-wide single query (not per-store):
- Combined stock value via .in("tenant_id", allIds)

NOT fetched anywhere (gaps Compare Stores must fill):
- No time-series / daily buckets
- No prior-period comparison (no "vs last month" deltas)
- No top products per store
- No customer counts (distinct from order counts)
- No AOV (average order value)
- No stock turnover / days-of-stock
- No category breakdown
- No absolute gross profit in R (only margin %)

### Finding 2 — Chart infrastructure already in codebase
src/components/viz/ — shared visualisation directory:
  BulletChart.js · ChartCard.js · ChartTooltip.js · DeltaBadge.js
  Icon.js · InlineProgressBar.js · PipelineStages.js · SparkLine.js
  index.js (barrel)

Recharts ^3.8.0 in package.json. 28 files already import from it.
HQOverview imports: { ChartCard, ChartTooltip, SparkLine, DeltaBadge }
from "../viz". Pattern is production-load-bearing.

Compare Stores MUST reuse these — no new charting primitives.
ChartCard provides WP-DS-compatible outer wrapper.
DeltaBadge provides +/- delta pills (vs last month, etc.).
SparkLine provides per-store mini trend lines.
Recharts BarChart for cross-store revenue comparison.

### Finding 3 — HQOverview is NOT cross-tenant
HQOverview scopes all queries to a single tenantId via useTenant().
The HQ operator switches tenant at the platform bar.
"Compare 5 stores side-by-side" does not exist anywhere in the codebase.
Compare Stores is genuinely the first cross-tenant comparison surface.
No duplication risk — purely complementary.

Note: HQOverview still uses a local const T = {...} (legacy hex palette).
NOT yet migrated to import { T } from tokens.js.
Compare Stores uses canonical import { T } — correct pattern.
HQOverview migration = separate WP-DS-2 backlog item.

### Finding 4 — Token audit for charting
All tokens needed exist. Zero new tokens required:
- Layout: T.container.wide · T.page.sectionGap · T.page.cardGap
- Colours: full semantic family × Light/Text/Mid/Border
- Type: text.xs..4xl · weight.normal/medium/semibold/bold
- Chart aids: fontMono for tabular numbers · radius/shadow scales

### Finding 5 — Shared helper naming inconsistency (tech debt flag)
NetworkDashboard uses: fmtR(), fmtPct(), marginColour()
GroupTransfer uses:    formatR(), formatDate()
These are independent duplicates. Compare Stores should match
NetworkDashboard's helpers (thematic proximity). The cross-file naming
inconsistency is flagged as minor tech debt — not fixed in this module.

---

## ARCHITECTURAL DECISIONS (locked before build)

### Decision 1 — Shared fetcher: OPTION A
Extract fetchStoreSummary into a shared helper:
  src/components/group/_helpers/fetchStoreSummary.js

Both NetworkDashboard and StoreComparison import from it.
Any future group tab (CombinedPL, StockIntelligence) also uses it.
Requires a small, LL-221-safe refactor of NetworkDashboard.js.
Eliminates the second source of truth. High leverage, low risk.

### Decision 2 — Metrics scope for Phase 6a
Core (reuse from NetworkDashboard fetch):
  Revenue MTD · Order/Event count · Stock margin %

Extended (new queries in Compare Stores only):
  AOV (average order value) — revenue ÷ orderCount
  Top 5 products by revenue per store
  Stock efficiency (stock turnover proxy: 
    orders_value ÷ stock_value_at_month_start)

Delta badges (prior-period comparison):
  Revenue vs last month (second time-range query)
  Margin vs last month
  DeltaBadge component already exists — visual side is free.
  Data side: second query per store with last month's range.
  IN SCOPE for Phase 6a — doubles fetch volume but DeltaBadge
  makes the value immediately visible.

### Decision 3 — Chart types
Bar chart — revenue by store (Recharts BarChart, horizontal)
  Bars ranked by revenue, network average line overlaid
  Colour: T.accent for current user's store, T.neutral for others
  
Sparklines — per-store revenue trend (SparkLine from viz/)
  Last 7 days, shown inside each store card
  Requires daily-bucket query: NOT in Phase 6a.
  Daily buckets deferred to WP-ANALYTICS-3.
  In Phase 6a: use DeltaBadge (MTD vs last month) instead.

Margin comparison — horizontal InlineProgressBar per store
  Network average as a reference line
  Colour coded: ≥55% success · 40-54% warning · <40% danger

### Decision 4 — Sort/filter
User can sort the store comparison grid by:
  Revenue (default) · Margin · Orders · Stock health
Single sort selector at top of grid.
No complex filter in Phase 6a — all group members always shown.

### Decision 5 — Layout model
NOT a sub-tab layout. Single scrolling page.
Three sections, T.page.sectionGap between:
  1. Network summary bar (4 KPIs — combined / network avg)
  2. Revenue bar chart (cross-store, sortable)
  3. Store comparison grid (one card per store)

Progressive disclosure: summary → chart → detail cards.
The franchise owner reads top to bottom and gets progressively
more granular without needing to navigate.

---

## DATA ARCHITECTURE

### Shared fetcher — src/components/group/_helpers/fetchStoreSummary.js

Extract from NetworkDashboard.js verbatim. Export as named export.
Add one new field to the return shape:

```js
// EXISTING (from NetworkDashboard) — unchanged:
{
  tenantId, revenue, orderCount, stockMarginPct,
  stockHealth: { critical, low, total }, err
}

// ADDED for Compare Stores:
  aov:               number | null,  // revenue / orderCount
  revenueLastMonth:  number | null,  // same query, last month range
  marginLastMonth:   number | null,  // recalculated from last month inv
  topProducts:       Array<{
    name: string,
    revenue: number,
    qty: number,
  }>,  // top 5 by revenue, from order_items or dispensing_log
```

NOTE: topProducts query is the most complex addition.
For cannabis_retail/general_retail/food_beverage:
  SELECT product_name, SUM(line_total) as revenue, SUM(quantity)
  FROM order_items
  JOIN orders ON order_items.order_id = orders.id
  WHERE orders.tenant_id = X AND orders.status = "paid"
  AND orders.created_at >= monthStart
  GROUP BY product_name
  ORDER BY revenue DESC LIMIT 5

Schema verified 11 Apr 2026 via Supabase MCP:
  order_items columns: id, order_id, product_name, quantity,
    unit_price, line_total, product_metadata, created_at
  Use line_total (pre-computed qty × price) over quantity × unit_price.

For cannabis_dispensary:
  SELECT inventory_items.name, 
         SUM(dispensing_log.quantity_dispensed * inventory_items.sell_price) as revenue,
         SUM(dispensing_log.quantity_dispensed) as qty
  FROM dispensing_log
  JOIN inventory_items ON dispensing_log.item_id = inventory_items.id
  WHERE dispensing_log.tenant_id = X
  AND dispensing_log.is_voided != true
  AND dispensing_log.dispensed_at >= monthStart
  GROUP BY inventory_items.name
  ORDER BY revenue DESC LIMIT 5

⚠ SCHEMA CHECK REQUIRED before build:
  Does order_items table exist? What are its column names?
  Claude Code must verify via information_schema before writing
  the topProducts query — do NOT assume column names.

---

## COMPONENT SPEC — StoreComparison.js

### File: src/components/group/StoreComparison.js
### Props: { groupId, groupName, members[], onNavigate }
### No onGroupUpdated needed (read-only view)

### Imports:
```js
import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, 
         ReferenceLine, ResponsiveContainer } from "recharts";
import { ChartCard, ChartTooltip, DeltaBadge, 
         InlineProgressBar } from "../viz";
import { fetchStoreSummary } from "./_helpers/fetchStoreSummary";
import { T } from "../../styles/tokens";
```

### Section 1 — Network Summary Bar
4 KPI tiles (same pattern as NetworkDashboard):
  Combined Revenue MTD · Network Avg Margin · 
  Best Store (by revenue) · Worst Store (by margin)

"Best Store" and "Worst Store" are the analytics layer —
they give the franchise owner an immediate action signal.

### Section 2 — Revenue Bar Chart
Recharts BarChart, horizontal layout.
X-axis: store names (truncated to 15 chars if long)
Y-axis: revenue in R
Bars ranked by revenue DESC.
ReferenceLine at network average revenue.
Bar colour: T.accent for user's own store, T.neutralLight for others.
Tooltip: ChartTooltip with store name, revenue, delta vs last month.
Sort control above the chart: Revenue | Margin | Orders | Stock.

### Section 3 — Store Comparison Grid
repeat(auto-fit, minmax(300px, 1fr)), gap T.page.cardGap.

Per-store card (T.surface, T.border, T.radius.lg, T.inset.card):

  Header:
    Store name + industry badge (from INDUSTRY_BADGE — reuse from NetworkDashboard)
    Role pill (franchisor/franchisee)
    Rank badge: #1, #2, #3... by current sort metric
  
  Metric rows with DeltaBadge (% change vs last month):
    Revenue MTD:     R{n}  <DeltaBadge delta={revDelta} />
    Gross Margin:    {n}%  <InlineProgressBar value={margin} />
                           Color coded ≥55/40-54/<40
    AOV:             R{n}  (revenue ÷ orderCount)
    Orders/Events:   {n}   
    Stock Health:    All stocked / N low / N critical
  
  Top 5 Products:
    Collapsible section (collapsed by default)
    Click "Top products ▾" to expand
    Ranked list: #1 [product name] R{revenue} ({qty} units)
  
  Footer:
    [View store →] Phase 4 pattern — console.log placeholder
    [Transfer to this store →] → onNavigate("transfers") 
      with pre-selected TO store (Phase 4b feature — 
      show but disabled if StoreComparison is before GroupTransfer
      is wired for pre-selection)

### Token compliance (mandatory LL-238):
All layout: T.container / T.page / T.gap / T.pad / T.inset
All colour: T.semantic × Light/Text (text-tier rule)
Charts: T.accent · T.neutral · T.success · T.warning · T.danger
Zero hardcoded px matching any token.

---

## BUILD SEQUENCE (for Claude Code, when authorised to build)

Step 0 — Schema check (before any code):
  Verify order_items table exists and column names
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'order_items' ORDER BY ordinal_position;
  
  If order_items does not exist: topProducts query uses a
  fallback — aggregate from inventory_items movement data only.
  Report findings before proceeding.

Step 1 — Extract shared fetcher:
  Create src/components/group/_helpers/fetchStoreSummary.js
  Move fetchStoreSummary from NetworkDashboard.js to the helper
  Add the 3 new fields: aov, revenueLastMonth, topProducts
  Update NetworkDashboard.js import to use the shared helper
  Build — verify NetworkDashboard still works (zero regressions)

Step 2 — Build StoreComparison.js:
  Single file, ~900-1100 lines expected
  3 sections as specced above
  Reuse ChartCard, ChartTooltip, DeltaBadge, InlineProgressBar
  from src/components/viz/

Step 3 — Mount in GroupPortal.js:
  Replace PlaceholderTab at lines 386-391
  Pass { groupId, groupName, members, onNavigate }

Step 4 — Build verification:
  CI=false npm run build — zero new warnings
  Verify NetworkDashboard still renders (regression test)

---

## UX PRINCIPLES (from competitive analysis — preserve)

1. One primary question per screen: "Which of my stores is 
   performing best and why?"
2. Progressive disclosure: summary bar → chart → detail cards
3. Every metric has context: vs network average AND vs last month
4. Every insight implies an action: worst-performing store card
   has [Transfer stock] and [View store] as immediate actions
5. Benchmarking is the value: raw R6,000 means nothing.
   R6,000 vs network avg R8,500 (−29%) means everything.

---

## COMPETITIVE GAPS THIS MODULE CLOSES

No competitor (Flowhub, Cova, FranConnect) offers:
- SAHPRA-aware dispensary analytics in a franchise view
- AVCO-correct margin calculation (ours is correct per LL-242 fix)
- Profile-adaptive revenue routing (LL-231) in a comparison grid
- AI-generated insight (coming in WP-ANALYTICS-6) on the same screen

This is genuinely the first South African franchise ERP analytics
screen that is both cannabis-compliant and IFRS-aware.

---

## WHAT THIS MODULE DOES NOT BUILD (future phases)

- Daily revenue trend sparklines → WP-ANALYTICS-3
- Stock turnover / days-of-stock → WP-ANALYTICS-4
- Customer acquisition / churn → WP-ANALYTICS-5
- AI anomaly detection → WP-ANALYTICS-6
- Cross-tenant "View store" navigation → Phase 4b (general)
- Pre-selected transfer from comparison → Phase 4b (GroupTransfer)
- Export to PDF/CSV → WP-ANALYTICS-2 Combined P&L

---

## KNOWN GAPS (resolved during Step 0)

~~order_items table existence is unverified.~~ **RESOLVED 11 Apr 2026.**
Schema verified via Supabase MCP. Table exists with columns:
id, order_id, product_name, quantity, unit_price, line_total,
product_metadata, created_at. topProducts uses line_total and
quantity columns — verified against live schema, not assumed.

Remaining note: marginLastMonth is NOT in scope. It would require
historical inventory snapshots that don't exist — current AVCO
values reflect present state only. revenueLastMonth IS in scope
via a second orders/dispensing_log query with the prior-month
date range.

---
*WP-ANALYTICS-1 v1.0 · NuAi · 11 April 2026*
*Prerequisite: WP-TENANT-GROUPS Phases 1-5 complete*
*Reuses: src/components/viz/ · Recharts ^3.8.0*
*Spec author: George Fivaz + Claude.ai (Sonnet 4.6)*
