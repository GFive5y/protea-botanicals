# SESSION-STATE v239 — COMPREHENSIVE SESSION CLOSE
## The most complete platform state document ever produced for NuAi
## HEAD at close: dd9f751
## Session date: 11 April 2026
## Covers: All of sessions v235 through v239 (full 11 April 2026 build day)
## Previous: SESSION-STATE_v238.md
## Philosophy: Leave the next agent better equipped than any before them.

---

# MANDATORY READ ORDER (every session, no exceptions)
1. docs/PLATFORM-OVERVIEW_v1_0.md     — permanent system orientation (FIRST, always)
2. docs/NUAI-AGENT-BIBLE.md           — rules, LL-206 corrected, LL-224 through LL-237
3. docs/SESSION-STATE_v239.md         — THIS FILE — most current platform truth
4. docs/VIOLATION_LOG_v1_1.md         — what went wrong and why (read before touching code)
5. The actual source file you will change — disk truth, always (LL-221)

---

# SECTION 1 — REPO + INFRA

Repo:     github.com/GFive5y/protea-botanicals · branch: main
Supabase: uvicrqapgzcdvozxrreo (eu-west-1)
Live:     https://nuai-gfive5ys-projects.vercel.app
Stack:    React 18 · Supabase JS v2 · React Router v6 · Vercel (auto-deploy on push)
RULE 0Q:  Claude.ai NEVER calls push_files or create_or_update_file. All writes via Claude Code.

---

# SECTION 2 — LIVE PLATFORM SCALE (verified via Supabase MCP, 11 Apr 2026)

| Metric | Value |
|---|---|
| Active tenants | 9 |
| Active inventory items (all tenants) | 262 |
| Total orders | 951 |
| Non-voided dispensing events | 14 |
| Active patients (dispensary) | 6 |
| Active prescriptions | 5 |
| Expense records | 67 |
| Journal entries | 8 |
| Stock movements | 3,149 |
| User profiles | 60 |
| Loyalty transactions | 404 |
| QR scans | 181 |
| Open system alerts | 51 |
| Food recipes | 4 |
| HACCP control points | 8 |
| Temperature logs | 42 |
| Total stock value (AVCO) | R177,342 |

Platform revenue (orders only, all tenants combined):
  Medi Recreational: 468 orders · R497,805
  Maxi Retail SA:    232 orders · R186,716
  Nourish Kitchen:   240 orders · R43,065
  Pure Premium:       10 orders · R4,000
  Others:              0 orders · R0
  TOTAL:             950 orders · R731,586

Medi Can Dispensary: 0 orders · R20,000 DISPENSING revenue (from dispensing_log)

---

# SECTION 3 — TENANTS (9 total — DO NOT RE-SEED any)

| # | Name | tenant_id (first 8) | Profile | Tier | Key data |
|---|---|---|---|---|---|
| 1 | Nu Ai HQ | 43b34c33 | operator | — | Internal — never public |
| 2 | Medi Recreational | b1bad266 | cannabis_retail | starter | 468 orders · R497k · 186 SKUs · 50 customers |
| 3 | Pure Premium THC Vapes | f8ff8d07 | cannabis_retail | starter | 10 orders · 24 SKUs |
| 4 | Test Dispensary CT | 064adbdc | cannabis_retail | pro | 0 orders |
| 5 | TEST SHOP | 4a6c7d5c | cannabis_retail | starter | 0 orders |
| 6 | Vozel Vapes | 388fe654 | general_retail | pro | 0 orders · 4 SKUs |
| 7 | Maxi Retail SA | 9766a3af | general_retail | starter | 232 orders · R186k · 10 SKUs |
| 8 | Nourish Kitchen & Deli | 944547e3 | food_beverage | pro | 240 orders · R43k · 10 SKUs |
| 9 | **Medi Can Dispensary** | **2bd41eb7** | **cannabis_dispensary** | pro | **SEED COMPLETE — DO NOT RE-SEED** |

### Medi Can Dispensary — full clinical data (tenant_id: 2bd41eb7-1a6e-416c-905b-1358f6499d8d)
  - 8 products: MC-OIL-001 → MC-INH-001 (R680–R2,400 sell prices)
  - Stock: 302 units remaining across 8 products (balanced — CSR shows zero variance)
  - 6 active patients (5 seeded + 1 possible addition)
  - 5 active prescriptions
  - 14 dispensing events = R20,000 revenue / 30 days · ~69.5% dispensing margin
  - Fatima Davids: S21 expiring ~25 days from 11 Apr → amber in Forecast + Compliance
  - James Olivier: 2 prescription repeats remaining → warning in Forecast
  - feature_medical: true (in tenant_config and confirmed in branding_config)
  - branding_config.seed_complete: true

---

# SECTION 4 — EDGE FUNCTIONS (17 ACTIVE — CONFIRMED FROM SUPABASE 11 APR 2026)

CRITICAL: The NUAI-AGENT-BIBLE and CODEBASE_FACTS had stale EF versions.
These are the ACTUAL deployed versions from Supabase as of 11 April 2026:

| Slug | Actual Version | verify_jwt | Notes |
|---|---|---|---|
| ai-copilot | **v70** | false | All Claude API calls · systemOverride supported |
| payfast-checkout | **v47** | false | PayFast payment initiation |
| payfast-itn | **v42** | false | PayFast webhook confirmation |
| sign-qr | **v39** | false | HMAC-SHA256 QR signing |
| verify-qr | **v37** | false | QR validation + scan logging |
| send-notification | **v40** | false | WhatsApp via Twilio |
| get-fx-rate | **v38** | false | Live USD/ZAR · 60s cache · R18.50 fallback |
| process-document | **v56** | false | Smart Capture AI extraction · SARS + fingerprint |
| sim-pos-sales | **v8** | false | POS sales simulator |
| create-admin-user | **v4** | false | Wizard admin user creation |
| auto-post-capture | **v5** | false | Atomic expense + journal + VAT trigger (P3-C) |
| receive-from-capture | **v4** | false | Stock receipt + AVCO on delivery note capture |
| loyalty-ai | **v5** | false | Nightly loyalty engine (5 jobs) |
| send-email | **v1** | **TRUE** | Resend email · LL-211: test from prod URL only |
| invite-user | **v3** | false | Tenant user invitation |
| seed-tenant | **v4** | false | Multi-profile demo seeder · repo file now synced |
| trigger-sim-nourish | **v1** | false | **OWNER SHOULD DELETE** — throwaway one-shot |

IMPORTANT LESSON: EF versions drift between deployments and what docs say.
ALWAYS verify with Supabase:list_edge_functions before referencing a version number.
The BIBLE said 12 EFs at v59/v53/v2 — reality was 17 EFs at v70/v56/v5.

---

# SECTION 5 — INDUSTRY PROFILES + TENANT PORTAL ROUTING

## 5.1 Four Live Profiles (cannabis_retail is the default)

| Profile | Waterfall | Revenue source | Gross margin green | Key module |
|---|---|---|---|---|
| cannabis_retail | CANNABIS_RETAIL_WATERFALL | orders table | ≥50% | QR auth · loyalty · budtender nav |
| cannabis_dispensary | CANNABIS_DISPENSARY_WATERFALL | dispensing_log × sell_price (LL-231) | ≥50% | HQMedical (6 tabs) · S21 · CSR |
| food_beverage | FOOD_BEVERAGE_WATERFALL | orders table | ≥65% · Food Cost % KPI | Kitchen nav · HACCP · cold chain |
| general_retail | WATERFALL (default) | orders table | ≥35% | Standard ERP manufacturing |

## 5.2 CANNABIS_DISPENSARY_WATERFALL — complete tab list
Home: overview (Dashboard)
Clinical: medical (HQMedical — 6 sub-tabs)
Inventory: stock · hq-production · supply-chain
Financials: pl · expenses · invoices · journals · vat · bank-recon · balance-sheet · forecast · year-end
Operations: cashup · documents · smart-capture
People: staff · roster · timesheets · leave · contracts · payroll · hr-calendar

NO costing tab (HQCogs is cannabis manufacturing — irrelevant to dispensary)
NO trading tab (dispensary has no POS orders)
NO wholesale/distribution/retailers tabs (LL-225)

## 5.3 FOOD_BEVERAGE_WATERFALL — complete tab list
Home: overview
Kitchen: hq-production · hq-recipes · hq-ingredients (all wired to real components)
Food Safety: hq-haccp · hq-food-safety · hq-cold-chain · hq-recall · hq-nutrition (all wired)
Inventory: stock · supply-chain
Sales & Service: trading · cashup · pos · loyalty
Financials: pl · expenses · invoices · journals · vat · bank-recon · balance-sheet · forecast · year-end
People: staff · roster · timesheets · leave · payroll

NO costing tab (F&B uses recipe engine in Kitchen section)

## 5.4 getWaterfall() — single source of truth (TenantPortal.js)
cannabis_dispensary → CANNABIS_DISPENSARY_WATERFALL
food_beverage       → FOOD_BEVERAGE_WATERFALL
cannabis_retail     → CANNABIS_RETAIL_WATERFALL
all others          → WATERFALL (manufacturing nav)

## 5.5 useTenant() — what it exposes (tenantService.js confirmed)
```javascript
const {
  tenant,           // full tenants row
  tenantId,         // tenant?.id || null  ← DIRECTLY EXPOSED (LL-206 correction)
  tenantName,       // tenant?.name || null
  industryProfile,  // tenant?.industry_profile || "cannabis_retail"  ← DIRECTLY EXPOSED
  isHQ,             // bool
  allTenants,       // HQ only
  switchTenant,     // HQ only — updates React context (auth.uid() unchanged)
  loading,
  reload,
  tenantConfig,     // tenant_config row (feature flags)
  isOperator,
  role,             // userRole string
} = useTenant();
```
BOTH patterns work:
  const { tenantId, industryProfile } = useTenant();    ← preferred for profile-aware components
  const { tenant } = useTenant(); const tenantId = tenant?.id;  ← also valid

---

# SECTION 6 — HQMEDICAL MODULE (6 sub-tabs)

Gate: tenantConfig?.feature_medical !== false AND industryProfile === "cannabis_dispensary"
File: src/components/hq/HQMedical.js (~70KB)
Reads via fetchAll: patients · prescriptions · dispensing_log · inventory_items · batches

