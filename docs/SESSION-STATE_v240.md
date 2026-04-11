# SESSION-STATE v240 — Consolidated Snapshot
## NuAi Multi-Tenant SaaS ERP
## Opened: 12 April 2026 · HEAD at open: `3ec1d32`
## Supersedes: SESSION-STATE_v239.md (frozen at Addendum 7, kept as historical reference)

---

## WHAT THIS DOCUMENT IS

This is a **clean consolidated state snapshot** — not a cumulative addendum log.
SESSION-STATE_v239.md grew to 1,788 lines across 7 addendums covering
9-12 April 2026. Future agents don't need the play-by-play narrative to do
their work. They need a focused, current picture: what's live, what's
pending, which rules apply, where the helpers live, and what the schema
looks like today.

v239 is frozen as the historical record. Every commit hash, every
architectural decision, every debugging narrative from 9-12 April 2026
lives there. Read it if you want the story of how we got here. Read
**this file** to know where "here" is.

**Rule going forward:** v240 gets addendums as new sessions close,
following the same pattern as v239. When v240 crosses ~5 addendums or
~2,000 lines, open v241 as a fresh snapshot and archive v240.

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with a seven-portal architecture,
a fully functional franchise network layer, and an AVCO-correct,
profile-adaptive analytics suite (WP-ANALYTICS) shipping modules across
multiple sessions against the live Medi Can Franchise Network.

---

## CURRENT HEAD + KEY FACTS

| | |
|---|---|
| **HEAD** | `3ec1d32` (WP-A4/S1 StockIntelligence live) |
| **Branch** | `main`, up to date with `origin/main` |
| **Environment** | Production Supabase (project `uvicrqapgzcdvozxrreo`), React 18 + Vercel |
| **Test credentials** | `medican@nuai.dev` / `MediCan2026!` → `/group-portal` |
| **CLAUDE.md** | v2.0 slim+delegate, canonical orientation file |
| **Build command** | `CI=false npm run build` — zero new warnings is the standard |

---

## STACK

- React 18 · Supabase (PostgreSQL + RLS + Edge Functions) · Vercel
- Repo: `github.com/GFive5y/protea-botanicals` · branch `main`
- Supabase project: `uvicrqapgzcdvozxrreo` (eu-west-1)
- Recharts ^3.8.0 — charting, used in 28+ files
- Shell: bash/PowerShell hybrid — PowerShell rules documented in CLAUDE.md

---

## THE SEVEN PORTALS

| Path | Name | Scope |
|---|---|---|
| `/hq` | HQ Command Centre | 41-tab cross-tenant operator |
| `/tenant-portal` | Tenant Portal | Business owner, industry-adaptive waterfall nav |
| `/admin` | Admin Portal | Store manager, 13-tab operations |
| `/hr` | HR Suite | 13 modules (BCEA, payroll, timesheets) |
| `/shop` | Consumer Storefront | E-commerce + loyalty + PayFast |
| `/staff` | Staff Self-Service | 4 tabs |
| `/group-portal` | Group Portal | Franchise / network owner — cross-store analytics + operations |

---

## GROUP PORTAL — CURRENT STATE (7 of 7 non-deferred tabs live)

| Tab | Component | Helper(s) | Status |
|---|---|---|---|
| Network Dashboard | `NetworkDashboard.js` | `fetchStoreSummary` | ✅ Live |
| Stock Transfers | `GroupTransfer.js` | — | ✅ Live (AVCO-correct, LL-242) |
| Compare Stores | `StoreComparison.js` | `fetchStoreSummary` (extended), `industryBadge` | ✅ Live |
| Combined P&L | `CombinedPL.js` | `fetchStoreFinancials` | ✅ Live |
| Revenue Intelligence | `RevenueIntelligence.js` | `fetchStoreTrend`, `fetchStoreSummary` (topProducts) | ✅ Live (S1 + S2 complete) |
| Stock Intelligence | `StockIntelligence.js` | `fetchStoreInventory` | ✅ Live (S1 — S2 pending) |
| Shared Loyalty | disabled nav entry | — | Phase 2+ deferred (original scope decision) |
| Group Settings | `GroupSettings.js` | — | ✅ Live |

**The original WP-TENANT-GROUPS spec is functionally complete.** Every
non-deferred tab renders real data. Shared Loyalty remains disabled per
the original Path A scope decision (requires `loyalty_group_id` schema
addition not yet in scope).

---

## MEDI CAN FRANCHISE NETWORK — LIVE STATE

| Tenant ID | Name | Role | Industry Profile |
|---|---|---|---|
| `2bd41eb7-1a6e-416c-905b-1358f6499d8d` | Medi Can Dispensary | franchisor | `cannabis_dispensary` |
| `b1bad266-ceb4-4558-bbc3-22cfeeeafe74` | Medi Recreational | franchisee | `cannabis_retail` |

First production cross-store dataset. All cross-tenant analytics modules
verified in the browser against this network.

**Inventory snapshot (live 12 Apr 2026):**

| Store | Items | With AVCO | Out | Low | Slow | Needs Reorder |
|---|---|---|---|---|---|---|
| Medi Can Dispensary | 8 | 8 | 0 | 0 | 0 | 0 |
| Medi Recreational | 186 | 14 | 1 | 6 | 10 | 0 |

**Known AVCO gap on Medi Recreational:** only 14 of 186 items have
`weighted_avg_cost > 0`. Simulator-seeded items never went through the
Receiving workflow so their AVCO was never populated. Stock value totals
for this store are materially understated. The UI surfaces this
prominently via "N items with no AVCO set" disclosure on tiles and cards.
Do NOT suppress or fake AVCO values — honest data is correct output.

**Trading volume (90d window):**

- Medi Recreational: 468 orders across 32 distinct dates
- Medi Can Dispensary: 14 events across 10 distinct dates (simulator-sparse, renders honestly)

---

## WP-ANALYTICS SUITE STATE

| Module | Name | Sessions | Status |
|---|---|---|---|
| 1 | Store Comparison | 1 | ✅ COMPLETE — HEAD `8221177` |
| 2 | Combined P&L | 1 | ✅ COMPLETE — HEAD `5ba63b5` |
| 3 | Revenue Intelligence | 2 | ✅ COMPLETE — HEAD `6ea2493` (S1: `5352d96` · S2: `6ea2493`) |
| 4 | Stock Intelligence | 2 | ⚙️ IN PROGRESS — S1 HEAD `3ec1d32` · S2 pending |
| 5 | Customer & Loyalty Intelligence | ~1 | SPEC COMPLETE — ready for Session 1 · e237fdd |
| 6 | NuAi Network Intelligence | ~2 | Pending — no detailed spec yet |

Per-module detailed specs live in `docs/WP-ANALYTICS-N.md`. The master
suite vision is `docs/WP-ANALYTICS.md` — read that before proposing any
change to any module.

---

## `_helpers/` DIRECTORY — SHARED DATA LAYER

Location: `src/components/group/_helpers/`

| File | Purpose | Consumers |
|---|---|---|
| `fetchStoreSummary.js` | MTD per-store summary (revenue, margin, AOV, stock health) with opt-in extended mode for topProducts + last-month revenue | NetworkDashboard · StoreComparison · RevenueIntelligence (S2) |
| `industryBadge.js` | `INDUSTRY_BADGE` map: profile → `{bg, fg, label}` data object (NOT a React component) | All group analytics components |
| `fetchStoreFinancials.js` | P&L for a date range (revenue, COGS, gross profit, OPEX, net profit) with profile-branched COGS paths | CombinedPL |
| `fetchStoreTrend.js` | Timestamped revenue rows + bucketing helpers (`toDailyBuckets`, `buildNetworkDailyAxis`, `calcSSSGMoM`, `calcSSSGWoW`, `projectMonthEnd`) | RevenueIntelligence |
| `fetchStoreInventory.js` | Inventory snapshot with derived health flags (slow-mover / dead-stock / low / out / overstock) via `last_movement_at` | StockIntelligence |

