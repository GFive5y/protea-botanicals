# SESSION-STATE v211 — 09 Apr 2026 (Session Close)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- HEAD: 154ba50

## OPERATING MODE: BETA DEV MODE (locked)

## Read Order — Every Session
1. NUAI-AGENT-BIBLE.md — always first
2. SESSION-STATE_v211.md (this file)
3. VIOLATION_LOG_v1_1.md
4. Verify HEAD via GitHub:get_file_contents before any build

---

## COMMITS THIS SESSION (3c39de8 → 154ba50)

| SHA | What |
|---|---|
| [db] | vat_transactions.source col (NOT NULL DEFAULT 'manual') · all 6 existing rows tagged 'seeded' |
| [db] | vat_period_filings table · tenant_own + hq_all_vat_period_filings RLS (LL-205) |
| 154ba50 | HQVat.js v2.0 — 571 lines (was 237) |

---

## WHAT IS FULLY VERIFIED AND WORKING

### HQVat.js v2.0 ✅ (screenshots confirmed 09 Apr 2026)

**Dashboard:**
- YTD KPIs from DB: Output R61,758.26 · Input R43,411.31 · Payable R18,346.95
- Filed KPI: 0/6 (reads from vat_period_filings, not React state)
- P1 (Jan-Feb): "⚠ Overdue" + "⚠ Data gap" + amber "seeded" badge
- P2 (Mar-Apr): "Pay R40,278.26" + amber "seeded" badge · CURRENT label
- All 4 action buttons: View VAT201 · Export CSV · Mark Filed · Period Close

**VAT201 view:**
- Taxpayer card · Fields 1/4/12/16/20 all rendering
- Data Sources panel:
  - OUTPUT: "✓ Verified — 450 paid orders · R473,480.00 incl · calculated R61,758.26 — matches stored ✓"
  - INPUT: "⚠ expenses.input_vat_amount = R0 across all 47 rows. Smart Capture must populate..."
- Transactions list with amber "seeded" badges on all 4 rows
- Mark Filed modal: SARS eFiling Reference field · persists to vat_period_filings
- Filed badge survives page refresh ✅ (persistence confirmed via screenshot)
- Filed state shows "✓ Filed · 09 Apr 2026" in action bar
- Status field in taxpayer card updates to "Filed"
- Period Close button present (sandbox mode)

**Export CSV:** includes source column ✅

### DB Schema Additions This Session
vat_transactions.source  text NOT NULL DEFAULT 'manual'

existing 6 rows: source = 'seeded'
period close rows: source = 'calculated'
future manual inserts: source = 'manual'

vat_period_filings
id, tenant_id, period_id, filed_at, filed_by, submission_ref, notes, created_at
UNIQUE(tenant_id, period_id)
RLS: tenant_own + hq_all (LL-205 compliant)

### All Previous Finance Suite — Still Verified
P&L · Balance Sheet · Journals · Bank Recon · Fixed Assets · VAT (v2.0) ·
Expenses · Forecast · Year-End Close · Costing · Invoices · Analytics

---

## CRITICAL RULES (cumulative — no change this session)

### LL-205 — HQ RLS bypass (full table list)
Tables patched (cumulative):
journal_entries · journal_lines · vat_transactions · fixed_assets ·
bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
chart_of_accounts · equity_ledger · vat_period_filings ✅ (added this session)

### LL-206 — useTenant correct pattern
const { tenant } = useTenant(); const tenantId = tenant?.id;

### LL-207 — switchTenant() architecture
No tenantId props on HQ child components.

### LL-208 — Patch ALL finance tables together before migration

### JSX Unicode rule
\u2014 and \u00b7 do NOT process in JSX text nodes. Use literal chars.

### WATERFALL nav pattern
CANNABIS_RETAIL_WATERFALL and WATERFALL are separate configs. Patch both.

---

## BALANCE SHEET PILLARS — VERIFIED (unchanged)
Cash at Bank:   R180,733.69 (HQBankRecon)
PP&E NBV:       R59,774.44  (HQFixedAssets — depreciation still 15-23 mo behind)
Inventory:      AVCO-based

---

## SCHEMA FACTS (confirmed, cumulative)

### vat_transactions (all columns)
id · tenant_id · transaction_type ('output'/'input') · source_table · output_vat
input_vat · vat_period ('YYYY-P{N}') · exclusive_amount · inclusive_amount
description · vat_rate · transaction_date · created_at
source  ← NEW: 'seeded' | 'calculated' | 'manual' (DEFAULT 'manual')

### vat_period_filings (all columns)
id · tenant_id · period_id · filed_at · filed_by · submission_ref · notes · created_at

### tenant_config (Medi Rec — confirmed columns, not JSONB)
vat_registered = true · vat_number = '4123456789' · vat_period = 'bi_monthly'
trading_name · registered_address · financial_setup_complete = true
accounting_basis = 'accrual' · financial_year_end = '02-28'

### user_profiles
PK: id (= auth.uid()) — NOT user_id. Use WHERE id = auth.uid() in RLS policies.

---

## NEXT SESSION PRIORITIES

### P2 — HQFinancialStatements.js (unified IFRS shell)
Scope: 4 IFRS statements only — not a mega-container
  1. Income Statement (from HQProfitLoss data)
  2. Balance Sheet (from HQBalanceSheet data)
  3. Cash Flow Statement (indirect method)
  4. Statement of Changes in Equity (from equity_ledger)
Gate: financial_setup_complete = true (already set for Medi Rec)
Period selector at top shared across all 4 statements
Status badge: Draft → Reviewed → Auditor Signed Off → Locked
Standalone tabs (Journals / BankRecon / FixedAssets / VAT) stay standalone.
THINKING SESSION FIRST: read HQProfitLoss.js + HQBalanceSheet.js before building.
Understand what data each already fetches — avoid double-fetching.

### P3 — VAT Auto-Population Pipeline (blocked until expenses have VAT data)
Phase B: Period Close generates per-transaction vat_transactions rows
Blocked: expenses.input_vat_amount = 0 for all 47 rows (Smart Capture backfill)
Schema ready: source column in place. Option B architecture confirmed.

### Pending Owner Actions (URGENT)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- pg_cron: loyalty-ai nightly (SQL in NUAI-AGENT-BIBLE Section 8)
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
- Yoco: After CIPRO → portal.yoco.com

---

## EF STATUS (unchanged)
ai-copilot v59 · loyalty-ai v2 · process-document v52 · auto-post-capture v1
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36 · verify-qr v34
send-notification v37 · get-fx-rate v35

## LOCKED FILES
src/components/StockItemModal.js
src/components/ProteaAI.js (CODEBASE_FACTS str_replace only)
src/components/PlatformBar.js
src/services/supabaseClient.js

---
*SESSION-STATE v211 · NuAi · 09 Apr 2026*
*Supersedes v210. Read NUAI-AGENT-BIBLE.md first — always.*
