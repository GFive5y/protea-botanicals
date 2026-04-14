# NEXT SESSION START PROMPT — v231
## Updated: 11 April 2026 · HEAD: ee01a8f

---

Read these documents IN FULL before doing anything:
1. docs/NUAI-AGENT-BIBLE.md
2. docs/BUILD-LOG.md
3. docs/SESSION-STATE_v231.md
4. docs/VIOLATION_LOG_v1_1.md
5. docs/WP-DEMO-FACTORY_brainstorm_v1_0.md

Confirm you have read all five. State:
- Current HEAD commit
- What sim-pos-sales accepts as input (from HQTenants.js)
- What LL-221 requires before any build begins
- Status of invite-user EF

## WP-STOREFRONT-WIZARD Phase 4 — CLOSED
All fixes shipped. No open items.

## PRIORITY 1 — WP-INDUSTRY-SEEDS Phase 1

Run LL-221 audit before writing a single line of code:
1. Read supabase/functions/sim-pos-sales/index.ts — confirm
   exact input contract ({ days, orders_per_day } — not seed_days)
2. Read supabase/functions/send-email/index.ts — confirm
   welcome email trigger contract
3. Check RLS on: haccp_control_points, food_recipes,
   temperature_logs, food_ingredients (hq_all_ policies LL-205)
4. Verify trial_expires_at column exists on tenants table
   (if not, migration needed before seed EF can write it)
5. Read COMMERCIAL-READINESS_v1_0.md for GAP-B01 context
   (trial lifecycle ties into subscription billing gap)

Build targets for Phase 1:
A. General Retail seed template (JSON — products, suppliers,
   expenses matching Vozel Vapes profile)
B. seed-tenant Edge Function v1 (general_retail profile first,
   validate manually before wiring to wizard)
C. tenants.trial_expires_at column (migration via Supabase MCP)

Do NOT build F&B seed template or wizard wiring in Phase 1.
Validate general_retail seed in isolation first.

## IMMEDIATE OWNER ACTION
Run /onboarding wizard end-to-end as admin@protea.dev:
  URL: https://nuai-gfive5ys-projects.vercel.app/onboarding
  Expected: type "Vozel Vapes" → Outcome D (already launched) →
  confirms wizard_complete=true.
  If that shows, Vozel Vapes is confirmed live. No re-run needed.
  The welcome QR already exists: WELCOME-vozelvapes-5577MH

## TESTING PROTOCOL (LL-214)
Always incognito. Never Ctrl+R. Wait for Vercel "Ready".
