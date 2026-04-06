# WP-INTELLIGENCE-AUDIT v1.0
## Full Data Intelligence Audit — Medi Recreational
### Date: 07 Apr 2026 · Supabase: uvicrqapgzcdvozxrreo · Tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74

---

## EXECUTIVE SUMMARY

The intelligence infrastructure is more built than SESSION-STATE claimed,
but less real than the dashboards suggest. The key finding:

> **order_items EXISTS and has 1,013 rows — but every single one is seed data.
> Real live POS orders do NOT write order_items. The POS flow is incomplete.**

The Stock screen's Best Sellers, Making You Money, Fast Movers, and Dead Stock
panels all work and look correct — but they are running on demo data, not live
sales intelligence. The moment seed data is cleaned, these panels go blank.

This audit defines exactly what is real, what is seeded, what is broken,
and what needs to be built to make the intelligence live.

---

## 1. TABLE INVENTORY — CONFIRMED STATE

### orders
```
Columns: id, user_id, tenant_id, order_ref, status, total, currency,
         payfast_payment_id, payment_method, items_count, notes,
         created_at, updated_at
Missing: channel (POS vs Online vs Wholesale)
```
- 426 paid orders · R6,558,115 total revenue on record
- 404 tagged "POS sale [demo_seed_v1]" — seed data
- 10 tagged "POS sale [demo_seed_v2]" — seeded this session (Apr 7)
- 12 with notes = NULL — REAL LIVE orders (MR-2026-0551 to MR-2026-0607, Apr 5–6)

### order_items
```
Columns: id, order_id, product_name, quantity, unit_price, line_total,
         product_metadata (JSONB: {item_id, category}), created_at
Missing: tenant_id (inferred via orders join), inventory_item_id FK
RLS:     hq_select_all_order_items (is_hq_user())
         users_select_own_order_items (via order.user_id = auth.uid())
         users_insert_own_order_items (open insert)
```
- 1,013 rows · 415 linked orders · R2,322,700 tracked revenue
- 1,002/1,013 rows have item_id + category in product_metadata
- 1,002/1,002 item_id values resolve to real inventory_items (100% integrity)
- 11 rows have empty product_metadata (minor — old seed entries)
- **CRITICAL: ALL 1,013 rows are seed data. Zero real POS order_items.**

### stock_movements
```
Columns: id, item_id, quantity, movement_type, reference, notes,
         performed_by, created_at, tenant_id, unit_cost, batch_id
Types: sale_out · purchase_in
```
- 1,002 sale_out · 1,997 units · ALL seed data
- 8 purchase_in · 202 units · REAL (stock receive flow, Mar 30)
- **CRITICAL: All sale_out movements are seed data. Real POS sales don't write movements.**

---

## 2. REAL vs SEED BREAKDOWN

| Source | Orders | order_items | stock_movements |
|---|---|---|---|
| demo_seed_v1 (bulk seed) | 404 | ✅ 1,003 rows | ✅ 1,002 sale_out |
| demo_seed_v2 (Apr 7 session) | 10 | ❌ 0 rows | ❌ 0 rows |
| Real live POS (MR-2026-0551+) | 12 | ❌ 0 rows | ❌ 0 rows |

### The 12 real live orders (all missing line items):
MR-2026-0551 through MR-2026-0607 · Apr 5–6 2026
Payment methods: cash, card, yoco · Totals: R285–R1,250
items_count: 1–4 per order · order_items rows: ZERO

**Conclusion: POS flow writes `orders` but NOT `order_items` or `stock_movements`.**

---

## 3. INTELLIGENCE COMPUTABLE TODAY (SEEDED)

All queries below work and return accurate results against seed data.
Infrastructure is proven. Data is not yet real.

### Product Revenue Intelligence
```
#1  LED Grow Light 240W    R591,800  · 269 units · 130 orders  (hardware)
#2  Grow Tent 120x120cm    R354,200  · 253 units · 134 orders  (hardware)
#3  LED Grow Light 100W    R318,000  · 265 units · 133 orders  (hardware)
#4  Grow Tent 80x80cm      R138,700  · 146 units ·  71 orders  (hardware)
#5  Canna PK 13/14 1L      R121,550  · 143 units ·  63 orders  (raw_material)
#6  Hybrid Flower 7g       R118,800  · 132 units ·  69 orders  (flower)
#7  Bubble Hash 3g         R107,350  · 113 units ·  53 orders  (concentrate)
#8  Indica Flower 7g       R102,600  · 114 units ·  59 orders  (flower)
#9  Terp Sauce 1g          R101,700  · 113 units ·  59 orders  (concentrate)
#10 Fullmelt Filtration Bag R99,450  · 117 units ·  59 orders  (accessory)
```

### Revenue by Category
```
Hardware      R1,402,700   60.5%  (333 distinct orders)
Concentrate     R383,950   16.6%
Flower          R221,400    9.6%
Accessory       R188,700    8.1%
Raw Material    R121,550    5.2%
```

### Basket Co-purchase Pairs (top 10)
```
Grow Tent 120x120  +  LED 240W           36 orders
Grow Tent 80x80    +  LED 100W           26 orders
Fullmelt Bag       +  LED 100W           25 orders
Grow Tent 120x120  +  Large Bong 45cm    24 orders
LED 100W           +  Terp Sauce 1g      24 orders
Bubble Hash 3g     +  Grow Tent 120x120  24 orders
Grow Tent 80x80    +  Grow Tent 120x120  23 orders
Grow Tent 120x120  +  LED 100W           22 orders
Canna PK 13/14     +  Grow Tent 120x120  22 orders
Grow Tent 120x120  +  THC Distillate 1g  22 orders
```

