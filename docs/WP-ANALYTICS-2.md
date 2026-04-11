# WP-ANALYTICS-2 — Combined P&L
## NuAi Franchise Analytics Suite — Module 2
## Status: SPEC COMPLETE — ready to build
## Written: 12 April 2026 · HEAD at time of writing: 8221177
## Replaces: PlaceholderTab at GroupPortal.js activeTab === "financials"

---

## WHAT THIS MODULE BUILDS

The Combined P&L tab in the Group Portal (/group-portal?tab=financials).
Answers the single question a franchise owner cannot answer inside any one store:
**"Is my franchise network profitable as a whole — and which store is leaking margin?"**

This is NOT a copy of HQProfitLoss.js.
HQProfitLoss = a single tenant's full IFRS dashboard with FX tooling, journal adjustments,
CAPEX memo, channel comparison, break-even, and IFRS statement toggle.
CombinedPL = a read-only, multi-store P&L that puts every store side-by-side so the
franchise owner sees network consolidated + per-store columns in one view.
The innovation is comparative: the COGS% benchmark flag that surfaces a silent profit leak
in any store running above the network average.

---

## RECONNAISSANCE FINDINGS (12 April 2026 — preserve permanently)

### Finding 1 — What fetchStoreSummary already provides

Source: src/components/group/_helpers/fetchStoreSummary.js (read 12 Apr 2026)

Return shape (core + extended):
```js
{
  tenantId:         string,
  revenue:          number | null,   // MTD only (no date range control)
  orderCount:       number | null,
  stockMarginPct:   number | null,   // avg across inventory_items
  stockHealth:      { critical, low, total },
  aov:              number | null,
  revenueLastMonth: number | null,   // extended only
  topProducts:      Array<{ name, revenue, qty }>,  // extended only
  err:              string | null,
}
```

Critical gap for Combined P&L — what fetchStoreSummary does NOT provide:
- No COGS figure (no order_items query, no dispensing_log × AVCO)
- No expenses (no expenses table query)
- No gross profit, no net profit
- Date range is hardcoded to "from monthStartISO" with no endISO — not suitable
  for last month / last 3 months / YTD views

Conclusion: fetchStoreSummary does not serve Combined P&L needs.
A new sibling helper is required.

### Finding 2 — HQProfitLoss.js COGS and expenses patterns

Source: src/components/hq/HQProfitLoss.js v4.0 (read 12 Apr 2026 — 3,447 lines)

COGS calculation hierarchy (priority order):
1. BEST: order_items × product_metadata.weighted_avg_cost (AVCO per-transaction, LL-203)
   Query: supabase.from("order_items")
            .select("order_id, product_name, quantity, line_total, product_metadata")
            .in("order_id", paidOrderIds)
   COGS per line: (oi.quantity) × parseFloat(oi.product_metadata?.weighted_avg_cost || 0)
2. FALLBACK: stock_movements WHERE movement_type='production_out' × unit_cost
3. LAST RESORT: product_cogs recipe estimate (per-unit avg × units sold)
   — NOT suitable for multi-tenant Combined P&L (complex, tenant-specific recipes)

For Combined P&L: implement option 1 (order_items AVCO) with option 2 as fallback.
Skip option 3 — recipe estimates are tenant-specific and not network-comparable.

VAT note (GAP-01 from HQProfitLoss — CRITICAL):
  orders.total is VAT-INCLUSIVE. Divide by VAT_RATE = 1.15 at every revenue point.
  Formula: exVatRevenue = orders.total / 1.15
  This affects ALL margin calculations downstream.
  dispensing_log revenue is NOT VAT-inclusive (dispensed at cost, no VAT on Schedule 6).

Expenses table schema (inferred from HQProfitLoss queries — verify in Step 0):
  Expected columns: id, tenant_id, category, subcategory, amount_zar, description, expense_date
  Categories used in P&L: 'opex', 'wages', 'tax', 'other' (OPEX bucket)
  Category excluded from P&L: 'capex' (memo only, not deducted from net profit)
  Filter: expense_date BETWEEN start AND end (date string YYYY-MM-DD)

