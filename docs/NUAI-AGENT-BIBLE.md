## ⚠️ READ THIS FIRST — BEFORE ANY RULE

Before reading the LL rules below, read
**docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md**.
The rules in this file exist because of the system described there.
Understanding the system makes the rules make sense. Strategic
intelligence is Step 0 of every session per CLAUDE.md (at repo root) — read
it in full including any date-stamped addendums appended to the v1.0
body before acting on a single LL rule.

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

**WHY THIS IS HARD TO ENFORCE:** The GitHub MCP connector exposes
create_or_update_file, push_files, and push_files tools in every
Claude.ai session. Anthropic does not currently support disabling
individual tools — it is all-or-nothing. The write tools will ALWAYS
appear available. They are NOT permitted.

The GitHub token scope is the real gate. If the token is read-only
(contents:read), write calls will fail. But do not rely on this —
follow the rule regardless.

**WRITE TOOLS THAT ARE VISIBLE BUT FORBIDDEN IN CLAUDE.AI:**
- GitHub:create_or_update_file  ← FORBIDDEN
- GitHub:push_files             ← FORBIDDEN
- Supabase:deploy_edge_function ← FORBIDDEN

**READ TOOLS THAT ARE PERMITTED:**
- GitHub:get_file_contents      ← PERMITTED (read only)
- GitHub:run_secret_scanning    ← PERMITTED (read only)
- All Supabase SELECT/read ops  ← PERMITTED

If you find yourself about to call a write tool from Claude.ai,
STOP. Write the exact Claude Code instruction instead and give it
to the human to run in their terminal.

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
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | cannabis_retail |
| Pure Premium THC Vapes | f8ff8d07-7688-44a7-8714-5941ab4ceaa5 | cannabis_retail |
| Test Dispensary CT | 064adbdc-faaf-4949-9c4b-b5a927b7f2d1 | cannabis_retail |
| TEST SHOP | 4a6c7d5c-a66a-4a13-b39a-fe836104000c | cannabis_retail |
| **Medi Can Dispensary** | **2bd41eb7-1a6e-416c-905b-1358f6499d8d** | **cannabis_dispensary — seed_complete=true, DO NOT RE-SEED** |
| Nourish Kitchen & Deli | 944547e3-ce9f-44e0-a284-43ebe1ed898f | food_beverage — 240 orders seeded |
| Vozel Vapes | 388fe654-... | general_retail |
| Maxi Retail SA | 9766a3af-... | general_retail — 232 orders |
Total: 9 tenants (1 operator + 8 clients)

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


**Edge Functions — 12 active as of 11 Apr 2026:**
| EF | Version | Purpose |
|---|---|---|
| ai-copilot | v59 | All Claude API calls. systemOverride param added. |
| loyalty-ai | v2 | Nightly AI engine. RPC bug fixed. try/catch per user. |
| process-document | v53 | Smart Capture AI extraction. SARS compliance + fingerprint. |
| auto-post-capture | v2 | Atomic accounting on Smart Capture approve. writes input_vat_amount. |
| receive-from-capture | v1 | Stock receipt + AVCO on delivery note capture. |
| sim-pos-sales | v4 | POS sales simulator. |
| sign-qr | v36 | QR HMAC signing. |
| verify-qr | v34 | QR validation. |
| send-notification | v37 | WhatsApp via Twilio. |
| get-fx-rate | v35 | Live FX rates. 60s cache. R18.50 fallback. |
| **seed-tenant** | **v4** | **Multi-profile seeder: general_retail + food_beverage + cannabis_dispensary** |
| trigger-sim-nourish | v1 | Throwaway one-shot — OWNER SHOULD DELETE |
NOTE: LL-223 — Deno EFs cannot call sibling EFs via internal fetch. sim-pos-sales must be triggered from client or MCP.

---

# SECTION 3 — SESSION START SEQUENCE (MANDATORY EVERY SESSION)

1. List `docs/` directory → identify highest SESSION-STATE version number
2. Read that SESSION-STATE file via `GitHub:get_file_contents`
3. For each build target mentioned: read the actual source file from GitHub — NEVER trust docs alone
4. Read VIOLATION_LOG — know what rules have been broken and why
5. THEN respond with verified, accurate plan

**Never suggest a feature as "pending build" without first reading the source file.**
**Never ask the owner to run PowerShell/bash commands Claude can run via GitHub MCP.**

**WP-UNIFY MANDATORY READ:** If ANY UI component will be touched this session,
read docs/WP-UNIFY_v1_0.md after step 3 above. This document contains:
  - The neuroscience research behind why visual consistency closes deals
  - The full blast zone audit (Tier 1/2/3 components by demo priority)
  - The 8 UNIFY rules that govern all new and migrated UI code
  - The exact migration pattern (step by step for Claude Code)
  - The NuAi design personality definition
Agents who skip this produce components that look like the old HQ tabs.
Agents who read this produce components that look like the Group Portal.

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

**inventory_items:** id, tenant_id, name, category (ENUM::inventory_category), loyalty_category (SEPARATE — TEXT), quantity_on_hand (NUMERIC), reserved_qty (NUMERIC), weighted_avg_cost (NUMERIC), sell_price (NUMERIC — used by dispensary revenue calc: dispensing_log × sell_price), cost_price (NUMERIC), is_active (BOOLEAN)
NOTE: NO 'notes' column on inventory_items (LL-181)

**patients** (cannabis_dispensary only):
id, tenant_id, name, id_number, date_of_birth (DATE), medical_aid, contact, notes, is_active (BOOLEAN),
section_21_number (SAHPRA S21 authorisation ref), s21_expiry_date (DATE), condition, authorized_practitioner, created_at

**prescriptions** (cannabis_dispensary only):
id, tenant_id, patient_id (FK→patients), doctor_name, doctor_hpcsa, substance, quantity_mg (NUMERIC),
repeats (INT), repeats_used (INT), issue_date (DATE), expiry_date (DATE), is_active (BOOLEAN), notes, created_at

**dispensing_log** (cannabis_dispensary only — SCHEDULE 6 CLINICAL RECORD):
id, tenant_id, patient_id (FK→patients), prescription_id (FK→prescriptions),
inventory_item_id (FK→inventory_items), batch_id (FK→batches, nullable),
quantity_dispensed (NUMERIC), dispensed_by (UUID→auth.users), dispensed_at (TIMESTAMPTZ), notes,
is_voided (BOOLEAN default false), void_reason (TEXT), void_at (TIMESTAMPTZ), void_by (UUID)
LL-226: NEVER hard-delete rows from this table — void only. It is a Schedule 6 legal document.

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
  NOTE (S320): `is_hq_user()` currently conflates Platform HQ and Tenant HQ. See PLATFORM-OVERVIEW_v1_0.md
  S320 addendum ("Two-HQ architecture clarification") and WP-HQ-GRANULARITY in PENDING-ACTIONS.md.
  When `hq_access=true` is ever granted to a non-operator user, audit all `hq_all_*` policies first.

- **LL-206 — useTenant HOOK — CORRECT PATTERN (CODEBASE-CONFIRMED 11 Apr 2026)**:
  Import:  import { useTenant } from '../../services/tenantService';
  NEVER:   import { useTenant } from '../../hooks/useTenant';  — wrong path, does not exist
  The context value exposes BOTH patterns — both are valid:
    const { tenant } = useTenant(); const tenantId = tenant?.id;   // verbose, also correct
    const { tenantId } = useTenant();                               // direct, also correct
    const { tenantId, industryProfile } = useTenant();             // preferred for profile-aware components
  tenantId: tenant?.id || null  — exposed directly in tenantService.js context value (line 154).
  industryProfile: tenant?.industry_profile || 'cannabis_retail'  — also directly exposed.
  CORRECTION: Previous rule said tenantId is not directly exposed. This was WRONG.
  tenantService.js v1.1 confirmed: tenantId, tenantName, tenantSlug, tenantType, industryProfile,
  isHQ, allTenants, switchTenant, loading, reload, tenantConfig, isOperator, role — all exposed.
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

## WP-DEMO-AUDIT + Financial RPC Architecture (14 Apr 2026 — Session v270)

- **LL-209 — PostgREST 1000-ROW DEFAULT CAP**:
  PostgREST silently caps all SELECT results at 1000 rows. Any component that
  fetches an unbounded large table and filters client-side by date will silently
  return wrong data at scale. Always pass date filters to the DB server-side.
  See docs/LL-POSTGREST-ROW-CAP_v1_0.md for full chronicle.

- **LL-210 — SINGLE-SOURCE FINANCIAL AGGREGATION**:
  Financial aggregations across orders / expenses / journals / vat MUST use
  tenant_financial_period (per tenant) or hq_financial_period (cross-tenant).
  Direct from('orders').select or from('expenses').select for financial period
  calculations in components is a violation. New components doing ad-hoc
  aggregation will produce numbers that disagree with the rest of the platform.
  Whitelist: components needing raw row-level access for editing (journal entry
  editor, expense form, order detail) are exempt.
  Reference RPCs:
    tenant_financial_period(p_tenant_id, p_since, p_until) -> jsonb
    hq_financial_period(p_since, p_until, p_industry_filter) -> jsonb
  Both enforce 9 contract invariants. See SESSION-STATE_v270.

