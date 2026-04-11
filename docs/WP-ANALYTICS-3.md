# WP-ANALYTICS-3 — Revenue Intelligence
## NuAi Franchise Analytics Suite — Module 3
## Status: COMPLETE — shipped 6ea2493 (S1: 5352d96 · S2: 6ea2493), verified in browser
## Written: 12 April 2026 · HEAD at time of writing: 5ba63b5
## New tab: /group-portal?tab=revenue (add to GroupPortal.js)

---

## WHAT THIS MODULE BUILDS

A new Revenue Intelligence tab in the Group Portal — not a replacement for
anything, a genuinely new surface. Mounted alongside the existing 5 tabs
as `/group-portal?tab=revenue`.

Primary question: **"Is my network growing or shrinking, and where?"**

Where Module 2 (Combined P&L) asks "are we profitable?", Module 3 asks "are we growing?".
These are different questions that need different data and different visualisations.

This module is **predictive and diagnostic** — beyond the descriptive P&L snapshot:
- SSSG (Same-Store Sales Growth) is the gold-standard franchise health metric
- Revenue trend overlays surface which store is pulling ahead vs falling behind
- Predictive projection gives the owner a month-end number before the month ends
- Peak trading analysis reveals when each store is busiest — scheduling intelligence

---

## RECONNAISSANCE FINDINGS (12 April 2026)

### Finding 1 — Daily revenue data source

There is no pre-bucketed daily revenue table. Revenue is in:
- `orders.total` (VAT-inclusive, divide by 1.15), `orders.created_at`, `orders.status`
- `dispensing_log.quantity_dispensed`, `dispensing_log.dispensed_at`, `dispensing_log.is_voided`, joined to `inventory_items.sell_price`

Both support timestamp-based grouping. Since PostgREST does not expose GROUP BY directly,
two approaches work:

**Option A — Fetch all rows and bucket client-side:**
For a 90-day window, Medi Recreational has ~468 × (90/365) ≈ 115 orders.
This is very manageable client-side. Proven pattern: HQProfitLoss fetches all orders
and filters/aggregates in React useMemo. Zero risk for the current data volume.

**Option B — Supabase RPC (DB function):**
Requires a new DB function. More complex setup, more powerful at scale (thousands of orders
per store). Premature for the current 2-store network.

**CHOSEN: Option A — client-side bucketing.**
Any future performance optimisation can migrate to Option B with the same component API.

### Finding 2 — fetchStoreSummary already has MTD + last-month revenue

fetchStoreSummary (extended mode) returns `revenueLastMonth` and `revenue` (MTD).
This is enough for month-on-month SSSG: `(revenue / revenueLastMonth) - 1`.

For daily trend and week-on-week SSSG, we need raw timestamped rows — a new helper.

### Finding 3 — fetchStoreFinancials (from WP-ANALYTICS-2) provides COGS + expenses

fetchStoreFinancials returns revenue (ex-VAT) for a given date range.
This can be reused for the SSSG computation if we need multi-period slices.

For the trend chart we want gross revenue (not ex-VAT adjusted per period) for
simplicity in the chart — users want to see the raw monetary trend, not accounting precision.
The VAT-exclusive adjustment matters for P&L, not for growth rate charting.
Apply VAT_RATE = 1.15 consistently — chart and SSSG must both use the same basis.

### Finding 4 — Recharts already available and proven

Recharts ^3.8.0, LineChart used in HQProfitLoss and AreaChart in HQOverview.
28 files already import from it. The trend overlay chart (all stores on one axis) uses
LineChart with one `<Line>` per store, each a distinct colour from a palette array.

### Finding 5 — GroupPortal.js NAV_ITEMS and tab router structure

GroupPortal.js currently has 6 NAV_ITEMS:
  dashboard · transfers · compare · financials · loyalty · settings

The "loyalty" entry is disabled (`disabled: true`) with a "Phase 2" label.
Revenue Intelligence needs a new nav entry:
  `{ id: "revenue", label: "Revenue Intelligence" }`

It is NOT appropriate to use the disabled loyalty slot — these are different features.
The new tab simply adds a 7th entry after "financials".

Tab router: the `{activeTab === "X" && <Component ... />}` pattern.
Add one new block for `activeTab === "revenue"`.

### Finding 6 — Profile-adaptive date labels

