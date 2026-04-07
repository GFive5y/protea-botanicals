// src/components/hq/HQBankRecon.js — WP-FINANCIALS Phase 7
// Bank Reconciliation: CSV import, SA bank auto-detection, match/unmatch, recon summary
// Tables: bank_accounts, bank_statement_lines

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

const D = {
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  ink900: "#0D0D0D", ink700: "#1F2937", ink500: "#6B7280",
  ink300: "#D1D5DB", ink150: "#E5E7EB", ink075: "#F9FAFB",
  accent: "#1A3D2B", accentMid: "#2D6A4F", accentLit: "#ECFDF5",
  success: "#059669", successBg: "#ECFDF5", successBd: "#6EE7B7",
  danger: "#DC2626", dangerBg: "#FEF2F2",
  warning: "#D97706", warningBg: "#FFFBEB",
  info: "#2563EB", infoBg: "#EFF6FF", infoBd: "#BFDBFE",
  shadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
};

const fmtZar = (n) => `R\u202F${(Math.abs(parseFloat(n)||0)).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}) : "\u2014";

function detectBank(headerLine) {
  const l = headerLine.toLowerCase();
  if (l.includes("fnb")||l.includes("first national")) return "FNB";
  if (l.includes("absa")||l.includes("transaction date")&&l.includes("debit amount")) return "ABSA";
  if (l.includes("standard bank")||l.includes("std bank")) return "Standard Bank";
  if (l.includes("nedbank")||l.includes("ned bank")) return "Nedbank";
  if (l.includes("capitec")||l.includes("client ref")) return "Capitec";
  return "Unknown";
}

function parseCSVLine(line) {
  const r=[]; let c="",q=false;
  for (let i=0;i<line.length;i++) { const ch=line[i]; if(ch==='"'){q=!q;continue;} if(ch===","&&!q){r.push(c.trim());c="";continue;} c+=ch; }
  r.push(c.trim()); return r;
}

function parseAmount(s) { if(!s)return 0; return parseFloat(s.replace(/[R\s,]/g,"").replace("(","-").replace(")",""))||0; }

function parseDate(s) {
  if(!s)return null; s=s.trim().replace(/['"]/g,"");
  let m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  const mos={jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
  m=s.match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/i);
  if(m) return `${m[3]}-${mos[m[2].toLowerCase()]||"01"}-${m[1].padStart(2,"0")}`;
  return null;
}

function parseCSV(content) {
  const ls=content.split(/\r?\n/).filter(l=>l.trim());
  if(ls.length<2)return{bank:"Unknown",parsed:[]};
  const bank=detectBank(ls[0]);
  const rows=ls.map(parseCSVLine);
  const parsed=rows.slice(1).map(row=>{
    const [d,desc,...rest]=row;
    const amt=rest.length>=3?null:parseAmount(rest[0]);
    return {
      statement_date:parseDate(d),
      description:(desc||"").trim(),
      reference:null,
      debit_amount:amt!==null?(amt<0?Math.abs(amt):0):(parseAmount(rest[0])),
      credit_amount:amt!==null?(amt>0?amt:0):(parseAmount(rest[1])),
      balance:parseAmount(rest[rest.length-1]),
    };
  }).filter(r=>r.statement_date);
  return {bank,parsed};
}

function KPICard({label,value,sub,color,icon}) {
  return <div style={{background:"#fff",borderRadius:12,padding:"18px 20px",boxShadow:D.shadow,flex:1,minWidth:150}}>
    <div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:D.font,marginBottom:8,display:"flex",gap:5}}>{icon&&<span>{icon}</span>}{label}</div>
    <div style={{fontSize:22,fontWeight:700,color:color||D.accent,fontVariantNumeric:"tabular-nums",fontFamily:D.font,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:D.ink500,marginTop:5,fontFamily:D.font}}>{sub}</div>}
  </div>;
}

export default function HQBankRecon() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const fileRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterMatch, setFilterMatch] = useState("all");
  const [csvPreview, setCsvPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4500); };

  const fetchAll = useCallback(async () => {
    if(!tenantId)return; setLoading(true);
    try {
      const {data:accs}=await supabase.from("bank_accounts").select("*").eq("tenant_id",tenantId).order("is_primary",{ascending:false});
      setAccounts(accs||[]);
      const primary=accs?.find(a=>a.is_primary)||accs?.[0];
      if(primary){setSelectedAccount(primary);
        const{data}=await supabase.from("bank_statement_lines").select("*").eq("bank_account_id",primary.id).order("statement_date",{ascending:false});
        setLines(data||[]);
      }
    } catch(e){showToast("Load failed: "+e.message,"error");} finally{setLoading(false);}
  },[tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{fetchAll();},[fetchAll]);

  const switchAccount = async(acc) => {
    setSelectedAccount(acc); setLoading(true);
    try{const{data}=await supabase.from("bank_statement_lines").select("*").eq("bank_account_id",acc.id).order("statement_date",{ascending:false});setLines(data||[]);}finally{setLoading(false);}
  };

  const handleFileSelect = (e) => {
    const file=e.target.files?.[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{const result=parseCSV(ev.target.result);if(result.parsed.length===0){showToast("No valid rows.","error");return;}setCsvPreview(result);setShowPreview(true);};
    reader.readAsText(file); e.target.value="";
  };

  const importCSV = async() => {
    if(!csvPreview||!selectedAccount)return; setImporting(true);
    try{
      const batch=`IMPORT-${Date.now()}`;
      const rows=csvPreview.parsed.map(r=>({bank_account_id:selectedAccount.id,tenant_id:tenantId,statement_date:r.statement_date,description:r.description,reference:r.reference,debit_amount:r.debit_amount,credit_amount:r.credit_amount,balance:r.balance||null,matched_type:null,import_batch:batch}));
      const{error}=await supabase.from("bank_statement_lines").insert(rows);
      if(error)throw error;
      showToast(`${rows.length} lines imported from ${csvPreview.bank}.`);
      setShowPreview(false);setCsvPreview(null);fetchAll();
    }catch(e){showToast("Import failed: "+e.message,"error");}finally{setImporting(false);}
  };

  const updateMatch = async(lineId,type) => {
    const{error}=await supabase.from("bank_statement_lines").update({matched_type:type,matched_at:type?new Date().toISOString():null}).eq("id",lineId);
    if(error){showToast("Failed.","error");return;}
    setLines(ls=>ls.map(l=>l.id===lineId?{...l,matched_type:type,matched_at:type?new Date().toISOString():null}:l));
  };

  const filteredLines=lines.filter(l=>{
    if(filterMatch==="unmatched"&&l.matched_type&&l.matched_type!=="unmatched")return false;
    if(filterMatch!=="all"&&filterMatch!=="unmatched"&&l.matched_type!==filterMatch)return false;
    return true;
  });

  const totalCredits=lines.reduce((s,l)=>s+(parseFloat(l.credit_amount)||0),0);
  const totalDebits=lines.reduce((s,l)=>s+(parseFloat(l.debit_amount)||0),0);
  const netMovement=totalCredits-totalDebits;
  const closingBalance=(parseFloat(selectedAccount?.opening_balance)||0)+netMovement;
  const matchedCount=lines.filter(l=>l.matched_type&&l.matched_type!=="unmatched").length;
  const unmatchedLines=lines.filter(l=>!l.matched_type||l.matched_type==="unmatched");
  const reconPct=lines.length>0?Math.round((matchedCount/lines.length)*100):0;

  const card={background:"#fff",borderRadius:12,boxShadow:D.shadow,overflow:"hidden",marginBottom:20};

  if(showPreview&&csvPreview) return (
    <div style={{fontFamily:D.font,color:D.ink700}}>
      {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600}}>{toast.msg}</div>}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={()=>{setShowPreview(false);setCsvPreview(null);}} style={{padding:"7px 14px",border:`1px solid ${D.ink150}`,borderRadius:8,background:"#fff",color:D.ink500,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>{"\u2190"} Cancel</button>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:D.ink900}}>Import \u2014 {csvPreview.bank}</h2>
        <span style={{padding:"3px 12px",borderRadius:12,fontSize:11,fontWeight:700,background:D.infoBg,color:D.info,border:`1px solid ${D.infoBd}`}}>{csvPreview.parsed.length} rows</span>
      </div>
      <div style={card}>
        <div style={{display:"grid",gridTemplateColumns:"100px 1fr 110px 110px 110px",padding:"8px 20px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em"}}>
          <span>Date</span><span>Description</span><span style={{textAlign:"right"}}>Debit</span><span style={{textAlign:"right"}}>Credit</span><span style={{textAlign:"right"}}>Balance</span>
        </div>
        {csvPreview.parsed.slice(0,10).map((r,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"100px 1fr 110px 110px 110px",padding:"10px 20px",borderBottom:`1px solid ${D.ink150}`,alignItems:"center"}}>
            <span style={{fontSize:12,color:D.ink500}}>{fmtDate(r.statement_date)}</span>
            <span style={{fontSize:13,color:D.ink700}}>{r.description}</span>
            <span style={{fontSize:13,color:r.debit_amount>0?D.danger:D.ink300,textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:r.debit_amount>0?600:400}}>{r.debit_amount>0?fmtZar(r.debit_amount):"\u2014"}</span>
            <span style={{fontSize:13,color:r.credit_amount>0?D.success:D.ink300,textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:r.credit_amount>0?600:400}}>{r.credit_amount>0?fmtZar(r.credit_amount):"\u2014"}</span>
            <span style={{fontSize:12,color:D.ink500,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{r.balance?fmtZar(r.balance):"\u2014"}</span>
          </div>
        ))}
        {csvPreview.parsed.length>10&&<div style={{padding:"10px 20px",fontSize:12,color:D.ink500,fontStyle:"italic"}}>+ {csvPreview.parsed.length-10} more\u2026</div>}
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={importCSV} disabled={importing} style={{padding:"10px 24px",border:"none",borderRadius:8,background:D.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:importing?"wait":"pointer",fontFamily:D.font,opacity:importing?0.7:1}}>{importing?"Importing\u2026":`Import ${csvPreview.parsed.length} Rows`}</button>
        <button onClick={()=>{setShowPreview(false);setCsvPreview(null);}} style={{padding:"10px 16px",border:`1px solid ${D.ink150}`,borderRadius:8,background:"#fff",color:D.ink500,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:D.font,color:D.ink700}}>
      {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.18)"}}>{toast.msg}</div>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div><h2 style={{margin:0,fontSize:22,fontWeight:700,color:D.ink900,letterSpacing:"-0.02em"}}>Bank Reconciliation</h2><p style={{margin:"4px 0 0",color:D.ink500,fontSize:13}}>Upload CSV \u00b7 match transactions \u00b7 reconcile balance</p></div>
        <div><input ref={fileRef} type="file" accept=".csv,.txt" style={{display:"none"}} onChange={handleFileSelect}/><button onClick={()=>fileRef.current?.click()} style={{padding:"9px 20px",border:`1.5px solid ${D.accentMid}`,borderRadius:8,background:D.accentLit,color:D.accentMid,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>{"\u2191"} Upload CSV</button></div>
      </div>

      {accounts.length>1&&<div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{accounts.map(acc=><button key={acc.id} onClick={()=>switchAccount(acc)} style={{padding:"9px 16px",borderRadius:8,cursor:"pointer",fontFamily:D.font,border:`2px solid ${selectedAccount?.id===acc.id?D.accent:D.ink150}`,background:selectedAccount?.id===acc.id?D.accentLit:"#fff",color:selectedAccount?.id===acc.id?D.accent:D.ink700,fontSize:13,fontWeight:700}}>{acc.bank_name} \u00b7\u00b7\u00b7{acc.account_number?.slice(-4)}{acc.is_primary&&<span style={{fontSize:10,marginLeft:6,color:D.accentMid}}>PRIMARY</span>}</button>)}</div>}

      {loading?<div style={{textAlign:"center",padding:60,color:D.ink500}}>Loading\u2026</div>
      :accounts.length===0?<div style={{...card,padding:"48px 32px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>{"\uD83C\uDFE6"}</div><div style={{fontSize:16,fontWeight:700,color:D.ink700,marginBottom:6}}>No bank accounts</div><div style={{fontSize:13,color:D.ink500}}>Complete Financial Setup to add your bank account.</div></div>
      :<>
        {selectedAccount&&<div style={{...card,padding:20,marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Account</div><div style={{fontSize:16,fontWeight:700,color:D.ink900}}>{selectedAccount.bank_name} \u2014 {selectedAccount.account_name}</div><div style={{fontSize:12,color:D.ink500}}>{selectedAccount.account_number} \u00b7 Branch {selectedAccount.branch_code}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Balance</div><div style={{fontSize:24,fontWeight:700,color:closingBalance>=0?D.success:D.danger,fontVariantNumeric:"tabular-nums"}}>{fmtZar(closingBalance)}</div><div style={{fontSize:11,color:D.ink500}}>Opening {fmtZar(selectedAccount.opening_balance)} + movements</div></div>
        </div></div>}

        <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
          <KPICard label="Credits" value={fmtZar(totalCredits)} sub="Money in" color={D.success} icon={"\u2193"}/>
          <KPICard label="Debits" value={fmtZar(totalDebits)} sub="Money out" color={D.danger} icon={"\u2191"}/>
          <KPICard label="Reconciled" value={`${reconPct}%`} sub={`${matchedCount}/${lines.length} matched`} color={reconPct===100?D.success:reconPct>70?D.warning:D.danger} icon={"\u2713"}/>
          <KPICard label="Unmatched" value={String(unmatchedLines.length)} sub="Need review" color={unmatchedLines.length===0?D.success:D.danger} icon={"\u26A0"}/>
        </div>

        <div style={{marginBottom:24}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:D.ink500,marginBottom:6}}>
          <span>Reconciliation Progress</span><span style={{fontWeight:700,color:reconPct===100?D.success:D.ink700}}>{reconPct}%</span></div>
          <div style={{height:8,borderRadius:4,background:D.ink150,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,transition:"width 0.5s",width:`${reconPct}%`,background:reconPct===100?D.success:reconPct>70?D.warning:D.danger}}/></div>
        </div>

        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em"}}>Filter:</div>
          {[["all","All"],["order","Sales"],["expense","Expenses"],["purchase_order","POs"],["unmatched","Unmatched"]].map(([id,label])=>(
            <button key={id} onClick={()=>setFilterMatch(id)} style={{padding:"5px 12px",borderRadius:16,cursor:"pointer",fontFamily:D.font,border:`1.5px solid ${filterMatch===id?D.accentMid:D.ink150}`,background:filterMatch===id?D.accentLit:"#fff",color:filterMatch===id?D.accentMid:D.ink500,fontSize:12,fontWeight:700}}>{label}</button>
          ))}
        </div>

        {filteredLines.length===0?<div style={{...card,padding:"36px 24px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:10}}>{"\uD83D\uDCC4"}</div><div style={{fontSize:15,fontWeight:700,color:D.ink700,marginBottom:6}}>{lines.length===0?"No statement lines":"No lines match filter"}</div>{lines.length===0&&<button onClick={()=>fileRef.current?.click()} style={{padding:"9px 20px",background:D.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>{"\u2191"} Upload CSV</button>}</div>
        :<div style={card}>
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr 100px 100px 110px 160px 36px",padding:"10px 20px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em"}}>
            <span>Date</span><span>Description</span><span>Ref</span><span style={{textAlign:"right"}}>Debit</span><span style={{textAlign:"right"}}>Credit</span><span style={{textAlign:"center"}}>Match</span><span/>
          </div>
          {filteredLines.map((line,idx)=>{
            const unm=!line.matched_type||line.matched_type==="unmatched";
            return <div key={line.id||idx} style={{display:"grid",gridTemplateColumns:"90px 1fr 100px 100px 110px 160px 36px",padding:"12px 20px",borderBottom:idx<filteredLines.length-1?`1px solid ${D.ink150}`:"none",alignItems:"center",background:unm?"#FFFDF5":"transparent"}}>
              <span style={{fontSize:12,color:D.ink500}}>{fmtDate(line.statement_date)}</span>
              <div><div style={{fontSize:13,fontWeight:500,color:D.ink700}}>{line.description}</div>{line.matched_at&&<div style={{fontSize:10,color:D.success,marginTop:1}}>Matched {fmtDate(line.matched_at)}</div>}</div>
              <span style={{fontSize:11,color:D.ink500}}>{line.reference||"\u2014"}</span>
              <span style={{fontSize:13,fontWeight:600,color:parseFloat(line.debit_amount)>0?D.danger:D.ink300,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{parseFloat(line.debit_amount)>0?fmtZar(line.debit_amount):"\u2014"}</span>
              <span style={{fontSize:13,fontWeight:600,color:parseFloat(line.credit_amount)>0?D.success:D.ink300,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{parseFloat(line.credit_amount)>0?fmtZar(line.credit_amount):"\u2014"}</span>
              <div style={{display:"flex",justifyContent:"center"}}><select value={line.matched_type||""} onChange={e=>updateMatch(line.id,e.target.value||null)} style={{padding:"3px 6px",border:`1px solid ${D.ink150}`,borderRadius:6,fontSize:11,fontWeight:600,fontFamily:D.font,background:unm?D.warningBg:D.successBg,color:unm?D.warning:D.success,cursor:"pointer",maxWidth:140}}>
                <option value="">Unmatched</option><option value="order">Sale</option><option value="expense">Expense</option><option value="purchase_order">PO</option><option value="journal">Journal</option>
              </select></div>
              <div style={{textAlign:"center"}}>{unm?<span style={{fontSize:14,color:D.warning}}>{"\u26A0"}</span>:<span style={{fontSize:14,color:D.success}}>{"\u2713"}</span>}</div>
            </div>;
          })}
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr 100px 100px 110px 160px 36px",padding:"13px 20px",background:D.ink075,borderTop:`2px solid ${D.ink150}`}}>
            <span/><span style={{fontSize:12,fontWeight:700,color:D.ink700}}>{filteredLines.length} lines</span><span/>
            <span style={{fontSize:14,fontWeight:700,color:D.danger,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(filteredLines.reduce((s,l)=>s+(parseFloat(l.debit_amount)||0),0))}</span>
            <span style={{fontSize:14,fontWeight:700,color:D.success,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(filteredLines.reduce((s,l)=>s+(parseFloat(l.credit_amount)||0),0))}</span>
            <span/><span/>
          </div>
        </div>}

        <div style={{...card,padding:20}}>
          <div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Supported Banks</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            {[{b:"FNB",c:"Date, Desc, Amount, Balance"},{b:"ABSA",c:"Date, Desc, Debit, Credit, Balance"},{b:"Standard Bank",c:"Date, Desc, Amount, Balance"},{b:"Nedbank",c:"Date, Desc, Debit, Credit, Balance"},{b:"Capitec",c:"Date, Ref, Desc, Debit, Credit, Balance"}].map(x=>
              <div key={x.b} style={{padding:"12px 14px",background:D.ink075,borderRadius:8,border:`1px solid ${D.ink150}`}}>
                <div style={{fontSize:13,fontWeight:700,color:D.ink700,marginBottom:4}}>{x.b}</div>
                <div style={{fontSize:11,color:D.ink500}}>{x.c}</div>
              </div>
            )}
          </div>
          <div style={{marginTop:12,fontSize:12,color:D.ink500}}>Export CSV from online banking. Auto-detected from headers.</div>
        </div>

        <div style={{background:D.ink075,borderRadius:8,padding:"14px 18px",fontSize:12,color:D.ink500,border:`1px solid ${D.ink150}`,lineHeight:1.7,fontFamily:D.font}}>
          <strong style={{color:D.ink700}}>Reconciliation note:</strong>{" "}
          Every bank transaction should match an accounting record. Unmatched items need investigation \u2014 timing differences, bank charges, or errors. 100% = your NuAi cash matches your bank.
        </div>
      </>}
    </div>
  );
}
