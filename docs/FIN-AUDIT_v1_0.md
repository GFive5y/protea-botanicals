# FIN-AUDIT v1.0 — Financial Integration Audit
## NuAi · Medi Recreational Tenant · 09 Apr 2026

---

## AUDIT SCOPE

Systematic audit of all financial data flows across the NuAi platform.
Covers: DB table contents, component query mappings, trigger chains, confirmed gaps.

**Tenant:** Medi Recreational · b1bad266-ceb4-4558-bbc3-22cfeeeafe74
**HEAD:** f353ff0 · main
**Method:** Supabase SQL queries + codebase grep of all HQ financial components

---

## 1. DB LAYER INVENTORY — RAW DATA

### 1.1 Revenue & Sales

| Table | Rows | Key Metric |
|---|---|---|
| orders | 450 paid (POS) | R473,480 total revenue |
| order_items | 1,094 lines / 449 orders | R466,015 sum(line_total) |
| stock_movements | 2,093 (1,002 sale_out + 1,083 sale_pos + 8 purchase_in) | -3,323 units out, +202 in |

**Revenue discrepancy:** orders.total (R473,480) vs order_items.line_total (R466,015) = **R7,465 gap**.
Cause: 1 order (450 vs 449) has no order_items, plus likely rounding in sim-pos-sales.
All data is simulated (sim: true in product_metadata). Real POS does not yet write order_items.

**VAT treatment of revenue:** Orders store VAT-inclusive totals. Average order R1,052.18.
If inclusive: avg excl-VAT R914.94, avg VAT R137.24.

### 1.2 Expenses

| Table | Rows | Total |
|---|---|---|
| expenses | 47 | R336,820 total spend |

**VAT on expenses:** 0 of 47 have input_vat_amount > 0. All 47 have input_vat_amount = 0 or NULL.

**Breakdown by subcategory:**

| Subcategory | Rows | Total |
|---|---|---|
| Rent & Premises | 4 | R130,000 |
| Staff Wages | 4 | R112,200 |
| Security | 4 | R21,400 |
| Utilities | 6 | R19,820 |
| Marketing | 4 | R10,700 |
| Insurance | 4 | R10,500 |
| Packaging | 4 | R8,780 |
| Professional Fees | 2 | R8,000 |
| Banking & Fees | 3 | R4,080 |
| Software | 3 | R3,600 |
| Vehicle & Travel | 3 | R3,000 |
| Cleaning & Hygiene | 3 | R2,850 |
| (null) | 1 | R1,000 |
| Equipment | 1 | R890 |
| Other Operating Expenses | 1 | R0 |

### 1.3 VAT Transactions

| Source Table | Source | Rows | Output VAT | Input VAT |
|---|---|---|---|---|
| expenses | calculated | 1 | R0.00 | R0.00 |
| expenses | seeded | 2 | R0.00 | R21,931.31 |
| orders | calculated | 1 | R61,758.26 | R0.00 |

**Total:** 4 rows. Output VAT R61,758.26. Input VAT R21,931.31.
The "seeded" input VAT (R21,931.31) was manually inserted — no expense has input_vat_amount > 0.
The "calculated" expense row has R0 input VAT because no real expense triggered the sync.

### 1.4 Journals

| Table | Rows | Detail |
|---|---|---|
| journal_entries | 5 | 5 posted |
| journal_lines | 4 lines | DR: Other OpEx R3,000 + R1,000. CR: Cash-Bank R4,000. DR=CR ✅ |

### 1.5 Fixed Assets & Depreciation

| Table | Rows | Key Metric |
|---|---|---|
| fixed_assets | 3 | R66,400 cost, R6,625.56 accumulated depreciation |
| depreciation_entries | 0 | **No depreciation has been run** |

**Gap:** accumulated_depreciation on fixed_assets (R6,625.56) exists but depreciation_entries is empty.
The R6,625.56 was likely seeded directly on the asset records, not computed via entries.
Owner must run depreciation from HQFixedAssets to create proper entries.

