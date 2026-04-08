# CLAUDE.md — NuAi Platform Context
# Read this before writing any code. Updated: 09 Apr 2026.

---

## WHAT THIS SYSTEM ACTUALLY IS

NuAi is NOT a cannabis retail website. It is a production multi-tenant SaaS ERP.

224,293 lines of code · 190 files · 109 database tables (all RLS-secured)
6 distinct user portals · 10 cloud edge functions · 4 industry profiles
41 HQ tabs · 17 stock components · 13 HR modules · 10 major systems all live

Every task is a small increment on a large, complete system.
Read docs/PLATFORM-OVERVIEW_v1_0.md for the full picture before any task.

---

## STACK & REPO

Product:    NuAi — multi-tenant SaaS ERP (cannabis, food/bev, general retail, medical)
Stack:      React (CRA) + Supabase (PostgreSQL) + Vercel
Repo:       github.com/GFive5y/protea-botanicals · branch: main
Dev:        localhost:3000
Prod:       protea-botanicals.vercel.app
Supabase:   uvicrqapgzcdvozxrreo
Medi Rec:   b1bad266-ceb4-4558-bbc3-22cfeeeafe74 (ON HOLD)
HQ tenant:  43b34c33-6864-4f02-98dd-df1d340475c3
HEAD:       9939421 (verify with: git log --oneline -1)

---

## OWNER PROFILE

Non-technical. Uses Claude.ai chat interface for strategy and architecture.
Claude Code (this context) handles all file edits, commits, and pushes.
Terminal: PowerShell — NEVER use && (use separate lines or semicolons).
Build: CI=false npm run build (Vercel env var set).

---

## THE SIX PORTALS

/hq           — HQ Command Centre: 41 tabs, cross-tenant operator view
/tenant-portal — Business owner: ~35 tabs, industry-adaptive waterfall nav
/admin         — Store manager: 13 tabs
/hr            — HR Suite: 13 modules
/shop          — Consumer storefront: e-commerce + loyalty + PayFast
/staff         — Staff self-service: 4 tabs

---

## MAJOR SYSTEMS — ALL LIVE

### 1. Financial Suite (WP-FINANCIALS — ALL 10 PHASES COMPLETE ✅)
Live figures: R477,880 revenue · 62.13% gross margin · R296,606 net profit

HQProfitLoss.js v4     — IFRS Income Statement, AVCO COGS from order_items
HQBalanceSheet.js v2   — Assets = Liabilities + Equity, VAT payable live
HQFixedAssets.js       — IAS 16, straight-line depreciation, R59,774 NBV
HQJournals.js          — Double-entry, COA picker, post/reverse/delete
HQVat.js v2            — VAT201, 3-point automated pipeline, period close
HQBankRecon.js         — R180,733.69 FNB reconciled, 22 lines
HQFinancialStatements.js — 4 IFRS statements, print/PDF
HQFinancialNotes.js    — 15 IFRS disclosure notes from live data
HQYearEnd.js           — 4-step close wizard, closing journal, lock/archive
HQFinancialSetup.js    — 5-screen wizard, gates all statements

### 2. VAT Pipeline — ALL 3 POINTS COMPLETE ✅
P3-A: expenses.input_vat_amount → expense_vat_sync trigger → vat_transactions
P3-B: stock_receipts.input_vat_amount → receipt_vat_sync trigger → vat_transactions
P3-C: Smart Capture → auto-post-capture writes input_vat_amount → trigger fires

### 3. Smart Capture
HQDocuments.js / HQSmartCapture.js + process-document EF (v53) + auto-post-capture EF (v2)
AI reads invoice → 6-level HMAC anti-fraud fingerprint → atomic expense + journal + VAT

### 4. QR Authentication
AdminQRCodes.js (4,750 lines) + sign-qr EF (v36) + verify-qr EF (v34)
HMAC-SHA256 signing · GPS + device capture on scan · velocity fraud detection
Loyalty points on scan · 181 scans · 60 active codes

### 5. Inventory (17 components, 33,000+ lines)
AVCO recalculated by DB trigger on every stock movement
14 Product Worlds · Smart Catalog (SmartInventory.js 5,343 lines)
Smart search syntax: price>500, qty:0, brand:RAW
AI reorder scoring · 3-step receiving · inter-store transfers · COGS builder

