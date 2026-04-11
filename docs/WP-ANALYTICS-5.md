# WP-ANALYTICS-5 — Customer & Loyalty Intelligence
## Status: IN PROGRESS — Session 1 HEAD `a5134aa` · Session 2 pending
## Produced: 12 April 2026 · Claude.ai strategic spec session
## Author: Claude.ai (spec) — implementation by Claude Code
## Companion modules: WP-ANALYTICS-3 (Revenue) · WP-ANALYTICS-4 (Stock)
## Session 1 shipped: 12 April 2026 · `a5134aa`
## Step 0 addendum: see bottom of file — the live schema differs materially
## from the pre-Step-0 body above, which is preserved as historical reference

---

## MODULE IDENTITY

**Component:** `src/components/group/CustomerIntelligence.js`
**Helper:** `src/components/group/_helpers/fetchStoreLoyalty.js`
**Nav label:** `Customer Intelligence`
**Nav ID:** `customers`
**Position in NAV_ITEMS:** after `stock` (currently position 6 — this becomes 7)
**Session 1 target:** ~1,100–1,300 lines (matching StockIntelligence S1 scope)

This module answers the question no single-store view can answer:
**How is the loyalty programme performing across the whole franchise network — and where are the churn signals?**

---

## WHY THIS MODULE EXISTS

HQLoyalty.js (4,537 lines) manages the loyalty programme at HQ level.
AdminQRCodes.js manages scans and redemptions at store level.
Neither surfaces cross-store cohort intelligence — who is churning, which tier
is underperforming, which store is converting members fastest.

The nightly loyalty-ai edge function is already firing churn rescue, birthday
bonus, stock boost, and point expiry actions. This module makes those actions
visible as network-level intelligence for the franchise owner.

---

## STEP 0 — SCHEMA CHECK (run before any code, every session)

Claude Code must run these checks and report all results before writing a line:

```sql
-- 1. Core customer table — confirm columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Expected minimum: id, tenant_id, email (or phone), created_at,
--                   total_points, tier_id (or tier_name), last_purchase_at
-- If table is named 'profiles' or 'loyalty_members' — note it, adjust helper

-- 2. Loyalty transactions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'loyalty_transactions'
ORDER BY ordinal_position;

-- Expected: id, tenant_id, customer_id, points, transaction_type
--           (earn/redeem/expire/adjust), source, created_at

-- 3. Loyalty tiers
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'loyalty_tiers'
ORDER BY ordinal_position;

-- Expected: id, tenant_id, name, min_points, multiplier, colour (or color)

-- 4. Loyalty campaigns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'loyalty_campaigns'
ORDER BY ordinal_position;

-- Expected: id, tenant_id, name, start_date, end_date, multiplier,
--           status (active/inactive/draft), points_issued (or computed)

-- 5. AI action logs (189 records referenced in PLATFORM-OVERVIEW)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_action_logs'
ORDER BY ordinal_position;

-- Expected: id, tenant_id, customer_id, action_type, result, created_at
-- action_type values from platform: churn_rescue, birthday_bonus,
--                                   stock_boost, point_expiry

-- 6. Orders — confirm customer linkage
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('customer_id','tenant_id','total','status','created_at');

-- 7. Scan logs — confirm loyalty linkage
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scan_logs'
  AND column_name IN ('customer_id','tenant_id','points_awarded','created_at');

-- 8. Live data snapshot (for expected-values table in spec)
SELECT
  tenant_id,
  COUNT(*) AS total_customers,
  COUNT(*) FILTER (WHERE last_purchase_at > NOW() - INTERVAL '30 days') AS active_30d,
  COUNT(*) FILTER (WHERE last_purchase_at BETWEEN NOW() - INTERVAL '60 days'
                                              AND NOW() - INTERVAL '30 days') AS at_risk,
  COUNT(*) FILTER (WHERE last_purchase_at < NOW() - INTERVAL '60 days'
                      OR last_purchase_at IS NULL) AS lapsed_or_dormant
FROM customers
GROUP BY tenant_id;
```

**If column names differ from expected:** Document the actual names in the Step 0
report and use the actual names throughout. Do not assume. Do not alias silently.

**If a table does not exist:** Stop, report to owner. Do not build a section
that queries a non-existent table. Mark that section as deferred in the build.

