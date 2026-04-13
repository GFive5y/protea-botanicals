# SESSION STATE v259
## Produced: 13 April 2026 — WP-DEMO-AUDIT Medi Recreational complete
## HEAD: update after push

---

### CURRENT PRIORITY
CA business rescue demo — 12 May 2026
**WP-DEMO-AUDIT active.** Medi Recreational COMPLETE. Next: The Garden Bistro.

---

### WHAT WAS DONE THIS SESSION (WP-DEMO-AUDIT — Medi Recreational)

All seeding via Supabase MCP. No code changes.
tenant_id: b1bad266-ceb4-4558-bbc3-22cfeeeafe74

| Table | Result | Notes |
|---|---|---|
| leave_types | 1 seeded | Annual Leave (AL), 15 days/cycle — was missing |
| leave_balances | 2 seeded | Gerhardt used=3 pending=5 / Sipho used=5 |
| leave_requests | 3 seeded | Gerhardt Jan (approved) + Sipho Jan (approved) + Gerhardt May (pending) |
| vat_period_filings | fixed | P2 submission_ref was null — patched to VR2026P2-MEDREC |
| journal_entries | 14 total | 5x OPEX + 3x stock purchase + 1x depreciation (+ 5 legacy Smart Capture) |
| journal_lines | 76 total | Balanced double-entry for all new journals |
| invoices | 8 | 3 paid, 3 overdue, 2 sent — R51,500 outstanding (Sea Point Social Club slow-pay) |
| purchase_orders | 4 (replaced) | Deleted 2 empty stubs, inserted 4 real supplier POs with full descriptions |
| timesheets | 12 | Deleted orphan draft, replaced with Gerhardt + Sipho Nov 2025-Apr 2026 |
| orders | 1,940 total | Added Apr 11-13 (30) + May 1-11 (110) + May 12 demo day (12) |

**Business rescue narrative:**
- Revenue R1.78M across 6 months, strong loyalty programme (51 customers, Harvest Club member)
- VAT P3 (R45,652 output) outstanding — this is the CA hook (not filed, showing as arrears)
- R51,500 in outstanding invoices — Sea Point Social Club 90+ and 30-60 day buckets
- Demo day May 12: 12 orders R12,850 by 17:08, evening-weighted POS trading live

**New LL rules from this session:**
- leave_types columns: code, days_per_cycle, cycle_months, accrual_per_month, carryover_days (NOT days_per_year)
- Always DELETE empty PO stubs before inserting real ones — empty purchase_order_items make POs unpresentable

---

### TENANT REGISTRY
| Tenant | Industry | Status |
|---|---|---|
| Metro Hardware (57156762) | general_retail | COMPLETE |
| Medi Recreational (b1bad266) | cannabis_retail | COMPLETE |
| The Garden Bistro (7d50ea34) | food_beverage | NEXT |
| MediCare Dispensary (8b9cb8e6) | cannabis_dispensary | NOT STARTED |

---

### NEXT SESSION — The Garden Bistro
Run WP-DEMO-AUDIT data audit SQL for 7d50ea34-...
Note: food_beverage profile — P&L uses food cost % benchmark (green >= 65% gross margin).
F&B screens: HACCP, Recipe Engine, Cold Chain, Nutrition Labels also need data.

### ALL ACTIVE RULES
RULE 0Q · LL-203 · LL-205 · LL-206 · LL-221
LL-NEW-1 through LL-NEW-5 · UNIFY-1 through UNIFY-8
