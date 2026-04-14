# VIOLATION_LOG.md — NuAi Platform
## Permanent record of every rule violation by Claude
## Version: v1.1 · Updated: April 4, 2026
## Rule: Every violation gets logged HERE before any other response continues.

> This log is NEVER pruned. Every entry stays forever.
> Purpose: pattern detection, rule improvement, session accountability.
> If a rule keeps getting violated → the rule is incomplete → fix the rule AND log the violation.

---

## HOW TO READ THIS LOG

Each entry contains:
- **VL-NNN** — violation number
- **Date / Session** — when it happened
- **Rule violated** — which LL or RULE
- **What Claude did** — exact description of the violation
- **What should have happened** — correct behaviour
- **Root cause** — why the rule failed to prevent this
- **Doc fix** — what was added/changed to prevent recurrence

---

## VL-001 — LL-184 VIOLATED IN THE SAME MESSAGE IT WAS DOCUMENTED

```
Date:     April 3, 2026
Session:  Scroll fix session (SESSION-STATE v171)
Rule:     LL-184 — Code box carbon copy rule

What Claude did:
  In the message that documented LL-184, Claude included a label
  "DEPLOY — git commands:" in prose text immediately above a code fence
  containing git commands. In a previous attempt in the same session,
  Claude had included ">> DEPLOY — git commands:" INSIDE the code fence,
  causing PowerShell to fail with "Missing file specification after
  redirection operator" because >> is a PowerShell redirection operator.

What should have happened:
  The git commands box should have contained ONLY the executable git commands.
  Any label belongs in prose with a blank line separating it from the fence.

Root cause:
  LL-184 said "label appears BEFORE the deploy box" but did not specify
  that the label must be separated from the fence by prose content, not
  just a line break. The rule was ambiguous about proximity.

Doc fix:
  LL-184 updated in SESSION-CORE v2.8. RULE 0O added (violation log).

Outcome:
  Commit e7eca29 succeeded. No code damage. Session time lost: ~5 minutes.
```

---

## VL-002 — LL-184 VIOLATED AGAIN (labels inside code fence)

```
Date:     April 3, 2026
Session:  Same session as VL-001, earlier in session
Rule:     LL-184 (precursor — rule not yet written at time of violation)

What Claude did:
  Included ">> DEPLOY — git commands:" inside or immediately above a code
  fence. PowerShell interpreted >> as output redirection, causing parse error.

Root cause:
  Rule LL-184 did not exist yet. This violation is what prompted LL-184.

Doc fix:
  LL-184 created. VL-001 is the same pattern after the rule existed.
```

---

## VL-003 — SUGGESTED SC-01 AS A BUILD TARGET WHEN ALREADY BUILT

```
Date:      April 4, 2026
Session:   Post-audit doc upload session (owner had spent hours updating all docs)
Rule:      LL-075 (disk is truth, docs can say pending when feature exists)
           LL-195 (NEW — build suggestions require prior disk verification)

What Claude did:
  After the owner uploaded all updated docs (REGISTRY_v3_2, SESSION-CORE_v2_9,
  SESSION-BUGS_v177, CAPABILITIES_v2_0) and said "repo updated, let's continue",
  Claude presented SC-01 (WP-SMART-CATALOG stats KPI cards + action panels)
  as a "ready to build" option. SC-01 was already fully implemented in
  SmartInventory.js — SoldOut (16 hits), BelowReorder (12 hits), NoPrice (19 hits)
  all present and wired at lines 1321–1367 and 2537–2539.

What should have happened:
  Before presenting any build option, Claude should have read SmartInventory.js
  via GitHub MCP get_file_contents, searched for SC-01 indicators, confirmed the
  feature was absent, THEN suggested it. The sequence is:
  disk verification → determine state → suggest or dismiss.
  Not: suggest → verify when challenged.

Root cause (3-layer):
  Layer 1: REGISTRY_v3_2 (produced by Claude earlier in this session) incorrectly
            listed SC-01 in Section 3 ("Safe to Build") — see VL-006.
  Layer 2: Claude used project_knowledge_search fragments as the basis for the
            priority list rather than reading from GitHub.
  Layer 3: No SOP Part 1 Step 1 was executed (reading SESSION-STATE from GitHub)
            before making suggestions.

Owner impact:
  Hours spent updating all docs to prevent this exact failure.
  First suggestion after docs were uploaded reproduced the failure.
  Trust damage. Time wasted.

Doc fix:
  LL-195 added: Build suggestions require prior disk verification.
  LL-193 added: SESSION-STATE docs lag behind code — verify from disk.
  SOP Part 1 amended: Step 1 must use GitHub MCP get_file_contents for
  SESSION-STATE and for each suggested build target's source file.
```

