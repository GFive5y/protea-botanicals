# LIVE AUDIT v1.0 — Part 2
# Routes, Navigation, Financial System, QR System

---

## SECTION 2: ROUTE MAP

Every route in App.js — 20 distinct pages/portals:

| Route | Component | Access | Purpose |
|---|---|---|---|
| `/` | Landing | Public | Landing page |
| `/shop` | Shop | Public (AgeGate) | Product catalogue — profile-adaptive cards |
| `/verify/:productId` | ProductVerification | Public | Product verification page |
| `/terpenes/:terpeneId` | TerpenePage | Public | Terpene education detail |
| `/cart` | CartPage | Authenticated | Shopping cart |
| `/leaderboard` | Leaderboard | Authenticated | Loyalty points leaderboard |
| `/scan` | ScanPage | Public | QR scanner camera page |
| `/scan/:qrCode` | ScanResult | Public | QR scan result — points, verification |
| `/loyalty` | Loyalty | Authenticated | Loyalty dashboard — points, tier, referral |
| `/redeem` | Redeem | Authenticated | Points redemption page |
| `/checkout` | CheckoutPage | Authenticated | Checkout — PayFast, loyalty, redemption |
| `/order-success` | OrderSuccess | Authenticated | Post-payment confirmation |
| `/wholesale` | WholesalePortal | Authenticated | B2B wholesale ordering portal |
| `/admin` | AdminDashboard | Admin role | Store manager dashboard (13 tabs) |
| `/admin/qr` | AdminQrGenerator | Admin role | Dedicated QR generation page |
| `/hq/*` | HQDashboard | HQ role | HQ command centre (35+ tabs) |
| `/tenant-portal/*` | TenantPortal | Owner/Manager | Tenant portal — waterfall nav |
| `/hr/*` | HRDashboard | HR/Admin role | HR suite (13 modules) |
| `/staff/*` | StaffPortal | Staff role | Staff self-service (4 tabs) |
| `/account` | Account | Authenticated | Customer account settings |
| `/welcome` | Welcome | Authenticated | Onboarding welcome page |
| `/404` | NotFound | Public | 404 page |

---

## SECTION 3: NAVIGATION STRUCTURE

### HQ Dashboard (HQDashboard.js) — 35 Tabs
| Tab ID | Label | Icon |
|---|---|---|
| overview | Overview | 📊 |
| supply-chain | Supply Chain | 📦 |
| suppliers | Suppliers | 🌍 |
| procurement | Procurement | 🛒 |
| invoices | Invoices | 🧾 |
| journals | Journals | 📒 |
| bank-recon | Bank Recon | 🏦 |
| fixed-assets | Fixed Assets | 🏗️ |
| expenses | Expenses | 💸 |
| vat | VAT | 🏛️ |
| year-end-close | Year-End Close | 📅 |
| tenants | Tenants | 🏢 |
| hq-production | Production | ⚗️ |
| hq-stock | HQ Stock | = |
| hq-transfers | Transfers | = |
| hq-trading | Daily Trading | 📊 |
| hq-pos | POS Till | 🛒 |
| hq-eod | Cash-Up | 💰 |
| hq-ingredients | Ingredients | = |
| hq-recipes | Recipes | = |
| hq-haccp | HACCP | = |
| hq-food-safety | Food Safety | = |
| hq-nutrition | Nutrition Labels | = |
| hq-cold-chain | Cold Chain | = |
| hq-recall | Recall & Trace | = |
| hq-food-intelligence | Food Intelligence | = |
| distribution | Distribution | 🚚 |
| pricing | Pricing | 💲 |
| costing | Costing | 🧮 |
| pl | P&L | 📉 |
| balance-sheet | Balance Sheet | ⚖️ |
| forecast | Forecast | 🔮 |
| analytics | Analytics | 📈 |
| geo-analytics | Geo Analytics | 🗺️ |
| retailer-health | Retailer Health | 🏆 |
| reorder | Reorder | 🔔 |
| loyalty | Loyalty | 💎 |
| fraud | Fraud & Security | 🛡️ |
| documents | Documents | 📄 |
| medical | Medical | ⚕️ |
| wholesale-orders | Wholesale Orders | — |
| shops | Shops | 🏪 |

### useNavConfig.js — HQ Finance Group (12 items)
Pricing · Costing · P&L · Balance Sheet · Invoices · Journals · Bank Recon · Fixed Assets · Expenses · Forecast · VAT · Year-End Close

