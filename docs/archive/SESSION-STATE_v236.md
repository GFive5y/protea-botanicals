# SESSION-STATE v236
## Sessions covered: WP-FINANCIAL-PROFILES v1.0 — complete
## HEAD at close: e131939 on origin/main
## Previous state: SESSION-STATE_v235.md (HEAD fb20c9b)
## Written: 11 April 2026

---

## MANDATORY READING ORDER FOR NEXT AGENT
1. docs/PLATFORM-OVERVIEW_v1_0.md        — permanent system orientation (read FIRST, always)
2. docs/NUAI-AGENT-BIBLE.md              — all rules, patterns, LL-192 onward
3. docs/LL-ARCHIVE_v1_0.md              — LL-001 through LL-191 (sacred, never skip)
4. docs/SESSION-STATE_v236.md           — this file
5. docs/WP-FINANCIAL-PROFILES_v1_0.md   — profile-adaptive financial suite (COMPLETE)
6. docs/WP-INDUSTRY-PROFILES_v1_0.md   — 5-profile ERP strategy
7. docs/VIOLATION_LOG_v1_1.md           — what went wrong before (read before touching anything)
8. The actual file you are about to change — LL-221, always

---

## PLATFORM STATE (as of e131939, 11 April 2026)

### Infrastructure
- Repo: github.com/GFive5y/protea-botanicals
- Supabase project: uvicrqapgzcdvozxrreo (eu-west-1)
- Live URL: https://nuai-gfive5ys-projects.vercel.app
- Stack: React 18 + Supabase + Vercel + Deno Edge Functions

### Tenants (9 total — unchanged from v235)
| Tenant | ID (first 8) | Profile | Revenue data source |
|---|---|---|---|
| Nu Ai HQ | 43b34c33 | operator | n/a |
| TEST SHOP | 4a6c7d5c | cannabis_retail | orders table |
| Pure Premium THC Vapes | f8ff8d07 | cannabis_retail | orders table |
| Medi Recreational | b1bad266 | cannabis_retail | orders table |
| Test Dispensary CT | 064adbdc | cannabis_retail | orders table |
| Vozel Vapes | 388fe654 | general_retail | orders table |
| Maxi Retail SA | 9766a3af | general_retail | orders table · 232 orders |
| Nourish Kitchen & Deli | 944547e3 | food_beverage | orders table · 240 orders |
| **Medi Can Dispensary** | **2bd41eb7** | **cannabis_dispensary** | **dispensing_log × sell_price** |

### CRITICAL: Medi Can Dispensary (DO NOT RE-SEED)
- tenant_id: 2bd41eb7-1a6e-416c-905b-1358f6499d8d
- seed_complete: true · feature_medical: true
- 8 products · 5 patients (S21 data) · 5 prescriptions · 14 dispensing events
- Fatima Davids: S21 expiring ~25 days from 11 Apr — shows amber/red in Compliance tab
- P&L now shows REAL dispensing revenue (LL-231 closed by f6e4a23)

---

## WHAT CHANGED THIS SESSION (da97cd8 → e131939)

### Commits (5 commits, 1 push)
| Commit | File | Change |
|---|---|---|
| 8e9dfda | docs/WP-FINANCIAL-PROFILES_v1_0.md | New 349-line WP spec (already in repo from da97cd8 push) |
| e5c2108 | src/hooks/useNavConfig.js | Finance→Financials, Intelligence→Analytics, Procurement→Purchasing |
| da97cd8 | src/pages/TenantPortal.js | FOOD_BEVERAGE_WATERFALL + FB_ROLE_SECTIONS + getWaterfall F&B branch |
| e8450ec | src/pages/TenantPortal.js | 9 F&B module imports + 9 renderTab cases (hq-recipes, hq-haccp, etc.) |
| f3ebbfb | supabase/functions/seed-tenant/index.ts | v4 sync from deployed Supabase — closes LL-193 |
| f6e4a23 | src/components/hq/HQProfitLoss.js | 12 sub-edits — dispensing revenue, profile benchmarks, Food Cost % KPI |
| 418a014 | src/components/hq/ExpenseManager.js | Profile-aware subcategory system |
| e131939 | src/components/hq/HQCogs.js | Header copy update |

---

