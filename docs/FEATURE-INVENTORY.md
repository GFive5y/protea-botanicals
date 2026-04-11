# FEATURE INVENTORY — NuAi Platform
## Read-only audit · produced from live codebase
## Written: 11 April 2026 · HEAD: 8ce9979
## Sources: src/App.js routes · src/pages/* · src/components/hq/* · LIVE-AUDIT_v1_0_part1..3 · SESSION-STATE_v239

---

## HOW TO READ THIS DOCUMENT

Every feature in NuAi is reached via exactly one of these paths:

```
Route (App.js)  →  Page component (src/pages/*)  →  Tab/sub-tab  →  Feature component (src/components/*)
```

This document walks every portal and lists every user-facing feature with:

| Column | Meaning |
|---|---|
| **Feature** | The feature name as shown in the UI |
| **Component** | The JS file that renders it (relative to `src/`) |
| **Route / tab** | The URL or tab ID to reach it |
| **Nav entry?** | Whether it has a sidebar / waterfall / tab-bar entry the user can click |
| **Live data?** | Whether it queries Supabase (yes) or renders static content (no) |

All "yes" for **Live data?** means the component calls `supabase.from(...)` and reads real rows; "static" means the component renders hardcoded or prop-passed content only.

---

## PORTAL 1 — CONSUMER (public + authenticated customer)

Route prefix: `/` · no sidebar · single-page linear flow · drives PayFast + loyalty.

### Public landing + storefront

| Feature | Component | Route / tab | Nav entry? | Live data? |
|---|---|---|---|---|
| Landing page | `pages/Landing.js` | `/` | — (direct URL) | no |
| Product catalogue | `pages/Shop.js` (4,115 lines) | `/shop` | — | yes — `inventory_items`, `tenant_config`, `loyalty_config` |
| Age verification gate | `components/AgeGate.js` | wraps `/shop` | — | no |
| Brand header | `components/ClientHeader.js` (977 lines) | rendered by Shop | — | yes — `tenant_config.branding_config` |
| Cannabinoid education | `pages/MoleculesPage.js` (709 lines) | `/molecules` | — | no (static science) |
| Terpene education | `pages/TerpenePage.js` (463 lines) | `/terpenes` + `/terpenes/:terpeneId` | — | no (static) |
| Molecule carousel | `components/MoleculeCarousel.js` | embedded in Shop + Molecules | — | no |
| Molecule modal (7 cannabinoids) | `components/THCaMolecule.js`, `CBDMolecule.js`, `CBGMolecule.js`, `CBNMolecule.js`, `Delta8THCMolecule.js`, `Delta9THCMolecule.js`, `Delta10THCMolecule.js` | opened from MoleculeCarousel | — | no |
| Terpene carousel + modal | `components/TerpeneCarousel.js` (705), `TerpeneModal.js` (926) | embedded in Shop | — | no |
| Product verification page | `pages/ProductVerification.js` (2,131 lines) | `/verify/:productId` | — | yes — `inventory_items`, `batches`, `qr_codes` |
| Scan camera page | `pages/ScanPage.js` (680 lines) | `/scan` | — | no (device camera only) |
| Scan result | `pages/ScanResult.js` (2,142 lines) | `/scan/:qrCode` | — | yes — calls `verify-qr` EF, `scan_logs`, `loyalty_transactions` |

### Authenticated customer

| Feature | Component | Route / tab | Nav entry? | Live data? |
|---|---|---|---|---|
| Shopping cart | `pages/CartPage.js` (599 lines) | `/cart` | — | yes — `inventory_items` via CartContext |
| Checkout + PayFast | `pages/CheckoutPage.js` (1,176 lines) | `/checkout` | — | yes — creates `orders`, calls `payfast-checkout` EF |
| Order success | `pages/OrderSuccess.js` (832 lines) | `/order-success` | — | yes — `orders` lookup |
| Loyalty dashboard | `pages/Loyalty.js` (1,636 lines) | `/loyalty` | — | yes — `loyalty_transactions`, `user_profiles`, `referral_codes` |
| Points redemption | `pages/Redeem.js` (564 lines) | `/redeem` | — | yes — `loyalty_config`, `user_profiles` |
| Points leaderboard | `pages/Leaderboard.js` (294 lines) | `/leaderboard` | — | yes — `get_monthly_leaderboard` RPC |
| Customer account | `pages/Account.js` (3,447 lines) | `/account` | — | yes — `user_profiles`, `orders`, `loyalty_transactions` |
| Customer welcome / onboarding | `pages/Welcome.js` (336 lines) | `/welcome` | — | no |

### Shared consumer overlays

| Feature | Component | Where rendered | Live data? |
|---|---|---|---|
| Customer support widget | `components/CustomerSupportWidget.js` (900) | floating on Shop/Account | yes — `support_tickets` |
| Customer inbox | `components/CustomerInbox.js` (793) | account area | yes — `customer_messages` |
| Survey widget | `components/SurveyWidget.js` (292) | post-purchase | yes — `customer_surveys` |
| Toast notifications | `components/ToastContainer.js` (239) | platform-wide | no |
| Loyalty tier badges | `components/LoyaltyBadges.js` (723) | Shop + Account | no (visual only) |

---

## PORTAL 2 — WHOLESALE (B2B buyers)

Route: `/wholesale` · component: `pages/WholesalePortal.js` (640 lines)
Tab state: `const [activeTab, setActiveTab] = useState("order")` at line 100
Tabs rendered via button bar at line 248

| Tab ID | Feature | Component | Nav entry? | Live data? |
|---|---|---|---|---|
| `order` | Place wholesale order | inline in `WholesalePortal.js` | ✓ tab bar | yes — `inventory_items`, `stock_reservations`, `suppliers` |
| `history` | Wholesale order history | inline in `WholesalePortal.js` | ✓ tab bar | yes — `wholesale_orders`, `wholesale_order_items` |

