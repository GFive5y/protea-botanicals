# SESSION-STATE — NuAi Platform

## Version: v167 · April 2, 2026

## HEAD: 97627a0

## THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR NEXT SESSION AGENTS

> Read order: SESSION-STATE.md → SESSION-CORE.md → SESSION-LOG.md → SESSION-BUGS.md

---

## ⚠ CRITICAL PENDING ACTIONS (do before any dev work)

```
1. RLS FIX — RESOLVED (stock_receipt_lines migration applied)
2. VERCEL — RESOLVED (auto-deploys from main, confirmed working)
3. SUPABASE BACKUPS (owner action — still pending):
   Settings → Add-ons → Point-in-Time Recovery
   ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.qr_security_settings ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.brand_image_library ENABLE ROW LEVEL SECURITY;
   + CREATE POLICY "app_access" ON each FOR ALL TO anon, authenticated
     USING (true) WITH CHECK (true);
   Tables flagged: stock_receipts, qr_security_settings, brand_image_library
   (possibly also stock_receipt_items — check Supabase Security Advisor)

2. VERCEL FIX (production deployment stuck on old commit 54d30fb):
   Current HEAD: 7d9ea6a — NOT deployed
   Fix: Vercel dashboard → Settings → Git → reconnect GitHub repo
   Environment vars required: CI=false, REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY
   Then: Deployments → latest commit → Redeploy

3. SUPABASE BACKUPS (owner action):
   Settings → Add-ons → Point-in-Time Recovery
   R110k+ of live stock data has no backup point
```

---

## CURRENT HEAD

```
Commit:  97627a0
Message: docs: update CLAUDE.md — all 10 SCs complete
Branch:  main
Pushed:  YES ✅
```

## FULL COMMIT CHAIN — THIS SESSION (April 2, 2026)

```
7d9ea6a  fix(catalog): restore onOpenPanel prop to all 3 view calls
3a5c0e2  feat(platform): SC-04 toast notification system
bed82aa  feat(catalog): SC-03 sold-out visual weight + SC-06 pill fade-edge
41a2d36  fix(shell): align FX bar + PlatformBar + inventory box to 24px boundary
dc16150  fix(shell): outer wrapper owns all horizontal padding — box-on-page
040cd45  fix(shell): align all header bars to same maxWidth:1400 boundary
e1be619  fix(shell): cream background #faf9f6 + toolbar card shadow
9a6470d  fix(catalog): increase left padding to 24px
7432a85  feat(catalog): SC-02 StockItemPanel wired into SmartInventory
99af825  fix(catalog): layout gap + On Order state in Sold Out panel
9cd9e69  feat(catalog): SC-01 KPI cards + action panels + FX bar centering
88f8001  feat(catalog): smart UX foundation — background dismiss + Escape + cursor
18b72fd  feat(catalog): StockItemModal integration — world-specific add + edit
--- Claude Code session (April 2, 2026) ---
e2c28b2  feat(catalog): SC-07 loading skeleton
59fe473  feat(catalog): flat pill groups — all subs on world click
98b7c8d  feat(catalog): promote search above KPI + wrap pill row
f4910bc  fix(catalog): localStorage for column settings
e3af152  feat(catalog): row numbers + drag-reorder columns
acf6eba  fix(catalog): drag-reorder live on dragOver
21c1269  feat(catalog): SC-08 bulk actions
db5c286  fix(catalog): SC-08 wire select mode into all 3 views
d4283cb  feat(catalog): SC-10 smart search + UX fixes
6cb6f88  fix(catalog): clear all filters — stuck filter bug
97627a0  docs: update CLAUDE.md — all 10 SCs complete
```

---

## PLATFORM IDENTITY

```
Product:    NuAi — SaaS ERP for SA cannabis retail (multi-tenant)
Repo:       github.com/GFive5y/protea-botanicals
Dev URL:    localhost:3000
Prod URL:   protea-botanicals.vercel.app (NOT current — deployment stuck)
Supabase:   uvicrqapgzcdvozxrreo.supabase.co
Active tenant: Medi Recreational (b1bad266-ceb4-4558-bbc3-22cfeeeafe74)
             183 SKUs · R110,324 AVCO · 54 items sold out · 1 no price
```

