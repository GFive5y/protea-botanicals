# NEXT SESSION PROMPT v256
## Context: WP-UNIFY COMPLETE — post-migration session
## Date produced: 13 April 2026
## CA demo: ~12 May 2026 — ~4 weeks away

---

## READ BEFORE ANYTHING ELSE (mandatory order)
1. docs/PLATFORM-OVERVIEW_v1_0.md
2. docs/NUAI-AGENT-BIBLE.md
3. docs/SESSION-STATE_v257.md
4. docs/WP-UNIFY_v1_0.md (scan status table to confirm complete state)

---

## THE CURRENT STATE IN ONE SENTENCE

WP-UNIFY is complete. Every authenticated portal screen in NuAi now draws
from src/styles/tokens.js. The CA demo is ~4 weeks away. There is no
pending refactor blocking demo readiness.

---

## WHAT REMAINS BEFORE 12 MAY

### Option A — Demo polish pass (recommended first)
Walk the full CA demo path and verify visually:
  HQ portal -> HQOverview -> P&L -> Balance Sheet -> Stock
  Tenant Portal -> each of 4 demo tenants
  Group Portal -> Network view -> Combined P&L
  HR suite -> Timesheets -> Leave

### Option B — New feature work
WP-UNIFY is no longer blocking. Pick next work package.

### Option C — WP-UNIFY-CONSUMER (post-demo, lowest priority)
Consumer pages colour tokens in const C/F objects.

---

## CRITICAL RULES
- RULE 0Q: Never push_files from Claude.ai
- UNIFY-1: No new local T definitions ever
- UNIFY-2: Migrate on touch
- LL-221: Read source file before any edit

## REPO STATE
- HEAD: 2e5303a (verify with git log --oneline -1)
- Supabase: uvicrqapgzcdvozxrreo

---
*NEXT-SESSION-PROMPT v256 · 13 April 2026*
*WP-UNIFY done. Demo is 4 weeks away. Polish and verify.*
