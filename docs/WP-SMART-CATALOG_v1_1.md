# WP-SMART-CATALOG — Smart Inventory Catalog
## Version: 1.1 · April 2, 2026
## Status: SC-01 through SC-10 ALL COMPLETE ✅
## File scope: SmartInventory.js (~1,650 lines) + TenantPortal.js
## Linked WPs: WP-REORDER_v1_0.md (see separate document)

---

## SC STATUS — ALL COMPLETE

```
SC-01 ✅  KPI cards + action panels (Sold Out / Reorder / No Price)
SC-02 ✅  StockItemPanel single-click slide-in (4 tabs)
SC-03 ✅  Sold-out visual weight (red/amber chips, issues-first sort)
SC-04 ✅  Platform-wide toast system with Undo
SC-05 ✅  Tile hover menu + S/M/L density toggle + smart tags
SC-06 ✅  Pill row fade-edge scroll
SC-07 ✅  Loading skeleton (shimmer rows matching column widths)
SC-08 ✅  Bulk actions — select mode, bulk hide/show/delete/set price/flag reorder
SC-09 ✅  CSV export — visible columns, current filter, excludes _row
SC-10 ✅  Smart search parser (price>500, qty:0, brand:RAW, margin>50, cost<100)
```

---

## FEATURES BUILT

### Views
- Tile view — S/M/L density toggle, hover ··· menu, smart tags
- List view — compact rows, click to open panel
- Detail view — Excel-style, default view

### Detail View Features
- _row column — row numbers (#), system col, always visible, excluded from CSV/picker
- SKU column — after Name, hidden by default
- Drag-to-reorder — HTML5 drag on column headers, persists to localStorage
- Drag-to-resize — resize handle between columns, persists to localStorage
- Column picker — show/hide columns, excludes system cols (_row)
- Column filters — filter row per column when Filters open
- Sort — click header to sort asc/desc

### Toolbar
- Search — above KPI cards, always visible
- View toggle — Tile / List / Detail
- S/M/L toggle — tile density (tile view only)
- Filters button — issues-first sort toggle
- CSV export — visible columns + current filter, excludes _row
- Columns picker — detail view only
- Refresh + Add Item

### KPI Cards (SC-01)
Total · Stock Value · Active · Sold Out · Below Reorder · No Price
Each with global + filtered counts
Sold Out, Below Reorder, No Price → action panels (slide-in 420px)

### Pill Navigation — 3-level nesting doll (UX-02)
Level 0: [● All (183)]  [Categories ▼]
Level 1: [● All]  [‹ Back]  [14 world pills]  [×]
Level 2: [● All]  [‹ Back]  [Active world]  [×]  + all sub-groups flat below

---

## OUT OF SCOPE — LINKED WPs

WP-REORDER     Smart procurement engine — FULL SPEC in WP-REORDER_v1_0.md
WP-STOCK-MERGE Stock + Smart Catalog + Reorder merge — future session

---

*WP-SMART-CATALOG v1.1 · NuAi · April 2, 2026*
*All SC-01 through SC-10 COMPLETE*
