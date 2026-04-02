# SESSION-BUGS.md — NexAI Platform Bug Log
## Update only when a bug opens or closes. Never rewrite closed entries.

---

## OPEN BUGS

### BUG-047 — PlatformBar/WorkflowGuide loyalty_config scope mismatch · OPEN cosmetic
```
Status:  OPEN — cosmetic only, non-blocking
Added:   March 30, 2026 (WP-O v2.0 session)
Symptom: Orange PlatformBar alert: "Loyalty configuration not found —
         loyalty config table has no rows"
Root:    PlatformBar.js or WorkflowGuideContent.js fetches loyalty_config
         without .eq('tenant_id', tenantId). Now that loyalty_config has
         multiple tenant rows (4), a global .single() fails with "multiple rows"
         → triggers the "not found" alert even though the row exists.
Fix:     Grep for: loyalty_config in PlatformBar.js + WorkflowGuideContent.js
         Add .eq('tenant_id', tenantId) to the offending query.
         Effort: ~15 min, 1-2 find/replace ops.
Note:    HQLoyalty.js v4.0 is already correctly scoped. Bug is in the alert check only.
```

### BUG-046 — HQTenants tier counters show 0
```
Status:  OPEN — cosmetic only, non-blocking
Root:    HQTenants.js reads tier from tenants.tier column, not tenant_config.tier
         tenant_config.tier is where the real tier is set (via MANAGE button or SQL)
         tenants.tier column defaults to 'starter' and is never updated
Symptom: PRO counter shows 0 even though Medi Recreational is tier=pro in tenant_config
Fix:     Update HQTenants.js to join tenant_config and read tier from there
         OR: trigger that syncs tenant_config.tier → tenants.tier on update
Effort:  Small — 1 file, 1 query change
```

### BUG-045 — HQTenants "No tenant_config row found" false positive
```
Status:  OPEN — cosmetic only, non-blocking
Root:    HQTenants.js checks for tenant_config row using a query that doesn't
         match the UUID format of rows created via direct INSERT
Symptom: Shows red warning "No tenant_config row found. Create one in Supabase
         with tenant_id = ..." even when the row exists and is correct
Verify:  SELECT * FROM tenant_config WHERE tenant_id = 'b1bad266-...';
         → returns row correctly
Fix:     Debug HQTenants.js tenant_config fetch — likely a .eq() type mismatch
Effort:  Small — 1 file, inspect fetchConfig() function
```

### BUG-043 — Stock quantity inflation (terpenes)
```
Status:  OPEN — physical count required before any SQL fix
Root:    PQG2600182 ingested 3 times → 57 movements → 23 terpenes 2-3x inflated
Symptom: Pineapple Express shows 2.03 on_hand (should be ~1.0)
Gate:    DO NOT patch without physical count. Dedup gate (LL-084) prevents recurrence.
SQL to scope:
  SELECT ii.id, ii.name, ii.quantity_on_hand,
         COUNT(sm.id) as movements, SUM(sm.quantity) as total_received
  FROM inventory_items ii
  JOIN stock_movements sm ON sm.item_id = ii.id
  WHERE sm.reference = 'PQG2600182'
  GROUP BY ii.id, ii.name, ii.quantity_on_hand ORDER BY ii.name;
Fix:     Physical count → UPDATE inventory_items SET quantity_on_hand = X per item.
```

### BUG-044 — HQCogs shipping not live FX
```
Status:  OPEN — status ambiguous. v141/v142 marked RESOLVED, re-opened after WP-TENANT migration.
Verify:  SELECT column_name FROM information_schema.columns
         WHERE table_name = 'product_cogs' AND column_name = 'shipping_alloc_usd';
         If MISSING → apply SQL below + ~6 find/replace in HQCogs.js
         If EXISTS → re-save all recipes via UI to write shipping_alloc_usd values
Root:    shipping_alloc_zar stored as fixed ZAR at time of "Apply" click.
         Hardware cost recalcs with live USD/ZAR but shipping stays locked.
Fix:     Add shipping_alloc_usd + shipping_units to product_cogs.
         calcCogs() multiplies shipping_alloc_usd × live usdZar at render.
SQL:     ALTER TABLE product_cogs
           ADD COLUMN IF NOT EXISTS shipping_alloc_usd NUMERIC DEFAULT 0,
           ADD COLUMN IF NOT EXISTS shipping_units INTEGER DEFAULT 1000;
Effort:  ~6 find/replace ops in HQCogs.js only. No other files.
Interim: Re-save all product_cogs recipes (all currently at shipping_alloc_zar = 0.00).
```

