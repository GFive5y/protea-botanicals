# SESSION-STATE v229
## Current as of: 10 April 2026
## HEAD: 872f927 on origin/main

---

## Platform state
NuAi ERP — production multi-tenant SaaS.
6 tenants (5 cannabis/test, 1 nicotine vape demo).
14 Edge Functions deployed.
110 DB tables, all RLS-secured.
Live URL: https://nuai-gfive5ys-projects.vercel.app
Supabase project: uvicrqapgzcdvozxrreo (eu-west-1)

## WP-STOREFRONT-WIZARD — status
Phase 1: SHIPPED (439ac7b) — wizard shell, Step 1, live preview
Phase 2: SHIPPED (8d2b8a7) — Steps 2-5, auth guard, slug check
Phase 3: SHIPPED (1df00c0) — Steps 6-7, launch flow, QR, logo
Phase 4: PENDING — see next priorities

## Vozel Vapes demo tenant
tenant_id: 388fe654-ce64-4128-819a-dcf7b810280f
slug: vozel-vapes
industry_profile: general_retail
branding_config.primary_color: #2D5BE3
branding_config.brand_name: Vozel Vapes (legacy key — set via MCP)
branding_config.wizard_complete: false
branding_config.launched_at: null
vozel_products: 4 (VVZ-001 through VVZ-004)
vozel_qr_codes: 0
vozel_loyalty: configured (Standard preset)
Live shop: https://nuai-gfive5ys-projects.vercel.app/shop/vozel-vapes
Status: SHOWING 4 PRODUCTS CORRECTLY as of 872f927

## What still says "Protea" on /shop/vozel-vapes
- Loyalty section: "PROTEA REWARDS" and "Earn Points on
  Every Purchase / Scan your product QR code to earn
  loyalty points" — these strings are in Shop.js and
  reference brandingConfig.loyalty_program_name or are
  hardcoded. Phase 4 fix required.
- footer copyright: "© 2026 Vozel Vapes · Lab Verified ·
  Be Authenticated" — last two phrases are cannabis-specific.
  Need isCannabis gate.

## Infrastructure confirmed live
storefront-assets bucket: public, 2MB, JPEG/PNG/SVG/WebP
RLS anon policies: tenants_public_read_active,
  inventory_items_public_read_active
email_logs table: live with LL-205 bypass
send-email EF: v1, deployed, RESEND_API_KEY in vault

## Critical owner actions still pending
1. Run /onboarding wizard end-to-end as admin@protea.dev
   on production URL to flip wizard_complete=true and
   generate the Vozel Vapes welcome QR code.
   The QR is the centrepiece of the CA meeting demo.
2. Fix Supabase Auth SMTP → Resend (branded email for
   password reset and magic links)
3. CIPRO registration → domain purchase → nuai.co.za
4. Update ProteaAI CODEBASE_FACTS (EF count = 14)

## Next session priorities (in order)
1. WP-STOREFRONT-WIZARD Phase 4 — see NEXT-SESSION-PROMPT
2. WP-NAV-RESTRUCTURE — HQ nav for CA demo
3. Fix Invite User (LL-212)
4. Fix wizard Step 7 to write both branding_config key sets
   (wizard keys + legacy shop keys) for new tenants

## Testing protocol (MANDATORY — LL-214)
ALWAYS test in incognito after Vercel shows "Ready".
NEVER use Ctrl+R — it serves cached JS.
Service worker in this app caches aggressively.

---
*SESSION-STATE v229 · NuAi · 10 April 2026*
*HEAD 872f927 · Wizard shipped Phase 1-3 · Vozel Vapes shop LIVE*
