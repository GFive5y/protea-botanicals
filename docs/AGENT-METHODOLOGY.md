# NuAi Agent Methodology
## How to investigate, classify, and resolve findings on this platform
## Foundation: Sessions 293-311 safety campaign · 18 April 2026
## This is a living document. Update as new patterns emerge.

---

## SECTION 1 — PLATFORM MENTAL MODEL

### The tenant scoping model — read this first

Before any detail about isolation layers or RLS patterns, understand
what "tenant" means on this platform. A wrong mental model here
cascades into every downstream classification error.

**NuAi is Architecture A: one shared database, RLS-isolated multi-tenant.**

One Supabase project (`uvicrqapgzcdvozxrreo`). One set of tables. Every
tenant's data lives in the same physical rows. Row-Level Security is the
only thing separating them.

This is NOT Architecture B (per-tenant databases). If an agent ever
finds themselves assuming "each tenant gets their own database" —
stop. That model does not exist here. A real customer gets a login,
not a database. Their entire business experience is an RLS-scoped
view of the shared platform. They never know (and never need to know)
that other tenants exist on the same infrastructure.

**The selling model makes this existential:**

When a dispensary owner signs up to NuAi, here's what happens:

1. A row gets created in `tenants` with their company details
2. A user profile is created with `tenant_id = their-uuid`,
   `role = admin`, `hq_access = false`
3. They log in. RLS filters everything they see to their `tenant_id`
4. From their perspective, they have a complete business system.
   From the database's perspective, they have one row in a shared table

Because every real customer lives in the same database, a broken RLS
policy doesn't leak "within a single install." It leaks across the
entire customer base simultaneously. This is why `using_clause = 'true'`
on a tenant-scoped table is a CRITICAL finding, not a HIGH — it
exposes every paying customer's data to every other paying customer's
users at once.

### The scoping tree (the russian doll)

Think of NuAi as nested scopes, not a flat database:

```
[ Platform DB — holds everything ]
│
├── [ Tenant: Pure Premium THC Vapes ]
│     ├── Admin scope — all of Pure Premium's data
│     │     ├── Staff scope — operational subset
│     │     └── Customer scope — per-user slice (auth.uid())
│     └── RLS boundary: tenant_id = Pure Premium's UUID
│
├── [ Tenant: Medi Recreational ]
│     └── (same nested pattern, isolated by tenant_id)
│
├── [ Tenant: Metro Hardware ]
│     └── (same)
│
└── [ NuAi HQ — platform oversight ]
      └── is_hq_user() bypasses tenant boundary
          Sees across all tenants for platform management
```

Every RLS policy walks this tree. `tenant_id = user_tenant_id()`
restricts to the caller's branch. `is_hq_user()` bypasses to the
root. `user_id = auth.uid()` restricts to a single leaf.

**The tree has three kinds of rows:**

1. **Tenant rows** — belong to exactly one tenant (orders, suppliers,
   staff). The vast majority. Isolated by `tenant_id`.

2. **Platform rows** — belong to NuAi itself (audit_log, tenants table,
   deletion_requests). No tenant_id, or tenant_id IS NULL meaning "ours."
   Only HQ operators can access.

3. **Shared-default rows** — platform-provided defaults visible to all
   (public_holidays, product_formats, product_strains). Nullable
   tenant_id; NULL means shared. See LL-293.

When working with any table, FIRST identify which kind of row it
holds. The isolation strategy follows from that.

### Delete semantics by scope

This catches people. Under Architecture A with RLS, "delete" means
something different at each scope:

| Scope | Can delete within scope | Cannot delete |
|---|---|---|
| Customer | Own records only (own orders, messages) | Anything else |
| Staff | Operational records scoped by role | Admin data, other tenants |
| Tenant admin | ANY row in their tenant (fire staff, remove suppliers, delete products) | Other tenants' rows (RLS hides them); NuAi platform data |
| HQ operator | Anything, via is_hq_user() bypass | Nothing by RLS — only by explicit app-layer guards |

Tenant admins SHOULD be able to delete things within their tenant.
That's normal business operation — removing a supplier, firing staff,
deactivating products. What they must NOT be able to do is reach
across the tenant boundary or touch platform-level tables.

A common confusion: "tenant admins can't delete anything" (intended
to mean "can't delete NuAi platform data") is ambiguous. Under
Architecture A it breaks if applied literally — the tenant portal's
"remove this supplier" button stops working because RLS blocks the
DELETE. The correct framing is: tenant admins delete WITHIN their
scope, never ACROSS or ABOVE it.

