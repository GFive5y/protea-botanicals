# NEXT SESSION START PROMPT — v247
## Updated: 12 April 2026 (WP-ANALYTICS-5 S1 complete · S2 next)
## HEAD: `a5134aa` (CustomerIntelligence live · 5 of 6 modules have at least one session shipped)
## Previous prompt: NEXT-SESSION-PROMPT_v246.md (superseded — deleted in the same commit)

---

## YOUR FIRST 6 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is **`a5134aa`** (or later if post-close doc commit)
2. Read **docs/CLAUDE.md** — v2.0 slim+delegate. Canonical.
3. Read **docs/SESSION-STATE_v240.md** — now has **Addendum 2** covering WP-A5/S1. Read the baseline snapshot, Addendum 1, AND Addendum 2 in order. v239 is frozen historical reference — do not touch it.
4. Read **docs/WP-ANALYTICS.md** — master suite vision. Module 5 is now IN PROGRESS, Module 6 still has no detailed spec and remains out of scope.
5. Read **docs/WP-ANALYTICS-5.md** — the **Step 0 addendum at the bottom** is the truth Session 2 must build against. The pre-Step-0 body above is preserved for historical context only — do not act on it.
6. Read **docs/NUAI-AGENT-BIBLE.md** — especially LL-242, LL-243, LL-238, LL-221, LL-206, LL-231, LL-226, LL-203. POPIA is load-bearing for Module 5 — aggregate counts and cohort distributions only, no individual customer PII in the Group Portal view. Section 6 Top Customers (S2) introduces the POPIA-safe initials + masked UUID pattern.

**SESSION-STATE is at Addendum 2 on v240. Future closes append to v240, not v239.**

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with seven portals and an
AVCO-correct, profile-adaptive franchise analytics suite where 5 of 6
modules have at least one session shipped — Store Comparison, Combined
P&L, Revenue Intelligence, Stock Intelligence, and Customer Intelligence
S1 are all live. Only Customer Intelligence S2 and the NuAi Network
Intelligence Module 6 (still needs a spec) remain.

---

## WHAT HAPPENED LAST SESSION (v246 — Addendum 2 of v240 summary)

**HEAD chain (v246 session only):** `c2fed3b → 7c8e8e4 → a5134aa → [this doc commit]`

Three commits, one pre-flight bug fix plus Module 5 Session 1:

1. **`7c8e8e4`** — `fix: top products in NetworkDashboard + Phase 4 label
   + chart title`. Pre-flight bug fix from a Group Portal audit.
   NetworkDashboard was missing a Top Products block entirely (not a
   "showing — " bug, an absence). StoreComparison already had
   `includeExtended: true`. Added `TopProductsBlock` helper to
   NetworkDashboard StoreCard rendering top 3 by revenue MTD with
   "No orders this period" empty state. Removed visible
   `<span>Phase 4</span>` placeholder from View Store button row.
   UX-1: StoreComparison chart title now reflects the active sort
   (`Revenue MTD — sorted by {label}`). 98 insertions / 20 deletions
   across two files. Browser-verified all four checks.

2. **`a5134aa`** — `feat(WP-A5/S1): CustomerIntelligence — cohort
   health, tier distribution, points economy`. Module 5 Session 1.
   1,507 insertions across three files (two new, one surgical edit).
   Ships three sections plus CSV export and data-quality footnote in
   a new Group Portal tab at position 7 (after Stock Intelligence).
   Step 0 schema check via Supabase MCP revealed material divergence
   from the pre-Step-0 spec body — see below.

3. **`[this doc commit]`** — WP-ANALYTICS-5 S1 complete, SESSION-STATE
   v240 Addendum 2, NEXT-SESSION-PROMPT v247, WP-ANALYTICS-5.md Step 0
   addendum, WP-ANALYTICS.md module row bump, CustomerIntelligence.js
   header status line bump.

## Step 0 schema divergence — Session 2 builds from this, not the spec body

