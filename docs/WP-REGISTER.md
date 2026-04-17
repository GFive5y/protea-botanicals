# WP-REGISTER.md
## Active work packages, ranked by priority
## READ THIS AT SESSION START to pick primary workstream
## UPDATE THIS FILE when: WP status changes, new WP scoped, priority reassessed
## HEAD at last update: 6451151
## Last reviewed: 18 April 2026 (S320)
## Total active WPs: 15 (8 IN-PROGRESS + 6 SCOPED + 1 DEFERRED)

---

## HOW TO USE THIS REGISTER

At session start:
1. Read PRIMARY section — this is what the current session should work on
2. Check SECONDARY — context for what's parallel-active
3. BACKLOG/CLOSED are reference only
4. If session scope contradicts PRIMARY, pause and discuss with owner

PRIMARY is a choice, not a ranking. One or two WPs at most.

---

## PRIMARY

### [Owner picks at next session start]

Candidates discussed but not committed:
- Financial cluster (FIN-002/003/006 from DEBT_REGISTER) — tactical, short
- WP-AINS Phase completion — sidebar badge integration remaining
- WP-TABLE-UNIFY Phase 1 close-out — Phase 1 PR2/PR3 remain
- Any SCOPED WP the owner elevates

---

## SECONDARY (active but not primary)

### WP-AINS
Status: IN-PROGRESS
Doc: docs/WP-AINS_v1_0.md
Goal: Ambient intelligence layer — sidebar badges, IntelStrip, NuAiBrief
Next action: Wire IntelStrip into PlatformBar sidebar. Phase 3+4 components exist but integration pending.
Exit criteria: All 6 phases shipped, badges visible in nav sidebar

### WP-DEMO-AUDIT
Status: IN-PROGRESS
Doc: docs/WP-DEMO-AUDIT_v1_0.md
Goal: Demo readiness methodology + per-tenant SQL audit scripts
Next action: Update for current demo date (NOT CONFIRMED). Living doc.
Exit criteria: Demo passes audit checklist

### WP-DESIGN-SYSTEM
Status: IN-PROGRESS (governance role superseded by WP-UNIFY)
Doc: docs/WP-DESIGN-SYSTEM.md
Goal: Master design system gospel — DS-1 through DS-6
Next action: DS-2+ sub-WPs listed as NOT STARTED
Exit criteria: All DS sub-WPs shipped (WP-UNIFY handles enforcement)

### WP-FINANCIAL-PROFILES
Status: IN-PROGRESS
Doc: docs/WP-FINANCIAL-PROFILES_v1_0.md
Goal: Industry-profile-aware financial pages (LL-231-234)
Next action: Complete profile-specific P&L/BS treatment per industry
Exit criteria: All 4 industry profiles show correct financial labels

### WP-FNB-SOP
Status: IN-PROGRESS
Doc: docs/WP-FNB_SOP_v1.md
Goal: F&B module SOP — S1-S7 complete, S8 (Intelligence Dashboard) next
Next action: S8 build
Exit criteria: S8 Intelligence Dashboard shipped

### WP-INDUSTRY-PROFILES
Status: IN-PROGRESS
Doc: docs/WP-INDUSTRY-PROFILES_v1_0.md
Goal: Full industry-specific ERP treatment for all profiles
Next action: Partially executed — complete remaining profile adaptations
Exit criteria: All 5 industry profiles fully differentiated

### WP-TABLE-UNIFY
Status: IN-PROGRESS (Phase 1)
Doc: docs/WP-TABLE-UNIFY_v1_0.md
Goal: Table DS6 compliance + Smart Catalog feature parity + F&B wiring
Next action: Phase 1 PR2 (READY), PR3 (POST-DEMO). Phase 2 → separate WP.
Exit criteria: Phase 1 all PRs shipped

### WP-TABLE-UNIFY-PHASE2
Status: IN-PROGRESS (2A → 2D, ~57h)
Doc: docs/WP-TABLE-UNIFY_PHASE2_v1.md
Goal: Ingredient Encyclopedia Rebuild — SmartInventory parity + AI ingest + recipe linkage + compliance view
Next action: Phase 2A (SmartInventory feature parity). Execution unlocked S320.
Exit criteria: 2A-2D gates green. 2E deferred.

