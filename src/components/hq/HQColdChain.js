// src/components/hq/HQColdChain.js
// WP-FNB S6 — Cold Chain Intelligence — v1.0
// Built: March 25, 2026
// Rules: RULE 0F (tenant_id), RULE 0G (useTenant inside),
//        WorkflowGuide first, InfoTooltip on key fields

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useTenant } from '../../services/tenantService';
import WorkflowGuide from '../WorkflowGuide';
import InfoTooltip from '../InfoTooltip';

const C = {
  bg: '#F8F7F4', surface: '#FFFFFF', border: '#E8E4DC',
  ink: '#1A1A18', inkMid: '#4A4740', inkLight: '#8A8680',
  accent: '#2D6A4F', accentBg: '#EBF5EF',
  amber: '#92400E', amberBg: '#FEF3C7',
  red: '#991B1B', redBg: '#FEF2F2',
  blue: '#1D4ED8', blueBg: '#EFF6FF',
  purple: '#5B21B6', purpleBg: '#F5F3FF',
};

const LOCATION_TYPES = [
  { key: 'refrigerated', label: 'Refrigerated', icon: '❄️', color: C.blue,   bg: C.blueBg,   defaultMin: 2,   defaultMax: 8 },
  { key: 'frozen',       label: 'Frozen',        icon: '🧊', color: C.purple, bg: C.purpleBg, defaultMin: -25, defaultMax: -15 },
  { key: 'ambient',      label: 'Ambient',       icon: '☀️', color: C.accent, bg: C.accentBg, defaultMin: 15,  defaultMax: 25 },
];

const DEFAULT_LOCATIONS = [
  { name: 'Walk-in Fridge 1',  location_type: 'refrigerated', min_limit_c: 2,   max_limit_c: 8,   description: 'Main cold storage for perishables' },
  { name: 'Chest Freezer A',   location_type: 'frozen',       min_limit_c: -25, max_limit_c: -15, description: 'Frozen ingredient storage' },
  { name: 'Dry Store',         location_type: 'ambient',      min_limit_c: 15,  max_limit_c: 25,  description: 'Ambient temperature dry goods' },
  { name: 'Display Fridge',    location_type: 'refrigerated', min_limit_c: 2,   max_limit_c: 8,   description: 'Customer-facing refrigerated display' },
];

function getLocationType(key) {
  return LOCATION_TYPES.find(l => l.key === key) || LOCATION_TYPES[0];
}

