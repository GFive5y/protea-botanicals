# SESSION-STATE v191
## NuAi Platform — Protea Botanicals
## Date: April 6, 2026
## Session: v191 — ProteaAI wired + phantom line root cause + sidebar polish

---

# LIVE HEAD
eb7a83c  fix(ai-pane): raise z-index above PlatformBar when open
5c86d39  fix(ai-pane): correct position for TenantPortal sidebar
cf35d1a  feat(ai): wire ProteaAI panel to sidebar AI pill
781f50e  fix(sidebar): hide scrollbar — appear on hover only
9d172b3  fix(sidebar): restore section toggle + fix scroll
37fca62  fix(ai-pane): remove border-right when panel closed
2b1dac8  fix(sidebar): remove translucent section header background
4604b7a  fix(sidebar): replace borderLeft with inset box-shadow

Previous session HEAD (v190): 5b2b04a

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v191 — post v190 docs)

## Phantom line — root cause finally identified (37fca62)
After 6 failed attempts targeting TenantPortal.js, DevTools
right-click → Inspect on the actual line revealed the source:

FILE: src/components/NavSidebar.css line 454
ELEMENT: .ai-pane (ProteaAI slide-out panel)
CAUSE: position:fixed + width:0 when closed BUT
  border-right: 0.5px solid rgba(0,0,0,0.1) still painted
  at left:var(--strip-w) = 52px — exactly at sidebar edge.
  Shifts on zoom because sub-pixel boundary moves.

FIX: border-right: none on closed state.
  Restored only on .ai-pane.open.

LESSON: Always right-click → Inspect the visual artifact
  BEFORE writing any fix. This would have been a 5-min fix
  if done on attempt 1. 6 attempts = wrong diagnosis held.

CSS hygiene also cleaned (real bugs, not the visual cause):
  4604b7a: borderLeft → inset box-shadow on all tab/icon buttons
  2b1dac8: translucent section header background removed
    (${section.color}12 at 7% alpha caused sub-pixel rendering
    artifacts at non-100% zoom — separate issue from .ai-pane)

## Sidebar section toggle + scroll (9d172b3)
Bug 1 — Sections couldn't collapse:
  45165fc changed onClick to setOpen(true) always.
  Fix: if !effectiveOpen → open + navigate, else → close.

Bug 2 — Team section cut off, no scroll:
  overflow: undefined removed property from inline style.
  Fix: explicit height:100vh + overflowX:hidden + overflowY:auto
  when expanded. Collapsed keeps overflow:visible for hover labels.

## Sidebar scrollbar (781f50e)
Hidden at rest (scrollbar-width:none + webkit width 0).
Appears as 4px #E2E2E2 thumb on hover. Firefox + Chrome/Safari.

## ProteaAI wired to AI pill (cf35d1a, 5c86d39, eb7a83c)
ProteaAI was rendered as <ProteaAI /> — no props, permanently hidden.
The + pill dispatched nuai:open-ai but nothing listened.

Fix (cf35d1a):
  aiOpen state + nuai:open-ai addEventListener in TenantPortal
  ProteaAI receives: isOpen, onClose, navExpanded, tenantId,
    role (userRole), isHQ=false, tenantName
  isHQ=false → Chat panel only (no Dev/Query tabs)
  Panel knows: tenant, role, current tab, live Supabase context

Position fix (5c86d39):
  NavSidebar.css sets .ai-pane left:52px (HQ strip width)
  TenantPortal sidebar = 56px collapsed / 220px expanded
  PORTAL_CSS overrides: left:56px / .nav-open left:220px

Z-index fix (eb7a83c):
  NavSidebar.css .ai-pane { z-index:28 }
  PlatformBar icons painted on top of panel (green dot, ⚠, ✉, ○, 🔑)
  PORTAL_CSS: .ai-pane.open { z-index:200 !important }

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE (v191)
src/components/GlobalSearch.js          v1.0  ✅ (03d6b3a)
src/pages/TenantPortal.js               v4.2  ✅ (eb7a83c — all session changes)
src/components/hq/HRTimesheets.js       v1.3  ✅ Pay Calculator (b88b0b5)
src/components/NavSidebar.css                 ✅ .ai-pane border-right fix (37fca62)
src/components/hq/SmartInventory.js     v1.4  ✅ initialSearch/Category/Subcategory
src/components/AdminCustomerEngagement.js     ✅ initialSearch prop
src/components/hq/HRStaffDirectory.js   v1.1  ✅ initialSearch prop