---

## LOCKED COMPONENTS (DO NOT MODIFY)

```
StockItemModal.js    — world-specific add/edit form (LOCKED)
ProteaAI.js          — AI assistant (LOCKED)
PlatformBar.js       — notification/status bar (LOCKED)
HQStock.js           — protected: read LL-178/179/180 before any change
```

---

## CRITICAL RULES (from SESSION-CORE)

```
LL-131  Never hardcode tenant UUID — always use tenantId prop/hook
LL-172  Never remove code for linter — use eslint-disable comment
LL-173  Always show diff + plain English before touching files
LL-174  CATEGORY_LABELS/ICONS from ProductWorlds.js
LL-178  Never replace renderTab case without owner warning
LL-179  New screens = new nav entries only
LL-180  Read existing component before building parallel
LL-181  inventory_items has NO notes column
LL-182  category is enum — SQL needs ::inventory_category
LL-183  PowerShell has no &&
```

---

## WP-SMART-CATALOG STATUS (THE MAIN WP THIS SESSION)

### COMPLETED THIS SESSION:

```
SC-01 ✅  KPI cards + action panels
  6 adaptive KPI cards: Total · Stock Value · Active · Sold Out · Below Reorder · No Price
  Card order: Total · Stock Value · Active · Sold Out · Below Reorder · No Price
  Adaptive layout: 6 in one row wide, wraps 2 rows narrow
  Context numbers: global (large) + filtered sub-label when world pill active
  Sold Out panel: slide-in 420px, sorted by revenue lost, On Order + Receive Stock per item
  Below Reorder panel: ⚑ Flag for Reorder → sets needs_reorder=true (WP-REORDER handoff)
  No Price panel: inline price editor → green ✓ Fixed on save
  DB columns added: needs_reorder BOOLEAN, on_order BOOLEAN

SC-02 ✅  StockItemPanel wired into SmartInventory
  Single click: tile/list/detail row → StockItemPanel 460px slide-in (4 tabs)
  Panel: Details · Stock History · QR & Loyalty · AI Analysis
  "Edit Full Item Details" in panel → opens StockItemModal on top (z-index 1200)
  Double-click on detail row → StockItemModal direct (power user shortcut)
  Escape key priority: StockItemModal → panelItem → activePanel → colPickerOpen → pills

SC-03 ✅  Sold-out visual weight
  Sold out: 3px red left border + red "OUT OF STOCK" chip in name cell (all 3 views)
  Low stock (qty ≤ reorder_level, only if reorder_level > 0): amber border + "LOW" chip
  "Issues first" toggle: in Filters dropdown, visible all 3 views
    When active: sold-out at top → low-stock → healthy
    Filters button shows green + "·⚠" indicator when active

SC-04 ✅  Toast notification system (PLATFORM-LEVEL)
  Files: src/services/toast.js (singleton) + src/components/ToastContainer.js
  Wired in: TenantPortal.js + AppShell.js (covers all tenant + HQ portals)
  Usage: import toast from '../services/toast'; toast.success/error/warning/info()
  Position: bottom-centre, dark pill, coloured left border per type
  Progress bar on timed toasts, × dismiss, Undo button on warning toasts
  Undo wired: delete (5s re-insert), hide (5s show again), flag reorder (5s unflag)
  Callsites in SmartInventory: 6 actions → feedback

SC-06 ✅  Pill row fade-edge scroll
  Removed native scrollbar arrows (◄ ►)
  Added CSS fade gradient left (28px) and right (40px)
  Hidden scrollbar: -webkit-scrollbar: none + scrollbar-width: none
```

### PENDING (next session):

```
SC-05 ✅  Tile hover + smart tags (commit 337385e)
SC-07 ✅  Loading skeleton shimmer rows (commit e2c28b2)
SC-08 ✅  Bulk actions — select mode, floating action bar (commit 21c1269)
SC-09 ✅  CSV export (commit 6e7cdcd)
SC-10 ✅  Smart search — price>500, qty:0, brand:RAW, margin>50 (commit d4283cb)
UX: search promoted, pill wrap, flat groups, row numbers, drag-reorder, localStorage, clear button

```

