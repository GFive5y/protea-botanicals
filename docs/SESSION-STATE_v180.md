# SESSION-STATE v180
## NuAi Platform — Protea Botanicals
## Date: April 4, 2026
## Session: v180 — POSScreen v2 (customer lookup, loyalty, change calc) + ExpenseManager fix

---

# LIVE HEAD
0ce48a1  feat(pos): POSScreen v2 — customer lookup, loyalty points, cash change, session status
c01e7b6  fix(portal): ExpenseManager onClose prop missing — ✕ navigates to P&L tab
111ef27  feat(typography): Phase M+N — HQFraud + HQInvoices metric weight 400→600
feb0afc  feat(typography): Phase L — Distribution.js readability fix
8dc6cea  feat(typography): Phase K — GeoAnalyticsDashboard readability fix

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v180)

## BUG FIX — ExpenseManager ✕ button (commit c01e7b6)
FILE: src/pages/TenantPortal.js
Root cause: ExpenseManager rendered as a tab but is a modal component.
onClose prop not passed → ✕ called undefined() → silently failed.
Fix: renderTab() gained a 4th param onTabChange (setActiveTab).
expenses case now passes onClose={() => onTabChange("pl")}
Both render paths (fullBleed + standard) updated with setActiveTab.
Result: ✕ closes the modal and navigates to P&L tab.

## POSScreen v2 (commit 0ce48a1)
FILE: src/components/hq/POSScreen.js v1.0 → v2.0
11 surgical find/replace changes. No full rewrite.

### Feature 1 — Customer lookup (optional, never blocking)

Phone number input in cart panel, above payment method
"Find" button OR Enter key → queries user_profiles by phone (ILIKE match)
Customer found: green banner shows name, tier, loyalty_points balance,
and live "+X pts this sale" preview as cart changes
Customer not found: amber "Not found — proceeding as walk-in" message
✕ to clear customer and reset lookup
Walk-in: leave field blank, no friction whatsoever


### Feature 2 — Loyalty points earning on POS sale

Points rate: 10 pts per R1 spent (Math.floor(total * 10))
After order INSERT, if customer linked:
awardLoyaltyPoints() → INSERT loyalty_transactions (transaction_type = 'earned')
→ UPDATE user_profiles.loyalty_points
Points earning is non-blocking: try/catch, console.warn on failure
order.user_id now set to customer.id (was null always in v1)
clearCustomer() called after each sale


### Feature 3 — Cash change calculator

Only appears when payMethod === 'cash' AND cart has items
"Tendered R" input with step=10
When tendered >= cartTotal: green "Change: RX.XX" display
Cart clear resets tendered amount to ""


### Feature 4 — Session status badge in POS header

On mount: queries pos_sessions for today's open session (read-only)
"● Session open" (green) if pos_session exists with status='open'
"⚠ No session" (amber) if no open session today
Does NOT open sessions — that is EODCashUp's job
Informational only — never blocks a sale


### Feature 5 — Receipt enhancements

Loyalty member: green "🌿 [Name] earned points" block with +pts and new balance
Walk-in: "Walk-in sale — no loyalty points awarded" note
Customer state cleared after receipt dismissed


### Key design decisions
Both modes work simultaneously:

Phone field always visible, never blocks checkout
Walk-in path: zero extra steps
Loyalty path: one phone lookup, then identical checkout flow
Loyalty capture rate trackable via orders.user_id null vs populated


### Schema used by POSScreen v2
loyalty_transactions INSERT:
user_id, tenant_id, points, transaction_type ('earned'),
reference (orderRef), notes, created_at
user_profiles UPDATE:
loyalty_points = current + earned
orders INSERT:
user_id = customer.id OR null (walk-in)

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
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
src/components/hq/HQPurchaseOrders.js             ✅ LIVE
src/components/hq/HRDashboard.js                  ✅ LIVE
src/components/hq/HQProduction.js                 ✅ LIVE
src/components/hq/HQCogs.js                       ✅ LIVE
src/components/hq/GeoAnalyticsDashboard.js        ✅ LIVE
src/components/hq/Distribution.js          v1.3  ✅ LIVE
src/components/hq/HQFraud.js               v2.0  ✅ LIVE
src/components/hq/HQInvoices.js            v3.0  ✅ LIVE
src/components/hq/ExpenseManager.js        v1.0  ✅ LIVE
src/components/hq/StockOpeningCalibration.js v1.1 ✅ LIVE
src/components/hq/SmartInventory.js        v1.5  ✅ LIVE
src/components/hq/HQTradingDashboard.js    v3.0  ✅ LIVE
src/components/hq/EODCashUp.js             v1.0  ✅ LIVE
src/components/hq/HQStock.js               v3.1  ✅ LIVE
scripts/seed-demo-data.js                  v1.0  ✅ LIVE
src/components/hq/LiveFXBar.js                   PROTECTED — never modify
src/components/StockItemModal.js                 LOCKED — never modify
src/components/PlatformBar.js                    LOCKED — never modify

## POS → PLATFORM DATA FLOW (confirmed v2)
POS sale (customer linked):
orders.user_id       = customer.id
orders.total         = cartTotal
order_items          = line items
stock_movements      = sale_pos, -qty per item
loyalty_transactions = earned, 10pts/R1
user_profiles        = loyalty_points += earned
POS sale (walk-in):
orders.user_id       = null
No loyalty_transactions write
EODCashUp reads:
orders (paid, today) → system_cash_total and card_total
pos_sessions         → opened by EODCashUp Step 1, not POS
HQTradingDashboard reads:
orders (paid, today/period) → revenue charts
stock_movements (sale_pos)  → movement audit

