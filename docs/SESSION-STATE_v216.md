# SESSION-STATE v216 — 09 Apr 2026 (Session Close)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- HEAD: 10244a5

## OPERATING MODE: BETA DEV MODE (locked)

## Read Order — Every Session
1. docs/PLATFORM-OVERVIEW_v1_0.md — READ THIS FIRST. What the system actually is.
2. docs/NUAI-AGENT-BIBLE.md — rules, patterns, lessons learned
3. docs/SESSION-STATE_v216.md (this file) — current state
4. docs/VIOLATION_LOG_v1_1.md — what went wrong before
5. Verify HEAD via GitHub:get_file_contents before any build

---

## THIS SESSION — WHAT HAPPENED

### COMMITS (3fb5ed0 → 10244a5)
| SHA | What |
|---|---|
| 913a07a | P3-C: Smart Capture VAT auto-fill — process-document v2.2 + auto-post-capture v1.1 |
| 01eee9b | docs: LIVE-AUDIT v1.0 — systematic direct codebase read (3 parts, 1,032 lines) |
| 10244a5 | docs: PLATFORM-OVERVIEW v1.0 + NUAI-AGENT-BIBLE preamble |

### P3-C — Smart Capture VAT Auto-Fill — COMPLETE ✅
process-document v53: vat_amount + amount_excl_vat added to extraction schema. Supplier vat_registered context passed. Override block forces input_vat_amount=0 for non-VAT suppliers.
auto-post-capture v2: expenses INSERT now includes input_vat_amount. Direct vat_transactions INSERT removed (was duplicating). New step queries trigger-created row and links back.

### LIVE-AUDIT v1.0 — COMMITTED ✅
First systematic direct codebase read. 3 parts, 1,032 lines.
Key findings: 224,293 lines · 109 tables · 6 portals · 41 HQ tabs (not 35) · 17 stock components · 16,085 F&B exclusive lines · 6,620 molecule education lines · 21,583 HR lines

### PLATFORM-OVERVIEW_v1_0.md — COMMITTED ✅
Permanent orientation doc. Never deleted. Every agent reads first.

### NUAI-AGENT-BIBLE.md — PREAMBLE ADDED ✅
Key numbers banner before any rule content.

### PROJECT INSTRUCTIONS UPDATED ✅
Claude.ai Instructions box: 16 words → ~600 words. All future sessions start informed.

### CA PRESENTATION DOCUMENTS PRODUCED
Two professional Word documents for senior CA presentation (not in repo — downloaded):
- NuAi_Platform_Overview_April2026.docx (14 sections)
- NuAi_Appendix_A_April2026.docx (stock intelligence, ProteaAI, 13 extended capabilities)

---

## FULL VAT PIPELINE — COMPLETE ✅

Entry A (P3-A): expenses.input_vat_amount → expense_vat_sync → vat_transactions ✅
Entry B (P3-B): stock_receipts.input_vat_amount → receipt_vat_sync → vat_transactions ✅
Entry C (P3-C): process-document extracts VAT → auto-post-capture writes expenses.input_vat_amount → trigger fires → vat_transactions ✅

---

## WP-FINANCIALS — COMPLETE ✅

All 10 phases delivered. Live figures: R477,880 revenue · 62.13% GM · R296,606 net profit · R180,733.69 bank reconciled · R59,774 NBV fixed assets · 15 IFRS notes.

---

## EF STATUS

| Function | Version | Notes |
|---|---|---|
| process-document | v53 | P3-C VAT extraction |
| auto-post-capture | v2 | Trigger-based VAT, no duplicates |
| ai-copilot | v59 | |
| loyalty-ai | v2 | |
| sim-pos-sales | v4 | |
| sign-qr | v36 | |
| verify-qr | v34 | |
| send-notification | v37 | |
| get-fx-rate | v35 | |
| receive-from-capture | v1 | |

---

## LL-205 PATCHED TABLES (12 — do NOT re-patch)
journal_entries · journal_lines · vat_transactions · fixed_assets · bank_accounts · bank_statement_lines · expenses · depreciation_entries · chart_of_accounts · equity_ledger · vat_period_filings · financial_statement_status

---

## STRATEGIC CONTEXT

This session produced the first complete picture of the platform via direct codebase read.
NuAi is a production multi-tenant SaaS ERP — not a dev project.
224,293 lines · 6 portals · 10 major systems · 4 industry profiles · all live.
Medi Rec is ON HOLD. Platform-level development is the priority.

---

## NEXT PRIORITIES

1. WP-REORDER Phase 1 — velocity-based reorder engine. Spec: docs/WP-REORDER_v1_0.md
2. WP-DASHBOARD-IB — inbox-style manager dashboard. Spec: docs/WP-DASHBOARD-IB_v1_0.md
3. ProteaAI CODEBASE_FACTS update — stale, needs EF versions + WP-FINANCIALS complete flag (str_replace only — LOCKED file)

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
*Supersedes v215. Read PLATFORM-OVERVIEW_v1_0.md first — always.*
*VAT pipeline 100% complete. WP-FINANCIALS complete. Medi Rec on hold. Next: WP-REORDER.*
