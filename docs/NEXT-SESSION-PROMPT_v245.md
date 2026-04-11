# NEXT SESSION START PROMPT — v245
## Updated: 12 April 2026 (WP-ANALYTICS-3 complete + WP-ANALYTICS-4 Session 1 complete)
## HEAD: `3ec1d32` (StockIntelligence.js S1 live · 7 of 7 non-deferred Group Portal tabs)
## Previous prompt: NEXT-SESSION-PROMPT_v244.md (superseded — deleted)

---

## YOUR FIRST 6 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is **`3ec1d32`** (or later if post-close doc commit)
2. Read **docs/CLAUDE.md** — v2.0 slim+delegate. Canonical orientation.
3. Read **docs/SESSION-STATE_v240.md** — the **new clean consolidated snapshot**.
   Replaces v239 as the current state-of-the-world. v239 is frozen historical
   reference, do not read it unless you specifically need the Addendum 1-7
   play-by-play narrative.
4. Read **docs/WP-ANALYTICS.md** — master suite vision. Read before ANY analytics code.
5. Read **docs/WP-ANALYTICS-4.md** — Module 4 Stock Intelligence detailed spec. This is
   the Priority 1 build target — Session 2 (fast movers, transfer opportunities,
   dead-stock breakdown). Also check for **docs/WP-ANALYTICS-5.md** — if present,
   Module 5 Customer & Loyalty Intelligence detailed spec has arrived from Claude.ai.
6. Read **docs/NUAI-AGENT-BIBLE.md** — especially LL-242, LL-243, LL-238, LL-221,
   LL-206, LL-231, LL-226, LL-203. All still current.

**Session-state migration note:** v239 is at Addendum 7 and frozen. v240 is a
clean consolidated snapshot opened this session at HEAD `3ec1d32`. Write any new
addendums against v240, not v239. The next session close appends Addendum 1 to
v240 (not Addendum 8 to v239).

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with seven portals, a fully
functional franchise network layer, and an AVCO-correct analytics suite
where 3 of 6 modules are complete (Store Comparison, Combined P&L,
Revenue Intelligence) and 1 is in progress (Stock Intelligence Session 1
live, Session 2 pending).

---

## WHAT HAPPENED LAST SESSION (v244 summary)

Single session, two builds, two commits:

**`6ea2493`** — WP-ANALYTICS-3 Session 2 complete. RevenueIntelligence.js
grew from 887 → 1,491 lines. Three features added:
  - Peak trading heat matrix (7×14 CSS-grid cells, collapsible per store,
    network peak insight above Section 3)
  - Top products per store (second useEffect calling fetchStoreSummary
    with includeExtended, top 5 ranked list below the sparkline)
  - CSV export of SSSG summary (6-column client-side Blob)

**`3ec1d32`** — WP-ANALYTICS-4 Session 1 complete. Two new files:
  - `_helpers/fetchStoreInventory.js` (174 lines) — single query with
    client-side flag derivation via `last_movement_at`, zero
    stock_movements aggregation
  - `StockIntelligence.js` (1,007 lines after fmtRShort removal) — three
    sections: network KPI tiles, per-store stock health cards, collapsible
    slow-mover tables
  - GroupPortal.js: import + nav item + tab router (+11/-1)

Paste-bug checklist caught one pre-commit: `fmtRShort` helper declared but
never used in StockIntelligence (copied from RevenueIntelligence template).
Removed before landing.

Both features browser-verified against the Medi Can Franchise Network.

---

## GROUP PORTAL — CURRENT STATE

| Tab | Component | Status |
|---|---|---|
| Network Dashboard | NetworkDashboard.js | ✅ Live |
| Stock Transfers | GroupTransfer.js | ✅ Live (AVCO-correct) |
| Compare Stores | StoreComparison.js | ✅ Live |
| Combined P&L | CombinedPL.js | ✅ Live |
| Revenue Intelligence | RevenueIntelligence.js | ✅ Live (S1 + S2) |
| Stock Intelligence | StockIntelligence.js | ⚙️ S1 Live · S2 pending |
| Shared Loyalty | disabled nav | Phase 2+ deferred |
| Group Settings | GroupSettings.js | ✅ Live |

The original WP-TENANT-GROUPS spec is functionally complete. Only Shared
Loyalty remains disabled per original scope.

---

## MEDI CAN FRANCHISE NETWORK — CURRENT MEMBERS

| Tenant ID | Name | Role | Industry Profile |
|---|---|---|---|
| `2bd41eb7-1a6e-416c-905b-1358f6499d8d` | Medi Can Dispensary | franchisor | cannabis_dispensary |
| `b1bad266-ceb4-4558-bbc3-22cfeeeafe74` | Medi Recreational | franchisee | cannabis_retail |

Test credentials: `medican@nuai.dev` / `MediCan2026!` → `/group-portal`.
All 6 non-deferred content tabs confirmed live.