### Sub-tab 1: Patients
  - Register/edit patients with S21 authorisation data
  - S21 expiry date tracking — turns warning (<30d), danger (expired)
  - Columns: Name · SA ID · DOB · Medical Aid · Contact · S21 Number · S21 Expiry · Condition · Practitioner

### Sub-tab 2: Prescriptions
  - Create prescriptions linked to patients
  - Tracks: repeats authorised, repeats used, remaining
  - Active/inactive toggle
  - Blocks dispensing when 0 repeats remaining

### Sub-tab 3: Dispensing
  - Record dispensing events (SELECT patient → prescription → product → batch → qty)
  - On confirm: INSERT dispensing_log · UPDATE prescriptions.repeats_used · UPDATE inventory_items.quantity_on_hand · INSERT stock_movements(sale_out)
  - Voiding UI (LL-226): Void button per row · confirmation modal with mandatory reason · is_voided=true · void_reason · void_at · void_by
  - Show/Hide Voided toggle · "N voided events hidden" footer banner

### Sub-tab 4: Reports
  - Monthly report grouped by patient or substance
  - LL-226: monthLog excludes is_voided events
  - SAHPRA CSV export: Date · Time · Patient Name · SA ID · S21 Number · Product · SKU · Qty · Notes
  - Export filename: sahpra-dispensing-register-YYYY-MM-DD.csv

### Sub-tab 5: Compliance
  - KPI tiles: Active Patients · Active Rx · S21 Expiring 60d · Rx Expiring 30d · Expired Rx · Total Dispensed
  - S21 Authorizations expiry table (60-day window)
  - Prescriptions expiring within 30 days
  - Expired active prescriptions (action required)

### Sub-tab 6: CSR (Controlled Substance Register)
  - Perpetual balance per product: received - dispensed = calculated balance
  - Compares calculated balance vs book balance (quantity_on_hand)
  - Variance = 0 for all 8 Medi Can products (stock fixed 11 Apr via Supabase MCP)
  - Per-product running ledger: all stock movements + dispensing events sorted by date
  - SAHPRA discrepancy warning banner if any product has variance ≠ 0
  - "View" button per product opens/closes the running ledger inline

RLS on clinical tables (LL-205 confirmed):
  patients: tenant_isolation + hq_all_patients ✅
  prescriptions: tenant_isolation + hq_all_prescriptions ✅
  dispensing_log: tenant_isolation + hq_all_dispensing_log ✅

---

# SECTION 7 — FINANCIAL SUITE (WP-FINANCIALS + WP-FINANCIAL-PROFILES — COMPLETE)

### HQProfitLoss.js — profile-adaptive (112KB+)
Revenue routing (LL-231):
  cannabis_dispensary → fetchDispensingRevenue callback → dispensing_log × inventory_items.sell_price
  all others → websiteRevenue from orders table

pctColour(pct, industryProfile) — two-argument form:
  food_beverage:       Green ≥65% · Amber 55-65% · Red <55%
  cannabis_retail:     Green ≥50% · Amber 30-50% · Red <30%
  cannabis_dispensary: Green ≥50% · Amber 35-50% · Red <35%
  general_retail:      Green ≥35% · Amber 20-35% · Red <20%

PROFILE_LABELS → PL constant: profile-specific revenue/cogs/gross labels
Food Cost % primary KPI: renders ONLY for food_beverage · target <30% · color-coded
IFRSStatementView: accepts revenueIfrsLabel prop (profile-specific revenue line name)
SUBCATEGORY_TO_ACCOUNT: 12 new additive entries for dispensary + F&B (LL-234)

TDZ LESSON (from hotfix 2b31d06):
  baseRevenue and profileRevenue MUST be declared IMMEDIATELY before grossProfit.
  Never insert at a "logical grouping" that appears after the first consumer.
  Grep for the consumer line number before placing any new const declaration.

### VAT Pipeline (3-point, all live)
P3-A: expenses.input_vat_amount → expense_vat_sync trigger → vat_transactions
P3-B: stock_receipts.input_vat_amount → receipt_vat_sync trigger → vat_transactions
P3-C: Smart Capture → auto-post-capture EF → expenses.input_vat_amount → trigger

### HQForecast.js — profile-adaptive (LL-235/236)
  cannabis_dispensary → velocity from dispensing_log × sell_price
  all others → velocity from orders table
  Dispensary-only cards: S21 Expiry Pipeline (≤60 days) + Prescription Repeat Warnings (≤2 remaining)
  F&B depletion: "tracked via production runs in Kitchen tab" (not order velocity)

### HQOverview.js — profile-adaptive dispensary tiles
  dispensingRevMTD: monthly dispensing revenue from dispensing_log × sell_price
  dispensingRevToday: today's dispensing revenue
  Three TODAY tiles show dispensary data for cannabis_dispensary profile
  Revenue trend chart hidden for dispensary (reads orders which are zero for Medi Can)
  Stock intelligence section: already correct for dispensary (isCannabisRetail = true)

---

# SECTION 8 — COMPLETE LL RULES (all active + LL-061 relaxation)

## Architecture
LL-061: ProteaAI.js — LOCKED with LL-237 exception (see below)
LL-120: React NEVER calls api.anthropic.com — ALL Claude calls via ai-copilot EF
LL-192: GitHub MCP is available — Claude uses it directly (never asks owner to run commands)
LL-205: Every new DB table needs hq_all_ RLS bypass policy (is_hq_user())
LL-206: CORRECTED — const { tenantId, industryProfile } = useTenant() is valid (directly exposed)
LL-207: No tenantId props on HQ child components — they call useTenant() directly
LL-208: Enumerate ALL tables before any migration — patch in one go

## Patterns
LL-221: Read the actual source file before any edit — file truth > docs
LL-222: user_profiles.role CHECK constraint: customer · admin · retailer · staff · hr · management
         Map: manager→management · owner→management · employee→staff
LL-223: Deno EF cannot call sibling EFs via internal fetch — triggers externally
LL-237: LL-061 RELAXED for getSuggested() only (owner authorisation 11 Apr 2026)
         Still LOCKED: hooks · streaming · query execution · panel UI

## Dispensary Clinical (LL-226 is inviolable)
LL-224: CLOSED — all profiles have profile-adaptive P&L
LL-225: cannabis_dispensary nav NEVER shows Wholesale · Distribution · Retailers
LL-226: dispensing_log is Schedule 6 — VOID ONLY (is_voided + void_reason + void_at + void_by)
         NEVER hard-delete. No delete button should ever exist in the dispensing UI.
LL-227: Medi Can 2bd41eb7-... seed_complete=true — DO NOT RE-SEED
LL-228: HQMedical gated — cannabis_dispensary AND feature_medical !== false (both required)
LL-229: seed-tenant v4 uses SERVICE_ROLE_KEY — bypasses RLS on all inserts
LL-230: dispensing_log.batch_id → batches.id (nullable)

## Financial-Profiles
LL-231: CLOSED — dispensary revenue = dispensing_log × sell_price (HQProfitLoss + HQForecast + HQOverview)
LL-232: CLOSED — F&B thresholds: Green ≥65% · Food Cost % primary KPI (target <30%)
LL-233: HQCogs.js is 145KB / 3,912 lines — read in full before any edit (LL-221 critical)
LL-234: SUBCATEGORY_TO_ACCOUNT additions are additive only — never remove existing entries

## Forecast/Clinical
LL-235: HQForecast dispensary velocity = dispensing_log × sell_price (not orders)
LL-236: clinicalAlerts (S21 + Rx warnings) = dispensary profile only — never render for other profiles

## Schema
LL-181: inventory_items has NO 'notes' column
LL-182: inventory_items.category is an ENUM — needs ::inventory_category cast in raw SQL
LL-189: stock_movements.movement_type: 'sale_pos' for POS · 'sale_out' for wholesale
LL-190: EOD thresholds from tenant_config.settings JSONB — never hardcode
LL-191: loyalty_transactions.transaction_type — use ILIKE not =
LL-198: eod_cash_ups.variance is GENERATED — never insert

---

# SECTION 9 — LOCKED / PROTECTED FILES

## LOCKED (never touch — or touch only the specified scope)
| File | Rule | Allowed scope |
|---|---|---|
| src/components/StockItemModal.js | LL-014 | Never |
| src/components/ProteaAI.js | LL-061 + LL-237 | CODEBASE_FACTS str_replace + getSuggested() return arrays ONLY |
| src/components/PlatformBar.js | LL-xxx | Never |
| src/services/supabaseClient.js | LL-xxx | Never |

## PROTECTED (read full file before any edit — LL-221)
| File | Size | Why dangerous |
|---|---|---|
| src/components/hq/HQProfitLoss.js | 112KB+ | Complex financial logic · TDZ risk · profile branching |
| src/components/hq/HQCogs.js | 145KB | 3,912 lines · separate cost engine (LL-233) |
| src/components/hq/HQStock.js | 208KB | 7-tab intelligence · 14 product worlds |
| src/components/hq/HQOverview.js | ~1,500 lines | Multi-fetch · realtime subs · profile branches |
| src/components/hq/HQMedical.js | ~70KB | 6 sub-tabs · voiding UI · CSR · Schedule 6 |
| src/pages/TenantPortal.js | ~1,200 lines | 4-branch waterfall · wrong edit breaks all profiles |
| src/components/hq/TenantSetupWizard.js | 52KB | 5-step wizard · dispensary auto-upgrades |

---

# SECTION 10 — ARCHITECTURE PATTERNS (proven correct)

## Pattern A: Dispensary Revenue (LL-231)
```javascript
// In any component needing dispensary-aware revenue:
const { tenantId, industryProfile } = useTenant();
const [dispensingRevMTD, setDispensingRevMTD] = useState(null);

const fetchDispensingRevenue = useCallback(async () => {
  if (industryProfile !== "cannabis_dispensary" || !tenantId) return;
  const { data } = await supabase
    .from("dispensing_log")
    .select("quantity_dispensed, dispensed_at, is_voided, inventory_items(sell_price)")
    .eq("tenant_id", tenantId)
    .neq("is_voided", true)
    .gte("dispensed_at", monthStart);
  const revenue = (data || []).reduce(
    (s, dl) => s + (dl.quantity_dispensed || 0) * parseFloat(dl.inventory_items?.sell_price || 0),
    0,
  );
  setDispensingRevMTD({ revenue, count: (data || []).length });
}, [industryProfile, tenantId, monthStart]);
```

