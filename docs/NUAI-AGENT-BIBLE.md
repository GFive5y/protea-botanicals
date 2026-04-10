## ⚠️ READ THIS FIRST — BEFORE ANY RULE

This platform has 224,293 lines of production code across 190 files.
It is a complete multi-tenant SaaS ERP. It is NOT a dev project building features.
Before you form any opinion about a task, read docs/PLATFORM-OVERVIEW_v1_0.md.

Key numbers every agent must carry:
- 6 portals · 41 HQ tabs · 109 tables · 10 EFs · 17 stock components
- AVCO on every movement · VAT 3-point automated · IFRS statements live
- 4 industry profiles from one codebase · Multi-tenant RLS on all 109 tables

The LIVE-AUDIT is in docs/LIVE-AUDIT_v1_0_part1/2/3.md — authoritative source.

---

# NUAI AGENT BIBLE v1.0 — 08 Apr 2026
## The single authoritative document for every Claude session.
## Read this FIRST. Read this COMPLETELY. Then act.
## All other docs are supplementary. This is the source of truth.

---

# ██████████████████████████████████████████████████████
# RULE 0Q — READ THIS BEFORE ANYTHING ELSE
# ██████████████████████████████████████████████████████

## Claude.ai CANNOT PUSH TO GITHUB. EVER. NO EXCEPTIONS.

**Banned tools for Claude.ai:** `push_files` · `create_or_update_file`
These tools may appear in the Claude.ai tool list. Their presence is NOT permission.

**Why this rule exists:**
- VL-007 (05 Apr), VL-008 (07 Apr), VL-010, VL-011 (08 Apr) — four violations
- Every violation wastes tokens, requires owner intervention, breaks trust
- The tool being listed does not mean Claude.ai is permitted to use it

**The correct three-role workflow:**
Claude.ai  → reads GitHub (get_file_contents only) · plans · produces content
→ writes ONE complete Claude Code instruction block in chat
Claude Code → writes files to disk · verifies compile · commits · pushes
Claude.ai  → confirms via get_file_contents (READ ONLY)

**If Claude.ai finds itself about to call push_files or create_or_update_file:**
1. STOP immediately
2. Log the violation: "I was about to violate RULE 0Q. Logging VL-NNN."
3. Write the content in the chat as a Claude Code instruction block instead

## CLAUDE CODE INSTRUCTION FORMAT — MANDATORY

Every instruction from Claude.ai to Claude Code must be:
- **ONE single code block** — no exceptions
- **Complete** — all file contents, all modifications, exact git commands
- **Self-contained** — can be pasted once and run start to finish
- **No fragmentation** — never split across multiple messages or boxes

If Claude.ai produces multiple boxes, the instruction is WRONG. Start over.

---

# SECTION 1 — SYSTEM IDENTITY

**NuAi** — South Africa's first AI-native multi-tenant ERP for specialty retail.
Built on a real cannabis retail business. Ready to sell as SaaS.

**One sentence:** NuAi turns every stock movement, customer scan, purchase, and staff action
into live intelligence — replacing R1.4M of bespoke software at R3,500–R12,000/month.

**Brand rules:**
- Product name: NuAi (Nu + AI — capital A and I)
- NEVER mention Claude or Anthropic — say "enterprise-grade AI stack"
- NEVER say "cannabis" on public-facing pages, Yoco pages, or receipts (LL-200)
- Yoco SDK = Android/iOS native only — not React web (LL-201)

**Entities:**
| Entity | ID | Role |
|---|---|---|
| Protea Botanicals HQ | 43b34c33-6864-4f02-98dd-df1d340475c3 | Internal operator, never public |
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | Client 2, cannabis_retail |
| Pure Premium THC Vapes | f8ff8d07-7688-44a7-8714-5941ab4ceaa5 | Client 1, cannabis_retail |
| Test Dispensary CT | 064adbdc-faaf-4949-9c4b-b5a927b7f2d1 | cannabis_retail |
| TEST SHOP | 4a6c7d5c-a66a-4a13-b39a-fe836104000c | cannabis_retail |

---

# SECTION 2 — STACK & INFRA
Frontend:   React 18 · Supabase JS client · Inline styles only (no Tailwind/CSS modules)
Backend:    Supabase (Postgres + RLS + Auth + Edge Functions + Storage)
Project: uvicrqapgzcdvozxrreo
AI:         Anthropic Claude via ai-copilot Edge Function ONLY
NEVER call api.anthropic.com from React (LL-120, VL-009)
Payments:   PayFast (sandbox) · Yoco (awaiting keys — after CIPRO)
Hosting:    Vercel · ERP: nuai.vercel.app
Repo:       github.com/GFive5y/protea-botanicals · branch: main
Fonts:      Inter for ALL HQ/admin. Cormorant Garamond + Jost for customer pages only.
OPERATING MODE: BETA DEV MODE (locked until owner changes scope)

Key file paths (confirmed from disk):
useNavConfig.js: src/hooks/useNavConfig.js  (NOT src/navigation/ — that path does not exist)
HQ Finance nav group in useNavConfig: HQ_PAGES array, group: "Finance"
HQ Finance nav items (12): Pricing/Costing/P&L/Balance Sheet/Invoices/Journals/
  Bank Recon/Fixed Assets/Expenses/Forecast/VAT/Year-End Close

Stock data = test only. AVCO = test values.
Physical contact points (Yoco, real deliveries) = skip.
Data is Claude's responsibility — keep it coherent.


**Edge Functions — all active as of 08 Apr 2026:**
| EF | Version | Purpose |
|---|---|---|
| ai-copilot | v59 | All Claude API calls. systemOverride param added. |
| loyalty-ai | v2 | Nightly AI engine. RPC bug fixed. try/catch per user. |
| process-document | v52 | Smart Capture AI extraction. SARS compliance + fingerprint. |
| auto-post-capture | v1 | Atomic accounting on Smart Capture approve. |
| receive-from-capture | v1 | Stock receipt + AVCO on delivery note capture. |
| sim-pos-sales | v4 | POS sales simulator. |
| sign-qr | v36 | QR HMAC signing. |
| verify-qr | v34 | QR validation. |
| send-notification | v37 | WhatsApp via Twilio. |
| get-fx-rate | v35 | Live FX rates. 60s cache. R18.50 fallback. |

---

# SECTION 3 — SESSION START SEQUENCE (MANDATORY EVERY SESSION)

1. List `docs/` directory → identify highest SESSION-STATE version number
2. Read that SESSION-STATE file via `GitHub:get_file_contents`
3. For each build target mentioned: read the actual source file from GitHub — NEVER trust docs alone
4. Read VIOLATION_LOG — know what rules have been broken and why
5. THEN respond with verified, accurate plan

