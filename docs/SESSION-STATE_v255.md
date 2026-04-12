# SESSION STATE v255
## Produced: 13 April 2026 — end of session
## HEAD: see latest commit after this doc is pushed

### CURRENT PRIORITY
CA business rescue demo — ~4 weeks away (~12 May 2026)
WP-DS-6 all 4 phases complete. Demo data seeded. Bugs fixed.
WP-UNIFY initiated — design system unification is now the governing framework
for all future build sessions.

### SESSION SUMMARY — 13 April 2026 (continued from v254)

**Fixes shipped this session:**
- Group Portal seeded: "NuAi Business Rescue Portfolio" group created in DB
  All 4 CA demo tenants + HQ operator added as members
  Group Portal now renders with full network view (5 stores)
- feature_medical = true set for MediCare Dispensary (Supabase MCP direct)
  Hard refresh required to pick up from React context cache
- Duplicate search bar removed: breadcrumb Ctrl+K button removed from TenantPortal
  AINSBar is now the single search surface across Tenant Portal
- Group Portal nav entry added to HQ sidebar (useNavConfig.js, Platform group)
- Tenant delete/deactivate added to HQTenants.js
  5 demo/operator tenants protected by PROTECTED_TENANT_IDS constant

**WP-UNIFY initiated:**
Full panel review conducted — neuroscience, typography, colour, spacing,
market leaders, blast zone audit. Documented in docs/WP-UNIFY_v1_0.md.
This is a permanent reference document for all future agents.

### WP-DS-6 STATUS — ALL PHASES COMPLETE
| Phase | Name | Status | Commit |
|---|---|---|---|
| Phase 1 | Shell Unification | COMPLETE | cf9241e |
| Phase 2 | AINS Bar | COMPLETE | 2df028f |
| Phase 3 | Profile-Aware Tokens | COMPLETE | 1c2d51e |
| Phase 4 | Notification Badges | COMPLETE | 0b62ca1 |

### WP-UNIFY STATUS
| Component | Status |
|---|---|
| tokens.js | COMPLETE — source of truth |
| TokenContext.js | COMPLETE |
| TenantPortal.js shell | COMPLETE — profile tokens |
| AINSBar.js | COMPLETE |
| HQDashboard.js | COMPLETE — DS-6 Phase 1 |
| GroupPortal + group/ components | COMPLETE — built inside T |
| HQOverview.js | NOT STARTED — PRIORITY 1 |
| HQStock.js | NOT STARTED — PRIORITY 2 |
| HQProfitLoss.js | NOT STARTED — PRIORITY 3 |
| All others | See WP-UNIFY_v1_0.md blast zone table |

### DEMO GROUP — CONFIRMED IN DB
Group: "NuAi Business Rescue Portfolio" (c777ff5b-2df4-452f-89e1-8f08e8e32bdf)
Members: Nu Ai HQ (franchisor) + Medi Recreational + MediCare Dispensary
         + Metro Hardware + The Garden Bistro (all franchisee)

### TENANT REGISTRY — ALL 4 DEMO STORES COMPLETE
| Tenant | ID | Industry | Status |
|---|---|---|---|
| The Garden Bistro | 7d50ea34-... | food_beverage | COMPLETE |
| Medi Recreational | b1bad266-... | cannabis_retail | COMPLETE |
| MediCare Dispensary | 8b9cb8e6-... | cannabis_dispensary | COMPLETE |
| Metro Hardware | 57156762-... | general_retail | COMPLETE |

feature_medical = true confirmed for MediCare Dispensary (Supabase MCP, 13 Apr)

### KNOWN ISSUES (carried forward)
- Tenant Portal AINSBar: browser-verify on tenant side (HQ confirmed working)
- NavSidebar CSS widths (52/240px) vs T.sidebar tokens (64/220px) — deferred
- HQTransfer historical AVCO corruption — pre-fix data not remediated
- Medical Records gate: requires hard refresh (Ctrl+Shift+R) after feature_medical
  DB change to pick up new tenantConfig from React context

### WHAT IS NEXT (in priority order)
1. Demo rehearsal — walk all 4 tenants end to end in browser
2. WP-UNIFY Phase 1 — HQOverview.js migration to tokens.js
3. WP-UNIFY Phase 2 — HQStock.js migration (read LL-221 + RULE 0L first)
4. WP-UNIFY Phase 3 — HQProfitLoss.js migration
5. Shared component library — SharedDataTable.js first

### NEW RULES ACTIVE THIS SESSION
- UNIFY-1: No new local T definition — ever
- UNIFY-2: Migrate on touch — every file opened gets its local T migrated
- UNIFY-3: Two weights only in new/migrated components (400, 500, 600, 700)
- UNIFY-4: One border style — border: `1px solid ${T.border}`
- UNIFY-5: Semantic colour by token only
- UNIFY-6: Inter in portals, Jost on consumer pages only
- UNIFY-7: Shared components first — build to src/components/shared/
- UNIFY-8: Demo path (Tier 1 components) must match Group Portal standard by 12 May

### ALL PREVIOUSLY ACTIVE RULES STILL IN FORCE
RULE 0Q · LL-203 · LL-205 · LL-206 · LL-207 · LL-208 · LL-221 · LL-238
LL-NEW-1 through LL-NEW-5 · NEW-LL-DS-1 · NEW-LL-DS-2 · NEW-LL-DS-3

---
*SESSION-STATE v255 · 13 April 2026*
*WP-DS-6 complete · WP-UNIFY initiated · Demo group seeded · Bugs fixed*
*Read docs/WP-UNIFY_v1_0.md before touching any UI component*
