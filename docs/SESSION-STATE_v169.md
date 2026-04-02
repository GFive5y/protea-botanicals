# SESSION-STATE v169 — NuAi Platform
## April 3, 2026 · VERIFIED LIVE FROM VERCEL

> THIS IS THE SINGLE SOURCE OF TRUTH.
> All three Claude instances (Claude.ai, Claude Code Desktop, Claude Code VS Code)
> must read this before any work. It supersedes all previous session docs.

---

## ✅ LIVE HEAD — CONFIRMED FROM VERCEL

```
Commit:   ed91443
Message:  feat(catalog): InfoTooltip v2 portal rendering + 5 Smart Catalog help icons
Branch:   main
Prod URL: protea-botanicals.vercel.app
Status:   ✅ READY — live and deployed
Time:     April 3, 2026 (latest deployment)
```

---

## ✅ PLATFORM IDENTITY

```
Product:    NuAi — multi-tenant SaaS ERP for SA cannabis retail
Stack:      React (CRA) + Supabase + Vercel
Repo:       github.com/GFive5y/protea-botanicals
Dev URL:    localhost:3000
Prod URL:   protea-botanicals.vercel.app
Supabase:   uvicrqapgzcdvozxrreo.supabase.co
Tenant:     Medi Recreational · b1bad266-ceb4-4558-bbc3-22cfeeeafe74
            183 SKUs · R110,324 AVCO · 54 sold out · 1 no price
Team:       team_4mcbNpkclTRzzkutzol5iUME
Project:    prj_M2qcKbX8LOylzSxwIRisXhs4JQ40
```

---

## ✅ THREE-CLAUDE ECOSYSTEM — HOW WE WORK

```
Claude.ai (this chat)
  ROLE: Strategy · Architecture · Planning · File production · Debugging
  ACCESS: Vercel API (live deployments) · Project knowledge files
  DOES: Plans features, produces complete files, diagnoses issues,
        updates session docs, monitors production
  DOES NOT: Edit files directly, run git commands

Claude Code Desktop (browser tab)
  ROLE: Heavy execution — complex multi-file tasks
  ACCESS: Full repo · Supabase · Vercel · Git · Terminal
  DOES: Multi-file refactors, DB migrations, complex feature builds
  LIMITATION: Cannot push to GitHub (403 sandbox restriction)
              Use git merge → main → push pattern, or push from local terminal

Claude Code VS Code (sidebar panel — newly installed April 3)
  ROLE: Fast local execution — file edits, builds, git push
  ACCESS: Full local repo · Local git credentials · Terminal
  DOES: Targeted file edits, npm run build, git add/commit/push
  ADVANTAGE: Has local git credentials — git push works directly
  BEST FOR: Applying changes planned by Claude.ai
```

### THE OPTIMAL WORKFLOW (use this from now on)

```
1. Claude.ai — plan + produce files/specs
2. Claude Code VS Code — apply edits, build, commit, push
3. Claude Code Desktop — complex multi-file research + execution
   (if push needed: commit locally, push from VS Code terminal)
```

---

## ✅ COMPLETE COMMIT HISTORY — THIS SESSION (April 2-3, 2026)

```
ed91443  feat(catalog): InfoTooltip v2 portal rendering + 5 Smart Catalog help icons — LIVE HEAD
f19f44e  docs: add FEATURE-REGISTRY — complete Smart Catalog feature inventory
f914826  docs: final session close — HEAD bfae7c5
bfae7c5  fix(catalog): empty state shows Clear Filters button when stuck
cc3cd26  docs: session state final — all SCs done, priorities updated
97627a0  docs: update CLAUDE.md — all 10 SCs complete, priorities updated
6cb6f88  fix(catalog): clear all filters including column filters — fixes stuck filter bug
d4283cb  feat(catalog): SC-10 smart search + UX fixes (count, clear, auto-hide)
db5c286  fix(catalog): SC-08 wire select mode into all 3 views
21c1269  feat(catalog): SC-08 bulk actions — select, hide, delete, set price, flag reorder
acf6eba  fix(catalog): drag-reorder columns — live reorder on dragOver instead of drop
e9b1b0e  docs: add CLAUDE.md + session docs for persistent memory
e3af152  feat(catalog): row numbers + drag-reorder columns + localStorage persist
f4910bc  fix(catalog): localStorage for column settings — survives reboot
59fe473  feat(catalog): flat pill groups — show all subs on world click
98b7c8d  feat(catalog): promote search above KPI + wrap pill row to 2 lines
e2c28b2  feat(catalog): SC-07 loading skeleton — shimmer rows replace emoji spinner
```

---

## ✅ WHAT WAS BUILT TODAY — FULL AUDIT

### InfoTooltip v2 — SHIPPED — (ed91443)

