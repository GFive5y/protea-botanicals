# NEXT SESSION START PROMPT — v248
## Updated: 12 April 2026 (WP-ANALYTICS-5 COMPLETE · Module 6 spec ready)
## HEAD: `388520c` (CustomerIntelligence S1+S2 live · 5 of 6 modules complete)
## Previous prompt: NEXT-SESSION-PROMPT_v247.md (superseded — deleted in the same commit)

---

## YOUR FIRST 7 ACTIONS (no exceptions, no shortcuts)

**Step 0 is new and non-negotiable.** Before any other orientation read,
you read the strategic intelligence document. Every rule in the codebase
exists because of the system described there.

0. **Read `docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md`** — orientation and
   quality standard. Read the v1.0 body AND any date-stamped addendums
   appended below it in order. This is what the system is, what it can
   do, and the quality standard every commit is measured against.
   Addendum 1 (12 April 2026) closes the WP-ANALYTICS-5 loop and should
   reflect the current Module 5 COMPLETE status.

1. `git log --oneline -1` → confirm HEAD is **`388520c`** (or later if
   a post-close doc commit has landed)

2. Read **CLAUDE.md** (at repo root, v2.0) — operational instructions.

3. Read **docs/SESSION-STATE_v240.md** — now has **Addendum 3** covering
   WP-A5/S2 and the NUAI-STRAT-INTEL integration. Read the baseline
   snapshot and all three addendums in order. v239 is frozen historical
   reference — do not touch it.

4. Read **docs/WP-ANALYTICS.md** — master suite vision. Module 5 is
   now COMPLETE. Module 6 is SPEC COMPLETE and is the Priority 1 build
   target. No modules remain un-specced.

5. Read **docs/WP-ANALYTICS-6.md** — the Module 6 Network Intelligence
   detailed spec. This is the Priority 1 build target for this session.
   Step 0 schema check (4 SQL queries) is the first action before any
   code — verifies `tenant_groups.royalty_percentage` column exists and
   confirms no new network-analytics tables have appeared.

6. Read **docs/NUAI-AGENT-BIBLE.md** — especially LL-242, LL-243,
   LL-238, LL-221, LL-206, LL-231, LL-226, LL-203. All still current.
   The Bible's header now references NUAI-STRAT-INTEL as a prerequisite
   read — this is informational, you already did Step 0.

**SESSION-STATE is at Addendum 3 on v240. Future closes append to v240,
not v239.**

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with seven portals and an
AVCO-correct, profile-adaptive franchise analytics suite where 5 of 6
modules are complete — Store Comparison, Combined P&L, Revenue
Intelligence, Stock Intelligence, and Customer Intelligence S1+S2 are
all live — and Module 6 NuAi Network Intelligence (the executive
synthesis layer that reuses existing helpers rather than writing new
queries) is spec-ready for Session 1 build.

---

## WHAT HAPPENED LAST SESSION (v247 — Addendum 3 of v240 summary)

**HEAD chain (v247 session only):** `cf58f5f → 388520c → [session close doc commit]`

Two code/doc commits:

1. **`388520c`** — `feat(WP-A5/S2): CustomerIntelligence AI engine +
   top customers`. 2 files changed, 776 insertions / 54 deletions.
   Extends `fetchStoreLoyalty.js` with `includeAiLogs` and
   `includeTopCustomers` options and a `deriveInitials` helper for the
   POPIA-safe initials projection. Extends `CustomerIntelligence.js`
   with `AiEngineSection` (Section 5) and `TopCustomersCard` (Section 6,
   with a POPIA Compliance Declaration header comment block).

   Browser-verified all 6 checklist items pass: Section 5 AI engine
   honest empty-state when the MTD filter returns zero rows,
   Section 6 React DevTools confirmed PII-free state tree, Supabase
   network payload for the top customers query contains `full_name`
   as the documented narrow exception authorised in v247.

2. **Session close doc commit** — bundles NUAI-STRATEGIC-INTELLIGENCE
   v1.0 landing, WP-ANALYTICS-6 spec landing, CLAUDE.md Step 0 update,
   NUAI-AGENT-BIBLE.md header reference, PLATFORM-OVERVIEW footer
   addendum, NUAI-STRAT-INTEL Addendum 1 with the 5-question Step 3b
   review, WP-ANALYTICS.md + WP-ANALYTICS-5.md status bumps,
   CustomerIntelligence.js header bump, SESSION-STATE v240 Addendum 3,
   and this file.

