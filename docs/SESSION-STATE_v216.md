# SESSION-STATE v216 — 09 Apr 2026 (Session Close)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- HEAD: 9939421

## OPERATING MODE: BETA DEV MODE (locked)

## Read Order — Every Session
1. docs/PLATFORM-OVERVIEW_v1_0.md — READ THIS FIRST
2. docs/NUAI-AGENT-BIBLE.md — rules and patterns
3. docs/SESSION-STATE_v216.md (this file)
4. docs/VIOLATION_LOG_v1_1.md
5. Verify HEAD via GitHub:get_file_contents before any build

---

## THIS SESSION — COMMITS (3fb5ed0 → 9939421)

| SHA | What |
|---|---|
| 913a07a | P3-C: Smart Capture VAT — process-document v53 + auto-post-capture v2 |
| 01eee9b | LIVE-AUDIT v1.0 — 3 parts, 1,032 lines, direct codebase read |
| 10244a5 | PLATFORM-OVERVIEW v1.0 + NUAI-AGENT-BIBLE preamble |
| 9939421 | docs cleanup — 35 stale files deleted, 6,113 lines removed |

---

## P3-C — COMPLETE ✅

process-document v53: vat_amount + amount_excl_vat added to extraction schema. Supplier vat_registered context + override block. checkSarsCompliance prefers explicit VAT over 15/115 fallback.

auto-post-capture v2: expenses INSERT includes input_vat_amount. Direct vat_transactions INSERT removed (was duplicating). Queries trigger-created row and links back. Response includes vat_source: "expense_trigger".

## FULL VAT PIPELINE — COMPLETE ✅
- P3-A: expenses.input_vat_amount → expense_vat_sync → vat_transactions
- P3-B: stock_receipts.input_vat_amount → receipt_vat_sync → vat_transactions
- P3-C: Smart Capture → auto-post-capture writes input_vat_amount → trigger fires

## WP-FINANCIALS — COMPLETE ✅
All 10 phases. Live: R477,880 revenue · 62.13% GM · R296,606 net profit

## DOCS RESTRUCTURE — COMPLETE ✅
- PLATFORM-OVERVIEW_v1_0.md committed (permanent, never delete)
- NUAI-AGENT-BIBLE.md preamble added
- Project Instructions box updated (16 words → ~600 words)
- LIVE-AUDIT v1.0 committed (3 parts — authoritative codebase record)
- 35 stale docs deleted, 6,113 lines removed
- CA presentation Word documents produced (downloaded, not in repo)

---

## EF STATUS

| Function | Version |
|---|---|
| process-document | v53 |
| auto-post-capture | v2 |
| ai-copilot | v59 |
| loyalty-ai | v2 |
| sim-pos-sales | v4 |
| sign-qr | v36 |
| verify-qr | v34 |
| send-notification | v37 |
| get-fx-rate | v35 |
| receive-from-capture | v1 |

## LL-205 PATCHED TABLES (12 — do NOT re-patch)
journal_entries · journal_lines · vat_transactions · fixed_assets · bank_accounts · bank_statement_lines · expenses · depreciation_entries · chart_of_accounts · equity_ledger · vat_period_filings · financial_statement_status

---

## STRATEGIC CONTEXT

NuAi is a production multi-tenant SaaS ERP — not a dev project.
224,293 lines · 6 portals · 10 major systems · 4 industry profiles · all live.
Medi Rec ON HOLD. Platform-level development is the priority.

---

## NEXT PRIORITIES

1. WP-REORDER Phase 1 — read docs/WP-REORDER_v1_0.md first
2. WP-DASHBOARD-IB — read docs/WP-DASHBOARD-IB_v1_0.md
3. ProteaAI CODEBASE_FACTS — str_replace only, LOCKED file

---

## OWNER ACTIONS (URGENT)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- pg_cron: loyalty-ai nightly (SQL in NUAI-AGENT-BIBLE Section 8)
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
- Yoco keys: portal.yoco.com (after CIPRO)

---

## LOCKED FILES
src/components/StockItemModal.js · src/components/ProteaAI.js (CODEBASE_FACTS str_replace only) · src/components/PlatformBar.js · src/services/supabaseClient.js

## PROTECTED FILES
src/components/hq/HQStock.js · src/components/hq/LiveFXBar.js

---
*SESSION-STATE v216 · NuAi · 09 Apr 2026*
*Read PLATFORM-OVERVIEW_v1_0.md first — always.*
*VAT pipeline 100% complete. WP-FINANCIALS complete. Medi Rec on hold.*
