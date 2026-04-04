# SESSION-STATE v185
## NuAi Platform — Protea Botanicals
## Date: April 5, 2026
## Session: v185 — RLS fixes + Roster setup wizard

---

# LIVE HEAD
a8cf725  feat(hr): Roster setup wizard — guided onboarding for first-time setup
5110090  feat(hr): Session C2 — Hours Monitor sub-tab in HRTimesheets
0e8f38b  feat(hr): Session C1 — Shift Templates + Roster Builder
811c1e9  fix(hr): Year view — MiniMonth calendar grids
668e154  feat(hr): Session A+ + B — diary feature

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v185)

## RLS Fixes — HR module (Supabase MCP, no code change)
ROOT CAUSE: HQ users (hq_access=true) manage tenants they don't "belong to".
Their user_profiles.tenant_id = HQ org (43b34c33), but they manage
data in other tenants (b1bad266, f8ff8d07 etc).
The standard RLS template (tenant_id = user_profiles.tenant_id)
blocked ALL cross-tenant operations for HQ users, even though they
have full management access to those tenants.
PATTERN: Every table created with the standard RLS template had this gap.
This was a systemic issue across the entire HR module.
TABLES FIXED — HQ user policies added (SELECT + INSERT + UPDATE + DELETE):
  employment_contracts  ✅ (3 policies: insert + update + delete)
  shift_templates       ✅ (4 policies)
  roster_weeks          ✅ (4 policies)
  roster_assignments    ✅ (4 policies)
  timesheets            ✅ (3 policies: insert + update + delete — SELECT existed)
  timesheet_entries     ✅ (3 policies: insert + update + delete — SELECT existed)
  hr_diary_entries      ✅ (4 policies — nothing existed)
  shift_schedules       ✅ (4 policies — nothing existed)
  staff_profiles        ✅ (already had ALL policy — was fine)
POLICY PATTERN USED: is_hq_user() — checks hq_access=true in user_profiles
  SELECT: USING (is_hq_user())
  INSERT: WITH CHECK (is_hq_user())
  UPDATE: USING (is_hq_user())
  DELETE: USING (is_hq_user())
RULE ADDED: RLS-HQ-01 — any new table that HQ users touch needs 4 HQ policies

## Gerhardt Fivaz contract created
Tenant: Protea Botanicals HQ (43b34c33)
Contract type: Contractor
Start: 06 Apr 2026 | End: 27 Jul 2026
Hourly rate: R150.00/hr
Hours/day: 8 | Days/week: 5
NOTE: Gerhardt Fivaz exists in 4 tenants (data pollution from testing):
  43b34c33 Protea Botanicals HQ ← correct (x2, one duplicate)
  f8ff8d07 Pure Premium THC Vapes
  b1bad266 Medi Recreational
CLEANUP NEEDED: Delete test/duplicate staff_profiles rows from wrong tenants

## HRRoster v1.1 — Setup Wizard (commit a8cf725)
FILE: src/components/hq/HRRoster.js
5 targeted changes. No full rewrite.

### Changes
Change 1 — AssignDropdown: "Close" → "✕"
  Was confusing — "Close" is also a common shift template name
  Now shows "✕" when the dropdown is open
Change 2 — DEFAULT_TEMPLATES constant (4 dispensary shifts):
  Opening   08:00–16:00  30min break  7.5h  #1A3D2B
  Mid Shift 10:00–18:00  30min break  7.5h  #2D6A4F
  Closing   12:00–20:00  30min break  7.5h  #1E3A5F
  Full Day  08:00–17:00  60min break  8.0h  #374151
Change 3 — RosterSetupWizard component:
  Shown when templates.length === 0 (data-driven, no localStorage)
  Dark green header with step indicator (Step 1 of 2)
  4 default template cards — toggleable (click to select/deselect)
  Each card has inline time editors (start/end/break editable in-place)
  Hours calculated live per card (Xh net)
  Custom shift add-on: "+ Add a custom shift" expands a mini form
  "Skip — I'll set this up later" option bypasses wizard
  Save button: "Save X template(s) and continue →"
  On save: bulk INSERT to shift_templates → calls fetchBase() → wizard disappears
