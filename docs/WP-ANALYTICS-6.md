# WP-ANALYTICS-6 — NuAi Network Intelligence
## Status: ✅ COMPLETE — Session 1 HEAD `acb007c` · 12 April 2026
## Produced: 12 April 2026 · Claude.ai strategic spec session
## Author: Claude.ai (spec) — implementation by Claude Code
## Position in suite: Module 6 of 6 — the executive synthesis layer
## This is the final module. When this file shows COMPLETE, the
## WP-ANALYTICS suite is DONE.

---

## MODULE IDENTITY

**Component:** `src/components/group/NetworkIntelligence.js`
**Helper:** `src/components/group/_helpers/fetchNetworkIntelligence.js`
**Nav label:** `Network Intelligence`
**Nav ID:** `network`
**Position in NAV_ITEMS:** after `customers` (currently position 7 — this becomes 8)
**Session 1 target:** ~1,000–1,200 lines

---

## WHY THIS MODULE EXISTS — AND WHY IT'S LAST

Modules 1–5 each answer a specific question:
- Module 1: How do stores compare?
- Module 2: What's the combined P&L?
- Module 3: Is revenue growing?
- Module 4: Where is stock stuck?
- Module 5: How are customers behaving?

Module 6 answers the question the franchise owner asks before opening any of the above:
**"Is my network healthy — and what needs my attention right now?"**

This module synthesises across all existing helpers into a single executive view.
It does not introduce new database queries where existing helpers already fetch
the data. The `fetchNetworkIntelligence` helper is an aggregator, not a new
data fetcher — it calls the established `_helpers/` siblings in parallel and
assembles the results into network-level intelligence primitives.

---

## ARCHITECTURAL DECISION — REUSE OVER REQUERY

This is the most important design decision in Module 6.

**DO:** Call existing helpers in parallel and aggregate their results:
```js
const [summaries, inventories, loyalties] = await Promise.all([
  Promise.all(members.map(m => fetchStoreSummary(m.tenant_id, ...))),
  Promise.all(members.map(m => fetchStoreInventory(m.tenant_id, ..., { includeVelocity: true }))),
  Promise.all(members.map(m => fetchStoreLoyalty(m.tenant_id, ...))),
]);
```

**DON'T:** Write new Supabase queries that duplicate what the helpers already
fetch. If a metric already exists in a helper's return shape, use it. Only
write a new query if the data genuinely doesn't exist anywhere else.

This keeps the data layer DRY and means Module 6 benefits automatically from
any future improvements to the upstream helpers.

**Performance note:** Module 6 runs 3 × N queries in parallel (where N = store
count). For 2 stores this is 6 parallel queries — trivial. Document the
parallel pattern in a comment block at the top of the helper.

---

## STEP 0 — SCHEMA CHECK (run before any code, every session)

```sql
-- 1. Confirm royalty_percentage on tenant_groups (may have been added
--    in Phase 5 — verify column exists and type)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_groups'
  AND column_name IN ('royalty_percentage', 'name', 'id', 'owner_tenant_id');

-- 2. Confirm tenant_group_members for per-store revenue attribution
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_group_members'
  AND column_name IN ('tenant_id', 'group_id', 'role', 'joined_at');

-- 3. Live royalty data snapshot
SELECT
  tg.name,
  tg.royalty_percentage,
  tgm.tenant_id,
  tgm.role
FROM tenant_groups tg
JOIN tenant_group_members tgm ON tgm.group_id = tg.id
WHERE tg.id = (
  SELECT group_id FROM tenant_group_members
  WHERE tenant_id = '2bd41eb7-1a6e-416c-905b-1358f6499d8d'
  LIMIT 1
);

-- 4. Verify no new tables were added since the last schema check
--    that would be relevant to network-level analytics
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'network_alerts', 'network_scores', 'franchise_fees',
    'royalty_ledger', 'compliance_log'
  );
```

Report all findings before writing a line.

---

## HELPER SPEC — `fetchNetworkIntelligence.js`

**Location:** `src/components/group/_helpers/fetchNetworkIntelligence.js`
**Signature:** `fetchNetworkIntelligence(members, groupMeta, options = {})`

