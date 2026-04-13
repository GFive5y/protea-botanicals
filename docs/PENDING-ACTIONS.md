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
3. Update SESSION-START-PROMPT with new date
4. Re-examine all demo day seeded orders and dispensing events for date alignment

---

## OPEN LOOPS — MUST BE ACTIONED BEFORE DEMO

### LOOP-001 — sim-pos-sales: Run 30 days for retail tenants
Status: OPEN — not yet triggered
Trigger date: 11 May 2026 (= demo day minus 1) — RECALCULATE if date changes
Action: From HQTenants UI on the trigger date:
1. Metro Hardware -> RUN 30 DAYS
2. Medi Recreational -> RUN 30 DAYS
Why that date: 30-day window must INCLUDE the actual demo day.
Alternative: Supabase Studio -> Edge Functions -> sim-pos-sales -> Invoke
Close when: sim-pos-sales has been run for both tenants AND demo confirmed done.

### LOOP-002 — Visual verify all 4 dashboards after tenant isolation fixes
Status: OPEN — fixes landed (ae5a3ce, dcd9569, c1b3c5b), not yet verified
Action: Open each tenant portal, confirm zero cross-tenant data bleed.
Close when: All 4 dashboards verified clean.


---

## WATCH ITEMS — Monitor, no immediate action required

### WATCH-001 — SAHPRA export CSV format
Status: Implemented — not yet tested against real SAHPRA submission requirements

### WATCH-002 — Scan activity chart (scan_logs cross-tenant, LL-056)
Status: Known permanent limitation — scan_logs has no tenant_id column

---

## CLOSED LOOPS

### CLOSED-008 — Layer 1 audit pass (exit code 0)
Closed: 13 April 2026
All tenant-scoped queries in all HQ components have explicit .eq("tenant_id", tenantId).

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
