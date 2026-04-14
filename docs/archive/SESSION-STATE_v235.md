# SESSION-STATE v235
## Sessions covered: v234 + v235 (11 April 2026)
## HEAD at close: fb20c9b on origin/main
## Previous state: SESSION-STATE_v233.md (HEAD 0c70be0)
## Written: 11 April 2026 — from Claude.ai session, verified against live docs

---

## MANDATORY READING ORDER FOR NEXT AGENT
1. docs/PLATFORM-OVERVIEW_v1_0.md        — permanent system orientation (read FIRST, always)
2. docs/NUAI-AGENT-BIBLE.md              — all rules, patterns, LL-192 onward
3. docs/LL-ARCHIVE_v1_0.md              — LL-001 through LL-191 (sacred, never skip)
4. docs/SESSION-STATE_v235.md           — this file (current state)
5. docs/WP-INDUSTRY-PROFILES_v1_0.md   — 5-profile ERP strategy (new this session)
6. docs/VIOLATION_LOG_v1_1.md           — what went wrong before (read before touching anything)
7. The actual file you are about to change (not the docs about it)

---

## PLATFORM STATE (as of fb20c9b, 11 April 2026)

### Infrastructure
- Repo: github.com/GFive5y/protea-botanicals
- Supabase project: uvicrqapgzcdvozxrreo (eu-west-1)
- Live URL: https://nuai-gfive5ys-projects.vercel.app
- Stack: React 18 + Supabase + Vercel
- DB tables: 111 (109 existing + 3 via WP-MEDI-CAN migration this session — actually same 109 tables, new columns added to patients + dispensing_log)
- DB functions: 38 · DB triggers: 35

### Tenants (9 total)
| Tenant | ID (first 8) | Profile | Status |
|---|---|---|---|
| Nu Ai HQ | 43b34c33 | operator | active |
| TEST SHOP | 4a6c7d5c | cannabis_retail | active |
| Pure Premium THC Vapes | f8ff8d07 | cannabis_retail | active |
| Medi Recreational | b1bad266 | cannabis_retail | active |
| Test Dispensary CT | 064adbdc | cannabis_retail | active |
| Vozel Vapes | 388fe654 | general_retail | seed_complete |
| Maxi Retail SA | 9766a3af | general_retail | seed_complete · 232 orders |
| Nourish Kitchen & Deli | 944547e3 | food_beverage | seed_complete · 240 orders |
| **Medi Can Dispensary** | **2bd41eb7** | **cannabis_dispensary** | **seed_complete · 14 dispensing events** |

### Medi Can Dispensary — FULL SEED RECORD (DO NOT RE-SEED)
- tenant_id: 2bd41eb7-1a6e-416c-905b-1358f6499d8d
- slug: medi-can
- industry_profile: cannabis_dispensary · tier: pro
- branding_config.seed_complete: true · branding_config.feature_medical: true
- Products: 8 (MC-OIL-001 through MC-INH-001, sell prices R680–R2,400)
- Patients: 5 (full SAHPRA S21 numbers, conditions, authorized practitioners)
  - Patricia Mokoena — SAHPRA/S21/2025/001 — Chronic pain — Dr. van der Berg
  - James Olivier — SAHPRA/S21/2025/002 — Epilepsy — Dr. Patel
  - Sarah Khumalo — SAHPRA/S21/2025/003 — Anxiety/PTSD — Dr. van der Berg
  - David Nkosi — SAHPRA/S21/2025/004 — Multiple sclerosis — Dr. Patel
  - Fatima Davids — SAHPRA/S21/2025/005 — Palliative care — Dr. van der Berg
    (S21 EXPIRY: ~25 days from 11 Apr 2026 — will show amber/red in Compliance tab)