### Parameters
```js
members    // array from GroupPortal — each has tenant_id, tenants.name,
           // tenants.industry_profile, role
groupMeta  // { royaltyPct, groupName } — from tenant_groups
options    // { monthStartISO, monthEndISO, lastMonthStartISO, lastMonthEndISO }
```

### What it does
Calls three helper families in parallel, then computes derived intelligence:

```js
// Phase 1 — parallel data fetch (3 Promise.all calls in one outer Promise.all)
const [summaryResults, inventoryResults, loyaltyResults] = await Promise.all([
  Promise.all(members.map(m => fetchStoreSummary(...))),
  Promise.all(members.map(m => fetchStoreInventory(..., { includeVelocity: true }))),
  Promise.all(members.map(m => fetchStoreLoyalty(...)))
]);

// Phase 2 — per-store health score derivation (client-side, no queries)
// Phase 3 — alert generation (client-side, no queries)
// Phase 4 — royalty calculation (client-side arithmetic, no queries)
```

### Health Score algorithm (per store, 0–100)

Five dimensions, each 0–20 points:

| Dimension | Signal | Full score (20) | Zero score (0) |
|---|---|---|---|
| Revenue trend | MoM SSSG % | ≥ +10% | ≤ −20% |
| Stock health | Out-of-stock % of total | 0% out | ≥ 10% out |
| Dead stock | Dead stock as % of inventory value | 0% dead | ≥ 15% dead |
| Customer retention | Active member rate (last 30d) | ≥ 80% | ≤ 20% |
| Loyalty engagement | Points redemption rate MTD | ≥ 20% | 0% |

Score = Σ of 5 dimension scores. Linear interpolation within each band.
Round to nearest integer. Store as `healthScore` (0–100) per store.

**Score colour bands:**
- 80–100: `T.successText` — Healthy
- 60–79: `T.ink700` — Stable
- 40–59: `T.warningText` — Watch
- 0–39: `T.dangerText` — Critical

**Data quality guard:** If any dimension's input data is unavailable (e.g.
AVCO missing → dead stock % unreliable), exclude that dimension from the
score and scale the remaining dimensions proportionally. Never return a
score that is artificially inflated by missing data. Document which
dimensions were excluded in `store.scoreExclusions[]`.

### Alert generation (client-side, no queries)

Traverse all helper results and emit structured alerts:

```js
{
  storeId,        // tenant_id
  storeName,      // tenants.name
  severity,       // 'critical' | 'warning' | 'info'
  module,         // 'stock' | 'revenue' | 'customers' | 'loyalty'
  signal,         // short label e.g. "Critical restock"
  detail,         // one-sentence description e.g. "9 items with < 7 days of stock"
  action,         // nav target e.g. 'stock' (routes to Stock Intelligence tab)
}
```

**Alert sources (in severity order):**

Critical:
- `inventoryResult.summary.criticalRestock > 0` → "N items with < 7 days of stock"
- `inventoryResult.summary.sellingWithNoStock > 0` → "N items active but out of stock"
- `loyaltyResult.summary.atRiskMembers > totalMembers * 0.3` → "N members at churn risk"

Warning:
- `inventoryResult.summary.deadStockValue > totalValue * 0.1` → "N% capital in dead stock"
- `summaryResult.stockMarginPct < 0.5` → "Gross margin below 50%"
- `loyaltyResult.summary.redemptionRate < 0.05` → "< 5% loyalty redemption — points accumulating"
- MoM revenue `< -20%` → "Revenue down N% vs prior month"

Info:
- `inventoryResult.summary.needsReorder > 0` → "N items need reorder"
- `loyaltyResult.summary.dormantMembers > totalMembers * 0.2` → "N% of members never purchased"

Sort: critical first, then warning, then info. Within severity: by impact
(largest number / worst percentage first).

### Royalty calculation (client-side)

```js
const royaltyDue = (store.revenue * (royaltyPct / 100));
// MTD, last month, YTD (sum across months in the helper's date range)
```

Only compute for stores where `member.role === 'franchisee'`. Franchisor
(role === 'franchisor') does not owe royalties.

If `royaltyPct === 0` → show calculation correctly as R0, with a note:
"Royalty rate not yet configured — set in Group Settings." Do not hide
the section.

