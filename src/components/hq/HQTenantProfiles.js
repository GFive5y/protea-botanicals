// src/components/hq/HQTenantProfiles.js — HQ Tenant Profile Tab
// Read-only diagnostic view of tenant financial setup, equity, and data health.
// LL-207: no tenantId prop — queries all tenants directly.

/*
 * KNOWN DATA ISSUES (as of 14 April 2026 — session 259)
 *
 * 1. Garden Bistro vat_number = 'accounts@smithassoc.co.za'
 *    Auditor email was pasted into VAT number field during setup.
 *
 * 2. All tenants: equity_ledger.net_profit_for_year = NULL
 *    Financial setup wizard never writes this field. Should be
 *    auto-populated by tenant_financial_period RPC after period close.
 *
 * 3. POS sales VAT not flowing to vat_transactions (0 order rows).
 *    Backend pipeline bug, not a UI bug.
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";
import HQTenantFinancialSetup from "./HQTenantFinancialSetup";

const fmtZar = (n) => {
  if (n == null) return "—";
  return `R${parseFloat(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const INDUSTRY_BADGE = {
  cannabis_retail:     { label: "Cannabis Retail",    bg: "#E8F5EE", color: "#2D6A4F" },
  cannabis_dispensary: { label: "Cannabis Dispensary", bg: "#F0FDF4", color: "#166534" },
  food_beverage:       { label: "Food & Beverage",    bg: "#FFFBEB", color: "#92400E" },
  general_retail:      { label: "General Retail",     bg: "#F9FAFB", color: "#374151" },
};

const SEV_DOT = { critical: T.danger, warning: T.warning, info: T.info };

function detectBugs(tenant, coaCount, orderCount, vatCount) {
  const bugs = [];
  const cfg = tenant.tenant_config?.[0] || tenant.tenant_config;
  const eq = Array.isArray(tenant.equity_ledger) ? tenant.equity_ledger[0] : tenant.equity_ledger;

  if (cfg?.vat_number && cfg.vat_number.includes("@")) {
    bugs.push({ severity: "critical", message: `VAT number "${cfg.vat_number}" is an email address. Will fail SARS eFiling.` });
  }
  if (eq?.net_profit_for_year === null || eq?.net_profit_for_year === undefined) {
    bugs.push({ severity: "critical", message: "equity_ledger.net_profit_for_year is NULL — balance sheet equation will not close." });
  }
  if (eq && (parseFloat(eq.share_capital) === 0 || eq.share_capital === null)) {
    bugs.push({ severity: "critical", message: "Share capital is R0.00 — equity section incorrect." });
  }
  if (!cfg?.financial_setup_complete && orderCount > 0) {
    bugs.push({ severity: "critical", message: `Financial setup not completed but tenant has ${orderCount} paid orders.` });
  }
  if (!cfg?.registered_address || cfg.registered_address.trim() === "") {
    bugs.push({ severity: "warning", message: "Registered address is empty." });
  }
  if (cfg?.financial_setup_complete && !cfg?.auditor_name) {
    bugs.push({ severity: "warning", message: "Auditor not set. Required for IFRS statement sign-off." });
  }
  if (cfg?.auditor_name === "" || cfg?.auditor_firm === "" || cfg?.auditor_email === "") {
    bugs.push({ severity: "warning", message: "Auditor fields saved as empty strings." });
  }
  if (!cfg?.company_reg_number || cfg.company_reg_number.trim() === "") {
    bugs.push({ severity: "warning", message: "Company registration number not captured." });
  }
  if (vatCount === 0 && orderCount > 0 && cfg?.vat_registered) {
    bugs.push({ severity: "warning", message: "VAT registered but 0 VAT transaction records." });
  }
  if (coaCount === 0) {
    bugs.push({ severity: "info", message: "Chart of accounts not seeded." });
  }
  if (!tenant.is_active) {
    bugs.push({ severity: "info", message: "Tenant is inactive." });
  }
  return bugs;
}

function Badge({ label, bg, color }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: bg, color, letterSpacing: "0.03em" }}>
      {label}
    </span>
  );
}

function Field({ label, value, bug }) {
  const display = value == null || value === "" ? "—" : String(value);
  const muted = display === "—";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.ink500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: bug ? T.danger : muted ? T.ink400 : T.ink900 }}>
        {display}{muted && " (not set)"}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: 14, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.ink500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || T.ink900, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.ink400, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: T.ink700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 20, marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>{title}</div>;
}

function ProfilePanel({ tenant, bugs }) {
  const cfg = Array.isArray(tenant.tenant_config) ? tenant.tenant_config[0] : tenant.tenant_config;
  const eq = Array.isArray(tenant.equity_ledger) ? tenant.equity_ledger[0] : tenant.equity_ledger;
  const ind = INDUSTRY_BADGE[tenant.industry_profile] || INDUSTRY_BADGE.general_retail;
  const criticals = bugs.filter(b => b.severity === "critical").length;

  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.ink900 }}>{tenant.name}</span>
        <Badge label={ind.label} bg={ind.bg} color={ind.color} />
        <Badge label={cfg?.tier || "—"} bg="#F3F4F6" color="#6B7280" />
        <Badge
          label={cfg?.financial_setup_complete ? "Setup complete" : "Setup incomplete"}
          bg={cfg?.financial_setup_complete ? "#E8F5EE" : "#FEF3C7"}
          color={cfg?.financial_setup_complete ? "#166534" : "#92400E"}
        />
        {criticals > 0 && <Badge label={`${criticals} critical`} bg="#FEE2E2" color={T.danger} />}
        {cfg?.financial_year_start && (
          <span style={{ fontSize: 11, color: T.ink500 }}>FY start: {cfg.financial_year_start}</span>
        )}
      </div>

      {/* Company Registration */}
      <SectionHeader title="Company Registration" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
        <Field label="Trading name" value={cfg?.trading_name} />
        <Field label="Company reg number" value={cfg?.company_reg_number} />
        <Field label="Income tax number" value={cfg?.income_tax_number} />
        <Field label="Registered address" value={cfg?.registered_address} />
      </div>

      {/* VAT Configuration */}
      <SectionHeader title="VAT Configuration" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
        <Field label="VAT registered" value={cfg?.vat_registered ? "Yes" : "No"} />
        <Field label="VAT number" value={cfg?.vat_number} bug={cfg?.vat_number?.includes("@")} />
        <Field label="VAT period" value={cfg?.vat_period} />
        <Field label="VAT rate" value={cfg?.vat_rate ? `${(parseFloat(cfg.vat_rate) * 100).toFixed(0)}%` : null} />
        <Field label="VAT basis" value={cfg?.vat_basis} />
      </div>

      {/* Financial Year */}
      <SectionHeader title="Financial Year" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
        <Field label="FY start" value={cfg?.financial_year_start} />
        <Field label="FY end" value={cfg?.financial_year_end} />
        <Field label="Accounting basis" value={cfg?.accounting_basis} />
      </div>

      {/* Auditor */}
      <SectionHeader title="Auditor" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
        <Field label="Auditor name" value={cfg?.auditor_name} />
        <Field label="Auditor firm" value={cfg?.auditor_firm} />
        <Field label="Auditor email" value={cfg?.auditor_email} />
      </div>

      {/* Equity Ledger */}
      <SectionHeader title="Equity Ledger" />
      <div style={{ display: "flex", gap: 12 }}>
        <StatCard label="Share Capital" value={fmtZar(eq?.share_capital)} color={parseFloat(eq?.share_capital || 0) === 0 ? T.danger : T.accent} />
        <StatCard label="Opening Retained" value={fmtZar(eq?.opening_retained_earnings)} />
        <StatCard
          label="Net Profit (stored)"
          value={eq?.net_profit_for_year != null ? fmtZar(eq.net_profit_for_year) : "NULL"}
          color={eq?.net_profit_for_year == null ? T.danger : T.ink900}
          sub={eq?.net_profit_for_year == null ? "Balance sheet will not close" : eq?.year_end_closed ? "Year-end closed" : "Year-end open"}
        />
      </div>

      {/* Data Health */}
      <SectionHeader title="Data Health" />
      <div style={{ display: "flex", gap: 12 }}>
        <StatCard label="COA Accounts" value={tenant._coaCount || 0} color={tenant._coaCount === 0 ? T.warning : T.accent} />
        <StatCard label="Paid Orders" value={tenant._orderCount || 0} />
        <StatCard label="VAT Transactions" value={tenant._vatCount || 0} color={tenant._vatCount === 0 && tenant._orderCount > 0 ? T.warning : T.ink900} />
      </div>

      {/* Issues */}
      {bugs.length > 0 && (
        <>
          <SectionHeader title={`Issues (${bugs.length})`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {bugs.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.ink700, padding: "4px 0" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_DOT[b.severity] || T.ink400, flexShrink: 0 }} />
                {b.message}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function HQTenantProfiles() {
  const [tenants, setTenants] = useState([]);
  const [bugMap, setBugMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupModalTenant, setSetupModalTenant] = useState(null);
  const [recalcStatus, setRecalcStatus] = useState({});
  const [editingVat, setEditingVat] = useState(null);
  const [vatEditValue, setVatEditValue] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: raw } = await supabase
      .from("tenants")
      .select(`
        id, name, industry_profile, is_active, created_at,
        tenant_config (
          tier, financial_setup_complete, trading_name,
          vat_registered, vat_number, vat_period, vat_rate, vat_basis,
          financial_year_start, financial_year_end,
          company_reg_number, income_tax_number, registered_address,
          auditor_name, auditor_firm, auditor_email, accounting_basis
        ),
        equity_ledger (
          financial_year, share_capital, opening_retained_earnings,
          net_profit_for_year, dividends_declared, year_end_closed
        )
      `)
      .neq("industry_profile", "operator")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true })
      .order("financial_year", { ascending: false, foreignTable: "equity_ledger" });

    const tenantList = raw || [];
    const ids = tenantList.map(t => t.id);

    const [coaRes, orderRes, vatRes] = await Promise.all([
      supabase.from("chart_of_accounts").select("tenant_id").in("tenant_id", ids),
      supabase.from("orders").select("tenant_id, status").in("tenant_id", ids),
      supabase.from("vat_transactions").select("tenant_id").in("tenant_id", ids),
    ]);

    const coaCounts = {};
    (coaRes.data || []).forEach(r => { coaCounts[r.tenant_id] = (coaCounts[r.tenant_id] || 0) + 1; });
    const orderCounts = {};
    (orderRes.data || []).filter(r => r.status === "paid").forEach(r => { orderCounts[r.tenant_id] = (orderCounts[r.tenant_id] || 0) + 1; });
    const vatCounts = {};
    (vatRes.data || []).forEach(r => { vatCounts[r.tenant_id] = (vatCounts[r.tenant_id] || 0) + 1; });

    tenantList.forEach(t => {
      t._coaCount = coaCounts[t.id] || 0;
      t._orderCount = orderCounts[t.id] || 0;
      t._vatCount = vatCounts[t.id] || 0;
    });

    const newBugMap = {};
    tenantList.forEach(t => {
      newBugMap[t.id] = detectBugs(t, t._coaCount, t._orderCount, t._vatCount);
    });

    // Duplicate reg number check
    const regNums = tenantList
      .filter(t => {
        const cfg = Array.isArray(t.tenant_config) ? t.tenant_config[0] : t.tenant_config;
        return cfg?.company_reg_number;
      })
      .map(t => {
        const cfg = Array.isArray(t.tenant_config) ? t.tenant_config[0] : t.tenant_config;
        return { id: t.id, name: t.name, reg: cfg.company_reg_number };
      });
    regNums.forEach(r => {
      const dupes = regNums.filter(x => x.reg === r.reg && x.id !== r.id);
      if (dupes.length > 0) {
        newBugMap[r.id].push({ severity: "critical", message: `Company reg ${r.reg} also on: ${dupes.map(d => d.name).join(", ")}` });
      }
    });

    setTenants(tenantList);
    setBugMap(newBugMap);
    setLoading(false);
  }

  async function recalcNetProfit(tid) {
    setRecalcStatus(s => ({ ...s, [tid]: "loading" }));
    try {
      const { data: tc } = await supabase.from("tenant_config").select("financial_year_start").eq("tenant_id", tid).maybeSingle();
      const fyStart = tc?.financial_year_start || "03-01";
      const fyYear = new Date().getFullYear();
      const mo = parseInt(fyStart.split("-")[0], 10);
      const yr = (new Date().getMonth() + 1) >= mo ? fyYear : fyYear - 1;
      const { data: plData } = await supabase.rpc("tenant_financial_period", {
        p_tenant_id: tid,
        p_since: `${yr}-${fyStart}T00:00:00+00:00`,
        p_until: new Date().toISOString(),
      });
      if (plData) {
        const net = (plData.revenue?.ex_vat || 0) - (plData.cogs?.actual || 0) - (plData.opex?.paid || 0);
        await supabase.from("equity_ledger").update({ net_profit_for_year: net }).eq("tenant_id", tid).eq("financial_year", `FY${yr}`);
        setRecalcStatus(s => ({ ...s, [tid]: "done" }));
        loadData();
      }
    } catch (e) {
      console.error("[Recalc]", e);
      setRecalcStatus(s => ({ ...s, [tid]: "error" }));
    }
  }

  async function saveVatNumber(tid) {
    if (!vatEditValue.trim() || vatEditValue.includes("@")) return;
    await supabase.from("tenant_config").update({ vat_number: vatEditValue.trim() }).eq("tenant_id", tid);
    setEditingVat(null);
    setVatEditValue("");
    loadData();
  }

  const visible = tenants.filter(t => showInactive ? true : t.is_active);
  const activeCount = tenants.filter(t => t.is_active).length;
  const setupCount = tenants.filter(t => {
    const cfg = Array.isArray(t.tenant_config) ? t.tenant_config[0] : t.tenant_config;
    return cfg?.financial_setup_complete;
  }).length;
  const totalBugs = Object.values(bugMap).reduce((s, b) => s + b.filter(x => x.severity === "critical").length, 0);

  if (loading) return <div style={{ fontFamily: T.font, color: T.ink500, padding: 40, textAlign: "center" }}>Loading tenant profiles...</div>;

  return (
    <div style={{ fontFamily: T.font, color: T.ink900 }}>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Active Tenants" value={activeCount} />
        <StatCard label="Setup Complete" value={setupCount} color={setupCount < activeCount ? T.warning : T.accent} />
        <StatCard label="Critical Bugs" value={totalBugs} color={totalBugs > 0 ? T.danger : T.accent} />
        <StatCard label="Total Tenants" value={tenants.length} sub="incl. inactive" />
      </div>

      {/* Tenant selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {visible.map(t => {
          const tBugs = bugMap[t.id] || [];
          const hasCritical = tBugs.some(b => b.severity === "critical");
          const isSelected = selected?.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: `1px solid ${isSelected ? T.accent : T.border}`,
                background: isSelected ? T.accentLight : "#fff",
                color: isSelected ? T.accent : T.ink700,
                cursor: "pointer",
                position: "relative",
                opacity: t.is_active ? 1 : 0.5,
              }}
            >
              {t.name}
              {hasCritical && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: T.danger }} />}
            </button>
          );
        })}
        <label style={{ fontSize: 11, color: T.ink500, display: "flex", alignItems: "center", gap: 4, marginLeft: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={showInactive} onChange={() => setShowInactive(v => !v)} />
          Show inactive
        </label>
      </div>

      {/* Profile panel */}
      {selected ? (
        <>
          <ProfilePanel tenant={selected} bugs={bugMap[selected.id] || []} />
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {(() => {
              const cfg = Array.isArray(selected.tenant_config) ? selected.tenant_config[0] : selected.tenant_config;
              const eq = Array.isArray(selected.equity_ledger) ? selected.equity_ledger[0] : selected.equity_ledger;
              return (
                <>
                  {!cfg?.financial_setup_complete && (
                    <button onClick={() => setSetupModalTenant(selected)} style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: T.warning, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Complete Financial Setup
                    </button>
                  )}
                  {cfg?.financial_setup_complete && eq?.net_profit_for_year == null && (
                    <button onClick={() => recalcNetProfit(selected.id)} disabled={recalcStatus[selected.id] === "loading"} style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${T.accent}`, background: T.accentLight, color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {recalcStatus[selected.id] === "loading" ? "Calculating..." : recalcStatus[selected.id] === "done" ? "Done" : "Recalculate P&L"}
                    </button>
                  )}
                  {cfg?.vat_number?.includes("@") && (
                    editingVat === selected.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input value={vatEditValue} onChange={e => setVatEditValue(e.target.value)} placeholder="Enter SARS VAT number" style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 4, width: 180 }} />
                        <button onClick={() => saveVatNumber(selected.id)} disabled={!vatEditValue.trim() || vatEditValue.includes("@")} style={{ padding: "6px 12px", borderRadius: 4, border: "none", background: T.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Save</button>
                        <button onClick={() => setEditingVat(null)} style={{ padding: "6px 12px", borderRadius: 4, border: `1px solid ${T.border}`, background: "#fff", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingVat(selected.id); setVatEditValue(""); }} style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${T.danger}`, background: "#FEE2E2", color: T.danger, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Fix VAT Number
                      </button>
                    )
                  )}
                </>
              );
            })()}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: 40, color: T.ink400, fontSize: 13 }}>
          Select a tenant above to view their financial profile.
        </div>
      )}

      {/* Setup modal */}
      {setupModalTenant && (
        <HQTenantFinancialSetup
          tenantId={setupModalTenant.id}
          tenantName={setupModalTenant.name}
          industryProfile={setupModalTenant.industry_profile}
          existingConfig={setupModalTenant.tenant_config}
          onComplete={() => { setSetupModalTenant(null); loadData(); }}
        />
      )}
    </div>
  );
}
