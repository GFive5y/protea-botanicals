# SESSION-STATE v189
## NuAi Platform — Protea Botanicals
## Date: April 5, 2026
## Session: v189 — UX polish sprint (icons, mobile, collapsible sidebar)

---

# LIVE HEAD
dd25e4d  feat(portal/sidebar): Collapsible sidebar with smart hover
5de5116  feat(portal/mobile): Hamburger drawer for mobile sidebar
8f85009  feat(icons): Replace all navigation emoji with Lucide SVG site-wide
0ebbe17  docs: VL-007 + LL-202 + SESSION-STATE v188 + SESSION-LOG
b47b426  feat(portal/auth): Role-based nav + Roster dedup

Branch: main
Vercel: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v189)

## Site-wide icon upgrade (8f85009)
All navigation emoji replaced with Lucide SVG across TenantPortal + HRDashboard.

TenantPortal.js:
  Imports: Home, Package, ShoppingCart, Activity, ShoppingBag,
           User, Users, TrendingUp, Briefcase, Layers, Truck
  CANNABIS_RETAIL_WATERFALL + WATERFALL: emoji→icon (Lucide component ref)
  SidebarSection: NavIcon renders with brand color (active) / gray (inactive)
  Breadcrumb: section icon inline with label

HRDashboard.js:
  Imports: Users, Calendar, Clock, Lock, FileText, Bell, Settings
  HROverview tiles: icon string→Icon component (tile.Icon)
  Quick actions: emoji label strings→Icon+label with flex layout

Rules locked:
  ICON-01: Navigation/UI → Lucide SVG only
           size: 14px sidebar sections, 15px KPI tiles, 11-12px buttons
           strokeWidth: 1.75 nav, 2.0 small buttons
           color: active=section.color, inactive=T.ink400/T.ink300
  ICON-02: Onboarding wizard content → emoji permitted (disappears post-setup)
  ICON-03: PlatformBar.js LOCKED — premium custom inline SVGs, never touch
  ICON-04: No new emoji in navigation, buttons, tabs, breadcrumbs, tiles

## Mobile hamburger drawer (5de5116)
Breakpoint: ≤768px sidebar hidden, hamburger button appears in breadcrumb header.
Tap → overlay drawer slides in with dark backdrop.
Same nav content, same Lucide icons, same role-based sections.
Backdrop tap closes · ✕ button closes · tab selection auto-closes (handleTabSelect).
PORTAL_CSS: @media queries injected via <style> tag inside component.
Desktop (≥769px): zero change — 220px sidebar always visible.

## Collapsible sidebar with smart hover (dd25e4d)
Desktop only. Mobile drawer unaffected.