**Design pattern:** each helper is a named async function that never
throws. Errors land in `result.err` with partial results kept so callers
can render per-store graceful degradation via `Promise.all`. Options
parameters (e.g. `includeExtended`, `includeVelocity`) gate opt-in
extended queries — default behaviour is always the cheapest core query
so landing pages stay fast.

---

## SHARED VISUALISATION LAYER

Location: `src/components/viz/`

Named exports from `src/components/viz/index.js`:
`Icon`, `SparkLine`, `DeltaBadge`, `ChartCard`, `ChartTooltip`,
`InlineProgressBar`, `BulletChart`, `PipelineStages`

**Critical prop corrections** (from the Revenue Intelligence build —
apply to all future components):

1. `DeltaBadge` prop is `value`, not `delta`. Passing `delta` triggers
   the undefined guard and silently renders nothing.
2. `InlineProgressBar` has no `colour` or `width` props. Colour comes
   from `dangerAt` / `warnAt` thresholds (defaults 20 / 40 — override
   to match your domain, e.g. 40 / 55 for margin bands). Width
   constrains via a parent wrapper `<div style={{width: 80}}>`.
3. `ChartTooltip` formatter returns a plain string, not a `[val, name]`
   array. Recharts passes the array convention but ChartTooltip
   renders the return as-is. For series labels, set them via
   `<Line name={store.name}>` and the tooltip reads `entry.name`.

---

## DESIGN SYSTEM (WP-DS-6)

All new components: `import { T } from "../../styles/tokens"`.

**Mandatory tokens:**
- Layout: `T.container.{narrow|default|wide|full}` · `T.page.{sectionGap|cardGap|gutterX|gutterY}`
- Spacing: `T.gap.{xs|sm|md|lg|xl|xxl}` · `T.pad.{xs|sm|md|lg|xl|xxl}` · `T.inset.{card|modal|section|page|tight}`
- Colour: full semantic family × `Light`/`Text`/`Mid`/`Border` variants
- Type: `T.text.{xs..4xl}` · `T.weight.{normal|medium|semibold|bold}`

**LL-238:** Zero hardcoded px matching any token. Zero local `const T = {...}`
redefinitions (HQOverview still has one — it's a WP-DS-2 backlog item,
not a pattern to copy).

**Text-tier vs surface-tier rule:** Semantic colours have two tiers.
`T.successLight` is a surface background; `T.successText` is for text on
that surface. `T.success` (mid tier) is for bright elements like chart
bars or progress-bar fills. Never render body text on `T.success` (mid) —
contrast fails.

---

## CANONICAL RULES (the LLs that apply to every session)

| Rule | Summary |
|---|---|
| **RULE 0Q** | Claude.ai NEVER calls `push_files` or `create_or_update_file`. All repo writes via Claude Code only. Non-negotiable. |
| **RULE 0F** | Every INSERT must include `tenant_id`. |
| **RULE 0H** | Fix the code, never the data. |
| **LL-203** | COGS from `order_items.product_metadata.weighted_avg_cost` — the per-transaction AVCO pattern. |
| **LL-206** | `const { tenantId, industryProfile } = useTenant()` — direct destructure form is canonical. Old `const { tenant } = useTenant()` still works but is deprecated. |
| **LL-221** | Read the actual source file before any edit. Disk is truth. "Grep imports, not identifiers" corollary: don't false-positive on local variable definitions. |
| **LL-226** | `dispensing_log.is_voided != true` on every dispensing query. Schedule 6 records — void only, never hard-delete. |
| **LL-227** | Medi Can Dispensary (`2bd41eb7-1a6e-416c-905b-1358f6499d8d`) is seeded. DO NOT RE-SEED. |
| **LL-231** | Dispensary revenue = `dispensing_log.quantity_dispensed × inventory_items.sell_price`. Never `orders` for dispensary. Always branch on `industry_profile`. |
| **LL-238** | All new features use `T.container.*` / `T.gap.*` / `T.pad.*` / etc. tokens. Never hardcode px matching a token value. |
| **LL-242** | AVCO recalculation on transfer receive. Fixed forward in HQTransfer (`713ef3a`) and built correctly in GroupTransfer from Phase 4 onward. Historical data corrupted by pre-fix receives is NOT retroactively remediated — dedicated session pending. |
| **LL-243** | GroupSettings email-invite gap. Current add-a-store UX is paste-tenant-id-UUID only. Owner-gated. Email-based invite is a deliberately scoped future build (Phase 5b). |

---

## PASTE-BUG CHECKLIST

Apply this to every Claude.ai-generated component before commit.
Session Addendum 7 documented five canonical patterns after the
Revenue Intelligence S1 build caught them at pre-commit:

1. **`INDUSTRY_BADGE` is a data object `{bg, fg, label}`, NOT a React
   component.** Use an `IndustryPill` helper or inline styled span.
   Never `<BadgeComp />` — it would throw
   `React.createElement: type is invalid` at runtime.
2. **Unused props.** Add `void propName;` for any destructured prop
   not referenced in the body. Common offenders: `groupId`,
   `onNavigate` when the component doesn't navigate.
3. **`groupName` in header.** Every Group Portal component shows
   `· {groupName}` in its title. Missing = consistency bug.
4. **Unused variables.** Check every `const` for actual usage.
   StockIntelligence S1 caught an unused `fmtRShort` helper at
   pre-commit build — removed before landing. The build checker is
   working; trust it.
5. **Chart `Line` name props.** Always `<Line name={m.tenants?.name}>`.
   Never `<Line name={m.tenant_id}>` — UUIDs leak into the tooltip
   label because `ChartTooltip` renders `entry.name` verbatim.

---

## SCHEMA FACTS (verified canonical)

**Revenue sources:**
- Retail: `orders.total` (VAT-inclusive) · `status = "paid"` filter · VAT_RATE = 1.15 for ex-VAT
- Dispensary: `dispensing_log.quantity_dispensed × inventory_items.sell_price` · `is_voided != true` · NOT VAT-divided (Schedule 6)

**COGS sources:**
- Retail: `order_items.product_metadata.weighted_avg_cost` (LL-203 JSONB key, per-transaction AVCO)
- Dispensary: `inventory_items.weighted_avg_cost` via dispensing_log join (current AVCO, not snapshot-at-time-of-dispense)

**Inventory / stock health:**
- `inventory_items.reorder_level` (not `reorder_point`)
- `inventory_items.reorder_qty`, `max_stock_level`, `needs_reorder`, `last_movement_at`
- `last_movement_at` is trigger-maintained → slow-mover detection is O(1) per item, no stock_movements aggregation needed
- `stock_movements.movement_type`: `sale_pos` + `sale_out` are the sales types; plus `purchase_in`, `adjustment`, `production_in`, `production_out`

**Expenses:**
- `expenses.expense_date` is type `date` (not timestamptz) — filter with `.slice(0, 10)` on ISO strings
- OPEX bucket categories: `opex`, `wages`, `tax`, `other`
- `capex` excluded from P&L (memo only)

