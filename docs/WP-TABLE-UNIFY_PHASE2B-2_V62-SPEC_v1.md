# process-document EF v62 — Full Specification
## Source of truth for PR 2B.2 reconstruction
## Produced: Session post-2B.1-incident · 18 April 2026

---

## Purpose

This doc is the specification the next planner uses to reconstruct the
process-document EF v62 source file from v61 on disk. The v62 source was
produced during the session of 18 April 2026 but lived only in planner
scratch (not committed, per LL-303 Layer 1 — planner does not commit EF
source). This spec captures every delta from v61 so v62 can be rebuilt
deterministically from: v61 on-disk source + this spec.

---

## Baseline

v61 source: live on Supabase at version 64, SHA
`e55629de00e8ab3aaf307c1bd8d95632dbcf686a8031c57e3d4d9890f85f4773`.
v61 source also on disk at `supabase/functions/process-document/index.ts`
(43,946 bytes, header starts `// v2.2 — P3-C`). v61 and on-disk are
bit-identical — confirmed during rollback verification.

v62 target size: approximately 56,790 bytes, 1,310 lines (~+200 lines
over v61, all additive).

---

## Delta 1 — Version header bump

Replace the top 2 lines of v61 with 8 new lines:

```
// supabase/functions/process-document/index.ts
// v2.3 — WTU 2B: food_beverage ingredient extraction + ingredient_ingest_queue write
//   NEW: industry_profile === 'food_beverage' adds F&B ingredient extraction to prompt
//   NEW: proposed_updates action 'create_food_ingredient' writes to ingredient_ingest_queue
//   NEW: classifyIngredientSourceType() maps capture_type -> queue source_type
//   NEW: response includes queued_ingredient_ids[] + queued_ingredient_count
//   PRESERVED: all v61 behavior for cannabis_retail, cannabis_dispensary, general_retail
//   PRESERVED: 7-point SA bank fingerprint, SARS compliance, dedup, lump-sum, expense classifier
// v2.2 — P3-C: VAT auto-fill — vat_amount/amount_excl_vat extraction + supplier VAT override
[v2.1 header and below: preserved verbatim from v61]
```

---

## Delta 2 — New helper function `classifyIngredientSourceType`

Insert immediately after the existing `classifyCaptureType` function
(around line 475 of v61). Full function body:

```typescript
// -- WTU 2B v2.3: F&B ingredient source type classifier ---------------
// Maps the capture_type (from classifyCaptureType) + document_type hint to the
// ingredient_ingest_queue.source_type enum values.
function classifyIngredientSourceType(
  ext: Record<string, unknown>,
  captureType: string,
): string {
  if (captureType === "lab_report") return "coa";
  if (captureType === "delivery_note") return "invoice";
  const docType = String(ext.document_type || "").toLowerCase();
  if (docType === "invoice") return "invoice";
  if (docType === "spec_sheet") return "spec_sheet";
  if (docType === "label_photo") return "label_photo";
  if (docType === "recipe_pdf" || docType === "recipe") return "recipe_pdf";
  const fileName = String(ext.file_name || "").toLowerCase();
  if (fileName.startsWith("manual_paste:")) return "manual_paste";
  if (fileName.startsWith("url:")) return "url";
  return "invoice"; // conservative default
}
```

This function is the marker that planner verifies after deploy per
LL-303 Layer 2. If `get_edge_function` response does not contain
`classifyIngredientSourceType`, the deploy did not apply correctly.

---

## Delta 3 — Extend `buildSystemPrompt` with conditional F&B branch

Inside `buildSystemPrompt()`, before the final `return` statement, add
a new const `foodIngredientContext` that is either "" for non-F&B
industry profiles OR the full F&B context string for food_beverage.
At the end of the returned template string (after the existing
`supplier_products.category must be...` line), append `${foodIngredientContext}`.

The F&B context string contains 8 sections:

