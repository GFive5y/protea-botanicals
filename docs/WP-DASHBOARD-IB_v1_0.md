# WP-DASHBOARD-IB v1.0 — Dashboard Information Bubbles
## Work Package: Contextual Data Crumbs for Every Tile
### Date: 07 Apr 2026 · Medi Rec tenant

---

## Philosophy

Raw numbers tell you what. Information bubbles tell you what it means.

Gold standard — FX tile:
  USD / ZAR
  R16.9776
  ↓ 0.20%  vs yesterday
  ↑ 1.55%  vs 30 days

Formula: Primary KPI + Comparative delta(s) + Operational callout

---

## Data Availability Audit

### Available in DB now
- orders: total, payment_method, items_count, created_at, tenant_id, status
- inventory_items: qty, reorder_level, sell_price, weighted_avg_cost, last_movement_at, subcategory
- scan_logs: scanned_at, qr_type, scan_outcome, ip_city
- loyalty_transactions: points, transaction_type, transaction_date, tier_at_time, expires_at
- user_profiles: loyalty_tier, last_active_at, date_of_birth, province
- purchase_orders: po_status, subtotal, expected_arrival, currency

### Critical gaps
- order_items table — MISSING. No line-item data.
- orders.channel — MISSING. Cannot distinguish POS/Online/Wholesale.
- inventory_items.expiry_date — column exists, 0 of 186 populated.

---

## P1 — Transactions Tile (NEXT TO BUILD)

### Current state
Shows: count + delta vs yesterday

### Target state
Shows: count + payment method inline breakdown + cash in till

### Implementation spec

File: src/components/hq/HQOverview.js
NOTE: Run grep first — GitHub MCP cache is stale.
  grep -n "todayTxns\|Transactions\|payment_method\|todayPayments\|fetchToday" \
    src/components/hq/HQOverview.js

BLOCK 1 — Add state
Find block where today's state variables are declared (todaySales, todayTxns etc).
Add after that group:
  const [todayPayments, setTodayPayments] = useState(null);

BLOCK 2 — Add query in today fetch
Find the function that fetches today's orders.
After the existing today query, add:

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: pmRaw } = await supabase
      .from("orders")
      .select("payment_method,total")
      .eq("tenant_id", tenantId)
      .gte("created_at", todayStart.toISOString());
    const pm = {};
    (pmRaw || []).forEach((o) => {
      const m = o.payment_method || "other";
      if (!pm[m]) pm[m] = { txns: 0, revenue: 0 };
      pm[m].txns++;
      pm[m].revenue += parseFloat(o.total) || 0;
    });
    setTodayPayments(pm);
  } catch (_) {}

BLOCK 3 — Replace Transactions MetricTile sub prop

Find the Transactions MetricTile (label="Transactions").
Replace ONLY the sub prop with:

  sub={
    todayPayments && Object.keys(todayPayments).length > 0 ? (
      <span style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "cash", label: "Cash",  color: "#059669" },
            { key: "card", label: "Card",  color: "#2563EB" },
            { key: "yoco", label: "Yoco",  color: "#6366F1" },
          ]
            .filter(m => todayPayments[m.key])
            .map(m => (
              <span key={m.key} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                color: "#374151",
                fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
              }}>
                <span style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: m.color,
                  flexShrink: 0,
                }}/>
                <span style={{ fontWeight: 500, color: m.color }}>
                  {todayPayments[m.key].txns}
                </span>
                <span style={{ color: "#9CA3AF" }}>{m.label}</span>
              </span>
            ))
          }
        </span>
        {todayPayments.cash && (
          <span style={{
            fontSize: 10,
            color: "#059669",
            fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
            fontWeight: 500,
          }}>
            R{Math.round(todayPayments.cash.revenue).toLocaleString("en-ZA")} cash in till
          </span>
        )}
      </span>
    ) : null
  }

Commit message:
feat(dashboard): Transactions tile — payment method breakdown

