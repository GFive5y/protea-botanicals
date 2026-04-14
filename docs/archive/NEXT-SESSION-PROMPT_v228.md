# NEXT SESSION START PROMPT — v228
## Use this as the opening message for the next Claude session
## Updated: 10 Apr 2026 · HEAD: 1df00c0

---

Read the following documents from the repo in this exact order
before doing anything else:

1. docs/NUAI-AGENT-BIBLE.md
2. docs/BUILD-LOG.md  ← read Phase 1, 2, AND 3 entries fully
3. docs/SESSION-STATE_v228.md
4. docs/VIOLATION_LOG_v1_1.md

Confirm you have read all four, then state:
- Current HEAD commit (1df00c0)
- The immediate priority (E2E wizard test for Vozel Vapes)
- What RULE 0Q is and current violation count (5)
- The correct live URL: nuai-gfive5ys-projects.vercel.app
- Vozel Vapes tenant_id (388fe654-ce64-4128-819a-dcf7b810280f)

Then read the existing wizard files in full BEFORE planning anything:
- src/styles/wizard.css
- src/components/wizard/StorefrontPreview.js
- src/pages/OnboardingWizard.js

The wizard is feature-complete as of v227. Phase 3 has not been
exercised end-to-end against the live tenant. That is the next job.

---

## PRIORITY 1 — End-to-end wizard test (Vozel Vapes)

Owner runs the wizard manually via the production deployment
(localhost may behave differently — see LL-211 for the email EF,
similar caution for the wizard). Claude Code's role this session
is to read the resulting DB state and confirm everything landed
correctly, then fix any drift.

### Pre-flight (verify before owner clicks anything)

- supabase: confirm Vozel Vapes is still at wizard_complete:false
  (Phase 3 tested to outcome B / resume path)
- supabase: confirm storefront-assets bucket exists and is public
- supabase: confirm qr_codes table accepts wizard inserts (no RLS
  blockers — see SESSION-STATE_v228 infrastructure section)
- supabase: confirm loyalty_config row for Vozel exists (upsert path)
- vercel: confirm latest deployment includes commit 1df00c0

### Owner test steps

1. Log in as admin@protea.dev at https://nuai-gfive5ys-projects.vercel.app/account
2. Navigate to /onboarding
3. Type "Vozel Vapes" in the name input
4. Continue → expect outcome B (resume) — name input stays,
   resume banner appears on next step, --wz-brand pre-set to #2D5BE3
5. Step 2: confirm Vozel blue swatch is pre-selected. Continue.
6. Step 3: confirm "Vape & nicotine" tile is pre-selected. Continue.
7. Step 4: pick a template (Phase 2 didn't persist one). Continue.
8. Step 5: confirm 4 VVZ-* products show as read-only list. Continue.
9. Step 6: pick "Standard". Continue → loyalty_config upsert.
10. Step 7: review checklist → "Resume launch →"
    Watch the three sequential steps animate (Saving / Creating QR /
    Going live).
11. Success state: live URL + QR + Download QR + dashboard link.

### Verification AFTER the run (Claude Code's job)

Read the DB and confirm:
- tenants WHERE id=388fe654-ce64-4128-819a-dcf7b810280f
  - is_active should be true
  - branding_config.wizard_complete should be true
  - branding_config.launched_at should be a recent ISO timestamp
  - branding_config.template should be set
  - branding_config.logo_url may be null (no file uploaded in test)
- loyalty_config WHERE tenant_id=388fe654-...
  - pts_per_r100_online: 10
  - pts_per_r100_retail: 10
  - threshold_silver: 500
  - threshold_gold: 1500
  - pts_qr_scan: 100
- qr_codes WHERE tenant_id=388fe654-... AND qr_type='welcome'
  - exactly one row
  - source_label: 'wizard'
  - campaign_name: 'Vozel Vapes — Welcome'
  - scan_actions JSON has award_points + custom_message + redirect
  - points_value: 100
  - cooldown_hrs: 24
- Confirm whether the qr_code value follows WELCOME-vozelvapes-XXXXXX
  pattern (local fallback) OR a sign-qr v39 pattern. Report which
  path won. If sign-qr accepted the rich payload, document the
  response shape so the dual-path can be pruned in a future phase.

If anything diverges from expected, fix the wizard before moving
on. Resume by reading any drift directly with the Supabase MCP
list/read tools — do not guess.

---

## PRIORITY 2 — Verify /shop/:slug routing

Wizard generates a live URL of the form:
  https://nuai-gfive5ys-projects.vercel.app/shop/vozel-vapes

But App.js currently has:
  <Route path="/shop" element={<Shop />} />

There is NO /shop/:slug param route. StorefrontContext resolves
the tenant from window.location.hostname (domain-based), not
from the path. Going to /shop/vozel-vapes will hit the catch-all
<Navigate to="/404" /> instead of resolving to Vozel.

Two options:
A) Add a path-based slug route:
   <Route path="/shop/:slug" element={<Shop />} />
   Plus: StorefrontContext (or Shop.js) reads useParams().slug
   when present and queries tenants by slug instead of domain.

