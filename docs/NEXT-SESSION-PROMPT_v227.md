# NEXT SESSION START PROMPT — v227
## Use this as the opening message for the next Claude session
## Updated: 10 Apr 2026 · HEAD: 8d2b8a7

---

Read the following documents from the repo in this exact order
before doing anything else:

1. docs/NUAI-AGENT-BIBLE.md
2. docs/BUILD-LOG.md  ← read Phase 1 + Phase 2 entries fully
3. docs/SESSION-STATE_v227.md
4. docs/VIOLATION_LOG_v1_1.md

Confirm you have read all four, then state:
- Current HEAD commit (8d2b8a7)
- The immediate priority (WP-STOREFRONT-WIZARD Phase 3)
- What RULE 0Q is and current violation count (5)
- The correct live URL: nuai-gfive5ys-projects.vercel.app
- Vozel Vapes tenant_id (388fe654-ce64-4128-819a-dcf7b810280f)

Then read the existing wizard files in full BEFORE planning Phase 3:
- src/styles/wizard.css
- src/components/wizard/StorefrontPreview.js
- src/pages/OnboardingWizard.js

Do NOT plan Phase 3 from memory. Read the files first.

---

## IMMEDIATE PRIORITY — WP-STOREFRONT-WIZARD Phase 3

Phase 1 + 2 shipped Steps 1–5 (brand identity, colour, industry,
template, products). Phase 3 finishes the wizard with Steps 6 + 7,
adds logo upload to Supabase Storage, and uses the isResuming flag
in the launch UI.

### Phase 3 scope

**Step 6 — Loyalty programme setup**
- Three tier presets the user picks from (one click each):
    Starter   — 1 point per R10 spent · 100 pts = R10 reward
    Standard  — 2 points per R10 spent · 100 pts = R20 reward (default)
    Generous  — 5 points per R10 spent · 100 pts = R50 reward
- Tile-style selection like Step 3 (use existing .wz-tile classes).
- Optional: skip link "Set up loyalty later" — writes nothing,
  advances to Step 7.
- Continue → INSERT or UPDATE loyalty_config row for tenant_id
  (read first to decide; Vozel Vapes already has a row).
- Map tile → loyalty_config columns:
    Starter:   pts_per_r100_online: 10,  redemption_value_zar: 0.10
    Standard:  pts_per_r100_online: 20,  redemption_value_zar: 0.20
    Generous:  pts_per_r100_online: 50,  redemption_value_zar: 0.50
  (Confirm column names against the schema before writing —
   loyalty_config has many fields, only touch these two and pts_qr_scan)
- StorefrontPreview loyalty strip text updates to reflect chosen tier:
  "Earn N points with every purchase" instead of generic copy.

**Step 7 — Go live**
- Final summary panel showing:
  - Brand name + logo (uploaded)
  - Brand colour swatch
  - Industry tile + terminology
  - Template choice
  - Product count
  - Loyalty tier
- Primary CTA: "Launch storefront →" (56px, --wz-brand)
- On launch:
  1. UPDATE tenants SET is_active=true,
     branding_config = {...existing, wizard_complete: true}
  2. If logo was uploaded (Phase 1 stored only as object URL),
     upload to Supabase Storage bucket 'storefront-assets' under
     tenant_id/logo.{ext}, then UPDATE branding_config.logo_url
  3. Generate a welcome QR code via sign-qr EF (qr_type:'storefront',
     payload:{tenant_id, slug, url}) and display it inline
  4. Show the live URL with a 'Copy' button
  5. Show 'Download QR' button (downloads the SVG/PNG)
- After launch, replace the form pane with a success state:
  - Big check mark
  - "Your storefront is live"
  - Live URL link
  - QR code download
  - "Open dashboard" button → /admin or /tenant-portal
- Resumers (isResuming=true) get a slightly different headline
  on Step 7: "Resume launch" instead of "Ready to launch?"

**Logo upload to Supabase Storage**
- Phase 1 stored the file as a local object URL only.
- Phase 3 uploads on Step 7 launch:
    bucket: 'storefront-assets'
    path:   `${tenant_id}/logo.${ext}`
    upsert: true
- After upload, get the public URL and save to
  branding_config.logo_url.
- If the bucket does not exist, owner must create it via Supabase
  dashboard before testing — log this as an owner action in the
  next BUILD-LOG entry.

**isResuming flag wired in Phase 3**
- On Step 7, branch the headline ("Ready to launch?" vs "Resume launch")
- On the success state, branch the message
  ("Your storefront is live" vs "Welcome back — your storefront is live")
