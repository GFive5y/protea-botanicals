# NuAi Decision Journal
## Living record of WHY decisions were made
## Newest entries at top. Add at session close (Step 7).

---

## S-post-2A.6 — 18 April 2026 — Phase 2A closure + Phase 2B scope locked

### Phase 2A closed as 6 PRs (original plan was 4)

PR breakdown:
- 2A.1 (31e93d3): SmartInventory scaffolding — food/TileView, ListView, ViewToggle
- 2A.2 (7f42ad8): PillNav, KPIStrip, SmartSearch (FNB_PILL_HIERARCHY wired)
- 2A.3 (a14f84d): Sort, bulk select, CSV export, realtime, column picker
- 2A.4 (173df3a): FoodWorld banner fix, tile size S/M/L, dedup
- 2A.5 (0ab918f): Row CRUD (Edit/Archive/Delete), audit placemarker, DELETE RLS policy
- 2A.6 (3a7ab6e): DS6 compliance — Part 16 table spec, "lines stop short" on FoodListView

Net: +2,072 lines / -657 lines across 6 PRs, shipped over 3 sessions.
HQFoodIngredients.js went from 5,150 to 5,053 lines despite gaining ~250
lines of functionality via component extraction.

What under-scoped:
- Single-row CRUD (Edit/Archive/Delete) — added in 2A.5
- Audit placemarker + WP-AUDIT-UNIFY work-package — added in 2A.5
- DS6 table compliance on FoodListView — added in 2A.6 (catch-up: 2A.1
  shipped card wrapper without padding "0 16px", violation noticed only
  when owner flagged "Excel box" feel post-2A.5)

Decision: do not amend parent doc to retroactively show 6 PRs. The split
plan WP-TABLE-UNIFY_PHASE2_2A-SPLIT_v1.md is ground truth for what
originally scoped; this journal entry records what actually shipped.

### Phase 2B scope locked — ready for execution

Doc produced: WP-TABLE-UNIFY_PHASE2B-SPLIT_v1.md (this commit)

Architectural decision superseding parent doc Section 6.2:
Option 1 (extend process-document EF v61 -> v62) chosen over Option B
(new ingest-ingredient EF). Rationale: process-document already
industry-aware, fingerprint + dedup + SARS infrastructure lives there,
sibling EF would duplicate ~500 lines.

Owner decisions:
- Option 1 confirmed
- Cronometer/USDA nutrition autofill dropped (SA needs DAFF data, no public API)
- Mobile Smart Capture for ingredients -> Phase 2F, UI placemarker in 2B.3 modal
- Scope now with caveats called out (7 caveats in split plan)

Migration for 2B.1 applied via Supabase MCP:
  ingredient_ingest_queue: 15 cols, 3 indexes, 5 RLS policies
  Verified helpers: is_hq_user(), is_staff_or_admin(), user_tenant_id()

Phase 2B split: 2B.1 migration + docs (THIS), 2B.2 process-document v62
(~5h, highest risk), 2B.3 HQ modal (~3h), 2B.4 review UI (~3.5h),
2B.5 gate PR (~1h). Total: ~14h.

Anomaly closure: parent doc Section 0.5 recipe anomaly resolved. 4 Garden Bistro
recipes in status=approved have zero line items — seeded shells, not FK drift.

Technical debt opened: WP-EF-MODULES, WP-EF-LL120-RECONCILE, WP-IMAGE-HASH-REAL.

**Fresh at close:** Yes.

---

## S320 — 18 April 2026 — RLS incident: platform-wide login break + fix

**Context:** During PR 2A.1 gate verification, owner discovered admin@protea.dev
login routing to /admin instead of /hq, and fivazg@gmail.com not working.
DevTools revealed 500 errors across all user_profiles queries with PostgreSQL
error 42P17 "infinite recursion detected in policy for relation user_profiles".
Platform-wide auth break.

**Root cause:** `tenant_admins_own_users` policy on user_profiles contained
an inline subquery against user_profiles in its USING clause. RLS evaluation
re-triggered the same policy = recursion. Classic LL-262 pattern but on the
root auth table. Policy pre-existed S320 work; the morning addition of
`hq_all_food_ingredients` may have altered RLS evaluation order enough to
surface the dormant recursion. Unprovable, but the timing is suspicious.

**Fix applied:** DROP + CREATE of the policy using `user_tenant_id()`
SECURITY DEFINER helper instead of inline subquery. One migration
(`s320_fix_user_profiles_recursion_ll262`). Login restored immediately.

**Alternative considered:** Move admin@protea.dev to the operator tenant to
resolve the routing ambiguity first. Rejected — diagnose before mutating.
The routing issue was a symptom, not the cause. Tenant-move would have masked
the recursion without fixing it.

**Alternative considered:** Unsuspend fivazg@gmail.com as the quick path back
to HQ login. Rejected — don't unsuspend blindly. The suspension might have
been deliberate.

**Almost-mistake avoided:** Initially wanted to apply the fix immediately.
Owner's "stop, think about what else this affects" intervention led to
Audit 1 + Audit 2, which surfaced LL-301 (operational fragility across
~100 policies). Without the pause, we would have fixed one policy and
moved on, missing the pattern.

**Calibration update:** The S294-S314 campaign declared "Tier 2C complete"
but did not catch this bug. LL-301 captures why: structural audits !=
operational audits. Every completion declaration going forward needs both.

**Fresh at close:** Yes.

---

## S320 — 18 April 2026 — Two-HQ architecture: capture before it decays

**Context:** During PR 2A.1 scoping, decision needed on whether
`hq_all_food_ingredients` should use `is_hq_user()` (matching 8+ existing
tables) or a new tighter `is_platform_operator()` helper. Owner clarified
architecture that was never written down:
- Every tenant eventually gets a "Tenant HQ" portal (their command centre)
- "Platform HQ" (Nu Ai Pty Ltd) sits above all tenants, cross-tenant visibility
- Today's `hq_access` boolean conflates the two because only the owner has it

