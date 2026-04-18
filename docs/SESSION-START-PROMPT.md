# NUAI — SESSION START PROTOCOL
## Read live from the repo at every session start (LL-292).
## Updated: 19 April 2026 — Session S-2B.6 close (WP-FIN-004 PRs 1-3 shipped — HEAD f5a2332)
## THIS FILE HAS NO VERSION NUMBER. IT IS UPDATED IN-PLACE EVERY SESSION.
## Detail lives in the loop docs. This file is the entry point only.
## If you are writing NEXT-SESSION-PROMPT_vXXX.md — STOP. Update this file instead. (LL-264)

---

You are the AI development partner for **NuAi** — a production multi-tenant
SaaS ERP platform. 224,293 lines of code. 109 DB tables. 6 portals.
4 industry profiles. CA demo date: **PENDING CONFIRMATION** (was 12 May 2026).

**Tools:** GitHub MCP (READ ONLY — RULE 0Q), Supabase MCP (FULL ACCESS).
**Repo:** github.com/GFive5y/protea-botanicals — main
**Supabase:** uvicrqapgzcdvozxrreo — HEAD: f5a2332

---

## LOAD CONTEXT — MANDATORY, IN THIS ORDER

1. `docs/PLATFORM-OVERVIEW_v1_0.md`
2. `docs/NUAI-AGENT-BIBLE.md`
2b. `docs/NUAI-VISUAL-SPEC.md` — read before touching ANY visual code
3. `docs/PENDING-ACTIONS.md`
4. `docs/VIOLATION_LOG_v1_1.md`
5. `docs/LL-ARCHIVE_v1_0.md` (LL-285 through LL-290 are recent — LL-288/289/290 new in S293)
6. `docs/WP-TABLE-UNIFY_PHASE2_v1.md` — MANDATORY if next priority is Phase 2 exploration

After reading, confirm out loud:
- Current HEAD (verify via `git rev-parse HEAD` — should be at or past the most recent session close commit)
- DS6 status: COMPLETE (all portals, HQ, HR, Admin, Consumer — see below)
- WP-TABLE-UNIFY Phase 1 status: COMPLETE (HQFoodIngredients 85% clean, remainder is
  Bucket B CATEGORIES palette structural decision — post-demo)
- All open loops from PENDING-ACTIONS.md
- Any new violations

### OPTIONAL STRATEGIC CONTEXT (read when scoping GTM or customer-facing decisions)

7. `docs/NUAI-STRATEGIC-DEEP-DIVE_v1_0.md` — working analysis of
   market position, competitor scan, and three recommended GTM
   paths (franchise channel, accounting firm channel, industry body
   partnership). Produced S-2B.2. Not binding. Read when a decision
   has commercial/market context; skip for pure engineering work.

---

## STANDING ALERT

sim-pos-sales MUST run the day BEFORE the CA demo.
Trigger date: PENDING (depends on demo date confirmation).
IF DEMO DATE CHANGES: update PENDING-ACTIONS.md first, then this file.

---

## CURRENT STATE — 19 April 2026 — WP-FIN-004 PRs 1-3 shipped + Phase 2B SHIPPED

### WP-FIN-004 PARTIAL SHIP — 19 April 2026 — PRs 1-3 landed

Trial Balance engine + GL detail engine + React TB tab + drill drawer.
Three PRs, three verification gates, three tenants balance-checked at R0.00.
PR 4 (Excel export via SheetJS) and PR 5 (audit log + docs close) deferred
to next session.

**Shipped this session:**
- 067e7f0 — PR 1: fn_trial_balance Postgres function + expense_subcategory_account_map
- 0dec469 — PR 2: fn_gl_detail Postgres function (double-entry expansion)
- f5a2332 — PR 3: React Trial Balance tab + GL drill drawer