### Tenant Portal (TenantPortal.js) — CANNABIS_RETAIL_WATERFALL
**Dashboard section:** overview
**Inventory section:** stock · catalog
**Ordering section:** procurement · wholesale
**Operations section:** trading · cashup · smart-capture
**Sales section:** pos · pricing · loyalty · invoices
**Customers section:** profiles · qr-codes · messaging
**Reports/Intelligence section:** pl · expenses · analytics · reorder · balance-sheet · fixed-assets · fin-statements · journals · vat · bank-recon · fin-notes · costing · forecast · year-end
**People section:** staff · roster · timesheets · leave · contracts · payroll · calendar

### Admin Dashboard (AdminDashboard.js) — 13 Tabs
Overview · Batches · Stock · Shipments · Customers · Comms · Notifications · QR Codes · Analytics · Security · Users · Documents · HR

---

## SECTION 7: FINANCIAL SYSTEM — COMPLETE CAPABILITY

### WP-FINANCIALS — All 10 Phases Complete

#### Phase 0: Financial Setup Wizard (HQFinancialSetup.js — 436 lines)
- 5-screen wizard: Business Details → Financial Year → VAT → Bank Account → Opening Position
- Saves to tenant_config + equity_ledger
- Gates all financial statements (financial_setup_complete = true required)

#### Phase 2: Income Statement (HQProfitLoss.js — 2,750 lines)
- Revenue: from orders WHERE status='paid'
- COGS: order_items × product_metadata.weighted_avg_cost (AVCO)
- Gross Profit with margin %
- Operating Expenses: from expenses table, grouped by subcategory
- IFRS layout toggle: Dashboard View / IFRS Statement View
- Subcategory-to-CoA account mapping (SUBCATEGORY_TO_ACCOUNT)
- "Gross Profit by Product" top 10 analysis
- Depreciation line from depreciation_entries

#### Phase 3: Balance Sheet (HQBalanceSheet.js — 1,490 lines)
- Assets: Cash (bank recon) + Inventory (AVCO) + Receivables + PP&E (cost - accum dep)
- Liabilities: Trade Payables (open POs) + VAT Payable (from vat_transactions — NOW LIVE)
- Equity: Share Capital + Opening Retained Earnings + Current Year P/L (from equity_ledger)
- Accounting equation check badge (Assets = Liabilities + Equity)
- Fixed assets from fixed_assets table (Cost/AccDep/NBV)

#### Phase 4: Fixed Asset Register (HQFixedAssets.js — 479 lines)
- 3 assets: Shop Fitout R45k · Display Refrigerator R12.5k · Security Camera R8.9k
- Straight-line depreciation: monthly charge = (cost - residual) / (life_years × 12)
- Depreciation % progress bar per asset
- "Run Depreciation" modal: month/year selector, per-asset preview, dedup check
- Posts to depreciation_entries + updates fixed_assets (accum_dep, NBV)
- IAS 16 Balance Sheet PP&E note

#### Phase 5: Journal Entry Module (HQJournals.js — 715 lines)
- Journal list with expand-to-lines (DR/CR totals, balance check)
- Type badges: AUTO-CAPTURE / MANUAL / DEPRECIATION / YEAR-END / ACCRUAL
- Status filter + type filter + financial year filter
- New Journal modal: COA picker grouped by 5 account types
- Auto-generated reference: JNL-YYYYMMDD-NNN
- Balance validation (DR = CR) enforced before Post
- Post / Reverse (flips DR↔CR) / Delete Draft with confirm dialog
- Status workflow: Draft → Posted → Reversed (with confirm modals)

#### Phase 6: VAT Module (HQVat.js — 620 lines)
- VAT201 return view: SARS Fields 1, 4, 12, 16, 20
- Dashboard: 6 bi-monthly period cards (P1-P6), YTD totals
- Data Sources panel: output verified from orders, input from expenses + stock receipts
- Filed persistence: vat_period_filings table, submission_ref, survives refresh
- Period Close: deletes source='seeded', inserts source='calculated'
- SourceBadge: seeded (amber) / calculated (green)
- Export CSV with source column
- Data quality warnings (zero output + seeded input)
- Gate: tenant_config.vat_registered = true