### Return shape
```js
{
  stores: [{
    member,
    summary,        // from fetchStoreSummary
    inventory,      // from fetchStoreInventory
    loyalty,        // from fetchStoreLoyalty
    healthScore,    // 0–100
    scoreExclusions,// string[] — dimensions excluded due to missing data
    royaltyMTD,     // numeric
    royaltyLastMonth,
    alerts,         // Alert[] for this store
  }],
  network: {
    totalAlerts,
    criticalCount,
    avgHealthScore,
    topAlert,       // the single most severe alert across the whole network
    royaltyDueMTD,  // Σ franchisee royalties
  },
  err: null
}
```

Contract: never throws. Partial failures (one helper fails for one store)
populate `store.inventory.err` etc. and the store still renders with
available data. `network.avgHealthScore` excludes stores where all three
helpers failed.

---

## COMPONENT SPEC — `NetworkIntelligence.js`

### Page structure
```
<h2>Network Intelligence · {groupName}</h2>
<p>Executive overview · {N} stores · {date}</p>

[Alert Centre]          — consolidated alerts, all stores, severity-sorted
[Section 1]             — Network Health Score — store scorecards
[Section 2]             — Benchmarking Table — all KPIs side by side
[Section 3]             — Royalty Calculator
[CSV Export button]     — top-right, full benchmarking data

[data-quality footnote]
```

---

## ALERT CENTRE (above Section 1)

The most important UI element in Module 6. A franchise owner who opens
this tab should see the most urgent things first — before anything else.

**Only renders when `network.criticalCount > 0` OR `network.totalAlerts > 0`.**
Absent when the network is fully healthy (no alerts). Not an empty card —
genuinely absent.

**When critical alerts exist:** the entire Alert Centre section has a
`border-left: 3px solid T.danger` accent. When warning-only: `T.warning`.

**Layout:** A flat list of alert rows, no collapsing. Each row:
```
[severity dot]  [store name]  [signal label]  [detail text]  [→ Go to {tab}]
```

Severity dot: filled circle, 8px, T.danger / T.warning / T.ink400.
"Go to {tab}" link calls `onNavigate(alert.action)` — routes to the
relevant analytics tab so the owner can investigate immediately.

**Cap at 10 alerts displayed.** If more exist, show "+ N more alerts" link
that expands inline. Don't truncate critical alerts — if there are 6 critical
alerts, show all 6 before any warnings.

---

## SECTION 1 — NETWORK HEALTH SCORE

**Per-store scorecards** in an auto-fit grid, `minmax(280px, 1fr)`.

Each scorecard:
```
[Store name]  [IndustryPill]  [(you) marker]

    [Score gauge — large number, colour-coded]
              72 / 100
              STABLE

[5 dimension bars — horizontal, proportional width]
Revenue trend    ████████████████████  16/20
Stock health     ████████████████████  20/20
Dead stock       ████████████████████  12/20
Customer retain  ████████████████████  12/20
Loyalty engage   ████████████████████   4/20

[scoreExclusions note if any dimensions were excluded]
```

Score gauge: large (T.text.4xl or equivalent), colour by band.
Label below: "HEALTHY" / "STABLE" / "WATCH" / "CRITICAL" in same colour.

Dimension bars: thin (6px height), full-width of card, coloured by score:
- 16–20: T.success
- 10–15: T.warning
- 0–9: T.danger

Dimension label on left (truncated to 16 chars), score fraction on right
(`16/20` format in T.textSecondary, tabular-nums).

**Network average bar** below the store cards — a horizontal summary showing
the average score across all stores with a label "Network avg: {N}/100".

---

## SECTION 2 — BENCHMARKING TABLE

A single table with one row per store and all key metrics as columns.
This is the view the franchise owner shares with their bank, their accountant,
or uses for quarterly reviews.

**Columns:**

| Column | Source | Format |
|---|---|---|
| Store | member name + IndustryPill | — |
| Revenue MTD | fetchStoreSummary | fmtR |
| MoM Growth | fetchStoreSummary | fmtPct, coloured |
| Gross Margin | fetchStoreSummary | fmtPct |
| Stock Value | fetchStoreInventory | fmtR |
| Out of Stock | fetchStoreInventory | count, danger if > 0 |
| Active Customers | fetchStoreLoyalty | count |
| Active Rate | fetchStoreLoyalty | fmtPct, coloured |
| Redemption Rate | fetchStoreLoyalty | fmtPct |
| Health Score | computed | N/100, coloured |

