# SESSION-STATE v237
## Sessions covered: HQForecast profile-adaptive upgrade
## HEAD at close: 4d151bb on origin/main
## Previous: SESSION-STATE_v236.md (HEAD 2b31d06)
## Written: 11 April 2026

---

## MANDATORY READING ORDER FOR NEXT AGENT
1. docs/PLATFORM-OVERVIEW_v1_0.md
2. docs/NUAI-AGENT-BIBLE.md
3. docs/LL-ARCHIVE_v1_0.md
4. docs/SESSION-STATE_v237.md    ← this file
5. docs/WP-FINANCIAL-PROFILES_v1_0.md
6. docs/WP-INDUSTRY-PROFILES_v1_0.md
7. docs/VIOLATION_LOG_v1_1.md
8. The actual file you are about to change (LL-221)

---

## HEAD CHAIN THIS SESSION
da97cd8 → e8450ec → f3ebbfb → f6e4a23 → 418a014 → e131939 → 42450f8 → 2b31d06 → 4d151bb

Notable:
  2b31d06 — TDZ hotfix: profileRevenue declared before grossProfit in HQProfitLoss.js
  4d151bb — HQForecast.js dispensary + F&B profile-adaptive upgrade

---

## PLATFORM STATE (4d151bb, 11 April 2026)

### All 6 files from WP-FINANCIAL-PROFILES — COMPLETE AND LIVE
| File | Status | Key change |
|---|---|---|
| useNavConfig.js | ✅ e5c2108 | Finance→Financials · Intelligence→Analytics · Procurement→Purchasing |
| TenantPortal.js | ✅ da97cd8 + e8450ec | FOOD_BEVERAGE_WATERFALL + 9 F&B renderTab cases |
| seed-tenant/index.ts | ✅ f3ebbfb | v4 repo sync — cannabis_dispensary branch |
| HQProfitLoss.js | ✅ f6e4a23 + 2b31d06 | Dispensing revenue · profile benchmarks · Food Cost % KPI · TDZ fix |
| ExpenseManager.js | ✅ 418a014 | Profile-aware subcategory system |
| HQCogs.js | ✅ e131939 | Header copy update |

### HQForecast.js — NOW COMPLETE (4d151bb)
File: src/components/hq/HQForecast.js

Profile routing:
  cannabis_dispensary → dispensing_log × sell_price velocity
  all others          → orders table velocity (unchanged)

New for dispensary:
  dispensingVelocity: 14 events × sell_price → R20,000 revenue signal
  dispensingDepletion: velMap from dispensing_log per inventory_item_id
  clinicalAlerts.s21Expiring: patients with S21 expiring ≤60 days (Fatima 25d · Sarah ~60d)
  clinicalAlerts.rxLow: prescriptions with ≤2 repeats remaining (James Olivier: 2 left)

Profile-adaptive empty state:
  dispensary: "Record dispensing events in the Clinical tab..."
  food_beverage: "Run the POS till or record sales..."
  default: "Run the sales simulator..." (original copy)

F&B depletion guard: shows "tracked via production runs in Kitchen tab" instead of empty table

New LL rules:
  LL-235: HQForecast dispensary velocity = dispensing_log × sell_price (not orders)
  LL-236: S21 expiry + Rx repeat warnings are clinical forecast signals — dispensary only

### LIVE DEMO NUMBERS — Medi Can Forecast tab
Dispensing Revenue (30d): R20,000 (14 events)
Projected Revenue:        ~R60,000/month
Dispensing Margin:        ~69.5% (green — threshold 50%)
Stock Depletion:          All formulary items 60–120+ days of stock — all green
S21 Expiry Pipeline:      Fatima Davids 25 days (amber) · Sarah Khumalo ~60 days (amber)
Rx Repeat Warnings:       James Olivier 2 repeats remaining (warning)

---

## ALL LL RULES — CURRENT STATE

### Closed this session (v236 + v237)
LL-193: CLOSED — seed-tenant repo synced to v4
LL-224: CLOSED — all profiles now have profile-adaptive P&L
LL-231: CLOSED — dispensary revenue = dispensing_log (HQProfitLoss + HQForecast)
LL-232: CLOSED — F&B margin thresholds correct (65% green)
LL-233: HONORED — HQCogs read in full (only 14 lines touched)
LL-234: HONORED — SUBCATEGORY_TO_ACCOUNT additive only
LL-235: NEW — HQForecast dispensary velocity = dispensing_log × sell_price
LL-236: NEW — clinicalAlerts (S21 + Rx) = dispensary only, never other profiles

