# NUAI PLATFORM OVERVIEW v1.0
## Permanent orientation document — read BEFORE anything else
## Produced from LIVE-AUDIT v1.0 — direct codebase read — 09 April 2026
## This file is NEVER replaced. It is only appended with date-stamped updates.

---

## WHAT THIS SYSTEM ACTUALLY IS

NuAi is NOT a cannabis retail website. NuAi is NOT a dev project building features.

NuAi is a production multi-tenant SaaS ERP platform with 224,293 lines of code,
109 database tables, 6 distinct user portals, 10 cloud edge functions, and 4 industry
profiles — serving cannabis retail, food & beverage, general retail, and medical
cannabis from a single shared codebase and database.

This context must be in every agent's working model before any task is attempted.
A task that seems small (a VAT trigger, a stock modal) is a tiny increment on a
very large, very complete system. Understand the system before touching it.

---

## TRUE SCALE — FROM LIVE CODEBASE READ (09 Apr 2026)

| Metric | Figure |
|---|---|
| Total lines of production code | 224,293 |
| JavaScript source files | 180 |
| TypeScript Edge Function files | 10 |
| Database tables (all RLS-secured) | 109 |
| Database functions | 38 |
| Database triggers | 35 |
| Cloud edge functions deployed | 10 |
| Distinct user portals | 6 |
| HQ dashboard functional tabs | 41 |
| HR suite modules | 13 |
| Stock/inventory components | 17 |
| Industry profiles supported | 4 |
| Active client tenants | 5 |

**Largest files:**
HQProduction.js 8,949 lines · HQStock.js 5,890 · SmartInventory.js 5,343 ·
HQFoodIngredients.js 5,082 · StockControl.js 4,759 · AdminQRCodes.js 4,750 ·
HQLoyalty.js 4,537 · HQCogs.js 3,912 · Shop.js 4,115 · Account.js 3,447

---

## THE SIX PORTALS

| Portal | Route | Users | Key Capability |
|---|---|---|---|
| HQ Command Centre | /hq | HQ operator | 41-tab cross-tenant oversight — finance, stock, analytics, loyalty, fraud |
| Tenant Portal | /tenant-portal | Business owner | Waterfall nav — 35 tabs, role-gated, industry-profile adaptive |
| Admin Dashboard | /admin | Store manager | 13-tab store operations — batches, stock, customers, QR, comms |
| HR Suite | /hr | HR manager | 13 modules — timesheets, leave, roster, payroll, performance, disciplinary |
| Consumer Shop | /shop | Customers | E-commerce + loyalty + age gate + PayFast + cannabinoid education |
| Staff Portal | /staff | Staff | 4-tab self-service — profile, leave, timesheets, messages |

---

## MAJOR SYSTEMS — WHAT THEY DO

### 1. Financial Intelligence Suite (WP-FINANCIALS — COMPLETE)
10 phases, all live. IFRS-compliant statements from live operational data.
- Income Statement: revenue from orders, COGS from AVCO, expenses from expenses table
- Balance Sheet: assets (cash/inventory/PP&E), liabilities (payables/VAT), equity
- VAT Module: VAT201 format, 3-point automated pipeline (P3-A + P3-B + P3-C)
- Fixed Assets: IAS 16, straight-line depreciation, Run Depreciation workflow
- Journals: double-entry, COA picker, post/reverse, auto-type from Smart Capture
- Bank Recon: FNB account, 22 lines, R180,733.69 reconciled
- IFRS Statements: 4 statements, print/PDF, status workflow
- Year-End Close: 4-step wizard, closing journal, lock, archive
- Financial Notes: 15 IFRS disclosure notes from live data
- Financial Setup: 5-screen wizard gates all statements

Current live figures: R477,880 revenue · 62.13% gross margin · R296,606 net profit