Inline Cash · Card · Yoco split in the tile:
- Colored dot + count + label per method
- "R1,655 cash in till" callout — end-of-day cash-up reference
- todayPayments state, piggybacks on today fetch
- Only shows methods with transactions today

---

## P2 — Avg Basket Tile

### Current state
Shows: R per transaction + "X transactions today"

### Target state
  Avg Basket
  R618
  per transaction
  2 items avg · best day: Tue · vs 7d avg: ↑12%

### Queries needed
  -- Items per basket today
  SELECT AVG(items_count) FROM orders
  WHERE tenant_id = ? AND DATE(created_at AT TZ 'Africa/Johannesburg') = CURRENT_DATE;

  -- Best day of week (30d)
  SELECT TO_CHAR(created_at AT TZ 'Africa/Johannesburg', 'Dy') as dow,
    ROUND(AVG(total)::numeric, 0) as avg_basket
  FROM orders WHERE tenant_id = ? AND created_at >= NOW() - INTERVAL '30 days'
  GROUP BY dow ORDER BY avg_basket DESC LIMIT 1;

  -- vs 7-day avg basket
  SELECT ROUND(AVG(total)::numeric, 0) as avg_7d
  FROM orders WHERE tenant_id = ?
    AND created_at >= NOW() - INTERVAL '7 days'
    AND DATE(created_at AT TZ 'Africa/Johannesburg') != CURRENT_DATE;

---

## P3 — Revenue MTD Tile (The Shelf)

### Current state
Shows: R total MTD + avg margin %

### Target state
  Revenue MTD
  R151,415
  60.9% avg margin
  R6,054/day run rate
  projected R182k month end

### Calculation
  daysElapsed = day_of_month (today's date number)
  runRate = revenueMTD / daysElapsed
  projected = runRate * 30

No new query needed — calculated from existing data.

---

## P4 — Stock Health Tile (The Shelf)

### Current state
Shows: 185 in stock / 186 total + out of stock warning

### Target state
  Stock Health
  185
  of 186 SKUs in stock
  23 moved this week · 162 untouched · 5 unpriced

### Query needed
  SELECT
    COUNT(CASE WHEN last_movement_at >= NOW() - INTERVAL '7 days' THEN 1 END) as moved_7d,
    COUNT(CASE WHEN last_movement_at IS NULL
               OR last_movement_at < NOW() - INTERVAL '30 days' THEN 1 END) as stale_30d,
    COUNT(CASE WHEN sell_price = 0 OR sell_price IS NULL THEN 1 END) as unpriced
  FROM inventory_items
  WHERE tenant_id = ? AND is_active = true;

---

## P5 — Reorder Alerts Tile

### Current state
Shows: 6 + "items need reorder"

### Target state
  Reorder Alerts
  6
  below threshold
  Flower 2 · Hash 1 · Vapes 3

### Query needed
  SELECT category, COUNT(*) as cnt
  FROM inventory_items
  WHERE tenant_id = ? AND is_active = true
    AND reorder_level > 0
    AND quantity_on_hand <= reorder_level
  GROUP BY category ORDER BY cnt DESC;

Then map category → world label using PRODUCT_WORLDS client-side.

---

## Future Bubbles (post schema work)

These require order_items table or orders.channel field:
- Top SKU today
- Category sales split
- POS vs Online vs Wholesale breakdown
- Items per basket (accurate, not just items_count sum)
- Conversion rate (scan → purchase)

---

## Schema Work Required (separate session)

1. orders.channel — ADD COLUMN channel TEXT CHECK (channel IN ('pos','online','wholesale'))
   Default: 'pos' for cash transactions
   Migration: UPDATE orders SET channel = CASE WHEN payment_method = 'payfast' THEN 'online' ELSE 'pos' END

2. order_items — NEW TABLE
   id, order_id, tenant_id, inventory_item_id, quantity, unit_price, total, created_at
   This unlocks: top SKU, category revenue, items per basket, product performance

3. inventory_items.expiry_date — populate for all items with shelf life
   Add to Smart Catalog form for applicable categories (Flower, Edibles, Wellness)