### Active (never violate)
LL-225: cannabis_dispensary nav NEVER shows Wholesale/Distribution/Retailers
LL-226: dispensing_log = Schedule 6 — NEVER hard-delete; void only
LL-227: Medi Can 2bd41eb7 — seed_complete = true — DO NOT RE-SEED
LL-228: HQMedical gated — cannabis_dispensary + feature_medical = true
LL-205: Every new DB table needs hq_all_ RLS bypass policy
LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
LL-207: No tenantId props on HQ child components
LL-221: Read the actual file before any edit

---

## EDGE FUNCTIONS
| Slug | Version | Status |
|---|---|---|
| seed-tenant | v4 | ACTIVE — repo and deployed now in sync |
| ai-copilot | v59 | ACTIVE |
| process-document | v53 | ACTIVE |
| trigger-sim-nourish | v1 | ACTIVE — **OWNER SHOULD DELETE** |
| (all others) | various | ACTIVE — unchanged |

---

## PRIORITY QUEUE — NEXT SESSION

### Priority 1 — ProteaAI CODEBASE_FACTS refresh (LOCKED file)
File: src/components/ProteaAI.js
Rule: LL-061 — CODEBASE_FACTS str_replace ONLY. Never touch anything else in this file.
The AI copilot is telling users the system has:
  - Wrong revenue figures (stale from before WP-FINANCIAL-PROFILES)
  - Wrong profile count
  - No mention of Medi Can Dispensary, clinical module, dispensary nav
  - Wrong LL rule count
Find: const CODEBASE_FACTS = `
Replace: the full updated string with current platform state
Risk: LOW — str_replace on a string literal. Single edit.

### Priority 2 — Dispensary voiding UI (LL-226 compliance)
The dispensing_log has is_voided/void_reason/void_at/void_by columns (added in v234).
No UI exists to void a dispensing event.
HQMedical.js DispensingTab needs:
  - Void button per row (replaces delete which must never exist — LL-226)
  - Void confirmation modal (reason required)
  - Voided rows displayed differently (strikethrough, dim) but still visible (audit trail)
  - Filter toggle: show/hide voided entries
File: src/components/hq/HQMedical.js (~68KB — LL-221 read first)

### Priority 3 — Controlled Substance Register (CSR) view
A perpetual running balance of each controlled substance:
  Opening stock + received - dispensed = current balance
Needed for SAHPRA compliance inspections.
Could be a new 6th sub-tab in HQMedical.js (after existing 5).
No DB schema changes needed — reads batches + stock_movements + dispensing_log.

### Priority 4 — WP-WIZARD-V2 (industry-aware onboarding)
TenantSetupWizard.js (52KB) currently ignores industry_profile.
A new cannabis_dispensary tenant created via wizard:
  - Does not have feature_medical: true set on branding_config
  - Does not see Clinical nav on first login
  - seed-tenant v4 handles seeding correctly but wizard must PASS cannabis_dispensary
File: src/components/hq/TenantSetupWizard.js (read in full — LL-221)

### Priority 5 — HQForecast F&B enhancement
Currently F&B depletion shows "tracked via Kitchen tab" — correct but empty.
Could show: projected covers per day, food cost % trend, top revenue dishes.
Depends on sufficient order data from sim-pos-sales.
Not blocking — Nourish Kitchen has 240 orders, data exists.

---

## OWNER ACTIONS (outstanding since v233)
- Delete trigger-sim-nourish EF (throwaway — no longer needed)
- Supabase Auth SMTP → Resend (email auth for tenants)
- CIPRO registration + nuai.co.za domain

---

## SESSION CLOSE — WHAT EVERY NEXT AGENT MUST KNOW

1. HEAD is 4d151bb. Confirm before any work.

2. WP-FINANCIAL-PROFILES AND HQFORECAST ARE COMPLETE.
   Do not re-architect what is shipped. Build forward.

3. ProteaAI.js is LOCKED. LL-061: CODEBASE_FACTS str_replace ONLY.
   The CODEBASE_FACTS const is a template literal. Find it, replace the whole string.
   Never touch component JSX, hooks, or logic in that file.

4. MEDI CAN IS SEEDED. DO NOT RE-SEED.
   tenant_id: 2bd41eb7-1a6e-416c-905b-1358f6499d8d

5. TDZ PATTERN — LESSON LEARNED (2b31d06):
   When inserting const declarations that depend on earlier state (like profileRevenue),
   ALWAYS place the declaration IMMEDIATELY before its first consumer.
   Never insert at a "logical grouping" point that is after the first use.
   Confirm by grepping for the consumer line number before placing the declaration.

6. RULE 0Q: Claude.ai NEVER calls push_files or create_or_update_file. All repo writes via Claude Code.

---
*SESSION-STATE v237 · NuAi ERP · 11 April 2026*
*HQForecast dispensary upgrade · LL-235 + LL-236 defined*
