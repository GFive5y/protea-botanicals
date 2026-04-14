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

## WATCH ITEMS

### WATCH-001 — SAHPRA export CSV format
Implemented — not yet tested against real SAHPRA submission requirements.

### WATCH-002 — Scan activity chart cross-tenant (LL-056)
scan_logs has no tenant_id column — permanent limitation.

### WATCH-003 — HQTransfer.js atomicity gap
Per-line loop on ship/receive with no transaction wrapper.
Partial failures can leave transfers inconsistent.
Named future build item. Not blocking demo.

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
