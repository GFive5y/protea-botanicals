# SESSION STATE v250
## Produced: 12 April 2026 — end of session
## HEAD: `a80fd5c` (pre doc-commit — final HEAD will be the doc-commit SHA after Step 6)

### CURRENT PRIORITY
CA business rescue demo — 4 weeks away (meeting ~12 May 2026)
Next session: MediCare Dispensary (Store 3) — SAHPRA rescue scenario

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
- WP-UI-CATALOG-BAR: ··· popover shipped (5c01914)
- DS-6 partial: HQOverview maxWidth fix (a80fd5c)
- DS-6 backlog logged: 19,492 lines across 4 components

### WHAT IS NEXT (in order)
1. **MediCare Dispensary (cannabis_dispensary)**
   - Create tenant in browser: Cannabis Dispensary, PRO, Cape Town
   - Complete Financial Statements Wizard immediately after creation
   - Rescue story: SAHPRA compliance gaps + unknown true margin
   - Revenue from dispensing_log (LL-231) NOT orders — critical difference
   - Signals: 3 dispensing records without complete patient records,
     14 prescriptions missing dosage/duration, 1 duplicate invoice
     Smart Capture flag (R8,400), 1 pharmacist with 18 days leave (BCEA)

2. **Metro Hardware (general_retail)**
   - Create tenant in browser: General Retail, PRO, Johannesburg
   - Rescue story: covenant breach risk + QR fraud alerts
   - 847 SKUs, 47% missing AVCO, bank covenant requires GP > 35%
   - 12 QR scan velocity anomalies on premium power tools
   - 1,240 loyalty members, R218,000 unburned points liability

3. **Notification badge system (WP-NOTIFICATION-BADGES)**
   - Nav badges surfacing rescue signals across tenant portal
   - Touches PlatformBar.js (LOCKED) — requires careful planning
   - Design spec needed before any code

4. **Phase 4b — Cross-tenant navigation**
   - "View Network →" button linking tenant portal to Group Portal
   - Currently navigable via URL only (/group-portal)

### TENANT REGISTRY
| Tenant | ID | Industry | Tier | Demo role |
|---|---|---|---|---|
| The Garden Bistro | 7d50ea34-9bb2-46da-825a-956d0e4023e1 | food_beverage | PRO | Store 1 rescue |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | cannabis_retail | PRO | Store 2 rescue |
| Medi Can Dispensary | 2bd41eb7-1a6e-416c-905b-1358f6499d8d | cannabis_dispensary | ENTRY | Franchise anchor |
| MediCare Dispensary | TBD | cannabis_dispensary | PRO | Store 3 rescue |
| Metro Hardware | TBD | general_retail | PRO | Store 4 rescue |
| Nourish Kitchen & Deli | [existing] | food_beverage | ENTRY | Reserve F&B |

### CRITICAL TENANT NOTES
**Garden Bistro bank_accounts:** wizard-created row `c2b93272` is canonical.
All 15 bank_statement_lines reference this UUID. Seed row deleted.

**Medi Rec bank_accounts:** `02a4bd45` is canonical (wizard-created).
22 pre-existing lines + 15 seeded = 37 total. opening_date 2025-11-01.

**Medi Rec capture_queue:** R0 garbage expense row cannot be deleted —
FK to capture_queue table. amount_zar = 0, no P&L effect. Leave it.

### COMMIT CHAIN (this session)
- `f565c94` — WP-DEMO-CA-RESCUE v1.0 spec
- `6680c2c` — Garden Bistro F&B rescue (ingredients, recipes, HACCP)
- `a9ab90d` — Garden Bistro financial layer
- `50bf2c9` — Garden Bistro fixes + LL-203 spec correction
- `5c01914` — WP-UI-CATALOG-BAR + DS-6 backlog
- `700ad77` — Medi Recreational enrichment
- `a80fd5c` — HQOverview DS-6 partial fix
- `[this commit]` — SESSION-STATE v250 + NEXT-SESSION-PROMPT v250 + NUAI-STRAT-INTEL addendum + AGENT-BIBLE LL-NEW-1..4

### RULE SUMMARY (active rules this session)
- LL-203: product_metadata key = `weighted_avg_cost` not `cost`
- LL-231: dispensary revenue from `dispensing_log` NOT `orders`
- LL-238: new features use T.* tokens
- LL-242: AVCO recalculation on transfer receive
- LL-NEW-1: opex triggers VAT rows — always backfill period filings
- LL-NEW-2: wizard bank accounts are canonical — UPDATE not INSERT
- LL-NEW-3: user_profiles FK to auth.users — UPDATE last_purchase_at only
- LL-NEW-4: leave_balances.available is GENERATED — never INSERT it
- RULE 0Q: NEVER push_files from Claude.ai. Claude Code only.

---

*SESSION-STATE v250 · 12 April 2026 · replaces SESSION-STATE_v240.md*
*Produced at session close by Claude Code*
