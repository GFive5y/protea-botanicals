# SESSION STATE v258
## Produced: 13 April 2026 — WP-DEMO-AUDIT Metro Hardware complete
## HEAD: update after push

---

### CURRENT PRIORITY
CA business rescue demo — 12 May 2026
**WP-DEMO-AUDIT active.** Metro Hardware COMPLETE. Next: Medi Recreational.

---

### WHAT WAS DONE THIS SESSION (WP-DEMO-AUDIT — Metro Hardware)

All seeding via Supabase MCP. No code changes this session.
tenant_id: 57156762-deb8-4721-a1f3-0c6d7c2a67d8

| Table | Result | Notes |
|---|---|---|
| fixed_assets | 4 rows | Racking/Van/Forklift/POS — R378k cost, R234k NBV |
| invoices | 9 rows | R201,631 outstanding — Kempton Park Municipality 60-134 days overdue |
| journal_entries | 10 rows | 6x monthly OPEX + 3x stock purchase + 1x annual depreciation |
| journal_lines | 56 rows | Balanced double-entry |
| expenses | 46 total | Backfilled Oct 2025-Jan 2026 |
| stock_movements | 70 rows | 3 purchase_in batches |
| vat_period_filings | 4 total | P5+P6+P1 filed — P2 outstanding |
| loyalty_config | seeded | Was missing — now configured |
| user_profiles | updated | Johan van der Merwe, Platinum |
| timesheets | 14 rows | Oct 2025-Apr 2026, hr_approved + staff_submitted |
| leave_requests | 3 rows | 2 approved historical, 1 pending (Thabo May 5-9) |
| leave_balances | updated | Thabo used=7 pending=5 / Linda used=4 |
| orders | 786 total | Oct 2025-May 12 2026. Demo day: 12 orders R54k |
| loyalty_transactions | 256 total | earn_purchase for all orders |
| purchase_orders | 6 existing | Already seeded — verified, notes updated, line totals fixed |
| purchase_order_items | 27 existing | unit_cost corrected to realistic wholesale prices, qty recalculated |

**PO status at close:**
- PO-MH-20251015 received R180k — bulk hardware consumables (850 units, 48 SKUs)
- PO-MH-20251205 received R95k — power tools year-end restock
- PO-MH-20260210 received R120k — building materials & plumbing
- PO-MH-20260315 complete R158k — seasonal restock
- PO-MH-20260401 confirmed R88k — power tools in transit (live pipeline)
- PO-MH-20260412 submitted R52k — hand tools + PPE (raised yesterday)

**New LL rules from this session:**
- timesheets.status: draft / staff_submitted / admin_approved / admin_rejected / hr_approved / locked
- leave_requests.status: pending / admin_approved / rejected / cancelled / approved / cert_pending
- purchase_order_items.line_total is GENERATED (quantity_ordered x unit_cost) — never UPDATE it directly

---

### TENANT REGISTRY
| Tenant | Industry | Status |
|---|---|---|
| Metro Hardware (57156762) | general_retail | COMPLETE |
| Medi Recreational (b1bad266) | cannabis_retail | NEXT |
| The Garden Bistro (7d50ea34) | food_beverage | NOT STARTED |
| MediCare Dispensary (8b9cb8e6) | cannabis_dispensary | NOT STARTED |

---

### NEXT SESSION — Medi Recreational
Run WP-DEMO-AUDIT data audit SQL for b1bad266-ceb4-4558-bbc3-22cfeeeafe74.
Known from bible: 50 mock customers, ~250 loyalty transactions, 5 journal entries.
Expected gaps: invoices, stock movements, full OPEX spine, demo day orders, HR.

### ALL ACTIVE RULES
RULE 0Q · LL-203 · LL-205 · LL-206 · LL-221
LL-NEW-1 through LL-NEW-5 · UNIFY-1 through UNIFY-8