- Prescriptions: 5 (one per patient, active, repeat-tracked)
- Dispensing events: 14 (30 days of history)
- Expenses: 6 (pharmacist R65k, rent R28k, SAHPRA fees R8.5k, cold chain, marketing, packaging)
- Stock movements: 8 (opening stock at AVCO)
- Journal: 1 opening entry (SEED-OPEN-001, R85,000 stock value)
- trial_expires_at: 30 days from creation (rolling)

---

## EDGE FUNCTIONS (deployed, Supabase uvicrqapgzcdvozxrreo)

| Slug | Version | Purpose |
|---|---|---|
| process-document | v53 | AI document extraction — Smart Capture |
| auto-post-capture | v2 | Atomic expense + journal + VAT |
| ai-copilot | v59 | All ProteaAI queries |
| sim-pos-sales | v4 | POS sales simulator for demos |
| payfast-checkout | v44 | PayFast payment initiation |
| payfast-itn | v39 | PayFast payment confirmation webhook |
| sign-qr | v36 | HMAC-SHA256 QR signing |
| verify-qr | v34 | QR verification + scan logging |
| get-fx-rate | v35 | Live USD/ZAR 60s cache |
| send-notification | v37 | WhatsApp via Twilio |
| **seed-tenant** | **v4** | **Tenant seeding — supports: general_retail + food_beverage + cannabis_dispensary** |
| trigger-sim-nourish | v1 | Throwaway one-shot EF — OWNER SHOULD DELETE |

Total: ~18 deployed (may vary — verify with Supabase:list_edge_functions if needed)

### REPO GAP — seed-tenant
supabase/functions/seed-tenant/index.ts in repo still shows v3 content.
Deployed (Supabase) is v4 with cannabis_dispensary branch.
Per LL-193: deployed is authoritative. When Claude Code next touches this file,
write the full v4 content. Do NOT re-deploy from repo v3.

---

## WHAT CHANGED THIS SESSION (v234 + v235)

### Commits (chronological)
| Commit | File(s) | Change |
|---|---|---|
| 32c7f18 | src/hooks/useNavConfig.js | Fixed Tenants icon (ðŸ¢→🏢), Medical icon (âš•ï¸→⚕️), added geo-analytics to Intelligence group |
| a937e42 | docs/WP-INDUSTRY-PROFILES_v1_0.md + docs/BUILD-LOG.md | WP-INDUSTRY-PROFILES v1.0 strategy doc + session v234 log |
| 159f67a | src/components/hq/HQMedical.js | S21 fields in Patients tab (table + form); S21 expiry monitoring in Compliance tab |
| fb20c9b | src/pages/TenantPortal.js + src/components/hq/HQMedical.js | CANNABIS_DISPENSARY_WATERFALL nav; dispensary clinical nav live; batch CSR linkage in DispensingTab |

### Database migrations applied (via Claude.ai MCP — NOT in migration files)
Migration name: medical_tables_hq_bypass_and_schema_enhancements

1. LL-205 fix — added hq_all_ bypass RLS policies:
   - CREATE POLICY hq_all_patients ON patients
   - CREATE POLICY hq_all_prescriptions ON prescriptions
   - CREATE POLICY hq_all_dispensing_log ON dispensing_log

2. patients table — new columns:
   - section_21_number TEXT (SAHPRA S21 authorization number)
   - s21_expiry_date DATE (authorization expiry)
   - condition TEXT (patient diagnosis/condition)
   - authorized_practitioner TEXT (HPCSA practitioner name + number)
   - updated_at TIMESTAMPTZ DEFAULT now()

3. dispensing_log table — LL-226 compliance columns:
   - is_voided BOOLEAN DEFAULT FALSE
   - void_reason TEXT
   - void_at TIMESTAMPTZ
   - void_by UUID

4. Indexes created:
   - idx_patients_s21 ON patients(section_21_number)
   - idx_dispensing_log_patient ON dispensing_log(patient_id, dispensed_at DESC)
   - idx_dispensing_log_tenant ON dispensing_log(tenant_id, dispensed_at DESC)

