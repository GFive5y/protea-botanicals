# WP-TABLE-UNIFY PHASE 2B — SPLIT PLAN
## AI Document Ingest for Food & Beverage Ingredients
## Produced: Session post-2A.6, 18 April 2026 (Claude.ai planner)
## Amended: S-2B.2, 19 April 2026 — 2B.1 + 2B.2 shipped, 2B.3-5 pending
## Status: IN EXECUTION · 2 of 5 PRs shipped

---

## EXECUTION STATUS (Phase 2B SHIPPED — 19 April 2026)

| PR | Status | Commit / Version | Notes |
|---|---|---|---|
| 2B.1 | SHIPPED | 73f8135 | Migration: ingredient_ingest_queue + 5 RLS policies |
| 2B.2 | SHIPPED | 889a145 (EF v65) | process-document v62 — F&B branch + queue write. Direct-EF smoke test verified 10 Premier Foods ingredients correctly classified. |
| 2B.3 | SHIPPED | cf7974c | HQ "+ Add from Document" modal (upload + paste + URL coming-soon). |
| 2B.3.1 | SHIPPED | b18b092 | Hotfix: tenant_id thread-through to EF body (see LL-307). |
| 2B.4 | SHIPPED | a166174 | Ingest Queue tab + review drawer + fn_approve_ingested_ingredient RPC + 5-case regression harness. |
| 2B.5 | SHIPPED | (this commit) | Gate PR — docs close-out, LL-306 + LL-307 escalated, Phase 2B fully retired. |

**Commercial context** (mirrored from Phase 2 scope doc Section 11):
This is the killer-app sub-phase of Phase 2. The feature combination
(AI ingest + SA R638 allergen rules + HACCP + SA supplier context)
does not exist in any SA F&B product today. 2B.3 + 2B.4 shipped
together = the demo moment that sells the platform.

**Under Procedure 6** (planner/executor rhythm per LOOP-PRINCIPLES
Principle 7), each PR is one planner scope + one Claude Code commit
+ one planner review. Do not scope 2B.3 and 2B.4 in the same
instruction block — consecutive sessions, separate reviews.

---

## SECTION 0 — HEADERS AND CONTEXT

### 0.1 Parent scope reference

This doc is the **split plan** for Phase 2B of WP-TABLE-UNIFY Phase 2. It
decomposes the ~15-hour parent-doc scope into 5 executable PRs. The parent
doc (`WP-TABLE-UNIFY_PHASE2_v1.md` §6) and its S320 amendments (§0.2 table
correction, §0.3 DDL, §0.4 naming drift) remain authoritative for
architecture decisions. This doc is authoritative for **execution order,
file-level changes, and gate conditions per PR.**

### 0.2 Entry state (verified at this session)

| Item | State |
|---|---|
| HEAD | `3a7ab6e` (2A.6 DS6 compliance landed) |
| Phase 2A | 6 PRs shipped, gate items clean |
| Supabase project | `uvicrqapgzcdvozxrreo` (eu-west-1) |
| `process-document` EF | v61, ACTIVE, SHA `e55629de...` |
| `ai-copilot` EF | v75, ACTIVE (header comment says v67 — stale; actual is 75) |
| `document_log` table | 40 cols, Smart Capture fingerprint columns present |
| `capture_queue` table | 52 cols, Smart Capture mobile staging, 6 test rows |
| `food_ingredients` | 281 rows (121 seeded + 160 tenant-authored) across 2 F&B tenants |
| `food_recipes` | 23 rows across 3 tenants |
| `ingredient_ingest_queue` | NOT YET CREATED — 2B.1 migration |

### 0.3 Architectural decision (supersedes parent §6.2)

The parent doc's Section 6.2 recommended **Option B: build a new
`ingest-ingredient` EF as sibling to `process-document`**. That recommendation
was based on an incomplete read of `process-document` v61. A careful re-read
at S-post-2A.6 showed:

- `process-document` already branches on `industry_profile` (cannabis_retail /
  food_beverage / general_retail) at prompt level
- The 7-point SA bank fingerprint + 6-level dedup system (WP-SMART-CAPTURE
  v2.1) lives inside `process-document` and serves both HQ and mobile flows
- Adding `action: create_food_ingredient` to `proposed_updates` is natural —
  the polymorphic action enum already handles expense/PO/stock/price/supplier
  cases
