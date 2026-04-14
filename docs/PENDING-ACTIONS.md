# PENDING-ACTIONS.md
## Single source of truth for all open, date-sensitive loops.
## READ THIS AT EVERY SESSION START — after SESSION-STATE.
## UPDATE THIS FILE when: meeting date changes, items complete, new items added.
## NEVER delete a row — move completed items to CLOSED LOOPS section.

---

## MEETING DATE — FLEXIBLE
**Current CA demo date: 12 May 2026**
User will notify when this changes. When it changes:
1. Update this file (meeting date line above)
2. Recalculate sim-pos-sales trigger date (= meeting date MINUS 1 day)
3. Update SESSION-STATE_v281 / SESSION-START-PROMPT with new date
4. Re-examine all demo day seeded orders and dispensing events for date alignment

---

## COMPLETED THIS SESSION (261) — DO NOT DELETE

- ✅ Garden Bistro fin package (complete since Session 260)
- ✅ Medi Recreational fin package (Session 261)
- ✅ MediCare Dispensary fin package (Session 261)
- ✅ Metro Hardware fin package (Session 261)
- ✅ Nourish Kitchen & Deli fin package (Session 261)
- ✅ Security incident VL-013 resolved (service_role key rotated, .env untracked)

---

## OUTSTANDING — MUST COMPLETE BEFORE 12 MAY 2026

### LOOP-010 — Medi Rec: Run Depreciation (UI action)
Status: OPEN — backfill DB seed done in Session 261, UI must still post
Action: /tenant-portal (Medi Rec) → Fixed Assets → Run Depreciation
  For each of 3 assets, step through every missing month from their
  respective purchase dates up to Apr 2026, in chronological order.
  The "Xmo behind" counter must reach 0.
Close when: No "Xmo behind" warning shows on Fixed Assets tab for
  FA-001 / FA-002 / FA-003.

### LOOP-011 — All 4 tenants: IFRS Statements Mark Reviewed + Sign-Off
Status: OPEN
Action: For each tenant portal (Garden Bistro, Medi Rec, MediCare,
  Metro Hardware, Nourish Kitchen):
  1. /tenant-portal → IFRS Statements
  2. Click "Mark Reviewed" on all 4 statements
     (IS, BS, Cash Flow, Changes in Equity)
  3. Complete Auditor Sign-Off where applicable
Close when: All 20 statements (4 statements × 5 tenants) marked Reviewed.

### LOOP-012 — HR top-up: 3 tenants below RUNBOOK minimum
Status: OPEN
Action: Add staff via Supabase MCP using RUNBOOK Phase 5 patterns
  (staff_profiles + employment_contracts + leave_balances + timesheets):
  - Medi Recreational: + Store Manager + Cashier (target = 4 staff)
  - MediCare Dispensary: + Receptionist (target = 3 staff)
  - Metro Hardware: + Store Manager + Stockroom (target = 4 staff)
Close when: All 3 tenants reach the RUNBOOK minimum for their industry
  profile with contracts, leave, and at least one timesheet each.

### LOOP-013 — .gitignore null byte cleanup
Status: RESOLVED IN SESSION 261/262 CLOSE COMMIT
Action: .gitignore rewritten as clean UTF-8, null bytes stripped
Close when: Commit landed — closed automatically.

### LOOP-014 — SESSION 262: verify MediCare IFRS IS shows dispensing revenue
Status: OPEN — code fix shipped in 0f6cfa0, needs prod verification
Action: After Vercel Ready on 0f6cfa0 (or later HEAD):
  1. Open /tenant-portal (MediCare) in incognito per LL-214
  2. IFRS Statements → Income Statement
  3. Confirm Revenue line shows dispensing_log-derived figure (not R0)
  4. Year-End Close → confirm same figure
Close when: MediCare IFRS IS revenue matches dispensing_log × sell_price
  per live DB query.

---

## STANDING — DEMO DAY SEQUENCE

- 📅 **11 May 2026**: Run sim-pos-sales for Metro Hardware + Medi Recreational
  (HQTenants → RUN 30 DAYS button, OR Supabase MCP pg_net.http_post to
  sim-pos-sales EF). Window must INCLUDE 12 May demo day.
- 📅 **12 May 2026**: CA demo — 10am
- 📅 **12 May 2026 09:30**: Pre-demo ritual per SESSION-STATE_v281
  (incognito visual checklist all 5 tenants)

---

## KNOWN PERMANENT GAPS (document, do not chase)

- POS VAT pipeline: output VAT from orders not in vat_transactions
- BS equation gap ~R5,617-9,140 per tenant (VAT pipeline — amber banner)
- Pricing data source red (no product_pricing linked to recipes)
- Cash flow opening balance not connected to bank recon
- MediCare IFRS double-counted wages (journal_lines + expenses)
- Medi Rec IFRS BS gap R1,466.78 (IS vs equity_ledger timing)
- Metro Hardware IFRS BS gap R362,311.50 (accrued OpEx in main BS only)

---

## WATCH ITEMS — Monitor, no immediate action required

### WATCH-001 — SAHPRA export CSV format
Status: Implemented — not yet tested against real SAHPRA submission requirements

### WATCH-002 — Scan activity chart (scan_logs cross-tenant, LL-056)
Status: Known permanent limitation — scan_logs has no tenant_id column

---

## CLOSED LOOPS

### CLOSED-LOOP-013 — .gitignore null byte cleanup
Closed: 14 April 2026 (session 261/262 close commit)
Null bytes stripped, file rewritten as clean UTF-8.

### CLOSED-SECURITY-VL-013 — Service role key leak (14 Apr 2026)
Closed: 14 April 2026
Key `default` deleted. New key `production_2026_04` created.
.env untracked. .gitignore hardened. LL-246 added to Bible.

### CLOSED-001 — WP-DEMO-AUDIT: All 4 tenants seeded
Closed: 13 April 2026

### CLOSED-002 — HQOverview.js: 20 tenant isolation fixes
Closed: 13 April 2026

### CLOSED-003 — HQProduction.js + all HQ components: tenant isolation
Closed: 13 April 2026

### CLOSED-004 — MediCare stock_receipts
Closed: 13 April 2026

### CLOSED-005 — SAHPRA export button
Closed: 13 April 2026

### CLOSED-006 — Dispensary category taxonomy fix
Closed: 13 April 2026

### CLOSED-007 — Session-start-prompt corrected
Closed: 13 April 2026

### CLOSED-008 — Layer 1 audit pass (exit code 0)
Closed: 13 April 2026
All tenant-scoped queries in all HQ components have explicit .eq("tenant_id", tenantId).