---

## PASTE-BUG CHECKLIST (apply to every Claude.ai-generated component)

1. **INDUSTRY_BADGE** — data object `{bg, fg, label}`, NOT a React component.
   Use IndustryPill or inline styled span. Never `<BadgeComp />`.
2. **Unused props** — add `void propName;` for any destructured prop not
   referenced in the body. Common: `groupId`, `onNavigate`.
3. **groupName in header** — every Group Portal component shows
   `· {groupName}`. Missing = consistency bug.
4. **Unused variables** — check every `const` for actual usage. The build
   checker catches this but catching it pre-commit saves a rewrite cycle.
5. **Chart Line name props** — always `<Line name={m.tenants?.name}>`.
   Never `<Line name={m.tenant_id}>` (UUID leak in tooltip).

---

## CURRENT PRIORITY QUEUE

### Priority 1 — WP-ANALYTICS-4 Session 2 (Stock Intelligence velocity + actions)

Read `src/components/group/StockIntelligence.js` in full (LL-221) before any edit.
Read `src/components/group/_helpers/fetchStoreInventory.js` in full before extending.

Session 2 adds three features to the existing Session 1 surface:

**A. Fast movers with restock risk (Section 4)**

Ranks items by `velocityUnits30d` DESC across the store. Flag logic:
- `daysOfStockLeft < 7` → RED (critical restock risk)
- `daysOfStockLeft < 14` → AMBER (restock soon)
- `daysOfStockLeft = quantityOnHand / (velocityUnits30d / 30)` when velocity > 0

Columns: SKU · Name · Units/30d · On hand · Days of stock · Daily rate
Per-store collapsible section like the Session 1 slow-movers pattern.

**B. Transfer opportunities (Section 5)**

Cross-store SKU matching. For each SKU appearing in 2+ stores:
- `need` = stores where `quantityOnHand <= reorderLevel`
- `have` = stores where `quantityOnHand > reorderLevel + reorderQty`
- If both lists non-empty → generate a transfer opportunity card
- Suggested qty = `min(surplus, needed)` — never strip the sender below
  their own reorder level

Opportunity card: FROM store → TO store · product name · suggested qty ·
"Transfer now →" button (wired to `onNavigate("transfers")`; Phase 4b
will add pre-selection of FROM/TO in the GroupTransfer form).

Expected empty state for Medi Can network: no shared SKUs between
`MED-*` and `MC-*` so the engine should render "No transfer opportunities
— stores carry different SKUs." That's correct empty-state behaviour.

**C. Dead stock breakdown per store (Section 6)**

Items where `isDeadStock = true` (qty > 0 AND daysSinceMovement > 60).
Per-store total capital tied up (`Σ stockValue`). Action: flag for review.

**Implementation path:**

1. Step 0 re-verify: confirm `stock_movements.movement_type` includes
   `sale_pos` and `sale_out` (already verified in v244 session but
   re-run to catch any drift).

2. Extend `fetchStoreInventory.js` with `options.includeVelocity` mode:
   ```js
   fetchStoreInventory(tenantId, industryProfile, { includeVelocity: true })
   ```
   When opt-in, run a second query:
   ```js
   supabase.from("stock_movements")
     .select("item_id, quantity")
     .eq("tenant_id", tenantId)
     .in("movement_type", ["sale_pos", "sale_out"])
     .gte("created_at", last30DaysISO);
   ```
   Aggregate client-side into `velocityMap[itemId] = Σ |quantity|`.
   Merge into items[] as `velocityUnits30d` + compute `daysOfStockLeft`.

3. Update `StockIntelligence.js` to call fetchStoreInventory with
   `{ includeVelocity: true }` and render Sections 4-6.

4. **Dispensary velocity sourcing** — Gap 4 from the spec. Verify in
   Step 0 that Medi Can Dispensary's `stock_movements` contains
   `sale_out` rows from dispensing events. If not, dispensary velocity
   will undercount. Report before building.

5. Paste-bug checklist before commit.

6. `CI=false npm run build` → zero new warnings.

### Priority 2 — WP-ANALYTICS-5 Customer & Loyalty Intelligence

**Status: SPEC COMPLETE — `docs/WP-ANALYTICS-5.md` committed at `e237fdd`. Module 5 is ready to build after WP-A4/S2.**

Read `docs/WP-ANALYTICS-5.md` in full (LL-221) before any code. The spec
includes a Step 0 schema check (8 SQL queries) that must run and report
results before `fetchStoreLoyalty.js` is written. POPIA compliance is
non-negotiable — aggregate counts and cohort distributions only, no
individual customer PII rendered anywhere in the Group Portal view.

Master suite overview features (from WP-ANALYTICS.md):
- Network loyalty members: total, active (30d), at-risk
- Tier distribution across all stores
- Cross-store customers: customers visiting multiple network stores
- Loyalty programme ROI: points issued vs revenue driven
- Churn risk alerts with specific remediation actions

