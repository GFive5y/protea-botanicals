# SESSION-STATE v183
## NuAi Platform — Protea Botanicals
## Date: April 5, 2026
## Session: v183 — HR Session C1 (Roster Builder) + year view mini calendar fix

---

# LIVE HEAD
0e8f38b  feat(hr): Session C1 — Shift Templates + Roster Builder
811c1e9  fix(hr): Year view — replace dot counts with MiniMonth calendar grids
668e154  feat(hr): Session A+ + B — mini calendar year view + diary feature
d265780  feat(hr): Session A — year view + holiday query fix + 2027 holidays seeded
0ce48a1  feat(pos): POSScreen v2 — customer lookup, loyalty points, cash change

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v183)

## HR Session C1 — Roster Builder (commit 0e8f38b)
NEW FILE: src/components/hq/HRRoster.js v1.0 — 940 lines
EDITED:   src/pages/HRDashboard.js — Roster tab added
EDITED:   src/pages/TenantPortal.js — Team Roster in Daily Operations (both waterfalls)

### New DB tables (created via Supabase MCP)
shift_templates:
  id, tenant_id, name, description
  shift_start (time), shift_end (time), break_minutes (int, default 30)
  section (text) — General|Budtender|Manager|Cashier|Coffee Shop|Restaurant|
                   Headshop|Growshop|Security|Cleaner
  color (hex), is_active, created_by, created_at, updated_at
  RLS: enabled (4 policies)
roster_weeks:
  id, tenant_id, week_start (date — always Monday)
  status: draft | published | locked (CHECK constraint)
  notes, published_by, published_at, created_at, updated_at
  UNIQUE (tenant_id, week_start)
  RLS: enabled (4 policies)
roster_assignments:
  id, tenant_id
  roster_week_id (FK → roster_weeks ON DELETE CASCADE)
  staff_profile_id (FK → staff_profiles ON DELETE CASCADE)
  work_date (date)
  shift_template_id (FK → shift_templates, nullable — allows custom override)
  shift_start (time, nullable — overrides template)
  shift_end   (time, nullable — overrides template)
  break_minutes (int, default 30)
  section (text, nullable)
  is_off (boolean, NOT NULL, default false)
  notes, created_at, updated_at
  UNIQUE (roster_week_id, staff_profile_id, work_date)
  INDEX: roster_assignments_week_idx, roster_assignments_staff_idx
  RLS: enabled (4 policies)

### HRRoster.js — features
Sub-tabs: 📅 Roster | 🔧 Shift Templates
TEMPLATES TAB:
  Create/edit/delete named shift patterns
  Fields: name, section (10 options), start/end time, break, description, colour
  Net hours calculated live: (end - start - break) displayed in green banner
  8 colour swatches: green/teal/navy/amber/red/purple/grey/blue
  TemplateCard: shows name, times, break, hours, section, edit/delete actions
ROSTER TAB:
  Weekly grid: Mon–Sun across top, active staff down left side
  Week navigation: ‹ prev / today / next › with week label
  Status badge: draft | published | locked per week
  Auto-create: clicking prev/next week creates roster_week record on demand
  CELL INTERACTION (draft/published only):
    Empty cell: "+ Assign" button → dropdown of templates + "🚫 Day Off"
    Assigned cell: shows template name, time, section, "✕ clear" link
    Day Off cell: shows "Day Off" label with ✕ to clear
    Locked week: read-only, no editing
  PUBLIC HOLIDAY DETECTION:
    Cross-checks public_holidays table for the active week
    Holiday columns highlighted amber in grid header
    Holiday banner: lists holiday names for the week with "2× rate" warning
    Holiday dropdown shows "★ Public holiday — 2× rate applies" notice
  HOURS COLUMN:
    Live sum of scheduled hours per staff member for the week
    Green if ≤45h, red + "OT" label if >45h (SA overtime threshold)
  GENERATE FROM SCHEDULES:
    Appears when roster has zero assignments
    Reads shift_schedules table (existing fixed patterns)
    Auto-populates roster_assignments from works_[day] booleans
    Works with effective_from/effective_to date ranges
  PUBLISH/LOCK WORKFLOW:
    Draft → "📢 Publish Roster" → published
    Published → "🔒 Lock Roster" → locked (grid becomes read-only)
  WEEK HISTORY:
    Shows last 8 roster weeks as quick-switch buttons
  readOnly prop:
    false (default): full edit access — both HRDashboard and TenantPortal
    true: view-only grid — for future staff-facing view

### Wiring
HRDashboard:    Roster tab added to TABS array + render case
TenantPortal:   'roster' tab added to operations section in CANNABIS_RETAIL_WATERFALL
                Also added to main WATERFALL (both profiles)
                render case: case "roster" → <HRRoster tenantId={tenantId} readOnly={false} />

### Design decisions confirmed
Rotating patterns: handled by creating new roster weeks with different assignments
  (no separate data model needed — flexibility is in the weekly assignment, not in a pattern cycle)
