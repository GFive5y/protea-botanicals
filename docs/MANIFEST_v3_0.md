# MANIFEST.md
## Protea Botanicals — Complete File Inventory
## Version: v3.0 · Updated: March 27, 2026
## Source: v2.9 base · Updated for WP-FNB S1-S8, WP-AI-UNIFIED, WP-TENANT S3, WP-FIN S1-S4

---

> ## ══════════════════════════════════════════════════════
> ## ⚠️ MANDATORY READ RULE — APPLIES TO THIS DOCUMENT ITSELF
> ## ══════════════════════════════════════════════════════
>
> **BEFORE UPDATING THIS FILE:**
> You MUST read the complete current file first — ALL sections, ALL lines.
> If you cannot confirm you have read every line — you cannot update it.
> Confirm line count before and after. A shorter output = data loss = hard failure.
> Revert and re-read if that happens.
>
> ══════════════════════════════════════════════════════════════

> RULE 0: Read this before building anything.
> ✅ = built and confirmed working
> ⚠️ = built but complex — read entire file before touching
> 🔜 = planned, not yet built
> ? = exists but internal state unknown — read before touching
> ❌ DEAD = file exists but is deprecated — do not write to it
>
> LL-075 RULE: If this document says 🔜 but the file exists on disk —
> THE FILE IS THE TRUTH. Update this doc. Do not rebuild.
> Always verify: Get-Content src\components\hq\FILENAME.js | Select-Object -First 3

---

## src/pages/ — Route-level page components

| File | What It Does | Version | State |
|---|---|---|---|
| App.js | Router, RoleContext provider, all route definitions. /tenant-portal route added WP-TENANT S3. Smart login redirect: is_operator→/hq, management→/tenant-portal. | v6.4 | ✅ LOCKED |
| HQDashboard.js | HQ shell — 21+ tabs, full ERP command centre. Transfers tab added S5. VIEWING dropdown navigates portals (WP-TENANT S3). WP-FNB S8: Food Intelligence tab wired. | v4.3 | ⚠️ READ BEFORE TOUCHING |
| TenantPortal.js | Client-facing tenant portal — SmartBar waterfall sidebar (7 sections). Manufacturer/distributor model. Pure Premium scoped. Back button → /hq. | v2.1 | ✅ WP-TENANT S3 |
| HRDashboard.js | HR portal shell — 13-tab container + Stock tab (WP-STOCK-PRO S4). Route: /hr | v1.3 | ✅ WP-STOCK-PRO S4 (063f7dc) |
| AdminDashboard.js | Admin portal shell — 12+ tabs, commsBadge, realtime alerts. AIAssist removed WP-AI-UNIFIED. | v6.7 | ⚠️ READ BEFORE TOUCHING |
| StaffPortal.js | Staff self-service portal. Route: /staff | v1.0 | ✅ |
| ScanResult.js | QR scan result — profile-adaptive FoodProductCard / GeneralProductCard / ProductCard. COMPLEX v4.8. Velocity check + anomaly write-back. Read ALL before touching. | v4.8 | ⚠️ COMPLEX — WP-BIB S8 complete |
| CheckoutPage.js | Customer checkout — available_qty guard, PayFast, loyalty points | v2.4 | ⚠️ READ BEFORE TOUCHING |
| Shop.js | Customer shop — profile-adaptive: FoodShopCard / GeneralShopCard / VapeCard. fetchProducts depends on industryProfile. | v4.4 | ⚠️ READ BEFORE TOUCHING — WP-BIB S9 complete |
| AdminAnalytics.js | Admin scan analytics — profile-adaptive since S12. useTenant() at root. | v2.2+S12 | ✅ WP-BIB S12 (90530b9) |
| AdminQrGenerator.js | QR code generator page | — | ? |
| Account.js | Customer account page. Smart login redirect added WP-TENANT S3. | v6.4 | ? |
| CartPage.js | Shopping cart | — | ? |
| Landing.js | Public landing page | — | ? |
| Leaderboard.js | Public loyalty leaderboard | — | ? |
| Loyalty.js | Customer loyalty page | — | ? |
| MoleculesPage.js | Cannabinoid molecules educational page | — | ? |
| NotFound.js | 404 page | — | ? |
| OrderSuccess.js | Post-checkout success, loyalty points confirmation | — | ? |
| ProductVerification.js | Product authenticity verification | — | ? |
| Redeem.js | Points redemption page | — | ? |
| ScanPage.js | QR scan entry point | — | ? |
| ShopDashboard.js | Shop management dashboard | — | ? |
| TerpenePage.js | Terpenes educational page | — | ? |
| Welcome.js | Welcome/onboarding page | — | ? |
| WholesalePortal.js | Wholesale partner portal — writes wholesale_order alert | — | ✅ |

---

## src/components/hq/ — HQ dashboard + HR tier components
## NOTE: ALL HR files live here — NOT in src/components/hr/ (that path does not exist)

