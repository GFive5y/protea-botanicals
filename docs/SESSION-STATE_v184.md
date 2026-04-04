# SESSION-STATE v184
## NuAi Platform — Protea Botanicals
## Date: April 5, 2026
## Session: v184 — HR Session C2 (Hours Monitor)

---

# LIVE HEAD
5110090  feat(hr): Session C2 — Hours Monitor sub-tab in HRTimesheets
0e8f38b  feat(hr): Session C1 — Shift Templates + Roster Builder
811c1e9  fix(hr): Year view — MiniMonth calendar grids
668e154  feat(hr): Session A+ + B — diary feature
d265780  feat(hr): Session A — holiday query fix + 2027 holidays

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v184)

## HR Session C2 — Hours Monitor (commit 5110090)
FILE: src/components/hq/HRTimesheets.js
370 new lines. Sub-tabs now: Timesheets | Hours Monitor | Summary

### What it does
Compares roster_assignments (scheduled hours) vs timesheet_entries (actual hours)
for any selected week. Week navigation with prev/next and "This Week" shortcut.
DATA SOURCES:
  Scheduled  → roster_assignments JOIN shift_templates (shift_start/end/break)
  Actual     → timesheet_entries.hours_worked SUM per staff per week
  Late       → timesheet_entries.late_flag COUNT
  Absent     → timesheet_entries.absent_flag COUNT
  Holidays   → public_holidays .or(tenant/null) for the week's date range
  Roster     → roster_weeks.status badge shown in week header
KPI STRIP (top):
  Scheduled total · Actual total · Variance (+/-) · Coverage %
PER-STAFF TABLE:
  Staff name + job title
  Scheduled hours (from roster) or "No roster"
  Actual hours (from entries) or "No entries"
  Variance with colour coding:
    Green  = within 1h (on track)
    Amber  = 1–3h short
    Red    = >3h short
    Blue   = overtime (>45h/week)
  Days worked count
  Late count (flagPill)
  Absent count (flagPill)
  PH days column (only shown when holidays exist in the week)
  Status label: On track / Slight short / Short hours / Overtime /
                Missing entries / No roster / No data
FOOTER ROW: totals for scheduled, actual, variance
EMPTY STATES (4 distinct cases):
  No staff profiles → "Add staff in the Staff tab first"
  No data at all   → explains what to do (build roster + add entries)
  No roster        → cell shows "No roster"
  No entries       → cell shows "No entries" + status "Missing entries"
PUBLIC HOLIDAY BANNER:
  Shows when holidays exist in the selected week
  Lists holiday names + dates + "2× rate" note
LEGEND: colour key for variance bands
CURRENT DATA STATE (Medi Rec b1bad266):
  0 staff, 0 timesheets, 0 entries, 0 roster weeks
  Component handles this gracefully via empty states
  Ready to populate when first real staff/timesheets are entered

---

# HR Calendar — Session Status
Session A    ✅ DONE  — Year view, year nav, holiday bug fix, 2027 data
Session A+   ✅ DONE  — MiniMonth calendar grids in year view
Session B    ✅ DONE  — Diary (hr_diary_entries, DayPanel, add/delete)
Session C1   ✅ DONE  — Shift Templates + Roster Builder (HRRoster.js v1.0)
Session C2   ✅ DONE  — Hours Monitor (scheduled vs actual, week comparison)
Session D    ⏳ NEXT  — Shift cost calculator (SA premium rules, payroll projection)

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/components/hq/HRTimesheets.js           v1.1  ✅ LIVE (5110090) — Hours Monitor added
src/components/hq/HRRoster.js               v1.0  ✅ LIVE (0e8f38b)
src/components/hq/HRCalendar.js             v1.4  ✅ LIVE (811c1e9)
src/components/hq/POSScreen.js              v2.0  ✅ LIVE (0ce48a1)
src/pages/HRDashboard.js                    v1.3  ✅ LIVE (0e8f38b)
src/pages/TenantPortal.js                   v2.7  ✅ LIVE (0e8f38b)
src/components/viz/ChartCard.js             v2.0  ✅ LIVE
src/components/hq/HQTradingDashboard.js     v3.0  ✅ LIVE
src/components/hq/EODCashUp.js              v1.0  ✅ LIVE
src/components/hq/HQStock.js                v3.1  ✅ LIVE
src/components/hq/LiveFXBar.js                    PROTECTED — never modify
src/components/StockItemModal.js                  LOCKED — never modify
src/components/PlatformBar.js                     LOCKED — never modify

## DB — FULL HR SCHEMA (all tables confirmed)
staff_profiles:       NO hourly_rate — use employment_contracts.hourly_rate_zar
employment_contracts: hourly_rate_zar, gross_salary_zar, standard_hours_per_day
timesheets:           total_hours, regular_hours, overtime_hours, public_holiday_hours
                      period_start, period_end, status, late_count, absent_count
timesheet_entries:    clock_in, clock_out, hours_worked, break_minutes
                      late_flag, late_minutes, absent_flag, entry_type, work_date
shift_schedules:      works_[mon-sun] booleans, shift_start/end, grace_minutes
                      Used by HRRoster "Generate from schedules" button
public_holidays:      year GENERATED, holiday_type: fixed|calculated|substitute|custom
                      tenant_id=null = global
                      Query: .or('tenant_id.eq.X,tenant_id.is.null')
