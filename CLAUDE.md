# CLAUDE.md — NuAi Platform Context
## Read this file at the start of every session before writing any code.

---

## PLATFORM IDENTITY

```
Product:    NuAi — multi-tenant SaaS ERP for SA cannabis retail
Stack:      React (CRA) + Supabase + Vercel
Repo:       github.com/GFive5y/protea-botanicals
Dev:        localhost:3000
Prod:       protea-botanicals.vercel.app
Supabase:   uvicrqapgzcdvozxrreo.supabase.co
Tenant:     Medi Recreational · b1bad266-ceb4-4558-bbc3-22cfeeeafe74
            183 SKUs · R110,324 AVCO · 54 sold out · 1 no price
```

---

## OWNER PROFILE

```
Non-technical. Uses Claude.ai chat interface only.
Terminal: PowerShell — NEVER use && (use separate lines or semicolons)
Workflow: Claude produces diffs/files → owner applies via Ctrl+H or patch scripts
Git: owner runs git commands manually in VS Code terminal
```

---

## CURRENT HEAD

```
Commit:  e3af152 (approximate — verify with git log --oneline -1)
Branch:  main
Build:   CI=false npm run build (Vercel env var set)
```

---

## SMARTINVENTORY.JS — v1.1 FEATURE SET

```
File: src/components/hq/SmartInventory.js (~1,650 lines)
Status: Active WP — Smart Catalog

VIEWS:
  Tile view    — S/M/L density toggle, hover ··· menu, smart tags, SC-05 ✅
  List view    — compact rows, click to open panel
  Detail view  — Excel-style, default view

DETAIL VIEW FEATURES:
  _row column        — row numbers (#), system col, always visible, excluded from CSV/picker ✅
  SKU column         — after Name, hidden by default ✅
  Drag-to-reorder    — HTML5 drag on column headers, persists to localStorage ✅
  Drag-to-resize     — resize handle between columns, persists to localStorage ✅
  Column picker      — show/hide columns, excludes system cols (_row) ✅
  Column filters     — filter row per column when Filters open ✅
  Sort               — click header to sort asc/desc ✅

TOOLBAR:
  Search             — above KPI cards, always visible ✅
  View toggle        — Tile / List / Detail ✅
  S/M/L toggle       — tile density (tile view only) ✅
  Filters button     — issues-first sort toggle ✅
  CSV export         — visible columns + current filter, excludes _row ✅ (SC-09)
  Columns picker     — detail view only ✅
  Refresh + Add Item ✅

KPI CARDS (SC-01 ✅):
  Total · Stock Value · Active · Sold Out · Below Reorder · No Price
  Each with global + filtered counts
  Sold Out, Below Reorder, No Price → action panels (slide-in 420px)

PILL NAVIGATION — 3-level nesting doll (UX-02 ✅):
  Level 0: [● All (183)]  [Categories ▼]
  Level 1: [● All]  [‹ Back]  [14 world pills]  [×]
  Level 2: [● All]  [‹ Back]  [Active world]  [×]  + all sub-groups flat below
  Sub-pills: per group row, clickable, toggle-deselect, active filter chip

PANELS (SC-02 ✅):
  StockItemPanel — single click tile/list/detail row → 460px slide-in (4 tabs)
  StockItemModal — world-specific add/edit, opens above panel (z:1200)

OTHER FEATURES:
  Toast system (SC-04 ✅) — bottom-centre, progress bar, Undo
  Sold-out visual weight (SC-03 ✅) — red/amber chips + left border
  Smart tags (SC-05 ✅) — variant_value + brand parsed per world
  Shimmer skeleton (SC-07 ✅) — matches column widths
  Loading/Error/Empty states ✅
```

---

## SC STATUS — WP-SMART-CATALOG

```
SC-01 ✅  KPI cards + action panels (Sold Out / Reorder / No Price)
SC-02 ✅  StockItemPanel single-click slide-in (4 tabs)
SC-03 ✅  Sold-out visual weight (red/amber chips, issues-first sort)
SC-04 ✅  Platform-wide toast system with Undo
SC-05 ✅  Tile hover menu + S/M/L density toggle + smart tags
SC-06 ✅  Pill row fade-edge scroll
SC-07 ✅  Loading skeleton (shimmer rows matching column widths)
SC-08 ⏳  Bulk actions in Tile + List views — PENDING
SC-09 ✅  CSV export — visible columns, current filter, excludes _row
SC-10 ⏳  Smart search parser (price>, qty:, brand:, world:) — PENDING
```

---

## LOCKED COMPONENTS — DO NOT MODIFY

```
StockItemModal.js   — 14 product worlds with custom fields per world. LOCKED.
ProteaAI.js         — AI assistant sidebar. LOCKED.
PlatformBar.js      — Top status bar. LOCKED.
HQStock.js          — PROTECTED. Read LL-178/179/180 before any change.
```

