# WP-INTELLIGENCE v1.0 — Retail Intelligence Layer
## Work Package: From Revenue Numbers to Business Intelligence
### Date: 07 Apr 2026 · Builds on: commit 4301631 (order_items now live)

---

## WHY THIS WP EXISTS

As of Apr 7 2026, the POS correctly writes order_items on every sale.
This unlocks a complete retail intelligence stack that previously could not exist.

This WP breaks that stack into 5 phases, each independently shippable,
each adding a distinct layer of operational intelligence.

---

## PHASE 1 — VELOCITY INTELLIGENCE
### "How fast is stock burning, and when will we run out?"

**The problem today:**
Reorder Alerts shows "6 items below threshold." The threshold is a static number
(reorder_level) set manually. It has no idea how fast the item is actually selling.
LED Grow Light 240W could have 5 units left and be selling 3/day = runs out tomorrow.
Or 5 units and selling 0.1/day = 50 days of stock. The current system cannot tell the difference.

**What Phase 1 builds:**

### P1-A: Days of Stock calculation
For every active SKU, compute:
```
daily_velocity = units_sold_last_30d / 30
days_of_stock  = quantity_on_hand / daily_velocity
revenue_at_risk = daily_velocity × sell_price × (lead_time_days - days_of_stock)
                  [only when days_of_stock < lead_time]
```

Query (already proven — run against real data once available):
```sql
SELECT
  ii.name, ii.category, ii.quantity_on_hand, ii.sell_price,
  COALESCE(s.units_30d, 0) as units_sold_30d,
  ROUND((COALESCE(s.units_30d, 0)::numeric / 30), 2) as daily_velocity,
  CASE WHEN COALESCE(s.units_30d, 0) = 0 THEN NULL
       ELSE ROUND((ii.quantity_on_hand / (COALESCE(s.units_30d,0)::numeric/30))::numeric, 0)
  END as days_of_stock
FROM inventory_items ii
LEFT JOIN (
  SELECT (oi.product_metadata->>'item_id')::uuid as item_id, SUM(oi.quantity) as units_30d
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.tenant_id = ? AND o.status = 'paid' AND o.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY (oi.product_metadata->>'item_id')::uuid
) s ON s.item_id = ii.id
WHERE ii.tenant_id = ? AND ii.is_active = true AND ii.quantity_on_hand > 0
ORDER BY days_of_stock ASC NULLS LAST;
```

### P1-B: Velocity-based Reorder Alerts tile upgrade
File: src/components/hq/HQOverview.js — Reorder Alerts MetricTile

Current sub: "items need reorder" (static count)

Target sub:
```
6 below threshold
LED 240W · 2d left · R6,967/day at risk
LED 100W · 1d left · R4,120/day at risk
```

Shows top 2 critical SKUs by revenue_at_risk inline in the tile.

State: const [velocityAlerts, setVelocityAlerts] = useState([])
Query: piggybacked on existing fetchCannabisData or fetchStats
New fields: { name, days_of_stock, daily_revenue }

### P1-C: Days of Stock panel (new section in dashboard or stock screen)
A ranked table of all active SKUs showing:
- Name · Category · On hand · Daily velocity · Days remaining · Revenue/day
- Color coded: red < 7 days · amber 7-14 days · green > 14 days
- Sorted by days_of_stock ASC (most urgent first)

**Files to create/modify:**
- src/components/hq/StockVelocityPanel.js (NEW — ~80 lines)
- src/components/hq/HQOverview.js (Reorder tile sub prop — 1 change)
- src/components/hq/HQStock.js (add velocity panel as a tab — check RULE 0L first)

**Data dependency:** Requires real order_items accumulation. Sim data fine for development.

**Commit message template:**
```
feat(intelligence): P1 — velocity-based reorder + days of stock

- StockVelocityPanel: SKUs ranked by days of stock remaining
- Reorder tile: shows top 2 revenue-at-risk SKUs inline
- Query: order_items velocity × current stock ÷ daily burn rate
- Color: red <7d · amber 7-14d · green >14d
```

---

## PHASE 2 — TRUE P&L
### "What did we actually earn, by product and by category?"

