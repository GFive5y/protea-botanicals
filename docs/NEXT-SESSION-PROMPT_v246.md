# NEXT SESSION START PROMPT — v246
## Updated: 12 April 2026 (WP-ANALYTICS-4 complete · Module 5 next)
## HEAD: `e55961f` (StockIntelligence S1+S2 live · 4 of 6 analytics modules complete)
## Previous prompt: NEXT-SESSION-PROMPT_v245.md (superseded — deleted in the same commit)

---

## YOUR FIRST 6 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is **`e55961f`** (or later if post-close doc commit)
2. Read **docs/CLAUDE.md** — v2.0 slim+delegate. Canonical.
3. Read **docs/SESSION-STATE_v240.md** — now has Addendum 1 appended covering WP-A4/S2. Read the baseline snapshot AND Addendum 1 in order. v239 is frozen historical reference — do not touch it.
4. Read **docs/WP-ANALYTICS.md** — master suite vision. Module 5 is the only outstanding spec-complete module; Module 6 has no detailed spec yet and is out of scope until the owner produces one via the same Claude.ai strategic spec pattern.
5. Read **docs/WP-ANALYTICS-5.md** — 570-line Module 5 detailed spec. **This is the Priority 1 build target.** The Step 0 schema check (8 SQL queries) is the first action before a single line of code is written.
6. Read **docs/NUAI-AGENT-BIBLE.md** — especially LL-242, LL-243, LL-238, LL-221, LL-206, LL-231, LL-226, LL-203. All still current. **POPIA** is newly load-bearing for Module 5 — aggregate counts and cohort distributions only, no individual customer PII in the Group Portal view.

**SESSION-STATE is at Addendum 1 on v240. Future closes append to v240, not v239.**

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with seven portals and an
AVCO-correct, profile-adaptive franchise analytics suite where 4 of 6
modules are complete (Store Comparison, Combined P&L, Revenue
Intelligence, Stock Intelligence — all verified against the live Medi
Can Franchise Network) and Module 5 Customer & Loyalty Intelligence is
spec-ready for Session 1 build.

---

## WHAT HAPPENED LAST SESSION (v245 — Addendum 1 of v240 summary)

**HEAD chain (v245 session only):** `fa207c7 → e237fdd → c724432 → 01f0111 → e55961f → [this doc commit]`

Five code/doc commits, one integration session:

1. **`e237fdd`** — `docs/WP-ANALYTICS-5.md` committed (570 lines). Module 5 Customer & Loyalty Intelligence detailed spec from the Claude.ai strategic spec session. POPIA compliance rules, fetchStoreLoyalty helper spec, three-section Session 1 scope, three-section Session 2 roadmap, Step 0 schema check (8 SQL queries), browser verification checklist.

2. **`c724432`** — Three strategic memory docs updated to reflect Module 5 spec arrival. WP-ANALYTICS.md Module 5 status: `Pending` → `SPEC COMPLETE — ready for Session 1 · e237fdd`. SESSION-STATE_v240.md Module 5 row: same. NEXT-SESSION-PROMPT_v245.md Priority 2: `SPEC PENDING FROM CLAUDE.AI` + 4-line "Do NOT start Module 5" gate → `SPEC COMPLETE` with Step 0 + POPIA pointers. Six edits total; the gate is fully lifted across all three docs with zero internal contradiction.

3. **`01f0111`** — `docs/WP-ANALYTICS-4.md` S2 gap closure addendum appended (345 lines). Produced by the Claude.ai spec review before S2 build start. Six gaps locked: Gap 1 dispensary velocity sourcing (branch on industryProfile), Gap 2 cross-store SKU join key (honest empty state when no shared keys), Gap 3 fast movers filter + cap + edge cases, Gap 4 network insight banner decision, Gap 5 dead stock full UI spec, Gap 6 reorderQty null guard.

4. **Step 0 schema verification via Supabase MCP:**
   - **Step 0-A:** Medi Can Dispensary has **0 sale_* rows in stock_movements** but **14 dispensing_log rows**. Dispensary branch is MANDATORY — retail-only velocity query would silently return empty. Verified live.
   - **Step 0-B:** Zero cross-store join key columns beyond `sku`; zero shared SKUs across the current network (MC-* vs MED-* prefixes). Transfer opportunity engine renders honest empty state for the whole network.