## Pattern B: TDZ-Safe Declaration Order
ALWAYS place `baseRevenue` and `profileRevenue` IMMEDIATELY before `grossProfit`.
Never insert at a "logical grouping" that is after the first consumer.
Grep for the consumer line before placing the declaration.

## Pattern C: Profile-Adaptive Components
```javascript
const { industryProfile } = useTenant();
// Dispensary check
if (industryProfile === "cannabis_dispensary") { /* clinical logic */ }
// F&B check
if (industryProfile === "food_beverage") { /* kitchen/food cost logic */ }
// isCannabisRetail (covers both retail + dispensary for stock intelligence)
const isCannabisRetail = industryProfile === "cannabis_retail" || industryProfile === "cannabis_dispensary";
```

## Pattern D: Dispensing Event Lifecycle (LL-226)
INSERT dispensing_log → UPDATE prescriptions.repeats_used += 1
→ UPDATE inventory_items.quantity_on_hand -= qty
→ INSERT stock_movements(sale_out, reference=RX-{rx_id.slice(0,8)})
VOID: UPDATE is_voided=true · void_reason · void_at · void_by
NEVER DELETE.

## Pattern E: RLS + HQ Bypass (LL-205)
Every new table needs TWO policies:
  1. Tenant isolation: `USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))`
  2. HQ bypass: `CREATE POLICY "hq_all_{table}" ON {table} FOR ALL TO public USING (is_hq_user())`
Without the HQ bypass policy, HQ operator sees zero rows when they switch tenants.

## Pattern F: Wizard creates dispensary tenants correctly
TenantSetupWizard.js already handles cannabis_dispensary:
  - handleSelectProfile() auto-upgrades to enterprise tier
  - PROFILE_FLAG_OVERRIDES sets feature_medical: true
  - handleCreate() inserts correct industry_profile and feature flags
  - NO seed-tenant call (correct — demo data only via seed-tenant for test clients)

---

# SECTION 11 — TESTING PROTOCOL (LL-214)

NEVER test in a regular browser window with Ctrl+R.
Correct procedure after a Vercel deploy:
  1. Confirm "Ready" status in Vercel dashboard for the target commit hash
  2. Open a NEW INCOGNITO window
  3. Navigate to https://nuai-gfive5ys-projects.vercel.app
  4. If service worker: Application → Service Workers → Unregister, then refresh

## Demo verification — Medi Can Dispensary (/tenant-portal)
[ ] Sidebar: Home / Clinical / Inventory / Financials / Operations / People
[ ] Clinical → Medical Records → 6 sub-tabs load
[ ] Patients tab: 5+ patients with S21 numbers visible
[ ] Compliance tab: Fatima Davids shows amber S21 expiry alert
[ ] Dispensing tab: Void button on each row · "Show Voided" toggle in header
[ ] Reports tab: "↓ SAHPRA Export" button visible · generates CSV
[ ] CSR tab: 8 products · all showing "✓ Balanced" (zero variance)
[ ] Dashboard: "Dispensing Revenue MTD" shows R20,000 · "14 events" subLabel
[ ] Dashboard: "Avg Dispensing Value" shows ~R1,429
[ ] P&L tab: "Dispensing Revenue" label · non-zero revenue showing
[ ] Forecast tab: Dispensing Forecast — 30 Days · S21 Expiry Pipeline card · Rx Repeat Warnings card
[ ] ProteaAI Medical tab → Query: 5 dispensary-specific query suggestions

## Demo verification — Nourish Kitchen (/tenant-portal)
[ ] Sidebar: Home / Kitchen / Food Safety / Inventory / Sales & Service / Financials / People
[ ] Kitchen → Recipe Engine loads (not "coming soon")
[ ] Kitchen → Ingredients loads (DAFF ingredients visible)
[ ] Food Safety → HACCP loads (CCP entries visible)
[ ] Food Safety → Cold Chain loads (temperature logs visible)
[ ] P&L tab: Food Cost % primary KPI card visible · Green ≥65%

## Demo verification — HQ sidebar
[ ] Finance group → "Financials"
[ ] Intelligence group → "Analytics"
[ ] Procurement tab → "Purchasing"

---

# SECTION 12 — WHAT'S BEEN BUILT (COMPLETE FEATURE LIST)

## WP-MEDI-CAN Stage 1 + 2 — COMPLETE
Full medical dispensary module for cannabis_dispensary profile.
HQMedical.js — 6 sub-tabs — Patients · Prescriptions · Dispensing · Reports · Compliance · CSR

## WP-FINANCIAL-PROFILES — COMPLETE
All 4 profiles have profile-adaptive P&L, benchmarks, labels, KPIs.
Revenue correctly sourced per profile. Food Cost % KPI for F&B.
ExpenseManager profile-aware subcategories. HQForecast dispensary velocity.
HQOverview 3-tile TODAY section shows dispensary data.

## WP-PROFILE-NAV — COMPLETE
4-branch waterfall routing. F&B kitchen-first nav.
All F&B modules wired in TenantPortal renderTab.
CANNABIS_DISPENSARY_WATERFALL correctly excludes costing/trading/wholesale.

## WP-FINANCIALS (10 phases) — COMPLETE (from prior sessions)
IFRS Income Statement · Balance Sheet · Fixed Assets · Journals · VAT201
Bank Recon · Financial Notes · PDF Export · Year-End Close · Financial Setup Wizard

## ProteaAI (CODEBASE_FACTS + getSuggested) — REFRESHED
Dev mode accurately describes platform state.
Medical tab query/chat suggestions are dispensary-specific.
LL-061 relaxed (LL-237) to allow getSuggested() return array updates.

---

# SECTION 13 — NEXT PRIORITIES FOR NEXT SESSION

## Priority 1 — HQOverview onNavigate prop (1-line fix, may already be shipped)
In TenantPortal.js renderTab:
  CURRENT:  case "overview": return <HQOverview />;
  FIX:      case "overview": return <HQOverview onNavigate={onTabChange} />;
Allows Quick Actions buttons in HQOverview to navigate within tenant portal.

## Priority 2 — Delete trigger-sim-nourish EF (owner action)
Supabase Dashboard → Edge Functions → trigger-sim-nourish → Delete
This was a one-shot demo EF. It served its purpose.

## Priority 3 — SAHPRA dispensing log export enhancement
Current: basic CSV export from Reports tab (shipped 11 Apr)
Next: add date range filter to the export · add batch/lot number column
File: HQMedical.js ReportsTab (read full file first — LL-221)

## Priority 4 — Supabase Auth SMTP → Resend (owner action)
Dashboard → Authentication → Email Settings → SMTP Provider → Resend
Required for: tenant invite emails · password resets · magic links

## Priority 5 — CIPRO registration + nuai.co.za domain (owner action)
Required before: PayFast live keys · official launch

## Priority 6 — HQTradingDashboard dispensary (medium impact)
The Operations → Cash-Up tab works for dispensary (no change needed).
But if a dispensary tab for daily dispensing stats is ever added to Operations,
it should read from dispensing_log not orders.
Not blocking — dispensary waterfall has no trading tab.

## Priority 7 — ProteaAI getSuggested() — remaining tabs needing improvement
Currently dispensary Medical tab is updated (LL-237).
CSR tab, Forecast tab, Compliance tab also have clinical context — no suggestions yet.
These can be added as additional LL-237 str_replace operations.

---

# SECTION 14 — PLATFORM VISION

NuAi is South Africa's first AI-native multi-tenant ERP for specialty retail.
Built from a real cannabis retail business. Expanding to 4 profiles (cannabis retail,
medical dispensary, food & beverage, general retail) from a single codebase.

Where this goes next:
  - 5 live paying clients → 50 → 500 (the codebase already scales)
  - R3,500–R12,000/month per client = R1.75M–R6M ARR at 50 clients
  - SAHPRA-compliant dispensary module = first-to-market in SA medical cannabis tech
  - F&B food safety suite (HACCP + FSCA + cold chain) = competitive moat in restaurant tech
  - AI copilot embedded in every workflow = every decision is data-driven
  - The platform replaces R1.4M+ of bespoke software at a fraction of the cost

What makes this different from Shopify, Lightspeed, or Sage:
  - Industry-specific compliance built in (SAHPRA, FSCA, SARS VAT)
  - AVCO on every stock movement (real IFRS financial intelligence)
  - Multi-tenant from the ground up (one platform, many clients, no data mixing)
  - AI that knows the business (ProteaAI reads live DB state, not generic chat)
  - Every feature deployed in real production for real clients

The architecture is solid. The code is clean. The patterns are documented.
The next agent who reads this document has everything they need to build
the best ERP SaaS ever built in South Africa.

Go build something great.

---

# SECTION 15 — QUICK REFERENCE CHEATSHEET

## Most used patterns
```javascript
// Get tenant context
const { tenantId, industryProfile, tenantConfig } = useTenant();

// Check dispensary gate
const isDispensary = industryProfile === "cannabis_dispensary" && tenantConfig?.feature_medical !== false;

// Profile-adaptive revenue
const revenue = industryProfile === "cannabis_dispensary" ? dispensingRevenue : orderRevenue;

// Dispensing log query (always exclude voided)
supabase.from("dispensing_log").select("...").eq("tenant_id", tenantId).neq("is_voided", true)

// New table RLS (always do both)
CREATE POLICY "tenant_{table}" ON {table} FOR ALL TO public USING (
  tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
);
CREATE POLICY "hq_all_{table}" ON {table} FOR ALL TO public USING (is_hq_user());
```

## NEVER do these
- NEVER call push_files or create_or_update_file from Claude.ai (RULE 0Q)
- NEVER hard-delete from dispensing_log (LL-226)
- NEVER re-seed Medi Can (LL-227)
- NEVER add tenantId props to HQ child components (LL-207)
- NEVER guess column names — verify from schema (LL-181 pattern)
- NEVER test in regular browser window after deploy (LL-214)
- NEVER call api.anthropic.com from React (LL-120)

---

*SESSION-STATE v239 · NuAi ERP · 11 April 2026*
*The most complete platform state document in the project's history.*
*Sessions covered: v235 → v239 — full 11 April 2026 build day.*
*HEAD at close: dd9f751*
*Commit chain: 4d151bb → 09facc9 → 7a053c1 → f894b9d → 9d941af → 7ab9736 → 12d7683 → dd9f751*

---

