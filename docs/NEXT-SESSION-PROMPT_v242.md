# NEXT SESSION START PROMPT — v242
## Updated: 12 April 2026 (WP-ANALYTICS-1 milestone close)
## HEAD: 8221177 (StoreComparison.js live · first cross-tenant analytics surface)
## Previous prompt: NEXT-SESSION-PROMPT_v241.md (now superseded)

---

## YOUR FIRST 6 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is **8221177** (or later if post-close doc commit)
2. Read **docs/CLAUDE.md** — v2.0 slim+delegate. Still canonical. Do not trust older copies.
3. Read **docs/SESSION-STATE_v239.md** — Addendums **1 + 2 + 3 + 4 + 5** cumulatively. Addendum 5 is the newest and covers the WP-ANALYTICS launch, GroupSettings.js, the LL-242 HQTransfer fix, and StoreComparison.js. Read them in order.
4. Read **docs/WP-ANALYTICS.md** — master suite vision. This is the strategic spine for Modules 2-6. Do not skim it.
5. Read **docs/WP-ANALYTICS-1.md** — Module 1 detailed spec. Context for how Module 2 and onward should be specced.
6. Read **docs/NUAI-AGENT-BIBLE.md** — especially **LL-242 (now marked FIXED)**, **LL-243 (GroupSettings invite gap)**, and all suite-wide rules referenced by WP-ANALYTICS.md: LL-231 (profile-branched revenue), LL-226 (dispensary is_voided), LL-238 (T.* tokens mandatory), LL-221 (read before edit), LL-206 (direct useTenant destructure).

**Do NOT trust any SESSION-STATE older than v239.**
**Do NOT skip the WP-ANALYTICS master document before writing any analytics code — it locks the reporting-vs-analytics distinction and the UX principles every module must honour.**

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with a seven-portal
architecture and a fully functional franchise network layer — the
Group Portal now ships four live tabs including the first genuine
cross-tenant analytics surface (Store Comparison), built on a new
`_helpers/` pattern that every future module in the six-module
WP-ANALYTICS suite will reuse.

---

## WHAT HAPPENED IN THE LAST SESSION (Addendum 5 summary)

**HEAD chain (Addendum 5 only):** `5668e03 → 787b97f → 617a2ac → 713ef3a → 20dff82 → 61632a6 → 30d6c1a → 908a30b → 8221177`

Nine commits, two tracks of work:

### Track A — finish WP-TENANT-GROUPS
1. **`617a2ac`** — GroupSettings.js (1,001 lines). Group identity
   editor (name/type/royalty), member table with owner-only
   removal, Add-a-Store form (owner-only gated per mid-task
   addendum), Danger Zone Leave Network action. Migration:
   `royalty_percentage numeric(5,2) DEFAULT 0 CHECK (0..100)`
   applied via Supabase MCP. LL-243 appended to the Bible
   documenting the email-invite gap as deliberately scoped out.
2. **`713ef3a`** — LL-242 FIXED. HQTransfer.js handleReceive now
   recalculates `weighted_avg_cost` on the destination row when
   the store already carries the SKU. Four coordinated edits
   (state capture, SKU SELECT, name-fallback SELECT, UPDATE with
   formula). Identical math to GroupTransfer's pre-existing fix.
3. **`20dff82`** — doc-only commit adding the fix commit hash
   `713ef3a` to the LL-242 Bible closing note for audit traceability.

### Track B — launch WP-ANALYTICS
4. **`61632a6`** — WP-ANALYTICS master suite document + WP-ANALYTICS-1
   Module 1 spec. 696 lines of permanent specification. The four
   analytics types framework, six UX principles, 10-KPI rule,
   competitive landscape, six-module overview, session-close
   protocol for the suite — all committed before any analytics
   code was written.
5. **`30d6c1a`** — doc correction after Step 0 schema check.
   Owner verified `order_items` columns via Supabase MCP:
   `id, order_id, product_name, quantity, unit_price, line_total,
   product_metadata, created_at`. WP-ANALYTICS-1 topProducts query
   updated to use `SUM(line_total)` over computed `SUM(qty × unit_price)`.
6. **`908a30b`** — Step 1 refactor. `fetchStoreSummary` extracted
   from NetworkDashboard.js into
   `src/components/group/_helpers/fetchStoreSummary.js`. New
   signature: `(tenantId, industryProfile, monthStartISO, options)`
   where `options.includeExtended` is opt-in. NetworkDashboard
   refactored to import the helper with zero regression in its
   Supabase call pattern.
