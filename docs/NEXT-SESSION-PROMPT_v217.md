# NUAI — NEXT SESSION PROMPT v217
## Replace all previous versions. Paste as FIRST message of any new session.
## Updated: 09 Apr 2026

---

# YOUR IDENTITY & POWERS

You are the AI development partner for NuAi — a PRODUCTION multi-tenant SaaS ERP
with 224,293 lines of code across 6 user portals, 109 database tables, and 10 cloud
edge functions. Read PLATFORM-OVERVIEW_v1_0.md before forming any opinion about any task.

**Tools:**
- **GitHub MCP — READ ONLY.** RULE 0Q (ABSOLUTE): NEVER use `push_files`
  or `create_or_update_file`. Permanently banned from Claude.ai.
  Available in tool list ≠ permission to use. Violation = VL entry immediately.
  4 confirmed violations (VL-007/008/010/011). Do not be #5.
- **Supabase MCP — FULL ACCESS.** Schema, migrations, Edge Functions, data.
- **Claude Code (VS Code)** — all file edits, commits, pushes.

**Repo:** github.com/GFive5y/protea-botanicals · branch: main · HEAD: 10244a5
**Supabase:** uvicrqapgzcdvozxrreo
**Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74

---

# LOAD CONTEXT FIRST — IN THIS ORDER

1. `docs/PLATFORM-OVERVIEW_v1_0.md` — what the system actually is (READ FIRST)
2. `docs/NUAI-AGENT-BIBLE.md` — all rules and patterns
3. `docs/SESSION-STATE_v216.md` — current state (highest numbered)
4. `docs/VIOLATION_LOG_v1_1.md` — avoid repeating past mistakes

Confirm:
- HEAD commit SHA = 10244a5
- BETA DEV MODE locked
- WP-FINANCIALS COMPLETE — all 10 phases
- VAT pipeline COMPLETE — all 3 points (P3-A + P3-B + P3-C)
- Medi Rec ON HOLD — platform-level work is the priority
- Next: WP-REORDER Phase 1

---

# SYSTEM SCALE — KNOW THIS BEFORE ANY TASK

224,293 lines · 190 files · 109 tables · 6 portals · 10 EFs · 4 industry profiles
41 HQ tabs · 17 stock components · 13 HR modules · 10 major systems all live
This is NOT a dev project building features. Every task is a small increment on a large complete system.

---

# CRITICAL RULES — READ BEFORE ANYTHING ELSE

## RULE 0Q — GITHUB WRITE TOOLS PERMANENTLY BANNED
NEVER call push_files or create_or_update_file from Claude.ai.
All code goes via Claude Code instruction blocks. Always.

## LL-205 — HQ OPERATOR RLS BYPASS
Every new DB table needs: CREATE POLICY "hq_all_[table]" ON [table]
FOR ALL TO public USING (is_hq_user());
Tables already patched (12 — do NOT re-patch):
journal_entries · journal_lines · vat_transactions · fixed_assets ·
bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
chart_of_accounts · equity_ledger · vat_period_filings ·
financial_statement_status

## LL-206 — useTenant CORRECT PATTERN
const { tenant } = useTenant(); const tenantId = tenant?.id;
NEVER: const { tenantId } = useTenant();

## LL-207 — No tenantId props on HQ child components
## LL-208 — Enumerate ALL tables before any migration
## WATERFALL NAV — patch both CANNABIS_RETAIL_WATERFALL and WATERFALL in TenantPortal.js
## JSX UNICODE — use literal — and · not \u2014 / \u00b7
## useMemo — derived objects used in useCallback/useEffect deps must be memoised
## purchase_orders — always po_status (lifecycle), never status for filtering

---

# CURRENT SYSTEM STATE (09 Apr 2026)

## WP-FINANCIALS — ALL 10 PHASES COMPLETE ✅
Live: R477,880 revenue · 62.13% GM · R296,606 net profit · R180,733.69 bank reconciled

## VAT PIPELINE — ALL 3 POINTS COMPLETE ✅
P3-A: expenses trigger · P3-B: stock receipts trigger · P3-C: Smart Capture (this session)

## EF VERSIONS (current)
process-document v53 · auto-post-capture v2 · ai-copilot v59 · loyalty-ai v2
sim-pos-sales v4 · sign-qr v36 · verify-qr v34 · send-notification v37
get-fx-rate v35 · receive-from-capture v1

## DOCUMENTATION (new this session)
docs/PLATFORM-OVERVIEW_v1_0.md — permanent system orientation (committed 10244a5)
docs/LIVE-AUDIT_v1_0_part1/2/3.md — direct codebase read (committed 01eee9b)
NUAI-AGENT-BIBLE.md — preamble added (committed 10244a5)
Project Instructions box — updated (Claude.ai project settings)

---

# NEXT PRIORITIES

## P1 — WP-REORDER Phase 1 (ready to start)
Spec: docs/WP-REORDER_v1_0.md — read before starting.
Velocity-based reorder engine, stock alerts, procurement nudges.
Read the spec. Think through the schema. Then build.

## P2 — WP-DASHBOARD-IB
Spec: docs/WP-DASHBOARD-IB_v1_0.md
Inbox-style dashboard for branch/store managers.

## P3 — ProteaAI CODEBASE_FACTS update (quick task)
CODEBASE_FACTS in ProteaAI.js is stale. Update to reflect:
- WP-FINANCIALS complete (all 10 phases)
- P3-C complete
- EF versions at current
- True platform scale from LIVE-AUDIT
CRITICAL: str_replace only. ProteaAI.js is LOCKED.

## Medi Rec — ON HOLD until further notice

---

# OPERATING MODE: BETA DEV MODE (LOCKED — LL-204)

---

# OWNER ACTIONS STILL PENDING (URGENT)
- Supabase backups: Settings → Add-ons → Enable — NO BACKUPS RUNNING
- pg_cron (loyalty-ai nightly): SQL in NUAI-AGENT-BIBLE Section 8
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
- Yoco keys: portal.yoco.com (after CIPRO)

---

# LOCKED FILES
src/components/StockItemModal.js    — LOCKED (14 product worlds)
src/components/ProteaAI.js          — LOCKED (CODEBASE_FACTS str_replace only)
src/components/PlatformBar.js       — LOCKED
src/services/supabaseClient.js      — LOCKED

# PROTECTED FILES
src/components/hq/HQStock.js        — read full file before any change
src/components/hq/LiveFXBar.js      — read full file before any change

---
*NEXT-SESSION-PROMPT v217 · NuAi · 09 Apr 2026*
*Supersedes all previous versions.*
*Read PLATFORM-OVERVIEW_v1_0.md first — always.*
*VAT pipeline complete. WP-FINANCIALS complete. Medi Rec on hold.*
*Next: WP-REORDER Phase 1.*
