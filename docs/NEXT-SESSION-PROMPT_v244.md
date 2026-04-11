# NEXT SESSION START PROMPT — v244
## Updated: 12 April 2026 (WP-ANALYTICS-3 Session 1 complete)
## HEAD: 5352d96 (RevenueIntelligence.js live · 6 non-deferred Group Portal tabs)
## Previous prompt: NEXT-SESSION-PROMPT_v243.md (now superseded — delete it)

---

## YOUR FIRST 6 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is **5352d96** (or later if post-close doc commit)
2. Read **docs/CLAUDE.md** — v2.0 slim+delegate. Canonical.
3. Read **docs/SESSION-STATE_v239.md** — Addendums **1 through 7** cumulatively. Addendum 7 covers WP-ANALYTICS-3 S1, the five paste-bugs, the projection-already-shipped note, and the WP-ANALYTICS-4 spec. Read in order.
4. Read **docs/WP-ANALYTICS.md** — master suite vision. Read before ANY analytics code.
5. Read **docs/WP-ANALYTICS-3.md** + **docs/WP-ANALYTICS-4.md** — both modules are in play this session.
6. Read **docs/NUAI-AGENT-BIBLE.md** — especially LL-242, LL-243, LL-238, LL-221, LL-206, LL-231, LL-226.

**SESSION-STATE is at Addendum 7 on v239. The file is getting long — consider opening SESSION-STATE_v240.md this session as a clean consolidated snapshot.**

---

## WHAT HAPPENED LAST SESSION (Addendum 7 summary)

WP-ANALYTICS-3 Session 1 shipped at `5352d96`. Two new files:
`fetchStoreTrend.js` (276 lines) + `RevenueIntelligence.js` (887 lines) + GroupPortal.js edits.
Five paste-bugs caught and fixed by Claude Code before commit (see Addendum 7 for full list + pattern).
Projection (7-day rolling average) was already implemented in Session 1 — Session 2 is shorter than originally scoped.
WP-ANALYTICS-4 spec committed alongside the session close.

---

## PASTE-BUG CHECKLIST (apply to every Claude.ai-generated component before commit)

1. **INDUSTRY_BADGE** — data object `{bg, fg, label}`, NOT a React component. Use IndustryPill or inline styled span. Never `<BadgeComp />`.
2. **Unused props** — add `void propName;` for any destructured prop not referenced in the body. Common: `groupId`, `onNavigate`.
3. **groupName in header** — every Group Portal component shows `· {groupName}`. Missing = consistency bug.
4. **Unused variables** — check every `const` for actual usage. Common: `todayStr`, date range strings computed but never rendered.
5. **Chart Line name props** — always `<Line name={m.tenants?.name}>`. Never `<Line name={m.tenant_id}>` (UUID leak in tooltip).

---

## CURRENT PRIORITY QUEUE

### Priority 1 — WP-ANALYTICS-3 Session 2 (shorter than originally scoped)

Read RevenueIntelligence.js in full (LL-221) before any edit.
Projection is ALREADY SHIPPED. Session 2 scope is exactly three features:

**A. Peak trading heat matrix**
7 days × 14 hours (9am–10pm). Each cell = order count in that slot.
Data: `rows[].hour` and `rows[].dayOfWeek` already in the existing trendResults state.
No new fetches needed — reuse data from the window-controlled useEffect.
Colour: white (0) → T.accentLight → T.accent (proportional to max cell in store).
Day labels: Sun Mon Tue Wed Thu Fri Sat. Hour labels: 9am 10am ... 10pm.
Collapsible per store: "Peak trading ▾" toggle inside StoreGrowthCard.
Network insight: "Network peak: {day} {time}" computed from the combined matrix.

**B. Top products per store**
Call `fetchStoreSummary` with `{ includeExtended: true, lastMonthStartISO, lastMonthEndISO }`.
Returns `topProducts: [{name, revenue, qty}]` (top 5). Already built, zero new queries.
Render as ranked list inside StoreGrowthCard below the sparkline:
  #1 [Product Name] R{revenue} · {qty} units

**C. CSV export of SSSG summary**
Client-side blob, same pattern as CombinedPL.js `downloadPLCsv`.
Rows: Store | Revenue MTD | Prior Month | MoM SSSG% | WoW SSSG% | Projected Month-End
Button: top-right of component, beside the 30d/60d/90d toggle pills.

