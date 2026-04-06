# PRODUCT-FEATURES v1.0 — NUAI Platform
## Medi Recreational Tenant · Complete Feature Catalogue
### For cold-start AI sessions: read this to understand what this system is and does.
### Date: 07 Apr 2026

---

## WHAT THIS SYSTEM IS

NUAI is a multi-tenant cannabis retail intelligence platform. It combines:
- A POS (point of sale) till for in-store sales
- An online shop with PayFast payment processing
- A loyalty programme with QR scanning and tier rewards
- A full HQ operator dashboard with stock, purchasing, HR, and financial intelligence
- A TenantPortal for client-facing store management
- An AI assistant (ProteaAI) powered by Claude via Supabase Edge Function

The operator is Protea Botanicals (tenant: 43b34c33).
The primary live client is Medi Recreational (tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74).
Medi Rec is a cannabis retail store — NOT a medical dispensary.

---

## SECTION 1 — SALES & POS FEATURES

### 1.1 POS Till (POSScreen.js)
A budtender-facing point-of-sale screen for in-store cannabis retail.
- Product grid filtered by category with search
- Tap product → qty modal → add to cart
- Cart with line-by-line qty adjustment
- Customer lookup by phone number (links to loyalty)
- Cash / Card / Yoco payment method selection
- Cash tendered + change calculator for cash sales
- Session awareness (reads pos_sessions table — open session required)
- On sale completion writes:
  - orders (channel: 'pos', status: 'paid')
  - order_items (product_name, qty, unit_price, line_total, product_metadata{item_id, category, weighted_avg_cost})
  - stock_movements (movement_type: 'sale_pos')
  - inventory_items.quantity_on_hand (decremented)
  - loyalty_transactions + user_profiles.loyalty_points (if customer linked)
- Receipt modal shown after sale with loyalty points earned

### 1.2 Online Shop (Shop.js + CheckoutPage.js)
Customer-facing online store powered by inventory_items.
- Products visible if: is_active=true AND sell_price>0 AND quantity_on_hand>0
- Cart managed via CartContext
- Checkout via PayFast payment gateway (payfast-checkout Edge Function)
- Loyalty points calculated and previewed at checkout:
  - Base rate: pts_per_r100_online
  - Online bonus multiplier
  - Category multiplier (8 categories in loyalty_config)
  - Tier multiplier (Bronze/Silver/Gold/Platinum/Harvest Club)
  - First-purchase bonus
  - Cross-sell bonus (first time buying from a category)
  - Referral code bonus
- Points redemption toggle (max % of order value configurable)
- On payment confirmation (OrderSuccess.js):
  - loyalty_transactions written
  - user_profiles.loyalty_points updated
  - category_flags updated (for cross-sell detection)
- Online orders tagged channel: 'online' (migration applied Apr 7 2026)

### 1.3 Order Intelligence (order_items table)
Every sale (POS + online) writes line-item detail to order_items.
Schema: id, order_id, product_name, quantity, unit_price, line_total,
        product_metadata (JSONB: {item_id, category, weighted_avg_cost}), created_at

This enables:
- Revenue by SKU
- Revenue by category
- True gross profit (revenue - COGS)
- Units sold per product
- Sales velocity (units/day)
- Days of stock remaining at current velocity
- Basket co-purchase analysis (which products sell together)
- Customer purchase history (when loyalty linked)

NOTE: As of Apr 7 2026, all 1,013 existing order_items rows are seeded demo data.
Real live order_items accumulation begins from commit 4301631.

---

## SECTION 2 — LOYALTY & MEMBERSHIP FEATURES

### 2.1 QR Scan Loyalty
Customers scan product QR codes via the shop or a standalone scan page.
- QR codes HMAC-signed via sign-qr Edge Function
- Scans written to scan_logs table
- Points awarded based on loyalty_config per tenant
- Tier progression: Bronze → Silver → Gold → Platinum → Harvest Club
- Tiers tracked in user_profiles.loyalty_tier + loyalty_points

