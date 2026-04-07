# NUAI — NEXT SESSION PROMPT
## Paste this as the FIRST message of the next Claude.ai session.

---

# YOUR IDENTITY & POWERS

You are the AI development partner for NuAi — a multi-tenant SaaS ERP for
South African cannabis retail, built to serve any retail business type.

**Your tools:**
- **GitHub MCP — READ ONLY.** RULE 0Q (ABSOLUTE): NEVER use `push_files`
  or `create_or_update_file`. These tools are loaded but permanently banned
  from Claude.ai. All commits go through Claude Code in VS Code. Violation
  = immediate VL entry in VIOLATION_LOG.
- **Supabase MCP — FULL ACCESS.** Schema queries, migrations, Edge Function
  deployment, data queries. Use freely.
- **Project Knowledge** — read all docs before acting.

**Repo:** github.com/GFive5y/protea-botanicals · branch: main
**Supabase project:** uvicrqapgzcdvozxrreo
**Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74

---

# LOAD CONTEXT FIRST — IN THIS EXACT ORDER

Before doing anything, read these from GitHub:

1. `docs/SESSION-STATE_v201.md` — current state, all commits, what's next
2. `docs/SESSION-CORE_v2_11.md` — ALL rules. Read every single one.
3. `docs/VIOLATION_LOG_v1_1.md` — what went wrong before, do not repeat
4. `docs/WP-FINANCIALS-v1_1.md` — THE primary build spec for this session

After reading, confirm out loud:
- HEAD commit SHA on main
- Current DB state (run a quick row count query)
- That you understand WP-FINANCIALS is a PLATFORM feature, not Medi Rec specific
- That Phase 0 (Financial Setup Wizard) is the correct first build step

---

# WHAT WAS BUILT LAST SESSION (v200)

The full financial intelligence suite is now live:
- P&L: R477K revenue · R297K gross profit · 62% margin · R87K OPEX
- Balance Sheet: live · accounting equation passing
- Cash Flow: live · waterfall chart
- Forecasting: 30-day projection · stock depletion · restock spend
- TenantPortal Reports: P&L · Expenses · Analytics · Reorder · Balance Sheet · Costing · Forecast
- ProteaAI: CODEBASE_FACTS v200 — 119 features, 62% margin, full fin suite
- Sim engine: sim-pos-sales v4 ACTIVE · 438 orders in DB

---

# THIS SESSION'S JOB — WP-FINANCIALS-v1.1

## CRITICAL FRAMING (understand before touching any code)

**This is a platform feature — not a Medi Rec configuration.**

Every tenant on the platform gets the same financial statements module.
They configure it themselves through the Financial Setup Wizard on first use.
You don't need decisions from the business owner. You don't need a real
financial year to have ended. You don't need a real bank account.

**Development uses sim data** — the 438 sim orders, 1,083 line items with AVCO,
44 expense rows, and 90 EOD cashups already in the Medi Rec tenant are your
demo company. It's better than Sage's demo data.

**The three universal adapters make it work for every business:**
1. Financial Setup Wizard — runs once per tenant, configures everything
2. Industry CoA templates — auto-maps transactions to IFRS accounts
3. Universal bank CSV parser — auto-detects all 5 SA banks from column headers

---

## BUILD SEQUENCE

### BEFORE ANYTHING — Expense Normalisation (10 minutes)

The 44 existing expense rows have inconsistent subcategories. Fix via
Supabase MCP `apply_migration` BEFORE Phase 2:

```sql
-- name: normalise_expense_subcategories
UPDATE expenses SET subcategory = 'Rent & Premises'
  WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
  AND subcategory IN ('rent', 'Rent');

UPDATE expenses SET subcategory = 'Staff Wages'
  WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
  AND subcategory IN ('wages', 'Wages');

UPDATE expenses SET subcategory = 'Utilities'
  WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
  AND subcategory IN ('utilities', 'electricity', 'internet');

UPDATE expenses SET subcategory = 'Security'
  WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
  AND subcategory = 'security';

UPDATE expenses SET subcategory = 'Insurance'
  WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
  AND subcategory = 'insurance';

UPDATE expenses SET subcategory = 'Marketing'
  WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
  AND subcategory = 'marketing';

UPDATE expenses SET subcategory = 'Packaging'
  WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
  AND subcategory = 'packaging';

UPDATE expenses SET subcategory = 'Professional Fees'
  WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
  AND subcategory IN ('accounting', 'Compliance & Legal');
```

Verify: `SELECT subcategory, COUNT(*), SUM(amount_zar) FROM expenses GROUP BY subcategory;`
Should show clean, consistent subcategory names.

---

### PHASE 0 — Financial Setup Wizard (30 minutes)

**New component:** `src/components/hq/HQFinancialSetup.js`

5-screen wizard. Saves to `tenant_config` + `equity_ledger`. Gateway to all statements.

**Screen flow:**
1. Business Details: legal name, trading name, company reg, tax number, registered address, auditor name/firm/email
2. Financial Year: year-end month (default February), accounting basis (accrual/cash)
3. VAT: registered Y/N, if Y: VAT number, filing period (monthly/bi-monthly), basis (invoice/payment)
4. Bank Account: bank name (FNB/ABSA/Standard Bank/Nedbank/Capitec/Other), account number, branch code
5. Opening Position: opening share capital, opening cash, retained earnings if prior year exists

**On save:** Updates `tenant_config.financial_setup_complete = true`. Wizard never shows again.

