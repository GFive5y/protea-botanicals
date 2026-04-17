# WP-TRIAGE.md
## Session 316.5b.1 · Triage baseline for WP register build
## DO NOT USE AS AUTHORITATIVE REGISTER — scratch file for S316.5b.2/3
## HEAD at triage time: bad9022
## WP count: 32 (6 WP-ANALYTICS-1 through 5 + WP-ANALYTICS.md deleted from disk)

---

## CLASSIFICATION TABLE

| # | Filename | Purpose | Status | Confidence | Notes |
|---|---|---|---|---|---|
| 1 | WP-AINS_v1_0.md | Ambient intelligence layer: sidebar badges, IntelStrip, NuAiBrief | SCOPED | HIGH | 10 Apr 2026. 6-phase spec, no execution evidence |
| 2 | WP-ANALYTICS-6.md | Group Portal Network Intelligence module (final of 6) | SHIPPED | HIGH | "Status: COMPLETE" commit acb007c, 12 Apr 2026 |
| 3 | WP-DAILY-OPS-TIER2.md | 30-day revenue chart + history selector for HQTradingDashboard | STALE | MEDIUM | 4 Apr. Likely overtaken by WP-UNIFY completion |
| 4 | WP-DASHBOARD-IB_v1_0.md | Contextual delta-comparison info bubbles on HQOverview KPI tiles | SCOPED | MEDIUM | 7 Apr. "P1 — NEXT TO BUILD." No completion signals |
| 5 | WP-DEMO-AUDIT_v1_0.md | Demo readiness methodology + SQL scripts for 12 May CA demo | IN-PROGRESS | HIGH | 13 Apr. Living doc, no close date |
| 6 | WP-DEMO-CA-RESCUE_v1_0.md | CA demo experience: QR wizard, industry-seeded tenants, personalised entry | SCOPED | HIGH | 12 Apr. "REQUIREMENTS — awaiting gap audit" |
| 7 | WP-DEMO-FACTORY_brainstorm_v1_0.md | Brainstorm: demo pipeline vs permanent product feature | STALE | HIGH | 11 Apr. "BRAINSTORM ONLY." Superseded by DEMO-CA-RESCUE |
| 8 | WP-DESIGN-SYSTEM.md | Master design system gospel: DS-1 through DS-6, component roadmap | IN-PROGRESS | HIGH | 11 Apr. DS-1 COMPLETE. Superseded at governance level by WP-UNIFY |
| 9 | WP-DS-6-PHASE2_v1_0.md | Shell unification + AINS bar visual integration | SHIPPED | HIGH | Phase 1+2 both COMPLETE with commits |
| 10 | WP-DS6-UNIFICATION-BRIEF.md | Root-cause diagnosis of DS6 failures, 5-step execution order | STALE | MEDIUM | S283. Predates WP-UNIFY. Problems it diagnosed were addressed |
| 11 | WP-FINANCIAL-PROFILES_v1_0.md | Industry-profile-aware financial pages (dispensary P&L, F&B cost) | IN-PROGRESS | HIGH | 11 Apr. "IN PROGRESS." Introduces LL-231-234 |
| 12 | WP-FINANCIALS-v1_1.md | Full IFRS statements module: setup wizard, chart of accounts, PDF | SCOPED | HIGH | 7 Apr. 23-hour plan. No execution started |
| 13 | WP-FIN_v1_0.md | Fix broken P&L: persist OpEx, AVCO-based COGS, wholesale revenue | STALE | MEDIUM | March 23. Oldest financial WP. Partially superseded |
| 14 | WP-FNB_SOP_v1.md | F&B module standing operating procedure (S1-S7 complete, S8 next) | IN-PROGRESS | HIGH | March 25. Living SOP. "All 7 sessions complete" |
| 15 | WP-FORECAST-v1_0.md | Forecasting engine: revenue/profit projections, stock depletion | STALE | HIGH | 7 Apr. Stub (~25 lines). Likely absorbed into HQForecast.js |
| 16 | WP-INDUSTRY-PROFILES_v1_0.md | Full industry-specific ERP treatment for all 5 profiles | IN-PROGRESS | HIGH | 11 Apr. "PLANNING." Partially executed |
| 17 | WP-INTELLIGENCE-AUDIT_v1_0.md | Data intelligence audit for Medi Rec: real vs seed data, POS gap | SHIPPED | HIGH | 7 Apr. Audit complete. Source-of-truth report |
| 18 | WP-INTELLIGENCE_v1_0.md | 5-phase retail intelligence stack: velocity, demand, basket, churn | SCOPED | MEDIUM | 7 Apr. No phases marked COMPLETE in doc |
| 19 | WP-O_v2_0_Loyalty_Engine_Spec.md | Full loyalty economics engine: config table, tiers, referrals, AI | SCOPED | MEDIUM | March. "READY TO BUILD." Unclear how much shipped |
| 20 | WP-PL-INTELLIGENCE-v1_0.md | P&L upgrade: order_items + AVCO COGS, margin by product | STALE | MEDIUM | 7 Apr. Stub (~20 lines). Likely absorbed |
| 21 | WP-PROTEAAI-FULLSPEC_v1_0.md | ProteaAI upgrade: streaming, tool use, health checks, memory | SCOPED | HIGH | 9 Apr. "READY TO BUILD." Some phases may have shipped |
| 22 | WP-REORDER_v1_0.md | Smart procurement: flag items, group by supplier, create POs | SCOPED | HIGH | 2 Apr. "SCOPING — session required before build" |
| 23 | WP-SIM-POS-v2_0.md | sim-pos-sales EF v2: pos_sessions, stock_movements, eod_cash_ups | SCOPED | MEDIUM | 7 Apr. Stub. Unclear if v2 additions shipped |
| 24 | WP-SMART-CAPTURE_v1_0.md | AI receipt/invoice capture with SARS compliance and auto-post | SHIPPED | HIGH | "Session 1 Complete." 2 EFs built. Phase 2 TODO |
| 25 | WP-SMART-CATALOG_v1_1.md | Smart inventory catalog: tile/list views, smart search, pill nav | SHIPPED | HIGH | "SC-01 through SC-10 ALL COMPLETE" |
| 26 | WP-STOCK-MERGE_v1_0.md | Future: merge Stock + Smart Catalog + Reorder into one hub | DEFERRED | HIGH | "PLACEHOLDER — future WP." Prerequisites not met |
| 27 | WP-STOCK-RECEIVE-S3_v1_0.md | StockReceiveModal rebuild with product-world-aware item picker | SHIPPED | MEDIUM | March 31. ProductWorlds.js on disk. No commit in doc |
| 28 | WP-TABLE-UNIFY_PHASE1_AUDIT_v1.md | DS6 violation audit of HQFoodIngredients + StockControl | SHIPPED | HIGH | 17 Apr. Read-only audit artefact |
| 29 | WP-TABLE-UNIFY_PHASE2_v1.md | 72-hour Ingredient Encyclopedia rebuild (5 sub-phases 2A-2E) | DEFERRED | HIGH | "EXECUTION POST-DEMO." Do not start before 13 May |
| 30 | WP-TABLE-UNIFY_v1_0.md | Table DS6 compliance + Smart Catalog feature parity + F&B wiring | IN-PROGRESS | HIGH | Phase 0/0.5/0.7 CLOSED. Phase 1 IN PROGRESS |
| 31 | WP-TENANT-GROUPS.md | Franchise/group ownership: DB tables, /group-portal, RLS, UI | SHIPPED | HIGH | "SPEC COMPLETE." GroupPortal.js + all components on disk |
| 32 | WP-UNIFY_v1_0.md | Governing design unification: 8 UNIFY rules, migration tracker | SHIPPED | HIGH | All P1+P2 components COMPLETE with commits |

