# WP-TABLE-UNIFY PHASE 2 — INGREDIENT ENCYCLOPEDIA REBUILD
## Scope, architecture, and execution plan
## Produced: Session 293, 17 April 2026 (Claude.ai analysis + research)
## Amended: Session 320, 18 April 2026 — demo on hold, execution unlocked,
##          schema drift corrected (see Section 0 below)
## Status: IN EXECUTION — 2A → 2D (2E still deferred)
## Prereqs all met: Phase 1 COMPLETE · FoodWorlds.js LIVE · ProteaAI v1.8 LIVE

---

## SECTION 0 — S320 AMENDMENTS (read this before anything else)

Three changes vs. the original S293 doc. All other sections retained for context.

### 0.1 Execution timing
- **Original:** "Do not begin execution before 12 May 2026 demo."
- **Amended:** Demo placed on hold (reason not in scope of this doc). Execution
  unlocked as of 18 April 2026. Scope confirmed as **2A → 2D (~57h)**. 2E still
  deferred — consumer-facing allergen filter waits for client demand + liability
  acknowledgement.

### 0.2 Target table correction (CRITICAL)
The original doc repeatedly said AI-ingested and user-created F&B ingredients
should be written to `inventory_items`. **This was wrong.** Disk verification
at S320 showed:

| Table | Rows | Role |
|---|---|---|
| `food_ingredients` | 281 (121 seeded + 160 tenant-authored) | The ingredient library — **this is what HQFoodIngredients.js queries** |
| `inventory_items` (F&B) | 65 | Physical stock counterparts — separate concern |

HQFoodIngredients.js reads/writes `food_ingredients` at L3185/L3228/L3273. A
bridge column `food_ingredients.inventory_item_id` (nullable uuid FK) already
links library entries to physical stock when relevant.

**Everywhere the doc says "insert into inventory_items" or
"write to inventory_items" in the AI-ingest or ingredient-creation flow,
read `food_ingredients` instead.** Specifically:

- Section 4.3 DO NOT: "Write to inventory_items from AI without user review"
  → read as "write to `food_ingredients` from AI without user review"
- Section 4.4 `ingredient_ingest_queue` schema: the FK should target
  `food_ingredients(id)`, not `inventory_items(id)`. See 0.3 below.
- Section 4.4 2D schema additions — the four new columns (`last_haccp_review_at`,
  `last_haccp_reviewer`, `coa_document_id`, `compliance_notes`) belong on
  `food_ingredients`, not `inventory_items`.
- Section 6.1 Step 8: "insert into inventory_items" → read as "insert into
  `food_ingredients`."
- Section 6.5 gate: "Approved extractions insert into inventory_items with
  correct tenant_id" → read as "insert into `food_ingredients`."
- Section 10 LL-291 draft: "never writes directly to inventory_items" → read
  as "never writes directly to `food_ingredients`."
- Section 7.1 2C data queries still reference `inventory_items.quantity_on_hand`
  and `stock_movements.inventory_item_id` — those are correct. Physical stock
  counters live on inventory_items, which we reach via
  `food_ingredients.inventory_item_id`.

### 0.3 Corrected `ingredient_ingest_queue` DDL

```sql
CREATE TABLE ingredient_ingest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_document_id UUID REFERENCES document_log(id),
  source_type TEXT CHECK (source_type IN ('invoice','coa','spec_sheet','label_photo','recipe_pdf','manual_paste','url')),
  ai_extracted_data JSONB NOT NULL,
  suggested_sub_category TEXT,                          -- food_ingredients uses sub_category (underscore), not subcategory
  suggested_allergens JSONB,
  suggested_haccp_level TEXT CHECK (suggested_haccp_level IN ('low','medium','high','critical')),
  confidence_score NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','edited')),
  user_edits JSONB,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_food_ingredient_id UUID REFERENCES food_ingredients(id),  -- CORRECTED from inventory_items
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingest_queue_tenant_status ON ingredient_ingest_queue (tenant_id, status, created_at DESC);

-- RLS: standard tenant-isolation + hq_all_* bypass policies per LL-205
```

### 0.4 Naming drift note (watch during 2A)
`food_ingredients` schema uses `sub_category` (with underscore).
`FoodWorlds.js` constants use `subcategory` (no underscore). When wiring
FNB_PILL_HIERARCHY into HQFoodIngredients in 2A, map between the two at the
query boundary. Do not rename either — both have other consumers.

### 0.5 2C anomaly to investigate before shipping
`food_recipe_lines` has 128 rows referencing 19 distinct `recipe_id`s, but
`food_recipes` only has 23 rows across 3 tenants. Either line-rows point at
deleted recipes (FK drift) or the join is through something other than
`recipe_id`. Verify before rendering "Used in N recipes" counts in 2C.

