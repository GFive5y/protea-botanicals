// sim-pos-sales v2.0 — POS Sales Simulator
// Generates realistic order + order_items + pos_sessions + stock_movements + eod_cash_ups
// Tags all records as notes='sim_data_v1' — wipe via DELETE cascade
// Does NOT deduct actual inventory (stock_movements are audit trail only)
//
// Usage: POST /sim-pos-sales
// Body: { "days": 30, "orders_per_day": 12 } (defaults if omitted)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TENANT_ID = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74';
const USER_ID   = '283c7fe6-19ab-44fd-95fb-8adb2ca204ad'; // Medi Admin
const SIM_TAG   = 'sim_data_v1';

// Category weights v2 — cannabis-realistic
const CAT_WEIGHTS: Record<string, number> = {
  flower:           30,
  concentrate:      25,
  accessory:        20,
  hardware:         12,
  finished_product:  8,
  raw_material:      5,
};

// Payment method distribution
const PAYMENT_METHODS = [
  ...Array(55).fill('cash'),
  ...Array(30).fill('card'),
  ...Array(15).fill('yoco'),
];

// Realistic trading hours (weighted toward lunch + late afternoon)
const HOUR_WEIGHTS = [
  { hour: 9,  weight: 4 },
  { hour: 10, weight: 6 },
  { hour: 11, weight: 8 },
  { hour: 12, weight: 12 },
  { hour: 13, weight: 10 },
  { hour: 14, weight: 9 },
  { hour: 15, weight: 11 },
  { hour: 16, weight: 13 },
  { hour: 17, weight: 12 },
  { hour: 18, weight: 8 },
  { hour: 19, weight: 5 },
  { hour: 20, weight: 2 },
];

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickHour(): number {
  return weightedRandom(
    HOUR_WEIGHTS.map(h => h.hour),
    HOUR_WEIGHTS.map(h => h.weight)
  );
}

function pickPayment(): string {
  return PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
}

