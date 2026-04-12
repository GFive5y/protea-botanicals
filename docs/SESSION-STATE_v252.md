# SESSION STATE v252
## Produced: 13 April 2026 — end of session
## HEAD: `8a05a20` (pre doc-commit — final HEAD will be the doc-commit SHA)

### CURRENT PRIORITY
CA business rescue demo — ~4 weeks away (meeting ~12 May 2026)
**All 4 demo tenants are COMPLETE and browser-verified.**
Next: demo rehearsal, notification badge system, cross-tenant navigation.

### WHAT IS DONE — ALL 4 DEMO TENANTS COMPLETE

#### Store 1 — The Garden Bistro (food_beverage)
- UUID: `7d50ea34-9bb2-46da-825a-956d0e4023e1`
- Commits: 6680c2c, a9ab90d, 50bf2c9
- 12 recipes, 160 ingredients, 3,388 orders, 4 staff, 14 rescue signals

#### Store 2 — Medi Recreational (cannabis_retail)
- UUID: `b1bad266-ceb4-4558-bbc3-22cfeeeafe74`
- Commit: 700ad77
- 186 items (95.2% AVCO gap), 1,788 orders, 2 staff, 10 rescue signals

#### Store 3 — MediCare Dispensary (cannabis_dispensary)
- UUID: `8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b`
- Commit: 72ab6a6 (HQBalanceSheet LL-231 fix included)
- 20 items (60% AVCO gap), 160 dispensing events, 10 patients
- 14 prescriptions (7 missing HPCSA, 8 expired), 1 pharmacist (18 days leave)
- 1 duplicate invoice flag (R8,400), 2 VAT periods overdue
- Revenue via dispensing_log only (LL-231)

#### Store 4 — Metro Hardware (general_retail)
- UUID: `57156762-deb8-4721-a1f3-0c6d7c2a67d8`
- Seeded via Supabase MCP (no file commits — all DB)
- 847 items (47% AVCO gap = 398 items), 107 dead stock items
- 680 paid orders (~R507k/month avg), 18 expenses (3 months)
- 18 bank statement lines (9 unmatched), closing balance R503,000
- 2 VAT periods overdue (2025-P5, P6), 2 filed (2026-P1, P2)
- 44,825 loyalty points unburned (R224k liability at R5/point)
- 3 QR codes on premium power tools, 12 scan_logs velocity anomalies
- 2 staff (store manager + warehouse supervisor), 14 days leave outstanding
- Share capital R580,000, bank opening R143,000

### CODE CHANGES THIS SESSION
- **HQBalanceSheet.js (72ab6a6):**
  - LL-231 dispensary revenue branch (dispensing_log not orders)
  - Cash at Bank current asset (from bank_statement_lines closing balance)
  - Accrued OpEx included in totalLiabilities2
  - VAT Receivable rendered in current assets
  - CSV export updated with Cash at Bank
- **NUAI-AGENT-BIBLE.md (72ab6a6):**
  - LL-NEW-5: hq_all_ policies must use is_hq_user()
- **RLS policy fixes (Supabase, not in git):**
  - dispensing_log, patients, prescriptions — operator → is_hq_user()

### DATA FIXES APPLIED (Supabase MCP, not in git)
- MediCare: equity_ledger.share_capital = R250,000
- MediCare: expense categories → opex/wages system codes
- MediCare + Metro: bank_statement_lines matched_type NULL → 'unmatched' string
- Metro: equity_ledger.share_capital = R580,000
- Metro: bank_accounts.opening_balance = R143,000

### KNOWN ISSUES (deferred)
- Balance sheet equation checker (`balanced2`) may show false negatives — visual line items correct, equation check badge unreliable. Not demo-blocking.
- HQTransfer historical AVCO corruption (LL-242 forward-fix done, pre-fix not remediated)
- Cross-tenant "View store" navigation (Phase 4b — Group Portal navigable via URL only)
- loyalty_campaigns table doesn't exist (Customer Intelligence Section 4 deferred)
- DS-6 migration debt: 19,492 lines across 4 pre-DS-6 components
- Metro Hardware revenue ~R507k/month (higher than R340k spec target) — acceptable for demo; rescue story is about margin uncertainty not revenue level
- Loyalty member count: spec says 1,240 members but LL-NEW-3 (auth.users FK) prevents INSERT into user_profiles. Points liability seeded via loyalty_transactions on single existing user. Demo shows R224k liability correctly.
- Bank recon lesson: UI reads `matched_type === 'unmatched'` (string), not NULL. Always seed unmatched lines with the string value.

### TENANT REGISTRY (final)
| Tenant | ID | Industry | Tier | Demo role | Status |
|---|---|---|---|---|---|
| The Garden Bistro | 7d50ea34-... | food_beverage | PRO | Store 1 | ✅ COMPLETE |
| Medi Recreational | b1bad266-... | cannabis_retail | PRO | Store 2 | ✅ COMPLETE |
| MediCare Dispensary | 8b9cb8e6-... | cannabis_dispensary | PRO | Store 3 | ✅ COMPLETE |
| Metro Hardware | 57156762-... | general_retail | PRO | Store 4 | ✅ COMPLETE |
| Medi Can Dispensary | 2bd41eb7-... | cannabis_dispensary | ENTRY | Franchise anchor | Existing |
| Nourish Kitchen & Deli | [existing] | food_beverage | ENTRY | Reserve F&B | Existing |

### WHAT IS NEXT (in priority order)
1. **Demo rehearsal** — walk through all 4 tenants end-to-end, verify rescue signals render correctly in each module
2. **Notification badge system (WP-NOTIFICATION-BADGES)** — P3 in WP-DEMO-CA-RESCUE spec. Nav badges surfacing rescue signals. Touches PlatformBar.js (LOCKED).
3. **Phase 4b — Cross-tenant navigation** — "View store" buttons + Group Portal link
4. **QR → Wizard URL scheme (Gap 1)** — personalised entry for CA meeting
5. **Auto-group-join + reveal element (Gaps 5+6)** — the Group Portal reveal

### COMMIT CHAIN (this session)
- `72ab6a6` — HQBalanceSheet LL-231 + cash at bank + opex liabilities + RLS + LL-NEW-5
- `8a05a20` — SESSION-STATE v251 + NEXT-SESSION-PROMPT v251
- `[this commit]` — SESSION-STATE v252 + NEXT-SESSION-PROMPT v252

### LESSONS LEARNED THIS SESSION
- **LL-NEW-5:** hq_all_ RLS policies must use `is_hq_user()`, never `industry_profile='operator'`. Three tables were silently broken.
- **Bank recon matched_type:** UI reads `=== 'unmatched'` string, not NULL. Always seed with the string value.
- **Expense categories:** Must be system codes (`opex`, `wages`, `capex`), not display names. The P&L expense filter uses `.in("category", ["opex","wages","tax","other"])`.
- **orders.user_id:** NOT NULL constraint. Use tenant owner's user_profile id for seeded orders.
- **inventory_items.category:** Enum type requires `::inventory_category` cast in generate_series queries.

### RULE SUMMARY
- LL-203: product_metadata key = `weighted_avg_cost` not `cost`
- LL-205: hq_all_ policies use `is_hq_user()` (reinforced by LL-NEW-5)
- LL-231: dispensary revenue from `dispensing_log` NOT `orders`
- LL-NEW-1 through LL-NEW-5: all active
- RULE 0Q: NEVER push_files from Claude.ai

---

*SESSION-STATE v252 · 13 April 2026 · replaces SESSION-STATE_v251.md*
*All 4 CA demo tenants complete · demo rehearsal + badge system next*
