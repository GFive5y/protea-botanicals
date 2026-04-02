# BUSINESS STRATEGY — NuAi
## Version 2.0 · March 30, 2026 · Confidential
## Supersedes STRATEGY_v1_5.md (NexAI → NuAi rebrand + strategic reset)

---

## THE ONE SENTENCE

NuAi is South Africa's first AI-native multi-tenant ERP for specialty retail —
built on a real business, ready to sell to the next one.

---

## PART 1 — WHAT WE BUILT

A four-tier cloud ERP: supply chain, inventory, production, finance, loyalty,
distribution, HR, document AI, payments, multi-tenant.

Platform replacement cost at SA agency rates: R1.4M–R1.9M.
Actual build cost (AI-assisted): ~R120k–R180k.

### The Moat (things no competitor has)
```
1. QR + Loyalty + Auth in one scan — one scan does 5 things simultaneously
2. Live COGS with real-time FX — actual landed cost per unit, always current
3. Three-state stock reservation — enterprise B2B oversell protection
4. Enterprise AI stack — Fortune 500-grade, wired into live business data
5. AI document ingestion — upload invoice → stock updated → costs recorded
6. Self-updating inventory — AI detects reorder, COGS drift, margin risk
7. Full HR module — 12 sub-packages, QR clock-in, payroll export
8. Multi-tenant from day one — architecturally native, not retrofitted
9. SA-native — ZAR, Yoco, PayFast, POPIA, SA Labour Act, SA public holidays
10. Production-tested — running on a real business with real transaction data
```

---

## PART 2 — BRAND & ENTITY MAP

```
NuAi               = SaaS product company · nuai.co.za (register TODAY — R99)
                     CIPC: Nuai (Pty) Ltd → Nu AI (Pty) Ltd → Nuai Software (Pty) Ltd
                     Capitalisation: Nu + AI (capital A and I)

Protea Botanicals  = HQ operator tenant (43b34c33) — internal use only, never public
Pure PTV           = Client 1 (f8ff8d07) — pureptv.co.za — REBRANDED ✅
Medi Recreational  = Client 2 (b1bad266) — medirecreational.co.za (pending)
                     NOT medical. Recreational cannabis + lifestyle retail.
TEST SHOP          = (4a6c7d5c) — dev only
```

### Non-negotiable rules:
```
❌ ZERO cannabis references on any public-facing NuAi content
❌ Never mention Claude or Anthropic — "enterprise-grade AI stack"
❌ Never list Yoco as competition — "we make your Yoco 10× more powerful"
✅ Public language: specialty retail · regulated consumer goods · health & wellness
✅ All pricing in ZAR
✅ POPIA-compliant framing always
```

---

## PART 3 — THE THREE USER TYPES

Every build decision must specify which user it serves:

```
User 1 — OPERATOR (Gerhardt / NuAi)
  Portal: /hq — HQ Command Centre
  Needs:  Full visibility, all tenants, all data, all modules
  State:  ✅ Built, feature-rich

User 2 — SHOP MANAGER / OWNER (Medi owner, Pure PTV manager)
  Portal: /tenant-portal — Client Portal
  Needs:  Their P&L, stock catalogue, customers, pricing, staff
  State:  ✅ Built but stock UI needs visual catalogue (WP-MEDI-STOCK S2)

User 3 — SHOP CLERK / CASHIER (till staff)
  Portal: /admin — Shop Dashboard
  Needs:  Check stock, scan QR, process sale — NOTHING ELSE
  State:  ✅ Built but shows flat list — needs POS screen (WP-POS, future)
```

---

## PART 4 — PRICING

| Plan | Monthly | Setup | Target |
|---|---|---|---|
| Starter | R3,500 | R8,000 | Small shop, stock + QR + loyalty |
| Operator | R6,500 | R15,000 | Full platform — all modules |
| Enterprise | R12,000+ | R25,000 | Multi-location, white-label |

### Revenue path:
```
1 client  → R6,500/mo MRR   (Medi Recreational — target: April 2026)
3 clients → R19,500/mo MRR  (target: June 2026)
5 clients → R32,500/mo MRR  (Year 1 conservative)
10 clients→ R65,000/mo MRR  (Year 1 stretch)
```

---

## PART 5 — COMPETITIVE PITCH

### vs Yoco Stock:
```
"Keep your Yoco machine. We make it 10× more powerful."
Yoco: how much money came in.
NuAi: how much money you actually made.
Every Yoco tap → stock deducts → margin calculated → loyalty awarded → P&L updated.
```

