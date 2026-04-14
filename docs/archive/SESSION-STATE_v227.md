# SESSION-STATE v227
## Produced: 10 Apr 2026 — WP-STOREFRONT-WIZARD Phase 2 close
## Previous: v226 (HEAD 08f6ce7 → ba9e521 → 8d2b8a7 this session)
## Session type: Phase 2 of WP-STOREFRONT-WIZARD

---

## PLATFORM STATE

- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **HEAD:** 8d2b8a7 (pushed to origin)
- **Live URL:** nuai-gfive5ys-projects.vercel.app
- **Vercel project:** nuai (prj_M2qcKbX8LOylzSxwIRisXhs4JQ40)
- **Supabase:** uvicrqapgzcdvozxrreo · FREE tier
- **Company:** Nu Ai (Pty) Ltd.

---

## COMMITS THIS SESSION (since v226)

| Commit | What |
|---|---|
| ba9e521 | feat: WP-STOREFRONT-WIZARD Phase 2 — auth gate, back nav, slug check, Steps 2-5 |
| 8d2b8a7 | fix: persist terminology_profile to branding_config on Step 3 |

---

## WP-STOREFRONT-WIZARD — Phase 2 SHIPPED ✅

The wizard now runs end-to-end through Steps 1–5, persists progress
to the tenants and inventory_items tables on each Continue, and
correctly resumes a half-built tenant.

### Phase 2 capabilities

- Auth gate at /onboarding (post-auth only)
- '← Back' navigation from Step 2 onwards (state preserved)
- Slug uniqueness check on Step 1 with 3 outcomes (new / resume / collision)
- Stub tenant created on Step 1 Continue (new path)
- Resume path loads branding_config + existing inventory_items
- Dynamic --wz-brand injection from tenant branding_config
- 8 preset colour swatches + custom hex on Step 2
- 4 industry tiles on Step 3 (nicotine_vape is UI-only label)
- 3 template cards on Step 4 (CSS-only mocks)
- Product list/add/skip on Step 5 with demo seed fallback
- StorefrontPreview reactive to brandColor / template / terminology / products

### Files changed this session

- src/styles/wizard.css (additive — Phase 2 token additions)
- src/components/wizard/StorefrontPreview.js (rewritten to consume
  template, terminologyProfile, products, brandColor)
- src/pages/OnboardingWizard.js (rewritten — 285 → ~980 lines)

### Targeted fix (8d2b8a7)

Step 3 was writing only `industry_profile` (DB column).
On resume, the wizard couldn't distinguish nicotine_vape from
general_retail because both map to `industry_profile='general_retail'`.
The fix writes `terminology_profile` to `branding_config` JSONB on
Step 3 Continue, and the resume path reads it back to restore the
exact tile the user originally picked. Vozel Vapes already has
`terminology_profile: 'nicotine_vape'` set via MCP — resume now
correctly pre-selects the vape tile.

---

## VOZEL VAPES TENANT — Phase 2 STATE

```
tenant_id:           388fe654-ce64-4128-819a-dcf7b810280f
slug:                vozel-vapes
industry_profile:    general_retail (DB column)
branding_config:
  primary_color:       #2D5BE3
  font_family:         Inter
  terminology_profile: nicotine_vape   ← set via MCP, restored on resume
  wizard_complete:     false
inventory_items: 4 rows (VVZ-001..VVZ-004 — see tenant brief)
```

---

## SCHEMA NOTES (carry forward)

- `tenants.branding_config` is JSONB. Always read → merge → write
  to avoid clobbering sibling keys.
- `inventory_items.category` is an enum (LL-182) but the Supabase
  JS client coerces string literals — no `::cast` needed in JS inserts.
- `tenants` does not require `tier` or `type` for a stub insert.
- `/login` route does not exist. Use `/account?return=...`.

---

## COMMERCIAL GAPS STATUS

GAP-C01: Mobile camera capture ✅ CLOSED (v224)
GAP-C02: Email infrastructure ✅ CLOSED (v225)
GAP-C03: Supabase Pro — when first client onboards
GAP-C04: Background jobs (pg_cron) — before first client
GAP-C05: CA Firm Partner Portal — within 30 days of first client
GAP-C06/07/08: Scale items — long term

---

## OUTSTANDING BEFORE CA MEETING

Priority 1 — owner actions:
- Purchase custom domain (app.nuai.co.za or similar) + add to Vercel
- Update Supabase Site URL to custom domain once purchased
- Upgrade RESEND_FROM_ADDRESS from sandbox to verified domain sender
- Delete nexai-erp Vercel project (dead experiment)
- Replace public/logo192.png + logo512.png with Nu Ai branded icons

Priority 2 — dev (next session):
- WP-STOREFRONT-WIZARD Phase 3 (Steps 6+7, logo upload, isResuming UI)
- WP-NAV-RESTRUCTURE: clean nav grouping for CA demo
- AGENT-BIBLE refresh: add LL-211/212/213, 14 EFs, correct live URL

---

## KEY ACCOUNTS

admin@protea.dev — password: admin123 — hq_access: true
fivazg@gmail.com — password: NuAi2026! — hq_access: true

---

## EDGE FUNCTIONS (14 active — unchanged this session)

ai-copilot v70 · payfast-checkout v47 · payfast-itn v42 · sign-qr v39
verify-qr v37 · send-notification v40 · get-fx-rate v38 · process-document v56
sim-pos-sales v7 · create-admin-user v4 · auto-post-capture v5
receive-from-capture v4 · loyalty-ai v5 · send-email v1

---

## KEY RULES

- RULE 0Q: NEVER call any GitHub write tool from Claude.ai. EVER. (5 violations logged)
- LL-205: every new table needs hq_all_ RLS bypass policy
- LL-209: vendor_matched_id always null on capture_queue insert
- LL-210: capture_queue + document_log need hq_all_ bypass policies
- LL-211: send-email EF deployed with verify_jwt: true — test from prod, not localhost
- LL-212: user_invitation email sends notification only — does NOT create auth account
- LL-213: email_logs has no migration file — DB changes via MCP/dashboard, not migrations dir

### Wizard-specific guard rails

- All wizard styles scoped to .wz-root in src/styles/wizard.css
- No bleed into existing portals or components
- No cannabis terminology except in the dedicated cannabis_retail tile
- Live preview must update within one React render cycle
- Always read → merge → write JSONB columns (branding_config)

---
*SESSION-STATE v227 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
*WP-STOREFRONT-WIZARD Phase 2 shipped · Phase 3 next (Steps 6+7, logo upload, launch)*
