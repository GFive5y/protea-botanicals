# SESSION 262 — START HERE
## NuAi CA Demo Prep — Financial Review Pass

Read in this order before doing anything else:
  docs/NUAI-AGENT-BIBLE.md
  docs/SESSION-STATE_v281.md
  docs/PENDING-ACTIONS.md
  docs/DEMO-FIN-SUITE-RUNBOOK_v1_0.md

Confirm you have read them by stating:
- Current HEAD (should be 8c5a512)
- All 5 tenant BS equation status
- Which 3 tenants need HR top-up
- The one remaining open UI action (Medi Rec dep)

---

## YOUR FIRST TASK THIS SESSION — FIN REVIEW

After confirming context above, the user will paste UI financial data
(screenshots and/or text dumps) from all 5 demo tenant portals.

When that data arrives, your job is to do a structured financial
review in this exact sequence:

### FOR EACH TENANT IN THIS ORDER:
1. Garden Bistro
2. Medi Recreational
3. MediCare Dispensary
4. Metro Hardware
5. Nourish Kitchen & Deli

### FOR EACH TENANT, REVIEW THESE SCREENS:
The user will paste data from some or all of these tabs:
  - P&L (Live profit and loss)
  - Balance Sheet
  - IFRS Financial Statements (all 4: IS, BS, CF, Changes in Equity)
  - VAT (YTD and current period)
  - Bank Reconciliation
  - Fixed Assets / Depreciation History
  - Expense Manager
  - Journal Entries

### WHAT TO PRODUCE FOR EACH TENANT:
Produce a structured review with these sections:

**[TENANT NAME] — FIN REVIEW**

1. BS EQUATION CHECK
   - State: Assets = R? | L+E = R? | Gap = R?
   - Status: ✅ Balanced / ⚠️ Gap — state reason
   - equity_ledger values match live BS? Y/N
   - If gap: is it the known VAT pipeline gap? Flag if new.

2. IFRS STATEMENT CHECK
   - IS: Revenue = R? | GP margin = ?% | Net = R?
   - IS anomalies: list any zero-value lines or unexpected figures
   - BS: Balances? Y/N | Gap = R? | Known or new?
   - CF: Net cash = R? | Dep add-back correct? Y/N
   - Changes in Equity: Closing equity matches BS equity? Y/N

3. VAT CHECK
   - YTD Output / Input / Net payable = R?
   - Current period filed? Y/N
   - Input VAT missing on any expenses? Y/N (flag count)
   - Any ⚠️ Data gap warnings visible?

4. BANK RECON CHECK
   - Closing balance = R?
   - Unmatched items = ? (should be 0 for all tenants after Session 261)
   - Closing balance matches BS Cash at Bank? Y/N

5. FIXED ASSETS CHECK
   - Assets on register = ? | Total cost = R? | NBV = R?
   - Dep entries count = ? (check against SESSION-STATE_v281.md)
   - "Xmo behind" warning visible? Y/N (Medi Rec only — expected)
   - Last dep posted = which month?

6. P&L CHECK
   - Revenue MTD = R? | COGS = R? | Gross margin = ?%
   - OpEx = R? | Net = R? | Net margin = ?%
   - Any data source warnings (⚠️ Pricing / COGS Recipes)?

7. ACTIONS REQUIRED
   - List any DB fixes needed (with SQL ready to run)
   - List any code fixes needed
   - List any UI actions needed
   - Rate severity: 🔴 CRITICAL (breaks demo) | 🟡 VISIBLE (CA asks)
     | 🟢 CLEAN UP (nice to have)

---

## AFTER ALL 5 TENANTS ARE REVIEWED:

Produce a CONSOLIDATED SUMMARY TABLE:

| Tenant | BS | IFRS | VAT | Bank | Fixed Assets | P&L | Blockers |
|---|---|---|---|---|---|---|---|
| Garden Bistro | ✅/⚠️ | ✅/⚠️ | ✅/⚠️ | ✅/⚠️ | ✅/⚠️ | ✅/⚠️ | list |
| Medi Rec | ... | ... | ... | ... | ... | ... | ... |
| MediCare | ... | ... | ... | ... | ... | ... | ... |
| Metro Hardware | ... | ... | ... | ... | ... | ... | ... |
| Nourish Kitchen | ... | ... | ... | ... | ... | ... | ... |

Then produce a PRIORITISED ACTION PLAN:
  🔴 CRITICAL — fix before anything else (list with SQL/code)
  🟡 VISIBLE — fix this session (list with SQL/code)
  🟢 CLEAN UP — fix if time allows (list)

Then ask: "Ready to start fixing — which tenant first?"

---

## CONTEXT YOU NEED — KNOWN ACCEPTABLE GAPS

These are known and pre-explained. Do NOT flag as critical:
- BS gap R5,617 on Nourish (VAT pipeline — amber banner explains)
- BS gap R9,140 on Garden Bistro (VAT pipeline — amber banner explains)
- MediCare IFRS BS gap R253,723 (journal_lines + expenses double-count)
- Metro Hardware IFRS BS gap R362,311 (accrued OpEx in main BS only)
- Medi Rec IFRS BS gap R1,466.78 (IS vs equity_ledger timing)
- Medi Rec Fixed Assets "Xmo behind" counter (UI dep needed — known)
- ⚠️ Pricing data source red on all tenants (no product_pricing linked)
- ⚠️ COGS Recipes red on dispensary (uses dispensing_log not recipes)
- customer_messages 400 in logs (table not yet created — known)

Anything NOT in this list that shows a gap or error = flag it.

---

## SUPABASE ACCESS

Project: uvicrqapgzcdvozxrreo
You have full read/write access via Supabase MCP.
Secret key: production_2026_04 (rotated 14 Apr 2026 — VL-012)

Before any SQL fix: read SESSION-STATE_v281.md equity_ledger table
to confirm current share_capital and net_profit values per tenant.
Do not overwrite unless you are recalibrating after an asset change.

---

## RULES — ABSOLUTE

- RULE 0Q: NEVER push_files or create_or_update_file from Claude.ai
- LL-246: NEVER git add -A in Claude Code. Always specific files.
- LL-221: Read source file in full before any edit
- LL-231: MediCare revenue = dispensing_log × sell_price (not orders)
- LL-232: All HQ queries need .eq("tenant_id", tenantId)
- LL-NEW-2: Wizard bank_accounts rows are canonical — never add a second

*SESSION-262-START-PROTOCOL.md — Created 14 April 2026*