- **LL-244 — TENANT ONBOARDING COMPLETENESS**:
  A tenant marked financial_setup_complete=true MUST have:
    - chart_of_accounts row count >= 40 (universal + industry-specific accounts)
    - equity_ledger row for current FY with share_capital recorded
    - tenant_config.financial_year_start in 'MM-DD' format (not month name)
    - VAT settings populated if vat_registered=true
  The Financial Setup Wizard does NOT seed the COA. 4 of 5 'completed' tenants
  had ZERO chart_of_accounts rows (discovered 14 Apr 2026). Until the wizard is
  fixed, every new tenant must have COA seeded manually via migration.

- **LL-245 — FEATURE SCOPING DEPENDENCY MAP**:
  Every new feature spec MUST list: tables read, tables written, validation gates,
  downstream consumers requiring re-verification. The Financial Setup Wizard is
  the cautionary tale: it captured inputs and set a 'complete' flag but did not
  seed chart_of_accounts. The wizard 'completed' for 4 tenants and broke them all
  invisibly. A dependency map at scoping time would have caught this.

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

## WP-UNIFY Rules (13 April 2026 — design system unification)

Read docs/WP-UNIFY_v1_0.md for the full research, blast zone audit, and context.
The rules below are the operational summary only.

- **UNIFY-1 — NO LOCAL T DEFINITION EVER**:
  Every new component imports T from tokens.js. A local const T = {...} or
  const C = {...} at module level is a violation. Catch before commit.
  Pattern: import { T } from "../../styles/tokens"; (adjust path for depth)

- **UNIFY-2 — MIGRATE ON TOUCH**:
  Every file opened for any reason gets its local token object migrated in
  the same commit. No session ends with a local T definition that was there
  before. This compounds across sessions until every file is clean.

- **UNIFY-3 — TWO WEIGHTS ONLY IN NEW/MIGRATED COMPONENTS**:
  400 = body text and table data.
  500 = primary labels, active nav, card titles.
  600 = section headers, KPI values, emphasis.
  700 = ONLY for labels at <=11px uppercase where weight compensates for size.
  Never 300. Never 800. Never 700 on anything above 11px.

- **UNIFY-4 — ONE BORDER STYLE**:
  All card and table borders: border: `1px solid ${T.border}`
  All input focus: borderColor: T.accent
  Never rgba(), never custom hex, never mixed border weights in same component.

- **UNIFY-5 — SEMANTIC COLOUR BY TOKEN ONLY**:
  Red=T.danger · Amber=T.warning · Green=T.success · Blue=T.info · Grey=T.neutral
  Never a custom hex for a semantic moment. Use getSeverityTokens() from tokens.js.

- **UNIFY-6 — INTER IN PORTALS, JOST ON CONSUMER PAGES ONLY**:
  /hq /tenant-portal /admin /hr /staff /group-portal -> fontFamily: T.font (Inter)
  /shop /loyalty /scan /account /welcome -> Jost permitted, kept intentionally.
  Jost in an authenticated portal reads as "marketing." Inter reads as "data."

- **UNIFY-7 — SHARED COMPONENTS FIRST**:
  Any UI pattern appearing in 2+ components belongs in src/components/shared/.
  Priority order to build: SharedDataTable · SharedStatCard · SharedBadge
  SharedSectionHeader · SharedTabBar · SharedModalShell · SharedEmptyState

- **UNIFY-8 — DEMO PATH TIER 1 MUST MATCH GROUP PORTAL BY 12 MAY 2026**:
  Tier 1 = HQOverview · HQStock · HQProfitLoss · HQBalanceSheet
           HQDocuments · ExpenseManager
  Test: does this component look like it was built in the same room
  as the Group Portal? If not, it fails the standard.

## NUAI DESIGN PERSONALITY (WP-UNIFY definition)

**Sophisticated density.** Information-forward. Every pixel earns its place.
Restrained typography (two weights, one font, one scale). Disciplined colour
(one accent, semantic tokens only). Light borders (T.border). Minimal shadows
(T.shadow.sm at most). The data is the hero. The container is invisible.
This is the Linear/Stripe register — not Notion, not legacy Salesforce.

## BLAST ZONE PRIORITIES (WP-UNIFY — full audit in WP-UNIFY_v1_0.md)

TIER 1 (demo critical — must match Group Portal by 12 May 2026):
  HQOverview.js · HQStock.js (7 sub-tabs) · HQProfitLoss.js
  HQBalanceSheet.js · HQDocuments.js · ExpenseManager.js

TIER 2 (migrate first 3 sessions post-demo):
  HQAnalytics.js · HQVat.js · HQLoyalty.js (10 tabs)
  SmartInventory.js · HQProduction.js · AdminQRCodes.js

TIER 3 (systematic — one per session alongside feature work):
  All 13 HR modules · HQCogs.js (read LL-233 first) · AdminDashboard.js

## MIGRATION COMMIT FORMAT

  refactor(UNIFY): migrate [ComponentName].js to tokens.js — [brief note]

---

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

## HEAD: see latest SESSION-STATE doc · Repo: github.com/GFive5y/protea-botanicals
## Last major session: 11 April 2026 (v235–v238)

## Work Packages COMPLETE as of 11 Apr 2026
- WP-MEDI-CAN Stage 1 + Stage 2: full clinical module (Patients/Rx/Dispensing/Reports/Compliance/CSR)
- WP-FINANCIAL-PROFILES: profile-adaptive P&L, ExpenseManager, HQForecast, HQCogs header
- WP-PROFILE-NAV: FOOD_BEVERAGE_WATERFALL, CANNABIS_DISPENSARY_WATERFALL, all F&B modules wired
- HQMedical Voiding UI: LL-226 compliant void-only workflow with SAHPRA audit trail
- HQMedical CSR: Controlled Substance Register 6th sub-tab with perpetual balance + running ledger

## TENANT PORTAL — 4-branch waterfall routing (TenantPortal.js getWaterfall())
cannabis_dispensary → CANNABIS_DISPENSARY_WATERFALL (Clinical-first nav)
food_beverage       → FOOD_BEVERAGE_WATERFALL (Kitchen-first · 7 sections · all F&B modules wired)
cannabis_retail     → CANNABIS_RETAIL_WATERFALL (unchanged)
all others          → WATERFALL (manufacturing nav — default)

## HQ SIDEBAR LABELS (renamed 11 Apr 2026)
Finance → Financials · Intelligence → Analytics · Procurement → Purchasing
(Paths unchanged: /hq?tab=finance → /hq?tab=procurement. Label only.)

## Next Dev Priorities (11 Apr 2026)
1. WP-WIZARD-V2 — TenantSetupWizard.js must branch by cannabis_dispensary (52KB — read first)
2. HQOverview / HQTradingDashboard — dispensary profile shows empty (reads orders table only)
3. SAHPRA export — Reports tab in HQMedical has no export button despite compliance note promising one
4. ProteaAI dispensary query suggestions — getSuggested() medical tab needs updated queries
5. Owner: delete trigger-sim-nourish EF · SMTP → Resend · CIPRO + nuai.co.za domain

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
4. WP-UNIFY_v1_0.md (MANDATORY if any UI component will be touched)
5. Source file for build target (verify state from disk before planning)

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

## LL rules added 11 April 2026 (WP-MEDI-CAN + WP-FINANCIAL-PROFILES + WP-PROFILE-NAV)

- **LL-224 — CLOSED**: All 4 industry profiles now have profile-adaptive P&L in HQProfitLoss.js.
  pctColour(pct, industryProfile) takes two args. PROFILE_LABELS constant → PL object controls all labels.

- **LL-225**: cannabis_dispensary nav waterfall NEVER includes Wholesale, Distribution, or Retailers tabs.

- **LL-226 — DISPENSING_LOG IS SCHEDULE 6**: NEVER hard-delete rows from dispensing_log.
  Void only: UPDATE is_voided=true, void_reason, void_at, void_by. The record is a legal clinical document.
  No DELETE button should ever exist in the dispensing UI.

- **LL-227**: Medi Can tenant_id 2bd41eb7-1a6e-416c-905b-1358f6499d8d has seed_complete=true.
  DO NOT RE-SEED. Doing so will create duplicate patients, products, and dispensing events.

- **LL-228**: HQMedical.js is gated: tenantConfig?.feature_medical !== false AND
  industryProfile === 'cannabis_dispensary'. Both conditions required.

- **LL-229**: seed-tenant v4 uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS on all inserts.
  Regular anon key would block cross-table inserts in the dispensary branch.

- **LL-230**: dispensing_log.batch_id links to batches.id (nullable). Batch is optional at dispensing time.

- **LL-231 — CLOSED**: cannabis_dispensary P&L revenue = dispensing_log × inventory_items.sell_price.
  NOT from orders table. Implemented in HQProfitLoss.js fetchDispensingRevenue callback.
  HQForecast.js also uses dispensing_log velocity for dispensary profile.

- **LL-232 — CLOSED**: food_beverage gross margin benchmarks: Green ≥65% / Amber 55-65% / Red <55%.
  Food Cost % (target <30%) is the primary F&B KPI card in HQProfitLoss.js.

- **LL-233**: HQCogs.js is 145KB / 3,912 lines. READ IN FULL before any edit. LL-221 critical here.

- **LL-234**: SUBCATEGORY_TO_ACCOUNT in HQProfitLoss.js is ADDITIVE ONLY.
  Never remove existing entries. Append new profile-specific entries after the existing list.

- **LL-235**: HQForecast.js dispensary velocity = dispensing_log × sell_price (not orders table).
  For all other profiles, orders table is correct.

