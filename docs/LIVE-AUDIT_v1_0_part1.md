# LIVE AUDIT v1.0 — NuAi Platform
# Produced by Claude Code — direct codebase read — 09 April 2026
# Total JS files: 180 | Total lines: 224,293 | Total tables: 109 | Total EFs: 10

---

## SECTION 1: COMPLETE FILE INVENTORY

### Grand Total
- **JavaScript files:** 180
- **JavaScript lines:** 220,834
- **TypeScript (Edge Functions):** 10 files, 3,459 lines
- **Combined total:** 190 files, 224,293 lines of code

### By Directory
| Directory | Lines | Files |
|---|---|---|
| src/components/hq/ | 136,506 | ~80 |
| src/components/ (root) | 45,570 | ~40 |
| src/pages/ | 28,496 | ~25 |
| src/components/shop/ | 2,794 | 4 |
| src/hooks/ | 2,181 | 3 |
| src/services/ | 1,943 | 7 |
| src/components/viz/ | 1,084 | 8 |
| supabase/functions/ | 3,459 | 10 |

### Top 50 Files by Size
| # | File | Lines |
|---|---|---|
| 1 | HQProduction.js | 8,949 |
| 2 | HQStock.js | 5,890 |
| 3 | SmartInventory.js | 5,343 |
| 4 | HQFoodIngredients.js | 5,082 |
| 5 | StockControl.js | 4,759 |
| 6 | AdminQRCodes.js | 4,750 |
| 7 | HQLoyalty.js | 4,537 |
| 8 | Shop.js | 4,115 |
| 9 | HQCogs.js | 3,912 |
| 10 | Account.js | 3,447 |
| 11 | HQAnalytics.js | 3,289 |
| 12 | HQOverview.js | 3,240 |
| 13 | AdminCustomerEngagement.js | 3,210 |
| 14 | HQDocuments.js | 3,180 |
| 15 | HQPurchaseOrders.js | 3,140 |
| 16 | AdminCommsCenter.js | 2,888 |
| 17 | HRTimesheets.js | 2,885 |
| 18 | StockItemModal.js | 2,858 |
| 19 | HQProfitLoss.js | 2,750 |
| 20 | HQFraud.js | 2,713 |
| 21 | HQSuppliers.js | 2,453 |
| 22 | ProteaAI.js | 2,346 |
| 23 | HQHaccp.js | 2,336 |
| 24 | HRStockView.js | 2,299 |
| 25 | StockReceiveModal.js | 2,212 |
| 26 | HQTradingDashboard.js | 2,182 |
| 27 | HQRecipeEngine.js | 2,175 |
| 28 | Distribution.js | 2,143 |
| 29 | ScanResult.js | 2,142 |
| 30 | ProductVerification.js | 2,131 |
| 31 | LiveFXBar.js | 2,078 |
| 32 | AdminShipments.js | 2,075 |
| 33 | HQWholesaleOrders.js | 2,070 |
| 34 | AdminFraudSecurity.js | 2,040 |
| 35 | HRLoans.js | 2,021 |
| 36 | AdminBatchManager.js | 1,959 |
| 37 | HQPricing.js | 1,918 |
| 38 | RetailerHealth.js | 1,917 |
| 39 | HRCalendar.js | 1,897 |
| 40 | StockItemPanel.js | 1,826 |
| 41 | HQMedical.js | 1,825 |
| 42 | HRPerformance.js | 1,769 |
| 43 | HQTenants.js | 1,753 |
| 44 | StockIntelPanel.js | 1,748 |
| 45 | HQInvoices.js | 1,735 |
| 46 | AdminDashboard.js | 1,700 |
| 47 | HQTransfer.js | 1,692 |
| 48 | AdminProductionModule.js | 1,677 |
| 49 | StockPricingPanel.js | 1,669 |
| 50 | HQRecall.js | 1,666 |

### Edge Functions by Size
| EF | Lines | Version |
|---|---|---|
| process-document | 1,054 | v2.2 (v53 deployed) |
| ai-copilot | 703 | v59 |
| payfast-checkout | 372 | v44 |
| sim-pos-sales | 324 | v4 |
| payfast-itn | 317 | v39 |
| verify-qr | 195 | v34 |
| auto-post-capture | 137 | v1.1 (v2 deployed) |
| get-fx-rate | 127 | v35 |
| sign-qr | 121 | v36 |
| send-notification | 109 | v37 |

