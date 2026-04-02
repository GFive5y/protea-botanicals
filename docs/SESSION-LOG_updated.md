# SESSION-LOG.md — NexAI Platform Build History
## Append-only. Add one block per session at the TOP. Never rewrite old entries.

---

## WP-O v2.0: NEXT-GEN AI LOYALTY ENGINE · March 30, 2026

```
TYPE: Full loyalty engine rebuild — multi-tenant, AI-powered, category-aware
HEAD: 635f1be (WP-O complete)

COMMITS THIS SESSION:
  0294be0  HQLoyalty.js v4.0 — 10 tabs, tenant scope fix, AI Engine, Categories, Harvest Club
  26dc324  CheckoutPage.js v2.4 — category mults, redemption flow, first-purchase, cross-sell
  e7e618a  ScanResult.js v4.9 — category mults, Harvest Club, tenant scope, enriched loyalty_transactions
  635f1be  HQCogs.js v4.2 + HQPricing.js v4.2 — loyalty cost line, net margin after loyalty

KEY CHANGES:
  HQLoyalty     v3.0 → v4.0: 8 tabs → 10 tabs. Critical multi-tenant bug fixed (loyalty_config
                was queried globally with .single() — now scoped to tenantId). New tabs:
                Categories (8 product types, margin-aware earn rates), AI Engine
                (automation toggles + loyalty_ai_log feed). Harvest Club 5th tier.
                Programme Health Score. WhatsApp share in Referrals.

  CheckoutPage  v2.3 → v2.4: 8-category multiplier stack (base × online_bonus × category ×
                tier). First online purchase bonus (200pts). Cross-sell bonus (150pts when
                customer buys from new category). Redemption toggle (reduces PayFast total).
                Harvest Club in tier ladder. All tenant-scoped.

  ScanResult    v4.8 → v4.9: loyalty_category read from inventory_items join.
                categoryMult applied to scan points calculation. pts_override per-item
                promotional bypass. loyalty_transactions.category field written on every scan.
                Campaign + loyalty_config queries now tenant-scoped.

  HQCogs        v4.1 → v4.2: Loyalty cost line added as informational item in COGS breakdown.
                Reads website sell_price from product_pricing table. Tenant-scoped
                loyalty_config fetch. CATEGORY_COLOURS gains 'loyalty' entry.

  HQPricing     v4.1 → v4.2: "NET (AFTER LOYALTY)" column in All SKUs summary table.
                Shows loyalty cost deduction and net margin after loyalty per SKU.

NEW DB TABLES/COLUMNS:
  loyalty_config      UNIQUE(tenant_id) added · 27 new columns · 4 tenant rows seeded
  loyalty_ai_log      new table (AI action audit) · RLS enabled
  referral_codes      +tenant_id NOT NULL · RLS policies updated
  loyalty_transactions +category, +is_expired, +ai_triggered
  inventory_items     +loyalty_category, +pts_override
  user_profiles       +referral_code, +referred_by, +primary_category, +category_flags,
                      +last_purchase_at, +monthly_visit_count, +monthly_spend_zar,
                      +harvest_club_eligible, +churn_risk_score

SYSTEM AUDIT:
  Full review of all 14 project files conducted.
  SESSION-STATE, SESSION-BUGS, SESSION-LOG, ONBOARDING, REGISTRY, MANIFEST all updated.
  Protea_WPO_Loyalty_Engine_Spec.md (v1.0) — SUPERSEDED by WP-O_v2_0_Loyalty_Engine_Spec.md
  Project knowledge file additions:
    WP-O_v2_0_Loyalty_Engine_Spec.md (1,329 lines — production-ready spec)
    SESSION-STATE_v152.md

KEY DISCOVERY — DISK TRUTH VIOLATIONS:
  HQDashboard.js was v4.2 on disk (docs said v4.3). Loyalty tab already wired.
  HQLoyalty.js v3.0 existed as 109KB file (MANIFEST said "—" no version).
  CheckoutPage.js v2.3 already had partial WP-O v1.0 loyalty work.
  → LL-142, LL-143, LL-144 added.

MEDI RECREATIONAL CONTEXT LOCKED:
  NOT a medical dispensary. Recreational cannabis + lifestyle retail.
  Back: flower, pre-rolls, vapes, edibles, hash, concentrates
  Front: nutrients, substrate, grow gear, seeds, clones, Boveda,
         wellness (Lion's Mane, Ashwagandha, mushrooms), CBD pet, branded merch

NEW LESSONS: LL-138 through LL-144
```

---

## WP-NEXAI-WEB MAJOR UPGRADE · March 29, 2026

```
TYPE: Marketing website upgrade. No ERP code commits.
FILE: C:\nexai-web\index.html → nexai-erp.vercel.app
DEPLOY: cd C:\nexai-web && vercel --prod

CHANGES SHIPPED:
  Icons         All 12 emojis replaced with inline Lucide SVGs (no CDN)
  Integration   Styled SVG brand tiles for all 8 integrations
  AI Showcase   New two-panel section: floor staff + executive intelligence
                Industrial blending context (batch, QC, storage, AVCO drift)
                Zero Claude/Anthropic mentions — "enterprise-grade AI stack"
  UI Preview    P&L screen + Stock screen + FX tracker (pure SVG, animated)
  Hero          Feature bullets, proof bar 2x2 grid, "48hr" replaced with
                "4,000+ hours engineering" + "iOS·Android Beta 2026"
  Platform      Online Store: Yoco tag → amber "⏳ Yoco partnership in progress"
  Mobile        App Store + Google Play SVG badges (coming soon section)
  Copy          Cannabis refs removed from AI panel. Exec Q generic.

DOMAIN INTELLIGENCE (dead ends):
  nexai.com/.io/.ai/.co/.co.za — ALL TAKEN
  nexai-erp.co.za — AVAILABLE
  Owner to rethink brand name. CIPC: bizportal.gov.za

DEPLOY PROCESS:
  nexai-web has NO Git. Deploy: cd C:\nexai-web && vercel --prod
  ALWAYS verify: findstr /c:"Every part of" "C:\nexai-web\index.html"
  Correct folder: C:\nexai-web (NOT C:\Users\bio_d\Documents\nexai-web)

NEW LESSONS: LL-133 through LL-137
```

---

## WP-MULTISITE S1+S2 + HQStock + Medi Recreational · March 28, 2026

```
COMMITS: 7319a5c, e7e24d8, 35d4e09, 9a9ccc8  HEAD: 9a9ccc8
StorefrontContext.js, App.js v6.3, Shop.js v4.4, CheckoutPage.js v2.4
HQDashboard.js (View live site), AppShell.js v1.4 (HQ badge)
HQStock: GeneralOverview, tabbed UI all profiles, tenant-aware queries
Medi Recreational: onboarded (b1bad266), management role, tenant_config pro
LL-127 through LL-132
```

---

## PLANNING + NEXAI WEBSITE S1 · March 28, 2026

```
No ERP commits. NexAI brand locked. Yoco intel gathered.
WP-PAY + WP-MULTISITE designed. index.html built + deployed.
LL-124 (Yoco cannabis prohibition), LL-125 (SDK native only), LL-126 (domain mapping)
```

---

## DEPLOY + AI FIX — 053d80c · March 27, 2026
## WP-STOCK-PRO S3-S4 · WP-PROD-MASTER · WP-FNB · WP-FIN · v89–v115

*Append new entries at TOP. Never edit old entries.*