---

## PORTAL 3 — STAFF (employee self-service)

Route: `/staff` · component: `pages/StaffPortal.js` (1,269 lines)
Tab state: `const [subTab, setSubTab] = useState("profile")` at line 1128
TABS array defined at line 1179

| Tab ID | Feature | Component | Nav entry? | Live data? |
|---|---|---|---|---|
| `profile` | My Profile | `ProfileTab` (inline in StaffPortal.js:203) | ✓ SubTabs | yes — `staff_profiles` |
| `leave` | My Leave | `LeaveTab` (inline at :413) | ✓ SubTabs | yes — `leave_requests`, `leave_balances`, `leave_types` |
| `timesheets` | My Timesheets | `TimesheetsTab` (inline at :930) | ✓ SubTabs | yes — `timesheets`, `timesheet_entries` |

**Note:** 4th tab ("messages") mentioned in LIVE-AUDIT Part 3 is not currently in the `TABS` array — verify against running app if needed.

---

## PORTAL 4 — HR (HR Manager / Admin)

Route: `/hr` · component: `pages/HRDashboard.js` (855 lines)
Tab state: `const [tab, setTab] = useState("overview")` at line 728
TABS array defined at line 85 (14 entries)
Rendered in switch at lines 836–851.

| Tab ID | Feature | Component | File size | Nav entry? | Live data? |
|---|---|---|---|---|---|
| `overview` | HR Overview dashboard | `HROverview` (inline or sub-component) | — | ✓ | yes — aggregates all HR tables |
| `staff` | Staff Directory | `components/hq/HRStaffDirectory.js` | 705 | ✓ | yes — `staff_profiles` |
| `leave` | Leave management | `components/hq/HRLeave.js` | 1,598 | ✓ | yes — `leave_requests`, `leave_balances`, `leave_types` |
| `timesheets` | Timesheet batch approve | `components/hq/HRTimesheets.js` | 2,885 | ✓ | yes — `timesheets`, `timesheet_entries` |
| `contracts` | Contracts (HTML→PDF) | `components/hq/HRContracts.js` | 1,089 | ✓ | yes — `contracts`, `contract_templates` |
| `comms` | HR Comms (inbox/broadcast) | `components/hq/HRComms.js` | 1,529 | ✓ | yes — `hr_messages`, `hr_broadcasts` |
| `disciplinary` | Warnings / hearings / appeals | `components/hq/HRDisciplinary.js` | 1,495 | ✓ | yes — `disciplinary_records` |
| `calendar` | HR Calendar (13 event layers) | `components/hq/HRCalendar.js` | 1,897 | ✓ | yes — `leave_requests`, `public_holidays`, `timesheet_entries` |
| `loans` | Loans + stipends | `components/hq/HRLoans.js` | 2,021 | ✓ | yes — `loans_stipends` |
| `performance` | KPI forms + PIP tracker | `components/hq/HRPerformance.js` | 1,769 | ✓ | yes — `performance_reviews`, `pip_records` |
| `payroll` | Payroll + SimplePay CSV | `components/hq/HRPayroll.js` | 1,076 | ✓ | yes — `timesheets`, `staff_profiles` |
| `settings` | HR settings (leave types / work hours) | `components/hq/HRSettings.js` | 776 | ✓ | yes — `leave_types`, `hr_settings` |
| `stock` | Stock take (blind/guided) | `components/hq/HRStockView.js` | 2,299 | ✓ | yes — `stock_takes`, `inventory_items` |
| `roster` | Shift scheduling | `components/hq/HRRoster.js` | 1,284 | ✓ | yes — `roster_weeks`, `roster_assignments` |

**HR Suite total: 13 active modules · 21,583 lines**

---

## PORTAL 5 — ADMIN (store manager)

Route: `/admin` · component: `pages/AdminDashboard.js` (1,700 lines)
Tab state: `const [tab, setTab] = useState("overview")` at line 354
Tab routing switch at lines 1242–1270.

| Tab ID | Feature | Component | File size | Nav entry? | Live data? |
|---|---|---|---|---|---|
| `overview` | Admin overview (KPIs, stats) | inline `AdminDashboard.js` | — | ✓ | yes — multi-table aggregate |
| `shipments` | Shipment tracking | `components/AdminShipments.js` | 2,075 | ✓ | yes — `shipments`, `shipment_items` |
| `production` | Store-level production | `components/AdminProductionModule.js` | 1,677 | ✓ | yes — `production_runs`, `production_run_inputs` |
| `batches` | Batch management | `components/AdminBatchManager.js` | 1,959 | ✓ | yes — `batches`, `production_runs` |
| `customers` | Customer CRM | `components/AdminCustomerEngagement.js` | 3,210 | ✓ | yes — `user_profiles`, `orders`, `loyalty_transactions` |
| `comms` | Comms hub | `components/AdminCommsCenter.js` | 2,888 | ✓ | yes — `customer_messages`, `broadcasts` |
| `security` | Fraud & security | `components/AdminFraudSecurity.js` | 2,040 | ✓ | yes — `scan_logs`, `user_profiles.anomaly_score` |
| `notifications` | Notification mgmt | `components/AdminNotifications.js` | 1,367 | ✓ | yes — `notification_log` |
| `qr_codes` | QR codes | `components/AdminQRCodes.js` | 4,750 | ✓ | yes — `qr_codes`, `scan_logs` + `sign-qr`/`verify-qr` EFs |
| `analytics` | Store analytics | `pages/AdminAnalytics.js` | 944 | ✓ | yes — `orders`, `order_items`, `scan_logs` |
| `stock` | Stock management | `components/StockControl.js` | 4,759 | ✓ | yes — `inventory_items`, `stock_movements`, `suppliers`, `purchase_orders` · **uses ActionCentre (79d8416)** |
| `documents` | Smart Capture documents | `components/hq/HQDocuments.js` | 3,180 | ✓ | yes — `capture_queue`, `document_log` + `process-document` EF |
| `hr` | HR panel (summary) | `components/AdminHRPanel.js` | 608 | ✓ | yes — `staff_profiles`, `leave_requests` |
| `users` | User management | inline `AdminDashboard.js` | — | ✓ | yes — `user_profiles`, `auth.users` |