**Decision:** Option A now (use `is_hq_user()` matching existing pattern),
log WP-HQ-GRANULARITY as trigger-gated backlog item. Migration path is
clean because every `hq_all_*` policy calls the helper function, not the
raw column — changing the function body migrates all tables simultaneously.

**Alternative considered:** Option 2 now (platform-wide enum migration with
`is_platform_operator()` / `is_tenant_hq()` helpers). Rejected — premature
optimisation. No real customer needs tenant-HQ distinction today. The 8+
tables with hq_access bypass would all need classification, and the churn
exceeds any current benefit.

**Alternative considered:** Option 3 (hybrid — new helper for new tables,
keep existing). Rejected — creates two classes of HQ policy indefinitely.
Every future agent has to remember which helper applies where. Subtle bug
factory.

**Captured as:** PLATFORM-OVERVIEW_v1_0.md S320 addendum ("Two-HQ
architecture clarification"). This is the first time the distinction
appears in any loop doc. Before today, every agent was working from the
same latent assumption as the owner — Platform HQ and Tenant HQ are the
same thing. They are not.

**Trigger for WP-HQ-GRANULARITY execution:** Any decision to grant
`hq_access=true` to a non-platform-operator user. The moment that
decision forms, this WP must ship BEFORE the grant.

**Fresh at close:** Yes.

---

## S320 — 18 April 2026 — Principle 7 + Procedure 6: execution rhythm as system

**Context:** Owner articulated that multi-sub-phase WPs kept drifting because
the rhythm between Claude.ai planner and Claude Code executor was not named.
RULE 0Q says planner can't push. LL-299 says planner/executor split catches
more bugs. But neither describes the per-sub-phase cycle: step back -> scope
-> executor ships -> planner reviews -> next sub-phase.

**Decision:** Name the rhythm. LOOP-PRINCIPLES.md Principle 7 captures the
philosophy (planner and executor are different agents by design).
AGENT-METHODOLOGY.md Procedure 6 captures the operational six-step cycle.
AGENT-ORIENTATION.md points to both so new agents see it at session start.

**Alternative considered:** Inline the rhythm into RULE 0Q. Rejected — RULE 0Q
is about what not to do (the push prohibition). Principle 7 is about what to
do (the positive pattern). Different registers, different doc types.

**Alternative considered:** Leave it ad-hoc; rely on agents to develop the
rhythm organically. Rejected — organic development took 320 sessions to
surface this pattern. Naming it saves every future agent that discovery time.

**Almost-mistake avoided:** Initially wanted to write the scope for 2A.1
and hand off without first reviewing whether the S293 scope doc was still
accurate. Owner's "step back, look at bigger picture" intervention caught
that. The food_ingredients vs inventory_items drift was real (S293 scoped
wrong table). Had we not paused, PR 2A.1 would have built against the
wrong spec and we'd have discovered it mid-execution.

**Fresh at close:** Yes.

---

## S320 — 18 April 2026 — PR 2A.1 ships: scaffolding + ViewToggle + List + Tile

**Context:** First code PR of WP-TABLE-UNIFY Phase 2A. Plan called for
extracting tile render and building list view. Disk inspection showed
existing render IS a list/table — so FoodListView is the extraction,
FoodTileView is net-new.

**Decision:** Correct the scope description inline in the Claude Code
instruction block rather than amending the split plan doc. Estimate
unchanged (~4h). Same deliverables, corrected work distribution.

**Result:** Commit 31e93d3. Three new files under src/components/hq/food/
(ViewToggle 55L, FoodListView 188L, FoodTileView 210L). HQFoodIngredients.js
dropped 197 lines (cleaner than estimated 150). Build passed, smoke test
across all 5 tenants confirmed by owner:
- Garden Bistro (160 items): tile + list + toggle work
- Nourish Kitchen (121 seeded): tile + list + toggle work
- Medi Recreational, MediCare, Metro Hardware: tab correctly hidden

**Debt logged for 2A.4:** Component map comment block at top of
HQFoodIngredients.js still lists viewMode as "MISSING" and references
old line numbers (L3185/L3228/L3273 now shifted by ~200 lines).
Pure documentation — will be fixed when PR 2A.4 updates the map wholesale.

**Fresh at close:** Yes.

---

## S319 — 18 April 2026 — GAP-002: Cash flow reconciliation wiring

**Context:** Register framed GAP-002 as "cosmetic blank field requiring
prior-period closing balance snapshot table (does not exist)." Disk
inspection showed bank_accounts.opening_balance column exists and 4 of
6 active tenants have seeded values. Fix was wiring, not new
infrastructure.

**Alternative considered:** Build a proper period_snapshots table to
hold true FY-start cash balances. Rejected — for tenants with
opening_date inside the reporting FY (Nourish opened 2026-03-01 in
FY2026), the seed-at-setup value IS the correct opening cash position.
The snapshot table would recover partial-year accuracy, which is
Phase B scope, not GAP-002.

**Alternative considered:** Frontend-only change, leave PDF EF as-is.
Rejected — the PDF is a demo-facing audit package. Divergence between
on-screen statement and PDF would be immediately visible and look like
a bug.

**Almost-mistake avoided:** Initially scoped as pure rendering. Disk
grounding on the EF caught that page 4 of the PDF mirrors the on-screen
Cash Flow. Two commits, not one.

**Calibration update:** GAP-002 register severity was "permanent —
requires new infrastructure." Actual: Size S-M, two commits, ~40 lines.
Another row for LOOP-CALIBRATION — register descriptions drift toward
over-estimating scope when the framer assumed infrastructure was missing
without checking.

**Fresh at close:** Yes.

---

## S318 — 18 April 2026 — Capstone-003: campaign retrospective synthesis

**Context:** Safety + financial campaigns ran S293-S317 (~25 sessions, ~140
code fixes, 146 RLS policies, 4 financial findings). Methodology, journal,
and LLs captured in-stride. Capstone-003 PENDING-ACTIONS entry called for
final synthesis pass.

**Decision:** Produce 5 retrospective artifacts in one session:
(1) Pattern tagging layered onto DEBT_REGISTER_v1 Section 6
(2) Failure Mode Evidence Map in AGENT-METHODOLOGY Section 4
(3) New LOOP-CALIBRATION.md with measured rates
(4) LL-299 capturing planner/executor split value (S316 vs S317 evidence)
(5) Archive _migration_backup_s309

**Alternative considered:** Extend AGENT-METHODOLOGY with calibration numbers
inline. Rejected — calibration is data with its own lifecycle (updated after
each campaign), methodology is stable principles. Different lifecycles want
different files.

**Alternative considered:** Write one journal entry per artifact. Rejected —
all five are part of one synthesis decision, not five independent ones.
Over-atomisation of journal entries dilutes signal.

**Almost-mistake caught:** Originally planned a sixth artifact cross-linking
every journal entry to every WP in WP-REGISTER. Rejected during scoping —
too granular, low retrieval value, negative maintenance value (breaks on
any rename).

**Key number from calibration:** 11 of 12 audit estimates in the campaign
were under-counts. Median +40%. This is now a documented rate; future
campaigns can budget against it.

**LL-299** added: planner/executor split value. Grounded in S316 (integrated,
clean but small) vs S317 (split, caught calendar-year bug outside register).

**Fresh at close:** Yes.

---

## S317 — 18 April 2026 — FIN-002: FY label + recalc period

**Context:** Register flagged "hardcoded FY2026 in 4 locations." Disk
inspection found 5 (register missed the readonly display input). Also
found HQTenants.recalcNetProfit used calendar-year P&L period — for
Mar-Feb FY tenants (Garden Bistro) the net_profit written was garbage.

**Alternative:** Fix only the hardcode, leave the calendar-year P&L-period
bug for later. Rejected — fixing one without the other produces a file
with correct string and still-wrong arithmetic.

**LL-297** added: canonical fyLabel algorithm.

---

## S317 — 18 April 2026 — FIN-003: Tenant-rate-aware VAT divisor

**Context:** 3 module-level `const VAT_RATE = 1.15` encoding both the `1+`
math and the SA-only assumption. tenant_config.vat_rate already stores the
rate as 0.15.

**Alternative:** Pass vatRate as function argument to Group helpers.
Rejected — callers don't fetch vat_rate; each helper doing one extra
tenant_config lookup is cheaper to implement.

**Named divisor not vatRate** to prevent off-by-1 confusion (0.15 vs 1.15).

**LL-298** added: per-tenant VAT pattern.

---

## S317 — 18 April 2026 — FIN-006: Sort embedded equity_ledger join

**Context:** PostgREST embedded join took `[0]` without specifying order.
Harmless today (1 row per tenant). Becomes wrong Jan 2027.

**Alternative:** Split into separate filtered query. Rejected — one-line
`.order()` with `foreignTable` is minimum-surface fix.

---

## S316.5b.3 — 18 April 2026 — WP-REGISTER.md created

**Decision:** Built docs/WP-REGISTER.md from verified triage. Integrated
into AGENT-ORIENTATION read list at position 2. Added Failure 8
(documentation under-classification) to AGENT-METHODOLOGY.

**PRIMARY left empty** pending owner decision at next session start.
Candidates: financial cluster (FIN-002/003/006), WP-AINS completion,
WP-TABLE-UNIFY Phase 1 close-out.

**Campaign arc (S316.5b.1 → .2 → .3):**
- .b.1: Triage — 32 WPs catalogued
- .b.2: Verify — 81% accuracy, 6 reclassifications
- .b.3: Register — this session, structured + integrated

The gap the owner named is now closed. WP visibility is a Loop doc.

**Fresh at close:** Yes.

---

## S316.5b.2 — 18 April 2026 — WP verification

**Decision:** Verified 4 LOW/MEDIUM-confidence rows + 5 archival candidates
+ 1 bonus misclassification (WP-AINS). WP-TRIAGE.md updated with verified
classifications. Ready for S316.5b.3 register build.

**Reclassifications (6):**
- WP-AINS: SCOPED → IN-PROGRESS (IntelStrip + NuAiBrief exist, sidebar pending)
- WP-O Loyalty: SCOPED MEDIUM → SHIPPED HIGH (schema matches spec, 10 files use it)
- WP-PROTEAAI: SCOPED → SHIPPED HIGH (2093L, streaming+tools+query, v1.8 live)
- WP-SIM-POS-v2_0: SCOPED MEDIUM → SHIPPED HIGH (EF at v3.0)
- WP-STOCK-RECEIVE-S3: SHIPPED MEDIUM → SHIPPED HIGH (modal + ProductWorlds confirmed)
- WP-FORECAST: STALE → STALE confirmed (HQForecast.js ships the features)

**Archival candidates expanded:** 5 → 7 (added SIM-POS-v2_0 + STOCK-RECEIVE-S3).

**Triage accuracy:** S316.5b.1 got 26/32 right on first pass (81%). 6 needed
reclassification, all in the same direction (under-classified as SCOPED when
actually shipped or in-progress). Consistent with WATCH-007 — triage from
doc headers under-counts what's actually built.

**Fresh at close:** Yes.

---

## S316.5b.1 — 18 April 2026 — WP triage baseline

**Decision:** Catalogued 32 WP docs in docs/WP-TRIAGE.md. No priorities
assigned. Triage produces classification baseline for S316.5b.2 verification
and S316.5b.3 register build.

**Key observation:** Most WPs cluster into 5 groups (design system, financial,
demo, table unification, inventory). 9 SHIPPED, 6 IN-PROGRESS, 9 SCOPED,
2 DEFERRED, 6 STALE. 5 docs are archival candidates (superseded brainstorms
or stubs absorbed into newer WPs).

**Campaign shape confirmed:** 3-4 sessions needed. Single-session attempt
would have produced unreliable classifications. The 4 LOW/MEDIUM confidence
rows need code/EF investigation before the register can be built.

**Fresh at close:** Yes.

---

## S316.5a — 18 April 2026 — Loop integrity audit

**Decision:** Refreshed Class B institutional-memory gaps across
AGENT-METHODOLOGY, PENDING-ACTIONS, DECISION-JOURNAL. No new LLs added.

**6 gaps closed:**
- Gap 1: Failure Mode 1 expanded with campaign evidence (10-220% variance)
- Gap 2: Section 5 Open Questions refreshed (items 1+7 marked done)
- Gap 3: Pre-investigation over-estimate insight in Failure Mode 1
- Gap 4: Procedure 5 (Financial finding investigation) added to Section 2
- Gap 5: PENDING-ACTIONS refreshed (stale entries, missing closed-loops)
- Gap 6: DECISION-JOURNAL verified — all S314.3a-S316 entries present

**Campaign insight:** Loop health better than feared. All LLs landed
correctly. Failure Modes 1-7 present. Platform mental model intact. Gaps
were subtle (magnitude updates, stale text, missing procedure) rather
than catastrophic.

**Fresh at close:** Yes.

---

## S316 — 18 April 2026 — FIN-001 fix: HQYearEnd equity_ledger FY filter

**Decision:** Added `.eq("financial_year", fyLabel)` to the equity_ledger
update in HQYearEnd.js. One-line fix. Closes latent cross-year contamination.

**Grounding:** Code verified at HEAD (L228-230). Schema verified (financial_year
column exists, NOT NULL). Data verified (single-year state means bug currently
harmless — would corrupt on first multi-year tenant).

**LL-296:** Cross-year contamination pattern. Generalises FIN-001 to any table
with financial_year scoping. The journal_entries update on the adjacent line
already had the correct filter — the equity_ledger update was the only miss.

**Parallel-schema noted:** equity_ledger has both `year_end_closed`+`year_end_date`
AND `year_closed`+`closed_at`. Duplicate fields tracking the same concept. Logged
as technical debt, not fixed here.

**Fresh at close:** Yes.

---

## S315 — 18 April 2026 — LL-251 audit maintenance + Failure Mode 7

**Decision:** Fixed 2 stale queries in LL-251 (Q5 period_month text→count,
Q6 closing_balance→opening_balance). Ran full 8-query audit. Documented
LL query drift as Failure Mode 7 in AGENT-METHODOLOGY.

**Audit results (post-fix):**
- Q1: clean (no duplicate VATs — S293 fix held)
- Q2: Garden Bistro 4 unmatched bank lines (expected demo noise)
- Q3: all active tenants have equity_ledger (Medi Can has row)
- Q4: clean (no stale auto-capture)
- Q5: all 17 assets OK (fixed query)
- Q6: 4 tenants have opening_balance >0, 2 at R0 (Medi Can, Nourish — sparse seeding)
- Q7: 6 tenants have journals (Pure Premium absent — not live)
- Q8: 4 tenants have VAT filings

**Institutional learning:** LLs with runnable SQL go stale silently when
schema changes. Code fails loud; docs fail silent. Named as Failure Mode 7.

**Fresh at close:** Yes.

---

## S314.4 — 18 April 2026 — Final Bucket A sweep + audit hardening

**Decision:** Fixed 8 remaining CRITICAL using='true' escapes across 7 tables.
Tightened tenants.tenants_read_authenticated. None of the 8 tables had tenant_id —
all fixed via HQ-only, user-scoped, or FK-based patterns.

**Classifications:**
- tenants.tenants_read_authenticated: DESIGN (tenant directory for auth context +
  HQ switcher) but tightened from `true` to `(is_active = true) OR is_hq_user()`
  to hide deactivated tenants. Not a new LL — the tightened form is correct behavior.
- public_holidays.ph_read_all: confirmed LL-293 design. No change.

**Campaign-level insight:** 4 rounds of Bucket A escapes across Tier 2C campaign
(S314.1, S314.2a, S314.2c, S314.4). Total: ~28 using='true' policies fixed across
these 4 rounds. The S314 audit's original 6 Bucket A findings were 21% of the
actual total. Audits systematically under-count; magnitude varies 17-220% by category.

**Final state:** Only `public_holidays.ph_read_all` (LL-293) and `qr_codes.public_read_qr`
(LL-295) remain as documented design patterns with using='true'. Zero CRITICAL bugs.

**Fresh at close:** Yes.

---

## S314.2c — 18 April 2026 — message_templates schema + RLS migration

**Decision:** Added tenant_id to message_templates. Migrated 9 existing
Protea-branded rows to Pure Premium. Seeded 9 placeholder generic defaults
(NULL tenant_id, is_active=false). Applied LL-293 shared-defaults RLS with
asymmetric WITH CHECK (tenants can read shared defaults but only HQ can
write them).

**CRITICAL escape closed:** templates_public_read (using='true' on SELECT)
had been live since before the campaign. Neither S314 audit, S314.1, nor
S314.2a sweeps caught it. This is the second audit escape (first was S314.1's
sweep finding Bucket A residuals). Root cause: message_templates had no
tenant_id column, so the audit script may have excluded it from tenant-scoped
checks entirely. The table slipped through classification as "not tenant-scoped"
when it actually held tenant-specific content.

**WITH CHECK asymmetry (LL-293 refinement):**
- USING: `(tenant_id IS NULL) OR (tenant_id = user_tenant_id())`
- WITH CHECK: `(tenant_id IS NULL AND is_hq_user()) OR (tenant_id = user_tenant_id())`
The asymmetry prevents tenants from accidentally creating NULL-tenant rows
that would be visible to all tenants. Only HQ can write shared defaults.

**Follow-ups logged:**
- S314.2c-b: owner writes real content for 9 generic defaults
- `{{business_name}}` not supported in send-notification or send-email EFs

**Fresh at close:** Yes.

---

## S314.3d — 18 April 2026 — Stock_take legacy pattern migration

**Decision:** Migrated 3 stock_take_* tables from `current_setting('app.tenant_id')`
to standard `user_tenant_id() + user_role() = 'admin'` pattern. Added HQ bypass
policies. Added with_check.

**Approach A chosen** (migrate now) over B (drop and defer) and C (leave alone).
Session cost: ~15 minutes. Consistency dividend: when stock-take feature gets
built, RLS matches platform standard. Developer won't encounter or propagate
the legacy pattern.

**Evidence supporting "unused feature":** Zero rows in all 3 tables. Zero code
references to `app.tenant_id` setting. No other policies on these tables.
Feature likely unimplemented.

**Legacy pattern eliminated:** `current_setting('app.tenant_id')` no longer
exists anywhere in the platform's RLS policies.

**Fresh at close:** Yes.

---

## S314.3c — 18 April 2026 — HQ bypass with_check (65 policies across ~50 tables)

**Decision:** Fixed 65 HQ bypass policies by adding with_check mirroring
using_clause. Mechanical defense-in-depth. Brief estimated 57; live DB
had 65 (WATCH-007 ~14% under-count).

**DELETE policy learning:** 8 DELETE-only policies don't support WITH CHECK
in PostgreSQL. Recreated without WITH CHECK — this is correct. Post-fix
verification initially showed "8 remaining" which was a false positive
from the query including DELETE policies in the count.

**Scope:** Largest single-session policy count in the campaign (65). Total
RLS policies fixed across S314.1-S314.3c: 130.

**Fresh at close:** Yes.

---

## S314.3b — 18 April 2026 — HR cluster RLS fixes (24 policies across 15 tables)

**Decision:** Fixed 24 HR policies with missing with_check. All were already
correctly tenant-scoped — purely mechanical with_check addition. 1
classification (public_holidays confirmed LL-293 design, with_check added).

**Scope correction from brief:** Brief estimated 32 policies with 3
architectural rewrites (Pattern 3). Live DB found 25 policies, ALL already
tenant-scoped. Zero cross-tenant HR bugs — the architectural rewrite
concern was a planning overestimate.

**Classification outcomes:**
- leave_types.lt_tenant_read: Census showed all rows have non-NULL tenant_id.
  The `(tenant_id IS NULL)` clause is a forward-compatible safety net for
  future platform-default leave types (Annual, Sick, etc.). No change needed.
  NOT LL-293 pattern (no shared defaults currently exist). Classified ACCEPTABLE.
- public_holidays.hr_holidays_all: Confirmed LL-293 design. with_check
  added to match using_clause (preserves NULL-or-tenant pattern).

**Zero-HR-user state:** No users have role='hr'. Breakage risk: zero.
Session is pure hardening against future HR feature usage.

**Fresh at close:** Yes.

---

## S314.3a — 18 April 2026 — Tenant-scoped HIGH RLS with_check fixes

**Decision:** Fixed 11 tenant-scoped policies with missing with_check.
Mechanical fix: copy using_clause to with_check. Preserves existing
isolation logic; closes INSERT/UPDATE defense-in-depth gap.

**Scope discovery:** S314 audit registered 37 HIGH findings. Live DB
query found 83 policies matching the pattern. Split by risk tier:
- Tier A (this session): 11 tenant-scoped — real defense-in-depth gap
- Tier B (S314.3b): ~24 HR cluster — need scope rewrite, not just with_check
- Tier C (deferred): ~40+ HQ bypass — cosmetic, low actual risk

WATCH-007 at 2.2x: audit under-counted HIGH by 124% (83 vs 37 registered).
Higher than the ~17% rate seen in Tier 1. RLS audit detection logic needs
a second pass after Tier 2C closes.

**Deferred:** stock_take_* (3 policies) use legacy
`current_setting('app.tenant_id')` pattern instead of `user_tenant_id()`.
Need migration to standard functions — logged as separate loop.

**Naming inconsistency:** disciplinary_records and employment_contracts
use `current_user_tenant_id()` + `is_admin_user()` while the rest of the
platform uses `user_tenant_id()` + `user_role()`. Flagged for LOW cleanup.

**Fresh at close:** Yes.

---

## S314.2b — 18 April 2026 — Architecture A clarification + MEDIUM RLS fixes

**Decision A (architectural):** Confirmed NuAi uses Architecture A (shared
database, RLS-isolated multi-tenant). This affects every RLS classification:
tenant admins manage their own tenant's data, HQ operators manage platform-
wide. Delete permission exists at every scope level, bounded by what that
scope can see.

**Decision B (MEDIUM fixes):** Applied tenant-scoping + HQ bypass to 5
tenant-data tables, HQ-only to 2 platform tables, FK-based scoping to 2
child tables, HQ-only-until-schema to 2 tables missing tenant_id.

**Schema discovery:** 6 of 11 target tables lack tenant_id column entirely
(audit_log, deletion_requests, purchase_order_items, double_points_campaigns,
survey_responses, ticket_messages). Initial migration attempted tenant_id-
based policies on all 11 and failed. Split into Group 1 (tenant_id tables)
and Group 2 (FK-based or HQ-only). The schema gap is itself a finding —
these tables should eventually get tenant_id columns.

**Patterns observed:**
- `auth_is_admin()` without tenant scope was a consistent anti-pattern
  across all 11 findings. Same wrong-shape, likely from a development
  period before the tenant isolation model was fully internalised.
- Tables without tenant_id can still be tenant-scoped via FK joins to
  parent tables that DO have tenant_id (purchase_order_items → purchase_orders,
  ticket_messages → support_tickets).

**Parked:** RLS-031 (message_templates) — lacks tenant_id AND needs schema
change + generic-default seeding + LL-293 pattern. Dedicated session S314.2c.

**Fresh at close:** Yes.

---

## S314.2a — 18 April 2026 — RLS CRITICAL residuals sweep: 10 more policies fixed

**Decision:** Fixed 10 residual `true`-clause policies that S314's audit
script missed. Found by S314.1's post-fix sweep. Same methodology.

**WATCH-007 validation:** S314 audit under-counted Bucket A by ~53%
(10 additional found beyond the 9 originally registered). The documented
~17% under-count rate applies to manual grep; RLS audit scripts have
a higher miss rate because policy text matching is more complex than
code pattern matching.

**Classification decisions:**
- qr_codes.public_read_qr: classified as BUG. Consumer QR scanner reads
  `products` table (verified S307), not `qr_codes`. All qr_codes access
  is authenticated admin. The `public` role grant was early dev scaffold.
- public_holidays.ph_read_all: confirmed NOT-A-BUG (LL-293). Left alone.

**Duplicate-policy anti-pattern:** qr_security_settings and stock_receipts
each had TWO identical `true`-clause policies (`app_access` + `app_access_X`).
Likely from someone "fixing" a policy by adding a new one instead of
replacing the broken one. Both dropped, single correct replacement created.

**Post-fix sweep:** Zero `qual='true'` WRITE policies remain on any
tenant-scoped table. public_read_qr (SELECT, true) preserved as LL-295.
public_holidays.ph_read_all preserved as LL-293.

**Near-miss: verify-before-correct.** Initially mis-read the migration
output and believed public_read_qr had been dropped. Prepared a corrective
recreate. Owner verified via live Supabase MCP query that the policy was
still present — the migration hadn't dropped it. The corrective was
unnecessary. Lesson: before running a "fix for a fix," verify the current
state via live query first. The migration log is a plan; pg_policies is truth.

**Fresh at close:** Yes.

---

## S314.1 — 18 April 2026 — RLS CRITICAL fixes: 10 broken policies eliminated

**Decision:** Fixed 10 live cross-tenant exposure policies (9 from brief + 1
caught by final sweep). Pattern: DROP broken policy, CREATE tenant-scoped +
hq_bypass replacements where needed.

**Classify-before-fix results:**
- RLS-006 (loyalty_config.public_read): classified as BUG. Loyalty config
  contains competitive info (pts rates, thresholds). Consumer shop code
  already filters by storefrontTenantId. The public_read policy was a
  convenience from early development, not design. Code fallback at
  Loyalty.js:183 (`.single()` without tenant filter) is a separate code
  bug — logged for follow-up, not blocking the RLS fix.

**Patterns observed:**
- Policy names lie: 'hq_all' + 'hq_admin_all' were often using_clause='true'
  (grants to everyone, not just HQ). The name suggests restriction; the
  implementation grants unrestricted access.
- `auth_is_admin()` function is NOT tenant-aware (any admin from any tenant).
  Only `is_hq_user()` correctly identifies HQ operators.

**Additional findings from final sweep:** 9 more `true`-clause policies on
tenant-scoped tables (batches 2, document_log 1, qr_codes 2,
qr_security_settings 2, stock_receipts 2). Logged for S314.2.

**Fresh at close:** Yes.

---

## S314 — 18 April 2026 — RLS policy audit: 155 findings across 120 tables

**Decision:** Audit-only session, no fixes. Follow Tier 1 pattern (S294).
Classification applied to 401 policies. Findings registered as RLS-001
through RLS-057 (numbered) + 98 batch items (Bucket C naming + LOW dupes).
Fix campaign scoped as 4 sessions (S314.1-S314.4).

**Critical findings (require immediate attention):**
- 6 policies with `using_clause = true` on tenant-scoped tables (Bucket A)
- 3 policies with `auth_is_admin()` without tenant scope (Bucket B)
- These 9 are live cross-tenant data exposures TODAY

**Patterns observed:**
- `hq_all` naming without `is_hq_user()` function is the root cause of
  Bucket A — someone named policies "hq_all" but set `true` instead of
  the proper function
- HR module is the epicentre of missing `with_check` (20 of 37 HIGH findings)
- `is_admin()` function (without "hq" prefix) is NOT tenant-aware — used
  in 4 MEDIUM findings. Different from `is_hq_user()` which IS correct

**Alternatives considered:**
- Audit + fix CRITICAL in same session: rejected — scope discipline.
  The 9 CRITICAL fixes are straightforward but the audit had to complete
  first to ensure no surprises
- Manual review without classification script: rejected — 401 policies
  is too many for reliable manual classification

**Why this path:** Tier 1 pattern proven (S294 audit → S295-S303 fixes).
Script becomes permanent toolchain alongside audit_tenant_isolation.py.

**Near-misses:** Bucket C (53 findings) initially looked CRITICAL by
naming convention, but functional analysis showed they all use `is_hq_user()`
correctly. Without functional analysis, would have over-counted CRITICAL
by 6x. Confirms severity-grounding principle from AGENT-METHODOLOGY.

**Fresh at close:** Yes.

---

## S313.5 — 18 April 2026 — SAFETY-080 execution: move suppliers to real owners

**Decision:** Move HQ-owned suppliers to Pure Premium (their real owner),
move mis-attributed Medi Rec documents to Pure Premium with them, backfill
Metro Hardware's fixture suppliers, move Facility A to Medi Rec (not
delete — FK from stock_receipts discovered during execution).