---

## DATA QUALITY EXPECTATIONS

Document these in the component's data-quality footnote (same pattern as
StockIntelligence.js footer note):

1. **last_purchase_at** — may be NULL for members who joined but never purchased.
   These are "dormant" members — show them separately, never as "active".
   Do not suppress: dormant count is a real business signal.

2. **total_points** — may be 0 or stale if a store's loyalty programme was
   configured after members joined. Show as-is. Note "0 points" honestly.

3. **tier_id / tier assignment** — cannabis_dispensary profile (SAHPRA) may
   run a different tier structure than cannabis_retail. Tier names should be
   read from loyalty_tiers table, not hardcoded.

4. **ai_action_logs** — 189 records across the network at time of spec.
   Medi Recreational may have more than Medi Can Dispensary given larger
   customer base (186 inventory items — proxy for customer volume).
   Show per-store breakdowns, not just network total.

5. **POPIA reminder** — this module renders aggregate counts and cohort
   distributions only. No individual customer names, emails, or phone numbers
   are displayed anywhere in the Group Portal view. Top Customers section
   (deferred to S2) uses initials + masked identifier only.

---

## HELPER SPEC — `fetchStoreLoyalty.js`

**Location:** `src/components/group/_helpers/fetchStoreLoyalty.js`
**Signature:** `fetchStoreLoyalty(tenantId, options = {})`

### Options object
```js
{
  monthStartISO,       // string — start of current month (MTD window)
  monthEndISO,         // string — end of current month
  lastMonthStartISO,   // string — start of prior month (MoM comparison)
  lastMonthEndISO,     // string — end of prior month
  includeAiLogs,       // bool — S2: fetch ai_action_logs breakdown
  includeCampaigns,    // bool — S2: fetch campaign ROI data
  // S2 options voided with eslint-disable comment, same pattern as
  // fetchStoreInventory.js options.includeVelocity
}
```

### Queries (S1 — two queries, executed in parallel via Promise.all)

**Query 1 — Customer cohort snapshot**
```sql
SELECT
  id,
  total_points,
  tier_id,
  created_at,
  last_purchase_at
FROM customers                        -- or actual table name from Step 0
WHERE tenant_id = :tenantId
  AND is_active = true                -- confirm column exists in Step 0
```
Client-side cohort derivation (never in SQL — avoids timezone edge cases):
- `isNew` — created_at within current month window
- `isActive` — last_purchase_at within last 30 days
- `isAtRisk` — last_purchase_at between 31–60 days ago
- `isLapsed` — last_purchase_at > 60 days ago
- `isDormant` — last_purchase_at IS NULL
- `daysSinceLastPurchase` — integer, Infinity if null

**Query 2 — Points economy for current month**
```sql
SELECT
  transaction_type,
  SUM(points) AS total_points,
  COUNT(*) AS transaction_count
FROM loyalty_transactions
WHERE tenant_id = :tenantId
  AND created_at >= :monthStartISO
  AND created_at <  :monthEndISO
GROUP BY transaction_type
```
Client-side: sum earn types for `pointsIssuedMTD`, sum redeem types for
`pointsRedeemedMTD`, compute `redemptionRate` = redeemed / issued (0 if issued = 0).

### Summary object returned
```js
{
  // Cohort counts
  totalMembers,          // int — all active customers
  newThisMonth,          // int — created_at in MTD window
  activeMembers,         // int — purchased in last 30 days
  atRiskMembers,         // int — 31–60 days no purchase
  lapsedMembers,         // int — 60+ days no purchase
  dormantMembers,        // int — never purchased

  // Tier distribution (array, one entry per tier)
  tierBreakdown: [
    { tierId, tierName, count, colour }
  ],

  // Points economy
  pointsIssuedMTD,       // int
  pointsRedeemedMTD,     // int
  redemptionRate,         // float 0–1

  // Raw arrays (needed for S2 extensions)
  customers: [],          // trimmed to {id, total_points, tier_id,
                          //             created_at, last_purchase_at}
  // Errors
  err: null              // string or null
}
```

### Contract
- Never throws. All errors returned in `result.err` with zeroed summary.
- Both queries run in `Promise.all` — one failure does not block the other.
  If Query 1 fails, cohort counts are zeroed. If Query 2 fails, points
  economy fields are zeroed. Each failure sets `result.err` with source tag.
