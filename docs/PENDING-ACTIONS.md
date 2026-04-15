# PENDING-ACTIONS.md
## Single source of truth for all open, date-sensitive loops.
## READ THIS AT EVERY SESSION START — after SESSION-STATE.
## UPDATE THIS FILE when: meeting date changes, items complete, new items added.
## NEVER delete a row — move completed items to CLOSED LOOPS section.

---

## MEETING DATE
**Current CA demo date: 12 May 2026**
When this changes:
1. Update this file (meeting date line above)
2. Recalculate sim-pos-sales trigger date (= demo date MINUS 1 day)
3. Update SESSION-STATE and SESSION-START-PROMPT
4. Re-examine all seeded orders and dispensing events for date alignment

---

## STANDING — DEMO DAY SEQUENCE

- 📅 **11 May 2026**: Run sim-pos-sales for Metro Hardware + Medi Recreational
  HQTenants → RUN 30 DAYS, OR Supabase MCP pg_net.http_post to sim-pos-sales EF.
  Window must INCLUDE 12 May demo day.
- 📅 **12 May 2026 09:30**: Pre-demo ritual (see SESSION-STATE_v281.md)
- 📅 **12 May 2026 10:00**: CA demo

---

## OUTSTANDING — MUST COMPLETE BEFORE 12 MAY 2026

### LOOP-DS6-004 — HQStock.js DS6 Phase 2b (token floor pass)
Status: OPEN · Added Session 285
What shipped in 351bc44: DM Mono→Inter (36x), emoji→Lucide (11x), LL-267 outer div, WORLD_ICON_MAP scope fix.
Remaining in same file:
  - fontWeight 300/400 on 22px values → 700 (7 instances)
  - fontSize 9/10 → 11px floor (43 instances)
  - borderRadius 6/5 on cards → T.radius.lg 12px (12 instances)
  - Section labels: T.ink500 → T.ink400 + accent bar pattern (13 instances)
  - WORLD_ICON_MAP hardcoded hex → T tokens (minor)
Close when: grep confirms 0 instances of fontSize:9, fontSize:10, fontWeight:300,
  borderRadius:6, borderRadius:5 in HQStock context, AND all section labels
  use accent bar pattern.
Read file first (LL-185, RULE 0L). Apply LL-267 check as part of close verification.

### LOOP-010 — Medi Rec: Run Depreciation (UI action)
Status: OPEN
Action: /tenant-portal (Medi Rec) → Fixed Assets → Run Depreciation
  Step through each missing month for FA-001/FA-002/FA-003 chronologically.
  CC-01 fixed the display counter bug (91719e5) — the UI should now reach 0.
Close when: No "Xmo behind" warning on any asset.

### LOOP-011 — All 5 tenants: IFRS Statements Mark Reviewed + Sign-Off
Status: OPEN
Action: For each of 5 tenants → IFRS Statements → click Mark Reviewed
  on all 4 statements (IS, BS, Cash Flow, Changes in Equity) → Auditor Sign-Off.
  20 statements total.
Close when: All 20 marked Reviewed.

### LOOP-012 — HR top-up: 3 tenants below RUNBOOK minimum
Status: OPEN
Action: Add via Supabase MCP (staff_profiles + employment_contracts +
  leave_balances + timesheets):
  - Medi Recreational: +Store Manager +Cashier (target = 4 staff)
  - MediCare Dispensary: +Receptionist (target = 3 staff)
  - Metro Hardware: +Store Manager +Stockroom (target = 4 staff)
Close when: All 3 tenants at RUNBOOK minimum with contracts + leave + timesheet.

### LOOP-014 — MediCare: verify IFRS IS shows dispensing revenue in prod
Status: OPEN — CC-03 shipped 91719e5, needs visual verification
Action: Incognito → /tenant-portal (MediCare) → IFRS Statements → Income Statement
  Confirm Revenue row shows dispensing_log-derived figure, not R0.
  Protocol: Vercel Ready on 91719e5 confirmed → incognito only (LL-214).
Close when: IFRS IS revenue matches dispensing_log × sell_price per live DB query.

