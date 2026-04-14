# NEXT SESSION START PROMPT — v229
## Updated: 10 April 2026 · HEAD: 872f927

---

Read these documents IN FULL before doing anything:
1. docs/NUAI-AGENT-BIBLE.md
2. docs/BUILD-LOG.md — especially Session v228
3. docs/SESSION-STATE_v229.md
4. docs/VIOLATION_LOG_v1_1.md
5. docs/COMMERCIAL-READINESS_v1_0.md

Confirm you have read all five. State:
- Current HEAD commit
- What wizard_complete is for Vozel Vapes
- What LL-215 is (critical for this session)
- The correct testing protocol (LL-214)

Priority 0 (before all else): Read docs/WP-DEMO-FACTORY_brainstorm_v1_0.md
in full. This session is a brainstorm on that document.
No code. No Claude Code. Strategy and architecture only.

## THE MISSION

NuAi is being built as the first truly AI-native ERP SaaS.
Every session, every agent builds on everything before it.
The BUILD-LOG, AGENT-BIBLE, and SESSION-STATE are the
compounding intelligence system. Read them with this in
mind — you are not starting fresh, you are continuing
a long-running mission with full institutional memory.

## IMMEDIATE OWNER ACTION (before any code)

Owner must run the /onboarding wizard end-to-end:
  URL: https://nuai-gfive5ys-projects.vercel.app/onboarding
  Login: admin@protea.dev
  Expected: type "Vozel Vapes" → outcome B (resume) →
  walk steps 2-7 → tap "Launch my shop →" →
  wizard_complete flips to true, welcome QR generated.
  Test scan: the QR URL must open /shop/vozel-vapes
  on a phone browser.

After owner completes this, agent verifies via Supabase
MCP: check wizard_complete, launched_at, and qr_codes row.

## PRIORITY 1 — WP-STOREFRONT-WIZARD Phase 4

### Fix A — Wizard Step 7 must write legacy shop keys
When Step 7 launches a new tenant (wizard_complete: false
→ true), the branding_config merge must include BOTH:
  New wizard keys (already written in Steps 1-6)
  Legacy shop keys (required by ClientHeader and Shop.js):
    brand_name       ← tenants.name
    shop_name        ← tenants.name
    accent_color     ← branding_config.primary_color
    btn_bg           ← branding_config.primary_color
    btn_text         ← '#FFFFFF'
    hero_eyebrow     ← '{name} · Online Store'
    hero_tagline     ← branding_config.tagline || 'Shop now'
    nav_logo_text    ← tenants.name
    stat_1_value     ← product count (query at launch time)
    stat_1_label     ← 'Products'
    stat_2_value     ← '100%'
    stat_2_label     ← 'Lab tested'
    stat_3_value     ← category count
    stat_3_label     ← 'Categories'
    stat_4_value     ← 'R{min_price}+'
    stat_4_label     ← 'From'
Without this, every new wizard-launched tenant has the
branding_config schema mismatch that broke Vozel Vapes
(which was fixed manually in the DB via MCP).
File: src/pages/OnboardingWizard.js, Step 7 launch handler.

### Fix B — Shop loyalty section rebrand
On /shop/vozel-vapes the loyalty CTA shows "PROTEA REWARDS".
Find in Shop.js where brandingConfig?.loyalty_program_name
or the hardcoded "Protea Rewards" string appears.
For general_retail tenants: use brandingConfig?.brand_name
+ " Rewards" or just "Loyalty Rewards" as fallback.
Wrap any cannabis-specific loyalty copy in isCannabis.

### Fix C — Footer cleanup
Footer shows "Lab Verified · Be Authenticated" —
cannabis-specific phrases. Wrap in isCannabis gate.
For general_retail: show nothing or brandingConfig?.tagline.

### Fix D — Invite User button (LL-212)
HQTenants.js Invite User button currently calls send-email
EF only — sends a notification email but does NOT create
a Supabase auth account. No one can actually log in.
Fix: call supabase.auth.admin.inviteUserByEmail() FIRST
(creates auth account + magic link), THEN call send-email
EF with type 'user_invitation' for the branded welcome.
Read HQTenants.js in full before touching it.

## PRIORITY 2 — WP-NAV-RESTRUCTURE

HQ Command Centre has 41 tabs with no clear grouping story.
A CA opening the dashboard for the first time sees noise.
Goal: group tabs logically so the CA sees a coherent story.

Read docs/LIVE-AUDIT_v1_0_part1.md for the full tab list.
Proposed groups (LL-178/179 — additive only, no tab removal):
  OPERATIONS: Overview, Supply chain, Suppliers, Procurement,
    Production, HQ Stock, Daily Trading, POS Till, Cash-Up,
    Transfers, Distribution
  INTELLIGENCE: Analytics, Retailer health, Reorder
  FINANCE: P&L, Balance Sheet, Invoices, Journals, Bank Recon,
    Fixed Assets, Expenses, Forecast, VAT, Year-End Close
  FOOD & BEVERAGE: Ingredients, Recipes, HACCP, Food Safety,
    Nutrition Labels, Cold Chain, Recall & Trace,
    Food Intelligence
  PLATFORM: Tenants, Medical, Wholesale Orders, Loyalty,
    Fraud, Documents, Email Logs
  PEOPLE: HR, Shops

This grouping is already partially implemented (visible in
the screenshot from session v228). Confirm current state
before making changes.

## PRIORITY 3 — Commercial gaps (if time allows)

Review COMMERCIAL-READINESS_v1_0.md.
Next open gaps after GAP-C02 (email — CLOSED):
  GAP-B01: Subscription billing — no plans/billing table
  GAP-A01: Feature gating — no plan entitlements
  GAP-D01: Self-service signup — all tenants manual currently

## TESTING PROTOCOL — READ LL-214 BEFORE FIRST TEST

ALWAYS test in incognito. NEVER Ctrl+R.
Wait for Vercel dashboard "Ready" status before testing.
Service worker caches aggressively — incognito bypasses it.

## COMMIT CONVENTION THIS SESSION

After each logical unit of work:
  git add -A && git commit -m "type: description"
  git push origin main
Then open incognito, wait for Vercel "Ready", test.
Do not stack multiple pushes before testing.
One push → verify → next push.

---
*NEXT-SESSION-PROMPT v229 · NuAi · 10 April 2026*
*The mission: first truly AI-native ERP SaaS.*
*Every session compounds. Read everything. Build forward.*