5. **`e55961f`** — feat(WP-A4/S2): 1,677 insertions / 201 deletions across two files. Extends `fetchStoreInventory.js` with `includeVelocity` opt-in mode (profile-branched velocity query + per-item velocity enrichment + 4 new summary counters + velocityErr isolation). Rewrites `StockIntelligence.js` to add `NetworkInsightBanner`, `FastMoversSection`, `TransferOpportunitiesSection`, `DeadStockSection`, plus 5 new helpers (`fmtPct`, `fmtDaysOfStock`, `fmtMonthlyRate`, `getAgeBand`, `buildTransferOpportunities`). S1 components preserved bit-for-bit per Gap 5's "keep both" decision.

Browser verification confirmed all four S2 features against the Medi
Can network:
- Network Insight Banner with critical restock + dead stock capital
- Fast Movers populated on BOTH stores (**dispensary branch confirmed live**)
- Transfer Opportunities honest empty state
- Dead Stock Breakdown with age bands and local flag toggle

Paste-bug checklist caught one dead-code issue (fastMovers +
sellingWithNoStock accumulators in the network useMemo with no
consumer) and cleaned it before commit. ESLint wouldn't have flagged
it because dead object properties don't trigger `no-unused-vars`; the
checklist spirit caught it.

---

## GROUP PORTAL — CURRENT STATE

| Tab | Component | Status |
|---|---|---|
| Network Dashboard | NetworkDashboard.js | ✅ Live |
| Stock Transfers | GroupTransfer.js | ✅ Live (AVCO-correct) |
| Compare Stores | StoreComparison.js | ✅ Live |
| Combined P&L | CombinedPL.js | ✅ Live |
| Revenue Intelligence | RevenueIntelligence.js | ✅ Live (S1+S2) |
| Stock Intelligence | StockIntelligence.js | ✅ Live (S1+S2 as of `e55961f`) |
| **Customer Intelligence** | **not yet built** | **Priority 1 this session** |
| Shared Loyalty | disabled nav | Phase 2+ deferred |
| Group Settings | GroupSettings.js | ✅ Live |

Module 5 adds a **new** 8th entry (7th content tab + Settings) to
`NAV_ITEMS` after Stock Intelligence. The WP-ANALYTICS-5 spec explicitly
says to position it as `nav id: "customers"` after `stock`.

---

## MEDI CAN FRANCHISE NETWORK — CURRENT MEMBERS

| Tenant ID | Name | Role | Industry Profile |
|---|---|---|---|
| `2bd41eb7-1a6e-416c-905b-1358f6499d8d` | Medi Can Dispensary | franchisor | cannabis_dispensary |
| `b1bad266-ceb4-4558-bbc3-22cfeeeafe74` | Medi Recreational | franchisee | cannabis_retail |

Test credentials: `medican@nuai.dev` / `MediCan2026!` → `/group-portal`
All 6 non-deferred content tabs plus Settings confirmed live.

---

## PASTE-BUG CHECKLIST (apply to every Claude.ai-generated component)

1. **INDUSTRY_BADGE** — data object `{bg, fg, label}`, NOT a React component. Use IndustryPill or inline styled span. Never `<BadgeComp />`.
2. **Unused props** — add `void propName;` for any destructured prop not referenced in the body. Common: `groupId`, `onNavigate`.
3. **groupName in header** — every Group Portal component shows `· {groupName}`. Missing = consistency bug.
4. **Unused variables** — check every `const` for actual usage. The build checker catches top-level dead variables; dead object properties (like the fastMovers/sellingWithNoStock catch in v245) need manual walking.
5. **Chart Line name props** — always `<Line name={m.tenants?.name}>`. Never `<Line name={m.tenant_id}>` (UUID leak in tooltip).

**Module 5 addition:** **POPIA — no individual customer PII in the Group Portal view.** Aggregate counts + cohort distributions only. The `top_customers` section in the deferred S2 scope will use initials + masked tenant_id suffix only; S1 does not render any customer-identifying field. Browser devtools network-tab inspection during verification should confirm no query returns `email`, `phone`, or `name` columns in the response payload.