1. Header: "FOOD & BEVERAGE INGREDIENT EXTRACTION (industry_profile=food_beverage)"
2. Intro explaining create_food_ingredient actions are ADDITIVE to
   create_purchase_order, not replacements. A 12-item invoice produces
   12 create_food_ingredient actions PLUS a single create_purchase_order.
3. SA regulatory context — Regulation R638 of 2018 Foodstuffs Act.
   14 mandatory allergen keys: gluten, crustaceans, eggs, fish,
   peanuts, soybeans, milk, nuts, celery, mustard, sesame, sulphites,
   lupin, molluscs. Allergen_flags[key]=true when either declared on
   document OR category intrinsically contains it (wheat flour -> gluten,
   cheese -> milk, etc.).
4. Typical SA F&B suppliers — Premier Foods, Pioneer Foods, Tiger Brands,
   RCL Foods, Clover, Parmalat, Spekko, Tastic, I&J, Sea Harvest,
   Rainbow Chickens, Woolworths Wholesale, Makro Commercial, Bidvest,
   Vector Logistics.
5. **REQUIRED sub_category values** — 28 enum values matching
   FNB_SUBCATEGORIES keys from FoodWorlds.js:
     protein_red_meat, protein_poultry, protein_fish, protein_seafood,
     protein_charcuterie, dairy_butter, dairy_cream, dairy_cheese,
     dairy_eggs, dairy_milk, dairy_yoghurt, produce_vegetables,
     produce_leaves, produce_aromatics, produce_fruit, dry_goods_grains,
     dry_goods_flour, dry_goods_sugar, dry_goods_spices, dry_goods_canned,
     oils_condiments, stocks_bases, flavourings_aromatics, bakery_bread,
     beverages_hot, beverages_cold, packaging_disposables, cleaning_chemicals
   Each with brief examples gloss.
6. Enum constraints: temperature_zone (ambient/refrigerated/frozen/hot),
   shelf_life_days (int or null) with defaults table, haccp_risk_level
   (low/medium/high/critical) with heuristic guidance, default_unit
   (kg/g/L/ml/each), country_of_origin (default "ZA").
7. Full create_food_ingredient action example — Sasko cake flour with
   name, brand, sub_category, pack_size, supplier_name, cost, allergen_flags,
   haccp, temperature_zone, shelf_life_days, nutrition_per_100g (9 fields),
   country_of_origin, coa_reference_number, field_confidence (8 values),
   and overall confidence.
8. 8 extraction rules:
   1. ONE create_food_ingredient per distinct ingredient
   2. Same invoice can produce BOTH ingredient AND PO actions (additive)
   3. Omit nutrition_per_100g if panel not visible (no guessing)
   4. Emit allergen_flags for intrinsic-containment even without panel
   5. Per-field confidence 0.0-1.0; be honest about uncertainty
   6. sub_category MUST match one of the 28 values exactly
   7. If sub_category unclear, emit null + field_confidence.sub_category=0.3
   8. Never set is_seeded, is_active, or tenant_id in data (backend sets)

---

## Delta 4 — DOCUMENT_TYPES enum extension

In the `DOCUMENT TYPES (detect from content):` line of the system prompt,
extend from:
```
invoice | quote | proof_of_payment | delivery_note | coa | price_list | stock_sheet | contract | unknown
```
To:
```
invoice | quote | proof_of_payment | delivery_note | coa | price_list | stock_sheet | contract | spec_sheet | label_photo | recipe_pdf | unknown
```

---

## Delta 5 — CRITICAL REMINDERS extension (item 12)

In the userContent text block (inside the main handler serve function),
add a 12th item to CRITICAL REMINDERS:

```
12. FOR FOOD & BEVERAGE TENANTS: if the document contains food ingredient
    spec data, emit create_food_ingredient actions (see system prompt for
    sub_category enum and allergen rules). One action per distinct
    ingredient. These are ADDITIVE to create_purchase_order, not replacements.
```

---

## Delta 6 — Main handler queue write block