### Admin-only dedicated tools

| Feature | Component | Route / tab | Nav entry? | Live data? |
|---|---|---|---|---|
| QR Generator (standalone) | `pages/AdminQrGenerator.js` (1,218) | `/admin/qr` | — (direct URL) | yes — `qr_codes` + `sign-qr` EF |
| Onboarding Wizard (v239) | `pages/OnboardingWizard.js` | `/onboarding` | — | yes — creates `tenants`, `tenant_config` + `seed-tenant` EF |

---

## PORTAL 6 — HQ DASHBOARD (cross-tenant operator)

Route: `/hq` · component: `pages/HQDashboard.js` (316 lines — wrapper only)
Tab state: `const [activeTab, setActiveTab] = useState("overview")` at line 131
TABS array defined at lines 73–128 (**43 entries**)
Uses `useNavConfig.js` for sidebar grouping (Finance → Financials · Intelligence → Analytics · Procurement → Purchasing after v239 rename)
Rendered via conditional block at lines 265–311.

### Overview & Operations

| Tab ID | Feature | Component | Lines | Nav entry? | Live data? |
|---|---|---|---|---|---|
| `overview` | HQ Command Centre | `components/hq/HQOverview.js` | 3,320 | ✓ | yes — `orders`, `inventory_items`, `stock_movements`, `expenses`, `eod_cash_ups`, `dispensing_log` · **uses ActionCentre (ec4a04f)** |
| `supply-chain` | Supply Chain | `components/hq/SupplyChain.js` + `components/StockControl.js` | 473 + 4,759 | ✓ | yes — via `useSystemHealth` + StockControl queries · **uses ActionCentre (8aa92fd + 8ce9979)** |
| `suppliers` | Suppliers directory | `components/hq/HQSuppliers.js` | 2,453 | ✓ | yes — `suppliers`, `supplier_products` |
| `procurement` | Purchase Orders | `components/hq/HQPurchaseOrders.js` | 3,140 | ✓ | yes — `purchase_orders`, `purchase_order_items` + `get-fx-rate` EF |
| `tenants` | Tenant management | `components/hq/HQTenants.js` | 1,753 | ✓ | yes — `tenants`, `tenant_config` |
| `shops` | Shop manager | `components/hq/ShopManager.js` | — | ✓ | yes — `tenants`, `inventory_items` |
| `distribution` | Wholesale shipments | `components/hq/Distribution.js` | 2,143 | ✓ | yes — `shipments`, `shipment_items` |

### Finance (WP-FINANCIALS — 10 phases complete)

| Tab ID | Feature | Component | Lines | Nav entry? | Live data? |
|---|---|---|---|---|---|
| `pl` | Profit & Loss (IFRS) | `components/hq/HQProfitLoss.js` | 2,750+ | ✓ | yes — `orders`, `order_items`, `expenses`, `dispensing_log` (dispensary) · profile-adaptive |
| `balance-sheet` | Balance Sheet | `components/hq/HQBalanceSheet.js` | 1,490 | ✓ | yes — `inventory_items`, `purchase_orders`, `vat_transactions`, `fixed_assets`, `equity_ledger` |
| `fixed-assets` | Fixed Assets (IAS 16) | `components/hq/HQFixedAssets.js` | 479 | ✓ | yes — `fixed_assets`, `depreciation_entries` |
| `journals` | Journal Entries | `components/hq/HQJournals.js` | 715 | ✓ | yes — `journal_entries`, `journal_lines`, `chart_of_accounts` |
| `invoices` | Invoices + aged debtors | `components/hq/HQInvoices.js` | 1,735 | ✓ | yes — `invoices`, `invoice_line_items` |
| `bank-recon` | Bank Reconciliation | `components/hq/HQBankRecon.js` | 418 | ✓ | yes — `bank_accounts`, `bank_statement_lines` |
| `expenses` | Expense Manager | `components/hq/ExpenseManager.js` | 1,566 | ✓ | yes — `expenses`, `tenant_config` · profile-aware subcategories |
| `vat` | VAT201 Module | `components/hq/HQVat.js` | 620 | ✓ | yes — `vat_transactions`, `vat_period_filings`, `tenant_config` |
| `year-end-close` | Year-End Close | `components/hq/HQYearEnd.js` | 338 | ✓ | yes — `journal_entries`, `equity_ledger`, `financial_year_archive` |
| `forecast` | 30-Day Forecast | `components/hq/HQForecast.js` | 661 | ✓ | yes — `orders`, `dispensing_log` (dispensary), `inventory_items`, `patients`, `prescriptions` |
| `email-logs` | Email Logs (GAP-C02) | `components/hq/HQEmailLogs.js` | — | ✓ | yes — `email_logs` |

### Stock & Production

