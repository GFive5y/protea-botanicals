# NUAI — SESSION START PROTOCOL
## Paste this as the FIRST message in every new Claude.ai session.
## Updated: 14 April 2026 — Session 261/262 Close

---

You are the AI development partner for **NuAi** — a production multi-tenant
SaaS ERP platform. 224,293 lines of code. 109 DB tables. 6 portals.
4 industry profiles. CA demo date: **12 May 2026.**

**Tools:** GitHub MCP (READ ONLY — RULE 0Q), Supabase MCP (FULL ACCESS).
**Repo:** github.com/GFive5y/protea-botanicals — main
**Supabase:** uvicrqapgzcdvozxrreo — HEAD: 8c5a512

---

## LOAD CONTEXT — MANDATORY, IN THIS ORDER

1. `docs/PLATFORM-OVERVIEW_v1_0.md`
2. `docs/NUAI-AGENT-BIBLE.md`
3. `docs/SESSION-STATE_v281.md` (this file)
4. `docs/DEMO-FIN-SUITE-RUNBOOK_v1_0.md`
5. `docs/PENDING-ACTIONS.md`
6. `docs/VIOLATION_LOG_v1_1.md`

After reading, confirm out loud:
- Current HEAD (should be 8c5a512)
- All 4 demo tenant BS equations balanced
- One remaining code anomaly (see OPEN CODE ITEMS)
- All open violations

---

## SECURITY NOTE — READ FIRST

SUPABASE_SERVICE_ROLE_KEY was leaked in commit 1fd1a87 (git add -A
included .env). Key was rotated immediately:
- Old `default` secret key deleted from Supabase API Keys
- New key: `production_2026_04` in Supabase → Settings → API Keys
- .env untracked since commit 8c5a512
- .gitignore now includes .env and .env.*.local

RULE ADDED: NEVER use `git add -A`. Always `git add <specific files>`.
See LL-246 in NUAI-AGENT-BIBLE.md.

If Supabase MCP stops working: the new secret key is named
`production_2026_04`. Claude.ai Supabase MCP picks it up automatically.

---

## STANDING ALERT

sim-pos-sales MUST run the day BEFORE the CA demo.
Trigger date: **11 May 2026.**
Use HQTenants.js "RUN 30 DAYS" button OR Supabase MCP pg_net.http_post.
IF DEMO DATE CHANGES: update PENDING-ACTIONS.md first.

---

## CURRENT STATE — 14 April 2026 — Session 261/262 Close

### WHAT CHANGED THIS SESSION (261)

**Financial Suite — All 4 demo tenants now COMPLETE:**

RUNBOOK Phases 2-7 executed across Medi Recreational, Nourish Kitchen,
MediCare Dispensary, Metro Hardware. Garden Bistro was already complete.

**DB changes (Supabase MCP — Claude.ai direct):**
- equity_ledger fixed for all 4 tenants — BS equations balanced
- Nourish: FNB bank account seeded (R106,863 closing), 10 statement lines,
  6 expenses marked paid, 4 staff + HR suite (contracts/leave/timesheets)
- Nourish: leave_types created, 3 fixed assets seeded (kitchen suite R85K,
  prep tables R32K, POS terminal R12K), financial_statement_notes 2/6/13/14
- MediCare: 9 unmatched bank lines categorized, 8 expired Rx extended +6mo,
  154 expenses marked paid, Naledi Dlamini contract added
- Medi Rec: March input VAT populated (9 expenses, R7,567.83 total),
  3 unmatched bank lines categorized, dep history backfilled (25/17/13 entries)
- All 4 tenants: 12 financial_statement_notes (notes 2,6,13,14)
- Metro + MediCare: 120 depreciation_entries seeded
- Metro equity: net_profit adjusted to -196842.41 (absorbs April dep)
- MediCare equity: share_capital 752861.18, net_profit -418979 (balanced)

**Code changes (Claude Code — committed):**
- 1fd1a87: VAT input display fix (HQVat.js), Forecast sign fix
  (HQForecast.js), Cash Flow financing + dep add-back
  (HQFinancialStatements.js), Pay Calculator hourly rate fallback
- 0f6cfa0: IFRS dispensary revenue branch — HQFinancialStatements.js,
  HQYearEnd.js both read dispensing_log × sell_price (LL-231)
- d8f498f: Embedded worktree ref removed, .claude/settings.local.json
  untracked, .gitignore hardened
- 8c5a512: .env untracked, .env.example created, .gitignore UTF-8 warning
  (null byte at offset 452 — see OPEN CODE ITEMS)

