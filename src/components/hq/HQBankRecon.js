// src/components/hq/HQBankRecon.js
// WP-FINANCIALS Phase 7 — Bank Reconciliation
// v1.0 · 08 Apr 2026
// Schema verified · LL-205 applied · LL-206 pattern · additive only

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useTenant } from '../../services/tenantService';
import { T } from "../../styles/tokens";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const MATCH_CFG = {
  order:          { label: 'POS / ORDER',    bg: '#dcfce7', color: '#15803d' },
  expense:        { label: 'EXPENSE',         bg: '#fef3c7', color: '#b45309' },
  purchase_order: { label: 'PURCHASE ORDER',  bg: '#dbeafe', color: '#1d4ed8' },
  journal:        { label: 'JOURNAL',         bg: '#f3e8ff', color: '#7c3aed' },
  unmatched:      { label: 'UNMATCHED',       bg: '#fee2e2', color: '#b91c1c' },
  other:          { label: 'OTHER',           bg: '#f3f4f6', color: '#6b7280' },
  opening:        { label: 'OPENING BAL',     bg: '#f0f9ff', color: '#0369a1' },
};

const MATCH_OPTIONS = [
  { value: 'order',          label: 'POS / Order settlement' },
  { value: 'expense',        label: 'Expense payment' },
  { value: 'purchase_order', label: 'Supplier / PO payment' },
  { value: 'journal',        label: 'Journal entry' },
  { value: 'other',          label: 'Other / Non-recurring' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `R${Number(n || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) : '\u2014';

const matchCfg = (type, ref) => {
  if (!type && ref === 'OB-MAR') return MATCH_CFG.opening;
  return MATCH_CFG[type] || MATCH_CFG.other;
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function HQBankRecon() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [account,  setAccount]  = useState(null);
  const [lines,    setLines]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Filters
  const [fMatch, setFMatch]   = useState('all');
  const [fType,  setFType]    = useState('all');
  const [fBatch, setFBatch]   = useState('all');

  // Inline match edit
  const [editingId,  setEditingId]  = useState(null);
  const [editType,   setEditType]   = useState('');
  const [saving,     setSaving]     = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [accRes, linesRes] = await Promise.all([
        supabase
          .from('bank_accounts')
          .select('id, bank_name, account_name, account_number, account_type, currency, opening_balance, is_primary')
          .eq('tenant_id', tenantId)
          .eq('is_primary', true)
          .single(),
        supabase
          .from('bank_statement_lines')
          .select('id, bank_account_id, statement_date, description, reference, debit_amount, credit_amount, balance, matched_type, matched_id, matched_at, import_batch')
          .eq('tenant_id', tenantId)
          .order('statement_date', { ascending: true })
          .order('created_at', { ascending: true }),
      ]);

      if (accRes.error && accRes.error.code !== 'PGRST116') throw accRes.error;
      if (linesRes.error) throw linesRes.error;

      setAccount(accRes.data || null);
      setLines(linesRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load bank data');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const openingBalance = account?.opening_balance ? Number(account.opening_balance) : 0;

  const txLines = lines.filter(l => !(Number(l.debit_amount) === 0 && Number(l.credit_amount) === 0));

  const totalCredits = txLines.reduce((s, l) => s + Number(l.credit_amount || 0), 0);
  const totalDebits  = txLines.reduce((s, l) => s + Number(l.debit_amount  || 0), 0);
  const calcClosing  = openingBalance + totalCredits - totalDebits;

  const sortedByDate = [...lines].sort((a, b) => new Date(a.statement_date) - new Date(b.statement_date));
  const lastLine     = sortedByDate[sortedByDate.length - 1];
  const stmtClosing  = lastLine?.balance ? Number(lastLine.balance) : null;
  const reconciled   = stmtClosing !== null && Math.abs(calcClosing - stmtClosing) < 0.05;

  const unmatchedLines = lines.filter(l => l.matched_type === 'unmatched');
  const unmatchedValue = unmatchedLines.reduce(
    (s, l) => s + Number(l.debit_amount || 0) + Number(l.credit_amount || 0), 0
  );

  const matchedCount   = lines.filter(l => l.matched_type && l.matched_type !== 'unmatched').length;
  const unmatchedCount = unmatchedLines.length;

  const batches = [...new Set(lines.map(l => l.import_batch).filter(Boolean))].sort();

  const filtered = lines.filter(l => {
    if (fMatch === 'matched'   && (l.matched_type === 'unmatched' || !l.matched_type)) return false;
    if (fMatch === 'unmatched' && l.matched_type !== 'unmatched') return false;
    if (fType  !== 'all'       && l.matched_type !== fType) return false;
    if (fBatch !== 'all'       && l.import_batch !== fBatch) return false;
    return true;
  });

  // ── Save match type ────────────────────────────────────────────────────────

  async function saveMatch(lineId) {
    if (!editType) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bank_statement_lines')
        .update({
          matched_type: editType,
          matched_at:   new Date().toISOString(),
        })
        .eq('id', lineId);
      if (error) throw error;
      setEditingId(null);
      setEditType('');
      await fetchAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
      <span style={{ fontSize: 14, color: '#6b7280' }}>Loading bank reconciliation{"\u2026"}</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: '#b91c1c', fontSize: 14 }}>{"\u26A0\uFE0F"} {error}</div>
  );

  if (!account) return (
    <div style={S.center}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83C\uDFE6"}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 8 }}>No bank account configured</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Add a primary bank account in the Financial Setup Wizard.</div>
      </div>
    </div>
  );

  return (
    <div style={S.root}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Bank Reconciliation</h2>
          <p style={S.subtitle}>WP-FINANCIALS Phase 7 {"\u00b7"} Cash at Bank verified for Balance Sheet {"\u00b7"} Schema verified 08 Apr 2026</p>
        </div>
        <button style={S.btnRefresh} onClick={fetchAll}>{"\u21BA"} Refresh</button>
      </div>

      {/* ── ACCOUNT CARD ───────────────────────────────────────────────── */}
      <div style={S.accountCard}>
        <div style={S.accountLeft}>
          <div style={S.bankBadge}>{account.bank_name}</div>
          <div style={S.accountName}>{account.account_name}</div>
          <div style={S.accountMeta}>{account.account_number} {"\u00b7"} {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} {"\u00b7"} {account.currency}</div>
        </div>
        <div style={S.accountRight}>
          <div style={S.balanceLabel}>VERIFIED CLOSING BALANCE</div>
          <div style={S.balanceValue}>{fmt(stmtClosing ?? calcClosing)}</div>
          <div style={{ ...S.reconBadge, background: reconciled ? '#dcfce7' : '#fef9c3', color: reconciled ? '#15803d' : '#b45309' }}>
            {reconciled
              ? '\u2713 Reconciled \u2014 Cash at Bank confirmed for Balance Sheet'
              : `\u26A0 Difference of ${fmt(Math.abs(calcClosing - (stmtClosing ?? 0)))} \u2014 review unmatched items`}
          </div>
        </div>
      </div>

      {/* ── STATS STRIP ────────────────────────────────────────────────── */}
      <div style={S.statsRow}>
        {[
          { label: 'OPENING BALANCE',  val: fmt(openingBalance),  color: '#374151' },
          { label: 'TOTAL IN (CREDITS)', val: fmt(totalCredits), color: '#15803d' },
          { label: 'TOTAL OUT (DEBITS)', val: fmt(totalDebits),  color: '#b91c1c' },
          { label: 'CLOSING BALANCE',  val: fmt(calcClosing),    color: '#1d4ed8' },
          { label: 'UNMATCHED',        val: `${unmatchedCount} items \u00b7 ${fmt(unmatchedValue)}`, color: '#b91c1c', wide: true },
        ].map(s => (
          <div key={s.label} style={{ ...S.statCard, flex: s.wide ? 1.8 : 1 }}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statVal, color: s.color, fontSize: s.wide ? 14 : 20 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── FILTERS ────────────────────────────────────────────────────── */}
      <div style={S.filterBar}>
        <div style={S.filterGroup}>
          <span style={S.filterLabel}>SHOW</span>
          {[
            { v: 'all',        l: `All (${lines.length})` },
            { v: 'matched',    l: `Matched (${matchedCount})` },
            { v: 'unmatched',  l: `Unmatched (${unmatchedCount})` },
          ].map(o => (
            <button key={o.v} style={{ ...S.chip, ...(fMatch === o.v ? S.chipActive : {}) }} onClick={() => setFMatch(o.v)}>{o.l}</button>
          ))}
        </div>
        <div style={S.filterGroup}>
          <span style={S.filterLabel}>TYPE</span>
          {['all', 'order', 'expense', 'purchase_order', 'unmatched'].map(v => (
            <button key={v} style={{ ...S.chip, ...(fType === v ? S.chipActive : {}) }} onClick={() => setFType(v)}>
              {v === 'all' ? 'All' : MATCH_CFG[v]?.label || v}
            </button>
          ))}
        </div>
        {batches.length > 1 && (
          <div style={S.filterGroup}>
            <span style={S.filterLabel}>BATCH</span>
            {['all', ...batches].map(v => (
              <button key={v} style={{ ...S.chip, ...(fBatch === v ? S.chipActive : {}) }} onClick={() => setFBatch(v)}>
                {v === 'all' ? 'All Batches' : v}
              </button>
            ))}
          </div>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>{filtered.length} of {lines.length} lines</span>
      </div>

      {/* ── STATEMENT TABLE ────────────────────────────────────────────── */}
      <div style={S.tableWrap}>
        <div style={S.thead}>
          <span style={{ ...S.th, flex: 1.2 }}>DATE</span>
          <span style={{ ...S.th, flex: 1.5 }}>REFERENCE</span>
          <span style={{ ...S.th, flex: 3.5 }}>DESCRIPTION</span>
          <span style={{ ...S.th, flex: 1.2 }}>TYPE</span>
          <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>DEBIT (OUT)</span>
          <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>CREDIT (IN)</span>
          <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>BALANCE</span>
          <span style={{ ...S.th, flex: 1.2, textAlign: 'center' }}>MATCH</span>
        </div>

        {filtered.map(line => {
          const isEditing   = editingId === line.id;
          const cfg         = matchCfg(line.matched_type, line.reference);
          const isUnmatched = line.matched_type === 'unmatched';

          return (
            <div key={line.id} style={{ ...S.lineRow, background: isUnmatched ? '#fffbeb' : '#fff', borderLeft: isUnmatched ? '3px solid #f59e0b' : '3px solid transparent' }}>
              <span style={{ ...S.td, flex: 1.2, color: '#374151', fontWeight: 500 }}>{fmtDate(line.statement_date)}</span>
              <span style={{ ...S.td, flex: 1.5, fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{line.reference || '\u2014'}</span>
              <span style={{ ...S.td, flex: 3.5, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {line.description}
                {line.import_batch && <span style={S.batchPill}>{line.import_batch}</span>}
              </span>
              <span style={{ ...S.td, flex: 1.2 }}><span style={{ ...S.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span></span>
              <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: Number(line.debit_amount) > 0 ? '#b91c1c' : '#d1d5db' }}>
                {Number(line.debit_amount) > 0 ? fmt(line.debit_amount) : '\u2014'}
              </span>
              <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: Number(line.credit_amount) > 0 ? '#15803d' : '#d1d5db' }}>
                {Number(line.credit_amount) > 0 ? fmt(line.credit_amount) : '\u2014'}
              </span>
              <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#374151' }}>
                {line.balance ? fmt(line.balance) : '\u2014'}
              </span>
              <span style={{ ...S.td, flex: 1.2, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                {isEditing ? (
                  <div style={S.matchEdit}>
                    <select style={S.matchSelect} value={editType} onChange={e => setEditType(e.target.value)} autoFocus>
                      <option value="">Select{"\u2026"}</option>
                      {MATCH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button style={S.btnSave} onClick={() => saveMatch(line.id)} disabled={!editType || saving}>{saving ? '\u2026' : '\u2713'}</button>
                    <button style={S.btnCancel} onClick={() => { setEditingId(null); setEditType(''); }}>{"\u2715"}</button>
                  </div>
                ) : isUnmatched ? (
                  <button style={S.btnMatch} onClick={() => { setEditingId(line.id); setEditType(''); }}>Categorise</button>
                ) : (
                  <button style={S.btnReCat} onClick={() => { setEditingId(line.id); setEditType(line.matched_type || ''); }}>Edit</button>
                )}
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{"\uD83C\uDFE6"}</div>
            <div style={{ fontWeight: 600, color: '#374151' }}>No lines match the current filter</div>
          </div>
        )}
      </div>

      {/* ── UNMATCHED SUMMARY ──────────────────────────────────────────── */}
      {unmatchedCount > 0 && (
        <div style={S.unmatchedSummary}>
          <div style={S.unmatchedTitle}>{"\u26A0\uFE0F"} {unmatchedCount} Unmatched Item{unmatchedCount > 1 ? 's' : ''} Require Attention</div>
          <div style={S.unmatchedList}>
            {unmatchedLines.map(l => (
              <div key={l.id} style={S.unmatchedItem}>
                <span style={{ color: '#374151', fontWeight: 500 }}>{fmtDate(l.statement_date)}</span>
                <span style={{ color: '#6b7280' }}>{l.description}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: Number(l.debit_amount) > 0 ? '#b91c1c' : '#15803d' }}>
                  {Number(l.debit_amount) > 0 ? `\u2212${fmt(l.debit_amount)}` : `+${fmt(l.credit_amount)}`}
                </span>
                <button style={S.btnMatchSm} onClick={() => { setEditingId(l.id); setEditType(''); setFMatch('all'); }}>Categorise {"\u2192"}</button>
              </div>
            ))}
          </div>
          <div style={S.unmatchedNote}>Once all items are categorised, the Balance Sheet Cash figure is fully verified.</div>
        </div>
      )}

      {/* ── BALANCE SHEET NOTE ─────────────────────────────────────────── */}
      <div style={S.bsNote}>
        <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{"\uD83D\uDCCA"} Balance Sheet {"\u2014"} Cash at Bank</span>
        <span style={{ color: '#374151' }}>
          This reconciled closing balance of <strong>{fmt(stmtClosing ?? calcClosing)}</strong> is the verified Cash at Bank figure for the Statement of Financial Position.
          {!reconciled && ' \u26A0 Complete all matches above to fully verify.'}
        </span>
      </div>

    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

// WP-UNIFY: TK palette aliased to src/styles/tokens.js values
const TK = {
  ...T,
  ink200:  T.border,
  ink100:  T.bg,
  green:   T.success,
  greenLt: T.successLight,
  red:     T.danger,
  redLt:   T.dangerLight,
  blue:    T.info,
  blueLt:  T.infoLight,
  amber:   T.warning,
  amberLt: T.warningLight,
};

const S = {
  root: { padding: '24px 28px', maxWidth: 1440, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: TK.ink900 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 80, color: TK.ink500 },
  spinner: { width: 20, height: 20, border: `2px solid ${TK.ink300}`, borderTopColor: TK.blue, borderRadius: '50%', animation: 'spin 0.75s linear infinite' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: TK.ink900 },
  subtitle: { margin: '4px 0 0', fontSize: 12, color: TK.ink500 },
  btnRefresh: { background: '#fff', color: TK.ink700, border: `1px solid ${TK.ink300}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  accountCard: { background: '#fff', border: `1px solid ${TK.ink200}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  accountLeft: { display: 'flex', flexDirection: 'column', gap: 6 },
  bankBadge: { display: 'inline-block', background: TK.blueLt, color: TK.blue, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 20 },
  accountName: { fontSize: 18, fontWeight: 700, color: TK.ink900 },
  accountMeta: { fontSize: 13, color: TK.ink500, fontFamily: 'monospace' },
  accountRight: { textAlign: 'right' },
  balanceLabel: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em', marginBottom: 6 },
  balanceValue: { fontSize: 32, fontWeight: 800, color: TK.blue, fontVariantNumeric: 'tabular-nums', marginBottom: 8 },
  reconBadge: { fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, display: 'inline-block' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 20 },
  statCard: { background: '#fff', border: `1px solid ${TK.ink200}`, borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  statLabel: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em', marginBottom: 6 },
  statVal: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  filterBar: { display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em', marginRight: 2 },
  chip: { padding: '5px 13px', borderRadius: 20, border: `1px solid ${TK.ink300}`, background: '#fff', fontSize: 11, fontWeight: 600, color: TK.ink700, cursor: 'pointer' },
  chipActive: { background: TK.ink900, color: '#fff', borderColor: TK.ink900 },
  tableWrap: { background: '#fff', border: `1px solid ${TK.ink200}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  thead: { display: 'flex', gap: 8, padding: '10px 16px', background: TK.ink100, borderBottom: `1px solid ${TK.ink200}` },
  th: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em' },
  lineRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: `1px solid ${TK.ink100}`, transition: 'background 0.1s' },
  td: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' },
  badge: { fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' },
  batchPill: { fontSize: 9, fontWeight: 700, background: TK.ink100, color: TK.ink500, padding: '1px 6px', borderRadius: 10, marginLeft: 8, whiteSpace: 'nowrap', flexShrink: 0 },
  matchEdit: { display: 'flex', gap: 4, alignItems: 'center' },
  matchSelect: { fontSize: 11, padding: '3px 6px', borderRadius: 6, border: `1px solid ${TK.ink300}`, background: '#fff', maxWidth: 120 },
  btnSave: { background: TK.greenLt, color: TK.green, border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnCancel: { background: TK.ink100, color: TK.ink500, border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 12, cursor: 'pointer' },
  btnMatch: { background: TK.amberLt, color: TK.amber, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnReCat: { background: TK.ink100, color: TK.ink700, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  unmatchedSummary: { background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 12, padding: '16px 20px', marginBottom: 16 },
  unmatchedTitle: { fontWeight: 700, fontSize: 14, color: TK.amber, marginBottom: 12 },
  unmatchedList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  unmatchedItem: { display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #fde68a' },
  unmatchedNote: { fontSize: 12, color: TK.amber },
  btnMatchSm: { marginLeft: 'auto', background: TK.amber, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  bsNote: { background: TK.blueLt, border: '1px solid #93c5fd', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 },
  empty: { textAlign: 'center', padding: '40px 20px', color: TK.ink500 },
};
