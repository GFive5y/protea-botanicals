# SESSION-STATE v178
## NuAi Platform — Protea Botanicals
## Date: April 4, 2026
## Session: v178 — Demo Seed System + TenantPortal Nav + LL-120 Fix + WP-VISUAL A-E

---

# LIVE HEAD
328a5b8  Phase E HQPricing ChartCard accents + animation     ← CURRENT PROD
8c668a0  Phase D HQBalanceSheet 3 new Recharts charts
ee8d0cc  Phase C HQAnalytics + HQLoyalty gradient depth + accents
db87f55  Phase B enterprise MetricTile + P&L chart depth
4e8af5f  Phase A visual foundation (ChartCard v2.0, ChartTooltip v2.0, DeltaBadge v2.0)
17dbaf4  seed-demo-data.js — today's orders timezone fix
a92aaaf  fix(stock): StockOpeningCalibration v1.1 — LL-120 CLOSED
68cb2fa  TenantPortal nav — Daily Operations + Balance Sheet added to Medi Rec
dbeb31c  seed-demo-data.js — today's orders insert fix
c267fc7  REGISTRY v3.3 — SC-01 false pending entry removed
e28f3fd  docs sync v177 (7 new docs, 8 obsolete removed)
f6b065f  SmartInventory v1.5 drag fix (pre-session)

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v178)

## 1. Demo Seed System — scripts/seed-demo-data.js
Status:  LIVE — npm run seed / npm run seed:reset
Purpose: Unblocked all chart development — was blocked by zero sales data
Output:  2,721 rows across 8 tables (90 days of realistic trading data)
Tables seeded:
pos_sessions:        90 rows
eod_cash_ups:        90 rows
stock_movements:     1,002 rows  (movement_type = 'sale_out' for seed)
orders:              404 rows    (status = 'paid')
order_items:         1,002 rows
loyalty_transactions: 124 rows
price_history:       9 rows
daily_summaries:     SKIP (table does not exist yet)
Data realism:

Weekend revenue 40% higher than weekday
3 hero SKUs (LED Grow Light 240W, Grow Tent, LED 100W) — 60% of revenue
2 dead stock SKUs (no movement in 50+ days)
Month-over-month growth ~15%
Today's orders use new Date() directly (timezone-safe since 17dbaf4)

Schema corrections discovered during build:

