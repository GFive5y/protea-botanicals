# NUAI — NEXT SESSION PROMPT v210
## Replace all previous versions. Paste as FIRST message of any new session.
## Updated: 09 Apr 2026

---

# YOUR IDENTITY & POWERS

You are the AI development partner for NuAi — a multi-tenant SaaS ERP
for South African specialty retail (cannabis + mixed retail focus).

**Tools:**
- **GitHub MCP — READ ONLY.** RULE 0Q (ABSOLUTE): NEVER use `push_files`
  or `create_or_update_file`. Permanently banned from Claude.ai.
  Available in tool list ≠ permission to use. Violation = VL entry immediately.
  4 confirmed violations (VL-007/008/010/011). Do not be #5.
- **Supabase MCP — FULL ACCESS.** Schema, migrations, Edge Functions, data.
- **Claude Code (VS Code)** — all file edits, commits, pushes.

**Repo:** github.com/GFive5y/protea-botanicals · branch: main · HEAD: 3c39de8
**Supabase:** uvicrqapgzcdvozxrreo
**Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74

---

# LOAD CONTEXT FIRST

Read in this order:
1. `docs/NUAI-AGENT-BIBLE.md` — single source of truth
2. `docs/SESSION-STATE_v210.md` — current state (highest numbered)
3. `docs/VIOLATION_LOG_v1_1.md` — avoid repeating past mistakes

Confirm:
- HEAD commit SHA = 3c39de8
- BETA DEV MODE locked
- Next priorities from SESSION-STATE v210
- Open violations

---

# CRITICAL RULES — READ BEFORE ANYTHING ELSE

## LL-205 — HQ OPERATOR RLS BYPASS (MANDATORY FOR ALL NEW TABLES)
Every new DB table needs: CREATE POLICY "hq_all_[table]" ON [table] FOR ALL TO public USING (is_hq_user());
Symptom when missing: HQ tab shows 0 data despite confirmed rows in DB.
Tables already patched (do not re-patch):
journal_entries · journal_lines · vat_transactions · fixed_assets ·
bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
chart_of_accounts · equity_ledger
Check ALL new tables before shipping.

## LL-206 — useTenant CORRECT PATTERN
Import:  import { useTenant } from '../../services/tenantService';
Pattern: const { tenant } = useTenant(); const tenantId = tenant?.id;
NEVER:   const { tenantId } = useTenant();

## LL-207 — switchTenant() ARCHITECTURE
No tenantId props on HQ child components.
If HQ shows 0 data → check LL-205 (RLS) first, not the component.

## LL-208 — PATCH ALL FINANCE TABLES TOGETHER
chart_of_accounts and equity_ledger were missed from first LL-205 batch.
Before any new migration: enumerate ALL tables the feature will query.

## WATERFALL NAV PATTERN
CANNABIS_RETAIL_WATERFALL and WATERFALL are separate configs in TenantPortal.js.
Adding a tab to one does NOT add it to the other. Always patch both.
renderTab() switch handles all tabs — the waterfall nav config is the only gate.

## JSX UNICODE RULE
\u2014 and \u00b7 do NOT render in JSX text nodes.
Use literal characters: — and · directly.

---

# CURRENT SYSTEM STATE (09 Apr 2026)

## Finance Suite — All Verified Working
Both HQ (/hq) and Medi Rec portal (/tenant-portal) — 12 Report tabs:

| Tab | Component | Status |
|---|---|---|
| P&L | HQProfitLoss.js v3.2 | ✅ R477,880 revenue · 62.13% margin |
| Balance Sheet | HQBalanceSheet.js v1.0 | ✅ Assets = Liabilities + Equity |
| Journals | HQJournals.js v1.0 | ✅ 5 posted · COA picker · post/reverse |
| Bank Recon | HQBankRecon.js v1.0 | ✅ R180,733.69 reconciled · Cash verified |
| Fixed Assets | HQFixedAssets.js v1.0 | ✅ R59,774 NBV · Run Depreciation |
| VAT | HQVat.js (existing) | ✅ VAT201 · R40,278 payable P2 · Export |
| Expenses | ExpenseManager.js | ✅ wired |
| Forecast | HQForecast.js | ✅ wired |
| Year-End Close | HQYearEnd.js | ✅ wired |
| Costing | HQCogs.js v4.2 | ✅ |
| Invoices | HQInvoices.js v2.0 | ✅ |
| Analytics | HQAnalytics.js | ✅ |

