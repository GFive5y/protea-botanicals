# SESSION-STATE v182
## NuAi Platform — Protea Botanicals
## Date: April 4, 2026
## Session: v182 — HR Sessions A+ and B (mini calendar year view + diary)

---

# LIVE HEAD
668e154  feat(hr): Session A+ + B — mini calendar year view + diary feature
4c2d7e6  docs: SESSION-STATE v181 — HR Session A complete
d265780  feat(hr): Session A — year view + holiday query fix + 2027 holidays seeded
0ce48a1  feat(pos): POSScreen v2 — customer lookup, loyalty points, cash change
c01e7b6  fix(portal): ExpenseManager onClose prop missing

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v182)

## HR Session A+ — Year view mini calendar grids (commit 668e154)
FILE: src/components/hq/HRCalendar.js
Problem: Year view month cards showed only dot counts ("● 3 Holidays").
Too empty. Not useful as an overview.
Fix: New MiniMonth component renders a full 7-column week grid inside each
month card. Shows actual day numbers, week rows, event indicators.
MiniMonth features:

Day of week headers: S M T W T F S (8px, bold)
Full day grid: all dates of the month in correct weekday columns
Today: green circle (#1A3D2B) with white text
Public holidays: amber background + border on the day number
Weekend days: muted colour (ink300)
Events: coloured 3px dots below the day number, one per event type
Up to 3 dot types shown per day (leave/holiday/hearing/shift/diary)
Compact: ~16px per day cell, fits within 4-column year grid


## HR Session B — Calendar Diary (commit 668e154)
New Supabase table: hr_diary_entries (created this session via Supabase MCP)
FILE: src/components/hq/HRCalendar.js (10 find/replace changes)

### Schema — hr_diary_entries (disk-verified via Supabase MCP)
id           uuid DEFAULT gen_random_uuid() PRIMARY KEY
tenant_id    uuid NOT NULL REFERENCES tenants(id)
entry_date   date NOT NULL
title        text NOT NULL
body         text (nullable)
entry_type   text DEFAULT 'note'
             CHECK (note|meeting|reminder|announcement|task)
color        text DEFAULT '#6B7280'
created_by   uuid REFERENCES staff_profiles(id) (nullable)
created_at   timestamptz DEFAULT now()
Index: hr_diary_entries_tenant_date_idx ON (tenant_id, entry_date)
RLS: enabled — 4 policies (select/insert/update/delete by tenant)

### Diary features
Event layer:

'diary' added to EV colour map: sky blue (#F0F9FF / #BAE6FD / #0369A1)
'diary' added to LAYER_META — "Notes" toggle in legend
diary: true in layers initial state
Notes count in header stat bar

Data:

Fetched in fetchData() from hr_diary_entries
Mapped to events with type='diary', leaveColor=custom color
(reuses leaveColor field so EventChip renders the user's chosen colour)
Merged into events array alongside leave/holidays/hearings/shifts

DayPanel (slide-in from right):

Click any date in Month or Week view → DayPanel opens
Backdrop click → closes panel
Shows: date header, existing events (leave/holidays/etc.), diary notes
Each diary note: emoji + title + body + ✕ delete button
Add Note form:
  5 type pills: 📝 Note | 👥 Meeting | ⏰ Reminder | 📢 Announcement | ✅ Task
  6 colour swatches: blue/green/amber/red/purple/grey
  Title input (required, Enter to save)
  Body textarea (optional)
  Save button (coloured by selected swatch)
Save → INSERT hr_diary_entries → fetchData() → panel stays open, note appears
Delete → DELETE hr_diary_entries → fetchData() → note removed
Empty state: "No events on this day"

Access: Managers/owners only — enforced by HR module access (not in diary code)
Private entries: NOT implemented (keep simple — all visible within tenant)

### HRCalendar.js changes summary
Change 1  — diary colour in EV
Change 2  — diary in LAYER_META
Change 3  — diary: true in layers state
Change 4  — Notes count in header stat bar
Change 5  — dayPanel state variable
Change 6  — diary fetch in fetchData + merge into events
Change 7  — MonthView: onDayClick prop + day cell onClick
Change 8  — WeekView: onDayClick prop + day column onClick
Change 9  — DayPanel + DIARY_TYPES + DIARY_COLORS constants
Change 10 — Wire MonthView/WeekView onDayClick + render DayPanel

---

## HR Calendar — Session Status
Session A   ✅ DONE  — Year view, year nav, holiday bug fix, 2027 data
Session A+  ✅ DONE  — Mini calendar grids in year view month cards
Session B   ✅ DONE  — Diary (hr_diary_entries, DayPanel, add/delete notes)
Session C1  ⏳ NEXT  — Shift pattern editor UI
Session C2  ⏳       — Hours monitoring (scheduled vs actual)
Session D   ⏳       — Shift calculator (cost projection, SA premium rules)

### Open questions before Session C1 (shift pattern editor)
Q1: Fixed rotation or rotating patterns?
    Fixed   = same schedule every week (shift_schedules table already supports)
    Rotating = week 1 morning / week 2 afternoon (needs new table)
Q2: Are hourly rates recorded per staff member in staff_profiles?
Q3: What is the actual current shift pattern at Medi Rec?

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/components/hq/HRCalendar.js             v1.4  ✅ LIVE (668e154)
                                             — year mini grids + diary
src/components/hq/POSScreen.js              v2.0  ✅ LIVE (0ce48a1)
src/pages/TenantPortal.js                   v2.6  ✅ LIVE (c01e7b6)
src/components/viz/ChartCard.js             v2.0  ✅ LIVE
src/components/viz/ChartTooltip.js          v2.0  ✅ LIVE
src/components/viz/DeltaBadge.js            v2.0  ✅ LIVE
src/components/hq/HQOverview.js             v4.1  ✅ LIVE
src/components/hq/HQProfitLoss.js           v3.0  ✅ LIVE
src/components/hq/HQAnalytics.js            v4.4  ✅ LIVE
src/components/hq/HQLoyalty.js                    ✅ LIVE
src/components/hq/HQBalanceSheet.js         v1.1  ✅ LIVE
src/components/hq/HQTradingDashboard.js     v3.0  ✅ LIVE
src/components/hq/EODCashUp.js              v1.0  ✅ LIVE
src/components/hq/HQStock.js                v3.1  ✅ LIVE
src/components/hq/SmartInventory.js         v1.5  ✅ LIVE
scripts/seed-demo-data.js                   v1.0  ✅ LIVE
src/components/hq/LiveFXBar.js                    PROTECTED — never modify
src/components/StockItemModal.js                  LOCKED — never modify
src/components/PlatformBar.js                     LOCKED — never modify

## DB — HR DIARY (confirmed this session)
hr_diary_entries:
  entry_type CHECK: note|meeting|reminder|announcement|task ONLY
  color: any hex string (6 presets in UI: blue/green/amber/red/purple/grey)
  created_by: nullable (staff_profiles FK)
  tenant_id: NOT NULL — always required on INSERT
  RLS: enabled, 4 policies
public_holidays:
  year = GENERATED — never INSERT
  holiday_type: fixed|calculated|substitute|custom ONLY
  tenant_id = null means global (all tenants)
  Query: .or('tenant_id.eq.X,tenant_id.is.null') — never .eq() alone
  Data: 2025 (13) · 2026 (13) · 2027 (14) rows — all tenant_id=null

## DB SCHEMA — CONFIRMED
orders:               field = total (NOT total_amount)
order_items:          no inventory_item_id FK — via product_metadata jsonb
inventory_items:      no 'notes' column · category is enum
movement_type:        'sale_pos' for POSScreen · 'sale_out' for wholesale/seed
eod_cash_ups:         variance = GENERATED — NEVER insert
pos_sessions:         POSScreen reads only (never writes)
daily_summaries:      table does NOT exist — do not INSERT
loyalty_transactions: column = transaction_type (NOT type)
user_profiles:        loyalty_points = operational truth (LL-059)
scan_logs:            NO tenant_id column — never filter by it

## TENANT STATE
Medi Recreational  b1bad266-ceb4-4558-bbc3-22cfeeeafe74
  tier:       pro (in tenant_config)
  Inventory:  184 SKUs / 185 active items
  sell_price: R0 on most — owner action required (P1 blocker)
  Seed data:  2,721 rows live
Protea Botanicals  43b34c33...  (HQ operator)
Pure PTV           f8ff8d07...  (Client 1)
TEST SHOP          4a6c7d5c...  (dev only)

## OPEN BUGS
BUG-043  Terpene qty inflation — physical count required
BUG-044  HQCogs shipping_alloc_usd column — verify exists
check_reorder() trigger — UNKNOWN status

---

# NEXT PRIORITIES

## [P1] Owner Actions — block first real sale
☐ Set sell_price on Medi SKUs (most R0)
☐ Enable Supabase backups (Settings → Add-ons)
☐ Yoco sole-trader signup → sk_test_ keys
☐ First real POS sale → verify full loop

## [P2] HR Session C1 — Shift pattern editor
Gate: answer Q1 (fixed vs rotating), Q2 (hourly rates), Q3 (current pattern)

## [P3] POSScreen v2 — verify on first real sale
✓ loyalty_transactions INSERT schema
✓ user_profiles.loyalty_points updates
✓ order.user_id populated
✓ Session badge correct

## [P4] HR Session C2 — Hours monitoring
Gate: needs Session C1 complete first

## [P5] HR Session D — Shift calculator
Gate: needs Session A (✅) + C1 complete first

## [FUTURE]
Decision C: Client 2 storefront — UNRESOLVED
Decision D: Yoco per-tenant vs platform — UNRESOLVED

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

## HR Diary Rules (new v182)
DIARY-01: hr_diary_entries.entry_type: note|meeting|reminder|announcement|task ONLY
DIARY-02: tenant_id NOT NULL on every INSERT — Rule 0F applies
DIARY-03: DayPanel stays open after save (onSaved = fetchData, not close)
DIARY-04: Diary events use leaveColor field for custom colour rendering in EventChip

## Public Holidays Rules
PH-01:  public_holidays.year is GENERATED — never INSERT
PH-02:  holiday_type: fixed|calculated|substitute|custom ONLY
PH-03:  Query: .or('tenant_id.eq.X,tenant_id.is.null') — never .eq() alone
PH-04:  tenant_id=null = global (all tenants see it)

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
Supabase MCP — schema verification, data queries, migrations

---

# DOCUMENT READ ORDER FOR NEXT SESSION

NORTH-STAR_v1_0.md
SESSION-STATE_v182.md   ← this file
SESSION-CORE_v2_11.md
VIOLATION_LOG_v1_1.md
REGISTRY_v3_2.md
MANIFEST_v3_0.md


---

*SESSION-STATE v182 · NuAi · April 4, 2026*
*HR Sessions A + A+ + B complete — HRCalendar v1.4*
*Mini calendar grids in year view · Diary live · hr_diary_entries table created*
*HEAD: 668e154 · Branch: main*
*Next: HR Session C1 (shift editor) — answer 3 gating questions first*
