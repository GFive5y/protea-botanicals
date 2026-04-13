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
| Metro Hardware | pending | | | | | |
| Medi Recreational | pending | | | | | |
| Garden Bistro | pending | | | | | |

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