### 2.2 Loyalty Configuration (HQLoyalty.js)
Fully configurable loyalty economics per tenant:
- Points per R100 spent (online vs POS)
- Tier thresholds and multipliers
- Category multipliers (8 product categories)
- First purchase bonus, cross-sell bonus, referral bonus
- Redemption value (R per point) and minimum to redeem
- Max redemption % per order
Three preset schemas: Conservative / Standard / Aggressive

### 2.3 Customer Intelligence
- user_profiles: loyalty_tier, loyalty_points, category_flags, anomaly_score
- Fraud detection: anomaly_score > 70 flagged
- Birthday tracking: date_of_birth → bonus points on birthday
- Referral codes: unique per member, tracked with uses_count

### 2.4 Members & Loyalty Dashboard Tiles
- QR Scans tile: total lifetime + last 7d + last 30d (two-line stacked)
- Loyalty Points tile: total + pts last 7d + pts last 30d
- Comms tile: open tickets + unread messages + wholesale messages
- Fraud Alerts tile: flagged + suspended accounts

---

## SECTION 3 — STOCK & INVENTORY FEATURES

### 3.1 Smart Inventory (SmartInventory.js — 175KB)
The primary inventory management interface.
- 186 active SKUs across 14 Product Worlds (cannabis retail categories)
- Smart Catalog for adding/editing products
- Stock receive flow (writes stock_movements purchase_in)
- AVCO (Average Cost) weighted cost tracking
- Stock value: R205,634 AVCO-weighted (as of Apr 7 2026)
- Subcategory tagging: Flower cultivation types, Hash & Kief, Concentrates

### 3.2 14 Product Worlds (ProductWorlds.js)
Cannabis retail category system with subcategory-first matching:
Flower, Concentrates, Hash & Kief, Vapes, Edibles, Tinctures,
Topicals, Seeds, Growing Equipment, Nutrients, Accessories,
Wellness, Lifestyle, Merch

### 3.3 Stock Intelligence (StockIntelPanel.js + HQStock.js)
Powered by stock_movements + order_items:
- Best Sellers: top units moved (sale_pos + sale_out movements)
- Making You Money: top revenue SKUs from order_items
- Fast Movers: days of stock remaining at current velocity
- Dead Stock: items idle 45+ days
- Margin Heroes: highest margin SKUs from inventory_items
- Movement Velocity: 12-week heatmap grid

### 3.4 Reorder Management
- Static reorder_level threshold per SKU
- Reorder Alerts tile: items where quantity_on_hand <= reorder_level
- PENDING (WP-INTELLIGENCE Phase 1): velocity-based days_of_stock reorder

### 3.5 Stock by Category (Dashboard drill-down)
- 14 Product Worlds overview with in-stock ratio bars
- Click any category → drill into subcategories
- Back navigation via chevron in chart header

---

## SECTION 4 — FINANCIAL FEATURES

### 4.1 Revenue MTD Tile (Dashboard — The Shelf section)
- Revenue month-to-date from orders.total
- Average margin % (AVCO-weighted across priced SKUs)
- Run rate: MTD / days elapsed
- Projected month-end: run rate × 30
- No new query — computed at render time from plStats

### 4.2 P&L (HQProfitLoss.js)
Current state: revenue from orders.total, limited COGS visibility.
PENDING (WP-INTELLIGENCE Phase 2): rebuild around order_items for true SKU-level gross profit.

### 4.3 FX Rate Tile
- Live USD/ZAR rate from get-fx-rate Edge Function (open.er-api.com)
- Yesterday delta (↑ red = rand weakened, ↓ green = strengthened)
- 30-day delta
- 60-second auto-refresh with countdown timer + manual refresh
- Fallback: R18.50 if feed fails

### 4.4 COGS Calculator (HQCogs.js)
Manufacturer-focused cost-of-goods calculation per product recipe.
Hardware cost + terpene cost + labour + other = COGS per unit.
COGS recalculates with live FX rate.

---

## SECTION 5 — DASHBOARD (HQOverview.js — Information Bubble Philosophy)

