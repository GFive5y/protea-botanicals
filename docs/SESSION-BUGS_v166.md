# SESSION-BUGS.md — NuAi Platform Bug Log
## Version: v166 · Updated: April 1, 2026
## Update only when a bug opens or closes. Never rewrite closed entries.

---

## OPEN BUGS

### BUG-047 — PlatformBar/WorkflowGuide loyalty_config scope mismatch · OPEN cosmetic
```
Status:  OPEN — cosmetic only, non-blocking
Added:   March 30, 2026 (WP-O v2.0 session)
Symptom: Orange PlatformBar alert: "Loyalty configuration not found"
Root:    PlatformBar.js / WorkflowGuideContent.js fetches loyalty_config
         without .eq('tenant_id', tenantId). .single() fails with "multiple rows"
Fix:     Add .eq('tenant_id', tenantId) to query in PlatformBar.js + WorkflowGuideContent.js
Effort:  ~15 min, 1-2 find/replace ops.
Note:    PlatformBar.js is LOCKED. Fix must go in WorkflowGuideContent.js only.
         Re-check: if fix is in PlatformBar.js this bug cannot be fixed without unlock.
```

### BUG-046 — HQTenants tier counters show 0 · OPEN cosmetic
```
Status:  OPEN — cosmetic only, non-blocking
Root:    HQTenants.js reads tier from tenants.tier (never updated),
         not tenant_config.tier (where real tier is set)
Fix:     Join tenant_config, read tier from configs[t.id]?.tier
Effort:  Small — HQTenants.js, 5 find/replace
```

### BUG-045 — HQTenants false-positive config warning · OPEN cosmetic
```
Status:  OPEN — cosmetic only, non-blocking
Root:    fetchConfig() type mismatch on UUID comparison
Fix:     Debug fetchConfig() in HQTenants.js
```

### BUG-044 — HQCogs shipping not live FX · OPEN
```
Status:  OPEN
Root:    shipping_alloc_zar stored as fixed ZAR at Apply time.
         Hardware cost recalcs with live FX but shipping stays locked.
Fix:     Verify shipping_alloc_usd column exists:
           SELECT column_name FROM information_schema.columns
           WHERE table_name = 'product_cogs' AND column_name = 'shipping_alloc_usd';
         If missing: ALTER TABLE product_cogs
           ADD COLUMN IF NOT EXISTS shipping_alloc_usd NUMERIC DEFAULT 0,
           ADD COLUMN IF NOT EXISTS shipping_units INTEGER DEFAULT 1000;
         Then 6 find/replace in HQCogs.js only.
Effort:  ~15 min
```

### BUG-043 — Stock quantity inflation (terpenes) · OPEN blocked
```
Status:  OPEN — physical count required before SQL fix
Root:    PQG2600182 ingested 3× → 57 movements → 23 terpenes 2-3× inflated
Gate:    DO NOT patch without physical count.
```

---

## RESOLVED BUGS

### F34 — SmartInventory built without reading HQStock · RESOLVED (documented)
```
Session: v166 · April 1, 2026
Root:    SmartInventory.js was designed and built without first reading HQStock.js.
         As a result:
         - Category sidebar (already in HQStock) was rebuilt from scratch
         - Brand filter pills (already in HQStock) were rebuilt from scratch
         - World picker modal with 14 product worlds (already existed, LOCKED modal)
           was bypassed entirely
         - inventory_items.notes column (doesn't exist) was included → insert crash
         - The "new" SmartInventory was solving problems already solved in HQStock

Consequence: Parallel duplicate code. When incorrectly routed to from case "stock",
             the richer original was lost. Owner: "Why did you change it so drastically?"

Resolution:
         - SmartInventory kept as standalone companion (Smart Catalog tab)
         - Notes column removed from all payloads (LL-181)
         - New rule LL-180: Read existing component BEFORE building parallel

Prevention going forward:
         Before any build touching inventory/stock/items:
           1. Read HQStock.js (grep tabs, grep imports, read first 50 lines)
           2. Read StockItemModal.js first 30 lines (LOCKED)
           3. Document what already exists
           4. Build as enhancement to existing, not parallel replacement
```