- Building a sibling EF would duplicate ~500 lines of proven logic
  (fingerprint, SARS, dedup, lump-sum cost allocation)

**Revised decision: Option 1 — extend `process-document` with a F&B ingredient
branch, deploy as v62.** Regression risk contained by:
- New logic is gated under `industry_profile === 'food_beverage'`
- Cannabis tenants (Pure Premium THC Vapes, Medi Recreational) and general
  retail tenants see identical prompt + output as v61
- New action type `create_food_ingredient` writes to a staging table
  (`ingredient_ingest_queue`), never directly to `food_ingredients`

**Trade-off acknowledged:** this keeps `process-document` at ~1,400 lines
(grows from 1,247). Refactor to shared Deno modules (`_shared/fingerprint.ts`,
`_shared/sars-compliance.ts`) is the right long-term move but sits as a
separate work-package (WP-EF-MODULES) to avoid refactoring a production EF
during a feature push.

### 0.4 Scope boundaries (non-negotiable)

**IN SCOPE for Phase 2B:**
1. `ingredient_ingest_queue` table + RLS per parent §0.3
2. `process-document` EF extension: F&B branch, new action type, queue write
3. HQ desktop "+ Add from Document" modal in `HQFoodIngredients.js`
4. Review-and-approve UI (queue list, edit form, confidence rendering)
5. Approve → insert into `food_ingredients` with correct tenant_id + source
   document linkage
6. Audit placemarker emitted on every step (per 2A.5 pattern)

**OUT OF SCOPE for Phase 2B — documented as future work:**
1. **Mobile Smart Capture for ingredients** — deferred to Phase 2F (future).
   The mobile `capture_queue` flow currently handles petrol slips, invoices,
   and proofs of payment for bookkeeping. Extending it to photograph a bag of
   rooibos and ingest it into `food_ingredients` is a separate UX problem
   (kitchen lighting, mobile camera quality on small-print allergen panels,
   one-handed use). Must be scoped when a client asks for it OR when we have
   bandwidth. **UI placemarker required in 2B.3** (see Section 4).
2. **Batch upload mode** — 200 invoices in one drop. Parent doc's Section 11
   demo narrative implies this, but the critical path for Phase 2B is
   single-document ingest per user action. Batch mode is 2F or 2G.
3. **URL scraping** — parent §6.1 lists "Import from URL" as one of 3 modal
   tabs. Keep the tab, but mark "Coming soon" — URL scraping inside an EF is
   a meaningfully different feature (CORS, robots.txt, JS rendering) and
   isn't the demo moment.
4. **Real audit_log integration** — stays on placemarker path per WP-AUDIT-UNIFY.
5. **Cronometer/USDA nutrition autofill** — dropped per owner decision; for SA
   context DAFF-rooted data is required and no public DAFF API exists.

### 0.5 Caveats called out explicitly (per owner instruction)

1. **Regression risk on Pure PTV and cannabis tenants.** process-document v62
   must behave identically to v61 for non-food_beverage tenants. Gate-tested
   in 2B.2 with Pure Premium THC Vapes + MediCare Dispensary + Medi
   Recreational tenant contexts.

2. **LL-120 technical debt preserved.** process-document calls Anthropic API
   directly (at `https://api.anthropic.com/v1/messages` in the EF) rather
   than routing through ai-copilot. This predates 2B and isn't fixed by 2B —
   refactoring it would touch the Anthropic call site and introduce unneeded
   risk. Flag in DEBT_REGISTER_v1.md as `WP-EF-LL120-RECONCILE` (separate WP).

3. **Confidence thresholds.** Parent §6.4 specified amber below 0.7, red below
   0.5. Retained for 2B. Stricter thresholds (amber 0.8, red 0.6) discussed
   but deferred — we need to see real-world extraction results on SA F&B
   documents before tuning.

4. **Food-specific prompt additions must include SA R638 context.** 14
   mandatory allergen flags (gluten, crustaceans, eggs, fish, peanuts,
   soybeans, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs).
   DAFF/SABS standards references where applicable. Common SA F&B suppliers
   (Premier Foods, Pioneer, Tiger Brands, RCL, Woolworths Wholesale, Makro
   Commercial) in the existing suppliers list context.

