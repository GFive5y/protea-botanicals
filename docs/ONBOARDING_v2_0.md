# ONBOARDING.md — NexAI Platform
## Complete System Guide · Architecture · Process Flows · Data Integrity
### Version: 2.0 · Updated: March 30, 2026
### Supersedes v1.1 (March 27, 2026)

---

## SECTION 1 — WHAT THIS SYSTEM IS

NexAI is a multi-tenant, AI-powered ERP + Loyalty + Payments SaaS for regulated consumer
goods and specialty retail operators in South Africa. Built on React 18 + Supabase.

**Replacement cost at SA agency rates: R1.4M–R1.9M. Actual build cost: ~R180k.**

### The Business Model

```
NexAI (product company) → sells to client tenants (shops/operators)
Protea Botanicals HQ   → internal operator — manages all tenants, runs own production
Pure PTV               → Client 1 — cannabis retail shop
Medi Recreational      → Client 2 — recreational cannabis + lifestyle retail (mixed)
```

### What Makes This Different

```
1. One scan does 5 things     — QR auth + product verify + loyalty points + analytics + fraud check
2. Live COGS with FX          — hardware priced in USD, margin recalculates at real-time rate
3. Three-state stock           — on_hand / reserved / available — enterprise oversell protection
4. AI-native throughout        — ProteaAI in every tab + loyalty AI engine + document extraction
5. 8-category loyalty engine   — earn rates reflect actual margins per product type
6. Multi-tenant from day one   — RLS-enforced, each client is fully isolated
7. SA-native                   — ZAR, Yoco, PayFast, POPIA, SA public holidays, SA R638 labels
8. Production-tested           — live data, real production runs, real transactions
9. 4,000+ hours engineering    — deep, battle-tested, not a prototype
```

---

## SECTION 2 — TECH STACK

```
Frontend:   React 18 · Recharts · Supabase JS client · Inline styles only (no Tailwind)
Backend:    Supabase (Postgres + RLS + Auth + Storage + Edge Functions)
AI:         Anthropic Claude via ai-copilot Edge Function (key: Supabase server secret)
            NEVER call api.anthropic.com from React. ONLY via ai-copilot EF. (LL-120)
Payments:   PayFast (sandbox) · Yoco (signed up — awaiting sk_test_ keys)
Hosting:    Vercel — ERP: protea-botanicals.vercel.app · Marketing: nexai-erp.vercel.app
Repo:       github.com/GFive5y/protea-botanicals · branch: main
Fonts:      Inter for ALL HQ/admin components (LL-051). Never Outfit, Cormorant, Jost in HQ.
            Customer-facing pages: Cormorant Garamond + Jost (legacy, maintained)
```

### Edge Functions (Supabase)

| Function | What it does | Deploy note |
|---|---|---|
| `ai-copilot` | Routes all Claude API calls — streaming, tab-aware, loyalty context | Standard |
| `process-document` v1.9 | AI doc extraction, lump-sum alloc, CAPEX/OPEX classify, dedup gate | Standard |
| `get-fx-rate` | USD/ZAR + EUR + GBP live rate, 60s cache, R18.50 fallback | Standard |
| `sign-qr` | HMAC-signs QR codes for fraud prevention | `--no-verify-jwt` ALWAYS |
| `payfast-checkout` | PayFast payment initiation | Standard |
| `payfast-itn` | PayFast payment confirmation webhook | Standard |
| `send-notification` | WhatsApp via Twilio (tier upgrades, alerts) | Standard |
| `loyalty-ai` | Nightly cron — churn rescue, birthday, expiry, stock boost | NOT YET DEPLOYED |

---

