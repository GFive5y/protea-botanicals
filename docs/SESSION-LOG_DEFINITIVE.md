# SESSION-LOG_DEFINITIVE.md — NuAi Platform
## Append-only. One block per session prepended at the TOP. Never delete old entries.
## Permanent institutional memory — survives SESSION-STATE rotation.
## Git history also preserves all deleted SESSION-STATE files permanently.

---

## v191 — ProteaAI wired + phantom line root cause + sidebar polish · April 6, 2026
HEAD: eb7a83c

WHAT CHANGED (post v190 docs at d4c55c7):
  4604b7a — CSS hygiene: borderLeft → inset box-shadow on all buttons
  2b1dac8 — CSS hygiene: translucent section header bg removed
  37fca62 — PHANTOM LINE ROOT CAUSE FIXED:
    Source: NavSidebar.css .ai-pane border-right:0.5px at width:0
    position:fixed panel painted border at sidebar edge when closed
    Fix: border-right:none closed, restored on .ai-pane.open
    Lesson: DevTools Inspect FIRST. 7 attempts lost to wrong diagnosis.
  9d172b3 — Section toggle restored + sidebar scroll fixed:
    Toggle: onClick broken by 45165fc (always open) → restored
    Scroll: height:100vh + explicit overflowX/Y when expanded
  781f50e — Sidebar scrollbar hidden, appears 4px on hover
  cf35d1a — ProteaAI wired to + pill:
    aiOpen state + nuai:open-ai listener in TenantPortal
    Props: isOpen, onClose, navExpanded, tenantId, role, isHQ=false
  5c86d39 — ProteaAI position fixed:
    left:52px (HQ) → left:56px/220px (TenantPortal collapsed/expanded)
  eb7a83c — ProteaAI z-index fixed:
    z-index:28 → z-index:200 when open (above PlatformBar icons)

---

## v190 — UX shell overhaul (search, sidebar, breadcrumb, taxonomy) · April 6, 2026
HEAD: 5b2b04a
WHAT CHANGED:
  b88b0b5 — HR Session D Pay Calculator:
    SA BCEA rules (regular/OT/Sunday/PH), summary cards + daily table + gross total
  03d6b3a — Global command palette (WP-SEARCH v1.0):
    GlobalSearch.js ~580 lines, 8 categories, role-based, Ctrl+K, 250ms debounce
    Pre-filtered navigation: product→catalog, staff→staff, customer→customers
  ae04b28 + f5da6b0 — Search trigger reposition:
    Removed standalone bar, trigger now in breadcrumb right side
    Wider pill (260px), clickable Esc button
  27ee2c0 — Sidebar ✕ collapse + account/AI pills:
    Removed edge strip, ✕ in header, + AI pill + user initials at bottom
  156a7a0 — Breadcrumb Home link + clickable section:
    Home › Section › Tab path, all navigable
  45165fc — Taxonomy rename + section header click:
    Sales & Customers→Sales, Customer 360→Profiles, Smart Catalog→Catalog,
    Daily Operations→Operations. Section headers navigate to first tab.
  81a25d7 + 5b2b04a — Phantom line fixes:
    borderLeft transparent→none in expanded + collapsed modes

---

## v189 — UX polish sprint (icons, mobile, collapsible sidebar) · April 5, 2026
HEAD: dd25e4d

WHAT CHANGED:
  8f85009 — Site-wide Lucide SVG icon upgrade:
    TenantPortal.js: all WATERFALL emoji→Lucide refs, SidebarSection
    renders NavIcon with active/inactive color, breadcrumb icon inline
    HRDashboard.js: tiles (tile.Icon) + quick actions (Icon+label flex)
    Rules locked: ICON-01–04 (nav=Lucide, onboarding=emoji, PlatformBar=LOCKED)
  5de5116 — Mobile hamburger drawer (≤768px):
    Sidebar hides, hamburger in header, overlay drawer, backdrop/✕/tab-select closes
    PORTAL_CSS: @media query injection, desktop zero change
  dd25e4d — Collapsible sidebar with smart hover (desktop only):
    56px collapsed: icon-only, hover=label floats right + brand color + bolds
    220px expanded: hover=section color shift on icon+label+chevron+bg tint
    Toggle: chevron button in footer, 0.2s width transition
    Header: collapses to brand-green dot
    overflow:visible when collapsed (enables hover label overflow)

ICON STANDARD ESTABLISHED:
  Lucide SVG for all UI/navigation. Emoji only for onboarding wizards.
  PlatformBar custom SVGs remain LOCKED — premium hand-crafted icons.

DEFERRED: HQ sidebar emoji (focus = Medi Rec cannabis retail polish)

---