| Tab ID | Feature | Component | Lines | Nav entry? | Live data? |
|---|---|---|---|---|---|
| `hq-stock` | HQ Stock intelligence (7 sub-tabs) | `components/hq/HQStock.js` | 5,890 | ✓ | yes — `inventory_items`, `stock_movements`, `purchase_orders`, `stock_receipts` · **uses ActionCentre (e601079)** |
| `hq-production` | Production (BOM/QC/batches) | `components/hq/HQProduction.js` | 8,949 | ✓ | yes — `production_runs`, `production_run_inputs`, `inventory_items`, `batches`, `product_formats`, `product_format_bom`, `product_strains` · **uses ActionCentre (79d8416)** |
| `hq-transfers` | HQ→Shop transfers | `components/hq/HQTransfer.js` | 1,692 | ✓ | yes — `stock_transfers`, `stock_transfer_items` |
| `hq-trading` | Daily trading dashboard | `components/hq/HQTradingDashboard.js` | 2,182 | ✓ | yes — `orders`, `order_items`, `pos_sessions`, `eod_cash_ups` |
| `hq-pos` | POS Till | `components/hq/POSScreen.js` | 1,532 | ✓ | yes — `orders`, `order_items`, `stock_movements`, `pos_sessions` |
| `hq-eod` | Cash-Up (EOD) | `components/hq/EODCashUp.js` | 1,402 | ✓ | yes — `eod_cash_ups`, `pos_sessions`, `tenant_config` |
| `pricing` | Per-SKU pricing (3 channels) | `components/hq/HQPricing.js` | 1,918 | ✓ | yes — `product_pricing`, `inventory_items`, `loyalty_config` |
| `costing` | COGS Builder | `components/hq/HQCogs.js` | 3,912 | ✓ | yes — `product_cogs`, `supplier_products`, `fx_rates`, `inventory_items` |
| `reorder` | Reorder scoring | `components/hq/HQReorderScoring.js` | 1,336 | ✓ | yes — `inventory_items`, `purchase_orders`, `stock_movements` |
| `wholesale-orders` | B2B wholesale orders | `components/hq/HQWholesaleOrders.js` | 2,070 | ✓ | yes — `wholesale_orders`, `inventory_items`, `stock_reservations` |

### Food & Beverage Suite (visible when profile === `food_beverage`)

| Tab ID | Feature | Component | Lines | Nav entry? | Live data? |
|---|---|---|---|---|---|
| `hq-ingredients` | SA DAFF Ingredients | `components/hq/HQFoodIngredients.js` | 5,082 | ✓ (F&B only) | yes — `food_ingredients` |
| `hq-recipes` | Recipe Engine | `components/hq/HQRecipeEngine.js` | 2,175 | ✓ (F&B only) | yes — `food_recipes`, `food_recipe_versions`, `food_recipe_ingredients` |
| `hq-haccp` | HACCP control points | `components/hq/HQHaccp.js` | 2,336 | ✓ (F&B only) | yes — `haccp_control_points`, `haccp_ccp_logs`, `ncr_records` |
| `hq-food-safety` | Food Safety certificates | `components/hq/HQFoodSafety.js` | 1,332 | ✓ (F&B only) | yes — `food_certificates` |
| `hq-nutrition` | Nutrition Label generator | `components/hq/HQNutritionLabel.js` | 1,191 | ✓ (F&B only) | yes — `food_recipes`, `food_ingredients` |
| `hq-cold-chain` | Cold Chain monitoring | `components/hq/HQColdChain.js` | 798 | ✓ (F&B only) | yes — `temperature_logs` |
| `hq-recall` | Product Recall & trace | `components/hq/HQRecall.js` | 1,666 | ✓ (F&B only) | yes — `recall_events`, `batches`, `distribution` |
| `hq-food-intelligence` | AI F&B weekly brief | `components/hq/HQFoodIntelligence.js` | 1,505 | ✓ (F&B only) | yes — aggregates F&B tables + `ai-copilot` EF |

### Dispensary Clinical Suite (visible when profile === `cannabis_dispensary` + `feature_medical=true`)

| Tab ID | Feature | Component | Lines | Nav entry? | Live data? |
|---|---|---|---|---|---|
| `medical` | **Medical Records (6 sub-tabs)** | `components/hq/HQMedical.js` | ~70KB | ✓ (gated) | yes — `patients`, `prescriptions`, `dispensing_log`, `batches`, `inventory_items` |
| ↳ | Patients (SAHPRA S21) | inline HQMedical | — | sub-tab | yes — `patients` |
| ↳ | Prescriptions | inline HQMedical | — | sub-tab | yes — `prescriptions` |
| ↳ | Dispensing (with voiding UI) | inline HQMedical | — | sub-tab | yes — `dispensing_log` + stock deduction |
| ↳ | Reports (SAHPRA CSV export) | inline HQMedical | — | sub-tab | yes — `dispensing_log` |
| ↳ | Compliance (S21 expiry · Rx warnings) | inline HQMedical | — | sub-tab | yes — `patients`, `prescriptions`, `dispensing_log` |
| ↳ | CSR — Controlled Substance Register | inline HQMedical | — | sub-tab | yes — `stock_movements`, `inventory_items`, `dispensing_log` |

### Intelligence / Analytics / Documents / Smart Capture

| Tab ID | Feature | Component | Lines | Nav entry? | Live data? |
|---|---|---|---|---|---|
| `analytics` | Analytics (6 sub-tabs, profile-adaptive) | `components/hq/HQAnalytics.js` | 3,289 | ✓ | yes — `orders`, `order_items`, `stock_movements`, `expenses`, `inventory_items`, `loyalty_transactions`, `scan_logs` |
| `geo-analytics` | Province/city heatmaps | `components/hq/GeoAnalyticsDashboard.js` | 1,207 | ✓ | yes — `scan_logs`, `orders` |
| `retailer-health` | Per-tenant health scoring | `components/hq/RetailerHealth.js` | 1,917 | ✓ | yes — `tenants`, `orders`, `inventory_items` |
| `documents` | Smart Capture (HQ variant) | `components/hq/HQDocuments.js` | 3,180 | ✓ | yes — `capture_queue`, `document_log` + `process-document`, `auto-post-capture`, `receive-from-capture` EFs |
| `loyalty` | Loyalty AI Engine (10 tabs) | `components/hq/HQLoyalty.js` | 4,537 | ✓ | yes — `loyalty_config`, `loyalty_transactions`, `user_profiles`, `referral_codes`, `loyalty_ai_log` + `loyalty-ai` EF |
| `fraud` | Fraud & Security | `components/hq/HQFraud.js` | 2,713 | ✓ | yes — `user_profiles`, `scan_logs`, `audit_log`, `deletion_requests` |

