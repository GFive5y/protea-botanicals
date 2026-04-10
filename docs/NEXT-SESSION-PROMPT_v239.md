# NEXT SESSION START PROMPT — v239
## Updated: 11 April 2026
## HEAD: 32d130a (HQOverview dispensary revenue — final commit this session)
## Written by: Claude.ai + Claude Code · 11 April 2026 build day

---

## YOUR FIRST 5 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is 32d130a
2. Read docs/SESSION-STATE_v239.md IN FULL — it is the most complete
   platform state document ever produced. It supersedes all prior session docs.
3. Read docs/NUAI-AGENT-BIBLE.md — especially LL-206 CORRECTION and LL-224→237
4. Read docs/VIOLATION_LOG_v1_1.md — know what broke before you touch anything
5. Read the actual source file you intend to change (LL-221 — always)

Do NOT read any SESSION-STATE older than v239. Do NOT trust EF versions
in any document except SESSION-STATE v239 (older docs had stale versions).

---

## PLATFORM IN ONE SENTENCE

NuAi is a production multi-tenant SaaS ERP serving cannabis retail,
medical dispensary, food & beverage, and general retail from one React 18
codebase + Supabase backend. 9 tenants. 17 edge functions. 112 DB tables.
951 orders. R731k platform revenue. R20k dispensary revenue (separate source).

---

## CRITICAL RULES — MEMORISE BEFORE ANY CODE

RULE 0Q:  Claude.ai NEVER calls push_files or create_or_update_file. EVER.
           All repo writes via Claude Code only.
LL-221:   Read the actual source file before any edit. Disk is truth.
LL-226:   dispensing_log is Schedule 6. VOID ONLY. NEVER hard-delete.
LL-227:   Medi Can (2bd41eb7) is seeded. DO NOT RE-SEED.
LL-206:   CORRECTED — const { tenantId, industryProfile } = useTenant() is valid.
           Both tenantId and industryProfile are directly exposed on the context.
LL-205:   Every new DB table needs BOTH a tenant isolation policy AND
           hq_all_{table} bypass policy (is_hq_user()).
LL-061+237: ProteaAI.js — CODEBASE_FACTS str_replace + getSuggested() return
           arrays ONLY. All hooks/streaming/query/UI still locked.
LL-231:   cannabis_dispensary revenue = dispensing_log × sell_price (not orders)
LL-223:   Deno EFs CANNOT call sibling EFs via internal fetch — trigger externally

---

## LIVE PLATFORM FACTS (verified from Supabase, 11 Apr 2026)

Supabase project: uvicrqapgzcdvozxrreo (eu-west-1)
Live URL: https://nuai-gfive5ys-projects.vercel.app
Repo: github.com/GFive5y/protea-botanicals · branch: main

### Tenants (9 — DO NOT RE-SEED ANY)
| Name | tenant_id prefix | Profile | Revenue |
|---|---|---|---|
| Nu Ai HQ | 43b34c33 | operator | — |
| Medi Recreational | b1bad266 | cannabis_retail | 468 orders · R497k |
| Pure Premium THC Vapes | f8ff8d07 | cannabis_retail | 10 orders |
| Test Dispensary CT | 064adbdc | cannabis_retail | 0 orders |
| TEST SHOP | 4a6c7d5c | cannabis_retail | 0 orders |
| Vozel Vapes | 388fe654 | general_retail | 0 orders |
| Maxi Retail SA | 9766a3af | general_retail | 232 orders · R186k |
| Nourish Kitchen & Deli | 944547e3 | food_beverage | 240 orders · R43k |
| **Medi Can Dispensary** | **2bd41eb7** | **cannabis_dispensary** | **14 events · R20k** |

### Edge Functions (17 ACTIVE — actual deployed versions)
ai-copilot v70 · payfast-checkout v47 · payfast-itn v42 · sign-qr v39
verify-qr v37 · send-notification v40 · get-fx-rate v38 · process-document v56
sim-pos-sales v8 · create-admin-user v4 · auto-post-capture v5
receive-from-capture v4 · loyalty-ai v5 · send-email v1 (verify_jwt:TRUE LL-211)
invite-user v3 · seed-tenant v4 · trigger-sim-nourish v1 (OWNER SHOULD DELETE)

IMPORTANT: Previous docs said 12 EFs at lower versions — IGNORE them.
Always verify live: Supabase:list_edge_functions before referencing a version.

---

## WHAT WAS BUILT THIS SESSION (do not rebuild)

### COMPLETE — do not revisit
- WP-FINANCIAL-PROFILES: profile-adaptive P&L, ExpenseManager, HQForecast, HQCogs
- WP-MEDI-CAN Stage 1+2: full 6-tab clinical module (Patients/Rx/Dispensing/Reports/Compliance/CSR)
- WP-PROFILE-NAV: 4-branch waterfall + all F&B modules wired
- HQMedical: voiding UI (LL-226) · SAHPRA CSV export · CSR perpetual balance
- HQForecast: dispensary velocity from dispensing_log · S21/Rx clinical alerts
- HQOverview: dispensary revenue tiles (dispensingRevMTD/dispensingRevToday)
- ProteaAI: CODEBASE_FACTS refreshed · medical tab suggestions updated
- NUAI-AGENT-BIBLE: LL-206 corrected · LL-224→237 added
- TenantSetupWizard: already handles cannabis_dispensary correctly (no WP needed)
- TenantPortal: onNavigate prop passed to HQOverview

