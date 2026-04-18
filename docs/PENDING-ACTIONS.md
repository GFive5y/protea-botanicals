# PENDING-ACTIONS.md
## Single source of truth for all open, date-sensitive loops.
## READ THIS AT EVERY SESSION START — after SESSION-STATE.
## UPDATE THIS FILE when: meeting date changes, items complete, new items added.
## NEVER delete a row — move completed items to CLOSED LOOPS section.

---

## MEETING DATE
**Current CA demo date: NOT CONFIRMED**
When this changes:
1. Update this file (meeting date line above)
2. Recalculate sim-pos-sales trigger date (= demo date MINUS 1 day)
3. Update SESSION-STATE and SESSION-START-PROMPT
4. Re-examine all seeded orders and dispensing events for date alignment

---

## STANDING — DEMO DAY SEQUENCE

- **DEMO DATE - 1**: Run sim-pos-sales for Metro Hardware + Medi Recreational
  HQTenants — RUN 30 DAYS, OR Supabase MCP pg_net.http_post to sim-pos-sales EF.
  Window must INCLUDE demo day. (Was 11 May 2026 — recalculate when new date confirmed.)
- **DEMO DATE - 30min**: Pre-demo ritual (see SESSION-START-PROMPT.md)
- **DEMO DATE**: CA demo (was 12 May 2026 — PENDING CONFIRMATION)

---

## OUTSTANDING — MUST COMPLETE BEFORE DEMO

### DEBT-REGISTER REVIEW — CLOSED (S294-S316)
Owner reviewed DEBT_REGISTER_v1.md Section 4 during S294.5 through S316.
All safety debt items addressed. Financial items now in progress.

### sim-pos-sales
Status: STANDING ALERT — must run the day BEFORE demo.
Trigger date: PENDING (depends on demo date confirmation).

---

## KNOWN PERMANENT GAPS (document and explain in demo — do not fix before 12 May)

1. **POS VAT pipeline** — output VAT from POS orders not writing to vat_transactions.
   Root cause: POS transaction path does not call auto-post-capture EF.
   Impact: ~R5k BS gap per tenant (amber banner explains it).
   Why deferred: fixing requires touching live POS order flow + historical backfill.
   Regression risk outweighs cosmetic gap 4 weeks before demo.

2. ~~**Cash flow opening balance not wired to bank recon**~~ — **FIXED S319**.
   bank_accounts.opening_balance column existed; 4/6 tenants had seeded values.
   Fix was wiring (frontend + EF), not new infrastructure.

3. **Pricing data source red (0)** — no product_pricing records linked to recipes.
   Affects costing dashboard only. Not on demo critical path.

---

## OUTSTANDING — RLS FIX CAMPAIGN (S314.1-S314.4)

### S314.1 — CLOSED. 10 CRITICAL policies fixed (Bucket A + B).
### S314.2a — CLOSED. 9 sweep residual policies fixed + LL-295.
### S314.2b — CLOSED. 11 MEDIUM is_admin() policies fixed.
### S314.3a — CLOSED. 11 HIGH with_check fixes (tenant-scoped Tier A).
### S314.3b — CLOSED. 24 HR cluster with_check fixes (all mechanical, no rewrites).

### stock_take_* — CLOSED (S314.3d). Migrated to standard user_tenant_id() pattern.

### S314.2c — CLOSED. message_templates schema + RLS + 9 placeholder defaults.
### S314.2c-b — Owner writes real content for 9 generic default templates (at own pace).
### FOLLOW-UP: {{business_name}} not supported in send-notification/send-email EFs.

### S314.3c — CLOSED. 65 HQ bypass with_check additions.
### S314.3d — CLOSED. 6 stock_take_* policies (legacy migration).
### S314.4 — CLOSED. 8 final Bucket A escapes + audit script hardening.
  Tier 2C declared COMPLETE after S314.4. 146 policies fixed across 11 sessions.
### S315 — CLOSED. LL-251 Q5 + Q6 audit query fixes + Failure Mode 7.
### S316 — CLOSED. FIN-001 fix (HQYearEnd FY filter) + LL-296.

### DEFERRED — RLS policy consolidation (~100 pairs)
~100 duplicate/redundant policy pairs identified during S314 campaign.
Not fixed (out of scope). Hygiene work, no security impact. Future workstream.

---

## CLOSED LOOPS — SESSION 294 (17 April 2026)

### CLOSED — LOOP-011: All 5 tenants IFRS Auditor Signed Off
Session 294 · Owner action via HQ tenant switch on 17 April 2026.
All 5 financial_statement_status rows now have signed_at IS NOT NULL.
Signatories:
  The Garden Bistro        — J. van der Merwe CA(SA) / Van der Merwe & Partners
  Medi Recreational        — N. Pillay CA(SA) / Pillay Audit Inc.
  Nourish Kitchen & Deli   — T. Mokoena CA(SA) / Mokoena & Associates
  MediCare Dispensary      — S. Abrahams CA(SA) / Abrahams Chartered Accountants
  Metro Hardware (Pty) Ltd — D. Botha CA(SA) / Botha Nel Inc.