| File | What It Does | Version | State |
|---|---|---|---|
| HQAnalytics.js | HQ analytics — 6 sub-tabs. Profile-adaptive since S12. useTenant() at root. Cannabis unchanged. | v4.3+S12 | ✅ WP-BIB S12 (90530b9) |
| GeoAnalyticsDashboard.js | Geo intelligence — province, city, retailers, acquisition, churn, demand gaps. Inter font (Jost/Cormorant removed). | v1.0+font | ✅ font fix (5566001) |
| HQCogs.js | COGS recipes — SEPARATE engine from AVCO. Never wire weighted_avg_cost here. LandedCostCalc auto-applies shipping on input (v130). ⚠️ BUG-044: verify shipping_alloc_usd column exists. | v4.1+shipping | ⚠️ COMPLEX. READ BEFORE TOUCHING |
| HQDocuments.js | Document vault — AI extraction, review screen. WP-FIN S0: dedup gate (LL-084), unit_cost_zar on confirm. WP-FIN S3: create_expense handler + amber badge. | v2.4 | ✅ WP-FIN S0+S3 (3d2c262) |
| HQFraud.js | HQ fraud — cross-tenant anomaly, POPIA tracking | v2.0 | ✅ |
| HQInvoices.js | Invoice list, aged debtors panel (0/30/60/90+ day buckets per dispensary), status pipeline, payment recording. LL-116: supplier_id for all partners, invoice_number not reference. | v2.0 | ✅ WP-FIN S4 |
| HQLoyalty.js | 7-tab loyalty engine config — earning rates, tiers, redemption, referral | — | ⚠️ COMPLEX. READ BEFORE TOUCHING |
| HQMedical.js | Medical dispensary — patients, prescriptions, SAHPRA reports. Gated. | v1.0 | ✅ GATED |
| HQOverview.js | HQ overview dashboard — live tiles, realtime subs | v2.0 | ✅ |
| HQPricing.js | Pricing and margin — profile-adaptive since S13. | v4.1+S13 | ✅ WP-BIB S13 (40468c8) |
| HQProduction.js | Full production engine — all 5 industry profiles. food_beverage recipe form, 14-allergen SA R638, QC gate, yield%, FSCA/HACCP, lot#, temp zone badge, FEFO BOM picker, AVCO write-back, recipe version history, food KPI stat strip. general_retail receive form. mixed_retail per-row type badge. Profile-adaptive SUB_TABS, banners, OverviewPanel KPIs. food fields on production_runs ONLY (LL-086). Formats + BOMEditorPanel + RecipeCostCalculator. SUB_TABS: overview, batches, new-run, history, allocate, formats, bom, audit. | v3.5 | ⚠️ COMPLEX. READ BEFORE TOUCHING — WP-PROD-MASTER A–E (e91c7c7) |
| HQProfitLoss.js | Live P&L — actual COGS from production_out movements × AVCO, wholesale revenue from sale_out × sell_price, DB-backed OPEX from expenses table, CAPEX memo. "+ Manage Expenses" button → ExpenseManager modal. | v3.2 | ✅ WP-FIN S1+S2+S4 |
| ExpenseManager.js | Full expense CRUD — List, Add/Edit, Bulk Import (CSV), Export. Categories: opex/wages/capex/tax/other. Foreign currency. tenant_id REQUIRED on every INSERT. | v1.0 | ✅ WP-FIN S1 |
| HQPurchaseOrders.js | Import ERP — FX-aware POs, landed cost, receive→inventory | v2.1 | ✅ |
| HQReorderScoring.js | Reorder scoring, procurement triggers | — | ✅ |
| HQStock.js | HQ stock intelligence — profile-adaptive. food_beverage: tabbed command centre (Overview/Items/Movements). All other profiles: accordion with Edit/Adjust/+Add Item. PANEL_CATS_BY_PROFILE — 5 profile maps. | v3.0 | ✅ WP-STOCK-PRO S3 (cf2ac53) |
| HQSuppliers.js | Supplier management | — | ✅ |
| HQTenants.js | Tenant management — TenantSetupWizard wired. industry_profile saves correctly (BUG-042 resolved). Profile save still needs Ctrl+Shift+R. | v1.1+BUG-042 | ✅ BUG-042 RESOLVED (264a5cb) |
| HQTransfer.js | HQ→Shop transfer orders. draft→in_transit→received lifecycle. Ship deducts HQ stock + transfer_out movement. Receive adds shop stock + transfer_in movement. Auto-creates shop item if not found (sell_price=0, LL-024). Cancel in_transit reverses HQ deduction. 4 sub-tabs: Overview / New Transfer / Active / History. Reference: TRF-YYYYMMDD-XXXX (UNIQUE). | v1.0 | ✅ WP-STOCK-PRO S5 (c617f55) |
| HQWholesaleOrders.js | B2B wholesale orders — Draft/Confirm/Ship/Cancel reservation flow. v2.0: SAGE-style invoice modal (dark green toolbar, Print/Save PDF/Email), auto-generates invoice on ship. LL-115: stock_reservations uses inventory_item_id, quantity_reserved. LL-116: invoices uses supplier_id, invoice_number. | v2.0 | ✅ WP-FIN S4 |
| TenantSetupWizard.js | 5-step Business in a Box onboarding — Identity / Industry / Tier+Flags / Catalogue / Admin user | v1.0 | ✅ WP-BIB S7 (2d01a40) |
| StockAIAnalysis.js | AI stock intelligence drawer — profile-adaptive system prompt. Now routes through ProteaAI. | v1.0 | ✅ WP-BIB S6 (ec28500) |
| Distribution.js | Wholesale distribution, shipments (HQ level) | — | ✅ |
| RetailerHealth.js | Retailer health score, partner analytics | — | ✅ |
| LiveFXBar.js | Live FX rate bar — USD/ZAR, EUR/ZAR, GBP/ZAR | — | ✅ LOCKED — NEVER EDIT |
| ShopManager.js | Shop management within HQ | — | ? |
| SupplyChain.js | Supply chain tab | — | ✅ |
| HRCalendar.js | HR calendar — 13 event layers, month/week/team views, iCal export, SA public holidays | v1.2 | ✅ WP-HR-8 |
| HRComms.js | Staff communications — inbox, broadcasts, formal notices, acknowledgement tracking | v1.1 | ✅ WP-HR-7 |
| HRContracts.js | Employment contracts — HTML→PDF generator, template library | v1.0 | ✅ WP-HR-5 |
| HRDisciplinary.js | Disciplinary records — warning letters, hearings, appeal workflow | v1.1 | ✅ WP-HR-6 |
| HRLeave.js | Leave management — requests, balances, approval queue, conflict checker | v1.0 | ✅ WP-HR-3 |
| HRLoans.js | HR loans, stipends, travel allowances — repayment log, balance tracker | v1.1 | ✅ WP-HR-9 |
| HRPayroll.js | Payroll export — period selector, validation, SimplePay-compatible CSV | v1.1 | ✅ WP-HR-11 |
| HRPerformance.js | Performance reviews — KPI form, PIP tracker, goal setting | v1.1 | ✅ WP-HR-10 |
| HRSettings.js | HR settings — leave types, work hours, public holidays, warning templates | v1.1 | ✅ WP-HR-5 |
| HRStaffDirectory.js | Staff directory — search, filter by dept/type/status, export to CSV | v1.0 | ✅ WP-HR-2 |
| HRStaffProfile.js | Single employee deep-view — all records, documents, history | v1.1 | ✅ WP-HR-3 |
| HRStockView.js | HR stock management + stock take system. 6 tabs: Overview / Schedule & Config / New Count / Live Count / Review & Approve / History. Blind/guided modes. Global scope — all tenant inventory_items. No price data shown. | v1.0 | ✅ WP-STOCK-PRO S4 (063f7dc) |
| HRTimesheets.js | Timesheets — batch approve, export, late analysis, QR clock-in support | v1.0 | ✅ WP-HR-4 |
| HQFoodIngredients.js | Ingredient encyclopedia — 121 seeded SA ingredients, DAFF nutrition JSONB, HACCP risk, allergen flags, temp zone, shelf life. | v1.0 | ✅ WP-FNB S1 (5082 lines) |
| HQRecipeEngine.js | Recipe BOM engine — allergen auto-propagation, nutrition per serve, cost per unit. NEVER nested select food_recipe_lines (LL-090). Strip food_recipe_lines from UPDATE payload (LL-091). | v1.0 | ✅ WP-FNB S2 (1075 lines) |
| HQHaccp.js | HACCP digital control point system — CCP log, NCR auto-raise, PlatformBar deviation alert. | v1.0 | ✅ WP-FNB S3 (1031 lines) |
| HQFoodSafety.js | Food safety certificate vault — cert expiry fires PlatformBar alerts (critical/warning/info). | v1.0 | ✅ WP-FNB S4 (632 lines) |
| HQNutritionLabel.js | SA R638 nutritional label generator. Reads from food_recipes. | v1.0 | ✅ WP-FNB S5 (590 lines) |
| HQColdChain.js | Cold chain temperature monitoring — breach detection, PlatformBar alert, affected_lots[]. | v1.0 | ✅ WP-FNB S6 (798 lines) |
| HQRecall.js | Product recall + lot traceability — forward/backward trace, FSCA letter generator. | v1.0 | ✅ WP-FNB S7 (791 lines) |
| HQFoodIntelligence.js | Food intelligence dashboard — allergen risk, compliance score, waste, cost trends, cold chain health, recall readiness. Pure S1-S7 aggregation, no new tables. | v1.0 | ✅ WP-FNB S8 |

