# WP-FNB — Food & Beverage Module SOP
## Version: v1.0 · March 25, 2026
## Purpose: Any new session must read this before touching any F&B code

---

## WHAT THIS MODULE IS

The Food & Beverage (WP-FNB) module is a complete food manufacturing ERP embedded inside the Protea Botanicals HQ platform. It covers every step of SA food manufacturing compliance:

```
INGREDIENTS → RECIPES → PRODUCTION → FOOD SAFETY → LABELLING → COLD CHAIN → RECALL
     S1           S2         (HQProduction)     S4            S5           S6        S7
              →
            HACCP                         NUTRITION LABEL
              S3                                S5
```

All 7 sessions are complete and live. S8 (Intelligence Dashboard) is next.

---

## FILES — EXACT LOCATIONS
```
src/components/hq/HQFoodIngredients.js  → S1: Ingredient encyclopedia
src/components/hq/HQRecipeEngine.js     → S2: Recipe BOM + nutrition + allergens
src/components/hq/HQHaccp.js            → S3: HACCP digital CCP logs
src/components/hq/HQFoodSafety.js       → S4: Compliance certificate vault
src/components/hq/HQNutritionLabel.js   → S5: R638 label generator
src/components/hq/HQColdChain.js        → S6: Temperature monitoring
src/components/hq/HQRecall.js           → S7: Lot trace + recall register
```

---

## DB TABLES — F&B OWNED
```
food_ingredients        → S1
food_recipes            → S2
food_recipe_lines       → S2 (NEVER use nested PostgREST select — see LL-090)
food_recipe_versions    → S2
haccp_control_points    → S3
haccp_log_entries       → S3
haccp_nonconformances   → S3
document_log            → S4 (shared — filter is_food_safety_doc=true)
temperature_logs        → S6
cold_chain_locations    → S6
recall_events           → S7
```

---

## CRITICAL RULES FOR THIS MODULE

### RULE 1 — POSTGREST + food_recipe_lines (LL-090)
NEVER use: `supabase.from('food_recipes').select('*, food_recipe_lines(*)')`
PostgREST schema cache does NOT detect the FK. It returns error: "Could not find
the 'food_recipe_lines' column of 'food_recipes' in the schema cache"

ALWAYS use separate fetch:
```js
const { data: recipes } = await supabase.from('food_recipes').select('*').eq('tenant_id', tenantId);
const { data: lines } = await supabase.from('food_recipe_lines').select('*').in('recipe_id', recipes.map(r => r.id));
const recipesWithLines = recipes.map(r => ({ ...r, food_recipe_lines: lines.filter(l => l.recipe_id === r.id) }));
```

### RULE 2 — Destructure food_recipe_lines from UPDATE payload (LL-091)
Any handleSave function that receives recipe data MUST destructure food_recipe_lines:
```js
async function handleSave({ lines, changeNotes, food_recipe_lines, ...recipeData }) {
  // food_recipe_lines is now stripped — recipeData is safe to UPDATE
}
```

### RULE 3 — RULE 0F on every INSERT (platform-wide)
Every INSERT must include tenant_id. RLS will silently hide rows without it.

### RULE 4 — system_alerts schema (LL-094)
system_alerts has NO updated_at column.
Required fields: tenant_id, alert_type, severity, message, created_at
F&B alert_types: food_cert_expiry | cold_chain_breach | product_recall

### RULE 5 — Three-step wiring for any new F&B tab
When adding a new component to HQDashboard:
1. Add import statement
2. Add entry to TABS array (id must match tab path)
3. Add render block `{activeTab === "hq-XXX" && <HQComponent />}`
AND separately:
4. Add nav entry to useNavConfig.js under group "Food & Beverage"
Missing any of these = tab not reachable.

### RULE 6 — File integrity before commit (LL-092)
After copying a .js file to disk, always verify:
```powershell
(Get-Item src\components\hq\FILE.js).Length  # Must be > 10000
Get-Content src\components\hq\FILE.js | Select-String "export default function"  # Must return result
```
A 0-byte file commits silently and causes runtime errors.

---

## DATA FLOW — HOW THE MODULES CONNECT

### Ingredient → Recipe (S1→S2)
- Recipe BOM lines: `food_recipe_lines.ingredient_id` FK → `food_ingredients.id`
- Allergens: computed from `food_ingredients.allergen_flags` × BOM lines
- Nutrition: computed from `food_ingredients.nutrition_per_100g` × (qty_g / 100) / yield
- Cost: computed from `food_ingredients.weighted_avg_cost` × qty / yield

### Recipe → HACCP Log (S2→S3)
- HACCP log form: recipe dropdown = `food_recipes` WHERE status='approved' AND tenant_id
- Batch lot dropdown = `production_runs.batch_lot_number` WHERE NOT NULL AND tenant_id

### Recipe → Production (S2→HQProduction)
- "▶ Start Batch" button writes to `sessionStorage('fnb_start_batch')`:
```json
{
  "recipe_id": "uuid",
  "recipe_name": "Cold Brew Coffee",
  "recipe_version": "v1.0",
  "yield_quantity": 500,
  "yield_unit": "bottles",
  "allergen_flags": {"milk": false, "nuts": false},
  "shelf_life_days": 14,
  "temperature_zone": "refrigerated",
  "storage_instructions": "Keep refrigerated..."
}
```
- HQProduction should read sessionStorage('fnb_start_batch') on mount to pre-fill new run form

### HACCP Deviation → NCR (S3 internal)
- If `is_within_limit = false` → auto-INSERT into `haccp_nonconformances`
- status='open', severity='major', links to log_entry_id

### Food Safety Certs → PlatformBar (S4→PlatformBar)
- fetchAll() checks cert_expiry_date on all docs
- Writes to system_alerts (deletes stale ones first)
- alert_type='food_cert_expiry'
- PlatformBar picks up via its system_alerts realtime subscription

### Cold Chain Breach → PlatformBar (S6→PlatformBar)
- Temperature reading outside min/max → is_breach=true
- INSERT system_alerts alert_type='cold_chain_breach'
- affected_lots[] stored on temperature_logs record for recall linkage

### Live Recall → PlatformBar (S7→PlatformBar)
- type='live_recall' → INSERT system_alerts alert_type='product_recall', severity='critical'
- Trace engine reads: food_ingredients → food_recipe_lines → food_recipes → production_runs
- affected_batches[] stored as JSONB on recall_events

---

## DEFAULT DATA / SEEDS

### Ingredient library (S1)
- 121 seeded ingredients — SA DAFF nutritional data, R638 allergens, HACCP risk
- is_seeded=true — shared across all tenants
- To add custom ingredients: HQFoodIngredients → "+ Add Custom Ingredient"

### HACCP templates (S3)
- 8 industry-standard CCPs: Pasteurisation, Chilling, Metal Detection, Allergen Cleaning,
  pH Control, Water Activity, Packaging Integrity, Raw Material Receiving
- Load via: HQHaccp → CCP Register → "🏭 Load Industry Templates (8)"

### Cold chain locations (S6)
- 4 defaults: Walk-in Fridge 1, Chest Freezer A, Dry Store, Display Fridge
- Load via: HQColdChain → Locations → "📦 Load Default Locations"

---

*WP-FNB SOP v1.0 · NuAi · March 25, 2026*
