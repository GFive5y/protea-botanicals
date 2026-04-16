# WP-TABLE-UNIFY v1.0
## DS6 Table Compliance + Smart Catalog Feature Parity
## Gospel document — produced 17 April 2026
## Status: PLANNING — Phase 0 is the next Claude Code task

---

## WHAT THIS WORK PACKAGE IS

WP-TABLE-UNIFY addresses three simultaneous defects visible in screenshots taken 17 April 2026:

1. **DS6 Non-compliance** — All data-rich tables in the platform predate the WP-DS-1 design token system. They carry inline colour values, hardcoded font-weights, integer border-radius values, and padding that is not derived from src/styles/tokens.js T tokens.

2. **Smart Catalog Feature Gap** — SmartInventory.js contains 15+ features (tile view, list view, PILL_HIERARCHY drill-down, column sort, smart search tokens, group select, bulk actions, column resize, export CSV) that exist nowhere else in the platform. HQFoodIngredients.js and StockControl.js F&B view are both missing every one of these features.

3. **F&B Category Intelligence Gap** — The FoodWorlds.js world system (FoodWorld pills, FNB_PILL_HIERARCHY navigation, FNB_SUBCATEGORY_ICONS) is defined but not wired into any UI component. Every F&B ingredient renders a raw_material icon instead of kitchen-native icons.

---

## AFFECTED FILES

| File | Size | Risk | Work |
|---|---|---|---|
| src/components/hq/HQFoodIngredients.js | 158KB / 5,084L | HIGH | Full DS6 + all 17 SC features |
| src/components/hq/StockControl.js | ~80KB | CRITICAL | Bug fix + DS6 + FoodWorld pills + tile view |
| src/components/hq/SmartInventory.js | 182KB / 5,432L | HIGH | isFoodBev branch: FoodWorld icons + FNB_PILL + FNB tokens |
| src/components/hq/HQStock.js | 211KB | MEDIUM | FoodItemsView: FoodWorld pill zone |
| src/components/hq/StockReceiveModal.js | 72KB | MEDIUM | F&B world receiveAttrs |
| src/components/hq/FoodWorlds.js | NEW | LOW | Commit only — no changes |

---

## PHASES

| Phase | Name | Gate Condition |
|---|---|---|
| 0 | Foundation & Bug Fix | Immediate — first session |
| 1 | DS6 Token Compliance | After Phase 0 gate |
| 2 | Ingredient Encyclopedia Rebuild | After Phase 1 gate |
| 3 | Stock Control Feature Parity | After Phase 2 gate |
| 4 | Advanced Excel-like Features | Post-demo |

---

## STANDING RULES (all agents must follow)

- **WTU-001** — Phase sequence is mandatory. No Phase 2 code before Phase 1 gate. No Phase 3 before Phase 2 gate.
- **WTU-002** — Read before write. Re-read component maps before every session.
- **WTU-003** — `isFoodBev` guards are mandatory in all shared components. `const isFoodBev = industryProfile === 'food_beverage'` — never inline.
- **WTU-004** — FoodWorlds.js export names are immutable after commit. Only add, never rename.
- **WTU-005** — Test all 5 tenants after every StockControl.js change.
- **WTU-006** — No tokens.js changes under this WP.
- **WTU-007** — SEED_INGREDIENTS schema in HQFoodIngredients.js is frozen.
- **WTU-008** — Session documentation required at end of every session.

---

## PHASE 0 GATE CONDITIONS

Phase 0 is complete when ALL of these are satisfied:

- [ ] FoodWorlds.js is on main branch
- [ ] StockControl.js shows 31 items (not 43) for The Garden Bistro
- [ ] The 12 archived finished_product items are not visible in any StockControl view
- [ ] Component inventory comment blocks written at top of HQFoodIngredients.js and StockControl.js
- [ ] Session docs committed

---

## SMARTINVENTORY FEATURE REFERENCE (SC-01 through SC-17)

| # | Feature | Present in SmartInv | F&B Target |
|---|---|---|---|
| SC-01 | Tile view + status borders | yes | Phases 2+3 |
| SC-02 | List view dense table | yes | Phases 2+3 |
| SC-03 | View mode toggle | yes | Phases 2+3 |
| SC-04 | Tile size S/M/L picker | yes | Phases 2+3 |
| SC-05 | KPI card strip | yes | Phases 2+3 |
| SC-06 | PILL_HIERARCHY drill-down | yes | FNB_PILL_HIERARCHY from FoodWorlds.js |
| SC-07 | Column sort | yes | Phases 2+3 |
| SC-08 | Group select + checkboxes | yes | Phases 2+3 |
| SC-09 | Bulk actions | yes | Phases 2+3 |
| SC-10 | Smart search token parser | yes | + FNB_FIELD_MAP tokens |
| SC-11 | Column picker | yes | Phases 2+3 |
| SC-12 | Column resize | yes | Phase 4 |
| SC-13 | Export CSV | yes | Phases 2+3 |
| SC-14 | World picker modal | yes cannabis | FoodWorld picker for F&B |
| SC-15 | Realtime subscription | yes | Phases 2+3 |
| SC-16 | F&B smart tokens | defined | expiry<7, zone:frozen, allergen:dairy, portions>10 |
| SC-17 | FoodWorld banner icons | defined | FNB_SUBCATEGORY_ICONS[item.subcategory] |

---

## DS6 VIOLATION MAP — HQFoodIngredients.js

| Location | Violation | Fix |
|---|---|---|
| L15-34 | Local C palette | Remove C. Import T from tokens.js. |
| L37-106 | Local CATEGORIES array | Import FOOD_WORLDS from FoodWorlds.js |
| L126-132 | Local HACCP_COLORS | T.successLight/Text, T.warningLight/Text, T.dangerLight/Text |
| L3753-3756 | borderRadius: 10 (integer) | T.radius.lg |
| L3641-3645 | borderRadius: 6 (integer) | T.radius.md |
| Row height | ~80-100px actual | Target: 44px (single-line), 56px (two-line) |
| Font sizes | 9px, 10px present | Min T.text.xs (11px) |

---

## NEW LLs ESTABLISHED

- **LL-278** — FoodWorlds.js is single source of truth for F&B ingredient worlds
- **LL-281** — All data-rich tables must reach SmartInventory.js SC-01 through SC-15 feature parity
- **LL-282** — isFoodBev guards mandatory in shared components
- **LL-283** — F&B CATEGORY column must show FNB_SUBCATEGORY_ICONS[item.subcategory]
- **LL-284** — DS6 row heights: 44px single-line, 56px two-line, 72px max

---
*WP-TABLE-UNIFY v1.0 · NuAi · 17 April 2026*
