# NEXT SESSION START PROMPT — v241
## Updated: 11 April 2026 (extended close — end of build day)
## HEAD: 5668e03 (WP-TG Phase 4 GroupTransfer.js + LL-242 AVCO fix)
## Previous prompt: NEXT-SESSION-PROMPT_v240.md (now superseded)

---

## YOUR FIRST 5 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is **5668e03**
2. Read **docs/CLAUDE.md** — v2.0, the slim+delegate rewrite (shipped `11f12b4`). This is the canonical orientation file. Do NOT trust any older CLAUDE.md content in your context.
3. Read **docs/SESSION-STATE_v239.md** — you MUST read **Addendums 1 + 2 + 3 + 4 in order**. They are cumulative. Addendum 4 is the most recent and covers CLAUDE.md v2.0, PLATFORM-OVERVIEW update, and WP-TENANT-GROUPS Phase 4 (GroupTransfer.js + LL-242).
4. Read **docs/NUAI-AGENT-BIBLE.md** — especially **LL-242 at the tail** (HQTransfer.js AVCO bug, known issue, do not propagate pattern). Also re-verify LL-205, LL-206 (corrected form), LL-221, LL-231, LL-238.
5. Read **docs/WP-TENANT-GROUPS.md** — phases 1-4 are now complete. Next is Phase 5 (GroupSettings.js). Also read the last 50 lines of **src/components/group/GroupTransfer.js** to understand the TransferList + cancel-reason pattern before building GroupSettings in the same style.

**Do NOT trust any SESSION-STATE older than v239.**
**Do NOT copy the HQTransfer.js `handleReceive` pattern anywhere — it corrupts destination AVCO. LL-242 documents the correct formula.**

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP with seven portals and a
fully functional franchise network layer — /group-portal now ships a
live NetworkDashboard plus a complete inter-store stock transfer system
(GroupTransfer.js, 1,815 lines, correct AVCO math) on top of the
WP-DS-6 design token infrastructure shipped in the same build day.

---

## WHAT HAPPENED IN THE LAST SESSION (Addendum 4 summary)

**HEAD chain (Addendum 4 only):** `8bcadc7 → 11f12b4 → 5668e03`

### 1. CLAUDE.md v2.0 shipped at `11f12b4`

Full structural rewrite. v1.0 had drifted into a 286-line state document
with a stale HEAD hash, an incorrect LL-206 example, and conflicting WP
priority lists. v2.0 is 222 lines, version-free, and delegates all
volatile state to dedicated docs:

- Rules → `docs/NUAI-AGENT-BIBLE.md`
- State → `docs/SESSION-STATE_v[latest].md`
- Priorities → this file (NEXT-SESSION-PROMPT_v[latest].md)
- HEAD → `git log --oneline -1` (never documented inline)
- EF versions → Supabase MCP or SESSION-STATE

LL-206 fixed at the source: `const { tenantId, industryProfile } = useTenant()`
is the canonical form. The old `const { tenant } = useTenant()` shape is
deprecated but still works.

### 2. PLATFORM-OVERVIEW update at `11f12b4`

Update block appended to `docs/PLATFORM-OVERVIEW_v1_0.md`. Scale figures
corrected. Seventh portal (/group-portal) added to architecture summary.

### 3. WP-TENANT-GROUPS Phase 4 shipped at `5668e03`

**`src/components/group/GroupTransfer.js` — NEW, 1,815 lines.**

Four sub-tabs:

- **Overview** — 4 KPI tiles + recent transfers table + "+ New Transfer" CTA
- **New Transfer** — FROM/TO dropdowns scoped to group members only, line-item builder with dual-quantity display ("At FROM" and "At TO" per line, "New to store" badge when destination has never carried the SKU)
- **Active** — draft + in_transit, expandable cards with Ship / Receive / Cancel actions
- **History** — received + cancelled, read-only

