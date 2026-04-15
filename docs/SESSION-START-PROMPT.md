# NUAI — SESSION START PROTOCOL
## Paste this as the FIRST message in every new Claude.ai session.
## Updated: 16 April 2026 — Session 286
## THIS FILE HAS NO VERSION NUMBER. IT IS UPDATED IN-PLACE EVERY SESSION.
## Detail lives in the loop docs. This file is the entry point only.
## If you are writing NEXT-SESSION-PROMPT_vXXX.md — STOP. Update this file instead. (LL-264)

---

You are the AI development partner for **NuAi** — a production multi-tenant
SaaS ERP platform. 224,293 lines of code. 109 DB tables. 6 portals.
4 industry profiles. CA demo date: **12 May 2026.**

**Tools:** GitHub MCP (READ ONLY — RULE 0Q), Supabase MCP (FULL ACCESS).
**Repo:** github.com/GFive5y/protea-botanicals — main
**Supabase:** uvicrqapgzcdvozxrreo — HEAD: db12ac3

---

## LOAD CONTEXT — MANDATORY, IN THIS ORDER

1. `docs/PLATFORM-OVERVIEW_v1_0.md`
2. `docs/NUAI-AGENT-BIBLE.md`
2b. `docs/NUAI-VISUAL-SPEC.md` — read before touching ANY visual code
3. `docs/PENDING-ACTIONS.md`
4. `docs/VIOLATION_LOG_v1_1.md`
5. `docs/LL-ARCHIVE_v1_0.md` (LL-265 through LL-268 are new)

After reading, confirm out loud:
- Current HEAD (should be db12ac3 or later)
- DS6 status: COMPLETE (all portals, HQ, HR, Admin, Consumer — see below)
- All open loops from PENDING-ACTIONS.md
- Any new violations

---

## STANDING ALERT

sim-pos-sales MUST run the day BEFORE the CA demo. Trigger date: 11 May 2026.
IF DEMO DATE CHANGES: update PENDING-ACTIONS.md first, then this file.

---

## CURRENT STATE — 16 April 2026 — Session 286 Close

### DS6 VISUAL UNIFICATION — COMPLETE (Session 286)

Master visual spec: docs/NUAI-VISUAL-SPEC.md — mandatory before any visual code.

**DS6 is now complete across all primary surfaces.** Every portal shell,
HQ component, HR component, admin component and consumer page has been
unified to the T token system. This was the entire focus of Session 286.

#### Tokens foundation (commit 9d0da07)
- `src/styles/tokens.js` — CRITICAL FIXES:
  - Added 5 missing *Bd border tokens: `successBd`, `warningBd`, `dangerBd`,
    `infoBd`, `accentBd`. Without these every `border: 1px solid ${T.xxxBd}`
    across all bridge files rendered as `border: 1px solid undefined`.
  - Converted `radius` values from numbers to px strings ("4px", "8px", etc)
    so multi-corner template literals like `` `${T.radius.lg} ${T.radius.lg} 0 0` ``
    produce valid CSS. Previously produced "12 12 0 0" (no units = invalid).

#### All 6 portal shells ok
HQDashboard · TenantPortal · AdminDashboard · HRDashboard · StaffPortal ·
WholesalePortal

#### All HQ components ok (21 files)
HQStock (Phase 2a+2b) · HQBalanceSheet · ExpenseManager · HQProfitLoss ·
HQDocuments · HQTradingDashboard · HQVat · HQLoyalty · HQAnalytics ·
HQOverview · HQCogs · HQJournals · HQBankRecon · HQFixedAssets ·
HQFinancialStatements · HQPurchaseOrders · HQSuppliers · HQPricing ·
HQProduction · SmartInventory · PlatformBar

#### All HR components ok (15 files)
AdminHRPanel · HRStaffDirectory · HRLeave · HRTimesheets · HRContracts ·
HRDisciplinary · HRPayroll · HRPerformance · HRRoster · HRCalendar ·
HRComms · HRLoans · HRSettings · HRStaffProfile · HRStockView
NOTE: HRStaffProfile had no local T block AND no T import — had bare T.*
references from a prior partial edit. Fix: add `import { T } from "../../styles/tokens";`
directly. This pattern (T.* with no local block, no import) = direct import, no bridge.

#### Admin components ok
AdminQRCodes · StockControl

