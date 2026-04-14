# NEXT SESSION PROMPT v252
## For: Demo rehearsal + notification badge system
## Date produced: 13 April 2026

## READ BEFORE ANYTHING ELSE (in order)
1. `docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md` (full, including all addendums)
2. `CLAUDE.md` (repo root)
3. `docs/NUAI-AGENT-BIBLE.md` (all rules including LL-NEW-1 through LL-NEW-5)
4. `docs/SESSION-STATE_v252.md`
5. `docs/WP-DEMO-CA-RESCUE_v1_0.md`

## SESSION START PROTOCOL (mandatory — answer all 5 before writing code)
- **Q1:** What are we building and who uses it?
- **Q2:** What do industry leaders do here?
- **Q3:** Relevant SA compliance context?
- **Q4:** Current system state and active risks?
- **Q5:** What does done look like — define browser verification checklist before coding.

---

## ALL 4 DEMO TENANTS ARE COMPLETE

| Store | UUID | Industry | Rescue story |
|---|---|---|---|
| The Garden Bistro | 7d50ea34-9bb2-46da-825a-956d0e4023e1 | food_beverage | Negative margin dishes, HACCP gaps |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | cannabis_retail | 95% AVCO gap, churn, VAT overdue |
| MediCare Dispensary | 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b | cannabis_dispensary | SAHPRA gaps, unknown margin, BCEA |
| Metro Hardware | 57156762-deb8-4721-a1f3-0c6d7c2a67d8 | general_retail | Covenant breach, QR fraud, dead stock |

Group Portal login: medican@nuai.dev / MediCan2026! → /group-portal

---

## PRIORITY 1 — Demo rehearsal
Walk through each tenant in the browser and verify:
- Income statement shows revenue and expense data
- Smart Catalog shows AVCO gaps and dead stock
- Bank reconciliation shows unmatched lines
- VAT module shows overdue periods
- HR shows outstanding leave
- Smart Capture shows duplicate flags (MediCare)
- QR scan logs show velocity anomalies (Metro)
- Group Portal shows all 4 stores in Network Intelligence

## PRIORITY 2 — Notification badge system (WP-NOTIFICATION-BADGES)
**This is P3 in the WP-DEMO-CA-RESCUE spec — the highest-impact new feature.**

Nav badges surfacing rescue signals across the tenant portal.
Touches PlatformBar.js (LOCKED — read before touching).

Intelligence scan on tenant portal load:
- Finance: VAT unsubmitted, net loss, bank recon unreconciled
- Stock: critical restock, AVCO gaps > 30%
- Compliance: overdue entries, missing records
- Customers: churn rate > 50%, zero redemptions
- HR: unresolved leave, timesheet gaps

**The badge is earned by data — never hardcoded.**

## PRIORITY 3 — Phase 4b cross-tenant navigation
"View store" buttons in Group Portal → switch tenant context.
Read `src/services/tenantService.js` (LL-221) before any code.

## PRIORITY 4 — QR → Wizard URL scheme (Gap 1)
Personalised entry: `/setup?name=John&session=CA-RESCUE-2026`

---

## SEEDING LESSONS (apply to any future tenant)
- LL-203: order_items.product_metadata key = `weighted_avg_cost`
- LL-NEW-1: opex INSERTs trigger vat_transactions — plan periods first
- LL-NEW-2: wizard bank_accounts are canonical — check before INSERT
- LL-NEW-3: user_profiles FK to auth.users — cannot INSERT loyalty members
- LL-NEW-4: leave_balances.available is GENERATED — never INSERT
- LL-NEW-5: hq_all_ policies must use is_hq_user()
- Expense categories: system codes only (`opex`, `wages`, `capex`)
- Bank recon: matched_type = 'unmatched' string (not NULL)
- orders.user_id: NOT NULL — use tenant owner's user_profile id
- inventory_items.category: requires `::inventory_category` cast

---

*NEXT-SESSION-PROMPT v252 · 13 April 2026*
*Previous prompt: NEXT-SESSION-PROMPT_v251.md (superseded — delete on session start)*
*All 4 demo tenants complete · demo rehearsal + badge system next*
