# NUAI — SESSION START PROTOCOL
## Paste this as the FIRST message in every new Claude.ai session.
## Updated: 15 April 2026 — Session 284
## THIS FILE HAS NO VERSION NUMBER. IT IS UPDATED IN-PLACE EVERY SESSION.
## Detail lives in the loop docs. This file is the entry point only.
## If you are writing NEXT-SESSION-PROMPT_vXXX.md — STOP. Update this file instead. (LL-264)

---

You are the AI development partner for **NuAi** — a production multi-tenant
SaaS ERP platform. 224,293 lines of code. 109 DB tables. 6 portals.
4 industry profiles. CA demo date: **12 May 2026.**

**Tools:** GitHub MCP (READ ONLY — RULE 0Q), Supabase MCP (FULL ACCESS).
**Repo:** github.com/GFive5y/protea-botanicals — main
**Supabase:** uvicrqapgzcdvozxrreo — HEAD: 366dcc3

---

## LOAD CONTEXT — MANDATORY, IN THIS ORDER

1. `docs/PLATFORM-OVERVIEW_v1_0.md`
2. `docs/NUAI-AGENT-BIBLE.md`
2b. `docs/NUAI-VISUAL-SPEC.md` — read before touching ANY visual code
3. `docs/PENDING-ACTIONS.md`
4. `docs/VIOLATION_LOG_v1_1.md`
5. `docs/LL-ARCHIVE_v1_0.md` (LL-252 through LL-264 are new this session)

After reading, confirm out loud:
- Current HEAD (should be 5802a7c or later — the docs commit on top of it is self-referential)
- Group Portal status (COMPLETE — 6 stores, all tabs verified 15 Apr 2026)
- All open loops from PENDING-ACTIONS.md
- Any new violations

---

## STANDING ALERT

sim-pos-sales MUST run the day BEFORE the CA demo. Trigger date: 11 May 2026.
IF DEMO DATE CHANGES: update PENDING-ACTIONS.md first, then this file.

---

## CURRENT STATE — 15 April 2026 — Session 284 Close

### DS6 VISUAL UNIFICATION — Session 284 (commit 366dcc3)

Master visual spec: docs/NUAI-VISUAL-SPEC.md — mandatory before any visual code.

Files unified this session:
- AppShell.css — cream → T.bg platform-wide
- TenantPortal.js — cream eliminated, INNER maxWidth removed (LOOP-DS6-001 closed)
- HQTradingDashboard.js — DM Mono killed, emoji→Lucide, radius tokenised,
  section accent bars, KPI border 0.5px, chart padding, sKPISub breathing
- HQOverview.js — SectionLabel industry-aware (T.accent), label → T.ink400,
  radius tokens, T.surface panels
- HQLoyalty.js — 15 changes: emoji removed (🌿💨🍬🌱🧪🔧🍄👕🎯📱📦🔀🎂⏰📊⚡),
  radius tokenised, T.surface → T.bg where needed, unused consts deleted,
  outer div → transparent, page header → transparent
- HQDashboard.js — content wrapper → background: T.bg (eliminates white
  middleman box for ALL 40+ HQ tabs, not just loyalty)

ARCHITECTURAL LESSON LOCKED THIS SESSION (LL-267):
Tab-level components (rendered inside HQDashboard or TenantPortal) must NEVER
set background: T.surface on their outermost return div. This creates a white
box that sits on top of the grey AppShell page chrome. The correct pattern:
  outer div → background: "transparent" (or omit background entirely)
  inner page header div → background: T.surface (intentional white header bar)
  tab content div → no background (inherits grey from shell)
  SectionCards/tiles → background: T.surface (white cards float on grey)

Group Portal remains the visual reference. DS6 Phase 2 next: HQStock.js
(PROTECTED — full file read required before any change per LL-185)

### FINANCIAL PACKAGE — ALL 5 DEMO TENANTS COMPLETE
DO NOT re-run financial seeding. DO NOT touch equity_ledger without LL-248.
All bank recons at 0 unmatched lines.

| Tenant | Industry | Fin Suite | Bank Recon |
|---|---|---|---|
| The Garden Bistro | food_beverage | ✅ COMPLETE | ✅ 0 unmatched |
| Medi Recreational | cannabis_retail | ✅ COMPLETE | ✅ 0 unmatched |
| Nourish Kitchen & Deli | food_beverage | ✅ COMPLETE | ✅ 0 unmatched |
| MediCare Dispensary | cannabis_dispensary | ✅ COMPLETE | ✅ 0 unmatched |
| Metro Hardware (Pty) Ltd | general_retail | ✅ COMPLETE | ✅ 0 unmatched |

### GROUP PORTAL — COMPLETE (Session 282)
NuAi Demo Portfolio (a55373b2) · 6 stores · All 8 tabs verified working.

