// src/components/hq/HQSmartCapture.js — WP-SMART-CAPTURE
// AI-powered receipt & invoice capture — mobile-first
// Modes: Quick Capture (receipts) | History
// Integrates: process-document EF + Supabase Storage

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

const D = {
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  ink900:"#0D0D0D", ink700:"#1F2937", ink500:"#6B7280",
  ink300:"#D1D5DB", ink150:"#E5E7EB", ink075:"#F9FAFB",
  accent:"#1A3D2B", accentMid:"#2D6A4F", accentLit:"#ECFDF5",
  success:"#059669", successBg:"#ECFDF5", successBd:"#6EE7B7",
  danger:"#DC2626", dangerBg:"#FEF2F2", dangerBd:"#FECACA",
  warning:"#D97706", warningBg:"#FFFBEB", warningBd:"#FDE68A",
  info:"#2563EB", infoBg:"#EFF6FF", infoBd:"#BFDBFE",
  shadow:"0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
  shadowLg:"0 8px 32px rgba(0,0,0,0.12)",
};

const fmtZar = (n) => `R\u202F${(parseFloat(n)||0).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}) : "\u2014";
const fileToBase64 = (file) => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});

function SARSBadge({sarsCompliant,vatNumber,inputVatAmount,flags}) {
  if (sarsCompliant===undefined||sarsCompliant===null) return null;
  return (
    <div style={{borderRadius:10,overflow:"hidden",marginBottom:12,border:`1px solid ${sarsCompliant?D.successBd:D.warningBd}`}}>
      <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,background:sarsCompliant?D.successBg:D.warningBg}}>
        <span style={{fontSize:18}}>{sarsCompliant?"\u2705":"\u26A0\uFE0F"}</span>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:sarsCompliant?D.success:D.warning}}>{sarsCompliant?"Valid SARS Tax Invoice":"Non-compliant document"}</div>
          {vatNumber&&<div style={{fontSize:11,color:D.ink500}}>VAT Reg: {vatNumber}</div>}
          {sarsCompliant&&inputVatAmount>0&&<div style={{fontSize:11,color:D.accentMid,fontWeight:700,marginTop:2}}>Input VAT claimable: {fmtZar(inputVatAmount)}</div>}
          {!sarsCompliant&&<div style={{fontSize:11,color:D.warning}}>Input VAT cannot be claimed from SARS</div>}
        </div>
      </div>
      {(flags||[]).map((f,i)=><div key={i} style={{padding:"7px 14px",borderTop:`1px solid ${D.warningBd}`,background:"#FFFDF5",fontSize:11,color:D.warning}}>{f.message}</div>)}
    </div>
  );
}

function EditableField({label,value,onChange,type="text",placeholder=""}) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value||"");
  const inputRef=useRef(null);
  useEffect(()=>{setDraft(value||"");},[value]);
  useEffect(()=>{if(editing)inputRef.current?.focus();},[editing]);
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{label}</div>
      {editing?(
        <div style={{display:"flex",gap:6}}>
          <input ref={inputRef} type={type} value={draft} placeholder={placeholder} onChange={e=>setDraft(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){onChange(draft);setEditing(false);}if(e.key==="Escape")setEditing(false);}}
            style={{flex:1,padding:"7px 10px",border:`1.5px solid ${D.accentMid}`,borderRadius:7,fontSize:14,fontFamily:D.font,outline:"none"}}/>
          <button onClick={()=>{onChange(draft);setEditing(false);}} style={{padding:"7px 12px",background:D.accent,color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"\u2713"}</button>
        </div>
      ):(
        <div onClick={()=>setEditing(true)} style={{padding:"9px 12px",border:`1.5px dashed ${D.ink150}`,borderRadius:7,fontSize:14,color:value?D.ink700:D.ink300,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{value||placeholder||"Tap to edit"}</span>
          <span style={{fontSize:11,color:D.ink300}}>{"\u270F\uFE0F"}</span>
        </div>
      )}
    </div>
  );
}

export default function HQSmartCapture() {
  const { tenant, tenantId, industryProfile } = useTenant(); // eslint-disable-line no-unused-vars
  const fileRef = useRef(null);
  const [mode,setMode]=useState("capture");
  const [phase,setPhase]=useState("idle");
  const [dragOver,setDragOver]=useState(false);
  const [capture,setCapture]=useState(null);
  const [processMsg,setProcessMsg]=useState("");
  const [posting,setPosting]=useState(false);
  const [successData,setSuccessData]=useState(null);
  const [history,setHistory]=useState([]);
  const [histLoading,setHistLoading]=useState(false);
  const [toast,setToast]=useState(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4500);};

  const loadHistory=useCallback(async()=>{
    if(!tenantId)return; setHistLoading(true);
    try{
      const { data }=await supabase.from("document_log").select("id,file_name,status,uploaded_at,extraction_summary").eq("tenant_id",tenantId).order("uploaded_at",{ascending:false}).limit(30);
      setHistory(data||[]);
    }finally{setHistLoading(false);}
  },[tenantId]);

  useEffect(()=>{if(mode==="history")loadHistory();},[mode,loadHistory]);

  const processFile=async(file)=>{
    if(file.size>20*1024*1024){showToast("File exceeds 20MB.","error");return;}
    setPhase("processing"); setProcessMsg("Uploading\u2026");
    try{
      const ext=file.name.split(".").pop()||"jpg";
      const path=`receipts/${tenantId}/${Date.now()}.${ext}`;
      const{error:upErr}=await supabase.storage.from("supplier-documents").upload(path,file,{contentType:file.type,upsert:false});
      if(upErr)throw new Error(`Storage: ${upErr.message}`);
      setProcessMsg("AI is reading your document\u2026");
      const base64=await fileToBase64(file);
      const{data:fnData,error:fnErr}=await supabase.functions.invoke("process-document",{
        body:{file_base64:base64,mime_type:file.type||"image/jpeg",file_url:path,file_name:file.name,file_size_kb:Math.round(file.size/1024),industry_profile:industryProfile||"cannabis_retail",context:{}}
      });
      if(fnErr||!fnData?.success)throw new Error(fnData?.error||fnErr?.message||"AI extraction failed");
      setProcessMsg("Done!");
      const ext2=fnData.extraction||{};
      setCapture({
        document_log_id:fnData.document_log_id,
        file_name:file.name,
        vendor_name:ext2.supplier?.name||null,
        document_date:ext2.reference?.date||null,
        document_number:ext2.reference?.number||null,
        amount_zar:ext2.total_amount||0,
        currency:ext2.currency||"ZAR",
        sars_compliant:fnData.sars_compliant??ext2.sars_compliant??null,
        sars_vat_number:fnData.sars_vat_number||null,
        sars_flags:ext2.sars_flags||[],
        input_vat_claimable:fnData.input_vat_claimable||false,
        input_vat_amount:fnData.input_vat_amount||0,
        capture_type:fnData.capture_type||"expense_receipt",
        confidence:ext2.confidence||null,
        line_items:(ext2.line_items||[]).slice(0,10),
        proposed_updates:ext2.proposed_updates||[],
        extraction:ext2,
      });
      setPhase("review");
    }catch(err){
      console.error("[SmartCapture]",err.message);
      setProcessMsg(err.message); setPhase("error");
    }
  };

  const handleFileInput=(e)=>{const f=e.target.files?.[0];if(f)processFile(f);e.target.value="";};
  const handleDrop=(e)=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files?.[0];if(f)processFile(f);};

  const handleCreateExpense=async()=>{
    if(!capture)return; setPosting(true);
    try{
      const desc=capture.vendor_name?`${capture.vendor_name}${capture.document_number?" \u2014 "+capture.document_number:""}`:`Receipt \u2014 ${capture.document_date||"today"}`;
      const{error}=await supabase.from("expenses").insert({
        tenant_id:tenantId,
        expense_date:capture.document_date||new Date().toISOString().split("T")[0],
        category:"opex",
        subcategory:null,
        description:desc,
        amount_zar:capture.amount_zar||0,
        currency:capture.currency||"ZAR",
        document_id:capture.document_log_id||null,
      });
      if(error)throw error;
      setSuccessData({amount:capture.amount_zar,vendor:capture.vendor_name,vat:capture.input_vat_amount});
      setPhase("success");
      showToast("Expense created!");
    }catch(err){showToast("Failed: "+err.message,"error");}
    finally{setPosting(false);}
  };

  const resetCapture=()=>{setCapture(null);setSuccessData(null);setPhase("idle");setProcessMsg("");};
  const updateCapture=(k,v)=>setCapture(p=>({...p,[k]:v}));

  const card={background:"#fff",borderRadius:12,boxShadow:D.shadow,overflow:"hidden",marginBottom:16};

  return (
    <div style={{fontFamily:D.font,color:D.ink700,maxWidth:720,margin:"0 auto"}}>
      {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:D.shadowLg}}>{toast.msg}</div>}

      <div style={{marginBottom:24}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:700,color:D.ink900,letterSpacing:"-0.02em"}}>Smart Capture</h2>
        <p style={{margin:"4px 0 0",color:D.ink500,fontSize:13}}>Photograph any business document \u2014 AI reads it and posts it to your books</p>
      </div>

      <div style={{display:"flex",gap:0,marginBottom:24,border:`1px solid ${D.ink150}`,borderRadius:10,overflow:"hidden"}}>
        {[["capture","\uD83D\uDCF8 Capture"],["history","\uD83D\uDCCB History"]].map(([id,label])=>(
          <button key={id} onClick={()=>{setMode(id);if(phase!=="idle"&&phase!=="success")resetCapture();}}
            style={{flex:1,padding:"11px 0",border:"none",cursor:"pointer",fontFamily:D.font,fontSize:13,fontWeight:700,background:mode===id?D.accent:"#fff",color:mode===id?"#fff":D.ink500,transition:"all 0.15s"}}>{label}</button>
        ))}
      </div>

      {mode==="capture"&&<>
        {phase==="idle"&&<>
          <input ref={fileRef} type="file" accept="image/*,application/pdf,.heic" capture="environment" style={{display:"none"}} onChange={handleFileInput}/>
          <div onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
            style={{borderRadius:16,padding:"48px 24px",textAlign:"center",cursor:"pointer",border:`2px dashed ${dragOver?D.accentMid:D.ink150}`,background:dragOver?D.accentLit:"#fff",boxShadow:D.shadowLg,marginBottom:20,transition:"all 0.2s"}}>
            <div style={{fontSize:64,marginBottom:16}}>{"\uD83D\uDCF8"}</div>
            <div style={{fontSize:18,fontWeight:700,color:D.accent,marginBottom:6}}>Take a Photo or Upload</div>
            <div style={{fontSize:13,color:D.ink500,marginBottom:20}}>Receipts \u00b7 Invoices \u00b7 Utility Bills \u00b7 Petrol Slips</div>
            <div style={{display:"inline-block",padding:"12px 32px",background:D.accent,color:"#fff",borderRadius:10,fontSize:15,fontWeight:700}}>{"\uD83D\uDCF7"} Open Camera / Upload File</div>
            <div style={{marginTop:12,fontSize:11,color:D.ink300}}>PDF \u00b7 JPG \u00b7 PNG \u00b7 HEIC \u00b7 max 20MB</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[["\uD83E\uDDFE","Petrol slips","Auto-categorised as Vehicle & Travel"],["\uD83C\uDF7D\uFE0F","Restaurant bills","Entertainment flag"],["\u26A1","Utility bills","Auto-matched as Utilities"],["\uD83D\uDCE6","Supplier invoices","Matches open POs"]].map(([icon,title,desc])=>(
              <div key={title} style={{...card,padding:16,marginBottom:0}}>
                <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
                <div style={{fontSize:13,fontWeight:700,color:D.ink700,marginBottom:3}}>{title}</div>
                <div style={{fontSize:11,color:D.ink500,lineHeight:1.5}}>{desc}</div>
              </div>
            ))}
          </div>
        </>}

        {phase==="processing"&&<div style={{...card,padding:48,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>{"\uD83E\uDD16"}</div>
          <div style={{fontSize:16,fontWeight:700,color:D.accent,marginBottom:8}}>Reading your document\u2026</div>
          <div style={{fontSize:13,color:D.ink500,marginBottom:24}}>{processMsg}</div>
          <style>{`@keyframes sc-spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{width:60,height:60,border:`4px solid ${D.accentLit}`,borderTopColor:D.accent,borderRadius:"50%",margin:"0 auto",animation:"sc-spin 0.8s linear infinite"}}/>
        </div>}

        {phase==="error"&&<div style={{...card,padding:32,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>{"\u274C"}</div>
          <div style={{fontSize:15,fontWeight:700,color:D.danger,marginBottom:8}}>Processing failed</div>
          <div style={{fontSize:12,color:D.ink500,marginBottom:20}}>{processMsg}</div>
          <button onClick={resetCapture} style={{padding:"10px 24px",background:D.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Try Again</button>
        </div>}

        {phase==="review"&&capture&&<div>
          <SARSBadge sarsCompliant={capture.sars_compliant} vatNumber={capture.sars_vat_number} inputVatAmount={capture.input_vat_amount} flags={capture.sars_flags}/>
          <div style={{...card,padding:20}}>
            <div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Extracted Data</div>
            <EditableField label="Vendor" value={capture.vendor_name} onChange={v=>updateCapture("vendor_name",v)} placeholder="Vendor name"/>
            <EditableField label="Date" value={capture.document_date} onChange={v=>updateCapture("document_date",v)} type="date"/>
            <EditableField label="Amount (ZAR)" value={String(capture.amount_zar||"")} onChange={v=>updateCapture("amount_zar",parseFloat(v)||0)} type="number" placeholder="0.00"/>
            <EditableField label="Reference / Invoice No" value={capture.document_number} onChange={v=>updateCapture("document_number",v)}/>
            {capture.capture_type&&<div style={{marginTop:8,fontSize:11,color:D.ink500}}>Type: <strong style={{color:D.accentMid}}>{capture.capture_type.replace(/_/g," ")}</strong></div>}
            {capture.confidence!=null&&<div style={{fontSize:11,color:D.ink500,marginTop:4}}>AI confidence: <strong>{Math.round(capture.confidence*100)}%</strong></div>}
          </div>

          {capture.line_items?.length>0&&<div style={{...card,padding:0}}>
            <div style={{padding:"10px 16px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em"}}>Line Items ({capture.line_items.length})</div>
            {capture.line_items.map((li,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 16px",borderBottom:`1px solid ${D.ink150}`,fontSize:13}}>
                <span style={{color:D.ink700}}>{li.description||li.product_name||"Item "+(i+1)}</span>
                <span style={{fontWeight:600,fontVariantNumeric:"tabular-nums",color:D.accent}}>{li.total?fmtZar(li.total):li.quantity?`${li.quantity} \u00d7 ${fmtZar(li.unit_price||0)}`:"\u2014"}</span>
              </div>
            ))}
          </div>}

          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={handleCreateExpense} disabled={posting} style={{flex:1,padding:"12px 0",background:D.accent,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:posting?"wait":"pointer",opacity:posting?0.6:1}}>{posting?"Posting\u2026":"\u2713 Create Expense"}</button>
            <button onClick={resetCapture} style={{padding:"12px 20px",border:`1px solid ${D.ink150}`,borderRadius:8,background:"#fff",color:D.ink500,fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>}

        {phase==="success"&&successData&&<div style={{...card,padding:0}}>
          <div style={{background:"linear-gradient(135deg,#1A3D2B 0%,#2D6A4F 100%)",padding:"24px",color:"#fff"}}>
            <div style={{fontSize:40,marginBottom:8}}>{"\u2705"}</div>
            <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>Posted to your books!</div>
            <div style={{fontSize:13,opacity:0.8}}>Expense created from captured document</div>
          </div>
          <div style={{padding:24}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {[["Amount",fmtZar(successData.amount),D.accent],["Vendor",successData.vendor||"\u2014",D.ink700],["Input VAT",successData.vat>0?fmtZar(successData.vat):"N/A",successData.vat>0?D.success:D.ink300]].map(([l,v,c])=>(
                <div key={l}><div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div></div>
              ))}
            </div>
            <button onClick={resetCapture} style={{width:"100%",padding:"11px 0",background:D.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"\uD83D\uDCF8"} Capture Another</button>
          </div>
        </div>}
      </>}

      {mode==="history"&&<>
        {histLoading?<div style={{textAlign:"center",padding:40,color:D.ink500}}>Loading\u2026</div>
        :history.length===0?<div style={{...card,padding:"36px 24px",textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:10}}>{"\uD83D\uDCF8"}</div>
          <div style={{fontSize:15,fontWeight:700,color:D.ink700,marginBottom:6}}>No captures yet</div>
          <div style={{fontSize:13,color:D.ink500}}>Switch to Capture mode to photograph your first document.</div>
        </div>
        :<div style={card}>
          <div style={{padding:"10px 20px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em"}}>{history.length} document{history.length!==1?"s":""}</div>
          {history.map((h,i)=>(
            <div key={h.id} style={{display:"flex",justifyContent:"space-between",padding:"12px 20px",borderBottom:i<history.length-1?`1px solid ${D.ink150}`:"none",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:D.ink700}}>{h.file_name||"Document"}</div>
                <div style={{fontSize:11,color:D.ink500,marginTop:2}}>{fmtDate(h.uploaded_at)} \u00b7 {h.status||"processed"}</div>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:D.accentMid,fontVariantNumeric:"tabular-nums"}}>{h.extraction_summary?.total_amount?fmtZar(h.extraction_summary.total_amount):"\u2014"}</div>
            </div>
          ))}
        </div>}
      </>}
    </div>
  );
}
