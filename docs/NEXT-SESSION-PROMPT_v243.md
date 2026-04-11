# NEXT SESSION START PROMPT — v243
## Updated: 12 April 2026 (WP-ANALYTICS-2 milestone close)
## HEAD: 5ba63b5 (CombinedPL.js live · 5/5 non-deferred Group Portal tabs complete)
## Previous prompt: NEXT-SESSION-PROMPT_v242.md (now superseded)

---

## YOUR FIRST 6 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is **5ba63b5** (or later if post-close doc commit)
2. Read **docs/CLAUDE.md** — v2.0 slim+delegate. Still canonical. Do not trust older copies.
3. Read **docs/SESSION-STATE_v239.md** — Addendums **1 through 6** cumulatively. Addendum 6 is the newest and covers WP-ANALYTICS-2 Combined P&L, the Group Portal reaching full non-deferred tab coverage, and the WP-ANALYTICS-3 spec. Read them in order.
4. Read **docs/WP-ANALYTICS.md** — master suite vision. Read before ANY analytics code.
5. Read **docs/WP-ANALYTICS-3.md** — Module 3 Revenue Intelligence detailed spec. This is the Priority 1 build target.
6. Read **docs/NUAI-AGENT-BIBLE.md** — especially LL-242 (HQTransfer AVCO, still open for historical remediation), LL-243 (GroupSettings invite gap), LL-231 (profile-branched revenue), LL-226 (dispensary is_voided), LL-238 (T.* tokens mandatory), LL-221 (read before edit), LL-206 (direct useTenant destructure).

**Do NOT trust any SESSION-STATE older than v239.**
**Do NOT skip the WP-ANALYTICS master document before writing any analytics code.**

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with a seven-portal
architecture, a fully functional franchise network layer, and two
completed cross-tenant analytics modules — Store Comparison and
Combined P&L — both live against the Medi Can 2-store franchise network.

---

## WHAT HAPPENED IN THE LAST SESSION (Addendum 6 summary)

**HEAD chain (Addendum 6 only):** `8221177 → ec3b5d3 → 5ba63b5`

Two commits:

1. **`ec3b5d3`** — WP-ANALYTICS-2 spec (818 lines, full pre-build reconnaissance).
   Architectural decisions locked: new fetchStoreFinancials helper (not extending
   fetchStoreSummary), order_items AVCO for retail COGS (LL-203), dispensing_log
   × WAC for dispensary COGS (LL-231), loyalty cost excluded with footnote,
   4 pre-set date ranges, COGS% benchmark flag at +2%/+3% above network avg.

2. **`5ba63b5`** — Feature commit (+1,390 / −3). Three new files:
   - `_helpers/fetchStoreFinancials.js` (176 lines): named export, 3 queries per store,
     VAT_RATE = 1.15, expenses filtered by category, contract: never throws
   - `CombinedPL.js` (1,208 lines): 3 sections (KPI tiles, P&L table, store cards),
     COGS% flag with prescriptive text, 4 date-range pills, client-side CSV export,
     loyalty exclusion footnote, zero new build warnings
   - `GroupPortal.js` (+8/−5): PlaceholderTab replaced, CombinedPL imported

   Browser verified: both Medi Can stores render with correct COGS paths,
   flag logic fires, date range triggers fresh fetch, CSV downloads correctly.

**WP-ANALYTICS-3 spec also committed** as part of the session close protocol.

---

## GROUP PORTAL — CURRENT STATE

| Tab | Component | Status |
|---|---|---|
| Network Dashboard | NetworkDashboard.js | ✅ Live |
| Stock Transfers | GroupTransfer.js | ✅ Live (AVCO-correct) |
| Compare Stores | StoreComparison.js | ✅ Live |
| Combined P&L | CombinedPL.js | ✅ Live (Addendum 6) |
| Shared Loyalty | disabled nav | Phase 2+ deferred |
| Group Settings | GroupSettings.js | ✅ Live |
| Revenue Intelligence | not yet built | **Priority 1 this session** |

The original WP-TENANT-GROUPS spec is functionally complete.
WP-ANALYTICS-3 will add a 7th tab (Revenue Intelligence).

---

## MEDI CAN FRANCHISE NETWORK — CURRENT MEMBERS