### 6. Loyalty + AI Engine
HQLoyalty.js (4,537 lines) · loyalty-ai EF (v2)
Nightly AI: churn rescue, birthday, stock boost · 401 transactions
WhatsApp notifications via Twilio (send-notification EF v37)

### 7. ProteaAI (LOCKED — 2,346 lines)
3 tabs: Chat · natural language DB Query · Dev error monitor
ai-copilot EF v59. ALL AI calls go through this EF only. Never direct from React.

### 8. HR Suite (13 modules, 21,583 lines)
Timesheets · Leave (BCEA) · Roster · Performance · Loans · Disciplinary
Contracts · Payroll (SimplePay CSV) · Calendar (SA public holidays)

### 9. Industry Profiles (4 profiles, 26 files with branching)
cannabis_retail · cannabis_dispensary · food_beverage · general_retail
food_beverage exclusive: 16,085 lines (HACCP, SA R638, cold chain, recall, DAFF ingredients)

### 10. Consumer Shop
Age gate · PayFast · Loyalty redemption · 7 cannabinoid molecule visualisers

---

## EDGE FUNCTIONS — CURRENT VERSIONS

process-document    v53  — AI Smart Capture (Anthropic claude-sonnet-4-20250514)
auto-post-capture   v2   — Atomic expense + journal (VAT via trigger, not direct insert)
ai-copilot          v59  — All ProteaAI queries
loyalty-ai          v2   — Nightly AI loyalty engine
sim-pos-sales       v4   — POS sales simulator
sign-qr             v36  — HMAC-SHA256 QR signing
verify-qr           v34  — QR verification + scan logging
get-fx-rate         v35  — Live USD/ZAR, 60s cache, R18.50 fallback
send-notification   v37  — WhatsApp via Twilio (7 business triggers)
receive-from-capture v1  — Stock receive from Smart Capture

---

## LOCKED & PROTECTED FILES

LOCKED (never modify — Claude.ai str_replace only for specific fields):
  src/components/StockItemModal.js    — 14 product worlds, custom fields per world
  src/components/ProteaAI.js          — CODEBASE_FACTS str_replace only
  src/components/PlatformBar.js       — cross-portal intelligence bar
  src/services/supabaseClient.js      — Supabase client init

PROTECTED (read the full file before any change):
  src/components/hq/HQStock.js        — 5,890 lines, 7 tabs, 11 sub-components
  src/components/hq/LiveFXBar.js      — 2,078 lines, always-on FX ticker

---

## CRITICAL RULES (LL LIST — cumulative)

### RULE 0Q — ABSOLUTE (4 violations already: VL-007/008/010/011)
NEVER write files to GitHub from Claude.ai using push_files or create_or_update_file.
All code changes go via Claude Code (this context) only.

### Database
Rule 0F:  Every INSERT to tenant-scoped table MUST include tenant_id
Rule 0H:  Fix the CODE not the data (except corrupt legacy + root fix)
LL-131:   Never hardcode tenant UUID — always use tenantId prop/hook
LL-181:   inventory_items has NO notes column — never include in INSERT/UPDATE
LL-182:   category is enum — SQL needs ::inventory_category cast

### LL-205 — HQ OPERATOR RLS BYPASS (mandatory for all new tables)
Every new DB table needs:
  CREATE POLICY "hq_all_[table]" ON [table] FOR ALL TO public USING (is_hq_user());
Tables already patched (12 — do NOT re-patch):
  journal_entries · journal_lines · vat_transactions · fixed_assets ·
  bank_accounts · bank_statement_lines · expenses · depreciation_entries ·
  chart_of_accounts · equity_ledger · vat_period_filings · financial_statement_status
Symptom when missing: HQ tab shows 0 data despite confirmed rows in DB.

### LL-206 — useTenant CORRECT PATTERN
  const { tenant } = useTenant(); const tenantId = tenant?.id;
  NEVER: const { tenantId } = useTenant();

### LL-207 — No tenantId props on HQ child components
HQ child components call useTenant() directly. Never pass tenantId as a prop.

### LL-208 — Enumerate ALL tables before any migration
Before any new migration: list every table the feature will query.

### Navigation
LL-178:   Never replace renderTab case without listing everything lost + owner confirm
LL-179:   New screens = new nav entries only — never replace existing cases
WATERFALL: CANNABIS_RETAIL_WATERFALL and WATERFALL are separate configs in TenantPortal.js.
           Patch both when adding a new tab.

