# SESSION STATE v262
## Produced: 13 April 2026 — WP-DEMO-AUDIT Garden Bistro COMPLETE
## HEAD: update after push

---

### CURRENT PRIORITY
CA demo 12 May 2026. Garden Bistro complete. MediCare Dispensary next.

---

### GARDEN BISTRO — FINAL STATE
tenant_id: 7d50ea34-9bb2-46da-825a-956d0e4023e1

| Table | Rows | Notes |
|---|---|---|
| orders | 3,778 | Nov 2025-May 12. Demo day: 22 orders lunch+dinner |
| orders May 2026 | 330 | Strong recovery month |
| orders May 12 demo | 22 | Lunch 12:05-14:40 + dinner 18:15-21:30 |
| expenses | 30 | Nov 2025-Apr 2026, R476k OPEX |
| journal_entries | 9 | OPEX spine + produce purchases + depreciation |
| invoices | 7 | R71k outstanding (Constantia Valley Estate slow-pay) |
| purchase_orders | 4 | 3 received, 1 confirmed (Apr 8 in transit) |
| fixed_assets | 4 | Combi Oven R185k + Blast Freezer R68k + Fitout R320k + POS R28.5k |
| timesheets | 18 | 4 staff x Nov 2025-Apr 2026 |
| leave_requests | 3 | Marco Jan (approved), Ayesha May (pending), Thabo Mar (approved) |
| food_recipes | 16 | Pre-seeded 12 + 4 new signature dishes with recipe lines |
| haccp_log_entries | 60 | 30 days monitoring, 2 delivery breaches logged |
| temperature_logs | 90 | 45 days walk-in fridge + blast freezer twice daily |
| user_profiles | 2 | Annette du Plessis (Gold) + Freda Elf (Silver) |
| loyalty_transactions | 10 | Earn history for both members |

Business rescue narrative: R71k outstanding from Constantia Valley Estate. Load shedding drove Jan/Feb utilities up. Recovery visible in May.

F&B compliance: 3 HACCP CCPs active, 60 log entries, 2 documented delivery breaches with corrective action, 90 temperature readings all within limits.

---

### TENANT REGISTRY
| Tenant | tenant_id | Status |
|---|---|---|
| Metro Hardware | 57156762-deb8-4721-a1f3-0c6d7c2a67d8 | COMPLETE |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | COMPLETE |
| The Garden Bistro | 7d50ea34-9bb2-46da-825a-956d0e4023e1 | COMPLETE |
| MediCare Dispensary | 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b | NEXT |

### NEXT SESSION — MediCare Dispensary
Run full data audit SQL for 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b.
cannabis_dispensary profile — revenue from dispensing_log not orders (LL-231).
Will need: patients, prescriptions, dispensing_log, invoices, journals, staff, HR, demo day.
Medi Can Dispensary (2bd41eb7) has seed_complete=true — DO NOT TOUCH (LL-227).

### ALL ACTIVE RULES
RULE 0Q · LL-203 · LL-205 · LL-206 · LL-221
LL-NEW-1 through LL-NEW-5 · UNIFY-1 through UNIFY-8
cold_chain_locations.location_type: refrigerated / frozen / ambient
Fixed UUID IDs: hex only (0-9 a-f)