## SECTION 3 — SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                       React 18 Frontend                              │
│                                                                       │
│  AppShell                                                             │
│  ├── NavSidebar (role-aware grouped nav, ✦ opens ProteaAI)          │
│  ├── HQDashboard v4.2 (30 tabs — HQ operator only)                  │
│  │    └── [all HQ module tabs — see Section 4]                       │
│  ├── AdminDashboard v6.7 (12+ tabs — shop admin)                    │
│  ├── TenantPortal v2.1 (client-facing portal — manufacturer model)  │
│  ├── HRDashboard v1.3 (13 tabs — HR tier)                           │
│  ├── StaffPortal v1.0 (self-service)                                 │
│  ├── Public pages: Shop, Cart, Checkout, Loyalty, ScanResult etc    │
│  └── ProteaAI v1.4 (✦ floating AI panel — Chat/Query/Dev tabs)      │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Supabase JS Client (anon key)
┌─────────────────────────────▼───────────────────────────────────────┐
│                       Supabase Backend                               │
│  ┌────────────────┐  ┌─────────────────────────┐  ┌─────────────┐  │
│  │ Postgres + RLS │  │     Edge Functions       │  │   Storage   │  │
│  │ 50+ tables     │  │  ai-copilot              │  │  sup-docs   │  │
│  │ tenant_id on   │  │  process-document v1.9   │  │  (invoices) │  │
│  │ every row      │  │  get-fx-rate (60s cache) │  └─────────────┘  │
│  │ AVCO engine    │  │  sign-qr (--no-verify)   │                   │
│  │ reserve_stock()│  │  payfast-checkout/itn    │                   │
│  │ DB functions   │  │  send-notification       │                   │
│  └────────────────┘  │  loyalty-ai (PENDING)    │                   │
│                       └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                    Anthropic Claude API                              │
│  ONLY via ai-copilot Edge Function. Key: Supabase server secret.    │
│  NEVER accessible from React directly.                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Tenancy Architecture

```
Every table: RLS enabled. All rows include tenant_id.
Every INSERT: MUST include tenant_id or row is silently rejected (Rule 0F).
useTenant(): MUST be called INSIDE the component that uses it (Rule 0G).
scan_logs: EXCEPTION — has NO tenant_id column (LL-056). Never filter by it.

Login routing:
  is_operator=true  → /hq          (Protea HQ staff)
  role=management   → /tenant-portal (client admin)
  role=admin        → /admin
  role=hr           → /hr
  role=staff        → /staff
  role=customer     → /shop (via auth context)
```

---

## SECTION 4 — HQ PORTAL FEATURE MAP (30 tabs — HQDashboard.js v4.2)

### OPERATIONS

| Tab ID | File | Version | Status | What it does |
|---|---|---|---|---|
| overview | HQOverview.js | v2.0 | ✅ Live | KPIs, alerts, realtime subs |
| supply-chain | SupplyChain.js | — | ✅ Live | Supplier + product catalogue |
| suppliers | HQSuppliers.js | — | ✅ Live | Supplier CRUD, contact management |
| procurement | HQPurchaseOrders.js | v2.1 | ✅ Live | FX-aware POs, landed cost, receive→inventory |
| invoices | HQInvoices.js | v2.0 | ✅ Live | Invoice list + aged debtors (0/30/60/90+ days) |
| tenants | HQTenants.js | v1.1 | ✅ Live | Tenant management + TenantSetupWizard |
| hq-production | HQProduction.js | v3.5 | ✅ COMPLEX | All 5 profiles, BOM, QC, AVCO write-back |
| hq-stock | HQStock.js | v3.0 | ✅ Live | Profile-adaptive stock intelligence |
| hq-transfers | HQTransfer.js | v1.0 | ✅ Live | HQ→Shop stock transfer lifecycle |
| distribution | Distribution.js | — | ✅ Live | Wholesale shipments |

### FOOD & BEVERAGE (food_beverage profile only)

| Tab ID | File | Lines | What it does |
|---|---|---|---|
| hq-ingredients | HQFoodIngredients.js | 5082 | 121 SA ingredients, DAFF nutrition, HACCP risk |
| hq-recipes | HQRecipeEngine.js | 1075 | BOM, allergen propagation, nutrition per serve |
| hq-haccp | HQHaccp.js | 1031 | CCP log, NCR auto-raise, PlatformBar alert |
| hq-food-safety | HQFoodSafety.js | 632 | Cert vault, expiry alerts |
| hq-nutrition | HQNutritionLabel.js | 590 | SA R638 nutritional label generator |
| hq-cold-chain | HQColdChain.js | 798 | Temperature monitoring, breach detection |
| hq-recall | HQRecall.js | 791 | Product recall, lot traceability, FSCA letter |
| hq-food-intelligence | HQFoodIntelligence.js | — | AI-powered F&B intelligence brief |

### FINANCE

