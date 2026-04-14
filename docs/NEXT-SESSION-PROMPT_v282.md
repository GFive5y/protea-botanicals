# NEXT-SESSION-PROMPT_v282.md
## NuAi Platform — Session 282 Handoff
## Date: 15 April 2026 · CA Demo: 12 May 2026 (27 days)

---

## RULE 0Q — ABSOLUTE. NO EXCEPTIONS.
NEVER use push_files or create_or_update_file from Claude.ai. EVER.
ONLY Claude Code (local terminal) may push to main.
Docs-only commits may have been an exception attempted this session. It failed.
src/ NEVER gets pushed from Claude.ai under any circumstance.

---

## PLATFORM STATE
- LOC: ~224,000+ · DB tables: 109 · Portals: 6 · Industry profiles: 4
- Repo: github.com/GFive5y/protea-botanicals · Branch: main
- Supabase: uvicrqapgzcdvozxrreo
- Dev account: admin@protea.dev (hq_access=true, is_operator=true) — ONLY localhost dev account
- HQ personal: fivazg@gmail.com (Nu Ai HQ tenant 43b34c33)
- Vercel: protea-botanicals-f520llkld-gfive5ys-projects.vercel.app

---

## SESSION 282 — WHAT WAS COMPLETED

### CC-07: Group Portal button always visible (commit 93cdf5f)
File: src/pages/TenantPortal.js
- Removed hasGroup async gate entirely — button now renders unconditionally
- GroupPortal.js handles the "no group" empty state itself
- Fixed Unicode escape bugs: \u229e → {"\u229e"}, \u2190 → {"\u2190"}

### CC-08: ADMIN_PAGES Group Portal entry
File: src/hooks/useNavConfig.js
- Added Group Portal to ADMIN_PAGES Platform section (was only in HQ_PAGES)
- Lesson LL-258: useNavConfig has 4 arrays — HQ_PAGES, ADMIN_PAGES, HR_PAGES, STAFF_PAGES
  New nav items must be added to ALL relevant arrays
Verify: grep -n 'Group Portal' src/hooks/useNavConfig.js  → should return 2 lines

### CC-09: RLS infinite recursion fixed (Supabase MCP — no code commit)
Error was: "infinite recursion detected in policy for relation 'tenant_groups'"
Root cause: policy on tenant_groups referenced tenant_group_members AND policy on
tenant_group_members referenced tenant_groups → circular
Fix applied via Supabase MCP:
  DROP POLICY "member_can_read_own_group" ON tenant_groups;
  CREATE FUNCTION get_my_group_ids() RETURNS SETOF uuid LANGUAGE sql
    SECURITY DEFINER STABLE AS $$
    SELECT group_id FROM tenant_group_members WHERE tenant_id = user_tenant_id();
    $$;
  CREATE POLICY "member_can_read_own_group" ON tenant_groups
    FOR SELECT TO public USING (id IN (SELECT get_my_group_ids()));
Result: Group Portal loads for all 6 member stores

### CC-10: StoreComparison bar chart colors
File: src/components/group/StoreComparison.js
Problem: T.neutralLight ≈ white — chart bars were invisible
Fix: BAR_PALETTE constant (6 distinct colors). barColor embedded in chartData useMemo.
     Current store = T.accent. Others cycle through palette by sorted index.
     Added tenantId to useMemo dependency array.
Verify: grep -n 'BAR_PALETTE\|barColor' src/components/group/StoreComparison.js → 4+ lines

### Local git sync (no commit — local fix only)
git pull failed: local package.json, App.js, untracked files blocked merge
Recovery used: git fetch origin && git reset --hard origin/main && npm install
qrcode.react was missing after reset → npm install fixed it

---

## GROUP PORTAL — FULLY VERIFIED WORKING (15 April 2026)

Group: NuAi Demo Portfolio (a55373b2-57cf-480a-98bf-6fe834833fa9) · 6 stores

| Tab | Status | Key figure |
|---|---|---|
| Network Dashboard | ✅ | R705,557 MTD · 665 orders · 64.8% margin |
| Store Comparison | ✅ | 6 stores · distinct bar colors |
| Combined P&L | ✅ | All 4 industry profiles · This month/Last/3mo/YTD |
| Revenue Intelligence | ✅ | 90-day trend · 6 stores charted |
| Stock Intelligence | ✅ | R3.85M stock · dead stock flagged per store |
| Customer Intelligence | ✅ | 56 members · tier distribution · churn signals |
| Network Intelligence | ✅ | Health scores · alert centre · royalty summary |
| My Stores sidebar | ✅ | Clickable store switcher · profile badges |

Network headline numbers for demo:
- Combined Revenue MTD: R705,557
- Network Avg Gross Margin: 64.8%
- Combined Stock Value (AVCO): R3.85M
- Network Health Score: 46/100 — WATCH

---

## DEMO LOGIN SHEET

| Store | Email | Password | Industry |
|---|---|---|---|
| HQ / Master | admin@protea.dev | (owner) | operator |
| Medi Can Dispensary | medican@nuai.dev | (owner) | cannabis_dispensary |
| Medi Recreational | HQ switch only | — | cannabis_retail |
| MediCare Dispensary | jane@jane.co.za | (owner) | cannabis_dispensary |
| Metro Hardware | johan@metro-hardware.co.za | (owner) | general_retail |
| The Garden Bistro | annette@duplessis.co.za | (owner) | food_beverage |
| Nourish Kitchen & Deli | nourish@nuai.dev | NourishDemo2026! | food_beverage |

---

## CRITICAL IDs