### What this means for classification

Every RLS finding must be classified against this model:

- Does the table hold tenant rows? → tenant-scoped policy required,
  plus HQ bypass if HQ operators need platform-wide views
- Does the table hold platform rows? → HQ-only policy, no tenant scoping
- Does the table hold shared-default rows? → LL-293 pattern (NULL or
  tenant-match)

If the answer isn't obvious, check existing policies on similar tables
and the classify-before-fix procedure (Section 2.1). A wrong
classification at this layer produces either a policy that breaks
legitimate access (too restrictive) or one that exposes data across
scopes (too permissive).

### Technical overview

NuAi is a multi-tenant SaaS ERP. Every table, every query, every write
happens in the context of a tenant. Understanding the isolation model is
more important than understanding any feature.

4 industry profiles share one codebase and one database:
  cannabis_retail · cannabis_dispensary · food_beverage · general_retail

6 portals serve different user contexts:
  /hq (cross-tenant operator) · /tenant-portal (business owner) ·
  /admin (store manager) · /hr (HR suite) · /staff (self-service) ·
  /shop (consumer storefront)

### The isolation architecture (three layers)

**Layer 1 — Database (RLS)**
PostgreSQL Row-Level Security policies on every tenant-scoped table.
Policies use `tenant_id = user_tenant_id()` to restrict visibility.
This is the strongest layer — it works even when code is buggy.
But it's also the most dangerous when bypassed (service-role clients).

**Layer 2 — Application code (React)**
Every `.from("table").select()` and `.insert()` call should include
tenant_id filtering or payload. This is defence-in-depth — RLS
catches misses, but code should be correct independently.

**Layer 3 — Edge Functions (service-role bypass)**
EFs use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS entirely.
This means:
  - An unscoped SELECT in an EF returns ALL tenants' data
  - An INSERT without tenant_id in an EF creates an orphaned row
  - RLS does NOT save you in EF context
  - Application-level auth (verifyTenantAuth helper) is required

This layering means: Layer 1 bugs are rare (RLS catches most issues).
Layer 2 bugs are common (code forgets tenant_id). Layer 3 bugs are
dangerous (no safety net). The S294-S311 campaign found 70 Layer 2
bugs, 10 Layer 3 bugs, and 0 Layer 1 bugs.

### Tenant-source taxonomy (LL-291)

When writing tenant_id into a record, the source matters more than
the presence. Three patterns:

**Pattern A — TRIGGER TENANT** ("whose surface triggered this?")
Consumer-facing flows. Source: storefrontTenantId, QR tenant, etc.
Example: OrderSuccess.js loyalty_transactions use storefrontTenantId.

**Pattern B — VIEWER TENANT** ("whose session is this?")
Admin/tenant-portal flows. Source: `useTenant().tenantId`.
Example: StockControl.js stock_movements use the logged-in tenant.
This is the DEFAULT for most tenant-portal work.

**Pattern C — RECORD TENANT** ("whose record is this?")
HQ cross-tenant flows. Source: selectedRecord.tenant_id.
Example: HQDocuments.js Smart Capture uses selectedDoc.tenant_id.
The HQ operator is viewing; the record belongs to another tenant.

**Wrong pattern is worse than missing tenant_id.** A missing tenant_id
produces an orphaned row (detectable). A wrong tenant_id produces
misattribution (silently corrupt, hard to detect).

### RLS design patterns

**Standard tenant scoping:**
  `USING (tenant_id = user_tenant_id())`
  Most tables. Tenants see only their own rows.

**HQ bypass (hq_all_* policies):**
  `USING (is_hq_user())`
  Named `hq_all_{tablename}`. HQ operators see everything.
  IMPORTANT: this does NOT mean React code can skip `.eq("tenant_id")`.
  The bypass is for RLS; the code must still scope for UX correctness.

**Shared defaults with overrides (LL-293):**
  `USING ((tenant_id IS NULL) OR (tenant_id = user_tenant_id()))`
  Tables: public_holidays, product_formats, product_strains.
  NULL rows are globally visible defaults. Non-NULL rows are per-tenant
  overrides. The 100% NULL state means the feature is dormant, not broken.

**Per-user scoping:**
  `USING (user_id = auth.uid())`
  Tables like user_profiles, scan_logs. Scoped by authenticated user,
  not tenant. Audit scripts exclude these (CROSS_TENANT_PERMANENT set).

---