**Alternatives considered:**
- Per-supplier cloning between Medi Rec and Pure Premium (S313 initial
  plan) — rejected when owner clarified all cannabis activity belongs
  to Pure Premium. Documents attributed to Medi Rec were mis-attributed.
- Delete Facility A as orphan (brief's recommendation) — couldn't
  execute, stock_receipts FK blocked it. Adapted to move-to-real-owner
  pattern using FK evidence (stock_receipt belongs to Medi Rec).
- Leave supplier_products on HQ (Option 3 from S313) — rejected because
  tenants need access to their supplier catalogs for procurement.

**Why this path:** Owner clarified that Medi Rec's document history
referencing cannabis suppliers was mis-attribution, not real Medi Rec
business. Fix is attribution correction (~140 ops), not cloning (~300
ops). The Facility A FK discovery (Phase 4) is an example of WATCH-007
(audit floor, not ceiling) — the pre-investigation missed the
stock_receipts reference. Adapted in-session using the same principle:
follow FK evidence to true owner.

**Fresh at close:** Yes.

---

## S313 — 18 April 2026 — SAFETY-080 supplier architecture: per-tenant copies

**Decision:** Suppliers are per-tenant. Each tenant owns its own supplier
records. No sharing, no cross-tenant visibility. Codified as LL-294.

**Alternatives considered:**
- Shared-reference pattern (LL-293 style with NULL tenant_id = global):
  rejected — supplier data contains private commercial info (pricing,
  terms, contacts). Sharing leaks business intelligence between tenants.
- Junction table (master_suppliers + tenant_supplier_links): rejected —
  too complex, supplier_products table already creates a second level of
  indirection. Adding a third layer would make the data model fragile.
- Master catalog with push-down (HQ creates master, copies pushed to
  tenants): rejected — premature. If onboarding pain materialises (many
  tenants sharing common suppliers), can revisit. Current 5 demo tenants
  don't justify the complexity.

**Key moment:** Owner's response "I don't want those suppliers in every
tenant" reframed the discussion from "how do we share suppliers?" to
"why would we share suppliers?" The answer — we shouldn't. Each tenant's
relationship with a supplier is private even when the supplier is the
same real-world company.

**Scope boundary added to LL-293:** Explicitly states shared-reference
pattern is for platform taxonomy only (holidays, strains, formats), NOT
for business entities. This prevents future agents from accidentally
extending LL-293 to suppliers, customers, or inventory.

**Open question deferred:** supplier_products (123 HQ-owned rows) needs
owner decision before S313.5 execution. Three options documented.

**Fresh at close:** Yes.

---

## S312 — 18 April 2026 — SAFETY-082b backfill + NOT NULL on 6 tables

**Decision:** 7-phase migration matching S309 pattern. Delete 4 junk
notification_log rows, backfill 19 real rows via FK evidence, apply
NOT NULL on all 6 tables.

**Alternatives considered:**
- Delete all 7 notification_log rows (owner rejected — 3 had real system
  events: a low-stock alert, an OTP verification, a tier upgrade)
- Attribute the low-stock alert (D9 Distillate) to Pure Premium based on
  product context rather than phone owner (owner chose consistent
  phone-owner rule — the notification was SENT TO the HQ admin, so the
  notification belongs to HQ regardless of which tenant's product triggered it)
- Skip the backfill and just add NOT NULL with a default (rejected —
  a default tenant_id is worse than NULL because it's silently wrong)

**Why this path:** Same FK-evidence methodology as S309, which proved
reliable. Attribution verified at each phase against the S311.75
pre-investigation. Zero drift detected — every row matched expected
tenant. The phone-owner attribution rule for notification_log avoids
per-row justification and creates a consistent precedent.

**Near-misses:** The notification_log ambiguity (product context vs phone
owner) could have split the 3 rows across two tenants if applied
inconsistently. The owner's "consistent rule" decision prevented this.

**Fresh at close:** Yes — written immediately after Phase 7 verification.

---

## S311.75 — 18 April 2026 — Loop as formal system

**Decision:** Treat the Loop as an explicit architectural system, not
a collection of habits.

**Alternatives:** (a) Continue ad-hoc — add docs as needed, no formal
structure. (b) Formal Loop with principles, journal, and all-surface
discipline.

**Why this path:** The campaign (S293-S311) produced 80+ findings, 4
procedures, 6 failure modes, and 3 new LLs — but the reasoning for
many interim decisions was already fading. The owner articulated
"capture at peak, reasoning decays, campaign never ends" as explicit
beliefs. Formalising these as principles and building capture
infrastructure prevents the next campaign from starting at zero.

---

## S311.5 — 18 April 2026 — AGENT-METHODOLOGY over expanded LLs

**Decision:** Create a standalone methodology doc rather than expanding
existing LLs with investigation procedures.

**Alternatives:** (a) Add procedures as new LLs (LL-294, 295...) in the
Bible. (b) Standalone doc with cross-references to LLs.

**Why this path:** LLs are rules (do this / don't do that). Procedures
are HOW to investigate before you know WHICH rule applies. They serve
different cognitive functions. An agent facing a new finding needs a
procedure first, then the relevant LL. Putting both in the Bible would
make it harder to use.

---

## S311 — 18 April 2026 — Bug-vs-design reclassification (SAFETY-082 split)

**Decision:** Split SAFETY-082 into 082a (design, closed) and 082b (bug,
open) based on RLS policy evidence.

**Alternatives:** (a) Treat all 9 tables as bugs and backfill. (b) Drop
tenant_id column from the 3 design tables. (c) Split as done.

**Why this path:** The RLS policies on public_holidays, product_formats,
and product_strains explicitly use `(tenant_id IS NULL) OR (tenant_id =
user_tenant_id())`. This is the shared-defaults-with-overrides pattern —
NULL is by design. Backfilling would convert global defaults into
single-tenant records, making them invisible to other tenants. The
almost-mistake: treating absence-of-data as presence-of-bug.

---

## S310 — 18 April 2026 — Grep-before-drop on broken views

**Decision:** Drop retailer_performance and scan_geo_summary views after
confirming no functional code dependencies.

**Alternatives:** (a) Fix the views (recreate with correct underlying
tables). (b) Drop immediately without checking. (c) Grep first, then drop.

**Why this path:** Option (a) would require knowing the original intent —
no spec exists. Option (b) risks breaking code that silently depends on
the views. Option (c) found one active code reference
(GeoAnalyticsDashboard.js L485) which was already silently failing.
Dropping changed nothing functionally. The grep step prevented a
reckless DROP and documented the silent failure for future investigation.

---

## S309 — 18 April 2026 — Tenant attribution pivot (Medi Rec to Pure Premium)

**Decision:** Backfill 16 NULL inventory_items to Pure Premium THC Vapes
(f8ff8d07) rather than Medi Recreational.

**Alternatives:** (a) Assign to Medi Rec (the planner agent's initial
assumption based on name patterns). (b) Assign to Pure Premium (the DB
evidence). (c) Leave NULL and skip backfill.

**Why this path:** The planner agent initially assumed Medi Recreational
ownership. DB investigation via supplier_id (AimVape 057e930b) and sibling
stock_movement tenant_ids proved Pure Premium ownership. This is the
canonical example of why tenant attribution requires evidence, not
inference. Created the evidence-threshold requirement in
AGENT-METHODOLOGY Section 2.2.

---

## S308 — 18 April 2026 — Scope 2B.1 to clean tables only

**Decision:** Apply NOT NULL constraints only to the 25 tables with zero
NULL rows, deferring the 17 others.

**Alternatives:** (a) Constrain all 42 nullable tables in one session
(requires data cleanup first). (b) Clean tables first, defer the rest.

**Why this path:** The 25 clean tables are zero-risk — no data changes
needed, just DDL. Combining data cleanup with schema changes in one
session increases blast radius. Splitting into 2B.1 (clean) and 2B.2
(cleanup) isolates risk. If 2B.2 goes wrong, 2B.1's constraints still
stand.

---

## S306 — 18 April 2026 — Auth helper two-mode design

**Decision:** Build verifyTenantAuth with two modes: 'tenant' (caller
owns tenant OR is HQ operator) and 'operator-only' (HQ admin required).

**Alternatives:** (a) Single mode that always checks tenant ownership.
(b) Two modes as shipped. (c) Three modes adding 'public' for
unauthenticated EFs like verify-qr.

**Why this path:** seed-tenant and sim-pos-sales are admin-only tools
that should never be callable by regular tenants. A single 'tenant'
mode would require passing a tenant_id even for operations that aren't
tenant-scoped. 'operator-only' captures the intent cleanly. The 'public'
mode was considered but rejected — verify-qr is genuinely public and
doesn't need the helper at all (HMAC is its auth).

---

## S306 — 18 April 2026 — No service-role bypass in auth helper

**Decision:** The verifyTenantAuth helper does NOT accept service-role
keys as a valid auth path. Only user JWTs.

**Alternatives:** (a) Accept service-role key as "always authorised."
(b) Reject service-role, require user JWT.

**Why this path:** If the helper accepted service-role keys, any code
calling an EF with the service-role key would bypass tenant auth — which
is exactly the security gap the helper was built to close. Service-role
should be used by the EF internally (for DB access), not as caller
authentication. Callers must present a user JWT.

---

## S305 — 18 April 2026 — DB evidence before SAFETY-070 fix

**Decision:** Investigate the actual data state before treating SAFETY-070
as an active CRITICAL incident.

**Alternatives:** (a) Fix immediately as CRITICAL (S304 audit's rating).
(b) Investigate first, then fix with accurate severity.

**Why this path:** The S304 audit flagged SAFETY-070 as CRITICAL based
on the code pattern ("queries without tenant filter could leak data").
DB investigation showed only 1 tenant (Medi Rec) had documents — no
second tenant existed to leak TO. Reclassified to HIGH (latent). Fix
still applied (defence-in-depth), but the incident response was
proportional. This created the severity-grounding principle in
AGENT-METHODOLOGY Section 4.3.

---

## S303.5 — 18 April 2026 — Retire project knowledge snapshot

**Decision:** Replace the SESSION-START-PROMPT.md snapshot in project
knowledge with a stable pointer file (AGENT-ORIENTATION.md).

**Alternatives:** (a) Keep the snapshot pattern with better refresh
discipline. (b) Automate the refresh. (c) Eliminate the snapshot.

**Why this path:** The snapshot drifted regularly because Step 7 (manual
refresh) was skipped. Option (a) failed repeatedly — it's a procedural
fix for a structural problem. Option (b) isn't possible with current
Anthropic tooling. Option (c) eliminates the drift source entirely.
Project knowledge holds only stable pointers; all state is read live
from the repo. Retired LL-287 and Step 7 in the same commit.

---

*DECISION-JOURNAL.md · NuAi · Newest first · Add entries at session close (Step 7)*