5. **sub_category vs subcategory naming drift** (parent §0.4). `food_ingredients`
   schema uses `sub_category` with underscore. `FoodWorlds.js` constants use
   `subcategory` without. The EF output must match `food_ingredients` column
   name: `sub_category`. Frontend mapping in 2B.4 handles the inverse when
   rendering PILL navigation. Same rule Phase 2A already observed.

6. **§0.5 recipe anomaly now explained.** 4 Garden Bistro recipes (Lamb Shank
   Provencale, Malva Pudding, Mushroom Risotto, Pan-seared Linefish) are in
   `status='approved'` with zero line items — seeded shells, not FK drift.
   Noted here; Phase 2C Day 1 can proceed without the "investigate anomaly"
   precaution since the anomaly is benign.

7. **Image hash is currently a proxy** in process-document v61
   (`${mime_type}:${file_size_kb}:${file_base64.slice(0,80)}`). Real SHA-256
   hashing improves dedup reliability. Not in 2B scope; flag as
   `WP-IMAGE-HASH-REAL` future WP.

---

## SECTION 1 — PR SPLIT

| PR | Name | Files touched | Est | Blocks |
|---|---|---|---|---|
| 2B.1 | Migration — `ingredient_ingest_queue` table + RLS | supabase via MCP (migration only) | 1.5h | 2B.2 |
| 2B.2 | `process-document` v62 — F&B branch + `create_food_ingredient` + queue write | EF deploy via MCP + regression SQL | 5h | 2B.3 |
| 2B.3 | HQ "+ Add from Document" modal — upload/paste tabs | `src/components/hq/food/FoodIngestModal.js` (new), `HQFoodIngredients.js` (header button) | 3h | 2B.4 |
| 2B.4 | Review-and-approve UI — queue list + edit form + confidence | `src/components/hq/food/FoodIngestQueuePanel.js` (new), `HQFoodIngredients.js` (new tab) | 3.5h | 2B.5 |
| 2B.5 | Gate PR — smoke test 5 tenants + amber/red rendering + duplicate detection | no new files, commit is docs (DECISION-JOURNAL, PENDING-ACTIONS) | 1h | — |

**Total: 14h across 5 PRs.** (Parent doc estimated 15h before the Option 1
simplification removed ~3h of sibling-EF scaffolding; added back ~2h for
regression testing against existing tenants.)

---

## SECTION 2 — PR 2B.1: MIGRATION

### 2.1 Scope
Create `ingredient_ingest_queue` table per parent §0.3 corrected DDL.
Add RLS policies following LL-205 pattern (tenant isolation + hq_all bypass).

### 2.2 Migration SQL (to be applied via Supabase MCP by planner before 2B.2 commit)

```sql
-- Name: 2026_04_18_ingredient_ingest_queue
CREATE TABLE ingredient_ingest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES document_log(id) ON DELETE SET NULL,
  source_type TEXT CHECK (source_type IN ('invoice','coa','spec_sheet','label_photo','recipe_pdf','manual_paste','url')),
  ai_extracted_data JSONB NOT NULL,
  suggested_sub_category TEXT,           -- underscore per food_ingredients schema
  suggested_allergens JSONB,
  suggested_haccp_level TEXT CHECK (suggested_haccp_level IN ('low','medium','high','critical')),
  confidence_score NUMERIC,              -- overall 0-1
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','edited')),
  user_edits JSONB,                      -- diff between ai_extracted_data and approved payload
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_food_ingredient_id UUID REFERENCES food_ingredients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingest_queue_tenant_status ON ingredient_ingest_queue (tenant_id, status, created_at DESC);
CREATE INDEX idx_ingest_queue_source_doc ON ingredient_ingest_queue (source_document_id) WHERE source_document_id IS NOT NULL;

-- RLS
ALTER TABLE ingredient_ingest_queue ENABLE ROW LEVEL SECURITY;

-- Tenant SELECT: own tenant's queue rows
CREATE POLICY fnb_ingest_tenant_select ON ingredient_ingest_queue FOR SELECT
USING (tenant_id = user_tenant_id());

-- Tenant INSERT: service role only (EF writes, not clients)
-- (no user INSERT policy = effectively blocked for non-service-role)

-- Tenant UPDATE: tenant HQ can approve/reject/edit their own queue rows
CREATE POLICY fnb_ingest_tenant_update ON ingredient_ingest_queue FOR UPDATE
USING (tenant_id = user_tenant_id() AND is_staff_or_admin())
WITH CHECK (tenant_id = user_tenant_id() AND is_staff_or_admin());

-- Tenant DELETE: tenant HQ can purge their own rejected rows
CREATE POLICY fnb_ingest_tenant_delete ON ingredient_ingest_queue FOR DELETE
USING (tenant_id = user_tenant_id() AND is_staff_or_admin() AND status IN ('rejected','approved'));

-- hq_all bypass for super admins (LL-205)
CREATE POLICY hq_all_ingest_select ON ingredient_ingest_queue FOR SELECT
USING (is_hq_user());

CREATE POLICY hq_all_ingest_all ON ingredient_ingest_queue FOR ALL
USING (is_hq_user())
WITH CHECK (is_hq_user());

COMMENT ON TABLE ingredient_ingest_queue IS
'WTU 2B — staging table for AI-extracted food ingredient data. Row flows: pending -> approved (-> creates food_ingredients row) or pending -> rejected. Populated by process-document EF v62+. Reviewed in HQFoodIngredients.js ingest queue panel.';
```

