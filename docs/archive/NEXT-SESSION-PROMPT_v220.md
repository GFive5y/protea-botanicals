# NEXT-SESSION-PROMPT v220
## For: Claude Code (new session opening)
## Produced: 10 Apr 2026 — session close
## Previous session HEAD: 4b1a9fa

---

## MANDATORY READING ORDER (before any task)

1. docs/PLATFORM-OVERVIEW_v1_0.md
2. docs/NUAI-AGENT-BIBLE.md
3. docs/SESSION-STATE_v220.md   ← this session's state
4. docs/VIOLATION_LOG_v1_1.md

Read all four before touching any file.

---

## PLATFORM IDENTITY

NuAi — production multi-tenant SaaS ERP. 224,293 lines.
109 DB tables (all RLS-secured). 6 portals. 5 live tenants.
Repo: github.com/GFive5y/protea-botanicals · branch: main
Supabase: uvicrqapgzcdvozxrreo
Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74

---

## RULE 0Q — ABSOLUTE

NEVER call any GitHub write tool from Claude.ai.
This includes: push_files, create_or_update_file, create_branch,
delete_file, merge_pull_request, create_pull_request.
Session close is not an exception. Docs are not an exception.
Urgency is not an exception. VL-012 is the fifth violation.

SELF-CHECK BEFORE ANY TOOL CALL:
"Does this tool write to the GitHub repo?"
If YES → STOP. Write content in chat. Give Claude Code the instruction.

---

## CURRENT STATE

WP-AINS v1.0 — COMPLETE (6/6 phases). All surfaces live.
FIN-AUDIT v1.0 — COMPLETE (4/4 gaps resolved).
One pending owner action: enter input VAT for ~29 expenses in ExpenseManager.

---

## THIS SESSION'S AGENDA

### STEP 1 — BRAINSTORM: WP-NAV-RESTRUCTURE

Before writing code or WP doc, answer these questions:

1. What is the correct section label for financial tabs? (Reports → Finance?)
2. Where do Analytics, Costing, Forecast, Year-End Close belong?
3. Does this need a new top-level section or just rearrangement?
4. Read TenantPortal.js waterfall config before writing anything.
5. Impact on AINS? useIntelStrip tab IDs map to URL params — do they change?
6. Impact on NuAiBrief? useBrief.js covers tabIds — do they change?
7. Hardcoded tab refs in ProteaAI.js getSuggested() that need updating?
8. Does this affect any of the 5 active tenants differently?

After brainstorm → produce WP-NAV-RESTRUCTURE_v1_0.md in docs/
Then implement in one focused pass.

### STEP 2 — DESIGN + IMPLEMENT: Scan Analytics (qr_codes join)

scan_logs has NO tenant_id column — platform architecture decision.
Scope through: scan_logs.qr_code_id → qr_codes.id → qr_codes.tenant_id

What was removed: unscoped scan_logs query removed in Phase 3 scoping fix.
Analytics IntelStrip pills currently have no scan data.

What needs building:
1. useNavIntelligence.js — add 7d scan count via qr_codes join
2. useIntelStrip.js — analytics case with real scan pills
3. useBrief.js — analytics brief section with scan context

CRITICAL: Always join through qr_codes. Never query scan_logs directly.

---

## LOCKED FILES

- src/components/StockItemModal.js — LOCKED
- src/components/ProteaAI.js — str_replace only (LOCKED)
- src/components/PlatformBar.js — LOCKED
- src/services/supabaseClient.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED
- src/components/hq/LiveFXBar.js — PROTECTED

---

## AINS ARCHITECTURE (chain to consider for NAV changes)

useNavIntelligence.js
  → IntelligenceContext.js
    → AIFixture.js (IntelLines + NuAi mark)
    → TenantPortal.js → IntelStrip.js
    → ProteaAI.js → NuAiBrief.js
      → useBrief.js
    → useIntelStrip.js

If tab IDs change: update useIntelStrip, useBrief, ProteaAI getSuggested,
NuAiBrief CONTEXT_MAP (24 entries).

---

## LIVE DATA (Medi Rec — 10 Apr 2026)

- MTD Revenue (ex-VAT): R133,691 · 141 orders
- Today: R13,520 (67% of best day R20,165 — Tue 07 Apr)
- Inventory: 187 items · 1 OOS (Bubble Hash 1g) · 6 below reorder
- Depreciation: R822.22/month posted (3 assets)
- Scans: 181 total · need qr_codes join for tenant analytics
- Loyalty config: loyalty_config table missing row (warning shown in NuAi)

---

## NEXT SESSION OPENING

1. Read docs/PLATFORM-OVERVIEW_v1_0.md
2. Read docs/NUAI-AGENT-BIBLE.md
3. Read docs/SESSION-STATE_v220.md
4. Read docs/VIOLATION_LOG_v1_1.md
5. git status — confirm clean working tree at 4b1a9fa or later
6. Begin WP-NAV-RESTRUCTURE brainstorm

---
*NEXT-SESSION-PROMPT v220 · NuAi · 10 Apr 2026*
