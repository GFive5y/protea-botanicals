# NUAI PLATFORM OVERVIEW v1.0
## Permanent orientation document — read BEFORE anything else
## Produced from LIVE-AUDIT v1.0 — direct codebase read — 09 April 2026
## This file is NEVER replaced. It is only appended with date-stamped updates.

---

## WHAT THIS SYSTEM ACTUALLY IS

NuAi is NOT a cannabis retail website. NuAi is NOT a dev project building features.

NuAi is a production multi-tenant SaaS ERP platform with 224,293 lines of code,
109 database tables, 6 distinct user portals, 10 cloud edge functions, and 4 industry
profiles — serving cannabis retail, food & beverage, general retail, and medical
cannabis from a single shared codebase and database.

This context must be in every agent's working model before any task is attempted.
A task that seems small (a VAT trigger, a stock modal) is a tiny increment on a
very large, very complete system. Understand the system before touching it.

---

## TRUE SCALE — FROM LIVE CODEBASE READ (09 Apr 2026)

| Metric | Figure |
|---|---|
| Total lines of production code | 224,293 |
| JavaScript source files | 180 |
| TypeScript Edge Function files | 10 |
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

**Largest files:**
HQProduction.js 8,949 lines · HQStock.js 5,890 · SmartInventory.js 5,343 ·
HQFoodIngredients.js 5,082 · StockControl.js 4,759 · AdminQRCodes.js 4,750 ·
HQLoyalty.js 4,537 · HQCogs.js 3,912 · Shop.js 4,115 · Account.js 3,447

---

## THE SIX PORTALS

| Portal | Route | Users | Key Capability |
|---|---|---|---|
| HQ Command Centre | /hq | HQ operator | 41-tab cross-tenant oversight — finance, stock, analytics, loyalty, fraud |
| Tenant Portal | /tenant-portal | Business owner | Waterfall nav — 35 tabs, role-gated, industry-profile adaptive |
| Admin Dashboard | /admin | Store manager | 13-tab store operations — batches, stock, customers, QR, comms |
| HR Suite | /hr | HR manager | 13 modules — timesheets, leave, roster, payroll, performance, disciplinary |
| Consumer Shop | /shop | Customers | E-commerce + loyalty + age gate + PayFast + cannabinoid education |
| Staff Portal | /staff | Staff | 4-tab self-service — profile, leave, timesheets, messages |

---

## MAJOR SYSTEMS — WHAT THEY DO

### 1. Financial Intelligence Suite (WP-FINANCIALS — COMPLETE)
10 phases, all live. IFRS-compliant statements from live operational data.
- Income Statement: revenue from orders, COGS from AVCO, expenses from expenses table
- Balance Sheet: assets (cash/inventory/PP&E), liabilities (payables/VAT), equity
- VAT Module: VAT201 format, 3-point automated pipeline (P3-A + P3-B + P3-C)
- Fixed Assets: IAS 16, straight-line depreciation, Run Depreciation workflow
- Journals: double-entry, COA picker, post/reverse, auto-type from Smart Capture
- Bank Recon: FNB account, 22 lines, R180,733.69 reconciled
- IFRS Statements: 4 statements, print/PDF, status workflow
- Year-End Close: 4-step wizard, closing journal, lock, archive
- Financial Notes: 15 IFRS disclosure notes from live data
- Financial Setup: 5-screen wizard gates all statements

Current live figures: R477,880 revenue · 62.13% gross margin · R296,606 net profit

### 2. Smart Capture & Automated Accounting
process-document EF (v53, 1,054 lines) + auto-post-capture EF (v2, 137 lines)
- AI reads any business document (invoice, delivery note, COA, receipt)
- 6-level HMAC anti-fraud fingerprint — prevents duplicate invoice submission
- SARS compliance check on every invoice capture
- Atomic: expense + double-entry journal + VAT trigger = one approved capture
- VAT pipeline: 3 automated entry points, all trigger-based, no manual entry