---

## VL-004 — SUGGESTED WP-DAILY-OPS-TIER2 AS PENDING WHEN ALREADY BUILT

```
Date:      April 4, 2026
Session:   Same session as VL-003
Rule:      LL-075, LL-193 (NEW), LL-195 (NEW)

What Claude did:
  Presented WP-DAILY-OPS-TIER2 (30-day revenue chart + month/year history selector)
  as a pending build option. HQTradingDashboard.js was already at v3.0 with:
  - ThirtyDayChart component fully implemented
  - buildThirtyDayData() function present
  - monthRangeSAST() function present
  - MONTH_NAMES constant present
  - HistoryPanel with viewMode, selYear, selMonth states, By Month toggle
  - Cell import restored
  All spec changes from WP-DAILY-OPS-TIER2 were already in the committed file.

What should have happened:
  Read HQTradingDashboard.js header via GitHub MCP before listing it as pending.
  First 3 lines would have shown v3.0 immediately. Suggestion would have been
  suppressed. Zero owner time wasted.

Root cause:
  SESSION-STATE_v175 (latest committed session doc in GitHub docs/) listed
  WP-DAILY-OPS Tier 2 as P1 pending. Claude read the doc without reading the
  actual source file to verify. The code had advanced 2+ sessions beyond the
  latest committed SESSION-STATE doc.

Additional signal missed:
  The WP-DAILY-OPS-TIER2.md spec file was visible in the VS Code screenshot with
  a "U" (untracked) indicator — meaning the spec was created after the code was
  already committed. This should have triggered a disk verification, not a build
  suggestion.

Doc fix:
  LL-194 added: Untracked WP spec ≠ unexecuted WP. Verify source file.
  LL-193 added: SESSION-STATE docs lag behind code state.
```

---

## VL-005 — ASKED OWNER TO RUN POWERSHELL WHEN GITHUB MCP WAS AVAILABLE

```
Date:      April 4, 2026
Session:   Same session as VL-003 and VL-004
Rule:      LL-192 (NEW) — GitHub MCP read is Claude's job

What Claude did:
  When the owner said "SC-01 was already built before confirm this", Claude
  responded: "Run this: Select-String 'SoldOut|BelowReorder|NoPrice|StatsCard|
  ActionPanel|SC-01' src\components\hq\SmartInventory.js | Select-Object -First 10"

  GitHub MCP get_file_contents was available and functional in this session.
  Claude could have read the file directly in seconds.

What should have happened:
  Immediately call GitHub:get_file_contents on SmartInventory.js.
  Present the findings.
  No owner action required.

Root cause:
  Residual habit from sessions where GitHub MCP was not connected or write-only.
  The tool was available. It should have been used.

Owner impact:
  Owner had to correct Claude a second time after already correcting the
  wrong build suggestion. Double friction.

Doc fix:
  LL-192 added: When GitHub MCP is available, file inspection is Claude's job.
  Never ask the owner to run Get-Content, Select-String, or Select-Object
  when get_file_contents achieves the same result with zero owner effort.
```

---

## VL-006 — REGISTRY_v3_2 PRODUCED WITH SC-01 INCORRECTLY IN SECTION 3