### ARCHITECTURAL DECISIONS LOCKED THIS SESSION:

```
WP-REORDER:
  "On Order" button in SC-01 = manual placeholder until WP-REORDER is built
  needs_reorder flag = handoff from SC-01 to WP-REORDER procurement engine
  Reorder slide-out fires FROM Smart Catalog (not a separate nav item)
  Step 1: select items, grouped by supplier
  Step 2: preview per supplier — editable qty, failsafe remove/add items
  Step 3: confirm → POs created → on_order=true auto-set
  Full spec in WP-REORDER_v1_0.md

WP-STOCK-MERGE (FUTURE):
  Smart Catalog should be INSIDE Stock tab, not a separate nav item
  Stock should become: Overview · Smart Catalog · Reorder · Movements · Pricing · etc.
  DO NOT BUILD until SC-01–SC-10 complete
  Full spec in WP-STOCK-MERGE_v1_0.md
```

---

## LAYOUT / SHELL ARCHITECTURE (confirmed working)

```
TenantPortal.js — main layout:
  Root: height:100vh, overflow:hidden, flexDirection:row
  Left: sidebar 220px, background:#fff (white)
  Right: content column, overflow:hidden, flexDirection:column
    Breadcrumb bar (height:48, white, maxWidth:1400 content centered)
    FX bar + PlatformBar (maxWidth:1400 wrapper, padding:0 24px, overflow:hidden)
    Content wrapper (fullBleed: padding:12px 24px 0 24px, maxWidth:1400, bg:#faf9f6)
      SmartInventory renders here with transparent background
    Footer bar (height:28, NuAi · v0.1 · dev · date · green dot)

  FULL-BLEED TABS (catalog, stock):
    padding: "12px 24px 0 24px" — cream visible on left+right
    SmartInventory has NO internal horizontal padding (wrapper owns it)
    maxWidth: 1400

  REGULAR TABS (dashboard, orders, etc.):
    padding: "24px 28px"
    maxWidth: 1400

AppShell.js — HQ portal:
  padding: "28px 32px 48px" inside content div
  background: #faf9f6
  ToastContainer wired in
```

---

## SMARTINVENTORY COMPONENT STATE (2,500+ lines)

```
File: src/components/hq/SmartInventory.js
Imports: StockItemModal, StockItemPanel, toast (from services)

KEY STATE:
  viewMode:        tile | list | detail (default: detail)
  catFilter:       world pill selection (default: "all")
  groupFilter:     group within world (e.g. "indica_group")
  subFilter:       sub-item within group
  search:          text search
  sortKey/sortDir: column sort
  hiddenCols:      Set of hidden column keys (sessionStorage persisted)
  colFilters:      { [colKey]: filterString } for detail column filters
  filterRowOpen:   Filters panel visible (visible in ALL view modes)
  sortByIssues:    boolean — sold-out first toggle
  activePanel:     "soldout" | "reorder" | "noprice" | null (SC-01 panels)
  panelItem:       item | null (SC-02 StockItemPanel)
  modalItem:       item | null | undefined (undefined=closed, null=new, item=edit)
  modalDefaults:   { world, worldLabel, category, subcategory }
  showWorldPicker: boolean (world picker for "All Products" add)
  onOrderSet:      Set<itemId> — items marked On Order
  flaggedReorder:  Set<itemId> — items flagged this session
  noPriceFixed:    Set<itemId> — prices fixed in panel this session

Z-INDEX STACK:
  StockItemPanel backdrop:  1050
  StockItemPanel panel:     1051
  SC-01 action panels:      350 (backdrop) → above content
  StockItemModal wrapper:   1200 (appears above StockItemPanel)
  World picker:             400
  ToastContainer:           9000 (above everything)
```

---

## DB STATE — MEDI RECREATIONAL

```
inventory_items:   183 SKUs, all categorised ✅
AVCO:              R110,324 · healthy margins
needs_reorder:     BOOLEAN column added ✅ (April 2, 2026)
on_order:          BOOLEAN column added ✅ (April 2, 2026)
orders:            0 processed — intelligence panels empty
brand_image_library: 0 rows (owner action needed)

TABLES NEEDING RLS (run SQL above):
  stock_receipts, qr_security_settings, brand_image_library
  (possibly stock_receipt_items)
```

