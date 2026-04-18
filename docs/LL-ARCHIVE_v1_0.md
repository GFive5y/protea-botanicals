# LL-ARCHIVE.md — NuAi Platform
## Lessons Learned LL-001 through LL-173
## Version: v1.0 · April 4, 2026
## Purpose: Preserve all early LLs removed when SESSION-CORE was upgraded from v2.3 to v2.8
## Source: SESSION-CORE v2.3 (March 30, 2026) + SESSION_AUDIT_COMPLETE

> These LLs are PERMANENT MEMORY. They encode hard-won lessons from 150+ sessions.
> They inform how to handle edge cases even when not explicitly violated.
> Read these when debugging unexpected behaviour — the answer is probably here.

---

## LL-001 through LL-056 — Core Schema + Data Integrity

```
LL-001: loyalty_config has NO updated_at column.
LL-002: batches has NO created_at — ORDER BY production_date.
LL-003: customer_messages .body NOT .content.
LL-004: ticket_messages .content NOT .body.
LL-005: scan_logs.location is JSONB {lat, lng, city, country}.
LL-006: scan_logs.metadata is JSONB — use -> or ->> in SQL.
LL-007: orders.line_total is a GENERATED column — never INSERT it.
LL-008: NEVER upsert user_profiles — UPDATE only (unique constraint on id).
LL-009: inventory_items has no category_path column.
LL-010: AVCO trigger fires on INSERT to stock_movements only. Not on UPDATE.
LL-011: product_pricing has THREE price columns: wholesale_price, retail_price, website_price.
LL-012: QR codes use HMAC-SHA256 with server secret from sign-qr EF — never client-side.
LL-013: ScanResult.js is 4.8+ — NEVER touch without reading entire file first.
LL-014: batches.qr_code stores the raw code string (not URL).
LL-015: scan_logs has NO tenant_id — scope via inventory_items join.
LL-016: loyalty_transactions uses user_id not customer_id.
LL-017: Admin portal queries MUST include tenant_id filter even with RLS.
LL-018: MANIFEST must be read before every build — duplication happened without it (v84).
LL-019: supply_chain table does NOT exist — use inventory_items + stock_movements.
LL-020: customer_segments table does NOT exist — derived from loyalty data.
LL-021: Session docs must be READ BEFORE WRITING — v84 overwrote 526-line doc with 274 lines.
LL-022: StorefrontContext resolves tenant from domain — never from auth session.
LL-023: useTenant() is async — always await tenant before using tenantId.
LL-024: Auto-created shop items (from HQTransfer receive) always at sell_price=0.
         Owner must set sell_price via Admin Stock after receive.
LL-025: HQOverview uses systemHealthContext — reads scan_logs via inventory_items join.
LL-026: AdminDashboard inline alerts are in component itself — not in PlatformBar (v86).
LL-027: PayFast ITN webhook must validate payment_status=COMPLETE before updating order.
LL-028: Supabase storage bucket = 'sup-docs'. Never create new buckets without owner confirm.
LL-029: loyalty_transactions channel = 'qr_scan' | 'checkout' | 'manual' | 'ai'.
LL-030: QR codes link to /scan/{code} — not /product/{id}.
LL-031: batches.batch_id ≠ batches.id — batch_id is human-readable (PR-260322-...).
LL-032: production_run_inputs table has input_qty_g, input_item_id — no batch reference.
LL-033: AVCO calculation: (existing_qty × existing_cost + new_qty × new_cost) / total_qty.
LL-034: inventory_items.category_id does NOT exist — use .category (text enum).
LL-035: purchase_order_items.unit_cost is in ZAR (post-FX conversion).
LL-036: scan_logs velocity check: 3+ scans in 60s = anomaly_score += 20.
LL-037: loyalty_config.programme_health_score is computed field — not stored.
LL-038: HQFraud reads anomaly_score from scan_logs — not from user_profiles.
LL-039: Correct find string for ScanResult.js operations — too generic = wrong file match (S8).
LL-040: FoodShopCard allergens.length crash — allergen_flags can be null — use ?. (S9).
LL-041: CommsPanel duplicate expiring blocks from multiple incremental patches (S11).
LL-042: systemHealthContext.js scans query uses legacy 'scans' table — needs migration to scan_logs.
LL-043: product_pricing.retail_price ≠ inventory_items.sell_price — two separate tables.
LL-044: Loyalty tier upgrades trigger WhatsApp via send-notification EF — not email.
LL-045: WorkflowGuide tab context uses usePageContext() — must be called in same component.
LL-046: PlatformBar.js onNavigate MUST be () => {} (no params) — custom event format.
LL-047: AdminQRCodes inventory_item_id link is SQL-only — no UI for it yet.
LL-048: HRDashboard has 13 tabs — all HR files are in src/components/hq/ NOT src/components/hr/.
LL-049: ProteaAI uses streaming response from ai-copilot EF — chunks via SSE.
LL-050: AppShell DevErrorCapture wraps children — React error boundary captures console.error.
LL-051: HQ/admin components use Inter font ONLY. NEVER Outfit, Cormorant, Jost.
         Customer-facing pages (Shop, ScanResult): Cormorant Garamond + Jost (legacy, maintained).
LL-052: NavSidebar groups: Operations, Finance, Intelligence, Platform, HR, Food & Bev.
LL-053: WorkflowGuideContent.js has guide per tab — hq-production is 4-profile-aware since v1.2.
LL-054: WholesalePortal.js writes wholesale_order alert — visible in HQ admin alerts.
LL-055: HQProduction.js SUB_TABS differ by profile — BOM hidden for general_retail.
LL-056: scan_logs has NO tenant_id column. NEVER filter by tenant_id on scan_logs.
         Scope: join to inventory_items on qr_codes which has tenant_id.
```

