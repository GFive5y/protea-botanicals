# WP-P&L-INTELLIGENCE-v1.0 — Transaction-Level P&L Upgrade
## Priority: HIGH — makes the existing P&L accurate for the first time
## Produced: 07 Apr 2026 · Session v199
## Depends on: order_items with AVCO in product_metadata (confirmed working)

---

## THE UNLOCK

order_items has 2,833 rows with weighted_avg_cost in product_metadata.
Real COGS confirmed: R243,096 on R621,212 revenue = 60.9% margin.

## WHAT TO BUILD

1. Upgrade P&L revenue/COGS fetch to use order_items + product_metadata AVCO
2. Add "Margin by Product" section (top 10 by GP or margin %)
3. Add "Gross Profit by Category" section
4. Label COGS as "(actual)" in waterfall
5. Daily gross profit chart

---

*WP-P&L-INTELLIGENCE-v1.0 · NuAi · 07 Apr 2026*