**Never suggest a feature as "pending build" without first reading the source file.**
**Never ask the owner to run PowerShell/bash commands Claude can run via GitHub MCP.**

---

# SECTION 4 — FOUR USER TIERS
TIER 1: OPERATOR (Gerhardt / NuAi team)
Route: /hq → HQDashboard.js v4.3 (30+ active tabs)
Sees: ALL tenants · ALL financial detail · ALL production
Controls: procurement, pricing, fraud, tenants, F&B, HR, loyalty AI
TIER 2: SHOP OWNER / MANAGER
Route: /tenant-portal → TenantPortal.js v3.0
Sees: Their tenant's data only (RLS enforced)
Controls: stock, customers, orders, staff, pricing, Smart Capture
TIER 3: SHOP CLERK / CASHIER
Route: /admin → AdminDashboard.js
Sees: Operational data only
Controls: POS, stock adjustments, customer comms, QR codes
TIER 4: CUSTOMER (end consumer)
Route: /shop, /scan, /loyalty, /account
Actions: browse, buy, scan QR, earn points, redeem, refer friends

---

# SECTION 5 — COMPLETE FEATURE MAP

## 5.1 HQ COMMAND CENTRE (HQDashboard.js v4.3) — 30+ tabs

### OPERATIONS
| Tab ID | Component | What it does | Client benefit |
|---|---|---|---|
| overview | HQOverview.js | KPIs, live alerts, realtime subscriptions, 6 charts | Single screen for day's health |
| supply-chain | SupplyChain.js | Supplier + raw material visibility across all tenants | Know what's flowing in |
| suppliers | HQSuppliers.js | Supplier CRUD, contact management, reliability scoring | Vendor intelligence |
| procurement | HQPurchaseOrders.js v2.1 | FX-aware POs, landed cost calculator (DDP), receive→inventory | Accurate cost from first order |
| hq-production | HQProduction.js v3.5 | BOM, QC gate, allergen tracking, AVCO write-back — 5 industry profiles | End-to-end production control |
| hq-stock | HQStock.js v3.1 | 7-tab stock intelligence: Overview/Items/Movements/Pricing/Receipts/POs/Shop | Real-time inventory truth |
| hq-transfers | HQTransfer.js v1.0 | HQ→Shop stock transfers, TRF-YYYYMMDD ref, auto-receive | Zero stock discrepancies |
| distribution | Distribution.js | Wholesale shipment tracking | B2B delivery visibility |
| hq-trading | HQTradingDashboard.js v3.0 | Daily sales intelligence, 30-day chart, EOD history, month/year selector | Daily business pulse |
| hq-pos | POSScreen.js v2.0 | In-store POS: customer lookup, loyalty (10pts/R1), cash change, session badge | Till operations |
| hq-eod | EODCashUp.js v1.0 | End-of-day reconciliation. Thresholds from tenant_config.settings JSONB | Cash variance alert |

### SMART CAPTURE (Documents tab — HQDocuments.js v2.4 + 3 EFs)
Smart Capture is the AI document ingestion system. It handles:
- **Expense invoices**: Upload → process-document EF (v52) extracts supplier, amounts, classifies CAPEX/OPEX → auto-post-capture EF posts Dr Expense/Cr Bank journal + creates expense row
- **Delivery notes/supplier invoices**: Detected by document type → receive-from-capture EF creates stock movements + AVCO recalculation + Dr 12000 Inventories/Cr 20000 Trade Payables journal
- **Fingerprint dedup**: process-document generates a fingerprint hash — same document blocked from double-posting
- **Auto-retry**: 1 retry after 1.5s on 500 errors
- **Confidence display**: Shows extraction confidence %. Below 70% = manual review flag.
- **Stock receipt panel**: isStockCapture flag triggers "Stock to Receive" UI with matched/unmatched item badges
- Client benefit: Upload a photo of an invoice → stock updated + accounts posted in under 10 seconds

### FINANCE
| Tab ID | Component | What it does |
|---|---|---|
| pricing | HQPricing.js v4.2 | Per-SKU prices × 3 channels (wholesale/retail/website) + NET AFTER LOYALTY column + FX sensitivity |
| costing | HQCogs.js v4.2 | COGS builder: hardware (FX-live), terpene, distillate, lab, transport, packaging + loyalty cost line |
| pl | HQProfitLoss.js v3.2 | Actual P&L: movements-based COGS (AVCO), DB-backed OPEX from expenses table, revenue from orders |
| balance-sheet | HQBalanceSheet.js v1.0 | Assets / Liabilities / Equity. Accounting equation badge. |
| invoices | HQInvoices.js v2.0 | Invoice list + aged debtors (0/30/60/90+ day buckets) + grand total outstanding |
| wholesale-orders | HQWholesaleOrders.js v2.0 | B2B orders → reserve stock → SAGE-style invoice on ship |
| documents | HQDocuments.js v2.4 | Smart Capture AI extraction (see above) |
| journals | HQJournals.js v1.0 | **BEING BUILT NOW** — journal entries, post, reverse, COA picker |

### INTELLIGENCE
| Tab ID | Component | What it does |
|---|---|---|
| analytics | HQAnalytics.js v4.3 | 6 sub-tabs, profile-adaptive, cross-tenant comparisons |
| geo-analytics | GeoAnalyticsDashboard.js | Province/city heatmaps, churn geography, demand gaps |
| retailer-health | RetailerHealth.js | Per-tenant health scoring |
| reorder | HQReorderScoring.js | Automated reorder triggers, draft PO creation |

### PLATFORM (LOYALTY — most complex module)
**HQLoyalty.js v4.0 — 10 tabs:**
1. **Programme** — earn rates, tier thresholds, all config
2. **Tiers** — Bronze/Silver/Gold/Platinum/Harvest Club breakdown
3. **Customers** — all loyalty members, tier distribution
4. **Transactions** — full points ledger
5. **QR Security** — QR code management
6. **Simulator** — POS sales simulator with loyalty preview
7. **AI Engine (Tab 8)** — loyalty-ai EF control: Run Now button, 4 automation toggles, AI Actions Feed
8. **Campaigns** — double-points events
9. **Referrals** — referral code management
10. **Programme Health** — health score (1-10), CLV projection, CPA comparison

**loyalty-ai EF v2 — 5 nightly jobs:**
1. Churn Scoring: recalculates churn_risk_score (0-1) for all customers
2. Churn Rescue: 25pts BONUS to Gold+ customers silent ≥21 days (60-day dedup)
3. Birthday Bonuses: pts_birthday_bonus in birth month (annual dedup per calendar year)
4. Point Expiry: marks is_expired=true, deducts from loyalty_points balance
5. Stock-Boost Suggestions: flags items with >90 days stock on hand for points multiplier suggestion (14-day dedup)
Bonus: Weekly Brief on Mondays — health score + programme stats

