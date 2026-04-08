# SESSION-STATE v208 — 08 Apr 2026 (End of Day)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- Live URL: protea-botanicals-git-main-gfive5ys-projects.vercel.app
- HEAD: [this commit]

## OPERATING MODE: BETA DEV MODE (locked)
Stock = test data. Physical contact points = skip. Data is Claude's responsibility.

## Key Documents
- NUAI-AGENT-BIBLE.md — START HERE every session (new in v208)
- SESSION-CORE_v2_11.md — all rules, LL-203 + LL-204 added
- VIOLATION_LOG_v1_1.md — VL-010 + VL-011 added (RULE 0Q × 4 now)

## What's Built and Verified
See NUAI-AGENT-BIBLE.md Section 8 for full list.

## EF Status
See NUAI-AGENT-BIBLE.md Section 2.

## DB State (Medi Rec — 08 Apr 2026)
See NUAI-AGENT-BIBLE.md Section 6.

## Outstanding Owner Actions
- pg_cron: SQL in NUAI-AGENT-BIBLE.md Section 8
- Yoco: portal.yoco.com (after CIPRO)

## Next Dev Session — Start Here
1. Read NUAI-AGENT-BIBLE.md
2. Read this file (SESSION-STATE_v208.md)
3. Read VIOLATION_LOG_v1_1.md
4. Then plan

## Next Build Priorities (in order)
1. HQJournals.js — WP-FINANCIALS Phase 5
   Spec: NUAI-AGENT-BIBLE.md has exact schema. WP-FINANCIALS-v1_1.md has full spec.
   DB ready: journal_entries, journal_lines, chart_of_accounts all populated.
   Claude Code instruction: Claude.ai will provide ONE complete block.

2. HQVat.js — WP-FINANCIALS Phase 6
   DB ready: vat_transactions (6 rows), chart_of_accounts.

3. HQBankRecon.js — WP-FINANCIALS Phase 7
   DB ready: bank_accounts (1 row), bank_statement_lines (22 rows).

4. HQFixedAssets.js — WP-FINANCIALS Phase 4
   DB ready: fixed_assets (3 rows), depreciation_entries.

## Locked Files
src/components/StockItemModal.js · src/components/ProteaAI.js (CODEBASE_FACTS str_replace only) · src/components/PlatformBar.js · src/components/hq/LiveFXBar.js · src/components/hq/HQStock.js

## Tenants (all correct)
Medi Rec: b1bad266 · cannabis_retail
Protea HQ: 43b34c33 · operator
Pure PTV: f8ff8d07 · cannabis_retail ✅ fixed 08 Apr
Test CT: 064adbdc · cannabis_retail
TEST SHOP: 4a6c7d5c · cannabis_retail

---
*SESSION-STATE v208 · NuAi · 08 Apr 2026*
*Supersedes v207. Next session: read NUAI-AGENT-BIBLE.md first.*