**Tenant groups:**
- `tenant_groups`: id, name, group_type, owner_tenant_id, created_by, created_at, royalty_percentage (numeric(5,2), added Phase 5)
- `tenant_group_members`: tenant_id, group_id, role, joined_at
- `role` values: `franchisor`, `franchisee`, `owner`

**RLS helper function:** `user_tenant_id()` — NOT `get_my_tenant_id()` (does not exist).

---

## KNOWN ISSUES (carried forward)

1. **HQTransfer historical AVCO corruption** — LL-242 forward-fix landed
   at `713ef3a`. Pre-fix destination AVCO values not retroactively
   corrected. Dedicated remediation session pending: read-only audit
   query first, walk `stock_movements` where `type = 'transfer_in'`,
   recompute per affected destination row, write back. Owner approval
   required before any UPDATE.
2. **Per-line atomicity gap** on ship/receive/cancel in both HQTransfer
   and GroupTransfer. Per-line loops with no transaction wrapper.
   Partial failures possible. LL-242 open.
3. **GroupSettings email-invite gap** — LL-243 open. Deliberately
   scoped out of Phase 5. Current UX requires pasting a tenant_id UUID
   directly. Email-based invite is Phase 5b.
4. **Cross-tenant "View store →" navigation** — placeholders in
   NetworkDashboard, StoreComparison, StockIntelligence store cards.
   Currently `console.log` or wired to the same-tab transfers nav.
   Phase 4b: requires authorisation check + `switchTenant()` +
   return path to `/group-portal`.
5. **Transfer pre-selection from StoreComparison / StockIntelligence** —
   the "Transfer stock →" buttons navigate to the transfers tab without
   pre-populating the FROM/TO store. Phase 4b: state passing through
   GroupPortal into GroupTransfer initial form state.
6. **Medi Recreational AVCO gap** — 172 of 186 items have no AVCO.
   Simulator-seeded data that never went through receiving. Surfaced
   honestly in the UI via "N items with no AVCO set" disclosure. Real
   receiving workflow will populate via DB trigger. NOT a code bug.
7. **Sender email not on brand domain** — pending owner external
   action (CIPRO registration + `nuai.co.za` purchase + Resend DNS).
8. **`docs/.claude/worktrees/` disk cleanup** — untracked artefacts,
   need `rm -rf` directly on disk. Never commit. Still deferred.

---

## ANALYTICS SUITE SESSION CLOSE PROTOCOL (NON-NEGOTIABLE)

When closing any session that touches the WP-ANALYTICS suite:

1. Update `docs/WP-ANALYTICS.md` — affected module status line + table row
2. Update `docs/WP-ANALYTICS-N.md` header for the affected module
3. Write the NEXT module's detailed spec doc before closing if it's
   not already written (Claude.ai drafts it, Claude Code commits it)
4. Append addendum to the current SESSION-STATE_vN.md (or open a
   fresh v(N+1) if the file is getting unwieldy)
5. Write `NEXT-SESSION-PROMPT_v(N+1).md` · delete previous
6. Single commit: `docs: WP-ANALYTICS-[N] ... + NEXT-SESSION-PROMPT v[next]`

This protocol exists because analytics modules have compounding
strategic context (the suite vision, the UX principles, the
competitive framing) that can't be reconstructed from code alone.
**The docs ARE the strategic memory.**

---

## HISTORICAL REFERENCE

The full session-by-session narrative from 9-12 April 2026 lives in
`docs/SESSION-STATE_v239.md` across Addendums 1 through 7:

- **Addendum 1-2** (9-10 April) — ActionCentre rollout, orphan audit, WP-DESIGN-SYSTEM launch, WP-DS-1/2 execution
- **Addendum 3** (11 April) — WP-DS-6 layout tokens, WP-TENANT-GROUPS spec + Phase 1 schema + Phase 2 portal + Phase 3 NetworkDashboard
- **Addendum 4** (11 April extended) — CLAUDE.md v2.0 slim+delegate rewrite, PLATFORM-OVERVIEW update, WP-TENANT-GROUPS Phase 4 GroupTransfer with LL-242 preventative AVCO fix
- **Addendum 5** (12 April) — GroupSettings Phase 5, HQTransfer LL-242 remedial fix, WP-ANALYTICS suite launch, WP-ANALYTICS-1 StoreComparison
- **Addendum 6** (12 April) — WP-ANALYTICS-2 Combined P&L
- **Addendum 7** (12 April) — WP-ANALYTICS-3 Session 1 RevenueIntelligence, five paste-bugs documented as canonical checklist

v239 is frozen. Do not append to it. Do not trust any SESSION-STATE
earlier than v239 — pre-v239 context was cleared deliberately because
accumulated state had become unreliable.

---

## KEY FACTS FOR THE NEXT AGENT (TL;DR)

1. **HEAD is `3ec1d32`.** Confirm with `git log --oneline -1`.
2. **6 of 6 non-deferred Group Portal content tabs are live** plus Settings. Only Shared Loyalty is deferred.
3. **WP-ANALYTICS: 3 modules complete** (1, 2, 3), **1 in progress** (4 — S2 pending), **2 pending** (5, 6 — specs to be written before build).
4. **5 helpers in `_helpers/`** — `fetchStoreSummary`, `industryBadge`, `fetchStoreFinancials`, `fetchStoreTrend`, `fetchStoreInventory`. Every future analytics surface adds a sibling here.
5. **Paste-bug checklist is load-bearing** — walk all 5 patterns before every commit. The build checker catches #4 (unused vars); the other 4 need human review.
6. **`last_movement_at` efficiency win** — slow-mover detection is O(1) via this column, no stock_movements aggregation for Session 1 stock intelligence.
7. **Medi Recreational `avcoMissing = 172`** — surface honestly in UI, do not suppress.
8. **LL-242 fixed forward** in HQTransfer (`713ef3a`) and GroupTransfer (from Phase 4). Historical corruption remediation is a dedicated future session.
9. **CLAUDE.md v2.0 is canonical.** Version-free, delegates state to this file and NEXT-SESSION-PROMPT_v(current).md. Don't trust any older CLAUDE.md in context.
10. **RULE 0Q absolute** — Claude.ai never writes to the repo. Claude Code only.

---

*SESSION-STATE_v240.md v1.0 · 12 April 2026*
*HEAD at snapshot: `3ec1d32` · Consolidated from v239 Addendums 1-7 plus WP-A3/S2 + WP-A4/S1*
*Next addendum (Addendum 1 of v240) on the next session close*

---

# ADDENDUM 1 — 12 April 2026: WP-ANALYTICS-4 Session 2 complete

## HEAD AT CLOSE: `e55961f`

## COMMIT CHAIN (Addendum 1 of v240)

```
fa207c7 (v240 baseline)
  → e237fdd  docs: WP-ANALYTICS-5 spec committed (Claude.ai strategic session)
  → c724432  docs: WP-ANALYTICS-5 spec status — SPEC COMPLETE, gate lifted
  → 01f0111  docs: WP-ANALYTICS-4 S2 gap closure addendum — locked decisions before build
  → e55961f  feat(WP-A4/S2): StockIntelligence velocity, transfer opportunities, dead stock breakdown
```

Five commits. Two spec commits for Module 5 (arrival + gate-lift), one
S2 gap-closure addendum commit on Module 4, and one feature commit
shipping Module 4 Session 2 in full.

## WHAT SHIPPED

### Module 5 spec landed and gated (commits `e237fdd` + `c724432`)

