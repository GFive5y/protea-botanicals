# REGISTRY.md — NuAi Platform
## Capability-Indexed Component Registry
## Version: v3.2 · April 4, 2026
## THIS IS THE MANDATORY FIRST READ. Before MANIFEST.md. Before anything.

---

> ## ══════════════════════════════════════════════════════
> ## ⚠️ MANDATORY READ RULE — APPLIES TO THIS DOCUMENT ITSELF
> ## ══════════════════════════════════════════════════════
>
> **BEFORE UPDATING THIS FILE:**
> You MUST view the complete current file first — ALL sections, ALL lines.
> If you cannot confirm you have read every line — you cannot update it.
> Truncated reads are forbidden. Section 2 alone is 400+ lines.
> Pattern: view in full -> verify line count -> then and only then write.
> A shorter output than the previous version = data loss = hard failure.
> Revert and start over if this happens.
>
> ══════════════════════════════════════════════════════════════

---

> ## ══════════════════════════════════════════════════════
> ## HOW TO USE THIS DOCUMENT
> ## ══════════════════════════════════════════════════════
>
> **You want to build something. STOP. Search this document first.**
>
> Indexed by WHAT YOU WANT TO DO — not by filename.
> If it's here — IT IS ALREADY BUILT. Read the file. Extend it. Do not duplicate.
>
> RULE: Only build if you cannot find it in Section 1 AND confirmed absent from disk.
> After building: add to Section 1 (Feature Index) AND Section 2 (Signatures).
>
> LL-075: Session docs can say "pending" when the file already exists.
> ALWAYS verify: Get-ChildItem src\components\hq\ + Get-Content FILE | Select-Object -First 3
> If the file exists — it's built. Update the docs. Do not rebuild.

---

# SECTION 1 — FEATURE INDEX
## "I want to build..." → "Already exists here"