---

## LL-057 through LL-099 — Platform Generalisation + HR + Medical

```
LL-057: showCannabisField() from industryProfiles.js = gate for cannabis UI.
LL-058: showMedicalField() from industryProfiles.js = gate for medical UI (SAHPRA).
LL-059: PANEL_CATS_BY_PROFILE in HQStock — 5 profile maps. Never use static PANEL_CATS.
LL-060: HQLoyalty v4.0 has 10 tabs — always read the file before adding tabs.
LL-061: ProteaAI CODEBASE_FACTS string is stale — owner must update it.
         Search: const CODEBASE_FACTS = `
         Contains wrong state (says "Vercel deploy pending", WP-FIN blocked, etc.)
LL-062: HQMedical.js is GATED — only visible when showMedicalField() is true.
LL-063: document_log.reference = the document's own reference number (e.g., PQG2600182).
         document_log.id = UUID of the log entry itself. NEVER mix these.
LL-064: production_runs.production_date: use started_at, not production_date (column DNE).
LL-065: QC failed (qc_passed=false) — no production_in stock movement (blocked by code).
LL-066: yield_pct < 85% — system_alert — PlatformBar (food_beverage profile).
LL-067: food_recipe_lines: qty_per_unit (not quantity). allergens auto-propagate from ingredients.
LL-068: Food S1–S2 allergen auto-propagation: ingredient.allergen_flags → recipe.allergens.
LL-069: HACCP CCP deviation — NCR auto-raised — system_alerts INSERT.
LL-070: Cold chain: breach detected — system_alert, alert_type='cold_chain_breach'.
LL-071: Recall: food_recall_events links to food_recipes.id via recipe_id.
LL-072: HQFoodSafety: cert expiry ≤7d → severity=warning. Expired → severity=critical.
LL-073: All food F&B modules (S1-S8) complete: HQFoodIngredients, HQRecipeEngine, HQHaccp,
         HQFoodSafety, HQNutritionLabel, HQColdChain, HQRecall, HQFoodIntelligence.
LL-074: HQDashboard import + render additions can be done twice (v109) — grep before patching.
LL-075: ⭐ DISK IS TRUTH. Session docs can say "pending" when file is 100% built.
         ALWAYS verify: Get-Content src\components\hq\FILENAME.js | Select-Object -First 3
         If file exists → it's built. Update docs. Do not rebuild.
LL-076: WP-HR all 12 sub-packages existed when v111 planned to rebuild them.
         HRStaffDirectory, HRStaffProfile, HRLeave, HRTimesheets, HRContracts,
         HRDisciplinary, HRComms, HRCalendar, HRLoans, HRPerformance, HRSettings, HRPayroll.
LL-077: HRDashboard.js SystemStatusBar was DELETED (WP-AI-UNIFIED) — checking for it = 404.
LL-078: PowerShell Select-String with | inside pattern string → returns NOTHING silently.
         Use: $matches = Select-String -Pattern "pattern1|pattern2" -Path file.js
LL-079: ScanResult.js profile-adaptive since S12 — FoodProductCard, GeneralProductCard, ProductCard.
LL-080: PlatformBar.js profile-adaptive since WP-Z — reads industryProfile from context.
LL-081: HQAnalytics.js profile-adaptive since S12 — useTenant() at component root.
LL-082: purchase_order_items.landed_cost_zar is the ZAR value — not subtotal.
         subtotal = foreign currency amount × fx_rate. landed_cost_zar = post-FX ZAR total.
LL-083: ⭐ TRUNCATED READS DROP DATA SILENTLY.
         REGISTRY.md Section 2 dropped 26 signatures in v127 due to truncated read.
         ALWAYS verify line count before updating: (Get-Content file.md).Count
         New version must be >= previous version line count. Shorter = data loss = hard failure.
LL-084: ⭐ DOCUMENT DEDUP GATE.
         NEVER confirm stock_movements on document whose reference is in document_log.
         HQDocuments.js v2.4 enforces this. Reference = the supplier document reference number.
         PQG2600182 was ingested 3× → 57 movements → 23 terpene quantities 2-3× inflated.
LL-085: ⭐ NEVER DECLARE FUNCTIONS INSIDE try{} IN DENO/TYPESCRIPT.
         allocateLumpSumCosts() was inside try{} → SyntaxError in Deno.
         Functions must be at module level. Constants too.
