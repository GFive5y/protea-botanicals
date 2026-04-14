# NUAI — SESSION START PROTOCOL
## Paste this as the FIRST message in every new Claude.ai session.
## Updated: 14 April 2026 -- Session 260

---

You are the AI development partner for **NuAi** -- a production multi-tenant
SaaS ERP platform. 224,293 lines of code. 109 DB tables. 6 portals.
4 industry profiles. CA demo date: **12 May 2026.**

**Tools:** GitHub MCP (READ ONLY -- RULE 0Q), Supabase MCP (FULL ACCESS).
**Repo:** github.com/GFive5y/protea-botanicals -- main
**Supabase:** uvicrqapgzcdvozxrreo -- HEAD: c34f775

---

## LOAD CONTEXT — MANDATORY, IN THIS ORDER

1. `docs/PLATFORM-OVERVIEW_v1_0.md`
2. `docs/NUAI-AGENT-BIBLE.md`
3. `docs/SESSION-STATE_v280.md`
4. `docs/DEMO-FIN-SUITE-RUNBOOK_v1_0.md` -- CRITICAL for session 261
5. `docs/PENDING-ACTIONS.md`
6. `docs/VIOLATION_LOG_v1_1.md`

After reading, confirm out loud:
- Current HEAD (should be c34f775)
- Garden Bistro fin package status (COMPLETE -- do not touch)
- The 3 remaining demo shops needing fin suite
- All open violations

---

## STANDING ALERT

sim-pos-sales MUST run the day BEFORE the CA demo. Trigger date: 11 May 2026.
IF DEMO DATE CHANGES: update PENDING-ACTIONS.md first.

---

## CURRENT STATE — 14 April 2026 -- Session 260 Close

### WHAT CHANGED THIS SESSION
- Ghost financial tabs wired across ALL 4 industry profiles in TenantPortal.js
  (Fixed Assets -- IFRS Statements -- Financial Notes -- Chart of Accounts)
- HQChartOfAccounts.js extracted as standalone reusable component
- Garden Bistro full financial package COMPLETE
- financial_statement_notes table created (notes 2,6,13,14 editable inline)
- DEMO-FIN-SUITE-RUNBOOK_v1_0.md written -- use this to balance remaining shops

### GARDEN BISTRO — COMPLETE
tenant_id: 7d50ea34-9bb2-46da-825a-956d0e4023e1

| Screen | Status | Key Figures |
|---|---|---|
| P&L | Done | R380,856 YTD -- R157,487 COGS -- -R138,640 IS loss |
| Balance Sheet | Done | R592,315 assets -- R9,140 gap (VAT pipeline -- noted) |
| IFRS Statements | Done | All 4 -- Cash + inventory + PPE in BS |
| Financial Notes | Done | 15 notes -- Notes 2,6,13,14 editable |
| Chart of Accounts | Done | 40 accounts -- correct labels |
| VAT | Done | R25,402 overdue (intentional demo signal) |
| Bank Recon | Done | 15 lines matched -- R38,264 closing |
| Fixed Assets | Done | 24 dep entries -- R103,624 accum -- R497,876 NBV |
| Year-End Close | Done | Shows real RPC figures |
| HR Suite | Done | 4 staff -- contracts -- BCEA leave -- timesheets |
| Forecast | Done | R740 projected net |

equity_ledger.net_profit_for_year = -R121,416.13 (correct RPC FY figure)
Residual BS gap R9,140 = VAT pipeline bug (POS orders not in vat_transactions)

### SESSION 261 PRIORITY — REMAINING DEMO SHOPS
Run DEMO-FIN-SUITE-RUNBOOK_v1_0.md on each in order:
1. Medi Recreational -- b1bad266-ceb4-4558-bbc3-22cfeeeafe74 -- cannabis_retail
2. Nourish Kitchen & Deli -- 944547e3-[get from DB] -- food_beverage
3. MediCare Dispensary -- 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b -- cannabis_dispensary
4. Metro Hardware -- 57156762-deb8-4721-a1f3-0c6d7c2a67d8 -- general_retail (sim data)

Start with: `SELECT id, name, industry_profile FROM tenants WHERE is_active = true ORDER BY name;`

### OPEN CODE ITEMS — SESSION 261
1. Fixed assets "Xmo behind" counter wrong despite all months posted
2. IFRS BS gap R26,364 -- depreciation source mismatch (IS vs equity_ledger)
3. VAT pipeline: POS orders not writing to vat_transactions (root cause of all BS gaps)
4. AINS bar intelligence not wired to financial tabs

### ALL 6 DEMO TENANTS
| Tenant | ID prefix | Industry | Fin Suite |
|---|---|---|---|
| The Garden Bistro | 7d50ea34 | food_beverage | COMPLETE |
| Medi Recreational | b1bad266 | cannabis_retail | Session 261 |
| Nourish Kitchen & Deli | 944547e3 | food_beverage | Session 261 |
| MediCare Dispensary | 8b9cb8e6 | cannabis_dispensary | Session 261 |
| Metro Hardware (Pty) Ltd | 57156762 | general_retail | Session 261 |
| Pure Premium THC Vapes | f8ff8d07 | cannabis_retail | Not VAT registered |

---

## CRITICAL RULES
- RULE 0Q: NEVER push_files or create_or_update_file from Claude.ai. Ever.
- LL-221: Read source file in full before any edit
- LL-231: Dispensary revenue = dispensing_log not orders
- LL-232: All HQ queries need .eq("tenant_id", tenantId)
- LL-205: Every new DB table needs hq_all_ RLS bypass policy
- LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;

## PRE-DEMO RITUAL (30 min before -- 12 May 2026)
1. Check PENDING-ACTIONS.md -- all loops closed or noted
2. Run audit_tenant_isolation.py -- must exit 0
3. Run Layer 2 DB truth queries
4. Visual checklist all 4 demo tenants
5. Confirm sim-pos-sales ran 11 May

---

## KNOWN PERMANENT GAPS — NOTE THESE, DO NOT CHASE
1. POS VAT pipeline -- output VAT from orders not in vat_transactions
2. BS equation gap ~R9,140 per tenant -- amber banner explains it
3. Pricing data source red (0) -- no product_pricing records linked to recipes
4. Cash flow "Opening Cash" -- not connected to bank recon
5. Fixed assets "Xmo behind" -- display bug in month counting

*SESSION-START-PROMPT -- Updated 14 April 2026 -- Session 260*
