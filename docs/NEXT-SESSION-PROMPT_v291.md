# NEXT-SESSION-PROMPT v291
## Claude Code Agent Handoff — WP-TABLE-UNIFY Phase 0
## Session 291 · NuAi ERP Platform
## Produced: 17 April 2026

---

## MANDATORY PRE-READ SEQUENCE

Before writing a single line of code, read these documents in this exact order:

1. `docs/PLATFORM-OVERVIEW_v1_0.md` — What this system is (224,293 lines, 6 portals, 5 tenants)
2. `docs/NUAI-AGENT-BIBLE.md` — All rules, all LLs, all patterns
3. `docs/SESSION-STATE_v290.md` — Where we are right now
4. `docs/WP-TABLE-UNIFY_v1_0.md` — This session's work package
5. `docs/VIOLATION_LOG_v1_1.md` — What went wrong before

---

## SESSION 291 TASK: WP-TABLE-UNIFY PHASE 0

**Phase 0 is foundations only. No feature code. No DS6 changes yet.**

The sole objectives this session:
1. Diagnose and fix the archived items bug in StockControl.js
2. Write component maps (planning documentation, not feature code)

---

## TASK 1 — DIAGNOSE THE ARCHIVED ITEMS BUG

**Problem:** StockControl.js displays 43 items for The Garden Bistro. Expected: 31. The 12 archived finished_product items are incorrectly visible.

**Background:** Commit 11015a1 changed the query from `.in("category", ["finished_product", "accessory"])` to `.eq("is_active", true)`. The fix appeared correct but screenshots contradict this.

**Steps:**
1. Read StockControl.js fully. Map every Supabase query that fetches inventory_items.
2. Identify which query returns archived items.
3. Confirm root cause before any code change.
4. Write minimal targeted str_replace only after root cause confirmed.

**Verification SQL:**
```sql
SELECT COUNT(*) FROM inventory_items
WHERE tenant_id = '7d50ea34-9bb2-46da-825a-956d0e4023e1'
  AND is_active = true;
-- Expected: 31
```

Also verify Metro Hardware, MediCare, Medi Recreational are unaffected.

---

## TASK 2 — WRITE COMPONENT MAP COMMENT BLOCKS

At the top of HQFoodIngredients.js and StockControl.js, add structured comment blocks mapping: state variables, Supabase calls, render sections, DS6 violations, and WP-TABLE-UNIFY planned additions. Planning documentation only — no functional changes.

---

## WHAT NOT TO DO THIS SESSION

- Do NOT change any styling in HQFoodIngredients.js (Phase 1)
- Do NOT add tile view or world pills (Phase 2/3)
- Do NOT modify SmartInventory.js, HQStock.js, or tokens.js
- Do NOT modify LOCKED files

---

## PHASE 0 GATE CONDITIONS

- [ ] StockControl.js shows 31 items (not 43) for Garden Bistro
- [ ] 12 archived finished_product items NOT visible
- [ ] Metro Hardware, MediCare, Medi Recreational unchanged
- [ ] Component map comment block in HQFoodIngredients.js
- [ ] Component map comment block in StockControl.js
- [ ] All changes committed and pushed to main

---

## KEY FACTS

**Demo tenants:**
- The Garden Bistro — 7d50ea34-9bb2-46da-825a-956d0e4023e1 — food_beverage
- Nourish Kitchen & Deli — 944547e3-ce9f-44e0-a284-43ebe1ed898f — food_beverage
- Metro Hardware — general_retail
- MediCare Dispensary — cannabis_dispensary
- Medi Recreational — cannabis_retail

**Critical LLs:** LL-206, LL-127, LL-278, LL-282, WTU-005

**Supabase:** uvicrqapgzcdvozxrreo
**Repo:** github.com/GFive5y/protea-botanicals · main

---
*NEXT-SESSION-PROMPT v291 · NuAi · 17 April 2026*
