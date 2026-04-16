# ANALYSIS-FNB-STOCK_v1_0.md
## Food & Beverage Restaurant Stock Model — Deep Analysis
## Produced: Session 288 · 17 April 2026
## Status: GOSPEL — read before touching ANY F&B stock code or data
## Referenced from: NUAI-AGENT-BIBLE.md · PENDING-ACTIONS.md · DEEP-ANALYSIS-PROTOCOL

---

## THE FUNDAMENTAL TRUTH (read this first)

A restaurant does NOT warehouse finished dishes.
Nobody delivers 100 Lamb Shank Provencale from a supplier.
Dishes are made on demand from raw ingredients.

The stock system for a restaurant tracks INGREDIENTS — what arrives on a
delivery truck — not dishes. Dishes exist only as recipes in food_recipes.

**Wrong (retail thinking):**
```
inventory_items: "Lamb Shank Provencale" · qty: 100 · category: finished_product
```

**Right (restaurant reality):**
```
inventory_items: "Lamb Shank" · qty: 8.0kg · category: raw_material · unit: kg
food_recipes:   "Lamb Shank Provencale" — 600g Lamb Shank per portion
```

This is LL-275. It is gospel. It cannot be undone.

---

## 1. HOW A RESTAURANT MAKES MONEY (THE MODEL)

Revenue source: guests pay for dishes (food_recipes)
Cost source: ingredients consumed to make those dishes (inventory_items)
Profit: sell price per dish - (ingredient costs per portion at AVCO)

The food cost percentage is the single most important metric:
  food_cost_pct = total_ingredient_cost_consumed / total_dish_revenue x 100

Industry benchmark: food cost should be 28-35% of revenue.
Garden Bistro target: 35% food cost — 65% gross margin.
NuAi shows this automatically when the data model is correct.

---

## 2. THE DAILY OPERATIONAL FLOW

| Time | Who | Action | System response |
|---|---|---|---|
| 06:00 | Manager | Delivery arrives | Receive Delivery — AVCO updates per ingredient |
| 09:00 | Chef | Check what to cook | "Portions possible" widget — limiting ingredient per dish |
| 11:00 | Kitchen | Prep + label | FEFO order shown (first-expired, first-out) |
| 12:00 | Service starts | POS sale | Auto-deduct BOM ingredients — stock drops |
| 15:00 | Quiet period | Blind count | System compares vs theoretical, flags variance |
| 22:00 | Close | Waste log | Staff logs discarded items — production_out adjustment |
| 22:30 | Manager | Review | Actual vs theoretical food cost % for the day |

---

## 3. MARKET LEADERS AND KEY CAPABILITIES

| Platform | Core strength | Key feature | NuAi gap |
|---|---|---|---|
| MarketMan | Recipe costing + purchasing | Live COGS per portion, auto-PO | Portions possible widget |
| Restaurant365 | Accounting integration | Actual vs theoretical variance | AR vs theoretical report |
| WISK.ai | AI variance detection | Identifies 3-5% loss in real time | Waste log + 86 alert |
| Operandio | Floor operations | Mobile blind counts by zone | FEFO count UI |
| Rezku | Anti-theft | Stock vs POS comparison | Variance flagging |

NuAi's advantage over all of these: F&B ingredients — IFRS Income Statement
in a single system. No platform combines recipe costing with IFRS reporting,
bank reconciliation, VAT, and HR. NuAi does.

---

## 4. THE DATABASE SCHEMA (gospel — do not deviate)

### Tables and their purpose:

```
inventory_items      Physical stock — INGREDIENTS only (raw_material category)
                     Tracked in kg, L, pcs. AVCO updated per delivery.
                     NEVER put dishes here for F&B tenants.

food_recipes         Menu dishes (virtual — no physical stock)
                     Each has: name, category (starter/main/dessert), cost_per_unit
                     yield_quantity, yield_unit (always "portion")

food_recipe_lines    BOM — links recipe to ingredients
                     quantity (g or ml per portion), unit
                     ingredient_id — food_ingredients (DAFF nutritional library)
                     inventory_item_id — inventory_items (PHYSICAL STOCK — KEY COLUMN)

food_ingredients     DAFF nutritional library (allergens, nutrition, etc.)
                     NOT physical stock. Does NOT track qty_on_hand.

stock_movements      All stock changes. For F&B:
                     purchase_in = delivery received
                     production_out = ingredients consumed by dish sale or prep
                     adjustment = waste logged or count correction
```