## SECTION 2 — INVESTIGATION PROCEDURES

### Procedure 1: Classify before fixing

When the audit script or a manual review flags a finding:

1. **Check RLS policies on the table:**
   ```sql
   SELECT policyname, qual, with_check
   FROM pg_policies
   WHERE tablename = '<table_name>';
   ```
   If the policy uses `tenant_id IS NULL OR tenant_id = ...`, it's the
   shared-defaults pattern (LL-293). Not a bug.

2. **Check what code references this table:**
   ```bash
   grep -rn "from(\"<table_name>\")" src/ --include="*.js"
   ```
   Understand all read and write paths.

3. **Census the data:**
   ```sql
   SELECT tenant_id, COUNT(*) FROM <table_name>
   GROUP BY tenant_id ORDER BY COUNT(*) DESC;
   ```
   Know the NULL count, tenant distribution, and row volume.

4. **Classify:**
   - Design pattern → document as LL, update audit exclusions
   - Real bug → proceed to fix procedure
   - Unknown → escalate to owner BEFORE fixing

Historical example: S311 classified 3 tables as design (SAFETY-082a)
and 6 as real bugs (SAFETY-082b), preventing a misclassification that
would have broken the shared-defaults feature.

### Procedure 2: Tenant attribution investigation

When a row has NULL tenant_id and you need to determine which tenant
it belongs to (as in the S309 partial-NULL cleanup):

1. **Direct evidence — sibling rows:**
   Check related tables via FK joins. If a stock_movement has item_id
   pointing to an inventory_item with a known tenant_id, that's direct.
   ```sql
   SELECT sm.id, ii.tenant_id
   FROM stock_movements sm
   JOIN inventory_items ii ON ii.id = sm.item_id
   WHERE sm.tenant_id IS NULL AND ii.tenant_id IS NOT NULL;
   ```

2. **User attribution:**
   ```sql
   SELECT lt.id, up.tenant_id
   FROM loyalty_transactions lt
   JOIN user_profiles up ON up.id = lt.user_id
   WHERE lt.tenant_id IS NULL;
   ```

3. **Order/reference cross-referencing:**
   If a row has a source_id like an order reference, look up the order.

4. **Temporal clustering:**
   Rows created within minutes of each other by the same process
   (same supplier_id, same creation timestamp batch) likely share a tenant.

5. **Conflict resolution:**
   If different evidence paths point to DIFFERENT tenants for the same
   row, STOP. Do not batch-backfill. Flag for owner review.

Historical example: S309 pre-investigation assumed Medi Recreational
owned the NULL items. Evidence via supplier_id and sibling movements
pointed to Pure Premium THC Vapes — a different tenant entirely.

### Procedure 3: Grep-before-drop

Before any DROP statement (table, view, column, index):

1. **Search the entire repo:**
   ```bash
   grep -rn "<object_name>" . --include="*.js" --include="*.ts" \
     --include="*.sql" --exclude-dir=node_modules --exclude-dir=.git
   ```

2. **Check for silent failure patterns:**
   If code references the dropped object with `|| []` or `.catch(() => null)`,
   it will silently degrade. Document this in the commit.

3. **Check DB-level dependencies:**
   ```sql
   SELECT dependent_view.relname, source_table.relname
   FROM pg_depend
   JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
   JOIN pg_class dependent_view ON pg_rewrite.ev_class = dependent_view.oid
   JOIN pg_class source_table ON pg_depend.refobjid = source_table.oid
   WHERE source_table.relname = '<object_name>'
     AND source_table.oid != dependent_view.oid;
   ```

4. Only proceed if all checks clean or explicitly documented.

Historical example: S310 found GeoAnalyticsDashboard.js actively queried
retailer_performance (a broken self-referencing view). The query always
failed silently — dropping the view changed nothing functionally, but
the reference was documented in the commit.

### Procedure 4: Migration safety

For any migration that modifies production data (ALTER TABLE, UPDATE,
DELETE):

1. **Pre-migration census:**
   Know exactly how many rows will be affected. Compare expected vs actual.

2. **Backup evidence table:**
   ```sql
   CREATE TABLE _migration_backup_sXXX (
     backup_id bigserial PRIMARY KEY,
     backup_source text,
     original_id uuid,
     original_data jsonb,
     captured_at timestamptz DEFAULT now()
   );
   INSERT INTO _migration_backup_sXXX (backup_source, original_id, original_data)
   SELECT '<table>_before_sXXX', id, to_jsonb(t.*) FROM <table> t WHERE <condition>;
   ```

