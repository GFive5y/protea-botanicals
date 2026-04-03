# CAPABILITIES — NuAi Platform
## Version: v2.0 · Updated: April 4, 2026
## Purpose: Plain-English record of what is built, what it does, and what comes next.

> This document is for HUMANS and AI sessions alike.
> Read this when you want to understand the system — not how to build it (that's SESSION-CORE)
> but WHAT it IS, what it does TODAY, and what is planned.
> Update at the end of every major work package or strategic pivot.

---

# PART 1 — WHAT IS THIS PLATFORM?

NuAi started as a cannabis brand selling 3 products online. The software built to run it
has grown into a full multi-tenant ERP capable of running any regulated consumer goods
business — cannabis, supplements, food & beverage, apparel, services.

**Commercial opportunity:** Package as white-label SaaS. Sell at R3,500–R12,000+/month.

**The technical foundation:**
- React 18 frontend. Supabase (Postgres + Auth + Edge Functions + Storage).
- Multi-tenant: one codebase, one database, many clients. RLS-enforced isolation.
- Live FX rates (USD/ZAR) wired into purchase orders and all costing.
- AI assistant (ProteaAI — Claude Sonnet) wired into every tab.
- Three-state stock engine: on_hand / reserved / available.
- Industry profile system: 5 profiles gate cannabis-specific and medical UI per tenant.
- 8-category dynamic loyalty engine with margin-aware earn rates.
- Full Food & Beverage compliance suite (HACCP, SA R638, cold chain, recall).

**Replacement cost at SA agency rates: R1.4M–R1.9M.**
**Actual AI-assisted build cost: ~R180k.**

---

# PART 2 — FOUR USER TYPES

```
TIER 1: OPERATOR (Gerhardt / NuAi team)
  Route: /hq — HQ Command Centre (30 active tabs)
  Sees: ALL tenants. ALL financial detail. ALL production.
  Controls: production, procurement, pricing, fraud, tenant management,
            wholesale orders, medical dispensary, industry profiles, F&B modules

TIER 2: SHOP MANAGER / CLIENT OWNER
  Route: /tenant-portal — Client Portal
  Sees: Their tenant's data only (RLS enforced)
  Controls: their stock, customers, orders, staff, pricing, smart catalogue
  File: TenantPortal.js v2.4

TIER 3: SHOP CLERK / CASHIER
  Route: /admin — Shop Dashboard (12+ tabs)
  Sees: Operational data for their tenant only
  Controls: POS, stock adjustments, customer comms, QR codes, analytics
  File: AdminDashboard.js

TIER 4: CUSTOMER (end consumer)
  Route: /shop, /scan, /loyalty, /account
  Sees: Products, loyalty points, scan results, order history
  Actions: buy, scan QR, earn points, redeem, refer friends
```

---

# PART 3 — WHAT IS BUILT AND LIVE

## 3.1 — HQ Command Centre (30 active tabs)

### Operations

| Tab | File | What it does |
|---|---|---|
| Overview | HQOverview.js | KPIs, live alerts, realtime subs, 6 charts |
| Supply Chain | SupplyChain.js | Supplier + raw material visibility |
| Suppliers | HQSuppliers.js | Supplier CRUD, reliability scoring |
| Procurement | HQPurchaseOrders.js v2.1 | FX-aware POs, landed cost, DDP calculator, receive→inventory |
| Production | HQProduction.js v3.5 | All 5 profiles: BOM, QC gate, allergens, AVCO write-back |
| HQ Stock | HQStock.js v3.1 | Profile-adaptive stock intelligence (7 tabs, 14 worlds) |
| Smart Catalog | SmartInventory.js v1.5 | Drag-drop columns, pill filters, per-tenant scoped |
| HQ Transfers | HQTransfer.js v1.0 | HQ→Shop stock transfer lifecycle |
| Distribution | Distribution.js | Wholesale shipment tracking |

### Finance

| Tab | File | What it does |
|---|---|---|
| Costing | HQCogs.js v4.2 | COGS builder: hardware, terpene, distillate, lab, transport, packaging |
| Pricing | HQPricing.js v4.2 | Per-SKU × 3 channels + NET AFTER LOYALTY |
| P&L | HQProfitLoss.js v3.2 | Actual P&L: movements-based COGS, DB-backed OPEX |
| Balance Sheet | HQBalanceSheet.js v1.0 | Assets/liabilities/equity. Accounting equation badge. |
| Invoices | HQInvoices.js v2.0 | Invoice list, aged debtors (0/30/60/90+ day buckets) |
| Wholesale Orders | HQWholesaleOrders.js | B2B orders, SAGE-style invoice, stock reservation lifecycle |
| Documents | HQDocuments.js v2.4 | AI doc extraction, CAPEX/OPEX classify, dedup gate |
| Expense Manager | ExpenseManager.js v1.0 | Full expense CRUD, bulk CSV, foreign currency |

### Intelligence

| Tab | File | What it does |
|---|---|---|
| Analytics | HQAnalytics.js v4.3 | 6 sub-tabs, profile-adaptive, geo heatmap |
| Geo | GeoAnalyticsDashboard.js | Province/city/churn/demand gap maps |
| Retailer Health | RetailerHealth.js | Per-tenant health scoring |
| Reorder | HQReorderScoring.js | Automated reorder triggers |
| Trading Dashboard | HQTradingDashboard.js v3.0 | Daily sales intelligence, 30-day chart, EOD history |

### Platform

| Tab | File | What it does |
|---|---|---|
| Loyalty | HQLoyalty.js v4.0 | 10-tab AI loyalty engine. 8 product categories. Harvest Club. Programme Health Score. |
| Fraud | HQFraud.js v2.0 | Cross-tenant anomaly scoring, POPIA deletion tracking, audit log |
| Medical | HQMedical.js v1.0 | GATED: prescription patients, SAHPRA reports, dispensing log |
| Tenants | HQTenants.js v1.1 | Full client management, feature flags, TenantSetupWizard |
| EOD Cash Up | EODCashUp.js v1.0 | End-of-day till reconciliation. Thresholds from tenant_config.settings. |
| POS Screen | POSScreen.js v1.0 | In-store point of sale. movement_type='sale_pos'. |

### Food & Beverage (food_beverage profile only)

| Tab | File | Lines |
|---|---|---|
| Ingredients | HQFoodIngredients.js | 5082 — 121 SA ingredients, DAFF nutrition, HACCP risk |
| Recipes | HQRecipeEngine.js | 1075 — BOM, allergen propagation, "▶ Start Batch" handoff |
| HACCP | HQHaccp.js | 1031 — CCP log, NCR auto-raise, PlatformBar alert |
| Food Safety | HQFoodSafety.js | 632 — Cert vault, expiry alerts |
| Nutrition Label | HQNutritionLabel.js | 590 — SA R638 nutritional label generator |
| Cold Chain | HQColdChain.js | 798 — Temperature monitoring, breach detection |
| Recall | HQRecall.js | 791 — Product recall, lot traceability, FSCA letter |
| Food Intelligence | HQFoodIntelligence.js | AI-powered F&B intelligence brief |

### HR Suite (13 modules — all in src/components/hq/)

| File | Version | What it does |
|---|---|---|
| HRStaffDirectory.js | v1.0 | Staff list, search, CSV export |
| HRStaffProfile.js | v1.1 | Single employee deep-view |
| HRLeave.js | v1.0 | Requests, balances, approval, conflict check |
| HRTimesheets.js | v1.0 | Batch approve, export, QR clock-in |
| HRContracts.js | v1.0 | HTML→PDF contracts, template library |
| HRDisciplinary.js | v1.1 | Warnings, hearings, appeals |
| HRComms.js | v1.1 | Inbox, broadcasts, acknowledgements |
| HRCalendar.js | v1.2 | 13 event layers, SA holidays, iCal export |
| HRLoans.js | v1.1 | Loans, stipends, repayment tracking |
| HRPayroll.js | v1.1 | SimplePay-compatible CSV export |
| HRPerformance.js | v1.1 | KPI forms, PIP tracker, goals |
| HRSettings.js | v1.1 | Leave types, work hours, warning templates |
| HRStockView.js | v1.0 | Stock takes — blind/guided, schedule, approve |

---

## 3.2 — Customer-Facing

| Route | File | What it does |
|---|---|---|
| /shop | Shop.js | Profile-adaptive: VapeCard / FoodShopCard / GeneralShopCard |
| /scan/:code | ScanResult.js v4.9 | QR validation, loyalty points, category multipliers, velocity check |
| /checkout | CheckoutPage.js v2.4 | PayFast + 8-category loyalty stack + redemption + referral |
| /loyalty | Loyalty.js v5.7 | Points balance, tier progress, Harvest Club, referral code |
| /account | Account.js v6.4 | Profile, loyalty history, inbox, support tickets |

---

## 3.3 — Platform Intelligence Bar (PlatformBar.js)

```
40px sticky bar — top of every HQ and Admin page.
Green hairline = all clear. Icons pulse when action needed.

Icons:
  🔔 Alerts  — system_alerts requiring attention (realtime)
  💬 Comms   — unread customer messages / open tickets (60s poll)
  🛡 Fraud   — anomaly_score > 85 (60s poll)
  ⚡ Actions — pending operational items (5min poll)

Gate: anomaly_score > 85 = global icon. > 70 = page-specific (Phase 2).
Replaced: AlertsBar.js (DELETED) + SystemStatusBar.js (DELETED)
```

---

## 3.4 — AI Systems (ProteaAI — unified, never duplicate)

```
ProteaAI.js v1.4 — UNIFIED AI PANEL. DO NOT REBUILD OR REPLACE.
  3 tabs: Chat (tab-aware, streaming) / Query (plain English → live SQL) / Dev (error capture)
  Uses: ai-copilot Edge Function → Anthropic API (NEVER call Anthropic from React directly)
  Was: CoPilot.js + AIAssist.js + AIOrb.js — ALL DELETED in WP-AI-UNIFIED

WorkflowGuide.js v2.0 — tab-level guided steps
  Uses: usePageContext(tabId, tenantId) — live DB context, always 2 args

InfoTooltip.js — inline help
  30+ entries. Never build a separate tooltip system.

DevErrorCapture.js — React error boundary
  Intercepts console.error, populates ProteaAI Dev tab
```

---

## 3.5 — AVCO Cost Intelligence

```
Every stock movement triggers:
  stock_movement_stamp trigger → AFTER INSERT ON stock_movements
  → inventory_items.weighted_avg_cost = calculate_avco(item_id)
  → inventory_items.last_movement_at = NOW()

Pattern always: weighted_avg_cost ?? cost_price ?? 0
NEVER use cost_price alone for P&L or financial calculations.
cost_price = stale flat value. weighted_avg_cost = live running average.

HQCogs.js uses a COMPLETELY SEPARATE cost engine (product_cogs recipes).
NEVER wire weighted_avg_cost into HQCogs. It uses supplier_products × FX, not AVCO.
```

---

## 3.6 — Reserved Stock Engine

```
Three-state inventory:
  quantity_on_hand   = physical stock (changes on physical movement only)
  reserved_qty       = soft hold for confirmed wholesale orders (never physical)
  available_qty      = on_hand - reserved_qty (computed, NEVER stored)

DB functions (all live):
  get_available_qty(item_id UUID) → NUMERIC
  reserve_stock(tenant_id, item_id, qty, order_id, order_type, user_id) → UUID
  release_reservation(reservation_id UUID) → VOID

Rules:
  NEVER decrement quantity_on_hand on reservation — physical movement only
  NEVER store available_qty — always compute
  reserve_stock() on ORDER CONFIRMATION only — never on draft
  release_reservation() on SHIP or CANCEL — not on delivery
```

---

## 3.7 — Feature Flag System

```
tenant_config table (one row per tenant):
  feature_hq           → Access to full HQ Command Centre
  feature_ai_basic     → AI assistant, Haiku, 50 queries/day
  feature_ai_full      → Full Claude AI + document digestion
  feature_medical      → Section 21 permits, dispensing records
  feature_white_label  → Custom domain and branding
  feature_wholesale    → Wholesale partner management
  feature_hr           → Full HR module

Gate pattern: tenantConfig?.feature_X !== false
(NOT === true — absence means enabled for backwards compatibility)

tenant_config.settings (JSONB):
  Contains: variance_tolerance, escalation_threshold, default_float, approver_role
  These are EOD thresholds. NEVER hardcode in EODCashUp.js. Always read from settings.
```

---

## 3.8 — Loyalty Engine (WP-O v2.0 — complete)

```
8 product categories with margin-aware earn rates:
  cannabis_flower    2.0×  cannabis_vape       1.75×
  cannabis_edible    1.5×  seeds_clones        3.0×
  grow_supplies      1.0×  accessories         0.75×
  health_wellness    1.5×  lifestyle_merch     2.0×

5 tiers:
  Bronze (0) · Silver (200) · Gold (350) · Platinum (750) · Harvest Club (2500)
  Harvest Club = multi-category elite (cannabis + grow + health)

Points formula at checkout:
  pts = (total/100) × pts_per_r100_online × online_bonus × category_mult × tier_mult
      + first_purchase_bonus (200pts, one-time)
      + crosssell_bonus (150pts, first purchase from new category)
      + referral_bonus (50pts, if valid referral code)

Cost per point: redemption_value × (1 - breakage_rate) = R0.10 × 0.70 = R0.07
Programme costs ~0.07% of revenue at default settings.
This is the loyalty moat: R0-R50 CPA vs R200-500 for Google/Meta ads.
```

---

# PART 4 — WHAT IS NOT YET BUILT

## 4.1 — Pending / In Progress

```
WP-SMART-CATALOG SC-01–SC-10
  Status: SC-01 scoped and ready to build. SC-02 through SC-10 scoping.
  SmartInventory.js v1.5 is the foundation. SC features add KPI cards,
  action panels (sold-out, below-reorder, no-price), inline edit, bulk actions.

WP-REORDER
  Status: Scoped. Slide-out panel from Smart Catalog.
  Will create draft POs grouped by supplier from reorder queue.
  Requires SC-01 action panels to be complete first.

WP-STOCK-RECEIVE-S3
  Status: READY TO BUILD (spec in WP-STOCK-RECEIVE-S3_v1_0.md)
  ProductWorlds.js as single source of truth for both Items tab and Receive Delivery.

WP-DAILY-OPS (Trading Dashboard complete — EOD/POS variants pending)
  Status: WP-SANDBOX (seed dev sales data) → WP-EOD sessions B-C
  pos_sessions, eod_cash_ups, daily_summaries tables are LIVE.

loyalty-ai Edge Function
  Status: NOT DEPLOYED. Tables (loyalty_ai_log) and spec (WP-O_v2_0) ready.
  7 nightly jobs: churn rescue, birthday, expiry, streak, stock-boost, tier upgrade, brief.

WP-PAY
  S1 (Yoco online gateway): BLOCKED on sk_test_ keys from Yoco signup
  S2 (In-store reconciliation): After S1
  S3 (POS via Yoco SDK): Requires Yoco partner approval (Android/iOS native only)
  DB schema: orders needs yoco_checkout_id, yoco_payment_id, payment_method columns.
  New table: payments (id, order_id, tenant_id, provider, provider_ref, amount_zar, status)
  NOTE: Yoco accepts sole traders without CIPRO registration.
        Try signup at yoco.com as sole trader → sk_test_ keys available immediately.

WP-STOCK-MERGE
  Status: PLACEHOLDER. After SC-01–SC-10 complete.
  Merges Smart Catalog into HQStock nav as a tab, removing it from top-level nav.

WP-VISUAL (Charts)
  Status: 20+ page-level charts pending.
  viz/ library ready: ChartCard, SparkLine, DeltaBadge, PipelineStages, etc.
  Spec: WP-VISUAL-SYSTEM_v1.docx
```

## 4.2 — Unresolved Decisions (OWNER MUST DECIDE BEFORE BUILDING)

```
Decision C: Client 2 storefront (UNRESOLVED since v149)
  A: Rebuild on NuAi, point domain at Vercel
  B: Keep existing site, webhook sync orders into NuAi
  C: NuAi embed JS snippet into existing site
  → Must decide before WP-MULTISITE S2

Decision D: Yoco architecture (UNRESOLVED since v149)
  Per-tenant: each client has own sk_live_ in tenant_config.yoco_secret_key
  Platform: one NuAi merchant account, route between tenants
  → Must decide before WP-PAY S1 build
```

---

# PART 5 — KEY TECHNICAL FACTS (for cold AI sessions)

## Files never to casually edit

```
ProteaAI.js         — LOCKED. Exception: CODEBASE_FACTS string (owner action, very stale).
PlatformBar.js      — LOCKED.
LiveFXBar.js        — PROTECTED.
StockItemModal.js   — LOCKED. 14 product worlds.
supabaseClient.js   — PROTECTED.
HQStock.js          — PROTECTED. Read full file before any change.
ScanResult.js v4.9  — COMPLEX (1700+ lines). Read entire file before touching.
HQCogs.js v4.2      — COMPLEX (3000+ lines). Has its own cost engine. Read before touching.
```

## Critical schema gotchas (never guess column names)

```
orders.total               → NOT total_amount
order_items                → NO inventory_item_id FK. Linked by product_name TEXT.
                             Category/margin queries need product_metadata jsonb.
order_items.line_total     → GENERATED COLUMN. NEVER INSERT.
scan_logs                  → NO tenant_id column. Never filter by it. RLS only.
batches                    → NO created_at. ORDER BY production_date.
loyalty_config             → NO updated_at. ONE row per tenant. UNIQUE(tenant_id).
loyalty_transactions       → column = transaction_type (NOT type, NOT event_type)
customer_messages          → .body (NOT .content), .read_at (NOT .read boolean)
ticket_messages            → .content (NOT .body), sender_type: customer/admin/auto
movement_type for POS      → 'sale_pos' (NOT 'sale_out' — that is wholesale only)
scan_logs.scanned_at       → NOT scan_date
purchase_order_items FK    → po_id (NOT purchase_order_id)
product_cogs               → product_name (NOT name), sku (NOT sku_name)
transport_cost_zar         → TOTAL batch cost → ÷ batch_size for per-unit
shipping_alloc_zar         → ALREADY per-unit → do NOT ÷ batch_size
HQCogs                     → uses product_cogs, supplier_products, local_inputs — NOT inventory_items
inventory_items.notes      → column DOES NOT EXIST
user_profiles              → NEVER upsert. UPDATE only.
eod thresholds             → ALWAYS from tenant_config.settings JSONB. Never hardcode.
```

## Every new HQDashboard tab requires FOUR things

```
1. Import at top: import NewComponent from '../components/hq/NewComponent';
2. TABS array entry: { id: 'new-tab', label: 'Tab Name', icon: '🔧', ready: true }
3. renderTab case: case 'new-tab': return <NewComponent tenantId={tenant?.id} />;
4. useNavConfig.js entry matching the id
Missing any one of these = tab click does nothing silently (BUG-006 pattern).
```

---

# PART 6 — SESSION HISTORY SUMMARY

| Era | Sessions | What was delivered |
|---|---|---|
| v84–v89 | Feb 2026 | WP-R integrity, WP-X nav, PlatformBar, WorkflowGuide, AIAssist Phase A |
| v90–v93 | Feb-Mar 2026 | WP-SEC, WP-HQF fraud rebuild, scan_logs migration |
| v94 | Mar 2026 | WP-STK Ph1: AVCO engine, oversell guard, unit cost on all stock paths |
| v95–v100 | Mar 2026 | WP-GEN S1-S6: strain fix, BOM from DB, HQInvoices, HQTenants, feature flags |
| v101 | Mar 2026 | WP-STK Ph2: HQAnalytics AVCO wiring |
| v102–v107 | Mar 2026 | WP-IND S1-S5: industryProfiles.js, HQMedical v1.0, cannabis gating |
| v108–v110 | Mar 2026 | Bug fixes + WP-STK Ph3: reserved stock engine, HQWholesaleOrders |
| v111 | Mar 2026 | WP-HR confirmed complete from disk (all 12 sub-packages existed) |
| v112–v130 | Mar 2026 | WP-FNB S1-S8: full Food & Beverage suite. WP-FIN S0-S3: expense engine, AVCO COGS |
| v131–v145 | Mar 2026 | WP-BIB S1-S13: TenantSetupWizard, QR engine, ScanResult profiles, GeoAnalytics |
| v146–v153 | Mar 2026 | WP-O v2.0: 8-category loyalty, Harvest Club, WP-FIN S4-S6: Balance Sheet |
| v154–v168 | Mar 2026 | WP-AI-UNIFIED: ProteaAI v1.4, deleted CoPilot/AIAssist/AIOrb/AlertsBar |
| v169–v177 | Apr 2026 | WP-DAILY-OPS, EODCashUp, POSScreen, TenantPortal v2.4, SmartInventory v1.5 |

---

*CAPABILITIES v2.0 · NuAi Platform · April 4, 2026*
*Update at the end of every major work package.*
*Goal: anyone — human or AI — reads this and immediately understands the platform.*
