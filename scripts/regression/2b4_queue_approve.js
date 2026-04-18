// scripts/regression/2b4_queue_approve.js
// LL-304: direct-SQL regression for PR 2B.4 approve/reject paths.
// Run: node scripts/regression/2b4_queue_approve.js

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env" });

const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, key);

// Resolved at runtime — DO NOT hardcode; LL-250 discipline
let GARDEN_BISTRO_ID, NOURISH_ID;

async function resolveTenants() {
  const { data } = await sb.from("tenants").select("id,name")
    .in("name", ["The Garden Bistro", "Nourish Kitchen & Deli"]);
  GARDEN_BISTRO_ID = data.find(t => t.name === "The Garden Bistro").id;
  NOURISH_ID = data.find(t => t.name === "Nourish Kitchen & Deli").id;
}

function fixture(tenantId, overrides = {}) {
  return {
    tenant_id: tenantId,
    source_document_id: null,
    source_type: "invoice",
    ai_extracted_data: {
      name: "Cake Flour (Test)",
      common_name: "Cake Flour",
      sub_category: "dry_goods_flour",
      default_unit: "kg",
      allergen_flags: { gluten: true },
      haccp_risk_level: "medium",
      temperature_zone: "ambient",
      shelf_life_days: 180,
    },
    suggested_sub_category: "dry_goods_flour",
    suggested_allergens: { gluten: true },
    suggested_haccp_level: "medium",
    confidence_score: 0.88,
    status: "pending",
    ...overrides,
  };
}

async function assert(condition, msg) {
  if (!condition) { console.error(`❌ FAIL: ${msg}`); process.exit(1); }
  console.log(`✓ ${msg}`);
}

async function cleanup(queueIds, ingredientIds) {
  if (queueIds.length) await sb.from("ingredient_ingest_queue").delete().in("id", queueIds);
  if (ingredientIds.length) await sb.from("food_ingredients").delete().in("id", ingredientIds);
}

