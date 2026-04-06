# NuAi · Work Package
## WP-STOCK-RECEIVE-S3
### Receive Delivery — Product World Integration + Smart Item Picker

| **Version**  | v1.0 — initial spec |
|---|---|
| **Date**     | March 31, 2026 |
| **Status**   | READY TO IMPLEMENT — next available session |
| **Priority** | P1 — blocks accurate AVCO on all non-flower SKUs |
| **Estimate** | 4–6 hours |
| **HEAD at spec time** | 786d216 |
| **Files to modify** | src/components/hq/StockReceiveModal.js |
| **New files** | src/components/hq/ProductWorlds.js (shared config) |

---

## 1. The Problem

The Receive Delivery modal (StockReceiveModal.js) uses a flat search
dropdown to find items. With 182 SKUs this is unusable — you cannot
browse to "Premium Bubble Hash 5g" without knowing the exact name.

More critically: the modal has no awareness of product attributes.
Every item gets the same form fields regardless of whether you're
receiving Flower (needs strain/weight/grade), a Concentrate (needs
type/weight), or a Nutrient (needs volume/NPK ratio).

---

## 2. The Solution — Single Source of Truth

Create `src/components/hq/ProductWorlds.js` — one shared config file
that both the Items tab and Receive Delivery read from.

---

## 7. Flexible Attributes Per World

| World | Receive attributes |
|---|---|
| Flower | strain_type · weight_grams · grade (tag) · cultivation (tag) |
| Concentrate | subcategory (type) · weight_grams |
| Hash & Kief | subcategory (type) · weight_grams |
| Vapes | subcategory (cart/disposable/battery) · volume_ml |
| Edibles | subcategory · potency_mg · format |
| Seeds & Clones | subcategory · seed_count or clone_count |
| Substrate | subcategory · volume_litres |
| Nutrients | subcategory · volume_ml or weight_grams · npk_ratio |
| Grow Equipment | subcategory · serial_number (optional) |
| Accessories | subcategory · no extra attributes |
| Wellness | subcategory · potency_mg |
| Rolling Papers | subcategory · pack_count |

These map to existing columns on inventory_items — no schema changes.

---

## 8. Build Phases

### Phase 1 — ProductWorlds.js + Item Picker (this WP)
- Create ProductWorlds.js with full world definitions
- Refactor CannabisItemsView to import from ProductWorlds.js
- Rebuild StockReceiveModal Step 2 with category sidebar
- New product inline creation (basic — name + category + cost)

### Phase 2 — Price UX fixes
- Pricing tab: "NO COST" badge when AVCO=0 instead of "100%"
- Receive modal Step 4: show sell price → margin if price already set

### Phase 3 — Supplier product catalogue (separate WP)
- Suppliers have their own product lists
- Known supplier products appear first in receive modal

---

## 9. Files

| File | Change |
|---|---|
| src/components/hq/ProductWorlds.js | NEW — shared world definitions |
| src/components/hq/StockReceiveModal.js | MODIFY — rebuild Step 2 |
| src/components/hq/CannabisItemsView (in HQStock.js) | MODIFY — import from ProductWorlds.js |
| src/components/hq/StockPricingPanel.js | MODIFY Phase 2 — NO COST badge |

**LOCKED — do not touch:**
StockItemModal.js v2.0 · ProteaAI.js v1.4 · PlatformBar.js v1.2

---

*WP-STOCK-RECEIVE-S3 v1.0 · NuAi · March 31, 2026*
