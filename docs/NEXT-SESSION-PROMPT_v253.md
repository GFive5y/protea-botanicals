# NEXT SESSION PROMPT v253
## For: WP-DS-6 Phase 3 (Profile Tokens) + Phase 4 (Badges) + Demo Rehearsal
## Date produced: 13 April 2026

## READ BEFORE ANYTHING ELSE (in order)
1. `docs/NUAI-STRATEGIC-INTELLIGENCE_v1_0.md` (full, including all addendums)
2. `CLAUDE.md` (repo root)
3. `docs/NUAI-AGENT-BIBLE.md` (all rules including LL-NEW-1 through LL-NEW-5)
4. `docs/SESSION-STATE_v253.md`
5. `docs/WP-DS-6-PHASE2_v1_0.md` (Phase 3 + Phase 4 specs)
6. `docs/WP-DEMO-CA-RESCUE_v1_0.md`

## WHAT IS DONE
- All 4 CA demo tenants seeded and browser-verified
- WP-DS-6 Phase 1 COMPLETE (cf9241e) — shell gap fixed, T tokens, Inter font
- WP-DS-6 Phase 2 COMPLETE (04e9004) — AINSBar live on HQ + Tenant Portal
- HQBalanceSheet LL-231 dispensary branch + Cash at Bank + Accrued OpEx

## PRIORITY 1 — WP-DS-6 Phase 3: Profile-Aware Tokens
Spec in docs/WP-DS-6-PHASE2_v1_0.md.
`getTokens()` and `profileOverrides` already defined in `src/styles/tokens.js`.
Create `src/contexts/TokenContext.js`, wrap TenantPortal with it.
Profile colours: cannabis_retail=green (default), cannabis_dispensary=teal,
food_beverage=terracotta, general_retail=charcoal.

## PRIORITY 2 — WP-DS-6 Phase 4: Notification Badges
Spec in docs/WP-DS-6-PHASE2_v1_0.md.
Badge system on sidebar nav items. Data-driven, never hardcoded.
PlatformBar.js is LOCKED — badges go in sidebar only.

## PRIORITY 3 — Demo Rehearsal
Walk through all 4 tenants in browser:
- Garden Bistro: F&B rescue signals (HACCP, margin, allergens)
- Medi Recreational: cannabis_retail (AVCO gap, churn, VAT)
- MediCare Dispensary: cannabis_dispensary (SAHPRA, prescriptions, BCEA)
- Metro Hardware: general_retail (covenant, QR fraud, dead stock, loyalty)
- Group Portal: all 4 in Network Intelligence

## VERIFY BEFORE BUILDING
- AI drawer streaming completes (not stuck on "Analysing...")
- Tenant Portal AINSBar renders (not just HQ)
- IntelStrip pills show correct values per tenant

---

*NEXT-SESSION-PROMPT v253 · 13 April 2026*
*Previous: v252 (superseded — delete on session start)*
