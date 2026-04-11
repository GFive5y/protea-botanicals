# NUAI STRATEGIC INTELLIGENCE — v1.0
## The document every agent reads before touching anything
## Produced: 12 April 2026 · Owner-directed strategic session
## This file is NEVER replaced. Append date-stamped addendums only.
## Read time: 15 minutes. Non-negotiable before your first edit.

---

## WHAT YOU ARE WORKING ON

You are not working on a dev project. You are not adding features to a
prototype. You are maintaining and extending a production multi-tenant SaaS
ERP platform that is live, has real tenants, real financial data, and real
business decisions being made from it every day.

This system is called NuAi. It is one of the most complete ERP platforms
ever built by an AI-assisted development process. Understanding its full
scope is not optional — it is the foundation of every decision you make.

---

## THE NUMBERS (from LIVE-AUDIT v1.0, 09 April 2026)

| Metric | Figure |
|---|---|
| Total lines of production code | 224,293 |
| JavaScript source files | 180 |
| TypeScript Edge Functions | 10 |
| Database tables (all RLS-secured) | 109 |
| Database functions | 38 |
| Database triggers | 35 |
| Cloud edge functions deployed | 10 |
| Distinct user portals | 6 |
| HQ dashboard functional tabs | 41 |
| HR suite modules | 13 |
| Stock/inventory components | 17 |
| Industry profiles supported | 4 |
| Active client tenants | 5 |

These are not aspirational numbers. These are live, on production Supabase
(project `uvicrqapgzcdvozxrreo`, eu-west-1), deployed to Vercel, serving
real businesses.

---

## THE SIX PORTALS — WHAT EACH ONE IS

### 1. HQ Command Centre (`/hq`)
The operator-level view. 41 functional tabs covering cross-tenant oversight:
finance, stock analytics, loyalty programme management, fraud detection,
QR intelligence, HR. The largest single component is `HQProduction.js`
at 8,949 lines. This is the master control room.

### 2. Tenant Portal (`/tenant-portal`)
The business owner's view. 35 tabs, role-gated, industry-profile adaptive.
The entire UI restructures based on whether the tenant is cannabis_retail,
cannabis_dispensary, food_beverage, or general_retail. One codebase, four
distinct operational experiences.

### 3. Admin Dashboard (`/admin`)
The store manager's day-to-day operations. 13 tabs: batches, stock, customers,
QR codes, communications. This is where staff are managed, stock is received,
and the daily floor is run.

### 4. HR Suite (`/hr`)
13 modules: timesheets, leave (BCEA-compliant), roster, payroll, performance
reviews, loans, disciplinary proceedings, contracts. Integrated with SimplePay
for CSV payroll export. SA public holidays (40) in the calendar. Staff
take their own stock takes via blind and guided modes.

### 5. Consumer Shop (`/shop`)
The customer-facing e-commerce layer. Age verification gate, adaptive product
cards per industry profile, PayFast payment gateway, loyalty redemption at
checkout, 7 interactive cannabinoid molecule visualisers (6,620 lines of
educational content). The product verification page at `/verify/:productId`
is public — no login required.

### 6. Group Portal (`/group-portal`)
The franchise network layer. Built across April 2026. A franchise or group
owner sees cross-store intelligence — revenue, P&L, stock, customers, loyalty
— without needing to switch tenant context. This is the newest portal and
the one currently under active development.

---

## THE GROUP PORTAL — COMPLETE CAPABILITY MAP

As of 12 April 2026, the Group Portal has 8 live tabs:

### Network Dashboard
- Combined Revenue MTD across all stores
- Orders & Events count
- Network average stock margin
- Combined stock value (AVCO-weighted)
- Per-store comparison cards with Revenue MTD, margin, orders, stock health
- **Top 3 products per store** sourced correctly from dispensing_log for
  dispensaries and order_items for retail (profile-branched)
