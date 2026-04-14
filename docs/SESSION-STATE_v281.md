# SESSION STATE v281 — Session 261 Close
## Date: 15 April 2026 · HEAD: 91719e5

---

## WHAT CHANGED THIS SESSION (261)

### Anomaly Audit — All 4 Remaining Demo Tenants
Full financial data audit across Medi Recreational, Nourish Kitchen & Deli,
MediCare Dispensary, Metro Hardware (Pty) Ltd. 8 anomalies found and resolved.

### Supabase Data Fixes (all verified live)
| Fix | Detail |
|---|---|
| Duplicate VAT number | Metro Hardware corrected 4123456789 → 4987654321 |
| Medi Rec equity_ledger | net_profit_for_year 102,018.88 → 107,485.66 (matches IFRS IS) |
| Nourish Kitchen April dep | 3 entries inserted (period_month='4', 2026) + fixed_assets register updated |
| Nourish Kitchen April expenses | 6 expenses added: rent R22k, wages R38k, utils R3.8k, ingredients R9.2k, packaging R1.8k, software R500 |
| Nourish Kitchen journals | OPEX-2026-03 (R76,000 DR=CR), DEP-FY2026 (R1,513.89 DR=CR), OPEX-2026-04 (R75,300 DR=CR) — all posted with balanced lines |
| Medi Rec stale journals | 314859 ×2 and 314959 (2022/2024 auto-captures) → reversed |
| Bank recon MediCare | 9 unmatched lines categorised (7 expense, 2 order) → 0 unmatched |
| Bank recon Metro Hardware | 9 unmatched lines categorised (8 expense, 1 order) → 0 unmatched |
| Bank recon Medi Rec | 8 null/unmatched lines resolved → 0 unmatched |
| Bank recon Nourish Kitchen | Already 0 unmatched — confirmed |

### Code Fixes Landed (CC-01 through CC-04 · commit 91719e5)
| Ref | File | Fix |
|---|---|---|
| CC-01 | HQFixedAssets.js | monthsBehind() rewritten — compares MAX(period_year×12+period_month) from posted dep entries vs last complete calendar month. No longer stale after all months posted. |
| CC-02 | HQFinancialStatements.js | CF depreciation add-back already reads depreciation_entries as primary source. No journal-first path. Verified in place. No change required. |
| CC-03 | HQFinancialNotes.js | Note 4 now branches on industryProfile. Dispensary reads dispensing_log, reports "Dispensing (N events)" row. |
| CC-04 | HQFinancialStatements.js | IFRS BS nets output vs input VAT. vatNetPayable computed signed. vatReceivable in current assets when negative. vatLiability in liabilities when positive. |

---

## DEMO TENANT STATUS — 15 April 2026

| Tenant | Industry | VAT No | Fin Suite | Bank Recon | equity_ledger net_profit | BS Gap |
|---|---|---|---|---|---|---|
| The Garden Bistro | food_beverage | (demo) | ✅ COMPLETE | ✅ 0 unmatched | −R121,416.13 | R9,140 (VAT pipeline) |
| Medi Recreational | cannabis_retail | 4123456789 | ✅ COMPLETE | ✅ 0 unmatched | R107,485.66 | ~R5,101 (VAT pipeline) |
| Nourish Kitchen & Deli | food_beverage | 4345678912 | ✅ COMPLETE | ✅ 0 unmatched | −R38,552.17 | R5,617 (VAT pipeline) |
| MediCare Dispensary | cannabis_dispensary | 4067891234 | ✅ COMPLETE | ✅ 0 unmatched | −R418,979.00 | R0 (BS module balances; IFRS IS gap R76,906 — deferred) |
| Metro Hardware (Pty) Ltd | general_retail | 4987654321 | ✅ COMPLETE | ✅ 0 unmatched | −R196,842.41 | R0 (BS module balances; IFRS IS gap R362,311 — deferred) |
| Pure Premium THC Vapes | cannabis_retail | not VAT reg | No fin suite needed | — | — | — |

### Nourish Kitchen — Exact Figures (post session-261 enrichment)
- Expenses: 12 rows · R151,300 total
- Journals: 4 posted (SEED-OPEN-001, OPEX-2026-03, DEP-FY2026, OPEX-2026-04)
- Fixed assets: 3 assets · PPE cost R129,000 · Accum dep R3,027.78 · NBV R125,972.22
- Depreciation: March + April both posted for all 3 assets (6 rows total)
- Monthly dep charge: R1,513.89 (FA-NK-001 R708.33 + FA-NK-002 R500.00 + FA-NK-003 R305.56)

---

## OPEN ITEMS — SESSION 262