Insert after the existing duplicate-check block (after the
`if (dupResult.isDuplicate) { ... }` block, before the final
`return new Response(JSON.stringify({ ... }))`).

Full block:

```typescript
// WTU 2B v2.3: F&B ingredient queue write
let queuedIngredientIds: string[] = [];
if (industryProfile === "food_beverage" && tenant_id) {
  const updates = (extraction.proposed_updates as Array<Record<string, unknown>>) || [];
  const ingredientActions = updates.filter(
    (u) => u.action === "create_food_ingredient",
  );
  if (ingredientActions.length > 0) {
    const sourceType = classifyIngredientSourceType(
      { ...extraction, file_name },
      captureType,
    );
    const queueInserts = ingredientActions.map((action) => {
      const data = (action.data as Record<string, unknown>) || {};
      return {
        tenant_id,
        source_document_id: logEntry.id,
        source_type: sourceType,
        ai_extracted_data: data,
        suggested_sub_category: (data.sub_category as string) || null,
        suggested_allergens: data.allergen_flags || null,
        suggested_haccp_level: (data.haccp_risk_level as string) || null,
        confidence_score: Number(action.confidence ?? 0.8),
        status: "pending" as const,
      };
    });
    const { data: queueRows, error: queueErr } = await db
      .from("ingredient_ingest_queue")
      .insert(queueInserts)
      .select("id");
    if (queueErr) {
      console.error("[process-document v62] queue insert failed:", queueErr);
      if (!extraction.warnings) extraction.warnings = [];
      (extraction.warnings as string[]).push(
        `Failed to stage ${ingredientActions.length} ingredient(s) for review: ${queueErr.message}. Document logged but ingredients not queued.`
      );
    } else {
      queuedIngredientIds = (queueRows || []).map((r) => r.id as string);
    }
  }
}
```

---

## Delta 7 — Response payload additions

Inside the final `return new Response(JSON.stringify({ ... }))`, append
two fields after `duplicate_details`:

```typescript
queued_ingredient_ids:   queuedIngredientIds,
queued_ingredient_count: queuedIngredientIds.length,
```

For non-F&B tenants these are always `[]` and `0` — always present so
frontend code doesn't need defensive checks.

---

## Verification markers (for LL-303 Layer 2)

After deploy, planner calls `Supabase:get_edge_function` and verifies:
1. Version number > 64
2. Response content includes `classifyIngredientSourceType`
3. Response content includes `ingredient_ingest_queue` (2+ occurrences)
4. Response content includes `queued_ingredient_ids` (1 occurrence)

If any marker missing: rollback per Procedure 7, do NOT retry.

---

## Structural sanity (for pre-deploy validation)

v62 file should pass:
- Open/close braces balanced (v62 has ~218 pairs)
- Open/close parens balanced (v62 has ~570 pairs)
- Total bytes ~56,790 +/- 500
- Total lines ~1,310 +/- 10

If meaningfully off, the regeneration is incorrect — do NOT deploy.

---

## Regression test matrix (mandatory per Procedure 7 step 7)

| Tenant | industry_profile | Document | Expected behaviour |
|---|---|---|---|
| Pure Premium THC Vapes | cannabis_retail | Terpene invoice | create_purchase_order + create_supplier_product, NO queue row |
| MediCare Dispensary | cannabis_dispensary | Supplier invoice | create_purchase_order, NO queue row |
| Medi Recreational | cannabis_retail | Sasol petrol slip | capture_type=petrol_slip, create_expense, NO queue row |
| The Garden Bistro | food_beverage | Premier Foods invoice | 3x create_food_ingredient queued, plus create_purchase_order |
| Nourish Kitchen & Deli | food_beverage | Label photo | 1x create_food_ingredient queued with nutrition if visible |

All 5 must behave as specified. If ANY row fails, rollback to v61.

---

*v62-SPEC · NuAi · 18 April 2026 · v1*
*Authoritative until PR 2B.2 ships and the EF source file in repo*
*becomes the new source of truth.*
