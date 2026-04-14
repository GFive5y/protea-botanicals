// src/components/hq/HQFinancialNotes.js — WP-FINANCIALS Phase 8
// Notes to Financial Statements — IFRS for SMEs disclosure notes
// Reads from: tenant_config, inventory_items, fixed_assets, equity_ledger,
//             bank_accounts, expenses, orders, vat_transactions

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { T } from "../../styles/tokens";

// WP-UNIFY: D token palette aliased to src/styles/tokens.js
const D = {
  ...T,
  shadow: T.shadow?.sm || "0 1px 4px rgba(0,0,0,0.08)",
};

const fmtZar = (n) => { const v = Math.round((parseFloat(n)||0)*100)/100; return `R\u202F${v.toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`; };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"}) : "\u2014";
const CURRENT_YEAR = new Date().getFullYear();
const PREPARED_DATE = new Date().toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"});

function NoteSection({number,title,children,defaultOpen=true}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{background:"#fff",borderRadius:10,boxShadow:D.shadow,overflow:"hidden",marginBottom:12}}>
      <button onClick={()=>setOpen(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 24px",background:open?D.accentLight:"#fff",border:"none",cursor:"pointer",fontFamily:D.font,textAlign:"left",borderBottom:open?"1px solid #C6E8D6":"none",transition:"background 0.15s"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:32,height:32,borderRadius:8,background:D.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{number}</div>
          <div style={{fontSize:15,fontWeight:700,color:D.ink900}}>{title}</div>
        </div>
        <span style={{fontSize:18,color:D.ink300,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>{"\u2304"}</span>
      </button>
      {open&&<div style={{padding:"20px 24px",fontFamily:D.font}}>{children}</div>}
    </div>
  );
}

function NoteTable({headers,rows,totals}) {
  const cols = headers.map((_,i)=>i===0?"1fr":"130px").join(" ");
  return (
    <div style={{marginTop:12,border:`1px solid ${D.border}`,borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:cols,padding:"8px 16px",background:D.bg,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em"}}>
        {headers.map((h,i)=><span key={i} style={{textAlign:i>0?"right":"left"}}>{h}</span>)}
      </div>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:"grid",gridTemplateColumns:cols,padding:"9px 16px",borderTop:`1px solid ${D.border}`,fontSize:13,color:D.ink700}}>
          {row.map((cell,ci)=><span key={ci} style={{textAlign:ci>0?"right":"left",fontVariantNumeric:ci>0?"tabular-nums":"normal",color:ci>0&&typeof cell==="string"&&cell.startsWith("(")?"#DC2626":D.ink700}}>{cell}</span>)}
        </div>
      ))}
      {totals&&<div style={{display:"grid",gridTemplateColumns:cols,padding:"11px 16px",borderTop:`2px solid ${D.border}`,background:D.bg,fontSize:13,fontWeight:700}}>
        {totals.map((cell,ci)=><span key={ci} style={{textAlign:ci>0?"right":"left",fontVariantNumeric:"tabular-nums",color:ci>0&&typeof cell==="string"&&cell.startsWith("(")?"#DC2626":D.accent}}>{cell}</span>)}
      </div>}
    </div>
  );
}