### P0 — Verify CC-01 through CC-04 in Live UI
Action: Open each affected screen in incognito (Vercel Ready on 91719e5 confirmed):
1. Any tenant Fixed Assets → confirm 0 "Xmo behind" warnings on fully-posted assets (CC-01)
2. MediCare IFRS Statements → Income Statement → confirm dispensing revenue shown, not R0 (CC-03)
3. Any tenant IFRS Balance Sheet → confirm VAT shows in correct section (asset vs liability) (CC-04)
4. Any tenant IFRS Cash Flow → confirm depreciation add-back > 0 for tenants with dep entries (CC-02)
Protocol: incognito only after Vercel "Ready" — LL-214.

### P1 — Open Loops (see PENDING-ACTIONS.md for full detail)
- LOOP-010: Medi Rec Run Depreciation — UI must step through each missing month per asset
- LOOP-011: All 5 tenants IFRS Statements → Mark Reviewed + Auditor Sign-Off (20 statements total)
- LOOP-012: HR top-up — Medi Rec +2 staff, MediCare +1 staff, Metro Hardware +2 staff
- LOOP-014: MediCare IFRS IS revenue — verify CC-03 in prod (incognito test per LL-214)

### P2 — Known Structural Gaps (post-demo work, do not chase before 12 May)
- POS VAT pipeline: output VAT from orders not writing to vat_transactions
- MediCare/Metro IFRS IS vs equity_ledger profit source mismatch — architectural fix needed
- Cash flow opening balance not wired to bank recon
- Fixed assets "Xmo behind" CC-01 fixes display — verify in UI before marking closed

### P3 — Owner Actions
- Run sim-pos-sales on 11 May 2026 for Metro Hardware + Medi Recreational (STANDING ALERT)
- Delete trigger-sim-nourish EF (throwaway one-shot)

---

## KEY SCHEMA FACTS LEARNED THIS SESSION (append to agent knowledge)

### depreciation_entries column types (confirmed live)
- period_month: TEXT (stores '3', '4' etc — NOT integer)
- period_year: integer
- depreciation, accum_dep_after, nbv_after: numeric
- posted_at: timestamptz
TRAP: period_month = 4 (integer literal) will fail with "operator does not exist: text = integer"
Always quote: period_month = '4'

### bank_statement_lines.matched_type values in use
'expense' · 'order' · 'other' · 'unmatched' · null (treated as unmatched by UI)
Categorise via UPDATE SET matched_type = 'expense'|'order'|'other', matched_at = NOW()

### equity_ledger drift pattern
net_profit_for_year is manually maintained and can drift from the IFRS IS calculation.
IFRS IS recalculates from journals/expenses. equity_ledger stores a snapshot.
When they diverge: BS module uses equity_ledger (may show ✓ balanced);
IFRS BS uses IFRS IS profit (may show gap). Small deltas → fix equity_ledger.
Large deltas (MediCare R76k, Metro R362k) → architectural investigation post-demo.
Safe fix pattern: UPDATE equity_ledger SET net_profit_for_year = [IFRS IS figure]
when delta < R10,000 and IFRS IS figure comes from verified journal/expense data.

### VAT number uniqueness
All tenant_config.vat_number values must be unique across all tenants.
A CA reviewer will spot duplicate VAT numbers immediately.
Verify before every demo: SELECT vat_number, COUNT(*) FROM tenant_config GROUP BY vat_number HAVING COUNT(*) > 1;
Should return 0 rows.

---

## PRE-DEMO RITUAL (30 min before — 12 May 2026 09:30)

1. `SELECT vat_number, COUNT(*) FROM tenant_config GROUP BY vat_number HAVING COUNT(*) > 1;` → must return 0 rows
2. `SELECT name FROM tenants t JOIN bank_statement_lines bsl ON bsl.tenant_id = t.id WHERE (bsl.matched_type IS NULL OR bsl.matched_type = 'unmatched') GROUP BY name;` → must return 0 rows
3. Run audit_tenant_isolation.py → must exit 0
4. Visual checklist in incognito: P&L → Balance Sheet → Journals → VAT → Fixed Assets → Bank Recon on each of 5 tenants
5. Confirm sim-pos-sales ran 11 May (check stock_movements table for recent sale_pos entries)
6. Confirm HEAD matches expected commit — no uncommitted changes

---

## COMMIT LOG — SESSION 261

| SHA | What |
|---|---|
| 91719e5 | CC-01 HQFixedAssets monthsBehind fix · CC-03 HQFinancialNotes dispensary branch · CC-04 IFRS BS VAT net fix · PENDING-ACTIONS.md updated |
| [SB] | Metro Hardware VAT number corrected to 4987654321 in tenant_config |
| [SB] | Medi Rec equity_ledger.net_profit_for_year updated to 107,485.66 |
| [SB] | Nourish Kitchen April depreciation entries + fixed_assets register |
| [SB] | Nourish Kitchen April expenses (6 rows) + journals (3 headers + lines) |
| [SB] | Medi Rec stale journals 314859/314959 → reversed |
| [SB] | Bank recon: MediCare 9 lines, Metro Hardware 9 lines, Medi Rec 8 lines → all categorised |