LL-086: ⭐ FOOD FIELDS ONLY ON production_runs. NEVER on batches.
         food_beverage recipe form fields (allergens, QC, temp_zone, lot#, etc.) live on
         production_runs. Batches table has no food columns. Writing food fields to batches
         → "column does not exist" error. Confirmed March 24, 2026.
LL-087: isFoodBev and isGeneralRetail MUST be declared before formatGroups computation.
         Using these flags before declaration = "Cannot access before initialization" error.
         Always declare at top of function before any uses.
LL-088: product_formats.is_cannabis must be set correctly.
         Filters on is_cannabis=true must not exclude non-vape cannabis formats.
         Always verify which formats are flagged when implementing format filters.
LL-089: product_format_bom REQUIRES RLS policies for tenant INSERT/SELECT/DELETE.
         product_formats dropdown MUST render {f.label || f.name || f.key} — DB column is label.
         Using f.name → undefined → dropdown blank.
LL-090: food_recipes JOIN food_recipe_lines CANNOT use nested .select() in Supabase.
         Use two separate queries and merge in JavaScript.
LL-091: HRContracts generates HTML → PDF via browser print dialog (no PDF library).
LL-092: HRPayroll export uses SimplePay-compatible CSV format. Direct SimplePay API is out of scope.
LL-093: HRLeave conflict checker queries all leave requests for same date range, same tenant.
LL-094: HRCalendar has 13 event layers — SA public holidays auto-populated.
LL-095: useAIUsage() takes dailyLimit (number) NOT tenantId (UUID). UUID = instant 403 from EF.
LL-096: leave_requests.status = 'pending' | 'approved' | 'rejected'. No 'cancelled' status.
LL-097: employees table has status = 'active' | 'on_leave' | 'terminated'.
LL-098: HRStockView reads global inventory_items — not scoped to HR tenant. By design.
LL-099: stock_take_sessions: status = 'pending' | 'in_progress' | 'review' | 'approved'.
```

---

## LL-100 through LL-132 — Finance + Loyalty + Multi-tenant + Platform

```
LL-100: product_cogs MUST include tenant_id on INSERT. RLS enabled.
         Silent fail (0 rows) without tenant_id.
LL-101: product_cogs.recipe_name = human-readable name. NOT a FK. Just a text label.
LL-102: expenses.category = 'opex' | 'wages' | 'capex' | 'tax' | 'other'.
LL-103: expenses.foreign_currency_code + foreign_currency_amount for non-ZAR expenses.
         ZAR equivalent = foreign_currency_amount × fx_rate_at_time.
LL-104: HQDocuments.js amber badge = document flagged as CAPEX/OPEX by AI (amber=pending review).
LL-105: process-document v1.9 classifyExpenseDocument():
         CAPEX keywords: stirrer, hot plate, pipette, beaker, microscope, balance, pump, computer,
         laptop, server, vehicle, machinery, equipment, furniture.
         OPEX keywords: freight, logistics, shipping, courier, rent, utilities, electricity,
         internet, accounting, legal, marketing, insurance, bank charges.
         Foreign: USD/EUR/CNY → converted to ZAR at 18.5 fallback.
LL-106: expenses.expense_date is required. No default. Always pass from form.
LL-107: HQProfitLoss.js: CAPEX never subtracted from P&L — shown as memo only.
         OPEX + wages are the deductions. CAPEX lives in Balance Sheet.
LL-108: wholesale revenue = SUM(sale_out stock_movements × sell_price from product_pricing).
         NOT from orders table (that is online/retail only).
LL-109: aged_debtors: invoice.due_date + 30/60/90 day buckets. status='unpaid' only.
LL-110: HQDashboard.js IS IN src/pages/ not src/components/. Never do full rewrite for new portals.
LL-111: stock_movements column is unit_cost (NUMERIC). NOT unit_cost_zar.
         The field stores ZAR value. Name is misleading. Never use unit_cost_zar on movements.
LL-112: invoices.status = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'.
LL-113: reserve_stock() DB function: args = (item_id UUID, quantity NUMERIC, order_id UUID).
         Returns: available_qty AFTER reservation. Raises exception if insufficient.
LL-114: available_qty = quantity_on_hand - reserved_qty. Never stored. Always computed.
         SQL: SELECT ii.quantity_on_hand - COALESCE(SUM(sr.quantity_reserved),0) as available_qty
         FROM inventory_items ii LEFT JOIN stock_reservations sr ON sr.inventory_item_id = ii.id
         WHERE ii.id = $1 GROUP BY ii.quantity_on_hand
LL-115: stock_reservations uses inventory_item_id (not item_id), quantity_reserved (not quantity).
LL-116: invoices uses supplier_id for ALL partners (customers, distributors, wholesale buyers).
         Column is invoice_number (NOT reference — that column does not exist).
         Always use supplier_id + invoice_number in queries.
LL-117: reserve_stock() DB function must exist before any component calls it.
         Verify: SELECT proname FROM pg_proc WHERE proname = 'reserve_stock';
LL-118: product_pricing channel values: 'wholesale' | 'retail' | 'website'. Lowercase always.
LL-119: HQWholesaleOrders invoice auto-generated on Ship (status='in_transit'→'shipped').
         Do not create invoice manually — ship action triggers it.
LL-120: ⭐ ALL ANTHROPIC API CALLS VIA ai-copilot EDGE FUNCTION. NEVER FROM REACT.
         React cannot call api.anthropic.com. No REACT_APP_ANTHROPIC_API_KEY.
         Pattern: fetch(`${SUPABASE_URL}/functions/v1/ai-copilot`, { auth: ANON_KEY })
         ANTHROPIC_API_KEY is a Supabase server-side secret. Never in .env files.
LL-121: ai-copilot EF input: { messages: [{role, content}], userContext: {tenantId, tab} }
         Output: { reply: string, model: string, usage: {tokens}, error: null|string }
LL-122: get-fx-rate EF: returns { usdZar, eurZar, gbpZar, cached, fallback }.
         fallback: true when live rate unavailable. Rate: 18.50 ZAR/USD default.
LL-123: sign-qr EF MUST be deployed with --no-verify-jwt. QR scanner = unauthenticated user.
LL-124: ⭐ ZERO CANNABIS REFERENCES ON PUBLIC/YOCO-INTEGRATED PAGES.
         Cannabis = prohibited business under Visa/Mastercard rules on Yoco.
         CBD = medicinal = also prohibited on Yoco.
         Public pitch: "specialty retail / regulated consumer goods / health & wellness".
LL-125: ⭐ YOCO IN-PERSON SDK = ANDROID/iOS BLUETOOTH ONLY.
         Cannot run in React web app. NEVER attempt Yoco in-person SDK in browser.
         For web POS: manual in-store sale recording (cash/card type selected by cashier).
LL-126: PayFast integration: yoco.com doesn't need CIPRO for sole trader test account.
         Sole trader signup: ID number + bank account. No company registration needed.
LL-127: ⭐ HOOKS BEFORE EARLY RETURNS — RULES OF HOOKS.
         useTenant() (all hooks) must be called BEFORE any conditional return.
         Breaking: if (loading) return <Spinner>; ... const {tenant} = useTenant();
         Correct: const {tenant} = useTenant(); ... if (loading) return <Spinner>;
LL-128: After find/replace touching JSX with <a> tags: verify count immediately.
         Select-String -Path FILE.js -Pattern "<a " | Measure-Object
LL-129: Subdomain availability check BEFORE brand name commit.
         nexai.com/io/ai/co/co.za all taken. nexai-erp.co.za available.
LL-130: Vercel project rename changes subdomain. Env vars + deploy hooks stay intact.
LL-131: NEVER hardcode tenant UUID in component code. Always use useTenant().
LL-132: user_profiles_role_check allows: customer, admin, retailer, staff, hr, management.
         'manager' and 'operator' = silent INSERT fail (constraint violation).
```

---

## LL-133 through LL-173 — March 28-30 Sessions (WP-MULTISITE, WP-O, WP-FIN)

```
LL-133: Domain + CIPC check BEFORE committing to brand name.
LL-134: Inline SVG (not Canvas) for instant-render charts in static HTML marketing pages.
LL-135: Verify correct deploy folder before Vercel push (nexai-web vs Documents/nexai-web).
LL-136: Never mention Claude or Anthropic in ANY public-facing content.
LL-137: AI demo questions should be industry-neutral; responses do the targeting.
LL-138: WP spec version numbers go stale fast. Disk is always truth.
LL-139: UNIQUE constraint required before ON CONFLICT. Verify: \d tablename.
LL-140: NOT NULL column addition: (1) add nullable, (2) backfill, (3) set NOT NULL.
LL-141: PowerShell Select-String OR pattern: "pattern1|pattern2" (no backslash).
LL-142: File may be complete even when MANIFEST says "—". Always check disk.
LL-143: File header comments may not reflect actual content. Read useEffect + state.
LL-144: PayFast block + inventory deduction in CheckoutPage must be preserved exactly.
LL-145: P&L file is more complete than spec states. Screenshot before building.
LL-146: HQDashboard.js is in src/pages/ NOT src/components/hq/.
LL-147: Grep for replace target before find/replace — avoid creating duplicates.

LL-148: loyalty_config.tier_thresholds is JSONB: {bronze:0, silver:200, gold:500, platinum:1500, harvest_club:2500}
LL-149: loyalty_config.category_multipliers is JSONB keyed by category string.
LL-150: loyalty_transactions.pts_override bypasses category multiplier for promotional SKUs.
LL-151: CheckoutPage: first_online_purchase_bonus = 200pts, one-time, detected via orders.count.
LL-152: CheckoutPage: cross_sell_bonus = 150pts for first purchase from new category.
         Tracked via user_profiles.category_flags JSONB.
LL-153: Harvest Club tier = 2,500pts + multi-category purchase history (category_flags).
LL-154: Programme Health Score = composite (churn_risk, engagement, revenue_vs_cost).
         Not stored — computed on read in HQLoyalty.js AI Engine tab.
LL-155: WP-O phase 2 adds loyalty_ai cron edge function (NOT YET DEPLOYED as of v153).
         7 jobs: churn rescue, birthday, expiry, streak, stock boost, tier upgrade, weekly brief.
LL-156: ScanResult v4.9: channel='qr_scan'. CheckoutPage v2.4: channel='checkout'.
LL-157: Storefront resolution: tenants.domain → storefrontTenantId in StorefrontContext.
         Dev fallback: REACT_APP_DEV_TENANT_ID in .env.local.
LL-158: stock_transfers.reference format: TRF-YYYYMMDD-XXXX (auto-generated, UNIQUE DB constraint).
LL-159: Stock transfer auto-creates shop item on receive if SKU/name not found.
         New item: is_active=true, sell_price=0. Owner sets price via Admin Stock.
LL-160: Cancel in-transit transfer: reverses HQ deduction + inserts reversal movement.
LL-161: SessionStorage handoff: HQRecipeEngine "Start Batch" → HQProduction.
         sessionStorage.setItem('fnb_start_batch', JSON.stringify({recipe_id, name, ...}))
         HQProduction reads on mount and pre-fills NewRunPanel form.
LL-162: F&B to HACCP integration: food_recipes (approved) populate HACCP log recipe dropdown.
         production_runs.batch_lot_number → HACCP log lot dropdown.
LL-163: Data migration of 9 tables from HQ to Pure PTV complete (March 27, 2026).
         Tables: product_cogs(13), product_pricing(36), inventory_items(23),
         stock_movements(42), purchase_orders(2), orders(11),
         loyalty_transactions(137), expenses(2), batches(10).
LL-164: Test wholesale partners in DB: Cape Town Vapes, Green Leaf Dispensary (Pure PTV tenant).
LL-165: AVCO backfill status (March 27, 2026): 0 items missing weighted_avg_cost.
         SQL: SELECT COUNT(*) FROM inventory_items
              WHERE (weighted_avg_cost IS NULL OR weighted_avg_cost = 0)
              AND category IN ('raw_material','terpene','hardware');
         Should return 0.
LL-166: HQBalanceSheet.js v1.0 (29ecb89): 2 sub-tabs (Balance Sheet + Cash Flow).
         Accounting equation check badge: Assets = Liabilities + Equity.
         Data: inventory (AVCO × qty), invoices (AR), expenses (CAPEX = fixed assets), POs (AP).
LL-167: HQProfitLoss confirmed live numbers (March 30, 2026):
         Website: R4,400 (11 orders). Wholesale: R4,000 (10 sale_out). Total: R8,400.
         Gross: 70.49%. Net: 67.18%. CAPEX memo: R3,552.05.
LL-168: StorefrontContext Dev fallback: REACT_APP_DEV_TENANT_ID = Pure PTV UUID.
         Used when hostname = localhost/127.0.0.1 → returns Pure PTV as storefront tenant.
LL-169: Pure PTV domain confirmed: pureptv.co.za. Medi domain: medirecreational.co.za (pending).
LL-170: TenantSetupWizard Step 5 (create-admin-user EF) = STATUS UNKNOWN (v176).
LL-171: PlatformBar.js v1.2 profile-adaptive — reads industryProfile from context.
         onNavigate must be () => {} (no params). Never pass event or route string.
LL-172: systemHealthContext.js uses legacy tables in 2 queries:
         - scans table → needs migration to scan_logs
         - production_batches table → needs migration to batches
         Known tech debt. Not blocking.
LL-173: NUAI_STRATEGIC_RESET_v1_0.md produced March 30, 2026:
         3 user types (Operator/Manager/Clerk), 3 stock UIs (HQStock/StockControl/HRStockView),
         The demo milestone: owner sees 182 SKUs grouped by brand, AI shows margin, signs up.
         The week 1 priority: set sell prices, generate QR codes, end-to-end loyalty test.
```

---

## LL-174 through LL-191 — April Sessions (in SESSION-CORE v2.8/v2.9)

```
LL-174: Always import CATEGORY_LABELS, CATEGORY_ICONS from ProductWorlds.js.
LL-175: The inventory IS the website. No separate shop products table.
LL-176: inventory_items.loyalty_category separate from .category.
LL-177: Shop uses storefrontDb (separate Supabase client) — never replace with main client.
LL-178: Never replace renderTab case without explicit loss list + owner confirm.
LL-179: New screens are additive only — new case in renderTab, never hijack existing.
LL-180: Read HQStock.js in full before building any inventory-related component.
LL-181: inventory_items has NO 'notes' column. Never include in INSERT/UPDATE.
LL-182: inventory_items.category is enum — SQL needs ::inventory_category cast.
LL-183: Git in PowerShell: no && operator. Separate commands on separate lines.
LL-184: Code box discipline — deploy box = executable only. Context = prose only.
         Never labels/DEPLOY/>> on line immediately above opening ```.
LL-185: Read file via GitHub:get_file_contents before any edit in this session.
LL-186: TenantPortal INNER constant: {maxWidth:1400, width:"100%", margin:"0 auto"}.
LL-187: Unicode BOM in JS files causes silent str.replace() failures.
LL-188: ReorderPanel creates purchase_orders status='draft' ONLY. Never auto-submit.
LL-189: movement_type = 'sale_pos' for POSScreen. NOT 'sale_out' (wholesale only).
LL-190: EOD thresholds always from tenant_config.settings. Never hardcode.
LL-191: loyalty_transactions column = transaction_type. NOT type/loyalty_type/event_type.
```

---

*LL-ARCHIVE v1.0 · NuAi Platform · April 4, 2026*
*Preserves LL-001 through LL-173 from SESSION-CORE v2.3*
*LL-174 through LL-191 are in SESSION-CORE v2.8/v2.9 body text*
*LL list is SACRED — never abbreviate, never skip entries*

---

## LL-252 through LL-263 — Sessions 262-282 (April 15, 2026)

LL-252: StockIntelPanel.js saleOuts memo filtered movement_type === 'sale_out' ONLY.
'sale_out' = wholesale only (LL-189). POS uses 'sale_pos'.
Fix: filter OR: ['sale_out','sale_pos'].includes(m.movement_type)
Apply to ANY future component reading stock_movements for sales data.

LL-253: auth.users SQL direct INSERT — all token fields MUST be explicit empty
strings (NOT null) or GoTrue throws 500 on password grant:
confirmation_token='', recovery_token='', email_change_token_new='',
email_change='', phone_change='', phone_change_token='',
email_change_token_current='', reauthentication_token=''
email_change_confirm_status=0 (integer)
Also: auth.identities row (no 'email' column — generated), is_sso_user=false,
is_anonymous=false, deleted_at=null.
Use DO $$ block with gen_random_uuid() for consistent UUID across
auth.users, auth.identities, and user_profiles.

LL-254: RLS infinite recursion between related tables.
Trigger pattern:
  Policy A on table_X: USING (id IN (SELECT col FROM table_Y ...))
  Policy B on table_Y: USING (col IN (SELECT id FROM table_X ...))
PostgreSQL evaluates both simultaneously → infinite loop.
Error: "infinite recursion detected in policy for relation 'table_X'"
Fix: DROP recursive policy on table_X. CREATE FUNCTION that reads
table_Y with SECURITY DEFINER (bypasses RLS). New policy on table_X
calls function.
Applied to tenant_groups/tenant_group_members April 15, 2026.
Function: get_my_group_ids() on project uvicrqapgzcdvozxrreo.

LL-255: T.neutralLight ≈ #F4F4F3 (near-white).
NEVER use as chart bar fill on white/light background — bars are invisible.
Use named palette arrays instead.
Pattern: BAR_PALETTE = ['#2D6A4F','#1E3A5F','#7C3AED','#92400E','#0F766E','#6B21A8']
Embed barColor into chartData useMemo. Current store = T.accent.
Apply to any future Recharts BarChart with per-series coloring.

LL-256: Diverged local repo recovery.
Symptom: git pull aborts — "Your local changes would be overwritten"
Causes: (a) modified tracked files, (b) untracked files conflicting with origin
DO NOT use git stash — doesn't help with untracked file conflicts.
Fix:
  git fetch origin
  git reset --hard origin/main
  npm install    ← always needed after hard reset
  npm start

LL-257: Vercel service worker cache — "Finish update" button.
When "Finish update" appears: new JS bundle is deployed BUT browser
is running an old bundle from a prior service worker.
Ctrl+Shift+R does NOT reliably clear SW caches.
Existing incognito tab = still old SW.
ONLY reliable fix: open a BRAND NEW incognito window.
Diagnostic: bug on Vercel but NOT localhost → SW cache.
Bug on BOTH → code issue. Fix the code.

LL-258: useNavConfig.js has FOUR separate page arrays:
  HQ_PAGES    → /hq route, isHQ users
  ADMIN_PAGES → /admin route, role='admin' store users
  HR_PAGES    → /hr route
  STAFF_PAGES → /staff route
New nav item visible in multiple contexts MUST be in ALL relevant arrays.
Group Portal was in HQ_PAGES (Session 262) but NOT ADMIN_PAGES →
store admins never saw it until Session 282.
Verify: grep -n 'Group Portal' src/hooks/useNavConfig.js → 2 lines.

LL-259: Always check localhost before blaming Vercel cache.
Vercel bug + "Finish update" visible → check localhost first.
localhost same bug → code issue, not cache.
localhost correct → Vercel SW cache (LL-257).
Multiple sessions wasted assuming cache when root cause was code.

LL-260: git pull "would be overwritten" — full recovery.
Error lists both modified tracked files AND untracked conflicting files.
git stash only handles tracked changes, not untracked conflicts.
Full safe sequence:
  git fetch origin
  git reset --hard origin/main
  npm install
  npm start
git reset --hard discards ALL local tracked changes and brings HEAD to origin/main.
Untracked files that don't conflict remain in place (not a problem).

LL-261: qrcode.react (or any package) missing after git reset --hard.
Symptom: "Module not found: Error: Can't resolve 'qrcode.react'"
Cause: reset restores package.json from origin/main, node_modules out of sync.
Fix: npm install immediately after any git reset --hard.
Applies to ANY missing package error after a hard reset.

LL-262: Group Portal "infinite recursion" — full diagnosis and fix.
UI error: "Could not load network: infinite recursion detected
in policy for relation 'tenant_groups'"
Diagnostic SQL:
  SELECT policyname, cmd, qual FROM pg_policies
  WHERE tablename IN ('tenant_groups','tenant_group_members')
  ORDER BY tablename, policyname;
Look for policies on each table referencing the other in qual.
Fix (Supabase MCP):
  DROP POLICY IF EXISTS "member_can_read_own_group" ON tenant_groups;
  CREATE OR REPLACE FUNCTION get_my_group_ids()
  RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT group_id FROM tenant_group_members
    WHERE tenant_id = user_tenant_id();
  $$;
  CREATE POLICY "member_can_read_own_group" ON tenant_groups
  FOR SELECT TO public USING (id IN (SELECT get_my_group_ids()));
See also LL-254 for the general pattern.

LL-263: StoreComparison.js bar chart invisible — full fix pattern.
Symptom: only current store bar visible (green). All others invisible.
Cause: Cell fill = T.neutralLight (≈ white) for non-current stores.
Fix:
  Step 1 — Add above chartData useMemo:
    const BAR_PALETTE = ['#2D6A4F','#1E3A5F','#7C3AED',
                         '#92400E','#0F766E','#6B21A8'];
  Step 2 — In chartData useMemo, add barColor + tenantId to deps:
    sortedStores.map((s, idx) => ({
      ...
      barColor: s.tenantId === tenantId
        ? T.accent
        : BAR_PALETTE[idx % BAR_PALETTE.length],
    }))
    deps: [sortedStores, tenantId]   ← tenantId was missing → stale
  Step 3 — Cell:
    <Cell key={entry.tenantId} fill={entry.barColor} />
Apply this pattern to any future chart needing per-series colors.

*LL-252 through LL-263 added: Session 282 · April 15, 2026*

---

## LL-264 — Session 282 (15 April 2026) — Doc System Design Violation

LL-264: NEVER create a versioned NEXT-SESSION-PROMPT_vXXX.md as a session handoff.
This pattern was the OLD system. SESSION-START-PROMPT.md is the CURRENT system.
It was specifically designed to replace versioned handoff files because they:
  (a) go stale immediately after the session that created them
  (b) fragment the entry point — next agent doesn't know which file to read
  (c) duplicate information already live in PENDING-ACTIONS, LL-ARCHIVE, and
      the Bible — creating three sources of truth that drift apart
  (d) leave SESSION-START-PROMPT.md un-updated, which is the only file
      agents actually paste at session start

The correct end-of-session doc workflow is:
  1. Update SESSION-START-PROMPT.md IN-PLACE (no version number, same file)
     - Update HEAD to current commit
     - Update session number in header
     - Update CURRENT STATE section with what completed
     - Update OPEN LOOPS list
     - Add new critical LLs to CRITICAL RULES section
  2. Append new LLs to docs/LL-ARCHIVE_v1_0.md
  3. Update docs/PENDING-ACTIONS.md (close completed loops, add new ones)
  4. Commit all three: git add docs/SESSION-START-PROMPT.md
     docs/LL-ARCHIVE_v1_0.md docs/PENDING-ACTIONS.md
  5. git push origin main

SESSION-START-PROMPT.md IS the entry point. Keep it current.
If you catch yourself writing "NEXT-SESSION-PROMPT_vXXX.md" — STOP.
Open SESSION-START-PROMPT.md and update it instead.

Blast radius when violated: the primary entry point goes stale. Next agent
pastes it, gets wrong HEAD, wrong session objective, missing loops, and
may re-do completed work or miss critical open items.

Applied: Session 282 created NEXT-SESSION-PROMPT_v282.md instead of
updating SESSION-START-PROMPT.md. SESSION-START-PROMPT.md was left at
Session 261 state (HEAD 91719e5) while true state was Session 282 (HEAD de41ec6).
Fixed same session by Claude Code in-place update.

*LL-264 added: Session 282 · April 15, 2026*

---

## LL-265, LL-266, LL-267 — Sessions 282-284 (April 15, 2026)

LL-265: Production URL is protea-botanicals.vercel.app — NEVER use preview URLs
(format f520llkld or similar). Preview URLs serve frozen builds and will show
stale behaviour that doesn't match main. Always test on the production URL
or localhost.

LL-266: TenantPortal INNER wrapper must NOT use maxWidth or margin: auto.
Content must fill 100% between sidebar and scrollbar at all zoom levels.
Individual tab components manage their own internal layout width if needed.
The grey T.bg side-strips visible when zoomed out are caused by maxWidth
centering — this is prohibited. Applied Session 284 (LOOP-DS6-001 fix).

LL-267: Tab-level components rendered inside HQDashboard or TenantPortal
must NOT set background on their outermost return div. Correct layering:
  Shell (HQDashboard/TenantPortal) — background: T.bg (grey chrome)
  Tab outer div — background: "transparent" (grey shows through)
  Page header div — background: T.surface (white sticky header)
  Tab content — no background (grey shows through)
  SectionCards/tiles — T.surface (white cards on grey)
Violating this creates a white middleman box over the grey AppShell chrome.
Root cause fixed in: HQLoyalty.js (366dcc3), HQDashboard.js (e216d4d),
HQStock.js (351bc44).
Applied to: every tab component going forward — check before shipping.

*LL-265 through LL-267 added: Sessions 282-284 · April 15-16, 2026*


---

## LL-268 — Sessions 285-286 (April 15-16, 2026) — DS6 T import pattern

LL-268: DS6 batch scripts check hasLocalT to decide whether to add a bridge.
Files that use T.* with NO local T block AND NO import will compile with
"T is not defined". Pattern: if file has bare T.xxx with no local block
and no import — add `import { T } from "../../styles/tokens";` directly.
Do NOT add the bridge (no DS alias needed). HRStaffProfile.js was the
canonical example (db12ac3).

*LL-268 added: Sessions 285-286 · April 15-16, 2026*

---

## LL-269 through LL-274 — Session 287/288 (16 April 2026)

LL-269: PostgREST .neq(col, val) EXCLUDES NULL rows silently.
When a boolean column is nullable (e.g. dispensing_log.is_voided defaults to
false but may be NULL in some rows), PostgREST's .neq("is_voided", true)
generates SQL: is_voided != true — which PostgreSQL evaluates as NULL for
NULL rows, excluding them from the result set.
ALWAYS use .eq("is_voided", false) for nullable booleans — it generates:
is_voided = false AND respects only explicitly false rows.
Root cause of LOOP-NEW-005: HQOverview fetchDispensingRevenue returned R0
because all NULL-voided events were dropped. Fixed a447f74.
Pattern applies to: any nullable boolean filter in PostgREST queries.

LL-270: PostgREST nested join without !inner modifier can return null for the
related object when the FK is not navigable in context. The syntax
`inventory_items(sell_price)` performs a LEFT JOIN — if the FK cannot be
resolved (e.g. missing FK constraint, ambiguous relationship, or PostgREST
inference failure), the related object returns null and the field is 0.
The `!inner` modifier forces an INNER JOIN, errors loudly if no FK exists,
and guarantees a non-null related object.
ALWAYS use `inventory_items!inner(sell_price)` when the join is mandatory
and the field drives a financial calculation.
Applied: HQOverview.js fetchDispensingRevenue (a447f74), HQProfitLoss.js
fetchDispensingRevenue (working pattern). Also confirmed in useFinSignals.js
and useIntelStrip.js which both use !inner correctly.

LL-271: leave_balances.available is a GENERATED column in PostgreSQL.
It is computed automatically from opening_balance + accrued + carried_over
- used - pending - forfeited. NEVER include `available` in INSERT or UPDATE
statements — it will cause a PostgreSQL error.
INSERT columns: staff_profile_id, leave_type_id, tenant_id, cycle_start,
cycle_end, opening_balance, accrued, carried_over, used, pending, forfeited.
Applied: LOOP-012 HR top-up Session 288 — 5 staff leave_balances inserted
without the available column.

LL-272: R-TDZ-01 — useCallback deps cannot reference consts declared after
early returns in the same component scope.
Pattern that breaks:
  if (!tenantId) return <Loading />;   — early return
  const financialYear = `FY${year}`;   — declared AFTER early return
  const cb = useCallback(async () => {
    ... use financialYear ...           — TDZ crash at runtime
  }, [financialYear]);
Fix: inline the value inside the callback body instead of referencing the
outer const. The early return means the const is never initialized when
the hook's closure captures it.
Applied: HQFinancialStatements.js handleDownloadPDF (R-TDZ-01 fix).

LL-273: equity_ledger UPDATE sequencing — changing net_profit_for_year
shifts total_equity. The BS module reads:
  total_equity = share_capital + opening_retained_earnings + net_profit_for_year
If net_profit is updated without recalibrating share_capital, total_equity
changes while total_assets stays fixed — BS shows "does not balance" banner.
CORRECT SEQUENCE (same session):
  Step 1: UPDATE equity_ledger SET net_profit_for_year = <correct figure>
  Step 2: Calculate required share_capital:
    share_capital = Total_Assets - opening_retained_earnings - net_profit_for_year
  Step 3: UPDATE equity_ledger SET share_capital = <calculated figure>
  Step 4: Verify residual_gap = 0:
    SELECT ROUND(share_capital + opening_retained_earnings
                 + net_profit_for_year - <total_assets>, 2) AS residual_gap
Applied: MediCare Dispensary Session 288.
  net_profit: -418,979 -> -263,672.76
  share_capital: 752,861.18 -> 623,022.64
  total_equity: 333,882.18 -> 359,349.88 = total_assets
See also LL-248 (equity_ledger drift warning).

LL-274: Tenant-selective banner — check data rows BEFORE searching source code.
When a warning banner appears on some tenant portals but not others (especially
when the pattern maps to specific tenants missing a config row), the root cause
is almost always a missing DB row, not a code bug.
LOOP-015 diagnostic timeline:
  Source search: 15 files read (AINSBar, useNavIntelligence, HQLoyalty,
  IntelStrip, useIntelStrip, useBrief, useFinSignals, PromoBanner,
  LoyaltyBadges, TenantPortal, AIFixture, useNavConfig, all shared/* — 45+ minutes, inconclusive.
  Data check: SELECT loyalty_config WHERE tenant_id IN (...) — 30 seconds.
  Result: 3 of 5 tenants missing loyalty_config rows.
  Fix: INSERT loyalty_config (standard schema) — 2 minutes.
RULE: When banner is tenant-selective — run the data check FIRST.
  1. Identify which tenants see the banner
  2. Identify the likely config table (loyalty_config, tenant_config, etc.)
  3. SELECT COUNT(*) per affected tenant — find the missing rows
  4. INSERT the missing rows
  5. Only if data is present and banner persists — search source code.
Source component was NOT identified and this is acceptable — the symptom is
resolved. Do not re-open without a terminal grep result confirming the string.

*LL-269 through LL-274 added: Session 287/288 · April 16, 2026*


---

## LL-290 — Session 293 (17 April 2026)

LL-290: PENDING-ACTIONS loop scope must be verified against DB schema before
closing, not inferred from UI tab count. LOOP-011 was logged as "5
tenants x 4 statements = 20 sign-offs" based on the 4-tab UI in
HQFinancialStatements.js. Actual schema: financial_statement_status
has one row per (tenant_id, financial_year) with a single `status`
column — all 4 statement tabs share the workflow. Real scope: 5
sign-offs total. Rule: before closing or sizing a PENDING-ACTIONS
loop, inspect the underlying table's PRIMARY/UNIQUE key constraints
— not the rendered tabs. Applied Session 293, 17 April 2026.

*LL-290 added: Session 293 · 17 April 2026*

---

## LL-299 — Session 318 (18 April 2026)

LL-299: Planner/executor separation surfaces what integrated sessions miss.
When one agent plans (read-only, produces spec) and another executes
(reads spec, writes code), the planner must produce an artifact before
anything ships. That artifact invites scrutiny in a way in-flight reasoning
does not. Prefer planner/executor split for any finding larger than a
one-liner. For one-liners with fully-verified register scope, integrated
is fine. Evidence: S317 split caught HQTenants calendar-year P&L-period
bug not in register; S316 integrated missed nothing but was a one-liner.
See LOOP-CALIBRATION.md for measured rates.

*LL-299 added: Session 318 · 18 April 2026*

---

## LL-300 — Session 320 (18 April 2026)

LL-300: RLS policies on user_profiles MUST NOT inline-query user_profiles.
Use SECURITY DEFINER helpers (user_tenant_id(), is_hq_user(), auth_is_admin()).
Inline subqueries cause 42P17 infinite recursion — platform-wide login break.
Discovery: tenant_admins_own_users policy on user_profiles inlined a subquery
against its own table. Fix: replace with user_tenant_id() helper. Same
mechanism as LL-262 (tenant_groups recursion, S282).

## LL-301 — Session 320 (18 April 2026)

LL-301: Structural RLS audits (shape-checking) do not catch operational
fragility. The S294-S314 campaign declared Tier 2C "complete" after fixing
146 policies but did not detect the dormant recursion in tenant_admins_own_users.
Future completion declarations require both shape verification AND operational
verification (login smoke test, representative queries under all role combos).

## LL-302 — Session 320 (18 April 2026)

LL-302: Session-start RLS audit queries. Run Audit 1 (self-referencing policies,
must return 0) and Audit 2 (inline user_profiles queries, watched count ~100
post-S320 baseline) before and after any session that modifies RLS. Canonical
SQL in NUAI-AGENT-BIBLE.md LL-301 section.

*LL-300 + LL-301 + LL-302 added: Session 320 · 18 April 2026*