### HQ Always-on chrome (rendered outside tab switch)

| Feature | Component | Where rendered | Live data? |
|---|---|---|---|
| Live FX Bar | `components/hq/LiveFXBar.js` (2,078) | HQDashboard.js:262 | yes — `fx_rates` + `get-fx-rate` EF |
| PlatformBar intelligence | `components/PlatformBar.js` (1,354) | HQDashboard.js:263 + TenantPortal | yes — `system_alerts` |
| ProteaAI assistant | `components/ProteaAI.js` (2,346) | floating in HQ + Tenant Portal | yes — `ai-copilot` EF + ALL platform tables (read-only Query mode) |
| Global Search | `components/GlobalSearch.js` (545) | HQ + Tenant Portal header | yes — multi-table search |
| AccountBubble | `components/AccountBubble.js` (286) | HQ + Tenant Portal header | yes — `user_profiles`, `tenants` |
| NavSidebar | `components/NavSidebar.js` (559) | HQ + Tenant Portal left rail | no (static nav + badges from `usePageContext`) |

---

## PORTAL 7 — TENANT PORTAL (business owner · 4-branch waterfall nav)

Route: `/tenant-portal` · component: `pages/TenantPortal.js` (1,438 lines)
Tab state: resolved from URL `?tab=...` param
`getWaterfall(industryProfile)` switch selects one of 4 waterfall configs:
- `CANNABIS_RETAIL_WATERFALL` (line 327, default for cannabis tenants)
- `CANNABIS_DISPENSARY_WATERFALL` (line 547)
- `FOOD_BEVERAGE_WATERFALL` (added v239)
- `WATERFALL` (line 104, default manufacturing nav for general_retail)

Tab routing switch at lines 748–798 (**50+ case entries**).

**Every tab in the switch wraps an HQ component** — tenant portal reuses HQ components with its own sidebar. All features have nav entries via the waterfall sidebar. See Portal 6 (HQ) for the component detail; the table below just lists the tenant-portal-exposed tab IDs and which section of the waterfall they live in.

### CANNABIS_RETAIL_WATERFALL (8 sections)

| Section | Tabs (tab IDs from renderTab) | Nav entry? |
|---|---|---|
| Home | `overview` | ✓ |
| Inventory | `stock`, `catalog` | ✓ |
| Ordering | `suppliers`, `procurement`, `documents` | ✓ |
| Operations | `trading`, `cashup`, `smart-capture` | ✓ |
| Sales | `pos`, `pricing`, `loyalty`, `invoices` | ✓ |
| Customers | `customers`, `qr-codes`, `comms` | ✓ |
| Reports | `pl`, `expenses`, `analytics`, `reorder`, `balance-sheet`, `costing`, `forecast`, `year-end`, `journals`, `vat`, `bank-recon`, `fixed-assets`, `fin-statements` | ✓ |
| Team | `staff`, `roster`, `timesheets`, `leave`, `contracts`, `payroll`, `hr-calendar` | ✓ |

### CANNABIS_DISPENSARY_WATERFALL (6 sections)

| Section | Tabs | Nav entry? |
|---|---|---|
| Home | `overview` | ✓ |
| **Clinical** | **`medical` (→ HQMedical 6-tab clinical module)** | ✓ |
| Inventory | `stock`, `hq-production`, `supply-chain` | ✓ |
| Financials | `pl`, `expenses`, `invoices`, `journals`, `vat`, `bank-recon`, `balance-sheet`, `forecast`, `year-end` | ✓ |
| Operations | `cashup`, `documents`, `smart-capture` | ✓ |
| People | `staff`, `roster`, `timesheets`, `leave`, `contracts`, `payroll`, `hr-calendar` | ✓ |

**LL-225 enforced:** never shows Wholesale, Distribution, or Retailers tabs.
**LL-231 enforced:** P&L revenue reads `dispensing_log × inventory_items.sell_price`.

### FOOD_BEVERAGE_WATERFALL (7 sections)

| Section | Tabs | Nav entry? |
|---|---|---|
| Home | `overview` | ✓ |
| **Kitchen** | **`hq-production`, `hq-recipes`, `hq-ingredients`** | ✓ |
| **Food Safety** | **`hq-haccp`, `hq-food-safety`, `hq-cold-chain`, `hq-recall`, `hq-nutrition`** | ✓ |
| Inventory | `stock`, `supply-chain` | ✓ |
| Sales & Service | `trading`, `cashup`, `pos`, `loyalty` | ✓ |
| Financials | `pl`, `expenses`, `invoices`, `journals`, `vat`, `bank-recon`, `balance-sheet`, `forecast`, `year-end` | ✓ |
| People | `staff`, `roster`, `timesheets`, `leave`, `payroll` | ✓ |

**LL-232 enforced:** P&L shows Food Cost % primary KPI + 65% green margin threshold.

### WATERFALL (general_retail default, 8 sections)

Manufacturing-first layout — identical tab IDs as cannabis_retail but section order and labels differ. See `TenantPortal.js:104-325` for full section definitions.

### Tabs reachable via every waterfall (the full renderTab switch)