**What changed:**
- `src/components/InfoTooltip.js` — complete rewrite (v2.0)
  - ReactDOM.createPortal rendering — immune to all overflow:hidden ancestors
  - Viewport boundary detection — flips left if near right edge, flips up if near bottom
  - Dark #141414 card, green accent, monospace example block, fade-in animation
  - All hooks called before early returns (rules-of-hooks compliant)
  - Backward compatible — all existing `<InfoTooltip id="..." />` usage unchanged
  - 20+ existing tooltip entries preserved + 5 new Smart Catalog entries added

- `src/components/hq/SmartInventory.js` — v1.3 (6 targeted additions)
  - Import added: `import InfoTooltip from "../InfoTooltip"`
  - Search bar: `<InfoTooltip id="sc_search" />` after input
  - Stock Value KPI card: `tooltip: "sc_stock_value"` property + renders in label
  - Avg Cost column header: `tooltip: "sc_avg_cost"` in DETAIL_COLS + renders
  - Margin % column header: `tooltip: "sc_margin"` in DETAIL_COLS + renders
  - Bulk Select button: `<InfoTooltip id="sc_bulk_select" size="sm" />` before it

**5 new tooltip entries in TOOLTIP_CONTENT:**
```
sc_search       — Smart search token syntax cheat sheet
sc_stock_value  — AVCO calculation + revenue potential formula
sc_avg_cost     — AVCO vs last purchase price explained
sc_margin       — Formula, margin vs markup, colour thresholds
sc_bulk_select  — Hide vs Delete, export selection workflows
```

### FEATURE-REGISTRY.md — SHIPPED — (f19f44e)

Complete feature inventory for SmartInventory.js — prevents future agents
from overriding or duplicating built features. Lives in repo root.

### Filter Bug Fix — SHIPPED — (6cb6f88 + bfae7c5)

- `colFilters` now cleared on all "✕ Clear" paths
- `isFiltered` includes `colFilters` check
- Empty state shows 🔍 + "✕ Clear all filters" button when stuck in filtered state

---

## ✅ SMART CATALOG — COMPLETE STATUS

```
SC-01 ✅  KPI cards + action panels (Sold Out / Reorder / No Price)
SC-02 ✅  StockItemPanel single-click slide-in (4 tabs)
SC-03 ✅  Sold-out visual weight (red/amber chips, issues-first sort)
SC-04 ✅  Platform-wide toast system with Undo
SC-05 ✅  Tile hover menu + S/M/L density toggle + smart tags
SC-06 ✅  Pill row fade-edge scroll
SC-07 ✅  Loading skeleton shimmer rows
SC-08 ✅  Bulk select — checkbox in Tile/List/Detail, bulk Show/Hide/Export/Delete
SC-09 ✅  CSV export — visible columns, current filter, excludes _row
SC-10 ✅  Smart search — price>500, qty:0, brand:RAW, margin>50, cost<80, etc.
UX-01 ✅  Column drag-to-resize (localStorage: nuai_detail_col_widths)
UX-02 ✅  Column drag-to-reorder (localStorage: nuai_col_order)
UX-03 ✅  Row numbers (_row system column)
UX-04 ✅  Column visibility picker (localStorage: nuai_detail_hidden_cols)
UX-05 ✅  3-level nesting doll pill navigation
UX-06 ✅  Empty state with Clear Filters button
UX-07 ✅  Issues-first sort toggle
InfoTooltip ✅  Portal rendering v2 + 5 SC help icons — SHIPPED ed91443
```

**WP-SMART-CATALOG is 100% COMPLETE.**

---

## ✅ FILES CHANGED THIS SESSION — WHAT EACH ONE IS

```
src/components/InfoTooltip.js
  Platform-wide help tooltip system. v2.0 with portal rendering.
  Used on: HQAnalytics, HQCogs, HQColdChain, HQFoodSafety, SmartInventory (new)
  DO NOT revert to v1 — the clipping bug was a known platform issue now fixed.

src/components/hq/SmartInventory.js
  Smart Catalog — v1.3. Main inventory management component.
  ~1,700 lines. All 10 SCs + all UX features + InfoTooltip wired.
  FEATURE-REGISTRY.md in repo root documents every feature.
  DO NOT rewrite from scratch.

FEATURE-REGISTRY.md (repo root)
  Complete feature inventory. Every future agent reads this before touching SmartInventory.
  UPDATE this file when adding new features.

docs/SESSION-STATE_v167.md (repo)
  Previous session state. Superseded by this document.
  Keep for history — do not delete.
```

---

## ✅ LOCKED COMPONENTS — NEVER TOUCH

