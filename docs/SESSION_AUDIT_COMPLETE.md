# SESSION AUDIT — Complete Gold Extraction v139–v153
## March 30, 2026 · Produced from all uploaded session states
## Purpose: identify every piece of gold data that exists in session files but
## is NOT currently in SESSION-CORE v2.3, SESSION-STATE v153, or ONBOARDING v2.0

---

## ⚠️ MISSING SESSION STATES

Three session states were not uploaded and are presumed lost:
```
v140 — between WP-STOCK-PRO S5 and WP-FNB start (March 25, 2026)
v143 — between WP-AI-UNIFIED and WP-FIN S3 (March 27, 2026)
v148 — between v147 and v149 (March 28, 2026 — likely the Vercel deploy session)
```
If these files exist on your computer, upload them. The LLs and commits from
those sessions may be orphaned.

---

## 1. ARCHITECTURAL DECISIONS — LOCKED BUT UNDOCUMENTED

These decisions were made and locked but never added to SESSION-CORE or ONBOARDING.
They will bite future sessions if not recorded.

### Decision A — HQ vs Admin Portal Separation (locked March 24, 2026 from v139)
```
HQ PORTAL (exec team / HR Manager):
  Full visibility of ALL data — HQ tabs + Admin/shop data surfaced here
  HRStockView reads HQ inventory_items + ALL shop tenant inventory_items
  HQ = "global info highway" — no data hidden from this level

ADMIN PORTAL (store managers):
  Scoped to their tenant only (RLS)
  Admin HR tab = FUTURE SESSION (not yet built as of v153)
    Will include: shift calculator, leave visibility, team timesheets
    Will hook into Admin stock (shop floor items only)

SEPARATION RULE (PERMANENT):
  HR Manager = HQ portal user
  Store Admin = Admin portal user
  Never merge these tiers — different data scope, different workflows
```

### Decision B — WP-PROD-MASTER Locked Decisions (from v139)
```
Q1: allergen_flags = 14 boolean flags { gluten: true, milk: false, ... }
Q2: production_runs tenant_id EXISTS confirmed
Q3: General retail AVCO = placeholder only
Q4: Mixed retail type badge per row = YES
Q5: Cannabis dispensary Section 21 = OUT OF SCOPE — WP-MED
Q6: Yield <85% PlatformBar alert = YES
```

### Decision C — Client 2 Storefront Options (from v149, NEVER RESOLVED)
```
Option A: Rebuild their site on NexAI, point domain at Vercel (full integration)
Option B: Keep existing site, webhook sync orders into NexAI (two systems, one P&L)
Option C: NexAI embed JS snippet into existing site (cart + checkout only)
STATUS: Owner decision still pending as of v153. Must decide before WP-MULTISITE S2.
```

### Decision D — Yoco Per-Tenant vs Platform Account (from v149, NEVER RESOLVED)
```
Q1: Separate Yoco merchant account per tenant OR platform-level routing?
    Determines entire WP-PAY architecture.
    Per-tenant: each client has own sk_live_ stored in tenant_config.yoco_secret_key
    Platform: one NexAI merchant account, route payments between tenants
STATUS: Unresolved. Must decide before WP-PAY S1 build starts.
```

### Decision E — StorefrontContext (from v150, locked)
```
StorefrontContext is the single source of truth for public storefront tenant resolution.
All public routes (/shop, /cart, /checkout) read from it.
Authenticated routes use TenantService as before.
tenants.domain column resolves storefront tenant. One domain = one tenant.
Dev mode: REACT_APP_DEV_TENANT_ID env var overrides hostname lookup.
```

---

## 2. TECHNICAL GOLD — DB SCHEMAS NOT IN CURRENT DOCS

### stock_transfers table (from v139)
```sql
-- Created WP-STOCK-PRO S5, March 24, 2026
stock_transfers (
  id UUID PK,
  reference TEXT UNIQUE,          -- format: TRF-YYYYMMDD-XXXX
  from_tenant_id UUID,
  to_tenant_id UUID,
  status TEXT CHECK('draft','in_transit','received','cancelled'),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT
)
```

