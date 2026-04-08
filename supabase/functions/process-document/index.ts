// supabase/functions/process-document/index.ts
// v2.2 — P3-C: VAT auto-fill — vat_amount/amount_excl_vat extraction + supplier VAT override
// v2.1 — WP-SMART-CAPTURE: Anti-fraud — SA bank identifier extraction + 6-level document fingerprinting
//   extractUniqueIdentifiers(): UTI/TRN REF/TXN ID (all SA banks), Auth Code, Receipt No, ECHO, Merchant
//   buildDocumentFingerprint(): 6-level: UTI → Auth+Date → ECHO+Merchant → Receipt+Merchant+Date → Receipt+Date → Composite
//   checkDuplicateDocument(): image hash + fingerprint match against document_log
// v2.0 — WP-SMART-CAPTURE: SARS tax invoice compliance check + capture type classifier
// v1.9 — WP-FIN S3: Expense document detection + create_expense action
//   classifyExpenseDocument() runs after Claude parse — detects CAPEX/OPEX invoices,
//   service bills, payment confirmations for non-stock items. Adds create_expense
//   to proposed_updates with correct category, amount_zar, fx conversion.
//   Handles: Takealot lab equipment invoices, Labotec quotations, AliPay freight,
//   general service invoices (rent, utilities, marketing, accounting).
// v1.8 — WP-FIN S0: lump-sum invoice cost allocation (fixes BUG-038 terpene AVCO=0)
// v1.7 — WP-IND Session 3: add create_inventory_item + create_stock_movement
// v1.6 — WP-I Extended: Delivery Note -> Auto-receive inventory
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

// ── WP-FIN S0: Lump-sum invoice cost allocation ───────────────────────────────
function allocateLumpSumCosts(
  ext: Record<string, unknown>,
  pos: Array<Record<string, unknown>>,
): Record<string, unknown> {
  const lineItems = (ext.line_items as Array<Record<string, unknown>>) || [];
  const updates =
    (ext.proposed_updates as Array<Record<string, unknown>>) || [];
  const totalAmount = Number(ext.total_amount ?? 0);
  if (!totalAmount || lineItems.length === 0) return ext;

  const unpricedLines = lineItems.filter(
    (l) => !l.unit_price || Number(l.unit_price) === 0,
  );
  if (unpricedLines.length === 0) return ext;

  const explicitTotal = lineItems
    .filter((l) => l.unit_price && Number(l.unit_price) > 0)
    .reduce((s, l) => s + Number(l.unit_price) * Number(l.quantity ?? 1), 0);
  const remainingTotal = totalAmount - explicitTotal;
  const unpricedQty = unpricedLines.reduce(
    (s, l) => s + Number(l.quantity ?? 1),
    0,
  );
  if (unpricedQty <= 0 || remainingTotal <= 0) return ext;
  const impliedUnitPrice = remainingTotal / unpricedQty;

  const matchedPO = pos.find(
    (po) =>
      po.supplier_id ===
        (ext.supplier as Record<string, unknown>)?.matched_id ||
      po.po_number === (ext.reference as Record<string, unknown>)?.number,
  );
  const fxRate = Number(
    matchedPO?.usd_zar_rate ?? ext.usd_zar_rate ?? ext.fx_rate ?? 18.5,
  );
  const impliedUnitPriceZar = Math.round(impliedUnitPrice * fxRate * 100) / 100;

  const patchedLines = lineItems.map((l) => {
    if (!l.unit_price || Number(l.unit_price) === 0) {
      return {
        ...l,
        unit_price: impliedUnitPrice,
        unit_cost: impliedUnitPrice,
        unit_cost_zar: impliedUnitPriceZar,
        allocated_cost: true,
        confidence: Math.min(Number(l.confidence ?? 0.9), 0.75),
      };
    }
    return l;
  });

  const patchedUpdates = updates.map((u) => {
    if (u.action !== "receive_delivery_item") return u;
    const uData = (u.data as Record<string, unknown>) || {};
    const existingCost = Number(uData.unit_cost ?? uData.unit_price ?? 0);
    if (existingCost > 0) return u;
    return {
      ...u,
      confidence: 0.75,
      data: {
        ...uData,
        unit_cost: impliedUnitPrice,
        unit_cost_zar: impliedUnitPriceZar,
        allocated_cost: true,
      },
    };
  });

  const allExplicitCount = lineItems.length - unpricedLines.length;
  const allocationNote =
    `Lump-sum invoice detected. Implied unit cost: ${ext.currency ?? "USD"} ` +
    `${impliedUnitPrice.toFixed(4)} (total ${totalAmount.toFixed(2)} ` +
    `less ${allExplicitCount} explicit lines = ${remainingTotal.toFixed(2)} ` +
    `/ ${unpricedQty} unpriced units). ZAR: R${impliedUnitPriceZar.toFixed(2)} at ` +
    `R${fxRate.toFixed(4)}/USD.`;

  return {
    ...ext,
    line_items: patchedLines,
    proposed_updates: patchedUpdates,
    lump_sum_invoice: true,
    extraction_notes: [ext.extraction_notes, allocationNote]
      .filter(Boolean)
      .join(" | "),
  };
}

