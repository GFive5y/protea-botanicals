# SESSION-STATE v207 — 08 Apr 2026 (Full Day Session)

## Stack
- Repo: github.com/GFive5y/protea-botanicals · main
- Supabase: uvicrqapgzcdvozxrreo
- Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- Live URL: protea-botanicals-git-main-gfive5ys-projects.vercel.app
- HEAD at session close: 39a29e2

---

## OPERATING MODE — LOCKED

**BETA DEV MODE** (locked for foreseeable future):
- Stock data = test data only. Ignore AVCO/margins on physical stock.
- Physical contact points (Yoco, deliveries, real invoices) = skip until scope changes.
- Data is Claude's responsibility — seed it, structure it, keep it coherent.
- Goal: every system talking correctly with realistic mock data.
- Scope changes only on explicit owner instruction.

---

## Full Commit Chain (this session, built on top of v206)

| SHA | Description |
|---|---|
| `02bdc33` | HQOverview crash — `name` missing from cannabis inventory SELECT; `a.name.length` → undefined crash. Cannabis_retail only. |
| `266261e` | Smart Capture auto-retry on 500 — 1 retry after 1.5s, "Retrying AI extraction…" status message |
| `3e6aa5a` | ProteaAI LL-120 fix — handleSend + handleQuery both route through ai-copilot EF. No more direct Anthropic API calls from browser. |
| `39a29e2` | CODEBASE_FACTS update — loyalty-ai v2, 50 mock customers, AI Actions Feed live |

---

## MCP Actions (Supabase — no git commit required)

### Security
- RLS enabled on 12 finance tables:
  `bank_accounts, bank_statement_lines, capture_queue, capture_rules,
  chart_of_accounts, depreciation_entries, equity_ledger,
  financial_year_archive, fixed_assets, journal_entries, journal_lines,
  vat_transactions`
- Standard tenant isolation policy applied to all 12.
- Service INSERT policies added for EF-written tables.
- Supabase security alert (originally raised 23 Mar 2026) — fully resolved.

### Edge Functions Deployed
| EF | Version | Change |
|---|---|---|
| ai-copilot | v59 | Added `systemOverride` param. Caller supplies own system prompt. Tools skipped when override provided. |
| loyalty-ai | v2 | Fixed RPC param names (`p_user_id`, `p_points`). Added try/catch per user. Description field on inserts. BONUS type for rescues. Console logging added. |

### Tenant Fix
- Pure PTV `industry_profile`: `food_beverage` → `cannabis_retail` (direct SQL update)

### Mock Data Seeded — Medi Recreational (PwC-style test dataset)

**50 auth.users + user_profiles:**
- UUID pattern: `a0000001-0000-0000-0000-00000000000X` (001–050)
- Tier split: Bronze×20, Silver×15, Gold×10, Platinum×4, Harvest Club×1, Suspended×1
- 5 churn candidates (Gold+, silent 21+ days, churn_risk_score > 0.7):
  - Luyolo Mbeki — Platinum, 42d silent, score 0.85
  - Brandon Coetzee — Gold, 35d silent, score 0.82
  - Tamsin Hart — Gold, 28d silent, score 0.78
  - Gugu Mntambo — Platinum, 31d silent, score 0.76
  - Ntombizodwa Plaatje — Gold, 24d silent, score 0.74
- 2 fraud flagged: Keisha October (anomaly 78), Bongani Cele (anomaly 85)
- 1 suspended: Anonymous Test (anomaly 92)
- 2 April birthdays: Priya Naidoo (Apr 18), Ayanda Mhlanga (Apr 5)
- Top earner: Craig van Niekerk — Harvest Club, 5,200 pts

**~250 loyalty_transactions:**
- Seeded with `loyalty_dedup_guard` trigger disabled then re-enabled
- Types: EARNED, PURCHASE, REDEEMED, BONUS, AI_RESCUE
- Spread across 90 days with realistic order refs (ORD-XXXX, WHL-XXXX)
- Fraud pattern: Bongani Cele — 5 velocity-flagged QR scans on same SKUs