**RPC fix in v2:** `increment_loyalty_points(p_user_id uuid, p_points integer)` — was called with wrong param names in v1

| Tab ID | Component | What it does |
|---|---|---|
| fraud | HQFraud.js v2.0 | Cross-tenant anomaly scoring, POPIA deletion tracking, audit log |
| medical | HQMedical.js v1.0 | GATED: prescription patients, SAHPRA reports, dispensing log |
| tenants | HQTenants.js v1.1 | Tenant management + TenantSetupWizard |

### FOOD & BEVERAGE (food_beverage industry profile only)
| Tab ID | Component | Lines | SA Compliance |
|---|---|---|---|
| hq-ingredients | HQFoodIngredients.js | 5082 | 121 SA ingredients, DAFF nutrition data |
| hq-recipes | HQRecipeEngine.js | 1075 | BOM, allergen propagation, "▶ Start Batch" |
| hq-haccp | HQHaccp.js | 1031 | CCP log, NCR auto-raise — SA R638 |
| hq-food-safety | HQFoodSafety.js | 632 | Certificate vault, expiry alerts |
| hq-nutrition | HQNutritionLabel.js | 590 | SA R638 nutritional label generator |
| hq-cold-chain | HQColdChain.js | 798 | Temperature monitoring, breach detection |
| hq-recall | HQRecall.js | 791 | Product recall, lot traceability, FSCA letter |
| hq-food-intelligence | HQFoodIntelligence.js | — | AI-powered weekly F&B brief |

### HR SUITE (HRDashboard.js — 13 modules)
| Component | What it does |
|---|---|
| HRStaffDirectory.js | Staff list, search, CSV export, setup wizard |
| HRStaffProfile.js | Single employee deep-view |
| HRLeave.js | Leave requests, approval, conflict detection |
| HRTimesheets.js | Batch approve, QR clock-in, hours monitor, setup wizard |
| HRContracts.js | HTML→PDF contracts, template library |
| HRDisciplinary.js | Warnings, hearings, appeals |
| HRComms.js | Inbox, broadcasts, acknowledgements |
| HRCalendar.js | 13 event layers, SA public holidays, MiniMonth, diary |
| HRLoans.js | Loans, stipends, repayment tracking |
| HRPayroll.js | SimplePay-compatible CSV export |
| HRPerformance.js | KPI forms, PIP tracker, goals |
| HRSettings.js | Leave types, work hours, warning templates |
| HRStockView.js | Stock takes — blind/guided, schedule, approve |

## 5.2 TENANT PORTAL (TenantPortal.js v3.0)
The client's own portal. URL: /tenant-portal. Role-based nav.
Key sections: Dashboard · Inventory (Stock, Catalog) · Ordering · Operations (Daily Trading, Cash-Up, Smart Capture) · Sales (POS Till, Pricing, Loyalty, Invoices) · Customers (Profiles, QR Codes, Messaging) · Reports · Team (Staff, Roster, Timesheets, Leave, Contracts, Payroll, Calendar)

**Customer Profiles tab:**
50 mock customers seeded for Medi Rec (PwC-style test dataset):
- UUID pattern: a0000001-0000-0000-0000-00000000000X
- Tiers: Bronze×20, Silver×15, Gold×10, Platinum×4, Harvest Club×1, Suspended×1
- ~250 loyalty transactions across 90 days

## 5.3 CUSTOMER-FACING PAGES
| Route | Component | What it does |
|---|---|---|
| /shop | Shop.js | Profile-adaptive product listing (VapeCard/FoodShopCard/GeneralShopCard) |
| /scan/:code | ScanResult.js v4.9 | QR scan: auth + points + fraud check + velocity detection |
| /checkout | CheckoutPage.js v2.4 | PayFast + 8-category loyalty stack + redemption + referral |
| /loyalty | Loyalty.js v5.7 | Points balance, tier progress, Harvest Club, referral code |
| /account | Account.js v6.4 | Profile, loyalty history, settings |

## 5.4 AI SYSTEM (ProteaAI — unified, NEVER rebuild or duplicate)
**ProteaAI.js — LOCKED. str_replace CODEBASE_FACTS string only.**
3 tabs: Chat (tab-aware streaming) / Query (plain English → live SQL) / Dev (error capture)
Route: ALL Claude calls → ai-copilot EF v59 (never direct Anthropic API from React — LL-120)
ai-copilot v59 contract: POST `{ messages, userContext, systemOverride }` → `{ reply, model, usage, error }`
When systemOverride provided: tools skipped, caller's system prompt used.

## 5.5 PLATFORM INTELLIGENCE BAR (PlatformBar.js — LOCKED)
40px sticky bar. Icons: Alerts 🔔 · Comms 💬 · Fraud 🛡 · Actions ⚡
Never modify. Premium hand-crafted SVG icons.

## 5.6 AVCO COST ENGINE
Every stock movement → stock_movement_stamp trigger → calculate_avco(item_id)
→ inventory_items.weighted_avg_cost updated
Pattern always: weighted_avg_cost ?? cost_price ?? 0
NEVER use cost_price alone for P&L calculations.
HQCogs.js uses SEPARATE cost engine (product_cogs recipes) — never mix.

## 5.7 THREE-STATE STOCK RESERVATION
quantity_on_hand  = physical (changes on physical movement only)
reserved_qty      = soft hold for B2B orders (never physical)
available_qty     = on_hand - reserved_qty (COMPUTED — NEVER stored)
DB functions: get_available_qty() · reserve_stock() · release_reservation()
reserve_stock() on ORDER CONFIRMATION only — never on draft

## 5.8 FEATURE FLAGS (tenant_config)
feature_hq · feature_ai_basic · feature_ai_full · feature_medical
feature_white_label · feature_wholesale · feature_hr
Gate: tenantConfig?.feature_X !== false
(absence = enabled — backwards compatible)
tenant_config.settings (JSONB): EOD thresholds — ALWAYS read from here, never hardcode

---

# SECTION 6 — DATABASE SCHEMA (CONFIRMED COLUMN NAMES)

**Critical: never guess column names. These have caused silent failures.**

### Key Tables — Exact Columns

**journal_entries:** id, tenant_id, journal_date (DATE), reference, description, journal_type, status (draft/posted/reversed), created_by (UUID), posted_by (UUID), posted_at (TIMESTAMPTZ), financial_year (TEXT e.g.'FY2026'), created_at, is_year_end_closing (BOOLEAN)

**journal_lines:** id, journal_id, tenant_id, account_code, account_name, debit_amount (NUMERIC), credit_amount (NUMERIC), description, line_order (INTEGER)