3. **Transactional phases:**
   Each logical step in its own transaction. Explicit abort conditions
   between phases. A failed Phase 3 does not corrupt Phase 2's work.

4. **Post-migration verification:**
   ```sql
   SELECT table_name, is_nullable
   FROM information_schema.columns
   WHERE column_name = 'tenant_id' AND table_name = '<table>';
   ```

5. **Negative test:**
   Attempt an INSERT without tenant_id. Expect ERROR 23502.
   This proves the constraint actually enforces.

Historical example: S309 used this full procedure across 5 phases to
clean 3 tables (174 rows backed up, 5 junk deleted with FK cascade,
163 backfilled, 3 NOT NULL constraints applied). The FK cascade
required discovering dependencies in stock_reservations and
purchase_order_items that weren't in the original plan.

### Procedure 5: Financial finding investigation (S316)

Financial findings (FIN-001 through FIN-006) are mechanically similar to
safety findings on this platform. Same discipline, different domain.

1. **Read the register entry in full.** Register entries cite file:line but
   code may have shifted since. Verify at current HEAD.

2. **Ground the code at live HEAD.** Fetch the file. Confirm the line number,
   the surrounding logic, and whether the fix is a one-liner or requires more
   context.

3. **Verify the schema supports the fix.** A fix that adds
   `.eq("financial_year", ...)` requires financial_year to exist as a column.
   Query `information_schema.columns` before writing the fix.

4. **Census data for severity assessment.** How many rows exist? Which tenants
   have data? Is the bug currently manifesting or latent? A bug that only fires
   under conditions that don't exist yet (no multi-year tenants) is still a bug
   but has different urgency than one corrupting active data.

5. **Apply the fix with generalising LL.** Most financial fixes teach a
   pattern: "add FY filter to UPDATE statements", "read from tenant_config not
   constants", etc. Write the LL that generalises to other tables with similar
   shape.

6. **Flag parallel-schema debt separately.** Financial work often surfaces
   secondary issues (duplicate fields, stale columns). These deserve logging
   but usually not same-session fixing.

Historical example: S316 fixed FIN-001 with a one-line addition
(`.eq("financial_year", fyLabel)` on HQYearEnd.js:230). LL-296 generalises
the fix to any financial_year-scoped UPDATE. Parallel-schema debt
(year_end_closed vs year_closed duplicate fields) was flagged but not fixed.

---

## SECTION 3 — DESIGN PATTERNS REGISTRY

### Pattern 1: Shared defaults with overrides

**When seen:** Nullable tenant_id + RLS policy `(tenant_id IS NULL) OR
(tenant_id = user_tenant_id())`

**Tables:** public_holidays, product_formats, product_strains

**Why it's design:** Platform provides global defaults (SA public holidays,
standard vape formats). Tenants can add their own overrides. NULL rows
are visible to all tenants; non-NULL rows are private.

**Detection:** `SELECT * FROM pg_policies WHERE qual LIKE '%IS NULL%'`

**Do NOT:** Force NOT NULL. Backfill NULL rows. Drop tenant_id column.
Any of these would break the feature.

**Reference:** LL-293 (S311)

### Pattern 2: HQ cross-tenant bypass

**When seen:** RLS policies named `hq_all_*` using `is_hq_user()`

**Why it's design:** HQ operators need platform-wide views for management.

**Critical mistake to avoid:** Assuming HQ bypass means React code can skip
`.eq("tenant_id", tenantId)`. It cannot. LL-285: the bypass is for DB-level
access; the UI must still scope to the selected tenant for UX correctness.

**Reference:** LL-205, LL-285 (S291)

### Pattern 3: Service-role EF bypass

**When seen:** EFs using `createClient(url, SUPABASE_SERVICE_ROLE_KEY)`

**Why it's design:** EFs need unrestricted DB access for admin operations.

**Risk:** Service-role bypasses ALL RLS. No safety net.

**Mitigation:** `verifyTenantAuth` helper (S306) provides application-layer
JWT verification + tenant matching. Two modes: `tenant` (caller must own
the tenant or be HQ) and `operator-only` (caller must be HQ admin).

**Reference:** SAFETY-072 to 078, verifyTenantAuth.ts (e63bc96)

### Pattern 4: Per-user scoping

**When seen:** `user_id = auth.uid()` in RLS policies

**Tables:** user_profiles, scan_logs, survey_responses, referral_codes