### 1.6 Balance Sheet Tables

| Table | Rows | Key Metric |
|---|---|---|
| equity_ledger | 1 | FY2026: R150,000 share capital, year NOT closed |
| bank_accounts | (queried) | Columns: opening_balance, NO closing_balance column |
| bank_statement_lines | 22 | 8 expense, 9 order, 1 purchase_order, 3 unmatched, 1 null |
| invoices | 0 | **No invoices exist** |
| financial_year_archive | 0 | Year-end has never been run |

### 1.7 COGS Support Tables

| Table | Rows |
|---|---|
| product_cogs | 0 |
| supplier_products | 0 |
| local_inputs | 0 |
| product_pricing | 0 |

**All empty.** HQProfitLoss queries these but falls back to order_items.product_metadata.weighted_avg_cost.

### 1.8 Other Financial Tables

| Table | Rows |
|---|---|
| chart_of_accounts | 40 codes |
| loyalty_transactions | 258 |
| stock_receipts | 2 (0 with VAT) |
| tenant_config | financial_setup_complete: true, VAT registered, bi-monthly, 15% |

---

## 2. DATA FLOW MAP — EVERY FINANCE TABLE

### orders
- **Writes:** sim-pos-sales EF (v4), POS checkout (src/components/pos/)
- **Reads:** HQProfitLoss, HQBalanceSheet, HQFinancialStatements, HQVat, HQFinancialNotes, HQForecast
- **Triggers:** None financial

### order_items
- **Writes:** sim-pos-sales EF (seed data — all sim:true), POS checkout (NOT YET WRITING — known gap)
- **Reads:** HQProfitLoss (COGS calculation via weighted_avg_cost in product_metadata), HQFinancialStatements
- **Triggers:** None
- **Note:** No tenant_id column — joined via orders.id

### expenses
- **Writes:** ExpenseManager.js (manual), auto-post-capture EF (Smart Capture)
- **Reads:** HQProfitLoss, HQBalanceSheet, HQFinancialStatements, HQVat, HQFinancialNotes, HQForecast, ExpenseManager
- **Triggers:** expense_vat_sync (INSERT/UPDATE/DELETE) → sync_expense_to_vat_transactions()

### vat_transactions
- **Writes:** expense_vat_sync trigger, receipt_vat_sync trigger, HQVat.js (recalculate button inserts calculated rows)
- **Reads:** HQBalanceSheet, HQFinancialStatements, HQVat, HQFinancialNotes
- **Triggers:** None

### journal_entries
- **Writes:** HQJournals.js (manual + reversal), HQYearEnd.js (closing entry)
- **Reads:** HQJournals.js, HQYearEnd.js
- **NOT read by:** HQProfitLoss ❌, HQBalanceSheet ❌, HQFinancialStatements ❌
- **Triggers:** None

### journal_lines
- **Writes:** HQJournals.js, HQYearEnd.js
- **Reads:** HQJournals.js (nested select), HQYearEnd.js
- **NOT read by:** HQProfitLoss ❌, HQBalanceSheet ❌

### chart_of_accounts
- **Writes:** Financial setup wizard (assumed)
- **Reads:** HQJournals.js (COA picker), HQYearEnd.js

### fixed_assets
- **Writes:** HQFixedAssets.js (add/update)
- **Reads:** HQFixedAssets.js, HQBalanceSheet, HQFinancialStatements, HQFinancialNotes

### depreciation_entries
- **Writes:** HQFixedAssets.js (run depreciation button)
- **Reads:** HQFixedAssets.js, HQProfitLoss, HQFinancialStatements, HQFinancialNotes

### equity_ledger
- **Writes:** Financial setup wizard, HQYearEnd.js (update on close)
- **Reads:** HQProfitLoss, HQBalanceSheet, HQFinancialStatements, HQFinancialNotes

### bank_accounts
- **Writes:** HQBankRecon setup
- **Reads:** HQBankRecon, HQFinancialNotes
- **Note:** No closing_balance column — balance derived from statement lines

