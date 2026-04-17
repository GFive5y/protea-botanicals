# PENDING-ACTIONS.md
## Single source of truth for all open, date-sensitive loops.
## READ THIS AT EVERY SESSION START — after SESSION-STATE.
## UPDATE THIS FILE when: meeting date changes, items complete, new items added.
## NEVER delete a row — move completed items to CLOSED LOOPS section.

---

## MEETING DATE
**Current CA demo date: PENDING CONFIRMATION** (was 12 May 2026)
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

### DEBT-REGISTER REVIEW
Status: OPEN — Owner reads docs/DEBT_REGISTER_v1.md Section 4 and picks
top 3 items for Stage 1 fix sprint. No code work until owner confirms priorities.

### sim-pos-sales
Status: STANDING ALERT — must run the day BEFORE demo.
Trigger date: PENDING (depends on new demo date confirmation).

---

## KNOWN PERMANENT GAPS (document and explain in demo — do not fix before 12 May)

1. **POS VAT pipeline** — output VAT from POS orders not writing to vat_transactions.
   Root cause: POS transaction path does not call auto-post-capture EF.
   Impact: ~R5k BS gap per tenant (amber banner explains it).
   Why deferred: fixing requires touching live POS order flow + historical backfill.
   Regression risk outweighs cosmetic gap 4 weeks before demo.

2. **Cash flow opening balance not wired to bank recon** — cosmetic blank field.
   Requires prior-period closing balance snapshot table (does not exist).
   Not on demo critical path.

3. **Pricing data source red (0)** — no product_pricing records linked to recipes.
   Affects costing dashboard only. Not on demo critical path.

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

---

## WATCH ITEMS

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

### WATCH-009 (NEW S305) — Supplier tenancy data integrity (SAFETY-080)
suppliers table has 4 NULL-tenant + 5 HQ-tenant rows, 0 demo-tenant rows.
Cross-tenant data relationships exist at data layer (document_log rows
reference suppliers belonging to HQ, not the document's tenant). Requires
architectural decision (per-tenant copies vs shared fixtures). See
DEBT_REGISTER_v1.md Section 1.7. Not blocking safety or financial work.

---

## BACKLOG — FUTURE BUILD ITEMS (post-demo, no date constraint)

### LOOP-WTU-002 (NEW S293) — WP-TABLE-UNIFY Phase 2 execution (ingredient encyclopedia)
Status: SCOPED · POST-DEMO (do not start before 13 May 2026)
Source: docs/WP-TABLE-UNIFY_PHASE2_v1.md (645 lines, 12 sections)
Scope: 5 sub-phases totalling ~72 hours of focused work.
  2A SmartInventory feature parity   ~20h · tile/list/toggle/sort/search/bulk
  2B AI ingredient ingest            ~15h · new ingest-ingredient EF + queue table
  2C Recipe linkage surface          ~12h · hover-card, drawer tabs, graph walk
  2D Compliance view mode            ~10h · R638 inspection pack PDF + heat-map
  2E Consumer shop allergen filter   ~15h · deferred further, post-opt-in only
Prerequisites: Phase 1 COMPLETE (Y), FoodWorlds.js LIVE (Y),
  ProteaAI v1.8 LIVE (Y), process-document EF v53 (Y), ai-copilot EF v59 (Y).
New DB schema required (scoped in Section 4.4): ingredient_ingest_queue table +
  4 additional inventory_items columns.
New LLs drafted (Section 10): LL-291 through LL-294 — adopt as each sub-phase ships.
Next agent: READ THE SCOPE DOC IN FULL before planning any Phase 2 work.

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
