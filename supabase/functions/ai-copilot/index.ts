// supabase/functions/ai-copilot/index.ts
// v67 — 100ms per word emission
//
// Root cause of "flash gordon" at 25ms:
// Browser buffers multiple SSE events before reader.read() returns them.
// flushSync calls in a tight for-loop commit to React but browser only
// paints ONCE after the loop (JS must yield for repaint).
// 100ms between words forces real TCP packet separation so fewer words
// buffer per reader.read() call. Combined with RAF fix on client.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { verifyTenantAuth } from "../_shared/verifyTenantAuth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOOL_ROUNDS = 8;

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

const NUAI_ALLOWED_TABLES = new Set([
  "inventory_items","stock_movements","stock_transfers","stock_transfer_items",
  "production_runs","batches","food_recipes","food_recipe_lines",
  "food_ingredients","haccp_log_entries","haccp_control_points",
  "haccp_nonconformances","temperature_logs","cold_chain_locations",
  "recall_events","document_log","purchase_orders","purchase_order_items",
  "invoices","expenses","suppliers","leave_requests","staff_profiles",
  "user_profiles","loyalty_transactions","scan_logs","qr_codes",
  "system_alerts","tenants","tenant_config","orders","order_items",
  "customers","journal_entries","journal_lines","vat_transactions",
  "depreciation_entries","bank_statement_lines","fixed_assets",
  "chart_of_accounts","equity_ledger","capture_queue","loyalty_ai_log",
  "financial_statement_status","vat_period_filings","notification_log",
  "stock_receipts","stock_receipt_lines","financial_year_archive",
  "products","scans","redemptions","wholesale_partners",
]);

const NO_TENANT_ID = new Set(["scan_logs","scans","order_items"]);

const TOOLS = [
  {
    name: "query_database",
    description: "Read-only query on any NuAi table. Filters by tenant_id automatically. Returns up to 100 rows. Use for single-table lookups.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string" as const },
        columns: { type: "string" as const },
        filters: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              column: { type: "string" as const },
              op: { type: "string" as const, enum: ["eq","neq","gt","gte","lt","lte","is","in","ilike"] },
              value: {},
            },
            required: ["column","op","value"],
          },
        },
        order: { type: "object" as const, properties: { column: { type: "string" as const }, ascending: { type: "boolean" as const } } },
        limit: { type: "number" as const },
      },
      required: ["table"],
    },
  },
  {
    name: "get_financial_summary",
    description: "Real-time MTD/YTD: revenue ex-VAT, expenses, gross profit, orders count, VAT position.",
    input_schema: { type: "object" as const, properties: { period: { type: "string" as const, enum: ["mtd","ytd"] } }, required: ["period"] },
  },
  {
    name: "get_alerts",
    description: "Unacknowledged system alerts and low-stock items.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_sales_breakdown",
    description: "Sales by product for a period. Joins orders→order_items. Use for: best sellers, product ranking, weekly/monthly sales per product.",
    input_schema: {
      type: "object" as const,
      properties: { period: { type: "string" as const, enum: ["today","week","month","ytd"] } },
      required: ["period"],
    },
  },
];