---

## SCOPED (ready to start when prioritized)

| WP | Doc | Goal |
|---|---|---|
| WP-DASHBOARD-IB | docs/WP-DASHBOARD-IB_v1_0.md | KPI delta-comparison info bubbles on HQOverview |
| WP-DEMO-CA-RESCUE | docs/WP-DEMO-CA-RESCUE_v1_0.md | CA demo QR wizard + personalised entry experience |
| WP-FINANCIALS-v1_1 | docs/WP-FINANCIALS-v1_1.md | Full IFRS statements module (23h, 4-session plan) |
| WP-INTELLIGENCE | docs/WP-INTELLIGENCE_v1_0.md | 5-phase retail intelligence stack |
| WP-O-LOYALTY-v2 | docs/WP-O_v2_0_Loyalty_Engine_Spec.md | Loyalty engine schema extensions beyond current live |
| WP-REORDER | docs/WP-REORDER_v1_0.md | Smart procurement from Smart Catalog |

---

## DEFERRED (parked with reason)

| WP | Doc | Reason | Unlock |
|---|---|---|---|
| WP-STOCK-MERGE | docs/WP-STOCK-MERGE_v1_0.md | Placeholder — future consolidation | WP-SMART-CATALOG + WP-REORDER Phase 1 complete |

---

## BACKLOG (future, not yet scoped)

- **LOOP-FIN-004** — Trial Balance Excel Export (2hrs, SheetJS)
- **LOOP-FIN-005** — Provisional Tax + Compliance Calendar
- **BACKLOG-001** — Contextual action intelligence in breadcrumb header
- **BACKLOG-003** — WP-TENANT-GROUPS remaining items (GP-001 to GP-006)
- **DEFERRED** — RLS policy consolidation (~100 duplicate policy pairs)
- **S314.2c-b** — Owner writes real content for 9 generic default templates

---

## CLOSED (shipped — historical record)

| WP | Doc | Shipped | Notes |
|---|---|---|---|
| WP-ANALYTICS-6 | docs/WP-ANALYTICS-6.md | acb007c, 12 Apr | Network Intelligence module |
| WP-DS-6-PHASE2 | docs/WP-DS-6-PHASE2_v1_0.md | cf9241e+2df028f, 13 Apr | Shell unification + AINS bar |
| WP-INTELLIGENCE-AUDIT | docs/WP-INTELLIGENCE-AUDIT_v1_0.md | 7 Apr | Data audit report (Medi Rec) |
| WP-O-LOYALTY-v2 | docs/WP-O_v2_0_Loyalty_Engine_Spec.md | March-Apr | Core schema shipped, 10 files use it |
| WP-PROTEAAI-FULLSPEC | docs/WP-PROTEAAI-FULLSPEC_v1_0.md | v1.8 live | Streaming + tool use + query tab |
| WP-SIM-POS-v2 | docs/WP-SIM-POS-v2_0.md | EF v3.0 | Superseded by v3 parameterised |
| WP-SMART-CAPTURE | docs/WP-SMART-CAPTURE_v1_0.md | Apr | Session 1 complete, Phase 2 TODO |
| WP-SMART-CATALOG | docs/WP-SMART-CATALOG_v1_1.md | SC-01-10 | All 10 sub-tasks complete |
| WP-STOCK-RECEIVE-S3 | docs/WP-STOCK-RECEIVE-S3_v1_0.md | March | StockReceiveModal + ProductWorlds |
| WP-TABLE-UNIFY-PHASE1-AUDIT | docs/WP-TABLE-UNIFY_PHASE1_AUDIT_v1.md | 17 Apr | Read-only audit artefact |
| WP-TENANT-GROUPS | docs/WP-TENANT-GROUPS.md | 11 Apr | GroupPortal.js + all components |
| WP-UNIFY | docs/WP-UNIFY_v1_0.md | 13 Apr | 8 UNIFY rules, all P1+P2 COMPLETE |
| Safety campaign | DEBT_REGISTER_v1.md | S293-S314.4 | 31 sessions, 146 RLS policies, 70 React fixes |
| Financial debt | DEBT_REGISTER_v1.md | S316-S317 | FIN-001/002/003/006 fixed. LL-296/297/298 added |