### 2. Smart Capture & Automated Accounting
process-document EF (v53, 1,054 lines) + auto-post-capture EF (v2, 137 lines)
- AI reads any business document (invoice, delivery note, COA, receipt)
- 6-level HMAC anti-fraud fingerprint — prevents duplicate invoice submission
- SARS compliance check on every invoice capture
- Atomic: expense + double-entry journal + VAT trigger = one approved capture
- VAT pipeline: 3 automated entry points, all trigger-based, no manual entry

### 3. QR Authentication & Intelligence Network
sign-qr EF (v36) + verify-qr EF (v34) + AdminQRCodes.js (4,750 lines)
- HMAC-SHA256 cryptographic signing — same algorithm class as banking
- GPS coordinates, device fingerprint, timestamp captured on every scan
- Velocity fraud detection on scan_logs
- Loyalty points awarded per scan — tier/category/campaign multipliers
- 181 scans logged · 60 active codes · 62 system alerts
- Applications: product authentication, loyalty collection, packaging direction,
  geographic analytics, HR clock-in/out, consumer education

### 4. Inventory Intelligence (17 Components, 33,000+ Lines)
NOT a stock count. A complete inventory intelligence system:
- AVCO recalculated by DB trigger on every single stock movement
- 14 Product Worlds with custom fields per product type
- Smart Catalog: tile/list/Excel views, smart search syntax (price>500, qty:0),
  drag-to-resize columns, bulk actions, 6 KPI cards
- AI-scored velocity-weighted reorder recommendations → draft PO creation
- 3-step receiving workflow with VAT capture and AVCO update
- Blind/guided staff stock takes
- Inter-store transfers with TRF references
- COGS Builder: hardware/terpene/distillate/lab/transport/packaging/loyalty
- 2,289 stock movement records — complete audit trail

### 5. Loyalty & AI Customer Engine
HQLoyalty.js (4,537 lines) + loyalty-ai EF
- 10-tab programme management: tiers, campaigns, referrals, simulator, AI Engine
- Nightly AI engine: churn rescue, birthday bonus, stock boost, point expiry
- 401 loyalty transactions · 189 AI action logs · 263 points transactions
- WhatsApp notifications via Twilio on tier upgrades (send-notification EF v37)

### 6. HR Suite (13 Modules, 21,583 Lines)
- Timesheets, Leave (BCEA), Roster, Performance, Loans, Disciplinary, Contracts
- SimplePay CSV export for payroll
- SA public holidays (40) in calendar
- Staff stock takes: blind and guided modes

### 7. ProteaAI (2,346 Lines — LOCKED)
- 3 tabs: Chat (conversational), Query (natural language → live SQL), Dev (error monitor)
- Context-aware per portal tab — pre-suggests relevant questions
- ai-copilot EF v59: routes all AI queries, supports tool use
- systemOverride: callers can supply custom system prompts (used by Smart Capture)

### 8. Industry Profile System (4 Profiles, 26 Files with Branching)
One codebase, four industries:
- cannabis_retail: default — strains, THC/CBD, molecule education, QR auth
- cannabis_dispensary: SAHPRA, prescriptions, dispensing log (gated module)
- food_beverage: 16,085 lines exclusive — SA DAFF ingredients, HACCP, allergens,
  cold chain, nutrition labels, recall, FSCA letters (SA R638 compliance)
- general_retail: standard SKU management

### 9. Consumer Shop (Public Storefront)
- Age verification gate, adaptive product cards per industry profile
- PayFast payment gateway, loyalty redemption at checkout
- 7 interactive cannabinoid molecule visualisers (6,620 lines)
- Terpene education with flavour wheel and aroma profiles
- Product verification page at /verify/:productId (public, no login)

---

## EDGE FUNCTIONS (10 DEPLOYED)

