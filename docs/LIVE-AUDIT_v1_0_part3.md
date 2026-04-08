# LIVE AUDIT v1.0 — Part 3
# Component Deep-Dives — Every File in the Codebase

---

## SECTION 5: COMPONENT DEEP-DIVES

### PRIORITY 1 — HQ PORTAL COMPONENTS (136,506 lines across ~80 files)

#### HQProduction.js (8,949 lines) — LARGEST FILE IN CODEBASE
- **Purpose:** Full production management — BOM, QC gate, batch tracking, 5 industry profiles
- **Portals:** HQ Dashboard (hq-production tab)
- **Tabs:** Overview · Runs · BOM · Formats · Batches · QC (profile-adaptive labels)
- **Modals:** FormatCreatorPanel, BOMBuilder, StartBatchModal, QCChecklist
- **DB tables read:** production_runs, production_run_inputs, inventory_items, batches, product_formats, product_format_bom, product_strains
- **DB tables written:** production_runs, production_run_inputs, product_formats, product_format_bom, inventory_items (qty update), stock_movements
- **Industry conditions:** BOM material types differ per profile (cannabis: terpenes/hardware/distillate; food: ingredients/packaging; general: raw materials)
- **Status:** WORKING

#### HQStock.js (5,890 lines)
- **Purpose:** 7-tab stock intelligence system
- **Tabs:** Overview · Items · Movements · Pricing · Receipts · POs · Shop
- **Sub-components:** StockItemPanel (slide-in), StockItemModal (add/edit), StockReceiveModal (delivery), StockPricingPanel, StockIntelPanel, CannabisDetailView, StockAIAnalysis, StockChannelPanel, ReorderPanel, StockReceiveHistoryPanel, StockOpeningCalibration
- **DB tables read:** inventory_items, stock_movements, purchase_orders, stock_receipts, stock_receipt_lines
- **Industry conditions:** Category labels from ProductWorlds.js, smart tags per world
- **Status:** WORKING — PROTECTED file (read before any change)

#### SmartInventory.js (5,343 lines)
- **Purpose:** Smart Catalog — tile/list/detail views with drag-to-reorder columns
- **Views:** Tile view (S/M/L density) · List view · Detail view (Excel-style)
- **Features:** Column picker, drag-to-reorder, drag-to-resize, column filters, smart search (price>500, qty:0, brand:RAW), bulk actions, CSV export, pill navigation (3-level nesting), KPI cards (6), shimmer skeleton loading
- **DB tables:** inventory_items
- **Status:** WORKING (SC-01 through SC-10 all complete)

#### HQFoodIngredients.js (5,082 lines) — FOOD_BEVERAGE ONLY
- **Purpose:** SA DAFF nutrition database — 121 ingredients with full nutritional profiles
- **Status:** WORKING

#### HQLoyalty.js (4,537 lines)
- **Purpose:** 10-tab AI loyalty engine
- **Tabs:** Programme · Earning Rules · Categories · Tiers · Economics · Referrals · QR Security · Simulator · AI Engine · Campaigns
- **Key features:** Tab 8 AI Engine with "Run Now" button, loyalty-ai EF control, AI Actions Feed, churn rescue/birthday/boost/promo toggles
- **DB tables:** loyalty_config, loyalty_transactions, user_profiles, referral_codes, loyalty_ai_log, double_points_campaigns, qr_codes, scan_logs
- **EF calls:** loyalty-ai (Run Now button)
- **Status:** WORKING

#### HQAnalytics.js (3,289 lines)
- **Purpose:** 6 sub-tabs of profile-adaptive analytics
- **Sub-tabs:** Overview · Revenue · Supply Chain · Production · Scans · Customers
- **Industry conditions:** Each sub-tab adapts per profile (cannabis strain analytics, food expiry alerts, general retail category analysis)
- **DB tables:** orders, order_items, stock_movements, expenses, inventory_items, loyalty_transactions, scan_logs
- **Status:** WORKING

#### HQOverview.js (3,240 lines)
- **Purpose:** Dashboard command centre — KPIs, live alerts, 6 charts, velocity reorder alerts
- **Sections:** TODAY tiles (Sales, Transactions, Avg Basket) · Revenue MTD · KPI cards · Velocity alerts · Reorder alerts
- **DB tables:** orders, order_items, inventory_items, stock_movements, expenses, eod_cash_ups
- **Status:** WORKING