Because every waterfall's `getWaterfall(profile)` picks from the same pool of tab IDs, any of these 50+ IDs can appear in the URL and route to their component:

`overview`, `medical`, `hq-recipes`, `hq-ingredients`, `hq-haccp`, `hq-food-safety`, `hq-cold-chain`, `hq-recall`, `hq-nutrition`, `hq-food-intel`, `suppliers`, `procurement`, `supply-chain`, `documents`, `smart-capture`, `hq-production`, `stock`, `catalog`, `wholesale-orders`, `invoices`, `retailer-health`, `transfers`, `pricing`, `loyalty`, `pos`, `expenses`, `pl`, `costing`, `analytics`, `reorder`, `staff`, `qr-codes`, `customers`, `comms`, `trading`, `cashup`, `balance-sheet`, `fixed-assets`, `journals`, `vat`, `bank-recon`, `fin-notes`, `forecast`, `year-end`, `fin-statements`, `roster`, `timesheets`, `leave`, `contracts`, `payroll`, `hr-calendar`.

All components listed in Portal 6 (HQ Dashboard) above — this portal is a re-skinning of HQ components with a business-owner-oriented waterfall nav.

---

## PORTAL 8 — SHOP DASHBOARD (secondary, shop-level admin)

Route: not directly exposed in App.js main routes — component exists at `pages/ShopDashboard.js` (228 lines) and may be rendered inside AdminDashboard or HQDashboard as a sub-view.

| Feature | Component | Lines | Live data? |
|---|---|---|---|
| Shop Inventory | `components/shop/ShopInventory.js` | 850 | yes — `inventory_items` scoped to shop |
| Shop Analytics | `components/shop/ShopAnalytics.js` | 844 | yes — `orders`, `order_items`, `scan_logs` |
| Shop Settings | `components/shop/ShopSettings.js` | 597 | yes — `tenant_config.branding_config` |
| Shop Overview | `components/shop/ShopOverview.js` | 503 | yes — aggregate |

---

## CROSS-CUTTING SERVICES (not features per se, but every feature consumes them)

| Service | File | Purpose |
|---|---|---|
| `useTenant()` | `services/tenantService.js` (218) | Exposes `tenant`, `tenantId`, `industryProfile`, `tenantConfig`, `isHQ`, `allTenants`, `switchTenant` — used by every HQ/Tenant component |
| `usePageContext()` | `hooks/usePageContext.js` (1,522) | Builds per-tab context packs (headline, warnings, items, actions) for WorkflowGuide/ActionCentre — ~30 tab-specific queries |
| `useSystemHealth()` | `services/systemHealthContext.js` (360) | Shared live data layer feeding SupplyChain stats |
| `useNavConfig()` | `hooks/useNavConfig.js` (438) | HQ sidebar grouping (Financials · Analytics · Purchasing after v239 rename) |
| `StorefrontContext` | `services/StorefrontContext.js` (169) | Consumer-facing storefront branding resolver |
| `CartContext` | `services/CartContext.js` (119) | Shopping cart state |
| `RoleContext` | `App.js` | Authenticated user role for route gating |
| `PlatformBarContext` | `contexts/PlatformBarContext.js` (66) | PlatformBar alert state |
| `copilotService` | `services/copilotService.js` (359) | ProteaAI request/response layer |
| `scanService` | `services/scanService.js` (538) | QR scan service layer (calls `verify-qr` EF) |
| `geoService` | `services/geoService.js` (314) | Geolocation for scan logs |
| `notificationService` | `services/notificationService.js` (95) | WhatsApp/email notification dispatch |

---

## LOCKED / PROTECTED FILES (LL-061, LL-014, LL-221, LL-233)

Components that may not be edited freely. Noted here so any feature traced back to one of these files has known edit constraints.

| File | Status | Constraint |
|---|---|---|
| `components/StockItemModal.js` (2,858) | LOCKED (LL-014) | Never touch — 14 Product Worlds with custom fields per world |
| `components/ProteaAI.js` (2,346) | LOCKED (LL-061 + LL-237) | Only `CODEBASE_FACTS` str_replace + `getSuggested()` return arrays |
| `components/PlatformBar.js` (1,354) | LOCKED | Never touch |
| `services/supabaseClient.js` (14) | LOCKED | Never touch |
| `components/hq/HQStock.js` (5,890) | PROTECTED (LL-233) | Read in full before any edit |
| `components/hq/HQCogs.js` (3,912) | PROTECTED (LL-233) | Read in full — 3,912 lines |
| `components/hq/HQProduction.js` (8,949) | PROTECTED | Largest file in codebase |
| `components/hq/LiveFXBar.js` (2,078) | PROTECTED | Always-on FX ticker |
| `components/hq/HQMedical.js` (~70KB) | PROTECTED | Schedule 6 compliance module |
| `components/hq/HQOverview.js` (3,320) | PROTECTED | Multi-fetch, realtime subs, profile branches |
| `components/hq/HQProfitLoss.js` (112KB+) | PROTECTED | TDZ risk, profile branching |
| `pages/TenantPortal.js` (1,438) | PROTECTED | 4-branch waterfall routing |
| `components/hq/TenantSetupWizard.js` (1,574) | PROTECTED | Multi-step onboarding flow |

---

## ACTIONCENTRE ROLLOUT STATUS (as of 11 Apr 2026)

| Component | Commit | Scope |
|---|---|---|
| `components/hq/HQProduction.js` | `79d8416` | Stock alerts + WorkflowGuide ctx.warnings folded into one ActionCentre |
| `components/hq/HQOverview.js` | `ec4a04f` | Low stock alerts card replaced; `.limit(5)` → `.limit(50)` |
| `components/hq/HQStock.js` | `e601079` | Zone 1 Action Queue inline render replaced with ActionCentre |
| `components/hq/SupplyChain.js` | `8aa92fd` | Out-of-stock banner + ctx.warnings folded into ActionCentre |
| `components/StockControl.js` | `8ce9979` | WorkflowGuide → ActionCentre for ctx.warnings; inline Low Stock Alerts block deleted |