- **LL-236**: clinicalAlerts (S21 expiry pipeline + Rx repeat warnings) are dispensary-only
  forecast signals. Never render for other profiles.

- **LL-237 — LL-061 RELAXED (11 Apr 2026, owner authorisation)**:
  Original LL-061: ProteaAI.js LOCKED — CODEBASE_FACTS str_replace ONLY.
  RELAXED TO: getSuggested() return arrays MAY be updated to improve tab-specific suggestions.
  STILL LOCKED: All hooks, streaming logic, query execution, panel UI, handleSend, handleQuery.
  Pattern: str_replace on specific return array contents within getSuggested() only.
  Reason: Medical/clinical tab was returning generic prescription queries instead of
  dispensary-specific queries (patients, S21, dispensing_log, CSR, voided events).

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

## LL-242 — HQTransfer.js AVCO BUG · KNOWN ISSUE (11 April 2026)
HQTransfer.js handleReceive() updates the destination inventory_items row
with quantity_on_hand only. It does NOT recalculate weighted_avg_cost when
the destination already holds stock of the same item. This silently
corrupts destination AVCO every time a transfer lands at a store that
already carries the SKU.

EXAMPLE OF THE BUG:
  Destination holds 10 units at R100 AVCO.
  Transfer arrives: 5 units at R150 unit_cost_zar.
  Correct AVCO post-receive: ((10 × 100) + (5 × 150)) / 15 = R116.67
  HQTransfer result:          R100 (unchanged — WRONG)

CORRECT FORMULA (use on receive when destination item already exists):
  newQty  = dest_qty + confirmed_qty
  newAvco = ((dest_qty × dest_avco) + (confirmed_qty × unit_cost_zar))
            / newQty
  Then UPDATE both quantity_on_hand AND weighted_avg_cost.

FIXED IN: src/components/group/GroupTransfer.js (WP-TG Phase 4, this commit).
STILL BROKEN IN: src/components/hq/HQTransfer.js handleReceive()
  (around line 449-456 — UPDATE statement only sets quantity_on_hand).

RULE: Do NOT propagate the HQTransfer.js receive pattern to any new
transfer component. The HQTransfer fix is deferred to a dedicated session.

Also note: both HQTransfer.js and GroupTransfer.js use a per-line loop
on ship/receive with no database transaction wrapper. Partial failures
can leave transfers in an inconsistent state. Atomicity is a known gap,
not fixed in Phase 4. Documented here for the future fix session.

Source: Claude Code pre-build audit of HQTransfer.js (1,692 lines),
11 April 2026. Confirmed by owner before Phase 4 build.

**FIXED: HQTransfer.js handleReceive — `fix(LL-242)` commit `713ef3a`, 11 April 2026.**
Three coordinated edits to handleReceive: the SKU SELECT and the
name-fallback SELECT now both fetch `weighted_avg_cost`; a new
`shopCurrentAvco` local captures it in both match branches; the UPDATE
now writes both `quantity_on_hand` and `weighted_avg_cost` using the
LL-242 formula above. The new-item INSERT
branch and the transfer_in stock_movement INSERT were already correct
and were not touched.

Going-forward fix only — historical AVCO data corrupted by prior HQ
receives is NOT retroactively corrected. Historical remediation (walk
`stock_movements` where type = `transfer_in`, recompute weighted_avg_cost
per affected destination row, write back) is a separate future task and
is not in scope for this fix.

Atomicity gap (per-line loop on ship/receive/cancel with no transaction
wrapper) remains open in both HQTransfer and GroupTransfer. Not addressed
by this fix. Still a named future build item.

## LL-243 — GroupSettings.js INVITE GAP · KNOWN SHORTFALL (11 April 2026)
GroupSettings Phase 5 (WP-TG/P5) supports adding existing tenants to a
group by pasting their tenant_id (UUID) only. The Add-a-Store section
is OWNER-ONLY — franchisee members never see the form at all.

GroupSettings does NOT support:
  - Inviting a new store by email
  - Creating a new tenant from within GroupSettings
  - Searching tenants by name (RLS blocks tenant list for non-HQ users)

The invite-by-email flow requires a new Edge Function, or an extension
of the existing invite-user EF, to atomically create a new tenant AND
insert a tenant_group_members row. This is a named future build item
(Phase 5b) and is NOT a bug — it is a deliberately scoped shortfall.

The gap is documented in the GroupSettings UI itself, via a visible
note below the Add Store form:
  "Want to invite a new store by email? This feature is coming in a
   future release. For now, new stores must be registered on NuAi
   first."

Permission model locked by Phase 5:
  - Any group member can VIEW settings (name, type, royalty, member list)
  - Only roles "franchisor" / "owner" can EDIT (name, type, royalty)
  - Only owners can REMOVE other members
  - Cannot remove the last member of a group (hard guard)
  - Owners cannot self-remove via "Leave network" — transfer ownership
    first, or contact NuAi support
  - The Add-a-Store section does not render at all for non-owners

Database: royalty_percentage column added to tenant_groups in Phase 5
as numeric(5,2) DEFAULT 0 with CHECK (0..100). Stored only — no
calculation yet. Intended consumer is a future royalty-calculation WP.

Source: WP-TENANT-GROUPS Phase 5 build decision + owner addendum,
11 April 2026.

---

## LL-NEW-1 — opex INSERTs trigger VAT transactions (12 April 2026)

**Rule:** opex INSERTs with `input_vat_claimable=true` trigger auto-creation
of `vat_transactions` rows (source='calculated'). When back-filling historical
opex, always check which VAT periods were auto-created and add
`vat_period_filings` rows for them so only the INTENDED period shows as overdue.

**Why this matters:** During Medi Recreational enrichment (700ad77), Phase 4
back-filled 6 months of opex. A database trigger auto-created 40
`vat_transactions` rows and pushed 2025-P6 into unintentionally-overdue state.
The rescue narrative required exactly one overdue period (P3). Fix applied in
Phase 7b: insert `vat_period_filings` row for 2025-P6 with ref VR2025P6-MEDREC.

**How to apply:** Before back-filling opex for a tenant, enumerate the VAT
periods that the date range will touch. After the INSERT, query
`vat_transactions WHERE tenant_id = :t AND source = 'calculated'` grouped by
period. Decide which periods should remain overdue vs filed, and insert
`vat_period_filings` rows for the "should be filed" set.

---

## LL-NEW-2 — Wizard bank accounts are canonical (12 April 2026)

**Rule:** `bank_accounts` rows created by the Financial Statements Setup Wizard
may conflict with `bank_accounts` seeded directly to Supabase. Always check for
existing `bank_accounts` before seeding. If a wizard account exists, UPDATE it
in-place rather than inserting a second row. Move `bank_statement_lines` to the
wizard account UUID.

**Why this matters:** During Garden Bistro build (a9ab90d), we seeded a
`bank_accounts` row and the owner subsequently ran the Financial Statements
Wizard in the browser, creating a second row with `is_primary=true`. The result
was two primary rows and split statement lines. Fix (50bf2c9): moved 15
statement lines to the wizard row, backfilled wizard row with seed values,
deleted seed row. The wizard row is canonical because the Financial
Statements module reads it as the source of truth.

**How to apply:** Before INSERT into `bank_accounts`, run
`SELECT id, is_primary FROM bank_accounts WHERE tenant_id = :t`. If rows exist,
UPDATE the primary wizard row rather than inserting. If you must reconcile
post-hoc: UPDATE statement lines to point at the wizard UUID, then DELETE the
seed row.

---

## LL-NEW-3 — user_profiles FK to auth.users (12 April 2026)

**Rule:** `user_profiles.id` has a FK to `auth.users(id)`. Cannot INSERT new
`user_profiles` rows without a matching `auth.users` row. For loyalty cohort
seeding, UPDATE `last_purchase_at` on existing rows only — POPIA-clean because
it is a timestamp column with no PII.

**Why this matters:** During Medi Recreational Phase 3 (cohort churn seeding),
the original spec called for INSERTing 11 dormant members. The FK blocked the
INSERT because there were no matching `auth.users` rows. Direct INSERT into
`auth.users` is not permitted (Supabase auth manages that table). The decision
(700ad77) was to reverse to Option C: UPDATE `last_purchase_at` on 25 existing
rows to shift 15 → lapsed and 11 → dormant. POPIA-clean because only a
timestamp column was touched.

**How to apply:** Never plan a loyalty-cohort seed that requires new
`user_profiles` rows. Always shape the cohort by UPDATEing
`last_purchase_at`, `loyalty_tier`, or `points_balance` on existing rows.
If a tenant has no members, the cohort sections will render empty — that
is the correct behaviour for a greenfield tenant.

---

## LL-NEW-4 — leave_balances.available is GENERATED (12 April 2026)

**Rule:** `leave_balances.available` is a PostgreSQL GENERATED column computed
automatically as
`opening_balance + accrued + carried_over - used - pending - forfeited`.
Never include `available` in INSERT column lists.

**Why this matters:** During Garden Bistro Phase 4 staff seed (a9ab90d),
including `available` in the INSERT column list produced error 428C9
(`cannot insert a non-DEFAULT value into column "available"`). The fix was to
remove the column from the INSERT — the database computes it on every read.

