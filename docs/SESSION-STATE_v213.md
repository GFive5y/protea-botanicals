# SESSION-STATE v213 — 09 Apr 2026 (Session Close)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- HEAD: a3f258b

## OPERATING MODE: BETA DEV MODE (locked)

## Read Order — Every Session
1. NUAI-AGENT-BIBLE.md — always first
2. SESSION-STATE_v213.md (this file)
3. VIOLATION_LOG_v1_1.md
4. Verify HEAD via GitHub:get_file_contents before any build

---

## COMMITS THIS SESSION (4203188 → a3f258b)

| SHA | What |
|---|---|
| 2a36184 | docs: SESSION-STATE v212 |
| [db] | get_vat_period() function + expense_vat_sync trigger (Supabase MCP) |
| a3f258b | P3 VAT pipeline — ExpenseManager v1.1 + HQVat dynamic Data Sources |

---

## WHAT IS FULLY VERIFIED THIS SESSION

### P3-A VAT Auto-Population Pipeline ✅ (screenshots confirmed 09 Apr 2026)

**DB trigger: expense_vat_sync**
- Fires AFTER INSERT/UPDATE/DELETE on expenses
- Reads tenant_config.vat_registered — no-op for non-VAT tenants
- INSERT/UPDATE with input_vat_amount > 0 → writes vat_transactions row
  (type: input, source: 'calculated', source_table: 'expenses', source_id linked)
- UPDATE → deletes old row, inserts new (keeps sync clean)
- DELETE → deletes linked vat_transactions row
- get_vat_period() function: derives period string from date + vat_period type
  ('bi_monthly' → 2026-P1..P6, 'monthly' → P1..P12, 'quarterly' → P1..P4)
- Smoke tested: R4,850 expense → R632.61 VAT → correct 2026-P1 row landed instantly

**ExpenseManager.js v1.1**
- VAT field (Input VAT R) in Add/Edit tab — only shown when vatRegistered = true
- "Calc 15%" button: auto-fills amount_zar × 15/115 (extract VAT from inclusive)
- Helper text: "From supplier tax invoice. Auto-filled by Smart Capture."
- Non-VAT tenants: no VAT field shown at all (clean for all industries)
- handleSave: input_vat_amount included in payload (defaults to 0)
- handleEdit: loads existing input_vat_amount into form
- Bulk import: optional 6th CSV column vat_amount
- Export CSV: includes Input VAT column
- vatRegistered state loaded from tenant_config on mount

**HQVat.js Data Sources panel (INPUT) — now dynamic**
- expensesInputVat state: real sum from expenses.input_vat_amount
- If > 0 → green "✓ Input VAT captured from expenses: R..." with amount
- If 0 → amber "⚠ No input VAT captured on expenses yet. Add VAT amounts
  in Expenses Manager, or use Smart Capture to read them automatically."
- No longer hardcoded warning

**Multi-tenant behavior verified (screenshots):**
- Pure Premium THC Vapes (not VAT registered) → "VAT not registered" gate ✅
- Medi Rec (VAT registered) → full VAT201 + dynamic Data Sources ✅
- Period Close modal: honestly shows Input VAT = R0 + warning about seeded data ✅

### PLATFORM ARCHITECTURE NOTE — P3-A
The trigger-based approach means ALL expense entry paths auto-sync to
vat_transactions without any UI code needing to remember:
- Manual entry (ExpenseManager) ✓
- Bulk CSV import ✓
- Smart Capture (process-document EF writes to expenses) ✓ — will work
  automatically once Smart Capture populates input_vat_amount
This is correct SaaS platform architecture — data pipeline, not client bookkeeping.

---

## DB ADDITIONS THIS SESSION

### get_vat_period(date, period_type) FUNCTION
IMMUTABLE PostgreSQL function. Derives VAT period string from date + type.
bi_monthly: CEIL(month/2) → P1..P6
monthly: month → P1..P12
quarterly: CEIL(month/3) → P1..P4

### expense_vat_sync TRIGGER (on expenses)
AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW
Function: sync_expense_to_vat_transactions()
Reads: tenant_config.vat_registered, vat_period, vat_rate per tenant
Writes: vat_transactions (source='calculated', source_table='expenses')

---

## WHAT IS STILL SEEDED / DEMO DATA (not real)

vat_transactions rows with source = 'seeded' (6 rows):
- 2 output rows: monthly summaries (will be replaced when Period Close runs)
- 4 input rows: manually fabricated estimates (will be replaced when expenses
  have real input_vat_amount values and Period Close runs)
These seeded rows are intentional demo data for the dev phase.
They do NOT cause bugs — HQVat reads them correctly and badges them "seeded".

---

## CRITICAL RULES (cumulative — no changes this session)

### LL-205 — HQ RLS bypass table list (12 tables — unchanged)
journal_entries · journal_lines · vat_transactions · fixed_assets ·
bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
chart_of_accounts · equity_ledger · vat_period_filings ·
financial_statement_status

### LL-206 — useTenant pattern
const { tenant } = useTenant(); const tenantId = tenant?.id;

### purchase_orders — always use po_status not status for lifecycle filtering

### bounds/derived objects — always useMemo if used in useCallback deps

---

## NEXT SESSION PRIORITIES

### P3-B — Purchase Order VAT (next logical step in pipeline)
Same pattern as P3-A but for purchase orders.
- Add input_vat_amount to purchase_orders table
- Same trigger pattern: po_status → 'received' + input_vat_amount > 0 → vat_transactions
- UI: add VAT field to stock receive flow (HQPurchaseOrders or StockReceiveModal)
- Requires reading HQPurchaseOrders.js + StockReceiveModal.js before building
- Note: only applicable for local SA suppliers (imported hardware has no SA VAT)

### WP-REORDER Phase 1
Stock alert engine · reorder triggers · procurement nudges.
Spec: docs/WP-REORDER_v1_0.md
No blockers.

### WP-DASHBOARD-IB
Inbox-style dashboard for branch/store managers.
No blockers.

### WP-FINANCIAL-STATEMENTS-PDF (Phase B)
Print/PDF for 4 IFRS statements. Low priority.
Use browser Ctrl+P as workaround.

### Owner Actions (URGENT — unchanged)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- pg_cron: loyalty-ai nightly (SQL in NUAI-AGENT-BIBLE Section 8)
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
- Yoco keys: portal.yoco.com (after CIPRO)

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

## SCHEMA FACTS (cumulative)

### vat_transactions — all columns (confirmed)
id · tenant_id · transaction_date · transaction_type · source_table · source_id
vat_period · output_vat · input_vat · exclusive_amount · inclusive_amount
vat_rate · description · created_at · source

### expenses — VAT-relevant columns
input_vat_amount  numeric  DEFAULT 0   ← UI now writes this
amount_zar is INCLUSIVE (what was paid) — VAT extracted as amount × 15/115

### tenant_config — VAT columns
vat_registered  boolean
vat_period      text  ('bi_monthly' | 'monthly' | 'quarterly')
vat_rate        numeric  (default 0.15)
tenant_id used as join key (not id)

---
*SESSION-STATE v213 · NuAi · 09 Apr 2026*
*Supersedes v212. Read NUAI-AGENT-BIBLE.md first — always.*