### 2.3 Gate conditions for 2B.1
- [ ] Migration applies without error
- [ ] `SELECT policyname, cmd FROM pg_policies WHERE tablename='ingredient_ingest_queue'` returns 5 policies
- [ ] Manual INSERT test as Garden Bistro admin user returns RLS rejection
  (writes must come via EF service role only)
- [ ] Manual SELECT test as Garden Bistro admin returns own-tenant rows only
- [ ] Build still passes (no DB query changes in this PR)

### 2.4 No code changes in 2B.1
This is a pure migration PR. Claude Code commits an entry to
`docs/DECISION-JOURNAL.md` referencing the applied migration but makes no
frontend or EF changes.

---

## SECTION 3 — PR 2B.2: process-document v62

### 3.1 Scope
Extend `process-document` EF to handle `industry_profile === 'food_beverage'`
extraction flow. Add `create_food_ingredient` to the `proposed_updates` action
enum. When that action fires, write to `ingredient_ingest_queue` instead of
`food_ingredients` directly.

### 3.2 Code changes

**A. System prompt extension** (inside `buildSystemPrompt()`)

Add a conditional block inside the function:

```typescript
const foodIngredientContext = industryProfile === 'food_beverage' ? `

=======================================================
FOOD & BEVERAGE INGREDIENT EXTRACTION (industry_profile=food_beverage)
=======================================================
When the document contains ingredient spec information (supplier invoice
with nutrition panel, COA, product spec sheet, label photo), propose a
create_food_ingredient action PER INGREDIENT.

SA REGULATORY CONTEXT — Regulation R638 of 2018 Foodstuffs Act:
14 MANDATORY ALLERGENS to flag. Set allergen_flags[key]=true only when:
  - Explicitly declared on the document ("contains: wheat, milk, egg"), OR
  - The ingredient category intrinsically contains it (cheese -> milk, wheat
    flour -> gluten, peanut butter -> peanuts)
Keys (must match food_ingredients.allergen_flags exactly):
  gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, nuts,
  celery, mustard, sesame, sulphites, lupin, molluscs

TYPICAL SA F&B SUPPLIERS (use for supplier matching):
  Premier Foods (Sasko, Blue Ribbon, Snowflake)
  Pioneer Foods (Weetbix, Bokomo, Sasko)
  Tiger Brands (Jungle Oats, All Gold, Koo)
  RCL Foods (Selati, Rainbow, Nola)
  Woolworths Wholesale, Makro Commercial
  Fry's, Spekko, Tastic (rice)
  Clover, Parmalat, Danone (dairy)

SUB_CATEGORIES — REQUIRED to match food_ingredients.sub_category exactly
(underscore, not hyphen or camelCase). Pick ONE:
  [LIST_FROM_FOODWORLDS_SUBCATEGORIES]

TEMPERATURE ZONE — must be one of: ambient | refrigerated | frozen | hot
SHELF LIFE — days (integer) or null if unknown
HACCP RISK — low | medium | high | critical
DEFAULT UNIT — kg (solids), L (liquids), each (individual items)