#### HQDocuments.js (3,180 lines)
- **Purpose:** Smart Capture AI document ingestion — mobile camera UI, AI extraction, SARS compliance
- **Workflow:** Upload → process-document EF → policy engine → capture_queue → approve → auto-post-capture EF
- **Features:** DuplicateBanner (blocks approve), Stock to Receive panel (delivery notes), auto-retry on 500
- **EF calls:** process-document, auto-post-capture, receive-from-capture
- **DB tables:** capture_queue, capture_rules, document_log
- **Status:** WORKING (HQSmartCapture.js is the active variant in TenantPortal)

#### HQPurchaseOrders.js (3,140 lines)
- **Purpose:** FX-aware purchase orders with landed cost calculator
- **Features:** DDP (Delivered Duty Paid) cost calculator, receive→inventory flow, FX live rates
- **DB tables:** purchase_orders, purchase_order_items, suppliers, supplier_products, inventory_items, stock_movements
- **EF calls:** get-fx-rate
- **Status:** WORKING

#### HQCogs.js (3,912 lines)
- **Purpose:** Per-product COGS builder — separate cost engine from AVCO
- **Components:** Hardware (FX-live), terpene, distillate, lab, transport, packaging + loyalty cost line
- **DB tables:** product_cogs, supplier_products, fx_rates, inventory_items
- **Status:** WORKING

#### HQFraud.js (2,713 lines)
- **Purpose:** Cross-tenant anomaly scoring, POPIA deletion tracking, audit log
- **Sections:** Anomaly dashboard · Flagged users · Deletion requests · Audit trail
- **DB tables:** user_profiles (anomaly_score), scan_logs, audit_log, deletion_requests
- **Status:** WORKING

#### HQMedical.js (1,825 lines) — GATED: cannabis_dispensary only
- **Purpose:** Prescription patients, SAHPRA reports, dispensing log
- **Sections:** Patients · Prescriptions · Dispensing · Compliance
- **DB tables:** patients, prescriptions, dispensing_log, medical_documents
- **Status:** WORKING (feature-gated)

#### HQTenants.js (1,753 lines)
- **Purpose:** Tenant management + TenantSetupWizard
- **Features:** Create/edit tenants, industry profile, domain mapping, feature flags
- **DB tables:** tenants, tenant_config
- **Status:** WORKING

#### HQTradingDashboard.js (2,182 lines)
- **Purpose:** Daily sales intelligence — 30-day chart, EOD history, month/year selector
- **DB tables:** orders, order_items, pos_sessions, eod_cash_ups
- **Status:** WORKING

#### HQSuppliers.js (2,453 lines)
- **Purpose:** Supplier CRUD, contact management, reliability scoring, VAT status
- **Features:** AddSupplierPanel (with VAT registration checkbox), supplier cards with VAT badge + inline toggle
- **DB tables:** suppliers, supplier_products
- **Status:** WORKING

#### HQPricing.js (1,918 lines)
- **Purpose:** Per-SKU pricing across 3 channels (wholesale/retail/website) + NET AFTER LOYALTY column + FX sensitivity
- **Industry conditions:** Channel columns differ per profile
- **DB tables:** product_pricing, inventory_items, loyalty_config
- **Status:** WORKING

#### HQInvoices.js (1,735 lines)
- **Purpose:** Invoice list + aged debtors (0/30/60/90+ day buckets) + status pipeline
- **DB tables:** invoices, invoice_line_items
- **Status:** WORKING

#### HQWholesaleOrders.js (2,070 lines)
- **Purpose:** B2B orders → reserve stock → SAGE-style invoice on ship
- **DB tables:** wholesale_orders, inventory_items, stock_reservations
- **Status:** WORKING

#### HQReorderScoring.js (1,336 lines)
- **Purpose:** Automated reorder triggers, draft PO creation
- **DB tables:** inventory_items, purchase_orders, stock_movements
- **Status:** WORKING

