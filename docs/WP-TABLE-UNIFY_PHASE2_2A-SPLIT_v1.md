# WP-TABLE-UNIFY Phase 2A — Split Plan
## SmartInventory Feature Parity for HQFoodIngredients
## Produced: Session 320, 18 April 2026
## Total estimate: ~20 hours across 4 PRs
## Executor: Claude Code · Planner: Claude.ai
## Parent scope: docs/WP-TABLE-UNIFY_PHASE2_v1.md §5 (Phase 2A)

---

## WHY THIS SPLIT EXISTS

Scope doc §5.2 lists six new component files under `src/components/hq/food/`
and estimates Phase 2A at ~20 hours. That's too much for one PR. Phase 1
shipped as 6 PRs across 2 sessions; per-PR gates caught mistakes before
they compounded (LL-289 equidistant round-down was a PR 2b.4 correction,
not a Phase-2 commit). Phase 2A needs the same discipline.

Four PRs. Each is one coherent change. Each has a gate. Each leaves the
app working in its in-between state — no broken intermediate commits.

---

## PR 2A.1 — Scaffolding + View Foundation (~4h)

**What ships:**
- New directory: `src/components/hq/food/`
- `food/FoodTileView.js` — extract existing tile/card render from HQFoodIngredients
- `food/FoodListView.js` — new dense sortable table (replaces current list fallback)
- `food/ViewToggle.js` — small button component: tile | list
- HQFoodIngredients.js imports and uses both views, default `tile`

**What does NOT ship in 2A.1:**
- No new filtering (keeps existing filterCat/filterAllergen/filterHaccp/filterTemp)
- No new KPIs (keeps existing header strip if present)
- No bulk select, no smart search, no pill hierarchy
- No column sort on the list view (2A.3)

**Files touched:**
- Create: `src/components/hq/food/FoodTileView.js` (~200 lines)
- Create: `src/components/hq/food/FoodListView.js` (~150 lines)
- Create: `src/components/hq/food/ViewToggle.js` (~40 lines)
- Modify: `src/components/hq/HQFoodIngredients.js` (extract render blocks,
  add viewMode state, import the three new files)

**Data impact:** None. No queries change.
**RLS impact:** None. `hq_all_food_ingredients` already applied S320.
**Schema impact:** None.

**Gate for 2A.1:**
- [ ] `npm run build` passes with zero new warnings
- [ ] Logged in as admin@protea.dev, view `/hq?tab=hq-ingredients` under
      Garden Bistro tenant context → 160 ingredients render in tile view
- [ ] Click toggle → same 160 render in list view
- [ ] Switch to Nourish (empty) → empty state renders, not crash
- [ ] Switch to a cannabis tenant → the tab doesn't render (industry
      profile guard still works — component shouldn't even mount)
- [ ] No regressions on HQDashboard other tabs

**Why this PR goes first:** The directory + toggle pattern unblocks every
subsequent PR. 2A.2–2A.4 all add features that attach to either TileView
or ListView. Once the toggle works, each subsequent PR is a contained
addition.

---

## PR 2A.2 — Pill Nav + KPI Strip + Smart Search (~6h)

**What ships:**
- `food/FoodPillNav.js` — drill-down using FNB_PILL_HIERARCHY from FoodWorlds.js
- `food/FoodKPIStrip.js` — 4 cards: Total · Expiring<7d · Missing allergen · Missing nutrition
- `food/FoodSmartSearch.js` — FNB_FIELD_MAP token parser, replaces plain search
- HQFoodIngredients.js composes the three into the header

**Naming hazard (scope doc §0.4):**
`food_ingredients.sub_category` (with underscore) vs FoodWorlds constants
`subcategory` (no underscore). The pill nav wires `FNB_PILL_HIERARCHY` whose
sub-ids like `protein_red_meat` match the values in the `sub_category` column.
That means `FoodPillNav` filters on `item.sub_category`, but the constant it
reads from is named `subcategory` in the JS object — two namespaces that
happen to carry the same string values. Clear-headed mapping needed at the
query boundary. No rename either side.

**Data impact:** None. All filtering is client-side over already-fetched rows.
**Schema impact:** None.

**Gate for 2A.2:**
- [ ] `npm run build` passes
- [ ] Garden Bistro: pill nav shows 9 worlds, clicking Proteins filters
      to protein_* rows only
- [ ] KPI strip renders 4 numbers that match a manual SQL count on
      food_ingredients for Garden Bistro's tenant_id
- [ ] Smart search: typing `allergen:gluten` filters to gluten-flagged rows;
      typing `zone:frozen` filters to frozen rows; plain text still works
- [ ] Nourish: 0 items, 4 KPI cards show zeros, no crash
- [ ] Cannabis tenants: tab doesn't render (as 2A.1)

---

## PR 2A.3 — Column Sort + Bulk Select + CSV Export + Realtime (~6h)

**What ships:**
- Column sort in `FoodListView` — clickable headers, sort state
- Checkbox column in `FoodListView` — selection state
- `food/FoodBulkActionBar.js` — appears when selectedIds.length > 0
  - Actions: Tag, Change zone, Export selected, Archive
