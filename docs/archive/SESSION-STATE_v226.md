# SESSION-STATE v226
## Produced: 10 Apr 2026 — WP-STOREFRONT-WIZARD Phase 1 close
## Previous: v225 (HEAD e61d7e6 → fbc5dd9 → 439ac7b this session)
## Session type: New work package — Phase 1 of WP-STOREFRONT-WIZARD

---

## PLATFORM STATE

- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **HEAD:** 439ac7b (pushed to origin)
- **Live URL:** nuai-gfive5ys-projects.vercel.app (custom domain pending)
- **Vercel project:** nuai (prj_M2qcKbX8LOylzSxwIRisXhs4JQ40)
- **Supabase:** uvicrqapgzcdvozxrreo · FREE tier
- **Company:** Nu Ai (Pty) Ltd.

---

## COMMITS THIS SESSION (since v225)

| Commit | What |
|---|---|
| e61d7e6 | feat(GAP-C02): email infrastructure via Resend — send-email EF + email_logs + HQ viewer |
| fbc5dd9 | docs: add BUILD-LOG, close GAP-C02 in COMMERCIAL-READINESS, add LL-211/212/213 |
| 439ac7b | feat: WP-STOREFRONT-WIZARD Phase 1 — wizard shell, Step 1, live preview, design token system |

---

## WP-STOREFRONT-WIZARD — Phase 1 SHIPPED ✅

The self-service onboarding wizard new tenants use to configure and launch
their storefront. Standalone route at /onboarding. Does not touch any
existing portal or component.

### New files

- **src/styles/wizard.css** — locked design token system
  - 4-size type scale (display / heading / body / caption)
  - 8px spacing grid (4 / 8 / 16 / 24 / 32 / 48 / 64)
  - 9 colour tokens including --wz-brand
  - 48px / 56px touch targets
  - Inter @import from Google Fonts
  - All scoped to .wz-root — zero bleed into existing styles
  - color-mix() generates soft fills from --wz-brand

- **src/components/wizard/StorefrontPreview.js** — live preview right pane
  - Browser chrome mockup (red/yellow/green dots + URL pill)
  - Header with logo (or initials fallback) + business name
  - Nav row (Home/Shop/Loyalty/Account, Home active)
  - Hero band with eyebrow + tagline (6% brand-tinted background)
  - 2x2 placeholder product grid
  - Loyalty badge strip
  - Reactive to wizardData props — updates within one render cycle

- **src/pages/OnboardingWizard.js** — 7-step wizard shell at /onboarding
  - Two-column 50/50 desktop split
  - Mobile: single column, preview collapses to 200px bottom strip
  - Progress bar fills L→R across 7 steps (no "Step X of Y" text)
  - Step 1 (Brand identity) FULLY BUILT:
    - Autofocused name input (48px, Inter 16px)
    - Drag-and-drop logo zone (SVG/PNG/JPG, 2MB cap, dragover feedback)
    - Object URL revocation on unmount
    - Slug auto-derivation from name
    - 56px CTA disabled until name >= 2 chars (opacity 0.5, label preserved)
  - Steps 2–7: placeholder panels with step title

- **src/App.js** — additive only
  - One import: OnboardingWizard
  - One <Route path="/onboarding"> placed alongside other standalone routes
  - No NavBar, no AppShell, no auth guard — wizard owns the full viewport

### Design decisions made beyond spec

1. CSS variables scoped to .wz-root (not :root) to prevent bleed
2. color-mix() for all soft fills — single brand variable cascades
3. Slug auto-derivation so URL pill in preview updates live too
4. Initials fallback for empty-state preview logo
5. Object URL lifecycle managed via ref + useEffect cleanup
6. Drop zone is keyboard-accessible (Enter/Space triggers picker)
7. CTA disabled = opacity 0.5 only — no cursor or label colour shifts
8. Route placed alongside /scan as standalone (no NavBar inheritance)
9. --wz-brand hardcoded to #2D5BE3 (Vozel Vapes) for Phase 1 —
   Phase 2 will inject from tenant branding_config

### Build verification

CI=false npm run build → ✅ pass
Bundle delta: main.js +2.15 kB · main.css +1.55 kB
Zero new warnings on wizard files.

---

## VOZEL VAPES TENANT — LIVE IN DB

Created via Supabase MCP (not via code, no migration file).

```
tenant_id:           388fe654-ce64-4128-819a-dcf7b810280f
slug:                vozel-vapes
industry_profile:    general_retail
primary_color:       #2D5BE3
font_family:         Inter
tenant_config:       row exists
loyalty_config:      row exists
```

This is a nicotine vape company. Never use cannabis terminology
(strain/THC/CBD) in any wizard work — industry_profile is general_retail.

---

## COMMERCIAL GAPS STATUS

GAP-C01: Mobile camera capture ✅ CLOSED (v224)
GAP-C02: Email infrastructure ✅ CLOSED (v225 — earlier this session)
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
- WP-STOREFRONT-WIZARD Phase 2 (see NEXT-SESSION-PROMPT_v226)
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

### Wizard-specific guard rails (this WP only)

- Wizard CSS scope: ALL wizard styles live under .wz-root in src/styles/wizard.css
  Never add wizard styles to global stylesheets. Never reference --wz-* outside .wz-root.
- Wizard does NOT touch any existing portal, component, or DB row.
  Vozel Vapes tenant was created via MCP. Wizard reads/writes only when explicitly scoped.
- No cannabis terminology anywhere in wizard files. industry_profile = general_retail.
- Live preview must respond within one React render cycle. No debounce on text inputs.

---
*SESSION-STATE v226 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
*WP-STOREFRONT-WIZARD Phase 1 shipped · Phase 2 next*