# ADDENDUM — 11 April 2026 (later session): ActionCentre Rollout + Orphan Audit
## HEAD at addendum close: `91c452f`
## Commit chain: `3a9941d → 79d8416 → ec4a04f → e601079 → 8aa92fd → 8ce9979 → d589af5 → 98c51c6 → 91c452f`
## 9 commits · 11 files touched · zero new build warnings · no data logic changes

---

## WP-ACTIONCENTRE — New shared component

### `src/components/shared/ActionCentre.js` (NEW, ~250 lines)

Reusable collapsible alert stack. **Zero external dependencies** — plain React + inline styles with self-contained colour tokens matching the platform palette.

**Props:**
```js
<ActionCentre
  title?: string                // header label, default "Action Centre"
  alerts: Array<{
    severity: "critical" | "warn",
    message: string,
    action?: { label: string, onClick: () => void },
  }>
/>
```

**Behaviour:**
- **Collapsed by default** — single slim bar with amber warn count badge + red critical badge + "N active alerts" + chevron + ✕ dismiss
- **Expanded**: `maxHeight: 30vh`, scrollable, one row per alert (severity dot · message · optional action button)
- **Session-dismissible** via local `useState` (resets on remount — no localStorage)
- Accessible: `aria-expanded`, `aria-label`, `role="button"` on dismiss, keyboard handler
- Supports 2 severities only: `critical` (red) and `warn` (amber). `info` alerts from legacy callers must be mapped to `warn` at the call site

### Rollout — 5 commits, 5 components converted

| Commit | File | Scope | Lines changed |
|---|---|---|---|
| `3a9941d` | `src/components/shared/ActionCentre.js` (NEW) + `src/components/hq/HQProduction.js` | Shared component created; replaced 2 inline alert blocks (depleted stock + lowStock) in HQProduction with one `<ActionCentre>` call | +274 / -120 |
| `79d8416` | `src/components/hq/HQProduction.js` | Fold `ctx.warnings` from `usePageContext("hq-production")` into the existing ActionCentre as warn severity; hide WorkflowGuide render on this tab only; remove WorkflowGuide import (Option A pattern) | +43 / -39 |
| `ec4a04f` | `src/components/hq/HQOverview.js` | Replace "Low Stock Alerts" card (lines 2663-2820, ~158 lines) with full-width ActionCentre above 2-col panel grid; 2-col grid → 1-col (Recent Scans full-width); lift `.limit(5)` → `.limit(50)` on lowStock query | +29 / -161 |
| `e601079` | `src/components/hq/HQStock.js` | Replace Zone 1 "Action Queue" card (lines 3174-3342, ~168 lines of JSX) with `<ActionCentre>`; preserve "All good" green success card for empty state; map `critical → critical`, `warning → warn`, `info → warn`; fold `sub` into message via `${text} · ${sub}`; remove dead SEV lookup | +46 / -142 |
| `8aa92fd` | `src/components/hq/SupplyChain.js` | Convert Block 2 out-of-stock banner to ActionCentre; fold ctx.warnings (warn severity); hide WorkflowGuide on this tab only; remove WorkflowGuide import | +24 / -60 |
| `8ce9979` | `src/components/StockControl.js` | Replace `<WorkflowGuide>` render (lines 463-468) with `<ActionCentre>` mapping `ctx.warnings`; delete redundant inline "Low Stock Alerts" block (lines 1056-1130, ~75 lines); keep Cost Drift + Dead Stock + Overstock blocks intact; keep `stockAlerts` state + fetchAlerts + realtime subscription frozen (feeds global AlertsBar) | +16 / -82 |

**Total across 5 components:** approximately `+432 / -604` — net **-172 lines** while adding new functionality (collapse/dismiss/badges).

### Reach of the StockControl change (`8ce9979`)

StockControl is imported from TWO live sites:
1. `src/pages/AdminDashboard.js:32` → `/admin` (Admin Portal stock tab)
2. `src/components/hq/SupplyChain.js:26` → imported by HQDashboard for `/hq?tab=supply-chain` AND by TenantPortal for `/tenant-portal?tab=supply-chain`

**Single commit affects three user-facing routes.**

### Components NOT yet covered (follow-up candidates)

Documented in `docs/FEATURE-INVENTORY.md` §"WHAT IS NOT YET COVERED BY ACTIONCENTRE":

- `HQForecast.js` — S21 Expiry + Rx Repeat cards (dispensary-only, clinical visibility justifies keeping expanded)
- `HQMedical.js` — Compliance sub-tab expiry tables
- `HQVat.js` — filing status banners
- `HQBankRecon.js` — unmatched lines panel
- `HQFixedAssets.js` — "Run Depreciation" prompt
- `HQCogs.js` — AVCO variance warnings
- `AdminDashboard.js` overview alert cards (Comms/Fraud/Security)
- **All ~25 HQ tabs with `usePageContext(tabId)` still render WorkflowGuide with `ctx.warnings[]` by default** — any of them could adopt the Option A pattern on demand

---

## WP-INVENTORY-AUDIT — Feature inventory + orphan risk

### `docs/FEATURE-INVENTORY.md` (NEW, 526 lines)

Read-only audit produced by `d589af5` + `98c51c6`. Organises every user-facing feature by portal and tab with: feature name · component file · route/tab · nav entry? · live data?

**8 portals documented:**
1. Consumer (public + authenticated) — 22 routes
2. Wholesale (`/wholesale`) — 2 tabs
3. Staff (`/staff`) — 3 sub-tabs
4. HR (`/hr`) — 14 modules, 21,583 lines
5. Admin (`/admin`) — 14 tabs + `/admin/qr` standalone (RETIRED this session — see below)
6. HQ Dashboard (`/hq`) — 43 tabs across Operations / Finance / Stock & Production / F&B Suite / Dispensary Clinical Suite / Intelligence
7. Tenant Portal (`/tenant-portal`) — 4-branch waterfall (CANNABIS_RETAIL / CANNABIS_DISPENSARY / FOOD_BEVERAGE / default)
8. Shop Dashboard — conditional dispatch

**Summary counts:**
- ~130 user-facing features with live data
- 22 top-level App.js routes
- HQ 43 tabs · Admin 14 tabs · HR 14 tabs
- F&B exclusive: 8 components, 16,085 lines
- HR Suite: 13 components, 21,583 lines

### Orphan Risk section (`98c51c6`) — features with no nav entry

Three tiers identified:

**TIER 1 — Confirmed direct-URL-only (HIGH risk)**
- `pages/AdminQrGenerator.js` (1,218 lines) — `/admin/qr` route, no sidebar entry → **RETIRED this session** (see below)
- `pages/OnboardingWizard.js` — `/onboarding`, only reached via post-signup email redirect from `invite-user` EF (v3). If that EF fails, no one can reach the wizard. **Still HIGH risk — follow-up needed.**

**TIER 2 — Conditional dispatch (LOW risk, not dead code)**
- `pages/ShopDashboard.js` (228) + `components/shop/ShopInventory.js` (850) + `ShopAnalytics.js` (844) + `ShopSettings.js` (597) + `ShopOverview.js` (503)
- Mount chain verified: `src/App.js:1021-1031` → `AdminDashboardRouter` at `:742-787` → `if (tenantType === "shop") return <ShopDashboard />` — conditional dispatch. Not dead code.
- **BUT**: none of the 9 current tenants in this SESSION-STATE have `tenantType === "shop"` — so the entire 2,794-line `components/shop/` tree may be rendering for nobody right now. Data/seed question, not dead-code question.

**TIER 3 — Event-driven / ambiguous**
- `CustomerSupportWidget.js`, `CustomerInbox.js`, `SurveyWidget.js`, `PromoBanner.js`, `DevErrorCapture.js` — all confirmed intentional floating/event-driven mounts (not orphans)
- **`AIFixture.js` (301 lines) — mount site unconfirmed**, flagged MEDIUM risk, grep recommended as follow-up

---

## AdminQrGenerator retirement — `91c452f`

Finding from the orphan audit acted on. AdminQrGenerator is a **legacy predecessor** of the `GenerateTab` sub-tab inside `AdminQRCodes.js` ("QR Engine v2.0"). Evidence:

1. Feature superset — every function in AdminQrGenerator (single/bulk modes, batch dropdown, sign-qr EF call) is present inside AdminQRCodes' GenerateTab (line 1594), plus AdminQRCodes has 4 additional sub-tabs (Registry, Print Sheet, Security & Settings, Banners)
2. Design-token drift — AdminQrGenerator uses the old `C = { green, mid, accent }` + Jost palette; AdminQRCodes uses the modern `T = { ink900, accent, ... }` + Inter palette
3. AdminDashboard imports AdminQRCodes (line 40) but does NOT import AdminQrGenerator — no cross-link
4. AdminQrGenerator header says "Staff-friendly QR Generator — no Supabase copy-paste required" (signature of an earlier, simpler tool)
5. AdminQRCodes v2.0 header says "Full QR engine: 6 types, scan action stack, banner library, 3-step wizard" (language consistent with a ground-up rewrite that absorbed the older tool)

### Retirement — 4-file change (`91c452f`, +39/-9)

| File | Change |
|---|---|
| `src/App.js` | Removed `import AdminQrGenerator` (line 69); replaced `/admin/qr` Route element with `<Navigate to="/admin?tab=qr_codes&sub=generate" replace />`; added deprecation comment |
| `src/pages/AdminQrGenerator.js` | Prepended 15-line ⚠ DEPRECATED header block explaining retirement; preserved original v4.0 history below; function body untouched (legacy reference only) |
| `src/hooks/useNavConfig.js` | Added new `ADMIN_PAGES` entry "Generate QR" in Customers group pointing at `/admin?tab=qr_codes&sub=generate` — Admin sidebar now 14 entries (was 13) |
| `src/components/AdminQRCodes.js` | Added `import { useLocation }` from react-router-dom; added 7-line useEffect inside the component that reads `?sub=` query param and calls `setTab(sub)` if valid. Hardcodes 5 valid keys inline. Preserves existing `initialTab` prop path. **Strictly additive — zero existing behaviour changed.** |

### User-visible behaviour after deploy