### EF deployed (via Claude.ai MCP)
seed-tenant v4 — added cannabis_dispensary branch:
  - 8 medical products, 5 patients (S21 data), 5 prescriptions, 14 dispensing events
  - 6 dispensary-specific expenses
  - Sets feature_medical: true in branding_config on seed complete
  - orders_note: "Dispensary revenue via dispensing_log — no sim-pos-sales needed"
  - Supported profiles: general_retail | food_beverage | cannabis_dispensary

---

## WHAT IS BUILT — KEY COMPONENTS STATE

### HQMedical.js (src/components/hq/HQMedical.js)
- ~1,850 lines
- Gate: tenantConfig?.feature_medical !== false AND industryProfile === 'cannabis_dispensary'
- 5 sub-tabs: Patients | Prescriptions | Dispensing | Reports | Compliance
- Patients tab: shows section_21_number, s21_expiry_date (color-coded), condition, authorized_practitioner
  - S21 Expiry column: red if expired, amber if ≤30 days, default beyond
  - EXPIRED / Nd left badge inline below the date
  - Form has all 4 new fields with SAHPRA-appropriate placeholders
- Dispensing tab: batch_id selector (filters by selected inventory_item_id), batch stored in dispensing_log
  - Log table: Date | Patient | Product | Batch/Lot | Qty | Notes
- Compliance tab:
  - Stat cards: Active Patients | Active Rx | S21 Expiring 60d | Rx Expiring 30d | Expired Rx | Total Dispensed
  - Section 21 Authorizations alert panel (renders when any patient has S21 expiring ≤60d)
  - Prescription expiry alerts (≤30d)
- Queries: patients, prescriptions, dispensing_log (with batches join), inventory_items, batches

### TenantPortal.js (src/pages/TenantPortal.js)
- getWaterfall(industryProfile) now has 3 branches:
  1. cannabis_dispensary → CANNABIS_DISPENSARY_WATERFALL (new)
  2. cannabis_retail → CANNABIS_RETAIL_WATERFALL (unchanged)
  3. all others → WATERFALL (unchanged)
- CANNABIS_DISPENSARY_WATERFALL sections:
  - Home (Dashboard — HQOverview)
  - Clinical / Heart icon / #166534 → renders HQMedical (5 sub-tabs internally)
  - Inventory (Formulary Stock, Batch Management, Receiving GMP)
  - Financials (P&L, Expenses, Invoices, Journals, VAT, Bank Recon, Balance Sheet, Forecast, Year-End)
  - Operations (Cash-Up, Documents, Smart Capture)
  - People (Staff, Roster, Timesheets, Leave, Contracts, Payroll, Calendar)
- DISPENSARY_ROLE_SECTIONS:
  - staff: [home, clinical]
  - manager: [home, clinical, inventory, operations, people]
  - owner/admin: [home, clinical, inventory, financials, operations, people]
- LL-225 satisfied: Wholesale Orders, Distribution, Retailers NOT in dispensary nav

### useNavConfig.js (src/hooks/useNavConfig.js)
HQ_PAGES groups (6):
  Operations: Overview, Supply chain, Suppliers, Procurement, Production, HQ Stock,
              Daily Trading, POS Till, Cash-Up, Transfers, Distribution
  Food & Beverage: Ingredients, Recipes, HACCP, Food Safety, Nutrition Labels,
                   Cold Chain, Recall & Trace, Food Intelligence
  Finance: Pricing, Costing, P&L, Balance Sheet, Invoices, Journals, Bank Recon,
           Fixed Assets, Expenses, Forecast, VAT, Year-End Close
  Intelligence: Analytics, Geo Analytics (NEW — was missing from sidebar), Retailer health, Reorder
  Platform: Tenants 🏢 (fixed), Medical ⚕️ (fixed), Wholesale Orders, Loyalty, Fraud, Documents, Email Logs
  People: HR (expandable, 12 sub-items), Shops