The WP-ANALYTICS-5 spec's pre-Step-0 body referred to tables that do
not exist. The live schema differs materially. All divergences are
documented in the **Step 0 addendum at the bottom of
`docs/WP-ANALYTICS-5.md`**. Summary:

| Spec name | Actual | Impact |
|---|---|---|
| `customers` | `user_profiles` | POPIA-safe 8-column projection is the only permitted SELECT |
| `loyalty_tiers` | **does not exist** | Tiers are inline TEXT on user_profiles; 5-tier enum fixed in schema |
| `loyalty_campaigns` | **does not exist** | **Section 4 permanently deferred** — no schema to query |
| `ai_action_logs` | `loyalty_ai_log` | Column shape: `target_user_id` not `customer_id` |
| `stock_boost` (action_type) | `stock_boost_suggestion` | S2 Section 5 must use actual value |
| `orders.customer_id` | `orders.user_id` | Customer linkage column |
| `scan_logs` has no `tenant_id` | — | Tenant scoping via user_profiles join only |

---

## GROUP PORTAL — CURRENT STATE

| Tab | Component | Status |
|---|---|---|
| Network Dashboard | NetworkDashboard.js | ✅ Live (top products added `7c8e8e4`) |
| Stock Transfers | GroupTransfer.js | ✅ Live (AVCO-correct) |
| Compare Stores | StoreComparison.js | ✅ Live (chart title UX-1 `7c8e8e4`) |
| Combined P&L | CombinedPL.js | ✅ Live |
| Revenue Intelligence | RevenueIntelligence.js | ✅ Live (S1+S2) |
| Stock Intelligence | StockIntelligence.js | ✅ Live (S1+S2) |
| **Customer Intelligence** | **CustomerIntelligence.js** | **✅ Live — Session 1 as of `a5134aa`** |
| Shared Loyalty | disabled nav | Phase 2+ deferred |
| Group Settings | GroupSettings.js | ✅ Live |

Seven content tabs plus Settings. **Customer Intelligence Session 2
does not add a new tab** — it extends the existing component with
Sections 5 and 6 inline.

---

## MEDI CAN FRANCHISE NETWORK — CURRENT MEMBERS

| Tenant ID | Name | Role | Industry Profile |
|---|---|---|---|
| `2bd41eb7-1a6e-416c-905b-1358f6499d8d` | Medi Can Dispensary | franchisor | cannabis_dispensary |
| `b1bad266-ceb4-4558-bbc3-22cfeeeafe74` | Medi Recreational | franchisee | cannabis_retail |

Test credentials: `medican@nuai.dev` / `MediCan2026!` → `/group-portal`

**Dispensary is sparse** — only 1 `user_profiles` row at spec time
(bronze, dormant, new). Cohort render is correct but visually
minimal. Session 2 verification of Sections 5 and 6 will need to
handle this empty-ish data honestly; do not fake richer data.

---

## PASTE-BUG CHECKLIST (apply to every Claude.ai-generated component)

1. **INDUSTRY_BADGE** — data object `{bg, fg, label}`, NOT a React component. Use IndustryPill or inline styled span. Never `<BadgeComp />`.
2. **Unused props** — add `void propName;` for any destructured prop not referenced in the body. Common: `groupId`, `onNavigate`.
3. **groupName in header** — every Group Portal component shows `· {groupName}`. Missing = consistency bug.
4. **Unused variables** — check every `const` for actual usage. The build checker catches top-level dead variables; dead object properties need manual walking.
5. **Chart Line name props** — always `<Line name={m.tenants?.name}>`. Never `<Line name={m.tenant_id}>` (UUID leak in tooltip).

**Module 5 addition (ENFORCED):** **POPIA — no individual customer PII
in the Group Portal view.** Aggregate counts and cohort distributions
only. `fetchStoreLoyalty.js` enforces an 8-column non-PII projection
from `user_profiles`. Any Session 2 query additions must preserve this.
Browser devtools network-tab inspection during verification is
mandatory — confirm no query returns `email`, `phone`, `full_name`,
`date_of_birth`, or `street_address` columns in the response payload.