**Why it's design:** Some data is per-user, not per-tenant. The audit
script excludes these as `CROSS_TENANT_PERMANENT`.

**Do NOT:** Add `.eq("tenant_id")` to queries on these tables — they
don't use tenant_id for isolation.

---

## SECTION 4 — KNOWN FAILURE MODES

### Failure 1: Audit coverage is floor, not ceiling (WATCH-007)

**Symptom:** Manual grep audit or script finds N findings. The actual
number differs by 10% to 220% in either direction.

**Why it happens:** Audit scripts use shortcuts (classification filters,
context windows, table exclusions) that create blind spots. Pre-
investigation pattern-matching can also over-estimate by anticipating
findings that don't materialise at session start.

**Campaign evidence (S294-S316.5a):**
- S301 script audit vs manual grep: +45% (script found more)
- S314.1 sweep: +17% (the original WATCH-007 estimate)
- S314.2a second sweep: +10 additional findings
- S314.2c templates escape: 1 finding missed by 2 prior sweeps
- S314.3a HIGH pre-investigation: +120% (83 actual vs 37 registered)
- S314.3b HR cluster: -25% (over-estimate: 32 predicted, 24 actual)
- S314.3c Tier C pre-investigation: +40%
- S314.4 final sweep: +8 CRITICAL escapes

**Corrective:**
1. Treat any audit count as a hypothesis, not a fact. Claude Code's
   session-start live-DB query is the ground truth.
2. After fixing each file or table category, sweep once more for the
   same pattern. Expect 1-3 additional findings.
3. Pre-investigation scope predictions from Claude.ai may differ from
   session-start reality in either direction. Claude Code should adapt
   scope based on live DB state without treating the brief's numbers
   as fixed.

**Principle:** Every "done" declaration warrants one more sweep. Four
rounds of Bucket A escape discoveries during S314 proved systematic
under-counting is real. The S314.3b over-estimate proved it can go
the other way too.

### Failure 2: Bug-vs-design misclassification

**Symptom:** Audit flags a table's NULL tenant_id as a bug. Fixing it
would break the feature.

**Why it happens:** Default assumption is "NULL = missing = bug." But
the shared-defaults pattern (LL-293) intentionally uses NULL.

**Corrective:** Run the classify-before-fix procedure (Section 2.1).
Check RLS policies FIRST. If `tenant_id IS NULL OR` appears, it's design.

**Evidence:** S311 caught this for 3 tables (public_holidays, product_formats,
product_strains). Without classification, these would have been backfilled,
breaking global visibility of platform defaults.

### Failure 3: Severity inflation in initial audits

**Symptom:** Finding marked CRITICAL in the audit turns out to be latent
(no active data leak) or mitigated by other controls.

**Why it happens:** Worst-case framing without data grounding. The audit
sees "could leak cross-tenant data" and marks CRITICAL without checking
whether the conditions for leakage actually exist.

**Corrective:** Before treating any finding as CRITICAL, query the live
database. How many rows exist? Which tenants have data? Is the vulnerable
path actively used?

**Evidence:** S304 marked SAFETY-070 as CRITICAL. S305 DB investigation
showed only 1 tenant had documents — the leak was latent, not active.
Reclassified to HIGH. The fix was still applied (defence-in-depth), but
the response was proportional, not panicked.

### Failure 4: Tenant misattribution in data cleanup

**Symptom:** Rows backfilled to the wrong tenant during NULL cleanup.

**Why it happens:** Inference without evidence. "This item looks like it
belongs to Tenant X" based on name patterns or timestamps.

**Corrective:** Use the tenant attribution investigation procedure
(Section 2.2). Require direct FK evidence or corroborating sibling rows.
When evidence conflicts, STOP.

**Evidence:** S309 pre-investigation (by Claude.ai planner) initially
assumed NULL items belonged to Medi Recreational. DB investigation via
supplier_id and sibling stock_movements pointed to Pure Premium THC Vapes.
Without evidence-based attribution, 16 items would have been assigned
to the wrong tenant.

### Failure 5: Stale snapshot drift

**Symptom:** Agent operates on outdated state because project knowledge
contains a frozen copy of SESSION-START-PROMPT.md.

**Why it happens:** Step 7 (manual refresh) was skipped between sessions.
The repo moved forward; the snapshot didn't.

**Corrective:** LL-292 — live-read architecture. Project knowledge contains
only AGENT-ORIENTATION.md (stable pointers). All state is read from the
repo at HEAD every session.