async function executeTool(name: string, input: Record<string,unknown>, tenantId: string|null): Promise<string> {
  const supabase = getSupabaseClient();
  switch (name) {
    case "query_database": {
      const table=input.table as string;
      if (!NUAI_ALLOWED_TABLES.has(table)) return JSON.stringify({error:`Table "${table}" not in allowlist.`});
      const columns=(input.columns as string)||"*";
      const filters=(input.filters as Array<{column:string;op:string;value:unknown}>)||[];
      const order=input.order as {column:string;ascending:boolean}|undefined;
      const limit=Math.min((input.limit as number)||20,100);
      let q=supabase.from(table).select(columns).limit(limit);
      if (tenantId&&!NO_TENANT_ID.has(table)) q=q.eq("tenant_id",tenantId);
      for (const f of filters) {
        if (f.column==="tenant_id") continue;
        if (f.op==="eq") q=q.eq(f.column,f.value);
        else if (f.op==="neq") q=q.neq(f.column,f.value);
        else if (f.op==="gt") q=q.gt(f.column,f.value);
        else if (f.op==="gte") q=q.gte(f.column,f.value);
        else if (f.op==="lt") q=q.lt(f.column,f.value);
        else if (f.op==="lte") q=q.lte(f.column,f.value);
        else if (f.op==="is") q=q.is(f.column,f.value==="null"?null:f.value as boolean|null);
        else if (f.op==="ilike") q=q.ilike(f.column,f.value as string);
        else if (f.op==="in") q=q.in(f.column,Array.isArray(f.value)?f.value:[f.value]);
      }
      if (order) q=q.order(order.column,{ascending:order.ascending??false});
      const {data,error}=await q;
      if (error) return JSON.stringify({error:error.message});
      return JSON.stringify({table,row_count:data?.length??0,rows:data});
    }
    case "get_financial_summary": {
      if (!tenantId) return JSON.stringify({error:"No tenant context."});
      const period=(input.period as string)||"mtd";
      const now=new Date();
      const startDate=period==="mtd"?new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0]:`${now.getFullYear()}-01-01`;
      const periodId=`${now.getFullYear()}-P${Math.ceil((now.getMonth()+1)/2)}`;
      const [oR,eR,vR]=await Promise.all([
        supabase.from("orders").select("total").eq("tenant_id",tenantId).eq("status","paid").gte("created_at",startDate+"T00:00:00"),
        supabase.from("expenses").select("amount_zar").eq("tenant_id",tenantId).gte("expense_date",startDate),
        supabase.from("vat_transactions").select("output_vat,input_vat").eq("tenant_id",tenantId).eq("vat_period",periodId),
      ]);
      const ri=(oR.data||[]).reduce((s:number,o:Record<string,unknown>)=>s+(parseFloat(o.total as string)||0),0);
      const re=Math.round((ri/1.15)*100)/100;
      const ex=(eR.data||[]).reduce((s:number,e:Record<string,unknown>)=>s+(parseFloat(e.amount_zar as string)||0),0);
      const ov=(vR.data||[]).reduce((s:number,t:Record<string,unknown>)=>s+(parseFloat(t.output_vat as string)||0),0);
      const iv=(vR.data||[]).reduce((s:number,t:Record<string,unknown>)=>s+(parseFloat(t.input_vat as string)||0),0);
      return JSON.stringify({period,start:startDate,orders_count:(oR.data||[]).length,revenue_excl_vat:re,revenue_incl_vat:Math.round(ri*100)/100,total_expenses:Math.round(ex*100)/100,gross_profit_estimate:Math.round((re-ex)*100)/100,vat_output:Math.round(ov*100)/100,vat_input:Math.round(iv*100)/100,vat_net_payable:Math.round((ov-iv)*100)/100});
    }
    case "get_alerts": {
      if (!tenantId) return JSON.stringify({error:"No tenant context."});
      const [aR,sR]=await Promise.all([
        supabase.from("system_alerts").select("severity,alert_type,message").eq("tenant_id",tenantId).is("acknowledged_at",null).order("created_at",{ascending:false}).limit(20),
        supabase.from("inventory_items").select("name,quantity_on_hand,reorder_level,category").eq("tenant_id",tenantId).eq("is_active",true).not("reorder_level","is",null).limit(200),
      ]);
      const al=aR.data||[];
      const lo=(sR.data||[]).filter((i:Record<string,unknown>)=>(i.reorder_level as number)>0&&(i.quantity_on_hand as number)<=(i.reorder_level as number)).map((i:Record<string,unknown>)=>({name:i.name,on_hand:i.quantity_on_hand,reorder_level:i.reorder_level,category:i.category}));
      return JSON.stringify({unacknowledged_alerts:al.length,critical:al.filter((a:Record<string,unknown>)=>a.severity==="critical").length,warning:al.filter((a:Record<string,unknown>)=>a.severity==="warning").length,recent_alerts:al.slice(0,5).map((a:Record<string,unknown>)=>({severity:a.severity,type:a.alert_type,message:a.message})),low_stock_count:lo.length,low_stock_items:lo.slice(0,8)});
    }
    case "get_sales_breakdown": {
      if (!tenantId) return JSON.stringify({error:"No tenant context."});
      const period=(input.period as string)||"week";
      const now=new Date();
      let sd: string;
      if (period==="today") sd=now.toISOString().split("T")[0];
      else if (period==="week") { const d=new Date(now); d.setDate(d.getDate()-7); sd=d.toISOString().split("T")[0]; }
      else if (period==="month") sd=new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0];
      else sd=`${now.getFullYear()}-01-01`;
      const {data:orders,error:oE}=await supabase.from("orders").select("id,total,created_at").eq("tenant_id",tenantId).eq("status","paid").gte("created_at",sd+"T00:00:00").limit(500);
      if (oE) return JSON.stringify({error:oE.message});
      if (!orders?.length) return JSON.stringify({period,start:sd,total_orders:0,total_revenue:0,top_products:[],note:"No paid orders in this period."});
      const ids=orders.map((o:Record<string,unknown>)=>o.id as string);
      const rev=orders.reduce((s:number,o:Record<string,unknown>)=>s+(parseFloat(o.total as string)||0),0);
      const {data:items,error:iE}=await supabase.from("order_items").select("order_id,product_name,quantity,unit_price,line_total").in("order_id",ids);
      if (iE) return JSON.stringify({error:iE.message});
      if (!items?.length) return JSON.stringify({period,start:sd,total_orders:orders.length,total_revenue:Math.round(rev*100)/100,top_products:[],note:"No line-item detail. Sales tracked at order level only."});
      const pm: Record<string,{name:string;units_sold:number;revenue:number}>={};
      for (const item of items) {
        const k=(item.product_name as string)||"Unknown";
        if (!pm[k]) pm[k]={name:k,units_sold:0,revenue:0};
        pm[k].units_sold+=(item.quantity as number)||1;
        pm[k].revenue+=parseFloat((item.line_total||item.unit_price) as string)||0;
      }
      const top=Object.values(pm).sort((a,b)=>b.units_sold-a.units_sold).slice(0,10).map(p=>({...p,revenue:Math.round(p.revenue*100)/100}));
      return JSON.stringify({period,start:sd,total_orders:orders.length,total_revenue:Math.round(rev*100)/100,total_revenue_excl_vat:Math.round((rev/1.15)*100)/100,top_products_by_units:top});
    }
    default: return JSON.stringify({error:`Unknown tool: ${name}`});
  }
}