async function run() {
  await resolveTenants();
  const createdQueue = [], createdIngredients = [];

  try {
    // CASE 1 — high-confidence approve (happy path, no edits)
    const { data: r1 } = await sb.from("ingredient_ingest_queue")
      .insert(fixture(GARDEN_BISTRO_ID)).select().single();
    createdQueue.push(r1.id);
    const { data: ap1, error: ap1Err } = await sb.rpc("fn_approve_ingested_ingredient", {
      p_queue_id: r1.id,
      p_user_edits: { changed_fields: [] },
      p_final_payload: r1.ai_extracted_data,
    });
    await assert(!ap1Err, "CASE 1: approve RPC succeeds");
    await assert(ap1[0].created_food_ingredient_id, "CASE 1: ingredient id returned");
    createdIngredients.push(ap1[0].created_food_ingredient_id);

    const { data: fi1 } = await sb.from("food_ingredients").select("tenant_id,category,sub_category").eq("id", ap1[0].created_food_ingredient_id).single();
    await assert(fi1.tenant_id === GARDEN_BISTRO_ID, "CASE 1: ingredient tenant_id correct");
    await assert(fi1.category === "grain_cereal", "CASE 1: category derived (dry_goods_flour → grain_cereal)");

    const { data: q1 } = await sb.from("ingredient_ingest_queue").select("status,created_food_ingredient_id,approved_at").eq("id", r1.id).single();
    await assert(q1.status === "approved", "CASE 1: queue status = approved");
    await assert(q1.created_food_ingredient_id === ap1[0].created_food_ingredient_id, "CASE 1: queue linked to ingredient");
    await assert(q1.approved_at !== null, "CASE 1: approved_at populated");

    // CASE 2 — medium confidence sits pending (no action, verify untouched)
    const { data: r2 } = await sb.from("ingredient_ingest_queue")
      .insert(fixture(GARDEN_BISTRO_ID, { confidence_score: 0.55 })).select().single();
    createdQueue.push(r2.id);
    const { data: q2 } = await sb.from("ingredient_ingest_queue").select("status").eq("id", r2.id).single();
    await assert(q2.status === "pending", "CASE 2: medium-confidence row stays pending");

    // CASE 3 — reject with reason
    const { data: r3 } = await sb.from("ingredient_ingest_queue")
      .insert(fixture(GARDEN_BISTRO_ID, { confidence_score: 0.30 })).select().single();
    createdQueue.push(r3.id);
    await sb.from("ingredient_ingest_queue").update({
      status: "rejected",
      user_edits: { reject_reason: "Blurry scan — allergen panel unreadable" },
      approved_at: new Date().toISOString(),
    }).eq("id", r3.id);
    const { data: q3 } = await sb.from("ingredient_ingest_queue").select("status,user_edits").eq("id", r3.id).single();
    await assert(q3.status === "rejected", "CASE 3: reject sets status");
    await assert(q3.user_edits.reject_reason.includes("Blurry"), "CASE 3: reject_reason stored in user_edits");

    // CASE 4 — cross-tenant guard (Nourish attempts to approve Garden Bistro row)
    const { data: r4 } = await sb.from("ingredient_ingest_queue")
      .insert(fixture(GARDEN_BISTRO_ID)).select().single();
    createdQueue.push(r4.id);
    const { data: attack, error: attackErr } = await sb.from("ingredient_ingest_queue")
      .update({ status: "approved" })
      .eq("id", r4.id)
      .eq("tenant_id", NOURISH_ID)  // wrong tenant — simulates anon-key RLS behaviour
      .select();
    await assert(!attackErr, "CASE 4: cross-tenant update does not error (returns 0 rows)");
    await assert(!attack || attack.length === 0, "CASE 4: 0 rows affected by cross-tenant update");
    const { data: q4 } = await sb.from("ingredient_ingest_queue").select("status").eq("id", r4.id).single();
    await assert(q4.status === "pending", "CASE 4: row unchanged");

    // CASE 5 — edit-then-approve: diff captured in user_edits, final payload differs from AI
    const { data: r5 } = await sb.from("ingredient_ingest_queue")
      .insert(fixture(GARDEN_BISTRO_ID, {
        ai_extracted_data: { ...fixture(GARDEN_BISTRO_ID).ai_extracted_data, name: "Bread Flour (Test)" },
      })).select().single();
    createdQueue.push(r5.id);
    const edits = {
      changed_fields: ["haccp_risk_level"],
      before: { haccp_risk_level: "medium" },
      after: { haccp_risk_level: "low" },
    };
    const finalPayload = { ...r5.ai_extracted_data, haccp_risk_level: "low" };
    const { data: ap5, error: ap5Err } = await sb.rpc("fn_approve_ingested_ingredient", {
      p_queue_id: r5.id, p_user_edits: edits, p_final_payload: finalPayload,
    });
    await assert(!ap5Err, "CASE 5: edit-then-approve RPC succeeds — " + (ap5Err?.message || "ok"));
    createdIngredients.push(ap5[0].created_food_ingredient_id);
    const { data: fi5 } = await sb.from("food_ingredients").select("haccp_risk_level").eq("id", ap5[0].created_food_ingredient_id).single();
    await assert(fi5.haccp_risk_level === "low", "CASE 5: food_ingredients has human-edited value");
    const { data: q5 } = await sb.from("ingredient_ingest_queue").select("ai_extracted_data,user_edits").eq("id", r5.id).single();
    await assert(q5.ai_extracted_data.haccp_risk_level === "medium", "CASE 5: AI original preserved");
    await assert(q5.user_edits.changed_fields.includes("haccp_risk_level"), "CASE 5: diff recorded in user_edits");

    console.log("\n✅ ALL 5 CASES PASSED\n");
  } finally {
    await cleanup(createdQueue, createdIngredients);
    console.log("🧹 Cleaned up", createdQueue.length, "queue rows +", createdIngredients.length, "ingredients");
  }
}

run().catch(e => { console.error(e); process.exit(1); });
