# FEATURE-REGISTRY — WP-SMART-CATALOG
## SmartInventory.js — Complete Feature Inventory
### Last updated: April 3, 2026 · HEAD: f914826

> PURPOSE: This file prevents future agents from removing, overriding or
> duplicating features that are already built. Every feature in
> SmartInventory.js is listed here with its status and wiring.
> READ THIS BEFORE TOUCHING SmartInventory.js.

---

## HOW TO USE THIS FILE

**Before building anything new in SmartInventory.js:**
1. Check this registry — it may already exist
2. Check STATUS — if BUILT+WIRED it works, if BUILT+PENDING it needs connecting
3. Never remove a BUILT feature even if you can't see its UI — ask the owner first

---

## FEATURE INDEX

### SC-01 — KPI Cards + Action Panels ✅ BUILT + WIRED
**What it does:** 6 adaptive KPI cards across the top of the page showing live inventory health.
**Cards:** Total Items · Stock Value · Active · Sold Out · Below Reorder · No Price
**Behaviour:**
- Each card shows global count + "X in filter" when a filter is active
- Sold Out, Below Reorder, No Price cards are clickable — open a 420px slide-in action panel
- Sold Out panel: sorted by revenue lost, each item has "On Order" + "Receive Stock" buttons
- Below Reorder panel: "Flag for Reorder" button sets `needs_reorder=true` in DB
- No Price panel: inline price editor per item, saves to `sell_price` on DB
- Total Items card click = clears all filters
**DB columns used:** `needs_reorder` (bool), `on_order` (bool), `sell_price`
**State variables:** `activePanel`, `soldOutItems`, `belowReorderItems`, `noPriceItems`, `onOrderSet`, `flaggedReorder`, `noPriceDraft`, `noPriceFixed`

---

### SC-02 — StockItemPanel Single-Click Slide-In ✅ BUILT + WIRED
**What it does:** Clicking any item (tile, list row, or detail row) opens a 460px panel from the right with 4 tabs.
**Tabs:** Details · Stock History · QR & Loyalty · AI Analysis
**Behaviour:**
- Single click on any row/tile = opens panel (NOT edit modal)
- Double click on detail row = opens StockItemModal directly
- "Edit Full Item Details" button in panel opens StockItemModal on top (z-index 1200)
- Panel closes on Escape or × button
- StockItemPanel is a separate component: `src/components/hq/StockItemPanel.js`
**State variables:** `panelItem` (item | null)
**Z-index:** panel = 1051, backdrop = 1050

---

### SC-03 — Sold-Out Visual Weight ✅ BUILT + WIRED
**What it does:** Items with stock issues get visual markers in all 3 views.
**Rules:**
- Sold out (qty = 0): 3px red left border + "OUT OF STOCK" chip
- Low stock (qty ≤ reorder_level, only when reorder_level > 0): 3px amber border + "LOW" chip
- Dimmed opacity (0.55) for hidden/inactive items
**"Issues First" sort:** Filters panel toggle — sold out → low stock → healthy at top
**Helper functions:** `isSoldOut(item)`, `isLowStock(item)` — used across all 3 views

---

### SC-04 — Toast Notification System ✅ BUILT + WIRED (PLATFORM-LEVEL)
**What it does:** Non-blocking feedback toasts at bottom-centre of screen.
**Files:** `src/services/toast.js` (singleton) + `src/components/ToastContainer.js`
**Wired in:** TenantPortal.js + AppShell.js
**Usage:** `import toast from '../services/toast'; toast.success/error/warning/info(msg, options)`
**Undo support:** Pass `{ duration: 5000, undo: async () => { ... } }` to warning/info toasts
**DO NOT recreate this.** If you need toasts anywhere in the app, use this service.

---

### SC-05 — Tile Hover Menu + S/M/L Density + Smart Tags ✅ BUILT + WIRED
**What it does:**
- Hovering a tile shows a `···` button → opens Edit/Hide/Delete action bar at bottom of tile
- S/M/L density toggle in toolbar (tile view only) — changes grid column min-width
- Smart tags: 2 auto-detected tags per tile from `variant_value`, `brand`, `subcategory`
**Smart tag logic:** `getSmartTags(item)` — extracts weight (e.g. "3.5g"), strain (e.g. "Indica"), brand
**State variables:** `menuOpenId`, `hoveredId`, `tileSize`

---

### SC-06 — Pill Row Fade-Edge Scroll ✅ BUILT + WIRED
**What it does:** The category pill navigation row hides the scrollbar and fades at edges.
**Implementation:** CSS `scrollbar-width: none` + webkit scrollbar hidden, applied via `.nuai-pill-row` class

---

