# SESSION-STATE v215 — 09 Apr 2026 (Session Close)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- HEAD: 3fb5ed0

## OPERATING MODE: BETA DEV MODE (locked)

## Read Order — Every Session
1. NUAI-AGENT-BIBLE.md — always first
2. SESSION-STATE_v215.md (this file)
3. VIOLATION_LOG_v1_1.md
4. Verify HEAD via GitHub:get_file_contents before any build

---

## COMMITS THIS SESSION (b9b415f → 3fb5ed0)

| SHA | What |
|---|---|
| [db] | suppliers.vat_registered default NULL + reset existing to NULL |
| [db] | P3-B migrations: stock_receipts.input_vat_amount + suppliers.vat_registered/vat_number |
| [db] | receipt_vat_sync trigger + sync_receipt_to_vat_transactions() function |
| b9b415f | P3-B StockReceiveModal.js — supplier VAT field, import guidance, Step 3 review |
| [db] | fix suppliers vat_registered default null |
| a27155a | HQVat.js + HQSuppliers.js VAT package close-out |
| 91ba99a | WP-FINANCIAL-STATEMENTS-PDF — Print/Save PDF via React portal |
| 3fb5ed0 | fix: HQBalanceSheet VAT payable wired to vat_transactions |

---

## WP-FINANCIALS — COMPLETE ✅

All 10 phases of WP-FINANCIALS are now delivered:

| Phase | Component | Status |
|---|---|---|
| 0 | Financial Setup Wizard | ✅ |
| 1 | Schema migrations | ✅ |
| 2 | Income Statement IFRS | ✅ HQProfitLoss v4 |
| 3 | Balance Sheet upgrade | ✅ HQBalanceSheet v2 — VAT payable now live |
| 4 | Fixed Asset Register | ✅ HQFixedAssets v1 |
| 5 | Journal Entry Module | ✅ HQJournals v1 |
| 6 | VAT Module + Pipeline | ✅ HQVat v2 + P3-A + P3-B + close-out |
| 7 | Bank Reconciliation | ✅ HQBankRecon v1 |
| 8 | Notes to Statements | ✅ HQFinancialNotes |
| 9 | PDF Export | ✅ Print/Save PDF via React portal |
| 10 | Year-End Close | ✅ HQYearEnd v1 |

**Additional deliveries beyond original WP scope:**
- HQFinancialStatements.js v1.0 — 4 IFRS statements unified shell
- P3-A: expenses → vat_transactions auto-sync trigger
- P3-B: stock_receipts → vat_transactions auto-sync trigger
- VAT package close-out: supplier VAT flags, HQSuppliers VAT UI,
  Period Close now includes receipts, Data Sources shows both sources

---

## FULL VAT PIPELINE ARCHITECTURE — COMPLETE ✅
Entry Point A: Expenses (P3-A)
ExpenseManager → expenses.input_vat_amount
→ expense_vat_sync trigger
→ vat_transactions (source='calculated', source_table='expenses')
Entry Point B: Stock Receipts (P3-B)
StockReceiveModal → stock_receipts.input_vat_amount
→ receipt_vat_sync trigger
→ vat_transactions (source='calculated', source_table='stock_receipts')
Entry Point C: Smart Capture (P3-C — NEXT)
process-document EF extracts VAT from supplier invoice
→ expenses.input_vat_amount populated automatically
→ expense_vat_sync trigger fires (already live)
→ vat_transactions (no new trigger needed — pipeline already ready)
Read surface:
HQVat.js → vat_transactions (all sources aggregated)
HQBalanceSheet.js → vat_transactions (net position for BS liabilities)
HQFinancialStatements.js → vat_transactions (BS VAT payable)

---

## DB ADDITIONS THIS SESSION (cumulative)

### New triggers (all live and verified):
- expense_vat_sync: AFTER INSERT/UPDATE/DELETE ON expenses
- receipt_vat_sync: AFTER INSERT/UPDATE/DELETE ON stock_receipts
- get_vat_period(): IMMUTABLE function for period string derivation