### Revenue Trend (from order_items)
```
Jan 2026:  98 orders · 475 units · R541,450
Feb 2026: 123 orders · 602 units · R694,400
Mar 2026: 160 orders · 821 units · R963,800  (+38.7% MoM)
Apr 2026:  23 orders · 101 units · R118,650  (7 days only)
```

### Customer Intelligence
```
All 404 seeded orders belong to ONE user: Medi Admin (283c7fe6)
Real customer purchase diversity: ZERO (all seed data one user)
Customer-level AI intelligence: blocked until real multi-customer orders exist
```

---

## 4. WHAT POWERS EACH STOCK SCREEN PANEL

| Panel | Data Source | Real or Seeded? |
|---|---|---|
| Best Sellers (units) | stock_movements · sale_out | ⚠️ SEEDED |
| Making You Money (revenue) | order_items · line_total | ⚠️ SEEDED |
| Fast Movers (days remaining) | stock_movements · velocity | ⚠️ SEEDED |
| Dead Stock (idle 45+ days) | stock_movements · last movement | ⚠️ SEEDED |
| Margin Heroes | inventory_items · sell_price vs AVCO | ✅ REAL |
| Stock Value | inventory_items · qty × AVCO | ✅ REAL |
| Reorder Alerts | inventory_items · qty vs reorder_level | ✅ REAL |

---

## 5. GAPS — PRIORITISED

### GAP-1 — POS flow: order_items write MISSING (CRITICAL)
Every real POS sale writes to `orders` but not `order_items` or `stock_movements`.
Fix: Add INSERT to order_items in POS checkout flow (wherever orders are created).
Find: grep -rn "from('orders').insert\|from(\"orders\").insert" src/
Effort: Medium. This is the single most important fix in the platform.

### GAP-2 — POS flow: stock_movements write MISSING (CRITICAL)
Real sales don't decrement quantity_on_hand via stock_movements.
Fix: Either app-level write alongside order_items, or DB trigger on order_items insert.
Check first: SELECT * FROM information_schema.triggers WHERE event_object_table = 'order_items';
If no trigger exists, add app-level write.

### GAP-3 — orders.channel MISSING (HIGH)
Column does not exist. Cannot distinguish POS / Online / Wholesale.
Fix:
  ALTER TABLE orders
    ADD COLUMN channel TEXT CHECK (channel IN ('pos','online','wholesale')) DEFAULT 'pos';
  UPDATE orders SET channel = 'online' WHERE payfast_payment_id IS NOT NULL;
Then pass channel from POS/checkout on every order create.

### GAP-4 — order_items missing tenant_id + inventory_item_id FK (MEDIUM)
No tenant_id means RLS relies entirely on orders join.
No FK means product link is soft (JSONB) not enforced.
Fix:
  ALTER TABLE order_items
    ADD COLUMN tenant_id UUID,
    ADD COLUMN inventory_item_id UUID REFERENCES inventory_items(id);
  UPDATE order_items oi
    SET tenant_id = o.tenant_id,
        inventory_item_id = (oi.product_metadata->>'item_id')::uuid
    FROM orders o WHERE o.id = oi.order_id;
  ALTER TABLE order_items ALTER COLUMN tenant_id SET NOT NULL;

### GAP-5 — 11 order_items with empty product_metadata (LOW)
Minor. Either backfill or delete these 11 rows.

### GAP-6 — inventory_items.expiry_date unpopulated (LOW)
0 of 186 SKUs have expiry dates. Add to Smart Catalog form.

---

## 6. IMPACT WHEN SEED DATA IS REMOVED

If demo_seed_v1 is cleaned:
- Stock screen Best Sellers, Making You Money, Fast Movers: BLANK
- Revenue trend: shows only ~22 real orders
- Category intelligence: BLANK
- Basket pairs: BLANK
- Margin Heroes, Stock Value, Reorder: UNAFFECTED (real data)

DO NOT clean seed data until GAP-1 + GAP-2 are fixed and real order volume
has accumulated to replace the intelligence baseline.

---

## 7. SESSION-STATE CORRECTIONS

```
WRONG (v193): "NO order_items table — biggest intelligence gap"
CORRECT:      order_items EXISTS · 1,013 rows · all seed data
              Real gap: POS flow doesn't write to it

WRONG (v193): "P4 — Add order_items table"
CORRECT:      Table exists. P4 = Fix POS flow to write order_items on every sale

WRONG (v193): "NO channel field"
CORRECT:      Confirmed missing. GAP-3 migration is ready to run.
```

---

## 8. RECOMMENDED BUILD ORDER

### Phase 1 — Make intelligence real (next session)
1. grep all order insert call sites across codebase
2. GAP-1: add order_items write to POS flow
3. GAP-2: add stock_movements write (or verify trigger exists)
4. GAP-3: orders.channel migration

### Phase 2 — Schema hardening (session after)
5. GAP-4: tenant_id + inventory_item_id on order_items
6. RLS policy update for order_items with direct tenant_id

### Phase 3 — Intelligence activation
7. Dashboard Avg Basket tile: wire best seller from real order_items
8. Dashboard Transactions tile: add channel split (POS vs Online)
9. AI layer: basket recommendations, reorder triggers, churn detection
10. Customer profiles: purchase history per customer (requires real multi-user orders)