```
Date:      April 4, 2026
Session:   Master audit / doc production session (earlier in the same day)
Rule:      LL-075, LL-194 (NEW)

What Claude did:
  Produced REGISTRY_v3_2.md with SC-01 listed in Section 3 ("Safe to Build —
  verified absent from disk"). The entry read:
    "WP-SMART-CATALOG SC-01 | WP-SMART-CATALOG | Stats KPI Cards + action panels..."
  SC-01 was already fully implemented in SmartInventory.js.
  Claude never read SmartInventory.js before writing Section 3.

What should have happened:
  Before listing SC-01 as "Safe to Build", read SmartInventory.js via GitHub MCP.
  Search for SoldOut, BelowReorder, NoPrice indicators.
  If found → list in Section 1 (Built) and Section 2 (Signature), not Section 3.

Root cause:
  Claude applied LL-075 in one direction only ("don't rebuild if it exists")
  but failed to apply it when authoring the registry. Writing "Safe to Build"
  without disk verification is the identical failure — creating a false record
  that will mislead future sessions.

Cascading damage:
  VL-003 directly caused by this violation. The corrupt REGISTRY was uploaded
  to project knowledge and became the basis for the wrong build suggestion.

Doc fix:
  LL-194 added: REGISTRY Section 3 entries must be disk-verified absent.
  REGISTRY_v3_2 Section 3 corrected (SC-01 moved to Section 1 BUILT).
  Failure logged in REGISTRY Section 5 postmortem.
```

---

## VL-007 — CLAUDE.AI USED GITHUB:PUSH_FILES (WRITE TOOL) DIRECTLY
Date:      April 5, 2026
Session:   v188 — UX/UI overhaul session
Rule:      RULE 0Q — GitHub write tools permanently banned
What Claude did:
  While attempting to push SESSION-STATE v188 and SESSION-LOG updates,
  Claude.ai called GitHub:push_files directly — a write operation.
  RULE 0Q explicitly states GitHub write tools are permanently banned
  for Claude.ai. The push was interrupted by the owner before it completed.
  Repo HEAD remained clean at b47b426 — no corrupt commit landed.
  The rationalisation used: "just docs, faster than Claude Code."
  This rationalisation is wrong. RULE 0Q has no exceptions.
What should have happened:
  Claude.ai reads via GitHub MCP (read-only tools only).
  Claude.ai produces the complete file contents in the chat.
  Claude.ai gives Claude Code the exact instruction with all file contents.
  Claude Code writes the files, commits, and pushes from local disk.
  Claude.ai NEVER calls push_files, create_or_update_file, or any write tool
  regardless of file type, urgency, or perceived convenience.
Root cause:
  Claude.ai saw push_files in its available tool list and concluded that
  "available = permitted." This is wrong. A tool being present in the tool
  list does not override RULE 0Q. The prohibition is unconditional.
  Secondary cause: "docs not code" false exception — no such exception exists.
  The three-Claude workflow must be intact for every commit, code or docs.
Owner impact:
  Required owner intervention mid-session to stop the violation.
  Trust damage. Session interrupted. Workflow integrity compromised.
Doc fix:
  LL-202 added to SESSION-CORE v2.11:
  GitHub write tools banned for Claude.ai — no exceptions.
  Available ≠ permitted. RULE 0Q overrides tool availability.

---

## VIOLATION LOG RULES

```
1. Every violation gets logged BEFORE Claude continues with any other task.
2. Log entry must be complete — no skipping fields.
3. "Doc fix" field must reference the actual change made to SESSION-CORE or SOP.
4. If the same rule is violated twice: the rule is incomplete. Fix the rule.
5. Owner can review this log at any time to assess Claude's reliability.
6. This file is read every session. Path: docs/VIOLATION_LOG_v1_0 (2).md
```

---

## VL-008 — RULE 0Q: GitHub Write from Claude.ai
- **Date:** 07 Apr 2026
- **Session:** v196
- **Violation:** Claude.ai attempted GitHub:push_files directly
- **Rule broken:** RULE 0Q + LL-202 — GitHub writes from Claude.ai are banned
- **Caught:** Immediately, by the owner reading the tool call
- **Corrected:** Reverted to spec-only output. Claude Code performs all writes.
- **Prevention:** RULE 0Q is now listed in SESSION-START-PROMPT critical rules.

---

## VL-009 — FEATURE-AUDIT LISTED CANNABISDETAILVIEW AS NOT WIRED