WP-ANALYTICS-5 Customer & Loyalty Intelligence detailed spec committed
from the Claude.ai strategic spec session. 570 lines covering:
network cohort analytics, loyalty tier distribution per store, cohort
health collapsible sections, CSV export, POPIA compliance rules, and
a Session 2 roadmap covering campaign ROI + AI engine activity + top
customers. Mojibake cleaned during the save.

Gate-lift commit updated `docs/WP-ANALYTICS.md` Module 5 status,
`docs/SESSION-STATE_v240.md` Module 5 row, and `docs/NEXT-SESSION-PROMPT_v245.md`
Priority 2 (three separate references — table row, section status,
key facts list, footer strapline) from "SPEC PENDING FROM CLAUDE.AI"
+ "Do NOT start Module 5" gate to "SPEC COMPLETE — ready for Session 1 · e237fdd".

### WP-ANALYTICS-4 S2 gap closure addendum (`01f0111`)

Before any S2 code, the Claude.ai spec review produced a 345-line
addendum appended to `docs/WP-ANALYTICS-4.md` that closed six gaps
from the base S2 spec with locked decisions:

- **Gap 1** — Dispensary velocity sourcing (CRITICAL silent-corruption
  risk): branch on industryProfile, retail queries stock_movements,
  dispensary queries dispensing_log with is_voided filter
- **Gap 2** — Cross-store SKU join key (CRITICAL): Step 0-B probes
  inventory_items for candidate shared keys; if none found, render
  honest empty state across all stores — no fuzzy name matching
- **Gap 3** — Fast movers filter + partition order:
  velocityUnits30d ≥ 3 OR daysOfStockLeft < 14, with
  isSellingWithNoStock items surfaced first (dangerLight row tint,
  "Active — no stock" chip, OUT pill), cap 25 with "+ N more" expand
- **Gap 4** — Network KPI decision: banner (not more tiles) between
  Section 1 and Section 2, only renders when a signal is non-zero
- **Gap 5** — Dead stock full UI: 7-column table with age bands
  (60-90d warning / 91-180d danger / 181+d danger semibold), local
  flag toggle as visual workflow aid, capital % always shown
- **Gap 6** — reorderQty null guard: `safeReorderQty = reorder_qty
  ?? reorder_level ?? 0` pattern everywhere reorderQty enters arithmetic

### Step 0 schema verification (Supabase MCP, 12 Apr 2026)

Both critical schema checks ran before any code:

**Step 0-A — Dispensary velocity** (Gap 1):
- `stock_movements` for Medi Can Dispensary WHERE `movement_type IN (sale_pos, sale_out)`: **0 rows**
- `dispensing_log` for Medi Can Dispensary WHERE `is_voided != true`: **14 rows, 14 total units**
- **Dispensary branch is MANDATORY.** Retail-only velocity query would silently return empty for the dispensary store.

**Step 0-B — Cross-store SKU join key** (Gap 2):
- Candidate columns on `inventory_items`: only `sku` (text). No `barcode`, `product_template_id`, `supplier_sku`, `product_code`, `global_sku`, or `parent_id`.
- SKUs appearing in 2+ tenants: **0 rows**
- **No cross-store join key exists.** Transfer opportunity engine renders honest empty state for the entire network per the Gap 2 decision tree.

### WP-ANALYTICS-4 Session 2 feature (`e55961f`, +1,677 / −201)

Two files changed:

**`src/components/group/_helpers/fetchStoreInventory.js` (174 → 335 lines, +161)**

- Removed the S1 `void industryProfile` and `void options` directives; both now consumed in the velocity layer
- Destructures `options.includeVelocity` (default `false` — S1 callers keep working with zero regression)
- Seven named constants at module scope for all thresholds: `SLOW_MOVER_DAYS`, `DEAD_STOCK_DAYS`, `VELOCITY_WINDOW_DAYS`, `FAST_MOVER_MIN_UNITS`, `CRITICAL_RESTOCK_DAYS`, `LOW_STOCK_DAYS`, `MS_PER_DAY`
- Core inventory query stays in its own try/catch — S1 error semantics preserved bit-for-bit
- NEW: velocity query is a separate try/catch inside the core try/catch so failure is isolated. Errors land in `result.velocityErr` (not `result.err`), core items still render. UI can surface "velocity unavailable" per store without hiding the health snapshot.
- Profile-branched velocity fetch: retail path queries `stock_movements` WHERE `movement_type IN ('sale_pos','sale_out')` with `Math.abs()` on `quantity`; dispensary path queries `dispensing_log` WHERE `.neq("is_voided", true)` plus client-side `is_voided !== true` re-filter for NULL safety
- Row loop enriched with 6 new S2 fields per item: `velocityUnits30d`, `monthlyRate`, `daysOfStockLeft`, `isCriticalRestock`, `isFastMover`, `isSellingWithNoStock`, plus the `safeReorderQty` Gap 6 arithmetic-safe fallback
- Summary aggregates 4 new counters: `fastMovers`, `criticalRestock`, `sellingWithNoStock`, `velocityQueried` (bool)

**`src/components/group/StockIntelligence.js` (1,007 → 2,322 lines, +1,315)**

- S1 components preserved bit-for-bit per Gap 5's "keep both, add a visual note" decision — `SlowMoversSection`, `StoreStockCard`, `HealthBar`, `StatusChip`, `KpiTile`, `IndustryPill` all unchanged
- New helpers: `fmtPct`, `fmtDaysOfStock`, `fmtMonthlyRate`, `getAgeBand`, `buildTransferOpportunities`
- New sub-components: `NetworkInsightBanner`, `FastMoversSection`, `TransferOpportunitiesSection`, `DeadStockSection`
- Main component: call site now passes `{ includeVelocity: true }`; `network` useMemo extended with `criticalRestock`, `deadStockValue`, `deadPct`, `avcoMissingInDead`; `opportunities` useMemo added; three new section renders after Section 3; data quality footnote updated
- `NetworkInsightBanner` renders between Section 1 and Section 2 — only when `criticalCount > 0` OR `deadCount > 0`. Absent (not empty) when both are zero.
- `FastMoversSection` applies the Gap 3 partition order: `isSellingWithNoStock` first (sorted by velocity DESC, rendered with dangerLight row tint and "Active — no stock" chip), then `isFastMover && !isSellingWithNoStock` (sorted by `daysOfStockLeft` ASC, most urgent first). Cap at 25 with "+ N more items" expand toggle.
- `TransferOpportunitiesSection` calls `buildTransferOpportunities(resultByTenant, members)` which builds a cross-store SKU map, partitions into `needs` vs `haves`, and applies the Gap 2 surplus/need/suggestedQty formulas with the `safeReorderQty` fallback. For the current Medi Can network (no shared SKUs) it returns empty and the honest empty state renders.
- `DeadStockSection` uses `getAgeBand(days)` to assign row background + chip colour per age band. Local `flaggedIds` `Set` in `useState` for the visual flag toggle. Collapsed header shows capital as percentage of store value with `—%` fallback when `totalStoreValue === 0`. Expanded section footnote links back to the S1 Slow Movers section explaining the intentional duplication.

### Paste-bug checklist walked pre-commit

All 5 canonical patterns green. One catch during the walk:
`network` useMemo was accumulating `fastMovers` and `sellingWithNoStock`
totals that were returned in the object but never consumed by the
render (per-store values read directly from `inventoryResult.summary`
in each section component, not from the network aggregate). Removed
before commit — 3-edit cleanup on the `let` declarations, `+=`
accumulator lines, return-object keys, and fallback-object default
keys. ESLint wouldn't have flagged it (dead object properties, not
dead top-level variables), but the checklist spirit of "walk every
const for actual usage" caught it. Post-cleanup rebuild confirmed
still zero new warnings.

