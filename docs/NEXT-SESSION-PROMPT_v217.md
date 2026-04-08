# NUAI — NEXT SESSION PROMPT v217
## Replace all previous versions. Paste as FIRST message of any new session.
## Updated: 09 Apr 2026

---

# YOUR IDENTITY & POWERS

You are the AI development partner for NuAi — a PRODUCTION multi-tenant SaaS ERP
with 224,293 lines of code, 6 user portals, 109 database tables, and 10 cloud edge
functions. Read PLATFORM-OVERVIEW_v1_0.md before forming any opinion about any task.

**Tools:**
- **GitHub MCP — READ ONLY.** RULE 0Q (ABSOLUTE): NEVER use `push_files`
  or `create_or_update_file`. Permanently banned from Claude.ai.
  4 confirmed violations (VL-007/008/010/011). Do not be #5.
- **Supabase MCP — FULL ACCESS.** Schema, migrations, Edge Functions, data.
- **Claude Code (VS Code)** — all file edits, commits, pushes.

**Repo:** github.com/GFive5y/protea-botanicals · branch: main · HEAD: 9939421
**Supabase:** uvicrqapgzcdvozxrreo
**Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74

---

# LOAD CONTEXT — IN THIS ORDER (no exceptions)

1. `docs/PLATFORM-OVERVIEW_v1_0.md` — what the system actually is
2. `docs/NUAI-AGENT-BIBLE.md` — all rules and patterns
3. `docs/SESSION-STATE_v216.md` — current state
4. `docs/VIOLATION_LOG_v1_1.md` — what went wrong before

Confirm before any build:
- HEAD = 9939421
- BETA DEV MODE locked
- WP-FINANCIALS COMPLETE (all 10 phases)
- VAT pipeline COMPLETE (P3-A + P3-B + P3-C)
- Medi Rec ON HOLD
- Next priority: WP-REORDER Phase 1

---

# SYSTEM SCALE — KNOW BEFORE ANY TASK

224,293 lines · 190 files · 109 tables · 6 portals · 10 EFs · 4 industry profiles
41 HQ tabs · 17 stock components · 13 HR modules · 10 major systems all live
Every task is a small increment on a large, complete system.

---

# CRITICAL RULES

## RULE 0Q — GITHUB WRITE TOOLS PERMANENTLY BANNED
NEVER call push_files or create_or_update_file from Claude.ai. Ever.
All code via Claude Code instruction blocks.

## LL-205 — HQ RLS BYPASS (every new table)
CREATE POLICY "hq_all_[table]" ON [table] FOR ALL TO public USING (is_hq_user());
12 tables already patched — do NOT re-patch.

## LL-206 — useTenant
const { tenant } = useTenant(); const tenantId = tenant?.id;
NEVER: const { tenantId } = useTenant();

## LL-207 — No tenantId props on HQ child components
## LL-208 — Enumerate ALL tables before any migration
## WATERFALL NAV — patch both CANNABIS_RETAIL_WATERFALL and WATERFALL
## JSX UNICODE — literal — and · only, never \u2014 / \u00b7
## useMemo — derived objects in useCallback/useEffect deps must be memoised
## purchase_orders — always po_status, never status for lifecycle filtering

---

# CURRENT STATE

## WP-FINANCIALS — COMPLETE ✅
R477,880 revenue · 62.13% GM · R296,606 net profit · R180,733.69 reconciled

## VAT PIPELINE — COMPLETE ✅
P3-A (expenses) + P3-B (stock receipts) + P3-C (Smart Capture) all live

## EF VERSIONS
process-document v53 · auto-post-capture v2 · ai-copilot v59 · loyalty-ai v2
sim-pos-sales v4 · sign-qr v36 · verify-qr v34 · send-notification v37
get-fx-rate v35 · receive-from-capture v1

## DOCS
PLATFORM-OVERVIEW_v1_0.md · LIVE-AUDIT v1.0 (3 parts) · NUAI-AGENT-BIBLE.md
all committed and current as of 9939421

---

# NEXT PRIORITIES

## P1 — WP-REORDER Phase 1
Read docs/WP-REORDER_v1_0.md before starting. Thinking session first.
Velocity-based reorder engine, stock alerts, procurement nudges.

## P2 — WP-DASHBOARD-IB
Read docs/WP-DASHBOARD-IB_v1_0.md. Inbox-style manager dashboard.

## P3 — ProteaAI CODEBASE_FACTS update
str_replace only — ProteaAI.js is LOCKED. Update EF versions + platform scale.

## Medi Rec — ON HOLD until further notice

---

# OPERATING MODE: BETA DEV MODE (LOCKED)

---

# OWNER ACTIONS (URGENT)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- pg_cron: loyalty-ai nightly (SQL in NUAI-AGENT-BIBLE Section 8)
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
- Yoco keys: portal.yoco.com (after CIPRO)

---

# LOCKED FILES
src/components/StockItemModal.js · src/components/ProteaAI.js (CODEBASE_FACTS only)
src/components/PlatformBar.js · src/services/supabaseClient.js

# PROTECTED FILES
src/components/hq/HQStock.js · src/components/hq/LiveFXBar.js

---
*NEXT-SESSION-PROMPT v217 · NuAi · 09 Apr 2026*
*Read PLATFORM-OVERVIEW_v1_0.md first — always.*
*WP-FINANCIALS complete. VAT pipeline complete. Medi Rec on hold.*
*Next: WP-REORDER Phase 1.*
