# SESSION STATE v261
## Produced: 13 April 2026 — WP-DEMO-AUDIT Garden Bistro partial
## HEAD: update after push

---

### CRITICAL DISCOVERY THIS SESSION
**Garden Bistro correct tenant_id: 7d50ea34-9bb2-46da-825a-956d0e4023e1**
The SESSION-START-PROMPT and docs had wrong UUID suffix (ce9f instead of 9bb2).
All previous seeding references to 7d50ea34-ce9f were hitting a non-existent tenant.

**Existing data confirmed on correct UUID:**
- orders: 3,388 (Nov 2025-Apr 10) avg R208/cover — correct for restaurant
- expenses: 30 rows, R476k, Nov 2025-Apr 2026
- inventory_items: 12 (menu items)
- staff_profiles: 4 — Marco De Villiers (Head Chef), Ayesha Patel (Sous Chef), Thabo Molefe (Sr Waiter), Lisa van Wyk (Jr Waiter)
- leave_types: Annual Leave
- leave_balances: 4
- bank_accounts: 1 (Nedbank)

**Seeded this session:**
- fixed_assets: 4 (Combi Oven R185k, Blast Freezer R68k, Fitout R320k, POS R28.5k)
- journal_entries: 9
- journal_lines: 46
- invoices: 7 (3 paid, 2 overdue, 2 sent — R39k outstanding)
- purchase_orders: 4 (3 received, 1 confirmed)
- timesheets: 18 (4 staff x Nov 2025-Apr 2026)
- leave_requests: 3

**UUID rule discovered:** Fixed IDs must use pure hex chars (0-9, a-f only).
'rr000001...' fails — 'r' is not valid hex. Use 'aa110001...' pattern only.

**STILL MISSING for Garden Bistro — next session priority:**
- food_recipes + food_recipe_lines
- haccp_control_points + haccp_log_entries
- cold_chain_locations + temperature_logs
- user_profiles (loyalty members)
- loyalty_transactions
- orders Apr 11-13 + May 1-12 + demo day
- vat_transactions + period_filings

**Also fixed this session:** HQOverview.js — 7 orders queries now have .eq('tenant_id', tenantId) filter

### TENANT REGISTRY
| Tenant | Correct tenant_id | Status |
|---|---|---|
| Metro Hardware | 57156762-deb8-4721-a1f3-0c6d7c2a67d8 | COMPLETE |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | COMPLETE |
| The Garden Bistro | 7d50ea34-9bb2-46da-825a-956d0e4023e1 | ~70% done |
| MediCare Dispensary | 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b | NOT STARTED |

### ALL ACTIVE RULES
RULE 0Q · LL-203 · LL-205 · LL-206 · LL-221
LL-NEW-1 through LL-NEW-5 · UNIFY-1 through UNIFY-8
Fixed UUIDs: hex only (0-9 a-f). Pattern aa110001-0000-4000-8000-000000000001