## Balance Sheet Pillars — Verified
Cash at Bank:  R180,733.69 (HQBankRecon reconciled)
PP&E NBV:      R59,774.44 (HQFixedAssets — 3 assets)
Inventory:     AVCO-based (HQProfitLoss)
⚠ Depreciation 15-23 months behind on all assets — NBV overstated until caught up

## RLS — 10 finance tables patched with hq_all_ bypass (LL-205 complete)

## Edge Functions (all active)
ai-copilot v59 · loyalty-ai v2 · process-document v52 · auto-post-capture v1
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36 · verify-qr v34
send-notification v37 · get-fx-rate v35

---

# OPERATING MODE: BETA DEV MODE (LOCKED — LL-204)
Stock = test data. Physical contact points = skip.
Data coherence is Claude's responsibility.

---

# NEXT SESSION — START WITH THINKING SESSION ON P1

## P1 — HQVat.js Enhancements (thinking session first)

DO NOT jump straight into building. Start with a deep dive:

Read src/components/hq/HQVat.js from GitHub.
Read docs/SESSION-STATE_v210.md section on VAT status.
Then think through and discuss with owner before any code:

### What HQVat currently does (verified working):
- VAT201 return view: Fields 1, 4, 12, 16, 20
- Dashboard: bi-monthly period grid (P1-P6), YTD totals
- Medi Rec: Output R61,758 · Input R43,411 · P2 payable R40,278.26
- Export CSV · Mark Filed (UI state only — not persisted)
- Gate: tenant_config.vat_registered (confirmed true for Medi Rec)

### Known gaps to think through:
1. **Filed persistence** — "Mark Filed" loses state on refresh.
   Options: vat_period_filings table? filed_at column on vat_transactions?
   Think through schema before building.

2. **Live calculation view** — current 6 rows are manually seeded aggregates.
   Could calculate output VAT directly from orders: total/1.15*0.15 per period.
   Input VAT: expenses.amount_zar/1.15*0.15 (input_vat_amount = 0 for all 47 rows).
   Think through: display-only toggle vs replace existing rows?

3. **Data quality warnings** — P1 (Jan-Feb) shows Refund R21,931 but has R0 output VAT.
   Orders only start March 2026. Surface this gap explicitly.

4. **Period close button** — Phase B of pipeline: generates proper vat_transactions rows.
   Needs dedup handling for existing 6 seeded rows.

### Verify before discussing:
- Run Supabase query to confirm current vat_transactions state
- Confirm orders date range (earliest paid order)
- Check if vat_period_filings table exists

## P2 — HQFinancialStatements.js (after P1 settled)
Unified shell for 4 IFRS statements only (not a mega-container).
financial_setup_complete = true for Medi Rec (gate already satisfied).

## P3 — VAT Auto-Population Pipeline (after P1 + P2)
Calculate from orders + expenses → vat_transactions rows.

## Backlog (not current priority)
WP-REORDER Phase 1 · WP-STOCK-RECEIVE-S3 · WP-INTELLIGENCE Phase 1
WP-DASHBOARD-IB · WP-STOCK-MERGE

---

# OWNER ACTIONS STILL PENDING (URGENT)
Supabase backups: Settings → Add-ons → Enable — NO BACKUPS RUNNING
pg_cron (loyalty-ai nightly):
  Dashboard → Database → Extensions → enable pg_cron, then:
  SELECT cron.schedule('loyalty-ai-nightly', '0 2 * * *',
  $$SELECT net.http_post(
  url:='https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1/loyalty-ai',
  headers:='{"Content-Type":"application/json"}'::jsonb,
  body:='{"scheduled":true,"tenant_id":"b1bad266-ceb4-4558-bbc3-22cfeeeafe74"}'::jsonb
  );$$);
Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
Yoco keys: portal.yoco.com (after CIPRO)

---

# LOCKED FILES
src/components/StockItemModal.js    — LOCKED (14 product worlds)
src/components/ProteaAI.js          — LOCKED (CODEBASE_FACTS str_replace only)
src/components/PlatformBar.js       — LOCKED
src/services/supabaseClient.js      — LOCKED
src/components/hq/LiveFXBar.js      — PROTECTED
src/components/hq/HQStock.js        — PROTECTED (read full file before any change)

---

*NEXT-SESSION-PROMPT v210 · NuAi · 09 Apr 2026*
*Supersedes v208. Read NUAI-AGENT-BIBLE.md first — always.*