Change 4 — Wizard display logic in main component:
  Shows: !readOnly && templates.length === 0
  First-assign nudge strip: shown when templates.length > 0 && assignments.length === 0
  Nudge says "Click + Assign on any cell" — disappears once first assignment made
Change 5 — Conditional wrapper:
  Normal roster UI wrapped in <> </> that only renders when templates exist
  Wizard and normal UI are mutually exclusive — clean state machine

### Setup wizard pattern — for reuse
This wizard pattern is now the standard for first-time module setup.
Next modules to apply it to:

  Timesheets: first timesheet creation walkthrough
  POS: first sale walkthrough (open session → find customer → ring sale → cash up)
  Payroll: first payroll run walkthrough
  Staff: first staff profile creation

Pattern rules:

  Wizard shows when data.length === 0 (data-driven, not stored in state)
  Wizard disappears permanently once data exists
  Always offer sensible defaults (one-click seed)
  Always include "Skip" escape
  Always use dark green header with step indicator
  onComplete = refetch the data (not close — let data drive the state)


---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/components/hq/HRRoster.js               v1.1  ✅ LIVE (a8cf725) — setup wizard
src/components/hq/HRTimesheets.js           v1.1  ✅ LIVE (5110090)
src/components/hq/HRCalendar.js             v1.4  ✅ LIVE (811c1e9)
src/components/hq/POSScreen.js              v2.0  ✅ LIVE (0ce48a1)
src/pages/HRDashboard.js                    v1.3  ✅ LIVE (0e8f38b)
src/pages/TenantPortal.js                   v2.7  ✅ LIVE (0e8f38b)
src/components/hq/LiveFXBar.js                    PROTECTED — never modify
src/components/StockItemModal.js                  LOCKED — never modify
src/components/PlatformBar.js                     LOCKED — never modify

## DB — RLS POLICY STATE (fully verified this session)
All HR tables now have complete HQ user write access via is_hq_user() policies.
No further RLS gaps known in the HR module.
is_hq_user() = SELECT hq_access FROM user_profiles WHERE id = auth.uid()
is_admin_user() = role = 'admin'
is_hr_user() = role = 'hr'
current_user_tenant_id() = tenant_id FROM user_profiles WHERE id = auth.uid()
CAUTION: Any new table that HQ users need to read/write requires 4 HQ policies.
Do not rely on the standard tenant_id check alone for HQ-managed tables.

## DB — HR SCHEMA (complete)
staff_profiles:       NO hourly_rate — use employment_contracts.hourly_rate_zar
employment_contracts: hourly_rate_zar ✅ (Gerhardt: R150/hr)
                      gross_salary_zar, standard_hours_per_day, standard_days_per_week
timesheets:           total_hours, regular_hours, overtime_hours, public_holiday_hours
timesheet_entries:    clock_in, clock_out, hours_worked, late_flag, absent_flag
shift_schedules:      works_[mon-sun] booleans, shift_start/end, grace_minutes
public_holidays:      2025(13) 2026(13) 2027(14) rows — tenant_id=null global
hr_diary_entries:     entry_type: note|meeting|reminder|announcement|task
shift_templates:      section (10 options), color, shift_start/end, break_minutes
roster_weeks:         week_start (Monday), status: draft|published|locked
roster_assignments:   UNIQUE(roster_week_id, staff_profile_id, work_date)

## TENANT DATA STATE
Protea Botanicals HQ  43b34c33:
  staff_profiles: 2 rows (Gerhardt Fivaz x2 — duplicate to clean)
  employment_contracts: 3 rows (1 active — Gerhardt R150/hr)
  timesheets: 1 | entries: 2
  shift_templates: 0 — wizard will appear on Roster
Medi Recreational  b1bad266:
  All HR tables: 0 rows — owner needs to add real staff
  Inventory: 184 SKUs, sell_price R0 on most (P1 blocker)