**How to apply:** When INSERTing `leave_balances`, include only the 6 input
columns: `opening_balance`, `accrued`, `carried_over`, `used`, `pending`,
`forfeited` (plus `tenant_id`, `employee_id`, `leave_type`). The `available`
column will compute correctly on first SELECT.

---

## LL-NEW-5 — hq_all_ policies must use is_hq_user() (13 April 2026)

**Rule:** All `hq_all_*` RLS bypass policies MUST use `is_hq_user()` as their
USING clause. Never use the non-standard
`EXISTS (... WHERE t.industry_profile = 'operator')` pattern.

**Why this matters:** Three tables (`dispensing_log`, `patients`, `prescriptions`)
had `hq_all_` policies using `industry_profile = 'operator'` instead of
`is_hq_user()`. The admin user (admin@protea.dev) belongs to a `cannabis_retail`
tenant, not an `operator` tenant, so the bypass never fired. This caused silent
RLS blocking: the Supabase client returned `data: []` with `error: null`,
making the balance sheet LL-231 dispensary revenue branch compute R0 instead of
R299k. The fix was DROP + CREATE with `is_hq_user()` on all three tables.

`is_hq_user()` checks `user_profiles.hq_access = true` — this is the canonical
cross-tenant bypass. The `operator` pattern was a legacy mistake from before
`is_hq_user()` was standardised.

**How to apply:** When creating any `hq_all_*` policy, always use:
```sql
CREATE POLICY hq_all_{tablename} ON {tablename} FOR ALL USING (is_hq_user());
```
Never use `industry_profile` checks in HQ bypass policies. If you encounter
an existing `hq_all_` policy that does not use `is_hq_user()`, fix it
immediately — it is silently broken for all HQ users.

---

---

## LL-246 — NEVER USE git add -A (14 April 2026 — Security Incident)

**Rule:** Claude Code MUST NEVER use `git add -A` or `git add .`
on the NuAi repository. Always add specific files by name:
  git add src/components/hq/HQVat.js src/components/hq/HQForecast.js

**Why this exists:** In session 261 commit 1fd1a87, `git add -A`
staged .env which contained SUPABASE_SERVICE_ROLE_KEY. The file was
pushed to the public repo. The key had full RLS bypass on all 109
tables. It was exposed for ~14 hours. GitHub secret scanning detected
it. The key was rotated immediately and audit logs confirmed no breach,
but the incident was entirely avoidable.

**Required pre-commit checklist:**
1. `git status` — check every staged file, no .env files anywhere
2. `git diff --cached` — review every line being committed
3. Only then: `git commit -m "..."`

**If .env appears in `git status` as modified:**
  `git checkout -- .env` to discard changes before staging anything.

**Files that must NEVER be committed:**
  .env / .env.local / .env.*.local / .env.production
  Any file containing: SUPABASE_SERVICE_ROLE_KEY, API_KEY,
  SECRET_KEY, PRIVATE_KEY, JWT_SECRET

**Current .gitignore protects:** .env, .env.local, .env.*.local
  (as of commit 8c5a512 — verified)

---

## Session 261/262 Close — 14 April 2026

HEAD: 8c5a512

All 5 demo tenants have complete financial packages:
  Garden Bistro (food_beverage) — COMPLETE (Session 260)
  Medi Recreational (cannabis_retail) — COMPLETE (Session 261)
  MediCare Dispensary (cannabis_dispensary) — COMPLETE (Session 261)
  Metro Hardware (general_retail) — COMPLETE (Session 261)
  Nourish Kitchen & Deli (food_beverage) — COMPLETE (Session 261)

All BS equations balance. See SESSION-STATE_v281.md for exact figures.

Key code ships this session:
  IFRS dispensary revenue branch (LL-231) — 0f6cfa0
  VAT input VAT fix — 1fd1a87
  Forecast sign fix — 1fd1a87
  Cash Flow financing activities — 1fd1a87
  Pay Calculator hourly rate — 1fd1a87
  Security: .env untracked — 8c5a512

Security incident: VL-013. Service_role key leaked + rotated.
New rule: LL-246. See VIOLATION_LOG_v1_1.md.

---

---

## Session 261 — 15 April 2026

### LL-247 — depreciation_entries.period_month is TEXT, not integer

**Rule:** `depreciation_entries.period_month` stores month as TEXT ('3', '4', etc).
`period_year` is integer. Never compare `period_month = 4` — use `period_month = '4'`.

**Why this matters:** During Session 261 Nourish Kitchen April dep insert, a multi-statement
query with `WHERE period_month = 4` failed with:
"operator does not exist: text = integer". The INSERT had already succeeded; only
the verification SELECT failed. But the error pattern can silently return wrong results
in application code expecting integer comparison.

**Apply:** All queries on depreciation_entries.period_month must quote the value:
```sql
WHERE period_month = '4' AND period_year = 2026
```
When reading back for display, cast if needed: `period_month::integer` for ordering.

---

### LL-248 — equity_ledger.net_profit_for_year is manually maintained — verify both sources

**Rule:** `equity_ledger.net_profit_for_year` is a snapshot field, not a computed column.
It can drift from what the IFRS IS calculates from live journal/expense data.
Always query both before relying on either.

**Two sources:**
1. `equity_ledger.net_profit_for_year` → used by Balance Sheet module (shows ✓ / ✗ badge)
2. IFRS IS calculation → revenue - COGS - sum(expenses FY filter) - depreciation

**When they diverge:**
- Small delta (< R10,000): UPDATE equity_ledger to match IFRS IS figure. Reduces BS gap.
- Large delta (MediCare R76k, Metro R362k): root cause is architectural — different expense
  query paths include/exclude different rows. Investigate before changing. A wrong UPDATE
  trades a balanced BS module for a balanced IFRS statement. Not always an improvement.

**Safe fix pattern (small delta only):**
```sql
UPDATE equity_ledger
SET net_profit_for_year = [verified IFRS IS figure]
WHERE tenant_id = '[uuid]' AND financial_year = 'FY2026';
```

**Verification query before any fix:**
```sql
SELECT el.net_profit_for_year AS equity_ledger_value,
       SUM(jl.debit_amount) - SUM(jl.credit_amount) AS journal_net
FROM equity_ledger el
LEFT JOIN journal_entries je ON je.tenant_id = el.tenant_id AND je.financial_year = el.financial_year
LEFT JOIN journal_lines jl ON jl.journal_id = je.id
WHERE el.tenant_id = '[uuid]'
GROUP BY el.net_profit_for_year;
```

---

### LL-249 — bank_statement_lines.matched_type values and categorisation pattern

**Rule:** `matched_type` on `bank_statement_lines` uses these values:
- `'expense'` — debit lines matched to expense records
- `'order'` — credit lines matched to order/revenue records
- `'other'` — bulk sim-batch lines, opening balances, drawings
- `'unmatched'` — explicitly flagged as needing categorisation
- `NULL` — treated as unmatched by the UI; sim-batch lines often land here

**Categorisation pattern (Supabase MCP):**
```sql
UPDATE bank_statement_lines
SET matched_type = 'expense', matched_at = NOW()
WHERE id IN ('[uuid1]', '[uuid2]');
```

**Pre-demo verification query:**
```sql
SELECT t.name, COUNT(*) AS unmatched
FROM bank_statement_lines bsl
JOIN tenants t ON t.id = bsl.tenant_id
WHERE (bsl.matched_type IS NULL OR bsl.matched_type = 'unmatched')
  AND bsl.tenant_id IN ('[demo_tenant_ids]')
GROUP BY t.name;
```
Must return 0 rows before demo.

---

### LL-250 — VAT number uniqueness is demo-critical

**Rule:** Every tenant's `tenant_config.vat_number` must be unique across all tenants.
A CA reviewer will spot duplicate VAT numbers immediately and correctly flag it as
a data integrity failure.

**Verification query — run at every session start and in pre-demo ritual:**
```sql
SELECT vat_number, COUNT(*), STRING_AGG(name, ', ')
FROM tenant_config tc
JOIN tenants t ON t.id = tc.tenant_id
WHERE tc.vat_registered = true
GROUP BY vat_number
HAVING COUNT(*) > 1;
```
Must return 0 rows. If rows returned: UPDATE the newer tenant's vat_number immediately.

**Discovery:** Session 261 found Medi Recreational and Metro Hardware (Pty) Ltd
both carrying 4123456789. Metro Hardware corrected to 4987654321.

---

### LL-251 — Anomaly audit before demo: 8-point checklist

Before every CA demo (run via Supabase MCP, not manual UI inspection):

