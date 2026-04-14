# SESSION-STATE v231
## Current as of: 11 April 2026
## HEAD: ee01a8f on origin/main

---

## Platform state
NuAi ERP — production multi-tenant SaaS.
7 tenants (6 cannabis/general/test, 1 nicotine vape demo).
15 Edge Functions deployed (invite-user added this session).
110 DB tables, all RLS-secured.
Live URL: https://nuai-gfive5ys-projects.vercel.app
Supabase project: uvicrqapgzcdvozxrreo (eu-west-1)

## WP-STOREFRONT-WIZARD Phase 4 — COMPLETE
All four fixes shipped and verified:

Fix A (bebb083): OnboardingWizard.js Step 7 now writes both
  branding_config key sets on launch (LL-216 permanent fix).
  Also fixed: Step 5 manual product insert auto-generates SKU
  (was failing with NOT NULL constraint on inventory_items.sku).
Fix B (9115c84): Shop.js loyalty CTA eyebrow is now dynamic.
  Non-cannabis: "{brand_name} Rewards" (or loyalty_program_name).
  Cannabis: "Protea Rewards" unchanged.
Fix C (9115c84): Footer "Lab Verified · QR Authenticated" now
  wrapped in isCannabis gate. Non-cannabis tenants show clean footer.
Fix D (ee01a8f): invite-user Edge Function deployed (v1, ACTIVE).
  HQTenants.js Invite User button now does two-step invite:
  1. invite-user EF (service_role → auth.admin.inviteUserByEmail)
  2. send-email EF (branded welcome)
  LL-212 scope error from v229 resolved.

## New tenants created this session
Maxi Retail SA (slug: maxi-retail-sa)
  tenant_id: 9766a3af-6fe9-45a4-8310-2091988d016e
  industry_profile: general_retail
  wizard_complete: true, launched_at: 2026-04-10
  branding_config: patched via MCP (legacy shop keys added)
  Used as Phase 4 test tenant — wizard run pre-Fix A,
  branding_config patched manually post-Fix A.

## Edge Functions — 15 deployed
All prior EFs unchanged. New addition:
  invite-user v1 — auth.admin invite + user_profiles upsert

## New bug discovered and fixed (bebb083)
BUG: OnboardingWizard.js Step 5 manual product insert failed
  with "null value in column sku violates not-null constraint".
  Root cause: toInsert mapper had no sku field.
  Fix: auto-generated SKU: WZ-{NAME6}-{01} pattern.

## LL-221 pre-build audit — worked correctly this session
Three source files read before any code written.
Audit identified Fix D scope error (client-side auth.admin impossible).
SKU bug caught via live testing, not spec.

## Next session priorities
1. WP-INDUSTRY-SEEDS Phase 1 — seed-tenant EF
   Prerequisites confirmed shipped: Fix A, B, C, D all done.
   First step: read sim-pos-sales EF (contract confirmed:
   { days, orders_per_day } from HQTenants.js simulator buttons).
2. Vozel Vapes — run /onboarding end-to-end as admin@protea.dev
   to generate the welcome QR (still pending owner action).
3. WP-NAV-RESTRUCTURE — HQ nav grouping for CA demo.

## Testing protocol (MANDATORY — LL-214)
Always incognito after Vercel "Ready". Never Ctrl+R.

---
*SESSION-STATE v231 · NuAi · 11 April 2026*
*HEAD ee01a8f · Phase 4 COMPLETE · invite-user EF deployed*