DATA POLLUTION — needs cleanup:
  Gerhardt Fivaz exists in 4 tenants (43b34c33 x2, f8ff8d07, b1bad266)
  These are test rows from session setup — should be deleted from wrong tenants
  Action: DELETE FROM staff_profiles WHERE full_name ILIKE '%gerhardt%'
          AND tenant_id != '43b34c33-6864-4f02-98dd-df1d340475c3'

---

# NEXT PRIORITIES

## [P1] Data cleanup
☐ Delete Gerhardt duplicate from wrong tenants (f8ff8d07, b1bad266, duplicate in 43b34c33)
☐ Delete the roster_week in Pure PTV (f8ff8d07) created during testing

## [P2] HR Session D — Shift Cost Calculator
Gate: hourly_rate_zar set ✅ (Gerhardt R150/hr)
Gate: real roster + timesheet entries needed for meaningful output
Calculates: regular / OT (1.5×) / Sunday (1.5×) / PH (2×) / night (1.33×)

## [P3] Owner actions — block first real sale
☐ Set sell_price on Medi SKUs
☐ Enable Supabase backups
☐ Yoco signup → sk_test_ keys
☐ Add real Medi Rec staff profiles

## [P4] Setup wizard pattern — next modules
Priority order: Timesheets → POS first sale → Payroll
Each follows same pattern: data-driven, defaults offered, skip option

## [P5] Operational nudge bar (Layer 2 of UX roadmap)
Lightweight query layer surfacing top 3 actions per module.
Clickable, jumps to relevant record. No AI — just smart data reads.

## [FUTURE]
Decision C: Client 2 storefront — UNRESOLVED
Decision D: Yoco per-tenant vs platform — UNRESOLVED
NuAi AI Copilot (Layer 3) — post-core-features

---

# CRITICAL RULES

## RLS Rules (new v185)
RLS-HQ-01: Any table HQ users read/write needs 4 HQ policies (SELECT/INSERT/UPDATE/DELETE)
  Pattern: CREATE POLICY "X_hq_[cmd]" ON X FOR [CMD] USING/WITH CHECK (is_hq_user())
  Never rely on tenant_id = current_user_tenant_id() alone for HQ-managed tables
RLS-HQ-02: Tables confirmed with full HQ coverage (as of v185):
  staff_profiles, employment_contracts, timesheets, timesheet_entries,
  hr_diary_entries, shift_schedules, shift_templates, roster_weeks, roster_assignments

## Setup Wizard Pattern Rules (new v185)
WIZARD-01: Wizard is data-driven — shows when data.length === 0, never stored in localStorage
WIZARD-02: Always offer sensible defaults (one-click seed)
WIZARD-03: Always include a "Skip" escape hatch
WIZARD-04: onComplete = refetch data (not close — let the data drive state change)
WIZARD-05: Dark green header (#1A3D2B) with step indicator is the standard pattern
WIZARD-06: Wizard and normal UI must be mutually exclusive in the render tree

## Code Rules
RULE 0Q:  GitHub write tools = 403 — never call them
LL-185:   Read file via GitHub MCP before any edit suggestion
LL-196:   fontWeight 300 / 9px labels / 0.3em letterSpacing BANNED
LL-198:   eod_cash_ups variance GENERATED, orders.total not total_amount
ROSTER-01 through ROSTER-07 — all apply (see v183)
PH-01 through PH-04 — all apply
DIARY-01 through DIARY-04 — all apply
POS-01 through POS-05 — all apply

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
SESSION-STATE_v185.md   ← this file
SESSION-CORE_v2_11.md
VIOLATION_LOG_v1_1.md
REGISTRY_v3_2.md
MANIFEST_v3_0.md


---

*SESSION-STATE v185 · NuAi · April 5, 2026*
*RLS fixed across entire HR module — 9 tables now have full HQ user access*
*HRRoster v1.1 — setup wizard live, data-driven, disappears once templates exist*
*Setup wizard pattern established — reuse in Timesheets, POS, Payroll*
*HEAD: a8cf725 · Branch: main*
*Next: data cleanup (Gerhardt duplicates) → Session D (shift calculator) → owner actions*