### The BOM bridge — the most important relationship:

```
food_recipe_lines.inventory_item_id — inventory_items.id

This is the link between "recipe needs 600g Lamb Shank per portion"
and "we have 8kg Lamb Shank in physical stock."

Without this column: recipe engine is decorative, no stock deduction possible.
With this column: POS sale — lookup recipe — deduct each ingredient.

Status as of Session 288: Column added via migration, all 98 Garden Bistro
recipe lines linked. Nourish Kitchen has 0 recipe lines — LOOP-F&B-001.
```

---

## 5. GARDEN BISTRO — CURRENT DATA STATE (Session 288)

Tenant ID: 7d50ea34-9bb2-46da-825a-956d0e4023e1

### inventory_items (active):
31 raw_material ingredients (GB-R-001 through GB-R-031)
12 finished_product items ARCHIVED (is_active = false)
Stock value: R12,090 (real ingredient costs)
All items: kg/L/pcs units, AVCO set, reorder levels set

### food_recipes:
12 active recipes (starter/main/dessert categories, 98 recipe lines, all linked)
16 total recipes (some duplicates in "mains"/"desserts" categories — harmless)

### portions possible (verified via SQL):
```
Linefish: 5 portions (limiting: Cape Hake stock)
Seafood Paella: 10 portions (limiting: Tiger Prawns)
Lamb Shank: 13 portions (limiting: Lamb Shank stock)
Chicken Peri-Peri: 16 (limiting: Chicken Thigh)
Mushroom Risotto: 22 (limiting: Chicken Stock)
```

### What still needs code (Phase 1):
- Portions possible widget in FoodOverview (SQL proven, needs React component)
- Live AVCO wiring into HQRecipeEngine (ingredient_id — inventory_item_id)
- POS sale — production_out stock deduction per recipe BOM

---

## 6. NOURISH KITCHEN & DELI — CURRENT DATA STATE (Session 288)

Tenant ID: 944547e3-ce9f-44e0-a284-43ebe1ed898f

### inventory_items (active):
4 raw_material items (ingredients) — correct
6 finished_product items (dishes) — WRONG MODEL, needs fixing

### food_recipes:
3 recipes, 0 recipe_lines, 0 food_ingredients linked
This means the recipe engine is empty — Nourish has recipes but no BOM.

### Required fixes (LOOP-F&B-001 Part 4):
1. Archive the 6 finished_product items
2. Ensure existing 4 raw materials are correctly set up
3. Create recipe lines for each of the 3 recipes
4. Add missing ingredient stock items
5. Link recipe lines to inventory_items

---

## 7. THE "PORTIONS POSSIBLE" QUERY (CORE F&B SQL)

This query is the most important thing a chef wants to know.
Run this when building the portions possible widget.

```sql
WITH recipe_portions AS (
  SELECT
    fr.name AS dish,
    fr.category AS course,
    fr.cost_per_unit AS recipe_cost,
    frl.name AS ingredient,
    frl.quantity AS qty_per_portion,
    frl.unit AS recipe_unit,
    ii.name AS stock_item,
    ii.quantity_on_hand,
    ii.unit AS stock_unit,
    CASE
      WHEN frl.unit = 'g' AND ii.unit = 'kg'
        THEN FLOOR(ii.quantity_on_hand * 1000 / frl.quantity)
      WHEN frl.unit = 'ml' AND ii.unit = 'l'
        THEN FLOOR(ii.quantity_on_hand * 1000 / frl.quantity)
      WHEN frl.unit = ii.unit::text
        THEN FLOOR(ii.quantity_on_hand / frl.quantity)
      ELSE FLOOR(ii.quantity_on_hand / frl.quantity)
    END AS portions_this_ingredient
  FROM food_recipes fr
  JOIN food_recipe_lines frl ON frl.recipe_id = fr.id
  JOIN inventory_items ii ON ii.id = frl.inventory_item_id
  WHERE fr.tenant_id = '[TENANT_ID]'
    AND fr.category IN ('starter','main','dessert')
    AND frl.quantity > 0
    AND ii.is_active = true
)
SELECT
  dish,
  course,
  recipe_cost,
  MIN(portions_this_ingredient) AS portions_possible,
  (SELECT ingredient FROM recipe_portions rp2
   WHERE rp2.dish = rp.dish
   ORDER BY portions_this_ingredient ASC LIMIT 1) AS limiting_ingredient
FROM recipe_portions rp
GROUP BY dish, course, recipe_cost
ORDER BY course, portions_possible ASC;
```

