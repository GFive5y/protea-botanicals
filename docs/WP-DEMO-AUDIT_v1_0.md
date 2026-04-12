# WP-DEMO-AUDIT v1.0
## NuAi - CA Business Rescue Demo Readiness
## Target: 12 May 2026 - all 4 tenants
## Produced: 13 April 2026
## This file is NEVER replaced - append date-stamped updates below

---

## THE STANDARD WE ARE HOLDING

The CA opens NuAi and sees a business that is ALIVE.
Not a demo. Not sample data. A LIVE COMPANY.
- Stock moving. Sales happening. Staff clocking in.
- Invoices paid and outstanding. VAT filed or due.
- Loyalty points accumulating. QR codes being scanned.
- The P&L tells a story. The balance sheet balances.
- Every screen has something on it. Nothing is empty.

If the CA clicks anything and sees a blank table or "No data yet",
we have failed. Every screen must pass the empty-state test.

---

## THE 4 TENANTS

| # | Tenant | Industry | ID prefix | Story |
|---|---|---|---|---|
| 1 | Medi Recreational | cannabis_retail | b1bad266 | Cape Town boutique cannabis shop, 18 months trading |
| 2 | The Garden Bistro | food_beverage | 7d50ea34 | Constantia farm-to-table restaurant, 2 years trading |
| 3 | MediCare Dispensary | cannabis_dispensary | 8b9cb8e6 | SAHPRA-licensed medical dispensary, 14 months operating |
| 4 | Metro Hardware | general_retail | 57156762 | East Rand independent hardware, 3 years trading |

---

## METHODOLOGY

### Step 1: Data audit (Supabase)
Run the data audit SQL for that tenant. Confirm: orders, inventory, staff, invoices, loyalty.
If a table is empty, seed it first.

### Step 2: Financial spine (12 months)
Every tenant needs 12 months of financial history ending on 12 May 2026.
At least 2 months should show a dip (business rescue context).
Most recent month shows recovery/uptick.

### Step 3: Dashboard pass
Open the tenant portal. Screenshot. Run industry benchmark comparison.

### Step 4: Navigation audit
Click every single nav item. Is there data? Is the label right?

### Step 5: AINS / AI surfacing pass
What COULD be surfaced here that isn't? Nav badges? ProteaAI pills?

### Step 6: Live trading - day-of-demo data
Run sim-pos-sales for 12 May 2026 specifically.

### Step 7: Shop / consumer face
Open /shop. Does it look like a real business?

### Step 8: Sign-off
Every screen passes the empty-state test.

---

## INDUSTRY BENCHMARKS

### Cannabis Retail (Medi Recreational, MediCare)
Leaders: Dutchie, Jane Technologies, Flowhub, Cova, Meadow
Gross margin benchmark: 45-65%
Revenue profile: evening-weighted, weekend spikes

### Food & Beverage (The Garden Bistro)
Leaders: MarketMan, BlueCart, Lightspeed Restaurant, Toast
Gross margin benchmark: 65-75% (food cost 25-35%)
Revenue profile: lunch and dinner peaks, Monday quieter

### General Retail (Metro Hardware)
Leaders: Vend, Lightspeed Retail, DEAR, Cin7
Gross margin benchmark: 35-50%
Revenue profile: weekday trade accounts, weekend DIY

---

## DATA AUDIT SQL

```sql
-- Replace 'TENANT_ID' with actual tenant ID before running
SELECT
  'orders'            AS table_name, COUNT(*) AS row_count FROM orders WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'inventory_items',  COUNT(*) FROM inventory_items  WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'stock_movements',  COUNT(*) FROM stock_movements  WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'invoices',         COUNT(*) FROM invoices         WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'expenses',         COUNT(*) FROM expenses         WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'loyalty_transactions', COUNT(*) FROM loyalty_transactions WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'scan_logs',        COUNT(*) FROM scan_logs        WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'staff_profiles',   COUNT(*) FROM staff_profiles   WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'timesheets',       COUNT(*) FROM timesheets       WHERE tenant_id = 'TENANT_ID'
UNION ALL SELECT 'user_profiles',    COUNT(*) FROM user_profiles    WHERE tenant_id = 'TENANT_ID'
ORDER BY table_name;
```

---

## THE ONE-SENTENCE TEST

Before any screen is signed off, ask:
**"If a stressed CA sat down here with a distressed company's board behind them,
would this screen give them confidence - or hesitation?"**

If the answer is hesitation, the screen is not ready.

---
*WP-DEMO-AUDIT v1.0 - NuAi - 13 April 2026*
*4 tenants - 12 May 2026 demo - methodical, store by store*