Loyalty cost (handled differently in Combined P&L — see Architectural Decision 3):
  In HQProfitLoss: earnedPoints × costPerPointIssued
  costPerPointIssued = redemption_value_zar × (1 - breakage_rate)
  In Combined P&L: DEFER loyalty cost calculation — it requires loyalty_config per tenant
  which adds N × 2 extra queries per store. Flag as excluded with a footnote.
  This keeps Combined P&L focused on the structural P&L line items.

### Finding 3 — Cannabis dispensary COGS pattern

Source: HQProfitLoss.js + fetchStoreSummary.js dispensary branches (LL-231, LL-226)

For cannabis_dispensary:
  Revenue: dispensing_log × inventory_items.sell_price, is_voided != true (LL-231 + LL-226)
  COGS:    dispensing_log × inventory_items.weighted_avg_cost, is_voided != true

  Dispensary does NOT use orders or order_items. The AVCO source is inventory_items.weighted_avg_cost,
  not product_metadata (which is on order_items). The dispensing_log stores quantity_dispensed and
  inventory_item_id — join to inventory_items for both sell_price and weighted_avg_cost.

  Note: inventory_items.weighted_avg_cost reflects the CURRENT AVCO, not the AVCO at the
  time of dispensing. For a franchise analytics view this is acceptable — we're comparing
  structural margin, not reconstructing the exact COGS at point of sale.

### Finding 4 — GroupPortal.js financials tab

Source: src/components/group/GroupPortal.js (read 12 Apr 2026)

Current state:
```js
{activeTab === "financials" && (
  <PlaceholderTab
    title="Combined P&L"
    description="Consolidated P&L across all group stores. Read-only. Coming in later phase."
  />
)}
```

Mount target — clean import + replace:
1. Add `import CombinedPL from "./CombinedPL";` at the top
2. Replace the PlaceholderTab block with:
   ```js
   <CombinedPL
     groupId={groupId}
     groupName={groupName}
     members={members}
     onNavigate={handleNavClick}
   />
   ```

No GroupPortal structural changes needed. Props match the StoreComparison pattern exactly.

### Finding 5 — _helpers/ pattern and naming conventions

Source: fetchStoreSummary.js + StoreComparison.js (read 12 Apr 2026)

Helper location: src/components/group/_helpers/
Current inhabitants:
  fetchStoreSummary.js — per-store summary (MTD, no date range)
  industryBadge.js    — INDUSTRY_BADGE map (profile → badge component)

Naming convention: camelCase, descriptive function name matching file name.
Export style: named export (not default), e.g. `export async function fetchStoreSummary(...)`.

New helper will be: src/components/group/_helpers/fetchStoreFinancials.js
Named export: `export async function fetchStoreFinancials(tenantId, industryProfile, startISO, endISO)`

### Finding 6 — Formatting helpers and token patterns

Source: StoreComparison.js, NetworkDashboard.js (patterns from WP-ANALYTICS-1 spec)

Formatting used in NetworkDashboard:
  fmtR(n)    — Rand formatter
  fmtPct(n)  — percentage formatter
  marginColour(pct) — traffic light colour

StoreComparison imports { T } from "../../styles/tokens" (LL-238).
CombinedPL must import the same way.

Recharts available: ^3.8.0. 28 files already using it.
viz/ components available: ChartCard, ChartTooltip, DeltaBadge, InlineProgressBar.
All of these are confirmed in codebase and used by StoreComparison.

### Finding 7 — Schema facts still canonical (from session doc KEY FACTS #6)

orders.total               — NOT total_amount (confirmed)
orders.status = "paid"     — NOT != "cancelled" (confirmed)
order_items.line_total     — pre-computed (use, not qty × unit_price)
order_items.product_metadata — JSONB, key: weighted_avg_cost (verified 11 Apr 2026)
inventory_items.reorder_level — NOT reorder_point (confirmed)
dispensing_log.is_voided   — filter != true (LL-226, confirmed)

VAT_RATE = 1.15 — always applied to orders.total for ex-VAT revenue

---

## ARCHITECTURAL DECISIONS (locked before build)

### Decision 1 — New helper: fetchStoreFinancials.js (not extending fetchStoreSummary)

CHOSEN: New sibling helper at _helpers/fetchStoreFinancials.js