create_food_ingredient EXAMPLE:
{
  "action": "create_food_ingredient",
  "table": "ingredient_ingest_queue",
  "record_id": null,
  "description": "Queue food ingredient: Cake Flour 25kg Sasko",
  "data": {
    "name": "Wheat Flour, Cake",
    "common_name": "Cake Flour",
    "sub_category": "dry_goods_flour",
    "default_unit": "kg",
    "pack_size_value": 25,
    "pack_size_unit": "kg",
    "supplier_name": "Premier Foods (Sasko)",
    "brand": "Sasko",
    "cost_price_per_unit": 18.20,
    "allergen_flags": { "gluten": true },
    "haccp_risk_level": "medium",
    "temperature_zone": "ambient",
    "shelf_life_days": 180,
    "nutrition_per_100g": {
      "energy_kcal": 364, "energy_kj": 1523,
      "protein_g": 10.3, "fat_total_g": 1.2, "fat_saturated_g": 0.3,
      "carbohydrate_g": 76.3, "sugars_g": 0.5, "dietary_fibre_g": 2.7,
      "sodium_mg": 2
    },
    "country_of_origin": "ZA",
    "coa_reference_number": null,
    "field_confidence": {
      "name": 0.98, "sub_category": 0.95, "allergens": 0.99,
      "haccp": 0.75, "nutrition": 0.82, "cost": 0.90
    }
  },
  "confidence": 0.88
}

RULE: If the document contains multiple distinct ingredients (delivery note
with 12 line items, price list with 40 items), emit ONE
create_food_ingredient per item.

RULE: If nutrition panel or allergen panel is NOT visible on the document,
OMIT those fields (set to null or omit entirely — do not guess).

RULE: Confidence per field: 0.0 to 1.0.
` : '';
```

**B. Main handler write path** (inside `serve()`, after extraction parsed)

```typescript
// WTU 2B — F&B ingredient queue write
if (industryProfile === 'food_beverage') {
  const ingredientActions = (extraction.proposed_updates as Array<Record>)
    ?.filter(u => u.action === 'create_food_ingredient') || [];

  if (ingredientActions.length > 0 && tenant_id) {
    const queueInserts = ingredientActions.map(action => {
      const data = (action.data as Record) || {};
      return {
        tenant_id,
        source_document_id: logEntry.id,
        source_type: classifyIngredientSourceType(extraction, captureType),
        ai_extracted_data: data,
        suggested_sub_category: (data.sub_category as string) || null,
        suggested_allergens: data.allergen_flags || null,
        suggested_haccp_level: (data.haccp_risk_level as string) || null,
        confidence_score: Number(action.confidence ?? 0.8),
        status: 'pending',
      };
    });

    const { data: queueRows, error: queueErr } = await db
      .from('ingredient_ingest_queue')
      .insert(queueInserts)
      .select('id');

    if (queueErr) {
      console.error('[process-document v62] queue insert failed:', queueErr);
    } else {
      extraction.queued_ingredient_ids = (queueRows || []).map(r => r.id);
      extraction.queued_ingredient_count = queueRows?.length || 0;
    }
  }
}
```

**C. Version bump**
```
// v2.3 — WTU 2B: food_beverage ingredient extraction + ingredient_ingest_queue write
```

**D. Response payload addition**
```typescript
return new Response(JSON.stringify({
  // ... existing fields ...
  queued_ingredient_ids: (extraction as any).queued_ingredient_ids || [],
  queued_ingredient_count: (extraction as any).queued_ingredient_count || 0,
}), { headers: JSON_HEADERS });
```

### 3.3 Deployment (via Supabase MCP by planner)
```
deploy_edge_function {
  name: "process-document",
  entrypoint_path: "index.ts",
  verify_jwt: false,
  files: [ { name: "process-document/index.ts", content: "<v62 full file>" } ]
}
```

### 3.4 Regression test matrix (MANDATORY before commit)

| Tenant | industry_profile | Document type | Expected behaviour |
|---|---|---|---|
| Pure Premium THC Vapes | cannabis_retail | Supplier invoice (terpenes) | create_purchase_order + create_supplier_product (NO create_food_ingredient) |
| MediCare Dispensary | cannabis_dispensary | Supplier invoice | create_purchase_order (NO create_food_ingredient) |
| Medi Recreational | cannabis_retail | Sasol petrol slip | classify as petrol_slip, create_expense (NO create_food_ingredient) |
| The Garden Bistro | food_beverage | Premier Foods invoice with 3 ingredients | 3x create_food_ingredient, each written to ingredient_ingest_queue |
| Nourish Kitchen & Deli | food_beverage | Label photo of a product bag | 1x create_food_ingredient with nutrition panel populated if visible |

