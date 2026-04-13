# NuAi Demo Pre-flight SQL
## Paste entire block into Supabase Studio before EVERY visual verify session
## Every row marked MUST_BE_0 must return 0 before opening the browser

```sql
-- MediCare Dispensary (cannabis_dispensary)
SELECT 'MC avco_zero_MUST_BE_0'         , COUNT(*) FROM inventory_items WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_active=true AND weighted_avg_cost=0
UNION ALL SELECT 'MC sell_zero_MUST_BE_0', COUNT(*) FROM inventory_items WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_active=true AND sell_price=0
UNION ALL SELECT 'MC oos_MUST_BE_0'      , COUNT(*) FROM inventory_items WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_active=true AND quantity_on_hand<=0
UNION ALL SELECT 'MC product_cogs_MUST_BE_0', COUNT(*) FROM product_cogs WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b'
UNION ALL SELECT 'MC expenses_count'     , COUNT(*) FROM expenses       WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b'
UNION ALL SELECT 'MC stock_mv_with_cost' , COUNT(*) FROM stock_movements WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND unit_cost>0
UNION ALL SELECT 'MC items_total'        , COUNT(*) FROM inventory_items WHERE tenant_id='8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b' AND is_active=true
-- Metro Hardware (general_retail)
UNION ALL SELECT 'MTR avco_zero_MUST_BE_0', COUNT(*) FROM inventory_items WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8' AND is_active=true AND weighted_avg_cost=0
UNION ALL SELECT 'MTR sell_zero_MUST_BE_0', COUNT(*) FROM inventory_items WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8' AND is_active=true AND sell_price=0
UNION ALL SELECT 'MTR oos_count'          , COUNT(*) FROM inventory_items WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8' AND is_active=true AND quantity_on_hand<=0
UNION ALL SELECT 'MTR expenses_count'     , COUNT(*) FROM expenses       WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8'
UNION ALL SELECT 'MTR items_total'        , COUNT(*) FROM inventory_items WHERE tenant_id='57156762-deb8-4721-a1f3-0c6d7c2a67d8' AND is_active=true
-- Medi Recreational (cannabis_retail)
UNION ALL SELECT 'MR avco_zero_MUST_BE_0' , COUNT(*) FROM inventory_items WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74' AND is_active=true AND weighted_avg_cost=0
UNION ALL SELECT 'MR sell_zero_MUST_BE_0' , COUNT(*) FROM inventory_items WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74' AND is_active=true AND sell_price=0
UNION ALL SELECT 'MR oos_count'           , COUNT(*) FROM inventory_items WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74' AND is_active=true AND quantity_on_hand<=0
UNION ALL SELECT 'MR expenses_count'      , COUNT(*) FROM expenses       WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74'
UNION ALL SELECT 'MR items_total'         , COUNT(*) FROM inventory_items WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74' AND is_active=true
-- Garden Bistro (food_beverage) — UUID suffix 9bb2 NOT ce9f
UNION ALL SELECT 'GB avco_zero_MUST_BE_0' , COUNT(*) FROM inventory_items WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1' AND is_active=true AND weighted_avg_cost=0
UNION ALL SELECT 'GB sell_zero_MUST_BE_0' , COUNT(*) FROM inventory_items WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1' AND is_active=true AND sell_price=0
UNION ALL SELECT 'GB oos_count'           , COUNT(*) FROM inventory_items WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1' AND is_active=true AND quantity_on_hand<=0
UNION ALL SELECT 'GB expenses_count'      , COUNT(*) FROM expenses       WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1'
UNION ALL SELECT 'GB items_total'         , COUNT(*) FROM inventory_items WHERE tenant_id='7d50ea34-9bb2-46da-825a-956d0e4023e1' AND is_active=true
ORDER BY 1;
```

## How to read results
- Any row ending `_MUST_BE_0` that returns > 0 is a **blocking issue**
- `expenses_count` should be > 20 for each tenant (indicates OPEX spine exists)
- `items_total` should match expected: MC=20, MTR=847, MR=186, GB=12
- `stock_mv_with_cost` (MC only) should be 20 (all items have opening stock)