// ── WP-FIN S3: Expense document classifier ────────────────────────────────────
// Detects non-stock invoices and adds create_expense to proposed_updates.
// Runs AFTER Claude parse and lump-sum allocation.
//
// CAPEX keywords: lab equipment, machinery, hardware assets, tools
// OPEX keywords: services, freight, rent, utilities, subscriptions, professional fees
//
// Does NOT create expense if:
//   - Document already has receive_delivery_item (it's a stock invoice)
//   - proposed_updates already contains create_expense (Claude already classified it)
//   - No total_amount extracted
function classifyExpenseDocument(
  ext: Record<string, unknown>,
  usdZarRate: number,
): Record<string, unknown> {
  const updates =
    (ext.proposed_updates as Array<Record<string, unknown>>) || [];
  const docType = String(ext.document_type || "unknown").toLowerCase();
  const totalAmount = Number(ext.total_amount ?? 0);

  // Skip if no amount or already has expense action
  if (!totalAmount) return ext;
  if (updates.some((u) => u.action === "create_expense")) return ext;

  // Skip if this is a stock-receiving document
  const hasStockActions = updates.some((u) =>
    ["receive_delivery_item", "create_inventory_item"].includes(
      String(u.action),
    ),
  );
  if (hasStockActions) return ext;

  // Skip if it's a PO for stock items (has create_purchase_order with items that have supplier_product_id)
  const poAction = updates.find((u) => u.action === "create_purchase_order");
  if (poAction) {
    const poData = (poAction.data as Record<string, unknown>) || {};
    const items = (poData.items as Array<Record<string, unknown>>) || [];
    // If PO has supplier products (terpenes, hardware) — it's a stock PO, not an expense
    if (items.length > 0 && items.some((i) => i.supplier_product_id))
      return ext;
  }

  // ── Classify expense type from line items + document content ──────────────
  const lineItems = (ext.line_items as Array<Record<string, unknown>>) || [];
  const allText = [
    ...lineItems.map((l) => String(l.description || l.name || "")),
    String(ext.extraction_notes || ""),
    String((ext.supplier as Record<string, unknown>)?.name || ""),
  ]
    .join(" ")
    .toLowerCase();

  // CAPEX indicators — lab equipment, machinery, tools, assets
  const capexKeywords = [
    "stirrer",
    "hot plate",
    "pipette",
    "beaker",
    "flask",
    "centrifuge",
    "microscope",
    "balance",
    "scale",
    "filtration",
    "extraction equipment",
    "lab equipment",
    "laboratory equipment",
    "heating",
    "cooling",
    "pump",
    "reactor",
    "rotary evaporator",
    "spectrophotometer",
    "ph meter",
    "autoclave",
    "incubator",
    "refrigerator",
    "freezer",
    "oven",
    "magnetic",
    "heating block",
    "distillation",
    "vacuum pump",
    "computer",
    "laptop",
    "printer",
    "scanner",
    "camera",
    "server",
    "vehicle",
    "machinery",
    "equipment",
    "apparatus",
    "instrument",
    "tool",
    "fixture",
    "furniture",
    "shelving",
    "racking",
    "storage unit",
    "air conditioner",
    "generator",
    "solar",
    "inverter",
    "ups",
  ];

  // OPEX indicators — services, running costs
  const opexKeywords = [
    "freight",
    "logistics",
    "shipping",
    "courier",
    "transport",
    "delivery fee",
    "rent",
    "rental",
    "lease",
    "utilities",
    "electricity",
    "water",
    "internet",
    "hosting",
    "subscription",
    "software",
    "licence",
    "license",
    "saas",
    "accounting",
    "audit",
    "legal",
    "attorney",
    "consulting",
    "marketing",
    "advertising",
    "printing",
    "cleaning",
    "security",
    "insurance",
    "bank charges",
    "transaction fee",
    "payment processing",
    "travel",
    "accommodation",
    "fuel",
    "国际物流",
    "物流",
    "freight",
    "logistic",
    "shenzhen",
  ];

  let category = "opex";
  let subcategory = "Other";

  // Score capex vs opex
  const capexScore = capexKeywords.filter((k) => allText.includes(k)).length;
  const opexScore = opexKeywords.filter((k) => allText.includes(k)).length;

  if (capexScore > opexScore || capexScore > 0) {
    category = "capex";
    subcategory = "Equipment";
    if (
      allText.includes("computer") ||
      allText.includes("laptop") ||
      allText.includes("server")
    )
      subcategory = "Computer hardware";
    else if (allText.includes("vehicle")) subcategory = "Vehicles";
    else if (allText.includes("furniture") || allText.includes("shelving"))
      subcategory = "Furniture";
  } else {
    category = "opex";
    if (
      opexKeywords.filter(
        (k) =>
          [
            "freight",
            "logistics",
            "shipping",
            "courier",
            "transport",
            "物流",
            "shenzhen",
          ].includes(k) && allText.includes(k),
      ).length > 0
    )
      subcategory = "Shipping";
    else if (allText.includes("rent") || allText.includes("lease"))
      subcategory = "Rent";
    else if (
      allText.includes("electricity") ||
      allText.includes("water") ||
      allText.includes("utilities")
    )
      subcategory = "Utilities";
    else if (
      allText.includes("internet") ||
      allText.includes("hosting") ||
      allText.includes("subscription")
    )
      subcategory = "Software subscriptions";
    else if (
      allText.includes("accounting") ||
      allText.includes("audit") ||
      allText.includes("legal")
    )
      subcategory = "Accounting";
    else if (allText.includes("marketing") || allText.includes("advertising"))
      subcategory = "Marketing";
    else if (allText.includes("insurance")) subcategory = "Insurance";
    else if (
      allText.includes("freight") ||
      allText.includes("shipping") ||
      allText.includes("transport")
    )
      subcategory = "Shipping";
  }

  // Convert to ZAR
  const currency = String(ext.currency || "ZAR").toUpperCase();
  let amountZar = totalAmount;
  let amountForeign: number | null = null;
  let fxRateUsed: number | null = null;

  if (currency === "USD") {
    amountForeign = totalAmount;
    fxRateUsed = usdZarRate;
    amountZar = Math.round(totalAmount * usdZarRate * 100) / 100;
  } else if (currency === "EUR") {
    amountForeign = totalAmount;
    fxRateUsed = usdZarRate * 1.08; // rough EUR/ZAR
    amountZar = Math.round(totalAmount * fxRateUsed * 100) / 100;
  } else if (currency === "CNY") {
    amountForeign = totalAmount;
    fxRateUsed = usdZarRate / 7.2; // rough CNY/ZAR
    amountZar = Math.round(totalAmount * fxRateUsed * 100) / 100;
  }

  // Build description from line items or supplier name
  let description =
    lineItems.length > 0
      ? lineItems
          .map((l) => String(l.description || l.name || ""))
          .filter(Boolean)
          .join(", ")
          .slice(0, 200)
      : String((ext.supplier as Record<string, unknown>)?.name || "Expense");

  if (!description || description.length < 3) {
    description = `${category === "capex" ? "Equipment purchase" : "Business expense"} — ${String((ext.supplier as Record<string, unknown>)?.name || "supplier")}`;
  }

  const expenseDate = String(
    (ext.reference as Record<string, unknown>)?.date ||
      new Date().toISOString().slice(0, 10),
  );

  const expenseAction: Record<string, unknown> = {
    action: "create_expense",
    table: "expenses",
    record_id: null,
    description: `Create ${category} expense: ${description.slice(0, 80)}`,
    data: {
      expense_date: expenseDate,
      category: category,
      subcategory: subcategory,
      description: description,
      amount_zar: amountZar,
      currency: currency,
      amount_foreign: amountForeign,
      fx_rate: fxRateUsed,
      supplier_id:
        (ext.supplier as Record<string, unknown>)?.matched_id || null,
    },
    confidence: Math.min(Number(ext.confidence ?? 0.8), 0.85),
  };

  // Note added to extraction
  const expenseNote = `Expense detected: ${category.toUpperCase()} — ${description.slice(0, 60)} — R${amountZar.toFixed(2)}${currency !== "ZAR" ? ` (${currency} ${totalAmount})` : ""}`;

  return {
    ...ext,
    proposed_updates: [...updates, expenseAction],
    expense_detected: true,
    expense_category: category,
    extraction_notes: [ext.extraction_notes, expenseNote]
      .filter(Boolean)
      .join(" | "),
  };
}

