// supabase/functions/auto-post-capture/index.ts
// WP-SMART-CAPTURE: Atomic accounting engine v1.1
// Creates expense + double-entry journal from capture_queue entry
// VAT: writes input_vat_amount to expense → expense_vat_sync trigger creates vat_transaction

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_H = { ...CORS, "Content-Type": "application/json" };

const ACCOUNT_MAP: Record<string, { dr: string; dr_name: string }> = {
  "Rent & Premises":    { dr: "60000", dr_name: "Rent & Premises" },
  "Staff Wages":        { dr: "60100", dr_name: "Staff Wages & Salaries" },
  "Security":           { dr: "60200", dr_name: "Security Services" },
  "Utilities":          { dr: "60300", dr_name: "Utilities" },
  "Insurance":          { dr: "60400", dr_name: "Insurance" },
  "Marketing":          { dr: "60500", dr_name: "Marketing & Advertising" },
  "Packaging":          { dr: "60600", dr_name: "Packaging Materials" },
  "Banking & Fees":     { dr: "60700", dr_name: "Banking & Card Fees" },
  "Software":           { dr: "60800", dr_name: "Software & Subscriptions" },
  "Professional Fees":  { dr: "60900", dr_name: "Professional Fees" },
  "Cleaning & Hygiene": { dr: "61000", dr_name: "Cleaning & Hygiene" },
  "Vehicle & Travel":   { dr: "61900", dr_name: "Other Operating Expenses" },
  "Entertainment":      { dr: "60500", dr_name: "Marketing & Advertising" },
  "Equipment":          { dr: "61900", dr_name: "Other Operating Expenses" },
};
const DEFAULT_DR = { dr: "61900", dr_name: "Other Operating Expenses" };
const CASH_BANK  = { cr: "10100", cr_name: "Cash — Bank" };
const AP         = { cr: "20000", cr_name: "Trade Payables" };
const VAT_RECV   = { acc: "11100", name: "VAT Receivable" };

