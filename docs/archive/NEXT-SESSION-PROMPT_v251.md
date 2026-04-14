# NEXT SESSION PROMPT v251
## For: Metro Hardware (Store 4 — general_retail)
## Date produced: 13 April 2026

## READ BEFORE ANYTHING ELSE (in order)
1. `docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md` (full, including all addendums)
2. `CLAUDE.md` (repo root)
3. `docs/NUAI-AGENT-BIBLE.md` (all rules including LL-NEW-1 through LL-NEW-5)
4. `docs/SESSION-STATE_v251.md`
5. `docs/WP-DEMO-CA-RESCUE_v1_0.md`

## SESSION START PROTOCOL (mandatory — answer all 5 before writing code)
- **Q1:** What are we building and who uses it?
- **Q2:** What do industry leaders do here (SAP, NetSuite, Sage, Xero)?
- **Q3:** Relevant SA compliance context (SARS, BCEA, Companies Act s128)?
- **Q4:** Current system state and active risks?
- **Q5:** What does done look like — define browser verification checklist before coding.

---

## PRIORITY 1 — Metro Hardware (Store 4)

**Create tenant in browser FIRST:**
- Name: Metro Hardware
- Industry: General Retail
- Tier: PRO
- Location: Johannesburg, Gauteng
- No starter catalogue

**Complete Financial Statements Wizard immediately:**
- Legal: Metro Hardware (Pty) Ltd
- Reg: 2019/445566/07
- Tax: 9234567890
- VAT: Yes, bi-monthly, invoice basis, VAT no: 4098765432
- Address: 42 Commissioner Street, Johannesburg, Gauteng, 2001

**Paste tenant UUID here after creation.** Run Step 0 schema checks before seeding:
- `SELECT COUNT(*) FROM inventory_items WHERE tenant_id = '[UUID]'`
- `SELECT COUNT(*) FROM orders WHERE tenant_id = '[UUID]'`
- `SELECT id, is_primary FROM bank_accounts WHERE tenant_id = '[UUID]'`
- `SELECT * FROM tenant_config WHERE tenant_id = '[UUID]'`

**Revenue comes from `orders.total` (standard retail, NOT dispensing_log).**
LL-231 does NOT apply to general_retail. Use `status = 'paid'` filter.

**Rescue story — "covenant breach risk":**
- Revenue: R340,000/month
- 847 SKUs, 47% (398 items) missing `weighted_avg_cost`
- Bank covenant requires gross margin > 35% — cannot be verified with AVCO gaps
- 12 QR scan velocity anomalies on 3 premium power tool SKUs
- 1,240 loyalty members, 43,800 points = R218,000 liability if redeemed
- Dead stock: R89,000 in seasonal items (last_movement_at > 120 days)
- 6 items selling at a loss (sell_price < weighted_avg_cost)

**Seeding lessons from Stores 1-3:**
- LL-203: order_items.product_metadata must use key `weighted_avg_cost` not `cost`
- LL-NEW-1: opex INSERTs trigger vat_transactions — plan VAT periods before seeding
- LL-NEW-2: check bank_accounts BEFORE inserting — wizard row is canonical
- LL-NEW-4: leave_balances.available is GENERATED — never INSERT it
- LL-NEW-5: if any new tables need hq_all_ policies, use `is_hq_user()`
- Expense categories must be system codes: `opex`, `wages`, `capex` (not display names)

---

## DO NOT START UNTIL
- Step 0 schema checks are complete and reported
- Financial Statements Wizard is confirmed complete in browser
- No INSERTs until schema shapes are confirmed

---

*NEXT-SESSION-PROMPT v251 · 13 April 2026*
*Previous prompt: NEXT-SESSION-PROMPT_v250.md (superseded — delete on session start)*
