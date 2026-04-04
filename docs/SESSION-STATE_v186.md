# SESSION-STATE v186
## NuAi Platform — Protea Botanicals
## Date: April 5, 2026
## Session: v186 — Timesheets setup wizard + data cleanup

---

# LIVE HEAD
76b6383  feat(hr): Timesheets setup wizard — guided onboarding
a8cf725  feat(hr): Roster setup wizard — guided onboarding
5110090  feat(hr): Session C2 — Hours Monitor
0e8f38b  feat(hr): Session C1 — Shift Templates + Roster Builder
811c1e9  fix(hr): Year view — MiniMonth calendar grids

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v186)

## Data cleanup (Supabase MCP)
Gerhardt Fivaz existed in 4 tenants (test pollution).
Deleted from wrong tenants + cleaned junk contracts.
Clean state: 1 profile in Protea Botanicals HQ (f6f2ba40)
Contract needs recreating: R150/hr contractor — was on deleted Medi Rec profile

## HRTimesheets v1.2 — Setup wizard (commit 76b6383)
FILE: src/components/hq/HRTimesheets.js
2 targeted changes.

### TimesheetSetupWizard component (~230 lines)
Trigger: timesheets.length === 0 && !loading
Data-driven: disappears permanently once first timesheet exists
Pattern: same dark green header, step indicator, skip escape as Roster wizard
STATE 1 — No staff profiles:
  Header: "Add staff before tracking hours"
  Body: 3-step visual guide (Add staff → Come back → Add entries)
  Green nudge strip: "Go to the Staff tab to add your first team member"
  No dead end — user knows exactly what to do next
STATE 2 — Staff exist, no timesheets:
  Header: "Create your first timesheet" — Step 1 of 2
  Form: staff dropdown (pre-selected to first staff) + week date picker
  Period preview: auto-shows Mon–Sun date range from selected Monday
  Duplicate check: prevents creating duplicate for same staff + week
  "What happens next" explainer: preview of EntriesDrawer opening
  On create: INSERT timesheet → load() → setViewingEntries(newTs)
  (auto-opens EntriesDrawer immediately — step 2 happens without extra click)
  Skip: falls back to existing New Timesheet modal

