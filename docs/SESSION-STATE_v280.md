# SESSION STATE v280 — Session 260 Close
## Date: 14 April 2026 -- HEAD: c34f775

---

## COMPLETED THIS SESSION

### Ghost Financial Tabs — All Industry Profiles
- HQChartOfAccounts.js extracted as standalone component
- HQFinancialStatements, HQFinancialNotes, HQYearEnd, HQChartOfAccounts wired in:
  - HQDashboard.js (HQ portal)
  - TenantPortal.js (all 4 waterfall arrays -- F&B, Cannabis Retail, General Retail, Dispensary)
- Verified: `grep -c "chart-of-accounts" TenantPortal.js` = 4 (one per waterfall)
- Commits: 9a1ce3b, 0032f09

### Garden Bistro — Full Financial Package Delivered
All screens verified with real data as at 14 April 2026:

| Screen | Status | Key Figures |
|---|---|---|
| P&L | Done | R380,856 revenue YTD -- R157,487 COGS -- -R138,640 IS loss |
| Expenses | Done | 30 expenses -- R476,800 total |
| Journals | Done | 9 posted -- R914,380 |
| VAT | Done | R25,402 overdue (intentional demo signal) -- R13,519 current |
| Bank Recon | Done | 15 lines all matched -- R38,264 closing |
| Fixed Assets | Done | 24 dep entries -- R103,624 accum -- R497,876 NBV |
| Balance Sheet | Done | R592,315 assets -- R9,140 gap noted with amber banner |
| Year-End Close | Done | Shows real RPC figures before locking |
| IFRS Income Statement | Done | R380,856 revenue -- R157,487 COGS -- R19,410 dep |
| IFRS Cash Flow | Done | R19,410 add-back correct |
| IFRS Changes in Equity | Done | Correct |
| IFRS Balance Sheet | Note | R26,364 gap -- VAT pipeline (same root cause as BS gap) |
| Financial Notes | Done | Note 4 R380,856 -- Note 10 R38,264 -- Note 12 -R121,416 |
| Financial Notes editable | Done | Notes 2,6,13,14 have inline edit + DB persistence |
| COA | Done | 40 accounts -- correct type labels |
| HR Suite | Done | 4 staff -- contracts -- BCEA leave -- timesheets -- Marco May leave |
| Forecast | Done | R740 projected net -- honest |

### IFRS Fixes Applied (commits 37c9174, f107b13, dd30565, d2eeecf)
- COGS now reads from tenant_financial_period RPC (was R0)
- Cash at Bank R38,264 added to IFRS BS current assets
- Note 10 shows closing balance from bank_statement_lines
- COA label typos fixed (Assets/Liabilities/Equity/Revenue/Expenses)
- Depreciation add-back in cash flow: R19,410
- Editable narrative notes 2,6,13,14 with DB persistence via financial_statement_notes table
- IFRS BS VAT aligned to vat_transactions direct query

### Equity Ledger Corrected
- net_profit_for_year updated: -R81,166 -> -R121,416.13 (correct RPC FY figure)
- Recalculate button fixed: now uses full calendar year + opex.total not opex.paid
- Operational BS gap: R31,110 -> R9,139.85 (residual = VAT pipeline bug)

### Depreciation — Fully Caught Up
- 6 months posted: Nov 2025, Dec 2025, Jan 2026, Feb 2026, Mar 2026, Apr 2026
- 24 total entries -- R29,115 total (6 x R4,852.50) -- Variance: R0

### new DB table: financial_statement_notes
- (id, tenant_id, financial_year, note_number, content, updated_at)
- RLS: tenant_own_notes + hq_all_financial_statement_notes

---

## OPEN ITEMS — SESSION 261

### P0 — Code
1. Fixed assets "Xmo behind" counter -- still shows wrong count despite all 6 months posted
   - Bug: distinct (period_year, period_month) count vs expected months comparison
2. IFRS BS gap R26,364 -- root cause: IS loss uses depreciation from dep_entries (R19,410)
   but equity_ledger stores RPC net result (-R121,416) which uses journal opex (R342,600 + dep in journals)
   These are different depreciation treatment sources -- needs architectural decision
3. VAT pipeline fix: sync_receipt_to_vat_transactions not triggering on POS orders
   - 0 rows from orders source in vat_transactions
   - Fixes both the BS gap and IFRS BS gap once resolved

### P1 — Owner Actions
- Pay overdue VAT R25,402.82 via SARS eFiling (intentionally left for demo)
- Get real VAT number from Garden Bistro (current: 4987654321 is demo)

### P2 — Remaining Demo Shops
Run FIN-SUITE-RUNBOOK (see new doc) for:
- Medi Recreational (cannabis_retail) -- tenant_id: b1bad266...
- Nourish Kitchen & Deli (food_beverage) -- tenant_id: 944547e3...
- MediCare Dispensary (cannabis_dispensary) -- tenant_id: 8b9cb8e6...
- Metro Hardware (general_retail) -- tenant_id: 57156762... (all sim data)

---

## KNOWN PERMANENT GAPS (document in demo, do not hide)
1. POS VAT pipeline -- output VAT from orders not flowing to vat_transactions
2. BS equation gap R9,140 -- amber banner explains it
3. Wagyu Burger + Lamb Shank sold below cost -- intentional demo story
4. Pricing data source red (0) -- no product_pricing records linked to recipes
5. Cash flow "Opening Cash" shows -- (not yet connected to bank recon)

---

## TENANT ROSTER — FINANCIAL STATE
| Tenant | ID prefix | Wizard | net_profit_for_year | BS Gap | Dep Status |
|---|---|---|---|---|---|
| Garden Bistro | 7d50ea34 | Done | -R121,416.13 | R9,140 (VAT) | All 6mo posted |
| Medi Recreational | b1bad266 | Done | R59,559 | Unknown | Unknown |
| Metro Hardware | 57156762 | Done | R466,228 | Unknown | Unknown |
| MediCare Dispensary | 8b9cb8e6 | Done | R0 | Unknown | Unknown |
| Nourish Kitchen | 944547e3 | Done | R37,448 | Unknown | Unknown |
| Pure Premium | f8ff8d07 | Done | R3,826 | Unknown | Unknown |