**The problem today:**
HQProfitLoss.js shows revenue from orders.total. It cannot show:
- Which category is most profitable
- Which SKU has the best margin × volume combination
- True COGS per sale (revenue - actual cost of what sold)

**What Phase 2 builds:**

### P2-A: Gross Profit query (the foundation)
```sql
SELECT
  (oi.product_metadata->>'category') as category,
  SUM(oi.line_total) as revenue,
  SUM(oi.quantity * COALESCE(ii.weighted_avg_cost, 0)) as cogs,
  SUM(oi.line_total) - SUM(oi.quantity * COALESCE(ii.weighted_avg_cost, 0)) as gross_profit,
  ROUND((...gross_profit / revenue * 100)::numeric, 1) as margin_pct
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN inventory_items ii ON ii.id = (oi.product_metadata->>'item_id')::uuid
WHERE o.tenant_id = ? AND o.status = 'paid'
  AND o.created_at >= [period_start]
GROUP BY (oi.product_metadata->>'category')
ORDER BY gross_profit DESC;
```

### P2-B: P&L screen upgrade
File: src/components/hq/HQProfitLoss.js

Add a new "Sales P&L" section showing:
```
GROSS PROFIT BY CATEGORY — This Month

Hardware      R841,620   60.0%   ████████████████████  60.5% of revenue
Concentrate   R230,370   60.0%   ██████████            16.6%
Flower        R132,840   60.0%   ██████                 9.6%
Accessory     R113,220   60.0%   █████                  8.1%
Raw Material   R72,930   60.0%   ████                   5.2%
───────────────────────────────────────────────────────────
TOTAL       R1,390,980   60.0%
```

Period selector: This Month / Last Month / Last 30d / Last 90d

### P2-C: SKU profitability ranking
Top 10 SKUs by gross profit (not just revenue):
```
#1  LED Grow Light 240W    R355,080 GP  60.0%  269 units
#2  Grow Tent 120x120cm    R212,520 GP  60.0%  253 units
#3  LED Grow Light 100W    R190,800 GP  60.0%  265 units
```

This tells you: LED 240W earns more per unit AND sells more units. Protect this SKU.

**Files to modify:**
- src/components/hq/HQProfitLoss.js (add gross profit section — grep first)

**Data dependency:** Works immediately with sim data.

---

## PHASE 3 — REVENUE FORECASTING
### "Where are we tracking for the month — by category?"

**The problem today:**
Revenue MTD tile shows total run rate. No category breakdown.
No signal on which category is accelerating vs declining.

**What Phase 3 builds:**

### P3-A: Category run rates
Extend Revenue MTD tile or add a "Revenue Forecast" panel:
```
REVENUE MTD — Category Breakdown
Hardware      R100k  (R14.3k/day · on track for R430k)
Concentrate   R27k   (R3.9k/day · on track for R117k)
Flower        R15k   (R2.1k/day · on track for R64k)
Accessory     R13k   (R1.9k/day · on track for R57k)
```

### P3-B: Week-over-week signal
For each category: is this week above or below last week?
```
Hardware   ↑ 12% vs last week   → trending
Flower     ↓ 8% vs last week    → watch
```

### P3-C: Cash flow projection by payment method
From orders.payment_method distribution:
```
Expected this week:
  Cash (55%):   R76,000  →  R76k in till
  Card (30%):   R42,000  →  bank transfer
  Yoco (15%):   R21,000  →  Yoco settlement
```
Useful for: cash-up planning, petty cash float decisions.

**Files to modify:**
- src/components/hq/HQOverview.js (Revenue MTD tile sub prop extension)
- Possibly a new src/components/hq/RevenueForecastPanel.js

---

## PHASE 4 — INVENTORY INTELLIGENCE
### "Which SKUs are making us money per shelf-meter, and which are dead?"

**What Phase 4 builds:**

### P4-A: Dead Stock Panel
Items with quantity_on_hand > 0 AND zero sales in last 45 days.
```
DEAD STOCK — 2 items
OCB Organic Hemp Papers   21 units · 0 sold in 45d · R420 tied up
OCB Bamboo Papers         24 units · 0 sold in 45d · R480 tied up
Total capital in dead stock: R900
```
Action button: "Mark for clearance" → sets sell_price flag or notes.