NUAI-STRATEGIC-INTELLIGENCE is now integrated into the orientation
read loop at every agent-touch surface — it is Step 0 in CLAUDE.md,
Step 0 in this prompt, and is referenced from NUAI-AGENT-BIBLE.md
and PLATFORM-OVERVIEW_v1_0.md.

---

## GROUP PORTAL — CURRENT STATE

| Tab | Component | Status |
|---|---|---|
| Network Dashboard | NetworkDashboard.js | ✅ Live (top products + chart title UX) |
| Stock Transfers | GroupTransfer.js | ✅ Live (AVCO-correct) |
| Compare Stores | StoreComparison.js | ✅ Live |
| Combined P&L | CombinedPL.js | ✅ Live |
| Revenue Intelligence | RevenueIntelligence.js | ✅ Live (S1+S2) |
| Stock Intelligence | StockIntelligence.js | ✅ Live (S1+S2) |
| Customer Intelligence | CustomerIntelligence.js | ✅ Live (S1+S2 as of `388520c`) |
| **Network Intelligence** | **not yet built** | **Priority 1 this session** |
| Shared Loyalty | disabled nav | Phase 2+ deferred |
| Group Settings | GroupSettings.js | ✅ Live |

Module 6 adds a **new** 8th content tab (9th entry with Settings) to
`NAV_ITEMS` after Customer Intelligence. The WP-ANALYTICS-6 spec
explicitly says to position it as `nav id: "network"` after `customers`.

---

## MEDI CAN FRANCHISE NETWORK — CURRENT MEMBERS

| Tenant ID | Name | Role | Industry Profile |
|---|---|---|---|
| `2bd41eb7-1a6e-416c-905b-1358f6499d8d` | Medi Can Dispensary | franchisor | cannabis_dispensary |
| `b1bad266-ceb4-4558-bbc3-22cfeeeafe74` | Medi Recreational | franchisee | cannabis_retail |

Test credentials: `medican@nuai.dev` / `MediCan2026!` → `/group-portal`

**Expected Module 6 render from live data:**
- Medi Recreational: 9 critical restock items + 4 at-risk customers
  (from S1 Step 0 findings). Both should generate critical alerts
  in the Alert Centre. Health score should land in Watch or Critical
  band due to dead stock + restock risk + April revenue.
- Medi Can Dispensary: all stocked, good margin — higher health
  score than Medi Rec. Low AI engine activity. 1 loyalty member
  (minimal customer-dimension contribution to score).
- Network royalty: depends on `tenant_groups.royalty_percentage`
  setting. If 0%, the "Royalty rate not yet configured" note renders.

---

## PASTE-BUG CHECKLIST (apply to every Claude.ai-generated component)

1. **INDUSTRY_BADGE** — data object `{bg, fg, label}`, NOT a React
   component. Use IndustryPill or inline styled span. Never `<BadgeComp />`.
2. **Unused props** — add `void propName;` for any destructured prop
   not referenced in the body. **Exception for Module 6:** `onNavigate`
   IS used — the Alert Centre "Go to {tab}" links call it, and the
   Section 3 royalty note has a "Go to Group Settings" button. Do
   not void onNavigate.
3. **groupName in h2 header** — "Network Intelligence · {groupName}"
4. **Unused variables** — walk every `const` for actual usage. Module 6
   has many score constants, alert threshold constants, dimension
   weights — confirm all 5 health score dimensions are actually
   consumed in the algorithm.
5. **Chart Line name props** — N/A in Module 6 S1 (no Recharts planned).
   If added later, enforce `<Line name={m.tenants?.name}>`.

**POPIA (Module 5 + 6):** Module 6 does not add new PII surface area.
Health scores and alert counts are aggregates. If Module 6 ever renders
customer-level data (it should not — that's what Customer Intelligence
is for), enforce the same `deriveInitials` + masked UUID pattern from
Module 5 Section 6.

---