---

## READ THIS FIRST — WHY THIS DOC EXISTS

The original `WP-TABLE-UNIFY_v1_0.md` described Phase 2 in a single line:
> "Ingredient Encyclopedia Rebuild · After Phase 1 gate"

That framing was wrong. It treated Phase 2 as a 30-hour cosmetic refactor of
HQFoodIngredients.js to match SmartInventory.js view patterns. After stepping
back and doing proper market and regulatory research (see Section 2 below),
this WP is actually the **central product feature** for every F&B tenant —
and the most significant AI-differentiation surface NuAi has.

This document replaces the one-line Phase 2 description with a five-sub-phase
plan (2A through 2E) totalling ~72 hours of focused work. It can be executed
as a single post-demo push or paced across weeks.

**If you are a future agent reading this to execute Phase 2**: start at
Section 0 (amendments), then Section 4 (Architecture) and Section 8
(Execution order). Sections 1-3 are rationale and can be skipped if you
trust the scoping.

---

## SECTION 1 — ASSET INVENTORY (what already exists)

### 1.1 Already built and working

| Asset | Location | What it gives us |
|---|---|---|
| 121 pre-seeded SA ingredients | HQFoodIngredients.js L218-2500 (SEED_INGREDIENTS) | Full DAFF nutrition panels per 100g · 14-allergen R638 flags · HACCP risk levels · temperature zones · shelf life days · country of origin · default units |
| food_ingredients table | 281 rows (121 seeded + 160 tenant-authored), 31 cols | **The canonical F&B library.** Includes weighted_avg_cost and inventory_item_id bridge. |
| FoodWorlds.js (9 worlds) | src/components/hq/FoodWorlds.js | 9 worlds · 28 subcategories · PILL_HIERARCHY two-level drill-down · icons · banner colours · smart tags · typical-zone/shelf defaults · auto-allergen rules |
| ProteaAI v1.8 | src/components/ProteaAI.js (LOCKED) | Streaming chat · live SQL query tab · tool calling · context-aware per tab · ai-copilot EF v75 · systemOverride for custom system prompts |
| process-document EF v61 | Supabase Edge Function | AI reads any business doc (invoice, COA, delivery note, label photo) · extracts structured fields · HMAC anti-fraud · SARS compliance check |
| sign-qr / verify-qr EFs | Supabase Edge Functions | HMAC-SHA256 signing · GPS scan logging · batch/lot QR infrastructure |
| ai-copilot EF v75 | Supabase Edge Function | All Anthropic API calls route through here (LL-120) · streaming · tool use |
| Multi-tenant RLS substrate | 109 DB tables | Full tenant isolation · industry-profile branching (cannabis_retail, cannabis_dispensary, food_beverage, general_retail) |
| Schema for recipes | food_recipes (23 rows, 3 tenants), food_recipe_lines (128 rows) | Tables exist, not yet wired into HQFoodIngredients. See §0.5 anomaly. |

### 1.2 Already built but not used by HQFoodIngredients

| Asset | Where it lives today | What Phase 2 unlocks |
|---|---|---|
| FoodWorlds.js pill nav | Exported, unused | Drill-down navigation (SC-06) |
| FoodWorlds.js smart tags helper | Exported, unused | Expiry/zone/allergen chips on tiles |
| SmartInventory patterns | SmartInventory.js | Tile view, list view, view toggle, column sort, bulk select, smart search, column picker, CSV export, realtime (SC-01 through SC-15) |
| document_log table | Already populated per tenant | Attach COAs and supplier specs to ingredients |
| suppliers table | Already populated | Link ingredients to approved suppliers + batch history |
| stock_movements table | Already populated (2,289+ records) | Last-cost, current stock, batch FIFO for every ingredient |

### 1.3 Weak or missing today

- Single rendering mode — no tile/list toggle
- Flat filtering — no pill hierarchy
- No KPI strip
- No bulk actions
- No recipe linkage surface
- No supplier linkage surface
- No AI ingest of ingredients from documents
- No compliance-view mode
- No consumer-facing allergen filter

---

## SECTION 2 — MARKET AND REGULATORY CONTEXT

### 2.1 What competing F&B ingredient systems have (2026 state of the art)

Consistent across Apicbase, meez, SafetyChain, FoodReady, BatchMaster, QT9,
Dynamics 365, SAP Food One, Lavu/Marty, fatsecret API, Nutritionix, Edamam:

**Table stakes — every modern system has these:**

