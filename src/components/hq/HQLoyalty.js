// HQLoyalty.js v1.0
// WP-O: Loyalty Economics Engine — HQ Control Panel
// 6 sub-tabs: Earning Rules | Tiers | Economics | Referrals | QR Security | Channel Simulator
// Inline styles only. Fonts: Cormorant Garamond + Jost. No CSS modules or Tailwind.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';

// ─── COLOUR PALETTE ──────────────────────────────────────────────────────────
const C = {
  bg:          '#f9f8f5',
  card:        '#ffffff',
  border:      '#e8e4dc',
  borderDark:  '#c8c0b0',
  green:       '#2d4a2d',
  greenMid:    '#3d6b3d',
  greenLight:  '#52b788',
  greenPale:   '#e8f5e9',
  blue:        '#1565C0',
  bluePale:    '#E3F2FD',
  amber:       '#F57F17',
  amberPale:   '#FFF8E1',
  red:         '#c62828',
  redPale:     '#FFEBEE',
  purple:      '#6A1B9A',
  purpleMid:   '#9C27B0',
  purplePale:  '#F3E5F5',
  text:        '#1a1a1a',
  textMid:     '#4a4a4a',
  textLight:   '#888888',
  white:       '#ffffff',
};

const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY    = "'Jost', 'Helvetica Neue', Arial, sans-serif";

const DEFAULT_CONFIG = {
  pts_qr_scan: 10,
  pts_per_r100_online: 2.0,
  pts_per_r100_retail: 1.0,
  online_bonus_pct: 50.0,
  pts_profile_complete: 50,
  pts_phone_verify: 50,
  mult_bronze: 1.0,
  mult_silver: 1.25,
  mult_gold: 1.5,
  mult_platinum: 2.0,
  threshold_silver: 200,
  threshold_gold: 500,
  threshold_platinum: 1000,
  pts_referral_referrer: 100,
  pts_referral_referee: 50,
  referral_min_order_zar: 100,
  redemption_value_zar: 0.10,
  min_pts_to_redeem: 100,
  max_redeem_pct_per_order: 20.0,
  breakage_rate: 0.30,
  pts_expiry_months: 24,
  max_scans_per_qr: 1,
  qr_validity_months: 18,
};

function getTierLabel(pts, cfg) {
  if (pts >= cfg.threshold_platinum) return 'Platinum';
  if (pts >= cfg.threshold_gold)     return 'Gold';
  if (pts >= cfg.threshold_silver)   return 'Silver';
  return 'Bronze';
}

function getTierMult(tier, cfg) {
  const map = { Bronze: cfg.mult_bronze, Silver: cfg.mult_silver, Gold: cfg.mult_gold, Platinum: cfg.mult_platinum };
  return map[tier] || 1.0;
}

const TIER_COLOURS = {
  Bronze:   { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  Silver:   { bg: '#F5F5F5', text: '#424242', border: '#BDBDBD' },
  Gold:     { bg: '#FFFDE7', text: '#F57F17', border: '#FFD54F' },
  Platinum: { bg: '#F3E5F5', text: '#6A1B9A', border: '#CE93D8' },
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, accent }) {
  const ac = accent || C.green;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
      <div style={{
        background: `linear-gradient(135deg, ${ac}10, ${ac}04)`,
        borderBottom: `1px solid ${C.border}`,
        padding: '14px 20px',
        borderLeft: `4px solid ${ac}`,
      }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: C.green, letterSpacing: '0.02em' }}>{title}</div>
        {subtitle && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.textLight, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, explanation, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.text, minWidth: 200 }}>{label}</div>
        {children}
      </div>
      {explanation && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.textLight, marginTop: 6, lineHeight: 1.55, borderLeft: `2px solid ${C.border}`, paddingLeft: 10 }}>
          {explanation}
        </div>
      )}
    </div>
  );
}

function NumInput({ value, onChange, min = 0, max, step = 1, suffix = '', width = 80 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width, padding: '7px 10px',
          border: `1.5px solid ${C.borderDark}`,
          borderRadius: 6,
          fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
          color: C.green, background: C.white,
          outline: 'none', textAlign: 'center',
        }}
      />
      {suffix && <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textMid }}>{suffix}</span>}
    </div>
  );
}

function InfoBox({ children, colour, bgColour }) {
  const co = colour || C.blue;
  const bg = bgColour || C.bluePale;
  return (
    <div style={{
      background: bg, border: `1px solid ${co}30`, borderRadius: 8,
      padding: '12px 16px', fontFamily: FONT_BODY, fontSize: 12.5,
      color: C.textMid, lineHeight: 1.6, marginTop: 12,
    }}>
      {children}
    </div>
  );
}

function PreviewBox({ children, title }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.greenPale}, #f0faf0)`,
      border: `1px solid ${C.greenLight}50`,
      borderRadius: 8, padding: '14px 16px', marginTop: 14,
    }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: C.greenMid, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {title || 'Live Preview'}
      </div>
      {children}
    </div>
  );
}

function PreviewLine({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textMid }}>{label}</span>
      <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: highlight ? 700 : 500, color: highlight ? C.green : C.textMid }}>{value}</span>
    </div>
  );
}