### SC-07 — Loading Skeleton ✅ BUILT + WIRED
**What it does:** While inventory data loads, shows shimmer skeleton rows matching the column layout.
**Component:** `LoadingState` function at bottom of SmartInventory.js
**Shimmer columns match:** [45, 220, 100, 120, 130, 110, 80, 95, 90, 85, 70] pixel widths

---

### SC-08 — Bulk Select + Bulk Actions ✅ BUILT + WIRED
**What it does:** "☑ Select" button enters selection mode across all 3 views.
**Selection UI:**
- Tile view: checkbox top-left of each tile, blue border + glow when selected
- List view: icon column becomes checkbox, selected rows get blue background
- Detail view: `#` column becomes checkbox (header = select all), blue row background
**Bulk actions toolbar** (appears when items selected):
- `Select all (N)` · `Clear` · `👁 Show` · `🚫 Hide` · `↓ Export` · `🗑 Delete`
- Show/Hide = toggles `is_active` on all selected items
- Export = exports only selected items to CSV
- Delete = `window.confirm` then hard delete
**State variables:** `selectMode`, `selectedIds`, `onToggleSelect`, `exitSelectMode`, `selectAllItems`
**Rules:** StockItemPanel suppressed in selectMode. Edit modal suppressed in selectMode.

---

### SC-09 — CSV Export ✅ BUILT + WIRED
**What it does:** Exports inventory to CSV respecting current filters and visible columns.
**Behaviour:**
- Exports only visible columns (respects column picker hidden state)
- Excludes `_row` (row numbers) and `_actions` columns
- When SC-08 select mode is active with items selected: exports only selected items
- Otherwise: exports all currently filtered items
- Filename: `inventory-[world]-[date].csv`
- `sell_price`, `weighted_avg_cost` exported as numbers (not formatted strings)
- `is_active` → "Active" / "Hidden", `is_featured` → "Yes" / "No"

---

### SC-10 — Smart Search Parser ✅ BUILT + WIRED
**What it does:** The search bar supports both plain text and token-based queries.
**Token syntax (these all work):**
```
price>500          → sell price above R500
price<100          → sell price below R100
cost<50            → avg cost below R50
qty:0              → quantity equals 0 (sold out)
qty>10             → quantity above 10
margin>50          → margin percentage above 50%
margin<30          → margin below 30%
brand:RAW          → brand contains "RAW"
brand:biobizz      → brand contains "biobizz"
sku:PRO-001        → SKU contains "PRO-001"
name:vape          → name contains "vape"
supplier:green     → supplier name contains "green"
category:flower    → category contains "flower"
```
**Plain text fallback:** If no token pattern detected, searches name + category + loyalty_category + brand + sku + variant_value
**Search placeholder hint:** "Search… or try price>500, qty:0, brand:RAW"
**"X of Y" counter:** Shows when filtered — "36 of 183" with red "✕ Clear" button
**State variable:** `search` (string)

---

### UX-01 — Column Drag-to-Resize ✅ BUILT + WIRED
**What it does:** Drag the divider between column headers in Detail view to resize columns.
**Persists to:** `localStorage` key `nuai_detail_col_widths`
**Minimum width:** 50px

---

