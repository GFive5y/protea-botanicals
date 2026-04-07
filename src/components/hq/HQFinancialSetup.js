// src/components/hq/HQFinancialSetup.js — WP-FINANCIALS Phase 0
// Financial Setup Wizard — 5-screen gateway for all financial statements
// Saves to: tenant_config + equity_ledger + bank_accounts
// Trigger: financial_setup_complete = false on tenant_config

import React, { useState } from "react"; // eslint-disable-line no-unused-vars
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

const BANKS = ["FNB", "ABSA", "Standard Bank", "Nedbank", "Capitec", "Other"];
const BRANCH_CODES = {
  FNB: "250655", ABSA: "632005", "Standard Bank": "051001",
  Nedbank: "198765", Capitec: "470010",
};
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const STEP_LABELS = ["Business Details","Financial Year","VAT","Bank Account","Opening Position"];

const S = {
  overlay: {
    position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",
    backdropFilter:"blur(4px)",zIndex:1000,display:"flex",
    alignItems:"center",justifyContent:"center",padding:"24px",
  },
  card: {
    background:"#fff",borderRadius:16,
    boxShadow:"0 24px 60px rgba(0,0,0,0.18)",
    width:"100%",maxWidth:600,maxHeight:"90vh",
    overflow:"hidden",display:"flex",flexDirection:"column",
  },
  header: {
    background:"linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)",
    padding:"28px 32px 24px",color:"#fff",
  },
  title: { fontSize:20,fontWeight:700,margin:0,letterSpacing:"-0.02em" },
  subtitle: { fontSize:13,opacity:0.8,marginTop:4 },
  progress: { display:"flex",gap:6,marginTop:18 },
  dot: (active,done) => ({
    flex:1,height:4,borderRadius:4,
    background:done?"#60a5fa":active?"#fff":"rgba(255,255,255,0.3)",
    transition:"background 0.3s",
  }),
  stepLabel: {
    fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",
    marginTop:6,letterSpacing:"0.06em",textTransform:"uppercase",
  },
  body: { padding:"28px 32px",overflowY:"auto",flex:1 },
  label: {
    display:"block",fontSize:12,fontWeight:700,color:"#374151",
    letterSpacing:"0.06em",textTransform:"uppercase",
    marginBottom:6,marginTop:18,
  },
  input: {
    width:"100%",padding:"10px 14px",border:"1.5px solid #E2E8F0",
    borderRadius:8,fontSize:14,color:"#111827",outline:"none",
    boxSizing:"border-box",fontFamily:"inherit",
  },
  select: {
    width:"100%",padding:"10px 14px",border:"1.5px solid #E2E8F0",
    borderRadius:8,fontSize:14,color:"#111827",outline:"none",
    boxSizing:"border-box",background:"#fff",cursor:"pointer",
  },
  radio: { display:"flex",gap:12,flexWrap:"wrap",marginTop:4 },
  radioOpt: (sel) => ({
    display:"flex",alignItems:"center",gap:8,padding:"10px 16px",
    border:`1.5px solid ${sel?"#2563eb":"#E2E8F0"}`,borderRadius:8,
    cursor:"pointer",fontSize:14,
    background:sel?"#EFF6FF":"#fff",
    color:sel?"#1d4ed8":"#374151",
    fontWeight:sel?600:400,transition:"all 0.15s",
  }),
  footer: {
    padding:"20px 32px",borderTop:"1px solid #F1F5F9",
    display:"flex",justifyContent:"space-between",
    alignItems:"center",background:"#FAFAFA",
  },
  btnPrimary: {
    padding:"11px 28px",background:"#2563eb",color:"#fff",
    border:"none",borderRadius:8,fontSize:14,fontWeight:700,
    cursor:"pointer",letterSpacing:"-0.01em",
  },
  btnSecondary: {
    padding:"11px 20px",background:"transparent",color:"#64748B",
    border:"1px solid #E2E8F0",borderRadius:8,fontSize:14,
    fontWeight:600,cursor:"pointer",
  },
  note: { fontSize:12,color:"#6B7280",marginTop:8,lineHeight:1.5,fontStyle:"italic" },
  error: { fontSize:12,color:"#DC2626",marginTop:8,fontWeight:600 },
  successBanner: {
    background:"#D1FAE5",border:"1px solid #6EE7B7",borderRadius:10,
    padding:"16px 20px",fontSize:14,color:"#065F46",fontWeight:600,
  },
};