| Tab ID | File | Version | Status | What it does |
|---|---|---|---|---|
| pricing | HQPricing.js | v4.2 | ✅ Live | Per-SKU prices × 3 channels + NET AFTER LOYALTY |
| costing | HQCogs.js | v4.2 | ✅ Live | COGS builder + loyalty cost line |
| pl | HQProfitLoss.js | v3.2 | ✅ Live | Actual P&L: COGS from movements, DB-backed OPEX |
| — | ExpenseManager.js | v1.0 | ✅ Live | Expense CRUD + bulk import (modal from P&L) |
| wholesale-orders | HQWholesaleOrders.js | v2.0 | ✅ Live | B2B orders, SAGE-style invoice, auto-generate |
| documents | HQDocuments.js | v2.4 | ✅ Live | AI doc extraction, dedup gate, create_expense |
| Balance sheet | — | — | 🔜 WP-FIN S5 | READY to build |
| Cash flow | — | — | 🔜 WP-FIN S6 | READY to build |

### INTELLIGENCE

| Tab ID | File | Status |
|---|---|---|
| analytics | HQAnalytics.js v4.3+S12 | ✅ Live — 6 sub-tabs, profile-adaptive |
| geo | GeoAnalyticsDashboard.js | ✅ Live — province/city/churn/demand gaps |
| retailer-health | RetailerHealth.js | ✅ Live |
| reorder | HQReorderScoring.js | ✅ Live |

### PLATFORM

| Tab ID | File | Version | Status |
|---|---|---|---|
| loyalty | HQLoyalty.js | v4.0 | ✅ Live — 10-tab AI loyalty engine |
| fraud | HQFraud.js | v2.0 | ✅ Live — cross-tenant anomaly, POPIA |
| medical | HQMedical.js | v1.0 | ✅ GATED — prescription patients, SAHPRA |
| shops | ShopManager.js | — | ✅ Live |

### HR SUITE (HRDashboard.js — 12 modules, ALL in src/components/hq/)

| File | Version | What it does |
|---|---|---|
| HRStaffDirectory.js | v1.0 | Staff list, search, filter, CSV export |
| HRStaffProfile.js | v1.1 | Single employee deep-view |
| HRLeave.js | v1.0 | Leave requests, balances, approval, conflict check |
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

## SECTION 5 — LOYALTY ENGINE (WP-O v2.0 — COMPLETE)

### Architecture

```
loyalty_config (one row per tenant, UNIQUE constraint)
      │
      ├── HQLoyalty.js v4.0     READ+WRITE — 10-tab control panel
      ├── ScanResult.js v4.9    READ — apply at QR scan time
      ├── CheckoutPage.js v2.4  READ — apply at online checkout
      ├── HQCogs.js v4.2        READ — loyalty cost line in COGS breakdown
      └── HQPricing.js v4.2    READ — net margin after loyalty in summary table

8 PRODUCT CATEGORIES (inventory_items.loyalty_category):
  cannabis_flower    2.0×  flower, pre-rolls, hash
  cannabis_vape      1.75× cartridges, disposables
  cannabis_edible    1.5×  gummies, chocolate
  seeds_clones       3.0×  feminised seeds, live clones, plugs
  grow_supplies      1.0×  nutrients, substrate, fertilizer, rooting gel
  accessories        0.75× papers, cones, Boveda, grinders, trays
  health_wellness    1.5×  Lion's Mane, Ashwagandha, CBD pet, mushrooms
  lifestyle_merch    2.0×  branded clothing, caps, hoodies

5 TIERS:
  Bronze     0 pts    1.0×
  Silver     200 pts  1.25-1.5×  (config-driven)
  Gold       350 pts  1.5-2.0×
  Platinum   750 pts  2.0-3.0×
  Harvest Club 2500 pts 2.5×  multi-category elite (cannabis + grow + health)

POINTS FORMULA AT CHECKOUT:
  pts = (total/100) × pts_per_r100_online × (1 + online_bonus_pct/100)
      × category_mult × tier_mult
  + first_purchase_bonus (one-time, 200pts)
  + crosssell_bonus (one per new category, 150pts)
  + referral_bonus (if valid code, 50pts)

REDEMPTION:
  effectiveTotal = order_total − (redeemable_pts × redemption_value_zar)
  Max: max_redeem_pct_per_order% of order. Min balance: min_pts_to_redeem.
  PayFast receives effectiveTotal when redemption active.

AI ENGINE (loyalty-ai Edge Function — PENDING DEPLOYMENT):
  7 nightly jobs: churn scoring, churn rescue WhatsApp, streak eval,
  birthday bonuses, point expiry, stock-boost suggestions, weekly brief
  All logged to loyalty_ai_log table.
```