### bank_statement_lines
- **Writes:** HQBankRecon (CSV import + matching)
- **Reads:** HQBankRecon
- **NOT read by:** HQBalanceSheet ❌, HQFinancialStatements ❌

### stock_receipts
- **Writes:** StockReceiveModal.js, receive-from-capture EF
- **Reads:** HQVat.js
- **Triggers:** receipt_vat_sync (INSERT/UPDATE/DELETE) → sync_receipt_to_vat_transactions()

### invoices
- **Writes:** (no component writes observed)
- **Reads:** HQBalanceSheet (trade receivables), HQFinancialStatements
- **Status:** 0 rows — table exists but unused

### financial_year_archive
- **Writes:** HQYearEnd.js (on year close)
- **Reads:** HQYearEnd.js (UI reference)
- **Status:** 0 rows — year-end never run

### vat_period_filings
- **Writes:** HQVat.js (period close)
- **Reads:** HQVat.js

### financial_statement_status
- **Writes:** HQFinancialStatements.js (upsert on generation)
- **Reads:** HQFinancialStatements.js

### product_cogs / supplier_products / local_inputs / product_pricing
- **Writes:** None observed
- **Reads:** HQProfitLoss.js (all 4 queried)
- **Status:** All 0 rows — COGS builder tables exist but unpopulated

### loyalty_transactions
- **Writes:** QR scan (verify-qr EF), POS checkout, loyalty-ai EF
- **Reads:** HQProfitLoss (loyalty cost calculation)

### loyalty_config
- **Reads:** HQProfitLoss (points-to-rand ratio)

### stock_movements
- **Reads:** HQProfitLoss
- **Note:** Column is movement_type (not type). Values: sale_out, sale_pos, purchase_in

### tenant_config
- **Reads:** HQProfitLoss, HQBalanceSheet, HQFinancialStatements, HQVat, HQFinancialNotes, ExpenseManager

### eod_cash_ups
- **Reads:** HQForecast.js

---

## 3. CONFIRMED GAPS

### GAP-01: Revenue uses VAT-inclusive totals — no VAT exclusion ❌
- **Table:** orders
- **Components:** HQProfitLoss.js (line 1023–1031)
- **Issue:** Revenue = SUM(orders.total). Orders are VAT-inclusive (R473,480). IFRS requires revenue reported net of VAT. Should be ~R411,722 (÷ 1.15).
- **Business impact:** Revenue overstated by ~R61,758 (≈15%). Gross margin % understated.
- **Fix complexity:** Medium — add `/ 1.15` in HQProfitLoss revenue calculation + HQFinancialStatements

### GAP-02: P&L and Balance Sheet ignore journal entries ❌
- **Tables:** journal_entries, journal_lines
- **Components:** HQProfitLoss.js, HQBalanceSheet.js
- **Issue:** Neither component queries journal_entries. Manual journals (R4,000 total) are invisible to financial statements. Only HQJournals.js and HQYearEnd.js read them.
- **Business impact:** Manual adjustments (accruals, corrections, reclassifications) have no effect on reported P&L or Balance Sheet figures.
- **Fix complexity:** High — requires mapping account_codes to P&L/BS line items

### GAP-03: All 47 expenses have zero input VAT ❌
- **Table:** expenses
- **Components:** HQVat.js (line 374 shows warning), ExpenseManager.js
- **Issue:** input_vat_amount = 0 on all 47 expenses. The expense_vat_sync trigger fires but creates R0 VAT rows. Only 2 seeded vat_transactions have real input VAT (R21,931.31).
- **Business impact:** Input VAT under-claimed. VAT201 returns inaccurate. Only Smart Capture auto-fills VAT — manual expenses entered without VAT amounts.
- **Fix complexity:** Low — ExpenseManager already has the input field. Owner needs to populate existing expense VAT amounts.

