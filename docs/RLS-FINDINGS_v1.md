# NuAi RLS Policy Audit Findings
## Session 314, 18 April 2026
## Scope: 401 policies across 120 tables in public schema
## Audit-only — no fixes applied

---

## Summary

| Severity | Count | Description |
|---|---|---|
| CRITICAL (Bucket A) | 6 | `using_clause = true` — any user reads/writes all tenants |
| CRITICAL (Bucket B) | 3 | `auth_is_admin()` without tenant_id — any admin cross-tenant |
| CRITICAL (Bucket C) | 53 | `is_hq_user()` bypass with non-standard naming (functional but audit gap) |
| HIGH | 37 | Valid tenant scope but missing `with_check` on write ops |
| MEDIUM | 11 | `is_admin()` without tenant scope, or staff-profile-only scope |
| LOW | 45 | Duplicate overlapping policies (no security impact) |
| NOT-A-BUG | 159 | Correctly scoped or intentional design patterns |
| **Total** | **314** | |

**Immediate action required:** 9 policies (Bucket A + B) are live cross-tenant
data exposures. These exist TODAY and any authenticated user can exploit them.

---

## CRITICAL — Bucket A: using_clause = true (6 findings)

These are genuinely broken. Any authenticated user reads/writes ALL tenants' data.

| ID | Table | Policy | Cmd | Fix |
|---|---|---|---|---|
| RLS-001 | inventory | Anyone can view inventory | SELECT | DROP (correct rls_inventory policy exists) |
| RLS-002 | local_inputs | hq_admin_all | ALL | Replace `true` with `is_hq_user()` |
| RLS-003 | loyalty_config | public_read_loyalty_config | SELECT | DROP or scope to tenant |
| RLS-004 | product_cogs | hq_all | ALL | Replace `true` with `is_hq_user()` |
| RLS-005 | product_pricing | hq_all | ALL | Replace `true` with `is_hq_user()` |
| RLS-006 | supplier_products | hq_admin_all | ALL | Replace `true` with `is_hq_user()` |

## CRITICAL — Bucket B: auth_is_admin() without tenant scope (3 findings)

`auth_is_admin()` is NOT tenant-aware. Any admin from any tenant gets access.

| ID | Table | Policy | Cmd | Fix |
|---|---|---|---|---|
| RLS-007 | loyalty_config | hq_all | ALL | Replace `auth_is_admin()` with `is_hq_user()` |
| RLS-008 | referral_codes | admin_all | ALL | Replace with `is_hq_user()` |
| RLS-009 | support_tickets | admin_all_tickets | ALL | Replace with `is_hq_user()` |

## CRITICAL — Bucket C: is_hq_user() with non-standard naming (53 findings)

These use the CORRECT bypass function (`is_hq_user()`) but policy names don't
follow the `hq_all_{tablename}` convention from LL-205. Functionally safe but
create an audit gap — can't distinguish intentional bypasses from accidental
overpermissions by name alone.

Affected tables (31): batches, disciplinary_records, employment_contracts,
hr_diary_entries, inventory_items, leave_types, loans_stipends,
loyalty_transactions, order_items, performance_reviews, production_batches,
production_inputs, products, roster_assignments, roster_weeks, scans,
shift_schedules, shift_templates, shipment_items, shipments, staff_messages,
staff_profiles, stock_movements, stock_transfers, tenant_config,
tenant_group_members, tenant_groups, tenants, timesheet_entries, timesheets,
travel_allowances.

**Recommended fix:** Rename to `hq_all_{tablename}` convention. No functional
change needed — these are DROP + CREATE with same using_clause, just new name.
LOW urgency. Can batch in a single cleanup session.

---

## HIGH — Missing with_check on write operations (37 findings)

Valid `using_clause` with tenant scoping but `with_check = NULL`. Means reads
are correctly filtered but writes (INSERT/UPDATE) are not validated against
tenant ownership. A compromised application layer could insert rows into
another tenant's space.

Concentrated in HR module (20 of 37) and stock-take module (6 of 37).

| ID Range | Tables | Count | Fix Pattern |
|---|---|---|---|
| RLS-010 to RLS-015 | disciplinary_records, employment_contracts | 6 | Add `WITH CHECK (using_clause)` |
| RLS-016 to RLS-022 | leave_balances, leave_requests, leave_types | 7 | Same |
| RLS-023 to RLS-027 | loans_stipends, performance_reviews | 5 | Same |
| RLS-028 to RLS-032 | shift_schedules, staff_documents, staff_messages, staff_notifications, staff_profiles | 5 | Same |
| RLS-033 to RLS-038 | stock_take_items, stock_take_schedules, stock_take_sessions | 6 | Same |
| RLS-039 to RLS-040 | system_alerts | 2 | Same |
| RLS-041 to RLS-046 | timesheet_entries, timesheets, travel_allowances | 6 | Same |

---

## MEDIUM — Role-only or staff-profile-only scope (11 findings)

| ID | Table | Policy | Issue |
|---|---|---|---|
| RLS-047 | customer_messages | admins_all_messages | auth_is_admin_for_messages() — no tenant scope |
| RLS-048 | email_logs | hq_all_email_logs | JWT role='hq' check — no tenant_id |
| RLS-049 | inventory_items | Admin full access | is_admin() only — no tenant scope |
| RLS-050 | inventory_items | Authenticated can update | category+is_active filter — any user, any tenant |
| RLS-051 | leave_requests | staff_leave_requests_own | staff_profile_id only — no tenant_id |
| RLS-052 | purchase_orders | Admin full access to POs | is_admin() only |
| RLS-053 | stock_movements | Admin full access | is_admin() only |
| RLS-054 | suppliers | Admin full access | is_admin() only |
| RLS-055 | timesheet_entries | staff_ts_entries_own | staff_profile_id only |
| RLS-056 | timesheets | staff_timesheets_own | staff_profile_id only |
| RLS-057 | travel_allowances | staff_travel_own | staff_profile_id only |

---

## LOW — Duplicate overlapping policies (45 findings)

No security impact (PERMISSIVE union means redundant allows). Concentrated in
HR module (timesheet_entries 6 duplicates, timesheets 5, staff_messages 5).
Cleanup only — consolidate to reduce RLS evaluation overhead and improve audit clarity.

---

## Fix Campaign Estimate

| Session | Scope | Findings | Risk |
|---|---|---|---|
| S314.1 | Bucket A + B (9 policies) | RLS-001 to 009 | IMMEDIATE — live cross-tenant exposure |
| S314.2 | MEDIUM is_admin() policies (7) | RLS-049 to 054 | HIGH — admin cross-tenant |
| S314.3 | HIGH missing with_check (37) | RLS-010 to 046 | MEDIUM — write validation gap |
| S314.4 | Bucket C naming + LOW cleanup (98) | 53 renames + 45 dedup | LOW — audit hygiene |

Estimated: 4 sessions. S314.1 is urgent. S314.2-3 are important. S314.4 is cleanup.

---

*RLS-FINDINGS_v1.md · NuAi · Session 314 · Audit-only*
