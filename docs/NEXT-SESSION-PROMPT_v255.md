# NEXT SESSION PROMPT v255
## For: WP-UNIFY P1 (HQOverview migration) + Demo Rehearsal
## Date produced: 13 April 2026
## CA demo: ~12 May 2026 — 4 weeks away

## READ BEFORE ANYTHING ELSE (mandatory order)
1. docs/PLATFORM-OVERVIEW_v1_0.md
2. CLAUDE.md (repo root)
3. docs/NUAI-AGENT-BIBLE.md
4. docs/SESSION-STATE_v256.md
5. docs/WP-UNIFY_v1_0.md — READ THIS IN FULL. Not optional.

## WHAT IS DONE
- WP-DS-6 all 4 phases shipped (shell, AINS bar, profile tokens, badges)
- WP-UNIFY documented with full 77-file blast zone inventory
- WP-UNIFY wired into CLAUDE.md, BIBLE, PLATFORM-OVERVIEW
- All 4 CA demo tenants complete and browser-verified
- Demo group seeded: "NuAi Business Rescue Portfolio" (Group Portal working)
- feature_medical = true for MediCare Dispensary

## WHAT IS NEXT — TWO PARALLEL TRACKS

### TRACK A: Demo Rehearsal (no code changes needed)
Walk all 4 tenants in order. Document anything that breaks the story.
Check list per tenant:
  Medi Recreational: green sidebar, VAT badge red, AINS pills populate
  MediCare Dispensary: blue sidebar, Medical Records opens, badges show
  Garden Bistro: terracotta sidebar, no badges (healthy store)
  Metro Hardware: charcoal sidebar, VAT red, Bank Recon amber
  Group Portal: all 4 stores in network, Combined P&L loads, Revenue Intel loads
  AINS bar: click a pill -> AI drawer opens -> streams analysis

### TRACK B: WP-UNIFY P1 — HQOverview.js migration
This is the FIRST screen the CA sees. Highest demo impact.

BEFORE TOUCHING HQOverview.js:
1. Read docs/WP-UNIFY_v1_0.md Part 9 (migration pattern) in full
2. Read src/components/hq/HQOverview.js in full (LL-221)
3. Identify all local token definitions (const C = {...} or const T = {...})
4. Map each local value to nearest T equivalent
5. Run CI=false npm run build after changes

WHAT TO DO:
- Add: import { T } from "../../styles/tokens";
- Remove: local const C or const T definition
- Replace: all local token references with T.* equivalents
- Apply UNIFY-3 (two weights only) and UNIFY-4 (one border) throughout
- Commit: "refactor(UNIFY): migrate HQOverview.js to tokens.js"
- Update status table in WP-UNIFY_v1_0.md

AFTER HQOverview.js, continue to HQProfitLoss.js (P1 priority 2).

## CRITICAL RULES THIS SESSION
- UNIFY-1: No local T definition ever
- UNIFY-2: Migrate on touch — every opened file gets migrated
- RULE 0Q: Never push_files from Claude.ai
- LL-221: Read source file before any edit
- The Group Portal is the visual standard. Every migrated component
  must feel like it was built in the same room as the Group Portal.

## COMMIT CHAIN TO VERIFY (git log --oneline -8)
Should show WP-UNIFY docs commits from 13 April session.
HEAD confirmed before any work begins.

---
*NEXT-SESSION-PROMPT v255 · 13 April 2026*
*WP-UNIFY P1 is next. Read the doc. Then read HQOverview.js. Then migrate it.*