## CURRENT STATE OF KEY COMPONENTS

### TenantPortal.js — getWaterfall() routing (4 branches)
cannabis_dispensary → CANNABIS_DISPENSARY_WATERFALL (Clinical nav · Heart icon)
food_beverage       → FOOD_BEVERAGE_WATERFALL (Kitchen-first · 7 sections)
cannabis_retail     → CANNABIS_RETAIL_WATERFALL (Budtender nav)
all others          → WATERFALL (manufacturing nav — default)

### FOOD_BEVERAGE_WATERFALL (Nourish Kitchen) — all tabs wired
- Home: overview
- Kitchen: hq-production · hq-recipes · hq-ingredients (all render real components)
- Food Safety: hq-haccp · hq-food-safety · hq-cold-chain · hq-recall · hq-nutrition (all wired)
- Inventory: stock · supply-chain
- Sales & Service: trading · cashup · pos · loyalty
- Financials: pl · expenses · invoices · journals · vat · bank-recon · balance-sheet · forecast · year-end
- People: staff · roster · timesheets · leave · payroll

### CANNABIS_DISPENSARY_WATERFALL (Medi Can) — all tabs wired
- Home: overview
- Clinical: medical (→ HQMedical with 5 sub-tabs)
- Inventory: stock · hq-production · supply-chain
- Financials: pl · expenses · invoices · journals · vat · bank-recon · balance-sheet · forecast · year-end
- Operations: cashup · documents · smart-capture
- People: staff · roster · timesheets · leave · contracts · payroll · hr-calendar

### HQProfitLoss.js — profile-adaptive revenue (2,872 lines + 191 new)
Revenue routing (LL-231):
  cannabis_dispensary → dispensingRevenue (from fetchDispensingRevenue callback)
  all others          → websiteRevenue (from orders table)

Gross margin thresholds (pctColour function):
  food_beverage:       Green ≥65% · Amber 55-65% · Red <55%
  cannabis_retail:     Green ≥50% · Amber 30-50% · Red <30%
  cannabis_dispensary: Green ≥50% · Amber 35-50% · Red <35%
  general_retail:      Green ≥35% · Amber 20-35% · Red <20%

PROFILE_LABELS → PL constant controls all section/row labels per profile.
Food Cost % KPI card: renders ONLY for food_beverage, target <30%, color-coded.

SUBCATEGORY_TO_ACCOUNT additions (12 new entries — LL-234 additive):
  Dispensary: SAHPRA Licensing Fees(60150) · Pharmacist Salary(60110) ·
              Cold Chain Equipment(61500) · Professional Indemnity(60410) ·
              Patient Education Materials(60510) · Controlled Substance Security(60210)
  F&B:        Produce & Ingredients(50100) · Kitchen Wages(60105) ·
              Gas & Cooking Fuel(60305) · FSCA Compliance Fees(60155) ·
              Cleaning & Hygiene Supplies(61005) · Equipment Maintenance(61505)

IFRSStatementView: accepts revenueIfrsLabel prop with safe default.
  cannabis_dispensary: "Revenue — medical dispensing services"
  food_beverage:       "Revenue — food and beverage sales"
  all others:          "Revenue from contracts with customers"

### ExpenseManager.js — profile-aware subcategories (1,566 lines + 26 new)
- SUBCATEGORIES_BASE: original generic lists
- PROFILE_SUBCATS: dispensary + food_beverage profile overrides
- getSubcategories(industryProfile): merge function
- Form select reads getSubcategories(industryProfile)[form.category]
- VAT_EXEMPT_SUBCATS extended for dispensary/F&B wage + indemnity entries

### seed-tenant/index.ts — v4 repo sync (closes LL-193)
Deployed v4 (Supabase EF version 4) = repo file now identical.
Supports: general_retail · food_beverage · cannabis_dispensary
Helper functions: seedProducts · seedStockMoves · seedExpenses · seedJournal

### HQ Sidebar (useNavConfig.js)
Groups renamed: Finance→Financials · Intelligence→Analytics
Tab label: Procurement→Purchasing (path /hq?tab=procurement unchanged)

---

## LL RULES — CLOSED THIS SESSION

