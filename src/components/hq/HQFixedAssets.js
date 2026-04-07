// src/components/hq/HQFixedAssets.js — WP-FINANCIALS Phase 4
// Fixed Asset Register — manages fixed_assets + depreciation_entries tables
// Straight-line depreciation · monthly run · Cost/AccDep/NBV per asset

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

const D = {
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  ink900: "#0D0D0D", ink700: "#1F2937", ink500: "#6B7280",
  ink300: "#D1D5DB", ink150: "#E5E7EB", ink075: "#F9FAFB",
  accent: "#1A3D2B", accentMid: "#2D6A4F", accentLit: "#ECFDF5",
  success: "#059669", danger: "#DC2626", dangerBg: "#FEF2F2", dangerBd: "#FECACA",
  warning: "#D97706", info: "#2563EB",
  shadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
};

const ASSET_CATEGORIES = ["Equipment","Furniture & Fittings","Computer & IT","Vehicles","Leasehold Improvements","Machinery","Other"];
const DEP_METHODS = [{value:"straight_line",label:"Straight-Line"},{value:"reducing_balance",label:"Reducing Balance"}];

const fmtZar = (n) => `R\u202F${(parseFloat(n)||0).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}) : "\u2014";

function calcMonthlyDep(cost, residual, lifeYrs) {
  return Math.max(0, cost - residual) / Math.max(1, lifeYrs * 12);
}
function calcNBV(a) {
  const cost = parseFloat(a.purchase_cost)||0;
  const accDep = parseFloat(a.accumulated_depreciation)||0;
  return Math.max(parseFloat(a.residual_value)||0, cost - accDep);
}

const inputSx = {
  width:"100%",padding:"9px 12px",border:`1.5px solid ${D.ink150}`,
  borderRadius:8,fontSize:14,color:D.ink700,outline:"none",
  boxSizing:"border-box",fontFamily:D.font,background:"#fff",
};

function StatCard({label,value,sub,color,icon}) {
  return (
    <div style={{background:"#fff",borderRadius:12,padding:"20px 22px",boxShadow:D.shadow,flex:1,minWidth:160}}>
      <div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:D.font,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
        {icon&&<span>{icon}</span>}{label}
      </div>
      <div style={{fontSize:26,fontWeight:600,color:color||D.accent,fontFamily:D.font,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:D.ink500,marginTop:6,fontFamily:D.font}}>{sub}</div>}
    </div>
  );
}

function InputField({label,required,children}) {
  return (
    <div>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#374151",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6,fontFamily:D.font}}>
        {label}{required&&<span style={{color:D.danger,marginLeft:2}}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function HQFixedAssets() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [assets, setAssets] = useState([]);
  const [depEntries, setDepEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningDep, setRunningDep] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const currentMonth = new Date().toLocaleString("default",{month:"long"});
  const currentYear = new Date().getFullYear();
  const periodMonth = String(new Date().getMonth()+1).padStart(2,"0");

  const [form, setForm] = useState({
    asset_name:"",asset_category:"Equipment",asset_code:"",
    purchase_date:new Date().toISOString().split("T")[0],
    purchase_cost:"",residual_value:"0",
    useful_life_years:"5",depreciation_method:"straight_line",notes:"",
  });
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [aRes,dRes] = await Promise.all([
        supabase.from("fixed_assets").select("*").eq("tenant_id",tenantId).order("purchase_date",{ascending:false}),
        supabase.from("depreciation_entries").select("*").eq("tenant_id",tenantId).order("period_year",{ascending:false}).order("period_month",{ascending:false}),
      ]);
      setAssets(aRes.data||[]);
      setDepEntries(dRes.data||[]);
    } catch(e) { showToast("Failed to load: "+e.message,"error"); }
    finally { setLoading(false); }
  },[tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const handleAddAsset = async () => {
    if (!form.asset_name.trim()) { showToast("Asset name required.","error"); return; }
    if (!form.purchase_cost||parseFloat(form.purchase_cost)<=0) { showToast("Cost must be > 0.","error"); return; }
    setSaving(true);
    try {
      const cost=parseFloat(form.purchase_cost); const residual=parseFloat(form.residual_value)||0;
      const { error } = await supabase.from("fixed_assets").insert({
        tenant_id:tenantId, asset_name:form.asset_name.trim(), asset_category:form.asset_category,
        asset_code:form.asset_code.trim()||null, purchase_date:form.purchase_date,
        purchase_cost:cost, residual_value:residual,
        useful_life_years:parseFloat(form.useful_life_years)||5,
        depreciation_method:form.depreciation_method,
        accumulated_depreciation:0, net_book_value:cost-residual, is_active:true,
        notes:form.notes.trim()||null,
      });
      if (error) throw error;
      showToast(`${form.asset_name} added.`);
      setShowAddForm(false);
      setForm({asset_name:"",asset_category:"Equipment",asset_code:"",purchase_date:new Date().toISOString().split("T")[0],purchase_cost:"",residual_value:"0",useful_life_years:"5",depreciation_method:"straight_line",notes:""});
      fetchAll();
    } catch(e) { showToast("Failed: "+e.message,"error"); }
    finally { setSaving(false); }
  };

  const runDepreciation = async () => {
    if (assets.length===0) { showToast("No assets.","error"); return; }
    setRunningDep(true);
    try {
      let posted=0, skipped=0;
      for (const asset of assets) {
        if (!asset.is_active) { skipped++; continue; }
        const cost=parseFloat(asset.purchase_cost)||0;
        const residual=parseFloat(asset.residual_value)||0;
        const accDep=parseFloat(asset.accumulated_depreciation)||0;
        const lifeYrs=parseFloat(asset.useful_life_years)||5;
        const monthlyDep=calcMonthlyDep(cost,residual,lifeYrs);
        if (accDep>=(cost-residual)||monthlyDep<=0) { skipped++; continue; }
        const { data:existing } = await supabase.from("depreciation_entries").select("id").eq("asset_id",asset.id).eq("period_month",periodMonth).eq("period_year",currentYear).maybeSingle();
        if (existing) { skipped++; continue; }
        const dep=Math.min(monthlyDep, cost-residual-accDep);
        const newAcc=accDep+dep;
        const { error:depErr } = await supabase.from("depreciation_entries").insert({
          tenant_id:tenantId, asset_id:asset.id, period_month:periodMonth, period_year:currentYear,
          depreciation:dep, accum_dep_after:newAcc, nbv_after:cost-newAcc,
        });
        if (depErr) { skipped++; continue; }
        await supabase.from("fixed_assets").update({accumulated_depreciation:newAcc,net_book_value:cost-newAcc}).eq("id",asset.id);
        posted++;
      }
      showToast(posted>0?`Posted: ${posted} asset${posted!==1?"s":""}. ${skipped>0?skipped+" skipped.":""}`:`No new entries \u2014 ${skipped} skipped.`,posted>0?"success":"error");
      fetchAll();
    } catch(e) { showToast("Failed: "+e.message,"error"); }
    finally { setRunningDep(false); }
  };

  const disposeAsset = async (id,name) => {
    if (!window.confirm(`Dispose "${name}"?`)) return;
    const { error } = await supabase.from("fixed_assets").update({is_active:false,disposal_date:new Date().toISOString().split("T")[0]}).eq("id",id);
    if (error) { showToast("Failed.","error"); return; }
    showToast(`${name} disposed.`); fetchAll();
  };

  const activeAssets=assets.filter(a=>a.is_active);
  const disposedAssets=assets.filter(a=>!a.is_active);
  const totalCost=activeAssets.reduce((s,a)=>s+(parseFloat(a.purchase_cost)||0),0);
  const totalAccDep=activeAssets.reduce((s,a)=>s+(parseFloat(a.accumulated_depreciation)||0),0);
  const totalNBV=activeAssets.reduce((s,a)=>s+calcNBV(a),0);
  const monthlyDepTotal=activeAssets.reduce((s,a)=>{
    const c=parseFloat(a.purchase_cost)||0,r=parseFloat(a.residual_value)||0,l=parseFloat(a.useful_life_years)||5,ad=parseFloat(a.accumulated_depreciation)||0;
    return s+(ad>=(c-r)?0:calcMonthlyDep(c,r,l));
  },0);
  const depRunThisMonth=depEntries.some(d=>d.period_month===periodMonth&&d.period_year===currentYear);

  const card={background:"#fff",borderRadius:12,boxShadow:D.shadow,overflow:"hidden",marginBottom:20};

  return (
    <div style={{fontFamily:D.font,color:D.ink700}}>
      {toast&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?D.danger:D.accent,color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.18)",fontFamily:D.font}}>{toast.msg}</div>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:600,color:D.ink900,letterSpacing:"-0.02em"}}>Fixed Asset Register</h2>
          <p style={{margin:"4px 0 0",color:D.ink500,fontSize:13}}>Property, Plant & Equipment \u00b7 Cost / Accumulated Depreciation / Net Book Value</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={runDepreciation} disabled={runningDep||activeAssets.length===0} style={{
            padding:"9px 18px",borderRadius:8,border:`1.5px solid ${depRunThisMonth?D.ink150:D.accentMid}`,
            background:depRunThisMonth?D.ink075:D.accentLit,color:depRunThisMonth?D.ink500:D.accentMid,
            fontSize:13,fontWeight:700,cursor:runningDep?"wait":"pointer",fontFamily:D.font,opacity:activeAssets.length===0?0.4:1,
          }}>{runningDep?"Running\u2026":depRunThisMonth?`\u2713 ${currentMonth} ${currentYear} posted`:`\u25B6 Run ${currentMonth} ${currentYear} Depreciation`}</button>
          <button onClick={()=>setShowAddForm(v=>!v)} style={{
            padding:"9px 20px",borderRadius:8,border:"none",background:D.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font,
          }}>{showAddForm?"\u2715 Cancel":"+ Add Asset"}</button>
        </div>
      </div>

      {showAddForm&&(
        <div style={{...card,padding:28,marginBottom:24,borderLeft:`4px solid ${D.accent}`}}>
          <h3 style={{margin:"0 0 20px",fontSize:15,fontWeight:700,color:D.ink900}}>New Fixed Asset</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
            <InputField label="Asset Name" required><input style={inputSx} placeholder="e.g. Display Refrigerator" value={form.asset_name} onChange={e=>setF("asset_name",e.target.value)}/></InputField>
            <InputField label="Category" required><select style={inputSx} value={form.asset_category} onChange={e=>setF("asset_category",e.target.value)}>{ASSET_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></InputField>
            <InputField label="Asset Code"><input style={inputSx} placeholder="FA-001" value={form.asset_code} onChange={e=>setF("asset_code",e.target.value)}/></InputField>
            <InputField label="Purchase Date" required><input style={inputSx} type="date" value={form.purchase_date} onChange={e=>setF("purchase_date",e.target.value)}/></InputField>
            <InputField label="Cost (ZAR)" required><input style={inputSx} type="number" min="0" step="0.01" value={form.purchase_cost} onChange={e=>setF("purchase_cost",e.target.value)}/></InputField>
            <InputField label="Residual Value"><input style={inputSx} type="number" min="0" step="0.01" value={form.residual_value} onChange={e=>setF("residual_value",e.target.value)}/></InputField>
            <InputField label="Useful Life (Years)" required><input style={inputSx} type="number" min="1" max="50" step="0.5" value={form.useful_life_years} onChange={e=>setF("useful_life_years",e.target.value)}/></InputField>
            <InputField label="Method"><select style={inputSx} value={form.depreciation_method} onChange={e=>setF("depreciation_method",e.target.value)}>{DEP_METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></InputField>
            <InputField label="Notes"><input style={inputSx} placeholder="Optional" value={form.notes} onChange={e=>setF("notes",e.target.value)}/></InputField>
          </div>
          {form.purchase_cost&&parseFloat(form.purchase_cost)>0&&(
            <div style={{marginTop:16,padding:"12px 16px",background:D.accentLit,borderRadius:8,display:"flex",gap:24,flexWrap:"wrap"}}>
              {[["Monthly",fmtZar(calcMonthlyDep(parseFloat(form.purchase_cost)||0,parseFloat(form.residual_value)||0,parseFloat(form.useful_life_years)||5))],
                ["Annual",fmtZar(calcMonthlyDep(parseFloat(form.purchase_cost)||0,parseFloat(form.residual_value)||0,parseFloat(form.useful_life_years)||5)*12)],
                ["Depreciable",fmtZar(Math.max(0,(parseFloat(form.purchase_cost)||0)-(parseFloat(form.residual_value)||0)))],
              ].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,fontWeight:700,color:D.accentMid,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{l}</div><div style={{fontSize:15,fontWeight:700,color:D.accent,fontVariantNumeric:"tabular-nums"}}>{v}</div></div>
              ))}
            </div>
          )}
          <div style={{marginTop:20,display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={()=>setShowAddForm(false)} style={{padding:"9px 18px",border:`1px solid ${D.ink150}`,borderRadius:8,background:"transparent",color:D.ink500,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:D.font}}>Cancel</button>
            <button onClick={handleAddAsset} disabled={saving} style={{padding:"9px 22px",border:"none",borderRadius:8,background:D.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"wait":"pointer",fontFamily:D.font,opacity:saving?0.6:1}}>{saving?"Saving\u2026":"Add to Register"}</button>
          </div>
        </div>
      )}

      {loading?(
        <div style={{textAlign:"center",padding:60,color:D.ink500}}>Loading register\u2026</div>
      ):(
        <>
          <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
            <StatCard label="Total Cost" value={fmtZar(totalCost)} sub={`${activeAssets.length} active`} color={D.accent} icon="\uD83C\uDFD7\uFE0F"/>
            <StatCard label="Accum Depreciation" value={fmtZar(totalAccDep)} sub={totalCost>0?`${((totalAccDep/totalCost)*100).toFixed(1)}% of cost`:"\u2014"} color={D.warning} icon="\uD83D\uDCC9"/>
            <StatCard label="Net Book Value" value={fmtZar(totalNBV)} sub="Carrying amount" color={D.info} icon="\u2696\uFE0F"/>
            <StatCard label="Monthly Dep" value={fmtZar(monthlyDepTotal)} sub={`${fmtZar(monthlyDepTotal*12)} / year`} color={D.accentMid} icon="\uD83D\uDCC5"/>
          </div>

          {activeAssets.length===0?(
            <div style={{...card,padding:"48px 32px",textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>{"\uD83C\uDFD7\uFE0F"}</div>
              <div style={{fontSize:16,fontWeight:700,color:D.ink700,marginBottom:6}}>No assets in the register</div>
              <div style={{fontSize:13,color:D.ink500,marginBottom:20}}>Add your first fixed asset to begin tracking depreciation.</div>
              <button onClick={()=>setShowAddForm(true)} style={{padding:"10px 24px",background:D.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>+ Add First Asset</button>
            </div>
          ):(
            <div style={card}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 120px 110px 110px 110px 110px 80px 40px",padding:"12px 20px",background:D.ink075,borderBottom:`1px solid ${D.ink150}`,fontSize:10,fontWeight:700,color:D.ink500,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:D.font}}>
                <span>Asset</span><span>Date</span><span style={{textAlign:"right"}}>Cost</span><span style={{textAlign:"right"}}>Accum Dep</span><span style={{textAlign:"right"}}>NBV</span><span style={{textAlign:"right"}}>Monthly</span><span style={{textAlign:"center"}}>Life</span><span/>
              </div>
              {activeAssets.map((asset,idx)=>{
                const cost=parseFloat(asset.purchase_cost)||0,residual=parseFloat(asset.residual_value)||0,accDep=parseFloat(asset.accumulated_depreciation)||0,life=parseFloat(asset.useful_life_years)||5;
                const nbv=calcNBV(asset),md=calcMonthlyDep(cost,residual,life),pct=cost>0?(accDep/(cost-residual||1))*100:0,fullyDep=accDep>=(cost-residual)-0.01;
                const isExp=selectedAsset===asset.id;
                return (
                  <div key={asset.id}>
                    <div onClick={()=>setSelectedAsset(isExp?null:asset.id)} style={{display:"grid",gridTemplateColumns:"2fr 120px 110px 110px 110px 110px 80px 40px",padding:"14px 20px",borderBottom:`1px solid ${idx<activeAssets.length-1?D.ink150:"transparent"}`,alignItems:"center",cursor:"pointer",background:isExp?"#F0FDF4":"transparent",transition:"background 0.15s"}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:D.ink900}}>{asset.asset_name}{asset.asset_code&&<span style={{fontSize:10,color:D.ink500,marginLeft:8,padding:"2px 6px",background:D.ink075,borderRadius:4}}>{asset.asset_code}</span>}</div>
                        <div style={{fontSize:11,color:D.ink500,marginTop:2}}>{asset.asset_category}</div>
                        <div style={{marginTop:5,height:3,borderRadius:2,background:D.ink150,overflow:"hidden",width:120}}><div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:fullyDep?D.danger:pct>80?D.warning:D.success,transition:"width 0.4s"}}/></div>
                      </div>
                      <div style={{fontSize:13,color:D.ink500}}>{fmtDate(asset.purchase_date)}</div>
                      <div style={{fontSize:13,fontWeight:600,color:D.ink700,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(cost)}</div>
                      <div style={{fontSize:13,color:D.warning,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{accDep>0?`(${fmtZar(accDep)})`:"\u2014"}</div>
                      <div style={{fontSize:14,fontWeight:700,color:fullyDep?D.danger:nbv>cost*0.5?D.success:D.warning,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(nbv)}</div>
                      <div style={{fontSize:13,color:D.info,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fullyDep?<span style={{color:D.danger,fontSize:11,fontWeight:700}}>FULLY DEP</span>:fmtZar(md)}</div>
                      <div style={{fontSize:12,color:D.ink500,textAlign:"center"}}>{life}y</div>
                      <div style={{textAlign:"center"}}><span style={{fontSize:14,color:D.ink300}}>{isExp?"\u25B2":"\u25BC"}</span></div>
                    </div>
                    {isExp&&(
                      <div style={{padding:"16px 24px 20px",background:"#F0FDF4",borderBottom:`1px solid ${D.ink150}`}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16,marginBottom:16}}>
                          {[["Residual",fmtZar(residual)],["Depreciable",fmtZar(cost-residual)],["Annual Dep",fmtZar(md*12)],["% Depreciated",fullyDep?"100%":`${Math.min(100,pct).toFixed(1)}%`]].map(([l,v])=>(
                            <div key={l}><div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:D.accent,fontVariantNumeric:"tabular-nums"}}>{v}</div></div>
                          ))}
                        </div>
                        {depEntries.filter(d=>d.asset_id===asset.id).slice(0,3).length>0&&(
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Recent Entries</div>
                            {depEntries.filter(d=>d.asset_id===asset.id).slice(0,3).map(e=>(
                              <div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${D.ink150}`,fontSize:12}}>
                                <span style={{color:D.ink500}}>{new Date(e.period_year,parseInt(e.period_month)-1).toLocaleString("default",{month:"long"})} {e.period_year}</span>
                                <span style={{fontWeight:600,color:D.warning,fontVariantNumeric:"tabular-nums"}}>({fmtZar(e.depreciation)})</span>
                                <span style={{color:D.ink500,fontVariantNumeric:"tabular-nums"}}>NBV: {fmtZar(e.nbv_after)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {asset.notes&&<div style={{marginTop:12,fontSize:12,color:D.ink500,fontStyle:"italic"}}>Notes: {asset.notes}</div>}
                        <div style={{marginTop:14}}>
                          <button onClick={()=>disposeAsset(asset.id,asset.asset_name)} style={{padding:"7px 14px",border:`1px solid ${D.dangerBd}`,borderRadius:6,background:D.dangerBg,color:D.danger,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:D.font}}>Dispose Asset</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{display:"grid",gridTemplateColumns:"2fr 120px 110px 110px 110px 110px 80px 40px",padding:"14px 20px",background:D.ink075,borderTop:`2px solid ${D.ink150}`,fontFamily:D.font}}>
                <div style={{fontSize:13,fontWeight:700,color:D.ink700}}>Totals \u2014 {activeAssets.length} active</div><div/>
                <div style={{fontSize:14,fontWeight:700,color:D.ink700,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(totalCost)}</div>
                <div style={{fontSize:14,fontWeight:700,color:D.warning,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>({fmtZar(totalAccDep)})</div>
                <div style={{fontSize:15,fontWeight:700,color:D.accent,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(totalNBV)}</div>
                <div style={{fontSize:14,fontWeight:700,color:D.info,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtZar(monthlyDepTotal)}</div>
                <div/><div/>
              </div>
            </div>
          )}

          {disposedAssets.length>0&&(
            <div style={{...card,opacity:0.75}}>
              <div style={{padding:"12px 20px",background:D.ink075,fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:`1px solid ${D.ink150}`}}>Disposed ({disposedAssets.length})</div>
              {disposedAssets.map(a=>(
                <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"12px 20px",borderBottom:`1px solid ${D.ink150}`,alignItems:"center"}}>
                  <div><div style={{fontSize:13,fontWeight:600,color:D.ink500}}>{a.asset_name}</div><div style={{fontSize:11,color:D.ink300}}>{a.asset_category} \u00b7 Disposed {fmtDate(a.disposal_date)}</div></div>
                  <div style={{fontSize:13,color:D.ink500,fontVariantNumeric:"tabular-nums"}}>Cost {fmtZar(a.purchase_cost)}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{background:D.ink075,borderRadius:8,padding:"14px 18px",fontSize:12,color:D.ink500,border:`1px solid ${D.ink150}`,lineHeight:1.7,fontFamily:D.font}}>
            <strong style={{color:D.ink700}}>Accounting policy \u2014 PPE:</strong>{" "}
            Assets recognised at cost less accumulated depreciation. Straight-line basis over useful life. Residual values reviewed at each reporting date. Depreciation charged to Income Statement (account 61100).
          </div>
        </>
      )}
    </div>
  );
}
