# NEXT SESSION START PROMPT — v249
## Updated: 12 April 2026 (WP-ANALYTICS SUITE COMPLETE · deferred queue is next)
## HEAD: `acb007c` (NetworkIntelligence live · 6 of 6 modules complete · suite DONE)
## Previous prompt: NEXT-SESSION-PROMPT_v248.md (superseded — deleted in the same commit)

---

## YOUR FIRST 7 ACTIONS (no exceptions, no shortcuts)

0. **Read `docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md`** — orientation
   and quality standard. Read the v1.0 body AND all date-stamped
   addendums in order. **Addendum 2 is important** — it documents
   the completed WP-ANALYTICS suite, the four-day arc from 9 April
   to 12 April, and the architectural patterns locked in across
   the build. That narrative is the context for everything below.

1. `git log --oneline -1` → confirm HEAD is **`acb007c`** (or later
   if a post-close doc commit has landed)

2. Read **CLAUDE.md** (at repo root, v2.0) — operational instructions.

3. Read **docs/SESSION-STATE_v240.md** — now has **Addendum 4**
   covering WP-A6/S1 and the suite-complete narrative. Read the
   baseline + all four addendums in order.

4. Read **docs/WP-ANALYTICS.md** — master suite vision. **All six
   modules are marked COMPLETE.** The suite is done. No new
   analytics module is planned and none should be started without
   a fresh strategic spec.

5. Read **docs/NUAI-AGENT-BIBLE.md** — LL rules. Still current.

6. Read **docs/VIOLATION_LOG_v1_1.md** — what broke before.

**SESSION-STATE is at Addendum 4 on v240. Future closes append to
v240, not v239.**

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with seven portals and
a **complete 6-module cross-store franchise intelligence suite** —
Store Comparison, Combined P&L, Revenue Intelligence, Stock
Intelligence, Customer Intelligence, and Network Intelligence all
live in the Group Portal as of `acb007c`. The WP-ANALYTICS arc is
closed. This session's work is the deferred items backlog that
built up while the analytics suite was the primary build target.

---

## WHAT HAPPENED LAST SESSION (v248 — Addendum 4 of v240 summary)

**HEAD chain (v248 session only):** `5d5c049 → 00e6656 → acb007c → [this session close doc commit]`

Three commits:

1. **`00e6656`** — `fix: CLAUDE.md path drift — correct all docs/
   references to repo root`. Known Issue 12 from Addendum 3
   resolved. Four live references corrected across NUAI-STRAT-INTEL,
   NUAI-AGENT-BIBLE, NEXT-SESSION-PROMPT_v248, and the Addendum 3
   narrative. Historical prompts (v241 and earlier) intentionally
   preserved as archaeological record.

2. **`acb007c`** — `feat(WP-A6/S1): NetworkIntelligence — alert
   centre, health scores, benchmarking, royalty calculator`.
   WP-ANALYTICS-6 Session 1 and **the final module of the suite**.
   3 files changed, 2,171 insertions / 2 deletions. Pure
   aggregator design — reuses `fetchStoreSummary`,
   `fetchStoreInventory`, and `fetchStoreLoyalty` in parallel;
   zero new Supabase queries. Step 0 schema check ran clean with
   zero divergence. Browser-verified all 6 checklist items pass.

3. **Session close doc commit** — bundles Addendum 4 to
   SESSION-STATE, Addendum 2 to NUAI-STRAT-INTEL (full
   suite-complete narrative), WP-ANALYTICS.md + WP-ANALYTICS-6.md
   to COMPLETE, NetworkIntelligence.js file header bump, this
   NEXT-SESSION-PROMPT, and v248 deletion.

**The WP-ANALYTICS arc is closed.** Four days, seven feature
commits, six spec documents, one production franchise network
end-to-end verifying every module. Full arc narrative in
NUAI-STRATEGIC-INTELLIGENCE_v1_0.md Addendum 2.

---

## GROUP PORTAL — FINAL STATE (8 content tabs + Settings)

| Tab | Component | Status |
|---|---|---|
| Network Dashboard | NetworkDashboard.js | ✅ Live |
| Stock Transfers | GroupTransfer.js | ✅ Live |
| Compare Stores | StoreComparison.js | ✅ Live |
| Combined P&L | CombinedPL.js | ✅ Live |
| Revenue Intelligence | RevenueIntelligence.js | ✅ Live (S1+S2) |
| Stock Intelligence | StockIntelligence.js | ✅ Live (S1+S2) |
| Customer Intelligence | CustomerIntelligence.js | ✅ Live (S1+S2) |
| **Network Intelligence** | **NetworkIntelligence.js** | **✅ Live — `acb007c`** |
| Shared Loyalty | disabled nav | Phase 2+ deferred |
| Group Settings | GroupSettings.js | ✅ Live |

Feature-complete for the WP-ANALYTICS arc. Do not add new tabs
without a strategic spec.

---

## MEDI CAN FRANCHISE NETWORK — CURRENT MEMBERS