**Network total/average row** pinned at bottom with `background: T.surfaceAlt`.
Totals for revenue/stock value, averages for percentages and scores.

**Sortable columns:** click any column header to sort. Default: Health Score DESC.
Sort state: local useState, no URL persistence.

**Column width:** `table-layout: fixed` with explicit widths. The table is wide —
wrap in `overflowX: auto` container so it scrolls horizontally on narrow viewports
rather than overflowing the page.

---

## SECTION 3 — ROYALTY CALCULATOR

**Only renders when `groupMeta.royaltyPct` is accessible** (even if 0%).

```
ROYALTY SUMMARY  ·  {royaltyPct}% of revenue

Store                   Revenue MTD   Royalty MTD   Last Month   Role
Medi Can Dispensary     R6,000        —             —            Franchisor
Medi Recreational       R0            R0            R0           Franchisee

NETWORK ROYALTY DUE MTD                             R0
```

Franchisor row shows "—" in royalty columns — they don't owe royalties
to themselves. Only franchisee rows show royalty amounts.

If `royaltyPct === 0`, render a note below the table:
```
Royalty rate is set to 0%. To configure: Group Settings → Royalty rate.
```
In T.textSecondary, with a button that calls `onNavigate('settings')`.

**No data modification.** This section is read-only display. The royalty
calculation is `revenue × (royaltyPct / 100)`. No payment processing,
no invoice generation, no ledger writes in S1.

---

## CSV EXPORT

**Exports the benchmarking table (Section 2) as a CSV.**
Same pattern as RevenueIntelligence `downloadSSSGCsv` and StockIntelligence
flag-export.

**Filename:** `network-intelligence-{group-slug}-{YYYY-MM}.csv`

**Columns match Section 2 exactly** (10 columns). Revenue values in rands
(no R prefix in CSV — Excel will treat them as numbers). Percentages as
decimals (e.g. 0.674 not 67.4%). Health score as integer.

**Button position:** top-right of page header, beside h2, same as
RevenueIntelligence.

---

## GROUPPORTAL.JS WIRE-UP

Three surgical edits — read GroupPortal.js in full (LL-221) before touching:

1. Import: `import NetworkIntelligence from './NetworkIntelligence';`
2. NAV_ITEMS: `{ id: 'network', label: 'Network Intelligence' }` after `customers`
3. Tab router block:

```jsx
) : activeTab === 'network' ? (
  <NetworkIntelligence
    members={members}
    groupId={groupId}
    groupName={groupName}
    groupMeta={groupMeta}
    onNavigate={setActiveTab}
  />
```

**`groupMeta` prop:** GroupPortal.js currently passes various props to child
components. Check whether `groupMeta` (containing `royaltyPct`) is already
available in GroupPortal's state, or needs to be fetched from `tenant_groups`.
Read GroupPortal.js in full (LL-221) before touching it — if `royaltyPct`
isn't in scope, add a one-time fetch in GroupPortal's existing `useEffect`
that reads `tenant_groups.royalty_percentage` for the current group. Do NOT
add a new `useEffect` — extend the existing one.

---

## DATA QUALITY FOOTNOTE

```
Network Intelligence synthesises data from Revenue (fetchStoreSummary),
Stock (fetchStoreInventory with velocity), and Customer (fetchStoreLoyalty)
helpers. Health scores are excluded from a dimension when its source data
is unavailable — the score denominator adjusts accordingly. "Healthy" (80+)
requires all 5 dimensions to have data. Royalty calculations are indicative
only — based on MTD revenue at the configured rate. No payment records are
created or modified by this view. Alert thresholds are fixed constants —
see the component source for tuning values.
```

---

## PASTE-BUG CHECKLIST (run before every commit)

1. **INDUSTRY_BADGE** — data object only, IndustryPill renders it
2. **Unused props** — `groupId` must be used (needed for the groupMeta fetch
   if royaltyPct comes via a new query) or explicitly voided
