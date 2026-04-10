// supabase/functions/seed-tenant/index.ts v2
// WP-INDUSTRY-SEEDS Phase 1+3
// Supports: general_retail (v1) + food_beverage (v2)
// Idempotent: checks branding_config.seed_complete before running.
// Input: { tenant_id, industry_profile?, seed_days? }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── General Retail seed data ──────────────────────────────────────────────────
const GR_PRODUCTS = [
  { name: 'Premium E-liquid 30ml', sku: 'SEED-EL-001', category: 'finished_product', sell_price: 199, cost_price: 65,  qty: 48 },
  { name: 'Premium E-liquid 60ml', sku: 'SEED-EL-002', category: 'finished_product', sell_price: 299, cost_price: 95,  qty: 32 },
  { name: 'Starter Device Kit',    sku: 'SEED-DV-001', category: 'hardware',          sell_price: 449, cost_price: 180, qty: 24 },
  { name: 'Advanced Device Kit',   sku: 'SEED-DV-002', category: 'hardware',          sell_price: 749, cost_price: 290, qty: 12 },
  { name: 'Replacement Pods x3',   sku: 'SEED-AC-001', category: 'accessory',         sell_price: 89,  cost_price: 28,  qty: 80 },
  { name: 'Replacement Coils x5',  sku: 'SEED-AC-002', category: 'accessory',         sell_price: 69,  cost_price: 22,  qty: 95 },
]

const GR_EXPENSES = [
  { subcategory: 'rent',      description: 'Monthly retail unit rental',   amount_zar: 8500,  days_ago: 30 },
  { subcategory: 'utilities', description: 'Electricity and internet',      amount_zar: 1200,  days_ago: 25 },
  { subcategory: 'insurance', description: 'Business and stock insurance',  amount_zar: 650,   days_ago: 20 },
  { subcategory: 'packaging', description: 'Packaging materials and bags',  amount_zar: 2300,  days_ago: 15 },
  { subcategory: 'labour',    description: 'Staff wages',                   amount_zar: 14000, days_ago: 10 },
  { subcategory: 'marketing', description: 'Social media and print',        amount_zar: 1800,  days_ago: 5  },
]

// ── Food & Beverage seed data (Nourish Kitchen profile) ───────────────────────
const FB_PRODUCTS = [
  { name: 'Signature Chicken Wrap',      sku: 'NK-FP-001', category: 'finished_product', sell_price: 89,  cost_price: 28,  qty: 0  },
  { name: 'Pulled Pork Slider Board',    sku: 'NK-FP-002', category: 'finished_product', sell_price: 145, cost_price: 48,  qty: 0  },
  { name: 'Seasonal Grain Bowl',         sku: 'NK-FP-003', category: 'finished_product', sell_price: 95,  cost_price: 30,  qty: 0  },
  { name: 'House Lemon Tart',            sku: 'NK-FP-004', category: 'finished_product', sell_price: 55,  cost_price: 12,  qty: 0  },
  { name: 'Cold Brew Coffee 500ml',      sku: 'NK-FP-005', category: 'finished_product', sell_price: 45,  cost_price: 8,   qty: 12 },
  { name: 'Sourdough Loaf',             sku: 'NK-FP-006', category: 'finished_product', sell_price: 65,  cost_price: 18,  qty: 8  },
  { name: 'Free-Range Chicken 1kg',      sku: 'NK-RM-001', category: 'raw_material',     sell_price: 0,   cost_price: 89,  qty: 15 },
  { name: 'Organic Oat Flour 5kg',       sku: 'NK-RM-002', category: 'raw_material',     sell_price: 0,   cost_price: 145, qty: 8  },
  { name: 'Extra Virgin Olive Oil 5L',   sku: 'NK-RM-003', category: 'raw_material',     sell_price: 0,   cost_price: 320, qty: 4  },
  { name: 'Unsalted Butter 2kg',         sku: 'NK-RM-004', category: 'raw_material',     sell_price: 0,   cost_price: 95,  qty: 6  },
]

const FB_EXPENSES = [
  { subcategory: 'rent',        description: 'Restaurant and kitchen rental',       amount_zar: 22000, days_ago: 30 },
  { subcategory: 'utilities',   description: 'Gas, electricity and water',          amount_zar: 3800,  days_ago: 25 },
  { subcategory: 'labour',      description: 'Kitchen and front-of-house wages',    amount_zar: 38000, days_ago: 22 },
  { subcategory: 'ingredients', description: 'Weekly produce order',                amount_zar: 9200,  days_ago: 15 },
  { subcategory: 'packaging',   description: 'Takeaway packaging and containers',   amount_zar: 1800,  days_ago: 10 },
  { subcategory: 'insurance',   description: 'Business, public liability, stock',   amount_zar: 1200,  days_ago: 5  },
]