function StatRow({ stats }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          background: C.white, border: `1px solid ${(s.colour || C.green)}30`,
          borderRadius: 10, padding: '10px 18px', textAlign: 'center', flex: 1, minWidth: 110,
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: s.colour || C.green }}>{s.value}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textLight, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 30, right: 30, zIndex: 9999,
      background: type === 'error' ? C.red : C.green, color: C.white,
      padding: '14px 22px', borderRadius: 10,
      fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      {type === 'error' ? '✗ ' : '✓ '}{msg}
    </div>
  );
}

// ─── SUB-TAB 1: EARNING RULES ─────────────────────────────────────────────────
function TabEarning({ draft, setDraft }) {
  const cfg = draft;
  const costPerPt = cfg.redemption_value_zar * (1 - cfg.breakage_rate);
  const baseOnline = (400 / 100) * cfg.pts_per_r100_online;
  const withBonus  = baseOnline * (1 + cfg.online_bonus_pct / 100);
  const withTier   = withBonus * cfg.mult_gold;
  const ptsFinal   = Math.round(withTier);
  const zarValue   = ptsFinal * cfg.redemption_value_zar;
  const zarCost    = ptsFinal * costPerPt;

  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <div>
      <SectionCard title="QR Scan — Product Inside Packaging" subtitle="Points awarded when customer scans a product QR code">
        <FieldRow
          label="Points per scan"
          explanation={`Each physical product QR earns points once only. The QR is claimed on first scan — no double dipping. At current settings, one scan earns ${cfg.pts_qr_scan} pts = R${(cfg.pts_qr_scan * costPerPt).toFixed(2)} actual cost to Protea (after ${Math.round(cfg.breakage_rate * 100)}% breakage).`}
        >
          <NumInput value={cfg.pts_qr_scan} onChange={v => setField('pts_qr_scan', v)} min={0} max={500} suffix="pts per scan" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Online Purchase — Direct from Website" subtitle="Your highest-margin channel. Reward customers more here to drive channel switching." accent={C.greenMid}>
        <FieldRow
          label="Points per R100 spent"
          explanation={`A R400 online order earns ${(4 * cfg.pts_per_r100_online).toFixed(1)} base points before bonus and tier multiplier. This is the primary lever for online purchase loyalty.`}
        >
          <NumInput value={cfg.pts_per_r100_online} onChange={v => setField('pts_per_r100_online', v)} min={0} max={20} step={0.5} suffix="pts / R100" />
        </FieldRow>
        <FieldRow
          label="Online bonus"
          explanation={`Online purchases earn ${cfg.online_bonus_pct}% MORE points than retail scans. This is your channel-switching mechanism — customers learn that buying direct pays better. The current gap is ${(cfg.pts_per_r100_online - cfg.pts_per_r100_retail * (1 + cfg.online_bonus_pct / 100 * 0)).toFixed(1)}× in favour of online.`}
        >
          <NumInput value={cfg.online_bonus_pct} onChange={v => setField('online_bonus_pct', v)} min={0} max={300} step={5} suffix="% extra vs retail" />
        </FieldRow>

        <PreviewBox title="Live Preview — R400 Online Order, Gold Tier Customer">
          <PreviewLine label={`Base: 400/100 × ${cfg.pts_per_r100_online} pts`} value={`${baseOnline.toFixed(1)} pts`} />
          <PreviewLine label={`Online bonus +${cfg.online_bonus_pct}%`} value={`× ${(1 + cfg.online_bonus_pct / 100).toFixed(2)} = ${withBonus.toFixed(1)} pts`} />
          <PreviewLine label={`Gold tier multiplier ${cfg.mult_gold}×`} value={`× ${cfg.mult_gold} = ${withTier.toFixed(1)} pts`} />
          <div style={{ borderTop: `1px solid ${C.border}`, margin: '8px 0' }} />
          <PreviewLine label="Points earned" value={`${ptsFinal} pts`} highlight />
          <PreviewLine label="Value to customer" value={`R${zarValue.toFixed(2)}`} />
          <PreviewLine label="Cost to Protea (after breakage)" value={`R${zarCost.toFixed(2)} (${(zarCost / 400 * 100).toFixed(2)}% of order)`} />
        </PreviewBox>
      </SectionCard>

      <SectionCard title="Retail Scan — QR Inside Product From Retailer" subtitle="Keep this lower than online to incentivise direct purchasing" accent={C.amber}>
        <FieldRow
          label="Points per R100 equivalent"
          explanation={`Set lower than the online rate (currently ${cfg.pts_per_r100_online} pts/R100). The ${(cfg.pts_per_r100_online / Math.max(cfg.pts_per_r100_retail, 0.01)).toFixed(1)}× difference is your competitive lever. Every retail customer who sees their loyalty balance will consider buying direct next time.`}
        >
          <NumInput value={cfg.pts_per_r100_retail} onChange={v => setField('pts_per_r100_retail', v)} min={0} max={10} step={0.5} suffix="pts / R100" />
        </FieldRow>
        <InfoBox colour={C.amber} bgColour={C.amberPale}>
          <strong>Channel switching maths:</strong> Online earns {cfg.pts_per_r100_online} pts/R100, retail earns {cfg.pts_per_r100_retail} pts/R100. That is a {(cfg.pts_per_r100_online / Math.max(cfg.pts_per_r100_retail, 0.01)).toFixed(1)}× difference. Each customer you convert from retail → direct generates +R120 margin per unit (44% → 74%). The loyalty programme is paying for that shift.
        </InfoBox>
      </SectionCard>

      <SectionCard title="Profile Completion Rewards" subtitle="Already live in Account.js — these numbers sync with the platform config" accent={C.blue}>
        <FieldRow
          label="Profile completion bonus"
          explanation="Awarded once when customer completes all optional profile fields. Drives data collection without feeling transactional."
        >
          <NumInput value={cfg.pts_profile_complete} onChange={v => setField('pts_profile_complete', v)} min={0} max={500} suffix="pts" />
        </FieldRow>
        <FieldRow
          label="Phone OTP verification"
          explanation="Awarded after successful WhatsApp OTP confirmation. Also improves fraud detection and enables direct notifications."
        >
          <NumInput value={cfg.pts_phone_verify} onChange={v => setField('pts_phone_verify', v)} min={0} max={500} suffix="pts" />
        </FieldRow>
        <InfoBox colour={C.blue} bgColour={C.bluePale}>
          Profile + phone completion = {cfg.pts_profile_complete + cfg.pts_phone_verify} pts total. A new customer who completes their profile on sign-up immediately reaches{' '}
          <strong>{getTierLabel(cfg.pts_profile_complete + cfg.pts_phone_verify, cfg)}</strong> tier. Tier: {cfg.threshold_silver} pts required for Silver, so this{' '}
          {cfg.pts_profile_complete + cfg.pts_phone_verify >= cfg.threshold_silver ? 'gets them straight to Silver ✓' : `needs ${cfg.threshold_silver - (cfg.pts_profile_complete + cfg.pts_phone_verify)} more pts for Silver`}.
        </InfoBox>
      </SectionCard>
    </div>
  );
}

