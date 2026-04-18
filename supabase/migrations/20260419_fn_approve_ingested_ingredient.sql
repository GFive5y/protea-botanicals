-- PR 2B.4 — approve RPC: single transaction for
-- (1) insert into food_ingredients, (2) update queue row with linkage + user_edits diff.
-- SECURITY INVOKER (default) — RLS on both tables enforces tenant isolation.

CREATE OR REPLACE FUNCTION public.fn_approve_ingested_ingredient(
  p_queue_id UUID,
  p_user_edits JSONB,
  p_final_payload JSONB
)
RETURNS TABLE (created_food_ingredient_id UUID, queue_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tenant_id UUID;
  v_existing_status TEXT;
  v_sub_category TEXT;
  v_category TEXT;
  v_new_id UUID;
BEGIN
  -- 1. Load queue row + status guard (must be pending)
  SELECT tenant_id, status, suggested_sub_category
    INTO v_tenant_id, v_existing_status, v_sub_category
    FROM ingredient_ingest_queue
   WHERE id = p_queue_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Queue row % not found or RLS-blocked', p_queue_id;
  END IF;

  IF v_existing_status <> 'pending' THEN
    RAISE EXCEPTION 'Queue row % is % — only pending rows can be approved', p_queue_id, v_existing_status;
  END IF;

  -- 2. Derive NOT-NULL category from sub_category (mirrors FoodWorlds.FNB_SUBCATEGORY_TO_CATEGORY)
  v_category := CASE COALESCE(p_final_payload->>'sub_category', v_sub_category)
    WHEN 'protein_red_meat'      THEN 'meat_fish'
    WHEN 'protein_poultry'       THEN 'meat_fish'
    WHEN 'protein_fish'          THEN 'meat_fish'
    WHEN 'protein_seafood'       THEN 'meat_fish'
    WHEN 'protein_charcuterie'   THEN 'meat_fish'
    WHEN 'dairy_butter'          THEN 'dairy'
    WHEN 'dairy_cream'           THEN 'dairy'
    WHEN 'dairy_cheese'          THEN 'dairy'
    WHEN 'dairy_eggs'            THEN 'dairy'
    WHEN 'dairy_milk'            THEN 'dairy'
    WHEN 'dairy_yoghurt'         THEN 'dairy'
    WHEN 'produce_vegetables'    THEN 'fruit_vegetable'
    WHEN 'produce_leaves'        THEN 'fruit_vegetable'
    WHEN 'produce_aromatics'     THEN 'fruit_vegetable'
    WHEN 'produce_fruit'         THEN 'fruit_vegetable'
    WHEN 'dry_goods_grains'      THEN 'grain_cereal'
    WHEN 'dry_goods_flour'       THEN 'grain_cereal'
    WHEN 'dry_goods_sugar'       THEN 'sweetener'
    WHEN 'dry_goods_spices'      THEN 'spice_herb'
    WHEN 'dry_goods_canned'      THEN 'other'
    WHEN 'oils_condiments'       THEN 'fat_oil'
    WHEN 'stocks_bases'          THEN 'flavouring'
    WHEN 'flavourings_aromatics' THEN 'flavouring'
    WHEN 'bakery_bread'          THEN 'grain_cereal'
    WHEN 'beverages_hot'         THEN 'flavouring'
    WHEN 'beverages_cold'        THEN 'water'
    WHEN 'packaging_disposables' THEN 'packaging_contact'
    WHEN 'cleaning_chemicals'    THEN 'other'
    ELSE 'other'
  END;

  -- 3. Insert into food_ingredients (tenant_id enforced via payload — RLS backstop)
  INSERT INTO food_ingredients (
    tenant_id, name, common_name, category, sub_category, default_unit,
    pack_sizes, allergen_flags, nutrition_per_100g, temperature_zone,
    shelf_life_days, haccp_risk_level, is_seeded, is_active
  )
  VALUES (
    v_tenant_id,
    p_final_payload->>'name',
    p_final_payload->>'common_name',
    v_category,
    COALESCE(p_final_payload->>'sub_category', v_sub_category),
    COALESCE(p_final_payload->>'default_unit', 'kg'),
    COALESCE(p_final_payload->'pack_sizes', '[]'::jsonb),
    COALESCE(p_final_payload->'allergen_flags', '{}'::jsonb),
    COALESCE(p_final_payload->'nutrition_per_100g', '{}'::jsonb),
    COALESCE(p_final_payload->>'temperature_zone', 'ambient'),
    NULLIF(p_final_payload->>'shelf_life_days','')::int,
    COALESCE(p_final_payload->>'haccp_risk_level', 'low'),
    false,
    true
  )
  RETURNING id INTO v_new_id;

  -- 4. Update queue row with linkage + diff
  UPDATE ingredient_ingest_queue
     SET status = 'approved',
         user_edits = p_user_edits,
         approved_by = auth.uid(),
         approved_at = now(),
         created_food_ingredient_id = v_new_id
   WHERE id = p_queue_id;

  RETURN QUERY SELECT v_new_id, p_queue_id;
END;
$$;

COMMENT ON FUNCTION public.fn_approve_ingested_ingredient IS
'WTU 2B.4 — Single-transaction approve path for ingredient_ingest_queue rows. Inserts into food_ingredients, captures user edit diff, links queue → ingredient. SECURITY INVOKER so RLS on both tables enforces tenant isolation.';

GRANT EXECUTE ON FUNCTION public.fn_approve_ingested_ingredient TO authenticated;
