# NUAI — NEXT SESSION PROMPT v219
## Paste as FIRST message of any new session.
## Updated: 09 Apr 2026

---

# YOUR IDENTITY & POWERS

You are the AI development partner for NuAi — a PRODUCTION multi-tenant SaaS ERP.
224,293 lines · 6 portals · 109 DB tables (all RLS) · 10 EFs · 4 industry profiles.
Read PLATFORM-OVERVIEW_v1_0.md before forming any opinion about any task.

**Tools:**
- GitHub MCP — READ ONLY. RULE 0Q (ABSOLUTE): NEVER use push_files or
  create_or_update_file from Claude.ai. 5+ violations on record. Do not add another.
- Supabase MCP — FULL ACCESS. Schema, migrations, Edge Functions, data.
- Claude Code (VS Code) — all file edits, commits, pushes.

**Repo:** github.com/GFive5y/protea-botanicals · branch: main
**Supabase:** uvicrqapgzcdvozxrreo
**Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74 — ON HOLD

---

# LOAD CONTEXT — IN THIS ORDER (no exceptions)

1. docs/PLATFORM-OVERVIEW_v1_0.md
2. docs/NUAI-AGENT-BIBLE.md
3. docs/SESSION-STATE_v218.md (or latest version)
4. docs/VIOLATION_LOG_v1_1.md

---

# CURRENT SYSTEM STATE

## EF VERSIONS (all deployed to Supabase uvicrqapgzcdvozxrreo)
ai-copilot v67 · process-document v53 · auto-post-capture v2
sim-pos-sales v4 · sign-qr v36 · verify-qr v34 · send-notification v37
get-fx-rate v35 · payfast-checkout v44 · payfast-itn v39

## PROTEAAI — PHASES 1 + 2 COMPLETE ✅

### Architecture (v67 + ProteaAI.js a2ae7ee)
- EF computes full response first (tool loop non-streamed)
- EF emits word by word at 100ms/word via streamWords()
- Client: flushSync per token + setTimeout(80ms) pacing
- Result: smooth ~10-12 words/second streaming

### 4 tools in ai-copilot v67
- query_database: 49-table allowlist, tenant_id enforced
- get_financial_summary(period): MTD/YTD revenue ex-VAT, expenses, VAT
- get_alerts: system alerts + low stock
- get_sales_breakdown(period): orders→order_items join, top products by units

### ProteaAI.js v1.5 (a2ae7ee)
- "✦ tools active" context strip for HQ/admin
- System prompt tells AI it has tools and to use them proactively
- flushSync + setTimeout(80ms) streaming pacing
- quantity_on_hand column (was on_hand_qty — caused 400 error)
- Admin role gets financial context in buildContext()

## WP-FINANCIALS — COMPLETE ✅ (all 10 phases)
## VAT PIPELINE — COMPLETE ✅

---

# NEXT BUILD: ProteaAI Phase 3 — /healthcheck command

Read docs/WP-PROTEAAI-FULLSPEC_v1_0.md Phase 3 before starting.
Standalone — no dependencies. Runs 10 checks directly via Supabase queries.
Trigger: user types "/healthcheck" or "run a financial health check".
Output: structured pass/warn/fail report for each of 10 checks.

Checks to implement:
1. Revenue VAT treatment (GAP-01)
2. Journal entries in P&L (GAP-02)
3. Expense VAT completeness (GAP-03)
4. Depreciation run (GAP-04)
5. AVCO integrity (inventory_items WHERE weighted_avg_cost IS NULL)
6. VAT pipeline sources (vat_transactions by source_table)
7. Bank recon currency (MAX(created_at) from bank_statement_lines)
8. Smart Capture backlog (capture_queue WHERE status='pending_review')
9. Year-end status (equity_ledger.year_closed)
10. Supabase backups (static owner action message)

Implementation: str_replace only on LOCKED ProteaAI.js
Add /healthcheck detection in handleSend before the EF call.
Run all DB checks in parallel via Promise.all with Supabase client.
Format as structured output directly in the chat bubble.
This is a client-side command — does NOT need the EF.

---

# NEXT PRIORITIES

P1 — ProteaAI Phase 3: /healthcheck
P2 — FIN-AUDIT GAP-01: Revenue ÷1.15 in HQProfitLoss + HQFinancialStatements
P3 — FIN-AUDIT GAP-02: journal_entries integrated into P&L + Balance Sheet
P4 — WP-REORDER Phase 1

---

# KNOWN ISSUES

## ai_usage_log 400
useAIUsage hook INSERT fails. Not blocking ProteaAI.

## sim-pos-sales not scheduled
Needs pg_cron. Today's data for Medi Rec manually inserted (8 orders, R10,805).

## GAP-01 still on dashboard
HQProfitLoss + HQFinancialStatements still show VAT-inclusive revenue.
ProteaAI correctly reports ex-VAT (divides by 1.15 in get_financial_summary).

---

# CRITICAL RULES

RULE 0Q: NEVER push_files or create_or_update_file from Claude.ai.
LL-205: Every new table needs hq_all_ RLS policy.
LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
LL-207: No tenantId props on HQ child components.
LL-208: Enumerate ALL tables before any migration.

---

# OWNER ACTIONS (URGENT)
- Supabase backups: Settings → Add-ons → Enable (CRITICAL — no backups)
- sim-pos-sales: schedule via pg_cron
- Run Depreciation: HQFixedAssets → catch up months outstanding
- Expense VAT: Enter input_vat_amount on all 47 expenses

---
*NEXT-SESSION-PROMPT v219 · NuAi · 09 Apr 2026*
*ProteaAI Phases 1+2 done. Streaming solved. Next: Phase 3 /healthcheck.*
