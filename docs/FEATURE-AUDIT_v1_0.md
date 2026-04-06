# FEATURE-AUDIT v1.0 — NuAi Platform
## Produced: 07 Apr 2026 · Session v197 (audit session)
## Based on: SESSION-STATE v193, live GitHub codebase, live Supabase DB
## Methodology: 4-layer audit — codebase scan, nav wiring, DB reality, component headers

---

## AUDIT SUMMARY

| Status | Count | % of total |
|---|---|---|
| ✅ WORKING | 24 | 31% |
| ⚡ WIRED-UNTESTED | 28 | 37% |
| 🔌 NOT WIRED | 3 | 4% |
| 🔧 PARTIAL | 6 | 8% |
| ❌ BROKEN | 3 | 4% |
| 📋 PLANNED | 0 | 0% |
| 🔒 LOCKED | 4 | 5% |
| SUB-COMPONENT | 10 | 13% |

**Total features / major components audited: 78**
**Total component files (hq/ + root + pages): 96**
**Total DB tables: 104 · Tables with data: 58 · Empty: 46**

---

## CRITICAL GAPS (priority order)

1. **POS till locked (P5)** — No active session = zero sales possible
2. **GeoAnalyticsDashboard NOT WIRED** — 38KB geographic analytics inaccessible
3. **CannabisDetailView NOT WIRED** — 49KB product detail inaccessible
4. **TenantSetupWizard NOT WIRED** — 52KB onboarding wizard with no entry point
5. **invoices table EMPTY** — HQInvoices wired but nothing to show
6. **orders.channel missing (P4)** — Cannot distinguish POS vs Online vs Wholesale
7. **ExpenseManager underused** — 2 expenses, P&L meaningless without more
8. **ProteaAI CODEBASE_FACTS stale** — AI giving outdated answers
9. **HACCP/Cold Chain/Recall all empty** — Compliance modules never initialized
10. **Toast notification flood (P0)** — FIXED commit 68cfe33

---

## UNDOCUMENTED GOLD

1. GeoAnalyticsDashboard.js — 38KB geographic customer analytics
2. CannabisDetailView.js — 49KB product detail with cannabinoid + terpene data
3. TenantSetupWizard.js — 52KB self-service tenant onboarding
4. HRStockView.js — 75KB read-only stock for HR users
5. StockIntelPanel.js — 56KB per-item intelligence
6. 15 DB functions — birthday points, scan velocity, leaderboard, AVCO, reserve stock
7. inventory_category enum has 12 values (not 7 as documented)
8. HQProduction at 310KB — largest component, undocumented sub-features
9. order_items EXISTS with 2,833 rows — intelligence gap CLOSED
10. fx_rates POPULATED — 712 rows (was reported empty)

---

*FEATURE-AUDIT v1.0 · NuAi · 07 Apr 2026*
*Full audit: 96 files, 78 features, 104 DB tables*