| Tenant ID | Name | Role | Industry Profile |
|---|---|---|---|
| `2bd41eb7-1a6e-416c-905b-1358f6499d8d` | Medi Can Dispensary | franchisor | cannabis_dispensary |
| `b1bad266-ceb4-4558-bbc3-22cfeeeafe74` | Medi Recreational | franchisee | cannabis_retail |

Test credentials: `medican@nuai.dev` / `MediCan2026!` →
`/group-portal`. Network royalty_percentage is `0.00` (not yet
configured — Section 3 of Network Intelligence handles this via
the configure-note path).

---

## CURRENT PRIORITY QUEUE — deferred items backlog

The WP-ANALYTICS suite is done. The work below built up while the
suite was the primary target. Priority 1 is the highest-impact
item that affects user-visible Group Portal behaviour.

### Priority 1 — Phase 4b Cross-tenant navigation

**Scope:** Four analytics surfaces have "View store →" or
"Go to {tab}" buttons that currently route in-portal only:

- `NetworkDashboard.js` — "View store →" button on each StoreCard
  (removed "Phase 4" label per commit `7c8e8e4`, but the action
  itself still `console.log`s)
- `StoreComparison.js` — "View store" button on each per-store card
- `StockIntelligence.js` — "View transfers →" button
- `NetworkIntelligence.js` — **Alert Centre "Go to {tab}" links**
  currently call `onNavigate(alert.action)` which routes
  in-portal. These should route cross-tenant when the alert is
  about a specific store — e.g. "Go to stock" on a Medi
  Recreational alert should switch tenant context to Medi Rec
  and open their stock tab, not the Group Portal stock tab.

**What's needed:**