### LOOP-015 — Loyalty warning banner source unidentified
Status: OPEN · Added Session 282
Symptom: Warning banner on some tenant portals referencing "no rows" or
  "config row" or "rewards engine". Source component not yet found.
Next step: grep -r "no rows\|config row\|rewards engine" src/
Files ruled out: AINSBar.js, useNavIntelligence.js, HQLoyalty.js, IntelStrip.js.

---

## KNOWN PERMANENT GAPS (document and explain in demo — do not fix before 12 May)

1. **POS VAT pipeline** — output VAT from POS orders not writing to vat_transactions.
   Root cause: POS transaction path does not call auto-post-capture EF.
   Impact: ~R5k BS gap per tenant (amber banner explains it).
   Why deferred: fixing requires touching live POS order flow + historical backfill.
   Regression risk outweighs cosmetic gap 4 weeks before demo.

2. **MediCare IFRS BS gap R76,906** — equity_ledger.net_profit (−R418,979) vs
   IFRS IS calculated profit (−R342,072.76) from different query sources.
   BS module uses equity_ledger → shows ✓ balanced.
   IFRS statement recalculates → shows gap.
   Why deferred: making equity_ledger a computed view requires schema change +
   RLS migration. Wrong update would break the ✓ BS module.

3. **Metro Hardware IFRS BS gap R362,311** — same root cause as above.
   Accrued OpEx R347,499 appears as liability in BS module but not in IFRS calc.
   Why deferred: same architectural fix needed as MediCare.

4. **Cash flow opening balance not wired to bank recon** — cosmetic blank field.
   Requires prior-period closing balance snapshot table (does not exist).
   Not on demo critical path.

5. **Pricing data source red (0)** — no product_pricing records linked to recipes.
   Affects costing dashboard only. Not on demo critical path.

---

### LOOP-FIN-002 — PDF Audit Package EF (WP-FINANCIALS Phase 7.5 — never built)
Status: OPEN · Flagged as incomplete — specced in WP-FINANCIALS but no EF deployed
Priority: HIGH for demo · Ref: docs/WP-FINANCIALS-v1_1.md Section 7.5

What a CA actually needs vs what we have:

BUILT:
  - 4 IFRS statement views (browser print-to-PDF via Lucide Printer icon)
  - 15 financial disclosure notes (auto-generated from live data)
  - Year-end close wizard
  - Trial balance CSV export button
  - Journal system

NOT BUILT — WP-FINANCIALS Phase 7.5 spec exists, EF not deployed:
  generate-financial-statements Edge Function
  Input:  { tenant_id, period_start, period_end, include_notes: true }
  Output: PDF download URL (Supabase Storage, 7-day signed URL)
  Contents:
    Page 1:   Cover — entity name, period, "Prepared by NuAi Financial Suite"
    Page 2:   Directors' Responsibility Statement (template)
    Page 3:   Income Statement (IFRS)
    Page 4:   Balance Sheet
    Page 5:   Statement of Cash Flows
    Page 6:   Statement of Changes in Equity
    Pages 7+: Notes 1–15 (fully populated from live data)
    Appendix A: Fixed Asset Register (cost / accumulated dep / NBV)
    Appendix B: Expense Schedule (all 47 expenses, categorised)
    Appendix C: VAT Summary (output/input by period)
    Appendix D: Trial Balance (all accounts, Dr/Cr)
  Tech: Deno Edge Function + jsPDF or PDFKit
  Storage: Supabase Storage bucket "financial-statements"

WHY THIS MATTERS FOR THE 12 MAY DEMO:
  A CA cannot take a browser print-to-PDF to a client meeting.
  A properly formatted, branded PDF is the difference between
  "interesting demo" and "I want this for all my clients".
  The fee-saving argument (R17k-40k/audit → 8-16hrs vs 40-80hrs)
  only lands if the CA can see the output document.

Build estimate: 1-2 sessions. Spec is in docs/WP-FINANCIALS-v1_1.md.
Next agent: read WP-FINANCIALS-v1_1.md Section 7.5 before touching anything.
Close when: EF deployed, PDF accessible from IFRS Statements screen via Download button.

