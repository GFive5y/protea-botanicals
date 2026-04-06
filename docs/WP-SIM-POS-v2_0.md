# WP-SIM-POS-v2.0 — Simulated POS Sales Engine
## Priority: EXECUTE FIRST — unblocks all development and demos
## Produced: 07 Apr 2026 · Session v199

---

## WHAT ALREADY EXISTS

sim-pos-sales Edge Function (v1) generates orders + order_items for 30 days.
Cannabis category weights, time-weighted hours, payment distribution.
Tags: notes = 'sim_data_v1'. Stores weighted_avg_cost in product_metadata.
Does NOT currently write: stock_movements, pos_sessions, eod_cash_ups.

## WHAT v2.0 ADDS

1. pos_sessions — one per simulated day
2. stock_movements — one sale_pos per order_item
3. eod_cash_ups — one per day with realistic cash variance
4. Updated category weights (flower 30%, concentrate 25%, accessory 20%)
5. UI toggle in HQTenants.js (Run 30 Days / Run 7 Days / Wipe)

---

*WP-SIM-POS-v2.0 · NuAi · 07 Apr 2026*