```
StockItemModal.js   — 14 product worlds, custom fields per world. LOCKED.
ProteaAI.js         — AI assistant sidebar. LOCKED.
PlatformBar.js      — Top status bar. LOCKED.
HQStock.js          — PROTECTED. Read LL-178/179/180 before any change.
```

---

## ✅ CRITICAL RULES — THE LL LIST

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
LL-184  [NEW] InfoTooltip v2 uses ReactDOM.createPortal — do not revert to inline rendering
LL-185  [NEW] FEATURE-REGISTRY.md must be updated when any new SmartInventory feature is built
LL-186  [NEW] Claude Code VS Code has local git credentials — use it for git push operations
```

---

## ✅ DB SCHEMA — KEY COLUMNS

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

localStorage keys in use (SmartInventory):
  nuai_detail_col_widths    — column widths
  nuai_col_order            — column order
  nuai_detail_hidden_cols   — hidden columns
```

---

## ✅ NEXT PRIORITIES (in order)

```
P1  WP-REORDER — Smart procurement engine
    Spec: WP-REORDER_v1_0.md in project knowledge
    DB columns ready: needs_reorder, on_order
    Handoff points: SC-01 "Flag for Reorder" + "On Order" buttons
    DO NOT build inside SmartInventory — gets its own slide-in panel flow

P2  BUG-044 — HQCogs live FX shipping
    15 min fix, low priority vs P1

P3  WP-STOCK-MERGE — Integrate Smart Catalog into Stock tab
    Spec: WP-STOCK-MERGE_v1_0.md
    Smart Catalog currently = own nav item, future = tab within Stock

P4  First real sale — POS cash sale — unlocks intelligence panels
```

---

## ✅ PROJECT KNOWLEDGE FILES — WHAT TO UPLOAD

Files to keep in project knowledge (upload if missing):
```
SESSION-STATE_v169.md     — THIS FILE (replaces v167)
FEATURE-REGISTRY.md       — already in repo root + should be in project knowledge
WP-REORDER_v1_0.md        — next priority spec
SESSION-CORE_v2_6.md      — full LL rules list
SESSION-BUGS_updated.md   — open bugs
CLAUDE.md                 — needs HEAD update to ed91443
```

---

## ✅ WHAT EACH CLAUDE SHOULD DO WITH THIS FILE

**Claude.ai (this chat):**
- This is your live state. Use it for planning and architecture.
- When you see Vercel deployments, cross-reference with HEAD here.
- Update this doc at end of each session with new HEAD + completed work.

**Claude Code Desktop:**
- Read this at the start of every session.
- Check HEAD matches `git log --oneline -1` before any work.
- If HEAD doesn't match: `git pull origin main` first.
- After any multi-file work: commit, then push from VS Code terminal (not from sandbox).

**Claude Code VS Code:**
- Read CLAUDE.md in repo root first (it's always there).
- This session state is the authoritative truth above CLAUDE.md.
- You have local git credentials — you handle all git push operations.
- After Claude.ai produces a plan/file: you apply it, build, push.
- Build command: `CI=false npm run build` (or just `npm run build` locally)

---

## ✅ ARCHITECTURE — SMARTINVENTORY STATE MAP

```
SmartInventory.js (src/components/hq/SmartInventory.js)
  imports:
    StockItemModal.js   (LOCKED — world-specific add/edit)
    StockItemPanel.js   (4-tab detail panel)
    InfoTooltip.js      (v2.0 — portal rendering)
    toast service       (src/services/toast.js)
    ProductWorlds.js    (PRODUCT_WORLDS, itemMatchesWorld, CATEGORY_LABELS, CATEGORY_ICONS)

  supabase reads:
    inventory_items (+ suppliers join)
    suppliers

  supabase writes:
    inventory_items.sell_price
    inventory_items.is_active
    inventory_items.is_featured
    inventory_items.needs_reorder
    inventory_items.on_order

  z-index stack:
    .nuai-catalog content: base
    SC-01 action panels: 350
    StockItemPanel backdrop: 1050, panel: 1051
    StockItemModal: 1200
    InfoTooltip cards: 99999
    ToastContainer: 9000
```

---

## ✅ VERCEL ENVIRONMENT

```
Build command: CI=false npm run build  (set as Vercel env var — CI=false already configured)
Required env vars:
  REACT_APP_SUPABASE_URL
  REACT_APP_SUPABASE_ANON_KEY
  CI=false

Edge Functions (Supabase):
  ai-copilot       — ALL Claude API calls go through here only
  process-document
  get-fx-rate
  sign-qr
  payfast-checkout/itn
```

---

*SESSION-STATE v169 · NuAi · April 3, 2026*
*HEAD: ed91443 — InfoTooltip v2 + Smart Catalog complete*
*Three-Claude ecosystem active: Claude.ai + Claude Code Desktop + Claude Code VS Code*
*Next: WP-REORDER*