dispensing_log.dispensed_at uses `timestamptz` — extractable to date for bucketing.
orders.created_at uses `timestamptz` — same.

Day-of-week computation: `new Date(ts).getDay()` — 0=Sunday, 6=Saturday.
SA context: Saturday is typically the highest-revenue day for cannabis retail.
This should be surface-visible in peak trading analysis.

---

## ARCHITECTURAL DECISIONS (locked before build)

### Decision 1 — New helper: fetchStoreTrend.js

Sibling to fetchStoreSummary.js and fetchStoreFinancials.js in `_helpers/`.

Signature:
```js
fetchStoreTrend(tenantId, industryProfile, windowDays)
  → Promise<TrendResult>
```

`windowDays` controls how far back we fetch: 30, 60, or 90.

Returns raw timestamped rows so the caller can bucket any way it needs
(daily, weekly, by hour, by day-of-week). The component does the bucketing.

### Decision 2 — SSSG calculation basis

Month-on-month SSSG:
- "This month MTD" = revenue from 1st of current month to today
- "Last month full" = revenue from 1st of prior month to last day of prior month
- SSSG_MoM = (thisMTD / lastFull) - 1
- Context note: MTD vs full-month comparison is slightly unfair early in the month.
  Show a "day N of month" label so the owner understands the basis.
  At day 12 of April vs full March: show "vs full March (day 12)"

Week-on-week SSSG:
- "This week" = Monday-to-today (ISO week)
- "Last week full" = last Monday-to-Sunday
- SSSG_WoW = (thisWeekRevenue / lastWeekRevenue) - 1

Year-on-year: deferred. The production Medi Can network has < 12 months of data.
YoY would return null for most stores. Show as "Insufficient data" and skip chart rendering.

### Decision 3 — Predictive projection: simple linear extrapolation

Method: compute revenue per day for the last 7 days (rolling average), project to month-end.
```js
const last7Days = dailyRevenue.slice(-7);
const avgDailyRevenue = last7Days.reduce((s, d) => s + d.revenue, 0) / last7Days.length;
const daysRemaining = daysInMonth - dayOfMonth;
const projectedAdditional = avgDailyRevenue * daysRemaining;
const projectedMonthEnd = revenueSoFar + projectedAdditional;
```

Compare to: last month's full revenue (already in fetchStoreSummary extended mode).
Frame: "At current velocity: projected R{X} by month-end (vs R{Y} last month)"
Colour: green if trending above last month, red if below.

No ML, no polynomial regression — the rolling 7-day average is accurate enough and
explainable to a franchise owner. Complexity belongs in Module 6 (NuAi Network Intelligence).

### Decision 4 — Peak trading analysis: hour × day-of-week matrix

Compute per store: sum of orders or dispensing events grouped by:
- hour of day (0-23, but SA cannabis retail realistic window: 9-22)
- day of week (0=Sun, 1=Mon... 6=Sat)

Render as a simple colour-matrix (heat intensity = order count).
Use a custom SVG grid (no Recharts — this is a 7×14 or 7×24 cell grid with fill colour
proportional to cell count. Small component, ~80 lines of SVG JSX).

Insight surface: "Peak trading: Saturday 14:00–17:00 across the network."
Action implied: "Staff roster peak shift during these hours."

### Decision 5 — Revenue category breakdown: deferred

Linking order_items.product_name to inventory_items.category is fragile (name matching).
The correct approach is a product_id on order_items joining to inventory_items.id —
but order_items only has product_name (text). Category aggregation from sales data
requires this FK or a consistent naming convention that doesn't currently exist.

**Decision: NOT in Module 3.** Flag in the spec as "requires product_id on order_items
or a tag/category on order_items — schema enhancement, future WP."

Top products by revenue IS available (from fetchStoreSummary extended mode topProducts)
and should be surfaced in Module 3 as a per-store leaderboard alongside the trend chart.

### Decision 6 — Layout: two sessions

**Session 1 (core):**
- fetchStoreTrend.js helper
- Section 1: Network SSSG summary (4 tiles: revenue MTD, MoM SSSG, WoW SSSG, top-growth store)
- Section 2: Revenue trend overlay chart (all stores, 30/60/90 toggle)
- Section 3: Per-store SSSG cards with trend sparkline (if SparkLine component supports it)
- Mount in GroupPortal.js

