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
*BUILD-LOG.md · NuAi · Created 10 April 2026*
*Append new sessions below — never edit entries above the line*
