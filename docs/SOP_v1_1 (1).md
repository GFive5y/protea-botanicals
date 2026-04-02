# SOP — Standard Operating Procedure
## NuAi Platform (formerly Protea Botanicals Digital Platform)
## Version: v1.1 · Updated: April 3, 2026
## Changes from v1.0: Added Part 7 (Code Box Rules) and Part 8 (File Knowledge Rules)

> This document is READ AT THE START OF EVERY BUILD SESSION.
> The AI must follow this procedure before writing a single line of code.
> Owner must approve answers before build begins.

---

# PART 1 — SESSION START PROCEDURE

Every session, without exception, the AI runs this checklist BEFORE anything else:

## STEP 1 — Read the project documents in order:
```
1. SESSION-STATE.md  → current state, priorities, lessons learned
2. SESSION-CORE.md   → invariant platform rules and LL list
3. REGISTRY.md       → what exists (by capability)
4. MANIFEST.md       → what exists (by filename)
```

## STEP 2 — State what the session will do:
The AI must write a one-paragraph summary:
- What WP or task is being worked on
- Which files will be created or modified
- Which files will be deprecated or deleted
- What the expected outcome is

## STEP 3 — Run pre-flight checks:
```powershell
git status
Get-Content src\components\FILENAME.js | Select-Object -First 5
Select-String "export default function" src\components\FILENAME.js
git show HEAD:src/PATH/FILE.js | Out-File temp.txt -Encoding utf8
```

## STEP 4 — Ask the owner confirmation questions (see Part 2)

## STEP 5 — Only after owner confirms: begin building

---

# PART 2 — PRE-BUILD OWNER QUESTIONS

**Q1. Confirmation of intent:**
> "I'm about to [describe exactly what will be built/changed]. Is this correct?"

**Q2. Scope boundary:**
> "Files I will touch: [list]. Files I will NOT touch: [list]. Correct?"

**Q3. Known risks:**
> "The following things could break: [list]. Aware and ready?"

**Q4. Rollback plan:**
> "If this breaks: git checkout src/PATH/FILE.js. Proceed?"

---

# PART 3 — DURING BUILD PROCEDURE

1. Build one logical unit at a time
2. After each unit: verify it compiles before continuing
3. Never leave a file in a broken state
4. Use VS Code Find & Replace for JSX edits — not PowerShell regex
5. After creating any new file: `git add` + `git commit` immediately

## PowerShell rules:
```
✅ Get-Content FILE.js | Select-Object -First 5
✅ git add FILE  (then separate line)  git commit -m "..."
✅ git push  (separate line)
❌ Never use &&  (PowerShell has no && — LL-183)
❌ Never paste JSX into PowerShell terminal
❌ Never use PowerShell regex on large JSX files
```

---

# PART 4 — POST-BUILD PROCEDURE

## STEP 1 — Verify compilation:
```
npm start → must show "Compiled successfully"
```

## STEP 2 — Run QA checklist from the WP spec.

## STEP 3 — Commit:
```powershell
git add [files]
git commit -m "[WP-CODE] [File] v[N]: [what changed]"
git push origin main
```

## STEP 4 — Update documents:
- SESSION-STATE.md: increment version, completed tasks, new LLs, new HEAD hash
- SESSION-CORE.md: new LLs only — never abbreviate existing LLs
- REGISTRY.md: new components + updated signatures

## STEP 5 — Present updated docs to owner for project knowledge upload.

---

# PART 5 — EMERGENCY RECOVERY

## Compile error:
```powershell
Get-Content src\components\PROBLEMFILE.js | Select-Object -First 5
git checkout src/components/PROBLEMFILE.js
```

## Wrong component rendering:
```
1. Check file identity: Get-Content | Select-Object -First 5
2. Check export name: Select-String "export default function" FILE.js
3. git status — check for untracked files
4. Nuclear: git checkout HEAD -- src/
```

---

# PART 6 — WHAT THE AI NEVER DOES

❌ Never starts coding without reading SESSION-STATE.md first
❌ Never builds a component without checking REGISTRY.md
❌ Never writes to a file without reading it first (git show)
❌ Never uses PowerShell regex on large JSX files
❌ Never pastes code into PowerShell terminal
❌ Never creates a file without committing it immediately
❌ Never skips the SOP questions to "save time"
❌ Never marks a WP complete without running its QA checklist
❌ Never removes a WorkflowGuide, InfoTooltip, or CoPilot instance
❌ Never modifies LiveFXBar.js, supabaseClient.js, or copilotService.js
❌ Never writes to legacy tables (products, inventory, scans,
   production_batches, production_inputs)
❌ Never deletes a file that still has active importers
❌ Never upserts user_profiles — UPDATE only
❌ Never changes a renderTab case without LL-178 protocol
❌ Never builds inventory components without reading HQStock.js first (LL-180)
❌ Never uses && in PowerShell git commands (LL-183)
❌ Never puts explanation inside a deploy code box (LL-184)
❌ Never suggests file edits without reading the current file first (LL-185)

---

# PART 7 — CODE BOX DISCIPLINE (NEW v1.1 — LL-184)

## Rule: Every code block is either DEPLOY or DO NOT DEPLOY. Never both.

### DEPLOY BOX — paste-and-run only:
```
Contains ONLY the exact executable content.
No inline explanation. No "find this" instructions. No partial snippets.
Must be complete and correct as-is.
```

### ⚠ DO NOT DEPLOY BOX — clearly labelled, appears BEFORE the deploy box:
```
Contains: context, diffs, "find this line" instructions, rationale.
NEVER mixed into the deploy box.
Label must be visible: ⚠ DO NOT DEPLOY / CONTEXT ONLY
```

## Examples:

✅ CORRECT:

⚠ DO NOT DEPLOY — find this line in HQStock.js (near bottom of file, root div):
```
<div style={{ fontFamily: T.font, color: T.ink700, maxWidth: "1100px" }}>
```

DEPLOY — replace with:
```jsx
<div style={{ fontFamily: T.font, color: T.ink700 }}>
```

❌ WRONG (mixed):
```
// Find the root div in HQStock.js and change maxWidth: "1100px" to remove it
<div style={{ fontFamily: T.font, color: T.ink700 }}>
```

---

# PART 8 — FILE KNOWLEDGE BEFORE EDITS (NEW v1.1 — LL-185)

## Rule: Claude must have read the current file before suggesting any edit.

### Trigger: Before any "open FILE.js and find..." instruction.

### Protocol:
1. Claude checks: "Have I read this file in this session?"
2. If YES → proceed with exact current strings
3. If NO → ask: "Can you paste [filename] so I can see the current state?"
4. Only after reading → provide exact find/replace strings

### Why this matters:
The owner can ONLY do Ctrl+F carbon copy paste replacements.
If the "find" string doesn't exist in the current file, the owner is stuck.
Claude memory of a file from a previous session is not reliable.

### Exception:
If Claude produced the complete file in this session (e.g. full file output),
Claude knows the current state and can provide exact strings.

---

*SOP v1.1 · NuAi · April 3, 2026*
*Changes from v1.0: Added Part 7 (Code Box Discipline) and Part 8 (File Knowledge Before Edits)*
*Every session. No exceptions.*