| Entity | ID |
|---|---|
| NuAi Demo Portfolio | a55373b2-57cf-480a-98bf-6fe834833fa9 |
| Medi Can Dispensary | 2bd41eb7-1a6e-416c-905b-1358f6499d8d |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 |
| MediCare Dispensary | 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b |
| The Garden Bistro | 7d50ea34-9bb2-46da-825a-956d0e4023e1 |
| Nourish Kitchen & Deli | 944547e3-ce9f-44e0-a284-43ebe1ed898f |
| Metro Hardware (Pty) Ltd | 57156762-deb8-4721-a1f3-0c6d7c2a67d8 |
| Nu Ai HQ | 43b34c33-6864-4f02-98dd-df1d340475c3 |

---

## OPEN LOOPS — MUST COMPLETE BEFORE 12 MAY

LOOP-010 — Medi Rec: Run Depreciation
Action: /tenant-portal (Medi Rec) → Fixed Assets → Run Depreciation for each month

LOOP-011 — All 5 tenants: IFRS Statements Mark Reviewed + Auditor Sign-Off
Action: 20 statements total (4 per tenant × 5 tenants)

LOOP-012 — HR top-up (Supabase MCP)
Medi Rec: +SM +Cashier · MediCare: +Receptionist · Metro: +SM +Stockroom

LOOP-014 — MediCare IFRS IS dispensing revenue verify
CC-03 shipped. Needs visual confirmation on Vercel (new incognito).

LOOP-015 — Loyalty warning banner source unidentified
Next: grep -r "no rows\|config row\|rewards engine" src/
Ruled out: AINSBar.js, useNavIntelligence.js, HQLoyalty.js, IntelStrip.js

W4 (11 May) — STANDING ALERT: sim-pos-sales for Metro Hardware + Medi Recreational

---

## QUICK DEBUG PROTOCOL

### "I see a bug on Vercel"
1. Check localhost first. Same bug? → Code issue (not cache)
2. Only on Vercel? → Service worker cache. Open NEW incognito window (LL-257)
3. "Finish update" button = old SW active. New incognito = guaranteed fresh bundle

### "Group Portal: infinite recursion"
Check: SELECT policyname, qual FROM pg_policies WHERE tablename = 'tenant_groups';
If any policy references tenant_group_members AND vice versa → circular (LL-262)
Fix: get_my_group_ids() SECURITY DEFINER function (already applied to prod)

### "Group Portal: Could not load network"
Check tenant_groups RLS. Then:
SELECT * FROM tenant_group_members WHERE tenant_id = '<tenantId>';
If 0 rows: tenant not in group. Add via Supabase MCP.

### "npm start fails: Can't resolve 'qrcode.react'"
npm install then npm start (LL-261)

### "git pull fails: would be overwritten"
git fetch origin && git reset --hard origin/main && npm install && npm start (LL-260)
Do NOT use git stash when untracked files are listed as conflicting

### "Nav item missing for some user roles"
Check src/hooks/useNavConfig.js — 4 arrays: HQ_PAGES, ADMIN_PAGES, HR_PAGES, STAFF_PAGES
New item must appear in ALL relevant arrays (LL-258)
grep -n 'Group Portal' src/hooks/useNavConfig.js → must return 2 lines

### "Bar chart bars invisible"
T.neutralLight ≈ #F4F4F3 (near-white). Never use as chart fill (LL-263)
Use BAR_PALETTE array. See StoreComparison.js for the pattern.

### "TenantPortal Group Portal button not showing"
Button must render unconditionally — no hasGroup gate (LL-265)
GroupPortal.js handles empty state.

---

## RULE REMINDERS

RULE 0Q: NEVER push from Claude.ai. Claude Code only.
LL-075: Disk is truth. Read file before assuming state from docs.
LL-083: Truncated reads drop data silently. Verify line count.
LL-120: ALL Anthropic API calls via ai-copilot EF. NEVER from React.
LL-127: Hooks before early returns. No exceptions.
LL-185: GitHub:get_file_contents before ANY edit this session.
LL-189: movement_type = 'sale_pos' for POS. 'sale_out' = wholesale ONLY.
LL-191: loyalty_transactions.transaction_type (not type/loyalty_type).
LL-231: Dispensary revenue = dispensing_log. NOT orders.
LL-246: NEVER git add -A. Specific files only.
LL-252: StockIntelPanel saleOuts: filter sale_out OR sale_pos.
LL-253: auth.users SQL: all token fields must be '' not null.
LL-254: RLS circular ref: use SECURITY DEFINER function to break cycle.
LL-255: T.neutralLight ≈ white. Never use for chart bar fills.
LL-256: Diverged local: git fetch + reset --hard + npm install.
LL-257: Vercel SW cache: new incognito window, not refresh.
LL-258: useNavConfig: 4 arrays — update ALL relevant ones.
LL-259: Check localhost before assuming Vercel bug = cache.
LL-260: git pull blocked → git reset --hard origin/main.
LL-261: qrcode.react missing after reset → npm install.
LL-262: tenant_groups RLS recursion → get_my_group_ids() SECURITY DEFINER.
LL-263: T.neutralLight invisible on white → BAR_PALETTE for chart bars.

---

## NEXT PRIORITIES (choose with owner)

1. LOOP-010/011/012 — Pre-demo financial hygiene
2. LOOP-015 — Loyalty warning banner grep
3. Medi Rec Financials walkthrough — 11 tabs, audit for demo readiness
4. 11 May sim-pos-sales — STANDING ALERT, cannot miss
5. Eybna unpriced products — HC-0002, BB-LYCHEE-0002, 6-PH-0002

---
*NEXT-SESSION-PROMPT_v282.md · NuAi Platform · 15 April 2026*