3. **groupName in h2** — "Network Intelligence · {groupName}" ✓
4. **Unused variables** — walk TIER_PALETTE, score constants, alert threshold
   constants, all formatters. Health score dimension weights especially —
   confirm all 5 are consumed in the score algorithm
5. **Chart Line name props** — N/A in S1 (no Recharts). If added in S2,
   enforce `<Line name={m.tenants?.name}>`

---

## BUILD SEQUENCE

```
Step 0   Schema check — 4 queries, confirm royalty_percentage exists
Step 1   Write fetchNetworkIntelligence.js
           · Phase 1: parallel calls to 3 existing helpers
           · Phase 2: health score computation per store
           · Phase 3: alert generation
           · Phase 4: royalty calculation
Step 2   Build NetworkIntelligence.js — Alert Centre + Section 1 (health scores)
Step 3   Add Section 2 (benchmarking table with sort)
Step 4   Add Section 3 (royalty calculator)
Step 5   Add CSV export
Step 6   Add data-quality footnote
Step 7   Wire GroupPortal.js (3 surgical edits + groupMeta prop if needed)
Step 8   CI=false npm run build — zero new warnings
Step 9   Paste-bug checklist — walk every new const before commit
Step 10  Single commit: feat(WP-A6/S1): NetworkIntelligence — health scores,
           alert centre, benchmarking, royalty calculator
```

---

## BROWSER VERIFICATION CHECKLIST

Test at `medican@nuai.dev / MediCan2026!` → `/group-portal?tab=network`

1. **Alert Centre:** Renders above Section 1. For the current Medi Can network,
   Medi Recreational has 9 critical restock items and 4 at-risk customers —
   both should generate alerts. Critical alerts appear above warnings.
   "Go to Stock Intelligence" link navigates correctly.

2. **Section 1 health scores:** Two store scorecards. Medi Can Dispensary
   should score higher than Medi Recreational (all stocked, good margin).
   Medi Recreational's score should be Watch or Critical (dead stock, restock
   risk, R0 revenue in April). Dimension bars coloured correctly by band.

3. **Section 2 benchmarking table:** 10 columns, both stores as rows, network
   average row pinned at bottom. Click column headers → sort updates correctly.
   Table scrolls horizontally if viewport is narrow.

4. **Section 3 royalty:** Renders even if royaltyPct = 0. "Set to 0%" note
   visible. "Go to Group Settings" button navigates correctly.

5. **CSV export:** Download, open in Excel. 2 data rows + header. Revenue and
   percentages as numbers (not strings). Health score as integer.

6. **Nav:** "Network Intelligence" tab visible after "Customer Intelligence"
   in the left sidebar.

---

## SESSION 2 ROADMAP (if needed — assess after S1 browser verify)

S1 scope is intentionally complete. If S2 is needed, candidates are:

- Health score trend over time (requires storing historical scores — new table)
- Royalty invoice generation (PDF export — new feature, significant scope)
- Alert notification via WhatsApp (`send-notification` EF v37 already exists)
- Network map visualisation (geographic store distribution — needs lat/lng data)

None of these should be built without a dedicated spec. The S1 component should
be self-contained and not leave any obvious missing sections that suggest S2
is required.

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **This module calls existing helpers** — do not rewrite their queries.
2. **Health score denominators adjust** for missing data — never inflate scores.
3. **Alert Centre is absent when healthy** — not an empty card.
4. **Royalty section renders at 0%** — with a "configure" note.
5. **groupMeta.royaltyPct** must come from GroupPortal — check if it's
   already in scope before adding a new fetch.
6. **`onNavigate` IS used** — Alert Centre uses it for "Go to {tab}" links.
   Do not void it.
7. **Table is wide** — `overflowX: auto` wrapper is mandatory.
8. **POPIA:** No customer PII in this component. Health scores and alert
   counts are aggregates only.
9. **S2 deferred sections** (trend, invoices, WhatsApp alerts, map) require
   their own spec before build.

---

*WP-ANALYTICS-6.md · NuAi Group Portal · Network Intelligence*
*Spec produced: 12 April 2026 · Claude.ai strategic spec session*
*This is the final module in the WP-ANALYTICS suite*
*When Module 6 ships, the complete analytics arc is done*