const FB_HACCP = [
  {
    step_name: 'Receiving Temperature Check',
    step_number: 1,
    process_stage: 'Receiving',
    hazard_type: 'biological',
    hazard_description: 'Pathogen growth if perishables received above safe temperature',
    critical_limit: 'Cold items ≤ 4°C. Hot items ≥ 60°C. Reject if non-compliant.',
    monitoring_procedure: 'Check temperature of each delivery with calibrated probe thermometer',
    monitoring_frequency: 'Every delivery',
    corrective_action: 'Reject non-compliant deliveries. Record rejection and notify supplier.',
    responsible_person: 'Receiving Manager',
  },
  {
    step_name: 'Cold Storage Monitoring',
    step_number: 2,
    process_stage: 'Storage',
    hazard_type: 'biological',
    hazard_description: 'Pathogen multiplication if cold storage temperature rises above limit',
    critical_limit: 'Fridge ≤ 4°C. Freezer ≤ -18°C.',
    monitoring_procedure: 'Check and log refrigeration unit temperatures',
    monitoring_frequency: 'Three times daily (6am, 12pm, 6pm)',
    corrective_action: 'Move product if temp exceeds limit. Call refrigeration technician.',
    responsible_person: 'Kitchen Supervisor',
  },
  {
    step_name: 'Hot Holding Temperature',
    step_number: 3,
    process_stage: 'Service',
    hazard_type: 'biological',
    hazard_description: 'Pathogen survival and growth if food held below safe serving temperature',
    critical_limit: 'Hot food ≥ 60°C throughout service.',
    monitoring_procedure: 'Probe hot-held food with calibrated thermometer before service',
    monitoring_frequency: 'Every 2 hours during service',
    corrective_action: 'Reheat to ≥ 75°C or discard if below 60°C for more than 2 hours.',
    responsible_person: 'Head Chef',
  },
  {
    step_name: 'Cross-Contamination Prevention',
    step_number: 4,
    process_stage: 'Preparation',
    hazard_type: 'biological',
    hazard_description: 'Cross-contamination of allergens and pathogens between raw and ready-to-eat food',
    critical_limit: 'Colour-coded boards and utensils used correctly. No contact between raw and RTE food.',
    monitoring_procedure: 'Visual inspection of workstation setup and board usage',
    monitoring_frequency: 'Start of each preparation session',
    corrective_action: 'Halt preparation, sanitise workstation, re-brief staff on procedures.',
    responsible_person: 'Kitchen Supervisor',
  },
  {
    step_name: 'Final Product Temperature Check',
    step_number: 5,
    process_stage: 'Production',
    hazard_type: 'biological',
    hazard_description: 'Undercooked product reaching consumer — pathogen survival',
    critical_limit: 'Chicken ≥ 75°C at thickest point. All hot dishes ≥ 75°C before plating.',
    monitoring_procedure: 'Probe finished dish before plating or packaging',
    monitoring_frequency: 'Every batch / every order for high-risk items',
    corrective_action: 'Return to heat. Do not serve. Re-cook to correct temperature.',
    responsible_person: 'Head Chef',
  },
]

const FB_RECIPES = [
  {
    name: 'Signature Chicken Wrap',
    category: 'Main',
    description: 'Free-range chicken with house sauce, lettuce, tomato and pickles in a toasted wrap.',
    yield_quantity: 1, yield_unit: 'portions',
    prep_time_min: 10, production_time_min: 15,
    shelf_life_days: 1,
    storage_instructions: 'Prepare to order. Do not pre-wrap. Hold components separately at ≤4°C.',
    temperature_zone: 'chilled',
    allergen_flags: { gluten: true, dairy: false, eggs: false, nuts: false, soy: false },
    cost_per_unit: 28,
    haccp_notes: 'Chicken must reach 75°C internal temperature. Use blue board for raw chicken preparation.',
  },
  {
    name: 'House Lemon Tart',
    category: 'Dessert',
    description: 'Buttery shortcrust base with silky lemon curd filling, dusted with icing sugar.',
    yield_quantity: 10, yield_unit: 'slices',
    prep_time_min: 30, production_time_min: 45,
    shelf_life_days: 3,
    storage_instructions: 'Refrigerate at ≤4°C. Remove from fridge 10 min before serving.',
    temperature_zone: 'chilled',
    allergen_flags: { gluten: true, dairy: true, eggs: true, nuts: false, soy: false },
    cost_per_unit: 12,
    haccp_notes: 'Contains eggs and dairy. Store at ≤4°C. Label with allergen information.',
  },
  {
    name: 'Cold Brew Coffee',
    category: 'Beverage',
    description: 'Coarse-ground single origin, cold brewed 20 hours. Served over ice.',
    yield_quantity: 8, yield_unit: 'portions',
    prep_time_min: 10, production_time_min: 1200,
    shelf_life_days: 7,
    storage_instructions: 'Sealed container in fridge ≤4°C. Label with brew date.',
    temperature_zone: 'chilled',
    allergen_flags: { gluten: false, dairy: false, eggs: false, nuts: false, soy: false },
    cost_per_unit: 8,
    haccp_notes: 'No heat step. Cold brew is microbiologically safe if water quality is controlled.',
  },
]