### LOOP-FIN-003 — Revenue VAT Exclusion (GAP-01 from FIN-AUDIT_v1_0.md)
Status: OPEN · Code fix · Ref: docs/FIN-AUDIT_v1_0.md Section 3
Priority: HIGH — every CA will spot this immediately

Issue: Revenue shown as VAT-inclusive (R473,480 actual → should be ~R411,722 ex-VAT)
Impact: Revenue overstated by 15% (~R61,758). Every downstream metric wrong.
Fix: In HQProfitLoss.js and HQFinancialStatements.js, divide order revenue by 1.15
     where tenant is VAT-registered (check tenant_config.vat_registered first).
     Non-VAT-registered tenants show raw totals.
Effort: ~30 min. Verified by: P&L revenue drops ~15%, gross margin % increases.

### LOOP-FIN-004 — Trial Balance Excel Export (CA working papers format)
Status: OPEN · Nice-to-have for demo
Priority: MEDIUM — CAs import TB into Sage/MYOB for working papers

Issue: Trial Balance export exists as CSV only. CAs need Excel (.xlsx) with:
  - Account code | Account name | Account type | Debit | Credit | Net
  - Sorted by account code
  - Formatted for direct import into Sage One / MYOB / Xero
Current: CSV export button exists on IFRS Statements screen
Fix: Add .xlsx export using existing chart_of_accounts data + journal_lines
     Ref: WP-FINANCIALS-v1_1.md Section 7 Excel Export spec
Effort: ~2 hours (use SheetJS in HQFinancialStatements.js)

### LOOP-FIN-005 — Provisional Tax + Compliance Calendar display
Status: OPEN · Post-demo backlog unless session time permits
Priority: LOW for 12 May · HIGH for first paying CA client

What a CA needs that we don't show:
  a) Provisional tax calculation:
     - IRP6 due dates: 31 Aug 2026 (1st payment) + 28 Feb 2027 (2nd)
     - Estimate: net_profit × 28% (corporate tax rate) / 2 per payment
     - Display on P&L as "Estimated Tax Provision" line
  b) Compliance calendar:
     - VAT due dates per period (bi-monthly = every 2 months + 25 days)
     - Year-end deadline (based on financial_year_end in tenant_config)
     - PAYE submissions (if staff payroll active — 7th of following month)
  c) SARS IT14 code mapping:
     - Every chart_of_accounts row needs a SARS IT14 code
     - Required for income tax return submission
     - Currently: 40 COA rows, 0 have IT14 codes
Ref: Session (3877e713) — "What nobody has built" panel.
Build estimate: 1 session for provisional tax + basic calendar.

---

## WATCH ITEMS

### WATCH-001 — SAHPRA export CSV format
Implemented — not yet tested against real SAHPRA submission requirements.

### WATCH-002 — Scan activity chart cross-tenant (LL-056)
scan_logs has no tenant_id column — permanent limitation.

### WATCH-003 — HQTransfer.js atomicity gap
Per-line loop on ship/receive with no transaction wrapper.
Partial failures can leave transfers inconsistent.
Named future build item. Not blocking demo.

### WATCH-004 — Eybna unpriced products
HC-0002, BB-LYCHEE-0002, 6-PH-0002 still no sell price.
Action: Admin Stock → set sell prices for these 3 items.

---

## BACKLOG — FUTURE BUILD ITEMS (post-demo, no date constraint)

### BACKLOG-001 — Contextual action intelligence in the breadcrumb header
Logged: 15 April 2026 · Session 262 nav audit
Context: The TenantPortal breadcrumb bar (48px, below GlobalSearch) currently
  shows WHERE the user is (Home › Financials › Balance Sheet) but not WHAT
  they should do next. The next-generation upgrade is a per-tab context registry
  that feeds the breadcrumb area with 1-3 relevant quick actions:
  Example: Balance Sheet → "▶ Run depreciation · Last updated: today · FY2026 ✓"
  Example: Daily Trading → "▶ Cash-Up · Yesterday R12,450 · Trend: ↑ 8%"
  Example: VAT → "▶ File VAT201 · Period P4 overdue · R14,230 payable"