---

## 8. OPEN LOOPS (feed into PENDING-ACTIONS.md)

### LOOP-F&B-001 — F&B Restaurant Stock Model Implementation

**Part 1: Garden Bistro data model** — CLOSED Session 288
- Archived 12 fake dish items
- Inserted 31 real raw ingredients (GB-R-001 to GB-R-031)
- Added inventory_item_id column to food_recipe_lines (migration)
- Linked 98/98 recipe lines to inventory items

**Part 2: Nourish Kitchen data model** OPEN
- Archive 6 finished_product items
- Build recipe BOM for 3 Nourish recipes
- Insert missing raw ingredients
- Link recipe lines to inventory_items

**Part 3: POS — ingredient deduction** OPEN
- POSScreen.js: on sale completion, look up food_recipe by item name/id
- For each food_recipe_line: insert stock_movement (production_out)
  quantity = frl.quantity x units_sold (converting g-kg, ml-l as needed)
- AVCO trigger fires automatically on stock_movements INSERT
Close when: selling Lamb Shank Provencale via POS reduces Lamb Shank kg on hand

**Part 4: Portions possible widget in FoodOverview** OPEN
- FoodOverview component: add React component that fetches and renders
  the portions-possible SQL query result as a card grid
- Cards: dish name, course badge, portions_possible, limiting_ingredient
- Color: green >=10, amber 3-9, red <=2 portions remaining
Close when: Garden Bistro FoodOverview shows correct live portions per dish

**Part 5: Live AVCO in HQRecipeEngine** OPEN
- HQRecipeEngine.js: for each recipe line, join to inventory_items via
  inventory_item_id — show weighted_avg_cost in the cost column
- Cost per portion = SUM(frl.quantity x ii.weighted_avg_cost / 1000) for each line
- This replaces the static food_recipes.cost_per_unit
Close when: Lamb Shank recipe shows cost updating when Lamb Shank AVCO changes

**Part 6: Waste log module** OPEN (Phase 2 — post core loop)
**Part 7: 86 auto-alert** OPEN (Phase 2)
**Part 8: AI menu intelligence** OPEN (Phase 2)
**Part 9: Actual vs theoretical variance report** OPEN (Phase 3)

---

## 9. NUAI DIFFERENTIATION IN F&B

### What MarketMan does NOT do:
- Link recipe costing to IFRS Income Statement
- File VAT from ingredient purchase invoices
- Depreciate the walk-in fridge and show it in Balance Sheet
- Calculate PAYE for kitchen staff in the same system

### What NuAi does that no F&B software does:
When the chef buys Lamb Shank at R189/kg:
1. Invoice photo — Smart Capture — auto-post as expense (OPEX/COGS)
2. AVCO updates in inventory_items
3. Recipe cost_per_unit updates in food_recipes
4. Gross margin on P&L tab updates
5. Input VAT captured for VAT201 return
6. Supplier outstanding balance shows in invoices/AP
7. Fixed asset (walk-in fridge where Lamb Shank lives) depreciates on BS

No other platform closes this loop. This is the 12 May demo story for F&B.

---

## 10. NOURISH KITCHEN — RECIPE BOM SPECIFICATION

Nourish is a deli/cafe (not a full-service restaurant). Their 3 recipes:
- Sourdough Loaf (uses: Bread Flour, Butter, Eggs)
- Signature Chicken Wrap (uses: Chicken, Bread Flour, Olive Oil, Lemon)
- Cold Brew Coffee 500ml (uses: Coffee Beans — NOT in stock yet)

Nourish inventory (correctly set up already):
- Extra Virgin Olive Oil 5L (raw_material, l)
- Unsalted Butter 2kg (raw_material, kg)
- Organic Oat Flour 5kg (raw_material, kg)
- Free-Range Chicken 1kg (raw_material, kg)

Missing ingredients to add:
- Bread Flour (already bought OAT flour — need white bread flour separately)
- Coffee Beans (for Cold Brew)
- Eggs (for Sourdough)
- Lemon (for Chicken Wrap)

---

*ANALYSIS-FNB-STOCK v1.0 · NuAi Platform · Session 288 · 17 April 2026*
*This document is PERMANENT GOSPEL. Add session updates below. Never replace above.*
*Next agent: read this BEFORE touching any F&B stock code or data.*