## DEMO SEED STATE
Tenant:    Medi Recreational (b1bad266)
Rows:      2,721 total
Commands:  npm run seed | npm run seed:reset
Note:      Hero SKUs are LED equipment. Real cannabis prices needed from owner.

## DB SCHEMA — CONFIRMED
orders:               field = total (NOT total_amount)
                      status = pending/paid/failed/cancelled/refunded
                      user_id = nullable (walk-in) or user_profiles.id
order_items:          no inventory_item_id FK — via product_metadata jsonb
inventory_items:      no 'notes' column · category is enum
movement_type:        'sale_pos' for POSScreen · 'sale_out' for wholesale/seed
eod_cash_ups:         variance = GENERATED — NEVER insert it
                      field = system_cash_total (not expected_cash)
                      UNIQUE (tenant_id, cashup_date)
pos_sessions:         no total_sales column · POSScreen reads only (never writes)
daily_summaries:      table does NOT exist — do not INSERT
loyalty_transactions: column = transaction_type (NOT type) · use .ilike('earned')
user_profiles:        loyalty_points = operational truth (LL-059)
scan_logs:            NO tenant_id column — never filter by it
tenants.tier:         ALL rows = 'starter' — use tenant_config.tier for real tier

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
BUG-044  HQCogs shipping_alloc_usd column — verify exists, re-save recipes
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
☐ Run first real POS sale → verify full loop:
  Open EODCashUp → set float → open session
  POS Till → find customer → ring sale → complete
  EODCashUp → count cash → reconcile
  HQTradingDashboard → verify sale appears
  HQLoyalty → verify points awarded

## [P2] POSScreen v2 — verify on first real sale
Things to verify:
✓ loyalty_transactions INSERT succeeds (may need extra columns)
✓ user_profiles.loyalty_points updates correctly
✓ order.user_id populated when customer linked
✓ Session badge shows "● Session open" after EODCashUp opens session
✓ Change calculator appears only for Cash payment
If loyalty_transactions INSERT fails:
  Check Supabase table for required NOT NULL columns
  Add missing fields to awardLoyaltyPoints() in POSScreen.js

## [P3] WP-REORDER Phase 2
Status: BLOCKED — needs 2-3 weeks real sales velocity data

## [P4] Pages Not Yet Typography-Verified
Read before touching — do not assume clean:
HQSuppliers.js · HQTransfer.js · HQWholesaleOrders.js
HQMedical.js · AdminDashboard.js

## [P5] POSScreen v3 — future session
Loyalty redemption (points-for-discount)
Receipt print / email
Manager discount override
Loyalty capture rate metric on trading dashboard

## [FUTURE] Unresolved Architectural Decisions
Decision C: Client 2 storefront — Option A/B/C (UNRESOLVED since v149)
Decision D: Yoco per-tenant vs platform account (UNRESOLVED since v149)

---

# CRITICAL RULES

## Code Rules
RULE 0Q:  GitHub write tools = 403 PERMANENTLY — never call them
LL-056:   scan_logs has NO tenant_id column — never filter by it
LL-059:   user_profiles.loyalty_points = operational truth
          loyalty_transactions = audit trail only. Never reconcile.
LL-120:   Never call api.anthropic.com from React — route via ai-copilot EF
LL-124:   Zero cannabis refs on public/Yoco pages
LL-178:   Never change renderTab case without loss list + owner confirm
LL-185:   Read file via GitHub MCP before any edit suggestion
LL-189:   movement_type = 'sale_pos' for POSScreen only
LL-190:   EOD thresholds always from tenant_config.settings
LL-191:   loyalty_transactions: transaction_type column, use .ilike()
LL-196:   fontWeight 300 / 9px labels / 0.3em letterSpacing BANNED
LL-198:   eod_cash_ups variance GENERATED, orders.total not total_amount

## POS-Specific Rules (new v180)
POS-01:   POSScreen reads pos_sessions — never writes (EODCashUp owns sessions)
POS-02:   Loyalty points = 10pts/R1 flat (Math.floor(total * 10))
          Future: pull from loyalty_config. Do not hardcode other values.
POS-03:   awardLoyaltyPoints() is non-blocking — catch, warn, return 0
          A sale must never fail due to loyalty
POS-04:   Customer lookup uses .ilike("phone", "%phone%") — partial match intentional
POS-05:   Customer state clears after every sale — never bleeds to next transaction

## File Safety
PlatformBar.js      LOCKED
LiveFXBar.js        PROTECTED
StockItemModal.js   LOCKED
HQStock.js          PROTECTED — read full file before any change

## Viz Library
Always use ChartTooltip from viz/ — never Recharts default
ChartCard accent: green|blue|amber|red|purple|teal|default
All new charts: isAnimationActive={true}, animationDuration 600-800ms
Gradient stopOpacity: min 0.35 at 5%, 0.02 at 95%

---

# THREE-CLAUDE ECOSYSTEM
Claude.ai   — reads via GitHub MCP, diagnoses, writes specs
Claude Code — implements, verifies, commits, pushes
GitHub MCP  — READ ONLY permanently (403 on writes)

---

# DOCUMENT READ ORDER FOR NEXT SESSION

NORTH-STAR_v1_0.md
SESSION-STATE_v180.md   ← this file
SESSION-CORE_v2_11.md
VIOLATION_LOG_v1_1.md
REGISTRY_v3_2.md
MANIFEST_v3_0.md


---

*SESSION-STATE v180 · NuAi · April 4, 2026*
*POSScreen v2 live — customer lookup, loyalty points, cash change, session status*
*ExpenseManager ✕ button fixed — navigates to P&L tab*
*HEAD: 0ce48a1 · Branch: main*
*Next: owner actions (sell prices, backups, Yoco) → first real POS sale to verify v2*
