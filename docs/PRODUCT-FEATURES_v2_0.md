# PRODUCT-FEATURES v2.0 — NuAi Platform Feature Bible
## Version: v2.0 · Updated: 07 Apr 2026
## Purpose: A cold-start agent reading ONLY this file must be able to accurately
##           answer: "List every feature of this system and what it does."
## Previous: v1.0 (~40% coverage) · This: ~100% coverage

---

# WHAT IS NUAI?

NuAi is a multi-tenant SaaS ERP platform for South African cannabis retail and mixed retail.
Built session by session since January 2026. One live client: Medi Recreational (private beta).
Five tenants registered. Stack: React SPA + Supabase (PostgreSQL + Edge Functions + RLS) + Vercel.

---

# THE SEVEN PORTALS

1. **/hq** — HQ Command Centre (operator/HQ users, 34 tabs)
2. **/tenant-portal** — Tenant Operator Portal (retailer admins, role-aware sidebar)
3. **/admin** — Admin Dashboard (admin-role: 13 tabs) OR Shop Dashboard (shop tenants: 4 tabs)
4. **/hr** — HR Dashboard (HR users + HQ, 14 tabs)
5. **/staff** — Staff Portal (any logged-in user, self-service)
6. **/wholesale** — Wholesale Portal (retailer role, B2B ordering)
7. **/shop + public pages** — Consumer e-commerce + loyalty + education

---

# FEATURES BY CATEGORY

## DASHBOARD & INTELLIGENCE

- **HQ Overview Dashboard** — 12-section command view with Information Bubbles pattern
- **Daily Trading Dashboard** — today's revenue, top sellers from order_items, 30-day chart
- **Admin Dashboard** — 13-tab platform view with real-time subscriptions, 12-week heatmap
- **Geo Analytics** — geographic customer visualization
- **Shop Dashboard** — 4-tab portal for shop-type tenant admins

## POINT OF SALE & DAILY OPERATIONS

- **POS Till** — full budtender POS (cash/card/Yoco), requires active session
- **End-of-Day Cash-Up** — till reconciliation, 90 real EODs
- **Simulated Sales Engine** — sim-pos-sales EF with AVCO in product_metadata

## INVENTORY & STOCK

- **Smart Inventory Catalog** — tile/list/detail views, SC-01 stats, bulk actions
- **HQ Stock Management** — 7 tabs, 14 product worlds, AVCO live (PROTECTED)
- **Admin Stock Control** — industry-profile-aware, 5 tabs (153KB)
- **14 Product Worlds** — cannabis, concentrates, edibles, hardware, etc. (LOCKED)
- **AVCO Live Costing** — continuously updated weighted average cost
- **Stock Receive — AI Invoice Ingestion** — photograph invoice, AI processes stock
- **Reorder Scoring** — velocity-weighted AI reorder recommendations
- **Cannabis Detail View** — Excel-style sortable table in HQStock Items tab

## PROCUREMENT & SUPPLIERS

- **Purchase Orders** — full PO lifecycle, FX-aware, 6 POs
- **Supplier Management** — 5 suppliers, 123 products
- **Document Processing** — AI-powered invoice/COA/delivery note ingestion

## FINANCIAL

- **Profit & Loss** — revenue + estimated COGS (WP-P&L-INTELLIGENCE will upgrade to actual)
- **Balance Sheet** — assets (stock AVCO), liabilities, cash position
- **Expense Tracker** — 44 rows seeded (R331,930 Jan-Apr)
- **Costing Engine** — per-SKU AVCO, recipe COGS, FX impact (144KB)
- **Pricing Management** — channel-based pricing, 36 records
- **Invoicing** — AR/AP built, 0 invoices (pending first wholesale order)
- **Live FX Rates** — USD/ZAR with yesterday + 30d deltas, 716 rows

## LOYALTY & CUSTOMERS

- **QR-to-Earn Loyalty** — 181 scans, 60 QR codes, 263 transactions
- **Loyalty Tiers** — Bronze/Silver/Gold/Platinum, auto-upgrade
- **Birthday Points** — DB function fires automatically
- **Referral Programme** — 8 referral codes
- **Public Leaderboard** — monthly, no auth required
- **Customer Profiles** — purchase/scan history, churn risk, engagement
- **QR Code Engine** — batch management, 152KB (far larger than assumed)
- **Customer Messaging** — broadcast, templates, support tickets