Reasons:
1. fetchStoreSummary is hardcoded to "from monthStartISO" — no endISO parameter.
   Combined P&L needs full date ranges: MTD / last month / last 3 months / YTD.
2. Financial queries are substantially heavier than summary queries.
   Adding COGS + expenses to fetchStoreSummary would degrade NetworkDashboard
   (which calls fetchStoreSummary for every store on every load).
3. Clean separation of concerns: summary = "are my stores healthy right now",
   financials = "P&L for a specific period". Different questions, different contracts.
4. The _helpers/ pattern explicitly accommodates multiple siblings.
   No rule says one fetcher must serve all purposes.

fetchStoreSummary stays untouched. Zero regression risk on NetworkDashboard or StoreComparison.

### Decision 2 — COGS methodology for Combined P&L

CHOSEN: order_items × product_metadata.weighted_avg_cost (LL-203 pattern)
with dispensing_log × inventory_items.weighted_avg_cost for dispensary (LL-231).

Fallback: stock_movements production_out × unit_cost if order_items yields zero.
SKIP: recipe estimates (product_cogs table) — not network-comparable.

Query pattern for retail COGS (two-step to avoid PostgREST join limitations):
```js
// Step 1: get paid order IDs in range
const { data: orderRows } = await supabase
  .from("orders")
  .select("id")
  .eq("tenant_id", tenantId)
  .eq("status", "paid")
  .gte("created_at", startISO)
  .lt("created_at", endISO);

// Step 2: get order_items for those IDs
const { data: itemRows } = await supabase
  .from("order_items")
  .select("quantity, line_total, product_metadata")
  .in("order_id", orderIds);

// Step 3: compute
const cogs = itemRows.reduce((s, oi) => {
  const avco = parseFloat(oi.product_metadata?.weighted_avg_cost || 0);
  return s + (oi.quantity || 0) * avco;
}, 0);

const revenue = itemRows.reduce((s, oi) =>
  s + (parseFloat(oi.line_total) || 0) / VAT_RATE, 0);
```

Query pattern for dispensary COGS:
```js
const { data: logs } = await supabase
  .from("dispensing_log")
  .select("quantity_dispensed, is_voided, inventory_items(sell_price, weighted_avg_cost)")
  .eq("tenant_id", tenantId)
  .gte("dispensed_at", startISO)
  .lt("dispensed_at", endISO);

const validLogs = (logs || []).filter(l => l.is_voided !== true);
const revenue = validLogs.reduce((s, l) =>
  s + (l.quantity_dispensed || 0) * (l.inventory_items?.sell_price || 0), 0);
const cogs = validLogs.reduce((s, l) =>
  s + (l.quantity_dispensed || 0) * (l.inventory_items?.weighted_avg_cost || 0), 0);
```

### Decision 3 — Loyalty cost: excluded from Combined P&L with footnote

CHOSEN: EXCLUDE loyalty cost from Combined P&L.

Reasons:
1. Loyalty cost = earnedPoints × (redemption_value_zar × (1 - breakage_rate)).
   This requires loyalty_config per tenant — 2 extra queries × N stores.
2. loyalty_config may not exist for all stores (maybeSingle returns null).
3. The Combined P&L primary question is structural gross margin and net margin.
   Loyalty is a marketing cost that lives within OPEX (or as a controlled
   subcategory). The COGS benchmark flag is the key innovation — loyalty noise
   would obscure it.
4. A clear footnote in the UI: "Loyalty programme cost is excluded from this view.
   See each store's HQ → Profit & Loss for loyalty-adjusted figures."

If loyalty cost is needed in future: add it as an opt-in in a later WP-ANALYTICS module.

### Decision 4 — Date ranges: 4 pre-set buttons

CHOSEN: MTD / Last Month / Last 3 Months / YTD
No custom date picker in this module.

Reasons:
1. Custom range adds form complexity that conflicts with the "one primary question"
   UX principle.
2. The 4 ranges cover all practical franchise reporting cadences.
3. HQProfitLoss already has full custom range control for deep dives.
4. Keeping it simple ensures the benchmark comparison stays meaningful —
   comparing stores on standardised periods is more analytically sound.

Date computation:
```js
// MTD: first of current month to now
// Last Month: e.g. if April → March 1 to March 31
// Last 3 Months: start of 3-months-ago to now
// YTD: Jan 1 of current year to now
```