| Tenant ID | Name | Role | Industry Profile |
|---|---|---|---|
| `2bd41eb7-...` | Medi Can Dispensary | franchisor | cannabis_dispensary |
| `b1bad266-...` | Medi Recreational | franchisee | cannabis_retail |

Test credentials: `medican@nuai.dev` / `MediCan2026!` → `/group-portal`
All 5 non-deferred tabs confirmed live and functional.

---

## CURRENT PRIORITY QUEUE

### Priority 1 — WP-ANALYTICS-3: Revenue Intelligence (Session 1)

Spec: `docs/WP-ANALYTICS-3.md` (read it before writing any code).

Primary question: "Is my network growing or shrinking, and where?"

Session 1 scope (core — ~900 lines, 1 build session):

**Pre-build: Step 0 schema check (before any code)**
```sql
-- Verify timestamps are timestamptz (not date)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('orders', 'dispensing_log')
  AND column_name IN ('created_at', 'dispensed_at');

-- Check order volume in 90d window per store
SELECT tenant_id, count(*) FROM orders
WHERE status = 'paid' AND created_at >= now() - interval '90 days'
GROUP BY tenant_id;
```
If any store has > 10,000 orders in 90 days: do NOT use client-side bucketing —
switch to Supabase RPC aggregation for that store. Document before building.

**Step 1:** Create `src/components/group/_helpers/fetchStoreTrend.js`
- Signature: `fetchStoreTrend(tenantId, industryProfile, windowDays = 30)`
- Returns: `{ tenantId, rows: [{date, hour, dayOfWeek, revenue}], orderCount, err }`
- Retail: orders WHERE status='paid', revenue = total / 1.15
- Dispensary: dispensing_log, is_voided != true, revenue = qty × sell_price
- Client-side bucketing helpers: toDailyBuckets, calcSSSGMoM, calcSSSGWoW

**Step 2:** Build `src/components/group/RevenueIntelligence.js` (Session 1 scope)
- Section 1: 4 KPI tiles (Network Rev MTD · MoM SSSG · WoW SSSG · Top Growth Store)
- Section 2: Revenue trend overlay LineChart (all stores, 30/60/90d toggle)
- Section 3: Per-store SSSG cards with mini bar sparkline (last 7 days)
- Window toggle: [30d] [60d] [90d] pills
- Colour palette for multi-line chart: defined in spec (T.accent + 5 other colours)

**Step 3:** Add to GroupPortal.js
- NAV_ITEMS: `{ id: "revenue", label: "Revenue Intelligence" }` after "financials"
- Tab router: `{activeTab === "revenue" && <RevenueIntelligence ... />}`

**Step 4:** Build verification + browser check
- Trend overlay chart shows two lines (one per Medi Can store)
- SSSG tiles render (dispensary may show low/null due to 14 events — expected)
- Window toggle re-fetches data

Session 2 scope (predictive + peak — next session after S1 is live):
- Predictive month-end projection card per store
- Peak trading heat matrix (7×14 hour grid)
- CSV export of SSSG summary
- Top products per store panel

### Priority 2 — Cross-tenant navigation (Phase 4b)

Both NetworkDashboard and StoreComparison have `View store →` buttons that
currently `console.log` a TODO. Needs:
- Authorisation check (user must be a group member with access to the target tenant)
- Context switch (update TenantContext to the selected tenant_id)
- Return path (way back to /group-portal without losing tab state)

Read `src/services/tenantService.js` in full (LL-221) before attempting this.
`switchTenant()` is the hook — understand its exact behaviour before using it.

### Priority 3 — Transfer pre-selection from StoreComparison

The `Transfer stock →` button in StoreComparison currently navigates to
the transfers tab without pre-populating the TO store. Needs:
state passing from StoreComparison through GroupPortal into GroupTransfer's
initial form state.

### Priority 4 — HQTransfer historical AVCO reconciliation

LL-242 closes the bug forward; prior corruption is not retroactively corrected.
A dedicated remediation session: walk stock_movements WHERE type = 'transfer_in',
recompute weighted_avg_cost per affected destination row from the movement history,
write corrected values back. READ-ONLY audit query FIRST before any UPDATE.

### Priority 5 — WP-ANALYTICS-4 through 6

Each needs its own detailed spec before build session:

- **WP-ANALYTICS-4 — Stock Intelligence** (network heatmap, slow/fast movers, transfer opportunities)
- **WP-ANALYTICS-5 — Customer & Loyalty Intelligence** (cross-store customer graph, churn alerts)
- **WP-ANALYTICS-6 — NuAi Network Intelligence** (daily briefing, anomaly detection, ai-copilot wiring)

Write WP-ANALYTICS-4.md when closing the WP-ANALYTICS-3 S1 session.

---

## ANALYTICS SUITE SESSION CLOSE PROTOCOL

Non-negotiable for every WP-ANALYTICS session:

1. Update **docs/WP-ANALYTICS.md** — affected module status line
2. Update **docs/WP-ANALYTICS-N.md** for the shipped module — status to COMPLETE
3. Write the NEXT module's detailed spec doc before closing (if not already written)
4. Append SESSION-STATE addendum
5. Write **NEXT-SESSION-PROMPT_v[N+1].md**
6. Single commit: `docs: WP-ANALYTICS-[N] complete + NEXT-SESSION-PROMPT v[next]`

---

## KNOWN ISSUES (carried forward)

1. ✅ HQTransfer AVCO forward-fix landed (713ef3a) — historical data not remediated (Priority 4)
2. Per-line atomicity gap in HQTransfer + GroupTransfer. LL-242 open.
3. GroupSettings email-invite gap. LL-243 open.
4. Cross-tenant "View store" navigation — Priority 2.
5. Transfer pre-selection from StoreComparison — Priority 3.
6. Sender email not on brand domain — pending CIPRO + nuai.co.za.
7. `docs/.claude/worktrees/` disk cleanup — rm -rf, never commit, still deferred.

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `5ba63b5`**. Confirm with `git log --oneline -1`.
2. **WP-ANALYTICS-1 and WP-ANALYTICS-2 are DONE.** Do not rebuild them.
3. **`_helpers/` has 3 siblings**: fetchStoreSummary · industryBadge · fetchStoreFinancials. The new helper for Module 3 is `fetchStoreTrend.js` — add it beside them.
4. **fetchStoreSummary extended mode provides** MTD revenue, last-month revenue, top products. For SSSG and trend charts, the new `fetchStoreTrend.js` is needed (raw timestamped rows).
5. **WP-ANALYTICS.md is the master vision.** Read it before proposing any change.
6. **Schema facts still canonical:** `orders.total` not `total_amount`, `status = "paid"`, `inventory_items.reorder_level` not `reorder_point`, dispensary revenue is `dispensing_log.quantity_dispensed × inventory_items.sell_price` excluding `is_voided = true` (LL-231 + LL-226). VAT_RATE = 1.15 always applied to orders.total.
7. **T.* tokens mandatory** (LL-238). Import `{ T }` from `"../../styles/tokens"`. Zero hardcoded px matching a token.
8. **RULE 0Q absolute** — Claude.ai never calls push_files or create_or_update_file.
9. **LL-242 is FIXED forward** in HQTransfer. GroupTransfer already had the correct formula. Do not propagate the old broken pattern.
10. **Medi Can has 2 stores.** Do not remove either. Both are needed for cross-store analytics to be meaningful.

---

## SESSION CLOSE CHECKLIST FOR THE NEXT SESSION

When v243 closes (WP-ANALYTICS-3 S1 shipped):

1. Update WP-ANALYTICS.md Module 3 status to "IN PROGRESS — HEAD [hash]"
2. Update WP-ANALYTICS-3.md status to "IN PROGRESS — Session 1 HEAD [hash]"
3. Write WP-ANALYTICS-4.md (Stock Intelligence detailed spec)
4. Append Addendum 7 to docs/SESSION-STATE_v239.md
5. Write docs/NEXT-SESSION-PROMPT_v244.md
6. Single commit: `docs: WP-ANALYTICS-3 S1 complete + NEXT-SESSION-PROMPT v244`

Note: SESSION-STATE_v239 is now at Addendum 6. The next session can add Addendum 7.
Consider starting SESSION-STATE_v240 fresh after Addendum 7 — the v239 file is
getting long and a clean v240 would be easier for future agents to absorb.

---

*NEXT-SESSION-PROMPT_v243.md · 12 April 2026*
*HEAD at write: 5ba63b5 · WP-ANALYTICS-2 COMPLETE · 5/5 non-deferred Group Portal tabs live*
*WP-ANALYTICS-3 spec committed · Revenue Intelligence ready to build*