Build steps:
1. Read RevenueIntelligence.js in full (LL-221)
2. Add heat matrix cells to StoreGrowthCard (built from existing trendResults — no new fetch)
3. Add a second `useEffect` to call `fetchStoreSummary` with includeExtended for topProducts
4. Render top products ranked list in StoreGrowthCard
5. Add `downloadSSGSCsv` helper + export button
6. CI=false npm run build → zero new warnings

### Priority 2 — WP-ANALYTICS-4 Session 1 (Stock Intelligence core)

Read docs/WP-ANALYTICS-4.md in full before any code.
Step 0 schema check is documented in the spec — re-run before build to confirm no drift.

Build steps:
1. Step 0: confirm last_movement_at, needs_reorder, max_stock_level, reorder_qty columns
2. Create `src/components/group/_helpers/fetchStoreInventory.js` (core mode, no velocity)
3. Build `src/components/group/StockIntelligence.js` (Sections 1–3)
4. Add `{ id: "stock", label: "Stock Intelligence" }` to GroupPortal.js NAV_ITEMS after "revenue"
5. Add import + tab router block
6. CI=false npm run build

### Priority 3 — Cross-tenant navigation (Phase 4b)

`View store →` buttons currently `console.log`. Needs:
- Auth check (user = group member with access to target tenant)
- Context switch via `switchTenant()` from tenantService.js
- Return path to /group-portal

Read `src/services/tenantService.js` in full (LL-221) before any code.

### Priority 4 — Transfer pre-selection from StoreComparison

`Transfer stock →` in StoreComparison navigates to transfers tab without pre-populating.
State passing: StoreComparison → GroupPortal → GroupTransfer initial form state.

### Priority 5 — HQTransfer historical AVCO reconciliation

LL-242 forward-fix is done. Pre-fix corruption not remediated.
Read-only audit query first — walk stock_movements WHERE type='transfer_in'.
Owner approval required before any UPDATE.

---

## SESSION CLOSE CHECKLIST

When v244 closes (WP-ANALYTICS-3 S2 + WP-ANALYTICS-4 S1 both shipped):

1. Update WP-ANALYTICS.md:
   - Module 3: "IN PROGRESS" → "COMPLETE — HEAD [hash]"
   - Module 4: "SPEC COMPLETE" → "IN PROGRESS — Session 1 HEAD [hash]"
2. Update WP-ANALYTICS-3.md → COMPLETE — shipped [hash], verified in browser
3. Update WP-ANALYTICS-4.md → IN PROGRESS — Session 1 HEAD [hash]
4. Write docs/WP-ANALYTICS-5.md (Customer & Loyalty Intelligence detailed spec)
5. Append Addendum 8 to SESSION-STATE_v239.md OR open fresh SESSION-STATE_v240.md
6. Write docs/NEXT-SESSION-PROMPT_v245.md · delete v244
7. Single commit: `docs: WP-ANALYTICS-3 complete + WP-ANALYTICS-4 S1 + NEXT-SESSION-PROMPT v245`

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `5352d96`**. Confirm with `git log --oneline -1`.
2. **WP-ANALYTICS-3 S2 scope is three features only** — projection already shipped.
3. **Peak trading heat matrix uses existing data** — no new fetches, built from rows[].hour + rows[].dayOfWeek already in trendResults.
4. **4 helpers in `_helpers/`**: fetchStoreSummary · industryBadge · fetchStoreFinancials · fetchStoreTrend. New one for Module 4 = `fetchStoreInventory.js`.
5. **`last_movement_at` on inventory_items** = O(1) slow-mover detection. Zero stock_movements queries for S1.
6. **INDUSTRY_BADGE is NOT a React component.** See paste-bug checklist. Always verify before committing.
7. **Medi Recreational AVCO = 0** for all simulator items. Dead stock value = R0. Show data quality note, do not suppress.
8. **RULE 0Q absolute** — Claude.ai never calls push_files or create_or_update_file.
9. **T.* tokens mandatory** (LL-238). Zero hardcoded px matching a token.
10. **Test credentials**: medican@nuai.dev / MediCan2026! → /group-portal. Revenue Intelligence is the 5th live content tab.

---

*NEXT-SESSION-PROMPT_v244.md · 12 April 2026*
*HEAD at write: 5352d96 · WP-ANALYTICS-3 S1 COMPLETE*
*S2 scope confirmed shorter: projection shipped, S2 = heat matrix + top products + CSV*
*WP-ANALYTICS-4 spec locked in docs/WP-ANALYTICS-4.md*
