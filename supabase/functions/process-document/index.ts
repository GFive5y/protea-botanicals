// supabase/functions/process-document/index.ts
// WP-I: Intelligent Document Ingestion Engine — v1.4
// FIX: Explicit deduplication rule — never create a product that already exists in existing_products.
// Deploy: npx supabase functions deploy process-document --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

// ─── System prompt for Claude ──────────────────────────────────────────────
function buildSystemPrompt(
  existingSuppliers: unknown[],
  existingProducts: unknown[],
): string {
  return `You are a document extraction engine for Protea Botanicals, a cannabis extract company in South Africa.
Your job is to extract ALL structured data from business documents and propose specific database updates.
You MUST respond with ONLY valid JSON — no markdown, no code fences, no explanation, no preamble.

DOCUMENT TYPES (detect from content):
invoice | quote | proof_of_payment | delivery_note | coa | price_list | stock_sheet | contract | unknown

EXISTING SUPPLIERS IN SYSTEM:
${JSON.stringify(existingSuppliers, null, 2)}

EXISTING PRODUCTS/SKUs IN SYSTEM (${existingProducts.length} products already in database):
${JSON.stringify(existingProducts, null, 2)}

RESPOND EXACTLY in this JSON structure (all fields required, use null where not applicable):
{
  "document_type": "invoice",
  "confidence": 0.94,
  "supplier": {
    "name": "exact supplier name from document",
    "matched_id": "uuid from existing suppliers if matched, else null",
    "confidence": 0.97
  },
  "reference": {
    "number": "INV-2026-0441",
    "date": "2026-03-01",
    "due_date": null,
    "confidence": 0.99
  },
  "currency": "USD",
  "total_amount": 950.00,
  "line_items": [],
  "proposed_updates": [],
  "unknown_items": [],
  "warnings": [],
  "extraction_notes": "brief note about document quality and extraction confidence"
}

═══════════════════════════════════════════════════════
PRODUCT MATCHING — READ THIS CAREFULLY — NON-NEGOTIABLE
═══════════════════════════════════════════════════════

For EVERY product in the document, follow this exact decision tree:

STEP 1 — Search existing_products for a name match.
  Compare the product name from the document against every entry in the
  EXISTING PRODUCTS list above. Use fuzzy/partial matching:
  "Orange Cookies" matches "Orange Cookies — Live Line", "Bubba Kush" matches
  "Bubba Kush — Pure Terpenes", etc. A product is considered MATCHED if the
  core name appears in any existing product's name field.

STEP 2 — If MATCHED:
  → Propose an update_product_price action (NOT create_supplier_product).
  → Put the matched product's id in record_id.
  → Do NOT add to unknown_items.
  → Do NOT propose create_supplier_product for this product.

STEP 3 — If NOT MATCHED (core name does not appear in existing_products at all):
  → Add to unknown_items.
  → Propose a create_supplier_product action.

RULE: A product cannot be both in unknown_items AND already in existing_products.
RULE: Never propose create_supplier_product for any product whose name already
      appears anywhere in the existing_products list.
RULE: If you are unsure whether a product matches, prefer treating it as MATCHED
      and propose a price update rather than a duplicate create.

═══════════════════════════════════════════════════════

EXTRACTION RULES:
- Confidence scores: 0.0-1.0. Be conservative — never inflate. Unknown/ambiguous = 0.5 or lower.
- proposed_updates: ONLY suggest if confidence > 0.70. Never propose destructive changes.
- For action types use: update_purchase_order | update_product_price | update_supplier_product | update_batch_coa | update_inventory_qty | create_supplier_product | update_po_payment
- COA documents: extract THC%, CBD%, CBN%, terpene_profile, lab_name, lab_test_date, batch_number → map to batches table fields
- Price lists: set line_items to [] (empty array). Put ALL product data in proposed_updates instead — one entry per product.
- Delivery notes: quantities received → proposed inventory_items quantity_on_hand updates
- Proof of payment: amount paid, date, bank ref → purchase_orders payment_date, payment_reference, po_status=paid
- Match suppliers: use name similarity (AimVape ≈ Steamups Technology AimVape)
- Currencies: detect from symbols (R/ZAR = ZAR, $ = USD, € = EUR, ¥ = CNY)
- Non-English documents: translate extracted data to English in the JSON
- If a multi-page PDF: extract from all visible pages

EXAMPLE — update_product_price (use this when product already exists):
{
  "action": "update_product_price",
  "table": "supplier_products",
  "record_id": "uuid-of-existing-product",
  "description": "Update Orange Cookies unit price to $200.00",
  "data": { "unit_price_usd": 200.00, "price_effective_date": "2026-03-01" },
  "confidence": 0.95
}

EXAMPLE — create_supplier_product (use ONLY when product does NOT exist in system):
{
  "action": "create_supplier_product",
  "table": "supplier_products",
  "record_id": null,
  "description": "Create new product: Toffee Diesel — Pure Terpenes Line",
  "data": {
    "supplier_id": "3357f93b-8dac-46fa-b591-d5cf74c6d313",
    "name": "Toffee Diesel — Pure Terpenes Line",
    "sku": "EYBNA-TOFFEE-DIESEL-PT",
    "category": "terpene",
    "unit_price_usd": 200.00,
    "currency": "USD",
    "moq": 1,
    "lead_time_days": 7,
    "is_active": true,
    "notes": "Auto-created from price catalog ingestion"
  },
  "confidence": 0.88
}`;
}

