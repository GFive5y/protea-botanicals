# NuAi Build Log
## Canonical record of what was built in each session
## Future agents: read this BEFORE SESSION-STATE to understand platform history

---

## Glossary (read once — used throughout this file)

| Term | Meaning |
|---|---|
| EF | Edge Function — TypeScript serverless function in supabase/functions/, deployed to Supabase's edge network. NuAi's backend compute layer. |
| WP | Work Package — a named body of work spanning multiple sessions (e.g. WP-FINANCIALS, WP-NAV-RESTRUCTURE) |
| GAP-Xnn | A gap identified in COMMERCIAL-READINESS_v1_0.md that must be closed before commercial launch |
| LL-nnn | Lesson Learned — a numbered rule in NUAI-AGENT-BIBLE.md derived from a past mistake |
| RLS | Row Level Security — Postgres policy that restricts which rows each user role can read/write |
| LL-205 | Every new DB table needs a hq_all_ RLS bypass policy for the HQ operator role |
| AVCO | Average Cost — inventory valuation method, recalculated by DB trigger on every stock movement |
| IFRS | International Financial Reporting Standards — the accounting framework NuAi's financial suite targets |

---

## Session v224 — 10 April 2026
**Commit:** e61d7e6  
**HEAD after session:** e61d7e6  
**Work package:** GAP-C02 (Commercial Readiness — Communication gap)  
**Status:** CLOSED

### What was built

