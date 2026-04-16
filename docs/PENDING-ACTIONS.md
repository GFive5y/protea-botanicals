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

- **11 May 2026**: Run sim-pos-sales for Metro Hardware + Medi Recreational
  HQTenants — RUN 30 DAYS, OR Supabase MCP pg_net.http_post to sim-pos-sales EF.
  Window must INCLUDE 12 May demo day.
- **12 May 2026 09:30**: Pre-demo ritual (see SESSION-START-PROMPT.md)
- **12 May 2026 10:00**: CA demo

---

## OUTSTANDING — MUST COMPLETE BEFORE 12 MAY 2026

### LOOP-011 — All 5 tenants: IFRS Statements Mark Reviewed + Sign-Off
Status: OPEN
Action: For each of 5 tenants — IFRS Statements — click Mark Reviewed
  on all 4 statements (IS, BS, Cash Flow, Changes in Equity) — Auditor Sign-Off.
  20 statements total.
Close when: All 20 marked Reviewed + Signed Off.

---

## KNOWN PERMANENT GAPS (document and explain in demo — do not fix before 12 May)

1. **POS VAT pipeline** — output VAT from POS orders not writing to vat_transactions.
   Root cause: POS transaction path does not call auto-post-capture EF.
   Impact: ~R5k BS gap per tenant (amber banner explains it).
   Why deferred: fixing requires touching live POS order flow + historical backfill.
   Regression risk outweighs cosmetic gap 4 weeks before demo.

2. **Cash flow opening balance not wired to bank recon** — cosmetic blank field.
   Requires prior-period closing balance snapshot table (does not exist).
   Not on demo critical path.

3. **Pricing data source red (0)** — no product_pricing records linked to recipes.
   Affects costing dashboard only. Not on demo critical path.

---

## CLOSED LOOPS — SESSION 287/288 (16 April 2026)

### CLOSED — LOOP-DS6-004: HQStock.js DS6 Phase 2b
Session 286 · Closed by Claude Code
All fontSize/fontWeight/borderRadius/section-label instances corrected.
DS6 complete across all primary surfaces.

### CLOSED — LOOP-FIN-002: PDF Audit Package EF
Session 287 · 95782e5
generate-financial-statements EF v1.0 deployed. 7-page A4 PDF via npm:pdf-lib.
Download PDF button live in HQFinancialStatements.js header. Storage bucket
`financial-statements` (private, 7-day signed URLs).

### CLOSED — LOOP-FIN-003: Revenue VAT Exclusion (GAP-01)
Session 287 · adfe712 · Already live — confirmed from disk
const VAT_RATE = 1.15 applied in HQProfitLoss.js at all revenue aggregation points.
EF inherits via pre-computed profileRevenue. No code change needed.

### CLOSED — LOOP-NEW-005: MediCare Revenue MTD = R0
Session 288 · a447f74 · src/components/hq/HQOverview.js
Root cause: `inventory_items(sell_price)` left-join returned null sell_price +
`.neq("is_voided", true)` silently excluded NULL rows.
Fix: `inventory_items!inner(sell_price)` + `.eq("is_voided", false)`.
Verified: 74 events · R98,525 in last 30 days · tile now shows correct figure.
Lesson: LL-269, LL-270.

### CLOSED — LOOP-NEW-006: MediCare IFRS BS gap
Session 288 · Supabase MCP (no code commit)
Root: equity_ledger.net_profit_for_year = -418,979 (stale seed). IFRS IS
calculates -263,672.76 from live dispensing_log x sell_price data.
Fix: UPDATE net_profit_for_year = -263,672.76.
Then recalibrated share_capital = 623,022.64 so BS balances (LL-273).
Result: total_equity = R359,349.88 = total_assets. Residual gap = R0.
Data state: equity_ledger FY2026 · net_profit -263,672.76 · sc 623,022.64.

### CLOSED — LOOP-014: MediCare IFRS IS dispensing revenue — prod verification
Session 288 · Visual verification via PDF download
IS Revenue row: R313,935 from dispensing_log. Net Loss: -R263,672.76.
BS: Assets = L+E = R359,349.88. Changes in Equity: consistent.
All 4 IFRS statements correct for MediCare Dispensary.