7. **`8221177`** — Step 2. **StoreComparison.js (996 lines).**
   Three sections: Network Summary (4 KPI tiles), Revenue Bar
   Chart (Recharts horizontal BarChart inside ChartCard with
   ReferenceLine, self-tenant highlight, ChartTooltip), and Store
   Comparison Grid (per-store cards with DeltaBadge, InlineProgressBar,
   AOV, stock health, collapsible top-5 products, transfer/view
   actions). Sort control re-orders chart + grid in one gesture.
   `INDUSTRY_BADGE` also extracted to `_helpers/industryBadge.js`
   in the same commit. Three viz prop-signature corrections
   documented against the brief.

### Network change
8. **Second store added to Medi Can Franchise Network** via Supabase
   MCP from the owner's side during this session: **Medi
   Recreational (`b1bad266`)** joined as `franchisee` alongside
   the existing **Medi Can Dispensary (`2bd41eb7`)** franchisor.
   First real cross-store data in production. StoreComparison
   verified in the browser with both stores rendering correctly.

---

## MEDI CAN FRANCHISE NETWORK — CURRENT MEMBERS

| Tenant ID | Name | Role | Industry Profile |
|---|---|---|---|
| `2bd41eb7-...` | Medi Can Dispensary | franchisor | cannabis_dispensary |
| `b1bad266-...` | Medi Recreational | franchisee | cannabis_retail |

Added 12 April 2026. This is now the first production franchise
network with real cross-store data. All StoreComparison features
(revenue bar chart, delta badges, sort re-ranking, grid highlighting)
were verified in the browser against this real data.

**Test credentials:** `medican@nuai.dev` / `MediCan2026!` logs into
`/group-portal` as the franchisor. The dashboard, transfers, compare,
and settings tabs are all live.

---

## CURRENT PRIORITY QUEUE

### Priority 1 — WP-ANALYTICS-2: Combined P&L

**The next analytics module.** This completes the original
WP-TENANT-GROUPS spec — it's the last non-disabled placeholder
in `GroupPortal.js` (lines 392-397, the `financials` tab).

**Process — same as WP-ANALYTICS-1:**

1. **Full pre-build reconnaissance** before any code. Read what
   already exists in the codebase for P&L and financial reporting:
   - `src/components/hq/HQProfitLoss.js` — the tenant-level P&L
     surface, likely the closest existing pattern
   - `src/components/hq/HQCogs.js` — COGS calculation pattern
   - `expenses` table schema via Supabase MCP (confirm column names)
   - What `fetchStoreSummary` already provides vs what a P&L view
     needs (likely: revenue yes, COGS no, expenses no, gross
     profit no, net profit no)
2. **Write `docs/WP-ANALYTICS-2.md`** — the Module 2 detailed spec.
   Follow the WP-ANALYTICS-1 template: reconnaissance findings,
   architectural decisions, data architecture, component spec,
   build sequence. DO NOT write any code until this doc is
   committed.
3. **Build sequence** will likely look like:
   - Step 0: schema check for `expenses` + any COGS-related tables
   - Step 1: extend `fetchStoreSummary` with COGS and expenses OR
     create a new sibling helper (`fetchStoreFinancials.js`) —
     decide before Step 1 which is cleaner
   - Step 2: build `CombinedPL.js` — consolidated network P&L
     with per-store columns, profile-adaptive revenue, IFRS-
     consistent line items, date range selector (MTD / last
     month / last 3 months / YTD), CSV export
   - Step 3: mount in GroupPortal.js (replace the financials
     PlaceholderTab)
   - Step 4: build verification

**Key innovations** the master suite document asks for:
- COGS % auto-flagged when a store runs 2-3% above network
  benchmark (silent profit leak detector)
- Date range selector MTD/last month/last 3mo/YTD
- CSV export
- Profile-adaptive revenue via LL-231 (already handled in
  fetchStoreSummary)

**Scope discipline:** Module 2 is Combined P&L only. It is NOT
Revenue Intelligence (Module 3). Do not build daily trend charts
or SSSG in this module — that's a separate session.

### Priority 2 — Cross-tenant navigation (Phase 4b)

Both NetworkDashboard and StoreComparison store cards have a
`View store →` button that currently `console.log`s a TODO. Needs:
- Authorisation check (user must be a group member AND have access
  to the target tenant)
