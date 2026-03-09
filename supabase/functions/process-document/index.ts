// supabase/functions/process-document/index.ts
// WP-I: Intelligent Document Ingestion Engine — v1.0
// Receives base64 document, sends to Claude Vision (claude-sonnet-4-20250514)
// Returns structured extraction + proposed DB updates
// Logs to document_log with status: pending_review
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

EXISTING PRODUCTS/SKUs IN SYSTEM:
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
  "line_items": [
    {
      "description": "510 Cartridge 1ml",
      "sku": "AIM-510-1ML or null",
      "matched_product_id": "uuid from existing products if matched, else null",
      "quantity": 1000,
      "unit_price": 0.95,
      "line_total": 950.00,
      "unit": "pcs",
      "confidence": 0.96
    }
  ],
  "proposed_updates": [
    {
      "action": "update_purchase_order",
      "table": "purchase_orders",
      "record_id": "uuid of matched PO or null",
      "description": "Human readable: Link invoice INV-2026-0441 to PO and mark as ordered",
      "data": { "supplier_invoice_ref": "INV-2026-0441", "po_status": "ordered" },
      "confidence": 0.93
    },
    {
      "action": "update_product_price",
      "table": "supplier_products",
      "record_id": "uuid of matched product or null",
      "description": "Update 510 Cartridge 1ml unit price to $0.95",
      "data": { "unit_price_usd": 0.95, "price_effective_date": "2026-03-01" },
      "confidence": 0.96
    }
  ],
  "unknown_items": ["item descriptions that could not be matched to any existing product"],
  "warnings": ["any data quality issues, ambiguities, or concerns"],
  "extraction_notes": "brief note about document quality and extraction confidence"
}

EXTRACTION RULES:
- Confidence scores: 0.0-1.0. Be conservative — never inflate. Unknown/ambiguous = 0.5 or lower.
- proposed_updates: ONLY suggest if confidence > 0.70. Never propose destructive changes.
- For action types use: update_purchase_order | update_supplier_product | update_batch_coa | update_inventory_qty | create_supplier_product | update_po_payment
- COA documents: extract THC%, CBD%, CBN%, terpene_profile, lab_name, lab_test_date, batch_number → map to batches table fields
- Price lists: each line is a line_item. Bulk propose supplier_products price updates.
- Delivery notes: quantities received → proposed inventory_items quantity_on_hand updates
- Proof of payment: amount paid, date, bank ref → purchase_orders payment_date, payment_reference, po_status=paid
- Match suppliers: use name similarity (AimVape ≈ Steamups Technology AimVape)
- Match products: use name + SKU similarity
- Currencies: detect from symbols (R/ZAR = ZAR, $ = USD, € = EUR, ¥ = CNY)
- Non-English documents: translate extracted data to English in the JSON
- If a multi-page PDF: extract from all visible pages`;
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
        text: `Extract all data from this ${document_type_hint ? document_type_hint + " " : ""}document and return the JSON as specified. Be thorough — extract every line item, date, reference number, and amount visible.`,
      },
    ];

    // Call Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
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

    // Parse JSON from Claude — strip any accidental markdown fences
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
