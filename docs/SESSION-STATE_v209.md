# SESSION-STATE v209 — 08 Apr 2026 (End of Session)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- Live URL: protea-botanicals-git-main-gfive5ys-projects.vercel.app
- HEAD: [this commit]

## OPERATING MODE: BETA DEV MODE (locked)
Stock = test data. Physical contact points = skip. Data is Claude's responsibility.

## Start Every Session
1. Read NUAI-AGENT-BIBLE.md — always first
2. Read this file (SESSION-STATE_v209.md)
3. Read VIOLATION_LOG_v1_1.md
4. Then plan

## What's Built and Verified (cumulative)
See NUAI-AGENT-BIBLE.md Section 8 for full list. Additions this session:

### HQJournals.js v1.0 — WP-FINANCIALS Phase 5 — COMPLETE
- 660 lines · commit a42d13d
- Journal list with expand-to-lines and DR/CR totals
- Type badges: AUTO-CAPTURE / MANUAL / DEPRECIATION / YEAR-END / ACCRUAL
- Status filter + type filter + financial year filter
- Stats strip: total / draft / posted / reversed / posted value (R)
- New Journal modal: COA picker grouped by account type (Assets/Liabilities/Equity/Revenue/Expenses)
- Auto-generated reference: JNL-YYYYMMDD-NNN
- Balance validation (DR = CR) before Post
- Save as Draft OR Post directly from modal
- Reverse posted journals (flips all lines, marks original Reversed)
- Delete draft journals with confirm dialog
- Audit trail: posted_at + created_at in expand view
- Year-end journals: YEAR-END badge, locked from all actions
- Wired: HQDashboard.js + useNavConfig.js (Finance group) — commit 1219683

### RLS HQ Bypass Fix — LL-205
- Migration: hq_operator_access_finance_tables (applied via Supabase MCP)
- 7 tables patched with is_hq_user() bypass:
  journal_entries · journal_lines · vat_transactions · fixed_assets
  bank_accounts · bank_statement_lines · expenses
- Root cause: WP-FINANCIALS tables were built with tenant isolation but no HQ operator bypass.
  switchTenant() only updates React context. auth.uid() never changes. Without is_hq_user()
  policy, HQ operator reads returned 0 rows despite correct data in DB.
- Side effect fixed: P&L Expenses data source was also returning 0 — now fixed.

## New Rules This Session (add to Bible)
See NUAI-AGENT-BIBLE.md Section 7 — Critical Discoveries (08 Apr 2026):
- LL-205: HQ operator RLS bypass mandatory for every new table
- LL-206: useTenant correct import (../../services/tenantService) and destructuring pattern
- LL-207: switchTenant() architecture — no props needed on HQ child components

## Schema Confirmed This Session (Supabase MCP verified)

### journal_entries (actual columns — WP spec had wrong names)
id · tenant_id · journal_date (DATE) · reference (text) · description (text)
journal_type (text, default 'manual') · status (text, default 'draft')
created_by (uuid) · posted_by (uuid) · posted_at (timestamptz)
financial_year (text) · created_at · is_year_end_closing (boolean)
NOTE: NO entry_date, entry_type, reversal_date, reversed_by, approved_by

### journal_lines (actual columns)
id · journal_id · tenant_id · account_code (text) · account_name (text)
debit_amount (numeric, default 0) · credit_amount (numeric, default 0)
description (text) · line_order (integer, default 1)
NOTE: NO line_number, debit, credit

### chart_of_accounts (actual columns)
id · tenant_id (nullable — NULL = platform template) · account_code · account_name
account_type (asset/liability/equity/revenue/expense)
account_subtype (current/non_current/cogs/opex/finance/equity/sales/other)
is_active (boolean, default true) · template (text, default 'cannabis_retail') · created_at
NOTE: column is 'template' not 'industry_template' (WP spec was wrong)
NOTE: is_active and account_subtype BOTH EXIST and are populated — confirmed via MCP
40 accounts seeded for Medi Rec, all cannabis_retail template

### Existing journal data (Medi Rec, 08 Apr 2026)
5 rows — all journal_type='auto', all status='posted'
All created by Smart Capture (auto-post-capture EF)
SC-df5fb328 has zero debit/credit amounts (bad Smart Capture extraction — expected)
Financial years: FY2026 (4 rows), FY2024 (1 row)
Reference pattern in use: SC-{hash8} for Smart Capture, bank refs for others
Manual journals will use: JNL-YYYYMMDD-NNN

### RLS Functions (confirmed)
is_hq_user() — reads user_profiles.hq_access (boolean). True = HQ operator.
is_admin()   — reads user_profiles.role = 'admin'
user_tenant_id() — reads user_profiles.tenant_id for auth.uid()
user_role()      — reads user_profiles.role for auth.uid()

## DB State (Medi Rec — 08 Apr 2026)
See NUAI-AGENT-BIBLE.md Section 6 for full schema.
- user_profiles: 50 rows
- loyalty_transactions: ~250 rows
- journal_entries: 5 rows (all auto, all posted)
- journal_lines: 10 rows
- vat_transactions: 6 rows
- bank_accounts: 1 row
- bank_statement_lines: 22 rows
- fixed_assets: 3 rows
- chart_of_accounts: 40 rows
- equity_ledger: 1 row
- expenses: 46 rows, R335,930 OpEx

## Next Build Priorities (in order)
1. HQVat.js — WP-FINANCIALS Phase 6
   DB ready: vat_transactions (6 rows confirmed)
   LL-205 already applied — no RLS work needed
   Spec: WP-FINANCIALS-v1_1.md Section 2 (VAT analysis)
   Key columns: vat_period (TEXT 'YYYY-MM') · vat_type ('output'/'input') · vat_amount · is_claimed
   Build: input/output split · net liability · period selector · claim toggle

2. HQBankRecon.js — WP-FINANCIALS Phase 7
   DB ready: bank_accounts (1 row) · bank_statement_lines (22 rows)
   LL-205 already applied
   Spec: WP-FINANCIALS-v1_1.md Section 5 (bank CSV parser) + Section 3 (bank recon)
   SA bank auto-detection: FNB/ABSA/Standard Bank/Nedbank/Capitec from CSV headers

3. HQFixedAssets.js — WP-FINANCIALS Phase 4
   DB ready: fixed_assets (3 rows) · depreciation_entries table exists
   LL-205 already applied
   Spec: WP-FINANCIALS-v1_1.md Section 1.2 (fixed assets) + 7.3 (depreciation engine)

## EF Status (unchanged from v208)
ai-copilot v59 · loyalty-ai v2 · process-document v52 · auto-post-capture v1
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36 · verify-qr v34
send-notification v37 · get-fx-rate v35

## Outstanding Owner Actions (unchanged from v208)
- pg_cron: SQL in NUAI-AGENT-BIBLE.md Section 8 — URGENT
- Supabase backups: Settings → Add-ons → Enable — URGENT
- Yoco keys: After CIPRO → portal.yoco.com

## Locked Files (unchanged)
src/components/StockItemModal.js · src/components/ProteaAI.js (CODEBASE_FACTS only)
src/components/PlatformBar.js · src/services/supabaseClient.js

## Tenants (all correct)
Medi Rec: b1bad266 · cannabis_retail
Protea HQ: 43b34c33 · operator
Pure PTV: f8ff8d07 · cannabis_retail
Test CT: 064adbdc · cannabis_retail
TEST SHOP: 4a6c7d5c · cannabis_retail

---
*SESSION-STATE v209 · NuAi · 08 Apr 2026*
*Supersedes v208. Read NUAI-AGENT-BIBLE.md first — always.*