---

## CURRENT PRIORITY QUEUE

### Priority 1 — WP-ANALYTICS-5 Session 1: Customer & Loyalty Intelligence

**Spec:** `docs/WP-ANALYTICS-5.md` (570 lines, committed at `e237fdd`). Read in full (LL-221) before any code.

**Primary question:** How is the loyalty programme performing across the whole franchise network, and where are the churn signals?

**Step 0 — mandatory schema check (8 SQL queries in the spec):**

Run via Supabase MCP before writing a single line:

1. `customers` table columns — confirm `id, tenant_id, email/phone, created_at, total_points, tier_id, last_purchase_at` exist. If named `profiles` or `loyalty_members`, note actual name and adjust the helper.
2. `loyalty_transactions` columns — `id, tenant_id, customer_id, points, transaction_type, source, created_at`. Confirm `transaction_type` enum values (earn/redeem/expire/adjust).
3. `loyalty_tiers` columns — `id, tenant_id, name, min_points, multiplier, colour` (or `color`). Tier colours must come from DB, never hardcoded.
4. `loyalty_campaigns` columns (S2 use) — `id, tenant_id, name, start_date, end_date, multiplier, status, points_issued`.
5. `ai_action_logs` columns (S2 use) — `id, tenant_id, customer_id, action_type, result, created_at`. Check for `churn_rescue`, `birthday_bonus`, `stock_boost`, `point_expiry` action_type values. 189 records referenced in PLATFORM-OVERVIEW at spec time.
6. `orders.customer_id` linkage for customer-to-purchase join.
7. `scan_logs.customer_id` linkage for loyalty scan events.
8. Live cohort snapshot query — per-tenant totals of new/active/at-risk/lapsed/dormant members.

**Report all 8 results BEFORE writing code.** If any column differs from expected, use actual names. If any table doesn't exist, mark the section that queries it as deferred and report to owner. Do not assume, do not alias silently.

**Session 1 build sequence (from the spec):**

1. Step 0 schema check
2. Create `src/components/group/_helpers/fetchStoreLoyalty.js` — 2 queries per store (customer cohort snapshot + points economy), parallel via `Promise.all`, client-side cohort derivation (isNew / isActive / isAtRisk / isLapsed / isDormant), never throws, options object reserved for S2 (`includeAiLogs`, `includeCampaigns`)
3. Build `CustomerIntelligence.js` Section 1 (4 KPI tiles — Total Members, Active This Month, At-Risk, Points Economy redemption rate)
4. Section 2 (Loyalty Tier Distribution by store — per-store cards with tier bar segments)
5. Section 3 (Cohort Health by Store — collapsible per-store cohort breakdown with churn insight line)
6. CSV export helper (8 columns, reuse the pattern from `downloadSSSGCsv` in RevenueIntelligence)
7. Data quality footnote
8. Wire GroupPortal.js — 3 surgical edits (import, NAV_ITEMS position after `stock`, tab router block before the loyalty/deferred placeholder)
9. `CI=false npm run build` → zero new warnings
10. Paste-bug checklist walk (including POPIA verification)
11. Single commit: `feat(WP-A5/S1): CustomerIntelligence — cohort health, tier distribution, points economy`

**Session 2 roadmap (do not build in S1):** Section 4 Campaign ROI · Section 5 AI Engine Activity · Section 6 Top Customers per store (POPIA-safe with initials + masked UUID only).

### Priority 2 — WP-ANALYTICS-5 Session 2 (after S1 ships)

S2 unlocks the options flags on `fetchStoreLoyalty` (`includeAiLogs`, `includeCampaigns`) and adds the three deferred sections. No new schema work — all tables were verified in S1's Step 0.

### Priority 3 — WP-ANALYTICS-6 NuAi Network Intelligence (after Module 5 ships)

The final analytics module. NO DETAILED SPEC YET. Before any code, the owner must produce the WP-ANALYTICS-6.md spec via the same Claude.ai strategic spec pattern. Do NOT start Module 6 until the spec is committed to disk per the Analytics Suite Session Close Protocol.