**chart_of_accounts:** account_code, account_name, account_type (40 rows, cannabis retail template, codes 10000-69999)

**loyalty_config:** pts_qr_scan, pts_per_r100_online, online_bonus_pct, mult_bronze/silver/gold/platinum, threshold_silver/gold/platinum, pts_referral_referrer, pts_referral_referee, redemption_value_zar, min_pts_to_redeem, max_redeem_pct_per_order, pts_expiry_months, pts_birthday_bonus, birthday_bonus_active, ai_churn_rescue_enabled, ai_churn_rescue_threshold_days (21), ai_stock_boost_enabled, ai_stock_boost_days_on_hand (90), ai_crosssell_nudge_enabled, ai_margin_guard_pct, ai_promo_suggestions_enabled, threshold_harvest_club, mult_tier_harvest_club, mult_cat_cannabis_flower/vape/edible/seeds_clones/grow_supplies/accessories/health_wellness/lifestyle_merch, streak_visits_threshold (3), streak_visits_bonus_pts (50), streak_spend_threshold_zar (1000), streak_spend_bonus_pts (100)

**user_profiles:** id (FK to auth.users), tenant_id, full_name, email, phone, role, loyalty_points (NUMERIC), loyalty_tier (TEXT), churn_risk_score (NUMERIC 0-1), last_purchase_at (TIMESTAMPTZ), monthly_visit_count (INT), monthly_spend_zar (NUMERIC), category_flags (JSONB), date_of_birth (DATE), is_suspended (BOOLEAN), anomaly_score (INT)

**loyalty_transactions:** id, tenant_id, user_id, points (NUMERIC), transaction_type (TEXT — use ILIKE not =), description (TEXT), transaction_date (TIMESTAMPTZ), channel (TEXT), ai_triggered (BOOLEAN), expires_at (TIMESTAMPTZ), is_expired (BOOLEAN)

**loyalty_ai_log:** id, tenant_id, action_type (TEXT: churn_rescue/birthday_bonus/stock_boost_suggestion/point_expiry/weekly_brief), target_user_id (UUID nullable), target_item_id (UUID nullable), payload (JSONB), outcome (TEXT), created_at (TIMESTAMPTZ)

**orders:** id, tenant_id, user_id, total (NUMERIC — NOT total_amount), status (pending/paid/failed/cancelled/refunded)

**order_items:** id, order_id, product_name (TEXT — no inventory_item_id FK), line_total (GENERATED — NEVER INSERT)

**inventory_items:** id, tenant_id, name, category (ENUM::inventory_category), loyalty_category (SEPARATE — TEXT), quantity_on_hand (NUMERIC), reserved_qty (NUMERIC), weighted_avg_cost (NUMERIC), sell_price (NUMERIC), is_active (BOOLEAN)
NOTE: NO 'notes' column on inventory_items (LL-181)

**scan_logs:** NO tenant_id column — NEVER filter by it (LL-056)

**expenses:** id, tenant_id, category (opex/capex), subcategory (TEXT), description, amount_zar (NUMERIC), expense_date (DATE)

**bank_accounts:** id, tenant_id, bank_name, account_name, account_number, branch_code, account_type, currency, opening_balance, is_active, is_primary

**bank_statement_lines:** id, bank_account_id, tenant_id, statement_date, description, reference, debit_amount, credit_amount, balance, matched_type, matched_id, matched_at, import_batch

**fixed_assets:** id, tenant_id, asset_name, asset_code, category, purchase_date, cost, residual_value, useful_life_months, depreciation_method, accumulated_depreciation, is_active

**vat_transactions:** id, tenant_id, transaction_date, vat_period (TEXT 'YYYY-MM'), source_type, source_id, source_ref, vat_type (output/input), vat_code, exclusive_amount, vat_amount, inclusive_amount, vat_rate (NUMERIC 0.15), is_claimed

**equity_ledger:** id, tenant_id, financial_year (TEXT), opening_retained_earnings, share_capital, net_profit_for_year, dividends_declared, owner_drawings, closing_retained_earnings, year_end_closed (BOOLEAN), year_end_date

**eod_cash_ups:** UNIQUE(tenant_id, cashup_date) · variance is GENERATED (never insert) · field = system_cash_total (NOT expected_cash)

### DB State — Medi Rec (verified 08 Apr 2026)
user_profiles (customers): 50 rows
loyalty_transactions:       ~250 rows across 90 days
loyalty_ai_log:             181 stock_boost + 3 churn_rescue + 5 birthday_bonus
auth.users (mock):          50 rows (a0000001-0000-0000-0000-00000000000X)
journal_entries:            5 rows | journal_lines: 10 rows
vat_transactions:           6 rows | bank_accounts: 1 | bank_statement_lines: 22
fixed_assets:               3 rows | chart_of_accounts: 40 rows | equity_ledger: 1

### RLS — Tables With Enabled Policies (April 8, 2026)
Standard tenant isolation on all 50+ tables.
Finance tables with service INSERT policies (for EF writes):
bank_accounts · bank_statement_lines · capture_queue · capture_rules · chart_of_accounts · depreciation_entries · equity_ledger · financial_year_archive · fixed_assets · journal_entries · journal_lines · vat_transactions

---

# SECTION 6.5 — GLOSSARY / TERMINOLOGY

Read once. Used throughout this Bible and BUILD-LOG.md.

| Term | Meaning |
|---|---|
| **EF** | Edge Function — Supabase TypeScript serverless function in supabase/functions/. NuAi has 14 EFs as of v224. Each lives in its own directory with index.ts. Deployed with: `supabase functions deploy <name> --project-ref uvicrqapgzcdvozxrreo` |
| **WP** | Work Package — a named body of work spanning multiple sessions (e.g. WP-FINANCIALS, WP-NAV-RESTRUCTURE) |
| **GAP-Xnn** | A commercial-readiness gap from COMMERCIAL-READINESS_v1_0.md that must be closed before launch (e.g. GAP-C02 = email infrastructure) |
| **LL-nnn** | Lesson Learned — a numbered rule derived from a past mistake. Listed in Section 7 below |
| **RLS** | Row Level Security — Postgres policy restricting which rows each user/role can read or write |
| **LL-205** | Every new DB table needs a `hq_all_<table>` policy using `is_hq_user()` so the HQ operator can read across tenants |
| **AVCO** | Average Cost — inventory valuation method, recalculated by DB trigger on every stock movement |
| **IFRS** | International Financial Reporting Standards — accounting framework NuAi's financial suite targets |
| **HQ** | The internal operator portal at /hq. Cross-tenant. 41+ tabs. Not a tenant — it is the platform operator's command centre |
| **VAT201** | SARS bi-monthly VAT return form. NuAi auto-populates fields 1, 4, 12, 16 from vat_transactions |
| **SARS** | South African Revenue Service — tax authority |
| **SAHPRA** | South African Health Products Regulatory Authority (medical cannabis compliance) |
| **POPIA** | Protection of Personal Information Act (SA equivalent of GDPR) |
| **BCEA** | Basic Conditions of Employment Act (SA) — drives HR Leave module rules |
| **Smart Capture** | Document AI ingestion: photo of invoice → process-document EF → auto-post-capture EF → atomic expense + journal + VAT |
| **WP-STOREFRONT-WIZARD** | Self-service tenant onboarding wizard at /onboarding. 7 steps: brand → colour → industry → template → products → loyalty → go live. Phases 1–3 shipped (HEAD: 872f927). Phase 4 pending: legacy shop-key writes in Step 7 launch handler, "Protea Rewards" rebrand on /shop, HQTenants Invite User real auth invite (LL-212). |