#### Phase 7: Bank Reconciliation (HQBankRecon.js — 418 lines)
- FNB account card with reconciled closing balance R180,733.69
- 22 statement lines with match type badges (ORDER/EXPENSE/PO/UNMATCHED)
- Filters: matched status / match type / import batch
- Inline categorise for unmatched lines (saves matched_type + matched_at)
- Unmatched summary panel with per-line Categorise CTAs
- Balance Sheet Cash at Bank note

#### Phase 8: Notes to Financial Statements (HQFinancialNotes.js — 201 lines)
- 15 IFRS disclosure notes from live Supabase data
- Collapsible NoteSection components
- Auditor details from tenant_config

#### Phase 9: PDF Export (HQFinancialStatements.js — 476 lines)
- 4 IFRS statements in unified shell:
  1. Income Statement (Statement of Comprehensive Income)
  2. Balance Sheet (Statement of Financial Position)
  3. Cash Flow Statement (simplified indirect method)
  4. Statement of Changes in Equity
- Status workflow: Draft → Reviewed → Auditor Signed Off → Locked
- Print/Save PDF via React portal (createPortal to document.body)
- @media print CSS hides #root, shows portal, A4 page breaks
- Period selector: FY2026 / FY2025 / Custom date range
- financial_setup_complete gate
- Balance Sheet VAT payable reads real vat_transactions

#### Phase 10: Year-End Close (HQYearEnd.js — 338 lines)
- 4-screen wizard: Summary → Closing Journal Preview → PIN Confirm → Archive Report
- Posts closing journal (Dr Revenue → Cr Retained Earnings)
- Archives to financial_year_archive
- Locks journal entries for the FY
- Marks equity_ledger year_closed

### VAT Pipeline Architecture (P3-A + P3-B + P3-C)
Three automated entry points, all trigger-based:
1. **Expenses** (P3-A): ExpenseManager → expenses.input_vat_amount → expense_vat_sync trigger → vat_transactions
2. **Stock Receipts** (P3-B): StockReceiveModal → stock_receipts.input_vat_amount → receipt_vat_sync trigger → vat_transactions
3. **Smart Capture** (P3-C): process-document EF extracts VAT → auto-post-capture writes expenses.input_vat_amount → trigger fires automatically

---

## SECTION 6: QR SYSTEM — COMPLETE CAPABILITY

### QR Code Generation (AdminQRCodes.js — 4,750 lines)
- **Inputs for generation:** product (inventory_item), batch, QR type (product/batch/scan), quantity
- **Bulk generation:** Up to 100 codes per batch (configurable)
- **Signing:** HMAC-SHA256 via sign-qr Edge Function — payload includes product_id, batch, type, nonce
- **Storage:** qr_codes table — code string, product link, batch link, is_active
- **Print/Export:** Single QR print, bulk PDF with configurable label dimensions
- **Landing pages:** Scanned codes redirect to /scan/:qrCode → ScanResult.js

### QR Scanning (ScanResult.js — 2,142 lines + verify-qr EF)
- **Verification:** HMAC-SHA256 signature validation via verify-qr EF
- **Data collected on scan:** GPS coordinates, timestamp, device/user agent, IP, scan count
- **Fraud detection:** Velocity checking (rapid scans from same device), anomaly scoring
- **Loyalty integration:** Points awarded per scan — pts = qr_scan_pts × category_mult × tier_mult × campaign_mult
  - Writes to loyalty_transactions (increment_loyalty_points RPC)
  - Tier upgrade check after points award
  - WhatsApp notification on tier upgrade (send-notification EF)
- **Timesheet/Clock-in:** Not directly in QR system — timesheets are a separate HR module (HRTimesheets.js)
- **Packaging workflow:** QR codes designed for product packaging labels
- **Analytics:** scan_logs table (181 rows) — tracked by AdminAnalytics.js scan analytics tab

### QR Cryptographic Method
- **Algorithm:** HMAC-SHA256
- **Key:** Environment variable (HMAC_SECRET) on sign-qr EF
- **Payload:** JSON-encoded product/batch data + nonce
- **Verification:** verify-qr EF recomputes HMAC and compares
- **Important:** JWT verify MUST be disabled after every EF redeploy (critical operational rule)

---

*LIVE-AUDIT v1.0 Part 2 · NuAi · 09 Apr 2026*
*Sections: 2 (Routes) · 3 (Navigation) · 6 (QR System) · 7 (Financial System)*