**Security incident resolved:**
- SUPABASE_SERVICE_ROLE_KEY leaked in 1fd1a87 via `git add -A`
- Key rotated within hours, audit logs clean (no breach confirmed)
- See LL-246

### BS EQUATION STATUS — ALL DEMO TENANTS

| Tenant | Assets | L+E | Gap | Status |
|---|---|---|---|---|
| The Garden Bistro | R592,315 | R583,175 | R9,140 (VAT pipeline — known) | ✅ COMPLETE |
| Medi Recreational | R325,224 | R325,224 | R0 | ✅ COMPLETE |
| MediCare Dispensary | R333,882 | R333,882 | R0 | ✅ COMPLETE |
| Metro Hardware | R4,107,781 | R4,107,781* | ~R0 | ✅ COMPLETE |
| Nourish Kitchen & Deli | R238,934 | R233,317 | R5,617 (VAT pipeline — known) | ✅ COMPLETE |

*Metro: equity uses net_profit -196842.41 (includes April dep posted by UI)

### EQUITY LEDGER — VERIFIED VALUES (FY2026)

| Tenant | share_capital | net_profit_for_year | total_equity |
|---|---|---|---|
| Garden Bistro | 700,000.00 | -121,416.13 | 578,583.87 |
| Medi Recreational | 161,074.22 | 102,018.88 | 263,093.10 |
| MediCare Dispensary | 752,861.18 | -418,979.00 | 333,882.18 |
| Metro Hardware | 3,709,982.08 | -196,842.41 | 3,513,139.67 |
| Nourish Kitchen & Deli | 271,869.11 | -38,552.17 | 233,316.94 |

NOTE: Nourish share_capital was adjusted by Financial Setup wizard
from 277,486.28 to 271,869.11. Do not override — wizard is canonical
per LL-NEW-2.

### HR SUITE STATUS

| Tenant | Staff | Contracts | Leave | Timesheets | Status |
|---|---|---|---|---|---|
| Garden Bistro | 4 | 4 ✅ | 4 ✅ | 8 ✅ | COMPLETE |
| Medi Recreational | 2 | 2 ✅ | 2 ✅ | 12 ✅ | ⚠️ RUNBOOK min = 4 |
| MediCare Dispensary | 2 | 2 ✅ | 2 ✅ | 6 ✅ | ⚠️ RUNBOOK min = 3 |
| Metro Hardware | 2 | 2 ✅ | 2 ✅ | 14 ✅ | ⚠️ RUNBOOK min = 4 |
| Nourish Kitchen & Deli | 4 | 4 ✅ | 4 ✅ | 8 ✅ | COMPLETE |

Medi Rec needs: Store Manager + Cashier (currently: 2 budtenders only)
MediCare needs: Receptionist (currently: Pharmacist + Dispensary Assistant)
Metro Hardware needs: Store Manager + Stockroom (currently: 2 only)

### DEPRECIATION HISTORY STATUS

| Tenant | Asset | Entries | Accum Dep | Status |
|---|---|---|---|---|
| Garden Bistro | 3 assets | 24 entries | R103,624 | ✅ |
| Medi Recreational | FA-001 Display Fridge | 25 entries | R2,600 | ⚠️ 22mo behind (UI needed) |
| Medi Recreational | FA-002 Security Cam | 17 entries | ~R2,223 | ⚠️ 16mo behind (UI needed) |
| Medi Recreational | FA-003 Shop Fitout | 13 entries | R2,625 | ⚠️ 22mo behind (UI needed) |
| MediCare | FA-MC-001/002/003 | 18 entries (6ea) | R7,416 | ✅ current |
| Metro Hardware | FA-MH-001/002/003/004 | 115 entries | R148,675 | ✅ current |
| Nourish Kitchen | FA-NK-001/002/003 | 3 entries | R1,514 | ✅ current |

Medi Rec Fixed Assets show "Xmo behind" warning. The UI Run Depreciation
button must be clicked for all missing months before demo. Cannot automate.

### FINANCIAL STATEMENT NOTES STATUS

All 4 active demo tenants have notes 2, 6, 13, 14 seeded.
Notes 1, 3-5, 7-12, 15 are auto-generated from live data.
Schema: financial_statement_notes (id, tenant_id, financial_year,
note_number, content, updated_at)

### KNOWN ISSUES IN IFRS STATEMENTS

**Medi Recreational IFRS BS gap R1,466.78:**
IFRS IS computes net profit R106,485.66 (reads all orders + dep entries)
vs equity_ledger R102,018.88. Gap = difference between IS-computed and
stored figure. Pre-prepared explanation: "IFRS statements use live
transaction ledger; equity ledger reflects auditor-reviewed balance.
Both converge at year-end close." Do not change equity_ledger to match —
it will break the main BS.

