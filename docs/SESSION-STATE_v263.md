# SESSION STATE v263
## Produced: 13 April 2026 — WP-DEMO-AUDIT ALL FOUR TENANTS COMPLETE
## HEAD: update after push

---

### WP-DEMO-AUDIT — COMPLETE

All 4 CA demo tenants are fully seeded. Demo date: 12 May 2026.

---

### MEDICARE DISPENSARY — FINAL STATE
tenant_id: 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b

| Table | Rows | Notes |
|---|---|---|
| dispensing_log | 192 | Jan 2026-May 12. Demo day: 8 events 08:30-12:00 |
| patients | 10 | All 10 complete with SAHPRA S21 data (H/I/J patched) |
| prescriptions | 14 | Mix of active and historical |
| inventory_items | 20 | Full clinical product range |
| fixed_assets | 3 | Fitout R85k + Fridge R18.5k + POS R24k |
| journal_entries | 6 | OPEX spine Jan-Mar + stock purchases + depreciation |
| invoices | 5 | R131k outstanding (March dispensing claim + CannaMed supplier) |
| purchase_orders | 3 | 2 received, 1 confirmed (Apr 8 SAHPRA batch pending) |
| staff_profiles | 2 | Pieter van Rensburg (Pharmacist) + Naledi Dlamini (Dispensary Asst) |
| timesheets | 6 | Both staff Jan-Apr 2026 |
| leave_requests | 2 | Pieter Feb CPD (approved) + Pieter May (pending) |
| vat_period_filings | 2 | P1 + P2 filed. Medical cannabis zero-rated output VAT. |

Business rescue narrative: R131k in outstanding receivables — Discovery Health
medical aid claim for March (R78k, 30 days overdue) + CannaMed supplier invoice
(R52k, 32 days overdue). Dispensing revenue R299k Jan-Mar + recovery in May.
Demo day: 8 clinical dispensing events from 08:30, live patient collections.

---

### ALL 4 TENANTS — COMPLETE
| Tenant | tenant_id | Industry | Status |
|---|---|---|---|
| Metro Hardware | 57156762-deb8-4721-a1f3-0c6d7c2a67d8 | general_retail | COMPLETE |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | cannabis_retail | COMPLETE |
| The Garden Bistro | 7d50ea34-9bb2-46da-825a-956d0e4023e1 | food_beverage | COMPLETE |
| MediCare Dispensary | 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b | cannabis_dispensary | COMPLETE |

### NEXT PRIORITIES (post-demo-audit)
1. Update SESSION-START-PROMPT with correct Garden Bistro UUID
2. SAHPRA export button — HQMedical Reports tab has no export
3. sim-pos-sales for demo day — run from HQTenants RUN 30 DAYS button
4. Verify all 4 tenant dashboards load cleanly after HQOverview fix (ae5a3ce)
5. MediCare Dispensary: RLS fix confirmed working

### ALL ACTIVE RULES
RULE 0Q · LL-203 · LL-205 · LL-206 · LL-221 · LL-226 · LL-227 · LL-231
LL-NEW-1 through LL-NEW-5 · UNIFY-1 through UNIFY-8