GAP-C02 closed the email infrastructure gap identified in COMMERCIAL-READINESS_v1_0.md.
Before this session, NuAi had no mechanism to send transactional emails.
Password reset emails were broken (Supabase Site URL pointed to a different person's app).

**New Edge Function — send-email v1**
File: supabase/functions/send-email/index.ts
- Mirrors send-notification (v37) in structure — same auth pattern, same error shape
- Validates bearer JWT before any work (verify_jwt: true — NOTE: all other EFs are verify_jwt: false)
- Cooldown check: queries email_logs before calling Resend — prevents duplicate sends
- Cooldown windows per type: invoice_delivery 24h, vat_reminder 168h, year_end_notification 168h,
  user_invitation 24h, overdue_payment_alert 48h, statement_email 24h
- Reply-to split: CLIENT_FACING types (invoice_delivery, overdue_payment_alert, statement_email)
  use payload.tenantContactEmail; INTERNAL types use admin@protea.dev
- PDF attachment: fetches bytes from pdfUrl, base64 encodes, attaches. Hard cap 5MB.
- Logs every send attempt to email_logs (status: sent | failed)
- Secrets: RESEND_API_KEY, RESEND_FROM_ADDRESS, APP_URL

**New DB table — email_logs**
Applied directly via Supabase MCP (no migration file — project has no migrations directory).
Columns: id, tenant_id, type, recipient, subject, status, resend_id, error, metadata, sent_at, created_at
RLS: hq_all_email_logs (LL-205 bypass) + tenant_read_email_logs + tenant_insert_email_logs
Indexes: (tenant_id, type, sent_at desc), (recipient, sent_at desc)

**New service — src/services/emailService.js**
Single wrapper around supabase.functions.invoke('send-email').
Typed convenience helpers for each email type.
All frontend call sites use this — never invoke the EF directly.

**New HQ component — src/components/hq/HQEmailLogs.js**
Cross-tenant email audit log viewer.
KPI strip (total / sent / failed), filters by status / type / tenant.
Expandable detail row: resend_id, error, metadata JSON.
No tenant_id prop (LL-207). Uses hq_all_email_logs RLS policy.

**Nav wiring**
src/pages/HQDashboard.js + src/hooks/useNavConfig.js
New 'email-logs' tab in Platform group. Wired to HQEmailLogs.
Existing tabs untouched.

**Additive email buttons (6 files, no existing logic changed)**
- HQInvoices.js: Email button per invoice row (invoice_delivery) + Send Overdue Alert on AR banner (overdue_payment_alert)
- HQVat.js: Email Reminder on VAT period summary (vat_reminder)
- HQYearEnd.js: Email Notification on post-close success screen (year_end_notification)
- HQTenants.js: Invite User per tenant row (user_invitation)
- HQFinancialStatements.js: Email Statement next to Print/Save PDF (statement_email)

**ProteaAI CODEBASE_FACTS str_replace**
EF count updated 10→11 (later corrected to 14 after live audit).
send-email v1 listed. ai-copilot bumped to v67.

### Owner actions completed this session
1. email_logs table applied via Supabase MCP
2. Secrets added to Supabase vault: RESEND_API_KEY, RESEND_FROM_ADDRESS, APP_URL
3. send-email EF deployed: supabase functions deploy send-email
4. Supabase Site URL fixed: nuai.vercel.app → nuai-gfive5ys-projects.vercel.app (unbreaks password reset)

### Known issues found during session (not yet fixed)
1. INVITE USER button (HQTenants.js) calls send-email EF — sends a notification email only.
   Does NOT call supabase.auth.admin.inviteUserByEmail(). Recipient gets an email but
   no Supabase auth account is created and no portal access is granted.
   FIX REQUIRED: replace with real Supabase auth invite + send branded welcome via send-email.

2. send-email EF has verify_jwt: true — all other EFs are verify_jwt: false.
   On localhost, JWT may not pass correctly. This caused the first test invite to
   fail silently (email_logs remained empty). Test from production URL, not localhost.

3. From address is sandbox (onboarding@resend.dev). Cannot use branded address until
   nuai.co.za domain is purchased and verified in Resend.
   Switch is a single secret update — RESEND_FROM_ADDRESS → noreply@nuai.co.za

### Live EF inventory after this session (14 total)
ai-copilot v70, payfast-checkout v47, payfast-itn v42, sign-qr v39, verify-qr v37,
send-notification v40, get-fx-rate v38, process-document v56, sim-pos-sales v7,
create-admin-user v4, auto-post-capture v5, receive-from-capture v4, loyalty-ai v5,
send-email v1

---

## Session v225 — 10 April 2026 (continued)
**WP:** WP-STOREFRONT-WIZARD Phase 1
**Commit:** 439ac7b

### What was built
- src/styles/wizard.css — design token system,
  .wz-root scoped, Inter @import, color-mix() for brand
  derivatives
- src/components/wizard/StorefrontPreview.js — live
  consumer shop preview with browser chrome, reactive
  to wizardData, initials fallback, slug auto-derivation
- src/pages/OnboardingWizard.js — 7-step wizard shell,
  Step 1 fully built (name input + logo upload + CTA),
  Steps 2-7 placeholders, progress bar (no step count)
- src/App.js — additive: one import + one Route at /onboarding

### Design decisions
--wz-brand hardcoded to #2D5BE3 (Vozel Vapes) for Phase 1.
Phase 2 injects from tenant branding_config once tenant
context is established. color-mix() generates all soft fills
from the single brand variable. .wz-root scoping prevents
any bleed into existing portals.

### Vozel Vapes tenant (created via MCP, not code)
tenant_id: 388fe654-ce64-4128-819a-dcf7b810280f
slug: vozel-vapes · industry_profile: general_retail
primary_color: #2D5BE3 · font_family: Inter
loyalty_config and tenant_config rows exist.

### Phase 2 scope (next session)
Steps 2–5: colour picker, industry selector, template
picker, product entry with demo seed fallback.
--wz-brand injection from tenant branding_config.
Requires: read tenant row after slug is confirmed in Step 1.

---

## Session v226 — 10 April 2026
**WP:** WP-STOREFRONT-WIZARD Phase 2
**Commits:** ba9e521 (Phase 2 build), 8d2b8a7 (terminology_profile fix)
**Status:** Phase 2 SHIPPED — pushed to origin

### What was built

**ROUTE GUARD (Gap 3)**
OnboardingWizard now calls supabase.auth.getSession() on mount.
No session → <Navigate to="/account?return=/onboarding"> (matches
existing RequireAuth convention; codebase has no /login route).
'Loading…' fullscreen state covers the auth-check race.

**BACK NAVIGATION (Gap 4)**
'← Back' link above the progress bar for stepIndex >= 1.
Decrements stepIndex; wizardData state object preserves all
previous values automatically (single shared object).

**STEP 1 — SLUG UNIQUENESS CHECK (Gap 2)**
Continue handler queries tenants by slug, branches three ways:
A) No match → INSERT stub tenant (name + slug + is_active:false +
   branding_config:{wizard_complete:false, primary_color:#2D5BE3}).
   Stores tenantId in wizardData. Advances.
B) Match + wizard_complete:false → resume.
   Loads branding_config + industry_profile + existing inventory_items.
   Injects loaded primary_color into --wz-brand. Advances.
C) Match + wizard_complete:true → inline error + clickable suggestion
   chips ('<name> SA' / '<name> JHB') that update the input.