### GAP-04: Depreciation never run — 0 entries ❌
- **Table:** depreciation_entries
- **Component:** HQFixedAssets.js
- **Issue:** 3 fixed assets (R66,400 cost) but 0 depreciation_entries. The R6,625.56 accumulated_depreciation on assets was likely seeded, not computed. HQProfitLoss reads depreciation_entries for the P&L depreciation line — gets R0.
- **Business impact:** Depreciation expense missing from P&L. NBV on Balance Sheet incorrect (overstated by months of missed depreciation).
- **Fix complexity:** Low — owner clicks "Run Depreciation" in HQFixedAssets (already flagged as Owner Action)

### GAP-05: order_items.line_total vs orders.total discrepancy ⚠️
- **Tables:** orders, order_items
- **Component:** HQProfitLoss.js
- **Issue:** orders.total = R473,480 but order_items.line_total = R466,015 (R7,465 gap / 1.6%). 450 orders vs 449 with items. All order_items are sim:true (simulated).
- **Business impact:** COGS calculation in HQProfitLoss uses order_items — if 1 order has no items, its COGS contribution is lost. Revenue uses orders.total. Revenue and COGS use different data sources.
- **Fix complexity:** Low — ensure POS writes order_items on every sale (known BUG, already in priorities as P4)

### GAP-06: Cash flow statement not connected to bank data ⚠️
- **Table:** bank_statement_lines, bank_accounts
- **Component:** HQFinancialStatements.js
- **Issue:** Cash flow statement uses estimated values (cashToSuppliers = 0, hardcoded). bank_accounts has no closing_balance column. 22 bank_statement_lines exist but aren't read by financial statements.
- **Business impact:** Cash flow statement is directionally correct but not reconciled to actual bank balances.
- **Fix complexity:** Medium — connect bank recon data to cash flow, add closing_balance to bank_accounts

### GAP-07: Invoices table empty — trade receivables always R0 ⚠️
- **Table:** invoices
- **Component:** HQBalanceSheet.js (queries invoices for trade receivables)
- **Issue:** 0 rows in invoices. Balance Sheet shows R0 trade receivables. Not a bug if all sales are cash/POS, but limits credit-sale scenarios.
- **Business impact:** Low for current POS-only model. Becomes critical if wholesale/credit sales begin.
- **Fix complexity:** N/A — not a bug, architectural readiness

### GAP-08: COGS builder tables all empty ⚠️
- **Tables:** product_cogs, supplier_products, local_inputs, product_pricing
- **Component:** HQProfitLoss.js (queries all 4)
- **Issue:** All 0 rows. HQProfitLoss falls back to order_items.product_metadata.weighted_avg_cost for COGS. This works because sim-pos-sales embeds AVCO at sale time.
- **Business impact:** Low — fallback works. But COGS builder UI is non-functional until populated.
- **Fix complexity:** N/A — tables are ready for WP-REORDER to populate

### GAP-09: Payroll not integrated with expenses ⚠️
- **Components:** HRPayroll.js, ExpenseManager.js
- **Issue:** HRPayroll.js is read-only (SimplePay CSV export). Wages in expenses (R112,200) are manually entered, not derived from payroll data. No payroll_runs table exists.
- **Business impact:** Wage expenses may not match actual payroll. No automated reconciliation.
- **Fix complexity:** Medium — create payroll_runs table, auto-insert wage expenses from payroll

### GAP-10: 1 expense with null subcategory ⚠️
- **Table:** expenses
- **Issue:** 1 expense (R1,000) has subcategory = NULL. Appears in P&L under "Other" bucket.
- **Business impact:** Minor — cosmetic classification gap
- **Fix complexity:** Trivial — owner updates the expense subcategory

---

## 4. INTEGRATION STATUS — P&L LINES