**Session 2 (predictive + peak):**
- Predictive projection card per store
- Peak trading heat matrix (per store, collapsible)
- Top products per store (from fetchStoreSummary — already available, needs display)
- Polish and CSV export of SSSG data

---

## DATA ARCHITECTURE

### New helper: src/components/group/_helpers/fetchStoreTrend.js

```
Signature:
  fetchStoreTrend(tenantId, industryProfile, windowDays = 30)
  → Promise<TrendResult>

TrendResult shape:
{
  tenantId:      string,
  rows: Array<{
    date:    string,   // "YYYY-MM-DD" — for daily bucketing
    hour:    number,   // 0-23 — for peak trading
    dayOfWeek: number, // 0-6 — for peak trading
    revenue: number,   // ex-VAT, same basis as CombinedPL
  }>,
  orderCount:    number,   // total events in window
  err:           string | null,
}
```

The component derives from `rows`:
- `dailyRevenue[]` by grouping on `date`
- `weeklyRevenue[]` by grouping on ISO week
- `peakMatrix[dayOfWeek][hour]` by grouping on both dimensions
- `sssgMoM` from pre-computed current-month and prior-month slices
- `projectedMonthEnd` from rolling 7-day average

**Queries:**

For cannabis_retail / general_retail / food_beverage:
```js
const startISO = new Date(Date.now() - windowDays * 86400000).toISOString();

const { data } = await supabase
  .from("orders")
  .select("created_at, total")
  .eq("tenant_id", tenantId)
  .eq("status", "paid")
  .gte("created_at", startISO);

// Map to rows:
rows = (data || []).map(o => ({
  date:      o.created_at.slice(0, 10),
  hour:      new Date(o.created_at).getHours(),
  dayOfWeek: new Date(o.created_at).getDay(),
  revenue:   (parseFloat(o.total) || 0) / VAT_RATE,
}));
```

For cannabis_dispensary:
```js
const { data } = await supabase
  .from("dispensing_log")
  .select("dispensed_at, quantity_dispensed, is_voided, inventory_items(sell_price)")
  .eq("tenant_id", tenantId)
  .neq("is_voided", true)
  .gte("dispensed_at", startISO);

rows = (data || []).map(l => {
  const rev = (parseFloat(l.quantity_dispensed) || 0)
    * parseFloat(l.inventory_items?.sell_price || 0);
  return {
    date:      l.dispensed_at.slice(0, 10),
    hour:      new Date(l.dispensed_at).getHours(),
    dayOfWeek: new Date(l.dispensed_at).getDay(),
    revenue: rev,
  };
});
```

### Client-side bucketing helpers

```js
// Group rows by date → daily revenue array
function toDailyBuckets(rows) {
  const map = {};
  for (const r of rows) {
    map[r.date] = (map[r.date] || 0) + r.revenue;
  }
  return Object.entries(map)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// SSSG month-on-month
function calcSSSGMoM(rows) {
  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

  const mtd  = rows.filter(r => r.date >= mtdStart).reduce((s, r) => s + r.revenue, 0);
  const prev = rows.filter(r => r.date >= prevMonthStart && r.date <= prevMonthEnd)
                   .reduce((s, r) => s + r.revenue, 0);
  if (prev === 0) return null;
  return (mtd - prev) / prev;
}

// Predictive month-end projection
function projectMonthEnd(rows) {
  const daily = toDailyBuckets(rows);
  const today = new Date();
  const mtdStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const mtdRows = daily.filter(d => d.date >= mtdStart);
  const mtdRevenue = mtdRows.reduce((s, d) => s + d.revenue, 0);
  const last7 = daily.slice(-7);
  const avgDaily = last7.length ? last7.reduce((s, d) => s + d.revenue, 0) / last7.length : 0;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate();
  return { mtdRevenue, projectedMonthEnd: mtdRevenue + avgDaily * daysRemaining, avgDaily };
}
```

### Trend overlay colour palette

One Line per store, each a distinct colour:
```js
const STORE_PALETTE = [
  T.accent,          // deep forest green — franchisor or first store
  "#2563EB",         // sapphire blue
  "#9333EA",         // violet
  "#D97706",         // amber
  "#DC2626",         // crimson
  "#0891B2",         // cyan
];
// If more than 6 stores, cycle with opacity reduction
```

---

## COMPONENT SPEC — RevenueIntelligence.js