---

## src/components/ — Admin + Shared components

| File | What It Does | Version | State |
|---|---|---|---|
| ProteaAI.js | ⚠️ UNIFIED AI PANEL. 3 tabs: Chat / Query / Dev. Tab-aware, streaming. Suggested questions per tab. Uses ai-copilot Edge Fn. useAIUsage(dailyLimit NUMBER — LL-095). NavSidebar must NOT close on nav (LL-097). | v1.4 | ✅ WP-AI-UNIFIED (edf9a5c) — THE ONE AI ENTRY POINT |
| DevErrorCapture.js | React error boundary (class component) + console.error interceptor. Populates ProteaAI Dev tab. Mounted in AppShell. | v1.0 | ✅ WP-AI-UNIFIED |
| WorkflowGuide.js | ⚠️ Contextual onboarding, dismissable (localStorage). In ALL HQ tabs. DO NOT REMOVE. | v2.0 | ✅ |
| WorkflowGuideContent.js | Guide text per tab — GUIDE_HQ_PRODUCTION profile-aware (all 4 profiles). GUIDE_HQ_TRANSFERS (4 steps). | v1.2 | ✅ WP-STOCK-PRO S5 (420fb8f) |
| PlatformBar.js | Platform intelligence bar — profile-adaptive actions panel. onNavigate = () => {} ALWAYS (LL-041). | v1.2 | ✅ WP-BIB S11 (f7474ca) |
| StockControl.js | Admin stock — expandable rows, StockItemExpandedCard, AI Analyse button, React.Fragment rows | v2.4 | ✅ WP-BIB S6 (82043cc) |
| StockItemModal.js | Category-adaptive stock item slide-in modal. 14-allergen SA R638, allergen text generator + clipboard, temperature_zone, batch_lot_number, country_of_origin, reorder_qty, 13 unit options. Used by Admin StockControl AND HQStock. | v1.1 | ✅ WP-STOCK-PRO S3 (bf529ca) |
| AIOrb.js | Canvas-based animated AI orb — active: spinning arc, idle: ripple | v2.1 | ✅ |
| AdminBatchManager.js | Batch CRUD, tenant_id fix applied | — | ✅ |
| AdminCommsCenter.js | Customer comms + support tickets — thread view, reply | v1.1 | ✅ |
| AdminCustomerEngagement.js | Customer 360, engagement score, churn risk | — | ✅ |
| AdminFraudSecurity.js | Fraud flags, anomaly score, alerts banner | — | ✅ |
| AdminHRPanel.js | HR panel in Admin context — team-scoped (reports_to = current admin) | — | ✅ |
| AdminNotifications.js | SMS/WhatsApp notification log | — | ✅ |
| AdminProductionModule.js | Admin production view | — | ? |
| AdminQRCodes.js | QR code generation, bulk create, pool status — ⚠️ needs inventory_item_id link UI (backlog) | v2.4+ | ✅ |
| AdminQrList.js | QR code list view | — | ? |
| AdminShipments.js | Shipment tracking, status pipeline | — | ✅ |
| AdminSupportPanel.js | Support panel — may be superseded by AdminCommsCenter | — | ? |
| AgeGate.js | Age verification gate | — | ✅ |
| AnimatedAICharacter.js | Animated AI character | — | ❌ SUPERSEDED by AIOrb + LottieCharacter |
| AppShell.js | App shell wrapper — DevErrorCapture wraps all authenticated routes (WP-AI-UNIFIED). | v1.3 | ✅ |
| CBDMolecule.js | CBD molecule 3D component | — | ✅ |
| CBGMolecule.js | CBG molecule 3D component | — | ✅ |
| CBNMolecule.js | CBN molecule 3D component | — | ✅ |
| ClientHeader.js | Customer-facing header with live loyalty points badge | — | ⚠️ READ BEFORE TOUCHING |
| CustomerInbox.js | Customer in-app inbox, realtime sub inbox-{userId} | — | ⚠️ READ BEFORE TOUCHING |
| CustomerSupportWidget.js | Customer support widget | — | ? |
| Delta10THCMolecule.js | Delta-10 THC molecule component | — | ✅ |
| Delta8THCMolecule.js | Delta-8 THC molecule component | — | ✅ |
| Delta9THCMolecule.js | Delta-9 THC molecule component | — | ✅ |
| InfoTooltip.js | ⚠️ Inline tooltip — 30+ entries. NEVER remove any instance. NEVER build another tooltip. | — | ✅ NEVER REMOVE |
| LottieCharacter.js | Animated Lottie bot | — | ✅ |
| LoyaltyBadges.js | Customer loyalty milestone badges | — | ? |
| MoleculeCarousel.js | Cannabinoid molecule carousel | — | ✅ |
| MoleculeModal.js | Molecule detail modal | — | ? |
| MoleculePulse.js | Molecule pulse animation | — | ? |
| NavSidebar.js | Navigation sidebar — grouped, role-aware. ✦ button at bottom opens ProteaAI. handleNav must NOT call setAiOpen(false) (LL-097). | — | ✅ |
| NavSidebar.css | .ai-pane slide-out + .nav-ai-btn styles | — | ✅ WP-AI-UNIFIED |
| PageShell.js | Page wrapper/shell component | — | ? |
| ProfileCompletion.js | Customer profile completion prompt | — | ? |
| PromoBanner.js | Promotional banner | — | ? |
| SurveyWidget.js | 5th-scan survey widget | — | ✅ |
| TerpeneCarousel.js | Terpene carousel | — | ? |
| TerpeneModal.js | Terpene detail modal | — | ? |
| THCaMolecule.js | THCa molecule component | — | ✅ |
| AlertsBar.js | Real-time alerts bar | — | ❌ DELETED WP-AI-UNIFIED — DO NOT IMPORT |
| SystemStatusBar.js | System health status bar | — | ❌ DELETED WP-AI-UNIFIED — DO NOT IMPORT |
| CoPilot.js | Global AI assistant | — | ❌ DELETED WP-AI-UNIFIED — DO NOT IMPORT |
| AIAssist.js | Tab-level AI drawer | — | ❌ DELETED WP-AI-UNIFIED — DO NOT IMPORT |

