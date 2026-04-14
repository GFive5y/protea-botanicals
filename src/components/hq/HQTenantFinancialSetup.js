// src/components/hq/HQTenantFinancialSetup.js — HQ Financial Setup Wizard for any tenant
// Writes to tenant_config + equity_ledger + calculates net_profit via RPC.
// LL-207: receives tenantId from HQTenantProfiles internal state.

import React, { useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";

const NOURISH_DEFAULTS = {
  trading_name: "Nourish Kitchen & Deli (Pty) Ltd",
  company_reg_number: "2023/198745/07",
  income_tax_number: "9345678912",
  registered_address: "45 Kloof Street, Gardens, Cape Town, Western Cape, 8001",
  vat_registered: true,
  vat_number: "4345678912",
  vat_period: "bi_monthly",
  vat_basis: "invoice",
  financial_year_start: "03-01",
  financial_year_end: "02-28",
  accounting_basis: "accrual",
  auditor_name: "Demo Auditor CA(SA)",
  auditor_firm: "Cape Audit Associates",
  auditor_email: "audit@capeaudit.co.za",
  share_capital: 150000,
  opening_retained_earnings: 0,
};

const PURE_PREMIUM_DEFAULTS = {
  trading_name: "Pure Premium THC Vapes (Pty) Ltd",
  company_reg_number: "2022/334521/07",
  income_tax_number: "9456789123",
  registered_address: "12 Long Street, Cape Town, Western Cape, 8001",
  vat_registered: false,
  vat_number: "",
  vat_period: "bi_monthly",
  vat_basis: "invoice",
  financial_year_start: "03-01",
  financial_year_end: "02-28",
  accounting_basis: "accrual",
  auditor_name: "Demo Auditor CA(SA)",
  auditor_firm: "SA Cannabis Audit Group",
  auditor_email: "audit@sacannabis.co.za",
  share_capital: 50000,
  opening_retained_earnings: 0,
};

const MONTHS = [
  { value: "01-01", label: "January" }, { value: "02-01", label: "February" },
  { value: "03-01", label: "March" }, { value: "04-01", label: "April" },
  { value: "05-01", label: "May" }, { value: "06-01", label: "June" },
  { value: "07-01", label: "July" }, { value: "08-01", label: "August" },
  { value: "09-01", label: "September" }, { value: "10-01", label: "October" },
  { value: "11-01", label: "November" }, { value: "12-01", label: "December" },
];

function fyEnd(startVal) {
  const mo = parseInt(startVal?.split("-")[0] || "3", 10);
  const endMo = mo === 1 ? 12 : mo - 1;
  const endDay = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][endMo];
  return `${String(endMo).padStart(2, "0")}-${endDay}`;
}

