# SESSION-BUGS.md — NuAi Platform Bug Log
## Updated: April 4, 2026 · v177 state
## Update only when a bug opens or closes. Never rewrite closed entries.

---

## OPEN BUGS

### BUG-043 — Stock quantity inflation (terpenes) · OPEN
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

### BUG-044 — HQCogs shipping not live FX · OPEN
```
Status:  OPEN — status ambiguous. Resolved v142, re-opened after WP-TENANT migration.
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

### check_reorder() trigger — UNKNOWN STATUS
```
Status:  UNKNOWN — raised v139, never closed, never formally logged until now
Symptom: check_reorder() trigger may not be functional after data migrations
Root:    Trigger may reference old tenant structure or hardcoded HQ_TENANT_ID
Verify:  SELECT routine_name FROM information_schema.routines
         WHERE routine_schema = 'public' AND routine_name LIKE '%reorder%';
         → Should return check_reorder
         Then test: update an inventory_item qty below reorder_level → system_alert should appear
If broken: Rebuild trigger per WP-STOCK or WP-REORDER spec.
Note:    Also check: SELECT trigger_name FROM information_schema.triggers
         WHERE event_object_table = 'inventory_items';
```

---

## RESOLVED BUGS

### BUG-047 — PlatformBar loyalty_config scope · RESOLVED 8c19990
```
Commit:  8c19990 — fix(loyalty): scope loyalty_config query to tenant_id in usePageContext
Root:    loyalty_config fetched without .eq('tenant_id') — "multiple rows" error
         with 4 tenant rows now existing.
Fix:     Added .eq('tenant_id', tenantId) to loyalty_config query in usePageContext.js
Session: v176
```

### BUG-046 — HQTenants tier from wrong column · RESOLVED 7cd80ef
```
Commit:  7cd80ef — fix(tenants): read tier from tenant_config not tenants table
Root:    HQTenants.js read tier from tenants.tier (always 'starter')
         instead of tenant_config.tier (the real tier set via UI/SQL)
Fix:     Updated HQTenants.js to join tenant_config and read tier from there
Session: v176
```

### BUG-045 — HQTenants "No tenant_config row found" false positive · RESOLVED
```
Status:  Self-healed after BUG-046 fix — the tenant_config join fix also resolved
         the false positive warning
Session: v176
```

### SmartInventory drag-drop silent fail · RESOLVED f6b065f
```
Commit:  f6b065f — fix(catalog): SmartInventory v1.5 — harden column drag with dataTransfer
Root cause 1: setColOrder callback read dragCol.current AFTER it was set to null
Root cause 2: dragend fires before drop in Chrome inside overflow:auto + sticky thead
Fix 1:   handleDragStart: e.dataTransfer.setData("text/plain", key)
Fix 2:   handleDrop: const sourceKey = e.dataTransfer.getData("text/plain") || dragCol.current
         setColOrder callback uses sourceKey (local var) NOT dragCol.current (mutable ref)
Session: v177
```

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

## FAILURE LOG (architecture/process failures — permanent record)

```
F1-F11:  Early sessions (v84-v94) — unchanged.
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
F25:     v150 — <a> tags dropped in find/replace twice. → LL-128
F26:     v150 — nexai.vercel.app taken by LobeChat. Project renamed nexai-erp. → LL-129
F27:     v150 — HQStock hardcoded HQ_TENANT_ID — VIEWING dropdown ignored. → LL-131
F28:     v150 — user_profiles_role_check blocked 'management' role INSERT. → LL-132
F29:     v152 — HQLoyalty.js v3.0 existed as 109KB file but MANIFEST said "—".
                Build was planned as fresh write but was actually an upgrade. → LL-142
F30:     v152 — WP-O v1.0 spec version numbers stale. → LL-138, LL-143
F31:     v152 — loyalty_config ON CONFLICT failed — no UNIQUE(tenant_id) constraint. → LL-139
F32:     v171 — VL-001: LL-184 violated in the same message it was documented. → VL-001
F33:     v174 — SmartInventory replaced HQStock in renderTab case swap. → RULE 0K, LL-178
F34:     v174 — SmartInventory built without reading HQStock first. → RULE 0L, LL-180
F35:     v177 — Full doc audit revealed: SESSION-BUGS showed BUG-045/046/047 as OPEN
                when all three were CLOSED in session v176. Docs drifted from reality.
                Fix: this update.
```

---

*SESSION-BUGS v177 · NuAi · April 4, 2026*
*BUG-045/046/047 closed. SmartInventory drag-drop closed. check_reorder() added as unknown.*
*F32-F35 added to failure log.*
*Never rewrite resolved entries — they are architectural memory.*