---

## DEPENDENCIES

| WP | References / Depends On |
|---|---|
| WP-AINS | WP-DS-6 (shell), WP-DESIGN-SYSTEM |
| WP-DEMO-CA-RESCUE | WP-DEMO-AUDIT (prerequisite), WP-DEMO-FACTORY (parent brainstorm) |
| WP-FINANCIAL-PROFILES | WP-FIN (predecessor), introduces LL-231-234 |
| WP-FINANCIALS-v1_1 | WP-FIN (supersedes), WP-FINANCIAL-PROFILES |
| WP-FORECAST | Depends on WP-PL-INTELLIGENCE (explicitly stated) |
| WP-INTELLIGENCE | Depends on order_items write (WP-INTELLIGENCE-AUDIT finding) |
| WP-REORDER | Depends on WP-SMART-CATALOG SC-01-10 (complete) |
| WP-STOCK-MERGE | Depends on WP-SMART-CATALOG + WP-REORDER Phase 1 |
| WP-TABLE-UNIFY-PHASE2 | Depends on Phase 1 COMPLETE + FoodWorlds.js + ProteaAI v1.8 (all met) |
| WP-UNIFY | Supersedes WP-DS6-UNIFICATION-BRIEF, WP-DESIGN-SYSTEM DS-6 |

