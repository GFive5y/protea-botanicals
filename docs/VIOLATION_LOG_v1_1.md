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

*VIOLATION_LOG v1.1 · NuAi · April 7, 2026*
*8 violations logged · VL-001/VL-002: code box discipline (April 3)*
*VL-003/VL-004: wrong build suggestions — already-built features presented as pending*
*VL-005: asked owner to run PowerShell when GitHub MCP was available*
*VL-006: REGISTRY_v3_2 corrupt — SC-01 listed as pending without disk verification*
*VL-007: Claude.ai push_files attempt (April 5)*
*VL-008: Claude.ai push_files attempt (April 7) — RULE 0Q + LL-202*
