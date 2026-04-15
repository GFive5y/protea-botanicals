// src/components/hq/HQJournals.js
// WP-FINANCIALS Phase 5 — Journal Entry Module
// v1.0 · 08 Apr 2026
// Schema verified: journal_date · journal_type · debit_amount · credit_amount · line_order
// COA: 40 accounts · 5 types · cannabis_retail template

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, X, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useTenant } from '../../services/tenantService';
import { T } from "../../styles/tokens";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  auto:           { label: 'AUTO-CAPTURE',  bg: '#e0f2fe', color: '#0369a1' },
  manual:         { label: 'MANUAL',        bg: '#ede9fe', color: '#6d28d9' },
  depreciation:   { label: 'DEPRECIATION',  bg: '#fef3c7', color: '#b45309' },
  accrual:        { label: 'ACCRUAL',       bg: '#dcfce7', color: '#15803d' },
  prepayment:     { label: 'PREPAYMENT',    bg: '#fce7f3', color: '#be185d' },
  year_end:       { label: 'YEAR-END',      bg: '#fee2e2', color: '#b91c1c' },
  vat_adjustment: { label: 'VAT ADJ',       bg: '#f3e8ff', color: '#7c3aed' },
  correction:     { label: 'CORRECTION',    bg: '#fff7ed', color: '#c2410c' },
};

const STATUS_CFG = {
  draft:    { label: 'DRAFT',    bg: '#fef9c3', color: '#854d0e' },
  posted:   { label: 'POSTED',   bg: '#dcfce7', color: '#15803d' },
  reversed: { label: 'REVERSED', bg: '#f3f4f6', color: '#6b7280' },
};

