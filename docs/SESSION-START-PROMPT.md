# NUAI — SESSION START PROTOCOL
## Paste this as the FIRST message in every new Claude.ai session.
## Updated: 17 April 2026 — Session 295 close (Stage 1 — Loyalty Pipeline Tenant Scoping)
## THIS FILE HAS NO VERSION NUMBER. IT IS UPDATED IN-PLACE EVERY SESSION.
## Detail lives in the loop docs. This file is the entry point only.
## If you are writing NEXT-SESSION-PROMPT_vXXX.md — STOP. Update this file instead. (LL-264)

---

You are the AI development partner for **NuAi** — a production multi-tenant
SaaS ERP platform. 224,293 lines of code. 109 DB tables. 6 portals.
4 industry profiles. CA demo date: **PENDING CONFIRMATION** (was 12 May 2026).

**Tools:** GitHub MCP (READ ONLY — RULE 0Q), Supabase MCP (FULL ACCESS).
**Repo:** github.com/GFive5y/protea-botanicals — main
**Supabase:** uvicrqapgzcdvozxrreo — HEAD: 528d5c2

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
- Current HEAD (should be 759c321 or later)
- DS6 status: COMPLETE (all portals, HQ, HR, Admin, Consumer — see below)
- WP-TABLE-UNIFY Phase 1 status: COMPLETE (HQFoodIngredients 85% clean, remainder is
  Bucket B CATEGORIES palette structural decision — post-demo)
- All open loops from PENDING-ACTIONS.md
- Any new violations

---

## STANDING ALERT

sim-pos-sales MUST run the day BEFORE the CA demo. Trigger date: 11 May 2026.
IF DEMO DATE CHANGES: update PENDING-ACTIONS.md first, then this file.

---

## CURRENT STATE — 17 April 2026 — Session 293 Close

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

### CLOSED THIS SESSION (295) — 17 April 2026
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

### KNOWN PERMANENT GAPS — DO NOT CHASE BEFORE 12 MAY
1. POS VAT pipeline — ~R5k BS gap per tenant (amber banner explains it)
2. Cash flow opening balance — not wired to bank recon
3. Pricing data source red (0) — no product_pricing linked to recipes

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
LL-287: Session prompt provenance check. At session start, compare the prompt
         handed in chat against docs/SESSION-START-PROMPT.md in the repo. If
         they disagree, STOP and flag it. The repo file is the fact.
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

---

## PRE-DEMO RITUAL (30 min before — 12 May 2026 09:30)
1. Run LL-251 8-point anomaly audit SQL → all 8 queries clean
2. Run audit_tenant_isolation.py → must exit 0
3. Visual checklist new incognito: P&L → BS → Journals → VAT →
   Fixed Assets → Bank Recon → Group Portal → Nav for each tenant
4. Confirm sim-pos-sales ran 11 May (stock_movements has recent sale_pos rows)
5. git status clean, HEAD matches expected commit

---

## NEXT PRIORITIES (choose with owner at session start)

1. **Stage 2: StockControl.js SAFETY fixes** — SAFETY-001 to 005 (5 INSERT
   sites missing tenant_id). All Size S. See DEBT_REGISTER_v1.md Cluster 1.

2. **Stage 3: HQDocuments.js SAFETY fixes** — SAFETY-006 to 008 (3 INSERT
   sites). See DEBT_REGISTER_v1.md Cluster 3.

3. **sim-pos-sales** — STANDING ALERT. Trigger date depends on new demo date
   (PENDING CONFIRMATION). Must run the day BEFORE demo.

4. **WP-TABLE-UNIFY Phase 2** — `docs/WP-TABLE-UNIFY_PHASE2_v1.md` (645 lines).
   Deferred to post-demo. Next agent reads scope doc in full before planning.

5. **Optional DS6 mop-up** — 642 violations across 4 files. Not blocking demo.

6. **LOOP-FIN-004** — Trial Balance Excel export (2hrs, SheetJS) — nice-to-have

---

## HOW TO UPDATE THIS FILE (do this at every session end via Claude Code)

1. Update HEAD to current commit
2. Update session number in header line 3
3. Update CURRENT STATE with what completed this session
4. Update OPEN LOOPS (close completed, add new)
5. Add any new LLs to CRITICAL RULES
6. Commit:
     git add docs/SESSION-START-PROMPT.md docs/LL-ARCHIVE_v1_0.md docs/PENDING-ACTIONS.md
     git commit -m "docs(S###): update session docs in-place"
     git push origin main

7. Update Claude.ai project knowledge (prevents LL-287 drift):
   After the commit lands on main, open the NuAi project in Claude.ai,
   go to Project knowledge, find the existing SESSION-START-PROMPT
   entry, and replace its content with the current repo version.

   Why this step is non-optional: project knowledge is a static
   snapshot, not a live link to the repo. If you skip step 7, the
   next session's agent sees a stale protocol file in project
   knowledge while the repo file has moved on. LL-287's provenance
   check will fire on every turn-one until the two are reconciled,
   wasting session start time.

   Paste source: the output of
     git show HEAD:docs/SESSION-START-PROMPT.md
   or just open the file on main in the GitHub web UI and copy.

   PLATFORM-OVERVIEW.md stays in project knowledge unchanged. It's
   a slower-moving doc and does not need per-session refresh.

NEVER create NEXT-SESSION-PROMPT_vXXX.md. (LL-264)

*SESSION-START-PROMPT · NuAi Platform · No version number · Updated each session in-place*