function vatPeriod(d: string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-P${Math.ceil((dt.getMonth()+1)/2)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { capture_queue_id, approved_by } = await req.json();
    if (!capture_queue_id) throw new Error("capture_queue_id required");

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: cap, error: cErr } = await db.from("capture_queue").select("*").eq("id", capture_queue_id).single();
    if (cErr || !cap) throw new Error(`Not found: ${capture_queue_id}`);
    if (["approved","auto_posted"].includes(cap.status))
      return new Response(JSON.stringify({ success: true, already_posted: true, expense_id: cap.expense_id }), { headers: JSON_H });

    const tid = cap.tenant_id, date = cap.document_date || new Date().toISOString().split("T")[0];
    const fy = `FY${new Date().getFullYear()}`, ctype = cap.capture_type || "expense_receipt";
    const inputVatAmt = cap.input_vat_claimable ? (cap.input_vat_amount || 0) : 0;
    const res: Record<string, string|null> = { expense_id: null, journal_entry_id: null, vat_transaction_id: null };

    // 1. Expense
    const desc = cap.vendor_name ? `${cap.vendor_name}${cap.document_number?" — "+cap.document_number:""}` : `${ctype.replace(/_/g," ")} — ${date}`;
    const { data: exp, error: expErr } = await db.from("expenses").insert({
      tenant_id: tid, expense_date: date, category: cap.suggested_category||"opex",
      subcategory: cap.suggested_subcategory||null, description: desc,
      amount_zar: cap.amount_zar||cap.amount_incl_vat||0, input_vat_amount: inputVatAmt,
      currency: cap.currency||"ZAR",
      supplier_id: cap.vendor_matched_id||null, document_id: cap.document_log_id||null,
    }).select("id").single();
    if (expErr) throw new Error(`Expense: ${expErr.message}`);
    res.expense_id = exp.id;

    // 2. Journal
    const drAcc = ACCOUNT_MAP[cap.suggested_subcategory||""] || DEFAULT_DR;
    const crAcc = ["supplier_invoice","utility_bill"].includes(ctype) ? AP : CASH_BANK;
    const gross = cap.amount_zar||cap.amount_incl_vat||0;
    const vatAmt = cap.input_vat_claimable ? (cap.input_vat_amount||0) : 0;
    const net = vatAmt > 0 ? (cap.amount_excl_vat||(gross-vatAmt)) : gross;
    const vendor = cap.vendor_name||"Vendor", ref = cap.document_number||date;

    const lines = [
      { account_code: drAcc.dr, account_name: drAcc.dr_name, debit_amount: Math.round(net*100)/100, credit_amount: 0, description: `${vendor} — ${ref}` },
      ...(vatAmt > 0 ? [{ account_code: VAT_RECV.acc, account_name: VAT_RECV.name, debit_amount: Math.round(vatAmt*100)/100, credit_amount: 0, description: `Input VAT — ${cap.sars_vat_number||"n/a"}` }] : []),
      { account_code: crAcc.cr, account_name: crAcc.cr_name, debit_amount: 0, credit_amount: Math.round(gross*100)/100, description: `${vendor} — ${date}` },
    ];
    const tDr = lines.reduce((s,l)=>s+l.debit_amount,0), tCr = lines.reduce((s,l)=>s+l.credit_amount,0);
    if (Math.abs(tDr-tCr) > 0.05) throw new Error(`Out of balance: Dr ${tDr.toFixed(2)} ≠ Cr ${tCr.toFixed(2)}`);

    const { data: je, error: jeErr } = await db.from("journal_entries").insert({
      tenant_id: tid, journal_date: date,
      reference: cap.document_number||`SC-${capture_queue_id.slice(0,8)}`,
      description: `${ctype.replace(/_/g," ").toUpperCase()} — ${vendor} — ${date}`,
      journal_type: "auto", status: "posted", posted_at: new Date().toISOString(), financial_year: fy,
    }).select("id").single();
    if (jeErr) throw new Error(`Journal: ${jeErr.message}`);
    await db.from("journal_lines").insert(lines.map((l,i)=>({ journal_id: je.id, tenant_id: tid, ...l, line_order: i+1 })));
    res.journal_entry_id = je.id;
    await db.from("expenses").update({ journal_entry_id: je.id }).eq("id", res.expense_id);

    // 3. VAT — trigger-based: expense_vat_sync fires on expenses INSERT with input_vat_amount > 0
    // Query the trigger-created vat_transaction row and link it back to the expense
    if (inputVatAmt > 0 && res.expense_id) {
      const { data: vtRow } = await db.from("vat_transactions")
        .select("id")
        .eq("source_table", "expenses")
        .eq("source_id", res.expense_id)
        .maybeSingle();
      if (vtRow) {
        res.vat_transaction_id = vtRow.id;
        await db.from("expenses").update({ vat_transaction_id: vtRow.id }).eq("id", res.expense_id);
      }
    }

    // 4. Update capture_queue
    await db.from("capture_queue").update({
      status: "approved", reviewed_by: approved_by||null, reviewed_at: new Date().toISOString(),
      expense_id: res.expense_id, journal_entry_id: res.journal_entry_id,
      vat_transaction_id: res.vat_transaction_id, updated_at: new Date().toISOString(),
    }).eq("id", capture_queue_id);

    // 5. Update document_log
    if (cap.document_log_id) {
      await db.from("document_log").update({
        status: "confirmed", expense_id: res.expense_id,
        confirmed_at: new Date().toISOString(), confirmed_by: approved_by||null,
      }).eq("id", cap.document_log_id);
    }

    return new Response(JSON.stringify({
      success: true, capture_queue_id, status: "approved", ...res,
      sars_compliant: cap.sars_compliant, input_vat_claimable: cap.input_vat_claimable,
      input_vat_amount: inputVatAmt, vat_period: res.vat_transaction_id ? vatPeriod(date) : null,
      vat_source: inputVatAmt > 0 ? "expense_trigger" : null,
    }), { headers: JSON_H });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auto-post-capture]", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: JSON_H });
  }
});