---

## SECTION 10: DATABASE — COMPLETE SCHEMA

### 109 Tables — All with RLS Enabled
(Ordered by row count, descending)

| Table | Rows | Purpose |
|---|---|---|
| stock_movements | 2,289 | Every stock in/out event (purchase_in, sale_pos, sale_out, adjustment, transfer) |
| order_items | 1,094 | Line items for every order — product_name, quantity, line_total, product_metadata (AVCO) |
| fx_rates | 762 | Historical USD/ZAR exchange rates (60s cache, R18.50 fallback) |
| orders | 461 | POS + online orders — total, status (paid/pending/cancelled/refunded), channel |
| loyalty_transactions | 401 | Full points ledger — EARNED, PURCHASE, REDEEMED, BONUS, AI_RESCUE |
| inventory_items | 232 | Every SKU — qty, AVCO, sell_price, category (enum), reorder_level, expiry |
| loyalty_ai_log | 189 | AI engine output — churn_rescue, birthday_bonus, stock_boost_suggestion, point_expiry |
| scan_logs | 181 | QR scan events — device, GPS, timestamp, user_agent, velocity flags |
| supplier_products | 123 | Products catalogued per supplier — cost, currency, lead time |
| food_ingredients | 121 | SA DAFF nutrition database — 121 ingredients for food_beverage profile |
| pos_sessions | 120 | POS till sessions — open/close times, operator, payment totals |
| eod_cash_ups | 90 | End-of-day cash reconciliation — system_cash_total, counted, variance (GENERATED) |
| system_alerts | 62 | Platform-wide alerts (PlatformBar intelligence bar) |
| qr_codes | 60 | Generated QR codes — HMAC signed, linked to inventory_items |
| user_profiles | 58 | Customers + staff — loyalty_points, tier, churn_risk_score, anomaly_score |
| expenses | 49 | Business expenses — amount_zar, input_vat_amount, category (opex/capex/wages/tax) |
| chart_of_accounts | 40 | Cannabis retail CoA template — 5 account types, codes 10000-69999 |
| public_holidays | 40 | SA public holidays for HR calendar |
| product_pricing | 36 | Per-SKU pricing across 3 channels (wholesale/retail/website) |
| purchase_order_items | 27 | PO line items — quantity_ordered, quantity_received, unit_cost |
| bank_statement_lines | 22 | Imported bank statement rows — debit/credit/balance/matched_type |
| document_log | 18 | Smart Capture AI extraction log — fingerprint, compliance, confidence |
| product_strains | 18 | Cannabis strain catalogue (Sativa/Indica/Hybrid) |
| product_formats | 14 | Product format definitions (1g, 3.5g, cart, tincture, etc.) |
| product_cogs | 13 | Per-product COGS recipes — hardware, terpene, distillate, lab, transport |
| production_run_inputs | 12 | BOM materials consumed per production run |
| stock_receipt_lines | 10 | Delivery receipt line items — item_id, qty_received, cost_per_unit |
| price_history | 10 | Historical sell price changes per SKU |
| capture_rules | 10 | Smart Capture policy engine — 10 active rules |
| journal_lines | 10 | Double-entry journal line items — account_code, debit_amount, credit_amount |
| batches | 10 | Production batch master (cannabis extraction batches) |
| message_templates | 9 | WhatsApp/SMS templates for customer comms |
| production_runs | 8 | Production run tracking — status, yield, QC pass/fail |
| referral_codes | 8 | Customer referral codes for loyalty programme |
| leave_types | 7 | HR leave type definitions (annual, sick, family, etc.) |
| notification_log | 7 | WhatsApp/notification delivery log |
| customer_messages | 7 | Direct messages to customers |
| purchase_orders | 6 | FX-aware purchase orders — landed_cost_zar, po_status lifecycle |
| capture_queue | 6 | Smart Capture processing queue — confidence, policy flags, status |
| local_inputs | 5 | Local SA supplier inputs for COGS |
| suppliers | 5 | Supplier directory — vat_registered, vat_number, currency |
| tenants | 5 | Multi-tenant registry — industry_profile, domain |
| journal_entries | 5 | Journal headers — journal_date, status (draft/posted/reversed), financial_year |
| vat_transactions | 4 | VAT ledger — output_vat, input_vat, source (seeded/calculated/manual) |
| stock_receipts | 4 | Stock delivery receipt headers — input_vat_amount, total_value_zar |
| tenant_config | 4 | Per-tenant configuration — VAT, financial year, feature flags |
| loyalty_config | 4 | Loyalty programme config — earn rates, tier thresholds, AI flags |
| food_recipe_versions | 3 | Recipe version history |
| haccp_control_points | 3 | HACCP critical control points (SA R638) |
| fixed_assets | 3 | PP&E register — purchase_cost, accumulated_depreciation, net_book_value |
| inventory | 3 | Legacy inventory table |
| production_batches | 0 | Legacy production batch tracking |
| (+ 50 more tables with 0-2 rows) | | |