### Browser verification (confirmed by owner at HEAD `e55961f`)

All four S2 features verified live against the Medi Can Franchise Network:

1. **Network Insight Banner** renders with critical restock count and
   dead stock capital disclosure. AVCO-missing footnote surfaces
   correctly for Medi Recreational's 172 items without AVCO.
2. **Section 4 Fast Movers** populates on BOTH stores — Medi
   Recreational from `stock_movements`, Medi Can Dispensary from
   `dispensing_log` via the Gap 1 branch. **Dispensary velocity branch
   confirmed live** — without it, Medi Can Dispensary would show empty.
3. **Section 5 Transfer Opportunities** renders the honest empty state
   exactly as specified by Gap 2's decision tree. **No shared SKUs →
   no fake opportunities.** Confirmed the empty state message, not a
   blank section.
4. **Section 6 Dead Stock Breakdown** — Medi Recreational shows dead
   stock items with correct age band colouring; Medi Can Dispensary
   shows the green "no dead stock" empty state. Flag toggle works
   locally.

## GROUP PORTAL TAB STATUS (unchanged since v240 baseline)

| Tab | Component | Status |
|---|---|---|
| Network Dashboard | NetworkDashboard.js | ✅ Live |
| Stock Transfers | GroupTransfer.js | ✅ Live (AVCO-correct) |
| Compare Stores | StoreComparison.js | ✅ Live |
| Combined P&L | CombinedPL.js | ✅ Live |
| Revenue Intelligence | RevenueIntelligence.js | ✅ Live (S1+S2) |
| Stock Intelligence | StockIntelligence.js | ✅ **Live (S1+S2 as of this addendum)** |
| Shared Loyalty | disabled nav | Phase 2+ deferred |
| Group Settings | GroupSettings.js | ✅ Live |

Module 4 Session 2 closes the last active Analytics build. Next
session starts Module 5 Session 1 from the spec committed at
`e237fdd`.

## WP-ANALYTICS SUITE PROGRESS AT ADDENDUM 1 CLOSE

| Module | Name | Status |
|---|---|---|
| 1 | Store Comparison | ✅ COMPLETE — `8221177` |
| 2 | Combined P&L | ✅ COMPLETE — `5ba63b5` |
| 3 | Revenue Intelligence | ✅ COMPLETE — `6ea2493` |
| 4 | **Stock Intelligence** | ✅ **COMPLETE — `e55961f`** |
| 5 | Customer & Loyalty Intelligence | SPEC COMPLETE — `e237fdd` · ready for Session 1 |
| 6 | NuAi Network Intelligence | Pending — no detailed spec yet |

Four of six modules complete. Module 5 spec locked and on disk.

## `_helpers/` DIRECTORY (unchanged occupants, S2 extended one file)

| File | Purpose | Extended in this addendum? |
|---|---|---|
| `fetchStoreSummary.js` | MTD summary | No |
| `industryBadge.js` | Profile → badge map | No |
| `fetchStoreFinancials.js` | P&L for a date range | No |
| `fetchStoreTrend.js` | Timestamped revenue rows + bucketing | No |
| `fetchStoreInventory.js` | Inventory snapshot + velocity | **Yes — +161 lines for S2 velocity opt-in** |

Module 5 will add `fetchStoreLoyalty.js` as the sixth sibling.

## KNOWN ISSUES (no change from v240 baseline)

1. HQTransfer historical AVCO corruption — forward-fix at `713ef3a`, pre-fix data not remediated
2. Per-line atomicity gap in HQTransfer + GroupTransfer ship/receive/cancel
3. GroupSettings email-invite gap — LL-243 open
4. Cross-tenant "View store →" navigation placeholders
5. Transfer pre-selection from StoreComparison / StockIntelligence
6. Medi Recreational AVCO gap (172 of 186 items — simulator data)
7. Sender email not on brand domain
8. `docs/.claude/worktrees/` disk cleanup

## KEY FACTS FOR THE NEXT AGENT

1. **HEAD is `e55961f`** (plus one doc commit this close). Confirm with `git log --oneline -1`.
2. **WP-ANALYTICS-4 is DONE.** Both sessions complete. Stock Intelligence is the 5th complete analytics module.
3. **Dispensary velocity branch** in `fetchStoreInventory.js` is the Gap 1 implementation — verified live with Medi Can Dispensary data. Pattern: branch on `industryProfile === 'cannabis_dispensary'` inside `options.includeVelocity`.
4. **Transfer opportunity engine** in `buildTransferOpportunities` is correctly built but renders empty for the current network. When a future network adds stores with shared SKUs, it will automatically start producing matched opportunities.
5. **Paste-bug checklist caught one dead-code issue** (fastMovers/sellingWithNoStock accumulators with no consumer) before commit. Checklist is working; trust it on future builds.
6. **6 helpers in `_helpers/`** after Module 5 ships — the pattern is well-established. Each new analytics module adds a sibling `fetchStoreX.js`.
7. **Module 5 is next.** Spec at `docs/WP-ANALYTICS-5.md`, HEAD `e237fdd`. Step 0 schema check (8 SQL queries in the spec) is the first action when implementation starts — includes POPIA compliance verification (no individual customer PII in the Group Portal view).

---

*Addendum 1 of v240 written 12 April 2026 · HEAD at close: `e55961f` (pre-doc-commit)*
*Five commits in Addendum 1 · WP-ANALYTICS-4 COMPLETE · Module 5 spec locked and ready*
*Dispensary velocity branch confirmed live · Transfer opportunities empty state confirmed · Six gaps closed*

---

# ADDENDUM 2 — 12 April 2026 · WP-ANALYTICS-5 Session 1 + Pre-flight bug fix

## HEAD chain this addendum

`c2fed3b → 7c8e8e4 → a5134aa → [this doc commit]`

Three commits covering two distinct pieces of work:

1. **`7c8e8e4`** — Pre-flight bug fix identified by a Group Portal audit
   before WP-A5 work began. Two bugs in one commit per the single-commit
   rule: NetworkDashboard was missing a Top Products block entirely, and
   a `<span>Phase 4</span>` placeholder was leaking into the production
   View Store button row. Plus UX-1 — StoreComparison chart title now
   reflects the active sort instead of the hardcoded "Revenue comparison
   — MTD". 98 insertions / 20 deletions across two files. Browser-
   verified against the Medi Can Franchise Network.

2. **`a5134aa`** — `feat(WP-A5/S1): CustomerIntelligence — cohort
   health, tier distribution, points economy`. Module 5 Session 1 of
   the NuAi franchise analytics suite. 1,507 insertions across three
   files (two new, one surgical edit). Addresses the question no
   single-store surface can answer: how is the loyalty programme
   performing across the franchise network, and where are the churn
   signals?

3. **This doc commit** — WP-ANALYTICS-5 S1 complete + SESSION-STATE
   v240 Addendum 2 + NEXT-SESSION-PROMPT v247.

## Bug fix detail (commit `7c8e8e4`)

Pre-flight audit flagged two bugs plus one UX improvement:

- **Bug 1 (mis-diagnosed by the spec):** The spec assumed Top Products
  was rendering "—" on both NetworkDashboard and Compare Stores. Step 0
  reads revealed the real root cause: NetworkDashboard had **no top
  products UI element at all**. StoreComparison was already passing
  `includeExtended: true`. The fix was a feature-add, not a bug fix
  — top products block was added to NetworkDashboard's StoreCard with
  a new `TopProductsBlock` helper component rendering top 3 by
  revenue MTD, with "No orders this period" empty state (never "—").