---

## src/components/shop/ — Shop sub-components

| File | What It Does | State |
|---|---|---|
| ShopAnalytics.js | Shop-level analytics | ? |
| ShopInventory.js | Shop inventory management | ? |
| ShopOverview.js | Shop overview dashboard | ? |
| ShopSettings.js | Shop settings | ? |

---

## src/components/viz/ — Shared chart library (ALL COMPLETE)

| File | What It Does | State |
|---|---|---|
| ChartCard.js | Chart wrapper card | ✅ |
| ChartTooltip.js | Custom chart tooltip — always use this, never default Recharts | ✅ |
| BulletChart.js | Bullet chart | ✅ |
| DeltaBadge.js | Delta/change badge | ✅ |
| Icon.js | Icon system | ✅ |
| InlineProgressBar.js | Progress bar | ✅ |
| PipelineStages.js | Pipeline stage display | ✅ |
| SparkLine.js | Sparkline chart | ✅ |
| index.js | Barrel export — `import { SparkLine, DeltaBadge, ChartCard } from '../viz'` | ✅ |

---

## src/constants/

| File | What It Does | Version | State |
|---|---|---|---|
| industryProfiles.js | Industry profile constants + showCannabisField() + showMedicalField() — 5 profiles | v1.0 | ✅ |