eod_cash_ups: variance is GENERATED column — never insert it
eod_cash_ups: field = system_cash_total (not expected_cash)
pos_sessions: no total_sales column — use notes for seed tag
orders: field = total (not total_amount), status = 'paid'
stock_movements: 'sale_out' for seed (not 'sale_pos' — that's for POSScreen only)
user_profiles.id FK to auth.users — must use real user UUIDs
SUPABASE_SERVICE_ROLE_KEY in .env (not REACT_APP_ prefixed)

Commands:
npm run seed        # insert 90 days (idempotent via seed tag check)
npm run seed:reset  # wipe + reinsert all seed rows

## 2. TenantPortal Nav Fix — commit 68cb2fa
Problem:  Daily Trading, Cash-Up, Balance Sheet existed only in HQ nav.
Owner had to switch between tenants to view Medi Rec trading data.
Fix applied to src/pages/TenantPortal.js:

Added "Daily Operations" section to CANNABIS_RETAIL_WATERFALL
with tabs: trading (HQTradingDashboard) + cashup (EODCashUp)
Added Balance Sheet to Intelligence section
Added imports: HQTradingDashboard, EODCashUp, HQBalanceSheet
Added renderTab cases: 'trading', 'cashup', 'balance-sheet'
Added to ROLE_SECTIONS: 'operations' for owner + manager roles

Result: Medi Rec portal now has full ops visibility without switching to HQ.

## 3. LL-120 Bug Fix — StockOpeningCalibration v1.1 — commit a92aaaf
Bug:  runAIReview() called api.anthropic.com directly from React → 401 in prod.
Feature completely broken since component was built.
Fix:  Route through ai-copilot Edge Function (same pattern as LL-120 rule):
BEFORE (broken):
fetch("https://api.anthropic.com/v1/messages", { headers: { "Content-Type": "application/json" } })
const raw = data.content?.[0]?.text || "";
AFTER (correct):
fetch(${supabaseUrl}/functions/v1/ai-copilot, {
headers: { "Content-Type": "application/json", Authorization: Bearer ${supabaseAnon} }
})
const raw = (data.reply || "").replace(/json|/g, "").trim();
// + JSON extraction fallback (indexOf/lastIndexOf)
File bumped to v1.1. LL-120 CLOSED for this component.

## 4. WP-VISUAL — Enterprise Visual Overhaul — Phases A-E

### Phase A — Visual Foundation (commit 4e8af5f)
Files: src/components/viz/ChartCard.js, ChartTooltip.js, DeltaBadge.js
src/components/hq/HQOverview.js (11 targeted changes)
ChartCard v2.0:

3px coloured accent top border (green/blue/amber/red/purple/teal)
Hover shadow lift (0 1px 4px → 0 2px 8px + 0 8px 24px)
#FAFAFA header background
12px border-radius
badge + footer slots added
subtitle prop added

ChartTooltip v2.0:

4px left accent border
backdrop-filter: blur(8px) frosted glass
8-colour series palette
700-weight values
Rounded colour dots with box-shadow glow

DeltaBadge v2.0:

↑/↓/→ arrows
sm/md/lg size prop
inverse prop (costs: up = bad)
Neutral state for near-zero values

HQOverview.js:

SectionLabel: green 3px accent bar + #374151 text (was #999999)
MetricTile: label #6B7280 (was #999999), subLabel improved
Revenue gradient: stopOpacity 0.18 → 0.45
Scan gradient: stopOpacity 0.18 → 0.4
Revenue chart animation re-enabled (800ms ease-out)
6 ChartCards upgraded with accent colours + subtitles


### Phase B — Enterprise KPI Cards + P&L Chart Depth (commit db87f55)
Files: src/components/hq/HQOverview.js, HQProfitLoss.js
HQOverview.js — MetricTile full enterprise upgrade:

4px semantic left border (green/amber/red/blue by semantic prop)
useState(hovered) → hover translateY(-1px) lift
28px tabular-nums value, cleaner sub-label hierarchy
tileGrid: minmax(160px) → minmax(180px), gap 12 → 14

HQProfitLoss.js:

P&L Waterfall ChartCard: accent green, h300
Margin Overview ChartCard: accent amber
Cost Composition ChartCard: accent purple, h240, animation 600ms
Revenue vs COGS ChartCard: accent blue, h240, gradients 0.4/0.3, animation 700ms
Page header: "P&L Dashboard" → "Profit & Loss", enterprise typography


### Phase C — HQAnalytics + HQLoyalty (commit ee8d0cc)
Files: src/components/hq/HQAnalytics.js (14 changes)
src/components/hq/HQLoyalty.js (6 changes)
HQAnalytics.js:

Revenue Trend: accent green, gradient 0.12→0.42, animation 800ms
Scan Activity Overview: accent teal, gradient 0.18→0.4
Scan Volume 7-Day Comparison: accent blue, subtitle
Weekly Scan Outcomes: accent purple, subtitle
Inventory Mix donut: accent amber, animation 600ms
Production Status bar: accent teal
Scans tab Daily Trend: accent teal, gradient 0.18→0.4
Outcomes by QR Type: accent purple
KPI function upgraded: 3px semantic left border, #6B7280 label,
22px/600 value, tabular-nums

HQLoyalty.js:

Points Issued vs Redeemed: accent green, gradient 0.2→0.42, animation 700ms
Points info series gradient: 0.15→0.35
Points Balance donut: accent purple, animation 600ms


### Phase D — HQBalanceSheet (zero → 3 charts) (commit 8c668a0)
File: src/components/hq/HQBalanceSheet.js
Added Recharts + ChartCard imports (file had none previously).
3 new visualizations:

Asset Composition Donut

Inventory / Receivables / Fixed Assets breakdown
Accent green, animation 600ms
Renders after KPI strip in Balance Sheet tab


Capital Structure Bar

Assets vs Liabilities vs Equity side-by-side
Accent blue, animation 700ms
Semantic colours: green=Assets, red=Liabilities, green=Equity


Cash Flow Waterfall (ComposedChart)

Customer Cash → Supplier Cost → OpEx → Net Operating → CapEx → Net Cash
Colour-coded: green=positive, red=negative, dark green=total
Accent teal, animation 700ms
Renders in Cash Flow tab when cashFromCustomers > 0




### Phase E — HQPricing (commit 328a5b8)
File: src/components/hq/HQPricing.js
HQPricing already had 2 charts (BarChart + ScatterChart) — added treatment:

Avg Margin by Channel: accent green, subtitle "reference lines at 20% and 35%"
Price vs Margin scatter: accent blue, subtitle "All SKUs · coloured by channel"
Margin bar: animation enabled (600ms ease-out)


---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/components/viz/ChartCard.js             v2.0  ✅ LIVE (4e8af5f) — accent borders, hover lift
src/components/viz/ChartTooltip.js          v2.0  ✅ LIVE (4e8af5f) — blur, 8-colour palette
src/components/viz/DeltaBadge.js            v2.0  ✅ LIVE (4e8af5f) — arrows, sizes, inverse
src/components/hq/HQOverview.js             v4.1  ✅ LIVE (db87f55) — enterprise MetricTile
src/components/hq/HQProfitLoss.js           v3.0  ✅ LIVE (db87f55) — P&L chart depth
src/components/hq/HQAnalytics.js            v4.4  ✅ LIVE (ee8d0cc) — 14 visual upgrades
src/components/hq/HQLoyalty.js              ✅ LIVE (ee8d0cc) — gradient + accent + animation
src/components/hq/HQBalanceSheet.js         v1.1  ✅ LIVE (8c668a0) — 3 new charts
src/components/hq/HQPricing.js              v4.3  ✅ LIVE (328a5b8) — accent treatment
src/components/hq/StockOpeningCalibration.js v1.1 ✅ LIVE (a92aaaf) — LL-120 FIXED
src/pages/TenantPortal.js                   v2.5  ✅ LIVE (68cb2fa) — Daily Ops + Balance Sheet
scripts/seed-demo-data.js                   v1.0  ✅ LIVE (17dbaf4) — 2,721 demo rows
src/components/hq/SmartInventory.js         v1.5  ✅ LIVE (f6b065f) — drag FIXED
src/components/hq/HQTradingDashboard.js     v3.0  ✅ LIVE
src/components/hq/EODCashUp.js              v1.0  ✅ LIVE
src/components/hq/POSScreen.js              v1.0  ✅ LIVE
src/components/hq/HQStock.js                v3.1  ✅ LIVE
src/components/hq/LiveFXBar.js                    PROTECTED — never modify
src/components/StockItemModal.js                  LOCKED ��� never modify
src/components/PlatformBar.js                     LOCKED — never modify

## PAGES WITH ENTERPRISE CHARTS (post WP-VISUAL)
Page              Charts                                        Status
─────────────────────────────────────────────────────────────────────────
HQOverview        Revenue Area, Scan Area, QR Donut+HBar,      ✅ Phase A+B
MarginGauge, Category bars
HQProfitLoss      Waterfall, Dual Margin Gauge, Cost Donut,    ✅ Phase B
Revenue vs COGS Area
HQAnalytics       Revenue Trend, Scan Activity, Grouped Bar,   ✅ Phase C
Stacked Bar, Inventory Donut, Production Bar,
Conversion Funnel, Scan Outcomes
HQLoyalty         Points Area, Balance Donut                   ✅ Phase C
HQBalanceSheet    Asset Donut, Capital Structure Bar,          ✅ Phase D
Cash Flow Waterfall
HQPricing         Margin HBar, Price vs Margin Scatter         ✅ Phase E
HQTradingDashboard 30-day bar, Hourly area, Category HBars    ✅ pre-existing
StockIntelPanel   12-week heatmap, 7 intel panels, AI insights ✅ pre-existing

## VIZ/ LIBRARY — CURRENT STATE
src/components/viz/ChartCard.js       v2.0 — accent borders, subtitle, badge, footer slots
src/components/viz/ChartTooltip.js    v2.0 — blur, semantic colours, 700-weight values
src/components/viz/DeltaBadge.js      v2.0 — ↑↓→ arrows, sm/md/lg, inverse, neutral
src/components/viz/SparkLine.js             — inline sparkline (unchanged)
src/components/viz/BulletChart.js           — bullet chart (unchanged)
src/components/viz/InlineProgressBar.js     — progress bars (unchanged)
src/components/viz/PipelineStages.js        — pipeline visualization (unchanged)
src/components/viz/Icon.js                  — icon library (unchanged)
src/components/viz/index.js                 — barrel exports (unchanged)

## DEMO SEED STATE
Tenant:    Medi Recreational (b1bad266)
Rows:      2,721 total
Period:    90 days (Jan 5 – Apr 4, 2026)
Commands:  npm run seed | npm run seed:reset
Note:      Today shows R0 revenue — seed uses historical dates.
Today's data will populate naturally from first real POS sale.
Hero SKUs are LED equipment (Grow Lights) — not cannabis.
Real cannabis prices needed from owner.

## DB SCHEMA — CONFIRMED
orders:             status = pending/paid/failed/cancelled/refunded (NOT 'completed')
order_items:        no inventory_item_id FK — via product_metadata jsonb
inventory_items:    no 'notes' column · category is enum
movement_type:      'sale_pos' for POSScreen (NOT 'sale_out') — LL-189
'sale_out' for wholesale/seed only
pos_sessions:       ✅ LIVE (tenant_id, session_date, opening_float, status)
eod_cash_ups:       variance = GENERATED column — NEVER insert it
field = system_cash_total (not expected_cash)
UNIQUE (tenant_id, session_date)
daily_summaries:    table does NOT exist yet — seed skips with WARN
loyalty_config:     always .eq('tenant_id', tenantId) — 4 tenant rows exist
loyalty_transactions: column = transaction_type (NOT 'type') — LL-191
scan_logs:          NO tenant_id column (LL-056) — never filter by it
tenants.tier:       ALL rows = 'starter' — use tenant_config.tier for real tier

## TENANT STATE
Medi Recreational  b1bad266-ceb4-4558-bbc3-22cfeeeafe74
tier:       pro (in tenant_config — tenants.tier = 'starter' always)
Inventory:  184 SKUs / 185 active items
sell_price: R0 on most — owner action required
Seed data:  2,721 rows live — charts populated
Protea Botanicals  43b34c33...  (HQ operator — internal)
Pure PTV           f8ff8d07...  (Client 1)
TEST SHOP          4a6c7d5c...  (dev only — no tenant_config row)

## OPEN BUGS
BUG-043  Terpene qty inflation (23 items 2-3x) — physical count required
BUG-044  HQCogs shipping_alloc_usd column — verify exists, re-save recipes
SQL: SELECT column_name FROM information_schema.columns
WHERE table_name='product_cogs' AND column_name='shipping_alloc_usd';
check_reorder() trigger — UNKNOWN status (raised v139, never confirmed)
SQL: SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%reorder%';

## CLOSED THIS SESSION
LL-120  StockOpeningCalibration — direct api.anthropic.com call → FIXED (a92aaaf)
VL-007  Attempted GitHub write tool after RULE 0Q (logged)
VL-008  Referenced stale SESSION-STATE v175 as authoritative (logged)

---

# NEXT PRIORITIES

## [P1] Owner Actions (block first real sale)

Set sell_price on Medi SKUs (most are R0 — hero items are LED equipment)
Enable Supabase backups (Settings → Add-ons)
Yoco sole-trader signup → get sk_test_ keys
Run first real POS sale → verify full loop:
POS → stock deduction → trading dashboard → EOD cash-up


## [P2] Typography & Font Crisp-Up
Status: IDENTIFIED — deferred from WP-VISUAL
Issues:

Some text areas remain hard to read (grey wash in sub-labels)
Font rendering inconsistent across pages (mixed old/new token usage)
Pages not yet touched by WP-VISUAL: HQSuppliers, HQProduction,
HQCogs, HQTransfer, HQWholesaleOrders, RetailerHealth
Approach: Systematic token pass on remaining pages — new session


## [P3] POSScreen v2
Status:  v1.0 live. v2 NOT STARTED.
Features: Customer lookup at till, loyalty points display, receipt print/email
Gates:   Staff training experience + customers see points earned

## [P4] SESSION-CORE Update
SESSION-CORE v2.10 needed — add:

LL-120 closed (StockOpeningCalibration v1.1)
seed-demo-data.js schema facts (movement_type, eod_cash_ups variance)
WP-VISUAL viz/ library v2.0 component specs
TenantPortal CANNABIS_RETAIL_WATERFALL additions


## [P5] WP-REORDER Phase 2
Status:  BLOCKED — needs 2-3 weeks real sales velocity data
Unblock: After first real sales week

## [FUTURE] Unresolved Architectural Decisions
Decision C: Client 2 storefront — Option A/B/C (UNRESOLVED since v149)
Decision D: Yoco per-tenant vs platform account (UNRESOLVED since v149)

---

# CRITICAL RULES (always re-read)

## Code Rules
RULE 0Q:  GitHub write tools = 403 PERMANENTLY — never call them
Claude Code (VS Code) does ALL file writes
LL-120:   NEVER call api.anthropic.com from React — route via ai-copilot EF
LL-124:   ZERO cannabis refs on public/Yoco pages (Visa/Mastercard prohibited)
LL-125:   Yoco in-person SDK = Android/iOS only — cannot run in React web
LL-056:   scan_logs has NO tenant_id column — never filter by it
LL-178:   Never change renderTab case without loss list + owner confirm
LL-180:   HQStock.js PROTECTED — read full file before any change
LL-183:   PowerShell: no && operator, separate lines
LL-185:   Read file via GitHub:get_file_contents before any edit
LL-189:   movement_type = 'sale_pos' for POSScreen (NOT 'sale_out')
LL-190:   EOD thresholds always from tenant_config.settings (never hardcoded)
LL-191:   loyalty_transactions: use transaction_type column (NOT type)
status = 'paid' always (NOT 'completed')
tenant_id on every INSERT (Rule 0F)
loyalty_config: always .eq('tenant_id', tenantId)
tenants.tier = 'starter' always — use tenant_config.tier for real tier
eod_cash_ups: variance is GENERATED — never insert it
seed: movement_type = 'sale_out' (NOT 'sale_pos' — that's POSScreen only)

## File Safety Rules
PlatformBar.js      LOCKED — never modify
LiveFXBar.js        PROTECTED — never modify
StockItemModal.js   LOCKED — never modify
HQStock.js          PROTECTED — read full file before any change

## Viz Library Rules
ALWAYS use ChartTooltip (viz/) — NEVER use Recharts default tooltip
ChartCard accent prop options: green | blue | amber | red | purple | teal | default
DeltaBadge inverse prop: use for costs (up = bad)
MetricTile semantic prop: success | warning | danger | info (drives left border colour)
All new charts: isAnimationActive={true} + animationDuration (600-800ms)
Gradient stopOpacity: minimum 0.35 on offset 5%, 0.02 on offset 95%

---

# THREE-CLAUDE ECOSYSTEM
Claude.ai   — strategy, architecture, Supabase MCP, audit docs, WP specs, code specs
Claude Code — VS Code extension: file edits, npm verify, git commit, git push
GitHub MCP  — READ ONLY permanently (403 on all writes)
EXECUTION PATTERN:

Claude.ai reads files via GitHub MCP, diagnoses, writes spec
User gives spec to Claude Code in VS Code
Claude Code reads from disk, implements, verifies, commits, pushes
Claude.ai confirms via screenshots

SEED COMMANDS:
npm run seed        — insert 90 days (checks for existing seed tag first)
npm run seed:reset  — wipe all seed rows + reinsert

---

# DOCUMENT READ ORDER FOR NEXT SESSION

NORTH-STAR_v1_0.md        — WHY (vision, SA market, modules)
SESSION-STATE_v178.md     — WHERE WE ARE (this file)
SESSION-CORE_v2_10.md     — HOW (rules, LLs, schema) — needs update
VIOLATION_LOG_v1_1.md     — WHAT WENT WRONG (VL-007, VL-008 added)
REGISTRY_v3_3.md          — WHAT EXISTS by capability
MANIFEST_v3_0.md          — WHAT EXISTS by filename


---

*SESSION-STATE v178 · NuAi · April 4, 2026*
*WP-VISUAL Phases A-E complete · 5 pages enterprise-upgraded · viz/ v2.0*
*Demo seed: 2,721 rows live · LL-120 closed · TenantPortal nav fixed*
*HEAD: 328a5b8 · Branch: main*
*Next: owner actions (sell prices, backups) → first real sale → typography pass*
