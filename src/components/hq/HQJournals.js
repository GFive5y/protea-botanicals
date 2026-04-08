// src/components/hq/HQJournals.js — WP-FINANCIALS Phase 5
// Manual journal entries — double-entry bookkeeping
// Tables: journal_entries + journal_lines + chart_of_accounts

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
  warning: "#D97706", info: "#2563EB",
  shadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
};

const fmtZar = (n) => `R\u202F${(parseFloat(n)||0).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}) : "\u2014";

const JOURNAL_TEMPLATES = [
  { id:"paye_accrual", label:"PAYE & UIF Accrual", description:"Monthly payroll tax accrual", type:"accrual",
    lines:[{account_code:"60100",account_name:"Staff Wages & Salaries",debit:true,placeholder:"Gross wages"},{account_code:"20200",account_name:"PAYE & UIF Payable",credit:true,placeholder:"PAYE + UIF"},{account_code:"10100",account_name:"Cash \u2014 Bank",credit:true,placeholder:"Net wages paid"}]},
  { id:"prepayment", label:"Prepayment", description:"Expense paid in advance", type:"accrual",
    lines:[{account_code:"11200",account_name:"Prepayments",debit:true,placeholder:"Prepayment amount"},{account_code:"10100",account_name:"Cash \u2014 Bank",credit:true,placeholder:"Cash paid"}]},
  { id:"depreciation", label:"Depreciation", description:"Monthly depreciation charge", type:"depreciation",
    lines:[{account_code:"61100",account_name:"Depreciation",debit:true,placeholder:"Depreciation amount"},{account_code:"15100",account_name:"PPE \u2014 Accum Dep",credit:true,placeholder:"Depreciation amount"}]},
  { id:"accrued_expense", label:"Accrued Expense", description:"Expense incurred, not yet paid", type:"accrual",
    lines:[{account_code:"60000",account_name:"Rent & Premises",debit:true,placeholder:"Expense amount"},{account_code:"20300",account_name:"Accrued Expenses",credit:true,placeholder:"Accrued amount"}]},
  { id:"blank", label:"Blank Journal", description:"Start with empty lines", type:"manual",
    lines:[{account_code:"",account_name:"",debit:true,placeholder:"Debit"},{account_code:"",account_name:"",credit:true,placeholder:"Credit"}]},
];

const STATUS_STYLES = { draft:{bg:"#FEF9C3",color:"#A16207",label:"Draft"}, posted:{bg:D.successBg,color:D.success,label:"Posted"}, reversed:{bg:"#F3F4F6",color:"#6B7280",label:"Reversed"} };
const inputSx = {width:"100%",padding:"8px 10px",border:`1.5px solid ${D.ink150}`,borderRadius:6,fontSize:13,color:D.ink700,outline:"none",boxSizing:"border-box",fontFamily:D.font,background:"#fff"};

function StatusPill({status}) { const s=STATUS_STYLES[status]||STATUS_STYLES.draft; return <span style={{padding:"2px 10px",borderRadius:12,fontSize:11,fontWeight:700,background:s.bg,color:s.color,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</span>; }

export default function HQJournals() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [journals, setJournals] = useState([]);
  const [coa, setCoa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const currentYear = `FY${new Date().getFullYear()}`;

  const [jForm, setJForm] = useState({journal_date:today,reference:"",description:"",journal_type:"manual"});
  const [lines, setLines] = useState([
    {account_code:"",account_name:"",debit_amount:"",credit_amount:"",description:""},
    {account_code:"",account_name:"",debit_amount:"",credit_amount:"",description:""},
  ]);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [jRes,coaRes] = await Promise.all([
        supabase.from("journal_entries").select("*, journal_lines(*)").eq("tenant_id",tenantId).order("journal_date",{ascending:false}),
        supabase.from("chart_of_accounts").select("account_code, account_name, account_type").eq("tenant_id",tenantId).order("account_code"),
      ]);
      setJournals(jRes.data||[]);
      setCoa(coaRes.data||[]);
    } catch(e) { showToast("Load failed: "+e.message,"error"); }
    finally { setLoading(false); }
  },[tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const applyTemplate = (t) => {
    setSelectedTemplate(t);
    setJForm(f=>({...f,journal_type:t.type,description:t.description}));
    setLines(t.lines.map(l=>({account_code:l.account_code,account_name:l.account_name,debit_amount:"",credit_amount:"",description:"",_placeholder:l.placeholder})));
    setView("new");
  };

  const updateLine = (idx,field,value) => {
    setLines(ls=>ls.map((l,i)=>{
      if (i!==idx) return l;
      const u={...l,[field]:value};
      if (field==="account_code") { const a=coa.find(c=>c.account_code===value); if(a) u.account_name=a.account_name; }
      return u;
    }));
  };
  const addLine = () => setLines(ls=>[...ls,{account_code:"",account_name:"",debit_amount:"",credit_amount:"",description:""}]);
  const removeLine = (idx) => { if(lines.length<=2){showToast("Min 2 lines.","error");return;} setLines(ls=>ls.filter((_,i)=>i!==idx)); };

  const totalDebits = lines.reduce((s,l)=>s+(parseFloat(l.debit_amount)||0),0);
  const totalCredits = lines.reduce((s,l)=>s+(parseFloat(l.credit_amount)||0),0);
  const isBalanced = Math.abs(totalDebits-totalCredits)<0.01 && totalDebits>0;

  const saveDraft = async () => {
    if (!jForm.description.trim()) { showToast("Description required.","error"); return; }
    if (!isBalanced) { showToast(`Not balanced. Dr ${fmtZar(totalDebits)} \u2260 Cr ${fmtZar(totalCredits)}.`,"error"); return; }
    if (!lines.every(l=>l.account_code.trim())) { showToast("All lines need account codes.","error"); return; }
    setSaving(true);
    try {
      const { data:je, error:jeErr } = await supabase.from("journal_entries").insert({
        tenant_id:tenantId, journal_date:jForm.journal_date, reference:jForm.reference.trim()||null,
        description:jForm.description.trim(), journal_type:jForm.journal_type, status:"draft", financial_year:currentYear,
      }).select().single();
      if (jeErr) throw jeErr;
      const rows = lines.filter(l=>l.account_code.trim()).map((l,i)=>({
        journal_id:je.id, tenant_id:tenantId, account_code:l.account_code.trim(),
        account_name:l.account_name.trim()||(coa.find(a=>a.account_code===l.account_code.trim())?.account_name||l.account_code),
        debit_amount:parseFloat(l.debit_amount)||0, credit_amount:parseFloat(l.credit_amount)||0,
        description:l.description.trim()||null, line_order:i+1,
      }));
      const { error:lErr } = await supabase.from("journal_lines").insert(rows);
      if (lErr) throw lErr;
      showToast("Journal saved as draft.");
      resetForm(); fetchAll(); setView("list");
    } catch(e) { showToast("Save failed: "+e.message,"error"); }
    finally { setSaving(false); }
  };

  const postJournal = async (id) => {
    if (!window.confirm("Post this journal? Posted journals cannot be edited.")) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("journal_entries").update({status:"posted",posted_at:new Date().toISOString()}).eq("id",id).eq("tenant_id",tenantId);
      if (error) throw error;
      showToast("Journal posted.");
      fetchAll();
      setSelectedJournal(prev=>prev?.id===id?{...prev,status:"posted"}:prev);
    } catch(e) { showToast("Post failed: "+e.message,"error"); }
    finally { setPosting(false); }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm("Delete this draft?")) return;
    await supabase.from("journal_lines").delete().eq("journal_id",id);
    await supabase.from("journal_entries").delete().eq("id",id).eq("status","draft");
    showToast("Draft deleted."); fetchAll();
    if (selectedJournal?.id===id) { setSelectedJournal(null); setView("list"); }
  };

  const reverseJournal = async (j) => {
    if (!window.confirm(`Reverse journal ${j.reference||j.id.slice(0,8)}? This creates a new reversal entry.`)) return;
    try {
      const { data:{session} } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const now = new Date().toISOString();
      const { data:newJe, error:jeErr } = await supabase.from("journal_entries").insert({
        tenant_id:tenantId, journal_date:now.slice(0,10),
        reference:"REV-"+(j.reference||""), description:`Reversal of ${j.reference||""}: ${j.description||""}`,
        journal_type:j.journal_type||"manual", status:"posted",
        posted_at:now, posted_by:userId, created_by:userId,
        financial_year:"FY"+new Date().getFullYear(), is_year_end_closing:false,
      }).select("id").single();
      if (jeErr) throw jeErr;
      const revLines = (j.journal_lines||[]).map((l,i)=>({
        journal_id:newJe.id, tenant_id:tenantId, account_code:l.account_code,
        account_name:l.account_name, debit_amount:parseFloat(l.credit_amount)||0,
        credit_amount:parseFloat(l.debit_amount)||0, description:l.description||"", line_order:i+1,
      }));
      if (revLines.length>0) await supabase.from("journal_lines").insert(revLines);
      await supabase.from("journal_entries").update({status:"reversed"}).eq("id",j.id).eq("tenant_id",tenantId);
      showToast("Reversal journal created \u2713");
      fetchAll();
      if (selectedJournal?.id===j.id) { setSelectedJournal(null); setView("list"); }
    } catch(e) { showToast("Reverse failed: "+e.message,"error"); }
  };

  const resetForm = () => {
    setJForm({journal_date:today,reference:"",description:"",journal_type:"manual"});
    setLines([{account_code:"",account_name:"",debit_amount:"",credit_amount:"",description:""},{account_code:"",account_name:"",debit_amount:"",credit_amount:"",description:""}]);
    setSelectedTemplate(null);
  };

  const filteredJournals = journals.filter(j=>{
    if(filterStatus!=="all"&&j.status!==filterStatus)return false;
    if(filterType!=="all"&&j.journal_type!==filterType)return false;
    return true;
  });
  const draftCount = journals.filter(j=>j.status==="draft").length;
  const postedCount = journals.filter(j=>j.status==="posted").length;
  const reversedCount = journals.filter(j=>j.status==="reversed").length;
  const totalPosted = journals.filter(j=>j.status==="posted").reduce((s,j)=>s+(j.journal_lines||[]).reduce((ls,l)=>ls+(parseFloat(l.debit_amount)||0),0),0);

  const card = {background:"#fff",borderRadius:12,boxShadow:D.shadow,overflow:"hidden",marginBottom:16};

  // ── DETAIL VIEW ──
  if (view==="detail"&&selectedJournal) {
    const jl=selectedJournal.journal_lines||[];
    const dT=jl.reduce((s,l)=>s+(parseFloat(l.debit_amount)||0),0);
    const cT=jl.reduce((s,l)=>s+(parseFloat(l.credit_amount)||0),0);
    return (
      <div style={{fontFamily:D.font,color:D.ink700}}>
        {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600}}>{toast.msg}</div>}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <button onClick={()=>{setView("list");setSelectedJournal(null);}} style={{padding:"7px 14px",border:`1px solid ${D.ink150}`,borderRadius:8,background:"#fff",color:D.ink500,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>{"\u2190"} Journals</button>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:D.ink900}}>{selectedJournal.reference||selectedJournal.description}</h2>
          <StatusPill status={selectedJournal.status}/>
        </div>
        <div style={{...card,padding:24}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16}}>
            {[["Date",fmtDate(selectedJournal.journal_date)],["Reference",selectedJournal.reference||"\u2014"],["Type",selectedJournal.journal_type],["Year",selectedJournal.financial_year||"\u2014"]].map(([l,v])=>(
              <div key={l}><div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{l}</div><div style={{fontSize:14,fontWeight:600,color:D.ink700,textTransform:l==="Type"?"capitalize":"none"}}>{v}</div></div>
            ))}
          </div>
          {selectedJournal.description&&<div style={{marginTop:16,padding:"10px 14px",background:D.ink075,borderRadius:6,fontSize:13,color:D.ink500}}>{selectedJournal.description}</div>}
        </div>
        <div style={card}>
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 110px 110px",padding:"8px 20px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em"}}>
            <span>Code</span><span>Account</span><span>Description</span><span style={{textAlign:"right"}}>Debit</span><span style={{textAlign:"right"}}>Credit</span>
          </div>
          {jl.map((line,i)=>(
            <div key={line.id||i} style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 110px 110px",padding:"12px 20px",borderBottom:`1px solid ${D.ink150}`,alignItems:"center"}}>
              <span style={{fontSize:12,color:D.info,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{line.account_code}</span>
              <span style={{fontSize:13,color:D.ink700}}>{line.account_name}</span>
              <span style={{fontSize:12,color:D.ink500}}>{line.description||"\u2014"}</span>
              <span style={{fontSize:13,fontWeight:600,color:D.accent,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{parseFloat(line.debit_amount)>0?fmtZar(line.debit_amount):"\u2014"}</span>
              <span style={{fontSize:13,fontWeight:600,color:D.danger,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{parseFloat(line.credit_amount)>0?fmtZar(line.credit_amount):"\u2014"}</span>
            </div>
          ))}
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 110px 110px",padding:"12px 20px",background:D.ink075,borderTop:`2px solid ${D.ink150}`}}>
            <span/><span/><span style={{fontSize:12,fontWeight:700,color:D.ink500,textTransform:"uppercase"}}>Totals</span>
            <span style={{fontSize:14,fontWeight:700,color:D.accent,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(dT)}</span>
            <span style={{fontSize:14,fontWeight:700,color:D.danger,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(cT)}</span>
          </div>
          <div style={{padding:"10px 20px",background:Math.abs(dT-cT)<0.01?D.successBg:D.dangerBg,fontSize:12,fontWeight:700,color:Math.abs(dT-cT)<0.01?D.success:D.danger,textAlign:"center"}}>
            {Math.abs(dT-cT)<0.01?"\u2713 Balanced":"\u26A0 Difference: "+fmtZar(Math.abs(dT-cT))}
          </div>
        </div>
        {selectedJournal.status==="draft"&&(
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>postJournal(selectedJournal.id)} disabled={posting} style={{padding:"10px 22px",border:"none",borderRadius:8,background:D.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:posting?"wait":"pointer",fontFamily:D.font}}>{posting?"Posting\u2026":"Post Journal"}</button>
            <button onClick={()=>deleteDraft(selectedJournal.id)} style={{padding:"10px 18px",border:`1px solid ${D.dangerBd}`,borderRadius:8,background:D.dangerBg,color:D.danger,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>Delete Draft</button>
          </div>
        )}
        {selectedJournal.status==="posted"&&(
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{padding:"10px 16px",background:D.successBg,border:`1px solid ${D.successBd}`,borderRadius:8,fontSize:13,color:D.success,fontWeight:600,flex:1}}>{"\u2713"} Posted {selectedJournal.posted_at?fmtDate(selectedJournal.posted_at):""} {"\u00b7"} Locked.</div>
            <button onClick={()=>reverseJournal(selectedJournal)} style={{padding:"10px 18px",border:`1px solid ${D.ink150}`,borderRadius:8,background:"#fff",color:D.ink500,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>Reverse Journal</button>
          </div>
        )}
        {selectedJournal.status==="reversed"&&<div style={{padding:"10px 16px",background:"#F3F4F6",border:"1px solid #D1D5DB",borderRadius:8,fontSize:13,color:D.ink500,fontWeight:600}}>{"\u21A9"} Reversed {"\u00b7"} A reversal entry has been posted.</div>}
      </div>
    );
  }

  // ── NEW JOURNAL VIEW ──
  if (view==="new") {
    return (
      <div style={{fontFamily:D.font,color:D.ink700}}>
        {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600}}>{toast.msg}</div>}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <button onClick={()=>{setView("list");resetForm();}} style={{padding:"7px 14px",border:`1px solid ${D.ink150}`,borderRadius:8,background:"#fff",color:D.ink500,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>{"\u2190"} Cancel</button>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:D.ink900}}>New Journal Entry{selectedTemplate&&<span style={{fontSize:12,fontWeight:600,color:D.accentMid,marginLeft:10,padding:"2px 10px",background:D.accentLit,borderRadius:12}}>{selectedTemplate.label}</span>}</h2>
        </div>
        <div style={{...card,padding:22}}>
          <div style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr",gap:16}}>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Date *</label><input type="date" style={inputSx} value={jForm.journal_date} onChange={e=>setJForm(f=>({...f,journal_date:e.target.value}))}/></div>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Reference</label><input style={inputSx} placeholder="e.g. JNL-001" value={jForm.reference} onChange={e=>setJForm(f=>({...f,reference:e.target.value}))}/></div>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Description *</label><input style={inputSx} placeholder="What is this journal for?" value={jForm.description} onChange={e=>setJForm(f=>({...f,description:e.target.value}))}/></div>
          </div>
        </div>
        <div style={card}>
          <div style={{padding:"8px 20px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em"}}>Journal Lines \u2014 must balance</div>
          <div style={{display:"grid",gridTemplateColumns:"100px 160px 1fr 120px 120px 36px",padding:"8px 16px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em"}}>
            <span>Code</span><span>Account</span><span>Description</span><span style={{textAlign:"right"}}>Debit</span><span style={{textAlign:"right"}}>Credit</span><span/>
          </div>
          {lines.map((line,idx)=>(
            <div key={idx} style={{display:"grid",gridTemplateColumns:"100px 160px 1fr 120px 120px 36px",padding:"10px 16px",borderBottom:`1px solid ${D.ink150}`,alignItems:"center",gap:8}}>
              <div><input style={{...inputSx,fontVariantNumeric:"tabular-nums"}} list={`coa-${idx}`} placeholder="60000" value={line.account_code} onChange={e=>updateLine(idx,"account_code",e.target.value)}/><datalist id={`coa-${idx}`}>{coa.map(a=><option key={a.account_code} value={a.account_code} label={a.account_name}/>)}</datalist></div>
              <input style={{...inputSx,color:D.ink500}} placeholder="Account" value={line.account_name} onChange={e=>updateLine(idx,"account_name",e.target.value)}/>
              <input style={inputSx} placeholder={line._placeholder||"Description"} value={line.description} onChange={e=>updateLine(idx,"description",e.target.value)}/>
              <input type="number" min="0" step="0.01" style={{...inputSx,textAlign:"right",fontVariantNumeric:"tabular-nums"}} placeholder="0.00" value={line.debit_amount} onChange={e=>updateLine(idx,"debit_amount",e.target.value)}/>
              <input type="number" min="0" step="0.01" style={{...inputSx,textAlign:"right",fontVariantNumeric:"tabular-nums"}} placeholder="0.00" value={line.credit_amount} onChange={e=>updateLine(idx,"credit_amount",e.target.value)}/>
              <button onClick={()=>removeLine(idx)} style={{width:28,height:28,border:`1px solid ${D.ink150}`,borderRadius:6,background:"#fff",color:D.ink300,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u00D7"}</button>
            </div>
          ))}
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${D.ink150}`}}>
            <button onClick={addLine} style={{padding:"6px 14px",border:`1px dashed ${D.ink300}`,borderRadius:6,background:"transparent",color:D.ink500,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>+ Add Line</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"100px 160px 1fr 120px 120px 36px",padding:"12px 16px",background:isBalanced?D.successBg:totalDebits>0?D.dangerBg:D.ink075}}>
            <span/><span/>
            <span style={{fontSize:12,fontWeight:700,color:isBalanced?D.success:D.ink500,display:"flex",alignItems:"center",gap:6}}>{isBalanced?"\u2713 Balanced":totalDebits>0?`\u26A0 Diff: ${fmtZar(Math.abs(totalDebits-totalCredits))}`:"Enter amounts"}</span>
            <span style={{fontSize:15,fontWeight:700,color:D.accent,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(totalDebits)}</span>
            <span style={{fontSize:15,fontWeight:700,color:D.danger,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(totalCredits)}</span>
            <span/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={saveDraft} disabled={saving||!isBalanced} style={{padding:"10px 24px",border:"none",borderRadius:8,background:isBalanced?D.accent:D.ink150,color:isBalanced?"#fff":D.ink300,fontSize:13,fontWeight:700,cursor:saving||!isBalanced?"not-allowed":"pointer",fontFamily:D.font}}>{saving?"Saving\u2026":"Save as Draft"}</button>
          <span style={{fontSize:12,color:D.ink500}}>Draft can be reviewed and posted separately.</span>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div style={{fontFamily:D.font,color:D.ink700}}>
      {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600}}>{toast.msg}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,color:D.ink900,letterSpacing:"-0.02em"}}>Journal Entries</h2>
          <p style={{margin:"4px 0 0",color:D.ink500,fontSize:13}}>Manual accruals \u00b7 prepayments \u00b7 PAYE \u00b7 corrections \u00b7 double-entry</p>
        </div>
        <button onClick={()=>{setView("new");resetForm();}} style={{padding:"10px 20px",border:"none",borderRadius:8,background:D.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>+ New Journal</button>
      </div>

      <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
        {[["Total",String(journals.length),D.accent,"\uD83D\uDCD2"],["Drafts",String(draftCount),draftCount>0?D.warning:D.ink500,"\u270F\uFE0F"],["Posted",String(postedCount),D.success,"\u2713"],["Reversed",String(reversedCount),D.ink500,"\u21A9"]].map(([label,value,color,icon])=>(
          <div key={label} style={{background:"#fff",borderRadius:12,padding:"18px 20px",boxShadow:D.shadow,flex:1,minWidth:140}}>
            <div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,display:"flex",gap:6,alignItems:"center"}}><span>{icon}</span>{label}</div>
            <div style={{fontSize:24,fontWeight:700,color,fontVariantNumeric:"tabular-nums"}}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Quick Templates</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {JOURNAL_TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>applyTemplate(t)} style={{padding:"9px 16px",border:`1.5px solid ${D.ink150}`,borderRadius:8,background:"#fff",cursor:"pointer",fontFamily:D.font,textAlign:"left"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=D.accentMid;e.currentTarget.style.background=D.accentLit;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=D.ink150;e.currentTarget.style.background="#fff";}}>
              <div style={{fontSize:13,fontWeight:700,color:D.ink700}}>{t.label}</div>
              <div style={{fontSize:11,color:D.ink500,marginTop:2}}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        {[["all","All"],["draft","Drafts"],["posted","Posted"],["reversed","Reversed"]].map(([id,label])=>(
          <button key={id} onClick={()=>setFilterStatus(id)} style={{padding:"6px 14px",border:`1.5px solid ${filterStatus===id?D.accentMid:D.ink150}`,borderRadius:20,background:filterStatus===id?D.accentLit:"#fff",color:filterStatus===id?D.accentMid:D.ink500,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>{label}{id==="draft"&&draftCount>0?` (${draftCount})`:""}</button>
        ))}
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{padding:"6px 12px",borderRadius:20,fontSize:12,border:`1.5px solid ${D.ink150}`,background:"#fff",color:D.ink500,fontFamily:D.font,cursor:"pointer",marginLeft:4}}>
          <option value="all">All types</option>
          {["manual","accrual","prepayment","depreciation","provision","correction","vat_adjustment","year_end"].map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
        </select>
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:60,color:D.ink500}}>Loading journals\u2026</div>
      ):filteredJournals.length===0?(
        <div style={{...card,padding:"48px 32px",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>{"\uD83D\uDCD2"}</div>
          <div style={{fontSize:16,fontWeight:700,color:D.ink700,marginBottom:6}}>No journals yet</div>
          <div style={{fontSize:13,color:D.ink500,marginBottom:20}}>Use templates or create a blank journal.</div>
          <button onClick={()=>{setView("new");resetForm();}} style={{padding:"10px 24px",background:D.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>+ New Journal</button>
        </div>
      ):(
        <div style={card}>
          <div style={{display:"grid",gridTemplateColumns:"100px 1fr 140px 100px 110px 90px",padding:"10px 20px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em"}}>
            <span>Date</span><span>Description</span><span>Reference</span><span>Type</span><span style={{textAlign:"right"}}>Amount</span><span style={{textAlign:"center"}}>Status</span>
          </div>
          {filteredJournals.map((j,idx)=>{
            const jLines=j.journal_lines||[];
            const drT=jLines.reduce((s,l)=>s+(parseFloat(l.debit_amount)||0),0);
            return (
              <div key={j.id} onClick={()=>{setSelectedJournal(j);setView("detail");}} style={{display:"grid",gridTemplateColumns:"100px 1fr 140px 100px 110px 90px",padding:"13px 20px",borderBottom:idx<filteredJournals.length-1?`1px solid ${D.ink150}`:"none",alignItems:"center",cursor:"pointer",transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=D.ink075} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:12,color:D.ink500}}>{fmtDate(j.journal_date)}</span>
                <div><div style={{fontSize:13,fontWeight:600,color:D.ink700}}>{j.description}</div>{jLines.length>0&&<div style={{fontSize:11,color:D.ink300,marginTop:2}}>{jLines.length} line{jLines.length!==1?"s":""}</div>}</div>
                <span style={{fontSize:12,color:D.ink500}}>{j.reference||"\u2014"}</span>
                <span style={{fontSize:12,color:D.ink500,textTransform:"capitalize"}}>{j.journal_type}</span>
                <span style={{fontSize:14,fontWeight:700,color:D.accent,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{drT>0?fmtZar(drT):"\u2014"}</span>
                <div style={{textAlign:"center"}}><StatusPill status={j.status}/></div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{background:D.ink075,borderRadius:8,padding:"14px 18px",fontSize:12,color:D.ink500,border:`1px solid ${D.ink150}`,lineHeight:1.7,fontFamily:D.font,marginTop:8}}>
        <strong style={{color:D.ink700}}>Journal policy:</strong>{" "}
        Double-entry (Dr = Cr). Drafts can be reviewed before posting. Posted journals are locked and permanent.
      </div>
    </div>
  );
}
