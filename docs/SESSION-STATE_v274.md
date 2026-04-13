# SESSION-STATE v274 — 14 April 2026 (Session Close)

## Stack
- Repo HEAD: f35afec
- Supabase: uvicrqapgzcdvozxrreo
- Garden Bistro tenant: 7d50ea34-9bb2-46da-825a-956d0e4023e1
- Active tenants: 12 (5 with COA + financial setup, 7 incomplete)

## Session Headline

The longest single audit session in the build. Five rounds of audit on Garden Bistro
financial package. 29 named tasks (T1-T29), ~50+ bugs surfaced and closed, two
canonical RPCs deployed, two new LL rules promoted, and one platform-wide data
gap discovered and remediated.

The financial package transitioned from 'every screen tells a different story' to
'internally consistent within R4,375 (0.7% of total assets)' for Garden Bistro --
demo-ready for 12 May.

## What Shipped

### Audit Round 1 -- Garden Bistro fixes (commit 7db98a3)
T1: Balance Sheet liabilities top-card unified
T2: Fixed assets cost column corrected, NBV floor
T3: VAT input tax fallback from expenses
T4: P&L OpEx double-count removed
T5: Gross margin chart actual COGS
T6: SKIPPED (label was correct per IFRS)
T7: Cash Flow uses get_tenant_orders_for_pl
T8: Margin widgets fallback to productMargins

### Architecture -- Canonical RPCs (commit b6edfb2)
T9 (revisited): Accrued OpEx filter
T10: expenses.payment_status + paid_date + matched_bank_line_id columns
T10: tenants.currency column (default ZAR, future-proofed)
T10: Backfill 23 + 92 expenses across Garden Bistro and Medi Rec
T11: tenant_financial_period RPC live (9 contract invariants pass)
T12: hq_financial_period RPC live (cross-tenant rollup, currency-mixing dormant)

### Consumer Migrations (commits e529d4e, dafdd4e, f35afec)
T13b: HQ Top Bar via useIntelStrip.js + HQOverview Revenue MTD
T14: P&L Waterfall (side-by-side validation pattern)
T15: ProteaAI suggestion strip removed (redundant noise)
T16: Balance Sheet Total Assets unified
T17: Cash Flow migrated to RPC
T18: DEFERRED -- VAT periodisation (resolved by T23)
T19: F&B industry labels suppressed when actual COGS available
T20: Channel Margin widget fallback
T21: Equity calc via tenant_financial_period
T22: Cash Flow period mapping fixes
T23: tenant_vat_periods proper bi-monthly bucketing
T24: Top bar field reordering (GP next to revenue/COGS, not OpEx)
T25: Equity label corrected
T26: VAT output VAT corrected at source
T27: Cash Flow boundary fixes
T28: AR/AP industry-aware empty states

### Critical Discovery -- COA Seeding Gap
Discovered 14 Apr 2026 mid-session: 4 of 5 'financial_setup_complete=true' tenants
had ZERO chart_of_accounts rows. Only Medi Recreational was correctly seeded.

The Financial Setup Wizard does NOT seed the COA. Wizard runs successfully on
empty inputs (zero share_capital, zero opening_retained_earnings) without warning.
This is a 'ghost build' -- feature marked complete but doesn't satisfy downstream
contracts.

## Garden Bistro Final State (14 Apr 2026)

Accounting equation:
  Total Assets:     R621,430.00
  Total Liabilities: R  4,591.28
  Total Equity:     R621,213.39
  L + E:            R625,804.67
  Difference:       R  4,374.67 (0.7% -- demo-tolerant)

## New LL Rules Promoted

LL-209: PostgREST row cap (from earlier session)
LL-210: Single-source financial aggregation via tenant_financial_period
LL-244: Tenant onboarding completeness (was LL-211 in spec, renumbered)
LL-245: Feature scoping dependency map (was LL-212 in spec, renumbered)

## Outstanding Items

### Pre-demo (12 May 2026)
- Metro Hardware sim-pos-sales trigger from Supabase Studio (owner action)
- Garden Bistro full dry-run walkthrough (60-90 min, owner-led)
- Verify other 4 tenants don't have similar COA/equity gaps surfacing in screens

### Post-demo backlog
- Financial Setup Wizard: 3 known product bugs
- Cash Flow This Year slight off vs P&L (period boundary edge case)
- VAT module full migration to RPC
- Balance Sheet revenue YTD migration to canonical RPC
- Forecast widget: needs separate tenant_inventory_velocity RPC
- 6 incomplete tenants: COA seeding + financial setup
- Industry profile config table for COGS estimate row labels

## Critical Rules (cumulative)
RULE 0Q, LL-205, 206, 207, 208, 209, 210, 221, 244 (NEW), 245 (NEW)

## Locked / Protected Files (unchanged)
LOCKED: StockItemModal.js, ProteaAI.js, PlatformBar.js, supabaseClient.js
PROTECTED: HQStock.js, LiveFXBar.js

---
*SESSION-STATE v274 -- NuAi -- 14 April 2026*
*Supersedes v270. Garden Bistro audit closed. LL-244 + LL-245 promoted.*
*Demo: 12 May 2026 (4 weeks). Metro Hardware + dry-run remaining.*