### KEY ARCHITECTURE PATTERNS (proven correct this session)
```javascript
// Profile-aware revenue
const { tenantId, industryProfile } = useTenant();
const revenue = industryProfile === "cannabis_dispensary"
  ? dispensingRevenue   // from dispensing_log × sell_price
  : orderRevenue;       // from orders table

// Dispensary revenue fetch (LL-231)
supabase.from("dispensing_log")
  .select("quantity_dispensed, inventory_items(sell_price)")
  .eq("tenant_id", tenantId)
  .neq("is_voided", true)
  .gte("dispensed_at", monthStart)

// TDZ rule — ALWAYS declare profileRevenue IMMEDIATELY before grossProfit
// grep for the consumer line number first — never insert at a "logical grouping"
```

---

## PRIORITY QUEUE FOR THIS SESSION

### Priority 1 — Delete trigger-sim-nourish EF (5 minutes — owner action)
This is a throwaway one-shot EF from demo seeding. It has no ongoing purpose.
Supabase Dashboard → Edge Functions → trigger-sim-nourish → Delete
OR: Supabase MCP → deploy a blank function to override, then contact support

### Priority 2 — Supabase Auth SMTP → Resend (owner action)
Dashboard → Authentication → Email Settings → SMTP → configure Resend
Required for: tenant invite emails · password resets · magic links
LL-211: send-email EF has verify_jwt:TRUE — test from prod URL, not localhost

### Priority 3 — CIPRO registration + nuai.co.za domain (owner action)
Required before: PayFast live keys · official client contracts · launch

### Priority 4 — ProteaAI getSuggested() for CSR/Compliance/Forecast tabs
LL-237 (LL-061 relaxed): getSuggested() return arrays may now be updated.
The Medical tab is now correct. CSR, Compliance, Forecast tabs still show generic.
Pattern: str_replace on the specific return array inside getSuggested()
File: src/components/ProteaAI.js (2,346 lines — only getSuggested() scope)

### Priority 5 — HQTradingDashboard dispensary awareness (low priority)
CANNABIS_DISPENSARY_WATERFALL has no trading tab — this is intentional.
Only relevant if owner decides to add a "Daily Dispensing" operations view.
Would need: dispensing velocity by day, average events, revenue per day.

### Priority 6 — New feature territory
Once priorities 1-3 are cleared, next feature development options:
  A. Multi-location stock transfers between Medi Can branches (if they expand)
  B. Patient portal — /patient route for appointment booking + dispensing history
  C. SAHPRA automated reporting — scheduled export to email
  D. Loyalty programme for dispensary — points on dispensing events
  E. WP-PRICING-V2 — channel-based pricing matrix improvements

---

## DEMO VERIFICATION CHECKLIST (run after any Vercel deploy)
Always test in NEW INCOGNITO window after confirming Vercel "Ready" status (LL-214)

Medi Can Dispensary (/tenant-portal):
[ ] Sidebar: Home / Clinical / Inventory / Financials / Operations / People
[ ] Clinical → Medical Records → 6 sub-tabs
[ ] Dispensing tab: Void button per row · Show Voided toggle
[ ] Reports tab: ↓ SAHPRA Export button
[ ] CSR tab: 8 products · all ✓ Balanced
[ ] Dashboard: "Dispensing Revenue MTD" → R20,000
[ ] Dashboard: "Events This Month" → 14
[ ] Dashboard: "Avg Dispensing Value" → ~R1,429
[ ] P&L: "Dispensing Revenue" label · non-zero
[ ] Forecast: Dispensing Forecast · S21 Pipeline card · Rx Repeat card

Nourish Kitchen (/tenant-portal):
[ ] Sidebar: Home / Kitchen / Food Safety / Inventory / Sales & Service / Financials / People
[ ] Kitchen → Recipe Engine loads (not "coming soon")
[ ] Food Safety → HACCP loads with CCP entries

HQ sidebar:
[ ] Groups read: Financials · Analytics · Purchasing (not Finance/Intelligence/Procurement)

---

## FILES NOT TO TOUCH WITHOUT READING IN FULL (LL-221)
| File | Size | Risk |
|---|---|---|
| src/components/hq/HQProfitLoss.js | 112KB+ | TDZ risk · profile branching |
| src/components/hq/HQCogs.js | 145KB | 3,912 lines (LL-233) |
| src/components/hq/HQStock.js | 208KB | 14 product worlds |
| src/components/hq/HQOverview.js | ~1,500 lines | Multi-fetch · realtime · profile branches |
| src/components/hq/HQMedical.js | ~70KB | 6 sub-tabs · Schedule 6 |
| src/pages/TenantPortal.js | ~1,200 lines | 4-branch waterfall routing |
| src/components/ProteaAI.js | 2,346 lines | LOCKED (LL-061+237) |
| src/components/StockItemModal.js | — | LOCKED |
| src/components/PlatformBar.js | — | LOCKED |
| src/services/supabaseClient.js | — | LOCKED |

---

## THE VISION

NuAi is South Africa's first AI-native multi-tenant ERP for specialty retail.
Built from a real cannabis retail business. One codebase, four industry profiles,
SAHPRA-compliant medical dispensary module, FSCA-compliant F&B food safety suite.
Replacing R1.4M+ of bespoke software at R3,500–R12,000/month per client.

The architecture is solid. The patterns are documented. The platform is live.
Every agent who reads this prompt has everything they need to build
the best ERP SaaS ever built in South Africa.

Go build something great.

---
*NEXT-SESSION-PROMPT v239 · NuAi · 11 April 2026*
*HEAD at time of writing: 32d130a*
*Previous prompt: NEXT-SESSION-PROMPT_v233.md (now superseded — do not read)*