---

# SECTION 7 — CRITICAL RULES (CONSOLIDATED)

## Architecture Rules
- **LL-120**: React NEVER calls api.anthropic.com. ALL Claude calls via ai-copilot EF.
- **RULE 0F**: Every INSERT to tenant-scoped table MUST include tenant_id.
- **RULE 0G**: useTenant() called INSIDE the component — never assume parent scope.
- **RULE 0H**: Fix code bugs in CODE, not data. Only exception: corrupt legacy data.
- **RULE 0L**: Read HQStock.js before ANY inventory-related build.
- **RULE 0K**: Never replace a renderTab() case without explicitly listing what becomes unreachable.

## Building Rules
- **LL-195**: Read source file from GitHub FIRST. Determine state. THEN suggest.
- **LL-193**: SESSION-STATE docs lag behind code. Always verify from disk.
- **LL-192**: When GitHub MCP is available, file inspection is Claude's job. Never ask owner to run PowerShell.
- **LL-178/LL-179**: New features = new nav entries + new cases. NEVER hijack existing cases.
- **RULE 0P**: Three questions before every build: WHO / WHAT / DOES IT EXIST?

## Schema Rules
- **LL-181**: inventory_items has NO 'notes' column.
- **LL-182**: inventory_items.category is an ENUM — SQL needs ::inventory_category cast.
- **LL-191**: loyalty_transactions.transaction_type — use ILIKE, never =.
- **LL-189**: movement_type: 'sale_pos' for POS, 'sale_out' for wholesale only.
- **LL-190**: EOD thresholds ALWAYS from tenant_config.settings JSONB — never hardcode.
- **LL-056**: scan_logs has NO tenant_id — NEVER filter by it.
- **LL-198**: eod_cash_ups.variance is GENERATED — never insert. Field = system_cash_total.
- **R-FY-01**: journal_entries.financial_year is TEXT ('FY2026') — no financial_year_id FK.

## Code Style Rules
- **LL-196**: fontWeight minimum 400 body, 600 values. fontSize minimum 11px. borderRadius 10+ on cards.
- **LL-197**: Always use ChartCard/ChartTooltip/DeltaBadge from src/components/viz/.
- **LL-184**: Code boxes contain executable content ONLY. No labels immediately above fences.
- **LL-183**: Git in PowerShell — separate lines only. No && operator.

## New Rules (08 Apr 2026)
- **LL-203**: Claude Code instructions are ONE complete block. No fragmentation. No multiple boxes. All file contents + all modifications + exact git commands in one paste.
- **LL-204**: BETA DEV MODE is locked. Stock = test data. Physical contact points = skip. Data coherence is Claude's responsibility.
- **R-TDZ-01**: useCallback referencing another useCallback must be declared AFTER it. TDZ applies.
- **R-PGRST-01**: After adding columns via raw SQL, always NOTIFY pgrst, 'reload schema'.
- **loyalty_dedup_guard**: This is the trigger name on loyalty_transactions. Disable before bulk seeding, re-enable after.
- **ai-copilot v59**: increment_loyalty_points RPC signature is (p_user_id uuid, p_points integer).

## Critical Discoveries (08 Apr 2026 — Session v209)

- **LL-205 — HQ OPERATOR RLS BYPASS — MANDATORY FOR ALL NEW TABLES**:
  Every new DB table that HQ operators need to read MUST have an is_hq_user() bypass policy.
  PATTERN (copy exactly):
  CREATE POLICY "hq_all_[tablename]" ON [tablename] FOR ALL TO public USING (is_hq_user());
  is_hq_user() reads user_profiles.hq_access = true. Already used by orders + inventory_items.
  ROOT CAUSE: switchTenant() only updates React context — auth.uid() never changes.
  The standard RLS policy (tenant_id = user_profiles.tenant_id WHERE id = auth.uid()) blocks
  all cross-tenant reads for the HQ operator unless the is_hq_user() bypass policy also exists.
  APPLIED 08 Apr 2026 to these previously missing tables (migration: hq_operator_access_finance_tables):
    journal_entries · journal_lines · vat_transactions · fixed_assets
    bank_accounts · bank_statement_lines · expenses
  SYMPTOM: HQ tab shows 0 rows / empty state despite data confirmed in DB. Always check LL-205 first.
  CHECK: Before shipping any new table, verify it has both the tenant isolation policy AND hq_all_ policy.

- **LL-206 — useTenant HOOK — CORRECT PATTERN (CODEBASE-CONFIRMED)**:
  Import:  import { useTenant } from '../../services/tenantService';
  NEVER:   import { useTenant } from '../../hooks/useTenant';  — wrong path, does not exist
  Destructure:  const { tenant } = useTenant();
                const tenantId = tenant?.id;
  NEVER:   const { tenantId } = useTenant();  — tenantId is not directly exposed
  Confirmed on: HQBalanceSheet.js · HQProfitLoss.js · HQJournals.js · all HQ components.
  Adjust relative path for component depth (../../ for hq/ components).

- **LL-208 — ALWAYS PATCH ALL FINANCE TABLES IN ONE MIGRATION**:
  depreciation_entries was missed from the LL-205 migration and had to be patched mid-session.
  Before any LL-205 migration, enumerate ALL tables HQ operators will query.
  Standard finance table checklist:
  journal_entries · journal_lines · vat_transactions · fixed_assets · depreciation_entries
  bank_accounts · bank_statement_lines · expenses
  Any new table → add hq_all_ policy in the SAME migration. Never ship a new table without it.