### Decision 5 — COGS% benchmark flag (the key innovation)

CHOSEN: Two-tier flag with prescriptive message

Logic:
```js
const networkAvgCogsRate = totalNetworkCogs / totalNetworkRevenue;
const storeCogsRate = storeCogs / storeRevenue;
const deviation = storeCogsRate - networkAvgCogsRate;

if (deviation > 0.03) → RED flag: "COGS is 3%+ above network avg — investigate pricing or AVCO"
if (deviation > 0.02) → AMBER flag: "COGS trending 2-3% above network average"
// else: no flag (healthy)
```

This is the "silent profit leak detector" described in the master suite document.
Example: Store A runs 38% COGS, Store B runs 45% COGS. Network avg = 41%.
Store B triggers AMBER flag. The franchise owner knows to look at Store B's pricing.

Flags are shown on the per-store P&L column headers and on the store cards.

### Decision 6 — Layout: consolidated table + cards

CHOSEN: Three sections (same progressive disclosure principle as StoreComparison)

Section 1 — Network Summary Bar (4 KPI tiles)
Section 2 — Consolidated P&L Table (network total + per-store columns)
Section 3 — Per-store P&L cards (collapsible expense breakdown)

The table is the core analytical surface. It lets the franchise owner scan
vertically (all stores, one line item) AND horizontally (one store, all line items).
This is more powerful than separate cards for P&L comparison.

### Decision 7 — CSV export

CHOSEN: Client-side CSV generation. No server-side export needed.

Implementation: `downloadCSV(rows, filename)` helper that:
1. Builds header row from date range label + store names
2. Builds data rows for each P&L line item
3. Creates a blob URL and triggers download
4. No dependencies — pure JS, no library needed

Export scope: the full consolidated P&L table as shown on screen for the selected period.

---

## DATA ARCHITECTURE

### New helper: src/components/group/_helpers/fetchStoreFinancials.js

```
Signature:
  fetchStoreFinancials(tenantId, industryProfile, startISO, endISO)
  → Promise<FinancialsResult>

FinancialsResult shape:
{
  tenantId:       string,
  revenue:        number,   // ex-VAT for retail, gross for dispensary
  cogs:           number,
  grossProfit:    number,   // revenue - cogs
  grossMarginPct: number,   // (grossProfit / revenue) * 100
  totalOpex:      number,   // SUM of expenses WHERE category IN ('opex','wages','tax','other')
  netProfit:      number,   // grossProfit - totalOpex
  netMarginPct:   number,   // (netProfit / revenue) * 100
  orderCount:     number,   // for context
  cogsSource:     "order_items" | "production_out" | "unavailable",
  expenseCount:   number,   // for data quality badge
  err:            string | null,
}
```

Contract: never throws. All errors land in result.err. Partial results populated where possible.

Queries per store (worst case — retail with order_items):
1. orders → paid order IDs in range + revenue (1 query)
2. order_items → COGS from product_metadata AVCO (1 query, chunked if >50 orders)
3. expenses → OPEX sum for period (1 query)
Dispensary replaces queries 1+2 with 1 dispensing_log query.

Total: 3 queries per store for retail, 2 for dispensary.
10 stores = 30 queries max. Fetched in parallel via Promise.all across stores.

### VAT handling

```js
const VAT_RATE = 1.15; // SA VAT, as in HQProfitLoss.js

// Retail revenue from order_items:
const revenue = itemRows.reduce((s, oi) =>
  s + (parseFloat(oi.line_total) || 0) / VAT_RATE, 0);

// Retail revenue from orders (fallback when order_items is empty):
const revenue = orderRows.reduce((s, o) =>
  s + (parseFloat(o.total) || 0) / VAT_RATE, 0);

// Dispensary revenue: NOT VAT-inclusive — use as-is
const revenue = validLogs.reduce((s, l) =>
  s + (l.quantity_dispensed || 0) * (l.inventory_items?.sell_price || 0), 0);
```

### Network consolidated computation

