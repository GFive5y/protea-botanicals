# WP-FIN-004 — Trial Balance Export (CA Working Papers Format)
## Planner: Claude.ai · Executor: Claude Code · Status: IN PROGRESS (PRs 1-3 shipped)
## Produced: 19 April 2026 · Session S-2B.6
## Source loop: LOOP-FIN-004 (BACKLOG-001 in PENDING-ACTIONS.md)
## Owner decisions captured S-2B.6 (below, Section 0)

---

## 0 — OWNER DECISIONS (locked)

Three design decisions, captured in chat, lock before this WP was written:

| # | Decision | Owner call | Rationale |
|---|---|---|---|
| Q1 | TB engine shape | **Postgres function** (`fn_trial_balance`, `fn_gl_detail`) | Single source of truth. `generate-financial-statements` EF will reuse the same engine for TB appendix in the audit PDF. Consistent with existing `tenant_financial_period` RPC pattern (LL-210, LL-209). |
| Q2 | GL Detail sheet cap | **10k rows + truncation note + per-quarter fallback link** | Excel handles 10k; beyond that older CA laptops lag. CA first impression matters. |
| Q3 | Per-account drill UI | **New "Trial Balance" tab in HQFinancialStatements with drill drawer** | HQJournals is for manual adjusting entries only; mixing derived GL there would confuse. Drill lives in the TB tab. |
| — | DRAFT watermark | **Apply when `financial_statement_status.status != 'signed'` OR row missing** | CAs need to pull draft TBs DURING the audit — that's when they use them most. Can't restrict to signed-only. |

---

## EXECUTION STATUS (as of S-2B.6 close)

| PR | Status | Commit | Notes |
|---|---|---|---|
| 1 | SHIPPED | 067e7f0 | fn_trial_balance + expense_subcategory_account_map + opening_RE backfill |
| 2 | SHIPPED | 0dec469 | fn_gl_detail — double-entry expansion |
| 3 | SHIPPED | f5a2332 | React TB tab + GL drill drawer |
| 4 | PENDING | — | Excel export via SheetJS (~1.5h) |
| 5 | PENDING | — | Audit log + docs close (~0.5h) |

---

*WP-FIN-004 · NuAi · 19 April 2026 · Produced by Claude.ai planner S-2B.6*
*In progress. 3/5 PRs shipped. LOOP-FIN-004 closes when PR 5 commits.*