const COA_TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const COA_TYPE_LABELS = {
  asset: 'Assets', liability: 'Liabilities', equity: 'Equity',
  revenue: 'Revenue', expense: 'Expenses',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (n) => {
  if (n === null || n === undefined || n === '') return '\u2014';
  return `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : '\u2014';
const fmtDay  = (d) => d || '\u2014';

const genRef = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const r = Math.floor(Math.random() * 900 + 100);
  return `JNL-${d}-${r}`;
};

const currentFY = () => `FY${new Date().getFullYear()}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function HQJournals() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [journals,    setJournals]    = useState([]);
  const [coa,         setCoa]         = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // Filters
  const [fStatus, setFStatus] = useState('all');
  const [fType,   setFType]   = useState('all');
  const [fFY,     setFFY]     = useState('all');

  // UI state
  const [expanded,  setExpanded]  = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [draft,     setDraft]     = useState(null);
  const [mLoading,  setMLoading]  = useState(false);
  const [mError,    setMError]    = useState(null);
  const [confirm,   setConfirm]   = useState(null); // { type, journal }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [jeRes, coaRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select(`
            id, journal_date, reference, description, journal_type,
            status, financial_year, is_year_end_closing,
            created_by, posted_by, posted_at, created_at,
            journal_lines (
              id, line_order, account_code, account_name,
              debit_amount, credit_amount, description
            )
          `)
          .eq('tenant_id', tenantId)
          .order('journal_date', { ascending: false }),
        supabase
          .from('chart_of_accounts')
          .select('account_code, account_name, account_type, account_subtype')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('account_code'),
      ]);
      if (jeRes.error)  throw jeRes.error;
      if (coaRes.error) throw coaRes.error;
      setJournals(jeRes.data  || []);
      setCoa(coaRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load journals');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const stats = {
    total:       journals.length,
    draft:       journals.filter(j => j.status === 'draft').length,
    posted:      journals.filter(j => j.status === 'posted').length,
    reversed:    journals.filter(j => j.status === 'reversed').length,
    postedValue: journals
      .filter(j => j.status === 'posted')
      .reduce((sum, j) =>
        sum + (j.journal_lines || []).reduce((s, l) => s + Number(l.debit_amount || 0), 0), 0),
  };

  const fyOptions = [...new Set(journals.map(j => j.financial_year).filter(Boolean))].sort().reverse();

  const typeOptions = [...new Set(journals.map(j => j.journal_type).filter(Boolean))];

  const filtered = journals.filter(j => {
    if (fStatus !== 'all' && j.status !== fStatus) return false;
    if (fType   !== 'all' && j.journal_type !== fType) return false;
    if (fFY     !== 'all' && j.financial_year !== fFY) return false;
    return true;
  });

  const coaByType = COA_TYPE_ORDER.reduce((acc, t) => {
    acc[t] = coa.filter(a => a.account_type === t);
    return acc;
  }, {});

  // ── New Journal Modal ─────────────────────────────────────────────────────

  function openModal() {
    setDraft({
      description:    '',
      journal_date:   todayISO(),
      financial_year: currentFY(),
      reference:      genRef(),
      lines: [
        { line_order: 1, account_code: '', account_name: '', debit_amount: '', credit_amount: '', description: '' },
        { line_order: 2, account_code: '', account_name: '', debit_amount: '', credit_amount: '', description: '' },
      ],
    });
    setMError(null);
    setShowModal(true);
  }

  function updateLine(idx, field, value) {
    setDraft(prev => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      if (field === 'account_code') {
        const found = coa.find(a => a.account_code === value);
        if (found) lines[idx].account_name = found.account_name;
      }
      return { ...prev, lines };
    });
  }

  function addLine() {
    setDraft(prev => ({
      ...prev,
      lines: [...prev.lines, {
        line_order:     prev.lines.length + 1,
        account_code:   '',
        account_name:   '',
        debit_amount:   '',
        credit_amount:  '',
        description:    '',
      }],
    }));
  }

  function removeLine(idx) {
    setDraft(prev => ({
      ...prev,
      lines: prev.lines
        .filter((_, i) => i !== idx)
        .map((l, i) => ({ ...l, line_order: i + 1 })),
    }));
  }

  function getBalance() {
    if (!draft) return { dr: 0, cr: 0, ok: false };
    const dr = draft.lines.reduce((s, l) => s + (parseFloat(l.debit_amount)  || 0), 0);
    const cr = draft.lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
    return { dr, cr, ok: Math.abs(dr - cr) < 0.005 && dr > 0 };
  }

  async function persistJournal(status) {
    if (!draft.description.trim()) { setMError('Description is required.'); return false; }
    if (status === 'posted' && !getBalance().ok) {
      setMError('Journal is not balanced \u2014 Debits must equal Credits and be greater than zero.');
      return false;
    }
    setMLoading(true);
    setMError(null);
    try {
      const { data: je, error: jeErr } = await supabase
        .from('journal_entries')
        .insert({
          tenant_id:      tenantId,
          journal_date:   draft.journal_date,
          reference:      draft.reference,
          description:    draft.description.trim(),
          journal_type:   'manual',
          status,
          financial_year: draft.financial_year,
          ...(status === 'posted' ? { posted_at: new Date().toISOString() } : {}),
        })
        .select()
        .single();
      if (jeErr) throw jeErr;

      const validLines = draft.lines
        .filter(l => l.account_code)
        .map(l => ({
          journal_id:    je.id,
          tenant_id:     tenantId,
          line_order:    l.line_order,
          account_code:  l.account_code,
          account_name:  l.account_name,
          debit_amount:  parseFloat(l.debit_amount)  || 0,
          credit_amount: parseFloat(l.credit_amount) || 0,
          description:   l.description || null,
        }));

      if (validLines.length > 0) {
        const { error: lErr } = await supabase.from('journal_lines').insert(validLines);
        if (lErr) throw lErr;
      }

      setShowModal(false);
      await fetchAll();
      return true;
    } catch (err) {
      setMError(err.message);
      return false;
    } finally {
      setMLoading(false);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function postExisting(j) {
    const lines = j.journal_lines || [];
    const dr = lines.reduce((s, l) => s + Number(l.debit_amount  || 0), 0);
    const cr = lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0);
    if (Math.abs(dr - cr) > 0.005 || dr === 0) {
      alert(`Cannot post: journal is unbalanced (DR ${fmt(dr)} \u2260 CR ${fmt(cr)})`);
      return;
    }
    const { error } = await supabase
      .from('journal_entries')
      .update({ status: 'posted', posted_at: new Date().toISOString() })
      .eq('id', j.id);
    if (error) { alert(error.message); return; }
    await fetchAll();
    setConfirm(null);
  }

  async function reverseJournal(j) {
    const { data: revJE, error: rErr } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id:      tenantId,
        journal_date:   todayISO(),
        reference:      `REV-${(j.reference || j.id.slice(0, 8)).slice(0, 30)}`,
        description:    `REVERSAL OF: ${j.description}`,
        journal_type:   'manual',
        status:         'posted',
        financial_year: currentFY(),
        posted_at:      new Date().toISOString(),
      })
      .select()
      .single();
    if (rErr) { alert(rErr.message); return; }

    const flippedLines = (j.journal_lines || []).map(l => ({
      journal_id:    revJE.id,
      tenant_id:     tenantId,
      line_order:    l.line_order,
      account_code:  l.account_code,
      account_name:  l.account_name,
      debit_amount:  Number(l.credit_amount || 0),
      credit_amount: Number(l.debit_amount  || 0),
      description:   `[REV] ${l.description || ''}`.trim(),
    }));

    if (flippedLines.length > 0) {
      const { error: lErr } = await supabase.from('journal_lines').insert(flippedLines);
      if (lErr) { alert(lErr.message); return; }
    }

    await supabase
      .from('journal_entries')
      .update({ status: 'reversed' })
      .eq('id', j.id);

    await fetchAll();
    setConfirm(null);
  }

  async function deleteDraft(j) {
    if (j.status !== 'draft') return;
    await supabase.from('journal_lines').delete().eq('journal_id', j.id);
    await supabase.from('journal_entries').delete().eq('id', j.id);
    await fetchAll();
    setConfirm(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const bal = getBalance(); // eslint-disable-line no-unused-vars

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
      <span style={{ fontSize: 14, color: '#6b7280' }}>Loading journals{"\u2026"}</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: '#dc2626', fontSize: 14 }}>{"\u26A0\uFE0F"} {error}</div>
  );

  return (
    <div style={S.root}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Journal Entries</h2>
          <p style={S.subtitle}>
            Double-entry accounting ledger {"\u00b7"} WP-FINANCIALS Phase 5 {"\u00b7"} Schema verified 08 Apr 2026
          </p>
        </div>
        <button style={S.btnPrimary} onClick={openModal}>+ New Journal</button>
      </div>

      {/* ── STATS STRIP ────────────────────────────────────────────────────── */}
      <div style={S.statsRow}>
        {[
          { label: 'TOTAL',        val: stats.total,       color: '#374151' },
          { label: 'DRAFT',        val: stats.draft,       color: '#b45309' },
          { label: 'POSTED',       val: stats.posted,      color: '#15803d' },
          { label: 'REVERSED',     val: stats.reversed,    color: '#6b7280' },
          { label: 'POSTED VALUE', val: fmt(stats.postedValue), color: '#6d28d9', wide: true },
        ].map(s => (
          <div key={s.label} style={{ ...S.statCard, flex: s.wide ? 1.6 : 1 }}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statVal, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────────────────── */}
      <div style={S.filterBar}>
        <div style={S.filterGroup}>
          <span style={S.filterLabel}>STATUS</span>
          {['all', 'draft', 'posted', 'reversed'].map(v => (
            <button key={v} style={{ ...S.chip, ...(fStatus === v ? S.chipActive : {}) }} onClick={() => setFStatus(v)}>
              {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div style={S.filterGroup}>
          <span style={S.filterLabel}>TYPE</span>
          {['all', ...typeOptions].map(v => (
            <button key={v} style={{ ...S.chip, ...(fType === v ? S.chipActive : {}) }} onClick={() => setFType(v)}>
              {v === 'all' ? 'All' : (TYPE_CFG[v]?.label || v)}
            </button>
          ))}
        </div>
        {fyOptions.length > 0 && (
          <div style={S.filterGroup}>
            <span style={S.filterLabel}>YEAR</span>
            {['all', ...fyOptions].map(v => (
              <button key={v} style={{ ...S.chip, ...(fFY === v ? S.chipActive : {}) }} onClick={() => setFFY(v)}>
                {v === 'all' ? 'All Years' : v}
              </button>
            ))}
          </div>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>
          {filtered.length} of {journals.length} journal{journals.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── JOURNAL LIST ───────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83D\uDCD2"}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 8 }}>No journals found</div>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
            Journals posted by Smart Capture appear here automatically.<br />
            Use <strong>+ New Journal</strong> to create a manual double-entry.
          </div>
        </div>
      ) : (
        <div style={S.list}>
          <div style={S.thead}>
            <span style={{ ...S.th, flex: 1.1 }}>DATE</span>
            <span style={{ ...S.th, flex: 1.8 }}>REFERENCE</span>
            <span style={{ ...S.th, flex: 3.5 }}>DESCRIPTION</span>
            <span style={{ ...S.th, flex: 1 }}>TYPE</span>
            <span style={{ ...S.th, flex: 0.8 }}>FY</span>
            <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>DR TOTAL</span>
            <span style={{ ...S.th, flex: 1 }}>STATUS</span>
            <span style={{ ...S.th, flex: 1.2, textAlign: 'center' }}>ACTIONS</span>
          </div>

          {filtered.map(j => {
            const isOpen  = expanded === j.id;
            const lines   = (j.journal_lines || []).slice().sort((a, b) => a.line_order - b.line_order);
            const dr      = lines.reduce((s, l) => s + Number(l.debit_amount  || 0), 0);
            const cr      = lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0);
            const balanced = Math.abs(dr - cr) < 0.005;
            const typeCfg  = TYPE_CFG[j.journal_type]  || TYPE_CFG.manual;
            const statCfg  = STATUS_CFG[j.status]       || STATUS_CFG.draft;
            const locked   = j.is_year_end_closing;

            return (
              <div key={j.id} style={{ ...S.card, ...(isOpen ? { borderColor: '#c4b5fd', boxShadow: '0 4px 18px rgba(124,58,237,0.1)' } : {}) }}>
                <div style={S.row} onClick={() => setExpanded(isOpen ? null : j.id)}>
                  <span style={{ ...S.td, flex: 1.1, fontWeight: 600, color: '#374151' }}>{fmtDay(j.journal_date)}</span>
                  <span style={{ ...S.td, flex: 1.8, fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{j.reference || '\u2014'}</span>
                  <span style={{ ...S.td, flex: 3.5, fontWeight: 500, color: '#111827', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.description}</span>
                    {locked && <span style={S.yearEndBadge}>{"\uD83D\uDD12"} YEAR-END</span>}
                  </span>
                  <span style={{ ...S.td, flex: 1 }}><span style={{ ...S.badge, background: typeCfg.bg, color: typeCfg.color }}>{typeCfg.label}</span></span>
                  <span style={{ ...S.td, flex: 0.8, fontSize: 11, color: '#9ca3af' }}>{j.financial_year || '\u2014'}</span>
                  <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: dr > 0 ? '#111827' : '#d1d5db' }}>
                    {dr > 0 ? fmt(dr) : '\u2014'}
                    {!balanced && dr > 0 && <span style={{ color: '#dc2626', fontSize: 10, marginLeft: 3 }}>{"\u26A0"}</span>}
                  </span>
                  <span style={{ ...S.td, flex: 1 }}><span style={{ ...S.badge, background: statCfg.bg, color: statCfg.color }}>{statCfg.label}</span></span>
                  <span style={{ ...S.td, flex: 1.2, justifyContent: 'center', gap: 5 }} onClick={e => e.stopPropagation()}>
                    {j.status === 'draft' && !locked && (
                      <>
                        <button style={S.btnPost} onClick={() => setConfirm({ type: 'post', journal: j })}>Post</button>
                        <button style={S.btnDel} onClick={() => setConfirm({ type: 'delete', journal: j })}>Del</button>
                      </>
                    )}
                    {j.status === 'posted' && !locked && (
                      <button style={S.btnRev} onClick={() => setConfirm({ type: 'reverse', journal: j })}>Reverse</button>
                    )}
                    {(j.status === 'reversed' || locked) && (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{locked ? 'Locked' : 'Reversed'}</span>
                    )}
                  </span>
                </div>

                {isOpen && (
                  <div style={S.expandBox}>
                    <div style={S.linesHead}>
                      <span style={{ flex: 0.4 }}>#</span>
                      <span style={{ flex: 1.8 }}>ACCOUNT CODE</span>
                      <span style={{ flex: 3 }}>ACCOUNT NAME</span>
                      <span style={{ flex: 2.5 }}>LINE DESCRIPTION</span>
                      <span style={{ flex: 1.5, textAlign: 'right' }}>DEBIT (DR)</span>
                      <span style={{ flex: 1.5, textAlign: 'right' }}>CREDIT (CR)</span>
                    </div>
                    {lines.map(l => (
                      <div key={l.id} style={S.lineRow}>
                        <span style={{ flex: 0.4, color: '#9ca3af' }}>{l.line_order}</span>
                        <span style={{ flex: 1.8, fontFamily: 'monospace', fontWeight: 700, color: '#374151', fontSize: 12 }}>{l.account_code}</span>
                        <span style={{ flex: 3, color: '#374151' }}>{l.account_name || '\u2014'}</span>
                        <span style={{ flex: 2.5, color: '#6b7280', fontSize: 12 }}>{l.description || '\u2014'}</span>
                        <span style={{ flex: 1.5, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: Number(l.debit_amount) > 0 ? '#15803d' : '#d1d5db' }}>{Number(l.debit_amount) > 0 ? fmt(l.debit_amount) : '\u2014'}</span>
                        <span style={{ flex: 1.5, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: Number(l.credit_amount) > 0 ? '#b91c1c' : '#d1d5db' }}>{Number(l.credit_amount) > 0 ? fmt(l.credit_amount) : '\u2014'}</span>
                      </div>
                    ))}
                    <div style={S.linesTotals}>
                      <span style={{ flex: 0.4 }} /><span style={{ flex: 1.8 }} /><span style={{ flex: 3 }} />
                      <span style={{ flex: 2.5, fontWeight: 700, color: '#374151' }}>TOTALS</span>
                      <span style={{ flex: 1.5, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#15803d' }}>{fmt(dr)}</span>
                      <span style={{ flex: 1.5, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#b91c1c' }}>{fmt(cr)}</span>
                    </div>
                    {dr > 0 && (
                      <div style={{ ...S.balanceTag, background: balanced ? '#dcfce7' : '#fef3c7', color: balanced ? '#15803d' : '#b45309' }}>
                        {balanced ? `\u2713 Balanced \u2014 DR = CR = ${fmt(dr)}` : `\u26A0\uFE0F Unbalanced \u2014 DR: ${fmt(dr)} \u00b7 CR: ${fmt(cr)} \u00b7 Diff: ${fmt(Math.abs(dr - cr))}`}
                      </div>
                    )}
                    <div style={S.auditTrail}>
                      <span>{"\uD83D\uDCC5"} Journal date: <strong>{fmtDay(j.journal_date)}</strong></span>
                      <span>{"\uD83D\uDCEE"} Posted: <strong>{j.posted_at ? fmtDate(j.posted_at) : 'Not yet posted'}</strong></span>
                      <span>{"\uD83D\uDD52"} Created: <strong>{fmtDate(j.created_at)}</strong></span>
                      <span>{"\uD83D\uDCCB"} Lines: <strong>{lines.length}</strong></span>
                      <span>{"\uD83D\uDCC6"} FY: <strong>{j.financial_year || '\u2014'}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NEW JOURNAL MODAL ──────────────────────────────────────────────── */}
      {showModal && draft && (() => {
        const b = getBalance();
        return (
          <div style={S.overlay}>
            <div style={S.modal}>
              <div style={S.modalHead}>
                <div>
                  <div style={S.modalTitle}>New Journal Entry</div>
                  <div style={S.modalSub}>Manual double-entry {"\u00b7"} must balance (DR = CR) to post</div>
                </div>
                <button style={S.btnX} onClick={() => setShowModal(false)}>{"\u2715"}</button>
              </div>
              <div style={S.metaGrid}>
                <div style={{ ...S.field, gridColumn: '1 / 3' }}>
                  <label style={S.fieldLbl}>DESCRIPTION *</label>
                  <input style={S.input} value={draft.description} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Accrual \u2014 Security deposit Q2 2026" autoFocus />
                </div>
                <div style={S.field}>
                  <label style={S.fieldLbl}>DATE</label>
                  <input type="date" style={S.input} value={draft.journal_date} onChange={e => setDraft(p => ({ ...p, journal_date: e.target.value }))} />
                </div>
                <div style={S.field}>
                  <label style={S.fieldLbl}>REFERENCE (auto)</label>
                  <input style={{ ...S.input, fontFamily: 'monospace', color: '#6b7280' }} value={draft.reference} readOnly />
                </div>
                <div style={S.field}>
                  <label style={S.fieldLbl}>FINANCIAL YEAR</label>
                  <input style={{ ...S.input, color: '#6b7280' }} value={draft.financial_year} readOnly />
                </div>
              </div>
              <div style={S.linesSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#374151', letterSpacing: '0.03em' }}>JOURNAL LINES</span>
                  <button style={S.btnAddLine} onClick={addLine}>+ Add Line</button>
                </div>
                <div style={S.modalLinesHead}>
                  <span style={{ flex: 0.3 }}>#</span>
                  <span style={{ flex: 2.5 }}>ACCOUNT</span>
                  <span style={{ flex: 2 }}>LINE DESCRIPTION</span>
                  <span style={{ flex: 1.3 }}>DEBIT (DR)</span>
                  <span style={{ flex: 1.3 }}>CREDIT (CR)</span>
                  <span style={{ flex: 0.4 }} />
                </div>
                {draft.lines.map((line, idx) => (
                  <div key={idx} style={S.modalLineRow}>
                    <span style={{ flex: 0.3, color: '#9ca3af', fontSize: 12, paddingTop: 10 }}>{idx + 1}</span>
                    <div style={{ flex: 2.5 }}>
                      <select style={S.select} value={line.account_code} onChange={e => updateLine(idx, 'account_code', e.target.value)}>
                        <option value="">{"\u2014"} Select account {"\u2014"}</option>
                        {COA_TYPE_ORDER.map(type =>
                          coaByType[type]?.length > 0 && (
                            <optgroup key={type} label={`\u2500\u2500 ${COA_TYPE_LABELS[type]}`}>
                              {coaByType[type].map(a => (
                                <option key={a.account_code} value={a.account_code}>{a.account_code} {"\u00b7"} {a.account_name}</option>
                              ))}
                            </optgroup>
                          )
                        )}
                      </select>
                    </div>
                    <input style={{ ...S.input, flex: 2 }} value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Line description" />
                    <input style={{ ...S.input, flex: 1.3, textAlign: 'right' }} type="number" min="0" step="0.01" value={line.debit_amount} onChange={e => updateLine(idx, 'debit_amount', e.target.value)} placeholder="0.00" />
                    <input style={{ ...S.input, flex: 1.3, textAlign: 'right' }} type="number" min="0" step="0.01" value={line.credit_amount} onChange={e => updateLine(idx, 'credit_amount', e.target.value)} placeholder="0.00" />
                    <button style={{ ...S.btnDelLine, flex: 0.4, opacity: draft.lines.length <= 2 ? 0.3 : 1 }} onClick={() => removeLine(idx)} disabled={draft.lines.length <= 2}>{"\u2715"}</button>
                  </div>
                ))}
                <div style={{ ...S.balanceIndicator, background: b.ok ? '#dcfce7' : b.dr > 0 ? '#fef9c3' : '#f9fafb', borderColor: b.ok ? '#86efac' : b.dr > 0 ? '#fde68a' : '#e5e7eb' }}>
                  <span style={{ fontWeight: 700, color: '#374151' }}>Balance Check</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>DR: <strong style={{ color: '#15803d' }}>{fmt(b.dr)}</strong></span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>CR: <strong style={{ color: '#b91c1c' }}>{fmt(b.cr)}</strong></span>
                  <span style={{ fontWeight: 700, color: b.ok ? '#15803d' : '#b45309' }}>
                    {b.ok ? '\u2713 Balanced' : b.dr > 0 ? `\u26A0 Diff: ${fmt(Math.abs(b.dr - b.cr))}` : 'Enter amounts above'}
                  </span>
                </div>
              </div>
              {mError && <div style={S.modalErr}>{"\u26A0\uFE0F"} {mError}</div>}
              <div style={S.modalFooter}>
                <button style={S.btnOutline} onClick={() => setShowModal(false)}>Cancel</button>
                <button style={{ ...S.btnSecondary, opacity: mLoading ? 0.7 : 1 }} disabled={mLoading} onClick={() => persistJournal('draft')}>{mLoading ? 'Saving\u2026' : 'Save as Draft'}</button>
                <button style={{ ...S.btnPrimary, opacity: (b.ok && !mLoading) ? 1 : 0.45, cursor: b.ok ? 'pointer' : 'not-allowed' }} disabled={!b.ok || mLoading} onClick={() => persistJournal('posted')}>{mLoading ? 'Posting\u2026' : '\uD83D\uDCEE Post Journal'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CONFIRM DIALOG ─────────────────────────────────────────────────── */}
      {confirm && (
        <div style={S.overlay}>
          <div style={S.confirmBox}>
            <div style={S.confirmTitle}>
              {confirm.type === 'post'    && '\uD83D\uDCEE Post Journal'}
              {confirm.type === 'reverse' && '\u21A9\uFE0F Reverse Journal'}
              {confirm.type === 'delete'  && '\uD83D\uDDD1 Delete Draft'}
            </div>
            <div style={S.confirmRef}>{confirm.journal.reference || confirm.journal.id.slice(0, 16)}</div>
            <div style={S.confirmDesc}>{confirm.journal.description}</div>
            <div style={S.confirmNote}>
              {confirm.type === 'post' && 'This will post the journal and lock it from editing. Once posted, it can only be reversed \u2014 not edited or deleted.'}
              {confirm.type === 'reverse' && `A new reversal journal (REV-${confirm.journal.reference || ''}) will be created with all DR/CR lines flipped. The original journal will be marked Reversed.`}
              {confirm.type === 'delete' && 'This draft and all its lines will be permanently deleted. This cannot be undone.'}
            </div>
            <div style={S.confirmFooter}>
              <button style={S.btnOutline} onClick={() => setConfirm(null)}>Cancel</button>
              <button style={confirm.type === 'delete' ? { ...S.btnPrimary, background: '#dc2626' } : S.btnPrimary} onClick={() => {
                if (confirm.type === 'post')    postExisting(confirm.journal);
                if (confirm.type === 'reverse') reverseJournal(confirm.journal);
                if (confirm.type === 'delete')  deleteDraft(confirm.journal);
              }}>
                Confirm {confirm.type.charAt(0).toUpperCase() + confirm.type.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

// WP-UNIFY: TK palette aliased to src/styles/tokens.js
const TK = {
  ...T,
  ink200: T.border,      ink100: T.bg,          ink50: T.surface,
  green:  T.success,     greenLt: T.successLight,
  red:    T.danger,      redLt:   T.dangerLight,
  amber:  T.warning,
  purple: '#6d28d9',     purpleLt: '#ede9fe',
};

const S = {
  root: { padding: '24px 28px', maxWidth: 1440, margin: '0 auto', fontFamily: T.font, color: TK.ink900 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 64, color: TK.ink500 },
  spinner: { width: 20, height: 20, border: `2px solid ${TK.ink300}`, borderTopColor: TK.purple, borderRadius: '50%', animation: 'spin 0.75s linear infinite' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: TK.ink900 },
  subtitle: { margin: '4px 0 0', fontSize: 12, color: TK.ink500 },
  statsRow: { display: 'flex', gap: 12, marginBottom: 20 },
  statCard: { background: T.surface, border: `1px solid ${TK.ink200}`, borderRadius: T.radius.lg, padding: '14px 18px', boxShadow: T.shadow.sm },
  statLabel: { fontSize: 11, fontWeight: 700, color: T.ink400, letterSpacing: '0.07em', marginBottom: 6 },
  statVal: { fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  filterBar: { display: 'flex', gap: 20, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 11, fontWeight: 700, color: T.ink400, letterSpacing: '0.07em', marginRight: 2 },
  chip: { padding: '5px 13px', borderRadius: T.radius.full, border: `1px solid ${TK.ink300}`, background: T.surface, fontSize: 11, fontWeight: 600, color: TK.ink700, cursor: 'pointer', transition: 'all 0.1s' },
  chipActive: { background: TK.ink900, color: '#fff', borderColor: TK.ink900 },
  empty: { textAlign: 'center', padding: '56px 20px', background: T.surface, borderRadius: T.radius.lg, border: `1px solid ${TK.ink200}` },
  list: { display: 'flex', flexDirection: 'column', gap: 3 },
  thead: { display: 'flex', gap: 8, padding: '6px 16px 8px', marginBottom: 2 },
  th: { fontSize: 11, fontWeight: 700, color: T.ink400, letterSpacing: '0.07em' },
  card: { background: T.surface, border: `1px solid ${TK.ink200}`, borderRadius: T.radius.md, overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s' },
  row: { display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 8, cursor: 'pointer', transition: 'background 0.1s' },
  td: { fontSize: 13, display: 'flex', alignItems: 'center', overflow: 'hidden' },
  badge: { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: T.radius.full, whiteSpace: 'nowrap' },
  yearEndBadge: { fontSize: 11, fontWeight: 700, background: TK.redLt, color: TK.red, padding: '2px 7px', borderRadius: T.radius.sm, whiteSpace: 'nowrap', flexShrink: 0 },
  expandBox: { padding: '12px 16px 16px', background: TK.ink50, borderTop: `1px solid ${TK.ink200}` },
  linesHead: { display: 'flex', gap: 8, padding: '6px 0', marginBottom: 4, fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em' },
  lineRow: { display: 'flex', gap: 8, padding: '7px 0', fontSize: 13, borderBottom: `1px solid ${TK.ink200}` },
  linesTotals: { display: 'flex', gap: 8, padding: '10px 0 6px', borderTop: `2px solid ${TK.ink300}` },
  balanceTag: { display: 'flex', gap: 16, alignItems: 'center', padding: '8px 14px', borderRadius: T.radius.md, fontSize: 12, fontWeight: 600, marginTop: 8 },
  auditTrail: { display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: TK.ink500, marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${TK.ink300}` },
  btnPrimary: { background: TK.ink900, color: '#fff', border: 'none', borderRadius: T.radius.md, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { background: TK.purple, color: '#fff', border: 'none', borderRadius: T.radius.md, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnOutline: { background: T.surface, color: TK.ink700, border: `1px solid ${TK.ink300}`, borderRadius: T.radius.md, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnPost: { background: TK.greenLt, color: TK.green, border: 'none', borderRadius: T.radius.sm, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnRev: { background: T.infoLight, color: T.info, border: 'none', borderRadius: T.radius.sm, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnDel: { background: TK.redLt, color: TK.red, border: 'none', borderRadius: T.radius.sm, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnX: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: TK.ink500, padding: 4, lineHeight: 1 },
  btnAddLine: { background: TK.purpleLt, color: TK.purple, border: 'none', borderRadius: T.radius.sm, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnDelLine: { background: TK.redLt, color: TK.red, border: 'none', borderRadius: T.radius.sm, padding: '4px 8px', fontSize: 12, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 20 },
  modal: { background: T.surface, borderRadius: T.radius.lg, width: '100%', maxWidth: 920, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 16px', borderBottom: `1px solid ${TK.ink200}` },
  modalTitle: { fontSize: 18, fontWeight: 700, color: TK.ink900, marginBottom: 3 },
  modalSub: { fontSize: 12, color: TK.ink500 },
  metaGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr', gap: 16, padding: '20px 24px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLbl: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em' },
  input: { padding: '8px 12px', borderRadius: T.radius.md, border: `1px solid ${TK.ink300}`, fontSize: 13, color: TK.ink900, outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { padding: '8px 12px', borderRadius: T.radius.md, border: `1px solid ${TK.ink300}`, fontSize: 13, color: TK.ink900, background: T.surface, width: '100%' },
  linesSection: { padding: '0 24px 20px' },
  modalLinesHead: { display: 'flex', gap: 8, padding: '8px 0 6px', fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em' },
  modalLineRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  balanceIndicator: { display: 'flex', gap: 20, alignItems: 'center', padding: '10px 16px', borderRadius: 8, border: '1px solid', marginTop: 14, fontSize: 13 },
  modalErr: { margin: '0 24px 12px', padding: '10px 14px', background: TK.redLt, color: TK.red, borderRadius: T.radius.md, fontSize: 13 },
  modalFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${TK.ink200}` },
  confirmBox: { background: T.surface, borderRadius: T.radius.lg, width: 480, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  confirmTitle: { fontSize: 17, fontWeight: 700, color: TK.ink900, marginBottom: 10 },
  confirmRef: { fontFamily: 'monospace', fontSize: 12, color: TK.ink500, background: TK.ink50, padding: '4px 10px', borderRadius: T.radius.md, display: 'inline-block', marginBottom: 8 },
  confirmDesc: { fontSize: 14, color: TK.ink700, marginBottom: 12, lineHeight: 1.5 },
  confirmNote: { fontSize: 13, color: TK.ink500, lineHeight: 1.6, marginBottom: 22 },
  confirmFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
};