### Priority 4 — Cross-tenant "View store →" navigation (Phase 4b)

NetworkDashboard, StoreComparison, and StockIntelligence all have "View store →" / "View transfers →" buttons wired to `onNavigate` or console.log. None actually switch tenant context. Needs authorisation check + `switchTenant()` from `tenantService.js` + return path to `/group-portal`. Read `src/services/tenantService.js` in full before any code.

### Priority 5 — Transfer pre-selection from StoreComparison / StockIntelligence

`Transfer stock →` / `View transfers →` buttons navigate to the transfers tab without pre-populating FROM/TO. Needs state passing: component → GroupPortal → GroupTransfer initial form state.

### Priority 6 — HQTransfer historical AVCO reconciliation

LL-242 forward-fix is done (`713ef3a`). Pre-fix corruption in destination `weighted_avg_cost` values not retroactively corrected. Dedicated session: read-only audit query first, owner approval before any UPDATE, reversal-capable migration.

---

## SESSION CLOSE CHECKLIST

When v246 closes (WP-ANALYTICS-5 Session 1 shipped):

1. Update `docs/WP-ANALYTICS.md`:
   - Module 5: `SPEC COMPLETE — ready for Session 1 · e237fdd` → `IN PROGRESS — Session 1 HEAD [hash]`
2. Update `docs/WP-ANALYTICS-5.md` header → `IN PROGRESS — Session 1 HEAD [hash] · Session 2 pending`
3. Write/update any Module 6 detailed spec if the owner has produced it via Claude.ai
4. Append Addendum 2 to `docs/SESSION-STATE_v240.md` (this would be the second addendum of v240)
5. Write `docs/NEXT-SESSION-PROMPT_v247.md` · delete v246
6. Single commit: `docs: WP-ANALYTICS-5 S1 complete + NEXT-SESSION-PROMPT v247`

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `e55961f`**. Confirm with `git log --oneline -1`.
2. **SESSION-STATE_v240.md is current** and has Addendum 1 appended. Read the baseline + Addendum 1 in order.
3. **5 helpers in `_helpers/`**: fetchStoreSummary · industryBadge · fetchStoreFinancials · fetchStoreTrend · fetchStoreInventory. Module 5 adds `fetchStoreLoyalty.js` as the sixth.
4. **Group Portal has 7 non-deferred tabs live** (6 content + Settings). Module 5 will bring it to 8 (7 content + Settings).
5. **WP-ANALYTICS-4 is DONE.** Don't rebuild. Read the file if you need the pattern.
6. **WP-ANALYTICS-5 spec is on disk** at `docs/WP-ANALYTICS-5.md` committed `e237fdd`. Step 0 schema check is the first action.
7. **POPIA is non-negotiable for Module 5** — aggregate counts and cohort distributions only. No individual customer PII (email, phone, full name) in the Group Portal view.
8. **Dispensary velocity branch works** — `fetchStoreInventory.js` profile-branched query, Step 0-A confirmed mandatory, browser-verified at `e55961f`. Module 5's `fetchStoreLoyalty.js` may need similar branching — depends on whether dispensary loyalty uses `customers` or a separate `patients` table. Step 0 will reveal it.
9. **Tier colours come from the DB** — never hardcode bronze/silver/gold/platinum. Read from `loyalty_tiers.colour` column. Fallback palette in the spec only if the column is null.
10. **Dormant members are a signal** — never suppress zero-purchase members from counts. They're a real business datum.
11. **RULE 0Q absolute** — Claude.ai never writes to the repo. Claude Code only.
12. **T.* tokens mandatory** (LL-238). Zero hardcoded px matching a token.

---

*NEXT-SESSION-PROMPT_v246.md · 12 April 2026*
*HEAD at write: `e55961f` · WP-ANALYTICS-4 COMPLETE · 4 of 6 modules shipped*
*Priority 1: WP-ANALYTICS-5 Session 1 · Step 0 schema check is the first action*
*POPIA compliance non-negotiable for Module 5 — aggregate only, no PII*
