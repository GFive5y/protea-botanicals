# NEXT SESSION PROMPT v250
## For: MediCare Dispensary (Store 3) + Metro Hardware (Store 4)
## Date produced: 12 April 2026

## READ BEFORE ANYTHING ELSE (in order)
1. `docs/PLATFORM-OVERVIEW_v1_0.md`
2. `docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md` (full, including Addendum 3)
3. `docs/NUAI-AGENT-BIBLE.md` (all rules including LL-NEW-1 through LL-NEW-4)
4. `docs/SESSION-STATE_v250.md`
5. `docs/WP-DEMO-CA-RESCUE_v1_0.md`

## SESSION START PROTOCOL (mandatory — answer all 5 before writing code)
- **Q1:** What are we building and who uses it?
- **Q2:** What do industry leaders do here (SAP, NetSuite, Sage, Xero)?
- **Q3:** Relevant SA compliance context (SAHPRA, R638, SARS, BCEA, Companies Act s128)?
- **Q4:** Current system state and active risks?
- **Q5:** What does done look like — define browser verification checklist before coding.

---

## PRIORITY 1 — MediCare Dispensary (Store 3)

**Create tenant in browser FIRST:**
- Name: MediCare Dispensary
- Industry: Cannabis Dispensary (SAHPRA profile)
- Tier: PRO
- Location: Cape Town, Western Cape
- No starter catalogue

**Complete Financial Statements Wizard immediately:**
- Legal: MediCare Dispensary (Pty) Ltd
- Reg: 2020/112233/07
- Tax: 9156789234
- VAT: Yes, bi-monthly, invoice basis, VAT no: 4067891234
- Address: 12 Buitenkant Street, Cape Town, Western Cape, 8001

**Paste tenant UUID here after creation.** Run Step 0 schema checks before seeding:
- `SELECT COUNT(*) FROM dispensing_log WHERE tenant_id = '[new UUID]'`
- `SELECT COUNT(*) FROM prescriptions WHERE tenant_id = '[new UUID]'` (confirm table name)
- `SELECT COUNT(*) FROM inventory_items WHERE tenant_id = '[new UUID]'`
- `SELECT column_name FROM information_schema.columns WHERE table_name = 'dispensing_log'`

**CRITICAL:** LL-231 — dispensary revenue comes from `dispensing_log` NOT `orders`.
The income statement reads `dispensing_log` for revenue on cannabis_dispensary profile.
Every seeded "sale" must be an INSERT into `dispensing_log`, not `orders`.

**Rescue story — "SAHPRA compliance gaps + unknown true margin":**
- Revenue: R94,000/month (stable dispensary)
- COGS: unknown on 60% of items (weighted_avg_cost = 0)
- 3 dispensing_log entries: is_voided=false but no linked patient record
- 14 prescriptions missing dosage or duration fields
- 1 Smart Capture duplicate invoice flag (R8,400 exposure)
- 1 pharmacist with 18 days outstanding leave (BCEA exposure)
- 2 unsubmitted VAT periods

---

## PRIORITY 2 — Metro Hardware (Store 4)

**Create tenant after Store 3 is verified:**
- Name: Metro Hardware
- Industry: General Retail
- Tier: PRO
- Location: Johannesburg, Gauteng

**Rescue story — "covenant breach risk":**
- Revenue: R340,000/month
- 847 SKUs, 47% (398 items) missing `weighted_avg_cost`
- Bank covenant requires gross margin > 35% — cannot be verified with AVCO gaps
- 12 QR scan velocity anomalies on 3 premium power tool SKUs
- 1,240 loyalty members, 43,800 points = R218,000 liability if redeemed
- Dead stock: R89,000 in seasonal items

---

## DO NOT START UNTIL
- Both Step 0 schema checks are complete and reported
- Financial Statements Wizard is confirmed complete in browser
- No INSERTs until schema shapes are confirmed

---

*NEXT-SESSION-PROMPT v250 · 12 April 2026*
*Previous prompt: NEXT-SESSION-PROMPT_v249.md (superseded — delete on session start)*