---

## SECTION 6 — CUSTOMER-FACING PAGES

| Route | File | Version | What it does |
|---|---|---|---|
| /shop | Shop.js | v4.4 | Profile-adaptive: VapeCard/FoodShopCard/GeneralShopCard |
| /cart | CartPage.js | v1.1 | Cart review + proceed to checkout |
| /checkout | CheckoutPage.js | v2.4 | PayFast + loyalty preview + redemption + referral |
| /scan/:code | ScanResult.js | v4.9 | QR scan — points, product verify, category mults |
| /loyalty | Loyalty.js | v5.7 | Points balance, tier progress, referral code |
| /account | Account.js | v6.4 | Profile, loyalty history, settings |
| /redeem | Redeem.js | — | Points redemption |
| /leaderboard | Leaderboard.js | — | Public loyalty leaderboard |
| /molecules | MoleculesPage.js | — | Cannabinoid education (7 molecules) |
| /terpenes | TerpenePage.js | — | Terpene education |
| /verify | ProductVerification.js | — | Product authenticity (HMAC) |
| /wholesale | WholesalePortal.js | — | B2B partner orders |
| /scan | ScanPage.js | — | QR scan entry point |

---

## SECTION 7 — DATA INTEGRITY RULES

### 7.1 — ABSOLUTE RULES (violation = silent data corruption)

```
RULE-001  Every INSERT to any tenant-scoped table MUST include tenant_id.
          Violation = silent row rejection via RLS. No error thrown. → Rule 0F

RULE-002  scan_logs has NO tenant_id column. NEVER add it, NEVER filter by it. → LL-056

RULE-003  user_profiles: NEVER upsert. Always UPDATE. → Rule 0E

RULE-004  order_items.line_total is a GENERATED COLUMN. NEVER insert it manually.

RULE-005  useTenant() must be called INSIDE the component that uses it.
          Never assume parent scope provides tenantId to children. → Rule 0G

RULE-006  AVCO (weighted_avg_cost) must be populated before production P&L is meaningful.
          Check: SELECT COUNT(*) FROM inventory_items
                 WHERE (weighted_avg_cost IS NULL OR weighted_avg_cost = 0)
                 AND category IN ('raw_material','terpene','hardware')

RULE-007  Never use the dead tables: products, inventory, scans, production_batches.
          Live replacements: inventory_items, scan_logs, batches.

RULE-008  transaction_type casing is inconsistent. Always use ILIKE not = for filtering.
          WHERE transaction_type ILIKE 'earned' — not = 'earned'. → LL-058, LL-077

RULE-009  Every new HQDashboard tab requires 3 updates: TABS array + render block +
          useNavConfig.js nav entry. All 3 or tab won't appear. → LL-062, LL-063

RULE-010  Never edit: supabaseClient.js, copilotService.js, LiveFXBar.js, PlatformBar.js
          without reading first 3 lines from disk first. These are LOCKED.
```

### 7.2 — AI ROUTING RULE (LL-120)

```
React NEVER calls api.anthropic.com directly.
ALL Claude calls → ai-copilot Edge Function (Supabase) → Anthropic API
Key is Supabase server secret. Anon key is safe to use in React.
```

### 7.3 — DISK IS TRUTH (Rule 0D)

```
Document version numbers are hints only. Disk is always truth.
Before touching any file:
  git show HEAD:src/PATH/FILE.js | Select-Object -First 3
  Get-ChildItem src\components\hq\ | Select-Object Name

If disk says v4.2 and docs say v4.3 → disk wins. Update docs, don't rebuild.
```

---

## SECTION 8 — CRITICAL PROCESS FLOWS

### 8.1 — Purchase Order → Stock → COGS → P&L

