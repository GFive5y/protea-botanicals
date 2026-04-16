# NEXT SESSION PROMPT v259
## Context: Garden Bistro audit closed. Architecture lessons logged.
## Date produced: 14 April 2026
## CA demo: 12 May 2026 -- 4 weeks away

---

## READ BEFORE ANYTHING ELSE
1. docs/PLATFORM-OVERVIEW_v1_0.md
2. docs/NUAI-AGENT-BIBLE.md (note new LL-210, LL-244, LL-245)
3. docs/SESSION-STATE_v274.md
4. docs/LL-POSTGREST-ROW-CAP_v1_0.md (LL-209)
5. docs/TENANT-AUDIT-RUNBOOK-V2.md

---

## SESSION HEADLINE

Last session was the deepest single audit in the build. Garden Bistro went from
'every financial screen disagrees with every other' to 'internally consistent
within 0.7%' across 5 audit rounds. Two canonical RPCs (tenant_financial_period
+ hq_financial_period) now back the financial package. Three new LL rules
promoted (210/244/245).

But the most important output of last session is what we LEARNED, not what we
shipped. Two lessons logged for this session to explore properly.

---

## THIS SESSION: NEXT-PRIORITY-001 -- Reactive-to-Proactive Quality

We have spent multiple sessions catching bugs reactively after they surface in
real tenant data. The Garden Bistro session culminated in discovering that 4 of
5 'completed' tenants had zero chart_of_accounts rows -- invisible until someone
tried to use them.

The pattern: bugs hide until someone uses the feature. Build process doesn't
know when a feature is truly done.

Two ends of the same problem:

### END-OF-PIPELINE
Bugs hide until usage exposes them. Three responses to design:
  1. Smoke tests for every critical workflow, every tenant, nightly
  2. Demo-script-driven testing -- schedule the audit instead of triggering it
  3. Tenant-onboarding completeness as LL-244 (DONE)

### START-OF-PIPELINE
Features get scoped against the happy path only. Three responses to design:
  1. Definition of Done at scoping time -- contract produced + consumed
  2. Placeholder discipline -- deferred work made visible, not silent
  3. Pre-build dependency mapping (LL-245 -- DONE)

### What this session should produce
Designed and committed:
  - Smoke test framework spec
  - Demo-script template
  - Definition-of-Done template for new features
  - Placeholder pattern library
  - Self-audit: identify any ACTIVE 'ghost builds' currently in the codebase

Not in scope: implementing all smoke tests or fixing every ghost build.

---

## OUTSTANDING DEMO ITEMS

Before 12 May:
  - Metro Hardware sim-pos-sales trigger (owner action -- Supabase Studio)
    Body: {"tenant_id":"57156762-deb8-4721-a1f3-0c6d7c2a67d8","days":30,"orders_per_day":15}
  - Garden Bistro full dry-run walkthrough (60-90 min, owner-led)
  - Verify other 3 newly-COA-seeded tenants don't surface fresh bugs

---

## CRITICAL RULES (cumulative)
RULE 0Q: Claude Code only for writes
LL-205, 206, 207, 208, 209, 221 (see SESSION-STATE)
LL-210: Canonical financial RPC required
LL-244: Tenant onboarding completeness
LL-245: Feature scoping dependency map

## REPO STATE
- HEAD: f35afec
- Supabase: uvicrqapgzcdvozxrreo
- RPCs live: tenant_financial_period, hq_financial_period, tenant_vat_periods
- get_tenant_orders_for_pl: still live (used internally)

---
*NEXT-SESSION-PROMPT v259 -- 14 April 2026*
*Garden Bistro audit closed. Quality architecture lessons next.*