| Line Item | Source Table | Calculation | VAT Treatment | Status |
|---|---|---|---|---|
| **Revenue** | orders (SUM total) | Direct sum of paid orders | VAT-inclusive ❌ (should exclude) | ⚠️ GAP-01 |
| **COGS** | order_items (qty × weighted_avg_cost from metadata) | Per-item AVCO from product_metadata | N/A (cost-based) | ✅ Works (sim data) |
| **Gross Profit** | Revenue - COGS | Calculated | Inherits GAP-01 | ⚠️ |
| **Operating Expenses** | expenses (category in opex/wages/tax/other) | SUM amount_zar by subcategory | Not VAT-adjusted | ✅ |
| **Depreciation** | depreciation_entries (SUM depreciation) | Sum of entries | N/A | ❌ GAP-04 (0 entries) |
| **Loyalty Cost** | loyalty_transactions × config ratio | Points × R-per-point from loyalty_config | N/A | ✅ |
| **Net Profit** | Gross Profit - OpEx - Depreciation - Loyalty | Calculated | Inherits gaps | ⚠️ |
| **Journal Adjustments** | journal_entries / journal_lines | **NOT INCLUDED** | N/A | ❌ GAP-02 |

---

## 5. INTEGRATION STATUS — BALANCE SHEET LINES

| Line Item | Source Table | Calculation | Status |
|---|---|---|---|
| **Inventory (Current Asset)** | inventory_items (qty × AVCO, is_active) | SUM(quantity_on_hand × weighted_avg_cost) | ✅ |
| **Trade Receivables** | invoices (unpaid) | SUM(total_amount where status != paid) | ⚠️ GAP-07 (0 rows) |
| **Cash & Bank** | bank_accounts | opening_balance (no closing_balance col) | ⚠️ GAP-06 |
| **Fixed Assets (NBV)** | fixed_assets | purchase_cost - accumulated_depreciation | ⚠️ GAP-04 (dep stale) |
| **Trade Payables** | purchase_orders (outstanding) | SUM(landed_cost_zar where po_status != complete) | ✅ |
| **VAT Payable** | vat_transactions | SUM(output_vat) - SUM(input_vat) | ✅ (data incomplete per GAP-03) |
| **Accrued Expenses** | expenses (unpaid) | Filtered by payment status | ✅ |
| **Share Capital** | equity_ledger | share_capital field | ✅ R150,000 |
| **Retained Earnings** | equity_ledger | opening_retained_earnings + net_profit - dividends - drawings | ⚠️ net_profit_for_year = NULL |
| **Journal Adjustments** | journal_lines mapped to BS accounts | **NOT INCLUDED** | ❌ GAP-02 |

---

## 6. TRIGGER AUDIT — VAT PIPELINE

### expense_vat_sync
- **Fires on:** INSERT, UPDATE, DELETE on expenses
- **Executes:** sync_expense_to_vat_transactions()
- **Status:** ✅ Trigger exists and fires. But all 47 expenses have input_vat_amount = 0, so it creates R0 VAT rows.

### receipt_vat_sync
- **Fires on:** INSERT, UPDATE, DELETE on stock_receipts
- **Executes:** sync_receipt_to_vat_transactions()
- **Status:** ✅ Trigger exists and fires. 2 stock_receipts both have input_vat_amount = 0.

### Code references to input_vat_amount (6 files):
1. **ExpenseManager.js** — form field, insert payload, CSV export, display
2. **HQSmartCapture.js** — extraction from AI, passed to auto-post-capture
3. **HQVat.js** — reads from expenses + stock_receipts, aggregates for VAT201
4. **StockReceiveModal.js** — form field on stock receiving

**Pipeline is technically complete but data-starved:** The triggers fire correctly, the code reads/writes the field, but no real expense has been entered with a VAT amount yet.

---

## 7. DEAD CODE / UNUSED FETCHES

| Component | Query | Table | Issue |
|---|---|---|---|
| HQProfitLoss.js:932 | `.from("product_cogs")` | product_cogs | 0 rows — empty result always |
| HQProfitLoss.js:933 | `.from("supplier_products")` | supplier_products | 0 rows — empty result always |
| HQProfitLoss.js:934 | `.from("local_inputs")` | local_inputs | 0 rows — empty result always |
| HQProfitLoss.js:935 | `.from("product_pricing")` | product_pricing | 0 rows — empty result always |
| HQBalanceSheet.js:367 | `.from("invoices")` | invoices | 0 rows — always returns R0 receivables |
| HQFinancialStatements.js:266 | `.from("invoices")` | invoices | 0 rows — always returns R0 |