---

## src/hooks/

| File | What It Does | State |
|---|---|---|
| usePageContext.js | ⚠️ Tab context for WorkflowGuide + ProteaAI. ALWAYS two args: usePageContext("id", null). | ✅ DO NOT CHANGE SIGNATURE |
| useNavConfig.js | Navigation configuration hook — groups, icons, paths. S5: Transfers entry added. FNB S1-S8: Food & Bev group added. | ✅ WP-STOCK-PRO S5 + WP-FNB |
| useTenantConfig.js | Reads tenant_config feature flags. Returns: canUseAI, canUseSonnet, dailyLimit, tier. | ✅ |
| useAIUsage.js | Daily AI usage counter. ⚠️ Pass dailyLimit NUMBER not tenantId (LL-095). | ✅ |

---

## src/services/

| File | What It Does | State |
|---|---|---|
| supabaseClient.js | ⚠️ LOCKED. Never edit. | ✅ LOCKED |
| copilotService.js | ⚠️ CoPilot API calls, script engine, context compression. LOCKED. | ✅ LOCKED |
| scanService.js | QR scan processing, points award logic | ✅ READ BEFORE TOUCHING |
| tenantService.js | useTenant() — tenantId, tenant, tenantConfig, industryProfile, is_operator (v1.3). | v1.3 | ✅ |
| systemHealthContext.js | System health context provider — realtime subs on 8 tables | ? |
| geoService.js | Geolocation services | ? |
| notificationService.js | Notification dispatch (SMS/WhatsApp) | ? |

---

## src/contexts/

| File | What It Does | State |
|---|---|---|
| CartContext.js | Shopping cart state context | ✅ |

---

## src/styles/

| File | What It Does | State |
|---|---|---|
| tokens.js | Design tokens | ? |
| theme.js (src root) | LOCKED. NESTED T.ink[900]. Never flatten. | ✅ LOCKED |

---

## Supabase Edge Functions

| Function | What It Does | Version | State |
|---|---|---|---|
| ai-copilot | Powers ProteaAI.js. Claude Sonnet. | v3.0 | ✅ LIVE |
| get-fx-rate | USD/ZAR live FX, 60s cache. Fallback R18.50. | — | ✅ LIVE |
| sign-qr | HMAC-signs QR codes. ⚠️ JWT verify MUST be disabled after every redeploy. | — | ✅ LIVE — CRITICAL RULE |
| process-document | AI document ingestion — lump-sum cost allocation (WP-FIN S0), CAPEX/OPEX classification (WP-FIN S3), duplicate invoice detection. v1.9. All helpers at module level (LL-085). | v1.9 | ✅ LIVE (--no-verify-jwt) |
| create-admin-user | Creates Supabase Auth user + user_profiles row | — | ⚠️ STATUS UNKNOWN — TenantSetupWizard Step 5 needs it |

---

## Database Tables — Active (canonical)

