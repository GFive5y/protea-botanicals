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

**Primary cause:** PostgREST schema cache was stale. The anti-fraud columns added to `capture_queue` (`document_fingerprint`, `is_duplicate`, `duplicate_of_id`, `duplicate_confidence`, `duplicate_details`, `unique_identifiers`) were added via SQL but PostgREST was never notified. Every INSERT that included those columns was silently rejected.

**Secondary cause:** The 6 anti-fraud fields in the INSERT were reading from `capture` React state (which is still `null` at INSERT time because `setCapture()` is async). Fixed to read from `fnData` (the local variable holding the Edge Function response).

**Fix applied:**
1. `NOTIFY pgrst, 'reload schema'` via MCP (schema cache refresh)
2. `str_replace` in HQSmartCapture.js — all 6 fields now read from `fnData`
3. `duplicate_of_id` hardcoded to `null` (EF returns fingerprint string, not UUID FK)

---

## What Was Built

### Smart Capture Fixes (P1–P5)
- **P1 capture_queue INSERT**: fnData instead of stale capture state + PostgREST reload
- **P5 Success screen**: expense_id (truncated), journal_entry_id, "claimable" label, document fingerprint
- **P4 History tab**: SARS ✓ / Non-SARS / Duplicate pill badges with status colors
- **P5 setSuccessData**: now passes `document_fingerprint` from capture state

### HQYearEnd.js — Year-End Close Wizard (WP-FINANCIALS Phase 10)
- **Screen 1 — Summary**: 4 KPI cards (Revenue, COGS, Gross Profit, OpEx) + Net Profit/Loss hero card + journal count
- **Screen 2 — Closing Journal Preview**: Dr Revenue → Income Summary, Cr Retained Earnings (or Dr Accumulated Loss)
- **Screen 3 — Confirm & Close**: PIN entry (1234), irreversibility warning, bullet list of consequences
- **Screen 4 — Archive Report**: Archive ID, closed_at timestamp, retained earnings carried forward

**Year-End Close Process:**
1. Posts closing journal entry (`is_year_end_closing: true`)
2. Posts journal lines (Dr 4000 Revenue, Cr 3200 Retained Earnings or Dr 3300 Accumulated Loss)
3. Archives to `financial_year_archive` (net_profit, total_revenue, total_expenses, retained_earnings)
4. Locks financial year (`is_active: false`)
5. Marks `equity_ledger.year_closed = true`

**Wired into:** Both CANNABIS_RETAIL_WATERFALL (Reports) and generic waterfall (Intelligence). `renderTab` case "year-end".

---

## Outstanding
- P1: Re-test capture_queue insert on live site (upload receipt after Vercel deploy)
- P2: Supplier invoice → PO match → stock received (Smart Capture Phase 2)
- P3: Year-End Close — test full close cycle on Medi Rec tenant
- P4: WP-LOYALTY-ENGINE v2
- P5: Yoco POS keys (sk_test_ needed)

---

*SESSION-STATE v204 · NuAi · 08 Apr 2026*