**Not dead code** — these are architectural placeholders for future data. They don't cause errors but add 6 unnecessary API calls per page load. Consider lazy-loading when row count > 0.

---

## 8. RECOMMENDED FIX ORDER (by impact)

### Priority 1 — GAP-01: Revenue VAT exclusion
**Impact:** R61,758 revenue overstatement (15%)
**Effort:** ~30 min
**Fix:** In HQProfitLoss.js line ~1031, divide revenue by 1.15. Same in HQFinancialStatements.js.
**Why first:** Every financial metric downstream (margin, net profit, ratios) is wrong.

### Priority 2 — GAP-04: Run depreciation
**Impact:** Depreciation expense missing from P&L, NBV overstated on BS
**Effort:** Owner action — click button in HQFixedAssets
**Fix:** Run depreciation for all 3 assets, catching up 15-23 months each.

### Priority 3 — GAP-03: Backfill expense input VAT
**Impact:** Input VAT under-claimed on VAT201, overpaying SARS
**Effort:** ~1 hour owner data entry (47 expenses)
**Fix:** Update input_vat_amount on applicable expenses via ExpenseManager edit. Triggers auto-fire.

### Priority 4 — GAP-05: POS order_items write
**Impact:** COGS accuracy when real sales begin
**Effort:** ~2 hours dev
**Fix:** Already tracked as P4 priority. POS checkout must INSERT order_items per line.

### Priority 5 — GAP-02: Journal entries in P&L/BS
**Impact:** Manual adjustments invisible to financial statements
**Effort:** ~4-6 hours dev
**Fix:** Map journal_lines account_codes to P&L/BS sections. Add journal adjustment rows.
**Note:** Only 5 journal entries (R4,000) exist — low urgency until volume grows.

### Priority 6 — GAP-06: Cash flow + bank integration
**Impact:** Cash flow statement accuracy
**Effort:** ~3-4 hours dev
**Fix:** Add closing_balance to bank_accounts (or derive from statement lines). Connect to HQFinancialStatements.

### Priority 7 — GAP-09: Payroll → expense automation
**Impact:** Wage expense accuracy and reconciliation
**Effort:** ~4 hours dev
**Fix:** Create payroll_runs table, auto-insert wage expense on payroll confirmation.

---

## SUMMARY

| Category | Status |
|---|---|
| Revenue pipeline | ⚠️ Works but VAT-inclusive (overstated 15%) |
| COGS pipeline | ✅ AVCO from order_items metadata |
| Expense pipeline | ✅ Manual entry works, Smart Capture works |
| VAT pipeline (triggers) | ✅ All triggers fire correctly |
| VAT pipeline (data) | ❌ 0 real expenses have input VAT populated |
| Journal system | ✅ Works standalone, ❌ not integrated into P&L/BS |
| Fixed assets | ⚠️ Assets exist, depreciation never run |
| Bank reconciliation | ✅ Works standalone, ❌ not connected to cash flow |
| Year-end | ✅ Code ready, never run (FY2026 still open) |
| Equity | ✅ Share capital correct, retained earnings awaiting year-end |

**Bottom line:** The financial system architecture is complete and sound. The primary issues are:
1. A VAT calculation gap in revenue (code fix needed)
2. Data population gaps (owner actions — depreciation, expense VAT)
3. Journal integration (future dev work)

No data corruption found. No broken triggers. No orphaned references.

---

*FIN-AUDIT v1.0 · NuAi · 09 Apr 2026*
*Auditor: Claude Code (Opus 4.6)*
*Method: Supabase SQL + codebase grep · 14 DB queries + full component scan*
*Next action: Fix GAP-01 (revenue VAT exclusion) — highest impact, lowest effort*
