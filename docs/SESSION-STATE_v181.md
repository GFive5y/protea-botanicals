# SESSION-STATE v181
## NuAi Platform — Protea Botanicals
## Date: April 4, 2026
## Session: v181 — HR Session A (year view + SA holidays + calendar bug fix)

---

# LIVE HEAD
d265780  feat(hr): Session A — year view + holiday query fix + 2027 holidays seeded
0ce48a1  feat(pos): POSScreen v2 — customer lookup, loyalty points, cash change
c01e7b6  fix(portal): ExpenseManager onClose prop missing — ✕ navigates to P&L
111ef27  feat(typography): Phase M+N — HQFraud + HQInvoices metric weight 400→600

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v181)

## HR Session A — HRCalendar + SA Public Holidays (commit d265780)

### Critical bug fixed — holidays never showed (existed since calendar was built)
Root cause: HRCalendar.js queried public_holidays with .eq("tenant_id", tenantId)
All holiday data has tenant_id = NULL (global, not tenant-specific)
Result: zero holidays ever rendered on the calendar
Fix: .or(tenant_id.eq.${tenantId},tenant_id.is.null)
Now fetches global holidays AND any future tenant-specific ones
This bug was invisible because the calendar loaded without errors —
it simply returned zero rows from public_holidays silently.

### Schema discovered via Supabase MCP (disk-verified this session)
public_holidays columns:
  id (uuid, gen_random_uuid())
  tenant_id (uuid, NULLABLE — null = global for all tenants)
  holiday_date (date, NOT NULL)
  name (text, NOT NULL)
  holiday_type (text, default 'fixed')
  country_code (text, default 'ZA')
  year (integer, GENERATED — never insert)
  is_active (boolean, default true)
  notes (text, nullable)
  created_at (timestamptz)