```sql
-- 1. Duplicate VAT numbers
SELECT vat_number, COUNT(*) FROM tenant_config tc
JOIN tenants t ON t.id = tc.tenant_id
WHERE vat_registered = true GROUP BY vat_number HAVING COUNT(*) > 1;

-- 2. Unmatched bank lines on demo tenants
SELECT t.name, COUNT(*) FROM bank_statement_lines bsl
JOIN tenants t ON t.id = bsl.tenant_id
WHERE (matched_type IS NULL OR matched_type = 'unmatched')
  AND t.is_active = true GROUP BY t.name;

-- 3. equity_ledger entries for all active tenants (confirm all present)
SELECT t.name, el.net_profit_for_year, el.share_capital
FROM equity_ledger el JOIN tenants t ON t.id = el.tenant_id
WHERE el.financial_year = 'FY2026' ORDER BY t.name;

-- 4. Reversed/stale auto-capture journals (AUTO-CAPTURE type, pre-2025)
SELECT reference, journal_date, status, financial_year FROM journal_entries
WHERE journal_type = 'AUTO-CAPTURE' AND journal_date < '2025-01-01'
  AND status = 'posted' AND tenant_id IN ([demo tenant ids]);

-- 5. Depreciation entries coverage (each active asset should have entries)
-- NOTE (S315): period_month is TEXT ("Apr"), not integer. Cannot do arithmetic.
SELECT fa.asset_code,
  COUNT(de.id) AS depreciation_entries,
  MAX(de.period_year) AS latest_year,
  CASE WHEN COUNT(de.id) = 0 THEN 'NO DEPRECIATION' ELSE 'OK' END AS status
FROM fixed_assets fa
LEFT JOIN depreciation_entries de ON de.asset_id = fa.id
WHERE fa.is_active = true
GROUP BY fa.asset_code
ORDER BY status DESC, fa.asset_code;

-- 6. All demo tenant bank accounts have opening balance set
-- NOTE (S315): column is opening_balance, not closing_balance (schema drift).
SELECT t.name, ba.bank_name, ba.account_name, ba.opening_balance
FROM bank_accounts ba
JOIN tenants t ON t.id = ba.tenant_id
WHERE t.is_active = true
ORDER BY t.name;

-- 7. No demo tenant has zero journal entries
SELECT t.name, COUNT(*) AS journal_count FROM journal_entries je
JOIN tenants t ON t.id = je.tenant_id
WHERE je.status = 'posted' GROUP BY t.name ORDER BY journal_count;

-- 8. VAT filings present for active periods
SELECT t.name, COUNT(*) AS filed_periods FROM vat_period_filings vpf
JOIN tenants t ON t.id = vpf.tenant_id WHERE t.is_active = true GROUP BY t.name;
```
All 8 queries should return clean results. Investigate any anomalies before demo day.

---

*NUAI-AGENT-BIBLE.md v1.0 · 08 Apr 2026*
*Maintained by: Claude Code after each major session*
*Owner reviews: after each WP completion*
*Replace this file: never — append and version it*


---

## Session 291 — 17 April 2026

### LL-285 — LL-205 BYPASS + UNSCOPED SELECT = CROSS-TENANT LEAK

**Rule:** Every table with an `hq_all_*` RLS bypass policy (LL-205)
must have every React-level SELECT on that table carry
`.eq("tenant_id", tenantId)`. LL-205 removes the tenant-isolation
safety net for HQ users. Component queries that were implicitly
tenant-scoped by standard RLS policy become wide-open for HQ users
the moment the bypass policy exists.

**Pairing rule:** When you add a new `hq_all_*` policy, grep the
entire src/ tree for all `.from("<tablename>")` invocations and
audit each one. Ship the policy AND the audit fixes in the same
session — do not leave the audit to drift.

**Pattern that caused the discovery (session 291):**

Session 291 found StockControl.js had 4 unscoped SELECTs in a single
`fetchAll()` Promise.all — on `inventory_items`, `stock_movements`,
`suppliers`, `purchase_orders`. All four tables had `hq_all_*`
policies. HQ operators viewing Garden Bistro saw cross-tenant data
on every one. Fixed in commits 38e96da + 10d9d39.

**Audit SQL to find all hq_all_ policies:**

```sql
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND policyname LIKE 'hq_all_%'
ORDER BY tablename;
```

For each row, grep the repo for `.from("<tablename>")` and verify
every SELECT carries `.eq("tenant_id", tenantId)`. Insert/Update
by `.eq("id", ...)` is safe — only SELECTs leak.

---

### LL-286 — BUG-REPORT COMPONENT ATTRIBUTION IS A CLAIM, NOT A FACT

**Rule:** When a session prompt or bug report cites a specific
component as the source of a visible bug, verify the screenshot was
actually taken of that component's render before forming a diagnosis.
Route URLs can host multiple components. Chrome headers from one
component can sit above content rendered by another. A screenshot
showing "Stock Control" at the top and "HQ Stock ITEMS (43)" below
is two different components, not one component with conflicting data.

**Discovery (session 291):**

NEXT-SESSION-PROMPT_v291 attributed the "43 vs 31 archived items
visible" bug to StockControl.js. After two fix commits that did not
resolve the user-visible symptom, browser verification at
`/tenant-portal?tab=stock` revealed HQStock.js was the component
rendering the buggy "ITEMS (43)" tab — StockControl only contributed
the chrome header.

**Apply:**

Before planning code changes based on a bug report, answer:
1. What URL was the screenshot taken of?
2. Which components render on that URL?
3. Which component is rendering the visible element that's wrong?
4. Does the component the report names match the answer to #3?

If you can't answer #3 confidently, ask the owner to identify the
component before writing code.

---

*Session 291 closed 17 April 2026 at commit 4956d26.*


---

## Session 291 remediation — 17 April 2026

### LL-287 — SESSION PROMPT PROVENANCE CHECK — RETIRED S303.5

**RETIRED:** Superseded by LL-292 (read live from repo). The project-
knowledge snapshot pattern that LL-287 guarded against has been replaced
with a live-read-on-demand architecture. AGENT-ORIENTATION.md in project
knowledge contains only pointers; all state is read from repo at HEAD.

**Original rule (preserved for history):**
At the start of every session, verify that the session prompt you were
handed matches docs/SESSION-START-PROMPT.md in the repo. If they disagree,
stop and flag it. Created after Session 291 operated on a stale versioned
prompt file (NEXT-SESSION-PROMPT_v291.md) that contradicted the authoritative
SESSION-START-PROMPT.md.

**Why retired:** With live-read architecture, there is no snapshot to drift.
The agent reads SESSION-START-PROMPT.md from the repo every session. No
provenance check needed because the source is always authoritative.

---

## Session 293 — 17 April 2026 — WP-TABLE-UNIFY Phase 1 close + Phase 2 scoping

### LL-288 — DENSITY-GAP TOKEN NAMING: "Plus" SUFFIX CONVENTION

**Rule:** When adding a token that sits between two existing named sizes,
use the `xxxPlus` suffix to indicate "slightly larger than the named size."
Mirrors the existing `xxs` convention ("slightly smaller than xs").

**Examples from Session 293 (commit 502cb07, PR 2b.1):**
- `T.text.smPlus = 13` — between `sm=12` and `base=14`
- `T.radius.smPlus = "6px"` — between `sm=4` and `md=8`
- `T.radius.mdPlus = "10px"` — between `md=8` and `lg=12`

**Apply:** Document each `*Plus` token in the block comment of its token
family in `src/styles/tokens.js`. Never rename an existing token to make
room for a `*Plus` — additions only. WP-UNIFY rule WTU-006 amendment (S292)
permits strict-superset additions when audit-justified.

**Why this matters:** PR 2d scanner identified 51 violations that could be
cleared by adding 3 density-gap tokens. Without a naming convention, future
agents would invent inconsistent names (smHalf, smMid, sm2) and the token
scale drifts. The `xxxPlus` convention is symmetric with the existing `xxs`
convention and keeps the scale readable.

---

### LL-289 — EQUIDISTANT ROUND-UP: PREFER ROUNDING DOWN

**Rule:** When migrating a raw numeric value to a T token and the value sits
halfway between two named sizes (equidistant from both), prefer the smaller
token. Rounding down preserves the original visual density. Rounding up
consistently loosens layouts and reads as drift.

**Examples:**
- `gap: 10` — equidistant between `T.gap.sm=8` and `T.gap.md=12`.
  Prefer `T.gap.sm` (round down).
- `borderRadius: 5` — equidistant between `T.radius.sm=4` and `T.radius.smPlus=6`.
  Prefer `T.radius.sm` (round down, crisper).

**Not an absolute rule:** If the surrounding context is airy / relaxed and
the original design clearly leaned loose, rounding up can be correct. The
default for unclear cases is DOWN.

**Why this rule exists:** PR 2b.4 initial pass (commit f3f9001) rounded 3×
`gap: 10` instances UP to `T.gap.md=12`. The correction commit (759c321)
pulled them DOWN to `T.gap.sm=8`. Direct A/B in dev confirmed the tighter
spacing matched the original intent; the looser version looked indulgent.

**Apply:** When a codemod generates equidistant-round candidates, default
the round direction to DOWN. Flag any UP round for explicit justification
in the commit body.

---

### LL-290 — LOOP SCOPE VERIFIED AGAINST DB SCHEMA, NOT UI TAB COUNT

**Rule:** When writing a PENDING-ACTIONS loop that references "N × M = K
iterations of a workflow," verify the scope against the actual DB schema
(primary keys, unique constraints) before committing the estimate. UI tab
counts lie: multiple tabs often share a single underlying workflow row.

**Discovery (Session 293):**

LOOP-011 was written as "5 tenants × 4 IFRS statements = 20 sign-offs"
based on the 4 visible statement tabs (Income Statement, Balance Sheet,
Cash Flow, Changes in Equity) in HQFinancialStatements.js. The table
`financial_statement_status` has a UNIQUE constraint on
`(tenant_id, financial_year)` — one status workflow row per tenant covers
all 4 statements. The 4 tabs share a single
`Draft -> Reviewed -> Auditor Signed Off -> Locked` workflow.

Real scope: **5 sign-offs total.** Owner action time: ~15 minutes. The
wrong estimate was ~60 minutes. A 4× overestimate on a demo-blocking loop.

**Apply:**