## v188 — UX/UI overhaul + role-based nav · April 5, 2026
HEAD: b47b426
WHAT CHANGED:
  TenantPortal.js v3.0 (d32a5a2 + b47b426):
    HR navigation context break fixed — full HR suite embedded inline
    "Ordering" replaces "Procurement" · "Reports" replaces "Intelligence"
    Team section: 7 tabs (Staff, Roster, Timesheets, Leave, Contracts, Payroll, Calendar)
    Imports: HRLeave, HRTimesheets, HRContracts, HRCalendar, HRPayroll added
    Role-based nav: const role="owner" removed, driven by user_profiles.role
    CANNABIS_ROLE_SECTIONS: staff/hr/management/admin/retailer/customer tiers
    Roster removed from Daily Operations (now only in Team)
  tenantService.js v1.2 (b47b426):
    profile.role now stored in userRole state + exposed as role in context
    (was fetched from DB but silently dropped — never reached components)
  DB (Supabase MCP, no code):
    fivazg@gmail.com: role customer→admin, hq_access false→true, is_operator false→true
    Medi Rec admin: full_name null→"Medi Admin"
VIOLATION:
  VL-007: Claude.ai called GitHub:push_files (write tool) — RULE 0Q violation
  Owner intercepted before commit landed. Zero repo damage.
  LL-202 added: GitHub write tools banned for Claude.ai, no exceptions.

---

## v187 — Staff wizard + doc audit + archive · April 5, 2026
HEAD: [this commit SHA]
WHAT CHANGED:
HRStaffDirectory.js: StaffSetupWizard added
  Dark green header + UNLOCKS pills (Timesheets/Roster/Contracts/Leave/Payroll)
  NEEDS grid (8 info cards: required vs optional fields)
  Tip strip: "You only need a name to get started"
  CTA opens existing HRStaffProfile modal (no duplicate form)
  Data-driven: shows when staff.length === 0, disappears permanently once staff exist
HRTimesheets.js v1.2 (76b6383): TimesheetSetupWizard
HRRoster.js v1.1 (a8cf725): RosterSetupWizard
AUDIT: Full git history reviewed (v177–v186). Two dropped rules found and restored.
  LL-124 → LL-200: cannabis refs banned on public/Yoco pages
  LL-125 → LL-201: Yoco SDK = Android/iOS native only
DOCS ADDED TO GIT (were project-knowledge-only, now permanent):
  docs/LL-ARCHIVE_v1_0.md   — LL-001 through LL-173 from SESSION-CORE v2.3
  docs/MASTER-AUDIT_v1_0.md — full 30-doc system audit from session v177
RLS FIXES (Supabase MCP, no code):
  9 HR tables: added is_hq_user() policies (SELECT/INSERT/UPDATE/DELETE)
  Root: HQ users manage cross-tenant data, standard tenant_id check blocked writes
DATA: Gerhardt Fivaz cleaned from 4 tenants → 1 profile in HQ (f6f2ba40)
  R150/hr contractor contract needs recreating (deleted with Medi Rec test profile)
RULES ADDED: WIZARD-01–07, RLS-HQ-01–02, LL-200, LL-201, POS-01–05 (restored full text)

---

## v186 — Timesheets wizard + data cleanup · April 5, 2026
HEAD: 76b6383
HRTimesheets.js v1.2: TimesheetSetupWizard
  No staff state: 3-step guide + Staff tab nudge
  Staff exist state: staff dropdown + week picker → creates timesheet
  On create: auto-opens EntriesDrawer (step 2 without extra click)
Data: Gerhardt Fivaz cleaned (4 tenants → 1)

---

## v185 — RLS fixes + Roster wizard · April 5, 2026
HEAD: a8cf725
HRRoster.js v1.1: RosterSetupWizard (4 default templates, toggleable cards)
RLS: 9 HR tables — is_hq_user() policies added
Root cause: standard tenant_id check blocked HQ cross-tenant writes

---

## v184 — HR Session C2 Hours Monitor · April 5, 2026
HEAD: 5110090
HRTimesheets.js v1.1: HoursMonitor sub-tab
Scheduled vs actual hours per week, KPI strip, 5 empty states

---

## v183 — HR Session C1 Roster Builder · April 5, 2026
HEAD: 0e8f38b
HRRoster.js v1.0 (940 lines) — new file
shift_templates, roster_weeks, roster_assignments tables created
Publish/Lock workflow, OT flag >45h

---

## v182 — HR Sessions A+ and B · April 4, 2026
HEAD: 668e154
HRCalendar.js v1.4: MiniMonth + diary (hr_diary_entries table)

---

## v181 — HR Session A year view + holidays · April 4, 2026
HEAD: d265780
HRCalendar.js v1.3: year view, holiday query bug fixed (.or() not .eq())
SA public holidays 2027 seeded (14 rows)

---

## v180 — POSScreen v2 + ExpenseManager fix · April 4, 2026
HEAD: 0ce48a1
POSScreen.js v2.0: customer lookup, loyalty (10pts/R1), cash change, session badge
ExpenseManager ✕ button: onClose prop missing → navigates to P&L tab

---

## v153–v179 — March/April 2026
Key work: WP-VISUAL Phases A–N, HR Dashboard, SmartInventory v1.5 drag fix,
TradingDashboard v3.0, EODCashUp, POSScreen v1.0, demo seed system (2721 rows).
Detail: docs/SESSION-LOG_updated.md (covers to v152) + git history.

---

*SESSION-LOG_DEFINITIVE.md — NuAi Platform*
*Started: April 5, 2026 (v180 onwards)*
*Previous log: docs/SESSION-LOG_updated.md (v152 and earlier)*
*Git history: complete backup of every SESSION-STATE ever written*