function buildFallbackSystemPrompt(uc: Record<string,unknown>|null): string {
  return `You are ProteaAI for a South African ERP. Role: ${(uc?.role as string)||"guest"}. Use ZAR. Keep responses concise — under 120 words unless detail is specifically requested.`;
}

async function runToolLoop(msgs: Array<Record<string,unknown>>, system: string, apiKey: string, tenantId: string|null): Promise<{messages: Array<Record<string,unknown>>;finalText: string}> {
  let cm=[...msgs];
  let ft="";
  for (let r=0;r<MAX_TOOL_ROUNDS;r++) {
    const res=await fetch(ANTHROPIC_URL,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:MODEL,system,messages:cm,tools:TOOLS,max_tokens:1000,temperature:0.4})});
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    const d=await res.json();
    if (d.stop_reason!=="tool_use") {
      ft=(d.content||[]).filter((b:Record<string,unknown>)=>b.type==="text").map((b:Record<string,unknown>)=>b.text as string).join("\n");
      cm=[...cm,{role:"assistant",content:d.content}];
      break;
    }
    const tu=(d.content||[]).filter((b:Record<string,unknown>)=>b.type==="tool_use");
    cm=[...cm,{role:"assistant",content:d.content}];
    const tr=await Promise.all(tu.map(async (t:Record<string,unknown>)=>{
      console.log(`[v67] Tool: ${t.name}`);
      const result=await executeTool(t.name as string,(t.input as Record<string,unknown>)||{},tenantId);
      return {type:"tool_result",tool_use_id:t.id,content:result};
    }));
    cm=[...cm,{role:"user",content:tr} as any];
    if (r===MAX_TOOL_ROUNDS-1) ft="Unable to complete within processing limit. Please ask a more specific question.";
  }
  return {messages:cm,finalText:ft};
}

async function getNonStreamText(msgs: Array<Record<string,unknown>>, system: string, apiKey: string): Promise<string> {
  const res=await fetch(ANTHROPIC_URL,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:MODEL,system,messages:msgs,max_tokens:600,temperature:0.4})});
  if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
  const d=await res.json();
  return (d.content||[]).filter((b:Record<string,unknown>)=>b.type==="text").map((b:Record<string,unknown>)=>b.text as string).join("\n");
}