- CSV export button (exports filtered rows, not all rows)
- Supabase realtime subscription on `food_ingredients` filtered by tenant_id
- `food/FoodColumnPicker.js` — localStorage-backed column visibility

**LL-285 reminder:** Every SELECT on `food_ingredients` must carry
`.eq("tenant_id", tenantId)`. The `hq_all_food_ingredients` bypass (applied
S320) means HQ users would otherwise see cross-tenant rows. The existing
fetch at L3185 uses `.or("is_seeded.eq.true,tenant_id.eq."+tenantId)` —
that's correct. Any new query added in this PR must follow the same pattern.

**Data impact:** Realtime subscription adds a WebSocket connection. No
writes from this PR.

**Gate for 2A.3:**
- [ ] `npm run build` passes
- [ ] Click column header → rows sort ascending, click again → descending
- [ ] Select 3 rows → bulk action bar appears
- [ ] Export selected → CSV downloads with just those 3 rows
- [ ] Export all → CSV downloads with all filtered rows (after pill/search filter)
- [ ] Open two browser tabs, edit an ingredient in one → other tab updates
      within 2 seconds (realtime confirmed)
- [ ] LL-285 grep: every `.from("food_ingredients")` in HQFoodIngredients.js
      and food/* has `.eq("tenant_id", tenantId)` within 5 lines

---

## PR 2A.4 — Smoke Test + Regressions + Tile Size + FoodWorld Banners (~4h)

**What ships:**
- Tile size picker (S/M/L) — localStorage persist
- FoodWorld banner icons on tiles (FNB_SUBCATEGORY_ICONS wired)
- Any regression fixes from end-to-end testing
- Component map comment block at top of HQFoodIngredients updated with
  Phase 2A completion
- 2A gate sign-off recorded in decision journal

**Smoke test matrix (realistic, not the scope doc's 5-tenant fantasy):**
- Garden Bistro (160 items, real data) — full walkthrough: pill nav →
  smart search → select → export → toggle views → add ingredient → realtime
- Nourish Kitchen (0 items) — empty-state walkthrough, no crashes
- Cannabis tenant (any, e.g. Medi Recreational) — confirm hq-ingredients tab
  is NOT rendered (industry profile guard in HQDashboard)
- General retail (Metro Hardware) — confirm hq-ingredients tab is NOT rendered
- Dispensary (MediCare) — confirm hq-ingredients tab is NOT rendered

**Gate for 2A COMPLETE:**
- [ ] All 5 tenants walked through per matrix above
- [ ] Zero new console errors under normal use in any tenant
- [ ] `npm run build` passes
- [ ] HQFoodIngredients.js component map comment updated:
      line count, state variables (now includes viewMode, sortField, sortDir,
      tileSize, selectedIds, colVisibility), imports (now includes 6 food/*
      components)
- [ ] Decision journal entry: "Phase 2A complete, 4 PRs, N total lines added,
      lessons learned"
- [ ] WP-TABLE-UNIFY_PHASE2_v1.md §5.3 gate checklist all ticked

---

## EXECUTION RHYTHM (Procedure 6 reminder)

Each PR follows the six-step cycle:

1. **Planner step-back** — re-read WP-TABLE-UNIFY_PHASE2_v1.md and this
   split plan at live HEAD. Ask: what changed since last PR? What did
   the last PR surface?
2. **Planner scope** — produce one Claude Code instruction block for
   this PR, using the spec above as the source of truth
3. **Owner handoff** — paste into Claude Code terminal
4. **Executor ships** — writes, compiles, commits, pushes
5. **Planner reviews** — fetch commit via GitHub MCP, verify against spec,
   decision journal entry if anything substantive
6. **Gate check** — run through this PR's gate before starting next PR

No accumulating gate debt across PRs.

---

## DEPENDENCIES

```
2A.1 (scaffolding) ──┬──> 2A.2 (filters)   ──┬──> 2A.4 (polish + gate)
                     └──> 2A.3 (ops)         ──┘
```

2A.2 and 2A.3 can run in parallel after 2A.1 lands, but only if a second
Claude Code session runs them sequentially — the planner (me) should not
try to scope both at once. Keep the rhythm one PR at a time.

2A.4 needs both 2A.2 and 2A.3 landed.

---

## WHAT HAPPENS AFTER 2A COMPLETE

- Return to Procedure 6 Step 1 at the Phase level: re-read the full
  WP-TABLE-UNIFY_PHASE2_v1.md, ask what 2A surfaced that changes 2B/2C/2D
- Produce a similar split plan for 2B (AI ingest, ~15h, new EF +
  new DB table)
- 2B is the demo wow moment — highest AI investment, highest scrutiny,
  deserves its own careful scoping pass

---

## ROLLBACK NOTES

Each PR is a single commit. If a PR breaks something:
- `git revert <commit>` cleanly undoes it
- No DB migrations in 2A (first migration is 2B's `ingredient_ingest_queue`)
- No EF deploys in 2A

The lowest-risk posture possible for a 20-hour refactor.

---

*WP-TABLE-UNIFY_PHASE2_2A-SPLIT_v1.md · NuAi · Session 320*
*Produced by Claude.ai planner per Procedure 6*
*Next action: Claude Code picks up PR 2A.1 from this spec*