1. **Authorisation check** — confirm the user has access to the
   target tenant (the user may own the franchisor but not be
   explicitly granted the franchisee's tenant_id). Read
   `src/services/tenantService.js` in full (LL-221) before any
   code — the `switchTenant()` helper should already exist.
2. **`switchTenant()` call** from `tenantService.js` to flip the
   active tenant context.
3. **Return path** from the destination tenant back to
   `/group-portal?tab={original_tab}`. This means storing a
   "return to" hint somewhere that survives the tenant switch
   (localStorage, URL query param, or tenantService state).
4. **Fallback** when the user does not have access to the target
   tenant — surface an honest empty state rather than silently
   failing. "You don't have access to this store — ask the
   franchisor to grant permission in Group Settings."

**Step 0 for this task:** Read `src/services/tenantService.js` in
full. Confirm `switchTenant()` exists and check its signature.
Confirm what state it updates and what route it navigates to.
Map the 4 affected Group Portal surfaces to the signature it
exposes. Do NOT write code until the helper surface is understood.

**Scope discipline:** One-file-at-a-time. Land the NetworkDashboard
wire-up first, browser-verify, commit. Then StoreComparison. Then
StockIntelligence. Then NetworkIntelligence Alert Centre. Four
small commits is better than one big one.

### Priority 2 — loyalty_campaigns schema design (blocked spec work)

**Scope:** WP-ANALYTICS-5 Section 4 Campaign ROI is permanently
deferred because `loyalty_campaigns` does not exist in the live
schema. If the owner decides the Campaign ROI section is
load-bearing for the Customer Intelligence module, a schema owner
(not Claude Code) must:

1. Design the `loyalty_campaigns` table (minimum columns per the
   WP-ANALYTICS-5 spec: `id`, `tenant_id`, `name`, `start_date`,
   `end_date`, `multiplier`, `status`, `points_issued`, plus
   `created_at`, `updated_at`)
2. Design how campaigns are linked to `loyalty_transactions` (FK
   column or denormalised campaign_id on transactions?)
3. Design how "Revenue lift vs baseline" is computed — this
   requires either a baseline store in campaign state or a
   client-side calculation against pre-campaign orders data
4. Produce a new detailed spec for WP-ANALYTICS-5 Section 4 via
   the Claude.ai strategic spec pattern
5. Land the migration via `apply_migration`, then Claude Code can
   implement the Section 4 build

**This is a spec-and-migration task, not a coding task for the
next session unless the owner has already produced the spec.**

### Priority 3 — HQTransfer historical AVCO reconciliation

**Scope:** LL-242 forward-fix landed at `713ef3a`. Pre-fix
destination `weighted_avg_cost` values on inventory_items records
that were the target of HQTransfer shipments before the fix are
not retroactively corrected. The UI currently masks the issue
because the forward-fix is AVCO-correct for all NEW transfers,
but a small number of items still carry the pre-fix silently
wrong AVCO.

**What's needed:**

1. **Read-only audit query first** — identify which inventory
   items have pre-fix AVCO corruption. Look for
   `weighted_avg_cost` values on target tenants of HQTransfers
   dated before `713ef3a` that don't match the source-side
   `weighted_avg_cost` at time of ship.
2. **Report to owner** — provide a per-item list with current
   AVCO, computed correct AVCO, and variance. Owner approves or
   rejects each row.
3. **Reversal-capable migration** — apply the correction as a
   SQL migration that logs the before/after to a dedicated
   reconciliation table (so a future audit can reverse the
   change if needed). Not a blind UPDATE.
4. **Post-fix verification** — re-run the audit query, confirm
   zero corruption remains.

**This is a dedicated session with explicit owner approval
required before any UPDATE executes.** Do NOT run the UPDATE in
the same session as the audit unless the owner explicitly
greenlights it.

### Priority 4 — Transfer pre-selection from StoreComparison / StockIntelligence

**Scope:** "Transfer stock →" and "View transfers →" buttons
navigate to the transfers tab without pre-populating FROM/TO
store state. State passing: source component → GroupPortal →
GroupTransfer initial form state.

**Lower priority than Phase 4b because cross-tenant navigation
is a more fundamental UX gap — transfer pre-selection is a nice
ergonomic improvement but the existing transfer UX still works
with manual FROM/TO selection.**

### Priority 5 — GroupSettings email invite (LL-243)

**Scope:** Currently requires pasting a tenant_id UUID. Email
invite is Phase 5b. The UI has an honest "coming in a future
release" note. Build requires an email sending Edge Function and
an invite-acceptance flow. Full scope in LL-243 notes.

### Priority 6 — Medi Can cohort overlap UX fix

**Scope:** Known Issue 11 from Addendum 3. Section 3 cohort bar
in Customer Intelligence renders segments that sum > 100% when a
member is both `isNew` and `isDormant` (Medi Can Dispensary
has 1 such member). Non-blocking, cosmetic. Fix options
documented in Addendum 3: exclude `isNew` from the bar (keep
the row count), stacked overlay, or separate annotation.
Small UX-fix session.

---

## NO NEW ANALYTICS MODULE

Do not start a Module 7. The WP-ANALYTICS suite is complete. If a
new strategic surface is genuinely needed, the owner must produce
a detailed spec via the Claude.ai strategic spec pattern that
produced Modules 1–6 before any code. The existing 6 modules
cover: store comparison, financials, revenue growth, stock
intelligence, customer intelligence, and executive synthesis.
That is the complete cross-store intelligence arc as specified
in the WP-ANALYTICS master vision.

---

## SESSION CLOSE CHECKLIST

When v249 closes (whichever Priority above is tackled):

1. Update `docs/SESSION-STATE_v240.md` — append Addendum 5
2. Run the **Session Close Protocol Step 3b 5-question review**
   — update NUAI-STRATEGIC-INTELLIGENCE Addendum or note
   "reviewed, no updates required" in the commit message
3. Write `docs/NEXT-SESSION-PROMPT_v250.md` · delete v249
4. Single commit: `docs: [priority] complete + NEXT-SESSION-PROMPT v250`

**No WP-ANALYTICS module updates needed** — the suite is done.
Session closes for deferred items touch SESSION-STATE, the priority
queue in the prompt, and potentially NUAI-STRAT-INTEL if the
session produced a capability change or a known-issue fix.

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `acb007c`**. Confirm with `git log --oneline -1`.
2. **The WP-ANALYTICS suite is DONE.** All 6 modules live. Don't
   start a Module 7. Don't rebuild existing modules.
3. **NUAI-STRATEGIC-INTELLIGENCE Addendum 2** is the full
   suite-complete narrative. Read it for the four-day arc, the
   architectural patterns locked in, and the quality standard.
4. **Seven helpers in `_helpers/`** — six data fetchers plus one
   aggregator. Reuse over requery for any future aggregator.
5. **Priority 1 this session is cross-tenant navigation** — read
   `src/services/tenantService.js` in full before any code. Four
   Group Portal surfaces need the same wire-up pattern. One-file-
   at-a-time commits.
6. **loyalty_campaigns schema design (Priority 2)** is a spec-and-
   migration task, not a coding task, unless the owner has
   produced a spec before the session starts.
7. **HQTransfer AVCO reconciliation (Priority 3)** is a dedicated
   session with explicit owner approval required before any
   UPDATE executes. Read-only audit first.
8. **Session Close Protocol Step 3b** is permanent — run the
   5-question NUAI-STRAT-INTEL review at every session close.
9. **POPIA narrow exception pattern** from Customer Intelligence
   Section 6 is the template for any future customer-level Group
   Portal rendering.
10. **RULE 0Q absolute** — Claude.ai never writes to the repo.
    Claude Code only.
11. **T.* tokens mandatory** (LL-238). Zero hardcoded px matching
    a token.

---

*NEXT-SESSION-PROMPT_v249.md · 12 April 2026*
*HEAD at write: `acb007c` · WP-ANALYTICS SUITE COMPLETE · 6 of 6 modules live*
*Priority 1: Phase 4b cross-tenant navigation · Priority 2: loyalty_campaigns schema*
*Priority 3: HQTransfer AVCO reconciliation · no new analytics module planned*
*The WP-ANALYTICS arc is closed — this prompt reflects the post-suite state*
