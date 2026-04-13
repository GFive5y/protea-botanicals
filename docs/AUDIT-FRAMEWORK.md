# NuAi Systematic Data Audit Framework
## Version 1.0 — Produced 13 April 2026
## Run before EVERY CA demo, investor session, or client onboarding

---

## THE ROOT CAUSE

The HQ operator uses `is_hq_user()` RLS bypass. `switchTenant()` only updates
React context — `auth.uid()` never changes. Any Supabase query without an explicit
`.eq("tenant_id", tenantId)` returns ALL-TENANT data when the HQ operator is
viewing a specific tenant.

**Rule: Every query against a tenant-scoped table MUST include `.eq("tenant_id", tenantId)`
explicitly, regardless of whether RLS would otherwise filter it.**

---

## THREE LAYERS

### Layer 1 — Static Code Analysis (automated, 2 min)
Run `python3 docs/audit_tenant_isolation.py` in Claude Code before any merge.
Outputs: FILE | LINE | TABLE | VERDICT (BLEED / PERMANENT / OK).

### Layer 2 — DB Count Verification (Supabase SQL, 10 sec)
Paste the relevant SQL block into Supabase Studio before demo.

### Layer 3 — Visual Checklist (human, 10 min)
Walk through each screen per industry profile. Check against DB truth.

---

## LAYER 2: DB TRUTH QUERIES

### MediCare Dispensary (cannabis_dispensary)
```sql
SELECT 'inventory_items', COUNT(*) FROM inventory_items WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_active=true
UNION ALL SELECT 'dispensing_log MTD', COUNT(*) FROM dispensing_log WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_voided=false AND dispensed_at >= date_trunc('month',now())
UNION ALL SELECT 'dispensing today', COUNT(*) FROM dispensing_log WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_voided=false AND dispensed_at::date=current_date
UNION ALL SELECT 'batches (must be 0)', COUNT(*) FROM batches WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_archived=false
UNION ALL SELECT 'patients', COUNT(*) FROM patients WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b'
UNION ALL SELECT 'low_stock_items', COUNT(*) FROM inventory_items WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_active=true AND reorder_level>0 AND quantity_on_hand<=reorder_level;
```

### Metro Hardware (general_retail)
```sql
SELECT 'inventory_items', COUNT(*) FROM inventory_items WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8' AND is_active=true
UNION ALL SELECT 'orders today', COUNT(*) FROM orders WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8' AND created_at::date=current_date AND status NOT IN ('cancelled','failed')
UNION ALL SELECT 'orders MTD', COUNT(*) FROM orders WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8' AND created_at>=date_trunc('month',now()) AND status NOT IN ('cancelled','failed')
UNION ALL SELECT 'staff_profiles', COUNT(*) FROM staff_profiles WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8'
UNION ALL SELECT 'low_stock_items', COUNT(*) FROM inventory_items WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8' AND is_active=true AND reorder_level>0 AND quantity_on_hand<=reorder_level;
```

### Medi Recreational (cannabis_retail)
```sql
SELECT 'inventory_items', COUNT(*) FROM inventory_items WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74' AND is_active=true
UNION ALL SELECT 'orders today', COUNT(*) FROM orders WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74' AND created_at::date=current_date AND status NOT IN ('cancelled','failed')
UNION ALL SELECT 'loyalty_transactions', COUNT(*) FROM loyalty_transactions WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
UNION ALL SELECT 'staff_profiles', COUNT(*) FROM staff_profiles WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74';
```

### The Garden Bistro (food_beverage)
```sql
SELECT 'inventory_items', COUNT(*) FROM inventory_items WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1' AND is_active=true
UNION ALL SELECT 'orders today', COUNT(*) FROM orders WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1' AND created_at::date=current_date AND status NOT IN ('cancelled','failed')
UNION ALL SELECT 'food_recipes', COUNT(*) FROM food_recipes WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1'
UNION ALL SELECT 'haccp_log_entries', COUNT(*) FROM haccp_log_entries WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1'
UNION ALL SELECT 'staff_profiles', COUNT(*) FROM staff_profiles WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1';
```

---

## RULES FOR ALL NEW CODE

Every new query against a tenant-scoped table MUST:
1. Include `.eq("tenant_id", tenantId)`
2. Pass `tenantId` from `useTenant()`
3. Include `tenantId` in `useCallback` dependency array

If intentionally cross-tenant: `// INTENTIONAL: HQ aggregate — cross-tenant by design`