### 3. QR Authentication & Intelligence Network
sign-qr EF (v36) + verify-qr EF (v34) + AdminQRCodes.js (4,750 lines)
- HMAC-SHA256 cryptographic signing — same algorithm class as banking
- GPS coordinates, device fingerprint, timestamp captured on every scan
- Velocity fraud detection on scan_logs
- Loyalty points awarded per scan — tier/category/campaign multipliers
- 181 scans logged · 60 active codes · 62 system alerts
- Applications: product authentication, loyalty collection, packaging direction,
  geographic analytics, HR clock-in/out, consumer education

### 4. Inventory Intelligence (17 Components, 33,000+ Lines)
NOT a stock count. A complete inventory intelligence system:
- AVCO recalculated by DB trigger on every single stock movement
- 14 Product Worlds with custom fields per product type
- Smart Catalog: tile/list/Excel views, smart search syntax (price>500, qty:0),
  drag-to-resize columns, bulk actions, 6 KPI cards
- AI-scored velocity-weighted reorder recommendations → draft PO creation
- 3-step receiving workflow with VAT capture and AVCO update
- Blind/guided staff stock takes
- Inter-store transfers with TRF references
- COGS Builder: hardware/terpene/distillate/lab/transport/packaging/loyalty
- 2,289 stock movement records — complete audit trail

### 5. Loyalty & AI Customer Engine
HQLoyalty.js (4,537 lines) + loyalty-ai EF
- 10-tab programme management: tiers, campaigns, referrals, simulator, AI Engine
- Nightly AI engine: churn rescue, birthday bonus, stock boost, point expiry
- 401 loyalty transactions · 189 AI action logs · 263 points transactions
- WhatsApp notifications via Twilio on tier upgrades (send-notification EF v37)

### 6. HR Suite (13 Modules, 21,583 Lines)
- Timesheets, Leave (BCEA), Roster, Performance, Loans, Disciplinary, Contracts
- SimplePay CSV export for payroll
- SA public holidays (40) in calendar
- Staff stock takes: blind and guided modes

### 7. ProteaAI (2,346 Lines — LOCKED)
- 3 tabs: Chat (conversational), Query (natural language → live SQL), Dev (error monitor)
- Context-aware per portal tab — pre-suggests relevant questions
- ai-copilot EF v59: routes all AI queries, supports tool use
- systemOverride: callers can supply custom system prompts (used by Smart Capture)

### 8. Industry Profile System (4 Profiles, 26 Files with Branching)
One codebase, four industries:
- cannabis_retail: default — strains, THC/CBD, molecule education, QR auth
- cannabis_dispensary: SAHPRA, prescriptions, dispensing log (gated module)
- food_beverage: 16,085 lines exclusive — SA DAFF ingredients, HACCP, allergens,
  cold chain, nutrition labels, recall, FSCA letters (SA R638 compliance)
- general_retail: standard SKU management

### 9. Consumer Shop (Public Storefront)
- Age verification gate, adaptive product cards per industry profile
- PayFast payment gateway, loyalty redemption at checkout
- 7 interactive cannabinoid molecule visualisers (6,620 lines)
- Terpene education with flavour wheel and aroma profiles
- Product verification page at /verify/:productId (public, no login)

---

## EDGE FUNCTIONS (10 DEPLOYED)

| Function | Version | Purpose |
|---|---|---|
| process-document | v53 | AI document extraction — Smart Capture |
| auto-post-capture | v2 | Atomic expense + journal + VAT trigger |
| ai-copilot | v59 | All ProteaAI queries |
| sim-pos-sales | v4 | POS sales simulator for demos |
| payfast-checkout | v44 | PayFast payment initiation |
| payfast-itn | v39 | PayFast payment confirmation webhook |
| sign-qr | v36 | HMAC-SHA256 QR signing |
| verify-qr | v34 | QR verification + scan logging |
| get-fx-rate | v35 | Live USD/ZAR with 60s cache |
| send-notification | v37 | WhatsApp via Twilio — 7 business triggers |

---

## WHAT IS LOCKED OR PROTECTED

LOCKED (never write — Claude Code str_replace only for specific fields):
  src/components/StockItemModal.js — 14 Product Worlds
  src/components/ProteaAI.js — CODEBASE_FACTS str_replace only
  src/components/PlatformBar.js
  src/services/supabaseClient.js