1. Before writing any loop estimate involving a multiplier, query schema:
   ```sql
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = '<table>'::regclass
     AND contype IN ('p', 'u');
   ```
2. Check if the UNIQUE columns tell you the workflow is per-group not per-tab.
3. Read the component's status-update handler to confirm which field(s) get
   written (e.g. a single `status` column vs. 4 per-statement columns).
4. Only then estimate scope.

**Signal patterns that should trigger schema verification:**
- "N × M = K iterations" where N or M comes from counting UI tabs
- Loop description references "for each tab" / "for each statement" / "for each view"
- Estimate feels high relative to the visible UI interaction (clicks to complete)

---

*LL-288 / LL-289 / LL-290 added 17 April 2026 · Session 293 close*

---

## Session 298 — 17 April 2026 — Safety debt Stages 1-3 pattern taxonomy

### LL-291 — TENANT-SOURCE SELECTION FOR INSERT PAYLOADS

**Rule:** When writing to a tenant-scoped table, identify the tenant source
from these three patterns before applying tenant_id:

**Pattern A — TRIGGER TENANT** ("whose surface triggered the event?")
Used when: consumer-facing flows where the action happens on a specific
tenant's surface (storefront, QR scan, survey).
Source: storefrontTenantId, scanned-QR tenant, etc.
Examples (S295): OrderSuccess, Account, SurveyWidget, ScanResult.

**Pattern B — VIEWER TENANT** ("whose logged-in session is this?")
Used when: admin/tenant-portal flows where the user acts within their
own tenant context.
Source: `const { tenantId } = useTenant();`
Examples (S296): StockControl stock movements, PO creation, supplier creation.