| Table | Key Notes | State |
|---|---|---|
| tenants | industry_profile drives ALL profile-adaptive UI. HQ tenant = operator profile (43b34c33). Pure Premium = cannabis_retail (f8ff8d07). BUG-042 RESOLVED. | ✅ |
| user_profiles | hq_access, role, tenant_id, is_operator, loyalty_points, anomaly_score. UPDATE only — never upsert. | ✅ |
| tenant_config | 7 feature flags per tenant | ✅ |
| tenant_usage_log | Per-tenant usage metrics | ✅ |
| inventory_items | allergen_flags (JSONB 14-key R638) · shelf_life_days · expiry_date · reserved_qty · weighted_avg_cost · temperature_zone · batch_lot_number · country_of_origin · reorder_qty · ⚠️ BUG-043: 23 terpenes qty inflated — physical count required | ✅ |
| stock_movements | movement_type, unit_cost (NOT unit_cost_zar — LL-111). AVCO trigger on INSERT. Types: purchase_in, production_out, production_in, sale_out, transfer_out, transfer_in, stock_take_adjustment. | ✅ |
| stock_reservations | Soft holds — inventory_item_id (NOT item_id), quantity_reserved (NOT quantity), reserved_by (LL-115). Does NOT trigger AVCO. | ✅ |
| stock_transfers | Transfer order header — from_tenant_id, to_tenant_id, status (draft/in_transit/received/cancelled), reference (UNIQUE), shipped_at, received_at. | ✅ WP-STOCK-PRO S5 |
| stock_transfer_items | Transfer lines — qty_requested, qty_confirmed, unit_cost_zar at time of ship. CASCADE on transfer delete. | ✅ WP-STOCK-PRO S5 |
| stock_take_sessions | Stock take container — tenant_id, title, schedule_type, count_mode, status | ✅ WP-STOCK-PRO S4 |
| stock_take_items | Per-item count lines — system_qty snapshot, counted_qty, variance, variance_pct, adjustment_applied | ✅ WP-STOCK-PRO S4 |
| stock_take_schedules | Per-tenant schedule — frequency, next_due, reminder_days, category_thresholds JSONB | ✅ WP-STOCK-PRO S4 |
| batches | NO created_at. ORDER BY production_date. NO food fields — food data on production_runs only (LL-086). | ✅ |
| production_runs | 31 columns. All food fields here: recipe_name, recipe_version, batch_lot_number, storage_instructions, expiry_date, temperature_zone, allergen_flags, qc_passed, yield_pct, cost_per_unit, industry_profile_snapshot, etc. | ✅ |
| production_run_inputs | Materials consumed per run | ✅ |
| product_formats | label (NOT name — LL-089). is_cannabis must be set for all cannabis formats (LL-088). | ✅ |
| product_strains | Strain catalogue | ✅ |
| product_format_bom | BOM per format — quantity_per_unit, tenant_id. RLS policies in place. | ✅ |
| product_cogs | COGS recipes — HQCogs engine only. tenant_id REQUIRED (LL-100). ⚠️ BUG-044: verify shipping_alloc_usd column exists. | ✅ |
| supplier_products | Hardware + terpene USD prices — HQCogs engine only | ✅ |
| local_inputs | Distillate + packaging in ZAR — HQCogs engine only | ✅ |
| purchase_orders | subtotal = foreign currency. landed_cost_zar = ZAR (LL-082). | ✅ |
| purchase_order_items | FK = po_id (NOT purchase_order_id — LL-007) | ✅ |
| suppliers | Supplier directory. Stays under HQ tenant (LL-107). | ✅ |
| document_log | AI document ingestion records — dedup gate uses this. expense_id column links to expenses. +9 food safety columns (food_doc_type, cert_expiry_date, etc.) | ✅ |
| expenses | tenant_id REQUIRED. category: opex/wages/capex/tax/other. amount_zar always ZAR equivalent. | ✅ WP-FIN S1 |
| scan_logs | NO tenant_id column (LL-056). NEVER filter by tenant. NEVER add column. | ✅ |
| qr_codes | inventory_item_id UUID — links to inventory_items for food/general profile QR cards | ✅ |
| invoices | supplier_id for ALL partners (no customer_id — LL-116). invoice_number is the reference string (no reference column — LL-116). Status: draft/pending/paid/overdue. | ✅ WP-FIN S4 |
| invoice_line_items | Linked to invoices | ✅ |
| orders | total (NOT total_amount — LL-006) | ✅ |
| wholesale_partners | business_name (NOT name — LL-009). No is_active column. | ✅ |
| wholesale_orders | B2B order header | ✅ |
| customer_messages | body (NOT content — LL-003). read_at = TIMESTAMPTZ (NOT boolean). | ✅ |
| ticket_messages | content (NOT body — LL-004) | ✅ |
| loyalty_transactions | created_at (NOT transaction_date). points (NOT points_change). type ILIKE 'earned' (LL-077). | ✅ |
| loyalty_config | NO updated_at column (LL-001). | ✅ |
| system_alerts | id = UUID — use self-join DELETE for dedup (LL-027). alert_type values: food_cert_expiry, cold_chain_breach, product_recall. No updated_at (LL-094). | ✅ |
| ai_usage_log | Daily AI call log per tenant | ✅ |
| user_profiles | hq_access, role, tenant_id. UPDATE only — never upsert. | ✅ |