```js
// After all store fetches complete:
const networkRevenue     = results.reduce((s, r) => s + r.revenue, 0);
const networkCogs        = results.reduce((s, r) => s + r.cogs, 0);
const networkGrossProfit = networkRevenue - networkCogs;
const networkGrossMargin = networkRevenue > 0
  ? (networkGrossProfit / networkRevenue) * 100 : 0;
const networkOpex        = results.reduce((s, r) => s + r.totalOpex, 0);
const networkNetProfit   = networkGrossProfit - networkOpex;
const networkNetMargin   = networkRevenue > 0
  ? (networkNetProfit / networkRevenue) * 100 : 0;

// COGS% benchmark for flag detection:
const networkAvgCogsRate = networkRevenue > 0
  ? networkCogs / networkRevenue : 0;
```

---

## COMPONENT SPEC — CombinedPL.js

### File: src/components/group/CombinedPL.js
### Props: { groupId, groupName, members[], onNavigate }
### Estimated size: 900–1100 lines

### Imports:
```js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip,
         ReferenceLine, ResponsiveContainer } from "recharts";
import { ChartCard, ChartTooltip, DeltaBadge,
         InlineProgressBar } from "../viz";
import { fetchStoreFinancials } from "./_helpers/fetchStoreFinancials";
import { T } from "../../styles/tokens";
```