### Wizard pattern — established standard
All setup wizards follow this spec:

  Dark green header (#1A3D2B) with step indicator
  Data-driven trigger (data.length === 0), no localStorage
  Sensible defaults pre-filled
  "Skip" escape always present
  onComplete = refetch data (not close)
  Wizard and normal UI mutually exclusive

Modules wizarded so far:
  HRRoster.js      ✅ a8cf725 — templates + roster
  HRTimesheets.js  ✅ 76b6383 — timesheet + entries
Modules to wizard next (priority order):
  Staff module     — first staff profile creation
  POS first sale   — open session → find product → ring → close
  Payroll          — first payroll run

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/components/hq/HRTimesheets.js    v1.2  ✅ LIVE (76b6383) — wizard added
src/components/hq/HRRoster.js        v1.1  ✅ LIVE (a8cf725) — wizard added
src/components/hq/HRCalendar.js      v1.4  ✅ LIVE (811c1e9)
src/components/hq/POSScreen.js       v2.0  ✅ LIVE (0ce48a1)
src/pages/HRDashboard.js             v1.3  ✅ LIVE (0e8f38b)
src/pages/TenantPortal.js            v2.7  ✅ LIVE (0e8f38b)
src/components/hq/LiveFXBar.js             PROTECTED — never modify
src/components/StockItemModal.js           LOCKED — never modify
src/components/PlatformBar.js             LOCKED — never modify

## DB — STAFF/CONTRACT STATE
Protea Botanicals HQ (43b34c33):
  staff_profiles: 1 row — Gerhardt Fivaz (f6f2ba40)
  employment_contracts: 0 active rows — R150 contract needs recreating
  timesheets: 0 → wizard shows on Timesheets tab
  shift_templates: 0 → wizard shows on Roster tab
Medi Recreational (b1bad266):
  All HR tables: 0 rows
  Inventory: 184 SKUs, sell_price R0 on most (P1 blocker)
ACTION NEEDED:
  Go to HR → Contracts → New Contract for Gerhardt Fivaz
  Set: Contractor · R150/hr · 8h/day · 5d/week

## DB — RLS (all HR tables confirmed clean)
All 9 HR tables have full HQ user access (is_hq_user() policies).
Pattern: SELECT + INSERT + UPDATE + DELETE for is_hq_user() on all tables.
Any new HR table must follow same pattern — see RULE RLS-HQ-01.

---

# NEXT PRIORITIES

## [P1] Recreate Gerhardt's contract
HR → Contracts → New Contract for Gerhardt Fivaz
Contractor · Start: 06 Apr 2026 · End: 27 Jul 2026
Hourly rate: R150/hr · 8h/day · 5d/week

## [P2] Owner actions — block first real sale
☐ Set sell_price on Medi SKUs (most R0 — hero items = LED equipment)
☐ Add real Medi Rec staff profiles (wizard will guide)
☐ Enable Supabase backups (Settings → Add-ons)
☐ Yoco signup → sk_test_ keys
☐ First real POS sale → verify loyalty + session + trading dashboard

## [P3] HR Session D — Shift Cost Calculator
Gate: hourly_rate_zar set on active contract (needs P1 above first)
Gate: real roster + timesheet entries with actual hours
Calculates: regular (≤45h) / OT 1.5× / Sunday 1.5× / PH 2× / night 1.33×

## [P4] Setup wizard — Staff module
Next wizard: first staff profile creation
State 1: no staff at all — step-by-step with form
Applies wizard pattern established this session

## [P5] Operational nudge bar (Layer 2)
Lightweight per-module query layer surfacing top 3 actions.
Clickable, jumps to relevant record/week/staff.
No AI — smart data reads surfaced as action prompts.

## [FUTURE]
NuAi AI Copilot (Layer 3) — post-core features
Decision C: Client 2 storefront — UNRESOLVED
Decision D: Yoco per-tenant vs platform — UNRESOLVED

---

# CRITICAL RULES

## Wizard Pattern Rules
WIZARD-01: Data-driven — shows when data.length === 0, never localStorage
WIZARD-02: Always offer sensible defaults (pre-filled, one-click)
WIZARD-03: Always include "Skip" escape
WIZARD-04: onComplete = refetch data (not close)
WIZARD-05: Dark green header (#1A3D2B) + step indicator = standard
WIZARD-06: Wizard and normal UI mutually exclusive in render tree
WIZARD-07: "No dependency" state handled separately from "no data" state
           (e.g. no staff → different message than no timesheets)

## RLS Rules
RLS-HQ-01: New table needing HQ access → 4 policies: SELECT/INSERT/UPDATE/DELETE
           USING/WITH CHECK (is_hq_user())
RLS-HQ-02: Confirmed clean tables: staff_profiles, employment_contracts,
           timesheets, timesheet_entries, hr_diary_entries, shift_schedules,
           shift_templates, roster_weeks, roster_assignments

## Code Rules
RULE 0Q:  GitHub write tools = 403 — never call them
LL-185:   Read file via GitHub MCP before any edit suggestion
LL-196:   fontWeight 300 / 9px labels / 0.3em letterSpacing BANNED
LL-198:   eod_cash_ups variance GENERATED, orders.total not total_amount
ROSTER-01–07, PH-01–04, DIARY-01–04, POS-01–05 — all apply (see v183/v182)

## File Safety
PlatformBar.js      LOCKED
LiveFXBar.js        PROTECTED
StockItemModal.js   LOCKED
HQStock.js          PROTECTED — read full file before any change

---

# THREE-CLAUDE ECOSYSTEM
Claude.ai   — reads via GitHub MCP + Supabase MCP, diagnoses, writes specs
Claude Code — implements, verifies, commits, pushes
GitHub MCP  — READ ONLY permanently (403 on writes)
Supabase MCP — schema verification, data queries, RLS fixes, migrations

---

# DOCUMENT READ ORDER FOR NEXT SESSION

NORTH-STAR_v1_0.md
SESSION-STATE_v186.md   ← this file
SESSION-CORE_v2_11.md
VIOLATION_LOG_v1_1.md
REGISTRY_v3_2.md
MANIFEST_v3_0.md


---

*SESSION-STATE v186 · NuAi · April 5, 2026*
*Setup wizard pattern established and applied to Roster + Timesheets*
*Data-driven, dark green header, skip escape, auto-onComplete = standard*
*HEAD: 76b6383 · Branch: main*
*Next: recreate Gerhardt contract → Staff wizard → Session D (cost calculator)*