### OPEN LOOPS (see PENDING-ACTIONS.md for close conditions)
- LOOP-NEW-005: MediCare Revenue MTD shows R0 — reads from orders, must read
  from dispensing_log for cannabis_dispensary profile per LL-231. Claude Code
  fix: find Revenue MTD tile in dispensary dashboard component, switch source.
- LOOP-NEW-006: MediCare IFRS BS gap R76,906 — equity_ledger recalibration
  via Supabase MCP.
- LOOP-010: Medi Rec — Run Depreciation via UI (step through each missing month)
- LOOP-011: All 5 tenants — IFRS Mark Reviewed + Auditor Sign-Off (20 statements)
- LOOP-015: Loyalty warning banner — source unidentified
  Next: grep -r "no rows\|config row\|rewards engine" src/
  Ruled out: AINSBar.js, useNavIntelligence.js, HQLoyalty.js, IntelStrip.js

### CLOSED RECENTLY (sessions 283–284)
- LOOP-012: HR top-up — CLOSED (Medi Rec, MediCare, Metro all at RUNBOOK minimum)
- LOOP-014: MediCare IFRS IS dispensing revenue verify — CLOSED (NEW-002 fix in 4fdafcd)
- LOOP-016: R12,500 bank debit — CLOSED (created and closed same session;
  resolved as Crown Electric forklift service invoice)
- LOOP-NEW-004: Nourish Kitchen order_items cost_price — CLOSED (Supabase MCP
  seed: 240 items, 6 products rotating, weighted_avg_cost in product_metadata.
  BS signal now fires amber/1, 72 days of cover. Verified.)
- Signal system (useFinSignals + hover cards + walk-in brief) — SHIPPED in 5802a7c
- LOOP-DS6-001: TenantPortal INNER maxWidth causing grey side-strips at wide
  viewports and any zoom level below 100% — CLOSED (71c7ae9, removed maxWidth
  and margin:auto from INNER const)
- DS6 visual unification Phase 1 — SHIPPED. AppShell cream, TenantPortal
  background, HQTradingDashboard, HQOverview all unified. Master spec created.
- DS6 HQLoyalty.js — SHIPPED (e983731 → 366dcc3). 15 changes + 2 follow-up
  fixes: outer div background transparent, page header transparent.
  Root cause of white middleman box identified and eliminated.
- DS6 HQDashboard.js — SHIPPED (e216d4d). Content wrapper → background: T.bg.
  Eliminates white box for all 40+ HQ tabs. Pattern matches TenantPortal.

### KNOWN PERMANENT GAPS — DO NOT CHASE BEFORE 12 MAY
1. POS VAT pipeline — ~R5k BS gap per tenant (amber banner explains it)
2. MediCare IFRS BS gap R76,906 — tracked as LOOP-NEW-006 (fix next session)
3. Metro Hardware IFRS BS gap — CLOSED Session 283 (A1 accrued opex + A5 FY filter in b281bb8)
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
  Verify: grep -n 'Group Portal' src/hooks/useNavConfig.js → must return 2 lines

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
         These write tools CANNOT be disabled in Claude.ai (Anthropic
         gated feature, no per-tool toggle exists). Token scope is the
         real gate. Do not call write tools regardless of availability.
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
LL-246: NEVER git add -A. Specific files only. (service_role key rotated once already)
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
         in-place instead. Versioned handoff files go stale immediately and leave
         this file (the actual entry point) un-updated. See LL-264 in archive.
LL-265: Production URL is protea-botanicals.vercel.app — never use preview URLs
         (f520llkld format). Preview URLs serve frozen builds and will show stale
         behaviour that doesn't match what's on main.
LL-266: TenantPortal INNER wrapper must NOT use maxWidth or margin:auto.
         Content must fill 100% between sidebar and scrollbar at all zoom levels.
LL-267: Tab components (rendered inside HQDashboard or TenantPortal) must NOT
         set background on their outermost return div. Use background: "transparent"
         or omit it. Only inner page header divs and cards use T.surface. Violating
         this creates a white middleman box over the grey AppShell chrome.

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
1. **LOOP-NEW-005** — MediCare Revenue MTD R0 fix (Claude Code, dispensing_log source)
2. **LOOP-NEW-006** — MediCare IFRS BS gap R76,906 (Supabase MCP)
3. **LOOP-010/011** — Pre-demo: Medi Rec Run Depreciation + 20 IFRS sign-offs
4. **WP-DS6-UNIFICATION Phase 2** — Next file: HQStock.js
   (PROTECTED — read full file before any change). Pattern established in
   Session 284 — follow NUAI-VISUAL-SPEC.md Part 14 checklist for each file.
   CRITICAL: Apply LL-267 — tab component outer div must be transparent.
   Check every file for background: T.surface on outermost return div.
5. **11 May sim-pos-sales** — STANDING ALERT, cannot miss
6. Eybna unpriced products — HC-0002, BB-LYCHEE-0002, 6-PH-0002

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