| Function | Version | Purpose |
|---|---|---|
| process-document | v53 | AI document extraction — Smart Capture |
| auto-post-capture | v2 | Atomic expense + journal + VAT trigger |
| ai-copilot | v59 | All ProteaAI queries |
| sim-pos-sales | v4 | POS sales simulator for demos |
| payfast-checkout | v44 | PayFast payment initiation |
| payfast-itn | v39 | PayFast payment confirmation webhook |
| sign-qr | v36 | HMAC-SHA256 QR signing |
| verify-qr | v34 | QR verification + scan logging |
| get-fx-rate | v35 | Live USD/ZAR with 60s cache |
| send-notification | v37 | WhatsApp via Twilio — 7 business triggers |

---

## WHAT IS LOCKED OR PROTECTED

LOCKED (never write — Claude Code str_replace only for specific fields):
  src/components/StockItemModal.js — 14 Product Worlds
  src/components/ProteaAI.js — CODEBASE_FACTS str_replace only
  src/components/PlatformBar.js
  src/services/supabaseClient.js

PROTECTED (read full file before any change):
  src/components/hq/HQStock.js
  src/components/hq/LiveFXBar.js

---

## CRITICAL RULES (reference only — full rules in NUAI-AGENT-BIBLE.md)

RULE 0Q: NEVER push_files or create_or_update_file from Claude.ai. Ever.
LL-205: Every new DB table needs hq_all_ RLS bypass policy.
LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
LL-207: No tenantId props on HQ child components.
LL-208: Enumerate ALL tables a feature will query before any migration.

---

## HOW TO READ THIS SYSTEM

Do not assume a feature is small because the task description is small.
Before touching any file:
1. Read this document (done)
2. Read NUAI-AGENT-BIBLE.md (rules, patterns, lessons learned)
3. Read SESSION-STATE (current state, current priority)
4. Read VIOLATION_LOG (what went wrong before)
5. Read the actual file you are about to change (not the docs about it)

The LIVE-AUDIT is in docs/LIVE-AUDIT_v1_0_part1.md, part2.md, part3.md.
If you need to understand what a specific component does, read it.

---
*PLATFORM-OVERVIEW v1.0 · NuAi · First produced 09 April 2026*
*Updated: [add date-stamped entries below — never replace above]*

---
## Update: 10 Apr 2026 — AINS v1.0 + FIN-AUDIT v1.0 Complete

### WP-AINS v1.0 — COMPLETE (6 phases, ~1,400 lines added)

New intelligence surfaces on TenantPortal — all SQL-computed, zero LLM on open:
- Sidebar badges (live counts per nav section)
- Sub-item insights (1-line SQL fact per nav sub-item)
- IntelLines (2 clickable live facts above NuAi mark)
- NuAi mark (brand strip + today's key metric)
- IntelStrip (4-6 tab-specific pills between breadcrumb and content)
- NuAi panel brief (pre-loaded right now / working well / actions)
- Click-through (pill or IntelLine → NuAi pre-focused on that context)

New files: useNavIntelligence.js · IntelligenceContext.js · useIntelStrip.js
           IntelStrip.js · useBrief.js · NuAiBrief.js
Modified: AIFixture.js v2.0 · ProteaAI.js v1.8 · TenantPortal.js

PlatformBar removed from TenantPortal. Jobs absorbed by AINS surfaces.
PlatformBar retained in AppShell for /admin /hq /hr routes.

### FIN-AUDIT v1.0 — COMPLETE (4 gaps)

- GAP-01: Revenue ÷1.15 (SA VAT) in HQProfitLoss — d7d2df9
- GAP-02: Manual journal adjustments flow to P&L — c3b624c
- GAP-03: ExpenseManager VAT Review mode — 4b1a9fa
- GAP-04: Depreciation run — R822.22/month — owner action

### Pending next session

- WP-NAV-RESTRUCTURE: Sales channels unified, Finance section clean,
  Analytics moves to Customers, Reorder moves to Inventory
- Scan analytics: qr_codes join for tenant-scoped scan pills in useIntelStrip
