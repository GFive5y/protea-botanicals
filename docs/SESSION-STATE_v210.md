# SESSION-STATE v210 — 09 Apr 2026 (Full Session Close)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- HEAD: 3c39de8

## OPERATING MODE: BETA DEV MODE (locked)

## Read Order — Every Session
1. NUAI-AGENT-BIBLE.md — always first
2. SESSION-STATE_v210.md (this file)
3. VIOLATION_LOG_v1_1.md
4. Verify HEAD via GitHub:get_file_contents before any build

---

## COMMITS THIS SESSION (20ad03c → 3c39de8)

| SHA | What |
|---|---|
| 228170e | HQBankRecon.js v1.0 — WP-FINANCIALS Phase 7 |
| 013eba8 | HQFixedAssets.js v1.0 — WP-FINANCIALS Phase 4 |
| aa755a9 | HQ Finance nav wiring — Expenses + VAT + YearEnd + Forecast (4 orphaned components) |
| [db] | Supabase: hq_all_chart_of_accounts + hq_all_equity_ledger (LL-205 patch) |
| 61c2611 | TenantPortal: Journals + VAT + Bank Recon + Fixed Assets added to cannabis waterfall Reports nav |
| 3c39de8 | HQVat.js: Unicode escapes fixed (literal · and — chars in JSX text nodes) |
| [docs] | SESSION-STATE v210 (this commit) |

---

## WHAT IS FULLY VERIFIED AND WORKING

### Both Portals — Medi Rec (tenant portal + HQ with VIEWING: Medi Rec)
All 12 Reports tabs accessible and data-verified:
P&L · Expenses · Analytics · Reorder · Balance Sheet · Costing ·
Forecast · Year-End Close · Journals · VAT · Bank Recon · Fixed Assets

### HQJournals.js v1.0 ✅
5 posted Smart Capture journals · stats strip (5 posted · R4,000) ·
type/status/FY filters · COA picker grouped by account type ·
post/reverse/delete draft · expand-to-lines · audit trail

### HQBankRecon.js v1.0 ✅
FNB · Medi Recreational (Pty) Ltd · R180,733.69 verified closing balance ·
22 statement lines · 3 unmatched with Categorise CTAs ·
Balance Sheet Cash at Bank confirmed

### HQFixedAssets.js v1.0 ✅
3 assets · R66,400 cost · R6,626 accum dep · R59,774 NBV · R822/mo ·
amber depreciation alert (15-23 months behind) · Run Depreciation modal ·
Balance Sheet PP&E note (IAS 16)

### HQVat.js (existing, now fully accessible) ✅
VAT No: 4123456789 · Bi-Monthly · 15% · tenant configured ·
Dashboard: YTD Output R61,758 · Input R43,411 · Payable R18,347 ·
6 bi-monthly period buttons · VAT201 view (Fields 1/4/12/16/20) ·
Mar-Apr 2026: Output R61,758 · Input R21,480 · Payable R40,278.26 ·
Jan-Feb: Refund R21,931 (⚠ Overdue) · Export CSV · Mark Filed

---

## CRITICAL RULES ADDED THIS SESSION

### LL-205 — HQ RLS bypass (full table list)
Every new table needs: CREATE POLICY "hq_all_[table]" ON [table] FOR ALL TO public USING (is_hq_user());
Tables patched this session (cumulative):
journal_entries · journal_lines · vat_transactions · fixed_assets ·
bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
chart_of_accounts · equity_ledger
Symptom when missing: HQ tab shows 0 data despite confirmed rows in DB.

### LL-206 — useTenant correct pattern
Import: import { useTenant } from '../../services/tenantService';
Destructure: const { tenant } = useTenant(); const tenantId = tenant?.id;

### LL-207 — switchTenant() architecture
No tenantId props on HQ child components. useTenant() handles it via context.
If 0 data in HQ → check LL-205 first.

### LL-208 — Always patch ALL finance tables together
Before any LL-205 migration, enumerate ALL tables HQ will query.
chart_of_accounts and equity_ledger were missed from the first batch — fixed this session.

### JSX Unicode escape rule (new lesson)
\u2014 and \u00b7 do NOT process in JSX text nodes.
Use literal characters: — and · directly in JSX strings.
They process fine inside JS string expressions {} but not in raw JSX text.