Fixed patterns: "⚡ Generate from schedules" reads shift_schedules and auto-fills
Both modes coexist: generate first, then manually override any cell
Multi-section: section field on both template and assignment — budtender vs growshop vs coffee
Scale: same model for 2 staff (Medi Rec) to 20+ staff (future large client)

## Mini Calendar Year View fix (commit 811c1e9)
FILE: src/components/hq/HRCalendar.js
MiniMonth component added — full 7-column week grid inside each year view card
Today: green filled circle. Holidays: amber circle. Events: coloured dots below day.
Previously showed only dot counts ("● 3 Holidays") — now shows actual calendar grid.

---

# HR Calendar — Session Status
Session A    ✅ DONE  — Year view, year nav, holiday bug fix, 2027 data
Session A+   ✅ DONE  — Mini calendar grids in year view cards
Session B    ✅ DONE  — Diary (hr_diary_entries, DayPanel, add/delete notes)
Session C1   ✅ DONE  — Shift Templates + Roster Builder (HRRoster.js v1.0)
Session C2   ⏳ NEXT  — Hours monitoring (scheduled vs actual timesheet hours)
Session D    ⏳       — Shift cost calculator (SA premium rules, payroll projection)

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/components/hq/HRRoster.js               v1.0  ✅ LIVE (0e8f38b)
src/components/hq/HRCalendar.js             v1.4  ✅ LIVE (811c1e9) — mini grids + diary
src/components/hq/POSScreen.js              v2.0  ✅ LIVE (0ce48a1)
src/pages/HRDashboard.js                    v1.3  ✅ LIVE (0e8f38b) — Roster tab
src/pages/TenantPortal.js                   v2.7  ✅ LIVE (0e8f38b) — Team Roster tab
src/components/viz/ChartCard.js             v2.0  ✅ LIVE
src/components/viz/ChartTooltip.js          v2.0  ✅ LIVE
src/components/viz/DeltaBadge.js            v2.0  ✅ LIVE
src/components/hq/HQOverview.js             v4.1  ✅ LIVE
src/components/hq/HQProfitLoss.js           v3.0  ✅ LIVE
src/components/hq/HQAnalytics.js            v4.4  ✅ LIVE
src/components/hq/HQTradingDashboard.js     v3.0  ✅ LIVE
src/components/hq/EODCashUp.js              v1.0  ✅ LIVE
src/components/hq/HQStock.js                v3.1  ✅ LIVE
src/components/hq/SmartInventory.js         v1.5  ✅ LIVE
scripts/seed-demo-data.js                   v1.0  ✅ LIVE
src/components/hq/LiveFXBar.js                    PROTECTED — never modify
src/components/StockItemModal.js                  LOCKED — never modify
src/components/PlatformBar.js                     LOCKED — never modify

## DB — ROSTER TABLES (confirmed this session)
shift_templates:
  section allowed values: General|Budtender|Manager|Cashier|Coffee Shop|
                          Restaurant|Headshop|Growshop|Security|Cleaner
  tenant_id NOT NULL — Rule 0F always applies
roster_weeks:
  status CHECK: draft|published|locked ONLY
  UNIQUE (tenant_id, week_start)
  week_start = Monday (use getMondayOf() helper)
roster_assignments:
  UNIQUE (roster_week_id, staff_profile_id, work_date)
  Use UPSERT with onConflict to avoid duplicate errors
  is_off = true for explicit day-off assignments (not absent, deliberately off)
  shift_template_id nullable — allows custom time override without template

## DB — HR FULL PICTURE
staff_profiles:      NO hourly_rate column — rate is in employment_contracts
employment_contracts: hourly_rate_zar + gross_salary_zar (source for cost calculator)
                     standard_hours_per_day, standard_days_per_week also stored
timesheets:          total_hours, regular_hours, overtime_hours, public_holiday_hours
                     period_start, period_end — weekly or bi-weekly period container
timesheet_entries:   clock_in, clock_out, hours_worked, break_minutes
                     late_flag, late_minutes, absent_flag, entry_type
                     work_date, clock_in_method ('manual'|'qr')
shift_schedules:     works_[mon-sun] booleans, shift_start, shift_end
                     break_minutes, grace_minutes, location, effective_from/to
                     Used by "Generate from schedules" button in HRRoster
public_holidays:     year GENERATED, holiday_type: fixed|calculated|substitute|custom
                     tenant_id=null = global. Query: .or('tenant_id.eq.X,tenant_id.is.null')
hr_diary_entries:    entry_type: note|meeting|reminder|announcement|task
shift_templates:     section, color, shift_start, shift_end, break_minutes
roster_weeks:        week_start (Monday), status: draft|published|locked
roster_assignments:  UNIQUE per (week, staff, date), is_off flag

## DEMO SEED STATE
Tenant:    Medi Recreational (b1bad266)
Rows:      2,721 total
Commands:  npm run seed | npm run seed:reset
Note:      Hero SKUs are LED equipment. Real cannabis prices needed from owner.