- RLS is enforced at Supabase level — tenantId scoping in WHERE clause is a
  second defensive layer, not the primary security control.

---

## COMPONENT SPEC — `CustomerIntelligence.js`

### Page structure
```
<h2>Customer Intelligence · {groupName}</h2>

[Section 1] Network Customer Summary       — 4 KPI tiles
[Section 2] Loyalty Tier Distribution      — per-store tier breakdown
[Section 3] Cohort Health by Store         — new / active / at-risk / lapsed
[CSV Export button]                        — top-right of page, beside h2

[data-quality footnote]

--- DEFERRED TO S2 ---
[Section 4] Campaign ROI                   — campaign table, per store
[Section 5] AI Engine Activity             — churn rescues, birthday bonuses
[Section 6] Top Customers per store        — collapsible, POPIA-safe
```

---

## SECTION 1 — NETWORK CUSTOMER SUMMARY (4 KPI tiles)

Same 4-tile layout as StockIntelligence Section 1. Tiles share width equally.
Data: sum across all stores' `fetchStoreLoyalty` results.

| Tile | Value | Sub-label | Colour condition |
|---|---|---|---|
| Total Members | `Σ totalMembers` | per-store breakdown e.g. "Medi Can: 45 · Medi Rec: 312" | neutral |
| Active This Month | `Σ activeMembers` | "X% of network" (activeMembers / totalMembers) | T.successText if >60%, T.warningText if 30–60%, T.dangerText if <30% |
| At-Risk | `Σ atRiskMembers` | "31–60 days no purchase" | T.warningText when >0 |
| Points Economy | `Σ pointsRedeemedMTD` redeemed of `Σ pointsIssuedMTD` issued | Redemption rate as %. "X% redemption rate this month" | T.dangerText if <10% (points accumulating, not redeeming = disengaged) |

**Tile 1 sub-label** must list each store name + member count on separate lines
(same pattern as StockIntelligence Tile 2 sub-label for out-of-stock per store).
Truncate store names to 24 chars with ellipsis.

**Loading state:** tiles render with `—` values while fetch is in flight.
**Error state:** tile shows `Error` in T.dangerText with store name in sub-label.
Partial errors (one store failed, others resolved) still render the network total
from resolved stores, with a data-quality note: "X store excluded — data unavailable".

---

## SECTION 2 — LOYALTY TIER DISTRIBUTION BY STORE

**Purpose:** Shows how members are distributed across tiers per store.
Franchise owners use this to spot tier stagnation — a store where 90% of members
are on the base tier and nobody is progressing is a loyalty programme that isn't working.

**Layout:** Auto-fit grid, `minmax(280px, 1fr)`, same as StockIntelligence Section 2.
One card per store.

### StoreTierCard content
```
[Store name]  [IndustryPill]  [(you) marker on self-store]

Total: {totalMembers} members

[Tier bar — horizontal proportional segments]
Bronze  ████████████████  182  (64%)
Silver  ████████          63   (22%)
Gold    ████              38   (13%)
Platinum █                3    (1%)

↑ {upgradesThisMonth} tier upgrades this month
```

**Tier bar:** Each segment coloured from tier's `colour` column in loyalty_tiers.
If `colour` is null, fall back to:
`['#CD7F32', '#C0C0C0', '#FFD700', '#B9F2FF']` (bronze/silver/gold/platinum).
Never hardcode tier names — read from `tierBreakdown` array.

**Upgrade count:** requires knowing how many members moved up a tier this month.
This needs a query on `loyalty_transactions` WHERE `transaction_type = 'tier_upgrade'`
OR on a `tier_history` table if one exists. **Step 0 must check for this.**
If no upgrade tracking exists in the DB — render the tier distribution only,
omit the upgrade line entirely. Do not fake a zero or estimate.

**Empty state:** If `totalMembers === 0` — "No loyalty members yet · Programme
may not be active at this store" in T.textSecondary. Do not suppress.

**No sparkline in this section** — tier distribution is a snapshot, not a trend.
Trend data is in RevenueIntelligence. Do not duplicate.

---

## SECTION 3 — COHORT HEALTH BY STORE