**Section 6 Top Customers POPIA pattern (S2 only):** Full name is
fetched server-side for initials derivation ONLY, and only the initials
(e.g. "J.S.") reach the component state. The first letter of the first
name plus the first letter of the surname is the entire projection.
The masked UUID is the last 4 characters of `customer.id`. No full
name, no full UUID, no email, no phone.

---

## CURRENT PRIORITY QUEUE

### Priority 1 — WP-ANALYTICS-5 Session 2: Customer Intelligence extensions

**Spec:** The Step 0 addendum at the bottom of `docs/WP-ANALYTICS-5.md`
is the truth. Read it in full before any code. The pre-Step-0 body of
the spec is historical reference and **must not be acted on**.

**Primary question:** What is the nightly loyalty-ai engine doing, and
which individual customers are the most valuable — without violating POPIA?

**Session 2 scope (two sections):**

- **Section 5 — AI Engine Activity**
  - Reads `loyalty_ai_log` (actual table name, not `ai_action_logs`)
  - Live action types: `churn_rescue`, `birthday_bonus`,
    `stock_boost_suggestion` (actual value, not `stock_boost`)
  - Table layout: action type | count this month | per-store breakdown
  - Unlocks the `includeAiLogs: true` option on `fetchStoreLoyalty`
  - Per-store breakdown renders honestly — Medi Can Dispensary will
    show 0 or near-0 across all action types with the sparse test data

- **Section 6 — Top Customers per store (POPIA-safe)**
  - Collapsible per-store table, same pattern as the Cohort Health
    card's expansion behaviour
  - **POPIA-safe projection only**: initials (derived server-side
    from full_name and discarded) + last 4 chars of the UUID
  - Columns: Rank | Initials | Masked ID | Tier | Points Balance |
    Purchases MTD | Revenue MTD
  - No email, no phone, no full name, no full UUID anywhere in the
    render path or in the network payload
  - POPIA compliance comment block at the top of the render function
    explaining what is and is not displayed and why

**Section 4 Campaign ROI is PERMANENTLY DEFERRED** — `loyalty_campaigns`
table does not exist in the live schema. Do NOT attempt to build
Section 4 until a schema owner has designed and created the table
and produced a new spec. The `includeCampaigns: true` option on
`fetchStoreLoyalty` is a no-op in both S1 and S2.

**Session 2 build sequence:**

1. Read `docs/WP-ANALYTICS-5.md` Step 0 addendum in full (LL-221)
2. Verify `loyalty_ai_log` action_type values are still accurate via
   a Supabase MCP query — the nightly engine may have added new
   types between session close and S2 start
3. Extend `fetchStoreLoyalty.js` — unlock `includeAiLogs: true`
   with a second phase of parallel queries (AI log aggregation by
   action_type, top customers trimmed projection). Preserve the
   `Promise.allSettled` error isolation pattern.
4. Extend `CustomerIntelligence.js` — add `AiEngineSection` and
   `TopCustomersSection` helper components, wire into the existing
   render below Section 3
5. `CI=false npm run build` → zero new warnings
6. Paste-bug checklist walk + POPIA network-tab inspection
7. Single commit: `feat(WP-A5/S2): CustomerIntelligence AI engine + top customers`

### Priority 2 — WP-ANALYTICS-6 NuAi Network Intelligence (still blocked)

The final analytics module. **NO DETAILED SPEC YET.** Before any code,
the owner must produce `docs/WP-ANALYTICS-6.md` via the same Claude.ai
strategic spec pattern used for Modules 1-5. Do NOT start Module 6
until the spec is committed to disk per the Analytics Suite Session
Close Protocol. Module 6 is the intelligence layer across all prior
modules — dependencies: all of Modules 1-5 must be production-ready
(S2 for Modules 3, 4, 5).

### Priority 3 — Cross-tenant "View store →" navigation (Phase 4b)

NetworkDashboard, StoreComparison, and StockIntelligence all have
"View store →" buttons wired to `onNavigate` or `console.log`. None
actually switch tenant context. Needs authorisation check +
`switchTenant()` from `tenantService.js` + return path to
`/group-portal`. Read `src/services/tenantService.js` in full before
any code.