**Key structural difference from HQTransfer.js:** `from_tenant_id` comes
from `form.from_tenant_id` (not the current user's tenantId). HQ was
always the source in HQTransfer; in a franchise network any store can be
either origin or destination.

**LL-242 AVCO FIX on receive.** When the destination already holds the
SKU, GroupTransfer recalculates weighted_avg_cost as:

```
newQty  = destQty + confirmedQty
newAvco = ((destQty × destAvco) + (confirmedQty × unit_cost_zar)) / newQty
```

and writes both `quantity_on_hand` and `weighted_avg_cost` back.
HQTransfer.js only updates `quantity_on_hand` and silently corrupts
destination AVCO on every inbound transfer. That bug is still live and
is the single most important backlog item (see Priority 5 below).

**GroupPortal.js** transfers tab now mounts `<GroupTransfer />` (two-line
import + PlaceholderTab → GroupTransfer swap).

### 4. LL-242 added to NUAI-AGENT-BIBLE.md at `5668e03`

Full entry with worked example, correct formula, pointer to the broken
HQTransfer line range, rule forbidding propagation of the broken pattern,
and a flag for the per-line atomicity gap that both HQTransfer and
GroupTransfer currently share.

---

## CURRENT PRIORITY QUEUE

### Priority 1 — WP-TENANT-GROUPS Phase 5: GroupSettings.js

Build the settings tab of the Group Portal. Requirements:

- Member management: add/remove stores from the group (adds/deletes rows in `tenant_group_members` with correct RLS scoping — any removal must not leave the group empty)
- Group profile edit: `tenant_groups.name`, `tenant_groups.group_type`
- Invitation flow: invite another tenant owner to join the group (likely via an invite token similar to the existing invite-user EF pattern)
- Network-level settings: which tabs are visible per member role, revenue rollup cadence, etc. (scope TBD — ask the owner)
- All layout via T.* tokens (LL-238)
- LL-221: read `GroupTransfer.js` in full before writing — reuse the card/sub-tab/toast pattern; do not reinvent

**Pre-flight required:** enumerate the exact tables and RLS policies the
settings tab will touch before writing code. LL-208.

### Priority 2 — Wire ai-copilot into NetworkDashboard insight bar

`NetworkDashboard.js` currently renders a static placeholder in the
insight bar at the top of the page. Replace it with a live call to the
ai-copilot EF scoped to the group (group_id + list of member
tenant_ids). Pre-flight: read `NetworkDashboard.js` and the ai-copilot
EF source to confirm the payload shape.

### Priority 3 — Wire "View store →" cross-tenant navigation

`NetworkDashboard.js` store cards have a "View store →" button that
currently `console.log`s. Needs a real navigation pattern — probably a
secure tenant-switch action that sets the active tenant and redirects
to `/admin` or `/tenant-portal` for the selected store. Requires:

- Authorisation check: user must be a member of the group AND have
  access to the target tenant
- Context switch: update TenantContext to the new tenant_id
- Return path: a way back to the group portal without losing state

### Priority 4 — Smart transfer suggestions (WP-TG Phase 4b)

Auto-suggest transfers in the GroupTransfer "New Transfer" tab based on
low stock at potential receivers vs surplus at potential senders. Ships
only after manual flow has seen real use. Deferred per owner decision —
do NOT start this without explicit go-ahead.

### Priority 5 — HQTransfer.js AVCO fix (LL-242)

Dedicated session. Reads:

- `src/components/hq/HQTransfer.js` in full (1,692 lines)
- `src/components/group/GroupTransfer.js` `handleReceive` (around line 445-555) for the correct pattern
- LL-242 in NUAI-AGENT-BIBLE.md

The fix is mechanical: replicate the GroupTransfer AVCO formula into
HQTransfer's `handleReceive`. The care is in the test plan — HQ
inventory is production data across all tenants, and any regression
touches every franchise's books. Pre-flight required.

### Priority 6 — WP-DS-2 continuation

Next legacy-C migration target is `src/components/WorkflowGuide.js`.
Then the `src/components/shared/` directory. Then the 25 HQ components.
Each migration follows the text-tier vs surface-tier rule documented
in `docs/WP-DESIGN-SYSTEM.md`. Zero new build warnings per change.

---

## KNOWN ISSUES (carried forward from v240 + v241)

### Still live, documented, not yet fixed:

1. **HQTransfer.js AVCO bug** — destination weighted_avg_cost never recalculated on receive. Every inbound HQ→store transfer silently corrupts destination AVCO when the store already carries the SKU. Location: `src/components/hq/HQTransfer.js` handleReceive around line 449-456. Full writeup: LL-242. **Priority 5 above.**

2. **Per-line atomicity gap on ship/receive/cancel** — both HQTransfer and GroupTransfer iterate per line with no database transaction wrapper. A mid-loop failure can leave a transfer in an inconsistent state (some lines moved, others not). Not addressed in Phase 4. Flagged in LL-242.

3. **Sender email not yet on brand domain** — current transactional email sender is placeholder. Update to `noreply@nuai.co.za` once the `nuai.co.za` domain goes live in Resend. Blocks on owner external action (CIPRO + domain purchase).

4. **docs/.claude/worktrees/ full cleanup** — leftover worktree artefacts in `docs/.claude/` need `rm -rf` directly on disk. Do NOT commit the cleanup; these are untracked and must never be committed. Disk-only operation.

5. **tenant-group-members seed migration not committed to repo** — Phase 1 schema was applied via Supabase dashboard directly, not through a committed migration file. If a future audit needs provenance, check Supabase dashboard SQL history for the date of Phase 1 work (11 April 2026, commits `ad3dc21` → `c304c40` range).

### Resolved in Addendum 4:

- ✅ CLAUDE.md staleness (v1.0 had stale HEAD + wrong LL-206 + 15+ factual errors) — v2.0 shipped at `11f12b4`
- ✅ GroupPortal transfers tab was a placeholder — now mounts GroupTransfer at `5668e03`
- ✅ Phase 4 AVCO correctness — fixed in GroupTransfer at `5668e03` (HQTransfer fix is Priority 5)

---

## TEST CREDENTIALS

- **Medi Can Franchisor (group owner + seeded tenant):** `medican@nuai.dev` / `MediCan2026!`
- Logs into `/group-portal` → shows Medi Can Franchise Network with one member (Medi Can Dispensary)
- Dashboard tab: live NetworkDashboard with real Supabase data
- Transfers tab: GroupTransfer — create / ship / receive / cancel all functional
- **Do NOT re-seed Medi Can** (LL-227 still active)

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `5668e03`** at close. Confirm with `git log --oneline -1`.
2. **CLAUDE.md v2.0 is canonical.** Version-free, delegates state. Do not trust older versions in your context window.
3. **LL-242 is the newest rule.** HQTransfer.js receive pattern is broken; do not propagate it. GroupTransfer.js is the correct reference.
4. **Group Portal is LIVE end-to-end.** Dashboard + Transfers both functional via `medican@nuai.dev`.
5. **WP-TENANT-GROUPS is 4 of 6 phases done.** Phase 5 (GroupSettings.js) is Priority 1.
6. **`user_tenant_id()`** is the RLS helper. NOT `get_my_tenant_id()` (does not exist).
7. **`orders.total`** NOT `total_amount`. **`status = "paid"`** NOT `!= "cancelled"`. **`inventory_items.reorder_level`** NOT `reorder_point`. Dispensary revenue = `dispensing_log.quantity_dispensed × inventory_items.sell_price` (LL-231).
8. **T.* tokens mandatory** for every new component (LL-238). `import { T } from "../../styles/tokens"`. Zero hardcoded px matching a token. Zero local T definitions.
9. **RULE 0Q absolute** — Claude.ai never calls `push_files` or `create_or_update_file`. Claude Code only.
10. **Medi Can (`2bd41eb7-...`) is seeded AND a group franchisor.** Do NOT re-seed (LL-227).

---

## SESSION CLOSE CHECKLIST FOR THIS NEXT SESSION

When the v241 session ends, the closing agent must:

1. Append **Addendum 5** to `docs/SESSION-STATE_v239.md` covering all work done
2. Write `docs/NEXT-SESSION-PROMPT_v242.md` with the fresh HEAD and next priorities
3. Commit both in one commit: `docs: SESSION-STATE Addendum 5 + NEXT-SESSION-PROMPT v242`
4. Report the commit hash + working-tree clean status

Do NOT create a SESSION-STATE_v240.md — the addendum chain on v239 is
the established pattern for this build sequence. A clean v[next]
SESSION-STATE should only be started when the addendum chain becomes
unmanageable (rough heuristic: 5+ addendums or 2,000+ lines).

---

*NEXT-SESSION-PROMPT_v241.md · 11 April 2026 (extended close)*
*HEAD at write: 5668e03 · CLAUDE.md v2.0 canonical · WP-TENANT-GROUPS Phase 4 complete*
*Franchise network portal: dashboard + transfers LIVE · AVCO correct in GroupTransfer · HQTransfer still broken (LL-242 Priority 5)*