// ── Shared helper: seed products and return inserted IDs ─────────────────────
async function seedProducts(sb: ReturnType<typeof createClient>, tenant_id: string, products: typeof GR_PRODUCTS) {
  const inserts = products
    .filter(p => p.sell_price > 0 || p.category === 'raw_material')
    .map(p => ({
      tenant_id, name: p.name, sku: p.sku,
      category: p.category,
      sell_price: p.sell_price,
      cost_price: p.cost_price,
      weighted_avg_cost: p.cost_price,
      quantity_on_hand: p.qty,
      is_active: true,
      tags: ['seed'],
    }))
  const { data, error } = await sb.from('inventory_items').insert(inserts).select('id')
  if (error) throw new Error('products: ' + error.message)
  return data ?? []
}

async function seedStockMoves(sb: ReturnType<typeof createClient>, tenant_id: string, products: typeof GR_PRODUCTS, insertedIds: { id: string }[], openDate: string) {
  const moves = products.map((p, i) => ({
    tenant_id, item_id: insertedIds[i]?.id,
    movement_type: 'purchase_in',
    quantity: p.qty,
    unit_cost: p.cost_price,
    notes: 'Opening stock - seed',
    created_at: openDate,
  })).filter(m => m.item_id && m.quantity > 0)
  if (moves.length) await sb.from('stock_movements').insert(moves)
  return moves.length
}

async function seedExpenses(sb: ReturnType<typeof createClient>, tenant_id: string, expenses: typeof GR_EXPENSES, now: Date) {
  const rows = expenses.map(e => ({
    tenant_id, category: 'opex', subcategory: e.subcategory,
    description: e.description, amount_zar: e.amount_zar,
    expense_date: new Date(now.getTime() - e.days_ago * 86400000).toISOString().split('T')[0],
  }))
  const { error } = await sb.from('expenses').insert(rows)
  if (error) console.error('[seed-tenant] expenses:', error.message)
  return rows.length
}

async function seedJournal(sb: ReturnType<typeof createClient>, tenant_id: string, products: { cost_price: number; qty: number }[], now: Date) {
  const stockValue = products.reduce((s, p) => s + p.cost_price * p.qty, 0)
  const journalDate = new Date(now.getTime() - 35 * 86400000).toISOString().split('T')[0]
  const { data: jRow, error } = await sb.from('journal_entries').insert({
    tenant_id, journal_date: journalDate,
    reference: 'SEED-OPEN-001', description: 'Opening stock - seed',
    journal_type: 'opening', status: 'posted', financial_year: 'FY2026',
  }).select('id').single()
  if (!error && jRow) {
    await sb.from('journal_lines').insert([
      { journal_id: jRow.id, tenant_id, account_code: '12000', account_name: 'Inventories', debit_amount: stockValue, credit_amount: 0, description: 'Opening stock value', line_order: 1 },
      { journal_id: jRow.id, tenant_id, account_code: '30000', account_name: 'Owner Equity / Capital', debit_amount: 0, credit_amount: stockValue, description: 'Capital contribution', line_order: 2 },
    ])
    return 1
  }
  return 0
}

