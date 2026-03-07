// supabase/functions/verify-qr/index.ts
// Protea Botanicals — HMAC QR Verification Edge Function
// v1.0 — March 2026
//
// POST /functions/v1/verify-qr
// Body: { qr_string: string, batch_id?: string }
// Returns: { valid: boolean, product_code: string, is_legacy: boolean, reason?: string }
//
// Logic:
//   - No dot in qr_string → legacy unsigned code → { valid: true, is_legacy: true }
//   - Has dot → split into product_code + signature → verify HMAC
//   - Verification uses constant-time comparison to prevent timing attacks

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // ── 1. Parse body ──────────────────────────────────────────
    const { qr_string } = await req.json();

    if (!qr_string || typeof qr_string !== "string") {
      return new Response(
        JSON.stringify({ error: "qr_string is required", valid: false }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const trimmed = qr_string.trim();

    // ── 2. Legacy detection ────────────────────────────────────
    // A dot separates product_code from HMAC signature.
    // Legacy codes (pre-HMAC) contain no dot → valid but flagged as legacy.
    // NOTE: Some product codes may naturally contain hyphens but NOT dots,
    // e.g. "PB-001-2026-0001" — safe to use dot as separator.
    const dotIndex = trimmed.lastIndexOf(".");

    if (dotIndex === -1) {
      // Legacy code — no signature present
      return new Response(
        JSON.stringify({
          valid: true,
          product_code: trimmed,
          is_legacy: true,
          reason: "legacy_unsigned",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 3. Split product_code and signature ────────────────────
    const product_code = trimmed.slice(0, dotIndex);
    const provided_signature = trimmed.slice(dotIndex + 1);

    if (!product_code || !provided_signature) {
      return new Response(
        JSON.stringify({
          valid: false,
          product_code: "",
          is_legacy: false,
          reason: "malformed_qr",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 4. Load secret ─────────────────────────────────────────
    const secret = Deno.env.get("QR_HMAC_SECRET");
    if (!secret) {
      console.error("QR_HMAC_SECRET env var not set");
      return new Response(
        JSON.stringify({
          error: "Verification service unavailable",
          valid: false,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 5. Look up batch_id from DB for this product_code ──────
    // We need batch_id to recompute the HMAC.
    // The signed message was: product_code + "." + batch_id
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: product, error: dbErr } = await supabase
      .from("products")
      .select("id, qr_code, batch_id, batches(batch_number)")
      .eq("qr_code", trimmed) // stored as the full signed string
      .maybeSingle();

    // Fallback: also try matching on product_code alone (legacy or pre-update rows)
    let resolvedBatchId: string | null = null;

    if (product) {
      resolvedBatchId = product.batch_id;
    } else {
      // Try by product_code (without signature suffix)
      const { data: productByCode } = await supabase
        .from("products")
        .select("id, batch_id")
        .eq("qr_code", product_code)
        .maybeSingle();

      if (productByCode) {
        resolvedBatchId = productByCode.batch_id;
      }
    }

    if (!resolvedBatchId) {
      // Product not found in DB at all — counterfeit
      return new Response(
        JSON.stringify({
          valid: false,
          product_code,
          is_legacy: false,
          reason: "product_not_found",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 6. Recompute expected HMAC ─────────────────────────────
    const message = `${product_code}.${resolvedBatchId}`;
    const expected_signature = await computeHMAC(message, secret);

    // ── 7. Constant-time comparison ────────────────────────────
    const isValid = constantTimeEqual(provided_signature, expected_signature);

    if (!isValid) {
      return new Response(
        JSON.stringify({
          valid: false,
          product_code,
          is_legacy: false,
          reason: "invalid_signature",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        product_code,
        is_legacy: false,
        reason: "verified",
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("verify-qr error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", valid: false }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});

// ── HMAC helper (identical to sign-qr) ───────────────────────────────────────
async function computeHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    encoder.encode(message),
  );

  const base64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  const base64url = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return base64url.slice(0, 16);
}

// ── Constant-time string comparison (prevents timing attacks) ─────────────────
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