### WATERFALL nav pattern (lesson from TenantPortal fix)
CANNABIS_RETAIL_WATERFALL and WATERFALL are separate nav configs.
Adding a tab to one does NOT add it to the other.
Always check BOTH when adding new finance tabs.
TenantPortal renderTab() switch handles all tabs — nav config is the only gate.

---

## BALANCE SHEET PILLARS — VERIFIED

Cash at Bank:     R180,733.69  (HQBankRecon — FNB reconciled)
PP&E Net Book:    R59,774.44   (HQFixedAssets — 3 assets, accum dep seeded)
Inventory:        AVCO-based   (HQProfitLoss + HQBalanceSheet)

NOTE: Depreciation is 15-23 months behind on all 3 assets.
NBV is OVERSTATED until catch-up depreciation is run.
Action: HQFixedAssets → Run Depreciation per missing month (owner task, not dev).

---

## SCHEMA FACTS CONFIRMED THIS SESSION

### vat_transactions (actual columns — WP spec was wrong)
transaction_type ('output'/'input') · source_table · output_vat · input_vat
vat_period ('YYYY-P{N}' format) · exclusive_amount · inclusive_amount
description · vat_rate · NO: vat_type, vat_amount, is_claimed, source_ref

### tenant_config VAT fields (confirmed populated for Medi Rec)
vat_registered = true · vat_number = '4123456789' · vat_period = 'bi_monthly'
trading_name = 'Medi Recreational' · registered_address = '14 Green Street, Cape Town, 8001'
financial_setup_complete = true · accounting_basis = 'accrual'
financial_year_end = '02-28' (February year-end)
NOTE: These are DIRECT COLUMNS not JSONB — query as columns, not settings->>'key'

### RLS functions confirmed
is_hq_user() → user_profiles.hq_access (boolean)
tenant_config already had hq_can_read_all_tenant_config before this session ✅

---

## NEXT SESSION PRIORITIES

### P1 — HQVat enhancements
Current state: Component works, data visible, VAT201 renders correctly.
Enhancements needed:
1. Filed persistence — "Mark Filed" is React state only (lost on refresh)
   Solution: vat_period_filings table (period_id, tenant_id, filed_at, filed_by)
2. Live calculation view — query orders/expenses directly to show calculated VAT
   Output: total/1.15*0.15 per period · Input: expenses.amount_zar/1.15*0.15
3. Data quality warning — P1 (Jan-Feb) shows Refund R21,931 but has zero output VAT
   Surface this as a data gap (orders only exist from March 2026)

### P2 — HQFinancialStatements.js unified shell
Scope: 4 IFRS statements only (Income Statement · Balance Sheet · Cash Flow · Equity)
NOT a mega-container — operational tools (Journals/BankRecon/FixedAssets/VAT) stay standalone
Gate: financial_setup_complete = true (already set for Medi Rec)
Period selector at top shared across all 4 statements
Status badge: Draft → Reviewed → Auditor Signed Off → Locked

### P3 — VAT Auto-Population Pipeline
Phase A: Calculate from source (read-only, display calculated vs stored)
Phase B: Close Period button (writes to vat_transactions from orders + expenses)
Blocked: expenses.input_vat_amount = 0 for all 47 rows (Smart Capture to populate)

### Pending Owner Actions (URGENT)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- pg_cron: loyalty-ai nightly schedule (SQL in NUAI-AGENT-BIBLE Section 8)
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset (owner action)
- Yoco: After CIPRO → portal.yoco.com

---

## EF STATUS (unchanged)
ai-copilot v59 · loyalty-ai v2 · process-document v52 · auto-post-capture v1
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36 · verify-qr v34
send-notification v37 · get-fx-rate v35

## TENANTS
Medi Rec: b1bad266 · cannabis_retail (primary dev — all test data here)
Protea HQ: 43b34c33 · operator
Pure PTV: f8ff8d07 · cannabis_retail
Test CT: 064adbdc · cannabis_retail
TEST SHOP: 4a6c7d5c · cannabis_retail

## LOCKED FILES
src/components/StockItemModal.js
src/components/ProteaAI.js (CODEBASE_FACTS str_replace only)
src/components/PlatformBar.js
src/services/supabaseClient.js

---
*SESSION-STATE v210 · NuAi · 09 Apr 2026*
*Supersedes v209. Read NUAI-AGENT-BIBLE.md first — always.*