### stock_transfer_items table (from v139)
```sql
stock_transfer_items (
  id UUID PK,
  transfer_id UUID → stock_transfers(id) ON DELETE CASCADE,
  item_id UUID → inventory_items(id),
  item_name TEXT,
  sku TEXT,
  unit TEXT,
  qty_requested NUMERIC,
  qty_confirmed NUMERIC,
  unit_cost_zar NUMERIC,          -- = weighted_avg_cost from HQ at time of ship
  notes TEXT,
  created_at TIMESTAMPTZ
)
RLS: HQ users (hq_access=true) can ALL. Shop tenants can SELECT/UPDATE transfers
     where to_tenant_id = their tenant.
```

### classifyExpenseDocument() keyword lists (from v144)
```
CAPEX keywords: stirrer, hot plate, pipette, beaker, microscope, balance, pump,
                computer, laptop, server, vehicle, machinery, equipment, furniture

OPEX keywords:  freight, logistics, shipping, courier, rent, utilities, electricity,
                internet, accounting, legal, marketing, insurance, bank charges

Foreign currency: USD/EUR/CNY — converted to ZAR at 18.5 fallback rate

Does NOT create expense if:
  - Document has receive_delivery_item (stock invoice)
  - proposed_updates already has create_expense (Claude classified it)
  - PO has supplier_product_id items (stock PO)
```

### Document types matrix — process-document v1.9 (from v144)
```
Stock invoices      → create_purchase_order (unchanged)
CAPEX invoices      → create_expense (category: capex)
OPEX invoices       → create_expense (category: opex)
Mixed invoices      → create_purchase_order + create_expense
Payment screenshots → create_expense (non-stock) or update_po_payment (stock)
Delivery notes      → receive_delivery_item + update_po_status (unchanged)
COA/lab reports     → update_batch_coa (unchanged)
```

---

## 3. PROCESS GOLD — EXACT FLOWS NOT DOCUMENTED ANYWHERE

### Stock Transfer Lifecycle (from v139)
```
SHIP (from HQ):
  → inventory_items.quantity_on_hand - qty (HQ side)
  → stock_movements INSERT (transfer_out, unit_cost=null, unit_cost_zar=weighted_avg_cost)
  → status = 'in_transit'

RECEIVE (at shop):
  → Check inventory_items for item by SKU, then by name
  → If NOT found: CREATE new inventory_item (is_active=true, sell_price=0)
    Owner must set sell_price via Admin Stock after receive (LL-024 pattern)
  → inventory_items.quantity_on_hand + qty (shop side)
  → stock_movements INSERT (transfer_in)
  → status = 'received'

CANCEL (in_transit only):
  → Reverse HQ deduction: quantity_on_hand + qty (HQ side)
  → INSERT reversal stock_movement
  → status = 'cancelled'

Reference format: TRF-YYYYMMDD-XXXX (auto-generated, DB UNIQUE constraint)
```

### Recipe → Production Handoff (from v141)
```
HQRecipeEngine.js "▶ Start Batch" button:
  1. Writes sessionStorage('fnb_start_batch') with JSON payload:
     { recipe_id, name, version, yield, allergens, shelf_life, temp_zone }
  2. Navigates to /hq?tab=hq-production
  3. HQProduction.js reads sessionStorage on mount → pre-fills New Run form

This is the ONLY handoff mechanism between F&B Recipes and Production.
```

### F&B Integration Map (from v141)
```
S1 Ingredients → S2 Recipes:
  food_ingredients → food_recipe_lines (FK)
  Allergens auto-propagate from ingredient library to recipe
  Nutrition per serve auto-computed from DAFF values × quantities
  Cost per unit computed from weighted_avg_cost × BOM quantities

S2 Recipes → S3 HACCP:
  food_recipes (approved) → HACCP log form recipe dropdown (live SELECT)
  production_runs.batch_lot_number → HACCP log form lot dropdown

S2 Recipes → HQProduction:
  sessionStorage('fnb_start_batch') → navigate /hq?tab=hq-production

S3 HACCP → system_alerts (PlatformBar):
  CCP deviation → NCR auto-raised → system_alerts

S4 Food Safety → system_alerts:
  Cert expired → severity=critical, alert_type=food_cert_expiry
  Cert expiring ≤7d → severity=warning
  Cert expiring ≤30d → severity=info

S6 Cold Chain → system_alerts:
  Temperature breach → severity=critical/warning, alert_type=cold_chain_breach
  Affected batch lots stored on temperature_logs.affected_lots[]

S7 Recall → system_alerts:
  Live recall → severity=critical, alert_type=product_recall
  Trace engine: food_ingredients → food_recipe_lines → food_recipes → production_runs
```

