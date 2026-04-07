# SESSION-STATE v206 — 08 Apr 2026 (Full Extended)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- Live URL: protea-botanicals-git-main-gfive5ys-projects.vercel.app

---

## Full Session Commit Chain

| SHA | Description |
|---|---|
| `0b2735a` | P1 capture_queue fnData fix |
| `51dda28` | P4/P5/P6 badges + success IDs + HQYearEnd |
| `36dd667` | CODEBASE_FACTS v204 |
| `458ca34` | SESSION-STATE v204 |
| `4523c5d` | HQYearEnd crash fix (financial_year TEXT) |
| `decf5b7` | Stock receipt flow (receive-from-capture EF) |
| `6ae49b0` | SESSION-STATE v205 + CODEBASE_FACTS |
| `fb49575` | Loyalty-AI Tab 8 Run Now button |
| `daee69b` | Fix TDZ crash (handleRunAiNow after showToast) |

---

## MCP Actions (no git commit)

- PostgREST schema reload: `NOTIFY pgrst, 'reload schema'`
- Migration: user_profiles loyalty AI columns (churn_risk_score, last_purchase_at,
  monthly_visit_count, monthly_spend_zar, category_flags)
- receive-from-capture EF v1 deployed (ACTIVE, verify_jwt=false)
- loyalty-ai EF v1 deployed (ACTIVE, verify_jwt=false)

---

## EF Status (all deployed)

| EF | Version | Notes |
|---|---|---|
| process-document | v2.1 | Anti-fraud + fingerprint + proposed_updates |
| auto-post-capture | v1 | Expense + journal (Dr expense Cr bank) |
| receive-from-capture | v1 | Stock receipt + AVCO + Dr 12000 Cr 20000 |
| loyalty-ai | v1 | 5 jobs: churn, birthday, expiry, stock_boost, weekly_brief |

---

## What Was Built This Extended Run

### receive-from-capture EF v1
- Handles receive_delivery_item (item_id resolved)
- Handles create_purchase_order items (creates PO, best-effort name match)
- Handles create_inventory_item + create_stock_movement pairs
- AVCO: (old_qty × old_avco + recv_qty × unit_cost) / (old_qty + recv_qty)
- Journal: Dr 12000 Inventories / Cr 20000 Trade Payables
- Idempotent: returns early if capture_queue already approved

### HQSmartCapture.js — stock receipt flow
- isStockCapture detects delivery_note/supplier_invoice with proposed_updates
- "Stock to Receive" panel with matched/unmatched badges
- Navy "Receive Stock + Post to Books" vs green "Approve & Post"
- Stock-specific success screen: items_received/skipped/PO/journal

### loyalty-ai EF v1 (5 jobs)
1. Churn Scoring: churn_risk_score per user (0-1), updates user_profiles
2. Churn Rescue: 25pts + loyalty_ai_log for Gold+ silent ≥21 days (60-day dedup)
3. Birthday Bonuses: pts_birthday_bonus in birth month (annual dedup)
4. Point Expiry: marks is_expired=true, deducts from loyalty_points
5. Stock-Boost Suggestions: 0-velocity items → stock_boost_suggestion in loyalty_ai_log
Bonus: Weekly Brief (Mondays only) — health score + programme stats

### HQLoyalty.js Tab 8 AI Engine
- "⚡ Run Now" button invokes loyalty-ai EF for this tenant
- Green ACTIVE badge + status indicator
- Result toast: "Churn: N scored, N rescued · Stock boosts: N"
- AI Actions Feed auto-refreshes after run

---

## DB State
capture_queue:     4 rows (3 with fingerprints, 1 is_duplicate=true)
stock_movements:   existing + new rows created by receive-from-capture
loyalty_ai_log:    populated after first Run Now
user_profiles:     1 Medi Rec user (loyalty AI columns now added)
loyalty_config:    ai_churn_rescue_enabled=true, ai_stock_boost_enabled=true

## Schema: New Columns Added
```sql
user_profiles: churn_risk_score NUMERIC, last_purchase_at TIMESTAMPTZ,
               monthly_visit_count INT, monthly_spend_zar NUMERIC,
               category_flags JSONB
```

---

## Rules Added This Session

- R-TDZ-01: useCallback that references another useCallback must be declared
  AFTER the referenced one. const has a TDZ — order in component body = exec order.
  NEVER place a callback that calls showToast before showToast's useCallback.

- R-PGRST-01: After adding columns via raw SQL (not dashboard migration),
  always NOTIFY pgrst, 'reload schema' before testing INSERTs.

- R-FY-01: journal_entries.financial_year is TEXT ("FY2024", "FY2026").
  No financial_year table exists. No financial_year_id UUID FK anywhere.

---

## Outstanding — Next Session

1. Live test loyalty-ai Run Now — open HQ Loyalty → AI Engine → click ⚡ Run Now
   → verify loyalty_ai_log populated, toast shows churn + stock boost counts
2. Live test receive-from-capture — photograph supplier invoice with stock items,
   confirm stock_movements created + Dr 12000 Cr 20000 journal
3. WP-LOYALTY-ENGINE: monthly_visit_count + monthly_spend_zar population
   (requires checkout flow to write these fields — streak evaluation blocked until then)
4. pg_cron setup — schedule loyalty-ai at 2am nightly:
   SELECT cron.schedule('loyalty-ai-nightly', '0 2 * * *',
     $$SELECT net.http_post(url:='https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1/loyalty-ai',
     headers:='{"Content-Type":"application/json"}'::jsonb,
     body:='{"jobs":["churn","birthday","expiry","stock_boost","weekly_brief"]}'::jsonb) AS request_id;$$);
5. Yoco keys (owner action — WP-PAY S1 unblocked once keys received)
6. Year-End Close live test: Reports → Year-End Close → FY2026 P&L → full close

---

*SESSION-STATE v206 · NuAi · 08 Apr 2026 Extended*
