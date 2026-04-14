# DEMO FIN SUITE RUNBOOK v1.0
## How to fully balance the books on any demo tenant
## Produced from Session 260 -- Garden Bistro audit -- 14 April 2026
## Apply this runbook to every demo shop before the 12 May CA demo

---

## WHAT THIS RUNBOOK DOES

Takes a demo tenant from "wizard=true, some data" to a fully presented financial
package: P&L clean, Balance Sheet with correct equity, IFRS statements populated,
depreciation current, HR suite enriched, all financial tabs accessible.

Estimated time per tenant: 45 minutes (20 min SQL, 25 min UI clicks)

---

## PHASE 1 — AUDIT FIRST (run SQL, report numbers, do not change anything yet)

Replace TENANT_ID with the tenant's UUID.

```sql
-- A1: Equity ledger state
SELECT financial_year, share_capital, opening_retained_earnings,
  net_profit_for_year, year_end_closed
FROM equity_ledger WHERE tenant_id = 'TENANT_ID';

-- A2: Depreciation posted
SELECT period_month, period_year, COUNT(*) as entries, SUM(depreciation) as charge
FROM depreciation_entries WHERE tenant_id = 'TENANT_ID'
GROUP BY period_year, period_month ORDER BY period_year, period_month;

-- A3: Fixed assets on register
SELECT asset_name, purchase_cost, accumulated_depreciation, net_book_value,
  useful_life_years FROM fixed_assets WHERE tenant_id = 'TENANT_ID' AND is_active = true;

-- A4: VAT pipeline
SELECT source_table, COUNT(*) as rows, SUM(output_vat) as output, SUM(input_vat) as input
FROM vat_transactions WHERE tenant_id = 'TENANT_ID' GROUP BY source_table;

-- A5: Bank closing balance
SELECT ba.account_name, bsl.balance, bsl.statement_date
FROM bank_statement_lines bsl
JOIN bank_accounts ba ON ba.id = bsl.bank_account_id
WHERE ba.tenant_id = 'TENANT_ID' ORDER BY bsl.statement_date DESC LIMIT 1;

-- A6: Inventory value
SELECT COUNT(*) as skus, SUM(quantity_on_hand * weighted_avg_cost) as value
FROM inventory_items WHERE tenant_id = 'TENANT_ID' AND is_active = true;

-- A7: RPC call for correct P&L
SELECT * FROM tenant_financial_period(
  'TENANT_ID'::uuid,
  '2026-01-01T00:00:00+00:00'::timestamptz,
  '2026-12-31T23:59:59+00:00'::timestamptz
);

-- A8: Staff profiles
SELECT full_name, job_title, employment_start_date, status
FROM staff_profiles WHERE tenant_id = 'TENANT_ID';

-- A9: Contracts
SELECT sp.full_name, ec.gross_salary_zar, ec.is_active
FROM employment_contracts ec
JOIN staff_profiles sp ON sp.id = ec.staff_profile_id
WHERE sp.tenant_id = 'TENANT_ID';

-- A10: Check financial_statement_notes table exists
SELECT COUNT(*) FROM financial_statement_notes WHERE tenant_id = 'TENANT_ID';
```

After running, produce a mini-audit report:
- net_profit stored vs RPC calculation -- match or gap?
- Depreciation months posted vs expected
- POS orders in VAT pipeline: YES/NO
- Staff count and contract status

---

## PHASE 2 — FIX EQUITY LEDGER

The most common issue: net_profit_for_year is stale.

Calculate correct figure from A7:
net_profit = A7.revenue.ex_vat - A7.cogs.actual - (A7.opex.total OR A7.opex.paid)

Update:
```sql
UPDATE equity_ledger
SET net_profit_for_year = [calculated figure], updated_at = now()
WHERE tenant_id = 'TENANT_ID' AND financial_year = 'FY2026';

-- Verify
SELECT net_profit_for_year FROM equity_ledger WHERE tenant_id = 'TENANT_ID';
```

---

## PHASE 3 — DEPRECIATION

If fixed assets exist (A3 returns rows):

**Step 3a** -- Check which months are missing:
Expected months = every month from asset purchase_date to current month inclusive.
Posted months = distinct (period_year, period_month) from A2.

**Step 3b** -- Post missing months via UI:
Go to tenant portal -> Fixed Assets tab -> Run Depreciation button.
Select each missing month in order (oldest first). Click Run for each.

IMPORTANT: Do NOT skip months. Post in chronological order:
Nov 2025 -> Dec 2025 -> Jan 2026 -> Feb 2026 -> Mar 2026 -> Apr 2026

**Step 3c** -- Verify after posting:
```sql
SELECT SUM(depreciation), COUNT(*) FROM depreciation_entries WHERE tenant_id = 'TENANT_ID';
```

If no fixed assets: skip Phase 3.

---

## PHASE 4 — RECALCULATE P&L BUTTON

After depreciation is posted, net_profit may be stale again.
Go to: /hq?tab=tenants -> [Tenant] -> MANAGE -> Recalculate P&L

This calls tenant_financial_period RPC with full calendar year and writes
the result to equity_ledger.net_profit_for_year.