### F33 — SmartInventory replaced HQStock via case "stock" swap · RESOLVED bd4ffd3
```
Session: v166 · April 1, 2026
Root:    TenantPortal.js renderTab() case "stock" was changed to:
           industryProfile === "cannabis_retail" ? <SmartInventory /> : <HQStock />
         This made HQStock completely unreachable for Medi Recreational.

What was lost (temporarily):
         HQStock.js — 5,717 lines
         Tabs: Overview · Items (183) · Movements · Pricing · Receipts ·
               Purchase Orders · Shop Manager
         Features: Brand filter pills (15 brands) · Category sidebar (14 worlds) ·
                   World picker modal (14 product worlds, custom fields per world) ·
                   EDIT/ADJUST/MOV per row · Stock receive flow · AVCO display ·
                   Reorder alerts · Shop image upload · Featured/visibility controls
         Sub-components: StockItemModal (LOCKED), StockItemPanel, StockPricingPanel,
                         StockReceiveModal, StockOpeningCalibration, StockChannelPanel,
                         StockReceiveHistoryPanel, StockIntelPanel

Process failure:
         LL-173 (show diff) was followed — diff was shown.
         But diff showed "case stock → SmartInventory" which owner could not
         interpret as "TOTAL LOSS of HQStock for cannabis_retail".
         Claude should have explicitly stated: "⚠️ This will make the following
         unreachable for Medi Recreational: [7 tabs, 14 worlds, full list]"
         It did not. This is Claude's fault, not the owner's.

Resolution:
         case "stock" reverted to return <HQStock /> for all profiles.
         SmartInventory added as new case "catalog" / new nav tab "Smart Catalog".
         HQStock fully restored. HEAD: bd4ffd3.

New rules: LL-178, LL-179, LL-180 — permanent additions to SESSION-CORE v2.6.
Lesson:  "Showing a diff" is not enough if the owner cannot interpret its full impact.
          Claude must translate any renderTab case change into plain English:
          "This will make X, Y, Z unreachable. Do you confirm?"
```

### BUG-042 — HQTenants industry_profile save fail · RESOLVED 264a5cb
```
Root causes (4): fetchAll missing column, cancel wipe, prop sync, silent RLS
Fix: All 4 fixed in HQTenants.js (264a5cb).
```

### BUG-041 — CommsPanel duplicate expiring blocks · RESOLVED S11
### BUG-040 — FoodShopCard allergens crash · RESOLVED S9
### BUG-039 — ScanResult.js wrong find string · RESOLVED S8

### BUG-038 — unit_cost null on 57 stock_movements · RESOLVED 3d2c262
```
Root: PQG2600182 ingested 3×. AVCO computed as 0 on 23 items.
Fix: SQL patch + process-document v1.9 dedup gate (LL-084).
```

---

## FAILURE LOG (non-bug architecture/process failures)

```
F1-F11:  Early sessions — unchanged.
F12:     v111 — Planned to rebuild WP-HR. All 12 already existed. → LL-075
F13:     v112 — loyalty_transactions INSERT silent fail — missing tenant_id.
F14:     v129 — allocateLumpSumCosts inside try{} — Deno error. → LL-085
F15:     v129 — PQG2600182 ingested 3× — BUG-038 + BUG-043. → LL-084
F16:     v130 — HQCogs shipping never saved — Apply button required.
F17:     v131 — HQStock PANEL_CATS static — food panel empty. → PANEL_CATS_BY_PROFILE
F18:     v131 — BUG-042 HQTenants industry_profile silent fail (4 root causes).
F19:     v132 — food fields written to batches table — column does not exist. → LL-086
F20:     v132 — isFoodBev used before declaration. → LL-087
F21:     v132 — product_formats.is_cannabis not set on non-vape cannabis. → LL-088
F22:     v133 — product_format_bom no RLS → 403. f.name not f.label. → LL-089
F23:     v135 — OP-D7 duplicate const metrics + early undeclared block.
F24:     v150 — HQOverview useTenant() called after early return → hooks. → LL-127
F25:     v150 — <a tags dropped in find/replace twice. → LL-128
F26:     v150 — nexai.vercel.app taken by LobeChat. Project renamed. → LL-129
F27:     v150 — HQStock hardcoded HQ_TENANT_ID. → LL-131
F28:     v150 — user_profiles_role_check blocked 'management' role INSERT. → LL-132
F29:     v152 — HQLoyalty.js v3.0 existed but MANIFEST said "—". → LL-142
F30:     v152 — WP-O v1.0 spec version numbers stale. → LL-138, LL-143
F31:     v152 — loyalty_config ON CONFLICT failed — no UNIQUE(tenant_id). → LL-139
F32:     v161 — AddTenantModal (441 lines) removed for linter warning. → LL-172, LL-173

F33:     v166 — SmartInventory replaced HQStock via case "stock" swap.
                5717 lines / 7 tabs / 14 product worlds became unreachable.
                LL-173 diff was shown but impact was not translated to plain English.
                Owner: "this was a massive fup of epic proportions — took days to build!"
                Resolution: reverted bd4ffd3. New rules: LL-178, LL-179.

F34:     v166 — SmartInventory built without reading HQStock first.
                Duplicated: category sidebar, brand pills, world category system.
                Missed: notes column doesn't exist → insert crash.
                Missed: StockItemModal (LOCKED) already has 14-world add item flow.
                Resolution: documented. New rule: LL-180. Integration plan written.
```

---

*SESSION-BUGS.md v166 · NuAi · April 1, 2026*
*F33 + F34 added — the SmartInventory incident. Read LL-178, LL-179, LL-180.*
*Never rewrite resolved entries — they are architectural memory.*
