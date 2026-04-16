# SESSION-STATE v290
## NuAi ERP Platform · Session 290 Close State
## 17 April 2026

---

## PLATFORM FACTS (never change these)

- **Repo:** github.com/GFive5y/protea-botanicals · main
- **Supabase:** uvicrqapgzcdvozxrreo
- **CA Demo:** 12 May 2026
- **Design System:** DS6 — src/styles/tokens.js

---

## LAST COMMIT ON MAIN

| SHA | Message |
|---|---|
| fd0cbfd | feat(fnb): add FoodWorlds.js — 8 ingredient worlds (LL-278) |
| d60af58 | docs(S288): add DEEP-ANALYSIS-PROTOCOL + ANALYSIS-FNB-STOCK |
| 11015a1 | fix(stock): category filter, fetchAll guard, writeAlert LL-206 |
| fb92667 | fix(hq-stock): move useMemo KPI hooks before early returns (LL-127) |

---

## ACTIVE WORK PACKAGE

**WP-TABLE-UNIFY** — DS6 Table Compliance + Smart Catalog Feature Parity
- Status: **PLANNING** — PMP written, no code started
- Phase 0 is the first Claude Code task for session 291

---

## OPEN LOOPS

### LOOP-F&B-001 (Restaurant Stock Core Loop)

| Part | Status | Notes |
|---|---|---|
| Part 1: Garden Bistro data model | CLOSED | 31 raw_material ingredients, all subcategorised |
| Part 2: Nourish Kitchen data model | CLOSED | 16 raw_material ingredients, all subcategorised |
| Part 3: POS — ingredient deduction | OPEN | POSScreen.js: on dish sale, lookup food_recipe — insert production_out per BOM line |
| Part 4: MenuCapabilityWidget | OPEN | React component calling get_menu_capability RPC + Realtime subscription |
| Part 5: Live AVCO in HQRecipeEngine | OPEN | Wire inventory_item_id — weighted_avg_cost for cost per portion |
| Parts 6-9 | Phase 2 | Waste log, 86 alert, AI menu narrative, actual vs theoretical |

**DB function `get_menu_capability(p_tenant_id UUID) -> JSONB` is LIVE in Supabase.**

### LOOP-011

OPEN — Owner UI: 20 IFRS sign-offs (5 tenants x 4 statements)

---

## CURRENT F&B DATA STATE

### Garden Bistro (7d50ea34-9bb2-46da-825a-956d0e4023e1)
- 31 active raw_material ingredients
- All 31 have subcategory set (19 distinct subcategories)
- 6 approved recipes, 98 BOM lines, all 98 linked to inventory_item_id
- Stock value: R12,090

### Nourish Kitchen & Deli (944547e3-ce9f-44e0-a284-43ebe1ed898f)
- 16 active raw_material ingredients
- 6 approved recipes
- Stock value: R5,758.50

---

## DB MIGRATIONS APPLIED THIS SESSION (17 April 2026)

1. `add_inventory_item_id_to_food_recipe_lines` — added inventory_item_id UUID FK + index
2. `add_tenant_id_to_comms_tables` — tenant_id on support_tickets + customer_messages + RLS
3. `add_is_drill_to_recall_events` — is_drill BOOLEAN DEFAULT false
4. `add_format_key_alias_to_product_formats` — format_key TEXT GENERATED AS (key) STORED
5. `create_get_menu_capability_function` — Live Menu Intelligence PostgreSQL RPC function (v2)

---

## NEW GOSPEL RULES (LLs) ESTABLISHED SESSION 290

| LL | Rule |
|---|---|
| LL-275 | F&B stock model — raw_material category only; dishes in food_recipes |
| LL-276 | StockControl category filter must use .eq('is_active', true), never .in('category',...) |
| LL-277 | subcategory is the F&B ingredient group driver (21-taxonomy) — never null for F&B |
| LL-278 | FoodWorlds.js is single source of truth for F&B worlds (parallel to ProductWorlds.js) |
| LL-279 | get_menu_capability(p_tenant_id) RPC is the Live Menu Intelligence engine |
| LL-280 | Live Menu Intelligence build order: (1) POS-production_out, (2) MenuCapabilityWidget+Realtime, (3) AI narrative |
| LL-281 | All data-rich table surfaces must reach SmartInventory.js feature parity (SC-01 through SC-15) |
| LL-282 | isFoodBev guards are mandatory in shared components |
| LL-283 | F&B CATEGORY column must show FNB_SUBCATEGORY_ICONS[item.subcategory] |
| LL-284 | DS6 table row heights: single-line = 44px, two-line = 56px, three-line = 72px max |

---

## DEMO TENANT SUMMARY

| Tenant | Industry | Items | Stock Value |
|---|---|---|---|
| The Garden Bistro | food_beverage | 31 raw ingredients | R12,090 |
| Nourish Kitchen & Deli | food_beverage | 16 raw ingredients | R5,758 |
| Metro Hardware | general_retail | 847 items | R6.49M |
| MediCare Dispensary | cannabis_dispensary | 20 items | R82k |
| Medi Recreational | cannabis_retail | 186 items | R211k |

---

## STANDING ALERTS

- **11 May 2026:** sim-pos-sales for Metro Hardware + Medi Recreational
- **12 May 2026 09:30:** Pre-demo 8-point audit SQL (LL-251)

---
*SESSION-STATE v290 · NuAi · 17 April 2026*