### P4-B: Best Seller crumb on Avg Basket tile
Currently shows "1.3 items avg · best day: Wed · ↑89% vs 7d avg"
Add: "#1 today: LED 240W (3 sold)"
Query: SELECT product_name, SUM(quantity) FROM order_items WHERE order today GROUP BY product_name ORDER BY sum DESC LIMIT 1

### P4-C: Shelf efficiency score
(gross_profit_per_unit × daily_velocity) = profit per shelf-slot per day
Ranks SKUs by how hard they work for you.
```
LED 240W:   R1,320 GP × 3.17/day = R4,184 profit contribution/day
OCB Papers: R12 GP    × 0.0/day  = R0 → dead weight
```

---

## PHASE 5 — CUSTOMER INTELLIGENCE
### "Who buys what, and who's at risk of churning?"
### REQUIRES: Real orders from multiple distinct users (not yet available)

**Blocked until:** Real loyalty members make purchases through the POS or online shop.
Currently all 404 seeded orders = 1 user (Medi Admin). Customer diversity = zero.

**What Phase 5 builds (when data exists):**

### P5-A: Purchase history per member
In HQLoyalty.js or TenantPortal customer view:
"Customer X has bought from: Flower (12x), Concentrate (8x), Accessories (3x)"

### P5-B: RFM Scoring (Recency / Frequency / Monetary)
- Recency: days since last purchase
- Frequency: orders per month
- Monetary: avg order value
Composite score → segment customers: Champions / At Risk / Lost / New

### P5-C: Churn detection
Customers who bought 3+ times and haven't bought in 30+ days.
Trigger: loyalty-ai Edge Function → write to customer_messages inbox.

### P5-D: Category affinity
"Customers who buy Flower also buy Accessories 68% of the time"
Powers: in-store recommendation prompts on POS screen.

---

## BUILD ORDER (recommended)

1. **P1-B** — Reorder tile upgrade (2 hours, immediate operational value)
2. **Simulator** — Run sim-pos-sales to get 30 days of test velocity data
3. **P1-A/C** — Days of Stock query + panel (3 hours, proves intelligence works)
4. **P2-A/B** — Gross Profit P&L section (3 hours, financial clarity)
5. **P4-A** — Dead Stock panel (2 hours, capital recovery)
6. **P3-A** — Category run rates (2 hours, extends existing MTD tile)
7. **P4-B** — Best seller crumb on Avg Basket (1 hour, completes tile)
8. **P2-C** — SKU profitability ranking (2 hours, investment decisions)
9. **P3-B/C** — WoW signals + cash flow (3 hours, forward planning)
10. **P5** — Customer intelligence (after real users accumulate)

Total estimated: ~20 hours of Claude Code time across multiple sessions.
Each phase is independently shippable and adds immediate value.

---

## DATA SIMULATOR — USAGE

Edge Function: sim-pos-sales (deployed Apr 7 2026)

To generate 30 days of realistic sim data:
```bash
curl -X POST \
  https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1/sim-pos-sales \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"days": 30, "orders_per_day": 12}'
```

To generate a full trading history for testing:
```bash
# 90 days, 15 orders/day = ~1,350 orders, ~4,000 line items
-d '{"days": 90, "orders_per_day": 15}'
```

To clean ALL sim data:
```sql
DELETE FROM orders
WHERE notes = 'sim_data_v1'
AND tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74';
-- Cascade will also delete order_items via order_id FK
```

Simulator characteristics:
- 55% cash / 30% card / 15% yoco payment split
- Hardware 35% / Concentrate 22% / Flower 20% / Accessory 12% / Other 11%
- Trading hours: 09:00-20:00, weighted toward 12:00-17:00 peak
- Sundays ~20% quieter than weekdays
- Basket: 1-4 items per order, 70% single-item orders
- Does NOT deduct inventory — safe for development use
- All tagged notes='sim_data_v1' — one SQL line cleanup
