# Tenant Audit Runbook v2.0
## NuAi Demo Audit — Standard Operating Procedure
## Produced 13 April 2026 from WP-DEMO-AUDIT retrospective
## Run this in full, in order, for EVERY tenant. No skipping phases.

---

## PHASE 0 — Git Sync + Code Audit Gate (5 min)

```bash
git pull origin main
python3 docs/audit_tenant_isolation.py
```

**GATE: Must exit 0 before proceeding.**

---

## PHASE 1 — Profile Navigation Check (2 min)

| Profile | Required nav | Forbidden nav |
|---|---|---|
| cannabis_dispensary | Dashboard, Clinical, Inventory, Financials, Operations, People | Batch Management, Receiving GMP |
| cannabis_retail | Dashboard, Shop, Stock, Financials, Loyalty, People | Medical Records, CSR |
| food_beverage | Dashboard, Kitchen, Stock, HACCP, Nutrition, Financials, People | Medical Records, Batch Management |
| general_retail | Dashboard, Stock, Financials, People | All above |

---

## PHASE 2 — Data Pre-flight SQL (10 min)

Paste from docs/PREFLIGHT-SQL.md. Every MUST_BE_0 row returns 0.

---

## PHASE 3 — DB Truth Verification (5 min)

```sql
SELECT
  COUNT(*) AS items_total,
  SUM(CASE WHEN quantity_on_hand > 0 THEN 1 ELSE 0 END) AS items_in_stock,
  SUM(quantity_on_hand * weighted_avg_cost) AS stock_value_zar,
  AVG((sell_price - weighted_avg_cost) / sell_price * 100) AS avg_margin_pct
FROM inventory_items
WHERE tenant_id = 'TENANT_ID' AND is_active = true AND sell_price > 0;
```

---

## PHASE 4 — Visual Verify (20 min)

Every number on screen must match DB truth. If not, fix the query.

---

## PHASE 5 — Commit (5 min)

```bash
git add -A
git commit -m "audit(TENANT): runbook v2 complete — all phases pass"
git push origin main
```

---

## TENANT STATUS

| Tenant | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|---|---|---|---|---|---|---|
| MediCare Dispensary | PASS | PASS | PASS | PASS | PASS | PASS |
| Metro Hardware | PASS | PASS | PASS | PASS | PASS | PASS |
| Medi Recreational | PASS | PASS | PASS | PASS | PASS | PASS |
| Garden Bistro | PASS | PASS | PASS | PASS | PASS | PASS |

## KNOWN ISSUES (from pre-flight SQL 13 Apr 2026)

| Tenant | Issue | Fix |
|---|---|---|
| Metro Hardware | 398 items avco=0 | UPDATE weighted_avg_cost = sell_price*0.40 |
| Medi Recreational | 172 items avco=0, 5 sell=0 | Fix AVCO + set prices |
| Garden Bistro | 12 items avco=0 | UPDATE weighted_avg_cost = sell_price*0.35 |

---
## Metro Hardware — Phase 4 Complete (HEAD 88a8fe9)

Demo-path bleed check: CLEAN
Hook-level check: CLEAN
Pre-existing codebase bleeds: ~90 (mutation handlers + sub-components)
Classification: not demo-blocking
Action: WP-TENANT-ISOLATION post-demo backlog

useHQIntelStrip.js false positive: uses .in("tenant_id", tids) — audit script
only checks .eq("tenant_id") and misses the cross-tenant .in() pattern.

---

## Medi Recreational — Phase 4 Complete (14 April 2026)

Demo-path bleed check: CLEAN
Hook-level check: CLEAN
HQPricing.js: fixed in a3a483a (product_cogs/product_pricing tenant filter)
Shell orders: 182 cancelled (R202k phantom revenue removed)
Real orders: 1,758 paid with complete order_items

DB truth verified:
  Items: 186 | Stock Value: R211,272 | Margin: 60.5%
  In stock: 185 (1 OOS = Bubble Hash) | Below reorder: 6

---

## COHERENCE FAILURE DISCOVERY — 14 April 2026

Shell orders (orders with no order_items) were found across all demo tenants.
They produce revenue on Dashboard and P&L but have no inventory impact,
no top sellers, no stock movements. Classic phantom data.

**Root cause:** An older POS simulation mechanism created order headers
without order_items. The v2.0 sim-pos-sales function does NOT create these.
The v3.0 function is now parameterized and creates complete records.

**Scale:**
- Metro Hardware: 786 cancelled (had R3.57M phantom revenue — ALL data was phantom)
- Garden Bistro: 390 cancelled (R125k phantom revenue on top of R707k real)
- Medi Recreational: 182 cancelled (R202k phantom on top of R1.75M real)

**Metro Hardware trading data is now R0** — real orders = 0.
Metro needs sim-pos-sales v3.0 triggered before demo.

**New Layer 3 coherence checks** now in docs/PREFLIGHT-SQL.md:
1. Shell order count (MUST BE 0)
2. Today vs 30d average spike detector (flag if > 3x)
3. Orphaned sale movements

## METRO HARDWARE — OUTSTANDING ACTION

Metro Hardware has:
- Nav fixed (GENERAL_RETAIL_WATERFALL)
- Isolation clean (all bleeds fixed)
- AVCO set on 847 items
- **0 real orders** — trading data entirely missing
- **Dashboard, P&L, IFRS will show R0** until sim runs

Required action (CANNOT be done from Claude Code):
1. Open Supabase Studio > Edge Functions > sim-pos-sales > Invoke
2. Body: `{"tenant_id": "57156762-deb8-4721-a1f3-0c6d7c2a67d8", "days": 30, "orders_per_day": 15}`
3. Wait for success response
4. Re-run Layer 3 coherence check to confirm shell_orders = 0
5. Hard refresh Metro Hardware portal
6. Re-verify Dashboard, Daily Trading, P&L tiles against new numbers

---

## GARDEN BISTRO — COMPLETE (14 April 2026)

P&L Revenue R0 bug — RESOLVED

Root cause: PostgREST 1000-row cap silencing client-side period filter.
Fix (commit 315accd): RPC now accepts p_since/p_until parameters and filters at DB level.

Verified live numbers:
- Revenue MTD: R38,043 | Revenue 30d: R97,587
- Gross Profit: R57,290 | Gross Margin: 58.7%
- Food Cost %: 41.3% (above 30% target — normal for bistro)
- Net Loss: -R220,690 (OpEx: wages R65k + rent R45k + depreciation R60k)

CRITICAL NOTE added to Phase 4:
Before assuming RLS or auth issues, add console.log to the component and check
the actual data returned. PostgREST caps at 1000 rows by default — if a table
has more than 1000 rows, client-side period filters will silently return wrong data.