Then verify Balance Sheet operational gap:
Gap = Total Assets - (Total Liabilities + Total Equity)
If gap is approximately R9,140 -> VAT pipeline bug (expected, note it with amber banner)
If gap >> R9,140 -> equity not updated, repeat this step

---

## PHASE 5 — HR SUITE ENRICHMENT

**Check what exists first (A8, A9).** Only seed what is missing.

### Staff profiles minimum for a demo:
- Food & Beverage: Head Chef, Sous Chef, Floor Manager, Waitstaff
- Cannabis Retail: Store Manager, Budtender x2, Cashier
- General Retail: Store Manager, Sales Assistant x2, Stockroom
- Dispensary: Pharmacist, Dispensary Assistant, Receptionist

### For each staff member, ensure:

```sql
-- Employment contract (check A9 first -- insert only if missing)
INSERT INTO employment_contracts (
  id, staff_profile_id, tenant_id, contract_type, start_date,
  gross_salary_zar, salary_frequency, notice_period_days,
  is_active, standard_hours_per_day, standard_days_per_week, created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM staff_profiles WHERE tenant_id = 'TENANT_ID' AND full_name = 'NAME'),
  'TENANT_ID', 'permanent', '2026-01-01',
  [salary], 'monthly', 30, true, 8, 5, now()
);

-- Leave balance (BCEA: 15 days annual leave)
-- NOTE: 'available' is a generated column — do not include it in INSERT
INSERT INTO leave_balances (
  id, staff_profile_id, tenant_id, leave_type_id,
  cycle_start, cycle_end, opening_balance, accrued, used, pending, carried_over, forfeited
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM staff_profiles WHERE tenant_id = 'TENANT_ID' AND full_name = 'NAME'),
  'TENANT_ID',
  (SELECT id FROM leave_types WHERE tenant_id = 'TENANT_ID' LIMIT 1),
  '2026-01-01', '2026-12-31', 15, 5, 0, 0, 0, 0
);

-- Timesheet (March 2026 approved)
-- NOTE: status must be one of: draft, staff_submitted, admin_approved, admin_rejected, hr_approved, locked
INSERT INTO timesheets (
  staff_profile_id, tenant_id, period_start, period_end,
  status, total_hours, regular_hours
) VALUES (
  (SELECT id FROM staff_profiles WHERE tenant_id = 'TENANT_ID' AND full_name = 'NAME'),
  'TENANT_ID', '2026-03-01', '2026-03-31',
  'hr_approved', 176, 176
);
```

### Demo leave request (1 per tenant -- makes Leave tab non-empty):
```sql
INSERT INTO leave_requests (
  staff_profile_id, tenant_id, leave_type_id,
  start_date, end_date, days_requested, status, reason
) VALUES (
  (SELECT id FROM staff_profiles WHERE tenant_id = 'TENANT_ID' ORDER BY created_at LIMIT 1),
  'TENANT_ID',
  (SELECT id FROM leave_types WHERE tenant_id = 'TENANT_ID' LIMIT 1),
  '2026-05-05', '2026-05-09', 5, 'approved', 'Annual family leave'
);
```

### Verify HR completeness:
```sql
SELECT sp.full_name,
  (SELECT COUNT(*) FROM employment_contracts ec WHERE ec.staff_profile_id = sp.id AND ec.is_active = true) AS contracts,
  (SELECT COUNT(*) FROM leave_balances lb WHERE lb.staff_profile_id = sp.id) AS leave_balances,
  (SELECT COUNT(*) FROM timesheets t WHERE t.staff_profile_id = sp.id) AS timesheets
FROM staff_profiles sp WHERE sp.tenant_id = 'TENANT_ID';
```
Every row must show contracts >= 1, leave_balances >= 1, timesheets >= 1.

---

## PHASE 6 — FINANCIAL SETUP WIZARD

Ensure wizard is complete for the tenant.
Go to: /hq?tab=tenants -> [Tenant] -> MANAGE -> Financial Setup button should show "Done" (green).

If not done: click MANAGE -> Financial Setup -> complete 5 sections:
1. Business details (name, reg number, address)
2. VAT (registration number, filing frequency -- use demo VAT number if real not available)
3. Financial year (FY2026, Jan-Dec)
4. Auditor (use "Smith & Associates CA(SA)" as demo)
5. Equity (share capital -- use realistic amount for industry)

After wizard completes, equity_ledger row is created. Then run Phase 4.

---

## PHASE 7 — VERIFY FINANCIAL TABS ACCESSIBLE

Open each tenant portal and confirm all financial tabs are present and load:

**For food_beverage tenants:**
Financials section must show: P&L -- Expenses -- Invoices -- Journals -- VAT -- Bank Recon --
Balance Sheet -- Forecast -- Year-End Close -- Fixed Assets -- IFRS Statements --
Financial Notes -- Chart of Accounts

**For cannabis_retail tenants:**
Reports section must show: P&L -- Expenses -- Analytics -- Reorder -- Balance Sheet --
Costing -- Forecast -- Year-End Close -- Journals -- VAT -- Bank Recon -- Fixed Assets --
IFRS Statements -- Financial Notes -- Chart of Accounts