### Priority 4 — Transfer pre-selection from StoreComparison / StockIntelligence

`Transfer stock →` / `View transfers →` buttons navigate to the
transfers tab without pre-populating FROM/TO. Needs state passing:
component → GroupPortal → GroupTransfer initial form state.

### Priority 5 — HQTransfer historical AVCO reconciliation

LL-242 forward-fix is done (`713ef3a`). Pre-fix corruption in
destination `weighted_avg_cost` values not retroactively corrected.
Dedicated session: read-only audit query first, owner approval
before any UPDATE, reversal-capable migration.

### Priority 6 — loyalty_campaigns schema design (new)

If the owner decides Campaign ROI is load-bearing for the Customer
Intelligence module, a schema owner must design a `loyalty_campaigns`
table (columns: `id`, `tenant_id`, `name`, `start_date`, `end_date`,
`multiplier`, `status`, `created_at` at minimum) and a new spec for
Section 4 before implementation. This is a pure database + spec
task — no component code changes.

---

## SESSION CLOSE CHECKLIST

When v247 closes (WP-ANALYTICS-5 Session 2 shipped):

1. Update `docs/WP-ANALYTICS.md`:
   - Module 5: `IN PROGRESS — Session 1 HEAD a5134aa` → `✅ COMPLETE — [S2 hash]`
2. Update `docs/WP-ANALYTICS-5.md` header → `✅ COMPLETE — S1 a5134aa · S2 [hash]`
3. Append Addendum 3 to `docs/SESSION-STATE_v240.md`
4. Write `docs/NEXT-SESSION-PROMPT_v248.md` · delete v247
5. Single commit: `docs: WP-ANALYTICS-5 S2 complete + NEXT-SESSION-PROMPT v248`

If Module 6 spec arrives this session, also:
6. Commit `docs/WP-ANALYTICS-6.md` (new file) in a separate commit
   before the session close commit

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `a5134aa`**. Confirm with `git log --oneline -1`.
2. **SESSION-STATE_v240.md is current** with Addendums 1 and 2. Read the baseline + both addendums in order.
3. **6 helpers in `_helpers/`**: fetchStoreSummary · industryBadge · fetchStoreFinancials · fetchStoreTrend · fetchStoreInventory · **fetchStoreLoyalty** (new at `a5134aa`).
4. **Group Portal has 7 non-deferred content tabs live** plus Settings. Module 5 S2 extends Customer Intelligence inline — does NOT add a new tab.
5. **WP-ANALYTICS-5 S1 is DONE.** Don't rebuild. Read the Step 0 addendum for Session 2.
6. **Section 4 Campaign ROI is permanently deferred** — no `loyalty_campaigns` table exists. Do not attempt to build it.
7. **loyalty_ai_log (not ai_action_logs)** and **stock_boost_suggestion (not stock_boost)** — Session 2 Section 5 must use the actual names.
8. **POPIA is non-negotiable for Module 5** — aggregate counts and cohort distributions only. Section 6 Top Customers uses initials + masked UUID only, with a POPIA compliance comment block at the top of the render function.
9. **Tier palette hardcoded** in `CustomerIntelligence.js` with Step 0 rationale — `loyalty_tiers` table does not exist.
10. **Medi Can Dispensary is sparse** (1 user_profiles row at spec time) — S2 verification must handle this honestly, not fake richer data.
11. **RULE 0Q absolute** — Claude.ai never writes to the repo. Claude Code only.
12. **T.* tokens mandatory** (LL-238). Zero hardcoded px matching a token.

---

*NEXT-SESSION-PROMPT_v247.md · 12 April 2026*
*HEAD at write: `a5134aa` · WP-ANALYTICS-5 SESSION 1 COMPLETE · 5 of 6 modules have at least one session shipped*
*Priority 1: WP-ANALYTICS-5 Session 2 · Sections 5 and 6 only · Section 4 permanently deferred*
*POPIA compliance non-negotiable — initials + masked UUID only in Section 6 Top Customers*