### 38 Database Functions
| Function | Purpose |
|---|---|
| calculate_avco | Weighted average cost recalculation on stock movement |
| increment_loyalty_points | RPC: add points to user (p_user_id, p_points) |
| calculate_loyalty_tier | Derive tier from points balance |
| calculate_loyalty_tier_from_config | Tier calculation using loyalty_config thresholds |
| reserve_stock | Soft-hold inventory for wholesale orders |
| release_reservation | Release soft-hold back to available |
| check_reorder | Trigger function: flag items below reorder_level |
| generate_qr_code | QR code generation with HMAC signing |
| get_scan_velocity_flags | Fraud detection: rapid scan velocity checking |
| get_monthly_leaderboard | Loyalty leaderboard by points earned |
| get_user_monthly_rank | Individual user rank in leaderboard |
| get_vat_period | Derive VAT period string from date + period type |
| sync_expense_to_vat_transactions | Trigger: expense INSERT/UPDATE/DELETE → vat_transactions |
| sync_receipt_to_vat_transactions | Trigger: stock_receipts INSERT/UPDATE/DELETE → vat_transactions |
| prevent_duplicate_loyalty_transactions | Dedup guard on loyalty_transactions |
| calculate_hours_worked | Trigger: compute hours from clock_in/clock_out |
| rollup_timesheet_totals | Trigger: aggregate timesheet entry hours |
| update_last_movement | Trigger: stamp last movement date on inventory_items |
| update_leave_balance_on_approval | Trigger: deduct leave balance when approved |
| update_loan_balance | Trigger: recalculate loan outstanding |
| award_birthday_points | Birthday bonus point award |
| is_hq_user | RLS: check user_profiles.hq_access = true |
| is_admin | RLS: check user_profiles.role = 'admin' |
| is_admin_user | RLS: admin role check variant |
| is_hr_user | RLS: HR role check |
| is_staff_user | RLS: staff role check |
| is_staff_or_admin | RLS: staff OR admin |
| user_tenant_id | RLS: get tenant_id for auth.uid() |
| user_role | RLS: get role for auth.uid() |
| current_user_tenant_id | RLS: current user's tenant_id |
| auth_is_admin | RLS: auth-level admin check |
| auth_is_admin_for_messages | RLS: admin check for message tables |
| get_staff_profile_id | Staff profile lookup |
| generate_ticket_number | Auto-increment support ticket numbers |
| update_ticket_timestamp | Trigger: update support ticket timestamps |
| update_updated_at | Generic updated_at trigger |
| update_updated_at_column | Generic updated_at trigger variant |
| trg_update_loyalty_tier_from_config | Trigger: recalc tier on user_profiles update |

### 35 Database Triggers
| Table | Trigger | Event | Function |
|---|---|---|---|
| expenses | expense_vat_sync | INSERT/UPDATE/DELETE | sync_expense_to_vat_transactions |
| stock_receipts | receipt_vat_sync | INSERT/UPDATE/DELETE | sync_receipt_to_vat_transactions |
| stock_movements | stock_movement_stamp | INSERT | update_last_movement (+ AVCO) |
| inventory_items | reorder_check | UPDATE | check_reorder |
| inventory_items | trg_inventory_updated | UPDATE | update_updated_at |
| loyalty_transactions | loyalty_dedup_guard | INSERT | prevent_duplicate_loyalty_transactions |
| user_profiles | trg_loyalty_tier | UPDATE | trg_update_loyalty_tier_from_config |
| timesheet_entries | calc_hours_worked | INSERT/UPDATE | calculate_hours_worked |
| timesheet_entries | rollup_ts_totals | INSERT/UPDATE/DELETE | rollup_timesheet_totals |
| leave_requests | leave_balance_update | INSERT/UPDATE | update_leave_balance_on_approval |
| loans_stipends | calc_loan_balance | INSERT/UPDATE | update_loan_balance |
| purchase_orders | trg_po_updated | UPDATE | update_updated_at |
| suppliers | trg_suppliers_updated | UPDATE | update_updated_at |
| support_tickets | set_ticket_number | INSERT | generate_ticket_number |
| support_tickets | ticket_updated_at | UPDATE | update_ticket_timestamp |
| + 8 set_updated_at triggers | on various HR tables | UPDATE | update_updated_at_column |