## FRAUD & SECURITY

- **Fraud Detection (HQ)** — scan velocity analysis, 62 system alerts
- **Fraud & Security (Admin)** — platform-wide security management

## HR SUITE (14 modules)

Staff Directory · Staff Profiles · Leave · Timesheets (5-stage pipeline) · Contracts ·
Roster · Calendar (40 SA holidays) · Payroll · Disciplinary · Comms · Loans · Performance ·
Settings · Stock View

## PRODUCTION & COMPLIANCE

- **Production** — 310KB, largest file. Batches, BOM, yield, QC, COA
- **Food Ingredients** — 121 ingredients with nutrient/HACCP/allergen data
- **Recipe Engine** — formulation, version control, batch costing
- **HACCP** — 3 control points seeded, SA R638 compliance
- **Nutrition Labels** — SA R146 compliant generation
- **Cold Chain** — temperature monitoring (IoT pending)
- **Recall & Traceability** — batch-level recall via order_items
- **Food Intelligence** — AI-powered trend analysis

## CONSUMER EDUCATION

- **7 Cannabinoid Molecule Visualizers** — CBD, CBG, CBN, Delta-8/9/10 THC, THC-a
- **Terpene Education** — carousel, modals, individual terpene pages
- **Product Verification** — full product detail on QR scan (74KB)

## CONSUMER SHOP

- **Online Shop** — full e-commerce, inventory IS the website
- **Customer Account** — profile, POPIA consent, purchase history (111KB)
- **Cart & Checkout** — PayFast integration, channel: 'online'

## AI SYSTEMS

- **ProteaAI** — context-aware AI assistant (LOCKED, CODEBASE_FACTS updated v197)
- **AI Fixture** — proactive daily brief in sidebar
- **AI Document Ingestion** — invoice → stock receive
- **Stock AI Analysis** — via ai-copilot EF
- **Stock Opening Calibration** — AI calibration (LL-199 fixed)

## MULTI-TENANCY

- **Tenant Management** — feature flags, tiers, industry profiles
- **Tenant Setup Wizard** — 5-step onboarding, dry-run confirmed successful
- **6 Industry Profiles** — Cannabis Retail, Dispensary, General, F&B, Mixed, Operator

---

# EDGE FUNCTIONS (10 deployed)

ai-copilot v58 · payfast-checkout v44 · payfast-itn v39 · sign-qr v36 ·
verify-qr v34 · send-notification v37 · get-fx-rate v35 · process-document v49 ·
sim-pos-sales v1 · create-admin-user v1

---

# CRITICAL SCHEMA FACTS

```
inventory_items:  no 'notes' column · category is enum (12 values)
orders:           field = total (NOT total_amount) · channel: pos|online|wholesale
order_items:      NO inventory_item_id FK — via product_metadata jsonb
                  line_total is plain numeric — INSERT allowed (NOT GENERATED)
                  product_metadata stores: item_id, category, weighted_avg_cost
eod_cash_ups:     variance GENERATED — NEVER INSERT · field = system_cash_total
                  UNIQUE(tenant_id, cashup_date)
pos_sessions:     NO total_sales column
tenants:          type constraint: only 'hq' or 'shop' valid
```

---

# DATA SNAPSHOT (07 Apr 2026)

| Metric | Value |
|---|---|
| Active SKUs | 186 (of 232 total) |
| Stock value | ~R205,634 AVCO |
| Orders | 1,513 (real + seeded) |
| Order line items | 2,833 (AVCO in product_metadata) |
| Expenses | R331,930 (44 rows, Jan-Apr) |
| Tenants | 5 |
| Edge Functions | 10 |
| DB tables | 104 (58 with data) |
| DB functions | 35 |
| Component files | 130+ |

---

*PRODUCT-FEATURES v2.0 · NuAi · 07 Apr 2026*
*100% coverage of all portals, components, and features*