1. Lot/batch traceability with farm-to-plate history
2. Automatic allergen propagation — update one ingredient, every recipe using it updates
3. Cost tracking per batch with weighted-average cost rolling forward
4. Supplier linkage — every ingredient tied to approved supplier + Certificate of Analysis
5. HACCP monitoring with automated deviation alerts
6. Recipe version control with change history
7. Nutrition label auto-generation
8. Expiry/shelf-life monitoring with FIFO/FEFO picking logic
9. Digital forms for receiving, sanitation, temperature logs
10. Recall simulation — "if ingredient X contaminated, which batches/recipes/orders hit"

**Competitive-edge features 2026 leaders are adding:**

1. **AI recipe import from PDF/photos** (Apicbase AI, meez)
2. **AI allergen / cross-contamination alerts** (Lavu Marty)
3. **Predictive recall prevention** (SafetyChain)
4. **Image-to-nutrition** (fatsecret Platform API, 99.7% accuracy)
5. **Voice input in the kitchen** (Marty)
6. **Carbon footprint per ingredient** (ESG 2026 requirement)
7. **Automated supplier COA validation**

### 2.2 SA regulatory context (specific)

- **Regulation R638 of 2018** — Foodstuffs, Cosmetics and Disinfectants Act
  (Act 54 of 1972). Mandatory for every food premises.
- **Certificate of Acceptability (CoA)** — issued by local Environmental
  Health Practitioner (EHP). Must be displayed on premises. Non-transferable.
- **R638 record-keeping requirements**: training records, cleaning schedules,
  water testing (if borehole), pest control, temperature logs, supplier
  records, receiving records — all mandatory, all inspection-ready.
- **DAFF / SABS standards**: meat (R1072/R350), poultry (R153), ostrich (R54),
  seafood, dairy.
- **Department of Health allergen labeling** — nutritional info tables
  required when present on label.
- **EHP inspection** — the person enforcing it all. Digital records accepted
  but must be producible on demand.

### 2.3 Three user contexts (NuAi must serve all three)

**Context 1: Chef / kitchen manager** (primary daily user)
- Entry: HQ → Food Ingredients
- Task: look up, add, update ingredient; check stock; build recipes
- Needs: fast search, clear category nav, mobile-friendly (in the kitchen)

**Context 2: Compliance officer / owner** (weekly review)
- Entry: same page, "Compliance View" mode
- Task: check missing data, expiring certs, HACCP flags, allergen completeness
- Needs: KPI strip, bulk actions, audit trail, export to inspector

**Context 3: Consumer-facing** (future revenue lever)
- Entry: /shop menu allergen filter
- Task: diner with allergy picks a safe dish
- Needs: instant, trustworthy, allergen-filtered menu (SA analogue of US SB68)

---

## SECTION 3 — WHY AI BELONGS HERE (PRODUCT THESIS)

Not every surface needs AI. But an ingredient library is unique:

1. **Data-ingest intensity** — SA restaurants have 200-500 ingredients each.
   Every one needs name, category, allergen profile, nutrition table, supplier,
   HACCP risk. Manual entry is days of work. AI ingest of supplier docs
   collapses this to minutes.

2. **Graph complexity** — ingredients connect to recipes, suppliers, stock
   movements, orders, customers, regulatory documents, training records, HACCP
   logs. No user can hold this graph in their head. AI surfaces walk the
   graph on demand ("if peanuts recalled, who's affected").

3. **Regulatory audit burden** — R638 record-keeping is mandatory and
   tedious. AI can auto-generate inspection packs from live data.

4. **Substitution and allergen reasoning** — cooks constantly need
   "what can I substitute for X". AI does this well. WITH A CAVEAT: research
   explicitly warns against AI-generated allergen advice for anaphylaxis-level
   safety. Position as "menu testing suggestion" not "safe for diners."

**Five AI features that genuinely add value here (ranked by demo impact):**

| # | Feature | Rationale | Risk |
|---|---|---|---|
| AI-1 | **Ingredient ingest from any document** | Biggest single win. Turn a PDF/photo/handwritten spec into a structured ingredient with allergens + nutrition + HACCP suggestion. Uses process-document EF (exists). | Low |
| AI-2 | **Recipe-aware ingredient intelligence** | Every ingredient row shows: used in N recipes, last cost, trend, stock, batch FIFO. Uses ai-copilot tool calling. No new schema. | Low |
| AI-3 | **Automated HACCP risk assessment** | New ingredient → AI suggests risk level + monitoring frequency + CCPs. Chef approves. | Medium |
| AI-4 | **Natural-language search across F&B graph** | Port ProteaAI Query tab into HQFoodIngredients with F&B-aware tokens. | Low |
| AI-5 | **Recall drill simulation** | "If X contaminated, which batches/recipes/orders affected?" AI walks join graph, produces audit report. | Medium |

**Five AI features to NOT build (commodity or risky):**