---

## Food & Beverage Database Tables (WP-FNB S1-S7)

| Table | Key Notes | State |
|---|---|---|
| food_ingredients | 121 seeded SA ingredients. allergens JSONB (14-key), DAFF nutrition JSONB, haccp_risk_level, shelf_life_days, temp_zone, storage_instructions. | ✅ WP-FNB S1 |
| food_recipes | Recipe master — allergens JSONB, nutrition_per_serve JSONB, cost_per_unit. | ✅ WP-FNB S2 |
| food_recipe_lines | BOM lines — ingredient_id FK, qty, unit, notes, is_optional. NEVER nested select from food_recipes (LL-090). Strip from UPDATE payload (LL-091). | ✅ WP-FNB S2 |
| food_recipe_versions | Version snapshots — recipe_id FK, snapshot JSONB, change_notes. | ✅ WP-FNB S2 |
| haccp_control_points | CCP register — hazard_type, critical_limit, monitoring_method. | ✅ WP-FNB S3 |
| haccp_log_entries | Per-batch CCP readings — is_within_limit, breach auto-raises NCR. | ✅ WP-FNB S3 |
| haccp_nonconformances | NCR register — severity, root_cause, disposition, status. | ✅ WP-FNB S3 |
| temperature_logs | Cold chain readings — is_breach, breach_severity, affected_lots[] JSONB. | ✅ WP-FNB S6 |
| cold_chain_locations | Monitored locations config — min/max temp limits, location_type. | ✅ WP-FNB S6 |
| recall_events | Recall/drill register — affected_batches JSONB, severity class. | ✅ WP-FNB S7 |

---

## HR Database Tables (WP-HR-1)

| Table | Key Notes | State |
|---|---|---|
| staff_profiles | Core employee record — role, department, start_date, contract_type. user_id is NULLABLE (LL-005 pattern). | ✅ WP-HR-1 |
| employment_contracts | Contract type, start/end dates, probation_end | ✅ WP-HR-1 |
| staff_documents | Document store — COA, contracts, warnings, certificates | ✅ WP-HR-1 |
| leave_types | Leave type catalogue — annual, sick, family, unpaid | ✅ WP-HR-1 |
| leave_balances | Running leave balance per staff per type | ✅ WP-HR-1 |
| leave_requests | Individual leave applications — status + approval trail | ✅ WP-HR-1 |
| public_holidays | SA public holiday calendar — 2026 pre-seeded | ✅ WP-HR-1 |
| shift_schedules | Planned shifts per staff member | ✅ WP-HR-1 |
| timesheets | Weekly/period timesheet container per employee | ✅ WP-HR-1 |
| timesheet_entries | Clock-in/out per day — QR or manual, late_flag, absent_flag | ✅ WP-HR-1 |
| disciplinary_records | Warnings, notices, hearings — full paper trail | ✅ WP-HR-1 |
| performance_reviews | Periodic review records — KPI scores, goals, PIP | ✅ WP-HR-1 |
| loans_stipends | Loan/allowance agreements + repayment schedules | ✅ WP-HR-1 |
| travel_allowances | Travel claims — per trip or monthly, odometer log | ✅ WP-HR-1 |
| staff_messages | Internal comms — Admin/HR to staff, broadcasts | ✅ WP-HR-1 |
| staff_notifications | System-generated alerts — late, absent, contract expiry | ✅ WP-HR-1 |

---

## Database Tables — DEAD (legacy — never write to these)

| Table | Why Dead | Use Instead |
|---|---|---|
| products | Orphaned legacy | inventory_items |
| inventory | Orphaned legacy | inventory_items |
| scans | Orphaned legacy | scan_logs |
| production_batches | Orphaned legacy | batches |
| production_inputs | Orphaned legacy | production_run_inputs |

---

## CUMULATIVE CHANGE LOG