### WP-PAY Full Spec (from v149 — NOT in current SESSION-STATE v153 in full)
```
S1 — Yoco online gateway (1 session — URGENT when sk_test_ keys available):
  NEW EFs: yoco-checkout/index.ts + yoco-webhook/index.ts
  DB CHANGES REQUIRED:
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS yoco_checkout_id TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS yoco_payment_id TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'payfast';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_channel TEXT DEFAULT 'online';
    ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS yoco_secret_key TEXT;
    ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS yoco_public_key TEXT;
    ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS yoco_sandbox BOOLEAN DEFAULT true;
    ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS default_payment_gateway TEXT DEFAULT 'payfast';
  CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    tenant_id UUID REFERENCES tenants(id),
    provider TEXT NOT NULL,           -- 'yoco' | 'payfast'
    provider_ref TEXT,
    amount_zar NUMERIC,
    status TEXT,                      -- 'pending' | 'succeeded' | 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  New Supabase secrets: YOCO_SECRET_KEY, YOCO_WEBHOOK_SECRET, YOCO_SANDBOX
  Keep payfast-checkout EF running in parallel — per-tenant migration via tenant_config flag
  CRITICAL: zero cannabis refs in item names (LL-124)
```

---

## 4. YOCO INTELLIGENCE — COMPLETE (from v149)

This detail is only partially captured in LL-124/125. Full intel:

```
YOCO ONLINE GATEWAY:
  API: POST https://payments.yoco.com/api/checkouts (server-side, sk_live_ key)
  Webhook: payment.succeeded event
  Settlement: next business day (vs PayFast 2-3 days + withdrawal fee)
  Rates: 2.6%–2.95% ex VAT per transaction. No monthly fee.
  Keys: sk_test_/sk_live_ (secret, server only) + pk_test_/pk_live_ (public)

SOLE TRADER SIGNUP (not in any LL):
  Unlike PayFast, Yoco accepts sole traders WITHOUT CIPRO registration.
  Owner action: try signing up at yoco.com as sole trader.
  If successful: sk_test_ keys available immediately → WP-PAY S1 unblocked.

CANNABIS PROHIBITION (LL-124 covers this but this is the full context):
  CBD = medicinal/prescription = prohibited business type per Yoco T&Cs.
  Cannabis for Private Purposes Act 2024 does NOT legalise commercial sale.
  Commercial cannabis trade = criminal offence (up to 10 years imprisonment).
  Consequence: ZERO cannabis refs in any Yoco-facing content.
```

---

## 5. UNCLOSED BUGS — NOT IN SESSION-BUGS.MD

### Missing bug: check_reorder() trigger (from v139)
```
Status:  UNKNOWN — raised v139, never closed, never added to SESSION-BUGS.md
Symptom: check_reorder() trigger needs to be rebuilt after data migration
Root:    Trigger may reference old tenant structure or HQ_TENANT_ID hardcode
Action:  Run: SELECT routine_name FROM information_schema.routines
               WHERE routine_schema = 'public' AND routine_name LIKE '%reorder%';
         Verify trigger still fires correctly for per-tenant reorder scoring
```

---

## 6. RETIRED FILES — LIST FROM v142 (important for MANIFEST integrity)

These files were DELETED from the repo in WP-AI-UNIFIED:
```
src/components/AIAssist.js          → DELETED (WP-AI-UNIFIED)
src/components/CoPilot.js           → DELETED (WP-AI-UNIFIED)
src/components/AIOrb.js             → DELETED (WP-AI-UNIFIED)
src/components/hq/AlertsBar.js      → DELETED (WP-AI-UNIFIED)
src/components/SystemStatusBar.js   → DELETED (WP-AI-UNIFIED)
```
MANIFEST must not reference these. REGISTRY must not reference these.
If any session tries to find or edit these files: they are GONE.

---

## 7. LL INTEGRITY CHECK

SESSION-CORE v2.3 claims LL-001 through LL-147. Cross-check against sessions:

| Session | LLs claimed | In CORE? |
|---|---|---|
| v139 | No new LLs listed | ✅ |
| v141 | LL-090 to LL-094 | ✅ in CORE |
| v142 | LL-095 to LL-099 | ✅ in CORE |
| v144 | LL-100 to LL-105 | ✅ in CORE |
| v145 | LL-100 to LL-114 (overlap + new) | ✅ in CORE |
| v146 | LL-115 to LL-119 | ✅ in CORE |
| v147 | No new LLs listed (v147 = same HEAD as v146) | ✅ |
| v149 | LL-120 to LL-126 (implied — CORE v2.2 ends here) | ✅ in CORE |
| v150 | LL-127 to LL-132 | ✅ added to CORE v2.3 |
| v151 | LL-133 to LL-137 | ✅ added to CORE v2.3 |
| v152 | LL-138 to LL-144 | ✅ added to CORE v2.3 |
| v153 | LL-145 to LL-147 | ✅ added to CORE v2.3 |

MISSING SESSIONS v140, v143, v148:
  v140: May contain LLs between LL-089 and LL-090. WP-FNB S1 start.
  v143: May contain LLs between LL-105 and LL-114. Likely WP-FIN S2 start.
  v148: May contain LLs between LL-126 and LL-127. Likely Vercel deploy.
  ACTION: If these files exist, upload them for audit.

---

## 8. DATA INTEGRITY FACTS — CONFIRMED ACROSS SESSIONS

These facts were confirmed in multiple sessions and must never be overwritten:

```
AVCO STATUS (confirmed v144):
  0 items missing weighted_avg_cost after backfill (March 27, 2026)
  All 41 production_out movements have unit_cost = 28.33 (avg backfill)
  Before using P&L actual COGS: verify this is still true
  SQL: SELECT COUNT(*) FROM inventory_items
       WHERE (weighted_avg_cost IS NULL OR weighted_avg_cost = 0)
       AND category IN ('raw_material','terpene','hardware');
  Should return 0.

BUG-044 HISTORY:
  RESOLVED in v142 (shipping_alloc_usd × live rate)
  RE-OPENED after WP-TENANT data migration (v147)
  Current status: OPEN (in SESSION-BUGS)
  Root: column may have been lost in migration, or recipes need re-saving

P&L CONFIRMED LIVE NUMBERS (from screenshots, March 30, 2026):
  Website Revenue:   R4,400 (11 orders)
  Wholesale Revenue: R4,000 (10 sale_out movements)
  Total Revenue:     R8,400
  Actual COGS:      −R2,479.16 (41 production_out × AVCO)
  Gross margin:      70.49%
  Net margin:        67.18%
  CAPEX memo:        R3,552.05 (2 items — stirrer + pipette)

DATA MIGRATION COMPLETE (v145):
  9 tables migrated to Pure Premium (f8ff8d07):
  product_cogs(13), product_pricing(36), inventory_items(23),
  stock_movements(42), purchase_orders(2), orders(11),
  loyalty_transactions(137), expenses(2), batches(10)
  suppliers(5) STAYED under HQ — shared/operator resource

TEST DATA — WHOLESALE PARTNERS (still in DB):
  Cape Town Vapes       → sarah@ctvapes.co.za (tenant_id=f8ff8d07)
  Green Leaf Dispensary → orders@greenleaf.co.za (tenant_id=f8ff8d07)
```

---

## 9. OWNER ACTIONS — ACCUMULATED UNCLOSED ACROSS ALL SESSIONS

These actions appear in early sessions and were NEVER confirmed closed:

```
FROM v139 (March 25 — may still be outstanding):
  [ ] Fix Espresso BOM qty_per_unit (was WRONG — do not use for AVCO verify)
  [ ] Archive test batches: PR-260322-DRI-BEVE, PR-260322--3X1M
  [ ] Upload COA for 9 batches + set expiry dates on 8 batches
  [ ] Add expiry dates to all food ingredients (23 items show "No Expiry Set")
  [ ] Set temperature zones on cold chain ingredients
  [ ] Delete test BOM line (250ml Peaches & Cream on Edible/Capsule)
  [ ] Rebuild check_reorder() trigger (never closed)

FROM v144 (March 27):
  [ ] Delete duplicate Takealot expense row in Supabase → expenses table

FROM v149 (March 28):
  [ ] Resolve Yoco Q1: per-tenant vs platform account architecture
  [ ] Resolve Client 2 storefront option (A/B/C)
  [ ] Submit Yoco SDK partner application (developer.yoco.com/partnerships)
  [ ] Update ProteaAI.js CODEBASE_FACTS string — still says "Vercel deploy pending"
      Search: const CODEBASE_FACTS = `
      Update to reflect: WP-O complete, WP-FIN S5+S6 complete, Balance Sheet live