---

## DUPLICATION CONCERNS

**Group 1 — Design System (4 docs, overlapping):**
WP-DESIGN-SYSTEM, WP-DS6-UNIFICATION-BRIEF, WP-DS-6-PHASE2, WP-UNIFY.
WP-UNIFY is canonical authority. Others are historical or absorbed.

**Group 2 — Financial Layer (4 docs, layered):**
WP-FIN, WP-PL-INTELLIGENCE, WP-FINANCIALS-v1_1, WP-FINANCIAL-PROFILES.
WP-FIN and WP-PL-INTELLIGENCE are stale stubs. Active work split across
WP-FINANCIALS and WP-FINANCIAL-PROFILES.

**Group 3 — Demo (3 docs):**
WP-DEMO-FACTORY (brainstorm, superseded), WP-DEMO-CA-RESCUE (spec),
WP-DEMO-AUDIT (methodology). FACTORY is archive candidate.

**Group 4 — Table Unification (3 docs, sequential hierarchy):**
WP-TABLE-UNIFY (gospel), PHASE1_AUDIT (artefact), PHASE2 (sub-phase spec).
Correctly structured — not duplication.

**Group 5 — Inventory/Stock (3 docs, sequential roadmap):**
WP-SMART-CATALOG (shipped), WP-REORDER (scoped), WP-STOCK-MERGE (deferred).
Dependency chain well-documented.

---

## LOW-CONFIDENCE AND UNKNOWN ROWS

| # | WP | Confidence | Investigation needed |
|---|---|---|---|
| 19 | WP-O_v2_0 Loyalty Engine | MEDIUM | How much of the schema/EF work landed? Loyalty components exist but full engine spec unclear |
| 21 | WP-PROTEAAI-FULLSPEC | HIGH (status) but scope unclear | Which of Phases 1-5 shipped? ProteaAI is v1.8 but which spec phases does that cover? |
| 23 | WP-SIM-POS-v2_0 | MEDIUM | Did v2 additions (pos_sessions, eod_cash_ups) ship? sim-pos-sales EF exists but version unclear |
| 27 | WP-STOCK-RECEIVE-S3 | MEDIUM | No commit cited. ProductWorlds.js on disk suggests shipped but not confirmed |

---

## SUMMARY

| Status | Count |
|---|---|
| SHIPPED | 9 |
| IN-PROGRESS | 6 |
| SCOPED | 9 |
| DEFERRED | 2 |
| STALE | 6 |
| **Total** | **32** |

**Archival candidates (5):** WP-DEMO-FACTORY-brainstorm, WP-DS6-UNIFICATION-BRIEF,
WP-FIN_v1_0, WP-PL-INTELLIGENCE-v1_0, WP-FORECAST-v1_0.
All superseded by newer docs, purpose absorbed, or pure brainstorm.

---

## RECOMMENDATIONS FOR S316.5b.2

1. Investigate the 4 LOW/MEDIUM-confidence rows (code grep, EF version check)
2. Verify the 5 archival candidates with owner before moving
3. Resolve Group 2 (Financial) duplication — which doc is the active financial spec?
4. Check whether WP-DESIGN-SYSTEM should be archived or kept as historical reference
5. Confirm WP-TABLE-UNIFY Phase 1 completion status (the S293 campaign shipped 6 PRs)

---

*WP-TRIAGE.md · Scratch file · Session 316.5b.1 · 18 April 2026*