#### All consumer pages ok (5 files)
Account · Shop · CheckoutPage · Redeem · WholesalePortal
IMPORTANT: Cormorant Garamond + Jost fonts are intentionally preserved on
ALL 5 consumer-facing pages. These are brand typography choices, not violations.
Do NOT replace them with T.font on consumer pages.

#### DS6 bridge pattern (for remaining files or future components)
Files with a local `const T = { ink900: "#0D0D0D", ... }` block:
  1. Add `import { T as DS } from "../../styles/tokens";`
  2. Replace the entire local T block with the DS bridge:
 const T = {
   ...DS,
   ink150: DS.border, ink075: DS.bg, ink050: DS.surface,
   successBg: DS.successLight, warningBg: DS.warningLight,
   dangerBg: DS.dangerLight, infoBg: DS.infoLight,
   accentLit: DS.accentLight, fontUi: DS.font, fontData: DS.font,
   shadow: DS.shadow.sm, shadowMd: DS.shadow.md,
 };
  3. Fix sLabel (11px/0.08em/T.ink400), sCard (T.surface/T.radius.md),
     sBtn (T.radius.sm), sInput (T.surface/T.radius.sm),
     sTh Part 16 (11px/T.ink400/0.08em/T.surface bg)
  4. Global: fontSize 9/10→11, borderRadius numeric/string→T.radius.*, #fff→T.surface

Files using T.* with NO local block AND NO import: add `import { T } from "../../styles/tokens";`

#### Remaining (optional, not blocking demo)
7 Admin tab components: AdminCommsCenter · AdminCustomerEngagement ·
AdminFraudSecurity · AdminNotifications · AdminShipments ·
AdminBatchManager · AdminProductionModule
These inherit correct font/spacing from AdminDashboard shell. Internal
raw hex / fontSize violations are cosmetic only.

### FINANCIAL PACKAGE — ALL 5 DEMO TENANTS COMPLETE
DO NOT re-run financial seeding. DO NOT touch equity_ledger without LL-248.
All bank recons at 0 unmatched lines.

| Tenant | Industry | Fin Suite | Bank Recon |
|---|---|---|---|
| The Garden Bistro | food_beverage | COMPLETE | 0 unmatched |
| Medi Recreational | cannabis_retail | COMPLETE | 0 unmatched |
| Nourish Kitchen & Deli | food_beverage | COMPLETE | 0 unmatched |
| MediCare Dispensary | cannabis_dispensary | COMPLETE | 0 unmatched |
| Metro Hardware (Pty) Ltd | general_retail | COMPLETE | 0 unmatched |

### GROUP PORTAL — COMPLETE (Session 282)
NuAi Demo Portfolio (a55373b2) · 6 stores · All 8 tabs verified working.

### OPEN LOOPS (see PENDING-ACTIONS.md for close conditions)
- LOOP-NEW-005: MediCare Revenue MTD shows R0 — reads from orders, must read
  from dispensing_log for cannabis_dispensary profile per LL-231.
  Fix: find Revenue MTD tile in dispensary dashboard component, switch source.
- LOOP-NEW-006: MediCare IFRS BS gap R76,906 — equity_ledger recalibration
  via Supabase MCP.
- LOOP-010: Medi Rec — Run Depreciation via UI (step through each missing month)
- LOOP-011: All 5 tenants — IFRS Mark Reviewed + Auditor Sign-Off (20 statements)
- LOOP-015: Loyalty warning banner — source unidentified
  Next: grep -r "no rows\|config row\|rewards engine" src/
  Ruled out: AINSBar.js, useNavIntelligence.js, HQLoyalty.js, IntelStrip.js

### CLOSED THIS SESSION (286)
- LOOP-DS6-004: HQStock.js DS6 Phase 2b — CLOSED (shipped by Claude Code)
- DS6 full platform pass — all portals, HQ, HR, Admin, Consumer unified
- tokens.js *Bd tokens + radius string fix — CRITICAL BUG CLOSED
- HRStaffProfile missing T import — CLOSED (db12ac3)

### KNOWN PERMANENT GAPS — DO NOT CHASE BEFORE 12 MAY
1. POS VAT pipeline — ~R5k BS gap per tenant (amber banner explains it)
2. MediCare IFRS BS gap R76,906 — tracked as LOOP-NEW-006 (fix next session)
3. Metro Hardware IFRS BS gap — CLOSED Session 283
4. Cash flow opening balance — not wired to bank recon
5. Pricing data source red (0) — no product_pricing linked to recipes