#### HQTransfer.js (1,692 lines)
- **Purpose:** HQ→Shop stock transfers, TRF-YYYYMMDD ref, auto-receive
- **DB tables:** stock_transfers, stock_transfer_items, inventory_items
- **Status:** WORKING

#### Distribution.js (2,143 lines)
- **Purpose:** Wholesale shipment tracking
- **DB tables:** shipments, shipment_items
- **Status:** WORKING

#### RetailerHealth.js (1,917 lines)
- **Purpose:** Per-tenant health scoring
- **DB tables:** tenants, orders, inventory_items
- **Status:** WORKING

#### GeoAnalyticsDashboard.js (1,207 lines)
- **Purpose:** Province/city heatmaps, churn geography, demand gaps
- **Status:** WORKING

#### LiveFXBar.js (2,078 lines)
- **Purpose:** Live FX rates bar — USD/ZAR with sparkline
- **EF calls:** get-fx-rate
- **Status:** WORKING — PROTECTED file

#### ExpenseManager.js (1,462 lines)
- **Purpose:** Full expense management — add/edit/bulk import/export
- **Features:** Input VAT field (Calc 15% button), bulk CSV import with optional VAT column, VAT-registered tenant gate
- **DB tables:** expenses, tenant_config
- **Status:** WORKING

#### HQForecast.js (409 lines)
- **Purpose:** 30-day revenue/GP/net projection, stock depletion, restock spend, cash flow
- **DB tables:** orders, inventory_items, expenses
- **Status:** WORKING

#### HQFinancialNotes.js (201 lines)
- **Purpose:** 15 IFRS disclosure notes from live Supabase data
- **Status:** WORKING

#### HQFinancialSetup.js (436 lines)
- **Purpose:** 5-screen financial setup wizard — gates all financial statements
- **Status:** WORKING

#### HQYearEnd.js (338 lines)
- **Purpose:** 4-screen year-end close wizard
- **Status:** WORKING

#### HQSmartCapture.js (543 lines)
- **Purpose:** Alternative Smart Capture component (HQDocuments.js is active in HQ; this variant in TenantPortal)
- **Status:** WORKING

#### POSScreen.js (1,532 lines)
- **Purpose:** In-store POS — product grid, customer lookup, loyalty (10pts/R1), cash change, session badge
- **DB tables:** orders, order_items, stock_movements, pos_sessions, inventory_items, user_profiles
- **Status:** WORKING

#### EODCashUp.js (1,402 lines)
- **Purpose:** End-of-day cash reconciliation — thresholds from tenant_config.settings JSONB
- **DB tables:** eod_cash_ups, pos_sessions, tenant_config
- **Status:** WORKING

#### ProductWorlds.js (703 lines)
- **Purpose:** 14 product world definitions — category labels, icons, custom fields per world
- **Worlds:** Cannabis Flower · Vapes & Cartridges · Edibles · Seeds & Clones · Grow Supplies · Accessories · Health & Wellness · Lifestyle & Merch · Terpenes · Lab Equipment · Packaging · Raw Materials · Finished Goods · Other
- **Status:** WORKING (single source of truth for category metadata)

#### StockItemModal.js (2,858 lines) — LOCKED
- **Purpose:** World-specific add/edit for all 14 product worlds
- **Status:** WORKING — LOCKED file

#### StockReceiveModal.js (2,212 lines)
- **Purpose:** 3-step delivery receiving workflow — supplier VAT field, product world picker, AVCO update
- **Steps:** Step 1 (Delivery Info + VAT) → Step 2 (Line Items) → Step 3 (Review + Confirm)
- **DB tables:** stock_receipts, stock_receipt_lines, stock_movements, inventory_items, suppliers
- **Status:** WORKING