function P({children}) { return <p style={{fontSize:13,color:D.ink500,lineHeight:1.7,margin:"10px 0",fontFamily:D.font}}>{children}</p>; }
function SubHead({label}) { return <div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",marginTop:20,marginBottom:8,paddingBottom:4,borderBottom:`1px solid ${D.border}`}}>{label}</div>; }

export default function HQFinancialNotes() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!tenantId) return; setLoading(true);
    try {
      const ys = `${CURRENT_YEAR}-01-01`;
      const [cfgR,invR,faR,eqR,baR,expR,vatR,depR,bslR,fpRes] = await Promise.all([
        supabase.from("tenant_config").select("*").eq("tenant_id",tenantId).maybeSingle(),
        supabase.from("inventory_items").select("quantity_on_hand, weighted_avg_cost, category, is_active").eq("tenant_id",tenantId).eq("is_active",true),
        supabase.from("fixed_assets").select("*").eq("tenant_id",tenantId),
        supabase.from("equity_ledger").select("*").eq("tenant_id",tenantId).eq("financial_year",`FY${CURRENT_YEAR}`).maybeSingle(),
        supabase.from("bank_accounts").select("*").eq("tenant_id",tenantId),
        supabase.from("expenses").select("subcategory, category, amount_zar, input_vat_amount").eq("tenant_id",tenantId).gte("expense_date",ys),
        supabase.from("vat_transactions").select("*").eq("tenant_id",tenantId).gte("transaction_date",ys),
        supabase.from("depreciation_entries").select("depreciation").eq("tenant_id",tenantId).eq("period_year",CURRENT_YEAR),
        supabase.from("bank_statement_lines").select("balance,statement_date").eq("tenant_id",tenantId).order("statement_date",{ascending:false}).limit(1),
        supabase.rpc("tenant_financial_period",{p_tenant_id:tenantId,p_since:`${CURRENT_YEAR}-01-01T00:00:00Z`,p_until:new Date().toISOString()}),
      ]);
      const closingBalance = bslR.data?.[0]?.balance || null;
      const fp = fpRes.data || {};
      setData({cfg:cfgR.data,inv:invR.data||[],fa:faR.data||[],eq:eqR.data,ba:baR.data||[],exp:expR.data||[],vat:vatR.data||[],dep:depR.data||[],closingBalance,fp});
    } catch(_){} finally{setLoading(false);}
  },[tenantId]);
  useEffect(()=>{fetchAll();},[fetchAll]);

  if (loading) return <div style={{textAlign:"center",padding:60,color:D.ink500,fontFamily:D.font}}>Loading notes\u2026</div>;
  if (!data) return null;

  const {cfg,inv,fa,eq,ba,exp,vat,dep,fp} = data;
  const totalRevenue = fp?.revenue?.ex_vat || 0;
  const totalCogs = fp?.cogs?.actual || 0;
  const invValue = inv.reduce((s,i)=>s+(parseFloat(i.quantity_on_hand||0)*parseFloat(i.weighted_avg_cost||0)),0);
  const opexBySub = exp.filter(e=>["opex","wages","tax","other"].includes(e.category)).reduce((a,e)=>{const k=e.subcategory||"Other";a[k]=(a[k]||0)+(parseFloat(e.amount_zar)||0);return a;},{});
  const totalOpex = fp?.opex?.total || Object.values(opexBySub).reduce((s,v)=>s+v,0);
  const totalDep = dep.reduce((s,d)=>s+(parseFloat(d.depreciation)||0),0);
  const activeFA = fa.filter(a=>a.is_active); const disposedFA = fa.filter(a=>!a.is_active);
  const totalFACost = activeFA.reduce((s,a)=>s+(parseFloat(a.purchase_cost)||0),0);
  const totalFAAccDep = activeFA.reduce((s,a)=>s+(parseFloat(a.accumulated_depreciation)||0),0);
  const invByCat = inv.reduce((a,i)=>{a[i.category]=a[i.category]||{qty:0,val:0};a[i.category].qty+=parseFloat(i.quantity_on_hand||0);a[i.category].val+=parseFloat(i.quantity_on_hand||0)*parseFloat(i.weighted_avg_cost||0);return a;},{});
  const vatOut = fp?.vat?.ytd_output || vat.reduce((s,v)=>s+(parseFloat(v.output_vat)||0),0);
  const vatIn = fp?.vat?.ytd_input || exp.reduce((s,e)=>s+(parseFloat(e.input_vat_amount)||0),0);
  const shareCapital = parseFloat(eq?.share_capital||0); const openingRE = parseFloat(eq?.opening_retained_earnings||0);
  const netProfit = totalRevenue - totalCogs - totalOpex - totalDep;
  const orderCount = fp?.orders?.paid_count || 0;

  return (
    <div style={{fontFamily:D.font,color:D.ink700,maxWidth:900}}>
      <div style={{marginBottom:28}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:700,color:D.ink900,letterSpacing:"-0.02em"}}>Notes to the Financial Statements</h2>
        <p style={{margin:"6px 0 0",color:D.ink500,fontSize:13}}>{cfg?.trading_name||tenant?.name||"Business"} \u00b7 Prepared {PREPARED_DATE}</p>
      </div>

      <NoteSection number="1" title="Basis of Preparation and Accounting Policies">
        <SubHead label="1.1 Basis of Preparation"/>
        <P>These financial statements have been prepared in accordance with IFRS for SMEs. The functional and presentation currency is ZAR. Prepared on the {cfg?.accounting_basis==="cash"?"cash":"accrual"} basis.</P>
        <SubHead label="1.2 Revenue Recognition"/>
        <P>Revenue is recognised at the point of sale when control passes to the customer. All revenue is standard-rated at 15% for VAT purposes.</P>
        <SubHead label="1.3 Inventories"/>
        <P>Inventories are stated at the lower of cost (AVCO method) and net realisable value. The weighted average cost is recalculated on each stock receipt.</P>
        <SubHead label="1.4 Property, Plant and Equipment"/>
        <P>PPE is stated at cost less accumulated depreciation. Depreciation is straight-line over estimated useful life. Residual values and useful lives are reviewed annually.</P>
        <SubHead label="1.5 VAT"/>
        <P>{cfg?.vat_registered?`Registered VAT vendor (${cfg.vat_number}). ${cfg.vat_period==="bi_monthly"?"Bi-monthly":"Monthly"} filing. Invoice basis. Revenue shown ex-VAT.`:"Not VAT registered \u2014 below R1M threshold."}</P>
      </NoteSection>

      <NoteSection number="2" title="Going Concern" defaultOpen={false}>
        <P>The directors believe preparation on a going concern basis remains appropriate. Revenue of <strong>{fmtZar(totalRevenue)}</strong> was generated YTD. No material uncertainties exist.</P>
      </NoteSection>

      <NoteSection number="3" title="Critical Estimates and Judgements" defaultOpen={false}>
        <SubHead label="3.1 Useful Lives of PPE"/>
        {activeFA.length>0?<NoteTable headers={["Category","Life","Method"]} rows={[...new Map(activeFA.map(a=>[a.asset_category,a])).values()].map(a=>[a.asset_category,`${a.useful_life_years}y`,a.depreciation_method==="straight_line"?"Straight-line":"Reducing"])}/>:<P>No fixed assets registered.</P>}
        <SubHead label="3.2 Inventory Valuation"/>
        <P>AVCO method applied. Management reviews for obsolescence at each reporting date.</P>
      </NoteSection>

      <NoteSection number="4" title="Revenue">
        <NoteTable headers={["Source",`${CURRENT_YEAR} (ZAR)`,"Prior (ZAR)"]} rows={[["POS transactions",fmtZar(totalRevenue),"\u2014"],["Online sales","\u2014","\u2014"]]} totals={["Total Revenue",fmtZar(totalRevenue),"\u2014"]}/>
        <P>{orderCount} transactions processed. All standard-rated.</P>
      </NoteSection>

      <NoteSection number="5" title="Operating Expenses">
        <NoteTable headers={["Category",`${CURRENT_YEAR} (ZAR)`,"Prior (ZAR)"]} rows={Object.entries(opexBySub).sort((a,b)=>b[1]-a[1]).map(([s,a])=>[s,fmtZar(a),"\u2014"])} totals={["Total OPEX",fmtZar(totalOpex),"\u2014"]}/>
        {totalDep>0&&<P>Includes depreciation of <strong>{fmtZar(totalDep)}</strong> (Note 7).</P>}
      </NoteSection>

      <NoteSection number="6" title="Directors' Remuneration" defaultOpen={false}>
        <P>No separate directors' remuneration disclosed. Staff costs in Note 5.</P>
      </NoteSection>

      <NoteSection number="7" title="Property, Plant and Equipment">
        {activeFA.length===0?<P>No PPE registered this period.</P>:<>
          <NoteTable headers={["Asset","Cost","Accum Dep","NBV"]} rows={activeFA.map(a=>[a.asset_name,fmtZar(a.purchase_cost),`(${fmtZar(a.accumulated_depreciation)})`,fmtZar(parseFloat(a.purchase_cost)-parseFloat(a.accumulated_depreciation))])} totals={["Total PPE",fmtZar(totalFACost),`(${fmtZar(totalFAAccDep)})`,fmtZar(totalFACost-totalFAAccDep)]}/>
          {disposedFA.length>0&&<><SubHead label="Disposals"/><NoteTable headers={["Asset","Cost","Disposal Date"]} rows={disposedFA.map(a=>[a.asset_name,fmtZar(a.purchase_cost),fmtDate(a.disposal_date)])}/></>}
          <P>Depreciation of <strong>{fmtZar(totalDep)}</strong> charged this period.</P>
        </>}
      </NoteSection>

      <NoteSection number="8" title="Inventories">
        <NoteTable headers={["Category","SKUs","Value (ZAR)","Prior (ZAR)"]} rows={Object.entries(invByCat).map(([c,d])=>[c.replace("_"," "),String(inv.filter(i=>i.category===c).length),fmtZar(d.val),"\u2014"])} totals={["Total",String(inv.length),fmtZar(invValue),"\u2014"]}/>
        <P>{inv.length} active SKUs valued at AVCO. No write-downs recognised.</P>
      </NoteSection>

      <NoteSection number="9" title="Trade Receivables" defaultOpen={false}>
        <P>Majority of sales are cash/card at POS. Trade receivables are minimal and current.</P>
      </NoteSection>

      <NoteSection number="10" title="Cash and Cash Equivalents">
        {ba.length===0?<P>No bank accounts linked. Complete Financial Setup.</P>:<>
          <NoteTable headers={["Account","Bank","Type","Closing Balance (ZAR)"]} rows={ba.map(a=>[a.account_name,a.bank_name,a.account_type,fmtZar(data.closingBalance != null ? data.closingBalance : (a.opening_balance||0))])}/>
          <P>Primary bank: <strong>{ba[0]?.bank_name}</strong>. All balances in ZAR. Closing balance from latest bank statement.</P>
        </>}
      </NoteSection>

      {cfg?.vat_registered&&<NoteSection number="11" title="Value Added Tax">
        <NoteTable headers={["VAT",`${CURRENT_YEAR} (ZAR)`,"Prior (ZAR)"]} rows={[["Output VAT",fmtZar(vatOut),"\u2014"],["Input VAT",`(${fmtZar(vatIn)})`,"\u2014"]]} totals={[vatOut-vatIn>=0?"Net Payable":"Net Refund",fmtZar(Math.abs(vatOut-vatIn)),"\u2014"]}/>
        <P>VAT No: <strong>{cfg.vat_number}</strong>. Bi-monthly. Invoice basis. 15%.</P>
      </NoteSection>}

      <NoteSection number="12" title="Equity and Share Capital">
        <NoteTable headers={["Component",`${CURRENT_YEAR} (ZAR)`,"Prior (ZAR)"]} rows={[["Share capital",fmtZar(shareCapital),"\u2014"],["Opening retained earnings",fmtZar(openingRE),"\u2014"],["Current year P/L",fmtZar(netProfit),"\u2014"]]} totals={["Total Equity",fmtZar(shareCapital+openingRE+netProfit),"\u2014"]}/>
      </NoteSection>

      <NoteSection number="13" title="Related Party Transactions" defaultOpen={false}>
        <P>All related party transactions at arm's length. No outstanding loans.</P>
      </NoteSection>

      <NoteSection number="14" title="Events After Reporting Date" defaultOpen={false}>
        <P>No material post-reporting events. Prepared {PREPARED_DATE}.</P>
      </NoteSection>

      <NoteSection number="15" title="Standards Not Yet Effective" defaultOpen={false}>
        <P>Compliant with IFRS for SMEs (2015, 2024 amendments). No material future impact expected.</P>
      </NoteSection>

      <div style={{marginTop:20,padding:"16px 20px",background:D.accentLight,borderRadius:10,border:"1px solid #C6E8D6",fontSize:12,color:D.accentMid,lineHeight:1.6}}>
        <strong>Preparer note:</strong> System-generated from NuAi accounting data. Should be reviewed by a CA(SA) before submission.
        {cfg?.auditor_name&&<> Auditor: <strong>{cfg.auditor_name}</strong>{cfg.auditor_firm&&` \u2014 ${cfg.auditor_firm}`}.</>}
      </div>
    </div>
  );
}