Every tile answers "what does this number mean RIGHT NOW?"
Pattern: Primary KPI + Comparative delta(s) + Operational callout

### TODAY Section (3 tiles)

**Today's Sales:**
- Primary: R total revenue today
- Comparison 1: vs yesterday (R amount + ↑↓ % delta)
- Comparison 2: vs same weekday last week (R amount + ↑↓ % delta)
- Two distinct metrics — not duplicates

**Transactions:**
- Primary: count of orders today
- Breakdown: ● Cash N R___ · ● Card N R___ · ● Yoco N R___
  (colored dot + count + revenue per payment method)
- Three-column layout per method
- Ready for POS vs Online channel split (orders.channel now available)

**Avg Basket:**
- Primary: R avg per transaction
- Crumbs: X.X items avg · best day: [day] · ↑↓X% vs 7d avg
- avgItems from items_count (no extra query)
- bestDow from 30d orders grouped by day of week
- vsSevenD: today vs 7-day rolling avg (render-time delta)

### THE SHELF Section (4 tiles)
- Stock Health: in-stock count + out of stock + below reorder callout
- Purchase Orders: open PO count + next delivery date
- Revenue MTD: see Section 4.1
- Reorder Alerts: items below threshold count

### PRODUCT HEALTH Section
- Stock by Category: bar chart with in-stock ratio, drills to subcategory
- Stock Value: R AVCO-weighted total
- Margin Health: avg margin % + healthy SKU count
- Expiry Status: expired / expiring soon / all clear

### OTHER SECTIONS
- Scan Activity (30-day area chart, zero-filled)
- Members & Loyalty (4 tiles — see Section 2.4)
- Scan Distribution (donut + horizontal bar)
- Birthdays (today + this week)
- Store Performance (Avg Gross Margin + FX tile)
- Gross Margin gauge (radial)
- Recent Scans + Low Stock Alerts (two panels)
- Quick Actions (platform links + HQ tab shortcuts)

---

## SECTION 6 — AI FEATURES