- **LL-207 — switchTenant() ARCHITECTURE — NO PROPS NEEDED ON HQ CHILDREN**:
  HQDashboard calls switchTenant(selected) when operator changes the VIEWING dropdown.
  This updates the global useTenant() context for ALL child components simultaneously.
  HQ child components receive NO tenantId props — they call useTenant() directly.
  CORRECT:   {activeTab === 'journals' && <HQJournals />}
  WRONG:     {activeTab === 'journals' && <HQJournals tenantId={x} />}
  If a child component shows 0 data in HQ view — check LL-205 (missing RLS policy) first,
  not the component code or props. The architecture is correct by design.

## GAP-C02 Discoveries (10 Apr 2026 — Session v224)

- **LL-211 — send-email EF deployed with verify_jwt: true (all others are false)**:
  Test email flows from production URL, not localhost — JWT may not pass correctly
  from local dev, causing silent EF failures (email_logs remains empty).
  When debugging an email send that "did nothing", first check: are you on localhost?
  If yes, retry from nuai-gfive5ys-projects.vercel.app before suspecting code.

- **LL-212 — user_invitation email type sends a notification only**:
  It does NOT create a Supabase auth account or grant portal access.
  Real tenant onboarding requires supabase.auth.admin.inviteUserByEmail()
  PLUS a send-email call for the branded welcome. Never conflate the two.
  The HQTenants Invite User button currently sends email only — auth invite
  is the next-session fix tracked in BUILD-LOG.md.

- **LL-213 — email_logs table has no migration file**:
  Project has no migrations directory. email_logs was applied directly via
  Supabase MCP. Future DB changes follow the same pattern: SQL applied via
  MCP or Supabase dashboard SQL editor, not migration files in the repo.
  Always record schema changes in BUILD-LOG.md so future agents can reconstruct
  current DB state without grep'ing for non-existent migration files.

## WP-STOREFRONT-WIZARD Discoveries (10 Apr 2026 — Session v228)

- **LL-214 — TESTING PROTOCOL — MANDATORY**:
  Never test a Vercel deployment with Ctrl+R. The browser serves cached JS
  bundles — fixes appear to do nothing. ALWAYS test in incognito after
  confirming the Vercel dashboard shows "Ready" for your commit hash. This
  rule prevented multiple wasted sessions of correct code appearing broken.
  Correct protocol:
    1. Wait for Vercel dashboard "Ready" status on the target commit
    2. Open an incognito window
    3. Hard reload only if needed (DevTools → Network → Disable cache)
    4. If service worker persists: Application → Service Workers → Unregister
  NEVER trust a regular-window Ctrl+R reload to verify a fix.

- **LL-215 — PostgREST enum filter — CRITICAL**:
  When using .in() on an enum-typed column in Supabase JS, PostgREST casts
  EVERY value to the Postgres enum type. An invalid enum value causes the
  ENTIRE query to return 0 rows with no error thrown. Always validate filter
  values against the actual enum before using them in .in() queries.
  Valid inventory_category values (as of 10 Apr 2026):
    finished_product, raw_material, terpene, hardware, packaging,
    concentrate, flower, edible, topical, medical_consumable,
    accessory, service
  NEVER add 'other' or any unlisted value to category filters. The bug
  that prompted this rule: 'other' in Shop.js category filter caused the
  Vozel Vapes product grid to return 0 rows silently for multiple sessions
  while other fixes were chased in the wrong file.

- **LL-216 — branding_config DUAL-KEY SYSTEM**:
  Wizard writes:
    primary_color, font_family, template, terminology_profile,
    wizard_complete, launched_at, logo_url
  Shop.js and ClientHeader read:
    brand_name, accent_color, btn_bg, btn_text, hero_eyebrow,
    hero_tagline, nav_logo_text, stat_1_value/label … stat_4_value/label
  BOTH key sets must exist in branding_config for wizard-launched tenants.
  Step 7 launch handler in OnboardingWizard.js must write BOTH sets using
  select → merge → update (never overwrite the whole branding_config column).
  Vozel Vapes was patched manually via MCP — Phase 4 must fix this in code
  for all new tenants.