### CLOSED — LOOP-012: HR top-up 3 tenants
Session 288 · Supabase MCP (no code commit)
Staff counts were already at target (Medi Rec 4, MediCare 3, Metro 4).
5 staff missing contracts + leave_balances:
  Ayanda Khumalo (Medi Rec, Budtender) — R8,000/mo
  Ruan Pieterse (Medi Rec, Floor Supervisor) — R12,000/mo
  Fatima Davids (MediCare, Receptionist) — R9,500/mo
  Bongani Zulu (Metro, Sales Assistant) — R8,500/mo
  Chantelle October (Metro, Cashier) — R8,000/mo
All 5 now have: employment_contracts (permanent, monthly, 8h/5d, 30d notice,
start 2026-01-01) + leave_balances (15 days Annual Leave, BCEA, cycle 2026).
leave_balances.available was NOT included in INSERT (LL-271 — GENERATED column).

### CLOSED — LOOP-010: Medi Rec Run Depreciation
Session 288 · Supabase MCP (no code commit)
Deleted incorrect Apr 2026 entries (wrong accum_dep_after values).
Inserted all gap months to bring each asset current through Apr 2026:
  FA-001 Display Refrigerator (R200/mo): 15 months inserted (Feb 2025-Apr 2026)
    accum_dep: R2,600 -> R5,400 · NBV: R12,500 -> R7,100
  FA-002 Security Camera (R247.22/mo): 18 months inserted (Nov 2024-Apr 2026)
    accum_dep: R2,222.78 -> R6,425.52 · NBV: R8,900 -> R2,474.48
  FA-003 Shop Fitout (R375/mo): 24 months inserted (May 2024-Apr 2026)
    accum_dep: R2,625 -> R11,250 · NBV: R45,000 -> R33,750
fixed_assets.accumulated_depreciation + net_book_value updated for all 3.
All period_month values stored as numeric strings per LL-247.

### CLOSED — LOOP-015: Loyalty warning banner
Session 288 · Supabase MCP (no code commit)
Symptom: Warning banner on some tenant portals (MediCare, Nourish, Garden Bistro).
Root cause: 3 tenants missing loyalty_config rows.
Source component: NOT IDENTIFIED after exhaustive 15-file search (LL-274).
Fix: Inserted loyalty_config rows (standard schema) for all 3 missing tenants.
All 5 demo tenants now have loyalty_config. Banner resolved.
See LL-274 for data-first diagnostic rule.

---

## CLOSED LOOPS — SESSION 284 (15 April 2026)

### CLOSED — LOOP-DS6-001: TenantPortal INNER maxWidth causes grey side-strips
Session 284

### CLOSED — LOOP-DS6-002: HQLoyalty white middleman box
Session 284 · 366dcc3

### CLOSED — LOOP-DS6-003: HQDashboard missing grey wrapper
Session 284 · e216d4d

---

## CLOSED LOOPS — SESSION 282 (15 April 2026)

### CLOSED — DOC-001: SESSION-START-PROMPT.md stale entry point
Session 282

### CLOSED — CC-07 through CC-10 (Group Portal fixes)
Session 282

---

## CLOSED LOOPS — SESSION 262

### CLOSED — CC-06: Group Portal — all 5 demo tenants linked + nav bar wired
Session 262 · 15 April 2026

### CLOSED — CC-05: Tenant Portal nav — Reports split + hr-dashboard fix
Session 262 · 15 April 2026

---

## CLOSED LOOPS — SESSION 261

### CLOSED — SB-FIX-001 through SB-FIX-009, CC-01 through CC-04
Session 261 · All fin packages, bank recons, IFRS fixes

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
Action: Admin Stock — set sell prices for these 3 items.

---

## BACKLOG — FUTURE BUILD ITEMS (post-demo, no date constraint)

### LOOP-FIN-004 — Trial Balance Excel Export (CA working papers format)
Status: OPEN · Nice-to-have for demo
Priority: MEDIUM — CAs import TB into Sage/MYOB for working papers
Fix: Add .xlsx export using existing chart_of_accounts data + journal_lines
     Ref: WP-FINANCIALS-v1_1.md Section 7 Excel Export spec
Effort: ~2 hours (use SheetJS in HQFinancialStatements.js)

### LOOP-FIN-005 — Provisional Tax + Compliance Calendar display
Status: OPEN · Post-demo backlog
Priority: LOW for 12 May · HIGH for first paying CA client

### BACKLOG-001 — Contextual action intelligence in the breadcrumb header
Logged: 15 April 2026 · Session 262

### BACKLOG-003 — WP-TENANT-GROUPS outstanding items (post-demo)
GP-001 through GP-006 — see prior versions for detail.