**Reach:** the StockControl change is visible on **three routes** — `/admin`, `/hq?tab=supply-chain`, `/tenant-portal?tab=supply-chain`.

---

## WHAT IS NOT YET COVERED BY ACTIONCENTRE

These components still render blocking alert blocks or WorkflowGuide-driven warning panels that could be candidates for future ActionCentre rollout:

| Component | Alert type | Evidence |
|---|---|---|
| `components/hq/HQForecast.js` | S21 Expiry + Rx Repeat cards | lines 1628+ — dispensary-only cards, kept as expanded blocks for clinical visibility |
| `components/hq/HQMedical.js` | Compliance expiry tables | S21 Authorizations + Rx Expiring + Expired Rx tables in Compliance sub-tab |
| `components/hq/HQVat.js` | Filing status banners | VAT period close warnings |
| `components/hq/HQBankRecon.js` | Unmatched lines panel | Unmatched bank statement lines |
| `components/hq/HQFixedAssets.js` | "Run Depreciation" prompt | When no depreciation has been run |
| `components/hq/HQCogs.js` | AVCO variance warnings | Cost drift alerts |
| `pages/AdminDashboard.js` | Overview alert cards (inline) | Comms + Fraud + Security status cards |
| WorkflowGuide panels — any tab not yet converted | All ~25 HQ tabs with `usePageContext(tabId)` still render WorkflowGuide with `ctx.warnings[]` by default |

---

## Orphan Risk — Features With No Nav Entry

Features reachable only by direct URL, conditional dispatch, or event-driven mount — with no persistent sidebar, tab-bar, or waterfall entry the user can click to discover them.

**Two risk tiers:**
- **Direct URL only** — typed into the address bar or reached via deep link. If the link is lost, the feature is effectively invisible.
- **Conditional dispatch** — automatically mounted when a runtime condition holds (e.g., tenant type). Discoverable for the matching users only; invisible to everyone else.

### Verification methodology
Each candidate below was verified by grep of `src/App.js` and all portal entry points for the component import and mount site. Evidence is cited with `file:line`.

### TIER 1 — Confirmed direct-URL-only features