// ── WP-SMART-CAPTURE v2.1: SA Bank Identifier Extractor ──────────────────────
function extractUniqueIdentifiers(rawText: string, _ext: Record<string,unknown>): Record<string,string|null> {
  const ids: Record<string,string|null> = {};
  const t = (rawText||"").replace(/\r?\n/g," ");
  // UTI — standard hyphenated + FNB TRN REF + StdBank TXN ID
  const utiStd = t.match(/\bUTI\s*[:\-]?\s*([A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12,20})\b/i);
  const utiFNB = t.match(/\bTRN\s+REF\s*[:\-]?\s*([A-Z0-9]{12,40})\b/i)||t.match(/\bTRANSACTION\s+REF(?:ERENCE)?\s*[:\-]?\s*([A-Z0-9]{12,40})\b/i);
  const utiStdB = t.match(/\bTXN\s+(?:ID|REF)\s*[:\-]?\s*([A-Z0-9]{12,40})\b/i);
  const utiRaw = utiStd?.[1]||utiFNB?.[1]||utiStdB?.[1]||null;
  if (utiRaw) ids.uti = utiRaw.toUpperCase().trim();
  // Auth Code — all SA banks
  for (const p of [/\bAuth(?:or(?:is|iz)ation)?\s+Code\s*[:\-]?\s*([A-Z0-9]{6})\b/i,/\bAUTH\s*[:\-]?\s*([A-Z0-9]{6})\b/i,/\bApproval\s+Code\s*[:\-]?\s*([A-Z0-9]{6})\b/i]) {
    const m = t.match(p); if (m) { ids.auth_code = m[1].toUpperCase(); break; }
  }
  const rcptM = t.match(/\bReceipt\s*(?:No\.?|#|Number)?\s*[:\-]\s*(\d{4,12})\b/i);
  if (rcptM) ids.receipt_number = rcptM[1];
  const echoM = t.match(/\bECHO\s*[:\-]?\s*([A-Z0-9]{4,15})\b/i);
  if (echoM) ids.echo = echoM[1].toUpperCase();
  const merchM = t.match(/\bMerch(?:ant)?\s+No\.?\s*[:\-]?\s*([0-9:\/]{6,25})\b/i);
  if (merchM) ids.merchant_number = merchM[1].replace(/\s/g,"");
  const spohM = t.match(/\bSPOH\s*[:\-]?\s*([A-Z0-9]{4,15})\b/i);
  if (spohM) ids.spoh = spohM[1];
  const timeM = t.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
  if (timeM) ids.transaction_time = timeM[1];
  const panM = t.match(/\bPAN\s*[:\-]?\s*\d{6}[xX*]{4,}\s*(\d{4})\b/i)||t.match(/\b\d{6}[xX*]{4,}(\d{4})\b/);
  if (panM) ids.pan_last4 = panM[1];
  const pumpM = t.match(/\bP\s+(\d{1,2})\s+\d+[\.,]\d+\b/)||t.match(/\bPump\s*[:\-]?\s*(\d{1,2})\b/i);
  if (pumpM) ids.pump_number = pumpM[1];
  const batchM = t.match(/\bBatch[-\s]Rec\s*[:\-]?\s*([A-Z0-9-]{4,15})\b/i);
  if (batchM) ids.batch_rec = batchM[1];
  const isFleet = /\bfleet\b|\bwex\b|\bpetrocheck\b/i.test(t);
  ids.payment_type = isFleet?"fleet_card":ids.auth_code?"card":"cash";
  return ids;
}

// ── WP-SMART-CAPTURE v2.1: 6-Level Document Fingerprint ──────────────────────
function buildDocumentFingerprint(ext: Record<string,unknown>, ids: Record<string,string|null>, _ct: string): {fingerprint:string;confidence:number;level:number} {
  const vendor = String((ext.supplier as Record<string,unknown>)?.name||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,30);
  const date = String((ext.reference as Record<string,unknown>)?.date||"").trim();
  const amount = String(Math.round(Number(ext.total_amount??0))).trim();
  const time = (ids.transaction_time||"").replace(":","");
  if (ids.uti && ids.uti.length>8) return {fingerprint:`uti:${ids.uti}`,confidence:1.0,level:1};
  if (ids.auth_code && date) return {fingerprint:`auth:${ids.auth_code}:${date}`,confidence:0.999,level:2};
  if (ids.echo && ids.merchant_number) return {fingerprint:`echo:${ids.echo}:${ids.merchant_number}`,confidence:0.97,level:3};
  if (ids.receipt_number && ids.merchant_number && date) return {fingerprint:`rcpt:${ids.merchant_number}:${ids.receipt_number}:${date}`,confidence:0.95,level:4};
  if (ids.receipt_number && date) return {fingerprint:`rcpt:${ids.receipt_number}:${date}`,confidence:0.90,level:5};
  if (vendor && date && amount!=="0") return {fingerprint:`composite:${vendor}:${date}${time?`:${time}`:""}:${amount}`,confidence:0.80,level:6};
  return {fingerprint:"",confidence:0,level:0};
}

// ── WP-SMART-CAPTURE v2.1: Duplicate Document Checker ────────────────────────
async function checkDuplicateDocument(
  db: ReturnType<typeof createClient>, tenantId: string|null, fingerprint: string, fpLevel: number, imageHash: string, currentDocId: string
): Promise<{isDuplicate:boolean;duplicateOf:string|null;duplicateConfidence:number;matchType:string;duplicateDetails:Record<string,unknown>}> {
  const empty = {isDuplicate:false,duplicateOf:null,duplicateConfidence:0,matchType:"",duplicateDetails:{}};
  if (!tenantId) return empty;
  try {
    if (imageHash) {
      const { data } = await db.from("document_log").select("id, uploaded_at, file_name, supplier_name").eq("tenant_id",tenantId).eq("image_hash",imageHash).neq("id",currentDocId).limit(1);
      if (data?.length) return {isDuplicate:true,duplicateOf:data[0].id,duplicateConfidence:1.0,matchType:"exact_image",duplicateDetails:{match_type:"exact_image",fingerprint_type:"image_hash",matched_file:data[0].file_name,matched_supplier:data[0].supplier_name,matched_at:data[0].uploaded_at,message:"Identical image uploaded before"}};
    }
    if (fingerprint) {
      const { data } = await db.from("document_log").select("id, uploaded_at, file_name, supplier_name").eq("tenant_id",tenantId).eq("document_fingerprint",fingerprint).neq("id",currentDocId).limit(1);
      if (data?.length) {
        const conf = fpLevel===1?1.0:fpLevel===2?0.999:fpLevel===3?0.97:fpLevel===4?0.95:fpLevel===5?0.90:0.80;
        const fpType = fingerprint.split(":")[0];
        const labels: Record<string,string> = {uti:"UTI match (100%)",auth:"Auth code + date",echo:"ECHO + merchant",rcpt:"Receipt + date",composite:"Vendor + date + amount"};
        return {isDuplicate:true,duplicateOf:data[0].id,duplicateConfidence:conf,matchType:`fingerprint_${fpType}`,duplicateDetails:{match_type:`fingerprint_${fpType}`,fingerprint_type:fpType,fingerprint_level:fpLevel,fingerprint_label:labels[fpType]||fpType,matched_file:data[0].file_name,matched_supplier:data[0].supplier_name,matched_at:data[0].uploaded_at,message:`Duplicate via ${labels[fpType]||fpType}`}};
      }
    }
  } catch(_) {}
  return empty;
}

// ── WP-SMART-CAPTURE v2.0: SARS Tax Invoice Compliance Checker ───────────────
function checkSarsCompliance(ext: Record<string, unknown>): {
  sars_compliant: boolean; sars_flags: Array<{ code: string; message: string; severity: string }>;
  input_vat_claimable: boolean; input_vat_amount: number; sars_vat_number: string | null;
} {
  const docType = String(ext.document_type || "").toLowerCase();
  if (!["invoice","quote","proof_of_payment"].includes(docType))
    return { sars_compliant: true, sars_flags: [], input_vat_claimable: false, input_vat_amount: 0, sars_vat_number: null };
  const flags: Array<{ code: string; message: string; severity: string }> = [];
  const sup = (ext.supplier as Record<string, unknown>) || {};
  const raw = String((ext as Record<string,unknown>).vat_number||sup.vat_number||sup.vat_reg||"").replace(/\s/g,"").replace(/[^0-9]/g,"");
  const vatOk = /^4\d{9}$/.test(raw);
  const hasDate = !!(ext.reference as Record<string,unknown>)?.date;
  const hasNum  = !!(ext.reference as Record<string,unknown>)?.number;
  const hasDesc = ((ext.line_items as unknown[]) || []).length > 0;
  const total   = Number(ext.total_amount ?? 0);
  const vat     = Number((ext as Record<string,unknown>).vat_amount||(ext as Record<string,unknown>).tax_amount||0);
  if (!vatOk)  flags.push({code:"NO_VAT_NUMBER",message:"No valid SARS VAT reg (10 digits starting with 4).",severity:"warning"});
  if (!hasDate)flags.push({code:"NO_DATE",message:"No invoice date found.",severity:"warning"});
  if (!hasNum) flags.push({code:"NO_INVOICE_NUMBER",message:"No invoice number.",severity:"info"});
  if (!hasDesc)flags.push({code:"NO_DESCRIPTION",message:"No line items found.",severity:"warning"});
  if (vat<=0&&total>0) flags.push({code:"NO_VAT_AMOUNT",message:"VAT not separately stated.",severity:"info"});
  const ok = vatOk && hasDate && hasDesc;
  // Prefer explicit vat_amount from extraction; only fallback to 15/115 if none provided
  const explicitVat = Number((ext as Record<string,unknown>).vat_amount || 0);
  const amt = ok ? (explicitVat > 0 ? explicitVat : (vat > 0 ? vat : Math.round((total*15/115)*100)/100)) : 0;
  return { sars_compliant:ok, sars_flags:flags, input_vat_claimable:ok&&amt>0, input_vat_amount:amt, sars_vat_number:vatOk?raw:null };
}

// ── WP-SMART-CAPTURE v2.0: Capture type classifier ───────────────────────────
function classifyCaptureType(ext: Record<string, unknown>): string {
  const dt = String(ext.document_type||"unknown").toLowerCase();
  const sn = String((ext.supplier as Record<string,unknown>)?.name||"").toLowerCase();
  const ad = ((ext.line_items as Array<Record<string,unknown>>)||[]).map(l=>String(l.description||"").toLowerCase()).join(" ");
  const ta = Number(ext.total_amount??0);
  if (dt==="delivery_note") return "delivery_note";
  if (dt==="coa") return "lab_report";
  if (dt==="proof_of_payment") return "proof_of_payment";
  if (["engen","shell","bp","total","astron","sasol","esso","caltex","puma"].some(b=>sn.includes(b))||ad.includes("litres")||ad.includes("fuel")||ad.includes("petrol")||ad.includes("unleaded")||ad.includes("diesel")||ad.includes("lpg")) return "petrol_slip";
  if (sn.includes("restaurant")||sn.includes("cafe")||ad.includes("meal")||ad.includes("lunch")||ad.includes("dinner")) return "entertainment";
  if (sn.includes("city of")||sn.includes("municipality")||sn.includes("eskom")||ad.includes("electricity")||ad.includes("sanitation")) return "utility_bill";
  const hasStock = ((ext.proposed_updates as unknown[])||[]).some((u:unknown)=>["create_purchase_order","receive_delivery_item"].includes(String((u as Record<string,unknown>).action||"")));
  if (hasStock) return "supplier_invoice";
  return ta>0&&ta<2000 ? "expense_receipt" : "supplier_invoice";
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(
  existingSuppliers: unknown[],
  existingProducts: unknown[],
  existingInventory: unknown[],
  openPurchaseOrders: unknown[],
  industryProfile: string,
): string {
  const industryContext =
    industryProfile === "food_beverage"
      ? "food & beverage producer (ingredients, packaging, equipment)"
      : industryProfile === "general_retail"
        ? "general retail business (finished goods, accessories, packaging)"
        : "cannabis extract company (terpenes, hardware, distillate, packaging)";

  return `You are a document extraction engine for a ${industryContext} in South Africa.
Extract ALL structured data from business documents and propose specific database updates.
You MUST respond with ONLY valid JSON - no markdown, no code fences, no explanation, no preamble.

DOCUMENT TYPES (detect from content):
invoice | quote | proof_of_payment | delivery_note | coa | price_list | stock_sheet | contract | unknown

EXISTING SUPPLIERS IN SYSTEM:
${JSON.stringify(existingSuppliers, null, 2)}

EXISTING PRODUCTS/SKUs IN SYSTEM (${existingProducts.length} products already in database):
${JSON.stringify(existingProducts, null, 2)}

EXISTING INVENTORY ITEMS (use for delivery_note item matching):
${JSON.stringify(existingInventory, null, 2)}

OPEN PURCHASE ORDERS (use for delivery_note PO matching):
${JSON.stringify(openPurchaseOrders, null, 2)}

RESPOND EXACTLY in this JSON structure:
{
  "document_type": "invoice",
  "confidence": 0.94,
  "supplier": { "name": "supplier name", "matched_id": "uuid or null", "confidence": 0.97 },
  "reference": { "number": "INV-001", "date": "2026-03-01", "due_date": null, "confidence": 0.99 },
  "currency": "ZAR",
  "total_amount": 1750.00,
  "vat_amount": 228.26,
  "amount_excl_vat": 1521.74,
  "line_items": [],
  "proposed_updates": [],
  "unknown_items": [],
  "warnings": [],
  "extraction_notes": "brief note"
}

=======================================================
VAT EXTRACTION RULES
=======================================================
If the document explicitly states a VAT amount (e.g. "VAT: R228.26"):
  → set "vat_amount" to that exact figure
  → set "amount_excl_vat" to total_amount minus vat_amount
If VAT is NOT explicitly stated on the document:
  → set "vat_amount" to 0
  → set "amount_excl_vat" to 0
Do NOT calculate VAT yourself — only extract what the document shows.
The backend will apply the 15/115 formula when needed.

=======================================================
MANDATORY RULE - proposed_updates MUST NEVER BE EMPTY
=======================================================
If the document contains ANY line items, suppliers, payments, or quantities,
you MUST produce at least one proposed_update.

=======================================================
EXPENSE DOCUMENT DETECTION — WP-FIN S3
=======================================================
When the document is an invoice or payment for NON-STOCK items
(equipment, services, rent, utilities, freight, professional fees),
propose create_expense action.

CAPEX (capital expenditure — assets owned by the business):
  - Lab equipment: stirrers, pipettes, beakers, centrifuges, balances
  - Machinery: extraction equipment, pumps, reactors, filtration units
  - Electronics: computers, servers, printers, cameras
  - Furniture, shelving, racking, storage units
  - Vehicles, air conditioners, generators, solar/inverter systems

OPEX (operating expenses — recurring business costs):
  - Freight, logistics, shipping, courier, transport fees
  - Rent, lease, utilities, electricity, water, internet
  - Software subscriptions, hosting, SaaS tools
  - Accounting, legal, consulting, marketing, advertising
  - Insurance, bank charges, travel, cleaning, security

RULE: If the invoice contains BOTH stock items (terpenes, hardware) AND
  expense items (freight charge on same invoice), create BOTH:
  create_purchase_order (for stock) AND create_expense (for freight separately).

RULE: Payment confirmations (Stripe, AliPay, bank transfer screenshots) for
  non-stock payments → create_expense. For stock payments → skip (PO flow handles it).

=======================================================
create_expense EXAMPLE:
=======================================================
{
  "action": "create_expense",
  "table": "expenses",
  "record_id": null,
  "description": "Create capex expense: SH-2 Magnetic Stirrer Hot Plate R1750.00",
  "data": {
    "expense_date": "2026-02-09",
    "category": "capex",
    "subcategory": "Equipment",
    "description": "SH-2 Magnetic Stirrer Hot Plate with Stand (Heating & Stirring) — Takealot",
    "amount_zar": 1750.00,
    "currency": "ZAR",
    "amount_foreign": null,
    "fx_rate": null,
    "supplier_id": "uuid-if-matched-else-null"
  },
  "confidence": 0.92
}

create_expense for foreign currency (AliPay/Stripe freight):
{
  "action": "create_expense",
  "table": "expenses",
  "record_id": null,
  "description": "Create opex expense: Freight — Shenzhen logistics CNY 742.63",
  "data": {
    "expense_date": "2026-02-03",
    "category": "opex",
    "subcategory": "Shipping",
    "description": "International freight — 深圳市东方鸿国际物流有限公司",
    "amount_zar": 1543.00,
    "currency": "CNY",
    "amount_foreign": 742.63,
    "fx_rate": 2.078,
    "supplier_id": null
  },
  "confidence": 0.80
}

=======================================================
FOR EVERY DOCUMENT TYPE:
=======================================================

INVOICE / QUOTE — STOCK ITEMS (terpenes, hardware, raw materials):
  1. create_purchase_order
  2. update_product_price (matched products, price > 0)
  3. create_supplier_product (unmatched products)

INVOICE / QUOTE — EXPENSE ITEMS (equipment, services, freight):
  1. create_expense (category: capex or opex based on item type)

INVOICE — MIXED (stock + freight charge on same invoice):
  1. create_purchase_order (for stock items)
  2. create_expense (for freight/delivery charge line)

PROOF OF PAYMENT:
  - For stock payment: update_po_payment on purchase_orders
  - For non-stock payment: create_expense

DELIVERY NOTE:
  - receive_delivery_item per matched inventory item
  - update_po_status if matching PO found

COA / LAB REPORT:
  - update_batch_coa on batches

=======================================================
PRODUCT MATCHING RULES
=======================================================
STEP 1 — Search existing_products by name similarity.
STEP 2 — If MATCHED: update_product_price (not free sample). No create_supplier_product.
STEP 3 — If NOT MATCHED: create_supplier_product.

=======================================================
GENERAL RETAIL — create_inventory_item + create_stock_movement
=======================================================
For non-cannabis supplier invoices where no PO exists and items not in inventory:
  create_inventory_item + create_stock_movement as a PAIR per new SKU.

=======================================================
SUPPLIER MATCHING
=======================================================
Match suppliers by name similarity to EXISTING SUPPLIERS list.
Non-English documents: translate extracted data to English.
Currencies: R/ZAR = ZAR, $ = USD, ¥/CNY = CNY, € = EUR.

EXAMPLES:
create_purchase_order — same as before (invoice/quote for stock items)
receive_delivery_item — same as before (delivery note)
update_po_status — same as before (delivery note)
update_product_price — same as before (matched product, price > 0)
create_supplier_product — same as before (unmatched product)
create_inventory_item + create_stock_movement — same as before (general retail)

supplier_products.category must be: hardware OR terpene (lowercase, no plural)`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
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
      tenant_id = null,
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
        vat_registered: s.vat_registered ?? null,
        vat_number: s.vat_number ?? null,
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
    const existingInventory = (context.existing_inventory || []).map(
      (i: Record<string, unknown>) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        category: i.category,
        quantity_on_hand: i.quantity_on_hand,
      }),
    );
    const openPurchaseOrders = (context.open_purchase_orders || []).map(
      (po: Record<string, unknown>) => ({
        id: po.id,
        po_number: po.po_number,
        supplier_id: po.supplier_id,
        po_status: po.po_status,
        expected_arrival: po.expected_arrival,
        usd_zar_rate: po.usd_zar_rate ?? null,
      }),
    );

    const industryProfile = String(
      body.industry_profile || context.industry_profile || "cannabis_retail",
    );

    // Live FX rate for expense ZAR conversion (fallback 18.5)
    const usdZarRate = Number(context.usd_zar_rate ?? 18.5);

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
2. For stock invoices/quotes: ALWAYS create create_purchase_order.
3. For expense invoices (equipment, services, freight, rent): propose create_expense.
4. For MIXED invoices (stock + freight charge): create BOTH create_purchase_order AND create_expense.
5. Payment confirmations (Stripe, AliPay, bank transfer) for non-stock → create_expense.
6. For delivery notes: use receive_delivery_item + update_po_status.
7. For COA/lab reports: use update_batch_coa.
8. For general retail invoices (no PO): use create_inventory_item + create_stock_movement pairs.
9. Detect currency correctly: R/ZAR=ZAR, $=USD, ¥=CNY, €=EUR.
10. Non-English documents (Chinese, etc.): translate extracted data to English.
11. Extract vat_amount and amount_excl_vat ONLY if explicitly stated on the document. If not shown, set both to 0.`,
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
          industryProfile,
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

    // WP-FIN S0: lump-sum cost allocation
    extraction = allocateLumpSumCosts(extraction, openPurchaseOrders);

    // WP-FIN S3: expense document classification
    extraction = classifyExpenseDocument(extraction, usdZarRate);

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // LL-084: Duplicate invoice guard
    const refNumber = (extraction.reference as Record<string, unknown>)
      ?.number as string | null;
    const supplierId = (extraction.supplier as Record<string, unknown>)
      ?.matched_id as string | null;
    if (refNumber && supplierId) {
      const { data: existingConfirmed } = await db
        .from("document_log")
        .select("id, file_name, confirmed_at")
        .eq("status", "confirmed")
        .eq("supplier_id", supplierId)
        .filter("extracted_data->reference->>number", "eq", refNumber)
        .limit(1);
      if (existingConfirmed && existingConfirmed.length > 0) {
        const dup = existingConfirmed[0];
        const dupDate = new Date(dup.confirmed_at).toLocaleDateString("en-ZA");
        const dupWarning =
          `⚠ DUPLICATE INVOICE DETECTED: Reference "${refNumber}" was already ` +
          `confirmed on ${dupDate} (file: ${dup.file_name}). ` +
          `Do NOT confirm any stock movement actions — this will create duplicate inventory entries.`;
        (extraction.warnings as string[]).push(dupWarning);
        extraction.potential_duplicate = true;
        extraction.confidence = Math.min(
          Number(extraction.confidence ?? 1),
          0.4,
        );
      }
    }

    // WP-SMART-CAPTURE v2.0: SARS compliance + capture type
    const sarsResult  = checkSarsCompliance(extraction);
    const captureType = classifyCaptureType(extraction);
    extraction = {
      ...extraction,
      sars_compliant:      sarsResult.sars_compliant,
      sars_flags:          sarsResult.sars_flags,
      input_vat_claimable: sarsResult.input_vat_claimable,
      input_vat_amount:    sarsResult.input_vat_amount,
      sars_vat_number:     sarsResult.sars_vat_number,
      capture_type:        captureType,
    };

    // P3-C: Supplier VAT override — if matched supplier is explicitly not VAT-registered, block input VAT
    const matchedSupplierId = (extraction.supplier as Record<string,unknown>)?.matched_id;
    if (matchedSupplierId) {
      const matchedSupplier = existingSuppliers.find((s: Record<string,unknown>) => s.id === matchedSupplierId);
      if (matchedSupplier && (matchedSupplier as Record<string,unknown>).vat_registered === false) {
        extraction = { ...extraction, input_vat_claimable: false, input_vat_amount: 0 };
        sarsResult.input_vat_claimable = false;
        sarsResult.input_vat_amount = 0;
      }
    }

    // WP-SMART-CAPTURE v2.1: Anti-fraud — identifier extraction + fingerprinting
    const searchText = [rawText, file_name, (extraction.extraction_notes as string)||""].join(" ");
    const uniqueIds = extractUniqueIdentifiers(searchText, extraction);
    const fpResult = buildDocumentFingerprint(extraction, uniqueIds, captureType);
    const fingerprint = fpResult.fingerprint;
    const imageHashProxy = file_size_kb ? `${mime_type}:${file_size_kb}:${file_base64.slice(0,80)}` : null;
    extraction = {
      ...extraction,
      unique_identifiers: uniqueIds,
      document_fingerprint: fingerprint||null,
      image_hash_proxy: imageHashProxy,
      fingerprint_level: fpResult.level,
      fingerprint_confidence: fpResult.confidence,
    };

    const { data: logEntry, error: logErr } = await db
      .from("document_log")
      .insert({
        tenant_id: tenant_id,
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
        document_fingerprint: fingerprint||null,
        image_hash: imageHashProxy||null,
        unique_identifiers: uniqueIds,
      })
      .select()
      .single();

    if (logErr)
      throw new Error(`Failed to log to document_log: ${logErr.message}`);

    // WP-SMART-CAPTURE v2.1: Duplicate check + update document_log with fingerprint
    const dupResult = await checkDuplicateDocument(db, tenant_id, fingerprint, fpResult.level, imageHashProxy||"", logEntry.id);
    await db.from("document_log").update({
      document_fingerprint: fingerprint||null,
      image_hash: imageHashProxy||null,
      unique_identifiers: uniqueIds,
      is_duplicate: dupResult.isDuplicate,
      duplicate_of_id: dupResult.duplicateOf,
    }).eq("id", logEntry.id);

    if (dupResult.isDuplicate) {
      if (!extraction.warnings) extraction.warnings = [];
      (extraction.warnings as string[]).unshift(
        `\uD83D\uDEA8 DUPLICATE: ${dupResult.duplicateDetails.message} \u2014 ` +
        `confidence ${Math.round(dupResult.duplicateConfidence*100)}%. DO NOT POST.`
      );
      extraction.is_duplicate = true;
      extraction.duplicate_of = dupResult.duplicateOf;
      extraction.duplicate_confidence = dupResult.duplicateConfidence;
      extraction.duplicate_details = dupResult.duplicateDetails;
      extraction.confidence = Math.min(Number(extraction.confidence??1), 0.15);
    }

    return new Response(
      JSON.stringify({
        success:             true,
        document_log_id:     logEntry.id,
        extraction,
        sars_compliant:      sarsResult.sars_compliant,
        sars_flags:          sarsResult.sars_flags,
        input_vat_claimable: (extraction as Record<string,unknown>).input_vat_claimable ?? sarsResult.input_vat_claimable,
        input_vat_amount:    (extraction as Record<string,unknown>).input_vat_amount ?? sarsResult.input_vat_amount,
        sars_vat_number:     sarsResult.sars_vat_number,
        capture_type:          captureType,
        unique_identifiers:    uniqueIds,
        document_fingerprint:  fingerprint||null,
        fingerprint_level:     fpResult.level,
        fingerprint_confidence: fpResult.confidence,
        is_duplicate:          dupResult.isDuplicate,
        duplicate_of:          dupResult.duplicateOf,
        duplicate_confidence:  dupResult.duplicateConfidence,
        duplicate_match_type:  dupResult.matchType,
        duplicate_details:     dupResult.duplicateDetails,
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
