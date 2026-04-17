# NuAi Loop Principles
## The stated philosophy of how the Loop works
## Stable document. Does not accrete stateful content.

---

## 1. Reasoning has a half-life

The reasoning behind a decision is clearest at the moment of decision.
It decays within hours, fades within days, and is gone within weeks.
Capture at peak freshness, not at retrospective. A reasoning entry
written at session close is worth ten written a week later from memory.

## 2. Outcomes capture themselves; reasoning does not

Commits, migrations, and close-outs record WHAT happened. Diffs show
WHAT changed. Neither records WHY. The Decision Journal exists because
the why has to be deliberately written — it never appears in the
artefact itself.

## 3. The campaign never ends

There is no "when we're done, we'll document." Work moves to the next
frontier and the prior reasoning stays uncaptured forever if not
captured now. Every session is both a work session and a capture
session. Treating capture as a post-project activity guarantees it
never happens.

## 4. Institutional memory is a first-class deliverable

Not a bonus after the work is done. Every session's output is two
things: the change, and the reasoning trail for that change. A
session that ships code without capturing its reasoning is half-done.

## 5. Disk is truth, Decision Journal is witness

The code on disk is the current state — what IS. The Decision Journal
is the historical narrative — what WAS considered and why the current
state was chosen over alternatives. Both are required for a future
agent to make informed decisions. Code without context produces
agents that re-derive from first principles what was already known.

## 6. Every agent surface is a Loop surface

If an agent can read it, it's part of the Loop and must follow Loop
discipline: pointer-only OR live-read, never stale snapshot. This
includes: repo files, project knowledge, project instructions, local
agent config (.claude/), and any future surface. Drift on any surface
produces agents operating on wrong state. The fix is architectural
(eliminate the snapshot), not procedural (remember to refresh).

---

*LOOP-PRINCIPLES.md · NuAi · Session 311.75 · Stable philosophy document*
