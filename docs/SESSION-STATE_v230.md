# SESSION-STATE v230
## Current as of: 11 April 2026
## HEAD: 19f8fe5 on origin/main

---

## Platform state
NuAi ERP — production multi-tenant SaaS.
6 tenants (5 cannabis/test, 1 nicotine vape demo).
14 Edge Functions deployed.
110 DB tables, all RLS-secured.
Live URL: https://nuai-gfive5ys-projects.vercel.app
Supabase project: uvicrqapgzcdvozxrreo (eu-west-1)

## What happened in v229 (brainstorm session — no code)
This was a strategy-only session. No Claude Code. No commits to src/.
One commit: LL-221 + Agent Capabilities added to NUAI-AGENT-BIBLE.md (19f8fe5).

WP-DEMO-FACTORY has been renamed WP-INDUSTRY-SEEDS.
All 8 open questions from the brainstorm doc have been answered and decided.
A pre-build audit protocol (LL-221) is now permanent in the AGENT-BIBLE.

## Decisions locked in v229

NAMING: WP-INDUSTRY-SEEDS (product feature, not a demo tool)

THREE PACKAGES:
  Package 1 — General Retail: Vozel Vapes (70% done — needs trading data)
  Package 2 — Food & Beverage: Nourish Kitchen & Deli (new tenant, full build)
  Package 3 — Cannabis: Medi Rec, framed as medicinal/dispensary (data completion, not seed)

CANNABIS: Always visible. Medi Rec reframed as medicinal store.
  No URL hiding. No parameter tricks.

TRIAL vs DEMO: Option C — real 30-day trial account per CA scan.
  trial_expires_at = launched_at + 30 days (new column needed on tenants).
  After 30 days without payment: is_active = false. Data preserved.
  referred_by (TEXT) on tenants for salesperson attribution tracking.

WIZARD MODE: Full 7 steps with smart defaults in ?demo=true mode.
  CA decides: business name + brand colour only.
  Everything else (industry, template, products, loyalty) pre-selected or automatic.
  Step 7 shows "Seeding your data..." progress bar (30 seconds).

PROFESSIONAL SERVICES: Out of scope. WP-SERVICE-BILLING when demand signal exists.

## Critical scope error identified — Fix D
The v229 session prompt scoped Fix D (Invite User) as a client-side call to
supabase.auth.admin.inviteUserByEmail(). This is wrong.
auth.admin requires the service_role key. The React client has the anon key only.
The correct architecture:
  HQTenants.js → new invite-user Edge Function → service_role key →
  auth.admin.inviteUserByEmail() → on success → send-email EF (branded welcome)
Any agent that implements Fix D without this EF will fail at runtime.
This is a mandatory scope correction before any build session on Fix D.

## WP-STOREFRONT-WIZARD Phase 4 — status
Fix A: PENDING — OnboardingWizard.js Step 7 legacy shop key writes
Fix B: PENDING — Shop.js "PROTEA REWARDS" rebrand
Fix C: PENDING — Shop.js footer isCannabis gate
Fix D: PENDING — invite-user EF (corrected scope above)

## WP-INDUSTRY-SEEDS — build order
Step 1: Fix A (prerequisite — broken shop branding blocks all demo tenants)
Step 2: Fix B + C (batch in one commit — same file)
Step 3: Fix D (invite-user EF — CAs must be able to log in after meeting)
Step 4: seed-tenant EF v1 (general_retail + food_beverage profiles)
Step 5: Wizard ?demo=true wiring + progress screen
Step 6: Cannabis data completion on Medi Rec (separate — not the seed EF)

## Pre-build audit rule (LL-221) — now permanent in AGENT-BIBLE
Before any WP build session, agent must answer from source code:
1. Which files get touched? Read them first.
2. Which DB tables? Do they have hq_all_ RLS policies (LL-205)?
3. Which EFs are called? Read index.ts — confirm exact input/output contracts.
4. What prerequisites must ship first?
5. What does the spec miss?
Written audit summary required in chat before first Claude Code block.

## Vozel Vapes — owner action still required
wizard_complete is still false.
Owner must run /onboarding end-to-end as admin@protea.dev on production.
This generates the welcome QR. Required before any CA meeting.
URL: https://nuai-gfive5ys-projects.vercel.app/onboarding

## Other owner actions outstanding
- Supabase Auth SMTP → Resend (branded magic link emails)
- CIPRO registration → domain → nuai.co.za
- pg_cron for loyalty-ai nightly (SQL in AGENT-BIBLE Section 8)
- Update ProteaAI CODEBASE_FACTS (EF count = 14)

## Testing protocol (MANDATORY — LL-214)
Always incognito after Vercel "Ready". Never Ctrl+R.

---
*SESSION-STATE v230 · NuAi · 11 April 2026*
*HEAD 19f8fe5 · v229 = brainstorm only · WP-INDUSTRY-SEEDS scoped and decided*