## CURRENT PRIORITY QUEUE

### Priority 1 — WP-ANALYTICS-6 Session 1: NuAi Network Intelligence

**Spec:** `docs/WP-ANALYTICS-6.md` — the final module in the suite.
Read in full (LL-221) before any code. This is the executive synthesis
layer that reuses existing helpers rather than writing new queries.

**Primary question:** Is my network healthy — and what needs my
attention right now?

**Step 0 — schema check (4 SQL queries in the spec):**

Run via Supabase MCP before writing a line:

1. `tenant_groups.royalty_percentage` column exists + type
2. `tenant_group_members` columns: `tenant_id`, `group_id`, `role`,
   `joined_at`
3. Live royalty data snapshot for the Medi Can network
4. Confirm no new network-analytics tables have appeared since the
   last schema check (`network_alerts`, `network_scores`,
   `franchise_fees`, `royalty_ledger`, `compliance_log`)

**Report all 4 results BEFORE writing code.** If `royalty_percentage`
is not yet a column on `tenant_groups`, stop and report to owner —
the royalty section cannot render without it.

**Session 1 build sequence (from the spec):**

1. Step 0 schema check (4 queries)
2. Create `src/components/group/_helpers/fetchNetworkIntelligence.js`
   — the aggregator helper. Phase 1: 3 parallel families of helper
   calls (fetchStoreSummary, fetchStoreInventory with velocity,
   fetchStoreLoyalty). Phase 2: per-store health score computation
   (5 dimensions × 20 points, with `scoreExclusions` for missing
   data). Phase 3: alert generation (critical/warning/info severity,
   sorted by impact). Phase 4: royalty calculation.
3. Build `NetworkIntelligence.js` with Alert Centre + Section 1
   (health scorecards)
4. Add Section 2 (benchmarking table with sortable columns and
   `overflowX: auto` wrapper)
5. Add Section 3 (royalty calculator — renders at 0% with a
   configure note)
6. Add CSV export (benchmarking table as 10-column CSV)
7. Data-quality footnote
8. Wire `GroupPortal.js` — 3 surgical edits (import, NAV_ITEMS,
   tab router block). Check if `groupMeta` (containing
   `royaltyPct`) is already in scope — if not, extend the existing
   `useEffect` in GroupPortal to fetch it. **Do not add a new
   useEffect.**
9. `CI=false npm run build` → zero new warnings
10. Paste-bug checklist walk
11. Single commit: `feat(WP-A6/S1): NetworkIntelligence — health
    scores, alert centre, benchmarking, royalty calculator`

**Key architectural decision documented in the spec:** Module 6
reuses existing helpers in parallel. Do NOT write new Supabase queries
that duplicate what the helpers already fetch. The only new query is
the one-time `tenant_groups.royalty_percentage` fetch (if not already
in scope from GroupPortal).

**Session 2 — assess after S1 browser verify.** S1 scope is
intentionally complete. Potential S2 candidates documented in the
spec require their own spec before build.

### Priority 2 — Cross-tenant "View store →" navigation (Phase 4b)

NetworkDashboard, StoreComparison, and StockIntelligence all have
"View store →" buttons wired to `onNavigate` or `console.log`. None
actually switch tenant context. Module 6's Alert Centre "Go to {tab}"
pattern is in-portal routing — distinct from cross-tenant navigation.
Cross-tenant nav needs `switchTenant()` from `tenantService.js`.

### Priority 3 — Transfer pre-selection from StoreComparison / StockIntelligence

State passing component → GroupPortal → GroupTransfer initial form state.

### Priority 4 — HQTransfer historical AVCO reconciliation

LL-242 forward-fix is done (`713ef3a`). Pre-fix corruption not
retroactively corrected. Dedicated session with owner approval.

### Priority 5 — loyalty_campaigns schema design (long-deferred)

If Campaign ROI is load-bearing for the Customer Intelligence module
in future, a schema owner must design and create `loyalty_campaigns`
and produce a new spec for WP-ANALYTICS-5 Section 4. Pure
database + spec task.

### Priority 6 — Medi Can cohort overlap UX (NEW this session)

