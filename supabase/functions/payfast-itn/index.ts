// supabase/functions/payfast-itn/index.ts
// Protea Botanicals — PayFast ITN (Instant Transaction Notification) v1.0
// ─────────────────────────────────────────────────────────────────────────────
// Receives server-to-server POST from PayFast when payment completes.
// 1. Parses form-urlencoded body
// 2. Validates MD5 signature (same algo as checkout)
// 3. Validates payment amount matches order
// 4. Optionally validates with PayFast's server (production)
// 5. Updates order status in DB
// 6. Awards loyalty points (1 per R100 spent)
//
// Deploy: supabase functions deploy payfast-itn --no-verify-jwt
// (--no-verify-jwt is REQUIRED — PayFast sends no auth token)
//
// Secrets needed (same as payfast-checkout):
//   PAYFAST_MERCHANT_ID, PAYFAST_PASSPHRASE, PAYFAST_SANDBOX
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "node:crypto";

// ── CORS (not really needed for server-to-server but doesn't hurt) ─────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── MD5 helper ──────────────────────────────────────────────────────────────
function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

// ── Validate PayFast signature ──────────────────────────────────────────────
function validateSignature(
  data: Record<string, string>,
  passphrase: string,
): boolean {
  const receivedSig = data.signature;
  if (!receivedSig) return false;

  // Build param string from ALL fields EXCEPT signature, in received order
  const paramString = Object.entries(data)
    .filter(([key]) => key !== "signature")
    .map(
      ([key, val]) =>
        `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, "+")}`,
    )
    .join("&");

  const toHash = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`
    : paramString;

  const expectedSig = md5(toHash);
  return expectedSig === receivedSig;
}

// ── Validate with PayFast server (production only) ──────────────────────────
async function validateWithServer(
  data: Record<string, string>,
  sandbox: boolean,
): Promise<boolean> {
  const validateUrl = sandbox
    ? "https://sandbox.payfast.co.za/eng/query/validate"
    : "https://www.payfast.co.za/eng/query/validate";

  const paramString = Object.entries(data)
    .map(
      ([key, val]) =>
        `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, "+")}`,
    )
    .join("&");

  try {
    const resp = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: paramString,
    });
    const text = await resp.text();
    return text.trim() === "VALID";
  } catch (err) {
    console.error("[payfast-itn] Server validation failed:", err);
    // If validation server is down, we still process (signature is primary check)
    return true;
  }
}

// ── Loyalty tier calculation ────────────────────────────────────────────────
function calculateTier(totalPoints: number): string {
  if (totalPoints >= 500) return "protea";
  if (totalPoints >= 200) return "bloom";
  if (totalPoints >= 50) return "sprout";
  return "seed";
}

// ── Main handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // ── Parse form-urlencoded body ─────────────────────────────────────────
    const body = await req.text();
    const params = new URLSearchParams(body);
    const data: Record<string, string> = {};
    for (const [key, val] of params.entries()) {
      data[key] = val;
    }

    console.log("[payfast-itn] Received ITN for payment:", data.m_payment_id);
    console.log("[payfast-itn] Status:", data.payment_status);
    console.log("[payfast-itn] Amount:", data.amount_gross);

    // ── Validate signature ─────────────────────────────────────────────────
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const isSandbox = Deno.env.get("PAYFAST_SANDBOX") !== "false";

    if (passphrase) {
      const sigValid = validateSignature(data, passphrase);
      if (!sigValid) {
        console.error("[payfast-itn] INVALID SIGNATURE — rejecting");
        return new Response("Invalid signature", { status: 400 });
      }
      console.log("[payfast-itn] Signature valid ✓");
    } else {
      console.warn(
        "[payfast-itn] No passphrase set — skipping signature check (sandbox mode)",
      );
    }

    // ── Validate with PayFast server (optional but recommended) ────────────
    if (!isSandbox) {
      const serverValid = await validateWithServer(data, isSandbox);
      if (!serverValid) {
        console.error("[payfast-itn] PayFast server validation FAILED");
        return new Response("Server validation failed", { status: 400 });
      }
      console.log("[payfast-itn] Server validation passed ✓");
    }

    // ── Connect to Supabase (service role — bypasses RLS) ──────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Find the order ─────────────────────────────────────────────────────
    const orderId = data.m_payment_id; // We sent order UUID as m_payment_id
    if (!orderId) {
      console.error("[payfast-itn] No m_payment_id in ITN data");
      return new Response("Missing payment ID", { status: 400 });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error("[payfast-itn] Order not found:", orderId, orderErr);
      return new Response("Order not found", { status: 404 });
    }

    // ── Validate amount matches ────────────────────────────────────────────
    const paidAmount = parseFloat(data.amount_gross || "0");
    const expectedAmount = parseFloat(order.total);

    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.error(
        `[payfast-itn] Amount mismatch! Paid: ${paidAmount}, Expected: ${expectedAmount}`,
      );
      // Still update order but flag it
      await supabase
        .from("orders")
        .update({
          status: "failed",
          notes: `Amount mismatch: paid R${paidAmount}, expected R${expectedAmount}`,
          payfast_payment_id: data.pf_payment_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      return new Response("Amount mismatch", { status: 400 });
    }

    // ── Validate merchant ID ───────────────────────────────────────────────
    const expectedMerchant = Deno.env.get("PAYFAST_MERCHANT_ID") || "10000100";
    if (data.merchant_id !== expectedMerchant) {
      console.error(
        `[payfast-itn] Merchant ID mismatch: ${data.merchant_id} vs ${expectedMerchant}`,
      );
      return new Response("Merchant ID mismatch", { status: 400 });
    }

    // ── Process payment status ─────────────────────────────────────────────
    const paymentStatus = data.payment_status;
    let orderStatus: string;

    switch (paymentStatus) {
      case "COMPLETE":
        orderStatus = "paid";
        break;
      case "FAILED":
        orderStatus = "failed";
        break;
      case "CANCELLED":
        orderStatus = "cancelled";
        break;
      default:
        // PENDING or unknown — don't update yet
        console.log(
          `[payfast-itn] Payment status: ${paymentStatus} — no update needed`,
        );
        return new Response("OK", { status: 200 });
    }

    // ── Skip if order already processed ────────────────────────────────────
    if (order.status === "paid") {
      console.log(`[payfast-itn] Order ${orderId} already paid — skipping`);
      return new Response("Already processed", { status: 200 });
    }

    // ── Update order status ────────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        payfast_payment_id: data.pf_payment_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateErr) {
      console.error("[payfast-itn] Order update error:", updateErr);
      return new Response("Order update failed", { status: 500 });
    }

    console.log(
      `[payfast-itn] Order ${order.order_ref} updated to: ${orderStatus}`,
    );

    // ── Award loyalty points (only on successful payment) ──────────────────
    if (orderStatus === "paid" && order.user_id) {
      try {
        const pointsEarned = Math.floor(paidAmount / 100); // 1 point per R100

        if (pointsEarned > 0) {
          // Insert loyalty transaction
          // NOTE: loyalty_transactions has NO id column (LL-050)
          const { error: loyaltyErr } = await supabase
            .from("loyalty_transactions")
            .insert({
              user_id: order.user_id,
              points: pointsEarned,
              transaction_type: "earned",
              description: `Purchase reward — Order ${order.order_ref}`,
              transaction_date: new Date().toISOString(),
              tenant_id: order.tenant_id,
            });

          if (loyaltyErr) {
            console.error("[payfast-itn] Loyalty insert error:", loyaltyErr);
            // Don't fail the ITN response — payment is still valid
          } else {
            // Update user's total loyalty points
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("loyalty_points")
              .eq("id", order.user_id)
              .single();

            const currentPoints = profile?.loyalty_points || 0;
            const newTotal = currentPoints + pointsEarned;
            const newTier = calculateTier(newTotal);

            const { error: profileErr } = await supabase
              .from("user_profiles")
              .update({
                loyalty_points: newTotal,
                loyalty_tier: newTier,
              })
              .eq("id", order.user_id);

            if (profileErr) {
              console.error("[payfast-itn] Profile update error:", profileErr);
            } else {
              console.log(
                `[payfast-itn] Awarded ${pointsEarned} points to user ${order.user_id}. ` +
                  `New total: ${newTotal} (${newTier})`,
              );
            }
          }
        }
      } catch (loyaltyError) {
        console.error("[payfast-itn] Loyalty processing error:", loyaltyError);
        // Don't fail ITN — payment confirmation is more important
      }
    }

    // ── Return 200 to PayFast (required) ───────────────────────────────────
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[payfast-itn] Unhandled error:", message);
    // Return 200 anyway — PayFast will retry on non-200 responses
    // We log the error and can investigate
    return new Response("Error logged", { status: 200 });
  }
});