- 3 network-level action buttons: Transfer stock, Combined P&L, Export

### Stock Transfers
- Cross-store AVCO-correct stock transfers
- Overview / New Transfer / Active / History sub-tabs
- LL-242: AVCO recalculated on receive — this was a critical historical fix

### Compare Stores
- Sort by Revenue, Margin, Orders, Stock Health
- Dynamic chart title updates with sort
- Revenue comparison bar chart with network average line
- Per-store breakdown cards: Revenue, Margin, AOV, Orders, Stock health,
  Top products (collapsible), Transfer + View store actions

### Combined P&L
- IFRS-compliant consolidated P&L across all stores
- Period toggles: This month / Last month / Last 3 months / This year
- Revenue sourced correctly per profile (LL-231 dispensary branching)
- COGS from AVCO-correct per-transaction weighted average cost
- Honest data quality disclosures (AVCO missing, profile unavailable)
- Export CSV
- Network total + per-store breakdown table

### Revenue Intelligence (WP-ANALYTICS-3, COMPLETE)
- Network Revenue MTD + MoM Growth + WoW Growth + Network Average
- 30d/60d/90d trend window toggle
- Revenue trend chart: all stores on one axis
- Per-store growth cards: Revenue, MoM, WoW, Projected month-end
- **Peak trading heat matrix**: 7 days × 14 hours (9am–10pm), built from
  existing trend data — zero new queries. Network peak insight banner.
- **Top 5 products per store**: MTD, profile-branched
- SSSG CSV export (6 columns)
- Data footnote documenting ex-VAT method, dispensing_log source,
  Schedule 6 records, 7-day rolling average projection

### Stock Intelligence (WP-ANALYTICS-4, COMPLETE — both sessions)
- Network Stock Value (AVCO-weighted), Out of Stock, Slow Movers, Reorder
- **Network Insight Banner**: Critical restock count + Dead stock capital
- Per-store health cards: stock value, SKU count, AVCO disclosure, status chips,
  3-segment health bar (OK/low/critical), View transfers action
- **Slow Movers**: Per-store collapsible, sorted by idle days DESC, dead stock
  tinted red, AVCO tooltip on missing values
- **Fast Movers & Restock Risk**: Velocity from stock_movements (retail) OR
  dispensing_log (dispensary — Gap 1 fix, confirmed live). "Selling with no
  stock" edge case surfaced first. Top 25 per store, expand toggle.
- **Transfer Opportunities**: Cross-store SKU matching engine. Honest empty
  state when no shared SKUs (correct for current Medi Can network).
- **Dead Stock Breakdown**: 7-column table, 3 age bands (60-90d / 91-180d /
  181+d write-off risk), local flag toggle, capital as % of store value
- Data footnote documenting last_movement_at efficiency, dispensing_log branch,
  AVCO-correct LL-242, transfer SKU match key

### Customer Intelligence (WP-ANALYTICS-5, COMPLETE — S1 + S2)
**S1 live:**
- Network Customer Summary: Total members, Active this month, At-Risk, Points economy
- Loyalty Tier Distribution by store: 5-tier palette (bronze/silver/gold/platinum/
  harvest_club — confirmed enum from Step 0)
- Cohort Health by store: New / Active / At-Risk / Lapsed / Dormant with
  churn_risk_score annotation from nightly AI engine
- CSV export (8 columns)
- POPIA-compliant: user_profiles SELECT is 8 non-PII columns only. Verified
  via devtools network payload inspection.
- Data footnote documenting Africa/Johannesburg timezone, loyalty_tiers
  non-existence, campaign ROI deferral, Section 6 POPIA exception

