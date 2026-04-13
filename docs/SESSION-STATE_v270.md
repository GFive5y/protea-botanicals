# SESSION-STATE v270 — 14 April 2026 (Session Close)

## Stack
- Repo HEAD: 86eae8e
- Supabase: uvicrqapgzcdvozxrreo
- Garden Bistro tenant: 7d50ea34-9bb2-46da-825a-956d0e4023e1
- Active tenants: 11 (per hq_financial_period rollup)

## What Shipped This Session

### Garden Bistro Audit Fixes (commit 7db98a3)
- T1: Balance Sheet liabilities top-card unified with breakdown source
- T2: Fixed assets cost column corrected, NBV floored at zero
- T3: VAT input tax fallback from expenses when vat_transactions empty
- T4: P&L OpEx double-count removed (journals display-only, not summed)
- T5: Gross margin chart uses actual COGS from order_items
- T6: SKIPPED — "Gross Profit" label correct per IFRS (Revenue - COGS)
- T7: Cash Flow uses get_tenant_orders_for_pl (LL-209 row-cap fix)
- T8: Margin widgets fallback to productMargins when pricing master empty
- T9: Initially deferred (no payment_status column) -> resolved in T10

### Canonical Financial RPCs (commit b6edfb2)
- T10: expenses.payment_status + paid_date + matched_bank_line_id columns added
- T10: tenants.currency added (default ZAR — future-proofed for non-ZAR tenants)
- T10: Backfill — 23 Garden Bistro + 92 Medi Rec expenses marked paid from PAY-* lines
- T9 (revisited): Accrued OpEx now filters .neq("payment_status", "paid")
  Garden Bistro Accrued OpEx: R211,800 -> near zero
- T11: tenant_financial_period(p_tenant_id, p_since, p_until) RPC live
  Garden Bistro 30d: R97,248 rev / R40,157 COGS / R83,700 OpEx / 536 orders
  9 contract invariants pass
- T12: hq_financial_period(p_since, p_until, p_industry_filter) RPC live
  11 tenants, 4 industry groups, R593k platform revenue
  Currency-mixing branch dormant (all ZAR)

### Consumer Migrations
- T13b (commit e529d4e): HQ Top Bar via useIntelStrip.js -> tenant_financial_period
  Revenue MTD tile in HQOverview.js -> tenant_financial_period
  Gross Profit now correctly Revenue - COGS (~R57k vs previous -R45k)
- T14 Phase A+B (commit 86eae8e): P&L side-by-side validation instrumented
  RPC call runs alongside existing queries, comparison logging active
  Full switchover (Phase C) after 24h validation window

### Deferred (with reasons)
- T13 Forecast: needs per-SKU velocity + stock depletion data not in
  tenant_financial_period scope. Future tenant_inventory_velocity RPC required.

## Architectural Position

LL-210 is the headline of this session. The platform now has ONE answer to
"what did this tenant do financially over this period" — and as of T13b/T14,
two of the highest-traffic consumers prove the pattern works.

Migration backlog (post-demo):
  - Cash Flow -> tenant_financial_period
  - Balance Sheet revenue YTD -> tenant_financial_period
  - VAT Returns -> tenant_financial_period (per-period)
  - Forecast -> new tenant_inventory_velocity RPC (separate work)
  - Lint rule: flag direct from('orders'/'expenses') in financial components

## Demo Readiness — 12 May 2026

### Done
- Garden Bistro: financial package internally consistent across all migrated screens
- Medi Rec, MediCare: backbone consistent via shared RPC
- HQ overview: 11 tenants visible with industry rollups
- Tenant comparison + franchise view: data-ready via hq_financial_period

### Open Before Demo
- Metro Hardware: sim-pos-sales trigger from Supabase Studio (owner action)
  Body: {"tenant_id":"57156762-deb8-4721-a1f3-0c6d7c2a67d8","days":30,"orders_per_day":15}
  Re-verify Dashboard, P&L, Daily Trading after trigger.
- T14 Phase C: P&L switchover after 24h validation (no visual change expected)
- Optional polish: Cash Flow + Balance Sheet revenue migrations (low risk)

## Critical Rules (cumulative)
- RULE 0Q: Never push_files or create_or_update_file from Claude.ai
- LL-205: Every new DB table needs hq_all_ RLS bypass policy
- LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id
- LL-207: No tenantId props on HQ child components
- LL-208: Enumerate ALL tables a feature will query before any migration
- LL-209: Never fetch unbounded large table and filter client-side by date
- LL-210 (NEW): Financial aggregations MUST use tenant_financial_period or
  hq_financial_period. No ad-hoc aggregation in components.
- LL-221: Read source file before any edit

## Locked Files (unchanged)
src/components/StockItemModal.js
src/components/ProteaAI.js
src/components/PlatformBar.js
src/services/supabaseClient.js

## Protected Files (unchanged)
src/components/hq/HQStock.js
src/components/hq/LiveFXBar.js

---
*SESSION-STATE v270 — NuAi — 14 April 2026*
*Supersedes v267. Read PLATFORM-OVERVIEW_v1_0.md first — always.*
*Garden Bistro audit closed. Canonical financial RPCs live. LL-210 promoted.*
*Demo: 12 May 2026 (4 weeks).*