B) Switch the wizard's launchedUrl to a domain-based URL once a
   custom domain is configured. Not viable until app.nuai.co.za
   is purchased.

Recommend Option A for the CA demo. Read these files first:
- src/App.js (route table around lines 901–1110)
- src/contexts/StorefrontContext.js (tenant resolution at lines 60–120)
- src/pages/Shop.js (top of file — useStorefront hook)

Then propose the smallest possible additive change. New /shop/:slug
route + small StorefrontContext branch reading useParams. NO breaking
changes to existing /shop behaviour.

---

## PRIORITY 3 — WP-NAV-RESTRUCTURE for CA demo

Only start this after Priority 1 + 2 are clean. The CA needs to see
a sidebar that reads as a product tour, not a dev dump. Spec lives in
NEXT-SESSION-PROMPT_v226 / v227 carried forward. Hard rule: LL-178/179
— never replace existing renderTab cases, only add new groupings or
re-order entries.

Files of interest:
- src/hooks/useNavConfig.js (HQ_PAGES array, 426 lines)
- src/pages/HQDashboard.js (TABS array + renderTab, 313 lines)

Before touching anything: read both files in full, produce a plain-
English before/after grouping map, get owner sign-off, THEN edit.

---

## SECONDARY (only if Priority 1–3 clear)

1. Fix HQTenants Invite User button (LL-212 real auth invite)
2. AGENT-BIBLE refresh — LL-209 through LL-213 + 14 EFs + correct URL
3. GAP-C04 pg_cron background jobs (loyalty-ai nightly, VAT reminder
   sweep, overdue payment alert sweep)

---

## OWNER ACTIONS STILL PENDING

- Run the Phase 3 wizard E2E test (Priority 1)
- Purchase custom domain (app.nuai.co.za or similar)
- Add domain to Vercel project settings
- Update Supabase Site URL + redirect URLs to new domain
- Upgrade RESEND_FROM_ADDRESS from sandbox
- Delete nexai-erp Vercel project
- Replace public/logo192.png + logo512.png with Nu Ai branded icons

---

## KEY FACTS TO CARRY

- Company: Nu Ai (Pty) Ltd.
- Live URL: nuai-gfive5ys-projects.vercel.app
  (nuai.vercel.app belongs to someone else — NEVER use it)
- Supabase: uvicrqapgzcdvozxrreo · FREE tier
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- Vozel Vapes tenant: 388fe654-ce64-4128-819a-dcf7b810280f
- 14 EFs · 110 DB tables · 42 HQ tabs · 6 portals

### Wizard quick reference (post-Phase 3)

- Route: /onboarding (auth-gated, no nav, post-login)
- Files:
  - src/styles/wizard.css (.wz-root scoped tokens)
  - src/components/wizard/StorefrontPreview.js (live preview)
  - src/pages/OnboardingWizard.js (7-step shell — feature-complete)
- 7 steps: brand-name · brand-color · industry · template · products · loyalty · launch
- All 7 steps built and persist progress on Continue
- Slug check has 4 outcomes: A (new) / B (resume) / C (taken) / D (already launched)
- Logo upload to storefront-assets/{tenant_id}/logo.{ext} (best-effort)
- Welcome QR generated via sign-qr (best-effort) + qr_codes INSERT (always)
- Success state renders QR via QRCodeSVG (qrcode.react) with PNG download
- APP_URL constant: https://nuai-gfive5ys-projects.vercel.app

### Vozel Vapes Phase 3 test prediction

If E2E run lands clean:
- tenants.is_active → true
- branding_config.wizard_complete → true
- branding_config.launched_at → recent ISO timestamp
- branding_config.template → whatever picked on Step 4
- loyalty_config: pts_per_r100_*=10, threshold_silver=500,
  threshold_gold=1500, pts_qr_scan=100
- qr_codes: 1 row, qr_type='welcome', source_label='wizard',
  campaign_name='Vozel Vapes — Welcome', points_value=100
- Live URL hit: hits 404 unless /shop/:slug is wired (Priority 2)

---

## CRITICAL RULES TO READ FIRST

RULE 0Q — NEVER call GitHub write tools from Claude.ai. 5 violations logged.
          Session close is not an exception. Docs are not an exception.
          Write content in chat as a Claude Code instruction block.

LL-178/179 — New nav = new entries + new cases. Never replace existing.
LL-205 — Every new DB table needs hq_all_ RLS bypass policy.
LL-211 — All email sends go through emailService.js.
LL-212 — EFs validate bearer token before parsing body.
LL-213 — DB changes via MCP or dashboard, not migration files.

Wizard-specific:
- All styles in .wz-root in src/styles/wizard.css
- No bleed into existing portals
- No cannabis terminology except in cannabis_retail tile
- Always read → merge → write JSONB columns
- APP_URL hardcode — never localhost in DB writes or QR payloads
- sign-qr is best-effort; always insert qr_codes as fallback

---
*NEXT-SESSION-PROMPT v228 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
*Wizard feature-complete · Next: E2E verify, /shop/:slug routing, then nav restructure*