---

## RESOLVED BUGS

### BUG-042 — HQTenants industry_profile save fail · RESOLVED 264a5cb
```
Root causes (4):
  1. fetchAll SELECT missing industry_profile column
  2. Cancel handler wiped industry_profile from state
  3. prop changes didn't sync after mount
  4. Silent RLS — 0 rows updated with no error
Fix: All 4 fixed in HQTenants.js (264a5cb). Persists across hard reload.
```

### BUG-041 — CommsPanel duplicate expiring blocks · RESOLVED S11
### BUG-040 — FoodShopCard allergens.length crash · RESOLVED S9
### BUG-039 — ScanResult.js wrong find string · RESOLVED S8

### BUG-038 — unit_cost null on 57 stock_movements · RESOLVED 3d2c262
```
Root:    PQG2600182 ingested 3 times. unit_cost = null on all 57 movements.
         AVCO computed as 0 on 23 inventory_items.
Fix:     SQL patch: 57 movements → unit_cost = 99.50 (Sample Pack) / 1.6667 (others)
         23 items: weighted_avg_cost recalculated. still_broken = 0.
         process-document v1.9 dedup gate prevents recurrence (LL-084).
```

---

## FAILURE LOG (non-bug architecture/process failures)

```
F1-F11:  Early sessions — unchanged from v94 SESSION.md.
F12:     v111 — Planned to rebuild WP-HR. All 12 already existed. → LL-075
F13:     v112 — loyalty_transactions INSERT silent fail — missing tenant_id.
F14:     v129 — allocateLumpSumCosts inside try{} — Deno error. → LL-085
F15:     v129 — PQG2600182 ingested 3x — BUG-038 + BUG-043. → LL-084
F16:     v130 — HQCogs shipping never saved — Apply button required.
F17:     v131 — HQStock PANEL_CATS static — food panel empty. → PANEL_CATS_BY_PROFILE
F18:     v131 — BUG-042 HQTenants industry_profile silent fail (4 root causes).
F19:     v132 — food fields written to batches table — column does not exist. → LL-086
F20:     v132 — isFoodBev used before declaration in formatGroups. → LL-087
F21:     v132 — product_formats.is_cannabis not set on non-vape cannabis. → LL-088
F22:     v133 — product_format_bom no RLS → 403. f.name not f.label. → LL-089
F23:     v135 — OP-D7 duplicate const metrics + early undeclared block.
F24:     v150 — HQOverview useTenant() called after early return → rules-of-hooks. → LL-127
F25:     v150 — <a tags dropped in find/replace twice. → LL-128
F26:     v150 — nexai.vercel.app taken by LobeChat. Project renamed nexai-erp. → LL-129
F27:     v150 — HQStock hardcoded HQ_TENANT_ID — VIEWING dropdown ignored. → LL-131
F28:     v150 — user_profiles_role_check blocked 'management' role INSERT. → LL-132
F29:     v152 — HQLoyalty.js v3.0 existed as 109KB file but MANIFEST said "—".
                Build was planned as fresh write but was actually an upgrade. → LL-142
F30:     v152 — WP-O v1.0 spec version numbers stale (HQDashboard v4.3 said,
                actual v4.2; CheckoutPage v2.4 said, actual v2.3). → LL-138, LL-143
F31:     v152 — loyalty_config ON CONFLICT failed — no UNIQUE(tenant_id) constraint.
                Always verify constraint before using ON CONFLICT. → LL-139
```

---

*SESSION-BUGS.md · Update when bugs open (add to OPEN) or close (move to RESOLVED).*
*Never rewrite resolved entries — they are architectural memory.*