function genRef(date: Date, seq: number): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `SIM-${yy}${mm}${dd}-${String(seq).padStart(4,'0')}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const DAYS: number           = Math.min(body.days ?? 30, 90);
    const ORDERS_PER_DAY: number = Math.min(body.orders_per_day ?? 12, 40);

    // 1. Fetch available inventory
    const { data: items, error: itemsErr } = await supabase
      .from('inventory_items')
      .select('id, name, category, sell_price, weighted_avg_cost')
      .eq('tenant_id', TENANT_ID)
      .eq('is_active', true)
      .gt('sell_price', 0);

    if (itemsErr || !items?.length) {
      return new Response(JSON.stringify({ error: 'No inventory items found', detail: itemsErr }), { status: 500 });
    }

    // Group items by category
    const byCategory: Record<string, typeof items> = {};
    for (const item of items) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }
    const categories = Object.keys(byCategory).filter(c => byCategory[c].length > 0);
    const catWeightsArr = categories.map(c => CAT_WEIGHTS[c] ?? 5);

    const ordersToInsert: Record<string, unknown>[] = [];
    const orderItemsToInsert: Record<string, unknown>[] = [];
    const movementsToInsert: Record<string, unknown>[] = [];
    const sessionsToInsert: Record<string, unknown>[] = [];
    const eodsToInsert: Record<string, unknown>[] = [];

    let seq = 1;
    const now = new Date();

    for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(now.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      const dateStr = toDateStr(date);

      // Sundays ~20% quieter
      const isSunday = date.getDay() === 0;
      const dayOrders = isSunday
        ? Math.max(1, Math.round(ORDERS_PER_DAY * 0.8))
        : ORDERS_PER_DAY;

      // Track cash total for this day's EOD
      let dayCashTotal = 0;
      const OPENING_FLOAT = 500;

      // pos_session for this day — opens 09:00 SAST (07:00 UTC)
      const sessionOpen = new Date(date);
      sessionOpen.setHours(7, 0, 0, 0); // 09:00 SAST = 07:00 UTC
      sessionsToInsert.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        session_date: dateStr,
        opening_float: OPENING_FLOAT,
        status: 'closed',
        notes: SIM_TAG,
        created_at: sessionOpen.toISOString(),
      });

      for (let o = 0; o < dayOrders; o++) {
        const orderId = crypto.randomUUID();
        const orderRef = genRef(date, seq++);
        const payMethod = pickPayment();

        // Pick 1–4 items
        const itemCount = Math.floor(Math.random() * 4) + 1;
        const selectedItems: { item: (typeof items)[0]; qty: number }[] = [];
        const usedIds = new Set<string>();

        for (let i = 0; i < itemCount; i++) {
          const cat = weightedRandom(categories, catWeightsArr);
          const pool = byCategory[cat].filter(item => !usedIds.has(item.id));
          if (!pool.length) continue;
          const item = pool[Math.floor(Math.random() * pool.length)];
          usedIds.add(item.id);
          // 15% chance of bulk (2-3 units)
          const qty = Math.random() < 0.85 ? 1 : Math.floor(Math.random() * 2) + 2;
          selectedItems.push({ item, qty });
        }

        if (!selectedItems.length) continue;

        const total = selectedItems.reduce((s, { item, qty }) => s + item.sell_price * qty, 0);

        // Track cash for EOD
        if (payMethod === 'cash') dayCashTotal += total;

        // Set realistic time
        const hour = pickHour();
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const orderTime = new Date(date);
        orderTime.setHours(hour, minute, second, 0);

        // Adjust for timezone (SAST = UTC+2)
        const utcTime = new Date(orderTime.getTime() - 2 * 60 * 60 * 1000);

        ordersToInsert.push({
          id: orderId,
          user_id: USER_ID,
          tenant_id: TENANT_ID,
          order_ref: orderRef,
          status: 'paid',
          total: total.toFixed(2),
          currency: 'ZAR',
          payment_method: payMethod,
          channel: 'pos',
          items_count: selectedItems.length,
          notes: SIM_TAG,
          created_at: utcTime.toISOString(),
          updated_at: utcTime.toISOString(),
        });

        for (const { item, qty } of selectedItems) {
          orderItemsToInsert.push({
            id: crypto.randomUUID(),
            order_id: orderId,
            product_name: item.name,
            quantity: qty,
            unit_price: item.sell_price.toFixed(2),
            line_total: (item.sell_price * qty).toFixed(2),
            product_metadata: {
              item_id: item.id,
              category: item.category,
              weighted_avg_cost: item.weighted_avg_cost,
              sim: true,
            },
            created_at: utcTime.toISOString(),
          });

          // stock_movement for this line item
          movementsToInsert.push({
            id: crypto.randomUUID(),
            tenant_id: TENANT_ID,
            item_id: item.id,
            movement_type: 'sale_pos',
            quantity: -qty,
            unit_cost: item.weighted_avg_cost,
            notes: SIM_TAG,
            created_at: utcTime.toISOString(),
          });
        }
      }

      // eod_cash_up for this day — 20:00 SAST (18:00 UTC)
      const systemCash = OPENING_FLOAT + dayCashTotal;
      const variance = 0.95 + Math.random() * 0.10; // ±5%
      const countedCash = Math.round(systemCash * variance * 100) / 100;
      const eodTime = new Date(date);
      eodTime.setHours(18, 0, 0, 0); // 20:00 SAST = 18:00 UTC

      eodsToInsert.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        cashup_date: dateStr,
        system_cash_total: systemCash.toFixed(2),
        counted_cash: countedCash.toFixed(2),
        // DO NOT insert variance — it is GENERATED (LL-198)
        notes: SIM_TAG,
        created_at: eodTime.toISOString(),
      });
    }

    // Insert in batches
    let ordersInserted = 0, itemsInserted = 0, movementsInserted = 0;

    for (let i = 0; i < ordersToInsert.length; i += 100) {
      const batch = ordersToInsert.slice(i, i + 100);
      const { error } = await supabase.from('orders').insert(batch);
      if (error) throw new Error('orders insert: ' + error.message);
      ordersInserted += batch.length;
    }

    for (let i = 0; i < orderItemsToInsert.length; i += 200) {
      const batch = orderItemsToInsert.slice(i, i + 200);
      const { error } = await supabase.from('order_items').insert(batch);
      if (error) throw new Error('order_items insert: ' + error.message);
      itemsInserted += batch.length;
    }

    for (let i = 0; i < movementsToInsert.length; i += 200) {
      const batch = movementsToInsert.slice(i, i + 200);
      const { error } = await supabase.from('stock_movements').insert(batch);
      if (error) throw new Error('stock_movements insert: ' + error.message);
      movementsInserted += batch.length;
    }

    // pos_sessions — batch insert
    if (sessionsToInsert.length > 0) {
      const { error } = await supabase.from('pos_sessions').insert(sessionsToInsert);
      if (error) throw new Error('pos_sessions insert: ' + error.message);
    }

    // eod_cash_ups — batch insert
    if (eodsToInsert.length > 0) {
      const { error } = await supabase.from('eod_cash_ups').insert(eodsToInsert);
      if (error) throw new Error('eod_cash_ups insert: ' + error.message);
    }

    const totalRevenue = ordersToInsert.reduce((s, o) => s + parseFloat(o.total as string), 0);

    return new Response(JSON.stringify({
      success: true,
      version: '2.0',
      summary: {
        days_simulated: DAYS,
        orders_created: ordersInserted,
        line_items_created: itemsInserted,
        stock_movements_created: movementsInserted,
        pos_sessions_created: sessionsToInsert.length,
        eod_cashups_created: eodsToInsert.length,
        total_revenue_simulated: `R${Math.round(totalRevenue).toLocaleString()}`,
        tag: SIM_TAG,
        wipe_sql: [
          `DELETE FROM eod_cash_ups WHERE notes = '${SIM_TAG}' AND tenant_id = '${TENANT_ID}';`,
          `DELETE FROM pos_sessions WHERE notes = '${SIM_TAG}' AND tenant_id = '${TENANT_ID}';`,
          `DELETE FROM stock_movements WHERE notes = '${SIM_TAG}' AND tenant_id = '${TENANT_ID}';`,
          `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE notes = '${SIM_TAG}' AND tenant_id = '${TENANT_ID}');`,
          `DELETE FROM orders WHERE notes = '${SIM_TAG}' AND tenant_id = '${TENANT_ID}';`,
        ],
      }
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
