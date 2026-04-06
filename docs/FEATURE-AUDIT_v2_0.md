# FEATURE-AUDIT v2.0 — NuAi Platform
## Produced: 07 Apr 2026 · Session v199 (deep audit)
## Previous: FEATURE-AUDIT_v1_0.md (07 Apr 2026) — 78 features, ~60% coverage
## This audit: 120+ features, 100% coverage including admin portal, shop suite, molecule system

---

## AUDIT SUMMARY

| Status | Count | % |
|---|---|---|
| ✅ WORKING | 31 | 26% |
| ⚡ WIRED-UNTESTED | 38 | 32% |
| 🔌 NOT WIRED | 4 | 3% |
| 🔧 PARTIAL | 8 | 7% |
| ❌ BROKEN | 2 | 2% |
| 🔒 LOCKED/UTILITY | 14 | 12% |
| SUB-COMPONENT | 22 | 18% |

**Total distinct features: 119**
**Total component files: 130+**
**Total DB tables: 104 · Tables with real data: 58 · Edge Functions: 9**

---

## CRITICAL NEW DISCOVERIES vs v1.0

1. **Admin Portal (/admin) — 13 tabs, completely undocumented in v1.0**
2. **Shop Dashboard (/admin for shop tenants) — completely undocumented**
3. **Molecule & Terpene Education System — 7 cannabinoid visualizers, completely undocumented**
4. **StockControl.js (153KB) — industry-profile-aware stock management, undocumented**
5. **AdminQRCodes.js at 152KB — complete batch management engine**
6. **sim-pos-sales stores AVCO in product_metadata — P&L intelligence ready**

---

## DATA STATE (07 Apr 2026)

| Table | Rows | Notes |
|---|---|---|
| order_items | 2,833 | Seeded — has AVCO in product_metadata |
| orders | 1,513 | Mix real + seeded |
| stock_movements | 1,206 | Real movement history |
| fx_rates | 716 | EF persisting correctly |
| expenses | 44 | Jan-Apr 2026 OPEX seeded |
| tenants | 5 | 4 real + 1 test |

**Edge Functions (10 active):**
ai-copilot v58 · payfast-checkout v44 · payfast-itn v39 · sign-qr v36 ·
verify-qr v34 · send-notification v37 · get-fx-rate v35 · process-document v49 ·
sim-pos-sales v1 · create-admin-user v1

---

*FEATURE-AUDIT v2.0 · NuAi · 07 Apr 2026*
*119 features, ~100% coverage*