hr_diary_entries:     entry_type: note|meeting|reminder|announcement|task
shift_templates:      section, color, shift_start/end, break_minutes
roster_weeks:         week_start (Monday), status: draft|published|locked
roster_assignments:   UNIQUE(roster_week_id, staff_profile_id, work_date)
                      is_off bool, shift_template_id nullable
orders:               field = total (NOT total_amount)
eod_cash_ups:         variance = GENERATED — NEVER insert
pos_sessions:         POSScreen reads only (never writes)
loyalty_transactions: column = transaction_type (NOT type)
scan_logs:            NO tenant_id column

## TENANT DATA STATE
Medi Recreational  b1bad266:
  staff_profiles:      0 rows — owner needs to add real staff
  timesheets:          0 rows
  timesheet_entries:   0 rows
  roster_weeks:        0 rows
  roster_assignments:  0 rows
  employment_contracts: 0 rows
  inventory:           184 SKUs, most sell_price = R0 (P1 blocker)
HQ Protea Botanicals  43b34c33:
  staff_profiles:      2 rows
  timesheets:          1 row
  timesheet_entries:   2 rows
  employment_contracts: 3 rows (all hourly_rate_zar null or invalid)

## OPEN BUGS
BUG-043  Terpene qty inflation — physical count required
BUG-044  HQCogs shipping_alloc_usd — verify column exists
check_reorder() trigger — UNKNOWN status
employment_contracts: hourly_rate_zar null for all active contracts
  → blocks Session D (shift calculator)
  → owner action: set rates before Session D

---

# NEXT PRIORITIES

## [P1] Owner Actions — block everything
☐ Set sell_price on Medi SKUs (hero items = LED equipment, most R0)
☐ Add real staff profiles to Medi Rec tenant
☐ Set hourly_rate_zar in employment_contracts (needed for Session D)
☐ Enable Supabase backups (Settings → Add-ons)
☐ Yoco sole-trader signup → sk_test_ keys
☐ Run first real POS sale → verify loyalty + timesheets

## [P2] HR Session D — Shift Cost Calculator
Gate: needs hourly_rate_zar in employment_contracts (currently null)
      needs at least one roster week + timesheet entries to calculate against
Calculates per SA labour law:
  Regular hours:      ≤45h/week at 1× rate
  Overtime:           >45h/week at 1.5× rate
  Sunday hours:       1.5× rate (auto-detected from work_date)
  Public holiday:     2× rate (cross-join public_holidays ✅ seeded)
  Night shift:        1.33× for hours after 18:00
Output: per-staff cost breakdown + monthly total projection
"What if" planner: simulate roster before publishing → see projected cost

## [P3] POSScreen v2 — verify on first real sale
loyalty_transactions INSERT — check NOT NULL columns
user_profiles.loyalty_points update
order.user_id populated when customer found
Session badge after EODCashUp opens session

## [P4] Pages not yet typography-verified
HQSuppliers.js · HQTransfer.js · HQWholesaleOrders.js · HQMedical.js · AdminDashboard.js
Read before touching — do not assume clean.

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

## Roster Rules
ROSTER-01: roster_weeks.week_start MUST be Monday — use getMondayOf()
ROSTER-02: roster_assignments UPSERT onConflict="roster_week_id,staff_profile_id,work_date"
ROSTER-03: is_off=true = deliberate day off (not absence)
ROSTER-04: shift_template_id nullable — custom times allowed
ROSTER-05: Locked rosters are read-only — never write to locked weeks
ROSTER-06: >45h/week = OT (SA BCEA threshold)
ROSTER-07: "Generate from schedules" reads shift_schedules — UPSERT, idempotent

## Public Holidays Rules
PH-01: year GENERATED — never INSERT
PH-02: holiday_type: fixed|calculated|substitute|custom ONLY
PH-03: Query: .or('tenant_id.eq.X,tenant_id.is.null') — never .eq() alone
PH-04: Data: 2025 (13) · 2026 (13) · 2027 (14) rows

## Diary Rules
DIARY-01: entry_type: note|meeting|reminder|announcement|task ONLY
DIARY-02: tenant_id NOT NULL on every INSERT
DIARY-03: DayPanel stays open after save (onSaved = fetchData, not close)
DIARY-04: Diary events use leaveColor field for custom colour in EventChip

## POS Rules
POS-01: POSScreen reads pos_sessions — never writes
POS-02: Loyalty = 10pts/R1 (Math.floor(total * 10))
POS-03: awardLoyaltyPoints() non-blocking — sale never fails due to loyalty
POS-04: Customer lookup: .ilike("phone", "%phone%")
POS-05: Customer state clears after every sale

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
SESSION-STATE_v184.md   ← this file
SESSION-CORE_v2_11.md
VIOLATION_LOG_v1_1.md
REGISTRY_v3_2.md
MANIFEST_v3_0.md


---

*SESSION-STATE v184 · NuAi · April 5, 2026*
*HR Sessions A through C2 complete*
*HRTimesheets v1.1 · HRRoster v1.0 · HRCalendar v1.4*
*HEAD: 5110090 · Branch: main*
*Next: Session D (shift calculator) — gate: set hourly_rate_zar first*
*OR: owner actions (sell prices + first real sale)*