**Purpose:** The most operationally urgent section. At-risk and lapsed cohorts
are revenue about to be permanently lost. The franchise owner needs to see this
per store so they can direct the nightly loyalty-ai engine's churn rescue
actions appropriately.

**Layout:** One collapsible section per store, same pattern as SlowMoversSection
in StockIntelligence. Collapsed header shows the key signal:

```
▶ Medi Recreational  —  38 at-risk · 91 lapsed  [Click to expand]
```

If no at-risk or lapsed members:
```
✓ Medi Can Dispensary  —  All 45 members active or new  [green]
```

### Expanded content — cohort breakdown table

| Cohort | Count | % of total | Definition shown on hover |
|---|---|---|---|
| New this month | `newThisMonth` | % | "First joined in the last 30 days" |
| Active | `activeMembers` | % | "Purchased in the last 30 days" |
| At-risk | `atRiskMembers` | % | "No purchase in 31–60 days" |
| Lapsed | `lapsedMembers` | % | "No purchase in 60+ days" |
| Dormant | `dormantMembers` | % | "Joined but never purchased" |

**Row colouring:**
- At-risk row: background `T.warningLight`
- Lapsed row: background `T.dangerLight`
- New row: background `T.successLight` (faint)
- Others: no tint

**Proportional cohort bar** below the table — single horizontal bar divided
into 5 coloured segments matching row colours. Width proportional to count.
Segments with count < 2% of total still render at 2% minimum width so they
are always visible.

**Churn insight line** (below bar, T.textSecondary, italic):
- If `atRiskMembers + lapsedMembers > totalMembers * 0.3`:
  `"⚠ {n}% of members show churn signals — consider loyalty-ai rescue campaign"`
- If `atRiskMembers + lapsedMembers === 0`:
  `"✓ No churn signals detected in this window"`
- If `dormantMembers > totalMembers * 0.2`:
  `"ℹ {n}% of members have never purchased — activation campaign opportunity"`

These are informational prompts, not AI-generated. Static logic from known thresholds.

---

## CSV EXPORT — CUSTOMER INTELLIGENCE SUMMARY

**Trigger:** Button top-right of page, beside h2, same position as RevenueIntelligence export.
**Label:** `Export CSV`
**Disabled when:** loading, all stores errored, or `loyaltyData` is null.
**Filename:** `customer-intelligence-{group-slug}-{YYYY-MM}.csv`

**Columns (8):**
```
Store | Total Members | New This Month | Active | At-Risk | Lapsed | Dormant | Redemption Rate %
```

**Values:** integers for counts, fixed-1 for redemption rate, blank string for null.
**Escaping:** same pattern as `downloadSSSGCsv` in RevenueIntelligence.js —
proper quote escaping, comma handling, UTF-8 BOM for Excel compatibility.

---

## DATA QUALITY FOOTNOTE

Render below all sections, same pattern as StockIntelligence.js footer note.
Use T.textTertiary, small font size.

```
Customer Intelligence data notes:
· Cohort windows use the store's local date (Africa/Johannesburg). Members near
  window boundaries may shift cohort on day-of.
· "Active" = at least one order linked to this loyalty member in the last 30 days.
  Walk-in sales not linked to a loyalty account are excluded.
· Points economy reflects loyalty_transactions only. Manual admin adjustments
  are included; POS-voided transactions depend on whether a reversal entry exists.
· Tier distribution is a live snapshot. Historical tier movement requires
  ai_action_logs or tier_history (see Session 2 roadmap).
· No individual customer data is displayed in the Group Portal. Aggregate counts only.
```

---

## GROUPPORTAL.JS WIRE-UP

Three surgical edits — read GroupPortal.js in full (LL-221) before touching:

1. Import: `import CustomerIntelligence from './CustomerIntelligence';`
2. NAV_ITEMS: `{ id: 'customers', label: 'Customer Intelligence' }` after `stock`
3. Tab router block: before the loyalty/deferred placeholder

```jsx
) : activeTab === 'customers' ? (
  <CustomerIntelligence
    members={members}
    groupId={groupId}
    groupName={groupName}
    onNavigate={setActiveTab}
  />
```

**Zero other changes to GroupPortal.js.** If any other line is touched, stop and explain why.

---

## SESSION 2 ROADMAP (deferred — do not build in S1)