---

## DEMO LOGIN SHEET

| Store | Email | Industry |
|---|---|---|
| HQ / Master | admin@protea.dev | operator |
| Medi Can Dispensary | medican@nuai.dev | cannabis_dispensary |
| Medi Recreational | HQ switch only | cannabis_retail |
| MediCare Dispensary | jane@jane.co.za | cannabis_dispensary |
| Metro Hardware | johan@metro-hardware.co.za | general_retail |
| The Garden Bistro | annette@duplessis.co.za | food_beverage |
| Nourish Kitchen & Deli | nourish@nuai.dev / NourishDemo2026! | food_beverage |

---

## QUICK DEBUG PROTOCOL

### "Bug on Vercel"
Check localhost FIRST. Same bug → code issue. Only on Vercel → SW cache.
Fix: open NEW incognito window. Not refresh. Not existing incognito tab. (LL-257, LL-259)

### "T is not defined in a HQ/HR component"
Check the file: does it have a local `const T = {` block? No → add `import { T } from "../../styles/tokens";` directly. Yes → check if `import { T as DS }` was added but the bridge body was not — paste the bridge block. (LL-268)

### "border: 1px solid undefined on a semantic badge/card"
tokens.js is missing a *Bd token. Check: T.successBd, T.warningBd, T.dangerBd,
T.infoBd, T.accentBd all exist as of 9d0da07. If a component uses a custom
*Bd that doesn't exist in tokens.js, add it there first. (Session 286 fix)

