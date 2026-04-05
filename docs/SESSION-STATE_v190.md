# SESSION-STATE v190
## NuAi Platform — Protea Botanicals
## Date: April 6, 2026
## Session: v190 — UX shell overhaul (global search, sidebar, breadcrumb, nav taxonomy)

---

# LIVE HEAD
5b2b04a  fix(sidebar): collapsed mode phantom line — borderLeft none + boxSizing
45165fc  feat(nav): taxonomy rename + section header navigation
81a25d7  fix(sidebar): remove phantom vertical line in expanded nav
27ee2c0  feat(sidebar): ✕ collapse + account + AI pills
156a7a0  feat(breadcrumb): Home link + clickable section segments
03d6b3a  feat(search): Global command palette — WP-SEARCH v1.0
b88b0b5  feat(hr/session-d): Pay Calculator — SA BCEA shift cost calculator
6835c59  docs: SESSION-STATE v189 (icons + mobile + collapsible sidebar)

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v190)

## HR Session D — Pay Calculator (b88b0b5)
New sub-tab in HRTimesheets: "Pay Calculator"
SA BCEA rules:
  Regular ≤45h/week  → hours × rate × 1.0
  Overtime >45h/week → hours × rate × 1.5
  Sunday work        → hours × rate × 1.5
  Public holiday     → hours × rate × 2.0
Reads: employment_contracts.hourly_rate_zar + timesheet_entries + public_holidays
Output: summary cards by category + daily breakdown table + grand total gross pay
Gate: Gerhardt Fivaz R150/hr contract ACTIVE (06 Apr – 29 Jun 2026) ✅
DB: Employment contract recreated via HRContracts wizard (end date: 29 Jun 2026)
Scope: gross pay only — excludes UIF, PAYE, deductions

## Global Command Palette — WP-SEARCH v1.0 (03d6b3a)
NEW FILE: src/components/GlobalSearch.js (~580 lines)

8 search categories:
  Products    → inventory_items (name, sku, brand, description)
  Brands      → inventory_items DISTINCT brand
  Categories  → inventory_items DISTINCT category + subcategory
  Staff       → staff_profiles (full_name, preferred_name, job_title)
  Customers   → user_profiles role=customer (full_name, phone, email)
  Suppliers   → suppliers (name, contact_name)
  Orders      → purchase_orders (po_number)
  Navigation  → static tab list

Role-based access:
  admin/owner → all 8 categories
  management  → all except staff
  hr          → staff + navigation only
  staff       → products + brands + categories + navigation only
  retailer    → same as staff

Technical:
  Trigger: search pill in breadcrumb RIGHT side (always visible) + Ctrl+K / ⌘K
  Custom event: window.dispatchEvent(new CustomEvent('nuai:open-search'))
  Match highlighting: brand green #1A3D2B, fontWeight 600
  Parallel Supabase queries: Promise.allSettled, 250ms debounce
  Max 4 results per category
  Keyboard nav: ↑↓ arrows + Enter to select + Esc (clear then close)
  Clickable Esc badge in modal (matches keyboard behaviour)

Pre-filtered navigation (Option B — premium):
  Product click  → ?tab=catalog with initialSearch=product name
  Brand click    → ?tab=catalog with initialSearch=brand name
  Category click → ?tab=stock with initialCategory + initialSubcategory
  Staff click    → ?tab=staff with initialSearch=staff name
  Customer click → ?tab=customers with initialSearch=name/phone
  Supplier click → ?tab=suppliers (navigate only, v1)
  Order click    → ?tab=procurement (navigate only, v1)
  Nav click      → ?tab=tabId directly

TenantPortal changes:
  searchFilter state + searchKey state
  handleNavigateWithFilter callback
  useEffect clears searchFilter 800ms after navigation
  renderTab: SmartInventory, HQStock, AdminCustomerEngagement,
    HRStaffDirectory all receive key={searchKey} + initial filter props

Component prop additions:
  SmartInventory.js: initialSearch, initialCategory, initialSubcategory
  AdminCustomerEngagement.js: initialSearch
  HRStaffDirectory.js: initialSearch

## Search trigger repositioning (ae04b28, f5da6b0)
Removed standalone 40px trigger bar above breadcrumb (sandwiched, looked orphaned)
Trigger now lives RIGHT side of breadcrumb bar:
  [Home › Inventory › Stock · desc]    [🔍 Search products, staff, orders…  Ctrl+K]
