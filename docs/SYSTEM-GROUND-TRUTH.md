# SYSTEM-GROUND-TRUTH.md
## NuAi -- Generated from live DB -- 14 April 2026
## OVERWRITE this file at end of every session -- never append
## Run: python3 docs/update_ground_truth.py

---

## QUICK ORIENTATION

- 6 active tenants, 5 inactive
- 4 wizard complete, 2 incomplete (Nourish Kitchen, Pure Premium)
- All tenants: equity_ledger.net_profit_for_year = NULL (known systemic bug)
- All tenants: 0 vat_transactions from orders source (POS VAT pipeline broken)
- Garden Bistro vat_number is an email address (data entry error)

## ACTIVE TENANT ROSTER

| Tenant | ID (short) | Industry | Wizard | COA | Admin | Orders | Revenue | Last Order | Issues |
|---|---|---|---|---|---|---|---|---|---|
| The Garden Bistro | 7d50ea34... | food_beverage | Y | 40 | **NONE** | 3,388 | R707,260 | 2026-04-10 | VAT# IS EMAIL |
| Medi Recreational | b1bad266... | cannabis_retail | Y | 40 | **NONE** | 1,758 | R1,753,455 | 2026-04-07 | |
| Metro Hardware (Pty) Ltd | 57156762... | general_retail | Y | 40 | johan@metro-hardware.co.za | 435 | R1,003,589 | 2026-04-13 | |
| Nourish Kitchen & Deli | 944547e3... | food_beverage | N | 40 | **NONE** | 240 | R43,065 | 2026-04-10 | Setup incomplete |
| Pure Premium THC Vapes | f8ff8d07... | cannabis_retail | N | 40 | admin@protea.dev | 10 | R4,000 | 2026-03-23 | Setup incomplete |
| MediCare Dispensary | 8b9cb8e6... | cannabis_dispensary | Y | 40 | jane@jane.co.za | 0 | R0 | - | No orders (dispensing_log only) |

## INACTIVE TENANTS

| Tenant | ID (short) | Industry | Notes |
|---|---|---|---|
| Maxi Retail SA | 9766a3af... | general_retail | 232 orders, R186,716 revenue |
| Vozel Vapes | 388fe654... | general_retail | FY start = 'March' (format bug) |
| Test Dispensary CT | 064adbdc... | cannabis_retail | 0 COA accounts |
| Medi Can Dispensary | 2bd41eb7... | cannabis_dispensary | Seed tenant, R0 share capital |
| TEST SHOP | 4a6c7d5c... | cannabis_retail | No tenant_config, 0 COA |

## HQ OPERATOR

- User: c64cda97 (fivazg@gmail.com) -- hq_access: true
- Tenant: Nu Ai HQ (43b34c33) -- industry_profile: operator

## KNOWN PLATFORM-WIDE BUGS

1. **equity_ledger.net_profit_for_year = NULL for ALL tenants**
   Balance sheets do not close. Wizard writes share_capital but never net_profit_for_year.
   Needs trigger or scheduled function to auto-populate from tenant_financial_period RPC.

2. **POS sales VAT not flowing to vat_transactions**
   0 rows with source_table='orders'. sync_receipt_to_vat_transactions EF exists but
   is not triggered by POS orders. Balance sheet VAT liability severely understated.

3. **Garden Bistro vat_number = 'accounts@smithassoc.co.za'**
   Email pasted into VAT number field during setup. Will fail SARS eFiling.

4. **sim-pos-sales Metro Hardware: cancelled orders not tagged**
   106 cancelled orders from 14 Apr run have notes=NULL. Wipe needs extra WHERE clause.

5. **Cash flow component shows inconsistent order counts**
   Period boundaries still slightly off vs P&L for some selectors.

6. **Vozel Vapes financial_year_start = 'March' (literal word)**
   Should be 'MM-DD' format like '03-01'. Will cause RPC parsing failure.

## FINANCIAL BASELINES (from tenant_financial_period RPC, last 30 days)

| Tenant | Revenue (ex-VAT) | COGS | OpEx | Net | Orders |
|---|---|---|---|---|---|
| Garden Bistro | R96,726 | R40,157 | R83,700 | -R27,131 | 533 |
| Medi Recreational | ~R175k | ~R70k | ~R61k | ~R44k | ~180 |
| Metro Hardware | ~R100k | ~R40k | ~R96k | -R36k | ~435 |
| Nourish Kitchen | ~R4k | ~R2k | ~R0 | ~R2k | ~24 |
| MediCare Dispensary | R0 (dispensing_log) | - | ~R150k | - | 0 |

## OUTSTANDING FROM LAST SESSION

- Run Nourish Kitchen Financial Setup Wizard
- Get real VAT number from Garden Bistro owner
- Smoke test Suites A+B as runnable scripts (session 260)
- Investigate POS VAT pipeline (sync_receipt_to_vat_transactions)
- equity_ledger.net_profit_for_year auto-population
- WP-TENANT-MANAGEMENT Phase 1 DB migration
- Metro Hardware full dry-run walkthrough
- Garden Bistro demo dry-run (60-90 min, owner-led)
- Update smoke test spec with correct table names
- T14 Phase C: P&L full switchover after validation

---
*Generated 14 April 2026 -- NuAi -- Run update_ground_truth.py to refresh*