function tempStatus(temp, min, max) {
  if (temp === null || temp === undefined) return { color: C.inkLight, label: '—', ok: null };
  if (temp < min) return { color: C.blue,  bg: C.blueBg,  label: `${temp}°C ↓ COLD`, ok: false, severity: 'major' };
  if (temp > max) return { color: C.red,   bg: C.redBg,   label: `${temp}°C ↑ HOT`,  ok: false, severity: temp > max + 5 ? 'critical' : 'major' };
  return { color: C.accent, bg: C.accentBg, label: `${temp}°C ✓`, ok: true };
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Location card ────────────────────────────────────────────────────────────
function LocationCard({ location, lastLog, onLogReading }) {
  const lt = getLocationType(location.location_type);
  const status = lastLog ? tempStatus(lastLog.temperature_c, location.min_limit_c, location.max_limit_c) : null;
  const isBreach = status && !status.ok;

  return (
    <div style={{
      background: isBreach ? C.redBg : C.surface,
      border: `1.5px solid ${isBreach ? '#FECACA' : C.border}`,
      borderRadius: 10, padding: 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{lt.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{location.name}</span>
            {isBreach && (
              <span style={{ background: C.red, color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                ⚠ BREACH
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.inkLight }}>{location.description || lt.label}</div>
          <div style={{ fontSize: 11, color: C.inkLight, marginTop: 3 }}>
            Limits: {location.min_limit_c}°C — {location.max_limit_c}°C
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {status ? (
            <div style={{
              fontSize: 22, fontWeight: 900,
              color: status.color,
              background: status.bg,
              border: `1px solid ${status.color}30`,
              borderRadius: 8, padding: '6px 14px',
            }}>
              {status.label}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.inkLight, fontStyle: 'italic' }}>No readings yet</div>
          )}
          {lastLog && (
            <div style={{ fontSize: 10, color: C.inkLight, marginTop: 4 }}>
              Last: {fmtDateTime(lastLog.recorded_at)}
            </div>
          )}
        </div>
      </div>
      <button onClick={() => onLogReading(location)}
        style={{
          width: '100%', padding: '8px', background: C.accent, color: '#fff',
          border: 'none', borderRadius: 6, cursor: 'pointer',
          fontSize: 12, fontFamily: 'inherit', fontWeight: 700,
        }}>
        📝 Log Temperature Reading
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function HQColdChain() {
  const { tenantId } = useTenant(); // RULE 0G

  const [activeTab, setActiveTab]     = useState('dashboard');
  const [locations, setLocations]     = useState([]);
  const [logs, setLogs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showLocForm, setShowLocForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const emptyLog = {
    location_id: '', temperature_c: '', corrective_action: '',
    affected_lots: '', notes: '',
  };
  const [logForm, setLogForm] = useState(emptyLog);

  const emptyLoc = {
    name: '', location_type: 'refrigerated',
    min_limit_c: 2, max_limit_c: 8, description: '',
  };
  const [locForm, setLocForm] = useState(emptyLoc);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [locRes, logRes] = await Promise.all([
        supabase.from('cold_chain_locations').select('*')
          .eq('tenant_id', tenantId) // RULE 0F
          .eq('is_active', true).order('name'),
        supabase.from('temperature_logs').select('*')
          .eq('tenant_id', tenantId) // RULE 0F
          .order('recorded_at', { ascending: false }).limit(200),
      ]);
      if (locRes.error) throw locRes.error;
      if (logRes.error) throw logRes.error;
      setLocations(locRes.data || []);
      setLogs(logRes.data || []);
    } catch (err) {
      showToast('Load failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Seed default locations ─────────────────────────────────────────────────
  async function handleSeedLocations() {
    if (!window.confirm(`Add ${DEFAULT_LOCATIONS.length} standard cold chain locations?`)) return;
    setSaving(true);
    try {
      const payload = DEFAULT_LOCATIONS.map(l => ({
        ...l, tenant_id: tenantId, // RULE 0F
        created_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('cold_chain_locations').insert(payload);
      if (error) throw error;
      showToast(`✅ ${DEFAULT_LOCATIONS.length} locations added`);
      setShowTemplates(false);
      fetchAll();
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Save location ──────────────────────────────────────────────────────────
  async function handleSaveLocation() {
    if (!locForm.name.trim()) { showToast('Location name required', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('cold_chain_locations').insert({
        ...locForm, tenant_id: tenantId, // RULE 0F
        min_limit_c: parseFloat(locForm.min_limit_c),
        max_limit_c: parseFloat(locForm.max_limit_c),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      showToast('Location added');
      setShowLocForm(false);
      setLocForm(emptyLoc);
      fetchAll();
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Save temperature log ───────────────────────────────────────────────────
  async function handleSaveLog() {
    if (!logForm.location_id) { showToast('Select a location', 'error'); return; }
    if (logForm.temperature_c === '' || logForm.temperature_c === null) {
      showToast('Enter the temperature reading', 'error'); return;
    }
    setSaving(true);
    try {
      const loc = locations.find(l => l.id === logForm.location_id);
      const temp = parseFloat(logForm.temperature_c);
      const isBreach = loc
        ? (temp < loc.min_limit_c || temp > loc.max_limit_c)
        : false;
      const severity = isBreach
        ? (Math.abs(temp - (temp < loc.min_limit_c ? loc.min_limit_c : loc.max_limit_c)) > 5 ? 'critical' : 'major')
        : null;

      const { error } = await supabase.from('temperature_logs').insert({
        tenant_id: tenantId, // RULE 0F
        location: loc?.name || logForm.location_id,
        location_type: loc?.location_type || 'refrigerated',
        temperature_c: temp,
        recorded_at: new Date().toISOString(),
        min_limit_c: loc?.min_limit_c,
        max_limit_c: loc?.max_limit_c,
        is_breach: isBreach,
        breach_severity: severity,
        corrective_action: logForm.corrective_action || null,
        affected_lots: logForm.affected_lots
          ? logForm.affected_lots.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        notes: logForm.notes || null,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      // Write system_alert if breach
      if (isBreach) {
        await supabase.from('system_alerts').insert({
          tenant_id: tenantId,
          alert_type: 'cold_chain_breach',
          severity: severity === 'critical' ? 'critical' : 'warning',
          message: `Cold chain breach: ${loc?.name} — ${temp}°C (limit: ${loc?.min_limit_c}–${loc?.max_limit_c}°C)`,
          created_at: new Date().toISOString(),
        });
        showToast(`⚠️ BREACH logged — ${temp}°C outside limit. System alert raised.`, 'error');
      } else {
        showToast(`✅ Temperature logged — ${temp}°C within limits`);
      }
      setShowLogForm(false);
      setLogForm(emptyLog);
      setSelectedLocation(null);
      fetchAll();
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function openLogForm(location) {
    setSelectedLocation(location);
    setLogForm({ ...emptyLog, location_id: location.id });
    setShowLogForm(true);
    setActiveTab('log');
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const breaches    = logs.filter(l => l.is_breach).length;
    const critical    = logs.filter(l => l.is_breach && l.breach_severity === 'critical').length;
    const today       = new Date().toISOString().slice(0, 10);
    const logsToday   = logs.filter(l => l.recorded_at?.slice(0, 10) === today).length;
    const last24hLogs = logs.filter(l => new Date(l.recorded_at) > new Date(Date.now() - 86400000));
    const complianceRate = last24hLogs.length > 0
      ? Math.round((last24hLogs.filter(l => !l.is_breach).length / last24hLogs.length) * 100)
      : 100;
    return { locations: locations.length, breaches, critical, logsToday, complianceRate };
  }, [locations, logs]);

  // ── Last log per location ─────────────────────────────────────────────────
  const lastLogByLocation = useMemo(() => {
    const map = {};
    for (const log of logs) {
      if (!map[log.location]) map[log.location] = log;
    }
    return map;
  }, [logs]);

  const sInput = {
    width: '100%', padding: '8px 11px', border: `1px solid ${C.border}`,
    borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
    background: C.surface, boxSizing: 'border-box', color: C.ink,
  };
  const sLabel = {
    display: 'block', fontSize: 11, fontWeight: 700, color: C.inkLight,
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em',
  };

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'log',       label: `Log Entry${logs.length > 0 ? ` (${logs.length})` : ''}` },
    { id: 'breaches',  label: `Breaches${kpis.breaches > 0 ? ` ⚠️ ${kpis.breaches}` : ''}` },
    { id: 'locations', label: `Locations (${locations.length})` },
  ];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: C.ink }}>
      <WorkflowGuide tabId="hq-cold-chain" />

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? C.redBg : '#F0FDF4',
          border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
          color: toast.type === 'error' ? C.red : '#166534',
          padding: '12px 20px', borderRadius: 8, fontWeight: 500, fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)', maxWidth: 420,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>
          🌡️ Cold Chain Intelligence
          <InfoTooltip title="Cold Chain" body="Monitor temperature-controlled storage locations. Log readings manually, detect breaches automatically. Breaches fire PlatformBar alerts and link to affected batch lot numbers for recall readiness." />
        </h2>
        <p style={{ margin: '4px 0 0', color: C.inkLight, fontSize: 14 }}>
          {kpis.locations} monitored locations · {kpis.complianceRate}% compliance (last 24h) · {kpis.breaches} total breaches
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'Locations',       value: kpis.locations,       accent: C.accent, bg: C.accentBg },
          { label: 'Compliance 24h',  value: kpis.complianceRate + '%', accent: kpis.complianceRate >= 98 ? C.accent : kpis.complianceRate >= 90 ? C.amber : C.red, bg: kpis.complianceRate >= 98 ? C.accentBg : kpis.complianceRate >= 90 ? C.amberBg : C.redBg },
          { label: 'Logs Today',      value: kpis.logsToday,       accent: C.blue,   bg: C.blueBg },
          { label: 'Total Breaches',  value: kpis.breaches,        accent: kpis.breaches > 0 ? C.amber : C.accent, bg: kpis.breaches > 0 ? C.amberBg : C.accentBg },
          { label: 'Critical',        value: kpis.critical,        accent: kpis.critical > 0 ? C.red : C.accent, bg: kpis.critical > 0 ? C.redBg : C.accentBg },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.accent}20`, borderRadius: 10, padding: '16px 20px', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.accent, letterSpacing: '-0.02em' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: k.accent, fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${C.border}`, marginBottom: 24 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontFamily: 'inherit',
            fontWeight: activeTab === tab.id ? 700 : 400,
            color: activeTab === tab.id ? C.accent : C.inkLight,
            borderBottom: activeTab === tab.id ? `2px solid ${C.accent}` : '2px solid transparent',
            marginBottom: -2,
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: C.inkLight }}>Loading cold chain data…</div>}

      {/* ── DASHBOARD TAB ─────────────────────────────────────────────────── */}
      {!loading && activeTab === 'dashboard' && (
        <div>
          {locations.length === 0 ? (
            <div style={{ background: C.accentBg, border: `1px solid ${C.accent}30`, borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌡️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginBottom: 8 }}>No monitored locations</div>
              <div style={{ fontSize: 14, color: C.inkMid, marginBottom: 20 }}>Add your cold rooms, fridges and freezers to start monitoring.</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => { setShowTemplates(true); setActiveTab('locations'); }}
                  style={{ padding: '10px 20px', background: C.amber, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                  📦 Load Default Locations
                </button>
                <button onClick={() => { setShowLocForm(true); setActiveTab('locations'); }}
                  style={{ padding: '10px 20px', background: C.accent, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                  + Add Location
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {locations.map(loc => (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  lastLog={lastLogByLocation[loc.name]}
                  onLogReading={openLogForm}
                />
              ))}
            </div>
          )}

          {/* Recent activity */}
          {logs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>Recent Readings (last 10)</div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {['Location','Temperature','Status','Date & Time','Notes'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: C.inkLight, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 10).map((log, idx) => {
                      const s = tempStatus(log.temperature_c, log.min_limit_c, log.max_limit_c);
                      return (
                        <tr key={log.id} style={{ borderTop: `1px solid ${C.border}`, background: log.is_breach ? '#FFF8F8' : idx % 2 === 0 ? C.surface : '#FCFCFB' }}>
                          <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{log.location}</td>
                          <td style={{ padding: '9px 12px', fontSize: 15, fontWeight: 800, color: s.color }}>{log.temperature_c}°C</td>
                          <td style={{ padding: '9px 12px' }}>
                            {log.is_breach ? (
                              <span style={{ background: C.redBg, color: C.red, border: '1px solid #FECACA', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                ⚠ {log.breach_severity?.toUpperCase()}
                              </span>
                            ) : (
                              <span style={{ background: C.accentBg, color: C.accent, border: `1px solid ${C.accent}30`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>✅ OK</span>
                            )}
                          </td>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: C.inkLight }}>{fmtDateTime(log.recorded_at)}</td>
                          <td style={{ padding: '9px 12px', fontSize: 11, color: C.inkLight }}>{log.notes || (log.corrective_action ? `Action: ${log.corrective_action.substring(0, 40)}` : '—')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LOG ENTRY TAB ─────────────────────────────────────────────────── */}
      {!loading && activeTab === 'log' && (
        <div>
          <button onClick={() => { setShowLogForm(true); setLogForm(emptyLog); }}
            style={{ padding: '9px 18px', background: C.accent, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', marginBottom: 18 }}>
            📝 Log Temperature Reading
          </button>

          {/* Log form */}
          {showLogForm && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700 }}>Log Temperature Reading</h3>

              {locations.length === 0 ? (
                <div style={{ color: C.amber, fontSize: 13 }}>No locations configured. Add locations in the Locations tab first.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={sLabel}>Location *</label>
                      <select value={logForm.location_id}
                        onChange={e => {
                          const loc = locations.find(l => l.id === e.target.value);
                          setLogForm(f => ({ ...f, location_id: e.target.value }));
                          setSelectedLocation(loc || null);
                        }}
                        style={sInput}>
                        <option value="">Select location…</option>
                        {locations.map(l => {
                          const lt = getLocationType(l.location_type);
                          return <option key={l.id} value={l.id}>{lt.icon} {l.name} ({l.min_limit_c}°C — {l.max_limit_c}°C)</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label style={sLabel}>
                        Temperature (°C) *
                        <InfoTooltip title="Temperature" body="Enter the actual thermometer reading. Breach is automatically detected if outside the location's critical limits." />
                      </label>
                      <input type="number" step="0.1" value={logForm.temperature_c}
                        onChange={e => setLogForm(f => ({ ...f, temperature_c: e.target.value }))}
                        placeholder="e.g. 4.2"
                        style={{ ...sInput, fontSize: 18, fontWeight: 700 }} />
                    </div>
                  </div>

                  {/* Live breach preview */}
                  {selectedLocation && logForm.temperature_c !== '' && (() => {
                    const temp = parseFloat(logForm.temperature_c);
                    const s = tempStatus(temp, selectedLocation.min_limit_c, selectedLocation.max_limit_c);
                    return (
                      <div style={{ background: s.ok ? C.accentBg : C.redBg, border: `1px solid ${s.ok ? C.accent + '30' : '#FECACA'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: s.ok ? C.accent : C.red }}>
                          {s.ok ? '✅ Within critical limits' : `⚠️ BREACH — ${temp}°C outside ${selectedLocation.min_limit_c}–${selectedLocation.max_limit_c}°C range`}
                        </div>
                        {!s.ok && <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>A PlatformBar system alert will be raised automatically.</div>}
                      </div>
                    );
                  })()}

                  {/* Corrective action if breach */}
                  {selectedLocation && logForm.temperature_c !== '' &&
                    parseFloat(logForm.temperature_c) !== 0 &&
                    (parseFloat(logForm.temperature_c) < selectedLocation.min_limit_c ||
                     parseFloat(logForm.temperature_c) > selectedLocation.max_limit_c) && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ ...sLabel, color: C.red }}>Immediate Corrective Action *</label>
                      <input value={logForm.corrective_action}
                        onChange={e => setLogForm(f => ({ ...f, corrective_action: e.target.value }))}
                        placeholder="e.g. Reduced temperature set point. Called refrigeration engineer."
                        style={sInput} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div>
                      <label style={sLabel}>Affected Batch Lot Numbers (comma-separated)</label>
                      <input value={logForm.affected_lots}
                        onChange={e => setLogForm(f => ({ ...f, affected_lots: e.target.value }))}
                        placeholder="e.g. LOT-20260325-001, LOT-20260325-002"
                        style={sInput} />
                    </div>
                    <div>
                      <label style={sLabel}>Notes</label>
                      <input value={logForm.notes}
                        onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Additional observations…"
                        style={sInput} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleSaveLog} disabled={saving}
                      style={{ padding: '9px 20px', background: C.accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
                      {saving ? 'Saving…' : 'Save Reading'}
                    </button>
                    <button onClick={() => { setShowLogForm(false); setLogForm(emptyLog); setSelectedLocation(null); }}
                      style={{ padding: '9px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Full log table */}
          {logs.length === 0 && !showLogForm ? (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '40px 24px', textAlign: 'center', color: C.inkLight }}>
              No temperature readings yet. Click "Log Temperature Reading" to start.
            </div>
          ) : logs.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Date & Time','Location','Temp','Range','Status','Corrective Action','Lots Affected'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: C.inkLight, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => {
                    const s = tempStatus(log.temperature_c, log.min_limit_c, log.max_limit_c);
                    return (
                      <tr key={log.id} style={{ borderTop: `1px solid ${C.border}`, background: log.is_breach ? '#FFF8F8' : idx % 2 === 0 ? C.surface : '#FCFCFB' }}>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: C.inkLight }}>{fmtDateTime(log.recorded_at)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{log.location}</td>
                        <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 900, color: s.color }}>{log.temperature_c}°C</td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: C.inkLight }}>{log.min_limit_c !== null ? `${log.min_limit_c}–${log.max_limit_c}°C` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {log.is_breach ? (
                            <span style={{ background: C.redBg, color: C.red, border: '1px solid #FECACA', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                              ⚠ {log.breach_severity?.toUpperCase()}
                            </span>
                          ) : (
                            <span style={{ background: C.accentBg, color: C.accent, border: `1px solid ${C.accent}30`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>✅ OK</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: C.inkMid }}>{log.corrective_action || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 11, color: C.inkLight, fontFamily: 'monospace' }}>
                          {log.affected_lots?.length > 0 ? log.affected_lots.join(', ') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BREACHES TAB ──────────────────────────────────────────────────── */}
      {!loading && activeTab === 'breaches' && (
        <div>
          {logs.filter(l => l.is_breach).length === 0 ? (
            <div style={{ background: C.accentBg, border: `1px solid ${C.accent}30`, borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>No temperature breaches recorded</div>
              <div style={{ fontSize: 13, color: C.inkMid, marginTop: 6 }}>All readings within critical limits.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {logs.filter(l => l.is_breach).map(log => (
                <div key={log.id} style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: 10, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ background: C.red, color: '#fff', borderRadius: 4, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                          ⚠ {log.breach_severity?.toUpperCase()} BREACH
                        </span>
                        <span style={{ fontSize: 12, color: C.inkLight }}>{fmtDateTime(log.recorded_at)}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.red }}>
                        {log.location}: {log.temperature_c}°C
                        <span style={{ fontSize: 12, fontWeight: 400, color: C.inkMid, marginLeft: 8 }}>
                          (limit: {log.min_limit_c}–{log.max_limit_c}°C)
                        </span>
                      </div>
                      {log.corrective_action && (
                        <div style={{ fontSize: 12, color: C.inkMid, marginTop: 6 }}>
                          <span style={{ fontWeight: 600 }}>Action taken:</span> {log.corrective_action}
                        </div>
                      )}
                      {log.affected_lots?.length > 0 && (
                        <div style={{ fontSize: 12, color: C.inkMid, marginTop: 4 }}>
                          <span style={{ fontWeight: 600 }}>Affected lots:</span>
                          {' '}{log.affected_lots.map(lot => (
                            <span key={lot} style={{ fontFamily: 'monospace', background: '#fff', border: '1px solid #FECACA', borderRadius: 3, padding: '1px 6px', marginRight: 4, fontSize: 11 }}>{lot}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LOCATIONS TAB ─────────────────────────────────────────────────── */}
      {!loading && activeTab === 'locations' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <button onClick={() => { setShowLocForm(true); setLocForm(emptyLoc); }}
              style={{ padding: '9px 18px', background: C.accent, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
              + Add Location
            </button>
            {locations.length === 0 && (
              <button onClick={() => setShowTemplates(true)}
                style={{ padding: '9px 18px', background: C.amberBg, color: C.amber, border: `1px solid #FDE68A`, borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
                📦 Load Default Locations
              </button>
            )}
          </div>

          {/* Default locations template */}
          {showTemplates && (
            <div style={{ background: C.amberBg, border: `1px solid #FDE68A`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.amber, marginBottom: 10 }}>📦 Default Cold Chain Locations</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {DEFAULT_LOCATIONS.map(l => {
                  const lt = getLocationType(l.location_type);
                  return (
                    <span key={l.name} style={{ background: lt.bg, color: lt.color, border: `1px solid ${lt.color}30`, borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                      {lt.icon} {l.name} ({l.min_limit_c}–{l.max_limit_c}°C)
                    </span>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSeedLocations} disabled={saving}
                  style={{ padding: '9px 18px', background: C.amber, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
                  {saving ? 'Adding…' : `✅ Add All ${DEFAULT_LOCATIONS.length} Locations`}
                </button>
                <button onClick={() => setShowTemplates(false)}
                  style={{ padding: '9px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add location form */}
          {showLocForm && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700 }}>Add Monitored Location</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={sLabel}>Location Name *</label>
                  <input value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Walk-in Fridge 1" style={sInput} />
                </div>
                <div>
                  <label style={sLabel}>Type</label>
                  <select value={locForm.location_type}
                    onChange={e => {
                      const lt = getLocationType(e.target.value);
                      setLocForm(f => ({ ...f, location_type: e.target.value, min_limit_c: lt.defaultMin, max_limit_c: lt.defaultMax }));
                    }}
                    style={sInput}>
                    {LOCATION_TYPES.map(lt => <option key={lt.key} value={lt.key}>{lt.icon} {lt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={sLabel}>Min Limit (°C)</label>
                  <input type="number" step="0.5" value={locForm.min_limit_c}
                    onChange={e => setLocForm(f => ({ ...f, min_limit_c: e.target.value }))}
                    style={sInput} />
                </div>
                <div>
                  <label style={sLabel}>Max Limit (°C)</label>
                  <input type="number" step="0.5" value={locForm.max_limit_c}
                    onChange={e => setLocForm(f => ({ ...f, max_limit_c: e.target.value }))}
                    style={sInput} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={sLabel}>Description</label>
                <input value={locForm.description} onChange={e => setLocForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Main cold storage for dairy and perishables"
                  style={sInput} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSaveLocation} disabled={saving}
                  style={{ padding: '9px 20px', background: C.accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
                  {saving ? 'Saving…' : 'Add Location'}
                </button>
                <button onClick={() => { setShowLocForm(false); setLocForm(emptyLoc); }}
                  style={{ padding: '9px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Locations list */}
          {locations.length === 0 && !showLocForm && !showTemplates ? (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '40px 24px', textAlign: 'center', color: C.inkLight, fontSize: 14 }}>
              No monitored locations yet. Add locations or load defaults above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {locations.map(loc => {
                const lt = getLocationType(loc.location_type);
                const locLogs = logs.filter(l => l.location === loc.name);
                const breachCount = locLogs.filter(l => l.is_breach).length;
                return (
                  <div key={loc.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 24 }}>{lt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{loc.name}</div>
                        <div style={{ fontSize: 12, color: C.inkLight }}>{loc.description || lt.label}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: C.inkLight }}>Limits</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: lt.color }}>{loc.min_limit_c}°C — {loc.max_limit_c}°C</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: C.inkLight }}>{locLogs.length} readings</div>
                        {breachCount > 0 && <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>{breachCount} breaches</div>}
                      </div>
                      <button onClick={() => openLogForm(loc)}
                        style={{ padding: '7px 14px', background: C.accent, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 700 }}>
                        📝 Log
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
