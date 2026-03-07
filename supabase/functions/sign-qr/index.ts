// supabase/functions/sign-qr/index.ts
// Protea Botanicals — HMAC QR Signing Edge Function
// v1.0 — March 2026
//
// POST /functions/v1/sign-qr
// Body: { product_id: string, product_code: string, batch_id: string }
// Returns: { signed_qr: "PB-001-2026-0001.abc123def456ghi7" }
//
// HMAC-SHA256(product_code + "." + batch_id, QR_HMAC_SECRET)
// Signature truncated to 16 chars (BASE64URL, URL-safe, no padding)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { product_id, product_code, batch_id } = await req.json();

    if (!product_code || !batch_id) {
      return new Response(
        JSON.stringify({ error: "product_code and batch_id are required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 2. Load secret ─────────────────────────────────────────
    const secret = Deno.env.get("QR_HMAC_SECRET");
    if (!secret) {
      console.error("QR_HMAC_SECRET env var not set");
      return new Response(
        JSON.stringify({ error: "Signing service unavailable" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── 3. Compute HMAC-SHA256 ─────────────────────────────────
    // Message = product_code + "." + batch_id
    const message = `${product_code}.${batch_id}`;
    const signature = await computeHMAC(message, secret);

    // ── 4. Build signed QR string ──────────────────────────────
    const signed_qr = `${product_code}.${signature}`;

    return new Response(
      JSON.stringify({
        signed_qr,
        product_id: product_id || null,
        product_code,
        batch_id,
        signature,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("sign-qr error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

// ── HMAC helper ───────────────────────────────────────────────────────────────
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

  // Convert to BASE64URL (URL-safe, no padding)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  const base64url = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Truncate to 16 chars — compact enough for QR, still cryptographically strong
  return base64url.slice(0, 16);
}