---

## SECTION 9: EDGE FUNCTIONS

### 1. process-document (v2.2 / deployed as v53)
- **Lines:** 1,054
- **JWT:** verify_jwt=false
- **AI:** Claude claude-sonnet-4-20250514 via Anthropic API direct
- **Input:** file_base64, mime_type, file_url, file_name, tenant_id, context (suppliers, products, inventory, POs)
- **Output:** extraction (JSON), sars_compliant, input_vat_claimable, input_vat_amount, capture_type, document_fingerprint, is_duplicate
- **DB reads:** document_log (fingerprint dedup check)
- **DB writes:** document_log (extraction result + fingerprint)
- **Business process:** AI-powered document extraction — reads any business document (invoice, delivery note, COA, receipt), extracts structured data, checks SARS compliance, generates 6-level anti-fraud fingerprint, detects duplicates

### 2. auto-post-capture (v1.1 / deployed as v2)
- **Lines:** 137
- **JWT:** verify_jwt=false
- **Input:** capture_queue_id, approved_by
- **Output:** expense_id, journal_entry_id, vat_transaction_id, vat_source
- **DB reads:** capture_queue
- **DB writes:** expenses (with input_vat_amount), journal_entries, journal_lines, capture_queue (status update), document_log (status update)
- **Business process:** Atomic accounting — creates expense + double-entry journal from approved capture. VAT handled by expense_vat_sync trigger.

### 3. ai-copilot (v59)
- **Lines:** 703
- **JWT:** verify_jwt=false
- **AI:** Claude (model selected per request)
- **Input:** messages, userContext, systemOverride
- **Output:** reply, model, usage, error
- **DB reads:** None direct (context provided by caller)
- **Business process:** All AI chat/query calls from ProteaAI. systemOverride param allows caller to supply own system prompt.

### 4. sim-pos-sales (v4)
- **Lines:** 324
- **JWT:** verify_jwt=false
- **Input:** tenant_id, days (default 30)
- **Output:** orders_created, items_created, movements_created
- **DB reads:** inventory_items, product_metadata
- **DB writes:** orders, order_items, stock_movements, pos_sessions, eod_cash_ups
- **Business process:** POS sales simulator — generates realistic 30-day trading history with cannabis category weights, time-weighted hours, 55%/30%/15% payment split

### 5. payfast-checkout (v44)
- **Lines:** 372
- **JWT:** verify_jwt=false
- **Input:** order details, return_url
- **Output:** PayFast redirect URL with MD5 signature
- **External API:** PayFast sandbox
- **Business process:** South African payment gateway initiation

### 6. payfast-itn (v39)
- **Lines:** 317
- **JWT:** verify_jwt=false
- **Input:** PayFast ITN POST data
- **Output:** 200 OK
- **External API:** PayFast validation endpoint
- **DB writes:** orders (status update), loyalty_transactions (points award)
- **Business process:** Payment confirmation webhook — validates signature, updates order, awards loyalty points

### 7. sign-qr (v36)
- **Lines:** 121
- **JWT:** verify_jwt=false
- **Input:** payload (product_id, batch, type)
- **Output:** signed QR code string with HMAC-SHA256 signature
- **Business process:** Cryptographic QR code signing for product authentication

### 8. verify-qr (v34)
- **Lines:** 195
- **JWT:** verify_jwt=false
- **Input:** QR code string
- **Output:** valid (boolean), product_data, scan_count, velocity_flags
- **DB reads:** qr_codes, scan_logs, inventory_items
- **DB writes:** scan_logs
- **Business process:** QR code verification — HMAC validation, velocity fraud detection, scan logging