**Pattern C — RECORD TENANT** ("whose record is this even if the viewer
is elsewhere?")
Used when: HQ-level flows where an operator actions a record belonging
to a different tenant. The HQ operator is viewing; the record belongs
elsewhere.
Source: selectedRecord.tenant_id (never the viewer's tenantId)
Examples (S297): HQDocuments Smart Capture — AI-extracted suppliers and
stock_movements attribute to the document's owning tenant, not the HQ
operator.

**Why wrong pattern is worse than missing tenant_id:**
Wrong pattern = misattribution, silent corruption, or orphaned rows.
Wrong pattern is harder to detect than missing tenant_id because the row
looks valid — it just belongs to the wrong tenant.

**Default:** Pattern B (VIEWER) is correct for most tenant-portal work.
If the user is HQ or can cross tenant boundaries, pattern C (RECORD) is
usually right. Pattern A is for consumer flows.

**When unclear, STOP and flag. Do not guess.**

---

*LL-291 added 17 April 2026 · Session 298 (taxonomy from Stages 1-3)*

---

## Session 303.5 — 18 April 2026 — Architecture: live-read replaces snapshots

### LL-292 — ALL AGENT SURFACES FOLLOW LOOP DISCIPLINE

**Rule:** At every session start, read all orientation docs live from the
repo at HEAD via GitHub MCP. All agent surfaces — project knowledge,
project instructions, local agent config (.claude/) — hold only pointer
content that references repo truth, OR stable content that by design
never needs updating. They never hold stateful snapshots.

See `docs/LOOP-PRINCIPLES.md` for the philosophy behind this rule.

**Do not trust:**
- Cached or remembered versions of docs from prior sessions
- Content pasted into chat that claims to be current state
- Any doc's HEAD hash, session number, or priority list without
  verifying it against the live repo version

**Session start sequence:**
1. Read docs/SESSION-START-PROMPT.md from repo (current state + priorities)
2. Read docs/PLATFORM-OVERVIEW_v1_0.md from repo (system identity)
3. Read docs/NUAI-AGENT-BIBLE.md from repo (rules)
4. Read docs/PENDING-ACTIONS.md from repo (open loops)
5. Read docs/DEBT_REGISTER_v1.md from repo (debt status)
6. Confirm HEAD, open loops, violations

**Why this rule exists:**
LL-287 (now retired) required a provenance check comparing a project-
knowledge snapshot against the repo file. The snapshot drifted regularly
because Step 7 (manual refresh) was often skipped. The fix is to eliminate
the snapshot entirely: project knowledge holds only stable pointers
(AGENT-ORIENTATION.md), and all state is read live.

**Retirement sweep — addendum (S320):** When an LL is retired or
superseded, references to it do NOT automatically disappear from the
rest of the Loop. Docs, handoff artifacts, project knowledge, and
agent memories can carry the retired text forward as living instructions
unless actively purged. Every retirement therefore requires a sweep:

1. `grep -rn "LL-NNN" docs/` — find every reference to the retired LL
2. Check each hit: is it the retirement record itself, or a stale
   action-instruction that still tells agents what to do?
3. Remove or rewrite the action-instructions. Leave the retirement
   records and history notes intact.
4. If the retired LL described a process (e.g., "paste SESSION-START-PROMPT
   into project knowledge"), also sweep for references to the PROCESS,
   not just the LL number.

Discovery (S320): Owner caught an LL-287-era reminder ("Paste updated
SESSION-START-PROMPT.md into Claude.ai project knowledge") surviving in
a handoff artifact nine sessions after LL-287's retirement. The Bible
had been updated correctly; the sweep for residual instructions had
not happened.

This addendum generalises the sweep requirement. Every retirement is
two actions: (a) retire the rule, (b) sweep for its residual instructions.
One without the other leaves drift. The sweep belongs in the same
session as the retirement, not "later."

**Supersedes:** LL-287 (retired S303.5)

---

*LL-292 added 18 April 2026 · Session 303.5*

---

## Session 311 — 18 April 2026 — Shared-reference-data pattern documentation

### LL-293 — SHARED-REFERENCE-DATA PATTERN: NULL tenant_id IS INTENTIONAL

**Rule:** NULL tenant_id is NOT a bug on tables whose RLS policy uses
`(tenant_id IS NULL) OR (tenant_id = user_tenant_id())`. This is an
intentional design: NULL rows are globally-visible platform defaults,
non-NULL rows are per-tenant overrides.

**Tables using this pattern (as of S311):**
- `public_holidays` — SA public holidays shared across all tenants;
  tenants can add their own (non-NULL tenant_id) for custom holidays
- `product_formats` — default hardware formats shared across cannabis
  tenants; tenants can override with tenant-specific formats
- `product_strains` — default strain catalogue; tenants can override

**Do NOT:**
- Drop the tenant_id column on these tables
- Force NOT NULL constraints
- Backfill NULL rows to arbitrary tenants — that converts defaults
  into overrides, making them invisible to other tenants
- Flag these tables in audit scripts as tenant-isolation bugs

**Detection:** Check `pg_policies` for `tenant_id IS NULL OR tenant_id =`
patterns on any table flagged by audit scripts. If present, that table
is design, not a bug.

**To add a new shared-reference table:** Create with nullable tenant_id,
seed default rows with NULL tenant_id, add RLS policy matching the
`(tenant_id IS NULL) OR (tenant_id = user_tenant_id())` pattern.
Document in this LL.

**Scope boundary:** This pattern is for PLATFORM-WIDE reference data only
(SA public holidays, cannabis strain taxonomy, product format taxonomy).
It does NOT apply to business entities like suppliers, customers, or
inventory items. Business entities contain private commercial relationships
and must be strictly per-tenant. See LL-294 for supplier architecture.

---

*LL-293 added 18 April 2026 · Session 311*
*Scope boundary added S313*

---

## Session 313 — 18 April 2026 — SAFETY-080 supplier architecture decision

### LL-294 — SUPPLIERS ARE PER-TENANT, NO SHARING

**Rule:** Suppliers are strictly per-tenant. No cross-tenant visibility.
If two tenants buy from the same real-world company, each tenant has
its own independent supplier record. RLS must strictly scope suppliers
by `tenant_id = user_tenant_id()` with NO `IS NULL` fallback.

**Rationale:** Supplier data contains private commercial relationships —
pricing agreements, contact details, payment terms, credit limits, VAT
numbers. Sharing supplier records across tenants would leak business
intelligence even when the real-world supplier is the same entity.

**Onboarding pattern:** When onboarding a new tenant that will use
common suppliers (e.g., a new dispensary ordering from Eybna), create
a tenant-owned copy of the supplier during onboarding. Do NOT share
or reference another tenant's supplier record.

**Alternatives rejected (S312.5 / S313 decision):**
- Shared-reference pattern (LL-293 style): rejected — leaks commercial info
- Junction table (tenant_suppliers linking to master catalog): rejected —
  too complex for current need, supplier_products complicates further
- Master catalog with push-down: rejected — premature optimization,
  can add later if onboarding pain materialises

**Key distinction from LL-293:** public_holidays are identical across
tenants (SA law). Suppliers are NOT — each tenant has its own pricing,
terms, and relationship with the real-world entity. Different data
model, different isolation rule.

---

*LL-294 added 18 April 2026 · Session 313*

---

## Session 314.2a — 18 April 2026 — RLS audit design classifications

### LL-295 — PUBLIC-READ QR CODES ARE DESIGN, NOT BUG

**Rule:** `qr_codes.public_read_qr` with `using_clause='true'` on SELECT
is intentional design. Public QR scanning is a NuAi feature — a customer
with a phone camera can scan a product QR without being logged in. The
scan returns valid product information via the verify-qr Edge Function.

**Distinction from LL-293:** This is NOT the shared-defaults-with-overrides
pattern. QR codes are tenant-owned data (tenant_id NOT NULL). The public
SELECT policy provides unauthenticated read access for a specific product
feature. Writes to qr_codes MUST remain tenant-scoped.

**Detection:** If audit flags `qr_codes.public_read_qr` as Bucket A
(`using_clause='true'`), check this LL before treating as bug.

**Do NOT:** Drop `public_read_qr`. Replace with tenant-scoped SELECT.
Add authentication requirement to QR scanning flow.

**Do:** Ensure write policies (INSERT/UPDATE/DELETE) remain tenant-scoped.
The `admin_write_qr` policy with `using_clause='true'` on ALL WAS a bug
(fixed S314.2a). Only the SELECT read should be public.

---

*LL-295 added 18 April 2026 · Session 314.2a*

---

## Session 316 — 18 April 2026 — Financial fix: cross-year contamination

### LL-296 — CROSS-YEAR CONTAMINATION IN UPDATE STATEMENTS

**Rule:** When updating tables with `financial_year` scoping (equity_ledger,
journal_entries, financial_statement_status), always include
`.eq("financial_year", fyLabel)` alongside `.eq("tenant_id", tenantId)`.

A missing FY filter applies the update to ALL of the tenant's historical
years, corrupting closure metadata on past periods. The bug is subtle
because single-year test data masks it — the wrong behaviour only
manifests when a tenant has equity_ledger rows across multiple FYs.

**Detection via grep:**
```
grep -rn 'equity_ledger\|financial_statement_status' src/ |
  grep -A 2 'update(' | grep tenant_id
```
Every match should also have `.eq("financial_year")` within a few lines.

**Discovery:** FIN-001 (S294 audit). The journal_entries update in
HQYearEnd.js correctly scoped by tenant_id + financial_year; the
equity_ledger update on the next line did not. Fixed S316.

---

*LL-296 added 18 April 2026 · Session 316*

---

## Session 317 — 18 April 2026 — Financial debt cluster

### LL-297 — FY LABEL ALGORITHM: COMPUTE FROM financial_year_start

**Rule:** FY labels must be computed from the tenant's `financial_year_start`
+ current date, never hardcoded. Canonical algorithm:
```js
const mo = parseInt((fyStart || "03-01").split("-")[0], 10);
const yr = (new Date().getMonth() + 1) >= mo
  ? new Date().getFullYear()
  : new Date().getFullYear() - 1;
const fyLabel = `FY${yr}`;
```

Any time code needs to write, read, or filter `equity_ledger` by
`financial_year`, compute the label this way. Garden Bistro (Mar-Feb FY)
is the canary — if your code works for it, it works for all of them.

When writing the P&L period for a recalc, `p_since = ${yr}-${fyStart}`
(FY start date), not the calendar-year Jan 1.

---

### LL-298 — TENANT-RATE-AWARE VAT DIVISOR

**Rule:** SA VAT is 15% but the platform is multi-tenant and multi-rate-
capable. `tenant_config.vat_rate` stores the rate as a decimal (0.15 = 15%).
The divisor to convert VAT-inclusive totals to ex-VAT is `1 + vat_rate`,
NOT a hardcoded constant.

Consumer pattern (HQProfitLoss via useTenant().tenantConfig):
```js
const vatRate = parseFloat(tenantConfig?.vat_rate ?? 0.15);
const VAT_RATE = 1 + (Number.isFinite(vatRate) ? vatRate : 0.15);
```

Group helpers read per-tenant via `.from("tenant_config").select("vat_rate")
.eq("tenant_id", tid).maybeSingle()`. Fallback: 0.15.

Dispensing revenue is NOT VAT-inclusive (Schedule 6, LL-231) — the divisor
does NOT apply to the dispensary branch.

---

### LL-299 — PLANNER/EXECUTOR SEPARATION

**Rule:** Planner/executor separation surfaces what integrated sessions miss.

When one agent plans (read-only, produces spec) and another executes (reads spec,
writes code), the planner must produce an artifact before anything ships. That
artifact invites scrutiny in a way in-flight reasoning does not.

Evidence:
- S316 used integrated flow. FIN-001 shipped cleanly. One-liner, low-scope.
- S317 used planner/executor split. FIN-002 ships AND HQTenants calendar-year
  P&L-period bug (not in register, surfaced only during disk grounding in the
  spec) fixed in same commit.
- S316.5b.1-3 used split across three sessions. WP triage accuracy was
  measurable (81%) precisely because the classification artifact existed to
  be measured against.

Cost: one extra turn of planning per finding.
Return: specs catch register scope gaps before they become silent code
landings. The gaps are real — campaign measured 11 of 12 audit estimates
were under-counts (LOOP-CALIBRATION.md).

Rule: prefer planner/executor split for any finding larger than a one-liner.
For one-liners with fully-verified register scope, integrated is fine.

See also: LOOP-CALIBRATION.md "Planner / executor split cost and benefit".

---

*LL-297 + LL-298 + LL-299 added 18 April 2026 · Sessions 317-318*

---

## Session 320 — 18 April 2026 — RLS incident + two-HQ architecture

### LL-300 — RLS POLICIES ON user_profiles MUST NOT INLINE-QUERY user_profiles

**Rule:** Any RLS policy on `user_profiles` MUST use the `SECURITY DEFINER`
helper functions (`user_tenant_id()`, `is_hq_user()`, `auth_is_admin()`)
instead of inline subqueries against `user_profiles` itself.

**Why this matters:** When a policy on `user_profiles` contains an inline
subquery like `tenant_id = (SELECT up.tenant_id FROM user_profiles up
WHERE up.id = auth.uid())`, RLS evaluates the subquery by reapplying the
same policies — triggering infinite recursion (PostgreSQL error 42P17).
Every query against user_profiles returns 500. Platform-wide login breaks.

**Discovery (S320):** `tenant_admins_own_users` policy on user_profiles
used this inline pattern. Platform-wide 42P17 during PR 2A.1 gate
verification. admin@protea.dev and fivazg@gmail.com both unable to log in.
tenantService profile fetch, loyalty_config fetch, all user_profiles reads
returning 500 simultaneously.

**The fix pattern (canonical):**
```sql
-- WRONG — recurses
USING (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()))

-- RIGHT — user_tenant_id() is SECURITY DEFINER, bypasses RLS
USING (tenant_id = user_tenant_id())
```

**Related:** Same mechanism as LL-262 (tenant_groups recursion, S282).
LL-254 is the general principle. LL-300 names the user_profiles-specific
case because user_profiles sits at the root of almost every other policy
path on the platform — when it breaks, everything breaks.

**Applied S320:** Migration `s320_fix_user_profiles_recursion_ll262` replaced
the broken policy body with `user_tenant_id()` helper. Login restored
immediately. Audit 1 (self-referencing policies) post-fix: 0 remaining.

---

### LL-301 — STRUCTURAL RLS AUDITS DO NOT CATCH OPERATIONAL FRAGILITY

**Rule:** An RLS campaign that audits policy *shape* (does it have a
tenant_id filter? does it have with_check?) does not detect policies that
are structurally valid but operationally brittle.

**The gap:** The S294–S314 campaign declared Tier 2C "complete" after
fixing 146 policies across 11 sessions. The audit methodology looked for:
- `using_clause = 'true'` on tenant-scoped tables (Bucket A)
- Missing `with_check` on UPDATE/INSERT policies (Bucket C)
- Non-tenant-aware functions like `auth_is_admin()` (Bucket B)

It did NOT look for:
- Inline subqueries against the policy's own table (self-referencing)
- Inline subqueries against user_profiles when SECURITY DEFINER helpers exist
- Policies that work under normal evaluation order but fail when another
  policy on the same table changes

**Evidence (S320):** `tenant_admins_own_users` passed the S314 audit — it
had a valid tenant_id filter, included auth_is_admin() check, had a matching
with_check. It was structurally pristine. But it contained an inline
subquery against the same table it protected. When the S320 addition of
`hq_all_food_ingredients` altered the RLS evaluation environment (possibly
by changing which policy fires first or the query planner's inlining
decisions), the dormant recursion surfaced. Login broke platform-wide.

**Corrective principle:** Future RLS "complete" declarations require an
additional audit pass beyond shape-checking:

```sql
-- Audit 1: Self-referencing policies (recursion risk)
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND (qual ILIKE '%FROM ' || tablename || '%'
OR with_check ILIKE '%FROM ' || tablename || '%');

-- Audit 2: Inline user_profiles queries (recursion + fragility risk)
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename != 'user_profiles'
AND (qual ILIKE '%FROM user_profiles%' OR with_check ILIKE '%FROM user_profiles%');
```

Audit 1 must return 0 rows. Audit 2 will return many today (~100
policies) — each one is technical debt candidate for WP-RLS-HYGIENE
(PENDING-ACTIONS), not a blocker, but the count should trend down.

**Generalises:** Every "campaign complete" declaration from here forward
requires both shape verification AND operational verification. A shape
audit is necessary but not sufficient. Evidence-based completeness means
sampling representative policies against live behaviour (login still
works for all role combinations after changes), not just looking at the
SQL text.

---

### LL-302 — SESSION-START RLS AUDIT QUERIES

**Rule:** Every session that modifies RLS policies on any table should
run Audit 1 (self-referencing) and Audit 2 (inline user_profiles) before
declaring gate-passed. Audit 1 must be 0; Audit 2 is a watched count that
trends down over time.

**Canonical queries:** Copied from LL-301. Run via Supabase MCP.

**Thresholds:**
- Audit 1 MUST return 0 rows. Any result is an emergency — fix before
  closing session.
- Audit 2 is a watched metric. Post-S320 baseline: ~100 policies. Any
  session that adds new inline-user_profiles patterns increases the
  baseline — log to WP-RLS-HYGIENE. Sessions that replace them decrease
  it — log the reduction in session close.

**When to run:**
- Before any session that modifies RLS
- After any session that modifies RLS
- At any moment a platform-wide auth anomaly is suspected

**Reference:** LL-300 (the incident), LL-301 (the audit lesson),
WP-RLS-HYGIENE (the cleanup WP).

---

*LL-300 + LL-301 + LL-302 added 18 April 2026 · Session 320*

---

## Session post-2B.1 — 19 April 2026 — EF deploy guardrail

### LL-303 — CLAUDE.AI PLANNER NEVER DEPLOYS EDGE FUNCTIONS DIRECTLY

**Rule (three layers — all mandatory):**

**Layer 1 — Who deploys.**
Claude.ai planner NEVER deploys Edge Functions directly via the
Supabase MCP `deploy_edge_function` tool. Claude.ai's role for any
EF change is:
  1. Produce the complete source file as an artifact
  2. Apply any migrations the new EF version depends on via Supabase
     MCP (DDL deploys are still planner territory)
  3. Write a Claude Code instruction block that embeds the full file
     content inline, OR provides the content in a followup message
  4. Run post-deploy regression SQL against the specified test matrix

Claude Code owns the deploy:
  1. Copy the planner-provided source file into the correct repo path
     (`supabase/functions/<name>/index.ts`)
  2. Commit to git FIRST (before deploy — the on-disk file becomes the
     source of record, reviewable, and rollback-able via `git revert`)
  3. Run `npx supabase functions deploy <name> --no-verify-jwt
     --project-ref uvicrqapgzcdvozxrreo` from the local checkout
     (match `--verify-jwt` to the function's existing config)
  4. Report back to planner with the new Supabase version number

**Layer 2 — Verify before declaring success.**
After any EF deploy, planner MUST verify the deployed content is the
intended content. Two acceptable verification methods:
  (a) Call `Supabase:get_edge_function` and check for a known marker
      string newly introduced in this version
  (b) Compare the SHA returned from `get_edge_function` against the
      SHA of the on-disk source file
If the marker is missing or the SHA doesn't match, rollback
IMMEDIATELY via `npx supabase functions deploy` from the last known
good source. Surface the deploy failure as an incident — do NOT
try the deploy again.

**Layer 3 — Never escalate a failed EF deploy.**
If an EF deploy fails (wrong content, wrong version, runtime error,
marker missing), the response is STOP and ESCALATE, not RETRY.
Retrying without understanding the failure mode is how v62 became v63
in the 2B.1 incident. The correct sequence after any EF deploy failure:
  1. Rollback to last known good version immediately
  2. Verify rollback succeeded via Layer 2 method
  3. Report the incident to the owner
  4. Wait for owner direction before the next deploy attempt

**Origin:** Session post-2B.1, 19 April 2026. v62 and v63 deploys of
process-document EF via Supabase MCP `deploy_edge_function` tool both
shipped truncated placeholder content because planner's tool call
format forced the 56KB source file to be truncated. Cannabis tenants
(Pure PTV, Medi Recreational, MediCare Dispensary) could not ingest
documents. Rollback via `npx supabase functions deploy` from Claude
Code's on-disk v61 source restored production at Supabase version 64.

**Scope:** Any Edge Function source code deployment. This includes
"small" EFs as well as large ones like process-document or ai-copilot.

**NOT affected by LL-303:**
- Database migrations via Supabase MCP `apply_migration` (still planner)
- Raw SQL execution via Supabase MCP `execute_sql` (still planner)
- RLS policy changes, table schema changes (still planner)

**Related:** RULE-0Q (extends to EFs), LL-120 (call routing, separate
concern), LL-203 (instruction block format).

**Tools affected for Claude.ai:**
`Supabase:deploy_edge_function` is PROHIBITED for Claude.ai planner.

---

*LL-303 added 19 April 2026 · Session post-2B.1*

---

## Session 2B.2 — 19 April 2026 — Post-LL-303 validation patterns

### LL-304 — DIRECT-EF SMOKE TEST AS PLANNER-SIDE REGRESSION PROXY

**Rule:** When an Edge Function ships a new code path that the React
caller does NOT yet exercise (e.g., caller hardcodes a parameter that
would skip the new branch), the planner-side regression proxy is a
direct curl/fetch against the EF with the forcing parameters injected.

**Why this exists:** PR 2B.2 shipped v62 with a new F&B ingredient
extraction path gated on `industry_profile === "food_beverage"`. The
React caller in HQDocuments.js passes `industry_profile` from
`useTenant()`, which returns the authenticated user's profile — not
the selected "view as" tenant. HQ operators viewing Garden Bistro still
pass their own HQ industry_profile, so the F&B branch never fires from
the UI. Without a direct-EF test, v62's new code would have remained
dormant until the React layer gets a separate fix (Phase 2B.3+), at
which point any v62 bug becomes a regression in a later sub-phase.

**The pattern:**
1. Construct a synthetic but plausible payload that exercises the new
   branch (for v62: a PNG invoice with F&B ingredients)
2. Build a pure-language script (Node.js preferred — see LL-305 for why
   shell+Python is fragile) that reads the payload as binary, constructs
   the request body, POSTs directly to the EF's Supabase URL
3. Planner confirms the request shape is correct via a small
   "request_preview.json" dump before the POST fires
4. Planner runs SQL probes post-response to verify DB state
   (insertions, tenant binding, payload correctness)
5. Planner issues a cleanup SQL block to remove the test artefacts

**Applies when:**
- React caller's `useTenant()` / hook doesn't exercise the new EF path
- React caller always passes a fixed parameter that skips the new branch
- New EF behaviour requires multiple consumers (mobile, React, CLI)
  but only one is built yet

**Does NOT apply when:**
- React caller already exercises the new path end-to-end
- The regression can be verified via normal UI smoke tests

**Evidence:** Session 2B.2, 19 April 2026. 10 ingredient queue rows
produced, all correctly classified. Zero bugs surfaced. Verified
before `git push`.

---

### LL-305 — WINDOWS ENCODING TRAP: BINARY READS OVER TEXT/SHELL CHAINS

**Rule:** When transferring binary data between planner and executor
(base64 of a file, binary blob, anything that must survive byte-for-
byte), prefer a single-language script that reads the source file as
a binary buffer. Avoid shell + text intermediate files on Windows.

**The failure mode:** Downloading a text file (e.g., pre-encoded base64)
in a browser on Windows can silently recode the content. The file may
gain a UTF-16 BOM, have line endings normalised, or (observed in
practice) be truncated to roughly a quarter of its original size. The
corruption is silent — the file opens as text, contains base64-like
characters, and only fails downstream when the EF or API rejects it.

**Discovery (Session 2B.2):** First smoke test attempt used a
bash+Python harness. The base64 intermediate file (197KB expected)
arrived on the Windows laptop as a 38KB text file. The EF built a
request with the malformed base64 and forwarded to the Anthropic API,
which rejected with "invalid base64 data" (HTTP 500). Diagnosis took
10+ minutes because the symptom pointed at the Anthropic API, not
the intermediate file.

**The correct pattern:**
```javascript
// Pure Node.js — reads PNG as binary buffer, base64 in memory
const fs = require("fs");
const pngBuf = fs.readFileSync("invoice.png");
const b64 = pngBuf.toString("base64");

// Verify before firing: decode first 12 chars, check PNG magic bytes
const magicCheck = Buffer.from(b64.slice(0, 12), "base64").slice(0, 8);
const PNG_MAGIC = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
if (!magicCheck.equals(PNG_MAGIC)) { /* fail fast */ }
```

**Applies to:** Any planner-to-executor handoff involving binary
data larger than ~10KB.

---

*LL-304 + LL-305 added 19 April 2026 · Session 2B.2*

---

LL-306 (NEW S-2B.5): Regression harnesses writing to `food_ingredients` must
         vary the `name` field across test cases. The `food_ingredients_name_seeded_unique`
         constraint silently collides otherwise. Fixture builder must accept a
         `name` override. Evidence: PR 2B.4 Case 5 caught this by varying to
         "Bread Flour (Test)" vs Case 1's "Cake Flour (Test)". Generalise to:
         any regression harness inserting into a table with a UNIQUE constraint
         on a human-readable column must vary that column per case.

LL-307 (NEW S-2B.5): Any PR that touches the React → Edge Function invocation
         boundary MUST include a localhost end-to-end run against a real tenant
         BEFORE the PR is marked shipped. Direct-EF regression scripts (LL-304)
         validate the server behaviour but cannot exercise the React layer's
         parameter assembly — where this class of bug lives. Evidence:
         PR 2B.3 shipped without localhost smoke; `tenant_id` was missing
         from the EF body for the entire lifetime of 2B.3 until 2B.4 localhost
         verification surfaced it at the 500-error boundary. Hotfix 2B.3.1
         closed it in one session but the cost of the miss was real.
         Rule: localhost smoke is not optional for React → EF PRs.

*LL-306 + LL-307 added 19 April 2026 · Session 2B.5*