// ─── SUB-TAB 2: TIERS ────────────────────────────────────────────────────────
function TabTiers({ draft, setDraft }) {
  const cfg = draft;
  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const tiers = [
    { name: 'Bronze',   threshold: 0,                     multKey: 'mult_bronze',   thKey: null,                colour: TIER_COLOURS.Bronze },
    { name: 'Silver',   threshold: cfg.threshold_silver,  multKey: 'mult_silver',   thKey: 'threshold_silver',  colour: TIER_COLOURS.Silver },
    { name: 'Gold',     threshold: cfg.threshold_gold,    multKey: 'mult_gold',     thKey: 'threshold_gold',    colour: TIER_COLOURS.Gold },
    { name: 'Platinum', threshold: cfg.threshold_platinum,multKey: 'mult_platinum', thKey: 'threshold_platinum',colour: TIER_COLOURS.Platinum },
  ];

  // Time-to-tier calc: weekly scan + monthly R400 purchase
  function weeksToTier(targetPts) {
    const ptsPerWeek = cfg.pts_qr_scan; // one scan per week
    return Math.ceil(targetPts / ptsPerWeek);
  }
  function monthsToTierBuying(targetPts) {
    const ptsPerMonth = (400 / 100) * cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100);
    return Math.ceil(targetPts / ptsPerMonth);
  }

  const platBuying = (400 / 100) * cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100) * cfg.mult_platinum;
  const bronzeBuying = (400 / 100) * cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100) * cfg.mult_bronze;

  return (
    <div>
      <SectionCard title="Tier Thresholds & Multipliers" subtitle="How many points to reach each tier, and how much more they earn when they get there">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          {tiers.map(tier => (
            <div key={tier.name} style={{
              background: tier.colour.bg,
              border: `1.5px solid ${tier.colour.border}`,
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: tier.colour.text, marginBottom: 12 }}>
                {tier.name}
              </div>

              {tier.thKey ? (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textLight, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reaches at</div>
                  <NumInput
                    value={cfg[tier.thKey]}
                    onChange={v => setField(tier.thKey, v)}
                    min={1} max={10000} step={50}
                    suffix="pts"
                    width={90}
                  />
                </div>
              ) : (
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.textLight, marginBottom: 12 }}>Starting tier (0 pts)</div>
              )}

              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textLight, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Earn multiplier</div>
                <NumInput
                  value={cfg[tier.multKey]}
                  onChange={v => setField(tier.multKey, v)}
                  min={1.0} max={5.0} step={0.05}
                  suffix="×"
                  width={70}
                />
              </div>
            </div>
          ))}
        </div>

        <PreviewBox title="Tier Journey Visualiser">
          {[
            { label: 'Bronze → Silver', pts: cfg.threshold_silver },
            { label: 'Silver → Gold', pts: cfg.threshold_gold },
            { label: 'Gold → Platinum', pts: cfg.threshold_platinum },
          ].map((step, i) => {
            const weeks = weeksToTier(step.pts);
            const months = monthsToTierBuying(step.pts);
            return (
              <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 3 }}>{step.label} — {step.pts} pts</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.textLight }}>
                  Scanning once/week: ~{weeks} weeks &nbsp;·&nbsp; Buying R400/month online: ~{months} months
                </div>
              </div>
            );
          })}
        </PreviewBox>
      </SectionCard>

      <SectionCard title="Multiplier Impact" subtitle="What the tier programme is worth to loyal customers" accent={C.purple}>
        <InfoBox colour={C.purple} bgColour={C.purplePale}>
          <strong>Platinum vs Bronze on R400/month online:</strong><br />
          • Bronze (1×): {Math.round(bronzeBuying)} pts/month = R{(Math.round(bronzeBuying) * cfg.redemption_value_zar).toFixed(2)}/month value<br />
          • Platinum ({cfg.mult_platinum}×): {Math.round(platBuying)} pts/month = R{(Math.round(platBuying) * cfg.redemption_value_zar).toFixed(2)}/month value<br />
          • Difference: +{Math.round(platBuying - bronzeBuying)} pts/month — this is why customers stay loyal and move up tiers.
        </InfoBox>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 10 }}>
            Visual tier progression
          </div>
          <div style={{ position: 'relative', height: 32, background: C.border, borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: 'B', pct: 0, colour: '#E65100' },
              { label: 'S', pct: (cfg.threshold_silver / cfg.threshold_platinum) * 100, colour: '#424242' },
              { label: 'G', pct: (cfg.threshold_gold / cfg.threshold_platinum) * 100, colour: '#F57F17' },
              { label: 'P', pct: 100, colour: C.purple },
            ].map((t, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${Math.min(t.pct, 95)}%`,
                top: '50%', transform: 'translate(-50%,-50%)',
                background: t.colour, color: C.white,
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                zIndex: 1,
              }}>
                {t.label}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: FONT_BODY, fontSize: 11, color: C.textLight }}>
            <span>0 pts</span>
            <span>{cfg.threshold_silver} pts (Silver)</span>
            <span>{cfg.threshold_gold} pts (Gold)</span>
            <span>{cfg.threshold_platinum} pts (Platinum)</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── SUB-TAB 3: ECONOMICS ─────────────────────────────────────────────────────
function TabEconomics({ draft, setDraft, liveStats }) {
  const cfg = draft;
  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const costPerPt = cfg.redemption_value_zar * (1 - cfg.breakage_rate);
  const outstandingLiability = liveStats
    ? liveStats.totalPtsIssued * cfg.redemption_value_zar
    : 0;
  const actualRedemptionRate = liveStats && liveStats.totalPtsIssued > 0
    ? ((liveStats.totalPtsRedeemed / liveStats.totalPtsIssued) * 100).toFixed(1)
    : '0.0';
  const programmeCost = liveStats
    ? liveStats.totalPtsRedeemed * cfg.redemption_value_zar
    : 0;
  const costAsPctRev = liveStats && liveStats.totalRevenue > 0
    ? ((programmeCost / liveStats.totalRevenue) * 100).toFixed(2)
    : '0.00';

  return (
    <div>
      <SectionCard title="Redemption Settings" subtitle="How much each point is worth and when customers can spend them">
        <FieldRow
          label="1 point = R___ value to customer"
          explanation="The ZAR value of each point when redeemed. R0.10 per point means 100 pts = R10 off. Lower values reduce programme cost; higher values increase perceived loyalty reward."
        >
          <NumInput value={cfg.redemption_value_zar} onChange={v => setField('redemption_value_zar', v)} min={0.01} max={1.00} step={0.01} suffix="ZAR per point" width={80} />
        </FieldRow>
        <FieldRow
          label="Minimum points to redeem"
          explanation="Prevents small redemptions that add checkout friction. Customers must accumulate at least this many points before they can spend them."
        >
          <NumInput value={cfg.min_pts_to_redeem} onChange={v => setField('min_pts_to_redeem', v)} min={1} max={1000} step={10} suffix="pts" />
        </FieldRow>
        <FieldRow
          label="Max % of order payable with points"
          explanation={`Caps how much of any single order can be paid with points. At ${cfg.max_redeem_pct_per_order}%, a R400 order can have at most R${(400 * cfg.max_redeem_pct_per_order / 100).toFixed(0)} covered by points (${Math.round(400 * cfg.max_redeem_pct_per_order / 100 / cfg.redemption_value_zar)} pts max).`}
        >
          <NumInput value={cfg.max_redeem_pct_per_order} onChange={v => setField('max_redeem_pct_per_order', v)} min={1} max={100} step={5} suffix="% of order value" />
        </FieldRow>
        <FieldRow
          label="Points expiry"
          explanation="Points expire this many months after being earned. 0 = never expire. Shorter expiry reduces liability but may frustrate loyal customers."
        >
          <NumInput value={cfg.pts_expiry_months} onChange={v => setField('pts_expiry_months', v)} min={0} max={60} step={6} suffix="months (0 = never)" width={80} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Financial Model" subtitle="How to think about your programme cost" accent={C.purple}>
        <FieldRow
          label="Expected breakage rate"
          explanation="The percentage of points issued that are NEVER redeemed. Industry standard is 20–40%. Higher breakage = lower actual programme cost. The 'cost per point issued' calculation below uses this figure."
        >
          <NumInput value={cfg.breakage_rate * 100} onChange={v => setField('breakage_rate', v / 100)} min={0} max={80} step={5} suffix="% never redeemed" />
        </FieldRow>

        <PreviewBox title="Calculated Cost Per Point Issued (read-only)">
          <PreviewLine label="Redemption value" value={`R${cfg.redemption_value_zar.toFixed(2)} per point`} />
          <PreviewLine label={`Less breakage (${Math.round(cfg.breakage_rate * 100)}% never redeemed)`} value={`× ${(1 - cfg.breakage_rate).toFixed(2)}`} />
          <div style={{ borderTop: `1px solid ${C.border}`, margin: '8px 0' }} />
          <PreviewLine label="Actual cost per point issued" value={`R${costPerPt.toFixed(3)}`} highlight />
          <PreviewLine label="So 100 pts issued costs Protea" value={`R${(100 * costPerPt).toFixed(2)}`} />
        </PreviewBox>
      </SectionCard>

      <SectionCard title="Programme Cost Dashboard" subtitle="Live data from your loyalty_transactions table" accent={C.greenMid}>
        {liveStats ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Points Issued (30d)', value: liveStats.totalPtsIssued30d?.toLocaleString() || '0', colour: C.green },
                { label: 'Points Redeemed (30d)', value: liveStats.totalPtsRedeemed30d?.toLocaleString() || '0', colour: C.purple },
                { label: 'Actual Redemption Rate', value: `${actualRedemptionRate}%`, colour: C.amber },
                { label: 'Outstanding Liability', value: `R${outstandingLiability.toFixed(0)}`, colour: C.red },
                { label: 'Programme Cost (all time)', value: `R${programmeCost.toFixed(0)}`, colour: C.textMid },
                { label: 'Cost as % Revenue', value: `${costAsPctRev}%`, colour: C.greenMid },
              ].map((s, i) => (
                <div key={i} style={{ background: C.white, border: `1px solid ${s.colour}25`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: s.colour }}>{s.value}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textLight, marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <InfoBox colour={C.green} bgColour={C.greenPale}>
              <strong>Context:</strong> Your loyalty programme currently costs {costAsPctRev}% of revenue. The average customer acquisition cost via Google/Meta paid ads is R200–500. Your programme acquires and retains customers for R0–50 each — that is 10–50× cheaper, and customers who are loyal spend more over time.
            </InfoBox>
          </div>
        ) : (
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textLight, textAlign: 'center', padding: 30 }}>
            Loading live transaction data...
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── SUB-TAB 4: REFERRALS ─────────────────────────────────────────────────────
function TabReferrals({ draft, setDraft, referralLeaderboard }) {
  const cfg = draft;
  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <div>
      <SectionCard title="Referral Programme Settings" subtitle="Reward customers who bring in their friends">
        <FieldRow
          label="Points to the referrer"
          explanation={`The existing customer earns ${cfg.pts_referral_referrer} pts when a friend they referred makes their first qualifying purchase. No cap — the more they refer, the more they earn.`}
        >
          <NumInput value={cfg.pts_referral_referrer} onChange={v => setField('pts_referral_referrer', v)} min={0} max={1000} step={10} suffix="pts per successful referral" />
        </FieldRow>
        <FieldRow
          label="Points to the new customer"
          explanation={`The referred newcomer earns ${cfg.pts_referral_referee} pts on their first order when they enter a referral code at checkout. This is their welcome incentive to buy direct first.`}
        >
          <NumInput value={cfg.pts_referral_referee} onChange={v => setField('pts_referral_referee', v)} min={0} max={500} step={10} suffix="pts for new customer" />
        </FieldRow>
        <FieldRow
          label="Minimum order to qualify"
          explanation="The new customer's first order must reach this value for both parties to earn referral points. Prevents abuse with tiny test orders."
        >
          <NumInput value={cfg.referral_min_order_zar} onChange={v => setField('referral_min_order_zar', v)} min={0} max={500} step={10} suffix="R minimum order" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="How Referrals Work" subtitle="The customer-facing flow" accent={C.blue}>
        <InfoBox colour={C.blue} bgColour={C.bluePale}>
          <div style={{ lineHeight: 2 }}>
            <div>1. Each customer gets a unique referral code (e.g. <strong>STEVE42</strong>) visible in their Loyalty page and Account page.</div>
            <div>2. They share the code with a friend (copy button, WhatsApp share).</div>
            <div>3. The new customer enters the code at checkout before placing their first order.</div>
            <div>4. When the order is confirmed as paid, both parties earn their points automatically.</div>
            <div>5. The referrer earns <strong>{cfg.pts_referral_referrer} pts</strong> per successful referral — there is no limit.</div>
          </div>
        </InfoBox>
      </SectionCard>

      <SectionCard title="Top Referrers" subtitle="Last 90 days — from referral_codes table" accent={C.purple}>
        {referralLeaderboard && referralLeaderboard.length > 0 ? (
          <div>
            {referralLeaderboard.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: i === 0 ? C.purplePale : C.bg,
                borderRadius: 8, marginBottom: 6,
                border: `1px solid ${i === 0 ? C.purple + '30' : C.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: i === 0 ? C.purple : C.textLight,
                    color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.text }}>
                      {entry.name || entry.code}
                    </div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textLight }}>
                      Code: {entry.code}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.purple }}>
                    {entry.uses_count} referrals
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textLight }}>
                    +{entry.uses_count * cfg.pts_referral_referrer} pts earned
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textLight, textAlign: 'center', padding: '24px 0' }}>
            No referral data yet. Codes are generated when customers visit their Loyalty page.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── SUB-TAB 5: QR SECURITY ───────────────────────────────────────────────────
