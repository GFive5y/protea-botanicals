# NexAI Platform — WP-O v2.0: Next-Gen AI Loyalty Economics Engine
## Complete Build Specification · March 2026
## Status: READY TO BUILD — supersedes WP-O v1.0 entirely

---

> **READ THIS FIRST, EVERY SESSION.**
> This spec supersedes Protea_WPO_Loyalty_Engine_Spec.md v1.0 completely.
> v1.0 had critical multi-tenant bugs, stale version numbers, and a dead table reference.
> Do NOT use v1.0 for any build decisions. Use this document only.

---

## PART 1 — BUSINESS CONTEXT: MEDI RECREATIONAL

Medi Recreational (tenant b1bad266) is NOT a medical dispensary.
The actual business is a recreational cannabis dispensary (back of store)
plus mixed lifestyle retail (front of store).

### Category Margin Profile

| Category | Est. Gross Margin | Loyalty Earn Strategy |
|---|---|---|
| `cannabis_flower` | 60–70% | 2.0× — high margin, drive repeat |
| `cannabis_vape` | 55–65% | 1.75× — good margin |
| `cannabis_edible` | 50–65% | 1.5× — variable margin |
| `seeds_clones` | 65–80% | 3.0× — highest value, builds grower loyalty |
| `grow_supplies` | 30–45% | 1.0× — lower margin, cross-sell |
| `accessories` | 35–55% | 0.75× — competitive, price-sensitive |
| `health_wellness` | 45–60% | 1.5× — growth category |
| `lifestyle_merch` | 60–75% | 2.0× — brand advocacy |

---

## PART 2 — DATABASE SCHEMA

### loyalty_config — Multi-Tenant Master Control Table
One row per tenant with 60+ configurable fields:
- 8 category earn multipliers
- Base earn rates (online/instore/retail)
- Engagement bonuses (first purchase, profile, phone, birthday, content, crosssell)
- 5 tier thresholds + multipliers (Bronze → Silver → Gold → Platinum → Harvest Club)
- Streak bonuses (visit + spend per month)
- Referral rewards
- Redemption economics (value per point, min balance, max % per order, breakage)
- Point expiry
- QR security controls
- AI automation flags (churn rescue, stock boost, crosssell nudge, margin guard)

### referral_codes — Per-tenant referral tracking
### loyalty_transactions — Enriched with AI audit columns
### user_profiles — Referral + category tracking columns added
### inventory_items — loyalty_category + pts_override columns
### loyalty_ai_log — Track all AI-initiated loyalty actions

---

## PART 4 — HQLoyalty.js: 9-TAB SPECIFICATION

Tab 1: 📊 Earning Rules — base rates, engagement bonuses, live preview
Tab 2: 🏷️ Categories — 8 category multiplier cards with margin guard
Tab 3: 🏅 Tiers — thresholds, multipliers, tier visualiser, at-risk segment
Tab 4: 💰 Economics — redemption, programme cost dashboard, health score, CPA comparison, CLV
Tab 5: 🔗 Referrals — config, leaderboard, network intelligence
Tab 6: ⚡ Streaks — visit + spend streaks per month
Tab 7: 🔒 QR Security — scan limits, validity, stats
Tab 8: 🤖 AI Engine — automation status, actions feed, chat, weekly brief
Tab 9: 📈 Channel Simulator — what-if scenario planner with CLV modelling

---

## PART 5 — CUSTOMER-FACING: LOYALTY PAGE ENHANCEMENTS

- Tier Progress Card with months-to-next-tier
- Category Badges (shopping universe)
- Referral Card with WhatsApp share
- Streak Progress (visit + spend)
- Birthday Bonus Reminder

---

## PART 6 — CHECKOUT INTEGRATION

Points calculation: base × onlineBonus × categoryMult × tierMult
Redemption: toggle when balance >= min, max % of order, negative order_items row
Referral code validation at checkout
First purchase + cross-sell bonus detection

---

## PART 7 — EDGE FUNCTIONS

### loyalty-ai Edge Function (nightly scheduled job)
1. Churn scoring (0–1 probability per customer)
2. Churn rescue trigger (high-value silent 21+ days)
3. Streak evaluation (1st of month)
4. Birthday bonus (daily check)
5. Point expiry
6. Stock-linked boost suggestions
7. Weekly loyalty brief

---

## PART 8 — COGS AND PRICING INTEGRATION

HQCogs.js: Loyalty cost line in COGS breakdown
HQPricing.js: Net margin after loyalty column

---

## CRITICAL RULES

- NEVER upsert user_profiles — UPDATE only (Rule 0E)
- NEVER insert line_total in order_items — GENERATED COLUMN
- NEVER add tenant_id to scan_logs — LL-056
- tenant_id on EVERY INSERT to tenant-scoped tables — Rule 0F
- useTenant() inside the component that uses it — Rule 0G
- sell_price from inventory_items — products table is DEAD
- Inter font only in HQ components — LL-051

---

*WP-O v2.0 — NexAI Platform · March 2026*
*Supersedes WP-O v1.0 completely.*