// ─── Main handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const {
      file_base64,
      mime_type,
      file_url = "",
      file_name = "document",
      file_size_kb = null,
      document_type_hint = null,
      context = {},
    } = body;

    if (!file_base64 || !mime_type) {
      return new Response(
        JSON.stringify({ error: "file_base64 and mime_type are required" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    const existingSuppliers = (context.existing_suppliers || []).map(
      (s: Record<string, unknown>) => ({
        id: s.id,
        name: s.name,
        country: s.country,
        currency: s.currency,
      }),
    );
    const existingProducts = (context.existing_products || []).map(
      (p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        unit_price_usd: p.unit_price_usd,
        supplier_id: p.supplier_id,
      }),
    );

    // Build document block for Claude
    const isPdf = mime_type === "application/pdf";
    const documentBlock = isPdf
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: file_base64,
          },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mime_type,
            data: file_base64,
          },
        };

    const userContent = [
      documentBlock,
      {
        type: "text",
        text: `Extract all data from this ${document_type_hint ? document_type_hint + " " : ""}document and return the JSON as specified.

IMPORTANT: Before proposing any create_supplier_product, check the EXISTING PRODUCTS list in your system prompt. If the product name already exists there (even partially), propose update_product_price instead. Only propose creates for genuinely new products not present in the existing list.`,
      },
    ];

    // Call Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25,output-128k-2025-02-19",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 32000,
        system: buildSystemPrompt(existingSuppliers, existingProducts),
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Anthropic API error ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const rawText: string = claudeData.content?.[0]?.text || "";

    // Parse JSON from Claude
    let extraction: Record<string, unknown>;
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      extraction = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `Claude returned non-JSON response: ${rawText.substring(0, 300)}`,
      );
    }

    // Write to document_log
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: logEntry, error: logErr } = await db
      .from("document_log")
      .insert({
        document_type: String(extraction.document_type || "unknown"),
        file_url: file_url,
        file_name: file_name,
        file_size_kb: file_size_kb,
        supplier_name:
          ((extraction.supplier as Record<string, unknown>)?.name as
            | string
            | null) ?? null,
        supplier_id:
          ((extraction.supplier as Record<string, unknown>)?.matched_id as
            | string
            | null) ?? null,
        extracted_data: extraction,
        confidence_score:
          typeof extraction.confidence === "number"
            ? extraction.confidence
            : null,
        status: "pending_review",
      })
      .select()
      .single();

    if (logErr) {
      throw new Error(`Failed to log to document_log: ${logErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_log_id: logEntry.id,
        extraction,
      }),
      { headers: JSON_HEADERS },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[process-document] Error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
