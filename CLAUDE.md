# NuAi — Claude Code Session Instructions
## Version: 2.0 · Updated: 11 April 2026
## This file is loaded into every Claude Code session at start.
## Purpose: Orientation + absolute rules only.
## State, priorities, and rule details live in dedicated docs.

---

## WHAT THIS SYSTEM IS

NuAi is NOT a cannabis retail website. NuAi is NOT a dev project.

NuAi is a production multi-tenant SaaS ERP — live platform,
paying clients, real financial data. Every change is a production
change. Four industry profiles from one codebase + one database:
cannabis_retail · cannabis_dispensary · food_beverage · general_retail

---

## OWNER PROFILE

George Fivaz is non-technical. He uses Claude.ai (chat) for
strategy, architecture, and decisions. Claude Code (you) handles
all file edits, commits, and pushes. This is the standard
two-agent operating procedure. See docs/CLAUDE-COLLABORATION-PROTOCOL.md.

---

## YOUR FIRST ACTIONS — EVERY SESSION, NO EXCEPTIONS

0. Read docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md (+ any date-stamped
   addendums appended below the v1.0 body)
   → what this system is, what it can do, the quality standard expected
   → read before anything else; every other rule makes sense because of
     the system described in this file

1. git log --oneline -1
   → confirm HEAD before touching anything

2. Find and read the latest session docs:
   ls docs/NEXT-SESSION-PROMPT* | sort | tail -1
   ls docs/SESSION-STATE* | sort | tail -1
   Read BOTH in full before any task.

3. Read docs/NUAI-AGENT-BIBLE.md
   → all rules (240+ LLs) — this is the canonical rule source

4. Read docs/VIOLATION_LOG_v1_1.md
   → what broke before

5. Read the actual source file you intend to change (LL-221)
   → disk is truth, not docs about it

Do NOT trust HEAD hashes, EF versions, or priorities in any
document other than the one with the highest version number
currently on disk. Numbers drift. Disk does not lie.

---

## STACK

React 18 · Supabase (PostgreSQL + RLS + Edge Functions) · Vercel
Repo:      github.com/GFive5y/protea-botanicals · branch: main
Supabase:  uvicrqapgzcdvozxrreo (eu-west-1)
Local dev: localhost:3000
Shell:     PowerShell

POWERSHELL RULES:
- NEVER use && to chain commands — use ; or separate lines
- Build command: CI=false npm run build
- Zero new warnings acceptable after any change

---

## THE SEVEN PORTALS

/hq            HQ Command Centre — 41-tab cross-tenant operator
/tenant-portal Business owner — industry-adaptive waterfall nav
/admin         Store manager — 13-tab operations
/hr            HR Suite — 13 modules (BCEA, payroll, timesheets)
/shop          Consumer storefront — e-commerce + loyalty + PayFast
/staff         Staff self-service — 4 tabs
/group-portal  Franchise/Group owner — network dashboard (added 11 Apr 2026)

---

## ABSOLUTE RULES

RULE 0Q — NON-NEGOTIABLE, NO EXCEPTIONS, EVER:
  NEVER push_files or create_or_update_file from Claude.ai.
  All code changes go via Claude Code ONLY.
  Claude.ai is the architect. Claude Code is the executor.
  Violations cause production incidents. This rule has no edge cases.

RULE 0F: Every INSERT must include tenant_id.
RULE 0H: Fix the code, never the data.

---

## CRITICAL LL RULES (subset — full list in NUAI-AGENT-BIBLE.md)

LL-205: Every new DB table needs BOTH:
  (a) Tenant isolation:  USING (tenant_id = user_tenant_id())
  (b) HQ bypass:        USING (is_hq_user())
  Policy naming: "hq_all_{tablename}"
  RLS function: user_tenant_id() — NOT get_my_tenant_id() (does not exist)

LL-206 (CORRECTED 11 Apr 2026):
  const { tenantId, industryProfile } = useTenant() — VALID
  Both are directly exposed on TenantContext (tenantService.js:154).
  Old pattern (const { tenant } = useTenant(); tenantId = tenant?.id)
  also works but is deprecated. Use the direct destructure form.

LL-207: No tenantId props on HQ child components.

LL-208: Enumerate ALL tables a feature will query before migration.

LL-221: Read the actual source file before any edit. Disk is truth.
  Never trust a document's description of a file. Read the file.

LL-223: Deno Edge Functions CANNOT call sibling EFs via
  internal fetch. Trigger externally.

