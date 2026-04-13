// src/components/hq/HQVat.js — WP-FINANCIALS Phase 6 v2.0
// VAT Module: VAT201 return preparation, output/input VAT, period filing, period close
// Tables: vat_transactions (+ source col), tenant_config, vat_period_filings
// v2.0 — 09 Apr 2026:
//   Filed persistence (vat_period_filings, submission_ref)
//   Data Sources footnote panel in VAT201 view
//   P1-style data quality warning (zero output + seeded input)
//   Period Close: source='seeded' rows replaced with source='calculated' rows
//   SourceBadge on transactions and period cards
//   getPeriodIdFromDate: string-safe, no UTC offset issues

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { sendVatReminderEmail } from "../../services/emailService";
import { T } from "../../styles/tokens";

// WP-UNIFY: local D palette aliased to src/styles/tokens.js values
const D = { ...T, shadow: T.shadow?.sm || "0 1px 4px rgba(0,0,0,0.08)" };

const fmtZar = (n) => `R\u202F${(Math.abs(parseFloat(n)||0)).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}) : "\u2014";

// String-safe period ID: avoids UTC offset issues on plain date strings
function getPeriodIdFromDate(dateStr) {
  if (!dateStr) return null;
  const s = typeof dateStr === "string" ? dateStr : new Date(dateStr).toISOString();
  const parts = s.split("T")[0].split("-");
  if (parts.length < 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (!year || !month) return null;
  return `${year}-P${Math.ceil(month / 2)}`;
}

function getBiMonthlyPeriods(year = new Date().getFullYear()) {
  return [
    { id:`${year}-P1`, label:`Jan\u2013Feb ${year}`, dueDate:`${year}-03-31`, start:`${year}-01-01`, end:`${year}-02-28` },
    { id:`${year}-P2`, label:`Mar\u2013Apr ${year}`, dueDate:`${year}-05-31`, start:`${year}-03-01`, end:`${year}-04-30` },
    { id:`${year}-P3`, label:`May\u2013Jun ${year}`, dueDate:`${year}-07-31`, start:`${year}-05-01`, end:`${year}-06-30` },
    { id:`${year}-P4`, label:`Jul\u2013Aug ${year}`, dueDate:`${year}-09-30`, start:`${year}-07-01`, end:`${year}-08-31` },
    { id:`${year}-P5`, label:`Sep\u2013Oct ${year}`, dueDate:`${year}-11-30`, start:`${year}-09-01`, end:`${year}-10-31` },
    { id:`${year}-P6`, label:`Nov\u2013Dec ${year}`, dueDate:`${year+1}-01-31`, start:`${year}-11-01`, end:`${year}-12-31` },
  ];
}
function currentPeriodId() { const m = new Date().getMonth() + 1; return `${new Date().getFullYear()}-P${Math.ceil(m / 2)}`; }
function isOverdue(d) { return d && new Date(d) < new Date(); }

function KPICard({ label, value, sub, color, icon, highlight }) {
  return (
    <div style={{ background: highlight || "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: D.shadow, flex: 1, minWidth: 160, border: highlight ? `1px solid ${D.border}` : "none" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: D.font, marginBottom: 10, display: "flex", gap: 6 }}>{icon && <span>{icon}</span>}{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || D.accent, fontVariantNumeric: "tabular-nums", fontFamily: D.font, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: D.ink500, marginTop: 6, fontFamily: D.font }}>{sub}</div>}
    </div>
  );
}

function SHead({ label, icon }) {
  return (
    <div style={{ padding: "8px 20px", background: D.bg, borderBottom: `1px solid ${D.border}`, fontSize: 10, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: D.font, display: "flex", gap: 6, alignItems: "center" }}>{icon && <span>{icon}</span>}{label}</div>
  );
}

function VAT201Row({ field, label, value, highlight, note }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 160px", padding: "12px 20px", borderBottom: `1px solid ${D.border}`, background: highlight ? D.accentLight : "transparent", alignItems: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: highlight ? D.accent : D.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: highlight ? "#fff" : D.ink500, fontFamily: D.font }}>{field}</div>
      <div style={{ paddingLeft: 12 }}><div style={{ fontSize: 13, color: D.ink700, fontFamily: D.font }}>{label}</div>{note && <div style={{ fontSize: 11, color: D.ink500, marginTop: 2, fontFamily: D.font }}>{note}</div>}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? D.accent : D.ink700, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: D.font }}>{value}</div>
    </div>
  );
}

function SourceBadge({ source }) {
  if (!source || source === "manual") return null;
  const palettes = {
    seeded:     { bg: "#FFF7ED", bd: "#FED7AA", txt: "#C2410C" },
    calculated: { bg: D.successLight, bd: D.successBd, txt: D.success },
  };
  const c = palettes[source] || palettes.seeded;
  return <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: c.bg, border: `1px solid ${c.bd}`, color: c.txt, marginLeft: 6 }}>{source}</span>;
}

function Overlay({ children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
  );
}

export default function HQVat() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [vatConfig,     setVatConfig]     = useState(null);
  const [vatTxns,       setVatTxns]       = useState([]);
  const [filings,       setFilings]       = useState([]);
  const [orderStats,    setOrderStats]    = useState({});
  const [expenseStats,  setExpenseStats]  = useState({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesInputVat, setExpensesInputVat] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodId());
  const [view,          setView]          = useState("dashboard");
  const [toast,         setToast]         = useState(null);
  const [filingModal,   setFilingModal]   = useState(null);
  const [submissionRef, setSubmissionRef] = useState("");
  const [closeModal,    setCloseModal]    = useState(null);
  const [closing,       setClosing]       = useState(false);
  const [receiptsInputVat, setReceiptsInputVat] = useState(null);
  const [receiptStats,     setReceiptStats]     = useState({});

  const periods = getBiMonthlyPeriods();
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [cfgRes, txnRes, filingsRes, expensesRes, vatPeriodsRes] = await Promise.all([
        supabase.from("tenant_config").select("vat_registered,vat_number,vat_period,vat_rate,trading_name,company_reg_number,registered_address").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("vat_transactions").select("*").eq("tenant_id", tenantId).order("transaction_date", { ascending: false }),
        supabase.from("vat_period_filings").select("*").eq("tenant_id", tenantId),
        supabase.from("expenses").select("expense_date,input_vat_amount,amount_zar").eq("tenant_id", tenantId),
        supabase.rpc("tenant_vat_periods", { p_tenant_id: tenantId, p_year: new Date().getFullYear() }),
      ]);
      setVatConfig(cfgRes.data);
      setVatTxns(txnRes.data || []);
      setFilings(filingsRes.data || []);
      setTotalExpenses((expensesRes.data || []).length);
      setExpensesInputVat((expensesRes.data || []).reduce((s, e) => s + (parseFloat(e.input_vat_amount) || 0), 0));

      // T23: Build orderStats + expenseStats from tenant_vat_periods RPC
      const vatPeriods = vatPeriodsRes.data || [];
      const oStats = {};
      const eStats = {};
      vatPeriods.forEach(vp => {
        const pid = vp.period_id;
        oStats[pid] = {
          count: vp.order_count || 0,
          totalIncl: 0,
          totalExcl: 0,
          outputVat: parseFloat(vp.output_vat) || 0,
        };
        eStats[pid] = { count: 0, totalInputVat: parseFloat(vp.input_vat) || 0 };
      });
      setOrderStats(oStats);
      setExpenseStats(eStats);
      setReceiptStats({});
      setReceiptsInputVat(0);
    } catch (e) { showToast("Load failed: " + e.message, "error"); }
    finally { setLoading(false); }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filingMap = filings.reduce((acc, f) => ({ ...acc, [f.period_id]: f }), {});

  const periodData = (pid) => {
    const txns = vatTxns.filter(t => t.vat_period === pid);
    // T26: output VAT from orderStats (RPC), not vatTxns
    const outputVat    = orderStats[pid]?.outputVat || txns.reduce((s, t) => s + (parseFloat(t.output_vat) || 0), 0);
    const inputVat     = expenseStats[pid]?.totalInputVat || txns.reduce((s, t) => s + (parseFloat(t.input_vat) || 0), 0);
    const exclusiveRev = txns.filter(t => t.transaction_type === "output").reduce((s, t) => s + (parseFloat(t.exclusive_amount) || 0), 0);
    const inclusiveRev = txns.filter(t => t.transaction_type === "output").reduce((s, t) => s + (parseFloat(t.inclusive_amount) || 0), 0);
    return {
      outputVat, inputVat, exclusiveRev, inclusiveRev,
      netVat: outputVat - inputVat,
      txnList: txns, count: txns.length + (orderStats[pid]?.count || 0),
      hasSeeded: txns.some(t => t.source === "seeded"),
      hasCalculated: txns.some(t => t.source === "calculated"),
    };
  };

  const current            = periodData(selectedPeriod);
  const selectedPeriodDef  = periods.find(p => p.id === selectedPeriod);
  const oStatsForSelected  = orderStats[selectedPeriod]  || { count: 0, totalIncl: 0, totalExcl: 0, outputVat: 0 };
  const eStatsForSelected  = expenseStats[selectedPeriod] || { count: 0, totalInputVat: 0 }; // eslint-disable-line no-unused-vars

  // ── Mark Filed ───────────────────────────────────────────────
  const openFilingModal = (pid) => { setFilingModal(pid); setSubmissionRef(filingMap[pid]?.submission_ref || ""); };
  const confirmFiled = async () => {
    if (!filingModal) return;
    const { error } = await supabase.from("vat_period_filings").upsert(
      { tenant_id: tenantId, period_id: filingModal, submission_ref: submissionRef || null },
      { onConflict: "tenant_id,period_id" }
    );
    if (error) { showToast("Failed: " + error.message, "error"); return; }
    showToast(`VAT201 for ${periods.find(p => p.id === filingModal)?.label} marked as filed.`);
    setFilingModal(null); setSubmissionRef(""); fetchAll();
  };

  // ── Period Close ─────────────────────────────────────────────
  const openCloseModal = (pid) => {
    const stored    = periodData(pid);
    const oS        = orderStats[pid]   || { count: 0, totalIncl: 0, totalExcl: 0, outputVat: 0 };
    const eS        = expenseStats[pid]  || { count: 0, totalInputVat: 0 };
    const rS        = receiptStats[pid]  || { count: 0, totalInputVat: 0 };
    const seededRows = vatTxns.filter(t => t.vat_period === pid && t.source === "seeded");
    setCloseModal({
      periodId: pid,
      calcOutputVat:        oS.outputVat,
      calcInputVat:         eS.totalInputVat + rS.totalInputVat,
      calcExpenseInputVat:  eS.totalInputVat,
      calcReceiptInputVat:  rS.totalInputVat,
      calcOrderCount:       oS.count,
      calcExpenseCount:     eS.count,
      calcReceiptCount:     rS.count,
      totalIncl:            oS.totalIncl,
      storedOutputVat:      stored.outputVat,
      storedInputVat:       stored.inputVat,
      seededRowCount:       seededRows.length,
    });
  };

  const confirmClose = async () => {
    if (!closeModal) return;
    setClosing(true);
    const { periodId, calcOutputVat, calcInputVat, calcExpenseInputVat, calcReceiptInputVat, calcOrderCount, calcExpenseCount, calcReceiptCount, totalIncl } = closeModal;
    const pDef = periods.find(p => p.id === periodId);
    try {
      const { error: delErr } = await supabase.from("vat_transactions")
        .delete().eq("tenant_id", tenantId).eq("vat_period", periodId).eq("source", "seeded");
      if (delErr) throw delErr;

      const excl = Math.round((totalIncl / 1.15) * 100) / 100;
      const rows = [
        {
          tenant_id: tenantId, transaction_type: "output", vat_period: periodId, source: "calculated",
          output_vat: Math.round(calcOutputVat * 100) / 100, input_vat: 0,
          exclusive_amount: excl, inclusive_amount: Math.round(totalIncl * 100) / 100,
          description: calcOrderCount > 0 ? `Period close: ${calcOrderCount} paid orders (${pDef?.label})` : `Period close: no paid orders found (${pDef?.label})`,
          vat_rate: 0.15, transaction_date: pDef?.end, source_table: "orders",
        },
        {
          tenant_id: tenantId, transaction_type: "input", vat_period: periodId, source: "calculated",
          output_vat: 0, input_vat: Math.round(calcInputVat * 100) / 100,
          exclusive_amount: 0, inclusive_amount: 0,
          description: `Period close: expenses R${(calcExpenseInputVat||0).toFixed(2)} + receipts R${(calcReceiptInputVat||0).toFixed(2)}${calcInputVat === 0 ? " (R0 \u2014 add VAT via Expenses or Stock Receive)" : ""}`,
          vat_rate: 0.15, transaction_date: pDef?.end, source_table: "expenses",
        },
      ];

      const { error: insErr } = await supabase.from("vat_transactions").insert(rows);
      if (insErr) throw insErr;

      showToast(`Period ${pDef?.label} closed. ${rows.length} calculated rows written.`);
      setCloseModal(null); fetchAll();
    } catch (e) { showToast("Period close failed: " + e.message, "error"); }
    finally { setClosing(false); }
  };

  // ── Export ───────────────────────────────────────────────────
  const exportVAT201 = () => {
    const p = selectedPeriodDef;
    const rows = [
      ["VAT201", vatConfig?.trading_name || ""], ["VAT No", vatConfig?.vat_number || ""],
      ["Period", p?.label || ""], ["Due", p?.dueDate || ""], [],
      ["FIELD", "DESCRIPTION", "ZAR"],
      ["1",  "Supplies excl VAT",  current.exclusiveRev.toFixed(2)],
      ["4",  "Supplies incl VAT",  current.inclusiveRev.toFixed(2)],
      ["12", "Output tax",         current.outputVat.toFixed(2)],
      ["16", "Input tax",          current.inputVat.toFixed(2)],
      ["20", "Net VAT",            current.netVat.toFixed(2)], [],
      ["TRANSACTIONS"], ["Date", "Description", "Type", "Output", "Input", "Source"],
      ...current.txnList.map(t => [
        t.transaction_date, t.description, t.transaction_type,
        (parseFloat(t.output_vat) || 0).toFixed(2), (parseFloat(t.input_vat) || 0).toFixed(2), t.source || "manual",
      ]),
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `VAT201-${selectedPeriod}.csv`; a.click();
    showToast("Exported.");
  };

  const card = { background: "#fff", borderRadius: 12, boxShadow: D.shadow, overflow: "hidden", marginBottom: 20 };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: D.ink500, fontFamily: D.font }}>Loading VAT...</div>;
  if (!vatConfig?.vat_registered) return (
    <div style={{ fontFamily: D.font }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: D.ink900 }}>VAT</h2>
      <div style={{ padding: "40px 32px", background: D.warningLight, border: `1px solid ${D.warningBd}`, borderRadius: 12, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83E\uDDFE"}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: D.warning, marginBottom: 6 }}>VAT not registered</div>
        <div style={{ fontSize: 13, color: D.ink500 }}>Update Financial Setup if recently registered with SARS.</div>
      </div>
    </div>
  );

  // ── Filing Modal ─────────────────────────────────────────────
  const FilingModalEl = filingModal && (
    <Overlay>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: D.font }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: D.ink900 }}>Mark VAT201 as Filed</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: D.ink500 }}>Period: <strong>{periods.find(p => p.id === filingModal)?.label}</strong></p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: D.ink700, marginBottom: 6 }}>SARS eFiling Reference (optional)</label>
          <input value={submissionRef} onChange={e => setSubmissionRef(e.target.value)} placeholder="e.g. REF-20260509-001234"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `1px solid ${D.border}`, borderRadius: 8, fontSize: 13, fontFamily: D.font, outline: "none" }} />
          <p style={{ margin: "6px 0 0", fontSize: 11, color: D.ink500 }}>Leave blank if not yet available. Can be updated by re-clicking Mark Filed.</p>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => { setFilingModal(null); setSubmissionRef(""); }} style={{ padding: "9px 18px", border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff", color: D.ink500, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: D.font }}>Cancel</button>
          <button onClick={confirmFiled} style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: D.success, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}>{"\u2713"} Confirm Filed</button>
        </div>
      </div>
    </Overlay>
  );

  // ── Period Close Modal ────────────────────────────────────────
  const outputMatch        = closeModal && Math.abs(closeModal.calcOutputVat - closeModal.storedOutputVat) < 0.02;
  const inputZero          = closeModal && closeModal.calcInputVat === 0;
  const storedInputChanges = closeModal && Math.abs(closeModal.storedInputVat - closeModal.calcInputVat) > 0.01;

  const CloseModalEl = closeModal && (
    <Overlay>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: D.font, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: D.ink900 }}>Period Close — {periods.find(p => p.id === closeModal.periodId)?.label}</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: D.ink500 }}>Calculates VAT from source tables. Replaces {closeModal.seededRowCount} seeded row{closeModal.seededRowCount !== 1 ? "s" : ""} with 2 calculated rows.</p>

        <div style={{ background: D.bg, borderRadius: 10, padding: 16, marginBottom: 12, border: `1px solid ${D.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Output VAT (from orders)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Orders", closeModal.calcOrderCount], ["Total incl.", fmtZar(closeModal.totalIncl)], ["Calculated output VAT", fmtZar(closeModal.calcOutputVat)], ["Stored (will be replaced)", fmtZar(closeModal.storedOutputVat)]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 10, color: D.ink500, marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 700, color: D.ink700 }}>{v}</div></div>
            ))}
          </div>
          {outputMatch && <div style={{ marginTop: 10, padding: "6px 10px", background: D.successLight, border: `1px solid ${D.successBd}`, borderRadius: 6, fontSize: 12, color: D.success, fontWeight: 600 }}>{"\u2713"} Calculated matches stored — output VAT figure unchanged</div>}
          {closeModal.calcOrderCount === 0 && <div style={{ marginTop: 10, padding: "6px 10px", background: D.warningLight, border: `1px solid ${D.warningBd}`, borderRadius: 6, fontSize: 12, color: D.warning }}>{"\u26A0"} No orders found for this period. Output VAT will be written as R0.</div>}
        </div>

        <div style={{ background: inputZero ? D.warningLight : D.bg, borderRadius: 10, padding: 16, marginBottom: 12, border: `1px solid ${inputZero ? D.warningBd : D.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Input VAT (from expenses)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Expenses", closeModal.calcExpenseCount], ["Calculated input VAT", fmtZar(closeModal.calcInputVat)], ["Stored (will be replaced)", fmtZar(closeModal.storedInputVat)]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 10, color: D.ink500, marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 700, color: D.ink700 }}>{v}</div></div>
            ))}
          </div>
          {inputZero && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, fontSize: 12, color: "#C2410C", lineHeight: 1.6 }}>
              <strong>{"\u26A0"} Input VAT = R0.</strong> All {totalExpenses} expenses have input_vat_amount = 0.<br />Smart Capture must populate this field before input VAT is accurate.
              {storedInputChanges && <span style={{ display: "block", marginTop: 6, color: D.danger }}><strong>This will replace stored input VAT of {fmtZar(closeModal.storedInputVat)} with R0.</strong> The stored figure is manually seeded and not derived from source data.</span>}
            </div>
          )}
        </div>

        <div style={{ padding: "10px 14px", background: D.infoLight, border: `1px solid ${D.infoBd}`, borderRadius: 8, fontSize: 12, color: D.info, marginBottom: 20, lineHeight: 1.6 }}>
          <strong>Sandbox mode:</strong> Source data is test/seeded. Period Close is fully functional but operates on simulated data. In production this would be locked post-filing.
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setCloseModal(null)} style={{ padding: "9px 18px", border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff", color: D.ink500, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: D.font }}>Cancel</button>
          <button onClick={confirmClose} disabled={closing} style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: closing ? "#9CA3AF" : D.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: closing ? "not-allowed" : "pointer", fontFamily: D.font }}>
            {closing ? "Closing..." : "Confirm Period Close"}
          </button>
        </div>
      </div>
    </Overlay>
  );

  // ── VAT201 VIEW ───────────────────────────────────────────────
  if (view === "vat201") {
    const p       = selectedPeriodDef;
    const filing  = filingMap[selectedPeriod];
    const isFiled = !!filing;
    const overdue = isOverdue(p?.dueDate) && !isFiled;
    const hasDataGap = current.outputVat === 0 && current.inputVat > 0 && oStatsForSelected.count === 0;
    const outputVerified = oStatsForSelected.count > 0 && Math.abs(oStatsForSelected.outputVat - current.outputVat) < 0.02;

    return (
      <div style={{ fontFamily: D.font, color: D.ink700 }}>
        {FilingModalEl}{CloseModalEl}
        {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? D.danger : D.accent, color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{toast.msg}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={() => setView("dashboard")} style={{ padding: "7px 14px", border: `1px solid ${D.border}`, borderRadius: 8, background: "#fff", color: D.ink500, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: D.font }}>{"\u2190"} Dashboard</button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: D.ink900 }}>VAT201 — {p?.label}</h2>
          {isFiled && <span style={{ padding: "3px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: D.successLight, color: D.success, border: `1px solid ${D.successBd}` }}>{"\u2713"} Filed</span>}
          {overdue && <span style={{ padding: "3px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: D.dangerLight, color: D.danger, border: `1px solid ${D.dangerBd}` }}>{"\u26A0"} Overdue</span>}
          {isFiled && filing?.submission_ref && <span style={{ fontSize: 11, color: D.ink500 }}>Ref: {filing.submission_ref}</span>}
        </div>

        {hasDataGap && (
          <div style={{ padding: "12px 16px", background: D.warningLight, border: `1px solid ${D.warningBd}`, borderRadius: 10, marginBottom: 16, fontSize: 13, color: D.warning, lineHeight: 1.7 }}>
            <strong>{"\u26A0"} Data quality warning:</strong> This period shows zero output VAT because orders began 9 March 2026. Input VAT of {fmtZar(current.inputVat)} is manually seeded. Verify source documentation before submitting this as a SARS refund claim.
          </div>
        )}

        <div style={{ ...card, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            {[["Taxpayer", vatConfig?.trading_name || tenant?.name || "\u2014"], ["VAT No", vatConfig?.vat_number || "\u2014"], ["Period", p?.label || ""], ["Due", fmtDate(p?.dueDate)], ["Type", "Bi-Monthly"], ["Rate", `${((parseFloat(vatConfig?.vat_rate) || 0.15) * 100).toFixed(0)}%`], ["Address", vatConfig?.registered_address || "See Setup"], ["Status", isFiled ? "Filed" : overdue ? "Overdue" : "Open"]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 10, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, color: D.ink700 }}>{v}</div></div>
            ))}
          </div>
        </div>

        <div style={card}>
          <SHead label="Output Tax" icon={"\uD83D\uDCE4"} />
          <VAT201Row field="1"  label="Supplies excl. VAT"    value={fmtZar(current.exclusiveRev)} note="Revenue excluding VAT" />
          <VAT201Row field="4"  label="Supplies incl. VAT"    value={fmtZar(current.inclusiveRev)} note="Total received including VAT" />
          <VAT201Row field="12" label="Output tax (15%)"      value={fmtZar(current.outputVat)}    highlight note={`${fmtZar(current.exclusiveRev)} \u00d7 15%`} />
          <SHead label="Input Tax" icon={"\uD83D\uDCE5"} />
          <VAT201Row field="16" label="Input tax on purchases" value={fmtZar(current.inputVat)} note="VAT paid on business purchases" />
          <SHead label="Net Position" icon={"\u2696\uFE0F"} />
          <div style={{ padding: "20px", background: current.netVat >= 0 ? D.dangerLight : D.successLight, borderTop: `2px solid ${current.netVat >= 0 ? D.dangerBd : D.successBd}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 160px", alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: current.netVat >= 0 ? D.danger : D.success, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>20</div>
              <div style={{ paddingLeft: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: current.netVat >= 0 ? D.danger : D.success }}>{current.netVat >= 0 ? "Net Payable to SARS" : "Net Refund from SARS"}</div>
                <div style={{ fontSize: 12, color: D.ink500, marginTop: 2 }}>Field 12 ({fmtZar(current.outputVat)}) − Field 16 ({fmtZar(current.inputVat)})</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: current.netVat >= 0 ? D.danger : D.success, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {current.netVat < 0 ? `(${fmtZar(Math.abs(current.netVat))})` : fmtZar(current.netVat)}
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <SHead label="Data Sources" icon={"\uD83D\uDD0D"} />
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 12, borderBottom: `1px solid ${D.border}` }}>
              <div style={{ width: 68, fontSize: 11, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2, flexShrink: 0 }}>Output</div>
              {oStatsForSelected.count > 0 ? (
                <div style={{ fontSize: 12, color: D.ink700, lineHeight: 1.7 }}>
                  <span style={{ color: D.success, fontWeight: 700 }}>{"\u2713"} Verified</span> — {oStatsForSelected.count} paid orders · {fmtZar(oStatsForSelected.totalIncl)} incl · calculated output VAT {fmtZar(oStatsForSelected.outputVat)}
                  {outputVerified && <span style={{ color: D.success, fontWeight: 600 }}> — matches stored {"\u2713"}</span>}
                  <span style={{ marginLeft: 6 }}><SourceBadge source={current.hasCalculated ? "calculated" : current.hasSeeded ? "seeded" : null} /></span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: D.warning }}><strong>{"\u26A0"} No paid orders</strong> found for this period in the orders table.</div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 68, fontSize: 11, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2, flexShrink: 0 }}>Input</div>
              {(() => {
                const totalIn = (expensesInputVat || 0) + (receiptsInputVat || 0);
                if (totalIn > 0) {
                  return (
                    <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.8 }}>
                      <span style={{ fontWeight: 700 }}>{"\u2713"} Total input VAT captured: {fmtZar(totalIn)}</span>
                      {(expensesInputVat || 0) > 0 && (
                        <div style={{ color: D.ink500 }}>{"\u00b7"} Expenses: <strong>{fmtZar(expensesInputVat)}</strong></div>
                      )}
                      {(receiptsInputVat || 0) > 0 && (
                        <div style={{ color: D.ink500 }}>{"\u00b7"} Stock receipts: <strong>{fmtZar(receiptsInputVat)}</strong></div>
                      )}
                    </div>
                  );
                }
                return (
                  <div style={{ fontSize: 12, color: D.warning, lineHeight: 1.7 }}>
                    <strong>{"\u26A0"} No input VAT captured yet.</strong>{" "}
                    <span style={{ color: D.ink500 }}>Add VAT amounts in Expenses Manager or on stock deliveries, or use Smart Capture to read them from supplier invoices automatically.</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {current.txnList.length > 0 && (
          <div style={card}>
            <SHead label="Transactions This Period" icon={"\uD83D\uDCCB"} />
            {current.txnList.map(t => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", padding: "10px 20px", borderBottom: `1px solid ${D.border}`, alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: D.ink700 }}>{t.description}<SourceBadge source={t.source} /></div>
                  <div style={{ fontSize: 11, color: D.ink500 }}>{fmtDate(t.transaction_date)}</div>
                </div>
                <div style={{ fontSize: 12, color: D.success, fontWeight: 600, textAlign: "right" }}>{parseFloat(t.output_vat) > 0 ? fmtZar(t.output_vat) : ""}</div>
                <div style={{ fontSize: 12, color: D.info, fontWeight: 600, textAlign: "right" }}>{parseFloat(t.input_vat) > 0 ? fmtZar(t.input_vat) : ""}</div>
                <div style={{ fontSize: 11, color: D.ink300, textAlign: "right", textTransform: "uppercase" }}>{t.transaction_type}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={exportVAT201} style={{ padding: "10px 20px", border: `1px solid ${D.accentMid}`, borderRadius: 8, background: D.accentLight, color: D.accentMid, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}>{"\u2193"} Export CSV</button>
          {!isFiled && <button onClick={() => openFilingModal(selectedPeriod)} style={{ padding: "10px 20px", border: "none", borderRadius: 8, background: D.success, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}>{"\u2713"} Mark Filed</button>}
          {isFiled && <div style={{ padding: "10px 16px", background: D.successLight, border: `1px solid ${D.successBd}`, borderRadius: 8, fontSize: 13, color: D.success, fontWeight: 600 }}>{"\u2713"} Filed{filing?.filed_at ? ` · ${fmtDate(filing.filed_at)}` : ""}</div>}
          {!isFiled && <button onClick={() => openCloseModal(selectedPeriod)} style={{ padding: "10px 20px", border: `1px solid ${D.warningBd}`, borderRadius: 8, background: D.warningLight, color: D.warning, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}>{"\u26A1"} Period Close</button>}
        </div>

        <div style={{ marginTop: 20, background: D.bg, borderRadius: 8, padding: "14px 18px", fontSize: 12, color: D.ink500, border: `1px solid ${D.border}`, lineHeight: 1.7 }}>
          <strong style={{ color: D.ink700 }}>SARS VAT201:</strong> Submit by last business day of month following period end. Late submission attracts penalties. VAT No: <strong>{vatConfig?.vat_number}</strong>.
        </div>
      </div>
    );
  }

  // ── DASHBOARD — YTD from period sums (T23: uses tenant_vat_periods RPC)
  const ytdOutput = Object.values(orderStats).reduce((s, p) => s + (p.outputVat || 0), 0);
  const ytdInput  = Object.values(expenseStats).reduce((s, p) => s + (p.totalInputVat || 0), 0) || (expensesInputVat || 0);
  const ytdNet    = ytdOutput - ytdInput;

  return (
    <div style={{ fontFamily: D.font, color: D.ink700 }}>
      {FilingModalEl}{CloseModalEl}
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? D.danger : D.accent, color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: D.ink900, letterSpacing: "-0.02em" }}>VAT</h2>
          <p style={{ margin: "4px 0 0", color: D.ink500, fontSize: 13 }}>VAT201 returns · output & input tax · SARS filing</p>
        </div>
        <div style={{ padding: "7px 14px", background: D.accentLight, border: `1px solid ${D.accentMid}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: D.accentMid }}>VAT No: {vatConfig?.vat_number} · Bi-Monthly · 15%</div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <KPICard label="YTD Output VAT" value={fmtZar(ytdOutput)} sub="Collected"         color={D.success} icon={"\uD83D\uDCE4"} />
        <KPICard label="YTD Input VAT"  value={fmtZar(ytdInput)}  sub="Paid on purchases" color={D.info}    icon={"\uD83D\uDCE5"} />
        <KPICard label={ytdNet >= 0 ? "YTD Payable" : "YTD Refund"} value={fmtZar(ytdNet)} sub={ytdNet >= 0 ? "Owed to SARS" : "Due from SARS"} color={ytdNet >= 0 ? D.danger : D.success} icon={ytdNet >= 0 ? "\u2191" : "\u2193"} highlight={ytdNet >= 0 ? D.dangerLight : D.successLight} />
        <KPICard label="Filed" value={`${filings.length}/${periods.length}`} sub="This year" color={D.accentMid} icon={"\u2713"} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Bi-Monthly Periods — {new Date().getFullYear()}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {periods.map(p => {
            const pd       = periodData(p.id);
            const filing   = filingMap[p.id];
            const isFiled  = !!filing;
            const overdue  = isOverdue(p.dueDate) && !isFiled;
            const isCurrent = p.id === currentPeriodId();
            const isSelected = p.id === selectedPeriod;
            const hasDataGap = pd.outputVat === 0 && pd.inputVat > 0 && !(orderStats[p.id]?.count > 0);
            return (
              <button key={p.id} onClick={() => setSelectedPeriod(p.id)}
                style={{ padding: "12px 16px", borderRadius: 10, cursor: "pointer", border: `2px solid ${isSelected ? D.accent : overdue ? D.dangerBd : isFiled ? D.successBd : D.border}`, background: isSelected ? D.accentLight : overdue ? D.dangerLight : isFiled ? D.successLight : "#fff", textAlign: "left", fontFamily: D.font, minWidth: 140, transition: "all 0.15s" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? D.accent : D.ink700, marginBottom: 4 }}>
                  {p.label}{isCurrent && <span style={{ marginLeft: 6, fontSize: 10, color: D.info, fontWeight: 600 }}>CURRENT</span>}
                </div>
                <div style={{ fontSize: 11, color: D.ink500, marginBottom: 6 }}>Due: {fmtDate(p.dueDate)}</div>
                {pd.count > 0
                  ? <div style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: pd.netVat >= 0 ? D.danger : D.success }}>{pd.netVat >= 0 ? "Pay " : "Refund "}{fmtZar(Math.abs(pd.netVat))}</div>
                  : <div style={{ fontSize: 11, color: D.ink300 }}>No transactions</div>}
                {isFiled  && <div style={{ fontSize: 10, fontWeight: 700, color: D.success, marginTop: 4 }}>{"\u2713"} Filed{filing?.submission_ref ? " · " + filing.submission_ref.slice(0, 14) + (filing.submission_ref.length > 14 ? "..." : "") : ""}</div>}
                {overdue && !isFiled && <div style={{ fontSize: 10, fontWeight: 700, color: D.danger, marginTop: 4 }}>{"\u26A0"} Overdue</div>}
                {hasDataGap && <div style={{ fontSize: 10, color: D.warning, marginTop: 4 }}>{"\u26A0"} Data gap</div>}
                {pd.hasCalculated && <SourceBadge source="calculated" />}
                {!pd.hasCalculated && pd.hasSeeded && <SourceBadge source="seeded" />}
              </button>
            );
          })}
        </div>
      </div>

      <div style={card}>
        <SHead label={`Period — ${selectedPeriodDef?.label}`} icon={"\uD83D\uDCCA"} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
          {[
            ["Output VAT", fmtZar(current.outputVat), D.success, "Field 12"],
            ["Input VAT",  fmtZar(current.inputVat),  D.info,    "Field 16"],
            [current.netVat >= 0 ? "Net Payable" : "Net Refund", fmtZar(Math.abs(current.netVat)), current.netVat >= 0 ? D.danger : D.success, "Field 20"],
          ].map(([l, v, c, note], i) => (
            <div key={l} style={{ padding: "20px 24px", borderRight: i < 2 ? `1px solid ${D.border}` : "none", borderBottom: `1px solid ${D.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: D.ink500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{l}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              <div style={{ fontSize: 11, color: D.ink500, marginTop: 6 }}>{note}</div>
            </div>
          ))}
        </div>
        {current.outputVat === 0 && current.inputVat > 0 && oStatsForSelected.count === 0 && (
          <div style={{ padding: "12px 20px", background: D.warningLight, borderTop: `1px solid ${D.warningBd}` }}>
            <div style={{ fontSize: 12, color: D.warning, lineHeight: 1.6 }}>
              <strong>{"\u26A0"} Data quality:</strong> Zero output VAT but input VAT of {fmtZar(current.inputVat)} is seeded. No orders exist for this period. Verify expense documentation before submitting a SARS refund claim.
            </div>
          </div>
        )}
        {current.count === 0 && <div style={{ padding: "28px 20px", textAlign: "center", color: D.ink300, fontSize: 13 }}>No VAT transactions this period</div>}
        <div style={{ padding: "16px 20px", display: "flex", gap: 10, flexWrap: "wrap", borderTop: `1px solid ${D.border}` }}>
          <button onClick={() => setView("vat201")} style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: D.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}>{"\uD83D\uDCCB"} View VAT201</button>
          <button onClick={exportVAT201} style={{ padding: "9px 18px", border: `1px solid ${D.accentMid}`, borderRadius: 8, background: D.accentLight, color: D.accentMid, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}>{"\u2193"} Export CSV</button>
          {!filingMap[selectedPeriod] && current.count > 0 && <button onClick={() => openFilingModal(selectedPeriod)} style={{ padding: "9px 18px", border: `1px solid ${D.successBd}`, borderRadius: 8, background: D.successLight, color: D.success, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}>{"\u2713"} Mark Filed</button>}
          {filingMap[selectedPeriod] && <div style={{ padding: "9px 16px", background: D.successLight, border: `1px solid ${D.successBd}`, borderRadius: 8, fontSize: 13, color: D.success, fontWeight: 600 }}>{"\u2713"} Filed · {fmtDate(filingMap[selectedPeriod].filed_at)}</div>}
          <button onClick={() => openCloseModal(selectedPeriod)} style={{ padding: "9px 18px", border: `1px solid ${D.warningBd}`, borderRadius: 8, background: D.warningLight, color: D.warning, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}>{"\u26A1"} Period Close</button>
          <button
            onClick={async () => {
              const to = window.prompt("Email VAT period summary to:", "admin@protea.dev");
              if (!to) return;
              const p = periods.find((x) => x.id === selectedPeriod);
              const res = await sendVatReminderEmail({
                tenantId,
                recipient: { email: to },
                data: {
                  period: p?.label || selectedPeriod,
                  close_date: p?.dueDate || "",
                  output_vat: current.outputVat,
                  input_vat: current.inputVat,
                  net_vat: current.netVat,
                },
              });
              if (res.skipped) showToast(`Skipped (cooldown ${res.cooldown_hours}h)`, "warn");
              else if (!res.ok) showToast(`Email failed: ${res.error}`, "error");
              else showToast(`VAT reminder sent to ${to}`);
            }}
            style={{ padding: "9px 18px", border: `1px solid ${D.infoBd}`, borderRadius: 8, background: D.infoLight, color: D.info, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: D.font }}
          >
            {"\uD83D\uDCE7"} Email Reminder
          </button>
        </div>
      </div>

      <div style={{ background: D.bg, borderRadius: 8, padding: "14px 18px", fontSize: 12, color: D.ink500, border: `1px solid ${D.border}`, lineHeight: 1.7 }}>
        <strong style={{ color: D.ink700 }}>VAT policy:</strong> Output VAT on invoice basis. Input VAT claimed on qualifying purchases. Bi-monthly vendor (6 returns/year). Rate: 15%. Submit via SARS eFiling by last business day of month following period end.
      </div>
    </div>
  );
}
