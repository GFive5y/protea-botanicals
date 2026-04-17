# NuAi Decision Journal
## Living record of WHY decisions were made
## Newest entries at top. Add at session close (Step 7).

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
