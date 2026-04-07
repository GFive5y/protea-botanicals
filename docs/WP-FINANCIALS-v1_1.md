# WP-FINANCIALS-v1.1 — Audit-Ready Financial Statements
## IFRS for SMEs · SA Companies Act Compliant · Full Audit Trail
## Produced: 07 Apr 2026 · Session v200
## Updated: 07 Apr 2026 · v1.1 — Platform framing corrected
## Priority: HIGH — completes the financial intelligence circle

---

## CRITICAL FRAMING — READ BEFORE BUILDING

**This is a platform feature, not a client configuration.**

The financial statements module works identically for every tenant on the
platform. Medi Recreational, the next dispensary, a food & beverage operation,
a general retailer — they all get the same module. The difference is their data.

There are no "client decisions" to make before building. Every question that
might appear specific to one client is a **configuration field in a setup wizard**
that every tenant fills in for themselves, once, on first use.

You develop against sim data (438 orders, 1,083 line items, 44 expenses,
90 EOD cashups already in the DB). You don't need a real client. You don't need
a real bank. You don't need a real financial year to have ended. The simulator
is your demo company. It's already better than Sage's demo data.

**The three adapters that make this universal:**

1. **Financial Setup Wizard** — five screens, five minutes, run once per tenant.
   Configures: financial year end, VAT status, bank details, opening position.
   After wizard: the entire module self-configures. No developer involvement.

2. **Industry Chart of Accounts templates** — Cannabis Retail (default),
   Food & Beverage, General Retail, Professional Services. Selected in wizard.
   Maps the tenant's transactions to IFRS accounts automatically.

3. **Universal bank CSV parser** — auto-detects FNB, ABSA, Standard Bank,
   Nedbank, Capitec from column headers. Business uploads their statement.
   System identifies the format. No bank selection required.

---

## BUILD PLAN (23 hours across 3-4 Claude Code sessions)

| Phase | Component | Hours | Output |
|---|---|---|---|
| 0 | Financial Setup Wizard | 1h | HQFinancialSetup.js — gateway |
| 1 | Schema migrations | 3h | 8 new tables + column additions |
| 2 | Income Statement IFRS upgrade | 2h | HQProfitLoss.js upgraded |
| 3 | Balance Sheet upgrade | 2h | HQBalanceSheet.js upgraded |
| 4 | Fixed Asset Register | 2h | HQFixedAssets.js — new |
| 5 | Journal Entry Module | 2h | HQJournals.js — new |
| 6 | VAT Module | 2h | HQVat.js — new |
| 7 | Bank Reconciliation | 3h | HQBankRecon.js — new |
| 8 | Notes to Statements | 2h | HQFinancialNotes.js — new |
| 9 | PDF Export Edge Function | 3h | generate-financial-statements EF |
| 10 | Year-End Close | 2h | Year-end process in existing components |

---

## SECTION 0 — PHASE 0: FINANCIAL SETUP WIZARD (DO FIRST)

New component: HQFinancialSetup.js
Trigger: First time Financial Statements tab opened AND tenant_config.financial_year_end IS NULL

5 wizard screens:
1. Business & Legal Details (name, reg number, tax number, auditor)
2. Financial Year (year end month, accounting basis: accrual/cash)
3. VAT (registered?, VAT number, filing period, basis)
4. Bank Account(s) (auto-detect SA banks, account details)
5. Opening Position (share capital, opening cash, retained earnings b/f)

On completion: tenant_config updated, equity_ledger row created, module unlocks.

---

## SECTION 1 — SCHEMA ADDITIONS (8 new tables)

1. tenant_config additions (financial_year_end, vat fields, company details)
2. fixed_assets (asset register with depreciation tracking)
3. depreciation_entries (monthly depreciation schedule)
4. chart_of_accounts (IFRS account codes, industry templates)
5. journal_entries + journal_lines (double-entry journal system)
6. vat_transactions (output/input VAT per transaction)
7. equity_ledger (per-FY retained earnings, share capital, year-end close)
8. bank_accounts + bank_statement_lines (reconciliation)
9. Column additions: orders.vat_amount, expenses.vat_amount/vat_claimable/account_code

---

## SECTION 2 — THE FOUR IFRS STATEMENTS

1. Income Statement (IFRS for SMEs Section 5)
   - Revenue by channel, COGS (AVCO), OPEX by IFRS classification
   - Comparative period, materiality threshold, nature/function toggle

2. Balance Sheet (IFRS for SMEs Section 4)
   - Non-current: PPE (fixed_assets)
   - Current: Inventories (AVCO), receivables, VAT, cash (EOD + bank)
   - Equity: share capital, retained earnings, current year P/L
   - Liabilities: trade payables (open POs), VAT payable, accruals

3. Cash Flow Statement (IFRS for SMEs Section 7)
   - Direct method (default for operators) + Indirect method (for auditors)
   - Operating + Investing + Financing activities

4. Statement of Changes in Equity (IFRS for SMEs Section 6)
   - Share capital, retained earnings, current year P/L, dividends

---

## SECTION 3 — NOTES TO FINANCIAL STATEMENTS (12 auto-populated)

1. Basis of Preparation  2. Revenue Breakdown  3. Inventories (IAS 2)
4. PPE (IAS 16)  5. Trade Receivables  6. Cash & Equivalents
7. Trade Payables  8. Operating Expenses Detail  9. VAT Analysis
10. Related Party Transactions  11. Financial Risk Management
12. Events After Reporting Period

---

## SECTION 4 — BANK CSV PARSER (all SA banks)

Auto-detects: FNB, ABSA, Standard Bank, Nedbank, Capitec from column headers.
Normalises to: { date, description, debit, credit, balance, reference }
Auto-matching: order totals, expense payments, Yoco settlements, PayFast batches.

---

## SECTION 5 — CHART OF ACCOUNTS TEMPLATES

Three industry templates: Cannabis Retail, Food & Beverage, General Retail.
Revenue 40000-49999, COGS 50000-59999, OPEX 60000-69999, Finance 70000-79999,
Assets 10000-19999, Liabilities 20000-29999, Equity 30000-39999.

---

## SECTION 6 — EXPENSE NORMALISATION (run before Phase 2)

Existing 44 expense rows have inconsistent subcategories. SQL migration needed:
rent → Rent & Premises, wages → Staff Wages, utilities/electricity/internet → Utilities,
security → Security, insurance → Insurance, marketing → Marketing,
packaging → Packaging, accounting/Compliance & Legal → Professional Fees.

---

## SECTION 7 — PDF AUDIT PACKAGE

New Edge Function: generate-financial-statements
Output: Cover + Directors' Statement + 4 Statements + 12 Notes + Appendices
Tech: Deno Edge Function + PDFKit, stored in Supabase Storage.

---

## SECTION 8 — STATUS WORKFLOW

Draft → Management Reviewed → Auditor Signed Off → Locked
Once Locked: figures frozen, corrections via journal entries only, PDF permanent.

---

*WP-FINANCIALS-v1.1 · NuAi · 07 Apr 2026*
*Platform-first: every tenant configures via Setup Wizard*
*IFRS for SMEs · SA Companies Act 71 of 2008 · VAT Act 89 of 1991*
*Estimated build: 23 hours · Outcome: full audit-ready financial package*
