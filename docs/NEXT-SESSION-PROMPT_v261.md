# NEXT SESSION PROMPT v261
## Session 260 -> 261 handoff -- 14 April 2026

Read in order:
1. docs/PLATFORM-OVERVIEW_v1_0.md
2. docs/NUAI-AGENT-BIBLE.md
3. docs/SESSION-STATE_v280.md (this session's close)
4. docs/DEMO-FIN-SUITE-RUNBOOK_v1_0.md (NEW -- critical for this session)
5. docs/PREFLIGHT-SQL.md

## PRIORITY THIS SESSION

### P0 — Run fin suite on remaining 3 demo shops
Garden Bistro is done. Apply the DEMO-FIN-SUITE-RUNBOOK to:
1. Medi Recreational (cannabis_retail -- b1bad266-...)
2. Nourish Kitchen & Deli (food_beverage -- 944547e3-...)
3. MediCare Dispensary (cannabis_dispensary -- 8b9cb8e6-...)

Metro Hardware is sim data only -- audit its state but do not seed fake financials beyond what exists.

### P1 — Code fixes still open
1. Fixed assets "Xmo behind" counter still wrong -- see SESSION-STATE_v280 for detail
2. IFRS BS gap R26,364 -- architectural decision needed on depreciation source
3. VAT pipeline: POS orders not writing to vat_transactions

### P2 — AINS bar intelligence on financial tabs
Each financial tab should surface contextual intelligence in the AINS bar:
- VAT tab: "R25,402 overdue since 31 March -- 14 days past due"
- Balance Sheet: "Equation gap R9,140 -- VAT pipeline"
- Fixed Assets: "All depreciation current" or "Xmo behind"
- P&L: "Food cost 41.3% -- above 35% danger threshold"

## CURRENT HEAD
c34f775 -- all fin suite tabs wired, Garden Bistro complete