- AI recipe generation from scratch (commodity — ChefGPT etc.)
- AI nutritional label from photo-of-plate (too lossy)
- AI pricing optimisation per ingredient (dangerous without context)
- AI dietitian / medical advice (liability — research warned explicitly)
- Generative flavour pairing for new menus (not SA market's pain point)

---

## SECTION 4 — ARCHITECTURE

### 4.1 The five sub-phases

```
Phase 2A — SmartInventory feature parity           ~20 hours
Phase 2B — AI ingredient ingest (killer app)       ~15 hours
Phase 2C — Recipe linkage surface                  ~12 hours
Phase 2D — Compliance view mode                    ~10 hours
Phase 2E — Consumer-facing allergen filter         ~15 hours  → STILL DEFERRED
                                                   ————————
                                                   ~57 hours (approved scope, 7 focused days)
                                                   ~72 hours if 2E added later
```

### 4.2 Dependency graph

```
2A (feature parity)
 │
 ├── 2B (AI ingest)           → can run in parallel with 2A
 │
 ├── 2C (recipe linkage)      → needs 2A's list view structure
 │    │
 │    └── 2D (compliance view) → needs 2C's graph-walking helpers
 │
 └── 2E (consumer shop)        → needs 2A+2C stable, STILL DEFERRED per §0.1
```

Approved Phase 2 = 2A + 2B + 2C + 2D = ~57 hours.
2E added only when a client asks for consumer-facing allergen filtering.

### 4.3 File-level architecture decisions

**DO:**
- Keep HQFoodIngredients.js as the tenant-portal container component
- Extract TileView, ListView, CompliancePanel, AIIngestModal into sibling files
  under src/components/hq/food/ (new subdirectory)
- Reuse SmartInventory.js patterns by IMPORTING its shared components where
  possible — do not duplicate
- Use FoodWorlds.js for ALL category/subcategory/icon/smart-tag logic
- Route ALL AI calls through ai-copilot EF (LL-120)
- Store AI-ingested drafts in a new `ingredient_ingest_queue` table before
  user approval — never write directly to `food_ingredients` (corrected per §0.2)

**DO NOT:**
- Create a parallel ingredient list component — one source of truth only
- Add AI to Consumer Shop directly — route through Gateway EF for caching
- Write to `food_ingredients` from AI without user review step (corrected per §0.2)
- Use OpenAI or any non-Claude model — ai-copilot EF only (LL-120)
- Break WTU-007 — SEED_INGREDIENTS schema is frozen

### 4.4 New DB tables required

**2B requires** (see §0.3 for corrected DDL — supersedes this block):

```sql
-- ORIGINAL S293 DDL — superseded by §0.3 above. Retained for diff history.
CREATE TABLE ingredient_ingest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_document_id UUID REFERENCES document_log(id),
  source_type TEXT CHECK (source_type IN ('invoice','coa','spec_sheet','label_photo','recipe_pdf','manual_paste')),
  ai_extracted_data JSONB NOT NULL,
  suggested_subcategory TEXT,
  suggested_allergens JSONB,
  suggested_haccp_level TEXT CHECK (suggested_haccp_level IN ('low','medium','high','critical')),
  confidence_score NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','edited')),
  user_edits JSONB,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_inventory_item_id UUID REFERENCES inventory_items(id),  -- WRONG: see §0.3
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**2D requires** (corrected per §0.2 — target is food_ingredients, not inventory_items):

```sql
ALTER TABLE food_ingredients ADD COLUMN IF NOT EXISTS last_haccp_review_at TIMESTAMPTZ;
ALTER TABLE food_ingredients ADD COLUMN IF NOT EXISTS last_haccp_reviewer UUID REFERENCES auth.users(id);
ALTER TABLE food_ingredients ADD COLUMN IF NOT EXISTS coa_document_id UUID REFERENCES document_log(id);
ALTER TABLE food_ingredients ADD COLUMN IF NOT EXISTS compliance_notes TEXT;

-- All RLS-bypass-aware per LL-205
```

**2C requires (no new tables):**
- food_recipe_lines has inventory_item_id FK → join via
  food_ingredients.inventory_item_id bridge
- stock_movements has inventory_item_id FK → same bridge
- See §0.5 for the 19-vs-23 recipe anomaly to investigate first

**2E requires (still deferred):**
- No new tables. `shop_menu_visible` boolean addition to `orders` or `dishes`.

---

## SECTION 5 — PHASE 2A: SMARTINVENTORY FEATURE PARITY

Original audit doc's Phase 2 scope. ~20 hours. Brings HQFoodIngredients up
to SC-01 through SC-15 + SC-17 feature parity.

### 5.1 Features in scope (mapped to WP's SC-XX list)

| # | Feature | FoodWorlds.js support? | Effort |
|---|---|---|---|
| SC-01 | Tile view + status borders | FNB_WORLD_COLORS + getFnbSmartTags ready | 4h |
| SC-02 | List view dense table | Need columns: name, sub_category, zone, shelf_life, allergen flags, stock | 2h |
| SC-03 | View mode toggle | Simple toggle button component | 30min |
| SC-04 | Tile size S/M/L picker | Localstorage persist; 3 CSS variants | 1h |
| SC-05 | KPI card strip | Total · Expiring<7d · Missing allergen · Missing nutrition | 2h |
| SC-06 | PILL_HIERARCHY drill-down | FNB_PILL_HIERARCHY ready → wire it in (note sub_category vs subcategory — §0.4) | 3h |
| SC-07 | Column sort (list view) | Clickable headers, sort state | 1h |
| SC-08 | Group select + checkboxes | Checkbox column; selection state | 1h |
| SC-09 | Bulk actions | Tag, change zone, export, archive | 1.5h |
| SC-10 | Smart search token parser | FNB_FIELD_MAP ready → wire it in | 1.5h |
| SC-11 | Column picker | Localstorage-backed col visibility | 1h |
| SC-13 | Export CSV | One click, filtered rows → CSV | 30min |
| SC-15 | Realtime subscription | Supabase realtime on food_ingredients (corrected per §0.2) | 30min |
| SC-17 | FoodWorld banner icons | FNB_SUBCATEGORY_ICONS ready | 30min |

SC-12 (column resize) and SC-14 (world picker modal) deferred to Phase 4.

### 5.2 Component extraction

New files under `src/components/hq/food/`:

- `food/FoodTileView.js` — tile grid with FNB_WORLD_COLORS + smart tags
- `food/FoodListView.js` — dense sortable table
- `food/FoodPillNav.js` — FNB_PILL_HIERARCHY drill-down
- `food/FoodKPIStrip.js` — 4-card strip
- `food/FoodSmartSearch.js` — FNB_FIELD_MAP token parser
- `food/FoodBulkActionBar.js` — appears when rows selected

HQFoodIngredients.js becomes thinner — imports these, composes them.

### 5.3 Gate conditions for 2A complete

- [ ] All 14 SC features above working in Garden Bistro, Nourish, MediCare
- [ ] FoodWorlds.js imports working, zero duplicate category definitions in HQFI
- [ ] Mobile-responsive: usable on tablet (not phone — demo is desktop)
- [ ] LL-205 hq_all bypass policies checked for any new query paths on food_ingredients
- [ ] Smoke test all 5 tenants — NO UI regressions in cannabis_retail /
      cannabis_dispensary / general_retail (they use the same component via
      industryProfile guard; must not break for them)

---

## SECTION 6 — PHASE 2B: AI INGREDIENT INGEST

The killer app. ~15 hours. Replaces hours of manual data entry with AI
extraction + user review.

### 6.1 User flow

1. User clicks "+ Add from Document" in HQFoodIngredients header
2. Modal opens with 3 tabs:
   - "Upload file" → drop zone for PDF, JPG, PNG (supplier invoice, COA, label photo)
   - "Paste text" → textarea for copy-pasted spec or handwritten-OCR
   - "Import from URL" → paste URL of supplier product page
3. User uploads/pastes, clicks "Extract"
4. Call new `ingest-ingredient` EF (see 6.3)
5. Claude returns structured extraction:
   ```json
   {
     "name": "Wheat Flour (Cake)",
     "common_name": "Cake Flour",
     "brand": "Sasko",
     "sub_category": "dry_goods_flour",
     "default_unit": "kg",
     "pack_size": "25kg",
     "supplier_name": "Premier Foods",
     "supplier_vat": "...",
     "cost_price_per_unit": 45.50,
     "allergen_flags": {"gluten": true},
     "haccp_risk_level": "medium",
     "temperature_zone": "ambient",
     "shelf_life_days": 180,
     "nutrition_per_100g": {...},
     "coa_reference_number": "...",
     "confidence": {
       "name": 0.98, "allergens": 0.95, "nutrition": 0.70, ...
     }
   }
   ```
6. Frontend shows extraction in editable form with confidence badges
7. User reviews, edits anything AI got wrong, clicks "Save"
8. On save: insert into **food_ingredients** (corrected per §0.2) + update
   ingredient_ingest_queue (status='approved', created_food_ingredient_id set)
   + link source_document_id to document_log

### 6.2 Why a new EF?

Two options:

**Option A: Extend process-document EF (v61)**
- Pro: existing EF, existing HMAC anti-fraud, existing SARS compliance
- Con: process-document is optimised for accounting docs (invoices, expenses).
  Schema for food ingredients is very different.
- Verdict: DON'T. Too much risk of breaking Smart Capture / auto-post-capture.

**Option B: New ingest-ingredient EF (recommended)**
- Uses same ai-copilot LL-120 rule (routes through ai-copilot v75 for Claude call)
- Has its own structured output schema for F&B data
- Own rate limiting, own audit log
- Effort: ~3 hours to scaffold, share the Claude-calling helper with ai-copilot
- Naming: `ingest-ingredient` to be consistent with `process-document`

Verdict: **Option B.** Build `ingest-ingredient` EF.

### 6.3 EF spec: ingest-ingredient

```typescript
// Input
{
  tenant_id: string,
  source_type: 'invoice' | 'coa' | 'spec_sheet' | 'label_photo' | 'recipe_pdf' | 'manual_paste' | 'url',
  source_content: {
    text?: string,           // for paste
    image_base64?: string,   // for upload
    url?: string,            // for URL scrape
    mime_type?: string
  }
}

// Output
{
  success: boolean,
  queue_id: string,          // ingredient_ingest_queue.id for user to approve
  extraction: {
    fields: {...},           // all ingredient fields, keyed to food_ingredients columns
    confidence: {...},       // per-field 0-1 confidence
    warnings: string[]       // e.g., "could not detect allergens", "nutrition incomplete"
  }
}
```

### 6.4 AI prompt engineering

System prompt (core):
```
You are an F&B ingredient ingest assistant for NuAi, a SA-focused ERP platform.
Extract structured ingredient data from the provided source.

SOUTH AFRICAN CONTEXT:
- Regulation R638 of 2018 — 14 mandatory allergens: gluten, crustaceans, eggs,
  fish, peanuts, soybeans, milk, nuts, celery, mustard, sesame, sulphites,
  lupin, molluscs
- Typical suppliers: Premier Foods, Pioneer Foods, Tiger Brands, RCL Foods,
  Woolworths Wholesale, Makro Commercial
- Common units: kg, g, L, ml, each
- Standard pack sizes: 100g, 500g, 1kg, 2.5kg, 5kg, 10kg, 25kg (dry);
  250ml, 500ml, 1L, 2L, 5L (liquid)

FNB SUB_CATEGORIES (must pick one, use underscore — matches food_ingredients schema):
[... FNB_SUBCATEGORIES list from FoodWorlds.js ...]

OUTPUT: Valid JSON only, no markdown. Use the schema below.
Return sub_category (with underscore), not subcategory.
If a field is not derivable from the source, omit it (do not guess).
For allergens: set true only if explicitly stated OR if the ingredient
category intrinsically contains it (e.g., cheese → milk:true).
Report per-field confidence 0-1.
```

### 6.5 Gate conditions for 2B complete

- [ ] ingest-ingredient EF deployed, responds to test payloads in <10s
- [ ] ingredient_ingest_queue table created with RLS + hq_all bypass (per §0.3)
- [ ] "Add from Document" modal working in HQFoodIngredients
- [ ] Extraction confidence < 0.7 on any field → field rendered in amber
- [ ] User can approve, edit, or reject extraction
- [ ] Approved extractions insert into **food_ingredients** with correct tenant_id (corrected per §0.2)
- [ ] Source document linked via ingredient_ingest_queue.source_document_id (audit trail)
- [ ] Smoke test: PDF invoice + photo of bag + handwritten spec → all extract

---

## SECTION 7 — PHASE 2C, 2D, 2E

### 7.1 Phase 2C — Recipe linkage surface (~12 hours)

Every ingredient row surfaces its graph. No AI required — just joined queries.

**Data needed (all via existing tables):**
- "Used in N recipes" → count from `food_recipe_lines WHERE inventory_item_id = food_ingredients.inventory_item_id`
  — **first verify the §0.5 anomaly** (128 lines → 19 recipe_ids but 23 recipes exist)
- "Last cost" → MAX(created_at) from stock_movements or stock_receipts, joined via
  food_ingredients.inventory_item_id
- "Cost trend 30d" → food_ingredients.weighted_avg_cost (pre-computed) OR
  rolling avg from stock_movements
- "Current stock" → inventory_items.quantity_on_hand via bridge
- "Batch FIFO" → stock_movements GROUPED by batch_number, sorted by expiry
- "Typical supplier" → MODE(supplier_id) from stock_receipts, or
  food_ingredients.preferred_supplier_id direct

**UI additions:**
- Hover-card on tile view shows: "Used in 4 recipes · R180/kg · 3.2 kg on hand"
- Drawer view (existing IngredientDrawer at L2629) gets "Recipes" tab +
  "Supply" tab + "Cost Trend" chart

**AI enhancement (small):**
- "Analyse this ingredient" button → ai-copilot streams Claude's comment on the
  graph data. Not required for 2C-pass, flag as 2C.1 stretch.

### 7.2 Phase 2D — Compliance view mode (~10 hours)

Second UI mode on HQFoodIngredients. Toggle button in header: "Library /
Compliance." Compliance mode shows:

**Header KPI bar (R638 focused):**
- Ingredients missing allergen data
- Ingredients with COA > 12 months old
- Ingredients not reviewed in last 90 days
- Ingredients with expiry in < 30 days

**Body: tabular heat-map**
- Rows: ingredients (from food_ingredients)
- Columns: R638 record-keeping categories (allergen · nutrition · COA ·
  last HACCP review · supplier approved · cold-chain log)
- Cells: green/amber/red based on completeness (uses new columns from §0.2/§4.4)

**Actions:**
- "Generate R638 Inspection Pack" → PDF with all ingredient compliance status,
  any missing records flagged, ready for EHP inspection
- "Mark Reviewed" → bulk action across selected rows (sets
  food_ingredients.last_haccp_review_at)
- "Attach COA" → file upload per row (sets food_ingredients.coa_document_id)

**AI enhancement:**
- "Run Compliance Health Check" button → ai-copilot walks graph, returns:
  "47 ingredients need attention: 12 missing allergens, 8 COA > 12 months,
   27 no HACCP review in 90 days. Highest priority: [list]."

### 7.3 Phase 2E — Consumer-facing shop allergen filter (~15 hours, STILL DEFERRED)

**Scope:**
- /shop menu page gets "Dietary filter" button
- Filter by: gluten-free, dairy-free, nut-free, vegan, vegetarian, kosher, halal
- Filter is tenant-opt-in (some tenants won't want this)
- Data source: food_recipe_lines → food_ingredients.allergen_flags (roll up via bridge)

**Regulatory positioning:**
- Display prominent disclaimer: "Information derived from supplier labels.
  Not a substitute for direct communication with kitchen staff for severe
  allergies."
- Research explicitly warned against liability on AI-generated allergen advice

**Why still deferred (per §0.1):**
- /shop is Context 3 — new user context not built
- Requires consumer-shop design work, not just backend
- Not on the critical path for current Phase 2 execution
- Year-2 revenue lever

---

## SECTION 8 — EXECUTION ORDER (for Claude Code or future agent)

### Pre-execution checks (every session)

1. Confirm HQFoodIngredients.js current violations < 60 (post-Phase 1 was ~55)
2. Confirm FoodWorlds.js is on main and exports all 9 lists
3. Confirm ProteaAI.js still LOCKED — do not touch it
4. Confirm ai-copilot EF version >= v75 (current at S320)
5. Confirm process-document EF version >= v61 (current at S320)

### Execution sequence

**Week 1: Phase 2A (feature parity)** — 20 hours
Day 1-2: Extract components (TileView, ListView, PillNav, KPIStrip)
Day 3: Smart search + column sort + bulk select
Day 4-5: Realtime subscription + smoke test all 5 tenants

**Week 2: Phase 2B (AI ingest)** — 15 hours
Day 1: DB migration — ingredient_ingest_queue table (per §0.3)
Day 2: ingest-ingredient EF scaffolding (Claude Code via Supabase MCP)
Day 3-4: Frontend modal with 3 upload modes
Day 5: Confidence rendering + approve/reject flow + smoke test

**Week 3: Phase 2C (recipe linkage)** — 12 hours
Day 1: **Investigate §0.5 anomaly** before building UI
Day 2-3: Hover-card + Drawer tabs for Recipes, Supply, Cost Trend
Day 4: Stretch AI "Analyse" button

**Week 4: Phase 2D (compliance view)** — 10 hours
Day 1: DB migration — 4 new columns on **food_ingredients** (corrected per §0.2)
Day 2: Compliance mode toggle + KPI bar
Day 3: Heat-map table + bulk actions
Day 4: R638 Inspection Pack PDF generator (pattern from generate-financial-statements EF)
Day 5: AI "Health Check" button + smoke test

**Phase 2E still deferred** per §0.1.

### Gate conditions between sub-phases

Each sub-phase has its own gate in Sections 5.3 / 6.5 etc. Do not start the
next sub-phase until the previous gate is green.

- 2A alone = substantial improvement, safe to ship
- 2A + 2B = killer feature shipped ("watch this — photo → full ingredient")
- 2A + 2B + 2C = serious competitor product
- 2A + 2B + 2C + 2D = market-leading for SA F&B (the current target)

---

## SECTION 9 — RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI misextracts allergen (safety-critical miss) | Medium | HIGH | Never auto-save AI output; always require user review before insert. Flag low-confidence fields amber. Disclaimer on modal. |
| Ingest EF rate limit / cost blowout | Medium | Medium | Rate limit per tenant per day in EF. Log all calls to existing ai_usage_log. |
| Phase 2A breaks cannabis_retail or general_retail UI | Medium | HIGH | isFoodBev guard mandatory (WTU-003). Smoke test ALL 5 tenants every commit. |
| FoodWorlds.js export drift during Phase 2 | Low | Medium | WTU-004 — names immutable. Read full file before any addition. |
| Ingredient_ingest_queue becomes data dumping ground | Medium | Low | Auto-purge rejected rows after 30 days. |
| Performance degrades on 500+ ingredients per tenant | Medium | Medium | Realtime subscription already scoped — use batched fetches + pagination. |
| Compliance PDF generator timeout on large tenants | Medium | Low | Async generation via EF, email link when ready. |
| Phase 2E liability for allergen advice | Low | HIGH | Explicit disclaimer + "call us for severe allergies" phone number + post-deferral build only. |
| §0.5 recipe anomaly rendered as UI before investigation | Medium | Medium | 2C Day 1 is anomaly investigation before any UI. |
| Schema drift (sub_category vs subcategory) silently filters results | Medium | HIGH | 2A Day 2 explicitly verifies pill nav returns non-empty rows against food_ingredients before shipping. |

---

## SECTION 10 — NEW LLs TO ESTABLISH DURING EXECUTION

These rules should be added to NUAI-AGENT-BIBLE.md as sub-phases complete.
Note: LL-291 through LL-294 were already taken for other rules before S320
(see Bible). Renumber below to next free slot when adopting:

- **LL-2Bx** (draft) — AI extraction output never writes directly to
  `food_ingredients`; always stages in ingredient_ingest_queue for user review.
- **LL-2By** (draft) — Every AI-extracted field must render its confidence
  score in the review UI. Below 0.7 = amber; below 0.5 = red.
- **LL-2Dx** (draft) — R638 Inspection Pack PDFs must be generated from live
  DB data only, never from cached snapshots (inspection-time authenticity).
- **LL-2Ex** (draft) — Consumer allergen filter (/shop) is tenant-opt-in.
  Default OFF until tenant signs liability acknowledgement.

---

## SECTION 11 — WHAT SUCCESS LOOKS LIKE

At the end of Phase 2 (excluding 2E), a new F&B client should be able to:

1. Take 200 supplier invoices → upload them in batch via AI ingest → review
   extractions in 30 minutes → have a fully-populated 200-ingredient library
   (vs. 3 days of manual entry)

2. Get a real-time view of their entire ingredient graph — which are
   expiring, which have missing allergen data, which haven't had a HACCP
   review, which are in active recipes, which are low stock

3. Produce a complete R638 Inspection Pack PDF in under 60 seconds, ready
   for the EHP

4. Ask the system in plain English — "show me all dairy ingredients
   expiring within 7 days that are used in recipes on this week's menu"

5. Simulate a recall — "if peanuts contaminated, which batches / recipes /
   orders are affected?" — and get a grounded answer in seconds

This feature combination does not exist in any SA F&B product today. It
exists in premium international systems (Apicbase £2000/mo, SAP Food One
£10000+/mo) but not at NuAi's positioning. Phase 2 is where NuAi goes from
"nice ERP" to "the obvious choice for SA F&B."

---

## SECTION 12 — SCOPE DOC PROVENANCE

- Authored: Session 293, 17 April 2026, Claude.ai (Claude Opus 4.7)
- Amended: Session 320, 18 April 2026, Claude.ai (Claude Opus 4.7)
  - Demo on hold → execution unlocked (§0.1)
  - Target table drift corrected: food_ingredients, not inventory_items (§0.2)
  - ingredient_ingest_queue DDL corrected (§0.3)
  - sub_category vs subcategory naming note added (§0.4)
  - food_recipe_lines anomaly flagged for 2C Day-1 investigation (§0.5)
  - EF version numbers refreshed (ai-copilot v75, process-document v61)
  - LL numbering collision noted (LL-291–294 already taken)
- Based on: live codebase read at HEAD f3f9001 (S293) + HEAD 6451151 (S320),
  plus live Supabase schema inspection (S320), plus web research into
  Apicbase, meez, SafetyChain, FoodReady, Dynamics 365, SAP Food One, Lavu,
  fatsecret, Nutritionix, Edamam, plus SA R638/DAFF regulatory sources
- Approved by: Owner, Session 293 (original scope), Session 320 (amendments)
- Intended executor: Claude Code, starting next session from PR 2A.1
- Supersedes: the one-line Phase 2 description in WP-TABLE-UNIFY_v1_0.md

---
*WP-TABLE-UNIFY PHASE 2 · NuAi · 17 April 2026 · Amended 18 April 2026*
*In-execution work package. 2A → 2D (~57h). 2E still deferred.*
