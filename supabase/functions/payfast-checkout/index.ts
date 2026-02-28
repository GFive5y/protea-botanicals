// supabase/functions/payfast-checkout/index.ts
// Protea Botanicals — PayFast Checkout v2.0
// ─────────────────────────────────────────────────────────────────────────────
// ★ v2.0 CHANGELOG (Signature Fix — Phase 2G):
//   1. FIX: Signature generation now uses PayFast's EXACT field order
//      (merchant_id → merchant_key → return_url → cancel_url → notify_url
//       → email_address → m_payment_id → amount → item_name)
//   2. FIX: Empty fields EXCLUDED from signature string (PayFast requirement)
//   3. FIX: Passphrase handling — only appended when non-empty
//   4. ADD: Debug logging of signature string (masked) for troubleshooting
//   5. ADD: amount forced to 2 decimal places (PayFast requires "800.00" not "800")
//   6. KEEP: Order creation, order_items insert, loyalty hint, same response shape
//
// v1.0: Initial deployment — signature mismatch on sandbox (empty passphrase)
//
// Deploy: supabase functions deploy payfast-checkout --no-verify-jwt
// Secrets: PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_SANDBOX
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "node:crypto";

// ── CORS headers ────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── PayFast EXACT field order for checkout signature ─────────────────────────
// Source: https://developers.payfast.co.za/docs#step_2_signature
// This order is MANDATORY. Wrong order = signature mismatch.
const PAYFAST_FIELD_ORDER = [
  // Merchant details
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  // Buyer details
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  // Transaction details
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  // Custom fields
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  // Transaction options
  "email_confirmation",
  "confirmation_address",
  // Payment method
  "payment_method",
  // Subscription (not used but included for completeness)
  "subscription_type",
  "billing_date",
  "recurring_amount",
  "frequency",
  "cycles",
];

// ── MD5 helper ──────────────────────────────────────────────────────────────
function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

// ── Generate PayFast signature ──────────────────────────────────────────────
// Rules from PayFast docs:
//   1. Fields in EXACT order above
//   2. EXCLUDE empty/blank fields
//   3. URL-encode values, replace %20 with +
//   4. Trim all values
//   5. Append passphrase ONLY if non-empty
//   6. MD5 hash → lowercase hex
function generateSignature(
  data: Record<string, string>,
  passphrase: string,
): string {
  // Build param string in PayFast's required order, EXCLUDING empty values
  const pairs: string[] = [];

  for (const key of PAYFAST_FIELD_ORDER) {
    const val = data[key];
    if (val !== undefined && val !== null && val.toString().trim() !== "") {
      const trimmed = val.toString().trim();
      const encoded = encodeURIComponent(trimmed).replace(/%20/g, "+");
      pairs.push(`${key}=${encoded}`);
    }
  }

  let paramString = pairs.join("&");

  // Append passphrase ONLY if it's a non-empty string
  if (passphrase && passphrase.trim() !== "") {
    const encodedPassphrase = encodeURIComponent(passphrase.trim()).replace(
      /%20/g,
      "+",
    );
    paramString += `&passphrase=${encodedPassphrase}`;
  }

  console.log(
    "[payfast-checkout] Signature input (first 120 chars):",
    paramString.substring(0, 120) + "...",
  );
  console.log("[payfast-checkout] Signature input length:", paramString.length);

  const signature = md5(paramString);
  console.log("[payfast-checkout] Generated signature:", signature);

  return signature;
}