Architecture: A CONTEXT_REGISTRY constant (tabId → { actions, metrics }) in
  TenantPortal.js feeds the breadcrumb strip. Actions call setActiveTab() or
  open modals. Metrics are fetched by the AINSBar intelligence layer and passed
  down as props — no new DB calls needed.
Impact on demo: CA sees the system anticipate their next action. Positions NuAi
  as genuinely intelligent, not just a data dashboard.
Build cost: Medium. Requires a context registry + breadcrumb upgrade + wiring
  to existing useNavIntelligence data. No DB changes. No new EFs.
Pre-requisite: Complete WP-UNIFY Tier 1 first (breadcrumb bar needs to be on
  token system before adding components to it).

---

### BACKLOG-003 — WP-TENANT-GROUPS outstanding items (post-demo)
Logged: 15 April 2026 · Session 262

Group "NuAi Demo Portfolio" (a55373b2) now has 6 members:
  Medi Can Dispensary (franchisor) · Medi Recreational · The Garden Bistro
  Nourish Kitchen & Deli · MediCare Dispensary · Metro Hardware (Pty) Ltd
All 5 demo tenants with complete financials are in the group.
Group Portal button wired into every tenant sidebar (TenantPortal.js hasGroup).
RLS fix applied: member_can_read_own_group policy on tenant_groups.

Outstanding items — do not chase before 12 May unless time permits:

  GP-001 — Shared Loyalty tab: disabled (Phase 2 label in NAV_ITEMS).
    Requires loyalty_group_id schema addition to loyalty_transactions.
    Customer earns at Store A, redeems at Store B across the network.
    Build estimate: 1 session (schema + edge function + tab component).

  GP-002 — Combined P&L cross-industry aggregation needs review.
    The group now has 4 industry profiles (cannabis_retail, cannabis_dispensary,
    food_beverage, general_retail). CombinedPL.js uses tenant_financial_period RPC
    for each member. Verify the RPC returns correct figures for each profile.
    Dispensary revenue = dispensing_log (LL-231). Check CombinedPL handles this.

  GP-003 — GroupTransfer.js atomicity gap (LL-243 open).
    Per-line ship/receive loop has no DB transaction wrapper.
    Partial failures can leave transfers inconsistent. Named future build item.

  GP-004 — Invite-by-email for new stores (LL-243).
    GroupSettings Phase 5 only supports adding existing tenants by UUID paste.
    A new EF is needed to atomically create tenant + insert group membership.
    Build estimate: 1 session.

  GP-005 — Network Intelligence royalty calculations.
    royalty_percentage column exists (numeric) but no calculation runs against it.
    Royalty tracking = network_revenue × royalty_percentage per franchisee.
    Currently shows 0.00% for all members.

  GP-006 — Revenue Intelligence / Stock Intelligence cross-tenant RLS.
    These components query inventory_items, orders, stock_movements across
    all group members. Verify is_hq_user() bypass is not required for
    the group owner viewing member data (member_can_see_group covers reads
    but the joined table queries may hit per-table RLS).

---

## CLOSED LOOPS — SESSION 284 (15 April 2026)

### ✅ CLOSED — LOOP-DS6-001: TenantPortal INNER maxWidth causes grey side-strips
Session 284
TenantPortal INNER maxWidth causes grey side-strips at wide viewports
and any zoom level below 100%. Fixed Session 284 — removed maxWidth from INNER const.
Content now pins edge to edge at every zoom level, matching Group Portal behaviour.
Rule added to docs/NUAI-VISUAL-SPEC.md Part 7.2.

### ✅ CLOSED — LOOP-DS6-002: HQLoyalty white middleman box
Session 284 · 366dcc3
HQLoyalty outer div background: T.surface creating white rectangle over grey
AppShell chrome. CLOSED. Root cause: tab components must not set background
on outermost div (LL-267). Fix: outer div → transparent, page header → transparent.

### ✅ CLOSED — LOOP-DS6-003: HQDashboard missing grey wrapper
Session 284 · e216d4d
All 40+ HQ tabs rendered without background: T.bg context, making tab content
appear inside a white box. CLOSED. Fix: added background: T.bg to content
wrapper div in HQDashboard.js. Pattern matches TenantPortal.