### v3.0 (March 27, 2026) — WP-FNB S1-S8, WP-AI-UNIFIED, WP-TENANT S3, WP-FIN S1-S4
```
NEW FILES:
  TenantPortal.js v2.1 — SmartBar waterfall, manufacturer/distributor model
  ProteaAI.js v1.4 — Unified AI panel (Chat/Query/Dev), tab-aware, streaming
  DevErrorCapture.js v1.0 — React error boundary + console.error interceptor
  ExpenseManager.js v1.0 — Expense CRUD + bulk import + CSV export
  HQFoodIngredients.js v1.0 — 5082 lines (WP-FNB S1)
  HQRecipeEngine.js v1.0 — 1075 lines (WP-FNB S2)
  HQHaccp.js v1.0 — 1031 lines (WP-FNB S3)
  HQFoodSafety.js v1.0 — 632 lines (WP-FNB S4)
  HQNutritionLabel.js v1.0 — 590 lines (WP-FNB S5)
  HQColdChain.js v1.0 — 798 lines (WP-FNB S6)
  HQRecall.js v1.0 — 791 lines (WP-FNB S7)
  HQFoodIntelligence.js v1.0 — (WP-FNB S8)

UPDATED FILES:
  HQProfitLoss.js v3.2 — wholesale revenue (S4) + actual COGS (S2) + DB OPEX (S1)
  HQWholesaleOrders.js v2.0 — SAGE-style invoice modal + auto-generate on ship
  HQInvoices.js v2.0 — aged debtors panel + correct column mapping
  HQDashboard.js v4.3 — VIEWING dropdown + Food Intelligence tab
  AdminDashboard.js v6.7 — AIAssist removed
  HRDashboard.js — SystemStatusBar removed
  App.js v6.4 — /tenant-portal route + smart login redirect
  AppShell.js v1.3 — DevErrorCapture wraps children
  NavSidebar.js — ProteaAI panel + Food & Bev nav group
  HQDocuments.js v2.4 — create_expense handler (S3) + dedup gate (S0)
  tenantService.js v1.3 — is_operator exposed
  process-document EF v1.9 — classifyExpenseDocument (S3) + lump-sum (S0)

DELETED:
  AIAssist.js, CoPilot.js, AIOrb.js (standalone), AlertsBar.js, SystemStatusBar.js

NEW DB TABLES:
  food_ingredients, food_recipes, food_recipe_lines, food_recipe_versions,
  haccp_control_points, haccp_log_entries, haccp_nonconformances,
  temperature_logs, cold_chain_locations, recall_events
  (document_log extended with +9 food safety columns)
  expenses (WP-FIN S1)

COLUMN CHANGES:
  invoices: uses supplier_id for ALL partners (no customer_id). Use invoice_number.
  stock_reservations: inventory_item_id (not item_id), quantity_reserved (not quantity)
  product_cogs: tenant_id column added + RLS enabled (LL-100)
  stock_movements: unit_cost column only (NOT unit_cost_zar — LL-111)
  11 tables: tenant_id added + backfilled + RLS enabled (security hardening)

NEW LESSONS: LL-090 through LL-119 (see SESSION-CORE_v2.md)
```

### v2.9 (March 25, 2026) — WP-STOCK-PRO S5 complete
```
NEW: HQTransfer.js v1.0 (c617f55) — 1692 lines
UPDATED: HQDashboard.js v4.4, WorkflowGuideContent.js v1.2, useNavConfig.js
NEW DB: stock_transfers, stock_transfer_items (both with RLS)
FINAL HEAD: 3ab7668
```

### v2.8 (March 24, 2026) — WP-STOCK-PRO S4 complete
```
NEW: HRStockView.js v1.0 (063f7dc) — 2313 lines
UPDATED: HRDashboard.js v1.3
NEW DB: stock_take_sessions, stock_take_items, stock_take_schedules (RLS on all 3)
```

### v2.7 (March 24, 2026) — WP-STOCK-PRO S3 complete
```
UPDATED: StockItemModal.js v1.1, HQStock.js v3.0
DB: inventory_items +4 columns: temperature_zone, country_of_origin, reorder_qty, batch_lot_number
```

### v2.6 (March 24, 2026) — WP-PROD-MASTER Sessions C–E complete
```
UPDATED: HQProduction.js v3.5 (e91c7c7), WorkflowGuideContent.js v1.2
```

### v2.5 (March 24, 2026) — WP-PROD-MASTER Sessions A+B complete
```
UPDATED: HQProduction.js v3.2
DB: production_runs +20 columns. product_format_bom.tenant_id + RLS. product_formats.is_cannabis fixed.
```

### v2.4 (March 23, 2026) — BUG-042 resolved + WP-STOCK-PRO S1
```
UPDATED: HQTenants.js v1.1+BUG-042, HQStock.js v1.0+PANEL_CATS
```

### v2.3 (March 23, 2026) — HQCogs shipping fixes + BUG-044 logged
```
UPDATED: HQCogs.js v4.1+shipping
BUG-044 logged: shipping_alloc_zar stored as fixed ZAR
```

### v2.2 (March 23, 2026) — WP-FIN S0 complete
```
UPDATED: process-document EF v1.9, HQDocuments.js v2.4 (dedup gate, LL-084)
BUG-043 logged: 23 terpenes qty inflated 2-3×
```

### v2.0–v1.3 (March 22-23, 2026) — WP-BIB S1-S13, WP-HR, WP-IND, WP-GEN, WP-MED, WP-STK, WP-PRD
```
Full platform generalisation, HR module (12 sub-packages), industry profiles,
medical dispensary, stock intelligence, production integrity.
See git history for individual commits.
```

---

*MANIFEST.md v3.0 · Protea Botanicals · March 27, 2026*
*Always overwrite with higher version. Never delete entries — move dead ones to DEAD section.*
*LL-075: Disk is source of truth. If file exists but docs say pending — docs are wrong.*
*LL-083: Read the entire file before updating. A shorter output = data loss = hard failure.*
*LL-116: invoices uses supplier_id for all partners, invoice_number not reference.*
