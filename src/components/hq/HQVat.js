// src/components/hq/HQVat.js — WP-FINANCIALS Phase 6
// VAT Module: VAT201 return preparation, output/input VAT, period filing
// Tables: vat_transactions, tenant_config

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

const D = {
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  ink900: "#0D0D0D", ink700: "#1F2937", ink500: "#6B7280",
  ink300: "#D1D5DB", ink150: "#E5E7EB", ink075: "#F9FAFB",
  accent: "#1A3D2B", accentMid: "#2D6A4F", accentLit: "#ECFDF5",
  success: "#059669", successBg: "#ECFDF5", successBd: "#6EE7B7",
  danger: "#DC2626", dangerBg: "#FEF2F2", dangerBd: "#FECACA",
  warning: "#D97706", warningBg: "#FFFBEB", warningBd: "#FDE68A",
  info: "#2563EB", infoBg: "#EFF6FF", infoBd: "#BFDBFE",
  shadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
};

const fmtZar = (n) => `R\u202F${(Math.abs(parseFloat(n)||0)).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}) : "\u2014";

function getBiMonthlyPeriods(year=new Date().getFullYear()) {
  return [
    {id:`${year}-P1`,label:`Jan\u2013Feb ${year}`,months:["01","02"],dueDate:`${year}-03-31`,start:`${year}-01-01`,end:`${year}-02-28`},
    {id:`${year}-P2`,label:`Mar\u2013Apr ${year}`,months:["03","04"],dueDate:`${year}-05-31`,start:`${year}-03-01`,end:`${year}-04-30`},
    {id:`${year}-P3`,label:`May\u2013Jun ${year}`,months:["05","06"],dueDate:`${year}-07-31`,start:`${year}-05-01`,end:`${year}-06-30`},
    {id:`${year}-P4`,label:`Jul\u2013Aug ${year}`,months:["07","08"],dueDate:`${year}-09-30`,start:`${year}-07-01`,end:`${year}-08-31`},
    {id:`${year}-P5`,label:`Sep\u2013Oct ${year}`,months:["09","10"],dueDate:`${year}-11-30`,start:`${year}-09-01`,end:`${year}-10-31`},
    {id:`${year}-P6`,label:`Nov\u2013Dec ${year}`,months:["11","12"],dueDate:`${year+1}-01-31`,start:`${year}-11-01`,end:`${year}-12-31`},
  ];
}
function currentPeriodId() { const m=new Date().getMonth()+1; return `${new Date().getFullYear()}-P${Math.ceil(m/2)}`; }
function isOverdue(d) { return d && new Date(d)<new Date(); }

function KPICard({label,value,sub,color,icon,highlight}) {
  return <div style={{background:highlight||"#fff",borderRadius:12,padding:"20px 22px",boxShadow:D.shadow,flex:1,minWidth:160,border:highlight?`1px solid ${D.ink150}`:"none"}}>
    <div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:D.font,marginBottom:10,display:"flex",gap:6}}>{icon&&<span>{icon}</span>}{label}</div>
    <div style={{fontSize:26,fontWeight:700,color:color||D.accent,fontVariantNumeric:"tabular-nums",fontFamily:D.font,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:D.ink500,marginTop:6,fontFamily:D.font}}>{sub}</div>}
  </div>;
}

function SHead({label,icon}) {
  return <div style={{padding:"8px 20px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:D.font,display:"flex",gap:6,alignItems:"center"}}>{icon&&<span>{icon}</span>}{label}</div>;
}

function VAT201Row({field,label,value,highlight,note}) {
  return <div style={{display:"grid",gridTemplateColumns:"48px 1fr 160px",padding:"12px 20px",borderBottom:`1px solid ${D.ink150}`,background:highlight?D.accentLit:"transparent",alignItems:"center"}}>
    <div style={{width:32,height:32,borderRadius:6,background:highlight?D.accent:D.ink150,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:highlight?"#fff":D.ink500,fontFamily:D.font}}>{field}</div>
    <div style={{paddingLeft:12}}><div style={{fontSize:13,color:D.ink700,fontFamily:D.font}}>{label}</div>{note&&<div style={{fontSize:11,color:D.ink500,marginTop:2,fontFamily:D.font}}>{note}</div>}</div>
    <div style={{fontSize:15,fontWeight:700,color:highlight?D.accent:D.ink700,textAlign:"right",fontVariantNumeric:"tabular-nums",fontFamily:D.font}}>{value}</div>
  </div>;
}

export default function HQVat() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [vatConfig, setVatConfig] = useState(null);
  const [vatTxns, setVatTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodId());
  const [filingStatuses, setFilingStatuses] = useState({});
  const [toast, setToast] = useState(null);
  const [view, setView] = useState("dashboard");
  const periods = getBiMonthlyPeriods();
  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [cfgRes,txnRes] = await Promise.all([
        supabase.from("tenant_config").select("vat_registered, vat_number, vat_period, vat_rate, trading_name, company_reg_number, registered_address").eq("tenant_id",tenantId).maybeSingle(),
        supabase.from("vat_transactions").select("*").eq("tenant_id",tenantId).order("transaction_date",{ascending:false}),
      ]);
      setVatConfig(cfgRes.data);
      setVatTxns(txnRes.data||[]);
    } catch(e) { showToast("Load failed: "+e.message,"error"); }
    finally { setLoading(false); }
  },[tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const periodData = (pid) => {
    const txns = vatTxns.filter(t=>t.vat_period===pid);
    const outputVat = txns.reduce((s,t)=>s+(parseFloat(t.output_vat)||0),0);
    const inputVat = txns.reduce((s,t)=>s+(parseFloat(t.input_vat)||0),0);
    const exclusiveRev = txns.filter(t=>t.transaction_type==="output").reduce((s,t)=>s+(parseFloat(t.exclusive_amount)||0),0);
    const inclusiveRev = txns.filter(t=>t.transaction_type==="output").reduce((s,t)=>s+(parseFloat(t.inclusive_amount)||0),0);
    return { outputVat, inputVat, exclusiveRev, inclusiveRev, netVat:outputVat-inputVat, txnList:txns, count:txns.length };
  };

  const current = periodData(selectedPeriod);
  const selectedPeriodDef = periods.find(p=>p.id===selectedPeriod);
  const markFiled = (pid) => { setFilingStatuses(s=>({...s,[pid]:"filed"})); showToast(`VAT201 for ${periods.find(p=>p.id===pid)?.label} marked as filed.`); };

  const exportVAT201 = () => {
    const p = selectedPeriodDef;
    const rows = [["VAT201",vatConfig?.trading_name||""],["VAT No",vatConfig?.vat_number||""],["Period",p?.label||""],["Due",p?.dueDate||""],
      [],["FIELD","DESCRIPTION","ZAR"],["1","Supplies excl VAT",current.exclusiveRev.toFixed(2)],["4","Supplies incl VAT",current.inclusiveRev.toFixed(2)],
      ["12","Output tax",current.outputVat.toFixed(2)],["16","Input tax",current.inputVat.toFixed(2)],["20","Net VAT",current.netVat.toFixed(2)],
      [],["TRANSACTIONS"],["Date","Description","Type","Output","Input"],
      ...current.txnList.map(t=>[t.transaction_date,t.description,t.transaction_type,(parseFloat(t.output_vat)||0).toFixed(2),(parseFloat(t.input_vat)||0).toFixed(2)])];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`VAT201-${selectedPeriod}.csv`; a.click();
    showToast("Exported.");
  };

  const card = {background:"#fff",borderRadius:12,boxShadow:D.shadow,overflow:"hidden",marginBottom:20};

  if (loading) return <div style={{textAlign:"center",padding:60,color:D.ink500,fontFamily:D.font}}>Loading VAT\u2026</div>;

  if (!vatConfig?.vat_registered) return (
    <div style={{fontFamily:D.font}}>
      <h2 style={{fontSize:22,fontWeight:700,margin:"0 0 8px",color:D.ink900}}>VAT</h2>
      <div style={{padding:"40px 32px",background:D.warningBg,border:`1px solid ${D.warningBd}`,borderRadius:12,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>{"\uD83E\uDDFE"}</div>
        <div style={{fontSize:16,fontWeight:700,color:D.warning,marginBottom:6}}>VAT not registered</div>
        <div style={{fontSize:13,color:D.ink500}}>Update Financial Setup if recently registered with SARS.</div>
      </div>
    </div>
  );

  // ── VAT201 VIEW ──
  if (view==="vat201") {
    const p = selectedPeriodDef;
    const isFiled = filingStatuses[selectedPeriod]==="filed";
    const overdue = isOverdue(p?.dueDate)&&!isFiled;
    return (
      <div style={{fontFamily:D.font,color:D.ink700}}>
        {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600}}>{toast.msg}</div>}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <button onClick={()=>setView("dashboard")} style={{padding:"7px 14px",border:`1px solid ${D.ink150}`,borderRadius:8,background:"#fff",color:D.ink500,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>{"\u2190"} Dashboard</button>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:D.ink900}}>VAT201 — {p?.label}</h2>
          {isFiled&&<span style={{padding:"3px 12px",borderRadius:12,fontSize:11,fontWeight:700,background:D.successBg,color:D.success,border:`1px solid ${D.successBd}`}}>{"\u2713"} Filed</span>}
          {overdue&&<span style={{padding:"3px 12px",borderRadius:12,fontSize:11,fontWeight:700,background:D.dangerBg,color:D.danger,border:`1px solid ${D.dangerBd}`}}>{"\u26A0"} Overdue</span>}
        </div>
        <div style={{...card,padding:24}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16}}>
            {[["Taxpayer",vatConfig?.trading_name||tenant?.name||"\u2014"],["VAT No",vatConfig?.vat_number||"\u2014"],["Period",p?.label||""],["Due",fmtDate(p?.dueDate)],["Type","Bi-Monthly"],["Rate",`${((parseFloat(vatConfig?.vat_rate)||0.15)*100).toFixed(0)}%`],["Address",vatConfig?.registered_address||"See Setup"],["Status",isFiled?"Filed":overdue?"Overdue":"Open"]].map(([l,v])=>(
              <div key={l}><div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4,fontFamily:D.font}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:D.ink700,fontFamily:D.font}}>{v}</div></div>
            ))}
          </div>
        </div>
        <div style={card}>
          <SHead label="Output Tax" icon={"\uD83D\uDCE4"}/>
          <VAT201Row field="1" label="Supplies excl. VAT" value={fmtZar(current.exclusiveRev)} note="Revenue excluding VAT"/>
          <VAT201Row field="4" label="Supplies incl. VAT" value={fmtZar(current.inclusiveRev)} note="Total received including VAT"/>
          <VAT201Row field="12" label="Output tax (15%)" value={fmtZar(current.outputVat)} highlight note={`${fmtZar(current.exclusiveRev)} \u00d7 15%`}/>
          <SHead label="Input Tax" icon={"\uD83D\uDCE5"}/>
          <VAT201Row field="16" label="Input tax on purchases" value={fmtZar(current.inputVat)} note="VAT paid on business purchases"/>
          <SHead label="Net Position" icon={"\u2696\uFE0F"}/>
          <div style={{padding:"20px",background:current.netVat>=0?D.dangerBg:D.successBg,borderTop:`2px solid ${current.netVat>=0?D.dangerBd:D.successBd}`}}>
            <div style={{display:"grid",gridTemplateColumns:"48px 1fr 160px",alignItems:"center"}}>
              <div style={{width:32,height:32,borderRadius:6,background:current.netVat>=0?D.danger:D.success,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>20</div>
              <div style={{paddingLeft:12}}><div style={{fontSize:14,fontWeight:700,color:current.netVat>=0?D.danger:D.success}}>{current.netVat>=0?"Net Payable to SARS":"Net Refund from SARS"}</div><div style={{fontSize:12,color:D.ink500,marginTop:2}}>Field 12 ({fmtZar(current.outputVat)}) \u2212 Field 16 ({fmtZar(current.inputVat)})</div></div>
              <div style={{fontSize:22,fontWeight:700,color:current.netVat>=0?D.danger:D.success,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{current.netVat<0?`(${fmtZar(current.netVat)})`:fmtZar(current.netVat)}</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={exportVAT201} style={{padding:"10px 20px",border:`1px solid ${D.accentMid}`,borderRadius:8,background:D.accentLit,color:D.accentMid,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>{"\u2193"} Export CSV</button>
          {!isFiled&&<button onClick={()=>markFiled(selectedPeriod)} style={{padding:"10px 20px",border:"none",borderRadius:8,background:D.success,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>{"\u2713"} Mark Filed</button>}
          {isFiled&&<div style={{padding:"10px 16px",background:D.successBg,border:`1px solid ${D.successBd}`,borderRadius:8,fontSize:13,color:D.success,fontWeight:600}}>{"\u2713"} Filed</div>}
        </div>
        <div style={{marginTop:20,background:D.ink075,borderRadius:8,padding:"14px 18px",fontSize:12,color:D.ink500,border:`1px solid ${D.ink150}`,lineHeight:1.7,fontFamily:D.font}}>
          <strong style={{color:D.ink700}}>SARS VAT201:</strong> Submit by last business day of month following period end. Late submission attracts penalties. VAT No: <strong>{vatConfig?.vat_number}</strong>.
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──
  const ytdOutput = vatTxns.reduce((s,t)=>s+(parseFloat(t.output_vat)||0),0);
  const ytdInput = vatTxns.reduce((s,t)=>s+(parseFloat(t.input_vat)||0),0);
  const ytdNet = ytdOutput-ytdInput;

  return (
    <div style={{fontFamily:D.font,color:D.ink700}}>
      {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600}}>{toast.msg}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div><h2 style={{margin:0,fontSize:22,fontWeight:700,color:D.ink900,letterSpacing:"-0.02em"}}>VAT</h2><p style={{margin:"4px 0 0",color:D.ink500,fontSize:13}}>VAT201 returns · output & input tax · SARS filing</p></div>
        <div style={{padding:"7px 14px",background:D.accentLit,border:`1px solid ${D.accentMid}`,borderRadius:8,fontSize:12,fontWeight:700,color:D.accentMid,fontFamily:D.font}}>VAT No: {vatConfig?.vat_number} · Bi-Monthly · 15%</div>
      </div>

      <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
        <KPICard label="YTD Output VAT" value={fmtZar(ytdOutput)} sub="Collected" color={D.success} icon={"\uD83D\uDCE4"}/>
        <KPICard label="YTD Input VAT" value={fmtZar(ytdInput)} sub="Paid on purchases" color={D.info} icon={"\uD83D\uDCE5"}/>
        <KPICard label={ytdNet>=0?"YTD Payable":"YTD Refund"} value={fmtZar(ytdNet)} sub={ytdNet>=0?"Owed to SARS":"Due from SARS"} color={ytdNet>=0?D.danger:D.success} icon={ytdNet>=0?"\u2B06":"\u2B07"} highlight={ytdNet>=0?D.dangerBg:D.successBg}/>
        <KPICard label="Filed" value={`${Object.values(filingStatuses).filter(s=>s==="filed").length}/${periods.length}`} sub="This year" color={D.accentMid} icon={"\u2713"}/>
      </div>

      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,fontFamily:D.font}}>Bi-Monthly Periods \u2014 {new Date().getFullYear()}</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {periods.map(p=>{
            const pd=periodData(p.id); const isFiled=filingStatuses[p.id]==="filed"; const overdue=isOverdue(p.dueDate)&&!isFiled;
            const isCurrent=p.id===currentPeriodId(); const isSelected=p.id===selectedPeriod;
            return <button key={p.id} onClick={()=>setSelectedPeriod(p.id)} style={{padding:"12px 16px",borderRadius:10,cursor:"pointer",border:`2px solid ${isSelected?D.accent:overdue?D.dangerBd:isFiled?D.successBd:D.ink150}`,background:isSelected?D.accentLit:overdue?D.dangerBg:isFiled?D.successBg:"#fff",textAlign:"left",fontFamily:D.font,minWidth:140,transition:"all 0.15s"}}>
              <div style={{fontSize:12,fontWeight:700,color:isSelected?D.accent:D.ink700,marginBottom:4}}>{p.label}{isCurrent&&<span style={{marginLeft:6,fontSize:10,color:D.info,fontWeight:600}}>CURRENT</span>}</div>
              <div style={{fontSize:11,color:D.ink500,marginBottom:6}}>Due: {fmtDate(p.dueDate)}</div>
              {pd.count>0?<div style={{fontSize:12,fontWeight:700,fontVariantNumeric:"tabular-nums",color:pd.netVat>=0?D.danger:D.success}}>{pd.netVat>=0?"Pay ":"Refund "}{fmtZar(pd.netVat)}</div>:<div style={{fontSize:11,color:D.ink300}}>No transactions</div>}
              {isFiled&&<div style={{fontSize:10,fontWeight:700,color:D.success,marginTop:4}}>{"\u2713"} Filed</div>}
              {overdue&&<div style={{fontSize:10,fontWeight:700,color:D.danger,marginTop:4}}>{"\u26A0"} Overdue</div>}
            </button>;
          })}
        </div>
      </div>

      <div style={card}>
        <SHead label={`Period \u2014 ${selectedPeriodDef?.label}`} icon={"\uD83D\uDCCA"}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0}}>
          {[["Output VAT",fmtZar(current.outputVat),D.success,"Field 12"],["Input VAT",fmtZar(current.inputVat),D.info,"Field 16"],[current.netVat>=0?"Net Payable":"Net Refund",fmtZar(current.netVat),current.netVat>=0?D.danger:D.success,"Field 20"]].map(([l,v,c,note],i)=>(
            <div key={l} style={{padding:"20px 24px",borderRight:i<2?`1px solid ${D.ink150}`:"none",borderBottom:`1px solid ${D.ink150}`}}>
              <div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8,fontFamily:D.font}}>{l}</div>
              <div style={{fontSize:24,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums",fontFamily:D.font}}>{v}</div>
              <div style={{fontSize:11,color:D.ink500,marginTop:6,fontFamily:D.font}}>{note}</div>
            </div>
          ))}
        </div>
        {current.count===0&&<div style={{padding:"28px 20px",textAlign:"center",color:D.ink300,fontSize:13}}>No VAT transactions this period</div>}
        <div style={{padding:"16px 20px",display:"flex",gap:10,borderTop:`1px solid ${D.ink150}`}}>
          <button onClick={()=>setView("vat201")} style={{padding:"9px 18px",border:"none",borderRadius:8,background:D.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>{"\uD83D\uDCCB"} View VAT201</button>
          <button onClick={exportVAT201} style={{padding:"9px 18px",border:`1px solid ${D.accentMid}`,borderRadius:8,background:D.accentLit,color:D.accentMid,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>{"\u2193"} Export CSV</button>
          {filingStatuses[selectedPeriod]!=="filed"&&current.count>0&&<button onClick={()=>markFiled(selectedPeriod)} style={{padding:"9px 18px",border:`1px solid ${D.successBd}`,borderRadius:8,background:D.successBg,color:D.success,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>{"\u2713"} Mark Filed</button>}
        </div>
      </div>

      <div style={{background:D.ink075,borderRadius:8,padding:"14px 18px",fontSize:12,color:D.ink500,border:`1px solid ${D.ink150}`,lineHeight:1.7,fontFamily:D.font}}>
        <strong style={{color:D.ink700}}>VAT policy:</strong> Output VAT on invoice basis. Input VAT claimed on qualifying purchases. Bi-monthly vendor (6 returns/year). Rate: 15%. Submit via SARS eFiling by last business day of month following period end.
      </div>
    </div>
  );
}