### 6.1 ProteaAI (ProteaAI.js)
Floating AI assistant powered by Claude Sonnet via ai-copilot Edge Function.
- Tab-aware context (knows which dashboard section you're in)
- Chat / Query / Dev tabs
- 30+ pre-built queries for operational intelligence
- Accessible via ⋯ button in nav sidebar

### 6.2 AI Intelligence Layer (loyalty-ai Edge Function)
NOT YET DEPLOYED. Planned nightly cron jobs:
- Churn rescue: identify customers who haven't bought in 30+ days
- Birthday bonuses: award points on member birthdays
- Stock boost suggestions: flag items with 90+ days on hand
- Streak bonuses: reward purchase frequency
- Weekly brief: surface recommendations panel

---

## SECTION 7 — HR & OPERATIONS (HRDashboard.js + TenantPortal.js)

### 7.1 HR Suite (13 tabs)
Staff, Roster, Timesheets, Leave, Contracts, Payroll, Calendar,
Comms, Disciplinary, Loans, Performance, Staff Profiles, Settings

### 7.2 TenantPortal (v3.0)
Client-facing management portal on /tenant-portal route.
Sections: Dashboard, Inventory, Ordering, Operations, Sales, Customers, Reports, Team
Role-based navigation driven by user_profiles.role

---

## SECTION 8 — DATA SIMULATION

### 8.1 POS Simulator (sim-pos-sales Edge Function)
Deployed Apr 7 2026. Generates realistic POS sales data for development/testing.
- Call: POST {SUPABASE_FUNCTIONS_URL}/sim-pos-sales
- Body: { "days": 30, "orders_per_day": 12 }
- Writes to: orders + order_items (NOT stock_movements, NOT inventory deduction)
- Tags: notes = 'sim_data_v1'
- Cleanup: DELETE FROM orders WHERE notes = 'sim_data_v1' AND tenant_id = '...'
- Realistic patterns: time of day, day of week, payment split, category weighting

---

## SECTION 9 — SCHEMA REFERENCE (confirmed Apr 7 2026)

### Key tables
```
orders:           id, user_id, tenant_id, order_ref, status, total, currency,
                  payfast_payment_id, payment_method, channel, items_count,
                  notes, created_at, updated_at
                  channel: pos | online | wholesale (added Apr 7 2026)

order_items:      id, order_id, product_name, quantity, unit_price, line_total,
                  product_metadata (JSONB: {item_id, category, weighted_avg_cost}),
                  created_at

inventory_items:  id, tenant_id, name, category, subcategory, sell_price,
                  weighted_avg_cost, quantity_on_hand, reorder_level,
                  last_movement_at, expiry_date, is_active

stock_movements:  id, item_id, tenant_id, movement_type, quantity, reference,
                  notes, unit_cost, batch_id, created_at
                  movement_type enum: purchase_in | sale_out | sale_pos |
                  adjustment | waste | transfer | production_in | production_out

user_profiles:    id, tenant_id, full_name, phone, loyalty_points, loyalty_tier,
                  category_flags, anomaly_score, date_of_birth, role

scan_logs:        id, user_id, qr_code, qr_type, scanned_at, scan_outcome,
                  points_awarded, ip_city
                  NOTE: NO tenant_id column — never filter by it

loyalty_config:   tenant_id, pts_per_r100_online, online_bonus_pct,
                  mult_bronze/silver/gold/platinum/harvest_club,
                  threshold_silver/gold/platinum/harvest_club,
                  mult_cat_* (8 categories), redemption_value_zar,
                  min_pts_to_redeem, pts_first_online_purchase, pts_crosssell_trigger
```

---

## SECTION 10 — INTELLIGENCE LAYER (BUILT + PENDING)

### What the Intelligence Layer Does (Operational Value)

The intelligence layer converts raw transaction data into operational decisions.
Without it: the operator sees "R156,865 this month" and waits for month-end
to understand performance. With it: every dashboard tile tells them what to
do RIGHT NOW.

**The core unlock (commit 4301631, Apr 7 2026):**
Every POS sale now writes order_items with product_name, quantity, unit_price,
line_total, and product_metadata (including weighted_avg_cost). This enables
true retail P&L at SKU level — something no existing SA cannabis software does.

### ✅ BUILT — Intelligence Features Live

**Revenue MTD Run Rate (P3)**
File: src/components/hq/HQOverview.js — Revenue MTD tile
- Shows: margin % + R[X]/day run rate + projected month-end
- Why it matters: replaces "how did we do?" with "are we on track?"
- Example: R22k/day run rate → projected R672k month-end
- Calculation: render-time only (MTD ÷ days elapsed × 30). No new query.

**Velocity-Based Reorder Alerts (P1-B)**
File: src/components/hq/HQOverview.js — Reorder Alerts tile sub prop
State: velocityAlerts[] computed in fetchCannabisData
- Shows: top 2 critical SKUs with days of stock remaining + revenue at risk
- Example: "Hybrid Flower 3.5g · 5d · R1,201/day"
- Why it matters: static reorder_level says "6 items below threshold"
  but velocity says "your top revenue SKU runs out tomorrow"
- Query: order_items × inventory_items → daily_velocity → days_of_stock
- Color: red ≤7 days · amber 8–13 days

**orders.channel Column**
Migration: Apr 7 2026
Values: 'pos' | 'online' | 'wholesale'
Enables: Transactions tile to split POS vs Online revenue (built, pending UI)

**POS Data Simulator (sim-pos-sales)**
Edge Function deployed Apr 7 2026
- Generates realistic 60-day trading history for development/testing
- Realistic patterns: time-of-day, day-of-week, payment splits, category weighting
- Tags all records notes='sim_data_v1' — one SQL line to clean up
- Does NOT deduct inventory — safe for development

### ⏳ PENDING — Intelligence Features (WP-INTELLIGENCE_v1_0.md)

**P4b — Online channel tagging (20 min)**
Add channel: 'online' to payfast-checkout Edge Function orders INSERT.

**Best Seller Crumb on Avg Basket tile (45 min)**
Top SKU by units today from order_items → shown in Avg Basket tile sub prop.

**Silent Fail UX — POS Toast on DB Errors (1 hour)**
POSScreen.js: order_items and stock_movements errors are console.warn only.
Should surface as toast to operator. Ref: LL-SUPABASE-SILENT-FAIL-01.

**P2 — True P&L Rebuild (dedicated session)**
HQProfitLoss.js: rebuild around order_items × weighted_avg_cost.
Replaces revenue-only view with true gross profit by category and SKU.
Proven query this session — category P&L, SKU profitability ranking.

**Dead Stock Panel (2 hours)**
Items with quantity_on_hand > 0 and zero velocity in last 45 days.
Shows: name, units on hand, days since last sale, capital tied up.

**P6 — HQTradingDashboard bar colour (15 min)**
30-day revenue bar still on old green. Update to Indigo (#6366F1).

Full 5-phase roadmap: docs/WP-INTELLIGENCE_v1_0.md

### Intelligence Queries (Proven — Ready to Use)

**Days of Stock per SKU:**
```sql
SELECT ii.name, ii.quantity_on_hand,
  ROUND(SUM(oi.quantity)::numeric / 30, 2) as daily_velocity,
  ROUND((ii.quantity_on_hand / (SUM(oi.quantity)::numeric / 30))::numeric, 0) as days_of_stock,
  ROUND((SUM(oi.quantity)::numeric / 30 * ii.sell_price)::numeric, 0) as daily_revenue
FROM inventory_items ii
JOIN (
  SELECT (oi.product_metadata->>'item_id')::uuid as item_id, SUM(oi.quantity) as quantity
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.tenant_id = '[tenant_id]' AND o.status = 'paid'
    AND o.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY (oi.product_metadata->>'item_id')::uuid
) s ON s.item_id = ii.id
WHERE ii.tenant_id = '[tenant_id]' AND ii.is_active = true AND ii.quantity_on_hand > 0
ORDER BY days_of_stock ASC NULLS LAST;
```

**True P&L by Category:**
```sql
SELECT (oi.product_metadata->>'category') as category,
  ROUND(SUM(oi.line_total)::numeric, 0) as revenue,
  ROUND(SUM(oi.quantity * COALESCE(ii.weighted_avg_cost, 0))::numeric, 0) as cogs,
  ROUND((SUM(oi.line_total) - SUM(oi.quantity * COALESCE(ii.weighted_avg_cost, 0)))::numeric, 0) as gross_profit,
  ROUND(((SUM(oi.line_total) - SUM(oi.quantity * COALESCE(ii.weighted_avg_cost,0)))
    / NULLIF(SUM(oi.line_total),0) * 100)::numeric, 1) as margin_pct
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN inventory_items ii ON ii.id = (oi.product_metadata->>'item_id')::uuid
WHERE o.tenant_id = '[tenant_id]' AND o.status = 'paid'
GROUP BY (oi.product_metadata->>'category')
ORDER BY gross_profit DESC;
```

---

## SECTION 11 — CRITICAL RULES FOR AI SESSIONS

1. NEVER edit without reading current file from disk first (LL-GH-MCP-01: SHA may be stale)
2. NEVER use GitHub write tools from Claude.ai (RULE 0Q + LL-202)
3. NEVER add tenant_id to scan_logs inserts (no column exists)
4. NEVER upsert user_profiles — UPDATE only
5. order_items.line_total is plain numeric — INSERT it explicitly (not generated)
6. ALWAYS check Supabase insert {error} return — client does NOT throw on DB errors
7. ALWAYS verify enum values before using in application code
8. DISK IS TRUTH — verify schema from Supabase, not from docs
9. Seed data is tagged notes='sim_data_v1' or 'POS sale [demo_seed_v1]'
   Real live orders have notes=NULL or notes='POS sale'
10. The intelligence layer is WIRED as of Apr 7 2026.
    Real data accumulates from every POS sale after commit 4301631.
