// src/components/hq/HQFixedAssets.js
// WP-FINANCIALS Phase 4 — Fixed Asset Register & Depreciation
// v1.0 · 08 Apr 2026
// Schema verified · LL-205 applied · LL-206 pattern · additive only

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useTenant } from '../../services/tenantService';
import { T } from "../../styles/tokens";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CATEGORY_CFG = {
  'Equipment':            { icon: '\u2699\uFE0F', color: '#1d4ed8', bg: '#dbeafe' },
  'Furniture & Fittings': { icon: '\uD83E\uDE91', color: '#7c3aed', bg: '#ede9fe' },
  'Motor Vehicles':       { icon: '\uD83D\uDE97', color: '#059669', bg: '#dcfce7' },
  'Computer Equipment':   { icon: '\uD83D\uDCBB', color: '#0369a1', bg: '#e0f2fe' },
  'Leasehold Improvements': { icon: '\uD83C\uDFD7\uFE0F', color: '#b45309', bg: '#fef3c7' },
  'Buildings':            { icon: '\uD83C\uDFE2', color: '#374151', bg: '#f3f4f6' },
};

const catCfg = (cat) => CATEGORY_CFG[cat] || { icon: '\uD83D\uDCE6', color: '#6b7280', bg: '#f3f4f6' };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `R${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014';

const monthlyDep = (asset) => {
  const depBase = Number(asset.purchase_cost) - Number(asset.residual_value);
  const lifeMonths = Number(asset.useful_life_years) * 12;
  return lifeMonths > 0 ? depBase / lifeMonths : 0;
};

const monthsElapsed = (purchaseDateStr) => {
  const purchase = new Date(purchaseDateStr);
  const now = new Date();
  return (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());
};

const expectedAccumDep = (asset) => {
  const monthly = monthlyDep(asset);
  const elapsed = monthsElapsed(asset.purchase_date);
  const maxDep = Number(asset.purchase_cost) - Number(asset.residual_value);
  return Math.min(monthly * elapsed, maxDep);
};

const monthsBehind = (asset) => {
  const monthly = monthlyDep(asset);
  if (monthly === 0) return 0;
  const accumulated = Number(asset.accumulated_depreciation);
  const expected = expectedAccumDep(asset);
  return Math.max(0, Math.round((expected - accumulated) / monthly));
};

const remainingMonths = (asset) => {
  const maxDep = Number(asset.purchase_cost) - Number(asset.residual_value);
  const remaining = maxDep - Number(asset.accumulated_depreciation);
  const monthly = monthlyDep(asset);
  return monthly > 0 ? Math.max(0, Math.ceil(remaining / monthly)) : 0;
};

const remainingYears = (asset) => (remainingMonths(asset) / 12).toFixed(1);

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function HQFixedAssets() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [assets, setAssets] = useState([]);
  const [depHistory, setDepHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showRunDep, setShowRunDep] = useState(false);
  const [runMonth, setRunMonth] = useState(MONTHS_SHORT[new Date().getMonth()]);
  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState(null);

  const [expandedId, setExpandedId] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, histRes] = await Promise.all([
        supabase.from('fixed_assets')
          .select('id, asset_name, asset_category, asset_code, purchase_date, purchase_cost, residual_value, useful_life_years, depreciation_method, accumulated_depreciation, net_book_value, is_active, notes')
          .eq('tenant_id', tenantId).eq('is_active', true).order('purchase_date'),
        supabase.from('depreciation_entries')
          .select('id, asset_id, period_month, period_year, depreciation, accum_dep_after, nbv_after, posted_at')
          .eq('tenant_id', tenantId).order('period_year', { ascending: false }).order('period_month', { ascending: false }),
      ]);
      if (assetsRes.error) throw assetsRes.error;
      if (histRes.error) throw histRes.error;
      setAssets(assetsRes.data || []);
      setDepHistory(histRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load fixed assets');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalCost = assets.reduce((s, a) => s + Number(a.purchase_cost), 0);
  const totalAccumDep = assets.reduce((s, a) => s + Number(a.accumulated_depreciation), 0);
  const totalNBV = assets.reduce((s, a) => s + Number(a.net_book_value), 0);
  const totalMonthly = assets.reduce((s, a) => s + monthlyDep(a), 0);
  const anyBehind = assets.some(a => monthsBehind(a) > 0);
  const yearOptions = [new Date().getFullYear() - 1, new Date().getFullYear()];

  // ── Run Depreciation ───────────────────────────────────────────────────────

  async function runDepreciation() {
    if (!runMonth || !runYear) return;
    setRunLoading(true);
    setRunError(null);
    setRunResult(null);

    let posted = 0, skipped = 0, totalPosted = 0;

    try {
      for (const asset of assets) {
        const { data: existing } = await supabase.from('depreciation_entries')
          .select('id').eq('tenant_id', tenantId).eq('asset_id', asset.id)
          .eq('period_month', runMonth).eq('period_year', runYear);

        if (existing && existing.length > 0) { skipped++; continue; }

        const monthly = monthlyDep(asset);
        const maxDep = Number(asset.purchase_cost) - Number(asset.residual_value);
        const currentAccum = Number(asset.accumulated_depreciation);

        if (currentAccum >= maxDep) { skipped++; continue; }

        const charge = Math.min(monthly, maxDep - currentAccum);
        const newAccumDep = currentAccum + charge;
        const newNBV = Number(asset.purchase_cost) - newAccumDep;

        const { error: insertErr } = await supabase.from('depreciation_entries').insert({
          tenant_id: tenantId, asset_id: asset.id, period_month: runMonth,
          period_year: runYear, depreciation: charge, accum_dep_after: newAccumDep, nbv_after: newNBV,
        });
        if (insertErr) throw insertErr;

        const { error: updateErr } = await supabase.from('fixed_assets').update({
          accumulated_depreciation: newAccumDep, net_book_value: newNBV,
          updated_at: new Date().toISOString(),
        }).eq('id', asset.id);
        if (updateErr) throw updateErr;

        posted++;
        totalPosted += charge;
      }

      setRunResult({ posted, skipped, total: totalPosted });
      await fetchAll();
    } catch (err) {
      setRunError(err.message);
    } finally {
      setRunLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
      <span style={{ fontSize: 14, color: '#6b7280' }}>Loading asset register{"\u2026"}</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: '#b91c1c', fontSize: 14 }}>{"\u26A0\uFE0F"} {error}</div>
  );

  return (
    <div style={S.root}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Fixed Asset Register</h2>
          <p style={S.subtitle}>PP&E {"\u00b7"} IAS 16 {"\u00b7"} Straight-line depreciation {"\u00b7"} WP-FINANCIALS Phase 4</p>
        </div>
        <button style={S.btnPrimary} onClick={() => { setShowRunDep(true); setRunResult(null); setRunError(null); }}>{"\u25B6"} Run Depreciation</button>
      </div>

      {/* ── BEHIND ALERT ───────────────────────────────────────────────── */}
      {anyBehind && (
        <div style={S.alertBehind}>
          <span style={{ fontWeight: 700 }}>{"\u26A0\uFE0F"} Depreciation is behind on one or more assets.</span>
          <span style={{ fontSize: 13 }}>The P&L depreciation charge and Balance Sheet NBV are understated. Use <strong>Run Depreciation</strong> to post charges month by month.</span>
        </div>
      )}

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <div style={S.statsRow}>
        {[
          { label: 'ASSETS ON REGISTER', val: assets.length, color: '#374151' },
          { label: 'TOTAL COST (PP&E)', val: fmt(totalCost), color: '#1d4ed8' },
          { label: 'ACCUM DEPRECIATION', val: fmt(totalAccumDep), color: '#b91c1c' },
          { label: 'NET BOOK VALUE', val: fmt(totalNBV), color: '#15803d' },
          { label: 'MONTHLY DEP CHARGE', val: fmt(totalMonthly), color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statVal, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── ASSET TABLE ────────────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Asset Register</div>
        <div style={S.thead}>
          <span style={{ ...S.th, flex: 0.7 }}>CODE</span>
          <span style={{ ...S.th, flex: 2.5 }}>ASSET</span>
          <span style={{ ...S.th, flex: 1.2 }}>PURCHASED</span>
          <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>COST</span>
          <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>ACCUM DEP</span>
          <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>NBV</span>
          <span style={{ ...S.th, flex: 1 }}>DEP %</span>
          <span style={{ ...S.th, flex: 1.2, textAlign: 'right' }}>MONTHLY</span>
          <span style={{ ...S.th, flex: 1 }}>LIFE LEFT</span>
          <span style={{ ...S.th, flex: 1 }}>STATUS</span>
        </div>

        {assets.map(asset => {
          const isOpen = expandedId === asset.id;
          const cfg = catCfg(asset.asset_category);
          const behind = monthsBehind(asset);
          const monthly = monthlyDep(asset);
          const depPct = Number(asset.purchase_cost) > 0
            ? (Number(asset.accumulated_depreciation) / (Number(asset.purchase_cost) - Number(asset.residual_value))) * 100 : 0;
          const lifeMos = remainingMonths(asset);
          const fullyDep = lifeMos === 0;

          return (
            <div key={asset.id} style={{ ...S.assetCard, ...(isOpen ? { borderColor: '#c4b5fd', boxShadow: '0 4px 16px rgba(124,58,237,0.1)' } : {}) }}>
              <div style={S.assetRow} onClick={() => setExpandedId(isOpen ? null : asset.id)}>
                <span style={{ ...S.td, flex: 0.7, fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{asset.asset_code}</span>
                <span style={{ ...S.td, flex: 2.5, gap: 8 }}>
                  <span style={{ ...S.catBadge, background: cfg.bg, color: cfg.color }}>{cfg.icon} {asset.asset_category}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{asset.asset_name}</span>
                </span>
                <span style={{ ...S.td, flex: 1.2, color: '#6b7280', fontSize: 12 }}>{fmtDate(asset.purchase_date)}</span>
                <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#1d4ed8' }}>{fmt(asset.purchase_cost)}</span>
                <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#b91c1c' }}>({fmt(asset.accumulated_depreciation)})</span>
                <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#15803d' }}>{fmt(asset.net_book_value)}</span>
                <span style={{ ...S.td, flex: 1 }}>
                  <div style={S.depBar}><div style={{ ...S.depBarFill, width: `${Math.min(depPct, 100)}%` }} /><span style={S.depBarLabel}>{depPct.toFixed(0)}%</span></div>
                </span>
                <span style={{ ...S.td, flex: 1.2, justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums', color: '#7c3aed', fontWeight: 600 }}>{fmt(monthly)}/mo</span>
                <span style={{ ...S.td, flex: 1, fontSize: 12, color: fullyDep ? '#b91c1c' : '#374151' }}>{fullyDep ? 'Fully dep.' : `${remainingYears(asset)} yrs`}</span>
                <span style={{ ...S.td, flex: 1 }}>
                  {behind > 0
                    ? <span style={{ ...S.badge, background: '#fef3c7', color: '#b45309' }}>{behind}mo behind</span>
                    : <span style={{ ...S.badge, background: '#dcfce7', color: '#15803d' }}>Current</span>}
                </span>
              </div>

              {isOpen && (
                <div style={S.expandBox}>
                  <div style={S.expandGrid}>
                    {[
                      ['DEPRECIATION METHOD', asset.depreciation_method === 'straight_line' ? 'Straight-Line (SL)' : asset.depreciation_method],
                      ['USEFUL LIFE', `${asset.useful_life_years} years`],
                      ['RESIDUAL VALUE', fmt(asset.residual_value)],
                      ['DEPRECIABLE AMOUNT', fmt(Number(asset.purchase_cost) - Number(asset.residual_value))],
                      ['ANNUAL DEP CHARGE', `${fmt(monthly * 12)}/yr`],
                      ['REMAINING LIFE', `${remainingMonths(asset)} months (${remainingYears(asset)} yrs)`],
                      ['EXPECTED ACCUM DEP TODAY', `${fmt(expectedAccumDep(asset))}${behind > 0 ? ` (${behind} months unposted)` : ''}`],
                      ['NOTES', asset.notes || '\u2014'],
                    ].map(([label, val]) => (
                      <div key={label} style={S.expandItem}>
                        <div style={S.expandLabel}>{label}</div>
                        <div style={S.expandVal}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DEPRECIATION HISTORY ───────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Depreciation History <span style={S.sectionCount}>{depHistory.length} {depHistory.length === 1 ? 'entry' : 'entries'}</span></div>
        {depHistory.length === 0 ? (
          <div style={S.emptyHistory}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83D\uDCC5"}</div>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No depreciation entries posted yet</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Current accumulated depreciation was seeded directly. Use <strong>Run Depreciation</strong> to begin posting monthly entries.</div>
          </div>
        ) : (
          <>
            <div style={{ ...S.thead, marginTop: 8 }}>
              <span style={{ ...S.th, flex: 1.2 }}>PERIOD</span>
              <span style={{ ...S.th, flex: 2.5 }}>ASSET</span>
              <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>CHARGE</span>
              <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>ACCUM DEP AFTER</span>
              <span style={{ ...S.th, flex: 1.3, textAlign: 'right' }}>NBV AFTER</span>
              <span style={{ ...S.th, flex: 1.5 }}>POSTED</span>
            </div>
            {depHistory.map(entry => {
              const asset = assets.find(a => a.id === entry.asset_id);
              return (
                <div key={entry.id} style={S.histRow}>
                  <span style={{ ...S.td, flex: 1.2, fontWeight: 600, color: '#374151' }}>{entry.period_month} {entry.period_year}</span>
                  <span style={{ ...S.td, flex: 2.5, color: '#374151' }}>{asset?.asset_name || entry.asset_id.slice(0, 8)}</span>
                  <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#b91c1c' }}>({fmt(entry.depreciation)})</span>
                  <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>{fmt(entry.accum_dep_after)}</span>
                  <span style={{ ...S.td, flex: 1.3, justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#15803d' }}>{fmt(entry.nbv_after)}</span>
                  <span style={{ ...S.td, flex: 1.5, fontSize: 11, color: '#9ca3af' }}>{entry.posted_at ? new Date(entry.posted_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014'}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── BS NOTE ────────────────────────────────────────────────────── */}
      <div style={S.bsNote}>
        <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>{"\uD83D\uDCCA"} Balance Sheet {"\u2014"} Property, Plant & Equipment (IAS 16)</div>
        <div style={S.bsGrid}>
          <div><span style={S.bsLabel}>PP&E at Cost</span><span style={{ ...S.bsVal, color: '#1d4ed8' }}>{fmt(totalCost)}</span></div>
          <div><span style={S.bsLabel}>Less: Accumulated Depreciation</span><span style={{ ...S.bsVal, color: '#b91c1c' }}>({fmt(totalAccumDep)})</span></div>
          <div style={{ borderTop: '2px solid #93c5fd', paddingTop: 8 }}>
            <span style={{ ...S.bsLabel, fontWeight: 700 }}>Net Book Value</span>
            <span style={{ ...S.bsVal, color: '#15803d', fontSize: 20, fontWeight: 800 }}>{fmt(totalNBV)}</span>
          </div>
        </div>
        {anyBehind && (() => {
          const maxBehind = Math.max(...assets.map(a => monthsBehind(a)));
          return <div style={{ fontSize: 12, color: '#b45309', marginTop: 10, padding: "8px 12px", background: "#FFFBEB", borderRadius: 6, border: "1px solid #F59E0B" }}>{"\u26A0"} <strong>{maxBehind} month{maxBehind !== 1 ? "s" : ""} of depreciation unposted.</strong> Click Run Depreciation and select each month to catch up. NBV is overstated until posted.</div>;
        })()}
      </div>

      {/* ── RUN DEP MODAL ──────────────────────────────────────────────── */}
      {showRunDep && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <div>
                <div style={S.modalTitle}>{"\u25B6"} Run Depreciation</div>
                <div style={S.modalSub}>Posts monthly depreciation charge for all active assets {"\u00b7"} Updates accumulated_depreciation + net_book_value</div>
              </div>
              <button style={S.btnX} onClick={() => setShowRunDep(false)}>{"\u2715"}</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={S.periodRow}>
                <div style={S.field}>
                  <label style={S.fieldLbl}>MONTH</label>
                  <select style={S.select} value={runMonth} onChange={e => setRunMonth(e.target.value)}>
                    {MONTHS_SHORT.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.fieldLbl}>YEAR</label>
                  <select style={S.select} value={runYear} onChange={e => setRunYear(Number(e.target.value))}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.previewBox}>
                <div style={S.previewTitle}>Preview {"\u2014"} {runMonth} {runYear}</div>
                {assets.map(asset => {
                  const charge = monthlyDep(asset);
                  const maxDep = Number(asset.purchase_cost) - Number(asset.residual_value);
                  const already = Number(asset.accumulated_depreciation) >= maxDep;
                  return (
                    <div key={asset.id} style={S.previewRow}>
                      <span style={{ flex: 1, color: already ? '#9ca3af' : '#374151', fontSize: 13 }}>{asset.asset_code} {"\u00b7"} {asset.asset_name}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: already ? '#9ca3af' : '#b91c1c', fontWeight: 600 }}>
                        {already ? 'Fully depreciated \u2014 skip' : `(${fmt(charge)})`}
                      </span>
                    </div>
                  );
                })}
                <div style={S.previewTotal}>
                  <span style={{ fontWeight: 700 }}>Total charge</span>
                  <span style={{ fontWeight: 800, color: '#b91c1c', fontVariantNumeric: 'tabular-nums' }}>({fmt(totalMonthly)})</span>
                </div>
              </div>
              {runError && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{"\u26A0\uFE0F"} {runError}</div>}
              {runResult && <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{"\u2713"} Done {"\u2014"} {runResult.posted} entries posted ({fmt(runResult.total)} total){runResult.skipped > 0 && ` \u00b7 ${runResult.skipped} skipped (already posted or fully depreciated)`}</div>}
              <div style={S.modalFooter}>
                <button style={S.btnOutline} onClick={() => setShowRunDep(false)}>{runResult ? 'Close' : 'Cancel'}</button>
                {!runResult && (
                  <button style={{ ...S.btnPrimary, opacity: runLoading ? 0.7 : 1 }} disabled={runLoading} onClick={runDepreciation}>
                    {runLoading ? 'Running\u2026' : `\u25B6 Post ${runMonth} ${runYear} Depreciation`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

// WP-UNIFY: TK grey palette aliased to src/styles/tokens.js
const TK = {
  ...T,
  ink200: T.border,
  ink100: T.bg,
};

const S = {
  root: { padding: '24px 28px', maxWidth: 1440, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: TK.ink900 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 80 },
  spinner: { width: 20, height: 20, border: `2px solid ${TK.ink300}`, borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.75s linear infinite' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: TK.ink900 },
  subtitle: { margin: '4px 0 0', fontSize: 12, color: TK.ink500 },
  alertBehind: { background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#b45309' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, background: '#fff', border: `1px solid ${TK.ink200}`, borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  statLabel: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em', marginBottom: 6 },
  statVal: { fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: TK.ink700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 },
  sectionCount: { fontSize: 12, fontWeight: 400, color: TK.ink500, background: TK.ink100, padding: '2px 10px', borderRadius: 20 },
  thead: { display: 'flex', gap: 8, padding: '8px 16px', background: TK.ink100, borderRadius: '10px 10px 0 0', border: `1px solid ${TK.ink200}`, borderBottom: 'none' },
  th: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em' },
  assetCard: { background: '#fff', border: `1px solid ${TK.ink200}`, borderTop: 'none', overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s' },
  assetRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', cursor: 'pointer' },
  td: { fontSize: 13, display: 'flex', alignItems: 'center', overflow: 'hidden' },
  catBadge: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 },
  badge: { fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' },
  depBar: { width: '100%', height: 8, background: TK.ink200, borderRadius: 4, position: 'relative', overflow: 'hidden' },
  depBarFill: { height: '100%', background: '#b91c1c', borderRadius: 4, transition: 'width 0.3s' },
  depBarLabel: { position: 'absolute', right: 0, top: -1, fontSize: 9, color: TK.ink500, fontWeight: 600 },
  expandBox: { padding: '14px 16px 16px', background: '#fafafa', borderTop: `1px solid ${TK.ink100}` },
  expandGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  expandItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  expandLabel: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em' },
  expandVal: { fontSize: 13, fontWeight: 600, color: TK.ink700 },
  histRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${TK.ink100}`, background: '#fff' },
  emptyHistory: { textAlign: 'center', padding: '32px 20px', background: '#fff', border: `1px solid ${TK.ink200}`, borderRadius: '0 0 10px 10px' },
  bsNote: { background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 12, padding: '18px 20px', marginBottom: 16 },
  bsGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  bsLabel: { fontSize: 13, color: TK.ink700, display: 'block', marginBottom: 2 },
  bsVal: { fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', display: 'block' },
  btnPrimary: { background: TK.ink900, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnOutline: { background: '#fff', color: TK.ink700, border: `1px solid ${TK.ink300}`, borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnX: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: TK.ink500, padding: 4, lineHeight: 1 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 20 },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 16px', borderBottom: `1px solid ${TK.ink200}` },
  modalTitle: { fontSize: 18, fontWeight: 700, color: TK.ink900, marginBottom: 3 },
  modalSub: { fontSize: 12, color: TK.ink500 },
  modalFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: `1px solid ${TK.ink200}`, marginTop: 4 },
  periodRow: { display: 'flex', gap: 16, marginBottom: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLbl: { fontSize: 10, fontWeight: 700, color: TK.ink500, letterSpacing: '0.07em' },
  select: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${TK.ink300}`, fontSize: 13, color: TK.ink900, background: '#fff', minWidth: 120 },
  previewBox: { background: TK.ink100, borderRadius: 10, padding: '14px 16px', marginBottom: 20 },
  previewTitle: { fontSize: 12, fontWeight: 700, color: TK.ink500, marginBottom: 10, letterSpacing: '0.05em' },
  previewRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${TK.ink200}` },
  previewTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4, borderTop: `2px solid ${TK.ink300}` },
};