KNOWN RENAMES NOT YET DONE (next session):
  "Finance" group → "Financials"
  "Intelligence" group → "Analytics"
  "Procurement" tab label → "Purchasing"

---

## LL RULES — ALL ACTIVE (sessions v234 + v235 additions)

### New LL rules this session (v234 + v235)

LL-224: Industry profiles MUST have separate P&L templates.
  A single HQProfitLoss.js template rendering for all profiles violates this rule.
  Each profile needs its own revenue line names, cost category names, gross margin targets.
  cannabis_dispensary: "Dispensing Revenue", "Product Acquisition Cost"
  food_beverage: "Food Sales / Beverage Sales", "Food Cost" (target <30%)
  cannabis_retail/general_retail: "Product Sales", "Cost of Goods (AVCO)"
  Status: KNOWN VIOLATION — HQProfitLoss.js is not yet profile-adaptive. Stage 3 priority.

LL-225: cannabis_dispensary NEVER shows Wholesale Orders, Distribution, or Retailers tabs.
  These concepts do not exist in a clinical dispensary (products go to patients, not retailers).
  Enforced in: CANNABIS_DISPENSARY_WATERFALL does not contain these sections.
  Do NOT add wholesale/distribution concepts to any cannabis_dispensary nav or feature.

LL-226: dispensing_log entries are Schedule 6 controlled substance records.
  NEVER hard-delete dispensing events.
  Void only: SET is_voided=true + void_reason + void_at + void_by.
  Schema has these columns (added by medical_tables_hq_bypass_and_schema_enhancements migration).
  Voiding UI is not yet built — on backlog.

LL-227: Medi Can Dispensary tenant_id = 2bd41eb7-1a6e-416c-905b-1358f6499d8d
  seed_complete = true. DO NOT RE-SEED this tenant.
  Check branding_config.seed_complete before any seed operation on any tenant.

LL-228: HQMedical.js is gated — cannabis_dispensary profile + feature_medical=true.
  When testing Medical tab at /hq?tab=medical, must be viewing Medi Can tenant.
  Switching to a cannabis_retail tenant will show the "Access Restricted" gate.

LL-229: seed-tenant v4 cannabis_dispensary branch seeds patients directly.
  The patients table has RLS tenant_isolation + hq_all_ bypass (added this session).
  seed-tenant uses SERVICE_ROLE_KEY — bypasses RLS. Do not change this pattern.

LL-230: dispensing_log.batch_id (UUID, nullable) links to batches.id.
  The DispensingTab Batch/Lot selector filters batches by inventory_item_id === selected product.
  Existing dispensing events seeded without batch_id show "—" in Batch column. This is correct.

### LL rules from previous sessions still most relevant
LL-205: Every new DB table needs hq_all_ RLS bypass policy. (patients/prescriptions/dispensing_log now fixed)
LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
LL-207: No tenantId props on HQ child components.
LL-208: Enumerate ALL tables a feature will query before any migration.
LL-221: Read the ACTUAL file before editing — do not trust session docs about file content.
LL-222: user_profiles.role check: biological/chemical/physical/allergen (lowercase).
LL-223: Deno EF CANNOT call sibling EFs via internal fetch — LL-193 applies.

---

## WHAT IS NOT YET BUILT (known gaps, prioritised)

### Priority 1 — Immediate (next session opener)
1. useNavConfig.js label renames (3 str_replace, ~10 min):
   - "Finance" group label → "Financials"
   - "Intelligence" group label → "Analytics"
   - Procurement tab label → "Purchasing" (HQ sidebar label only — tab ID stays 'procurement')
   
2. supabase/functions/seed-tenant/index.ts in repo → update to v4 content
   (deployed is v4, repo still shows v3 — divergence grows every session)