- Optional: skip a celebratory animation for resumers (subtle —
  not required if it adds complexity)

### Hard rules carried forward

1. CSS scope: any new styles go in src/styles/wizard.css under .wz-root
2. New components live in src/components/wizard/
3. No changes to existing portals, components, or DB tables (apart from
   tenants.is_active flip and loyalty_config row touch)
4. No new EFs — sign-qr already exists at v39
5. No cannabis terminology except in the dedicated cannabis_retail tile
6. Live preview must update within one React render cycle
7. Always read → merge → write JSONB columns
8. Build must pass: CI=false npm run build before commit
9. Commit per phase, not per step. Owner reviews before push.

### Schema things to verify before writing

- loyalty_config column names (`pts_per_r100_online`, `redemption_value_zar`,
  `pts_qr_scan` are documented but verify with a select)
- sign-qr EF input shape (check the EF source or recent call sites)
- Supabase Storage bucket 'storefront-assets' — does it exist?
  If not, document as owner action and gate the upload behind a try/catch
  with a clear fallback (skip upload, leave logo as null in DB)

---

## SECONDARY PRIORITIES (only if Phase 3 lands clean)

1. **WP-NAV-RESTRUCTURE** — clean nav grouping for CA demo
   (LL-178/179: never replace existing renderTab cases — only add)

2. **GAP-C04 — pg_cron background jobs**
   - Nightly loyalty-ai run
   - VAT period close reminder (uses send-email EF)
   - Overdue payment alert sweep (uses send-email EF)

3. **AGENT-BIBLE refresh**
   - Add LL-211 through LL-213 to Section 7
   - Update EF count from 10 → 14
   - Update live URL (remove nuai.vercel.app everywhere)

---

## OWNER ACTIONS STILL PENDING

- Purchase custom domain (app.nuai.co.za or similar)
- Add domain to Vercel project settings
- Update Supabase Site URL + redirect URLs to new domain
- Upgrade RESEND_FROM_ADDRESS from onboarding@resend.dev sandbox
- Delete nexai-erp Vercel project
- Replace public/logo192.png + logo512.png with Nu Ai branded icons
- (Possible) Create Supabase Storage bucket 'storefront-assets'
  with public read + authenticated write — flag for Phase 3

---

## KEY FACTS TO CARRY

- Company: Nu Ai (Pty) Ltd.
- Live URL: nuai-gfive5ys-projects.vercel.app
  (nuai.vercel.app belongs to someone else — NEVER use it)
- Supabase: uvicrqapgzcdvozxrreo · FREE tier
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- Vozel Vapes tenant: 388fe654-ce64-4128-819a-dcf7b810280f
- 14 EFs · 110 DB tables · 42 HQ tabs · 6 portals

### Wizard quick reference

- Route: /onboarding (auth-gated, no nav, post-login)
- Files:
  - src/styles/wizard.css (design tokens, .wz-root scope)
  - src/components/wizard/StorefrontPreview.js (live preview)
  - src/pages/OnboardingWizard.js (7-step shell)
- 7 steps: brand-name · brand-color · industry · template · products · domain · review
- Steps built so far: 1, 2, 3, 4, 5
- Steps for Phase 3: 6 (loyalty), 7 (launch) — replaces current
  'domain' and 'review' STEPS entries (rename them in Phase 3)
- wizardData fields populated by Phase 2: tenantId, name, slug,
  logoFile, logoUrl, brandColor, industryTileId, industryProfile,
  terminologyProfile, template, products, existingProducts, isResuming
- Tenant stub created on Step 1 Continue (new path)
- Each Step Continue persists progress to DB
- Resume path loads from branding_config.terminology_profile

### Vozel Vapes ready-to-test state

- Step 1: enter "Vozel Vapes" → outcome B (resume)
- Step 2: pre-selects #2D5BE3 swatch + populates hex input
- Step 3: pre-selects nicotine_vape tile (after fix 8d2b8a7)
- Step 4: pre-selects whatever template was last saved
- Step 5: read-only list of 4 VVZ-* products
- Step 6: NOT YET BUILT (Phase 3)
- Step 7: NOT YET BUILT (Phase 3)

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
- All wizard styles scoped to .wz-root in src/styles/wizard.css
- No bleed into existing portals or components
- No cannabis terminology except in cannabis_retail tile
- Always read → merge → write JSONB columns

---
*NEXT-SESSION-PROMPT v227 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
*WP-STOREFRONT-WIZARD Phase 2 shipped · Phase 3 = Steps 6+7, logo upload, launch with QR*
