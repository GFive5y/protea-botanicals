# WP-INDUSTRY-PROFILES v1.0
## Industry-Specific ERP — All 5 Profiles
## Status: PLANNING — 11 April 2026
## Author: Build session — Claude.ai

---

## OVERVIEW

NuAi currently supports 4 industry profiles with a shared codebase.
This WP formalises the full industry-specific treatment for each:

  1. cannabis_dispensary  — Medical Cannabis Dispensary (SAHPRA-regulated)
  2. cannabis_retail      — Recreational Cannabis & Vape Retail
  3. food_beverage        — Food & Beverage / Restaurant / Café
  4. general_retail       — General / Mixed Retail
  5. mixed_retail (NEW)   — Multi-category store (cannabis + food, etc.)

For each profile the WP defines:
  A. Industry analysis — what the business actually does
  B. Navigation structure — portal nav that fits their language
  C. Required modules — what exists vs what is missing
  D. Financial categories — chart of accounts, cost categories, revenue lines
  E. Seeding plan — what to create on wizard launch
  F. Demo tenant — name, slug, sample data spec

---

## PROFILE 1 — cannabis_dispensary (Medical Cannabis)

### A. Industry Analysis

South African medical cannabis dispensaries operate under SAHPRA Schedule 6
narcotics regulation. They are NOT retail stores — they are clinical dispensing
facilities. Every product movement is a controlled substance event.

Key actors:
  - Responsible Pharmacist (RP) — legally accountable for all dispensing
  - Prescribing Practitioner — HPCSA-registered doctor issuing scripts
  - Patient — Section 21 authorization holder
  - SAHPRA Inspector — can demand CSR records on-site at any time

Operational flow (correct industry terminology):
  Manufacturer → Purchase Order → GMP Receipt → Controlled Stock →
  Patient Consultation → Prescription Verification → Section 21 Check →
  Dispensing Event → CSR Entry → Patient Record Update → Invoice

Key compliance documents:
  - Controlled Substance Register (CSR) — perpetual daily balance
  - Section 21 Authorizations — patient-specific, expire and renew
  - Certificate of Analysis (CoA) — per batch, on file before dispensing
  - Dispensing Log — every event: patient, product, batch, qty, date, RP sig
  - SAHPRA Periodic Report — dispensing volume, patient count, batch trace

### B. Navigation Structure (Tenant Portal: cannabis_dispensary)

CLINICAL
  Patients                — registry, Section 21 status, conditions
  Practitioners           — HPCSA directory, prescribing history
  Prescriptions           — active scripts, verification workflow
  Dispensing Log          — Schedule 6 controlled substance record
  Patient History         — all-time dispensing per patient

COMPLIANCE
  Controlled Substance Register  — perpetual balance, RP sign-off
  Section 21 Management         — authorizations, expiry alerts, renewals
  SAHPRA Reports                — periodic regulatory submissions
  CoA Vault                     — batch certificates of analysis
  Audit Trail                   — immutable dispensing event log
  Diversion Monitoring          — anomaly detection: excess purchases

INVENTORY
  Product Formulary       — approved dispensable products
  Stock Control           — batch-level, linked to CSR
  Receiving (GMP)         — GMP-compliant receipt workflow
  Cold Chain              — temperature-sensitive product monitoring
  Batch Management        — CoA linkage, expiry, recall capability

FINANCIALS
  Revenue                 — dispensing fees, consultation fees
  Cost of Goods           — product acquisition cost (AVCO)
  Expenses                — rent, utilities, staff, insurance
  Invoices & Receipts     — patient invoices
  VAT                     — medical product VAT (may be exempt)
  Journals                — double-entry GL
  Reports                 — P&L, Balance Sheet, Cash Flow

OPERATIONS
  Daily Cash-Up           — till reconciliation (if cash accepted)
  Staff                   — pharmacist rosters, HPCSA record
  Documents               — licenses, SAHPRA correspondence
  Suppliers               — licensed manufacturers only (SAHPRA-registered)