### File: src/components/group/RevenueIntelligence.js
### Props: { groupId, groupName, members[], onNavigate }
### Estimated size Session 1: 700–900 lines · Session 2 adds ~300 lines

### Session 1 — Core layout

**Header:**
- Title "Revenue Intelligence" with subtitle "Growth trends across your network"
- Window toggle: [30d] [60d] [90d] pills — controls fetch windowDays

**Section 1 — Network Growth Summary (4 tiles)**
```
┌──────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Network Rev MTD  │ MoM SSSG        │ WoW SSSG        │ Top Growth Store│
│ R{total}         │ +{N}%           │ +{N}%           │ {name}          │
│ {N} stores       │ vs last month   │ vs last week    │ +{N}% MoM       │
└──────────────────┴─────────────────┴─────────────────┴─────────────────┘
```
MoM and WoW tiles: green if positive, red if negative, grey if null (insufficient data).
"Top Growth Store" tile: accent-coloured with the highest-positive SSSG_MoM store.
Replaced by "Network Avg SSSG" if no store has a positive SSSG.

**Section 2 — Revenue Trend Overlay Chart**
```js
// Recharts LineChart, height 300px, inside ChartCard
<ChartCard title="Revenue Trend" subtitle={`Daily revenue · last ${windowDays} days`}>
  <ResponsiveContainer>
    <LineChart data={networkDailyRevenue}>  {/* all store revenues by date */}
      <CartesianGrid horizontal vertical={false} stroke={T.border} />
      <XAxis dataKey="date" /* format as "1 Apr", "5 Apr" */ />
      <YAxis tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
      <Tooltip content={<ChartTooltip />} />
      {members.map((m, i) => (
        <Line
          key={m.tenant_id}
          dataKey={m.tenant_id}
          name={m.tenants?.name}
          stroke={STORE_PALETTE[i % STORE_PALETTE.length]}
          strokeWidth={2}
          dot={false}
        />
      ))}
      <Legend />
    </LineChart>
  </ResponsiveContainer>
</ChartCard>
```

Data preparation: merge all stores' daily buckets onto a shared date axis.
Missing dates for a store get a 0 value (no sales that day).

**Section 3 — Per-store SSSG cards**

Grid: `repeat(auto-fit, minmax(280px, 1fr))`

Per-card:
- Store name + industry badge
- MoM SSSG: big number with colour (green/red/grey) + context "vs full March"
- WoW SSSG: smaller number
- Revenue MTD vs projected month-end (Session 2 addition)
- Sparkline-style mini bar chart of last 7 daily revenues (7 bars, no axis labels)
  Built with Recharts `<BarChart>` mini (height 40px) or manual SVG if simpler

### Session 2 — Predictive + Peak additions

**Predictive card (per store, inlined in the store SSSG card):**
```
Revenue MTD:        R14,250
Projected month-end: R38,900 ↑ (vs R31,200 last month)
  Based on 7-day avg R825/day · 18 days remaining
```

**Peak Trading — collapsible per store:**
Toggle "Peak trading ▾" reveals a 7×14 hour grid (7 days × 14 hours, 9am-10pm).
Each cell coloured by order count: white (0) → light-accent → deep-accent.
Day labels: Sun Mon Tue Wed Thu Fri Sat
Hour labels: 9am 10am ... 10pm
Network insight below: "Peak: Saturday 14:00–17:00 across {N} stores"

**CSV export button:**
Export SSSG summary table: Store | Revenue MTD | Last Month | MoM SSSG | WoW SSSG | Projected
Same client-side blob pattern as CombinedPL.

---

## BUILD SEQUENCE

### Pre-build: Session 1

Step 0 — Schema check (before any code):
```sql
-- Verify orders.created_at is timestamptz (not date)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'created_at';

-- Verify dispensing_log.dispensed_at is timestamptz
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'dispensing_log' AND column_name = 'dispensed_at';

-- Confirm data volume per store in the 90d window
-- (ensures client-side bucketing is viable)
SELECT tenant_id, count(*) FROM orders
WHERE status = 'paid'
  AND created_at >= now() - interval '90 days'
GROUP BY tenant_id;
```

Report before proceeding. If any store has > 10,000 orders in 90 days,
reconsider client-side bucketing (switch to RPC aggregation for that store).

Step 1 — Create fetchStoreTrend.js helper

