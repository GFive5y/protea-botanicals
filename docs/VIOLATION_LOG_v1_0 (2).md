# VIOLATION_LOG.md — NuAi Platform
## Permanent record of every rule violation by Claude
## Version: v1.0 · Started: April 3, 2026
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

  The violation: decorative labels immediately adjacent to code fences
  create ambiguity about what the copy icon will capture. The owner
  uses the copy icon to copy box contents — labels bleed into the copy.

What should have happened:
  The git commands box should have contained ONLY:
    git add src/pages/TenantPortal.js
    git add src/components/hq/HQStock.js
    git commit -m "fix(layout): ..."
    git push origin main
  Any label (DEPLOY / DO NOT DEPLOY) belongs in prose with a blank line
  separating it from the code fence. Never on the line immediately above ```.

Root cause:
  LL-184 said "label appears BEFORE the deploy box" but did not specify
  that the label must be separated from the fence by prose content, not
  just a line break. The rule was ambiguous about proximity.
  Also: the rule was NEW in that session — Claude documented it and
  immediately violated the spirit of it in the same response.

Doc fix:
  LL-184 updated in SESSION-CORE v2.8:
  - Added: "Label must be in a sentence of prose, not on a bare line
    immediately above the opening ``` of a code fence."
  - Added: "Never use >> , DEPLOY, DO NOT DEPLOY, or any label text
    on a line immediately preceding a code fence."
  - Added: New RULE 0O — Violation log requirement.

Outcome:
  Commit e7eca29 succeeded. TenantPortal v2.4 + HQStock fix live on Vercel.
  No code damage. Session time lost: ~5 minutes.
```

---

## VL-002 — LL-184 VIOLATED AGAIN (labels inside code fence)

```
Date:     April 3, 2026
Session:  Same session as VL-001, earlier in session
Rule:     LL-184 (precursor — rule not yet written at time of violation)

What Claude did:
  In a git command box, Claude included:
    >> DEPLOY — git commands:
    ```
    git add ...
  The >> and label text were inside or immediately part of the copy block.
  PowerShell interpreted >> as output redirection, causing parse error:
  "Missing file specification after redirection operator"

What should have happened:
  Code fence contains only executable commands. Labels are prose only.

Root cause:
  Rule LL-184 did not exist yet. This violation is what prompted LL-184.
  Logged retroactively for pattern completeness.

Doc fix:
  LL-184 created. VL-001 is the same pattern after the rule existed.
```

---

## VIOLATION LOG RULES (added v1.0)

```
1. Every violation gets logged BEFORE Claude continues with any other task.
2. Log entry must be complete — no skipping fields.
3. "Doc fix" field must reference the actual change made to SESSION-CORE or SOP.
4. If the same rule is violated twice: the rule is incomplete. Fix the rule.
5. Owner can review this log at any time to assess Claude's reliability.
6. This file is uploaded to project knowledge and read every session.
```

---

*VIOLATION_LOG v1.0 · NuAi · April 3, 2026*
*2 violations logged · Both relate to LL-184 code box discipline*
