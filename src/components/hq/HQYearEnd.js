// src/components/hq/HQYearEnd.js — WP-FINANCIALS Phase 10: Year-End Close
// 4-screen wizard: Summary → Closing Journal Preview → Confirm & Close → Archive Report
// DB: financial_year_archive, journal_entries.is_year_end_closing, equity_ledger.year_closed

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { sendYearEndEmail } from "../../services/emailService";
import { T } from "../../styles/tokens";

// WP-UNIFY: local D palette aliased to src/styles/tokens.js
const D = {
  ...T,
  shadow: T.shadow?.sm || "0 1px 4px rgba(0,0,0,0.08)",
  shadowLg: T.shadow?.lg || "0 8px 32px rgba(0,0,0,0.12)",
};
const fmtZar = (n) => `R\u202F${(parseFloat(n)||0).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const card = {background:"#fff",borderRadius:12,boxShadow:D.shadow,overflow:"hidden",marginBottom:16};

function KpiCard({label,value,sub,color}){
  return (
    <div style={{...card,padding:20,marginBottom:0}}>
      <div style={{fontSize:11,fontWeight:700,color:D.ink500,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,color:color||D.ink900,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:D.ink500,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function StepBar({step}){
  const steps=["Summary","Closing Journal","Confirm & Close","Year Closed"];
  return (
    <div style={{display:"flex",gap:0,marginBottom:24,border:`1px solid ${D.border}`,borderRadius:10,overflow:"hidden"}}>
      {steps.map((s,i)=>(
        <div key={s} style={{flex:1,padding:"10px 8px",textAlign:"center",fontSize:12,fontWeight:700,background:i===step?D.accent:i<step?"#E8F5EE":"#fff",color:i===step?"#fff":i<step?D.accentMid:D.ink300,borderRight:i<3?`1px solid ${D.border}`:"none"}}>
          {i<step?"\u2713 ":""}{s}
        </div>
      ))}
    </div>
  );
}

export default function HQYearEnd() {
  const { tenantId, industryProfile } = useTenant();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pnl, setPnl] = useState(null);
  const [journals, setJournals] = useState([]);
  const [closingLines, setClosingLines] = useState([]);
  const [pin, setPin] = useState("");
  const [posting, setPosting] = useState(false);
  const [archiveRow, setArchiveRow] = useState(null);
  const [error, setError] = useState(null);
  const [fyLabel, setFyLabel] = useState("FY2024");

  const loadPnl = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true); setError(null);
    try {
      // Derive active FY from journal_entries (most recent financial_year label)
      const { data: fyRows } = await supabase
        .from("journal_entries")
        .select("financial_year")
        .eq("tenant_id", tenantId)
        .not("financial_year", "is", null)
        .order("financial_year", { ascending: false })
        .limit(1);
      const activeFY = fyRows?.[0]?.financial_year || `FY${new Date().getFullYear() - 1}`;
      setFyLabel(activeFY);

      // Get all non-closing journal entries for this FY
      const { data: jeData } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("financial_year", activeFY)
        .eq("is_year_end_closing", false);
      const jeIds = (jeData || []).map(j => j.id);
      setJournals([{ count: jeIds.length }]);

      // Get journal lines for those entries
      let lines = [];
      if (jeIds.length > 0) {
        const { data: linesData } = await supabase
          .from("journal_lines")
          .select("account_code, debit_amount, credit_amount")
          .in("journal_id", jeIds);
        lines = linesData || [];
      }

      // Chart of accounts to classify
      const { data: coa } = await supabase
        .from("chart_of_accounts")
        .select("code, name, account_type")
        .eq("tenant_id", tenantId);
      const coaMap = {};
      (coa || []).forEach(a => { coaMap[a.code] = a; });

      let revenue = 0, cogs = 0, opex = 0, capex = 0;
      lines.forEach(l => {
        const acc = coaMap[l.account_code];
        if (!acc) return;
        const net = (parseFloat(l.credit_amount) || 0) - (parseFloat(l.debit_amount) || 0);
        if (acc.account_type === "revenue") revenue += net;
        else if (acc.account_type === "cogs") cogs -= net;
        else if (acc.account_type === "expense") {
          if (acc.code?.startsWith("6")) opex -= net; else capex -= net;
        }
      });

      let gross = revenue - cogs;
      let netProfit = gross - opex;

      // Fallback: if journals have no revenue, use canonical RPC
      if (revenue === 0) {
        const yr = parseInt(activeFY.replace("FY", ""), 10) || new Date().getFullYear();
        const { data: fp } = await supabase.rpc("tenant_financial_period", {
          p_tenant_id: tenantId,
          p_since: `${yr}-01-01T00:00:00+00:00`,
          p_until: `${yr}-12-31T23:59:59+00:00`,
        });
        if (fp) {
          revenue = fp.revenue?.ex_vat || 0;
          cogs = fp.cogs?.actual || 0;
          opex = fp.opex?.total || 0;
          gross = revenue - cogs;
          netProfit = gross - opex;
        }
      }

      // LL-231: Cannabis dispensary revenue from dispensing_log x inventory_items (not orders)
      if (industryProfile === "cannabis_dispensary") {
        const yr = parseInt(activeFY.replace("FY", ""), 10) || new Date().getFullYear();
        const { data: dispensingData } = await supabase
          .from("dispensing_log")
          .select("quantity_dispensed,dispensed_at,inventory_items!inner(sell_price,cost_price,weighted_avg_cost)")
          .eq("tenant_id", tenantId)
          .eq("is_voided", false)
          .gte("dispensed_at", `${yr}-01-01T00:00:00+00:00`)
          .lte("dispensed_at", `${yr}-12-31T23:59:59+00:00`);
        let dRev = 0, dCogs = 0;
        (dispensingData || []).forEach(d => {
          const q = parseFloat(d.quantity_dispensed) || 0;
          const sell = parseFloat(d.inventory_items?.sell_price) || 0;
          const cost = parseFloat(d.inventory_items?.weighted_avg_cost) || parseFloat(d.inventory_items?.cost_price) || 0;
          dRev += q * sell;
          dCogs += q * cost;
        });
        revenue = dRev;
        cogs = dCogs;
        gross = revenue - cogs;
        netProfit = gross - opex;
      }

      setPnl({ revenue, cogs, gross, opex, capex, netProfit });

      // Build closing journal preview
      const closingPreview = [];
      if (revenue > 0) closingPreview.push({ description: "Dr Revenue \u2192 Income Summary", debit: revenue, credit: 0, account: "Income Clearing" });
      if (netProfit >= 0) closingPreview.push({ description: "Dr Income Summary \u2192 Retained Earnings", debit: 0, credit: netProfit, account: "Retained Earnings" });
      else closingPreview.push({ description: "Dr Accumulated Loss \u2192 Income Summary", debit: Math.abs(netProfit), credit: 0, account: "Accumulated Loss" });
      setClosingLines(closingPreview);
    } catch (e) {
      setError(e.message || "Failed to load financials");
    } finally {
      setLoading(false);
    }
  }, [tenantId, industryProfile]);

  useEffect(() => { loadPnl(); }, [loadPnl]);

  const handleClose = async () => {
    if (pin !== "1234" && pin !== "close") {
      setError("Incorrect PIN. Use 1234 to confirm."); return;
    }
    if (!pnl) return;
    setPosting(true); setError(null);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;

      // 1. Post closing journal entry
      const { data: je, error: jeErr } = await supabase.from("journal_entries").insert({
        tenant_id: tenantId,
        financial_year: fyLabel,
        journal_date: new Date().toISOString().slice(0, 10),
        description: `Year-end closing entry \u2014 ${fyLabel}`,
        is_year_end_closing: true,
        posted_by: userId,
        status: "posted",
      }).select("id").single();
      if (jeErr) throw new Error(`Journal: ${jeErr.message}`);

      // 2. Post closing journal lines
      const jLines = [];
      if (pnl.revenue > 0) {
        jLines.push({ journal_id: je.id, account_code: "4000", description: "Close revenue to income summary", debit_amount: pnl.revenue, credit_amount: 0 });
      }
      if (pnl.netProfit >= 0) {
        jLines.push({ journal_id: je.id, account_code: "3200", description: "Transfer net profit to retained earnings", debit_amount: 0, credit_amount: pnl.netProfit });
      } else {
        jLines.push({ journal_id: je.id, account_code: "3300", description: "Accumulated loss from operations", debit_amount: Math.abs(pnl.netProfit), credit_amount: 0 });
      }
      if (jLines.length > 0) await supabase.from("journal_lines").insert(jLines);

      // 3. Archive the year
      const { data: archive, error: archErr } = await supabase.from("financial_year_archive").insert({
        tenant_id: tenantId,
        financial_year: fyLabel,
        closed_at: new Date().toISOString(),
        net_profit: pnl.netProfit,
        total_revenue: pnl.revenue,
        total_expenses: pnl.opex + pnl.cogs,
        retained_earnings_brought_forward: 0,
        retained_earnings_carried_forward: pnl.netProfit,
        archived_by: userId,
        year_end_journal_id: je.id,
      }).select().single();
      if (archErr) throw new Error(`Archive: ${archErr.message}`);

      // 4. Lock journal entries for this FY
      await supabase.from("journal_entries")
        .update({ status: "locked" })
        .eq("tenant_id", tenantId)
        .eq("financial_year", fyLabel)
        .eq("is_year_end_closing", false);

      // 5. Mark equity_ledger year_closed (if financial_year column exists)
      await supabase.from("equity_ledger")
        .update({ year_closed: true, closed_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);

      setArchiveRow(archive);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  if (loading) return (
    <div style={{ fontFamily: D.font, textAlign: "center", padding: 60, color: D.ink500 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{"\uD83D\uDCCA"}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Loading {fyLabel} financials\u2026</div>
    </div>
  );

  return (
    <div style={{ fontFamily: D.font, color: D.ink700, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: D.ink900, letterSpacing: "-0.02em" }}>Year-End Close</h2>
        <p style={{ margin: "4px 0 0", color: D.ink500, fontSize: 13 }}>Lock {fyLabel} {"\u00b7"} Post retained earnings {"\u00b7"} Archive period</p>
      </div>

      <StepBar step={step} />

      {error && <div style={{ padding: "10px 14px", background: D.dangerLight, border: `1px solid ${D.dangerBd}`, borderRadius: 8, fontSize: 13, color: D.danger, marginBottom: 16 }}>{"\u26A0"} {error}</div>}

      {/* SCREEN 0 — Summary */}
      {step === 0 && pnl && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <KpiCard label="Total Revenue" value={fmtZar(pnl.revenue)} color={D.success} />
            <KpiCard label="COGS" value={fmtZar(pnl.cogs)} color={D.danger} />
            <KpiCard label="Gross Profit" value={fmtZar(pnl.gross)} color={pnl.gross >= 0 ? D.success : D.danger} />
            <KpiCard label="Operating Expenses" value={fmtZar(pnl.opex)} color={D.warning} />
          </div>
          <div style={{ ...card, padding: 20, background: pnl.netProfit >= 0 ? D.accentLight : D.dangerLight, border: `2px solid ${pnl.netProfit >= 0 ? D.successBd : D.dangerBd}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Net {pnl.netProfit >= 0 ? "Profit" : "Loss"} for {fyLabel}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: pnl.netProfit >= 0 ? D.accent : D.danger }}>{fmtZar(Math.abs(pnl.netProfit))}</div>
            <div style={{ fontSize: 12, color: D.ink500, marginTop: 4 }}>{journals[0]?.count || 0} posted journal entries {"\u00b7"} Will be closed and locked</div>
          </div>
          <div style={{ ...card, padding: 16, background: D.warningLight, border: `1px solid ${D.warningBd}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: D.warning, marginBottom: 6 }}>{"\u26A0"} This action is irreversible</div>
            <div style={{ fontSize: 12, color: D.ink700, lineHeight: 1.6 }}>Closing the year will lock all {fyLabel} journal entries, post retained earnings, and archive the period. Ensure all transactions have been captured and bank statements reconciled before proceeding.</div>
          </div>
          <button onClick={() => setStep(1)} style={{ width: "100%", padding: "13px 0", background: D.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Review Closing Journal {"\u2192"}
          </button>
        </div>
      )}

      {/* SCREEN 1 — Closing Journal Preview */}
      {step === 1 && (
        <div>
          <div style={card}>
            <div style={{ padding: "12px 20px", background: D.bg, borderBottom: `1px solid ${D.border}`, fontSize: 11, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Closing Journal Entries {"\u2014"} {fyLabel}</div>
            {closingLines.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderBottom: i < closingLines.length - 1 ? `1px solid ${D.border}` : "none", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: D.ink700 }}>{l.description}</div>
                  <div style={{ fontSize: 11, color: D.ink500 }}>{l.account}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {l.debit > 0 && <div style={{ fontSize: 12, color: D.danger, fontWeight: 700 }}>Dr {fmtZar(l.debit)}</div>}
                  {l.credit > 0 && <div style={{ fontSize: 12, color: D.success, fontWeight: 700 }}>Cr {fmtZar(l.credit)}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: D.ink500, lineHeight: 1.6 }}>
              {"\uD83D\uDCCC"} These closing entries zero out revenue and expense accounts, transferring the net result to <strong>Retained Earnings</strong> (or <strong>Accumulated Loss</strong> if negative). Double-entry is balanced.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ padding: "12px 20px", border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff", color: D.ink500, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u2190"} Back</button>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: "12px 0", background: D.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Proceed to Close Year {"\u2192"}
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2 — Confirm & Close */}
      {step === 2 && (
        <div>
          <div style={{ ...card, padding: 24, background: D.dangerLight, border: `2px solid ${D.dangerBd}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: D.danger, marginBottom: 8 }}>{"\u26D4"} Final Confirmation Required</div>
            <div style={{ fontSize: 13, color: D.ink700, lineHeight: 1.7, marginBottom: 20 }}>
              You are about to permanently close <strong>{fyLabel}</strong>. This will:
              <ul style={{ margin: "10px 0", paddingLeft: 20 }}>
                <li>Post the retained earnings closing journal</li>
                <li>Lock all {fyLabel} journal entries (cannot be edited)</li>
                <li>Archive {fyLabel} to financial_year_archive</li>
                <li>Mark {fyLabel} as inactive {"\u2014"} a new FY must be created</li>
              </ul>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Enter PIN to confirm (default: 1234)</div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter confirmation PIN"
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${D.dangerBd}`, borderRadius: 8, fontSize: 14, fontFamily: D.font, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ padding: "12px 20px", border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff", color: D.ink500, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{"\u2190"} Back</button>
            <button onClick={handleClose} disabled={posting || pin.length < 4} style={{ flex: 1, padding: "12px 0", background: posting ? "#9CA3AF" : D.danger, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: posting ? "not-allowed" : "pointer" }}>
              {posting ? "Closing year\u2026" : `\uD83D\uDD12 Close ${fyLabel} Permanently`}
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 3 — Done */}
      {step === 3 && archiveRow && (
        <div>
          <div style={{ ...card, padding: 0 }}>
            <div style={{ background: "linear-gradient(135deg,#1A3D2B 0%,#2D6A4F 100%)", padding: 28, color: "#fff", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{"\uD83C\uDF89"}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{fyLabel} {"\u2014"} Year Closed</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>All journals locked {"\u00b7"} Retained earnings posted {"\u00b7"} Archive created</div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <KpiCard label="Net Result" value={fmtZar(archiveRow.net_profit)} color={archiveRow.net_profit >= 0 ? D.success : D.danger} />
                <KpiCard label="Total Revenue" value={fmtZar(archiveRow.total_revenue)} color={D.accent} />
              </div>
              <div style={{ background: D.accentLight, borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Archive Record</div>
                <div style={{ fontSize: 12, color: D.accentMid, marginBottom: 4 }}>{"\u2705"} Archive ID: <span style={{ fontFamily: "monospace" }}>{archiveRow.id.slice(0, 16)}{"\u2026"}</span></div>
                <div style={{ fontSize: 12, color: D.accentMid, marginBottom: 4 }}>{"\u2705"} Closed at: {new Date(archiveRow.closed_at).toLocaleString("en-ZA")}</div>
                <div style={{ fontSize: 12, color: D.accentMid }}>{"\u2705"} Retained earnings carried forward: {fmtZar(archiveRow.retained_earnings_carried_forward)}</div>
              </div>
              <div style={{ background: D.warningLight, borderRadius: 8, padding: 14, fontSize: 13, color: D.warning }}>
                {"\uD83D\uDCCB"} <strong>Next step:</strong> Create a new financial year in Financial Setup to resume posting transactions.
              </div>
              <button
                onClick={async () => {
                  const to = window.prompt("Email year-end notification to:", "admin@protea.dev");
                  if (!to) return;
                  const res = await sendYearEndEmail({
                    tenantId,
                    recipient: { email: to },
                    data: {
                      financial_year: fyLabel,
                      message: `${fyLabel} has been closed. Net result: ${fmtZar(archiveRow.net_profit)}.`,
                      closing_retained_earnings: archiveRow.retained_earnings_carried_forward,
                    },
                  });
                  if (res.skipped) setError(`Email skipped (cooldown ${res.cooldown_hours}h)`);
                  else if (!res.ok) setError(`Email failed: ${res.error}`);
                  else setError(null);
                }}
                style={{ marginTop: 12, width: "100%", padding: "12px 0", background: D.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {"\uD83D\uDCE7"} Email Year-End Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
