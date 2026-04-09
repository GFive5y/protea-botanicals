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

function DuplicateBanner({details,confidence}) {
  const fpLabels={exact_image:"Exact same photo",fingerprint_uti:"UTI match (100%)",fingerprint_auth:"Auth code + date",fingerprint_echo:"ECHO + merchant",fingerprint_rcpt:"Receipt + date",fingerprint_composite:"Vendor + date + amount"};
  const label=fpLabels[details?.match_type]||details?.fingerprint_label||details?.match_type||"Unknown";
  const pct=Math.round((confidence||0)*100);
  return (
    <div style={{borderRadius:10,overflow:"hidden",marginBottom:16,border:"2.5px solid #DC2626",boxShadow:"0 6px 24px rgba(220,38,38,0.25)"}}>
      <div style={{background:"#DC2626",padding:"14px 18px",display:"flex",gap:12,alignItems:"center"}}>
        <span style={{fontSize:28}}>{"\uD83D\uDEA8"}</span>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:"-0.01em"}}>DUPLICATE DOCUMENT \u2014 DO NOT POST</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",marginTop:2}}>Match: {label} \u00b7 Confidence: {pct}%</div>
        </div>
      </div>
      <div style={{background:"#FEF2F2",padding:"14px 18px"}}>
        <div style={{fontSize:13,color:"#7F1D1D",marginBottom:8,lineHeight:1.6}}>{details?.message}</div>
        {details?.matched_at&&<div style={{fontSize:12,color:"#991B1B",marginBottom:8}}>{"\uD83D\uDCC5"} Original: {new Date(details.matched_at).toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"})}{details.matched_supplier&&` \u00b7 ${details.matched_supplier}`}</div>}
        <div style={{padding:"10px 14px",background:"#FEE2E2",borderRadius:8,fontSize:12,color:"#7F1D1D",lineHeight:1.6}}>{"\u26D4"} Posting will create <strong>duplicate expense records</strong>. Contact your accountant if this is genuinely different.</div>
      </div>
    </div>
  );
}

// Policy engine — reads capture_rules, returns enriched capture
async function applyPolicyRules(tid, cap) {
  try {
    const { data: rules } = await supabase.from("capture_rules").select("*").eq("tenant_id",tid).eq("is_active",true).order("priority");
    let reqApproval=false, reason=null; const flags=[];
    for (const r of rules||[]) {
      const p=r.parameters||{};
      if (r.rule_type==="amount_threshold"&&(cap.amount_zar||0)>(p.above||1000)) {
        if(r.action==="require_approval"){reqApproval=true;reason=reason||r.message;}
        flags.push({rule_id:r.id,rule_name:r.rule_name,severity:r.severity,message:r.message});
      }
      if (r.rule_type==="approval_required"&&(p.capture_types||[]).includes(cap.capture_type)) {
        reqApproval=true;reason=reason||r.message;
        flags.push({rule_id:r.id,rule_name:r.rule_name,severity:r.severity,message:r.message});
      }
      if (r.rule_type==="vat_required"&&(p.capture_types||[]).includes(cap.capture_type)&&!cap.sars_compliant)
        flags.push({rule_id:r.id,rule_name:r.rule_name,severity:r.severity,message:r.message});
      if (r.rule_type==="category_auto"&&!cap._catApplied) {
        const v=(cap.vendor_name||"").toLowerCase();
        const hit=p.vendor_contains?v.includes(p.vendor_contains.toLowerCase()):(p.vendor_contains_any||[]).some(k=>v.includes(k.toLowerCase()));
        if(hit){cap.suggested_category=p.category;cap.suggested_subcategory=p.subcategory;cap._catApplied=true;}
      }
    }
    return {...cap,policy_flags:flags,requires_approval:reqApproval,approval_reason:reason};
  } catch{return cap;}
}

