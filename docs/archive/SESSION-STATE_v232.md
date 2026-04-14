# SESSION-STATE v232
## Current as of: 11 April 2026
## HEAD: 108c804 on origin/main

---

## Platform state
NuAi ERP — production multi-tenant SaaS.
7 tenants · 16 Edge Functions deployed (seed-tenant added).
110 DB tables · trial_expires_at column added to tenants.
Live URL: https://nuai-gfive5ys-projects.vercel.app
Supabase project: uvicrqapgzcdvozxrreo (eu-west-1)

## WP-STOREFRONT-WIZARD Phase 4 — CLOSED (session v230)
All fixes A/B/C/D shipped. invite-user EF v3 deployed.
LL-222: user_profiles.role check constraint documented.

## WP-INDUSTRY-SEEDS Phase 1 — COMPLETE
seed-tenant EF v1 deployed and validated against Maxi Retail SA.

### What was built
sim-pos-sales v2.3 deployed via MCP: now accepts tenant_id from body.
  Fallback: Medi Rec hardcoded ID if tenant_id not supplied.
  Input: { tenant_id?, days?, orders_per_day? }

trial_expires_at column added to tenants table (migration).

seed-tenant EF v1 (general_retail profile only):
  Input: { tenant_id, industry_profile?, seed_days? }
  Step 1: 6 inventory_items (finished_product/hardware/accessory)
  Step 2: opening stock movements (purchase_in, backdated 35 days)
  Step 3: 6 expenses (opex, backdated 5-30 days)
  Step 4: tenant_config vat_registered = true
  Step 5: opening journal entry (Dr 12000 / Cr 30000)
  Step 6: sim-pos-sales call with tenant_id (non-blocking)
  Step 7: branding_config.seed_complete = true + trial_expires_at = now+30d
  Idempotent: skips if seed_complete already true.

### Validation results (Maxi Retail SA — 11 Apr 2026)
  seed_products: 10 (4 wizard + 6 SEED-*)
  expenses: 6 ✓
  journals: 1 ✓
  sim_orders: 232 (30 days × ~8/day, correct tenant_id) ✓
  seed_complete: true ✓
  trial_expires_at: 2026-05-10 ✓

### LL-221 audit findings (captured for future sessions)
sim-pos-sales tenant was hardcoded in repo (v2.0) — deployed v2.3 fixed.
Always check deployed EF vs repo file when EF contract matters (LL-193).

## Edge Functions — 16 deployed
All prior EFs unchanged. New additions this session:
  invite-user v3 — role validation (LL-222)
  seed-tenant v1 — general_retail seed

## sim-pos-sales repo file
supabase/functions/sim-pos-sales/index.ts is still showing v2.0 in repo.
Deployed version is v2.3 (accepts tenant_id). Repo sync is a known gap —
the deployed version is authoritative per LL-193.

## Next session priorities
1. WP-INDUSTRY-SEEDS Phase 2 — wizard ?demo=true wiring
   - OnboardingWizard.js Step 7 launch handler: call seed-tenant EF
     after wizard_complete flips true
   - Show "Seeding your industry data..." progress during seed
   - Handle seed_days from wizard (default 30)
2. WP-INDUSTRY-SEEDS Phase 3 — F&B demo package (Nourish Kitchen)
   - New seed template for food_beverage profile
   - seed-tenant EF v2: add food_beverage branch
   - New F&B demo tenant creation
3. WP-NAV-RESTRUCTURE — still pending for CA demo

## Owner actions pending
- wizard_complete for Vozel Vapes: confirm via /onboarding → Outcome D
- Supabase Auth SMTP → Resend
- CIPRO + nuai.co.za domain

## Testing protocol (LL-214)
Always incognito after Vercel "Ready". Never Ctrl+R.

---
*SESSION-STATE v232 · NuAi · 11 April 2026*
*HEAD 108c804 · Phase 4 CLOSED · WP-INDUSTRY-SEEDS Phase 1 COMPLETE*