### Section 4 — Campaign ROI table
One table per store showing active and recently-ended campaigns:
```
Campaign Name | Start | End | Status | Members Reached | Points Issued | Revenue Lift vs Baseline
```
Revenue lift requires orders data joined to campaigns by date range.
Baseline = average daily revenue in the 30 days before campaign start.
`includeCampaigns: true` option on fetchStoreLoyalty.

### Section 5 — AI Engine Activity
Summary of what the nightly loyalty-ai edge function has fired across the network:
```
Action Type     | Count This Month | Per-Store breakdown
Churn rescue    | 23               | Medi Rec: 21 · Medi Can: 2
Birthday bonus  | 8                | ...
Stock boost     | 14               | ...
Point expiry    | 47               | ...
```
Source: `ai_action_logs` table (189 records at spec time).
`includeAiLogs: true` option on fetchStoreLoyalty.

### Section 6 — Top Customers per store (POPIA-safe)
Collapsible per-store table, same pattern as SlowMoversSection.
Columns: Rank | Initials (first letter first name + first letter surname) |
Masked ID (last 4 chars of customer UUID only) | Tier | Points Balance |
Purchases MTD | Revenue MTD.

**No email, no phone, no full name ever rendered in Group Portal.**
Implementation must include a POPIA compliance comment block at the top of the
render function explaining what is and is not displayed and why.

---

## PASTE-BUG CHECKLIST (run before every commit)

Same 5 checks as all prior modules:

1. **INDUSTRY_BADGE** — only via `IndustryPill`. No badge data objects used as React components.
2. **Unused props** — `groupId` and `onNavigate` must both be used OR voided with `void groupId;`.
   `onNavigate` IS used — the cohort card's "View transfers →" equivalent should route to
   the relevant tab. If no navigation action is implemented in S1, void it.
3. **groupName in h2** — `Customer Intelligence · {groupName}` — verify present.
4. **Unused variables** — walk every `const` after build. Common risk: computed
   date strings used in fetch but not rendered (same pattern as the 5 paste-bugs
   caught in WP-ANALYTICS-3 S2). `todayStr`, intermediate date computations —
   all must be either rendered or explicitly voided.
5. **Chart Line name props** — no Recharts in S1. N/A. If added in S2, enforce
   `<Line name={m.tenants?.name}>` — never UUID.

---

## BUILD SEQUENCE

```
Step 0  Confirm schema — all 8 queries above, report results
Step 1  Write fetchStoreLoyalty.js (S1 queries + client-side cohort derivation)
Step 2  Build CustomerIntelligence.js — Section 1 (KPI tiles) only
Step 3  Add Section 2 (tier distribution cards)
Step 4  Add Section 3 (cohort health collapsible sections)
Step 5  Add CSV export helper + button
Step 6  Add data-quality footnote
Step 7  Wire GroupPortal.js (3 surgical edits)
Step 8  CI=false npm run build — zero new warnings
Step 9  Paste-bug checklist — walk every new const before commit
Step 10 Single commit: feat: WP-ANALYTICS-5 S1 CustomerIntelligence live
```

---

## BROWSER VERIFICATION CHECKLIST

Test at `medican@nuai.dev / MediCan2026!` → `/group-portal?tab=customers`

1. **Section 1:** 4 KPI tiles render with real data. At-risk tile non-zero
   if Medi Recreational has lapsed members. Redemption rate tile shows a
   percentage, not NaN or 0% (unless programme genuinely has no redemptions).

2. **Section 2:** Two store cards with tier bars. Tier colours match what's
   configured in loyalty_tiers table (not hardcoded bronze/silver/gold).
   "(you)" marker appears on the self-store card.

3. **Section 3:** Medi Recreational expanded by default if it has at-risk/lapsed
   members. Cohort bar visible. Churn insight line renders if threshold met.

4. **CSV:** Download produces 2 data rows + header. Open in Excel — values
   match what's shown on screen. No corrupted characters.

5. **GroupPortal nav:** "Customer Intelligence" tab visible after "Stock Intelligence".
   Clicking it routes correctly. No console errors.

6. **POPIA check:** No full customer names, emails, or phone numbers visible
   anywhere in the view. Open browser devtools network tab — confirm no
   query returns full PII columns (email, phone) in the response payload.

---

## SESSION CLOSE (when S1 ships)

