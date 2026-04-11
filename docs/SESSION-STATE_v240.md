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
| 5 | Customer & Loyalty Intelligence | ~1 | Pending — detailed spec coming from Claude.ai |
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
