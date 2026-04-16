# SESSION-STATE v291
## NuAi ERP Platform · Session 291 Close State
## 17 April 2026

---

## PLATFORM FACTS

- **Repo:** github.com/GFive5y/protea-botanicals · main
- **Supabase:** uvicrqapgzcdvozxrreo
- **CA Demo:** 12 May 2026
- **Design System:** DS6 — src/styles/tokens.js

---

## LAST COMMITS ON MAIN (SESSION 291)

| SHA | Message |
|---|---|
| 4956d26 | fix(hq-stock): default Items view to active items + 'Show archived' toggle (Phase 0.7) |
| 10d9d39 | fix(stock): tenant scoping on stock_movements + suppliers + purchase_orders (Phase 0.5) |
| db93f26 | fix(stock): component map refinements + header version lineage |
| 38e96da | fix(stock): add tenant_id scoping in fetchAll (Phase 0) |

---

## WHAT SHIPPED THIS SESSION

### Phase 0 — StockControl.js inventory_items tenant scoping (38e96da + db93f26)
`fetchAll()` L322 `.from("inventory_items").eq("is_active", true)` had no
tenant filter. HQ operator LL-205 bypass meant the query returned every
tenant's active items, not just the viewing tenant's. Added
`.eq("tenant_id", tenantId)`. Component maps added to StockControl.js
and HQFoodIngredients.js per Phase 0 gate conditions.

### Phase 0.5 — StockControl.js sibling tenant scoping (10d9d39)
Same file, same `fetchAll()`, three sibling queries in the same
`Promise.all` were also unscoped: `stock_movements`, `suppliers`,
`purchase_orders`. All three had the identical LL-205 leak shape.
Fixed in a single commit. All 4 fetchAll queries now tenant-scoped.
Known debt logged in component map: 2 stock_movements INSERT sites
(L2985, L3351) don't write `tenant_id` — RULE 0F violations deferred
to a dedicated audit pass.

### Phase 0.7 — HQStock.js archived-items UX (4956d26)
Browser verification of Phase 0.5 revealed the original user-visible
bug ("Garden Bistro shows 43 items, 12 archived finished_product
items visible") was actually in HQStock.js, not StockControl.js.
HQStock.js L931 inventory_items query was already tenant-scoped
(correct) but three UI strings and the FoodItems filter base used
`items.length` (43 — includes archived) instead of `activeItems.length`
(31). Default view now active-only; `Show archived (N)` toggle in
filter bar reveals the full set for HQ un-archive workflow.
CannabisItemsView was already correct — unchanged.

---

## ROOT CAUSE NARRATIVE (THE REAL ONE)

NEXT-SESSION-PROMPT_v291 framed the bug as "StockControl.js commit
11015a1 fixed the category filter but screenshots contradict this."
This was a component mis-attribution. The visible screenshot showed
HQStock.js's "ITEMS (43)" tab — a different component rendered below
StockControl's chrome on `/tenant-portal?tab=stock`.

Two separate bugs existed simultaneously:

1. **StockControl.js cross-tenant leak** — real but less visible.
   Garden Bistro's StockControl header already showed 31. The leak
   would have shown up on *other* tenants or in the raw data.
   Fixed in Phase 0 + 0.5.

2. **HQStock.js archived-items visibility** — the actual symptom in
   the bug report. HQStock fetches archived rows by design (HQ needs
   to see them for the Hide/Show toggle) but didn't distinguish
   them in the default view. Fixed in Phase 0.7.

The lesson: when a bug report cites a component, verify which
component the screenshot was taken of *before* forming a diagnosis.
LL-195 (disk-truth) applies to screenshots too.

---

## PHASE 0 GATE CONDITIONS — ALL MET

- [x] FoodWorlds.js on main (fd0cbfd, session 290)
- [x] Session docs on main (85282a2, session 290)
- [x] StockControl.js fetchAll tenant-scoped (38e96da + 10d9d39)
- [x] StockControl.js component map comment block (38e96da, refined in db93f26)
- [x] HQFoodIngredients.js component map comment block (38e96da, refined in db93f26)
- [x] HQStock.js Garden Bistro Items (31) verified in incognito
- [x] HQStock.js Show archived (12) toggle reveals 43 on demand
- [x] Regression clean on Nourish, Metro, MediCare, Medi Recreational
- [x] All changes committed and pushed to main

---

## NEW GOSPEL RULES (LLs) ESTABLISHED SESSION 291

| LL | Rule |
|---|---|
| LL-285 | LL-205 bypass + unscoped SELECT = cross-tenant leak — pair every hq_all_* policy with a tenant-scoping audit |
| LL-286 | Bug-report component attribution is a claim, not a fact — verify which component the screenshot was taken of before diagnosing |

---

## OPEN LOOPS — CARRIED INTO SESSION 292

### LOOP-F&B-001 (Restaurant Stock Core Loop) — UNCHANGED FROM V290
Parts 3-9 still open. No session 291 work touched this loop.

### LOOP-011 — UNCHANGED FROM V290
Owner UI: 20 IFRS sign-offs.

### NEW — LOOP-RULE-0F (RULE 0F INSERT audit)
Two known debt sites in StockControl.js (L2985, L3351) — stock_movements
INSERTs without tenant_id. Bible RULE 0F violations. Likely more across
the codebase. A dedicated grep-and-audit session before demo (ideal) or
post-demo (acceptable) would close this.

### NEW — LOOP-HQ-STOCK-DERIVED-COUNTS
HQStock Overview sub-tab tiles (NO EXPIRY SET, COLD CHAIN, etc.) still
aggregate over `items` rather than `activeItems`. Not user-facing during
demo but inconsistent with the Phase 0.7 approach. Tighten post-demo.

---

## ACTIVE WORK PACKAGE — UPDATED

**WP-TABLE-UNIFY** — DS6 Table Compliance + Smart Catalog Feature Parity
- Phase 0: **CLOSED** (17 Apr 2026, commit 4956d26)
- Phase 1 (DS6 Token Compliance): **READY TO START**
  - Recommended first file: HQFoodIngredients.js
  - StockControl.js and HQStock.js should rest for a session

---

## STANDING ALERTS — UNCHANGED FROM V290

- **11 May 2026:** sim-pos-sales for Metro Hardware + Medi Recreational
- **12 May 2026 09:30:** Pre-demo 8-point audit SQL (LL-251)

---

## DEMO TENANT SUMMARY

| Tenant | Industry | Items | Stock Value |
|---|---|---|---|
| The Garden Bistro | food_beverage | 31 raw ingredients | R12,525 |
| Nourish Kitchen & Deli | food_beverage | 16 raw ingredients | R5,758 |
| Metro Hardware | general_retail | 847 items | R6.49M |
| MediCare Dispensary | cannabis_dispensary | 20 items | R82k |
| Medi Recreational | cannabis_retail | 186 items | R211k |

---
*SESSION-STATE v291 · NuAi · 17 April 2026*