export default function HQFinancialSetup({ onComplete }) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    // Screen 1 — Business Details
    legal_name:"", trading_name:"", company_reg:"", tax_number:"",
    registered_address:"", auditor_name:"", auditor_firm:"", auditor_email:"",
    // Screen 2 — Financial Year
    year_end_month:"2", accounting_basis:"accrual",
    // Screen 3 — VAT
    vat_registered:false, vat_number:"", vat_period:"bi_monthly", vat_basis:"invoice",
    // Screen 4 — Bank
    bank_name:"FNB", account_name:"", account_number:"", branch_code:"250655",
    account_type:"cheque", skip_bank:false,
    // Screen 5 — Opening Position
    first_year:true, opening_share_capital:"", opening_cash:"",
    opening_retained_earnings:"",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const yearEndLabel = () => {
    const m = parseInt(form.year_end_month);
    const lastDay = new Date(new Date().getFullYear(), m, 0).getDate();
    return `${MONTHS[m - 1]} ${lastDay}`;
  };

  const financialYearEnd = () => {
    const m = String(form.year_end_month).padStart(2, "0");
    const lastDay = new Date(new Date().getFullYear(), parseInt(form.year_end_month), 0).getDate();
    return `${m}-${String(lastDay).padStart(2, "0")}`;
  };

  const validate = () => {
    if (step === 0 && !form.legal_name.trim()) return "Legal business name is required.";
    if (step === 2 && form.vat_registered && !form.vat_number.trim()) return "VAT number is required when VAT registered.";
    return "";
  };

  const next = () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setErr("");
    if (step < 4) setStep(s => s + 1);
    else save();
  };

  const save = async () => {
    setSaving(true);
    try {
      const fyEnd = financialYearEnd();
      const fyEndDate = new Date(new Date().getFullYear(), parseInt(form.year_end_month) - 1 + 1, 0);
      const fyStartDate = new Date(fyEndDate);
      fyStartDate.setFullYear(fyEndDate.getFullYear() - 1);
      fyStartDate.setDate(fyStartDate.getDate() + 1);
      const fyStart = `${String(fyStartDate.getMonth()+1).padStart(2,"0")}-${String(fyStartDate.getDate()).padStart(2,"0")}`;

      const { error: cfgErr } = await supabase.from("tenant_config").update({
        trading_name: form.trading_name || form.legal_name,
        company_reg_number: form.company_reg,
        income_tax_number: form.tax_number,
        registered_address: form.registered_address,
        auditor_name: form.auditor_name,
        auditor_firm: form.auditor_firm,
        auditor_email: form.auditor_email,
        financial_year_end: fyEnd,
        financial_year_start: fyStart,
        accounting_basis: form.accounting_basis,
        vat_registered: form.vat_registered,
        vat_number: form.vat_registered ? form.vat_number : null,
        vat_period: form.vat_period,
        vat_basis: form.vat_basis,
        vat_rate: 0.15,
        financial_setup_complete: true,
      }).eq("tenant_id", tenantId);

      if (cfgErr) throw cfgErr;

      // Equity ledger — seed opening position
      const fyLabel = `FY${new Date().getFullYear()}`;
      await supabase.from("equity_ledger").upsert({
        tenant_id: tenantId,
        financial_year: fyLabel,
        share_capital: parseFloat(form.opening_share_capital) || 0,
        opening_retained_earnings: form.first_year ? 0 : (parseFloat(form.opening_retained_earnings) || 0),
        year_end_closed: false,
      }, { onConflict: "tenant_id,financial_year" });

      // Bank account — if provided
      if (!form.skip_bank && form.account_number.trim()) {
        await supabase.from("bank_accounts").insert({
          tenant_id: tenantId,
          bank_name: form.bank_name,
          account_name: form.account_name || form.legal_name,
          account_number: form.account_number,
          branch_code: BRANCH_CODES[form.bank_name] || form.branch_code,
          account_type: form.account_type,
          currency: "ZAR",
          opening_balance: parseFloat(form.opening_cash) || 0,
          opening_date: new Date().toISOString().split("T")[0],
          is_primary: true,
        });
      }

      if (onComplete) onComplete();
    } catch (e) {
      setErr(e.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const RadioGroup = ({ options, value, onChange }) => (
    <div style={S.radio}>
      {options.map(o => (
        <div key={String(o.value)} style={S.radioOpt(String(value) === String(o.value))}
          onClick={() => onChange(o.value)}>
          <div style={{
            width:14,height:14,borderRadius:"50%",
            border:`2px solid ${String(value)===String(o.value)?"#2563eb":"#CBD5E1"}`,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          }}>
            {String(value)===String(o.value) && (
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#2563eb" }} />
            )}
          </div>
          {o.label}
        </div>
      ))}
    </div>
  );

  const screens = [

    /* Screen 0: Business Details */
    <div key="s0">
      {[
        ["legal_name","Legal Business Name","e.g. Medi Recreational (Pty) Ltd"],
        ["trading_name","Trading Name (if different)","e.g. Medi Rec"],
        ["company_reg","Company Reg Number","e.g. 2021/123456/07"],
        ["tax_number","Income Tax Number","e.g. 9234567890"],
        ["registered_address","Registered Address","Street, City, Province, Code"],
      ].map(([k,label,ph]) => (
        <div key={k}>
          <label style={S.label}>{label}</label>
          <input style={S.input} placeholder={ph} value={form[k]}
            onChange={e=>set(k,e.target.value)} />
        </div>
      ))}
      <div style={{ display:"flex",gap:16 }}>
        <div style={{ flex:1 }}>
          <label style={S.label}>Auditor / Accountant Name</label>
          <input style={S.input} placeholder="Jane Smith CA(SA)" value={form.auditor_name}
            onChange={e=>set("auditor_name",e.target.value)} />
        </div>
        <div style={{ flex:1 }}>
          <label style={S.label}>Firm</label>
          <input style={S.input} placeholder="Smith & Associates" value={form.auditor_firm}
            onChange={e=>set("auditor_firm",e.target.value)} />
        </div>
      </div>
      <label style={S.label}>Auditor Email</label>
      <input style={S.input} placeholder="accountant@firm.co.za" value={form.auditor_email}
        onChange={e=>set("auditor_email",e.target.value)} />
      <p style={S.note}>These details appear on the face of every financial statement.</p>
    </div>,

    /* Screen 1: Financial Year */
    <div key="s1">
      <label style={S.label}>Financial Year End Month</label>
      <select style={S.select} value={form.year_end_month}
        onChange={e=>set("year_end_month",e.target.value)}>
        {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
      </select>
      <p style={S.note}>Your current financial year ends: <strong>{yearEndLabel()}</strong>. February is the most common SA year-end.</p>
      <label style={S.label}>Accounting Basis</label>
      <RadioGroup
        options={[
          {value:"accrual",label:"Accrual (IFRS-compliant \u2014 required for audit)"},
          {value:"cash",label:"Cash Basis (simpler \u2014 not fully IFRS)"},
        ]}
        value={form.accounting_basis}
        onChange={v=>set("accounting_basis",v)}
      />
    </div>,

    /* Screen 2: VAT */
    <div key="s2">
      <label style={S.label}>Is this business VAT registered?</label>
      <RadioGroup
        options={[
          {value:"false",label:"No \u2014 turnover below R1,000,000 / year"},
          {value:"true",label:"Yes \u2014 VAT registered with SARS"},
        ]}
        value={String(form.vat_registered)}
        onChange={v=>set("vat_registered",v==="true")}
      />
      {form.vat_registered && <>
        <label style={S.label}>VAT Registration Number</label>
        <input style={S.input} placeholder="4xxxxxxxxx" value={form.vat_number}
          onChange={e=>set("vat_number",e.target.value)} />
        <label style={S.label}>VAT Filing Period</label>
        <RadioGroup
          options={[
            {value:"monthly",label:"Monthly (turnover > R30M)"},
            {value:"bi_monthly",label:"Bi-monthly (most SMEs)"},
            {value:"annual",label:"Annual (micro businesses < R1.5M)"},
          ]}
          value={form.vat_period}
          onChange={v=>set("vat_period",v)}
        />
        <label style={S.label}>VAT Accounting Basis</label>
        <RadioGroup
          options={[
            {value:"invoice",label:"Invoice basis (standard)"},
            {value:"payment",label:"Payment basis (SARS approval required)"},
          ]}
          value={form.vat_basis}
          onChange={v=>set("vat_basis",v)}
        />
      </>}
      <p style={S.note}>VAT registration is mandatory when annual taxable turnover exceeds R1,000,000. Standard rate: 15%.</p>
    </div>,

    /* Screen 3: Bank Account */
    <div key="s3">
      {!form.skip_bank ? <>
        <label style={S.label}>Bank</label>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:4 }}>
          {BANKS.map(b => (
            <button key={b}
              onClick={() => { set("bank_name",b); set("branch_code",BRANCH_CODES[b]||""); }}
              style={{
                padding:"8px 14px",
                border:`1.5px solid ${form.bank_name===b?"#2563eb":"#E2E8F0"}`,
                borderRadius:8,
                background:form.bank_name===b?"#EFF6FF":"#fff",
                color:form.bank_name===b?"#1d4ed8":"#374151",
                fontWeight:form.bank_name===b?700:400,
                fontSize:13,cursor:"pointer",
              }}>{b}</button>
          ))}
        </div>
        <label style={S.label}>Account Name</label>
        <input style={S.input} placeholder="Business account name" value={form.account_name}
          onChange={e=>set("account_name",e.target.value)} />
        <div style={{ display:"flex",gap:16 }}>
          <div style={{ flex:2 }}>
            <label style={S.label}>Account Number</label>
            <input style={S.input} placeholder="Account number" value={form.account_number}
              onChange={e=>set("account_number",e.target.value)} />
          </div>
          <div style={{ flex:1 }}>
            <label style={S.label}>Branch Code</label>
            <input style={S.input} value={BRANCH_CODES[form.bank_name]||form.branch_code}
              onChange={e=>set("branch_code",e.target.value)} />
          </div>
        </div>
        <label style={S.label}>Account Type</label>
        <RadioGroup
          options={[{value:"cheque",label:"Cheque"},{value:"savings",label:"Savings"},{value:"credit",label:"Credit"}]}
          value={form.account_type}
          onChange={v=>set("account_type",v)}
        />
        <p style={S.note}>Bank statement CSV import auto-detects FNB, ABSA, Standard Bank, Nedbank and Capitec. No manual format selection needed.</p>
        <button
          style={{ ...S.btnSecondary,marginTop:12,fontSize:13 }}
          onClick={() => set("skip_bank",true)}>
          Skip for now \u2014 I'll add bank details later
        </button>
      </> : (
        <div style={S.successBanner}>
          Bank account skipped. You can add bank details in Financial Settings at any time.
          <button style={{ ...S.btnSecondary,marginLeft:16,fontSize:12 }}
            onClick={()=>set("skip_bank",false)}>Add bank</button>
        </div>
      )}
    </div>,

    /* Screen 4: Opening Position */
    <div key="s4">
      <label style={S.label}>Is this the first financial year for this business?</label>
      <RadioGroup
        options={[
          {value:"true",label:"Yes \u2014 business started in the current financial year"},
          {value:"false",label:"No \u2014 prior year figures available"},
        ]}
        value={String(form.first_year)}
        onChange={v=>set("first_year",v==="true")}
      />
      <label style={S.label}>Opening Share Capital Invested</label>
      <input style={S.input} type="number" placeholder="R 0.00" value={form.opening_share_capital}
        onChange={e=>set("opening_share_capital",e.target.value)} />
      <label style={S.label}>Opening Cash Balance</label>
      <input style={S.input} type="number" placeholder="R 0.00" value={form.opening_cash}
        onChange={e=>set("opening_cash",e.target.value)} />
      {!form.first_year && <>
        <label style={S.label}>Retained Earnings Brought Forward</label>
        <input style={S.input} type="number"
          placeholder="R 0.00 (from prior year trial balance)"
          value={form.opening_retained_earnings}
          onChange={e=>set("opening_retained_earnings",e.target.value)} />
      </>}
      <p style={S.note}>These figures ensure your Balance Sheet and Statement of Changes in Equity open correctly. They appear in the equity section of your statements.</p>
    </div>,
  ];

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.header}>
          <p style={S.title}>Financial Statements Setup</p>
          <p style={S.subtitle}>Step {step + 1} of 5 \u2014 {STEP_LABELS[step]}</p>
          <div style={S.progress}>
            {STEP_LABELS.map((_,i) => <div key={i} style={S.dot(i===step,i<step)} />)}
          </div>
          <p style={S.stepLabel}>{STEP_LABELS[step]}</p>
        </div>
        <div style={S.body}>
          {screens[step]}
          {err && <p style={S.error}>{err}</p>}
        </div>
        <div style={S.footer}>
          <button style={{ ...S.btnSecondary,opacity:step===0?0.3:1 }}
            onClick={()=>step>0&&setStep(s=>s-1)}
            disabled={step===0}>
            \u2190 Back
          </button>
          <button style={S.btnPrimary} onClick={next} disabled={saving}>
            {saving?"Saving\u2026":step<4?"Continue \u2192":"Complete Setup \u2713"}
          </button>
        </div>
      </div>
    </div>
  );
}