3. FOOD_BEVERAGE_WATERFALL for TenantPortal.js
   Nourish Kitchen currently falls through to the generic manufacturing WATERFALL.
   Needs a Kitchen-first nav: Kitchen / Food Safety / Ingredients / Financials / Operations / People
   Same pattern as CANNABIS_DISPENSARY_WATERFALL — insert before/after it in TenantPortal.js

### Priority 2 — WP-FINANCIAL-PROFILES (Stage 3)
All financial pages currently use generic language regardless of industry_profile.
This is the largest remaining gap for the CA demo.

Files to update (read each in full before touching — LL-221):
  a. HQProfitLoss.js — profile-adaptive revenue line names + cost category names + KPI labels
     dispensary: "Dispensing Revenue" | "Product Acquisition Cost" | "Dispensing Margin %"
     food_beverage: "Food Sales" + "Beverage Sales" | "Food Cost" | "Food Cost % (target <30%)"
     cannabis_retail/general_retail: current labels are already correct
  
  b. ExpenseManager.js — profile-adaptive expense category suggestions
     dispensary: show SAHPRA fees, pharmacist, cold chain categories
     food_beverage: show produce, kitchen wages, gas, FSCA categories
  
  c. HQCogs.js — rename framing for dispensary:
     "Recipe COGS Builder" → "Acquisition Cost Builder" (for dispensary)
     "Food Cost %" should be the primary KPI for food_beverage (already partially there)
  
  d. HQInvoices.js — label framing:
     dispensary: "Patient Invoice" not "Wholesale Invoice"
     food_beverage: "Customer Invoice"

### Priority 3 — Dispensary compliance completions
  a. Voiding UI for dispensing_log — LL-226 says void only, columns exist, no UI yet
  b. Controlled Substance Register (CSR) view — perpetual balance by product
  c. SAHPRA report export format — CSV/PDF of dispensing events for regulatory submission
  d. S21 renewal workflow — alert when S21 expiring + initiate renewal process

### Priority 4 — WP-WIZARD-V2
  Industry-aware onboarding wizard:
  Step 1: Industry selection (clear descriptions, correct profile IDs)
  Step 2: Sub-category (for mixed_retail)
  Step 3: Business details + VAT status
  Step 4: Seed preferences
  Step 5: Launch + auto-seed via seed-tenant v4

### Priority 5 — Owner actions (from v233, still outstanding)
  - Delete trigger-sim-nourish EF (one-shot throwaway, no longer needed)
  - Supabase Auth SMTP → Resend (email auth)
  - CIPRO registration + nuai.co.za domain
  - Run /onboarding as admin@protea.dev to confirm Vozel Vapes Outcome D

---

## KEY ARCHITECTURE PATTERNS (for any agent working on this session's features)

### cannabis_dispensary profile routing pattern
TenantPortal.js getWaterfall() → CANNABIS_DISPENSARY_WATERFALL
  → Clinical section tab "medical" → renderTab("medical") → <HQMedical />
  → HQMedical gates itself: tenantConfig?.feature_medical !== false AND industryProfile === 'cannabis_dispensary'

### HQMedical fetch pattern (5 parallel queries)
fetchAll() runs:
  1. patients WHERE tenant_id = tenantId AND is_active = true
  2. prescriptions WHERE tenant_id = tenantId
  3. dispensing_log WHERE tenant_id = tenantId + JOIN inventory_items(name,sku) + JOIN batches(batch_number,expiry_date)
  4. inventory_items WHERE is_active = true (all tenants — LL-207)
  5. batches WHERE tenant_id = tenantId AND is_archived = false

### Dispensing event lifecycle (LL-226)
  INSERT → dispensing_log (patient, prescription, inventory_item, batch, qty, dispensed_by, dispensed_at)
  UPDATE → prescriptions.repeats_used +1
  UPDATE → inventory_items.quantity_on_hand - qty
  INSERT → stock_movements (movement_type='sale_out', reference='RX-{rx_id[0:8]}')
  NEVER DELETE a dispensing_log row. Void: SET is_voided=true, void_reason, void_at, void_by.