Collapsed state (56px):
  Icon-only strip, section text hidden, header collapses to brand-green dot.
  Hover → icon bolds (strokeWidth 1.75→2.1) + section.color
  Hover → floating label appears to the right (position:absolute, z-index:400)
  Label: dark green bg (#1A3D2B), white text, uppercase, 11px
  Click any icon → expands sidebar (setSidebarCollapsed(false))
  overflow: visible enables label overflow past sidebar border

Expanded state (220px):
  All existing behavior preserved.
  Hover over section header → icon + label shift to section.color
  Background tint: section.color at 8% opacity on hover
  Chevron ▶ transitions to section.color on hover
  Smooth: transition: "color 0.15s" on all affected elements

Toggle:
  Chevron button in sidebar footer (‹ when expanded, › when collapsed)
  Width transition: 0.2s ease on collapse/expand
  Footer: conditional padding, tenant ID hidden when collapsed
  Header: collapses to brand-green dot (8px circle, T.accentMid)

New state in TenantPortal:
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

SidebarSection new props:
  collapsed={sidebarCollapsed}
  onExpand={() => setSidebarCollapsed(false)}

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/pages/TenantPortal.js         v4.0  ✅ dd25e4d
  — Collapsible sidebar + mobile drawer + Lucide icons + role-based nav
  — HR embedded, Ordering/Reports/Team, Roster deduped
src/pages/HRDashboard.js          v1.4  ✅ 8f85009
  — Lucide icons in tiles + quick actions
src/services/tenantService.js     v1.2  ✅ b47b426
  — role exposed in context value
src/components/hq/HRStaffDirectory.js  v1.1  ✅ d1a88d8
src/components/hq/HRTimesheets.js      v1.2  ✅ 76b6383
src/components/hq/HRRoster.js          v1.1  ✅ a8cf725
src/components/hq/HRCalendar.js        v1.4  ✅ 811c1e9
src/components/hq/POSScreen.js         v2.0  ✅ 0ce48a1
src/pages/HRDashboard.js               v1.4  ✅ 8f85009
src/components/hq/LiveFXBar.js              PROTECTED
src/components/StockItemModal.js            LOCKED
src/components/PlatformBar.js               LOCKED

## CANNABIS_RETAIL_WATERFALL — FINAL STATE
Home          Dashboard
Inventory     Stock · Smart Catalog
Ordering      Suppliers · Purchase Orders · Documents
Daily Ops     Daily Trading · Cash-Up
Sales         POS Till · Pricing · Loyalty · Invoices
Customers     Customer 360 · QR Codes · Messaging
Reports       P&L · Expenses · Analytics · Reorder · Balance Sheet
Team          Staff · Roster · Timesheets · Leave · Contracts · Payroll · Calendar

## ROLE MAP (cannabis retail)
staff / retailer  → Home · Sales (POS Till) · Customers
hr                → Home · Team
management        → Home · Inventory · Daily Ops · Sales · Customers · Team
admin / owner     → Everything (all 8 sections)
customer          → Home only

## UX/UI TRACK — STATUS
✅ HR navigation context break — fixed (d32a5a2)
✅ Floor staff terminology — fixed (d32a5a2)
✅ Full HR suite in TenantPortal — done (d32a5a2)
✅ Role-based navigation — live (b47b426)
✅ Roster deduplication — fixed (b47b426)
✅ Auth roles corrected in Supabase — done
✅ Lucide SVG icons site-wide — done (8f85009)
✅ Mobile sidebar hamburger drawer — done (5de5116)
✅ Collapsible sidebar with smart hover — done (dd25e4d)
⏳ Global search (command palette) — not built
⏳ Export buttons (P&L, Timesheets, Analytics) — not built
⏳ HQ sidebar emoji → Lucide — deferred (focus: Medi Rec)
⏳ Dark mode — future

## AUTH / USER_PROFILES — CONFIRMED STATE
fivazg@gmail.com      c64cda97  role=admin  hq=true  op=true  Protea HQ  ✅
admin@protea.dev      3e47ab57  role=admin  hq=true  op=true  Pure PTV   ✅
admin@medi...         283c7fe6  role=admin  hq=false          Medi Rec   ✅
customer@protea.dev   a129ca6f  role=customer                 Protea HQ  ✅
wholesale@protea.dev  d663185a  role=retailer                 Protea HQ  ✅
shopadmin@protea.dev  5b28dc1b  role=admin                    TEST SHOP  ✅
friedelf123@gmail.com 45570cd0  NO PROFILE ROW — low risk
purepuffbd@outlook.com 3ea76fe3 NO PROFILE ROW — low risk

## DB — STAFF/CONTRACT STATE
Protea Botanicals HQ (43b34c33):
  staff_profiles: 1 — Gerhardt Fivaz (f6f2ba40)
  employment_contracts: 0 — R150/hr contract NEEDS RECREATING (P1 OWNER ACTION)
  shift_templates: 0 → Roster wizard shows
  timesheets: 0 → Timesheets wizard shows
Medi Recreational (b1bad266):
  All HR tables: 0 rows — all 3 wizards will show
  Inventory: 184 SKUs, sell_price R0 on most (P1 blocker for real sales)

---

# NEXT PRIORITIES — MEDI REC FOCUS

## [P1] Recreate Gerhardt's contract (OWNER ACTION — 2 minutes)
HR → Team → Contracts → New Contract for Gerhardt Fivaz
Type: Contractor
Start: 06 Apr 2026 · End: 27 Jul 2026
Rate: R150/hr · 8h/day · 5d/week
Gate: unlocks HR Session D (shift cost calculator)

## [P2] Owner actions — first real Medi Rec sale
☐ Set sell_price on Medi Rec SKUs (most at R0)
☐ Add real Medi Rec staff profiles (Team → Staff wizard guides this)
☐ Enable Supabase backups (Supabase dashboard → Settings → Add-ons)
☐ Yoco signup → sk_test_ keys
☐ First real POS sale → verify loyalty + session + trading dashboard

## [P3] HR Session D — Shift Cost Calculator
Gate: Gerhardt's R150/hr contract must exist
Gate: Real roster + timesheet entries
Calculates: regular (≤45h) / OT 1.5× / Sunday 1.5× / PH 2× / night 1.33×
BCEA compliant. SA Labour Law. ZAR output.

## [P4] Global search — command palette
⌘K / Ctrl+K — searches SKUs, staff, orders, customers
Single component renders over the app
Reads from Supabase across 4 tables
Most visible enterprise signal missing from system
Medium complexity — ~200 lines, new component

## [P5] Export buttons
P&L, Timesheets, Analytics → CSV download
SmartInventory SC-09 pattern already exists — copy it
Low complexity, high credibility for finance/HR users

## [FUTURE — NOT THIS SPRINT]
HQ sidebar emoji → Lucide (deferred, focus is Medi Rec)
NuAi AI Copilot (Layer 3)
Decision C: Medi Rec customer-facing storefront — UNRESOLVED
Decision D: Yoco per-tenant vs platform — UNRESOLVED
Dark mode

---

# CRITICAL RULES

## RULE 0Q + LL-202 — GITHUB WRITE TOOLS BANNED FOR CLAUDE.AI
push_files, create_or_update_file = PERMANENTLY BANNED for Claude.ai
No exceptions: code files, doc files, all file types
Available in tool list ≠ permitted
VL-007 logged (April 5, 2026) — owner intercepted before damage
If Claude.ai catches itself about to call a write tool:
  STOP. State the violation. Write VL entry. Give Claude Code the spec.

## Icon Rules (established this session)
ICON-01: Navigation/UI → Lucide SVG (lucide-react installed)
         14px sections, 15px tiles, 11-12px buttons, strokeWidth 1.75/2.0
ICON-02: Onboarding wizard content → emoji permitted (warm, disappears)
ICON-03: PlatformBar.js LOCKED — premium custom SVGs, never replace
ICON-04: No new emoji in navigation, buttons, tabs, breadcrumbs, tiles

## Wizard Pattern
WIZARD-01: Data-driven (data.length === 0), never localStorage
WIZARD-02: Sensible defaults
WIZARD-03: Always include "Skip" escape
WIZARD-04: onComplete = refetch
WIZARD-05: Dark green header (#1A3D2B)
WIZARD-06: Wizard and normal UI mutually exclusive
WIZARD-07: No-dependency state ≠ no-data state

## Code Rules
LL-056:   scan_logs NO tenant_id column
LL-059:   user_profiles.loyalty_points = operational truth
LL-120:   All Anthropic API calls via ai-copilot EF — never direct React
LL-132:   role values: customer|admin|retailer|staff|hr|management
          'manager'/'operator' = silent constraint fail
LL-178:   Never change renderTab without loss list + owner confirm
LL-185:   Read file via GitHub MCP before any edit
LL-196:   fontWeight 300 / 9px labels / 0.3em letterSpacing BANNED
LL-198:   eod_cash_ups variance GENERATED, orders.total not total_amount
LL-200:   ZERO cannabis refs on public/Yoco pages
LL-201:   Yoco SDK = Android/iOS native only
LL-202:   GitHub write tools banned for Claude.ai (VL-007)
RLS-HQ-01/02: HR table policies confirmed clean
POS-01–05, ROSTER-01–06, PH-03, DIARY-01 — all active

## File Safety
PlatformBar.js      LOCKED
LiveFXBar.js        PROTECTED
StockItemModal.js   LOCKED
HQStock.js          PROTECTED

---

# THREE-CLAUDE ECOSYSTEM
Claude.ai   — reads GitHub MCP + Supabase MCP, diagnoses, writes specs
             NEVER writes to GitHub (RULE 0Q + LL-202)
Claude Code — ALL repo writes, commits, pushes
GitHub MCP  — READ ONLY for Claude.ai
Supabase MCP — schema, data, RLS, migrations

---

# DOCUMENT READ ORDER FOR NEXT SESSION

NORTH-STAR_v1_0.md
SESSION-STATE_v189.md   ← this file
SESSION-CORE_v2_11.md
VIOLATION_LOG_v1_1.md
REGISTRY_v3_2.md
MANIFEST_v3_0.md


---
*SESSION-STATE v189 · NuAi · April 5, 2026*
*UX polish sprint complete — Lucide icons, mobile drawer, collapsible sidebar*
*TenantPortal.js v4.0 · HRDashboard.js v1.4*
*HEAD: dd25e4d · Branch: main · Focus: Medi Rec cannabis retail polish*