- **Bug 2:** A `<span>Phase 4</span>` placeholder at
  [NetworkDashboard.js:562-570](src/components/group/NetworkDashboard.js#L562-L570)
  was visible to production users. Removed in the same commit.

- **UX-1:** StoreComparison chart title was hardcoded
  "Revenue comparison — MTD" regardless of the active sort pill.
  Now reads `Revenue MTD — sorted by {label}` where label is the
  current `SORT_OPTIONS` entry.

Browser-verified all four checks pass on the Medi Can Franchise Network.

## WP-ANALYTICS-5 Session 1 detail (commit `a5134aa`)

### Step 0 schema check — material divergence

The spec's pre-Step-0 body assumed a schema that does not exist. Claude
Code ran all 8 Step 0 queries via Supabase MCP before writing code and
reported every divergence:

| Spec name | Actual | Impact |
|---|---|---|
| `customers` | `user_profiles` | Helper rewritten to query correct table |
| `loyalty_tiers` | **does not exist** | `TIER_PALETTE` hardcoded in component with rationale comment |
| `loyalty_campaigns` | **does not exist** | **Section 4 permanently deferred** — no table to build against |
| `ai_action_logs` | `loyalty_ai_log` | S2 Section 5 must use actual name |
| `stock_boost` (action_type) | `stock_boost_suggestion` | S2 Section 5 must use actual value |

Full divergence report appended to
[docs/WP-ANALYTICS-5.md](docs/WP-ANALYTICS-5.md) as "Step 0 Addendum"
at the bottom of the file. Session 2 must build from that addendum,
not the pre-Step-0 body above it.

### Files shipped

1. **`src/components/group/_helpers/fetchStoreLoyalty.js`** (new, 265
   lines) — sixth sibling in the `_helpers/` directory. Two queries
   per store via `Promise.allSettled` (independent error isolation),
   client-side cohort derivation from `last_purchase_at`, POPIA-safe
   8-column projection from `user_profiles`. Sign-of-points authoritative
   classification for the mixed-case (`BONUS`/`EARNED`/`PURCHASE`/
   `REDEEMED`/`earn_purchase`) `transaction_type` column. `includeAiLogs`
   and `includeCampaigns` options voided on the signature for S2
   stability.

2. **`src/components/group/CustomerIntelligence.js`** (new, ~880 lines)
   — three sections plus CSV export and data-quality footnote:
   - Section 1: 4 KPI tiles (Total, Active, At-Risk, Points Economy)
     with per-store breakdown sub-labels on Tile 1 and adaptive
     colouring (redemption rate < 10% = danger, active rate bands
     at 30% and 60%)
   - Section 2: Loyalty Tier Distribution — per-store cards with
     proportional horizontal tier bars, legend rows, 5-tier palette
     (bronze/silver/gold/platinum/harvest_club) hardcoded with Step 0
     rationale comment
   - Section 3: Cohort Health by Store — collapsible per-store cards
     (auto-expand when at-risk or lapsed > 0), cohort table with row
     colouring, proportional cohort bar with 2% minimum segment width,
     static churn insight line, high-risk annotation on the At-risk
     row (`churn_risk_score >= 0.5` from the nightly AI engine)
   - 8-column CSV export with UTF-8 BOM for Excel compatibility
   - Data quality footnote documenting POPIA stance, deferred Section
     4 (no campaigns table), and the loyalty_ai_log action-type naming
     for Session 2

3. **`src/components/group/GroupPortal.js`** (3 surgical edits):
   import, NAV_ITEMS entry (position 7, after `stock`), tab router
   block before the `loyalty` placeholder.

### POPIA compliance verified

The `fetchStoreLoyalty` SELECT lists are both PII-free:
- `user_profiles`: `id, tenant_id, loyalty_points, loyalty_tier, created_at, last_purchase_at, is_suspended, churn_risk_score` (8 columns, zero PII)
- `loyalty_transactions`: `transaction_type, points` (2 columns, zero PII)

Browser devtools network-tab inspection confirmed at verification
time: no email, phone, or full_name appears in any response payload
from the Customer Intelligence tab.

### Live render values at verification

Matched the Step 0 snapshot exactly:
- Network totals: 51 members (50 Medi Rec + 1 Medi Can Dispensary),
  45 active (88.2%), 4 at-risk, 0 lapsed, 2 dormant
- Medi Rec tier distribution: Bronze 21, Silver 14, Gold 7, Platinum 8,
  Harvest Club 1
- Section 3 Medi Rec auto-expanded; churn insight: "8% of members show
  churn signals · below rescue threshold" (4/50 below the 30% rescue
  threshold)

## WP-ANALYTICS SUITE PROGRESS AT ADDENDUM 2 CLOSE

| Module | Name | Status |
|---|---|---|
| 1 | Store Comparison | ✅ COMPLETE — `8221177` |
| 2 | Combined P&L | ✅ COMPLETE — `5ba63b5` |
| 3 | Revenue Intelligence | ✅ COMPLETE — `6ea2493` |
| 4 | Stock Intelligence | ✅ COMPLETE — `e55961f` |
| 5 | **Customer & Loyalty Intelligence** | **IN PROGRESS — Session 1 `a5134aa` · Session 2 pending** |
| 6 | NuAi Network Intelligence | Pending — no detailed spec yet |

Five of six modules have at least one session shipped. Module 5 S2
remains (Section 5 AI Engine Activity + Section 6 Top Customers;
Section 4 Campaign ROI permanently deferred). Module 6 still needs
a detailed spec from the owner via the Claude.ai strategic spec
pattern before any code.

## `_helpers/` DIRECTORY (Addendum 2 adds one file)

| File | Purpose | Changed in this addendum? |
|---|---|---|
| `fetchStoreSummary.js` | MTD summary + extended top products | No |
| `industryBadge.js` | Profile → badge data | No |
| `fetchStoreFinancials.js` | P&L for a date range | No |
| `fetchStoreTrend.js` | Timestamped revenue rows + bucketing | No |
| `fetchStoreInventory.js` | Inventory snapshot + velocity | No |
| **`fetchStoreLoyalty.js`** | **Cohort snapshot + points economy** | **NEW this addendum** |

Six helpers in place. Pattern is well-established — each new
analytics module adds a sibling.

## Group Portal nav (Addendum 2 adds one tab)

| Position | Tab | Component | Status |
|---|---|---|---|
| 1 | Network Dashboard | NetworkDashboard.js | ✅ Live (top products added in `7c8e8e4`) |
| 2 | Stock Transfers | GroupTransfer.js | ✅ Live |
| 3 | Compare Stores | StoreComparison.js | ✅ Live (chart title UX-1 `7c8e8e4`) |
| 4 | Combined P&L | CombinedPL.js | ✅ Live |
| 5 | Revenue Intelligence | RevenueIntelligence.js | ✅ Live |
| 6 | Stock Intelligence | StockIntelligence.js | ✅ Live |
| 7 | **Customer Intelligence** | **CustomerIntelligence.js** | **✅ Live — Session 1 `a5134aa`** |
| — | Shared Loyalty | disabled nav | Phase 2+ deferred |
| 8 | Group Settings | GroupSettings.js | ✅ Live |

Seven content tabs plus Settings. Module 5 Session 2 does not add a
new tab; it extends the existing Customer Intelligence component with
Sections 5 and 6.

## KNOWN ISSUES (updated at Addendum 2)