### Priority 3 — Cross-tenant "View store →" navigation (Phase 4b)

NetworkDashboard, StoreComparison, and StockIntelligence all have
`View store →` / `View transfers →` buttons. Some are wired to the
same-tab transfers navigation; none actually switch tenant context
to view the target store's native tenant portal.

Needs:
- Auth check (user = group member with access to target tenant)
- Context switch via `switchTenant()` from `src/services/tenantService.js`
- Return path to `/group-portal` without losing tab state

Read `src/services/tenantService.js` in full (LL-221) before any code.
Understand `switchTenant()` exactly before using it.

### Priority 4 — Transfer pre-selection from StoreComparison / StockIntelligence (Phase 4b)

`Transfer stock →` / `View transfers →` buttons currently navigate to
the transfers tab without pre-populating FROM/TO stores. Needs state
passing: component → GroupPortal → GroupTransfer initial form state
via a context or search-param handoff.

### Priority 5 — HQTransfer historical AVCO reconciliation

LL-242 forward-fix is done (`713ef3a`). Pre-fix corruption in
destination `weighted_avg_cost` values is not retroactively corrected.

Dedicated session:
1. Read-only audit query first — walk `stock_movements` WHERE
   `type = 'transfer_in'` to identify affected destination rows
2. Recompute `weighted_avg_cost` per affected row from the movement
   history using the correct AVCO formula
3. Owner approval required before any UPDATE
4. Write reversal-capable migration so the operation can be rolled back

---

## SESSION CLOSE CHECKLIST

When v245 closes (WP-A4/S2 shipped; possibly WP-A5/S1 if the spec
arrives during the session):

1. Update `docs/WP-ANALYTICS.md`:
   - Module 4: "IN PROGRESS — S1 HEAD 3ec1d32" → "COMPLETE — HEAD [hash]"
   - Module 5: "Pending" → "IN PROGRESS" or "SPEC COMPLETE" depending on progress
2. Update `docs/WP-ANALYTICS-4.md` header → COMPLETE — shipped [hash]
3. Update `docs/WP-ANALYTICS-5.md` header if progress was made
4. Write `docs/WP-ANALYTICS-6.md` (NuAi Network Intelligence spec) **only
   if** Module 5 is complete by session close. Otherwise hold.
5. Append Addendum 1 to `docs/SESSION-STATE_v240.md` (first addendum of
   the new consolidated snapshot)
6. Write `docs/NEXT-SESSION-PROMPT_v246.md` · delete v245
7. Single commit: `docs: WP-ANALYTICS-4 complete + NEXT-SESSION-PROMPT v246`
   (or similar depending on what shipped)

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `3ec1d32`**. Confirm with `git log --oneline -1`.
2. **SESSION-STATE_v240.md is the new truth.** v239 is frozen historical
   reference. Read v240 for the current state.
3. **5 helpers in `_helpers/`**: fetchStoreSummary · industryBadge ·
   fetchStoreFinancials · fetchStoreTrend · fetchStoreInventory.
   New modules add a sibling here.
4. **Group Portal has 7 non-deferred tabs live** (6 content + Settings).
   Only Shared Loyalty is deferred per original scope.
5. **WP-ANALYTICS-3 is complete.** Don't rebuild it. Read the file if
   you need the pattern.
6. **WP-ANALYTICS-4 S1 is live** — fetchStoreInventory helper has an
   `options` parameter ready for S2's `includeVelocity` opt-in. Signature
   is stable.
7. **WP-ANALYTICS-5 spec is committed** at `e237fdd`. Module 5 is ready
   to build after WP-A4/S2 completes. Step 0 schema check (8 SQL
   queries) is the first action when implementation starts.
8. **`last_movement_at` efficiency win** — zero stock_movements queries
   for S1 stock intelligence. Session 2 adds one aggregation query per
   store for velocity but only behind the `includeVelocity` opt-in.
9. **Medi Can Franchise Network has 2 stores.** Both needed for
   cross-store analytics. Medi Recreational has 172 items with no AVCO
   (simulator data) — surface honestly, do not suppress.
10. **Paste-bug checklist is mandatory pre-commit.** Five patterns.
    Walk them every time.
11. **RULE 0Q absolute** — Claude.ai never writes to the repo. Claude
    Code only.
12. **T.* tokens mandatory** (LL-238). Zero hardcoded px matching a token.

---

*NEXT-SESSION-PROMPT_v245.md · 12 April 2026*
*HEAD at write: `3ec1d32` · WP-ANALYTICS-3 COMPLETE · WP-ANALYTICS-4 S1 LIVE*
*SESSION-STATE migrated to v240 clean consolidated snapshot*
*Priority 1: WP-A4/S2 velocity + transfer opportunities. Priority 2: WP-A5 S1 — spec locked at e237fdd, ready to build.*