| Feature | Component | Route | Mount evidence | Nav entry? | Discovery risk |
|---|---|---|---|---|---|
| **QR Generator (standalone)** | `pages/AdminQrGenerator.js` (1,218 lines) | `/admin/qr` | [src/App.js:1033-1042](src/App.js#L1033-L1042) — dedicated Route with `RequireAuth` + `RequireRole(["admin"])` + AppShell wrapper | ✗ no tab bar entry in AdminDashboard's 14-tab switch | **HIGH** — admin users must know the URL. The `qr_codes` tab in AdminDashboard renders `AdminQRCodes.js` (4,750 lines — different component). `AdminQrGenerator.js` is a separate, older admin-only tool. |
| **Onboarding Wizard (WP-STOREFRONT-WIZARD v239)** | `pages/OnboardingWizard.js` | `/onboarding` | [src/App.js:76](src/App.js#L76) import + [src/App.js:965](src/App.js#L965) `<Route path="/onboarding" element={<OnboardingWizard />} />` — public route, no auth guard | ✗ no sidebar entry anywhere | **HIGH** — typically the post-signup redirect from `invite-user` EF (v3). If the invite-email link is lost or the EF fails, no one can reach it. |

### TIER 2 — Conditional dispatch (NOT dead code, but not nav-reachable)

| Feature | Component | Route | Mount evidence | Nav entry? | Discovery risk |
|---|---|---|---|---|---|
| **ShopDashboard** | `pages/ShopDashboard.js` (228 lines) | `/admin` (conditional) | [src/App.js:74](src/App.js#L74) import + [src/App.js:742-787](src/App.js#L742-L787) `AdminDashboardRouter`: `if (isHQ) return <AdminDashboard />;` `if (tenantType === "shop") return <ShopDashboard />;` `return <AdminDashboard />;` (default) | ✗ no sidebar entry — auto-selected by tenant type at `/admin` | **LOW** — **NOT dead code.** Mounts automatically for tenants where `useTenant().tenantType === "shop"` (sub-shops of a parent tenant). Reachable by navigating to `/admin` given the right tenant context. No discovery problem for the target audience. |
| `components/shop/ShopInventory.js` (850) | — | — | rendered inside ShopDashboard | ✗ | **LOW (by inheritance)** — mounted when ShopDashboard mounts |
| `components/shop/ShopAnalytics.js` (844) | — | — | rendered inside ShopDashboard | ✗ | **LOW (by inheritance)** |
| `components/shop/ShopSettings.js` (597) | — | — | rendered inside ShopDashboard | ✗ | **LOW (by inheritance)** |
| `components/shop/ShopOverview.js` (503) | — | — | rendered inside ShopDashboard | ✗ | **LOW (by inheritance)** |

**Correction to earlier inventory claim:** An earlier version of this inventory listed ShopDashboard as "not directly exposed in App.js main routes". This was incomplete. `ShopDashboard` IS reached via the `/admin` route through the `AdminDashboardRouter` dispatcher at [App.js:742](src/App.js#L742). It is a live code path, not an orphan. It is, however, invisible to anyone whose tenant does not have `tenantType === "shop"`. None of the current 9 tenants in SESSION-STATE v239 list `shop` as a tenant type — so in practice this component may not be rendering for any live tenant right now, but that's a data/seed question, not a dead-code question.

### TIER 3 — Event-driven / ambiguous mount sites

These components are listed in LIVE-AUDIT Part 3 but their exact mount site in the portal sidebar is either event-driven (floating widget, modal, toast), prop-passed from a parent, or uninventoried. Not orphans in the strict sense — but not discoverable via any sidebar either.

| Component | Lines | Mount pattern | Confirmed site | Discovery risk |
|---|---|---|---|---|
| `CustomerSupportWidget.js` | 900 | floating overlay | Shop + Account area (confirmed in inventory) | LOW — visible as a floating button |
| `CustomerInbox.js` | 793 | nested in Account | Account page deep-link | LOW — reached via Account |
| `SurveyWidget.js` | 292 | post-purchase trigger | OrderSuccess flow | LOW — auto-triggered |
| `PromoBanner.js` | 164 | embedded in Shop | Shop component, prop-passed | LOW |
| `AIFixture.js` | 301 | "Proactive AI daily brief fixture" | **Mount site not yet confirmed** — follow-up grep needed | MEDIUM — may be dead code |
| `DevErrorCapture.js` | 149 | React error boundary | Wraps sensitive routes | LOW — invisible by design until an error fires |

**AIFixture.js is the only real ambiguous case.** A follow-up grep `rg "AIFixture" src/` would confirm whether it has a live mount site or was left in the codebase after an abandoned feature. Not done in this pass — read-only audit.

### Recommended follow-ups

1. **AdminQrGenerator** (TIER 1, HIGH): either add a "QR Tools" tab to AdminDashboard's sidebar (14→15 tabs), or confirm it's intentionally admin-only-by-URL and add a note to the admin onboarding doc. Don't leave a 1,218-line tool invisible to its users.

2. **OnboardingWizard** (TIER 1, HIGH): confirm the `invite-user` EF (v3) always embeds the `/onboarding` URL in its emails. If that's the only path in, the EF is a single point of failure for the entire tenant-onboarding flow.

3. **ShopDashboard + shop/ family** (TIER 2, LOW): if no current tenant has `tenantType === "shop"`, the entire 2,794-line `components/shop/` tree is rendering for nobody. Either (a) create a shop-type tenant to exercise the code path, (b) confirm the feature is scheduled for a future tenant, or (c) consider archiving the tree if the shop-dispatch pattern has been superseded.

4. **AIFixture.js** (TIER 3, MEDIUM): grep to confirm mount site. If none found, archive or remove.

5. **Rename clarification**: AdminDashboard has a `qr_codes` tab that renders `AdminQRCodes.js` (4,750 lines, the active QR management tool). The older `AdminQrGenerator.js` (1,218 lines, at `/admin/qr`) may be a legacy precursor. Consider marking the older one deprecated in its file header if that's the case.

---

## SUMMARY COUNTS

| Dimension | Count |
|---|---|
| Total portals (distinct routes with dedicated nav) | 8 |
| Total top-level routes in App.js | 22 |
| HQ Dashboard tabs | 43 (defined in HQDashboard.js:73-128) |
| Admin Dashboard tabs | 14 |
| HR Dashboard tabs | 14 |
| Staff Portal sub-tabs | 3 |
| Wholesale Portal tabs | 2 |
| Tenant Portal waterfall tabs (cannabis_retail) | ~35 across 8 sections |
| Tenant Portal waterfall tabs (cannabis_dispensary) | ~24 across 6 sections |
| Tenant Portal waterfall tabs (food_beverage) | ~30 across 7 sections |
| F&B exclusive modules | 8 components, 16,085 lines |
| HR Suite modules | 13 components, 21,583 lines |
| Total user-facing features (tabs/sub-tabs with live data) | ~130 |
| Edge Functions (live, per SESSION-STATE v239) | 17 |
| Database tables (all RLS) | 112 |
| Industry profiles (live) | 4 |
| Tenants (live) | 9 |

---

## METHODOLOGY

This inventory was assembled from:

1. **LIVE-AUDIT_v1_0_part1.md** — file inventory, edge functions, schema, industry profiles, security
2. **LIVE-AUDIT_v1_0_part2.md** — routes, HQ/Tenant/Admin nav structures, financial system, QR system
3. **LIVE-AUDIT_v1_0_part3.md** — component deep-dives, HR suite, shop components, services
4. **SESSION-STATE_v239.md** — current platform state, 17 EFs, 112 tables, 9 tenants, ActionCentre rollout context, WP-FINANCIAL-PROFILES / WP-MEDI-CAN / WP-PROFILE-NAV completion
5. **Direct codebase read:**
   - `src/pages/HQDashboard.js` — TABS array, 43 entries, switch render
   - `src/pages/TenantPortal.js` — CANNABIS_RETAIL_WATERFALL (327-545), CANNABIS_DISPENSARY_WATERFALL (547+), renderTab switch (748-798)
   - `src/pages/AdminDashboard.js` — tab state + switch (1242-1270)
   - `src/pages/HRDashboard.js` — TABS array (85-100), tab switch (836-851)
   - `src/pages/StaffPortal.js` — subTab state (1128), TABS array (1179), SubTabs render
   - `src/pages/WholesalePortal.js` — activeTab state (100), order/history tabs
   - `src/components/StockControl.js` — imports from AdminDashboard + SupplyChain (tenant + HQ routes)
   - `src/components/hq/SupplyChain.js` — imported by TenantPortal.js:20 for `/tenant-portal?tab=supply-chain`
   - `src/hooks/usePageContext.js` — 30+ tab-specific context queries, line 395-433 covers `admin-stock` ("N items need restocking")

This is a read-only document. No source files were modified to produce it.

---

*FEATURE-INVENTORY.md · NuAi · 11 April 2026*
*HEAD: 8ce9979 · Read-only audit from live codebase + LIVE-AUDIT v1.0*