### React
LL-172:   Never remove code for linter — use eslint-disable comment
LL-174:   CATEGORY_LABELS/ICONS from ProductWorlds.js — never define locally
useMemo:  Any derived object used as useCallback/useEffect dependency MUST be
          wrapped in useMemo. Inline = new reference every render = infinite loop.

### JSX
JSX UNICODE: \u2014 and \u00b7 do NOT render in JSX text nodes.
             Use literal characters: — and · directly.

### Purchase Orders
purchase_orders has TWO status columns:
  po_status: lifecycle (pending/confirmed/ordered/received/complete) — ALWAYS use this
  status: general enum — NEVER use for procurement filtering

### PowerShell
LL-183:   Never use && in PowerShell — use separate lines or semicolons

### Session Protocol
LL-173:   Always show diff + plain English before touching any file
Rule 0K:  Before touching any renderTab case — list all features, get owner confirm
Rule 0L:  Before building any inventory component — read HQStock.js first

---

## DB SCHEMA — KEY FACTS

inventory_items columns:
  id, tenant_id, name, category (enum::inventory_category), sell_price,
  weighted_avg_cost, quantity_on_hand, image_url, is_active, is_featured,
  display_order, loyalty_category, supplier_id, expiry_date,
  reorder_level, max_stock_level, needs_reorder (bool), on_order (bool),
  sku, brand, variant_value, subcategory, variant_type, tags,
  created_at, updated_at
  ❌ NO notes column (LL-181)
  ❌ category is enum — always cast with ::inventory_category (LL-182)

expenses columns (key additions):
  input_vat_amount NUMERIC — triggers expense_vat_sync → vat_transactions
  vat_transaction_id — linked after trigger fires

stock_receipts:
  input_vat_amount NUMERIC DEFAULT 0 — triggers receipt_vat_sync

suppliers:
  vat_registered BOOLEAN DEFAULT NULL
  vat_number TEXT

RLS: enabled on ALL 109 tables. tenant_id on every INSERT (Rule 0F).
DB functions: calculate_avco · increment_loyalty_points · check_reorder ·
              reserve_stock · release_reservation · is_hq_user · get_vat_period
DB triggers: expense_vat_sync · receipt_vat_sync · stock_movement_stamp ·
             reorder_check · loyalty_dedup_guard · trg_loyalty_tier

---

## CURRENT PRIORITIES

P1 — WP-REORDER Phase 1
     Spec: docs/WP-REORDER_v1_0.md — read before starting
     Velocity-based reorder engine, stock alerts, procurement nudges
     Thinking session before any build

P2 — WP-DASHBOARD-IB
     Spec: docs/WP-DASHBOARD-IB_v1_0.md
     Inbox-style dashboard for branch/store managers

P3 — ProteaAI CODEBASE_FACTS update
     str_replace only — ProteaAI.js is LOCKED
     Update EF versions + platform scale numbers

Medi Rec — ON HOLD until further notice

---

## OWNER ACTIONS (URGENT — still pending)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- pg_cron loyalty-ai nightly: see docs/NUAI-AGENT-BIBLE.md Section 8
- Run Depreciation: HQFixedAssets → catch up 15-23 months per asset
- Yoco live keys: portal.yoco.com (after CIPRO registration)

---

## SESSION PROTOCOL

1. Read this file (done)
2. Read docs/PLATFORM-OVERVIEW_v1_0.md — full system picture
3. Read docs/SESSION-STATE_v216.md — current state and HEAD
4. Read docs/VIOLATION_LOG_v1_1.md — what went wrong before
5. Verify HEAD: git log --oneline -1
6. Show diff + plain English before any file change
7. Build must pass: CI=false npm run build
8. PowerShell: never use && — use separate lines
9. Commit after every working change — never batch large commits

---

## VERCEL + DEPLOYMENT

Build:     CI=false npm run build
Env vars:  REACT_APP_SUPABASE_URL · REACT_APP_SUPABASE_ANON_KEY · CI=false
Deploy:    git push to main → Vercel auto-deploys

---

*CLAUDE.md · NuAi · 09 Apr 2026*
*HEAD: 9939421*
*WP-FINANCIALS: COMPLETE. VAT pipeline: COMPLETE. Medi Rec: ON HOLD.*
*Next: WP-REORDER Phase 1 — read spec first.*