### 3.5 Gate conditions for 2B.2
- [ ] EF deploys successfully, version 62 active
- [ ] 2B.1 migration applied (ingredient_ingest_queue exists)
- [ ] All 5 regression test rows behave as specified in 3.4
- [ ] `ingredient_ingest_queue` has 4+ pending rows after the F&B regression tests
- [ ] No new Anthropic API errors in logs
- [ ] Duplicate check still works (upload same Sasol petrol slip twice -> second flagged)
- [ ] EF response time p50 still < 10s on a 500kb PDF
- [ ] LL-084 duplicate invoice guard still fires correctly

### 3.6 Claude Code instruction block notes for 2B.2
- This is the highest-risk PR. Owner should have a rollback path ready.
- Commit the updated EF source file to git ONLY after deploy succeeds and
  regression is clean.

---

## SECTION 4 — PR 2B.3: HQ ADD-FROM-DOCUMENT MODAL

### 4.1 Scope
Add "+ Add from Document" button to `HQFoodIngredients.js` header (F&B
tenants only). Opens a modal with 2 active tabs and 1 "coming soon" tab.

### 4.2 New component: `src/components/hq/food/FoodIngestModal.js`
- Modal overlay + centered card (width 640px)
- Tab bar: "Upload file" (active) | "Paste text" | "Import from URL (Coming soon)"
- Upload: drop zone + file picker (PDF/JPG/PNG) + Extract button
- Paste: textarea + Extract button
- URL: grey placeholder "Coming in Phase 2F"
- Extract calls process-document EF with F&B context
- On success: toast + tab switch to ingest-queue
- On error: inline red banner with retry

### 4.3 Mobile placemarker (required per owner instruction)
Info banner inside modal referencing Phase 2F mobile Smart Capture.

### 4.4 `HQFoodIngredients.js` changes
- New state: `showIngestModal`
- Header button: "+ Add from Document" (visible when isTenantHq && F&B)
- Mount FoodIngestModal at end of render

### 4.5 Audit placemarker per ingestion

### 4.6 Gate conditions for 2B.3
- [ ] npm run build passes, zero new warnings
- [ ] Button visible on Garden Bistro + Nourish, invisible on cannabis/retail
- [ ] Button invisible to non-HQ users
- [ ] Upload tab accepts PDF, JPG, PNG
- [ ] Paste tab accepts text, minimum 50 chars before Extract enables
- [ ] URL tab shows "Coming soon"
- [ ] Mobile placemarker banner visible
- [ ] Successful extraction produces toast + tab switch
- [ ] Error state renders inline red banner with retry
- [ ] Console shows [AUDIT-PLACEMARKER] on every extract call

---

## SECTION 5 — PR 2B.4: REVIEW-AND-APPROVE UI

### 5.1 Scope
Add "Ingest Queue" tab to HQFoodIngredients. Shows pending/approved/rejected
rows from ingredient_ingest_queue. Reviewer can edit, approve, or reject.

### 5.2 New component: `src/components/hq/food/FoodIngestQueuePanel.js`
- Sub-header with pending count + status filter
- DS6 Part 16 Tier 1 table
- Click row opens review drawer
- Per-field confidence badges (green >= 0.70, amber 0.50-0.69, red < 0.50)
- Approve: inserts to food_ingredients + updates queue row
- Reject: prompts for reason, no food_ingredients insert

### 5.3 Confidence rendering
```js
function confidenceBadge(value) {
  if (value >= 0.70) return { color: T.successText, bg: T.successLight, icon: 'check', label: '' };
  if (value >= 0.50) return { color: T.warningText, bg: T.warningLight, icon: 'warning', label: 'Review' };
  return { color: T.dangerText, bg: T.dangerLight, icon: 'error', label: 'Verify' };
}
```

### 5.4 Approve flow
Insert to food_ingredients -> update queue row -> audit -> toast -> refresh

### 5.5 Reject flow
Update queue status to rejected with reason -> audit -> refresh