export default function HQSmartCapture() {
  const { tenant, tenantId, industryProfile } = useTenant(); // eslint-disable-line no-unused-vars
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [isMobile,setIsMobile]=useState(false);
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
  const [captureQueueId,setCaptureQueueId]=useState(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4500);};

  const loadHistory=useCallback(async()=>{
    if(!tenantId)return; setHistLoading(true);
    try{
      const startOfMonth=new Date();startOfMonth.setDate(1);startOfMonth.setHours(0,0,0,0);
      const { data }=await supabase.from("capture_queue").select("*").eq("tenant_id",tenantId).gte("captured_at",startOfMonth.toISOString()).order("captured_at",{ascending:false});
      setHistory(data||[]);
    }finally{setHistLoading(false);}
  },[tenantId]);

  useEffect(()=>{if(mode==="history")loadHistory();},[mode,loadHistory]);
  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768||/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    check();
    window.addEventListener("resize",check);
    return()=>window.removeEventListener("resize",check);
  },[]);

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
      const invokeBody={file_base64:base64,mime_type:file.type||"image/jpeg",file_url:path,file_name:file.name,file_size_kb:Math.round(file.size/1024),industry_profile:industryProfile||"cannabis_retail",tenant_id:tenantId,context:{}};
      let fnData=null,fnErr=null;
      for(let attempt=0;attempt<2;attempt++){
        const res=await supabase.functions.invoke("process-document",{body:invokeBody});
        fnData=res.data;fnErr=res.error;
        if(!fnErr&&fnData?.success)break;
        if(attempt===0){setProcessMsg("Retrying AI extraction\u2026");await new Promise(r=>setTimeout(r,1500));}
      }
      if(fnErr||!fnData?.success)throw new Error(fnData?.error||fnErr?.message||"AI extraction failed \u2014 please try again");
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
        is_duplicate:fnData.is_duplicate||false,
        duplicate_of:fnData.duplicate_of||null,
        duplicate_confidence:fnData.duplicate_confidence||0,
        duplicate_match_type:fnData.duplicate_match_type||null,
        duplicate_details:fnData.duplicate_details||{},
        document_fingerprint:fnData.document_fingerprint||null,
        fingerprint_level:fnData.fingerprint_level||0,
        unique_identifiers:fnData.unique_identifiers||{},
      });
      // Guard: tenantId must exist
      if (!tenantId) {
        showToast("Session error \u2014 please refresh and try again.", "error");
        setPhase("error"); return;
      }
      // Write to capture_queue + run policy engine
      const captureObj = {
        tenant_id:tenantId,
        document_log_id:fnData?.document_log_id||null,
        file_name:file?.name||null,
        image_storage_path:path||null,
        capture_type:fnData?.capture_type||"expense_receipt",
        overall_confidence:typeof ext2.confidence==="number"?ext2.confidence:null,
        sars_compliant:fnData?.sars_compliant??null,
        sars_vat_number:fnData?.sars_vat_number||null,
        sars_flags:ext2.sars_flags||[],
        input_vat_claimable:fnData?.input_vat_claimable||false,
        input_vat_amount:fnData?.input_vat_amount||0,
        vendor_name:ext2.supplier?.name||null,
        vendor_matched_id:ext2.supplier?.matched_id||null,
        document_date:ext2.reference?.date||null,
        document_number:ext2.reference?.number||null,
        amount_incl_vat:ext2.total_amount||0,
        amount_excl_vat:(ext2.total_amount||0)-(fnData?.input_vat_amount||0),
        vat_amount:fnData?.input_vat_amount||0,
        amount_zar:ext2.total_amount||0,
        currency:ext2.currency||"ZAR",
        suggested_category:ext2.expense_category||"opex",
        suggested_subcategory:null,
        status:"pending_review",
      };
      let enriched = captureObj;
      try { enriched = await applyPolicyRules(tenantId, captureObj); }
      catch(policyErr) { console.warn("[SmartCapture] Policy rules failed (non-fatal):", policyErr?.message); }

      console.log("[SmartCapture] Inserting capture_queue — fingerprint:", fnData?.document_fingerprint, "isDupe:", fnData?.is_duplicate);
      const { data:cqRow, error:cqErr } = await supabase.from("capture_queue").insert({
        tenant_id:           enriched.tenant_id,
        document_log_id:     enriched.document_log_id||null,
        file_name:           enriched.file_name||null,
        image_storage_path:  enriched.image_storage_path||null,
        capture_type:        enriched.capture_type||"expense_receipt",
        extracted_data:      enriched.extracted_data||{},
        overall_confidence:  enriched.overall_confidence||null,
        sars_compliant:      enriched.sars_compliant??null,
        sars_vat_number:     enriched.sars_vat_number||null,
        sars_flags:          enriched.sars_flags||[],
        input_vat_claimable: enriched.input_vat_claimable||false,
        input_vat_amount:    enriched.input_vat_amount||0,
        vendor_name:         enriched.vendor_name||null,
        vendor_matched_id:   null, // never trust EF matched_id — FK to suppliers table, EF returns non-existent UUIDs
        document_date:       enriched.document_date||null,
        document_number:     enriched.document_number||null,
        amount_incl_vat:     enriched.amount_incl_vat||0,
        amount_excl_vat:     enriched.amount_excl_vat||0,
        vat_amount:          enriched.vat_amount||0,
        amount_zar:          enriched.amount_zar||0,
        currency:            enriched.currency||"ZAR",
        suggested_category:  enriched.suggested_category||"opex",
        suggested_subcategory: enriched.suggested_subcategory||null,
        policy_flags:        enriched.policy_flags||[],
        requires_approval:   enriched.requires_approval||false,
        approval_reason:     enriched.approval_reason||null,
        status:              "pending_review",
        auto_posted:         false,
        document_fingerprint: fnData?.document_fingerprint||null,
        is_duplicate:        fnData?.is_duplicate||false,
        duplicate_of_id:     null,
        duplicate_confidence: typeof fnData?.duplicate_confidence==="number"?fnData.duplicate_confidence:null,
        duplicate_details:   fnData?.duplicate_details||{},
        unique_identifiers:  fnData?.unique_identifiers||{},
      }).select("id").single();

      if (cqErr) {
        console.error("[SmartCapture] capture_queue insert failed:", cqErr.message, cqErr.code, cqErr.details);
        showToast("Capture not saved \u2014 try again.", "error");
        setProcessMsg(cqErr.message || "Database save failed \u2014 try again");
        setPhase("error"); return;
      }
      setCaptureQueueId(cqRow?.id||null);
      // Merge policy results into capture state for render
      setCapture(prev => ({
        ...prev,
        policy_flags: enriched.policy_flags || [],
        requires_approval: enriched.requires_approval || false,
        approval_reason: enriched.approval_reason || null,
        suggested_category: enriched.suggested_category || prev?.suggested_category,
        suggested_subcategory: enriched.suggested_subcategory || null,
      }));

      setPhase("review");
    }catch(err){
      console.error("[SmartCapture]",err.message);
      setProcessMsg(err.message); setPhase("error");
    }
  };

  const handleFileInput=(e)=>{const f=e.target.files?.[0];if(f)processFile(f);e.target.value="";};
  const handleDrop=(e)=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files?.[0];if(f)processFile(f);};

  const handleCreateExpense=async()=>{
    if(!captureQueueId){showToast("Capture not saved — try again.","error");return;}
    setPosting(true);
    try{
      const userId=(await supabase.auth.getUser()).data.user?.id||null;
      const{data:postRes,error:postErr}=await supabase.functions.invoke("auto-post-capture",{
        body:{capture_queue_id:captureQueueId,approved_by:userId}
      });
      if(postErr||!postRes?.success)throw new Error(postRes?.error||postErr?.message||"Post failed");
      setSuccessData({
        expense_id:postRes.expense_id,journal_entry_id:postRes.journal_entry_id,
        vat_transaction_id:postRes.vat_transaction_id,vat_period:postRes.vat_period,
        sars_compliant:postRes.sars_compliant,input_vat_claimable:postRes.input_vat_claimable,
        input_vat_amount:postRes.input_vat_amount,
        vendor_name:capture?.vendor_name,amount_zar:capture?.amount_zar,
        document_fingerprint:capture?.document_fingerprint||null,
      });
      setPhase("success");
      showToast("Posted to books!");
    }catch(err){showToast("Failed: "+err.message,"error");}
    finally{setPosting(false);}
  };

  const handleReceiveStock=async()=>{
    if(!captureQueueId){showToast("Capture not saved \u2014 try again.","error");return;}
    setPosting(true);
    try{
      const userId=(await supabase.auth.getUser()).data.user?.id||null;
      const{data:res,error:err}=await supabase.functions.invoke("receive-from-capture",{
        body:{capture_queue_id:captureQueueId,approved_by:userId}
      });
      if(err||!res?.success)throw new Error(res?.error||err?.message||"Receipt failed");
      setSuccessData({
        vendor_name:capture?.vendor_name,amount_zar:capture?.amount_zar,
        journal_entry_id:res.journal_entry_id,
        items_received:res.items_received,items_skipped:res.items_skipped,
        po_id:res.po_id,document_fingerprint:capture?.document_fingerprint,
        is_stock_receipt:true,
      });
      setPhase("success");
      showToast("Stock received and posted to books!");
    }catch(err){showToast("Failed: "+err.message,"error");}
    finally{setPosting(false);}
  };
  const resetCapture=()=>{setCapture(null);setSuccessData(null);setPhase("idle");setProcessMsg("");setCaptureQueueId(null);};
  const updateCapture=(k,v)=>setCapture(p=>({...p,[k]:v}));

  const card={background:"#fff",borderRadius:12,boxShadow:D.shadow,overflow:"hidden",marginBottom:16};
  const stockActions=(capture?.proposed_updates||[]).filter(u=>["receive_delivery_item","create_purchase_order"].includes(u.action));
  const isStockCapture=["delivery_note","supplier_invoice"].includes(capture?.capture_type)&&stockActions.length>0;

  return (
    <div style={{fontFamily:D.font,color:D.ink700,maxWidth:720,margin:"0 auto"}}>
      {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:D.shadowLg}}>{toast.msg}</div>}

      <div style={{marginBottom:24}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:700,color:D.ink900,letterSpacing:"-0.02em"}}>Smart Capture</h2>
        <p style={{margin:"4px 0 0",color:D.ink500,fontSize:13}}>Photograph any business document {"\u2014"} AI reads it and posts it to your books</p>
      </div>

      <div style={{display:"flex",gap:0,marginBottom:24,border:`1px solid ${D.ink150}`,borderRadius:10,overflow:"hidden"}}>
        {[["capture","\uD83D\uDCF8 Capture"],["history","\uD83D\uDCCB History"]].map(([id,label])=>(
          <button key={id} onClick={()=>{setMode(id);if(phase!=="idle"&&phase!=="success")resetCapture();}}
            style={{flex:1,padding:"11px 0",border:"none",cursor:"pointer",fontFamily:D.font,fontSize:13,fontWeight:700,background:mode===id?D.accent:"#fff",color:mode===id?"#fff":D.ink500,transition:"all 0.15s"}}>{label}</button>
        ))}
      </div>

      {mode==="capture"&&<>
        {phase==="idle"&&<>
          {/* File-pick only — no capture attr — opens native file picker on all platforms */}
          <input ref={fileRef} type="file" accept="image/*,application/pdf,.heic" style={{display:"none"}} onChange={handleFileInput}/>
          {/* Camera only — capture="environment" opens rear camera directly on mobile */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFileInput}/>
          {isMobile?(
            <div style={{marginBottom:20}}>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:48,marginBottom:8}}>{"\uD83D\uDCF8"}</div>
                <div style={{fontSize:16,fontWeight:700,color:D.ink700,marginBottom:4}}>Capture a Document</div>
                <div style={{fontSize:13,color:D.ink500}}>Receipts · Invoices · Utility Bills · Petrol Slips</div>
              </div>
              <button onClick={()=>cameraRef.current?.click()}
                style={{display:"block",width:"100%",padding:"18px 24px",background:D.accent,color:"#fff",border:"none",borderRadius:12,fontSize:17,fontWeight:700,cursor:"pointer",marginBottom:10,boxShadow:D.shadowLg,letterSpacing:"-0.01em"}}>
                {"\uD83D\uDCF7"} Take Photo
              </button>
              <button onClick={()=>fileRef.current?.click()}
                style={{display:"block",width:"100%",padding:"14px 24px",background:"#fff",color:D.accentMid,border:`2px solid ${D.accentMid}`,borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                {"\uD83D\uDCC1"} Upload from Files
              </button>
              <div style={{textAlign:"center",fontSize:11,color:D.ink300,marginTop:8}}>PDF · JPG · PNG · HEIC · max 20MB</div>
            </div>
          ):(
            <div onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
              style={{borderRadius:16,padding:"48px 24px",textAlign:"center",cursor:"pointer",border:`2px dashed ${dragOver?D.accentMid:D.ink150}`,background:dragOver?D.accentLit:"#fff",boxShadow:D.shadowLg,marginBottom:20,transition:"all 0.2s"}}>
              <div style={{fontSize:64,marginBottom:16}}>{"\uD83D\uDCF8"}</div>
              <div style={{fontSize:18,fontWeight:700,color:D.accent,marginBottom:6}}>Upload a Document</div>
              <div style={{fontSize:13,color:D.ink500,marginBottom:20}}>Receipts · Invoices · Utility Bills · Petrol Slips</div>
              <div style={{display:"inline-block",padding:"12px 32px",background:D.accent,color:"#fff",borderRadius:10,fontSize:15,fontWeight:700}}>{"\uD83D\uDCC1"} Choose File or Drag & Drop</div>
              <div style={{marginTop:12,fontSize:11,color:D.ink300}}>PDF · JPG · PNG · HEIC · max 20MB</div>
            </div>
          )}
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
          {/* Duplicate detection — highest priority */}
          {capture.is_duplicate&&<DuplicateBanner details={capture.duplicate_details} confidence={capture.duplicate_confidence}/>}
          <SARSBadge sarsCompliant={capture.sars_compliant} vatNumber={capture.sars_vat_number} inputVatAmount={capture.input_vat_amount} flags={capture.sars_flags}/>
          {/* Policy flags */}
          {(capture.policy_flags||[]).map((flag,i)=>{
            const cs={block:{bg:D.dangerBg,color:D.danger,icon:"\uD83D\uDEAB"},warning:{bg:D.warningBg,color:D.warning,icon:"\u26A0\uFE0F"},info:{bg:D.infoBg,color:D.info,icon:"\u2139\uFE0F"}};
            const s=cs[flag.severity]||cs.info;
            return <div key={i} style={{marginBottom:8,padding:"8px 12px",borderRadius:8,background:s.bg,border:`1px solid ${s.color}33`,display:"flex",gap:8,alignItems:"flex-start"}}>
              <span>{s.icon}</span>
              <div><div style={{fontSize:11,fontWeight:700,color:s.color}}>{flag.rule_name}</div><div style={{fontSize:11,color:s.color,opacity:0.9}}>{flag.message}</div></div>
            </div>;
          })}
          {capture.requires_approval&&<div style={{padding:"10px 12px",background:D.warningBg,border:`1px solid ${D.warningBd}`,borderRadius:8,marginBottom:12,fontSize:12,color:D.warning}}><strong>Approval required:</strong> {capture.approval_reason}</div>}
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

          {/* Stock to Receive panel — supplier_invoice / delivery_note */}
          {isStockCapture&&<div style={{...card,padding:0,marginBottom:12}}>
            <div style={{padding:"10px 16px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em"}}>
              {"\uD83D\uDCE6"} Stock to Receive ({stockActions.reduce((n,u)=>{const items=(u.data?.items||[]);return n+(items.length||1);},0)} {stockActions.some(u=>u.action==="receive_delivery_item")?"line":"SKU"}{stockActions.reduce((n,u)=>(n+(u.data?.items||[]).length||1),0)!==1?"s":""})
            </div>
            {stockActions.map((u,i)=>{
              const lines=u.action==="create_purchase_order"?(u.data?.items||[]):[u.data];
              return lines.map((item,j)=>(
                <div key={`${i}-${j}`} style={{display:"flex",justifyContent:"space-between",padding:"9px 16px",borderBottom:`1px solid ${D.ink150}`,fontSize:13,alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:600,color:D.ink700}}>{item?.description||item?.name||item?.item_name||"Item"}</div>
                    <div style={{fontSize:11,color:D.ink500,marginTop:2}}>{item?.quantity||item?.quantity_received||"?"} {"\u00d7"} {item?.unit_cost_zar||item?.unit_cost||item?.unit_price?`R${parseFloat(item?.unit_cost_zar||item?.unit_cost||item?.unit_price||0).toFixed(2)}`:"\u2014"}</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:item?.item_id||item?.matched_id?D.successBg:D.warningBg,color:item?.item_id||item?.matched_id?D.success:D.warning,fontWeight:700}}>{item?.item_id||item?.matched_id?"\u2713 Matched":"\u26A0 Unmatched"}</span>
                </div>
              ));
            })}
            {stockActions.some(u=>u.action==="create_purchase_order"&&(u.data?.items||[]).some(i=>!i.item_id&&!i.matched_id))&&(
              <div style={{padding:"8px 16px",fontSize:11,color:D.warning,background:D.warningBg}}>
                {"\u26A0"} Unmatched items will be skipped {"\u2014"} receive them manually via Stock {"\u2192"} Receive
              </div>
            )}
          </div>}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            {isStockCapture?(
              <button onClick={handleReceiveStock} disabled={posting||capture?.is_duplicate} style={{flex:1,padding:"12px 0",background:capture?.is_duplicate?"#9CA3AF":"#1E3A5F",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:(posting||capture?.is_duplicate)?"not-allowed":"pointer",opacity:posting?0.6:1}}>
                {capture?.is_duplicate?"\u26D4 Blocked \u2014 Duplicate":posting?"Receiving\u2026":"\uD83D\uDCE6 Receive Stock + Post to Books"}
              </button>
            ):(
              <button onClick={handleCreateExpense} disabled={posting||capture?.is_duplicate} style={{flex:1,padding:"12px 0",background:capture?.is_duplicate?"#9CA3AF":D.accent,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:(posting||capture?.is_duplicate)?"not-allowed":"pointer",opacity:posting?0.6:1}}>
                {capture?.is_duplicate?"\u26D4 Blocked \u2014 Duplicate":posting?"Posting\u2026":"\u2713 Approve & Post"}
              </button>
            )}
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
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {[["Amount",fmtZar(successData.amount_zar),D.accent],["Vendor",successData.vendor_name||"\u2014",D.ink700],
                ["Input VAT",successData.input_vat_claimable?fmtZar(successData.input_vat_amount):"N/A",successData.input_vat_claimable?D.success:D.ink300]].map(([l,v,c])=>(
                <div key={l}><div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div></div>
              ))}
            </div>
            <div style={{background:D.ink075,borderRadius:8,padding:14,marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Records created</div>
              {successData.is_stock_receipt?(
                <>
                  <div style={{fontSize:12,color:D.success,marginBottom:3}}>{"\u2713"} {successData.items_received||0} item{(successData.items_received||0)!==1?"s":""} received into stock</div>
                  {(successData.items_skipped||0)>0&&<div style={{fontSize:12,color:D.warning,marginBottom:3}}>{"\u26A0"} {successData.items_skipped} unmatched item{successData.items_skipped!==1?"s":""} skipped {"\u2014"} receive manually</div>}
                  {successData.po_id&&<div style={{fontSize:12,color:D.info,marginBottom:3}}>{"\u2713"} Purchase order created {"\u2014"} <span style={{fontFamily:"monospace",fontSize:11,opacity:0.7}}>{successData.po_id.slice(0,8)}{"\u2026"}</span></div>}
                  {successData.journal_entry_id&&<div style={{fontSize:12,color:D.success,marginBottom:3}}>{"\u2713"} Journal posted {"\u2014"} Dr Inventories / Cr Trade Payables</div>}
                  {successData.document_fingerprint&&<div style={{fontSize:11,color:D.ink500,marginTop:6}}>{"\uD83D\uDCC4"} Fingerprint: <span style={{fontFamily:"monospace"}}>{successData.document_fingerprint}</span></div>}
                </>
              ):(
                <>
                  {successData.expense_id&&<div style={{fontSize:12,color:D.success,marginBottom:3}}>{"\u2713"} Expense posted {"\u2014"} <span style={{fontFamily:"monospace",fontSize:11,opacity:0.7}}>{successData.expense_id.slice(0,8)}{"\u2026"}</span></div>}
                  {successData.journal_entry_id&&<div style={{fontSize:12,color:D.success,marginBottom:3}}>{"\u2713"} Journal balanced {"\u2014"} <span style={{fontFamily:"monospace",fontSize:11,opacity:0.7}}>{successData.journal_entry_id.slice(0,8)}{"\u2026"}</span></div>}
                  {successData.vat_transaction_id&&<div style={{fontSize:12,color:D.info,marginBottom:3}}>{"\u2713"} Input VAT {"\u2014"} {successData.vat_period} {"\u00b7"} {fmtZar(successData.input_vat_amount)} claimable</div>}
                  {!successData.vat_transaction_id&&<div style={{fontSize:12,color:D.ink300}}>Input VAT: {successData.sars_compliant===false?"non-compliant document":"not applicable"}</div>}
                  {successData.document_fingerprint&&<div style={{fontSize:11,color:D.ink500,marginTop:6}}>{"\uD83D\uDCC4"} Fingerprint: <span style={{fontFamily:"monospace"}}>{successData.document_fingerprint}</span></div>}
                </>
              )}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={resetCapture} style={{flex:1,padding:"11px 0",background:D.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"\uD83D\uDCF8"} Capture Another</button>
              <button onClick={()=>setMode("history")} style={{flex:1,padding:"11px 0",background:"#fff",color:D.accentMid,border:`1.5px solid ${D.accentMid}`,borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"\uD83D\uDCCB"} This Month</button>
            </div>
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
                <div style={{fontSize:13,fontWeight:600,color:D.ink700}}>{h.vendor_name||h.file_name||"Document"}</div>
                <div style={{fontSize:11,color:D.ink500,marginTop:2,display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                  <span>{fmtDate(h.captured_at||h.document_date)}</span>
                  <span>{"\u00b7"} {h.capture_type?.replace(/_/g," ")||"receipt"}</span>
                  <span style={{padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:700,background:["approved","auto_posted"].includes(h.status)?D.successBg:h.status==="rejected"?D.dangerBg:D.warningBg,color:["approved","auto_posted"].includes(h.status)?D.success:h.status==="rejected"?D.danger:D.warning}}>{h.status}</span>
                  {h.sars_compliant===true&&<span style={{padding:"1px 5px",borderRadius:4,fontSize:10,fontWeight:700,background:D.successBg,color:D.success}}>SARS ✓</span>}
                  {h.sars_compliant===false&&<span style={{padding:"1px 5px",borderRadius:4,fontSize:10,fontWeight:700,background:D.warningBg,color:D.warning}}>Non-SARS</span>}
                  {h.is_duplicate&&<span style={{padding:"1px 5px",borderRadius:4,fontSize:10,fontWeight:700,background:D.dangerBg,color:D.danger}}>{"\u26A0"} Duplicate</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:D.accentMid,fontVariantNumeric:"tabular-nums"}}>{h.amount_zar?fmtZar(h.amount_zar):"\u2014"}</div>
                {h.input_vat_claimable&&<div style={{fontSize:10,color:D.success}}>VAT: {fmtZar(h.input_vat_amount)}</div>}
              </div>
            </div>
          ))}
        </div>}
      </>}
    </div>
  );
}