// streamWords v67 — 100ms per word
// At 100ms, each TCP packet has 100ms to flush before the next write.
// This forces real network separation so the browser receives tokens
// one or two at a time instead of batching many per reader.read().
// Combined with requestAnimationFrame on the client for true word-by-word paint.
async function streamWords(text: string): Promise<Response> {
  const {readable,writable}=new TransformStream();
  const writer=writable.getWriter();
  const enc=new TextEncoder();
  (async()=>{
    try {
      const words=text.match(/\S+\s*/g)||[];
      for (const word of words) {
        await writer.write(enc.encode(`data: ${JSON.stringify({token:word})}\n\n`));
        await new Promise(r=>setTimeout(r,100));
      }
    } catch(e) { console.error("[v67] streamWords:",e); }
    finally {
      try { await writer.write(enc.encode("data: [DONE]\n\n")); await writer.close(); } catch {}
    }
  })();
  return new Response(readable,{headers:{...CORS_HEADERS,"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive"}});
}

serve(async(req: Request)=>{
  if (req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS_HEADERS});
  if (req.method!=="POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{...CORS_HEADERS,"Content-Type":"application/json"}});
  try {
    const body=await req.json();
    const {messages,userContext=null,systemOverride=null,stream=false}=body;
    if (messages?.length===1&&messages[0]?.content==="__health_check__") return new Response(JSON.stringify({reply:"ok"}),{status:200,headers:{...CORS_HEADERS,"Content-Type":"application/json"}});
    if (!messages||!Array.isArray(messages)||messages.length===0) return new Response(JSON.stringify({error:"No messages."}),{status:400,headers:{...CORS_HEADERS,"Content-Type":"application/json"}});
    // SAFETY-078: Verify caller is authorized for tenant context
    const _tenantId=(userContext?.tenantId as string)||null;
    if(_tenantId){const auth=await verifyTenantAuth(req,{mode:"tenant",tenantId:_tenantId});if(!auth.ok)return new Response(JSON.stringify({error:auth.error}),{status:auth.status,headers:{...CORS_HEADERS,"Content-Type":"application/json"}});}
    const apiKey=Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      const msg="AI not configured.";
      if (stream) return new Response(`data: ${JSON.stringify({token:msg})}\n\ndata: [DONE]\n\n`,{headers:{...CORS_HEADERS,"Content-Type":"text/event-stream"}});
      return new Response(JSON.stringify({reply:msg,error:"no key"}),{status:200,headers:{...CORS_HEADERS,"Content-Type":"application/json"}});
    }
    const tenantId=(userContext?.tenantId as string)||null;
    const role=(userContext?.role as string)||null;
    const isHQ=!!(userContext?.isHQ);
    const system: string=systemOverride||buildFallbackSystemPrompt(userContext);
    const am=messages.map((m: Record<string,unknown>)=>({role:m.role==="assistant"?"assistant" as const:"user" as const,content:m.content}));
    if (stream) {
      const hasTools=isHQ||role==="admin";
      const lc=String(messages[messages.length-1]?.content||"").trim();
      const trivial=lc.length<15||/^(hi|hello|thanks|ok|sure|great|yes|no|good|cool|nice|got it)\b/i.test(lc);
      if (!hasTools||trivial) {
        const text=await getNonStreamText(am,system,apiKey);
        return await streamWords(text);
      }
      console.log(`[v67] Tool stream role:${role} isHQ:${isHQ}`);
      const {finalText}=await runToolLoop(am,system,apiKey,tenantId);
      return await streamWords(finalText||"I wasn't able to get a response. Please try again.");
    }
    const {finalText}=await runToolLoop(am,system,apiKey,tenantId);
    return new Response(JSON.stringify({reply:finalText||"No response.",model:MODEL,usage:null,error:null}),{status:200,headers:{...CORS_HEADERS,"Content-Type":"application/json"}});
  } catch(e) {
    console.error("[v67] Error:",e);
    return new Response(JSON.stringify({reply:null,error:(e as Error).message}),{status:500,headers:{...CORS_HEADERS,"Content-Type":"application/json"}});
  }
});