---

## CRITICAL RULES (LL LIST)

```
LL-131  Never hardcode tenant UUID — always use tenantId prop/hook
LL-172  Never remove code for linter — use eslint-disable comment
LL-173  Always show diff + plain English before touching files
LL-174  CATEGORY_LABELS/ICONS from ProductWorlds.js — never define locally
LL-178  Never replace renderTab case without listing everything lost + owner confirm
LL-179  New screens = new nav entries only — never replace existing cases
LL-180  Read existing component before building parallel
LL-181  inventory_items has NO notes column — never include in INSERT/UPDATE
LL-182  category is enum — SQL needs ::inventory_category cast
LL-183  PowerShell has no && — use separate lines or semicolons
LL-126  Domain-to-tenant mapping required — tenants.domain column added ✅
LL-131  Never hardcode tenant UUID anywhere in code
```

---

## DB SCHEMA — KEY COLUMNS

```
inventory_items:
  id, tenant_id, name, category (enum: inventory_category), sell_price,
  weighted_avg_cost, quantity_on_hand, image_url, is_active, is_featured,
  display_order, loyalty_category, supplier_id, expiry_date,
  reorder_level, max_stock_level, needs_reorder (bool), on_order (bool),
  sku, brand, variant_value, subcategory, variant_type, tags,
  created_at, updated_at
  ❌ NO notes column (LL-181)
  ❌ category is enum — SQL needs ::inventory_category cast (LL-182)

tenants:
  id, name, industry_profile, domain (TEXT UNIQUE — added WP-MULTISITE S1 ✅)

DB functions: reserve_stock(), AVCO engine
RLS: enabled on all tables. tenant_id on every INSERT (Rule 0F).
```

---

## ARCHITECTURE RULES

```
Rule 0F:  Every INSERT to tenant-scoped table MUST include tenant_id
Rule 0G:  useTenant() must be called INSIDE the component that uses it
Rule 0H:  Fix the CODE not the data (except corrupt legacy + root fix)
Rule 0K:  Before touching any renderTab case — list all features it serves, get explicit owner confirm
Rule 0L:  Before building any inventory component — read HQStock.js first
AI calls: ALL Claude API calls go through ai-copilot Edge Function only. NEVER direct from React.
```

---

## OPEN BUGS (check SESSION-BUGS for details)

```
BUG-044  HQCogs live FX shipping — 15 min fix, low priority
BUG-043  (check SESSION-BUGS file)
BUG-042  (check SESSION-BUGS file)
BUG-041  (check SESSION-BUGS file)
```

---

## NEXT PRIORITIES (in order)

```
P1  SC-08 — Bulk actions in Tile + List views (scope first)
P2  SC-10 — Smart search parser (scope first)
P3  WP-REORDER — Smart procurement engine (full scoping session needed)
P4  BUG-044 — HQCogs live FX shipping (15 min)
P5  First real sale — POS → cash sale → unlocks intelligence panels
P6  WP-STOCK-MERGE — merge Smart Catalog into Stock tab (future, major)
```

---

## SESSION PROTOCOL

```
1. Read this file first
2. Read SESSION-STATE.md from project knowledge
3. Read SESSION-CORE.md for full LL list
4. Do NOT build anything without owner "build it" confirmation
5. Do NOT modify LOCKED components
6. Show diff + plain English before any file change
7. Every code change: npm run build must pass before commit
8. PowerShell: never use && — use separate lines
9. Commit immediately after every working change — never batch large commits
10. After session: update SESSION-STATE.md with new HEAD and completed work
```

---

## VERCEL + DEPLOYMENT

```
Build command: CI=false npm run build  (set as Vercel env var)
Env vars required: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY, CI=false
Edge Functions: ai-copilot, process-document, get-fx-rate, sign-qr, payfast-checkout/itn
```

---

## WP STATUS — FULL PLATFORM

```
WP-POS v1.0                COMPLETE ✅
WP-SMARTSTOCK-UI Phase 1   COMPLETE ✅
WP-SMARTSTOCK-UI Phase 2   COMPLETE ✅
WP-SMART-CATALOG SC-01–07,09 COMPLETE ✅
WP-SMART-CATALOG SC-08,10  PENDING
WP-REORDER                 SCOPED (spec in WP-REORDER_v1_0.md)
WP-STOCK-MERGE             PLACEHOLDER (post SC-01–10)
WP-MULTISITE S1            COMPLETE ✅ (tenants.domain column added)
WP-PAY S1 (Yoco)           BLOCKED — needs sk_test_ keys
BUG-044 HQCogs FX          OPEN — 15 min fix
```

---

*CLAUDE.md · NuAi · April 2, 2026*
*Update HEAD and SC status at the end of each session.*