### 9. get-fx-rate (v35)
- **Lines:** 127
- **JWT:** verify_jwt=false
- **Input:** from (USD), to (ZAR)
- **Output:** rate, timestamp, source
- **External API:** Exchange rate API
- **DB writes:** fx_rates (cache)
- **Business process:** Live USD/ZAR exchange rate with 60-second cache and R18.50 fallback

### 10. send-notification (v37)
- **Lines:** 109
- **JWT:** verify_jwt=false
- **Input:** phone, template, variables
- **Output:** message_sid
- **External API:** Twilio WhatsApp API
- **DB writes:** notification_log
- **Business process:** WhatsApp notifications — tier upgrades, churn rescue alerts, order confirmations

---

## SECTION 11: INDUSTRY PROFILE BRANCHING

The platform supports 4 industry profiles. 26 files contain industry-specific branching:

### Profiles
| Profile | Description | Example Tenant |
|---|---|---|
| cannabis_retail | Cannabis dispensary — THC/CBD products, strains, compliance | Medi Recreational |
| cannabis_dispensary | Medical cannabis — SAHPRA, prescriptions | (variant of cannabis_retail) |
| food_beverage | Food producer — ingredients, HACCP, allergens, nutrition labels | (available) |
| general_retail | Generic retail — finished goods, accessories | TEST SHOP |

### Files with Industry Branching (26 files)
| File | What Changes by Profile |
|---|---|
| HQProduction.js | BOM material types differ (cannabis: terpenes/distillate/hardware; food: ingredients/packaging; general: raw materials) |
| HQStock.js | Category labels, smart tags, variant handling |
| HQOverview.js | Dashboard KPIs (cannabis-specific velocity alerts) |
| HQAnalytics.js | 6 sub-tabs adapt per profile — food expiry alerts, cannabis strain analytics |
| HQPricing.js | Channel pricing columns differ per profile |
| HQDocuments.js | AI extraction context varies by profile |
| HQSmartCapture.js | Industry profile passed to process-document EF |
| HQMedical.js | GATED: only visible for cannabis_dispensary profile |
| HQTenants.js | Industry profile shown and editable per tenant |
| HQTransfer.js | Transfer workflows differ |
| HRStockView.js | Stock take categories differ |
| StockItemModal.js | 14 Product Worlds with custom fields per world |
| StockControl.js | Category handling |
| StockAIAnalysis.js | AI context varies |
| TenantSetupWizard.js | Initial configuration questions differ |
| Shop.js | Product card type (VapeCard/FoodShopCard/GeneralShopCard) |
| ScanResult.js | Scan UI and loyalty category logic |
| AdminAnalytics.js | Analytics tabs differ |
| industryProfiles.js | Central profile definitions and helper functions |
| StorefrontContext.js | Storefront configuration per profile |
| tenantService.js | Profile stored and exposed via useTenant() |
| PlatformBar.js | Profile badge display |
| AccountBubble.js | Profile badge colours |
| HQPurchaseOrders.js | Supplier currency/category handling |

### Food & Beverage Exclusive Modules (only visible for food_beverage profile)
| Component | Lines | SA Compliance |
|---|---|---|
| HQFoodIngredients.js | 5,082 | 121 SA DAFF ingredients database |
| HQRecipeEngine.js | 2,175 | BOM, allergen propagation, batch production |
| HQHaccp.js | 2,336 | CCP log, NCR auto-raise — SA R638 |
| HQFoodSafety.js | 1,332 | Certificate vault, expiry alerts |
| HQNutritionLabel.js | 1,191 | SA R638 nutritional label generator |
| HQColdChain.js | 798 | Temperature monitoring, breach detection |
| HQRecall.js | 1,666 | Product recall, lot traceability, FSCA letter |
| HQFoodIntelligence.js | 1,505 | AI-powered weekly F&B brief |
| **Total F&B exclusive** | **16,085** | |

---

## SECTION 12: SECURITY & MULTI-TENANCY

### Multi-Tenancy Architecture
- **109 tables** — all with Row Level Security (RLS) enabled
- **587 references** to `tenant_id` across JavaScript codebase
- **171 references** to `switchTenant`/`useTenant` hook calls
- **5 tenants** currently registered in the system