---

## CLOSED LOOPS — SESSION 282 (15 April 2026)

### ✅ CLOSED — DOC-001: SESSION-START-PROMPT.md stale entry point
Session 282 · 15 April 2026
Root cause: NEXT-SESSION-PROMPT_v282.md was created instead of updating
SESSION-START-PROMPT.md in-place. Left entry point at Session 261 state.
Fix: SESSION-START-PROMPT.md rewritten in-place with Session 282 state.
LL-264 added to archive documenting the pattern and how to avoid it.
The versioned NEXT-SESSION-PROMPT_v282.md is a historical record only —
it is NOT the entry point. SESSION-START-PROMPT.md IS the entry point.


### ✅ CLOSED — CC-07: Group Portal button unconditional render
Session 282 · commit 93cdf5f · src/pages/TenantPortal.js
Removed hasGroup async gate. Button always renders. GroupPortal.js handles empty state.
Fixed Unicode escape bugs in JSX.

### ✅ CLOSED — CC-08: Group Portal in ADMIN_PAGES
Session 282 · src/hooks/useNavConfig.js
Added Group Portal to ADMIN_PAGES Platform section (was HQ_PAGES only).
Lesson LL-258: check ALL 4 nav arrays when adding nav items.

### ✅ CLOSED — CC-09: RLS infinite recursion on tenant_groups
Session 282 · Supabase MCP (no code commit)
Dropped recursive policy. Created get_my_group_ids() SECURITY DEFINER function.
New policy calls function. Lesson LL-262.

### ✅ CLOSED — CC-10: StoreComparison bar chart colors
Session 282 · commit cffb546 · src/components/group/StoreComparison.js
T.neutralLight (≈ white) replaced with BAR_PALETTE (6 distinct colors).
barColor embedded in chartData. tenantId added to useMemo deps. Lesson LL-263.

### ✅ CLOSED — Local git sync recovery
Session 282 · no commit (local fix only)
git pull failed. Recovered with: git fetch + reset --hard origin/main + npm install.
Lessons LL-260, LL-261.

---

## CLOSED LOOPS — SESSION 262

### ✅ CLOSED — CC-06: Group Portal — all 5 demo tenants linked + nav bar wired
Session 262 · 15 April 2026

DB changes (Supabase MCP — no code commit):
  - Added 4 tenants to group a55373b2 (NuAi Demo Portfolio):
    The Garden Bistro (franchisee) · Nourish Kitchen & Deli (franchisee)
    MediCare Dispensary (franchisee) · Metro Hardware (franchisee)
  - Renamed group: "Medi Can Franchise Network" → "NuAi Demo Portfolio"
  - Changed group_type: "franchise" → "portfolio"
  - Created RLS policy "member_can_read_own_group" on tenant_groups:
    FOR SELECT USING (id IN (SELECT group_id FROM tenant_group_members
    WHERE tenant_id = user_tenant_id()))
    Without this, franchisee tenants got null on the tenant_groups join in GroupPortal.js.

Code change (this commit · TenantPortal.js):
  - hasGroup state: fetches tenant_group_members count on mount.
  - "⊞ Group Portal" button in sidebar header, below profile badge.
    Styled in pAccent colour (profile-adaptive). Visible only when hasGroup = true.
    Sits above the existing "← HQ Operator View" button for HQ users.
  - Fixed pre-existing JSX escape bug on HQ Operator View arrow (`\u2190` literal
    was rendering as text; now wrapped in `{"\u2190"}` expression).

All 6 group members can now navigate to /group-portal from their tenant sidebar.
Combined P&L, Revenue Intelligence, Stock Intelligence, Customer Intelligence
and Network Intelligence all aggregate across all 6 members.

