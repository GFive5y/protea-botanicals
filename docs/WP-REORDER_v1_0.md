# WP-REORDER — Smart Reorder & Procurement Engine
## Version: 1.1 · April 2, 2026
## Status: SCOPING — full scoping session required before build
## Location: Slide-out panel FROM Smart Catalog (not a separate nav item)
## Triggered by: SC-01 scoping + April 2 session strategic discussion

---

## STRATEGIC CONTEXT (captured April 2, 2026)

The owner identified a navigation fragmentation problem:
  Stock has 7 sub-tabs (Overview · Items · Movements · Pricing · Receipts · POs · Shop Manager)
  Smart Catalog sits OUTSIDE Stock in the nav — it should be inside it
  Reorder doesn't exist anywhere in the nav

Long-term vision: merge Stock + Smart Catalog + Reorder into one unified screen.
That is WP-STOCK-MERGE (separate WP, major session, future).

For WP-REORDER specifically:
  The reorder function fires FROM Smart Catalog as a slide-out panel
  Same slide-out pattern as SC-01 action panels (Sold Out · Below Reorder · No Price)
  No new nav item created — everything lives within the Smart Catalog flow
  This approach works now AND will migrate cleanly into WP-STOCK-MERGE later

---

## THE PROBLEM THIS SOLVES

Currently:
  Sold-out + below-reorder items are surfaced in SC-01 panels
  "On Order" button sets a flag (placeholder) — no real action happens
  "Flag for Reorder" sets needs_reorder=true — no real action happens
  There is no way to go from "I see what's out of stock" to "POs created" in one flow

What the owner described:
  "Scroll out-of-stock and low-stock items. Click what you want to order.
   System groups by supplier. Creates POs. Done."
  "Super easy to manage and restock items in the store."
  "This will be a gamechanger."

---

## INTEGRATION POINTS

  Smart Catalog (SC-01):
    Below Reorder panel "⇧ Flag for Reorder" → sets needs_reorder=true
    Both Sold Out and Below Reorder panels → "Open Reorder Queue" button

  inventory_items table:
    needs_reorder BOOLEAN (added) — item is flagged for ordering
    on_order BOOLEAN (added) — PO has been created/placed
    supplier_id — links to suppliers table

  suppliers table (existing):
    name, contact — already there
    Needs: lead_time_days, min_order_qty (to be added in scoping)

  purchase_orders table (existing — WP-STOCK-PO ZAR):
    WP-REORDER creates new POs in this table
    Items linked via purchase_order_items (check if this join table exists)
    Manager can view/edit created POs in the existing PO interface

  Receive Delivery (existing):
    When stock received → clears on_order=true, clears needs_reorder=true
    Existing flow unchanged — WP-REORDER just feeds it

---

## QUANTITY LOGIC (default, editable in preview)

  Default order quantity = MAX(reorder_level, 1) × 2
    If reorder_level is 5 and qty is 0 → suggest ordering 10
    If reorder_level is 0 and qty is 0 → suggest ordering 5 (safe minimum)
  Manager can override in Step 2 preview before creating PO
  Future: ProteaAI can suggest optimal quantity based on sales velocity

---

## OPEN QUESTIONS (to answer in scoping session)

  Q1: Does purchase_order_items join table exist? (check before building)
  Q2: Supplier fields — what's currently in the suppliers table?
  Q3: Items with NO supplier — should they appear in the queue at all?
  Q4: Can manager add items to the reorder queue manually?
  Q5: Should the slide-out have its own saved state?
  Q6: After POs created — does the queue show them as "On Order"?

---

## ESTIMATED BUILD COMPLEXITY

  Phase 1 (1 session): Slide-out UI + item selection + group by supplier + create POs
  Phase 2 (1 session): Supplier field additions + quantity intelligence
  Phase 3 (future):    ProteaAI quantity suggestions + lead time prioritisation
  Phase 4 (future):    WP-STOCK-MERGE — integrate into unified Stock screen

---

*WP-REORDER v1.1 · NuAi · April 2, 2026*
*Companion: WP-SMART-CATALOG_v1_1.md · WP-STOCK-MERGE_v1_0.md*