Step 2 — Build RevenueIntelligence.js (Session 1 scope: Sections 1-3 core)

Step 3 — Add to GroupPortal.js:
  - NAV_ITEMS: `{ id: "revenue", label: "Revenue Intelligence" }` after "financials"
  - Import + tab router block: `{activeTab === "revenue" && <RevenueIntelligence ... />}`

Step 4 — Build verification: CI=false npm run build, zero new warnings
  Browser check: all stores render, date toggles work, trend chart shows overlaid lines

### Pre-build: Session 2

Read RevenueIntelligence.js in full before adding Session 2 features (LL-221).
Add predictive projection, peak trading matrix, CSV export, top products per store.

---

## UX PRINCIPLES APPLIED

1. ONE PRIMARY QUESTION: "Is my network growing or shrinking, and where?"
2. PROGRESSIVE DISCLOSURE: SSSG tiles → trend overlay chart → per-store growth cards → peak details
3. EVERY METRIC HAS CONTEXT: SSSG +12% vs what? vs last month, vs last week. Always shown.
4. EVERY INSIGHT IMPLIES AN ACTION: Worst-growth store card has [View P&L →] action.
5. LEADING + LAGGING: Trend chart is lagging. Projected month-end is leading.
6. BENCHMARKING: Per-store SSSG vs network average shown on every card.

---

## WHAT THIS MODULE DOES NOT BUILD

- Revenue per product category (requires schema FK — future WP)
- YoY SSSG (insufficient historical data for current tenant cohort — surface as "Coming soon")
- AI anomaly alerts → Module 6 (NuAi Network Intelligence)
- In-store hourly heatmap across arbitrary date ranges — admin-portal level of detail

---

## KNOWN GAPS AND RISKS

**Gap 1 — Timezone handling**
`orders.created_at` is stored in UTC. SA timezone is UTC+2.
An order placed at 11pm SAST on a Friday lands in Saturday UTC.
Impact: peak trading analysis may show a 2-hour offset.
Mitigation: document the offset in the UI footnote. A correct solution requires
client-side date localisation (`new Date(ts).toLocaleDateString("en-ZA")`)
which works correctly in the browser with the user's OS timezone.

**Gap 2 — SSSG early-month distortion**
MTD vs full-prior-month comparison is inherently distorted on day 1-10 of the month.
Mitigation: show "Day N of month" context label next to MoM SSSG.
A same-days comparison (current days 1-12 vs prior days 1-12) is more accurate —
flag as a Session 2 enhancement if the owner finds the early-month numbers confusing.

**Gap 3 — Dispensary event volume is low**
Medi Can Dispensary has 14 dispensing events. Daily bucketing produces many 0s.
Trend chart for a dispensary store will look mostly flat with occasional spikes.
Mitigation: this is honest data. Do not smooth or interpolate.
Show event count prominently so the owner understands the data basis.

---

## SESSION CLOSE REQUIREMENTS

When this module ships (Session 1), the closing agent must:
1. Update docs/WP-ANALYTICS.md — Module 3 from "Pending" to "IN PROGRESS — HEAD [hash]"
2. Update this file — status from "SPEC COMPLETE" to "IN PROGRESS — Session 1 HEAD [hash]"
3. Write docs/WP-ANALYTICS-4.md (Stock Intelligence spec) before closing
4. Append next SESSION-STATE addendum
5. Write next NEXT-SESSION-PROMPT
6. Single commit: `docs: WP-ANALYTICS-3 S1 complete + NEXT-SESSION-PROMPT v[N+1]`

When Session 2 ships:
1. Update docs/WP-ANALYTICS.md — Module 3 from "IN PROGRESS" to "COMPLETE — HEAD [hash]"
2. Update this file — status to "COMPLETE — shipped [hash], verified in browser"
3. Write docs/WP-ANALYTICS-4.md if not already written

---
*WP-ANALYTICS-3 v1.0 · NuAi · 12 April 2026*
*Written from live codebase read: HEAD 5ba63b5*
*Prerequisite: WP-ANALYTICS-2 COMPLETE (CombinedPL.js live)*
*2-session module: Session 1 = core trend + SSSG · Session 2 = predictive + peak trading*
*Reuses: fetchStoreSummary.js (MTD data) · src/components/viz/ · Recharts ^3.8.0*
*Author: George Fivaz + Claude.ai (Sonnet 4.6)*