LL-224: CLOSED — HQProfitLoss.js now profile-adaptive across all 4 profiles
LL-231: CLOSED — cannabis_dispensary revenue = dispensing_log × sell_price (not orders)
LL-232: CLOSED — F&B gross margin Green ≥65% / Amber 55–65% / Red <55% + Food Cost % KPI
LL-233: HONORED — HQCogs.js read in full before touching (3,912 lines, only 14 touched)
LL-234: HONORED — SUBCATEGORY_TO_ACCOUNT additions are additive (12 appended, none removed)
LL-193: CLOSED — seed-tenant/index.ts repo file now matches deployed v4

## LL RULES — STILL ACTIVE (carried from v235)
LL-225: cannabis_dispensary NEVER shows Wholesale, Distribution, Retailers tabs
LL-226: dispensing_log entries are Schedule 6 — NEVER hard-delete; void only
LL-227: Medi Can tenant_id 2bd41eb7-... seed_complete=true — DO NOT RE-SEED
LL-228: HQMedical gated — cannabis_dispensary + feature_medical=true required
LL-229: seed-tenant v4 uses SERVICE_ROLE_KEY — bypass RLS on insert
LL-230: dispensing_log.batch_id links to batches.id
LL-205: Every new DB table needs hq_all_ RLS bypass policy
LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
LL-207: No tenantId props on HQ child components
LL-221: Read the actual file before any edit — file truth supersedes docs

---

## EDGE FUNCTIONS — CURRENT STATE
| Slug | Version | Status |
|---|---|---|
| process-document | v53 | ACTIVE |
| auto-post-capture | v2 | ACTIVE |
| ai-copilot | v59 | ACTIVE |
| sim-pos-sales | v4 | ACTIVE |
| payfast-checkout | v44 | ACTIVE |
| payfast-itn | v39 | ACTIVE |
| sign-qr | v36 | ACTIVE |
| verify-qr | v34 | ACTIVE |
| get-fx-rate | v35 | ACTIVE |
| send-notification | v37 | ACTIVE |
| **seed-tenant** | **v4** | **ACTIVE · repo now synced** |
| trigger-sim-nourish | v1 | ACTIVE · **OWNER SHOULD DELETE** |

---

## KNOWN GAPS — PRIORITY ORDERED FOR NEXT SESSION

### Priority 1 — HQForecast.js dispensary data source
HQForecast.js queries orders table for projection data.
cannabis_dispensary has zero orders — forecast shows empty.
Fix: add dispensingLog query and project from dispensing event velocity.
File: src/components/hq/HQForecast.js (17,140 bytes — small, read before touching)

### Priority 2 — Dispensary compliance completions
a. Voiding UI for dispensing_log (LL-226 columns exist: is_voided, void_reason, void_at, void_by — no UI yet)
b. Controlled Substance Register (CSR) view — perpetual balance per product
c. SAHPRA-format dispensing report export (CSV/PDF for regulatory submission)
d. S21 renewal workflow — alert + initiate when S21 expiring <30 days

### Priority 3 — WP-WIZARD-V2 (industry-aware onboarding)
Current TenantSetupWizard.js (52,293 bytes) does not branch by industry.
A new dispensary tenant created via wizard:
  - Does not have feature_medical: true set
  - Does not see the clinical nav on first login
  - seed-tenant v4 handles seeding correctly but wizard must pass cannabis_dispensary
File: src/components/hq/TenantSetupWizard.js

### Priority 4 — ProteaAI CODEBASE_FACTS update (LL-061)
ProteaAI.js CODEBASE_FACTS string is heavily stale:
  - Says "4 industry profiles" — now 5 planned, 4 live
  - Missing: Medi Can Dispensary, FOOD_BEVERAGE_WATERFALL, clinical module
  - Missing: WP-FINANCIAL-PROFILES changes, new LL rules
File: src/components/ProteaAI.js — LOCKED (LL-061: CODEBASE_FACTS str_replace only)

### Priority 5 — Owner actions (outstanding since v233)
- Delete trigger-sim-nourish EF (throwaway one-shot, no longer needed)
- Supabase Auth SMTP → Resend (email auth for tenants)
- CIPRO registration + nuai.co.za domain

---

## DEMO VERIFICATION CHECKLIST (run after Vercel deploys e131939)

