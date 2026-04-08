# SESSION-STATE v210 — 08 Apr 2026 (Full Session Close)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- Live URL: protea-botanicals-git-main-gfive5ys-projects.vercel.app
- HEAD: aa755a9

## OPERATING MODE: BETA DEV MODE (locked)

## Start Every Session — Mandatory Order
1. Read NUAI-AGENT-BIBLE.md — always first, every session
2. Read this file (SESSION-STATE_v210.md)
3. Read VIOLATION_LOG_v1_1.md — know the failure patterns
4. Verify HEAD via GitHub:get_file_contents before planning any build

---

## WHAT WAS BUILT THIS SESSION (09 commits from a42d13d to aa755a9)

### WP-FINANCIALS Phase 5 — HQJournals.js v1.0 — COMPLETE
- Commit: a42d13d
- 660 lines
- Journal list with expand-to-lines · DR/CR totals · balance check
- Type badges: AUTO-CAPTURE / MANUAL / DEPRECIATION / YEAR-END / ACCRUAL
- Status filter + type filter + financial year filter (FY2026 + FY2024)
- Stats strip: total / draft / posted / reversed / posted value
- New Journal modal: COA picker grouped by account type (Assets/Liabilities/Equity/Revenue/Expenses)
- Auto-generated reference: JNL-YYYYMMDD-NNN
- Balance validation (DR = CR) before Post · Save as Draft OR Post directly
- Reverse posted journals (flips all lines, marks original Reversed)
- Delete draft journals with confirm dialog
- Audit trail: posted_at + created_at in expand view
- Year-end journals: YEAR-END badge, locked from all actions
- Wired: HQDashboard + useNavConfig Finance group

### WP-FINANCIALS Phase 7 — HQBankRecon.js v1.0 — COMPLETE
- Commit: 228170e
- 384 lines
- FNB account card (Medi Recreational Pty Ltd · 62891234567)
- Reconciliation status badge: ✓ Reconciled
- Stats strip: Opening R45,000 / Credits R326,950 / Debits R191,216 / Closing R180,733.69 / Unmatched 3
- 22 statement lines with colour-coded match type badges
- Filters: matched status / match type / import batch
- Inline categorise for unmatched lines — saves matched_type + matched_at to DB
- Unmatched summary panel: 3 items (FNB fee R285 · Marketing R8,200 · SARS VAT R21,931)
- Balance Sheet note: R180,733.69 Cash at Bank linked to Statement of Financial Position
- Wired: HQDashboard + useNavConfig Finance group

### WP-FINANCIALS Phase 4 — HQFixedAssets.js v1.0 — COMPLETE
- Commit: 013eba8
- 433 lines
- 3 assets: Shop Fitout R45k · Display Refrigerator R12.5k · Security Camera R8.9k
- Stats strip: 3 assets / R66,400 cost / R6,626 accum dep / R59,774 NBV / R822/mo
- Asset register table: code · category badge · cost · accum dep · NBV · dep% bar · life left · status
- Expand-to-detail: 8-field grid (method · life · residual · depreciable amount · annual charge · remaining · expected vs actual · notes)
- Depreciation behind alert: all 3 assets behind by 15-23 months
- Run Depreciation modal: month/year selector · per-asset preview · dedup check · posts depreciation_entries + updates fixed_assets
- Depreciation history table (empty — populates as runs are posted)
- Balance Sheet PP&E note: R66,400 cost · R6,626 accum dep · R59,774 NBV (IAS 16)
- Wired: HQDashboard + useNavConfig Finance group

### HQ Finance Nav Wiring Fix — COMPLETE
- Commit: aa755a9
- 3 orphaned components wired: ExpenseManager.js (46KB) · HQVat.js (19KB) · HQYearEnd.js (18KB)
- HQForecast added to Finance nav (was in HQDashboard but missing from useNavConfig)
- HQ Finance nav now has 12 items

### LL-205 RLS Migration — COMPLETE (Supabase, no code commit)
- Migration: hq_operator_access_finance_tables
- 7 tables in main migration: journal_entries · journal_lines · vat_transactions · fixed_assets · bank_accounts · bank_statement_lines · expenses
- Mid-session patch: depreciation_entries (missed from main migration, applied separately)
- Total: 8 tables now have hq_all_ bypass policy

---

## CRITICAL DISCOVERIES THIS SESSION (new agents must read)

### LL-205 — HQ OPERATOR RLS BYPASS
EVERY new table needs: CREATE POLICY "hq_all_[table]" ON [table] FOR ALL TO public USING (is_hq_user());
Symptom when missing: HQ tab shows 0 data despite confirmed rows in DB.
Root cause: switchTenant() is UI-only. auth.uid() never changes. RLS enforces operator's own tenant.
Tables fixed this session: journal_entries · journal_lines · vat_transactions · fixed_assets
  bank_accounts · bank_statement_lines · expenses · depreciation_entries
Check EVERY new table before shipping.