FROM v153 (March 30 — current):
  [ ] P1  Yoco merchant signup → sk_test_ keys
  [ ] P6  Enable Supabase backups (URGENT)
  [ ] P7  Change Medi password (MediAdmin2026!)
  [ ] P8  Pure PTV tenant_config INSERT
  [ ] P9  Confirm Medi domain
  [ ] P10 Load Medi product catalogue
```

---

## 10. FILES TO DELETE FROM PROJECT KNOWLEDGE — FROM v149 (STILL VALID)

These files were identified as stale/superseded in v149 and should be cleaned up
from the project knowledge folder. Most have never been deleted:

```
SHOULD ALREADY BE DELETED (check):
  Protea_WPO_Loyalty_Engine_Spec.md    → superseded by WP-O_v2_0 spec (flagged v152)

LIKELY STILL PRESENT AND STALE:
  WP-BIB_v1_0.md              → COMPLETE, content in SESSION-LOG
  WP-GEN_v1_0.md              → COMPLETE, content in SESSION-LOG
  WP-IND_v1_0.md              → COMPLETE, content in SESSION-LOG
  WP-TENANT_v1_0.md           → COMPLETE, content in SESSION-LOG
  WP-Y_AI_Assist.md           → COMPLETE, superseded by WP-AI-UNIFIED
  CAPABILITIES.md             → replaced by SESSION-CORE + MANIFEST
  SYSTEM.md                   → replaced by SESSION-CORE + REGISTRY

KEEP:
  SESSION-CORE_v2_3.md        → current (just updated)
  SESSION-STATE_v153.md       → current
  SESSION-LOG_updated.md      → current
  SESSION-BUGS_updated.md     → current
  ONBOARDING_v2_0.md          → current
  MANIFEST_v3_0.md            → active
  REGISTRY_v3_0.md            → active
  SESSION-BUGS.md             → active
  SOP.md                      → active
  WP-FIN_v1_0.md              → WP-FIN VAT still pending
  WP-FNB_SOP_v1.md            → F&B reference
  WP-O_v2_0_Loyalty_Engine_Spec.md → active, needed for loyalty-ai EF
  WP-VISUAL-SYSTEM_v1.docx    → active, charts still pending
  STRATEGY_v1_5.md            → active
```

---

## SUMMARY — WHAT ACTION TO TAKE NOW

### Immediate (add to SESSION-CORE v2.3 before next session):
```
1. Add Architectural Decision A (HQ=global info highway, Admin=scoped) as a
   permanent rule in SESSION-CORE Rule 0 section
2. Add WP-PROD-MASTER locked decisions Q1-Q6 to SESSION-CORE
3. Add stock transfer lifecycle details (TRF format, auto-create on receive)
4. Add classifyExpenseDocument() keyword lists to SESSION-CORE or ONBOARDING
5. Add F&B sessionStorage handoff pattern to ONBOARDING Section 8
6. Add check_reorder() trigger bug to SESSION-BUGS.md
7. Add WP-PAY full DB spec to SESSION-STATE/ONBOARDING
8. Add Yoco sole-trader signup intel (no CIPRO needed) as LL
```

### Project knowledge cleanup:
```
1. Delete: Protea_WPO_Loyalty_Engine_Spec.md (flagged v152, not yet deleted)
2. Delete: WP-BIB_v1_0.md, WP-GEN_v1_0.md, WP-IND_v1_0.md, WP-TENANT_v1_0.md
3. Delete: WP-Y_AI_Assist.md
4. Update: ProteaAI.js CODEBASE_FACTS string (still stale — owner action)
```

### Upload if files exist on your computer:
```
SESSION-STATE_v140.md  → may contain WP-FNB S1 start LLs
SESSION-STATE_v143.md  → may contain WP-FIN S2 start LLs
SESSION-STATE_v148.md  → may contain Vercel deploy LLs
```