- Context switch (update TenantContext to the selected tenant_id)
- Return path (way back to the group portal without losing state)

### Priority 3 — Transfer pre-selection from StoreComparison

The `Transfer stock →` button in StoreComparison currently navigates
to the transfers tab without pre-populating the TO store. Needs:
state passing from StoreComparison through GroupPortal into
GroupTransfer's form initial state.

### Priority 4 — HQTransfer historical AVCO reconciliation

LL-242 closes the bug forward; prior corruption is not retroactively
corrected. A dedicated remediation session would walk
`stock_movements` where `type = 'transfer_in'`, recompute
`weighted_avg_cost` per affected destination row from the movement
history, and write the corrected value back. Read-only audit query
first before any UPDATE.

### Priority 5 — WP-ANALYTICS-3 through 6

Each module needs its own detailed spec document (WP-ANALYTICS-3.md,
WP-ANALYTICS-4.md, etc.) written BEFORE the build session for it.
The master suite document gives the one-paragraph pitch for each;
the detailed spec is still to be written.

- **WP-ANALYTICS-3 — Revenue Intelligence** (predictive, SSSG, trend
  charts, daily buckets)
- **WP-ANALYTICS-4 — Stock Intelligence** (heatmap, slow/fast movers,
  AI-identified transfer opportunities)
- **WP-ANALYTICS-5 — Customer & Loyalty Intelligence** (cross-store
  customer graph, churn alerts)
- **WP-ANALYTICS-6 — NuAi Network Intelligence** (daily briefing,
  anomaly detection, best-practice propagation, ai-copilot wiring)

---

## ANALYTICS SUITE SESSION CLOSE PROTOCOL

**Non-negotiable for every WP-ANALYTICS session.** When closing any
session that touches the analytics suite:

1. **Update `docs/WP-ANALYTICS.md`** — change the affected module's
   status line from "IN PROGRESS" or "Pending" to "COMPLETE — HEAD
   [hash]". Update the phased delivery plan table.
2. **Update `docs/WP-ANALYTICS-N.md`** for the affected module —
   change the header status from "SPEC COMPLETE — ready to build"
   or "IN PROGRESS" to "COMPLETE — shipped [hash], verified in
   browser".
3. **Write the NEXT module's detailed spec doc** before closing —
   never leave a module unspecced heading into a new session. The
   point of the per-module spec is that the next agent can build
   from it without needing the previous agent's conversation
   context.
4. **Append a SESSION-STATE addendum** covering what shipped.
5. **Write `NEXT-SESSION-PROMPT_v[N+1].md`** with fresh HEAD and
   priority queue.
6. **Single commit** for all the above with message:
   `docs: WP-ANALYTICS-[N] complete + NEXT-SESSION-PROMPT v[next] — [one-liner]`

This protocol exists because analytics modules have compounding
strategic context (the suite vision, the UX principles, the
competitive framing) that can't be reconstructed from code alone.
The docs ARE the strategic memory.

---

## KNOWN ISSUES (carried forward)

### Still live, documented, not yet fixed:

1. **HQTransfer historical AVCO corruption** — forward-fix landed
   at `713ef3a`, pre-fix destination AVCO values not retroactively
   corrected. LL-242 closing note documents this. Priority 4 above.
2. **Per-line atomicity gap** on ship/receive/cancel in both
   HQTransfer and GroupTransfer. Known issue, documented in LL-242.
3. **Email-based invite for GroupSettings** — LL-243 open. Deferred
   to Phase 5b with an in-UI shortfall note acknowledging the gap.
4. **Cross-tenant View store navigation** — Phase 4b, Priority 2.
5. **Transfer pre-selection from StoreComparison** — Phase 4b
   for GroupTransfer, Priority 3.
6. **Sender email not on brand domain** — blocks on owner external
   action (CIPRO + nuai.co.za purchase in Resend).
7. **`docs/.claude/worktrees/` cleanup** — disk-only `rm -rf`,
   never commit these. Still deferred.

### Resolved in Addendum 5:

- ✅ GroupSettings.js (WP-TENANT-GROUPS Phase 5) — shipped `617a2ac`
- ✅ HQTransfer AVCO bug (LL-242) — shipped `713ef3a`, Bible updated
- ✅ WP-ANALYTICS suite vision — committed `61632a6` as permanent
  strategic memory