async function callSim(supabaseUrl: string, serviceKey: string, tenant_id: string, seed_days: number) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/sim-pos-sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ tenant_id, days: seed_days, orders_per_day: 8 }),
    })
    const data = await res.json()
    return data?.summary ?? null
  } catch (e) {
    console.error('[seed-tenant] sim error:', String(e))
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json().catch(() => ({}))
    const { tenant_id, industry_profile = 'general_retail', seed_days = 30 } = body

    if (!tenant_id) return new Response(JSON.stringify({ success: false, error: 'tenant_id is required' }), { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400 })

    const supported = ['general_retail', 'food_beverage']
    if (!supported.includes(industry_profile)) {
      return new Response(JSON.stringify({ success: false, error: `seed-tenant v2 supports: ${supported.join(', ')}` }), { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: tenantRow } = await sb.from('tenants').select('name, branding_config').eq('id', tenant_id).single()
    if (!tenantRow) return new Response(JSON.stringify({ success: false, error: 'Tenant not found' }), { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 404 })
    if (tenantRow.branding_config?.seed_complete === true) return new Response(JSON.stringify({ success: true, skipped: true, reason: 'seed_complete already true' }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

    const tenantName = tenantRow.name || 'Demo Store'
    const now = new Date()
    const openDate = new Date(now.getTime() - 35 * 86400000).toISOString()
    const results: Record<string, number | string> = {}
    let simSummary = null

    if (industry_profile === 'general_retail') {
      const inserted = await seedProducts(sb, tenant_id, GR_PRODUCTS)
      results.products = inserted.length
      results.stock_movements = await seedStockMoves(sb, tenant_id, GR_PRODUCTS, inserted, openDate)
      results.expenses = await seedExpenses(sb, tenant_id, GR_EXPENSES, now)
      await sb.from('tenant_config').upsert({ tenant_id, vat_registered: true }, { onConflict: 'tenant_id' })
      results.journal_entries = await seedJournal(sb, tenant_id, GR_PRODUCTS, now)
      // LL-223: EF-to-EF callSim removed — trigger sim-pos-sales externally after seed.
      results.orders_note = 'Call sim-pos-sales separately with this tenant_id'
    }

    if (industry_profile === 'food_beverage') {
      // Step 1: products (finished_product + raw_material — valid enum values per LL-215)
      const inserted = await seedProducts(sb, tenant_id, FB_PRODUCTS)
      results.products = inserted.length
      results.stock_movements = await seedStockMoves(sb, tenant_id, FB_PRODUCTS, inserted, openDate)

      // Step 2: expenses
      results.expenses = await seedExpenses(sb, tenant_id, FB_EXPENSES, now)

      // Step 3: tenant_config
      await sb.from('tenant_config').upsert({ tenant_id, vat_registered: true }, { onConflict: 'tenant_id' })

      // Step 4: journal
      results.journal_entries = await seedJournal(sb, tenant_id, FB_PRODUCTS, now)

      // Step 5: HACCP control points
      const haccpRows = FB_HACCP.map(h => ({ tenant_id, ...h }))
      const { error: haccpErr } = await sb.from('haccp_control_points').insert(haccpRows)
      if (haccpErr) console.error('[seed-tenant] haccp:', haccpErr.message)
      results.haccp_control_points = haccpRows.length

      // Step 6: food recipes
      const recipeRows = FB_RECIPES.map(r => ({ tenant_id, ...r }))
      const { error: recipeErr } = await sb.from('food_recipes').insert(recipeRows)
      if (recipeErr) console.error('[seed-tenant] recipes:', recipeErr.message)
      results.food_recipes = recipeRows.length

      // Step 7: temperature logs — 14 days × 3 readings/day (cold storage monitoring)
      const tempLogs: Record<string, unknown>[] = []
      for (let d = 14; d >= 1; d--) {
        const date = new Date(now.getTime() - d * 86400000)
        for (const [hour, label] of [[6, 'Cold Room A'], [12, 'Cold Room A'], [18, 'Cold Room A']] as [number, string][]) {
          date.setHours(hour, 0, 0, 0)
          const temp = parseFloat((2.5 + Math.random() * 1.5).toFixed(1)) // 2.5–4.0°C (within limit)
          tempLogs.push({
            tenant_id, location: label, location_type: 'refrigerated',
            temperature_c: temp, recorded_at: date.toISOString(),
            min_limit_c: 0, max_limit_c: 4, is_breach: false,
          })
        }
      }
      const { error: tempErr } = await sb.from('temperature_logs').insert(tempLogs)
      if (tempErr) console.error('[seed-tenant] temperature_logs:', tempErr.message)
      results.temperature_logs = tempLogs.length

      // Step 8: sim-pos-sales (only finished products have sell_price > 0)
      // LL-223: EF-to-EF callSim removed — trigger sim-pos-sales externally after seed.
      results.orders_note = 'Call sim-pos-sales separately with this tenant_id'
    }

    // Mark seed complete
    const { data: latest } = await sb.from('tenants').select('branding_config').eq('id', tenant_id).single()
    await sb.from('tenants').update({
      branding_config: {
        ...(latest?.branding_config || {}),
        seed_complete: true,
        seed_completed_at: now.toISOString(),
        seed_profile: industry_profile,
      },
      trial_expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
    }).eq('id', tenant_id)
    results.seed_complete = 1

    return new Response(
      JSON.stringify({ success: true, tenant_id, tenant_name: tenantName, industry_profile, results, sim_summary: simSummary }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 500 })
  }
})