### WATERFALL nav pattern (TenantPortal.js)
  getWaterfall(industryProfile) returns the correct waterfall constant
  visibleSections = ternary chain:
    cannabis_dispensary → DISPENSARY_ROLE_SECTIONS filter
    cannabis_retail → getCannabisSections() with CANNABIS_ROLE_SECTIONS
    all others → ROLE_SECTIONS filter (owner/manager/production/staff)
  Each section has: id, label, icon (lucide-react), color, tabs[]
  Each tab has: id, label, desc
  tab.id must have a matching case in renderTab() switch

---

## PROOFS — VERIFIED LIVE DATA (11 April 2026)

### Medi Can seed verification (verified by SQL)
  SELECT products=8, patients=5, prescriptions=5, dispensing_events=14,
         expenses=6, stock_movements=8, seed_complete='true'
  FROM (single verification query) — all confirmed ✓

### Schema verification (verified by SQL)
  patients: section_21_number, s21_expiry_date, condition, authorized_practitioner ✓
  dispensing_log: is_voided, void_reason, void_at, void_by ✓
  RLS bypass policies: hq_all_patients, hq_all_prescriptions, hq_all_dispensing_log ✓

### S21 expiry alert trigger (from seed data)
  Fatima Davids: S21 expires ~25 days from 11 Apr 2026 → amber in Patients table, red in Compliance
  Sarah Khumalo: S21 expires ~60 days from 11 Apr 2026 → borderline amber in Compliance

---

## SESSION CLOSE — WHAT EVERY NEXT AGENT MUST KNOW

1. HEAD is fb20c9b. NEVER start work without confirming git log --oneline -1 matches.

2. MEDI CAN IS SEEDED. DO NOT RE-SEED. branding_config.seed_complete = true.
   tenant_id: 2bd41eb7-1a6e-416c-905b-1358f6499d8d — memorise this.

3. SEED-TENANT V4 IS DEPLOYED. The repo file (supabase/functions/seed-tenant/index.ts) 
   shows v3. This is a known repo gap. Do not re-deploy from repo. Per LL-193: deployed = authoritative.

4. LL-226 IS ACTIVE. Never INSERT a reversal into dispensing_log. Never DELETE dispensing_log rows.
   Always void: is_voided=true + void_reason + void_at + void_by.

5. THE NEXT IMMEDIATE ACTION is the 3 useNavConfig.js label renames (Priority 1 above).
   These are simple str_replace edits with no DB or EF changes.

6. THE NEXT MAJOR BUILD is WP-FINANCIAL-PROFILES (Stage 3).
   Read HQProfitLoss.js in full before touching it — LL-221.
   Profile: cannabis_dispensary needs different line names and KPIs.

7. FOOD_BEVERAGE_WATERFALL is missing. Nourish Kitchen gets the wrong nav.
   Fix this in the same commit as WP-FINANCIAL-PROFILES if possible.

8. NEVER write to these locked files without explicit owner confirm:
   src/components/StockItemModal.js
   src/components/ProteaAI.js
   src/components/PlatformBar.js
   src/services/supabaseClient.js

9. ALWAYS read these protected files in full before any edit:
   src/components/hq/HQStock.js (5,890 lines)
   src/components/hq/LiveFXBar.js

10. RULE 0Q: Claude.ai NEVER calls push_files or create_or_update_file. All repo writes via Claude Code.

---

*SESSION-STATE v235 · NuAi ERP · 11 April 2026*
*Written by Claude.ai (claude-sonnet-4-6) from live doc audit + MCP verification*
*Sessions covered: v234 (WP-MEDI-CAN Stage 1 + WP-INDUSTRY-PROFILES) + v235 (Stage 2 + WP-PROFILE-NAV)*