// ── Generate order reference ────────────────────────────────────────────────
function generateOrderRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PB-${timestamp}-${random}`;
}

// ── Main handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Authenticate user ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create user-scoped Supabase client for auth check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();

    if (authErr || !user) {
      console.error("[payfast-checkout] Auth error:", authErr);
      return new Response(
        JSON.stringify({ success: false, error: "Authentication failed" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[payfast-checkout] Authenticated user:", user.id);

    // ── Parse request body ─────────────────────────────────────────────────
    const body = await req.json();
    const { items, total, user_email, origin_url } = body;

    if (!items || !items.length || !total) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid cart data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[payfast-checkout] Order: ${items.length} items, R${total}`);

    // ── Get PayFast credentials from secrets ───────────────────────────────
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID") || "10000100";
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY") || "46f0cd694581a";
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const isSandbox = Deno.env.get("PAYFAST_SANDBOX") !== "false";

    const payfastUrl = isSandbox
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process";

    console.log(
      "[payfast-checkout] Mode:",
      isSandbox ? "SANDBOX" : "PRODUCTION",
    );
    console.log("[payfast-checkout] Merchant ID:", merchantId);
    console.log(
      "[payfast-checkout] Passphrase set:",
      passphrase ? "YES (" + passphrase.length + " chars)" : "NO (empty)",
    );

    // ── Create order in database ───────────────────────────────────────────
    // Use service role client to bypass RLS for order creation
    const supabase = createClient(supabaseUrl, serviceKey);

    // Generate order ID client-side (LL-048: avoid .insert().select().single())
    const orderId = crypto.randomUUID();
    const orderRef = generateOrderRef();

    // Get user's tenant_id (if any)
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    // Insert order
    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
      user_id: user.id,
      tenant_id: profile?.tenant_id || null,
      order_ref: orderRef,
      status: "pending",
      total: parseFloat(total).toFixed(2),
      currency: "ZAR",
      payment_method: "payfast",
      items_count: items.length,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (orderErr) {
      console.error("[payfast-checkout] Order insert error:", orderErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create order: " + orderErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[payfast-checkout] Order created: ${orderRef} (${orderId})`);

    // Insert order items
    const orderItems = items.map(
      (item: { name: string; quantity: number; price: number }) => ({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: parseFloat(item.price.toString()).toFixed(2),
        line_total: (item.quantity * item.price).toFixed(2),
        product_metadata: {},
        created_at: new Date().toISOString(),
      }),
    );

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      console.error("[payfast-checkout] Order items insert error:", itemsErr);
      // Don't fail — order exists, items are secondary
    }

    // ── Build PayFast form data ────────────────────────────────────────────
    // CRITICAL: Only include fields that have non-empty values
    const origin = origin_url || "http://localhost:3001";

    // Build item name (max 100 chars for PayFast)
    const itemName =
      items.length === 1
        ? items[0].name.substring(0, 100)
        : `Protea Botanicals Order (${items.length} items)`.substring(0, 100);

    // Build item description (max 255 chars)
    const itemDesc = items
      .map(
        (i: { name: string; quantity: number }) => `${i.quantity}x ${i.name}`,
      )
      .join(", ")
      .substring(0, 255);

    // CRITICAL: amount MUST be formatted as "800.00" (2 decimal places)
    const formattedAmount = parseFloat(total).toFixed(2);

    // Build form data object — ONLY non-empty fields
    const pfData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${origin}/order-success?ref=${orderRef}`,
      cancel_url: `${origin}/checkout`,
      notify_url: `${supabaseUrl}/functions/v1/payfast-itn`,
      email_address: user_email || user.email || "",
      m_payment_id: orderId,
      amount: formattedAmount,
      item_name: itemName,
      item_description: itemDesc,
    };

    // Remove any fields that ended up empty (PayFast signature MUST exclude empties)
    const cleanData: Record<string, string> = {};
    for (const [key, val] of Object.entries(pfData)) {
      if (val !== undefined && val !== null && val.trim() !== "") {
        cleanData[key] = val;
      }
    }

    // ── Generate signature ─────────────────────────────────────────────────
    const signature = generateSignature(cleanData, passphrase);

    // Add signature to form data (submitted to PayFast, but NOT part of signature calc)
    cleanData.signature = signature;

    console.log("[payfast-checkout] PayFast URL:", payfastUrl);
    console.log(
      "[payfast-checkout] Form fields:",
      Object.keys(cleanData).join(", "),
    );

    // ── Return signed form data to client ──────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        order_ref: orderRef,
        order_id: orderId,
        payfast_url: payfastUrl,
        form_data: cleanData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[payfast-checkout] Unhandled error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