**loyalty-ai v2 confirmed working:**
- Churn rescued: Luyolo Mbeki, Brandon Coetzee, Gugu Mntambo (25pts each → loyalty_ai_log)
- Birthday bonuses: Priya Naidoo, Ayanda Mhlanga, Johanna van Rooyen, Craig Fourie, Lebo Rabothata (100pts each)
- Dedup confirmed: second Run Now → 50 scored / 0 rescued / 0 birthdays / 0 stock boosts

---

## Edge Function Status (all active at session close)

| EF | Version | Status |
|---|---|---|
| ai-copilot | v59 | ACTIVE — systemOverride param |
| loyalty-ai | v2 | ACTIVE — RPC bug fixed |
| process-document | v52 | ACTIVE — SARS compliance + fingerprint |
| auto-post-capture | v1 | ACTIVE — atomic accounting |
| receive-from-capture | v1 | ACTIVE — stock receipt + AVCO |
| sim-pos-sales | v4 | ACTIVE |
| sign-qr | v36 | ACTIVE |
| verify-qr | v34 | ACTIVE |
| send-notification | v37 | ACTIVE |
| get-fx-rate | v35 | ACTIVE |

---

## DB State — Medi Recreational (verified 08 Apr 2026)
user_profiles (customers):  50 rows (49 active + 1 suspended)
loyalty_transactions:       ~250 rows across 90 days
loyalty_ai_log:             181 stock_boost + 3 churn_rescue + 5 birthday_bonus
auth.users (mock):          50 rows (a0000001-0000-0000-0000-00000000000X)
loyalty_config:             1 row — full config, all AI flags active
journal_entries:            5 rows
journal_lines:              10 rows
vat_transactions:           6 rows
bank_accounts:              1 row
bank_statement_lines:       22 rows
fixed_assets:               3 rows
chart_of_accounts:          40 rows
equity_ledger:              1 row

---

## Verified Working (screenshots confirmed today)

| Feature | Status | Notes |
|---|---|---|
| P&L | ✅ | R477,880 revenue · 62.13% gross margin · R296,606 net profit |
| Balance Sheet | ✅ | R15,025 assets · R473,480 cash flow |
| Cash Flow | ✅ | R473,480 net positive |
| Year-End Close | ✅ | Loads correctly (R0 journal side — expected, orders not journalised) |
| Smart Capture | ✅ | 95% confidence · posts to books · auto-retry on 500 |
| ProteaAI Chat | ✅ | Routes through ai-copilot EF v59 — LL-120 compliant |
| ProteaAI Query | ✅ | Routes through ai-copilot EF v59 — LL-120 compliant |
| HQOverview cannabis | ✅ | Crash fixed — name field added to inventory SELECT |
| Loyalty AI Engine Tab 8 | ✅ | Run Now · churn rescue · birthday bonuses · dedup confirmed |
| Customer Profiles | ✅ | 50 customers loading correctly in Tenant Portal |
| RLS 12 finance tables | ✅ | Security alert cleared |

---

## Rules Locked This Session

**R-LL120 (closed for ProteaAI):** React frontend CANNOT call api.anthropic.com directly.
Both `handleSend` and `handleQuery` in ProteaAI.js route through ai-copilot EF v59.
Contract: POST `{ messages, userContext, systemOverride }` → `{ reply, model, usage, error }`
When systemOverride provided: tools skipped, caller's system prompt used entirely.

**BETA-DEV-01 (locked operating mode):** Stock = test data. Physical contact points = skip.
Data is Claude's responsibility. Scope changes on explicit owner instruction only.

**loyalty_dedup_guard:** This is the actual trigger name on loyalty_transactions.
Always `DISABLE TRIGGER loyalty_dedup_guard` / `ENABLE TRIGGER` when bulk seeding.