### HR SUITE (13 modules, accessed via /hr)
| Component | Lines | Purpose |
|---|---|---|
| HRTimesheets.js | 2,885 | Batch approve, QR clock-in, hours monitor, setup wizard |
| HRStockView.js | 2,299 | Stock takes — blind/guided, schedule, approve |
| HRLoans.js | 2,021 | Loans, stipends, repayment tracking |
| HRCalendar.js | 1,897 | 13 event layers, SA public holidays, MiniMonth, diary |
| HRPerformance.js | 1,769 | KPI forms, PIP tracker, goals |
| HRLeave.js | 1,598 | Leave requests, approval, conflict detection |
| HRDisciplinary.js | 1,495 | Warnings, hearings, appeals |
| HRComms.js | 1,529 | Inbox, broadcasts, acknowledgements |
| HRRoster.js | 1,284 | Shift scheduling, roster weeks, assignments |
| HRStaffProfile.js | 1,160 | Single employee deep-view |
| HRContracts.js | 1,089 | HTML→PDF contracts, template library |
| HRPayroll.js | 1,076 | SimplePay-compatible CSV export |
| HRSettings.js | 776 | Leave types, work hours, warning templates |
| HRStaffDirectory.js | 705 | Staff list, search, CSV export, setup wizard |
| **Total HR suite** | **21,583** | |

### PRIORITY 2 — ADMIN PORTAL COMPONENTS
| Component | Lines | Purpose |
|---|---|---|
| AdminQRCodes.js | 4,750 | QR generation, bulk, print, analytics |
| StockControl.js | 4,759 | Stock management for store admin |
| AdminCustomerEngagement.js | 3,210 | Customer CRM, engagement tools |
| AdminCommsCenter.js | 2,888 | Communications hub |
| AdminShipments.js | 2,075 | Shipment tracking |
| AdminFraudSecurity.js | 2,040 | Security dashboard for store |
| AdminBatchManager.js | 1,959 | Batch management |
| AdminProductionModule.js | 1,677 | Store-level production |
| AdminDashboard.js (page) | 1,700 | Admin portal main page (13 tabs) |
| AdminNotifications.js | 1,367 | Notification management |
| AdminHRPanel.js | 608 | HR summary panel |
| AdminAnalytics.js (page) | 944 | Store analytics |

### PRIORITY 3 — SHARED/ROOT COMPONENTS
| Component | Lines | Purpose |
|---|---|---|
| ProteaAI.js | 2,346 | AI assistant — 3 tabs: Chat/Query/Dev. LOCKED. |
| PlatformBar.js | 1,354 | 40px sticky intelligence bar. LOCKED. |
| ClientHeader.js | 977 | Client-facing header with branding |
| TerpeneModal.js | 926 | Terpene detail modal |
| CustomerSupportWidget.js | 900 | Support ticket widget |
| CustomerInbox.js | 793 | Customer message inbox |
| WorkflowGuideContent.js | 791 | Workflow guide content definitions |
| LoyaltyBadges.js | 723 | Tier badge visualisations |
| TerpeneCarousel.js | 705 | Terpene carousel for shop |
| WorkflowGuide.js | 589 | Step-by-step workflow guide UI |
| NavSidebar.js | 559 | Collapsible navigation sidebar |
| GlobalSearch.js | 545 | Platform-wide search |
| THCaMolecule.js | 480 | THCa molecule SVG |
| CBDMolecule.js | 447 | CBD molecule SVG |
| MoleculeModal.js | 440 | Molecule detail modal |
| TenantSetupWizard.js | 1,574 | Multi-step tenant onboarding |
| InfoTooltip.js | 383 | Reusable tooltip component |
| ToastContainer.js | 239 | Platform toast notification system |
| AccountBubble.js | 286 | User account bubble with profile badge |
| MoleculeCarousel.js | 302 | Molecule card carousel |
| MoleculePulse.js | 257 | Animated molecule pulse effect |
| AIFixture.js | 301 | Proactive AI daily brief fixture |
| SurveyWidget.js | 292 | Customer survey widget |
| PageShell.js | 182 | Page layout wrapper |
| AgeGate.js | 167 | Age verification gate |
| PromoBanner.js | 164 | Promotional banner |
| DevErrorCapture.js | 149 | Development error boundary |
| LottieCharacter.js | 115 | Lottie animation wrapper |
| AppShell.js | 76 | Root app shell |

### PRIORITY 4 — SHOP (CONSUMER-FACING)
| Component | Lines | Purpose |
|---|---|---|
| ShopInventory.js | 850 | Product grid for consumer shop |
| ShopAnalytics.js | 844 | Shop analytics dashboard |
| ShopSettings.js | 597 | Shop configuration |
| ShopOverview.js | 503 | Shop overview dashboard |

