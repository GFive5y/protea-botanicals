#!/usr/bin/env node
require('dotenv').config();
/**
 * seed-demo-data.js — Generate 90 days of realistic demo data for Medi Recreational.
 *
 * Usage:
 *   npm run seed          — insert demo data
 *   npm run seed:reset    — delete previous seed data, then re-insert
 */

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing REACT_APP_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Constants ───────────────────────────────────────────────────────────────
const TENANT_ID = "b1bad266-ceb4-4558-bbc3-22cfeeeafe74";
const SEED_TAG = "demo_seed_v1";
const DAYS = 90;
const RESET = process.argv.includes("--reset");

// ── Fixed demo customer UUIDs (generated once, stable across runs) ──────────
const DEMO_CUSTOMERS = Array.from({ length: 8 }, () => crypto.randomUUID());
const DEMO_NAMES = ["Thabo", "Lerato", "Sipho", "Naledi", "Kagiso", "Zanele", "Bongani", "Palesa"];

// ── Helpers ─────────────────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID();
}

function dayDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function dayISO(daysAgo, hour = 8, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isWeekend(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const day = d.getDay();
  return day === 0 || day === 6;
}

function monthIndex(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.getMonth();
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function insertBatch(table, rows) {
  if (!rows.length) {
    console.log(`  Seeding ${table}... skipped (0 rows)`);
    return 0;
  }
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  ERROR inserting into ${table}:`, error.message);
      if (error.details) console.error(`    Details:`, error.details);
      process.exit(1);
    }
    inserted += chunk.length;
  }
  console.log(`  Seeding ${table}... done (${inserted} rows)`);
  return inserted;
}

// ── Reset ───────────────────────────────────────────────────────────────────
async function resetSeedData() {
  console.log("\n=== RESET MODE: Deleting previous seed data ===\n");

  // Delete in reverse FK order
  const taggedTables = [
    { table: "price_history", col: "source" },
    { table: "loyalty_transactions", col: "description" },
    { table: "daily_summaries", col: "notes" },
    { table: "orders", col: "notes" },
    { table: "stock_movements", col: "notes" },
    { table: "eod_cash_ups", col: "notes" },
  ];

  for (const { table, col } of taggedTables) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .eq("tenant_id", TENANT_ID)
      .like(col, `%${SEED_TAG}%`);
    if (error) console.error(`  WARN: ${table} delete: ${error.message}`);
    else console.log(`  Deleted ${count ?? "?"} rows from ${table}`);
  }

  // pos_sessions — tagged via notes
  {
    const { error, count } = await supabase
      .from("pos_sessions")
      .delete({ count: "exact" })
      .eq("tenant_id", TENANT_ID)
      .like("notes", `%${SEED_TAG}%`);
    if (error) {
      // Fallback to date range
      const earliest = dayDate(DAYS + 1);
      const { error: e2, count: c2 } = await supabase
        .from("pos_sessions")
        .delete({ count: "exact" })
        .eq("tenant_id", TENANT_ID)
        .gte("session_date", earliest);
      if (e2) console.error(`  WARN: pos_sessions delete: ${e2.message}`);
      else console.log(`  Deleted ${c2 ?? "?"} rows from pos_sessions (by date range)`);
    } else {
      console.log(`  Deleted ${count ?? "?"} rows from pos_sessions`);
    }
  }

  // user_profiles — delete only seeded demo users by their known UUIDs
  {
    const { error, count } = await supabase
      .from("user_profiles")
      .delete({ count: "exact" })
      .eq("tenant_id", TENANT_ID)
      .like("full_name", `%${SEED_TAG}%`);
    if (error) console.error(`  WARN: user_profiles delete: ${error.message}`);
    else console.log(`  Deleted ${count ?? "?"} rows from user_profiles`);
  }

  console.log("  Reset complete.\n");
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== NuAi Demo Seed — ${DAYS} days · tenant ${TENANT_ID} ===\n`);

  if (RESET) await resetSeedData();

  // ── 1. Fetch real inventory items ──────────────────────────────────────
  const { data: allItems, error: itemErr } = await supabase
    .from("inventory_items")
    .select("id, name, sell_price, weighted_avg_cost, quantity_on_hand, category")
    .eq("tenant_id", TENANT_ID)
    .eq("is_active", true)
    .gt("sell_price", 0)
    .order("sell_price", { ascending: false })
    .limit(50);

  if (itemErr || !allItems?.length) {
    console.error("Failed to fetch inventory items:", itemErr?.message || "no items");
    process.exit(1);
  }

  // Pick 15 items: 3 hero SKUs + 2 dead stock + 10 regular
  const heroItems = allItems.slice(0, 3);
  const deadItems = allItems.slice(3, 5);
  const regularItems = allItems.slice(5, 15);
  const seedItems = [...heroItems, ...deadItems, ...regularItems];

  console.log(`  Fetched ${allItems.length} active items, using ${seedItems.length}:`);
  console.log(`    Heroes:  ${heroItems.map((i) => i.name.slice(0, 30)).join(", ")}`);
  console.log(`    Dead:    ${deadItems.map((i) => i.name.slice(0, 30)).join(", ")}`);
  console.log(`    Regular: ${regularItems.length} items\n`);

  // ── 2. Seed user_profiles FIRST (orders.user_id is NOT NULL) ───────────
  const userProfileRows = DEMO_CUSTOMERS.map((id, i) => ({
    id,
    tenant_id: TENANT_ID,
    full_name: `${DEMO_NAMES[i]} Demo [${SEED_TAG}]`,
    loyalty_points: randomBetween(50, 500),
    loyalty_tier: pick(["Bronze", "Silver", "Gold"]),
    last_purchase_at: dayISO(randomBetween(0, 14), 12, 0),
  }));

  {
    const { error } = await supabase.from("user_profiles").upsert(userProfileRows, { onConflict: "id" });
    if (error) {
      console.error("  ERROR: user_profiles upsert:", error.message);
      process.exit(1);
    }
    console.log(`  Seeding user_profiles... done (${userProfileRows.length} rows)`);
  }

  // ── Month multipliers for ~15% MoM growth ─────────────────────────────
  const currentMonth = monthIndex(0);
  function monthMultiplier(daysAgo) {
    const m = monthIndex(daysAgo);
    const diff = (currentMonth - m + 12) % 12;
    return Math.pow(1.15, -(diff > 3 ? 3 : diff) + 1);
  }

  // ── Accumulators ───────────────────────────────────────────────────────
  const posSessions = [];
  const eodCashUps = [];
  const stockMovements = [];
  const orderRows = [];
  const dailySummaries = [];
  const loyaltyTxns = [];
  const priceHistoryRows = [];

  const totals = { user_profiles: userProfileRows.length };
  let orderCustomerIdx = 0; // round-robin counter

  // ── Day-by-day generation ──────────────────────────────────────────────
  for (let d = DAYS; d >= 0; d--) {
    const date = dayDate(d);
    const weekend = isWeekend(d);
    const mMult = monthMultiplier(d);
    const wMult = weekend ? 1.4 : 1.0;

    // Base transactions per day: 3-6, scaled
    const baseTxns = randomBetween(3, 6);
    const txnCount = Math.max(1, Math.round(baseTxns * mMult * wMult));

    // ── pos_sessions ─────────────────────────────────────────────────
    const sessionId = uuid();
    const openingFloat = 500;

    let dayCashTotal = 0;
    let dayCardTotal = 0;
    let dayOrderCount = 0;
    let dayItemsSold = 0;
    const dayProductCounts = {}; // item_id → units sold

    for (let t = 0; t < txnCount; t++) {
      // 70% chance a hero SKU is in this order
      const orderItems = [];
      if (Math.random() < 0.7) {
        orderItems.push(pick(heroItems));
      }
      // Add 1-3 random items (skip dead stock for normal orders)
      const extraCount = randomBetween(1, 3);
      for (let e = 0; e < extraCount; e++) {
        const pool = Math.random() < 0.8 ? regularItems : heroItems;
        orderItems.push(pick(pool));
      }

      // Dead stock: only appears in orders > 50 days ago
      if (d > 50 && Math.random() < 0.05) {
        orderItems.push(pick(deadItems));
      }

      // Deduplicate
      const uniqueItems = [...new Map(orderItems.map((i) => [i.id, i])).values()];

      const payMethod = Math.random() < 0.6 ? "cash" : "card";
      const orderId = uuid();
      const orderRef = `SEED-${date.replace(/-/g, "")}-${String(t + 1).padStart(3, "0")}`;
      const hour = randomBetween(9, 17);
      const minute = randomBetween(0, 59);
      const orderTime = dayISO(d, hour, minute);

      // Round-robin assign demo customer (orders.user_id is NOT NULL)
      const customerId = DEMO_CUSTOMERS[orderCustomerIdx % DEMO_CUSTOMERS.length];
      orderCustomerIdx++;

      let orderTotal = 0;
      for (const item of uniqueItems) {
        const qty = randomBetween(1, 3);
        const price = item.sell_price || 100;
        const lineTotal = round2(qty * price);
        orderTotal += lineTotal;

        // stock_movements: quantity NEGATIVE for sales, movement_type = 'sale_out'
        stockMovements.push({
          item_id: item.id,
          tenant_id: TENANT_ID,
          movement_type: "sale_out",
          quantity: -qty,
          unit_cost: item.weighted_avg_cost || null,
          notes: `POS ${payMethod} sale [${SEED_TAG}]`,
          created_at: orderTime,
        });

        dayItemsSold += qty;
        dayProductCounts[item.id] = (dayProductCounts[item.id] || 0) + qty;
      }

      orderTotal = round2(orderTotal);

      // orders: status='paid', total (not total_amount), user_id NOT NULL
      orderRows.push({
        id: orderId,
        user_id: customerId,
        tenant_id: TENANT_ID,
        order_ref: orderRef,
        status: "paid",
        total: orderTotal,
        currency: "ZAR",
        payment_method: payMethod,
        items_count: uniqueItems.length,
        notes: `POS sale [${SEED_TAG}]`,
        created_at: orderTime,
        updated_at: orderTime,
      });

      if (payMethod === "cash") dayCashTotal += orderTotal;
      else dayCardTotal += orderTotal;
      dayOrderCount++;

      // 30% chance of loyalty earn
      if (Math.random() < 0.3) {
        const pts = Math.round(orderTotal / 10);
        loyaltyTxns.push({
          tenant_id: TENANT_ID,
          user_id: customerId,
          points: pts,
          transaction_type: "earn_purchase",
          description: `Purchase reward — ${orderRef} [${SEED_TAG}]`,
          created_at: orderTime,
        });
      }
    }

    const dayTotalSales = round2(dayCashTotal + dayCardTotal);
    posSessions.push({
      id: sessionId,
      tenant_id: TENANT_ID,
      session_date: date,
      opening_float: openingFloat,
      status: "closed",
      closed_at: dayISO(d, 18, 0),
      notes: SEED_TAG,
    });

    // eod_cash_ups: variance is GENERATED — never insert it
    // UNIQUE on (tenant_id, cashup_date)
    const expectedCash = round2(dayCashTotal + openingFloat);
    const varianceAmt = Math.random() < 0.85 ? 0 : round2((Math.random() - 0.5) * 40);
    eodCashUps.push({
      tenant_id: TENANT_ID,
      cashup_date: date,
      opening_float: openingFloat,
      counted_cash: round2(expectedCash + varianceAmt),
      system_cash_total: expectedCash,
      status: varianceAmt === 0 ? "balanced" : Math.abs(varianceAmt) > 15 ? "escalated" : "flagged",
      notes: `EOD auto [${SEED_TAG}]`,
    });

    // daily_summaries: top_products as jsonb array
    const topProducts = Object.entries(dayProductCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([itemId, units]) => {
        const item = seedItems.find((i) => i.id === itemId);
        return { item_id: itemId, name: item?.name || "Unknown", units };
      });

    dailySummaries.push({
      tenant_id: TENANT_ID,
      summary_date: date,
      total_revenue: dayTotalSales,
      total_units: dayItemsSold,
      top_products: topProducts,
      notes: SEED_TAG,
    });
  }

  // ── Price history — 3 price changes per hero over 90 days ─────────────
  for (const item of heroItems) {
    const basePrice = item.sell_price || 100;
    for (let c = 0; c < 3; c++) {
      const daysAgo = randomBetween(10, 80);
      const oldPrice = round2(basePrice * (1 - (c + 1) * 0.03));
      const newPrice = round2(basePrice * (1 - c * 0.03));
      priceHistoryRows.push({
        tenant_id: TENANT_ID,
        item_id: item.id,
        old_price: oldPrice,
        new_price: newPrice,
        changed_at: dayISO(daysAgo, 10, 0),
        source: `seed_adjustment [${SEED_TAG}]`,
      });
    }
  }

  // ── Insert in FK order ─────────────────────────────────────────────────
  // user_profiles already inserted above
  totals.pos_sessions = await insertBatch("pos_sessions", posSessions);
  totals.eod_cash_ups = await insertBatch("eod_cash_ups", eodCashUps);
  totals.stock_movements = await insertBatch("stock_movements", stockMovements);
  totals.orders = await insertBatch("orders", orderRows);

  // daily_summaries — may not exist or have different columns; don't block seed
  try {
    totals.daily_summaries = await insertBatch("daily_summaries", dailySummaries);
  } catch (err) {
    console.warn(`  WARN: daily_summaries insert failed: ${err.message}`);
    totals.daily_summaries = 0;
  }

  totals.loyalty_transactions = await insertBatch("loyalty_transactions", loyaltyTxns);
  totals.price_history = await insertBatch("price_history", priceHistoryRows);

  // ── Summary ────────────────────────────────────────────────────────────
  console.log("\n=== SEED COMPLETE ===\n");
  let grandTotal = 0;
  for (const [table, count] of Object.entries(totals)) {
    console.log(`  ${table.padEnd(25)} ${count}`);
    grandTotal += count;
  }
  console.log(`  ${"─".repeat(38)}`);
  console.log(`  ${"TOTAL".padEnd(25)} ${grandTotal}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