```
1. Supplier invoice → upload to HQ Documents
   ↓
2. process-document v1.9 (AI):
   - Extracts supplier, line items, prices
   - allocateLumpSumCosts() → fixes missing unit prices
   - classifyExpenseDocument() → CAPEX/OPEX detect
   - Dedup check: blocks re-processing same reference → LL-084
   ↓
3. Review in 3-panel UI → Confirm
   → purchase_orders + purchase_order_items created
   → inventory_items.quantity_on_hand ++
   → stock_movements (purchase_in, unit_cost = landed_cost_zar)
   → AVCO trigger: weighted_avg_cost recalculated
   ↓
4. HQ Costing: live COGS recipe uses supplier prices × USD/ZAR
   ↓
5. Production run: BOM deducts raw materials
   → stock_movements (production_out, unit_cost from AVCO)
   → finished goods: stock_movements (production_in)
   ↓
6. HQ P&L: COGS = SUM(production_out qty × unit_cost) [WP-FIN S2 live]
```

### 8.2 — Customer Online Purchase → Points → P&L

```
1. Customer browses /shop → adds to cart → /checkout
   ↓
2. CheckoutPage.js v2.4:
   - Fetches loyalty_config (tenant-scoped)
   - Detects loyalty_category from cart items
   - Calculates: pts = base × online_bonus × category_mult × tier_mult
   - Applies first-purchase bonus + crosssell bonus + referral bonus
   - Shows redemption toggle if balance >= min_pts_to_redeem
   - Adjusts PayFast total by redemption value
   ↓
3. PayFast EF: order created → customer redirected to PayFast
   ↓
4. Payment confirmed → OrderSuccess.js:
   - Reads protea_last_order from localStorage (enriched payload)
   - Awards loyalty points (UPDATE user_profiles — never upsert)
   - Writes loyalty_transactions (enriched: category, multiplier_applied, tier_at_time)
   - Writes referral award if code was used
   ↓
5. HQ Costing/Pricing: loyalty cost shows in COGS breakdown + NET AFTER LOYALTY column
   HQ P&L: online revenue from orders table
```

### 8.3 — QR Scan → Points → Anomaly Detection

```
1. Customer scans product QR code → /scan/:code
   ↓
2. ScanResult.js v4.9:
   - Validates QR (HMAC via sign-qr EF, max_scans, expiry)
   - Fetches loyalty_config (tenant-scoped)
   - Fetches active campaigns (tenant-scoped)
   - Reads loyalty_category from inventory_items join
   - Calculates: pts = qr_scan_pts × category_mult × tier_mult × campaign_mult
   - Writes scan_logs (NO tenant_id — LL-056)
   - Writes loyalty_transactions (category, multiplier_applied, tier_at_time, channel)
   - UPDATE user_profiles.loyalty_points (never upsert)
   - Tier upgrade check → WhatsApp via send-notification EF
   - Velocity check: 3+ scans in 60s → anomaly_score += 20
   - 5th scan → SurveyWidget fires
   ↓
3. HQ Fraud: anomaly_score visible per customer
   HQ Analytics: scan data aggregated (join to inventory_items for tenant filter)
```

### 8.4 — Wholesale Order → Invoice → P&L

```
1. HQ Wholesale Orders → New Order → Confirm
   → reserve_stock() DB function → stock_reservations row
   ↓
2. Mark Shipped:
   → sale_out stock_movement × sell_price
   → invoices record auto-created (supplier_id = wholesaler, invoice_number)
   ↓
3. HQ Invoices: aged debtors panel (0/30/60/90+ day buckets)
4. HQ P&L: wholesale revenue = SUM(sale_out qty × sell_price) [WP-FIN S4 live]
```

### 8.5 — HQ → Shop Transfer

```
1. HQTransfer.js → New Transfer → Draft
   ↓
2. Ship: HQ inventory_items.quantity_on_hand -qty (transfer_out movement)
   Reference: TRF-YYYYMMDD-XXXX (UNIQUE)
   ↓
3. Receive at shop: shop inventory_items.quantity_on_hand +qty (transfer_in movement)
   Auto-creates shop item at sell_price=0 if not found (LL-024)
   ↓
4. Cancel in-transit: reverses HQ deduction automatically
```

---

## SECTION 9 — KEY DATABASE TABLES

### Core

