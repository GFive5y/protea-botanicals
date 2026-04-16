# NuAi — Claude Code Session Instructions
## Version: 2.2 · Updated: 17 April 2026
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
two-agent operating procedure.

---

## YOUR FIRST ACTIONS — EVERY SESSION, NO EXCEPTIONS

0. Read docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md (+ any date-stamped
   addendums appended below the v1.0 body)
   → what this system is, what it can do, the quality standard expected
   → read before anything else; every other rule makes sense because of
     the system described in this file

1. git log --oneline -1
   → confirm HEAD before touching anything

2. Read the single live session ledger:
   cat docs/SESSION-START-PROMPT.md
   This is the one authoritative handoff doc. Versioned
   NEXT-SESSION-PROMPT_vXXX.md and SESSION-STATE_vXXX.md files
   are legacy — do NOT read or create them (LL-264). If you see
   them outside docs/archive/, treat them as stale.

2.5  Read these three files next:
   docs/SYSTEM-GROUND-TRUTH.md   <- current tenant state from live DB
   docs/SCHEMA-REFERENCE.md      <- correct production table names
   docs/PREFLIGHT-SQL.md         <- pre-flight checks before any demo

3. Read docs/NUAI-AGENT-BIBLE.md
   → all rules (240+ LLs) — this is the canonical rule source

3.5. If ANY UI component will be touched this session:
     Read docs/WP-UNIFY_v1_0.md IN FULL before writing a single line.
     This is not optional. The research, the blast zones, the 8 UNIFY rules,
     and the migration pattern are all in that document.
     Skipping it produces components that look like the old HQ tabs.
     Reading it produces components that look like the Group Portal.

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

## DESIGN SYSTEM — WP-DS-6 + WP-UNIFY (MANDATORY FOR ALL FEATURES)

READ docs/WP-UNIFY_v1_0.md before touching any UI component.
That document contains the full research + blast zone audit + migration pattern.

THE 8 UNIFY RULES (summary — full detail in WP-UNIFY_v1_0.md):

UNIFY-1: No local T definition ever.
  import { T } from "../../styles/tokens" in EVERY new component.
  A local const T = {...} or const C = {...} is a violation. Fix before commit.

UNIFY-2: Migrate on touch.
  Every file opened for any reason gets its local token object migrated
  in the same commit. No session ends with a local T that was there before.

UNIFY-3: Two weights only in new/migrated components.
  400 body/data · 500 primary labels · 600 section headers/KPIs
  700 ONLY for <=11px uppercase labels. Never 300. Never 800.

UNIFY-4: One border style.
  border: `1px solid ${T.border}` for all cards and tables. Nothing else.

UNIFY-5: Semantic colour by token only.
  Red=T.danger · Amber=T.warning · Green=T.success · Blue=T.info
  Never a custom hex for a semantic moment.

UNIFY-6: Inter in portals, Jost on consumer pages only.
  Every authenticated route uses T.font. Jost stays on /shop /loyalty /scan.

UNIFY-7: Shared components first.
  If a UI pattern appears in 2+ components, build it in src/components/shared/.
  Priority: SharedDataTable · SharedStatCard · SharedBadge · SharedModalShell

UNIFY-8: Demo path (Tier 1 blast zones) must match Group Portal standard by 12 May.
  Tier 1: HQOverview · HQStock · HQProfitLoss · HQBalanceSheet
          HQDocuments · ExpenseManager

THE NUAI DESIGN PERSONALITY: Sophisticated density.
Information-forward. Restrained. The data is the hero. The container is invisible.
Test: does this look like it was built in the same room as the Group Portal?

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
For UI/design rules:    read docs/WP-UNIFY_v1_0.md (MANDATORY if touching UI)
For EF versions:        query Supabase MCP or read SESSION-STATE
For HEAD:               run git log --oneline -1

---

## SESSION CLOSE PROTOCOL

At end of every session, Claude Code must:

0. Run: python3 docs/update_ground_truth.py
   -> regenerates SYSTEM-GROUND-TRUTH.md from live DB before committing

1. Update docs/SESSION-START-PROMPT.md IN PLACE (LL-264):
   - bump session number in the header
   - update CURRENT STATE section with what this session closed
   - move completed loops to CLOSED, add any new loops to OPEN
   - add any new LLs to the CRITICAL RULES block
   - update HEAD reference to the new commit (write the hash after
     the commit, amend if needed)

2. Update docs/PENDING-ACTIONS.md if any loops opened or closed.

3. Append new LLs to docs/NUAI-AGENT-BIBLE.md and docs/LL-ARCHIVE_v1_0.md.

4. Commit specifically (LL-246 — never git add -A):
   git add docs/SESSION-START-PROMPT.md docs/PENDING-ACTIONS.md \
           docs/NUAI-AGENT-BIBLE.md docs/LL-ARCHIVE_v1_0.md
   (add any other files specifically touched this session)
   git commit -m "docs(S###): in-place session close"
   git push origin main

5. Inform Claude.ai operator to refresh project knowledge:
   After push, the human must paste the new SESSION-START-PROMPT.md
   into Claude.ai project knowledge (LL-287 provenance drift prevention).
   Without step 5, next Claude.ai session starts on stale snapshot.

NEVER create docs/NEXT-SESSION-PROMPT_v[next].md (LL-264).
NEVER create a new versioned docs/SESSION-STATE_v[next].md (LL-264).
Claude.ai must confirm the state is accurate before session close.

---

*CLAUDE.md v2.2 · NuAi · 17 April 2026*
*Replaces: CLAUDE.md v2.1 (13 April 2026) — reconciled with LL-264*
*Rule source:     docs/NUAI-AGENT-BIBLE.md*
*State source:    docs/SESSION-START-PROMPT.md (in-place, never versioned)*