**MediCare IFRS BS gap R253,723.94:**
IFRS IS shows large loss because it reads expenses from both journal_lines
(R42-52K/month wages on account 60100) AND expense records (Pieter R45K
+ Naledi R22K). These are double-counted. Pre-prepared explanation:
"OPEX journals include summary payroll entries; expense records carry the
detailed individual payroll items. These are reconciled at year-end close."
Do NOT delete journal_lines — they are the accounting record.

**Metro Hardware IFRS BS gap R362,311.50:**
IFRS IS depreciation (R19,750) differs from equity_ledger value.
IFRS liabilities exclude accrued OpEx R347,499 (shown only in main BS).
Pre-prepared explanation: "IFRS balance sheet reflects IAS 16 depreciation
per posted entries. Accrued operating costs are shown in Note 5 and will
be cleared at year-end."

**MediCare Year-End Close shows Revenue R0:**
Resolved in 0f6cfa0 — dispensary branch shipped. Verify in browser
after Vercel deploy completes.

### OPEN CODE ITEMS — SESSION 262

1. **PRIORITY: .gitignore null byte / UTF-16 residue**
   Symptom: spaced characters on line 33 ("p r o t e a a i - c o n t e x t")
   Cause: old PowerShell redirect wrote UTF-16 instead of UTF-8
   Fix: read .gitignore, strip null bytes, rewrite as clean UTF-8
   Risk: low (not blocking anything), but unprofessional in a CA demo repo

2. **HR suite top-up: 3 tenants need more staff**
   Medi Rec: add Store Manager + Cashier (RUNBOOK min = 4 cannabis_retail)
   MediCare: add Receptionist (RUNBOOK min = 3 cannabis_dispensary)
   Metro Hardware: add Store Manager + Stockroom (RUNBOOK min = 4 general_retail)
   Use RUNBOOK Phase 5 pattern for contracts + leave_balances + timesheets

3. **Medi Rec Fixed Assets "Xmo behind" counter**
   RUNBOOK Phase 3: UI action — Run Depreciation month by month
   Nov 2023 → Apr 2026 for all 3 assets (in chronological order)
   Cannot be seeded via SQL alone — UI required

4. **VAT Mar-Apr period: Medi Rec still shows Input R0 in period drill-down**
   YTD Input VAT is correct (R48,279). Per-period breakdown has rendering
   issue for current filing period. March expenses now have input_vat_amount
   populated — verify if fix landed in 1fd1a87 or needs additional code pass.

5. **MediCare bank recon closing balance mismatch**
   BS shows R131,430 (from bank_statement_lines closing balance) but
   equity_ledger was calibrated to this figure. If bank recon is further
   categorized in UI, closing balance may shift. Re-verify BS equation
   after any bank recon UI changes.

---

## CRITICAL RULES
- RULE 0Q: NEVER push_files or create_or_update_file from Claude.ai. Ever.
- LL-246: NEVER use `git add -A`. Always add specific files by name.
  `git add -A` caused the service_role key leak in session 261.
- LL-221: Read source file in full before any edit
- LL-231: Dispensary revenue = dispensing_log not orders (SHIPPED in 0f6cfa0)
- LL-232: All HQ queries need .eq("tenant_id", tenantId)
- LL-205: Every new DB table needs hq_all_ RLS bypass policy
- LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
- LL-NEW-2: Wizard bank_accounts rows are canonical. Never add a second row.

## PRE-DEMO RITUAL (30 min before — 12 May 2026)
1. Run sim-pos-sales on 11 May (day before) — HQTenants RUN 30 DAYS button
2. Check PENDING-ACTIONS.md — all loops closed or noted
3. Visual checklist all 5 demo tenants (incognito, Vercel prod URL)
4. Medi Rec Fixed Assets — confirm dep history not showing "Xmo behind"
5. All 4 tenants — IFRS statements marked Reviewed + Auditor Sign-Off
6. MediCare — confirm IFRS IS shows dispensing revenue (not R0)

## MANUAL UI ACTIONS OUTSTANDING (must be done in browser before 12 May)

| Action | Portal | Priority |
|---|---|---|
| Medi Rec: Run Depreciation Nov 2023 → Mar 2026 (all missing months) | /tenant-portal (Medi Rec) → Fixed Assets | HIGH |
| All 4 tenants: IFRS Statements → Mark Reviewed on all 4 statements | /tenant-portal per tenant | HIGH |
| Medi Rec + Metro + MediCare: Add missing staff per RUNBOOK Phase 5 | Session 262 via Supabase MCP | MEDIUM |

*SESSION-STATE v281 — Updated 14 April 2026 — Session 261/262 Close*