---

## WP STATUS — FULL PLATFORM

```
WP-POS v1.0                     COMPLETE ✅
WP-SMARTSTOCK-UI Phase 1        COMPLETE ✅ (CannabisDetailView)
WP-SMARTSTOCK-UI Phase 2        COMPLETE ✅ (pill hierarchy)
WP-SMARTSTOCK-UI Phase 3        PLANNED (audit trail)
WP-SMART-CATALOG SC-01          COMPLETE ✅
WP-SMART-CATALOG SC-02          COMPLETE ✅
WP-SMART-CATALOG SC-03          COMPLETE ✅
WP-SMART-CATALOG SC-04          COMPLETE ✅
WP-SMART-CATALOG SC-06          COMPLETE ✅
WP-SMART-CATALOG SC-01-10       COMPLETE ✅
WP-REORDER                      SCOPED (spec in WP-REORDER_v1_0.md)
WP-STOCK-MERGE                  PLACEHOLDER (spec in WP-STOCK-MERGE_v1_0.md)
WP-MULTISITE S1                 CRITICAL — 1 SQL line still not run
WP-PAY S1 (Yoco)                BLOCKED — needs sk_test_ keys
BUG-044 HQCogs live FX          OPEN — 15 min fix, low priority vs catalog work
```

---

## COMPETITIVE POSITION

```
UNIQUE TO NuAi:
  Smart Catalog — 14 cannabis product worlds, live counts, cascading drill-down
  SC-01 KPI cards with action panels (sold out, reorder, no price)
  SC-02 Single-click item detail panel (4 tabs: Details, History, QR, AI)
  SC-03 Visual stock status (red/amber chips, issues-first sort)
  SC-04 Platform-wide toast system with Undo
  Live ECB/Frankfurter FX rate in per-SKU COGS
  HMAC-signed QR codes with fraud detection
  Starbucks-level loyalty (5 tiers + multipliers + streaks + referrals)
  AI-powered AVCO calibration

GAPS vs competitors:
  Smart Catalog not yet merged into Stock tab (WP-STOCK-MERGE)
  No PO auto-creation from reorder queue (WP-REORDER)
  No Yoco card machine integration (WP-PAY S1)
  No SAHPRA compliance report export
  Portal not mobile-responsive
```

---

## NEXT SESSION PRIORITIES

```
P1  WP-REORDER — Smart procurement engine (spec ready)
P2  WP-STOCK-MERGE — Integrate Smart Catalog into Stock tab
P3  BUG-044 — HQCogs FX shipping (15 min)
P4  First real sale — POS cash sale → unlocks intelligence panels
NOTE: RLS fix DONE. Vercel DONE. All SCs DONE.
```

---

## SESSION PROTOCOL (for next agent)

```
1. Read this file first — it is the current truth
2. Read SESSION-CORE_v2_6.md for rules and LL list
3. Read WP-SMART-CATALOG_v1_1.md for the active WP
4. Do NOT build anything without owner approval
5. Do NOT modify LOCKED components
6. Check MANIFEST and REGISTRY before creating new components
7. Every code change: show diff first, explain in plain English, wait for "build it"
```

---

## PROJECT KNOWLEDGE FILES TO UPLOAD

```
UPLOAD (replace existing):
  SESSION-STATE_v167.md     ← this file (replace v166)
  WP-SMART-CATALOG_v1_1.md  ← already current
  WP-REORDER_v1_0.md        ← already current
  WP-STOCK-MERGE_v1_0.md    ← new file from this session

KEEP UNCHANGED:
  SESSION-CORE_v2_6.md
  SESSION-LOG_DEFINITIVE.md
  SESSION-BUGS_updated.md
  ONBOARDING_v2_0.md
  MANIFEST_v3_0.md
  REGISTRY_v3_0.md
  WP-SMARTSTOCK-UI_v1_0.md
  SOP.md
```

---

_SESSION-STATE v168 · NuAi · April 2, 2026 · HEAD: 97627a0_
_Smart Catalog SC-01 through SC-10 ALL COMPLETE_
_Next: WP-REORDER → WP-STOCK-MERGE_
