# SESSION-STATE v220
## Produced: 10 Apr 2026 — End of session close
## HEAD: 4b1a9fa — GAP-03 resolved (ExpenseManager VAT Review)

---

## PLATFORM STATE

- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **Stack:** React 18 + Supabase JS v2 + React Router v6
- **Deploy:** Auto-deploy via Vercel on push to main

---

## COMPLETED THIS SESSION (10 Apr 2026)

### WP-AINS v1.0 — ALL 6 PHASES COMPLETE

| Phase | Description | Commit |
|---|---|---|
| 1 | Intelligence Foundation — useNavIntelligence + IntelligenceContext | ec2e3ad |
| 2 | Sidebar Intelligence — badges + sub-item IntelLines | f4fdc62 area |
| 3 | IntelStrip — per-tab pills bar | f4fdc62 |
| 4 | NuAi Panel Brief — pre-loaded tab-aware brief | 4570d63 |
| 5 | PlatformBar removed from TenantPortal | c85d5ee |
| 6 | Click-Through Depth — pill/IntelLine → NuAi focused | 1b682ef |
| Bug | aiContext resets to null on activeTab change | e16890b |

**New files created:**
- src/hooks/useNavIntelligence.js
- src/contexts/IntelligenceContext.js
- src/hooks/useIntelStrip.js
- src/components/IntelStrip.js
- src/hooks/useBrief.js
- src/components/NuAiBrief.js

**Modified files:**
- src/components/AIFixture.js — v2.0
- src/components/ProteaAI.js — v1.8
- src/pages/TenantPortal.js — IntelligenceProvider, IntelStrip, PlatformBar removed

### FIN-AUDIT v1.0 — ALL 4 GAPS RESOLVED

| Gap | Fix | Commit |
|---|---|---|
| GAP-01 | Revenue ÷1.15 (SA VAT) in HQProfitLoss — d7d2df9 |
| GAP-02 | Manual journal adjustments flow to P&L — c3b624c |
| GAP-03 | ExpenseManager VAT Review mode — 4b1a9fa |
| GAP-04 | Depreciation run — R822.22 posted — owner action |

**GAP-03 owner action still required:**
HQ → P&L → Manage Expenses → click "Review →"
Enter input VAT for ~29 applicable expenses. Wages/insurance/banking excluded.

**Live figures (Medi Rec — 10 Apr 2026):**
- MTD Revenue (ex-VAT): R133,691
- MTD Orders: 141 · Gross Profit: R59,691 · Margin: 44.6%
- Depreciation: R822.22/month now flowing

---

## LOCKED FILES

- src/components/StockItemModal.js — LOCKED
- src/components/ProteaAI.js — str_replace only (LOCKED)
- src/components/PlatformBar.js — LOCKED
- src/services/supabaseClient.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED
- src/components/hq/LiveFXBar.js — PROTECTED

---

## EDGE FUNCTION VERSIONS

| Function | Version |
|---|---|
| ai-copilot | v67 |
| process-document | v53 |
| auto-post-capture | v2 |
| sim-pos-sales | v4 |
| sign-qr | v36 |
| verify-qr | v34 |
| send-notification | v37 |
| get-fx-rate | v35 |
| payfast-checkout | v44 |
| payfast-itn | v39 |

---

## PENDING WORK — NEXT SESSION

### Priority 1: WP-NAV-RESTRUCTURE (brainstorm first)

Current problems:
- Sales section missing Yoco, website, wholesale revenue channels
- Analytics belongs with Customers (not Reports)
- Reorder belongs with Inventory (not Reports)
- Reports should be Finance only

Proposed:
- INVENTORY: Stock, Catalog, Reorder
- OPERATIONS: Daily Trading, Cash-Up, Smart Capture
- SALES: POS Till, Yoco, Website Orders, Wholesale, Pricing, Loyalty, Invoices
- CUSTOMERS: Profiles, QR Codes, Messaging, Analytics
- FINANCE: P&L, Expenses, Balance Sheet, Journals, VAT, Bank Recon, Fixed Assets, IFRS, Costing, Forecast, Year-End Close
- TEAM: HR suite

Must read TenantPortal.js waterfall config before writing WP.
Must check impact on useIntelStrip tabIds, useBrief tabIds, ProteaAI getSuggested.

### Priority 2: Scan Analytics (qr_codes join)

scan_logs has no tenant_id — always join through qr_codes:
```sql
SELECT COUNT(sl.id)
FROM scan_logs sl
JOIN qr_codes qc ON qc.id = sl.qr_code_id
WHERE qc.tenant_id = '{tenantId}'
AND sl.scanned_at >= NOW() - INTERVAL '7 days';
```

Files to update: useNavIntelligence.js, useIntelStrip.js, useBrief.js

---

## KEY RULES

- RULE 0Q: NEVER call any GitHub write tool from Claude.ai. No exceptions.
- LL-205: Every new DB table needs hq_all_ RLS bypass policy
- LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
- LL-207: No tenantId props on HQ child components
- LL-208: Enumerate ALL tables before any migration
- scan_logs: no tenant_id — always join through qr_codes

---

## COA ACCOUNT STRUCTURE (confirmed 10 Apr 2026)

| Range | Type |
|---|---|
| 10xxx–15xxx | asset |
| 20xxx | liability |
| 30xxx | equity |
| 40xxx–49xxx | revenue (sales/other/finance) |
| 50xxx | expense (cogs) |
| 60xxx–61xxx | expense (opex) |
| 70000/70200 | revenue (finance) |
| 70100 | expense (finance) |

---
*SESSION-STATE v220 · NuAi · 10 Apr 2026*