**For cannabis_dispensary tenants:**
Financials section must show: P&L -- Expenses -- Invoices -- Journals -- VAT --
Bank Recon -- Balance Sheet -- Forecast -- Year-End Close -- Financial Notes -- Chart of Accounts

**For general_retail tenants:**
Intelligence section must show: P&L -- Expenses -- Analytics -- Reorder -- Balance Sheet --
Fixed Assets -- IFRS Statements -- Journals -- VAT -- Bank Recon -- Forecast -- Year-End Close --
Financial Notes -- Chart of Accounts

If any tab shows "coming soon" or blank: check renderTab switch in TenantPortal.js.

---

## KNOWN PERMANENT GAPS — DO NOT TRY TO FIX

These affect every tenant until the underlying bugs are resolved:

| Gap | Root cause | Demo treatment |
|---|---|---|
| BS equation gap ~R9,140 | POS VAT not in vat_transactions | Amber banner -- explain honestly |
| Pricing data source red | No product_pricing records linked to recipes | Leave red -- it's honest |
| Cash flow Opening Cash shows -- | Not connected to bank recon | Footer note already there |
| Fixed assets "Xmo behind" counter | Display bug in month counting | Known issue -- Session 261 |
| IFRS BS gap | Depreciation source mismatch between IS and equity_ledger | CA prep note |

---

## BALANCE SHEET EQUATION — HOW IT SHOULD LOOK

After all phases complete:

```
ASSETS
  Inventory (AVCO):              from inventory_items
  Cash at Bank:                  from bank_statement_lines closing balance
  PPE NBV:                       from fixed_assets (post all depreciation first)
  TOTAL ASSETS:                  sum above

LIABILITIES
  VAT Payable:                   from vat_transactions (output - input)
  TOTAL LIABILITIES:             above

EQUITY
  Share Capital:                 from equity_ledger.share_capital
  Retained Earnings Opening:     from equity_ledger.opening_retained_earnings
  Current Year P/L:              from equity_ledger.net_profit_for_year (after Phase 4)
  TOTAL EQUITY:                  sum above

CHECK:
  Assets - (Liabilities + Equity) should be approximately R9,140 (VAT pipeline gap only)
  If gap > R20,000: equity_ledger.net_profit_for_year is stale -- repeat Phase 4
```

---

## QUICK REFERENCE — TENANT IDs

| Tenant | tenant_id | Industry | Priority |
|---|---|---|---|
| The Garden Bistro | 7d50ea34-9bb2-46da-825a-956d0e4023e1 | food_beverage | DONE |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | cannabis_retail | Session 261 |
| Nourish Kitchen & Deli | 944547e3-ce9f-44e0-a284-43ebe1ed898f | food_beverage | Session 261 |
| MediCare Dispensary | 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b | cannabis_dispensary | Session 261 |
| Metro Hardware (Pty) Ltd | 57156762-deb8-4721-a1f3-0c6d7c2a67d8 | general_retail | Session 261 (sim data only) |
| Pure Premium THC Vapes | f8ff8d07-7688-44a7-8714-5941ab4ceaa5 | cannabis_retail | Not VAT registered |

---

## SESSION 260 LESSONS LEARNED

1. **Always audit before fixing.** The A1-A10 queries took 5 minutes and found the
   equity_ledger variance before any code was written. Run the audit script first.

2. **equity_ledger.net_profit_for_year is the source of truth for the BS equity section.**
   The live RPC belongs on the P&L. The ledger belongs on the Balance Sheet.
   The Recalculate button must use full calendar year bounds and opex.total.

3. **Depreciation must be posted before Recalculate P&L.**
   If you recalculate first then post depreciation, the ledger goes stale again.
   Order: Post depreciation -> Recalculate P&L -> verify BS gap.

4. **The VAT pipeline gap (~R9,140) is structural, not a bug to chase.**
   POS output VAT is not flowing to vat_transactions. The gap is the accumulated
   output VAT from orders that should be there but isn't. Document it, don't hide it.

5. **IFRS notes and the IS must use the same RPC call with identical period bounds.**
   Use timezone-aware ISO strings via new Date(year,month,day).toISOString().
   Any deviation causes figure mismatches across statements.

6. **Run depreciation month by month in chronological order.**
   The "Run Depreciation" modal skips months already posted. It does NOT backfill gaps.
   You must manually select Nov 2025, Dec 2025, Jan, Feb, Mar, Apr in sequence.

7. **HQChartOfAccounts is now a standalone component.**
   Import from ../components/hq/HQChartOfAccounts in both HQDashboard.js and TenantPortal.js.
   It uses useTenant() -- no props needed. Do not inline COA logic again.

8. **financial_statement_notes table now exists.**
   Notes 2, 6, 13, 14 are editable inline. Notes 1,3,4,5,7,8,9,10,11,12,15 are auto-generated.
   Schema: (id, tenant_id, financial_year, note_number, content, updated_at).
   RLS: tenant_own_notes + hq_all_financial_statement_notes.

---
*DEMO-FIN-SUITE-RUNBOOK v1.0 -- Produced from Session 260 -- Garden Bistro audit*