### 5.6 Gate conditions for 2B.4
- [ ] npm run build passes, zero new warnings
- [ ] "Ingest Queue" tab visible in F&B tenants only
- [ ] Pending count badge on tab label
- [ ] Queue list renders test rows from 2B.2 regression
- [ ] Confidence badges render at field level
- [ ] Approve flow inserts into food_ingredients + updates queue
- [ ] New ingredient appears in Library tab immediately (realtime)
- [ ] Reject flow prompts for reason
- [ ] LL-285 grep: every queue query is tenant-scoped
- [ ] Audit placemarker fires on approve and reject
- [ ] Table follows DS6 Part 16 Tier 1 spec

---

## SECTION 6 — PR 2B.5: GATE PR

### 6.1 Scope
Zero code changes. End-to-end walkthrough + doc updates.

### 6.2 End-to-end walkthrough
- Happy path: Garden Bistro -> upload invoice -> extract -> review -> approve
- Rejection path: upload irrelevant document -> low confidence -> reject
- Regression paths: Pure PTV, Medi Recreational, MediCare unchanged

### 6.3 Gate conditions for 2B.5
- [ ] Happy path completes end-to-end in under 60 seconds
- [ ] Rejection path works cleanly
- [ ] All 3 regression paths pass
- [ ] Nourish Kitchen tested for parity
- [ ] DECISION-JOURNAL updated with Phase 2B closure
- [ ] PENDING-ACTIONS updated

---

## SECTION 7 — CARRIED DEBT AND FUTURE WORK-PACKAGES

| WP | Status | Opened by | Scope |
|---|---|---|---|
| WP-AUDIT-UNIFY | Still open (from 2A.5) | 2A.5 | Schema + RLS + viewer for audit_log |
| WP-ROLE-TAXONOMY | Still open (from 2A.5) | 2A.5 | F&B-specific roles |
| WP-REALTIME-PUB | Still open (from 2A.3) | 2A.3 | HQOverview silent no-ops |
| WP-TABLE-UNIFY Phase 2F | NEW | 2B.5 | Mobile Smart Capture for F&B |
| WP-TABLE-UNIFY Phase 2C | NEW — next | 2B.5 | Recipe linkage surface |
| WP-TABLE-UNIFY Phase 2D | NEW — after 2C | 2B.5 | Compliance view mode |
| WP-EF-MODULES | NEW | 2B.2 | Refactor process-document |
| WP-EF-LL120-RECONCILE | NEW | 2B.2 | Route Anthropic calls through ai-copilot |
| WP-IMAGE-HASH-REAL | NEW | 2B.2 | Real SHA-256 image hash |

---

## SECTION 8 — PROVENANCE

- Authored: Session post-2A.6, 18 April 2026, Claude.ai (Claude Opus 4.7)
- Based on: live reads of process-document v61, ai-copilot v75, document_log
  (40 cols), capture_queue (52 cols), food_recipes (23 rows), and the parent
  WP-TABLE-UNIFY Phase 2 doc including S320 amendments
- Architectural pivot: Option A (new EF) -> Option 1 (extend existing EF)
- Owner-confirmed decisions: Option 1, mobile deferred to 2F, scope now with caveats
- Approved by: Owner, Session post-2A.6
- Intended executor: Claude Code, starting with 2B.1 migration

---

---

## PHASE 2B CLOSURE NOTE (S-2B.5, 19 April 2026)

Phase 2B delivered the commercial thesis of Phase 2: AI invoice ingest for SA
F&B. Live tested end-to-end on Garden Bistro with a 10-line Premier Foods
invoice — 10 ingredients extracted in ~30 seconds with correct allergen
flags (gluten on flour + pasta, milk on butter + cheese, fish on kingklip),
HACCP risk levels, and SA R638 compliance context. One approve + one reject
exercised both paths against real tenant data.

Next Phase 2 sub-phases: 2C (recipe linkage), 2D (compliance view mode),
2F (mobile Smart Capture for ingredients). 2E remains deferred per parent
doc §0.1.

No carried debt from Phase 2B. All post-demo polish items are captured in
PENDING-ACTIONS.md under WP-FOOD-INGEST-POLISH and WP-EF-ERROR-PASSTHROUGH.

---

*WP-TABLE-UNIFY PHASE 2B SPLIT · NuAi · 18 April 2026 · v1*
*Execution doc. 5 PRs, ~14h. Phase 2B = 1 of 4 remaining sub-phases (2B, 2C, 2D, 2F).*
*2E still deferred per parent doc §0.1.*
