# NEXT SESSION START PROMPT — v226
## Use this as the opening message for the next Claude session
## Updated: 10 Apr 2026 · HEAD: 439ac7b

---

Read the following documents from the repo in this exact order
before doing anything else:

1. docs/NUAI-AGENT-BIBLE.md
2. docs/BUILD-LOG.md  ← read BEFORE SESSION-STATE for platform history
3. docs/SESSION-STATE_v226.md
4. docs/VIOLATION_LOG_v1_1.md

Confirm you have read all four, then state:
- Current HEAD commit (439ac7b)
- The immediate priority (WP-STOREFRONT-WIZARD Phase 2)
- What RULE 0Q is and current violation count (5)
- The correct live URL: nuai-gfive5ys-projects.vercel.app
- Vozel Vapes tenant_id (from SESSION-STATE_v226)

Then read the existing wizard files in full BEFORE planning Phase 2:
- src/styles/wizard.css
- src/components/wizard/StorefrontPreview.js
- src/pages/OnboardingWizard.js

Do NOT plan Phase 2 from memory. Read the files first.

---

## IMMEDIATE PRIORITY — WP-STOREFRONT-WIZARD Phase 2

Phase 1 shipped the wizard shell + Step 1 (Brand identity).
Phase 2 builds Steps 2–5 and wires --wz-brand to live tenant data.

### Phase 2 scope

**Step 2 — Brand colour**
- Colour picker bound to wizardData.primaryColor
- Six suggested swatches + custom hex input
- On change → updates --wz-brand CSS variable on .wz-root in real time
- Preview re-tints instantly (color-mix derivatives cascade automatically)

**Step 3 — Industry**
- Selector: Vape & Nicotine / Food & Beverage / General Retail / Cannabis (hidden by default)
- Maps to industry_profile column on tenants
- Drives Step 4 template options

**Step 4 — Storefront template**
- Three template cards: Minimal / Bold / Editorial
- Each card shows a thumbnail of the layout
- Selection drives shop chrome — Phase 3 will actually swap templates,
  Phase 2 just records the choice in wizardData.template

**Step 5 — Products**
- Two paths: "Add my own products" or "Use demo seed for now"
- If "add own": simple repeater (name / price / image upload) up to 4 items
- If "demo seed": placeholder array shown in preview, real seed inserted
  on launch in Phase 4
- Preview product grid updates with whatever is in wizardData.products

### Tenant context wiring (CRITICAL)

After Step 1's slug is confirmed (Continue clicked), the wizard needs to
either match an existing tenant by slug OR create a new draft tenant row.

For Phase 2 (no auth on /onboarding yet):
- Check if a tenant with that slug exists. If yes, load branding_config.
- If no, hold the data in wizardData. Tenant creation lands in Phase 4
  (the "Launch" step) when auth + Supabase write are wired.

For Vozel Vapes specifically, the slug "vozel-vapes" already exists
(tenant_id 388fe654-ce64-4128-819a-dcf7b810280f). Loading that row
should populate primaryColor=#2D5BE3, fontFamily=Inter from
branding_config and inject into --wz-brand.

### Hard rules for Phase 2

1. CSS scope: any new styles go in src/styles/wizard.css under .wz-root.
   No global styles. No new CSS files.
2. New components live in src/components/wizard/.
3. No changes to existing portals, components, or DB tables.
4. No new EFs.
5. No cannabis terminology — Vozel Vapes is nicotine vape, general_retail.
6. Live preview must update within one React render cycle.
7. Build must pass: CI=false npm run build before commit.
8. Commit per phase, not per step. Owner reviews before push.

---

## SECONDARY PRIORITIES (only if Phase 2 lands clean)

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
   - Add send-email EF to the EF table

---

## OWNER ACTIONS STILL PENDING

- Purchase custom domain (app.nuai.co.za or similar)
- Add domain to Vercel project settings
- Update Supabase Site URL + redirect URLs to new domain
- Upgrade RESEND_FROM_ADDRESS from onboarding@resend.dev sandbox
  to a verified domain sender (e.g. no-reply@app.nuai.co.za)
- Delete nexai-erp Vercel project (dead experiment)
- Replace public/logo192.png + logo512.png with Nu Ai branded icons

---

## KEY FACTS TO CARRY

- Company: Nu Ai (Pty) Ltd.
- Live URL: nuai-gfive5ys-projects.vercel.app
  (nuai.vercel.app belongs to someone else — NEVER use it)
- Supabase: uvicrqapgzcdvozxrreo · FREE tier
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- Vozel Vapes tenant: 388fe654-ce64-4128-819a-dcf7b810280f (general_retail)
- 14 EFs · 110 DB tables · 42 HQ tabs · 6 portals

### Wizard quick reference

- Route: /onboarding (standalone, no nav, no auth)
- Files:
  - src/styles/wizard.css (design tokens, .wz-root scope)
  - src/components/wizard/StorefrontPreview.js (live preview pane)
  - src/pages/OnboardingWizard.js (7-step shell)
- 7 step IDs: brand · products · loyalty · payments · tax · domain · review
- Steps built so far: 1 (brand identity)
- wizardData fields populated by Phase 1: name, slug, logoFile, logoUrl
- --wz-brand currently hardcoded to #2D5BE3 — Phase 2 makes it dynamic

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
- No cannabis terminology — Vozel Vapes is nicotine vape, general_retail

---
*NEXT-SESSION-PROMPT v226 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
*WP-STOREFRONT-WIZARD Phase 1 shipped · Phase 2 = colour picker + industry + template + products + dynamic --wz-brand*