- **LL-217 — ClientHeader vs NavBar — the visible shop header**:
  On /shop/* routes the visible fixed header is ClientHeader.js, NOT NavBar
  from App.js. ClientHeader sits above NavBar with position:fixed. When
  fixing shop branding issues, always look at ClientHeader first. The
  correct hook is useStorefront() (public, slug/domain-resolved) — NOT
  useTenant() (which is for authenticated portals). This rule cost multiple
  sessions: the navbar was being "fixed" in the wrong component for days.

- **LL-218 — StorefrontContext is CONSUMER-SIDE ONLY**:
  useStorefront() is for consumer shop context (anonymous visitors at /shop).
  useTenant() is for authenticated portal context (HQ/admin/tenant/HR/staff).
  Never mix them. StorefrontContext resolves tenant from URL slug or hostname
  on mount. useTenant() resolves from the authenticated user's session via
  user_profiles.tenant_id. They answer different questions and live in
  different providers.

- **LL-219 — DIAGNOSTIC BEFORE FIX PROTOCOL**:
  When a bug survives multiple fix attempts:
    1. Stop writing fixes
    2. Ask Claude Code to answer 4 specific diagnostic questions with
       exact line numbers
    3. Add ONE console.log and deploy to read runtime state in incognito
    4. Only then write the targeted fix
  The Q1–Q4 diagnostic approach (session v228) identified the 'other' enum
  bug in one round after 8 failed fix attempts. "Stop guessing, read the
  runtime" is always cheaper than another speculative patch.

- **LL-220 — WP-STOREFRONT-WIZARD ARCHITECTURE**:
  The wizard (Phases 1–3) creates tenants via a stub-first approach: a
  minimal row is created on Step 1 Continue, enriched as the wizard
  progresses. wizard_complete stays false until Step 7 launch, which flips
  it true AND writes launched_at + (Phase 4 target) the legacy shop keys.
  The consumer shop at /shop/:slug resolves via
  StorefrontContext.resolveStorefront() which matches
  window.location.pathname on mount. StorefrontProvider wraps the entire
  app and runs ONCE on mount — it does NOT re-run on client-side route
  changes. Direct navigation (target="_blank", window.open, or fresh tab)
  is therefore always reliable; client-routed navigation from another
  app route is not. The wizard success state opens the live URL via
  target="_blank" for this reason.

---

## Pre-Build Audit Rules (added v229 — 11 April 2026)

- **LL-221 — PRE-BUILD AUDIT IS MANDATORY BEFORE EVERY WP STAGE**:
  Before any file is opened in Claude Code, the agent must answer these five
  questions from the actual source code — not the spec or session docs:
  1. Which source files does this WP touch? Read each one via GitHub MCP first.
  2. Which DB tables are involved? Verify hq_all_ RLS policies for each (LL-205).
  3. Which Edge Functions are called? Read their index.ts to confirm exact input/output contracts.
  4. What prerequisites must ship before this WP works correctly?
  5. What does the spec or brainstorm doc miss?
  The agent writes a brief audit summary in chat (10-20 lines) before the first
  Claude Code instruction block. If the audit reveals scope errors, the scope is
  corrected before building begins. This rule exists because sessions go long not
  because the code is hard, but because the scope was written without reading the
  system. Debugging is exponentially cheaper in the planning phase.
  ROOT CAUSE this rule addresses: WP scoped too lightly → agent builds what's
  written → hits unscoped problem → 3 sessions of debugging → realises scope
  was wrong from the start. Never again.

---

## AGENT CAPABILITIES — READ THIS AT EVERY SESSION START

Every Claude agent working on NuAi has two live connections available
throughout the session. Use them proactively — never ask the owner to
run commands or queries that these tools can answer directly.

### 1 — GitHub MCP (repo read access — READ ONLY)
Tool: GitHub:get_file_contents
Repo: GFive5y/protea-botanicals (public)
Use for:
  - Reading any source file before touching it (mandatory per LL-195)
  - Reading all docs/ files at session start
  - Verifying current state of any component before planning a change
  - Confirming a feature exists or doesn't before suggesting it (LL-003/004)
Limitation: READ ONLY from Claude.ai. NEVER call push_files or
  create_or_update_file from Claude.ai (RULE 0Q — 12 violations logged).
  All writes go through Claude Code.

### 2 — Supabase MCP (database read + write)
Project: uvicrqapgzcdvozxrreo (eu-west-1)
Use for:
  - Verifying live DB state (table row counts, column names, config values)
  - Checking RLS policies on any table (LL-205 compliance)
  - Reading branding_config, tenant_config, wizard_complete status
  - Applying schema changes (new tables, new columns, new policies)
    when no migration file workflow exists (LL-213)
  - Seeding or correcting data when a bug is in data, not code (RULE 0H)
Limitation: Schema changes must be recorded in BUILD-LOG.md so future
  agents can reconstruct DB state. Never apply a schema change without
  logging it.

### Correct session start sequence using both tools
1. GitHub:get_file_contents → docs/ directory listing → read SESSION-STATE (latest N)
2. GitHub:get_file_contents → docs/NUAI-AGENT-BIBLE.md
3. GitHub:get_file_contents → docs/VIOLATION_LOG_v1_1.md
4. GitHub:get_file_contents → each source file relevant to the session's WP
5. Supabase MCP → verify any DB state the session doc references
   (e.g. wizard_complete, vat_registered, RLS policies on new tables)
6. Only then: produce the build plan or Claude Code instruction block

Never ask the owner to run PowerShell, bash, or Supabase SQL queries
that these tools can answer. That is Claude's job (LL-192).

## Locked / Protected Files
LOCKED (never modify):
src/components/StockItemModal.js    — 14 product worlds
src/components/ProteaAI.js          — str_replace CODEBASE_FACTS only
src/components/PlatformBar.js
src/services/supabaseClient.js
PROTECTED (read full file before any change):
src/components/hq/LiveFXBar.js
src/components/hq/HQStock.js        — 7 tabs, 14 worlds (RULE 0L)
src/pages/ScanResult.js             — 1700+ lines, complex
src/components/hq/HQCogs.js         — 3000+ lines, separate cost engine

## Adding a New HQDashboard Tab — ALL FOUR REQUIRED

Import:   import NewComp from '../components/hq/NewComp';
TABS[]:   { id: 'new-tab', label: 'Name', icon: '🔧', ready: true }
Render:   {activeTab === 'new-tab' && <NewComp />}
Nav:      useNavConfig.js HQ_PAGES array — { group: 'Finance', label: 'Name', path: '/hq?tab=new-tab' }
Missing any one = silent failure (BUG-006 pattern)


---

# SECTION 8 — CURRENT STATE (08 Apr 2026)

## HEAD: 944416c · Repo: github.com/GFive5y/protea-botanicals

## Commits This Session (on top of v206)
| SHA | What |
|---|---|
| 02bdc33 | HQOverview crash — name missing from cannabis inventory SELECT |
| 266261e | Smart Capture auto-retry on 500 |
| 3e6aa5a | ProteaAI LL-120 fix — both handleSend + handleQuery via EF |
| 39a29e2 | CODEBASE_FACTS — loyalty-ai v2, 50 mock customers, AI Actions Feed |
| 944416c | SESSION-STATE v207 |
| 1219683 | HQJournals wiring — HQDashboard + useNavConfig (pre-build commit) |
| a42d13d | HQJournals.js v1.0 — WP-FINANCIALS Phase 5 · 660 lines |
| [db]    | Supabase migration: hq_operator_access_finance_tables (7 tables, no code commit) |
| [docs]  | SESSION-STATE v209 + NUAI-AGENT-BIBLE LL-205/206/207 (this commit) |
| 228170e | HQBankRecon.js v1.0 — WP-FINANCIALS Phase 7 · 384 lines |
| 013eba8 | HQFixedAssets.js v1.0 — WP-FINANCIALS Phase 4 · 433 lines |
| aa755a9 | HQ Finance nav wiring fix — Expenses + VAT + YearEnd + Forecast |
| [docs]  | SESSION-STATE v210 + NUAI-AGENT-BIBLE full session patches |

## Verified Working (screenshots confirmed 08 Apr 2026)
P&L (R477,880 revenue · 62.13% gross margin · R296,606 net profit) · Balance Sheet · Cash Flow · Year-End Close · Smart Capture (95% confidence, auto-retry) · ProteaAI (EF-routed) · Loyalty AI Engine Tab 8 (Run Now, dedup confirmed) · Customer Profiles (50 customers) · RLS (12 finance tables)
HQJournals.js v1.0 (WP-FINANCIALS Phase 5): journal list · expand-to-lines · type/status/FY filters · COA picker grouped by account type · post · reverse · delete draft · stats strip · audit trail
HQBankRecon.js v1.0 (WP-FINANCIALS Phase 7): FNB account · R180,733.69 closing balance reconciled · 22 lines · inline categorise · Balance Sheet Cash link
HQFixedAssets.js v1.0 (WP-FINANCIALS Phase 4): 3 assets · R59,774.44 NBV · Run Depreciation modal · depreciation history · PP&E Balance Sheet note
HQ Finance nav complete: 12 items — Pricing/Costing/P&L/Balance Sheet/Invoices/Journals/Bank Recon/Fixed Assets/Expenses/Forecast/VAT/Year-End Close
RLS HQ bypass (LL-205): 8 tables patched (7 main + depreciation_entries mid-session)

## Outstanding Owner Actions
- **pg_cron**: Supabase Dashboard → Database → Extensions → enable pg_cron, then:
```sql
  SELECT cron.schedule('loyalty-ai-nightly', '0 2 * * *',
    $$SELECT net.http_post(url:='https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1/loyalty-ai',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{"scheduled":true,"tenant_id":"b1bad266-ceb4-4558-bbc3-22cfeeeafe74"}'::jsonb);$$);
```
- **Yoco keys**: After CIPRO → portal.yoco.com

## Next Dev Priorities
1. HQVat.js — Assessment before build (component exists on disk — 19KB · wired at /hq?tab=vat)
   CRITICAL: Read existing component first. Data model issues documented in SESSION-STATE v210.
   tenant_config.vat_registered = null — configure first. Source data gaps exist.
   Do NOT rebuild without reading the existing file and understanding current state.

2. HQFinancialStatements.js — Unified shell (Option A: build after all pieces verified)
   Absorbs: Journals · BankRecon · FixedAssets · VAT · FinancialNotes · FinancialSetup

3. VAT Auto-Population Pipeline — Backlog
   Edge Function/SQL: orders + expenses → vat_transactions (proper per-transaction rows)
   Blocked on: tenant VAT configuration + owner decision on data model

4. Depreciation catch-up — Owner action (not dev)
   Run HQFixedAssets → Run Depreciation for each missing month (15-23 months per asset)

---

# SECTION 9 — DOCUMENT MAP

All docs live in `docs/` in the repo. Read via GitHub:get_file_contents.

| Document | Purpose | Freshness |
|---|---|---|
| NUAI-AGENT-BIBLE.md | **This file** — single source of truth | 08 Apr 2026 |
| SESSION-STATE_vNNN.md | Latest session state — find highest N | Always latest |
| SESSION-CORE_v2_11.md | All LL rules + schema facts + RULE 0Q | 08 Apr 2026 |
| VIOLATION_LOG_v1_1.md | All rule violations — read to understand failure patterns | 08 Apr 2026 |
| CAPABILITIES_v2_0.md | Feature map (older — Bible supersedes for current state) | 04 Apr 2026 |
| ONBOARDING_v2_0.md | Architecture + process flows | 30 Mar 2026 |
| STRATEGY_v2_0.md | Business strategy, pricing, competitive position | 30 Mar 2026 |
| SESSION-LOG_DEFINITIVE.md | Commit history v180 onwards | 06 Apr 2026 |
| WP-FINANCIALS-v1_1.md | Financial suite spec (Phases 0-10) | 07 Apr 2026 |
| WP-O_v2_0_Loyalty_Engine_Spec.md | Loyalty engine spec | — |
| REGISTRY_v3_2.md | Component registry + feature index | 04 Apr 2026 |
| LL-ARCHIVE_v1_0.md | LL-001 through LL-173 (historical reference) | — |

**READ ORDER FOR FRESH SESSION:**
1. NUAI-AGENT-BIBLE.md (this file)
2. SESSION-STATE_vNNN (latest — for current priorities)
3. VIOLATION_LOG (to know what rules are being broken)
4. Source file for build target (verify state from disk before planning)

---

# SECTION 10 — PROCESS FLOWS

## Smart Capture Flow
Owner photographs supplier invoice
→ Upload to HQDocuments.js
→ process-document EF v52 (AI extraction, SARS compliance, fingerprint dedup)
→ If isStockCapture (delivery note): receive-from-capture EF
→ stock_movements (purchase_in) → AVCO recalculation
→ journal_entries: Dr 12000 Inventories / Cr 20000 Trade Payables
→ If expense invoice: auto-post-capture EF
→ expenses row → journal_entries: Dr expense / Cr 10100 Bank
→ UI shows confidence %, matched items, success badge

## Customer Scan Flow
Customer scans product QR → /scan/:code
→ ScanResult.js v4.9: HMAC validate (sign-qr EF) → velocity check → loyalty_category
→ pts = qr_scan_pts × category_mult × tier_mult × campaign_mult
→ loyalty_transactions INSERT + user_profiles.loyalty_points UPDATE
→ If tier upgrade → send-notification EF (WhatsApp)
→ If anomaly_score > 85 → PlatformBar 🛡 icon pulses

## Online Purchase Flow
Cart → /checkout → CheckoutPage.js v2.4
→ pts = (total/100) × pts_per_r100_online × online_bonus × category_mult × tier_mult
  + first_purchase_bonus + crosssell_bonus + referral_bonus
→ Redemption: effectiveTotal = total - (pts × 0.10) if toggled
→ PayFast EF → redirect to PayFast → ITN confirms → OrderSuccess
→ loyalty_transactions + user_profiles.loyalty_points update

---

## LL-222 — user_profiles.role CHECK CONSTRAINT (11 April 2026)
The user_profiles table has a hard CHECK constraint on the role column.
VALID VALUES (exact, case-sensitive):
  customer · admin · retailer · staff · hr · management
ANY other value (including manager, owner, operator, chairman, director)
will cause the INSERT/UPDATE to fail with a constraint violation error.
Supabase/PostgREST returns this as a silent error when using .upsert()
without explicit error surfacing — the row simply does not get created.
ALWAYS validate against this list before inserting into user_profiles.role.
Common aliases to map:
  manager → management
  owner → management
  chairman → management
  director → management
  employee → staff
  worker → staff
ROOT CAUSE: invite-user EF silently failed to create user_profiles rows
for all invites during v230 session because the HQ prompt defaulted to
"manager" (invalid). Caught via DB inspection, not runtime error.

## LL-223 — Deno EF cannot call sibling EFs via internal fetch (11 April 2026)
Supabase Deno Edge Functions CANNOT call other EFs in the same project via
fetch(${SUPABASE_URL}/functions/v1/...). The call silently fails — no error,
no log, callSim() returns null, orders=0. Discovered: seed-tenant v2 → sim-pos-sales.
sim-pos-sales for seeded tenants must be triggered externally:
  - From Claude.ai via Supabase MCP (execute_sql + pg_net.http_post)
  - From the client browser via supabase.functions.invoke()
  - From the Supabase dashboard manually
The wizard does NOT call sim-pos-sales. The HQ dev simulator buttons (RUN 30 DAYS /
RUN 7 DAYS) in HQTenants.js ARE client-side and work correctly — they bypass this limit.
Demo path: after wizard launches, HQ operator uses the RUN 30 DAYS button to populate
orders for any seed tenant in one click.

---

*NUAI-AGENT-BIBLE.md v1.0 · 08 Apr 2026*
*Maintained by: Claude Code after each major session*
*Owner reviews: after each WP completion*
*Replace this file: never — append and version it*