### vs Shopify:
```
Shopify: great for online. Zero for production, AVCO, wholesale, HR, or AI.
NuAi: everything Shopify does + your entire back office + enterprise AI.
Same price. Built for SA. ZAR, Yoco, PayFast, POPIA. Not a US product adapted.
```

### vs Lightspeed/Vend:
```
R1,800–R4,500/month for POS-only. No production. No AI. No loyalty worth using.
NuAi: R3,500 for everything including AI that runs your back office for you.
```

---

## PART 6 — BUILD PRIORITY (ranked)

### This week (demo prep — no code):
```
□ Register nuai.co.za at domains.co.za — R99 — DO TODAY
□ Deploy updated website (NuAi version) — cd C:\nexai-web && vercel --prod
□ Set sell prices on top 40 Medi SKUs
□ Confirm Medi domain: UPDATE tenants SET domain='medirecreational.co.za'
□ CIPC name reservation — bizportal.gov.za — tomorrow
□ Yoco merchant signup — yoco.com — sole trader, no CIPRO needed for sandbox
□ Enable Supabase backups — Settings → Add-ons → URGENT
```

### Next build sessions (in order):
```
P1  WP-MEDI-STOCK S2     Brand filter UI + variant badges (2-3 hrs)
P2  WP-STOCK-RECEIVE     Stock receipt flow for clerks (2-3 hrs)
P3  QR generation Medi   182 QR codes + print sheet (1 hr)
P4  WP-PAY S1            Yoco online gateway (needs sk_test_ keys)
P5  BUG-047/045/046      Cosmetic fixes (1 hr total)
P6  ProteaAI update      CODEBASE_FACTS string update (15 min)
P7  WP-POS               In-store POS screen for clerks (future)
```

### The demo milestone (trigger for first invoice):
```
Medi owner sits down → sees 182 SKUs grouped by brand → scrolls through
concentrate section → sees Budder, Badder, Live Resin, Rosin, Sauce, Diamonds →
opens AI and asks "what's our margin on concentrates?" → gets live answer →
sees loyalty earning 2× on cannabis flower and 3× on seeds/clones →
understands the cross-sell intelligence → signs up.
```

---

## PART 7 — WHAT NOT TO BUILD YET

```
❌ Native mobile app — Q3 2026 (iOS + Android beta)
❌ Full payroll engine — SimplePay CSV export is sufficient
❌ Stripe/Peach subscription billing — manual invoicing until 5+ clients
❌ Deep multi-industry config — after first paying external client validated
❌ Xero/Sage direct integration — CSV export sufficient until client requests it
❌ Anything for a third industry profile — cannabis retail is the validation market
```

---

## PART 8 — DEPLOYMENT STATUS

```
ERP app:          https://protea-botanicals.vercel.app ✅ LIVE
Marketing site:   https://nexai-erp.vercel.app ✅ LIVE (NuAi version ready to deploy)
nuai.co.za:       AVAILABLE R99 — register immediately

Supabase project: uvicrqapgzcdvozxrreo
Supabase backups: NOT ENABLED ← URGENT
PayFast:          SANDBOX (live needs CIPRO + bank account + merchant)
Yoco:             NOT YET SIGNED UP ← sole trader, try today

Vercel env vars (ERP — do not change):
  REACT_APP_SUPABASE_URL
  REACT_APP_SUPABASE_ANON_KEY
  GENERATE_SOURCEMAP = false
  CI = false

Supabase secrets (confirmed set):
  ANTHROPIC_API_KEY ✅
  TWILIO_ACCOUNT_SID ✅
  TWILIO_AUTH_TOKEN ✅
  PAYFAST_SANDBOX = true
```

---

## PART 9 — THREE QUESTIONS FOR EVERY BUILD SESSION

Before writing a single line of code:
```
1. WHO IS THIS FOR?
   Operator / Shop Manager / Clerk / Customer — pick exactly one.

2. WHAT IS THE ONE THING THEY NEED TO DO?
   Not "manage stock" — "receive a delivery from a supplier without opening Supabase."
   Be specific. One action. One outcome.

3. DOES THIS ALREADY EXIST?
   Check MANIFEST_v3_0.md + Get-ChildItem src -Recurse before building.
   LL-147: grep for existing content before any find/replace.
   LL-142: the file may already exist even if MANIFEST says "—".
```

If you cannot answer all three — stop and plan first.

---

*STRATEGY.md v2.0 · NuAi (formerly NexAI) · March 30, 2026*
*Supersedes v1.5. Update when business direction changes or new market entered.*
*Not for AI session use — owner/investor document.*