PROTECTED (read full file before any change):
  src/components/hq/HQStock.js
  src/components/hq/LiveFXBar.js

---

## CRITICAL RULES (reference only — full rules in NUAI-AGENT-BIBLE.md)

RULE 0Q: NEVER push_files or create_or_update_file from Claude.ai. Ever.
LL-205: Every new DB table needs hq_all_ RLS bypass policy.
LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
LL-207: No tenantId props on HQ child components.
LL-208: Enumerate ALL tables a feature will query before any migration.

---

## HOW TO READ THIS SYSTEM

Do not assume a feature is small because the task description is small.
Before touching any file:
1. Read this document (done)
2. Read NUAI-AGENT-BIBLE.md (rules, patterns, lessons learned)
3. Read SESSION-STATE (current state, current priority)
4. Read VIOLATION_LOG (what went wrong before)
5. Read the actual file you are about to change (not the docs about it)

The LIVE-AUDIT is in docs/LIVE-AUDIT_v1_0_part1.md, part2.md, part3.md.
If you need to understand what a specific component does, read it.

---
*PLATFORM-OVERVIEW v1.0 · NuAi · First produced 09 April 2026*
*Updated: [add date-stamped entries below — never replace above]*

---
## Update: 10 Apr 2026 — AINS v1.0 + FIN-AUDIT v1.0 Complete

### WP-AINS v1.0 — COMPLETE (6 phases, ~1,400 lines added)