- ✅ fetchStoreSummary shared helper pattern — established `908a30b`
- ✅ StoreComparison.js (WP-ANALYTICS-1) — shipped `8221177`
- ✅ Second store in production — Medi Recreational added via
  Supabase MCP, cross-store data verified in browser
- ✅ LL-244 candidate (order_items unverified) — resolved during
  Step 0 schema check before any code was written

---

## TEST CREDENTIALS

- **Medi Can Franchisor (group owner):** `medican@nuai.dev` / `MediCan2026!`
- Logs into `/group-portal` → Medi Can Franchise Network
- Members visible: Medi Can Dispensary (franchisor) + Medi Recreational (franchisee)
- All 4 live tabs functional: Network Dashboard · Stock Transfers · Compare Stores · Group Settings
- Compare Stores shows real cross-store data including delta badges (MTD vs last month)
- **Do NOT re-seed Medi Can** (LL-227 still active)
- **Do NOT remove Medi Recreational** from the network without owner approval — it's the only second store making the analytics view meaningful

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `8221177`** (plus one doc commit this close). Confirm
   with `git log --oneline -1`.
2. **WP-ANALYTICS-1 is DONE.** Store Comparison is the first
   cross-tenant analytics surface in the codebase. Do not rebuild
   it. If you need its pattern, read the file and follow.
3. **`_helpers/` is the shared module pattern** at
   `src/components/group/_helpers/`. Currently:
   `fetchStoreSummary.js` (the per-store data contract) and
   `industryBadge.js` (the profile → badge map). Add new helpers
   beside them — don't duplicate inline.
4. **fetchStoreSummary has opt-in extended mode.** Landing surfaces
   call with 3 args (core only, no landing-page load regression).
   Analytics surfaces pass `{ includeExtended: true,
   lastMonthStartISO, lastMonthEndISO }` as a 4th argument.
5. **WP-ANALYTICS.md is the master vision.** Read it before
   proposing any change to any analytics component. Principles
   non-negotiable: one primary question per screen, progressive
   disclosure, every metric has context, every insight implies an
   action, leading+lagging balance, benchmarking is the value.
6. **Schema facts still canonical:** `orders.total` not
   `total_amount`, `status = "paid"` not `!= "cancelled"`,
   `inventory_items.reorder_level` not `reorder_point`, dispensary
   revenue is `dispensing_log.quantity_dispensed × inventory_items.sell_price`
   excluding `is_voided = true` (LL-231 + LL-226). Top products:
   `order_items.line_total` grouped by `product_name`.
7. **T.* tokens mandatory** (LL-238). `import { T } from
   "../../styles/tokens"`. Zero hardcoded px matching a token.
8. **RULE 0Q absolute** — Claude.ai never calls `push_files` or
   `create_or_update_file`. Claude Code only.
9. **LL-242 is FIXED** in HQTransfer. Do not rebuild the formula
   in any future transfer component — it lives in both
   HQTransfer.handleReceive and GroupTransfer.handleReceive with
   identical math. New transfer components should import nothing
   from either; build a clean parallel with the same formula.
10. **Medi Can Franchise Network has 2 members.** Do not remove
    either. The network is the only production cross-store dataset.

---

## SESSION CLOSE CHECKLIST FOR THE NEXT SESSION

When v242 closes, the closing agent must:

1. If any analytics module was touched, follow the Analytics Suite
   Session Close Protocol above (update WP-ANALYTICS.md + the
   per-module doc + write the next module's spec)
2. Append Addendum 6 to `docs/SESSION-STATE_v239.md`
3. Write `docs/NEXT-SESSION-PROMPT_v243.md` with fresh HEAD
4. Single commit: `docs: SESSION-STATE Addendum 6 + NEXT-SESSION-PROMPT v243 — [one-liner]`
5. Push to origin/main
6. Report the HEAD hash and working-tree status

SESSION-STATE should still stay on v239 until the addendum chain
crosses 5+ addendums OR 2,000+ lines. v239 is at Addendum 5 right
now — the next session can add one more addendum before a clean
v240 SESSION-STATE is appropriate.

---

*NEXT-SESSION-PROMPT_v242.md · 12 April 2026*
*HEAD at write: 8221177 · WP-ANALYTICS-1 COMPLETE · Franchise network: 2 stores live*
*Four of six Group Portal tabs shipped · Only Combined P&L remains for the original WP-TENANT-GROUPS spec*