### Internal constants:
```js
const VAT_RATE = 1.15;

const DATE_RANGES = [
  { id: "mtd",     label: "This month" },
  { id: "last_m",  label: "Last month" },
  { id: "last_3m", label: "Last 3 months" },
  { id: "ytd",     label: "This year" },
];

// Colour helpers (match StoreComparison convention)
const fmtR = (n) => `R${(parseFloat(n) || 0).toLocaleString("en-ZA", {
  minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (n) => `${(parseFloat(n) || 0).toFixed(1)}%`;

const marginColour = (pct) =>
  pct >= 55 ? T.successText : pct >= 40 ? T.warningText : T.dangerText;
```

### Section 1 — Network Summary Bar (4 KPI tiles)

```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Network Revenue│ Gross Profit   │ Net Profit     │ Avg GP Margin  │
│ R{total}       │ R{gp}          │ R{np}          │ {pct}%         │
│ {N} stores     │ {pct}% margin  │ {pct}% margin  │ Network avg    │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

Tile colours: Revenue → T.accentText, Gross Profit → marginColour(gp%),
Net Profit → marginColour(net%), Avg GP → standard.

### Section 2 — Consolidated P&L Table

The primary analytical surface. Column-first design — scan down = one store, scan right = all stores.

```
                     NETWORK      Store A      Store B      Store B ←
                     TOTAL        Medi Can     Medi Rec     High COGS
─────────────────────────────────────────────────────────────────────
Revenue              R{total}     R{n}         R{n}
COGS                 R{total}     R{n}         R{n}
COGS %               {n}%         {n}%         {n}% 🔴      ← flag
Gross Profit         R{total}     R{n}         R{n}
Gross Margin %       {n}%         {n}%         {n}%
─────────────────────────────────────────────────────────────────────
Operating Expenses   R{total}     R{n}         R{n}
─────────────────────────────────────────────────────────────────────
Net Profit           R{total}     R{n}         R{n}
Net Margin %         {n}%         {n}%         {n}%
─────────────────────────────────────────────────────────────────────
Order / Event Count  {total}      {n}          {n}
```

COGS% flag implementation:
- Calculate networkAvgCogsRate from total columns
- For each store: storeCogsRate = storeCogs / storeRevenue
- deviation = storeCogsRate - networkAvgCogsRate
- if deviation > 0.03: show 🔴 + tooltip "COGS 3%+ above network avg"
- if deviation > 0.02: show 🟡 + tooltip "COGS trending 2-3% above avg"

Table styling:
- T.surface background, T.border between rows
- Network total column: T.accentLight background, T.weight.bold
- Per-store columns: T.surface, T.weight.normal
- Flagged column header: T.dangerLight / T.warningLight background
- Subtotal rows (Gross Profit, Net Profit): T.weight.semibold, slightly shaded
- All monetary values: fontVariantNumeric: "tabular-nums"

### Section 3 — Per-store P&L Cards

Grid: repeat(auto-fit, minmax(280px, 1fr)), gap T.page.cardGap

Per-store card (T.surface, T.border, T.radius.lg, T.inset.card):

  Header:
    Store name
    Industry badge (from industryBadge.js — reuse from StoreComparison)
    COGS flag indicator (RED/AMBER banner at top of card if flagged)

  P&L summary rows:
    Revenue:      {fmtR(revenue)}
    COGS:         {fmtR(cogs)} ({fmtPct(cogsRate)})   — flag colour if triggered
    Gross Profit: {fmtR(gp)} — {fmtPct(gpPct)}
                  <InlineProgressBar value={gpPct} colourFn={marginColour} />
    OPEX:         {fmtR(opex)}
    Net Profit:   {fmtR(np)} — {fmtPct(npPct)}

  COGS flag detail (if triggered):
    "COGS is {+X.X}% above network average ({networkAvgPct}%).
     Check pricing or verify AVCO in HQ → Inventory."
    [View store →] (console.log placeholder per Phase 4b)

  Data quality note:
    cogsSource badge: "AVCO" (order_items) | "Production" | "Unavailable"
    expenseCount: "{N} expenses in period"

### CSV Export Button

Position: top-right of the component, next to date range selector.

```js
function downloadPLCsv(storeResults, dateRangeLabel, members) {
  const rows = [
    ["Metric", "Network", ...members.map(m => m.tenants?.name || m.tenant_id)],
    ["Period", dateRangeLabel, ...members.map(() => "")],
    ["Revenue (ex-VAT)", fmtR(network.revenue), ...storeResults.map(r => fmtR(r.revenue))],
    ["COGS", fmtR(network.cogs), ...storeResults.map(r => fmtR(r.cogs))],
    ["COGS %", fmtPct(network.cogsRate * 100), ...storeResults.map(r => fmtPct(r.cogsRate * 100))],
    ["Gross Profit", fmtR(network.grossProfit), ...storeResults.map(r => fmtR(r.grossProfit))],
    ["Gross Margin %", fmtPct(network.grossMarginPct), ...storeResults.map(r => fmtPct(r.grossMarginPct))],
    ["Operating Expenses", fmtR(network.totalOpex), ...storeResults.map(r => fmtR(r.totalOpex))],
    ["Net Profit", fmtR(network.netProfit), ...storeResults.map(r => fmtR(r.netProfit))],
    ["Net Margin %", fmtPct(network.netMarginPct), ...storeResults.map(r => fmtPct(r.netMarginPct))],
    ["Order / Event Count", String(network.orderCount), ...storeResults.map(r => String(r.orderCount))],
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `network-pl-${dateRangeLabel.replace(/\s/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Token compliance (mandatory LL-238)

All layout: T.container / T.page / T.gap / T.pad / T.inset
All colour: T.semantic × Light/Text variants
All type: T.text.{size} · T.weight.{weight}
Charts: T.accent · T.neutral · T.success · T.warning · T.danger
Zero hardcoded px matching any token.

---

## BUILD SEQUENCE (for Claude Code, when authorised)

### Step 0 — Schema verification (before any code)

Claude Code must run the following via Supabase MCP before writing queries:

```sql
-- 1. Verify expenses table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position;
-- Expected: id, tenant_id, category, subcategory, amount_zar, description, expense_date
-- If columns differ: update all fetchStoreFinancials expense queries to match

-- 2. Verify order_items.product_metadata JSONB key
SELECT product_metadata
FROM order_items
LIMIT 3;
-- Expected: {"weighted_avg_cost": 123.45, ...} per LL-203
-- If weighted_avg_cost absent: fallback to production_out AVCO only

-- 3. Verify dispensing_log columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dispensing_log'
ORDER BY ordinal_position;
-- Expected: id, tenant_id, inventory_item_id, quantity_dispensed, dispensed_at, is_voided
-- Note: fetchStoreSummary joins via inventory_items(sell_price) — confirm FK name

-- 4. Verify inventory_items.weighted_avg_cost exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'inventory_items' AND column_name = 'weighted_avg_cost';
-- Expected: 1 row. If missing: dispensary COGS is unavailable.
```

Report findings before proceeding. If any column name differs from expected,
update the spec data architecture section AND the helper before writing component code.

### Step 1 — Create fetchStoreFinancials.js

File: src/components/group/_helpers/fetchStoreFinancials.js

This is a standalone file. No changes to fetchStoreSummary.js or NetworkDashboard.js.

Implement exactly the logic specified in Data Architecture section above.
Export: named export `export async function fetchStoreFinancials(...)`.
Contract: never throws. Errors in result.err.

Test after writing: verify it returns sensible data for both tenant IDs in the
Medi Can Franchise Network:
  - 2bd41eb7-... (cannabis_dispensary) — should use dispensing_log path
  - b1bad266-... (cannabis_retail) — should use order_items path

### Step 2 — Build CombinedPL.js

File: src/components/group/CombinedPL.js
Target size: 900–1100 lines.

Build in internal sections order:
1. Constants + date range helpers
2. fetchStoreFinancials import + Promise.all pattern for all members
3. Network consolidated computation (after all fetches)
4. COGS% benchmark flag logic
5. Section 1: Network Summary Bar
6. Section 2: Consolidated P&L Table
7. Section 3: Per-store P&L Cards
8. CSV export button + downloadPLCsv helper
9. Loading state (spinner while fetches run)
10. Empty state (no members, or all stores returned err)
11. Data quality footer: "Loyalty programme cost excluded from this view. See HQ → Profit & Loss for loyalty-adjusted figures."

Loading pattern (match StoreComparison):
```js
const [loading, setLoading] = useState(true);
const [results, setResults] = useState([]);

// In useEffect: fetch all members in parallel
const fetched = await Promise.all(
  members.map(m => fetchStoreFinancials(
    m.tenant_id,
    m.tenants?.industry_profile,
    startISO,
    endISO,
  ))
);
setResults(fetched);
setLoading(false);
```

Re-fetch trigger: when dateRange selection changes.

### Step 3 — Mount in GroupPortal.js

Two surgical edits only (LL-221: read before edit — file already read):

Edit 1 — Add import at top of imports block:
```js
import CombinedPL from "./CombinedPL";
```

Edit 2 — Replace PlaceholderTab block:
```js
// REPLACE:
{activeTab === "financials" && (
  <PlaceholderTab
    title="Combined P&L"
    description="Consolidated P&L across all group stores. Read-only. Coming in later phase."
  />
)}

// WITH:
{activeTab === "financials" && (
  <CombinedPL
    groupId={groupId}
    groupName={groupName}
    members={members}
    onNavigate={handleNavClick}
  />
)}
```

No other GroupPortal changes. Props signature matches StoreComparison exactly.

### Step 4 — Build verification

```bash
CI=false npm run build
```

Zero new warnings required. If warnings appear: fix before marking complete.

Regression check: navigate to dashboard, transfers, compare, settings —
all four existing tabs must still render correctly.

Browser verification checklist:
  [ ] Tab renders without console errors
  [ ] Date range selector switches data correctly
  [ ] Network summary bar shows totals matching sum of stores
  [ ] Per-store COGS% benchmark flags trigger correctly
  [ ] CSV export downloads a valid .csv file
  [ ] Both Medi Can stores show (dispensary + retail, different COGS sources)
  [ ] Loading state shows while fetches run
  [ ] Error state handles store with Supabase error gracefully

---

## UX PRINCIPLES APPLIED (from WP-ANALYTICS master doc)

1. ONE PRIMARY QUESTION: "Is my franchise network profitable as a whole — and which store is leaking margin?"
   → Network consolidated P&L answers part 1. COGS% flag answers part 2.

2. PROGRESSIVE DISCLOSURE: Summary tiles → full P&L table → per-store detail cards.
   Franchise owner reads top to bottom and gets progressively more granular.

3. EVERY METRIC HAS CONTEXT: Raw R12,000 COGS means nothing.
   R12,000 = 34% COGS (3.2% above network avg 30.8%) — that means something.
   Every COGS% shows vs network average. Every margin shows colour-coded target.

4. EVERY INSIGHT IMPLIES AN ACTION: COGS flag includes "Check pricing or verify AVCO in HQ → Inventory."
   [View store →] navigates directly to that store's P&L.

5. LEADING + LAGGING BALANCE: P&L is inherently lagging. The COGS% benchmark flag
   is a leading signal — it fires before net profit has visibly collapsed.

6. BENCHMARKING IS THE VALUE: The consolidated table puts all stores in one grid.
   The owner can see at a glance whether the network is collectively profitable
   and which store is dragging margins.

---

## WHAT THIS MODULE DOES NOT BUILD (future phases)

- Daily P&L trend charts → WP-ANALYTICS-3 Revenue Intelligence
- Per-SKU margin drill-down → available in each store's HQProfitLoss
- Loyalty cost in network P&L → deferred (requires N × 2 extra queries)
- Depreciation / CAPEX in network P&L → deferred (requires fixed_assets per tenant)
- Journal adjustment integration → HQProfitLoss only (not network analytics scope)
- IFRS statement view for the network → separate feature, post-Module 6
- Budget vs actual variance → separate feature, WP-FORECAST
- Cross-tenant View store navigation → Phase 4b (general), tracked in session doc

---

## COMPETITIVE GAPS THIS MODULE CLOSES

No competitor (Flowhub, Cova, FranConnect, Dext Precision) offers:
- Cross-store P&L comparison in a single table for a SA franchise context
- AVCO-correct COGS calculation (LL-242 fix) in a multi-store view
- Profile-adaptive revenue routing (retail vs dispensary) in the same network P&L
- COGS% benchmark flag as a silent profit leak detector
- SA VAT-exclusive revenue calculation (÷ 1.15) as a built-in assumption
- IFRS-consistent line items available as the foundation layer

---

## KNOWN GAPS AND RISKS

**Gap 1 — Loyalty cost excluded**
Loyalty cost is a real operating cost. Its exclusion understates OPEX by
roughly 3-8% depending on programme generosity.
Mitigation: Clear footnote in UI. Direct link to per-store HQProfitLoss.
Future: add as opt-in toggle in a later analytics session.

**Gap 2 — Historical AVCO accuracy**
inventory_items.weighted_avg_cost reflects CURRENT AVCO, not AVCO at time of dispensing.
Affects dispensary COGS only. For retail, order_items.product_metadata captures AVCO at
point of sale — that is accurate.
Mitigation: Document in data quality badge on dispensary store cards.
Future: WP-ANALYTICS-4 Stock Intelligence will address historical AVCO reconciliation.

**Gap 3 — expenses table date filtering**
expenses.expense_date is a DATE string (YYYY-MM-DD), not a timestamptz.
Date range queries must use .slice(0, 10) on ISO strings to match.
This is already handled correctly in HQProfitLoss.js (confirmed).

**Gap 4 — Dispensary join syntax**
fetchStoreSummary uses `.select("quantity_dispensed, is_voided, inventory_items(sell_price)")`
for the dispensing_log → inventory_items join via PostgREST implicit FK.
fetchStoreFinancials will use the same pattern plus `weighted_avg_cost`.
If the FK name differs from what PostgREST expects, the join silently returns null.
Step 0 schema check must verify this join works before building.

---

## SESSION CLOSE REQUIREMENTS

When this module ships, the closing agent must:

1. Update docs/WP-ANALYTICS.md:
   - Change Module 2 status from "Pending" to "COMPLETE — HEAD [hash]"
   - Update phased delivery plan table

2. Update this file (docs/WP-ANALYTICS-2.md):
   - Change header status from "SPEC COMPLETE — ready to build" to
     "COMPLETE — shipped [hash], verified in browser"

3. Write docs/WP-ANALYTICS-3.md (Revenue Intelligence detailed spec)
   before closing — never leave a module unspecced heading into a new session.

4. Append SESSION-STATE Addendum 6 covering what shipped.

5. Write NEXT-SESSION-PROMPT_v243.md with fresh HEAD and priority queue.

6. Single commit:
   `docs: WP-ANALYTICS-2 complete + NEXT-SESSION-PROMPT v243 — Combined P&L live`

---
*WP-ANALYTICS-2 v1.0 · NuAi · 12 April 2026*
*Written from live codebase read: HEAD 8221177*
*Prerequisite: WP-ANALYTICS-1 COMPLETE (StoreComparison.js live)*
*Reuses: src/components/group/_helpers/ · src/components/viz/ · Recharts ^3.8.0*
*Author: George Fivaz + Claude.ai (Sonnet 4.6)*