**Data correctness fix bundled with PR 1:** equity_ledger.opening_retained_earnings
backfilled for all 5 demo tenants (was silently R0.00, absorbed by on-screen
BS's live-P&L equity plug). Garden Bistro R23,672.74, MediCare R58,380.30,
Metro Hardware R3,368,494.23, Medi Recreational R116,188.76, Nourish R89,364.56.

**Remaining in WP-FIN-004:**
- PR 4: src/services/trialBalanceExcel.js + SheetJS 5-sheet workbook (~1.5h)
- PR 5: audit log entry + LOOP-FIN-004 close + docs (~0.5h)

See DECISION-JOURNAL entry S-2B.6 for full scope, 9 bugs fixed, 5 LL candidates.

### Phase 2B SHIPPED (all 5 PRs landed)

### WHY PHASE 2B MATTERS — READ THIS BEFORE SCOPING ANY OF 2B.3/2B.4/2B.5

Phase 2B is not just another sub-phase. It is the commercial thesis
of the platform's F&B offering. Every future planner opening this
file should understand, before reading a single line of per-PR scope:

- **Market position:** No SA F&B product has AI ingredient ingest today.
  International systems that do (Apicbase, SAP Food One) sit at
  GBP2000-GBP10000+/mo. NuAi's delivery of this feature at its current
  price point is the single biggest commercial differentiator in the
  product.
- **Demo moment:** "Photograph an invoice -> 10 ingredients appear with
  allergens, HACCP, nutrition, supplier links." 30 seconds. This is
  the moment the room goes quiet in a CA demo.
- **Current state:** Backend shipped (2B.1 + 2B.2). Queue table live,
  EF v62 live, regression-verified on 10 synthetic Premier Foods
  ingredients. UI layer (2B.3 + 2B.4) is the remaining 6.5h of work
  that makes it visible.
- **Scope doc:** `docs/WP-TABLE-UNIFY_PHASE2_v1.md` Section 11 is the
  canonical "what success looks like." Read it before scoping.

Do NOT treat 2B.3 as "a 3-hour upload button." It is 3 hours of work
ON THE CRITICAL PATH TO THE PLATFORM'S COMMERCIAL STORY. Scope
it accordingly.

### WP-TABLE-UNIFY PHASE 1 — HQFoodIngredients DS6 Migration — COMPLETE

6 PRs shipped across Sessions 292 and 293. 362 violations → ~55 violations
(85% reduction). Remaining ~55 are all Bucket B (CATEGORIES palette
structural decision) plus intentional content colours already documented
inline (HACCP_COLORS, TEMP_COLORS, C.blue). All post-demo work.

| PR | Shipped as | Cleared | Notes |
|---|---|---:|---|
| 2a  | ffe1cf4 | 5   | C block cleanup (S292) |
| 2d  | f63e61f | 201 | Mechanical codemod (S292) |
| 2b.1| 502cb07 | —   | 3 new tokens: text.smPlus, radius.smPlus, radius.mdPlus (S293) |
| 2b.2| caacf50 | 67  | Applied 2b.1 tokens + safe hex remaps (S293) |
| 2b.3| 7a48557 | —   | HACCP/TEMP colour migration parked with inline docs (S293) |
| 2b.4| f3f9001 | 17  | Template-literal fixes + round-ups + 11 intentional-value comments (S293) |
| 2b.4-corrections | 759c321 | — | 3× gap:10 corrected T.gap.md → T.gap.sm, toast shadow → T.shadow.lg, 9 inline justification comments (S293) |

**Codemods preserved at `scripts/pr2d_codemod.js` and `scripts/pr2b2_codemod.js`**
for audit trail (pending commit — see Session 293 instructions below).

### DS6 VISUAL UNIFICATION — COMPLETE (Session 286)

Master visual spec: docs/NUAI-VISUAL-SPEC.md — mandatory before any visual code.

**DS6 is complete across all primary surfaces.** Every portal shell,
HQ component, HR component, admin component and consumer page has been
unified to the T token system. This was the entire focus of Session 286.

#### Tokens foundation (commit 9d0da07)
- `src/styles/tokens.js` — CRITICAL FIXES:
  - Added 5 missing *Bd border tokens: `successBd`, `warningBd`, `dangerBd`,
    `infoBd`, `accentBd`. Without these every `border: 1px solid ${T.xxxBd}`
    across all bridge files rendered as `border: 1px solid undefined`.
  - Converted `radius` values from numbers to px strings ("4px", "8px", etc)
    so multi-corner template literals like `` `${T.radius.lg} ${T.radius.lg} 0 0` ``
    produce valid CSS. Previously produced "12 12 0 0" (no units = invalid).

#### All 6 portal shells ok
HQDashboard · TenantPortal · AdminDashboard · HRDashboard · StaffPortal ·
WholesalePortal

#### All HQ components ok (21 files)
HQStock (Phase 2a+2b) · HQBalanceSheet · ExpenseManager · HQProfitLoss ·
HQDocuments · HQTradingDashboard · HQVat · HQLoyalty · HQAnalytics ·
HQOverview · HQCogs · HQJournals · HQBankRecon · HQFixedAssets ·
HQFinancialStatements · HQPurchaseOrders · HQSuppliers · HQPricing ·
HQProduction · SmartInventory · PlatformBar

#### HQFoodIngredients.js — now 85% DS6-compliant (Session 292/293)
Full six-PR migration as above. Remaining violations all structural/content.

#### All HR components ok (15 files)
AdminHRPanel · HRStaffDirectory · HRLeave · HRTimesheets · HRContracts ·
HRDisciplinary · HRPayroll · HRPerformance · HRRoster · HRCalendar ·
HRComms · HRLoans · HRSettings · HRStaffProfile · HRStockView

#### Admin components ok
AdminQRCodes · StockControl

#### All consumer pages ok (5 files)
Account · Shop · CheckoutPage · Redeem · WholesalePortal
IMPORTANT: Cormorant Garamond + Jost fonts are intentionally preserved on
ALL 5 consumer-facing pages. These are brand typography choices, not violations.
Do NOT replace them with T.font on consumer pages.

#### Remaining (optional, not blocking demo)
7 Admin tab components: AdminCommsCenter · AdminCustomerEngagement ·
AdminFraudSecurity · AdminNotifications · AdminShipments ·
AdminBatchManager · AdminProductionModule
These inherit correct font/spacing from AdminDashboard shell. Internal
raw hex / fontSize violations are cosmetic only.

### FINANCIAL PACKAGE — ALL 5 DEMO TENANTS COMPLETE
DO NOT re-run financial seeding. DO NOT touch equity_ledger without LL-248 + LL-273.
All bank recons at 0 unmatched lines.

| Tenant | Industry | Fin Suite | Bank Recon |
|---|---|---|---|
| The Garden Bistro | food_beverage | COMPLETE | 0 unmatched |
| Medi Recreational | cannabis_retail | COMPLETE | 0 unmatched |
| Nourish Kitchen & Deli | food_beverage | COMPLETE | 0 unmatched |
| MediCare Dispensary | cannabis_dispensary | COMPLETE | 0 unmatched |
| Metro Hardware (Pty) Ltd | general_retail | COMPLETE | 0 unmatched |

### MEDICARE DISPENSARY — SPECIFIC DATA STATE (Session 288)
- equity_ledger: net_profit_for_year = -263,672.76 · share_capital = 623,022.64
  total_equity = 359,349.88 = total_assets → BS balanced, IFRS IS consistent
- depreciation_entries: all months posted from purchase to Apr 2026
- dispensing revenue source: dispensing_log!inner(sell_price) + eq(is_voided,false)
- loyalty_config: inserted (was missing)

### MEDI RECREATIONAL — SPECIFIC DATA STATE (Session 288)
- FA-001 (Display Refrigerator): accum_dep R5,400 · NBV R7,100 (27 months posted)
- FA-002 (Security Camera): accum_dep R6,425.52 · NBV R2,474.48 (26 months posted)
- FA-003 (Shop Fitout): accum_dep R11,250 · NBV R33,750 (30 months posted)

### GROUP PORTAL — COMPLETE (Session 282)
NuAi Demo Portfolio (a55373b2) · 6 stores · All 8 tabs verified working.

### OPEN LOOPS (see PENDING-ACTIONS.md for close conditions)
- No blocking loops open. All items tracked in DEBT_REGISTER_v1.md.

### CLOSED THIS SESSION (2B.4 + 2B.5) — 19 April 2026
Phase 2B fully shipped. Commits this session:
- **a166174** — PR 2B.4: Ingest Queue tab + FoodIngestQueuePanel.js
  (review drawer, confidence badges, approve/reject), fn_approve_ingested_ingredient
  RPC (single-txn approve path), FNB_SUBCATEGORY_TO_CATEGORY map in FoodWorlds.js,
  HQFoodIngredients.js tab wiring + pending count badge + onSuccess tab switch,
  5-case regression harness (scripts/regression/2b4_queue_approve.js).
- **b18b092** — Hotfix 2B.3.1: tenant_id missing from FoodIngestModal.js EF
  invocation body. Two lines added (upload + paste paths). Root cause: PR 2B.3
  never ran end-to-end against real tenant context. Surfaced LL-307.
- **(this commit)** — PR 2B.5 gate: Decision Journal entries (S-2B.4 + S-2B.4-hotfix),
  LL-306 + LL-307 escalated to Bible, LOOP-WTU-003 closed in PENDING-ACTIONS,
  2 post-demo WPs logged (WP-FOOD-INGEST-POLISH, WP-EF-ERROR-PASSTHROUGH),
  WP-TABLE-UNIFY_PHASE2B-SPLIT_v1.md marked fully shipped with closure note.
- All 10 regression test assertions passed on Garden Bistro.
- Known post-demo polish: nutrition panel not rendered in drawer; source-context
  block (pack_size, supplier, cost) not rendered; temperature_zone select
  missing "hot" option; quantity not surfaced. All logged under WP-FOOD-INGEST-POLISH.

### CLOSED THIS SESSION (2B.3) — 19 April 2026
Four commits shipped this session. Full chain:
- **1aafbbd** — AGENT-METHODOLOGY continuous-capture preamble added
  to Section 2. Cross-cutting habit (notice-it-log-it) named at
  procedure level. Evidence session: S-2B.2-preservation. Not
  escalated to LL status yet — requires 2+ recurrences.
- **cf7974c** — PR 2B.3 shipped: HQ "+ Add from Document" modal.
  New component src/components/hq/food/FoodIngestModal.js (~600L,
  640px modal, 3 tabs Upload/Paste/URL-coming-soon, drop zone + file
  picker + paste). HQFoodIngredients.js wired with industryProfile
  destructure + showIngestModal state + header button gated on
  isTenantHq && industry_profile === "food_beverage" + onSuccess
  toast. Audit placemarker fires on successful extract via
  logAudit({action: "ingredient.ingest.extract", ...}). Phase 2F
  mobile placemarker banner present.
- **d0bb6af** — Strategic deep-dive captured as
  docs/NUAI-STRATEGIC-DEEP-DIVE_v1_0.md (635L working doc, not
  binding strategy). Three WPs logged in PENDING-ACTIONS backlog:
  WP-INGEST-RATE-LIMIT (blocks first paid F&B contract),
  WP-UNIT-ECONOMICS (pre-revenue gate), WP-PILOT-FORMALISATION
  (reference-customer gate). Decision Journal entry
  S-2B.2-strategic captures reasoning + three 2B.3 copy decisions
  traceable to the doc. Optional-read section added to this file
  (position 7, explicitly not mandatory).
- **9ef764f** — Three copy refinements against the shipped 2B.3
  files: (a) mobile placemarker banner reframed as concrete 2F
  value — "Desktop ingest is live today. Phase 2F adds mobile
  Smart Capture — photograph ingredients at the stock-receiving
  point for receive-and-go ingestion." (b) Extraction progress
  replaced with 3-stage faux-progress stack (Reading… / Identifying
  allergens + HACCP… / Matching SA suppliers + R638…) + 8-15
  seconds sub-line. Spinner alignment: alignItems flex-start,
  flexShrink 0, marginTop 2 on spinner. (c) Success toast surfaces
  allergen/HACCP/nutrition richness + honestly foreshadows 2B.4
  Ingest Queue tab. Negative branch gains "Try a clearer invoice
  or spec sheet" recovery hint.
- **Executor deviation (approved):** spec referenced T.ink500 for
  middle progress lines; that token doesn't exist in tokens.js.
  Used T.ink400 (correct muted secondary-text token, consistent
  with the rest of the modal). Planner error caught by executor —
  worth noting but not escalated to LL.
- **Planner lesson captured** (not escalated to LL yet): at one
  point planner began drafting a 2B.3 instruction block without
  checking HEAD first — 2B.3 had already shipped at cf7974c.
  Owner caught it. Mitigation: planner's first action after
  receiving owner input is a HEAD check via GitHub:get_commit
  before drafting any scope. One occurrence = journal entry;
  recurrence would escalate.
- **No new LLs this session.** The continuous-capture habit,
  the planner-HEAD-check habit, and the mandatory-read discipline
  are all in "captured, not escalated" state per the S-2B.2-methodology
  threshold (2+ recurrences before LL).

### CLOSED THIS SESSION (2B.2) — 19 April 2026
- **PR 2B.2 shipped clean** (commit 889a145, EF version 65).
  process-document v62 live on Supabase. F&B tenants now produce
  `create_food_ingredient` actions + `ingredient_ingest_queue` writes.
  All three LL-303 markers verified on deployed source
  (classifyIngredientSourceType, ingredient_ingest_queue x5,
  queued_ingredient_ids x2). Non-F&B tenants unaffected (guards
  verified via live queue = 0 rows for cannabis/dispensary/retail).
- **First direct-EF smoke test executed successfully.** Bypassed
  React layer (which hardcodes industry_profile via useTenant())
  to force `industry_profile=food_beverage` + Garden Bistro tenant.
  10 synthetic Premier Foods line items -> 10 queue rows with correct
  sub_category, HACCP risk, and R638 allergen intrinsic-containment.
  Test artefacts cleaned up post-verification (0 residual rows).
- **Python/Node test harness pivot.** First smoke test attempt
  failed on Windows due to base64 text-file encoding corruption.
  Rebuilt in pure Node.js with binary buffer read + PNG magic byte
  verification. See DECISION-JOURNAL entry S-2B.2 and LL-305.
- **New LLs:** LL-304 (direct-EF smoke test as planner-side
  regression proxy when React layer doesn't exercise the new
  code path), LL-305 (Windows encoding trap — prefer binary
  reads over text/shell chains for base64 or other binary data).

### CLOSED SESSION 320 — 18 April 2026
- **Architecture docs landed** (4 commits): Phase 2 scope amendment, Principle 7 +
  Procedure 6 (planner/executor rhythm), Two-HQ architecture addendum + WP-HQ-GRANULARITY,
  Phase 2A split plan (4 PRs).
- **PR 2A.1 shipped** (31e93d3): ViewToggle + FoodListView + FoodTileView + wire-up.
  3 new files under src/components/hq/food/. HQFI dropped 197 lines.
- **RLS incident discovered + fixed:** Platform-wide 42P17 recursion on user_profiles.
  `tenant_admins_own_users` inlined subquery against own table. Fix: `user_tenant_id()` helper.
  LL-300 (pattern), LL-301 (audit lesson), LL-302 (session-start audit queries).
- **Audit 2 finding:** ~100 policies inline-query user_profiles. Logged as WP-RLS-HYGIENE.
- **WATCH-012:** financial_statement_notes legacy `role = 'operator'` pattern.

### CLOSED SESSION 319 — 18 April 2026
- **GAP-002 FIXED** — Cash flow opening/closing balance reconciliation.
  Commit 1: Frontend (+1 query to bank_accounts, +3 render rows, updated note).
  Commit 2: EF deploy (mirrored reconciliation on PDF page 4).
  Register framed as "new infrastructure needed" — disk showed bank_accounts.opening_balance
  column existed with 4/6 tenants seeded. Fix was wiring, not infrastructure (LL-075).

### CLOSED SESSION 318 — 18 April 2026
- **Capstone-003 — campaign retrospective synthesis.** 5 artifacts:
  1. DEBT_REGISTER_v1 Section 6: pattern tagging (findings → methodology cross-ref)
  2. AGENT-METHODOLOGY Section 4: Failure Mode Evidence Map (FM1-FM8 grounded)
  3. LOOP-CALIBRATION.md (new): measured rates — 11/12 under-count, median +40%
  4. LL-299: planner/executor split value (S317 caught calendar-year bug outside register)
  5. Archived _migration_backup_s309 (174 rows, retention verified)
- **Campaign arc closed.** S293-S317 safety + financial campaigns fully synthesized.

### CLOSED SESSION 317 — 18 April 2026
- **FIN-002 FIXED** — Computed FY label from tenant's financial_year_start.
  Also fixed HQTenants.recalcNetProfit calendar-year P&L period bug. LL-297.
- **FIN-003 FIXED** — Per-tenant VAT divisor from tenant_config.vat_rate.
  tenantService hydrates vat_rate. 3 module constants removed. LL-298.
- **FIN-006 FIXED** — Embedded equity_ledger join sorted by financial_year desc.
- **FINANCIAL DEBT COMPLETE.** FIN-001 (S316) + FIN-002/003/006 (S317). All 4 fixed.

### CLOSED SESSION 316.5b.3 — 18 April 2026
- **WP-REGISTER.md created** — 32 WPs. Failure Mode 8 added.

### CLOSED SESSION 316.5b.2 — 18 April 2026
- **WP verification** — 6 reclassifications. 81% triage accuracy.

### CLOSED SESSION 316.5b.1 — 18 April 2026
- **WP triage** — 32 WP docs catalogued. Initial: 9/6/9/2/6.

### CLOSED SESSION 316.5a — 18 April 2026
- **Loop integrity audit** — 6 Class B gaps closed.

### CLOSED SESSION 316 — 18 April 2026
- **FIN-001 FIXED** — HQYearEnd equity_ledger FY filter + LL-296.

### CLOSED SESSION 315 — 18 April 2026
- **LL-251 audit maintenance.** Q5+Q6 fixed. Failure Mode 7 documented.

### CLOSED SESSION 314.4 — 18 April 2026
- **TIER 2C COMPLETE.** 146 policies fixed across 11 sessions. Zero bugs remain.

### CLOSED SESSION 314.2c — 18 April 2026
- **message_templates schema + RLS.** CRITICAL escape closed. Total: 138.

### CLOSED SESSION 314.3d — 18 April 2026
- **stock_take_* legacy migration.** 3 policies → standard pattern. Total: 136.

### CLOSED SESSION 314.3c — 18 April 2026
- **65 HQ bypass with_check.** Total: 130 policies.

### CLOSED SESSION 314.3b — 18 April 2026
- **24 HR cluster with_check fixes.** leave_types classified ACCEPTABLE.

### CLOSED SESSION 314.3a — 18 April 2026
- **11 HIGH with_check fixes** (Tier A). Scope discovery: 83 vs 37 registered.

### CLOSED SESSION 314.2b — 18 April 2026
- **11 MEDIUM RLS fixes** — RLS-020 to 030. RLS-031 parked for S314.2c.

### CLOSED SESSION 314.2a — 18 April 2026
- **BUCKET A CLEAN.** 9 sweep residuals fixed + LL-295 (QR public read design).

### CLOSED SESSION 314.1 — 18 April 2026
- **10 CRITICAL RLS policies fixed** — Bucket A + B original findings.

### CLOSED SESSION 314 — 18 April 2026
- **Tier 2C RLS audit** — 401 policies, 155 findings. See RLS-FINDINGS_v1.md.

### CLOSED SESSION 313.5 — 18 April 2026
- **SAFETY-080 FIXED + TIER 2B COMPLETE.** 90/97 NOT NULL (93%).

### CLOSED SESSION 313 — 18 April 2026
- **SAFETY-080 DECIDED** — Per-tenant copies (LL-294). LL-293 disambiguated.

### CLOSED SESSION 312 — 18 April 2026
- **SAFETY-082b CLOSED** — 6 tables cleaned + constrained. 89/97 NOT NULL (92%).

### CLOSED SESSION 311.75 — 18 April 2026
- **Loop System Architecture** — Capstone Part 2. LOOP-PRINCIPLES.md,
  DECISION-JOURNAL.md, Step 7, expanded AGENT-ORIENTATION.md + LL-292.

### CLOSED SESSION 311.5 — 18 April 2026
- **AGENT-METHODOLOGY.md** — Capstone Part 1. 5 sections, 4 procedures,
  4 patterns, 6 failure modes.

### CLOSED SESSION 311 — 18 April 2026
- **SAFETY-082 SPLIT** — 082a CLOSED (3 shared-reference tables, LL-293).
  082b OPEN (6 tables × 23 rows). Audit script updated.

### CLOSED SESSION 310 — 18 April 2026
- **SAFETY-081 FIXED** — 2 broken views dropped. Commit dd254af.

### CLOSED SESSION 309 — 18 April 2026
- **Tier 2B.2** — 3 tables cleaned + constrained. Commit 85d42ef.

### CLOSED SESSION 308 — 18 April 2026
- **Tier 2B.1** — 25 tables constrained. Commit 30b41ef.

### CLOSED SESSION 307 — 18 April 2026
- **TIER 2 WORKSTREAM A COMPLETE.** SAFETY-071/075/079 resolved. 10/10 EF findings.

### CLOSED SESSION 306 — 18 April 2026
- **verifyTenantAuth.ts** — Shared EF auth helper. Commit e63bc96.
- **SAFETY-072, 073, 074, 076, 077, 078 FIXED** — 6 EFs hardened. Commit 90be33c.

### CLOSED SESSION 305 — 18 April 2026
- **SAFETY-070 FIXED** — process-document dedup guard tenant-scoped. Commit 5404b74.
- **SAFETY-080 logged** — Supplier tenancy data debt. Parked.

### CLOSED SESSION 304 — 18 April 2026
- **Tier 2 Workstream A: EF Safety Audit** — 14 EFs audited, 10 findings
  (SAFETY-070 to 079). 6 EFs CLEAN.

### CLOSED SESSION 303.5 — 18 April 2026
- Architecture: AGENT-ORIENTATION.md, LL-287 retired, LL-292 added, Step 7 retired.

### CLOSED SESSION 303 — 18 April 2026
- **SAFETY TIER 1 COMPLETE.** 70 React-side findings, 66 fixed, 0 remaining.

### CLOSED SESSION 302 — 18 April 2026
- **SAFETY-036 to 056 (21 sites)** — CRITICAL: usePageContext.js AI context
  engine tenant isolation. Commit c3f2dc8.

### CLOSED SESSION 301 — 17 April 2026
- **Stage 5.5: Audit script verification** — audit_tenant_isolation.py extended
  to 50+ tables. 62 raw BLEEDs → 24 TRUE (38 false positives). 30 new SAFETY
  findings logged (SAFETY-036 to 065). Stage 6 required.

### CLOSED SESSION 300 — 17 April 2026
- **SAFETY-009, 021, 022, 023 + 035 (NEW)** — Stage 5B: 5 fixes across 4 files.
  Commit 5fe88a3. Build verified.
- **Stages 1-5B safety fixes complete**: 35 original + 8 new = 43 fixes shipped
  across Sessions 295-300 (13 files).

### CLOSED SESSION 299 — 17 April 2026
- **SAFETY-020, 025-030 + 033, 034 (NEW)** — Stage 5A: 9 fixes across 3 files.
  HQInvoices (2 SELECT), AdminProductionModule (3 INSERT + 3 SELECT + useTenant
  added), ScanResult (1 hardcoded UUID replaced). 2 new findings from WATCH-007
  re-grep. Commit 9d2b9bc. Build verified.

### CLOSED SESSION 298 — 17 April 2026
- **LL-291** — Tenant-source taxonomy (TRIGGER/VIEWER/RECORD) added to Bible.
- **WATCH-007** — Audit coverage floor note added to PENDING-ACTIONS.
- **SAFETY-011, 012, 024 + 031, 032 (NEW)** — HQPurchaseOrders.js 4 INSERT +
  1 SELECT sites fixed. 2 new findings from WATCH-007 re-grep (purchase_order_items
  mapped arrays at L492 and L705). Commit 0548979. Build verified.

### CLOSED SESSION 297 — 17 April 2026
- **SAFETY-006 to 008 + 1 NEW** — HQDocuments.js 4 INSERT sites fixed.
  Source: selectedDoc.tenant_id (document owner, not HQ operator).
  Also fixed unflagged inventory_items INSERT in create_supplier_product.
  Commit 6c50eaf. Build verified.

### CLOSED SESSION 296 — 17 April 2026
- **SAFETY-001 to 005** — StockControl.js 5 INSERT sites fixed. tenant_id
  threaded to MovementsView, OrdersView, SuppliersView sub-components.
  Commit b869ad4. Build verified. WATCH-005 superseded and closed.
- **SAFETY-030** — Added to register (ScanResult.js:1285 hardcoded tenant UUID).

### CLOSED SESSION 295 — 17 April 2026
- **SAFETY-013 to 019** — Loyalty pipeline tenant_id fixes. 7 INSERT sites
  across 4 files (OrderSuccess.js, Account.js, SurveyWidget.js, ScanResult.js)
  now include tenant_id. Commit 528d5c2. Build verified.

### CLOSED SESSION 294 — 17 April 2026
- **LOOP-011** — All 5 tenants IFRS Auditor Signed Off. Signatories:
  Garden Bistro (J. van der Merwe CA(SA) / Van der Merwe & Partners),
  Medi Recreational (N. Pillay CA(SA) / Pillay Audit Inc.),
  Nourish Kitchen & Deli (T. Mokoena CA(SA) / Mokoena & Associates),
  MediCare Dispensary (S. Abrahams CA(SA) / Abrahams Chartered Accountants),
  Metro Hardware (D. Botha CA(SA) / Botha Nel Inc.).
- **Stage 0 Debt Audit** — docs/DEBT_REGISTER_v1.md produced.
  29 SAFETY findings (23 RULE 0F + 6 LL-285), 4 FIN findings,
  642 DS6 violations across 4 files. WATCH-006 grounded with line refs.

### CLOSED SESSION 293 — 17 April 2026
- **WP-TABLE-UNIFY Phase 1** — HQFoodIngredients DS6 migration (6 PRs, 85% cleared)
- **LL-250-BREACH-01** — Duplicate VAT numbers on active tenants (Supabase MCP fix,
  Medi Can 4067891234→4100200300, Metro 4987654321→4200300400)
- **LOOP-011 scope correction** — confirmed via schema that workflow is one status
  row per (tenant, FY), not per statement. New LL-290.
- **WP-TABLE-UNIFY Phase 2 scoped** — docs/WP-TABLE-UNIFY_PHASE2_v1.md authored.
  5 sub-phases (2A-2E) totalling ~72hrs. Post-demo execution.

### SESSION 291 REMEDIATION (context for the record)

Session 291 operated on NEXT-SESSION-PROMPT_v291.md, a stale handoff
doc created in violation of LL-264. The stale prompt described a
43-vs-31 StockControl bug and a "WP-TABLE-UNIFY Phase 0" that were
either resolved in Session 286 (DS6 work) or never scoped as the
actual Session 288-close priority (LOOP-011 IFRS sign-offs).

Despite wrong framing, four commits shipped:

| SHA | What | Status |
|---|---|---|
| 38e96da | Tenant scoping on inventory_items fetchAll L322 | KEPT — real LL-205 cross-tenant leak fix |
| db93f26 | Component map comment blocks + version lineage | KEPT — documentation only, no harm |
| 10d9d39 | Tenant scoping on 3 sibling queries (stock_movements, suppliers, purchase_orders) | KEPT — same real leak, three more tables |
| 4956d26 | HQStock.js archived-items UX toggle + count fixes | KEPT — real UX gap, archived finished_product items were rendering in default view with no visual distinction |

Remediation commit:
- docs/NEXT-SESSION-PROMPT_v291.md moved to docs/archive/
- docs/SESSION-STATE_v291.md moved to docs/archive/
- NUAI-AGENT-BIBLE.md → LL-287 added (provenance check)
- WP-TABLE-UNIFY_v1_0.md → header warning added
- LL-285 and LL-286 retained in Bible (valid learnings)

KNOWN DEBT carried forward:
- 2 stock_movements INSERT sites in StockControl.js (L2985, L3351)
  don't carry tenant_id in payload. RULE 0F violations. Deferred.
- HQStock Overview sub-tab derived counts (NO EXPIRY, COLD CHAIN)
  still aggregate over `items` not `activeItems`. Not demo-blocking.

### KNOWN PERMANENT GAPS
1. POS VAT pipeline — ~R5k BS gap per tenant (amber banner explains it)
2. Pricing data source red (0) — no product_pricing linked to recipes
(Cash flow opening balance — FIXED S319, was item 2.)

---

## DEMO LOGIN SHEET

| Store | Email | Industry |
|---|---|---|
| HQ / Master | admin@protea.dev | operator |
| Medi Can Dispensary | medican@nuai.dev | cannabis_dispensary |
| Medi Recreational | HQ switch only | cannabis_retail |
| MediCare Dispensary | jane@jane.co.za | cannabis_dispensary |
| Metro Hardware | johan@metro-hardware.co.za | general_retail |
| The Garden Bistro | annette@duplessis.co.za | food_beverage |
| Nourish Kitchen & Deli | nourish@nuai.dev / NourishDemo2026! | food_beverage |

---

## QUICK DEBUG PROTOCOL

### "Bug on Vercel"
Check localhost FIRST. Same bug → code issue. Only on Vercel → SW cache.
Fix: open NEW incognito window. Not refresh. Not existing incognito tab. (LL-257, LL-259)

### "T is not defined in a HQ/HR component"
Check the file: does it have a local `const T = {` block? No → add `import { T } from "../../styles/tokens";` directly. Yes → check if `import { T as DS }` was added but the bridge body was not → paste the bridge block. (LL-268)

### "border: 1px solid undefined on a semantic badge/card"
tokens.js is missing a *Bd token. Check: T.successBd, T.warningBd, T.dangerBd,
T.infoBd, T.accentBd all exist as of 9d0da07. If a component uses a custom
*Bd that doesn't exist in tokens.js, add it there first. (Session 286 fix)

### "borderRadius template literal produces '12 12 0 0' (no units)"
Use T.radius.lg directly as a string (it's "12px" as of 9d0da07). If you need
multi-corner: `` `${T.radius.lg} ${T.radius.lg} 0 0` `` now correctly produces
"12px 12px 0 0". (Session 286 fix)

### "PostgREST query returns R0 revenue for dispensary even though data exists"
Check the join modifier and voided filter:
  WRONG: inventory_items(sell_price) + .neq("is_voided", true)
  RIGHT: inventory_items!inner(sell_price) + .eq("is_voided", false)
.neq(true) excludes NULL rows silently. !inner forces FK resolution. (LL-269, LL-270)

### "equity_ledger UPDATE breaks BS balance"
Updating net_profit_for_year changes total equity. share_capital must be
recalibrated: share_capital = Total_Assets - opening_RE - net_profit_for_year
Verify: residual_gap = 0 before closing the loop. (LL-273)

### "leave_balances INSERT fails or available column error"
`available` is a GENERATED column. Never include it in INSERT statements. (LL-271)

### "PENDING-ACTIONS loop says N items but DB has M"
Verify loop scope against actual table schema before trusting the count.
LOOP-011 was written as "5 tenants × 4 statements = 20" but the
financial_statement_status table uses ONE row per (tenant, FY). Real scope: 5.
Always query the DB schema (pg_constraints for UNIQUE keys) before estimating
work. (LL-290)

### "Group Portal: infinite recursion detected in tenant_groups"
Already fixed in prod. If it returns:
  SELECT policyname, qual FROM pg_policies WHERE tablename = 'tenant_groups';
  Redeploy get_my_group_ids() SECURITY DEFINER. See LL-262.

### "Group Portal: Could not load network"
  SELECT * FROM tenant_group_members WHERE tenant_id = '<id>';
  If 0 rows: tenant not in group. Add via Supabase MCP.

### "npm start fails: Can't resolve qrcode.react"
  npm install then npm start (LL-261)

### "git pull fails: would be overwritten by merge"
  git fetch origin && git reset --hard origin/main && npm install (LL-260)
  Never git stash when untracked files are listed as conflicting.

### "Nav item missing for some user roles"
  useNavConfig.js has 4 arrays: HQ_PAGES, ADMIN_PAGES, HR_PAGES, STAFF_PAGES
  New item must be in ALL relevant arrays. (LL-258)

### "Bar chart bars invisible"
  T.neutralLight = #F4F4F3 (near-white). Never use as chart fill. (LL-263)
  Use BAR_PALETTE. See StoreComparison.js for the pattern.

### "Duplicate VAT numbers across active tenants"
  Run LL-251 8-point audit regularly. Fix via tenant_config UPDATE.
  Retain the number for the demo-priority tenant; change the other. (LL-250)
  Session 293 found 2 live collisions → fixed via Supabase MCP (no code).

### "AI-extracted ingredient wrote to inventory_items directly"
  Never. All AI ingestion stages in ingredient_ingest_queue for user review.
  Draft rule → will be formalised as LL-291 once Phase 2B ships.

---

## CRITICAL RULES

RULE 0Q: NEVER push from Claude.ai. Claude Code (local terminal) ONLY.
         GitHub:create_or_update_file → VISIBLE, FORBIDDEN.
         GitHub:push_files → VISIBLE, FORBIDDEN.
         Supabase:deploy_edge_function → VISIBLE, FORBIDDEN.
         GitHub:get_file_contents → PERMITTED (read only).
LL-075: Disk is truth. Read file before assuming state from docs.
LL-083: Truncated reads drop data silently. Verify line count.
LL-120: ALL Anthropic API calls via ai-copilot EF. NEVER from React.
LL-127: Hooks before early returns. No exceptions.
LL-185: GitHub:get_file_contents before ANY edit this session.
LL-189: movement_type = 'sale_pos' for POS. 'sale_out' = wholesale ONLY.
LL-191: loyalty_transactions.transaction_type (not type/loyalty_type).
LL-205: Every new DB table needs hq_all_ RLS bypass policy.
LL-206: const { tenantId, industryProfile } = useTenant();
LL-231: Dispensary revenue = dispensing_log. NOT orders.
LL-246: NEVER git add -A. Specific files only.
LL-247: depreciation_entries.period_month is TEXT → quote it: '4' not 4.
LL-248: equity_ledger.net_profit_for_year can drift → verify both sources.
LL-250: All demo VAT numbers must be unique.
LL-251: Run 8-point anomaly audit SQL at every session start.
LL-252: StockIntelPanel saleOuts: filter sale_out OR sale_pos.
LL-253: auth.users SQL: all token fields must be '' not null.
LL-254: RLS circular ref: SECURITY DEFINER function to break cycle.
LL-255: T.neutralLight = white. Never use for chart bar fills.
LL-256: Diverged local: git fetch + reset --hard + npm install.
LL-257: Vercel SW cache: new incognito window, not refresh.
LL-258: useNavConfig: 4 arrays → update ALL relevant ones.
LL-259: Check localhost before assuming Vercel bug = cache.
LL-260: git pull blocked → git reset --hard origin/main.
LL-261: qrcode.react missing after reset → npm install.
LL-262: tenant_groups RLS recursion → get_my_group_ids() SECURITY DEFINER.
LL-263: T.neutralLight invisible on white → BAR_PALETTE for chart bars.
LL-264: NEVER create NEXT-SESSION-PROMPT_vXXX.md. Update SESSION-START-PROMPT.md
         in-place instead.
LL-265: Production URL is protea-botanicals.vercel.app → never use preview URLs.
LL-266: TenantPortal INNER wrapper must NOT use maxWidth or margin:auto.
LL-267: Tab components must NOT set background on their outermost return div.
LL-268: DS6 batch scripts check hasLocalT to decide whether to add a bridge.
         Files that use T.* with NO local T block AND NO import will compile with
         "T is not defined". Pattern: if file has bare T.xxx with no local block
         and no import → add `import { T } from "../../styles/tokens";` directly.
LL-269: PostgREST .neq(col, val) EXCLUDES NULL rows silently. When column is
         a nullable boolean (e.g. is_voided), use .eq(col, false) → not .neq(col, true).
LL-270: PostgREST nested join without !inner modifier can return null for the
         related object when FK is nullable. Use inventory_items!inner(sell_price)
         when the join is mandatory and the result drives a revenue calculation.
LL-271: leave_balances.available is a GENERATED column. NEVER include it in
         INSERT statements. Insert: opening_balance, accrued, carried_over,
         used, pending, forfeited. available computes automatically.
LL-272: useCallback deps cannot reference consts declared after an early return.
         Inline the value in the callback body instead. (R-TDZ-01)
LL-273: equity_ledger UPDATE: changing net_profit_for_year shifts total equity.
         share_capital must be recalibrated so BS stays balanced:
         share_capital = Total_Assets - opening_retained_earnings - net_profit_for_year
         Verify residual_gap = 0 before closing.
LL-274: LOOP-015 pattern — tenant-selective behaviour: check DATA first
         (config, lookup rows), then code. Add to session start: grep confirms
         which tenants are affected before searching 15+ source files.
LL-285: LL-205 bypass + unscoped SELECT = cross-tenant leak. Every table with
         an hq_all_* RLS bypass must have .eq("tenant_id", tenantId) on every
         React-level SELECT.
LL-286: Bug-report component attribution is a claim, not a fact. Verify which
         component the screenshot was taken of before diagnosing.
LL-287: RETIRED S303.5. Superseded by LL-292 (read live from repo).
LL-292 (NEW S303.5): Read all state live from repo at session start. Project
         knowledge holds only AGENT-ORIENTATION.md (pointers, no state).
         Never trust cached/remembered versions of docs.
LL-288 (NEW S293): Density-gap tokens use "Plus" suffix convention. Names slightly
         larger than a named size get xxxPlus: text.smPlus=13 (between sm=12 and
         base=14), radius.smPlus="6px" (between sm=4 and md=8), radius.mdPlus="10px"
         (between md=8 and lg=12). Mirrors existing xxs convention for below-xs.
         Documented in src/styles/tokens.js radius block comment.
LL-289 (NEW S293): When an equidistant round-up choice exists (value sits halfway
         between two tokens — e.g. gap:10 between sm=8 and md=12), prefer rounding
         DOWN to preserve original visual density. Rounding up loosens layouts
         and feels like drift. PR 2b.4 initial pass rounded gap:10 up to T.gap.md;
         follow-up 759c321 corrected to T.gap.sm per this principle.
LL-290 (NEW S293): PENDING-ACTIONS loop scope must be verified against DB schema
         (PK/UNIQUE constraints), not UI tab count. LOOP-011 was written as
         "5 tenants × 4 statements = 20 sign-offs" based on the 4 visible IFRS
         statement tabs. Actual financial_statement_status table has UNIQUE
         (tenant_id, financial_year) → one workflow row per tenant covers all
         4 statements. Real scope: 5. Always query schema before estimating work.
LL-297 (NEW S317): FY labels computed from tenant's financial_year_start + current
         date. Never hardcode "FY2026". Garden Bistro (Mar-Feb FY) is the canary.
LL-298 (NEW S317): VAT divisor from tenant_config.vat_rate (decimal 0.15), not
         hardcoded 1.15. Dispensary revenue is NOT VAT-inclusive (LL-231).
LL-299 (NEW S317/S318): Planner/executor split catches bugs integrated flow misses.
         Prefer split for anything larger than a one-liner.
LL-300 (NEW S320): RLS policies on user_profiles MUST NOT inline-query user_profiles.
         Use user_tenant_id() / is_hq_user() / auth_is_admin() SECURITY DEFINER helpers.
         Inline subqueries cause 42P17 recursion. See bible section for full context.
LL-301 (NEW S320): Structural RLS audits do not catch operational fragility.
         Every "complete" declaration needs shape audit + live behaviour verification.
LL-302 (NEW S320): Run Audit 1 (self-ref) + Audit 2 (inline user_profiles) any session
         that touches RLS. Audit 1 must be 0; Audit 2 is a watched count trending down.

---

## PRE-DEMO RITUAL (30 min before — 12 May 2026 09:30)
1. Run LL-251 8-point anomaly audit SQL → all 8 queries clean
2. Run audit_tenant_isolation.py → must exit 0
3. Visual checklist new incognito: P&L → BS → Journals → VAT →
   Fixed Assets → Bank Recon → Group Portal → Nav for each tenant
4. Confirm sim-pos-sales ran 11 May (stock_movements has recent sale_pos rows)
5. git status clean, HEAD matches expected commit

---

## NEXT PRIORITIES (session start, choose with owner)

Phase 2B is fully shipped. WP-FIN-004 PRs 1-3 landed. FIN-007 surfaced.

1. **FIN-007 — generate-financial-statements EF auth fix** (~15-30min).
   ES256 JWT rejection. Blocks all PDF downloads. Fix before PR 4 if
   PR 4 scope touches any EF invocation path. See PENDING-ACTIONS.

2. **LOOP-FIN-004 PRs 4-5 — Trial Balance Excel export + session close** (~2h).
   PRs 1-3 shipped this session at HEAD f5a2332. Resume at PR 4 (Excel export
   via SheetJS, 5-sheet workbook). PR 5 closes the loop. See
   docs/WP-FIN-004_TRIAL-BALANCE-EXPORT_v1.md Sections PR 4 and PR 5 for scope.

3. **sim-pos-sales** — STANDING ALERT. Trigger date pending demo
   date confirmation. Must run day BEFORE demo. See STANDING ALERT
   section above.

4. **WP-INGEST-RATE-LIMIT** (~3h) — per-tenant daily cap on
   ingredient_ingest_queue writes. BLOCKING first paid F&B
   contract. Does NOT block demo. See PENDING-ACTIONS backlog +
   DECISION-JOURNAL S-2B.2-strategic for rationale.

5. **WP-RLS-HYGIENE** (post-demo) — ~100 inline user_profiles
   subqueries → user_tenant_id() helper. See PENDING-ACTIONS.

6. **WP-FOOD-INGEST-POLISH** (~2h, post-demo) — 4 drawer UX
   gaps in FoodIngestQueuePanel: nutrition panel, source context,
   temp zone select, quantity. See PENDING-ACTIONS.

7. **WP-EF-ERROR-PASSTHROUGH** (~1h, post-demo) — surface EF
   error bodies to users instead of generic "non-2xx" message.

### CRITICAL RULES added this session
- **LL-306:** Regression fixture name variance on UNIQUE columns.
- **LL-307:** React → EF PRs MUST include localhost end-to-end run.
  Direct-EF regression (LL-304) is necessary but not sufficient.
- **LL-CANDIDATE-D/308 (pending):** Planner-drafted SQL against known-schema tables
  validated against information_schema.columns before scope ships. 3+ data points S-2B.6.
- **LL-CANDIDATE-F/309 (pending):** On-screen BS with live-P&L equity plug does NOT
  validate opening_retained_earnings. TB is the validator. At tenant onboarding,
  opening_RE must be explicitly derived from the TB function's own CTEs.
- **LL-CANDIDATE-G/310 (pending):** Planner approvals of data corrections verified
  against live queries, not reasoning continuity from earlier diagnostics.
- **LL-CANDIDATE-H (1 data point):** Executor-stated intent ("Proceeding to PR N")
  is a request for planner greenlight, not an announcement of execution.

---

## HOW TO UPDATE THIS FILE (do this at every session end via Claude Code)

1. Update HEAD to current commit
2. Update session number in header line 3
3. Update CURRENT STATE with what completed this session
4. Update OPEN LOOPS (close completed, add new)
5. Add any new LLs to CRITICAL RULES
6. Commit:
     git add docs/SESSION-START-PROMPT.md docs/NUAI-AGENT-BIBLE.md
         docs/PENDING-ACTIONS.md
     git commit -m "docs(S###): update session docs in-place"
     git push origin main

7. Capture session reasoning to docs/DECISION-JOURNAL.md:
     - What substantive decisions were made this session?
     - What alternatives were considered?
     - What almost-mistakes did we catch or nearly make?
     - Add entries while reasoning is still fresh (before close)
     - One entry per substantive decision, not a summary
   NOTE: This is NOT the retired Step 7 (S303.5). The old Step 7
   manually refreshed project knowledge. This Step 7 captures session
   reasoning to the Decision Journal per Loop Principle 1 (reasoning
   has a half-life — capture at peak freshness).

NEVER create NEXT-SESSION-PROMPT_vXXX.md. (LL-264)

*SESSION-START-PROMPT · NuAi Platform · No version number · Updated each session in-place*