## OPEN BUGS
BUG-043  Terpene qty inflation — physical count required
BUG-044  HQCogs shipping_alloc_usd column — verify exists
check_reorder() trigger — UNKNOWN status

---

# NEXT PRIORITIES

## [P1] Owner Actions — block first real sale
☐ Set sell_price on Medi SKUs (most R0 — hero items are LED equipment)
☐ Enable Supabase backups (Settings → Add-ons)
☐ Yoco sole-trader signup → sk_test_ keys
☐ Run first real POS sale → verify loyalty + session + trading dashboard

## [P2] HR Session C2 — Hours Monitoring
Wire timesheet_entries against roster_assignments:
  Per-staff weekly view: scheduled hours vs actual hours
  Variance: amber (short) / red (over — OT flag)
  Late flags from timesheet_entries
  Public holiday detection using public_holidays table
Gate: needs real timesheet data — even manual entries will work

## [P3] HR Session D — Shift Cost Calculator
Uses: employment_contracts.hourly_rate_zar
      timesheet_entries.hours_worked
      public_holidays (seeded ✅)
      roster_assignments (now live ✅)
Calculates: regular / OT (1.5×) / Sunday (1.5×) / public holiday (2×) / night (1.33×)
Output: per-staff cost breakdown + total monthly projection
Gate: needs C1 (✅) + real hourly rates in employment_contracts

## [P4] POSScreen v2 — verify on first real sale
loyalty_transactions INSERT schema — check for required NOT NULL columns
user_profiles.loyalty_points update
order.user_id populated when customer found
Session badge correct after EODCashUp opens session

## [FUTURE]
Decision C: Client 2 storefront — UNRESOLVED since v149
Decision D: Yoco per-tenant vs platform — UNRESOLVED since v149

---

# CRITICAL RULES

## Code Rules
RULE 0Q:  GitHub write tools = 403 — never call them
LL-056:   scan_logs NO tenant_id column
LL-059:   user_profiles.loyalty_points = operational truth
LL-120:   Never call api.anthropic.com from React
LL-178:   Never change renderTab without loss list + owner confirm
LL-185:   Read file via GitHub MCP before any edit suggestion
LL-189:   movement_type = 'sale_pos' for POSScreen only
LL-191:   loyalty_transactions: transaction_type column, .ilike()
LL-196:   fontWeight 300 / 9px labels / 0.3em letterSpacing BANNED
LL-198:   eod_cash_ups variance GENERATED, orders.total not total_amount

## Roster Rules (new v183)
ROSTER-01: roster_weeks.week_start MUST be a Monday — use getMondayOf() helper
ROSTER-02: roster_assignments UPSERT with onConflict="roster_week_id,staff_profile_id,work_date"
           to avoid duplicate key errors
ROSTER-03: is_off=true = deliberate day off (not absence/leave — those are in leave_requests)
ROSTER-04: shift_template_id nullable — custom times allowed without a template
ROSTER-05: Locked rosters (status='locked') are read-only — never write assignments to locked weeks
ROSTER-06: Hours column flags >45h/week as OT (SA BCEA threshold)
           Public holiday assignments get 2× rate — flagged visually, not auto-calculated yet
ROSTER-07: "Generate from schedules" reads shift_schedules (existing table) — always idempotent
           Uses UPSERT so safe to run multiple times

## Public Holidays Rules
PH-01:  public_holidays.year GENERATED — never INSERT
PH-02:  holiday_type: fixed|calculated|substitute|custom ONLY
PH-03:  Query: .or('tenant_id.eq.X,tenant_id.is.null') — never .eq() alone
PH-04:  Data: 2025 (13) · 2026 (13) · 2027 (14) rows, all tenant_id=null

## POS Rules
POS-01:  POSScreen reads pos_sessions — never writes
POS-02:  Loyalty = 10pts/R1 flat (Math.floor(total * 10))
POS-03:  awardLoyaltyPoints() non-blocking — sale never fails due to loyalty
POS-04:  Customer lookup: .ilike("phone", "%phone%") partial match
POS-05:  Customer state clears after every sale

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
Supabase MCP — schema verification, data queries, table creation

---

# DOCUMENT READ ORDER FOR NEXT SESSION

NORTH-STAR_v1_0.md
SESSION-STATE_v183.md   ← this file
SESSION-CORE_v2_11.md
VIOLATION_LOG_v1_1.md
REGISTRY_v3_2.md
MANIFEST_v3_0.md


---

*SESSION-STATE v183 · NuAi · April 5, 2026*
*HR Session C1 complete — HRRoster.js v1.0 (940 lines)*
*shift_templates + roster_weeks + roster_assignments tables live*
*HRCalendar v1.4 mini grids · Diary live · All HR sessions A–C1 done*
*HEAD: 0e8f38b · Branch: main*
*Next: HR Session C2 (hours monitoring) OR owner actions (sell prices → first real sale)*