### Medi Can Dispensary (/tenant-portal)
[ ] Sidebar: Home / Clinical / Inventory / Financials / Operations / People (no Wholesale/POS/QR)
[ ] Clinical → Medical Records → 5 sub-tabs load (Patients / Prescriptions / Dispensing / Reports / Compliance)
[ ] Patients tab: 5 patients with S21 numbers, conditions, practitioners visible
[ ] Compliance tab: Fatima Davids shows amber S21 expiry alert (<30 days)
[ ] P&L → Revenue shows "Dispensing Revenue" (not "Product Sales")
[ ] P&L → 14 dispensing events × sell prices = ~R18,000–R22,000 displayed (not R0)
[ ] P&L → Gross margin threshold: green ≥50% (not 35%)
[ ] Expenses → subcategory dropdown shows: SAHPRA Licensing Fees / Pharmacist Salary / Cold Chain Equipment

### Nourish Kitchen (/tenant-portal)
[ ] Sidebar: Home / Kitchen / Food Safety / Inventory / Sales & Service / Financials / People
[ ] Kitchen → Recipe Engine loads (not "coming soon")
[ ] Kitchen → Ingredients loads (not "coming soon")
[ ] Food Safety → HACCP loads (5 seeded control points)
[ ] Food Safety → Cold Chain loads (42 seeded temperature logs)
[ ] P&L → Food Cost % primary KPI card visible above Operating Costs
[ ] P&L → Green margin at ≥65% (not 35%)
[ ] Expenses → subcategory shows: Produce & Ingredients / Kitchen Wages / Gas & Cooking Fuel

### HQ Sidebar
[ ] Finance group renamed → Financials
[ ] Intelligence group renamed → Analytics
[ ] Procurement tab → Purchasing

---

## FILES NOT TO TOUCH WITHOUT READING FIRST (LL-221)
| File | Size | Reason |
|---|---|---|
| src/components/hq/HQProfitLoss.js | 112KB (now +191 lines) | Complex financial logic — 2,872 lines |
| src/components/hq/HQCogs.js | 145KB | 3,912 lines — F&B tabs already exist |
| src/components/hq/HQStock.js | 208KB | Effectively locked |
| src/components/hq/HQMedical.js | ~68KB | Clinical compliance module |
| src/pages/TenantPortal.js | ~970 lines | 4-branch waterfall routing |
| src/components/StockItemModal.js | — | LOCKED — never touch |
| src/components/ProteaAI.js | 2,346 lines | LOCKED — CODEBASE_FACTS str_replace only |
| src/components/PlatformBar.js | — | LOCKED |
| src/services/supabaseClient.js | — | LOCKED |

---

## SESSION CLOSE — WHAT EVERY NEXT AGENT MUST KNOW

1. HEAD is e131939. Confirm with `git log --oneline -1` before any work.

2. WP-FINANCIAL-PROFILES IS COMPLETE. All LL-224 violations are closed.
   Do not re-open or re-architect what is already shipped.

3. MEDI CAN IS SEEDED. DO NOT RE-SEED.
   tenant_id: 2bd41eb7-1a6e-416c-905b-1358f6499d8d

4. DISPENSARY P&L REVENUE IS NOW LIVE.
   fetchDispensingRevenue callback queries dispensing_log × inventory_items.sell_price.
   If Medi Can still shows R0, check: (a) is period filter covering the 14 events?
   (b) do the 8 inventory items have sell_price set? (c) is inventoryItems state populated
   before fetchDispensingRevenue fires?

5. NEXT HIGHEST IMPACT: HQForecast.js dispensary data source (small file, clear fix).
   Then dispensary voiding UI (LL-226 compliance).

6. seed-tenant v4 repo and deployed are NOW IN SYNC. If you need to add a 5th profile
   (mixed_retail), increment to v5 and deploy via Supabase MCP, then sync the repo file.

7. RULE 0Q: Claude.ai NEVER calls push_files or create_or_update_file. All repo writes via Claude Code.

---

*SESSION-STATE v236 · NuAi ERP · 11 April 2026*
*Sessions covered: WP-FINANCIAL-PROFILES v1.0 (complete)*
*Commits: 8e9dfda → e5c2108 → da97cd8 → e8450ec → f3ebbfb → f6e4a23 → 418a014 → e131939*