**loyalty-ai v2 RPC fix:** Function is `increment_loyalty_points(p_user_id uuid, p_points integer)`.
v1 was calling with wrong names `{ user_id, delta }` → silent fail. v2 fixed.

**Mock data UUID pattern:** `a0000001-0000-0000-0000-00000000000X` — identifies all mock records.

**RULE 0Q (permanent):** GitHub write tools PERMANENTLY BANNED from Claude.ai.
All commits via Claude Code only. Claude.ai = read + plan + Supabase MCP only.

---

## ProteaAI Context Behaviour

ProteaAI loads context based on the tab it's opened on:
- Pricing tab → pricing context → pricing/margin questions only
- Loyalty tab → loyalty context → churn/tier/points questions
- P&L tab → financial context → revenue/margin questions

To test churn intelligence: open ProteaAI from HQ → Loyalty tab (not Pricing).

---

## Outstanding — Next Session

### Owner Actions (blocks nothing in dev)
1. **pg_cron** — Supabase Dashboard → Database → Extensions → enable `pg_cron`, then:
```sql
SELECT cron.schedule(
  'loyalty-ai-nightly', '0 2 * * *',
  $$SELECT net.http_post(
    url := 'https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1/loyalty-ai',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"scheduled": true, "tenant_id": "b1bad266-ceb4-4558-bbc3-22cfeeeafe74"}'::jsonb
  );$$
);
-- Verify: SELECT jobname, schedule, active FROM cron.job;
```

2. **Yoco keys** — After CIPRO → company docs → domain → Yoco.
   Portal: portal.yoco.com

### Dev Priority Order

**P1 — Mock expenses seed (Supabase MCP, no code needed)**
Seed 12+ realistic Medi Rec expenses (rent, wages, utilities, security, insurance, marketing)
across Jan–Apr 2026 so P&L OpEx shows meaningful numbers for demo.
Reference: docs/WP-FINANCIALS-v1_1.md Section 9 for normalisation SQL.

**P2 — WP-LOYALTY-ENGINE S2: monthly_visit_count + monthly_spend_zar**
Fields exist on user_profiles but are not written by checkout flow.
Streak evaluation (visit streak, spend streak) blocked until orders write these.
Fix: orders insert trigger or CheckoutPage.js to increment on each completed order.

**P3 — WP-FINANCIALS next UI phases (Claude Code sessions)**
Schema is in place — all 8 tables exist with RLS.
Components to build: HQJournals.js · HQVat.js · HQBankRecon.js · HQFixedAssets.js
Always read file from disk before building — some may exist partially.
Full spec: docs/WP-FINANCIALS-v1_1.md

---

## Locked Files
src/components/StockItemModal.js   — LOCKED
src/components/ProteaAI.js         — LOCKED (str_replace CODEBASE_FACTS only)
src/components/PlatformBar.js      — LOCKED
src/components/hq/LiveFXBar.js     — PROTECTED
src/components/hq/HQStock.js       — PROTECTED

---

## Tenants (all industry_profile correct as of this session)

| Tenant | ID | industry_profile |
|---|---|---|
| Medi Recreational | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 | cannabis_retail |
| Protea Botanicals HQ | 43b34c33-6864-4f02-98dd-df1d340475c3 | operator |
| Pure Premium THC Vapes | f8ff8d07-7688-44a7-8714-5941ab4ceaa5 | cannabis_retail ✅ fixed this session |
| Test Dispensary CT | 064adbdc-faaf-4949-9c4b-b5a927b7f2d1 | cannabis_retail |
| TEST SHOP | 4a6c7d5c-a66a-4a13-b39a-fe836104000c | cannabis_retail |

---

*SESSION-STATE v207 · NuAi · 08 Apr 2026*
*Supersedes v206 (morning state, pre-session)*
*Next session: read this file first. BETA DEV MODE is locked.*
