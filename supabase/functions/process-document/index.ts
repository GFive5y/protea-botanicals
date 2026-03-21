// supabase/functions/process-document/index.ts
// v1.7 — WP-IND Session 3: add create_inventory_item + create_stock_movement for general supplier invoices
// v1.6 — WP-I Extended: Delivery Note -> Auto-receive inventory
// NEW: existing_inventory + open_purchase_orders passed in context
// NEW: receive_delivery_item action (inventory_items qty increment + stock_movements audit)
// NEW: update_po_status action (purchase_orders po_status -> received)
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

function buildSystemPrompt(
  existingSuppliers: unknown[],
  existingProducts: unknown[],
  existingInventory: unknown[],
  openPurchaseOrders: unknown[],
): string {
  return `You are a document extraction engine for Protea Botanicals, a cannabis extract company in South Africa.
Extract ALL structured data from business documents and propose specific database updates.
You MUST respond with ONLY valid JSON - no markdown, no code fences, no explanation, no preamble.

DOCUMENT TYPES (detect from content):
invoice | quote | proof_of_payment | delivery_note | coa | price_list | stock_sheet | contract | unknown

EXISTING SUPPLIERS IN SYSTEM:
${JSON.stringify(existingSuppliers, null, 2)}

EXISTING PRODUCTS/SKUs IN SYSTEM (${existingProducts.length} products already in database):
${JSON.stringify(existingProducts, null, 2)}

EXISTING INVENTORY ITEMS (use for delivery_note item matching - match by name/sku):
${JSON.stringify(existingInventory, null, 2)}

OPEN PURCHASE ORDERS (use for delivery_note PO matching - match by po_number or supplier):
${JSON.stringify(openPurchaseOrders, null, 2)}

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

=======================================================
MANDATORY RULE - proposed_updates MUST NEVER BE EMPTY
=======================================================

If the document contains ANY line items, suppliers, payments, or quantities,
you MUST produce at least one proposed_update. An empty proposed_updates array
is only acceptable for a document with literally no actionable data (e.g. a blank page).

For EVERY document type, always produce these actions:

INVOICE or QUOTE (any order document):
  1. ALWAYS propose create_purchase_order - one action covering the whole order.
     Include all matched line items as purchase_order_items in the data.
  2. For each matched product line item, ALSO propose update_product_price IF
     the unit price is > 0 and not a free sample / 100% discount.
  3. For each unmatched product, propose create_supplier_product.

PROOF OF PAYMENT:
  1. Propose update_po_payment on purchase_orders - set payment_date,
     payment_reference, po_status = "paid".

DELIVERY NOTE:
  For EACH received line item that matches existing_inventory (match by name/sku similarity):
    1. Propose receive_delivery_item action - this will increment quantity_on_hand
       in inventory_items and create a stock_movements audit record.
       CRITICAL: data MUST include item_id (uuid from existing_inventory) + quantity_received (number > 0).
       record_id MUST also be set to the inventory_items uuid (same as item_id).
  For items NOT matched in existing_inventory:
    -> Add to unknown_items only. Do NOT propose receive_delivery_item for unmatched items.
  If a matching PO is found in open_purchase_orders (match by po_number or supplier):
    2. Propose update_po_status on purchase_orders - set po_status = "received".
       CRITICAL: record_id MUST be the PO uuid from open_purchase_orders.
       data MUST include po_status: "received" and actual_arrival (date string YYYY-MM-DD).

COA / LAB REPORT:
  1. Propose update_batch_coa on batches - set thc_content, cbd_content,
     lab_name, lab_test_date, lab_certified = true, coa_url if present.

PRICE LIST:
  1. set line_items to []. For EVERY product in the list, propose
     update_product_price (matched) or create_supplier_product (unmatched).

=======================================================
PRODUCT MATCHING RULES
=======================================================

For EVERY product in the document:

STEP 1 - Search existing_products by name similarity (fuzzy/partial match).
  "Orange Cookies" matches "Orange Cookies - Live Line".
  "Gelato #41" matches "Gelato #41 - Palate Line - 2ml".

STEP 2 - If MATCHED:
  -> Set matched_product_id in the line_item.
  -> Propose update_product_price ONLY IF unit_price > 0 (not free sample).
  -> Do NOT add to unknown_items.
  -> Do NOT propose create_supplier_product.

STEP 3 - If NOT MATCHED:
  -> Add to unknown_items.
  -> Propose create_supplier_product with full data object.

RULE: Never propose create_supplier_product for products already in existing_products.
RULE: If unsure whether a product matches, prefer MATCHED (update, not create).
RULE: Free samples ($0 or 100% discounted) -> still matched in line_items,
      but skip the update_product_price (don't overwrite real prices with $0).
      The create_purchase_order action still captures them as order items.

=======================================================
create_purchase_order EXAMPLE (use for invoice/quote):
=======================================================
{
  "action": "create_purchase_order",
  "table": "purchase_orders",
  "record_id": null,
  "description": "Create PO for Eybna GmbH quote PQG2600182 - 14 terpene samples",
  "data": {
    "supplier_id": "3357f93b-8dac-46fa-b591-d5cf74c6d313",
    "po_number": "PQG2600182",
    "supplier_invoice_ref": "PQG2600182",
    "status": "ordered",
    "po_status": "ordered",
    "order_date": "2026-02-23",
    "currency": "USD",
    "subtotal": 234.00,
    "notes": "Terpene samples - 2ml each",
    "items": [
      {
        "supplier_product_id": "matched-uuid-or-null",
        "description": "Pineapple Express - Pure Terpenes Line - 2ml",
        "quantity_ordered": 1,
        "unit_price_usd": 25.00
      }
    ]
  },
  "confidence": 0.92
}

=======================================================
receive_delivery_item EXAMPLE (use for delivery_note - one per matched item):
=======================================================
{
  "action": "receive_delivery_item",
  "table": "inventory_items",
  "record_id": "uuid-of-inventory-item",
  "description": "Receive 50 units of Pineapple Express terpene (current stock: 10 -> new: 60)",
  "data": {
    "item_id": "uuid-of-inventory-item",
    "quantity_received": 50
  },
  "confidence": 0.94
}

RULES for receive_delivery_item:
- record_id and data.item_id MUST be the same uuid from existing_inventory
- quantity_received MUST be a positive number (the qty on the delivery note, not cumulative)
- Only propose this for items FOUND in existing_inventory
- Include current quantity in description so operator can verify

=======================================================
update_po_status EXAMPLE (use for delivery_note when PO found):
=======================================================
{
  "action": "update_po_status",
  "table": "purchase_orders",
  "record_id": "uuid-of-purchase-order",
  "description": "Mark PO-2026-001 as received - goods arrived 2026-03-11",
  "data": {
    "po_status": "received",
    "actual_arrival": "2026-03-11"
  },
  "confidence": 0.88
}

RULES for update_po_status:
- record_id MUST be a uuid from open_purchase_orders - never invent one
- po_status MUST be exactly: "received"
- actual_arrival MUST be the delivery date from the document (YYYY-MM-DD format)
- If no matching PO found in open_purchase_orders, do NOT propose this action

=======================================================
update_product_price EXAMPLE (matched product, price > 0):
=======================================================
{
  "action": "update_product_price",
  "table": "supplier_products",
  "record_id": "uuid-of-existing-product",
  "description": "Update Pineapple Express unit price to $25.00",
  "data": { "unit_price_usd": 25.00, "price_effective_date": "2026-02-23" },
  "confidence": 0.95
}

=======================================================
create_supplier_product EXAMPLE (unmatched only):
=======================================================
{
  "action": "create_supplier_product",
  "table": "supplier_products",
  "record_id": null,
  "description": "Create new product: ZKZ - Live Plus+ Line - 2ml",
  "data": {
    "supplier_id": "3357f93b-8dac-46fa-b591-d5cf74c6d313",
    "name": "ZKZ - Live Plus+ Line - 2ml",
    "sku": "EYBNA-ZKZ-LIVEPLUS-2ML",
    "category": "terpene",
    "unit_price_usd": 25.00,
    "currency": "USD",
    "moq": 1,
    "lead_time_days": 7,
    "is_active": true,
    "notes": "Auto-created from document ingestion"
  },
  "confidence": 0.88
}

=======================================================
SUPPLIER INVOICE - GENERAL RETAIL (non-cannabis, no existing PO)
=======================================================
Use this section when the document is a supplier invoice for general products
(clothing, food, beverages, accessories, supplements) where no matching PO exists
in open_purchase_orders and products are not in existing_products.

For EACH line item NOT matched in existing_inventory:
  1. Propose create_inventory_item - creates a new inventory_items row.
     data MUST include: sku, name, category, unit, quantity_on_hand, cost_price.
     category: "finished_product" for retail goods, "raw_material" for ingredients,
     "packaging" for packaging, "accessory" for accessories.
     unit: "pcs" for countable, "kg" for weight, "l" for liquid, "ml" for small volumes.
     cost_price: unit price in ZAR. If USD invoice, set cost_price to 0 and note in extraction_notes.
     sell_price: always 0 (operator sets in HQ Pricing after receiving).

  2. Propose create_stock_movement - always paired with create_inventory_item.
     data MUST include: quantity (same as quantity_on_hand above), unit_cost,
     movement_type: "purchase_in", reference (invoice number).
     record_id MUST be null (handler creates item first then links movement).

For EACH line item MATCHED in existing_inventory:
  -> Propose receive_delivery_item instead (same as delivery_note flow above).

=======================================================
create_inventory_item EXAMPLE (new SKU from general supplier invoice):
=======================================================
{
  "action": "create_inventory_item",
  "table": "inventory_items",
  "record_id": null,
  "description": "Create new inventory item: Classic White Tee XL - 50 units received",
  "data": {
    "sku": "CLT-WHITE-XL",
    "name": "Classic White Tee XL",
    "category": "finished_product",
    "unit": "pcs",
    "quantity_on_hand": 50,
    "cost_price": 85.00,
    "sell_price": 0,
    "is_active": true,
    "description": "Auto-created from supplier invoice ingestion"
  },
  "confidence": 0.88
}

=======================================================
create_stock_movement EXAMPLE (always paired with create_inventory_item):
=======================================================
{
  "action": "create_stock_movement",
  "table": "stock_movements",
  "record_id": null,
  "description": "Record purchase_in for Classic White Tee XL - 50 units at R85",
  "data": {
    "quantity": 50,
    "unit_cost": 85.00,
    "movement_type": "purchase_in",
    "reference": "INV-2026-0441",
    "notes": "Received via supplier invoice INV-2026-0441"
  },
  "confidence": 0.88
}

RULES for create_inventory_item + create_stock_movement:
- Always propose them as a PAIR - one create_inventory_item + one create_stock_movement per new SKU
- record_id is always null for both - the handler creates the item first then links the movement
- Do NOT use for items already in existing_inventory - use receive_delivery_item instead
- Do NOT use when a matching PO exists - use create_purchase_order instead

=======================================================
GENERAL EXTRACTION RULES:
- Confidence scores: 0.0-1.0. Conservative - never inflate.
- Currencies: R/ZAR = ZAR, $ = USD, EUR = EUR
- Match suppliers by name similarity
- Non-English documents: translate extracted data to English
- Multi-page PDFs: extract from all pages
- supplier_products.category must be: hardware OR terpene (lowercase, no plural)`;
}

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
    // v1.6 - inventory items for delivery note matching
    const existingInventory = (context.existing_inventory || []).map(
      (i: Record<string, unknown>) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        category: i.category,
        quantity_on_hand: i.quantity_on_hand,
      }),
    );
    // v1.6 - open POs for delivery note PO matching
    const openPurchaseOrders = (context.open_purchase_orders || []).map(
      (po: Record<string, unknown>) => ({
        id: po.id,
        po_number: po.po_number,
        supplier_id: po.supplier_id,
        po_status: po.po_status,
        expected_arrival: po.expected_arrival,
      }),
    );

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
          source: { type: "base64", media_type: mime_type, data: file_base64 },
        };

    const userContent = [
      documentBlock,
      {
        type: "text",
        text: `Extract all data from this ${document_type_hint ? document_type_hint + " " : ""}document and return the JSON as specified.

CRITICAL REMINDERS:
1. proposed_updates MUST NOT be empty if there are any line items or actionable data.
2. For invoices and quotes with existing supplier products: ALWAYS create a create_purchase_order action.
3. For matched products with price > 0: ALSO propose update_product_price.
4. For unmatched supplier products: propose create_supplier_product.
5. Free samples ($0): include in the PO items but skip update_product_price.
6. Check EXISTING PRODUCTS list before proposing any create - if name matches, use update instead.
7. For delivery notes: use receive_delivery_item (NOT update_inventory_qty) for each matched inventory item.
   record_id and data.item_id MUST be the uuid from existing_inventory. quantity_received must be > 0.
8. For delivery notes: use update_po_status (NOT update_purchase_order) to mark the PO received.
   record_id MUST be a uuid from open_purchase_orders. Only propose if a match is found.
9. For general supplier invoices (clothing, food, accessories, non-cannabis goods) where no PO exists:
   use create_inventory_item + create_stock_movement (as a pair) for each new SKU.
   Use receive_delivery_item for any SKUs already in existing_inventory.`,
      },
    ];

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
        system: buildSystemPrompt(
          existingSuppliers,
          existingProducts,
          existingInventory,
          openPurchaseOrders,
        ),
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Anthropic API error ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const rawText: string = claudeData.content?.[0]?.text || "";

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