All green "AUDITOR SIGNED OFF" badges confirmed via screenshots.

### CLOSED — Stage 0 Grounded Debt Audit
Session 294 · docs/DEBT_REGISTER_v1.md produced (audit-only, no fixes).
Three audit streams executed:
  Stream A (Safety): 29 findings — 23 RULE 0F INSERT violations, 6 LL-285 SELECT violations
  Stream B (Financial): 4 findings (FIN-001 HQYearEnd missing FY filter, FIN-002
    hardcoded FY2026, FIN-003 VAT_RATE hardcoded, FIN-006 unfiltered equity join).
    3 permanent gaps confirmed documented, no drift.
  Stream C (DS6/UX): 642 violations across 4 files (HQFoodIngredients ~32,
    StockControl 116, SmartInventory 225, HQStock 269). WATCH-006 grounded
    with line refs (HQStock.js:1084, 1407, 1415, 1418, 1419).
Summary table: Section 4 of DEBT_REGISTER_v1.md — top 10 items ranked for owner review.

---

## CLOSED LOOPS — SESSION 293 (17 April 2026)

### CLOSED — WP-TABLE-UNIFY Phase 1: HQFoodIngredients.js DS6 migration
Session 292-293 · 6 PRs shipped · 362 -> ~55 violations (85% reduction)
Final commit: 759c321 (2b.4-corrections — gap:10 round-down, toast shadow migration,
9 inline justification comments on intentional values).
Prior PRs: ffe1cf4 (2a, S292) · f63e61f (2d, S292) · 502cb07 (2b.1, S293) ·
caacf50 (2b.2, S293) · 7a48557 (2b.3, S293) · f3f9001 (2b.4, S293).
Remaining ~55 violations are all Bucket B (CATEGORIES palette — structural
decision) plus intentional content colours already documented inline
(HACCP_COLORS, TEMP_COLORS, C.blue). All explicitly parked for post-demo,
scoped in docs/WP-TABLE-UNIFY_PHASE2_v1.md Sections 1.3 and 5.
Codemods preserved at scripts/pr2d_codemod.js and scripts/pr2b2_codemod.js
for audit trail (committed in Session 293 close).
New LLs: LL-288 (Plus-suffix naming), LL-289 (round-down preference).

### CLOSED — WP-TABLE-UNIFY Phase 2: scoping only (execution post-demo)
Session 293 · docs/WP-TABLE-UNIFY_PHASE2_v1.md · 645 lines · 12 sections
Not code — strategic scope document produced through market research
(Apicbase, meez, SafetyChain, FoodReady, Dynamics 365, SAP Food One, Lavu,
fatsecret, Nutritionix, Edamam) and SA regulatory review (R638 of 2018,
DAFF, SABS, CoA). 5 sub-phases scoped:
  - 2A SmartInventory feature parity  ~20h
  - 2B AI ingredient ingest            ~15h  (killer app)
  - 2C Recipe linkage surface          ~12h
  - 2D Compliance view mode            ~10h
  - 2E Consumer shop allergen filter   ~15h  (deferred)
Execution NOT before 13 May 2026. Next agent reads scope doc in full
before planning any Phase 2 work. Supersedes the one-line Phase 2
description in WP-TABLE-UNIFY_v1_0.md.
Handoff rule added to doc (Section 12 Provenance): intended executor is
Claude Code in a post-demo session with owner priority alignment.

### CLOSED — LL-250-BREACH-01: Duplicate VAT numbers on active tenants
Session 293 · Supabase MCP (no code commit)
Audit finding: 2 collisions on tenant_config.vat_number for active tenants:
  - 4067891234 -> Medi Can Dispensary + MediCare Dispensary
  - 4987654321 -> The Garden Bistro + Metro Hardware (Pty) Ltd
Fix (UPDATE tenant_config):
  - Medi Can Dispensary (2bd41eb7...): 4067891234 -> 4100200300
  - Metro Hardware (57156762...): 4987654321 -> 4200300400