New intelligence surfaces on TenantPortal — all SQL-computed, zero LLM on open:
- Sidebar badges (live counts per nav section)
- Sub-item insights (1-line SQL fact per nav sub-item)
- IntelLines (2 clickable live facts above NuAi mark)
- NuAi mark (brand strip + today's key metric)
- IntelStrip (4-6 tab-specific pills between breadcrumb and content)
- NuAi panel brief (pre-loaded right now / working well / actions)
- Click-through (pill or IntelLine → NuAi pre-focused on that context)

New files: useNavIntelligence.js · IntelligenceContext.js · useIntelStrip.js
           IntelStrip.js · useBrief.js · NuAiBrief.js
Modified: AIFixture.js v2.0 · ProteaAI.js v1.8 · TenantPortal.js

PlatformBar removed from TenantPortal. Jobs absorbed by AINS surfaces.
PlatformBar retained in AppShell for /admin /hq /hr routes.

### FIN-AUDIT v1.0 — COMPLETE (4 gaps)

- GAP-01: Revenue ÷1.15 (SA VAT) in HQProfitLoss — d7d2df9
- GAP-02: Manual journal adjustments flow to P&L — c3b624c
- GAP-03: ExpenseManager VAT Review mode — 4b1a9fa
- GAP-04: Depreciation run — R822.22/month — owner action

### Pending next session

- WP-NAV-RESTRUCTURE: Sales channels unified, Finance section clean,
  Analytics moves to Customers, Reorder moves to Inventory
- Scan analytics: qr_codes join for tenant-scoped scan pills in useIntelStrip

---
## Update: 10 Apr 2026 — Commercial Readiness Phase Begins

### Company Name
Legal entity registered at CIPC: **Nu Ai (Pty) Ltd.** (space between Nu and Ai)
All commercial documents, NDAs, and external communications use this name verbatim.
The visual brand mark (Nu white + Ai green) is unchanged.

### AINS v1.0 — Complete
See SESSION-STATE_v220.md. 6 phases, ~1,400 lines added.
5 surfaces live: sidebar badges, IntelLines, NuAi mark, IntelStrip, panel brief.
Full click-through depth. Zero LLM on open. SQL-computed throughout.

### FIN-AUDIT v1.0 — Complete
GAP-01: Revenue ÷1.15 fixed in HQProfitLoss (d7d2df9)
GAP-02: Manual journal adjustments flow to P&L (c3b624c)
GAP-03: ExpenseManager VAT Review mode (4b1a9fa) — owner action pending
GAP-04: Depreciation running — R822.22/month posted

### Stack Deep Dive — Key Findings
File storage IS already implemented — supplier-documents bucket (26MB, 48 files).
capture_queue has image_storage_path. Document archiving is architecturally complete.
Current DB: 25MB. At 100 tenants: ~2.5GB (needs Supabase Pro at launch).
8 commercial gaps identified — see COMMERCIAL-READINESS_v1_0.md.
Stack verdict: architecture is CORRECT. Additions needed, not a rebuild.

### Pricing Structure (confirmed)
Starter: R3,500/month · Professional: R6,500/month · Enterprise: R12,500/month

### Commercial Readiness Priority Build Order
1. Mobile camera capture (PWA + camera input in HQSmartCapture.js) — 2-3 days
2. WP-NAV-RESTRUCTURE — navigation grouping cleanup
3. Scan analytics (qr_codes join for AINS)
4. Email infrastructure (Resend API + send-email Edge Function) — 3-5 days
5. Background jobs (pg_cron for depreciation, loyalty, VAT) — 1-2 weeks
6. CA Firm Partner Portal — 4-6 weeks

### VL-012
5th RULE 0Q violation — push_files called from Claude.ai at session close.
Self-check protocol added to VL-012. Rule is absolute. No exceptions.

---
## UPDATE — 11 April 2026 (post WP-MEDI-CAN + WP-FINANCIAL-PROFILES)

### REVISED SCALE
| Metric | Original (09 Apr) | Current (11 Apr) |
|---|---|---|
| Active client tenants | 5 | **9** |
| Industry profiles live | 4 | **4** (cannabis_dispensary now fully functional) |
| Cloud edge functions deployed | 10 | **12** (seed-tenant v4 + trigger-sim-nourish) |
| Database tables | 109 | **112** (+ patients, prescriptions, dispensing_log) |
| HQ dashboard functional tabs | 41 | **41+** (F&B modules wired to tenant portal) |

### NEW TENANTS
- Medi Can Dispensary (2bd41eb7) — cannabis_dispensary profile · SAHPRA S21 · 8 products · 5 patients · 14 dispensing events · seed_complete=true · DO NOT RE-SEED
- Nourish Kitchen & Deli (944547e3) — food_beverage profile · 240 orders · kitchen-first nav
- Vozel Vapes (388fe654) — general_retail · 232 orders seeded (via Maxi Retail SA: 9766a3af)

### NEW/UPDATED SYSTEMS

**Medical Dispensary Module (WP-MEDI-CAN — COMPLETE)**
HQMedical.js — gated (cannabis_dispensary + feature_medical=true)
6 sub-tabs: Patients | Prescriptions | Dispensing | Reports | Compliance | CSR
- Patients: S21 authorisation tracking, expiry alerts, SAHPRA S21 numbers
- Prescriptions: repeat tracking, expiry enforcement, active/inactive toggle
- Dispensing: record events, stock deduction, Rx repeat increment
- Voiding UI: void-only workflow (LL-226), mandatory reason, audit trail
- Reports: monthly by patient/substance, SAHPRA CSV export
- CSR: Controlled Substance Register, perpetual balance, running ledger
LL-226: dispensing_log is Schedule 6 — NEVER hard-delete, void only

**Profile-Adaptive Financial Suite (WP-FINANCIAL-PROFILES — COMPLETE)**
HQProfitLoss.js: 4-profile revenue routing, benchmarks, labels, Food Cost % KPI
  cannabis_dispensary: revenue = dispensing_log × sell_price (LL-231)
  food_beverage: Green ≥65% · Food Cost % primary KPI target <30% (LL-232)
  cannabis_retail: Green ≥50%
  general_retail: Green ≥35%
ExpenseManager.js: profile-aware subcategory system
HQForecast.js: dispensary velocity from dispensing_log, S21 + Rx clinical alerts

**4-Branch Tenant Portal Navigation (WP-PROFILE-NAV — COMPLETE)**
TenantPortal.js getWaterfall():
  cannabis_dispensary → Clinical-first nav (Home/Clinical/Inventory/Financials/Operations/People)
  food_beverage → Kitchen-first nav (Home/Kitchen/Food Safety/Inventory/Sales/Financials/People)
  cannabis_retail → Budtender nav (unchanged)
  all others → Manufacturing nav (default)

### HQ SIDEBAR LABELS (renamed 11 Apr 2026)
Finance → Financials · Intelligence → Analytics · Procurement → Purchasing
Paths unchanged — label only.

### EDGE FUNCTIONS (current)
| Slug | Version | Notes |
|---|---|---|
| seed-tenant | v4 | Supports: general_retail · food_beverage · cannabis_dispensary · repo now synced |
| process-document | v53 | Updated from v52 |
| auto-post-capture | v2 | Updated from v1 |
| trigger-sim-nourish | v1 | OWNER SHOULD DELETE — throwaway one-shot |

### NEW DB TABLES
patients (cannabis_dispensary): id, tenant_id, name, id_number, date_of_birth, medical_aid,
  contact, section_21_number, s21_expiry_date, condition, authorized_practitioner, is_active
prescriptions (cannabis_dispensary): id, tenant_id, patient_id, doctor_name, doctor_hpcsa,
  substance, quantity_mg, repeats, repeats_used, issue_date, expiry_date, is_active
dispensing_log (cannabis_dispensary — Schedule 6): id, tenant_id, patient_id, prescription_id,
  inventory_item_id, batch_id, quantity_dispensed, dispensed_by, dispensed_at, notes,
  is_voided, void_reason, void_at, void_by
All three tables: tenant_isolation + hq_all_ bypass policies (LL-205) ✅

*Update produced from live codebase · 11 April 2026*

---
## UPDATE — 11 April 2026 (HEAD: 46d9a20)

### Scale corrections (live verified)
| Metric | v1.0 figure | Corrected |
|---|---|---|
| Edge functions | 10 | 16 (trigger-sim-nourish deleted) |
| Portals | 6 | 7 (+ /group-portal) |
| Active tenants | 5 | 9 |
| DB tables | 109 | 111 (+ tenant_groups + tenant_group_members) |
| ai-copilot EF | v59 | v70 |
| process-document EF | v53 | v56 |
| auto-post-capture EF | v2 | v5 |
| sign-qr EF | v36 | v39 |
| verify-qr EF | v34 | v37 |
| send-notification EF | v37 | v40 |
| loyalty-ai EF | v2 | v5 |

### New portal — /group-portal
Franchise & Group Owner Portal — added 11 April 2026.
tenant_groups + tenant_group_members tables (RLS-secured).
NetworkDashboard: combined KPIs, store comparison, quick actions.
WP-TENANT-GROUPS Phases 1-3 complete. Phase 4 in progress.
Test user: medican@nuai.dev / MediCan2026! (franchisor role).

### New tenants (total now 9)
Medi Can Dispensary (2bd41eb7) · cannabis_dispensary · 14 events · R20k
Nourish Kitchen (944547e3) · food_beverage · 240 orders · R43k
Maxi Retail SA (9766a3af) · general_retail · 232 orders · R186k
Pure Premium THC Vapes (f8ff8d07) · cannabis_retail
Vozel Vapes (388fe654) · general_retail
+ Nu Ai HQ + Medi Recreational + Test Dispensary CT + TEST SHOP

### LL-206 CORRECTION (critical — old rule was wrong)
Old (wrong): const { tenant } = useTenant(); const tenantId = tenant?.id;
Correct: const { tenantId, industryProfile } = useTenant();
Both are directly exposed on TenantContext. Verified 11 April 2026.

### RLS helper correction
user_tenant_id() is the correct function name.
get_my_tenant_id() does NOT exist. Never use it.

### Design system — WP-DS-6 Phase 1 complete
7 new token groups in src/styles/tokens.js:
T.container · T.page · T.sidebar · T.breakpoint
T.gap · T.pad · T.inset
All new features must use T.* tokens. No hardcoded px values.
Dead space rule: LL-238. Full ref: docs/WP-DESIGN-SYSTEM.md

### New protected files
src/components/group/GroupPortal.js (445 lines)
src/components/group/NetworkDashboard.js (730 lines)
src/components/hq/HQMedical.js
src/components/hq/HQOverview.js
src/components/hq/HQProfitLoss.js

*Appended: 11 April 2026 · HEAD: 46d9a20*

---

## ADDENDUM — Strategic Intelligence Layer (12 April 2026)

Strategic intelligence layer: **docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md**
— full capability map, design system standards, known issues, and quality
expectations for every agent. Read this **before** PLATFORM-OVERVIEW for
full context. PLATFORM-OVERVIEW provides the scale snapshot; NUAI-STRAT-INTEL
provides the strategic framing and the quality standard every new commit
is measured against. NUAI-STRAT-INTEL is never replaced — only addended.

*Appended: 12 April 2026 · NUAI-STRAT-INTEL v1.0 landed in the handover loop*

---

## UPDATE — 13 April 2026

### WP-UNIFY initiated — design system unification is now governing policy

The platform now has two distinct visual tiers:
  - Components built inside tokens.js (Group Portal, Tenant Portal shell,
    AINSBar, TokenContext) -> look like a Series A product
  - Components built before the design system existed (HQStock, HQProduction,
    most of the 41 HQ tabs) -> look like a capable internal tool

This gap is documented with full neuroscience and UX research in:
  docs/WP-UNIFY_v1_0.md

Every agent MUST read WP-UNIFY_v1_0.md before touching any UI component.
This is as mandatory as reading this PLATFORM-OVERVIEW.

The 8 governing UNIFY rules are in that document. The short version:
  1. No local T definition ever — import { T } from tokens.js
  2. Migrate on touch — every opened file gets its local T migrated
  3. Two font weights only (400/500 body, 600/700 labels)
  4. One border style — border: `1px solid ${T.border}`
  5. Semantic colour by token only (T.danger/T.warning/T.success/T.info)
  6. Inter in portals, Jost on consumer pages only
  7. Shared components first — src/components/shared/
  8. Demo path Tier 1 components match Group Portal by 12 May 2026

WP-DS-6 (all 4 phases) is complete as of this update:
  Phase 1 Shell Unification cf9241e
  Phase 2 AINS Bar 2df028f
  Phase 3 Profile-Aware Tokens 1c2d51e
  Phase 4 Notification Badges 0b62ca1

Group Portal (/group-portal) added — 7th portal, franchise/network view.
Demo group "NuAi Business Rescue Portfolio" seeded with all 4 CA demo stores.

*Update by: Claude.ai + George Fivaz · 13 April 2026*

---

## UPDATE: 13 April 2026 — WP-UNIFY COMPLETE

**WP-UNIFY migration is fully complete.** All authenticated portal components
now import from src/styles/tokens.js. 80+ files migrated across P1-P5.

Alt schema registry (intentionally different from tokens.js):
- SINV_T: SmartInventory.js
- POS_T: POSScreen.js
- GEO_T: GeoAnalyticsDashboard.js
- FI_T: HQFoodIntelligence.js (slate ink palette + 9 composite styles)

*Update: WP-UNIFY session close · 13 April 2026*

---
*Update: 14 April 2026 — WP-DEMO-AUDIT retrospective + coherence failure discovery*

## DEMO TENANT STATUS (14 Apr 2026)

| Tenant | Profile | Phase 0-4 | Trading data | Notes |
|---|---|---|---|---|
| MediCare Dispensary | cannabis_dispensary | Complete | via dispensing_log | All 5 phases verified |
| Metro Hardware | general_retail | Nav/isolation done | 0 real orders | sim-pos-sales not yet run for this tenant |
| Medi Recreational | cannabis_retail | Complete | 1,758 real orders | Shell orders cancelled |
| The Garden Bistro | food_beverage | Phase 4 pending | 3,388 real orders | Shell orders cancelled |

## CRITICAL FINDING: COHERENCE FAILURE CLASS (discovered 14 Apr 2026)

The tenant-isolation audit (Layer 1 — query filter scan) checks that data
belongs to the right tenant. It does NOT check that data makes business sense.

**Shell orders** (orders with no order_items records) are financially real —
they appear in revenue, P&L, and Dashboard KPIs — but operationally hollow:
no stock moves, no top sellers, no COGS. They are produced by the old
sim-pos-sales mechanism and any POS integration that creates order headers
without order_items.

**Symptom pattern that exposes them:**
- Dashboard TODAY'S SALES >> Daily Trading TRANSACTIONS (same day, same tenant)
- "Zero sales recorded in last 30 days" AI insight alongside non-zero revenue
- "Top Sellers: No sales recorded today" alongside positive order count
- P&L revenue inconsistent with 30-day chart scale
- Selling more in one day than total inventory value at cost

**Scale found on 14 Apr 2026:**
- Metro Hardware: 786 shell orders, R3.57M phantom revenue — ALL cancelled
- Garden Bistro: 390 shell orders, R125k phantom revenue — ALL cancelled
- Medi Recreational: 182 shell orders, R202k phantom revenue — ALL cancelled

**Fix applied:** `UPDATE orders SET status='cancelled' WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id=orders.id)`

## THREE-LAYER AUDIT (updated 14 Apr 2026)

Every agent must run all three layers in order. No layer can be skipped.

**Layer 1 — Tenant isolation** (`python3 docs/audit_tenant_isolation.py`)
Catches: query bleed, stale closures, hardcoded profile labels.
Must exit 0 before browser opens.

**Layer 2 — Data completeness** (paste docs/PREFLIGHT-SQL.md into Supabase)
Catches: AVCO=0, sell_price=0, missing expenses, wrong category items.
All MUST_BE_0 rows must return 0.

**Layer 3 — Data coherence** (bottom section of docs/PREFLIGHT-SQL.md)
Catches: shell orders, daily revenue spikes, orphaned stock movements.
Added 14 Apr 2026 after discovering shell orders inflating financials.

## SIM-POS-SALES (sim-pos-sales edge function)

**v2.0:** Complete POS simulation — orders + order_items + stock_movements +
pos_sessions + eod_cash_ups. All tagged `notes='sim_data_v1'` for easy wipe.
Does NOT deduct actual inventory quantities.

**v3.0 (14 Apr 2026):** Parameterized — accepts tenant_id in request body.
Was hardcoded to Medi Recreational (b1bad266-...) in v2.
Now works for any tenant that has inventory_items with sell_price > 0.

**Trigger timing:** Day BEFORE demo day (May 11 for May 12 demo).
CANNOT be triggered from Claude.ai (RULE 0Q).
Trigger from: Supabase Studio > Edge Functions > sim-pos-sales > Invoke.
Body: `{"tenant_id": "TENANT_UUID", "days": 30, "orders_per_day": 12}`

**LOOP-001 — STILL OPEN:** Metro Hardware needs sim triggered before demo.
Metro tenant_id: 57156762-deb8-4721-a1f3-0c6d7c2a67d8

**Wipe command** (per tenant, from Supabase Studio):
```sql
DELETE FROM eod_cash_ups WHERE notes='sim_data_v1' AND tenant_id='TENANT_ID';
DELETE FROM pos_sessions WHERE notes='sim_data_v1' AND tenant_id='TENANT_ID';
DELETE FROM stock_movements WHERE notes='sim_data_v1' AND tenant_id='TENANT_ID';
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE notes='sim_data_v1' AND tenant_id='TENANT_ID');
DELETE FROM orders WHERE notes='sim_data_v1' AND tenant_id='TENANT_ID';
```

## RULES ADDED THIS SESSION

**RULE-COH-001:** Before any visual verify, run coherence checks from
docs/PREFLIGHT-SQL.md (Layer 3). Shell orders MUST be 0. If today's
revenue is > 3x the 30-day daily average, investigate before proceeding.

**RULE-COH-002:** Any orders record with no matching order_items is a
phantom record. Cancel it. Never let phantom records reach a demo screen.

**RULE-COH-003:** Revenue coherence check — today's revenue must not
exceed total stock value at cost. If it does, the data is synthetic.

---

## UPDATE — 18 April 2026 (S320) — Two-HQ architecture clarification

### The distinction that was never written down (and must be preserved)

Every tenant on NuAi eventually gets the full stack:
- **Consumer website** (shop, loyalty, account)
- **Admin portal** (store manager / front-of-house)
- **Tenant HQ portal** (owner's command centre for *their* business)
- **Wholesale portal** (B2B)

**"Tenant HQ" is the top of that tenant's world.** It sees everything inside
their tenant boundary — all their stores, all their stock, all their staff,
all their financials. It never sees across tenants.

**"Platform HQ" (Nu Ai (Pty) Ltd — currently the owner, admin@protea.dev
and fivazg@gmail.com) sits above all of them.** It is NOT "Tenant HQ scaled
up." It is a different kind of thing:
- Multi-tenant visibility (cross-store analytics, platform-wide operational view)
- Platform management (tenant lifecycle, billing, feature flags, demo seeding)
- Executive suite applications (WP-AINS, cross-tenant intelligence,
  platform health dashboards)

The Exec Suite apps we are currently building are **Platform HQ** tools,
not Tenant HQ tools. They need cross-tenant visibility by design.

### Current implementation vs. long-term intent

**Today (dev / pre-launch):**
- `user_profiles.hq_access` is a single boolean
- `is_hq_user()` is a single SECURITY DEFINER function returning that boolean
- Only two accounts carry `hq_access=true`, both are the platform owner
- Every tenant-scoped table with a `hq_all_*` bypass policy trusts that flag
- The single flag conflates "Platform HQ" and "Tenant HQ" because no tenants
  have been granted it yet. The semantic ambiguity is latent, not active.

**Planned migration (when Tenant HQ portals ship to real customers):**
- `user_profiles.access_level` enum replaces the boolean:
  `platform_operator | tenant_hq | null`
- `is_hq_user()` function body is rewritten to check for `platform_operator`
- New helper `is_tenant_hq()` added for within-tenant HQ scope
- Every existing `hq_all_*` policy keeps working unchanged — they call the
  function, not the column. One-point abstraction.
- New/modified tables decide case-by-case: does Tenant HQ need to see this?
  (Example: `food_ingredients` — no. Each tenant's recipe IP is theirs.)

### Why this matters for every future agent

1. When designing a new table, the LL-205 `hq_all_*` bypass question has two
   dimensions, not one:
   - Does Platform HQ need to see it? (almost always yes)
   - Does Tenant HQ need to see it across their stores? (case-by-case)
2. The boolean flag's current meaning is a dev shortcut with a migration
   path. Do not treat it as the final architecture.
3. When `hq_access=true` is ever granted to a non-operator user (franchise
   owner, regional manager, auditor), every existing `hq_all_*` policy
   must be audited first. See BACKLOG item WP-HQ-GRANULARITY in
   PENDING-ACTIONS.md.

### Scope boundary against WP-TENANT-GROUPS

Multi-store visibility for a franchise owner is *not* what `hq_access`
handles. That's `tenant_groups` + `tenant_group_members` (shipped,
`/group-portal`). A franchisor's cross-store view comes from being a
member of a group, not from carrying HQ access. The two mechanisms
solve different problems:
- `tenant_groups` — "I own three stores, show me all of them"
- `hq_access` — "I am the platform operator, show me all tenants"

The migration above adds `tenant_hq` between these two: "I am the top of
one tenant, within that tenant I see everything." Today, tenant admins
see their tenant by virtue of standard RLS (`tenant_id = user_tenant_id()`).
No HQ bypass needed. The `tenant_hq` level becomes relevant only if a
future feature creates per-tenant resources with sub-scopes that need
tenant-HQ-level visibility that exceeds normal tenant RLS.

### S320 decision applied to `food_ingredients`

For WP-TABLE-UNIFY Phase 2, Option A was chosen: add `hq_all_food_ingredients`
using `is_hq_user()`, matching the existing pattern on 8+ other tables. When
the migration above happens, `is_hq_user()` will tighten to
`platform_operator` only, and `food_ingredients` correctly stays
platform-HQ-only (tenant IP shouldn't cross tenant boundaries, including
for a franchisor).

### Capture rationale

This distinction was clear in the owner's head but not in any doc until
S320. The risk was that future agents (or future owner) would assume
`hq_access=true` was safe to grant to a sophisticated tenant admin,
silently exposing 8+ tables of cross-tenant data. Writing it down here
converts a latent architecture assumption into explicit, auditable intent.

*Appended: 18 April 2026 · Session 320 · Two-HQ architecture captured*
