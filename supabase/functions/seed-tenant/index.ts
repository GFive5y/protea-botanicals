// supabase/functions/seed-tenant/index.ts v1
// WP-INDUSTRY-SEEDS Phase 1 - general_retail profile only
// Idempotent: checks branding_config.seed_complete before running.
// Input: { tenant_id, industry_profile?, seed_days? }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRODUCTS = [
  { name: 'Premium E-liquid 30ml', sku: 'SEED-EL-001', category: 'finished_product', sell_price: 199, cost_price: 65, qty: 48 },
  { name: 'Premium E-liquid 60ml', sku: 'SEED-EL-002', category: 'finished_product', sell_price: 299, cost_price: 95, qty: 32 },
  { name: 'Starter Device Kit',    sku: 'SEED-DV-001', category: 'hardware',          sell_price: 449, cost_price: 180, qty: 24 },
  { name: 'Advanced Device Kit',   sku: 'SEED-DV-002', category: 'hardware',          sell_price: 749, cost_price: 290, qty: 12 },
  { name: 'Replacement Pods x3',   sku: 'SEED-AC-001', category: 'accessory',         sell_price: 89,  cost_price: 28,  qty: 80 },
  { name: 'Replacement Coils x5',  sku: 'SEED-AC-002', category: 'accessory',         sell_price: 69,  cost_price: 22,  qty: 95 },
]

const EXPENSES = [
  { category: 'opex', subcategory: 'rent',      description: 'Monthly retail unit rental',   amount_zar: 8500,  days_ago: 30 },
  { category: 'opex', subcategory: 'utilities', description: 'Electricity and internet',      amount_zar: 1200,  days_ago: 25 },
  { category: 'opex', subcategory: 'insurance', description: 'Business and stock insurance',  amount_zar: 650,   days_ago: 20 },
  { category: 'opex', subcategory: 'packaging', description: 'Packaging materials and bags',  amount_zar: 2300,  days_ago: 15 },
  { category: 'opex', subcategory: 'labour',    description: 'Staff wages',                   amount_zar: 14000, days_ago: 10 },
  { category: 'opex', subcategory: 'marketing', description: 'Social media and print',        amount_zar: 1800,  days_ago: 5  },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json().catch(() => ({}))
    const { tenant_id, industry_profile = 'general_retail', seed_days = 30 } = body

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenant_id is required' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (industry_profile !== 'general_retail') {
      return new Response(
        JSON.stringify({ success: false, error: 'seed-tenant v1 only supports general_retail' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Idempotency check
    const { data: tenantRow } = await sb.from('tenants')
      .select('name, branding_config').eq('id', tenant_id).single()
    if (!tenantRow) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant not found' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    if (tenantRow.branding_config?.seed_complete === true) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'seed_complete already true' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const tenantName = tenantRow.name || 'Demo Store'
    const now = new Date()
    const results: Record<string, number | string> = {}

    // Step 1: products
    const prodInserts = PRODUCTS.map(p => ({
      tenant_id,
      name: p.name, sku: p.sku,
      category: p.category,
      sell_price: p.sell_price,
      cost_price: p.cost_price,
      weighted_avg_cost: p.cost_price,
      quantity_on_hand: p.qty,
      is_active: true,
      tags: ['seed'],
    }))
    const { data: inserted, error: prodErr } = await sb
      .from('inventory_items').insert(prodInserts).select('id')
    if (prodErr) throw new Error('products: ' + prodErr.message)
    results.products = inserted?.length ?? 0

    // Step 2: opening stock movements
    if (inserted?.length) {
      const openDate = new Date(now.getTime() - 35 * 86400000).toISOString()
      const moves = PRODUCTS.map((p, i) => ({
        tenant_id,
        item_id: inserted[i]?.id,
        movement_type: 'purchase_in',
        quantity: p.qty,
        unit_cost: p.cost_price,
        notes: 'Opening stock - seed',
        created_at: openDate,
      })).filter(m => m.item_id)
      const { error: movErr } = await sb.from('stock_movements').insert(moves)
      if (movErr) console.error('[seed-tenant] stock_movements:', movErr.message)
      results.stock_movements = moves.length
    }

    // Step 3: expenses
    const expInserts = EXPENSES.map(e => ({
      tenant_id,
      category: e.category,
      subcategory: e.subcategory,
      description: e.description,
      amount_zar: e.amount_zar,
      expense_date: new Date(now.getTime() - e.days_ago * 86400000).toISOString().split('T')[0],
    }))
    const { error: expErr } = await sb.from('expenses').insert(expInserts)
    if (expErr) console.error('[seed-tenant] expenses:', expErr.message)
    results.expenses = expInserts.length

    // Step 4: tenant_config vat_registered
    await sb.from('tenant_config')
      .upsert({ tenant_id, vat_registered: true }, { onConflict: 'tenant_id' })

    // Step 5: opening journal entry
    const stockValue = PRODUCTS.reduce((s, p) => s + p.cost_price * p.qty, 0)
    const journalDate = new Date(now.getTime() - 35 * 86400000).toISOString().split('T')[0]
    const { data: jRow, error: jErr } = await sb.from('journal_entries').insert({
      tenant_id, journal_date: journalDate,
      reference: 'SEED-OPEN-001',
      description: 'Opening stock - seed',
      journal_type: 'opening', status: 'posted', financial_year: 'FY2026',
    }).select('id').single()
    if (!jErr && jRow) {
      await sb.from('journal_lines').insert([
        { journal_id: jRow.id, tenant_id, account_code: '12000', account_name: 'Inventories', debit_amount: stockValue, credit_amount: 0, description: 'Opening stock value', line_order: 1 },
        { journal_id: jRow.id, tenant_id, account_code: '30000', account_name: 'Owner Equity / Capital', debit_amount: 0, credit_amount: stockValue, description: 'Capital contribution', line_order: 2 },
      ])
      results.journal_entries = 1
    }

    // Step 6: sim-pos-sales for 30 days of orders
    let simSummary = null
    try {
      const simRes = await fetch(`${supabaseUrl}/functions/v1/sim-pos-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ tenant_id, days: seed_days, orders_per_day: 8 }),
      })
      const simData = await simRes.json()
      simSummary = simData?.summary ?? null
      results.orders = simSummary?.orders_created ?? 0
      results.revenue = simSummary?.total_revenue_simulated ?? 'R0'
    } catch (simErr) {
      console.error('[seed-tenant] sim error:', String(simErr))
    }

    // Step 7: mark seed complete + set trial_expires_at
    const { data: latest } = await sb.from('tenants')
      .select('branding_config').eq('id', tenant_id).single()
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
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