1. HQTransfer historical AVCO corruption — forward-fix at `713ef3a`, pre-fix data not remediated
2. Per-line atomicity gap in HQTransfer + GroupTransfer ship/receive/cancel
3. GroupSettings email-invite gap — LL-243 open
4. Cross-tenant "View store →" navigation placeholders (NetworkDashboard, StoreComparison, StockIntelligence)
5. Transfer pre-selection from StoreComparison / StockIntelligence
6. Medi Recreational AVCO gap (172 of 186 items — simulator data)
7. Sender email not on brand domain
8. `docs/.claude/worktrees/` disk cleanup
9. **NEW:** `loyalty_campaigns` table does not exist — WP-ANALYTICS-5 Section 4 permanently blocked until schema owner adds it
10. **NEW:** Medi Can Dispensary has only 1 user_profiles row — cohort render is technically correct but not visually informative. Real dispensary test data would improve S2 verification.

## KEY FACTS FOR THE NEXT AGENT

1. **HEAD is `a5134aa`** (plus this doc commit). Confirm with `git log --oneline -1`.
2. **WP-ANALYTICS-5 S1 is DONE.** Don't rebuild. Read the file if you need the pattern.
3. **WP-ANALYTICS-5 Step 0 addendum** is at the bottom of `docs/WP-ANALYTICS-5.md`. Session 2 builds from that addendum, not the pre-Step-0 body above it. Section 4 Campaign ROI is permanently deferred (no `loyalty_campaigns` table).
4. **POPIA is non-negotiable** — `fetchStoreLoyalty.js` enforces the 8-column non-PII projection. Any Session 2 query additions must preserve this.
5. **Tier palette is hardcoded** in `CustomerIntelligence.js` with Step 0 rationale — `loyalty_tiers` table does not exist, 5-tier enum is fixed in schema (`bronze`/`silver`/`gold`/`platinum`/`harvest_club`).
6. **loyalty_ai_log (not ai_action_logs)** and **stock_boost_suggestion (not stock_boost)** — Session 2 Section 5 must use the actual names. Documented in the WP-ANALYTICS-5 Step 0 addendum.
7. **Six helpers in `_helpers/`** — `fetchStoreLoyalty.js` is the newest sibling.
8. **Paste-bug checklist + POPIA check** is the canonical pre-commit discipline. Five paste-bug checks plus the POPIA network-tab inspection.
9. **Module 6 still has no detailed spec.** Do NOT start Module 6 until the owner produces `docs/WP-ANALYTICS-6.md` via the Claude.ai strategic spec pattern.
10. **Analytics Suite Session Close Protocol** — every session must update the master doc, the module doc, SESSION-STATE, and write the next NEXT-SESSION-PROMPT.

---

*Addendum 2 of v240 written 12 April 2026 · HEAD at close: `a5134aa` (pre-doc-commit)*
*Three commits in Addendum 2 · WP-ANALYTICS-5 Session 1 shipped · Module 5 S2 remains*
*Section 4 Campaign ROI permanently deferred · Step 0 divergence locked in WP-ANALYTICS-5 addendum*

---

# ADDENDUM 3 — 12 April 2026 · WP-ANALYTICS-5 S2 + NUAI-STRAT-INTEL integration

## HEAD chain this addendum

`cf58f5f → 388520c → [this session close doc commit]`

Two commits:

1. **`388520c`** — `feat(WP-A5/S2): CustomerIntelligence AI engine +
   top customers`. WP-ANALYTICS-5 Session 2 of the NuAi franchise
   analytics suite. 2 files changed, 776 insertions / 54 deletions.
   Adds Sections 5 (AI Engine Activity reading loyalty_ai_log) and 6
   (Top Customers POPIA-safe via deriveInitials pattern) to the
   existing CustomerIntelligence component. No new tab added — the
   sections extend the existing component inline. Section 4 Campaign
   ROI remains permanently deferred (no loyalty_campaigns table).

2. **This session close doc commit** — 11 doc items bundled into a
   single commit (see full list in the commit message). This is an
   expanded session close per new owner instructions integrating the
   NUAI-STRATEGIC-INTELLIGENCE v1.0 document into the handover loop
   at every agent-touch surface.

## WP-ANALYTICS-5 Session 2 detail (commit `388520c`)

### Lightweight Step 0 findings

Two confirmation-only queries run before writing a line:

1. **`full_name` column format:** Single combined TEXT field on
   `user_profiles`. No first_name / last_name split. Also has
   `display_name` TEXT. The Section 6 initials-derivation logic
   must split `full_name` on whitespace client-side.

2. **Current-month AI action counts (MTD):** Confirmed all three
   action types from the S1 Step 0 addendum are still live and
   unchanged: `churn_rescue` (4 on Medi Rec), `birthday_bonus` (5
   on Medi Rec), `stock_boost_suggestion` (181 on Medi Rec), 0
   actions on Medi Can Dispensary. The spec's `stock_boost` value
   remains incorrect — actual live value is `stock_boost_suggestion`.

No schema surprises beyond the S1 addendum. Proceeded directly to
the build.

### POPIA pattern — the narrow wire-level exception

Sections 1-5 of Customer Intelligence maintain the strict "no PII on
the wire" stance from S1. Section 6 is the single intentional
exception authorised in v247:

- `fetchStoreLoyalty.js` SELECTs `full_name` server-side only in the
  `includeTopCustomers` branch