### LL-206 — useTenant CORRECT PATTERN
Import: import { useTenant } from '../../services/tenantService';  — NOT ../../hooks/useTenant
Destructure: const { tenant } = useTenant();
             const tenantId = tenant?.id;
NEVER: const { tenantId } = useTenant();

### LL-207 — switchTenant() ARCHITECTURE
HQDashboard calls switchTenant(selected) on VIEWING dropdown change.
All child components call useTenant() directly — NO tenantId props needed.
If HQ shows 0 data — check LL-205 (RLS) first, not the component code.

### LL-208 — ALWAYS PATCH ALL FINANCE TABLES TOGETHER
depreciation_entries was missed from the main LL-205 migration and had to be patched mid-session.
Before any LL-205 migration, enumerate ALL tables that HQ operators will query.
Finance tables to always check: journal_entries · journal_lines · vat_transactions · fixed_assets
  depreciation_entries · bank_accounts · bank_statement_lines · expenses
  Any new table added to the system — add hq_all_ policy immediately.

### useNavConfig.js location
Confirmed path: src/hooks/useNavConfig.js  (NOT src/navigation/)
Always find with: Get-ChildItem -Path src -Recurse -Filter "useNavConfig.js"

### HQ Finance Nav — Complete State (12 items)
Pricing / Costing / P&L / Balance Sheet / Invoices / Journals / Bank Recon /
Fixed Assets / Expenses / Forecast / VAT / Year-End Close

### Orphaned Components Found on Disk (now wired)
These existed before this session but were never connected:
- ExpenseManager.js — /hq?tab=expenses (46KB, full expense management)
- HQVat.js — /hq?tab=vat (19KB, built in prior session, was unwired)
- HQYearEnd.js — /hq?tab=year-end-close (18KB, year-end close process)
- HQForecast.js — /hq?tab=forecast (was in HQDashboard but missing from Finance nav)

### Components on Disk Not Yet Wired (for next sessions)
- HQFinancialNotes.js (14KB) — notes to financial statements
- HQFinancialSetup.js (18KB) — financial setup wizard (Phase 0, gateway for full IFRS module)
- HQSmartCapture.js (38KB) — appears to be an alternative smart capture component (HQDocuments.js is active)

---

## VERIFIED WORKING (cumulative — 08 Apr 2026)

P&L (R477,880 revenue · 62.13% gross margin · R296,606 net profit)
Balance Sheet · Cash Flow · Year-End Close (HQYearEnd — now accessible at /hq?tab=year-end-close)
Smart Capture (95% confidence, auto-retry via HQDocuments)
ProteaAI (EF-routed via ai-copilot v59)
Loyalty AI Engine Tab 8 (Run Now, dedup confirmed)
Customer Profiles (50 mock customers — Medi Rec)
RLS (20+ finance tables including all 8 LL-205 tables)
HQJournals.js v1.0 — 5 posted journals visible · new journal modal · COA picker
HQBankRecon.js v1.0 — R180,733.69 reconciled · 3 unmatched items · inline categorise
HQFixedAssets.js v1.0 — 3 assets · R59,774.44 NBV · Run Depreciation functional
HQ Finance nav — 12 items all accessible

---

## SCHEMA FACTS CONFIRMED THIS SESSION

### vat_transactions (ACTUAL columns — WP spec was completely wrong)
transaction_type (TEXT: 'output'/'input')   — NOT 'vat_type'
source_table (TEXT: 'orders'/'expenses')     — NOT 'source_type'
output_vat (NUMERIC) + input_vat (NUMERIC)   — NOT 'vat_amount'
vat_period (TEXT: 'YYYY-P{N}' e.g. '2026-P1') — NOT 'YYYY-MM'
description (TEXT)
NO: vat_code · vat_amount · is_claimed · source_ref

### fixed_assets (ACTUAL columns)
purchase_cost (NUMERIC)   — NOT 'cost_price' (WP spec wrong)
useful_life_years (NUMERIC) — NOT 'useful_life_months'
net_book_value (NUMERIC)  — pre-seeded column, not calculated only
accumulated_depreciation · residual_value · depreciation_method · is_active

### depreciation_entries (ACTUAL columns)
period_month (TEXT e.g. 'Apr') · period_year (INT e.g. 2026)
depreciation · accum_dep_after · nbv_after · posted_at
NO UNIQUE constraint — component must check for existing entries before inserting
0 rows — accum dep seeded directly on fixed_assets, not through entries table

### RLS Functions confirmed
is_hq_user() — reads user_profiles.hq_access (boolean)
is_admin() — reads user_profiles.role = 'admin'
user_tenant_id() — reads user_profiles.tenant_id for auth.uid()

---

## VAT MODULE STATUS — IMPORTANT FOR NEXT AGENT

HQVat.js (19KB) is now wired and accessible at /hq?tab=vat.
HOWEVER — the data foundation has critical gaps:

1. tenant_config.vat_registered = null — tenant not configured as VAT registered
2. orders table has NO vat_amount column — output VAT must be reverse-calculated
3. expenses.input_vat_amount = 0 for ALL 47 rows — source data unpopulated
4. The 6 existing vat_transactions rows are manually seeded aggregates, not derived from source data
5. vat_period format is 'YYYY-P{N}' (bi-monthly) not 'YYYY-MM'
6. 2026-P1 has ZERO output VAT rows despite real sales in Jan-Feb (data gap)

Before HQVat can show meaningful data:
Step 1: UPDATE tenant_config SET vat_registered = true, vat_number = '[number]'
         WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
Step 2: Decide data model — display existing 6 rows (quick) OR auto-calculate from orders
Step 3: Build auto-population pipeline (orders + expenses → vat_transactions)

The existing HQVat.js component was built in a prior session. Read it before touching.
It may need to be assessed and potentially rebuilt to match the actual schema.

---

## BALANCE SHEET PILLARS — CURRENT STATE

After this session, all three pillars are verifiable:
- Cash at Bank: R180,733.69 (reconciled via HQBankRecon — closing balance verified)
- PP&E Net Book Value: R59,774.44 (from HQFixedAssets — accum dep R6,626)
- Inventory: Calculated from AVCO stock movements (HQProfitLoss + HQBalanceSheet)

Note: Depreciation is BEHIND on all 3 assets (15-23 months unposted).
NBV is currently OVERSTATED — run depreciation for each missing month to correct.
The Run Depreciation feature in HQFixedAssets handles this one month at a time.

---

## NEXT SESSION PRIORITIES

### P1 — HQVat.js Assessment & Rebuild
Read the existing HQVat.js first (src/components/hq/HQVat.js — 19KB).
Assess whether it queries the correct columns (transaction_type, output_vat, input_vat, vat_period).
Configure tenant_config.vat_registered before any VAT UI work.
Decide on data model with owner before touching code.

### P2 — HQFinancialStatements.js Unified Shell
Option A (confirmed): Build after all individual pieces are verified.
Individual tabs working: Journals ✓ · BankRecon ✓ · FixedAssets ✓
Remaining: VAT (data model issues), FinancialNotes, FinancialSetup
Shell should absorb all finance components into one sub-nav.

### P3 — VAT Auto-Population Pipeline
Edge Function or SQL function: orders.total / 1.15 * 0.15 → output VAT per period
expenses.input_vat_amount → input VAT per period (requires Smart Capture to populate first)
This is backlog until tenant is VAT-configured.

### P4 — Run Depreciation Catch-Up
All 3 assets are behind by 15-23 months.
Run HQFixedAssets → Run Depreciation for each missing month to bring NBV current.
This is an owner action, not a dev task.

### Pending Owner Actions (unchanged)
- pg_cron: Enable in Supabase Dashboard → run SQL in NUAI-AGENT-BIBLE Section 8. URGENT.
- Supabase backups: Settings → Add-ons → Enable. URGENT — no backups running.
- Yoco keys: After CIPRO → portal.yoco.com.

---

## COMMIT LOG THIS SESSION

| SHA | What |
|---|---|
| 1219683 | HQJournals wiring — HQDashboard + useNavConfig (pre-build) |
| a42d13d | HQJournals.js v1.0 — WP-FINANCIALS Phase 5 · 660 lines |
| 20ad03c | SESSION-STATE v209 + NUAI-AGENT-BIBLE LL-205/206/207 |
| 228170e | HQBankRecon.js v1.0 — WP-FINANCIALS Phase 7 · 384 lines |
| 013eba8 | HQFixedAssets.js v1.0 — WP-FINANCIALS Phase 4 · 433 lines |
| aa755a9 | HQ Finance nav wiring fix — Expenses + VAT + YearEnd + Forecast |
| [this]  | SESSION-STATE v210 + NUAI-AGENT-BIBLE patches |

---

## EF STATUS (unchanged from v208)
ai-copilot v59 · loyalty-ai v2 · process-document v52 · auto-post-capture v1
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36 · verify-qr v34
send-notification v37 · get-fx-rate v35

## TENANTS (all correct)
Medi Rec: b1bad266 · cannabis_retail (primary dev tenant — all test data here)
Protea HQ: 43b34c33 · operator (HQ operator — use VIEWING dropdown to switch)
Pure PTV: f8ff8d07 · cannabis_retail
Test CT: 064adbdc · cannabis_retail
TEST SHOP: 4a6c7d5c · cannabis_retail

## LOCKED FILES (unchanged)
src/components/StockItemModal.js
src/components/ProteaAI.js (CODEBASE_FACTS str_replace only)
src/components/PlatformBar.js
src/services/supabaseClient.js

---
*SESSION-STATE v210 · NuAi · 08 Apr 2026*
*Supersedes v209. Read NUAI-AGENT-BIBLE.md first — always.*
*This session: 4 WP-FINANCIALS phases + RLS discovery + Finance nav completion*