Retained numbers went to the demo-priority tenants (MediCare keeps
4067891234 since Medi Can is a seed/inactive-path tenant; Garden Bistro
keeps 4987654321 since it's demo-priority).
Verified: 0 duplicate VAT numbers remain across 6 VAT-registered active tenants.

### CLOSED — LOOP-011-SCOPE-CORRECTION
Session 293 · Verified via Supabase MCP schema inspection + HQFinancialStatements.js
disk read at commit f3f9001.
Finding: LOOP-011 was written as "5 tenants × 4 statements = 20 sign-offs" based
on the 4 visible IFRS statement tabs. Actual financial_statement_status table
has ONE row per (tenant_id, financial_year) with UNIQUE constraint on that pair.
The 4 tabs share one workflow: Draft -> Reviewed -> Auditor Signed Off -> Locked.
Real scope: 5 sign-offs total. All 5 tenants currently at status='reviewed',
pending the auditor sign-off UI action (owner task).
Updated the LOOP-011 row above with corrected scope note.
New rule: LL-290 — verify loop scope against DB schema, not UI tab count.

---

## CLOSED LOOPS — SESSION 292 (17 April 2026)

### CLOSED — LOOP-WTU-001: Phase 1 design-gate decisions
Session 292 · Owner decisions: all Option A (additive)
Q1 Purple family: ADD 5 tokens. Q2 Sub-11px: ADD T.text.xxs. Q3 fontWeight 800: ADD T.weight.extrabold.
All strict-superset additions. No existing consumer affected.

### CLOSED — PR 1: WP-TABLE-UNIFY Phase 1 tokens.js additions
Session 292 · 5395543 · src/styles/tokens.js +16/-4
Added 7 tokens per LOOP-WTU-001 decisions.
Zero-risk additive commit. Unblocks PR 2 (HQFoodIngredients DS6 pass).

### CLOSED — DOCS-S292: CLAUDE.md reconciliation + archive cleanup
Session 292 · d6fab84 + c91e3ea
d6fab84: CLAUDE.md reconciled with LL-264 (removed NEXT-SESSION-PROMPT pattern,
  removed ghost CLAUDE-COLLABORATION-PROTOCOL.md reference, rewrote close protocol).
c91e3ea: 11 stranded session-handoff files moved to docs/archive/
  (5 NEXT-SESSION-PROMPT + 6 SESSION-STATE, v258-v290).

### CLOSED — AUDIT-WTU-001: WP-TABLE-UNIFY Phase 1 audit
Session 292 · Read-only · No commit (Claude.ai cannot write per RULE 0Q)
Deliverable: docs/WP-TABLE-UNIFY_PHASE1_AUDIT_v1.md (pending Claude Code commit)
Scope: HQFoodIngredients.js (5,140L) + StockControl.js (4,743L)
Findings: 420 + 261 violations across 6 DS6 categories.
  - 93/102 hex uses map to existing T tokens (91% coverage)
  - 9 unmapped uses (purple/indigo) feed LOOP-WTU-001
  - HQFI violations concentrated L2500+ (render code)
  - StockControl already bridged post-S286 (LL-268 pattern)
  - 1 false positive logged: borderRadius "50%" circle shape, L601
Method: Custom Python scanner run on files fetched via GitHub:get_file_contents
  at main HEAD. Scanner at /home/claude/audit/scan.py in session ephemeral.
Output: 3-PR Phase 1 structure recommended (split vs. monolithic),
  StockControl PR flagged POST-DEMO due to all-tenant blast radius.

---

## CLOSED LOOPS — SESSION 287/288 (16 April 2026)

### CLOSED — LOOP-DS6-004: HQStock.js DS6 Phase 2b
Session 286 · Closed by Claude Code
All fontSize/fontWeight/borderRadius/section-label instances corrected.
DS6 complete across all primary surfaces.

### CLOSED — LOOP-FIN-002: PDF Audit Package EF
Session 287 · 95782e5
generate-financial-statements EF v1.0 deployed. 7-page A4 PDF via npm:pdf-lib.
Download PDF button live in HQFinancialStatements.js header. Storage bucket
`financial-statements` (private, 7-day signed URLs).

### CLOSED — LOOP-FIN-003: Revenue VAT Exclusion (GAP-01)
Session 287 · adfe712 · Already live — confirmed from disk
const VAT_RATE = 1.15 applied in HQProfitLoss.js at all revenue aggregation points.
EF inherits via pre-computed profileRevenue. No code change needed.

### CLOSED — LOOP-NEW-005: MediCare Revenue MTD = R0
Session 288 · a447f74 · src/components/hq/HQOverview.js
Root cause: `inventory_items(sell_price)` left-join returned null sell_price +
`.neq("is_voided", true)` silently excluded NULL rows.
Fix: `inventory_items!inner(sell_price)` + `.eq("is_voided", false)`.
Verified: 74 events · R98,525 in last 30 days · tile now shows correct figure.
Lesson: LL-269, LL-270.

### CLOSED — LOOP-NEW-006: MediCare IFRS BS gap
Session 288 · Supabase MCP (no code commit)
Root: equity_ledger.net_profit_for_year = -418,979 (stale seed). IFRS IS
calculates -263,672.76 from live dispensing_log x sell_price data.
Fix: UPDATE net_profit_for_year = -263,672.76.
Then recalibrated share_capital = 623,022.64 so BS balances (LL-273).
Result: total_equity = R359,349.88 = total_assets. Residual gap = R0.
Data state: equity_ledger FY2026 · net_profit -263,672.76 · sc 623,022.64.

### CLOSED — LOOP-014: MediCare IFRS IS dispensing revenue — prod verification
Session 288 · Visual verification via PDF download
IS Revenue row: R313,935 from dispensing_log. Net Loss: -R263,672.76.
BS: Assets = L+E = R359,349.88. Changes in Equity: consistent.
All 4 IFRS statements correct for MediCare Dispensary.

### CLOSED — LOOP-012: HR top-up 3 tenants
Session 288 · Supabase MCP (no code commit)
Staff counts were already at target (Medi Rec 4, MediCare 3, Metro 4).
5 staff missing contracts + leave_balances:
  Ayanda Khumalo (Medi Rec, Budtender) — R8,000/mo
  Ruan Pieterse (Medi Rec, Floor Supervisor) — R12,000/mo
  Fatima Davids (MediCare, Receptionist) — R9,500/mo
  Bongani Zulu (Metro, Sales Assistant) — R8,500/mo
  Chantelle October (Metro, Cashier) — R8,000/mo
All 5 now have: employment_contracts (permanent, monthly, 8h/5d, 30d notice,
start 2026-01-01) + leave_balances (15 days Annual Leave, BCEA, cycle 2026).
leave_balances.available was NOT included in INSERT (LL-271 — GENERATED column).

### CLOSED — LOOP-010: Medi Rec Run Depreciation
Session 288 · Supabase MCP (no code commit)
Deleted incorrect Apr 2026 entries (wrong accum_dep_after values).
Inserted all gap months to bring each asset current through Apr 2026:
  FA-001 Display Refrigerator (R200/mo): 15 months inserted (Feb 2025-Apr 2026)
    accum_dep: R2,600 -> R5,400 · NBV: R12,500 -> R7,100
  FA-002 Security Camera (R247.22/mo): 18 months inserted (Nov 2024-Apr 2026)
    accum_dep: R2,222.78 -> R6,425.52 · NBV: R8,900 -> R2,474.48
  FA-003 Shop Fitout (R375/mo): 24 months inserted (May 2024-Apr 2026)
    accum_dep: R2,625 -> R11,250 · NBV: R45,000 -> R33,750
fixed_assets.accumulated_depreciation + net_book_value updated for all 3.
All period_month values stored as numeric strings per LL-247.

### CLOSED — LOOP-015: Loyalty warning banner
Session 288 · Supabase MCP (no code commit)
Symptom: Warning banner on some tenant portals (MediCare, Nourish, Garden Bistro).
Root cause: 3 tenants missing loyalty_config rows.
Source component: NOT IDENTIFIED after exhaustive 15-file search (LL-274).
Fix: Inserted loyalty_config rows (standard schema) for all 3 missing tenants.
All 5 demo tenants now have loyalty_config. Banner resolved.
See LL-274 for data-first diagnostic rule.

---

## CLOSED LOOPS — SESSION 284 (15 April 2026)

### CLOSED — LOOP-DS6-001: TenantPortal INNER maxWidth causes grey side-strips
Session 284

### CLOSED — LOOP-DS6-002: HQLoyalty white middleman box
Session 284 · 366dcc3

### CLOSED — LOOP-DS6-003: HQDashboard missing grey wrapper
Session 284 · e216d4d

---

## CLOSED LOOPS — SESSION 282 (15 April 2026)

### CLOSED — DOC-001: SESSION-START-PROMPT.md stale entry point
Session 282

### CLOSED — CC-07 through CC-10 (Group Portal fixes)
Session 282

---

## CLOSED LOOPS — SESSION 262

### CLOSED — CC-06: Group Portal — all 5 demo tenants linked + nav bar wired
Session 262 · 15 April 2026

### CLOSED — CC-05: Tenant Portal nav — Reports split + hr-dashboard fix
Session 262 · 15 April 2026

---

## CLOSED LOOPS — SESSION 261

### CLOSED — SB-FIX-001 through SB-FIX-009, CC-01 through CC-04
Session 261 · All fin packages, bank recons, IFRS fixes

## CLOSED LOOPS — SESSION 319 (18 April 2026)

### CLOSED — GAP-002: Cash flow opening/closing balance reconciliation
Session 319 · 2 commits (frontend + EF)
Root cause (reframed): register described this as "new snapshot table
needed." Disk showed bank_accounts.opening_balance column already exists
with 4 of 6 active tenants seeded. Fix was wiring, not infrastructure.
Added opening → net movement → closing reconciliation to both the
on-screen Cash Flow statement and the PDF audit package (page 4).
Frontend: +1 parallel query (bank_accounts), +3 render rows.
EF: matched restructure of page 4 terminal block.

## CLOSED LOOPS — SESSION 318

### CLOSED — CAPSTONE-003 (S316.5 → S318)
Session 318 · Campaign retrospective synthesis. 5 artifacts:
pattern tagging (DEBT_REGISTER Section 6), FM Evidence Map (AGENT-METHODOLOGY),
LOOP-CALIBRATION.md (new), LL-299 (planner/executor split), _migration_backup_s309 archived.

---

## WATCH ITEMS

### WATCH-EF-DEPLOY — Procedure 7 mandatory re-read before ANY EF work
Status: PERMANENT
After LL-303, ALL agents must read Procedure 7 in AGENT-METHODOLOGY.md
before touching any Edge Function. The v62/v63 incident proved that
assuming tool capability is how production breaks. If you are the agent
reading this: the first time you want to deploy an EF, stop and re-read
Procedure 7 even if you already read the Bible at session start.

### WATCH-001 — SAHPRA export CSV format
Implemented — not yet tested against real SAHPRA submission requirements.

### WATCH-002 — Scan activity chart cross-tenant (LL-056)
scan_logs has no tenant_id column — permanent limitation.

### WATCH-003 — HQTransfer.js atomicity gap
Per-line loop on ship/receive with no transaction wrapper.
Partial failures can leave transfers inconsistent.
Named future build item. Not blocking demo.

### WATCH-004 — Eybna unpriced products
HC-0002, BB-LYCHEE-0002, 6-PH-0002 still no sell price.
Action: Admin Stock → set sell prices for these 3 items.

### WATCH-005 — CLOSED (Session 296, b869ad4)
Superseded by SAFETY-001 to 005 in DEBT_REGISTER_v1.md.
All 5 StockControl INSERT sites (stock_movements ×2, purchase_orders,
purchase_order_items, suppliers) now include tenant_id: tenantId.
tenantId prop threaded to MovementsView, OrdersView, SuppliersView.

### WATCH-006 (NEW S293) — HQStock Overview sub-tab derived counts
NO EXPIRY and COLD CHAIN aggregate over `items` not `activeItems`. Means
archived items inflate the count. Not demo-blocking. Carried from S291.

### WATCH-007 (NEW S297) — Audit coverage floor, not ceiling
S294 manual grep audit (audit_tenant_isolation.py couldn't execute)
missed >=1 INSERT site caught organically during S297 scoped work
(HQDocuments.js:2361 inventory_items). Assume DEBT_REGISTER_v1.md
is a floor count, not ceiling. Agents working in any file with
known safety findings should re-grep that file for other INSERTs
on tenant-scoped tables before commit. Permanent audit coverage
fix lives in: extending audit_tenant_isolation.py TENANT_SCOPED
set per Section 1.3 of the register.

### WATCH-008 (NEW S300) — Historical system_alerts misattribution check
SAFETY-030 replaced a hardcoded tenant UUID "43b34c33-..." in
ScanResult.js:1285. Every scan that triggered this path before the
S299 fix wrote system_alerts rows to that hardcoded tenant regardless
of actual QR tenant. Before calling safety debt fully resolved, run:
  SELECT tenant_id, COUNT(*) FROM system_alerts
  WHERE tenant_id = '43b34c33-6864-4f02-98dd-df1d340475c3'
  GROUP BY tenant_id;
If count is non-trivial, the historical rows are misattributed and
may need data correction (not code). Log findings, decide on cleanup
separately. Not blocking Stage 5b, 5.5, or financial.

### WATCH-009 — CLOSED (S313.5)
SAFETY-080 executed. Per-tenant copies (LL-294). 4 suppliers → Pure Premium,
123 supplier_products moved, 8 docs repointed, Facility A → Medi Rec,
4 NULL → Metro Hardware. NOT NULL applied. Zero cross-tenant refs.

### WATCH-010 — CLOSED (Session 310, dd254af)
SAFETY-081: retailer_performance and scan_geo_summary were broken self-
referencing views, not tables. Dropped in S310. No data loss.

### WATCH-011 — SAFETY-082 SPLIT (Session 311)
082a CLOSED: public_holidays, product_formats, product_strains — intentional
shared-reference-data pattern (LL-293). NULL tenant_id is design, not bug.
082b CLOSED (S312): 6 tables cleaned + constrained. 4 junk deleted, 19 backfilled,
6 NOT NULL applied. See DEBT_REGISTER_v1.md Section 1.8 (2B.4b).

---

## BACKLOG — FUTURE BUILD ITEMS (post-demo, no date constraint)

### LOOP-WTU-002 — WP-TABLE-UNIFY Phase 2A — **CLOSED**
Status: **CLOSED — 6 PRs shipped (18 April 2026)**
  2A.1 (31e93d3): Scaffolding — food/TileView, ListView, ViewToggle
  2A.2 (7f42ad8): PillNav, KPIStrip, SmartSearch
  2A.3 (a14f84d): Sort, bulk select, CSV, realtime, col picker
  2A.4 (173df3a): Banner fix, tile size, dedup, legacy filter removal
  2A.5 (0ab918f): Row CRUD, audit placemarker, DELETE RLS policy
  2A.6 (3a7ab6e): DS6 compliance — Part 16 table spec
Original plan was 4 PRs (~20h). Shipped 6 PRs. Under-scoped CRUD + audit + DS6.

### LOOP-WTU-003 — Phase 2B: AI Document Ingest — CLOSED 2B.5 / 19 April 2026
Status: CLOSED
Source: docs/WP-TABLE-UNIFY_PHASE2B-SPLIT_v1.md
  [x] 2B.1 migration applied (ingredient_ingest_queue, 5 policies) — 73f8135
  [x] 2B.1 scoping doc committed — 73f8135
  [x] 2B.2 v62 spec captured (docs/WP-TABLE-UNIFY_PHASE2B-2_V62-SPEC_v1.md)
  [x] 2B.2 v62 shipped clean — 889a145 (Supabase version 65) — 19 April 2026
  [x] 2B.2 direct-EF smoke test (LL-304 pattern) — 10 queue rows verified
  [x] 2B.2 regression matrix (5 tenants) — planner-side via SQL probes + guard verification
  [x] 2B.3 HQ "+ Add from Document" modal + strategic doc + copy refinements
      (shipped cf7974c + d0bb6af + 9ef764f, 19 April 2026)
  [x] 2B.3.1 hotfix — tenant_id thread-through to EF body (b18b092)
  [x] 2B.4 Ingest Queue tab + approve RPC + regression harness (a166174)
  [x] 2B.5 Gate PR — docs close-out, LL-306 + LL-307 (this commit)
Architectural pivot: extends process-document v61 -> v62 (Option 1)
  instead of building a new ingest-ingredient EF (parent doc Option B).
**INCIDENT NOTE (RESOLVED):** v62/v63 original attempts via Supabase MCP
  were truncated stubs. Rolled back to v61 (Supabase v64).
  LL-303 + Procedure 7 now govern all EF deploys.
  Second attempt (S-2B.2, commit 889a145) via Claude Code `npx supabase
  functions deploy` — succeeded on first try. v62 live at Supabase v65.

### WP-FOOD-INGEST-POLISH — FoodIngestQueuePanel drawer UX (post-demo)
Opened: S-2B.5, 19 April 2026
Priority: LOW — demo-working without these
Scope: four drawer-UX gaps surfaced during 2B.4 localhost smoke
Estimate: ~2h total

1. Nutrition panel render — AI extracts `nutrition_per_100g` when visible;
   drawer does not display it. Add read-only block below Shelf Life showing
   energy_kj, protein_g, carbs_g, fat_g, sodium_mg.
2. Source context block — pack_size, brand, supplier_name, cost from the
   original invoice. Read-only. Helps reviewer verify AI against the source
   document before approving.
3. Temperature zone select drift — options array in FoodIngestQueuePanel
   drawer is `["frozen","chilled","ambient","hot_hold"]` but EF prompt emits
   `"hot"` not `"hot_hold"`; also AI may emit `"refrigerated"` which matches
   FoodWorlds.js but not the select. Align select options to EF prompt enum
   (ambient | refrigerated | frozen | hot).
4. Quantity / invoice-line context — related to #2. Surface the pack_size and
   pack_count as read-only on the drawer so reviewer sees "4 × 12.5kg bags
   Sasko Cake Flour" context, not just the library-shape "Cake Flour / kg".

All four land in one post-demo PR. Not demo-blocking.

### WP-EF-ERROR-PASSTHROUGH — surface EF error bodies to users (post-demo)
Opened: S-2B.5, 19 April 2026
Priority: LOW
Scope: supabase-js `.invoke()` swallows 500 response bodies and returns a
generic "non-2xx status code" error. Users see that instead of the real EF
error (e.g. "Failed to log to document_log: ..."). Wrap invoke() with a
fetch() fallback or a post-invoke direct fetch to recover the body.
Estimate: ~1h. Applies to FoodIngestModal and any other invoke callsites.

### Phase 2F — Mobile Smart Capture for Ingredients
Status: BACKLOG · opens when (a) a client requests it OR (b) bandwidth after 2C/2D
Source: S-post-2A.6 owner instruction
Extend mobile Smart Capture flow (currently handles petrol slips, invoices,
proofs of payment for bookkeeping) to also handle F&B ingredient photos.
Separate UX problem from desktop ingest: kitchen lighting, camera quality
on small-print allergen panels, one-handed use. Not demo-blocking.

### WP-EF-MODULES — Refactor process-document to shared Deno modules
Status: BACKLOG · Post-demo
Source: Phase 2B scoping (S-post-2A.6)
process-document/index.ts is 1,247 lines (v61), growing to ~1,400 in v62.
Should be refactored into supabase/functions/_shared/ modules.
Estimate: ~4h when picked up.

### WP-EF-LL120-RECONCILE — Route EF Anthropic calls through ai-copilot
Status: BACKLOG · Post-demo
Source: Phase 2B scoping (S-post-2A.6)
LL-120 mandates all AI calls route through ai-copilot EF. process-document
v61 violates this by calling api.anthropic.com directly. Estimate: ~6h.

### WP-IMAGE-HASH-REAL — Replace image hash proxy with real SHA-256
Status: BACKLOG · Post-demo
Source: Phase 2B scoping (S-post-2A.6)
process-document uses mime+size+slice(80) proxy hash. Real SHA-256 is more
reliable for duplicate detection. Estimate: ~1.5h.

### WP-INGEST-RATE-LIMIT — Per-tenant rate limit on AI ingest
Status: BACKLOG · BLOCKING first paid F&B contract
Source: S-2B.2 strategic deep-dive (Section 2.6 + Section 3.5)
Trigger: Before granting any paid F&B tenant access to the
PR 2B.3 "+ Add from Document" modal, OR when daily extract
volume across all tenants exceeds 50/day on any one day.

**Why this exists:**
Every Claude Vision call via process-document v62 is a COGS line item.
PR 2B.3 (shipped at cf7974c) opens the ingest UI to any F&B
tenant HQ user. With no rate limit, a single tenant bulk-uploading
200 invoices in an afternoon generates 200 Anthropic API calls at
~R1-R3 each. That's R200-R600 of COGS on a single tenant in one day,
which at R3,500/mo ARPU destroys the tenant's contribution margin.

**Scope:**
1. Add `daily_extract_count` (integer) + `daily_extract_reset_at`
   (timestamptz) to `tenants` or `tenant_config` (decide at scope time)
2. process-document v62+ increments the counter on every extract,
   resets at tenant-local midnight
3. Soft cap: warn tenant user at 20 extracts/day via toast
4. Hard cap: reject at 50 extracts/day with clear message + route to
   "Contact support for higher limits" CTA
5. HQ operator tier gets bypass (is_hq_user() = true → no cap)
6. Enterprise tier gets configurable cap (set on tenant_config)

**Effort estimate:** ~3h. One EF edit, one migration, one tenant_config
field, one React toast. Modest.

**Related:** WP-UNIT-ECONOMICS (the cost model that justifies the
specific cap numbers).

**Reference:** DECISION-JOURNAL S-2B.2-strategic entry.

### WP-UNIT-ECONOMICS — Per-tenant Anthropic API cost model
Status: BACKLOG · Pre-revenue gate
Source: S-2B.2 strategic deep-dive (Section 2.6)
Trigger: Before pricing the first paid contract. Before quoting a
franchise group or accounting firm.

**Why this exists:**
NuAi pricing is currently R3,500-R12,000/mo based on docs, not
validated against actual per-tenant COGS. Anthropic API costs
(Smart Capture, ingredient ingest, ProteaAI, loyalty AI nightly
jobs) are the largest variable cost and have never been modelled.
At 10 tenants casual use: ~R2-R5k/mo total. At 100 tenants with
heavy ingest: R50-R100k+/mo. At franchise-scale (200+ outlets
each photographing daily invoices): material COGS line requiring
explicit pricing tier design.

**Scope:**
1. Per-operation Anthropic cost table (input/output tokens × rate
   for each EF that calls Claude: process-document, ai-copilot,
   loyalty AI, etc.)
2. Usage-pattern scenarios: casual SME (5 invoices/week), active
   SME (3/day), franchise outlet (10/day), enterprise (50/day)
3. Per-tenant-month total cost at each scenario
4. Pricing tier proposals: Starter / Growth / Enterprise with caps
   that keep COGS < 30% of revenue
5. Franchise group pricing: tiered by outlet count with volume discount

**Effort estimate:** ~2h spreadsheet work + 1h review. Not code.

**Reference:** DECISION-JOURNAL S-2B.2-strategic entry. Informs
the WP-INGEST-RATE-LIMIT cap numbers.

### WP-PILOT-FORMALISATION — Written agreements for informal pilots
Status: BACKLOG · Reference-customer gate
Source: S-2B.2 strategic deep-dive (Section 4.3)
Trigger: Before using any existing informal pilot as a sales
reference, case study, or LinkedIn testimonial.

**Why this exists:**
Owner confirmed some small-retailer pilots are running informally
"on the books, also not 100%." Informal pilots are fine for product
learning but cannot be used in sales conversations without formalisation.
An informal relationship that sours leaves zero usable reference
material, and worse, creates potential POPIA / liability exposure.

**Scope:**
1. Written pilot agreement template (3-6 month free pilot, scope,
   liability limits)
2. POPIA compliance consent — data-holding + deletion-request language
3. Named primary contact per pilot (person, not shop)
4. Agreed success criteria per pilot (measurable, per-pilot)
5. Case-study / reference permission (written, dated)
6. Pilot → paid-conversion path with notice period

**Effort estimate:** ~4h for templates + 1h per existing pilot to
apply. Not code. Possibly needs legal review (R2-5k cost).

**Reference:** DECISION-JOURNAL S-2B.2-strategic entry.

### LOOP-FIN-004 — Trial Balance Excel Export (CA working papers format)
Status: OPEN · Nice-to-have for demo
Priority: MEDIUM — CAs import TB into Sage/MYOB for working papers
Fix: Add .xlsx export using existing chart_of_accounts data + journal_lines
     Ref: WP-FINANCIALS-v1_1.md Section 7 Excel Export spec
Effort: ~2 hours (use SheetJS in HQFinancialStatements.js)

### LOOP-FIN-005 — Provisional Tax + Compliance Calendar display
Status: OPEN · Post-demo backlog
Priority: LOW for 12 May · HIGH for first paying CA client

### BACKLOG-001 — Contextual action intelligence in the breadcrumb header
Logged: 15 April 2026 · Session 262

### BACKLOG-003 — WP-TENANT-GROUPS outstanding items (post-demo)
GP-001 through GP-006 — see prior versions for detail.

### CAPSTONE-003 (S316.5) — Loop system retrospective + register pattern-tagging
Status: **CLOSED — SESSION 318** · See CLOSED LOOPS — SESSION 318 above.

### WP-HQ-GRANULARITY — Platform vs Tenant HQ access separation
Status: BACKLOG · Do not execute until triggered
Source: S320 architecture decision (docs/PLATFORM-OVERVIEW_v1_0.md addendum)
Trigger: **Before `hq_access=true` is ever granted to any non-platform-operator user**

**Why this is parked, not done:**
Today `user_profiles.hq_access` is a single boolean and `is_hq_user()` returns
that boolean. Only platform operators (currently the owner, two accounts) have
it. 8+ tables use `hq_all_*` policies that trust `is_hq_user()`. The ambiguity
between "Platform HQ" and "Tenant HQ" is latent. Doing the split now is
premature optimisation — no real user needs tenant-HQ distinction yet.

**What fires the trigger:**
Any decision to grant `hq_access=true` to a tenant admin, franchise owner,
regional manager, auditor, or any other non-platform-operator role. The
moment that decision is made, this WP must ship BEFORE the grant, or
every `hq_all_*` table silently exposes cross-tenant data.

**Scope when executed:**
1. Add `user_profiles.access_level` enum: `platform_operator | tenant_hq | null`
2. Backfill: everyone with `hq_access=true` today → `platform_operator`
3. Rewrite `is_hq_user()` body:
   ```sql
   SELECT access_level = 'platform_operator'
   FROM user_profiles WHERE id = auth.uid();
   ```
4. Add new helper `is_tenant_hq()` for the tenant-HQ level
5. Audit every `hq_all_*` policy — does each table need Platform HQ only,
   or also Tenant HQ visibility?
6. Preserve `hq_access` column (or drop — decide at execution)
7. Update LL-205 guidance to reference the two-level model
8. Update AGENT-METHODOLOGY.md Section 1 (Platform Mental Model) to match

**Effort estimate:** 1 focused session (~4h) if no table bypasses need
widening; 2 sessions if several tables need tenant-HQ visibility added.

**Supersedes nothing.** The existing `tenant_groups` + `tenant_group_members`
(/group-portal) remains the franchise/multi-store mechanism. This WP is
about platform-level access control, not multi-store visibility for
franchise owners.

**Reference:** PLATFORM-OVERVIEW_v1_0.md S320 addendum ("Two-HQ architecture
clarification") contains the full architectural rationale. Read that first
when this WP is picked up.

### WP-RLS-HYGIENE — Migrate inline user_profiles subqueries to SECURITY DEFINER helpers
Status: BACKLOG · Post-demo
Source: S320 Audit 2 findings (LL-301)
Trigger: Any session that can afford 2-3 focused RLS passes, post-demo.

**Why this exists:**
Audit 2 from LL-301 found ~100 RLS policies across dozens of tables using
the pattern `tenant_id = (SELECT user_profiles.tenant_id FROM user_profiles
WHERE user_profiles.id = auth.uid())` instead of the `user_tenant_id()`
SECURITY DEFINER helper. These policies are structurally valid and
currently working, but:
1. They're fragile — if user_profiles RLS ever blocks (as S320 showed),
   all ~100 policies fail simultaneously
2. They're inefficient — subquery evaluated per row instead of cached
   per statement (SECURITY DEFINER STABLE semantics)
3. One outlier (`financial_statement_notes.hq_all_financial_statement_notes`)
   uses `role = 'operator'` inline — same pattern LL-NEW-5 (S313) called
   out as legacy-wrong

**Scope:**
1. Produce canonical table of ~100 affected policies (Audit 2 output)
2. For each, determine target helper (`user_tenant_id()` for tenant-scope,
   `is_hq_user()` for HQ-bypass variants)
3. Migrate in batches of ~20 per session (safer than bulk, allows per-batch
   gate check via login smoke test)
4. Zero data changes, zero code changes — pure policy rewrites
5. Fix the `financial_statement_notes` legacy outlier in the same sweep
   (move to `is_hq_user()` per LL-NEW-5)

**Effort estimate:** 2-3 focused sessions (~4h each). Conservative because
each batch needs Audit 1 verification + login smoke test before next batch.

**Rollback:** Each migration produces a named DROP POLICY + CREATE POLICY
pair. Reversible per-policy if anything regresses.

**Reference:** LL-300 (incident), LL-301 (audit lesson), LL-302 (session-start
audit queries).

### WATCH-012 — financial_statement_notes legacy hq_all_ policy
Status: OPEN · LOW priority
Source: S320 Audit 2 discovery
`financial_statement_notes.hq_all_financial_statement_notes` uses
`role = 'operator'::text` inline in its USING clause, rather than
`is_hq_user()`. This is the exact pattern LL-NEW-5 (S313) identified as
legacy-wrong and fixed on three dispensary tables. This one was missed.

Fix: DROP + CREATE with `is_hq_user()`. One-liner migration. Include in
WP-RLS-HYGIENE first batch, or opportunistically if a session touches
this table.