### PRIORITY 5 — CONSUMER PAGES
| Page | Lines | Route | Purpose |
|---|---|---|---|
| Shop.js | 4,115 | /shop | Product catalogue — VapeCard/FoodShopCard/GeneralShopCard |
| Account.js | 3,447 | /account | Customer account — profile, loyalty history, settings |
| ScanResult.js | 2,142 | /scan/:qrCode | QR scan result — points, verification, fraud check |
| ProductVerification.js | 2,131 | /verify/:productId | Product verification page |
| TenantPortal.js | 1,177 | /tenant-portal | Tenant portal with waterfall navigation |
| Loyalty.js | 1,636 | /loyalty | Loyalty dashboard — points, tier, referral code |
| CheckoutPage.js | 1,176 | /checkout | Checkout — PayFast, loyalty redemption, 8-category stack |
| AdminQrGenerator.js | 1,218 | /admin/qr | QR code generation tool |
| StaffPortal.js | 1,269 | /staff | Staff self-service (profile, leave, timesheets, messages) |
| OrderSuccess.js | 832 | /order-success | Post-payment confirmation |
| MoleculesPage.js | 709 | /molecules | Cannabinoid education page |
| ScanPage.js | 680 | /scan | QR scanner camera page |
| WholesalePortal.js | 640 | /wholesale | B2B wholesale ordering |
| CartPage.js | 599 | /cart | Shopping cart |
| Redeem.js | 564 | /redeem | Points redemption |
| TerpenePage.js | 463 | /terpenes | Terpene education |
| Welcome.js | 336 | /welcome | Onboarding welcome |
| HQDashboard.js | 313 | /hq | HQ portal entry (tab router) |
| HRDashboard.js | 855 | /hr | HR portal entry |
| Leaderboard.js | 294 | /leaderboard | Loyalty leaderboard |
| ShopDashboard.js | 228 | (shop admin) | Shop dashboard |

### PRIORITY 6 — VIZ LIBRARY
| Component | Lines | Purpose | Used by |
|---|---|---|---|
| PipelineStages.js | 198 | Pipeline stage visualisation | HQInvoices, HQWholesaleOrders |
| BulletChart.js | 170 | Bullet chart for KPI targets | HQOverview, RetailerHealth |
| Icon.js | 161 | SVG icon library | Platform-wide |
| ChartTooltip.js | 155 | Chart tooltip wrapper | All chart components |
| ChartCard.js | 145 | Chart container card | All chart components |
| InlineProgressBar.js | 129 | Inline progress bar | HQFixedAssets, HQLoyalty |
| DeltaBadge.js | 63 | Delta (change) badge | HQOverview, HQTradingDashboard |
| SparkLine.js | 48 | Sparkline mini-chart | LiveFXBar, HQOverview |
| index.js | 15 | Barrel export | — |

### SERVICES & HOOKS
| File | Lines | Purpose |
|---|---|---|
| usePageContext.js | 1,522 | Page-level context management |
| scanService.js | 538 | QR scan service layer |
| useNavConfig.js | 426 | Navigation configuration hook |
| systemHealthContext.js | 360 | System health monitoring |
| copilotService.js | 359 | AI copilot service layer |
| geoService.js | 314 | Geolocation service |
| tenantService.js | 218 | Multi-tenancy service (useTenant hook) |
| StorefrontContext.js | 169 | Storefront context for consumer pages |
| exportFinancialStatements.js | 146 | Financial statement PDF export utility |
| useAIUsage.js | 143 | AI usage tracking hook |
| industryProfiles.js | 125 | Industry profile constants |
| CartContext.js | 119 | Shopping cart context |
| theme.js | 370 | Design token system |
| tokens.js | 107 | Style tokens |
| useTenantConfig.js | 90 | Tenant config hook |
| notificationService.js | 95 | Notification service |
| PlatformBarContext.js | 66 | PlatformBar state context |
| toast.js | 45 | Toast notification utility |
| supabaseClient.js | 14 | Supabase client initialisation |

---

*LIVE-AUDIT v1.0 Part 3 · NuAi · 09 Apr 2026*
*Section 5: Component Deep-Dives — 180 files documented*
