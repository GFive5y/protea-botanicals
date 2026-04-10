# NEXT SESSION START PROMPT — v230
## Updated: 11 April 2026 · HEAD: 19f8fe5

---

Read these documents IN FULL before doing anything:
1. docs/NUAI-AGENT-BIBLE.md
2. docs/BUILD-LOG.md
3. docs/SESSION-STATE_v230.md
4. docs/VIOLATION_LOG_v1_1.md
5. docs/WP-DEMO-FACTORY_brainstorm_v1_0.md

Confirm you have read all five. State:
- Current HEAD commit
- What the three WP-INDUSTRY-SEEDS packages are
- What the scope error in Fix D is and the correct architecture
- What LL-221 requires before any build begins

## CRITICAL — READ BEFORE ANY BUILD

This session works on WP-STOREFRONT-WIZARD Phase 4.
Before writing a single line of code, run the LL-221 pre-build audit:
1. Read OnboardingWizard.js in full (Fix A)
2. Read Shop.js — search for "PROTEA REWARDS", "loyalty_program_name",
   "Lab Verified", "Be Authenticated" (Fix B + C)
3. Read HQTenants.js in full (Fix D)
4. Confirm invite-user EF does not yet exist in supabase/functions/
5. Verify RLS on any new tables this session will create

Do not produce a single Claude Code instruction block until the
audit summary is written in chat.

## IMMEDIATE OWNER ACTION (before any code)

If not already done: run /onboarding wizard end-to-end as admin@protea.dev.
URL: https://nuai-gfive5ys-projects.vercel.app/onboarding
This flips wizard_complete = true for Vozel Vapes and generates the welcome QR.
Verify via Supabase MCP after: check wizard_complete, launched_at, qr_codes row.

## PRIORITY 1 — Fix A (do this first)

OnboardingWizard.js Step 7 launch handler must write BOTH branding_config key sets.
READ THE FILE FIRST. Find the exact launch handler. Understand what it currently writes.
Then add the legacy shop keys:
  brand_name, shop_name, accent_color, btn_bg, btn_text,
  hero_eyebrow, hero_tagline, nav_logo_text,
  stat_1_value (product count — live query at launch time),
  stat_1_label, stat_2_value, stat_2_label,
  stat_3_value (category count — live query), stat_3_label,
  stat_4_value (R{min_price}+ — live query), stat_4_label
Pattern: select current branding_config → merge → update (never overwrite full column).
Add error handling: if live queries fail, launch must not proceed with incomplete branding.

## PRIORITY 2 — Fix B + C (same file, one commit)

Shop.js — find and fix:
  "PROTEA REWARDS" → brandingConfig?.brand_name + " Rewards"
    fallback: "Loyalty Rewards"
  Cannabis loyalty copy → wrap in isCannabis
  "Lab Verified · Be Authenticated" in footer → wrap in isCannabis
READ SHOP.JS IN FULL FIRST. It is 4,115 lines. Surgical changes only.

## PRIORITY 3 — Fix D (invite-user EF)

DO NOT implement this as a client-side call. See scope correction in SESSION-STATE v230.
Correct architecture:
  1. New EF: supabase/functions/invite-user/index.ts
     Input: { email, tenant_id, full_name, role }
     Uses SUPABASE_SERVICE_ROLE_KEY from vault
     Calls supabase.auth.admin.inviteUserByEmail()
     Returns: { success, user_id, error? }
  2. HQTenants.js: call invite-user EF first, then send-email EF on success
READ HQTenants.js IN FULL before touching it.

## COMMIT CONVENTION

After each fix — one push, then test in incognito after Vercel "Ready".
Never stack multiple fixes before testing (LL-214).
git add -A && git commit -m "fix: description"
git push origin main

## TESTING PROTOCOL (LL-214)

Always incognito. Never Ctrl+R. Wait for Vercel "Ready".
Test Fix A: run /onboarding as a new tenant, check /shop/{slug} branding.
Test Fix B/C: open /shop/vozel-vapes in incognito, check loyalty section + footer.
Test Fix D: use Invite User in HQTenants, check Supabase auth.users for new row.

---
*NEXT-SESSION-PROMPT v230 · NuAi · 11 April 2026*
*Priority: Phase 4 fixes A→B/C→D in order. LL-221 audit before any code.*
