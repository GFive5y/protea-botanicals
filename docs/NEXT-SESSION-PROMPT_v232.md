# NEXT SESSION START PROMPT — v232
## Updated: 11 April 2026 · HEAD: 108c804

---

Read these documents IN FULL before doing anything:
1. docs/NUAI-AGENT-BIBLE.md
2. docs/BUILD-LOG.md
3. docs/SESSION-STATE_v232.md
4. docs/VIOLATION_LOG_v1_1.md

Confirm HEAD, EF count (16), and what seed-tenant v1 produces.

## PRIORITY 1 — WP-INDUSTRY-SEEDS Phase 2: wizard wiring

LL-221 audit before any code. Files to read:
1. src/pages/OnboardingWizard.js — read handleLaunch function
   Understand where wizard_complete flips true (Step 7)
   The seed-tenant EF call goes AFTER the launch completes.
2. Verify seed-tenant EF is ACTIVE in Supabase (it is — v1 deployed)
3. Check that seed_complete idempotency guard works correctly

Build target:
After wizard_complete = true is written in handleLaunch,
add an async call to seed-tenant EF:
  supabase.functions.invoke('seed-tenant', {
    body: { tenant_id: wizardData.tenantId, industry_profile: wizardData.industryProfile }
  })
Non-blocking — don't await, don't gate the success state on it.
Show a "Seeding your industry data..." sub-message under the success state.
The seed runs in the background.

## PRIORITY 2 — WP-INDUSTRY-SEEDS Phase 3: F&B package (if time)
New tenant: Nourish Kitchen & Deli (food_beverage profile)
seed-tenant EF v2 — add food_beverage branch with:
  12 products (finished_product + raw_material)
  3 HACCP control points
  3 food_recipes stubs
  6 expenses (food-industry specific)
  sim-pos-sales call (food products will drive orders)

## TESTING PROTOCOL (LL-214)
Always incognito. Never Ctrl+R. Wait for Vercel "Ready".

## NOTE ON sim-pos-sales
Repo file shows v2.0 (hardcoded). Deployed is v2.3 (accepts tenant_id).
Do NOT update the repo file unless the build requires it.
When deploying a new version of sim-pos-sales, write the full v2.3
content + new changes. Never deploy from the stale repo file.