**S2 live:**
- **Section 5 AI Engine Activity** — reads loyalty_ai_log (actual table
  name per Step 0 — not ai_action_logs). Live action types at
  verification: churn_rescue, birthday_bonus, stock_boost_suggestion
  (the Step 0 addendum confirmed `stock_boost_suggestion` as the actual
  enum value, not the spec's `stock_boost`). "Other" bucket catches any
  future action_type so the network total stays authoritative. Honest
  empty-state when the current-month filter returns zero rows.
- **Section 6 Top Customers per store** — POPIA-safe initials + masked
  UUID only via the `deriveInitials` helper in fetchStoreLoyalty.js.
  Full_name is SELECTed server-side, consumed in the transform loop,
  and immediately discarded. React state and the rendered DOM never
  contain full names. Sort: monthly_spend_zar DESC with loyalty_points
  tiebreaker. Collapsible per-store card pattern matching Cohort Health.
  POPIA Compliance Declaration comment block at the top of the render
  function prevents future maintainers from widening the SELECT list.

**Permanently deferred:**
- Section 4 Campaign ROI — the `loyalty_campaigns` table does not exist
  in the live schema. The `includeCampaigns` option on fetchStoreLoyalty
  is a voided no-op. A schema design decision is required before this
  section can be built.

### Group Settings
- Edit network name, group type, royalty rate
- Member stores table with role, profile, member since, Remove action
- Add-a-store via UUID paste (LL-243 email invite deferred)
- Danger zone: Leave network protection for owner

---

## THE FINANCIAL INTELLIGENCE SUITE — WHAT IT DOES

This is not a dashboard. It is a complete IFRS-compliant accounting system
derived from live operational data. Every financial statement is generated
from actual transactions — no manual entry of summary figures.

- **Income Statement**: Revenue from orders, COGS from AVCO, expenses from
  expenses table. 62.13% gross margin, R296,606 net profit (live figures).
- **Balance Sheet**: Assets (cash/inventory/PP&E), liabilities (payables/VAT),
  equity. All from live data.
- **VAT Module**: VAT201 format, 3-point automated pipeline (P3-A + P3-B + P3-C)
- **Fixed Assets**: IAS 16, straight-line depreciation
- **Journals**: Double-entry, COA picker, post/reverse, auto-type from Smart Capture
- **Bank Reconciliation**: FNB account, R180,733.69 reconciled
- **Year-End Close**: 4-step wizard, closing journal, lock, archive
- **15 IFRS disclosure notes** from live data

Current live figures: R477,880 revenue · 62.13% gross margin · R296,606 net profit

---

## THE SMART SYSTEMS — WHAT MAKES THIS SPECIAL

### QR Authentication & Intelligence Network
- HMAC-SHA256 cryptographic signing — same algorithm class as banking
- GPS coordinates, device fingerprint, timestamp on every scan
- Velocity fraud detection
- Loyalty points awarded per scan with tier/campaign multipliers
- 181 scans logged · 60 active codes · 62 system alerts

### Smart Capture & Automated Accounting
- AI reads any business document (invoice, delivery note, COA, receipt)
- 6-level HMAC anti-fraud fingerprint — prevents duplicate invoice submission
- SARS compliance check on every invoice capture
- Atomic: expense + double-entry journal + VAT trigger = one approved capture
- Zero manual entry anywhere in the accounting pipeline

### AVCO Inventory Intelligence
- Weighted average cost recalculated by DB trigger on every stock movement
- 14 Product Worlds with custom fields per type
- AI-scored velocity-weighted reorder recommendations — draft PO creation
- 3-step receiving workflow with VAT capture
- 2,289 stock movement records — complete audit trail

### Loyalty & AI Customer Engine
- 10-tab programme: tiers, campaigns, referrals, simulator, AI Engine
- Nightly AI engine: churn rescue, birthday bonus, stock boost, point expiry
- WhatsApp notifications via Twilio on tier upgrades
- 401 loyalty transactions · 189 AI action logs

### ProteaAI (LOCKED — read-only)
- Natural language → live SQL via ai-copilot EF v59
- Context-aware per portal tab
- systemOverride for custom system prompts (used by Smart Capture)

---

## THE DESIGN SYSTEM — YOUR QUALITY STANDARD

Everything visual in NuAi is built to WP-DS-6 (the sixth iteration of the
design system). This is not optional. Every new component inherits from it.

```js
import { T } from "../../styles/tokens";
```

**What T.* gives you:**
- `T.container.{narrow|default|wide|full}` — layout containers
- `T.page.{sectionGap|cardGap|gutterX|gutterY}` — page spacing
- `T.gap.{xs|sm|md|lg|xl|xxl}` — component gaps
- `T.pad.{xs|sm|md|lg|xl|xxl}` — component padding
- `T.inset.{card|modal|section|page|tight}` — inset patterns
- Full semantic colour family × Light/Text/Mid/Border variants
- `T.text.{xs..4xl}` — type scale
- `T.weight.{normal|medium|semibold|bold}` — weights

**LL-238 is absolute:** Zero hardcoded px values that match a token.
Zero local `const T = {...}` redefinitions. If you hardcode `padding: 16px`
when `T.pad.md` exists, you are breaking the system.

**Colour semantics:** `T.successLight` is a surface background. `T.successText`
is for text on that surface. `T.success` (mid) is for visual elements like
chart fills. Never put body text on `T.success` — contrast fails.

**The visual language:** Flat, no gradients, no decorative effects. Clean
card surfaces with 0.5px borders. Generous whitespace. IndustryPill for
profile indicators. StatusChip for counts. HealthBar for proportional
distributions. These patterns repeat across all analytics components —
learn them, reuse them, do not reinvent them.

---

## THE INDUSTRY PROFILE SYSTEM — THE COMPLEXITY MULTIPLIER

One codebase. Four completely different operational realities.

### cannabis_retail (default)
Standard retail: strains, THC/CBD percentages, molecule education, QR auth.
Revenue from `orders`. COGS from `order_items.product_metadata.weighted_avg_cost`.

### cannabis_dispensary (SAHPRA-gated)
SAHPRA compliance, prescriptions, dispensing log. Revenue from
`dispensing_log.quantity_dispensed × inventory_items.sell_price` — NOT from
orders. COGS from current `inventory_items.weighted_avg_cost`. VAT does NOT
apply (Schedule 6 controlled substance). This is LL-231 — never mix revenue
sources between profiles.

### food_beverage (16,085 exclusive lines)
SA DAFF ingredients, HACCP, allergens, cold chain, nutrition labels, recall
management, FSCA letters (SA R638 compliance). Completely separate module tree.

### general_retail
Standard SKU management. No cannabis-specific fields.

**Every analytics component must branch on `industryProfile`**. The
dispensary branch is not optional — failing to implement it causes silent
data errors (zero velocity, wrong revenue) with no error thrown. This is
the most common class of data-corruption bug in the codebase.

---

## THE ARCHITECTURAL PATTERNS — HOW THINGS ARE BUILT

### The _helpers/ pattern (Group Portal)
Every data-fetching concern for the Group Portal lives in
`src/components/group/_helpers/`. Each helper:
- Is a named async function (not a hook)
- Never throws — errors land in `result.err` with partial results preserved
- Has an `options` parameter that gates extended/velocity queries
- Returns a predictable shape regardless of error state

Current helpers:
1. `fetchStoreSummary.js` — MTD revenue, margin, stock health, top products
2. `industryBadge.js` — INDUSTRY_BADGE data object {bg, fg, label}
3. `fetchStoreFinancials.js` — P&L for a date range
4. `fetchStoreTrend.js` — Timestamped revenue + bucketing helpers
5. `fetchStoreInventory.js` — Inventory snapshot + velocity + health flags
6. `fetchStoreLoyalty.js` — Customer cohort + points economy + AI log + top customers

### The paste-bug checklist (5 canonical patterns)
Run on every Claude.ai-generated component before commit:

1. **INDUSTRY_BADGE** is a data object `{bg, fg, label}` — NEVER a React component
2. **Unused props** — void with `void propName;` or remove
3. **groupName in h2** — every Group Portal component shows `· {groupName}`
4. **Unused variables** — walk every const; build checker catches most but not dead object properties
5. **Chart Line name** — always `<Line name={m.tenants?.name}>` never UUID

### The session close protocol (non-negotiable)
Every analytics module session must close with:
1. Update `docs/WP-ANALYTICS.md` — module status + HEAD hash
2. Update the module's own `docs/WP-ANALYTICS-N.md` header
3. Write next module's detailed spec before closing (if not already done)
4. Append addendum to `docs/SESSION-STATE_v240.md`
5. Write `NEXT-SESSION-PROMPT_v{N+1}.md` · delete previous
6. Single commit with full narrative

This protocol exists because the strategic context (architectural decisions,
Step 0 schema findings, data quality notes) cannot be reconstructed from
code alone. **The docs ARE the strategic memory.**

---

## WHAT'S KNOWN TO BE WRONG — THE HONEST STATUS

### HQTransfer historical AVCO corruption (LL-242)
The forward-fix landed at `713ef3a`. Pre-fix destination `weighted_avg_cost`
values are not retroactively corrected. Dedicated session pending: read-only
audit first, recompute per affected row, owner approval before any UPDATE.

### Cross-tenant "View store →" navigation (Phase 4b)
All "View store →" buttons in the Group Portal currently log to console.
Real implementation requires: auth check, `switchTenant()` from tenantService.js,
return path to `/group-portal`. The buttons show greyed state — no user-visible
staging text (Phase 4 label was removed).

### Transfer pre-selection (Phase 4b)
"Transfer stock →" buttons navigate to the transfers tab but don't pre-populate
FROM/TO store. State passing from StoreComparison/StockIntelligence →
GroupPortal → GroupTransfer needed.

### GroupSettings email invite (LL-243)
Currently requires pasting a tenant_id UUID. Email-based invite is Phase 5b.
The UI has an honest "coming in a future release" note.

### loyalty_campaigns table (WP-ANALYTICS-5 Section 4)
Campaign ROI is permanently deferred — the table does not exist in the schema.
A schema design decision is required before this section can be built.

### Medi Recreational AVCO gap
172 of 186 items have `weighted_avg_cost = 0` — simulator-seeded data that
never went through the receiving workflow. The UI surfaces this honestly via
"N items with no AVCO set" disclosures. Real receiving will populate via trigger.

---

## THE WP-ANALYTICS SUITE — WHERE WE ARE

| # | Module | Status | What it does |
|---|---|---|---|
| 1 | Store Comparison | ✓ COMPLETE | How do stores compare across revenue, margin, orders, stock? |
| 2 | Combined P&L | ✓ COMPLETE | IFRS consolidated P&L across all stores with COGS-correct branching |
| 3 | Revenue Intelligence | ✓ COMPLETE | SSSG growth, peak trading, top products, 30/60/90d windows, projections |
| 4 | Stock Intelligence | ✓ COMPLETE | Slow movers, fast movers, transfer opportunities, dead stock, velocity |
| 5 | Customer Intelligence | ✓ COMPLETE | Cohort health, tier distribution, points economy, AI engine activity, top customers |
| 6 | Network Intelligence | ▶ SPEC READY | Health scores, alert centre, benchmarking, royalty calculator |

When Module 6 ships, the Group Portal will give a franchise owner a complete
cross-store intelligence layer that no single-store view can provide. They
will be able to see:
- Which store needs attention right now (Alert Centre)
- How each store is performing holistically (Health Score)
- How every metric compares across the network (Benchmarking Table)
- What royalties are owed (Royalty Calculator)
- Where customers are churning (Cohort Health)
- What stock is stuck or running out (Stock Intelligence)
- What is selling and at what margin (Revenue Intelligence)

This is not a reporting dashboard. This is operational intelligence.

---

## THE LIVE DATA — MEDI CAN FRANCHISE NETWORK

The first production franchise network on NuAi. Two stores.

| Tenant ID | Name | Role | Profile |
|---|---|---|---|
| `2bd41eb7-1a6e-416c-905b-1358f6499d8d` | Medi Can Dispensary | Franchisor | cannabis_dispensary |
| `b1bad266-ceb4-4558-bbc3-22cfeeeafe74` | Medi Recreational | Franchisee | cannabis_retail |

Test credentials: `medican@nuai.dev` / `MediCan2026!` → `/group-portal`

Live snapshot (12 April 2026):
- Combined revenue MTD: R6,000 (dispensary only — Medi Recreational has R0 in April)
- Network stock value: R136,600 AVCO-weighted (172 items have no AVCO on Medi Rec)
- Network members: 51 (1 dispensary · 50 retail)
- Active members: 45 (88.2%)
- At-risk: 4 members (31–60 days no purchase)
- Fast movers: 9 critical restock items on Medi Recreational
- Dead stock: R5,328 across 9 items (3.9% of network inventory value)

---

## THE STANDARD OF EXCELLENCE

Every agent who touches this codebase is expected to:

**Read before writing.** LL-221 is not bureaucracy — it prevents overwriting
working code with assumptions. Disk is truth. Always.

**Surface data quality honestly.** The AVCO missing disclosures, the R0 honest
values, the "No orders this period" states — these are features, not failures.
A system that shows honest empty states is more trustworthy than one that hides
data quality problems.

**Branch on industry profile.** The dispensary branch in fetchStoreInventory
prevented silent zero-velocity data for Medi Can Dispensary. This kind of
attention to the profile system is what makes the analytics trustworthy.

**Test the paste-bug checklist.** The 5-pattern checklist has caught real bugs
before every significant commit. It is not optional.

**Close sessions cleanly.** The docs are the memory. A future agent reading
`docs/SESSION-STATE_v240.md` should be able to reconstruct every architectural
decision made in this system without reading the code. Write addendums that
earn that trust.

**Hold the design system.** WP-DS-6 tokens are not a suggestion. Consistent
visual language across 224,293 lines of code is a feature that took deliberate
effort to build. Protect it.

**Know what you're working on.** This system will serve real businesses making
real financial and operational decisions from its data. The AVCO calculations,
the POPIA compliance, the SARS VAT pipeline — these are not academic exercises.
They are the difference between a compliant business and a liability.

---

## HOW TO ORIENT AS A NEW AGENT

1. Read this document (done)
2. Read `docs/PLATFORM-OVERVIEW_v1_0.md` — scale and system overview
3. Read `CLAUDE.md` (at repo root, v2.0) — your operational instructions
4. Read `docs/SESSION-STATE_v240.md` — current state + all addendums
5. Read `docs/NUAI-AGENT-BIBLE.md` — the LL rules, patterns, violations
6. Read the current `docs/NEXT-SESSION-PROMPT_v{N}.md` — your priority queue
7. Run `git log --oneline -5` — confirm HEAD
8. Read the actual files you are about to touch (LL-221)

Only then: write code.

---

## THE VISION

NuAi is becoming the reference standard for AI-assisted ERP development.
A platform where:
- Every financial figure traces back to a real transaction
- Every operational decision has a data foundation
- Every industry profile is served correctly without branching the codebase
- Every franchise owner can see their entire network in one view
- Every AI-generated component meets a published quality standard
- Every agent who contributes understands why their work matters

The Group Portal analytics suite is the most recent expression of this vision.
Modules 1–5 are live against a real franchise network. Module 6 will complete
the arc from "isolated tenant view" to "complete cross-store intelligence."

When you write code for this system, you are not writing features.
You are building the infrastructure of a business.

Hold it to that standard.

---

*NUAI-STRATEGIC-INTELLIGENCE v1.0 · 12 April 2026*
*Owner-directed. Every agent reads this. Never replace — only append.*
*Companion documents: PLATFORM-OVERVIEW_v1_0.md · NUAI-AGENT-BIBLE.md ·*
*SESSION-STATE_v240.md · WP-ANALYTICS.md · NEXT-SESSION-PROMPT_v{current}.md*

---

## ADDENDUM 1 — 12 April 2026 (NUAI-STRAT-INTEL landed + WP-A5 COMPLETE)

### What shipped

1. **WP-ANALYTICS-5 Session 2** — CustomerIntelligence Sections 5 and 6
   live at commit `388520c`. Section 5 AI Engine Activity reads
   `loyalty_ai_log` (actual table name), Section 6 Top Customers uses
   the POPIA-safe `deriveInitials` pattern with `full_name` consumed
   and discarded inside the helper. Module 5 is now COMPLETE.

2. **NUAI-STRATEGIC-INTELLIGENCE v1.0** — this document itself, created
   and landed in the same session close commit. Integrated into the
   orientation read loop at every agent-touch surface:
   - `CLAUDE.md` Step 0 (before existing actions)
   - `docs/NUAI-AGENT-BIBLE.md` header reference
   - `docs/PLATFORM-OVERVIEW_v1_0.md` footer addendum
   - `docs/NEXT-SESSION-PROMPT_v248.md` Step 0 of the mandatory reads
   - `docs/SESSION-STATE_v240.md` Session Close Protocol Step 3b
     (the 5-question review) — this addendum itself is the first
     exercise of that protocol.

3. **WP-ANALYTICS-6.md** — Module 6 Network Intelligence detailed spec
   on disk for the next session. The final module in the suite.

### Session Close Protocol Step 3b — 5-question review

Per the new protocol added to SESSION-STATE v240:

1. **Did we ship a new capability?** YES — Customer Intelligence
   Sections 5 and 6. Updated the Group Portal capability map in the
   Customer Intelligence section.
2. **Did we fix a known issue?** NO material fix this session — the
   loyalty_campaigns deferral remains in the Known Issues list.
3. **Did Step 0 reveal new schema facts?** Confirmation-only — the
   lightweight S2 Step 0 verified that `full_name` on user_profiles is a
   single combined field (no first_name / last_name split) and that
   live AI action_type values remain `churn_rescue`, `birthday_bonus`,
   and `stock_boost_suggestion`. No new facts beyond the S1 Step 0
   addendum.
4. **Did the live data snapshot change materially?** NO — Medi Can
   Franchise Network snapshot is unchanged from the S1 close. The
   Medi Recreational AVCO gap and 4 at-risk customers remain. S2
   verification surfaced a cosmetic UX issue on the Medi Can
   Dispensary cohort render (1 member counted in both New and Dormant
   causing a > 100% total in the cohort bar) — added to Known Issues
   in SESSION-STATE Addendum 3 as non-blocking.
5. **Did a new LL rule emerge this session?** NO new canonical LL.
   The POPIA narrow-exception pattern for `full_name` is already
   captured in WP-ANALYTICS-5.md's Step 0 addendum and in the
   `deriveInitials` helper's in-file documentation.

### What this addendum changes in the body above

- Customer Intelligence capability section updated from "S1 complete
  — S2 in progress" to "COMPLETE — S1 + S2" with full S2 section
  descriptions and the permanent Section 4 deferral note.
- WP-ANALYTICS suite table Module 5 row bumped from "S1 LIVE" to
  "COMPLETE".

*Addendum 1 written 12 April 2026 · HEAD at write: `388520c`*
*Session close commit integrates this addendum + 10 other structural*
*changes in a single bundle. NUAI-STRAT-INTEL is now a living document*
*reviewed at every session close per Protocol Step 3b.*