When `CI=false npm run build` is clean and browser verification passes:

1. Update `WP-ANALYTICS.md` — Module 5: "SPEC COMPLETE" → "IN PROGRESS — Session 1 HEAD [hash]"
2. Update this file header: `Status: IN PROGRESS — Session 1 HEAD [hash] · [date]`
3. Append to SESSION-STATE: S1 shipped, schema check results, any Step 0 surprises
4. Write `NEXT-SESSION-PROMPT_v246.md` with Priority 1 = WP-ANALYTICS-5 S2
5. Single commit: `feat: WP-ANALYTICS-5 S1 CustomerIntelligence + session close docs`

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **POPIA is non-negotiable** — aggregate counts only in Group Portal. No PII.
2. **Tier names come from the DB** — never hardcode Bronze/Silver/Gold/Platinum.
3. **Dormant members are a signal** — never suppress zero-purchase members from counts.
4. **ai_action_logs already exists** — 189 records at spec time. S2 Section 5 reads it.
5. **fetchStoreLoyalty S2 options** are voided in S1 — `includeAiLogs` and
   `includeCampaigns` are in the signature for stability but not implemented.
6. **Redemption rate < 10%** is a danger signal — points are piling up unused.
   This often means customers forgot they have points, not that they're disengaged.
   The footnote should reflect this nuance.
7. **The loyalty-ai edge function fires nightly** — ai_action_logs will grow.
   S2 Section 5 should show "this month" not "all time".

---

*WP-ANALYTICS-5.md · NuAi Group Portal · Customer & Loyalty Intelligence*
*Spec produced: 12 April 2026 · Claude.ai strategic session*
*Implementation: Claude Code — S1 shipped `a5134aa`, S2 pending*

---

# STEP 0 ADDENDUM — SCHEMA DIVERGENCE (12 April 2026)
## Appended at Session 1 close. Overrides the pre-Step-0 body above.

The spec body above refers to tables and columns that do not exist in
the live schema. Claude Code ran the 8 Step 0 queries via Supabase MCP
against the production database (`uvicrqapgzcdvozxrreo`) before writing
a single line of code and documented every divergence. This addendum
is the truth Session 2 must build against. The body above is preserved
for historical context — do not act on it.

## Table name divergences

| Spec name | Actual table | Notes |
|---|---|---|
| `customers` | `user_profiles` | Global, tenant-scoped via `tenant_id` |
| `loyalty_tiers` | **does not exist** | Tiers are inline text; thresholds/multipliers in `loyalty_config` |
| `loyalty_campaigns` | **does not exist** | **Section 4 permanently deferred** until schema owner adds a table |
| `ai_action_logs` | `loyalty_ai_log` | Different column shape — see below |
| `loyalty_transactions` | exists ✓ | `user_id` (not `customer_id`), mixed-case `transaction_type` |
| `scan_logs` | exists ✓ | **No `tenant_id` column** — uses `user_id` + `scanned_at` |
| `patients` | exists ✓ | SAHPRA table, **zero loyalty columns** — not a loyalty surface |

## Column facts verified live

### `user_profiles` — the actual customer table

Projection POPIA-safe subset (the only columns Session 1's
`fetchStoreLoyalty` is permitted to SELECT):

```
id, tenant_id, loyalty_points, loyalty_tier, created_at,
last_purchase_at, is_suspended, churn_risk_score
```

Additional columns that exist on the table but **must never be
SELECTed from the Group Portal** (PII — POPIA non-negotiable):

```
email, phone, full_name, date_of_birth, id_number (via patients FK),
street_address, suburb, postal_code, province, city, gender,
preferred_type, acquisition_channel, referral_code, referred_by
```

**No `is_active` column exists.** Active-customer predicate is
`is_suspended IS NOT TRUE`. Suspended users are excluded from all
cohort counts because a suspended account is an enforcement action,
not a churn signal.

### `loyalty_transactions` — sign-based classification

Live values for `transaction_type` (both legacy uppercase and new
lowercase exist side by side):

| Value | Medi Rec count at spec time |
|---|---|
| `earn_purchase` | 124 |
| `PURCHASE` (legacy) | 86 |
| `EARNED` (legacy) | 30 |
| `BONUS` (legacy) | 18 |
| `REDEEMED` (legacy) | 1 |

