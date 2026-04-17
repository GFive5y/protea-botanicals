// supabase/functions/verify-qr/index.ts
// v1.1 — diagnostic logging added

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
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
    console.log("[verify-qr] Input qr_string:", trimmed);

    const dotIndex = trimmed.lastIndexOf(".");
    if (dotIndex === -1) {
      console.log("[verify-qr] Legacy code — no dot found");
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

    const product_code = trimmed.slice(0, dotIndex);
    const provided_signature = trimmed.slice(dotIndex + 1);
    console.log("[verify-qr] product_code:", product_code);
    console.log("[verify-qr] provided_signature:", provided_signature);

    const secret = Deno.env.get("QR_HMAC_SECRET");
    if (!secret) {
      console.error("[verify-qr] QR_HMAC_SECRET not set");
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
    console.log("[verify-qr] Secret loaded, length:", secret.length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SAFETY-079: products query is intentionally NOT tenant-scoped.
    // This EF is called by public QR scanners (no logged-in user, no JWT).
    // QR codes are HMAC-signed with a shared secret, so collisions are
    // cryptographically improbable. If a wrong product is returned (e.g.
    // two tenants with same qr_code string), the HMAC verification step
    // will fail because batch_id won't match, returning "invalid_signature".
    // No sensitive data is leaked — response contains only valid/invalid.
    const { data: product } = await supabase
      .from("products")
      .select("id, qr_code, batch_id")
      .eq("qr_code", trimmed)
      .maybeSingle();

    console.log(
      "[verify-qr] DB lookup by full signed string:",
      product ? `found, batch_id=${product.batch_id}` : "not found",
    );

    let resolvedBatchId: string | null = null;
    if (product) {
      resolvedBatchId = product.batch_id;
    } else {
      const { data: productByCode } = await supabase
        .from("products")
        .select("id, batch_id")
        .eq("qr_code", product_code)
        .maybeSingle();
      console.log(
        "[verify-qr] DB lookup by product_code:",
        productByCode
          ? `found, batch_id=${productByCode.batch_id}`
          : "not found",
      );
      if (productByCode) resolvedBatchId = productByCode.batch_id;
    }

    console.log("[verify-qr] resolvedBatchId:", resolvedBatchId);

    if (!resolvedBatchId) {
      console.log("[verify-qr] Product not found in DB");
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

    const message = `${product_code}.${resolvedBatchId}`;
    console.log("[verify-qr] HMAC message:", message);

    const expected_signature = await computeHMAC(message, secret);
    console.log("[verify-qr] expected_signature:", expected_signature);
    console.log("[verify-qr] provided_signature:", provided_signature);
    console.log(
      "[verify-qr] match:",
      provided_signature === expected_signature,
    );

    const isValid = constantTimeEqual(provided_signature, expected_signature);

    return new Response(
      JSON.stringify({
        valid: isValid,
        product_code,
        is_legacy: false,
        reason: isValid ? "verified" : "invalid_signature",
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[verify-qr] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", valid: false }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});

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

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++)
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