### RLS Functions (9 role-based access functions)
| Function | Purpose |
|---|---|
| is_hq_user() | Returns true if user_profiles.hq_access = true — HQ operator bypass |
| is_admin() | Returns true if user_profiles.role = 'admin' |
| is_admin_user() | Admin check variant |
| is_hr_user() | HR role check |
| is_staff_user() | Staff role check |
| is_staff_or_admin() | Combined staff/admin check |
| user_tenant_id() | Returns tenant_id for current auth.uid() |
| user_role() | Returns role for current auth.uid() |
| current_user_tenant_id() | Returns current user's tenant_id |

### RLS Policy Pattern (applied to every tenant-scoped table)
1. **Tenant isolation:** `USING (tenant_id = user_tenant_id())` — users can only see their own tenant's data
2. **HQ operator bypass:** `USING (is_hq_user())` — HQ operators can see all tenants (LL-205)
3. **Service role:** INSERT policies for Edge Function writes

### HQ Operator RLS (LL-205 — 12 finance tables confirmed)
These tables have the `hq_all_` bypass policy enabling cross-tenant reads:
journal_entries · journal_lines · vat_transactions · fixed_assets ·
bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
chart_of_accounts · equity_ledger · vat_period_filings · financial_statement_status

### Frontend Tenant Switching
- `useTenant()` hook exposes: `{ tenant, tenantId, tenantName, isHQ, isOperator, allTenants, switchTenant, industryProfile, tenantConfig }`
- `switchTenant(tenant)` updates React context — all child components re-render with new tenant data
- `auth.uid()` never changes — RLS still enforces operator's own access unless `is_hq_user()` bypass exists
- HQ child components receive NO tenantId props — they call `useTenant()` directly (LL-207)

### Authentication Roles
| Role | Access | Route |
|---|---|---|
| HQ (Super Admin) | All tenants, all data, all modules | /hq |
| Admin (Store Manager) | Own tenant, operational data | /admin |
| HR Manager | HR modules only | /hr |
| Staff | Limited portal (profile, leave, timesheets) | /staff |
| Customer | Shop, loyalty, account | /shop, /loyalty, /account |

---

## SECTION 8: MOLECULE & EDUCATION SYSTEM

14 files dedicated to cannabinoid/terpene science education:

### Cannabinoid Molecule Visualisations
| File | Lines | Molecule | Description |
|---|---|---|---|
| THCaMolecule.js | 480 | THCa (Tetrahydrocannabinolic acid) | 3D-style SVG molecule visualisation with chemical formula |
| CBDMolecule.js | 447 | CBD (Cannabidiol) | Interactive molecule with properties |
| CBGMolecule.js | 339 | CBG (Cannabigerol) | "Mother cannabinoid" visualisation |
| CBNMolecule.js | 316 | CBN (Cannabinol) | Degradation product of THC |
| Delta8THCMolecule.js | 424 | Delta-8 THC | Isomer visualisation |
| Delta9THCMolecule.js | 386 | Delta-9 THC | Primary psychoactive cannabinoid |
| Delta10THCMolecule.js | 426 | Delta-10 THC | Synthetic isomer |

### Molecule UI Components
| File | Lines | Purpose |
|---|---|---|
| MoleculeCarousel.js | 302 | Horizontal scrolling carousel of all molecule cards |
| MoleculeModal.js | 440 | Full-screen molecule detail with scientific info |
| MoleculePulse.js | 257 | Animated pulse effect around active molecule |
| TerpeneCarousel.js | 705 | Terpene profile carousel with aroma/effect descriptions |
| TerpeneModal.js | 926 | Detailed terpene info modal with flavour wheel |

### Education Pages
| File | Lines | Route | Purpose |
|---|---|---|---|
| MoleculesPage.js | 709 | /molecules | Full molecule education page — all 7 cannabinoids |
| TerpenePage.js | 463 | /terpenes | Terpene education — common cannabis terpenes |

**Total molecule/education system: 6,620 lines**
These appear in the consumer-facing shop (/shop) and dedicated education pages.

---

*LIVE-AUDIT v1.0 Part 1 · NuAi · 09 Apr 2026*
*Sections: 1 (File Inventory) · 8 (Molecules) · 9 (Edge Functions) · 10 (Database) · 11 (Industry Profiles) · 12 (Security)*