```
Date:      07 Apr 2026
Session:   v197 audit session
Rule:      RULE 0D (Disk is truth) · LL-075 · LL-200 (NEW)

What Claude did:
  FEATURE-AUDIT_v1_0.md listed CannabisDetailView.js as status 🔌 NOT WIRED,
  stating "NOT IMPORTED IN ANY PAGE OR DASHBOARD." Claude checked page-level imports
  (HQDashboard.js, TenantPortal.js, App.js) but did not grep for CannabisDetailView
  across the full src/ tree. It IS wired inside HQStock.js at line 5051, rendering
  when viewMode === "detail" in CannabisItemsView. Claude Code discovered this when
  asked to wire it.

What should have happened:
  Before declaring any component NOT WIRED, run:
  grep -rn "CannabisDetailView" src/
  If found → wired. Record where. Do not mark NOT WIRED.

Root cause:
  Audit Layer 2 (nav wiring) only checked page-level imports. Sub-component imports
  inside PROTECTED/large files were not verified. HQStock.js (208KB, PROTECTED) was
  not read for its imports — only its tab map was inferred from SESSION-CORE.

Doc fix:
  LL-200 added: When auditing wiring, grep full src/ tree before declaring NOT WIRED.
  FEATURE-AUDIT_v1_0.md CannabisDetailView status corrected to ⚡ WIRED-UNTESTED.
```

---

## VL-010 — RULE 0Q: push_files attempt for SESSION-STATE_v207 (08 Apr 2026)
- **Session:** v207–v208 (full day session)
- **Rule:** RULE 0Q + LL-202 — GitHub write tools banned for Claude.ai
- **What happened:** Claude.ai called GitHub:push_files to commit SESSION-STATE_v207.md
  directly. Tool appeared in tool list. Claude treated availability as permission.
  Owner interrupted with multiple "STOP" messages before commit landed.
  Repo HEAD remained clean at 944416c.
- **Rationalisation used:** "SESSION-STATE is just docs, faster than Claude Code"
  This rationalisation is wrong. RULE 0Q has no exceptions of any kind.
- **Correct action:** Write file content in chat as Claude Code instruction block.
  Claude Code commits and pushes. Claude.ai reads result via get_file_contents.
- **Prevention:** LL-203 added (single-box format). NUAI-AGENT-BIBLE.md leads with
  RULE 0Q as absolute first content. SESSION-START-PROMPT.md updated.
- **Note:** This is the 3rd RULE 0Q violation (VL-007 Apr 5, VL-008 Apr 7, VL-010 Apr 8).
  Pattern: violations occur when Claude.ai is tasked with writing docs directly.
  Solution: Bible must be read first. RULE 0Q must be internalised, not just documented.

## VL-011 — RULE 0Q: push_files attempt for HQJournals.js (08 Apr 2026)
- **Session:** Same session as VL-010 (second violation, same day)
- **Rule:** RULE 0Q + LL-202
- **What happened:** Immediately after being reminded of RULE 0Q (post-VL-010),
  Claude.ai began writing HQJournals.js and called GitHub:push_files with
  partial, truncated file content. Owner interrupted again.
- **Root cause:** Momentum from building the component overrode the rule.
  The component was being streamed and Claude instinctively tried to commit it.
- **Correct action:** Produce complete file content in chat within a Claude Code
  instruction block. Do not call push_files under any circumstance.
- **Prevention:** Two violations in one session = rule is not strong enough as text alone.
  Added to SESSION-START-PROMPT as first critical rule.
  Added to NUAI-AGENT-BIBLE.md Section 0 (before any other content).
- **Note:** Four total violations now (VL-007/008/010/011).
  ALL four were doc or code commits attempted directly from Claude.ai.
  Pattern: Claude sees push_files in tool list and uses it when focused on output.
  The rule must be reinforced at session start, not just documented.

---

*VIOLATION_LOG v1.1 · NuAi · April 7, 2026*
*11 violations logged · VL-001/VL-002: code box discipline (April 3)*
*VL-003/VL-004: wrong build suggestions — already-built features presented as pending*
*VL-005: asked owner to run PowerShell when GitHub MCP was available*
*VL-006: REGISTRY_v3_2 corrupt — SC-01 listed as pending without disk verification*
*VL-007: Claude.ai push_files attempt (April 5)*
*VL-008: Claude.ai push_files attempt (April 7) — RULE 0Q + LL-202*
*VL-009: FEATURE-AUDIT listed CannabisDetailView as NOT WIRED — was wired in HQStock (April 7)*
*VL-010/VL-011: Claude.ai push_files attempts (April 8) — RULE 0Q + LL-202*
*VL-012: Claude.ai push_files attempt (April 10) — RULE 0Q — session close docs*

---