holiday_type CHECK constraint — allowed values ONLY:
  'fixed'       — statutory date (New Year's, Christmas, etc.)
  'calculated'  — Easter-dependent (Good Friday, Family Day)
  'substitute'  — observed day when holiday falls on Sunday
  'custom'      — tenant-defined custom holidays

### SA Public Holidays — data state after this session
2025: 13 rows ✅ (pre-existing, seeded before this session)
2026: 13 rows ✅ (pre-existing, seeded before this session)
2027: 14 rows ✅ (seeded this session via Supabase MCP)
All with tenant_id = NULL (global — applies to all tenants)
2027 holidays seeded:
  2027-01-01  New Year's Day             fixed
  2027-03-21  Human Rights Day           fixed
  2027-03-22  Human Rights Day (sub)     substitute  ← Mar 21 = Sunday
  2027-03-26  Good Friday               calculated
  2027-03-29  Family Day                calculated
  2027-04-27  Freedom Day               fixed
  2027-05-01  Workers' Day              fixed
  2027-06-16  Youth Day                 fixed
  2027-08-09  National Women's Day      fixed
  2027-09-24  Heritage Day              fixed
  2027-12-16  Day of Reconciliation     fixed
  2027-12-25  Christmas Day             fixed
  2027-12-26  Day of Goodwill           fixed
  2027-12-27  Day of Goodwill (sub)     substitute  ← Dec 26 = Sunday

### HRCalendar.js changes (7 find/replace, no full rewrite)
Change 1  — BUGFIX: holiday query .or() — tenant-specific OR global null
Change 2  — Range: year view fetches full year (Jan 1 → Dec 31)
Change 3  — prevYear() / nextYear() nav functions added
Change 4  — View switcher: Month | Week | Team | Year
Change 5  — Nav bar: ‹‹ / 2026 / ›› for year view
Change 6  — YearView component: 4×3 month grid, event count dots,
            "Now" badge on current month, click → jumps to month view
Change 7  — YearView wired into render

### Year view behaviour

4-column grid of all 12 months
Each card shows dot counts: Holidays · Leave · Hearings · Shifts
Current month: green border + "Now" badge
Hover: shadow lift + accent border
Click any card → navigates to that month in Month view
‹‹ / ›› navigation moves full year
Fetches 12 months of event data when in year view (rangeStart/rangeEnd extends)


---

## HR Calendar — Planned Sessions (from deep dive)
Session A  ✅ DONE  — Year view + SA holidays + bug fix
Session B  ⏳ NEXT  — Diary (add notes/events to calendar dates)
Session C1 ⏳       — Shift pattern editor UI (writes to shift_schedules)
Session C2 ⏳       — Hours monitoring (scheduled vs actual timesheets)
Session D  ⏳       — Shift calculator (cost projection with SA premium rules)

### Open questions before Session B (diary)
Q1: Can all staff write diary entries, or managers/owners only?
Q2: Should private entries (is_private) be supported in v1, or keep it simple?

### Open questions before Session C (shifts)
Q1: Fixed rotation or rotating patterns? (affects data model significantly)
    Fixed = same schedule every week (current shift_schedules supports this)
    Rotating = week 1 morning / week 2 afternoon (needs shift_schedule_weeks table)
Q2: Are hourly rates recorded per staff member in staff_profiles?
Q3: What is the actual shift pattern at Medi Rec right now?

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/components/hq/HRCalendar.js             v1.3  ✅ LIVE (d265780)
                                             — year view, holiday fix, 2027 data
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
src/components/hq/HQPricing.js              v4.3  ✅ LIVE
src/components/hq/HQTradingDashboard.js     v3.0  ✅ LIVE
src/components/hq/EODCashUp.js              v1.0  ✅ LIVE
src/components/hq/HQStock.js                v3.1  ✅ LIVE
src/components/hq/SmartInventory.js         v1.5  ✅ LIVE
scripts/seed-demo-data.js                   v1.0  ✅ LIVE — 2,721 demo rows
src/components/hq/LiveFXBar.js                    PROTECTED — never modify
src/components/StockItemModal.js                  LOCKED — never modify
src/components/PlatformBar.js                     LOCKED — never modify

## DB — PUBLIC HOLIDAYS (confirmed state)
public_holidays table:
  year column = GENERATED — NEVER insert or update
  holiday_type allowed: 'fixed' | 'calculated' | 'substitute' | 'custom'
  tenant_id = NULL means global (all tenants see it)
  Query must use .or('tenant_id.eq.X,tenant_id.is.null') — never .eq() alone
Current data: 2025 (13 rows) · 2026 (13 rows) · 2027 (14 rows)
All tenant_id = null — global

## DEMO SEED STATE
Tenant:    Medi Recreational (b1bad266)
Rows:      2,721 total
Commands:  npm run seed | npm run seed:reset
Note:      Hero SKUs are LED equipment. Real cannabis prices needed from owner.

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
public_holidays:      year = GENERATED · tenant_id = null means global
                      holiday_type: fixed|calculated|substitute|custom ONLY

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
BUG-043  Terpene qty inflation (23 items 2-3x) — physical count required
BUG-044  HQCogs shipping_alloc_usd column — verify exists
  SQL: SELECT column_name FROM information_schema.columns
       WHERE table_name='product_cogs' AND column_name='shipping_alloc_usd';
check_reorder() trigger — UNKNOWN status
  SQL: SELECT routine_name FROM information_schema.routines
       WHERE routine_schema='public' AND routine_name LIKE '%reorder%';

---

# NEXT PRIORITIES

## [P1] Owner Actions — block first real sale
☐ Set sell_price on Medi SKUs (most R0 — hero items are LED equipment)
☐ Enable Supabase backups (Settings → Add-ons)
☐ Yoco sole-trader signup → get sk_test_ keys
☐ Run first real POS sale → verify full loop

## [P2] HR Session B — Calendar Diary
New table: hr_diary_entries
  (id, tenant_id, entry_date, title, body, entry_type, created_by, is_private, color)
  entry_type: note | reminder | meeting | announcement | task
Feature: click date → slide-in panel → add entry → appears as new calendar layer
Gate: answer Q1 (who can write?) and Q2 (private entries?) before building

## [P3] POSScreen v2 — verify on first real sale
✓ loyalty_transactions INSERT (check for required NOT NULL columns)
✓ user_profiles.loyalty_points updates
✓ order.user_id populated when customer linked
✓ Session badge correct after EODCashUp opens session

## [P4] HR Session C1 — Shift pattern editor
Gate: answer rotation type question before building

## [P5] HR Session D — Shift calculator
Gate: needs Session A (holidays ✅) + Session C1 (patterns) complete first

## [FUTURE] Unresolved Architectural Decisions
Decision C: Client 2 storefront — Option A/B/C (UNRESOLVED since v149)
Decision D: Yoco per-tenant vs platform account (UNRESOLVED since v149)

---

# CRITICAL RULES

## Code Rules
RULE 0Q:  GitHub write tools = 403 PERMANENTLY — never call them
LL-056:   scan_logs has NO tenant_id column — never filter by it
LL-059:   user_profiles.loyalty_points = operational truth
LL-120:   Never call api.anthropic.com from React — route via ai-copilot EF
LL-178:   Never change renderTab case without loss list + owner confirm
LL-185:   Read file via GitHub MCP before any edit suggestion
LL-189:   movement_type = 'sale_pos' for POSScreen only
LL-190:   EOD thresholds always from tenant_config.settings
LL-191:   loyalty_transactions: transaction_type column, use .ilike()
LL-196:   fontWeight 300 / 9px labels / 0.3em letterSpacing BANNED
LL-198:   eod_cash_ups variance GENERATED, orders.total not total_amount

## Public Holidays Rules (new v181)
PH-01:  public_holidays.year is GENERATED — never INSERT or UPDATE it
PH-02:  holiday_type must be: fixed | calculated | substitute | custom
        'public_holiday' and 'observed' are NOT valid — constraint will reject
PH-03:  tenant_id = NULL means global (all tenants)
        Query MUST use .or('tenant_id.eq.X,tenant_id.is.null') — never .eq() alone
PH-04:  To add tenant-specific holidays: INSERT with tenant_id set, holiday_type='custom'

## POS-Specific Rules
POS-01:  POSScreen reads pos_sessions — never writes (EODCashUp owns sessions)
POS-02:  Loyalty points = 10pts/R1 flat (Math.floor(total * 10))
POS-03:  awardLoyaltyPoints() is non-blocking — a sale must never fail due to loyalty
POS-04:  Customer lookup uses .ilike("phone", "%phone%") — partial match intentional
POS-05:  Customer state clears after every sale — never bleeds to next transaction

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
Supabase MCP — data queries, migrations, schema verification

---

# DOCUMENT READ ORDER FOR NEXT SESSION

NORTH-STAR_v1_0.md
SESSION-STATE_v181.md   ← this file
SESSION-CORE_v2_11.md
VIOLATION_LOG_v1_1.md
REGISTRY_v3_2.md
MANIFEST_v3_0.md


---

*SESSION-STATE v181 · NuAi · April 4, 2026*
*HR Session A complete — year view live, holiday bug fixed, 2027 data seeded*
*HRCalendar v1.3 · public_holidays: 40 rows (2025–2027) · tenant_id=null global*
*HEAD: d265780 · Branch: main*
*Next: HR Session B (diary) OR owner actions (sell prices) → first real POS sale*