**Wire to Financial Statements tab:** The Financial Statements component checks
`tenant_config.financial_setup_complete`. If false — show HQFinancialSetup.
If true — show the statements.

**Commit:** `"feat: WP-FINANCIALS phase 0 — Financial Setup Wizard"`

---

### PHASE 1 — Schema Migrations (45 minutes)

Apply via `Supabase:apply_migration`. Full SQL in `docs/WP-FINANCIALS-v1_1.md` Section 1.

Eight migrations in order:

1. `financial_config_columns` — ALTER TABLE tenant_config ADD COLUMN (12 new fields)
2. `fixed_assets_table` — CREATE TABLE fixed_assets
3. `depreciation_entries_table` — CREATE TABLE depreciation_entries
4. `chart_of_accounts_table` — CREATE TABLE chart_of_accounts
5. `journal_entries_tables` — CREATE TABLE journal_entries + journal_lines
6. `vat_transactions_table` — CREATE TABLE vat_transactions
7. `equity_ledger_table` — CREATE TABLE equity_ledger
8. `bank_reconciliation_tables` — CREATE TABLE bank_accounts + bank_statement_lines

After each migration: verify with `SELECT column_name FROM information_schema.columns WHERE table_name = '[table]';`

Then seed default Chart of Accounts (cannabis retail template). The CoA entries
are in `docs/WP-FINANCIALS-v1_1.md` Section 5. Insert via `execute_sql`.

**Commit:** `"feat: WP-FINANCIALS phase 1 — schema: 8 tables, CoA, config columns"`

---

### PHASE 2 — Income Statement IFRS Upgrade (45 minutes)

Read `src/components/hq/HQProfitLoss.js` first.

Add to existing HQProfitLoss.js (ADDITIVE — never delete existing):

1. **IFRS layout toggle:** [Dashboard View] — [IFRS Statement View]
2. **Comparative period column:** Prior period data
3. **Expense IFRS classification:** Map subcategories to CoA account codes
4. **Depreciation line:** From depreciation_entries
5. **Data quality indicator:** COGS coverage %
6. **Draft/Reviewed/Signed status badge**

**Commit:** `"feat: WP-FINANCIALS phase 2 — income statement IFRS layout, comparative, classifications"`

---

### PHASE 3 — Balance Sheet Upgrade (30 minutes)

Add to existing HQBalanceSheet.js:
1. Fixed Assets section (from fixed_assets table)
2. VAT line items (from vat_transactions)
3. Equity section upgrade (from equity_ledger)
4. Prior year column

**Commit:** `"feat: WP-FINANCIALS phase 3 — balance sheet: PPE, VAT, equity from ledger"`

---

### PHASE 4+ — Build priority order after 0-3:

4. Fixed Asset Register (`HQFixedAssets.js`) — new component
5. Journal Entry Module (`HQJournals.js`) — new component
6. VAT Module (`HQVat.js`) — new component
7. Bank Reconciliation (`HQBankRecon.js`) — new component, CSV parser
8. Notes to Statements (`HQFinancialNotes.js`) — new component
9. PDF Export Edge Function (`generate-financial-statements`)
10. Year-End Close process

Each phase spec is fully detailed in `docs/WP-FINANCIALS-v1_1.md`.

---

## CRITICAL RULES — READ SESSION-CORE FIRST

1. **RULE 0Q:** GitHub write tools BANNED from Claude.ai. Not negotiable.
2. **Disk is truth.** Read before building. grep before suggesting.
3. **LL-201:** Codebase runs 1-2 sprints ahead of docs. Features often exist.
4. **LL-204:** Read TenantPortal.js renderTab AND waterfall before adding nav.
5. **Log violations immediately** in VIOLATION_LOG.

## LOCKED FILES — READ ONLY

```
src/components/StockItemModal.js   — LOCKED
src/components/ProteaAI.js         — LOCKED (str_replace CODEBASE_FACTS only)
src/components/PlatformBar.js      — LOCKED
src/components/hq/LiveFXBar.js     — PROTECTED
src/components/hq/HQStock.js       — PROTECTED
```

## SUCCESS DEFINITION FOR THIS SESSION

Minimum: Phases 0 + 1 + 2 committed and working.
Ideal: Phases 0 through 4 committed.
Stretch: Phases 0 through 7 committed — the full accounting engine.

A business owner opens Financial Statements, completes the 5-minute wizard,
and sees an IFRS-formatted Income Statement with correct figures for their
trading period. That's the demo. That's what this session delivers.

---

## CONTEXT SNAPSHOT (DB state when session begins)

```
orders:          ~461 rows (real + sim)
order_items:     ~1,094 rows (AVCO in product_metadata)
expenses:        44 rows (NEEDS NORMALISATION — do first)
inventory_items: 232 rows (186 active, ~R15K AVCO)
eod_cash_ups:    90 rows (real Jan-Apr)
fixed_assets:    table does NOT exist yet (Phase 1 creates it)
journal_entries: table does NOT exist yet (Phase 1 creates it)
equity_ledger:   table does NOT exist yet (Phase 1 creates it)
bank_accounts:   table does NOT exist yet (Phase 1 creates it)
```

```
tenant_config.financial_year_end:     NULL (not configured yet)
tenant_config.vat_registered:         column does NOT exist yet
tenant_config.financial_setup_complete: column does NOT exist yet
```

---

*Next agent prompt · NuAi · 07 Apr 2026*
*This session builds WP-FINANCIALS — the IFRS audit-ready financial package*
*Platform-first: every tenant self-configures via the Financial Setup Wizard*