### ✅ CLOSED — CC-05: Tenant Portal nav — Reports split + hr-dashboard fix
Session 262 · 15 April 2026
Two changes to src/pages/TenantPortal.js CANNABIS_RETAIL_WATERFALL:
  (a) "Reports" (15-item section) split into "Financials" (11 items: accounting
      operations + IFRS outputs) and "Analytics" (4 items: insights + planning).
      Section id "intelligence" kept for Financials to preserve breadcrumb
      history. New section id "analytics" added. CANNABIS_ROLE_SECTIONS
      updated to whitelist "analytics" for admin role.
  (b) hr-dashboard tab removed from Team section — tab had no renderTab case
      and rendered the "coming soon" fallback. CA-critical fix.
Applies to: CANNABIS_RETAIL_WATERFALL only. Other waterfalls unchanged this session.

---

## CLOSED LOOPS — SESSION 261

### ✅ CLOSED — SB-FIX-001: Metro Hardware VAT number
Corrected 4123456789 → 4987654321 in tenant_config. All 4 demo tenant
VAT numbers now unique. Verified: SELECT vat_number, COUNT(*) GROUP BY returns 0 duplicates.

### ✅ CLOSED — SB-FIX-002: Medi Rec equity_ledger net_profit
Updated 102,018.88 → 107,485.66. Total equity now R268,559.88.
BS gap reduced R10,567 → ~R5,101 (POS VAT pipeline only).

### ✅ CLOSED — SB-FIX-003: Nourish Kitchen April expenses
6 expenses inserted. Total expenses 6 → 12 rows, R76k → R151.3k.

### ✅ CLOSED — SB-FIX-004: Nourish Kitchen April depreciation
3 dep entries for period '4'/2026. fixed_assets register updated.
Accum dep: R1,513.89 → R3,027.78. NBV: R127,486.11 → R125,972.22.

### ✅ CLOSED — SB-FIX-005: Nourish Kitchen journals
DEP-FY2026 + OPEX-2026-03 + OPEX-2026-04 posted with balanced journal lines.
Journal count: 1 → 4.

### ✅ CLOSED — SB-FIX-006: Medi Rec stale auto-capture journals
314859 ×2 (Nov 2024) and 314959 (Nov 2022) → reversed.
Journal list now shows 11 posted, 3 reversed.

### ✅ CLOSED — SB-FIX-007: Bank recon MediCare (9 lines)
7 expense lines + 2 dispensing deposit (order) lines categorised.
matched_type = null/'unmatched' → 0 remaining.

### ✅ CLOSED — SB-FIX-008: Bank recon Metro Hardware (9 lines)
8 expense lines + 1 wholesale deposit (order) line categorised. 0 remaining.

### ✅ CLOSED — SB-FIX-009: Bank recon Medi Recreational (8 lines)
3 'unmatched' flagged lines (bank fee, marketing, SARS VAT) → expense.
5 null sim-batch lines → other/order as appropriate. 0 remaining.

### ✅ CLOSED — CC-01: Fixed Asset monthsBehind counter
HQFixedAssets.js monthsBehind() rewritten. Compares MAX posted period
to last complete calendar month. Three call sites updated.

### ✅ CLOSED — CC-02: CF depreciation add-back (verified, no change needed)
HQFinancialStatements.js already reads depreciation_entries as primary source.
Nourish Kitchen dep entries will surface correctly.

### ✅ CLOSED — CC-03: IFRS Note 4 dispensary revenue
HQFinancialNotes.js Note 4 now reads dispensing_log for cannabis_dispensary.
Reports "Dispensing (N events)" row. Needs prod verification (LOOP-014).

### ✅ CLOSED — CC-04: IFRS BS VAT sign logic
HQFinancialStatements.js computes vatNetPayable signed.
vatReceivable in current assets, vatLiability in liabilities. Correct for all profiles.

### ✅ CLOSED — All 4 fin packages (Sessions 260-261)
Garden Bistro (260) · Medi Recreational (261) · Nourish Kitchen (261)
MediCare Dispensary (261) · Metro Hardware (261)

### ✅ CLOSED — SECURITY VL-013 (Session 261)
Service_role key leaked via git add -A. Key rotated. .env untracked.
LL-246 added to Bible. New key: production_2026_04.

### ✅ CLOSED-001 through CLOSED-008 (Sessions 259-260)
See prior SESSION-STATE versions for detail.
