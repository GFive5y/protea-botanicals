# SESSION STATE v251
## Produced: 13 April 2026 — end of session
## HEAD: `72ab6a6` (pre doc-commit — final HEAD will be the doc-commit SHA)

### CURRENT PRIORITY
CA business rescue demo — ~4 weeks away (meeting ~12 May 2026)
Next session: Metro Hardware (Store 4) — covenant breach rescue scenario

### WHAT IS DONE
- WP-ANALYTICS: all 6 modules complete (HEAD: acb007c)
- WP-DEMO-CA-RESCUE spec: docs/WP-DEMO-CA-RESCUE_v1_0.md committed (f565c94)
- Store 1 — The Garden Bistro: COMPLETE (6680c2c, a9ab90d, 50bf2c9)
  - 12 recipes + 98 lines, 160 ingredients, 18 meat_fish
  - 3,388 orders (41.3% food cost), 4 staff, leave balances
  - Income statement live, bank recon live, VAT module live
  - 14 rescue signals verified in browser
- Store 2 — Medi Recreational: COMPLETE (700ad77)
  - 186 inventory items, 95.2% AVCO gap (intentional)
  - 1,788 paid orders (6 months history)
  - 2 staff + inflection at Feb 2026, 95 expense rows
  - Loyalty cohort: 41% active (was 90%), 15 lapsed, 11 dormant
  - VAT: P3 overdue (R45,652), 3 prior periods filed
  - 10 rescue signals verified
- **Store 3 — MediCare Dispensary: COMPLETE (72ab6a6)**
  - UUID: 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b
  - 20 inventory items, 60% AVCO gap (12 items weighted_avg_cost = 0)
  - 160 dispensing_log events across Jan-Apr 2026 (~R86k/month avg)
  - 10 patients (3 with incomplete SAHPRA fields — no S21/condition)
  - 14 prescriptions (7 missing HPCSA, 8 expired but still active)
  - 1 pharmacist (Pieter van Rensburg), 18 days leave outstanding (BCEA)
  - 1 duplicate invoice flag in capture_queue (R8,400)
  - 2 VAT periods overdue (P1 + P2, zero filings)
  - 18 bank statement lines (9 unreconciled), closing balance R131,430
  - Share capital R250,000 in equity_ledger
  - Revenue via dispensing_log only (LL-231 verified)
- WP-UI-CATALOG-BAR: popover shipped (5c01914)
- DS-6 partial: HQOverview maxWidth fix (a80fd5c)
- **HQBalanceSheet.js code fixes (72ab6a6):**
  - LL-231 dispensary revenue branch (dispensing_log not orders)
  - Cash at Bank line in current assets (from bank_statement_lines)
  - Accrued OpEx included in totalLiabilities2
  - VAT Receivable rendered in current assets
  - CSV export updated
- **RLS policy fixes (applied via Supabase MCP, 13 Apr 2026):**
  - dispensing_log, patients, prescriptions — hq_all_ policies
    changed from industry_profile='operator' to is_hq_user()
  - LL-NEW-5 documents the rule

### KNOWN ISSUES (deferred)
- **Balance sheet equation checker:** `balanced2` variable uses a stale
  formula that may not account for all asset/liability/equity interactions.
  The visual line items are correct but the equation check badge may show
  false negatives. Deferred — not demo-blocking.
- HQTransfer historical AVCO corruption (LL-242 forward-fix done, pre-fix not remediated)
- Cross-tenant "View store" navigation (Phase 4b — Group Portal navigable via URL only)
- loyalty_campaigns table doesn't exist (Customer Intelligence Section 4 deferred)
- DS-6 migration debt: 19,492 lines across 4 pre-DS-6 components

### WHAT IS NEXT (in order)
1. **Metro Hardware (general_retail)**
   - Create tenant in browser: General Retail, PRO, Johannesburg
   - Complete Financial Statements Wizard immediately after creation
   - Rescue story: covenant breach risk + QR fraud alerts
   - Revenue: R340,000/month from orders (standard retail, NOT dispensing_log)
   - 847 SKUs, 47% (398 items) missing weighted_avg_cost
   - Bank covenant requires gross margin > 35% — cannot verify with AVCO gaps
   - 12 QR scan velocity anomalies on 3 premium power tool SKUs
   - 1,240 loyalty members, 43,800 points = R218,000 liability if redeemed
   - Dead stock: R89,000 in seasonal items

2. **Notification badge system (WP-NOTIFICATION-BADGES)**
   - Nav badges surfacing rescue signals across tenant portal
   - Touches PlatformBar.js (LOCKED) — requires careful planning

3. **Phase 4b — Cross-tenant navigation**
   - "View Network" button linking tenant portal to Group Portal

### TENANT REGISTRY
| Tenant | ID | Industry | Tier | Demo role |
|---|---|---|---|---|
| The Garden Bistro | 7d50ea34-9bb2-46da-825a-956d0e4023e1 | food_beverage | PRO | Store 1 rescue |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | cannabis_retail | PRO | Store 2 rescue |
| MediCare Dispensary | 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b | cannabis_dispensary | PRO | Store 3 rescue |
| Medi Can Dispensary | 2bd41eb7-1a6e-416c-905b-1358f6499d8d | cannabis_dispensary | ENTRY | Franchise anchor |
| Metro Hardware | TBD | general_retail | PRO | Store 4 rescue |
| Nourish Kitchen & Deli | [existing] | food_beverage | ENTRY | Reserve F&B |

### CRITICAL TENANT NOTES
**Garden Bistro bank_accounts:** wizard-created row `c2b93272` is canonical.

**Medi Rec bank_accounts:** `02a4bd45` is canonical (wizard-created).
22 pre-existing lines + 15 seeded = 37 total.

**MediCare Dispensary bank_accounts:** `d0000001-0001-4000-8000-000000000001`
seeded directly (wizard not run before seeding). 18 statement lines,
9 unreconciled. Opening balance R84,000, closing R131,430.

**MediCare Dispensary expenses:** categories must be system codes
(`opex`, `wages`, `capex`) not display names. Fixed 13 Apr 2026.

**MediCare Dispensary RLS:** dispensing_log, patients, prescriptions
hq_all_ policies were using non-standard `industry_profile='operator'`
check. Fixed to `is_hq_user()` on 13 Apr 2026 (LL-NEW-5).

### COMMIT CHAIN (this session)
- `72ab6a6` — HQBalanceSheet LL-231 branch + cash at bank + opex liabilities + RLS fix + LL-NEW-5
- `[this commit]` — SESSION-STATE v251 + NEXT-SESSION-PROMPT v251

### RULE SUMMARY (active rules this session)
- LL-203: product_metadata key = `weighted_avg_cost` not `cost`
- LL-205: hq_all_ policies use `is_hq_user()` (reinforced by LL-NEW-5)
- LL-206: `const { tenantId, industryProfile } = useTenant()` direct destructure
- LL-231: dispensary revenue from `dispensing_log` NOT `orders`
- LL-NEW-1: opex triggers VAT rows — always backfill period filings
- LL-NEW-2: wizard bank accounts are canonical — UPDATE not INSERT
- LL-NEW-3: user_profiles FK to auth.users — UPDATE last_purchase_at only
- LL-NEW-4: leave_balances.available is GENERATED — never INSERT it
- LL-NEW-5: hq_all_ policies must use is_hq_user() — never industry_profile='operator'
- RULE 0Q: NEVER push_files from Claude.ai. Claude Code only.

---

*SESSION-STATE v251 · 13 April 2026 · replaces SESSION-STATE_v250.md*
*Produced at session close by Claude Code*
