# SESSION-STATE v204 — 08 Apr 2026

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **Live URL:** protea-botanicals-git-main-gfive5ys-projects.vercel.app

---

## Session Apr 8 2026 — WP-SMART-CAPTURE Session 2 + Year-End Close

### Commits This Session

| SHA | Description |
|---|---|
| `3d7d2bb` | Session close v203 — CODEBASE_FACTS + SESSION-STATE + WP-SMART-CAPTURE spec |
| `0b2735a` | P1+P4+P5+P6 — fix capture_queue insert, success IDs, history badges, HQYearEnd v1.0 |
| `51dda28` | Wire HQYearEnd into cannabis retail waterfall Reports section |

### MCP Actions (no git commit)
- `NOTIFY pgrst, 'reload schema'` — PostgREST schema cache refreshed (was silently dropping anti-fraud columns on INSERT)
- `financial_year_archive` table created via `apply_migration`
- `journal_entries.is_year_end_closing` BOOLEAN column added
- `equity_ledger.year_closed` + `closed_at` columns added

---

## Root Cause: The P0 Bug (capture_queue insert always failed)

**Primary cause:** PostgREST schema cache was stale. The anti-fraud columns added to `capture_queue` (`document_fingerprint`, `is_duplicate`, `duplicate_of_id`, `duplicate_confidence`, `duplicate_details`, `unique_identifiers`) were unknown to PostgREST after being added via raw SQL. PostgREST rejected or silently stripped them on INSERT, returning a 400 error which triggered "Capture not saved".

**Fix 1:** `NOTIFY pgrst, 'reload schema'` — executed via Supabase MCP. Immediate effect.

**Secondary fix:** The 6 anti-fraud fields in the INSERT also read from `capture` React state, which is null at insert time because `setCapture()` is async. These now correctly read from `fnData` (the local EF response variable). `duplicate_of_id` hardcoded to null (EF returns fingerprint string not UUID).

**Same root cause explains null fingerprints in document_log** — the EF's Supabase client (PostgREST) was also silently dropping `document_fingerprint`, `image_hash`, `unique_identifiers` from `document_log` INSERTs. After schema reload, these should populate correctly.

---

## What Was Built — This Session

### P1 — capture_queue INSERT fix (commits 0b2735a)
- `fnData` not stale `capture` state for anti-fraud fields
- `duplicate_of_id` hardcoded null (type safety)
- Console.log added for debug confirmation

### P4 — History tab enhanced
- SARS ✓ / Non-SARS / Duplicate pill badges
- Colors: success green / warning amber / danger red

### P5 — Success screen enhanced
- Shows `expense_id` (first 8 chars) + `journal_entry_id`
- Shows "claimable" label on VAT line
- Shows `document_fingerprint` if present
- `setSuccessData` now passes `document_fingerprint` from capture state

### P6 — Year-End Close (HQYearEnd.js v1.0)
**New file:** `src/components/hq/HQYearEnd.js`
- Screen 1: Live P&L summary (revenue, COGS, gross, opex, net)
- Screen 2: Closing journal preview (Dr Revenue → Cr Retained Earnings)
- Screen 3: PIN confirm (default: 1234) + post closing entries
- Screen 4: Archive report with financial_year_archive row

**DB changes (applied via MCP):**
- `financial_year_archive` table (tenant_id, financial_year, net_profit, retained_earnings_cf, archived_by, year_end_journal_id)
- `journal_entries.is_year_end_closing` BOOLEAN DEFAULT false
- `equity_ledger.year_closed` BOOLEAN + `closed_at` TIMESTAMPTZ

**Wired in:** TenantPortal.js — CANNABIS_RETAIL_WATERFALL Reports + generic WATERFALL Intelligence. renderTab case "year-end".

---

## DB State (as of session close)
capture_queue:       1 row (manual Sasol — status: approved)
document_log:        11 rows (fingerprints should populate after schema reload)
expenses:            45+ rows
journal_entries:     2 auto rows
vat_transactions:    6 rows
chart_of_accounts:   40 accounts
financial_year:      FY2024 active
financial_year_archive: 0 rows (no year closed yet)


**PostgREST schema:** Reloaded. Anti-fraud columns now visible to INSERT/UPDATE.

---

## EF Status

| EF | Version | Status |
|---|---|---|
| process-document | v2.1 | ✅ DEPLOYED |
| auto-post-capture | v1 | ✅ DEPLOYED |

**Note:** After PostgREST schema reload, `document_log` inserts should now correctly store `document_fingerprint`, `image_hash`, `unique_identifiers`. First new capture will confirm.

---

## Outstanding — Next Session

### P2 — End-to-end phone test (PENDING)
Upload the Sasol petrol slip via Smart Capture on phone. Verify:
- capture_queue new row with `document_fingerprint = composite:sasolpersequor:2024-11-19:1000`
- success screen shows expense_id + journal_entry_id
- browser console shows `[SmartCapture] Inserting capture_queue — fingerprint: composite:...`

### P3 — Anti-fraud live test (PENDING after P2)
Re-upload same receipt. Verify:
- DuplicateBanner appears (red, blocks approve)
- capture_queue row has `is_duplicate = true`
- confidence matches fingerprint level (auth = 99.9%, composite = 80%)

### Year-End Close test (PENDING)
Navigate Reports → Year-End Close. Verify FY2024 P&L loads, closing journal preview shows correct amounts, PIN confirm posts journal entries + archive row.

### Supplier Invoice PO Match (P2 of original backlog)
Supplier invoice → PO matching → stock received. Not yet started.

### WP-LOYALTY-ENGINE v2 (PENDING)
Nightly AI loyalty automation. Requires Edge Function deploy.

### Yoco Keys (PENDING — owner action)
WP-PAY S1 — Yoco online gateway.

---

## Rules Added This Session

- **PostgREST schema rule:** After adding columns via SQL (not dashboard migration), always run `NOTIFY pgrst, 'reload schema'` via Supabase MCP before testing INSERTs. Stale schema silently drops unknown columns.
- `duplicate_of_id` in capture_queue is a UUID FK — never insert a fingerprint string into it.

---

*SESSION-STATE v204 · NuAi · 08 Apr 2026*