Authoritative classifier is the **sign of `points`**, not the
string: positive = earn, negative = redeem. The type string is
only consulted when `points = 0` (rare no-op edge cases).

### `loyalty_config` — tier architecture

No per-row tier table. Instead `loyalty_config` has fixed per-tier
columns baked into the schema:

```
mult_bronze, mult_silver, mult_gold, mult_platinum,
mult_tier_harvest_club,
threshold_silver, threshold_gold, threshold_platinum,
threshold_harvest_club
```

**Fixed 5-tier enum:** `bronze`, `silver`, `gold`, `platinum`,
`harvest_club`. There is **no `colour` column anywhere** — the
spec instruction "tier colours come from the DB, never hardcode"
is not achievable. The implemented workaround is a hardcoded
`TIER_PALETTE` in `CustomerIntelligence.js` with a rationale
comment citing Step 0.

### `loyalty_ai_log` — actual shape

```
id, tenant_id, action_type, target_user_id, target_item_id,
payload (jsonb), outcome, created_at, actioned_at
```

Note `target_user_id` (not `customer_id`). Live `action_type`
values across the whole network at Step 0 time:

| Action type | Count |
|---|---|
| `stock_boost_suggestion` | 181 |
| `birthday_bonus` | 5 |
| `churn_rescue` | 4 |
| `point_expiry` | 0 (spec expected, not present) |

The spec's `stock_boost` is actually `stock_boost_suggestion`.
Session 2 Section 5 must use the correct value.

### `orders` — customer linkage column name

`orders.user_id` (not `customer_id`). Not used by Session 1 but
relevant for any future customer-to-revenue join in Session 2.

### `scan_logs` — missing tenant_id

`scan_logs` has no `tenant_id` column. Tenant scoping would require
joining through `user_profiles.tenant_id`. Not used by Session 1.
Also: column is `scanned_at`, not `created_at`.

## Section 4 Campaign ROI — permanently deferred

There is no `loyalty_campaigns` table in the live schema. Section 4
is not just "deferred to Session 2" — it is **permanently blocked**
until a schema owner designs and creates the campaigns table. The
`includeCampaigns` option on `fetchStoreLoyalty` is kept on the
signature for stability but is a no-op in both S1 and S2. The
component's data-quality footnote states this explicitly so the
visible roadmap matches reality.

Session 2 scope is therefore:
- Section 5: AI Engine Activity (`loyalty_ai_log`, action type
  `stock_boost_suggestion` not `stock_boost`)
- Section 6: Top Customers per store (POPIA-safe initials + masked
  UUID suffix only)

## Live cohort snapshot at Step 0 (reference values)

| Tenant | Total | New 30d | Active | At-risk | Lapsed | Dormant |
|---|---|---|---|---|---|---|
| Medi Can Dispensary | 1 | 1 | 0 | 0 | 0 | 1 |
| Medi Recreational | 50 | 50 | 45 | 4 | 0 | 1 |
| **Network** | **51** | **51** | **45** | **4** | **0** | **2** |

Tier distribution at Step 0:

| Tenant | bronze | silver | gold | platinum | harvest_club |
|---|---|---|---|---|---|
| Medi Can Dispensary | 1 | – | – | – | – |
| Medi Recreational | 21 | 14 | 7 | 8 | 1 |

Medi Recreational shows 50 of 50 members created in the last 30 days
— it is a seeded snapshot, which is a deliberate business choice
for test data. The cohort derivation still works correctly;
`isNew` and `isActive` are orthogonal and a member can be both.

## Owner's explicit S1 decisions (locked and shipped)

1. **Hardcode TIER_PALETTE with 5 values** including `harvest_club`,
   with a rationale comment citing Step 0.
2. **Section 4** is deferred text in the footer notes — "loyalty_campaigns
   table does not exist in the current schema".
3. **Active predicate** is `is_suspended IS NOT TRUE`.
4. **Additional:** SELECT `churn_risk_score` in the cohort query
   and surface the high-churn-risk member count on the At-risk row
   in Section 3 — it is already computed by the nightly AI engine,
   is not PII, and is a meaningful operational signal.

---

*Step 0 addendum written 12 April 2026 at Session 1 close*
*HEAD at addendum write: `a5134aa`*
*Session 2 starts from this addendum, not the spec body above*