### C. Module Gap Analysis (vs current platform)

MISSING — Critical:
  patients                — table: patients (id, name, id_number, dob,
                            condition, section_21_number, s21_expiry,
                            authorized_practitioner_id, tenant_id)
  dispensing_logs         — table: core CSR record per event
  practitioners           — table: HPCSA directory
  section_21_management   — module: expiry tracking, alerts, renewal workflow
  csr_register            — derived view: perpetual balance from dispensing_logs
  coa_vault               — module: CoA per batch, dispensing linkage
  diversion_monitoring    — module: pattern detection

MISSING — Important:
  sahpra_reports          — report: periodic submission format
  prescription_workflow   — process: verify script → check S21 → dispense
  patient_purchase_history — view: all dispensing events per patient

EXISTS — Partially applicable:
  HQMedical.js            — UNKNOWN CONTENT (must read before building)
  batch management        — CoA field exists, needs CSR linkage
  cold_chain              — temperature_logs table exists (F&B flavor)
  documents               — general document store, can hold licenses
  expenses, journals, VAT — full financial suite already live

EXISTS — Wrong naming for this industry:
  "Procurement" → should be "Receiving (GMP)" or "Supplier Orders"
  "Wholesale Orders" → N/A for dispensary (remove from this profile's nav)
  "Retailers" → N/A (no retail partners in dispensary)
  "Distribution" → N/A (products go to patients, not distributors)

### D. Financial Structure (cannabis_dispensary)

REVENUE ACCOUNTS
  40100  Dispensing Revenue          — product sold to patients
  40200  Consultation Fees           — clinical assessment fees
  40300  Script Processing Fees      — admin / handling

COST OF GOODS
  50100  Product Acquisition Cost    — price paid to licensed manufacturer
  50200  Cold Chain / Storage Cost   — temperature monitoring, freezer op
  50300  Wastage & Expiry Write-off  — Schedule 6 destruction events

OPERATING EXPENSES
  60100  Pharmacist Salaries         — RP + support staff
  60200  Premises & Rent             — dispensary facility
  60300  SAHPRA Licensing Fees       — annual regulatory costs
  60400  Professional Indemnity      — liability insurance
  60500  Cold Chain Equipment        — refrigeration maintenance
  60600  IT & Compliance Systems     — platform subscription

### E. Seeding Plan (seed-tenant v4 — cannabis_dispensary branch)

On wizard launch → seed-tenant fires with industry_profile='cannabis_dispensary':

Products (formulary, 8 items):
  MC-OIL-001  CBD Oil 30mg/ml 30ml         — finished_product  R1,200
  MC-OIL-002  CBD:THC 10:1 Oil 30ml        — finished_product  R1,500
  MC-OIL-003  Full Spectrum Oil 50ml       — finished_product  R2,200
  MC-CAP-001  CBD Capsules 25mg × 30       — finished_product  R950
  MC-CAP-002  THC Capsules 2.5mg × 30      — finished_product  R1,100
  MC-TIN-001  THC Tincture 10mg/ml 50ml    — finished_product  R1,800
  MC-CRM-001  CBD Topical Cream 500mg 50g  — finished_product  R680
  MC-INH-001  CBD Inhaler 200 doses        — finished_product  R2,400

Patients (sample, 5):
  Patricia Mokoena  — S21: SAHPRA/S21/2025/001  — Chronic pain
  James Olivier     — S21: SAHPRA/S21/2025/002  — Epilepsy
  Sarah Khumalo     — S21: SAHPRA/S21/2025/003  — Anxiety/PTSD
  David Nkosi       — S21: SAHPRA/S21/2025/004  — Multiple sclerosis
  Fatima Davids     — S21: SAHPRA/S21/2025/005  — Palliative care

Practitioners (2):
  Dr. M. van der Berg  — HPCSA: MP0123456  — General Practitioner
  Dr. A. Patel        — HPCSA: MP0234567  — Neurologist

Dispensing logs (30 days of history):
  ~60 events across 5 patients, linking to products + batches

Expenses (6):
  rent, pharmacist salary, SAHPRA fees, cold chain, insurance, IT

Journal: opening stock entry at acquisition cost

### F. Demo Tenant

  name: Medi Can Dispensary
  slug: medi-can
  industry_profile: cannabis_dispensary
  tier: pro
  Target revenue (30d sim): ~R180,000

---

## PROFILE 2 — cannabis_retail (Recreational Cannabis & Vape)

### A. Industry Analysis

Recreational cannabis retail in SA (post-decrim, private use):
  - Sells consumer cannabis products: flower, oils, vapes, edibles
  - Does NOT operate under medical prescription — consumer-direct
  - Age verification mandatory (18+)
  - QR authentication on products (brand protection + loyalty)
  - High SKU velocity, multi-strain, format variety
  - Primary compliance: SARS VAT, not SAHPRA patient tracking

Operational flow:
  Manufacturer/Supplier → PO → Stock Receive → AVCO → Pricing →
  Shop → Customer Purchase → QR Scan → Loyalty Points → Reorder

### B. Navigation Structure (Tenant Portal: cannabis_retail)

SHOP
  Products                — strain library, format catalogue
  Live Inventory          — qty on hand, low stock alerts
  Pricing                 — sell price, margin, promotions
  QR Codes                — authentication codes per batch

SUPPLY CHAIN
  Purchase Orders         — supplier POs, receiving workflow
  Suppliers               — licensed manufacturers and distributors
  Transfers               — inter-store stock movement

PRODUCTION
  Batches                 — production records, lab certs (THC/CBD)
  Production Runs         — manufacturing (if producing own products)
  Lab Results             — CoA, cannabinoid profiles

CUSTOMERS
  Loyalty Programme       — tiers, points, campaigns
  Customer Profiles       — purchase history, tier status
  Analytics               — top sellers, velocity, churn

FINANCIALS
  Revenue                 — sales by product/category/channel
  COGS                    — AVCO, production cost
  Expenses                — rent, staff, marketing
  VAT (15%)               — standard SA VAT
  P&L                     — monthly gross margin
  Balance Sheet

OPERATIONS
  Daily Trading           — sales dashboard, till summary
  Cash-Up                 — EOD reconciliation
  Staff                   — rosters, commissions

### C. Module Gap Analysis

EXISTS AND WELL-FITTED:
  HQProduction            — batch + production runs
  HQStock/SmartInventory  — full inventory intelligence
  HQLoyalty               — 10-tab loyalty engine
  QR Authentication       — HMAC-signed, GPS, velocity detection
  HQAnalytics             — sales analytics
  EODCashUp               — EOD reconciliation
  HQPricing               — sell price management

MISSING:
  Strain library UI       — dedicated strain management (strains table exists)
  Lab result upload       — CoA upload per batch with cannabinoid breakdown
  Age verification log    — log of age-gate events (compliance)
  Promotion engine        — discount codes, BOGO, bundle pricing

### D. Financial Structure (cannabis_retail)

REVENUE
  40100  Cannabis Products Revenue   — vape, oil, edibles, flower
  40200  Accessories Revenue         — hardware, accessories
  40300  Loyalty Redemptions         — negative revenue offset

COGS
  50100  Product Cost (AVCO)         — weighted average cost
  50200  Production Materials        — distillate, terpenes, hardware
  50300  Packaging & Labelling       — per-unit pack cost

EXPENSES
  60100  Rent & Premises
  60200  Staff Wages
  60300  Marketing & Social
  60400  QR / Platform Fees
  60500  Insurance

### E. Seeding Plan (existing — enhanced)

Current seed-tenant covers general_retail (vape).
cannabis_retail seed needs:
  - Cannabis-specific products (strains, formats)
  - Batch records with THC/CBD content
  - QR codes linked to batches
  - Customer loyalty transactions
  - Strain-specific sales history

### F. Demo Tenant

  name: Pure Premium THC Vapes     ← already exists
  slug: medi-recreational           ← already exists
  Status: live with real data

---

## PROFILE 3 — food_beverage (Restaurant / Café / Deli)

### A. Industry Analysis

Food & beverage operations in SA:
  - Governed by SA R638 (food safety regulations)
  - HACCP compliance (Hazard Analysis Critical Control Points)
  - Cold chain monitoring (DoH requirements)
  - DAFF-registered ingredients (imported food labelling)
  - Allergen declaration mandatory
  - Lot traceability (recall readiness)
  - Cost-per-dish calculation critical for profitability

Operational flow:
  Raw Material Procurement → Goods Receiving → Cold Storage →
  HACCP-compliant Preparation → Recipe Production → Service/Packaging →
  Customer → Invoice/Sale → Waste Log

### B. Navigation Structure (Tenant Portal: food_beverage)

KITCHEN
  Recipe Engine           — recipes, ingredients, yield, cost per portion
  Production Schedule     — what to make, how much, when
  Recipe Runs             — actual production vs planned
  Waste Log               — spoilage and over-production tracking

FOOD SAFETY
  HACCP Control Points    — CCP monitoring, corrective actions
  Temperature Log         — cold chain, hot holding records
  Allergen Matrix         — 14-allergen declaration per product
  Recall & Trace          — lot-to-customer traceability
  Food Safety Checklists  — daily cleaning, supplier delivery checks

INGREDIENTS
  Ingredient Library      — SA DAFF registered, allergen flags
  Suppliers               — FSCA-registered food suppliers
  Purchase Orders         — weekly produce orders
  Stock Control           — raw material inventory, FEFO rotation

MENU & PRICING
  Menu Items              — finished products, sell price, margin
  Nutrition Labels        — per-portion nutritional info
  Promotions              — daily specials, combos

CUSTOMERS
  Orders                  — dine-in, takeaway, delivery
  Loyalty                 — repeat customer rewards
  Customer Feedback       — ratings, complaints

FINANCIALS
  Revenue                 — food sales by category (breakfast/lunch/dinner)
  Food Cost %             — target <30% food cost
  Labour Cost %           — target <35% labour
  Overheads               — rent, utilities, cleaning
  VAT                     — food VAT rules (hot/cold, dine-in/takeaway)
  P&L                     — daily, weekly, monthly
  Balance Sheet

OPERATIONS
  Daily Trading           — covers, avg spend, peak hours
  Cash-Up                 — EOD float reconciliation
  Staff Rosters           — kitchen, FOH, delivery
  Documents               — FSCA cert, health certificate

### C. Module Gap Analysis

EXISTS AND WELL-FITTED:
  HQFoodIngredients       — SA DAFF ingredients
  HQRecipeEngine          — recipes, yield, cost
  HQHaccp                 — HACCP CPs
  HQFoodSafety            — safety checklists
  HQNutritionLabel        — nutritional info
  HQColdChain             — temperature_logs
  HQRecall                — lot traceability
  HQFoodIntelligence      — F&B analytics
  production_runs         — recipe runs with QC, yield, allergens

MISSING:
  Waste Log               — no dedicated waste/spoilage tracking table
  Production Schedule     — no forward planning module (what to make)
  Menu engineering        — no menu profitability analysis (stars/dogs/plows)
  Delivery integration    — no UberEats/MrD API hook
  Daily covers/table mgmt — no FOH operations module
  Food cost % dashboard   — not surfaced as a daily KPI

PARTIALLY DONE:
  allergen_flags          — on production_runs ✓ but not on menu items
  food cost %             — calculable from AVCO but no dedicated view

### D. Financial Structure (food_beverage)

REVENUE
  40100  Food Sales — Breakfast
  40200  Food Sales — Lunch
  40300  Food Sales — Dinner / À la carte
  40400  Beverage Sales
  40500  Takeaway & Delivery
  40600  Catering Events

COGS
  50100  Food Cost — Raw Ingredients    (target: <30% of food revenue)
  50200  Beverage Cost                  (target: <25% of bev revenue)
  50300  Packaging — Takeaway Containers
  50400  Wastage & Spoilage Write-off

LABOUR
  60100  Kitchen Wages
  60200  FOH Wages
  60300  Delivery Staff

OVERHEADS
  60400  Rent & Facilities
  60500  Gas, Electricity, Water
  60600  Cleaning & Hygiene Supplies
  60700  FSCA / Health Compliance Costs
  60800  Marketing & Social Media

### E. Seeding Plan (existing — v3, live for Nourish Kitchen)

Current seed includes: 10 products, 5 HACCP, 3 recipes, 42 temp logs.
Enhancement needed:
  - Waste log sample entries
  - Daily trading data (covers, avg spend)
  - Menu category structure in branding_config
  - Food cost % target stored in tenant_config

### F. Demo Tenant

  name: Nourish Kitchen & Deli      ← already exists
  slug: nourish-kitchen
  Status: live, seeded, 240 orders

---

## PROFILE 4 — general_retail (Mixed / General Retail)

### A. Industry Analysis

General retail in SA covers a wide spectrum — vape shops, lifestyle stores,
hardware, clothing, electronics. Common characteristics:
  - SKU-based (barcodes, not batches)
  - Supplier-managed products (not manufactured)
  - Standard retail pricing (cost + margin)
  - VAT at 15% across almost all products
  - No specialty compliance (no SAHPRA, no DAFF)
  - Key challenge: stock turns, shrinkage, reorder timing

Operational flow:
  Supplier → PO → Stock Receive → AVCO → Pricing →
  POS Sale → Inventory Update → Reorder Alert → Repeat

### B. Navigation Structure (Tenant Portal: general_retail)

SHOP
  Products                — SKU catalogue, categories, pricing
  Inventory               — qty on hand, low stock, movements
  Receiving               — goods receipt against PO
  Reorder                 — AI-scored reorder recommendations

SUPPLIERS
  Supplier Directory      — contacts, terms, lead times
  Purchase Orders         — create, send, receive
  Supplier Performance    — on-time, quality, pricing trends

SALES
  POS / Till              — point of sale
  Daily Trading           — revenue, transactions, avg basket
  Cash-Up                 — EOD reconciliation
  Wholesale Orders        — B2B customers (if applicable)

FINANCIALS
  Revenue                 — by product category
  COGS (AVCO)             — weighted average cost
  Gross Margin %          — target by category
  Expenses                — rent, staff, utilities
  VAT Return (15%)
  P&L
  Balance Sheet

CUSTOMERS
  Customer Profiles       — purchase history
  Loyalty                 — points, tiers (optional)

OPERATIONS
  Staff                   — rosters, commissions
  Documents               — supplier contracts, insurance

### C. Module Gap Analysis

EXISTS AND WELL-FITTED:
  SmartInventory          — full catalog management
  HQStock / StockControl  — stock movements, AVCO
  HQPurchaseOrders        — PO workflow
  HQSuppliers             — supplier directory
  POSScreen               — point of sale
  EODCashUp               — cash reconciliation
  HQReorderScoring        — AI reorder recommendations
  HQAnalytics             — sales analytics
  Full financial suite    — P&L, Balance Sheet, VAT, Journals

MISSING:
  Shrinkage tracking      — no stock loss / write-off workflow
  Product returns         — no RMA / return to supplier workflow
  Barcode scanning        — POS does not integrate hardware scanner
  Layby / payment plans   — no deferred payment workflow

### D. Financial Structure (general_retail)

REVENUE
  40100  Product Sales — Electronics / Tech
  40200  Product Sales — Accessories
  40300  Product Sales — Vape / Lifestyle
  40400  Service Revenue (repairs, etc.)

COGS
  50100  Cost of Goods Sold (AVCO)
  50200  Freight & Import Costs
  50300  Shrinkage & Write-offs

EXPENSES
  60100  Rent
  60200  Staff
  60300  Marketing
  60400  Packaging & Bags
  60500  Insurance
  60600  Utilities

### E. Seeding Plan (existing — v3, live for Maxi Retail / Vozel Vapes)

Current seed: 6 products, expenses, journal, sim-pos orders.
Enhancement: category structure, supplier records, reorder thresholds.

### F. Demo Tenants

  Vozel Vapes           — general_retail, seeded
  Maxi Retail SA        — general_retail, seeded, 232 orders

---

## PROFILE 5 — mixed_retail (NEW — Multi-Category Store)

### A. Industry Analysis

A mixed retail store combines product categories — e.g. a lifestyle store
selling both vape products AND food/coffee AND general merchandise.
This is the "CA sets up a shop and lands in F&B ERP" scenario.

The key design challenge: the tenant has ONE shop but needs ERP modules
from multiple profiles. The wizard must identify this early.

Entry example: CA creates a "The Vibe Store" — sells coffee, vapes, snacks.
They need:
  - F&B modules for the kitchen/prep side
  - Retail modules for packaged goods
  - Vape-specific batch tracking (if reselling manufactured vapes)
  - A single P&L that consolidates all revenue streams

### B. Navigation Structure (Tenant Portal: mixed_retail)

SHOP
  Products                — all categories unified catalog
  Inventory               — multi-category stock control
  Pricing                 — category-based pricing rules
  POS / Till              — multi-category point of sale

KITCHEN (if F&B component)
  Recipe Engine           — food production
  HACCP Monitoring        — food safety (R638)
  Cold Chain              — temperature logs

SUPPLY CHAIN
  Suppliers               — food, vape, general
  Purchase Orders         — category-tagged POs
  Receiving               — GRN workflow

FINANCIALS
  Revenue by Category     — food vs vape vs general breakdown
  COGS by Category        — separate food cost % vs retail margin
  Consolidated P&L        — all streams in one statement
  VAT                     — mixed rates (food vs standard goods)
  Expenses
  Balance Sheet

CUSTOMERS
  Loyalty                 — unified points across categories
  Customer Analytics      — basket composition, cross-sell

OPERATIONS
  Daily Trading           — consolidated + category breakdown
  Cash-Up
  Staff

### C. Module Gap Analysis

The mixed_retail profile does not yet exist as a code branch.
What needs building:
  - industry_profile = 'mixed_retail' recognized in tenant seeding
  - Wizard step that asks which categories the store carries
  - branding_config stores enabled_modules array
  - Tenant Portal nav assembled from enabled_modules at runtime
  - Financial reports with category breakdowns

### D. Financial Structure (mixed_retail)

Must support department-level P&L:
  Revenue: segregated by department (food / vape / general / other)
  COGS: separate cost % targets per department
  Shared overheads: allocated by revenue weight

### E. Seeding Plan

TBD — depends on which sub-categories the store enables in wizard.
Seed should ask: "What do you sell?" → checkboxes → seed accordingly.

### F. Demo Tenant

  name: The Vibe Store (TBD)
  slug: vibe-store
  industry_profile: mixed_retail
  Sells: coffee + vapes + snacks

---

## CROSS-PROFILE ANALYSIS — What's Missing Everywhere

### Financial Module Issues (all profiles)

Current naming vs industry-appropriate naming:

  "Costing" → should be "Cost of Goods" or "COGS Builder"
  "P&L" → correct, but should show industry-specific line items
  "Finance" group → rename to "Financials" (owner's instinct, correct)
  "Procurement" → rename to "Purchasing" (universal) or profile-adaptive

Industry-specific P&L line items are NOT yet profile-adaptive.
The same P&L template shows for a dispensary and a café.
This is the biggest financial gap — P&L must render differently per profile.

### Nav Group Renames (HQ + Tenant Portal)

  Current: Finance    → Proposed: Financials
  Current: Intelligence → Proposed: Analytics & Intelligence (or just Analytics)
  Current: Procurement  → Proposed: Purchasing (profile-adaptive: 'Receiving (GMP)' for dispensary)
  Current: Distribution → Profile-adaptive: 'Dispensing' for medical, keep for retail

### Missing Universal Modules

  Waste & Write-off module  — relevant to all 5 profiles differently
  Returns workflow          — retail returns, food wastage, drug destruction
  Promotional engine        — discounts, bundles, BOGO (all retail profiles)
  Customer segmentation     — RFM analysis beyond current churn model

---

## BUILD STAGES

### Stage 1 — WP-MEDI-CAN (CURRENT PRIORITY)
  Goal: Create Medi Can Dispensary tenant, build patient/dispensing modules
  DB: patients, dispensing_logs, practitioners, section_21 tables
  Nav: cannabis_dispensary Tenant Portal nav (clinical focus)
  Seed: patients, practitioners, dispensing history, CSR data
  Financials: medical-specific P&L line items
  Status: PLANNING → START

### Stage 2 — WP-PROFILE-NAV
  Goal: Profile-adaptive Tenant Portal navigation
  - cannabis_dispensary nav: Clinical / Compliance / Inventory / Financials
  - cannabis_retail nav: Shop / Supply Chain / Production / Customers / Financials
  - food_beverage nav: Kitchen / Food Safety / Ingredients / Financials
  - general_retail nav: Shop / Suppliers / Sales / Financials
  - mixed_retail nav: assembled at runtime from enabled_modules
  Status: DESIGN (this document)

### Stage 3 — WP-FINANCIAL-PROFILES
  Goal: P&L and financial reports render industry-specific line items
  - Chart of accounts varies by profile
  - P&L template switches based on industry_profile
  - Gross margin targets are profile-specific (30% F&B vs 60%+ cannabis)
  Status: DESIGN

### Stage 4 — WP-MIXED-RETAIL
  Goal: mixed_retail profile, wizard sub-category selection
  Status: FUTURE

### Stage 5 — WP-WIZARD-V2
  Goal: Enhanced onboarding wizard that is fully industry-aware
  - Step 1: Industry selection (with clear industry descriptions)
  - Step 2: Sub-category selection (for mixed retail)
  - Step 3: Business details
  - Step 4: Financial setup (VAT registered? fiscal year start?)
  - Step 5: Seed preferences
  - Step 6: Launch + auto-seed
  Status: FUTURE

---

## LL RULES ADDED BY THIS WP

LL-224 (NEW): Industry profiles must have separate P&L templates.
  A single P&L component rendering for all profiles is a design violation.
  Each profile needs its own revenue line names, cost category names, and
  gross margin targets. Do not attempt to make one template fit all.

LL-225 (NEW): cannabis_dispensary NEVER shows Wholesale Orders, Distribution,
  or Retailers tabs. These concepts do not exist in a clinical dispensary.
  RLS + nav config must gate these out at the profile level.

LL-226 (NEW): patients and dispensing_logs tables are Schedule 6 controlled
  substance records. Every insert/update must be audit-logged. Never soft-delete
  dispensing events — mark voided with void_reason and void_timestamp only.

---

## NEXT SESSION START (Stage 1 — WP-MEDI-CAN)

Read before starting:
  1. docs/NUAI-AGENT-BIBLE.md
  2. docs/WP-INDUSTRY-PROFILES_v1_0.md (this file)
  3. docs/SESSION-STATE_v233.md

First actions:
  1. Read src/components/hq/HQMedical.js — what does it currently do?
  2. Supabase schema audit: do patients/dispensing_logs/practitioners tables exist?
  3. Plan migrations for Stage 1 DB tables
  4. Build Medi Can tenant creation + seed-tenant v4 cannabis_dispensary branch