- `deriveInitials(fullName)` helper consumes the raw string and
  produces a two-character initials projection (edge cases: null/
  empty → "—", "Jane" → "J", "Jane Smith" → "JS", "John van der
  Merwe" → "JM")
- The raw `full_name` goes out of scope at the next loop iteration
- The returned `topCustomers` array contains only the POPIA-safe
  7-field projection: `initials`, `maskedId`, `loyaltyTier`,
  `loyaltyPoints`, `monthlySpendZar`, `monthlyVisitCount`,
  `lastPurchaseAt`
- The `maskedId` field is `…` + last 4 chars of the UUID — no raw
  UUID in state or DOM

The `TopCustomersCard` render function opens with a POPIA Compliance
Declaration comment block (ASCII box drawing) documenting the
projection and the wire-level exception so future maintainers cannot
accidentally widen the SELECT list.

Browser verification confirmed:
- Section 5: AI engine empty-state honest and correct (0 actions
  fired on Medi Can this month, matching the MTD filter)
- Section 6: React DevTools state tree is PII-free; no `full_name`
  field appears on any `topCustomers[i]` object in the `CustomerIntelligence`
  component state. The Supabase network payload for the top customers
  query briefly contains `full_name` as the documented exception.
- POPIA DOM inspection clean — no full name text in any rendered node

## NUAI-STRATEGIC-INTELLIGENCE integration (this commit)

New permanent document `docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md`
landed as the mandatory first orientation read for every agent. The
document is owner-directed, never replaced, only appended with
date-stamped addendums. Integrated at every agent-touch surface:

1. **CLAUDE.md** — Step 0 orientation read added before the existing
   5 actions. Note: the actual file is at repo root `/CLAUDE.md`, not
   `docs/CLAUDE.md` as prior session docs incorrectly referenced.
2. **docs/NUAI-AGENT-BIBLE.md** — header reference added before the
   existing "READ THIS FIRST" block explaining that the LL rules
   exist because of the system described in NUAI-STRAT-INTEL.
3. **docs/PLATFORM-OVERVIEW_v1_0.md** — footer addendum added
   referencing NUAI-STRAT-INTEL as the strategic framing layer to
   read before PLATFORM-OVERVIEW for full context.
4. **docs/NEXT-SESSION-PROMPT_v248.md** — new prompt template with
   Step 0 of the mandatory reads being NUAI-STRAT-INTEL (7 actions
   total now, step 0 + 6 steps).
5. **This SESSION-STATE addendum** — adds the new Session Close
   Protocol Step 3b (see below).
6. **NUAI-STRAT-INTEL Addendum 1** — date-stamped addendum inside
   the document itself, documenting the S2 capability update and
   running the first instance of the Step 3b review.

## NEW: Session Close Protocol Step 3b — NUAI-STRAT-INTEL review

Every session close must now run this review **between** existing
Step 3 (write next module spec) and Step 4 (SESSION-STATE addendum):

**Step 3b — Review `docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md`.
Answer these 5 questions:**

1. **Did we ship a new capability?**
   → If yes, update the Group Portal capability map section of
     NUAI-STRAT-INTEL
2. **Did we fix a known issue?**
   → If yes, remove or update it in the "What's known to be wrong"
     section of NUAI-STRAT-INTEL
3. **Did Step 0 reveal new schema facts?**
   → If yes and material, update relevant sections of NUAI-STRAT-INTEL
4. **Did the live data snapshot change materially?**
   → If yes, update the Medi Can snapshot in "The Live Data" section
5. **Did a new LL rule emerge this session?**
   → If yes, add it to the canonical rules table (or to the
     NUAI-AGENT-BIBLE if that's where it belongs)

**Decision rule:**
- If any answer is yes → append a date-stamped addendum to
  NUAI-STRATEGIC-INTELLIGENCE_v1_0.md (never replace the v1.0 body
  or any prior addendum)
- If all answers are no → note "NUAI-STRAT-INTEL reviewed, no
  updates required" in the session close commit message

The first instance of Step 3b was run for the WP-A5/S2 close in
this addendum — answers: YES (Customer Intelligence S2 shipped),
NO, CONFIRMATION-ONLY (no new facts, both Step 0 queries validated
existing findings), NO (snapshot unchanged), NO new LL.
NUAI-STRAT-INTEL Addendum 1 was written to reflect the S2 capability
update.

## WP-ANALYTICS SUITE PROGRESS AT ADDENDUM 3 CLOSE

| Module | Name | Status |
|---|---|---|
| 1 | Store Comparison | ✅ COMPLETE — `8221177` |
| 2 | Combined P&L | ✅ COMPLETE — `5ba63b5` |
| 3 | Revenue Intelligence | ✅ COMPLETE — `6ea2493` |
| 4 | Stock Intelligence | ✅ COMPLETE — `e55961f` |
| 5 | **Customer & Loyalty Intelligence** | **✅ COMPLETE — S1 `a5134aa` · S2 `388520c`** |
| 6 | **NuAi Network Intelligence** | **SPEC COMPLETE — ready for Session 1 · docs/WP-ANALYTICS-6.md** |

Five of six modules complete. Module 6 spec is on disk and is the
Priority 1 build target for the next session. When Module 6 ships
the WP-ANALYTICS suite is DONE.

## `_helpers/` DIRECTORY (unchanged occupants, S2 extended one file)

| File | Purpose | Extended in this addendum? |
|---|---|---|
| `fetchStoreSummary.js` | MTD summary + extended top products | No |
| `industryBadge.js` | Profile → badge data | No |
| `fetchStoreFinancials.js` | P&L for a date range | No |
| `fetchStoreTrend.js` | Timestamped revenue rows + bucketing | No |
| `fetchStoreInventory.js` | Inventory snapshot + velocity | No |
| `fetchStoreLoyalty.js` | Cohort + points + **AI logs + top customers** | **Yes — +~180 lines for S2** |

Six helpers in place. Module 6 will add `fetchNetworkIntelligence.js`
as a seventh — but it's an aggregator, not a new data fetcher.

## Group Portal nav (unchanged)

Seven content tabs plus Settings. Customer Intelligence S2 does not
add a new tab; it extends the existing component inline. Module 6
will add Network Intelligence as the 8th content tab.

## KNOWN ISSUES (updated at Addendum 3)

1. HQTransfer historical AVCO corruption — forward-fix at `713ef3a`, pre-fix data not remediated
2. Per-line atomicity gap in HQTransfer + GroupTransfer ship/receive/cancel
3. GroupSettings email-invite gap — LL-243 open
4. Cross-tenant "View store →" navigation placeholders (NetworkDashboard, StoreComparison, StockIntelligence)
5. Transfer pre-selection from StoreComparison / StockIntelligence
6. Medi Recreational AVCO gap (172 of 186 items — simulator data)
7. Sender email not on brand domain
8. `docs/.claude/worktrees/` disk cleanup
9. `loyalty_campaigns` table does not exist — WP-ANALYTICS-5 Section 4 permanently blocked until schema owner adds it
10. Medi Can Dispensary has only 1 user_profiles row — cohort render is technically correct but not visually informative. Real dispensary test data would improve verification.
11. **NEW — Medi Can cohort overlap UX (non-blocking).** When a store has overlapping cohort membership (Medi Can Dispensary has 1 member who is BOTH `isNew` AND `isDormant` — never purchased, joined in April), the Section 3 cohort bar renders segments that visually sum to > 100% because `isNew` overlaps the other cohorts at the classification level while the bar renders them as disjoint. Underlying data is honest and correct — the `isNew` flag is intentionally orthogonal to the active/dormant classification per the helper's documented semantics. Fix options: exclude `isNew` from the bar, or render it as a stacked overlay, or annotate it separately. Deferred to a small UX-fix session. Surfaced during S2 browser verification by the owner.
12. **NEW — Documentation drift on CLAUDE.md path.** Prior session docs refer to `docs/CLAUDE.md` but the actual file is at repo root (`/CLAUDE.md`). Not a functional bug — Claude Code loads the root file automatically — but the references should be corrected in a future doc pass to avoid confusing future agents.

## KEY FACTS FOR THE NEXT AGENT

1. **HEAD is `388520c`** (plus this doc commit). Confirm with `git log --oneline -1`.
2. **Read NUAI-STRATEGIC-INTELLIGENCE Step 0** — it is now the mandatory first orientation read at every session.
3. **WP-ANALYTICS-5 is DONE.** Both sessions shipped. Read the Step 0 addendum at the bottom of `docs/WP-ANALYTICS-5.md` if you need the schema truth.
4. **Module 6 is next.** Spec at `docs/WP-ANALYTICS-6.md`. Step 0 schema check (4 queries in the spec) is the first action. Module 6 REUSES existing helpers — do not write new queries that duplicate fetchStoreSummary/Inventory/Loyalty.
5. **Session Close Protocol Step 3b** is now mandatory — run the 5-question NUAI-STRAT-INTEL review at every session close.
6. **The onNavigate prop is USED in Module 6** — Alert Centre "Go to {tab}" links and Section 3 "Go to Settings" button. Do not void it.
7. **Seven helpers** after Module 6 ships — fetchNetworkIntelligence is an aggregator, not a new data fetcher.
8. **POPIA stance is preserved from Module 5** — Module 6 does not add new PII surface. Health scores and alert counts are aggregates only.
9. **POPIA narrow exception pattern** (Section 6 `deriveInitials`) is the template for any future customer-level Group Portal rendering.

---

*Addendum 3 of v240 written 12 April 2026 · HEAD at close: `388520c` (pre-doc-commit)*
*Two commits in Addendum 3 · WP-ANALYTICS-5 COMPLETE · NUAI-STRAT-INTEL landed · Module 6 spec on disk*
*Session Close Protocol Step 3b is now mandatory · First instance run in this addendum*