Cosmetic UX issue surfaced during S2 verification. When a store has
overlapping cohort membership (Medi Can Dispensary has 1 member who
is BOTH New this month AND Dormant — never purchased, joined in
April), the Section 3 cohort bar renders segments that sum to
> 100% because New/Active/AtRisk/Lapsed/Dormant are drawn as disjoint
when the underlying classification is orthogonal. Data is honest,
visual is misleading. Non-blocking. Fix options:
- Option A: exclude `isNew` from the cohort bar (keep the row count)
- Option B: normalise the bar to cohort-states (Active+AtRisk+Lapsed+Dormant
  sum to 100%) and show New as an annotation, not a segment
- Option C: render New as a stacked overlay on top of the existing bar

Deferred to a small UX-fix session. See SESSION-STATE v240 Addendum 3
Known Issues entry 11 for context.

---

## SESSION CLOSE CHECKLIST

When v248 closes (WP-ANALYTICS-6 Session 1 shipped):

1. Update `docs/WP-ANALYTICS.md` — Module 6 row: `SPEC COMPLETE` →
   `IN PROGRESS — Session 1 HEAD [hash]` (or `COMPLETE` if shipped
   in one session per the spec's S1 scope)
2. Update `docs/WP-ANALYTICS-6.md` header → same status
3. Run the **Session Close Protocol Step 3b 5-question review**
   (from SESSION-STATE v240 Addendum 3) and either append a
   date-stamped addendum to NUAI-STRATEGIC-INTELLIGENCE_v1_0.md
   or note "NUAI-STRAT-INTEL reviewed, no updates required" in
   the commit message
4. Append Addendum 4 to `docs/SESSION-STATE_v240.md`
5. Write `docs/NEXT-SESSION-PROMPT_v249.md` · delete v248
6. Single commit: `docs: WP-ANALYTICS-6 S1 complete + NEXT-SESSION-PROMPT v249`
   (also append NUAI-STRAT-INTEL review outcome to commit message)

When Module 6 ships, the WP-ANALYTICS suite is DONE. All 6 modules
complete. The Group Portal gives a franchise owner a complete
cross-store intelligence layer that no single-store view can provide.

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `388520c`**. Confirm with `git log --oneline -1`.
2. **NUAI-STRATEGIC-INTELLIGENCE is Step 0** — read it before anything
   else. It is the quality standard every commit is measured against.
3. **SESSION-STATE_v240.md is current** with Addendums 1, 2, and 3.
   Read the baseline + all three addendums in order.
4. **6 helpers in `_helpers/`** — Module 6 adds `fetchNetworkIntelligence.js`
   as a seventh (but it's an aggregator, not a new data fetcher).
5. **Group Portal has 7 non-deferred content tabs live** plus Settings.
   Module 6 brings it to 8 content tabs.
6. **WP-ANALYTICS-5 is DONE.** Don't rebuild. Read the Step 0 addendum
   if you need the schema truth.
7. **WP-ANALYTICS-6 spec is on disk** at `docs/WP-ANALYTICS-6.md`.
   Step 0 schema check (4 queries) is the first action.
8. **Module 6 reuses existing helpers** — do not write new Supabase
   queries that duplicate what fetchStoreSummary, fetchStoreInventory,
   and fetchStoreLoyalty already provide.
9. **onNavigate IS used in Module 6** — Alert Centre "Go to {tab}"
   links and Section 3 "Go to Settings" button. Do not void it.
10. **Section Close Protocol Step 3b** is now mandatory — run the
    5-question NUAI-STRAT-INTEL review at every session close.
11. **RULE 0Q absolute** — Claude.ai never writes to the repo.
    Claude Code only.
12. **T.* tokens mandatory** (LL-238). Zero hardcoded px matching a
    token. Module 6 health score gauges, dimension bars, and alert
    severity dots all use tokens.

---

*NEXT-SESSION-PROMPT_v248.md · 12 April 2026*
*HEAD at write: `388520c` · WP-ANALYTICS-5 COMPLETE · 5 of 6 modules shipped*
*Priority 1: WP-ANALYTICS-6 Session 1 · Step 0 schema check is the first action*
*NUAI-STRATEGIC-INTELLIGENCE v1.0 is Step 0 of every session from this prompt forward*