Spinner inside CTA during the check; button disabled.

**DYNAMIC --wz-brand INJECTION**
applyBrandColor(color) writes to .wz-root via style.setProperty.
Triggered on slug-check resolve AND on every wizardData.brandColor
change (useEffect). color-mix() derivatives in CSS recalc automatically.
The --wz-brand hardcode from Phase 1 is now a default, not a constraint.

**STEP 2 — BRAND COLOUR**
8 preset swatches in 4-col grid (Vozel blue first as default).
Custom hex input with live validation (^#[0-9A-Fa-f]{6}$).
Preview updates instantly via the CSS variable.
Continue: select → merge → update branding_config.primary_color
(preserves other keys written by adjacent steps).

**STEP 3 — INDUSTRY + TERMINOLOGY**
4 tiles (2x2 grid): general_retail / nicotine_vape / food_beverage /
cannabis_retail.
nicotine_vape tile is UI-only — DB writes industry_profile='general_retail'.
terminology_profile (UI tile id) is also written to branding_config so
the resume path can restore the exact tile choice.
Continue: UPDATE both industry_profile and branding_config in one call.

**STEP 4 — TEMPLATE LAYOUT**
3 cards: Minimal / Bold / Editorial.
Visual layout previews drawn with CSS boxes (no images, no SVGs).
Mocks tint with --wz-brand so they update live.
Continue: merge-update branding_config.template.

**STEP 5 — FIRST PRODUCTS**
Branches on existingProducts.length:
- > 0 (Vozel path): read-only list with SKU/name/price + 'Add more
  in dashboard' note. Continue enabled immediately.
- = 0 (new tenant): inline add form (name + price), max 5 local
  products, Continue inserts to inventory_items, OR 'Skip — add
  products later' link seeds 4 demo products (DEMO-001..004) tagged
  ['demo','seed'] for later cleanup.

**StorefrontPreview updates**
Now consumes terminologyProfile, template, products, brandColor from
wizardData. Product card facet labels switch per terminologyProfile.
Hero size, text, and grid columns shift per template choice.

### Targeted fix this session (commit 8d2b8a7)

Step 3 originally only wrote industry_profile (DB column).
On resume, the wizard couldn't distinguish the general_retail tile
from the nicotine_vape tile (both map to industry_profile='general_retail').
User's tile choice was silently lost on every reload.

Fix: Step 3 Continue now ALSO writes branding_config.terminology_profile.
Resume path reads cfg.terminology_profile first, falls back to
industry_profile, then 'general_retail'. Both industryTileId and
terminologyProfile restore to that value.

Vozel Vapes had terminology_profile:'nicotine_vape' set via MCP before
the fix landed, so resume now correctly pre-selects the nicotine_vape tile.

### Schema notes
- branding_config is JSONB. Always select → merge → update; never
  blind-overwrite (would clobber sibling keys from other steps).
- inventory_items.category is an enum (LL-182). The Supabase JS
  client coerces string literals at PostgREST level — no ::cast
  needed in JS-driven inserts.
- tenants does not require tier or type for stub insert.
- /login route does not exist. Use /account?return=... (RequireAuth
  convention).

### Build delta
Phase 2 build (ba9e521): main.js +3.91 kB · main.css +958 B (vs Phase 1)
Terminology fix (8d2b8a7): negligible (~+200 B JS)

### Phase 3 scope (next session)
Steps 6 (loyalty setup) + 7 (go live).
Step 7 writes branding_config.wizard_complete:true, generates a welcome
QR via sign-qr EF, shows live URL + QR download.
Logo upload to Supabase Storage (Phase 1 stored as object URL only).
isResuming flag wired into Phase 3 welcome UI.

---

## Session v227 — 10 April 2026
**WP:** WP-STOREFRONT-WIZARD Phase 3
**Commit:** 1df00c0

### What was built
- Step 6: Loyalty preset selection (Starter/Standard/Generous)
  upserts loyalty_config. Cards stacked vertically.
  StorefrontPreview loyalty strip driven by loyaltyWelcomePoints.
- Step 7: Launch flow — logo upload → QR generation → go live.
  Three-step labelled progress (not spinner). is_active flipped
  as a separate UPDATE in the "Going live" step.
- Success state: live URL, QRCodeSVG render, PNG download,
  dashboard CTA.
- Outcome D: slug match + wizard_complete:true + ownership
  check via user_profiles.tenant_id. Correctly separates
  "your tenant already launched" from "slug taken by someone else".
- Resume banner: color-mix() brand-tinted, appears Step 2+ when
  isResuming:true.
- Logo upload to storefront-assets/{tenant_id}/logo.{ext},
  best-effort, inline error if fails, launch proceeds regardless.

### QR generation approach
Dual path: (1) try sign-qr EF with welcome payload,
(2) always INSERT qr_codes directly as fallback.
Idempotent — duplicate constraint error swallowed on collision.
qr_codes RLS: admin_write_qr policy is permissive (qual:true),
INSERT works for any authenticated session.
QR encodes: https://nuai-gfive5ys-projects.vercel.app/scan/{code}
fgColor = wizardData.brandColor.

### Infrastructure confirmed this session
storefront-assets bucket: created via MCP, public, 2MB,
JPEG/PNG/SVG/WebP, RLS policies applied.
qr_codes RLS: permissive write for authenticated users.
user_profiles.tenant_id: confirmed — ownership check valid.

### Known deferred items
- sign-qr v39 welcome payload acceptance: not verified
  end-to-end. Fallback path covers this.
- wizard_complete:true not yet set for Vozel Vapes — will flip
  when wizard is run end-to-end by owner.
- /shop/vozel-vapes route: wizard generates the URL but the
  consumer shop must actually resolve /shop/:slug — verify
  this route exists in App.js before the CA demo.

### Phase 4 scope (if needed)
- Verify /shop/:slug routing for tenant storefronts
- WP-NAV-RESTRUCTURE (CA meeting prep)
- Fix Invite User button (LL-212 — real auth invite)

---

## Session v228 — 10 April 2026 (extended)
**Commits this session:** ba9e521 → 872f927 (13 commits)
**HEAD:** 872f927 on origin/main
**WP:** WP-STOREFRONT-WIZARD Phase 2 + Phase 3 + shop integration

---

### Phase 2 (commit ba9e521 + 8d2b8a7)
Full wizard Steps 2–5 built. Auth guard (/onboarding is
post-auth only, redirects to /account?return=/onboarding).
Slug uniqueness check with 4 outcomes: A=new, B=resume,
C=taken, D=already launched. Dynamic --wz-brand injection
from tenant branding_config.primary_color. Steps built:
  Step 2: colour picker (8 presets + hex input)
  Step 3: industry + terminology selector (4 tiles)
  Step 4: template layout (3 CSS-only mock layouts)
  Step 5: product entry (or read-only if products exist)
terminology_profile stored in branding_config so resume
path restores the correct industry tile.
Bug fix (8d2b8a7): Step 3 saves terminology_profile to
branding_config. Resume path reads cfg.terminology_profile
?? cfg.industry_profile ?? 'general_retail'.

### Phase 3 (commits 1df00c0 + fix commits)
Steps 6–7 built. Launch flow:
  Step 6: Loyalty preset (Starter/Standard/Generous)
    upserts loyalty_config via onConflict:'tenant_id'
  Step 7: Go live — logo upload → QR generation → launch
QR generation: dual path — tries sign-qr EF, always inserts
to qr_codes directly as fallback. idempotent.
Logo: uploaded to storefront-assets/{tenant_id}/logo.{ext}
on Step 7, best-effort (launch proceeds on failure).
wizard_complete: true written on successful launch.
Outcome D: wizard_complete=true + ownership check via
user_profiles.tenant_id → "Your shop is already live" screen.
Resume banner: shows "Continuing where you left off" when
isResuming=true (outcome B slug check).

### /shop/:slug route fix (b77bd48)
App.js: Route path="/shop" → path="/shop/:slug?"
StorefrontContext.js: resolveStorefront() now tries
/shop/<slug> path regex match FIRST before hostname/dev
fallback. Single-decision-tree resolver — one setState
batch, cancelled cleanup flag on unmount.

### RLS fixes (applied via MCP — no code commit)
Added to Supabase (project uvicrqapgzcdvozxrreo):
  tenants_public_read_active — anon SELECT where is_active
  inventory_items_public_read_active — anon SELECT where is_active
  storefront-assets bucket — created public, 2MB, RLS applied
Without these, /shop/:slug returned no data for anonymous users.

### branding_config dual-key fix (MCP + StorefrontContext)
Vozel Vapes branding_config populated with legacy shop keys:
  brand_name, shop_name, accent_color, btn_bg, btn_text,
  hero_eyebrow, hero_tagline, nav_logo_text, stat_*_value/label,
  hide_cannabis_content, shop_categories, terminology_profile
Legacy keys are what Shop.js and ClientHeader actually read.
Wizard uses new keys (primary_color, font_family, etc.).
Both sets must coexist in branding_config for wizard-launched
tenants. Step 7 launch handler must write both key sets.
This is a known gap — currently only fixed manually in DB
for Vozel Vapes. New tenants will need code fix in Phase 4.

### ClientHeader fix (368b3d3)
ClientHeader.js had 3 hardcoded "Protea Botanicals" literals.
Fixed to read brandingConfig.brand_name via useStorefront().
Root cause: ClientHeader is the visible header on /shop routes,
not the NavBar from App.js. The wrong component was being fixed
for multiple sessions.

### Shop.js cannabis content gating (faab475)
All cannabis-specific content wrapped in isCannabis conditional:
  Hero stats (strains, THC%, Eybna lines, price)
  Category tabs (Flower, Concentrates, Edibles, etc.)
  Coming Soon sections (6 cannabis product categories)
  Footer tagline ("Premium Cannabis · South Africa")
General_retail tenants now see clean neutral content.

### The 'other' enum bug — root cause of blank products (872f927)
CRITICAL LESSON: PostgREST casts .in() filter values to the
column's Postgres type. inventory_category enum has no 'other'
member. When 'other' was included in the category filter array,
PostgREST failed the cast and returned 0 rows SILENTLY with no
error. This caused the entire product grid to be blank.
Fix: removed 'other' from the filter array.
Valid inventory_category enum values:
  finished_product, raw_material, terpene, hardware, packaging,
  concentrate, flower, edible, topical, medical_consumable,
  accessory, service

### Testing process failure — resolved
Multiple "fixes" appeared to do nothing because the browser
served cached JS bundles. Ctrl+R does not clear Vercel CDN or
service worker cache. Correct testing protocol:
  1. Wait for Vercel dashboard to show "Ready" for the commit
  2. Test in incognito window ONLY (no service worker, no cache)
  3. DevTools → Application → Service Workers → Unregister if needed
  4. OR: DevTools → Network → tick "Disable cache" then refresh

### Live state at session close
  HEAD: 872f927
  Vozel Vapes tenant: 388fe654-ce64-4128-819a-dcf7b810280f
  wizard_complete: false (not yet run through wizard end-to-end)
  launched_at: null
  vozel_products: 4 (VVZ-001, VVZ-002, VVZ-003, VVZ-004)
  vozel_qr_codes: 0 (generated when wizard is run)
  /shop/vozel-vapes: LIVE and showing 4 products correctly

### Outstanding before CA demo
  1. Run wizard end-to-end as admin@protea.dev on production URL
     This flips wizard_complete=true and generates the welcome QR
  2. WP-NAV-RESTRUCTURE — HQ nav grouping for demo flow
  3. Fix "PROTEA REWARDS" label on shop loyalty section
  4. Fix Invite User button (LL-212 — needs real auth invite)

---

## Session v229 — 11 April 2026
HEAD start: 872f927 · HEAD end: 19f8fe5
Type: BRAINSTORM ONLY — no src/ changes

### What happened
Full brainstorm session on WP-DEMO-FACTORY_brainstorm_v1_0.md.
All 8 open questions answered and decided.
WP-DEMO-FACTORY renamed to WP-INDUSTRY-SEEDS.
Pre-build audit protocol LL-221 added to NUAI-AGENT-BIBLE.md.
Agent Capabilities section added to NUAI-AGENT-BIBLE.md.

### Decisions made
- Three packages: General Retail (Vozel Vapes), F&B (Nourish Kitchen), Cannabis (Medi Rec medicinal)
- Cannabis: visible always, Medi Rec framed as medicinal/dispensary
- Trial accounts: real 30-day trial per CA scan (Option C)
- Wizard: full 7 steps with smart defaults in demo mode
- Professional Services: out of scope until demand signal
- Fix D scope error identified: requires invite-user EF, not client-side call

### Commits
19f8fe5 — docs: LL-221 pre-build audit rule + agent capabilities section (v229)

### DB changes
None this session.

### Owner actions pending
- wizard_complete still false for Vozel Vapes (run /onboarding)
- Supabase Auth SMTP → Resend
- CIPRO + domain

---

## Session v230 — 11 April 2026
HEAD start: f5be68b · HEAD end: ee01a8f
Type: BUILD — WP-STOREFRONT-WIZARD Phase 4

### What happened
LL-221 pre-build audit completed before any code written.
All four Phase 4 fixes shipped and verified via incognito testing.
invite-user EF deployed via Supabase MCP (Claude.ai, not CLI).
Session also validated LL-221 protocol works in practice.

### Commits
bebb083 — Fix A: OnboardingWizard Step 7 legacy shop keys + auto-SKU
9115c84 — Fix B+C: Shop.js loyalty rebrand + footer isCannabis gate
ee01a8f — Fix D: invite-user EF code + HQTenants two-step invite

### EF deployed
invite-user v1 — deployed via Supabase MCP, ACTIVE, verify_jwt: false

### DB changes
Maxi Retail SA branding_config patched via SQL (legacy shop keys).
No schema changes.

### Bugs found during testing
SKU null constraint on Step 5 manual product insert — fixed in bebb083.
Fix D scope error (client-side auth.admin) — caught in v229 audit,
  resolved correctly with EF architecture in v230.

### Owner actions pending
- Test Fix D end-to-end (Invite User button → check inbox)
- Vozel Vapes wizard check (confirm Outcome D, welcome QR exists)

---

## Session v230 — addendum (11 April 2026)
Fix D debugging continued after initial session close.

### Root cause found: user_profiles_role_check constraint
The user_profiles table has a CHECK constraint limiting role to:
  customer, admin, retailer, staff, hr, management
The HQ invite prompt defaulted to "manager" (invalid) causing
every user_profiles upsert to fail silently.

### Fixes applied
1. invite-user EF v3 deployed via Supabase MCP:
   - sanitizeRole() maps aliases to valid values
     (manager/owner/chairman/director → management)
   - Prevents silent constraint failures on any input
2. HQTenants.js prompt updated (1355170):
   - Shows valid roles: admin, management, staff, hr, retailer
   - Default changed from "manager" to "admin"
3. Two invited users patched manually via SQL:
   - jgfivaz@mweb.co.za → management / Maxi Retail SA
   - bio_duck@hotmail.com → admin / Maxi Retail SA

### New LL rule: LL-222
See NUAI-AGENT-BIBLE.md — user_profiles_role_check constraint.

---

## Session v231/v232 — 11 April 2026
HEAD start: 6076510 · HEAD end: 108c804
Type: BUILD — WP-INDUSTRY-SEEDS Phase 1 + Phase 4 Fix D debugging

### What happened
LL-221 pre-build audit caught sim-pos-sales hardcoded tenant — critical blocker.
sim-pos-sales v2.3 deployed via Supabase MCP (accepts tenant_id from body).
trial_expires_at column added to tenants table.
seed-tenant EF v1 built + deployed + validated.

### Commits
bfbff3d — Fix D v2: remove broken client-side send-email step
1355170 — Fix D v3: valid role prompt (admin, management, staff, hr, retailer)
6076510 — docs: LL-222 role constraint + Fix D addendum
108c804 — feat(seed-tenant): seed-tenant EF v1 + sim-pos-sales v2.3 repo sync

### EFs deployed this session
invite-user v3 — role validation (LL-222)
sim-pos-sales v2.3 — accepts tenant_id from body
seed-tenant v1 — general_retail seed, 7-step orchestration

### DB changes
tenants.trial_expires_at (TIMESTAMPTZ, nullable) — migration applied.
Maxi Retail SA seeded via seed-tenant EF for validation.

### Validation results
Maxi Retail SA: 6 SEED-* products, 6 expenses, 1 journal, 232 sim orders,
  seed_complete=true, trial_expires_at=2026-05-10 ✓

### Bugs / discoveries
sim-pos-sales had hardcoded Medi Rec tenant_id — fixed in deployed v2.3.
user_profiles_role_check constraint: valid roles = customer/admin/retailer/staff/hr/management.
invite-user EF now sanitizes role before upsert (v3).

---
*BUILD-LOG.md · NuAi · Created 10 April 2026*
*Append new sessions below — never edit entries above the line*