---

## ARCHIVED (superseded or purely historical)

| Doc | Reason |
|---|---|
| WP-DEMO-FACTORY_brainstorm_v1_0.md | Superseded by WP-DEMO-CA-RESCUE |
| WP-DS6-UNIFICATION-BRIEF.md | Absorbed by WP-UNIFY |
| WP-FIN_v1_0.md | Superseded by WP-FINANCIALS-v1_1 |
| WP-PL-INTELLIGENCE-v1_0.md | Absorbed into HQProfitLoss.js |
| WP-FORECAST-v1_0.md | Absorbed into HQForecast.js |
| WP-SIM-POS-v2_0.md | Superseded by EF v3.0 |
| WP-STOCK-RECEIVE-S3_v1_0.md | Shipped, historical |

### STALE (kept for reference, not tracked)

| Doc | Reason |
|---|---|
| WP-DAILY-OPS-TIER2.md | Overtaken by WP-UNIFY completion |
| WP-DEMO-FACTORY_brainstorm_v1_0.md | Pure brainstorm, no execution |
| WP-DS6-UNIFICATION-BRIEF.md | Predates WP-UNIFY, problems addressed |
| WP-FIN_v1_0.md | Oldest financial WP, partially superseded |

---

## INDEX — ALL WP DOCS

| WP Doc | Section |
|---|---|
| WP-AINS_v1_0.md | SECONDARY |
| WP-ANALYTICS-6.md | CLOSED |
| WP-DAILY-OPS-TIER2.md | STALE |
| WP-DASHBOARD-IB_v1_0.md | SCOPED |
| WP-DEMO-AUDIT_v1_0.md | SECONDARY |
| WP-DEMO-CA-RESCUE_v1_0.md | SCOPED |
| WP-DEMO-FACTORY_brainstorm_v1_0.md | ARCHIVED |
| WP-DESIGN-SYSTEM.md | SECONDARY |
| WP-DS-6-PHASE2_v1_0.md | CLOSED |
| WP-DS6-UNIFICATION-BRIEF.md | ARCHIVED |
| WP-FINANCIAL-PROFILES_v1_0.md | SECONDARY |
| WP-FINANCIALS-v1_1.md | SCOPED |
| WP-FIN_v1_0.md | ARCHIVED |
| WP-FNB_SOP_v1.md | SECONDARY |
| WP-FORECAST-v1_0.md | ARCHIVED |
| WP-INDUSTRY-PROFILES_v1_0.md | SECONDARY |
| WP-INTELLIGENCE-AUDIT_v1_0.md | CLOSED |
| WP-INTELLIGENCE_v1_0.md | SCOPED |
| WP-O_v2_0_Loyalty_Engine_Spec.md | CLOSED |
| WP-PL-INTELLIGENCE-v1_0.md | ARCHIVED |
| WP-PROTEAAI-FULLSPEC_v1_0.md | CLOSED |
| WP-REORDER_v1_0.md | SCOPED |
| WP-SIM-POS-v2_0.md | ARCHIVED |
| WP-SMART-CAPTURE_v1_0.md | CLOSED |
| WP-SMART-CATALOG_v1_1.md | CLOSED |
| WP-STOCK-MERGE_v1_0.md | DEFERRED |
| WP-STOCK-RECEIVE-S3_v1_0.md | ARCHIVED |
| WP-TABLE-UNIFY_PHASE1_AUDIT_v1.md | CLOSED |
| WP-TABLE-UNIFY_PHASE2_v1.md | SECONDARY |
| WP-TABLE-UNIFY_v1_0.md | SECONDARY |
| WP-TENANT-GROUPS.md | CLOSED |
| WP-UNIFY_v1_0.md | CLOSED |

---

*WP-REGISTER.md · NuAi · Created S316.5b.3 · Update at every session close*