### New columns:
- expenses.input_vat_amount (existed, now UI writes to it)
- stock_receipts.input_vat_amount NUMERIC DEFAULT 0
- suppliers.vat_registered BOOLEAN DEFAULT NULL
- suppliers.vat_number TEXT
- financial_statement_status table (full table — this session)

### LL-205 patched tables (cumulative — 12):
journal_entries · journal_lines · vat_transactions · fixed_assets ·
bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
chart_of_accounts · equity_ledger · vat_period_filings ·
financial_statement_status

---

## NEXT SESSION — START WITH THINKING SESSION

### P3-C — Smart Capture → VAT Auto-Fill (THINKING SESSION FIRST)

DO NOT jump straight into building. Read source files first:
- Read supabase/functions/process-document/index.ts from GitHub
- Read supabase/functions/auto-post-capture/index.ts from GitHub
- Understand what data process-document currently extracts from invoices
- Identify where VAT amount appears in the extraction output
- Understand how auto-post-capture writes to the expenses table
- Determine: does it currently extract a VAT line? If not, what field to add?

The trigger pipeline is already complete and waiting:
  process-document extracts VAT → expenses.input_vat_amount populated
  → expense_vat_sync trigger fires automatically
  → vat_transactions row written
  No new trigger needed. Just the EF update.

Think through before building:
1. What does the current AI extraction prompt ask for? Does it request VAT?
2. What is the structure of the extracted JSON returned by process-document?
3. Where does auto-post-capture map extracted fields to expense columns?
4. What change is needed in process-document to extract input_vat_amount?
5. What change is needed in auto-post-capture to write it to the expense row?
6. How do we handle invoices with no VAT (non-registered suppliers)?

This is the final piece that makes the VAT pipeline fully automatic for any
tenant using Smart Capture for their supplier invoices.

### WP-REORDER Phase 1 (after P3-C)
Stock alert engine · reorder triggers · procurement nudges.
Spec: docs/WP-REORDER_v1_0.md

### WP-DASHBOARD-IB
Inbox-style dashboard for branch/store managers.
Spec: docs/WP-DASHBOARD-IB_v1_0.md

---

## OWNER ACTIONS (URGENT — unchanged)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- pg_cron: loyalty-ai nightly (SQL in NUAI-AGENT-BIBLE Section 8)
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
- Yoco keys: portal.yoco.com (after CIPRO)

---

## CRITICAL RULES (cumulative)

### RULE 0Q — ABSOLUTE
NEVER use push_files or create_or_update_file from Claude.ai.
4 confirmed violations: VL-007/008/010/011. Do not be #5.
Available in tool list ≠ permission to use.

### LL-205 — HQ RLS bypass (12 tables — see above)
### LL-206 — useTenant: const { tenant } = useTenant(); const tenantId = tenant?.id;
### LL-207 — No tenantId props on HQ child components
### LL-208 — Patch ALL finance tables together before migration

### purchase_orders — always po_status not status for lifecycle filtering
### bounds/derived objects — always useMemo if used in useCallback deps

---

## EF STATUS (unchanged)
ai-copilot v59 · loyalty-ai v2 · process-document v52 · auto-post-capture v1
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36 · verify-qr v34
send-notification v37 · get-fx-rate v35

## LOCKED FILES (unchanged)
src/components/StockItemModal.js
src/components/ProteaAI.js (CODEBASE_FACTS str_replace only)
src/components/PlatformBar.js
src/services/supabaseClient.js

## PROTECTED FILES
src/components/hq/HQStock.js
src/components/hq/LiveFXBar.js

---
*SESSION-STATE v215 · NuAi · 09 Apr 2026*
*Supersedes v214. Read NUAI-AGENT-BIBLE.md first — always.*
*WP-FINANCIALS: COMPLETE. Next: P3-C Smart Capture VAT thinking session.*