**Evidence:** Sessions 291-303 paid a startup tax every session until
S303.5 retired the snapshot pattern. LL-287 (now retired) was the
per-session workaround.

### Failure 6: Code fix without historical data verification

**Symptom:** Code fix ships (e.g., add tenant_id to INSERT), but
historical rows created before the fix still have NULL or wrong tenant_id.

**Why it happens:** Code fixes are forward-looking. They prevent future
bad rows but don't repair past ones.

**Corrective:** Every code-layer safety fix should be paired with a
question: "are there historical rows that were created by this code path
before the fix?" If yes, log a data-cleanup item.

**Evidence:** WATCH-008 (system_alerts misattribution from hardcoded UUID)
is the canonical example — the code fix shipped in S299, but historical
rows remain misattributed.

### Failure 8: Documentation under-classification (S316.5b)

**Symptom:** WP status headers under-count what's actually built. Docs say
"SCOPED" or "READY TO BUILD" but the code is live.

**Evidence (S316.5b.2):** 6 of 32 WPs reclassified at verification (81%
triage accuracy). All 6 reclassifications moved WPs from SCOPED/STALE toward
SHIPPED/IN-PROGRESS. Zero reclassifications moved the other direction.

**Why it happens:** WP docs are written at scoping time with "READY TO BUILD"
or "PLANNED" status. When execution ships, the WP doc rarely gets updated to
"COMPLETE." The code advances; the doc sits.

**Corrective:** Triage-based WP classification requires code verification,
not header reading. When building a WP register, confirm shipped status by
grepping for named components/EFs/schemas, not by trusting the doc's status.

**This generalises Failure 1 (WATCH-007).** Audit under-counts are systemic
across the platform's self-description — in findings, in scope estimates,
and now in WP status. Treat any declared status as a hypothesis until verified.

### Failure 7: LL query drift (S315)

**Symptom:** An LL in the Bible that encodes runnable SQL fails or returns
wrong results because the underlying schema changed after the LL was written.

**Why it happens:** Code fails loudly on schema drift (compile error, runtime
error). Documentation fails silently — the query sits in the Bible unchanged,
looking correct, until someone actually runs it and gets a column-not-found
error or an integer-cast failure on a text column.

**Corrective:** Run LL queries against the live DB periodically (at minimum
before any demo). When a query fails, update the LL inline with a dated
comment explaining the schema change. Consider CI validation of LL SQL
against the schema.

**Evidence:** S315 discovered LL-251 Q5 (period_month is TEXT not integer,
arithmetic failed) and Q6 (closing_balance column doesn't exist, should be
opening_balance). Both had been stale since before the safety campaign.

---

## SECTION 5 — OPEN QUESTIONS AND GAPS

This methodology does NOT yet cover (updated S316.5a):

1. ~~RLS policy correctness audit~~ — **DONE.** Tier 2C completed S314-S314.4.
   146 policies fixed across 11 sessions. Zero using='true' bugs remain.

2. **CI integration** — Tier 2D, planned. Audit scripts (audit_tenant_isolation.py,
   audit_rls_policies.py) run manually. Should be GitHub Actions checks that
   block merges introducing new unscoped queries or broken RLS policies. Path
   is clear; execution is a dedicated session.

3. **Historical data cleanup** — Known gap. WATCH-008 (system_alerts
   misattribution) is the canonical example. S309/S312/S313.5 cleaned specific
   tables but no comprehensive historical sweep has been done.

4. **Performance implications of RLS at scale** — Not tested. Current data
   volumes (7K orders, 15K stock_movements) are fine. At 100K+ rows per table,
   policy evaluation cost may become relevant.

5. **Disaster recovery procedures** — Not documented. The backup table pattern
   (S309, S312, S313.5) provides per-session recovery. No platform-wide DR.

6. **Phase 2 (AI ingest) methodology** — Feature not yet built. When it is,
   AI-extracted data validation, confidence thresholds, and tenant attribution
   of AI-generated records will need their own procedure.

7. ~~Financial findings methodology~~ — **CAPTURED** as Procedure 5 (Section 2).
   FIN-001 fixed S316. Pattern documented.

This section gets updated as each gap is addressed. It's the "frontier
list" — what we know we don't know.

---

*AGENT-METHODOLOGY.md · NuAi · Session 311.5 · Foundation document*
*Update as new patterns, procedures, and failure modes emerge.*
*Checkpoint criteria: every section must teach something the Bible doesn't,*
*give a procedure (not just description), and reference specific sessions.*