### "borderRadius template literal produces '12 12 0 0' (no units)"
Use T.radius.lg directly as a string (it's "12px" as of 9d0da07). If you need
multi-corner: `` `${T.radius.lg} ${T.radius.lg} 0 0` `` now correctly produces
"12px 12px 0 0". (Session 286 fix)

### "Group Portal: infinite recursion detected in tenant_groups"
Already fixed in prod. If it returns:
  SELECT policyname, qual FROM pg_policies WHERE tablename = 'tenant_groups';
  Redeploy get_my_group_ids() SECURITY DEFINER. See LL-262.

### "Group Portal: Could not load network"
  SELECT * FROM tenant_group_members WHERE tenant_id = '<id>';
  If 0 rows: tenant not in group. Add via Supabase MCP.

### "npm start fails: Can't resolve qrcode.react"
  npm install then npm start (LL-261)

### "git pull fails: would be overwritten by merge"
  git fetch origin && git reset --hard origin/main && npm install (LL-260)
  Never git stash when untracked files are listed as conflicting.

### "Nav item missing for some user roles"
  useNavConfig.js has 4 arrays: HQ_PAGES, ADMIN_PAGES, HR_PAGES, STAFF_PAGES
  New item must be in ALL relevant arrays. (LL-258)

### "Bar chart bars invisible"
  T.neutralLight ≈ #F4F4F3 (near-white). Never use as chart fill. (LL-263)
  Use BAR_PALETTE. See StoreComparison.js for the pattern.

---

## CRITICAL RULES

RULE 0Q: NEVER push from Claude.ai. Claude Code (local terminal) ONLY.
         GitHub:create_or_update_file — VISIBLE, FORBIDDEN.
         GitHub:push_files — VISIBLE, FORBIDDEN.
         Supabase:deploy_edge_function — VISIBLE, FORBIDDEN.
         GitHub:get_file_contents — PERMITTED (read only).
LL-075: Disk is truth. Read file before assuming state from docs.
LL-083: Truncated reads drop data silently. Verify line count.
LL-120: ALL Anthropic API calls via ai-copilot EF. NEVER from React.
LL-127: Hooks before early returns. No exceptions.
LL-185: GitHub:get_file_contents before ANY edit this session.
LL-189: movement_type = 'sale_pos' for POS. 'sale_out' = wholesale ONLY.
LL-191: loyalty_transactions.transaction_type (not type/loyalty_type).
LL-205: Every new DB table needs hq_all_ RLS bypass policy.
LL-206: const { tenantId, industryProfile } = useTenant();
LL-231: Dispensary revenue = dispensing_log. NOT orders.
LL-246: NEVER git add -A. Specific files only.
LL-247: depreciation_entries.period_month is TEXT — quote it: '4' not 4.
LL-248: equity_ledger.net_profit_for_year can drift — verify both sources.
LL-250: All demo VAT numbers must be unique.
LL-251: Run 8-point anomaly audit SQL at every session start.
LL-252: StockIntelPanel saleOuts: filter sale_out OR sale_pos.
LL-253: auth.users SQL: all token fields must be '' not null.
LL-254: RLS circular ref: SECURITY DEFINER function to break cycle.
LL-255: T.neutralLight ≈ white. Never use for chart bar fills.
LL-256: Diverged local: git fetch + reset --hard + npm install.
LL-257: Vercel SW cache: new incognito window, not refresh.
LL-258: useNavConfig: 4 arrays — update ALL relevant ones.
LL-259: Check localhost before assuming Vercel bug = cache.
LL-260: git pull blocked → git reset --hard origin/main.
LL-261: qrcode.react missing after reset → npm install.
LL-262: tenant_groups RLS recursion → get_my_group_ids() SECURITY DEFINER.
LL-263: T.neutralLight invisible on white → BAR_PALETTE for chart bars.
LL-264: NEVER create NEXT-SESSION-PROMPT_vXXX.md. Update SESSION-START-PROMPT.md
         in-place instead.
LL-265: Production URL is protea-botanicals.vercel.app — never use preview URLs.
LL-266: TenantPortal INNER wrapper must NOT use maxWidth or margin:auto.
LL-267: Tab components (rendered inside HQDashboard or TenantPortal) must NOT
         set background on their outermost return div. Use background: "transparent"
         or omit it. Only inner page header divs and cards use T.surface.
LL-268: DS6 batch scripts check hasLocalT to decide whether to add a bridge.
         Files that use T.* with NO local T block AND NO import will compile with
         "T is not defined". Pattern: if file has bare T.xxx with no local block
         and no import → add `import { T } from "../../styles/tokens";` directly.
         Do NOT add the bridge (no DS alias needed). HRStaffProfile.js was the
         canonical example (db12ac3).

---

## PRE-DEMO RITUAL (30 min before — 12 May 2026 09:30)
1. Run LL-251 8-point anomaly audit SQL — all 8 queries clean
2. Run audit_tenant_isolation.py — must exit 0
3. Visual checklist new incognito: P&L → BS → Journals → VAT →
   Fixed Assets → Bank Recon → Group Portal → Nav for each tenant
4. Confirm sim-pos-sales ran 11 May (stock_movements has recent sale_pos rows)
5. git status clean, HEAD matches expected commit

---

## NEXT PRIORITIES (choose with owner at session start)
FIN SUITE NOTE FOR NEXT AGENT: The financial data collection layer is complete
but the CA-facing OUTPUT layer is missing. Read LOOP-FIN-002 through LOOP-FIN-005
in PENDING-ACTIONS.md before any fin work. The most impactful item is
LOOP-FIN-002 (PDF Audit Package EF) — spec in WP-FINANCIALS-v1_1.md Section 7.5.
Also read FIN-AUDIT_v1_0.md for the full technical gap map (10 confirmed gaps).

1. **LOOP-NEW-005** — MediCare Revenue MTD R0 fix (Claude Code, dispensing_log source)
2. **LOOP-NEW-006** — MediCare IFRS BS gap R76,906 (Supabase MCP)
3. **LOOP-010/011** — Pre-demo: Medi Rec Run Depreciation + 20 IFRS sign-offs
4. **LOOP-015** — Loyalty warning banner grep (5 min diagnostic)
5. **Optional DS6 mop-up** — 7 remaining Admin tab components (AdminCommsCenter,
   AdminCustomerEngagement, AdminFraudSecurity, AdminNotifications,
   AdminShipments, AdminBatchManager, AdminProductionModule). Not blocking demo.
6. **11 May sim-pos-sales** — STANDING ALERT, cannot miss

---

## HOW TO UPDATE THIS FILE (do this at every session end via Claude Code)

1. Update HEAD to current commit
2. Update session number in header line 3
3. Update CURRENT STATE with what completed this session
4. Update OPEN LOOPS (close completed, add new)
5. Add any new LLs to CRITICAL RULES
6. Commit:
     git add docs/SESSION-START-PROMPT.md docs/LL-ARCHIVE_v1_0.md docs/PENDING-ACTIONS.md
     git commit -m "docs(S###): update session docs in-place"
     git push origin main

NEVER create NEXT-SESSION-PROMPT_vXXX.md. (LL-264)

*SESSION-START-PROMPT · NuAi Platform · No version number · Updated each session in-place*