const inputStyle = {
  width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${T.border}`,
  borderRadius: 6, fontFamily: T.font, boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: T.ink500, textTransform: "uppercase",
  letterSpacing: "0.05em", marginBottom: 3, display: "block",
};
const sectionStyle = { marginBottom: 20 };
const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" };
const errStyle = { fontSize: 11, color: T.danger, marginTop: 2 };

export default function HQTenantFinancialSetup({ tenantId, tenantName, onComplete }) {
  const defaults = tenantId === "944547e3-ce9f-44e0-a284-43ebe1ed898f"
    ? NOURISH_DEFAULTS
    : tenantId === "f8ff8d07-7688-44a7-8714-5941ab4ceaa5"
      ? PURE_PREMIUM_DEFAULTS
      : {};

  const [form, setForm] = useState({
    trading_name: defaults.trading_name || "",
    company_reg_number: defaults.company_reg_number || "",
    income_tax_number: defaults.income_tax_number || "",
    registered_address: defaults.registered_address || "",
    vat_registered: defaults.vat_registered ?? false,
    vat_number: defaults.vat_number || "",
    vat_period: defaults.vat_period || "bi_monthly",
    vat_basis: defaults.vat_basis || "invoice",
    financial_year_start: defaults.financial_year_start || "03-01",
    accounting_basis: defaults.accounting_basis || "accrual",
    auditor_name: defaults.auditor_name || "",
    auditor_firm: defaults.auditor_firm || "",
    auditor_email: defaults.auditor_email || "",
    share_capital: defaults.share_capital ?? 0,
    opening_retained_earnings: defaults.opening_retained_earnings ?? 0,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.trading_name.trim() || form.trading_name.trim().length < 2) e.trading_name = "Required (min 2 chars)";
    if (!form.company_reg_number.trim()) e.company_reg_number = "Required";
    if (!form.financial_year_start) e.financial_year_start = "Required";
    if (form.share_capital < 0) e.share_capital = "Must be >= 0";
    if (form.vat_registered) {
      if (!form.vat_number.trim()) e.vat_number = "Required when VAT registered";
      else if (form.vat_number.includes("@")) e.vat_number = "VAT number cannot be an email address. Enter the numeric SARS VAT number.";
      else if (form.vat_number.trim().length < 9) e.vat_number = "Min 9 characters";
    }
    if (form.auditor_email && !form.auditor_email.includes("@")) e.auditor_email = "Invalid email format";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);

    const fyEndVal = fyEnd(form.financial_year_start);

    // Write 1: Update tenant_config
    const { error: configError } = await supabase
      .from("tenant_config")
      .update({
        trading_name: form.trading_name.trim(),
        company_reg_number: form.company_reg_number.trim(),
        income_tax_number: form.income_tax_number.trim(),
        registered_address: form.registered_address.trim(),
        vat_registered: form.vat_registered,
        vat_number: form.vat_registered ? form.vat_number.trim() : null,
        vat_period: form.vat_period,
        vat_basis: form.vat_basis,
        vat_rate: 0.15,
        financial_year_start: form.financial_year_start,
        financial_year_end: fyEndVal,
        accounting_basis: form.accounting_basis,
        auditor_name: form.auditor_name.trim() || null,
        auditor_firm: form.auditor_firm.trim() || null,
        auditor_email: form.auditor_email.trim() || null,
        financial_setup_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId);

    if (configError) {
      setSaveError("Failed to update tenant_config: " + configError.message);
      setSaving(false);
      return;
    }

    // Write 2: Create or update equity_ledger row
    const { error: equityError } = await supabase
      .from("equity_ledger")
      .upsert(
        {
          tenant_id: tenantId,
          financial_year: "FY2026",
          share_capital: form.share_capital,
          opening_retained_earnings: form.opening_retained_earnings || 0,
          net_profit_for_year: null,
          dividends_declared: 0,
          owner_drawings: 0,
          year_end_closed: false,
        },
        { onConflict: "tenant_id,financial_year" }
      );

    if (equityError) {
      // Rollback Write 1
      await supabase.from("tenant_config").update({ financial_setup_complete: false }).eq("tenant_id", tenantId);
      setSaveError("Failed to create equity_ledger: " + equityError.message + " (config rolled back)");
      setSaving(false);
      return;
    }

    // Write 3: Calculate and store net profit from canonical RPC
    try {
      const fyYear = new Date().getFullYear();
      const fyStartStr = `${fyYear}-${form.financial_year_start}T00:00:00+00:00`;
      const { data: plData } = await supabase.rpc("tenant_financial_period", {
        p_tenant_id: tenantId,
        p_since: fyStartStr,
        p_until: new Date().toISOString(),
      });
      if (plData) {
        const netProfit = (plData.revenue?.ex_vat || 0) - (plData.cogs?.actual || 0) - (plData.opex?.total || plData.opex?.paid || 0);
        await supabase.from("equity_ledger").update({ net_profit_for_year: netProfit }).eq("tenant_id", tenantId).eq("financial_year", "FY2026");
      }
    } catch (_) {
      console.error("[HQFinSetup] net_profit calc failed — continuing with NULL");
    }

    setSaving(false);
    onComplete();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 620, maxHeight: "90vh", overflow: "auto", padding: 28, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.ink900 }}>Financial Setup</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: T.ink500 }}>{tenantName}</p>
          </div>
          <button onClick={onComplete} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.ink400 }}>&times;</button>
        </div>

        {/* Section 1: Business Details */}
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink700, marginBottom: 10 }}>Business Details</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Trading Name *</label>
              <input style={inputStyle} value={form.trading_name} onChange={e => set("trading_name", e.target.value)} />
              {errors.trading_name && <div style={errStyle}>{errors.trading_name}</div>}
            </div>
            <div>
              <label style={labelStyle}>Company Reg Number *</label>
              <input style={inputStyle} value={form.company_reg_number} onChange={e => set("company_reg_number", e.target.value)} />
              {errors.company_reg_number && <div style={errStyle}>{errors.company_reg_number}</div>}
            </div>
            <div>
              <label style={labelStyle}>Income Tax Number</label>
              <input style={inputStyle} value={form.income_tax_number} onChange={e => set("income_tax_number", e.target.value)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Registered Address *</label>
              <textarea style={{ ...inputStyle, minHeight: 50 }} value={form.registered_address} onChange={e => set("registered_address", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Section 2: VAT */}
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink700, marginBottom: 10 }}>VAT Configuration</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>VAT Registered</label>
              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={form.vat_registered} onChange={e => set("vat_registered", e.target.checked)} /> Yes
              </label>
            </div>
            {form.vat_registered && (
              <div>
                <label style={labelStyle}>VAT Number *</label>
                <input style={{ ...inputStyle, borderColor: errors.vat_number ? T.danger : T.border }} value={form.vat_number} onChange={e => set("vat_number", e.target.value)} />
                {errors.vat_number && <div style={errStyle}>{errors.vat_number}</div>}
              </div>
            )}
            <div>
              <label style={labelStyle}>VAT Period</label>
              <select style={inputStyle} value={form.vat_period} onChange={e => set("vat_period", e.target.value)}>
                <option value="bi_monthly">Bi-monthly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>VAT Basis</label>
              <select style={inputStyle} value={form.vat_basis} onChange={e => set("vat_basis", e.target.value)}>
                <option value="invoice">Invoice</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Financial Year */}
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink700, marginBottom: 10 }}>Financial Year</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>FY Start *</label>
              <select style={inputStyle} value={form.financial_year_start} onChange={e => set("financial_year_start", e.target.value)}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {errors.financial_year_start && <div style={errStyle}>{errors.financial_year_start}</div>}
            </div>
            <div>
              <label style={labelStyle}>FY End</label>
              <input style={{ ...inputStyle, background: "#f9f9f9" }} value={fyEnd(form.financial_year_start)} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Accounting Basis</label>
              <select style={inputStyle} value={form.accounting_basis} onChange={e => set("accounting_basis", e.target.value)}>
                <option value="accrual">Accrual</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Auditor */}
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink700, marginBottom: 10 }}>Auditor</div>
          <div style={gridStyle}>
            <div><label style={labelStyle}>Auditor Name</label><input style={inputStyle} value={form.auditor_name} onChange={e => set("auditor_name", e.target.value)} /></div>
            <div><label style={labelStyle}>Auditor Firm</label><input style={inputStyle} value={form.auditor_firm} onChange={e => set("auditor_firm", e.target.value)} /></div>
            <div>
              <label style={labelStyle}>Auditor Email</label>
              <input style={inputStyle} value={form.auditor_email} onChange={e => set("auditor_email", e.target.value)} />
              {errors.auditor_email && <div style={errStyle}>{errors.auditor_email}</div>}
            </div>
          </div>
        </div>

        {/* Section 5: Equity */}
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink700, marginBottom: 10 }}>Equity & Capital</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Share Capital (ZAR) *</label>
              <input style={inputStyle} type="number" min="0" value={form.share_capital} onChange={e => set("share_capital", parseFloat(e.target.value) || 0)} />
              {errors.share_capital && <div style={errStyle}>{errors.share_capital}</div>}
            </div>
            <div>
              <label style={labelStyle}>Opening Retained Earnings</label>
              <input style={inputStyle} type="number" value={form.opening_retained_earnings} onChange={e => set("opening_retained_earnings", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label style={labelStyle}>Financial Year</label>
              <input style={{ ...inputStyle, background: "#f9f9f9" }} value="FY2026" readOnly />
            </div>
          </div>
        </div>

        {saveError && <div style={{ background: "#FEE2E2", color: T.danger, padding: "10px 14px", borderRadius: 6, fontSize: 12, marginBottom: 14 }}>{saveError}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
          <button onClick={onComplete} style={{ padding: "8px 20px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: "8px 24px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Complete Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
