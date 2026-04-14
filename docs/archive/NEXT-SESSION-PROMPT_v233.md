# NEXT SESSION START PROMPT — v233
## Updated: 11 April 2026 · HEAD: 0c70be0

Read these documents IN FULL before doing anything:
1. docs/NUAI-AGENT-BIBLE.md — especially LL-222 and LL-223
2. docs/BUILD-LOG.md
3. docs/SESSION-STATE_v233.md
4. docs/VIOLATION_LOG_v1_1.md

Confirm HEAD, EF count (17), Nourish Kitchen seeded status.

## PRIORITY 1 — WP-NAV-RESTRUCTURE

The HQ has 41 tabs and no grouping. For the CA demo, the operator needs to
navigate confidently. Read HQProduction.js (8,949 lines) and HQTenants.js
BEFORE touching anything. The goal: visually group the 41 tabs into logical
sections without changing routing or breaking any existing functionality.

LL-221 audit required before any code. Read the actual tab list from the
component before proposing structure.

## PRIORITY 2 — Vozel Vapes wizard validation

Owner action: run /onboarding as admin@protea.dev.
Confirm Outcome D: wizard shows "Your shop is live" for Vozel Vapes.
Confirm seeding sub-message shows "✦ Seeding your industry data in the background…"

## KEY FACTS FOR THIS SESSION

seed-tenant v3: ACTIVE (version 3)
  - general_retail and food_beverage both work
  - callSim removed (LL-223) — sim triggered via HQ RUN 30 DAYS button
  - HACCP hazard_type: lowercase only (biological/chemical/physical/allergen)
  - temperature_logs location_type: refrigerated/frozen/ambient only

LL-223: Deno EFs CANNOT call sibling EFs via internal fetch. Never add an
  EF-to-EF fetch call. Client-side supabase.functions.invoke() works fine.

Nourish Kitchen tenant_id: 944547e3-ce9f-44e0-a284-43ebe1ed898f
  Fully seeded. 240 orders. Do not re-seed (idempotency guard is active).

trigger-sim-nourish EF: throwaway, delete via Supabase MCP or dashboard.