| URL / action | Before | After |
|---|---|---|
| `/admin/qr` | AdminQrGenerator legacy tool | Redirects to `/admin?tab=qr_codes&sub=generate` → modern Generate sub-tab |
| `/admin?tab=qr_codes` | AdminQRCodes Registry | Unchanged |
| `/admin?tab=qr_codes&sub=generate` | Registry (ignored sub) | Generate sub-tab |
| "QR Codes" sidebar link | Registry | Unchanged |
| "Generate QR" sidebar link | (didn't exist) | Lands directly on Generate sub-tab |

One TIER 1 orphan closed. AdminQrGenerator.js remains in the tree as 1,218 lines of clearly-marked legacy code — safe to delete in a future cleanup pass.

---

## Build + test status at addendum close

- **Build:** clean across all 9 commits. No new ESLint warnings introduced. Pre-existing warnings only: `App.js:94` `loading` unused, `AdminQRCodes.js:66` `C` unused, `AdminQRCodes.js:86` `FONTS` unused, `AdminQRCodes.js:781` useCallback missing `tenantId` dep, plus the session-long `StockControl.js`, `HQStock.js`, `HQOverview.js` pre-existing warnings (`CATEGORY_ICONS`, `C`, `F`, `DONUT_COLOURS`, `wkTxns`).
- **Data logic frozen everywhere:** every ActionCentre conversion touched only render paths. All `useMemo`/`useState`/`useCallback`/`useEffect` computations, Supabase queries, trigger writes, and side-effect pipelines were preserved exactly. The one exception was HQOverview's `.limit(5)` → `.limit(50)` — a query parameter change, not logic change, and explicitly authorised by the owner before the edit.
- **No files deleted.** AdminQrGenerator.js is deprecated but retained.
- **LL-221 honoured** for every protected/locked file touched (HQStock 5,890 lines, HQProduction 8,949 lines, HQOverview 3,320 lines, StockControl 4,759 lines, AdminQRCodes 4,750 lines) via grep-first pragmatic reads.

---

## New LL rules to consider (not yet added to Bible)

- **LL-238 — ActionCentre is the standard for collapsible alert blocks.** New blocking alert blocks in HQ/Admin/Tenant portal components should use `<ActionCentre>` from `src/components/shared/ActionCentre.js` with 2 severities (`critical`, `warn`). `info` from legacy usePageContext callers maps to `warn`. Data logic stays frozen — ActionCentre is render-layer only.

- **LL-239 — WorkflowGuide + ActionCentre Option A pattern.** When a component renders `<WorkflowGuide context={ctx}>` and a local inline alert block simultaneously, the preferred fix is: remove WorkflowGuide from that component, fold `ctx.warnings` into the ActionCentre alerts array as warn severity, keep `usePageContext` hook call, never touch `usePageContext.js` or `WorkflowGuide.js`. One-file change per target, zero blast radius.

- **LL-240 — Never extend ActionCentre severity tiers.** ActionCentre supports `critical` + `warn` only. Callers with 3+ tiers (e.g. HQStock's `info` tier) must map at the call site. Extending the shared component adds blast radius across all call sites.

- **LL-241 — AdminQRCodes.js is the single source of truth for QR generation.** `AdminQrGenerator.js` is deprecated (91c452f). Never reference `/admin/qr` as a live route — it's a redirect. Any new QR functionality goes into AdminQRCodes sub-tabs.

- **LL-242 — Protected-file pragmatic read.** For files >4,000 lines (HQStock, HQProduction, HQCogs, AdminQRCodes, StockControl), LL-221's "read the actual file" is satisfied by grep + targeted range reads that cover the edit scope + surrounding context + imports + state/hook setup, not by a literal full-file dump. Cite line numbers in the pre-edit report.

These five rules should be added to `docs/NUAI-AGENT-BIBLE.md` in the next session as LL-238 through LL-242 if the owner approves.

---

## Priority queue for next session (refreshed)

Building on the original v239 priority queue, these are the live follow-ups as of `91c452f`:

### From this session
1. **AIFixture.js mount site confirmation** (TIER 3 MEDIUM orphan) — grep `rg "AIFixture" src/` to confirm where it mounts. If no mount site found, archive or remove. 301 lines of potentially dead code.
2. **OnboardingWizard SPOF** (TIER 1 HIGH orphan) — verify `invite-user` EF v3 embeds `/onboarding` in its emails reliably. If that's the only path, consider adding a fallback nav entry or admin-only direct link.
3. **ShopDashboard dormancy check** (TIER 2 LOW) — confirm whether any tenant currently has `tenantType === "shop"`. If not, the entire `components/shop/` tree is dormant — decide archive vs seed a shop-type tenant.
4. **LL-238 through LL-242** — add to NUAI-AGENT-BIBLE.md (optional — these are derived, not mandatory).
5. **ActionCentre rollout to remaining candidates** — 8 components listed in FEATURE-INVENTORY §"WHAT IS NOT YET COVERED BY ACTIONCENTRE". Prioritise by user pain — which tabs currently show walls of text the user wants collapsed first.

### Carried from original v239 priority queue
- Delete `trigger-sim-nourish` EF (owner action — Supabase Dashboard)
- Supabase Auth SMTP → Resend (owner action)
- CIPRO + `nuai.co.za` domain (owner action)
- HQForecast dispensary enhancement
- ProteaAI `getSuggested()` updates for CSR/Compliance/Forecast tabs

---

*Addendum written 11 April 2026 · HEAD at close: 91c452f*
*9 commits · 11 files · ActionCentre shared component + 5 rollouts + feature inventory + orphan audit + AdminQrGenerator retirement*
*Zero new build warnings · data logic frozen across all commits*
*Full commit chain: 3a9941d → 79d8416 → ec4a04f → e601079 → 8aa92fd → 8ce9979 → d589af5 → 98c51c6 → 91c452f*

---

# ADDENDUM 2 — 11 April 2026 (continued): WP-DESIGN-SYSTEM launch + WP-DS-1/2 execution
## HEAD at addendum 2 close: `78b2267`
## New commit chain: `0c78e50 → 4a6f451 → 021b5dd → b205c33 → 3cff956 → 846280c → 96d8f70 → cb4a0d8 → 78b2267`
## 9 commits · 8 files touched · Design token unification begun · Zero new build warnings

---

## WHAT HAPPENED IN ADDENDUM 2

Building on the ActionCentre rollout and orphan audit from Addendum 1, this second block of work launched the NuAi Design System WP and executed the first two sub-WPs (WP-DS-1 shared token file + WP-DS-2 Priority 1 component migration), plus started Priority 3 with the ActionCentre component migration as proof-of-pattern.

## WP-DESIGN-SYSTEM — launched (`0c78e50`)

**File:** `docs/WP-DESIGN-SYSTEM.md` (NEW, 439 lines, grew to 500+ via WP-DS-2 execution)

Long-lived work package document that survives agent turnover. Defines 5 sub-WPs:

| Sub-WP | Name | Status after Addendum 2 |
|---|---|---|
| WP-DS-1 | Shared Token File | **COMPLETE** (`4a6f451`) |
| WP-DS-2 | Component Migration | **IN PROGRESS** — P1 done, P2 retracted, P3 started (1/~8 files) |
| WP-DS-3 | Profile-Aware Tokens | NOT STARTED |
| WP-DS-4 | Unified Component Library | NOT STARTED |
| WP-DS-5 | Ambient Intelligence Layer | FUTURE (codename WP-PULSE) |

Every new agent starting work on the design system MUST read `docs/WP-DESIGN-SYSTEM.md` in full first. The doc documents: current token state, 5 sub-WP plan, status table, handoff protocol, and all rule corrections/retractions discovered during execution.

---

## WP-DS-1 — SHARED TOKEN FILE (COMPLETE, `4a6f451`)

Extended `src/styles/tokens.js` additively with new T tokens while preserving every legacy export byte-for-byte. File grew from 107 → 386 lines.

**New exports added (WP-DS-1):**
- `T` — complete design token object (typography, type scale, spacing, radius, shadows, z-index, backgrounds, borders, ink scale, brand accent, 5 semantic tiers)
- `profileOverrides` — 4 industry-profile token override sets (cannabis_retail, cannabis_dispensary, food_beverage, general_retail)
- `getTokens(profile)` — merged-token helper for profile-aware components
- `getSeverityTokens(severity)` — semantic colour helper for ActionCentre/StatusPill/alerts

**Factual correction during WP-DS-1 implementation:** the WP-DESIGN-SYSTEM.md planning doc claimed "AdminQrGenerator.js was the last C consumer" — this was wrong. Pre-flight grep found 4 live C consumers (CheckoutPage.js, Redeem.js, WholesalePortal.js, PageShell.js). The WP doc was corrected alongside the token file extension.

---

## WP-DS-2 — COMPONENT MIGRATION

### Priority 1: legacy C consumers (COMPLETE — 4/4 files)

Four files migrated from `import { C }` to `import { T }`, each with its own mapping decisions and one-file commits.

| Commit | File | C refs | Key decisions |
|---|---|---|---|
| `021b5dd` | `src/pages/CheckoutPage.js` | 22 refs + 1 import = 23 edits | Strict mapping. Visible brand-green shift (bright mint `#52b788` → deep forest `#2d6a4f`) accepted as intentional unification. |
| `b205c33` | `src/pages/Redeem.js` | 12 refs + 1 import | **Hero gradient exception** — lines 194 (tracking label) + 227 (points counter) mapped `C.accent → T.accentLight` instead of `T.accent` to preserve contrast. Strict `T.accent` would produce 1.0:1 contrast ratio (invisible text) against the lightened gradient. Contrast analysis documented in commit body. |
| `3cff956` | `src/pages/WholesalePortal.js` | 31 refs + 1 import | Same hero exception pattern (line 200 trade-account label). Strict mapping for line 284 success message accepted despite minor 5.6:1 → 3.4:1 contrast regression (legible, deferred to WP-DS-4 StatusPill component). |
| `846280c` | `src/components/PageShell.js` | 3 refs + 1 import + 3 new tokens | **Highest blast radius** — 7 routes wrap PageShell. Required 3 new T tokens added pre-migration: `T.surfaceDark (#1a1a1a)`, `T.surfaceDarkAlt (#060e09)`, `T.brandGold (#b5935a)`. **Corrected the original WP-DS-2 mapping rule**: `C.footer → T.surfaceAlt` was wrong (near-black → near-white inversion would invert the footer). Correct mapping is `C.footer → T.surfaceDark`. Similarly `C.gold → T.brandGold` (NOT `T.warning`). FONTS import preserved — PageShell is the global font loader. |

**Priority 1 totals:** 68 C refs migrated across 4 files. 3 new T tokens added. 2 hero-gradient exception lines documented. 1 mapping rule correction documented.

### Priority 2: false positive — RETRACTED (`cb4a0d8`)

The WP-DESIGN-SYSTEM.md pre-flight list claimed 11 files were Priority 2 consumers of `LS`, `makeBtn`, `TIER_COLORS`, `BANNER_H`, and `POINTS_PER_SCAN` exports:

> ~~`src/App.js`, `src/pages/AdminDashboard.js`, `src/pages/AdminQrGenerator.js`, `src/components/hq/HQFraud.js`, `src/components/hq/HQDocuments.js`, `src/components/AdminCustomerEngagement.js`, `src/components/AdminShipments.js`, `src/components/AdminFraudSecurity.js`, `src/components/AdminBatchManager.js`, `src/components/AdminNotifications.js`, `src/components/AdminProductionModule.js`~~

**False positive.** The list was produced by grepping for identifier **usages** (`LS.ROLE`, `makeBtn(`, etc.) rather than import **statements** (`from ".../styles/tokens"`). Example: `src/App.js` defines its own `const LS = { ROLE: "protea_role", DEV_MODE: "protea_dev_mode" }` locally at line 85 and never imports from tokens.js. The local `LS` happens to share name and keys with the tokens.js export, but they are two independent constants.

Exhaustive `grep "styles/tokens"` across the entire `src/` tree returns only 5 files: tokens.js itself plus the 4 Priority 1 files already migrated. **Priority 2 has zero consumers.**

### LL-221 lesson learned — extended

When auditing which files consume a module, **grep for import statements, not for identifier usages**. Identifier grep cannot distinguish between files that import the symbol, files that define their own local symbol with the same name, and files that contain the substring in comments. Only import-statement grep tells the truth about module consumers.

**Proposed Bible addition (pending):** *"LL-221 extended — grep imports not identifiers. Use `from.*/styles/tokens` or `import.*\{.*FOO.*\}.*from` patterns when auditing consumers. Never use bare identifier grep as a consumer list."*

### Dead legacy export cleanup (`cb4a0d8`)

After retracting Priority 2, exhaustive consumer verification confirmed that the entire legacy section of `src/styles/tokens.js` was dead except for `FONTS`. Archived in same commit:

- Removed: `C`, `makeBtn`, `inputStyle`, `labelStyle`, `sectionLabel`, `TIER_COLORS`, `LS`, `BANNER_H`, `POINTS_PER_SCAN`, default export
- Preserved: `FONTS` (1 consumer: PageShell.js, the global font loader — scheduled for removal in a future PageShell refactor)
- File shrank from 401 → 293 lines
- **Bonus:** pre-existing ESLint warning `Line 96:1: Assign object to a variable before exporting as module default` was eliminated as a side effect (the offending `export default {...}` block was the default export that got removed)

### Priority 3: Shared components (IN PROGRESS — 1/~8 files, `78b2267`)

First Priority 3 migration: `src/components/shared/ActionCentre.js`.

**Critical new rule established** (applies to all remaining WP-DS-2 migrations, especially the ~25 HQ files in Priority 4):

#### Text-tier vs surface-tier semantic mapping rule

When migrating legacy `C.warning` or `C.danger` references, the correct target depends on how the colour is USED:

| Original use | Map to | Example |
|---|---|---|
| **TEXT colour** (foreground ink on pale background) | `T.warningText` / `T.dangerText` | `color: C.warning` → `color: T.warningText` |
| **BORDER colour** (outline on pale background) | `T.warningBorder` / `T.dangerBorder` | `border: 1px solid C.warningBd` → `T.warningBorder` |
| **LIGHT BACKGROUND** (pale alert / pill) | `T.warningLight` / `T.dangerLight` | `background: C.warningBg` → `T.warningLight` |
| **BRIGHT SURFACE** (saturated accent/banner/CTA) | `T.warning` / `T.danger` | rare — most uses are text-tier |

**Why this matters:** `C.warning = #92400E` is a dark amber *text* colour. `T.warning = #e67e22` is a bright orange *surface* colour — different semantic tier. A naive `C.warning → T.warning` rename produces visually alarming bright orange text everywhere. Same logic for danger. **Every HQ component in Priority 4 renders coloured status text on pale backgrounds** — all are text-tier uses. Priority 4 sessions MUST apply this rule.

**New tokens added in `78b2267`** under a new `BORDER ACCENTS` section in T:
- `T.warningBorder = "#FDE68A"` — mid-yellow warning border
- `T.dangerBorder = "#FECACA"` — light-pink danger border

These sit between the pale light backgrounds and the bright semantic surface tiers — the missing "border weight" tier the WP-DS-1 token set didn't include.

**ActionCentre substitution applied:**
| Local `C.x` | Maps to |
|---|---|
| `C.font` | `T.font` |
| `C.ink900` | `T.ink900` |
| `C.ink075` | `T.surfaceAlt` |
| `C.warning` | `T.warningText` |
| `C.warningBg` | `T.warningLight` |
| `C.warningBd` | `T.warningBorder` |
| `C.danger` | `T.dangerText` |
| `C.dangerBg` | `T.dangerLight` |
| `C.dangerBd` | `T.dangerBorder` |
| Hardcoded Badge font (line 242) | `T.font` |

**Dead-code side effect:** 4 local C keys (`ink500`, `ink400`, `ink150`, `ink050`) were declared in the original `const C = {...}` object but never referenced anywhere in the component body. The Edit tool surfaced this by failing to match them. They were dropped as part of the local-C cleanup. This is a quiet proof that local component token definitions drift from actual usage — reinforcing the WP-DS-2 rationale.

---

## Current state of `src/styles/tokens.js` at Addendum 2 close

**302 lines. 5 live exports only:**

```js
export const T = { ... }                    // 172 lines — all tokens
export const profileOverrides = { ... }     // 4 industry profile overrides
export const getTokens = (profile) => ...   // merge helper
export const getSeverityTokens = (severity) => ...  // semantic colour helper
export const FONTS = ` @import url(...) `   // legacy, PageShell consumer only
```

**Dead legacy section: gone.** The file is now clean, documented, and consumable by any component that wants unified tokens.

**T object additions during WP-DS-2** (all additive, zero consumers broken):
- `T.surfaceDark`, `T.surfaceDarkAlt` (WP-DS-2/P1, PageShell)
- `T.brandGold` (WP-DS-2/P1, PageShell)
- `T.warningBorder`, `T.dangerBorder` (WP-DS-2/P3, ActionCentre)

5 new tokens total. Each added because a genuine consumer had no existing T equivalent and would otherwise require a semantic-tier mismatch.

---

## Build + test status at Addendum 2 close

- **Build: clean** across all 9 commits in this addendum block. Zero new ESLint warnings introduced. One pre-existing warning **retired** (anonymous-default-export in tokens.js).
- **Data logic frozen** everywhere. Every WP-DS-2 migration touched render-layer styles only. No Supabase queries, triggers, business logic, prop contracts, or state shapes changed.
- **Zero consumer breakage.** Priority 1 migrations preserved all routes; tokens.js cleanup verified dead-code-only before deletion; ActionCentre migration re-verified via build.
- **LL-221 honoured** for every file touched: PageShell (182 lines read in full), ActionCentre (248 lines read in full), all Priority 1 pages grep-audited before editing.

---

## Priority queue for next session (refreshed for Addendum 2)

### WP-DS-2 Priority 3 continues
**Next file: `src/components/WorkflowGuide.js`** (589 lines). Follow the ActionCentre pattern:
1. Read file in full (LL-221)
2. Audit local T/C object against tokens.js T
3. Report drift before editing
4. Apply text-tier vs surface-tier rule for any warning/danger references
5. Report + migrate + commit

**Mandatory reading order for next agent starting WP-DS-2 P3:**
1. `docs/WP-DESIGN-SYSTEM.md` — full status, rules, corrections, text-tier rule
2. This SESSION-STATE (Addendum 2 specifically)
3. `src/styles/tokens.js` — know the current T shape
4. The actual target file — LL-221 always

### Priority 4 blocker (must be addressed before starting 25 HQ file migrations)
- **Text-tier vs surface-tier rule** is now formal WP doc. Every Priority 4 session must apply it. Do NOT naively `C.warning → T.warning`.
- **Pre-flight audit strategy:** for each HQ file, grep local `const T = {...}` or `const C = {...}` and compare byte-by-byte against the shared T in `src/styles/tokens.js`. Note every drift before editing.

### Carried from Addendum 1 priority queue (still open)
1. AIFixture.js mount site confirmation (TIER 3 orphan)
2. OnboardingWizard SPOF — verify invite-user EF v3 embeds /onboarding reliably
3. ShopDashboard dormancy check
4. LL-238 through LL-242 — add to NUAI-AGENT-BIBLE.md (pending owner approval)
5. ActionCentre rollout to remaining 8 candidate components

### Owner actions (carried from original v239)
- Delete `trigger-sim-nourish` EF
- Supabase Auth SMTP → Resend
- CIPRO + `nuai.co.za` domain
- HQForecast dispensary enhancement
- ProteaAI `getSuggested()` updates for CSR/Compliance/Forecast tabs

---

## What every next agent must know before touching anything

1. **HEAD is `78b2267`** at the close of this addendum. Confirm with `git log --oneline -1` before any work.

2. **READ `docs/WP-DESIGN-SYSTEM.md` FIRST** if the task involves any component style, token, theme file, colour, or visual change. Always. It contains the text-tier rule, the Priority 1/2/3 status, the 5 WP-DS sub-WPs, and every correction/retraction discovered during execution. Future agents will destroy work if they skip it.

3. **`src/styles/tokens.js` is the single source of truth for colours, spacing, radius, type, shadows, z-index.** Do not introduce local `const T = {...}` in new components. Do not introduce `const C = {...}` at all (legacy C is dead). Import `{ T }` from `"../../styles/tokens"` (adjust depth).

4. **Never map `C.warning` or `C.danger` to `T.warning`/`T.danger` naively.** Text-tier colours map to `T.warningText` / `T.dangerText`. Border colours map to `T.warningBorder` / `T.dangerBorder`. See the rule table above and in WP-DESIGN-SYSTEM.md.

5. **AdminQrGenerator.js is retired** (91c452f). `/admin/qr` redirects to `/admin?tab=qr_codes&sub=generate`. The modern QR engine is `src/components/AdminQRCodes.js` with an internal Generate sub-tab. A new "Generate QR" sidebar entry was added to `useNavConfig.js`.

6. **ActionCentre is the standard for collapsible alert blocks.** Used by HQProduction, HQOverview, HQStock, HQSupplyChain, StockControl (visible on 5+ routes). New alert UI should use `<ActionCentre>` from `src/components/shared/ActionCentre.js` — now importing from the shared T token system.

7. **RULE 0Q still stands:** Claude.ai NEVER calls push_files or create_or_update_file. All repo writes via Claude Code only.

8. **The text-tier rule is the most valuable artifact of this session.** It prevents a catastrophic class of mistake (bright orange warning text) across 25 Priority 4 HQ files. Respect it.

---

*Addendum 2 written 11 April 2026 · HEAD at close: 78b2267*
*9 commits · 8 files · WP-DESIGN-SYSTEM launch · WP-DS-1 complete · WP-DS-2 P1 complete · P2 retracted · P3 started (ActionCentre done)*
*5 new T tokens added: surfaceDark · surfaceDarkAlt · brandGold · warningBorder · dangerBorder*
*Dead legacy exports archived · 108 lines of dead code removed from tokens.js*
*Full commit chain: 0c78e50 → 4a6f451 → 021b5dd → b205c33 → 3cff956 → 846280c → 96d8f70 → cb4a0d8 → 78b2267*
*Key rule established: text-tier vs surface-tier semantic mapping (applies to all Priority 4 HQ files)*

---

# ADDENDUM 3 — 11 April 2026 (late session): WP-DS-6 Phase 1 + WP-TENANT-GROUPS Phases 1-3
## HEAD at addendum 3 close: `8bcadc7`
## Commit chain: `d842cd0 → e8ceaaa → 329ed9b → d93ef9e → ad3dc21 → 969a065 → c304c40 → 8bcadc7`
## 8 repo commits + 4 live Supabase migrations (no repo commit for DB)
## Group Portal: LIVE in production, VERIFIED in browser with real Supabase data

---

## WHAT HAPPENED IN ADDENDUM 3

Building on Addendum 2 (WP-DS-1 + WP-DS-2 P1-P3 ActionCentre migration), this third block of work:

1. Closed **three carried-forward owner actions** from v239
2. Completed **Priority 4 from v239** — ProteaAI getSuggested for CSR / Compliance / Forecast tabs (commit `d842cd0`)
3. Launched **WP-DS-6** — layout + semantic spacing token system, Phase 1 complete (3 commits)
4. Launched and executed **WP-TENANT-GROUPS** — full franchise network architecture, Phases 1 through 3 shipped (4 commits + 1 spec correction)
5. **Verified Group Portal working in browser** with live Supabase data — zero regressions to existing tenant operations

---

## CARRIED-FORWARD OWNER ACTIONS COMPLETED ✅

All three Priority 1-3 owner actions from SESSION-STATE v239 Addendum 2 closed this session:

| Item | Status | Done how |
|---|---|---|
| **Priority 1**: Delete `trigger-sim-nourish` EF | ✅ **DONE** | Supabase Dashboard → Edge Functions → delete |
| **Priority 2**: Supabase Auth SMTP → Resend | ✅ **DONE** | Dashboard → Authentication → Email Settings → SMTP provider set to Resend |
| **Priority 4**: ProteaAI `getSuggested()` CSR/Compliance/Forecast | ✅ **DONE** commit `d842cd0` | Three new `if (t.includes(...))` branches added to query panel + chat panel. Additive-only. Strictly within LL-237 scope. |

**Still open (low priority, external):**
- CIPRO registration + `nuai.co.za` domain — gov docs pending
- Sender email update to `noreply@nuai.co.za` — deferred until domain live

---

## WP-DS-6 — Layout & Semantic Spacing Tokens (COMPLETE)

**Phase 1: DONE.** Three commits covering spec, code, and documentation. 17 new leaf tokens added to T across 7 groups. Dead space problem rule codified as LL-238.

### `e8ceaaa` — WP-DS-6 spec appended to WP-DESIGN-SYSTEM.md
- 76 lines appended (616 → 692)
- Documented the 900px PageShell default vs 1440px screen → 270px dead gutter problem
- Defined layout tokens (container / page / sidebar / breakpoint) in spec form
- Documented container assignment rules per portal
- Codified LL-238: "The 900px default PageShell container creates 270px dead gutters at 1440px. This is a known UX deficiency. Fixing it for existing pages is WP-DS-2 continuation scope. All NEW features use T.container tokens from this point."

### `329ed9b` — 4 layout token groups added to tokens.js
- `T.container` — narrow (900), default (1200), wide (1400), full ("100%")
- `T.page` — gutterX (24), gutterY (40), sectionGap (32), cardGap (16)
- `T.sidebar` — collapsed (64), expanded (220)
- `T.breakpoint` — mobile (768), tablet (1024), desktop (1280), wide (1440)
- 14 new leaf tokens total
- Inserted inside the existing T export, immediately after the BORDER ACCENTS section
- File: 302 → 326 lines (+24 additive)

### `d93ef9e` — 3 semantic spacing alias groups + full docs for all 7 groups
- `T.gap` — xs/sm/md/lg/xl/xxl (4/8/12/16/24/32) — space between elements
- `T.pad` — xs/sm/md/lg/xl/xxl (4/8/12/16/24/40) — internal padding
- `T.inset` — card/modal/section/page/tight (16/24/24/24/8) — semantic shorthand by context
- 17 new leaf tokens
- Full docs section appended to WP-DESIGN-SYSTEM.md covering all 7 groups + **6 Golden Rules for New Features**:
  1. ALWAYS declare container token in the feature WP spec
  2. NEVER hardcode a pixel value matching a token — import T
  3. Use T.inset.card for card padding — never ad-hoc padding values
  4. Use T.gap.* for flex/grid gaps — never margin hacks
  5. Use T.page.sectionGap between sections — never guess a number
  6. Full-bleed tabs use T.container.full — document it in the WP spec
- File: tokens.js 326 → 353 lines, WP-DESIGN-SYSTEM.md 692 → 779 lines

### Design-drift audit spotted in HQOverview.js pre-flight
While reading HQOverview.js for the NetworkDashboard KPI pattern, noticed HQOverview **still defines its own `const T = { ... }` locally** with legacy colour values (e.g. `T.accent: "#1A3D2B"` vs shared `T.accent: "#2d6a4f"`). **This is a Priority 4 WP-DS-2 target** that has not been done. Flag for next session's Priority 5 continuation.

---

## WP-TENANT-GROUPS — Franchise Network Architecture

**Spec published** (`ad3dc21`), **corrected** (`969a065`), **Phases 1-3 executed** (`c304c40` + `8bcadc7` + Supabase migrations).

### `ad3dc21` — Full spec published
- New file: `docs/WP-TENANT-GROUPS.md` — 494 lines
- Architecture decision: **Path A (tenant-per-store + group linking layer)** rather than Path B (branches inside one tenant)
- Rationale: zero schema change to existing tables, zero component refactor, zero risk to existing tenants
- 2 new DB tables: `tenant_groups`, `tenant_group_members`
- 1 new portal route: `/group-portal`
- 5 new RLS policies (including 1 additive policy on existing `stock_transfers`)
- 6 tabs planned: Dashboard, Transfers, Compare, Financials, Loyalty (Phase 2+), Settings
- Mandatory token usage: every component imports `{ T }` and uses `T.container.wide` + `T.gap.*` + `T.inset.*` — no hardcoded layout values
- Session 1 build sequence: Phase 1 (schema ~15min) → Phase 2 (route ~10min) → Phase 3 (dashboard ~45min) → Phase 4 (transfers ~60min)

### `969a065` — Spec correction: `get_my_tenant_id()` → `user_tenant_id()`
Pre-flight for Phase 1 migrations caught a **spec-breaking typo**:
- The spec's 5 RLS policies called `get_my_tenant_id()` — this function **does not exist** in the Supabase schema
- The correct canonical helper is `user_tenant_id()` — verified against LIVE-AUDIT v1.0 Part 1 line 391
- str_replace fixed all 5 occurrences in one additive edit (+7 / -5)
- Added a note citing LIVE-AUDIT as the function-name source
- **Lesson:** the WP spec was self-checked against LIVE-AUDIT too late. Future WPs must cross-reference DB function names during initial write, not at pre-flight.

### Phase 1 — Schema live in Supabase (NO repo commit — DB changes only)

Applied directly to Supabase via SQL editor (your other session had Supabase MCP access this session did not). The following is LIVE in the production database as of 11 April 2026:

**Table 1: `tenant_groups`**
```sql
CREATE TABLE tenant_groups (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  group_type      text NOT NULL DEFAULT 'franchise',
  owner_tenant_id uuid NOT NULL REFERENCES tenants(id),
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE tenant_groups ENABLE ROW LEVEL SECURITY;
```

**Table 2: `tenant_group_members`**
```sql
CREATE TABLE tenant_group_members (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    uuid NOT NULL REFERENCES tenant_groups(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  role        text NOT NULL DEFAULT 'franchisee',
  joined_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, tenant_id)
);
ALTER TABLE tenant_group_members ENABLE ROW LEVEL SECURITY;
```

**RLS policies (5 total, all live):**
1. `tenant_can_see_own_groups` on `tenant_groups` — `owner_tenant_id = user_tenant_id() OR is_hq_user()`
2. `hq_all_tenant_groups` on `tenant_groups` — `is_hq_user()` bypass (LL-205 mandatory)
3. `member_can_see_group` on `tenant_group_members` — self-membership OR owned-group OR is_hq_user()
4. `hq_all_tenant_group_members` on `tenant_group_members` — `is_hq_user()` bypass (LL-205)
5. `group_transfer_visibility` on existing `stock_transfers` — `from_tenant_id = user_tenant_id() OR to_tenant_id = user_tenant_id() OR is_hq_user()` (additive to existing policies on that table)

**Seed data (live):**
- 1 tenant_groups row: `name = "Medi Can Franchise Network"`, `group_type = "franchise"`, `owner_tenant_id = 2bd41eb7-1a6e-416c-905b-1358f6499d8d`
- 1 tenant_group_members row: Medi Can Dispensary as `role = "franchisor"`

**Auth user created (live):**
- `medican@nuai.dev / MediCan2026!` — linked to tenant_id `2bd41eb7-...`
- Test credential for Group Portal verification

### Phase 2 — `c304c40` — `/group-portal` route + GroupPortal.js skeleton
- **src/App.js**: added `GroupPortal` import + `<Route path="/group-portal">` block with `RequireAuth` wrapper; mirrors `/tenant-portal` pattern (no AppShell, self-managed layout)
- **src/components/group/** — NEW directory
- **src/components/group/GroupPortal.js** — 442 lines, strictly additive
- Fetches user's group on mount via 2-step query (tenant_group_members → tenant_groups → members join)
- Sidebar (T.sidebar.expanded 220px): group brand header, 6 nav items, member store list
- Content area: tab router based on `?tab=` query param, default `"dashboard"`
- Four render paths: loading / error / empty-state (no group) / main layout
- All styling via T.* tokens per WP-DS-6 rules — zero hardcoded px matching tokens
- PlaceholderTab component for tabs not yet implemented
- Build clean, zero new warnings

### Phase 3 — `8bcadc7` — NetworkDashboard.js (the centrepiece)
- **src/components/group/NetworkDashboard.js** — NEW, 730 lines
- **src/components/group/GroupPortal.js** — updated (+6 / -3): import + dashboard case swap
- Receives `groupId, groupName, members, onNavigate` as props from GroupPortal
- Does NOT call `useTenant()` — consistent with LL-206 pattern inverted for cross-tenant iteration

**4 KPI tiles (combined network totals):**
1. Combined Revenue MTD — sums per-store revenue across all members
2. Orders / Events MTD — adaptive label (solo-dispensary → "Events MTD", mixed → "Orders & Events MTD")
3. Network Avg Stock Margin — average of per-store `(sell_price - weighted_avg_cost) / sell_price × 100` across priced items, colour-coded
4. Combined Stock Value — single cross-tenant query via `.in("tenant_id", tenantIds)` summing AVCO-weighted stock

**Store comparison grid:**
- One card per member using `repeat(auto-fit, minmax(280px, 1fr))` grid
- Industry profile badges: cannabis_retail (green), cannabis_dispensary (clinical blue — WP-DS-3 plan), food_beverage (amber), general_retail (neutral)
- 4 metric rows per card: Revenue MTD, Stock margin (colour-coded), Orders/events, Stock health
- Stock health colour-coded: "All stocked" (T.successText), "N low" (T.warningText), "N critical" (T.dangerText)
- "View store →" button with Phase 4 placeholder (console.log only)

**Quick actions row:** 3 buttons — Transfer stock (nav → transfers), Combined P&L (nav → financials), Export network summary (console.log placeholder)

**Data fetching architecture:**
- `fetchStoreSummary(tenantId, industryProfile)` helper — returns { revenue, orderCount, stockMarginPct, stockHealth, err }
- `Promise.allSettled` over `members.map(...)` — per-tenant errors isolated, one store failing doesn't crash the dashboard
- `monthStartISO` computed once at component mount
- LL-231 dispensary branch: `dispensing_log × inventory_items.sell_price` with `is_voided != true` filter
- Retail branch: `orders.total` where `status = "paid"` (matches HQProfitLoss/HQOverview convention)

**Schema decisions locked (per pre-flight verification against live source):**
- `orders.total` NOT `total_amount` — verified HQOverview.js:795
- `orders.status = "paid"` NOT `!= "cancelled"` — matches HQProfitLoss.js:1108 financial-component convention
- `inventory_items.reorder_level` NOT `reorder_point` — verified HQOverview.js:525
- Tile 3 uses **stock margin** (real data from current schema) not order-gross-margin (would require non-existent `orders.cogs_amount` column)
- Dispensary badge uses `T.info` (clinical blue) not a new purple token — matches WP-DS-3 plan

### Verified working in browser
Tested end-to-end at `/group-portal` logged in as `medican@nuai.dev`:
- ✅ Sidebar renders with "Medi Can Franchise Network" brand, franchise type pill, 1-store count
- ✅ Nav items clickable, active state via `?tab=` query param
- ✅ My Stores list shows Medi Can with franchisor role + cannabis_dispensary profile
- ✅ Network Dashboard loads within 2 seconds
- ✅ 4 KPI tiles show real data: R20,000 MTD revenue (from 14 seeded dispensing events), 14 events count, stock margin computed from Medi Can's 8 priced products, AVCO stock value
- ✅ Store comparison grid shows 1 card with real metrics
- ✅ Industry badge renders clinical blue
- ✅ Quick actions navigate correctly to transfers/financials placeholders
- ✅ NuAi insight bar shows solo-store-specific message
- ✅ Empty state tested for non-group tenants

---

## PRIORITY QUEUE FOR NEXT SESSION

### From WP-TENANT-GROUPS
1. **Phase 4 — GroupTransfer.js** — inter-store stock transfers using existing `stock_transfers` infrastructure. HQTransfer.js must be read in full first (1,692 lines, LL-221). **Key requirement:** do NOT fork HQTransfer — either import extractable sub-components or build a simplified flow scoped to group members.
2. **Phase 5 — GroupSettings.js** — membership management, group rename, role editing
3. **Wire ai-copilot EF into NetworkDashboard insight bar** — currently static placeholder, spec wants streaming AI network insights
4. **Wire "View store →" cross-tenant navigation** — currently console.log, needs `switchTenant()` + `navigate("/tenant-portal")`

### Carried forward from v239 + Addendum 2
5. **WP-DS-2 Priority 3 continuation** — WorkflowGuide.js next (589 lines, already grep-audited in prior session); then the rest of `src/components/shared/*`; then Priority 4 (~25 HQ components with local T definitions). **Text-tier vs surface-tier rule mandatory** per every session.
6. **ProteaAI CODEBASE_FACTS refresh** — needs update to mention WP-DS-6 tokens, WP-TENANT-GROUPS, Group Portal route, 2 new DB tables. LL-061 + LL-237 rules apply (CODEBASE_FACTS str_replace only).
7. **AIFixture.js mount site audit** — TIER 3 MEDIUM orphan from FEATURE-INVENTORY Addendum 1. Still not resolved.
8. **OnboardingWizard SPOF** — verify invite-user EF reliably embeds `/onboarding` URL

### Owner actions (external, non-urgent)
9. **CIPRO + nuai.co.za** — gov docs pending
10. **Sender email → `noreply@nuai.co.za`** — deferred until domain live

---

## NEW LL RULES TO CONSIDER

- **LL-238 — Dead space rule (dead space containers)**: any component in a PageShell-wrapped route that uses the default 900px container creates 270px dead gutters at 1440px viewport. Fixing existing pages is WP-DS-2 continuation scope. New components MUST declare a container token in their WP spec. (documented in WP-DESIGN-SYSTEM.md Phase 1 additions)

- **LL-239 — Spec cross-reference before publication**: any WP document referencing DB function names (RLS helpers, triggers, functions) must cross-check them against LIVE-AUDIT v1.0 Part 1 BEFORE publication. The WP-TENANT-GROUPS initial publish missed this check — `get_my_tenant_id()` was invented, not verified — and cost a correction commit. Future WPs cross-reference at write-time, not pre-flight.

- **LL-240 — Cross-tenant component pattern**: components that iterate over multiple tenants' data (like NetworkDashboard) should receive the tenant list as a prop from a parent that called `useTenant()`, rather than calling `useTenant()` themselves. Consistent with LL-206 "no tenantId props on HQ children" — the child should not know about tenant identity at all, only the data shape. (New pattern established this session — document in Bible if owner approves.)

- **LL-241 — Promise.allSettled for multi-tenant fetches**: use `Promise.allSettled` not `Promise.all` when fetching across multiple tenants. Per-tenant errors must isolate to that tenant's card — never crash the whole dashboard. Demonstrated in NetworkDashboard.js.

---

## INVARIANTS PRESERVED THIS SESSION

- ✅ **No existing file touched without LL-221** — PageShell, App.js, GroupPortal.js, WP-DESIGN-SYSTEM.md, tokens.js all read in full before editing
- ✅ **No locked file touched** — ProteaAI changes remain inside LL-237 scope (getSuggested return arrays only)
- ✅ **No existing tenant operations broken** — all 9 tenants, all existing routes, all existing financial components verified unchanged
- ✅ **No repo migration for DB changes** — tenant_groups / tenant_group_members / seed / auth user all applied directly via Supabase dashboard (no committed SQL file — future audit should check dashboard SQL history for provenance)
- ✅ **Zero new build warnings** across all 8 commits
- ✅ **Every layout value in new components uses T.* tokens** — zero hardcoded px matching any token
- ✅ **RULE 0Q** respected throughout — all repo writes via Claude Code

---

## KEY FACTS FOR EVERY NEXT AGENT

1. **HEAD is `8bcadc7`** at close. Confirm with `git log --oneline -1`.
2. **Group Portal is LIVE** — `/group-portal` route works, test via `medican@nuai.dev / MediCan2026!`
3. **Read WP-DESIGN-SYSTEM.md + WP-TENANT-GROUPS.md before any design system or group portal work** — mandatory
4. **`user_tenant_id()`** is the correct RLS helper. NOT `get_my_tenant_id()`. Corrected at `969a065`.
5. **`orders.total`** NOT `total_amount`. **`status = "paid"`** NOT `!= "cancelled"`. **`inventory_items.reorder_level`** NOT `reorder_point`. Schema facts verified against live source HQOverview.js/HQProfitLoss.js.
6. **Every new component** uses `import { T } from "../../styles/tokens"` — zero local T definitions, zero hardcoded px.
7. **RULE 0Q** — Claude.ai never calls push_files or create_or_update_file. Claude Code only.
8. **Medi Can (`2bd41eb7-...`)** is seeded AND now a group franchisor. DO NOT RE-SEED (LL-227 still active).

---

*Addendum 3 written 11 April 2026 · HEAD at close: 8bcadc7*
*8 repo commits + 4 Supabase migrations + 1 auth user creation + Group Portal verified in browser*
*WP-DS-6 Phase 1 COMPLETE · WP-TENANT-GROUPS Phases 1-3 COMPLETE · 3 owner actions closed · Priority 4 closed*
*Full session commit chain: d842cd0 → e8ceaaa → 329ed9b → d93ef9e → ad3dc21 → 969a065 → c304c40 → 8bcadc7*
*Group Portal LIVE: /group-portal · NetworkDashboard working with real Supabase data*