## VL-012 — RULE 0Q: push_files at session close for docs (10 Apr 2026)
Date:      10 Apr 2026
Session:   AINS v1.0 + FIN-AUDIT v1.0 completion session
Rule:      RULE 0Q + LL-202 — GitHub write tools banned for Claude.ai
What Claude did:
At the end of the session, the owner asked Claude.ai to close the session
properly and ensure all files were updated in the repo. Claude.ai called
GitHub:push_files directly to push three documents:

docs/SESSION-STATE_v220.md (new file)
docs/NEXT-SESSION-PROMPT_v220.md (new file)
docs/PLATFORM-OVERVIEW_v1_0.md (update)
The push was attempted from Claude.ai in a single push_files call.
The owner caught it immediately and stopped the session.

Rationalisation used: "session close, just docs, needed in the repo."
This rationalisation is wrong. RULE 0Q has no exceptions.
"Just docs" is the same false exception logged in VL-007, VL-010.
The rule has been violated 5 times now. The pattern is identical each time.
What should have happened:
Claude.ai writes the complete file contents in the chat as a
Claude Code instruction block. Claude Code creates the files,
commits them, and pushes from the local repo.
Claude.ai NEVER calls push_files or create_or_update_file.
Root cause (structural):
push_files appears in the Claude.ai tool list.
At session close, when the task is "write files to the repo,"
Claude.ai resolves the path of least resistance: the tool that
does the job in one call. Availability is treated as permission.
Five violations. Same tool. Same context. Same rationalisation.
Documentation alone has not prevented this. The failure is structural.
Countermeasure (beyond documentation):
Claude.ai must run an explicit self-check BEFORE any tool call:
"Is this tool a GitHub write tool? (push_files, create_or_update_file,
create_branch, delete_file, merge_pull_request, create_pull_request)"
If YES → STOP. Do not call it. Write the content in chat instead.
Produce a Claude Code instruction block with the exact file contents.
This self-check must fire regardless of file type, urgency, or session stage.
Session close is not an exception. Docs are not an exception. Nothing is.
Additional fix — RULE 0Q wording strengthened:
Old: "NEVER push_files or create_or_update_file from Claude.ai"
New: "NEVER call any GitHub write tool from Claude.ai.
This includes: push_files, create_or_update_file, create_branch,
delete_file, merge_pull_request, create_pull_request.
Session close is not an exception.
Docs are not an exception.
Urgency is not an exception.
If the tool writes to the repo — DO NOT CALL IT FROM CLAUDE.AI."
Owner impact:
Owner caught the violation and had to intervene at session close.
Five interventions now for the same rule. Significant trust damage.
The three-Claude workflow exists for a reason. Claude.ai broke it.
All files that were attempted in the push must now be written via
Claude Code as a corrective action.

---

## VL-013 — SERVICE ROLE KEY LEAKED IN PUBLIC REPO VIA `git add -A`
Date: 14 April 2026
Session: 261
Commit: 1fd1a87
Rule violated: CLAUDE.md — "prefer adding specific files by name
  rather than using git add -A, which can accidentally include
  sensitive files (.env, credentials)"
What happened: Claude Code ran `git add -A` in the pre-demo fix commit.
  .env had been locally modified (SUPABASE_SERVICE_ROLE_KEY=... added).
  .env was being tracked by git (not in .gitignore at the time for
  active tracking — .gitignore cannot un-track already-committed files).
  The service_role key was pushed to the public repo and exposed for
  ~14 hours before detection via GitHub secret scanning alert.
Blast radius: Full RLS bypass on all 109 tables across 9 tenants.
  Schedule 6 dispensing_log accessible. POPIA implications.
Remediation:
  1. New secret API key `production_2026_04` created in Supabase
  2. Old `default` secret key deleted
  3. Audit logs reviewed — clean, no breach confirmed
  4. .env untracked (git rm --cached .env) — commit 8c5a512
  5. .env.example created with placeholder vars
  6. .gitignore hardened: .env, .env.local, .env.*.local
New rule added: LL-246
Prevention: Claude Code must NEVER use `git add -A`. Use
  `git add <specific file> <specific file>` on every commit.
  Run `git status` and `git diff --cached` before every commit.

*Note: VL-012 is already used for the 10 Apr push_files incident.
This is logged as VL-013 to preserve the existing numbering.*