Bridge: button dispatches nuai:open-search → GlobalSearch listener opens modal
Trigger pill: minWidth 260, padding 20px, justifyContent space-between
Esc badge: span → button with identical-to-keyboard behaviour

## Sidebar ✕ collapse + account + AI pills (27ee2c0)
Removed over-engineered full-height edge strip (7b5295d, d1fadf0)
Collapse: ✕ button in sidebar header top-right (visible when expanded only)
  Clicking section icons in collapsed mode still expands (onExpand wired)

Bottom pills (matching HQ nav bar pattern):
  + green square (32×32, borderRadius 8) → dispatches nuai:open-ai custom event
  XX green circle (32×32, borderRadius 50%) → user initials from supabase auth
    currentUser state loaded via dynamic import('../services/supabaseClient')
  tenantId label inline when expanded, pills stack vertically when collapsed

## Breadcrumb navigation (156a7a0)
Breadcrumb now reads as clickable path:
  [🏠 Home] › [Section] › CurrentTab · desc
  Home: always navigates to ?tab=overview
  Section: clickable when not in home section → navigates to first tab of section
  Current tab: bold, not clickable (you are here)
  Desc: muted text, unchanged
  Section icon removed — clean text-only path
  All navigation consistent: clicking Inventory in sidebar OR breadcrumb = lands at Stock

## Navigation taxonomy + section header click (45165fc)
Label changes (IDs, roles, renderTab untouched):
  "Sales & Customers" → "Sales"
  "Customer 360" tab  → "Profiles"
  "Smart Catalog" tab → "Catalog"
  "Daily Operations"  → "Operations"

Section headers now navigate on click:
  onClick: setOpen(true) + onSelect(section.tabs[0].id)
  Before: section header only toggled expanded/collapsed
  After: clicking "Inventory" → lands at Stock tab (same as breadcrumb)

## Phantom vertical line fixes (81a25d7, 5b2b04a)
Root cause: borderLeft: 3px solid transparent on inactive buttons
  — browser reserves 3px space even for transparent borders
  — with overflow: visible on collapsed sidebar, overflows into content

EXPANDED mode fix (81a25d7):
  Inactive tab buttons: borderLeftStyle/Width/Color → borderLeft: "none"
  Active tab padding compensation: 36px → 33px (content aligns at 36px in both states)

COLLAPSED mode fix (5b2b04a):
  Inactive section icon buttons: "3px solid transparent" → "none"
  Added boxSizing: "border-box" to contain active indicator within 56px

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE (v190)
src/components/GlobalSearch.js          v1.0  ✅ NEW (03d6b3a)
src/pages/TenantPortal.js               v4.1  ✅ (5b2b04a — many sessions of changes)
src/components/hq/HRTimesheets.js       v1.3  ✅ Pay Calculator added (b88b0b5)
src/components/hq/SmartInventory.js     v1.4  ✅ initialSearch/Category/Subcategory
src/components/AdminCustomerEngagement.js      ✅ initialSearch prop
src/components/hq/HRStaffDirectory.js   v1.1  ✅ initialSearch prop

LOCKED/PROTECTED — never modify:
src/components/PlatformBar.js               LOCKED
src/components/hq/LiveFXBar.js             PROTECTED
src/components/StockItemModal.js            LOCKED
src/components/hq/HQStock.js               PROTECTED

## CANNABIS_RETAIL_WATERFALL — v190 FINAL STATE
Home          Dashboard
Inventory     Stock · Catalog
Ordering      Suppliers · Purchase Orders · Documents
Operations    Daily Trading · Cash-Up
Sales         POS Till · Pricing · Loyalty · Invoices
Customers     Profiles · QR Codes · Messaging
Reports       P&L · Expenses · Analytics · Reorder · Balance Sheet
Team          Staff · Roster · Timesheets · Leave · Contracts · Payroll · Calendar

Changes from v189:
  "Smart Catalog" → "Catalog"
  "Daily Operations" → "Operations"
  "Sales & Customers" → "Sales"
  "Customer 360" → "Profiles"

## ROLE MAP (cannabis retail — unchanged from v189)
staff / retailer  → Home · Sales · Customers
hr                → Home · Team
management        → Home · Inventory · Operations · Sales · Customers · Team
admin / owner     → All 8 sections
customer          → Home only

## AUTH — CONFIRMED (unchanged from v188)
fivazg@gmail.com      role=admin  hq=true  op=true  Protea HQ  ✅
admin@medi-rec...     role=admin  hq=false          Medi Rec   ✅

