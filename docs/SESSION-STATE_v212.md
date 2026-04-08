# SESSION-STATE v212 — 09 Apr 2026 (Session Close)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- HEAD: 4203188

## OPERATING MODE: BETA DEV MODE (locked)

## Read Order — Every Session
1. NUAI-AGENT-BIBLE.md — always first
2. SESSION-STATE_v212.md (this file)
3. VIOLATION_LOG_v1_1.md
4. Verify HEAD via GitHub:get_file_contents before any build

---

## COMMITS THIS SESSION (154ba50 → 4203188)

| SHA | What |
|---|---|
| [db] | financial_statement_status table · hq_all_ + tenant_own RLS (LL-205) |
| e8b6b0d | HQFinancialStatements.js v1.0 — 4 IFRS statements + TenantPortal.js patch |
| 4203188 | fix: bounds useMemo (infinite loop) + purchase_orders po_status fix |

---

## WHAT IS FULLY VERIFIED AND WORKING

### HQFinancialStatements.js v1.0 ✅ (09 Apr 2026)

**Location:** Intelligence → IFRS Statements (both WATERFALL configs patched)
**Route:** /tenant-portal?tab=fin-statements

**4 statements:**
1. Income Statement — Revenue → COGS (AVCO via order_items) → Gross Profit → OpEx lines by subcategory → Depreciation → Net Profit · margins shown
2. Balance Sheet — 2-column: Assets (Inventory AVCO + Receivables + PPE NBV) vs Liabilities (payables po_status) + Equity (equity_ledger) · accounting equation check
3. Cash Flow — Simplified indirect: Net Profit + Depreciation add-back = Operating · CapEx = Investing · note on working capital approximation
4. Changes in Equity — Share Capital / Retained Earnings / Current Period / Total columns · closing balance

**Status workflow:**
- Draft → [Mark Reviewed] → [Auditor Sign Off…] (modal: enter auditor name) → [Lock Period]
- Persists to financial_statement_status table (upsert on tenant_id + financial_year)
- Locked = no further status changes
- Any authenticated user with tab access can advance (tenant self-managed by design)

**Period selector:** FY2026 (default) · FY2025 (prior year — shows "— prior period" in all columns) · Custom range
**Gate:** financial_setup_complete = true (shows HQFinancialSetup if not configured)
**Independent data fetch** — does NOT import from HQProfitLoss or HQBalanceSheet

**Bugs fixed post-deploy:**
- bounds not memoized → infinite render loop → 50+ 400 errors → fixed with useMemo
- purchase_orders filtered by status column → should use po_status → fixed

### DB Addition This Session
financial_statement_status table:
  id · tenant_id · financial_year · status (draft/reviewed/signed/locked)
  reviewed_at · reviewed_by · signed_at · signed_by · locked_at · notes
  created_at · updated_at
  UNIQUE(tenant_id, financial_year)
  RLS: hq_all_financial_statement_status + tenant_own_fss_select/upsert/update

### LL-205 Patched Tables (cumulative — now 12)
journal_entries · journal_lines · vat_transactions · fixed_assets ·
bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
chart_of_accounts · equity_ledger · vat_period_filings · financial_statement_status ✅

### All Previous Finance Suite — Still Verified
P&L · Balance Sheet · Journals · Bank Recon · Fixed Assets · VAT v2.0 ·
Expenses · Forecast · Year-End Close · Costing · Invoices · Analytics ·
IFRS Statements v1.0 ✅ (added this session)

---

## BUGS DISCOVERED AND PATTERNS TO REMEMBER

### BUG-001 — bounds object not memoized (infinite loop pattern)
When a derived object (bounds) is computed inline in a component body and used
as a useCallback dependency, it creates a new reference every render.
This causes useCallback to change every render → useEffect fires every render → infinite fetch loop.
FIX: always wrap derived objects used as useCallback/useEffect deps in useMemo.
PATTERN: any `const x = { ... }` or `const x = fn()` that feeds into a
useCallback dependency array MUST be useMemo'd.

### BUG-002 — purchase_orders has two status columns
purchase_orders has both `status` (general) and `po_status` (procurement lifecycle).
Procurement lifecycle values (pending/confirmed/ordered/received/complete) live in po_status.
Always use po_status for procurement filtering. Never use status for po lifecycle.

---

## NEXT SESSION PRIORITIES

### P3 — VAT Auto-Population Pipeline
Blocked: expenses.input_vat_amount = 0 for all 47 rows (Smart Capture backfill needed)
Schema ready: vat_transactions.source column in place.
Decision needed from owner: manual backfill OR wait for Smart Capture?

### WP-REORDER Phase 1
Stock alert engine · reorder triggers · procurement nudges.
Spec: docs/WP-REORDER_v1_0.md

### WP-DASHBOARD-IB
Inbox-style dashboard for branch/store managers. Quick win, high demo value.
Spec: docs/WP-DASHBOARD-IB_v1_0.md

### WP-STOCK-RECEIVE-S3
Stock receiving workflow upgrade.

### WP-FINANCIAL-STATEMENTS-PDF (Phase B — lower priority)
Print/PDF export for all 4 IFRS statements.
NOT built in v1. Use browser Ctrl+P as workaround.
Build after Reorder and Dashboard-IB.

### Balance Sheet Phase B (lower priority)
- Wire VAT payable in Balance Sheet to vat_period_filings (currently shows 0)
- Prior period columns: populate once FY2025 year-end close is run

### Pending Owner Actions (URGENT)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- pg_cron: loyalty-ai nightly (SQL in NUAI-AGENT-BIBLE Section 8)
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
- Yoco: After CIPRO → portal.yoco.com
- P3 VAT decision: manual backfill expenses.input_vat_amount OR wait for Smart Capture

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

## PROTECTED FILES (read full file before any change)
src/components/hq/HQStock.js
src/components/hq/LiveFXBar.js

---

## SCHEMA FACTS (cumulative — no changes this session beyond new table)

### tenant_config (Medi Rec)
vat_registered = true · vat_number = '4123456789' · vat_period = 'bi_monthly'
financial_setup_complete = true · accounting_basis = 'accrual'
financial_year_end = '02-28'

### purchase_orders — TWO STATUS COLUMNS (critical)
po_status: procurement lifecycle — pending/confirmed/ordered/received/complete
status: general field — do NOT use for procurement filtering

### user_profiles
PK: id (= auth.uid()). Use WHERE id = auth.uid() — NEVER WHERE user_id = auth.uid()

---
*SESSION-STATE v212 · NuAi · 09 Apr 2026*
*Supersedes v211. Read NUAI-AGENT-BIBLE.md first — always.*
