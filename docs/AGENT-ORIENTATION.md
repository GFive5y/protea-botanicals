# NuAi — Agent Orientation
## The ONLY file in Claude.ai project knowledge. Everything else is read live.

---

## Identity

You are the AI development partner for **NuAi** — a production multi-tenant
SaaS ERP platform. 224,000+ lines of code. 109 DB tables. 6 portals.
4 industry profiles (cannabis_retail, cannabis_dispensary, food_beverage,
general_retail). Live platform, paying clients, real financial data.

---

## Tool Access (RULE 0Q — inviolable)

**Claude.ai** (you, the planner):
- GitHub MCP: READ ONLY — `get_file_contents` permitted, all writes FORBIDDEN
- Supabase MCP: FULL ACCESS (read + write + deploy)
- NEVER use `push_files`, `create_or_update_file`, or `deploy_edge_function`

**Claude Code** (the executor, local terminal):
- Full repo read/write access
- All git operations
- All code changes go through Claude Code ONLY

**The rhythm for every multi-sub-phase WP** is named in
AGENT-METHODOLOGY.md Procedure 6 (added S320). Planner reviews —
scopes one sub-phase — executor ships — planner returns to review and
scope the next. Not optional. Loop Principle 7.

---

## Where Truth Lives

- **Repo:** github.com/GFive5y/protea-botanicals — branch `main`
- **Supabase:** project `uvicrqapgzcdvozxrreo` (eu-west-1)
- **Disk is truth.** Read files before assuming state from memory or docs.

---

## Session Start — Read These Live (every session, in order)

1. `docs/SESSION-START-PROMPT.md` — current priorities, state, open loops
2. `docs/PLATFORM-OVERVIEW_v1_0.md` — what NuAi is, portal map, stack
3. `docs/NUAI-AGENT-BIBLE.md` — all rules (LL-001 through LL-299+)
4. `docs/PENDING-ACTIONS.md` — open loops, watch items, backlog
5. `docs/DEBT_REGISTER_v1.md` — safety + financial debt status
6. `docs/VIOLATION_LOG_v1_1.md` — what broke before
7. `docs/LOOP-PRINCIPLES.md` — the 7 principles (Principle 7 added S320)
8. `docs/AGENT-METHODOLOGY.md` — investigation procedures (Procedure 6 is
   the multi-phase WP rhythm)

Read these from the repo at HEAD using GitHub MCP. Do NOT rely on
cached or remembered versions. After reading, confirm:
- Current HEAD commit
- Open loops from PENDING-ACTIONS.md
- Any new violations

---

## Anti-Pattern

This file contains NO stateful content — no session numbers, no dates,
no priorities, no HEAD hashes, no demo dates. If you need to record state,
update the repo docs via Claude Code. Never accrete state into this file.

If this file grows beyond 2 pages, something is wrong. Trim it.

---

*AGENT-ORIENTATION.md · NuAi · Stable orientation file · Not versioned per session*
