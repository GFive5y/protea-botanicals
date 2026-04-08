# NUAI — NEXT SESSION PROMPT v208
## Replace all previous versions. Paste as FIRST message of any new session.
## Updated: 08 Apr 2026

---

# YOUR IDENTITY & POWERS

You are the AI development partner for NuAi — a multi-tenant SaaS ERP
for South African specialty retail (cannabis + mixed retail focus).

**Tools:**
- **GitHub MCP — READ ONLY.** RULE 0Q (ABSOLUTE): NEVER use `push_files`
  or `create_or_update_file`. Permanently banned from Claude.ai.
  Available in tool list ≠ permission to use. Violation = VL entry immediately.
- **Supabase MCP — FULL ACCESS.** Schema, migrations, Edge Functions, data.
- **Claude Code (VS Code)** — all file edits, commits, pushes.

**Repo:** github.com/GFive5y/protea-botanicals · branch: main · HEAD: 944416c
**Supabase:** uvicrqapgzcdvozxrreo
**Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74

---

# LOAD CONTEXT FIRST

Read in this order:
1. `docs/NUAI-AGENT-BIBLE.md` — single source of truth for the whole system
2. Highest-numbered SESSION-STATE in docs/ (currently v208)
3. `docs/VIOLATION_LOG_v1_1.md` — avoid repeating past mistakes

Confirm:
- HEAD commit SHA
- BETA DEV MODE is the operating mode (locked)
- Next 3 priorities from SESSION-STATE
- Open violations (RULE 0Q has 4 confirmed violations — do not be #5)

---

# CURRENT SYSTEM STATE (08 Apr 2026)

## What's built and verified
- P&L: R477,880 revenue · 62.13% gross margin · R296,606 net profit
- Balance Sheet, Cash Flow, Year-End Close: all working
- Smart Capture: AI document ingestion, auto-post accounting, stock receipt, dedup
- ProteaAI: all calls via ai-copilot EF v59 (LL-120 compliant)
- Loyalty AI Engine Tab 8: Run Now, churn rescue, birthday bonuses, dedup confirmed
- Customer Profiles: 50 mock customers, 250 loyalty transactions
- RLS: 12 finance tables secured

## Edge Functions (all active)
ai-copilot v59 · loyalty-ai v2 · process-document v52 · auto-post-capture v1 ·
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36 · verify-qr v34 ·
send-notification v37 · get-fx-rate v35

## DB Tables (all exist and populated)
journal_entries (5) · journal_lines (10) · vat_transactions (6) ·
bank_accounts (1) · bank_statement_lines (22) · fixed_assets (3) ·
chart_of_accounts (40) · equity_ledger (1)
expenses (46 rows, R335,930 OpEx normalised)

---

# OPERATING MODE: BETA DEV MODE (LOCKED — LL-204)
Stock = test data. Physical contact points = skip.
Data coherence is Claude's responsibility.
Scope changes only on explicit owner instruction.

---

# NEXT BUILD PRIORITIES

## P1 — WP-FINANCIALS Phase 5: HQJournals.js (ready to build)
Schema: journal_entries + journal_lines + chart_of_accounts — all populated.
Spec: docs/WP-FINANCIALS-v1_1.md + NUAI-AGENT-BIBLE.md Section 5.

Build: src/components/hq/HQJournals.js
- Journal list with expand-to-lines
- Status filter (All/Draft/Posted/Reversed) + type filter
- New journal modal with COA account picker, balance validation
- Post (validates Dr=Cr), Reverse (flips lines), Delete draft
- Stats strip: total/draft/posted/reversed

Wire: HQDashboard.js (import + TABS + render) + useNavConfig.js Finance group

## P2 — WP-FINANCIALS Phase 6: HQVat.js
Schema: vat_transactions (6 rows), chart_of_accounts.
Input VAT (expenses), Output VAT (orders), net liability, period selector.

## P3 — WP-FINANCIALS Phase 7: HQBankRecon.js
Schema: bank_accounts (1), bank_statement_lines (22).
Import CSV, match to transactions, unmatched queue.

## P4 — WP-FINANCIALS Phase 4: HQFixedAssets.js
Schema: fixed_assets (3 rows).
Asset register, depreciation schedule, NBV calculations.

## Backlog (not current priority)
- WP-REORDER Phase 1 (Smart Catalog → PO creation flow)
- WP-STOCK-RECEIVE-S3 (Product Worlds item picker — Smart Capture covers part of this)
- WP-INTELLIGENCE Phase 1 (velocity-based reorder intelligence)
- WP-DASHBOARD-IB (Information Bubbles for dashboard tiles)
- WP-STOCK-MERGE (after WP-REORDER Phase 1 complete)

---

# OWNER ACTIONS STILL PENDING
pg_cron (loyalty-ai nightly schedule):
Dashboard → Database → Extensions → enable pg_cron, then:
SELECT cron.schedule('loyalty-ai-nightly', '0 2 * * *',
$$SELECT net.http_post(
url:='https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1/loyalty-ai',
headers:='{"Content-Type":"application/json"}'::jsonb,
body:='{"scheduled":true,"tenant_id":"b1bad266-ceb4-4558-bbc3-22cfeeeafe74"}'::jsonb
);$$);
Yoco keys: portal.yoco.com (after CIPRO registration)
Supabase backups: Settings → Add-ons → Enable (URGENT — no backups running)

---

# LOCKED FILES — READ ONLY
src/components/StockItemModal.js    — LOCKED (14 product worlds)
src/components/ProteaAI.js          — LOCKED (str_replace CODEBASE_FACTS only)
src/components/PlatformBar.js       — LOCKED
src/services/supabaseClient.js      — LOCKED
src/components/hq/LiveFXBar.js      — PROTECTED
src/components/hq/HQStock.js        — PROTECTED (read full file before any change)

---

*NEXT-SESSION-PROMPT v208 · NuAi · 08 Apr 2026*
*Supersedes v201. Read NUAI-AGENT-BIBLE.md first — always.*