LL-226: dispensing_log is Schedule 6. VOID ONLY. Never hard-delete.

LL-227: Medi Can Dispensary (2bd41eb7) is seeded. DO NOT RE-SEED.

LL-231: Cannabis dispensary revenue = dispensing_log × sell_price.
  NEVER use the orders table for dispensary revenue.
  Always branch on industry_profile === "cannabis_dispensary".

LL-238: All new features use T.container.* tokens (WP-DS-6).
  Never hardcode container widths matching a token value.

For rules LL-001 through LL-237+: read docs/NUAI-AGENT-BIBLE.md

---

## DESIGN SYSTEM — WP-DS-6 (MANDATORY FOR ALL NEW FEATURES)

import { T } from "../../styles/tokens" in every new component.
Never hardcode px values that match a token.

Essential tokens:
  T.container.wide    = 1400px  (HQ, HR, Group Portal)
  T.container.default = 1200px  (Admin, Tenant Portal)
  T.container.narrow  = 900px   (Consumer-facing pages)
  T.inset.card        = 16px    (card internal padding)
  T.inset.modal       = 24px    (modal/drawer padding)
  T.page.cardGap      = 16px    (between KPI tiles)
  T.page.sectionGap   = 32px    (between page sections)
  T.gap.lg            = 16px    (between card elements)
  T.gap.xl            = 24px    (between major UI blocks)

Full token reference: docs/WP-DESIGN-SYSTEM.md

---

## SCHEMA FACTS — VERIFIED FROM LIVE CODEBASE

orders revenue column:    total         (NOT total_amount)
orders revenue filter:    status = "paid" (NOT status != "cancelled")
inventory reorder column: reorder_level (NOT reorder_point)
AVCO column:              weighted_avg_cost
Dispensary revenue:       dispensing_log.quantity_dispensed
                          × inventory_items.sell_price (LL-231)

---

## LOCKED FILES — NEVER MODIFY

src/components/StockItemModal.js   — 14 Product Worlds, fully locked
src/components/ProteaAI.js         — CODEBASE_FACTS str_replace only
src/components/PlatformBar.js      — locked
src/services/supabaseClient.js     — locked

## PROTECTED FILES — READ IN FULL BEFORE ANY CHANGE (LL-221)

src/components/hq/HQStock.js           — 14 product worlds
src/components/hq/HQOverview.js        — multi-fetch, realtime
src/components/hq/HQProfitLoss.js      — TDZ risk, profile branching
src/components/hq/HQCogs.js            — 3,912 lines
src/components/hq/HQMedical.js         — Schedule 6, 6 sub-tabs
src/pages/TenantPortal.js              — 4-branch waterfall routing
src/components/group/GroupPortal.js    — franchise portal root
src/components/group/NetworkDashboard.js — 730 lines, multi-tenant

---

## BRIEF PROTOCOL — ALWAYS REPORT BEFORE CHANGING

Before any change:
  "Status: no changes made. HEAD at [hash]."
  State exact before/after strings for str_replace.
  Confirm anchor uniqueness (grep -c to verify = 1).

One file at a time unless brief explicitly says otherwise.
Run CI=false npm run build after every change.
State lines added/removed in the post-commit report.

---

## CURRENT WORK — READ THE LIVE DOCS

Do NOT trust any WP status, priority queue, HEAD hash, or EF
version in this file. This file is intentionally version-free.

For current state:      read docs/SESSION-STATE_[latest].md
For current priorities: read docs/NEXT-SESSION-PROMPT_[latest].md
For all rules:          read docs/NUAI-AGENT-BIBLE.md
For EF versions:        query Supabase MCP or read SESSION-STATE
For HEAD:               run git log --oneline -1

---

## SESSION CLOSE PROTOCOL

At end of every session, Claude Code must:
1. Append a date-stamped addendum to SESSION-STATE_v[current].md
2. Write NEXT-SESSION-PROMPT_v[next].md with HEAD hash
3. Commit both: "docs: SESSION-STATE + NEXT-SESSION-PROMPT v[N]"

Claude.ai must confirm the state is accurate before session close.

---

*CLAUDE.md v2.0 · NuAi · 11 April 2026*
*Replaces: CLAUDE.md v1.0 (09 April 2026, HEAD 9939421)*
*Rule source:     docs/NUAI-AGENT-BIBLE.md*
*State source:    docs/SESSION-STATE_v[latest].md*
*Priority source: docs/NEXT-SESSION-PROMPT_v[latest].md*