LOCKED/PROTECTED — never modify:
src/components/PlatformBar.js               LOCKED
src/components/hq/LiveFXBar.js             PROTECTED
src/components/StockItemModal.js            LOCKED
src/components/hq/HQStock.js               PROTECTED

## CANNABIS_RETAIL_WATERFALL — FINAL STATE (v191)
Home          Dashboard
Inventory     Stock · Catalog
Ordering      Suppliers · Purchase Orders · Documents
Operations    Daily Trading · Cash-Up
Sales         POS Till · Pricing · Loyalty · Invoices
Customers     Profiles · QR Codes · Messaging
Reports       P&L · Expenses · Analytics · Reorder · Balance Sheet
Team          Staff · Roster · Timesheets · Leave · Contracts · Payroll · Calendar

## ROLE MAP (cannabis retail — unchanged)
staff / retailer  → Home · Sales · Customers
hr                → Home · Team
management        → Home · Inventory · Operations · Sales · Customers · Team
admin / owner     → All 8 sections
customer          → Home only

## AUTH — CONFIRMED
fivazg@gmail.com      role=admin  hq=true  op=true  Protea HQ  ✅
admin@medi-rec...     role=admin  hq=false          Medi Rec   ✅

## DB — STAFF/CONTRACT STATE
Protea Botanicals HQ (43b34c33):
  staff_profiles: 1 — Gerhardt Fivaz (f6f2ba40)
  employment_contracts: 1 — R150/hr ACTIVE (06 Apr – 29 Jun 2026) ✅
  timesheets: 1 — week 30 Mar 2026, 3.25h, Pay Calculator shows R487.50

Medi Recreational (b1bad266):
  HR tables: 0 rows — wizards show
  Inventory: 184 SKUs, sell_price R0 on most — P1 BLOCKER
  staff_profiles: 0 — no real staff added

## PROTEAAI STATE
Fully wired in TenantPortal as of eb7a83c:
  + pill → opens panel, ✕ closes
  Position: left:56px collapsed / left:220px expanded
  Z-index: 200 when open (above PlatformBar)
  isHQ=false → Chat panel only
  Loads live Supabase context (stock alerts, role, tab)
  Daily AI limit applies (resets midnight)

---

# NEXT PRIORITIES

## [P1] Sell price rapid-set — BLOCKS ALL REAL SALES
  184 Medi Rec SKUs at sell_price = R0
  POS cannot process a single real sale without prices
  Fast bulk pricing UI: table of R0 SKUs, inline edit, save all
  Target: Inventory → Stock → Pricing tab widget
  OR: dedicated rapid-set modal from Stock action queue

## [P2] POS till session flow — first real sale
  "No session" state is current blocker
  Yoco keys not configured (sk_test_ needed)
  Session start → product search → cart → checkout → cash/Yoco

## [P3] Dashboard action tiles — make them navigate
  Action tiles show alerts but don't navigate on click
  "View items →" should go to Stock filtered by out-of-stock
  "Open pricing →" should go to Pricing tab

## [P4] Search v2 — executable actions
  v1: find + navigate only
  v2: "Create new PO", "Add staff", "Mark approved"

---

# CRITICAL RULES

## RULE 0Q + LL-202 — GITHUB WRITE TOOLS BANNED FOR CLAUDE.AI
push_files, create_or_update_file = PERMANENTLY BANNED. VL-007 logged.

## PHANTOM LINE LESSON (new — from this session)
PL-01: Any visual artifact bug → right-click → Inspect in DevTools FIRST.
  Read the element class and source file. THEN write the fix.
  Never write a fix based on assumption of what element is causing it.
  This lesson cost 7 attempts and a full session of debugging time.

## Icon Rules
ICON-01: Navigation/UI → Lucide SVG
ICON-02: Onboarding wizards → emoji permitted
ICON-03: PlatformBar.js LOCKED
ICON-04: No new emoji in nav/buttons/tabs/breadcrumbs

## Code Rules
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
2. SESSION-STATE_v191.md  ← this file
3. SESSION-CORE_v2_11.md
4. VIOLATION_LOG_v1_1.md
5. REGISTRY_v3_2.md
6. MANIFEST_v3_0.md

---

*SESSION-STATE v191 · NuAi · April 6, 2026*
*ProteaAI wired · phantom line root cause found · sidebar polished*
*HEAD: eb7a83c · Branch: main*
*Next: sell price rapid-set (P1) → POS first sale (P2) → dashboard tiles (P3)*