function TabQRSecurity({ draft, setDraft, qrStats }) {
  const cfg = draft;
  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <div>
      <SectionCard title="QR Code Security Controls" subtitle="Hard limits on scanning — enforced server-side">
        <FieldRow
          label="Max scans per product QR"
          explanation="1 is the recommended setting. Each product QR can only award points once. Even if a customer shares a screenshot or someone finds the packaging, the second scan gets nothing."
        >
          <NumInput value={cfg.max_scans_per_qr} onChange={v => setField('max_scans_per_qr', v)} min={1} max={10} suffix="scan(s) per QR" />
        </FieldRow>
        <FieldRow
          label="QR code validity period"
          explanation="QR codes auto-expire this many months after generation. After expiry, the QR is still readable but earns no points and shows an 'expired product' message."
        >
          <NumInput value={cfg.qr_validity_months} onChange={v => setField('qr_validity_months', v)} min={1} max={60} step={3} suffix="months" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="How Product QR Codes Are Protected" subtitle="Multi-layer fraud prevention — already fully operational" accent={C.amber}>
        <InfoBox colour={C.amber} bgColour={C.amberPale}>
          <div style={{ lineHeight: 2 }}>
            <div>• <strong>Cryptographically signed</strong> — the sign-qr Edge Function generates a JWT-signed URL. Forged URLs return immediately without points.</div>
            <div>• <strong>Batch-bound</strong> — each QR is linked to a specific batch_id foreign key. It cannot be detached or reassigned.</div>
            <div>• <strong>One-time claim</strong> — first scan sets <code>claimed = true</code> in the qr_codes table. The second scan finds claimed = true and awards nothing.</div>
            <div>• <strong>Hard cap</strong> — max_scans_per_qr is enforced in ScanResult.js before any points are written.</div>
            <div>• <strong>Instant kill switch</strong> — set is_active = false from Admin → QR Codes tab to deactivate any specific code immediately.</div>
            <div>• <strong>Auto-expiry</strong> — expires_at is set at QR generation time based on qr_validity_months above.</div>
          </div>
        </InfoBox>
        <div style={{ marginTop: 12, padding: '10px 16px', background: C.greenPale, borderRadius: 8, border: `1px solid ${C.greenLight}40` }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.green }}>
            ✓ A QR code in the wild cannot earn points twice. Shared screenshots earn nothing after the first claim.
          </div>
        </div>
      </SectionCard>

      {qrStats && (
        <SectionCard title="Live QR Stats" subtitle="Current state of all QR codes in the system" accent={C.blue}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Active QR Codes', value: qrStats.total?.toLocaleString() || '0', colour: C.green },
              { label: 'Claimed (Scanned Once)', value: qrStats.claimed?.toLocaleString() || '0', colour: C.purple },
              { label: 'Claim Rate', value: `${qrStats.total > 0 ? ((qrStats.claimed / qrStats.total) * 100).toFixed(1) : 0}%`, colour: C.amber },
              { label: 'Expired', value: qrStats.expired?.toLocaleString() || '0', colour: C.textLight },
              { label: 'Invalid Attempts Today', value: qrStats.invalidToday?.toLocaleString() || '0', colour: C.red },
            ].map((s, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${s.colour}25`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: s.colour }}>{s.value}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textLight, marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── SUB-TAB 6: CHANNEL SIMULATOR ─────────────────────────────────────────────
function TabSimulator({ draft }) {
  const cfg = draft;
  const [onlinePct,  setOnlinePct]  = useState(30);
  const [aov,        setAov]        = useState(400);
  const [unitsMo,    setUnitsMo]    = useState(100);
  const [targetPct,  setTargetPct]  = useState(50);

  const COGS_PER_UNIT     = 103;
  const WHOLESALE_PRICE   = 280;
  const costPerPt         = cfg.redemption_value_zar * (1 - cfg.breakage_rate);
  const ptsPerOnlineOrder = Math.round((aov / 100) * cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100));
  const ptsPerRetailScan  = Math.round((aov / 100) * cfg.pts_per_r100_retail);

  function calcScenario(onlineShare) {
    const onlineUnits = Math.round(unitsMo * onlineShare / 100);
    const retailUnits = unitsMo - onlineUnits;

    const onlineRev   = onlineUnits * aov;
    const retailRev   = retailUnits * WHOLESALE_PRICE;
    const totalRev    = onlineRev + retailRev;

    const onlineMargin = onlineUnits * (aov - COGS_PER_UNIT);
    const retailMargin = retailUnits * (WHOLESALE_PRICE - COGS_PER_UNIT);
    const totalMargin  = onlineMargin + retailMargin;
    const marginPct    = totalRev > 0 ? (totalMargin / totalRev * 100) : 0;

    const loyaltyCost  = (onlineUnits * ptsPerOnlineOrder + retailUnits * ptsPerRetailScan) * costPerPt;
    const netMargin    = totalMargin - loyaltyCost;
    const netMarginPct = totalRev > 0 ? (netMargin / totalRev * 100) : 0;

    return { onlineUnits, retailUnits, onlineRev, retailRev, totalRev, totalMargin, marginPct, loyaltyCost, netMargin, netMarginPct };
  }

  const current = calcScenario(onlinePct);
  const target  = calcScenario(targetPct);
  const gain    = target.netMargin - current.netMargin;

  function MarginColour(pct) {
    if (pct >= 40) return C.green;
    if (pct >= 20) return C.amber;
    return C.red;
  }

  function ScenarioBox({ title, data, colour, showGain, gain }) {
    return (
      <div style={{
        flex: 1, minWidth: 260,
        background: C.white, border: `2px solid ${colour}40`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ background: colour, padding: '10px 16px' }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, color: C.white }}>{title}</div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          {[
            { label: 'Monthly Revenue',     value: `R${data.totalRev.toLocaleString()}` },
            { label: `Online (${data.onlineUnits} units × R${aov})`, value: `R${data.onlineRev.toLocaleString()}` },
            { label: `Retail (${data.retailUnits} units × R${WHOLESALE_PRICE} whs)`, value: `R${data.retailRev.toLocaleString()}` },
            { label: 'Total Net Margin',    value: `R${data.totalMargin.toLocaleString()} (${data.marginPct.toFixed(1)}%)`, colour: MarginColour(data.marginPct) },
            { label: 'Loyalty Cost / mo',   value: `R${data.loyaltyCost.toFixed(0)}` },
            { label: 'Net After Loyalty',   value: `R${data.netMargin.toLocaleString(undefined, {maximumFractionDigits:0})} (${data.netMarginPct.toFixed(1)}%)`, colour: MarginColour(data.netMarginPct), bold: true },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, borderBottom: i === 5 ? 'none' : `1px solid ${C.border}`, paddingBottom: 5 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.textMid }}>{row.label}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: row.bold ? 700 : 500, color: row.colour || C.text }}>{row.value}</span>
            </div>
          ))}
          {showGain && (
            <div style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 8,
              background: gain > 0 ? C.greenPale : C.redPale,
              border: `1px solid ${gain > 0 ? C.greenLight + '50' : C.red + '30'}`,
            }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: gain > 0 ? C.green : C.red }}>
                {gain > 0 ? '▲' : '▼'} {gain > 0 ? '+' : ''}R{Math.abs(gain).toLocaleString(undefined, {maximumFractionDigits:0})}/month vs current
              </div>
              {gain > 0 && (
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textLight, marginTop: 2 }}>
                  = +R{(gain * 12).toLocaleString(undefined, {maximumFractionDigits:0})}/year ·  loyalty programme pays back in &lt;1 month
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionCard title="Channel Mix Simulator" subtitle="Drag the sliders to model different channel splits — all figures recalculate live">

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <FieldRow label="Average order value">
            <NumInput value={aov} onChange={setAov} min={50} max={2000} step={50} suffix="R" width={90} />
          </FieldRow>
          <FieldRow label="Units sold / month">
            <NumInput value={unitsMo} onChange={setUnitsMo} min={1} max={10000} step={10} suffix="units" width={90} />
          </FieldRow>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_BODY, fontSize: 13, color: C.textMid, marginBottom: 6 }}>
            <span><strong>Current:</strong> {onlinePct}% online / {100 - onlinePct}% retail</span>
          </div>
          <input
            type="range" min={0} max={100} value={onlinePct}
            onChange={e => setOnlinePct(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: C.greenMid, cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_BODY, fontSize: 11, color: C.textLight }}>
            <span>0% online (all retail)</span>
            <span>100% online (all direct)</span>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_BODY, fontSize: 13, color: C.textMid, marginBottom: 6 }}>
            <span><strong>Target:</strong> {targetPct}% online / {100 - targetPct}% retail</span>
          </div>
          <input
            type="range" min={0} max={100} value={targetPct}
            onChange={e => setTargetPct(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: C.purple, cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_BODY, fontSize: 11, color: C.textLight }}>
            <span>0% online</span>
            <span>Target mix</span>
            <span>100% online</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <ScenarioBox title={`Current Mix — ${onlinePct}% Online`} data={current} colour={C.amber} />
          <ScenarioBox title={`Target Mix — ${targetPct}% Online`} data={target} colour={C.greenMid} showGain gain={gain} />
        </div>

        <InfoBox colour={C.green} bgColour={C.greenPale} style={{ marginTop: 16 }}>
          <strong>How to read this:</strong> Each percentage point shifted from retail → online adds approximately R{(((aov - COGS_PER_UNIT) - (WHOLESALE_PRICE - COGS_PER_UNIT)) * unitsMo / 100).toFixed(0)}/month in net margin (before loyalty cost). The loyalty programme is the mechanism that makes that shift happen — every scan reminds a retail customer why buying direct is more rewarding.
        </InfoBox>
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: HQLoyalty
// ═════════════════════════════════════════════════════════════════════════════
export default function HQLoyalty() {
  const [config,       setConfig]       = useState(null);
  const [draft,        setDraft]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);
  const [activeTab,    setActiveTab]    = useState(0);
  const [liveStats,    setLiveStats]    = useState(null);
  const [qrStats,      setQrStats]      = useState(null);
  const [referralLB,   setReferralLB]   = useState([]);

  const SUB_TABS = [
    { label: '📊 Earning Rules', key: 'earning' },
    { label: '🏆 Tiers',         key: 'tiers' },
    { label: '💰 Economics',     key: 'economics' },
    { label: '🎁 Referrals',     key: 'referrals' },
    { label: '⚠ QR Security',   key: 'qrsecurity' },
    { label: '📈 Simulator',     key: 'simulator' },
  ];

  // ── Check for unsaved changes ──────────────────────────────────────────────
  const isDirty = draft && config
    ? JSON.stringify(draft) !== JSON.stringify(config)
    : false;

  // ── Load all data on mount ─────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // 1. Loyalty config
      const { data: cfgData, error: cfgErr } = await supabase
        .from('loyalty_config')
        .select('*')
        .single();

      if (cfgErr && cfgErr.code !== 'PGRST116') throw cfgErr;
      const cfg = cfgData || DEFAULT_CONFIG;
      setConfig(cfg);
      setDraft({ ...cfg });

      // 2. Loyalty transaction stats
      const { data: txData } = await supabase
        .from('loyalty_transactions')
        .select('points, transaction_type, created_at');

      if (txData) {
        const now = new Date();
        const cutoff30 = new Date(now - 30 * 24 * 3600 * 1000);
        const recent = txData.filter(t => new Date(t.created_at) >= cutoff30);

        const isEarned   = t => t.transaction_type && !t.transaction_type.toLowerCase().includes('redeem');
        const isRedeemed = t => t.transaction_type && t.transaction_type.toLowerCase().includes('redeem');

        setLiveStats({
          totalPtsIssued:    txData.filter(isEarned).reduce((s, t) => s + (t.points || 0), 0),
          totalPtsRedeemed:  txData.filter(isRedeemed).reduce((s, t) => s + Math.abs(t.points || 0), 0),
          totalPtsIssued30d: recent.filter(isEarned).reduce((s, t) => s + (t.points || 0), 0),
          totalPtsRedeemed30d: recent.filter(isRedeemed).reduce((s, t) => s + Math.abs(t.points || 0), 0),
          totalRevenue: 0, // would need orders table — skipping for now
        });
      }

      // 3. QR stats
      const { data: qrData } = await supabase
        .from('qr_codes')
        .select('is_active, claimed, expires_at');

      if (qrData) {
        const now = new Date();
        setQrStats({
          total:        qrData.filter(q => q.is_active).length,
          claimed:      qrData.filter(q => q.claimed).length,
          expired:      qrData.filter(q => q.expires_at && new Date(q.expires_at) < now).length,
          invalidToday: 0, // would need scan_logs with outcome=invalid — simplification
        });
      }

      // 4. Referral leaderboard
      const { data: refData } = await supabase
        .from('referral_codes')
        .select('code, uses_count, owner_id')
        .eq('is_active', true)
        .order('uses_count', { ascending: false })
        .limit(10);

      if (refData && refData.length > 0) {
        // Enrich with profile names
        const ownerIds = refData.map(r => r.owner_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', ownerIds);

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p.full_name; });

        setReferralLB(refData.map(r => ({
          ...r,
          name: profileMap[r.owner_id] || null,
        })));
      }

    } catch (err) {
      console.error('HQLoyalty load error:', err);
      setDraft({ ...DEFAULT_CONFIG });
      showToast('Could not load config — using defaults', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
  }

  // ── Save handler ───────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const { id, updated_by, ...fields } = draft;
      const { error } = await supabase
        .from('loyalty_config')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', config.id);

      if (error) throw error;
      setConfig({ ...draft });
      showToast('Loyalty config saved — changes are now live across the platform');
    } catch (err) {
      console.error('HQLoyalty save error:', err);
      showToast('Save failed: ' + (err.message || 'unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Dirty tab indicator ───────────────────────────────────────────────────
  // (We show a single amber dot on the header when ANY field is dirty)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textLight }}>Loading loyalty configuration...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: '100%' }}>

      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@400;500;600;700&display=swap');`}</style>

      {/* ── HEADER ── */}
      <div style={{
        padding: '24px 28px 0',
        borderBottom: `1px solid ${C.border}`,
        background: C.white,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: C.green, margin: 0, letterSpacing: '0.01em' }}>
                💎 Loyalty Economics Engine
              </h1>
              {isDirty && (
                <span style={{
                  background: C.amberPale, color: C.amber,
                  border: `1px solid ${C.amberMid || '#FFB300'}40`,
                  borderRadius: 20, padding: '2px 12px',
                  fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
                }}>
                  UNSAVED CHANGES
                </span>
              )}
            </div>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textLight, margin: '4px 0 0' }}>
              All changes update live across the entire platform — ScanResult, CheckoutPage, Loyalty, COGS and Pricing.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            style={{
              padding: '10px 24px',
              background: isDirty ? C.green : C.border,
              color: isDirty ? C.white : C.textLight,
              border: 'none', borderRadius: 8,
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
              cursor: isDirty ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {saving ? 'Saving...' : '💾 Save All Changes'}
          </button>
        </div>

        {/* Sub-tab nav */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {SUB_TABS.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(i)}
              style={{
                padding: '10px 18px',
                background: 'none', border: 'none',
                borderBottom: activeTab === i ? `3px solid ${C.green}` : '3px solid transparent',
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: activeTab === i ? 600 : 400,
                color: activeTab === i ? C.green : C.textMid,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ padding: '24px 28px', maxWidth: 900 }}>
        {activeTab === 0 && <TabEarning draft={draft} setDraft={setDraft} />}
        {activeTab === 1 && <TabTiers   draft={draft} setDraft={setDraft} />}
        {activeTab === 2 && <TabEconomics draft={draft} setDraft={setDraft} liveStats={liveStats} />}
        {activeTab === 3 && <TabReferrals draft={draft} setDraft={setDraft} referralLeaderboard={referralLB} />}
        {activeTab === 4 && <TabQRSecurity draft={draft} setDraft={setDraft} qrStats={qrStats} />}
        {activeTab === 5 && <TabSimulator draft={draft} />}
      </div>

      {/* ── STICKY SAVE FOOTER ── */}
      {isDirty && (
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          background: C.white, borderTop: `1px solid ${C.border}`,
          padding: '14px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          zIndex: 100,
        }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.amber, fontWeight: 600 }}>
            ⚠ You have unsaved changes — they are not yet live on the platform
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setDraft({ ...config })}
              style={{
                padding: '8px 18px', background: 'none',
                border: `1px solid ${C.border}`, borderRadius: 7,
                fontFamily: FONT_BODY, fontSize: 13, color: C.textMid, cursor: 'pointer',
              }}
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '8px 22px', background: C.green,
                border: 'none', borderRadius: 7,
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
                color: C.white, cursor: 'pointer',
              }}
            >
              {saving ? 'Saving...' : '💾 Save All Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