### UX-02 — Column Drag-to-Reorder ✅ BUILT + WIRED
**What it does:** Drag any column header left/right to reorder columns in Detail view.
**Locked columns:** `_row` (#) and `_actions` cannot be moved
**Persists to:** `localStorage` key `nuai_col_order`
**Live reorder:** Columns reorder as you drag (onDragOver), not just on drop

---

### UX-03 — Row Numbers ✅ BUILT + WIRED
**What it does:** First column in Detail view shows row numbers (1, 2, 3...).
**Column key:** `_row` with `system: true` flag
**Excluded from:** Column picker (can't hide it), CSV export, drag-to-reorder
**In selectMode:** `_row` column shows checkboxes instead of numbers

---

### UX-04 — Column Visibility Picker ✅ BUILT + WIRED
**What it does:** "Columns (N shown)" button opens dropdown to show/hide columns.
**Excludes:** `_row` (system) and `_actions` from picker
**Default hidden:** `sku`, `reorder_level`, `max_stock_level`, `supplier`
**Persists to:** `localStorage` key `nuai_detail_hidden_cols`
**Auto-hide on load:** First load auto-hides columns that have no data in current inventory
**Extras:** "Hide columns with no data" button + "Show all columns" reset

---

### UX-05 — 3-Level Pill Navigation ✅ BUILT + WIRED
**What it does:** Category drill-down navigation above the inventory table.
**Level 0:** `[● All 183]` `[Categories ▼]` — clean default state
**Level 1:** `[● All]` `[‹ Back]` `[14 world pills with counts]` `[×]`
**Level 2:** `[● All]` `[‹ Back]` `[Active world pill]` `[×]` + sub-group pill rows below
**Sub-groups:** Every group for the active world shown as a scrollable pill row with label
**Toggle behaviour:** Clicking an active sub-pill deselects it (toggles off)
**Active filter chip:** Shows "Filtered: Strain Type → Indica [×]" when sub active
**Persists:** Nothing — pill state resets on page reload (by design)

---

### UX-06 — Empty State with Clear Filters ✅ BUILT + WIRED
**What it does:** When filters produce zero results, shows helpful empty state.
**Normal empty (no filter):** 📦 icon + "No inventory items" + Add Item button
**Filtered empty:** 🔍 icon + "No items match the current filters" + "✕ Clear all filters" button
**Clear all resets:** catFilter, groupFilter, subFilter, search, colFilters, filterRowOpen, sortByIssues, pillExpanded

---

### UX-07 — Issues-First Sort ✅ BUILT + WIRED
**What it does:** Toggle in Filters panel that pushes sold-out and low-stock items to top.
**Sort order when active:** sold out (qty=0) → low stock (qty ≤ reorder_level) → healthy
**Visual indicator:** Filters button shows "·⚠" suffix when active
**State variable:** `sortByIssues`

---

### DETAIL VIEW — Column Definitions
All columns defined in `DETAIL_COLS` array at top of file:

| Key | Label | Default | Notes |
|-----|-------|---------|-------|
| `_row` | # | visible | system=true, never in picker/CSV |
| `name` | Name | visible | includes icon, stock chips, featured star |
| `sku` | SKU | hidden | monospace font |
| `category` | Category | visible | shows world pill with icon |
| `variant_value` | Sub-type | visible | |
| `brand` | Brand | visible | |
| `quantity_on_hand` | On Hand | visible | coloured red/amber when low |
| `sell_price` | Sell Price | visible | |
| `weighted_avg_cost` | Avg Cost | visible | |
| `_margin` | Margin % | visible | computed: (sell-cost)/sell*100, coloured |
| `is_active` | Active | visible | toggle button: Active/Hidden |
| `is_featured` | Featured | visible | toggle button: ⭐ Yes/No |
| `loyalty_category` | Loyalty Cat | visible | |
| `reorder_level` | Reorder Lvl | hidden | |
| `max_stock_level` | Max Stock | hidden | |
| `supplier` | Supplier | hidden | from `item.suppliers.name` (join) |
| `_actions` | (empty) | visible | ✎ Edit + ✕ Delete buttons |

---

### PENDING FEATURES (do not build yet — scoped but not started)

**WP-REORDER** — Smart procurement engine
- Status: SCOPED · Spec in `WP-REORDER_v1_0.md`
- The `needs_reorder` and `on_order` DB columns are already added
- The "Flag for Reorder" and "On Order" buttons in SC-01 panels are the handoff points
- DO NOT build reorder into SmartInventory — it gets its own slide-in panel flow

**InfoTooltip integration** — Help icons for advanced features
- Status: PLANNED · InfoTooltip.js component exists platform-wide
- Planned placements: search bar, Avg Cost header, Margin % header, Stock Value KPI, Bulk Actions button
- Blocked on: InfoTooltip.js needs portal rendering upgrade first (overflow:hidden clipping bug)

**WP-STOCK-MERGE** — Integrate Smart Catalog into Stock tab
- Status: PLACEHOLDER · Spec in `WP-STOCK-MERGE_v1_0.md`
- Smart Catalog currently lives as its own nav item
- Future: becomes a tab within the Stock section

---

## WHAT TALKS TO WHAT

```
SmartInventory.js
  ├── imports StockItemModal.js     (world-specific add/edit — LOCKED)
  ├── imports StockItemPanel.js     (4-tab detail panel)
  ├── imports toast (service)       (platform toast system)
  ├── imports ProductWorlds.js      (PRODUCT_WORLDS, itemMatchesWorld, 
  │                                  CATEGORY_LABELS, CATEGORY_ICONS)
  ├── reads supabase
  │     ├── inventory_items (+ suppliers join)
  │     └── suppliers
  └── writes supabase
        ├── inventory_items.sell_price
        ├── inventory_items.is_active
        ├── inventory_items.is_featured
        ├── inventory_items.needs_reorder
        └── inventory_items.on_order
```

---

## RULES FOR NEXT AGENT

1. Never remove a feature listed here without explicit owner instruction
2. Never rewrite SmartInventory.js from scratch — it is 1,700+ lines of working code
3. Always check `system: true` flag on DETAIL_COLS before touching column logic
4. `colFilters` (column-level filters) are separate from `search` — both must be cleared on reset
5. `isFiltered` flag must include `colFilters` check or empty state won't show Clear button
6. localStorage keys in use: `nuai_detail_col_widths`, `nuai_col_order`, `nuai_detail_hidden_cols`
7. `selectMode` suppresses: panel open, double-click edit, actions column, tile menus
8. SC-10 token parser is inside the `filtered` useMemo — do not move it