## DB — STAFF/CONTRACT STATE
Protea Botanicals HQ (43b34c33):
  staff_profiles: 1 — Gerhardt Fivaz (f6f2ba40)
  employment_contracts: 1 — R150/hr ACTIVE (06 Apr – 29 Jun 2026) ✅
  timesheets: 1 — week 30 Mar 2026, 3.25h, Pay Calculator shows R487.50

Medi Recreational (b1bad266):
  HR tables: 0 rows — wizards show
  Inventory: 184 SKUs, sell_price R0 on most (P1 blocker)
  staff_profiles: 0 — no real staff added

---

# NEXT PRIORITIES

## [P0] ProteaAI nuai:open-ai listener (outstanding from v190)
AI pill dispatches window.dispatchEvent(new CustomEvent('nuai:open-ai'))
ProteaAI.js needs a matching event listener: window.addEventListener('nuai:open-ai', ...)
Likely: same pattern as GlobalSearch nuai:open-search handler
File to check: src/components/ProteaAI.js

## [P1] Sell price rapid-set (blocks all real Medi Rec sales)
184 SKUs, most at sell_price = R0
Fast bulk pricing UI: table of R0 SKUs, inline price edit, save all at once
Target: SmartInventory pricing mode OR a dedicated Pricing tab widget
Gate: once prices set → POS till can process real sales

## [P2] POS till flow — first real sale
Session start → product search → add to cart → checkout → cash/Yoco
"No session" state is the current blocker
Yoco keys: not yet configured (sk_test_ needed)

## [P3] Dashboard action queue — operational nerve centre
Action tiles should be clickable and navigate to the right tab
Quick-action shortcuts: open till, add stock, cash-up, add customer
Currently: tiles show alerts but don't navigate

## [P4] Search v2 — executable actions
"Create new PO", "Add staff member", "Mark timesheet approved"
Currently: find + navigate only (v1)
Architecture already supports it (handleNavigateWithFilter pattern)

## [P5] Session docs update
SESSION-STATE_v190 (this file)
SESSION-LOG_DEFINITIVE needs v190 block prepended

---

# CRITICAL RULES

## RULE 0Q + LL-202 — GITHUB WRITE TOOLS BANNED FOR CLAUDE.AI
push_files, create_or_update_file = PERMANENTLY BANNED. VL-007 logged.
Available in tool list ≠ permitted. Prohibition overrides availability.
If catching self about to write: STOP, state violation, give spec to Claude Code.

## Icon Rules (ICON-01 through ICON-04)
ICON-01: Navigation/UI elements → Lucide SVG (lucide-react installed)
ICON-02: Onboarding wizard content → emoji permitted (warm/contextual)
ICON-03: PlatformBar.js LOCKED — premium custom SVGs, never change
ICON-04: No new emoji in navigation, buttons, tabs, breadcrumbs, tiles

## Code Rules (unchanged from v188/v189)
LL-132:   role values: customer|admin|retailer|staff|hr|management
LL-178:   Never change renderTab without loss list + owner confirm
LL-185:   Read file via GitHub MCP before any edit suggestion
LL-196:   fontWeight 300 / 9px labels / 0.3em letterSpacing BANNED
LL-198:   eod_cash_ups variance GENERATED, orders.total not total_amount
LL-200:   ZERO cannabis refs on public/Yoco pages
LL-201:   Yoco SDK = Android/iOS native only
LL-202:   GitHub write tools banned for Claude.ai (VL-007)
ROSTER-01: week_start MUST be Monday
PH-03:    Query .or('tenant_id.eq.X,tenant_id.is.null')

## THREE-CLAUDE ECOSYSTEM
Claude.ai   — reads via GitHub MCP + Supabase MCP, diagnoses, writes specs
             NEVER writes to GitHub (RULE 0Q + LL-202)
Claude Code — ALL repo writes, commits, pushes
Supabase MCP — schema, data, RLS, migrations

---

# DOCUMENT READ ORDER FOR NEXT SESSION
1. NORTH-STAR_v1_0.md
2. SESSION-STATE_v190.md  ← this file
3. SESSION-CORE_v2_11.md
4. VIOLATION_LOG_v1_1.md
5. REGISTRY_v3_2.md (if available)
6. MANIFEST_v3_0.md

---

*SESSION-STATE v190 · NuAi · April 6, 2026*
*UX shell overhaul — global search, sidebar, breadcrumb, nav taxonomy, phantom line fixes*
*HEAD: 5b2b04a · Branch: main*
*Next: ProteaAI AI pill → sell price rapid-set → POS first sale*