| If you want to... | Status | File |
|---|---|---|
| Show a health / status indicator | ✅ BUILT | `systemHealthContext.js` |
| Show global platform stats (inventory, orders, scans) | ✅ BUILT | `systemHealthContext.js` |
| Show alert badges, panel, ACK workflow | ✅ BUILT | `PlatformBar.js` |
| Show inline help / tooltip on any field | ✅ BUILT | `InfoTooltip.js` |
| Add a new tooltip explanation | ✅ BUILT — add to TOOLTIP_CONTENT | `InfoTooltip.js` |
| Build an AI assistant / copilot / chat panel | ✅ BUILT | `ProteaAI.js v1.4` |
| Build a tab-level AI drawer / assistant | ✅ BUILT — use ProteaAI | `ProteaAI.js v1.4` |
| Build a floating animated AI orb | ✅ BUILT | `AIOrb.js` |
| Show live FX / exchange rate | ✅ BUILT | `LiveFXBar.js` — LOCKED |
| Show contextual onboarding guide per tab | ✅ BUILT | `WorkflowGuide.js` |
| Store tab-level context for AI + guides | ✅ BUILT | `usePageContext.js` |
| Read tenant feature flags | ✅ BUILT | `useTenantConfig.js` |
| Track daily AI usage / select model | ✅ BUILT | `useAIUsage.js` |
| Read the current tenant ID + config | ✅ BUILT | `tenantService.js -> useTenant()` |
| Call the Anthropic API | ✅ BUILT — Edge Function | `ai-copilot` (Supabase) |
| Get live USD/ZAR exchange rate | ✅ BUILT — Edge Function | `get-fx-rate` (Supabase) |
| Sign a QR code (HMAC) | ✅ BUILT — Edge Function | `sign-qr` (Supabase) |
| Process / ingest a document with AI | ✅ BUILT — Edge Function | `process-document v1.9` |
| Auto-detect CAPEX/OPEX from ingested document | ✅ BUILT WP-FIN S3 | `process-document v1.9 classifyExpenseDocument()` |
| Show navigation sidebar | ✅ BUILT | `NavSidebar.js` |
| Configure navigation groups + items | ✅ BUILT | `useNavConfig.js` |
| Show sparklines | ✅ BUILT | `src/components/viz/SparkLine.js` |
| Show a KPI delta badge | ✅ BUILT | `src/components/viz/DeltaBadge.js` |
| Show a progress bar | ✅ BUILT | `src/components/viz/InlineProgressBar.js` |
| Show a pipeline stage diagram | ✅ BUILT | `src/components/viz/PipelineStages.js` |
| Show a bullet chart | ✅ BUILT | `src/components/viz/BulletChart.js` |
| Wrap a chart in a card | ✅ BUILT | `src/components/viz/ChartCard.js` |
| Show a custom chart tooltip | ✅ BUILT | `src/components/viz/ChartTooltip.js` |
| Show an icon | ✅ BUILT | `src/components/viz/Icon.js` |
| Show customer comms / support tickets | ✅ BUILT | `AdminCommsCenter.js` |
| Show customer 360 + churn risk | ✅ BUILT | `AdminCustomerEngagement.js` |
| Show fraud / anomaly scoring | ✅ BUILT | `AdminFraudSecurity.js` |
| Show QR code generation + pool management | ✅ BUILT | `AdminQRCodes.js` |
| Show shipment tracking | ✅ BUILT | `AdminShipments.js` |
| Show HR panel (admin / team-scoped view) | ✅ BUILT | `AdminHRPanel.js` |
| Show loyalty programme configuration | ✅ BUILT | `HQLoyalty.js v4.0` |
| Show live P&L with actual COGS + DB-backed OPEX | ✅ BUILT WP-FIN S1+S2 | `HQProfitLoss.js v3.2` |
| Show expense manager (CRUD + bulk import + CSV export) | ✅ BUILT WP-FIN S1 | `ExpenseManager.js v1.0` |
| Add CAPEX/OPEX expense from document ingestion | ✅ BUILT WP-FIN S3 | `HQDocuments.js v2.4 + process-document v1.9` |
| Show wholesale revenue in P&L from sale_out movements | ✅ BUILT WP-FIN S4 | `HQProfitLoss.js v3.2` |
| Show Balance Sheet + Cash Flow statement | ✅ BUILT WP-FIN S5+S6 | `HQBalanceSheet.js v1.0` |
| Show COGS engine / DDP tiers / landed cost | ✅ BUILT | `HQCogs.js` |
| Auto-apply shipping per-unit alloc to COGS form on input change | ✅ BUILT v130 | `HQCogs.js` |
| Show shipping label scaled to batch qty in COGS card | ✅ BUILT v130 | `HQCogs.js` |
| HQ Stock panels adapt category filters per industry profile | ✅ BUILT WP-STOCK-PRO S1 | `HQStock.js v3.1` |
| Save industry_profile via UI (HQTenants feature flags editor) | ✅ BUILT BUG-042 fix | `HQTenants.js` |
| Show purchase orders (import ERP) | ✅ BUILT | `HQPurchaseOrders.js` |
| Show production pipeline + batches + BOM | ✅ BUILT | `HQProduction.js` |
| Show reorder scoring | ✅ BUILT | `HQReorderScoring.js` |
| Show analytics (geo, scan trends, AVCO cost) — profile-adaptive | ✅ BUILT WP-BIB S12 | `HQAnalytics.js` |
| Show admin scan analytics — profile-adaptive | ✅ BUILT WP-BIB S12 | `AdminAnalytics.js` |
| Show geo intelligence (province, city, churn, demand gaps) | ✅ BUILT | `GeoAnalyticsDashboard.js` |
| Show retailer health scores | ✅ BUILT | `RetailerHealth.js` |
| Show supply chain view | ✅ BUILT | `SupplyChain.js` |
| Show distribution / wholesale shipments | ✅ BUILT | `Distribution.js` |
| Show B2B wholesale order management + reservation | ✅ BUILT | `HQWholesaleOrders.js` |
| Show SAGE-style wholesale invoice (print/PDF/email) | ✅ BUILT WP-FIN S4 | `HQWholesaleOrders.js v2.0` |
| Show aged debtors panel (0/30/60/90+ day buckets) | ✅ BUILT WP-FIN S4 | `HQInvoices.js v2.0` |
| Reserve stock for a confirmed order | ✅ BUILT — DB function | `reserve_stock()` |
| Release a stock reservation | ✅ BUILT — DB function | `release_reservation()` |
| Get available qty (on_hand minus reserved) | ✅ BUILT — DB function | `get_available_qty()` |
| Show stock inventory + available_qty + reserved badge | ✅ BUILT | `StockControl.js` |
| Checkout with available_qty oversell protection | ✅ BUILT | `CheckoutPage.js` |
| Warn on insufficient available materials in production | ✅ BUILT | `HQProduction.js NewRunPanel` |
| Show an age gate | ✅ BUILT | `AgeGate.js` |
| Show customer loyalty page | ✅ BUILT | `Loyalty.js` |
| Show a 5th-scan survey | ✅ BUILT | `SurveyWidget.js` |
| Show a QR scan result | ✅ BUILT — COMPLEX | `ScanResult.js v4.9` |
| Show the customer shop | ✅ BUILT | `Shop.js` |
| Show checkout + PayFast + loyalty points | ✅ BUILT | `CheckoutPage.js` |
| Show animated Lottie bot (customer-facing) | ✅ BUILT | `LottieCharacter.js` |
| Show 3D molecule components | ✅ BUILT (7 files) | `CBD/CBG/CBN/Delta8/Delta9/Delta10/THCaMolecule.js` |
| Show molecule carousel | ✅ BUILT | `MoleculeCarousel.js` |
| Show document vault + AI extraction | ✅ BUILT | `HQDocuments.js` |
| Show medical dispensary management | ✅ BUILT — GATED | `HQMedical.js` |
| Show patient + prescription records | ✅ BUILT | `HQMedical.js` (tabs: Patients, Prescriptions) |
| Show dispensing records + SAHPRA reports | ✅ BUILT | `HQMedical.js` (tabs: Dispensing, Reports, Compliance) |
| Show invoice list + payment recording | ✅ BUILT | `HQInvoices.js` |
| Show tenant management + feature flags | ✅ BUILT | `HQTenants.js` |
| Gate cannabis-specific UI on industry profile | ✅ BUILT | `industryProfiles.js -> showCannabisField()` |
| Gate medical UI on industry profile | ✅ BUILT | `industryProfiles.js -> showMedicalField()` |
| Show HR dashboard (full HR tier) | ✅ BUILT | `HRDashboard.js v1.3` |
| Show staff self-service portal | ✅ BUILT | `StaffPortal.js v1.0` |
| Show staff directory + profiles | ✅ BUILT | `HRStaffDirectory.js + HRStaffProfile.js` |
| Show leave management + approval workflow | ✅ BUILT | `HRLeave.js` |
| Show timesheet management + QR clock-in | ✅ BUILT | `HRTimesheets.js` |
| Show employment contracts + PDF generator | ✅ BUILT | `HRContracts.js` |
| Show disciplinary records + warning letters | ✅ BUILT | `HRDisciplinary.js` |
| Show HR communications + formal notices | ✅ BUILT | `HRComms.js` |
| Show HR calendar (13 event layers) | ✅ BUILT | `HRCalendar.js` |
| Show loans + allowances + repayment tracking | ✅ BUILT | `HRLoans.js` |
| Show performance reviews + PIP tracker | ✅ BUILT | `HRPerformance.js` |
| Export payroll data (CSV to SimplePay/Sage) | ✅ BUILT | `HRPayroll.js` |
| Show HR settings (leave types, work hours, templates) | ✅ BUILT | `HRSettings.js` |
| Show HQ overview dashboard with live KPIs | ✅ BUILT | `HQOverview.js` |
| Build page-level charts for HQ / Admin | 🔜 WP-VISUAL | spec ready, viz library ready |
| Show HQ food_beverage stock as tabbed command centre | ✅ BUILT WP-STOCK-PRO S3 | `HQStock.js v3.1` |
| Show food KPI strip in HQStock (expired/expiring/allergens/cold chain/low/value) | ✅ BUILT WP-STOCK-PRO S3 | `HQStock.js v3.1` |
| Show FEFO alert table in HQStock Overview (items sorted by nearest expiry) | ✅ BUILT WP-STOCK-PRO S3 | `HQStock.js v3.1` |
| Show cold chain panel in HQStock Overview (REF/FRZ items as cards) | ✅ BUILT WP-STOCK-PRO S3 | `HQStock.js v3.1` |
| Show AVCO cost drift panel in HQStock Overview (>5% deviation flagged) | ✅ BUILT WP-STOCK-PRO S3 | `HQStock.js v3.1` |
| Show food stock items table with search/filter/sort | ✅ BUILT WP-STOCK-PRO S3 | `HQStock.js v3.1 FoodItems` |
| Quick stock adjustment with mandatory reason + audit trail | ✅ BUILT WP-STOCK-PRO S3 | `HQStock.js v3.1` |
| Add/Edit inventory items directly from HQStock (all profiles) | ✅ BUILT WP-STOCK-PRO S3 | `HQStock.js v3.1 + StockItemModal` |
| Show expandable admin stock rows with AI analyse | ✅ BUILT WP-BIB S6 | `StockControl.js v2.4` |
| Show AI stock intelligence per item (profile-adaptive) | ✅ BUILT WP-BIB S6 | `StockAIAnalysis.js v1.0` |
| Show category-adaptive add/edit stock item modal | ✅ BUILT WP-BIB S4 + S3 | `StockItemModal.js v1.1` |
| Add food-specific fields to stock item (temp zone, lot#, country, reorder qty) | ✅ BUILT WP-STOCK-PRO S3 | `StockItemModal.js v1.1` |
| Show 14-allergen SA R638 declaration with live text generator on stock item | ✅ BUILT WP-STOCK-PRO S3 | `StockItemModal.js v1.1` |
| Create/edit BOM and product formats | ✅ BUILT WP-PROD-MASTER B | `HQProduction.js FormatCreatorPanel + BOMEditorPanel` |
| Run multi-chamber production with food recipe mode | ✅ BUILT WP-PROD-MASTER A | `HQProduction.js v3.5` |
| Show food_beverage recipe production form (allergens, QC, lot, FSCA) | ✅ BUILT WP-PROD-MASTER A | `HQProduction.js NewRunPanel` |
| Show general_retail receive form | ✅ BUILT WP-PROD-MASTER A | `HQProduction.js NewRunPanel` |
| Show recipe cost calculator with AVCO + waste % | ✅ BUILT WP-PROD-MASTER B | `HQProduction.js RecipeCostCalculator` |
| Show food production history detail (lot#, allergens, QC badge) | ✅ BUILT WP-PROD-MASTER A | `HQProduction.js HistoryPanel` |
| Show KPI stat strip on Batches tab (MTD / yield% / waste% / expiring) | ✅ BUILT WP-PROD-MASTER C | `HQProduction.js BatchesPanel` |
| Show recipe version history in history panel (food_beverage) | ✅ BUILT WP-PROD-MASTER C | `HQProduction.js HistoryPanel` |
| Write AVCO cost back to finished inventory_item on food run confirm | ✅ BUILT WP-PROD-MASTER C | `HQProduction.js NewRunPanel` |
| Show FEFO sort + expiry badge in BOM ingredient picker | ✅ BUILT WP-PROD-MASTER C | `HQProduction.js BOMEditorPanel` |
| Show profile-adaptive SUB_TABS labels + empty states (food/general/mixed) | ✅ BUILT WP-PROD-MASTER D | `HQProduction.js v3.5` |
| Show mixed retail per-row type badge (Manufacturing/Receiving/Recipe) | ✅ BUILT WP-PROD-MASTER D | `HQProduction.js v3.5` |
| Show temperature zone badge (FRZ/REF/AMB) in batch expiry cell | ✅ BUILT WP-PROD-MASTER D | `HQProduction.js v3.5` |
| Show profile-adaptive OverviewPanel KPIs (food: QC rate / expiring 7d / cost/unit) | ✅ BUILT WP-PROD-MASTER D | `HQProduction.js v3.5` |
| Show profile-adaptive WorkflowGuide steps for all production profiles | ✅ BUILT WP-PROD-MASTER E | `WorkflowGuideContent.js v1.2` |
| Show HR stock management + stock take system | ✅ BUILT WP-STOCK-PRO S4 | `HRStockView.js v1.0` |
| Run blind or guided stock take count session | ✅ BUILT WP-STOCK-PRO S4 | `HRStockView.js v1.0` |
| Configure stock take schedule + reminders | ✅ BUILT WP-STOCK-PRO S4 | `HRStockView.js v1.0 Schedule tab` |
| Set per-category variance thresholds for stock take approval | ✅ BUILT WP-STOCK-PRO S4 | `HRStockView.js v1.0 Schedule tab` |
| Approve or acknowledge stock take variances with mandatory reason + audit trail | ✅ BUILT WP-STOCK-PRO S4 | `HRStockView.js v1.0 Review tab` |
| Apply stock take adjustment (writes stock_take_adjustment movement) | ✅ BUILT WP-STOCK-PRO S4 | `HRStockView.js v1.0 Review tab` |
| Review and confirm AI document extraction per-line | ✅ BUILT WP-BIB S5 | `HQDocuments.js v2.4` |
| Onboard a new tenant (5-step Business in a Box wizard) | ✅ BUILT WP-BIB S7 | `TenantSetupWizard.js v1.0` |
| Show profile-adaptive QR scan result (food/general/cannabis) | ✅ BUILT WP-BIB S8 | `ScanResult.js v4.9` |
| Show profile-adaptive shop product cards (food/general/cannabis) | ✅ BUILT WP-BIB S9 | `Shop.js v4.4` |
| Show profile-adaptive platform alerts (expiry/reorder/stock) | ✅ BUILT WP-BIB S11 | `PlatformBar.js v1.2` |
| Show profile-adaptive HQ analytics (tabs, KPIs, expiry alert) | ✅ BUILT WP-BIB S12 | `HQAnalytics.js` |
| Show profile-adaptive admin scan analytics | ✅ BUILT WP-BIB S12 | `AdminAnalytics.js` |
| Show profile-adaptive pricing terminology | ✅ BUILT WP-BIB S13 | `HQPricing.js v4.1+S13` |
| Detect lump-sum invoices + allocate implied unit cost | ✅ BUILT WP-FIN S0 | `process-document v1.9` |
| Block duplicate invoice confirmation from creating double stock movements | ✅ BUILT WP-FIN S0 | `HQDocuments.js v2.4` |
| Create HQ→Shop transfer order (distribution model) | ✅ BUILT WP-STOCK-PRO S5 | `HQTransfer.js v1.0` |
| Dispatch stock from HQ warehouse to a shop tenant | ✅ BUILT WP-STOCK-PRO S5 | `HQTransfer.js v1.0` |
| Receive a transfer at store — add shop stock + audit trail | ✅ BUILT WP-STOCK-PRO S5 | `HQTransfer.js v1.0` |
| Cancel in-transit transfer + auto-reverse HQ stock | ✅ BUILT WP-STOCK-PRO S5 | `HQTransfer.js handleCancel()` |
| Add a new HQ tab to the left nav sidebar | ✅ BUILT — add entry to Operations group | `src/hooks/useNavConfig.js` |
| Show a multi-tenant client portal (manufacturer/distributor model) | ✅ BUILT WP-TENANT S3 | `TenantPortal.js v2.4` |
| Switch portal view between operator and tenant | ✅ BUILT WP-TENANT S3 | `HQDashboard.js VIEWING dropdown` |
| Capture React errors + console.error in a developer panel | ✅ BUILT WP-AI-UNIFIED | `DevErrorCapture.js v1.0` |
| Build an ingredient encyclopedia with DAFF nutrition + HACCP risk | ✅ BUILT WP-FNB S1 | `HQFoodIngredients.js` |
| Build a food recipe engine with BOM, nutrition, allergen propagation | ✅ BUILT WP-FNB S2 | `HQRecipeEngine.js` |
| Show HACCP digital control point log + NCR auto-raise | ✅ BUILT WP-FNB S3 | `HQHaccp.js` |
| Show food safety certificate vault with PlatformBar expiry alerts | ✅ BUILT WP-FNB S4 | `HQFoodSafety.js` |
| Generate SA R638 nutritional labels from recipe | ✅ BUILT WP-FNB S5 | `HQNutritionLabel.js` |
| Monitor cold chain temperatures with breach detection + PlatformBar alerts | ✅ BUILT WP-FNB S6 | `HQColdChain.js` |
| Manage product recalls + lot traceability + FSCA letter | ✅ BUILT WP-FNB S7 | `HQRecall.js` |
| Show food intelligence dashboard (allergen risk, compliance score, waste) | ✅ BUILT WP-FNB S8 | `HQFoodIntelligence.js` |
| Fetch food_recipe_lines for a set of recipes | ✅ BUILT — use .in() NOT nested select | `HQRecipeEngine.js (LL-090)` |
| Show SmartInventory tenant catalogue (drag-drop columns, pill filters, 14 worlds) | ✅ BUILT v1.5 (f6b065f) | `SmartInventory.js` |
| Show live trading dashboard (daily sales, EOD summary, 30-day trends) | ✅ BUILT WP-DAILY-OPS C | `HQTradingDashboard.js v3.0` |
| Show end-of-day cash reconciliation + variance escalation | ✅ BUILT WP-EOD | `EODCashUp.js v1.0` |
| Show in-store POS sales screen | ✅ BUILT WP-POS | `POSScreen.js v1.0` |
| Show Balance Sheet (assets, liabilities, equity, accounting equation badge) | ✅ BUILT WP-FIN S5 | `HQBalanceSheet.js v1.0` |
| Show Cash Flow statement | ✅ BUILT WP-FIN S6 | `HQBalanceSheet.js v1.0 (Cash Flow sub-tab)` |

---

# SECTION 2 — COMPONENT SIGNATURES
## Exact API for every component a future session might import or extend

---

### `systemHealthContext.js` ✅ BUILT v1.0
**File:** `src/services/systemHealthContext.js`
**What it does:** Global data provider. Fetches all platform stats once on mount. Realtime subscriptions on 8 tables. Exposes stats, loading, lastUpdated, refresh() to any consumer.
**Usage:**
```jsx
import { SystemHealthProvider, useSystemHealth } from '../services/systemHealthContext';
<SystemHealthProvider><App /></SystemHealthProvider>
const { stats, loading, refresh } = useSystemHealth();
```
**Stats shape:**
```js
stats.inventory    -> { totalActive, outOfStock, lowStock, stockValueSell, stockCost, byCategory }
stats.purchaseOrders -> { open, inTransit, pendingPayment, received }
stats.production   -> { planned, inProgress, completed, unitsFilled, avgYield }
stats.distribution -> { shipmentsActive, shipmentsDelivered, unitsShipped }
stats.scans        -> { total, last7Days, last30Days, customers }
stats.loyalty      -> { pointsIssued }
stats.alerts       -> { lowStockItems[], outOfStockItems[], openPOCount }
```
**DB tables (realtime):** inventory_items, purchase_orders, production_batches, stock_movements, shipments, shipment_items, scans, loyalty_transactions
**NOTE:** Some queries use legacy table names (scans, production_batches) — needs migration to scan_logs, batches.
**DO NOT:** Rebuild health monitoring. Do not create new Supabase subscriptions on these tables when this context already provides the data.

---

### `ProteaAI.js` ✅ BUILT v1.4 (WP-AI-UNIFIED — edf9a5c)
**File:** `src/components/ProteaAI.js`
**What it does:** Unified AI panel. 3 tabs (HQ only): Chat · Query · Dev. Tab-aware context. Streaming responses. Suggested questions per tab.
**Architecture:**
- Chat: role-aware, tab-aware, live DB context, streaming, suggested questions per tab
- Query: plain English → Claude writes Supabase spec → runs live → results table → "✦ Analyse" sends to Chat
- Dev: error capture viewer (auto-populated by DevErrorCapture), git context paste, codebase Q&A
**Usage tracking:** tenant_config.ai_queries_daily, ai_usage_log table
**Critical rules:** LL-095 — useAIUsage(dailyLimit NUMBER) not tenantId. LL-097 — NavSidebar must NOT call setAiOpen(false) on nav.
**Replaces (deleted from repo):** CoPilot.js, AIAssist.js, AIOrb.js (AIOrb.js still exists as component, no longer the primary AI entry point)
**DO NOT:** Build another AI panel. Pass tenantId to useAIUsage (LL-095). Close on tab navigate (LL-097).

---

### `DevErrorCapture.js` ✅ BUILT v1.0 (WP-AI-UNIFIED — edf9a5c)
**File:** `src/components/DevErrorCapture.js`
**What it does:** React error boundary (class component). Intercepts console.error. Stores errors in window.__proteaDevErrors[]. Dispatches protea-dev-error CustomEvent to notify ProteaAI Dev tab.
**Mount:** AppShell wraps all authenticated routes with DevErrorCapture.
**DO NOT:** Duplicate. Build another error boundary. Call patchConsole() more than once per mount (guarded by consolePatched flag).

---

### `HQWholesaleOrders.js` ✅ BUILT v2.0 (WP-FIN S4)
**File:** `src/components/hq/HQWholesaleOrders.js`
**What it does:** Full B2B wholesale order management with stock reservation lifecycle + SAGE-style invoice generation.
**Tables:** wholesale_partners, inventory_items (reserved_qty), stock_reservations, stock_movements, invoices
**Workflow:** Draft -> Confirmed (reserve_stock() per line) -> Shipped (auto-generate invoice) -> Delivered. Cancel any stage.
**v2.0 invoice additions:** SAGE-style modal with dark green toolbar (Print/Save PDF/Email). Auto-inserts to invoices table on ship. VAT column.
**Column traps (LL-115/116):** invoices uses supplier_id for ALL partners (no customer_id). No reference column — use invoice_number.
**Props:** None. Reads tenantId from useTenant() internally.
**DO NOT:** Call reserve_stock() on Draft. Build another invoice UI. Use customer_id on invoices. Use reference column — use invoice_number.

---

### `HQInvoices.js` ✅ BUILT v2.0 (WP-FIN S4)
**File:** `src/components/hq/HQInvoices.js`
**What it does:** Invoice list, aged debtors panel, line items, status pipeline, payment recording.
**v2.0 additions:** Aged debtors panel at top of page — per-dispensary outstanding balance bucketed: Current / 1-30 days / 31-60 days / 60+ days / Total. Grand total outstanding top-right.
**Column traps:** supplier_id for all partners. invoice_number not reference. due_date drives auto-overdue logic client-side.
**DO NOT:** Add customer_id column references. Use reference column.

---

### `HQProfitLoss.js` ✅ BUILT v3.2 (WP-FIN S1+S2+S4)
**File:** `src/components/hq/HQProfitLoss.js`
**What it does:** Live P&L — actual COGS from stock_movements × AVCO, DB-backed OPEX from expenses table, wholesale revenue from sale_out movements × sell_price.
**v3.2 revenue:** Website (orders table) + Wholesale (stock_movements sale_out × sell_price). Total R8,400 Pure Premium.
**v3.1 COGS:** Fetches production_out movements × unit_cost. Falls back to recipe estimates if no movements in period.
**v3.0 OPEX:** Reads expenses table (not useState). CAPEX memo card below Net Profit. Q1/Q2/Q3/Q4 + custom date range periods.
**Tables:** orders, stock_movements, expenses, loyalty_transactions, loyalty_config, inventory_items
**DO NOT:** Write OPEX to useState — it must go to expenses table. Wire weighted_avg_cost into COGS calculations directly.

---

### `HQBalanceSheet.js` ✅ BUILT v1.0 (WP-FIN S5+S6 — 29ecb89)
**File:** `src/components/hq/HQBalanceSheet.js`
**What it does:** Two sub-tabs: Balance Sheet + Cash Flow. Balance Sheet: inventory_items (AVCO × qty = assets), invoices (AR), expenses CAPEX (fixed assets), purchase_orders pending (AP). Equity = Assets − Liabilities (derived). Accounting equation check badge. CSV export. Cash Flow period selector.
**Tables:** inventory_items, invoices, expenses, purchase_orders
**DO NOT:** Store equity — always derive. Add a third sub-tab without owner confirmation.

---

### `ExpenseManager.js` ✅ BUILT v1.0 (WP-FIN S1)
**File:** `src/components/hq/ExpenseManager.js`
**What it does:** Full expense CRUD — List, Add/Edit, Bulk Import (CSV), Export. Categories: opex/wages/capex/tax/other. Foreign currency support (USD/EUR/GBP/CNY/AED).
**Tables:** expenses (tenant_id REQUIRED on every INSERT)
**DO NOT:** Use useState for OPEX — always write to expenses table.

---

### `TenantPortal.js` ✅ BUILT v2.4 (WP-TENANT S3 + April 3, 2026)
**File:** `src/pages/TenantPortal.js`
**What it does:** Client-facing tenant portal with SmartBar waterfall sidebar. Pure Premium model: manufacturer/distributor, no Food & Bev, no Platform admin.
**Layout:** `const INNER = { maxWidth: 1400, width: "100%", margin: "0 auto" }` applied to all wrappers. (LL-186)
**Sidebar sections:** Home → Procurement → Production → Distribution → Sales → Intelligence → People
**Login routing:** management role auto-redirects to /tenant-portal. is_operator=true auto-redirects to /hq.
**DO NOT:** Modify HQDashboard.js to build new portals — build new file (LL-110). Import ShopManager if Shops tab removed (LL-118).

---

### `SmartInventory.js` ✅ BUILT v1.5 (f6b065f — April 4, 2026)
**File:** `src/components/hq/SmartInventory.js`
**What it does:** Tenant-portal smart inventory catalogue. Drag-drop column reordering. Pill category filters (14 product worlds). Per-tenant scoped. Column config persists to tenant_config. 3 view modes: Tile / List / Detail.
**Drag-drop architecture (v1.5 fix — CRITICAL to understand):**
- Root cause 1: setColOrder callback read dragCol.current AFTER set to null on next line. React batching → callback runs next render → ref already null → fromIdx = -1 → silent fail.
- Root cause 2: dragend fires before drop in Chrome inside overflow:auto + sticky thead.
- Fix: handleDragStart: `e.dataTransfer.setData("text/plain", key)`. handleDrop: `const sourceKey = e.dataTransfer.getData("text/plain") || dragCol.current`. setColOrder uses `sourceKey` (local var), NOT `dragCol.current` (mutable ref).
**Tables:** inventory_items, tenant_config (column config persistence)
**DO NOT:** Use dragCol.current inside setColOrder callback — it will be null. Build parallel inventory catalogue — extend this file.

---

### `HQTradingDashboard.js` ✅ BUILT v3.0 (a5340f8 — WP-DAILY-OPS Sessions A-C)
**File:** `src/components/hq/HQTradingDashboard.js`
**What it does:** Live daily trading intelligence. Today's revenue, unit count, top products. 30-day rolling chart. Month/year history. EOD reconciliation summary.
**Tables:** pos_sessions, eod_cash_ups, daily_summaries, orders, stock_movements
**Column trap:** orders.total (NOT total_amount)
**DO NOT:** Query orders.total_amount — column does not exist.

---

### `EODCashUp.js` ✅ BUILT v1.0 (WP-EOD — 5249529)
**File:** `src/components/hq/EODCashUp.js`
**What it does:** End-of-day till cash reconciliation. Operator counts cash. System shows expected. Variance auto-calculated (GENERATED column). Status: balanced / flagged / escalated.
**Tables:** eod_cash_ups (variance GENERATED, UNIQUE tenant_id+cashup_date, RLS enabled), pos_sessions
**CRITICAL (LL-190):** All thresholds (variance_tolerance, escalation_threshold, default_float, approver_role) MUST come from tenant_config.settings JSONB. NEVER hardcode. Pattern: `const { variance_tolerance } = tenantConfig?.settings ?? {};`
**DO NOT:** Hardcode any threshold value. Modify variance GENERATED column logic.

---

### `POSScreen.js` ✅ BUILT v1.0
**File:** `src/components/hq/POSScreen.js`
**What it does:** In-store point of sale screen. Product grid, cart, payment. Creates stock_movements + sale record.
**CRITICAL (LL-189):** movement_type MUST be `'sale_pos'` for all POS transactions. NOT `'sale_out'` (wholesale/B2B only).
**DO NOT:** Use movement_type='sale_out' for POS sales. Confuse with online checkout flow.

---

### `HQFoodIngredients.js` ✅ BUILT v1.0 (WP-FNB S1 — 5082 lines)
**File:** `src/components/hq/HQFoodIngredients.js`
**What it does:** Food ingredient encyclopedia. 121 seeded SA ingredients. DAFF nutrition JSONB. HACCP risk classification. Allergen flags.
**Tables:** food_ingredients (allergens JSONB, DAFF nutrition JSONB, haccp_risk_level, shelf_life_days, temp_zone, storage_instructions)
**DO NOT:** Nested select food_ingredients with food_recipe_lines — use .in() query (LL-090).

---

### `HQRecipeEngine.js` ✅ BUILT v1.0 (WP-FNB S2 — 1075 lines)
**File:** `src/components/hq/HQRecipeEngine.js`
**What it does:** Food recipe BOM engine. Allergen auto-propagation from ingredient library. Nutrition per serve auto-computed. Cost per unit from weighted_avg_cost × BOM quantities.
**Tables:** food_recipes, food_recipe_lines, food_recipe_versions
**CRITICAL:** NEVER use nested select for food_recipe_lines. Fetch separately with .in("recipe_id", recipeIds) and attach manually (LL-090). Strip food_recipe_lines from UPDATE payload (LL-091).
**Integration:** "▶ Start Batch" writes sessionStorage('fnb_start_batch') → navigates to /hq?tab=hq-production for pre-fill.
**DO NOT:** Nested SELECT food_recipes with food_recipe_lines (LL-090). Include food_recipe_lines in UPDATE body (LL-091).

---

### `HQHaccp.js` ✅ BUILT v1.0 (WP-FNB S3 — 1031 lines)
**File:** `src/components/hq/HQHaccp.js`
**What it does:** HACCP digital control point system. CCP deviation → NCR auto-raised. PlatformBar alert on deviation.
**Tables:** haccp_control_points, haccp_log_entries, haccp_nonconformances
**system_alerts INSERT:** requires tenant_id + alert_type + severity + message + created_at. No updated_at (LL-094).
**DO NOT:** Add updated_at to system_alerts INSERT (LL-094).

---

### `HQFoodSafety.js` ✅ BUILT v1.0 (WP-FNB S4 — 632 lines)
**File:** `src/components/hq/HQFoodSafety.js`
**What it does:** Food safety certificate vault. Cert expiry fires PlatformBar alerts (critical/warning/info based on days remaining).
**Tables:** document_log (+9 food safety columns: food_doc_type, cert_expiry_date, etc.)
**alert_type:** food_cert_expiry

---

### `HQNutritionLabel.js` ✅ BUILT v1.0 (WP-FNB S5 — 590 lines)
**File:** `src/components/hq/HQNutritionLabel.js`
**What it does:** SA R638 nutritional label generator. Reads from food_recipes. Generates compliant label.

---

### `HQColdChain.js` ✅ BUILT v1.0 (WP-FNB S6 — 798 lines)
**File:** `src/components/hq/HQColdChain.js`
**What it does:** Cold chain temperature monitoring. Breach detection. PlatformBar alert on breach.
**Tables:** temperature_logs (is_breach, breach_severity, affected_lots[]), cold_chain_locations (min/max limits, location_type)
**alert_type:** cold_chain_breach

---

### `HQRecall.js` ✅ BUILT v1.0 (WP-FNB S7 — 791 lines)
**File:** `src/components/hq/HQRecall.js`
**What it does:** Product recall management + lot traceability. FSCA notification letter auto-generated as .txt.
**Tables:** recall_events (affected_batches JSONB, severity class)
**Trace engine:** food_ingredients → food_recipe_lines → food_recipes → production_runs
**alert_type:** product_recall

---

### `HQFoodIntelligence.js` ✅ BUILT v1.0 (WP-FNB S8)
**File:** `src/components/hq/HQFoodIntelligence.js`
**What it does:** Food intelligence dashboard. S1-S7 data aggregation: allergen risk, compliance score, waste, cost trends, cold chain health, recall readiness.
**Tables:** food_recipes, food_recipe_lines, food_ingredients, production_runs, haccp_log_entries, haccp_nonconformances, temperature_logs, recall_events
**DO NOT:** Add new DB tables — pure aggregation only.

---

### `StockControl.js` ✅ BUILT v2.4 (WP-STK Phase 3 Session 1 + WP-BIB S6)
**File:** `src/components/StockControl.js`
**What it does:** Admin stock management. Expandable rows with StockItemExpandedCard. AI Analyse button. available_qty = on_hand - reserved_qty computed live.
**Tables:** inventory_items (reserved_qty), stock_movements, qr_codes
**Props:** `<StockControl tenantId={str} industryProfile={str} />`
**DO NOT:** Store available_qty — always compute. Build another admin stock component.

---

### `HQTransfer.js` ✅ BUILT v1.0 (WP-STOCK-PRO S5 — c617f55)
**File:** `src/components/hq/HQTransfer.js`
**What it does:** HQ→Shop transfer order management. 4 sub-tabs: Overview / New Transfer / Active / History.
**Lifecycle:** draft → in_transit → received | draft|in_transit → cancelled
**Ship:** deducts HQ on_hand + transfer_out movement per line.
**Receive:** adds shop on_hand + transfer_in movement. Auto-creates shop item if not found (LL-024: sell_price=0).
**Cancel in-transit:** reverses HQ stock + reversal movement. Reason mandatory.
**Reference format:** TRF-YYYYMMDD-XXXX (DB UNIQUE constraint)
**Tables:** stock_transfers, stock_transfer_items, inventory_items, stock_movements
**DO NOT:** Use for B2B wholesale (that's HQWholesaleOrders.js). Skip tenant_id on any INSERT.

---

### `HRStockView.js` ✅ BUILT v1.0 (WP-STOCK-PRO S4 — 063f7dc)
**File:** `src/components/hq/HRStockView.js`
**What it does:** HR stock management + stock take system. 6 sub-tabs. Blind/guided count modes. Global scope — reads all tenant inventory_items. No price data shown.
**Tables:** stock_take_sessions, stock_take_items, stock_take_schedules, inventory_items (read), stock_movements (write)
**Props:** `<HRStockView tenantId={str} />`
**DO NOT:** Show cost_price, weighted_avg_cost, or sell_price. Auto-apply adjustments — always require manual approval.

---

### `InfoTooltip.js` ✅ BUILT
**File:** `src/components/InfoTooltip.js`
**What it does:** Inline info button. 30+ existing entries.
**Props:** `<InfoTooltip id="po-what-is" />` or `<InfoTooltip title="What?" body="Explanation." />`
**RULE:** Never remove any InfoTooltip instance. Never build another tooltip component.

---

### `PlatformBar.js` ✅ BUILT v1.2 (WP-BIB S11) — LOCKED
**File:** `src/components/PlatformBar.js`
**What it does:** 40px platform intelligence bar. 4 icons: Alerts / Comms / Fraud / Actions. Profile-adaptive ActionsPanel.
**Props:** `<PlatformBar role="admin|hq" tenantId={str} />`
**Critical rules:** LL-041 — onNavigate MUST ALWAYS be `() => {}`. Never pass setTab. Never change font.
**DO NOT:** Pass setTab callbacks. Touch CommsPanel internals. Merge with ProteaAI layer. Edit without explicit owner instruction.

---

### `LiveFXBar.js` ✅ BUILT — PERMANENTLY LOCKED
**File:** `src/components/hq/LiveFXBar.js`
**DO NOT:** Edit under any circumstances. Ever.

---

### `tenantService.js` ✅ BUILT v1.3
**File:** `src/services/tenantService.js`
**useTenant() returns:** tenantId, tenant, allTenants, tenantName, isHQ, switchTenant, tenantConfig, industryProfile, is_operator
**DO NOT:** Create another tenant ID reader. Import from itself (circular import risk).

---

### `usePageContext.js` ✅ BUILT — DO NOT CHANGE SIGNATURE
**File:** `src/hooks/usePageContext.js`
**Usage:** ALWAYS two args: `usePageContext("route-id", null)` — NEVER one arg.

---

### `useTenantConfig.js` ✅ BUILT v1.0
**Returns:** `{ canUseAI, canUseSonnet, dailyLimit, tier }`

---

### `useAIUsage.js` ✅ BUILT v1.0
**Critical:** Pass dailyLimit NUMBER not tenantId string (LL-095).
**Returns:** `{ checkLimit(), logAIUsage(), selectModel(), calculateCost() }`

---

### `useNavConfig.js` ✅ BUILT (updated WP-STOCK-PRO S5 — 3ab7668)
**File:** `src/hooks/useNavConfig.js`
**RULE:** Every new HQDashboard tab needs a matching entry here or the tab is unreachable from nav.

---

### `src/components/viz/` ✅ BUILT — Complete chart library
**Files:** ChartCard, ChartTooltip, BulletChart, DeltaBadge, Icon, InlineProgressBar, PipelineStages, SparkLine, index.js
**Import:** `import { SparkLine, DeltaBadge, ChartCard } from '../viz'`
**DO NOT:** Use default Recharts tooltip — always ChartTooltip. Build new chart primitives.

---

### `HQCogs.js` ✅ BUILT v4.2 — COMPLEX
**File:** `src/components/hq/HQCogs.js`
**What it does:** COGS recipe engine. COMPLETELY SEPARATE from AVCO. Never wire weighted_avg_cost here.
**⚠️ BUG-044:** shipping_alloc_zar stored as fixed ZAR — not live FX. Verify column shipping_alloc_usd exists.
**DO NOT:** Wire weighted_avg_cost into calcCogs (LL-066). Touch without reading entire file — 3000+ lines.

---

### `HQStock.js` ✅ BUILT v3.1 (WP-STOCK-PRO S3) — PROTECTED
**File:** `src/components/hq/HQStock.js`
**Two modes:** food_beverage: tabbed command centre (Overview/Items/Movements). All other profiles: accordion.
**PANEL_CATS_BY_PROFILE:** 5 profile maps. PROTECTED — read full file before any change (LL-180).
**DO NOT:** Use static PANEL_CATS. Show sell price to HR staff.

---

### `ScanResult.js` ✅ BUILT v4.9 — COMPLEX
**File:** `src/pages/ScanResult.js`
**COMPLEX — 1700+ lines.** Profile-adaptive product card (food/general/cannabis).
**DO NOT:** Rewrite this file. Find/replace only. Never touch velocity check (LL-055). Never add tenant_id filter to scan_logs (LL-056).

---

### `process-document` ✅ BUILT v1.9 (WP-FIN S0+S3)
**Type:** Supabase Edge Function
**Deploy:** `npx supabase functions deploy process-document --no-verify-jwt`
**Module-level functions (MUST be outside serve() and try{} — LL-085):**
```typescript
allocateLumpSumCosts(ext, pos)
classifyExpenseDocument(proposed, body)
buildSystemPrompt(suppliers, products, inventory, pos, industryProfile)
```
**Pipeline order:** parse → allocateLumpSum → classifyExpense → dedupGuard → log
**⚠️ NEVER add --verify-jwt on deploy — called from React with anon key.**
**Verify after deploy:** `Select-String -Path index.ts -Pattern "classifyExpense"` (LL-103)
**DO NOT:** Add function declarations inside try{} (LL-085). Add JWT verification. Change pipeline order (LL-104).

---

### `HQDocuments.js` ✅ BUILT v2.4 (WP-FIN S0+S3 — 3d2c262)
**File:** `src/components/hq/HQDocuments.js`
**Action handlers in handleConfirm():**
```
create_purchase_order | receive_delivery_item | update_po_status | update_batch_coa
create_supplier_product | update_po_shipping | create_inventory_item | create_stock_movement
create_expense (WP-FIN S3 — links document_log.expense_id ← expense.id)
```
**Dedup gate (LL-084):** STOCK_ACTIONS blocked if same reference already confirmed.
**DO NOT:** Remove the dedup gate. Add stock actions without checking for duplicates.

---

### `WorkflowGuideContent.js` ✅ BUILT v1.2 (WP-PROD-MASTER D + WP-STOCK-PRO S5)
**File:** `src/components/WorkflowGuideContent.js`
**GUIDE_HQ_PRODUCTION:** Profile-aware for all 4 production profiles.
**GUIDE_HQ_TRANSFERS (v1.2):** 4-step guide.
**DO NOT:** Remove profile branching logic. Merge all profiles into one set of steps.

---

### `HQTenants.js` ✅ BUILT v1.1 (BUG-046 fixed — 7cd80ef)
**File:** `src/components/hq/HQTenants.js`
**Note:** Reads tier from tenant_config (not tenants.tier — always 'starter'). BUG-046 fixed v176.
**Tables:** tenants, tenant_config, tenant_usage_log
**DO NOT:** upsert user_profiles — UPDATE only. Read tier from tenants.tier (always 'starter' — use tenant_config.tier).

---

### `industryProfiles.js` ✅ BUILT v1.0 (WP-IND Session 1)
**File:** `src/constants/industryProfiles.js`
**Functions:** `showCannabisField(profile)` · `showMedicalField(profile)`
**Profiles:** cannabis_retail | cannabis_dispensary | general_retail | food_beverage | mixed_retail
**DO NOT:** Hardcode cannabis logic anywhere else. Always use showCannabisField().

---

# SECTION 3 — SAFE TO BUILD
## Verified absent from disk — not yet implemented

| Feature | WP Ref | What It Is |
|---|---|---|
| BUG-044: HQCogs shipping live FX | — | Verify shipping_alloc_usd column. If missing: ALTER TABLE product_cogs ADD COLUMN shipping_alloc_usd NUMERIC, shipping_units INT. Then ~6 find/replace ops in HQCogs.js only. |
| BUG-043: Stock qty correction (23 terpenes) | — | Physical count required FIRST. Then UPDATE quantity_on_hand per item. Do NOT patch without count. |
| check_reorder() trigger | — | Status UNKNOWN. Verify: SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name LIKE '%reorder%'. If broken: rebuild per WP-REORDER spec. |
| HQ/Admin page charts (20+) | WP-VISUAL | viz library ready, charts not yet added to pages. Spec: WP-VISUAL-SYSTEM_v1.docx |
| HR sub-tabs in TenantPortal People section | — | Wire HRDashboard sub-tabs into People section (est. 30 min) |
| QR print sheet | — | Printable batch QR codes for packaging |
| SaaS Revenue dashboard | — | Platform MRR tile |
| ProteaAI Phase C | WP-AI-UNIFIED | Proactive PlatformBar triggers |
| AdminQRCodes.js inventory_item_id link UI | — | Currently SQL-only |
| loyalty-ai Edge Function | WP-O v2.0 | Nightly cron: 7 jobs (churn rescue, birthday, expiry, streak, stock-boost, tier upgrade, weekly brief). Tables ready. Not yet deployed. |
| create-admin-user Edge Function | — | STATUS UNKNOWN — TenantSetupWizard Step 5 needs it. Verify before building. |
| Batch ID stamping on movements | — | stock_movements.batch_id exists, never populated by any UI path |
| SimplePay API integration | WP-HR-11 ext. | Direct push from HRPayroll.js — decision pending |
| Subdomain routing per client | — | Vercel wildcard config |
| Self-service SaaS onboarding wizard | — | Stripe + auto-provision |
| Stripe SaaS billing | — | Automated subscription management |
| WP-PAY S1 | WP-PAY | Yoco online gateway. BLOCKED on Yoco sk_test_ keys. Orders table needs: yoco_checkout_id, yoco_payment_id, payment_method. tenant_config needs: yoco_secret_key. New table: payments. |
| WP-PAY S2 | WP-PAY | In-store sale recording + reconciliation. Requires S1. |
| WP-PAY S3 | WP-PAY | POS via Yoco in-person SDK. Android/iOS NATIVE only. Requires Yoco partner approval first. |
| WP-SMART-CATALOG SC-01 | WP-SMART-CATALOG | Stats KPI Cards + action panels (Sold Out, Below Reorder, No Price). SmartInventory.js is foundation. |
| WP-REORDER | WP-REORDER | Smart reorder queue slide-out from Smart Catalog. Groups by supplier → draft POs. Requires SC-01 first. |
| WP-STOCK-RECEIVE-S3 | WP-STOCK-RECEIVE-S3 | Product World Item Picker for receive delivery modal. ProductWorlds.js as single source of truth. |
| WP-STOCK-MERGE | WP-STOCK-MERGE | Merge Smart Catalog into HQStock nav as a tab. AFTER SC-01–SC-10 complete. |
| CLAUDE.md in repo root | — | Claude Code reads this before every task — add critical SESSION-CORE rules here |
| ProteaAI CODEBASE_FACTS update | — | String is stale (says "Vercel deploy pending"). Owner must update. Search: const CODEBASE_FACTS |
| Medi Rec sell prices | — | 182 SKUs at R0. Gates shop, P&L, loyalty. Owner must set via HQPricing. |
| Supabase backups | — | Enable via Settings → Add-ons. URGENT — no backups currently running. |

---

# SECTION 4 — DEAD CODE
## Deprecated — never write to, never import in new components

| What | Why Dead | Use Instead |
|---|---|---|
| `products` table | Orphaned legacy | `inventory_items` |
| `inventory` table | Orphaned legacy | `inventory_items` |
| `scans` table | Orphaned legacy | `scan_logs` |
| `production_batches` table | Orphaned legacy | `batches` |
| `production_inputs` table | Orphaned legacy | `production_run_inputs` |
| `CoPilot.js` | Deleted WP-AI-UNIFIED | `ProteaAI.js` |
| `AIAssist.js` | Deleted WP-AI-UNIFIED | `ProteaAI.js` |
| `AlertsBar.js` | Deleted WP-AI-UNIFIED | `PlatformBar.js` |
| `SystemStatusBar.js` | Deleted WP-AI-UNIFIED | `PlatformBar.js` |
| `AnimatedAICharacter.js` | Superseded | `AIOrb.js` + `LottieCharacter.js` |
| `FORMAT_CATALOGUE` in HQProduction.js | Stale constant | `product_formats` table |
| `STRAIN_OPTIONS` in HQProduction.js | Stale constant | `product_strains` table |
| `systemHealthContext.js` — `scans` queries | Uses legacy table | Needs migration to `scan_logs` |
| `systemHealthContext.js` — `production_batches` | Uses legacy table | Needs migration to `batches` |

---

# SECTION 5 — DUPLICATION POSTMORTEM
## Every confirmed duplicate — logged so it never repeats

| Session | What was duplicated | Root cause | Lesson |
|---|---|---|---|
| v84 | Built AIAssist.js — CoPilot.js v3.0 already existed | MANIFEST not read | LL-018 |
| v84 | Wrote 274-line SESSION.md without reading 526-line version | Doc overwritten | LL-021 |
| v86 | 5+ attempts to remove inline alert banners without reading AdminDashboard.js | Assumed state | LL-026 |
| v86 | WP-Z health check designed from scratch — systemHealthContext.js existed | Not in index | THIS REGISTRY |
| v109 | HQDashboard import + render added twice | No file read before wiring | LL-074 |
| v111 | Planned to rebuild entire WP-HR (12 sub-packages) — all already built | Session docs said "10 pending" | LL-075 |
| S8 | OP1 find string matched tenantService.js instead of ScanResult.js | Find string too generic | BUG-039 |
| S9 | FoodShopCard crashed allergens.length — allergen_flags was null | Missing null guard | BUG-040 |
| S11 | CommsPanel corrupted by duplicate expiring blocks | Multiple incremental patches | BUG-041 |
| v127 | REGISTRY.md Section 2 dropped 26 component signatures | Truncated read | LL-083 |
| v129 | process-document allocateLumpSumCosts inside try{} — Deno syntax error | Function in try block | LL-085 |
| v129 | PQG2600182 ingested 3× — 57 movements, unit_cost null, quantities tripled | No dedup check | LL-084 |
| v130 | HQCogs LandedCostCalc shipping never saved — Apply button required | child useState invisible to parent | useEffect auto-apply |
| v131 | HQStock PANEL_CATS static — food panel empty | PANEL_CATS cannabis-only | PANEL_CATS_BY_PROFILE |
| v131 | BUG-042: HQTenants industry_profile save silent fail | 3 root causes | 3 targeted fixes |
| v132-133 | product_format_bom INSERT 403 Forbidden — no RLS policies | Table created without policies | LL-089 |
| v132-133 | BOMEditorPanel dropdown blank — used f.name but column is f.label | DB column not verified | LL-089 |
| v141+ | Planned WP-FNB as new work — all 8 sessions already complete | Session docs not in project knowledge | LL-075 |
| v146 | invoked customer_id on invoices table — column does not exist | Column not verified before use | LL-116 |
| v146 | Used reference column on invoices — column does not exist | Column not verified before use | LL-116 |
| v146 | Called reserve_stock() — function did not exist yet | DB function not verified before call | LL-117 |
| v177 | SmartInventory column drag-drop silently failed on every attempt | setColOrder callback read dragCol.current after it was nulled on the same line. dataTransfer not used as backup data source. | Use dataTransfer.setData/getData — capture sourceKey in local var before any ref mutation. (f6b065f) |
| v176-v177 | SESSION-BUGS showed BUG-045/046/047 as OPEN when all three CLOSED in v176 | Bugs resolved but SESSION-BUGS not updated same session | Update SESSION-BUGS immediately when a bug is resolved. Never leave open bugs unresolved in docs. |

---

# SECTION 6 — MANDATORY RULES

```
BEFORE WRITING ANY CODE:

STEP 0: Read REGISTRY.md Section 1 (Feature Index).
        Found it? READ THAT FILE FIRST. Do not build.

STEP 1: Read MANIFEST.md — check filename inventory.

STEP 2: Scan actual disk files:
        Get-ChildItem src\components\hq\ | Select-Object Name
        Get-Content src\components\hq\FILENAME.js | Select-Object -First 3
        If file exists and docs say pending -> docs are wrong (LL-075). Update docs.

STEP 3: Read the specific file before touching it (git show HEAD:FILE | Out-File temp.txt).

STEP 4: Find/replace only. Never full rewrites.

STEP 5: After building, ADD to REGISTRY.md Section 1 + Section 2.
        ADD to MANIFEST.md.
        UPDATE SESSION-STATE.md WP status.
        This is not optional.

BEFORE UPDATING THIS DOCUMENT (LL-083):
  1. View the complete file — use view_range to read ALL sections if truncated.
  2. Note the line count of the source.
  3. New version MUST be >= previous line count.
  4. A shorter output = data loss = hard failure. Revert and re-read.
```

---

# SECTION 7 — KEEPING THIS DOCUMENT CURRENT

After every build session:
1. Add row to Section 1 — "If you want to... -> file"
2. Add Section 2 entry — file path, version, what it does, props, DB tables, DO NOT rules
3. If deprecated: move to Section 4
4. If duplication happened: add to Section 5
5. If docs were wrong about disk state: add to Section 5 + note LL-075

**This document + MANIFEST.md are THE SOURCES OF TRUTH for what exists.**
Both must be read before any build. This one first.

---

*REGISTRY.md v3.2 · NuAi · April 4, 2026*
*v3.1: SmartInventory v1.5 · HQTradingDashboard v3.0 · EODCashUp v1.0 · POSScreen v1.0 · HQBalanceSheet v1.0 added*
*v3.2: Section 3 corrected (completed items removed, new pending items added) · Section 5 two new postmortem rows*
*One lookup. Every session. Before everything else.*
*LL-075: Session docs can lie. Disk never does. Always verify.*
*LL-083: Truncated reads drop data silently. Always confirm line count before updating.*
*LL-089: product_formats column is label NOT name. Always verify DB column names before use.*
*LL-116: invoices uses supplier_id for ALL partners, invoice_number not reference.*