| Table | What it holds | tenant_id? |
|---|---|---|
| tenants | All tenant records | — (IS tenant_id) |
| tenant_config | Feature flags, tiers, seats | ✅ |
| user_profiles | Customer + staff data, loyalty_points, loyalty_tier | ✅ |
| inventory_items | All stock items (loyalty_category, pts_override added WP-O) | ✅ |
| stock_movements | Every inventory change (purchase_in/out, production, sale, transfer) | ✅ |
| batches | Production batches | ✅ |
| production_runs | Run details (food fields live here, not on batches — LL-086) | ✅ |

### Finance

| Table | What it holds |
|---|---|
| orders | Online customer orders |
| order_items | Line items (line_total is GENERATED — never insert) |
| expenses | OPEX/CAPEX (written by document ingestion + manual) |
| invoices | Wholesale invoices (supplier_id for all, invoice_number not reference) |
| product_cogs | COGS recipes per SKU |
| product_pricing | Channel sell prices (wholesale/retail/website) |

### Loyalty

| Table | What it holds | tenant_id? |
|---|---|---|
| loyalty_config | Earn rates, tier thresholds, AI flags (UNIQUE per tenant) | ✅ |
| loyalty_transactions | Every points event (audit trail) | ✅ |
| loyalty_ai_log | AI-initiated loyalty actions (churn rescue, etc) | ✅ |
| referral_codes | Customer referral codes | ✅ |
| scan_logs | QR scan events | ❌ NO tenant_id (LL-056) |
| qr_codes | Product QR codes (join to inventory_items for tenant scope) | via join |
| double_points_campaigns | Time-limited multiplier events | ✅ |

### HR

| Table | What it holds |
|---|---|
| employees | Staff records |
| leave_requests | Leave applications |
| timesheets | Clock-in/out |
| stock_take_sessions | Stock count sessions |
| stock_take_items | Per-item counts |

---

## SECTION 10 — WHAT'S COMING (NEXT BUILD PRIORITIES)

### Immediate (no blockers)

```
WP-FIN S5   Balance sheet — CAPEX amortisation, asset register
WP-FIN S6   Cash flow statement
BUG-047     Fix PlatformBar loyalty scope (~30 min)
BUG-045/046 HQTenants cosmetic fixes (~1 hr)
```

### Needs loyalty-ai edge function first

```
Loyalty churn rescue automation
Birthday bonus automation
Point expiry
Streak bonuses
Weekly AI programme brief
```

### Needs Yoco keys (P1 owner action)

```
WP-PAY S1   Yoco online gateway (yoco-checkout + yoco-webhook EFs)
WP-PAY S2   In-store reconciliation
WP-PAY S3   POS via Yoco SDK (needs partner approval)
```

### Medi Recreational demo

```
Load 20-40 product SKUs via HQStock
Set loyalty_category on each SKU
Configure loyalty schema (Standard recommended)
Set pricing in HQPricing
Run end-to-end demo: scan + purchase + points + redemption
```

---

## SECTION 11 — COMPETITIVE POSITION

```
WHAT NO COMPETITOR HAS:
✅ QR + Loyalty + Auth + Analytics in one scan
✅ 8-category dynamic loyalty (margin-aware earn rates)
✅ Harvest Club tier (rewards multi-category loyalists)
✅ Live COGS with FX at render time (not locked-in rates)
✅ Three-state stock reservation (enterprise B2B oversell protection)
✅ Nightly AI loyalty engine (churn rescue, birthday, expiry — pending deploy)
✅ Programme Health Score (1-10) + CLV projection + CPA comparison
✅ Net margin after loyalty per SKU in pricing table
✅ Cross-sell intelligence (bridges front + back of store)
✅ WhatsApp-native referral (wa.me deep link — SA primary sharing channel)
✅ Multi-tenant from day one (RLS-native, not retrofitted)
✅ SA-native: ZAR, Yoco, PayFast, POPIA, SA R638, SA public holidays
✅ Production-tested with real business data

PRICING:
  Starter  R3,500/mo + R8k setup   — Shop + QR + Loyalty + Stock
  Operator R6,500/mo + R15k setup  — Full platform, all modules
  Enterprise R12k+/mo + R25k setup — Full + HQ analytics + white-label
```

---

*ONBOARDING.md v2.0 · NexAI Platform · March 30, 2026*
*Supersedes v1.1 (March 27, 2026) — rewrote to reflect WP-O v2.0 completion.*
*Update after major WP sessions that change architecture or add modules.*
